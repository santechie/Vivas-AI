Vivas AI – Crop Health Image Integration Module: SRS & Antigravity Prompt
Nov 18, 2026 · @GK
1. Purpose, scope and assumptions
This SRS adds one new module, Crop Health Image Sources (code CHI), under Settings. It pulls pest, disease and deficiency images from licensed external sources at the click of a button or on a schedule. It files each image under the right crop and problem, and turns the result into a clean, licensed training set for the Vivas AI image model. The module plugs into the existing Crop Health library, Crop Library and remedy (control measure) tables, and creates none of them again.
This version is written after reading the code in /Volumes/Files/Antigravity demo/VivasAI (backend routes, crop_health_schema.sql, migrations, scheduler, outbox, Settings hub, Crop Library and Crop Health screens).
1.1 In scope
A source registry with connectors (iNaturalist, GBIF, PlantVillage dataset, Wikimedia Commons, a generic REST/CSV connector, and EPPO for names and host data only).
Import profiles by crop, problem type, problem and region, and "Run import now" plus scheduled runs.
Staging, de-duplication, licence checks, taxon-to-problem and host-to-crop mapping, and a human review queue.
Publishing approved images into the existing ch_media and ch_problem_crop tables, so they show under each crop.
A "Pests & Diseases" tab in the existing Crop Library crop view, and image galleries in the existing Crop Health library.
An ML data layer: dataset snapshots, a model registry, image-based diagnosis hooked into the existing /api/ch/cases/:id/diagnose, and a remedy-effectiveness loop.
Roles, validations, audit, scheduled jobs and verification scripts.
1.2 Out of scope (this release)
Training the deep-learning model itself. This SRS builds the data, registry and inference contract; the Python model service is phase 7 and can follow later.
Writing remedy content automatically. Remedies stay agronomist-authored in ch_control_measure; the module flags gaps and ranks remedies by results.
Scraping websites with no API or no licence for reuse.
1.3 Stack the build must follow (found in the code)
Layer
What exists today
Rule for CHI
Backend
Node.js, Express 4, ES modules, raw SQL through pg (backend/config/db.js), no ORM
Same. One new router file backend/routes/cropHealthIntegration.js
Routing
Routers mounted in backend/server.js (/api/ch, /api/settings, …)
Mount at /api/chi
Database
PostgreSQL 14+, gen_random_uuid(), SQL files in database/ and numbered files in database/migrations/, tracked in schema_migrations
New file database/migrations/004_crop_health_image_sources.sql, idempotent
Files
Base64 JSON uploads (50 MB body limit), saved on local disk under backend/uploads/<area>, served at /uploads
Save under backend/uploads/crop_health/imported/ behind a small storage helper so S3-compatible storage can come later
Background work
system_scheduled_jobs + registerJob() in services/scheduler.js; domain_events_outbox + emitDomainEvent() in services/eventBus.js
Register CHI jobs and events there; no new queue system
Auth
attachAuth, authGate, farmGuard, requireAdmin in middleware/security.js; AUTH_ENFORCE flag
Every /api/chi write route uses requireAuth + permission check even when AUTH_ENFORCE is off
Frontend
React 19 + Vite, lucide-react, hash routing (#settings/<id>), Settings cards in frontend/src/settings/SettingsHub.jsx
New card + settings/modules/CropHealthImageSourcesSettings.jsx
Design
docs/UI_STYLE_GUIDE.md (Option C "Agronomic Luxe")
Green for agronomy, maroon for pest and disease risk
Verification
scripts/phaseN-verify.mjs pattern
New scripts/phase7-chi-verify.mjs
1.4 Glossary
Problem: a pest, disease or deficiency record in ch_problem (existing).
Source: an external provider of images or names.
Import profile: a saved query (source + crops + problems + filters + schedule).
Run: one execution of a profile.
Import item: one fetched image waiting in staging.
Publish: turning an approved item into a ch_media row on a problem and crop.
Remedy: a ch_control_measure row (existing), optionally tied to a Partner Hub product.
2. Missed points added to the scope
The request left out several things the module needs to work safely and to feed a reliable model. Each one is built into the later sections.
2.1 Gaps in the request
Image licences. Most open images are not free for commercial use. iNaturalist sets a licence per photo, separate from the observation's licence (forum), and most of its photos are CC-BY-NC (Inat_Images). EPPO says its photos may be used only for educational purposes (EPPO). Every image must carry its licence, author and source link, and the module blocks licences the admin has not allowed.
Attribution on screen. Every displayed image shows the credit line and licence badge.
Takedown. One click removes an image everywhere (display and training) if a rights holder asks.
Name matching. Sources use scientific names and synonyms; Vivas uses its own problem codes. A mapping table with review avoids filing images under the wrong problem.
Crop matching. Host plants come as scientific names (for example Solanum lycopersicum); these map to vivas_crops through scientific_name plus a synonym table.
Healthy images. A classifier needs "healthy leaf" images per crop, or it will call every leaf diseased. Profiles can import a HEALTHY class.
Lab versus field photos. The PlantVillage set was taken under controlled conditions (Mohanty et al.), so a model trained only on it does poorly on farm photos. Each image records its setting (LAB, FIELD, HERBARIUM), and farm case photos are weighted highest.
Plant part and growth stage labels (leaf, stem, fruit, root; seedling, vegetative, flowering, fruiting) improve both display and the model.
Duplicates. Exact duplicates are caught by SHA-256; near-duplicates (resized or re-uploaded copies) by a perceptual hash, so the test set does not leak into training.
Quality filter. Minimum resolution, research-grade observations only (where the source offers it), and a blur check.
Region relevance. Profiles filter by country or state (for example India), so the library reflects local pests first.
Remedy gaps. A problem can have images but no remedy for a crop. The module lists these so agronomists fill them before AI suggests anything.
Regulatory checks on remedies. Chemical remedies must keep a pre-harvest interval (phi_days is already required by a check constraint) and should reference registered products (CIBRC in India) through the existing vivas_inputs_catalog or Partner Hub products.
Farmer image consent. Case photos from farms join the training set only when the farm's consent allows it (reuse pih_data_sharing_consents).
Location privacy. GPS in training metadata is rounded (about 1 km) and never exposed outside admin screens.
Resume and cancel. Long imports must resume from a cursor after a crash and be cancellable.
Rate limits and polite crawling. Per-source limits, retries with back-off, and a custom User-Agent.
Dry run. A preview shows how many images a profile would fetch before downloading anything.
Storage growth. Thumbnails, a per-run cap, and a storage counter on the Settings card.
Model governance. Dataset versions, a model registry, shadow mode before go-live, and rollback.
Human in the loop. AI never publishes a new problem or a chemical remedy on its own; agronomists confirm.
Multilingual names. Local names from sources fill the existing ch_problem.local_names JSON.
2.2 Issues found in the current code that affect this module
Finding
Where
Effect on CHI
Fix in this SRS
AI diagnosis is symptom matching with a made-up confidence, not image based
routes/cropHealth.js, POST /cases/:id/diagnose
Imported images are not used yet
Add an image model call and blend its score with the symptom score (section 11)
ch_media has no licence, source link, crop or soft-delete columns
config/crop_health_schema.sql
Cannot store attribution or filter training data
Add columns with ALTER TABLE … ADD COLUMN IF NOT EXISTS (section 6)
ch_import_batch only allows Excel imports (file_name NOT NULL, entity type PEST/DISEASE/DEFICIENCY)
same file
Not a fit for API runs
New chi_import_run; leave ch_import_batch untouched
Uploads have no thumbnails and no file-type check beyond the data-URL prefix
POST /api/ch/upload-image
Gallery pages would load full-size images
CHI makes thumbnails and checks file signatures
getContext() creates a default user and farm when none is found
routes/cropHealth.js
Background jobs could create junk farms
CHI jobs run with an explicit system user and never call getContext()
AUTH_ENFORCE is a monitor-only switch
middleware/security.js
Settings routes could run unauthenticated
CHI routes always require a token
Crop Library crop view has tabs General, Nursery, Planting, Nursery tasks, Field tasks, Financials, but none for pests
frontend/src/grow/CropLibrary.jsx
No place to show images under a crop
Add a "Pests & Diseases" tab (section 10)
Backend has no image library installed
backend/package.json (express, pg, cors, dotenv only)
Thumbnails and hashes need one
Add sharp; fall back to storing originals if it cannot install
3. External sources and connectors
Start with three sources whose licences are machine-readable (iNaturalist, GBIF, PlantVillage) and add others through the generic connector once their terms are confirmed in writing. Each source is a row in chi_source with a connector type, and each connector implements the same four functions.
Source
Connector type
What it gives
Licence handling
Use for
iNaturalist API (api.inaturalist.org/v1)
INATURALIST
Field photos with taxon, date, place, quality grade
Per-photo license_code and attribution (pyinaturalist docs); filter with photo_license
Display and training, field images
GBIF occurrence API (api.gbif.org/v1/occurrence/search?mediaType=StillImage)
GBIF
Images from many datasets, with host and location
Licence varies per image and must be checked (GBIF forum)
Display and training
PlantVillage dataset (54,306 leaf images, 14 crops, 26 diseases)
DATASET_ARCHIVE (zip or folder upload)
Labelled leaf images incl. healthy class
CC0 1.0 for the original release (Meta-Album)
Training seed; marked setting = LAB
Wikimedia Commons API
WIKIMEDIA
Reference photos for problem pages
Per-file licence in extmetadata
Display; training only for CC0/CC-BY/CC-BY-SA
EPPO Data Services (token)
EPPO_META
Codes, scientific names, synonyms, host lists
Photos are for educational use only (EPPO)
Names and host mapping only; never import EPPO photos
Partner or government feeds (for example a state agriculture department, ICAR institutes, a university lab)
CUSTOM_REST or CSV_ZIP
Whatever the partner shares
Licence typed in by admin with a signed agreement on file
Display and training as per agreement
3.1 Connector contract
Each connector lives in backend/services/chi/connectors/<type>.js and exports:
testConnection(source) returns { ok, message, sample_count }.
searchTaxa(source, query) returns external taxa with scientific name, rank and synonyms, used by the mapping screen.
fetchPage(source, profile, cursor) returns { items: [NormalisedItem], nextCursor, done }.
describeLicence(rawItem) returns { license_code, attribution, creator, source_url }.
A NormalisedItem has: external_record_id, external_media_id, media_url, source_page_url, external_taxon_id, taxon_scientific_name, host_scientific_name, observed_at, country_code, state, district, lat, lng, quality_grade, plant_part_hint, life_stage_hint, license_code, attribution, creator, raw (original JSON).
3.2 Licence policy
Licence codes are normalised to: CC0, CC-BY, CC-BY-SA, CC-BY-NC, CC-BY-NC-SA, CC-BY-ND, CC-BY-NC-ND, PARTNER_AGREEMENT, ALL_RIGHTS_RESERVED, UNKNOWN.
Each source has allowed_licenses_display and allowed_licenses_training.
Defaults: display allows CC0, CC-BY, CC-BY-SA, CC-BY-NC, CC-BY-NC-SA, PARTNER_AGREEMENT. Training allows CC0, CC-BY, CC-BY-SA, PARTNER_AGREEMENT. ND licences are display-only (no crops or resizes for training). ALL_RIGHTS_RESERVED and UNKNOWN are never downloaded.
Vivas AI earns revenue (AI credits, billing, Partner Hub store), so a model trained on non-commercial (NC) images and used in paid features is very likely commercial use, even if the images are never displayed. NC training stays off by default; turning it on needs a named approver and date, and should be limited to research models that are never promoted to ACTIVE.
This is a technical control, not legal advice; have the licence policy reviewed by a lawyer before go-live.
3.3 Usage mode and download size
Each source has a usage mode and a download size, set on the Sources tab.
Setting
Options
Default
Effect
usage_mode
DISPLAY_AND_TRAINING, TRAINING_ONLY
DISPLAY_AND_TRAINING
In TRAINING_ONLY, the display licence list is forced to equal the training list, so NC and ND images are never downloaded. Images are published to ch_media with is_training_eligible = true but hidden from farmer galleries (agronomists still see them in the review and published tabs).
download_size
MEDIUM (~500 px), LARGE (~1,024 px), ORIGINAL
LARGE
Which size the connector requests. 1,024 px is enough for training (models use 224–512 px inputs) and keeps each file at roughly 150–300 KB instead of 1–3 MB. ORIGINAL needs an admin reason.
Recommended start for Vivas AI: TRAINING_ONLY + LARGE + training licences CC0, CC-BY, CC-BY-SA, plus the CC0 PlantVillage set and your own confirmed farm case photos.
3.4 Volumes, time and source limits
iNaturalist asks clients to stay at or below 60 API requests per minute and under 10,000 requests per day, and warns that downloading over 5 GB of media per hour or 24 GB per day may lead to a permanent block (iNaturalist developers page, API notes). One API request returns up to 200 observations, so API calls are not the bottleneck; image downloads and human review are.
Estimate for Vivas AI's 80 seeded crops, assuming about 10 problems per crop plus a healthy class, 50 images per class, LARGE size and the default worker speed of 30 images per minute:
Scope
Images
Download time
Storage
1 crop (for example Tomato)
~500
~17 min
~125 MB
Top 10 crops
~5,000
~3 h
~1.3 GB
All 80 crops
up to ~44,000; realistically 20,000–25,000 (many crops and Indian pests have few openly licensed, research-grade photos)
~11–14 h (1–2 overnight runs)
~5–6 GB
PlantVillage archive (one-time)
54,305
no per-image download; ~1–2 h processing
under 1 GB
Monthly refresh
new photos only, usually a few hundred
minutes
small
Human review is the real bottleneck: at ~10 s per image, 25,000 images is about 70 reviewer-hours. Plan for auto-accept on research-grade images from HIGH-trust sources with a 10% random spot-check (section 9.5), and full review only for low-quality or uncertain items.
The Preview step (section 7.3) shows the real count, estimated time and estimated size for a profile before anything is downloaded.
4. Module placement, menus and roles
The module is a new card in the existing Settings hub, opened at #settings/crop-health-image-sources. It is not a new sidebar item. Images it publishes appear inside the existing Crop Library and Crop Health screens, not in a separate library.
4.1 Settings card
Add one entry to the settingsCards array in frontend/src/settings/SettingsHub.jsx, after "Apps & Integrations":
id: crop-health-image-sources
title: Crop Health Image Sources
description: Import pest, disease and deficiency images from licensed sources, review them, file them under crops and build AI training sets.
icon: ImageDown (or Bug) from lucide-react
badge: "<n> images · <m> sources" from GET /api/chi/overview
component: CropHealthImageSourcesSettings
Add the matching count to the hub's overview call so the badge loads with the other cards.
4.2 Sub-tabs inside the module
Tab
Purpose
Overview
Totals by crop and problem type, last runs, pending reviews, remedy gaps, storage used
Sources
Add, edit, test and switch sources on or off; licence policy per source
Name & Crop Mapping
Map external taxa to ch_problem and host plants to vivas_crops
Import Profiles
Saved queries with filters and schedule; "Preview" and "Run import now" buttons
Runs & Logs
Run history, live progress, errors, retry and cancel
Review Queue
Approve, reject, re-label or mark duplicate; bulk actions
Published Images
All published imported images; edit labels, takedown
AI Datasets & Models
Dataset snapshots, model registry, shadow and active models, metrics
4.3 Roles and permissions
Roles live in vivas_settings_roles.permissions (JSON). Add a crop_health_images key; do not create a new roles table.
Permission
Platform admin
Agronomist / SME
Farm Owner
Farm Manager
Field Crew
view (module and galleries)
Yes
Yes
Gallery only
Gallery only
Gallery only
manage_sources (add keys, licence policy)
Yes
No
No
No
No
manage_mapping
Yes
Yes
No
No
No
run_import
Yes
Yes
No
No
No
review (approve, reject, re-label)
Yes
Yes
No
No
No
takedown
Yes
Yes
No
No
No
manage_ml (snapshots, promote model)
Yes
No
No
No
No
Imported images are global (ch_problem.scope = 'GLOBAL'), so only platform-level users manage them. Farm users see them read-only. Admin check reuses isAdminRole() from middleware/security.js; agronomist rights come from the permission JSON.
5. Integration rules: reuse first, add only what is missing
Twenty existing tables, two background services and three screens already cover most of what this feature needs. CHI adds staging, mapping, source and ML tables, and extends ch_media with columns. It changes no existing column, constraint or API response shape.
5.1 Existing assets and how CHI uses them
Existing asset
Today
CHI use
Change allowed
vivas_crops (+ scientific_name, category_id)
Crop Library master
Target crop for every image
None
vivas_crop_categories
Crop categories
Filter profiles by category (Vegetables, Fruits, …)
None
vivas_crop_varieties
Varieties
Optional variety label on farm case images
None
ch_problem
Pest, disease, deficiency library with DRAFT→PUBLISHED workflow
Target problem; unmapped taxa create a GLOBAL DRAFT stub
None (insert rows only)
ch_problem_crop
Problem↔crop link
Insert a link when an approved image proves a new crop–problem pair
Insert only, ON CONFLICT DO NOTHING
ch_problem_review, ch_problem_version
Review history
Stub problems go through the same workflow
None
ch_media (owner PROBLEM/CASE/DIAGNOSIS/FOLLOWUP)
Images on problems and cases
Published imports become owner_type = 'PROBLEM' rows
Add nullable columns only (section 6.2)
ch_lookup
Lookup lists incl. image labels, plant parts
New list codes CHI_SETTING, CHI_LIFE_STAGE; reuse plant parts
Insert lookup rows
ch_symptom, ch_problem_symptom
Symptom matching
Unchanged; still used by the blended diagnosis
None
ch_control_measure
Remedies per problem and crop
Remedy source for suggestions; gap report
None
ch_case, ch_case_diagnosis, ch_ai_request, ch_ai_feedback, v_ch_training_set
Cases, AI results, feedback, training view
Image model writes diagnoses here; feedback feeds retraining
None
ch_case_treatment, ch_case_followup
Treatments and outcomes
Remedy-effectiveness inputs
None
pih_recommendations, pih_treatment_outcomes, generateFarmRecommendations()
Partner Hub product suggestions and outcomes
Product suggestions after a diagnosis; outcome data for effectiveness
None
pih_data_sharing_consents
Partner data consent
Check before a farm case image enters training
None; read only
system_scheduled_jobs, registerJob()
Job runner
New CHI jobs
Insert job rows
domain_events_outbox, emitDomainEvent()
Cross-module events
New chi.* events
None
vivas_settings_roles.permissions
Role JSON
New crop_health_images key
JSON key only
/api/ch/problems, /api/ch/problems/:id
Library APIs
Galleries read through these, extended with a media array
Add fields, never remove
CropHealth.jsx, CropLibrary.jsx, SettingsHub.jsx
Screens
Gallery, new tab, new card
Additive edits only
5.2 Do not create
No new crop, problem, remedy, case, media, lookup, role, notification, job or outbox table.
No second Crop Health library screen; galleries go into the existing problem detail.
No new upload endpoint for users; CHI downloads server-side.
No change to ch_import_batch (Excel bulk import keeps working as is).
5.3 Mandatory discovery step before coding
Antigravity must first run a read-only discovery and write docs/CHI_DISCOVERY.md listing: every table and column it plans to touch (checked against information_schema), every existing route path under /api/ch, /api/settings and /api/chi, and every UI component it will edit. If anything in this SRS already exists under another name, it reuses that and records the decision. Coding starts only after that file is reviewed.
5.4 Integration validations (run at startup and in the verify script)
Tables vivas_crops, ch_problem, ch_problem_crop, ch_media, ch_control_measure, system_scheduled_jobs, domain_events_outbox exist; otherwise CHI routes return 503 with "Crop Health base schema missing".
vivas_crops.scientific_name exists; otherwise crop auto-mapping is off and only manual mapping works.
Enum ch_problem_type contains PEST, DISEASE, DEFICIENCY.
No route path collision between the new router and existing ones.
The CHI migration is recorded in schema_migrations exactly once.
6. Database: new tables, new columns, seeds
CHI adds 11 tables prefixed chi_, 14 nullable columns on ch_media, 4 scheduled jobs and 2 lookup lists, all in one idempotent file: database/migrations/004_crop_health_image_sources.sql. A matching rollback file database/migrations/004_crop_health_image_sources_rollback.sql drops only chi_* objects and the added columns.
6.1 New tables at a glance
Table
Holds
Key links
chi_source
One row per external source, connector type, licence policy
—
chi_taxon_map
External pest/disease taxon → ch_problem
chi_source, ch_problem
chi_crop_map
External host plant → vivas_crops
chi_source, vivas_crops
chi_import_profile
Saved import query and schedule
chi_source
chi_import_run
One execution of a profile
chi_import_profile
chi_import_item
Each fetched image in staging and its review state
run, source, maps, ch_problem, vivas_crops, ch_media
chi_import_log
Run event log
chi_import_run
chi_ml_dataset
Frozen training-set snapshots
—
chi_ml_dataset_item
Images in each snapshot and their split
chi_ml_dataset, ch_media
chi_ml_model
Model registry (shadow, active, retired)
chi_ml_dataset
chi_remedy_effectiveness
Outcome stats per remedy, crop, region, season
ch_control_measure, ch_problem, vivas_crops
6.2 Migration SQL
-- 004_crop_health_image_sources.sql  (idempotent; PostgreSQL 14+)CREATE EXTENSION IF NOT EXISTS pgcrypto;DO $$ BEGIN  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='chi_connector_type') THEN    CREATE TYPE chi_connector_type AS ENUM ('INATURALIST','GBIF','DATASET_ARCHIVE','WIKIMEDIA','EPPO_META','CUSTOM_REST','CSV_ZIP');  END IF;  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='chi_license') THEN    CREATE TYPE chi_license AS ENUM ('CC0','CC-BY','CC-BY-SA','CC-BY-NC','CC-BY-NC-SA','CC-BY-ND','CC-BY-NC-ND','PARTNER_AGREEMENT','ALL_RIGHTS_RESERVED','UNKNOWN');  END IF;  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='chi_map_status') THEN    CREATE TYPE chi_map_status AS ENUM ('PROPOSED','CONFIRMED','REJECTED');  END IF;  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='chi_run_status') THEN    CREATE TYPE chi_run_status AS ENUM ('QUEUED','RUNNING','PAUSED','COMPLETED','PARTIAL','FAILED','CANCELLED');  END IF;  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='chi_review_status') THEN    CREATE TYPE chi_review_status AS ENUM ('PENDING','AUTO_ACCEPTED','APPROVED','PUBLISHED','REJECTED','DUPLICATE','LICENSE_BLOCKED','UNMAPPED','FAILED','TAKEN_DOWN');  END IF;  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='chi_image_setting') THEN    CREATE TYPE chi_image_setting AS ENUM ('FIELD','LAB','HERBARIUM','UNKNOWN');  END IF;  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='chi_ml_split') THEN    CREATE TYPE chi_ml_split AS ENUM ('TRAIN','VALIDATE','TEST');  END IF;END $$;-- 1. SourcesCREATE TABLE IF NOT EXISTS chi_source (  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),  code                       text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9_]{3,40}$'),  name                       text NOT NULL,  connector_type             chi_connector_type NOT NULL,  base_url                   text CHECK (base_url IS NULL OR base_url ~ '^https://'),  allowed_hosts              text[] NOT NULL DEFAULT '{}',   -- image download host allowlist  auth_type                  text NOT NULL DEFAULT 'NONE' CHECK (auth_type IN ('NONE','API_KEY','BEARER','OAUTH2')),  credential_env_key         text,                           -- name of the .env variable, never the secret  allowed_licenses_display   chi_license[] NOT NULL DEFAULT '{CC0,CC-BY,CC-BY-SA,CC-BY-NC,CC-BY-NC-SA,PARTNER_AGREEMENT}',  allowed_licenses_training  chi_license[] NOT NULL DEFAULT '{CC0,CC-BY,CC-BY-SA,PARTNER_AGREEMENT}',  nc_training_approved_by    uuid REFERENCES vivas_users(id),  nc_training_approved_at    timestamptz,  terms_url                  text,  terms_accepted_by          uuid REFERENCES vivas_users(id),  terms_accepted_at          timestamptz,  images_allowed             boolean NOT NULL DEFAULT true,  -- false for EPPO_META  trust_level                text NOT NULL DEFAULT 'MEDIUM' CHECK (trust_level IN ('LOW','MEDIUM','HIGH')),  default_setting            chi_image_setting NOT NULL DEFAULT 'FIELD',  usage_mode                 text NOT NULL DEFAULT 'DISPLAY_AND_TRAINING' CHECK (usage_mode IN ('DISPLAY_AND_TRAINING','TRAINING_ONLY')),  download_size              text NOT NULL DEFAULT 'LARGE' CHECK (download_size IN ('MEDIUM','LARGE','ORIGINAL')),  download_size_reason       text,                           -- required when ORIGINAL  max_requests_per_day       int NOT NULL DEFAULT 9000 CHECK (max_requests_per_day BETWEEN 100 AND 100000),  max_bytes_per_hour         bigint NOT NULL DEFAULT 4294967296,   -- 4 GB, under iNaturalist's 5 GB/h  max_bytes_per_day          bigint NOT NULL DEFAULT 21474836480,  -- 20 GB, under iNaturalist's 24 GB/day  images_per_min             int NOT NULL DEFAULT 30 CHECK (images_per_min BETWEEN 1 AND 120),  rate_limit_per_min         int NOT NULL DEFAULT 60 CHECK (rate_limit_per_min BETWEEN 1 AND 600),  max_image_bytes            int NOT NULL DEFAULT 10485760 CHECK (max_image_bytes BETWEEN 51200 AND 52428800),  min_image_px               int NOT NULL DEFAULT 256 CHECK (min_image_px BETWEEN 64 AND 4096),  config                     jsonb NOT NULL DEFAULT '{}',    -- connector specific (quality_grade, dataset path…)  is_active                  boolean NOT NULL DEFAULT false,  last_test_at               timestamptz,  last_test_ok               boolean,  last_success_at            timestamptz,  created_by                 uuid NOT NULL REFERENCES vivas_users(id),  created_at                 timestamptz NOT NULL DEFAULT now(),  updated_at                 timestamptz NOT NULL DEFAULT now(),  deleted_at                 timestamptz,  CHECK (auth_type = 'NONE' OR credential_env_key IS NOT NULL),  CHECK (connector_type <> 'EPPO_META' OR images_allowed = false),  CHECK (NOT is_active OR terms_accepted_at IS NOT NULL));-- 2. External taxon -> ch_problemCREATE TABLE IF NOT EXISTS chi_taxon_map (  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),  source_id          uuid NOT NULL REFERENCES chi_source(id) ON DELETE CASCADE,  external_taxon_id  text NOT NULL,  scientific_name    text NOT NULL,  rank               text,  synonyms           text[] NOT NULL DEFAULT '{}',  common_names       jsonb NOT NULL DEFAULT '{}',  problem_type       ch_problem_type,  is_healthy_class   boolean NOT NULL DEFAULT false,  problem_id         uuid REFERENCES ch_problem(id),  match_method       text CHECK (match_method IN ('EXACT','SYNONYM','FUZZY','MANUAL')),  match_score        numeric(4,3) CHECK (match_score BETWEEN 0 AND 1),  status             chi_map_status NOT NULL DEFAULT 'PROPOSED',  confirmed_by       uuid REFERENCES vivas_users(id),  confirmed_at       timestamptz,  created_at         timestamptz NOT NULL DEFAULT now(),  updated_at         timestamptz NOT NULL DEFAULT now(),  UNIQUE (source_id, external_taxon_id),  CHECK (status <> 'CONFIRMED' OR is_healthy_class OR problem_id IS NOT NULL),  CHECK (NOT is_healthy_class OR problem_id IS NULL));CREATE INDEX IF NOT EXISTS ix_chi_taxon_problem ON chi_taxon_map(problem_id);CREATE INDEX IF NOT EXISTS ix_chi_taxon_name ON chi_taxon_map(lower(scientific_name));-- 3. External host plant -> vivas_cropsCREATE TABLE IF NOT EXISTS chi_crop_map (  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),  source_id            uuid REFERENCES chi_source(id) ON DELETE CASCADE,  -- NULL = applies to all sources  external_host_id     text,  host_scientific_name text NOT NULL,  crop_id              uuid REFERENCES vivas_crops(id),  match_method         text CHECK (match_method IN ('EXACT','SYNONYM','FUZZY','MANUAL')),  status               chi_map_status NOT NULL DEFAULT 'PROPOSED',  confirmed_by         uuid REFERENCES vivas_users(id),  confirmed_at         timestamptz,  created_at           timestamptz NOT NULL DEFAULT now(),  CHECK (status <> 'CONFIRMED' OR crop_id IS NOT NULL));CREATE UNIQUE INDEX IF NOT EXISTS ux_chi_crop_map ON chi_crop_map (COALESCE(source_id,'00000000-0000-0000-0000-000000000000'), lower(host_scientific_name));-- 4. Import profilesCREATE TABLE IF NOT EXISTS chi_import_profile (  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),  name                   text NOT NULL,  source_id              uuid NOT NULL REFERENCES chi_source(id),  crop_ids               uuid[] NOT NULL DEFAULT '{}',     -- empty = all mapped crops  crop_category_ids      uuid[] NOT NULL DEFAULT '{}',  problem_types          ch_problem_type[] NOT NULL DEFAULT '{PEST,DISEASE,DEFICIENCY}',  problem_ids            uuid[] NOT NULL DEFAULT '{}',  include_healthy        boolean NOT NULL DEFAULT false,  country_codes          text[] NOT NULL DEFAULT '{IN}',  states                 text[] NOT NULL DEFAULT '{}',  observed_from          date,  observed_to            date,  quality_filter         text NOT NULL DEFAULT 'RESEARCH' CHECK (quality_filter IN ('RESEARCH','NEEDS_ID','ANY')),  max_images_per_problem int  NOT NULL DEFAULT 50 CHECK (max_images_per_problem BETWEEN 1 AND 2000),  max_images_per_run     int  NOT NULL DEFAULT 2000 CHECK (max_images_per_run BETWEEN 1 AND 50000),  auto_accept            boolean NOT NULL DEFAULT false,  schedule               text NOT NULL DEFAULT 'MANUAL' CHECK (schedule IN ('MANUAL','DAILY','WEEKLY','MONTHLY')),  next_run_at            timestamptz,  last_run_id            uuid,  is_active              boolean NOT NULL DEFAULT true,  created_by             uuid NOT NULL REFERENCES vivas_users(id),  created_at             timestamptz NOT NULL DEFAULT now(),  updated_at             timestamptz NOT NULL DEFAULT now(),  deleted_at             timestamptz,  UNIQUE (name),  CHECK (observed_to IS NULL OR observed_from IS NULL OR observed_to >= observed_from),  CHECK (schedule = 'MANUAL' OR next_run_at IS NOT NULL));-- 5. RunsCREATE TABLE IF NOT EXISTS chi_import_run (  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),  run_no            text NOT NULL UNIQUE,                 -- CHI-RUN-000123  profile_id        uuid REFERENCES chi_import_profile(id),  source_id         uuid NOT NULL REFERENCES chi_source(id),  trigger_type      text NOT NULL CHECK (trigger_type IN ('MANUAL','SCHEDULED','RETRY','PREVIEW','DATASET_UPLOAD')),  is_dry_run        boolean NOT NULL DEFAULT false,  params_snapshot   jsonb NOT NULL,                       -- frozen copy of profile filters  status            chi_run_status NOT NULL DEFAULT 'QUEUED',  cursor            jsonb NOT NULL DEFAULT '{}',          -- resume point  fetched_count     int NOT NULL DEFAULT 0,  new_count         int NOT NULL DEFAULT 0,  duplicate_count   int NOT NULL DEFAULT 0,  blocked_count     int NOT NULL DEFAULT 0,  unmapped_count    int NOT NULL DEFAULT 0,  error_count       int NOT NULL DEFAULT 0,  estimated_total   int,  bytes_downloaded  bigint NOT NULL DEFAULT 0,  cancel_requested  boolean NOT NULL DEFAULT false,  locked_by         text,  heartbeat_at      timestamptz,  triggered_by      uuid REFERENCES vivas_users(id),  started_at        timestamptz,  finished_at       timestamptz,  error_summary     text,  created_at        timestamptz NOT NULL DEFAULT now());CREATE SEQUENCE IF NOT EXISTS chi_seq_run START 1;CREATE INDEX IF NOT EXISTS ix_chi_run_status ON chi_import_run(status, created_at);-- only one active run per sourceCREATE UNIQUE INDEX IF NOT EXISTS ux_chi_run_active_source ON chi_import_run(source_id) WHERE status IN ('QUEUED','RUNNING');-- 6. Staging itemsCREATE TABLE IF NOT EXISTS chi_import_item (  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),  run_id               uuid NOT NULL REFERENCES chi_import_run(id) ON DELETE CASCADE,  source_id            uuid NOT NULL REFERENCES chi_source(id),  external_record_id   text NOT NULL,  external_media_id    text NOT NULL,  media_url_original   text NOT NULL,  source_page_url      text,  local_url            text,  thumb_url            text,  mime_type            text CHECK (mime_type IS NULL OR mime_type IN ('image/jpeg','image/png','image/webp')),  file_bytes           int,  width                int,  height               int,  checksum_sha256      text,  phash                text,  blur_score           numeric(8,2),  license_code         chi_license NOT NULL DEFAULT 'UNKNOWN',  attribution_text     text,  creator_name         text,  observed_at          timestamptz,  country_code         text,  state                text,  district             text,  lat_rounded          numeric(6,2),  lng_rounded          numeric(6,2),  quality_grade        text,  setting              chi_image_setting NOT NULL DEFAULT 'UNKNOWN',  taxon_map_id         uuid REFERENCES chi_taxon_map(id),  crop_map_id          uuid REFERENCES chi_crop_map(id),  problem_id           uuid REFERENCES ch_problem(id),  crop_id              uuid REFERENCES vivas_crops(id),  is_healthy           boolean NOT NULL DEFAULT false,  plant_part_id        uuid REFERENCES ch_lookup(id),  life_stage_id        uuid REFERENCES ch_lookup(id),  review_status        chi_review_status NOT NULL DEFAULT 'PENDING',  reject_reason        text,  duplicate_of_item_id uuid REFERENCES chi_import_item(id),  duplicate_of_media_id uuid REFERENCES ch_media(id),  reviewed_by          uuid REFERENCES vivas_users(id),  reviewed_at          timestamptz,  media_id             uuid REFERENCES ch_media(id),  raw_payload          jsonb NOT NULL DEFAULT '{}',  created_at           timestamptz NOT NULL DEFAULT now(),  updated_at           timestamptz NOT NULL DEFAULT now(),  UNIQUE (source_id, external_media_id),  CHECK (review_status NOT IN ('APPROVED','PUBLISHED','AUTO_ACCEPTED') OR (crop_id IS NOT NULL AND (problem_id IS NOT NULL OR is_healthy))),  CHECK (review_status <> 'PUBLISHED' OR media_id IS NOT NULL),  CHECK (review_status <> 'REJECTED' OR reject_reason IS NOT NULL));CREATE INDEX IF NOT EXISTS ix_chi_item_review ON chi_import_item(review_status, created_at);CREATE INDEX IF NOT EXISTS ix_chi_item_crop_problem ON chi_import_item(crop_id, problem_id);CREATE INDEX IF NOT EXISTS ix_chi_item_checksum ON chi_import_item(checksum_sha256);CREATE INDEX IF NOT EXISTS ix_chi_item_phash ON chi_import_item(phash);-- 7. Run logCREATE TABLE IF NOT EXISTS chi_import_log (  id         bigserial PRIMARY KEY,  run_id     uuid NOT NULL REFERENCES chi_import_run(id) ON DELETE CASCADE,  level      text NOT NULL CHECK (level IN ('INFO','WARN','ERROR')),  code       text NOT NULL,          -- e.g. HTTP_429, LICENSE_BLOCKED, MIME_REJECTED  message    text NOT NULL,  context    jsonb NOT NULL DEFAULT '{}',  created_at timestamptz NOT NULL DEFAULT now());CREATE INDEX IF NOT EXISTS ix_chi_log_run ON chi_import_log(run_id, id);-- 8. Extend ch_media (additive only)ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS crop_id            uuid REFERENCES vivas_crops(id);ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS source_id          uuid REFERENCES chi_source(id);ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS import_item_id     uuid REFERENCES chi_import_item(id);ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS external_media_id  text;ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS source_url         text;ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS license_code       chi_license;ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS attribution_text   text;ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS phash              text;ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS plant_part_id      uuid REFERENCES ch_lookup(id);ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS life_stage_id      uuid REFERENCES ch_lookup(id);ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS setting            chi_image_setting;ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS is_training_eligible boolean NOT NULL DEFAULT false;ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS label_verified_by  uuid REFERENCES vivas_users(id);ALTER TABLE ch_media ADD COLUMN IF NOT EXISTS deleted_at         timestamptz;CREATE INDEX IF NOT EXISTS ix_ch_media_crop ON ch_media(crop_id, owner_type, owner_id) WHERE deleted_at IS NULL;CREATE UNIQUE INDEX IF NOT EXISTS ux_ch_media_source_ext ON ch_media(source_id, external_media_id) WHERE source_id IS NOT NULL;-- 9. ML dataset snapshotsCREATE TABLE IF NOT EXISTS chi_ml_dataset (  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),  version       text NOT NULL UNIQUE,         -- e.g. 2026.11.18-01  scope_crop_ids uuid[] NOT NULL DEFAULT '{}',  class_count   int NOT NULL DEFAULT 0,  image_count   int NOT NULL DEFAULT 0,  field_share   numeric(4,3),  split_seed    int NOT NULL DEFAULT 42,  manifest_url  text,                          -- CSV/JSONL manifest under uploads/ml/  status        text NOT NULL DEFAULT 'BUILDING' CHECK (status IN ('BUILDING','READY','FAILED','ARCHIVED')),  created_by    uuid REFERENCES vivas_users(id),  created_at    timestamptz NOT NULL DEFAULT now());CREATE TABLE IF NOT EXISTS chi_ml_dataset_item (  dataset_id  uuid NOT NULL REFERENCES chi_ml_dataset(id) ON DELETE CASCADE,  media_id    uuid NOT NULL REFERENCES ch_media(id),  class_key   text NOT NULL,                   -- '<crop_code>__<problem_code>' or '<crop_code>__HEALTHY'  split       chi_ml_split NOT NULL,  group_key   text,                            -- keeps near-duplicates in one split  PRIMARY KEY (dataset_id, media_id));-- 10. Model registryCREATE TABLE IF NOT EXISTS chi_ml_model (  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),  name             text NOT NULL,                -- 'vivas-crop-health-vision'  version          text NOT NULL,  task             text NOT NULL DEFAULT 'IMAGE_CLASSIFY' CHECK (task IN ('IMAGE_CLASSIFY','REMEDY_RANK')),  dataset_id       uuid REFERENCES chi_ml_dataset(id),  classes          jsonb NOT NULL DEFAULT '[]',  metrics          jsonb NOT NULL DEFAULT '{}',  -- top1, top3, macro_f1, per_class_recall, field_top1  endpoint_url     text,  status           text NOT NULL DEFAULT 'CANDIDATE' CHECK (status IN ('CANDIDATE','SHADOW','ACTIVE','RETIRED','REJECTED')),  promoted_by      uuid REFERENCES vivas_users(id),  promoted_at      timestamptz,  created_at       timestamptz NOT NULL DEFAULT now(),  UNIQUE (name, version));CREATE UNIQUE INDEX IF NOT EXISTS ux_chi_model_active ON chi_ml_model(name, task) WHERE status = 'ACTIVE';-- 11. Remedy effectivenessCREATE TABLE IF NOT EXISTS chi_remedy_effectiveness (  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),  control_measure_id  uuid NOT NULL REFERENCES ch_control_measure(id) ON DELETE CASCADE,  problem_id          uuid NOT NULL REFERENCES ch_problem(id),  crop_id             uuid NOT NULL REFERENCES vivas_crops(id),  state               text NOT NULL DEFAULT 'ALL',  season              text NOT NULL DEFAULT 'ALL',  cases_n             int NOT NULL DEFAULT 0,  resolved_n          int NOT NULL DEFAULT 0,  success_rate        numeric(5,4),  success_rate_lower  numeric(5,4),          -- Wilson lower bound, used for ranking  avg_days_to_resolve numeric(6,2),  avg_cost            numeric(12,2),  computed_at         timestamptz NOT NULL DEFAULT now(),  UNIQUE (control_measure_id, crop_id, state, season));-- 12. Lookups (reuse ch_lookup)INSERT INTO ch_lookup (list_code, code, label, sort_order) VALUES ('CHI_LIFE_STAGE','SEEDLING','Seedling',1),('CHI_LIFE_STAGE','VEGETATIVE','Vegetative',2), ('CHI_LIFE_STAGE','FLOWERING','Flowering',3),('CHI_LIFE_STAGE','FRUITING','Fruiting',4), ('CHI_LIFE_STAGE','MATURITY','Maturity / harvest',5)ON CONFLICT DO NOTHING;-- 13. Jobs (reuse system_scheduled_jobs)INSERT INTO system_scheduled_jobs (job_name, description, interval_seconds, next_run_at) VALUES ('chi_import_worker',           'Processes queued CHI import runs',                 30,    NOW()), ('chi_schedule_dispatcher',     'Queues runs for profiles whose next_run_at is due', 300,   NOW()), ('chi_remedy_effectiveness',    'Recomputes remedy success rates from case outcomes', 86400, NOW()), ('chi_housekeeping',            'Clears orphan files, stale locks, old dry-run items', 86400, NOW())ON CONFLICT (job_name) DO NOTHING;INSERT INTO schema_migrations (version, name) VALUES ('004','crop_health_image_sources') ON CONFLICT (version) DO NOTHING;
Also add a chi_touch_updated_at trigger to chi_source, chi_taxon_map, chi_import_profile and chi_import_item, reusing the existing ch_touch_updated_at() function.
6.3 Seed data
chi_source rows for INATURALIST, GBIF, PLANTVILLAGE (DATASET_ARCHIVE) and WIKIMEDIA with is_active = false; the admin accepts terms to activate.
chi_crop_map rows built from vivas_crops.scientific_name for all seeded crops (status CONFIRMED, method EXACT).
chi_taxon_map is not seeded; the mapping screen proposes matches from ch_problem.scientific_name.
7. Workflows
One button press queues a run; a background worker fetches, checks and stages images; people approve them; approved images land on the crop and problem, and later feed the model and remedy ranking.
CHI end-to-end flow · import, publish, learn, remedy
The bottom loop is what makes the system learn: every confirmed case adds labelled field photos to the next dataset, and every treatment outcome re-ranks remedies.
7.1 Source onboarding
Admin opens Sources → Add source, picks a connector type and fills name, base URL, allowed hosts and credential variable name.
Admin reads the terms link and ticks "I accept the terms"; the system stores who and when.
Admin clicks Test connection. The connector calls testConnection(); result and sample count are saved.
Admin sets licence policy (display and training lists). Allowing NC licences for training needs a second confirmation and is logged.
Admin switches the source on. Rule: a source cannot be active without accepted terms and a successful test in the last 30 days.
7.2 Name and crop mapping
Agronomist opens Name & Crop Mapping, picks a source and a crop.
For each ch_problem linked to that crop, the system calls searchTaxa() with the scientific name and synonyms and proposes matches: EXACT (same name), SYNONYM, or FUZZY (similarity ≥ 0.85).
Agronomist confirms, changes or rejects each proposal. Only CONFIRMED maps are used to file images.
If the source has a pest or disease that Vivas does not have, the agronomist can click "Create problem stub". This inserts a GLOBAL ch_problem in DRAFT with name, scientific name, type and local names, and it then follows the existing SUBMIT → VERIFY → PUBLISH workflow in Crop Health.
Host plants map to crops the same way. Healthy-class taxa (the crop itself) map with is_healthy_class = true.
7.3 Import run ("Run import now")
User opens Import Profiles, selects a profile and clicks Preview. A dry run fetches only counts and 12 sample thumbnails (not stored) and shows the estimated number of new images and the licence mix.
User clicks Run import now. POST /api/chi/profiles/:id/run validates (section 9) and inserts chi_import_run with status QUEUED, then returns 202 { run_id, run_no }. The request does not wait for the download.
The chi_import_worker job (every 30 s) picks the oldest QUEUED run with SELECT … FOR UPDATE SKIP LOCKED, sets RUNNING, locked_by and heartbeat_at.
For each page from fetchPage():
Skip if (source_id, external_media_id) already exists → count as duplicate.
Normalise the licence; if not in the display list → item LICENSE_BLOCKED, no download.
Resolve taxon map and crop map. If either is missing or not CONFIRMED → item UNMAPPED, no download.
Download the image at the source's download size (default ~1,024 px): HTTPS only, host must be in allowed_hosts, at most 3 redirects, 20 s timeout, size ≤ max_image_bytes. Check the file signature (JPEG, PNG or WebP).
Compute SHA-256. If it equals an existing item or ch_media.checksum → DUPLICATE.
With sharp: read size, reject if the short side is below min_image_px, compute a perceptual hash (within Hamming distance 6 of an existing one → DUPLICATE), a blur score, and a 320 px WebP thumbnail. Strip EXIF GPS.
Save to uploads/crop_health/imported/<source_code>/<yyyy>/<mm>/<uuid>.<ext>.
Set status: AUTO_ACCEPTED if the profile has auto_accept, the source is HIGH trust and both maps are CONFIRMED; otherwise PENDING.
After each page: update counters, cursor and heartbeat_at; stop cleanly if cancel_requested or max_images_per_run or max_images_per_problem is reached.
On HTTP 429 or 5xx: back off (2, 4, 8, 16, 32 s), then fail the page; after 5 failed pages the run ends PARTIAL.
On finish: status COMPLETED, PARTIAL or FAILED; emit chi.run.completed; create a notification for the user who started it.
A run whose heartbeat is older than 10 minutes is treated as crashed; the next worker tick resumes it from cursor.
7.4 Review and publish
Reviewer opens Review Queue, filtered by crop, problem, source or run. Each card shows the image, proposed crop and problem, licence, credit, location (state level) and quality warnings.
Actions: Approve, Reject (reason required), Change crop or problem, Set plant part and life stage, Mark duplicate. Bulk approve is allowed for up to 200 items with the same crop and problem.
Publish (on Approve or for AUTO_ACCEPTED items), in one transaction:
Insert ch_media with owner_type = 'PROBLEM', owner_id = problem_id, crop_id, url, thumb_url, checksum, source_credit (creator), attribution_text, license_code, source_id, external_media_id, source_url, plant_part_id, life_stage_id, setting, is_training_eligible (licence in the training list and label confirmed).
Insert ch_problem_crop (problem_id, crop_id) if missing (ON CONFLICT DO NOTHING).
Set the first image of a problem–crop pair as is_primary = true if none exists.
Update the item to PUBLISHED with media_id.
Emit chi.media.published.
Healthy-class images have no problem to attach to, so they are not copied into ch_media. They stay as chi_import_item rows with status APPROVED and are used only by dataset snapshots.
7.5 Takedown
A user with takedown permission removes a published image: ch_media.deleted_at is set, the file moves to uploads/crop_health/quarantine/, the item becomes TAKEN_DOWN, and future dataset snapshots exclude it. Existing snapshots that contain it are flagged "needs rebuild".
7.6 Scheduled imports
chi_schedule_dispatcher (every 5 minutes) finds active profiles with schedule <> 'MANUAL' and next_run_at <= now(), queues a run if none is active for that source, and moves next_run_at forward by 1 day, 7 days or 1 month.
7.7 From image to remedy (runtime)
A farmer creates a case in Crop Health and uploads photos (existing flow).
POST /api/ch/cases/:id/diagnose (existing) now also calls the active image model if the case has photos (section 11). Results are written to ch_case_diagnosis and ch_ai_request as today.
Agronomist or farmer confirms the diagnosis (existing POST /api/ch/diagnoses/:id/confirm). A correction is recorded in ch_ai_feedback.
GET /api/ch/cases/:id/remedies (existing) returns control measures, now sorted by chi_remedy_effectiveness.success_rate_lower for the crop and state, with the evidence count shown.
Partner Hub product suggestions come from the existing generateFarmRecommendations() for the confirmed problem.
Applying a remedy creates ch_case_treatment and a farm task (existing). Follow-ups and the case outcome feed chi_remedy_effectiveness nightly.
Confirmed case photos with farm consent become training-eligible and join the next dataset snapshot.
8. APIs and CRUD
All new endpoints live in backend/routes/cropHealthIntegration.js, mounted at /api/chi, and follow the existing response helper in backend/utils/response.js ({ success, data, message }, plus meta: { page, page_size, total } for lists). Three existing Crop Health endpoints get extra fields; none lose any.
8.1 Conventions
Auth: requireAuth on every route, then a requirePerm('crop_health_images', '<perm>') helper that reads vivas_settings_roles.permissions (admins pass).
Validation: backend/utils/validate.js patterns; reject unknown fields; UUIDs checked before SQL.
Paging: page (≥ 1), page_size (1–100, default 25), sort, order (asc / desc) from an allowlist.
Errors: 400 validation, 401, 403, 404, 409 conflict (duplicate code, active run exists), 422 business rule, 503 base schema missing.
Writes that touch several tables run in one transaction with pool.connect() / BEGIN / COMMIT.
Every write emits a chi.* outbox event or a chi_import_log row.
8.2 Endpoints
Method & path
Perm
Purpose
GET /api/chi/overview
view
Card badge and Overview tab totals
GET /api/chi/sources
view
List sources (secrets never returned)
POST /api/chi/sources
manage_sources
Create source
GET /api/chi/sources/:id
view
Source detail
PUT /api/chi/sources/:id
manage_sources
Update source
POST /api/chi/sources/:id/accept-terms
manage_sources
Record terms acceptance
POST /api/chi/sources/:id/test
manage_sources
Test connection
POST /api/chi/sources/:id/activate · /deactivate
manage_sources
Switch on or off
DELETE /api/chi/sources/:id
manage_sources
Soft delete (blocked if it has published media; deactivate instead)
GET /api/chi/sources/:id/taxa?q=
manage_mapping
Search taxa at the source
GET /api/chi/taxon-maps
view
List with filters source_id, status, crop_id, problem_type
POST /api/chi/taxon-maps/propose
manage_mapping
Auto-propose maps for a crop
POST /api/chi/taxon-maps
manage_mapping
Create a manual map
PUT /api/chi/taxon-maps/:id
manage_mapping
Confirm, change or reject
POST /api/chi/taxon-maps/:id/create-problem-stub
manage_mapping
Create DRAFT ch_problem and link it
DELETE /api/chi/taxon-maps/:id
manage_mapping
Delete (only if no published media uses it)
GET · POST · PUT · DELETE /api/chi/crop-maps[/:id]
manage_mapping
Same CRUD for host→crop
GET /api/chi/profiles
view
List profiles
POST /api/chi/profiles
run_import
Create
GET /api/chi/profiles/:id
view
Detail incl. last 5 runs
PUT /api/chi/profiles/:id
run_import
Update
DELETE /api/chi/profiles/:id
run_import
Soft delete
POST /api/chi/profiles/:id/preview
run_import
Dry run: counts, licence mix, 12 sample thumbs
POST /api/chi/profiles/:id/run
run_import
Run import now, returns 202 + run id
POST /api/chi/datasets/upload
run_import
Register a PlantVillage-style zip already on the server (path inside uploads/chi_inbox/)
GET /api/chi/runs
view
Run history
GET /api/chi/runs/:id
view
Progress and counters (UI polls every 3 s while RUNNING)
GET /api/chi/runs/:id/logs
view
Paged log
POST /api/chi/runs/:id/cancel
run_import
Set cancel_requested
POST /api/chi/runs/:id/retry
run_import
New run with trigger RETRY from the failed cursor
GET /api/chi/items
review
Review queue with filters review_status, crop_id, problem_id, source_id, run_id, license_code
GET /api/chi/items/:id
review
Item detail incl. raw payload
PUT /api/chi/items/:id
review
Change crop, problem, plant part, life stage, healthy flag
POST /api/chi/items/:id/approve
review
Approve and publish
POST /api/chi/items/:id/reject
review
Reject with reason
POST /api/chi/items/bulk
review
Bulk action: approve, reject (reason required) or mark_duplicate on up to 200 item ids
GET /api/chi/media
view
Published imported media by crop and problem
PUT /api/chi/media/:id
review
Edit labels, primary flag, training eligibility
POST /api/chi/media/:id/takedown
takedown
Takedown
GET /api/chi/crops/:cropId/problems
view
Problems for one crop with counts and primary image (used by Crop Library tab)
GET /api/chi/remedy-gaps
view
Published problem–crop pairs with images but no active control measure
GET /api/chi/ml/datasets · POST /api/chi/ml/datasets
manage_ml
List or build a snapshot
GET /api/chi/ml/datasets/:id/manifest
manage_ml
Download manifest (CSV)
GET · POST /api/chi/ml/models
manage_ml
List or register a model version with metrics
POST /api/chi/ml/models/:id/promote
manage_ml
CANDIDATE→SHADOW→ACTIVE
POST /api/chi/ml/models/:id/rollback
manage_ml
Re-activate previous model
GET /api/chi/ml/shadow-report
manage_ml
Shadow vs active agreement and accuracy on confirmed cases
GET /api/chi/ml/training-feed?since=
service token
Machine endpoint for the training service: eligible media, labels, splits
8.3 Changes to existing endpoints (additive)
Endpoint
Change
GET /api/ch/problems?crop_id=
Add primary_image_url, image_count per row
GET /api/ch/problems/:id
media array gains license_code, attribution_text, source_url, crop_id, plant_part, setting; filter deleted_at IS NULL; optional ?crop_id= filter
POST /api/ch/cases/:id/diagnose
Calls the active image model when the case has photos; blends with the symptom score; same response shape plus sources: ['VISION','SYMPTOM'] and model_version per candidate
GET /api/ch/cases/:id/remedies
Adds effectiveness: { success_rate, cases_n, success_rate_lower }; sorts by it when cases_n ≥ 5, otherwise by seq as today
8.4 Domain events (outbox)
chi.source.activated, chi.run.completed, chi.media.published, chi.media.taken_down, chi.problem_stub.created, chi.dataset.ready, chi.model.promoted. Handlers: notifications to admins; chi.media.published invalidates any cached crop–problem counts.
9. Validations
Every rule below is enforced on the server (API and, where possible, a database constraint) and mirrored in the form so users see the message before saving. Messages are plain sentences shown next to the field.
9.1 Sources
Field or action
Rule
Message
code
Required, 3–40 chars, A–Z 0–9 _ , unique
"Code must be 3–40 capital letters, numbers or underscores, and unique."
name
Required, 3–120 chars
"Enter a source name."
base_url
HTTPS only; no IP address, localhost or private range
"Use an https:// address on a public host."
allowed_hosts
At least one host when images_allowed; each a valid hostname
"Add the host names images are downloaded from."
credential_env_key
Required when auth_type <> NONE; must exist in process.env at test time; value never stored or returned
"Set <KEY> in the server .env file, then test again."
rate_limit_per_min
1–600
"Rate limit must be between 1 and 600 per minute."
Training licences
Must be a subset of display licences; NC needs approver and date
"Non-commercial licences need legal approval before use in training."
EPPO_META
images_allowed forced false
"EPPO photos may only be used for education; this source imports names only."
Activate
Terms accepted and a passing test within 30 days
"Accept the terms and pass a connection test before switching on."
Delete
Blocked if any published ch_media uses the source
"This source has published images. Deactivate it instead."
9.2 Mapping
Rule
Message
A CONFIRMED taxon map needs a problem_id unless it is a healthy class
"Pick the Vivas problem this name maps to."
problem_type of the external taxon must equal ch_problem.problem_type
"This is a <type> at the source but a <type> in Vivas."
Problem must not be deleted; ARCHIVED or REJECTED problems cannot be mapped
"This problem is archived. Pick an active one."
One external taxon per source maps to one problem (unique key)
"This name is already mapped."
Crop map must point to an active vivas_crops row
"This crop is inactive in the Crop Library."
Problem stub: name 3–150 chars, scientific name required for PEST and DISEASE, DEFICIENCY needs nutrient_code (existing check)
"Add the scientific name" / "Pick the nutrient."
Changing a CONFIRMED map that already has published media asks for confirmation and re-files those images in one transaction
"<n> published images will move to <problem>. Continue?"
9.3 Import profiles and runs
Rule
Message
Source must be active
"Switch the source on first."
At least one crop or category with a CONFIRMED crop map, and at least one CONFIRMED taxon map for the chosen crops
"No confirmed name mappings for these crops yet. Map them first."
observed_to ≥ observed_from; neither in the future
"End date must be after start date and not in the future."
max_images_per_problem 1–2,000; max_images_per_run 1–50,000
"Keep limits within the allowed range."
Only one QUEUED or RUNNING run per source (unique index)
409 "An import from this source is already running (<run_no>)."
Disk space: refuse when free space on the uploads volume is below 2 GB or the estimated run size
422 "Not enough storage for this import."
auto_accept allowed only for HIGH-trust sources
"Auto-accept is only allowed for high-trust sources."
Manual run allowed at most once every 2 minutes per profile
429 "Please wait before running this profile again."
Cancel only for QUEUED or RUNNING; retry only for FAILED, PARTIAL or CANCELLED
"This run can't be cancelled / retried in its current state."
Daily and hourly caps: the worker keeps per-source counters for API requests and bytes (in the last hour and last 24 h, from chi_import_run.bytes_downloaded and the log). When a cap is reached the run moves to PAUSED with the message "Paused to stay within <source> limits; resumes at <time>", and the dispatcher resumes it automatically. Changing a source to TRAINING_ONLY sets its display licence list equal to its training list; trying to add a licence to the display list in this mode shows "Training-only sources download only training-approved licences." download_size = ORIGINAL requires a reason.
9.4 Per image (worker)
Check
Result if it fails
Licence in display list
LICENSE_BLOCKED, not downloaded
Taxon and crop maps CONFIRMED
UNMAPPED, not downloaded
URL is HTTPS, host in allowed_hosts, resolved IP not private or loopback, ≤ 3 redirects
FAILED, log URL_BLOCKED
HTTP 200 within 20 s
FAILED, log HTTP_<code>
Size ≤ max_image_bytes (checked on content-length and while streaming)
FAILED, TOO_LARGE
File signature is JPEG, PNG or WebP (not just the extension or header)
FAILED, MIME_REJECTED
Short side ≥ min_image_px
REJECTED, TOO_SMALL
SHA-256 not already present
DUPLICATE
Perceptual-hash distance > 6 from existing images of the same crop
DUPLICATE (links duplicate_of_*)
Blur score above threshold (default 100, variance of Laplacian)
stays PENDING with a "blurry" warning
Observation date not in the future
REJECTED, BAD_DATE
9.5 Review and publish
Rule
Message
Approve needs crop and (problem or healthy flag)
"Set the crop and problem before approving."
Problem must be linked to the crop already, or the reviewer confirms adding the link
"<problem> is not yet linked to <crop>. Add the link?"
Problem in DRAFT can receive images, but they stay hidden from farmers until the problem is PUBLISHED
Info banner
Reject needs a reason from a list (wrong pest, wrong crop, poor quality, not a plant problem, licence issue, other + text)
"Pick a reason."
Bulk actions max 200 and same crop + problem for approve
"Select up to 200 items with the same crop and problem."
Publish is one transaction; on any failure nothing is written and the item stays APPROVED with an error
Toast with the error
is_training_eligible true only if licence in the training list and a reviewer (not auto-accept) confirmed the label
Checkbox disabled with tooltip
Spot-check for auto-accepted items: 10% of every AUTO_ACCEPTED batch (minimum 20) is placed in the Review Queue as "spot-check". Those images count as training-eligible only after a person confirms them. If more than 10% of a spot-check sample is rejected, auto-accept is switched off for that source and an admin is notified.
9.6 Cross-module
Rule
Where
A problem–crop pair is offered by AI only when it is PUBLISHED, has ≥ 1 active ch_control_measure for that crop (or crop-agnostic), and ≥ 20 training-eligible images
Diagnose endpoint
Chemical control measures must have phi_days (existing check) and, when input_id is set, the input must be active in vivas_inputs_catalog
Remedy listing; gap report flags violations
Farm case photos enter training only if the farm's consent in pih_data_sharing_consents allows it and the diagnosis was confirmed by an agronomist
Dataset builder
Takedown also excludes the image from all future snapshots and from galleries in one transaction
Takedown endpoint
Deleting a crop in Crop Library is blocked if CHI media reference it (show count)
Crop Library delete (existing endpoint gets this check)
10. Pages and screens
One new settings module with eight tabs, plus additive changes to three existing screens. All pages follow docs/UI_STYLE_GUIDE.md: green for agronomy actions, maroon badges for pest and disease severity, navy table headers.
10.1 New files
File
Contents
frontend/src/settings/modules/CropHealthImageSourcesSettings.jsx
Module shell with tab bar and shared state
frontend/src/settings/modules/chi/OverviewTab.jsx
KPI cards: images by type, crops covered, pending reviews, remedy gaps, storage; recent runs
frontend/src/settings/modules/chi/SourcesTab.jsx
Table + side drawer form; Test, Accept terms, Activate buttons
frontend/src/settings/modules/chi/MappingTab.jsx
Crop picker → list of that crop's problems with proposed external names and confidence; Confirm / Change / Reject; Create problem stub dialog; host→crop sub-tab
frontend/src/settings/modules/chi/ProfilesTab.jsx
Profile list and form (crops, categories, types, problems, states, dates, limits, schedule); Preview and Run import now buttons
frontend/src/settings/modules/chi/RunsTab.jsx
Run list; run detail with progress bar, counters, live log (polls every 3 s), Cancel and Retry
frontend/src/settings/modules/chi/ReviewTab.jsx
Image grid (thumbnails, 48 per page), filters, keyboard shortcuts (A approve, R reject, ←/→ next), side panel for labels, bulk bar
frontend/src/settings/modules/chi/PublishedTab.jsx
Published images by crop and problem; edit labels; set primary; takedown
frontend/src/settings/modules/chi/MlTab.jsx
Dataset snapshots (build, download manifest), model registry, promote and rollback, shadow report
frontend/src/settings/modules/chi/chiApi.js
One fetch wrapper that sends the bearer token and x-farm-id, using the same API base logic as CropHealth.jsx
frontend/src/components/ImageCredit.jsx
Shared credit line + licence badge (used by every gallery)
10.2 Changes to existing screens
Screen
Change
SettingsHub.jsx
Add the card from section 4.1; add its count to the overview fetch
CropLibrary.jsx (crop 360 view)
Add a 7th tab Pests & Diseases to active360Tab after "Financials". Shows the crop's problems from GET /api/chi/crops/:cropId/problems as cards grouped by Pest, Disease, Deficiency: primary image, name, scientific name, severity, image count, remedy count. Clicking a card opens the existing Crop Health problem detail filtered to this crop. Farm users see PUBLISHED problems only. The existing "Common Pests & Vulnerabilities" text field stays as is.
CropHealth.jsx (library problem detail)
Replace the single image area with a gallery: crop filter chips, plant-part filter, thumbnails, full-size viewer, ImageCredit under each image. Show a "No remedy yet for <crop>" warning when the gap rule applies (agronomists only).
CropHealth.jsx (case diagnose result)
Show per-candidate source chips (Image model / Symptoms) and 3 reference images of the suggested problem for the case's crop, so the user can compare visually. Add a "Was this right?" control that writes to the existing feedback table.
CropHealth.jsx (remedies list)
Show "Worked in <x>% of <n> cases" from effectiveness when cases_n ≥ 5.
10.3 States every page must handle
Loading skeletons, empty states with a next-step button ("No sources yet — Add source"), error banners with retry, permission-denied view, and disabled buttons with tooltips explaining why (for example "Run import now" disabled while a run is active). Images use loading="lazy" and thumbnails first.
11. AI/ML, remedies and continuous learning
CHI builds the data and the switches the model needs; the model runs as a separate Python service that the Node backend calls over HTTP. Remedies are never invented by the model: it picks the problem, and the remedy comes from agronomist-written control measures, ranked by real outcomes.
11.1 Stages
Stage
What ships
Done when
0. Data foundation (this SRS, phases 1–6)
Import, review, publish, galleries, dataset snapshots
≥ 20 training-eligible images per class for the top 10 crops
1. Vision model in shadow
Python service (FastAPI) with a fine-tuned image classifier, registered in chi_ml_model as SHADOW; diagnose calls it but users still see the symptom result
4 weeks of shadow data on confirmed cases
2. Blended diagnosis live
Model promoted to ACTIVE; diagnosis blends image and symptom scores
Field top-3 accuracy ≥ 85% and no class below 60% recall on the field test set
3. Continuous learning
Weekly snapshot + retrain + automatic shadow evaluation; human promotes
Each new version beats the active one on the same frozen field test set
4. Remedy ranking
Remedies ordered by outcome stats; later a learned ranker (task = REMEDY_RANK)
≥ 5 outcomes per remedy–crop pair
11.2 Inference contract (Node → model service)
ML_SERVICE_URL and ML_SERVICE_TOKEN in backend/.env; timeout 8 s; if the service is down, diagnosis falls back to symptoms only and logs ch_ai_request.status = 'TIMEOUT'.
Request: POST {ML_SERVICE_URL}/v1/classify with { model_version, crop_code, image_urls[], case_id }.
Response: { model_name, model_version, predictions: [{ class_key, problem_code, score }], is_out_of_distribution, latency_ms }.
Node maps problem_code to ch_problem.code, keeps only problems linked to the case's crop and passing the cross-module rule (9.6), and writes ranked rows to ch_case_diagnosis with source = 'AI', model_name, model_version, ai_request_id.
Blended score: 0.7 × image score + 0.3 × symptom score when the case has photos and symptoms (weights in chi_ml_model.metrics.blend). If is_out_of_distribution or the top score is below 0.5, the case moves to AGRONOMIST_REVIEW (existing status) instead of showing a confident answer.
In SHADOW mode the model's answer is stored in ch_ai_request.response only, never shown.
11.3 Training data rules
Class key: <crop_code>__<problem_code> plus <crop_code>__HEALTHY. A class enters a snapshot with ≥ 20 eligible images.
Eligible: ch_media.is_training_eligible = true, not deleted, licence in the source's training list, label confirmed by a person, and for farm case photos, consent plus agronomist-confirmed diagnosis (rows in v_ch_training_set).
Splits: 70/15/15 by group_key so near-duplicates and photos from the same observation or case stay in one split. A fixed field test set (farm case photos only) is frozen per quarter and never trained on.
Weighting: FIELD images from Vivas farms weight 3, other FIELD images 2, LAB images 1, to fight the lab-to-field gap.
The manifest (CSV: media_id, url, class_key, split, setting, licence, source) is served at /api/chi/ml/training-feed with a service token; images are fetched from /uploads/….
11.4 Learning loop
Every confirmed or corrected diagnosis adds a labelled case photo (existing ch_ai_feedback, ch_case_diagnosis.is_confirmed).
Low-confidence and out-of-distribution cases are queued for agronomists first (active learning), so their labels add the most value.
Weekly: build a snapshot → the training service trains a new version → registers it as CANDIDATE with metrics → Node runs it in SHADOW on new cases for 7 days → the shadow report compares it with the active model → an admin promotes or rejects.
Promotion gates: field top-3 accuracy not lower than active, macro-F1 up by ≥ 1 point or equal with more classes, no class recall drop > 5 points. Rollback is one click and restores the previous ACTIVE row.
Drift watch: weekly share of out-of-distribution results and agronomist overrides; if overrides exceed 25% for a crop, an alert goes to admins.
11.5 Remedy integration
Remedy list for a confirmed problem = existing GET /api/ch/cases/:id/remedies, ordered by chi_remedy_effectiveness.success_rate_lower (Wilson lower bound, so a 2-of-2 success does not beat 45-of-50) for the crop and state, then season, then seq.
chi_remedy_effectiveness is rebuilt nightly from ch_case_treatment (APPLIED), ch_case.outcome (RESOLVED counts as success; PARTIAL as half; FAILED as failure; SELF_RESOLVED excluded), ch_case_followup trend and pih_treatment_outcomes (severity before/after).
Product suggestions keep using generateFarmRecommendations() in the Partner Hub; CHI passes the confirmed problem_id and crop_id.
Safety: chemical remedies always show PHI and the safe-harvest date (already generated in ch_case_treatment); the system never auto-applies a remedy; banned or inactive inputs are filtered out.
Gap loop: the remedy-gap report (/api/chi/remedy-gaps) is the agronomists' to-do list; a problem–crop pair without remedies is not offered by AI (rule 9.6).
12. Non-functional requirements
Area
Requirement
Performance
"Run import now" responds in < 500 ms (202). Review grid first page < 1.5 s with 48 thumbnails. Crop "Pests & Diseases" tab < 1 s for 100 problems. Worker throughput ≥ 30 images/min per source, within the source's rate limit.
Load on the app
Worker processes one page (≤ 50 items) per tick and at most 2 runs at once across sources, so the single Express process stays responsive. Image work (sharp) runs with concurrency 2.
Reliability
Runs resume from cursor after a crash; heartbeat timeout 10 min; idempotent item insert on (source_id, external_media_id); publish is transactional.
Storage
Images requested at the source's download size (default LARGE, ~1,024 px), stored as received, plus 320 px WebP thumbnails; ~250 KB per image on average, so 25,000 images use about 6 GB. Storage helper (services/chi/storage.js) with put, get, remove, move so S3-compatible storage can replace local disk later. Overview shows bytes used.
Security
Token required on all /api/chi routes regardless of AUTH_ENFORCE. Secrets only in .env, referenced by key name. SSRF guard on every download (HTTPS, host allowlist, DNS resolve and block private, loopback and link-local IPs, ≤ 3 redirects). File signature check. EXIF stripped. Service token for /ml/training-feed. Input lengths capped. Parameterised SQL only.
Privacy
Lat/lng rounded to 2 decimals in staging and never stored on ch_media; farm case photos follow consent; no personal names from sources other than the public credit line.
Audit
Every create, update, delete, approve, reject, takedown, licence approval and model promotion writes chi_import_log (for run work) or an outbox event with user_id, before/after values and time. Keep logs ≥ 2 years.
Observability
Run counters and errors on the Runs tab; scheduler status already in system_scheduled_jobs (last_status, last_error, last_duration_ms); a CHI line in /api/health.
Compliance
Credit and licence shown wherever an image appears; takedown within 24 h of a request; licence policy reviewed by counsel before go-live.
Accessibility
Images have alt text "<problem> on <crop> — <plant part>"; keyboard use in the review grid; colour is never the only signal.
Localisation
Labels through the existing i18n pattern if present; problem local names from ch_problem.local_names.
Backup
New tables included in the existing backup routine; uploads/crop_health/imported/ added to the deploy.sh rsync exclude list (today it excludes only node_modules, .git, dist and .env), so images imported on a laptop are never pushed into production and production imports are managed only on the server.
13. Antigravity prompts
Use one master prompt once, then one phase prompt per conversation, in order. Each phase ends with a plan you approve, code, a verify run and a short report, so mistakes stay small. The prompts assume this SRS is saved in the repo as docs/CHI_SRS.md (step 2 of section 14).
13.1 Master prompt (paste first)
You are working on the Vivas AI codebase in this workspace.Stack: Node.js + Express 4 (ES modules) with raw SQL via pg (backend/config/db.js), PostgreSQL 14+,React 19 + Vite frontend (frontend/src), hash routing, lucide-react icons, design rules in docs/UI_STYLE_GUIDE.md.Background jobs use system_scheduled_jobs + registerJob() (backend/services/scheduler.js).Cross-module events use domain_events_outbox + emitDomainEvent() (backend/services/eventBus.js).Auth helpers are in backend/middleware/security.js. Responses use backend/utils/response.js.We are building the "Crop Health Image Sources" module (code CHI) exactly as specified in docs/CHI_SRS.md.Read docs/CHI_SRS.md fully before doing anything.Non-negotiable rules:1. Reuse existing tables, routes and screens listed in section 5 of the SRS. Never create a new crop, problem,   remedy, case, media, lookup, role, notification, job or outbox table. Never rename or drop an existing   column, constraint, route or response field. Only additive changes.2. All schema changes go in database/migrations/004_crop_health_image_sources.sql (idempotent, IF NOT EXISTS)   with a matching _rollback.sql. Record the migration in schema_migrations.3. New backend code: backend/routes/cropHealthIntegration.js mounted at /api/chi, and backend/services/chi/*.   New frontend code: frontend/src/settings/modules/CropHealthImageSourcesSettings.jsx and   frontend/src/settings/modules/chi/*. Edits to SettingsHub.jsx, CropLibrary.jsx, CropHealth.jsx,   routes/cropHealth.js and server.js must be small and additive.4. Every /api/chi route requires an authenticated user and the permission from SRS section 4.3,   even when AUTH_ENFORCE is false. Never call getContext() from routes/cropHealth.js in CHI code.5. Implement every validation in SRS section 9 on the server, and mirror it in the forms.6. Use parameterised SQL only. Multi-table writes run in one transaction.7. Secrets stay in backend/.env and are referenced by variable name. Never print or return them.8. Downloads must pass the SSRF guard, licence policy and file checks in SRS sections 7.3 and 9.4.9. Work only on the phase I give you. Start each phase in Planning mode: produce an implementation plan   listing files to create or edit, SQL, endpoints, and tests. Wait for my approval before writing code.10. Finish each phase by running its verification, then report: files changed, what was tested, what is left,    and any place where the code differs from the SRS (with the reason).If something in the SRS conflicts with the code you find, stop and ask me; do not guess.
13.2 Phase prompts
Phase 0 — Discovery (read only)
Phase 0 of docs/CHI_SRS.md. Do not change any code.Inspect the database schema files, backend routes, services and the three screens named in SRS section 5.If a local database is reachable, query information_schema to confirm the tables and columns in SRS 5.1 exist.Write docs/CHI_DISCOVERY.md with: (a) every existing table/column/route/component CHI will reuse, with fileand line; (b) anything in the SRS that already exists under another name and how you will reuse it;(c) conflicts or risks; (d) the exact list of files you will create and edit across all phases.Stop and wait for my review.
Phase 1 — Database
Phase 1 of docs/CHI_SRS.md. Create database/migrations/004_crop_health_image_sources.sql and004_crop_health_image_sources_rollback.sql from SRS section 6 (tables, ch_media columns, indexes, triggersusing the existing ch_touch_updated_at(), lookups, scheduled job rows, seed sources inactive, chi_crop_mapseeded from vivas_crops.scientific_name). Make it safe to run twice.Add scripts/phase7-chi-verify.mjs (same style as scripts/phase6-verify.mjs) that checks every table,column, index, enum and job row exists, and that running the migration twice causes no error.Run it and show me the output.
Phase 2 — Backend foundation and CRUD
Phase 2 of docs/CHI_SRS.md. Create backend/routes/cropHealthIntegration.js and mount it at /api/chi inserver.js. Add backend/services/chi/permissions.js (requirePerm using vivas_settings_roles.permissions andisAdminRole), backend/services/chi/storage.js (put/get/remove/move on backend/uploads/crop_health/imported),backend/services/chi/safeFetch.js (SSRF guard, redirects, timeout, size limit, signature check).Implement CRUD and actions for sources, taxon maps, crop maps and profiles (SRS 8.2) with every validation inSRS 9.1–9.3. Add GET /api/chi/overview. Install sharp in backend; if install fails, tell me and continuewithout thumbnails behind a feature flag. Extend the verify script with API tests for each endpoint,including permission-denied and validation-error cases.
Phase 3 — Connectors, worker and "Run import now"
Phase 3 of docs/CHI_SRS.md. Create backend/services/chi/connectors/{inaturalist,gbif,datasetArchive,wikimedia,eppoMeta,customRest}.js implementing the contract in SRS 3.1, plus a licence normaliser (SRS 3.2).Create backend/services/chi/importWorker.js and register jobs chi_import_worker, chi_schedule_dispatcher andchi_housekeeping with registerJob() (SRS 7.3, 7.6). Use SELECT ... FOR UPDATE SKIP LOCKED, heartbeat, cursorresume, cancel, back-off, per-run and per-problem limits, dedupe by SHA-256 and perceptual hash, thumbnails,EXIF strip. Implement preview, run, runs list/detail/logs, cancel and retry endpoints.Test with the iNaturalist connector on one crop and one problem, max 10 images, and show me the run log.
Phase 4 — Review, publish, takedown and Crop Health API extensions
Phase 4 of docs/CHI_SRS.md. Implement items list/detail/update/approve/reject/bulk, media list/update/takedown,crops/:cropId/problems and remedy-gaps (SRS 7.4, 7.5, 8.2, 9.5). Publishing writes ch_media andch_problem_crop in one transaction and emits chi.media.published.Additively extend GET /api/ch/problems and GET /api/ch/problems/:id in routes/cropHealth.js (SRS 8.3);existing fields and behaviour must not change. Add the crop-delete guard (SRS 9.6). Extend the verify script.
Phase 5 — Settings module UI
Phase 5 of docs/CHI_SRS.md. Add the Settings card (SRS 4.1) and build CropHealthImageSourcesSettings.jsx withthe eight tabs and files in SRS 10.1, following docs/UI_STYLE_GUIDE.md and the look of the existingsettings modules (e.g. AppsIntegrationsSettings.jsx). Use chiApi.js for all calls with the bearer token.Handle loading, empty, error and permission states (SRS 10.3). Run the frontend build and lint, then give mea click-through checklist to test in the browser.
Phase 6 — Crop Library and Crop Health screens
Phase 6 of docs/CHI_SRS.md. Make the additive screen changes in SRS 10.2: the "Pests & Diseases" tab in theCrop Library crop 360 view, the gallery with ImageCredit in the Crop Health problem detail, reference imagesand feedback control in the diagnose result, and effectiveness text in the remedies list. Do not restructurethese large files; add small components in new files and import them. Run build and lint.
Phase 7 — Remedy effectiveness
Phase 7 of docs/CHI_SRS.md. Implement the chi_remedy_effectiveness nightly job (SRS 11.5) with the Wilsonlower bound, and additively extend GET /api/ch/cases/:id/remedies to include effectiveness and sort by it whencases_n >= 5. Seed test cases in a transaction that is rolled back in the verify script, and prove the order.
Phase 8 — ML data layer and blended diagnosis
Phase 8 of docs/CHI_SRS.md. Implement dataset snapshots, manifest, model registry, promote/rollback,shadow report and the service-token training feed (SRS 8.2, 11.3, 11.4). Additively extendPOST /api/ch/cases/:id/diagnose to call ML_SERVICE_URL when an ACTIVE or SHADOW model exists (SRS 11.2),with timeout fallback to the current symptom logic. In SHADOW mode store the model output only.Create a separate folder ml-service/ with a FastAPI stub exposing POST /v1/classify that returns the contractshape (random scores are fine for now) plus a README for training later. The Node app must work unchanged whenML_SERVICE_URL is not set.
Phase 9 — Hardening and hand-over
Phase 9 of docs/CHI_SRS.md. Run the full verify script and fix failures. Check every acceptance item inSRS section 15 and mark pass/fail with evidence. Update deploy.sh rsync excludes (SRS 12). Writedocs/CHI_RUNBOOK.md: how to add a source, map names, run imports, review, take down, build a dataset,promote and roll back a model, and what to do when a run fails.
14. Step-by-step: building it in Antigravity
Build in ten small phases, one Antigravity conversation each, with a save point after every phase. Plan about 2–4 working sessions for phases 0–4, and the same again for 5–9.
14.1 One-time preparation
Make a save point. Your project folder has no git repository (no .git folder). In Antigravity's terminal, from the project root, run git init, then git add -A and git commit -m "Before CHI module". Check .gitignore lists backend/.env, node_modules and uploads before committing. From now on, commit after every phase so you can undo a bad phase with git restore ..
Back up the database. You already have backups/vivas_ai_phase0_20261116.dump. Make a fresh one: pg_dump -Fc -d <your_db_name> -f backups/vivas_ai_before_chi.dump.
Put the SRS in the repo. Export this doc as Markdown and save it as docs/CHI_SRS.md (or ask me to write it there for you). Antigravity reads files in the workspace far more reliably than pasted text.
Open the project in Antigravity. File → Open Folder → /Volumes/Files/Antigravity demo/VivasAI.
Set safe agent settings. In the agent settings, choose the setting that asks you before running terminal commands (rather than running them automatically), at least for phases 1, 3 and 8, which touch the database and install packages. Pick the strongest model available for planning.
Add environment keys to backend/.env (never to the SRS or chat): CHI_SYSTEM_USER_ID (an admin user's id for scheduled runs), CHI_USER_AGENT (for example VivasAI-CHI/1.0 (contact@yourdomain)), and later ML_SERVICE_URL, ML_SERVICE_TOKEN, EPPO_TOKEN when you need them.
14.2 Each phase, the same 8 baby steps
Start a new conversation in the Agent Manager and switch it to Planning mode.
Paste the master prompt (13.1), then the phase prompt (13.2) in the same message.
Wait for the implementation plan artifact. Read it against the SRS: right files, no new tables beyond section 6, no edits to unrelated screens.
Comment on anything wrong directly on the plan (for example "don't edit App.jsx; use SettingsHub only") and ask it to revise. Approve only when it matches.
Let it write the code. When it asks to run a command, read the command first; say yes to builds, tests and the migration on your local database only.
Ask it to run the verify script: node scripts/phase7-chi-verify.mjs. All checks must pass.
Test by hand with the checklist it gives you (start backend with npm run dev in backend, frontend with npm run dev in frontend).
Commit: git add -A && git commit -m "CHI phase <n>: <summary>". If the phase went badly, git restore . and start that phase again in a new conversation.
14.3 Phase order and what to check by hand
Phase
You should see
Hand check
0 Discovery
docs/CHI_DISCOVERY.md
Lists reused tables and screens; no surprises
1 Database
Migration + rollback + verify script
Run the migration twice; no errors; app still starts
2 Backend CRUD
/api/chi routes
Create a source without terms → activation refused
3 Import worker
Run log with 10 images
Click-free test via API: run, cancel, retry
4 Review & publish
Approve publishes into Crop Health
Problem detail API now returns images with credit
5 Settings UI
New card under Settings
Full flow: source → mapping → profile → Preview → Run import now → review → approve
6 Crop screens
"Pests & Diseases" tab
Open Tomato in Crop Library → see problems with images
7 Remedy ranking
Effectiveness on remedies
Remedies show "Worked in x% of n cases"
8 ML layer
Dataset snapshot, model registry, FastAPI stub
App works with ML_SERVICE_URL unset; shadow mode stores results only
9 Hardening
Runbook + acceptance report
Section 15 all pass
14.4 Going live on the server
Deploy with your existing ./deploy.sh only after the rsync exclude for imported images is added (phase 9).
On the server, back up the database, then run the migration: psql -d <db> -f database/migrations/004_crop_health_image_sources.sql.
Add the new .env keys on the server and restart: pm2 restart vivasai-backend.
In the app: Settings → Crop Health Image Sources → accept terms for iNaturalist → Test → Activate → map names for 2–3 crops → Preview → Run import now with a small limit (50) → review.
Turn on scheduled imports only after a week of clean manual runs.
14.5 Tips that save time
Keep each conversation to one phase; long conversations drift from the SRS.
When the agent says something "already exists", ask it to show the file and line before accepting.
If it proposes editing App.jsx (5,131 lines), ask for a small new component instead.
Ask it to reuse the look of an existing settings module so the UI stays consistent.
Never paste API keys into the chat; tell it the variable name only.
15. Acceptance criteria
The module is done when every item below passes on a copy of production data. Phase 9 ticks these with evidence.
15.1 Functional
☐ Settings shows a "Crop Health Image Sources" card with live counts; it opens at #settings/crop-health-image-sources.
☐ A source cannot be activated without accepted terms and a passing test.
☐ Mapping proposes EXACT matches for problems whose scientific name matches the source, and a confirmed map is required before import.
☐ "Preview" returns counts and a licence mix without storing any file.
☐ "Run import now" returns within 500 ms and the run completes in the background with correct counters.
☐ A second run on the same source while one is active is refused with 409.
☐ Killing the backend mid-run and restarting resumes the run from its cursor without duplicates.
☐ Images with a blocked licence are never downloaded; ALL_RIGHTS_RESERVED never appears in staging as downloaded.
☐ Re-running the same profile creates 0 new items for already-imported media.
☐ Approving an item creates exactly one ch_media row on the right problem and crop, and adds the ch_problem_crop link if missing.
☐ The image appears in the Crop Library "Pests & Diseases" tab and in the Crop Health problem gallery with credit and licence.
☐ Takedown hides the image everywhere within one request and excludes it from the next snapshot.
☐ The remedy-gap report lists every published problem–crop pair with images but no active remedy.
☐ Remedies for a case show effectiveness and are ordered by it when ≥ 5 outcomes exist.
☐ With ML_SERVICE_URL unset, diagnosis works exactly as before.
☐ With a SHADOW model, users see the old result and the model output is stored in ch_ai_request.
☐ Promote and rollback switch the ACTIVE model in one click; only one ACTIVE model per name.
☐ A TRAINING_ONLY source never downloads NC or ND images, and its images do not appear in farmer galleries.
☐ With download_size = LARGE, average stored image size is under 400 KB.
☐ A run that hits a source's hourly or daily cap pauses and resumes automatically without exceeding the cap.
15.2 Integration and regression
☐ All existing Crop Health, Crop Library and Partner Hub screens and APIs return the same fields as before (snapshot test on 10 key endpoints).
☐ Excel bulk import via ch_import_batch still works.
☐ Existing scheduled jobs keep running; new CHI jobs appear in system_scheduled_jobs.
☐ The migration runs twice without error, and the rollback removes only CHI objects.
☐ Frontend build and lint pass; no new console errors on the Settings, Crop Library and Crop Health screens.
15.3 Security and compliance
☐ Every /api/chi route returns 401 without a token and 403 without the permission, with AUTH_ENFORCE=false.
☐ A source URL pointing to localhost, a private IP or a non-allowlisted host is blocked.
☐ A renamed non-image file (for example a PDF with .jpg) is rejected.
☐ No secret value appears in any API response or log.
☐ Downloaded images carry no EXIF GPS.
Sources
iNaturalist photo licence fields: pyinaturalist Photo model; observation vs photo licence: iNaturalist forum; share of NC licences: Inat_Images
GBIF image access and licence caution: GBIF community forum
EPPO photo use terms: EPPO Global Database
PlantVillage licence and size: Meta-Album, PlantVillage dataset repository; controlled-conditions caveat: Mohanty, Hughes & Salathé (2016)
Vivas AI codebase as of 18 Nov 2026: backend/, database/, frontend/src/, docs/UI_STYLE_GUIDE.md