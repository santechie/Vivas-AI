-- ============================================================================
-- Migration: 004_crop_health_image_sources.sql
-- Module: Crop Health Image Sources (CHI)
-- Description: External image sources, taxon & crop mappings, staging, review,
--              ML dataset snapshots, model registry, and remedy effectiveness.
-- Safe to run multiple times (idempotent; PostgreSQL 14+).
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- Custom ENUM Types
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='chi_connector_type') THEN
    CREATE TYPE chi_connector_type AS ENUM (
      'INATURALIST', 'GBIF', 'DATASET_ARCHIVE', 'WIKIMEDIA', 'EPPO_META', 'CUSTOM_REST', 'CSV_ZIP'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='chi_license') THEN
    CREATE TYPE chi_license AS ENUM (
      'CC0', 'CC-BY', 'CC-BY-SA', 'CC-BY-NC', 'CC-BY-NC-SA', 'CC-BY-ND', 'CC-BY-NC-ND',
      'PARTNER_AGREEMENT', 'ALL_RIGHTS_RESERVED', 'UNKNOWN'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='chi_map_status') THEN
    CREATE TYPE chi_map_status AS ENUM ('PROPOSED', 'CONFIRMED', 'REJECTED');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='chi_run_status') THEN
    CREATE TYPE chi_run_status AS ENUM (
      'QUEUED', 'RUNNING', 'PAUSED', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='chi_review_status') THEN
    CREATE TYPE chi_review_status AS ENUM (
      'PENDING', 'AUTO_ACCEPTED', 'APPROVED', 'PUBLISHED', 'REJECTED',
      'DUPLICATE', 'LICENSE_BLOCKED', 'UNMAPPED', 'FAILED', 'TAKEN_DOWN'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='chi_image_setting') THEN
    CREATE TYPE chi_image_setting AS ENUM ('FIELD', 'LAB', 'HERBARIUM', 'UNKNOWN');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='chi_ml_split') THEN
    CREATE TYPE chi_ml_split AS ENUM ('TRAIN', 'VALIDATE', 'TEST');
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1. Sources (chi_source)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chi_source (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                       text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9_]{3,40}$'),
  name                       text NOT NULL,
  connector_type             chi_connector_type NOT NULL,
  base_url                   text CHECK (base_url IS NULL OR base_url ~ '^https://'),
  allowed_hosts              text[] NOT NULL DEFAULT '{}',
  auth_type                  text NOT NULL DEFAULT 'NONE' CHECK (auth_type IN ('NONE','API_KEY','BEARER','OAUTH2')),
  credential_env_key         text,
  allowed_licenses_display   chi_license[] NOT NULL DEFAULT '{CC0,CC-BY,CC-BY-SA,CC-BY-NC,CC-BY-NC-SA,PARTNER_AGREEMENT}',
  allowed_licenses_training  chi_license[] NOT NULL DEFAULT '{CC0,CC-BY,CC-BY-SA,PARTNER_AGREEMENT}',
  nc_training_approved_by    uuid REFERENCES vivas_users(id),
  nc_training_approved_at    timestamptz,
  terms_url                  text,
  terms_accepted_by          uuid REFERENCES vivas_users(id),
  terms_accepted_at          timestamptz,
  images_allowed             boolean NOT NULL DEFAULT true,
  trust_level                text NOT NULL DEFAULT 'MEDIUM' CHECK (trust_level IN ('LOW','MEDIUM','HIGH')),
  default_setting            chi_image_setting NOT NULL DEFAULT 'FIELD',
  usage_mode                 text NOT NULL DEFAULT 'DISPLAY_AND_TRAINING' CHECK (usage_mode IN ('DISPLAY_AND_TRAINING','TRAINING_ONLY')),
  download_size              text NOT NULL DEFAULT 'LARGE' CHECK (download_size IN ('MEDIUM','LARGE','ORIGINAL')),
  download_size_reason       text,
  max_requests_per_day       int NOT NULL DEFAULT 9000 CHECK (max_requests_per_day BETWEEN 100 AND 100000),
  max_bytes_per_hour         bigint NOT NULL DEFAULT 4294967296,   -- 4 GB
  max_bytes_per_day          bigint NOT NULL DEFAULT 21474836480,  -- 20 GB
  images_per_min             int NOT NULL DEFAULT 30 CHECK (images_per_min BETWEEN 1 AND 120),
  rate_limit_per_min         int NOT NULL DEFAULT 60 CHECK (rate_limit_per_min BETWEEN 1 AND 600),
  max_image_bytes            int NOT NULL DEFAULT 10485760 CHECK (max_image_bytes BETWEEN 51200 AND 52428800),
  min_image_px               int NOT NULL DEFAULT 256 CHECK (min_image_px BETWEEN 64 AND 4096),
  config                     jsonb NOT NULL DEFAULT '{}',
  is_active                  boolean NOT NULL DEFAULT false,
  last_test_at               timestamptz,
  last_test_ok               boolean,
  last_success_at            timestamptz,
  created_by                 uuid NOT NULL REFERENCES vivas_users(id),
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  deleted_at                 timestamptz,
  CHECK (auth_type = 'NONE' OR credential_env_key IS NOT NULL),
  CHECK (connector_type <> 'EPPO_META' OR images_allowed = false),
  CHECK (NOT is_active OR terms_accepted_at IS NOT NULL)
);

-- ----------------------------------------------------------------------------
-- 2. External Taxon -> ch_problem (chi_taxon_map)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chi_taxon_map (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id          uuid NOT NULL REFERENCES chi_source(id) ON DELETE CASCADE,
  external_taxon_id  text NOT NULL,
  scientific_name    text NOT NULL,
  rank               text,
  synonyms           text[] NOT NULL DEFAULT '{}',
  common_names       jsonb NOT NULL DEFAULT '{}',
  problem_type       ch_problem_type,
  is_healthy_class   boolean NOT NULL DEFAULT false,
  problem_id         uuid REFERENCES ch_problem(id),
  match_method       text CHECK (match_method IN ('EXACT','SYNONYM','FUZZY','MANUAL')),
  match_score        numeric(4,3) CHECK (match_score BETWEEN 0 AND 1),
  status             chi_map_status NOT NULL DEFAULT 'PROPOSED',
  confirmed_by       uuid REFERENCES vivas_users(id),
  confirmed_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_taxon_id),
  CHECK (status <> 'CONFIRMED' OR is_healthy_class OR problem_id IS NOT NULL),
  CHECK (NOT is_healthy_class OR problem_id IS NULL)
);

CREATE INDEX IF NOT EXISTS ix_chi_taxon_problem ON chi_taxon_map(problem_id);
CREATE INDEX IF NOT EXISTS ix_chi_taxon_name ON chi_taxon_map(lower(scientific_name));

-- ----------------------------------------------------------------------------
-- 3. External Host Plant -> vivas_crops (chi_crop_map)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chi_crop_map (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id            uuid REFERENCES chi_source(id) ON DELETE CASCADE,
  external_host_id     text,
  host_scientific_name text NOT NULL,
  crop_id              uuid REFERENCES vivas_crops(id),
  match_method         text CHECK (match_method IN ('EXACT','SYNONYM','FUZZY','MANUAL')),
  status               chi_map_status NOT NULL DEFAULT 'PROPOSED',
  confirmed_by         uuid REFERENCES vivas_users(id),
  confirmed_at         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  CHECK (status <> 'CONFIRMED' OR crop_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_chi_crop_map ON chi_crop_map (
  COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid),
  lower(host_scientific_name)
);

-- ----------------------------------------------------------------------------
-- 4. Import Profiles (chi_import_profile)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chi_import_profile (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   text NOT NULL,
  source_id              uuid NOT NULL REFERENCES chi_source(id),
  crop_ids               uuid[] NOT NULL DEFAULT '{}',
  crop_category_ids      uuid[] NOT NULL DEFAULT '{}',
  problem_types          ch_problem_type[] NOT NULL DEFAULT '{PEST,DISEASE,DEFICIENCY}',
  problem_ids            uuid[] NOT NULL DEFAULT '{}',
  include_healthy        boolean NOT NULL DEFAULT false,
  country_codes          text[] NOT NULL DEFAULT '{IN}',
  states                 text[] NOT NULL DEFAULT '{}',
  observed_from          date,
  observed_to            date,
  quality_filter         text NOT NULL DEFAULT 'RESEARCH' CHECK (quality_filter IN ('RESEARCH','NEEDS_ID','ANY')),
  max_images_per_problem int  NOT NULL DEFAULT 50 CHECK (max_images_per_problem BETWEEN 1 AND 2000),
  max_images_per_run     int  NOT NULL DEFAULT 2000 CHECK (max_images_per_run BETWEEN 1 AND 50000),
  auto_accept            boolean NOT NULL DEFAULT false,
  schedule               text NOT NULL DEFAULT 'MANUAL' CHECK (schedule IN ('MANUAL','DAILY','WEEKLY','MONTHLY')),
  next_run_at            timestamptz,
  last_run_id            uuid,
  is_active              boolean NOT NULL DEFAULT true,
  created_by             uuid NOT NULL REFERENCES vivas_users(id),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  deleted_at             timestamptz,
  UNIQUE (name),
  CHECK (observed_to IS NULL OR observed_from IS NULL OR observed_to >= observed_from),
  CHECK (schedule = 'MANUAL' OR next_run_at IS NOT NULL)
);

-- ----------------------------------------------------------------------------
-- 5. Import Runs (chi_import_run)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chi_import_run (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_no            text NOT NULL UNIQUE,
  profile_id        uuid REFERENCES chi_import_profile(id),
  source_id         uuid NOT NULL REFERENCES chi_source(id),
  trigger_type      text NOT NULL CHECK (trigger_type IN ('MANUAL','SCHEDULED','RETRY','PREVIEW','DATASET_UPLOAD')),
  is_dry_run        boolean NOT NULL DEFAULT false,
  params_snapshot   jsonb NOT NULL,
  status            chi_run_status NOT NULL DEFAULT 'QUEUED',
  cursor            jsonb NOT NULL DEFAULT '{}',
  fetched_count     int NOT NULL DEFAULT 0,
  new_count         int NOT NULL DEFAULT 0,
  duplicate_count   int NOT NULL DEFAULT 0,
  blocked_count     int NOT NULL DEFAULT 0,
  unmapped_count    int NOT NULL DEFAULT 0,
  error_count       int NOT NULL DEFAULT 0,
  estimated_total   int,
  bytes_downloaded  bigint NOT NULL DEFAULT 0,
  cancel_requested  boolean NOT NULL DEFAULT false,
  locked_by         text,
  heartbeat_at      timestamptz,
  triggered_by      uuid REFERENCES vivas_users(id),
  started_at        timestamptz,
  finished_at       timestamptz,
  error_summary     text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS chi_seq_run START 1;
CREATE INDEX IF NOT EXISTS ix_chi_run_status ON chi_import_run(status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS ux_chi_run_active_source ON chi_import_run(source_id) WHERE status IN ('QUEUED','RUNNING');

-- ----------------------------------------------------------------------------
-- 6. Staging Items (chi_import_item)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chi_import_item (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id               uuid NOT NULL REFERENCES chi_import_run(id) ON DELETE CASCADE,
  source_id            uuid NOT NULL REFERENCES chi_source(id),
  external_record_id   text NOT NULL,
  external_media_id    text NOT NULL,
  media_url_original   text NOT NULL,
  source_page_url      text,
  local_url            text,
  thumb_url            text,
  mime_type            text CHECK (mime_type IS NULL OR mime_type IN ('image/jpeg','image/png','image/webp')),
  file_bytes           int,
  width                int,
  height               int,
  checksum_sha256      text,
  phash                text,
  blur_score           numeric(8,2),
  license_code         chi_license NOT NULL DEFAULT 'UNKNOWN',
  attribution_text     text,
  creator_name         text,
  observed_at          timestamptz,
  country_code         text,
  state                text,
  district             text,
  lat_rounded          numeric(6,2),
  lng_rounded          numeric(6,2),
  quality_grade        text,
  setting              chi_image_setting NOT NULL DEFAULT 'UNKNOWN',
  taxon_map_id         uuid REFERENCES chi_taxon_map(id),
  crop_map_id          uuid REFERENCES chi_crop_map(id),
  problem_id           uuid REFERENCES ch_problem(id),
  crop_id              uuid REFERENCES vivas_crops(id),
  is_healthy           boolean NOT NULL DEFAULT false,
  plant_part_id        uuid REFERENCES ch_lookup(id),
  life_stage_id        uuid REFERENCES ch_lookup(id),
  review_status        chi_review_status NOT NULL DEFAULT 'PENDING',
  reject_reason        text,
  duplicate_of_item_id uuid REFERENCES chi_import_item(id),
  duplicate_of_media_id uuid REFERENCES ch_media(id),
  reviewed_by          uuid REFERENCES vivas_users(id),
  reviewed_at          timestamptz,
  media_id             uuid REFERENCES ch_media(id),
  raw_payload          jsonb NOT NULL DEFAULT '{}',
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_id, external_media_id),
  CHECK (review_status NOT IN ('APPROVED','PUBLISHED','AUTO_ACCEPTED') OR (crop_id IS NOT NULL AND (problem_id IS NOT NULL OR is_healthy))),
  CHECK (review_status <> 'PUBLISHED' OR media_id IS NOT NULL),
  CHECK (review_status <> 'REJECTED' OR reject_reason IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS ix_chi_item_review ON chi_import_item(review_status, created_at);
CREATE INDEX IF NOT EXISTS ix_chi_item_crop_problem ON chi_import_item(crop_id, problem_id);
CREATE INDEX IF NOT EXISTS ix_chi_item_checksum ON chi_import_item(checksum_sha256);
CREATE INDEX IF NOT EXISTS ix_chi_item_phash ON chi_import_item(phash);

-- ----------------------------------------------------------------------------
-- 7. Run Log (chi_import_log)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chi_import_log (
  id         bigserial PRIMARY KEY,
  run_id     uuid NOT NULL REFERENCES chi_import_run(id) ON DELETE CASCADE,
  level      text NOT NULL CHECK (level IN ('INFO','WARN','ERROR')),
  code       text NOT NULL,
  message    text NOT NULL,
  context    jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_chi_log_run ON chi_import_log(run_id, id);

-- ----------------------------------------------------------------------------
-- 8. Extend ch_media (additive only)
-- ----------------------------------------------------------------------------
ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS crop_id            uuid REFERENCES vivas_crops(id);
ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS source_id          uuid REFERENCES chi_source(id);
ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS import_item_id     uuid REFERENCES chi_import_item(id);
ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS external_media_id  text;
ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS source_url         text;
ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS license_code       chi_license;
ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS attribution_text   text;
ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS phash              text;
ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS plant_part_id      uuid REFERENCES ch_lookup(id);
ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS life_stage_id      uuid REFERENCES ch_lookup(id);
ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS setting            chi_image_setting;
ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS is_training_eligible boolean NOT NULL DEFAULT false;
ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS label_verified_by  uuid REFERENCES vivas_users(id);
ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS deleted_at         timestamptz;

CREATE INDEX IF NOT EXISTS ix_ch_media_crop ON ch_media(crop_id, owner_type, owner_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_ch_media_source_ext ON ch_media(source_id, external_media_id) WHERE source_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 9. ML Dataset Snapshots (chi_ml_dataset & chi_ml_dataset_item)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chi_ml_dataset (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version       text NOT NULL UNIQUE,
  scope_crop_ids uuid[] NOT NULL DEFAULT '{}',
  class_count   int NOT NULL DEFAULT 0,
  image_count   int NOT NULL DEFAULT 0,
  field_share   numeric(4,3),
  split_seed    int NOT NULL DEFAULT 42,
  manifest_url  text,
  status        text NOT NULL DEFAULT 'BUILDING' CHECK (status IN ('BUILDING','READY','FAILED','ARCHIVED')),
  created_by    uuid REFERENCES vivas_users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chi_ml_dataset_item (
  dataset_id  uuid NOT NULL REFERENCES chi_ml_dataset(id) ON DELETE CASCADE,
  media_id    uuid NOT NULL REFERENCES ch_media(id),
  class_key   text NOT NULL,
  split       chi_ml_split NOT NULL,
  group_key   text,
  PRIMARY KEY (dataset_id, media_id)
);

-- ----------------------------------------------------------------------------
-- 10. Model Registry (chi_ml_model)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chi_ml_model (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  version          text NOT NULL,
  task             text NOT NULL DEFAULT 'IMAGE_CLASSIFY' CHECK (task IN ('IMAGE_CLASSIFY','REMEDY_RANK')),
  dataset_id       uuid REFERENCES chi_ml_dataset(id),
  classes          jsonb NOT NULL DEFAULT '[]',
  metrics          jsonb NOT NULL DEFAULT '{}',
  endpoint_url     text,
  status           text NOT NULL DEFAULT 'CANDIDATE' CHECK (status IN ('CANDIDATE','SHADOW','ACTIVE','RETIRED','REJECTED')),
  promoted_by      uuid REFERENCES vivas_users(id),
  promoted_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, version)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_chi_model_active ON chi_ml_model(name, task) WHERE status = 'ACTIVE';

-- ----------------------------------------------------------------------------
-- 11. Remedy Effectiveness (chi_remedy_effectiveness)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chi_remedy_effectiveness (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  control_measure_id  uuid NOT NULL REFERENCES ch_control_measure(id) ON DELETE CASCADE,
  problem_id          uuid NOT NULL REFERENCES ch_problem(id),
  crop_id             uuid NOT NULL REFERENCES vivas_crops(id),
  state               text NOT NULL DEFAULT 'ALL',
  season              text NOT NULL DEFAULT 'ALL',
  cases_n             int NOT NULL DEFAULT 0,
  resolved_n          int NOT NULL DEFAULT 0,
  success_rate        numeric(5,4),
  success_rate_lower  numeric(5,4),
  avg_days_to_resolve numeric(6,2),
  avg_cost            numeric(12,2),
  computed_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (control_measure_id, crop_id, state, season)
);

-- ----------------------------------------------------------------------------
-- Triggers: Attach ch_touch_updated_at to CHI tables
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_chi_source_updated') THEN
    CREATE TRIGGER trg_chi_source_updated
      BEFORE UPDATE ON chi_source
      FOR EACH ROW EXECUTE FUNCTION ch_touch_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_chi_taxon_map_updated') THEN
    CREATE TRIGGER trg_chi_taxon_map_updated
      BEFORE UPDATE ON chi_taxon_map
      FOR EACH ROW EXECUTE FUNCTION ch_touch_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_chi_import_profile_updated') THEN
    CREATE TRIGGER trg_chi_import_profile_updated
      BEFORE UPDATE ON chi_import_profile
      FOR EACH ROW EXECUTE FUNCTION ch_touch_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_chi_import_item_updated') THEN
    CREATE TRIGGER trg_chi_import_item_updated
      BEFORE UPDATE ON chi_import_item
      FOR EACH ROW EXECUTE FUNCTION ch_touch_updated_at();
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 12. Lookups (reuse ch_lookup)
-- ----------------------------------------------------------------------------
INSERT INTO ch_lookup (list_code, code, label, sort_order) VALUES
  ('CHI_LIFE_STAGE', 'SEEDLING',   'Seedling',           1),
  ('CHI_LIFE_STAGE', 'VEGETATIVE', 'Vegetative',         2),
  ('CHI_LIFE_STAGE', 'FLOWERING',  'Flowering',          3),
  ('CHI_LIFE_STAGE', 'FRUITING',   'Fruiting',           4),
  ('CHI_LIFE_STAGE', 'MATURITY',   'Maturity / harvest', 5)
ON CONFLICT (list_code, code, COALESCE(farm_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 13. Jobs (reuse system_scheduled_jobs)
-- ----------------------------------------------------------------------------
INSERT INTO system_scheduled_jobs (job_name, description, interval_seconds, next_run_at) VALUES
  ('chi_import_worker',        'Processes queued CHI import runs',                  30,    NOW()),
  ('chi_schedule_dispatcher',  'Queues runs for profiles whose next_run_at is due', 300,   NOW()),
  ('chi_remedy_effectiveness', 'Recomputes remedy success rates from case outcomes', 86400, NOW()),
  ('chi_housekeeping',         'Clears orphan files, stale locks, old dry-run items', 86400, NOW())
ON CONFLICT (job_name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 14. Seed Data (SRS Section 6.3)
-- ----------------------------------------------------------------------------

-- 14.1 Seed inactive chi_source rows
DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id FROM vivas_users ORDER BY created_at ASC LIMIT 1;
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Cannot seed chi_source without at least one user in vivas_users';
  END IF;

  -- 1. iNaturalist
  INSERT INTO chi_source (
    code, name, connector_type, base_url, allowed_hosts, auth_type, credential_env_key,
    terms_url, trust_level, default_setting, usage_mode, download_size,
    images_per_min, rate_limit_per_min, max_requests_per_day, is_active, created_by
  ) VALUES (
    'INATURALIST',
    'iNaturalist Research-Grade Observations',
    'INATURALIST',
    'https://api.inaturalist.org/v1',
    ARRAY['inaturalist-open-data.s3.amazonaws.com', 'static.inaturalist.org'],
    'NONE',
    NULL,
    'https://www.inaturalist.org/pages/terms',
    'HIGH',
    'FIELD',
    'DISPLAY_AND_TRAINING',
    'LARGE',
    30, 60, 9000,
    false,
    v_admin_id
  ) ON CONFLICT (code) DO NOTHING;

  -- 2. GBIF
  INSERT INTO chi_source (
    code, name, connector_type, base_url, allowed_hosts, auth_type, credential_env_key,
    terms_url, trust_level, default_setting, usage_mode, download_size,
    images_per_min, rate_limit_per_min, max_requests_per_day, is_active, created_by
  ) VALUES (
    'GBIF',
    'Global Biodiversity Information Facility (GBIF)',
    'GBIF',
    'https://api.gbif.org/v1',
    ARRAY['api.gbif.org'],
    'NONE',
    NULL,
    'https://www.gbif.org/terms',
    'HIGH',
    'FIELD',
    'DISPLAY_AND_TRAINING',
    'LARGE',
    30, 60, 9000,
    false,
    v_admin_id
  ) ON CONFLICT (code) DO NOTHING;

  -- 3. PlantVillage
  INSERT INTO chi_source (
    code, name, connector_type, base_url, allowed_hosts, auth_type, credential_env_key,
    terms_url, trust_level, default_setting, usage_mode, download_size,
    images_per_min, rate_limit_per_min, max_requests_per_day, is_active, created_by
  ) VALUES (
    'PLANTVILLAGE',
    'PlantVillage Leaf Disease Dataset Archive',
    'DATASET_ARCHIVE',
    NULL,
    ARRAY[]::text[],
    'NONE',
    NULL,
    'https://github.com/spMohanty/PlantVillage-Dataset',
    'HIGH',
    'LAB',
    'DISPLAY_AND_TRAINING',
    'LARGE',
    60, 120, 100000,
    false,
    v_admin_id
  ) ON CONFLICT (code) DO NOTHING;

  -- 4. Wikimedia Commons
  INSERT INTO chi_source (
    code, name, connector_type, base_url, allowed_hosts, auth_type, credential_env_key,
    terms_url, trust_level, default_setting, usage_mode, download_size,
    images_per_min, rate_limit_per_min, max_requests_per_day, is_active, created_by
  ) VALUES (
    'WIKIMEDIA',
    'Wikimedia Commons Agri-Health Media',
    'WIKIMEDIA',
    'https://commons.wikimedia.org/w/api.php',
    ARRAY['upload.wikimedia.org'],
    'NONE',
    NULL,
    'https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use',
    'MEDIUM',
    'FIELD',
    'DISPLAY_AND_TRAINING',
    'LARGE',
    30, 60, 9000,
    false,
    v_admin_id
  ) ON CONFLICT (code) DO NOTHING;
END $$;

-- 14.2 Seed chi_crop_map from vivas_crops.scientific_name
DO $$
DECLARE
  v_admin_id uuid;
BEGIN
  SELECT id INTO v_admin_id FROM vivas_users ORDER BY created_at ASC LIMIT 1;

  INSERT INTO chi_crop_map (
    source_id, external_host_id, host_scientific_name, crop_id, match_method, status, confirmed_by, confirmed_at
  )
  SELECT 
    NULL,
    NULL,
    TRIM(scientific_name),
    id,
    'EXACT',
    'CONFIRMED',
    v_admin_id,
    now()
  FROM vivas_crops
  WHERE scientific_name IS NOT NULL AND TRIM(scientific_name) <> ''
  ON CONFLICT (COALESCE(source_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(host_scientific_name)) 
  DO UPDATE SET
    crop_id = EXCLUDED.crop_id,
    status = 'CONFIRMED',
    match_method = 'EXACT',
    confirmed_by = EXCLUDED.confirmed_by,
    confirmed_at = EXCLUDED.confirmed_at;
END $$;

-- ----------------------------------------------------------------------------
-- Record Migration in schema_migrations
-- ----------------------------------------------------------------------------
INSERT INTO schema_migrations (version, name) VALUES ('004', 'crop_health_image_sources')
ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name, applied_at = now();

