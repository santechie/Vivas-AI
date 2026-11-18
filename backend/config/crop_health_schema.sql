-- =====================================================================
-- Vivas AI · Crop Health module Schema Migration
-- Target: PostgreSQL 14+
-- Adapted for existing vivas_* tables
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------
-- 1. ENUMS (created safely)
-- ---------------------------------------------------------------------
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ch_problem_type') THEN
        CREATE TYPE ch_problem_type AS ENUM ('PEST','DISEASE','DEFICIENCY');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ch_scope') THEN
        CREATE TYPE ch_scope AS ENUM ('GLOBAL','FARM');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ch_publish_status') THEN
        CREATE TYPE ch_publish_status AS ENUM ('DRAFT','SUBMITTED','CHANGES_REQUESTED','VERIFIED','PUBLISHED','REJECTED','ARCHIVED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ch_severity') THEN
        CREATE TYPE ch_severity AS ENUM ('LOW','MODERATE','HIGH','SEVERE');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ch_control_method') THEN
        CREATE TYPE ch_control_method AS ENUM ('CULTURAL','BIOLOGICAL','CHEMICAL','MECHANICAL','PHYSICAL','NUTRITIONAL');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ch_resistance') THEN
        CREATE TYPE ch_resistance AS ENUM ('RESISTANT','TOLERANT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ch_case_status') THEN
        CREATE TYPE ch_case_status AS ENUM ('OPEN','AI_REVIEW','AGRONOMIST_REVIEW','DIAGNOSED','TREATING','MONITORING','RESOLVED','CLOSED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ch_case_source') THEN
        CREATE TYPE ch_case_source AS ENUM ('MANUAL','AI_SCAN','IMPORT','ALERT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ch_outcome') THEN
        CREATE TYPE ch_outcome AS ENUM ('RESOLVED','PARTIAL','FAILED','SELF_RESOLVED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ch_diag_source') THEN
        CREATE TYPE ch_diag_source AS ENUM ('AI','AGRONOMIST','FARMER');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ch_treatment_status') THEN
        CREATE TYPE ch_treatment_status AS ENUM ('RECOMMENDED','PLANNED','APPLIED','SKIPPED','CANCELLED');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ch_alert_level') THEN
        CREATE TYPE ch_alert_level AS ENUM ('INFO','WATCH','WARNING','CRITICAL');
    END IF;
END $$;

-- Generic updated_at trigger
CREATE OR REPLACE FUNCTION ch_touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

-- Human-readable code sequences
CREATE SEQUENCE IF NOT EXISTS ch_seq_pest START 1;
CREATE SEQUENCE IF NOT EXISTS ch_seq_disease START 1;
CREATE SEQUENCE IF NOT EXISTS ch_seq_deficiency START 1;
CREATE SEQUENCE IF NOT EXISTS ch_seq_case START 1;

-- ---------------------------------------------------------------------
-- 2. LOOKUPS & SYMPTOMS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ch_lookup (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_code   text NOT NULL,
  code        text NOT NULL,
  label       text NOT NULL,
  label_i18n  jsonb NOT NULL DEFAULT '{}',
  sort_order  int  NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  farm_id     uuid REFERENCES vivas_farms(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_ch_lookup ON ch_lookup (list_code, code, COALESCE(farm_id,'00000000-0000-0000-0000-000000000000'));
CREATE INDEX IF NOT EXISTS ix_ch_lookup_list ON ch_lookup (list_code, is_active, sort_order);

CREATE TABLE IF NOT EXISTS ch_nutrient (
  code        text PRIMARY KEY,
  name        text NOT NULL,
  category    text NOT NULL CHECK (category IN ('MACRONUTRIENT','SECONDARY','MICRONUTRIENT')),
  sort_order  int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ch_symptom (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,
  label         text NOT NULL,
  plant_part_id uuid REFERENCES ch_lookup(id),
  description   text,
  applies_to    ch_problem_type[] NOT NULL DEFAULT '{PEST,DISEASE,DEFICIENCY}',
  is_active     boolean NOT NULL DEFAULT true
);

-- ---------------------------------------------------------------------
-- 3. LIBRARY (Pests, Diseases, Deficiencies)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ch_problem (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_type        ch_problem_type NOT NULL,
  code                text NOT NULL UNIQUE,
  name                text NOT NULL,
  local_names         jsonb NOT NULL DEFAULT '{}',
  scientific_name     text,
  category_id         uuid REFERENCES ch_lookup(id),
  pest_type_id        uuid REFERENCES ch_lookup(id),
  nutrient_code       text REFERENCES ch_nutrient(code),
  identification_text text,
  favourable_text     text,
  temp_min_c          numeric(4,1),
  temp_max_c          numeric(4,1),
  humidity_min_pct    numeric(4,1),
  humidity_max_pct    numeric(4,1),
  rainfall_note       text,
  soil_note           text,
  peak_occurrence_text text,
  peak_months         smallint[],
  development_stage_text text,
  potential_severity  ch_severity,
  preventive_measures text,
  is_soil_test_required boolean,
  notes               text,
  scope               ch_scope NOT NULL DEFAULT 'FARM',
  farm_id             uuid REFERENCES vivas_farms(id),
  status              ch_publish_status NOT NULL DEFAULT 'DRAFT',
  version             int NOT NULL DEFAULT 1,
  created_by          uuid NOT NULL REFERENCES vivas_users(id),
  verified_by         uuid REFERENCES vivas_users(id),
  verified_at         timestamptz,
  published_at        timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz,
  CHECK ( (scope = 'FARM') = (farm_id IS NOT NULL) ),
  CHECK ( (problem_type = 'DEFICIENCY') = (nutrient_code IS NOT NULL) ),
  CHECK ( problem_type = 'PEST'    OR pest_type_id IS NULL ),
  CHECK ( problem_type = 'DISEASE' OR development_stage_text IS NULL ),
  CHECK ( problem_type <> 'DEFICIENCY' OR category_id IS NULL )
);
CREATE INDEX IF NOT EXISTS ix_ch_problem_type_status ON ch_problem (problem_type, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_ch_problem_farm        ON ch_problem (farm_id) WHERE farm_id IS NOT NULL;
DROP TRIGGER IF EXISTS trg_ch_problem_upd ON ch_problem;
CREATE TRIGGER trg_ch_problem_upd BEFORE UPDATE ON ch_problem FOR EACH ROW EXECUTE FUNCTION ch_touch_updated_at();

CREATE TABLE IF NOT EXISTS ch_problem_attr (
  problem_id uuid NOT NULL REFERENCES ch_problem(id) ON DELETE CASCADE,
  lookup_id  uuid NOT NULL REFERENCES ch_lookup(id),
  PRIMARY KEY (problem_id, lookup_id)
);

CREATE TABLE IF NOT EXISTS ch_problem_crop (
  problem_id        uuid NOT NULL REFERENCES ch_problem(id) ON DELETE CASCADE,
  crop_id           uuid NOT NULL REFERENCES vivas_crops(id),
  is_primary        boolean NOT NULL DEFAULT false,
  susceptible_stage text,
  peak_months       smallint[],
  crop_severity     ch_severity,
  notes             text,
  PRIMARY KEY (problem_id, crop_id)
);
CREATE INDEX IF NOT EXISTS ix_ch_problem_crop_crop ON ch_problem_crop (crop_id);

CREATE TABLE IF NOT EXISTS ch_resistant_variety (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id  uuid NOT NULL REFERENCES ch_problem(id) ON DELETE CASCADE,
  crop_id     uuid NOT NULL REFERENCES vivas_crops(id),
  variety_id  uuid NOT NULL REFERENCES vivas_crop_varieties(id),
  resistance  ch_resistance NOT NULL DEFAULT 'TOLERANT',
  notes       text,
  UNIQUE (problem_id, variety_id)
);

CREATE TABLE IF NOT EXISTS ch_lifecycle_stage (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id        uuid NOT NULL REFERENCES ch_problem(id) ON DELETE CASCADE,
  stage_id          uuid NOT NULL REFERENCES ch_lookup(id),
  seq               int  NOT NULL,
  duration_days_min int,
  duration_days_max int,
  description       text,
  UNIQUE (problem_id, seq)
);

CREATE TABLE IF NOT EXISTS ch_problem_symptom (
  problem_id uuid NOT NULL REFERENCES ch_problem(id) ON DELETE CASCADE,
  symptom_id uuid NOT NULL REFERENCES ch_symptom(id),
  weight     numeric(3,2) NOT NULL DEFAULT 1.00 CHECK (weight BETWEEN 0 AND 1),
  PRIMARY KEY (problem_id, symptom_id)
);

CREATE TABLE IF NOT EXISTS ch_control_measure (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id          uuid NOT NULL REFERENCES ch_problem(id) ON DELETE CASCADE,
  crop_id             uuid REFERENCES vivas_crops(id),
  method_type         ch_control_method NOT NULL,
  title               text NOT NULL,
  description         text,
  input_id            uuid REFERENCES vivas_inputs_catalog(id),
  input_name_text     text,
  active_ingredient   text,
  dose_value          numeric(10,3),
  dose_unit_id        uuid REFERENCES ch_lookup(id),
  dose_basis_id       uuid REFERENCES ch_lookup(id),
  application_method_id uuid REFERENCES ch_lookup(id),
  frequency_text      text,
  interval_days       int,
  max_applications    int,
  phi_days            int,
  reentry_hours       int,
  safety_notes        text,
  seq                 int NOT NULL DEFAULT 0,
  is_active           boolean NOT NULL DEFAULT true,
  CHECK ( method_type <> 'CHEMICAL' OR phi_days IS NOT NULL )
);
CREATE INDEX IF NOT EXISTS ix_ch_control_problem ON ch_control_measure (problem_id, crop_id);

CREATE TABLE IF NOT EXISTS ch_media (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type    text NOT NULL CHECK (owner_type IN ('PROBLEM','CASE','DIAGNOSIS','FOLLOWUP')),
  owner_id      uuid NOT NULL,
  file_id       uuid,
  url           text NOT NULL,
  thumb_url     text,
  image_label_id uuid REFERENCES ch_lookup(id),
  caption       text,
  is_primary    boolean NOT NULL DEFAULT false,
  source_credit text,
  width         int,
  height        int,
  checksum      text,
  uploaded_by   uuid REFERENCES vivas_users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_ch_media_owner ON ch_media (owner_type, owner_id);

CREATE TABLE IF NOT EXISTS ch_problem_review (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id  uuid NOT NULL REFERENCES ch_problem(id) ON DELETE CASCADE,
  action      text NOT NULL CHECK (action IN ('SUBMIT','REQUEST_CHANGES','VERIFY','PUBLISH','REJECT','ARCHIVE','REOPEN')),
  reviewer_id uuid NOT NULL REFERENCES vivas_users(id),
  comment     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ch_problem_version (
  problem_id  uuid NOT NULL REFERENCES ch_problem(id) ON DELETE CASCADE,
  version     int  NOT NULL,
  snapshot    jsonb NOT NULL,
  changed_by  uuid REFERENCES vivas_users(id),
  changed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (problem_id, version)
);

-- ---------------------------------------------------------------------
-- 4. CASES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ch_case (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_no               text NOT NULL UNIQUE,
  farm_id               uuid NOT NULL REFERENCES vivas_farms(id),
  planting_id           uuid REFERENCES vivas_plantings(id),
  site_id               integer,
  bed_id                integer,
  crop_id               uuid NOT NULL REFERENCES vivas_crops(id),
  variety_id            uuid REFERENCES vivas_crop_varieties(id),
  crop_stage            text,
  observed_at           timestamptz NOT NULL DEFAULT now(),
  reported_by           uuid NOT NULL REFERENCES vivas_users(id),
  assigned_to           uuid REFERENCES vivas_users(id),
  assigned_contact_id   uuid,
  suspected_type        ch_problem_type,
  suspected_problem_id  uuid REFERENCES ch_problem(id),
  confirmed_problem_id  uuid REFERENCES ch_problem(id),
  severity              ch_severity NOT NULL DEFAULT 'LOW',
  incidence_pct         numeric(5,2) CHECK (incidence_pct BETWEEN 0 AND 100),
  area_affected         text,
  area_unit             text,
  symptoms_notes        text,
  latitude              numeric(9,6),
  longitude             numeric(9,6),
  weather_snapshot      jsonb,
  status                ch_case_status NOT NULL DEFAULT 'OPEN',
  source                ch_case_source NOT NULL DEFAULT 'MANUAL',
  outcome               ch_outcome,
  resolved_at           timestamptz,
  estimated_loss_amount numeric(12,2),
  follow_up_date        date,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz
);
CREATE INDEX IF NOT EXISTS ix_ch_case_farm_status ON ch_case (farm_id, status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS ix_ch_case_planting    ON ch_case (planting_id);
CREATE INDEX IF NOT EXISTS ix_ch_case_crop        ON ch_case (crop_id, confirmed_problem_id);
DROP TRIGGER IF EXISTS trg_ch_case_upd ON ch_case;
CREATE TRIGGER trg_ch_case_upd BEFORE UPDATE ON ch_case FOR EACH ROW EXECUTE FUNCTION ch_touch_updated_at();

CREATE TABLE IF NOT EXISTS ch_case_plant_part (
  case_id       uuid NOT NULL REFERENCES ch_case(id) ON DELETE CASCADE,
  plant_part_id uuid NOT NULL REFERENCES ch_lookup(id),
  PRIMARY KEY (case_id, plant_part_id)
);

CREATE TABLE IF NOT EXISTS ch_case_symptom (
  case_id    uuid NOT NULL REFERENCES ch_case(id) ON DELETE CASCADE,
  symptom_id uuid NOT NULL REFERENCES ch_symptom(id),
  note       text,
  PRIMARY KEY (case_id, symptom_id)
);

CREATE TABLE IF NOT EXISTS ch_case_diagnosis (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id          uuid NOT NULL REFERENCES ch_case(id) ON DELETE CASCADE,
  source           ch_diag_source NOT NULL,
  problem_id       uuid REFERENCES ch_problem(id),
  problem_type     ch_problem_type,
  suggested_name   text,
  rank             int,
  confidence       numeric(5,4) CHECK (confidence BETWEEN 0 AND 1),
  model_name       text,
  model_version    text,
  ai_request_id    uuid,
  rationale        text,
  is_confirmed     boolean NOT NULL DEFAULT false,
  confirmed_by     uuid REFERENCES vivas_users(id),
  confirmed_at     timestamptz,
  correction_reason text,
  raw_response     jsonb,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_ch_diag_case ON ch_case_diagnosis (case_id, rank);

CREATE TABLE IF NOT EXISTS ch_case_treatment (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id            uuid NOT NULL REFERENCES ch_case(id) ON DELETE CASCADE,
  control_measure_id uuid REFERENCES ch_control_measure(id),
  task_id            uuid REFERENCES vivas_farm_tasks(id),
  input_id           uuid REFERENCES vivas_inputs_catalog(id),
  recommended_by     ch_diag_source NOT NULL DEFAULT 'AI',
  title              text NOT NULL,
  planned_date       date,
  applied_date       date,
  dose_value         numeric(10,3),
  dose_unit_id       uuid REFERENCES ch_lookup(id),
  dose_basis_id      uuid REFERENCES ch_lookup(id),
  application_method_id uuid REFERENCES ch_lookup(id),
  phi_days           int,
  safe_harvest_date  date GENERATED ALWAYS AS (applied_date + phi_days) STORED,
  cost               numeric(12,2),
  status             ch_treatment_status NOT NULL DEFAULT 'RECOMMENDED',
  outcome_notes      text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_ch_treat_case ON ch_case_treatment (case_id);

CREATE TABLE IF NOT EXISTS ch_case_followup (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       uuid NOT NULL REFERENCES ch_case(id) ON DELETE CASCADE,
  observed_at   timestamptz NOT NULL DEFAULT now(),
  observed_by   uuid NOT NULL REFERENCES vivas_users(id),
  severity      ch_severity,
  incidence_pct numeric(5,2) CHECK (incidence_pct BETWEEN 0 AND 100),
  trend         text CHECK (trend IN ('IMPROVING','STABLE','WORSENING')),
  notes         text
);

CREATE TABLE IF NOT EXISTS ch_case_note (
  case_id uuid NOT NULL REFERENCES ch_case(id) ON DELETE CASCADE,
  note_id uuid NOT NULL REFERENCES vivas_notes(id) ON DELETE CASCADE,
  PRIMARY KEY (case_id, note_id)
);

-- ---------------------------------------------------------------------
-- 5. AI ENGINE
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ch_ai_request (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id       uuid NOT NULL REFERENCES vivas_farms(id),
  case_id       uuid REFERENCES ch_case(id) ON DELETE SET NULL,
  user_id       uuid NOT NULL REFERENCES vivas_users(id),
  request_type  text NOT NULL CHECK (request_type IN ('DIAGNOSE','REMEDY','RISK','CHAT')),
  payload       jsonb NOT NULL,
  response      jsonb,
  status        text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SUCCESS','FAILED','TIMEOUT')),
  model_name    text,
  model_version text,
  latency_ms    int,
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_ch_ai_req_case ON ch_ai_request (case_id);

CREATE TABLE IF NOT EXISTS ch_ai_feedback (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id       uuid NOT NULL REFERENCES ch_case_diagnosis(id) ON DELETE CASCADE,
  user_id            uuid NOT NULL REFERENCES vivas_users(id),
  was_correct        boolean NOT NULL,
  correct_problem_id uuid REFERENCES ch_problem(id),
  rating             smallint CHECK (rating BETWEEN 1 AND 5),
  comment            text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- Training view
CREATE OR REPLACE VIEW v_ch_training_set AS
SELECT c.id AS case_id, c.crop_id, c.variety_id, c.crop_stage, c.confirmed_problem_id,
       p.problem_type, p.name AS problem_name,
       (SELECT count(*) FROM ch_media m WHERE m.owner_type='CASE' AND m.owner_id=c.id) AS image_count,
       c.weather_snapshot, c.observed_at
FROM ch_case c
JOIN ch_problem p ON p.id = c.confirmed_problem_id
WHERE c.deleted_at IS NULL
  AND EXISTS (SELECT 1 FROM ch_case_diagnosis d
              WHERE d.case_id = c.id AND d.is_confirmed AND d.source = 'AGRONOMIST');

-- ---------------------------------------------------------------------
-- 6. RISK RULES & ALERTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ch_risk_rule (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id    uuid NOT NULL REFERENCES ch_problem(id) ON DELETE CASCADE,
  crop_id       uuid REFERENCES vivas_crops(id),
  conditions    jsonb NOT NULL,
  lookback_days int NOT NULL DEFAULT 7,
  level         ch_alert_level NOT NULL DEFAULT 'WATCH',
  is_active     boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS ch_alert (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id         uuid NOT NULL REFERENCES vivas_farms(id),
  planting_id     uuid REFERENCES vivas_plantings(id),
  problem_id      uuid REFERENCES ch_problem(id),
  rule_id         uuid REFERENCES ch_risk_rule(id),
  level           ch_alert_level NOT NULL,
  message         text NOT NULL,
  status          text NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW','ACKNOWLEDGED','DISMISSED','CONVERTED_TO_CASE')),
  acknowledged_by uuid REFERENCES vivas_users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_ch_alert_farm ON ch_alert (farm_id, status, created_at DESC);

-- ---------------------------------------------------------------------
-- 7. BULK IMPORT
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ch_import_batch (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id       uuid REFERENCES vivas_farms(id),
  user_id       uuid NOT NULL REFERENCES vivas_users(id),
  entity_type   text NOT NULL CHECK (entity_type IN ('PEST','DISEASE','DEFICIENCY')),
  file_name     text NOT NULL,
  status        text NOT NULL DEFAULT 'UPLOADED' CHECK (status IN ('UPLOADED','VALIDATING','VALIDATED','IMPORTING','COMPLETED','FAILED')),
  total_rows    int NOT NULL DEFAULT 0,
  success_rows  int NOT NULL DEFAULT 0,
  failed_rows   int NOT NULL DEFAULT 0,
  import_mode   text NOT NULL DEFAULT 'CREATE_ONLY' CHECK (import_mode IN ('CREATE_ONLY','UPSERT_BY_CODE')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz
);

CREATE TABLE IF NOT EXISTS ch_import_error (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id    uuid NOT NULL REFERENCES ch_import_batch(id) ON DELETE CASCADE,
  sheet       text NOT NULL,
  row_no      int  NOT NULL,
  column_name text,
  message     text NOT NULL
);

-- ---------------------------------------------------------------------
-- 8. SEED DATA
-- ---------------------------------------------------------------------
INSERT INTO ch_nutrient (code,name,category,sort_order) VALUES
 ('N','Nitrogen','MACRONUTRIENT',1),('P','Phosphorus','MACRONUTRIENT',2),('K','Potassium','MACRONUTRIENT',3),
 ('Ca','Calcium','SECONDARY',4),('Mg','Magnesium','SECONDARY',5),('S','Sulphur','SECONDARY',6),
 ('Fe','Iron','MICRONUTRIENT',7),('Zn','Zinc','MICRONUTRIENT',8),('B','Boron','MICRONUTRIENT',9),
 ('Mn','Manganese','MICRONUTRIENT',10),('Cu','Copper','MICRONUTRIENT',11),('Mo','Molybdenum','MICRONUTRIENT',12),
 ('Cl','Chlorine','MICRONUTRIENT',13),('Ni','Nickel','MICRONUTRIENT',14)
ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, category=EXCLUDED.category, sort_order=EXCLUDED.sort_order;

INSERT INTO ch_lookup (list_code, code, label, sort_order) VALUES
 ('PEST_CATEGORY','INSECT','Insect',1),('PEST_CATEGORY','MITE','Mite',2),('PEST_CATEGORY','NEMATODE','Nematode',3),('PEST_CATEGORY','OTHER','Other',4),
 ('PEST_TYPE','CHEWING','Chewing',1),('PEST_TYPE','SUCKING','Sucking',2),('PEST_TYPE','BORING','Boring',3),('PEST_TYPE','MINING','Mining',4),('PEST_TYPE','ROOT_FEEDING','Root-feeding',5),
 ('DISEASE_CATEGORY','FUNGAL','Fungal',1),('DISEASE_CATEGORY','BACTERIAL','Bacterial',2),('DISEASE_CATEGORY','VIRAL','Viral',3),('DISEASE_CATEGORY','NEMATODE','Nematode',4),('DISEASE_CATEGORY','PHYTOPLASMA','Phytoplasma',5),('DISEASE_CATEGORY','ABIOTIC','Abiotic',6),
 ('PLANT_PART','ROOT','Root',1),('PLANT_PART','STEM','Stem',2),('PLANT_PART','LEAF','Leaf',3),('PLANT_PART','FLOWER','Flower',4),('PLANT_PART','FRUIT','Fruit',5),('PLANT_PART','SEED','Seed',6),
 ('SPREAD_MECHANISM','WIND','Wind',1),('SPREAD_MECHANISM','SOIL','Soil',2),('SPREAD_MECHANISM','WATER','Water',3),('SPREAD_MECHANISM','SEED','Seed',4),('SPREAD_MECHANISM','PLANTING_MATERIAL','Planting material',5),('SPREAD_MECHANISM','INSECT_VECTOR','Insect vector',6),
 ('MONITORING_METHOD','TRAP','Trap',1),('MONITORING_METHOD','VISUAL','Visual inspection',2),('MONITORING_METHOD','SAMPLING','Sampling',3),('MONITORING_METHOD','SCOUTING','Scouting',4),
 ('APPLICATION_METHOD','SPRAY','Spray',1),('APPLICATION_METHOD','SOIL','Soil application',2),('APPLICATION_METHOD','SEED_TREATMENT','Seed treatment',3),('APPLICATION_METHOD','FOLIAR','Foliar',4),('APPLICATION_METHOD','FERTIGATION','Fertigation',5),('APPLICATION_METHOD','OTHER','Other',9),
 ('DIAGNOSTIC_METHOD','VISUAL','Visual',1),('DIAGNOSTIC_METHOD','SOIL_TEST','Soil test',2),('DIAGNOSTIC_METHOD','TISSUE_TEST','Tissue test',3),
 ('LIFECYCLE_STAGE','EGG','Egg',1),('LIFECYCLE_STAGE','LARVA','Larva',2),('LIFECYCLE_STAGE','NYMPH','Nymph',3),('LIFECYCLE_STAGE','ADULT','Adult',4),
 ('IMAGE_LABEL','WHOLE_PLANT','Whole plant',1),('IMAGE_LABEL','LEAF','Leaf symptom',2),('IMAGE_LABEL','STEM','Stem symptom',3),('IMAGE_LABEL','FRUIT','Fruit symptom',4),('IMAGE_LABEL','ROOT','Root symptom',5),('IMAGE_LABEL','PEST_EGG','Pest - egg',6),('IMAGE_LABEL','PEST_LARVA','Pest - larva/nymph',7),('IMAGE_LABEL','PEST_ADULT','Pest - adult',8),
 ('DOSE_UNIT','ML','ml',1),('DOSE_UNIT','L','L',2),('DOSE_UNIT','G','g',3),('DOSE_UNIT','KG','kg',4),
 ('DOSE_BASIS','PER_LITRE','per litre of water',1),('DOSE_BASIS','PER_ACRE','per acre',2),('DOSE_BASIS','PER_HA','per hectare',3),('DOSE_BASIS','PER_PLANT','per plant',4),('DOSE_BASIS','PER_BED','per bed',5)
ON CONFLICT (list_code, code, COALESCE(farm_id,'00000000-0000-0000-0000-000000000000')) DO NOTHING;
