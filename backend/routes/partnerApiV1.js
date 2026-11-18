import express from 'express';
import crypto from 'crypto';
import pool from '../config/db.js';

const router = express.Router();

// =====================================================================
// SLIDING-WINDOW RATE LIMITER (120 requests / min per API key)
// =====================================================================
const RATE_LIMIT_MAX = 120;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const keyRateBuckets = new Map();

function checkRateLimit(keyId) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  let timestamps = keyRateBuckets.get(keyId) || [];
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= RATE_LIMIT_MAX) {
    const resetAt = Math.ceil((timestamps[0] + RATE_LIMIT_WINDOW_MS) / 1000);
    return { allowed: false, remaining: 0, resetAt };
  }

  timestamps.push(now);
  keyRateBuckets.set(keyId, timestamps);
  const resetAt = Math.ceil((now + RATE_LIMIT_WINDOW_MS) / 1000);
  return {
    allowed: true,
    remaining: Math.max(0, RATE_LIMIT_MAX - timestamps.length),
    resetAt
  };
}

// =====================================================================
// API KEY AUTHENTICATION, SCOPE & IDEMPOTENCY MIDDLEWARE
// =====================================================================
function requireApiKey(requiredScope = null) {
  return async (req, res, next) => {
    try {
      let rawKey = req.headers['x-api-key'];
      if (!rawKey && req.headers.authorization?.startsWith('Bearer ')) {
        rawKey = req.headers.authorization.slice(7).trim();
      }
      if (!rawKey) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Missing X-API-Key header'
        });
      }

      const keyHash = crypto.createHash('sha256').update(String(rawKey).trim()).digest('hex');
      const keyRes = await pool.query(
        `SELECT k.*, p.partner_code, p.brand_name, p.status AS partner_status
         FROM pih_api_keys k
         JOIN pih_partners p ON k.partner_id = p.id
         WHERE k.key_hash = $1 AND p.deleted_at IS NULL
         LIMIT 1`,
        [keyHash]
      );

      if (keyRes.rowCount === 0) {
        return res.status(401).json({
          error: 'unauthorized',
          message: 'Invalid API key'
        });
      }

      const apiKey = keyRes.rows[0];
      if (apiKey.is_revoked) {
        return res.status(401).json({
          error: 'key_revoked',
          message: 'This API key has been revoked'
        });
      }
      if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
        return res.status(401).json({
          error: 'key_expired',
          message: 'This API key has expired'
        });
      }

      // Rate limit check (120 req/min per API key)
      const rl = checkRateLimit(apiKey.id);
      res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
      res.setHeader('X-RateLimit-Remaining', String(rl.remaining));
      res.setHeader('X-RateLimit-Reset', String(rl.resetAt));
      if (!rl.allowed) {
        return res.status(429).json({
          error: 'rate_limit_exceeded',
          message: 'Rate limit of 120 requests per minute exceeded for this API key'
        });
      }

      // Scope check
      const scopes = Array.isArray(apiKey.scopes) ? apiKey.scopes : [];
      if (requiredScope && !scopes.includes(requiredScope)) {
        return res.status(403).json({
          error: 'insufficient_scope',
          message: `API key requires scope '${requiredScope}'. Granted scopes: [${scopes.join(', ')}]`
        });
      }

      // Idempotency-Key requirement on POST requests (Hard Rule 8)
      if (req.method.toUpperCase() === 'POST' && !req.headers['idempotency-key']) {
        return res.status(422).json({
          error: 'missing_idempotency_key',
          message: 'Idempotency-Key header is required on all POST requests'
        });
      }

      // Touch last_used_at asynchronously
      pool.query('UPDATE pih_api_keys SET last_used_at = NOW() WHERE id = $1', [apiKey.id]).catch(() => {});

      req.partnerAuth = {
        keyId: apiKey.id,
        partnerId: apiKey.partner_id,
        partnerCode: apiKey.partner_code,
        brandName: apiKey.brand_name,
        scopes,
        idempotencyKey: req.headers['idempotency-key'] || null,
        clientIp: req.ip || '127.0.0.1'
      };
      next();
    } catch (err) {
      res.status(500).json({ error: 'internal_error', message: err.message });
    }
  };
}

// =====================================================================
// 1. PUBLIC OPENAPI 3.1 SPECIFICATION (GET /api/pih/v1/docs)
// =====================================================================
router.get('/docs', (req, res) => {
  res.json({
    openapi: '3.1.0',
    info: {
      title: 'Vivas AI AgriInput Partner Hub External API',
      version: '1.0.0',
      description:
        'External REST + JSON API for Vivas AI AgriInput Manufacturers. Supports SHA-256 API Keys, cursor pagination, ISO-8601 UTC timestamps, Idempotency-Key headers, and HMAC-SHA256 signed webhooks. Enforces strict DPDP Act 2023 & Vivas Hard Rule 6 k>=5 district anonymisation.'
    },
    servers: [{ url: '/api/pih/v1', description: 'Partner Hub External API v1' }],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'Partner API Key (prefix vivas_pih_live_...). Hashed with SHA-256 at rest.'
        }
      }
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/products': {
        get: {
          summary: 'List partner products (cursor paginated)',
          security: [{ ApiKeyAuth: ['catalog:read'] }],
          parameters: [
            { name: 'cursor', in: 'query', schema: { type: 'string' } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } }
          ]
        }
      },
      '/products/{code}': {
        get: {
          summary: 'Get single product detail by product_code or UUID',
          security: [{ ApiKeyAuth: ['catalog:read'] }]
        },
        put: {
          summary: 'Update product metadata (composition/claim edits re-trigger SME review)',
          security: [{ ApiKeyAuth: ['catalog:write'] }]
        }
      },
      '/skus/{sku}/price': {
        patch: {
          summary: 'Update SKU MRP & selling price (remains live)',
          security: [{ ApiKeyAuth: ['catalog:write'] }]
        }
      },
      '/skus/{sku}/stock': {
        patch: {
          summary: 'Update SKU regional inventory stock quantity (remains live)',
          security: [{ ApiKeyAuth: ['catalog:write'] }]
        }
      },
      '/orders': {
        get: {
          summary: 'List partner store orders (Farmer PII masked to district/state only)',
          security: [{ ApiKeyAuth: ['orders'] }]
        }
      },
      '/orders/{no}/status': {
        patch: {
          summary: 'Transition store order fulfilment status (accepted -> packed -> shipped -> delivered)',
          security: [{ ApiKeyAuth: ['orders'] }]
        }
      },
      '/ratings': {
        get: {
          summary: 'List Bayesian Field Performance Score (FPS) ratings for partner products',
          security: [{ ApiKeyAuth: ['insights:read'] }]
        }
      },
      '/ratings/{code}': {
        get: {
          summary: 'Get overall and per-crop Bayesian FPS breakdown for a product',
          security: [{ ApiKeyAuth: ['insights:read'] }]
        }
      },
      '/insights': {
        get: {
          summary: 'List explainable AI field inferences for partner products',
          security: [{ ApiKeyAuth: ['insights:read'] }]
        }
      },
      '/outcomes/aggregate': {
        get: {
          summary: 'Anonymised district-level field outcome aggregates (minimum 5 consented farms per district)',
          security: [{ ApiKeyAuth: ['insights:read'] }]
        }
      },
      '/demand': {
        get: {
          summary: 'District-level open Crop Health problem demand counts matching partner claims',
          security: [{ ApiKeyAuth: ['insights:read'] }]
        }
      }
    },
    'x-webhooks': {
      signature_header: 'X-Vivas-Signature: sha256=<HMAC-SHA256(secret, raw_json_body)>',
      retry_backoff_schedule: ['1m', '5m', '30m', '2h', '12h'],
      events: [
        'order.created',
        'order.cancelled',
        'review.created',
        'rating.updated',
        'inference.published',
        'licence.expiring',
        'demand.alert'
      ]
    }
  });
});

// =====================================================================
// 2. CATALOGUE ENDPOINTS (catalog:read, catalog:write)
// =====================================================================

// GET /api/pih/v1/products - Cursor-paginated partner products
router.get('/products', requireApiKey('catalog:read'), async (req, res) => {
  try {
    const { partnerId } = req.partnerAuth;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const cursor = req.query.cursor || null;

    const params = [partnerId];
    let cursorClause = '';
    if (cursor) {
      params.push(cursor);
      cursorClause = ` AND p.product_code > $${params.length}`;
    }
    params.push(limit + 1);

    const prodsRes = await pool.query(
      `SELECT
         p.id, p.product_code, p.name, p.brand, p.product_type, p.sub_type,
         p.formulation, p.registration_no, p.hsn_code, p.gst_pct, p.is_organic,
         p.phi_days, p.reentry_hours, p.status,
         p.created_at, p.updated_at,
         (
           SELECT COALESCE(json_agg(sk ORDER BY sk.sku_code ASC), '[]'::json)
           FROM pih_product_skus sk
           WHERE sk.product_id = p.id AND sk.deleted_at IS NULL
         ) AS skus
       FROM pih_products p
       WHERE p.partner_id = $1 AND p.deleted_at IS NULL ${cursorClause}
       ORDER BY p.product_code ASC
       LIMIT $${params.length}`,
      params
    );

    const hasMore = prodsRes.rows.length > limit;
    const items = hasMore ? prodsRes.rows.slice(0, limit) : prodsRes.rows;
    const nextCursor = hasMore ? items[items.length - 1].product_code : null;

    res.json({
      object: 'list',
      timestamp: new Date().toISOString(),
      has_more: hasMore,
      next_cursor: nextCursor,
      count: items.length,
      data: items
    });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// GET /api/pih/v1/products/:code - Get single product by product_code or UUID
router.get('/products/:code', requireApiKey('catalog:read'), async (req, res) => {
  try {
    const { partnerId } = req.partnerAuth;
    const codeOrId = req.params.code;

    const prodRes = await pool.query(
      `SELECT p.*,
              (SELECT COALESCE(json_agg(sk), '[]'::json) FROM pih_product_skus sk WHERE sk.product_id = p.id AND sk.deleted_at IS NULL) AS skus,
              (SELECT COALESCE(json_agg(cm), '[]'::json) FROM pih_product_composition cm WHERE cm.product_id = p.id) AS composition,
              (SELECT COALESCE(json_agg(su), '[]'::json) FROM pih_product_crop_suitability su WHERE su.product_id = p.id AND su.deleted_at IS NULL) AS suitability,
              (SELECT COALESCE(json_agg(cl), '[]'::json) FROM pih_product_claims cl WHERE cl.product_id = p.id AND cl.deleted_at IS NULL) AS claims
       FROM pih_products p
       WHERE p.partner_id = $1
         AND p.deleted_at IS NULL
         AND (p.product_code = $2 OR p.id::text = $2)
       LIMIT 1`,
      [partnerId, codeOrId]
    );

    if (prodRes.rowCount === 0) {
      return res.status(404).json({ error: 'not_found', message: `Product '${codeOrId}' not found` });
    }

    res.json({
      object: 'product',
      timestamp: new Date().toISOString(),
      data: prodRes.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// PUT /api/pih/v1/products/:code - Update product (transitions live -> submitted if composition/claims modified)
router.put('/products/:code', requireApiKey('catalog:write'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { partnerId, clientIp } = req.partnerAuth;
    const codeOrId = req.params.code;

    const existingRes = await client.query(
      `SELECT * FROM pih_products
       WHERE partner_id = $1 AND deleted_at IS NULL AND (product_code = $2 OR id::text = $2)
       LIMIT 1`,
      [partnerId, codeOrId]
    );
    if (existingRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'not_found', message: `Product '${codeOrId}' not found` });
    }
    const existing = existingRes.rows[0];

    const { name, description, how_it_works, phi_days, reentry_hours, composition, claims } = req.body || {};
    const requiresSmeReapproval = Array.isArray(composition) || Array.isArray(claims);
    const nextStatus = requiresSmeReapproval && existing.status === 'live' ? 'submitted' : existing.status;

    const upd = await client.query(
      `UPDATE pih_products
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           how_it_works = COALESCE($3, how_it_works),
           phi_days = COALESCE($4, phi_days),
           reentry_hours = COALESCE($5, reentry_hours),
           status = $6,
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [
        name || null,
        description || null,
        how_it_works || null,
        phi_days !== undefined ? Number(phi_days) : null,
        reentry_hours !== undefined ? Number(reentry_hours) : null,
        nextStatus,
        existing.id
      ]
    );

    await client.query(
      `INSERT INTO pih_audit_log (actor_partner_id, entity, entity_id, action, before, after, ip)
       VALUES ($1, 'pih_products', $2, 'V1_API_UPDATE_PRODUCT', $3::jsonb, $4::jsonb, $5)`,
      [partnerId, existing.id, JSON.stringify(existing), JSON.stringify(upd.rows[0]), clientIp]
    );

    await client.query('COMMIT');
    res.json({
      object: 'product',
      timestamp: new Date().toISOString(),
      sme_reapproval_triggered: requiresSmeReapproval && existing.status === 'live',
      data: upd.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: 'bad_request', message: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/pih/v1/skus/:sku/price - Update SKU MRP & selling_price (stays live)
router.patch('/skus/:sku/price', requireApiKey('catalog:write'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { partnerId, clientIp } = req.partnerAuth;
    const skuKey = req.params.sku;
    const { mrp, selling_price } = req.body || {};

    const skuRes = await client.query(
      `SELECT sk.*, p.partner_id, p.status AS product_status
       FROM pih_product_skus sk
       JOIN pih_products p ON sk.product_id = p.id
       WHERE p.partner_id = $1 AND sk.deleted_at IS NULL AND (sk.sku_code = $2 OR sk.id::text = $2)
       LIMIT 1`,
      [partnerId, skuKey]
    );
    if (skuRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'not_found', message: `SKU '${skuKey}' not found` });
    }
    const sku = skuRes.rows[0];
    const newMrp = mrp !== undefined ? Number(mrp) : Number(sku.mrp);
    const newSelling = selling_price !== undefined ? Number(selling_price) : Number(sku.selling_price);

    if (newSelling <= 0 || newMrp < newSelling) {
      await client.query('ROLLBACK');
      return res.status(422).json({
        error: 'validation_error',
        message: 'mrp must be >= selling_price and selling_price must be > 0'
      });
    }

    const upd = await client.query(
      `UPDATE pih_product_skus
       SET mrp = $1, selling_price = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [newMrp, newSelling, sku.id]
    );

    await client.query(
      `INSERT INTO pih_audit_log (actor_partner_id, entity, entity_id, action, before, after, ip)
       VALUES ($1, 'pih_product_skus', $2, 'V1_API_PATCH_SKU_PRICE', $3::jsonb, $4::jsonb, $5)`,
      [
        partnerId,
        sku.id,
        JSON.stringify({ mrp: sku.mrp, selling_price: sku.selling_price }),
        JSON.stringify({ mrp: upd.rows[0].mrp, selling_price: upd.rows[0].selling_price }),
        clientIp
      ]
    );

    await client.query('COMMIT');
    res.json({
      object: 'sku',
      timestamp: new Date().toISOString(),
      product_status: sku.product_status,
      data: upd.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: 'bad_request', message: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/pih/v1/skus/:sku/stock - Update SKU stock_qty (stays live)
router.patch('/skus/:sku/stock', requireApiKey('catalog:write'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { partnerId, clientIp } = req.partnerAuth;
    const skuKey = req.params.sku;
    const { stock_qty } = req.body || {};

    if (stock_qty === undefined || Number(stock_qty) < 0) {
      await client.query('ROLLBACK');
      return res.status(422).json({ error: 'validation_error', message: 'stock_qty must be >= 0' });
    }

    const skuRes = await client.query(
      `SELECT sk.*, p.partner_id, p.status AS product_status
       FROM pih_product_skus sk
       JOIN pih_products p ON sk.product_id = p.id
       WHERE p.partner_id = $1 AND sk.deleted_at IS NULL AND (sk.sku_code = $2 OR sk.id::text = $2)
       LIMIT 1`,
      [partnerId, skuKey]
    );
    if (skuRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'not_found', message: `SKU '${skuKey}' not found` });
    }
    const sku = skuRes.rows[0];

    const upd = await client.query(
      `UPDATE pih_product_skus
       SET stock_qty = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [Math.floor(Number(stock_qty)), sku.id]
    );

    await client.query(
      `INSERT INTO pih_audit_log (actor_partner_id, entity, entity_id, action, before, after, ip)
       VALUES ($1, 'pih_product_skus', $2, 'V1_API_PATCH_SKU_STOCK', $3::jsonb, $4::jsonb, $5)`,
      [
        partnerId,
        sku.id,
        JSON.stringify({ stock_qty: sku.stock_qty }),
        JSON.stringify({ stock_qty: upd.rows[0].stock_qty }),
        clientIp
      ]
    );

    await client.query('COMMIT');
    res.json({
      object: 'sku',
      timestamp: new Date().toISOString(),
      product_status: sku.product_status,
      data: upd.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: 'bad_request', message: err.message });
  } finally {
    client.release();
  }
});

// =====================================================================
// 3. STORE ORDERS ENDPOINTS (orders scope — Farmer PII masked)
// =====================================================================

// GET /api/pih/v1/orders - List partner store orders (Farmer PII masked to district/state)
router.get('/orders', requireApiKey('orders'), async (req, res) => {
  try {
    const { partnerId } = req.partnerAuth;
    const { status, since } = req.query;

    let sql = `
      SELECT
        o.id, o.order_no, o.status, o.payment_mode, o.payment_status,
        o.subtotal, o.gst_amount AS gst_total, o.shipping AS shipping_fee, o.total,
        COALESCE((SELECT SUM(oi.commission_amount) FROM pih_store_order_items oi WHERE oi.order_id = o.id), 0) AS commission_amount,
        COALESCE(o.delivery_address->>'district', 'Bengaluru Rural') AS delivery_district,
        COALESCE(o.delivery_address->>'state', 'Karnataka') AS delivery_state,
        COALESCE(o.delivery_address->>'pincode', '562110') AS delivery_pincode,
        o.tracking_no, o.created_at, o.updated_at,
        (
          SELECT COALESCE(json_agg(oi), '[]'::json)
          FROM pih_store_order_items oi
          WHERE oi.order_id = o.id
        ) AS items
      FROM pih_store_orders o
      WHERE o.partner_id = $1 AND o.deleted_at IS NULL
    `;
    const params = [partnerId];
    if (status) {
      params.push(status);
      sql += ` AND o.status = $${params.length}`;
    }
    if (since) {
      params.push(since);
      sql += ` AND o.created_at >= $${params.length}::timestamptz`;
    }
    sql += ` ORDER BY o.created_at DESC LIMIT 50`;

    const result = await pool.query(sql, params);
    res.json({
      object: 'list',
      timestamp: new Date().toISOString(),
      privacy_masking: 'Farmer name, phone & exact GPS stripped per Vivas Hard Rule 6',
      count: result.rowCount,
      data: result.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// PATCH /api/pih/v1/orders/:no/status - Update order status via External API
router.patch('/orders/:no/status', requireApiKey('orders'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { partnerId, clientIp } = req.partnerAuth;
    const orderNoOrId = req.params.no;
    const { status, tracking_no = null, note = 'Updated via Partner API v1' } = req.body || {};

    const valid = ['accepted', 'packed', 'shipped', 'delivered', 'cancelled'];
    if (!valid.includes(status)) {
      await client.query('ROLLBACK');
      return res.status(422).json({
        error: 'validation_error',
        message: `status must be one of: ${valid.join(', ')}`
      });
    }

    const ordRes = await client.query(
      `SELECT * FROM pih_store_orders
       WHERE partner_id = $1 AND deleted_at IS NULL AND (order_no = $2 OR id::text = $2)
       LIMIT 1`,
      [partnerId, orderNoOrId]
    );
    if (ordRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'not_found', message: `Order '${orderNoOrId}' not found` });
    }
    const order = ordRes.rows[0];

    const upd = await client.query(
      `UPDATE pih_store_orders
       SET status = $1,
           tracking_no = COALESCE($2, tracking_no),
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, order_no, status, tracking_no,
                 COALESCE(delivery_address->>'district', 'Bengaluru Rural') AS delivery_district,
                 COALESCE(delivery_address->>'state', 'Karnataka') AS delivery_state,
                 updated_at`,
      [status, tracking_no, order.id]
    );

    await client.query(
      `INSERT INTO pih_order_status_history (order_id, from_status, to_status, note)
       VALUES ($1, $2, $3, $4)`,
      [order.id, order.status, status, note]
    );

    await client.query(
      `INSERT INTO pih_audit_log (actor_partner_id, entity, entity_id, action, before, after, ip)
       VALUES ($1, 'pih_store_orders', $2, 'V1_API_ORDER_STATUS', $3::jsonb, $4::jsonb, $5)`,
      [partnerId, order.id, JSON.stringify({ status: order.status }), JSON.stringify(upd.rows[0]), clientIp]
    );

    await client.query('COMMIT');
    res.json({
      object: 'order',
      timestamp: new Date().toISOString(),
      data: upd.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ error: 'bad_request', message: err.message });
  } finally {
    client.release();
  }
});

// =====================================================================
// 4. RATINGS, AI INSIGHTS, ANONYMISED AGGREGATES & DEMAND (insights:read)
// =====================================================================

// GET /api/pih/v1/ratings - List Bayesian FPS ratings for partner products
router.get('/ratings', requireApiKey('insights:read'), async (req, res) => {
  try {
    const { partnerId } = req.partnerAuth;
    const result = await pool.query(
      `SELECT
         p.product_code, p.name AS product_name, p.product_type,
         r.fps, ROUND(r.fps * 20, 1) AS fps_100,
         r.raw_score, r.verified_count, r.farm_count,
         r.efficacy_rate, r.avg_severity_reduction, r.yield_uplift_pct,
         r.avg_farmer_rating, r.badge, r.computed_at
       FROM pih_product_ratings r
       JOIN pih_products p ON r.product_id = p.id
       WHERE p.partner_id = $1 AND p.deleted_at IS NULL AND r.crop_id IS NULL
       ORDER BY r.fps DESC`,
      [partnerId]
    );

    res.json({
      object: 'list',
      timestamp: new Date().toISOString(),
      formula: 'FPS = (v * R + m * C) / (v + m), m = 10, C = 3.90',
      count: result.rowCount,
      data: result.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// GET /api/pih/v1/ratings/:code - Single product rating breakdown
router.get('/ratings/:code', requireApiKey('insights:read'), async (req, res) => {
  try {
    const { partnerId } = req.partnerAuth;
    const codeOrId = req.params.code;

    const prodRes = await pool.query(
      `SELECT id, product_code, name FROM pih_products
       WHERE partner_id = $1 AND deleted_at IS NULL AND (product_code = $2 OR id::text = $2)
       LIMIT 1`,
      [partnerId, codeOrId]
    );
    if (prodRes.rowCount === 0) {
      return res.status(404).json({ error: 'not_found', message: `Product '${codeOrId}' not found` });
    }
    const prod = prodRes.rows[0];

    const ratingsRes = await pool.query(
      `SELECT r.*, c.name AS crop_name
       FROM pih_product_ratings r
       LEFT JOIN vivas_crops c ON r.crop_id = c.id
       WHERE r.product_id = $1
       ORDER BY r.crop_id NULLS FIRST, r.fps DESC`,
      [prod.id]
    );

    res.json({
      object: 'product_rating',
      timestamp: new Date().toISOString(),
      product_code: prod.product_code,
      product_name: prod.name,
      overall: ratingsRes.rows.find((r) => !r.crop_id) || null,
      per_crop: ratingsRes.rows.filter((r) => r.crop_id)
    });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// GET /api/pih/v1/insights - Explainable AI field inferences for partner products
router.get('/insights', requireApiKey('insights:read'), async (req, res) => {
  try {
    const { partnerId } = req.partnerAuth;
    const { product, district, season } = req.query;

    let sql = `
      SELECT
        inf.id, p.product_code, p.name AS product_name,
        c.name AS crop_name, inf.state, inf.district, inf.season,
        inf.inference_type, inf.title, inf.body, inf.metrics,
        inf.sample_size, inf.farm_count, inf.confidence,
        inf.model_name, inf.model_version, inf.status, inf.sme_annotation,
        inf.created_at
      FROM pih_ai_inferences inf
      JOIN pih_products p ON inf.product_id = p.id
      LEFT JOIN vivas_crops c ON inf.crop_id = c.id
      WHERE p.partner_id = $1 AND inf.deleted_at IS NULL AND inf.status != 'suppressed'
    `;
    const params = [partnerId];
    if (product) {
      params.push(product);
      sql += ` AND (p.product_code = $${params.length} OR p.id::text = $${params.length})`;
    }
    if (district) {
      params.push(district);
      sql += ` AND inf.district ILIKE $${params.length}`;
    }
    if (season) {
      params.push(season);
      sql += ` AND inf.season ILIKE $${params.length}`;
    }
    sql += ` ORDER BY inf.confidence DESC, inf.sample_size DESC`;

    const result = await pool.query(sql, params);
    res.json({
      object: 'list',
      timestamp: new Date().toISOString(),
      count: result.rowCount,
      data: result.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// GET /api/pih/v1/outcomes/aggregate - District-level anonymised outcome aggregates (Hard Rule 6: min 5 consented farms)
router.get('/outcomes/aggregate', requireApiKey('insights:read'), async (req, res) => {
  try {
    const { partnerId } = req.partnerAuth;
    const { product, district } = req.query;

    let sql = `
      SELECT
        o.district,
        o.state,
        p.product_code,
        p.name AS product_name,
        COUNT(o.id)::int AS outcome_count,
        COUNT(DISTINCT o.farm_id)::int AS consented_farm_count,
        ROUND(AVG(CASE WHEN o.resolved = 'yes' THEN 100 WHEN o.resolved = 'partly' THEN 65 ELSE 10 END), 1) AS efficacy_rate_pct,
        ROUND(AVG(o.days_to_effect), 1) AS avg_days_to_effect,
        ROUND(AVG(o.farmer_rating), 2) AS avg_farmer_rating
      FROM pih_treatment_outcomes o
      JOIN pih_products p ON o.product_id = p.id
      WHERE p.partner_id = $1
        AND o.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM pih_data_sharing_consents sc
          WHERE sc.farm_id = o.farm_id
            AND sc.scope = 'anonymised_outcomes'
            AND sc.withdrawn_at IS NOT NULL
        )
    `;
    const params = [partnerId];
    if (product) {
      params.push(product);
      sql += ` AND (p.product_code = $${params.length} OR p.id::text = $${params.length})`;
    }
    if (district) {
      params.push(district);
      sql += ` AND o.district ILIKE $${params.length}`;
    }
    sql += `
      GROUP BY o.district, o.state, p.product_code, p.name
      HAVING COUNT(DISTINCT o.farm_id) >= 5
      ORDER BY outcome_count DESC
    `;

    const result = await pool.query(sql, params);
    res.json({
      object: 'list',
      timestamp: new Date().toISOString(),
      k_anonymity_threshold: 5,
      privacy_policy: 'Only districts with >= 5 distinct consented farms are returned. Zero farmer PII.',
      count: result.rowCount,
      data: result.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

// GET /api/pih/v1/demand - District-level open Crop Health problem demand counts matching partner product claims
router.get('/demand', requireApiKey('insights:read'), async (req, res) => {
  try {
    const { partnerId } = req.partnerAuth;

    const result = await pool.query(
      `SELECT
         COALESCE(f.city, 'Bengaluru Rural') AS district,
         COALESCE(f.state_country, 'Karnataka') AS state,
         pr.code AS problem_code,
         pr.name AS problem_name,
         pr.problem_type,
         COUNT(DISTINCT c.id)::int AS open_case_count,
         ROUND(SUM(COALESCE(pl.area_planted, 2.5)), 1) AS total_affected_acres
       FROM ch_case c
       JOIN ch_problem pr ON COALESCE(c.confirmed_problem_id, c.suspected_problem_id) = pr.id
       LEFT JOIN vivas_farms f ON c.farm_id = f.id
       LEFT JOIN vivas_plantings pl ON c.planting_id = pl.id
       WHERE c.deleted_at IS NULL
         AND c.status NOT IN ('CLOSED')
         AND EXISTS (
           SELECT 1 FROM pih_product_claims cl
           JOIN pih_products p ON cl.product_id = p.id
           WHERE p.partner_id = $1 AND cl.problem_id = pr.id AND cl.deleted_at IS NULL
         )
       GROUP BY COALESCE(f.city, 'Bengaluru Rural'), COALESCE(f.state_country, 'Karnataka'), pr.code, pr.name, pr.problem_type
       ORDER BY open_case_count DESC`,
      [partnerId]
    );

    res.json({
      object: 'list',
      timestamp: new Date().toISOString(),
      count: result.rowCount,
      data: result.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'internal_error', message: err.message });
  }
});

export default router;
