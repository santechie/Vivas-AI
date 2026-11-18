-- 002_phase4_domain_events_outbox.sql
-- Outbox Pattern Table for reliable asynchronous and cross-module event dispatching

CREATE TABLE IF NOT EXISTS domain_events_outbox (
  id BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL,
  aggregate_id VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'processed', 'failed'
  retry_count INT NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_outbox_status ON domain_events_outbox(status);
CREATE INDEX IF NOT EXISTS idx_outbox_event_type ON domain_events_outbox(event_type);
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate ON domain_events_outbox(aggregate_type, aggregate_id);
