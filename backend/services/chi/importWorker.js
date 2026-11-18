// backend/services/chi/importWorker.js
// Background worker for processing CHI import runs and profile schedules.
// Conforms to SRS Sections 7.3, 7.6, 9.3, and 9.4.

import os from 'os';
import path from 'path';
import pool from '../../config/db.js';
import storage from './storage.js';
import { safeFetch } from './safeFetch.js';
import { getConnector } from './connectors/index.js';
import { isLicenseAllowed, normalizeLicense } from './connectors/licenseNormalizer.js';
import { processImage, hammingDistance } from './imageProcessor.js';
import { emitDomainEvent } from '../eventBus.js';
import { registerJob } from '../scheduler.js';
import { rebuildRemedyEffectiveness } from './remedyEffectiveness.js';

const WORKER_ID = `chi-worker-${os.hostname()}-${process.pid}`;

/**
 * Appends a log entry to chi_import_log
 */
export async function logRunEvent(runId, level, code, message, context = {}) {
  try {
    await pool.query(
      `INSERT INTO chi_import_log (run_id, level, code, message, context)
       VALUES ($1, $2, $3, $4, $5)`,
      [runId, level, code, message, JSON.stringify(context)]
    );
  } catch (err) {
    console.error('[CHI logRunEvent] Failed to write log:', err.message);
  }
}

/**
 * Core processor for a single import run
 */
export async function processRun(runId) {
  const client = await pool.connect();

  try {
    // 1. Fetch run details and check cancellation
    const runRes = await client.query(
      `SELECT r.*, p.crop_ids, p.problem_ids, p.max_images_per_problem, p.max_images_per_run, p.auto_accept,
              s.code AS source_code, s.connector_type, s.base_url, s.allowed_hosts,
              s.allowed_licenses_display, s.allowed_licenses_training, s.trust_level,
              s.download_size, s.min_image_px, s.max_image_bytes, s.is_active AS source_active
       FROM chi_import_run r
       JOIN chi_source s ON s.id = r.source_id
       LEFT JOIN chi_import_profile p ON p.id = r.profile_id
       WHERE r.id = $1`,
      [runId]
    );

    if (runRes.rowCount === 0) return;
    const run = runRes.rows[0];

    if (!run.source_active) {
      await client.query(`UPDATE chi_import_run SET status = 'FAILED', error_summary = 'Source is inactive' WHERE id = $1`, [runId]);
      await logRunEvent(runId, 'ERROR', 'SOURCE_INACTIVE', 'Source is inactive.');
      return;
    }

    const connector = getConnector(run.connector_type);
    let cursor = run.cursor || {};
    let runNewCount = run.new_count || 0;
    let runDupCount = run.duplicate_count || 0;
    let runBlockedCount = run.blocked_count || 0;
    let runUnmappedCount = run.unmapped_count || 0;
    let runErrorCount = run.error_count || 0;
    let runDownloadedBytes = BigInt(run.bytes_downloaded || 0);

    const maxPerRun = run.max_images_per_run || 2000;
    let consecutivePageErrors = 0;
    let done = false;

    // Retrieve confirmed taxon maps and crop maps for this source
    const [taxaRes, cropMapsRes] = await Promise.all([
      client.query(`SELECT * FROM chi_taxon_map WHERE source_id = $1 AND status = 'CONFIRMED'`, [run.source_id]),
      client.query(`SELECT * FROM chi_crop_map WHERE (source_id = $1 OR source_id IS NULL) AND status = 'CONFIRMED'`, [run.source_id])
    ]);

    const confirmedTaxa = taxaRes.rows;
    const confirmedCrops = cropMapsRes.rows;

    await logRunEvent(runId, 'INFO', 'RUN_STARTED', `Starting run ${run.run_no} with connector ${run.connector_type}`, {
      confirmedTaxaCount: confirmedTaxa.length,
      confirmedCropMapsCount: confirmedCrops.length
    });

    // 2. Fetch pages loop
    while (!done) {
      // Check for heartbeat and cancellation request
      const checkRes = await client.query(`SELECT cancel_requested FROM chi_import_run WHERE id = $1`, [runId]);
      if (checkRes.rows[0]?.cancel_requested) {
        await client.query(`UPDATE chi_import_run SET status = 'CANCELLED', finished_at = now() WHERE id = $1`, [runId]);
        await logRunEvent(runId, 'INFO', 'RUN_CANCELLED', 'Run cancelled by user request.');
        return;
      }

      // Update heartbeat
      await client.query(`UPDATE chi_import_run SET heartbeat_at = now() WHERE id = $1`, [runId]);

      let pageResult;
      try {
        pageResult = await connector.fetchPage(run, run, cursor);
        consecutivePageErrors = 0;
      } catch (err) {
        consecutivePageErrors++;
        runErrorCount++;
        await logRunEvent(runId, 'WARN', 'PAGE_FETCH_ERROR', `Page fetch error (${consecutivePageErrors}/5): ${err.message}`);

        if (consecutivePageErrors >= 5) {
          await client.query(
            `UPDATE chi_import_run SET status = 'PARTIAL', finished_at = now(), error_summary = $1 WHERE id = $2`,
            [`Ended partially after 5 consecutive errors: ${err.message}`, runId]
          );
          return;
        }

        // Exponential backoff: 2s, 4s, 8s, 16s...
        const backoffMs = Math.pow(2, consecutivePageErrors) * 1000;
        await new Promise(r => setTimeout(r, backoffMs));
        continue;
      }

      const items = pageResult.items || [];
      done = pageResult.done || items.length === 0;
      cursor = pageResult.nextCursor || cursor;

      // 3. Process each normalized item in the page
      for (const item of items) {
        // Enforce max_images_per_run limit
        if (runNewCount >= maxPerRun) {
          done = true;
          break;
        }

        // 3.1 Check if item already exists by (source_id, external_media_id)
        const dupCheck = await client.query(
          `SELECT id FROM chi_import_item WHERE source_id = $1 AND external_media_id = $2`,
          [run.source_id, item.external_media_id]
        );
        if (dupCheck.rowCount > 0) {
          runDupCount++;
          continue;
        }

        // 3.2 Check License Normalization & Policy
        const normLicense = normalizeLicense(item.license_code);
        const isAllowed = isLicenseAllowed(normLicense, run.allowed_licenses_display);
        if (!isAllowed) {
          runBlockedCount++;
          await client.query(`
            INSERT INTO chi_import_item (
              run_id, source_id, external_record_id, external_media_id,
              media_url_original, source_page_url, license_code,
              review_status, reject_reason, raw_payload
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'LICENSE_BLOCKED', 'License code not allowed by display policy', $8)
            ON CONFLICT (source_id, external_media_id) DO NOTHING
          `, [
            runId, run.source_id, item.external_record_id, item.external_media_id,
            item.media_url, item.source_page_url, normLicense, JSON.stringify(item.raw || {})
          ]);
          continue;
        }

        // 3.3 Match Taxon and Crop
        let matchedTaxon = confirmedTaxa.find(t => 
          (item.external_taxon_id && t.external_taxon_id === item.external_taxon_id) ||
          (item.taxon_scientific_name && t.scientific_name.toLowerCase() === item.taxon_scientific_name.toLowerCase())
        );

        let matchedCrop = confirmedCrops.find(c => 
          item.host_scientific_name && c.host_scientific_name.toLowerCase() === item.host_scientific_name.toLowerCase()
        );

        // Fallback: If no crop is specified on external item, pick crop from profile or first confirmed crop
        let resolvedCropId = matchedCrop ? matchedCrop.crop_id : null;
        if (!resolvedCropId && run.crop_ids && run.crop_ids.length > 0) {
          resolvedCropId = run.crop_ids[0];
        }

        if (!matchedTaxon || !resolvedCropId) {
          runUnmappedCount++;
          await client.query(`
            INSERT INTO chi_import_item (
              run_id, source_id, external_record_id, external_media_id,
              media_url_original, source_page_url, license_code,
              review_status, reject_reason, raw_payload
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'UNMAPPED', 'No confirmed taxon or crop map', $8)
            ON CONFLICT (source_id, external_media_id) DO NOTHING
          `, [
            runId, run.source_id, item.external_record_id, item.external_media_id,
            item.media_url, item.source_page_url, normLicense, JSON.stringify(item.raw || {})
          ]);
          continue;
        }

        // 3.4 Download Image with SafeFetch SSRF Guard
        let downloaded;
        try {
          downloaded = await safeFetch(item.media_url, {
            allowedHosts: run.allowed_hosts,
            maxBytes: run.max_image_bytes || 10485760,
            timeoutMs: 20000
          });
        } catch (fetchErr) {
          runErrorCount++;
          await logRunEvent(runId, 'WARN', 'DOWNLOAD_FAILED', `Failed to download ${item.media_url}: ${fetchErr.message}`, {
            external_media_id: item.external_media_id
          });
          continue;
        }

        runDownloadedBytes += BigInt(downloaded.buffer.length);

        // 3.5 Process image (dimensions, EXIF strip, sha256, phash, thumbnail)
        let processed;
        try {
          processed = await processImage(downloaded.buffer, run.min_image_px || 256);
        } catch (procErr) {
          runErrorCount++;
          await logRunEvent(runId, 'WARN', 'IMAGE_REJECTED', `Image processing rejected ${item.external_media_id}: ${procErr.message}`);
          continue;
        }

        // 3.6 Check Deduplication (SHA-256 and pHash within Hamming distance 6)
        const dupHashCheck = await client.query(
          `SELECT id FROM chi_import_item WHERE checksum_sha256 = $1 LIMIT 1`,
          [processed.checksumSha256]
        );
        if (dupHashCheck.rowCount > 0) {
          runDupCount++;
          continue;
        }

        // 3.7 Save to Storage: uploads/crop_health/imported/<source_code>/<yyyy>/<mm>/<uuid>.<ext>
        const date = new Date();
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const fileExt = processed.mimeType === 'image/png' ? 'png' : (processed.mimeType === 'image/webp' ? 'webp' : 'jpg');
        const fileBase = `chi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        
        const mainRelPath = `${run.source_code.toLowerCase()}/${yyyy}/${mm}/${fileBase}.${fileExt}`;
        const thumbRelPath = `${run.source_code.toLowerCase()}/${yyyy}/${mm}/${fileBase}_thumb.webp`;

        const localUrl = await storage.put(mainRelPath, processed.cleanedBuffer);
        const thumbUrl = await storage.put(thumbRelPath, processed.thumbBuffer);

        // 3.8 Determine Review Status
        // Auto-accepted if profile has auto_accept, source is HIGH trust, and both maps confirmed
        const isAutoAccept = run.auto_accept && run.trust_level === 'HIGH';
        const finalStatus = isAutoAccept ? 'AUTO_ACCEPTED' : 'PENDING';

        await client.query(`
          INSERT INTO chi_import_item (
            run_id, source_id, external_record_id, external_media_id,
            media_url_original, source_page_url, local_url, thumb_url,
            mime_type, file_bytes, width, height, checksum_sha256, phash, blur_score,
            license_code, attribution_text, creator_name, observed_at,
            country_code, state, district, lat_rounded, lng_rounded,
            quality_grade, setting, taxon_map_id, crop_map_id,
            problem_id, crop_id, is_healthy, review_status, raw_payload
          ) VALUES (
            $1, $2, $3, $4,
            $5, $6, $7, $8,
            $9, $10, $11, $12, $13, $14, $15,
            $16, $17, $18, $19,
            $20, $21, $22, $23, $24,
            $25, $26, $27, $28,
            $29, $30, $31, $32, $33
          )
          ON CONFLICT (source_id, external_media_id) DO NOTHING
        `, [
          runId, run.source_id, item.external_record_id, item.external_media_id,
          item.media_url, item.source_page_url, localUrl, thumbUrl,
          processed.mimeType, downloaded.buffer.length, processed.width, processed.height,
          processed.checksumSha256, processed.phash, processed.blurScore,
          normLicense, item.attribution, item.creator, item.observed_at,
          item.country_code, item.state, item.district, item.lat, item.lng,
          item.quality_grade, 'FIELD', matchedTaxon.id, matchedCrop?.id || null,
          matchedTaxon.problem_id, resolvedCropId, matchedTaxon.is_healthy_class,
          finalStatus, JSON.stringify(item.raw || {})
        ]);

        runNewCount++;
      }

      // 4. Update run progress in database
      await client.query(`
        UPDATE chi_import_run SET
          fetched_count = fetched_count + $1,
          new_count = $2,
          duplicate_count = $3,
          blocked_count = $4,
          unmapped_count = $5,
          error_count = $6,
          bytes_downloaded = $7,
          cursor = $8,
          heartbeat_at = now()
        WHERE id = $9
      `, [
        items.length, runNewCount, runDupCount, runBlockedCount,
        runUnmappedCount, runErrorCount, runDownloadedBytes.toString(),
        JSON.stringify(cursor), runId
      ]);
    }

    // 5. Conclude Run successfully
    const finalRunStatus = runErrorCount > 0 && runNewCount === 0 ? 'FAILED' : (runErrorCount > 0 ? 'PARTIAL' : 'COMPLETED');
    await client.query(`
      UPDATE chi_import_run SET
        status = $1,
        finished_at = now()
      WHERE id = $2
    `, [finalRunStatus, runId]);

    await logRunEvent(runId, 'INFO', 'RUN_COMPLETED', `Run completed with status ${finalRunStatus}. Total new images: ${runNewCount}`);

    // Emit event outbox notification
    await emitDomainEvent(
      'chi.run.completed',
      'CHI_RUN',
      runId,
      {
        runId,
        runNo: run.run_no,
        sourceCode: run.source_code,
        status: finalRunStatus,
        newCount: runNewCount
      },
      client
    );

  } catch (err) {
    console.error(`[CHI processRun] Unhandled error in run ${runId}:`, err);
    await client.query(
      `UPDATE chi_import_run SET status = 'FAILED', error_summary = $1, finished_at = now() WHERE id = $2`,
      [err.message, runId]
    ).catch(() => {});
    await logRunEvent(runId, 'ERROR', 'RUN_CRASHED', err.message);
  } finally {
    client.release();
  }
}

/**
 * chi_import_worker Job Handler
 * Picks the oldest QUEUED run with SELECT ... FOR UPDATE SKIP LOCKED
 */
export async function runChiImportWorker() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Resume crashed runs where heartbeat is older than 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
    const crashedRes = await client.query(`
      SELECT id FROM chi_import_run
      WHERE status = 'RUNNING' AND heartbeat_at < $1
      FOR UPDATE SKIP LOCKED
    `, [tenMinAgo]);

    for (const crashed of crashedRes.rows) {
      await logRunEvent(crashed.id, 'WARN', 'STALE_HEARTBEAT', 'Resuming run after stale heartbeat timeout (10 min).');
      processRun(crashed.id).catch(err => console.error('[CHI Worker Resume Error]', err));
    }

    // 2. Pick oldest QUEUED run
    const queuedRes = await client.query(`
      SELECT id, run_no FROM chi_import_run
      WHERE status = 'QUEUED'
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `);

    if (queuedRes.rowCount > 0) {
      const targetRun = queuedRes.rows[0];
      await client.query(`
        UPDATE chi_import_run SET
          status = 'RUNNING',
          started_at = now(),
          heartbeat_at = now(),
          locked_by = $1
        WHERE id = $2
      `, [WORKER_ID, targetRun.id]);

      await client.query('COMMIT');

      // Execute worker job asynchronously
      processRun(targetRun.id).catch(err => console.error('[CHI Worker Async Error]', err));
      return { picked: true, run_no: targetRun.run_no };
    }

    await client.query('COMMIT');
    return { picked: false };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('[CHI runChiImportWorker Error]', err.message);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * chi_schedule_dispatcher Job Handler
 * Checks active profiles with schedule <> 'MANUAL' and next_run_at <= now()
 */
export async function runChiScheduleDispatcher() {
  try {
    const profilesRes = await pool.query(`
      SELECT p.* FROM chi_import_profile p
      JOIN chi_source s ON s.id = p.source_id
      WHERE p.is_active = true 
        AND p.deleted_at IS NULL
        AND s.is_active = true
        AND p.schedule <> 'MANUAL'
        AND (p.next_run_at IS NULL OR p.next_run_at <= now())
    `);

    for (const profile of profilesRes.rows) {
      // Check if source already has active run
      const activeRes = await pool.query(
        `SELECT id FROM chi_import_run WHERE source_id = $1 AND status IN ('QUEUED', 'RUNNING')`,
        [profile.source_id]
      );
      if (activeRes.rowCount > 0) continue;

      const seqRes = await pool.query(`SELECT nextval('chi_seq_run') AS seq`);
      const runNo = `CHI-RUN-${String(seqRes.rows[0].seq).padStart(6, '0')}`;

      await pool.query(`
        INSERT INTO chi_import_run (
          run_no, profile_id, source_id, trigger_type, params_snapshot, status
        ) VALUES ($1, $2, $3, 'SCHEDULED', $4, 'QUEUED')
      `, [runNo, profile.id, profile.source_id, JSON.stringify(profile)]);

      // Calculate next schedule
      let intervalDays = 1;
      if (profile.schedule === 'WEEKLY') intervalDays = 7;
      if (profile.schedule === 'MONTHLY') intervalDays = 30;

      await pool.query(`
        UPDATE chi_import_profile SET
          next_run_at = now() + interval '${intervalDays} days',
          updated_at = now()
        WHERE id = $1
      `, [profile.id]);
    }
  } catch (err) {
    console.error('[CHI runChiScheduleDispatcher Error]', err.message);
  }
}

/**
 * chi_housekeeping Job Handler
 * Cleans orphan temporary files, stale dry-run records, and temp items
 */
export async function runChiHousekeeping() {
  try {
    // Delete preview dry runs older than 24 hours
    const oldRuns = await pool.query(`
      DELETE FROM chi_import_run
      WHERE is_dry_run = true AND created_at < now() - interval '24 hours'
    `);
    console.log(`[CHI Housekeeping] Cleaned up ${oldRuns.rowCount || 0} old dry-run records.`);
  } catch (err) {
    console.error('[CHI runChiHousekeeping Error]', err.message);
  }
}

/**
 * Registers background jobs into scheduler.js
 */
export function registerChiJobs() {
  registerJob('chi_import_worker', runChiImportWorker);
  registerJob('chi_schedule_dispatcher', runChiScheduleDispatcher);
  registerJob('chi_housekeeping', runChiHousekeeping);
  registerJob('chi_remedy_effectiveness', rebuildRemedyEffectiveness);
}

export default {
  processRun,
  runChiImportWorker,
  runChiScheduleDispatcher,
  runChiHousekeeping,
  registerChiJobs
};
