// backend/services/chi/remedyEffectiveness.js
// Nightly job and mathematical model for computing remedy effectiveness with Wilson score lower bound.
// Conforms to SRS Section 11.5 and Phase 7 specifications.

import pool from '../../config/db.js';

/**
 * Calculates Wilson lower bound score for a Bernoulli parameter (confidence 95%, z = 1.96).
 * Ensures small sample sizes with 100% success (e.g., 2/2 = ~0.342) rank lower
 * than high-confidence treatments with slight variance (e.g., 45/50 = ~0.786).
 *
 * @param {number} resolvedN - Total successes (weighted: RESOLVED = 1, PARTIAL = 0.5)
 * @param {number} casesN - Total evaluated cases
 * @param {number} z - Z-score (defaults to 1.96 for 95% confidence interval)
 * @returns {{ success_rate: number, success_rate_lower: number }}
 */
export function calculateWilsonScore(resolvedN, casesN, z = 1.96) {
  if (!casesN || casesN <= 0) {
    return { success_rate: 0, success_rate_lower: 0 };
  }

  const p = Math.max(0, Math.min(1, resolvedN / casesN));
  const z2 = z * z;
  const denominator = 1 + z2 / casesN;
  const center = p + z2 / (2 * casesN);
  const spread = z * Math.sqrt((p * (1 - p) + z2 / (4 * casesN)) / casesN);
  const lower = Math.max(0, (center - spread) / denominator);

  return {
    success_rate: Number(p.toFixed(4)),
    success_rate_lower: Number(lower.toFixed(4))
  };
}

/**
 * Recomputes remedy effectiveness across all applied treatments linked to cases with known outcomes.
 * Rules:
 * - Treatment must be APPLIED (status = 'APPLIED')
 * - Outcomes: RESOLVED = 1.0, PARTIAL = 0.5, FAILED = 0.0 (SELF_RESOLVED excluded)
 * - Grouped by (control_measure_id, problem_id, crop_id, state, season)
 * - Upserts into chi_remedy_effectiveness
 *
 * @param {import('pg').PoolClient | import('pg').Pool} [dbClient=pool]
 * @returns {Promise<{ updated: number, errors: number }>}
 */
export async function rebuildRemedyEffectiveness(dbClient = pool) {
  const query = `
    WITH evaluated_treatments AS (
      SELECT
        ct.control_measure_id,
        COALESCE(cm.problem_id, c.confirmed_problem_id, c.suspected_problem_id) AS problem_id,
        c.crop_id,
        COALESCE(NULLIF(TRIM(f.state_country), ''), 'ALL') AS state,
        'ALL' AS season,
        ct.cost,
        CASE
          WHEN c.resolved_at IS NOT NULL AND ct.created_at IS NOT NULL THEN
            EXTRACT(EPOCH FROM (c.resolved_at - ct.created_at)) / 86400.0
          ELSE NULL
        END AS days_to_resolve,
        CASE
          WHEN c.outcome = 'RESOLVED' THEN 1.0
          WHEN c.outcome = 'PARTIAL' THEN 0.5
          WHEN c.outcome = 'FAILED' THEN 0.0
          ELSE NULL
        END AS outcome_score
      FROM ch_case_treatment ct
      JOIN ch_case c ON ct.case_id = c.id
      JOIN ch_control_measure cm ON ct.control_measure_id = cm.id
      LEFT JOIN vivas_farms f ON c.farm_id = f.id
      WHERE ct.status = 'APPLIED'
        AND c.outcome IN ('RESOLVED', 'PARTIAL', 'FAILED')
        AND c.deleted_at IS NULL
        AND c.crop_id IS NOT NULL
        AND cm.problem_id IS NOT NULL
    ),
    aggregated AS (
      SELECT
        control_measure_id,
        problem_id,
        crop_id,
        state,
        season,
        COUNT(*)::int AS cases_n,
        COALESCE(SUM(outcome_score), 0)::numeric AS resolved_n,
        AVG(days_to_resolve) AS avg_days_to_resolve,
        AVG(cost) AS avg_cost
      FROM evaluated_treatments
      GROUP BY control_measure_id, problem_id, crop_id, state, season
    )
    SELECT * FROM aggregated;
  `;

  const { rows } = await dbClient.query(query);
  let updated = 0;

  for (const row of rows) {
    const { success_rate, success_rate_lower } = calculateWilsonScore(
      parseFloat(row.resolved_n),
      parseInt(row.cases_n, 10)
    );

    await dbClient.query(
      `INSERT INTO chi_remedy_effectiveness (
        control_measure_id,
        problem_id,
        crop_id,
        state,
        season,
        cases_n,
        resolved_n,
        success_rate,
        success_rate_lower,
        avg_days_to_resolve,
        avg_cost,
        computed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (control_measure_id, crop_id, state, season)
      DO UPDATE SET
        problem_id = EXCLUDED.problem_id,
        cases_n = EXCLUDED.cases_n,
        resolved_n = EXCLUDED.resolved_n,
        success_rate = EXCLUDED.success_rate,
        success_rate_lower = EXCLUDED.success_rate_lower,
        avg_days_to_resolve = EXCLUDED.avg_days_to_resolve,
        avg_cost = EXCLUDED.avg_cost,
        computed_at = NOW()`,
      [
        row.control_measure_id,
        row.problem_id,
        row.crop_id,
        row.state,
        row.season,
        row.cases_n,
        Math.round(row.resolved_n),
        success_rate,
        success_rate_lower,
        row.avg_days_to_resolve ? Number(parseFloat(row.avg_days_to_resolve).toFixed(2)) : null,
        row.avg_cost ? Number(parseFloat(row.avg_cost).toFixed(2)) : null
      ]
    );
    updated++;
  }

  return { updated, errors: 0 };
}

export default {
  calculateWilsonScore,
  rebuildRemedyEffectiveness
};
