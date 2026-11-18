import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
  const envContent = fs.readFileSync(path.resolve(__dirname, '../backend/.env'), 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
} catch (e) {
  console.warn('Could not read backend/.env:', e.message);
}

import pool from '../backend/config/db.js';
import { processRun } from '../backend/services/chi/importWorker.js';

async function testImport() {
  console.log('=== Testing iNaturalist Import on One Crop & One Problem (Max 10 Images) ===\n');

  // 1. Get admin user
  const usersRes = await pool.query('SELECT id, role, email FROM vivas_users ORDER BY created_at ASC');
  const adminUser = usersRes.rows.find(u => /admin/i.test(u.role)) || usersRes.rows[0];

  // 2. Ensure iNaturalist source is active with terms accepted
  const srcRes = await pool.query("SELECT * FROM chi_source WHERE code = 'INATURALIST'");
  if (srcRes.rowCount === 0) throw new Error('INATURALIST source not found');
  const source = srcRes.rows[0];

  await pool.query(`
    UPDATE chi_source SET
      is_active = true,
      terms_accepted_at = now(),
      terms_accepted_by = $1,
      last_test_ok = true,
      last_test_at = now(),
      allowed_hosts = ARRAY['api.inaturalist.org', 'inaturalist-open-data.s3.amazonaws.com', 'static.inaturalist.org']
    WHERE id = $2
  `, [adminUser.id, source.id]);

  // 3. Select one crop and one problem
  const crop = (await pool.query('SELECT id, name, scientific_name FROM vivas_crops WHERE scientific_name IS NOT NULL LIMIT 1')).rows[0];
  const problem = (await pool.query('SELECT id, name, problem_type FROM ch_problem LIMIT 1')).rows[0];
  console.log(`Target Crop: ${crop.name} (${crop.scientific_name})`);
  console.log(`Target Problem: ${problem.name} (${problem.problem_type})`);

  // 4. Ensure CONFIRMED crop map exists
  await pool.query(`
    INSERT INTO chi_crop_map (source_id, host_scientific_name, crop_id, match_method, status, confirmed_by, confirmed_at)
    VALUES ($1, $2, $3, 'EXACT', 'CONFIRMED', $4, now())
    ON CONFLICT (COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(host_scientific_name))
    DO UPDATE SET crop_id = EXCLUDED.crop_id, status = 'CONFIRMED'
  `, [source.id, crop.scientific_name, crop.id, adminUser.id]);

  // 5. Ensure CONFIRMED taxon map exists for common pest (Helicoverpa armigera)
  // iNaturalist Taxon ID for Helicoverpa armigera is 83806
  await pool.query(`
    INSERT INTO chi_taxon_map (
      source_id, external_taxon_id, scientific_name, problem_type,
      problem_id, match_method, status, confirmed_by, confirmed_at
    ) VALUES (
      $1, '83806', 'Helicoverpa armigera', $2,
      $3, 'EXACT', 'CONFIRMED', $4, now()
    ) ON CONFLICT (source_id, external_taxon_id)
    DO UPDATE SET problem_id = EXCLUDED.problem_id, status = 'CONFIRMED'
  `, [source.id, problem.problem_type, problem.id, adminUser.id]);

  // 6. Create Profile with max_images_per_run = 10, max_images_per_problem = 10
  const profileName = `iNat_Test_Profile_${Date.now()}`;
  const profRes = await pool.query(`
    INSERT INTO chi_import_profile (
      name, source_id, crop_ids, problem_ids, quality_filter,
      max_images_per_problem, max_images_per_run, schedule, created_by
    ) VALUES ($1, $2, $3, $4, 'RESEARCH', 10, 10, 'MANUAL', $5)
    RETURNING id, name
  `, [profileName, source.id, [crop.id], [problem.id], adminUser.id]);

  const profile = profRes.rows[0];

  // 7. Create Run
  const seqRes = await pool.query("SELECT nextval('chi_seq_run') AS seq");
  const runNo = `CHI-RUN-${String(seqRes.rows[0].seq).padStart(6, '0')}`;

  const runRes = await pool.query(`
    INSERT INTO chi_import_run (
      run_no, profile_id, source_id, trigger_type, params_snapshot,
      cursor, status, triggered_by
    ) VALUES ($1, $2, $3, 'MANUAL', $4, '{"external_taxon_id": "83806"}', 'QUEUED', $5)
    RETURNING id, run_no
  `, [runNo, profile.id, source.id, JSON.stringify(profile), adminUser.id]);

  const runId = runRes.rows[0].id;
  console.log(`Run Created: ${runNo} (id: ${runId})`);

  // 8. Execute Run via Worker
  console.log('Executing run via processRun()...');
  await processRun(runId);

  // 9. Inspect Run and Item results
  const finishedRun = (await pool.query('SELECT * FROM chi_import_run WHERE id = $1', [runId])).rows[0];
  console.log('\n=== Run Execution Result ===');
  console.log(`Status: ${finishedRun.status}`);
  console.log(`Fetched: ${finishedRun.fetched_count}, New: ${finishedRun.new_count}, Duplicate: ${finishedRun.duplicate_count}, Unmapped: ${finishedRun.unmapped_count}, Blocked: ${finishedRun.blocked_count}, Errors: ${finishedRun.error_count}`);
  console.log(`Bytes Downloaded: ${finishedRun.bytes_downloaded}`);

  // 10. Inspect Run Logs
  const logs = await pool.query('SELECT level, code, message, created_at FROM chi_import_log WHERE run_id = $1 ORDER BY id ASC', [runId]);
  console.log('\n=== chi_import_log Entries ===');
  logs.rows.forEach(l => {
    console.log(`[${l.created_at.toISOString()}] [${l.level}] [${l.code}] ${l.message}`);
  });

  // 11. Inspect Staged Items
  const items = await pool.query(`
    SELECT id, external_media_id, mime_type, file_bytes, width, height,
           checksum_sha256, phash, license_code, review_status, local_url, thumb_url
    FROM chi_import_item WHERE run_id = $1 LIMIT 5
  `, [runId]);
  console.log('\n=== Staged chi_import_item Sample (first 5) ===');
  console.log(items.rows);

  await pool.end();
  process.exit(0);
}

testImport().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
