# Phase 5 Report: Automation, Webhook Delivery Engine & Scheduled Background Jobs

**Date:** November 16, 2026  
**Status:** COMPLETE & VERIFIED (11 / 11 checks passed, 0 regressions across 122 endpoints)

---

## 1. Executive Summary
Phase 5 focused on enterprise-grade automation, scheduled background task orchestration, and an asynchronous, HMAC-signed outbound webhook delivery engine with exponential backoff retries.

All domain events (e.g., `order.created`, `rating.updated`, `inference.published`) now trigger automated webhook queueing for subscribed partner endpoints without blocking main HTTP request threads. Scheduled background maintenance tasks run predictably via interval-based cron tracking in PostgreSQL.

---

## 2. Key Components Delivered

### 2.1 Database Migration `003_phase5_automation_webhooks.sql`
- **Table `system_scheduled_jobs`:**
  - Manages background scheduled routines with `interval_seconds`, `last_run_at`, `next_run_at`, `last_duration_ms`, `last_status`, `last_error`, `run_count`, and `is_enabled`.
  - Seeded default jobs:
    1. `licence_expiry_monitor` (1 hour interval)
    2. `bayesian_fps_recompute` (24 hour interval)
    3. `outcome_reminder_prompts` (1 hour interval)
    4. `inventory_low_stock_scanner` (4 hour interval)
- **Table `pih_webhook_deliveries` Upgrades:**
  - Added `duration_ms`, `error_message`, `response_body`.
  - Added index on `(status, next_retry_at) WHERE status = 'pending'`.

### 2.2 Outbound Webhook Delivery Engine (`backend/services/webhookDispatcher.js`)
- **HMAC-SHA256 Signing:** Generates `X-Vivas-Signature: sha256=<hex_hmac>` computed over raw JSON body using each partner's unique webhook secret (`whsec_...`).
- **Async Queueing & Dispatch:**
  - `queueWebhookEvent(event, payload, partnerId)` queues delivery rows for matching active webhook listeners.
  - `dispatchDeliveryAttempt(deliveryId)` delivers live HTTP POST requests with 6-second timeout and abort controllers.
- **Exponential Backoff Retries:**
  - Schedule: `[1, 5, 15, 60, 360]` minutes.
  - On delivery failure (HTTP error or network timeout), increments `attempt` and schedules `next_retry_at`. Transitions to `failed` only after exhausting all retries.
- **Queue Worker:** `processWebhookQueueBatch()` processes pending deliveries every 5 seconds.

### 2.3 Scheduled Background Jobs Engine (`backend/services/scheduler.js`)
- Built-in runners:
  - **`licence_expiry_monitor`:** Scans `pih_partner_documents`, detects FCO/CIBRC/Seed licences expiring in ≤60 days or expired, and dispatches in-app notifications (`pih_notifications`) to manufacturers.
  - **`bayesian_fps_recompute`:** Recomputes Bayesian Field Performance Scores (FPS) and AI inferences across consented farm outcomes.
  - **`outcome_reminder_prompts`:** Scans delivered orders without logged outcomes and creates 7/14/21-day follow-up check-ins.
  - **`inventory_low_stock_scanner`:** Audits inventory quantities against reorder thresholds.
- **Scheduler Ticker & Admin Control:**
  - `tickScheduler()` checks and executes due jobs every 30 seconds.
  - Endpoints: `GET /api/admin/scheduled-jobs` and `POST /api/admin/scheduled-jobs/:jobName/run`.

### 2.4 Domain Event Integration (`backend/services/eventBus.js`)
- Hooked domain events `order.created`, `rating.updated`, and `inference.published` to `queueWebhookEvent` handlers.
- When domain events are processed from `domain_events_outbox`, registered partner webhooks are queued and dispatched automatically.

---

## 3. Verification & Evidence

Automated verification suite [`scripts/phase5-verify.mjs`](file:///Volumes/Files/Antigravity%20demo/VivasAI/scripts/phase5-verify.mjs):
```
🚀 Phase 5 Verification Suite: Automation, Webhook Engine & Scheduled Jobs...

✅ PostgreSQL Connected (vivas_ai)
PASS  system_scheduled_jobs has registered jobs (found 4)
PASS  HMAC-SHA256 signature generated correctly (sha256=0b8c85d233206...)
PASS  licence_expiry_monitor job executed successfully (duration: 2ms)
PASS  system_scheduled_jobs metadata correctly updated after run
PASS  inventory_low_stock_scanner executed successfully (0 low-stock items scanned)
PASS  Outbox event triggered automatic webhook queueing into pih_webhook_deliveries
PASS  Webhook dispatcher successfully delivered signed HTTP POST to receiver
PASS  Receiver verified X-Vivas-Event header ('order.created')
PASS  Receiver verified X-Vivas-Signature HMAC header
PASS  Failed webhook delivery entered exponential backoff retry state (Next retry: 2026-11-16T06:10:23.803Z)
PASS  tickScheduler successfully executed background check cycle (0 jobs run)

Phase 5 Verification Result: 11 / 11 passed.
```

### Smoke Test Invariants (`scripts/phase0-smoke.mjs`):
- **Routes Tested:** 122
- **2xx OK:** 113
- **401/403 Auth Protected:** 9
- **5xx Server Errors:** 0
