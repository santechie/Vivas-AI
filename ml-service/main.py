import time
import random
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(
    title="Vivas AI - Crop Health Vision Classification Service",
    description="FastAPI service conforming to SRS Section 11.2 inference contract.",
    version="1.0.0"
)

class ClassifyRequest(BaseModel):
    model_version: Optional[str] = Field(None, description="Requested model version or latest active")
    crop_code: str = Field(..., description="Crop code/identifier, e.g. TOMATO, COTTON")
    image_urls: List[str] = Field(default_factory=list, description="List of image URLs to evaluate")
    case_id: Optional[str] = Field(None, description="Diagnostic case ID")

class PredictionItem(BaseModel):
    class_key: str
    problem_code: str
    score: float

class ClassifyResponse(BaseModel):
    model_name: str
    model_version: str
    predictions: List[PredictionItem]
    is_out_of_distribution: bool
    latency_ms: int

# Mock knowledgebase of common problem codes per crop
KNOWN_PROBLEMS = {
    "TOMATO": ["EARLY_BLIGHT", "LATE_BLIGHT", "LEAF_CURL_VIRUS", "HEALTHY"],
    "COTTON": ["BOLLWORM", "LEAF_SPOT", "WHITEFLY", "HEALTHY"],
    "WHEAT": ["RUST", "POWDERY_MILDEW", "HEALTHY"],
    "POTATO": ["LATE_BLIGHT", "EARLY_BLIGHT", "HEALTHY"],
}

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "vivas-ml-classifier", "timestamp": time.time()}

@app.post("/v1/classify", response_model=ClassifyResponse)
def classify_images(payload: ClassifyRequest):
    """
    Inference endpoint conforming to SRS 11.2:
    Takes crop_code, image_urls, and model_version; returns ranked predictions.
    """
    start_time = time.time()

    crop = payload.crop_code.upper()
    problems = KNOWN_PROBLEMS.get(crop, ["GENERAL_PEST", "DEFICIENCY", "HEALTHY"])

    # Generate mock probabilities normalized to sum to 1.0
    raw_scores = [random.uniform(0.1, 1.0) for _ in problems]
    total = sum(raw_scores)
    scores = [round(s / total, 4) for s in raw_scores]

    # Combine into predictions and sort descending
    predictions = [
        PredictionItem(
            class_key=f"{crop}__{prob}",
            problem_code=prob,
            score=score
        )
        for prob, score in zip(problems, scores)
    ]
    predictions.sort(key=lambda p: p.score, reverse=True)

    # Simulated out-of-distribution detection (<10% chance or if no images provided)
    is_ood = len(payload.image_urls) == 0 or random.random() < 0.05
    latency_ms = int((time.time() - start_time) * 1000) + random.randint(15, 45)

    return ClassifyResponse(
        model_name="vivas-crop-health-vision",
        model_version=payload.model_version or "v1.4",
        predictions=predictions,
        is_out_of_distribution=is_ood,
        latency_ms=latency_ms
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
