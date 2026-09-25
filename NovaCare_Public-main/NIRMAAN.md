# NovaCare / Nirmaan measurement workflow

The maintained implementation is `Backend` (FastAPI) and `frontend` (React/Vite).
The older `NovaCare_full_v2` project is not required by this repository. No BP model is supplied or assumed.
The existing facial-video rPPG service supplies other metrics and is not the waveform
BP inference service. This adaptation supports awareness, recording and guidance,
not diagnosis, glucose prediction, treatment advice or clinically validated BP.

## Local setup (PowerShell)

Use Python 3.11+ and Node.js. Start an existing MongoDB instance or configure its URI.
No dataset, model, credentials or local database needs to be deleted.

```powershell
cd Backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:DEBUG='false'
$env:APP_ENV='dev'
$env:MONGO_URI='mongodb://localhost:27017'
$env:MONGO_DB='novacare'
$env:PPG_ALLOW_FIXTURES='true' # explicit local UI testing only
python -m uvicorn app.main:app --reload --port 8000
```

Set `JWT_SECRET` to your deployment secret outside local development. Existing
authentication, CORS_ORIGINS and SQLite settings still apply. `MONGODB_URI`, if
present, overrides `MONGO_URI`. Avoid the inherited non-boolean `DEBUG=release`.

In another terminal:

```powershell
cd frontend
npm.cmd ci
$env:VITE_PPG_FIXTURES='true'
npm.cmd run dev
```

Open http://localhost:3000 and use existing patient OTP login. Dev OTP is included
in the existing OTP response. Patient login creates a patient if needed. The patient
home and `/patient/measurements` show the focused workflow. For API testing copy
the login response's access token and patient ID. Never commit tokens.

Production: `PPG_ALLOW_FIXTURES=false` (default), `APP_ENV=prod`, and a real
`PPG_ML_URL` (default empty) when an inference service exists. The adapter POSTs
to `<PPG_ML_URL>/analyze`. `PPG_TIMEOUT_SECONDS=15` is an overall deadline as well
as an HTTP timeout (allowed 0–60 seconds, exclusive of zero). Browser fixtures
also require Vite development mode; they are unavailable in production builds.
`VITE_API_URL` is optional during development because Vite proxies `/measurements`.
For deployment configure that URL or reverse-proxy the API routes.

## API and access

All routes require `Authorization: Bearer <JWT>`. Existing envelopes are preserved:
`{"success":true,"data":...,"error":null}` or
`{"success":false,"data":null,"error":"message"}`.

| Route | Purpose |
|---|---|
| POST /measurements/glucose | Manually entered commercial glucometer result |
| POST /measurements/bp/reference | Manually entered commercial upper-arm cuff result |
| POST /measurements/bp/ppg | Synchronous waveform analysis and result persistence |
| GET /measurements/{patient_id}?offset=0&limit=20 | Newest-first history; limit 1–100, offset 0–100000 |
| GET /measurements/{patient_id}/trends?limit=200 | Latest up to 1000 records, grouped in chronological order |

Patient JWTs can only access their own patient, resolving both cloud and local IDs.
ASHA access requires the patient's village to match the JWT village; doctors require
the matching district. Missing scopes deny access, including dev staff tokens that
do not match the patient. These stricter rules apply to the new measurement API;
legacy patient/session endpoints retain their previous access behavior and need a
separate authorization audit before broader deployment.

Measurements are stored in the existing MongoDB connection's `measurements`
collection, with unique ID and patient/time indexes. MongoDB must be available;
this collection does not participate in the older SQLite synchronization queue.
Raw waveforms are not stored. Acquisition rate, sample count, sample unit, metadata,
contract version, analysis/model version, timestamps and results are stored.
Timestamps are timezone-aware and normalized to UTC; times over five minutes ahead
are rejected. Server `received_at` is separate from user-supplied `recorded_at`.

Reference BP is `kind=bp_reference`, with top-level systolic/diastolic and mmHg.
PPG is `kind=ppg`, with optional nested `analysis.experimental_bp`; these are never
written into reference fields. All cuffless BP is labelled **Experimental BP Estimate**.
Numeric bounds are payload plausibility limits, not diagnostic thresholds.

### Reference requests

POST `/measurements/bp/reference`:
```json
{
  "patient_id": "PATIENT_ID",
  "recorded_at": "2026-09-22T10:00:00Z",
  "metadata": {"source":"manual_reference","device_id":"upper-arm-cuff","description":"Commercial cuff, manually entered","synthetic":false},
  "systolic": 120, "diastolic": 80, "unit": "mmHg"
}
```

POST `/measurements/glucose` uses the same patient/timestamp envelope:
```json
{
  "patient_id": "PATIENT_ID",
  "recorded_at": "2026-09-22T10:00:00Z",
  "metadata": {"source":"manual_reference","device_id":"glucometer","description":"Commercial glucometer, manually entered","synthetic":false},
  "value": 95, "unit": "mg/dL", "context": "fasting"
}
```
Glucose units are `mg/dL` or `mmol/L`; context is `fasting`, `post_meal` or
`unspecified`. No unit conversion or diabetes classification is performed.

### Stable waveform contract v1

The authoritative Pydantic schemas are `Backend/app/schemas/measurement.py` and
are exposed through FastAPI `/docs` and `/openapi.json`.

`Waveform` contains `contract_version: "1"`, `samples: number[]`,
`sampling_rate_hz: number`, `sample_unit: "adc" | "normalized"`, and `metadata`.
Metadata contains source (`dataset_simulator` or `physical_sensor`), `device_id`,
an honest `description`, and `synthetic` (boolean). Synthetic implies simulator.
Measurement values and waveform samples must be JSON numbers; booleans and numeric
strings are rejected. Samples must be finite, at most 1e9 in magnitude, 100–12000 in count; sampling
rate 20–500 Hz and duration 5–60 seconds. HTTP request bodies are capped at 256 KiB,
including chunked requests. Extra fields are rejected.

Backend PPG requests add `patient_id`, `recorded_at`, and optional `fixture`.
The backend authorizes the patient before calling inference. Only Waveform fields
are forwarded to ML: no patient identity, token or fixture selector.
Simulator, frontend file upload and future ESP32 must use this same contract.
Device IDs are descriptive metadata, not device credentials or proof of hardware.

Generate an executable example instead of an abbreviated invalid samples array:
```powershell
cd Backend
python -c "import json; from device_simulator import build_payload; print(json.dumps(build_payload('PATIENT_ID', 'hr_only')))" > ppg-request.json
```

The ML service returns a bare Analysis object (no API envelope):
```json
{
  "contract_version": "1",
  "quality_score": 0.92,
  "acceptable": true,
  "retry_reason": null,
  "heart_rate_bpm": 72,
  "experimental_bp": null,
  "model": "your-actual-signal-pipeline",
  "model_version": "your-version"
}
```
Only an actual model may provide `experimental_bp` containing `label` (exactly
`Experimental BP Estimate`), `systolic`, `diastolic`, `unit: "mmHg"`.
An explicit development fixture is the sole exception and is always stored as mock.
Inference responses are capped at 16 KiB and strictly validated. `acceptable=false`
requires a nonempty retry reason and forbids BP; contradictory upstream responses
produce 502 and no record. A valid rejection returns 200 with `status=rejected`
and is recorded for history, excluded from trends. HR may remain available without BP.

Successful backend response example (additional nullable measurement fields omitted):
```json
{
  "success": true,
  "data": {
    "id": "generated-uuid", "patient_id": "canonical-local-patient-id",
    "recorded_at": "2026-09-22T10:00:00Z", "received_at": "2026-09-22T10:00:01Z",
    "kind": "ppg", "status": "accepted", "mock": true,
    "metadata": {"source":"dataset_simulator","device_id":"synthetic-simulator","description":"Synthetic sine wave; not PulseDB or validated inference","synthetic":true},
    "contract_version": "1", "sample_count": 1000, "sampling_rate_hz": 100, "sample_unit": "normalized",
    "analysis": {"contract_version":"1","quality_score":0.95,"acceptable":true,"retry_reason":null,"heart_rate_bpm":72,"experimental_bp":null,"model":"synthetic-ui-fixture","model_version":"1"}
  },
  "error": null
}
```

Errors: 401 unauthenticated, 403 patient scope or disabled fixtures, 404 patient
absent, 413 oversized body, 422 invalid input, 502 malformed ML response,
503 unavailable/unconfigured ML or measurement storage. A database acknowledgement
failure means the save is unconfirmed; check history before retrying to avoid duplicates.
ML failures never silently
substitute fixtures and do not persist a successful measurement.

History data is `{items, offset, limit, has_more}`. Trends data is
`{series:[{key,points}], truncated, order:"chronological"}`. Keys separate kind,
unit, glucose context, source, synthetic/mock status and model/version. PPG HR and
experimental BP remain separately named values with explicit units. No diagnostic
threshold lines or reference/experimental blending is applied.

## Simulator and UI smoke flows

```powershell
cd Backend
$env:NOVACARE_TOKEN='JWT_FROM_LOGIN'
python device_simulator.py --patient-id PATIENT_ID --fixture good
python device_simulator.py --patient-id PATIENT_ID --fixture poor
python device_simulator.py --patient-id PATIENT_ID --fixture hr_only
python device_simulator.py --patient-id PATIENT_ID --fixture unavailable
python device_simulator.py --patient-id PATIENT_ID --fixture experimental
python device_simulator.py --patient-id PATIENT_ID --file stored-waveform.json
```

`good` and `hr_only` intentionally return HR with no BP model. `poor` records a
rejected signal and retry reason. `unavailable` returns 503 and exits nonzero.
`experimental` supplies a clearly labelled synthetic BP fixture only for UI testing.
All fixture values are fixed test data, not computed inference. Without `--file`,
the sender constructs a 10-second synthetic sine wave, explicitly not PulseDB.
Stored files use Waveform v1; preserve honest dataset/sensor description and synthetic
flag. The simulator always sets source to `dataset_simulator`, even when replaying
a recording originally collected from hardware. Without `--fixture` it calls real ML.

On the patient page: save reference BP, save glucose with each unit/context, then
select PPG and each fixture. Check waiting state, result, rejection/retry, unavailable
service error, labels, history pagination and separate chronological trend groups.
For nonfixture UI ingestion load stored Waveform JSON (also marked simulator).
The page uses the existing auth, layout and API client. New copy is currently English;
existing language/accessibility infrastructure is preserved for translation follow-up.

## Minimal lifecycle and future hardware

This implementation uses one authorized synchronous POST per measurement: idle →
submitting/analyzing → accepted/rejected/error → explicit retry. The submitting
browser or CLI selects patient and device and observes its own HTTP response.
There is no background request queue, register/heartbeat/poll platform or remote
website-to-ESP32 command channel. For the hackathon an operator runs the simulator
command for the selected patient; the patient page can reload to observe the result.
Future ESP32 ingestion needs a narrowly scoped device credential/pairing mechanism;
do not embed a long-lived patient JWT in production firmware. Add device polling
only when remote start is actually required. Repeated manual retries create new IDs;
there is no offline queue or idempotency guarantee on ambiguous network failures.

## Cleanup and validation

Removed `frontend/src/pages/screens.jsx`: abandoned standalone demo screens with
unresolved globals, no imports/routes/config/test/documentation references in this
project. The patient legacy dashboard remains at `/patient/legacy-dashboard`; new
patient home is focused checks. Retained the second project tree, unused-looking
login/frame files, facial rPPG, ASHA/doctor workflows, reminder/accessibility/i18n
infrastructure and existing dependencies to avoid unsafe broad cleanup.

Run backend checks with `$env:DEBUG='false'; python -m pytest`. Measurement tests
use API dependency overrides, an isolated Mongo-like collection and HTTP transport
doubles, and exercise the simulator's actual payload builder. No patient data is used.
Run `npm.cmd run build` in frontend.

After the follow-up review: all 38 measurement tests passed; full backend suite
81 passed, 5 failed. Added regression coverage for readable CORS errors on oversized
requests, rejection of boolean/string measurement numbers, uncertain database write
acknowledgements, chronological subsecond ordering, and patient history isolation.
The five failures are in unchanged `test_risk_engine.py`:
`test_composite_formula_all_components`, `test_rppg_flag_adds_fixed_points`,
`test_amber_at_exactly_40`, `test_red_at_exactly_65`, `test_red_high`. Tests expect
older 0.6/0.25/0.15 weights while the current risk engine includes a symptom signal
and different weights. No diagnostic weights were changed for this adaptation.
The production frontend build passed (153 modules); Vite warns about its existing
large application chunk (approximately 610 kB). Default pytest temporary directory
access was denied by Windows; using `--basetemp=.pytest-nirmaan-validation` inside
Backend allowed the stored-waveform file test to run. Use a dedicated test-only
directory for that option, since pytest clears it on subsequent runs.

Live validation blockers: MongoDB ping at `localhost:27017` failed with
`ServerSelectionTimeoutError`; no waveform ML service/model is provided. Therefore
real persistence, login-to-save browser flows and physical sensor inference were
not verified. API workflows were exercised through FastAPI TestClient with isolated
storage and upstream HTTP doubles, including timeout/malformed responses.

Remaining work: supply a real waveform quality/HR pipeline and optional BP model;
evaluate quality rejection and model performance on target MAX30102 data, retain
PulseDB-to-device domain-shift and calibration limitations, implement hardware
pairing/acquisition, and perform live MongoDB/browser/hardware validation. No large
dataset download, training job, glucose ML or custom WebAR computer vision was added.
