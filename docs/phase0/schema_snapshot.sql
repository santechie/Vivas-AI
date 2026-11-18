--
-- PostgreSQL database dump
--

\restrict 2RKSdu24oB1dPgtmmjh12ZiLHdtCRKH2YiuJqphddAAXMDnbSmGcPEgv6gG7eBy

-- Dumped from database version 15.18 (Postgres.app)
-- Dumped by pg_dump version 18.4 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: ch_alert_level; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ch_alert_level AS ENUM (
    'INFO',
    'WATCH',
    'WARNING',
    'CRITICAL'
);


--
-- Name: ch_case_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ch_case_source AS ENUM (
    'MANUAL',
    'AI_SCAN',
    'IMPORT',
    'ALERT'
);


--
-- Name: ch_case_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ch_case_status AS ENUM (
    'OPEN',
    'AI_REVIEW',
    'AGRONOMIST_REVIEW',
    'DIAGNOSED',
    'TREATING',
    'MONITORING',
    'RESOLVED',
    'CLOSED'
);


--
-- Name: ch_control_method; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ch_control_method AS ENUM (
    'CULTURAL',
    'BIOLOGICAL',
    'CHEMICAL',
    'MECHANICAL',
    'PHYSICAL',
    'NUTRITIONAL'
);


--
-- Name: ch_diag_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ch_diag_source AS ENUM (
    'AI',
    'AGRONOMIST',
    'FARMER'
);


--
-- Name: ch_outcome; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ch_outcome AS ENUM (
    'RESOLVED',
    'PARTIAL',
    'FAILED',
    'SELF_RESOLVED'
);


--
-- Name: ch_problem_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ch_problem_type AS ENUM (
    'PEST',
    'DISEASE',
    'DEFICIENCY'
);


--
-- Name: ch_publish_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ch_publish_status AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'CHANGES_REQUESTED',
    'VERIFIED',
    'PUBLISHED',
    'REJECTED',
    'ARCHIVED'
);


--
-- Name: ch_resistance; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ch_resistance AS ENUM (
    'RESISTANT',
    'TOLERANT'
);


--
-- Name: ch_scope; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ch_scope AS ENUM (
    'GLOBAL',
    'FARM'
);


--
-- Name: ch_severity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ch_severity AS ENUM (
    'LOW',
    'MODERATE',
    'HIGH',
    'SEVERE'
);


--
-- Name: ch_treatment_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.ch_treatment_status AS ENUM (
    'RECOMMENDED',
    'PLANNED',
    'APPLIED',
    'SKIPPED',
    'CANCELLED'
);


--
-- Name: ch_touch_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ch_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;


--
-- Name: pih_touch_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pih_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ch_ai_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_ai_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    diagnosis_id uuid NOT NULL,
    user_id uuid NOT NULL,
    was_correct boolean NOT NULL,
    correct_problem_id uuid,
    rating smallint,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ch_ai_feedback_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: ch_ai_request; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_ai_request (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid NOT NULL,
    case_id uuid,
    user_id uuid NOT NULL,
    request_type text NOT NULL,
    payload jsonb NOT NULL,
    response jsonb,
    status text DEFAULT 'PENDING'::text NOT NULL,
    model_name text,
    model_version text,
    latency_ms integer,
    error_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ch_ai_request_request_type_check CHECK ((request_type = ANY (ARRAY['DIAGNOSE'::text, 'REMEDY'::text, 'RISK'::text, 'CHAT'::text]))),
    CONSTRAINT ch_ai_request_status_check CHECK ((status = ANY (ARRAY['PENDING'::text, 'SUCCESS'::text, 'FAILED'::text, 'TIMEOUT'::text])))
);


--
-- Name: ch_alert; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_alert (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid NOT NULL,
    planting_id uuid,
    problem_id uuid,
    rule_id uuid,
    level public.ch_alert_level NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'NEW'::text NOT NULL,
    acknowledged_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ch_alert_status_check CHECK ((status = ANY (ARRAY['NEW'::text, 'ACKNOWLEDGED'::text, 'DISMISSED'::text, 'CONVERTED_TO_CASE'::text])))
);


--
-- Name: ch_case; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_case (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_no text NOT NULL,
    farm_id uuid NOT NULL,
    planting_id uuid,
    site_id integer,
    bed_id integer,
    crop_id uuid NOT NULL,
    variety_id uuid,
    crop_stage text,
    observed_at timestamp with time zone DEFAULT now() NOT NULL,
    reported_by uuid NOT NULL,
    assigned_to uuid,
    assigned_contact_id uuid,
    suspected_type public.ch_problem_type,
    suspected_problem_id uuid,
    confirmed_problem_id uuid,
    severity public.ch_severity DEFAULT 'LOW'::public.ch_severity NOT NULL,
    incidence_pct numeric(5,2),
    area_affected text,
    area_unit text,
    symptoms_notes text,
    latitude numeric(9,6),
    longitude numeric(9,6),
    weather_snapshot jsonb,
    status public.ch_case_status DEFAULT 'OPEN'::public.ch_case_status NOT NULL,
    source public.ch_case_source DEFAULT 'MANUAL'::public.ch_case_source NOT NULL,
    outcome public.ch_outcome,
    resolved_at timestamp with time zone,
    estimated_loss_amount numeric(12,2),
    follow_up_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT ch_case_incidence_pct_check CHECK (((incidence_pct >= (0)::numeric) AND (incidence_pct <= (100)::numeric)))
);


--
-- Name: ch_case_diagnosis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_case_diagnosis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    source public.ch_diag_source NOT NULL,
    problem_id uuid,
    problem_type public.ch_problem_type,
    suggested_name text,
    rank integer,
    confidence numeric(5,4),
    model_name text,
    model_version text,
    ai_request_id uuid,
    rationale text,
    is_confirmed boolean DEFAULT false NOT NULL,
    confirmed_by uuid,
    confirmed_at timestamp with time zone,
    correction_reason text,
    raw_response jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ch_case_diagnosis_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)))
);


--
-- Name: ch_case_followup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_case_followup (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    observed_at timestamp with time zone DEFAULT now() NOT NULL,
    observed_by uuid NOT NULL,
    severity public.ch_severity,
    incidence_pct numeric(5,2),
    trend text,
    notes text,
    CONSTRAINT ch_case_followup_incidence_pct_check CHECK (((incidence_pct >= (0)::numeric) AND (incidence_pct <= (100)::numeric))),
    CONSTRAINT ch_case_followup_trend_check CHECK ((trend = ANY (ARRAY['IMPROVING'::text, 'STABLE'::text, 'WORSENING'::text])))
);


--
-- Name: ch_case_note; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_case_note (
    case_id uuid NOT NULL,
    note_id uuid NOT NULL
);


--
-- Name: ch_case_plant_part; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_case_plant_part (
    case_id uuid NOT NULL,
    plant_part_id uuid NOT NULL
);


--
-- Name: ch_case_symptom; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_case_symptom (
    case_id uuid NOT NULL,
    symptom_id uuid NOT NULL,
    note text
);


--
-- Name: ch_case_treatment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_case_treatment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    control_measure_id uuid,
    task_id uuid,
    input_id uuid,
    recommended_by public.ch_diag_source DEFAULT 'AI'::public.ch_diag_source NOT NULL,
    title text NOT NULL,
    planned_date date,
    applied_date date,
    dose_value numeric(10,3),
    dose_unit_id uuid,
    dose_basis_id uuid,
    application_method_id uuid,
    phi_days integer,
    safe_harvest_date date GENERATED ALWAYS AS ((applied_date + phi_days)) STORED,
    cost numeric(12,2),
    status public.ch_treatment_status DEFAULT 'RECOMMENDED'::public.ch_treatment_status NOT NULL,
    outcome_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ch_control_measure; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_control_measure (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    problem_id uuid NOT NULL,
    crop_id uuid,
    method_type public.ch_control_method NOT NULL,
    title text NOT NULL,
    description text,
    input_id uuid,
    input_name_text text,
    active_ingredient text,
    dose_value numeric(10,3),
    dose_unit_id uuid,
    dose_basis_id uuid,
    application_method_id uuid,
    frequency_text text,
    interval_days integer,
    max_applications integer,
    phi_days integer,
    reentry_hours integer,
    safety_notes text,
    seq integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT ch_control_measure_check CHECK (((method_type <> 'CHEMICAL'::public.ch_control_method) OR (phi_days IS NOT NULL)))
);


--
-- Name: ch_import_batch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_import_batch (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid,
    user_id uuid NOT NULL,
    entity_type text NOT NULL,
    file_name text NOT NULL,
    status text DEFAULT 'UPLOADED'::text NOT NULL,
    total_rows integer DEFAULT 0 NOT NULL,
    success_rows integer DEFAULT 0 NOT NULL,
    failed_rows integer DEFAULT 0 NOT NULL,
    import_mode text DEFAULT 'CREATE_ONLY'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT ch_import_batch_entity_type_check CHECK ((entity_type = ANY (ARRAY['PEST'::text, 'DISEASE'::text, 'DEFICIENCY'::text]))),
    CONSTRAINT ch_import_batch_import_mode_check CHECK ((import_mode = ANY (ARRAY['CREATE_ONLY'::text, 'UPSERT_BY_CODE'::text]))),
    CONSTRAINT ch_import_batch_status_check CHECK ((status = ANY (ARRAY['UPLOADED'::text, 'VALIDATING'::text, 'VALIDATED'::text, 'IMPORTING'::text, 'COMPLETED'::text, 'FAILED'::text])))
);


--
-- Name: ch_import_error; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_import_error (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    sheet text NOT NULL,
    row_no integer NOT NULL,
    column_name text,
    message text NOT NULL
);


--
-- Name: ch_lifecycle_stage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_lifecycle_stage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    problem_id uuid NOT NULL,
    stage_id uuid NOT NULL,
    seq integer NOT NULL,
    duration_days_min integer,
    duration_days_max integer,
    description text
);


--
-- Name: ch_lookup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_lookup (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    list_code text NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    label_i18n jsonb DEFAULT '{}'::jsonb NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    farm_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ch_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_type text NOT NULL,
    owner_id uuid NOT NULL,
    file_id uuid,
    url text NOT NULL,
    thumb_url text,
    image_label_id uuid,
    caption text,
    is_primary boolean DEFAULT false NOT NULL,
    source_credit text,
    width integer,
    height integer,
    checksum text,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ch_media_owner_type_check CHECK ((owner_type = ANY (ARRAY['PROBLEM'::text, 'CASE'::text, 'DIAGNOSIS'::text, 'FOLLOWUP'::text])))
);


--
-- Name: ch_nutrient; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_nutrient (
    code text NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    CONSTRAINT ch_nutrient_category_check CHECK ((category = ANY (ARRAY['MACRONUTRIENT'::text, 'SECONDARY'::text, 'MICRONUTRIENT'::text])))
);


--
-- Name: ch_problem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_problem (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    problem_type public.ch_problem_type NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    local_names jsonb DEFAULT '{}'::jsonb NOT NULL,
    scientific_name text,
    category_id uuid,
    pest_type_id uuid,
    nutrient_code text,
    identification_text text,
    favourable_text text,
    temp_min_c numeric(4,1),
    temp_max_c numeric(4,1),
    humidity_min_pct numeric(4,1),
    humidity_max_pct numeric(4,1),
    rainfall_note text,
    soil_note text,
    peak_occurrence_text text,
    peak_months smallint[],
    development_stage_text text,
    potential_severity public.ch_severity,
    preventive_measures text,
    is_soil_test_required boolean,
    notes text,
    scope public.ch_scope DEFAULT 'FARM'::public.ch_scope NOT NULL,
    farm_id uuid,
    status public.ch_publish_status DEFAULT 'DRAFT'::public.ch_publish_status NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_by uuid NOT NULL,
    verified_by uuid,
    verified_at timestamp with time zone,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT ch_problem_check CHECK (((scope = 'FARM'::public.ch_scope) = (farm_id IS NOT NULL))),
    CONSTRAINT ch_problem_check1 CHECK (((problem_type = 'DEFICIENCY'::public.ch_problem_type) = (nutrient_code IS NOT NULL))),
    CONSTRAINT ch_problem_check2 CHECK (((problem_type = 'PEST'::public.ch_problem_type) OR (pest_type_id IS NULL))),
    CONSTRAINT ch_problem_check3 CHECK (((problem_type = 'DISEASE'::public.ch_problem_type) OR (development_stage_text IS NULL))),
    CONSTRAINT ch_problem_check4 CHECK (((problem_type <> 'DEFICIENCY'::public.ch_problem_type) OR (category_id IS NULL)))
);


--
-- Name: ch_problem_attr; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_problem_attr (
    problem_id uuid NOT NULL,
    lookup_id uuid NOT NULL
);


--
-- Name: ch_problem_crop; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_problem_crop (
    problem_id uuid NOT NULL,
    crop_id uuid NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    susceptible_stage text,
    peak_months smallint[],
    crop_severity public.ch_severity,
    notes text
);


--
-- Name: ch_problem_review; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_problem_review (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    problem_id uuid NOT NULL,
    action text NOT NULL,
    reviewer_id uuid NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ch_problem_review_action_check CHECK ((action = ANY (ARRAY['SUBMIT'::text, 'REQUEST_CHANGES'::text, 'VERIFY'::text, 'PUBLISH'::text, 'REJECT'::text, 'ARCHIVE'::text, 'REOPEN'::text])))
);


--
-- Name: ch_problem_symptom; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_problem_symptom (
    problem_id uuid NOT NULL,
    symptom_id uuid NOT NULL,
    weight numeric(3,2) DEFAULT 1.00 NOT NULL,
    CONSTRAINT ch_problem_symptom_weight_check CHECK (((weight >= (0)::numeric) AND (weight <= (1)::numeric)))
);


--
-- Name: ch_problem_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_problem_version (
    problem_id uuid NOT NULL,
    version integer NOT NULL,
    snapshot jsonb NOT NULL,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ch_resistant_variety; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_resistant_variety (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    problem_id uuid NOT NULL,
    crop_id uuid NOT NULL,
    variety_id uuid NOT NULL,
    resistance public.ch_resistance DEFAULT 'TOLERANT'::public.ch_resistance NOT NULL,
    notes text
);


--
-- Name: ch_risk_rule; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_risk_rule (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    problem_id uuid NOT NULL,
    crop_id uuid,
    conditions jsonb NOT NULL,
    lookback_days integer DEFAULT 7 NOT NULL,
    level public.ch_alert_level DEFAULT 'WATCH'::public.ch_alert_level NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: ch_seq_case; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ch_seq_case
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ch_seq_deficiency; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ch_seq_deficiency
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ch_seq_disease; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ch_seq_disease
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ch_seq_pest; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ch_seq_pest
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ch_symptom; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ch_symptom (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    label text NOT NULL,
    plant_part_id uuid,
    description text,
    applies_to public.ch_problem_type[] DEFAULT '{PEST,DISEASE,DEFICIENCY}'::public.ch_problem_type[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: pih_ai_inferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_ai_inferences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    crop_id uuid,
    state character varying(100),
    district character varying(100),
    season character varying(50),
    inference_type character varying(40) NOT NULL,
    title character varying(255) NOT NULL,
    body text NOT NULL,
    metrics jsonb DEFAULT '{}'::jsonb NOT NULL,
    sample_size integer DEFAULT 0 NOT NULL,
    farm_count integer DEFAULT 0 NOT NULL,
    confidence numeric(5,4) DEFAULT 0.0000 NOT NULL,
    evidence_case_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    model_name character varying(100) NOT NULL,
    model_version character varying(50) NOT NULL,
    ai_request_id uuid,
    status character varying(30) DEFAULT 'preliminary'::character varying NOT NULL,
    reviewed_by uuid,
    sme_annotation text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT pih_ai_inferences_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT pih_ai_inferences_farm_count_check CHECK ((farm_count >= 0)),
    CONSTRAINT pih_ai_inferences_inference_type_check CHECK (((inference_type)::text = ANY ((ARRAY['efficacy'::character varying, 'dose_response'::character varying, 'stage_fit'::character varying, 'adverse_signal'::character varying, 'demand'::character varying, 'improvement'::character varying])::text[]))),
    CONSTRAINT pih_ai_inferences_sample_size_check CHECK ((sample_size >= 0)),
    CONSTRAINT pih_ai_inferences_status_check CHECK (((status)::text = ANY ((ARRAY['preliminary'::character varying, 'pending_review'::character varying, 'published'::character varying, 'suppressed'::character varying])::text[])))
);


--
-- Name: pih_api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_id uuid NOT NULL,
    key_name character varying(100) NOT NULL,
    key_hash character varying(64) NOT NULL,
    key_preview character varying(30) NOT NULL,
    scopes text[] DEFAULT '{}'::text[] NOT NULL,
    expires_at timestamp with time zone,
    last_used_at timestamp with time zone,
    is_revoked boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pih_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_user_id uuid,
    actor_partner_id uuid,
    entity character varying(80) NOT NULL,
    entity_id uuid,
    action character varying(40) NOT NULL,
    before jsonb,
    after jsonb,
    ip character varying(64),
    idempotency_key character varying(120),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pih_cart_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_cart_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cart_id uuid NOT NULL,
    sku_id uuid NOT NULL,
    qty integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    recommendation_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pih_cart_items_qty_check CHECK ((qty > 0)),
    CONSTRAINT pih_cart_items_unit_price_check CHECK ((unit_price > (0)::numeric))
);


--
-- Name: pih_carts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_carts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid NOT NULL,
    user_id uuid NOT NULL,
    partner_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pih_data_sharing_consents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_data_sharing_consents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid NOT NULL,
    granted_by uuid NOT NULL,
    scope character varying(40) NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    withdrawn_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pih_data_sharing_consents_scope_check CHECK (((scope)::text = ANY ((ARRAY['anonymised_outcomes'::character varying, 'trials'::character varying])::text[])))
);


--
-- Name: pih_field_trials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_field_trials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_id uuid NOT NULL,
    product_id uuid NOT NULL,
    farm_id uuid NOT NULL,
    crop_id uuid NOT NULL,
    planting_id uuid,
    treated_area numeric(10,2) NOT NULL,
    control_area numeric(10,2) NOT NULL,
    start_date date NOT NULL,
    end_date date,
    protocol text,
    status character varying(30) DEFAULT 'proposed'::character varying NOT NULL,
    sme_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT pih_field_trials_control_area_check CHECK ((control_area > (0)::numeric)),
    CONSTRAINT pih_field_trials_status_check CHECK (((status)::text = ANY ((ARRAY['proposed'::character varying, 'accepted'::character varying, 'sme_approved'::character varying, 'running'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT pih_field_trials_treated_area_check CHECK ((treated_area > (0)::numeric))
);


--
-- Name: pih_import_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_import_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_id uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    total_rows integer DEFAULT 0 NOT NULL,
    ok_rows integer DEFAULT 0 NOT NULL,
    error_rows integer DEFAULT 0 NOT NULL,
    status character varying(30) DEFAULT 'uploaded'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT pih_import_batches_status_check CHECK (((status)::text = ANY ((ARRAY['uploaded'::character varying, 'validating'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: pih_import_errors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_import_errors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    row_no integer NOT NULL,
    field character varying(100),
    message text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pih_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_type character varying(60) NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying(30) DEFAULT 'queued'::character varying NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    run_after timestamp with time zone DEFAULT now() NOT NULL,
    error text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pih_jobs_status_check CHECK (((status)::text = ANY ((ARRAY['queued'::character varying, 'running'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: pih_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    recipient_user_id uuid,
    partner_id uuid,
    farm_id uuid,
    type character varying(60) NOT NULL,
    title character varying(255) NOT NULL,
    body text,
    link character varying(255),
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pih_order_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_order_status_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    from_status character varying(30),
    to_status character varying(30) NOT NULL,
    changed_by uuid,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pih_partner_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_partner_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_id uuid NOT NULL,
    doc_type character varying(30) NOT NULL,
    doc_number character varying(100) NOT NULL,
    issued_on date,
    expires_on date,
    file_url text NOT NULL,
    review_status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT pih_partner_documents_doc_type_check CHECK (((doc_type)::text = ANY ((ARRAY['FCO'::character varying, 'CIBRC'::character varying, 'SEED_LICENCE'::character varying, 'GST'::character varying, 'ISO'::character varying, 'ORGANIC'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT pih_partner_documents_review_status_check CHECK (((review_status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'expired'::character varying])::text[])))
);


--
-- Name: pih_partner_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_partner_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_id uuid NOT NULL,
    user_id uuid NOT NULL,
    partner_role character varying(30) DEFAULT 'partner_user'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT pih_partner_users_partner_role_check CHECK (((partner_role)::text = ANY ((ARRAY['partner_admin'::character varying, 'partner_user'::character varying])::text[])))
);


--
-- Name: pih_partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_partners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_code character varying(50) NOT NULL,
    legal_name character varying(255) NOT NULL,
    brand_name character varying(255) NOT NULL,
    partner_type character varying(50) NOT NULL,
    gstin character varying(15) NOT NULL,
    pan character varying(10) NOT NULL,
    address text NOT NULL,
    state character varying(100) NOT NULL,
    district character varying(100) NOT NULL,
    pincode character varying(6) NOT NULL,
    phone character varying(10) NOT NULL,
    email character varying(255) NOT NULL,
    website character varying(255),
    logo_url text,
    status character varying(30) DEFAULT 'draft'::character varying NOT NULL,
    status_reason text,
    commission_pct numeric(5,2) DEFAULT 5.00 NOT NULL,
    verified_by uuid,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT pih_partners_commission_pct_check CHECK (((commission_pct >= (0)::numeric) AND (commission_pct <= (100)::numeric))),
    CONSTRAINT pih_partners_gstin_check CHECK (((gstin)::text ~ '^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$'::text)),
    CONSTRAINT pih_partners_pan_check CHECK (((pan)::text ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'::text)),
    CONSTRAINT pih_partners_partner_type_check CHECK (((partner_type)::text = ANY ((ARRAY['SEED'::character varying, 'FERTILISER'::character varying, 'UREA'::character varying, 'NANO_FERTILISER'::character varying, 'BIO_STIMULANT'::character varying, 'MICRONUTRIENT'::character varying, 'CROP_PROTECTION'::character varying, 'ORGANIC_INPUT'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT pih_partners_phone_check CHECK (((phone)::text ~ '^[6-9][0-9]{9}$'::text)),
    CONSTRAINT pih_partners_pincode_check CHECK (((pincode)::text ~ '^[0-9]{6}$'::text)),
    CONSTRAINT pih_partners_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'submitted'::character varying, 'under_review'::character varying, 'approved'::character varying, 'rejected'::character varying, 'suspended'::character varying])::text[])))
);


--
-- Name: pih_product_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_product_claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    problem_id uuid NOT NULL,
    crop_id uuid,
    claim_type character varying(40) NOT NULL,
    evidence_note text,
    sme_status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    sme_by uuid,
    sme_at timestamp with time zone,
    sme_remarks text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT pih_product_claims_claim_type_check CHECK (((claim_type)::text = ANY ((ARRAY['cure'::character varying, 'control'::character varying, 'prevent'::character varying, 'correct_deficiency'::character varying, 'yield_boost'::character varying])::text[]))),
    CONSTRAINT pih_product_claims_sme_status_check CHECK (((sme_status)::text = ANY ((ARRAY['pending'::character varying, 'verified'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: pih_product_composition; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_product_composition (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    component_name character varying(150) NOT NULL,
    nutrient_code text,
    active_ingredient character varying(150),
    value numeric(10,4) NOT NULL,
    unit character varying(30) NOT NULL,
    seq integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT pih_product_composition_unit_check CHECK (((unit)::text = ANY ((ARRAY['% w/w'::character varying, '% w/v'::character varying, 'g/L'::character varying, 'CFU/g'::character varying, 'ppm'::character varying, 'IU/mg'::character varying])::text[]))),
    CONSTRAINT pih_product_composition_value_check CHECK ((value > (0)::numeric))
);


--
-- Name: pih_product_crop_suitability; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_product_crop_suitability (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    crop_id uuid NOT NULL,
    variety_id uuid,
    crop_stage character varying(100) DEFAULT 'All Stages'::character varying NOT NULL,
    dose_value numeric(10,3) NOT NULL,
    dose_min numeric(10,3),
    dose_max numeric(10,3),
    dose_unit character varying(30) NOT NULL,
    dose_basis character varying(40) NOT NULL,
    application_method character varying(100),
    timing_text text,
    interval_days integer,
    max_applications integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT pih_product_crop_suitability_dose_basis_check CHECK (((dose_basis)::text = ANY ((ARRAY['per acre'::character varying, 'per litre'::character varying, 'per kg seed'::character varying, 'per hectare'::character varying, 'per plant'::character varying])::text[]))),
    CONSTRAINT pih_product_crop_suitability_dose_value_check CHECK ((dose_value > (0)::numeric)),
    CONSTRAINT pih_product_crop_suitability_interval_days_check CHECK (((interval_days IS NULL) OR (interval_days >= 0))),
    CONSTRAINT pih_product_crop_suitability_max_applications_check CHECK (((max_applications IS NULL) OR (max_applications > 0)))
);


--
-- Name: pih_product_media; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_product_media (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    media_type character varying(30) NOT NULL,
    url text NOT NULL,
    caption character varying(255),
    seq integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT pih_product_media_media_type_check CHECK (((media_type)::text = ANY ((ARRAY['image'::character varying, 'video'::character varying, 'leaflet'::character varying, 'label'::character varying])::text[])))
);


--
-- Name: pih_product_ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_product_ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    crop_id uuid,
    fps numeric(4,2) DEFAULT 0.00 NOT NULL,
    raw_score numeric(4,2) DEFAULT 0.00 NOT NULL,
    verified_count integer DEFAULT 0 NOT NULL,
    farm_count integer DEFAULT 0 NOT NULL,
    efficacy_rate numeric(5,2) DEFAULT 0.00,
    avg_severity_reduction numeric(5,2) DEFAULT 0.00,
    yield_uplift_pct numeric(6,2) DEFAULT 0.00,
    avg_farmer_rating numeric(4,2) DEFAULT 0.00,
    safety_penalty numeric(4,2) DEFAULT 0.00 NOT NULL,
    badge character varying(30) DEFAULT 'needs_data'::character varying NOT NULL,
    computed_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pih_product_ratings_badge_check CHECK (((badge)::text = ANY ((ARRAY['field_proven'::character varying, 'rising'::character varying, 'needs_data'::character varying, 'standard'::character varying])::text[]))),
    CONSTRAINT pih_product_ratings_farm_count_check CHECK ((farm_count >= 0)),
    CONSTRAINT pih_product_ratings_fps_check CHECK (((fps >= (0)::numeric) AND (fps <= (5)::numeric))),
    CONSTRAINT pih_product_ratings_raw_score_check CHECK (((raw_score >= (0)::numeric) AND (raw_score <= (5)::numeric))),
    CONSTRAINT pih_product_ratings_safety_penalty_check CHECK (((safety_penalty >= (0)::numeric) AND (safety_penalty <= (1)::numeric))),
    CONSTRAINT pih_product_ratings_verified_count_check CHECK ((verified_count >= 0))
);


--
-- Name: pih_product_skus; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_product_skus (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    sku_code character varying(100) NOT NULL,
    pack_size numeric(10,3) NOT NULL,
    pack_unit character varying(30) NOT NULL,
    mrp numeric(12,2) NOT NULL,
    selling_price numeric(12,2) NOT NULL,
    stock_qty integer DEFAULT 0 NOT NULL,
    region_stock jsonb DEFAULT '{}'::jsonb NOT NULL,
    batch_no character varying(80),
    mfg_date date,
    expiry_date date,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT pih_product_skus_check CHECK (((selling_price > (0)::numeric) AND (mrp >= selling_price))),
    CONSTRAINT pih_product_skus_mrp_check CHECK ((mrp > (0)::numeric)),
    CONSTRAINT pih_product_skus_pack_size_check CHECK ((pack_size > (0)::numeric)),
    CONSTRAINT pih_product_skus_pack_unit_check CHECK (((pack_unit)::text = ANY ((ARRAY['g'::character varying, 'kg'::character varying, 'ml'::character varying, 'L'::character varying, 'packet'::character varying, 'bag'::character varying, 'bottle'::character varying, 'drum'::character varying, 'unit'::character varying])::text[]))),
    CONSTRAINT pih_product_skus_stock_qty_check CHECK ((stock_qty >= 0))
);


--
-- Name: pih_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_id uuid NOT NULL,
    product_code character varying(80) NOT NULL,
    name character varying(255) NOT NULL,
    brand character varying(150) NOT NULL,
    product_type character varying(50) NOT NULL,
    sub_type character varying(100),
    formulation character varying(100),
    registration_no character varying(100),
    hsn_code character varying(8) NOT NULL,
    gst_pct numeric(5,2) DEFAULT 5.00 NOT NULL,
    is_organic boolean DEFAULT false NOT NULL,
    shelf_life_months integer,
    storage_instructions text,
    safety_precautions text,
    phi_days integer DEFAULT 0 NOT NULL,
    reentry_hours integer DEFAULT 0 NOT NULL,
    description text,
    how_it_works text,
    local_names jsonb DEFAULT '{}'::jsonb NOT NULL,
    label_pdf_url text,
    status character varying(30) DEFAULT 'draft'::character varying NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT pih_products_gst_pct_check CHECK ((gst_pct = ANY (ARRAY[(0)::numeric, (5)::numeric, (12)::numeric, (18)::numeric, (28)::numeric]))),
    CONSTRAINT pih_products_hsn_code_check CHECK (((hsn_code)::text ~ '^([0-9]{4}|[0-9]{6}|[0-9]{8})$'::text)),
    CONSTRAINT pih_products_phi_days_check CHECK ((phi_days >= 0)),
    CONSTRAINT pih_products_product_type_check CHECK (((product_type)::text = ANY ((ARRAY['SEED'::character varying, 'FERTILISER'::character varying, 'UREA'::character varying, 'NANO_FERTILISER'::character varying, 'BIO_STIMULANT'::character varying, 'MICRONUTRIENT'::character varying, 'CROP_PROTECTION'::character varying, 'ORGANIC_INPUT'::character varying, 'OTHER'::character varying])::text[]))),
    CONSTRAINT pih_products_reentry_hours_check CHECK ((reentry_hours >= 0)),
    CONSTRAINT pih_products_shelf_life_months_check CHECK (((shelf_life_months IS NULL) OR (shelf_life_months > 0))),
    CONSTRAINT pih_products_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'submitted'::character varying, 'approved'::character varying, 'live'::character varying, 'paused'::character varying, 'delisted'::character varying])::text[])))
);


--
-- Name: pih_recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid NOT NULL,
    case_id uuid,
    alert_id uuid,
    soil_test_id uuid,
    problem_id uuid,
    crop_id uuid,
    product_id uuid NOT NULL,
    sku_id uuid,
    rank integer DEFAULT 1 NOT NULL,
    score numeric(5,2) DEFAULT 0.00 NOT NULL,
    reason jsonb DEFAULT '{}'::jsonb NOT NULL,
    dose_for_area numeric(10,3),
    est_cost numeric(12,2),
    safe_harvest_date date,
    status character varying(30) DEFAULT 'shown'::character varying NOT NULL,
    dismiss_reason text,
    ai_request_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT pih_recommendations_rank_check CHECK (((rank >= 1) AND (rank <= 10))),
    CONSTRAINT pih_recommendations_status_check CHECK (((status)::text = ANY ((ARRAY['shown'::character varying, 'bought'::character varying, 'added_to_list'::character varying, 'task_created'::character varying, 'dismissed'::character varying])::text[])))
);


--
-- Name: pih_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    farm_id uuid NOT NULL,
    user_id uuid NOT NULL,
    outcome_id uuid,
    rating smallint NOT NULL,
    title character varying(200),
    body text NOT NULL,
    partner_reply text,
    partner_replied_at timestamp with time zone,
    is_flagged boolean DEFAULT false NOT NULL,
    moderation_status character varying(30) DEFAULT 'published'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT pih_reviews_body_check CHECK ((char_length(body) >= 20)),
    CONSTRAINT pih_reviews_moderation_status_check CHECK (((moderation_status)::text = ANY ((ARRAY['published'::character varying, 'pending'::character varying, 'hidden'::character varying])::text[]))),
    CONSTRAINT pih_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: pih_settlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_settlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_id uuid NOT NULL,
    period_start date NOT NULL,
    period_end date NOT NULL,
    gross numeric(14,2) DEFAULT 0.00 NOT NULL,
    commission numeric(14,2) DEFAULT 0.00 NOT NULL,
    net_payable numeric(14,2) DEFAULT 0.00 NOT NULL,
    status character varying(30) DEFAULT 'draft'::character varying NOT NULL,
    statement_url text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pih_settlements_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'issued'::character varying, 'paid'::character varying])::text[])))
);


--
-- Name: pih_store_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_store_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    sku_id uuid NOT NULL,
    qty integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    gst_pct numeric(5,2) DEFAULT 5.00 NOT NULL,
    line_total numeric(12,2) NOT NULL,
    commission_pct numeric(5,2) DEFAULT 5.00 NOT NULL,
    commission_amount numeric(12,2) DEFAULT 0.00 NOT NULL,
    batch_no character varying(100),
    expiry_date date,
    inputs_lot_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pih_store_order_items_qty_check CHECK ((qty > 0)),
    CONSTRAINT pih_store_order_items_unit_price_check CHECK ((unit_price > (0)::numeric))
);


--
-- Name: pih_store_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_store_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_no character varying(50) NOT NULL,
    farm_id uuid NOT NULL,
    partner_id uuid NOT NULL,
    user_id uuid NOT NULL,
    purchase_order_id integer,
    vendor_id uuid,
    subtotal numeric(12,2) DEFAULT 0.00 NOT NULL,
    gst_amount numeric(12,2) DEFAULT 0.00 NOT NULL,
    shipping numeric(12,2) DEFAULT 0.00 NOT NULL,
    total numeric(12,2) DEFAULT 0.00 NOT NULL,
    payment_mode character varying(30) DEFAULT 'online'::character varying NOT NULL,
    payment_status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    status character varying(30) DEFAULT 'placed'::character varying NOT NULL,
    delivery_address jsonb DEFAULT '{}'::jsonb NOT NULL,
    tracking_no character varying(100),
    invoice_no character varying(100),
    invoice_url text,
    cancelled_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT pih_store_orders_payment_mode_check CHECK (((payment_mode)::text = ANY ((ARRAY['online'::character varying, 'cod'::character varying, 'credit'::character varying])::text[]))),
    CONSTRAINT pih_store_orders_payment_status_check CHECK (((payment_status)::text = ANY ((ARRAY['pending'::character varying, 'paid'::character varying, 'failed'::character varying, 'refunded'::character varying])::text[]))),
    CONSTRAINT pih_store_orders_status_check CHECK (((status)::text = ANY ((ARRAY['placed'::character varying, 'accepted'::character varying, 'packed'::character varying, 'shipped'::character varying, 'delivered'::character varying, 'received'::character varying, 'cancelled'::character varying, 'returned'::character varying])::text[])))
);


--
-- Name: pih_stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_stores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_id uuid NOT NULL,
    store_name character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    banner_url text,
    about text,
    service_states text[] DEFAULT '{}'::text[] NOT NULL,
    service_districts text[] DEFAULT '{}'::text[] NOT NULL,
    support_phone character varying(20),
    support_email character varying(255),
    return_policy text,
    min_order_value numeric(12,2) DEFAULT 0.00 NOT NULL,
    cod_enabled boolean DEFAULT true NOT NULL,
    credit_enabled boolean DEFAULT false NOT NULL,
    is_live boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT pih_stores_min_order_value_check CHECK ((min_order_value >= (0)::numeric))
);


--
-- Name: pih_sync_state; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_sync_state (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_table character varying(80) NOT NULL,
    last_cursor text,
    last_run_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pih_treatment_outcomes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_treatment_outcomes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid NOT NULL,
    case_treatment_id uuid,
    case_id uuid,
    product_id uuid NOT NULL,
    sku_id uuid,
    lot_id uuid,
    crop_id uuid,
    planting_id uuid,
    district character varying(100),
    state character varying(100),
    applied_on date NOT NULL,
    dose_value numeric(10,3),
    dose_unit character varying(30),
    area_treated numeric(10,2),
    severity_before character varying(30),
    severity_after character varying(30),
    incidence_before numeric(5,2),
    incidence_after numeric(5,2),
    days_to_effect integer,
    resolved character varying(20),
    yield_actual numeric(12,2),
    yield_expected numeric(12,2),
    side_effects text,
    farmer_rating smallint,
    farmer_comment text,
    photos jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    source character varying(30) DEFAULT 'farmer_form'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT pih_treatment_outcomes_days_to_effect_check CHECK (((days_to_effect IS NULL) OR (days_to_effect >= 0))),
    CONSTRAINT pih_treatment_outcomes_farmer_rating_check CHECK (((farmer_rating IS NULL) OR ((farmer_rating >= 1) AND (farmer_rating <= 5)))),
    CONSTRAINT pih_treatment_outcomes_incidence_after_check CHECK (((incidence_after IS NULL) OR ((incidence_after >= (0)::numeric) AND (incidence_after <= (100)::numeric)))),
    CONSTRAINT pih_treatment_outcomes_incidence_before_check CHECK (((incidence_before IS NULL) OR ((incidence_before >= (0)::numeric) AND (incidence_before <= (100)::numeric)))),
    CONSTRAINT pih_treatment_outcomes_resolved_check CHECK (((resolved IS NULL) OR ((resolved)::text = ANY ((ARRAY['yes'::character varying, 'partly'::character varying, 'no'::character varying])::text[])))),
    CONSTRAINT pih_treatment_outcomes_severity_after_check CHECK (((severity_after IS NULL) OR ((severity_after)::text = ANY ((ARRAY['LOW'::character varying, 'MODERATE'::character varying, 'HIGH'::character varying, 'SEVERE'::character varying])::text[])))),
    CONSTRAINT pih_treatment_outcomes_severity_before_check CHECK (((severity_before IS NULL) OR ((severity_before)::text = ANY ((ARRAY['LOW'::character varying, 'MODERATE'::character varying, 'HIGH'::character varying, 'SEVERE'::character varying])::text[])))),
    CONSTRAINT pih_treatment_outcomes_source_check CHECK (((source)::text = ANY ((ARRAY['crop_health_sync'::character varying, 'farmer_form'::character varying, 'trial'::character varying])::text[])))
);


--
-- Name: pih_trial_observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_trial_observations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trial_id uuid NOT NULL,
    observed_on date DEFAULT CURRENT_DATE NOT NULL,
    plot character varying(20) NOT NULL,
    metric character varying(100) NOT NULL,
    value numeric(12,3) NOT NULL,
    unit character varying(40),
    photo_url text,
    observed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pih_trial_observations_plot_check CHECK (((plot)::text = ANY ((ARRAY['treated'::character varying, 'control'::character varying])::text[])))
);


--
-- Name: pih_webhook_deliveries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_webhook_deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    webhook_id uuid NOT NULL,
    event character varying(60) NOT NULL,
    payload jsonb NOT NULL,
    attempt integer DEFAULT 1 NOT NULL,
    response_code integer,
    next_retry_at timestamp with time zone,
    status character varying(30) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT pih_webhook_deliveries_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'delivered'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: pih_webhooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pih_webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_id uuid NOT NULL,
    endpoint_url text NOT NULL,
    secret character varying(255) NOT NULL,
    events text[] DEFAULT '{}'::text[] NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: v_ch_training_set; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_ch_training_set AS
 SELECT c.id AS case_id,
    c.crop_id,
    c.variety_id,
    c.crop_stage,
    c.confirmed_problem_id,
    p.problem_type,
    p.name AS problem_name,
    ( SELECT count(*) AS count
           FROM public.ch_media m
          WHERE ((m.owner_type = 'CASE'::text) AND (m.owner_id = c.id))) AS image_count,
    c.weather_snapshot,
    c.observed_at
   FROM (public.ch_case c
     JOIN public.ch_problem p ON ((p.id = c.confirmed_problem_id)))
  WHERE ((c.deleted_at IS NULL) AND (EXISTS ( SELECT 1
           FROM public.ch_case_diagnosis d
          WHERE ((d.case_id = c.id) AND d.is_confirmed AND (d.source = 'AGRONOMIST'::public.ch_diag_source)))));


--
-- Name: vivas_account_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_account_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    plan_tier character varying(50) DEFAULT 'free'::character varying,
    plan_name character varying(100) DEFAULT 'Free Monthly'::character varying,
    billing_cycle character varying(20) DEFAULT 'monthly'::character varying,
    plan_price numeric(10,2) DEFAULT 0.00,
    currency character varying(10) DEFAULT 'USD'::character varying,
    max_users integer DEFAULT 1,
    base_ai_credits integer DEFAULT 25,
    base_storage_mb numeric(12,2) DEFAULT 500.00,
    data_retention_years integer DEFAULT 3,
    status character varying(50) DEFAULT 'active'::character varying,
    current_period_start timestamp with time zone DEFAULT now(),
    current_period_end timestamp with time zone DEFAULT (now() + '1 mon'::interval),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_accounting_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_accounting_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_name character varying(150) NOT NULL,
    type character varying(50) NOT NULL,
    accounting_code character varying(50) NOT NULL,
    detail_category character varying(150),
    description text,
    tax_line character varying(150),
    is_tax_deductible boolean DEFAULT true,
    parent_id uuid,
    is_default boolean DEFAULT false,
    status character varying(30) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_ai_credit_purchases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_ai_credit_purchases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    package_name character varying(100) NOT NULL,
    credits_amount integer NOT NULL,
    amount_paid numeric(10,2) NOT NULL,
    currency character varying(10) DEFAULT 'USD'::character varying,
    payment_method character varying(100) DEFAULT 'Credit Card (Visa •••• 4242)'::character varying,
    status character varying(50) DEFAULT 'completed'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_ai_credits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_ai_credits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    monthly_credits_total integer DEFAULT 25,
    monthly_credits_remaining integer DEFAULT 25,
    addon_credits_total integer DEFAULT 0,
    addon_credits_remaining integer DEFAULT 0,
    credits_used integer DEFAULT 0,
    cycle_reset_date date DEFAULT (CURRENT_DATE + '1 mon'::interval),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_billing_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_billing_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    invoice_number character varying(100) NOT NULL,
    description character varying(255) NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(10) DEFAULT 'USD'::character varying,
    status character varying(50) DEFAULT 'Paid'::character varying,
    invoice_date date DEFAULT CURRENT_DATE NOT NULL,
    payment_method character varying(100) DEFAULT 'Visa ending in 4242'::character varying,
    pdf_url text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_completed_tasks_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_completed_tasks_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    crop_category character varying(100),
    crop character varying(100),
    location character varying(150),
    author_name character varying(150) NOT NULL,
    note_year integer DEFAULT 2026,
    hours_spent numeric(5,2),
    content text,
    created_at timestamp with time zone DEFAULT now(),
    task_type character varying(100) DEFAULT 'greenhouse_sow'::character varying,
    status character varying(50) DEFAULT 'Not Started'::character varying,
    priority character varying(50) DEFAULT 'Medium'::character varying,
    due_date date DEFAULT CURRENT_DATE,
    start_time character varying(20) DEFAULT '09:00 AM'::character varying,
    end_time character varying(20) DEFAULT '05:00 PM'::character varying,
    assignee character varying(150),
    checklist jsonb DEFAULT '[]'::jsonb,
    instructions text,
    tags character varying(255) DEFAULT ''::character varying,
    planting character varying(255),
    equipment jsonb DEFAULT '[]'::jsonb,
    inputs jsonb DEFAULT '[]'::jsonb,
    estimated_labor numeric(5,2),
    actual_labor character varying(50) DEFAULT '0h 00m'::character varying,
    external_links jsonb DEFAULT '[]'::jsonb
);


--
-- Name: vivas_contact_communications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_contact_communications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contact_type character varying(20) NOT NULL,
    contact_id uuid NOT NULL,
    contact_name character varying(150) NOT NULL,
    communication_type character varying(50) DEFAULT 'Email'::character varying,
    subject character varying(255) NOT NULL,
    notes text,
    logged_by character varying(100) DEFAULT 'Farm Manager'::character varying,
    logged_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_containers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_containers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    abbreviation character varying(50),
    types jsonb DEFAULT '["Grow"]'::jsonb,
    material character varying(100) DEFAULT 'Heavy-Duty Polypropylene'::character varying,
    brand character varying(100) DEFAULT 'Bootstrap Farmer'::character varying,
    color character varying(50) DEFAULT 'Black'::character varying,
    total_count integer DEFAULT 100,
    is_serialized boolean DEFAULT false,
    barcode character varying(100),
    storage_location character varying(150) DEFAULT 'Greenhouse Storage Bay A'::character varying,
    shape character varying(50) DEFAULT 'Flat Tray'::character varying,
    top_diameter_cm numeric(6,2) DEFAULT 0.00,
    bottom_diameter_cm numeric(6,2) DEFAULT 0.00,
    height_cm numeric(6,2) DEFAULT 6.50,
    volume_liters numeric(8,2) DEFAULT 3.20,
    total_cells integer DEFAULT 72,
    cell_configuration character varying(50) DEFAULT '12x6 Grid'::character varying,
    cell_shape character varying(50) DEFAULT 'Square'::character varying,
    status character varying(30) DEFAULT 'active'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_crop_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_crop_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    icon character varying(50) DEFAULT '🌱'::character varying,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_crop_field_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_crop_field_tasks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    template_id uuid,
    task_name character varying(150) NOT NULL,
    task_category character varying(100) DEFAULT 'Transplanting'::character varying,
    offset_days integer NOT NULL,
    est_labor_hours numeric(6,2) DEFAULT 1.0,
    assigned_role character varying(100) DEFAULT 'Field Hand'::character varying,
    instructions text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_crop_nursery_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_crop_nursery_tasks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    template_id uuid,
    task_name character varying(150) NOT NULL,
    task_category character varying(100) DEFAULT 'Seeding'::character varying,
    offset_days integer NOT NULL,
    est_labor_hours numeric(6,2) DEFAULT 0.5,
    assigned_role character varying(100) DEFAULT 'Nursery Tech'::character varying,
    instructions text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_crop_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_crop_templates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    crop_id uuid,
    variety_id uuid,
    harvest_stage_id integer,
    supplier_id integer,
    template_name character varying(200) NOT NULL,
    soil_ph_min numeric(4,2) DEFAULT 6.0,
    soil_ph_max numeric(4,2) DEFAULT 6.8,
    frost_tolerance character varying(50) DEFAULT 'Tender'::character varying,
    light_requirement character varying(50) DEFAULT 'Full Sun'::character varying,
    seasonality character varying(50) DEFAULT 'Warm Season'::character varying,
    planting_method text DEFAULT 'Transplant'::character varying,
    tray_size character varying(50) DEFAULT '72-cell'::character varying,
    seeds_per_cell integer DEFAULT 1,
    days_in_nursery integer DEFAULT 28,
    hardening_off_days integer DEFAULT 5,
    germination_temp_f character varying(50) DEFAULT '65-75°F'::character varying,
    days_to_germination integer DEFAULT 7,
    nursery_target_stage_temp_f character varying(50) DEFAULT '70°F'::character varying,
    target_germination_rate_pct numeric(5,2) DEFAULT 90.00,
    bed_width_in numeric(6,2) DEFAULT 30.0,
    bed_length_ft numeric(6,2) DEFAULT 100.0,
    rows_per_bed integer DEFAULT 2,
    in_row_spacing_in numeric(6,2) DEFAULT 12.0,
    row_spacing_in numeric(6,2) DEFAULT 18.0,
    planting_depth_in numeric(6,2) DEFAULT 0.25,
    days_to_maturity integer DEFAULT 65,
    target_plants_per_100ft integer DEFAULT 200,
    expected_yield_per_ft numeric(10,2) DEFAULT 1.5,
    yield_unit character varying(50) DEFAULT 'kg'::character varying,
    default_price_per_unit numeric(10,2) DEFAULT 50.00,
    harvest_window_days integer DEFAULT 21,
    est_revenue_per_100ft_bed numeric(12,2) DEFAULT 15000.00,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    seeds_per_oz numeric(10,2) DEFAULT 1000.00,
    seeds_per_gram numeric(10,2) DEFAULT 35.00,
    seed_viability_years integer DEFAULT 3,
    seed_type character varying(50) DEFAULT 'Raw'::character varying,
    seed_size character varying(50) DEFAULT 'Medium'::character varying,
    growth_habit character varying(50) DEFAULT 'Determinate'::character varying,
    plant_height_in numeric(6,2) DEFAULT 36.0,
    plant_spread_in numeric(6,2) DEFAULT 24.0,
    crop_lifecycle character varying(50) DEFAULT 'Annual'::character varying,
    harvest_part character varying(50) DEFAULT 'Fruit'::character varying,
    harvest_method character varying(50) DEFAULT 'Continuous Pick'::character varying,
    water_needs character varying(50) DEFAULT 'Moderate (1-1.5 in/wk)'::character varying,
    ideal_temp_f character varying(50) DEFAULT '65-85°F'::character varying,
    soil_type character varying(100) DEFAULT 'Well-drained Loam'::character varying,
    nutrient_demand character varying(100) DEFAULT 'Heavy Feeder'::character varying,
    companion_plants text DEFAULT 'Basil, Marigolds, Carrots'::text,
    incompatible_plants text DEFAULT 'Fennel, Potatoes, Brassicas'::text,
    common_pests text DEFAULT 'Aphids, Hornworms, Flea Beetles'::text,
    disease_resistance character varying(150) DEFAULT 'V, F, N, T'::character varying,
    nursery_notes text,
    field_notes text,
    harvest_notes text,
    specialised_plant_part character varying(255),
    crop_type character varying(50) DEFAULT 'Annual'::character varying,
    image_url text,
    description text,
    spacing_unit character varying(20) DEFAULT 'mtr'::character varying,
    expected_yield_per_acre numeric(10,2)
);


--
-- Name: vivas_crop_varieties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_crop_varieties (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    crop_id uuid NOT NULL,
    variety_name character varying(150) NOT NULL,
    supplier character varying(150),
    days_to_maturity integer DEFAULT 60,
    days_to_germination integer DEFAULT 7,
    harvest_stage character varying(50) DEFAULT 'Mature'::character varying,
    planting_method text DEFAULT 'Transplant'::character varying,
    in_row_spacing_in numeric(6,2) DEFAULT 12.0,
    row_spacing_in numeric(6,2) DEFAULT 18.0,
    rows_per_bed integer DEFAULT 2,
    expected_yield_per_ft numeric(8,2) DEFAULT 1.5,
    yield_unit character varying(30) DEFAULT 'kg'::character varying,
    default_price_per_unit numeric(10,2) DEFAULT 50.00,
    seeds_per_oz_gram numeric(10,2),
    tray_size character varying(50) DEFAULT '72-cell'::character varying,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    description text,
    spacing_unit character varying(20) DEFAULT 'mtr'::character varying,
    expected_yield_per_acre numeric(10,2)
);


--
-- Name: vivas_crop_yields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_crop_yields (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    crop_name character varying(100) NOT NULL,
    estimated_value numeric(12,2) DEFAULT 0.00,
    actual_value numeric(12,2) DEFAULT 0.00,
    harvest_date date NOT NULL
);


--
-- Name: vivas_crops; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_crops (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    custom_name character varying(150),
    abbreviation character varying(20),
    crop_family character varying(100),
    genus character varying(100),
    species character varying(100),
    category character varying(50) DEFAULT 'Vegetables'::character varying,
    image_url character varying(255),
    icon character varying(20) DEFAULT '🌱'::character varying,
    color character varying(20) DEFAULT '#2e7d32'::character varying,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    scientific_name character varying(255),
    category_id uuid,
    specialised_plant_part character varying(255),
    crop_type character varying(50) DEFAULT 'Annual'::character varying
);


--
-- Name: vivas_customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    company_name character varying(150),
    customer_type character varying(50) DEFAULT 'Wholesale'::character varying,
    email character varying(150),
    phone character varying(50),
    billing_address text,
    shipping_address text,
    default_channel_id uuid,
    payment_terms character varying(50) DEFAULT 'Net 30'::character varying,
    tax_exempt boolean DEFAULT false,
    notes text,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    first_name character varying(100),
    last_name character varying(100),
    restaurant_venue character varying(150),
    alternate_phone character varying(50),
    contact_role character varying(100) DEFAULT 'Buyer / Owner'::character varying,
    street_address text,
    unit_suite character varying(100),
    city character varying(100),
    state character varying(100),
    country character varying(100) DEFAULT 'India'::character varying,
    postal_code character varying(30),
    gps_lat numeric(10,7),
    gps_lng numeric(10,7),
    default_channel_name character varying(100),
    offer_sheets text[] DEFAULT ARRAY['Weekly Harvest Wholesale Sheet'::text],
    tags text[] DEFAULT ARRAY['Active Buyer'::text],
    tax_id character varying(50),
    credit_limit numeric(12,2) DEFAULT 50000.00,
    discount_percentage numeric(5,2) DEFAULT 0.00,
    total_orders_count integer DEFAULT 0,
    lifetime_sales numeric(12,2) DEFAULT 0.00,
    current_balance numeric(12,2) DEFAULT 0.00
);


--
-- Name: vivas_equipment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_equipment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    model_number character varying(100),
    brand character varying(100),
    category character varying(100) NOT NULL,
    serial_number character varying(100),
    asset_tag character varying(50),
    purchase_date date,
    purchase_price numeric(12,2) DEFAULT 0.00,
    current_status character varying(50) DEFAULT 'active'::character varying,
    location character varying(150) DEFAULT 'Main Tool Barn'::character varying,
    assigned_crew character varying(150) DEFAULT 'Field Operations Crew'::character varying,
    operating_hours numeric(8,2) DEFAULT 0.00,
    service_interval_hours integer DEFAULT 100,
    last_service_date date,
    next_service_date date,
    warranty_expiry date,
    specifications jsonb DEFAULT '{}'::jsonb,
    manual_url text,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_equipment_maintenance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_equipment_maintenance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    equipment_id uuid,
    service_date date NOT NULL,
    service_type character varying(100) NOT NULL,
    performed_by character varying(150) NOT NULL,
    cost numeric(10,2) DEFAULT 0.00,
    hours_at_service numeric(8,2) DEFAULT 0.00,
    parts_replaced text,
    notes text,
    next_due_date date,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    crop_category character varying(100),
    crop character varying(100),
    location character varying(150),
    author_name character varying(150) NOT NULL,
    note_year integer DEFAULT 2026,
    amount numeric(12,2) DEFAULT 0.00,
    content text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_farm_map_beds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_farm_map_beds (
    id integer NOT NULL,
    map_item_id integer,
    bed_number integer,
    bed_name character varying(100),
    width_ft numeric(8,2),
    length_ft numeric(8,2),
    current_crop character varying(150),
    status character varying(30) DEFAULT 'empty'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    geojson jsonb,
    area_sqft numeric(10,2)
);


--
-- Name: vivas_farm_map_beds_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vivas_farm_map_beds_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vivas_farm_map_beds_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vivas_farm_map_beds_id_seq OWNED BY public.vivas_farm_map_beds.id;


--
-- Name: vivas_farm_map_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_farm_map_items (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    item_type character varying(50) NOT NULL,
    shape character varying(30) DEFAULT 'marker'::character varying,
    color character varying(20) DEFAULT '#2e7d32'::character varying,
    description text,
    gps_lat numeric(11,8),
    gps_lng numeric(11,8),
    width_ft numeric(10,2),
    length_ft numeric(10,2),
    area_sqft numeric(14,2),
    beds_count integer DEFAULT 0,
    bed_width_ft numeric(8,2),
    bed_length_ft numeric(8,2),
    bed_spacing_ft numeric(8,2),
    field_type character varying(50),
    irrigation_type character varying(50),
    crop_zone character varying(100),
    notes text,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    location_level character varying(30) DEFAULT 'field'::character varying,
    location_type character varying(50),
    code character varying(50),
    geojson jsonb,
    orientation_deg numeric(5,2) DEFAULT 0,
    usable_area_sqft numeric(12,2),
    soil_type character varying(100)
);


--
-- Name: vivas_farm_map_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vivas_farm_map_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vivas_farm_map_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vivas_farm_map_items_id_seq OWNED BY public.vivas_farm_map_items.id;


--
-- Name: vivas_farm_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_farm_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_name character varying(255) NOT NULL,
    task_type character varying(50) NOT NULL,
    status character varying(30) DEFAULT 'incomplete'::character varying,
    due_date date NOT NULL,
    assigned_to character varying(150),
    planting_type text,
    crop character varying(100),
    variety character varying(100),
    harvest_stage character varying(100),
    location_type character varying(100),
    location character varying(150),
    priority character varying(50) DEFAULT 'Medium'::character varying,
    tag character varying(100),
    planting_id character varying(50),
    equipment character varying(100),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_farms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_farms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    owner_id uuid,
    farm_name character varying(255) NOT NULL,
    legal_name character varying(255),
    location_address text,
    city character varying(100) DEFAULT 'Bangalore'::character varying,
    state_country character varying(100) DEFAULT 'Karnataka, India'::character varying,
    total_area_acres numeric(10,2) DEFAULT 25.0,
    farm_type character varying(100) DEFAULT 'Organic Vegetable & Herb Farm'::character varying,
    weather_summary character varying(100) DEFAULT '78°F Sunny'::character varying,
    logo_url character varying(255),
    is_active boolean DEFAULT true,
    last_accessed_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_file_storage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_file_storage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    farm_id uuid,
    file_name character varying(255) NOT NULL,
    original_name character varying(255) NOT NULL,
    file_path text NOT NULL,
    file_url text,
    mime_type character varying(100),
    file_size_bytes bigint NOT NULL,
    category character varying(100) DEFAULT 'General'::character varying,
    notes text,
    uploaded_by character varying(255) DEFAULT 'Gopikrishna Santhanam'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_financial_budgets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_financial_budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid,
    fiscal_year integer DEFAULT 2026 NOT NULL,
    period_type character varying(20) DEFAULT 'Annual'::character varying,
    period_value character varying(20) DEFAULT '2026'::character varying,
    budgeted_amount numeric(12,2) DEFAULT 0.00 NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_financial_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_financial_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_code character varying(50) NOT NULL,
    transaction_date date DEFAULT CURRENT_DATE NOT NULL,
    type character varying(30) NOT NULL,
    category_id uuid,
    category_name character varying(150) NOT NULL,
    category_type character varying(50) NOT NULL,
    description text NOT NULL,
    amount numeric(12,2) NOT NULL,
    currency character varying(10) DEFAULT 'INR'::character varying,
    payment_method character varying(50) DEFAULT 'Bank Transfer'::character varying,
    party_name character varying(150),
    party_type character varying(50) DEFAULT 'Other'::character varying,
    invoice_receipt_ref character varying(100),
    payment_status character varying(30) DEFAULT 'Completed'::character varying,
    crop_id uuid,
    crop_name character varying(100),
    sales_channel_id uuid,
    sales_channel_name character varying(100),
    order_id uuid,
    order_code character varying(50),
    input_item_id uuid,
    equipment_id uuid,
    labor_timesheet_id uuid,
    tax_rate_pct numeric(5,2) DEFAULT 0.00,
    tax_amount numeric(10,2) DEFAULT 0.00,
    is_reconciled boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    vendor_id uuid
);


--
-- Name: vivas_greenhouse_sows; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_greenhouse_sows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    greenhouse character varying(150) NOT NULL,
    crop_name character varying(100) NOT NULL,
    tray_count integer NOT NULL,
    sow_date date NOT NULL
);


--
-- Name: vivas_harvest_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_harvest_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    planting_id uuid,
    crop_name character varying(150) NOT NULL,
    variety_name character varying(150),
    harvest_stage character varying(50) DEFAULT 'Mature'::character varying,
    harvest_date date NOT NULL,
    location_name character varying(150),
    bed_names character varying(255),
    in_storage_qty numeric(10,2) DEFAULT 0.0,
    current_yield_est numeric(10,2) DEFAULT 0.0,
    total_available_qty numeric(10,2) DEFAULT 0.0,
    pending_orders_qty numeric(10,2) DEFAULT 0.0,
    planned_qty numeric(10,2) DEFAULT 0.0 NOT NULL,
    unit character varying(30) DEFAULT 'kg'::character varying,
    container_type character varying(100) DEFAULT 'Standard Crate'::character varying,
    container_count integer DEFAULT 1,
    assignee character varying(150),
    order_value numeric(12,2) DEFAULT 0.00,
    status character varying(50) DEFAULT 'scheduled'::character varying,
    actual_harvested_qty numeric(10,2) DEFAULT 0.0,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_harvest_stages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_harvest_stages (
    id integer NOT NULL,
    stage_name character varying(100) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_harvest_stages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vivas_harvest_stages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vivas_harvest_stages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vivas_harvest_stages_id_seq OWNED BY public.vivas_harvest_stages.id;


--
-- Name: vivas_inputs_catalog; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_inputs_catalog (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    input_type character varying(100) NOT NULL,
    active_ingredients character varying(255),
    npk_ratio character varying(50),
    is_organic boolean DEFAULT true,
    omri_listed boolean DEFAULT true,
    certification_number character varying(100),
    default_unit character varying(50) DEFAULT 'kg'::character varying,
    brand character varying(100),
    recommended_application_rate character varying(255),
    target_crops character varying(255),
    safety_precautions text,
    reentry_interval_hours integer DEFAULT 0,
    status character varying(30) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_inputs_inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_inputs_inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    catalog_id uuid,
    name character varying(150) NOT NULL,
    input_type character varying(100) NOT NULL,
    unit character varying(50) DEFAULT 'kg'::character varying,
    brand character varying(100),
    vendor character varying(150) DEFAULT 'Agro Green Inputs Hub'::character varying,
    quantity_on_hand numeric(10,2) DEFAULT 0.00,
    quantity_committed numeric(10,2) DEFAULT 0.00,
    quantity_available numeric(10,2) DEFAULT 0.00,
    quantity_incoming numeric(10,2) DEFAULT 0.00,
    quantity_expired numeric(10,2) DEFAULT 0.00,
    reorder_threshold numeric(10,2) DEFAULT 10.00,
    unit_cost numeric(10,2) DEFAULT 0.00,
    storage_location character varying(150) DEFAULT 'Inputs Storage Shed'::character varying,
    status character varying(50) DEFAULT 'in_stock'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    vendor_id uuid
);


--
-- Name: vivas_inputs_lots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_inputs_lots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lot_number character varying(100) NOT NULL,
    vendor_lot_number character varying(100),
    inventory_id uuid,
    catalog_id uuid,
    input_name character varying(150) NOT NULL,
    input_type character varying(100) NOT NULL,
    unit character varying(50) DEFAULT 'kg'::character varying,
    initial_quantity numeric(10,2) NOT NULL,
    current_quantity numeric(10,2) NOT NULL,
    unit_cost numeric(10,2) DEFAULT 0.00,
    total_cost numeric(12,2) DEFAULT 0.00,
    received_date date DEFAULT CURRENT_DATE,
    expiration_date date,
    storage_location character varying(150),
    container_code character varying(100),
    supplier_name character varying(150),
    status character varying(50) DEFAULT 'active'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_labor_hours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_labor_hours (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    person_name character varying(150) NOT NULL,
    hours_worked numeric(5,2) NOT NULL,
    work_date date NOT NULL
);


--
-- Name: vivas_labor_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_labor_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    clock_in_enabled boolean DEFAULT true,
    require_task_clock_in boolean DEFAULT true,
    overtime_threshold_daily_hours numeric(4,2) DEFAULT 8.00,
    overtime_multiplier numeric(4,2) DEFAULT 1.50,
    pay_period_type character varying(50) DEFAULT 'Weekly'::character varying,
    currency_symbol character varying(10) DEFAULT '₹'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_labor_timesheets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_labor_timesheets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    worker_id uuid,
    worker_name character varying(150) NOT NULL,
    work_date date DEFAULT CURRENT_DATE NOT NULL,
    clock_in_time timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    clock_out_time timestamp with time zone,
    break_minutes integer DEFAULT 0,
    total_hours numeric(6,2) DEFAULT 0.00,
    task_type character varying(100) DEFAULT 'General Farm Work'::character varying NOT NULL,
    task_id uuid,
    crop_name character varying(100),
    crop_id uuid,
    field_location character varying(150) DEFAULT 'Field Block A'::character varying,
    hourly_rate numeric(10,2) DEFAULT 120.00 NOT NULL,
    total_labor_cost numeric(10,2) DEFAULT 0.00,
    is_overtime boolean DEFAULT false,
    status character varying(30) DEFAULT 'pending'::character varying,
    approved_by character varying(150),
    approved_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_labor_workers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_labor_workers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_code character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    role character varying(100) NOT NULL,
    employment_type character varying(50) DEFAULT 'Full-Time'::character varying,
    hourly_rate numeric(10,2) DEFAULT 120.00 NOT NULL,
    overtime_rate numeric(10,2) DEFAULT 180.00 NOT NULL,
    phone character varying(50),
    email character varying(150),
    emergency_contact_name character varying(150),
    emergency_contact_phone character varying(50),
    hire_date date DEFAULT CURRENT_DATE,
    assigned_location character varying(150) DEFAULT 'Main Farm Grounds'::character varying,
    status character varying(30) DEFAULT 'active'::character varying,
    avatar_color character varying(20) DEFAULT '#0284c7'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_labs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_labs (
    id integer NOT NULL,
    lab_name character varying(200) NOT NULL,
    lab_code character varying(50),
    contact_person character varying(150),
    phone character varying(30),
    email character varying(150),
    address text,
    accreditation character varying(200),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: vivas_labs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vivas_labs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vivas_labs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vivas_labs_id_seq OWNED BY public.vivas_labs.id;


--
-- Name: vivas_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    note_type character varying(50) DEFAULT 'Notes'::character varying,
    crop_category character varying(100),
    crop character varying(100),
    location character varying(150),
    author_name character varying(150) NOT NULL,
    note_year integer DEFAULT 2026,
    content text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_id uuid,
    crop_id uuid,
    crop_name character varying(100) NOT NULL,
    variety_name character varying(100),
    item_description character varying(200),
    packaging_unit character varying(50) DEFAULT 'kg'::character varying,
    unit_price numeric(10,2) NOT NULL,
    quantity_ordered numeric(8,2) NOT NULL,
    quantity_packed numeric(8,2) DEFAULT 0.00,
    total_price numeric(10,2) NOT NULL,
    is_packed boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    order_no character varying(50) NOT NULL,
    status character varying(30) DEFAULT 'not_fulfilled'::character varying,
    amount numeric(12,2) DEFAULT 0.00,
    order_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    order_number character varying(50),
    customer_id uuid,
    customer_name character varying(150),
    customer_company character varying(150),
    customer_email character varying(150),
    customer_phone character varying(50),
    sales_channel_id uuid,
    sales_channel_name character varying(100),
    delivery_date date DEFAULT CURRENT_DATE,
    fulfillment_type character varying(50) DEFAULT 'Delivery'::character varying,
    fulfillment_status character varying(30) DEFAULT 'submitted'::character varying,
    payment_status character varying(30) DEFAULT 'unpaid'::character varying,
    payment_method character varying(50) DEFAULT 'Invoice / Net 30'::character varying,
    subtotal numeric(10,2) DEFAULT 0.00,
    delivery_fee numeric(10,2) DEFAULT 0.00,
    tax_amount numeric(10,2) DEFAULT 0.00,
    discount_amount numeric(10,2) DEFAULT 0.00,
    total_amount numeric(10,2) DEFAULT 0.00,
    packing_notes text,
    invoice_notes text,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_pack_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_pack_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pack_date date NOT NULL,
    sales_channel_id uuid,
    sales_channel_name character varying(100),
    crop_name character varying(100) NOT NULL,
    total_ordered_qty numeric(8,2) DEFAULT 0.00,
    total_packed_qty numeric(8,2) DEFAULT 0.00,
    unit character varying(30) DEFAULT 'kg'::character varying,
    container_type character varying(50) DEFAULT 'Orange Heavy Crate'::character varying,
    container_count integer DEFAULT 1,
    assignee character varying(100) DEFAULT 'Packhouse Team'::character varying,
    status character varying(30) DEFAULT 'pending'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_payment_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_payment_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    card_brand character varying(50) DEFAULT 'Visa'::character varying,
    last4 character varying(4) NOT NULL,
    exp_month integer NOT NULL,
    exp_year integer NOT NULL,
    cardholder_name character varying(255) NOT NULL,
    is_default boolean DEFAULT true,
    billing_country character varying(100) DEFAULT 'India'::character varying,
    billing_postal_code character varying(50) DEFAULT '600001'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_plantings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_plantings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    field_name character varying(150),
    crop_name character varying(100) NOT NULL,
    area_planted numeric(8,2),
    planting_date date,
    planting_id character varying(50),
    crop_id uuid,
    variety_id uuid,
    variety_name character varying(150),
    harvest_stage character varying(50) DEFAULT 'Mature'::character varying,
    planting_type text DEFAULT 'Transplant'::character varying,
    season_year integer DEFAULT 2026,
    sow_date date,
    plant_date date,
    first_harvest_date date,
    last_harvest_date date,
    location_id integer,
    location_name character varying(150),
    bed_ids jsonb DEFAULT '[]'::jsonb,
    bed_names character varying(255),
    bed_feet numeric(10,2) DEFAULT 100.0,
    row_feet numeric(10,2),
    rows_per_bed integer DEFAULT 2,
    in_row_spacing_in numeric(6,2) DEFAULT 12.0,
    gps_lat numeric(11,8),
    gps_lng numeric(11,8),
    target_yield numeric(12,2),
    yield_unit character varying(30) DEFAULT 'kg'::character varying,
    estimated_revenue numeric(12,2) DEFAULT 0.00,
    unit_price numeric(10,2) DEFAULT 0.00,
    actual_yield numeric(12,2) DEFAULT 0.00,
    status character varying(50) DEFAULT 'planned'::character varying,
    seed_vendor character varying(150),
    seed_lot character varying(100),
    tray_count integer DEFAULT 1,
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    spacing_unit character varying(20) DEFAULT 'mtr'::character varying,
    expected_yield_per_acre numeric(10,2),
    planting_method text
);


--
-- Name: vivas_priority_onboarding_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_priority_onboarding_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    farm_name character varying(255),
    contact_email character varying(255),
    contact_phone character varying(50),
    preferred_date date,
    preferred_time_slot character varying(50),
    notes text,
    status character varying(50) DEFAULT 'Pending'::character varying,
    amount numeric(10,2) DEFAULT 199.00,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_purchase_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_purchase_order_items (
    id integer NOT NULL,
    po_id integer NOT NULL,
    item_name character varying(255) NOT NULL,
    category character varying(100) DEFAULT 'General'::character varying,
    quantity_ordered numeric(12,2) DEFAULT 1.00 NOT NULL,
    quantity_received numeric(12,2) DEFAULT 0.00,
    unit_of_measure character varying(50) DEFAULT 'units'::character varying,
    unit_cost numeric(12,2) DEFAULT 0.00 NOT NULL,
    total_price numeric(12,2) GENERATED ALWAYS AS ((quantity_ordered * unit_cost)) STORED,
    linked_material_id uuid,
    linked_shopping_item_id integer,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_purchase_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vivas_purchase_order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vivas_purchase_order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vivas_purchase_order_items_id_seq OWNED BY public.vivas_purchase_order_items.id;


--
-- Name: vivas_purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_purchase_orders (
    id integer NOT NULL,
    po_code character varying(50) NOT NULL,
    vendor_id uuid,
    vendor_name character varying(255) NOT NULL,
    vendor_email character varying(255),
    vendor_phone character varying(50),
    order_date date DEFAULT CURRENT_DATE NOT NULL,
    expected_delivery_date date,
    received_date date,
    status character varying(50) DEFAULT 'Ordered'::character varying,
    payment_terms character varying(100) DEFAULT 'Net 30'::character varying,
    payment_status character varying(50) DEFAULT 'Pending'::character varying,
    subtotal numeric(12,2) DEFAULT 0.00,
    tax_amount numeric(12,2) DEFAULT 0.00,
    shipping_cost numeric(12,2) DEFAULT 0.00,
    total_amount numeric(12,2) DEFAULT 0.00,
    shipping_address text DEFAULT 'Vivas Organic Farm, Field #4 Gate, Off Airport Road, Bengaluru, KA'::text,
    notes text,
    created_by character varying(150) DEFAULT 'Procurement Manager'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_purchase_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vivas_purchase_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vivas_purchase_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vivas_purchase_orders_id_seq OWNED BY public.vivas_purchase_orders.id;


--
-- Name: vivas_report_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_report_snapshots (
    id integer NOT NULL,
    report_id integer,
    report_name character varying(255) NOT NULL,
    date_range character varying(100) DEFAULT 'This Month'::character varying,
    summary_json jsonb DEFAULT '{}'::jsonb,
    generated_by character varying(150) DEFAULT 'System Automated'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_report_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vivas_report_snapshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vivas_report_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vivas_report_snapshots_id_seq OWNED BY public.vivas_report_snapshots.id;


--
-- Name: vivas_sales_channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_sales_channels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    channel_type character varying(50) NOT NULL,
    description text,
    pricing_tier character varying(50) DEFAULT 'Wholesale Standard'::character varying,
    delivery_days jsonb DEFAULT '["Tuesday", "Friday"]'::jsonb,
    order_cutoff_hours integer DEFAULT 24,
    payment_terms character varying(50) DEFAULT 'Net 30'::character varying,
    min_order_amount numeric(10,2) DEFAULT 0.00,
    tax_rate_pct numeric(5,2) DEFAULT 0.00,
    is_active boolean DEFAULT true,
    color_hex character varying(20) DEFAULT '#0284c7'::character varying,
    icon_name character varying(30) DEFAULT 'Store'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_saved_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_saved_reports (
    id integer NOT NULL,
    report_name character varying(255) NOT NULL,
    category character varying(100) DEFAULT 'General'::character varying NOT NULL,
    description text,
    filters_json jsonb DEFAULT '{}'::jsonb,
    metrics_json jsonb DEFAULT '[]'::jsonb,
    is_favorite boolean DEFAULT false,
    created_by character varying(150) DEFAULT 'Farm Manager'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_saved_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vivas_saved_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vivas_saved_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vivas_saved_reports_id_seq OWNED BY public.vivas_saved_reports.id;


--
-- Name: vivas_seed_suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_seed_suppliers (
    id integer NOT NULL,
    supplier_name character varying(150) NOT NULL,
    contact_email character varying(150),
    website character varying(255),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_seed_suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vivas_seed_suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vivas_seed_suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vivas_seed_suppliers_id_seq OWNED BY public.vivas_seed_suppliers.id;


--
-- Name: vivas_settings_api_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_settings_api_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid,
    user_id uuid,
    token_name character varying(100) NOT NULL,
    token_hash character varying(255) NOT NULL,
    token_preview character varying(20) NOT NULL,
    permission_scope character varying(50) DEFAULT 'read_write'::character varying,
    expires_at timestamp with time zone,
    last_used_at timestamp with time zone,
    is_revoked boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_settings_channel_mappings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_settings_channel_mappings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid,
    sales_channel character varying(100) NOT NULL,
    default_processor_code character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_settings_custom_fields; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_settings_custom_fields (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid,
    field_label character varying(100) NOT NULL,
    field_key character varying(100) NOT NULL,
    target_entity character varying(50) NOT NULL,
    field_type character varying(30) NOT NULL,
    select_options jsonb DEFAULT '[]'::jsonb,
    is_required boolean DEFAULT false,
    default_value text,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_settings_delivery_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_settings_delivery_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid,
    method_name character varying(100) NOT NULL,
    delivery_fee numeric(10,2) DEFAULT 0.00,
    minimum_order_amount numeric(10,2) DEFAULT 0.00,
    estimated_window character varying(100) DEFAULT 'Same Day / Next Morning'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_settings_farm_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_settings_farm_profile (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid,
    farm_name character varying(150) NOT NULL,
    year_founded integer DEFAULT 2026,
    location_mode character varying(20) DEFAULT 'address'::character varying,
    address text,
    city character varying(100),
    state character varying(100),
    country character varying(100) DEFAULT 'India'::character varying,
    postal_code character varying(30),
    gps_lat numeric(10,8) DEFAULT 12.9716,
    gps_lng numeric(11,8) DEFAULT 77.5946,
    farm_size numeric(10,2) DEFAULT 25.00,
    farm_size_unit character varying(20) DEFAULT 'Acres'::character varying,
    operation_type character varying(100) DEFAULT 'Mixed Vegetable & Fruit Farm'::character varying,
    logo_url text,
    invoice_header_mode character varying(30) DEFAULT 'LOGO_AND_NAME'::character varying,
    operating_hours jsonb DEFAULT '{"end": "17:00", "start": "08:00", "work_days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]}'::jsonb,
    growing_format character varying(50) DEFAULT 'Beds & Pathways'::character varying,
    default_bed_width_ft numeric(5,2) DEFAULT 2.50,
    default_pathway_width_ft numeric(5,2) DEFAULT 1.50,
    default_yield_area_unit character varying(50) DEFAULT 'Acre'::character varying,
    default_yield_mass_unit character varying(20) DEFAULT 'Ton'::character varying,
    frost_date_option character varying(30) DEFAULT 'manual'::character varying,
    first_fall_frost date,
    last_spring_frost date,
    units_system character varying(20) DEFAULT 'Metric'::character varying,
    temperature_unit character varying(5) DEFAULT 'C'::character varying,
    currency_code character varying(10) DEFAULT 'INR'::character varying,
    currency_symbol character varying(5) DEFAULT '₹'::character varying,
    timezone character varying(50) DEFAULT 'Asia/Kolkata'::character varying,
    date_format character varying(20) DEFAULT 'DD/MM/YYYY'::character varying,
    public_description text DEFAULT 'Sustainable organic agriculture producing high quality heirloom vegetables, greens, and fruits.'::text,
    public_website text DEFAULT 'https://vivas.ai'::text,
    instagram_handle character varying(100) DEFAULT '@vivasfarm'::character varying,
    facebook_handle character varying(100) DEFAULT 'vivasfarm'::character varying,
    public_phone character varying(50) DEFAULT '+91 9940091521'::character varying,
    public_email character varying(150) DEFAULT 'gksvijay@gmail.com'::character varying,
    show_public_address boolean DEFAULT true,
    certifications jsonb DEFAULT '["USDA Organic", "NPOP Organic India", "Good Agricultural Practices (GAP)"]'::jsonb,
    tax_registration_id character varying(100) DEFAULT 'GSTIN29ABCDE1234F1Z5'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_settings_labels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_settings_labels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid,
    design_name character varying(150) NOT NULL,
    purpose character varying(50) NOT NULL,
    label_type character varying(50) DEFAULT 'Thermal Label'::character varying,
    dimensions character varying(50) DEFAULT '4" x 2"'::character varying,
    fields_included jsonb DEFAULT '["Crop", "Variety", "Harvest Date", "Weight", "Lot #", "QR Code"]'::jsonb NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_settings_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_settings_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid,
    user_id uuid,
    category character varying(50) NOT NULL,
    event_key character varying(100) NOT NULL,
    event_title character varying(150) NOT NULL,
    mobile_push_enabled boolean DEFAULT true,
    in_app_enabled boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_settings_online_store; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_settings_online_store (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid,
    store_enabled boolean DEFAULT true,
    brand_farm_name character varying(150),
    brand_year_founded integer DEFAULT 2026,
    brand_address text,
    default_tax_rate numeric(6,3) DEFAULT 5.000,
    order_cutoff_hours integer DEFAULT 24,
    minimum_order_amount numeric(10,2) DEFAULT 250.00,
    terms_and_policies text DEFAULT 'Freshly harvested orders are packed every morning. Standard returns accepted within 24 hours of delivery.'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_settings_payment_processors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_settings_payment_processors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid,
    provider_code character varying(50) NOT NULL,
    provider_name character varying(100) NOT NULL,
    is_enabled boolean DEFAULT false,
    is_test_mode boolean DEFAULT true,
    publishable_key text,
    secret_key_encrypted text,
    webhook_secret text,
    currency character varying(10) DEFAULT 'INR'::character varying,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_settings_pickup_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_settings_pickup_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid,
    location_name character varying(150) NOT NULL,
    address text NOT NULL,
    instructions text,
    schedule character varying(150) DEFAULT 'Saturday & Sunday 8:00 AM - 12:00 PM'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_settings_planting_id; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_settings_planting_id (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid,
    pattern_type character varying(50) DEFAULT 'auto_number'::character varying,
    starting_sequence integer DEFAULT 1,
    show_auto_number_only boolean DEFAULT false,
    prefix character varying(20) DEFAULT 'PLN'::character varying,
    separator character varying(5) DEFAULT '-'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_settings_product; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_settings_product (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid,
    shelf_life_tracking_enabled boolean DEFAULT true,
    default_shelf_life_value integer DEFAULT 10,
    default_shelf_life_unit character varying(20) DEFAULT 'Days'::character varying,
    unlimited_shelf_life_enabled boolean DEFAULT false,
    inventory_impact_mode character varying(30) DEFAULT 'Standard'::character varying,
    update_committed_on_pack boolean DEFAULT true,
    update_on_hand_on_pack boolean DEFAULT true,
    block_if_stock_short boolean DEFAULT true,
    allow_negative_available boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_settings_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_settings_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid,
    role_name character varying(100) NOT NULL,
    description text,
    is_custom boolean DEFAULT false,
    permissions jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_settings_task_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_settings_task_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid,
    name character varying(100) NOT NULL,
    abbreviation character varying(10) NOT NULL,
    category character varying(100) NOT NULL,
    bg_color character varying(20) DEFAULT '#b8f4a5'::character varying,
    text_color character varying(20) DEFAULT '#212529'::character varying,
    is_active boolean DEFAULT true,
    sort_order integer DEFAULT 0,
    is_system_default boolean DEFAULT false,
    description text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_settings_time_attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_settings_time_attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid,
    clock_in_enabled boolean DEFAULT true,
    task_clock_in_required boolean DEFAULT true,
    geofencing_enabled boolean DEFAULT false,
    geofence_radius_meters integer DEFAULT 500,
    overtime_threshold_hours integer DEFAULT 40,
    overtime_multiplier numeric(3,2) DEFAULT 1.50,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_settings_webhooks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_settings_webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    farm_id uuid,
    endpoint_url text NOT NULL,
    secret_key character varying(255) NOT NULL,
    subscribed_events jsonb DEFAULT '["order.created", "task.completed", "harvest.logged"]'::jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_shopping_list; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_shopping_list (
    id integer NOT NULL,
    item_code character varying(50) NOT NULL,
    item_name character varying(255) NOT NULL,
    category character varying(100) DEFAULT 'Seeds & Starts'::character varying NOT NULL,
    quantity_needed numeric(12,2) DEFAULT 1.00 NOT NULL,
    unit_of_measure character varying(50) DEFAULT 'kg'::character varying,
    estimated_unit_cost numeric(12,2) DEFAULT 0.00,
    total_estimated_cost numeric(12,2) GENERATED ALWAYS AS ((quantity_needed * estimated_unit_cost)) STORED,
    priority character varying(50) DEFAULT 'Medium'::character varying,
    vendor_id uuid,
    vendor_name character varying(255),
    source_type character varying(100) DEFAULT 'Manual Requirement'::character varying,
    source_reference character varying(255),
    storage_location character varying(255) DEFAULT 'Main Barn Storage'::character varying,
    status character varying(50) DEFAULT 'Pending'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_shopping_list_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vivas_shopping_list_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vivas_shopping_list_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vivas_shopping_list_id_seq OWNED BY public.vivas_shopping_list.id;


--
-- Name: vivas_soil_tests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_soil_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    crop_category character varying(100),
    crop character varying(100),
    location character varying(150),
    author_name character varying(150) NOT NULL,
    note_year integer DEFAULT 2026,
    ph numeric(4,2),
    nitrogen numeric(5,2),
    phosphorus numeric(5,2),
    potassium numeric(5,2),
    content text,
    created_at timestamp with time zone DEFAULT now(),
    test_date date,
    sample_id character varying(100),
    soil_texture character varying(100),
    soil_depth_cm numeric(8,2),
    organic_matter numeric(8,3),
    calcium numeric(10,3),
    magnesium numeric(10,3),
    sulfur numeric(10,3),
    iron numeric(10,3),
    zinc numeric(10,3),
    manganese numeric(10,3),
    copper numeric(10,3),
    boron numeric(10,3),
    cec numeric(10,3),
    ec numeric(10,4),
    moisture numeric(8,2),
    gps_lat numeric(11,8),
    gps_lng numeric(11,8),
    lab_id integer,
    lab_name character varying(200),
    recommendations text,
    status character varying(50) DEFAULT 'Pending'::character varying
);


--
-- Name: vivas_storage_addons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_storage_addons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    package_name character varying(100) NOT NULL,
    storage_gb integer NOT NULL,
    price_usd_per_mo numeric(10,2) NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_user_farms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_user_farms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    farm_id uuid,
    role_in_farm character varying(100) DEFAULT 'Farm Owner / Manager'::character varying,
    is_default boolean DEFAULT false,
    joined_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    full_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    farm_name character varying(255) DEFAULT 'Vivas Organics Farm'::character varying,
    role character varying(50) DEFAULT 'Farm Manager'::character varying,
    reset_token character varying(255),
    reset_token_expires timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    first_name character varying(100),
    last_name character varying(100),
    phone_country_code character varying(10) DEFAULT '+91'::character varying,
    phone_number character varying(50),
    labor_rate numeric(10,2) DEFAULT 0.00,
    labor_rate_currency character varying(10) DEFAULT '₹'::character varying,
    avatar_url text,
    transfer_owner_id uuid
);


--
-- Name: vivas_vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_vendors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vendor_code character varying(50) NOT NULL,
    name character varying(150) NOT NULL,
    contact_person character varying(150),
    contact_role character varying(100) DEFAULT 'Sales Representative'::character varying,
    category character varying(100) NOT NULL,
    supply_items text[] DEFAULT ARRAY[]::text[],
    email character varying(150),
    phone character varying(50),
    alternate_phone character varying(50),
    website character varying(255),
    street_address text,
    city character varying(100),
    state character varying(100),
    country character varying(100) DEFAULT 'India'::character varying,
    postal_code character varying(30),
    gps_lat numeric(10,7),
    gps_lng numeric(10,7),
    tax_id character varying(50),
    bank_name character varying(100),
    bank_account_no character varying(100),
    bank_ifsc_swift character varying(50),
    default_accounting_category_id uuid,
    payment_terms character varying(50) DEFAULT 'Net 30'::character varying,
    lead_time_days integer DEFAULT 5,
    rating numeric(3,2) DEFAULT 4.8,
    total_purchases_amount numeric(12,2) DEFAULT 0.00,
    outstanding_payable numeric(12,2) DEFAULT 0.00,
    notes text,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: vivas_widget_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vivas_widget_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    widget_key character varying(50) NOT NULL,
    title character varying(100) NOT NULL,
    is_visible boolean DEFAULT true,
    "position" integer NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: vivas_farm_map_beds id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_farm_map_beds ALTER COLUMN id SET DEFAULT nextval('public.vivas_farm_map_beds_id_seq'::regclass);


--
-- Name: vivas_farm_map_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_farm_map_items ALTER COLUMN id SET DEFAULT nextval('public.vivas_farm_map_items_id_seq'::regclass);


--
-- Name: vivas_harvest_stages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_harvest_stages ALTER COLUMN id SET DEFAULT nextval('public.vivas_harvest_stages_id_seq'::regclass);


--
-- Name: vivas_labs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_labs ALTER COLUMN id SET DEFAULT nextval('public.vivas_labs_id_seq'::regclass);


--
-- Name: vivas_purchase_order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_purchase_order_items ALTER COLUMN id SET DEFAULT nextval('public.vivas_purchase_order_items_id_seq'::regclass);


--
-- Name: vivas_purchase_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_purchase_orders ALTER COLUMN id SET DEFAULT nextval('public.vivas_purchase_orders_id_seq'::regclass);


--
-- Name: vivas_report_snapshots id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_report_snapshots ALTER COLUMN id SET DEFAULT nextval('public.vivas_report_snapshots_id_seq'::regclass);


--
-- Name: vivas_saved_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_saved_reports ALTER COLUMN id SET DEFAULT nextval('public.vivas_saved_reports_id_seq'::regclass);


--
-- Name: vivas_seed_suppliers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_seed_suppliers ALTER COLUMN id SET DEFAULT nextval('public.vivas_seed_suppliers_id_seq'::regclass);


--
-- Name: vivas_shopping_list id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_shopping_list ALTER COLUMN id SET DEFAULT nextval('public.vivas_shopping_list_id_seq'::regclass);


--
-- Name: ch_ai_feedback ch_ai_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_ai_feedback
    ADD CONSTRAINT ch_ai_feedback_pkey PRIMARY KEY (id);


--
-- Name: ch_ai_request ch_ai_request_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_ai_request
    ADD CONSTRAINT ch_ai_request_pkey PRIMARY KEY (id);


--
-- Name: ch_alert ch_alert_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_alert
    ADD CONSTRAINT ch_alert_pkey PRIMARY KEY (id);


--
-- Name: ch_case ch_case_case_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case
    ADD CONSTRAINT ch_case_case_no_key UNIQUE (case_no);


--
-- Name: ch_case_diagnosis ch_case_diagnosis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case_diagnosis
    ADD CONSTRAINT ch_case_diagnosis_pkey PRIMARY KEY (id);


--
-- Name: ch_case_followup ch_case_followup_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case_followup
    ADD CONSTRAINT ch_case_followup_pkey PRIMARY KEY (id);


--
-- Name: ch_case_note ch_case_note_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case_note
    ADD CONSTRAINT ch_case_note_pkey PRIMARY KEY (case_id, note_id);


--
-- Name: ch_case ch_case_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case
    ADD CONSTRAINT ch_case_pkey PRIMARY KEY (id);


--
-- Name: ch_case_plant_part ch_case_plant_part_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case_plant_part
    ADD CONSTRAINT ch_case_plant_part_pkey PRIMARY KEY (case_id, plant_part_id);


--
-- Name: ch_case_symptom ch_case_symptom_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case_symptom
    ADD CONSTRAINT ch_case_symptom_pkey PRIMARY KEY (case_id, symptom_id);


--
-- Name: ch_case_treatment ch_case_treatment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case_treatment
    ADD CONSTRAINT ch_case_treatment_pkey PRIMARY KEY (id);


--
-- Name: ch_control_measure ch_control_measure_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_control_measure
    ADD CONSTRAINT ch_control_measure_pkey PRIMARY KEY (id);


--
-- Name: ch_import_batch ch_import_batch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_import_batch
    ADD CONSTRAINT ch_import_batch_pkey PRIMARY KEY (id);


--
-- Name: ch_import_error ch_import_error_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_import_error
    ADD CONSTRAINT ch_import_error_pkey PRIMARY KEY (id);


--
-- Name: ch_lifecycle_stage ch_lifecycle_stage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_lifecycle_stage
    ADD CONSTRAINT ch_lifecycle_stage_pkey PRIMARY KEY (id);


--
-- Name: ch_lifecycle_stage ch_lifecycle_stage_problem_id_seq_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_lifecycle_stage
    ADD CONSTRAINT ch_lifecycle_stage_problem_id_seq_key UNIQUE (problem_id, seq);


--
-- Name: ch_lookup ch_lookup_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_lookup
    ADD CONSTRAINT ch_lookup_pkey PRIMARY KEY (id);


--
-- Name: ch_media ch_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_media
    ADD CONSTRAINT ch_media_pkey PRIMARY KEY (id);


--
-- Name: ch_nutrient ch_nutrient_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_nutrient
    ADD CONSTRAINT ch_nutrient_pkey PRIMARY KEY (code);


--
-- Name: ch_problem_attr ch_problem_attr_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_problem_attr
    ADD CONSTRAINT ch_problem_attr_pkey PRIMARY KEY (problem_id, lookup_id);


--
-- Name: ch_problem ch_problem_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_problem
    ADD CONSTRAINT ch_problem_code_key UNIQUE (code);


--
-- Name: ch_problem_crop ch_problem_crop_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_problem_crop
    ADD CONSTRAINT ch_problem_crop_pkey PRIMARY KEY (problem_id, crop_id);


--
-- Name: ch_problem ch_problem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_problem
    ADD CONSTRAINT ch_problem_pkey PRIMARY KEY (id);


--
-- Name: ch_problem_review ch_problem_review_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_problem_review
    ADD CONSTRAINT ch_problem_review_pkey PRIMARY KEY (id);


--
-- Name: ch_problem_symptom ch_problem_symptom_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_problem_symptom
    ADD CONSTRAINT ch_problem_symptom_pkey PRIMARY KEY (problem_id, symptom_id);


--
-- Name: ch_problem_version ch_problem_version_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_problem_version
    ADD CONSTRAINT ch_problem_version_pkey PRIMARY KEY (problem_id, version);


--
-- Name: ch_resistant_variety ch_resistant_variety_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_resistant_variety
    ADD CONSTRAINT ch_resistant_variety_pkey PRIMARY KEY (id);


--
-- Name: ch_resistant_variety ch_resistant_variety_problem_id_variety_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_resistant_variety
    ADD CONSTRAINT ch_resistant_variety_problem_id_variety_id_key UNIQUE (problem_id, variety_id);


--
-- Name: ch_risk_rule ch_risk_rule_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_risk_rule
    ADD CONSTRAINT ch_risk_rule_pkey PRIMARY KEY (id);


--
-- Name: ch_symptom ch_symptom_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_symptom
    ADD CONSTRAINT ch_symptom_code_key UNIQUE (code);


--
-- Name: ch_symptom ch_symptom_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_symptom
    ADD CONSTRAINT ch_symptom_pkey PRIMARY KEY (id);


--
-- Name: pih_ai_inferences pih_ai_inferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_ai_inferences
    ADD CONSTRAINT pih_ai_inferences_pkey PRIMARY KEY (id);


--
-- Name: pih_api_keys pih_api_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_api_keys
    ADD CONSTRAINT pih_api_keys_key_hash_key UNIQUE (key_hash);


--
-- Name: pih_api_keys pih_api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_api_keys
    ADD CONSTRAINT pih_api_keys_pkey PRIMARY KEY (id);


--
-- Name: pih_audit_log pih_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_audit_log
    ADD CONSTRAINT pih_audit_log_pkey PRIMARY KEY (id);


--
-- Name: pih_cart_items pih_cart_items_cart_id_sku_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_cart_items
    ADD CONSTRAINT pih_cart_items_cart_id_sku_id_key UNIQUE (cart_id, sku_id);


--
-- Name: pih_cart_items pih_cart_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_cart_items
    ADD CONSTRAINT pih_cart_items_pkey PRIMARY KEY (id);


--
-- Name: pih_carts pih_carts_farm_id_user_id_partner_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_carts
    ADD CONSTRAINT pih_carts_farm_id_user_id_partner_id_key UNIQUE (farm_id, user_id, partner_id);


--
-- Name: pih_carts pih_carts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_carts
    ADD CONSTRAINT pih_carts_pkey PRIMARY KEY (id);


--
-- Name: pih_data_sharing_consents pih_data_sharing_consents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_data_sharing_consents
    ADD CONSTRAINT pih_data_sharing_consents_pkey PRIMARY KEY (id);


--
-- Name: pih_field_trials pih_field_trials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_field_trials
    ADD CONSTRAINT pih_field_trials_pkey PRIMARY KEY (id);


--
-- Name: pih_import_batches pih_import_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_import_batches
    ADD CONSTRAINT pih_import_batches_pkey PRIMARY KEY (id);


--
-- Name: pih_import_errors pih_import_errors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_import_errors
    ADD CONSTRAINT pih_import_errors_pkey PRIMARY KEY (id);


--
-- Name: pih_jobs pih_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_jobs
    ADD CONSTRAINT pih_jobs_pkey PRIMARY KEY (id);


--
-- Name: pih_notifications pih_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_notifications
    ADD CONSTRAINT pih_notifications_pkey PRIMARY KEY (id);


--
-- Name: pih_order_status_history pih_order_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_order_status_history
    ADD CONSTRAINT pih_order_status_history_pkey PRIMARY KEY (id);


--
-- Name: pih_partner_documents pih_partner_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_partner_documents
    ADD CONSTRAINT pih_partner_documents_pkey PRIMARY KEY (id);


--
-- Name: pih_partner_users pih_partner_users_partner_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_partner_users
    ADD CONSTRAINT pih_partner_users_partner_id_user_id_key UNIQUE (partner_id, user_id);


--
-- Name: pih_partner_users pih_partner_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_partner_users
    ADD CONSTRAINT pih_partner_users_pkey PRIMARY KEY (id);


--
-- Name: pih_partners pih_partners_partner_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_partners
    ADD CONSTRAINT pih_partners_partner_code_key UNIQUE (partner_code);


--
-- Name: pih_partners pih_partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_partners
    ADD CONSTRAINT pih_partners_pkey PRIMARY KEY (id);


--
-- Name: pih_product_claims pih_product_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_product_claims
    ADD CONSTRAINT pih_product_claims_pkey PRIMARY KEY (id);


--
-- Name: pih_product_composition pih_product_composition_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_product_composition
    ADD CONSTRAINT pih_product_composition_pkey PRIMARY KEY (id);


--
-- Name: pih_product_crop_suitability pih_product_crop_suitability_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_product_crop_suitability
    ADD CONSTRAINT pih_product_crop_suitability_pkey PRIMARY KEY (id);


--
-- Name: pih_product_media pih_product_media_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_product_media
    ADD CONSTRAINT pih_product_media_pkey PRIMARY KEY (id);


--
-- Name: pih_product_ratings pih_product_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_product_ratings
    ADD CONSTRAINT pih_product_ratings_pkey PRIMARY KEY (id);


--
-- Name: pih_product_skus pih_product_skus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_product_skus
    ADD CONSTRAINT pih_product_skus_pkey PRIMARY KEY (id);


--
-- Name: pih_product_skus pih_product_skus_sku_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_product_skus
    ADD CONSTRAINT pih_product_skus_sku_code_key UNIQUE (sku_code);


--
-- Name: pih_products pih_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_products
    ADD CONSTRAINT pih_products_pkey PRIMARY KEY (id);


--
-- Name: pih_products pih_products_product_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_products
    ADD CONSTRAINT pih_products_product_code_key UNIQUE (product_code);


--
-- Name: pih_recommendations pih_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_recommendations
    ADD CONSTRAINT pih_recommendations_pkey PRIMARY KEY (id);


--
-- Name: pih_reviews pih_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_reviews
    ADD CONSTRAINT pih_reviews_pkey PRIMARY KEY (id);


--
-- Name: pih_settlements pih_settlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_settlements
    ADD CONSTRAINT pih_settlements_pkey PRIMARY KEY (id);


--
-- Name: pih_store_order_items pih_store_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_store_order_items
    ADD CONSTRAINT pih_store_order_items_pkey PRIMARY KEY (id);


--
-- Name: pih_store_orders pih_store_orders_order_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_store_orders
    ADD CONSTRAINT pih_store_orders_order_no_key UNIQUE (order_no);


--
-- Name: pih_store_orders pih_store_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_store_orders
    ADD CONSTRAINT pih_store_orders_pkey PRIMARY KEY (id);


--
-- Name: pih_stores pih_stores_partner_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_stores
    ADD CONSTRAINT pih_stores_partner_id_key UNIQUE (partner_id);


--
-- Name: pih_stores pih_stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_stores
    ADD CONSTRAINT pih_stores_pkey PRIMARY KEY (id);


--
-- Name: pih_stores pih_stores_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_stores
    ADD CONSTRAINT pih_stores_slug_key UNIQUE (slug);


--
-- Name: pih_sync_state pih_sync_state_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_sync_state
    ADD CONSTRAINT pih_sync_state_pkey PRIMARY KEY (id);


--
-- Name: pih_sync_state pih_sync_state_source_table_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_sync_state
    ADD CONSTRAINT pih_sync_state_source_table_key UNIQUE (source_table);


--
-- Name: pih_treatment_outcomes pih_treatment_outcomes_case_treatment_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_treatment_outcomes
    ADD CONSTRAINT pih_treatment_outcomes_case_treatment_id_key UNIQUE (case_treatment_id);


--
-- Name: pih_treatment_outcomes pih_treatment_outcomes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_treatment_outcomes
    ADD CONSTRAINT pih_treatment_outcomes_pkey PRIMARY KEY (id);


--
-- Name: pih_trial_observations pih_trial_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_trial_observations
    ADD CONSTRAINT pih_trial_observations_pkey PRIMARY KEY (id);


--
-- Name: pih_webhook_deliveries pih_webhook_deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_webhook_deliveries
    ADD CONSTRAINT pih_webhook_deliveries_pkey PRIMARY KEY (id);


--
-- Name: pih_webhooks pih_webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_webhooks
    ADD CONSTRAINT pih_webhooks_pkey PRIMARY KEY (id);


--
-- Name: vivas_settings_channel_mappings unique_farm_channel_mapping; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_channel_mappings
    ADD CONSTRAINT unique_farm_channel_mapping UNIQUE (farm_id, sales_channel);


--
-- Name: vivas_settings_custom_fields unique_farm_custom_field; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_custom_fields
    ADD CONSTRAINT unique_farm_custom_field UNIQUE (farm_id, target_entity, field_key);


--
-- Name: vivas_settings_payment_processors unique_farm_payment_provider; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_payment_processors
    ADD CONSTRAINT unique_farm_payment_provider UNIQUE (farm_id, provider_code);


--
-- Name: vivas_settings_planting_id unique_farm_planting_id_settings; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_planting_id
    ADD CONSTRAINT unique_farm_planting_id_settings UNIQUE (farm_id);


--
-- Name: vivas_settings_product unique_farm_product_settings; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_product
    ADD CONSTRAINT unique_farm_product_settings UNIQUE (farm_id);


--
-- Name: vivas_settings_farm_profile unique_farm_profile_settings; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_farm_profile
    ADD CONSTRAINT unique_farm_profile_settings UNIQUE (farm_id);


--
-- Name: vivas_settings_online_store unique_farm_store_settings; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_online_store
    ADD CONSTRAINT unique_farm_store_settings UNIQUE (farm_id);


--
-- Name: vivas_settings_time_attendance unique_farm_time_attendance; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_time_attendance
    ADD CONSTRAINT unique_farm_time_attendance UNIQUE (farm_id);


--
-- Name: vivas_ai_credits unique_user_ai_credits; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_ai_credits
    ADD CONSTRAINT unique_user_ai_credits UNIQUE (user_id);


--
-- Name: vivas_settings_notifications unique_user_notification_pref; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_notifications
    ADD CONSTRAINT unique_user_notification_pref UNIQUE (farm_id, user_id, category, event_key);


--
-- Name: vivas_account_subscriptions vivas_account_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_account_subscriptions
    ADD CONSTRAINT vivas_account_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: vivas_accounting_categories vivas_accounting_categories_accounting_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_accounting_categories
    ADD CONSTRAINT vivas_accounting_categories_accounting_code_key UNIQUE (accounting_code);


--
-- Name: vivas_accounting_categories vivas_accounting_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_accounting_categories
    ADD CONSTRAINT vivas_accounting_categories_pkey PRIMARY KEY (id);


--
-- Name: vivas_ai_credit_purchases vivas_ai_credit_purchases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_ai_credit_purchases
    ADD CONSTRAINT vivas_ai_credit_purchases_pkey PRIMARY KEY (id);


--
-- Name: vivas_ai_credits vivas_ai_credits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_ai_credits
    ADD CONSTRAINT vivas_ai_credits_pkey PRIMARY KEY (id);


--
-- Name: vivas_billing_invoices vivas_billing_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_billing_invoices
    ADD CONSTRAINT vivas_billing_invoices_pkey PRIMARY KEY (id);


--
-- Name: vivas_completed_tasks_records vivas_completed_tasks_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_completed_tasks_records
    ADD CONSTRAINT vivas_completed_tasks_records_pkey PRIMARY KEY (id);


--
-- Name: vivas_contact_communications vivas_contact_communications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_contact_communications
    ADD CONSTRAINT vivas_contact_communications_pkey PRIMARY KEY (id);


--
-- Name: vivas_containers vivas_containers_barcode_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_containers
    ADD CONSTRAINT vivas_containers_barcode_key UNIQUE (barcode);


--
-- Name: vivas_containers vivas_containers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_containers
    ADD CONSTRAINT vivas_containers_pkey PRIMARY KEY (id);


--
-- Name: vivas_crop_categories vivas_crop_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_crop_categories
    ADD CONSTRAINT vivas_crop_categories_name_key UNIQUE (name);


--
-- Name: vivas_crop_categories vivas_crop_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_crop_categories
    ADD CONSTRAINT vivas_crop_categories_pkey PRIMARY KEY (id);


--
-- Name: vivas_crop_field_tasks vivas_crop_field_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_crop_field_tasks
    ADD CONSTRAINT vivas_crop_field_tasks_pkey PRIMARY KEY (id);


--
-- Name: vivas_crop_nursery_tasks vivas_crop_nursery_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_crop_nursery_tasks
    ADD CONSTRAINT vivas_crop_nursery_tasks_pkey PRIMARY KEY (id);


--
-- Name: vivas_crop_templates vivas_crop_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_crop_templates
    ADD CONSTRAINT vivas_crop_templates_pkey PRIMARY KEY (id);


--
-- Name: vivas_crop_varieties vivas_crop_varieties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_crop_varieties
    ADD CONSTRAINT vivas_crop_varieties_pkey PRIMARY KEY (id);


--
-- Name: vivas_crop_yields vivas_crop_yields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_crop_yields
    ADD CONSTRAINT vivas_crop_yields_pkey PRIMARY KEY (id);


--
-- Name: vivas_crops vivas_crops_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_crops
    ADD CONSTRAINT vivas_crops_pkey PRIMARY KEY (id);


--
-- Name: vivas_customers vivas_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_customers
    ADD CONSTRAINT vivas_customers_pkey PRIMARY KEY (id);


--
-- Name: vivas_equipment vivas_equipment_asset_tag_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_equipment
    ADD CONSTRAINT vivas_equipment_asset_tag_key UNIQUE (asset_tag);


--
-- Name: vivas_equipment_maintenance vivas_equipment_maintenance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_equipment_maintenance
    ADD CONSTRAINT vivas_equipment_maintenance_pkey PRIMARY KEY (id);


--
-- Name: vivas_equipment vivas_equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_equipment
    ADD CONSTRAINT vivas_equipment_pkey PRIMARY KEY (id);


--
-- Name: vivas_equipment vivas_equipment_serial_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_equipment
    ADD CONSTRAINT vivas_equipment_serial_number_key UNIQUE (serial_number);


--
-- Name: vivas_expenses vivas_expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_expenses
    ADD CONSTRAINT vivas_expenses_pkey PRIMARY KEY (id);


--
-- Name: vivas_farm_map_beds vivas_farm_map_beds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_farm_map_beds
    ADD CONSTRAINT vivas_farm_map_beds_pkey PRIMARY KEY (id);


--
-- Name: vivas_farm_map_items vivas_farm_map_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_farm_map_items
    ADD CONSTRAINT vivas_farm_map_items_pkey PRIMARY KEY (id);


--
-- Name: vivas_farm_tasks vivas_farm_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_farm_tasks
    ADD CONSTRAINT vivas_farm_tasks_pkey PRIMARY KEY (id);


--
-- Name: vivas_farms vivas_farms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_farms
    ADD CONSTRAINT vivas_farms_pkey PRIMARY KEY (id);


--
-- Name: vivas_file_storage vivas_file_storage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_file_storage
    ADD CONSTRAINT vivas_file_storage_pkey PRIMARY KEY (id);


--
-- Name: vivas_financial_budgets vivas_financial_budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_financial_budgets
    ADD CONSTRAINT vivas_financial_budgets_pkey PRIMARY KEY (id);


--
-- Name: vivas_financial_transactions vivas_financial_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_financial_transactions
    ADD CONSTRAINT vivas_financial_transactions_pkey PRIMARY KEY (id);


--
-- Name: vivas_financial_transactions vivas_financial_transactions_transaction_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_financial_transactions
    ADD CONSTRAINT vivas_financial_transactions_transaction_code_key UNIQUE (transaction_code);


--
-- Name: vivas_greenhouse_sows vivas_greenhouse_sows_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_greenhouse_sows
    ADD CONSTRAINT vivas_greenhouse_sows_pkey PRIMARY KEY (id);


--
-- Name: vivas_harvest_plans vivas_harvest_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_harvest_plans
    ADD CONSTRAINT vivas_harvest_plans_pkey PRIMARY KEY (id);


--
-- Name: vivas_harvest_stages vivas_harvest_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_harvest_stages
    ADD CONSTRAINT vivas_harvest_stages_pkey PRIMARY KEY (id);


--
-- Name: vivas_harvest_stages vivas_harvest_stages_stage_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_harvest_stages
    ADD CONSTRAINT vivas_harvest_stages_stage_name_key UNIQUE (stage_name);


--
-- Name: vivas_inputs_catalog vivas_inputs_catalog_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_inputs_catalog
    ADD CONSTRAINT vivas_inputs_catalog_pkey PRIMARY KEY (id);


--
-- Name: vivas_inputs_inventory vivas_inputs_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_inputs_inventory
    ADD CONSTRAINT vivas_inputs_inventory_pkey PRIMARY KEY (id);


--
-- Name: vivas_inputs_lots vivas_inputs_lots_lot_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_inputs_lots
    ADD CONSTRAINT vivas_inputs_lots_lot_number_key UNIQUE (lot_number);


--
-- Name: vivas_inputs_lots vivas_inputs_lots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_inputs_lots
    ADD CONSTRAINT vivas_inputs_lots_pkey PRIMARY KEY (id);


--
-- Name: vivas_labor_hours vivas_labor_hours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_labor_hours
    ADD CONSTRAINT vivas_labor_hours_pkey PRIMARY KEY (id);


--
-- Name: vivas_labor_settings vivas_labor_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_labor_settings
    ADD CONSTRAINT vivas_labor_settings_pkey PRIMARY KEY (id);


--
-- Name: vivas_labor_timesheets vivas_labor_timesheets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_labor_timesheets
    ADD CONSTRAINT vivas_labor_timesheets_pkey PRIMARY KEY (id);


--
-- Name: vivas_labor_workers vivas_labor_workers_employee_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_labor_workers
    ADD CONSTRAINT vivas_labor_workers_employee_code_key UNIQUE (employee_code);


--
-- Name: vivas_labor_workers vivas_labor_workers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_labor_workers
    ADD CONSTRAINT vivas_labor_workers_pkey PRIMARY KEY (id);


--
-- Name: vivas_labs vivas_labs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_labs
    ADD CONSTRAINT vivas_labs_pkey PRIMARY KEY (id);


--
-- Name: vivas_notes vivas_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_notes
    ADD CONSTRAINT vivas_notes_pkey PRIMARY KEY (id);


--
-- Name: vivas_order_items vivas_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_order_items
    ADD CONSTRAINT vivas_order_items_pkey PRIMARY KEY (id);


--
-- Name: vivas_orders vivas_orders_order_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_orders
    ADD CONSTRAINT vivas_orders_order_no_key UNIQUE (order_no);


--
-- Name: vivas_orders vivas_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_orders
    ADD CONSTRAINT vivas_orders_pkey PRIMARY KEY (id);


--
-- Name: vivas_pack_batches vivas_pack_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_pack_batches
    ADD CONSTRAINT vivas_pack_batches_pkey PRIMARY KEY (id);


--
-- Name: vivas_payment_methods vivas_payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_payment_methods
    ADD CONSTRAINT vivas_payment_methods_pkey PRIMARY KEY (id);


--
-- Name: vivas_plantings vivas_plantings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_plantings
    ADD CONSTRAINT vivas_plantings_pkey PRIMARY KEY (id);


--
-- Name: vivas_priority_onboarding_requests vivas_priority_onboarding_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_priority_onboarding_requests
    ADD CONSTRAINT vivas_priority_onboarding_requests_pkey PRIMARY KEY (id);


--
-- Name: vivas_purchase_order_items vivas_purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_purchase_order_items
    ADD CONSTRAINT vivas_purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: vivas_purchase_orders vivas_purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_purchase_orders
    ADD CONSTRAINT vivas_purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: vivas_purchase_orders vivas_purchase_orders_po_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_purchase_orders
    ADD CONSTRAINT vivas_purchase_orders_po_code_key UNIQUE (po_code);


--
-- Name: vivas_report_snapshots vivas_report_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_report_snapshots
    ADD CONSTRAINT vivas_report_snapshots_pkey PRIMARY KEY (id);


--
-- Name: vivas_sales_channels vivas_sales_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_sales_channels
    ADD CONSTRAINT vivas_sales_channels_pkey PRIMARY KEY (id);


--
-- Name: vivas_saved_reports vivas_saved_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_saved_reports
    ADD CONSTRAINT vivas_saved_reports_pkey PRIMARY KEY (id);


--
-- Name: vivas_seed_suppliers vivas_seed_suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_seed_suppliers
    ADD CONSTRAINT vivas_seed_suppliers_pkey PRIMARY KEY (id);


--
-- Name: vivas_seed_suppliers vivas_seed_suppliers_supplier_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_seed_suppliers
    ADD CONSTRAINT vivas_seed_suppliers_supplier_name_key UNIQUE (supplier_name);


--
-- Name: vivas_settings_api_tokens vivas_settings_api_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_api_tokens
    ADD CONSTRAINT vivas_settings_api_tokens_pkey PRIMARY KEY (id);


--
-- Name: vivas_settings_channel_mappings vivas_settings_channel_mappings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_channel_mappings
    ADD CONSTRAINT vivas_settings_channel_mappings_pkey PRIMARY KEY (id);


--
-- Name: vivas_settings_custom_fields vivas_settings_custom_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_custom_fields
    ADD CONSTRAINT vivas_settings_custom_fields_pkey PRIMARY KEY (id);


--
-- Name: vivas_settings_delivery_types vivas_settings_delivery_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_delivery_types
    ADD CONSTRAINT vivas_settings_delivery_types_pkey PRIMARY KEY (id);


--
-- Name: vivas_settings_farm_profile vivas_settings_farm_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_farm_profile
    ADD CONSTRAINT vivas_settings_farm_profile_pkey PRIMARY KEY (id);


--
-- Name: vivas_settings_labels vivas_settings_labels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_labels
    ADD CONSTRAINT vivas_settings_labels_pkey PRIMARY KEY (id);


--
-- Name: vivas_settings_notifications vivas_settings_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_notifications
    ADD CONSTRAINT vivas_settings_notifications_pkey PRIMARY KEY (id);


--
-- Name: vivas_settings_online_store vivas_settings_online_store_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_online_store
    ADD CONSTRAINT vivas_settings_online_store_pkey PRIMARY KEY (id);


--
-- Name: vivas_settings_payment_processors vivas_settings_payment_processors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_payment_processors
    ADD CONSTRAINT vivas_settings_payment_processors_pkey PRIMARY KEY (id);


--
-- Name: vivas_settings_pickup_locations vivas_settings_pickup_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_pickup_locations
    ADD CONSTRAINT vivas_settings_pickup_locations_pkey PRIMARY KEY (id);


--
-- Name: vivas_settings_planting_id vivas_settings_planting_id_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_planting_id
    ADD CONSTRAINT vivas_settings_planting_id_pkey PRIMARY KEY (id);


--
-- Name: vivas_settings_product vivas_settings_product_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_product
    ADD CONSTRAINT vivas_settings_product_pkey PRIMARY KEY (id);


--
-- Name: vivas_settings_roles vivas_settings_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_roles
    ADD CONSTRAINT vivas_settings_roles_pkey PRIMARY KEY (id);


--
-- Name: vivas_settings_task_types vivas_settings_task_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_task_types
    ADD CONSTRAINT vivas_settings_task_types_pkey PRIMARY KEY (id);


--
-- Name: vivas_settings_time_attendance vivas_settings_time_attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_time_attendance
    ADD CONSTRAINT vivas_settings_time_attendance_pkey PRIMARY KEY (id);


--
-- Name: vivas_settings_webhooks vivas_settings_webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_webhooks
    ADD CONSTRAINT vivas_settings_webhooks_pkey PRIMARY KEY (id);


--
-- Name: vivas_shopping_list vivas_shopping_list_item_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_shopping_list
    ADD CONSTRAINT vivas_shopping_list_item_code_key UNIQUE (item_code);


--
-- Name: vivas_shopping_list vivas_shopping_list_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_shopping_list
    ADD CONSTRAINT vivas_shopping_list_pkey PRIMARY KEY (id);


--
-- Name: vivas_soil_tests vivas_soil_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_soil_tests
    ADD CONSTRAINT vivas_soil_tests_pkey PRIMARY KEY (id);


--
-- Name: vivas_storage_addons vivas_storage_addons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_storage_addons
    ADD CONSTRAINT vivas_storage_addons_pkey PRIMARY KEY (id);


--
-- Name: vivas_user_farms vivas_user_farms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_user_farms
    ADD CONSTRAINT vivas_user_farms_pkey PRIMARY KEY (id);


--
-- Name: vivas_user_farms vivas_user_farms_user_id_farm_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_user_farms
    ADD CONSTRAINT vivas_user_farms_user_id_farm_id_key UNIQUE (user_id, farm_id);


--
-- Name: vivas_users vivas_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_users
    ADD CONSTRAINT vivas_users_email_key UNIQUE (email);


--
-- Name: vivas_users vivas_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_users
    ADD CONSTRAINT vivas_users_pkey PRIMARY KEY (id);


--
-- Name: vivas_vendors vivas_vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_vendors
    ADD CONSTRAINT vivas_vendors_pkey PRIMARY KEY (id);


--
-- Name: vivas_vendors vivas_vendors_vendor_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_vendors
    ADD CONSTRAINT vivas_vendors_vendor_code_key UNIQUE (vendor_code);


--
-- Name: vivas_widget_configs vivas_widget_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_widget_configs
    ADD CONSTRAINT vivas_widget_configs_pkey PRIMARY KEY (id);


--
-- Name: vivas_widget_configs vivas_widget_configs_widget_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_widget_configs
    ADD CONSTRAINT vivas_widget_configs_widget_key_key UNIQUE (widget_key);


--
-- Name: idx_po_items_po_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_items_po_id ON public.vivas_purchase_order_items USING btree (po_id);


--
-- Name: idx_po_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_status ON public.vivas_purchase_orders USING btree (status);


--
-- Name: idx_po_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_po_vendor_id ON public.vivas_purchase_orders USING btree (vendor_id);


--
-- Name: idx_saved_reports_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saved_reports_category ON public.vivas_saved_reports USING btree (category);


--
-- Name: idx_saved_reports_favorite; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_saved_reports_favorite ON public.vivas_saved_reports USING btree (is_favorite);


--
-- Name: idx_shopping_list_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_list_category ON public.vivas_shopping_list USING btree (category);


--
-- Name: idx_shopping_list_priority; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_list_priority ON public.vivas_shopping_list USING btree (priority);


--
-- Name: idx_shopping_list_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_shopping_list_status ON public.vivas_shopping_list USING btree (status);


--
-- Name: ix_ch_ai_req_case; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ch_ai_req_case ON public.ch_ai_request USING btree (case_id);


--
-- Name: ix_ch_alert_farm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ch_alert_farm ON public.ch_alert USING btree (farm_id, status, created_at DESC);


--
-- Name: ix_ch_case_crop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ch_case_crop ON public.ch_case USING btree (crop_id, confirmed_problem_id);


--
-- Name: ix_ch_case_farm_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ch_case_farm_status ON public.ch_case USING btree (farm_id, status) WHERE (deleted_at IS NULL);


--
-- Name: ix_ch_case_planting; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ch_case_planting ON public.ch_case USING btree (planting_id);


--
-- Name: ix_ch_control_problem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ch_control_problem ON public.ch_control_measure USING btree (problem_id, crop_id);


--
-- Name: ix_ch_diag_case; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ch_diag_case ON public.ch_case_diagnosis USING btree (case_id, rank);


--
-- Name: ix_ch_lookup_list; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ch_lookup_list ON public.ch_lookup USING btree (list_code, is_active, sort_order);


--
-- Name: ix_ch_media_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ch_media_owner ON public.ch_media USING btree (owner_type, owner_id);


--
-- Name: ix_ch_problem_crop_crop; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ch_problem_crop_crop ON public.ch_problem_crop USING btree (crop_id);


--
-- Name: ix_ch_problem_farm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ch_problem_farm ON public.ch_problem USING btree (farm_id) WHERE (farm_id IS NOT NULL);


--
-- Name: ix_ch_problem_type_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ch_problem_type_status ON public.ch_problem USING btree (problem_type, status) WHERE (deleted_at IS NULL);


--
-- Name: ix_ch_treat_case; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_ch_treat_case ON public.ch_case_treatment USING btree (case_id);


--
-- Name: ix_pih_ai_inferences_ai_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_ai_inferences_ai_request_id ON public.pih_ai_inferences USING btree (ai_request_id);


--
-- Name: ix_pih_ai_inferences_crop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_ai_inferences_crop_id ON public.pih_ai_inferences USING btree (crop_id);


--
-- Name: ix_pih_ai_inferences_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_ai_inferences_product_id ON public.pih_ai_inferences USING btree (product_id);


--
-- Name: ix_pih_ai_inferences_region_season; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_ai_inferences_region_season ON public.pih_ai_inferences USING btree (state, district, season);


--
-- Name: ix_pih_ai_inferences_reviewed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_ai_inferences_reviewed_by ON public.pih_ai_inferences USING btree (reviewed_by);


--
-- Name: ix_pih_api_keys_key_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_api_keys_key_hash ON public.pih_api_keys USING btree (key_hash);


--
-- Name: ix_pih_api_keys_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_api_keys_partner_id ON public.pih_api_keys USING btree (partner_id);


--
-- Name: ix_pih_audit_log_actor_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_audit_log_actor_partner_id ON public.pih_audit_log USING btree (actor_partner_id);


--
-- Name: ix_pih_audit_log_actor_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_audit_log_actor_user_id ON public.pih_audit_log USING btree (actor_user_id);


--
-- Name: ix_pih_audit_log_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_audit_log_entity ON public.pih_audit_log USING btree (entity, entity_id);


--
-- Name: ix_pih_audit_log_idempotency_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_audit_log_idempotency_key ON public.pih_audit_log USING btree (idempotency_key) WHERE (idempotency_key IS NOT NULL);


--
-- Name: ix_pih_cart_items_cart_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_cart_items_cart_id ON public.pih_cart_items USING btree (cart_id);


--
-- Name: ix_pih_cart_items_recommendation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_cart_items_recommendation_id ON public.pih_cart_items USING btree (recommendation_id);


--
-- Name: ix_pih_cart_items_sku_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_cart_items_sku_id ON public.pih_cart_items USING btree (sku_id);


--
-- Name: ix_pih_carts_farm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_carts_farm_id ON public.pih_carts USING btree (farm_id);


--
-- Name: ix_pih_carts_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_carts_partner_id ON public.pih_carts USING btree (partner_id);


--
-- Name: ix_pih_carts_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_carts_user_id ON public.pih_carts USING btree (user_id);


--
-- Name: ix_pih_data_sharing_consents_farm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_data_sharing_consents_farm_id ON public.pih_data_sharing_consents USING btree (farm_id);


--
-- Name: ix_pih_data_sharing_consents_granted_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_data_sharing_consents_granted_by ON public.pih_data_sharing_consents USING btree (granted_by);


--
-- Name: ix_pih_field_trials_crop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_field_trials_crop_id ON public.pih_field_trials USING btree (crop_id);


--
-- Name: ix_pih_field_trials_farm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_field_trials_farm_id ON public.pih_field_trials USING btree (farm_id);


--
-- Name: ix_pih_field_trials_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_field_trials_partner_id ON public.pih_field_trials USING btree (partner_id);


--
-- Name: ix_pih_field_trials_planting_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_field_trials_planting_id ON public.pih_field_trials USING btree (planting_id);


--
-- Name: ix_pih_field_trials_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_field_trials_product_id ON public.pih_field_trials USING btree (product_id);


--
-- Name: ix_pih_field_trials_sme_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_field_trials_sme_by ON public.pih_field_trials USING btree (sme_by);


--
-- Name: ix_pih_import_batches_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_import_batches_partner_id ON public.pih_import_batches USING btree (partner_id);


--
-- Name: ix_pih_import_errors_batch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_import_errors_batch_id ON public.pih_import_errors USING btree (batch_id);


--
-- Name: ix_pih_jobs_status_run_after; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_jobs_status_run_after ON public.pih_jobs USING btree (status, run_after);


--
-- Name: ix_pih_notifications_farm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_notifications_farm_id ON public.pih_notifications USING btree (farm_id);


--
-- Name: ix_pih_notifications_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_notifications_partner_id ON public.pih_notifications USING btree (partner_id);


--
-- Name: ix_pih_notifications_recipient_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_notifications_recipient_user_id ON public.pih_notifications USING btree (recipient_user_id);


--
-- Name: ix_pih_order_status_history_changed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_order_status_history_changed_by ON public.pih_order_status_history USING btree (changed_by);


--
-- Name: ix_pih_order_status_history_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_order_status_history_order_id ON public.pih_order_status_history USING btree (order_id);


--
-- Name: ix_pih_partner_documents_expires_on; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_partner_documents_expires_on ON public.pih_partner_documents USING btree (expires_on);


--
-- Name: ix_pih_partner_documents_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_partner_documents_partner_id ON public.pih_partner_documents USING btree (partner_id);


--
-- Name: ix_pih_partner_documents_reviewed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_partner_documents_reviewed_by ON public.pih_partner_documents USING btree (reviewed_by);


--
-- Name: ix_pih_partner_documents_type_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_partner_documents_type_status ON public.pih_partner_documents USING btree (partner_id, doc_type, review_status);


--
-- Name: ix_pih_partner_users_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_partner_users_partner_id ON public.pih_partner_users USING btree (partner_id);


--
-- Name: ix_pih_partner_users_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_partner_users_user_id ON public.pih_partner_users USING btree (user_id);


--
-- Name: ix_pih_partners_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_partners_status ON public.pih_partners USING btree (status) WHERE (deleted_at IS NULL);


--
-- Name: ix_pih_partners_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_partners_type ON public.pih_partners USING btree (partner_type) WHERE (deleted_at IS NULL);


--
-- Name: ix_pih_partners_verified_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_partners_verified_by ON public.pih_partners USING btree (verified_by);


--
-- Name: ix_pih_product_claims_crop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_product_claims_crop_id ON public.pih_product_claims USING btree (crop_id);


--
-- Name: ix_pih_product_claims_problem_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_product_claims_problem_id ON public.pih_product_claims USING btree (problem_id);


--
-- Name: ix_pih_product_claims_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_product_claims_product_id ON public.pih_product_claims USING btree (product_id);


--
-- Name: ix_pih_product_claims_sme_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_product_claims_sme_by ON public.pih_product_claims USING btree (sme_by);


--
-- Name: ix_pih_product_claims_sme_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_product_claims_sme_status ON public.pih_product_claims USING btree (sme_status);


--
-- Name: ix_pih_product_composition_nutrient_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_product_composition_nutrient_code ON public.pih_product_composition USING btree (nutrient_code);


--
-- Name: ix_pih_product_composition_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_product_composition_product_id ON public.pih_product_composition USING btree (product_id);


--
-- Name: ix_pih_product_crop_suit_crop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_product_crop_suit_crop_id ON public.pih_product_crop_suitability USING btree (crop_id);


--
-- Name: ix_pih_product_crop_suit_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_product_crop_suit_product_id ON public.pih_product_crop_suitability USING btree (product_id);


--
-- Name: ix_pih_product_crop_suit_variety_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_product_crop_suit_variety_id ON public.pih_product_crop_suitability USING btree (variety_id);


--
-- Name: ix_pih_product_media_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_product_media_product_id ON public.pih_product_media USING btree (product_id);


--
-- Name: ix_pih_product_ratings_crop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_product_ratings_crop_id ON public.pih_product_ratings USING btree (crop_id);


--
-- Name: ix_pih_product_ratings_latest; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_product_ratings_latest ON public.pih_product_ratings USING btree (product_id, crop_id, computed_at DESC);


--
-- Name: ix_pih_product_ratings_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_product_ratings_product_id ON public.pih_product_ratings USING btree (product_id);


--
-- Name: ix_pih_product_skus_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_product_skus_product_id ON public.pih_product_skus USING btree (product_id);


--
-- Name: ix_pih_products_approved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_products_approved_by ON public.pih_products USING btree (approved_by);


--
-- Name: ix_pih_products_organic; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_products_organic ON public.pih_products USING btree (is_organic) WHERE (deleted_at IS NULL);


--
-- Name: ix_pih_products_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_products_partner_id ON public.pih_products USING btree (partner_id);


--
-- Name: ix_pih_products_type_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_products_type_status ON public.pih_products USING btree (product_type, status) WHERE (deleted_at IS NULL);


--
-- Name: ix_pih_recommendations_ai_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_recommendations_ai_request_id ON public.pih_recommendations USING btree (ai_request_id);


--
-- Name: ix_pih_recommendations_alert_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_recommendations_alert_id ON public.pih_recommendations USING btree (alert_id);


--
-- Name: ix_pih_recommendations_case_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_recommendations_case_id ON public.pih_recommendations USING btree (case_id);


--
-- Name: ix_pih_recommendations_crop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_recommendations_crop_id ON public.pih_recommendations USING btree (crop_id);


--
-- Name: ix_pih_recommendations_farm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_recommendations_farm_id ON public.pih_recommendations USING btree (farm_id);


--
-- Name: ix_pih_recommendations_problem_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_recommendations_problem_id ON public.pih_recommendations USING btree (problem_id);


--
-- Name: ix_pih_recommendations_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_recommendations_product_id ON public.pih_recommendations USING btree (product_id);


--
-- Name: ix_pih_recommendations_sku_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_recommendations_sku_id ON public.pih_recommendations USING btree (sku_id);


--
-- Name: ix_pih_recommendations_soil_test_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_recommendations_soil_test_id ON public.pih_recommendations USING btree (soil_test_id);


--
-- Name: ix_pih_reviews_farm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_reviews_farm_id ON public.pih_reviews USING btree (farm_id);


--
-- Name: ix_pih_reviews_outcome_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_reviews_outcome_id ON public.pih_reviews USING btree (outcome_id);


--
-- Name: ix_pih_reviews_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_reviews_product_id ON public.pih_reviews USING btree (product_id);


--
-- Name: ix_pih_reviews_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_reviews_user_id ON public.pih_reviews USING btree (user_id);


--
-- Name: ix_pih_settlements_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_settlements_partner_id ON public.pih_settlements USING btree (partner_id);


--
-- Name: ix_pih_store_order_items_inputs_lot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_store_order_items_inputs_lot_id ON public.pih_store_order_items USING btree (inputs_lot_id);


--
-- Name: ix_pih_store_order_items_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_store_order_items_order_id ON public.pih_store_order_items USING btree (order_id);


--
-- Name: ix_pih_store_order_items_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_store_order_items_product_id ON public.pih_store_order_items USING btree (product_id);


--
-- Name: ix_pih_store_order_items_sku_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_store_order_items_sku_id ON public.pih_store_order_items USING btree (sku_id);


--
-- Name: ix_pih_store_orders_farm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_store_orders_farm_id ON public.pih_store_orders USING btree (farm_id);


--
-- Name: ix_pih_store_orders_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_store_orders_partner_id ON public.pih_store_orders USING btree (partner_id);


--
-- Name: ix_pih_store_orders_purchase_order_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_store_orders_purchase_order_id ON public.pih_store_orders USING btree (purchase_order_id);


--
-- Name: ix_pih_store_orders_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_store_orders_status ON public.pih_store_orders USING btree (status);


--
-- Name: ix_pih_store_orders_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_store_orders_user_id ON public.pih_store_orders USING btree (user_id);


--
-- Name: ix_pih_store_orders_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_store_orders_vendor_id ON public.pih_store_orders USING btree (vendor_id);


--
-- Name: ix_pih_stores_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_stores_partner_id ON public.pih_stores USING btree (partner_id);


--
-- Name: ix_pih_stores_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_stores_slug ON public.pih_stores USING btree (slug);


--
-- Name: ix_pih_treatment_outcomes_case_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_treatment_outcomes_case_id ON public.pih_treatment_outcomes USING btree (case_id);


--
-- Name: ix_pih_treatment_outcomes_case_treatment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_treatment_outcomes_case_treatment_id ON public.pih_treatment_outcomes USING btree (case_treatment_id);


--
-- Name: ix_pih_treatment_outcomes_crop_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_treatment_outcomes_crop_id ON public.pih_treatment_outcomes USING btree (crop_id);


--
-- Name: ix_pih_treatment_outcomes_district; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_treatment_outcomes_district ON public.pih_treatment_outcomes USING btree (state, district);


--
-- Name: ix_pih_treatment_outcomes_farm_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_treatment_outcomes_farm_id ON public.pih_treatment_outcomes USING btree (farm_id);


--
-- Name: ix_pih_treatment_outcomes_lot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_treatment_outcomes_lot_id ON public.pih_treatment_outcomes USING btree (lot_id);


--
-- Name: ix_pih_treatment_outcomes_planting_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_treatment_outcomes_planting_id ON public.pih_treatment_outcomes USING btree (planting_id);


--
-- Name: ix_pih_treatment_outcomes_product_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_treatment_outcomes_product_id ON public.pih_treatment_outcomes USING btree (product_id);


--
-- Name: ix_pih_treatment_outcomes_sku_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_treatment_outcomes_sku_id ON public.pih_treatment_outcomes USING btree (sku_id);


--
-- Name: ix_pih_trial_observations_observed_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_trial_observations_observed_by ON public.pih_trial_observations USING btree (observed_by);


--
-- Name: ix_pih_trial_observations_trial_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_trial_observations_trial_id ON public.pih_trial_observations USING btree (trial_id);


--
-- Name: ix_pih_webhook_deliveries_retry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_webhook_deliveries_retry ON public.pih_webhook_deliveries USING btree (status, next_retry_at);


--
-- Name: ix_pih_webhook_deliveries_webhook_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_webhook_deliveries_webhook_id ON public.pih_webhook_deliveries USING btree (webhook_id);


--
-- Name: ix_pih_webhooks_partner_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pih_webhooks_partner_id ON public.pih_webhooks USING btree (partner_id);


--
-- Name: ux_ch_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ux_ch_lookup ON public.ch_lookup USING btree (list_code, code, COALESCE(farm_id, '00000000-0000-0000-0000-000000000000'::uuid));


--
-- Name: ch_case trg_ch_case_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ch_case_upd BEFORE UPDATE ON public.ch_case FOR EACH ROW EXECUTE FUNCTION public.ch_touch_updated_at();


--
-- Name: ch_problem trg_ch_problem_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ch_problem_upd BEFORE UPDATE ON public.ch_problem FOR EACH ROW EXECUTE FUNCTION public.ch_touch_updated_at();


--
-- Name: pih_ai_inferences trg_pih_ai_inferences_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_ai_inferences_upd BEFORE UPDATE ON public.pih_ai_inferences FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_api_keys trg_pih_api_keys_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_api_keys_upd BEFORE UPDATE ON public.pih_api_keys FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_audit_log trg_pih_audit_log_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_audit_log_upd BEFORE UPDATE ON public.pih_audit_log FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_cart_items trg_pih_cart_items_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_cart_items_upd BEFORE UPDATE ON public.pih_cart_items FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_carts trg_pih_carts_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_carts_upd BEFORE UPDATE ON public.pih_carts FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_data_sharing_consents trg_pih_data_sharing_consents_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_data_sharing_consents_upd BEFORE UPDATE ON public.pih_data_sharing_consents FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_field_trials trg_pih_field_trials_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_field_trials_upd BEFORE UPDATE ON public.pih_field_trials FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_import_batches trg_pih_import_batches_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_import_batches_upd BEFORE UPDATE ON public.pih_import_batches FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_import_errors trg_pih_import_errors_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_import_errors_upd BEFORE UPDATE ON public.pih_import_errors FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_jobs trg_pih_jobs_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_jobs_upd BEFORE UPDATE ON public.pih_jobs FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_notifications trg_pih_notifications_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_notifications_upd BEFORE UPDATE ON public.pih_notifications FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_order_status_history trg_pih_order_status_history_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_order_status_history_upd BEFORE UPDATE ON public.pih_order_status_history FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_partner_documents trg_pih_partner_documents_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_partner_documents_upd BEFORE UPDATE ON public.pih_partner_documents FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_partner_users trg_pih_partner_users_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_partner_users_upd BEFORE UPDATE ON public.pih_partner_users FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_partners trg_pih_partners_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_partners_upd BEFORE UPDATE ON public.pih_partners FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_product_claims trg_pih_product_claims_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_product_claims_upd BEFORE UPDATE ON public.pih_product_claims FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_product_composition trg_pih_product_composition_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_product_composition_upd BEFORE UPDATE ON public.pih_product_composition FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_product_crop_suitability trg_pih_product_crop_suitability_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_product_crop_suitability_upd BEFORE UPDATE ON public.pih_product_crop_suitability FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_product_media trg_pih_product_media_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_product_media_upd BEFORE UPDATE ON public.pih_product_media FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_product_ratings trg_pih_product_ratings_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_product_ratings_upd BEFORE UPDATE ON public.pih_product_ratings FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_product_skus trg_pih_product_skus_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_product_skus_upd BEFORE UPDATE ON public.pih_product_skus FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_products trg_pih_products_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_products_upd BEFORE UPDATE ON public.pih_products FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_recommendations trg_pih_recommendations_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_recommendations_upd BEFORE UPDATE ON public.pih_recommendations FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_reviews trg_pih_reviews_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_reviews_upd BEFORE UPDATE ON public.pih_reviews FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_settlements trg_pih_settlements_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_settlements_upd BEFORE UPDATE ON public.pih_settlements FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_store_order_items trg_pih_store_order_items_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_store_order_items_upd BEFORE UPDATE ON public.pih_store_order_items FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_store_orders trg_pih_store_orders_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_store_orders_upd BEFORE UPDATE ON public.pih_store_orders FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_stores trg_pih_stores_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_stores_upd BEFORE UPDATE ON public.pih_stores FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_sync_state trg_pih_sync_state_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_sync_state_upd BEFORE UPDATE ON public.pih_sync_state FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_treatment_outcomes trg_pih_treatment_outcomes_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_treatment_outcomes_upd BEFORE UPDATE ON public.pih_treatment_outcomes FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_trial_observations trg_pih_trial_observations_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_trial_observations_upd BEFORE UPDATE ON public.pih_trial_observations FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_webhook_deliveries trg_pih_webhook_deliveries_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_webhook_deliveries_upd BEFORE UPDATE ON public.pih_webhook_deliveries FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: pih_webhooks trg_pih_webhooks_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pih_webhooks_upd BEFORE UPDATE ON public.pih_webhooks FOR EACH ROW EXECUTE FUNCTION public.pih_touch_updated_at();


--
-- Name: ch_ai_feedback ch_ai_feedback_correct_problem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_ai_feedback
    ADD CONSTRAINT ch_ai_feedback_correct_problem_id_fkey FOREIGN KEY (correct_problem_id) REFERENCES public.ch_problem(id);


--
-- Name: ch_ai_feedback ch_ai_feedback_diagnosis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_ai_feedback
    ADD CONSTRAINT ch_ai_feedback_diagnosis_id_fkey FOREIGN KEY (diagnosis_id) REFERENCES public.ch_case_diagnosis(id) ON DELETE CASCADE;


--
-- Name: ch_ai_feedback ch_ai_feedback_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_ai_feedback
    ADD CONSTRAINT ch_ai_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.vivas_users(id);


--
-- Name: ch_ai_request ch_ai_request_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_ai_request
    ADD CONSTRAINT ch_ai_request_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.ch_case(id) ON DELETE SET NULL;


--
-- Name: ch_ai_request ch_ai_request_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_ai_request
    ADD CONSTRAINT ch_ai_request_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id);


--
-- Name: ch_ai_request ch_ai_request_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_ai_request
    ADD CONSTRAINT ch_ai_request_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.vivas_users(id);


--
-- Name: ch_alert ch_alert_acknowledged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_alert
    ADD CONSTRAINT ch_alert_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES public.vivas_users(id);


--
-- Name: ch_alert ch_alert_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_alert
    ADD CONSTRAINT ch_alert_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id);


--
-- Name: ch_alert ch_alert_planting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_alert
    ADD CONSTRAINT ch_alert_planting_id_fkey FOREIGN KEY (planting_id) REFERENCES public.vivas_plantings(id);


--
-- Name: ch_alert ch_alert_problem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_alert
    ADD CONSTRAINT ch_alert_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.ch_problem(id);


--
-- Name: ch_alert ch_alert_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_alert
    ADD CONSTRAINT ch_alert_rule_id_fkey FOREIGN KEY (rule_id) REFERENCES public.ch_risk_rule(id);


--
-- Name: ch_case ch_case_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case
    ADD CONSTRAINT ch_case_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.vivas_users(id);


--
-- Name: ch_case ch_case_confirmed_problem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case
    ADD CONSTRAINT ch_case_confirmed_problem_id_fkey FOREIGN KEY (confirmed_problem_id) REFERENCES public.ch_problem(id);


--
-- Name: ch_case ch_case_crop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case
    ADD CONSTRAINT ch_case_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.vivas_crops(id);


--
-- Name: ch_case_diagnosis ch_case_diagnosis_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case_diagnosis
    ADD CONSTRAINT ch_case_diagnosis_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.ch_case(id) ON DELETE CASCADE;


--
-- Name: ch_case_diagnosis ch_case_diagnosis_confirmed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case_diagnosis
    ADD CONSTRAINT ch_case_diagnosis_confirmed_by_fkey FOREIGN KEY (confirmed_by) REFERENCES public.vivas_users(id);


--
-- Name: ch_case_diagnosis ch_case_diagnosis_problem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case_diagnosis
    ADD CONSTRAINT ch_case_diagnosis_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.ch_problem(id);


--
-- Name: ch_case ch_case_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case
    ADD CONSTRAINT ch_case_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id);


--
-- Name: ch_case_followup ch_case_followup_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case_followup
    ADD CONSTRAINT ch_case_followup_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.ch_case(id) ON DELETE CASCADE;


--
-- Name: ch_case_followup ch_case_followup_observed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case_followup
    ADD CONSTRAINT ch_case_followup_observed_by_fkey FOREIGN KEY (observed_by) REFERENCES public.vivas_users(id);


--
-- Name: ch_case_note ch_case_note_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case_note
    ADD CONSTRAINT ch_case_note_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.ch_case(id) ON DELETE CASCADE;


--
-- Name: ch_case_note ch_case_note_note_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case_note
    ADD CONSTRAINT ch_case_note_note_id_fkey FOREIGN KEY (note_id) REFERENCES public.vivas_notes(id) ON DELETE CASCADE;


--
-- Name: ch_case_plant_part ch_case_plant_part_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case_plant_part
    ADD CONSTRAINT ch_case_plant_part_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.ch_case(id) ON DELETE CASCADE;


--
-- Name: ch_case_plant_part ch_case_plant_part_plant_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case_plant_part
    ADD CONSTRAINT ch_case_plant_part_plant_part_id_fkey FOREIGN KEY (plant_part_id) REFERENCES public.ch_lookup(id);


--
-- Name: ch_case ch_case_planting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case
    ADD CONSTRAINT ch_case_planting_id_fkey FOREIGN KEY (planting_id) REFERENCES public.vivas_plantings(id);


--
-- Name: ch_case ch_case_reported_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case
    ADD CONSTRAINT ch_case_reported_by_fkey FOREIGN KEY (reported_by) REFERENCES public.vivas_users(id);


--
-- Name: ch_case ch_case_suspected_problem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case
    ADD CONSTRAINT ch_case_suspected_problem_id_fkey FOREIGN KEY (suspected_problem_id) REFERENCES public.ch_problem(id);


--
-- Name: ch_case_symptom ch_case_symptom_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case_symptom
    ADD CONSTRAINT ch_case_symptom_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.ch_case(id) ON DELETE CASCADE;


--
-- Name: ch_case_symptom ch_case_symptom_symptom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case_symptom
    ADD CONSTRAINT ch_case_symptom_symptom_id_fkey FOREIGN KEY (symptom_id) REFERENCES public.ch_symptom(id);


--
-- Name: ch_case_treatment ch_case_treatment_application_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case_treatment
    ADD CONSTRAINT ch_case_treatment_application_method_id_fkey FOREIGN KEY (application_method_id) REFERENCES public.ch_lookup(id);


--
-- Name: ch_case_treatment ch_case_treatment_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case_treatment
    ADD CONSTRAINT ch_case_treatment_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.ch_case(id) ON DELETE CASCADE;


--
-- Name: ch_case_treatment ch_case_treatment_control_measure_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case_treatment
    ADD CONSTRAINT ch_case_treatment_control_measure_id_fkey FOREIGN KEY (control_measure_id) REFERENCES public.ch_control_measure(id);


--
-- Name: ch_case_treatment ch_case_treatment_dose_basis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case_treatment
    ADD CONSTRAINT ch_case_treatment_dose_basis_id_fkey FOREIGN KEY (dose_basis_id) REFERENCES public.ch_lookup(id);


--
-- Name: ch_case_treatment ch_case_treatment_dose_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case_treatment
    ADD CONSTRAINT ch_case_treatment_dose_unit_id_fkey FOREIGN KEY (dose_unit_id) REFERENCES public.ch_lookup(id);


--
-- Name: ch_case_treatment ch_case_treatment_input_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case_treatment
    ADD CONSTRAINT ch_case_treatment_input_id_fkey FOREIGN KEY (input_id) REFERENCES public.vivas_inputs_catalog(id);


--
-- Name: ch_case_treatment ch_case_treatment_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case_treatment
    ADD CONSTRAINT ch_case_treatment_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.vivas_farm_tasks(id);


--
-- Name: ch_case ch_case_variety_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_case
    ADD CONSTRAINT ch_case_variety_id_fkey FOREIGN KEY (variety_id) REFERENCES public.vivas_crop_varieties(id);


--
-- Name: ch_control_measure ch_control_measure_application_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_control_measure
    ADD CONSTRAINT ch_control_measure_application_method_id_fkey FOREIGN KEY (application_method_id) REFERENCES public.ch_lookup(id);


--
-- Name: ch_control_measure ch_control_measure_crop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_control_measure
    ADD CONSTRAINT ch_control_measure_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.vivas_crops(id);


--
-- Name: ch_control_measure ch_control_measure_dose_basis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_control_measure
    ADD CONSTRAINT ch_control_measure_dose_basis_id_fkey FOREIGN KEY (dose_basis_id) REFERENCES public.ch_lookup(id);


--
-- Name: ch_control_measure ch_control_measure_dose_unit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_control_measure
    ADD CONSTRAINT ch_control_measure_dose_unit_id_fkey FOREIGN KEY (dose_unit_id) REFERENCES public.ch_lookup(id);


--
-- Name: ch_control_measure ch_control_measure_input_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_control_measure
    ADD CONSTRAINT ch_control_measure_input_id_fkey FOREIGN KEY (input_id) REFERENCES public.vivas_inputs_catalog(id);


--
-- Name: ch_control_measure ch_control_measure_problem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_control_measure
    ADD CONSTRAINT ch_control_measure_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.ch_problem(id) ON DELETE CASCADE;


--
-- Name: ch_import_batch ch_import_batch_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_import_batch
    ADD CONSTRAINT ch_import_batch_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id);


--
-- Name: ch_import_batch ch_import_batch_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_import_batch
    ADD CONSTRAINT ch_import_batch_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.vivas_users(id);


--
-- Name: ch_import_error ch_import_error_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_import_error
    ADD CONSTRAINT ch_import_error_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.ch_import_batch(id) ON DELETE CASCADE;


--
-- Name: ch_lifecycle_stage ch_lifecycle_stage_problem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_lifecycle_stage
    ADD CONSTRAINT ch_lifecycle_stage_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.ch_problem(id) ON DELETE CASCADE;


--
-- Name: ch_lifecycle_stage ch_lifecycle_stage_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_lifecycle_stage
    ADD CONSTRAINT ch_lifecycle_stage_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.ch_lookup(id);


--
-- Name: ch_lookup ch_lookup_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_lookup
    ADD CONSTRAINT ch_lookup_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id);


--
-- Name: ch_media ch_media_image_label_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_media
    ADD CONSTRAINT ch_media_image_label_id_fkey FOREIGN KEY (image_label_id) REFERENCES public.ch_lookup(id);


--
-- Name: ch_media ch_media_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_media
    ADD CONSTRAINT ch_media_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.vivas_users(id);


--
-- Name: ch_problem_attr ch_problem_attr_lookup_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_problem_attr
    ADD CONSTRAINT ch_problem_attr_lookup_id_fkey FOREIGN KEY (lookup_id) REFERENCES public.ch_lookup(id);


--
-- Name: ch_problem_attr ch_problem_attr_problem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_problem_attr
    ADD CONSTRAINT ch_problem_attr_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.ch_problem(id) ON DELETE CASCADE;


--
-- Name: ch_problem ch_problem_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_problem
    ADD CONSTRAINT ch_problem_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.ch_lookup(id);


--
-- Name: ch_problem ch_problem_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_problem
    ADD CONSTRAINT ch_problem_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.vivas_users(id);


--
-- Name: ch_problem_crop ch_problem_crop_crop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_problem_crop
    ADD CONSTRAINT ch_problem_crop_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.vivas_crops(id);


--
-- Name: ch_problem_crop ch_problem_crop_problem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_problem_crop
    ADD CONSTRAINT ch_problem_crop_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.ch_problem(id) ON DELETE CASCADE;


--
-- Name: ch_problem ch_problem_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_problem
    ADD CONSTRAINT ch_problem_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id);


--
-- Name: ch_problem ch_problem_nutrient_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_problem
    ADD CONSTRAINT ch_problem_nutrient_code_fkey FOREIGN KEY (nutrient_code) REFERENCES public.ch_nutrient(code);


--
-- Name: ch_problem ch_problem_pest_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_problem
    ADD CONSTRAINT ch_problem_pest_type_id_fkey FOREIGN KEY (pest_type_id) REFERENCES public.ch_lookup(id);


--
-- Name: ch_problem_review ch_problem_review_problem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_problem_review
    ADD CONSTRAINT ch_problem_review_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.ch_problem(id) ON DELETE CASCADE;


--
-- Name: ch_problem_review ch_problem_review_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_problem_review
    ADD CONSTRAINT ch_problem_review_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.vivas_users(id);


--
-- Name: ch_problem_symptom ch_problem_symptom_problem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_problem_symptom
    ADD CONSTRAINT ch_problem_symptom_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.ch_problem(id) ON DELETE CASCADE;


--
-- Name: ch_problem_symptom ch_problem_symptom_symptom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_problem_symptom
    ADD CONSTRAINT ch_problem_symptom_symptom_id_fkey FOREIGN KEY (symptom_id) REFERENCES public.ch_symptom(id);


--
-- Name: ch_problem ch_problem_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_problem
    ADD CONSTRAINT ch_problem_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.vivas_users(id);


--
-- Name: ch_problem_version ch_problem_version_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_problem_version
    ADD CONSTRAINT ch_problem_version_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.vivas_users(id);


--
-- Name: ch_problem_version ch_problem_version_problem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_problem_version
    ADD CONSTRAINT ch_problem_version_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.ch_problem(id) ON DELETE CASCADE;


--
-- Name: ch_resistant_variety ch_resistant_variety_crop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_resistant_variety
    ADD CONSTRAINT ch_resistant_variety_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.vivas_crops(id);


--
-- Name: ch_resistant_variety ch_resistant_variety_problem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_resistant_variety
    ADD CONSTRAINT ch_resistant_variety_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.ch_problem(id) ON DELETE CASCADE;


--
-- Name: ch_resistant_variety ch_resistant_variety_variety_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_resistant_variety
    ADD CONSTRAINT ch_resistant_variety_variety_id_fkey FOREIGN KEY (variety_id) REFERENCES public.vivas_crop_varieties(id);


--
-- Name: ch_risk_rule ch_risk_rule_crop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_risk_rule
    ADD CONSTRAINT ch_risk_rule_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.vivas_crops(id);


--
-- Name: ch_risk_rule ch_risk_rule_problem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_risk_rule
    ADD CONSTRAINT ch_risk_rule_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.ch_problem(id) ON DELETE CASCADE;


--
-- Name: ch_symptom ch_symptom_plant_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ch_symptom
    ADD CONSTRAINT ch_symptom_plant_part_id_fkey FOREIGN KEY (plant_part_id) REFERENCES public.ch_lookup(id);


--
-- Name: pih_ai_inferences pih_ai_inferences_ai_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_ai_inferences
    ADD CONSTRAINT pih_ai_inferences_ai_request_id_fkey FOREIGN KEY (ai_request_id) REFERENCES public.ch_ai_request(id) ON DELETE SET NULL;


--
-- Name: pih_ai_inferences pih_ai_inferences_crop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_ai_inferences
    ADD CONSTRAINT pih_ai_inferences_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.vivas_crops(id) ON DELETE SET NULL;


--
-- Name: pih_ai_inferences pih_ai_inferences_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_ai_inferences
    ADD CONSTRAINT pih_ai_inferences_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.pih_products(id) ON DELETE CASCADE;


--
-- Name: pih_ai_inferences pih_ai_inferences_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_ai_inferences
    ADD CONSTRAINT pih_ai_inferences_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.vivas_users(id) ON DELETE SET NULL;


--
-- Name: pih_api_keys pih_api_keys_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_api_keys
    ADD CONSTRAINT pih_api_keys_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.pih_partners(id) ON DELETE CASCADE;


--
-- Name: pih_audit_log pih_audit_log_actor_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_audit_log
    ADD CONSTRAINT pih_audit_log_actor_partner_id_fkey FOREIGN KEY (actor_partner_id) REFERENCES public.pih_partners(id) ON DELETE SET NULL;


--
-- Name: pih_audit_log pih_audit_log_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_audit_log
    ADD CONSTRAINT pih_audit_log_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.vivas_users(id) ON DELETE SET NULL;


--
-- Name: pih_cart_items pih_cart_items_cart_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_cart_items
    ADD CONSTRAINT pih_cart_items_cart_id_fkey FOREIGN KEY (cart_id) REFERENCES public.pih_carts(id) ON DELETE CASCADE;


--
-- Name: pih_cart_items pih_cart_items_recommendation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_cart_items
    ADD CONSTRAINT pih_cart_items_recommendation_id_fkey FOREIGN KEY (recommendation_id) REFERENCES public.pih_recommendations(id) ON DELETE SET NULL;


--
-- Name: pih_cart_items pih_cart_items_sku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_cart_items
    ADD CONSTRAINT pih_cart_items_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.pih_product_skus(id) ON DELETE CASCADE;


--
-- Name: pih_carts pih_carts_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_carts
    ADD CONSTRAINT pih_carts_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: pih_carts pih_carts_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_carts
    ADD CONSTRAINT pih_carts_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.pih_partners(id) ON DELETE CASCADE;


--
-- Name: pih_carts pih_carts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_carts
    ADD CONSTRAINT pih_carts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.vivas_users(id) ON DELETE CASCADE;


--
-- Name: pih_data_sharing_consents pih_data_sharing_consents_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_data_sharing_consents
    ADD CONSTRAINT pih_data_sharing_consents_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: pih_data_sharing_consents pih_data_sharing_consents_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_data_sharing_consents
    ADD CONSTRAINT pih_data_sharing_consents_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.vivas_users(id) ON DELETE CASCADE;


--
-- Name: pih_field_trials pih_field_trials_crop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_field_trials
    ADD CONSTRAINT pih_field_trials_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.vivas_crops(id) ON DELETE CASCADE;


--
-- Name: pih_field_trials pih_field_trials_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_field_trials
    ADD CONSTRAINT pih_field_trials_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: pih_field_trials pih_field_trials_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_field_trials
    ADD CONSTRAINT pih_field_trials_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.pih_partners(id) ON DELETE CASCADE;


--
-- Name: pih_field_trials pih_field_trials_planting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_field_trials
    ADD CONSTRAINT pih_field_trials_planting_id_fkey FOREIGN KEY (planting_id) REFERENCES public.vivas_plantings(id) ON DELETE SET NULL;


--
-- Name: pih_field_trials pih_field_trials_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_field_trials
    ADD CONSTRAINT pih_field_trials_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.pih_products(id) ON DELETE CASCADE;


--
-- Name: pih_field_trials pih_field_trials_sme_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_field_trials
    ADD CONSTRAINT pih_field_trials_sme_by_fkey FOREIGN KEY (sme_by) REFERENCES public.vivas_users(id) ON DELETE SET NULL;


--
-- Name: pih_import_batches pih_import_batches_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_import_batches
    ADD CONSTRAINT pih_import_batches_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.pih_partners(id) ON DELETE CASCADE;


--
-- Name: pih_import_errors pih_import_errors_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_import_errors
    ADD CONSTRAINT pih_import_errors_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.pih_import_batches(id) ON DELETE CASCADE;


--
-- Name: pih_notifications pih_notifications_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_notifications
    ADD CONSTRAINT pih_notifications_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: pih_notifications pih_notifications_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_notifications
    ADD CONSTRAINT pih_notifications_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.pih_partners(id) ON DELETE CASCADE;


--
-- Name: pih_notifications pih_notifications_recipient_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_notifications
    ADD CONSTRAINT pih_notifications_recipient_user_id_fkey FOREIGN KEY (recipient_user_id) REFERENCES public.vivas_users(id) ON DELETE CASCADE;


--
-- Name: pih_order_status_history pih_order_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_order_status_history
    ADD CONSTRAINT pih_order_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.vivas_users(id) ON DELETE SET NULL;


--
-- Name: pih_order_status_history pih_order_status_history_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_order_status_history
    ADD CONSTRAINT pih_order_status_history_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.pih_store_orders(id) ON DELETE CASCADE;


--
-- Name: pih_partner_documents pih_partner_documents_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_partner_documents
    ADD CONSTRAINT pih_partner_documents_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.pih_partners(id) ON DELETE CASCADE;


--
-- Name: pih_partner_documents pih_partner_documents_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_partner_documents
    ADD CONSTRAINT pih_partner_documents_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.vivas_users(id) ON DELETE SET NULL;


--
-- Name: pih_partner_users pih_partner_users_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_partner_users
    ADD CONSTRAINT pih_partner_users_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.pih_partners(id) ON DELETE CASCADE;


--
-- Name: pih_partner_users pih_partner_users_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_partner_users
    ADD CONSTRAINT pih_partner_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.vivas_users(id) ON DELETE CASCADE;


--
-- Name: pih_partners pih_partners_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_partners
    ADD CONSTRAINT pih_partners_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.vivas_users(id) ON DELETE SET NULL;


--
-- Name: pih_product_claims pih_product_claims_crop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_product_claims
    ADD CONSTRAINT pih_product_claims_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.vivas_crops(id) ON DELETE SET NULL;


--
-- Name: pih_product_claims pih_product_claims_problem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_product_claims
    ADD CONSTRAINT pih_product_claims_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.ch_problem(id) ON DELETE CASCADE;


--
-- Name: pih_product_claims pih_product_claims_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_product_claims
    ADD CONSTRAINT pih_product_claims_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.pih_products(id) ON DELETE CASCADE;


--
-- Name: pih_product_claims pih_product_claims_sme_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_product_claims
    ADD CONSTRAINT pih_product_claims_sme_by_fkey FOREIGN KEY (sme_by) REFERENCES public.vivas_users(id) ON DELETE SET NULL;


--
-- Name: pih_product_composition pih_product_composition_nutrient_code_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_product_composition
    ADD CONSTRAINT pih_product_composition_nutrient_code_fkey FOREIGN KEY (nutrient_code) REFERENCES public.ch_nutrient(code) ON DELETE SET NULL;


--
-- Name: pih_product_composition pih_product_composition_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_product_composition
    ADD CONSTRAINT pih_product_composition_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.pih_products(id) ON DELETE CASCADE;


--
-- Name: pih_product_crop_suitability pih_product_crop_suitability_crop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_product_crop_suitability
    ADD CONSTRAINT pih_product_crop_suitability_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.vivas_crops(id) ON DELETE CASCADE;


--
-- Name: pih_product_crop_suitability pih_product_crop_suitability_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_product_crop_suitability
    ADD CONSTRAINT pih_product_crop_suitability_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.pih_products(id) ON DELETE CASCADE;


--
-- Name: pih_product_crop_suitability pih_product_crop_suitability_variety_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_product_crop_suitability
    ADD CONSTRAINT pih_product_crop_suitability_variety_id_fkey FOREIGN KEY (variety_id) REFERENCES public.vivas_crop_varieties(id) ON DELETE SET NULL;


--
-- Name: pih_product_media pih_product_media_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_product_media
    ADD CONSTRAINT pih_product_media_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.pih_products(id) ON DELETE CASCADE;


--
-- Name: pih_product_ratings pih_product_ratings_crop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_product_ratings
    ADD CONSTRAINT pih_product_ratings_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.vivas_crops(id) ON DELETE CASCADE;


--
-- Name: pih_product_ratings pih_product_ratings_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_product_ratings
    ADD CONSTRAINT pih_product_ratings_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.pih_products(id) ON DELETE CASCADE;


--
-- Name: pih_product_skus pih_product_skus_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_product_skus
    ADD CONSTRAINT pih_product_skus_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.pih_products(id) ON DELETE CASCADE;


--
-- Name: pih_products pih_products_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_products
    ADD CONSTRAINT pih_products_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.vivas_users(id) ON DELETE SET NULL;


--
-- Name: pih_products pih_products_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_products
    ADD CONSTRAINT pih_products_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.pih_partners(id) ON DELETE CASCADE;


--
-- Name: pih_recommendations pih_recommendations_ai_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_recommendations
    ADD CONSTRAINT pih_recommendations_ai_request_id_fkey FOREIGN KEY (ai_request_id) REFERENCES public.ch_ai_request(id) ON DELETE SET NULL;


--
-- Name: pih_recommendations pih_recommendations_alert_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_recommendations
    ADD CONSTRAINT pih_recommendations_alert_id_fkey FOREIGN KEY (alert_id) REFERENCES public.ch_alert(id) ON DELETE CASCADE;


--
-- Name: pih_recommendations pih_recommendations_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_recommendations
    ADD CONSTRAINT pih_recommendations_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.ch_case(id) ON DELETE CASCADE;


--
-- Name: pih_recommendations pih_recommendations_crop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_recommendations
    ADD CONSTRAINT pih_recommendations_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.vivas_crops(id) ON DELETE SET NULL;


--
-- Name: pih_recommendations pih_recommendations_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_recommendations
    ADD CONSTRAINT pih_recommendations_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: pih_recommendations pih_recommendations_problem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_recommendations
    ADD CONSTRAINT pih_recommendations_problem_id_fkey FOREIGN KEY (problem_id) REFERENCES public.ch_problem(id) ON DELETE SET NULL;


--
-- Name: pih_recommendations pih_recommendations_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_recommendations
    ADD CONSTRAINT pih_recommendations_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.pih_products(id) ON DELETE CASCADE;


--
-- Name: pih_recommendations pih_recommendations_sku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_recommendations
    ADD CONSTRAINT pih_recommendations_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.pih_product_skus(id) ON DELETE SET NULL;


--
-- Name: pih_recommendations pih_recommendations_soil_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_recommendations
    ADD CONSTRAINT pih_recommendations_soil_test_id_fkey FOREIGN KEY (soil_test_id) REFERENCES public.vivas_soil_tests(id) ON DELETE CASCADE;


--
-- Name: pih_reviews pih_reviews_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_reviews
    ADD CONSTRAINT pih_reviews_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: pih_reviews pih_reviews_outcome_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_reviews
    ADD CONSTRAINT pih_reviews_outcome_id_fkey FOREIGN KEY (outcome_id) REFERENCES public.pih_treatment_outcomes(id) ON DELETE SET NULL;


--
-- Name: pih_reviews pih_reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_reviews
    ADD CONSTRAINT pih_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.pih_products(id) ON DELETE CASCADE;


--
-- Name: pih_reviews pih_reviews_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_reviews
    ADD CONSTRAINT pih_reviews_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.vivas_users(id) ON DELETE CASCADE;


--
-- Name: pih_settlements pih_settlements_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_settlements
    ADD CONSTRAINT pih_settlements_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.pih_partners(id) ON DELETE CASCADE;


--
-- Name: pih_store_order_items pih_store_order_items_inputs_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_store_order_items
    ADD CONSTRAINT pih_store_order_items_inputs_lot_id_fkey FOREIGN KEY (inputs_lot_id) REFERENCES public.vivas_inputs_lots(id) ON DELETE SET NULL;


--
-- Name: pih_store_order_items pih_store_order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_store_order_items
    ADD CONSTRAINT pih_store_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.pih_store_orders(id) ON DELETE CASCADE;


--
-- Name: pih_store_order_items pih_store_order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_store_order_items
    ADD CONSTRAINT pih_store_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.pih_products(id) ON DELETE RESTRICT;


--
-- Name: pih_store_order_items pih_store_order_items_sku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_store_order_items
    ADD CONSTRAINT pih_store_order_items_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.pih_product_skus(id) ON DELETE RESTRICT;


--
-- Name: pih_store_orders pih_store_orders_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_store_orders
    ADD CONSTRAINT pih_store_orders_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: pih_store_orders pih_store_orders_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_store_orders
    ADD CONSTRAINT pih_store_orders_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.pih_partners(id) ON DELETE CASCADE;


--
-- Name: pih_store_orders pih_store_orders_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_store_orders
    ADD CONSTRAINT pih_store_orders_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.vivas_purchase_orders(id) ON DELETE SET NULL;


--
-- Name: pih_store_orders pih_store_orders_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_store_orders
    ADD CONSTRAINT pih_store_orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.vivas_users(id) ON DELETE CASCADE;


--
-- Name: pih_store_orders pih_store_orders_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_store_orders
    ADD CONSTRAINT pih_store_orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vivas_vendors(id) ON DELETE SET NULL;


--
-- Name: pih_stores pih_stores_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_stores
    ADD CONSTRAINT pih_stores_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.pih_partners(id) ON DELETE CASCADE;


--
-- Name: pih_treatment_outcomes pih_treatment_outcomes_case_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_treatment_outcomes
    ADD CONSTRAINT pih_treatment_outcomes_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.ch_case(id) ON DELETE SET NULL;


--
-- Name: pih_treatment_outcomes pih_treatment_outcomes_case_treatment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_treatment_outcomes
    ADD CONSTRAINT pih_treatment_outcomes_case_treatment_id_fkey FOREIGN KEY (case_treatment_id) REFERENCES public.ch_case_treatment(id) ON DELETE SET NULL;


--
-- Name: pih_treatment_outcomes pih_treatment_outcomes_crop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_treatment_outcomes
    ADD CONSTRAINT pih_treatment_outcomes_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.vivas_crops(id) ON DELETE SET NULL;


--
-- Name: pih_treatment_outcomes pih_treatment_outcomes_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_treatment_outcomes
    ADD CONSTRAINT pih_treatment_outcomes_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: pih_treatment_outcomes pih_treatment_outcomes_lot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_treatment_outcomes
    ADD CONSTRAINT pih_treatment_outcomes_lot_id_fkey FOREIGN KEY (lot_id) REFERENCES public.vivas_inputs_lots(id) ON DELETE SET NULL;


--
-- Name: pih_treatment_outcomes pih_treatment_outcomes_planting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_treatment_outcomes
    ADD CONSTRAINT pih_treatment_outcomes_planting_id_fkey FOREIGN KEY (planting_id) REFERENCES public.vivas_plantings(id) ON DELETE SET NULL;


--
-- Name: pih_treatment_outcomes pih_treatment_outcomes_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_treatment_outcomes
    ADD CONSTRAINT pih_treatment_outcomes_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.pih_products(id) ON DELETE CASCADE;


--
-- Name: pih_treatment_outcomes pih_treatment_outcomes_sku_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_treatment_outcomes
    ADD CONSTRAINT pih_treatment_outcomes_sku_id_fkey FOREIGN KEY (sku_id) REFERENCES public.pih_product_skus(id) ON DELETE SET NULL;


--
-- Name: pih_trial_observations pih_trial_observations_observed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_trial_observations
    ADD CONSTRAINT pih_trial_observations_observed_by_fkey FOREIGN KEY (observed_by) REFERENCES public.vivas_users(id) ON DELETE SET NULL;


--
-- Name: pih_trial_observations pih_trial_observations_trial_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_trial_observations
    ADD CONSTRAINT pih_trial_observations_trial_id_fkey FOREIGN KEY (trial_id) REFERENCES public.pih_field_trials(id) ON DELETE CASCADE;


--
-- Name: pih_webhook_deliveries pih_webhook_deliveries_webhook_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_webhook_deliveries
    ADD CONSTRAINT pih_webhook_deliveries_webhook_id_fkey FOREIGN KEY (webhook_id) REFERENCES public.pih_webhooks(id) ON DELETE CASCADE;


--
-- Name: pih_webhooks pih_webhooks_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pih_webhooks
    ADD CONSTRAINT pih_webhooks_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.pih_partners(id) ON DELETE CASCADE;


--
-- Name: vivas_account_subscriptions vivas_account_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_account_subscriptions
    ADD CONSTRAINT vivas_account_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.vivas_users(id) ON DELETE CASCADE;


--
-- Name: vivas_accounting_categories vivas_accounting_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_accounting_categories
    ADD CONSTRAINT vivas_accounting_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.vivas_accounting_categories(id) ON DELETE SET NULL;


--
-- Name: vivas_ai_credit_purchases vivas_ai_credit_purchases_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_ai_credit_purchases
    ADD CONSTRAINT vivas_ai_credit_purchases_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.vivas_users(id) ON DELETE CASCADE;


--
-- Name: vivas_ai_credits vivas_ai_credits_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_ai_credits
    ADD CONSTRAINT vivas_ai_credits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.vivas_users(id) ON DELETE CASCADE;


--
-- Name: vivas_billing_invoices vivas_billing_invoices_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_billing_invoices
    ADD CONSTRAINT vivas_billing_invoices_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.vivas_users(id) ON DELETE CASCADE;


--
-- Name: vivas_crop_field_tasks vivas_crop_field_tasks_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_crop_field_tasks
    ADD CONSTRAINT vivas_crop_field_tasks_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.vivas_crop_templates(id) ON DELETE CASCADE;


--
-- Name: vivas_crop_nursery_tasks vivas_crop_nursery_tasks_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_crop_nursery_tasks
    ADD CONSTRAINT vivas_crop_nursery_tasks_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.vivas_crop_templates(id) ON DELETE CASCADE;


--
-- Name: vivas_crop_templates vivas_crop_templates_crop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_crop_templates
    ADD CONSTRAINT vivas_crop_templates_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.vivas_crops(id) ON DELETE CASCADE;


--
-- Name: vivas_crop_templates vivas_crop_templates_harvest_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_crop_templates
    ADD CONSTRAINT vivas_crop_templates_harvest_stage_id_fkey FOREIGN KEY (harvest_stage_id) REFERENCES public.vivas_harvest_stages(id) ON DELETE SET NULL;


--
-- Name: vivas_crop_templates vivas_crop_templates_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_crop_templates
    ADD CONSTRAINT vivas_crop_templates_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.vivas_seed_suppliers(id) ON DELETE SET NULL;


--
-- Name: vivas_crop_templates vivas_crop_templates_variety_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_crop_templates
    ADD CONSTRAINT vivas_crop_templates_variety_id_fkey FOREIGN KEY (variety_id) REFERENCES public.vivas_crop_varieties(id) ON DELETE CASCADE;


--
-- Name: vivas_crop_varieties vivas_crop_varieties_crop_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_crop_varieties
    ADD CONSTRAINT vivas_crop_varieties_crop_id_fkey FOREIGN KEY (crop_id) REFERENCES public.vivas_crops(id) ON DELETE CASCADE;


--
-- Name: vivas_crops vivas_crops_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_crops
    ADD CONSTRAINT vivas_crops_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.vivas_crop_categories(id) ON DELETE SET NULL;


--
-- Name: vivas_customers vivas_customers_default_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_customers
    ADD CONSTRAINT vivas_customers_default_channel_id_fkey FOREIGN KEY (default_channel_id) REFERENCES public.vivas_sales_channels(id) ON DELETE SET NULL;


--
-- Name: vivas_equipment_maintenance vivas_equipment_maintenance_equipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_equipment_maintenance
    ADD CONSTRAINT vivas_equipment_maintenance_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.vivas_equipment(id) ON DELETE CASCADE;


--
-- Name: vivas_farm_map_beds vivas_farm_map_beds_map_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_farm_map_beds
    ADD CONSTRAINT vivas_farm_map_beds_map_item_id_fkey FOREIGN KEY (map_item_id) REFERENCES public.vivas_farm_map_items(id) ON DELETE CASCADE;


--
-- Name: vivas_farms vivas_farms_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_farms
    ADD CONSTRAINT vivas_farms_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.vivas_users(id) ON DELETE CASCADE;


--
-- Name: vivas_file_storage vivas_file_storage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_file_storage
    ADD CONSTRAINT vivas_file_storage_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.vivas_users(id) ON DELETE CASCADE;


--
-- Name: vivas_financial_budgets vivas_financial_budgets_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_financial_budgets
    ADD CONSTRAINT vivas_financial_budgets_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.vivas_accounting_categories(id) ON DELETE CASCADE;


--
-- Name: vivas_financial_transactions vivas_financial_transactions_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_financial_transactions
    ADD CONSTRAINT vivas_financial_transactions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.vivas_accounting_categories(id) ON DELETE RESTRICT;


--
-- Name: vivas_financial_transactions vivas_financial_transactions_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_financial_transactions
    ADD CONSTRAINT vivas_financial_transactions_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vivas_vendors(id) ON DELETE SET NULL;


--
-- Name: vivas_harvest_plans vivas_harvest_plans_planting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_harvest_plans
    ADD CONSTRAINT vivas_harvest_plans_planting_id_fkey FOREIGN KEY (planting_id) REFERENCES public.vivas_plantings(id) ON DELETE SET NULL;


--
-- Name: vivas_inputs_inventory vivas_inputs_inventory_catalog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_inputs_inventory
    ADD CONSTRAINT vivas_inputs_inventory_catalog_id_fkey FOREIGN KEY (catalog_id) REFERENCES public.vivas_inputs_catalog(id) ON DELETE SET NULL;


--
-- Name: vivas_inputs_inventory vivas_inputs_inventory_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_inputs_inventory
    ADD CONSTRAINT vivas_inputs_inventory_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vivas_vendors(id) ON DELETE SET NULL;


--
-- Name: vivas_inputs_lots vivas_inputs_lots_catalog_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_inputs_lots
    ADD CONSTRAINT vivas_inputs_lots_catalog_id_fkey FOREIGN KEY (catalog_id) REFERENCES public.vivas_inputs_catalog(id) ON DELETE SET NULL;


--
-- Name: vivas_inputs_lots vivas_inputs_lots_inventory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_inputs_lots
    ADD CONSTRAINT vivas_inputs_lots_inventory_id_fkey FOREIGN KEY (inventory_id) REFERENCES public.vivas_inputs_inventory(id) ON DELETE SET NULL;


--
-- Name: vivas_labor_timesheets vivas_labor_timesheets_worker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_labor_timesheets
    ADD CONSTRAINT vivas_labor_timesheets_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.vivas_labor_workers(id) ON DELETE CASCADE;


--
-- Name: vivas_order_items vivas_order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_order_items
    ADD CONSTRAINT vivas_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.vivas_orders(id) ON DELETE CASCADE;


--
-- Name: vivas_orders vivas_orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_orders
    ADD CONSTRAINT vivas_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.vivas_customers(id) ON DELETE SET NULL;


--
-- Name: vivas_orders vivas_orders_sales_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_orders
    ADD CONSTRAINT vivas_orders_sales_channel_id_fkey FOREIGN KEY (sales_channel_id) REFERENCES public.vivas_sales_channels(id) ON DELETE SET NULL;


--
-- Name: vivas_pack_batches vivas_pack_batches_sales_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_pack_batches
    ADD CONSTRAINT vivas_pack_batches_sales_channel_id_fkey FOREIGN KEY (sales_channel_id) REFERENCES public.vivas_sales_channels(id) ON DELETE SET NULL;


--
-- Name: vivas_payment_methods vivas_payment_methods_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_payment_methods
    ADD CONSTRAINT vivas_payment_methods_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.vivas_users(id) ON DELETE CASCADE;


--
-- Name: vivas_priority_onboarding_requests vivas_priority_onboarding_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_priority_onboarding_requests
    ADD CONSTRAINT vivas_priority_onboarding_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.vivas_users(id) ON DELETE CASCADE;


--
-- Name: vivas_purchase_order_items vivas_purchase_order_items_linked_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_purchase_order_items
    ADD CONSTRAINT vivas_purchase_order_items_linked_material_id_fkey FOREIGN KEY (linked_material_id) REFERENCES public.vivas_inputs_inventory(id) ON DELETE SET NULL;


--
-- Name: vivas_purchase_order_items vivas_purchase_order_items_linked_shopping_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_purchase_order_items
    ADD CONSTRAINT vivas_purchase_order_items_linked_shopping_item_id_fkey FOREIGN KEY (linked_shopping_item_id) REFERENCES public.vivas_shopping_list(id) ON DELETE SET NULL;


--
-- Name: vivas_purchase_order_items vivas_purchase_order_items_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_purchase_order_items
    ADD CONSTRAINT vivas_purchase_order_items_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.vivas_purchase_orders(id) ON DELETE CASCADE;


--
-- Name: vivas_purchase_orders vivas_purchase_orders_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_purchase_orders
    ADD CONSTRAINT vivas_purchase_orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vivas_vendors(id) ON DELETE SET NULL;


--
-- Name: vivas_report_snapshots vivas_report_snapshots_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_report_snapshots
    ADD CONSTRAINT vivas_report_snapshots_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.vivas_saved_reports(id) ON DELETE CASCADE;


--
-- Name: vivas_settings_api_tokens vivas_settings_api_tokens_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_api_tokens
    ADD CONSTRAINT vivas_settings_api_tokens_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: vivas_settings_api_tokens vivas_settings_api_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_api_tokens
    ADD CONSTRAINT vivas_settings_api_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.vivas_users(id) ON DELETE CASCADE;


--
-- Name: vivas_settings_channel_mappings vivas_settings_channel_mappings_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_channel_mappings
    ADD CONSTRAINT vivas_settings_channel_mappings_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: vivas_settings_custom_fields vivas_settings_custom_fields_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_custom_fields
    ADD CONSTRAINT vivas_settings_custom_fields_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: vivas_settings_delivery_types vivas_settings_delivery_types_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_delivery_types
    ADD CONSTRAINT vivas_settings_delivery_types_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: vivas_settings_farm_profile vivas_settings_farm_profile_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_farm_profile
    ADD CONSTRAINT vivas_settings_farm_profile_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: vivas_settings_labels vivas_settings_labels_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_labels
    ADD CONSTRAINT vivas_settings_labels_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: vivas_settings_notifications vivas_settings_notifications_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_notifications
    ADD CONSTRAINT vivas_settings_notifications_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: vivas_settings_notifications vivas_settings_notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_notifications
    ADD CONSTRAINT vivas_settings_notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.vivas_users(id) ON DELETE CASCADE;


--
-- Name: vivas_settings_online_store vivas_settings_online_store_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_online_store
    ADD CONSTRAINT vivas_settings_online_store_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: vivas_settings_payment_processors vivas_settings_payment_processors_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_payment_processors
    ADD CONSTRAINT vivas_settings_payment_processors_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: vivas_settings_pickup_locations vivas_settings_pickup_locations_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_pickup_locations
    ADD CONSTRAINT vivas_settings_pickup_locations_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: vivas_settings_planting_id vivas_settings_planting_id_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_planting_id
    ADD CONSTRAINT vivas_settings_planting_id_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: vivas_settings_product vivas_settings_product_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_product
    ADD CONSTRAINT vivas_settings_product_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: vivas_settings_roles vivas_settings_roles_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_roles
    ADD CONSTRAINT vivas_settings_roles_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: vivas_settings_task_types vivas_settings_task_types_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_task_types
    ADD CONSTRAINT vivas_settings_task_types_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: vivas_settings_time_attendance vivas_settings_time_attendance_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_time_attendance
    ADD CONSTRAINT vivas_settings_time_attendance_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: vivas_settings_webhooks vivas_settings_webhooks_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_settings_webhooks
    ADD CONSTRAINT vivas_settings_webhooks_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: vivas_shopping_list vivas_shopping_list_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_shopping_list
    ADD CONSTRAINT vivas_shopping_list_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vivas_vendors(id) ON DELETE SET NULL;


--
-- Name: vivas_soil_tests vivas_soil_tests_lab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_soil_tests
    ADD CONSTRAINT vivas_soil_tests_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.vivas_labs(id) ON DELETE SET NULL;


--
-- Name: vivas_storage_addons vivas_storage_addons_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_storage_addons
    ADD CONSTRAINT vivas_storage_addons_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.vivas_users(id) ON DELETE CASCADE;


--
-- Name: vivas_user_farms vivas_user_farms_farm_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_user_farms
    ADD CONSTRAINT vivas_user_farms_farm_id_fkey FOREIGN KEY (farm_id) REFERENCES public.vivas_farms(id) ON DELETE CASCADE;


--
-- Name: vivas_user_farms vivas_user_farms_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_user_farms
    ADD CONSTRAINT vivas_user_farms_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.vivas_users(id) ON DELETE CASCADE;


--
-- Name: vivas_vendors vivas_vendors_default_accounting_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vivas_vendors
    ADD CONSTRAINT vivas_vendors_default_accounting_category_id_fkey FOREIGN KEY (default_accounting_category_id) REFERENCES public.vivas_accounting_categories(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict 2RKSdu24oB1dPgtmmjh12ZiLHdtCRKH2YiuJqphddAAXMDnbSmGcPEgv6gG7eBy

