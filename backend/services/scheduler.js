import pool from '../config/db.js';
import { runFullNightlySyncAndAiJob, syncCropHealthOutcomes } from './pihSyncWorker.js';

// Registry of executable jobs
const jobRegistry = new Map();

/**
 * Register a background job runner function
 */
export function registerJob(jobName, runner) {
  jobRegistry.set(jobName, runner);
}

// ---------------------------------------------------------------------
// Built-in Scheduled Job Implementations
// ---------------------------------------------------------------------

// 1. Regulatory Licence Expiry Monitor
// Scans pih_partner_documents; flags docs expiring in <=30 or <=60 days
registerJob('licence_expiry_monitor', async () => {
  const client = await pool.connect();
  let flaggedCount = 0;

  try {
    await client.query('BEGIN');

    // Find active partners' documents expiring in <= 60 days
    const expRes = await client.query(`
      SELECT d.id, d.partner_id, d.doc_type, d.doc_number, d.expires_on, p.legal_name, p.brand_name
      FROM pih_partner_documents d
      JOIN pih_partners p ON d.partner_id = p.id
      WHERE d.deleted_at IS NULL
        AND d.expires_on IS NOT NULL
        AND d.expires_on <= (CURRENT_DATE + INTERVAL '60 days')
        AND p.deleted_at IS NULL
    `);

    for (const doc of expRes.rows) {
      const daysLeft = Math.ceil((new Date(doc.expires_on) - Date.now()) / (1000 * 60 * 60 * 24));
      const notifTitle = `Regulatory Licence Notice: ${doc.doc_type} (${doc.brand_name})`;
      const notifBody = `${doc.doc_type} licence #${doc.doc_number} for ${doc.legal_name} ${
        daysLeft <= 0 ? 'has expired on ' + doc.expires_on : 'expires in ' + daysLeft + ' days'
      }. Update or renew document to prevent product catalogue delisting.`;

      // Check if alert already logged recently (within 7 days)
      const existing = await client.query(`
        SELECT id FROM pih_notifications
        WHERE partner_id = $1 AND title = $2 AND created_at >= (NOW() - INTERVAL '7 days')
        LIMIT 1
      `, [doc.partner_id, notifTitle]);

      if (existing.rowCount === 0) {
        await client.query(`
          INSERT INTO pih_notifications (partner_id, type, title, body, link)
          VALUES ($1, 'licence_expiry_alert', $2, $3, 'pih-compliance')
        `, [doc.partner_id, notifTitle, notifBody]);
        flaggedCount++;
      }
    }

    await client.query('COMMIT');
    return { flagged_count: flaggedCount, documents_scanned: expRes.rowCount };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// 2. Bayesian Field Performance Scores (FPS) and AI Inference Recompute
registerJob('bayesian_fps_recompute', async () => {
  return await runFullNightlySyncAndAiJob();
});

// 3. 7/14/21-Day Treatment Outcome Feedback Reminder Prompts
registerJob('outcome_reminder_prompts', async () => {
  return await syncCropHealthOutcomes();
});

// 4. Inventory Low-Stock Scanner
registerJob('inventory_low_stock_scanner', async () => {
  const client = await pool.connect();
  let alertsCount = 0;

  try {
    await client.query('BEGIN');

    // Scan vivas_inputs_catalog for items where quantity <= reorder_level
    const lowRes = await client.query(`
      SELECT id, name, category, quantity, reorder_level, unit
      FROM vivas_inputs_catalog
      WHERE is_active = TRUE
        AND quantity <= COALESCE(reorder_level, 5)
      LIMIT 50
    `).catch(() => ({ rowCount: 0, rows: [] }));

    for (const item of lowRes.rows) {
      alertsCount++;
    }

    await client.query('COMMIT');
    return { low_stock_items: alertsCount };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

/**
 * Execute a specific job by name and update system_scheduled_jobs stats
 */
export async function runScheduledJob(jobName) {
  const runner = jobRegistry.get(jobName);
  if (!runner) {
    throw new Error(`Job '${jobName}' is not registered in job registry`);
  }

  const startTime = Date.now();
  let status = 'completed';
  let errorMsg = null;
  let result = null;

  try {
    result = await runner();
  } catch (err) {
    status = 'failed';
    errorMsg = err.message;
    console.error(`[Scheduler] Job ${jobName} failed:`, err);
  }

  const durationMs = Date.now() - startTime;

  await pool.query(`
    UPDATE system_scheduled_jobs
    SET last_run_at = NOW(),
        next_run_at = NOW() + (interval_seconds || ' seconds')::interval,
        last_duration_ms = $1,
        last_status = $2,
        last_error = $3,
        run_count = run_count + 1,
        updated_at = NOW()
    WHERE job_name = $4
  `, [durationMs, status, errorMsg, jobName]);

  return { jobName, status, durationMs, result, error: errorMsg };
}

/**
 * Scheduler Tick: finds all enabled jobs whose next_run_at <= NOW() and runs them
 */
export async function tickScheduler() {
  const dueJobsRes = await pool.query(`
    SELECT job_name
    FROM system_scheduled_jobs
    WHERE is_enabled = TRUE
      AND (next_run_at IS NULL OR next_run_at <= NOW())
    ORDER BY next_run_at ASC NULLS FIRST
  `).catch(() => ({ rows: [] }));

  const executed = [];
  for (const row of dueJobsRes.rows) {
    if (jobRegistry.has(row.job_name)) {
      const outcome = await runScheduledJob(row.job_name);
      executed.push(outcome);
    }
  }

  return executed;
}
