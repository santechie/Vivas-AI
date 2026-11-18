// Phase 2 migration runner & verification script
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../backend/config/db.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migDir = path.join(root, 'database', 'migrations');

async function run() {
  console.log('🚀 Phase 2 Database Hardening & Migration Runner...\n');

  // Ensure migration table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW(),
      batch INTEGER NOT NULL DEFAULT 1
    );
  `);

  const appliedRows = await pool.query('SELECT version FROM schema_migrations');
  const applied = new Set(appliedRows.rows.map((r) => r.version));

  const files = fs.readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const version = file.split('_')[0];
    if (applied.has(version)) {
      console.log(`[SKIPPED] ${file} already applied.`);
      continue;
    }

    console.log(`[MIGRATING] Applying ${file}...`);
    const sql = fs.readFileSync(path.join(migDir, file), 'utf8');
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query(
        'INSERT INTO schema_migrations (version, name, batch) VALUES ($1, $2, $3)',
        [version, file, 1]
      );
      await pool.query('COMMIT');
      console.log(`[SUCCESS] ${file} applied successfully.`);
    } catch (err) {
      await pool.query('ROLLBACK');
      console.error(`[ERROR] Failed to apply ${file}:`, err.message);
      process.exit(1);
    }
  }

  // --- Integrity Verification Checks ---
  console.log('\n--- Running Phase 2 Integrity Invariant Checks ---');
  const checks = [];

  // Check 1: vivas_farm_map_items has parent_id and farm_id
  const c1 = await pool.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'vivas_farm_map_items' AND column_name IN ('parent_id', 'farm_id')
  `);
  checks.push({
    test: 'vivas_farm_map_items schema drift resolved (parent_id, farm_id)',
    pass: c1.rows.length === 2
  });

  // Check 2: ch_problem has default_severity & is_active
  const c2 = await pool.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'ch_problem' AND column_name IN ('default_severity', 'is_active')
  `);
  checks.push({
    test: 'ch_problem lookup columns present (default_severity, is_active)',
    pass: c2.rows.length === 2
  });

  // Check 3: vivas_orders has sales_channel & crop_name
  const c3 = await pool.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_name = 'vivas_orders' AND column_name IN ('sales_channel', 'crop_name')
  `);
  checks.push({
    test: 'vivas_orders reporting columns present (sales_channel, crop_name)',
    pass: c3.rows.length === 2
  });

  // Check 4: Missing analytics tables exist
  const c4 = await pool.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_name IN ('vivas_harvest_logs', 'vivas_time_logs', 'vivas_materials_inputs')
  `);
  checks.push({
    test: 'Missing analytics tables created (harvest_logs, time_logs, materials_inputs)',
    pass: c4.rows.length === 3
  });

  // Check 5: Tables with NO primary keys
  const c5 = await pool.query(`
    SELECT table_name FROM information_schema.tables t
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints tc
        WHERE tc.table_name = t.table_name AND tc.constraint_type = 'PRIMARY KEY'
      )
  `);
  checks.push({
    test: 'All tables have Primary Keys (zero tables without PK)',
    pass: c5.rows.length === 0
  });

  // Check 6: Indexes created
  const c6 = await pool.query(`
    SELECT indexname FROM pg_indexes 
    WHERE indexname IN (
      'idx_vivas_orders_sales_channel', 'idx_vivas_farm_map_parent',
      'idx_vivas_harvest_logs_crop', 'idx_vivas_time_logs_worker'
    )
  `);
  checks.push({
    test: 'Critical performance & foreign key indexes present',
    pass: c6.rows.length >= 4
  });

  let allPassed = true;
  checks.forEach((c) => {
    console.log(`${c.pass ? 'PASS' : 'FAIL'}  ${c.test}`);
    if (!c.pass) allPassed = false;
  });

  console.log(`\nPhase 2 Verification Result: ${checks.filter((c) => c.pass).length} / ${checks.length} passed.`);
  await pool.end();
  process.exit(allPassed ? 0 : 1);
}

run().catch((err) => {
  console.error('Fatal Phase 2 Runner Error:', err);
  process.exit(1);
});
