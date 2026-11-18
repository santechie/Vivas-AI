import { emitDomainEvent } from "../services/eventBus.js";
import express from "express";
import pool from "../config/db.js";
import { validateBody } from "../utils/validate.js";
import { handleRouteError } from "../utils/response.js";

const router = express.Router();

// 🛒 BUY & PROCUREMENT MODULE APIS
// ==========================================

// 1. GET /shopping-list/stats (Shopping List Metrics)
router.get("/shopping-list/stats", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_items,
        COALESCE(SUM(total_estimated_cost), 0) as total_estimated_cost,
        COUNT(CASE WHEN priority IN ('High', 'Urgent') THEN 1 END) as high_priority_count,
        COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN category = 'Seeds & Starts' THEN 1 END) as seeds_count,
        COUNT(CASE WHEN category = 'Fertilizers & Amendments' THEN 1 END) as fertilizers_count
      FROM vivas_shopping_list
      WHERE status != 'Dismissed'
    `);

    const r = result.rows[0];
    res.json({
      success: true,
      data: {
        total_items: parseInt(r.total_items || 0, 10),
        total_estimated_cost: parseFloat(r.total_estimated_cost || 0),
        high_priority_count: parseInt(r.high_priority_count || 0, 10),
        pending_count: parseInt(r.pending_count || 0, 10),
        seeds_count: parseInt(r.seeds_count || 0, 10),
        fertilizers_count: parseInt(r.fertilizers_count || 0, 10)
      }
    });
  } catch (err) {
    console.error("Error fetching shopping list stats:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. GET /shopping-list (Fetch Smart Shopping List)
router.get("/shopping-list", async (req, res) => {
  try {
    const { category, priority, status, vendor_id, search } = req.query;

    let query = `
      SELECT 
        s.*,
        v.name as vendor_company_name,
        v.email as vendor_email,
        v.phone as vendor_phone
      FROM vivas_shopping_list s
      LEFT JOIN vivas_vendors v ON s.vendor_id = v.id
      WHERE 1=1
    `;
    const params = [];

    if (category && category !== 'All') {
      params.push(category);
      query += ` AND s.category = $${params.length}`;
    }
    if (priority && priority !== 'All') {
      params.push(priority);
      query += ` AND s.priority = $${params.length}`;
    }
    if (status && status !== 'All') {
      params.push(status);
      query += ` AND s.status = $${params.length}`;
    }
    if (vendor_id && vendor_id !== 'All') {
      params.push(vendor_id);
      query += ` AND s.vendor_id = $${params.length}`;
    }
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (s.item_name ILIKE $${params.length} OR s.item_code ILIKE $${params.length} OR s.notes ILIKE $${params.length} OR s.vendor_name ILIKE $${params.length})`;
    }

    query += ` ORDER BY CASE WHEN s.priority = 'Urgent' THEN 1 WHEN s.priority = 'High' THEN 2 WHEN s.priority = 'Medium' THEN 3 ELSE 4 END, s.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error("Error fetching shopping list:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. POST /shopping-list (Create Shopping List Item)
router.post("/shopping-list", async (req, res) => {
  try {
    const {
      item_name, category, quantity_needed, unit_of_measure, estimated_unit_cost,
      priority, vendor_id, vendor_name, source_type, source_reference, storage_location, notes
    } = req.body;

    if (!item_name) {
      return res.status(400).json({ success: false, message: "item_name is required" });
    }

    const item_code = `SHOP-${Date.now().toString().slice(-6)}`;

    const insertQuery = `
      INSERT INTO vivas_shopping_list (
        item_code, item_name, category, quantity_needed, unit_of_measure, estimated_unit_cost,
        priority, vendor_id, vendor_name, source_type, source_reference, storage_location, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [
      item_code,
      item_name,
      category || 'Seeds & Starts',
      parseFloat(quantity_needed) || 1.0,
      unit_of_measure || 'kg',
      parseFloat(estimated_unit_cost) || 0.0,
      priority || 'Medium',
      vendor_id || null,
      vendor_name || null,
      source_type || 'Manual Requirement',
      source_reference || null,
      storage_location || 'Main Barn Storage',
      notes || null
    ]);

    res.status(201).json({ success: true, message: "Item added to shopping list", data: result.rows[0] });
  } catch (err) {
    console.error("Error adding shopping list item:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. PUT /shopping-list/:id (Update Shopping List Item & 360 Detail Edit)
router.put("/shopping-list/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      item_name, category, quantity_needed, unit_of_measure, estimated_unit_cost,
      priority, vendor_id, vendor_name, source_type, source_reference, storage_location, status, notes
    } = req.body;

    const updateQuery = `
      UPDATE vivas_shopping_list SET
        item_name = COALESCE($1, item_name),
        category = COALESCE($2, category),
        quantity_needed = COALESCE($3, quantity_needed),
        unit_of_measure = COALESCE($4, unit_of_measure),
        estimated_unit_cost = COALESCE($5, estimated_unit_cost),
        priority = COALESCE($6, priority),
        vendor_id = $7,
        vendor_name = COALESCE($8, vendor_name),
        source_type = COALESCE($9, source_type),
        source_reference = COALESCE($10, source_reference),
        storage_location = COALESCE($11, storage_location),
        status = COALESCE($12, status),
        notes = COALESCE($13, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      item_name, category, quantity_needed ? parseFloat(quantity_needed) : null, unit_of_measure,
      estimated_unit_cost !== undefined ? parseFloat(estimated_unit_cost) : null, priority,
      vendor_id || null, vendor_name, source_type, source_reference, storage_location, status, notes, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Shopping list item not found" });
    }

    res.json({ success: true, message: "Shopping list item updated", data: result.rows[0] });
  } catch (err) {
    console.error("Error updating shopping list item:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. DELETE /shopping-list/:id (Delete Shopping Item)
router.delete("/shopping-list/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM vivas_shopping_list WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }
    res.json({ success: true, message: "Shopping list item deleted" });
  } catch (err) {
    console.error("Error deleting shopping item:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. POST /shopping-list/convert-to-po (Convert Selected Shopping Items to PO)
router.post("/shopping-list/convert-to-po", async (req, res) => {
  try {
    const shopping_item_ids = req.body.shopping_item_ids || req.body.item_ids;
    const { vendor_id, vendor_name, notes } = req.body;
    if (!Array.isArray(shopping_item_ids) || shopping_item_ids.length === 0) {
      return res.status(400).json({ success: false, message: "shopping_item_ids or item_ids array is required" });
    }

    // Fetch shopping items
    const itemsRes = await pool.query("SELECT * FROM vivas_shopping_list WHERE id = ANY($1)", [shopping_item_ids]);
    if (itemsRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "No matching shopping items found" });
    }

    // Determine vendor
    let targetVendorId = vendor_id || itemsRes.rows[0].vendor_id;
    let targetVendorName = vendor_name || itemsRes.rows[0].vendor_name || 'Agro Inputs Supplier';

    if (targetVendorId) {
      const vRes = await pool.query("SELECT name, email, phone FROM vivas_vendors WHERE id = $1", [targetVendorId]);
      if (vRes.rows.length > 0) {
        targetVendorName = vRes.rows[0].name;
      }
    }

    const po_code = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    let subtotal = 0;

    itemsRes.rows.forEach(item => {
      subtotal += parseFloat(item.total_estimated_cost || 0);
    });

    const tax_amount = subtotal * 0.05;
    const shipping_cost = 250;
    const total_amount = subtotal + tax_amount + shipping_cost;

    // Create Purchase Order
    const poRes = await pool.query(`
      INSERT INTO vivas_purchase_orders (
        po_code, vendor_id, vendor_name, order_date, expected_delivery_date, status, payment_terms, subtotal, tax_amount, shipping_cost, total_amount, notes
      ) VALUES ($1, $2, $3, CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 'Ordered', 'Net 30', $4, $5, $6, $7, $8)
      RETURNING *
    `, [po_code, targetVendorId || null, targetVendorName, subtotal, tax_amount, shipping_cost, total_amount, notes || 'Generated from Smart Shopping List']);

    const newPO = poRes.rows[0];

    // Insert PO Line Items
    for (const item of itemsRes.rows) {
      await pool.query(`
        INSERT INTO vivas_purchase_order_items (
          po_id, item_name, category, quantity_ordered, unit_of_measure, unit_cost, linked_shopping_item_id, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [newPO.id, item.item_name, item.category, item.quantity_needed, item.unit_of_measure, item.estimated_unit_cost, item.id, item.notes]);

      // Update shopping item status
      await pool.query("UPDATE vivas_shopping_list SET status = 'Converted to PO' WHERE id = $1", [item.id]);
    }

    res.status(201).json({ success: true, message: `Successfully created ${po_code}`, po: newPO });
  } catch (err) {
    console.error("Error converting shopping items to PO:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. GET /purchase-orders/stats (PO Metrics)
router.get("/purchase-orders/stats", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_spend,
        COUNT(CASE WHEN status = 'Ordered' THEN 1 END) as pending_delivery_count,
        COUNT(CASE WHEN status = 'Received' THEN 1 END) as received_count,
        COUNT(CASE WHEN status = 'Draft' THEN 1 END) as draft_count
      FROM vivas_purchase_orders
    `);

    const r = result.rows[0];
    res.json({
      success: true,
      data: {
        total_orders: parseInt(r.total_orders || 0, 10),
        total_spend: parseFloat(r.total_spend || 0),
        pending_delivery_count: parseInt(r.pending_delivery_count || 0, 10),
        received_count: parseInt(r.received_count || 0, 10),
        draft_count: parseInt(r.draft_count || 0, 10)
      }
    });
  } catch (err) {
    console.error("Error fetching PO stats:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. GET /purchase-orders (List Purchase Orders)
router.get("/purchase-orders", async (req, res) => {
  try {
    const { status, vendor_id, search } = req.query;

    let query = `
      SELECT 
        po.*,
        v.email as vendor_email_info,
        v.phone as vendor_phone_info,
        (SELECT COUNT(*) FROM vivas_purchase_order_items poi WHERE poi.po_id = po.id) as line_items_count
      FROM vivas_purchase_orders po
      LEFT JOIN vivas_vendors v ON po.vendor_id = v.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'All') {
      params.push(status);
      query += ` AND po.status = $${params.length}`;
    }
    if (vendor_id && vendor_id !== 'All') {
      params.push(vendor_id);
      query += ` AND po.vendor_id = $${params.length}`;
    }
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      query += ` AND (po.po_code ILIKE $${params.length} OR po.vendor_name ILIKE $${params.length} OR po.notes ILIKE $${params.length})`;
    }

    query += ` ORDER BY po.created_at DESC`;

    const result = await pool.query(query, params);
    res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (err) {
    console.error("Error fetching purchase orders:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. GET /purchase-orders/:id (PO 360 Detail View)
router.get("/purchase-orders/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const poRes = await pool.query(`
      SELECT po.*, v.email as vendor_email, v.phone as vendor_phone, v.street_address as vendor_address
      FROM vivas_purchase_orders po
      LEFT JOIN vivas_vendors v ON po.vendor_id = v.id
      WHERE po.id = $1
    `, [id]);

    if (poRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Purchase Order not found" });
    }

    const itemsRes = await pool.query("SELECT * FROM vivas_purchase_order_items WHERE po_id = $1 ORDER BY id ASC", [id]);

    res.json({
      success: true,
      data: {
        po: poRes.rows[0],
        line_items: itemsRes.rows
      }
    });
  } catch (err) {
    console.error("Error fetching PO details:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. POST /purchase-orders (Create PO with Line Items)
router.post("/purchase-orders", async (req, res) => {
  try {
    let {
      vendor_id, vendor_name, vendor_email, vendor_phone, order_date, expected_delivery_date,
      payment_terms, shipping_cost, tax_amount, notes, line_items, items
    } = req.body;

    const finalItems = Array.isArray(line_items) ? line_items : (Array.isArray(items) ? items : []);

    if (vendor_id && !vendor_name) {
      const vRes = await pool.query("SELECT name, email, phone FROM vivas_vendors WHERE id = $1", [vendor_id]);
      if (vRes.rows.length > 0) {
        vendor_name = vRes.rows[0].name;
        vendor_email = vendor_email || vRes.rows[0].email;
        vendor_phone = vendor_phone || vRes.rows[0].phone;
      }
    }

    if (!vendor_name) {
      vendor_name = 'Agro Supplier / Vendor';
    }

    const po_code = `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    let subtotal = 0;
    finalItems.forEach(it => {
      const qty = parseFloat(it.quantity_ordered || it.quantity || 1);
      const cost = parseFloat(it.unit_cost || it.unit_price || 0);
      subtotal += qty * cost;
    });

    const tax = tax_amount !== undefined ? parseFloat(tax_amount) : subtotal * 0.05;
    const shipping = shipping_cost !== undefined ? parseFloat(shipping_cost) : 0;
    const total_amount = subtotal + tax + shipping;

    const poRes = await pool.query(`
      INSERT INTO vivas_purchase_orders (
        po_code, vendor_id, vendor_name, vendor_email, vendor_phone, order_date, expected_delivery_date,
        status, payment_terms, subtotal, tax_amount, shipping_cost, total_amount, notes
      ) VALUES ($1, $2, $3, $4, $5, COALESCE($6, CURRENT_DATE), $7, 'Ordered', $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      po_code, vendor_id || null, vendor_name, vendor_email || null, vendor_phone || null,
      order_date || null, expected_delivery_date || null, payment_terms || 'Net 30',
      subtotal, tax, shipping, total_amount, notes || null
    ]);

    const newPO = poRes.rows[0];

    for (const item of finalItems) {
      await pool.query(`
        INSERT INTO vivas_purchase_order_items (
          po_id, item_name, category, quantity_ordered, unit_of_measure, unit_cost, notes, linked_material_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        newPO.id, item.item_name || 'General Item', item.category || 'General',
        parseFloat(item.quantity_ordered || item.quantity || 1.0),
        item.unit_of_measure || item.unit || 'units',
        parseFloat(item.unit_cost || item.unit_price || 0.0),
        item.notes || null,
        item.linked_material_id || null
      ]);
    }

    res.status(201).json({ success: true, message: "Purchase Order created", data: newPO });
  } catch (err) {
    console.error("Error creating PO:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. PUT /purchase-orders/:id (Update PO & 360 Detail Edit)
router.put("/purchase-orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      vendor_name, status, payment_terms, payment_status, expected_delivery_date,
      subtotal, tax_amount, shipping_cost, notes
    } = req.body;

    let total = undefined;
    if (subtotal !== undefined || tax_amount !== undefined || shipping_cost !== undefined) {
      const sub = parseFloat(subtotal || 0);
      const tax = parseFloat(tax_amount || 0);
      const ship = parseFloat(shipping_cost || 0);
      total = sub + tax + ship;
    }

    const updateQuery = `
      UPDATE vivas_purchase_orders SET
        vendor_name = COALESCE($1, vendor_name),
        status = COALESCE($2, status),
        payment_terms = COALESCE($3, payment_terms),
        payment_status = COALESCE($4, payment_status),
        expected_delivery_date = COALESCE($5, expected_delivery_date),
        subtotal = COALESCE($6, subtotal),
        tax_amount = COALESCE($7, tax_amount),
        shipping_cost = COALESCE($8, shipping_cost),
        total_amount = COALESCE($9, total_amount),
        notes = COALESCE($10, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `;

    const result = await pool.query(updateQuery, [
      vendor_name, status, payment_terms, payment_status, expected_delivery_date,
      subtotal ? parseFloat(subtotal) : null, tax_amount ? parseFloat(tax_amount) : null,
      shipping_cost ? parseFloat(shipping_cost) : null, total ? parseFloat(total) : null,
      notes, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Purchase Order not found" });
    }

    res.json({ success: true, message: "Purchase Order updated", data: result.rows[0] });
  } catch (err) {
    console.error("Error updating PO:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12. PUT /purchase-orders/:id/receive (Receive PO -> Auto Expense & Inventory Stock Update)
router.put("/purchase-orders/:id/receive", async (req, res) => {
  try {
    const { id } = req.params;

    const poRes = await pool.query("SELECT * FROM vivas_purchase_orders WHERE id = $1", [id]);
    if (poRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "PO not found" });
    }

    const po = poRes.rows[0];

    // Update PO status to Received
    const updatedPO = await pool.query(`
      UPDATE vivas_purchase_orders SET
        status = 'Received',
        received_date = CURRENT_DATE,
        payment_status = 'Paid',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [id]);

    // Update items received quantity
    await pool.query("UPDATE vivas_purchase_order_items SET quantity_received = quantity_ordered WHERE po_id = $1", [id]);

    // Auto-create Operating Expense Transaction in vivas_financial_transactions
    const txnCode = `TXN-EXP-${Date.now().toString().slice(-6)}`;
    await pool.query(`
      INSERT INTO vivas_financial_transactions (
        transaction_code, transaction_date, type, category_name, description, amount, payment_method, party_name, party_type, invoice_receipt_ref, payment_status, notes
      ) VALUES ($1, CURRENT_DATE, 'Expense', 'Cost of Goods Sold', $2, $3, 'Bank Transfer', $4, 'Vendor', $5, 'Completed', $6)
    `, [
      txnCode,
      `Received Purchase Order ${po.po_code} from ${po.vendor_name}`,
      po.total_amount,
      po.vendor_name,
      po.po_code,
      `Auto-generated expense from PO fulfillment ${po.po_code}`
    ]);

    await emitDomainEvent("PO.received", "vivas_purchase_orders", id, { po_id: id, po_code: po.po_code, total_amount: po.total_amount, vendor_name: po.vendor_name });
    res.json({ success: true, message: `PO ${po.po_code} received. Inventory & financial expense updated.`, po: updatedPO.rows[0] });
  } catch (err) {
    console.error("Error receiving PO:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. DELETE /purchase-orders/:id (Delete PO)
router.delete("/purchase-orders/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM vivas_purchase_orders WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Purchase Order not found" });
    }
    res.json({ success: true, message: "Purchase Order deleted" });
  } catch (err) {
    console.error("Error deleting PO:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Start Server









export default router;
