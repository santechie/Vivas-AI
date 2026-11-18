import express from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import pool from '../config/db.js';

const router = express.Router();

// Helper: Resolve farm ID from query, header, or default
async function resolveFarmId(req) {
  if (req.query.farm_id) return req.query.farm_id;
  if (req.query.farmId) return req.query.farmId;
  if (req.headers['x-farm-id']) return req.headers['x-farm-id'];
  if (req.body && req.body.farm_id) return req.body.farm_id;
  if (req.body && req.body.farmId) return req.body.farmId;

  // Fallback to first active farm or Gopikrishna's Farm
  const res = await pool.query(
    `SELECT id FROM vivas_farms WHERE farm_name ILIKE '%Gopikrishna%' LIMIT 1`
  );
  if (res.rows.length > 0) return res.rows[0].id;

  const anyFarm = await pool.query(`SELECT id FROM vivas_farms ORDER BY created_at ASC LIMIT 1`);
  return anyFarm.rows.length > 0 ? anyFarm.rows[0].id : null;
}

// ============================================================
// 0. SETTINGS OVERVIEW (Counters & Health)
// ============================================================
router.get('/overview', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    if (!farmId) return res.status(404).json({ success: false, error: 'Farm not found' });

    const [
      farmProfile,
      taskTypes,
      users,
      product,
      store,
      deliveryCount,
      pickupCount,
      labelCount,
      processors,
      timeAtt,
      customFields,
      tokens
    ] = await Promise.all([
      pool.query(`SELECT * FROM vivas_settings_farm_profile WHERE farm_id = $1`, [farmId]),
      pool.query(`SELECT COUNT(*) as count FROM vivas_settings_task_types WHERE farm_id = $1 AND is_active = TRUE`, [farmId]),
      pool.query(`SELECT COUNT(*) as count FROM vivas_users WHERE is_active = TRUE`),
      pool.query(`SELECT * FROM vivas_settings_product WHERE farm_id = $1`, [farmId]),
      pool.query(`SELECT * FROM vivas_settings_online_store WHERE farm_id = $1`, [farmId]),
      pool.query(`SELECT COUNT(*) as count FROM vivas_settings_delivery_types WHERE farm_id = $1 AND is_active = TRUE`, [farmId]),
      pool.query(`SELECT COUNT(*) as count FROM vivas_settings_pickup_locations WHERE farm_id = $1 AND is_active = TRUE`, [farmId]),
      pool.query(`SELECT COUNT(*) as count FROM vivas_settings_labels WHERE farm_id = $1`, [farmId]),
      pool.query(`SELECT COUNT(*) as count FROM vivas_settings_payment_processors WHERE farm_id = $1 AND is_enabled = TRUE`, [farmId]),
      pool.query(`SELECT * FROM vivas_settings_time_attendance WHERE farm_id = $1`, [farmId]),
      pool.query(`SELECT COUNT(*) as count FROM vivas_settings_custom_fields WHERE farm_id = $1 AND is_active = TRUE`, [farmId]),
      pool.query(`SELECT COUNT(*) as count FROM vivas_settings_api_tokens WHERE farm_id = $1 AND is_revoked = FALSE`, [farmId])
    ]);

    res.json({
      success: true,
      data: {
        farmId,
        farmProfile: farmProfile.rows[0] || null,
        counts: {
          taskTypes: parseInt(taskTypes.rows[0]?.count || 0),
          users: parseInt(users.rows[0]?.count || 0),
          deliveryMethods: parseInt(deliveryCount.rows[0]?.count || 0),
          pickupLocations: parseInt(pickupCount.rows[0]?.count || 0),
          labelTemplates: parseInt(labelCount.rows[0]?.count || 0),
          activeProcessors: parseInt(processors.rows[0]?.count || 0),
          customFields: parseInt(customFields.rows[0]?.count || 0),
          activeTokens: parseInt(tokens.rows[0]?.count || 0)
        },
        productSettings: product.rows[0] || null,
        storeSettings: store.rows[0] || null,
        timeAttendance: timeAtt.rows[0] || null
      }
    });
  } catch (err) {
    console.error('Error fetching settings overview:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 1. MODULE 1: FARM PROFILE & GENERAL SETTINGS
// ============================================================
router.get('/farm-profile', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const result = await pool.query(
      `SELECT * FROM vivas_settings_farm_profile WHERE farm_id = $1`,
      [farmId]
    );

    if (result.rows.length === 0) {
      // Auto-insert defaults if missing
      const farmInfo = await pool.query(`SELECT * FROM vivas_farms WHERE id = $1`, [farmId]);
      const fn = farmInfo.rows[0]?.farm_name || 'My Farm';
      const insert = await pool.query(
        `INSERT INTO vivas_settings_farm_profile (farm_id, farm_name) VALUES ($1, $2) RETURNING *`,
        [farmId, fn]
      );
      return res.json({ success: true, data: insert.rows[0] });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error getting farm profile:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/farm-profile', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const {
      farm_name, year_founded, location_mode, address, city, state, country,
      postal_code, gps_lat, gps_lng, farm_size, farm_size_unit, operation_type,
      logo_url, invoice_header_mode, operating_hours, growing_format,
      default_bed_width_ft, default_pathway_width_ft, default_yield_area_unit,
      default_yield_mass_unit, frost_date_option, first_fall_frost, last_spring_frost,
      units_system, temperature_unit, currency_code, currency_symbol, timezone,
      date_format, public_description, public_website, instagram_handle,
      facebook_handle, public_phone, public_email, show_public_address,
      certifications, tax_registration_id
    } = req.body;

    // Field Validations
    if (!farm_name || farm_name.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Farm name is required (min 2 characters)' });
    }
    if (year_founded && (year_founded < 1800 || year_founded > 2026)) {
      return res.status(400).json({ success: false, error: 'Year founded must be between 1800 and 2026' });
    }
    if (farm_size && Number(farm_size) < 0) {
      return res.status(400).json({ success: false, error: 'Farm size cannot be negative' });
    }

    const query = `
      INSERT INTO vivas_settings_farm_profile (
        farm_id, farm_name, year_founded, location_mode, address, city, state, country,
        postal_code, gps_lat, gps_lng, farm_size, farm_size_unit, operation_type,
        logo_url, invoice_header_mode, operating_hours, growing_format,
        default_bed_width_ft, default_pathway_width_ft, default_yield_area_unit,
        default_yield_mass_unit, frost_date_option, first_fall_frost, last_spring_frost,
        units_system, temperature_unit, currency_code, currency_symbol, timezone,
        date_format, public_description, public_website, instagram_handle,
        facebook_handle, public_phone, public_email, show_public_address,
        certifications, tax_registration_id, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18,
        $19, $20, $21,
        $22, $23, $24, $25,
        $26, $27, $28, $29, $30,
        $31, $32, $33, $34,
        $35, $36, $37, $38,
        $39, $40, NOW()
      )
      ON CONFLICT (farm_id) DO UPDATE SET
        farm_name = EXCLUDED.farm_name,
        year_founded = EXCLUDED.year_founded,
        location_mode = EXCLUDED.location_mode,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        country = EXCLUDED.country,
        postal_code = EXCLUDED.postal_code,
        gps_lat = EXCLUDED.gps_lat,
        gps_lng = EXCLUDED.gps_lng,
        farm_size = EXCLUDED.farm_size,
        farm_size_unit = EXCLUDED.farm_size_unit,
        operation_type = EXCLUDED.operation_type,
        logo_url = COALESCE(EXCLUDED.logo_url, vivas_settings_farm_profile.logo_url),
        invoice_header_mode = EXCLUDED.invoice_header_mode,
        operating_hours = EXCLUDED.operating_hours,
        growing_format = EXCLUDED.growing_format,
        default_bed_width_ft = EXCLUDED.default_bed_width_ft,
        default_pathway_width_ft = EXCLUDED.default_pathway_width_ft,
        default_yield_area_unit = EXCLUDED.default_yield_area_unit,
        default_yield_mass_unit = EXCLUDED.default_yield_mass_unit,
        frost_date_option = EXCLUDED.frost_date_option,
        first_fall_frost = EXCLUDED.first_fall_frost,
        last_spring_frost = EXCLUDED.last_spring_frost,
        units_system = EXCLUDED.units_system,
        temperature_unit = EXCLUDED.temperature_unit,
        currency_code = EXCLUDED.currency_code,
        currency_symbol = EXCLUDED.currency_symbol,
        timezone = EXCLUDED.timezone,
        date_format = EXCLUDED.date_format,
        public_description = EXCLUDED.public_description,
        public_website = EXCLUDED.public_website,
        instagram_handle = EXCLUDED.instagram_handle,
        facebook_handle = EXCLUDED.facebook_handle,
        public_phone = EXCLUDED.public_phone,
        public_email = EXCLUDED.public_email,
        show_public_address = EXCLUDED.show_public_address,
        certifications = EXCLUDED.certifications,
        tax_registration_id = EXCLUDED.tax_registration_id,
        updated_at = NOW()
      RETURNING *;
    `;

    const values = [
      farmId, farm_name, year_founded || 2026, location_mode || 'address', address || null,
      city || null, state || null, country || 'India', postal_code || null,
      gps_lat ? Number(gps_lat) : null, gps_lng ? Number(gps_lng) : null,
      farm_size ? Number(farm_size) : null, farm_size_unit || 'Acres',
      operation_type || 'Mixed Vegetable & Fruit Farm', logo_url || null,
      invoice_header_mode || 'LOGO_AND_NAME',
      operating_hours ? (typeof operating_hours === 'string' ? operating_hours : JSON.stringify(operating_hours)) : '{}',
      growing_format || 'Beds & Pathways',
      default_bed_width_ft ? Number(default_bed_width_ft) : 2.50,
      default_pathway_width_ft ? Number(default_pathway_width_ft) : 1.50,
      default_yield_area_unit || 'Acre', default_yield_mass_unit || 'Ton',
      frost_date_option || 'manual', first_fall_frost || null, last_spring_frost || null,
      units_system || 'Metric', temperature_unit || 'C', currency_code || 'INR',
      currency_symbol || '₹', timezone || 'Asia/Kolkata', date_format || 'DD/MM/YYYY',
      public_description || null, public_website || null, instagram_handle || null,
      facebook_handle || null, public_phone || null, public_email || null,
      show_public_address !== undefined ? Boolean(show_public_address) : true,
      certifications ? (typeof certifications === 'string' ? certifications : JSON.stringify(certifications)) : '[]',
      tax_registration_id || null
    ];

    const result = await pool.query(query, values);

    // Also sync farm_name in vivas_farms
    await pool.query(
      `UPDATE vivas_farms SET farm_name = $1, updated_at = NOW() WHERE id = $2`,
      [farm_name, farmId]
    );

    res.json({ success: true, data: result.rows[0], message: 'Farm profile updated successfully' });
  } catch (err) {
    console.error('Error updating farm profile:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 2. MODULE 2: TASK TYPE MANAGEMENT
// ============================================================
router.get('/task-types', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const { category, search, activeOnly } = req.query;

    let queryStr = `SELECT * FROM vivas_settings_task_types WHERE farm_id = $1`;
    const params = [farmId];

    if (category && category !== 'All') {
      params.push(category);
      queryStr += ` AND category = $${params.length}`;
    }
    if (activeOnly === 'true') {
      queryStr += ` AND is_active = TRUE`;
    }
    if (search) {
      params.push(`%${search}%`);
      queryStr += ` AND (name ILIKE $${params.length} OR abbreviation ILIKE $${params.length})`;
    }

    queryStr += ` ORDER BY sort_order ASC, name ASC`;
    const result = await pool.query(queryStr, params);

    // Also get distinct categories
    const catRes = await pool.query(
      `SELECT DISTINCT category FROM vivas_settings_task_types WHERE farm_id = $1 ORDER BY category ASC`,
      [farmId]
    );

    res.json({
      success: true,
      data: result.rows,
      taskTypes: result.rows,
      categories: catRes.rows.map(r => r.category)
    });
  } catch (err) {
    console.error('Error fetching task types:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/task-types', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const { name, category, is_active, description } = req.body;
    let abbreviation = req.body.abbreviation;
    const bg_color = req.body.bg_color || req.body.color_bg || '#10b981';
    const text_color = req.body.text_color || req.body.color_text || '#ffffff';

    if (!name || !name.trim()) return res.status(400).json({ success: false, error: 'Task type name is required' });
    if (!abbreviation || !abbreviation.trim()) {
      abbreviation = name.trim().slice(0, 3).toUpperCase();
    }
    if (!category || !category.trim()) return res.status(400).json({ success: false, error: 'Category is required' });

    // Check duplicate
    const dupCheck = await pool.query(
      `SELECT id FROM vivas_settings_task_types WHERE farm_id = $1 AND name ILIKE $2`,
      [farmId, name.trim()]
    );
    if (dupCheck.rows.length > 0) {
      return res.status(400).json({ success: false, error: `A task type with name "${name}" already exists` });
    }

    const orderRes = await pool.query(
      `SELECT COALESCE(MAX(sort_order), 0) + 1 as next_order FROM vivas_settings_task_types WHERE farm_id = $1`,
      [farmId]
    );
    const nextOrder = orderRes.rows[0].next_order;

    const result = await pool.query(
      `INSERT INTO vivas_settings_task_types (
        farm_id, name, abbreviation, category, bg_color, text_color, is_active, sort_order, is_system_default, description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, $9) RETURNING *`,
      [
        farmId, name.trim(), abbreviation.trim().toUpperCase(), category.trim(),
        bg_color, text_color,
        is_active !== undefined ? Boolean(is_active) : true,
        nextOrder, description || null
      ]
    );

    res.status(201).json({ success: true, taskType: result.rows[0], data: result.rows[0], message: 'Task type created successfully' });
  } catch (err) {
    console.error('Error creating task type:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/task-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, abbreviation, category, is_active, sort_order, description } = req.body;
    const bg_color = req.body.bg_color !== undefined ? req.body.bg_color : req.body.color_bg;
    const text_color = req.body.text_color !== undefined ? req.body.text_color : req.body.color_text;

    const existing = await pool.query(`SELECT * FROM vivas_settings_task_types WHERE id = $1`, [id]);
    if (existing.rows.length === 0) return res.status(404).json({ success: false, error: 'Task type not found' });

    const result = await pool.query(
      `UPDATE vivas_settings_task_types SET
        name = COALESCE($1, name),
        abbreviation = COALESCE($2, abbreviation),
        category = COALESCE($3, category),
        bg_color = COALESCE($4, bg_color),
        text_color = COALESCE($5, text_color),
        is_active = COALESCE($6, is_active),
        sort_order = COALESCE($7, sort_order),
        description = COALESCE($8, description),
        updated_at = NOW()
      WHERE id = $9 RETURNING *`,
      [
        name ? name.trim() : null,
        abbreviation ? abbreviation.trim().toUpperCase() : null,
        category ? category.trim() : null,
        bg_color, text_color,
        is_active !== undefined ? Boolean(is_active) : null,
        sort_order !== undefined ? Number(sort_order) : null,
        description,
        id
      ]
    );

    res.json({ success: true, data: result.rows[0], message: 'Task type updated successfully' });
  } catch (err) {
    console.error('Error updating task type:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/task-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Check if task type exists
    const row = await pool.query(`SELECT * FROM vivas_settings_task_types WHERE id = $1`, [id]);
    if (row.rows.length === 0) return res.status(404).json({ success: false, error: 'Task type not found' });

    // Soft delete or hard delete if no active tasks
    await pool.query(`DELETE FROM vivas_settings_task_types WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Task type deleted successfully' });
  } catch (err) {
    console.error('Error deleting task type:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 3. MODULE 3: USERS & ROLES
// ============================================================
router.get('/users', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const { search } = req.query;

    let queryStr = `
      SELECT u.id, u.full_name, u.first_name, u.last_name, u.email, u.role,
             u.phone_country_code, u.phone_number, u.labor_rate, u.labor_rate_currency,
             u.avatar_url, u.is_active, u.created_at,
             COALESCE(u.updated_at, u.created_at) AS last_login_at
      FROM vivas_users u
    `;
    const params = [];
    if (search) {
      params.push(`%${search}%`);
      queryStr += ` WHERE u.full_name ILIKE $1 OR u.email ILIKE $1 OR u.role ILIKE $1`;
    }
    queryStr += ` ORDER BY u.created_at ASC`;

    const result = await pool.query(queryStr, params);
    res.json({ success: true, data: result.rows, users: result.rows });
  } catch (err) {
    console.error('Error getting users:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/users', async (req, res) => {
  try {
    const { first_name, last_name, email, phone_number, phone_country_code, role, labor_rate } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'A valid email address is required' });
    }
    const fullName = `${first_name || ''} ${last_name || ''}`.trim() || email.split('@')[0];

    const dup = await pool.query(`SELECT id FROM vivas_users WHERE email = $1`, [email.toLowerCase().trim()]);
    if (dup.rows.length > 0) {
      return res.status(400).json({ success: false, error: 'A user with this email already exists' });
    }

    const insert = await pool.query(
      `INSERT INTO vivas_users (
        full_name, first_name, last_name, email, password_hash, phone_country_code, phone_number,
        role, labor_rate, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, NOW(), NOW()) RETURNING *`,
      [
        fullName, first_name || null, last_name || null, email.toLowerCase().trim(),
        '$2b$10$temporaryhashforinviteduserplaceholder',
        phone_country_code || '+91', phone_number || null, role || 'Field Crew',
        labor_rate ? Number(labor_rate) : 0.00
      ]
    );

    res.status(201).json({ success: true, data: insert.rows[0], message: 'User added successfully' });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, role, phone_number, phone_country_code, labor_rate, is_active } = req.body;

    const fullName = first_name || last_name ? `${first_name || ''} ${last_name || ''}`.trim() : null;

    const result = await pool.query(
      `UPDATE vivas_users SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        full_name = COALESCE($3, full_name),
        role = COALESCE($4, role),
        phone_number = COALESCE($5, phone_number),
        phone_country_code = COALESCE($6, phone_country_code),
        labor_rate = COALESCE($7, labor_rate),
        is_active = COALESCE($8, is_active),
        updated_at = NOW()
      WHERE id = $9 RETURNING *`,
      [
        first_name, last_name, fullName, role, phone_number, phone_country_code,
        labor_rate !== undefined ? Number(labor_rate) : null,
        is_active !== undefined ? Boolean(is_active) : null,
        id
      ]
    );

    res.json({ success: true, data: result.rows[0], message: 'User updated successfully' });
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Don't allow deleting current main user or owner
    const u = await pool.query(`SELECT email, role FROM vivas_users WHERE id = $1`, [id]);
    if (u.rows.length > 0 && u.rows[0].role === 'Owner') {
      return res.status(400).json({ success: false, error: 'Cannot delete the Farm Owner account' });
    }
    await pool.query(`UPDATE vivas_users SET is_active = FALSE WHERE id = $1`, [id]);
    res.json({ success: true, message: 'User access deactivated' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/roles', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const result = await pool.query(
      `SELECT * FROM vivas_settings_roles WHERE farm_id = $1 ORDER BY is_custom ASC, role_name ASC`,
      [farmId]
    );
    res.json({ success: true, data: result.rows, roles: result.rows });
  } catch (err) {
    console.error('Error getting roles:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/roles', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const { role_name, description, permissions } = req.body;
    if (!role_name || !role_name.trim()) return res.status(400).json({ success: false, error: 'Role name is required' });

    const insert = await pool.query(
      `INSERT INTO vivas_settings_roles (farm_id, role_name, description, is_custom, permissions)
       VALUES ($1, $2, $3, TRUE, $4) RETURNING *`,
      [farmId, role_name.trim(), description || '', permissions ? JSON.stringify(permissions) : '{}']
    );

    res.status(201).json({ success: true, data: insert.rows[0], message: 'Custom role created' });
  } catch (err) {
    console.error('Error creating role:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 4. MODULE 4: PRODUCT SETTINGS
// ============================================================
router.get('/product', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const resProduct = await pool.query(
      `SELECT * FROM vivas_settings_product WHERE farm_id = $1`,
      [farmId]
    );
    res.json({ success: true, data: resProduct.rows[0] || null });
  } catch (err) {
    console.error('Error getting product settings:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/product', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const {
      shelf_life_tracking_enabled, default_shelf_life_value, default_shelf_life_unit,
      unlimited_shelf_life_enabled, inventory_impact_mode, update_committed_on_pack,
      update_on_hand_on_pack, block_if_stock_short, allow_negative_available
    } = req.body;

    const query = `
      INSERT INTO vivas_settings_product (
        farm_id, shelf_life_tracking_enabled, default_shelf_life_value, default_shelf_life_unit,
        unlimited_shelf_life_enabled, inventory_impact_mode, update_committed_on_pack,
        update_on_hand_on_pack, block_if_stock_short, allow_negative_available, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()
      )
      ON CONFLICT (farm_id) DO UPDATE SET
        shelf_life_tracking_enabled = EXCLUDED.shelf_life_tracking_enabled,
        default_shelf_life_value = EXCLUDED.default_shelf_life_value,
        default_shelf_life_unit = EXCLUDED.default_shelf_life_unit,
        unlimited_shelf_life_enabled = EXCLUDED.unlimited_shelf_life_enabled,
        inventory_impact_mode = EXCLUDED.inventory_impact_mode,
        update_committed_on_pack = EXCLUDED.update_committed_on_pack,
        update_on_hand_on_pack = EXCLUDED.update_on_hand_on_pack,
        block_if_stock_short = EXCLUDED.block_if_stock_short,
        allow_negative_available = EXCLUDED.allow_negative_available,
        updated_at = NOW()
      RETURNING *;
    `;

    const values = [
      farmId,
      shelf_life_tracking_enabled !== undefined ? Boolean(shelf_life_tracking_enabled) : true,
      default_shelf_life_value ? Number(default_shelf_life_value) : 10,
      default_shelf_life_unit || 'Days',
      unlimited_shelf_life_enabled !== undefined ? Boolean(unlimited_shelf_life_enabled) : false,
      inventory_impact_mode || 'Standard',
      update_committed_on_pack !== undefined ? Boolean(update_committed_on_pack) : true,
      update_on_hand_on_pack !== undefined ? Boolean(update_on_hand_on_pack) : true,
      block_if_stock_short !== undefined ? Boolean(block_if_stock_short) : true,
      allow_negative_available !== undefined ? Boolean(allow_negative_available) : false
    ];

    const result = await pool.query(query, values);
    res.json({ success: true, data: result.rows[0], message: 'Product settings saved' });
  } catch (err) {
    console.error('Error updating product settings:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 5. MODULE 5: ONLINE STORE & OFFER SHEET SETTINGS
// ============================================================
router.get('/online-store', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const storeRes = await pool.query(`SELECT * FROM vivas_settings_online_store WHERE farm_id = $1`, [farmId]);
    const deliveryRes = await pool.query(`SELECT * FROM vivas_settings_delivery_types WHERE farm_id = $1 ORDER BY method_name ASC`, [farmId]);
    const pickupRes = await pool.query(`SELECT * FROM vivas_settings_pickup_locations WHERE farm_id = $1 ORDER BY location_name ASC`, [farmId]);

    const rawStore = storeRes.rows[0] || null;
    const store = rawStore ? {
      ...rawStore,
      store_name: rawStore.brand_farm_name || '',
      brand_farm_name: rawStore.brand_farm_name || '',
      enable_online_store: rawStore.store_enabled !== false,
      store_enabled: rawStore.store_enabled !== false,
      public_store_notice: rawStore.terms_and_policies || '',
      terms_and_policies: rawStore.terms_and_policies || ''
    } : null;

    const deliveryTypes = deliveryRes.rows.map(d => ({
      ...d,
      name: d.method_name,
      method_name: d.method_name,
      fee: d.delivery_fee !== null ? parseFloat(d.delivery_fee) : 0,
      delivery_fee: d.delivery_fee !== null ? parseFloat(d.delivery_fee) : 0,
      description: d.estimated_window || '',
      estimated_window: d.estimated_window || ''
    }));

    const pickupLocations = pickupRes.rows.map(p => ({
      ...p,
      name: p.location_name,
      location_name: p.location_name
    }));

    res.json({
      success: true,
      data: {
        store,
        deliveryTypes,
        pickupLocations
      },
      store,
      deliveryTypes,
      pickupLocations
    });
  } catch (err) {
    console.error('Error getting store settings:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/online-store', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const {
      store_enabled, enable_online_store,
      brand_farm_name, store_name,
      brand_year_founded, brand_address,
      default_tax_rate, order_cutoff_hours, minimum_order_amount,
      terms_and_policies, public_store_notice
    } = req.body;

    const query = `
      INSERT INTO vivas_settings_online_store (
        farm_id, store_enabled, brand_farm_name, brand_year_founded, brand_address,
        default_tax_rate, order_cutoff_hours, minimum_order_amount, terms_and_policies, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
      )
      ON CONFLICT (farm_id) DO UPDATE SET
        store_enabled = EXCLUDED.store_enabled,
        brand_farm_name = EXCLUDED.brand_farm_name,
        brand_year_founded = EXCLUDED.brand_year_founded,
        brand_address = EXCLUDED.brand_address,
        default_tax_rate = EXCLUDED.default_tax_rate,
        order_cutoff_hours = EXCLUDED.order_cutoff_hours,
        minimum_order_amount = EXCLUDED.minimum_order_amount,
        terms_and_policies = EXCLUDED.terms_and_policies,
        updated_at = NOW()
      RETURNING *;
    `;

    const isEnabled = store_enabled !== undefined ? Boolean(store_enabled) : (enable_online_store !== undefined ? Boolean(enable_online_store) : true);
    const farmName = brand_farm_name || store_name || null;
    const policies = terms_and_policies || public_store_notice || null;

    const values = [
      farmId,
      isEnabled,
      farmName,
      brand_year_founded ? Number(brand_year_founded) : 2026,
      brand_address || null,
      default_tax_rate !== undefined ? Number(default_tax_rate) : 5.0,
      order_cutoff_hours !== undefined ? Number(order_cutoff_hours) : 24,
      minimum_order_amount !== undefined ? Number(minimum_order_amount) : 0.00,
      policies
    ];

    const result = await pool.query(query, values);
    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        ...row,
        store_name: row.brand_farm_name,
        enable_online_store: row.store_enabled,
        public_store_notice: row.terms_and_policies
      },
      message: 'Store settings updated'
    });
  } catch (err) {
    console.error('Error saving store settings:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delivery Types CRUD
router.post('/delivery-types', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const methodName = (req.body.method_name || req.body.name || '').trim();
    const fee = req.body.delivery_fee !== undefined ? req.body.delivery_fee : (req.body.fee !== undefined ? req.body.fee : 0.00);
    const minOrder = req.body.minimum_order_amount !== undefined ? req.body.minimum_order_amount : 0.00;
    const windowDesc = req.body.estimated_window || req.body.description || 'Standard Route';
    const active = req.body.is_active !== undefined ? Boolean(req.body.is_active) : true;

    if (!methodName) return res.status(400).json({ success: false, error: 'Method name is required' });

    const insert = await pool.query(
      `INSERT INTO vivas_settings_delivery_types (
        farm_id, method_name, delivery_fee, minimum_order_amount, estimated_window, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [farmId, methodName, Number(fee), Number(minOrder), windowDesc, active]
    );
    const row = insert.rows[0];
    res.status(201).json({
      success: true,
      data: {
        ...row,
        name: row.method_name,
        fee: parseFloat(row.delivery_fee),
        description: row.estimated_window
      }
    });
  } catch (err) {
    console.error('Error adding delivery type:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/delivery-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const methodName = req.body.method_name || req.body.name;
    const fee = req.body.delivery_fee !== undefined ? req.body.delivery_fee : req.body.fee;
    const minOrder = req.body.minimum_order_amount;
    const windowDesc = req.body.estimated_window || req.body.description;
    const active = req.body.is_active;

    const result = await pool.query(
      `UPDATE vivas_settings_delivery_types SET
        method_name = COALESCE($1, method_name),
        delivery_fee = COALESCE($2, delivery_fee),
        minimum_order_amount = COALESCE($3, minimum_order_amount),
        estimated_window = COALESCE($4, estimated_window),
        is_active = COALESCE($5, is_active)
      WHERE id = $6 RETURNING *`,
      [
        methodName ? methodName.trim() : null,
        fee !== undefined ? Number(fee) : null,
        minOrder !== undefined ? Number(minOrder) : null,
        windowDesc,
        active !== undefined ? Boolean(active) : null,
        id
      ]
    );
    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        ...row,
        name: row.method_name,
        fee: parseFloat(row.delivery_fee),
        description: row.estimated_window
      }
    });
  } catch (err) {
    console.error('Error updating delivery type:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/delivery-types/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM vivas_settings_delivery_types WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Delivery method deleted' });
  } catch (err) {
    console.error('Error deleting delivery type:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Pickup Locations CRUD
router.post('/pickup-locations', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const locName = (req.body.location_name || req.body.name || '').trim();
    const addr = (req.body.address || '').trim();
    const instr = req.body.instructions || '';
    const sched = req.body.schedule || '';
    const active = req.body.is_active !== undefined ? Boolean(req.body.is_active) : true;

    if (!locName || !addr) return res.status(400).json({ success: false, error: 'Location name and address are required' });

    const insert = await pool.query(
      `INSERT INTO vivas_settings_pickup_locations (
        farm_id, location_name, address, instructions, schedule, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [farmId, locName, addr, instr, sched, active]
    );
    const row = insert.rows[0];
    res.status(201).json({
      success: true,
      data: {
        ...row,
        name: row.location_name
      }
    });
  } catch (err) {
    console.error('Error adding pickup location:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/pickup-locations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const locName = req.body.location_name || req.body.name;
    const addr = req.body.address;
    const instr = req.body.instructions;
    const sched = req.body.schedule;
    const active = req.body.is_active;

    const result = await pool.query(
      `UPDATE vivas_settings_pickup_locations SET
        location_name = COALESCE($1, location_name),
        address = COALESCE($2, address),
        instructions = COALESCE($3, instructions),
        schedule = COALESCE($4, schedule),
        is_active = COALESCE($5, is_active)
      WHERE id = $6 RETURNING *`,
      [
        locName ? locName.trim() : null,
        addr ? addr.trim() : null,
        instr !== undefined ? instr : null,
        sched !== undefined ? sched : null,
        active !== undefined ? Boolean(active) : null,
        id
      ]
    );
    const row = result.rows[0];
    res.json({
      success: true,
      data: {
        ...row,
        name: row.location_name
      }
    });
  } catch (err) {
    console.error('Error updating pickup location:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/pickup-locations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM vivas_settings_pickup_locations WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Pickup location removed' });
  } catch (err) {
    console.error('Error deleting pickup location:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 6. MODULE 6: NOTIFICATION SETTINGS
// ============================================================
router.get('/notifications', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const { category } = req.query;

    let queryStr = `SELECT * FROM vivas_settings_notifications WHERE farm_id = $1`;
    const params = [farmId];
    if (category) {
      params.push(category);
      queryStr += ` AND category = $2`;
    }
    queryStr += ` ORDER BY category ASC, event_key ASC`;

    const result = await pool.query(queryStr, params);
    res.json({ success: true, data: result.rows, notifications: result.rows });
  } catch (err) {
    console.error('Error getting notifications:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/notifications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { mobile_push_enabled, in_app_enabled } = req.body;

    const result = await pool.query(
      `UPDATE vivas_settings_notifications SET
        mobile_push_enabled = COALESCE($1, mobile_push_enabled),
        in_app_enabled = COALESCE($2, in_app_enabled),
        updated_at = NOW()
      WHERE id = $3 RETURNING *`,
      [mobile_push_enabled, in_app_enabled, id]
    );

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error('Error updating notification preference:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 7. MODULE 7: PLANTING ID CONFIGURATION
// ============================================================
router.get('/planting-id', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const result = await pool.query(
      `SELECT * FROM vivas_settings_planting_id WHERE farm_id = $1`,
      [farmId]
    );
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error('Error getting planting ID config:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/planting-id', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const { pattern_type, starting_sequence, show_auto_number_only, prefix, separator } = req.body;

    const query = `
      INSERT INTO vivas_settings_planting_id (
        farm_id, pattern_type, starting_sequence, show_auto_number_only, prefix, separator, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, NOW()
      )
      ON CONFLICT (farm_id) DO UPDATE SET
        pattern_type = EXCLUDED.pattern_type,
        starting_sequence = EXCLUDED.starting_sequence,
        show_auto_number_only = EXCLUDED.show_auto_number_only,
        prefix = EXCLUDED.prefix,
        separator = EXCLUDED.separator,
        updated_at = NOW()
      RETURNING *;
    `;

    const values = [
      farmId,
      pattern_type || 'auto_number',
      starting_sequence ? Number(starting_sequence) : 1,
      show_auto_number_only !== undefined ? Boolean(show_auto_number_only) : false,
      prefix || 'PLN',
      separator || '-'
    ];

    const result = await pool.query(query, values);
    res.json({ success: true, data: result.rows[0], message: 'Planting ID configuration saved' });
  } catch (err) {
    console.error('Error updating planting ID config:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 8. MODULE 8: LABEL MANAGEMENT
// ============================================================
router.get('/labels', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const { purpose, search } = req.query;

    let queryStr = `SELECT * FROM vivas_settings_labels WHERE farm_id = $1`;
    const params = [farmId];

    if (purpose && purpose !== 'All') {
      params.push(purpose);
      queryStr += ` AND purpose = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      queryStr += ` AND design_name ILIKE $${params.length}`;
    }

    queryStr += ` ORDER BY is_default DESC, created_at DESC`;
    const result = await pool.query(queryStr, params);

    res.json({ success: true, data: result.rows, labels: result.rows, labelTemplates: result.rows });
  } catch (err) {
    console.error('Error fetching labels:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/labels', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const { design_name, purpose, label_type, dimensions, fields_included, is_default } = req.body;
    if (!design_name || !purpose) return res.status(400).json({ success: false, error: 'Design name and purpose are required' });

    const insert = await pool.query(
      `INSERT INTO vivas_settings_labels (
        farm_id, design_name, purpose, label_type, dimensions, fields_included, is_default
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        farmId, design_name.trim(), purpose,
        label_type || 'Thermal Label',
        dimensions || '4" x 2"',
        fields_included ? (typeof fields_included === 'string' ? fields_included : JSON.stringify(fields_included)) : '[]',
        Boolean(is_default)
      ]
    );

    res.status(201).json({ success: true, data: insert.rows[0], message: 'Label template created' });
  } catch (err) {
    console.error('Error creating label:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/labels/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM vivas_settings_labels WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Label template deleted' });
  } catch (err) {
    console.error('Error deleting label:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 9. MODULE 9: COMMERCE & PAYMENT PROCESSORS
// ============================================================
router.get('/payment-processors', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const processors = await pool.query(
      `SELECT id, provider_code, provider_name, is_enabled, is_test_mode, publishable_key, currency, description, updated_at
       FROM vivas_settings_payment_processors WHERE farm_id = $1 ORDER BY is_enabled DESC, provider_name ASC`,
      [farmId]
    );
    const channels = await pool.query(
      `SELECT * FROM vivas_settings_channel_mappings WHERE farm_id = $1`,
      [farmId]
    );

    res.json({
      success: true,
      data: {
        processors: processors.rows,
        channels: channels.rows,
        channelMappings: channels.rows
      },
      processors: processors.rows,
      channels: channels.rows,
      channelMappings: channels.rows
    });
  } catch (err) {
    console.error('Error getting payment processors:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/payment-processors/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const is_enabled = req.body.is_enabled;
    const is_test_mode = req.body.is_test_mode;
    const publishable_key = req.body.publishable_key || req.body.api_key;
    const secret_key = req.body.secret_key || req.body.api_secret;
    const webhook_secret = req.body.webhook_secret;
    const currency = req.body.currency;

    const result = await pool.query(
      `UPDATE vivas_settings_payment_processors SET
        is_enabled = COALESCE($1, is_enabled),
        is_test_mode = COALESCE($2, is_test_mode),
        publishable_key = COALESCE($3, publishable_key),
        secret_key_encrypted = COALESCE($4, secret_key_encrypted),
        webhook_secret = COALESCE($5, webhook_secret),
        currency = COALESCE($6, currency),
        updated_at = NOW()
      WHERE id = $7 RETURNING id, provider_code, provider_name, is_enabled, is_test_mode, publishable_key, currency`,
      [
        is_enabled !== undefined ? Boolean(is_enabled) : null,
        is_test_mode !== undefined ? Boolean(is_test_mode) : null,
        publishable_key,
        secret_key,
        webhook_secret,
        currency,
        id
      ]
    );

    res.json({ success: true, data: result.rows[0], message: 'Payment gateway configuration updated' });
  } catch (err) {
    console.error('Error updating processor:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 10. MODULE 10: TIME & ATTENDANCE SETTINGS
// ============================================================
router.get('/time-attendance', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const result = await pool.query(
      `SELECT * FROM vivas_settings_time_attendance WHERE farm_id = $1`,
      [farmId]
    );
    res.json({ success: true, data: result.rows[0] || null });
  } catch (err) {
    console.error('Error getting time attendance settings:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/time-attendance', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const {
      clock_in_enabled, task_clock_in_required, geofencing_enabled,
      geofence_radius_meters, overtime_threshold_hours, overtime_multiplier
    } = req.body;

    const query = `
      INSERT INTO vivas_settings_time_attendance (
        farm_id, clock_in_enabled, task_clock_in_required, geofencing_enabled,
        geofence_radius_meters, overtime_threshold_hours, overtime_multiplier, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, NOW()
      )
      ON CONFLICT (farm_id) DO UPDATE SET
        clock_in_enabled = EXCLUDED.clock_in_enabled,
        task_clock_in_required = EXCLUDED.task_clock_in_required,
        geofencing_enabled = EXCLUDED.geofencing_enabled,
        geofence_radius_meters = EXCLUDED.geofence_radius_meters,
        overtime_threshold_hours = EXCLUDED.overtime_threshold_hours,
        overtime_multiplier = EXCLUDED.overtime_multiplier,
        updated_at = NOW()
      RETURNING *;
    `;

    const values = [
      farmId,
      clock_in_enabled !== undefined ? Boolean(clock_in_enabled) : true,
      task_clock_in_required !== undefined ? Boolean(task_clock_in_required) : true,
      geofencing_enabled !== undefined ? Boolean(geofencing_enabled) : false,
      geofence_radius_meters ? Number(geofence_radius_meters) : 500,
      overtime_threshold_hours ? Number(overtime_threshold_hours) : 40,
      overtime_multiplier ? Number(overtime_multiplier) : 1.50
    ];

    const result = await pool.query(query, values);
    res.json({ success: true, data: result.rows[0], message: 'Time & Attendance settings updated' });
  } catch (err) {
    console.error('Error saving time attendance settings:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 11. MODULE 11: CUSTOM DATA FIELDS
// ============================================================
router.get('/custom-fields', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const { target_entity } = req.query;

    let queryStr = `SELECT * FROM vivas_settings_custom_fields WHERE farm_id = $1`;
    const params = [farmId];
    if (target_entity && target_entity !== 'All') {
      params.push(target_entity);
      queryStr += ` AND target_entity = $2`;
    }
    queryStr += ` ORDER BY target_entity ASC, sort_order ASC, field_label ASC`;

    const result = await pool.query(queryStr, params);
    res.json({ success: true, data: result.rows, fields: result.rows, customFields: result.rows });
  } catch (err) {
    console.error('Error getting custom fields:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/custom-fields', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const { field_label, target_entity, field_type, select_options, is_required, default_value } = req.body;

    if (!field_label || !target_entity || !field_type) {
      return res.status(400).json({ success: false, error: 'Field label, target entity, and type are required' });
    }
    const fieldKey = field_label.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_');

    const insert = await pool.query(
      `INSERT INTO vivas_settings_custom_fields (
        farm_id, field_label, field_key, target_entity, field_type, select_options, is_required, default_value
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        farmId, field_label.trim(), fieldKey, target_entity, field_type,
        select_options ? (typeof select_options === 'string' ? select_options : JSON.stringify(select_options)) : '[]',
        Boolean(is_required), default_value || null
      ]
    );

    res.status(201).json({ success: true, data: insert.rows[0], message: 'Custom field registered' });
  } catch (err) {
    console.error('Error creating custom field:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/custom-fields/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM vivas_settings_custom_fields WHERE id = $1`, [id]);
    res.json({ success: true, message: 'Custom field deleted' });
  } catch (err) {
    console.error('Error deleting custom field:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================
// 12. MODULE 12: APPS & INTEGRATIONS (API TOKENS & WEBHOOKS)
// ============================================================
router.get('/api-tokens', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const result = await pool.query(
      `SELECT id, token_name, token_preview, permission_scope, expires_at, last_used_at, is_revoked, created_at
       FROM vivas_settings_api_tokens WHERE farm_id = $1 ORDER BY created_at DESC`,
      [farmId]
    );
    res.json({ success: true, data: result.rows, tokens: result.rows, apiTokens: result.rows });
  } catch (err) {
    console.error('Error getting API tokens:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/api-tokens', async (req, res) => {
  try {
    const farmId = await resolveFarmId(req);
    const { token_name, permission_scope } = req.body;
    if (!token_name) return res.status(400).json({ success: false, error: 'Token name is required' });

    // Generate random 40-character API token
    const rawSecret = `vivas_live_${crypto.randomBytes(24).toString('hex')}`;
    const tokenHash = crypto.createHash('sha256').update(rawSecret).digest('hex');
    const tokenPreview = `${rawSecret.slice(0, 15)}...${rawSecret.slice(-4)}`;

    const insert = await pool.query(
      `INSERT INTO vivas_settings_api_tokens (
        farm_id, token_name, token_hash, token_preview, permission_scope, expires_at
      ) VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '1 year') RETURNING id, token_name, token_preview, permission_scope, created_at`,
      [farmId, token_name.trim(), tokenHash, tokenPreview, permission_scope || 'read_write']
    );

    // Return rawSecret ONCE to the user
    res.status(201).json({
      success: true,
      data: insert.rows[0],
      rawToken: rawSecret,
      message: 'Personal access token generated. Copy it now, it will not be shown again.'
    });
  } catch (err) {
    console.error('Error generating token:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/api-tokens/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`UPDATE vivas_settings_api_tokens SET is_revoked = TRUE WHERE id = $1`, [id]);
    res.json({ success: true, message: 'API token revoked' });
  } catch (err) {
    console.error('Error revoking token:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
