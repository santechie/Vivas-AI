import express from "express";
import pool from "../config/db.js";
import { validateBody } from "../utils/validate.js";
import { handleRouteError } from "../utils/response.js";

const router = express.Router();

// ==========================================
// FARM MAP API ROUTES
// ==========================================

// GET all farm map items (with nested beds and parent names)
router.get("/items", async (req, res) => {
  try {
    const { type, search } = req.query;
    let q = `
      SELECT c.*, p.name as parent_name,
             COALESCE(json_agg(b.*) FILTER (WHERE b.id IS NOT NULL), '[]') AS beds
      FROM vivas_farm_map_items c
      LEFT JOIN vivas_farm_map_items p ON c.parent_id = p.id
      LEFT JOIN vivas_farm_map_beds b ON b.map_item_id = c.id
      WHERE c.is_active = TRUE
    `;
    const params = [];
    if (type && type !== 'All') {
      params.push(type);
      q += ` AND c.item_type = $${params.length}`;
    }
    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      q += ` AND (c.name ILIKE $${params.length} OR c.description ILIKE $${params.length} OR c.code ILIKE $${params.length})`;
    }
    q += " GROUP BY c.id, p.name ORDER BY c.sort_order ASC, c.created_at DESC";
    const result = await pool.query(q, params);
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (err) {
    console.error("Farm map GET error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET location hierarchy tree (Fields -> Blocks -> Beds)
router.get("/tree", async (req, res) => {
  try {
    const allItemsRes = await pool.query(`
      SELECT c.*, 
             COALESCE(json_agg(b.*) FILTER (WHERE b.id IS NOT NULL), '[]') AS beds
      FROM vivas_farm_map_items c
      LEFT JOIN vivas_farm_map_beds b ON b.map_item_id = c.id
      WHERE c.is_active = TRUE
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC
    `);

    const items = allItemsRes.rows;
    const itemMap = {};
    items.forEach(i => {
      itemMap[i.id] = { ...i, children: [] };
    });

    const rootNodes = [];
    items.forEach(i => {
      if (i.parent_id && itemMap[i.parent_id]) {
        itemMap[i.parent_id].children.push(itemMap[i.id]);
      } else {
        rootNodes.push(itemMap[i.id]);
      }
    });

    res.json({ success: true, data: rootNodes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single farm map item
router.get("/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const item = await pool.query("SELECT * FROM vivas_farm_map_items WHERE id = $1 AND is_active = TRUE", [id]);
    if (item.rowCount === 0) return res.status(404).json({ success: false, message: "Item not found" });
    const beds = await pool.query("SELECT * FROM vivas_farm_map_beds WHERE map_item_id = $1 ORDER BY bed_number ASC", [id]);
    const children = await pool.query("SELECT * FROM vivas_farm_map_items WHERE parent_id = $1 AND is_active = TRUE ORDER BY name ASC", [id]);
    res.json({ success: true, data: { ...item.rows[0], beds: beds.rows, children: children.rows } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create farm map item
router.post("/items", async (req, res) => {
  try {
    const {
      name, code, item_type, location_level, location_type, parent_id, shape, color, description,
      gps_lat, gps_lng, geojson, orientation_deg, width_ft, length_ft, usable_area_sqft,
      beds_count, bed_width_ft, bed_length_ft, bed_spacing_ft,
      field_type, irrigation_type, soil_type, crop_zone, notes, sort_order, custom_beds
    } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ success: false, message: "Location name is required" });
    if (!item_type) return res.status(400).json({ success: false, message: "Item type is required" });

    const n = (v) => (v !== undefined && v !== '' && v !== null && !isNaN(parseFloat(v))) ? parseFloat(v) : null;
    const area = (n(width_ft) && n(length_ft)) ? n(width_ft) * n(length_ft) : null;

    const result = await pool.query(`
      INSERT INTO vivas_farm_map_items
        (parent_id, location_level, location_type, name, code, item_type, shape, geojson, color, description,
         gps_lat, gps_lng, orientation_deg, width_ft, length_ft, area_sqft, usable_area_sqft,
         beds_count, bed_width_ft, bed_length_ft, bed_spacing_ft, field_type, irrigation_type, soil_type, crop_zone, notes, sort_order)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
      RETURNING *`,
      [
        parent_id || null, location_level || 'field', location_type || item_type, name.trim(), code || null,
        item_type, shape || 'rectangle', geojson ? JSON.stringify(geojson) : null, color || '#2e7d32', description || null,
        n(gps_lat), n(gps_lng), n(orientation_deg) || 0, n(width_ft), n(length_ft), area, n(usable_area_sqft) || area,
        parseInt(beds_count) || 0, n(bed_width_ft), n(bed_length_ft), n(bed_spacing_ft),
        field_type || null, irrigation_type || null, soil_type || null, crop_zone || null, notes || null,
        parseInt(sort_order) || 0
      ]
    );

    const newItem = result.rows[0];

    // Create custom beds if provided or auto-generate if beds_count > 0
    if (Array.isArray(custom_beds) && custom_beds.length > 0) {
      for (let i = 0; i < custom_beds.length; i++) {
        const cb = custom_beds[i];
        await pool.query(
          `INSERT INTO vivas_farm_map_beds (map_item_id, bed_number, bed_name, width_ft, length_ft, area_sqft, geojson, status, current_crop)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            newItem.id, i + 1, cb.name || `Bed ${i + 1}`, n(cb.width_ft || bed_width_ft), n(cb.length_ft || bed_length_ft),
            (n(cb.width_ft || bed_width_ft) && n(cb.length_ft || bed_length_ft)) ? n(cb.width_ft || bed_width_ft) * n(cb.length_ft || bed_length_ft) : null,
            cb.geojson ? JSON.stringify(cb.geojson) : null, cb.status || 'empty', cb.current_crop || null
          ]
        );
      }
    } else if (parseInt(beds_count) > 0) {
      const bWidth = n(bed_width_ft) || 3;
      const bLength = n(bed_length_ft) || n(length_ft) || 50;
      const bArea = bWidth * bLength;
      for (let i = 1; i <= parseInt(beds_count); i++) {
        await pool.query(
          `INSERT INTO vivas_farm_map_beds (map_item_id, bed_number, bed_name, width_ft, length_ft, area_sqft, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'empty')`,
          [newItem.id, i, `Bed ${i < 10 ? '0' + i : i}`, bWidth, bLength, bArea]
        );
      }
    }

    res.json({ success: true, data: newItem, message: "Farm location created successfully" });
  } catch (err) {
    console.error("Farm map POST error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update farm map item (geometry & metadata)
router.put("/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, code, item_type, location_level, location_type, parent_id, shape, color, description,
      gps_lat, gps_lng, geojson, orientation_deg, width_ft, length_ft, usable_area_sqft,
      beds_count, bed_width_ft, bed_length_ft, bed_spacing_ft,
      field_type, irrigation_type, soil_type, crop_zone, notes, sort_order, regenerate_beds
    } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ success: false, message: "Location name is required" });

    // Circular parent check
    if (parent_id === id) {
      return res.status(400).json({ success: false, message: "A location cannot be its own parent" });
    }

    const n = (v) => (v !== undefined && v !== '' && v !== null && !isNaN(parseFloat(v))) ? parseFloat(v) : null;
    const area = (n(width_ft) && n(length_ft)) ? n(width_ft) * n(length_ft) : null;

    const result = await pool.query(`
      UPDATE vivas_farm_map_items SET
        parent_id=$1, location_level=$2, location_type=$3, name=$4, code=$5,
        item_type=$6, shape=$7, geojson=$8, color=$9, description=$10,
        gps_lat=$11, gps_lng=$12, orientation_deg=$13, width_ft=$14, length_ft=$15,
        area_sqft=$16, usable_area_sqft=$17, beds_count=$18, bed_width_ft=$19,
        bed_length_ft=$20, bed_spacing_ft=$21, field_type=$22, irrigation_type=$23,
        soil_type=$24, crop_zone=$25, notes=$26, sort_order=$27, updated_at=NOW()
      WHERE id=$28 RETURNING *`,
      [
        parent_id || null, location_level || 'field', location_type || item_type, name.trim(), code || null,
        item_type, shape || 'rectangle', geojson ? JSON.stringify(geojson) : null, color || '#2e7d32', description || null,
        n(gps_lat), n(gps_lng), n(orientation_deg) || 0, n(width_ft), n(length_ft),
        area, n(usable_area_sqft) || area, parseInt(beds_count) || 0, n(bed_width_ft),
        n(bed_length_ft), n(bed_spacing_ft), field_type || null, irrigation_type || null,
        soil_type || null, crop_zone || null, notes || null, parseInt(sort_order) || 0, id
      ]
    );

    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Item not found" });

    // Regenerate beds if requested
    if (regenerate_beds && parseInt(beds_count) > 0) {
      await pool.query("DELETE FROM vivas_farm_map_beds WHERE map_item_id = $1", [id]);
      const bWidth = n(bed_width_ft) || 3;
      const bLength = n(bed_length_ft) || n(length_ft) || 50;
      const bArea = bWidth * bLength;
      for (let i = 1; i <= parseInt(beds_count); i++) {
        await pool.query(
          `INSERT INTO vivas_farm_map_beds (map_item_id, bed_number, bed_name, width_ft, length_ft, area_sqft, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'empty')`,
          [id, i, `Bed ${i < 10 ? '0' + i : i}`, bWidth, bLength, bArea]
        );
      }
    }

    res.json({ success: true, data: result.rows[0], message: "Location updated successfully" });
  } catch (err) {
    console.error("Farm map PUT error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE farm map item (with dependency check & optional cascade)
router.delete("/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { cascade, force } = req.query;

    // Check for child locations
    const childrenRes = await pool.query(
      "SELECT id, name FROM vivas_farm_map_items WHERE parent_id = $1 AND is_active = TRUE",
      [id]
    );

    // Check for active beds with crops
    const activeBedsRes = await pool.query(
      "SELECT id, bed_name, current_crop FROM vivas_farm_map_beds WHERE map_item_id = $1 AND status = 'planted'",
      [id]
    );

    if ((childrenRes.rowCount > 0 || activeBedsRes.rowCount > 0) && cascade !== 'true' && force !== 'true') {
      return res.status(400).json({
        success: false,
        has_dependencies: true,
        children_count: childrenRes.rowCount,
        active_crops_count: activeBedsRes.rowCount,
        message: `Location has ${childrenRes.rowCount} child location(s) and ${activeBedsRes.rowCount} bed(s) with active crops. Pass cascade=true to proceed.`
      });
    }

    if (cascade === 'true') {
      // Soft-delete children as well
      await pool.query("UPDATE vivas_farm_map_items SET is_active = FALSE WHERE parent_id = $1", [id]);
    } else {
      // Re-assign children to null (root level)
      await pool.query("UPDATE vivas_farm_map_items SET parent_id = NULL WHERE parent_id = $1", [id]);
    }

    const result = await pool.query(
      "UPDATE vivas_farm_map_items SET is_active = FALSE WHERE id = $1 RETURNING id",
      [id]
    );

    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Item not found" });
    res.json({ success: true, message: "Farm location deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET beds for a map item
router.get("/items/:id/beds", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM vivas_farm_map_beds WHERE map_item_id = $1 ORDER BY bed_number ASC",
      [id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update bed crop/status
router.put("/beds/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { current_crop, status, bed_name, notes, geojson } = req.body;
    const result = await pool.query(
      `UPDATE vivas_farm_map_beds SET
         current_crop=$1, status=$2, bed_name=$3, notes=$4,
         geojson=COALESCE($5, geojson), updated_at=NOW()
       WHERE id=$6 RETURNING *`,
      [current_crop || null, status || 'empty', bed_name || null, notes || null, geojson ? JSON.stringify(geojson) : null, id]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Bed not found" });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


export default router;
