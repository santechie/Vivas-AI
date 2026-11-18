# Vivas AI - Crop Health Vision Classification Service (ML Service)

This service provides computer vision inference for the Vivas AI Crop Health module, implementing the contract defined in `docs/CHI_SRS.md` Section 11.2.

---

## 1. Architecture & Inference Contract

### Endpoint: `POST /v1/classify`
- **Request Headers**: `Authorization: Bearer <ML_SERVICE_TOKEN>`
- **Request Payload**:
  ```json
  {
    "model_version": "v1.4",
    "crop_code": "TOMATO",
    "image_urls": [
      "http://localhost:5001/uploads/crop_health/imported/f4/f412...jpg"
    ],
    "case_id": "8b192c16-7301-4542-a911-e38228f554f7"
  }
  ```
- **Response**:
  ```json
  {
    "model_name": "vivas-crop-health-vision",
    "model_version": "v1.4",
    "predictions": [
      { "class_key": "TOMATO__EARLY_BLIGHT", "problem_code": "EARLY_BLIGHT", "score": 0.842 },
      { "class_key": "TOMATO__LATE_BLIGHT", "problem_code": "LATE_BLIGHT", "score": 0.115 },
      { "class_key": "TOMATO__HEALTHY", "problem_code": "HEALTHY", "score": 0.043 }
    ],
    "is_out_of_distribution": false,
    "latency_ms": 32
  }
  ```

---

## 2. Running Locally

```bash
cd ml-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 3. Node Backend Integration

Set the following in `backend/.env`:
```env
ML_SERVICE_URL=http://localhost:8000
ML_SERVICE_TOKEN=vivas_ml_service_token_dev
```

If `ML_SERVICE_URL` is omitted or unreachable:
1. Diagnosis automatically falls back to symptoms-only scoring.
2. A timeout/fallback event is recorded in `ch_ai_request` without user disruption.

---

## 4. Continuous Retraining Pipeline (SRS 11.3 & 11.4)

1. **Dataset Manifest**:
   - Fetch snapshots via `GET /api/chi/ml/datasets/:id/manifest` or streaming `GET /api/chi/ml/training-feed?since=...`.
   - Classes require $\ge 20$ eligible images (`is_training_eligible = true`, verified labels, consent).
2. **Model Training**:
   - EfficientNet / ConvNeXt backbone with class outputs structured as `<crop_code>__<problem_code>`.
   - 70/15/15 stratified split preserving group keys.
3. **Registration & Promotion**:
   - Register candidate via `POST /api/chi/ml/models`.
   - Promote to `SHADOW` to compare against real-world agronomist diagnoses.
   - Promote to `ACTIVE` once validation Macro-F1 and Top-3 accuracy criteria are satisfied.
