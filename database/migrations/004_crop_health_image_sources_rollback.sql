-- ============================================================================
-- Migration Rollback: 004_crop_health_image_sources_rollback.sql
-- Module: Crop Health Image Sources (CHI)
-- Description: Drops all CHI-specific objects and added columns in reverse order.
-- Safe to run multiple times (idempotent).
-- ============================================================================

-- 1. Remove scheduled jobs
DELETE FROM system_scheduled_jobs 
WHERE job_name IN (
  'chi_import_worker',
  'chi_schedule_dispatcher',
  'chi_remedy_effectiveness',
  'chi_housekeeping'
);

-- 2. Remove lookups
DELETE FROM ch_lookup WHERE list_code = 'CHI_LIFE_STAGE';

-- 3. Drop triggers
DROP TRIGGER IF EXISTS trg_chi_source_updated ON chi_source;
DROP TRIGGER IF EXISTS trg_chi_taxon_map_updated ON chi_taxon_map;
DROP TRIGGER IF EXISTS trg_chi_import_profile_updated ON chi_import_profile;
DROP TRIGGER IF EXISTS trg_chi_import_item_updated ON chi_import_item;

-- 4. Drop CHI tables in dependency order
DROP TABLE IF EXISTS chi_remedy_effectiveness CASCADE;
DROP TABLE IF EXISTS chi_ml_model CASCADE;
DROP TABLE IF EXISTS chi_ml_dataset_item CASCADE;
DROP TABLE IF EXISTS chi_ml_dataset CASCADE;
DROP TABLE IF EXISTS chi_import_log CASCADE;
DROP TABLE IF EXISTS chi_import_item CASCADE;
DROP TABLE IF EXISTS chi_import_run CASCADE;
DROP SEQUENCE IF EXISTS chi_seq_run;
DROP TABLE IF EXISTS chi_import_profile CASCADE;
DROP TABLE IF EXISTS chi_crop_map CASCADE;
DROP TABLE IF EXISTS chi_taxon_map CASCADE;
DROP TABLE IF EXISTS chi_source CASCADE;

-- 5. Drop added indexes and columns from ch_media
DROP INDEX IF EXISTS ix_ch_media_crop;
DROP INDEX IF EXISTS ux_ch_media_source_ext;

ALTER TABLE ch_media DROP COLUMN IF EXISTS crop_id;
ALTER TABLE ch_media DROP COLUMN IF EXISTS source_id;
ALTER TABLE ch_media DROP COLUMN IF EXISTS import_item_id;
ALTER TABLE ch_media DROP COLUMN IF EXISTS external_media_id;
ALTER TABLE ch_media DROP COLUMN IF EXISTS source_url;
ALTER TABLE ch_media DROP COLUMN IF EXISTS license_code;
ALTER TABLE ch_media DROP COLUMN IF EXISTS attribution_text;
ALTER TABLE ch_media DROP COLUMN IF EXISTS phash;
ALTER TABLE ch_media DROP COLUMN IF EXISTS plant_part_id;
ALTER TABLE ch_media DROP COLUMN IF EXISTS life_stage_id;
ALTER TABLE ch_media DROP COLUMN IF EXISTS setting;
ALTER TABLE ch_media DROP COLUMN IF EXISTS is_training_eligible;
ALTER TABLE ch_media DROP COLUMN IF EXISTS label_verified_by;
ALTER TABLE ch_media DROP COLUMN IF EXISTS deleted_at;

-- 6. Drop custom ENUM types
DROP TYPE IF EXISTS chi_ml_split CASCADE;
DROP TYPE IF EXISTS chi_image_setting CASCADE;
DROP TYPE IF EXISTS chi_review_status CASCADE;
DROP TYPE IF EXISTS chi_run_status CASCADE;
DROP TYPE IF EXISTS chi_map_status CASCADE;
DROP TYPE IF EXISTS chi_license CASCADE;
DROP TYPE IF EXISTS chi_connector_type CASCADE;

-- 7. Remove migration record
DELETE FROM schema_migrations WHERE version = '004';
