# Crop Health Image Sources (CHI) — Phase 0 Discovery Report

**Module:** Crop Health Image Sources (CHI)  
**Reference Document:** `docs/CHI_SRS.md`  
**Status:** Complete (Read-Only Analysis)  
**Date:** 2026-11-18  

---

## Executive Summary

Phase 0 Discovery was conducted in accordance with `docs/CHI_SRS.md` and project non-negotiable rules. The local PostgreSQL database (`vivas_ai`) was queried and confirmed operational with 139 public tables and views. Every table, column, enum, route, service, and UI component designated for reuse in SRS Section 5 was inspected and verified.

No modifications to existing code were made. This report establishes:
1. Exact mapping of reused database tables, columns, routes, and components with file and line references.
2. Conceptual aliases and nomenclature alignments.
3. Identified conflicts, constraints, and risk mitigation strategies.
4. Comprehensive file creation and edit roster across all project phases (Phases 1 through 10).

---

## (a) Existing Assets Reused by CHI (File and Line Numbers)

### 1. Database Tables & Columns (SRS Section 5.1)
Verified via live PostgreSQL `information_schema` inspection against `vivas_ai`:

| Table Name | File / Schema Location | Verified Columns Reused | Purpose in CHI |
| :--- | :--- | :--- | :--- |
| **`vivas_crops`** | `database/schema.sql` (Line 13) | `id`, `name`, `scientific_name`, `category_id`, `crop_family`, `genus`, `species`, `is_active` | Base host crop records for CHI image mappings (`chi_crop_map`) |
| **`vivas_crop_categories`**| `database/schema.sql` (Line 1) | `id`, `name`, `icon`, `description` | Grouping and fallback hierarchy for crop matching |
| **`vivas_crop_varieties`** | `database/schema.sql` (Line 36) | `id`, `crop_id`, `variety_name`, `is_active` | Variety-specific problem and symptom correlation |
| **`ch_problem`** | `backend/config/crop_health_schema.sql` (Line 71) | `id`, `problem_type`, `code`, `name`, `scientific_name`, `category_id`, `status`, `version`, `is_active` | Diagnostic target for external images and dataset ground truth |
| **`ch_problem_crop`** | `backend/config/crop_health_schema.sql` (Line 144) | `problem_id`, `crop_id`, `is_primary`, `susceptible_stage` | Validating crop-problem combinations before auto-linking |
| **`ch_problem_review`** | `backend/config/crop_health_schema.sql` (Line 160) | `id`, `problem_id`, `action`, `reviewer_id`, `comment`, `created_at` | Audit trail when imported images trigger problem updates |
| **`ch_problem_version`**| `backend/config/crop_health_schema.sql` (Line 172) | `problem_id`, `version`, `snapshot`, `changed_by`, `changed_at` | Version history preservation |
| **`ch_media`** | `backend/config/crop_health_schema.sql` (Line 238) | `id`, `owner_type`, `owner_id`, `url`, `thumb_url`, `image_label_id`, `caption`, `is_primary`, `source_credit`, `width`, `height`, `checksum`, `uploaded_by`, `created_at` | Primary storage entity for crop/problem images (augmented additively with CHI metadata in Phase 1) |
| **`ch_lookup`** | `backend/config/crop_health_schema.sql` (Line 1) | `id`, `category`, `code`, `name`, `is_active`, `sort_order` | Plant parts, symptoms, severities, and image labels |
| **`ch_control_measure`** | `backend/config/crop_health_schema.sql` (Line 183) | `id`, `problem_id`, `measure_type`, `description`, `is_organic` | Associated remedies attached to imported diagnostic references |
| **`ch_case`** | `backend/config/crop_health_schema.sql` (Line 258) | `id`, `farm_id`, `crop_id`, `variety_id`, `confirmed_problem_id`, `status` | Benchmark testing and case evaluation |
| **`ch_case_diagnosis`** | `backend/config/crop_health_schema.sql` (Line 333) | `id`, `case_id`, `source`, `problem_id`, `confidence`, `is_confirmed` | Storing benchmark inference runs |
| **`ch_ai_request`** | `backend/config/crop_health_schema.sql` (Line 367) | `id`, `farm_id`, `case_id`, `user_id`, `request_type`, `payload`, `response`, `status`, `latency_ms` | Diagnostic benchmark tracking |
| **`ch_ai_feedback`** | `backend/config/crop_health_schema.sql` (Line 384) | `id`, `diagnosis_id`, `user_id`, `was_correct`, `correct_problem_id`, `rating`, `comment` | Model feedback analytics |
| **`v_ch_training_set`** | `backend/config/crop_health_schema.sql` (Line 396) | View: joins `ch_case`, `ch_problem`, and `ch_media` count | Export dataset generator view |
| **`pih_recommendations`** | `database/migrations/001_partner_input_hub.sql` (Line 173) | `id`, `farm_id`, `case_id`, `problem_id`, `product_id`, `status` | Commercial remedies linked to diagnosed problems |
| **`pih_data_sharing_consents`** | `database/migrations/001_partner_input_hub.sql` (Line 32) | `id`, `farm_id`, `granted_by`, `scope`, `granted_at`, `withdrawn_at` | Legal consent for public dataset exports |
| **`system_scheduled_jobs`** | `backend/services/scheduler.js` (Line 25) | `id`, `job_name`, `description`, `interval_seconds`, `last_run_at`, `next_run_at`, `is_enabled` | CHI sync cron scheduling (`chi_sync_sources`, `chi_quarantine_scan`) |
| **`domain_events_outbox`** | `backend/services/eventBus.js` (Line 17) | `id`, `event_type`, `aggregate_type`, `aggregate_id`, `payload`, `status` | Outbox pattern for `chi.image.imported`, `chi.sync.completed` |
| **`vivas_settings_roles`** | `backend/middleware/security.js` (Line 13) | `id`, `role_name`, `permissions` (JSONB) | Granular CHI permissions (`chi:view`, `chi:configure`, etc.) |

---

### 2. Backend Routes & Middleware (SRS Section 5.2)

| Route / Function | File Location | Line Number | Reuse Mechanism |
| :--- | :--- | :--- | :--- |
| **`GET /problems`** | `backend/routes/cropHealth.js` | Line 160 | Read catalog problems for mapping target selection |
| **`GET /problems/:id`** | `backend/routes/cropHealth.js` | Line 226 | Detailed problem information for curation modal |
| **`POST /cases/:id/diagnose`** | `backend/routes/cropHealth.js` | Line 988 | AI diagnostic benchmark invocation |
| **`GET /cases/:id/remedies`** | `backend/routes/cropHealth.js` | Line 1086 | Remedy validation in curation preview |
| **`verifyToken`** | `backend/middleware/security.js` | Line 40 | Standardized JWT / session authentication |
| **`requirePermission`** | `backend/middleware/security.js` | Line 83 | Enforcing `chi:view`, `chi:configure`, `chi:import`, `chi:curate`, `chi:export` |
| **`registerJob`** | `backend/services/scheduler.js` | Line 97 | Registering background synchronization and maintenance workers |
| **`emitDomainEvent`** | `backend/services/eventBus.js` | Line 45 | Emitting transactional domain events via `domain_events_outbox` |
| **`sendSuccess`, `sendError`** | `backend/utils/response.js` | Line 1 | Standard API envelope (`{ success, data, error, meta }`) |

---

### 3. Frontend UI Screens & Components (SRS Section 5.3)

| Component | File Location | Key Component / Line | Integration Plan |
| :--- | :--- | :--- | :--- |
| **`CropHealth`** | `frontend/src/grow/CropHealth.jsx` | Line 14 (`CropHealth`) | Additive tab/action to view external reference images and trigger image curation |
| **`CropLibrary`** | `frontend/src/grow/CropLibrary.jsx` | Line 464 (`CropLibraryScreen`) | Additive badge / image gallery section displaying imported CHI media on crop profile |
| **`SettingsHub`** | `frontend/src/settings/SettingsHub.jsx` | Line 67 (`SettingsHub`), Line 79 (`MODULE_CARDS`) | Additive card under Integrations/Settings registering `crop-health-image-sources` |

---

## (b) Conceptual Aliases & Reused Elements

Several concepts in `docs/CHI_SRS.md` correspond directly to existing schema structures under slightly different names. They are harmonized as follows:

| SRS Concept | Existing Codebase Name | Mapping & Reuse Strategy |
| :--- | :--- | :--- |
| **Remedy / Treatment** | `ch_control_measure` & `pih_recommendations` | Reuses `ch_control_measure` for agronomic/organic cultural practices and `pih_recommendations` for commercial chemical/biological inputs. No new remedy table will be created. |
| **Crop Host** | `vivas_crops` | Reuses `vivas_crops` (`id`, `scientific_name`). The CHI crop mapping table `chi_crop_map` stores foreign keys to `vivas_crops.id`. |
| **Image Entity** | `ch_media` | CHI will not maintain a disconnected images table. Approved images are written directly to `ch_media` with `owner_type = 'CHI_SOURCE'` or `owner_type = 'PROBLEM'`, referencing `chi_staging_images`. |
| **Audit Logs** | `pih_audit_log` / `ch_problem_review` | In-flight curation reviews will use `ch_problem_review` or dedicated audit events via `domain_events_outbox`. |
| **Background Scheduler**| `system_scheduled_jobs` | Instead of setting up node-cron directly, jobs are registered via `registerJob()` in `backend/services/scheduler.js`. |
| **Event Broker** | `domain_events_outbox` | All cross-module events use `emitDomainEvent()`, ensuring transactional consistency with database operations. |

---

## (c) Conflicts, Risks, and Mitigations

1. **Direct `getContext()` Usage Forbidden in CHI:**
   - *Risk:* In `backend/routes/cropHealth.js`, `getContext(req)` creates a dummy or fallback user when auth is unconfigured.
   - *Mitigation:* In strict adherence to Non-negotiable Rule 4, `/api/chi` will **never** call `getContext()`. All `/api/chi` endpoints will explicitly utilize `backend/middleware/security.js` (`verifyToken` + `requirePermission(perm)`) and strictly require authenticated credentials even if `AUTH_ENFORCE=false`.

2. **Network Sandbox & SSRF Guard (SRS 7.3, 9.4):**
   - *Risk:* Fetching images and metadata from external sources (Zenodo, GBIF, PlantVillage, Kaggle, Wikimedia) can be vulnerable to SSRF (targeting RFC 1918 private IPs, AWS/GCP metadata endpoints `169.254.169.254`, or localhost).
   - *Mitigation:* Implement `backend/services/chi/ssrfGuard.js` enforcing DNS resolution before connection, blocking private ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16, ::1, and link-local IPv6), requiring `https://` protocol only, and enforcing a 15 MB file size limit with a 15-second socket timeout.

3. **Storage & Disk Quota Integrity:**
   - *Risk:* Large zip or image dataset imports could consume disk space or fail mid-download.
   - *Mitigation:* Multi-part streaming directly through SHA-256 calculation and image dimension validation, storing quarantined staging images with automatic cleanup policies.

4. **Database Migration Safety:**
   - *Risk:* Applying migrations in a production database could lock tables or fail idempotency checks.
   - *Mitigation:* All additive DDL will be scripted in `database/migrations/004_crop_health_image_sources.sql` with `IF NOT EXISTS`, alongside a complete `004_crop_health_image_sources_rollback.sql` and tracking in `schema_migrations`.

---

## (d) Master List of Files to Create and Edit (All Phases)

### Files to CREATE (New)

#### Database (Phase 1)
- `database/migrations/004_crop_health_image_sources.sql`
- `database/migrations/004_crop_health_image_sources_rollback.sql`

#### Backend Services (Phases 2, 4, 5, 6, 7, 8)
- `backend/routes/cropHealthIntegration.js` (Mounted at `/api/chi`)
- `backend/services/chi/ssrfGuard.js` (SSRF validator & safe HTTP client)
- `backend/services/chi/sourceManager.js` (CRUD, status, source state engine)
- `backend/services/chi/syncEngine.js` (Batch execution & scheduling)
- `backend/services/chi/connectors/baseConnector.js` (Connector interface)
- `backend/services/chi/connectors/zenodoConnector.js` (Zenodo open API)
- `backend/services/chi/connectors/gbifConnector.js` (GBIF occurrence API)
- `backend/services/chi/connectors/wikimediaConnector.js` (Wikimedia Commons API)
- `backend/services/chi/connectors/plantVillageConnector.js` (PlantVillage / Kaggle dataset provider)
- `backend/services/chi/mappingService.js` (Fuzzy / scientific matching for crops & problems)
- `backend/services/chi/stagingService.js` (Image quarantine, validation, thumbnailing, hashing)
- `backend/services/chi/curationService.js` (Approve/reject workflow, ingestion into `ch_media`)
- `backend/services/chi/exportService.js` (Export packager: COCO, YOLO, CSV, consent verifier)

#### Frontend Components (Phases 3, 4, 6, 7, 8)
- `frontend/src/settings/modules/CropHealthImageSourcesSettings.jsx` (Root settings module)
- `frontend/src/settings/modules/chi/SourceConfigTab.jsx` (Source list & credential modal)
- `frontend/src/settings/modules/chi/SyncStatusTab.jsx` (Sync jobs, logs & triggers)
- `frontend/src/settings/modules/chi/CurationTab.jsx` (Review queue & side-by-side match viewer)
- `frontend/src/settings/modules/chi/MappingTab.jsx` (Taxonomy & problem alignment tables)
- `frontend/src/settings/modules/chi/DatasetExportTab.jsx` (Export packaging & download UI)
- `frontend/src/settings/modules/chi/ChiModal.jsx` (Reusable dialog component)
- `frontend/src/settings/modules/chi/chiApi.js` (Frontend API client for `/api/chi`)

#### Documentation (Phases 0, 9, 10)
- `docs/CHI_DISCOVERY.md` (Current deliverable)
- `docs/CHI_RUNBOOK.md` (Operations, credentials, failure handling)

---

### Files to EDIT (Existing - Additive Only)

1. `backend/server.js`:
   - Additive import: `import chiRouter from "./routes/cropHealthIntegration.js";`
   - Additive mount: `app.use('/api/chi', chiRouter);`
2. `backend/routes/cropHealth.js`:
   - Additive endpoint or filter to include CHI verified images in problem queries.
3. `frontend/src/settings/SettingsHub.jsx`:
   - Additive module card entry in `MODULE_CARDS` under integrations category.
   - Additive case in `renderModuleContent()` loading `CropHealthImageSourcesSettings`.
4. `frontend/src/grow/CropLibrary.jsx`:
   - Additive display section for community/external reference imagery mapped via CHI.
5. `frontend/src/grow/CropHealth.jsx`:
   - Additive badge/link linking diagnostics to verified source imagery.

---

## Phase 0 Readiness Declaration

Discovery phase requirements have been completed. All database prerequisites and schema references are validated. 

**Awaiting user review and authorization to proceed to Phase 1 (Database Migration & Planning).**
