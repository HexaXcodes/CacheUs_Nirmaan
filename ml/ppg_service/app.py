"""NovaCare PPG analysis service.

Implements the `POST <PPG_ML_URL>/analyze` contract that
Backend/app/services/ppg.py already calls (Waveform v1 in, bare Analysis out),
wrapping the validated Experiment 2 pipeline in ml/backend_ml_package.

Run (from the ml/ folder, using ml/.venv):
    .venv\\Scripts\\python -m uvicorn ppg_service.app:app --port 8030
Then start the backend with:
    PPG_ML_URL=http://127.0.0.1:8030

Behaviour
- Signal-quality gate first (ppg_service/quality.py). Poor signal => acceptable=false,
  a retry_reason, and no HR/BP.
- Recordings must contain >= 10 s; longer ones use the best-scoring 10 s window.
- BP comes only from the Experiment 2 linear models and is always returned as an
  "Experimental BP Estimate". If the model output is implausible the BP is
  withheld (never clamped or invented) and only the heart rate is returned.
- Set PPG_INVERT=1 if the sensor's voltage FALLS when blood volume rises
  (the model expects pulse peaks to be maxima).
"""
import logging
import os
import sys
from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal

import numpy as np
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # so `backend_ml_package` imports

from backend_ml_package import inference  # noqa: E402

from ppg_service import quality  # noqa: E402

log = logging.getLogger("ppg_service")

MODEL_NAME = "linear-regression-sbp-dbp"
MODEL_VERSION = "experiment-2"          # see ml/backend_ml_package/ML_HANDOFF.json
INVERT = os.environ.get("PPG_INVERT", "").lower() in ("1", "true", "yes")

# Output plausibility guard (not diagnostic thresholds): the saved linear models
# have very large coefficients and can extrapolate wildly on out-of-domain signals.
SBP_RANGE = (50.0, 300.0)
DBP_RANGE = (20.0, 200.0)

# The package reloads both .joblib files on every call; load once instead.
inference.load_models = lru_cache(maxsize=1)(inference.load_models)
inference.load_models()                 # fail fast at startup if the models are missing/corrupt


class Metadata(BaseModel):
    # Provenance only; never used for analysis and never logged. The backend adds fields to
    # its Metadata over time (e.g. screening_id for the ASHA questionnaire link), so unknown
    # metadata keys are ignored rather than rejected.
    model_config = ConfigDict(extra="ignore")
    source: str
    device_id: str
    description: str
    synthetic: bool = False


class Waveform(BaseModel):
    """Mirror of Backend/app/schemas/measurement.py::Waveform (what the backend forwards)."""
    model_config = ConfigDict(extra="forbid")
    contract_version: Literal["1"] = "1"
    samples: list[Annotated[float, Field(allow_inf_nan=False)]] = Field(min_length=100, max_length=12000)
    sampling_rate_hz: float = Field(ge=20, le=500, allow_inf_nan=False)
    sample_unit: Literal["adc", "normalized"]
    metadata: Metadata


class ExperimentalBP(BaseModel):
    label: Literal["Experimental BP Estimate"] = "Experimental BP Estimate"
    systolic: float
    diastolic: float
    unit: Literal["mmHg"] = "mmHg"


class Analysis(BaseModel):
    """Mirror of Backend/app/schemas/measurement.py::Analysis."""
    contract_version: Literal["1"] = "1"
    quality_score: float
    acceptable: bool
    retry_reason: str | None = None
    heart_rate_bpm: float | None = None
    experimental_bp: ExperimentalBP | None = None
    model: str = MODEL_NAME
    model_version: str = MODEL_VERSION


app = FastAPI(title="NovaCare PPG service", docs_url="/docs")


@app.exception_handler(RequestValidationError)
async def _validation_error(_request, exc: RequestValidationError):
    # Default handler echoes the offending input (a NaN makes it un-serialisable -> HTTP 500,
    # and it would also echo waveform data). Return location/message only.
    return JSONResponse(status_code=422, content={"detail": [
        {"loc": [str(x) for x in e["loc"]], "msg": e["msg"], "type": e["type"]} for e in exc.errors()]})


def _rejected(a: quality.Assessment) -> Analysis:
    return Analysis(quality_score=round(min(max(a.score, 0.0), 1.0), 3), acceptable=False,
                    retry_reason=a.reason)


def _plausible_bp(bp: dict) -> ExperimentalBP | None:
    s, d = bp["systolic"], bp["diastolic"]
    ok = (np.isfinite(s) and np.isfinite(d) and SBP_RANGE[0] <= s <= SBP_RANGE[1]
          and DBP_RANGE[0] <= d <= DBP_RANGE[1] and s > d)
    if not ok:
        log.warning("Model BP output implausible (sbp=%.1f dbp=%.1f); withholding BP", s, d)
        return None
    return ExperimentalBP(systolic=round(float(s), 1), diastolic=round(float(d), 1))


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME, "model_version": MODEL_VERSION,
            "expects": f"{quality.WINDOW_S}s window at {quality.FS} Hz (input resampled)",
            "invert_polarity": INVERT}


@app.post("/analyze", response_model=Analysis)
def analyze(body: Waveform) -> Analysis:
    assessment, window = quality.select_window(body.samples, body.sampling_rate_hz, invert=INVERT)
    if not assessment.acceptable:
        return _rejected(assessment)

    score = round(min(max(assessment.score, 0.0), 1.0), 3)
    try:
        result = inference.analyze_ppg(window, fs=quality.FS)
    except ValueError as exc:
        # Signal passed the gate but the model pipeline could not produce features/BP.
        log.warning("Model pipeline declined a gated-OK window: %s", exc)
        return Analysis(quality_score=score, acceptable=True,
                        heart_rate_bpm=round(assessment.heart_rate_bpm, 1))

    hr = float(result["heart_rate_bpm"])
    return Analysis(quality_score=score, acceptable=True,
                    heart_rate_bpm=round(hr, 1),
                    experimental_bp=_plausible_bp(result["experimental_bp"]))
