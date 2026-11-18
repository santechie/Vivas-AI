import express from "express";
import pool from "../config/db.js";
import { validateBody } from "../utils/validate.js";
import { handleRouteError } from "../utils/response.js";

const router = express.Router();

// ==========================================
// 8. SELL MODULE: SALES CHANNELS ENDPOINTS
// ==========================================

// GET /api/sales-channels - List all channels with customer and order aggregates
router.get("/api/sales-channels", async (req, res) => {
  try {
    const query = `
      SELECT c.*, 
        COUNT(DISTINCT cust.id) AS customer_count,
        COUNT(DISTINCT o.id) AS active_orders_count,
        COALESCE(SUM(o.total_amount), 0) AS total_revenue
      FROM vivas_sales_channels c
      LEFT JOIN vivas_customers cust ON cust.default_channel_id = c.id
      LEFT JOIN vivas_orders o ON o.sales_channel_id = c.id AND o.fulfillment_status != 'cancelled'
      GROUP BY c.id
      ORDER BY c.created_at ASC
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching sales channels:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/sales-channels - Create new sales channel
router.post("/api/sales-channels", async (req, res) => {
  try {
    const {
      name, channel_type, description, pricing_tier, delivery_days,
      order_cutoff_hours, payment_terms, min_order_amount, tax_rate_pct,
      color_hex, icon_name, is_active
    } = req.body;

    if (!name || !channel_type) {
      return res.status(400).json({ success: false, message: "Channel name and type are required" });
    }

    const query = `
      INSERT INTO vivas_sales_channels (
        name, channel_type, description, pricing_tier, delivery_days,
        order_cutoff_hours, payment_terms, min_order_amount, tax_rate_pct,
        color_hex, icon_name, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
    const values = [
      name, channel_type, description || '', pricing_tier || 'Wholesale Standard',
      JSON.stringify(delivery_days || ["Tuesday", "Friday"]),
      order_cutoff_hours || 24, payment_terms || 'Net 30',
      min_order_amount || 0, tax_rate_pct || 0,
      color_hex || '#0284c7', icon_name || 'Store',
      is_active !== undefined ? is_active : true
    ];
    const result = await pool.query(query, values);
    res.status(201).json({ success: true, data: result.rows[0], message: "Sales channel created successfully" });
  } catch (err) {
    console.error("Error creating sales channel:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/sales-channels/:id - Update sales channel
router.put("/api/sales-channels/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, channel_type, description, pricing_tier, delivery_days,
      order_cutoff_hours, payment_terms, min_order_amount, tax_rate_pct,
      color_hex, icon_name, is_active
    } = req.body;

    const query = `
      UPDATE vivas_sales_channels SET
        name = COALESCE($1, name),
        channel_type = COALESCE($2, channel_type),
        description = COALESCE($3, description),
        pricing_tier = COALESCE($4, pricing_tier),
        delivery_days = COALESCE($5, delivery_days),
        order_cutoff_hours = COALESCE($6, order_cutoff_hours),
        payment_terms = COALESCE($7, payment_terms),
        min_order_amount = COALESCE($8, min_order_amount),
        tax_rate_pct = COALESCE($9, tax_rate_pct),
        color_hex = COALESCE($10, color_hex),
        icon_name = COALESCE($11, icon_name),
        is_active = COALESCE($12, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *
    `;
    const values = [
      name, channel_type, description, pricing_tier,
      delivery_days ? JSON.stringify(delivery_days) : null,
      order_cutoff_hours, payment_terms, min_order_amount, tax_rate_pct,
      color_hex, icon_name, is_active, id
    ];
    const result = await pool.query(query, values);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Channel not found" });
    res.json({ success: true, data: result.rows[0], message: "Sales channel updated successfully" });
  } catch (err) {
    console.error("Error updating sales channel:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/sales-channels/:id - Delete sales channel
router.delete("/api/sales-channels/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM vivas_sales_channels WHERE id = $1 RETURNING id", [id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Channel not found" });
    res.json({ success: true, message: "Sales channel deleted successfully" });
  } catch (err) {
    console.error("Error deleting sales channel:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 9. SELL MODULE: CUSTOMERS ENDPOINTS
// ==========================================

// GET /api/customers - List customers
router.get("/api/customers", async (req, res) => {
  try {
    const { search, channel_id, type } = req.query;
    let query = `
      SELECT cust.*, sc.name AS channel_name, sc.color_hex AS channel_color,
        COUNT(DISTINCT o.id) AS total_orders_count,
        COALESCE(SUM(o.total_amount), 0) AS total_spend
      FROM vivas_customers cust
      LEFT JOIN vivas_sales_channels sc ON sc.id = cust.default_channel_id
      LEFT JOIN vivas_orders o ON o.customer_id = cust.id AND o.fulfillment_status != 'cancelled'
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (cust.name ILIKE $${params.length} OR cust.company_name ILIKE $${params.length} OR cust.email ILIKE $${params.length})`;
    }
    if (channel_id && channel_id !== 'All') {
      params.push(channel_id);
      query += ` AND cust.default_channel_id = $${params.length}`;
    }
    if (type && type !== 'All') {
      params.push(type);
      query += ` AND cust.customer_type = $${params.length}`;
    }

    query += ` GROUP BY cust.id, sc.name, sc.color_hex ORDER BY cust.name ASC`;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching customers:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/customers - Create new customer
router.post("/api/customers", async (req, res) => {
  try {
    const {
      name, company_name, customer_type, email, phone,
      billing_address, shipping_address, default_channel_id, payment_terms, tax_exempt, notes
    } = req.body;

    if (!name) return res.status(400).json({ success: false, message: "Customer name is required" });

    const query = `
      INSERT INTO vivas_customers (
        name, company_name, customer_type, email, phone,
        billing_address, shipping_address, default_channel_id, payment_terms, tax_exempt, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    const values = [
      name, company_name || '', customer_type || 'Wholesale', email || '', phone || '',
      billing_address || '', shipping_address || '', default_channel_id || null,
      payment_terms || 'Net 30', tax_exempt || false, notes || ''
    ];
    const result = await pool.query(query, values);
    res.status(201).json({ success: true, data: result.rows[0], message: "Customer added successfully" });
  } catch (err) {
    console.error("Error creating customer:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 10. SELL MODULE: ORDERS ENDPOINTS
// ==========================================

// GET /api/orders - List orders with line items and filters
router.get("/api/orders", async (req, res) => {
  try {
    const { status, channel_id, date, start_date, end_date, search } = req.query;
    let query = `
      SELECT o.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'crop_name', oi.crop_name,
              'variety_name', oi.variety_name,
              'item_description', oi.item_description,
              'packaging_unit', oi.packaging_unit,
              'unit_price', oi.unit_price,
              'quantity_ordered', oi.quantity_ordered,
              'quantity_packed', oi.quantity_packed,
              'total_price', oi.total_price,
              'is_packed', oi.is_packed
            )
          ) FILTER (WHERE oi.id IS NOT NULL), '[]'::json
        ) AS items,
        sc.color_hex AS channel_color
      FROM vivas_orders o
      LEFT JOIN vivas_order_items oi ON oi.order_id = o.id
      LEFT JOIN vivas_sales_channels sc ON sc.id = o.sales_channel_id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'All') {
      params.push(status);
      query += ` AND (o.fulfillment_status = $${params.length} OR o.status = $${params.length})`;
    }
    if (channel_id && channel_id !== 'All') {
      params.push(channel_id);
      query += ` AND o.sales_channel_id = $${params.length}`;
    }
    if (date) {
      params.push(date);
      query += ` AND (o.delivery_date = $${params.length} OR o.order_date = $${params.length})`;
    }
    if (start_date && end_date) {
      params.push(start_date, end_date);
      query += ` AND o.delivery_date BETWEEN $${params.length - 1} AND $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (o.order_number ILIKE $${params.length} OR o.order_no ILIKE $${params.length} OR o.customer_name ILIKE $${params.length} OR o.customer_company ILIKE $${params.length})`;
    }

    query += ` GROUP BY o.id, sc.color_hex ORDER BY o.delivery_date DESC, o.created_at DESC`;
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching orders:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/orders/stats - Orders metrics strip
router.get("/api/orders/stats", async (req, res) => {
  try {
    const query = `
      SELECT 
        COUNT(*) AS total_orders,
        COUNT(*) FILTER (WHERE fulfillment_status = 'submitted' OR status = 'submitted') AS submitted_count,
        COUNT(*) FILTER (WHERE fulfillment_status = 'in_packing') AS in_packing_count,
        COUNT(*) FILTER (WHERE fulfillment_status = 'packed') AS packed_count,
        COUNT(*) FILTER (WHERE fulfillment_status = 'fulfilled' OR status = 'fulfilled') AS fulfilled_count,
        COALESCE(SUM(total_amount), 0) AS total_revenue,
        COALESCE(AVG(total_amount), 0) AS avg_order_value,
        COUNT(*) FILTER (WHERE delivery_date = CURRENT_DATE) AS today_deliveries_count
      FROM vivas_orders
      WHERE fulfillment_status != 'cancelled'
    `;
    const result = await pool.query(query);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Error fetching order stats:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/orders/:id - Single order details
router.get("/api/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const orderRes = await pool.query(`
      SELECT o.*, sc.name AS channel_name, sc.color_hex AS channel_color
      FROM vivas_orders o
      LEFT JOIN vivas_sales_channels sc ON sc.id = o.sales_channel_id
      WHERE o.id = $1
    `, [id]);

    if (orderRes.rowCount === 0) return res.status(404).json({ success: false, message: "Order not found" });

    const itemsRes = await pool.query(`SELECT * FROM vivas_order_items WHERE order_id = $1 ORDER BY crop_name ASC`, [id]);
    const order = orderRes.rows[0];
    order.items = itemsRes.rows;

    res.json({ success: true, data: order });
  } catch (err) {
    console.error("Error fetching order details:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/orders - Create new order with items
router.post("/api/orders", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const {
      customer_id, customer_name, customer_company, customer_email, customer_phone,
      sales_channel_id, sales_channel_name, order_date, delivery_date, fulfillment_type,
      fulfillment_status, payment_status, payment_method, subtotal, delivery_fee,
      tax_amount, discount_amount, total_amount, packing_notes, invoice_notes, items
    } = req.body;

    // Generate unique order number
    const countRes = await client.query("SELECT COUNT(*) FROM vivas_orders");
    const orderSeq = (parseInt(countRes.rows[0].count) || 0) + 101;
    const order_number = `ORD-${new Date().getFullYear()}-${String(orderSeq).padStart(3, '0')}`;

    const orderQuery = `
      INSERT INTO vivas_orders (
        order_no, order_number, customer_id, customer_name, customer_company,
        customer_email, customer_phone, sales_channel_id, sales_channel_name,
        order_date, delivery_date, fulfillment_type, fulfillment_status, status,
        payment_status, payment_method, subtotal, delivery_fee, tax_amount,
        discount_amount, total_amount, amount, packing_notes, invoice_notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING *
    `;
    const orderValues = [
      order_number, order_number, customer_id || null, customer_name || 'Customer', customer_company || '',
      customer_email || '', customer_phone || '', sales_channel_id || null, sales_channel_name || '',
      order_date || new Date().toISOString().slice(0, 10),
      delivery_date || new Date().toISOString().slice(0, 10),
      fulfillment_type || 'Delivery', fulfillment_status || 'submitted', fulfillment_status || 'submitted',
      payment_status || 'unpaid', payment_method || 'Invoice / Net 30',
      subtotal || 0, delivery_fee || 0, tax_amount || 0, discount_amount || 0,
      total_amount || 0, total_amount || 0, packing_notes || '', invoice_notes || ''
    ];

    const orderResult = await client.query(orderQuery, orderValues);
    const createdOrder = orderResult.rows[0];

    // Insert line items
    if (Array.isArray(items) && items.length > 0) {
      for (const it of items) {
        const itemQuery = `
          INSERT INTO vivas_order_items (
            order_id, crop_id, crop_name, variety_name, item_description,
            packaging_unit, unit_price, quantity_ordered, quantity_packed, total_price, is_packed
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `;
        await client.query(itemQuery, [
          createdOrder.id, it.crop_id || null, it.crop_name || 'Produce Item',
          it.variety_name || 'Standard', it.item_description || '',
          it.packaging_unit || 'kg', it.unit_price || 0, it.quantity_ordered || 1,
          it.quantity_packed || 0, (it.quantity_ordered || 1) * (it.unit_price || 0),
          it.is_packed || false
        ]);
      }
    }

    await client.query("COMMIT");
    res.status(201).json({ success: true, data: createdOrder, message: "Order created successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating order:", err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/orders/:id - Update order and line items
router.put("/api/orders/:id", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { id } = req.params;
    const {
      customer_id, customer_name, customer_company, customer_email, customer_phone,
      sales_channel_id, sales_channel_name, delivery_date, fulfillment_type,
      fulfillment_status, payment_status, payment_method, subtotal, delivery_fee,
      tax_amount, discount_amount, total_amount, packing_notes, invoice_notes, items
    } = req.body;

    const updateQuery = `
      UPDATE vivas_orders SET
        customer_id = COALESCE($1, customer_id),
        customer_name = COALESCE($2, customer_name),
        customer_company = COALESCE($3, customer_company),
        customer_email = COALESCE($4, customer_email),
        customer_phone = COALESCE($5, customer_phone),
        sales_channel_id = COALESCE($6, sales_channel_id),
        sales_channel_name = COALESCE($7, sales_channel_name),
        delivery_date = COALESCE($8, delivery_date),
        fulfillment_type = COALESCE($9, fulfillment_type),
        fulfillment_status = COALESCE($10, fulfillment_status),
        status = COALESCE($10, status),
        payment_status = COALESCE($11, payment_status),
        payment_method = COALESCE($12, payment_method),
        subtotal = COALESCE($13, subtotal),
        delivery_fee = COALESCE($14, delivery_fee),
        tax_amount = COALESCE($15, tax_amount),
        discount_amount = COALESCE($16, discount_amount),
        total_amount = COALESCE($17, total_amount),
        amount = COALESCE($17, amount),
        packing_notes = COALESCE($18, packing_notes),
        invoice_notes = COALESCE($19, invoice_notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $20
      RETURNING *
    `;
    const values = [
      customer_id, customer_name, customer_company, customer_email, customer_phone,
      sales_channel_id, sales_channel_name, delivery_date, fulfillment_type,
      fulfillment_status, payment_status, payment_method, subtotal, delivery_fee,
      tax_amount, discount_amount, total_amount, packing_notes, invoice_notes, id
    ];

    const result = await client.query(updateQuery, values);
    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    // If items provided, replace items
    if (Array.isArray(items)) {
      await client.query("DELETE FROM vivas_order_items WHERE order_id = $1", [id]);
      for (const it of items) {
        const itemQuery = `
          INSERT INTO vivas_order_items (
            order_id, crop_id, crop_name, variety_name, item_description,
            packaging_unit, unit_price, quantity_ordered, quantity_packed, total_price, is_packed
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `;
        await client.query(itemQuery, [
          id, it.crop_id || null, it.crop_name, it.variety_name || 'Standard',
          it.item_description || '', it.packaging_unit || 'kg', it.unit_price || 0,
          it.quantity_ordered || 1, it.quantity_packed || 0,
          (it.quantity_ordered || 1) * (it.unit_price || 0), it.is_packed || false
        ]);
      }
    }

    await client.query("COMMIT");
    res.json({ success: true, data: result.rows[0], message: "Order updated successfully" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error updating order:", err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// PATCH /api/orders/:id/status - Quick status update
router.patch("/api/orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { fulfillment_status, payment_status } = req.body;

    const query = `
      UPDATE vivas_orders SET
        fulfillment_status = COALESCE($1, fulfillment_status),
        status = COALESCE($1, status),
        payment_status = COALESCE($2, payment_status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [fulfillment_status, payment_status, id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Order not found" });
    res.json({ success: true, data: result.rows[0], message: "Order status updated" });
  } catch (err) {
    console.error("Error updating order status:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/orders/:id - Delete order
router.delete("/api/orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM vivas_orders WHERE id = $1 RETURNING id", [id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Order not found" });
    res.json({ success: true, message: "Order deleted successfully" });
  } catch (err) {
    console.error("Error deleting order:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 11. SELL MODULE: PACK MANAGER ENDPOINTS
// ==========================================

// GET /api/pack-manager/summary - Consolidated packing list by date and channel
router.get("/api/pack-manager/summary", async (req, res) => {
  try {
    const { date, channel_id } = req.query;
    const targetDate = date || new Date().toISOString().slice(0, 10);

    // 1. Fetch Orders for this pack date
    let ordersQuery = `
      SELECT o.*,
        sc.name AS channel_name, sc.color_hex AS channel_color,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'crop_name', oi.crop_name,
              'variety_name', oi.variety_name,
              'item_description', oi.item_description,
              'packaging_unit', oi.packaging_unit,
              'unit_price', oi.unit_price,
              'quantity_ordered', oi.quantity_ordered,
              'quantity_packed', oi.quantity_packed,
              'total_price', oi.total_price,
              'is_packed', oi.is_packed
            )
          ) FILTER (WHERE oi.id IS NOT NULL), '[]'::json
        ) AS items
      FROM vivas_orders o
      LEFT JOIN vivas_order_items oi ON oi.order_id = o.id
      LEFT JOIN vivas_sales_channels sc ON sc.id = o.sales_channel_id
      WHERE o.delivery_date = $1 AND o.fulfillment_status != 'cancelled'
    `;
    const orderParams = [targetDate];

    if (channel_id && channel_id !== 'All') {
      orderParams.push(channel_id);
      ordersQuery += ` AND o.sales_channel_id = $${orderParams.length}`;
    }

    ordersQuery += ` GROUP BY o.id, sc.name, sc.color_hex ORDER BY o.fulfillment_status ASC, o.order_number ASC`;
    const ordersRes = await pool.query(ordersQuery, orderParams);

    // 2. Fetch Consolidated Crop/Product Allocation Aggregates
    let allocQuery = `
      SELECT 
        oi.crop_name,
        oi.variety_name,
        oi.packaging_unit,
        SUM(oi.quantity_ordered) AS total_ordered,
        SUM(oi.quantity_packed) AS total_packed,
        COUNT(DISTINCT o.id) AS order_count,
        COALESCE(
          json_agg(
            json_build_object(
              'order_id', o.id,
              'order_number', o.order_number,
              'customer_name', o.customer_name,
              'channel_name', o.sales_channel_name,
              'quantity_ordered', oi.quantity_ordered,
              'quantity_packed', oi.quantity_packed,
              'is_packed', oi.is_packed
            )
          ), '[]'::json
        ) AS orders_breakdown
      FROM vivas_order_items oi
      JOIN vivas_orders o ON o.id = oi.order_id
      WHERE o.delivery_date = $1 AND o.fulfillment_status != 'cancelled'
    `;
    const allocParams = [targetDate];

    if (channel_id && channel_id !== 'All') {
      allocParams.push(channel_id);
      allocQuery += ` AND o.sales_channel_id = $${allocParams.length}`;
    }

    allocQuery += ` GROUP BY oi.crop_name, oi.variety_name, oi.packaging_unit ORDER BY oi.crop_name ASC`;
    const allocRes = await pool.query(allocQuery, allocParams);

    res.json({
      success: true,
      data: {
        date: targetDate,
        orders: ordersRes.rows,
        crop_allocations: allocRes.rows,
        total_orders_to_pack: ordersRes.rows.length,
        packed_orders_count: ordersRes.rows.filter(o => o.fulfillment_status === 'packed' || o.fulfillment_status === 'fulfilled').length
      }
    });
  } catch (err) {
    console.error("Error fetching pack manager summary:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/pack-manager/order-item/:id/pack - Toggle item pack status
router.patch("/api/pack-manager/order-item/:id/pack", async (req, res) => {
  try {
    const { id } = req.params;
    const { is_packed, quantity_packed } = req.body;

    const query = `
      UPDATE vivas_order_items SET
        is_packed = COALESCE($1, is_packed),
        quantity_packed = CASE WHEN $1 = TRUE THEN quantity_ordered ELSE COALESCE($2, quantity_packed) END
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [is_packed, quantity_packed, id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Item not found" });

    const item = result.rows[0];

    // Check if all items in the order are now packed
    const checkRes = await pool.query(`
      SELECT 
        COUNT(*) AS total_items,
        COUNT(*) FILTER (WHERE is_packed = TRUE) AS packed_items
      FROM vivas_order_items
      WHERE order_id = $1
    `, [item.order_id]);

    const { total_items, packed_items } = checkRes.rows[0];
    let newStatus = 'in_packing';
    if (parseInt(packed_items) === parseInt(total_items)) {
      newStatus = 'packed';
    } else if (parseInt(packed_items) === 0) {
      newStatus = 'submitted';
    }

    await pool.query("UPDATE vivas_orders SET fulfillment_status = $1, status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [newStatus, item.order_id]);

    res.json({ success: true, data: item, order_status: newStatus, message: "Pack item updated" });
  } catch (err) {
    console.error("Error updating pack item:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/pack-manager/mark-order-packed/:orderId - Mark entire order as packed
router.post("/api/pack-manager/mark-order-packed/:orderId", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { orderId } = req.params;

    // Mark all line items packed
    await client.query(`
      UPDATE vivas_order_items SET
        is_packed = TRUE,
        quantity_packed = quantity_ordered
      WHERE order_id = $1
    `, [orderId]);

    // Update parent order
    const orderRes = await client.query(`
      UPDATE vivas_orders SET
        fulfillment_status = 'packed',
        status = 'packed',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [orderId]);

    if (orderRes.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    await client.query("COMMIT");
    res.json({ success: true, data: orderRes.rows[0], message: "Order marked as completely packed" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error marking order packed:", err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});


export default router;
