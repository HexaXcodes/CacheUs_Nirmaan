# ml-service/main.py
# ============================================================================
#  Internal-only inference service for the Phase 1 (inhaler) frame classifier.
#  NOT exposed to the browser — the Node backend
#  (backend/services/inhalerMlClient.js -> controllers/mlController.js ->
#  POST /api/ml/inhaler/predict) is the only caller, so auth, rate-limiting,
#  and session-ownership checks all still apply before a request ever
#  reaches here. Bind to 127.0.0.1 only (see run instructions in README.md).
#
#  One endpoint: POST /predict — takes exactly 20 base64-encoded JPEG/PNG
#  frames (oldest first) and returns the raw model output (step label, class
#  index, confidence, full probability distribution). It does NOT decide
#  correct/incorrect and does NOT do temporal smoothing — both of those
#  happen in the Node backend (inhalerTemporalSmoothing.js /
#  mlController.js) so the ML contract stays identical across every
#  workflow, real or model-backed.
# ============================================================================
from __future__ import annotations

import base64
import logging
import pickle
from pathlib import Path

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from frame_features import CLASSES, EXPECTED_FRAMES, frames_to_model_input

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s :: %(message)s")
logger = logging.getLogger("novacare.inhaler_ml")

MODEL_PATH = Path(__file__).parent / "model" / "frame_baseline.pkl"

app = FastAPI(
    title="NovaCare Inhaler Frame Classifier (internal)",
    description=(
        "Experimental single-demonstration frame classifier for pMDI-without-spacer "
        "technique steps. See docs/PHASE_1_ML_INTEGRATION.md in the main repo for the "
        "full accuracy/limitation disclosure — this is NOT a clinically validated model."
    ),
    version="1.0.0",
)

_model = None


@app.on_event("startup")
def load_model():
    global _model
    with MODEL_PATH.open("rb") as f:
        _model = pickle.load(f)
    logger.info("Loaded frame_baseline.pkl (%s)", type(_model).__name__)


@app.get("/health")
def health():
    return {"status": "healthy" if _model is not None else "model_not_loaded", "classes": CLASSES}


class PredictRequest(BaseModel):
    frames: list[str] = Field(..., description=f"Exactly {EXPECTED_FRAMES} base64-encoded frames, oldest first")


class PredictResponse(BaseModel):
    stepLabel: str
    classIndex: int
    confidence: float
    probabilities: dict[str, float]


def decode_frame(b64: str) -> np.ndarray:
    """
    Decodes a base64 JPEG/PNG into a BGR ndarray via cv2.imdecode — the same
    decode family as cv2.imread(), so channel order matches training exactly
    with no manual RGB/BGR handling needed on the frontend: whatever encodes
    the image (canvas.toDataURL, etc.) just needs to produce a normal JPEG,
    and imdecode(..., IMREAD_COLOR) guarantees BGR output regardless.
    """
    if "," in b64 and b64.strip().lower().startswith("data:"):
        b64 = b64.split(",", 1)[1]
    try:
        raw = base64.b64decode(b64)
    except Exception as exc:
        raise ValueError(f"Invalid base64: {exc}") from exc

    arr = np.frombuffer(raw, dtype=np.uint8)
    image = cv2.imdecode(arr, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not decode frame (not a valid image)")
    return image


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if _model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    if len(req.frames) != EXPECTED_FRAMES:
        raise HTTPException(
            status_code=400,
            detail=f"Expected exactly {EXPECTED_FRAMES} frames, got {len(req.frames)}",
        )

    try:
        images = [decode_frame(f) for f in req.frames]
        model_input = frames_to_model_input(images)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Preprocessing failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Preprocessing failed: {exc}") from exc

    try:
        class_index = int(_model.predict(model_input)[0])
        probabilities = {}
        confidence = 0.0
        if hasattr(_model, "predict_proba"):
            proba = _model.predict_proba(model_input)[0]
            probabilities = {CLASSES[i]: float(p) for i, p in enumerate(proba)}
            confidence = float(proba[class_index])
    except Exception as exc:
        logger.error("Model inference failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Inference failed: {exc}") from exc

    return PredictResponse(
        stepLabel=CLASSES[class_index],
        classIndex=class_index,
        confidence=confidence,
        probabilities=probabilities,
    )
