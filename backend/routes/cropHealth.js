import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import pool from '../config/db.js';

const router = express.Router();

// Helper: Get user/farm ID from request or defaults against real DB records
const getContext = async (req) => {
  let userId = req.headers['x-user-id'] || req.body?.user_id || req.query?.user_id;
  let farmId = req.headers['x-farm-id'] || req.body?.farm_id || req.query?.farm_id;

  // 1. Verify passed farmId if provided
  if (farmId) {
    try {
      const fCheck = await pool.query('SELECT id FROM vivas_farms WHERE id = $1 AND is_active = TRUE', [farmId]);
      if (fCheck.rowCount === 0) farmId = null;
    } catch (e) {
      farmId = null;
    }
  }

  // 2. Fetch active farm if farmId missing or invalid
  if (!farmId) {
    try {
      const farmRes = await pool.query('SELECT id, owner_id FROM vivas_farms WHERE is_active = TRUE ORDER BY last_accessed_at DESC NULLS LAST, created_at ASC LIMIT 1');
      if (farmRes.rowCount > 0) {
        farmId = farmRes.rows[0].id;
        if (!userId) userId = farmRes.rows[0].owner_id;
      }
    } catch (e) {
      console.error('Error finding active farm for context:', e.message);
    }
  }

  // 3. Fallback: create default farm if table empty
  if (!farmId) {
    try {
      let uId = userId;
      if (!uId) {
        const uRes = await pool.query('SELECT id FROM vivas_users LIMIT 1');
        uId = uRes.rowCount > 0 ? uRes.rows[0].id : null;
      }
      if (!uId) {
        const newU = await pool.query(`INSERT INTO vivas_users (full_name, email) VALUES ('Default User', 'default@vivas.ai') RETURNING id`);
        uId = newU.rows[0].id;
      }
      const newF = await pool.query(
        `INSERT INTO vivas_farms (owner_id, farm_name, city, state_country, total_area_acres, farm_type)
         VALUES ($1, 'Default Farm', 'Bengaluru', 'India', 10.00, 'General') RETURNING id`,
        [uId]
      );
      farmId = newF.rows[0].id;
      if (!userId) userId = uId;
    } catch (e) {
      console.error('Error creating fallback farm:', e.message);
    }
  }

  // 4. Check provided userId
  if (userId) {
    try {
      const uCheck = await pool.query('SELECT id FROM vivas_users WHERE id = $1', [userId]);
      if (uCheck.rowCount === 0) userId = null;
    } catch (e) {
      userId = null;
    }
  }

  // 5. Fallback userId if missing/invalid
  if (!userId) {
    try {
      const uRes = await pool.query('SELECT id FROM vivas_users LIMIT 1');
      if (uRes.rowCount > 0) {
        userId = uRes.rows[0].id;
      }
    } catch (e) {
      console.error('Error finding user for context:', e.message);
    }
  }

  return { userId, farmId };
};

// ==========================================
// 1. LOOKUPS, NUTRIENTS & SYMPTOMS API
// ==========================================

// GET /api/ch/lookups - List lookup options
router.get('/lookups', async (req, res) => {
  try {
    const { list } = req.query;
    let queryText = 'SELECT * FROM ch_lookup WHERE is_active = true';
    const params = [];
    if (list) {
      const lists = list.split(',').map(l => l.trim());
      queryText += ' AND list_code = ANY($1)';
      params.push(lists);
    }
    queryText += ' ORDER BY list_code ASC, sort_order ASC, label ASC';

    const result = await pool.query(queryText, params);
    
    // Group by list_code for easy client usage
    const grouped = {};
    for (const row of result.rows) {
      if (!grouped[row.list_code]) grouped[row.list_code] = [];
      grouped[row.list_code].push(row);
    }

    res.json({ success: true, data: grouped, raw: result.rows });
  } catch (err) {
    console.error('Error fetching lookups:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/ch/nutrients - List plant nutrients
router.get('/nutrients', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ch_nutrient ORDER BY sort_order ASC');
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching nutrients:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/ch/symptoms - List symptom vocabulary
router.get('/symptoms', async (req, res) => {
  try {
    const { type, part } = req.query;
    let queryText = 'SELECT s.*, l.label as plant_part_label FROM ch_symptom s LEFT JOIN ch_lookup l ON s.plant_part_id = l.id WHERE s.is_active = true';
    const params = [];

    if (type) {
      params.push(type.toUpperCase());
      queryText += ` AND $${params.length} = ANY(s.applies_to)`;
    }
    if (part) {
      params.push(part);
      queryText += ` AND s.plant_part_id = $${params.length}`;
    }
    queryText += ' ORDER BY s.label ASC';

    const result = await pool.query(queryText, params);
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error('Error fetching symptoms:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 2. LIBRARY API (Pests, Diseases, Deficiencies)
// ==========================================

// GET /api/ch/problems - Search/filter library problems
router.get('/problems', async (req, res) => {
  try {
    const { type, crop_id, status, scope, q, category_id, severity, limit = 50, offset = 0 } = req.query;
    let queryText = `
      SELECT p.*,
        l_cat.label as category_label,
        l_pest.label as pest_type_label,
        n.name as nutrient_name, n.category as nutrient_category,
        COALESCE(
          (SELECT json_agg(json_build_object('id', c.id, 'name', c.name, 'icon', c.icon, 'is_primary', pc.is_primary))
           FROM ch_problem_crop pc JOIN vivas_crops c ON pc.crop_id = c.id
           WHERE pc.problem_id = p.id), '[]'::json
        ) as mapped_crops,
        COALESCE(
          (SELECT url FROM ch_media WHERE owner_type='PROBLEM' AND owner_id=p.id AND is_primary=true AND deleted_at IS NULL LIMIT 1),
          (SELECT url FROM ch_media WHERE owner_type='PROBLEM' AND owner_id=p.id AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1)
        ) as primary_image_url,
        (SELECT COUNT(*) FROM ch_media WHERE owner_type='PROBLEM' AND owner_id=p.id AND deleted_at IS NULL) as image_count
      FROM ch_problem p
      LEFT JOIN ch_lookup l_cat ON p.category_id = l_cat.id
      LEFT JOIN ch_lookup l_pest ON p.pest_type_id = l_pest.id
      LEFT JOIN ch_nutrient n ON p.nutrient_code = n.code
      WHERE p.deleted_at IS NULL
    `;
    const params = [];

    if (type) {
      params.push(type.toUpperCase());
      queryText += ` AND p.problem_type = $${params.length}`;
    }
    if (status) {
      params.push(status.toUpperCase());
      queryText += ` AND p.status = $${params.length}`;
    }
    if (scope) {
      params.push(scope.toUpperCase());
      queryText += ` AND p.scope = $${params.length}`;
    }
    if (category_id) {
      params.push(category_id);
      queryText += ` AND p.category_id = $${params.length}`;
    }
    if (severity) {
      params.push(severity.toUpperCase());
      queryText += ` AND p.potential_severity = $${params.length}`;
    }
    if (crop_id) {
      params.push(crop_id);
      queryText += ` AND EXISTS (SELECT 1 FROM ch_problem_crop pc WHERE pc.problem_id = p.id AND pc.crop_id = $${params.length})`;
    }
    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      queryText += ` AND (p.name ILIKE $${params.length} OR p.code ILIKE $${params.length} OR p.scientific_name ILIKE $${params.length} OR p.identification_text ILIKE $${params.length})`;
    }

    queryText += ` ORDER BY p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await pool.query(queryText, params);
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (err) {
    console.error('Error fetching library problems:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/ch/problems/:id - Single problem detail
router.get('/problems/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { crop_id } = req.query;
    const probRes = await pool.query(`
      SELECT p.*,
        l_cat.label as category_label,
        l_pest.label as pest_type_label,
        n.name as nutrient_name, n.category as nutrient_category
      FROM ch_problem p
      LEFT JOIN ch_lookup l_cat ON p.category_id = l_cat.id
      LEFT JOIN ch_lookup l_pest ON p.pest_type_id = l_pest.id
      LEFT JOIN ch_nutrient n ON p.nutrient_code = n.code
      WHERE p.id = $1 AND p.deleted_at IS NULL
    `, [id]);

    if (probRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Library problem entry not found' });
    }

    const problem = probRes.rows[0];

    // Fetch child entities
    const [cropsRes, attrsRes, symptomsRes, lifecycleRes, varietiesRes, controlsRes, mediaRes, reviewsRes, versionsRes] = await Promise.all([
      pool.query(`SELECT pc.*, c.name as crop_name, c.icon as crop_icon FROM ch_problem_crop pc JOIN vivas_crops c ON pc.crop_id = c.id WHERE pc.problem_id = $1`, [id]),
      pool.query(`SELECT pa.*, l.list_code, l.code, l.label FROM ch_problem_attr pa JOIN ch_lookup l ON pa.lookup_id = l.id WHERE pa.problem_id = $1`, [id]),
      pool.query(`SELECT ps.*, s.code, s.label, s.description FROM ch_problem_symptom ps JOIN ch_symptom s ON ps.symptom_id = s.id WHERE ps.problem_id = $1`, [id]),
      pool.query(`SELECT ls.*, l.label as stage_label FROM ch_lifecycle_stage ls JOIN ch_lookup l ON ls.stage_id = l.id WHERE ls.problem_id = $1 ORDER BY ls.seq ASC`, [id]),
      pool.query(`SELECT rv.*, c.name as crop_name, v.variety_name FROM ch_resistant_variety rv JOIN vivas_crops c ON rv.crop_id = c.id JOIN vivas_crop_varieties v ON rv.variety_id = v.id WHERE rv.problem_id = $1`, [id]),
      pool.query(`
        SELECT cm.*, c.name as crop_name, i.name as input_name,
               l_unit.label as dose_unit_label, l_basis.label as dose_basis_label, l_app.label as application_method_label
        FROM ch_control_measure cm
        LEFT JOIN vivas_crops c ON cm.crop_id = c.id
        LEFT JOIN vivas_inputs_catalog i ON cm.input_id = i.id
        LEFT JOIN ch_lookup l_unit ON cm.dose_unit_id = l_unit.id
        LEFT JOIN ch_lookup l_basis ON cm.dose_basis_id = l_basis.id
        LEFT JOIN ch_lookup l_app ON cm.application_method_id = l_app.id
        WHERE cm.problem_id = $1 AND cm.is_active = true
        ORDER BY cm.seq ASC
      `, [id]),
      pool.query(`
        SELECT m.*, l.label as image_label, lp.label as plant_part_label, ls.label as life_stage_label
        FROM ch_media m
        LEFT JOIN ch_lookup l ON m.image_label_id = l.id
        LEFT JOIN ch_lookup lp ON m.plant_part_id = lp.id
        LEFT JOIN ch_lookup ls ON m.life_stage_id = ls.id
        WHERE m.owner_type = 'PROBLEM' AND m.owner_id = $1 AND m.deleted_at IS NULL
          AND ($2::uuid IS NULL OR m.crop_id = $2::uuid OR m.crop_id IS NULL)
        ORDER BY m.is_primary DESC, m.created_at ASC
      `, [id, crop_id || null]),
      pool.query(`SELECT pr.*, u.full_name as reviewer_name FROM ch_problem_review pr JOIN vivas_users u ON pr.reviewer_id = u.id WHERE pr.problem_id = $1 ORDER BY pr.created_at DESC`, [id]),
      pool.query(`SELECT pv.version, pv.changed_at, u.full_name as changed_by_name FROM ch_problem_version pv LEFT JOIN vivas_users u ON pv.changed_by = u.id WHERE pv.problem_id = $1 ORDER BY pv.version DESC`, [id])
    ]);

    problem.crops = cropsRes.rows;
    problem.attributes = attrsRes.rows;
    problem.symptoms = symptomsRes.rows;
    problem.lifecycle = lifecycleRes.rows;
    problem.resistant_varieties = varietiesRes.rows;
    problem.control_measures = controlsRes.rows;
    problem.media = mediaRes.rows;
    problem.reviews = reviewsRes.rows;
    problem.versions = versionsRes.rows;

    res.json({ success: true, data: problem });
  } catch (err) {
    console.error('Error fetching problem detail:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ch/problems - Create new library problem entry
router.get('/helpers/create-problem-stub', async (req, res) => {
  res.json({ message: 'Use POST /api/ch/problems with payload' });
});

router.post('/problems', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      problem_type, name, local_names, scientific_name, category_id, pest_type_id,
      nutrient_code, identification_text, favourable_text, temp_min_c, temp_max_c,
      humidity_min_pct, humidity_max_pct, rainfall_note, soil_note, peak_occurrence_text,
      peak_months, development_stage_text, potential_severity, preventive_measures,
      is_soil_test_required, notes, scope = 'FARM', farm_id, status = 'DRAFT',
      // Children data
      mapped_crops = [], attributes = [], symptoms = [], lifecycle = [],
      resistant_varieties = [], control_measures = [], media = []
    } = req.body;

    const { userId, farmId } = await getContext(req);
    const activeFarmId = scope === 'FARM' ? (farm_id || farmId) : null;

    if (!problem_type || !['PEST', 'DISEASE', 'DEFICIENCY'].includes(problem_type.toUpperCase())) {
      throw new Error('Valid problem_type (PEST, DISEASE, DEFICIENCY) is required');
    }
    if (!name || !name.trim()) throw new Error('Problem name is required');
    if (problem_type === 'DEFICIENCY' && !nutrient_code) throw new Error('Nutrient code is required for Deficiency entries');

    // Auto-generate human code
    let seqName = 'ch_seq_pest';
    let codePrefix = 'PST';
    if (problem_type === 'DISEASE') { seqName = 'ch_seq_disease'; codePrefix = 'DIS'; }
    if (problem_type === 'DEFICIENCY') { seqName = 'ch_seq_deficiency'; codePrefix = 'DEF'; }

    const seqRes = await client.query(`SELECT nextval('${seqName}') as num`);
    const codeNum = String(seqRes.rows[0].num).padStart(4, '0');
    const generatedCode = `${codePrefix}-${codeNum}`;

    // Validate chemical control measures (PHI required)
    if (Array.isArray(control_measures)) {
      for (const cm of control_measures) {
        if (cm.method_type === 'CHEMICAL' && (cm.phi_days === undefined || cm.phi_days === null)) {
          throw new Error(`Pre-Harvest Interval (PHI days) is mandatory for chemical control measure: "${cm.title || 'Chemical Remedy'}"`);
        }
      }
    }

    // Insert main problem row
    const insertRes = await client.query(`
      INSERT INTO ch_problem (
        problem_type, code, name, local_names, scientific_name, category_id, pest_type_id,
        nutrient_code, identification_text, favourable_text, temp_min_c, temp_max_c,
        humidity_min_pct, humidity_max_pct, rainfall_note, soil_note, peak_occurrence_text,
        peak_months, development_stage_text, potential_severity, preventive_measures,
        is_soil_test_required, notes, scope, farm_id, status, created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27)
      RETURNING *
    `, [
      problem_type.toUpperCase(), generatedCode, name.trim(), local_names || {}, scientific_name || null,
      category_id || null, pest_type_id || null, nutrient_code || null, identification_text || null,
      favourable_text || null, temp_min_c || null, temp_max_c || null, humidity_min_pct || null,
      humidity_max_pct || null, rainfall_note || null, soil_note || null, peak_occurrence_text || null,
      peak_months || null, development_stage_text || null, potential_severity || 'LOW', preventive_measures || null,
      is_soil_test_required || false, notes || null, scope.toUpperCase(), activeFarmId, status.toUpperCase(), userId
    ]);

    const newProblem = insertRes.rows[0];
    const problemId = newProblem.id;

    // Insert mapped crops
    if (Array.isArray(mapped_crops)) {
      for (const mc of mapped_crops) {
        if (mc.crop_id) {
          await client.query(`
            INSERT INTO ch_problem_crop (problem_id, crop_id, is_primary, susceptible_stage, peak_months, crop_severity, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING
          `, [problemId, mc.crop_id, mc.is_primary || false, mc.susceptible_stage || null, mc.peak_months || null, mc.crop_severity || null, mc.notes || null]);
        }
      }
    }

    // Insert attributes
    if (Array.isArray(attributes)) {
      for (const lookupId of attributes) {
        if (lookupId) {
          await client.query(`INSERT INTO ch_problem_attr (problem_id, lookup_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [problemId, lookupId]);
        }
      }
    }

    // Insert symptoms
    if (Array.isArray(symptoms)) {
      for (const sym of symptoms) {
        const symId = typeof sym === 'string' ? sym : sym.symptom_id;
        const weight = typeof sym === 'object' ? (sym.weight || 1.0) : 1.0;
        if (symId) {
          await client.query(`INSERT INTO ch_problem_symptom (problem_id, symptom_id, weight) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [problemId, symId, weight]);
        }
      }
    }

    // Insert control measures
    if (Array.isArray(control_measures)) {
      for (let idx = 0; idx < control_measures.length; idx++) {
        const cm = control_measures[idx];
        await client.query(`
          INSERT INTO ch_control_measure (
            problem_id, crop_id, method_type, title, description, input_id, input_name_text,
            active_ingredient, dose_value, dose_unit_id, dose_basis_id, application_method_id,
            frequency_text, interval_days, max_applications, phi_days, reentry_hours, safety_notes, seq
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
        `, [
          problemId, cm.crop_id || null, cm.method_type || 'CULTURAL', cm.title || 'Control Measure',
          cm.description || null, cm.input_id || null, cm.input_name_text || null, cm.active_ingredient || null,
          cm.dose_value || null, cm.dose_unit_id || null, cm.dose_basis_id || null, cm.application_method_id || null,
          cm.frequency_text || null, cm.interval_days || null, cm.max_applications || null, cm.phi_days || null,
          cm.reentry_hours || null, cm.safety_notes || null, idx + 1
        ]);
      }
    }

    // Insert media
    if (Array.isArray(media)) {
      for (const m of media) {
        if (m.url) {
          await client.query(`
            INSERT INTO ch_media (owner_type, owner_id, url, thumb_url, image_label_id, caption, is_primary, uploaded_by)
            VALUES ('PROBLEM', $1, $2, $3, $4, $5, $6, $7)
          `, [problemId, m.url, m.thumb_url || m.url, m.image_label_id || null, m.caption || null, m.is_primary || false, userId]);
        }
      }
    }

    // Save version 1 snapshot
    await client.query(`INSERT INTO ch_problem_version (problem_id, version, snapshot, changed_by) VALUES ($1, 1, $2, $3)`, [problemId, JSON.stringify(newProblem), userId]);

    await client.query('COMMIT');
    res.json({ success: true, message: `Created ${problem_type} entry "${generatedCode}" successfully`, data: newProblem });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating problem:', err.message);
    res.status(400).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/ch/problems/:id - Update problem entry
router.put('/problems/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { userId } = await getContext(req);

    await client.query('BEGIN');

    const curRes = await client.query('SELECT * FROM ch_problem WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (curRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Problem entry not found' });
    }
    const current = curRes.rows[0];

    const {
      name, local_names, scientific_name, category_id, pest_type_id, nutrient_code,
      identification_text, favourable_text, temp_min_c, temp_max_c, humidity_min_pct,
      humidity_max_pct, rainfall_note, soil_note, peak_occurrence_text, peak_months,
      development_stage_text, potential_severity, preventive_measures, is_soil_test_required, notes
    } = req.body;

    const nextVersion = (current.version || 1) + 1;

    const updRes = await client.query(`
      UPDATE ch_problem SET
        name = COALESCE($1, name),
        local_names = COALESCE($2, local_names),
        scientific_name = $3,
        category_id = $4,
        pest_type_id = $5,
        nutrient_code = $6,
        identification_text = $7,
        favourable_text = $8,
        temp_min_c = $9,
        temp_max_c = $10,
        humidity_min_pct = $11,
        humidity_max_pct = $12,
        rainfall_note = $13,
        soil_note = $14,
        peak_occurrence_text = $15,
        peak_months = $16,
        development_stage_text = $17,
        potential_severity = COALESCE($18, potential_severity),
        preventive_measures = $19,
        is_soil_test_required = COALESCE($20, is_soil_test_required),
        notes = $21,
        version = $22,
        updated_at = now()
      WHERE id = $23 RETURNING *
    `, [
      name ? name.trim() : null, local_names || null, scientific_name || null, category_id || null,
      pest_type_id || null, nutrient_code || null, identification_text || null, favourable_text || null,
      temp_min_c || null, temp_max_c || null, humidity_min_pct || null, humidity_max_pct || null,
      rainfall_note || null, soil_note || null, peak_occurrence_text || null, peak_months || null,
      development_stage_text || null, potential_severity || null, preventive_measures || null,
      is_soil_test_required, notes || null, nextVersion, id
    ]);

    const updatedProblem = updRes.rows[0];

    // Snapshot version
    await client.query(`INSERT INTO ch_problem_version (problem_id, version, snapshot, changed_by) VALUES ($1, $2, $3, $4)`, [id, nextVersion, JSON.stringify(updatedProblem), userId]);

    await client.query('COMMIT');
    res.json({ success: true, message: `Updated problem entry "${updatedProblem.code}" to version ${nextVersion}`, data: updatedProblem });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating problem:', err.message);
    res.status(400).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/ch/problems/:id/workflow - Action status transition (SUBMIT, VERIFY, PUBLISH, REJECT, etc.)
router.post('/problems/:id/workflow', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comment } = req.body;
    const { userId } = await getContext(req);

    const validActions = {
      SUBMIT: 'SUBMITTED',
      REQUEST_CHANGES: 'CHANGES_REQUESTED',
      VERIFY: 'VERIFIED',
      PUBLISH: 'PUBLISHED',
      REJECT: 'REJECTED',
      ARCHIVE: 'ARCHIVED',
      REOPEN: 'SUBMITTED'
    };

    if (!action || !validActions[action.toUpperCase()]) {
      return res.status(400).json({ success: false, message: `Invalid workflow action: ${action}` });
    }

    const newStatus = validActions[action.toUpperCase()];
    const isGlobal = action.toUpperCase() === 'PUBLISH';

    const updRes = await pool.query(`
      UPDATE ch_problem SET
        status = $1,
        scope = CASE WHEN $2 = true THEN 'GLOBAL' ELSE scope END,
        verified_by = CASE WHEN $3 IN ('VERIFY','PUBLISH') THEN $4 ELSE verified_by END,
        verified_at = CASE WHEN $3 IN ('VERIFY','PUBLISH') THEN now() ELSE verified_at END,
        published_at = CASE WHEN $3 = 'PUBLISH' THEN now() ELSE published_at END,
        updated_at = now()
      WHERE id = $5 AND deleted_at IS NULL RETURNING *
    `, [newStatus, isGlobal, action.toUpperCase(), userId, id]);

    if (updRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Problem entry not found' });
    }

    // Log review action
    await pool.query(`
      INSERT INTO ch_problem_review (problem_id, action, reviewer_id, comment)
      VALUES ($1, $2, $3, $4)
    `, [id, action.toUpperCase(), userId, comment || null]);

    res.json({ success: true, message: `Status updated to ${newStatus}`, data: updRes.rows[0] });
  } catch (err) {
    console.error('Error in workflow transition:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 3. CASES API (Infections, Outbreaks, Reports)
// ==========================================

// GET /api/ch/cases - List cases with filters
router.get('/cases', async (req, res) => {
  try {
    const { site_id, crop_id, type, severity, status, assigned_to, q, limit = 50, offset = 0 } = req.query;
    const { farmId } = await getContext(req);

    let queryText = `
      SELECT c.*,
        cr.name as crop_name, cr.icon as crop_icon,
        cv.variety_name,
        p.name as confirmed_problem_name, p.problem_type as confirmed_problem_type,
        sp.name as suspected_problem_name,
        u_rep.full_name as reported_by_name,
        u_ass.full_name as assigned_to_name,
        (SELECT url FROM ch_media WHERE owner_type='CASE' AND owner_id=c.id ORDER BY is_primary DESC, created_at ASC LIMIT 1) as primary_photo_url,
        (SELECT count(*) FROM ch_media WHERE owner_type='CASE' AND owner_id=c.id) as photo_count
      FROM ch_case c
      LEFT JOIN vivas_crops cr ON c.crop_id = cr.id
      LEFT JOIN vivas_crop_varieties cv ON c.variety_id = cv.id
      LEFT JOIN ch_problem p ON c.confirmed_problem_id = p.id
      LEFT JOIN ch_problem sp ON c.suspected_problem_id = sp.id
      LEFT JOIN vivas_users u_rep ON c.reported_by = u_rep.id
      LEFT JOIN vivas_users u_ass ON c.assigned_to = u_ass.id
      WHERE c.deleted_at IS NULL
    `;
    const params = [];

    if (farmId && farmId !== '00000000-0000-0000-0000-000000000000') {
      params.push(farmId);
      queryText += ` AND c.farm_id = $${params.length}`;
    }
    if (site_id) {
      params.push(parseInt(site_id, 10));
      queryText += ` AND c.site_id = $${params.length}`;
    }
    if (crop_id) {
      params.push(crop_id);
      queryText += ` AND c.crop_id = $${params.length}`;
    }
    if (type) {
      params.push(type.toUpperCase());
      queryText += ` AND (p.problem_type = $${params.length} OR c.suspected_type = $${params.length})`;
    }
    if (severity) {
      params.push(severity.toUpperCase());
      queryText += ` AND c.severity = $${params.length}`;
    }
    if (status) {
      params.push(status.toUpperCase());
      queryText += ` AND c.status = $${params.length}`;
    }
    if (assigned_to) {
      params.push(assigned_to);
      queryText += ` AND c.assigned_to = $${params.length}`;
    }
    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      queryText += ` AND (c.case_no ILIKE $${params.length} OR cr.name ILIKE $${params.length} OR c.symptoms_notes ILIKE $${params.length})`;
    }

    queryText += ` ORDER BY c.created_at DESC, c.observed_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await pool.query(queryText, params);
    res.json({ success: true, data: result.rows, count: result.rowCount });
  } catch (err) {
    console.error('Error fetching cases:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/ch/cases/:id - Single case detail
router.get('/cases/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const caseRes = await pool.query(`
      SELECT c.*,
        cr.name as crop_name, cr.icon as crop_icon, cr.category as crop_category,
        cv.variety_name,
        p.name as confirmed_problem_name, p.code as confirmed_problem_code, p.problem_type as confirmed_problem_type,
        sp.name as suspected_problem_name,
        u_rep.full_name as reported_by_name,
        u_ass.full_name as assigned_to_name
      FROM ch_case c
      LEFT JOIN vivas_crops cr ON c.crop_id = cr.id
      LEFT JOIN vivas_crop_varieties cv ON c.variety_id = cv.id
      LEFT JOIN ch_problem p ON c.confirmed_problem_id = p.id
      LEFT JOIN ch_problem sp ON c.suspected_problem_id = sp.id
      LEFT JOIN vivas_users u_rep ON c.reported_by = u_rep.id
      LEFT JOIN vivas_users u_ass ON c.assigned_to = u_ass.id
      WHERE c.id = $1 AND c.deleted_at IS NULL
    `, [id]);

    if (caseRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const caseData = caseRes.rows[0];

    // Fetch related detail lists
    const [partsRes, symptomsRes, diagRes, treatRes, followupRes, mediaRes] = await Promise.all([
      pool.query(`SELECT cpp.*, l.label as plant_part_label FROM ch_case_plant_part cpp JOIN ch_lookup l ON cpp.plant_part_id = l.id WHERE cpp.case_id = $1`, [id]),
      pool.query(`SELECT cs.*, s.code, s.label FROM ch_case_symptom cs JOIN ch_symptom s ON cs.symptom_id = s.id WHERE cs.case_id = $1`, [id]),
      pool.query(`SELECT cd.*, p.name as problem_name, p.code as problem_code, p.potential_severity FROM ch_case_diagnosis cd LEFT JOIN ch_problem p ON cd.problem_id = p.id WHERE cd.case_id = $1 ORDER BY cd.is_confirmed DESC, cd.rank ASC`, [id]),
      pool.query(`SELECT ct.*, l_unit.label as dose_unit_label, l_basis.label as dose_basis_label FROM ch_case_treatment ct LEFT JOIN ch_lookup l_unit ON ct.dose_unit_id = l_unit.id LEFT JOIN ch_lookup l_basis ON ct.dose_basis_id = l_basis.id WHERE ct.case_id = $1 ORDER BY ct.created_at ASC`, [id]),
      pool.query(`SELECT cf.*, u.full_name as observed_by_name FROM ch_case_followup cf JOIN vivas_users u ON cf.observed_by = u.id WHERE cf.case_id = $1 ORDER BY cf.observed_at DESC`, [id]),
      pool.query(`SELECT m.*, l.label as image_label FROM ch_media m LEFT JOIN ch_lookup l ON m.image_label_id = l.id WHERE m.owner_type = 'CASE' AND m.owner_id = $1 ORDER BY m.is_primary DESC, m.created_at ASC`, [id])
    ]);

    caseData.plant_parts = partsRes.rows;
    caseData.symptoms = symptomsRes.rows;
    caseData.diagnoses = diagRes.rows;
    caseData.treatments = treatRes.rows;
    caseData.followups = followupRes.rows;
    caseData.photos = mediaRes.rows;

    res.json({ success: true, data: caseData });
  } catch (err) {
    console.error('Error fetching case detail:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ch/cases - Create new case observation
router.post('/cases', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { userId, farmId } = await getContext(req);
    const {
      planting_id, site_id, bed_id, crop_id, variety_id, crop_stage,
      observed_at, assigned_to, suspected_type, suspected_problem_id,
      severity = 'LOW', incidence_pct, area_affected, area_unit,
      symptoms_notes, latitude, longitude, weather_snapshot, source = 'MANUAL',
      plant_part_ids = [], symptom_ids = [], photos = [], diagnose_path = 'AI'
    } = req.body;

    if (!crop_id) throw new Error('Crop selection is required');

    // Auto-generate Case No: CH-2026-000123
    const seqRes = await client.query(`SELECT nextval('ch_seq_case') as num`);
    const year = new Date().getFullYear();
    const caseNo = `CH-${year}-${String(seqRes.rows[0].num).padStart(6, '0')}`;

    const initialStatus = req.body.status || (diagnose_path === 'AI' ? 'AI_REVIEW' : (diagnose_path === 'AGRONOMIST' ? 'AGRONOMIST_REVIEW' : 'OPEN'));

    const caseRes = await client.query(`
      INSERT INTO ch_case (
        case_no, farm_id, planting_id, site_id, bed_id, crop_id, variety_id,
        crop_stage, observed_at, reported_by, assigned_to, suspected_type,
        suspected_problem_id, severity, incidence_pct, area_affected, area_unit,
        symptoms_notes, latitude, longitude, weather_snapshot, status, source
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
      RETURNING *
    `, [
      caseNo, farmId, planting_id || null, site_id ? parseInt(site_id, 10) : null,
      bed_id ? parseInt(bed_id, 10) : null, crop_id, variety_id || null,
      crop_stage || 'Vegetative', observed_at || new Date(), userId, assigned_to || null,
      suspected_type || null, suspected_problem_id || null, (severity.toUpperCase() === 'MEDIUM' ? 'MODERATE' : severity.toUpperCase()),
      incidence_pct !== undefined && incidence_pct !== null && incidence_pct !== '' ? parseFloat(incidence_pct) : null,
      area_affected !== undefined && area_affected !== null && String(area_affected).trim() !== '' ? String(area_affected).trim() : null,
      area_unit || null,
      symptoms_notes || null, latitude || null, longitude || null,
      weather_snapshot ? JSON.stringify(weather_snapshot) : null, initialStatus, source.toUpperCase()
    ]);

    const newCase = caseRes.rows[0];
    const caseId = newCase.id;

    // Plant parts
    if (Array.isArray(plant_part_ids)) {
      for (const pid of plant_part_ids) {
        if (pid) {
          await client.query(`INSERT INTO ch_case_plant_part (case_id, plant_part_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [caseId, pid]);
        }
      }
    }

    // Symptoms
    if (Array.isArray(symptom_ids)) {
      for (const sid of symptom_ids) {
        if (sid) {
          await client.query(`INSERT INTO ch_case_symptom (case_id, symptom_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [caseId, sid]);
        }
      }
    }

    // Photos
    if (Array.isArray(photos)) {
      for (let idx = 0; idx < photos.length; idx++) {
        const p = photos[idx];
        const url = typeof p === 'string' ? p : p.url;
        if (url) {
          await client.query(`
            INSERT INTO ch_media (owner_type, owner_id, url, thumb_url, image_label_id, caption, is_primary, uploaded_by)
            VALUES ('CASE', $1, $2, $3, $4, $5, $6, $7)
          `, [caseId, url, url, p.image_label_id || null, p.caption || null, idx === 0, userId]);
        }
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `Reported issue ${caseNo} successfully`, data: newCase });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating case:', err.message);
    res.status(400).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// PUT /api/ch/cases/:id - Update existing case observation
router.put('/cases/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    const {
      crop_id, variety_id, crop_stage, severity = 'LOW',
      incidence_pct, area_affected, area_unit, symptoms_notes,
      status, plant_part_ids = [], symptom_ids = []
    } = req.body;

    const normSeverity = severity.toUpperCase() === 'MEDIUM' ? 'MODERATE' : severity.toUpperCase();

    const caseRes = await client.query(`
      UPDATE ch_case SET
        crop_id = COALESCE($1, crop_id),
        variety_id = $2,
        crop_stage = COALESCE($3, crop_stage),
        severity = COALESCE($4, severity),
        incidence_pct = $5,
        area_affected = $6,
        area_unit = $7,
        symptoms_notes = $8,
        status = COALESCE($9, status),
        updated_at = now()
      WHERE id = $10 AND deleted_at IS NULL
      RETURNING *
    `, [
      crop_id || null, variety_id || null, crop_stage || null,
      normSeverity, incidence_pct !== undefined && incidence_pct !== '' ? incidence_pct : null,
      area_affected !== undefined && area_affected !== '' ? area_affected : null,
      area_unit || null, symptoms_notes || null, status || null, id
    ]);

    if (caseRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const updatedCase = caseRes.rows[0];

    // Update plant parts if provided
    if (Array.isArray(plant_part_ids)) {
      await client.query(`DELETE FROM ch_case_plant_part WHERE case_id = $1`, [id]);
      for (const pid of plant_part_ids) {
        if (pid) {
          await client.query(`INSERT INTO ch_case_plant_part (case_id, plant_part_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [id, pid]);
        }
      }
    }

    // Update symptoms if provided
    if (Array.isArray(symptom_ids)) {
      await client.query(`DELETE FROM ch_case_symptom WHERE case_id = $1`, [id]);
      for (const sid of symptom_ids) {
        if (sid) {
          await client.query(`INSERT INTO ch_case_symptom (case_id, symptom_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`, [id, sid]);
        }
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: `Case ${updatedCase.case_no} updated successfully`, data: updatedCase });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating case:', err.message);
    res.status(400).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// POST /api/ch/cases/bulk-delete - Bulk soft delete cases
router.post('/cases/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No case IDs provided for deletion' });
    }
    const updRes = await pool.query(
      `UPDATE ch_case SET deleted_at = now() WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL RETURNING id`,
      [ids]
    );
    res.json({ success: true, message: `Successfully deleted ${updRes.rowCount} case(s)`, deletedCount: updRes.rowCount });
  } catch (err) {
    console.error('Error bulk deleting cases:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/ch/cases/:id - Soft delete single case
router.delete('/cases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updRes = await pool.query(
      `UPDATE ch_case SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING id, case_no`,
      [id]
    );
    if (updRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }
    res.json({ success: true, message: `Case ${updRes.rows[0].case_no} deleted successfully` });
  } catch (err) {
    console.error('Error deleting case:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ch/upload-image - Upload crop health issue photo (file or camera snapshot)
router.post('/upload-image', async (req, res) => {
  try {
    const { image, filename } = req.body;
    let base64Data = image;

    if (!base64Data) {
      return res.status(400).json({ success: false, message: 'No image data provided' });
    }

    if (typeof base64Data === 'string' && (base64Data.startsWith('http://') || base64Data.startsWith('https://'))) {
      return res.json({ success: true, url: base64Data });
    }

    let extension = 'png';
    if (typeof base64Data === 'string' && base64Data.startsWith('data:')) {
      const mime = base64Data.split(';')[0].replace('data:', '').toLowerCase();
      if (mime === 'image/jpeg' || mime === 'image/jpg') extension = 'jpg';
      else if (mime === 'image/png') extension = 'png';
      else if (mime === 'image/webp') extension = 'webp';
      base64Data = base64Data.split(',')[1];
    }

    const chDir = path.join(process.cwd(), 'uploads', 'crop_health');
    if (!fs.existsSync(chDir)) {
      fs.mkdirSync(chDir, { recursive: true });
    }

    const uniqueId = crypto.randomBytes(8).toString('hex');
    const safeName = filename ? String(filename).replace(/[^a-zA-Z0-9_-]/g, '') : 'issue';
    const savedName = `${safeName}_${Date.now()}_${uniqueId}.${extension}`;
    const filePath = path.join(chDir, savedName);

    const buffer = Buffer.from(base64Data, 'base64');
    await fs.promises.writeFile(filePath, buffer);

    const relativeUrl = `/uploads/crop_health/${savedName}`;
    res.json({ success: true, url: relativeUrl, message: 'Photo uploaded successfully' });
  } catch (err) {
    console.error('Error uploading issue photo:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ch/cases/:id/followups - Add follow-up observation
router.post('/cases/:id/followups', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = await getContext(req);
    const { severity, incidence_pct, trend = 'STABLE', notes } = req.body;

    const resFollow = await pool.query(`
      INSERT INTO ch_case_followup (case_id, observed_by, severity, incidence_pct, trend, notes)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [id, userId, severity || 'LOW', incidence_pct || null, trend.toUpperCase(), notes || null]);

    // Also update case status to MONITORING if currently TREATING
    await pool.query(`UPDATE ch_case SET status = 'MONITORING', updated_at = now() WHERE id = $1 AND status = 'TREATING'`, [id]);

    res.json({ success: true, message: 'Follow-up observation recorded', data: resFollow.rows[0] });
  } catch (err) {
    console.error('Error adding followup:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ch/cases/:id/resolve - Mark case resolved
router.post('/cases/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { outcome = 'RESOLVED', estimated_loss_amount, notes } = req.body;

    const resUpd = await pool.query(`
      UPDATE ch_case SET
        status = 'RESOLVED',
        outcome = $1,
        resolved_at = now(),
        estimated_loss_amount = $2,
        symptoms_notes = COALESCE(symptoms_notes, '') || CASE WHEN $3 IS NOT NULL THEN E'\nResolution Notes: ' || $3 ELSE '' END,
        updated_at = now()
      WHERE id = $1 AND deleted_at IS NULL RETURNING *
    `, [outcome.toUpperCase(), estimated_loss_amount || null, notes || null, id]);

    res.json({ success: true, message: 'Case resolved successfully', data: resUpd.rows[0] });
  } catch (err) {
    console.error('Error resolving case:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 4. AI DIAGNOSIS & REMEDIES GATEWAY
// ==========================================

// POST /api/ch/cases/diagnose-instant - Instant multimodal visual pathology & remedies
router.post('/cases/diagnose-instant', async (req, res) => {
  const { image_base64, image_url, mime_type, crop_id, crop_name, farm_id } = req.body || {};

  if (!image_base64 && !image_url) {
    return res.status(400).json({ success: false, message: 'Image data is required for visual diagnosis.' });
  }

  try {
    const mlUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    const startTime = Date.now();

    // 1. Resolve crop name hint if crop_id is provided
    let finalCropName = crop_name || '';
    if (crop_id && !finalCropName) {
      const cropRes = await pool.query('SELECT name FROM vivas_crops WHERE id = $1', [crop_id]);
      if (cropRes.rows.length > 0) {
        finalCropName = cropRes.rows[0].name;
      }
    }

    // 2. Query ML Microservice on port 8000
    const mlResponse = await fetch(`${mlUrl}/v1/analyze-instant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_base64,
        image_url,
        mime_type: mime_type || 'image/jpeg',
        hint_crop_name: finalCropName
      })
    });

    if (!mlResponse.ok) {
      const errDetail = await mlResponse.text();
      return res.status(502).json({ success: false, message: `ML Service Error: ${errDetail}` });
    }

    const aiResult = await mlResponse.json();
    const latencyMs = Date.now() - startTime;

    if (!aiResult.is_plant_or_crop) {
      return res.json({
        success: false,
        message: 'No agricultural plant, leaf, fruit, or stem detected in the photo. Please take a clear, close-up photo of the affected crop.'
      });
    }

    // 3. Grounding against internal pathology library (ch_problem)
    let groundedProblem = null;
    let groundedRemedies = [];
    let partnerProducts = [];

    const problemSearchTerms = [
      aiResult.problem_name,
      aiResult.scientific_name,
      aiResult.problem_name.split('&')[0].trim(),
      aiResult.problem_name.split('(')[0].trim()
    ].filter(Boolean);

    let matchQuery = `
      SELECT p.id, p.code, p.name, p.scientific_name, p.problem_type, p.potential_severity
      FROM ch_problem p
      WHERE p.deleted_at IS NULL AND (
    `;
    const matchConditions = [];
    const matchParams = [];
    problemSearchTerms.forEach((term, idx) => {
      matchParams.push(`%${term}%`);
      matchConditions.push(`p.name ILIKE $${matchParams.length} OR p.scientific_name ILIKE $${matchParams.length}`);
    });
    matchQuery += matchConditions.join(' OR ') + `) ORDER BY p.name ASC LIMIT 1`;

    const problemMatchRes = await pool.query(matchQuery, matchParams);
    if (problemMatchRes.rows.length > 0) {
      groundedProblem = problemMatchRes.rows[0];

      // Retrieve grounded remedies from ch_control_measure
      const remediesRes = await pool.query(`
        SELECT cm.id, cm.method_type, cm.title, cm.description, cm.active_ingredient, 
               cm.dose_value, cm.dose_unit_id, cm.phi_days, cm.interval_days, cm.safety_notes
        FROM ch_control_measure cm
        WHERE cm.problem_id = $1 AND cm.is_active = true
        ORDER BY CASE cm.method_type::text WHEN 'BIOLOGICAL' THEN 1 WHEN 'CHEMICAL' THEN 2 ELSE 3 END ASC
      `, [groundedProblem.id]);
      groundedRemedies = remediesRes.rows;

      // Cross-link with commercial products in Partner Input Hub
      try {
        const prodRes = await pool.query(`
          SELECT p.id, p.brand_name, p.technical_name, p.category, p.mrp_inr,
                 (SELECT url FROM pih_product_media pm WHERE pm.product_id = p.id AND pm.is_primary = true LIMIT 1) as thumbnail_url
          FROM pih_products p
          WHERE p.status = 'ACTIVE' AND (
            p.technical_name ILIKE $1 OR p.brand_name ILIKE $1 OR
            EXISTS (SELECT 1 FROM pih_product_claims pc WHERE pc.product_id = p.id AND pc.target_pest_disease ILIKE $2)
          )
          LIMIT 4
        `, [`%${groundedProblem.name.split(' ')[0]}%`, `%${groundedProblem.name}%`]);
        partnerProducts = prodRes.rows;
      } catch (e) {
        // Safe catch if claims table is empty
      }
    }

    // 4. Audit Log in ch_ai_request (Trial mode with zero balance reduction)
    try {
      await pool.query(`
        INSERT INTO ch_ai_request (
          farm_id, request_type, payload, response, status, model_name, model_version, latency_ms
        ) VALUES ($1, 'VISION_INSTANT', $2, $3, 'SUCCESS', 'vivas-crop-health-vision', '2.0.0-trial', $4)
      `, [
        farm_id || null,
        JSON.stringify({ crop_name: finalCropName, organ: aiResult.plant_part }),
        JSON.stringify(aiResult),
        latencyMs
      ]);
    } catch (e) {
      // safe catch for logging
    }

    return res.json({
      success: true,
      data: {
        ai_diagnosis: aiResult,
        grounded_problem: groundedProblem,
        database_remedies: groundedRemedies,
        partner_products: partnerProducts,
        is_evaluation_mode: true
      }
    });
  } catch (err) {
    console.error('Error during instant diagnosis:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/ch/cases/:id/diagnose - Run AI engine diagnosis (SRS 11.2 blended diagnosis)
router.post('/cases/:id/diagnose', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch case with symptoms and crop details
    const caseRes = await pool.query(`
      SELECT c.*, cr.name as crop_name FROM ch_case c JOIN vivas_crops cr ON c.crop_id = cr.id WHERE c.id = $1
    `, [id]);

    if (caseRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }
    const cData = caseRes.rows[0];

    // Find grounded library problems mapped to this crop
    const libraryRes = await pool.query(`
      SELECT p.id, p.code, p.name, p.problem_type, p.potential_severity, p.identification_text,
             (SELECT count(*) FROM ch_problem_symptom ps JOIN ch_case_symptom cs ON ps.symptom_id = cs.symptom_id WHERE ps.problem_id = p.id AND cs.case_id = $1) as matched_symptoms_count
      FROM ch_problem p
      JOIN ch_problem_crop pc ON p.id = pc.problem_id
      WHERE pc.crop_id = $2 AND p.status IN ('VERIFIED','PUBLISHED') AND p.deleted_at IS NULL
      ORDER BY matched_symptoms_count DESC, p.name ASC
    `, [id, cData.crop_id]);

    // Baseline symptom scoring
    const symptomScores = new Map();
    libraryRes.rows.forEach((prob, idx) => {
      const matchScore = prob.matched_symptoms_count > 0 ? (0.65 + (prob.matched_symptoms_count * 0.12)) : (0.55 - (idx * 0.15));
      const confidence = Math.min(Math.max(matchScore, 0.35), 0.95);
      symptomScores.set(prob.code, {
        problem: prob,
        confidence: parseFloat(confidence.toFixed(2)),
        matchedCount: prob.matched_symptoms_count
      });
    });

    // ------------------------------------------------------------------------
    // ML Vision Model Integration (SRS Section 11.2)
    // ------------------------------------------------------------------------
    let mlServiceUrl = process.env.ML_SERVICE_URL;
    let mlServiceToken = process.env.ML_SERVICE_TOKEN;

    // Check for ACTIVE or SHADOW model in chi_ml_model
    let activeModel = null;
    let shadowModel = null;

    try {
      const modelRows = await pool.query(`
        SELECT * FROM chi_ml_model
        WHERE status IN ('ACTIVE', 'SHADOW') AND task = 'IMAGE_CLASSIFY'
        ORDER BY CASE WHEN status = 'ACTIVE' THEN 1 ELSE 2 END ASC
      `);
      for (const m of modelRows.rows) {
        if (m.status === 'ACTIVE' && !activeModel) activeModel = m;
        if (m.status === 'SHADOW' && !shadowModel) shadowModel = m;
      }
    } catch (e) {
      // chi_ml_model table lookup error safe catch
    }

    // Check if case has photos in ch_media
    const casePhotos = await pool.query(`
      SELECT url FROM ch_media
      WHERE owner_type = 'CASE' AND owner_id = $1 AND deleted_at IS NULL
    `, [id]);
    const imageUrls = casePhotos.rows.map(r => r.url);

    let visionPredictions = null;
    let aiRequestId = null;
    let usedModel = activeModel || shadowModel;

    // If an ML service is configured and case has photos or model exists
    if (mlServiceUrl && usedModel) {
      const targetEndpoint = usedModel.endpoint_url || `${mlServiceUrl.replace(/\/+$/, '')}/v1/classify`;
      const startTime = Date.now();

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout (SRS 11.2)

      try {
        const mlPayload = {
          model_version: usedModel.version,
          crop_code: cData.crop_name,
          image_urls: imageUrls,
          case_id: id
        };

        const mlReq = await fetch(targetEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(mlServiceToken ? { Authorization: `Bearer ${mlServiceToken}` } : {})
          },
          body: JSON.stringify(mlPayload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const latency = Date.now() - startTime;
        if (mlReq.ok) {
          const mlData = await mlReq.json();
          visionPredictions = mlData.predictions || [];

          // Log successful ch_ai_request
          const reqLog = await pool.query(`
            INSERT INTO ch_ai_request (
              farm_id, case_id, request_type, payload, response, status, model_name, model_version, latency_ms
            ) VALUES ($1, $2, 'VISION_CLASSIFY', $3, $4, 'SUCCESS', $5, $6, $7) RETURNING id
          `, [
            cData.farm_id, id, JSON.stringify(mlPayload), JSON.stringify(mlData),
            usedModel.name, usedModel.version, latency
          ]);
          aiRequestId = reqLog.rows[0]?.id;

          // If out-of-distribution, flag case for agronomist review
          if (mlData.is_out_of_distribution) {
            await pool.query(`UPDATE ch_case SET status = 'AGRONOMIST_REVIEW' WHERE id = $1`, [id]);
          }
        } else {
          await pool.query(`
            INSERT INTO ch_ai_request (
              farm_id, case_id, request_type, payload, status, error_message, latency_ms
            ) VALUES ($1, $2, 'VISION_CLASSIFY', $3, 'FAILED', $4, $5)
          `, [cData.farm_id, id, JSON.stringify(mlPayload), `HTTP ${mlReq.status}`, latency]);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        const latency = Date.now() - startTime;
        const isTimeout = err.name === 'AbortError';
        await pool.query(`
          INSERT INTO ch_ai_request (
            farm_id, case_id, request_type, status, error_message, latency_ms
          ) VALUES ($1, $2, 'VISION_CLASSIFY', $3, $4, $5)
        `, [cData.farm_id, id, isTimeout ? 'TIMEOUT' : 'FAILED', err.message, latency]);
      }
    }

    // Calculate candidate diagnoses:
    // If ACTIVE model and vision predictions succeeded -> blend (0.7 * image + 0.3 * symptom)
    // If SHADOW model, vision predictions stay in ch_ai_request only; user sees symptom scores.
    let candidates = [];

    const isBlended = activeModel && visionPredictions && visionPredictions.length > 0;

    for (const prob of libraryRes.rows) {
      const symptomInfo = symptomScores.get(prob.code);
      let finalConfidence = symptomInfo.confidence;
      let sources = ['SYMPTOM'];

      if (isBlended) {
        const pred = visionPredictions.find(p => p.problem_code === prob.code);
        if (pred) {
          finalConfidence = parseFloat(((0.7 * pred.score) + (0.3 * symptomInfo.confidence)).toFixed(2));
          sources = ['VISION', 'SYMPTOM'];
        }
      }

      candidates.push({
        problem_id: prob.id,
        problem_code: prob.code,
        problem_name: prob.name,
        problem_type: prob.problem_type,
        confidence: finalConfidence,
        sources,
        model_version: isBlended ? activeModel.version : 'v1.2',
        rationale: isBlended && sources.includes('VISION')
          ? `Blended assessment: Vision classifier (${activeModel.name} ${activeModel.version}) and ${symptomInfo.matchedCount} matching symptom(s).`
          : `Matched ${symptomInfo.matchedCount} observed symptom(s) and identification criteria for ${cData.crop_name} (${prob.name}).`
      });
    }

    // Sort candidates descending by confidence
    candidates.sort((a, b) => b.confidence - a.confidence);
    candidates = candidates.map((cand, idx) => ({ ...cand, rank: idx + 1 }));

    // Save candidates to ch_case_diagnosis
    await pool.query(`DELETE FROM ch_case_diagnosis WHERE case_id = $1 AND is_confirmed = false`, [id]);

    for (const cand of candidates) {
      await pool.query(`
        INSERT INTO ch_case_diagnosis (
          case_id, source, problem_id, problem_type, rank, confidence, model_name, model_version, ai_request_id, rationale
        ) VALUES ($1, 'AI', $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        id,
        cand.problem_id,
        cand.problem_type,
        cand.rank,
        cand.confidence,
        isBlended ? activeModel.name : 'vivas-crop-health-ai',
        cand.model_version,
        aiRequestId || null,
        cand.rationale
      ]);
    }

    res.json({
      success: true,
      message: `AI Diagnosis completed for ${cData.case_no}`,
      data: {
        case_id: id,
        candidates,
        confidence_band: candidates.length > 0 && candidates[0].confidence >= 0.8 ? 'HIGH' : 'MEDIUM'
      }
    });
  } catch (err) {
    console.error('Error in AI diagnosis:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ch/diagnoses/:id/confirm - Confirm human diagnosis
router.post('/diagnoses/:id/confirm', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = await getContext(req);

    const diagRes = await pool.query('SELECT * FROM ch_case_diagnosis WHERE id = $1', [id]);
    if (diagRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Diagnosis record not found' });
    }
    const diag = diagRes.rows[0];

    // Reset confirmed flags for case and confirm this diagnosis
    await pool.query('UPDATE ch_case_diagnosis SET is_confirmed = false WHERE case_id = $1', [diag.case_id]);
    await pool.query('UPDATE ch_case_diagnosis SET is_confirmed = true, confirmed_by = $1, confirmed_at = now() WHERE id = $2', [userId, id]);

    // Update case record with confirmed problem ID and status DIAGNOSED
    await pool.query(`
      UPDATE ch_case SET
        confirmed_problem_id = $1,
        status = 'DIAGNOSED',
        updated_at = now()
      WHERE id = $2
    `, [diag.problem_id, diag.case_id]);

    res.json({ success: true, message: 'Diagnosis confirmed successfully' });
  } catch (err) {
    console.error('Error confirming diagnosis:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/ch/cases/:id/remedies - Fetch control measures for case
router.get('/cases/:id/remedies', async (req, res) => {
  try {
    const { id } = req.params;

    const caseRes = await pool.query(`
      SELECT c.crop_id, c.confirmed_problem_id, c.suspected_problem_id,
             COALESCE(NULLIF(TRIM(f.state_country), ''), 'ALL') AS state
      FROM ch_case c
      LEFT JOIN vivas_farms f ON c.farm_id = f.id
      WHERE c.id = $1
    `, [id]);
    if (caseRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Case not found' });
    }

    const { crop_id, confirmed_problem_id, suspected_problem_id, state } = caseRes.rows[0];
    const problemId = confirmed_problem_id || suspected_problem_id;

    if (!problemId) {
      return res.json({ success: true, data: [], message: 'No problem assigned to case yet' });
    }

    const remediesRes = await pool.query(`
      SELECT cm.*,
        l_unit.label as dose_unit_label, l_basis.label as dose_basis_label, l_app.label as application_method_label,
        i.name as inventory_input_name, i.current_stock as current_stock_qty,
        eff.cases_n,
        eff.resolved_n,
        eff.success_rate,
        eff.success_rate_lower,
        eff.avg_days_to_resolve
      FROM ch_control_measure cm
      LEFT JOIN ch_lookup l_unit ON cm.dose_unit_id = l_unit.id
      LEFT JOIN ch_lookup l_basis ON cm.dose_basis_id = l_basis.id
      LEFT JOIN ch_lookup l_app ON cm.application_method_id = l_app.id
      LEFT JOIN vivas_inputs_catalog i ON cm.input_id = i.id
      LEFT JOIN chi_remedy_effectiveness eff ON cm.id = eff.control_measure_id
        AND (eff.crop_id = $2 OR eff.crop_id IS NULL)
        AND eff.state IN ($3, 'ALL')
      WHERE cm.problem_id = $1 AND (cm.crop_id IS NULL OR cm.crop_id = $2) AND cm.is_active = true
      ORDER BY
        CASE WHEN COALESCE(eff.cases_n, 0) >= 5 THEN 0 ELSE 1 END ASC,
        eff.success_rate_lower DESC NULLS LAST,
        cm.seq ASC,
        cm.method_type ASC
    `, [problemId, crop_id, state || 'ALL']);

    res.json({ success: true, data: remediesRes.rows });
  } catch (err) {
    console.error('Error fetching remedies:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ch/cases/:id/treatments - Apply remedy and create task
router.post('/cases/:id/treatments', async (req, res) => {
  try {
    const { id } = req.params;
    const { control_measure_id, input_id, title, dose_value, dose_unit_id, dose_basis_id, application_method_id, phi_days, cost, create_task = true } = req.body;
    const { userId, farmId } = await getContext(req);

    let taskId = null;
    if (create_task) {
      // Create automated task in vivas_farm_tasks
      const taskRes = await pool.query(`
        INSERT INTO vivas_farm_tasks (
          farm_id, title, category, priority, status, created_by
        ) VALUES ($1, $2, 'Crop Health Treatment', 'High', 'Pending', $3) RETURNING id
      `, [farmId, `Treatment: ${title || 'Crop Health Treatment'}`, userId]);
      taskId = taskRes.rows[0].id;
    }

    const treatRes = await pool.query(`
      INSERT INTO ch_case_treatment (
        case_id, control_measure_id, task_id, input_id, title, dose_value, dose_unit_id,
        dose_basis_id, application_method_id, phi_days, cost, status
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'PLANNED')
      RETURNING *
    `, [
      id, control_measure_id || null, taskId, input_id || null, title || 'Crop Health Treatment',
      dose_value || null, dose_unit_id || null, dose_basis_id || null, application_method_id || null,
      phi_days || null, cost || null
    ]);

    // Update case status to TREATING
    await pool.query(`UPDATE ch_case SET status = 'TREATING', updated_at = now() WHERE id = $1`, [id]);

    res.json({ success: true, message: 'Treatment planned & task created successfully', data: treatRes.rows[0] });
  } catch (err) {
    console.error('Error creating treatment:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 5. DASHBOARD & ALERTS API
// ==========================================

// GET /api/ch/dashboard/summary - Dashboard KPI metrics
router.get('/dashboard/summary', async (req, res) => {
  try {
    const { farmId } = await getContext(req);
    const params = farmId && farmId !== '00000000-0000-0000-0000-000000000000' ? [farmId] : [];
    const farmFilter = params.length > 0 ? ' AND farm_id = $1' : '';

    const [openRes, highRes, reviewRes, treatingRes, resolvedRes] = await Promise.all([
      pool.query(`SELECT count(*) FROM ch_case WHERE status NOT IN ('RESOLVED','CLOSED') AND deleted_at IS NULL${farmFilter}`, params),
      pool.query(`SELECT count(*) FROM ch_case WHERE status NOT IN ('RESOLVED','CLOSED') AND severity IN ('HIGH','SEVERE') AND deleted_at IS NULL${farmFilter}`, params),
      pool.query(`SELECT count(*) FROM ch_case WHERE status IN ('AGRONOMIST_REVIEW','AI_REVIEW') AND deleted_at IS NULL${farmFilter}`, params),
      pool.query(`SELECT count(*) FROM ch_case WHERE status = 'TREATING' AND deleted_at IS NULL${farmFilter}`, params),
      pool.query(`SELECT count(*) FROM ch_case WHERE status = 'RESOLVED' AND deleted_at IS NULL${farmFilter}`, params)
    ]);

    res.json({
      success: true,
      data: {
        open_cases: parseInt(openRes.rows[0].count, 10),
        high_severe: parseInt(highRes.rows[0].count, 10),
        awaiting_review: parseInt(reviewRes.rows[0].count, 10),
        treating_now: parseInt(treatingRes.rows[0].count, 10),
        resolved_this_season: parseInt(resolvedRes.rows[0].count, 10)
      }
    });
  } catch (err) {
    console.error('Error fetching dashboard summary:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
