-- =====================================================================
-- VIVAS AI — AGRI INPUT PARTNER HUB (INPUT PARTNER HUB)
-- Phase 1 Database Migration: 33 pih_ Tables, Constraints, Triggers & Indexes
-- Target: PostgreSQL 14+
-- Idempotent: Safe to run multiple times (IF NOT EXISTS)
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Generic updated_at trigger function for pih_ tables
CREATE OR REPLACE FUNCTION pih_touch_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 1. PARTNERS AND STORES (4 Tables)
-- =====================================================================

-- 1.1 pih_partners
CREATE TABLE IF NOT EXISTS pih_partners (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_code    VARCHAR(50) UNIQUE NOT NULL,
  legal_name      VARCHAR(255) NOT NULL,
  brand_name      VARCHAR(255) NOT NULL,
  partner_type    VARCHAR(50) NOT NULL CHECK (partner_type IN (
                    'SEED', 'FERTILISER', 'UREA', 'NANO_FERTILISER',
                    'BIO_STIMULANT', 'MICRONUTRIENT', 'CROP_PROTECTION',
                    'ORGANIC_INPUT', 'OTHER'
                  )),
  gstin           VARCHAR(15) NOT NULL CHECK (gstin ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'),
  pan             VARCHAR(10) NOT NULL CHECK (pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
  address         TEXT NOT NULL,
  state           VARCHAR(100) NOT NULL,
  district        VARCHAR(100) NOT NULL,
  pincode         VARCHAR(6) NOT NULL CHECK (pincode ~ '^[0-9]{6}$'),
  phone           VARCHAR(10) NOT NULL CHECK (phone ~ '^[6-9][0-9]{9}$'),
  email           VARCHAR(255) NOT NULL,
  website         VARCHAR(255),
  logo_url        TEXT,
  status          VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN (
                    'draft', 'submitted', 'under_review', 'approved', 'rejected', 'suspended'
                  )),
  status_reason   TEXT,
  commission_pct  NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (commission_pct BETWEEN 0 AND 100),
  verified_by     UUID REFERENCES vivas_users(id) ON DELETE SET NULL,
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_pih_partners_status ON pih_partners(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_pih_partners_type ON pih_partners(partner_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_pih_partners_verified_by ON pih_partners(verified_by);
DROP TRIGGER IF EXISTS trg_pih_partners_upd ON pih_partners;
CREATE TRIGGER trg_pih_partners_upd BEFORE UPDATE ON pih_partners FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 1.2 pih_partner_users
CREATE TABLE IF NOT EXISTS pih_partner_users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      UUID NOT NULL REFERENCES pih_partners(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES vivas_users(id) ON DELETE CASCADE,
  partner_role    VARCHAR(30) NOT NULL DEFAULT 'partner_user' CHECK (partner_role IN (
                    'partner_admin', 'partner_user'
                  )),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ,
  UNIQUE(partner_id, user_id)
);

CREATE INDEX IF NOT EXISTS ix_pih_partner_users_partner_id ON pih_partner_users(partner_id);
CREATE INDEX IF NOT EXISTS ix_pih_partner_users_user_id ON pih_partner_users(user_id);
DROP TRIGGER IF EXISTS trg_pih_partner_users_upd ON pih_partner_users;
CREATE TRIGGER trg_pih_partner_users_upd BEFORE UPDATE ON pih_partner_users FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 1.3 pih_partner_documents
CREATE TABLE IF NOT EXISTS pih_partner_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id      UUID NOT NULL REFERENCES pih_partners(id) ON DELETE CASCADE,
  doc_type        VARCHAR(30) NOT NULL CHECK (doc_type IN (
                    'FCO', 'CIBRC', 'SEED_LICENCE', 'GST', 'ISO', 'ORGANIC', 'OTHER'
                  )),
  doc_number      VARCHAR(100) NOT NULL,
  issued_on       DATE,
  expires_on      DATE,
  file_url        TEXT NOT NULL,
  review_status   VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (review_status IN (
                    'pending', 'approved', 'rejected', 'expired'
                  )),
  reviewed_by     UUID REFERENCES vivas_users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  remarks         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_pih_partner_documents_partner_id ON pih_partner_documents(partner_id);
CREATE INDEX IF NOT EXISTS ix_pih_partner_documents_reviewed_by ON pih_partner_documents(reviewed_by);
CREATE INDEX IF NOT EXISTS ix_pih_partner_documents_type_status ON pih_partner_documents(partner_id, doc_type, review_status);
CREATE INDEX IF NOT EXISTS ix_pih_partner_documents_expires_on ON pih_partner_documents(expires_on);
DROP TRIGGER IF EXISTS trg_pih_partner_documents_upd ON pih_partner_documents;
CREATE TRIGGER trg_pih_partner_documents_upd BEFORE UPDATE ON pih_partner_documents FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 1.4 pih_stores
CREATE TABLE IF NOT EXISTS pih_stores (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id        UUID UNIQUE NOT NULL REFERENCES pih_partners(id) ON DELETE CASCADE,
  store_name        VARCHAR(255) NOT NULL,
  slug              VARCHAR(255) UNIQUE NOT NULL,
  banner_url        TEXT,
  about             TEXT,
  service_states    TEXT[] NOT NULL DEFAULT '{}',
  service_districts TEXT[] NOT NULL DEFAULT '{}',
  support_phone     VARCHAR(20),
  support_email     VARCHAR(255),
  return_policy     TEXT,
  min_order_value   NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (min_order_value >= 0),
  cod_enabled       BOOLEAN NOT NULL DEFAULT TRUE,
  credit_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  is_live           BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_pih_stores_partner_id ON pih_stores(partner_id);
CREATE INDEX IF NOT EXISTS ix_pih_stores_slug ON pih_stores(slug);
DROP TRIGGER IF EXISTS trg_pih_stores_upd ON pih_stores;
CREATE TRIGGER trg_pih_stores_upd BEFORE UPDATE ON pih_stores FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- =====================================================================
-- 2. CATALOGUE AND BULK IMPORT (8 Tables)
-- =====================================================================

-- 2.1 pih_products
CREATE TABLE IF NOT EXISTS pih_products (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id            UUID NOT NULL REFERENCES pih_partners(id) ON DELETE CASCADE,
  product_code          VARCHAR(80) UNIQUE NOT NULL,
  name                  VARCHAR(255) NOT NULL,
  brand                 VARCHAR(150) NOT NULL,
  product_type          VARCHAR(50) NOT NULL CHECK (product_type IN (
                          'SEED', 'FERTILISER', 'UREA', 'NANO_FERTILISER',
                          'BIO_STIMULANT', 'MICRONUTRIENT', 'CROP_PROTECTION',
                          'ORGANIC_INPUT', 'OTHER'
                        )),
  sub_type              VARCHAR(100),
  formulation           VARCHAR(100),
  registration_no       VARCHAR(100),
  hsn_code              VARCHAR(8) NOT NULL CHECK (hsn_code ~ '^([0-9]{4}|[0-9]{6}|[0-9]{8})$'),
  gst_pct               NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (gst_pct IN (0, 5, 12, 18, 28)),
  is_organic            BOOLEAN NOT NULL DEFAULT FALSE,
  shelf_life_months     INT CHECK (shelf_life_months IS NULL OR shelf_life_months > 0),
  storage_instructions  TEXT,
  safety_precautions    TEXT,
  phi_days              INT NOT NULL DEFAULT 0 CHECK (phi_days >= 0),
  reentry_hours         INT NOT NULL DEFAULT 0 CHECK (reentry_hours >= 0),
  description           TEXT,
  how_it_works          TEXT,
  local_names           JSONB NOT NULL DEFAULT '{}'::jsonb,
  label_pdf_url         TEXT,
  status                VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN (
                          'draft', 'submitted', 'approved', 'live', 'paused', 'delisted'
                        )),
  approved_by           UUID REFERENCES vivas_users(id) ON DELETE SET NULL,
  approved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_pih_products_partner_id ON pih_products(partner_id);
CREATE INDEX IF NOT EXISTS ix_pih_products_approved_by ON pih_products(approved_by);
CREATE INDEX IF NOT EXISTS ix_pih_products_type_status ON pih_products(product_type, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_pih_products_organic ON pih_products(is_organic) WHERE deleted_at IS NULL;
DROP TRIGGER IF EXISTS trg_pih_products_upd ON pih_products;
CREATE TRIGGER trg_pih_products_upd BEFORE UPDATE ON pih_products FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 2.2 pih_product_skus
CREATE TABLE IF NOT EXISTS pih_product_skus (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES pih_products(id) ON DELETE CASCADE,
  sku_code        VARCHAR(100) UNIQUE NOT NULL,
  pack_size       NUMERIC(10,3) NOT NULL CHECK (pack_size > 0),
  pack_unit       VARCHAR(30) NOT NULL CHECK (pack_unit IN (
                    'g', 'kg', 'ml', 'L', 'packet', 'bag', 'bottle', 'drum', 'unit'
                  )),
  mrp             NUMERIC(12,2) NOT NULL CHECK (mrp > 0),
  selling_price   NUMERIC(12,2) NOT NULL CHECK (selling_price > 0 AND mrp >= selling_price),
  stock_qty       INT NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
  region_stock    JSONB NOT NULL DEFAULT '{}'::jsonb,
  batch_no        VARCHAR(80),
  mfg_date        DATE,
  expiry_date     DATE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_pih_product_skus_product_id ON pih_product_skus(product_id);
DROP TRIGGER IF EXISTS trg_pih_product_skus_upd ON pih_product_skus;
CREATE TRIGGER trg_pih_product_skus_upd BEFORE UPDATE ON pih_product_skus FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 2.3 pih_product_composition
CREATE TABLE IF NOT EXISTS pih_product_composition (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES pih_products(id) ON DELETE CASCADE,
  component_name    VARCHAR(150) NOT NULL,
  nutrient_code     TEXT REFERENCES ch_nutrient(code) ON DELETE SET NULL,
  active_ingredient VARCHAR(150),
  value             NUMERIC(10,4) NOT NULL CHECK (value > 0),
  unit              VARCHAR(30) NOT NULL CHECK (unit IN (
                      '% w/w', '% w/v', 'g/L', 'CFU/g', 'ppm', 'IU/mg'
                    )),
  seq               INT NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_pih_product_composition_product_id ON pih_product_composition(product_id);
CREATE INDEX IF NOT EXISTS ix_pih_product_composition_nutrient_code ON pih_product_composition(nutrient_code);
DROP TRIGGER IF EXISTS trg_pih_product_composition_upd ON pih_product_composition;
CREATE TRIGGER trg_pih_product_composition_upd BEFORE UPDATE ON pih_product_composition FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 2.4 pih_product_crop_suitability
CREATE TABLE IF NOT EXISTS pih_product_crop_suitability (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          UUID NOT NULL REFERENCES pih_products(id) ON DELETE CASCADE,
  crop_id             UUID NOT NULL REFERENCES vivas_crops(id) ON DELETE CASCADE,
  variety_id          UUID REFERENCES vivas_crop_varieties(id) ON DELETE SET NULL,
  crop_stage          VARCHAR(100) NOT NULL DEFAULT 'All Stages',
  dose_value          NUMERIC(10,3) NOT NULL CHECK (dose_value > 0),
  dose_min            NUMERIC(10,3),
  dose_max            NUMERIC(10,3),
  dose_unit           VARCHAR(30) NOT NULL,
  dose_basis          VARCHAR(40) NOT NULL CHECK (dose_basis IN (
                        'per acre', 'per litre', 'per kg seed', 'per hectare', 'per plant'
                      )),
  application_method  VARCHAR(100),
  timing_text         TEXT,
  interval_days       INT CHECK (interval_days IS NULL OR interval_days >= 0),
  max_applications    INT CHECK (max_applications IS NULL OR max_applications > 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_pih_product_crop_suit_product_id ON pih_product_crop_suitability(product_id);
CREATE INDEX IF NOT EXISTS ix_pih_product_crop_suit_crop_id ON pih_product_crop_suitability(crop_id);
CREATE INDEX IF NOT EXISTS ix_pih_product_crop_suit_variety_id ON pih_product_crop_suitability(variety_id);
DROP TRIGGER IF EXISTS trg_pih_product_crop_suitability_upd ON pih_product_crop_suitability;
CREATE TRIGGER trg_pih_product_crop_suitability_upd BEFORE UPDATE ON pih_product_crop_suitability FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 2.5 pih_product_claims
CREATE TABLE IF NOT EXISTS pih_product_claims (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES pih_products(id) ON DELETE CASCADE,
  problem_id      UUID NOT NULL REFERENCES ch_problem(id) ON DELETE CASCADE,
  crop_id         UUID REFERENCES vivas_crops(id) ON DELETE SET NULL,
  claim_type      VARCHAR(40) NOT NULL CHECK (claim_type IN (
                    'cure', 'control', 'prevent', 'correct_deficiency', 'yield_boost'
                  )),
  evidence_note   TEXT,
  sme_status      VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (sme_status IN (
                    'pending', 'verified', 'rejected'
                  )),
  sme_by          UUID REFERENCES vivas_users(id) ON DELETE SET NULL,
  sme_at          TIMESTAMPTZ,
  sme_remarks     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_pih_product_claims_product_id ON pih_product_claims(product_id);
CREATE INDEX IF NOT EXISTS ix_pih_product_claims_problem_id ON pih_product_claims(problem_id);
CREATE INDEX IF NOT EXISTS ix_pih_product_claims_crop_id ON pih_product_claims(crop_id);
CREATE INDEX IF NOT EXISTS ix_pih_product_claims_sme_by ON pih_product_claims(sme_by);
CREATE INDEX IF NOT EXISTS ix_pih_product_claims_sme_status ON pih_product_claims(sme_status);
DROP TRIGGER IF EXISTS trg_pih_product_claims_upd ON pih_product_claims;
CREATE TRIGGER trg_pih_product_claims_upd BEFORE UPDATE ON pih_product_claims FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 2.6 pih_product_media
CREATE TABLE IF NOT EXISTS pih_product_media (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES pih_products(id) ON DELETE CASCADE,
  media_type  VARCHAR(30) NOT NULL CHECK (media_type IN (
                'image', 'video', 'leaflet', 'label'
              )),
  url         TEXT NOT NULL,
  caption     VARCHAR(255),
  seq         INT NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_pih_product_media_product_id ON pih_product_media(product_id);
DROP TRIGGER IF EXISTS trg_pih_product_media_upd ON pih_product_media;
CREATE TRIGGER trg_pih_product_media_upd BEFORE UPDATE ON pih_product_media FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 2.7 pih_import_batches
CREATE TABLE IF NOT EXISTS pih_import_batches (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  UUID NOT NULL REFERENCES pih_partners(id) ON DELETE CASCADE,
  file_name   VARCHAR(255) NOT NULL,
  total_rows  INT NOT NULL DEFAULT 0,
  ok_rows     INT NOT NULL DEFAULT 0,
  error_rows  INT NOT NULL DEFAULT 0,
  status      VARCHAR(30) NOT NULL DEFAULT 'uploaded' CHECK (status IN (
                'uploaded', 'validating', 'completed', 'failed'
              )),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_pih_import_batches_partner_id ON pih_import_batches(partner_id);
DROP TRIGGER IF EXISTS trg_pih_import_batches_upd ON pih_import_batches;
CREATE TRIGGER trg_pih_import_batches_upd BEFORE UPDATE ON pih_import_batches FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 2.8 pih_import_errors
CREATE TABLE IF NOT EXISTS pih_import_errors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id    UUID NOT NULL REFERENCES pih_import_batches(id) ON DELETE CASCADE,
  row_no      INT NOT NULL,
  field       VARCHAR(100),
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_pih_import_errors_batch_id ON pih_import_errors(batch_id);
DROP TRIGGER IF EXISTS trg_pih_import_errors_upd ON pih_import_errors;
CREATE TRIGGER trg_pih_import_errors_upd BEFORE UPDATE ON pih_import_errors FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- =====================================================================
-- 3. FIELD EVIDENCE AND AI (7 Tables)
-- =====================================================================

-- 3.1 pih_treatment_outcomes
CREATE TABLE IF NOT EXISTS pih_treatment_outcomes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id           UUID NOT NULL REFERENCES vivas_farms(id) ON DELETE CASCADE,
  case_treatment_id UUID UNIQUE REFERENCES ch_case_treatment(id) ON DELETE SET NULL,
  case_id           UUID REFERENCES ch_case(id) ON DELETE SET NULL,
  product_id        UUID NOT NULL REFERENCES pih_products(id) ON DELETE CASCADE,
  sku_id            UUID REFERENCES pih_product_skus(id) ON DELETE SET NULL,
  lot_id            UUID REFERENCES vivas_inputs_lots(id) ON DELETE SET NULL,
  crop_id           UUID REFERENCES vivas_crops(id) ON DELETE SET NULL,
  planting_id       UUID REFERENCES vivas_plantings(id) ON DELETE SET NULL,
  district          VARCHAR(100),
  state             VARCHAR(100),
  applied_on        DATE NOT NULL,
  dose_value        NUMERIC(10,3),
  dose_unit         VARCHAR(30),
  area_treated      NUMERIC(10,2),
  severity_before   VARCHAR(30) CHECK (severity_before IS NULL OR severity_before IN ('LOW', 'MODERATE', 'HIGH', 'SEVERE')),
  severity_after    VARCHAR(30) CHECK (severity_after IS NULL OR severity_after IN ('LOW', 'MODERATE', 'HIGH', 'SEVERE')),
  incidence_before  NUMERIC(5,2) CHECK (incidence_before IS NULL OR (incidence_before BETWEEN 0 AND 100)),
  incidence_after   NUMERIC(5,2) CHECK (incidence_after IS NULL OR (incidence_after BETWEEN 0 AND 100)),
  days_to_effect    INT CHECK (days_to_effect IS NULL OR days_to_effect >= 0),
  resolved          VARCHAR(20) CHECK (resolved IS NULL OR resolved IN ('yes', 'partly', 'no')),
  yield_actual      NUMERIC(12,2),
  yield_expected    NUMERIC(12,2),
  side_effects      TEXT,
  farmer_rating     SMALLINT CHECK (farmer_rating IS NULL OR (farmer_rating BETWEEN 1 AND 5)),
  farmer_comment    TEXT,
  photos            JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_verified       BOOLEAN NOT NULL DEFAULT FALSE,
  source            VARCHAR(30) NOT NULL DEFAULT 'farmer_form' CHECK (source IN (
                      'crop_health_sync', 'farmer_form', 'trial'
                    )),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_pih_treatment_outcomes_farm_id ON pih_treatment_outcomes(farm_id);
CREATE INDEX IF NOT EXISTS ix_pih_treatment_outcomes_product_id ON pih_treatment_outcomes(product_id);
CREATE INDEX IF NOT EXISTS ix_pih_treatment_outcomes_case_treatment_id ON pih_treatment_outcomes(case_treatment_id);
CREATE INDEX IF NOT EXISTS ix_pih_treatment_outcomes_case_id ON pih_treatment_outcomes(case_id);
CREATE INDEX IF NOT EXISTS ix_pih_treatment_outcomes_sku_id ON pih_treatment_outcomes(sku_id);
CREATE INDEX IF NOT EXISTS ix_pih_treatment_outcomes_lot_id ON pih_treatment_outcomes(lot_id);
CREATE INDEX IF NOT EXISTS ix_pih_treatment_outcomes_crop_id ON pih_treatment_outcomes(crop_id);
CREATE INDEX IF NOT EXISTS ix_pih_treatment_outcomes_planting_id ON pih_treatment_outcomes(planting_id);
CREATE INDEX IF NOT EXISTS ix_pih_treatment_outcomes_district ON pih_treatment_outcomes(state, district);
DROP TRIGGER IF EXISTS trg_pih_treatment_outcomes_upd ON pih_treatment_outcomes;
CREATE TRIGGER trg_pih_treatment_outcomes_upd BEFORE UPDATE ON pih_treatment_outcomes FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 3.2 pih_field_trials
CREATE TABLE IF NOT EXISTS pih_field_trials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    UUID NOT NULL REFERENCES pih_partners(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES pih_products(id) ON DELETE CASCADE,
  farm_id       UUID NOT NULL REFERENCES vivas_farms(id) ON DELETE CASCADE,
  crop_id       UUID NOT NULL REFERENCES vivas_crops(id) ON DELETE CASCADE,
  planting_id   UUID REFERENCES vivas_plantings(id) ON DELETE SET NULL,
  treated_area  NUMERIC(10,2) NOT NULL CHECK (treated_area > 0),
  control_area  NUMERIC(10,2) NOT NULL CHECK (control_area > 0),
  start_date    DATE NOT NULL,
  end_date      DATE,
  protocol      TEXT,
  status        VARCHAR(30) NOT NULL DEFAULT 'proposed' CHECK (status IN (
                  'proposed', 'accepted', 'sme_approved', 'running', 'completed', 'cancelled'
                )),
  sme_by        UUID REFERENCES vivas_users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_pih_field_trials_partner_id ON pih_field_trials(partner_id);
CREATE INDEX IF NOT EXISTS ix_pih_field_trials_product_id ON pih_field_trials(product_id);
CREATE INDEX IF NOT EXISTS ix_pih_field_trials_farm_id ON pih_field_trials(farm_id);
CREATE INDEX IF NOT EXISTS ix_pih_field_trials_crop_id ON pih_field_trials(crop_id);
CREATE INDEX IF NOT EXISTS ix_pih_field_trials_planting_id ON pih_field_trials(planting_id);
CREATE INDEX IF NOT EXISTS ix_pih_field_trials_sme_by ON pih_field_trials(sme_by);
DROP TRIGGER IF EXISTS trg_pih_field_trials_upd ON pih_field_trials;
CREATE TRIGGER trg_pih_field_trials_upd BEFORE UPDATE ON pih_field_trials FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 3.3 pih_trial_observations
CREATE TABLE IF NOT EXISTS pih_trial_observations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id    UUID NOT NULL REFERENCES pih_field_trials(id) ON DELETE CASCADE,
  observed_on DATE NOT NULL DEFAULT CURRENT_DATE,
  plot        VARCHAR(20) NOT NULL CHECK (plot IN ('treated', 'control')),
  metric      VARCHAR(100) NOT NULL,
  value       NUMERIC(12,3) NOT NULL,
  unit        VARCHAR(40),
  photo_url   TEXT,
  observed_by UUID REFERENCES vivas_users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_pih_trial_observations_trial_id ON pih_trial_observations(trial_id);
CREATE INDEX IF NOT EXISTS ix_pih_trial_observations_observed_by ON pih_trial_observations(observed_by);
DROP TRIGGER IF EXISTS trg_pih_trial_observations_upd ON pih_trial_observations;
CREATE TRIGGER trg_pih_trial_observations_upd BEFORE UPDATE ON pih_trial_observations FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 3.4 pih_ai_inferences
CREATE TABLE IF NOT EXISTS pih_ai_inferences (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES pih_products(id) ON DELETE CASCADE,
  crop_id           UUID REFERENCES vivas_crops(id) ON DELETE SET NULL,
  state             VARCHAR(100),
  district          VARCHAR(100),
  season            VARCHAR(50),
  inference_type    VARCHAR(40) NOT NULL CHECK (inference_type IN (
                      'efficacy', 'dose_response', 'stage_fit',
                      'adverse_signal', 'demand', 'improvement'
                    )),
  title             VARCHAR(255) NOT NULL,
  body              TEXT NOT NULL,
  metrics           JSONB NOT NULL DEFAULT '{}'::jsonb,
  sample_size       INT NOT NULL DEFAULT 0 CHECK (sample_size >= 0),
  farm_count        INT NOT NULL DEFAULT 0 CHECK (farm_count >= 0),
  confidence        NUMERIC(5,4) NOT NULL DEFAULT 0.0000 CHECK (confidence BETWEEN 0 AND 1),
  evidence_case_ids UUID[] NOT NULL DEFAULT '{}',
  model_name        VARCHAR(100) NOT NULL,
  model_version     VARCHAR(50) NOT NULL,
  ai_request_id     UUID REFERENCES ch_ai_request(id) ON DELETE SET NULL,
  status            VARCHAR(30) NOT NULL DEFAULT 'preliminary' CHECK (status IN (
                      'preliminary', 'pending_review', 'published', 'suppressed'
                    )),
  reviewed_by       UUID REFERENCES vivas_users(id) ON DELETE SET NULL,
  sme_annotation    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_pih_ai_inferences_product_id ON pih_ai_inferences(product_id);
CREATE INDEX IF NOT EXISTS ix_pih_ai_inferences_crop_id ON pih_ai_inferences(crop_id);
CREATE INDEX IF NOT EXISTS ix_pih_ai_inferences_ai_request_id ON pih_ai_inferences(ai_request_id);
CREATE INDEX IF NOT EXISTS ix_pih_ai_inferences_reviewed_by ON pih_ai_inferences(reviewed_by);
CREATE INDEX IF NOT EXISTS ix_pih_ai_inferences_region_season ON pih_ai_inferences(state, district, season);
DROP TRIGGER IF EXISTS trg_pih_ai_inferences_upd ON pih_ai_inferences;
CREATE TRIGGER trg_pih_ai_inferences_upd BEFORE UPDATE ON pih_ai_inferences FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 3.5 pih_product_ratings
CREATE TABLE IF NOT EXISTS pih_product_ratings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id              UUID NOT NULL REFERENCES pih_products(id) ON DELETE CASCADE,
  crop_id                 UUID REFERENCES vivas_crops(id) ON DELETE CASCADE,
  fps                     NUMERIC(4,2) NOT NULL DEFAULT 0.00 CHECK (fps BETWEEN 0 AND 5),
  raw_score               NUMERIC(4,2) NOT NULL DEFAULT 0.00 CHECK (raw_score BETWEEN 0 AND 5),
  verified_count          INT NOT NULL DEFAULT 0 CHECK (verified_count >= 0),
  farm_count              INT NOT NULL DEFAULT 0 CHECK (farm_count >= 0),
  efficacy_rate           NUMERIC(5,2) DEFAULT 0.00,
  avg_severity_reduction  NUMERIC(5,2) DEFAULT 0.00,
  yield_uplift_pct        NUMERIC(6,2) DEFAULT 0.00,
  avg_farmer_rating       NUMERIC(4,2) DEFAULT 0.00,
  safety_penalty          NUMERIC(4,2) NOT NULL DEFAULT 0.00 CHECK (safety_penalty BETWEEN 0 AND 1),
  badge                   VARCHAR(30) NOT NULL DEFAULT 'needs_data' CHECK (badge IN (
                            'field_proven', 'rising', 'needs_data', 'standard'
                          )),
  computed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_pih_product_ratings_product_id ON pih_product_ratings(product_id);
CREATE INDEX IF NOT EXISTS ix_pih_product_ratings_crop_id ON pih_product_ratings(crop_id);
CREATE INDEX IF NOT EXISTS ix_pih_product_ratings_latest ON pih_product_ratings(product_id, crop_id, computed_at DESC);
DROP TRIGGER IF EXISTS trg_pih_product_ratings_upd ON pih_product_ratings;
CREATE TRIGGER trg_pih_product_ratings_upd BEFORE UPDATE ON pih_product_ratings FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 3.6 pih_recommendations
CREATE TABLE IF NOT EXISTS pih_recommendations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id           UUID NOT NULL REFERENCES vivas_farms(id) ON DELETE CASCADE,
  case_id           UUID REFERENCES ch_case(id) ON DELETE CASCADE,
  alert_id          UUID REFERENCES ch_alert(id) ON DELETE CASCADE,
  soil_test_id      UUID REFERENCES vivas_soil_tests(id) ON DELETE CASCADE,
  problem_id        UUID REFERENCES ch_problem(id) ON DELETE SET NULL,
  crop_id           UUID REFERENCES vivas_crops(id) ON DELETE SET NULL,
  product_id        UUID NOT NULL REFERENCES pih_products(id) ON DELETE CASCADE,
  sku_id            UUID REFERENCES pih_product_skus(id) ON DELETE SET NULL,
  rank              INT NOT NULL DEFAULT 1 CHECK (rank BETWEEN 1 AND 10),
  score             NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  reason            JSONB NOT NULL DEFAULT '{}'::jsonb,
  dose_for_area     NUMERIC(10,3),
  est_cost          NUMERIC(12,2),
  safe_harvest_date DATE,
  status            VARCHAR(30) NOT NULL DEFAULT 'shown' CHECK (status IN (
                      'shown', 'bought', 'added_to_list', 'task_created', 'dismissed'
                    )),
  dismiss_reason    TEXT,
  ai_request_id     UUID REFERENCES ch_ai_request(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_pih_recommendations_farm_id ON pih_recommendations(farm_id);
CREATE INDEX IF NOT EXISTS ix_pih_recommendations_product_id ON pih_recommendations(product_id);
CREATE INDEX IF NOT EXISTS ix_pih_recommendations_case_id ON pih_recommendations(case_id);
CREATE INDEX IF NOT EXISTS ix_pih_recommendations_alert_id ON pih_recommendations(alert_id);
CREATE INDEX IF NOT EXISTS ix_pih_recommendations_soil_test_id ON pih_recommendations(soil_test_id);
CREATE INDEX IF NOT EXISTS ix_pih_recommendations_problem_id ON pih_recommendations(problem_id);
CREATE INDEX IF NOT EXISTS ix_pih_recommendations_crop_id ON pih_recommendations(crop_id);
CREATE INDEX IF NOT EXISTS ix_pih_recommendations_sku_id ON pih_recommendations(sku_id);
CREATE INDEX IF NOT EXISTS ix_pih_recommendations_ai_request_id ON pih_recommendations(ai_request_id);
DROP TRIGGER IF EXISTS trg_pih_recommendations_upd ON pih_recommendations;
CREATE TRIGGER trg_pih_recommendations_upd BEFORE UPDATE ON pih_recommendations FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 3.7 pih_reviews
CREATE TABLE IF NOT EXISTS pih_reviews (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id          UUID NOT NULL REFERENCES pih_products(id) ON DELETE CASCADE,
  farm_id             UUID NOT NULL REFERENCES vivas_farms(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES vivas_users(id) ON DELETE CASCADE,
  outcome_id          UUID REFERENCES pih_treatment_outcomes(id) ON DELETE SET NULL,
  rating              SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title               VARCHAR(200),
  body                TEXT NOT NULL CHECK (char_length(body) >= 20),
  partner_reply       TEXT,
  partner_replied_at  TIMESTAMPTZ,
  is_flagged          BOOLEAN NOT NULL DEFAULT FALSE,
  moderation_status   VARCHAR(30) NOT NULL DEFAULT 'published' CHECK (moderation_status IN (
                        'published', 'pending', 'hidden'
                      )),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_pih_reviews_product_id ON pih_reviews(product_id);
CREATE INDEX IF NOT EXISTS ix_pih_reviews_farm_id ON pih_reviews(farm_id);
CREATE INDEX IF NOT EXISTS ix_pih_reviews_user_id ON pih_reviews(user_id);
CREATE INDEX IF NOT EXISTS ix_pih_reviews_outcome_id ON pih_reviews(outcome_id);
DROP TRIGGER IF EXISTS trg_pih_reviews_upd ON pih_reviews;
CREATE TRIGGER trg_pih_reviews_upd BEFORE UPDATE ON pih_reviews FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- =====================================================================
-- 4. COMMERCE (6 Tables)
-- =====================================================================

-- 4.1 pih_carts
CREATE TABLE IF NOT EXISTS pih_carts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id     UUID NOT NULL REFERENCES vivas_farms(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES vivas_users(id) ON DELETE CASCADE,
  partner_id  UUID NOT NULL REFERENCES pih_partners(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(farm_id, user_id, partner_id)
);

CREATE INDEX IF NOT EXISTS ix_pih_carts_farm_id ON pih_carts(farm_id);
CREATE INDEX IF NOT EXISTS ix_pih_carts_user_id ON pih_carts(user_id);
CREATE INDEX IF NOT EXISTS ix_pih_carts_partner_id ON pih_carts(partner_id);
DROP TRIGGER IF EXISTS trg_pih_carts_upd ON pih_carts;
CREATE TRIGGER trg_pih_carts_upd BEFORE UPDATE ON pih_carts FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 4.2 pih_cart_items
CREATE TABLE IF NOT EXISTS pih_cart_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id           UUID NOT NULL REFERENCES pih_carts(id) ON DELETE CASCADE,
  sku_id            UUID NOT NULL REFERENCES pih_product_skus(id) ON DELETE CASCADE,
  qty               INT NOT NULL CHECK (qty > 0),
  unit_price        NUMERIC(12,2) NOT NULL CHECK (unit_price > 0),
  recommendation_id UUID REFERENCES pih_recommendations(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cart_id, sku_id)
);

CREATE INDEX IF NOT EXISTS ix_pih_cart_items_cart_id ON pih_cart_items(cart_id);
CREATE INDEX IF NOT EXISTS ix_pih_cart_items_sku_id ON pih_cart_items(sku_id);
CREATE INDEX IF NOT EXISTS ix_pih_cart_items_recommendation_id ON pih_cart_items(recommendation_id);
DROP TRIGGER IF EXISTS trg_pih_cart_items_upd ON pih_cart_items;
CREATE TRIGGER trg_pih_cart_items_upd BEFORE UPDATE ON pih_cart_items FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 4.3 pih_store_orders
-- Note: vivas_purchase_orders.id is SERIAL (INTEGER) in buy_migration.sql
CREATE TABLE IF NOT EXISTS pih_store_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no          VARCHAR(50) UNIQUE NOT NULL,
  farm_id           UUID NOT NULL REFERENCES vivas_farms(id) ON DELETE CASCADE,
  partner_id        UUID NOT NULL REFERENCES pih_partners(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES vivas_users(id) ON DELETE CASCADE,
  purchase_order_id INTEGER REFERENCES vivas_purchase_orders(id) ON DELETE SET NULL,
  vendor_id         UUID REFERENCES vivas_vendors(id) ON DELETE SET NULL,
  subtotal          NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  gst_amount        NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  shipping          NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total             NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  payment_mode      VARCHAR(30) NOT NULL DEFAULT 'online' CHECK (payment_mode IN (
                      'online', 'cod', 'credit'
                    )),
  payment_status    VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (payment_status IN (
                      'pending', 'paid', 'failed', 'refunded'
                    )),
  status            VARCHAR(30) NOT NULL DEFAULT 'placed' CHECK (status IN (
                      'placed', 'accepted', 'packed', 'shipped', 'delivered',
                      'received', 'cancelled', 'returned'
                    )),
  delivery_address  JSONB NOT NULL DEFAULT '{}'::jsonb,
  tracking_no       VARCHAR(100),
  invoice_no        VARCHAR(100),
  invoice_url       TEXT,
  cancelled_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_pih_store_orders_farm_id ON pih_store_orders(farm_id);
CREATE INDEX IF NOT EXISTS ix_pih_store_orders_partner_id ON pih_store_orders(partner_id);
CREATE INDEX IF NOT EXISTS ix_pih_store_orders_user_id ON pih_store_orders(user_id);
CREATE INDEX IF NOT EXISTS ix_pih_store_orders_purchase_order_id ON pih_store_orders(purchase_order_id);
CREATE INDEX IF NOT EXISTS ix_pih_store_orders_vendor_id ON pih_store_orders(vendor_id);
CREATE INDEX IF NOT EXISTS ix_pih_store_orders_status ON pih_store_orders(status);
DROP TRIGGER IF EXISTS trg_pih_store_orders_upd ON pih_store_orders;
CREATE TRIGGER trg_pih_store_orders_upd BEFORE UPDATE ON pih_store_orders FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 4.4 pih_store_order_items
CREATE TABLE IF NOT EXISTS pih_store_order_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL REFERENCES pih_store_orders(id) ON DELETE CASCADE,
  product_id        UUID NOT NULL REFERENCES pih_products(id) ON DELETE RESTRICT,
  sku_id            UUID NOT NULL REFERENCES pih_product_skus(id) ON DELETE RESTRICT,
  qty               INT NOT NULL CHECK (qty > 0),
  unit_price        NUMERIC(12,2) NOT NULL CHECK (unit_price > 0),
  gst_pct           NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  line_total        NUMERIC(12,2) NOT NULL,
  commission_pct    NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  batch_no          VARCHAR(100),
  expiry_date       DATE,
  inputs_lot_id     UUID REFERENCES vivas_inputs_lots(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_pih_store_order_items_order_id ON pih_store_order_items(order_id);
CREATE INDEX IF NOT EXISTS ix_pih_store_order_items_product_id ON pih_store_order_items(product_id);
CREATE INDEX IF NOT EXISTS ix_pih_store_order_items_sku_id ON pih_store_order_items(sku_id);
CREATE INDEX IF NOT EXISTS ix_pih_store_order_items_inputs_lot_id ON pih_store_order_items(inputs_lot_id);
DROP TRIGGER IF EXISTS trg_pih_store_order_items_upd ON pih_store_order_items;
CREATE TRIGGER trg_pih_store_order_items_upd BEFORE UPDATE ON pih_store_order_items FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 4.5 pih_order_status_history
CREATE TABLE IF NOT EXISTS pih_order_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES pih_store_orders(id) ON DELETE CASCADE,
  from_status VARCHAR(30),
  to_status   VARCHAR(30) NOT NULL,
  changed_by  UUID REFERENCES vivas_users(id) ON DELETE SET NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_pih_order_status_history_order_id ON pih_order_status_history(order_id);
CREATE INDEX IF NOT EXISTS ix_pih_order_status_history_changed_by ON pih_order_status_history(changed_by);
DROP TRIGGER IF EXISTS trg_pih_order_status_history_upd ON pih_order_status_history;
CREATE TRIGGER trg_pih_order_status_history_upd BEFORE UPDATE ON pih_order_status_history FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 4.6 pih_settlements
CREATE TABLE IF NOT EXISTS pih_settlements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    UUID NOT NULL REFERENCES pih_partners(id) ON DELETE CASCADE,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  gross         NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  commission    NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  net_payable   NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  status        VARCHAR(30) NOT NULL DEFAULT 'draft' CHECK (status IN (
                  'draft', 'issued', 'paid'
                )),
  statement_url TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_pih_settlements_partner_id ON pih_settlements(partner_id);
DROP TRIGGER IF EXISTS trg_pih_settlements_upd ON pih_settlements;
CREATE TRIGGER trg_pih_settlements_upd BEFORE UPDATE ON pih_settlements FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- =====================================================================
-- 5. PLATFORM, CONSENT, JOBS AND AUDIT (8 Tables)
-- =====================================================================

-- 5.1 pih_api_keys
CREATE TABLE IF NOT EXISTS pih_api_keys (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    UUID NOT NULL REFERENCES pih_partners(id) ON DELETE CASCADE,
  key_name      VARCHAR(100) NOT NULL,
  key_hash      VARCHAR(64) UNIQUE NOT NULL,
  key_preview   VARCHAR(30) NOT NULL,
  scopes        TEXT[] NOT NULL DEFAULT '{}',
  expires_at    TIMESTAMPTZ,
  last_used_at  TIMESTAMPTZ,
  is_revoked    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_pih_api_keys_partner_id ON pih_api_keys(partner_id);
CREATE INDEX IF NOT EXISTS ix_pih_api_keys_key_hash ON pih_api_keys(key_hash);
DROP TRIGGER IF EXISTS trg_pih_api_keys_upd ON pih_api_keys;
CREATE TRIGGER trg_pih_api_keys_upd BEFORE UPDATE ON pih_api_keys FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 5.2 pih_webhooks
CREATE TABLE IF NOT EXISTS pih_webhooks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id    UUID NOT NULL REFERENCES pih_partners(id) ON DELETE CASCADE,
  endpoint_url  TEXT NOT NULL,
  secret        VARCHAR(255) NOT NULL,
  events        TEXT[] NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_pih_webhooks_partner_id ON pih_webhooks(partner_id);
DROP TRIGGER IF EXISTS trg_pih_webhooks_upd ON pih_webhooks;
CREATE TRIGGER trg_pih_webhooks_upd BEFORE UPDATE ON pih_webhooks FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 5.3 pih_webhook_deliveries
CREATE TABLE IF NOT EXISTS pih_webhook_deliveries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id    UUID NOT NULL REFERENCES pih_webhooks(id) ON DELETE CASCADE,
  event         VARCHAR(60) NOT NULL,
  payload       JSONB NOT NULL,
  attempt       INT NOT NULL DEFAULT 1,
  response_code INT,
  next_retry_at TIMESTAMPTZ,
  status        VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN (
                  'pending', 'delivered', 'failed'
                )),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_pih_webhook_deliveries_webhook_id ON pih_webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS ix_pih_webhook_deliveries_retry ON pih_webhook_deliveries(status, next_retry_at);
DROP TRIGGER IF EXISTS trg_pih_webhook_deliveries_upd ON pih_webhook_deliveries;
CREATE TRIGGER trg_pih_webhook_deliveries_upd BEFORE UPDATE ON pih_webhook_deliveries FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 5.4 pih_data_sharing_consents
CREATE TABLE IF NOT EXISTS pih_data_sharing_consents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id       UUID NOT NULL REFERENCES vivas_farms(id) ON DELETE CASCADE,
  granted_by    UUID NOT NULL REFERENCES vivas_users(id) ON DELETE CASCADE,
  scope         VARCHAR(40) NOT NULL CHECK (scope IN (
                  'anonymised_outcomes', 'trials'
                )),
  granted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawn_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_pih_data_sharing_consents_farm_id ON pih_data_sharing_consents(farm_id);
CREATE INDEX IF NOT EXISTS ix_pih_data_sharing_consents_granted_by ON pih_data_sharing_consents(granted_by);
DROP TRIGGER IF EXISTS trg_pih_data_sharing_consents_upd ON pih_data_sharing_consents;
CREATE TRIGGER trg_pih_data_sharing_consents_upd BEFORE UPDATE ON pih_data_sharing_consents FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 5.5 pih_sync_state
CREATE TABLE IF NOT EXISTS pih_sync_state (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table  VARCHAR(80) UNIQUE NOT NULL,
  last_cursor   TEXT,
  last_run_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_pih_sync_state_upd ON pih_sync_state;
CREATE TRIGGER trg_pih_sync_state_upd BEFORE UPDATE ON pih_sync_state FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 5.6 pih_jobs
CREATE TABLE IF NOT EXISTS pih_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type    VARCHAR(60) NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  status      VARCHAR(30) NOT NULL DEFAULT 'queued' CHECK (status IN (
                'queued', 'running', 'completed', 'failed'
              )),
  attempts    INT NOT NULL DEFAULT 0,
  run_after   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_pih_jobs_status_run_after ON pih_jobs(status, run_after);
DROP TRIGGER IF EXISTS trg_pih_jobs_upd ON pih_jobs;
CREATE TRIGGER trg_pih_jobs_upd BEFORE UPDATE ON pih_jobs FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 5.7 pih_notifications
CREATE TABLE IF NOT EXISTS pih_notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID REFERENCES vivas_users(id) ON DELETE CASCADE,
  partner_id        UUID REFERENCES pih_partners(id) ON DELETE CASCADE,
  farm_id           UUID REFERENCES vivas_farms(id) ON DELETE CASCADE,
  type              VARCHAR(60) NOT NULL,
  title             VARCHAR(255) NOT NULL,
  body              TEXT,
  link              VARCHAR(255),
  read_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_pih_notifications_recipient_user_id ON pih_notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS ix_pih_notifications_partner_id ON pih_notifications(partner_id);
CREATE INDEX IF NOT EXISTS ix_pih_notifications_farm_id ON pih_notifications(farm_id);
DROP TRIGGER IF EXISTS trg_pih_notifications_upd ON pih_notifications;
CREATE TRIGGER trg_pih_notifications_upd BEFORE UPDATE ON pih_notifications FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();

-- 5.8 pih_audit_log
CREATE TABLE IF NOT EXISTS pih_audit_log (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id     UUID REFERENCES vivas_users(id) ON DELETE SET NULL,
  actor_partner_id  UUID REFERENCES pih_partners(id) ON DELETE SET NULL,
  entity            VARCHAR(80) NOT NULL,
  entity_id         UUID,
  action            VARCHAR(40) NOT NULL,
  before            JSONB,
  after             JSONB,
  ip                VARCHAR(64),
  idempotency_key   VARCHAR(120),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_pih_audit_log_actor_user_id ON pih_audit_log(actor_user_id);
CREATE INDEX IF NOT EXISTS ix_pih_audit_log_actor_partner_id ON pih_audit_log(actor_partner_id);
CREATE INDEX IF NOT EXISTS ix_pih_audit_log_entity ON pih_audit_log(entity, entity_id);
CREATE INDEX IF NOT EXISTS ix_pih_audit_log_idempotency_key ON pih_audit_log(idempotency_key) WHERE idempotency_key IS NOT NULL;
DROP TRIGGER IF EXISTS trg_pih_audit_log_upd ON pih_audit_log;
CREATE TRIGGER trg_pih_audit_log_upd BEFORE UPDATE ON pih_audit_log FOR EACH ROW EXECUTE FUNCTION pih_touch_updated_at();
