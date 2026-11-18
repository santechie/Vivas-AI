/**
 * Phase 5 Automated Seed & Verification Script
 * Verifies:
 *  1. Crop Health Case (ch_case) + Soil Lab (vivas_soil_tests) triggers & On-Farm Stock (vivas_inputs_inventory)
 *  2. AI Recommendation generation (up to 3 ranked products per problem with explainable reason JSONB)
 *  3. On-Farm Stock Priority (vivas_inputs_inventory match boosted & flagged in_stock_on_farm = true)
 *  4. Pre-Harvest Interval (PHI) Safety Suppression when planned_harvest_date < CURRENT_DATE + phi_days
 *  5. Soil Lab Deficiency Trigger recommendations
 *  6. 1-click Buy Now (pih_carts + pih_cart_items) & Add to Shopping List (vivas_shopping_list)
 *  7. 1-click Create Application Task (vivas_farm_tasks) & Dismiss with reason
 *  8. Hard Rule 7: vivas_ai_credits debit + ch_ai_request ('pih_recommendation') + pih_audit_log
 */

import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import express from '../backend/node_modules/express/index.js';
import pool from '../backend/config/db.js';
import partnerHubRouter from '../backend/routes/partnerHub.js';

const testApp = express();
testApp.use(express.json({ limit: '15mb' }));
testApp.use('/api/pih', partnerHubRouter);

let server = null;
let BASE = 'http://127.0.0.1:0/api/pih';

async function api(endpoint, { method = 'GET', body = null, role = 'farmer', partnerId = null } = {}) {
  const headers = {
    'Content-Type': 'application/json',
    'x-pih-role': role
  };
  if (partnerId) headers['x-partner-id'] = partnerId;
  if (method === 'POST') headers['Idempotency-Key'] = crypto.randomUUID();

  const res = await fetch(`${BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function runVerification() {
  server = await new Promise((resolve) => {
    const s = testApp.listen(0, '127.0.0.1', () => resolve(s));
  });
  const addr = server.address();
  BASE = `http://127.0.0.1:${addr.port}/api/pih`;

  console.log('=== PHASE 5 AUTOMATED VERIFICATION: AI RECOMMENDATIONS, PHI SAFETY & ON-FARM STOCK ===');

  // 1. Ensure a diagnosed ch_case, a vivas_soil_tests deficiency row, and an on-farm inventory item exist
  const farmRes = await pool.query('SELECT id, owner_id FROM vivas_farms WHERE is_active = TRUE ORDER BY last_accessed_at DESC NULLS LAST LIMIT 1');
  const farmId = farmRes.rows[0].id;
  const userRes = await pool.query('SELECT id FROM vivas_users ORDER BY created_at ASC LIMIT 1');
  const userId = userRes.rows[0].id;
  const cropRes = await pool.query('SELECT id, name FROM vivas_crops ORDER BY id ASC LIMIT 1');
  const crop = cropRes.rows[0];

  // Find a problem that has SME-verified claims on live products
  const claimedProbRes = await pool.query(
    `SELECT pr.id, pr.name, pr.problem_type, p.id AS product_id, p.name AS product_name
     FROM pih_product_claims cl
     JOIN ch_problem pr ON cl.problem_id = pr.id
     JOIN pih_products p ON cl.product_id = p.id
     WHERE cl.sme_status = 'verified' AND p.status = 'live' AND p.deleted_at IS NULL
     LIMIT 1`
  );
  assert.ok(claimedProbRes.rowCount > 0, 'Must have at least 1 SME-verified claim linked to a ch_problem');
  const claimedProblem = claimedProbRes.rows[0];

  // Ensure an on-farm inventory record exists in vivas_inputs_inventory matching claimedProblem.product_name
  const existingInv = await pool.query(
    `SELECT id FROM vivas_inputs_inventory WHERE name ILIKE $1 LIMIT 1`,
    [`%${claimedProblem.product_name}%`]
  );
  if (existingInv.rowCount === 0) {
    await pool.query(
      `INSERT INTO vivas_inputs_inventory (
         name, input_type, quantity_on_hand, quantity_available, unit, unit_cost, status
       ) VALUES ($1, 'fertilizer', 6, 6, 'Bottles', 240.00, 'in_stock')`,
      [claimedProblem.product_name]
    );
  } else {
    await pool.query(
      `UPDATE vivas_inputs_inventory SET quantity_available = 6, quantity_on_hand = 6 WHERE id = $1`,
      [existingInv.rows[0].id]
    );
  }

  // Create or fetch an open Crop Health case linked to claimedProblem.id
  let caseRes = await pool.query(
    `SELECT * FROM ch_case WHERE confirmed_problem_id = $1 AND deleted_at IS NULL LIMIT 1`,
    [claimedProblem.id]
  );
  let testCaseId;
  if (caseRes.rowCount === 0) {
    const caseNo = `CH-PIH-${Math.floor(1000 + Math.random() * 9000)}`;
    const insCase = await pool.query(
      `INSERT INTO ch_case (
         case_no, farm_id, crop_id, crop_stage, confirmed_problem_id,
         severity, incidence_pct, area_affected, area_unit,
         symptoms_notes, status, reported_by
       ) VALUES ($1, $2, $3, 'Vegetative', $4, 'HIGH', 34.0, 3.0, 'Acres', 'Foliar symptoms detected in Block A', 'DIAGNOSED', $5)
       RETURNING id`,
      [caseNo, farmId, crop.id, claimedProblem.id, userId]
    );
    testCaseId = insCase.rows[0].id;
  } else {
    testCaseId = caseRes.rows[0].id;
  }

  // Ensure a soil test with low Nitrogen exists in vivas_soil_tests
  let soilRes = await pool.query(`SELECT id FROM vivas_soil_tests ORDER BY created_at DESC LIMIT 1`);
  let testSoilId;
  if (soilRes.rowCount === 0) {
    const insSoil = await pool.query(
      `INSERT INTO vivas_soil_tests (
         title, crop_category, crop, location, author_name, note_year,
         content, ph, nitrogen, phosphorus, potassium
       ) VALUES (
         'Kharif Pre-Sowing Soil Lab Report — Block B', 'Vegetables', $1,
         'Bengaluru Rural Plot B', 'Vivas Soil Lab', 2026,
         'Low available Nitrogen (112 kg/ha) detected; foliar nano-urea supplementation advised.',
         6.5, 112, 34, 185
       ) RETURNING id`,
      [crop.name]
    );
    testSoilId = insSoil.rows[0].id;
  } else {
    testSoilId = soilRes.rows[0].id;
  }

  // Record initial AI credits used before generating recommendations
  await pool.query(
    `INSERT INTO vivas_ai_credits (user_id, monthly_credits_remaining, credits_used)
     VALUES ($1, 50, 0)
     ON CONFLICT DO NOTHING`,
    [userId]
  );
  const creditsBeforeRes = await pool.query(
    `SELECT COALESCE(credits_used, 0)::int AS used FROM vivas_ai_credits WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  const creditsUsedBefore = creditsBeforeRes.rows[0]?.used || 0;

  console.log(
    `[PASS 1/8] Verified triggers ready: Crop Health Case (${testCaseId}), Soil Test (${testSoilId}), and On-Farm Stock ("${claimedProblem.product_name}").`
  );

  // 2. Generate AI Recommendations for the Crop Health Case
  const genCaseRes = await api('/recommendations/generate', {
    method: 'POST',
    role: 'farmer',
    body: {
      farm_id: farmId,
      case_id: testCaseId
    }
  });
  assert.equal(genCaseRes.status, 201, `POST /recommendations/generate failed: ${genCaseRes.json.message}`);
  const caseRecs = genCaseRes.json.data.recommendations;
  assert.ok(caseRecs.length >= 1 && caseRecs.length <= 3, `Expected 1..3 ranked recommendations, got ${caseRecs.length}`);
  assert.equal(caseRecs[0].rank, 1, 'Top recommendation must have rank = 1');
  assert.ok(caseRecs[0].reason.why_summary, 'Recommendation must include explainable why_summary');
  assert.ok(caseRecs[0].reason.model_name, 'Recommendation must include model_name');
  console.log(
    `[PASS 2/8] Generated ${caseRecs.length} ranked AI recommendation(s) for Crop Health Case (Top #1: score=${caseRecs[0].score}, dose=${caseRecs[0].dose_for_area} L/kg, est_cost=₹${caseRecs[0].est_cost}).`
  );

  // 3. Verify On-Farm Stock Priority (in_stock_on_farm = true)
  const inStockRec = caseRecs.find((r) => r.reason?.in_stock_on_farm === true);
  assert.ok(inStockRec, 'Product present in vivas_inputs_inventory must be flagged with in_stock_on_farm = true');
  assert.equal(inStockRec.rank, 1, 'On-farm stocked product should be boosted to #1 rank');
  console.log(
    `[PASS 3/8] On-Farm Stock Priority verified: Product #1 flagged in_stock_on_farm=true (${inStockRec.reason.on_farm_qty} ${inStockRec.reason.on_farm_unit} available in shed).`
  );

  // 4. Verify Pre-Harvest Interval (PHI) Safety Suppression when harvest is 2 days away
  const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const phiGenRes = await api('/recommendations/generate', {
    method: 'POST',
    role: 'farmer',
    body: {
      farm_id: farmId,
      case_id: testCaseId,
      override_harvest_date: twoDaysFromNow
    }
  });
  assert.equal(phiGenRes.status, 201, 'PHI test call should return 201');
  const suppressedList = phiGenRes.json.data.suppressed_phi_products || [];
  assert.ok(suppressedList.length > 0, 'Products with phi_days (7d) > 2d harvest window must be suppressed');
  console.log(
    `[PASS 4/8] PHI Harvest-Safety Suppression verified: ${suppressedList.length} product(s) suppressed when planned harvest (${twoDaysFromNow}) is inside the 7-day PHI window.`
  );

  // Re-generate normal recommendations (without 2-day harvest constraint) so we have active recommendations for action tests
  await api('/recommendations/generate', {
    method: 'POST',
    role: 'farmer',
    body: { farm_id: farmId, case_id: testCaseId }
  });

  // 5. Generate AI Recommendations for Soil Test Deficiency
  const genSoilRes = await api('/recommendations/generate', {
    method: 'POST',
    role: 'farmer',
    body: {
      farm_id: farmId,
      soil_test_id: testSoilId
    }
  });
  assert.equal(genSoilRes.status, 201, `Soil test recommendation generation failed: ${genSoilRes.json.message}`);
  const soilRecs = genSoilRes.json.data.recommendations;
  assert.ok(soilRecs.length >= 1, 'Should generate >= 1 recommendation for Soil Lab deficiency');
  console.log(
    `[PASS 5/8] Soil Lab Deficiency trigger generated ${soilRecs.length} ranked recommendation(s) (${soilRecs[0].reason.trigger_label}).`
  );

  // Fetch all recommendations via GET /api/pih/recommendations
  const listRes = await api(`/recommendations?farm_id=${farmId}`);
  assert.equal(listRes.status, 200, 'GET /recommendations should succeed');
  const allRecs = listRes.json.data;
  assert.ok(allRecs.length >= 2, 'Should have >= 2 active recommendations');

  // 6. Test 1-click Buy Now & Add to Shopping List
  const recForBuy = allRecs[0];
  const buyRes = await api(`/recommendations/${recForBuy.id}/buy-now`, {
    method: 'POST',
    role: 'farmer',
    body: {}
  });
  assert.equal(buyRes.status, 201, `POST /recommendations/:id/buy-now failed: ${buyRes.json.message}`);
  assert.equal(buyRes.json.data.recommendation.status, 'bought');

  const recForList = allRecs[1] || allRecs[0];
  const listAddRes = await api(`/recommendations/${recForList.id}/add-to-shopping-list`, {
    method: 'POST',
    role: 'farmer',
    body: {}
  });
  assert.equal(listAddRes.status, 201, `POST /recommendations/:id/add-to-shopping-list failed: ${listAddRes.json.message}`);
  assert.equal(listAddRes.json.data.recommendation.status, 'added_to_list');
  assert.ok(listAddRes.json.data.shopping_list_item.id, 'Must create a vivas_shopping_list row');
  console.log(
    `[PASS 6/8] 1-Click Buy Now (cart_id=${buyRes.json.data.cart_id}) & Add to Shopping List (code=${listAddRes.json.data.shopping_list_item.item_code}) verified.`
  );

  // 7. Test 1-click Create Application Task & Dismiss with Reason
  const recForTask = allRecs[2] || allRecs[0];
  const taskRes = await api(`/recommendations/${recForTask.id}/create-task`, {
    method: 'POST',
    role: 'farmer',
    body: {
      location: 'Bengaluru Rural Block A'
    }
  });
  assert.equal(taskRes.status, 201, `POST /recommendations/:id/create-task failed: ${taskRes.json.message}`);
  assert.equal(taskRes.json.data.recommendation.status, 'task_created');
  assert.ok(taskRes.json.data.task.id, 'Must create a vivas_farm_tasks row');

  const recForDismiss = soilRecs[soilRecs.length - 1];
  const dismissRes = await api(`/recommendations/${recForDismiss.id}`, {
    method: 'PUT',
    role: 'farmer',
    body: {
      status: 'dismissed',
      dismiss_reason: 'Already applied foliar spray earlier this week'
    }
  });
  assert.equal(dismissRes.status, 200, 'PUT /recommendations/:id should succeed');
  assert.equal(dismissRes.json.data.status, 'dismissed');
  console.log(
    `[PASS 7/8] 1-Click Create Farm Task (task_id=${taskRes.json.data.task.id}) & Dismiss with Reason verified.`
  );

  // 8. Verify Hard Rule 7: vivas_ai_credits debited, ch_ai_request logged ('pih_recommendation'), and pih_audit_log written
  const creditsAfterRes = await pool.query(
    `SELECT COALESCE(credits_used, 0)::int AS used FROM vivas_ai_credits WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  const creditsUsedAfter = creditsAfterRes.rows[0]?.used || 0;
  assert.ok(
    creditsUsedAfter > creditsUsedBefore,
    `Expected vivas_ai_credits.credits_used to increase (${creditsUsedBefore} -> ${creditsUsedAfter})`
  );

  const aiReqCountRes = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM ch_ai_request
     WHERE request_type = 'pih_recommendation' OR payload->>'pih_request_type' = 'pih_recommendation'`
  );
  assert.ok(aiReqCountRes.rows[0].cnt >= 2, 'ch_ai_request must log pih_recommendation calls');

  const auditRes = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM pih_audit_log WHERE entity = 'pih_recommendations'`
  );
  assert.ok(auditRes.rows[0].cnt >= 4, 'pih_audit_log must record recommendation actions');

  console.log(
    `[PASS 8/8] Hard Rule 7 verified: vivas_ai_credits debited (${creditsUsedBefore} -> ${creditsUsedAfter} used), ${aiReqCountRes.rows[0].cnt} 'pih_recommendation' calls logged in ch_ai_request, and ${auditRes.rows[0].cnt} audit log entries recorded.`
  );

  console.log('\nALL 8 PHASE 5 VERIFICATION TESTS PASSED SUCCESSFULLY!');
}

runVerification()
  .catch((err) => {
    console.error('PHASE 5 VERIFICATION FAILED:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (server) server.close();
    await pool.end();
  });
