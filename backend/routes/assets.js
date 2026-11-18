import express from "express";
import pool from "../config/db.js";
import { validateBody } from "../utils/validate.js";
import { handleRouteError } from "../utils/response.js";

const router = express.Router();

// ==========================================
// 8. ASSETS MODULE: CONTAINERS API
// ==========================================

// Get all containers with filters
router.get("/api/containers", async (req, res) => {
  try {
    const { type, material, brand, serialized, search } = req.query;
    let query = "SELECT * FROM vivas_containers WHERE 1=1";
    const params = [];

    if (type && type !== "All") {
      params.push(`%"${type}"%`);
      query += ` AND types::text LIKE $${params.length}`;
    }
    if (material && material !== "All") {
      params.push(material);
      query += ` AND material = $${params.length}`;
    }
    if (brand && brand !== "All") {
      params.push(brand);
      query += ` AND brand = $${params.length}`;
    }
    if (serialized && serialized !== "All") {
      params.push(serialized === "true");
      query += ` AND is_serialized = $${params.length}`;
    }
    if (search && search.trim() !== "") {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(abbreviation) LIKE $${params.length} OR LOWER(barcode) LIKE $${params.length} OR LOWER(storage_location) LIKE $${params.length})`;
    }

    query += " ORDER BY created_at DESC";
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching containers:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get container summary stats
router.get("/api/containers/stats", async (req, res) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*) as total_containers,
        COALESCE(SUM(total_count), 0) as total_units_in_stock,
        COUNT(CASE WHEN types::text LIKE '%"Grow"%' THEN 1 END) as grow_containers,
        COUNT(CASE WHEN types::text LIKE '%"Harvest & Handling"%' THEN 1 END) as harvest_containers,
        COUNT(CASE WHEN types::text LIKE '%"Storage"%' THEN 1 END) as storage_containers,
        COALESCE(SUM(total_count * COALESCE(total_cells, 1)), 0) as total_cell_capacity
      FROM vivas_containers
      WHERE status = 'active'
    `;
    const result = await pool.query(statsQuery);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Error fetching container stats:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single container by ID
router.get("/api/containers/:id", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM vivas_containers WHERE id = $1", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Container not found" });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Error fetching container detail:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create new container
router.post("/api/containers", async (req, res) => {
  try {
    const {
      name, abbreviation, types, material, brand, color, total_count,
      is_serialized, barcode, storage_location, shape, top_diameter_cm,
      bottom_diameter_cm, height_cm, volume_liters, total_cells,
      cell_configuration, cell_shape, notes
    } = req.body;

    const generatedBarcode = barcode || `CONT-${Date.now().toString().slice(-6)}`;

    const result = await pool.query(
      `INSERT INTO vivas_containers (
        name, abbreviation, types, material, brand, color, total_count,
        is_serialized, barcode, storage_location, shape, top_diameter_cm,
        bottom_diameter_cm, height_cm, volume_liters, total_cells,
        cell_configuration, cell_shape, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        name, abbreviation || name.slice(0, 8).toUpperCase(),
        JSON.stringify(types || ["Grow"]),
        material || "Heavy-Duty Polypropylene",
        brand || "Bootstrap Farmer",
        color || "Black",
        parseInt(total_count) || 1,
        Boolean(is_serialized),
        generatedBarcode,
        storage_location || "Main Storage",
        shape || "Flat Tray",
        parseFloat(top_diameter_cm) || 0,
        parseFloat(bottom_diameter_cm) || 0,
        parseFloat(height_cm) || 0,
        parseFloat(volume_liters) || 0,
        parseInt(total_cells) || 1,
        cell_configuration || "Single",
        cell_shape || "Square",
        notes || ""
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: "Container created successfully" });
  } catch (err) {
    console.error("Error creating container:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update container
router.put("/api/containers/:id", async (req, res) => {
  try {
    const {
      name, abbreviation, types, material, brand, color, total_count,
      is_serialized, barcode, storage_location, shape, top_diameter_cm,
      bottom_diameter_cm, height_cm, volume_liters, total_cells,
      cell_configuration, cell_shape, status, notes
    } = req.body;

    const result = await pool.query(
      `UPDATE vivas_containers SET
        name = $1, abbreviation = $2, types = $3, material = $4, brand = $5,
        color = $6, total_count = $7, is_serialized = $8, barcode = $9,
        storage_location = $10, shape = $11, top_diameter_cm = $12,
        bottom_diameter_cm = $13, height_cm = $14, volume_liters = $15,
        total_cells = $16, cell_configuration = $17, cell_shape = $18,
        status = $19, notes = $20, updated_at = CURRENT_TIMESTAMP
      WHERE id = $21
      RETURNING *`,
      [
        name, abbreviation,
        JSON.stringify(types || ["Grow"]),
        material, brand, color,
        parseInt(total_count) || 1,
        Boolean(is_serialized),
        barcode, storage_location, shape,
        parseFloat(top_diameter_cm) || 0,
        parseFloat(bottom_diameter_cm) || 0,
        parseFloat(height_cm) || 0,
        parseFloat(volume_liters) || 0,
        parseInt(total_cells) || 1,
        cell_configuration, cell_shape,
        status || "active",
        notes, req.params.id
      ]
    );

    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Container not found" });
    res.json({ success: true, data: result.rows[0], message: "Container updated successfully" });
  } catch (err) {
    console.error("Error updating container:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete container
router.delete("/api/containers/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM vivas_containers WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Container not found" });
    res.json({ success: true, message: "Container deleted successfully" });
  } catch (err) {
    console.error("Error deleting container:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 9. ASSETS MODULE: EQUIPMENT & TOOLS API
// ==========================================

// Get all equipment with filters & maintenance stats
router.get("/api/equipment", async (req, res) => {
  try {
    const { category, status, search } = req.query;
    let query = `
      SELECT e.*,
        (SELECT COUNT(*) FROM vivas_equipment_maintenance m WHERE m.equipment_id = e.id) as service_count
      FROM vivas_equipment e
      WHERE 1=1
    `;
    const params = [];

    if (category && category !== "All") {
      params.push(category);
      query += ` AND e.category = $${params.length}`;
    }
    if (status && status !== "All") {
      params.push(status);
      query += ` AND e.current_status = $${params.length}`;
    }
    if (search && search.trim() !== "") {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(e.name) LIKE $${params.length} OR LOWER(e.brand) LIKE $${params.length} OR LOWER(e.serial_number) LIKE $${params.length} OR LOWER(e.asset_tag) LIKE $${params.length} OR LOWER(e.assigned_crew) LIKE $${params.length})`;
    }

    query += " ORDER BY e.created_at DESC";
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching equipment:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get equipment summary stats
router.get("/api/equipment/stats", async (req, res) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*) as total_equipment,
        COUNT(CASE WHEN current_status = 'active' OR current_status = 'in_use' THEN 1 END) as active_count,
        COUNT(CASE WHEN current_status = 'maintenance' THEN 1 END) as in_maintenance_count,
        COUNT(CASE WHEN next_service_date <= (CURRENT_DATE + INTERVAL '30 days') THEN 1 END) as service_due_soon,
        COALESCE(SUM(purchase_price), 0) as total_fleet_value,
        COALESCE(SUM(operating_hours), 0) as total_operating_hours
      FROM vivas_equipment
    `;
    const result = await pool.query(statsQuery);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Error fetching equipment stats:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single equipment details with maintenance logs
router.get("/api/equipment/:id", async (req, res) => {
  try {
    const eqResult = await pool.query("SELECT * FROM vivas_equipment WHERE id = $1", [req.params.id]);
    if (eqResult.rowCount === 0) return res.status(404).json({ success: false, message: "Equipment not found" });

    const maintResult = await pool.query(
      "SELECT * FROM vivas_equipment_maintenance WHERE equipment_id = $1 ORDER BY service_date DESC",
      [req.params.id]
    );

    res.json({
      success: true,
      data: {
        ...eqResult.rows[0],
        maintenance_logs: maintResult.rows
      }
    });
  } catch (err) {
    console.error("Error fetching equipment detail:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create new equipment
router.post("/api/equipment", async (req, res) => {
  try {
    const {
      name, model_number, brand, category, serial_number, asset_tag,
      purchase_date, purchase_price, current_status, location, assigned_crew,
      operating_hours, service_interval_hours, last_service_date,
      next_service_date, warranty_expiry, specifications, manual_url, notes
    } = req.body;

    const generatedTag = asset_tag || `EQ-${Date.now().toString().slice(-4)}`;

    const result = await pool.query(
      `INSERT INTO vivas_equipment (
        name, model_number, brand, category, serial_number, asset_tag,
        purchase_date, purchase_price, current_status, location, assigned_crew,
        operating_hours, service_interval_hours, last_service_date,
        next_service_date, warranty_expiry, specifications, manual_url, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        name, model_number || "", brand || "", category || "Hand Tools & Implements",
        serial_number || "", generatedTag,
        purchase_date || null, parseFloat(purchase_price) || 0,
        current_status || "active", location || "Main Tool Barn",
        assigned_crew || "Field Operations Crew",
        parseFloat(operating_hours) || 0, parseInt(service_interval_hours) || 100,
        last_service_date || null, next_service_date || null,
        warranty_expiry || null, JSON.stringify(specifications || {}),
        manual_url || "", notes || ""
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: "Equipment created successfully" });
  } catch (err) {
    console.error("Error creating equipment:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update equipment
router.put("/api/equipment/:id", async (req, res) => {
  try {
    const {
      name, model_number, brand, category, serial_number, asset_tag,
      purchase_date, purchase_price, current_status, location, assigned_crew,
      operating_hours, service_interval_hours, last_service_date,
      next_service_date, warranty_expiry, specifications, manual_url, notes
    } = req.body;

    const result = await pool.query(
      `UPDATE vivas_equipment SET
        name = $1, model_number = $2, brand = $3, category = $4,
        serial_number = $5, asset_tag = $6, purchase_date = $7,
        purchase_price = $8, current_status = $9, location = $10,
        assigned_crew = $11, operating_hours = $12, service_interval_hours = $13,
        last_service_date = $14, next_service_date = $15, warranty_expiry = $16,
        specifications = $17, manual_url = $18, notes = $19, updated_at = CURRENT_TIMESTAMP
      WHERE id = $20
      RETURNING *`,
      [
        name, model_number, brand, category,
        serial_number, asset_tag, purchase_date || null,
        parseFloat(purchase_price) || 0, current_status || "active",
        location, assigned_crew, parseFloat(operating_hours) || 0,
        parseInt(service_interval_hours) || 100, last_service_date || null,
        next_service_date || null, warranty_expiry || null,
        JSON.stringify(specifications || {}), manual_url, notes,
        req.params.id
      ]
    );

    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Equipment not found" });
    res.json({ success: true, data: result.rows[0], message: "Equipment updated successfully" });
  } catch (err) {
    console.error("Error updating equipment:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete equipment
router.delete("/api/equipment/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM vivas_equipment WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Equipment not found" });
    res.json({ success: true, message: "Equipment deleted successfully" });
  } catch (err) {
    console.error("Error deleting equipment:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add maintenance service log for equipment
router.post("/api/equipment/:id/maintenance", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { service_date, service_type, performed_by, cost, hours_at_service, parts_replaced, notes, next_due_date } = req.body;

    const maintRes = await client.query(
      `INSERT INTO vivas_equipment_maintenance (
        equipment_id, service_date, service_type, performed_by, cost,
        hours_at_service, parts_replaced, notes, next_due_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        req.params.id, service_date || new Date().toISOString().slice(0, 10),
        service_type, performed_by, parseFloat(cost) || 0,
        parseFloat(hours_at_service) || 0, parts_replaced || "", notes || "",
        next_due_date || null
      ]
    );

    // Update equipment's last and next service dates
    await client.query(
      `UPDATE vivas_equipment SET
        last_service_date = $1,
        next_service_date = COALESCE($2, next_service_date),
        operating_hours = GREATEST(operating_hours, $3),
        current_status = 'active',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4`,
      [service_date || new Date().toISOString().slice(0, 10), next_due_date || null, parseFloat(hours_at_service) || 0, req.params.id]
    );

    await client.query("COMMIT");
    res.status(201).json({ success: true, data: maintRes.rows[0], message: "Maintenance log recorded" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error adding maintenance record:", err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ==========================================
// 10. ASSETS MODULE: MATERIALS & INPUTS API
// ==========================================

// --- A. CATALOG ---
router.get("/api/inputs/catalog", async (req, res) => {
  try {
    const { type, organic, search } = req.query;
    let query = "SELECT * FROM vivas_inputs_catalog WHERE 1=1";
    const params = [];

    if (type && type !== "All") {
      params.push(type);
      query += ` AND input_type = $${params.length}`;
    }
    if (organic === "true") {
      query += " AND is_organic = TRUE";
    }
    if (search && search.trim() !== "") {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(brand) LIKE $${params.length} OR LOWER(active_ingredients) LIKE $${params.length})`;
    }

    query += " ORDER BY created_at DESC";
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching inputs catalog:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/api/inputs/catalog", async (req, res) => {
  try {
    const {
      name, input_type, active_ingredients, npk_ratio, is_organic,
      omri_listed, certification_number, default_unit, brand,
      recommended_application_rate, target_crops, safety_precautions,
      reentry_interval_hours
    } = req.body;

    const result = await pool.query(
      `INSERT INTO vivas_inputs_catalog (
        name, input_type, active_ingredients, npk_ratio, is_organic,
        omri_listed, certification_number, default_unit, brand,
        recommended_application_rate, target_crops, safety_precautions,
        reentry_interval_hours
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        name, input_type, active_ingredients || "", npk_ratio || "",
        Boolean(is_organic), Boolean(omri_listed), certification_number || "",
        default_unit || "kg", brand || "", recommended_application_rate || "",
        target_crops || "", safety_precautions || "", parseInt(reentry_interval_hours) || 0
      ]
    );

    res.status(201).json({ success: true, data: result.rows[0], message: "Input added to catalog" });
  } catch (err) {
    console.error("Error adding input to catalog:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put("/api/inputs/catalog/:id", async (req, res) => {
  try {
    const {
      name, input_type, active_ingredients, npk_ratio, is_organic,
      omri_listed, certification_number, default_unit, brand,
      recommended_application_rate, target_crops, safety_precautions,
      reentry_interval_hours, status
    } = req.body;

    const result = await pool.query(
      `UPDATE vivas_inputs_catalog SET
        name = $1, input_type = $2, active_ingredients = $3, npk_ratio = $4,
        is_organic = $5, omri_listed = $6, certification_number = $7,
        default_unit = $8, brand = $9, recommended_application_rate = $10,
        target_crops = $11, safety_precautions = $12, reentry_interval_hours = $13,
        status = $14, updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *`,
      [
        name, input_type, active_ingredients, npk_ratio,
        Boolean(is_organic), Boolean(omri_listed), certification_number,
        default_unit, brand, recommended_application_rate,
        target_crops, safety_precautions, parseInt(reentry_interval_hours) || 0,
        status || "active", req.params.id
      ]
    );

    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Catalog item not found" });
    res.json({ success: true, data: result.rows[0], message: "Catalog item updated" });
  } catch (err) {
    console.error("Error updating catalog item:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete("/api/inputs/catalog/:id", async (req, res) => {
  try {
    const result = await pool.query("DELETE FROM vivas_inputs_catalog WHERE id = $1 RETURNING id", [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Catalog item not found" });
    res.json({ success: true, message: "Catalog item deleted" });
  } catch (err) {
    console.error("Error deleting catalog item:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- B. INVENTORY ON-HAND ---
router.get("/api/inputs/inventory", async (req, res) => {
  try {
    const { type, status, search } = req.query;
    let query = "SELECT * FROM vivas_inputs_inventory WHERE 1=1";
    const params = [];

    if (type && type !== "All") {
      params.push(type);
      query += ` AND input_type = $${params.length}`;
    }
    if (status && status !== "All") {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (search && search.trim() !== "") {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(name) LIKE $${params.length} OR LOWER(brand) LIKE $${params.length} OR LOWER(vendor) LIKE $${params.length} OR LOWER(storage_location) LIKE $${params.length})`;
    }

    query += " ORDER BY name ASC";
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching inventory on-hand:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get("/api/inputs/inventory/stats", async (req, res) => {
  try {
    const statsQuery = `
      SELECT
        COUNT(*) as total_items,
        COUNT(CASE WHEN status = 'low_stock' OR quantity_on_hand <= reorder_threshold THEN 1 END) as low_stock_items,
        COALESCE(SUM(quantity_on_hand * unit_cost), 0) as total_inventory_valuation,
        COUNT(CASE WHEN status = 'out_of_stock' OR quantity_on_hand = 0 THEN 1 END) as out_of_stock_items
      FROM vivas_inputs_inventory
    `;
    const result = await pool.query(statsQuery);
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Error fetching inventory stats:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Stock adjustment (+/- stock)
router.post("/api/inputs/inventory/adjust", async (req, res) => {
  try {
    const { id, adjustment_type, quantity, reason } = req.body; // type: 'add' | 'deduct' | 'set'
    const current = await pool.query("SELECT * FROM vivas_inputs_inventory WHERE id = $1", [id]);
    if (current.rowCount === 0) return res.status(404).json({ success: false, message: "Inventory item not found" });

    const item = current.rows[0];
    let newQty = parseFloat(item.quantity_on_hand);
    const adjQty = parseFloat(quantity) || 0;

    if (adjustment_type === "add") newQty += adjQty;
    else if (adjustment_type === "deduct") newQty = Math.max(0, newQty - adjQty);
    else if (adjustment_type === "set") newQty = Math.max(0, adjQty);

    const newAvailable = Math.max(0, newQty - parseFloat(item.quantity_committed || 0));
    const newStatus = newQty === 0 ? "out_of_stock" : (newQty <= parseFloat(item.reorder_threshold || 10) ? "low_stock" : "in_stock");

    const updated = await pool.query(
      `UPDATE vivas_inputs_inventory SET
        quantity_on_hand = $1,
        quantity_available = $2,
        status = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *`,
      [newQty, newAvailable, newStatus, id]
    );

    res.json({ success: true, data: updated.rows[0], message: "Stock adjustment recorded" });
  } catch (err) {
    console.error("Error adjusting inventory:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// --- C. LOT MANAGEMENT & TRACEABILITY ---
router.get("/api/inputs/lots", async (req, res) => {
  try {
    const { type, status, expiring, search } = req.query;
    let query = "SELECT * FROM vivas_inputs_lots WHERE 1=1";
    const params = [];

    if (type && type !== "All") {
      params.push(type);
      query += ` AND input_type = $${params.length}`;
    }
    if (status && status !== "All") {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }
    if (expiring === "true") {
      query += " AND expiration_date <= (CURRENT_DATE + INTERVAL '60 days') AND expiration_date >= CURRENT_DATE";
    }
    if (search && search.trim() !== "") {
      params.push(`%${search.trim().toLowerCase()}%`);
      query += ` AND (LOWER(lot_number) LIKE $${params.length} OR LOWER(vendor_lot_number) LIKE $${params.length} OR LOWER(input_name) LIKE $${params.length} OR LOWER(supplier_name) LIKE $${params.length} OR LOWER(container_code) LIKE $${params.length})`;
    }

    query += " ORDER BY received_date DESC";
    const result = await pool.query(query, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching lots:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Receive new lot
router.post("/api/inputs/lots", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const {
      catalog_id, input_name, input_type, unit, initial_quantity,
      unit_cost, vendor_lot_number, received_date, expiration_date,
      storage_location, container_code, supplier_name, notes
    } = req.body;

    const lotNumber = `LOT-${new Date().getFullYear()}-${input_name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-3)}`;
    const totalCost = (parseFloat(initial_quantity) || 0) * (parseFloat(unit_cost) || 0);

    // Insert Lot record
    const lotRes = await client.query(
      `INSERT INTO vivas_inputs_lots (
        lot_number, vendor_lot_number, catalog_id, input_name, input_type,
        unit, initial_quantity, current_quantity, unit_cost, total_cost,
        received_date, expiration_date, storage_location, container_code,
        supplier_name, status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        lotNumber, vendor_lot_number || "", catalog_id || null, input_name,
        input_type || "Fertilizers & Nutrients", unit || "kg",
        parseFloat(initial_quantity) || 0, parseFloat(initial_quantity) || 0,
        parseFloat(unit_cost) || 0, totalCost,
        received_date || new Date().toISOString().slice(0, 10),
        expiration_date || null, storage_location || "Inputs Shed",
        container_code || "", supplier_name || "", "active", notes || ""
      ]
    );

    // Update or insert into inventory on-hand
    const existingInv = await client.query(
      "SELECT id, quantity_on_hand FROM vivas_inputs_inventory WHERE LOWER(name) = LOWER($1)",
      [input_name]
    );

    if (existingInv.rowCount > 0) {
      const newOnHand = parseFloat(existingInv.rows[0].quantity_on_hand) + (parseFloat(initial_quantity) || 0);
      await client.query(
        `UPDATE vivas_inputs_inventory SET
          quantity_on_hand = $1,
          quantity_available = $1 - quantity_committed,
          unit_cost = $2,
          status = 'in_stock',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $3`,
        [newOnHand, parseFloat(unit_cost) || 0, existingInv.rows[0].id]
      );
    } else {
      await client.query(
        `INSERT INTO vivas_inputs_inventory (
          catalog_id, name, input_type, unit, brand, vendor,
          quantity_on_hand, quantity_available, unit_cost, storage_location, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, 'in_stock')`,
        [
          catalog_id || null, input_name, input_type, unit || "kg",
          "", supplier_name || "Direct Supplier",
          parseFloat(initial_quantity) || 0, parseFloat(unit_cost) || 0,
          storage_location || "Inputs Shed"
        ]
      );
    }

    await client.query("COMMIT");
    res.status(201).json({ success: true, data: lotRes.rows[0], message: "Lot batch received and inventory updated" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error receiving lot:", err.message);
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});


export default router;
