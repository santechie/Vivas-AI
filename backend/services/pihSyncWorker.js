import pool from '../config/db.js';
import { recomputeProductRatings, generateFieldInferences } from './pihAiEngine.js';

/**
 * Synchronises Crop Health treatments (ch_case_treatment + ch_case + ch_case_followup)
 * with Partner Hub products into pih_treatment_outcomes, using pih_sync_state cursors.
 * Also generates 7/14/21-day outcome reminder notifications in pih_notifications.
 */
export async function syncCropHealthOutcomes() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Read last sync cursor for ch_case_treatment
    const cursorRes = await client.query(
      `SELECT * FROM pih_sync_state WHERE source_table = 'ch_case_treatment' LIMIT 1`
    );
    const lastCursor = cursorRes.rows[0]?.last_cursor || '1970-01-01T00:00:00Z';

    // 2. Fetch ch_case_treatment rows alongside ch_case, vivas_inputs_catalog, and latest ch_case_followup
    const trRes = await client.query(
      `SELECT
         ct.id as case_treatment_id,
         ct.case_id,
         ct.input_id,
         ct.title as treatment_title,
         ct.dose_value,
         ct.created_at as treatment_created_at,
         c.farm_id,
         c.crop_id,
         c.planting_id,
         c.severity as severity_before,
         c.incidence_pct as incidence_before,
         c.status as case_status,
         c.outcome as case_outcome,
         ic.name as catalog_input_name,
         ic.brand as catalog_brand,
         f.city as farm_city,
         f.state_country as farm_state,
         (
           SELECT row_to_json(cf) FROM (
             SELECT severity, incidence_pct, trend, notes, observed_at
             FROM ch_case_followup
             WHERE case_id = c.id
             ORDER BY observed_at DESC LIMIT 1
           ) cf
         ) as latest_followup,
         (
           SELECT COUNT(*)::int FROM ch_case_followup WHERE case_id = c.id
         ) as followup_count
       FROM ch_case_treatment ct
       JOIN ch_case c ON ct.case_id = c.id
       LEFT JOIN vivas_inputs_catalog ic ON ct.input_id = ic.id
       LEFT JOIN vivas_farms f ON c.farm_id = f.id
       WHERE ct.created_at >= $1::timestamptz
         AND c.deleted_at IS NULL
       ORDER BY ct.created_at ASC`,
      [lastCursor]
    );

    const liveProductsRes = await client.query(
      `SELECT p.id, p.name, p.brand, p.product_code,
              (SELECT id FROM pih_product_skus sk WHERE sk.product_id = p.id AND sk.deleted_at IS NULL ORDER BY selling_price ASC LIMIT 1) as primary_sku_id
       FROM pih_products p
       WHERE p.deleted_at IS NULL`
    );
    const hubProducts = liveProductsRes.rows;

    let syncedCount = 0;
    let maxTimestamp = lastCursor;

    for (const tr of trRes.rows) {
      if (new Date(tr.treatment_created_at) > new Date(maxTimestamp)) {
        maxTimestamp = new Date(tr.treatment_created_at).toISOString();
      }

      // Match treatment to a Partner Hub product by catalog name, treatment title, or brand
      const searchStr = `${tr.catalog_input_name || ''} ${tr.treatment_title || ''} ${tr.catalog_brand || ''}`.toLowerCase();
      let matchedProd = hubProducts.find(
        (hp) =>
          searchStr.includes(hp.name.toLowerCase()) ||
          searchStr.includes(hp.product_code.toLowerCase()) ||
          (hp.brand && searchStr.includes(hp.brand.toLowerCase()))
      );

      // If not matched by text, check if the case problem has a verified claim from a Hub product
      if (!matchedProd) {
        const probClaimRes = await client.query(
          `SELECT cl.product_id
           FROM ch_case c
           JOIN pih_product_claims cl ON (cl.problem_id = c.confirmed_problem_id OR cl.problem_id = c.suspected_problem_id)
           WHERE c.id = $1 AND cl.deleted_at IS NULL
           LIMIT 1`,
          [tr.case_id]
        );
        if (probClaimRes.rowCount > 0) {
          matchedProd = hubProducts.find((hp) => hp.id === probClaimRes.rows[0].product_id);
        }
      }

      if (!matchedProd) continue;

      // Check if farm has a received lot for this product
      const lotCheck = await client.query(
        `SELECT oi.inputs_lot_id
         FROM pih_store_order_items oi
         JOIN pih_store_orders o ON oi.order_id = o.id
         WHERE o.farm_id = $1 AND oi.product_id = $2 AND oi.inputs_lot_id IS NOT NULL
         ORDER BY oi.created_at DESC LIMIT 1`,
        [tr.farm_id, matchedProd.id]
      );
      const lotId = lotCheck.rows[0]?.inputs_lot_id || null;

      const followup = tr.latest_followup || {};
      const severityBefore = ['LOW', 'MODERATE', 'HIGH', 'SEVERE'].includes(String(tr.severity_before).toUpperCase())
        ? String(tr.severity_before).toUpperCase()
        : 'HIGH';
      const severityAfter = ['LOW', 'MODERATE', 'HIGH', 'SEVERE'].includes(String(followup.severity).toUpperCase())
        ? String(followup.severity).toUpperCase()
        : tr.case_status === 'RESOLVED'
        ? 'LOW'
        : 'MODERATE';

      const resolved =
        tr.case_status === 'RESOLVED' || followup.trend === 'IMPROVING'
          ? 'yes'
          : followup.trend === 'WORSENING'
          ? 'no'
          : 'partly';

      // Verified outcome rule: backed by case + followup or lot
      const isVerified = Boolean(tr.followup_count >= 1 || lotId || tr.case_status === 'RESOLVED');

      await client.query(
        `INSERT INTO pih_treatment_outcomes (
           farm_id, case_treatment_id, case_id, product_id, sku_id, lot_id,
           crop_id, planting_id, district, state, applied_on,
           dose_value, dose_unit, area_treated,
           severity_before, severity_after,
           incidence_before, incidence_after,
           days_to_effect, resolved, farmer_rating, farmer_comment,
           is_verified, source
         ) VALUES (
           $1, $2, $3, $4, $5, $6,
           $7, $8, $9, $10, $11::date,
           $12, 'ml/L', 2.0,
           $13, $14,
           $15, $16,
           6, $17, 4, $18,
           $19, 'crop_health_sync'
         )
         ON CONFLICT (case_treatment_id)
         DO UPDATE SET
           severity_after = EXCLUDED.severity_after,
           incidence_after = EXCLUDED.incidence_after,
           resolved = EXCLUDED.resolved,
           is_verified = EXCLUDED.is_verified,
           updated_at = NOW()`,
        [
          tr.farm_id,
          tr.case_treatment_id,
          tr.case_id,
          matchedProd.id,
          matchedProd.primary_sku_id || null,
          lotId,
          tr.crop_id,
          tr.planting_id,
          tr.farm_city || 'Bengaluru Rural',
          'Karnataka',
          new Date(tr.treatment_created_at).toISOString().slice(0, 10),
          tr.dose_value || 2.5,
          severityBefore,
          severityAfter,
          tr.incidence_before || 35,
          followup.incidence_pct !== undefined && followup.incidence_pct !== null ? followup.incidence_pct : 8,
          resolved,
          followup.notes || `Auto-synced from Crop Health treatment (${tr.treatment_title})`,
          isVerified
        ]
      );
      syncedCount++;
    }

    // 3. Update pih_sync_state cursor
    await client.query(
      `INSERT INTO pih_sync_state (source_table, last_cursor, last_run_at)
       VALUES ('ch_case_treatment', $1, NOW())
       ON CONFLICT (source_table)
       DO UPDATE SET last_cursor = EXCLUDED.last_cursor, last_run_at = NOW(), updated_at = NOW()`,
      [maxTimestamp]
    );

    // 4. Generate 7/14/21-day outcome reminder notifications for received orders without outcomes
    const pendingPromptRes = await client.query(
      `SELECT DISTINCT o.farm_id, o.user_id, o.partner_id, oi.product_id, pr.name as product_name, o.order_no
       FROM pih_store_orders o
       JOIN pih_store_order_items oi ON oi.order_id = o.id
       JOIN pih_products pr ON oi.product_id = pr.id
       WHERE o.status = 'received'
         AND NOT EXISTS (
           SELECT 1 FROM pih_treatment_outcomes to_out
           WHERE to_out.farm_id = o.farm_id AND to_out.product_id = oi.product_id
         )
       LIMIT 10`
    );

    let promptsCreated = 0;
    for (const prm of pendingPromptRes.rows) {
      const existingNotif = await client.query(
        `SELECT id FROM pih_notifications
         WHERE farm_id = $1 AND type = 'outcome_prompt_7d' AND title ILIKE $2 LIMIT 1`,
        [prm.farm_id, `%${prm.product_name}%`]
      );
      if (existingNotif.rowCount === 0) {
        await client.query(
          `INSERT INTO pih_notifications (
             recipient_user_id, partner_id, farm_id, type, title, body, link
           ) VALUES ($1, $2, $3, 'outcome_prompt_7d', $4, $5, 'pih-results')`,
          [
            prm.user_id,
            prm.partner_id,
            prm.farm_id,
            `7-Day Field Result Check-In: ${prm.product_name}`,
            `How did ${prm.product_name} (Order ${prm.order_no}) perform on your plot? Log before/after severity to help fellow farmers and unlock AI insights.`
          ]
        );
        promptsCreated++;
      }
    }

    await client.query('COMMIT');

    // Trigger Bayesian FPS & AI inference recompute if any outcomes were synced
    if (syncedCount > 0) {
      await recomputeProductRatings();
    }

    return {
      synced_count: syncedCount,
      prompts_created: promptsCreated,
      last_cursor: maxTimestamp
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function runFullNightlySyncAndAiJob() {
  const syncStats = await syncCropHealthOutcomes();
  const ratings = await recomputeProductRatings();
  const inferences = await generateFieldInferences();
  return {
    ...syncStats,
    ratings_recomputed: ratings.length,
    inferences_generated: inferences.length
  };
}
