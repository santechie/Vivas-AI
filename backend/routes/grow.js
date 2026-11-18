import express from "express";
import pool from "../config/db.js";
import { validateBody } from "../utils/validate.js";
import { handleRouteError } from "../utils/response.js";

const router = express.Router();

// ==========================================
// GROW MODULE API ROUTES (Crop Library, Crop Plan, Harvest Planner)
// ==========================================

// -------------------
// CROP CATEGORIES
// -------------------

// GET /api/crops/categories - List all crop categories
router.get("/api/crops/categories", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM vivas_crop_categories ORDER BY name ASC`);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error fetching crop categories:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/crops/categories - Create custom category
router.post("/api/crops/categories", async (req, res) => {
  try {
    const { name, icon, description } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }
    const result = await pool.query(
      `INSERT INTO vivas_crop_categories (name, icon, description) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (name) DO UPDATE SET icon = EXCLUDED.icon, description = EXCLUDED.description 
       RETURNING *`,
      [name.trim(), icon || '🌱', description || null]
    );
    res.json({ success: true, data: result.rows[0], message: "Category saved successfully" });
  } catch (err) {
    console.error("Error creating crop category:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/crops/categories/:id - Update category
router.put("/api/crops/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, description } = req.body;
    const result = await pool.query(
      `UPDATE vivas_crop_categories 
       SET name = COALESCE($1, name), icon = COALESCE($2, icon), description = COALESCE($3, description) 
       WHERE id = $4 RETURNING *`,
      [name ? name.trim() : null, icon || null, description || null, id]
    );
    res.json({ success: true, data: result.rows[0], message: "Category updated successfully" });
  } catch (err) {
    console.error("Error updating crop category:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/crops/categories/:id - Delete custom category
router.delete("/api/crops/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM vivas_crop_categories WHERE id = $1`, [id]);
    res.json({ success: true, message: "Category deleted successfully" });
  } catch (err) {
    console.error("Error deleting crop category:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------
// CROPS & VARIETIES
// -------------------

// POST /api/crops/upload-image - Upload crop picture (JPEG & PNG supported)
router.post("/api/crops/upload-image", async (req, res) => {
  try {
    const { image, image_url, filename } = req.body;
    let base64Data = image || image_url;

    if (!base64Data) {
      return res.status(400).json({ success: false, message: "No image payload or URL provided" });
    }

    // Check if it's already an http(s) URL
    if (typeof base64Data === 'string' && (base64Data.startsWith('http://') || base64Data.startsWith('https://'))) {
      return res.json({ success: true, image_url: base64Data, message: "Image URL accepted" });
    }

    // Validate MIME type / base64 header
    let extension = 'jpg';
    let mimeType = '';

    if (typeof base64Data === 'string' && base64Data.startsWith('data:')) {
      const parts = base64Data.split(';');
      mimeType = parts[0].replace('data:', '').toLowerCase();
      base64Data = base64Data.split(',')[1];
    }

    if (mimeType) {
      if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
        extension = 'jpg';
      } else if (mimeType === 'image/png') {
        extension = 'png';
      } else if (mimeType === 'image/webp') {
        extension = 'webp';
      } else if (mimeType === 'image/gif') {
        extension = 'gif';
      } else {
        extension = 'jpg';
      }
    } else {
      extension = 'jpg';
    }

    const uniqueId = crypto.randomBytes(8).toString('hex');
    const safeName = filename ? String(filename).replace(/[^a-zA-Z0-9_-]/g, '') : 'crop';
    const savedFileName = `${safeName}_${Date.now()}_${uniqueId}.${extension}`;

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, savedFileName);
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.promises.writeFile(filePath, buffer);

    const host = req.get('host') || 'localhost:5001';
    const rawProto = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const protocol = String(rawProto).split(',')[0].trim();
    const publicUrl = `${protocol}://${host}/uploads/crops/${savedFileName}`;
    const relativeUrl = `/uploads/crops/${savedFileName}`;

    res.json({
      success: true,
      image_url: relativeUrl,
      public_url: publicUrl,
      relative_url: relativeUrl,
      filename: savedFileName,
      message: "Crop image uploaded successfully"
    });
  } catch (err) {
    console.error("Error uploading crop image:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/crops - List crops with filters & search
router.get("/api/crops", async (req, res) => {
  try {
    const { category, status, search, family, stage } = req.query;
    let q = `
      SELECT c.*, 
             COUNT(v.id) AS variety_count,
             COALESCE(json_agg(v.*) FILTER (WHERE v.id IS NOT NULL), '[]') AS varieties
      FROM vivas_crops c
      LEFT JOIN vivas_crop_varieties v ON v.crop_id = c.id AND v.is_active = TRUE
      WHERE 1=1
    `;
    const params = [];

    if (status === 'active' || !status) {
      q += ` AND c.is_active = TRUE`;
    } else if (status === 'inactive') {
      q += ` AND c.is_active = FALSE`;
    }

    if (category && category !== 'All') {
      params.push(category);
      q += ` AND c.category = $${params.length}`;
    }

    if (family && family !== 'All') {
      params.push(family);
      q += ` AND c.crop_family = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      q += ` AND (c.name ILIKE $${params.length} OR c.custom_name ILIKE $${params.length} OR c.abbreviation ILIKE $${params.length} OR c.genus ILIKE $${params.length})`;
    }

    q += ` GROUP BY c.id ORDER BY c.name ASC, c.custom_name ASC`;
    const result = await pool.query(q, params);
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (err) {
    console.error("Error fetching crops:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/crops/:id - Single crop with varieties
router.get("/api/crops/:id", async (req, res, next) => {
  if (req.params.id === 'templates' || req.params.id === 'categories') return next();
  try {
    const { id } = req.params;
    const cropRes = await pool.query("SELECT * FROM vivas_crops WHERE id = $1", [id]);
    if (cropRes.rowCount === 0) return res.status(404).json({ success: false, message: "Crop not found" });

    const varRes = await pool.query(
      "SELECT * FROM vivas_crop_varieties WHERE crop_id = $1 AND is_active = TRUE ORDER BY variety_name ASC",
      [id]
    );

    res.json({
      success: true,
      data: {
        ...cropRes.rows[0],
        varieties: varRes.rows
      }
    });
  } catch (err) {
    console.error("Error fetching crop detail:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to safely format single or multiple planting methods into comma-separated text
const normalizePlantingMethod = (val) => {
  if (!val) return 'Transplant';
  if (Array.isArray(val)) return val.filter(Boolean).map(s => String(s).trim()).join(', ');
  return String(val).trim();
};

// POST /api/crops - Create crop
router.post("/api/crops", async (req, res) => {
  try {
    const {
      name, custom_name, abbreviation, crop_family, genus, species, scientific_name,
      category, image_url, icon, color, description, varieties, specialised_plant_part, crop_type,
      // Seed Attributes
      seeds_per_oz, seeds_per_gram, seed_viability_years, seed_type, seed_size,
      // Crop Attributes
      growth_habit, plant_height_in, plant_spread_in, crop_lifecycle, harvest_part, harvest_method,
      // Environmental & Soil Requirements
      water_needs, ideal_temp_f, soil_ph_min, soil_ph_max, frost_tolerance, light_requirement, seasonality,
      // Advanced Agronomic Preferences
      soil_type, nutrient_demand, companion_plants, incompatible_plants, common_pests, disease_resistance,
      // Segmented Notes
      nursery_notes, field_notes, harvest_notes, notes
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Crop name is required" });
    }

    const abbr = abbreviation ? abbreviation.trim().toUpperCase() : name.trim().slice(0, 3).toUpperCase();
    const sciName = scientific_name || `${genus || 'Solanum'} ${species || 'lycopersicum'}`.trim();

    const cropRes = await pool.query(
      `INSERT INTO vivas_crops (name, custom_name, scientific_name, abbreviation, crop_family, genus, species, category, image_url, icon, color, description, specialised_plant_part, crop_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
      [
        name.trim(), custom_name || null, sciName, abbr, crop_family || null,
        genus || null, species || null, category || 'Vegetables',
        image_url || null, icon || '🌱', color || '#16a34a', description || null,
        specialised_plant_part || null, crop_type || 'Annual'
      ]
    );

    const newCrop = cropRes.rows[0];

    const varsToInsert = (Array.isArray(varieties) && varieties.length > 0)
      ? varieties
      : [{ variety_name: 'Standard', planting_method: 'Transplant', days_to_maturity: 65, in_row_spacing_in: 12, row_spacing_in: 18, expected_yield_per_ft: 1.5, yield_unit: 'kg', default_price_per_unit: 50.00 }];

    let firstTemplateId = null;

    for (const v of varsToInsert) {
      const varRes = await pool.query(
        `INSERT INTO vivas_crop_varieties (
          crop_id, variety_name, description, supplier, days_to_maturity, days_to_germination,
          harvest_stage, planting_method, in_row_spacing_in, row_spacing_in, rows_per_bed,
          expected_yield_per_ft, yield_unit, default_price_per_unit, tray_size, notes,
          spacing_unit, expected_yield_per_acre
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
        [
          newCrop.id, v.variety_name || 'Standard', v.description || null, v.supplier || null,
          v.days_to_maturity || 65, v.days_to_germination || 7,
          v.harvest_stage || 'Mature', normalizePlantingMethod(v.planting_method),
          v.in_row_spacing_in || 0.35, v.row_spacing_in || 0.5, v.rows_per_bed || 2,
          v.expected_yield_per_ft || 1.5, v.yield_unit || 'Ton',
          v.default_price_per_unit || 50.00, v.tray_size || '72-cell', v.notes || null,
          v.spacing_unit || 'mtr',
          v.expected_yield_per_acre ? parseFloat(v.expected_yield_per_acre) : (parseFloat(v.expected_yield_per_ft || 1.5) * 8.5)
        ]
      );

      const newVar = varRes.rows[0];
      const templateName = `${newCrop.name} - ${newVar.variety_name}`;

      // Insert template for newly created crop & variety
      const tRes = await pool.query(
        `INSERT INTO vivas_crop_templates (
          crop_id, variety_id, template_name, planting_method, tray_size, days_to_maturity,
          in_row_spacing_in, row_spacing_in, expected_yield_per_ft, yield_unit, default_price_per_unit,
          est_revenue_per_100ft_bed, description,
          seeds_per_oz, seeds_per_gram, seed_viability_years, seed_type, seed_size,
          growth_habit, plant_height_in, plant_spread_in, crop_lifecycle, harvest_part, harvest_method,
          water_needs, ideal_temp_f, soil_ph_min, soil_ph_max, frost_tolerance, light_requirement, seasonality,
          soil_type, nutrient_demand, companion_plants, incompatible_plants, common_pests, disease_resistance,
          nursery_notes, field_notes, harvest_notes, notes,
          spacing_unit, expected_yield_per_acre
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38, $39, $40, $41, $42, $43) RETURNING id`,
        [
          newCrop.id, newVar.id, templateName, normalizePlantingMethod(newVar.planting_method), newVar.tray_size || '72-cell',
          newVar.days_to_maturity || 65, newVar.in_row_spacing_in || 0.35, newVar.row_spacing_in || 0.5,
          newVar.expected_yield_per_ft || 1.5, newVar.yield_unit || 'Ton', newVar.default_price_per_unit || 50,
          (parseFloat(newVar.expected_yield_per_ft || 1.5) * 100 * parseFloat(newVar.default_price_per_unit || 50)),
          newVar.description || description || null,
          seeds_per_oz || 1000, seeds_per_gram || 35, seed_viability_years || 3, seed_type || 'Raw', seed_size || 'Medium',
          growth_habit || 'Determinate', plant_height_in || 36, plant_spread_in || 24, crop_lifecycle || 'Annual', harvest_part || 'Fruit', harvest_method || 'Continuous Pick',
          water_needs || 'Moderate (1-1.5 in/wk)', ideal_temp_f || '65-85°F', soil_ph_min || 6.0, soil_ph_max || 6.8, frost_tolerance || 'Tender', light_requirement || 'Full Sun', seasonality || 'Warm Season',
          soil_type || 'Well-drained Loam', nutrient_demand || 'Heavy Feeder', companion_plants || 'Basil, Marigolds, Carrots', incompatible_plants || 'Fennel, Potatoes, Brassicas', common_pests || 'Aphids, Hornworms, Flea Beetles', disease_resistance || 'V, F, N, T',
          nursery_notes || null, field_notes || null, harvest_notes || null, notes || null,
          newVar.spacing_unit || 'mtr',
          newVar.expected_yield_per_acre || (parseFloat(newVar.expected_yield_per_ft || 1.5) * 8.5)
        ]
      );

      const tId = tRes.rows[0].id;
      if (!firstTemplateId) firstTemplateId = tId;

      // Nursery Automated Tasks
      await pool.query(`
        INSERT INTO vivas_crop_nursery_tasks (template_id, task_name, task_category, offset_days, est_labor_hours, assigned_role, instructions)
        VALUES 
          ($1, 'Sow Seeds in Nursery Trays', 'Seeding', 0, 0.75, 'Nursery Tech', 'Sow 1 seed per cell in 72-cell trays with organic potting mix'),
          ($1, 'Move to Germination Chamber', 'Germination', 1, 0.25, 'Nursery Tech', 'Maintain 70-75°F temp and 90% humidity'),
          ($1, 'Move to Greenhouse Benches', 'Irrigation', 3, 0.50, 'Nursery Tech', 'Water gently twice daily with fine mist'),
          ($1, 'Thin Seedlings & Inspect', 'Thinning', 14, 0.75, 'Nursery Tech', 'Thin to strongest single seedling per cell'),
          ($1, 'Hardening Off Process', 'Hardening', 24, 0.50, 'Nursery Tech', 'Move trays to shade house before field transplanting')
      `, [tId]);

      // Field Automated Tasks
      await pool.query(`
        INSERT INTO vivas_crop_field_tasks (template_id, task_name, task_category, offset_days, est_labor_hours, assigned_role, instructions)
        VALUES 
          ($1, 'Bed Preparation & Fertilize', 'Soil Prep', -7, 1.50, 'Field Hand', 'Chisel plow bed, add 50kg organic compost'),
          ($1, 'Lay Drip Line & Plastic Mulch', 'Irrigation', -3, 1.00, 'Field Hand', 'Install 16mm drip tape and anchor bio-mulch'),
          ($1, 'Transplant Field Bed', 'Transplanting', 0, 2.00, 'Field Crew', 'Plant at 12 inch in-row spacing and water in thoroughly'),
          ($1, 'First Cultivation & Weed', 'Cultivation', 7, 1.00, 'Field Hand', 'Wheel hoe bed shoulders and hand weed in-row'),
          ($1, 'Pest & Disease Inspection', 'Pest Control', 14, 0.50, 'Field Manager', 'Check undersides of leaves for aphids or flea beetles'),
          ($1, 'Harvest Window 1', 'Harvest', ${newVar.days_to_maturity || 65}, 2.50, 'Harvest Crew', 'Harvest prime quality produce at peak maturity'),
          ($1, 'Bed Termination & Flail Mow', 'Cleanup', ${(newVar.days_to_maturity || 65) + 21}, 1.00, 'Field Hand', 'Flail mow crop residue and prepare bed for next rotation')
      `, [tId]);
    }

    res.json({ success: true, data: { ...newCrop, template_id: firstTemplateId }, message: "Crop and growing template created successfully" });
  } catch (err) {
    console.error("Error creating crop:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/crops/:id - Update crop
router.put("/api/crops/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, custom_name, abbreviation, crop_family, genus, species,
      category, image_url, icon, color, description, is_active,
      specialised_plant_part, crop_type
    } = req.body;

    const result = await pool.query(
      `UPDATE vivas_crops SET
        name = COALESCE($1, name),
        custom_name = COALESCE($2, custom_name),
        abbreviation = COALESCE($3, abbreviation),
        crop_family = COALESCE($4, crop_family),
        genus = COALESCE($5, genus),
        species = COALESCE($6, species),
        category = COALESCE($7, category),
        image_url = COALESCE($8, image_url),
        icon = COALESCE($9, icon),
        color = COALESCE($10, color),
        description = COALESCE($11, description),
        is_active = COALESCE($12, is_active),
        specialised_plant_part = COALESCE($13, specialised_plant_part),
        crop_type = COALESCE($14, crop_type),
        updated_at = NOW()
       WHERE id = $15 RETURNING *`,
      [
        name ? name.trim() : null, custom_name || null, abbreviation ? abbreviation.trim().toUpperCase() : null,
        crop_family || null, genus || null, species || null, category || null,
        image_url || null, icon || null, color || null, description || null,
        is_active !== undefined ? is_active : null,
        specialised_plant_part !== undefined ? specialised_plant_part : null,
        crop_type || null, id
      ]
    );

    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Crop not found" });
    res.json({ success: true, data: result.rows[0], message: "Crop updated successfully" });
  } catch (err) {
    console.error("Error updating crop:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/crops/:id - Soft delete (archive)
router.delete("/api/crops/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Cross-module CHI guard (SRS 9.6): Block deletion if CHI media references this crop
    const chiMediaCheck = await pool.query(
      "SELECT COUNT(*) FROM ch_media WHERE crop_id = $1 AND deleted_at IS NULL",
      [id]
    );
    const chiMediaCount = parseInt(chiMediaCheck.rows[0].count, 10);
    if (chiMediaCount > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete crop because it is referenced by ${chiMediaCount} Crop Health images. Deactivate or re-assign them first.`,
        error: `Cannot delete crop: ${chiMediaCount} published CHI images reference it.`
      });
    }

    const result = await pool.query(
      "UPDATE vivas_crops SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Crop not found" });
    res.json({ success: true, message: "Crop archived successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/crops/:id/clone - Clone a crop as a new template
router.post("/api/crops/:id/clone", async (req, res) => {
  try {
    const { id } = req.params;
    const { new_name } = req.body;

    const sourceCrop = await pool.query("SELECT * FROM vivas_crops WHERE id = $1", [id]);
    if (sourceCrop.rowCount === 0) return res.status(404).json({ success: false, message: "Source crop not found" });

    const src = sourceCrop.rows[0];
    const cloneName = new_name || `${src.name} (Copy)`;
    const cloneAbbr = `${src.abbreviation || 'CRP'}-2`.slice(0, 20);

    const newCropRes = await pool.query(
      `INSERT INTO vivas_crops (name, custom_name, abbreviation, crop_family, genus, species, category, image_url, icon, color, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        cloneName, src.custom_name, cloneAbbr, src.crop_family,
        src.genus, src.species, src.category, src.image_url, src.icon, src.color, src.description
      ]
    );
    const newCrop = newCropRes.rows[0];

    // Clone all varieties
    const vars = await pool.query("SELECT * FROM vivas_crop_varieties WHERE crop_id = $1 AND is_active = TRUE", [id]);
    for (const v of vars.rows) {
      await pool.query(
        `INSERT INTO vivas_crop_varieties (
          crop_id, variety_name, supplier, days_to_maturity, days_to_germination,
          harvest_stage, planting_method, in_row_spacing_in, row_spacing_in, rows_per_bed,
          expected_yield_per_ft, yield_unit, default_price_per_unit, tray_size, notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          newCrop.id, v.variety_name, v.supplier, v.days_to_maturity, v.days_to_germination,
          v.harvest_stage, v.planting_method, v.in_row_spacing_in, v.row_spacing_in, v.rows_per_bed,
          v.expected_yield_per_ft, v.yield_unit, v.default_price_per_unit, v.tray_size, v.notes
        ]
      );
    }

    res.json({ success: true, data: newCrop, message: "Crop template cloned successfully" });
  } catch (err) {
    console.error("Error cloning crop:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/crops/:id/varieties - Add variety (or multiple varieties) to crop
router.post("/api/crops/:id/varieties", async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch master crop details for naming & attributes
    const cropMetaRes = await pool.query("SELECT name, image_url, icon, color FROM vivas_crops WHERE id = $1", [id]);
    if (cropMetaRes.rowCount === 0) {
      return res.status(404).json({ success: false, message: "Master crop not found" });
    }
    const masterCrop = cropMetaRes.rows[0];

    const inputVarieties = Array.isArray(req.body.varieties)
      ? req.body.varieties
      : [req.body];

    const createdVarieties = [];
    let firstTemplateId = null;

    for (const item of inputVarieties) {
      const vName = item.variety_name ? item.variety_name.trim() : '';
      if (!vName) continue;

      const descriptionText = item.description || item.variety_description || item.notes || null;

      const varRes = await pool.query(
        `INSERT INTO vivas_crop_varieties (
          crop_id, variety_name, supplier, description, days_to_maturity, days_to_germination,
          harvest_stage, planting_method, in_row_spacing_in, row_spacing_in, rows_per_bed,
          expected_yield_per_ft, yield_unit, default_price_per_unit, tray_size, notes,
          spacing_unit, expected_yield_per_acre
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
        [
          id, vName, item.supplier || null, descriptionText,
          item.days_to_maturity ? parseInt(item.days_to_maturity) : 60,
          item.days_to_germination ? parseInt(item.days_to_germination) : 7,
          item.harvest_stage || 'Mature', normalizePlantingMethod(item.planting_method),
          item.in_row_spacing_in ? parseFloat(item.in_row_spacing_in) : 0.35,
          item.row_spacing_in ? parseFloat(item.row_spacing_in) : 0.5,
          item.rows_per_bed ? parseInt(item.rows_per_bed) : 2,
          item.expected_yield_per_ft ? parseFloat(item.expected_yield_per_ft) : 1.5,
          item.yield_unit || 'Ton',
          item.default_price_per_unit ? parseFloat(item.default_price_per_unit) : 50.00,
          item.tray_size || '72-cell', descriptionText,
          item.spacing_unit || 'mtr',
          item.expected_yield_per_acre ? parseFloat(item.expected_yield_per_acre) : (parseFloat(item.expected_yield_per_ft || 1.5) * 8.5)
        ]
      );

      const newVar = varRes.rows[0];
      const templateName = `${masterCrop.name || 'Crop'} - ${newVar.variety_name}`;

      const tplRes = await pool.query(
        `INSERT INTO vivas_crop_templates (
          crop_id, variety_id, template_name, planting_method, tray_size, days_to_maturity,
          in_row_spacing_in, row_spacing_in, expected_yield_per_ft, yield_unit, default_price_per_unit,
          est_revenue_per_100ft_bed, image_url, description, notes,
          spacing_unit, expected_yield_per_acre
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
        [
          id, newVar.id, templateName,
          normalizePlantingMethod(newVar.planting_method), newVar.tray_size || '72-cell',
          newVar.days_to_maturity || 60,
          parseFloat(newVar.in_row_spacing_in) || 0.35,
          parseFloat(newVar.row_spacing_in) || 0.5,
          parseFloat(newVar.expected_yield_per_ft) || 1.5,
          newVar.yield_unit || 'Ton',
          parseFloat(newVar.default_price_per_unit) || 50.00,
          (parseFloat(newVar.expected_yield_per_ft || 1.5) * 100 * parseFloat(newVar.default_price_per_unit || 50.00)),
          masterCrop.image_url || null,
          descriptionText,
          descriptionText,
          newVar.spacing_unit || 'mtr',
          newVar.expected_yield_per_acre || (parseFloat(newVar.expected_yield_per_ft || 1.5) * 8.5)
        ]
      );

      const templateId = tplRes.rows[0]?.id;
      if (!firstTemplateId) firstTemplateId = templateId;

      if (templateId) {
        await pool.query(`
          INSERT INTO vivas_crop_nursery_tasks (template_id, task_name, task_category, offset_days, est_labor_hours, assigned_role, instructions)
          VALUES 
            ($1, 'Sow Seeds in Nursery Trays', 'Seeding', 0, 0.75, 'Nursery Tech', 'Sow 1 seed per cell in 72-cell trays with organic potting mix'),
            ($1, 'Move to Germination Chamber', 'Germination', 1, 0.25, 'Nursery Tech', 'Maintain 70-75°F temp and 90% humidity'),
            ($1, 'Move to Greenhouse Benches', 'Irrigation', 3, 0.50, 'Nursery Tech', 'Water gently twice daily with fine mist'),
            ($1, 'Thin Seedlings & Inspect', 'Thinning', 14, 0.75, 'Nursery Tech', 'Thin to strongest single seedling per cell'),
            ($1, 'Hardening Off Process', 'Hardening', 24, 0.50, 'Nursery Tech', 'Move trays to shade house before field transplanting')
        `, [templateId]);

        await pool.query(`
          INSERT INTO vivas_crop_field_tasks (template_id, task_name, task_category, offset_days, est_labor_hours, assigned_role, instructions)
          VALUES 
            ($1, 'Bed Preparation & Fertilize', 'Soil Prep', -7, 1.50, 'Field Hand', 'Chisel plow bed, add organic compost'),
            ($1, 'Lay Drip Line & Plastic Mulch', 'Irrigation', -3, 1.00, 'Field Hand', 'Install 16mm drip tape and anchor bio-mulch'),
            ($1, 'Transplant Field Bed', 'Transplanting', 0, 2.00, 'Field Crew', 'Plant at 12 inch in-row spacing and water in thoroughly'),
            ($1, 'First Cultivation & Weed', 'Cultivation', 7, 1.00, 'Field Hand', 'Wheel hoe bed shoulders and hand weed in-row'),
            ($1, 'Pest & Disease Inspection', 'Pest Control', 14, 0.50, 'Field Manager', 'Check undersides of leaves for pests'),
            ($1, 'Harvest Window 1', 'Harvest', ${newVar.days_to_maturity || 60}, 2.50, 'Harvest Crew', 'Harvest prime quality produce at peak maturity'),
            ($1, 'Bed Termination & Flail Mow', 'Cleanup', ${(newVar.days_to_maturity || 60) + 21}, 1.00, 'Field Hand', 'Flail mow crop residue and prepare bed for next rotation')
        `, [templateId]);
      }

      createdVarieties.push({ ...newVar, template_id: templateId });
    }

    if (createdVarieties.length === 0) {
      return res.status(400).json({ success: false, message: "Please enter at least one valid variety name" });
    }

    res.json({
      success: true,
      data: createdVarieties.length === 1 ? createdVarieties[0] : createdVarieties,
      varieties: createdVarieties,
      template_id: firstTemplateId,
      message: `${createdVarieties.length} ${createdVarieties.length === 1 ? 'variety' : 'varieties'} and growing template(s) added successfully`
    });
  } catch (err) {
    console.error("Error adding variety:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/crops/varieties/:varietyId - Update variety
router.put("/api/crops/varieties/:varietyId", async (req, res) => {
  try {
    const { varietyId } = req.params;
    const {
      variety_name, supplier, days_to_maturity, days_to_germination,
      harvest_stage, planting_method, in_row_spacing_in, row_spacing_in,
      rows_per_bed, expected_yield_per_ft, yield_unit, default_price_per_unit,
      tray_size, notes, is_active, spacing_unit, expected_yield_per_acre
    } = req.body;

    const result = await pool.query(
      `UPDATE vivas_crop_varieties SET
        variety_name = COALESCE($1, variety_name),
        supplier = COALESCE($2, supplier),
        days_to_maturity = COALESCE($3, days_to_maturity),
        days_to_germination = COALESCE($4, days_to_germination),
        harvest_stage = COALESCE($5, harvest_stage),
        planting_method = COALESCE($6, planting_method),
        in_row_spacing_in = COALESCE($7, in_row_spacing_in),
        row_spacing_in = COALESCE($8, row_spacing_in),
        rows_per_bed = COALESCE($9, rows_per_bed),
        expected_yield_per_ft = COALESCE($10, expected_yield_per_ft),
        yield_unit = COALESCE($11, yield_unit),
        default_price_per_unit = COALESCE($12, default_price_per_unit),
        tray_size = COALESCE($13, tray_size),
        notes = COALESCE($14, notes),
        is_active = COALESCE($15, is_active),
        spacing_unit = COALESCE($16, spacing_unit),
        expected_yield_per_acre = COALESCE($17, expected_yield_per_acre),
        updated_at = NOW()
       WHERE id = $18 RETURNING *`,
      [
        variety_name ? variety_name.trim() : null, supplier || null,
        days_to_maturity !== undefined ? parseInt(days_to_maturity) : null,
        days_to_germination !== undefined ? parseInt(days_to_germination) : null,
        harvest_stage || null, planting_method !== undefined ? normalizePlantingMethod(planting_method) : null,
        in_row_spacing_in !== undefined ? parseFloat(in_row_spacing_in) : null,
        row_spacing_in !== undefined ? parseFloat(row_spacing_in) : null,
        rows_per_bed !== undefined ? parseInt(rows_per_bed) : null,
        expected_yield_per_ft !== undefined ? parseFloat(expected_yield_per_ft) : null,
        yield_unit || null,
        default_price_per_unit !== undefined ? parseFloat(default_price_per_unit) : null,
        tray_size || null, notes || null,
        is_active !== undefined ? is_active : null,
        spacing_unit || null,
        expected_yield_per_acre !== undefined ? parseFloat(expected_yield_per_acre) : null,
        varietyId
      ]
    );

    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Variety not found" });
    res.json({ success: true, data: result.rows[0], message: "Variety updated successfully" });
  } catch (err) {
    console.error("Error updating variety:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/crops/varieties/:varietyId - Delete variety
router.delete("/api/crops/varieties/:varietyId", async (req, res) => {
  try {
    const { varietyId } = req.params;
    const result = await pool.query(
      "UPDATE vivas_crop_varieties SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id",
      [varietyId]
    );
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Variety not found" });
    res.json({ success: true, message: "Variety removed successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/harvest-stages
router.get("/api/harvest-stages", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM vivas_harvest_stages ORDER BY id ASC");
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/seed-suppliers
router.get("/api/seed-suppliers", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM vivas_seed_suppliers ORDER BY supplier_name ASC");
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/crops/templates - List templates with parameters & tasks
router.get("/api/crops/templates", async (req, res) => {
  try {
    const { parentcropid, varietyid, harveststageid } = req.query;
    let query = `
      SELECT t.*,
             c.name as crop_name, c.custom_name, c.scientific_name, c.abbreviation, c.genus, c.species, c.crop_family, c.category, c.icon, c.color, c.description,
             COALESCE(t.image_url, c.image_url) as image_url, c.image_url as crop_image_url,
             v.variety_name, v.supplier,
             hs.stage_name as harvest_stage_name,
             ss.supplier_name as seed_supplier_name,
             (SELECT COALESCE(json_agg(nt ORDER BY nt.offset_days ASC), '[]') FROM vivas_crop_nursery_tasks nt WHERE nt.template_id = t.id) as nursery_tasks,
             (SELECT COALESCE(json_agg(ft ORDER BY ft.offset_days ASC), '[]') FROM vivas_crop_field_tasks ft WHERE ft.template_id = t.id) as field_tasks
      FROM vivas_crop_templates t
      LEFT JOIN vivas_crops c ON t.crop_id = c.id
      LEFT JOIN vivas_crop_varieties v ON t.variety_id = v.id
      LEFT JOIN vivas_harvest_stages hs ON t.harvest_stage_id = hs.id
      LEFT JOIN vivas_seed_suppliers ss ON t.supplier_id = ss.id
      WHERE t.is_active = TRUE
    `;
    const params = [];

    if (parentcropid) {
      params.push(parentcropid);
      query += ` AND t.crop_id = $${params.length}`;
    }
    if (varietyid) {
      params.push(varietyid);
      query += ` AND t.variety_id = $${params.length}`;
    }
    if (harveststageid) {
      params.push(harveststageid);
      query += ` AND t.harvest_stage_id = $${params.length}`;
    }

    query += ` ORDER BY t.created_at DESC`;
    const result = await pool.query(query, params);
    let templatesList = [...result.rows];

    // Ensure every master crop in vivas_crops is represented in the Crop Library
    const existingCropIds = new Set(templatesList.map(t => String(t.crop_id)));

    const masterCropsRes = await pool.query(`
      SELECT c.*, 
             COALESCE(json_agg(v.*) FILTER (WHERE v.id IS NOT NULL), '[]') AS varieties
      FROM vivas_crops c
      LEFT JOIN vivas_crop_varieties v ON v.crop_id = c.id AND v.is_active = TRUE
      WHERE c.is_active = TRUE
      GROUP BY c.id
      ORDER BY c.name ASC
    `);

    for (const crop of masterCropsRes.rows) {
      if (!existingCropIds.has(String(crop.id))) {
        const vars = (Array.isArray(crop.varieties) && crop.varieties.length > 0)
          ? crop.varieties
          : [{ id: null, variety_name: 'Standard', planting_method: 'Transplant', days_to_maturity: 65, expected_yield_per_ft: 1.5, yield_unit: 'kg', default_price_per_unit: 50.00 }];
        for (const v of vars) {
          templatesList.push({
            id: `template-synth-${crop.id}-${v.id || 'std'}`,
            crop_id: crop.id,
            variety_id: v.id || null,
            template_name: `${crop.name} - ${v.variety_name || 'Standard'}`,
            crop_name: crop.name,
            custom_name: crop.custom_name,
            scientific_name: crop.scientific_name,
            abbreviation: crop.abbreviation,
            genus: crop.genus,
            species: crop.species,
            crop_family: crop.crop_family,
            category: crop.category || 'Vegetables',
            icon: crop.icon || '🌱',
            color: crop.color || '#16a34a',
            description: crop.description,
            image_url: crop.image_url,
            crop_image_url: crop.image_url,
            variety_name: v.variety_name || 'Standard',
            supplier: v.supplier || 'Standard Seeds',
            days_to_maturity: v.days_to_maturity || 65,
            days_to_germination: v.days_to_germination || 7,
            planting_method: v.planting_method || 'Transplant',
            spacing_unit: v.spacing_unit || 'mtr',
            in_row_spacing_in: v.in_row_spacing_in || 0.35,
            row_spacing_in: v.row_spacing_in || 0.5,
            rows_per_bed: v.rows_per_bed || 2,
            expected_yield_per_acre: v.expected_yield_per_acre || (parseFloat(v.expected_yield_per_ft || 1.5) * 8.5),
            expected_yield_per_ft: v.expected_yield_per_ft || 1.5,
            yield_unit: v.yield_unit || 'Ton',
            default_price_per_unit: v.default_price_per_unit || 50.00,
            est_revenue_per_100ft_bed: (parseFloat(v.expected_yield_per_ft) || 1.5) * 100 * (parseFloat(v.default_price_per_unit) || 50.00),
            tray_size: v.tray_size || '72-cell',
            nursery_tasks: [],
            field_tasks: []
          });
        }
      }
    }

    res.json({ success: true, data: templatesList });
  } catch (err) {
    console.error("Error fetching templates:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/crops/templates/:id - Single Template detail
router.get("/api/crops/templates/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (id.startsWith("template-synth-")) {
      const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
      const matches = id.match(uuidRegex);
      if (matches && matches.length > 0) {
        const cropId = matches[0];
        const varietyId = (matches.length > 1 && matches[1] !== 'std') ? matches[1] : null;

        let realQuery = `
          SELECT t.*,
                 c.name as crop_name, c.custom_name, c.scientific_name, c.abbreviation, c.genus, c.species, c.crop_family, c.category, c.icon, c.color, c.description,
                 COALESCE(t.image_url, c.image_url) as image_url, c.image_url as crop_image_url,
                 v.variety_name, v.supplier,
                 hs.stage_name as harvest_stage_name,
                 ss.supplier_name as seed_supplier_name,
                 (SELECT COALESCE(json_agg(nt ORDER BY nt.offset_days ASC), '[]') FROM vivas_crop_nursery_tasks nt WHERE nt.template_id = t.id) as nursery_tasks,
                 (SELECT COALESCE(json_agg(ft ORDER BY ft.offset_days ASC), '[]') FROM vivas_crop_field_tasks ft WHERE ft.template_id = t.id) as field_tasks
          FROM vivas_crop_templates t
          LEFT JOIN vivas_crops c ON t.crop_id = c.id
          LEFT JOIN vivas_crop_varieties v ON t.variety_id = v.id
          LEFT JOIN vivas_harvest_stages hs ON t.harvest_stage_id = hs.id
          LEFT JOIN vivas_seed_suppliers ss ON t.supplier_id = ss.id
          WHERE t.crop_id = $1 AND t.is_active = TRUE
        `;
        const realParams = [cropId];
        if (varietyId) {
          realQuery += ` AND t.variety_id = $2`;
          realParams.push(varietyId);
        }
        realQuery += ` LIMIT 1`;

        const realRes = await pool.query(realQuery, realParams);
        if (realRes.rowCount > 0) {
          return res.json({ success: true, data: realRes.rows[0] });
        }

        const cropRes = await pool.query("SELECT * FROM vivas_crops WHERE id = $1 AND is_active = TRUE", [cropId]);
        if (cropRes.rowCount === 0) return res.status(404).json({ success: false, message: "Crop not found" });
        const crop = cropRes.rows[0];

        let v = { id: null, variety_name: 'Standard', planting_method: 'Transplant', days_to_maturity: 65, expected_yield_per_ft: 1.5, yield_unit: 'kg', default_price_per_unit: 50.00 };
        if (varietyId) {
          const varRes = await pool.query("SELECT * FROM vivas_crop_varieties WHERE id = $1 AND is_active = TRUE", [varietyId]);
          if (varRes.rowCount > 0) v = varRes.rows[0];
        }

        const synthData = {
          id: id,
          crop_id: crop.id,
          variety_id: v.id || null,
          template_name: `${crop.name} - ${v.variety_name || 'Standard'}`,
          crop_name: crop.name,
          custom_name: crop.custom_name,
          scientific_name: crop.scientific_name,
          abbreviation: crop.abbreviation,
          genus: crop.genus,
          species: crop.species,
          crop_family: crop.crop_family,
          category: crop.category || 'Vegetables',
          icon: crop.icon || '🌱',
          color: crop.color || '#16a34a',
          description: crop.description,
          image_url: crop.image_url,
          crop_image_url: crop.image_url,
          variety_name: v.variety_name || 'Standard',
          supplier: v.supplier || 'Standard Seeds',
          days_to_maturity: v.days_to_maturity || 65,
          days_to_germination: v.days_to_germination || 7,
          planting_method: v.planting_method || 'Transplant',
          in_row_spacing_in: v.in_row_spacing_in || 12,
          row_spacing_in: v.row_spacing_in || 18,
          rows_per_bed: v.rows_per_bed || 2,
          expected_yield_per_ft: v.expected_yield_per_ft || 1.5,
          yield_unit: v.yield_unit || 'kg',
          default_price_per_unit: v.default_price_per_unit || 50.00,
          est_revenue_per_100ft_bed: (parseFloat(v.expected_yield_per_ft) || 1.5) * 100 * (parseFloat(v.default_price_per_unit) || 50.00),
          tray_size: v.tray_size || '72-cell',
          nursery_tasks: [],
          field_tasks: []
        };
        return res.json({ success: true, data: synthData });
      }
    }

    const result = await pool.query(`
      SELECT t.*,
             c.name as crop_name, c.custom_name, c.scientific_name, c.abbreviation, c.genus, c.species, c.crop_family, c.category, c.icon, c.color, c.description,
             COALESCE(t.image_url, c.image_url) as image_url, c.image_url as crop_image_url,
             v.variety_name, v.supplier,
             hs.stage_name as harvest_stage_name,
             ss.supplier_name as seed_supplier_name,
             (SELECT COALESCE(json_agg(nt ORDER BY nt.offset_days ASC), '[]') FROM vivas_crop_nursery_tasks nt WHERE nt.template_id = t.id) as nursery_tasks,
             (SELECT COALESCE(json_agg(ft ORDER BY ft.offset_days ASC), '[]') FROM vivas_crop_field_tasks ft WHERE ft.template_id = t.id) as field_tasks
      FROM vivas_crop_templates t
      LEFT JOIN vivas_crops c ON t.crop_id = c.id
      LEFT JOIN vivas_crop_varieties v ON t.variety_id = v.id
      LEFT JOIN vivas_harvest_stages hs ON t.harvest_stage_id = hs.id
      LEFT JOIN vivas_seed_suppliers ss ON t.supplier_id = ss.id
      WHERE t.id = $1
    `, [id]);

    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Template not found" });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/crops/templates - Create template
router.post("/api/crops/templates", async (req, res) => {
  try {
    const {
      crop_id, variety_id, harvest_stage_id, supplier_id, template_name, image_url,
      soil_ph_min, soil_ph_max, frost_tolerance, light_requirement, seasonality,
      planting_method, tray_size, seeds_per_cell, days_in_nursery, hardening_off_days,
      germination_temp_f, days_to_germination, nursery_target_stage_temp_f, target_germination_rate_pct,
      bed_width_in, bed_length_ft, rows_per_bed, in_row_spacing_in, row_spacing_in, planting_depth_in,
      days_to_maturity, target_plants_per_100ft, expected_yield_per_ft, yield_unit, default_price_per_unit,
      harvest_window_days, est_revenue_per_100ft_bed, notes
    } = req.body;

    const result = await pool.query(`
      INSERT INTO vivas_crop_templates (
        crop_id, variety_id, harvest_stage_id, supplier_id, template_name, image_url,
        soil_ph_min, soil_ph_max, frost_tolerance, light_requirement, seasonality,
        planting_method, tray_size, seeds_per_cell, days_in_nursery, hardening_off_days,
        germination_temp_f, days_to_germination, nursery_target_stage_temp_f, target_germination_rate_pct,
        bed_width_in, bed_length_ft, rows_per_bed, in_row_spacing_in, row_spacing_in, planting_depth_in,
        days_to_maturity, target_plants_per_100ft, expected_yield_per_ft, yield_unit, default_price_per_unit,
        harvest_window_days, est_revenue_per_100ft_bed, notes
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34
      ) RETURNING *
    `, [
      crop_id, variety_id, harvest_stage_id || null, supplier_id || null, template_name || 'Standard Template', image_url || null,
      soil_ph_min || 6.0, soil_ph_max || 6.8, frost_tolerance || 'Tender', light_requirement || 'Full Sun', seasonality || 'Warm Season',
      planting_method || 'Transplant', tray_size || '72-cell', seeds_per_cell || 1, days_in_nursery || 28, hardening_off_days || 5,
      germination_temp_f || '65-75°F', days_to_germination || 7, nursery_target_stage_temp_f || '70°F', target_germination_rate_pct || 90.0,
      bed_width_in || 30, bed_length_ft || 100, rows_per_bed || 2, in_row_spacing_in || 12, row_spacing_in || 18, planting_depth_in || 0.25,
      days_to_maturity || 65, target_plants_per_100ft || 200, expected_yield_per_ft || 1.5, yield_unit || 'kg', default_price_per_unit || 50,
      harvest_window_days || 21, est_revenue_per_100ft_bed || 15000, notes || ''
    ]);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("Error creating template:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/crops/templates/:id - Update template
router.put("/api/crops/templates/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      crop_name, custom_name, scientific_name, abbreviation, genus, species, crop_family, category, description, icon, color, image_url,
      variety_name, supplier,
      template_name, soil_ph_min, soil_ph_max, frost_tolerance, light_requirement, seasonality,
      planting_method, tray_size, seeds_per_cell, days_in_nursery, hardening_off_days,
      germination_temp_f, days_to_germination, nursery_target_stage_temp_f, target_germination_rate_pct,
      bed_width_in, bed_length_ft, rows_per_bed, in_row_spacing_in, row_spacing_in, planting_depth_in,
      days_to_maturity, target_plants_per_100ft, expected_yield_per_ft, yield_unit, default_price_per_unit,
      harvest_window_days, est_revenue_per_100ft_bed, notes,
      spacing_unit, expected_yield_per_acre,
      seeds_per_oz, seeds_per_gram, seed_viability_years, seed_type, seed_size,
      growth_habit, plant_height_in, plant_spread_in, crop_lifecycle, harvest_part, harvest_method,
      water_needs, ideal_temp_f,
      soil_type, nutrient_demand, companion_plants, incompatible_plants, common_pests, disease_resistance,
      nursery_notes, field_notes, harvest_notes
    } = req.body;

    let targetTemplateId = id;

    if (id.startsWith("template-synth-")) {
      const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
      const matches = id.match(uuidRegex);
      const synthCropId = (matches && matches.length > 0) ? matches[0] : null;
      const synthVarietyId = (matches && matches.length > 1 && matches[1] !== 'std') ? matches[1] : null;

      let checkT;
      if (synthVarietyId) {
        checkT = await pool.query("SELECT id FROM vivas_crop_templates WHERE crop_id = $1 AND variety_id = $2 AND is_active = TRUE LIMIT 1", [synthCropId, synthVarietyId]);
      } else {
        checkT = await pool.query("SELECT id FROM vivas_crop_templates WHERE crop_id = $1 AND is_active = TRUE LIMIT 1", [synthCropId]);
      }

      if (checkT.rowCount > 0) {
        targetTemplateId = checkT.rows[0].id;
      } else {
        const tName = template_name || `${crop_name || 'Crop'} - ${variety_name || 'Standard'}`;
        const insT = await pool.query(`
          INSERT INTO vivas_crop_templates (
            crop_id, variety_id, template_name, planting_method, tray_size, seeds_per_cell, days_in_nursery,
            days_to_maturity, in_row_spacing_in, row_spacing_in, expected_yield_per_ft, yield_unit, default_price_per_unit,
            est_revenue_per_100ft_bed, description
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
          RETURNING id
        `, [
          synthCropId, synthVarietyId, tName,
          planting_method || 'Transplant', tray_size || '72-cell', seeds_per_cell || 1, days_in_nursery || 28,
          days_to_maturity || 65, in_row_spacing_in || 12, row_spacing_in || 18,
          expected_yield_per_ft || 1.5, yield_unit || 'kg', default_price_per_unit || 50,
          est_revenue_per_100ft_bed || 15000, description || null
        ]);
        targetTemplateId = insT.rows[0].id;
      }
    }

    const currentTRes = await pool.query("SELECT * FROM vivas_crop_templates WHERE id = $1", [targetTemplateId]);
    if (currentTRes.rowCount === 0) return res.status(404).json({ success: false, message: "Template not found" });
    const currentT = currentTRes.rows[0];

    // Update parent vivas_crops if crop parameters supplied
    if (currentT.crop_id && (crop_name !== undefined || custom_name !== undefined || scientific_name !== undefined || abbreviation !== undefined || genus !== undefined || species !== undefined || crop_family !== undefined || category !== undefined || description !== undefined || icon !== undefined || color !== undefined || image_url !== undefined)) {
      await pool.query(`
        UPDATE vivas_crops SET
          name = COALESCE($1, name),
          custom_name = COALESCE($2, custom_name),
          scientific_name = COALESCE($3, scientific_name),
          abbreviation = COALESCE($4, abbreviation),
          genus = COALESCE($5, genus),
          species = COALESCE($6, species),
          crop_family = COALESCE($7, crop_family),
          category = COALESCE($8, category),
          description = COALESCE($9, description),
          icon = COALESCE($10, icon),
          color = COALESCE($11, color),
          image_url = COALESCE($12, image_url),
          updated_at = NOW()
        WHERE id = $13
      `, [
        crop_name !== undefined ? crop_name : null,
        custom_name !== undefined ? custom_name : null,
        scientific_name !== undefined ? scientific_name : null,
        abbreviation !== undefined ? abbreviation : null,
        genus !== undefined ? genus : null,
        species !== undefined ? species : null,
        crop_family !== undefined ? crop_family : null,
        category !== undefined ? category : null,
        description !== undefined ? description : null,
        icon !== undefined ? icon : null,
        color !== undefined ? color : null,
        image_url !== undefined ? image_url : null,
        currentT.crop_id
      ]);
    }

    // Update linked vivas_crop_varieties
    if (currentT.variety_id && (variety_name !== undefined || supplier !== undefined || days_to_maturity !== undefined || planting_method !== undefined || in_row_spacing_in !== undefined || row_spacing_in !== undefined || spacing_unit !== undefined || expected_yield_per_acre !== undefined)) {
      await pool.query(`
        UPDATE vivas_crop_varieties SET
          variety_name = COALESCE($1, variety_name),
          supplier = COALESCE($2, supplier),
          days_to_maturity = COALESCE($3, days_to_maturity),
          planting_method = COALESCE($4, planting_method),
          in_row_spacing_in = COALESCE($5, in_row_spacing_in),
          row_spacing_in = COALESCE($6, row_spacing_in),
          spacing_unit = COALESCE($7, spacing_unit),
          expected_yield_per_acre = COALESCE($8, expected_yield_per_acre),
          updated_at = NOW()
        WHERE id = $9
      `, [
        variety_name !== undefined ? variety_name : null,
        supplier !== undefined ? supplier : null,
        days_to_maturity !== undefined ? (days_to_maturity === '' ? null : days_to_maturity) : null,
        planting_method !== undefined ? normalizePlantingMethod(planting_method) : null,
        in_row_spacing_in !== undefined ? (in_row_spacing_in === '' ? null : in_row_spacing_in) : null,
        row_spacing_in !== undefined ? (row_spacing_in === '' ? null : row_spacing_in) : null,
        spacing_unit !== undefined ? spacing_unit : null,
        expected_yield_per_acre !== undefined ? (expected_yield_per_acre === '' ? null : expected_yield_per_acre) : null,
        currentT.variety_id
      ]);
    }

    const result = await pool.query(`
      UPDATE vivas_crop_templates SET
        template_name = COALESCE($1, template_name),
        soil_ph_min = COALESCE($2, soil_ph_min),
        soil_ph_max = COALESCE($3, soil_ph_max),
        frost_tolerance = COALESCE($4, frost_tolerance),
        light_requirement = COALESCE($5, light_requirement),
        seasonality = COALESCE($6, seasonality),
        planting_method = COALESCE($7, planting_method),
        tray_size = COALESCE($8, tray_size),
        seeds_per_cell = COALESCE($9, seeds_per_cell),
        days_in_nursery = COALESCE($10, days_in_nursery),
        hardening_off_days = COALESCE($11, hardening_off_days),
        germination_temp_f = COALESCE($12, germination_temp_f),
        days_to_germination = COALESCE($13, days_to_germination),
        nursery_target_stage_temp_f = COALESCE($14, nursery_target_stage_temp_f),
        target_germination_rate_pct = COALESCE($15, target_germination_rate_pct),
        bed_width_in = COALESCE($16, bed_width_in),
        bed_length_ft = COALESCE($17, bed_length_ft),
        rows_per_bed = COALESCE($18, rows_per_bed),
        in_row_spacing_in = COALESCE($19, in_row_spacing_in),
        row_spacing_in = COALESCE($20, row_spacing_in),
        planting_depth_in = COALESCE($21, planting_depth_in),
        days_to_maturity = COALESCE($22, days_to_maturity),
        target_plants_per_100ft = COALESCE($23, target_plants_per_100ft),
        expected_yield_per_ft = COALESCE($24, expected_yield_per_ft),
        yield_unit = COALESCE($25, yield_unit),
        default_price_per_unit = COALESCE($26, default_price_per_unit),
        harvest_window_days = COALESCE($27, harvest_window_days),
        est_revenue_per_100ft_bed = COALESCE($28, est_revenue_per_100ft_bed),
        notes = COALESCE($29, notes),
        seeds_per_oz = COALESCE($30, seeds_per_oz),
        seeds_per_gram = COALESCE($31, seeds_per_gram),
        seed_viability_years = COALESCE($32, seed_viability_years),
        seed_type = COALESCE($33, seed_type),
        seed_size = COALESCE($34, seed_size),
        growth_habit = COALESCE($35, growth_habit),
        plant_height_in = COALESCE($36, plant_height_in),
        plant_spread_in = COALESCE($37, plant_spread_in),
        crop_lifecycle = COALESCE($38, crop_lifecycle),
        harvest_part = COALESCE($39, harvest_part),
        harvest_method = COALESCE($40, harvest_method),
        water_needs = COALESCE($41, water_needs),
        ideal_temp_f = COALESCE($42, ideal_temp_f),
        soil_type = COALESCE($43, soil_type),
        nutrient_demand = COALESCE($44, nutrient_demand),
        companion_plants = COALESCE($45, companion_plants),
        incompatible_plants = COALESCE($46, incompatible_plants),
        common_pests = COALESCE($47, common_pests),
        disease_resistance = COALESCE($48, disease_resistance),
        nursery_notes = COALESCE($49, nursery_notes),
        field_notes = COALESCE($50, field_notes),
        harvest_notes = COALESCE($51, harvest_notes),
        image_url = COALESCE($52, image_url),
        spacing_unit = COALESCE($53, spacing_unit),
        expected_yield_per_acre = COALESCE($54, expected_yield_per_acre),
        updated_at = NOW()
      WHERE id = $55
      RETURNING *
    `, [
      template_name !== undefined ? template_name : null,
      soil_ph_min !== undefined ? (soil_ph_min === '' ? null : soil_ph_min) : null,
      soil_ph_max !== undefined ? (soil_ph_max === '' ? null : soil_ph_max) : null,
      frost_tolerance !== undefined ? frost_tolerance : null,
      light_requirement !== undefined ? light_requirement : null,
      seasonality !== undefined ? seasonality : null,
      planting_method !== undefined ? normalizePlantingMethod(planting_method) : null,
      tray_size !== undefined ? tray_size : null,
      seeds_per_cell !== undefined ? (seeds_per_cell === '' ? null : seeds_per_cell) : null,
      days_in_nursery !== undefined ? (days_in_nursery === '' ? null : days_in_nursery) : null,
      hardening_off_days !== undefined ? (hardening_off_days === '' ? null : hardening_off_days) : null,
      germination_temp_f !== undefined ? germination_temp_f : null,
      days_to_germination !== undefined ? (days_to_germination === '' ? null : days_to_germination) : null,
      nursery_target_stage_temp_f !== undefined ? nursery_target_stage_temp_f : null,
      target_germination_rate_pct !== undefined ? (target_germination_rate_pct === '' ? null : target_germination_rate_pct) : null,
      bed_width_in !== undefined ? (bed_width_in === '' ? null : bed_width_in) : null,
      bed_length_ft !== undefined ? (bed_length_ft === '' ? null : bed_length_ft) : null,
      rows_per_bed !== undefined ? (rows_per_bed === '' ? null : rows_per_bed) : null,
      in_row_spacing_in !== undefined ? (in_row_spacing_in === '' ? null : in_row_spacing_in) : null,
      row_spacing_in !== undefined ? (row_spacing_in === '' ? null : row_spacing_in) : null,
      planting_depth_in !== undefined ? (planting_depth_in === '' ? null : planting_depth_in) : null,
      days_to_maturity !== undefined ? (days_to_maturity === '' ? null : days_to_maturity) : null,
      target_plants_per_100ft !== undefined ? (target_plants_per_100ft === '' ? null : target_plants_per_100ft) : null,
      expected_yield_per_ft !== undefined ? (expected_yield_per_ft === '' ? null : expected_yield_per_ft) : null,
      yield_unit !== undefined ? yield_unit : null,
      default_price_per_unit !== undefined ? (default_price_per_unit === '' ? null : default_price_per_unit) : null,
      harvest_window_days !== undefined ? (harvest_window_days === '' ? null : harvest_window_days) : null,
      est_revenue_per_100ft_bed !== undefined ? (est_revenue_per_100ft_bed === '' ? null : est_revenue_per_100ft_bed) : null,
      notes !== undefined ? notes : null,
      seeds_per_oz !== undefined ? (seeds_per_oz === '' ? null : seeds_per_oz) : null,
      seeds_per_gram !== undefined ? (seeds_per_gram === '' ? null : seeds_per_gram) : null,
      seed_viability_years !== undefined ? (seed_viability_years === '' ? null : seed_viability_years) : null,
      seed_type !== undefined ? seed_type : null,
      seed_size !== undefined ? seed_size : null,
      growth_habit !== undefined ? growth_habit : null,
      plant_height_in !== undefined ? (plant_height_in === '' ? null : plant_height_in) : null,
      plant_spread_in !== undefined ? (plant_spread_in === '' ? null : plant_spread_in) : null,
      crop_lifecycle !== undefined ? crop_lifecycle : null,
      harvest_part !== undefined ? harvest_part : null,
      harvest_method !== undefined ? harvest_method : null,
      water_needs !== undefined ? water_needs : null,
      ideal_temp_f !== undefined ? ideal_temp_f : null,
      soil_type !== undefined ? soil_type : null,
      nutrient_demand !== undefined ? nutrient_demand : null,
      companion_plants !== undefined ? companion_plants : null,
      incompatible_plants !== undefined ? incompatible_plants : null,
      common_pests !== undefined ? common_pests : null,
      disease_resistance !== undefined ? disease_resistance : null,
      nursery_notes !== undefined ? nursery_notes : null,
      field_notes !== undefined ? field_notes : null,
      harvest_notes !== undefined ? harvest_notes : null,
      image_url !== undefined ? image_url : null,
      spacing_unit !== undefined ? spacing_unit : null,
      expected_yield_per_acre !== undefined ? (expected_yield_per_acre === '' ? null : expected_yield_per_acre) : null,
      targetTemplateId
    ]);

    // Re-fetch full joined template row to return all fields (crop_name, variety_name, etc.)
    const fullUpdatedRes = await pool.query(`
      SELECT t.*,
             c.name as crop_name, c.custom_name, c.scientific_name, c.abbreviation, c.genus, c.species, c.crop_family, c.category, c.icon, c.color, c.description,
             COALESCE(t.image_url, c.image_url) as image_url, c.image_url as crop_image_url,
             v.variety_name, v.supplier,
             hs.stage_name as harvest_stage_name,
             ss.supplier_name as seed_supplier_name,
             (SELECT COALESCE(json_agg(nt ORDER BY nt.offset_days ASC), '[]') FROM vivas_crop_nursery_tasks nt WHERE nt.template_id = t.id) as nursery_tasks,
             (SELECT COALESCE(json_agg(ft ORDER BY ft.offset_days ASC), '[]') FROM vivas_crop_field_tasks ft WHERE ft.template_id = t.id) as field_tasks
      FROM vivas_crop_templates t
      LEFT JOIN vivas_crops c ON t.crop_id = c.id
      LEFT JOIN vivas_crop_varieties v ON t.variety_id = v.id
      LEFT JOIN vivas_harvest_stages hs ON t.harvest_stage_id = hs.id
      LEFT JOIN vivas_seed_suppliers ss ON t.supplier_id = ss.id
      WHERE t.id = $1
    `, [targetTemplateId]);

    res.json({ success: true, data: fullUpdatedRes.rows[0] });
  } catch (err) {
    console.error("Error updating template:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to check if a crop has any remaining active varieties or templates
async function checkAndCleanCropActiveState(cropId) {
  if (!cropId) return;
  const activeVars = await pool.query(
    "SELECT 1 FROM vivas_crop_varieties WHERE crop_id = $1 AND is_active = TRUE LIMIT 1",
    [cropId]
  );
  const activeTpls = await pool.query(
    "SELECT 1 FROM vivas_crop_templates WHERE crop_id = $1 AND is_active = TRUE LIMIT 1",
    [cropId]
  );

  if (activeVars.rows.length === 0 && activeTpls.rows.length === 0) {
    await pool.query("UPDATE vivas_crops SET is_active = FALSE, updated_at = NOW() WHERE id = $1", [cropId]);
  }
}

// DELETE /api/crops/templates/:id
router.delete("/api/crops/templates/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (id.startsWith("template-synth-")) {
      const uuidRegex = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;
      const matches = id.match(uuidRegex);

      if (matches && matches.length > 0) {
        const cropId = matches[0];
        const varietyId = (matches.length > 1 && matches[1] !== 'std') ? matches[1] : null;

        if (varietyId) {
          // Deactivate only this specific variety and its templates
          await pool.query("UPDATE vivas_crop_varieties SET is_active = FALSE, updated_at = NOW() WHERE id = $1", [varietyId]);
          await pool.query("UPDATE vivas_crop_templates SET is_active = FALSE, updated_at = NOW() WHERE variety_id = $1", [varietyId]);
          await checkAndCleanCropActiveState(cropId);
        } else {
          // No specific variety: deactivate master crop and all its varieties & templates
          await pool.query("UPDATE vivas_crops SET is_active = FALSE, updated_at = NOW() WHERE id = $1", [cropId]);
          await pool.query("UPDATE vivas_crop_templates SET is_active = FALSE, updated_at = NOW() WHERE crop_id = $1", [cropId]);
          await pool.query("UPDATE vivas_crop_varieties SET is_active = FALSE, updated_at = NOW() WHERE crop_id = $1", [cropId]);
        }
      }
      return res.json({ success: true, message: "Crop variety archived successfully" });
    }

    // Standard Template UUID
    const templateRes = await pool.query("SELECT crop_id, variety_id FROM vivas_crop_templates WHERE id = $1", [id]);
    await pool.query("UPDATE vivas_crop_templates SET is_active = FALSE, updated_at = NOW() WHERE id = $1", [id]);

    if (templateRes.rows.length > 0) {
      const { crop_id, variety_id } = templateRes.rows[0];
      if (variety_id) {
        await pool.query("UPDATE vivas_crop_varieties SET is_active = FALSE, updated_at = NOW() WHERE id = $1", [variety_id]);
      }
      if (crop_id) {
        await checkAndCleanCropActiveState(crop_id);
      }
    }

    res.json({ success: true, message: "Template archived successfully" });
  } catch (err) {
    console.error("Error archiving template:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/crops/templates/:id/nursery-tasks - Add custom automated nursery task
router.post("/api/crops/templates/:id/nursery-tasks", async (req, res) => {
  try {
    const { id } = req.params;
    const { task_name, task_category, offset_days, est_labor_hours, assigned_role, instructions } = req.body;
    const result = await pool.query(`
      INSERT INTO vivas_crop_nursery_tasks (template_id, task_name, task_category, offset_days, est_labor_hours, assigned_role, instructions)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [id, task_name, task_category || 'Seeding', offset_days || 0, est_labor_hours || 0.5, assigned_role || 'Nursery Tech', instructions || '']);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/crops/templates/:id/field-tasks - Add custom automated field task
router.post("/api/crops/templates/:id/field-tasks", async (req, res) => {
  try {
    const { id } = req.params;
    const { task_name, task_category, offset_days, est_labor_hours, assigned_role, instructions } = req.body;
    const result = await pool.query(`
      INSERT INTO vivas_crop_field_tasks (template_id, task_name, task_category, offset_days, est_labor_hours, assigned_role, instructions)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *
    `, [id, task_name, task_category || 'Transplanting', offset_days || 0, est_labor_hours || 1.0, assigned_role || 'Field Hand', instructions || '']);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/crops/nursery-tasks/:taskId
router.delete("/api/crops/nursery-tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    await pool.query("DELETE FROM vivas_crop_nursery_tasks WHERE id = $1", [taskId]);
    res.json({ success: true, message: "Nursery task deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/crops/field-tasks/:taskId
router.delete("/api/crops/field-tasks/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    await pool.query("DELETE FROM vivas_crop_field_tasks WHERE id = $1", [taskId]);
    res.json({ success: true, message: "Field task deleted" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------
// CROP PLAN / PLANTINGS
// -------------------

// GET /api/plantings - List plantings with full filters
router.get("/api/plantings", async (req, res) => {
  try {
    const { season, location_id, crop_id, status, search } = req.query;
    let q = `
      SELECT p.*, c.icon AS crop_icon, c.color AS crop_color, c.category AS crop_category
      FROM vivas_plantings p
      LEFT JOIN vivas_crops c ON c.id = p.crop_id
      WHERE 1=1
    `;
    const params = [];

    if (season && season !== 'All') {
      params.push(parseInt(season));
      q += ` AND p.season_year = $${params.length}`;
    }

    if (location_id && location_id !== 'All') {
      params.push(parseInt(location_id));
      q += ` AND p.location_id = $${params.length}`;
    }

    if (crop_id && crop_id !== 'All') {
      params.push(crop_id);
      q += ` AND p.crop_id = $${params.length}`;
    }

    if (status && status !== 'All') {
      params.push(status);
      q += ` AND p.status = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      q += ` AND (p.crop_name ILIKE $${params.length} OR p.variety_name ILIKE $${params.length} OR p.planting_id ILIKE $${params.length} OR p.location_name ILIKE $${params.length} OR p.bed_names ILIKE $${params.length})`;
    }

    q += ` ORDER BY p.sow_date ASC NULLS LAST, p.plant_date ASC NULLS LAST, p.created_at DESC`;
    const result = await pool.query(q, params);
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (err) {
    console.error("Error fetching plantings:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/plantings/stats - Aggregate stats for Crop Plan dashboard
router.get("/api/plantings/stats", async (req, res) => {
  try {
    const { season } = req.query;
    const seasonYear = season ? parseInt(season) : 2026;

    const statsRes = await pool.query(`
      SELECT 
        COUNT(*)::int AS total_plantings,
        COUNT(DISTINCT crop_name)::int AS total_crops,
        COALESCE(SUM(bed_feet), 0)::numeric AS total_bed_feet,
        COALESCE(SUM(target_yield), 0)::numeric AS total_target_yield,
        COALESCE(SUM(estimated_revenue), 0)::numeric AS total_estimated_revenue,
        COUNT(*) FILTER (WHERE status = 'in_ground')::int AS in_ground_count,
        COUNT(*) FILTER (WHERE status = 'harvesting')::int AS harvesting_count,
        COUNT(*) FILTER (WHERE status = 'planned')::int AS planned_count
      FROM vivas_plantings
      WHERE season_year = $1
    `, [seasonYear]);

    res.json({ success: true, data: statsRes.rows[0] });
  } catch (err) {
    console.error("Error fetching planting stats:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/plantings - Create planting
router.post("/api/plantings", async (req, res) => {
  try {
    const {
      crop_id, crop_name, variety_id, variety_name, harvest_stage,
      planting_type, season_year, sow_date, plant_date, first_harvest_date, last_harvest_date,
      location_id, location_name, bed_ids, bed_names, bed_feet, row_feet,
      rows_per_bed, in_row_spacing_in, gps_lat, gps_lng, target_yield, yield_unit,
      unit_price, estimated_revenue, status, seed_vendor, seed_lot, tray_count, notes,
      spacing_unit, expected_yield_per_acre
    } = req.body;

    if (!crop_name || !crop_name.trim()) {
      return res.status(400).json({ success: false, message: "Crop name is required" });
    }

    const year = season_year ? parseInt(season_year) : 2026;
    const cropCode = (crop_name.slice(0, 3) || 'CRP').toUpperCase();
    const countRes = await pool.query("SELECT COUNT(*)::int FROM vivas_plantings WHERE season_year = $1", [year]);
    const seq = (countRes.rows[0].count + 1).toString().padStart(2, '0');
    const autoPlantingId = `PL-${year}-${cropCode}-${seq}`;

    const bFeet = bed_feet ? parseFloat(bed_feet) : 100.0;
    const rPerBed = rows_per_bed ? parseInt(rows_per_bed) : 2;
    const rFeet = row_feet ? parseFloat(row_feet) : (bFeet * rPerBed);
    const uPrice = unit_price ? parseFloat(unit_price) : 0.0;
    const tYield = target_yield ? parseFloat(target_yield) : 0.0;
    const estRev = estimated_revenue ? parseFloat(estimated_revenue) : (tYield * uPrice);

    const result = await pool.query(
      `INSERT INTO vivas_plantings (
        planting_id, crop_id, crop_name, variety_id, variety_name, harvest_stage,
        planting_type, season_year, sow_date, plant_date, planting_date, first_harvest_date, last_harvest_date,
        location_id, location_name, bed_ids, bed_names, bed_feet, row_feet,
        rows_per_bed, in_row_spacing_in, gps_lat, gps_lng, target_yield, yield_unit,
        estimated_revenue, unit_price, status, seed_vendor, seed_lot, tray_count, notes, area_planted, field_name,
        spacing_unit, expected_yield_per_acre
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36
      ) RETURNING *`,
      [
        autoPlantingId, crop_id || null, crop_name.trim(), variety_id || null, variety_name || null,
        harvest_stage || 'Mature', normalizePlantingMethod(planting_type || req.body.planting_method), year,
        sow_date || null, plant_date || null, plant_date || sow_date || new Date(),
        first_harvest_date || null, last_harvest_date || null,
        location_id ? parseInt(location_id) : null, location_name || null,
        JSON.stringify(bed_ids || []), bed_names || null,
        bFeet, rFeet, rPerBed,
        in_row_spacing_in ? parseFloat(in_row_spacing_in) : 0.35,
        gps_lat ? parseFloat(gps_lat) : null, gps_lng ? parseFloat(gps_lng) : null,
        tYield, yield_unit || 'Ton', estRev, uPrice,
        status || 'planned', seed_vendor || null, seed_lot || null,
        tray_count ? parseInt(tray_count) : 1, notes || null,
        (bFeet * 3 / 43560).toFixed(2), location_name || crop_name,
        spacing_unit || 'mtr',
        expected_yield_per_acre ? parseFloat(expected_yield_per_acre) : tYield
      ]
    );

    res.json({ success: true, data: result.rows[0], message: "Planting added to crop plan successfully" });
  } catch (err) {
    console.error("Error creating planting:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/plantings/:id - Update planting
router.put("/api/plantings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      crop_name, variety_name, harvest_stage, planting_type, season_year,
      sow_date, plant_date, first_harvest_date, last_harvest_date,
      location_id, location_name, bed_ids, bed_names, bed_feet, row_feet,
      rows_per_bed, in_row_spacing_in, gps_lat, gps_lng, target_yield, yield_unit,
      unit_price, estimated_revenue, actual_yield, status, seed_vendor, seed_lot, tray_count, notes,
      spacing_unit, expected_yield_per_acre
    } = req.body;

    const result = await pool.query(
      `UPDATE vivas_plantings SET
        crop_name = COALESCE($1, crop_name),
        variety_name = COALESCE($2, variety_name),
        harvest_stage = COALESCE($3, harvest_stage),
        planting_type = COALESCE($4, planting_type),
        season_year = COALESCE($5, season_year),
        sow_date = COALESCE($6, sow_date),
        plant_date = COALESCE($7, plant_date),
        first_harvest_date = COALESCE($8, first_harvest_date),
        last_harvest_date = COALESCE($9, last_harvest_date),
        location_id = COALESCE($10, location_id),
        location_name = COALESCE($11, location_name),
        bed_ids = COALESCE($12, bed_ids),
        bed_names = COALESCE($13, bed_names),
        bed_feet = COALESCE($14, bed_feet),
        row_feet = COALESCE($15, row_feet),
        rows_per_bed = COALESCE($16, rows_per_bed),
        in_row_spacing_in = COALESCE($17, in_row_spacing_in),
        gps_lat = COALESCE($18, gps_lat),
        gps_lng = COALESCE($19, gps_lng),
        target_yield = COALESCE($20, target_yield),
        yield_unit = COALESCE($21, yield_unit),
        unit_price = COALESCE($22, unit_price),
        estimated_revenue = COALESCE($23, estimated_revenue),
        actual_yield = COALESCE($24, actual_yield),
        status = COALESCE($25, status),
        seed_vendor = COALESCE($26, seed_vendor),
        seed_lot = COALESCE($27, seed_lot),
        tray_count = COALESCE($28, tray_count),
        notes = COALESCE($29, notes),
        spacing_unit = COALESCE($30, spacing_unit),
        expected_yield_per_acre = COALESCE($31, expected_yield_per_acre),
        updated_at = NOW()
       WHERE id = $32 RETURNING *`,
      [
        crop_name ? crop_name.trim() : null, variety_name || null, harvest_stage || null,
        (planting_type !== undefined || req.body.planting_method !== undefined) ? normalizePlantingMethod(planting_type || req.body.planting_method) : null, season_year ? parseInt(season_year) : null,
        sow_date || null, plant_date || null, first_harvest_date || null, last_harvest_date || null,
        location_id ? parseInt(location_id) : null, location_name || null,
        bed_ids ? JSON.stringify(bed_ids) : null, bed_names || null,
        bed_feet ? parseFloat(bed_feet) : null, row_feet ? parseFloat(row_feet) : null,
        rows_per_bed ? parseInt(rows_per_bed) : null, in_row_spacing_in ? parseFloat(in_row_spacing_in) : null,
        gps_lat ? parseFloat(gps_lat) : null, gps_lng ? parseFloat(gps_lng) : null,
        target_yield ? parseFloat(target_yield) : null, yield_unit || null,
        unit_price ? parseFloat(unit_price) : null, estimated_revenue ? parseFloat(estimated_revenue) : null,
        actual_yield ? parseFloat(actual_yield) : null, status || null,
        seed_vendor || null, seed_lot || null, tray_count ? parseInt(tray_count) : null,
        notes || null,
        spacing_unit || null,
        expected_yield_per_acre !== undefined ? parseFloat(expected_yield_per_acre) : null,
        id
      ]
    );

    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Planting not found" });
    res.json({ success: true, data: result.rows[0], message: "Planting updated successfully" });
  } catch (err) {
    console.error("Error updating planting:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/plantings/:id - Delete planting
router.delete("/api/plantings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM vivas_plantings WHERE id = $1 RETURNING id", [id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Planting not found" });
    res.json({ success: true, message: "Planting deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------
// HARVEST PLANNER
// -------------------

// GET /api/harvest-plans - List harvest plans with date & crop filtering
router.get("/api/harvest-plans", async (req, res) => {
  try {
    const { date, start_date, end_date, crop_name, status, search } = req.query;
    let q = "SELECT * FROM vivas_harvest_plans WHERE 1=1";
    const params = [];

    if (date) {
      params.push(date);
      q += ` AND harvest_date = $${params.length}`;
    } else {
      if (start_date) {
        params.push(start_date);
        q += ` AND harvest_date >= $${params.length}`;
      }
      if (end_date) {
        params.push(end_date);
        q += ` AND harvest_date <= $${params.length}`;
      }
    }

    if (crop_name && crop_name !== 'All') {
      params.push(crop_name);
      q += ` AND crop_name = $${params.length}`;
    }

    if (status && status !== 'All') {
      params.push(status);
      q += ` AND status = $${params.length}`;
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`);
      q += ` AND (crop_name ILIKE $${params.length} OR variety_name ILIKE $${params.length} OR location_name ILIKE $${params.length} OR assignee ILIKE $${params.length})`;
    }

    q += " ORDER BY harvest_date ASC, crop_name ASC";
    const result = await pool.query(q, params);
    res.json({ success: true, data: result.rows, total: result.rowCount });
  } catch (err) {
    console.error("Error fetching harvest plans:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/harvest-plans - Create harvest plan
router.post("/api/harvest-plans", async (req, res) => {
  try {
    const {
      planting_id, crop_name, variety_name, harvest_stage, harvest_date,
      location_name, bed_names, in_storage_qty, current_yield_est,
      total_available_qty, pending_orders_qty, planned_qty, unit,
      container_type, container_count, assignee, order_value, status, notes
    } = req.body;

    if (!crop_name || !harvest_date) {
      return res.status(400).json({ success: false, message: "Crop name and harvest date are required" });
    }

    const result = await pool.query(
      `INSERT INTO vivas_harvest_plans (
        planting_id, crop_name, variety_name, harvest_stage, harvest_date,
        location_name, bed_names, in_storage_qty, current_yield_est,
        total_available_qty, pending_orders_qty, planned_qty, unit,
        container_type, container_count, assignee, order_value, status, notes
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
      ) RETURNING *`,
      [
        planting_id || null, crop_name.trim(), variety_name || null, harvest_stage || 'Mature',
        harvest_date, location_name || null, bed_names || null,
        in_storage_qty ? parseFloat(in_storage_qty) : 0.0,
        current_yield_est ? parseFloat(current_yield_est) : 0.0,
        total_available_qty ? parseFloat(total_available_qty) : 0.0,
        pending_orders_qty ? parseFloat(pending_orders_qty) : 0.0,
        planned_qty ? parseFloat(planned_qty) : 0.0,
        unit || 'kg', container_type || 'Standard Crate',
        container_count ? parseInt(container_count) : 1,
        assignee || null, order_value ? parseFloat(order_value) : 0.00,
        status || 'scheduled', notes || null
      ]
    );

    res.json({ success: true, data: result.rows[0], message: "Harvest plan scheduled successfully" });
  } catch (err) {
    console.error("Error creating harvest plan:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/harvest-plans/:id/status - Update harvest progress/completion
router.patch("/api/harvest-plans/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, actual_harvested_qty, planned_qty } = req.body;

    const result = await pool.query(
      `UPDATE vivas_harvest_plans SET
        status = COALESCE($1, status),
        actual_harvested_qty = COALESCE($2, actual_harvested_qty),
        planned_qty = COALESCE($3, planned_qty)
       WHERE id = $4 RETURNING *`,
      [
        status || null,
        actual_harvested_qty !== undefined ? parseFloat(actual_harvested_qty) : null,
        planned_qty !== undefined ? parseFloat(planned_qty) : null,
        id
      ]
    );

    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Harvest plan not found" });
    res.json({ success: true, data: result.rows[0], message: "Harvest plan status updated" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/harvest-plans/:id - Delete harvest plan
router.delete("/api/harvest-plans/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM vivas_harvest_plans WHERE id = $1 RETURNING id", [id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: "Harvest plan not found" });
    res.json({ success: true, message: "Harvest plan deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


export default router;
