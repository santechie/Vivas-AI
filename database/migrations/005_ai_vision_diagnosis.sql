-- database/migrations/005_ai_vision_diagnosis.sql
-- Migration 005: AI Vision Diagnosis & Pathology Metadata

BEGIN;

-- 1. Add AI visual explanation & plant organ metadata to ch_case
ALTER TABLE ch_case 
  ADD COLUMN IF NOT EXISTS ai_identified_part VARCHAR(32) DEFAULT NULL,   -- 'LEAF', 'FRUIT', 'STEM', 'FLOWER', 'ROOT', 'WHOLE_PLANT'
  ADD COLUMN IF NOT EXISTS ai_explanation TEXT DEFAULT NULL,             -- Agronomic reasoning and visual indicators
  ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(5,2) DEFAULT NULL,       -- e.g. 94.50%
  ADD COLUMN IF NOT EXISTS ai_symptoms_detected JSONB DEFAULT '[]'::jsonb;-- Visual symptom tags detected by model

-- 2. Add AI inference tracking to ch_case_diagnosis
ALTER TABLE ch_case_diagnosis
  ADD COLUMN IF NOT EXISTS source_type VARCHAR(32) DEFAULT 'AI_VISION',   -- 'AI_VISION', 'SYMPTOM', 'MANUAL'
  ADD COLUMN IF NOT EXISTS ai_model_version VARCHAR(64) DEFAULT 'gemini-1.5-flash';

COMMIT;
