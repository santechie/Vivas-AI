-- Phase 5 Migration: Scheduled Background Jobs & Webhook Delivery Tracking Enhancements
-- Upgrades pih_webhook_deliveries with duration and error tracking, creates system_scheduled_jobs

CREATE TABLE IF NOT EXISTS system_scheduled_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  interval_seconds INT NOT NULL DEFAULT 60,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  last_duration_ms INT,
  last_status VARCHAR(30) DEFAULT 'idle',
  last_error TEXT,
  run_count INT NOT NULL DEFAULT 0,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_scheduled_jobs_enabled ON system_scheduled_jobs(is_enabled, next_run_at);

-- Add extra diagnostics columns to pih_webhook_deliveries if not already present
ALTER TABLE pih_webhook_deliveries ADD COLUMN IF NOT EXISTS duration_ms INT;
ALTER TABLE pih_webhook_deliveries ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE pih_webhook_deliveries ADD COLUMN IF NOT EXISTS response_body TEXT;

-- Index for queue dispatch worker
CREATE INDEX IF NOT EXISTS idx_pih_webhook_deliveries_pending ON pih_webhook_deliveries(status, next_retry_at) WHERE status = 'pending';

-- Seed default scheduled system jobs
INSERT INTO system_scheduled_jobs (job_name, description, interval_seconds, next_run_at)
VALUES 
  ('licence_expiry_monitor', 'Scans partner compliance docs & flags licences expiring within 30/60 days', 3600, NOW()),
  ('bayesian_fps_recompute', 'Recomputes Bayesian Field Performance Scores (FPS) and AI inferences', 86400, NOW()),
  ('outcome_reminder_prompts', 'Generates 7/14/21-day outcome feedback prompts for received orders', 3600, NOW()),
  ('inventory_low_stock_scanner', 'Audits inventory lots and flags items below safety thresholds', 14400, NOW())
ON CONFLICT (job_name) DO UPDATE
SET description = EXCLUDED.description,
    interval_seconds = EXCLUDED.interval_seconds;
