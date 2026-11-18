# Vivas AI – Crop Health Image Integration Module (CHI): Operator Runbook

**Module Code**: CHI  
**Author**: Antigravity Assistant & Engineering Team  
**System**: Vivas AI Agronomy Platform  
**Location**: `#settings/crop-health-image-sources` | `/api/chi/*`

---

## Table of Contents
1. [Overview & Architecture](#1-overview--architecture)
2. [Adding and Activating a New Image Source](#2-adding-and-activating-a-new-image-source)
3. [Taxon & Host Crop Mapping](#3-taxon--host-crop-mapping)
4. [Configuring Profiles & Running Imports](#4-configuring-profiles--running-imports)
5. [Reviewing and Publishing Staged Images](#5-reviewing-and-publishing-staged-images)
6. [Takedown & Quarantine Procedures](#6-takedown--quarantine-procedures)
7. [ML Data Layer: Snapshots, Training Feeds & Model Registry](#7-ml-data-layer-snapshots-training-feeds--model-registry)
8. [Remedy Effectiveness & Gap Analysis](#8-remedy-effectiveness--gap-analysis)
9. [Troubleshooting & Run Failure Recovery](#9-troubleshooting--run-failure-recovery)

---

## 1. Overview & Architecture

The Crop Health Image Sources (CHI) module integrates verified, licensed pest, disease, and deficiency photography from external repositories (iNaturalist, GBIF, Wikimedia Commons, PlantVillage dataset, EPPO) into the Vivas AI agronomic catalog.

### Key Workflows:
```
[External Sources] 
        ↓ (SSRF Guard, Rate Limiter, License Normalizer)
[CHI Staging Items] 
        ↓ (Agronomist Human Review Queue)
[ch_media + ch_problem_crop]
        ├──> Crop Library 360 View ("Pests & Diseases" Tab)
        ├──> Crop Health Diagnostic Problem Detail (Galleries + ImageCredit)
        ├──> ML Training Set Snapshots (v_ch_training_set + Manifests)
        └──> Blended AI Diagnosis (/api/ch/cases/:id/diagnose)
```

---

## 2. Adding and Activating a New Image Source

1. Navigate to **Settings $\rightarrow$ Crop Health Image Sources $\rightarrow$ Sources Tab**.
2. Click **Add Source** and fill in required fields:
   - **Source Code**: Capitalized alphanumeric with underscores (e.g., `INATURALIST`, `GBIF`).
   - **Connector Type**: Select from registered connectors (`INATURALIST`, `GBIF`, `WIKIMEDIA`, `DATASET_ARCHIVE`, `EPPO_META`, `CUSTOM_REST`).
   - **Base URL**: Must be an `https://` protocol.
   - **Allowed Hosts**: FQDN allowlist (e.g., `api.inaturalist.org, static.inaturalist.org`).
   - **Terms URL**: Official license and API usage documentation.
   - **Allowed Licenses**: Choose licenses accepted for display (`CC0`, `CC-BY`, `CC-BY-SA`) and training.
3. **Acceptance of Terms**:
   - Click **Accept Terms**. A source cannot be activated without terms accepted by an authorized agronomist.
4. **Connection Test**:
   - Click **Test Connection**. The system verifies network connectivity and SSRF safeguards.
5. **Activation**:
   - Once terms are accepted and test passes, click **Activate Source**.

---

## 3. Taxon & Host Crop Mapping

Before external observations can be assigned to farm problems, their scientific taxa must be mapped.

1. Navigate to the **Mappings Tab**.
2. **Crop Selector**: Choose a crop (e.g. *Tomato*, *Cotton*).
3. **Pest & Disease Mapping**:
   - The system displays all problems registered for that crop.
   - For unmapped problems, search external names from the source connector or accept high-confidence recommendations.
   - Click **Confirm Mapping**.
   - If a problem does not yet exist in Vivas AI, click **Create Problem Stub** to register a new `DRAFT` library problem.
4. **Host-to-Crop Mapping**:
   - Switch to the **Host Crops** subtab.
   - Map external scientific host plant names (e.g., *Solanum lycopersicum*) to the corresponding Vivas AI crop record.

---

## 4. Configuring Profiles & Running Imports

1. Navigate to the **Import Profiles Tab** and click **New Profile**:
   - Select the target **Source**.
   - Select crops and specific problem types (*Pest*, *Disease*, *Deficiency*).
   - Set limits: `Max images per problem` (e.g. 50), `Max images per run` (e.g. 200).
   - Configure scheduling (interval or manual trigger).
2. **Preview Mode**:
   - Click **Preview** to verify expected external matches and license breakdown without downloading any files.
3. **Run Import Now**:
   - Click **Run Import Now**. The API responds immediately ($<500\text{ ms}$) with HTTP 202 Accepted.
   - The job is queued in `chi_import_run` and picked up by `chi_import_worker`.
   - Monitor live progress, per-minute download throughput, and detailed event logs in the **Import Runs Tab**.

---

## 5. Reviewing and Publishing Staged Images

All imported media enters a human review queue before appearing on farm screens.

1. Navigate to the **Review Queue Tab**.
2. Inspect image thumbnails and metadata (attribution line, license code, observed date, location).
3. Use keyboard shortcuts or action buttons:
   - **Approve (`A`)**: Publishes image into `ch_media`, links `ch_problem_crop`, and flags training eligibility.
   - **Reject (`R`)**: Prompts for rejection reason (*Blurry*, *Wrong Problem*, *Watermark*, *Poor Quality*) and archives the item.
   - **Navigation (`←` / `→`)**: Move through pending candidates.
4. **Bulk Actions**:
   - Select multiple cards and choose **Bulk Approve** or **Bulk Reject** (up to 200 items per action).

---

## 6. Takedown & Quarantine Procedures

If a copyright notice, licensing revocation, or incorrect identification is received:

1. Navigate to **Published Images Tab**.
2. Locate the media item and click **Takedown**.
3. Select the reason (*Copyright Notice*, *Licence Changed*, *Misidentified*, *Other*) and enter incident notes.
4. System Action:
   - Soft-deletes `ch_media` (`deleted_at = NOW()`).
   - Moves storage file from `imported/` to `imported/quarantine/`.
   - Updates `chi_import_item` to `TAKEN_DOWN`.
   - Emits `chi.media.taken_down` outbox event.
   - The image is immediately removed from all Crop Library, Crop Health, and ML datasets.

---

## 7. ML Data Layer: Snapshots, Training Feeds & Model Registry

### 7.1 Dataset Snapshots & Manifests
1. Navigate to **AI & Datasets Tab $\rightarrow$ Dataset Snapshots**.
2. Click **Build New Snapshot**:
   - System filters all `is_training_eligible = true` images.
   - Formulates class keys: `<CROP>__<PROBLEM>` and `<CROP>__HEALTHY`.
   - Applies deterministic 70% Train / 15% Validation / 15% Test partitioning preserving group keys.
3. Click **Download CSV** to inspect the manifest file (`media_id,url,class_key,split,setting,licence,source`).

### 7.2 Training Feed API
- External ML training workers access the live stream via:
  ```bash
  GET /api/chi/ml/training-feed?since=2026-11-01T00:00:00Z
  Authorization: Bearer <ML_SERVICE_TOKEN>
  ```

### 7.3 Model Promotion & Rollback
1. Registered models start in `CANDIDATE` state.
2. Click **Promote to SHADOW**:
   - The model receives real-world diagnostic requests alongside symptom diagnosis.
   - Model predictions are logged to `ch_ai_request` for agreement verification. Users still receive baseline symptom diagnoses.
3. Inspect the **Shadow Report**:
   - Verify agreement percentage ($\ge 85\%$) and macro-F1 metrics against agronomist confirmations.
4. Click **Promote to ACTIVE**:
   - Model becomes the primary vision classifier.
   - Node blends image and symptom scores ($0.7 \times \text{vision} + 0.3 \times \text{symptoms}$).
   - Previous active model is automatically retired.
5. **One-Click Rollback**:
   - Click **Rollback to This** on any retired model to reinstate it immediately if field drift occurs.

---

## 8. Remedy Effectiveness & Gap Analysis

1. **Remedy Gaps Report**:
   - Navigate to **Overview $\rightarrow$ Remedy Coverage Gaps**.
   - Displays published problems with photos but zero registered control measures in `ch_control_measure`.
2. **Nightly Effectiveness Calculations**:
   - The scheduled job `chi_remedy_effectiveness` recalculates Wilson lower bounds at 95% confidence from real farm treatment outcomes:
     $$w = \frac{\hat{p} + \frac{z^2}{2n} - z \sqrt{\frac{\hat{p}(1-\hat{p}) + \frac{z^2}{4n}}{n}}}{1 + \frac{z^2}{n}}$$
   - When a treatment has $\ge 5$ cases, it is ordered ahead of unproven treatments and displays effectiveness text (e.g. *"Worked in 89% of 45 cases"*).

---

## 9. Troubleshooting & Run Failure Recovery

| Symptom | Root Cause | Resolution |
|---------|------------|------------|
| **Run stuck in RUNNING state** | Worker crash or container restart | The heartbeat detector in `chi_schedule_dispatcher` marks runs timed out after 10 min. Click **Retry** on the run; worker resumes from last cursor without duplicates. |
| **HTTP 409 Conflict when starting Run** | A run is already active for this source | CHI enforces single concurrent run per source. Wait for active run to finish or click **Cancel** on the active run. |
| **Images rejected: SS_BLOCKED_HOST** | Image host not in source allowlist | Edit source in **Sources Tab** and add the external CDN domain to `Allowed Hosts`. |
| **Diagnosis falls back to symptoms only** | `ML_SERVICE_URL` not responding | Node enforces an 8s timeout. Check `ml-service` logs (`uvicorn main:app`). Diagnosis continues smoothly without error banners. |
| **Crop cannot be deleted in Crop Library** | Published CHI media references the crop | SRS Rule 9.6 blocks deleting crops with linked health media. Takedown or reassign images before deleting crop. |

---
*End of Runbook.*
