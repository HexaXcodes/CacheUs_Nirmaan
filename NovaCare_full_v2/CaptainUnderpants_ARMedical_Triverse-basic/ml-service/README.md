# NovaCare Inhaler Frame Classifier — internal ML service

Internal-only FastAPI service wrapping the friend's `frame_baseline.pkl`
(a `StandardScaler -> LogisticRegression` sklearn `Pipeline`) for Phase 1
(inhaler) step classification. **Not exposed publicly** — only the Node
backend's `services/inhalerMlClient.js` calls it, via
`POST /api/ml/inhaler/predict`, so auth/rate-limiting/session checks apply
before any request reaches here. Bind it to `127.0.0.1` only.

See [`docs/PHASE_1_ML_INTEGRATION.md`](../docs/PHASE_1_ML_INTEGRATION.md) in
the main repo for the full accuracy/limitation disclosure — this model is
experimental (n=32, one demonstration, one person) and should not be
described as more validated than that anywhere in the app.

## Setup (one time)

```bash
cd ml-service
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

## Run

From `backend/`:

```bash
npm run ml-service
```

Or directly from `ml-service/` (with the venv active):

```bash
python -m uvicorn main:app --host 127.0.0.1 --port 8100
```

Health check: `curl http://127.0.0.1:8100/health`

## What this does and doesn't do

- `POST /predict` takes exactly 20 base64-encoded frames and returns the raw
  model output (`stepLabel`, `classIndex`, `confidence`, full
  `probabilities`). Preprocessing (`frame_features.py`) is a refactored copy
  of the friend's `frame_step_detector.py` pipeline — same
  `cv2.cvtColor -> cv2.resize((32,32)) -> /255.0 -> flatten` steps, in the
  same order, just decoupled from disk I/O so live camera frames don't need
  to round-trip through a temp directory. The friend's original file is
  untouched.
- It does **not** decide correct/incorrect, and does **not** do temporal
  smoothing across windows — both happen in the Node backend
  (`inhalerTemporalSmoothing.js` / `mlController.js`) so every workflow's ML
  contract stays identical whether the verdict came from this model, the
  BP/eye-drops rule engine, or the dev Simulate buttons.
- The model only ever learned "which of the 8 steps is this" — never
  "was this step performed correctly." There are zero incorrect-technique
  examples in its training data. Don't let any UI copy imply otherwise.

## Model artifacts

`model/frame_baseline.pkl` and `model/frame_baseline_metadata.json` are
copies of the friend's trained artifacts
(`cacheus-ml/cacheus-ml/data/processed/inhaler/frame_models/`), not
regenerated here — this service doesn't train anything.
