# NovaCare / Nirmaan — project context, implementation status and four-hour integration plan

Snapshot: 25 September 2026. Prepared from the current workspace, implementation notes, fresh automated checks, and the hardware discussion with Aadvik.

## 1. Read this first

The maintained application is `NovaCare_Public-main`: a React/Vite frontend and FastAPI backend for patient, ASHA worker and doctor workflows. The software supports assisted screening, guided measurement recording, doctor review, condition-based patient guidance, history and trends.

The main missing integration is **real finger sensor acquisition → waveform analysis service → existing measurement API → visible result linked to the correct screening**.

The existing PPG simulator generates synthetic input by default. Explicit fixtures also supply fixed analysis results. The backend already has an external inference adapter, but this checkout does not supply the new finger-PPG quality/HR/BP service or a validated BP model. Aadvik's friend is setting up ML separately; its actual progress, model artifacts, dataset and measured performance have not been verified here.

Four hours is a target for a demonstrable integration, conditional on usable sensor hardware and an available analysis service. It is not enough to promise development and validation of a new medical BP model or a production-ready device platform.

### Evidence labels

- **Implemented:** code exists and was inspected; not automatically a claim of live operation.
- **Checked now:** automated validation rerun for this handoff.
- **Previously verified:** a local project note records a test; not repeated live today.
- **Pending:** work needed, with no confirmed completion.
- **Blocked/unknown:** an external dependency or missing evidence prevents confirmation.

No application implementation was changed for this handoff. No current device, live database, running ML endpoint or browser session was exercised during this audit.

## 2. Which project folder to use

Workspace root: `C:\Users\Aadvik Gowda\OneDrive\Desktop\sihbackup`

| Folder | Purpose and status | Team instruction |
|---|---|---|
| `NovaCare_Public-main/frontend` | Maintained React 18/Vite application | Make current UI changes here |
| `NovaCare_Public-main/Backend` | Maintained FastAPI API, tests, simulator, demo seeding | Make current API/integration changes here |
| `NovaCare_Public-main/AI-Services(rPPG)` | Existing facial-video signal-processing service | Separate from finger waveform inference |
| `NovaCare_Public-main/AI-Services-MultiLang` | Existing translation/speech service | Optional; verify separately if demonstrated |
| `NovaCare_Public-main/NovaCare-ai_services1` | Existing voice-triage service | Legacy/optional, not the new review queue's priority input |
| `NovaCare_full_v2/CaptainUnderpants_ARMedical_Triverse-basic` | Older AR project, Node backend, inhaler ML and research assets | Reference only for this integration; not a runtime dependency of the maintained app |
| `novacare` | Separate Vite/TypeScript UI/server project | Do not confuse with maintained frontend; not fully audited here |
| `stitch-reference` | Design exports | Visual reference, not application behavior |
| `review-frames` | Review assets | Not a runtime dependency |

The older inhaler classifier predicts video procedure steps. Its documentation describes a small experimental training set and no incorrect-technique examples. It is **not a PPG/BP model**. Existing model files in that sibling folder do not establish that finger-PPG ML is complete.

## 3. Product workflow

1. A patient signs in using the OTP flow, or an ASHA worker signs in and selects/registers a patient within their access scope.
2. ASHA completes ten symptom/habit questions. Saving creates a screening intake before any PPG result exists.
3. The UI transitions to finger-PPG instructions. Today it supports explicit development fixtures or stored waveform upload; actual device capture is pending.
4. A waveform request is authorized and validated by the backend. Normal requests are sent to the configured analysis service.
5. Analysis produces signal quality, acceptance/retry information, optional HR and optional experimental BP. The backend validates and persists the result.
6. The doctor sees the latest screening per patient in the review queue, including a linked PPG result if available.
7. An authorized doctor can record already established hypertension/diabetes conditions.
8. Patient guidance follows those recorded conditions: hypertension enables cuff BP guidance; diabetes enables glucometer guidance; both enables both; neither enables neither.
9. Actual cuff/glucometer readings are entered manually and saved as reference measurements. History and trends retain provenance and units.

The symptom queue orders by the number of reported symptom concerns, then older screening first for ties. Water/salt habits are recorded without adding priority points. Voice, experimental BP and missing/rejected PPG do not determine this ordering. This is review ordering, not a validated disease probability or emergency triage score.

## 4. Status of each workstream

| Workstream | What exists now | Status / evidence | Next work and completion criterion |
|---|---|---|---|
| Frontend foundation | React routing, role protection, shared layouts, API client, persisted language preference | Implemented; production build checked now | Keep existing flows; verify final demo on intended laptop/phone |
| Authentication | Patient OTP, ASHA login, doctor login; JWT client integration | Implemented; earlier live login checks documented | Use intended scoped demo accounts; confirm fresh login in final rehearsal |
| ASHA registration/access | Village/district profile scope and cross-village registration rejection | Implemented; regression tests and previous live checks | Confirm selected demo patient belongs to ASHA scope |
| Assisted screening | Ten required answers, save/retry, transition to PPG, screening identifier | Implemented; previous browser save documented | Carry that exact screening ID into hardware submission |
| Doctor review | Latest intake per patient, concern count, linked PPG, district filtering | Implemented; API tests | Refresh queue after real/replayed analysis; check correct patient and intake |
| Doctor condition record | Doctor-only updates for hypertension/diabetes | Implemented; prior live checks | Verify all four combinations during rehearsal |
| Patient overview/history/trends | API-backed results and provenance-separated series | Implemented; build/tests and prior browser checks | Check new device results, rejection and missing BP presentation |
| BP camera guidance | Pose landmarks, cropping-aware overlays, position/stillness heuristics | Implemented; geometry checks pass | Live test camera positioning and permissions on demo device |
| Glucose camera guidance | Hand landmarks, finger overlay, limited stillness feedback | Implemented; geometry checks pass | Positive live hand tracking remains a follow-up in earlier notes; verify now during rehearsal |
| AR step verification | Manual progression plus limited camera heuristics | Partial by design | Do not claim cuff fit, strip use, lancet action or readings are automatically verified |
| Camera-free guidance | Same guided steps and final manual entry | Implemented/documented | Exercise fallback when camera permission is denied |
| Languages/read-aloud | Core English/Hindi/Kannada flows; browser speech; broader legacy translation infrastructure | Partial coverage | Translate new hardware/error copy; confirm installed browser voices |
| Measurement backend | Reference BP, glucose, waveform ingestion, history/trends and strict validation | Implemented; 101 backend tests pass now | Integrate real sender and inference endpoint, then test live persistence |
| Storage | New measurements/intakes/care plans use MongoDB; legacy SQLite sync exists elsewhere | Implemented; prior live demo checks documented | Start/recheck MongoDB; new measurement path is not offline-synced |
| Synthetic simulator | Sine-wave generation, recording replay, explicit fixture outcomes | Implemented | Keep for integration tests and labelled fallback; not proof of physical acquisition |
| Finger-PPG ML adapter | POST to configured service `/analyze`, timeout, response validation | Implemented | Friend supplies compatible service; configure URL and verify failure behavior |
| Finger-PPG quality/HR service | External responsibility; no supplied service verified in maintained tree | Pending / friend's progress unknown | Deliver reproducible service plus accepted, rejected and failure examples |
| Experimental BP model | Optional response slot; no supplied model in maintained project | Pending / unknown | Integrate only an actual compatible model with documented limitations; otherwise return null |
| Glucose ML | No optical glucose prediction in this workflow | Not implemented and outside sprint scope | Continue manual commercial glucometer recording |
| Hardware | Parts available; board appears NodeMCU ESP8266/ESP-12E | Blocked at USB detection | Establish COM port and successful upload, identify sensor, then capture signal |
| Device firmware | No `.ino` acquisition firmware found in maintained project scan | Pending | Sample confirmed sensor with measured timing; emit traceable raw samples |
| Device-to-backend transport | No confirmed live hardware bridge/pairing/remote-start channel | Pending | Build laptop serial bridge first; prove one physical-sensor POST |
| Facial-video rPPG | Existing video/skin-color signal service for HR/HRV/RR | Code/docs present, not freshly validated | Optional separate service; do not plug into waveform adapter without an explicit adapter |
| Voice analysis | Existing feature extraction/model and rule-based scoring paths | Code present; current runtime/model quality unverified | Keep outside four-hour critical path |
| Translation/speech service | Separate service and backend integration infrastructure | Present; deployment unverified | Optional if browser speech and current translations suffice |
| Heatmap/campaigns/diet/follow-up | Existing routes/modules; heatmap uses screening aggregates | Legacy/supporting functionality, not fully re-audited | Keep secondary; heatmap is not disease prevalence |
| Medication page | Current notes explicitly say persistence/import is unconnected | Incomplete | Do not demonstrate invented prescriptions; defer implementation |
| Deployment/device security | Dev scaffolding; no production device pairing | Pending | Defer hardened deployment, device credentials and offline replay safeguards |

### Current route corrections

Use `frontend/src/App.jsx` as the source of truth, since some older route notes are outdated:

- `/asha/check/:patientId` / `/asha/screening/:patientId`: current assisted flow through CarePortal.
- `/doctor/queue`: current review queue.
- `/patient/check/bp` and `/patient/check/glucose`: condition-gated guides.
- `/patient/check/ppg`: currently redirects to `/patient/check`; it is not a standalone patient PPG capture screen.
- `/patient/history` and `/patient/trends`: current measurement views.
- `/asha/legacy-screening/:patientId` and `/patient/legacy-dashboard`: retained older flows.

## 5. Data: what is synthetic and what is real?

| Input path | Input origin | Analysis | Meaning |
|---|---|---|---|
| Simulator with no file, explicit fixture | Synthetic 10-second sine wave | Fixed development result | UI/API demo only |
| Simulator with no file, no fixture | Synthetic sine wave | Configured external service | Real service execution on synthetic input |
| Simulator with stored file, no fixture | Supplied recording; source relabelled dataset simulator | External service | Replay; recording may originally be real |
| Browser waveform file upload | Supplied recording; source relabelled dataset simulator | External service unless fixture selected | Replay, not a live hardware connection |
| Proposed live serial bridge | Newly captured sensor samples | External service, no fixture | Hardware integration, once verified |
| Reference BP/glucose form | Human-entered commercial device value | Stored without PPG inference | Reference measurement |

For a live acquisition request use `source=physical_sensor`, `synthetic=false`, and omit `fixture` or set it to null. A metadata string alone does not prove a physical sensor was used: retain capture evidence and acquisition logs.

Training data and inference input are separate. Connecting a board does not retrain a model. A dataset-trained model must still be evaluated against the actual sensor's sampling rate, optical channel, scaling and noise. No specific training dataset or performance score is confirmed for the friend's current service.

## 6. End-to-end technical pipeline

### Existing software path

```text
Authenticated ASHA -> save 10-answer intake -> screening_id
                                               |
Fixture or waveform upload -> POST /measurements/bp/ppg
                              -> patient/scope + payload checks
                              -> fixture (explicit dev only)
                                 OR POST PPG_ML_URL/analyze
                              -> validate analysis
                              -> MongoDB result + provenance
                              -> frontend result/history
                              -> doctor queue links by screening_id
```

### Proposed four-hour hardware path (not implemented yet)

```text
Confirmed optical sensor
  -> NodeMCU acquisition firmware
  -> USB serial: sample sequence, timing, raw ADC values
  -> laptop Python bridge: validate capture and build Waveform v1
  -> authenticated backend POST, patient_id + screening_id
  -> friend's /analyze service: quality -> HR -> optional BP
  -> backend persistence -> ASHA/patient history -> doctor review
```

A laptop bridge avoids adding device Wi-Fi, firmware credentials and remote start to the first integration. Keep the user's authorized short-lived login token on the laptop, outside committed files. Do not place a long-lived patient JWT in firmware.

There is currently no website button that remotely starts an ESP acquisition. For the sprint, an operator can start capture and refresh the UI after completion. Explain this honestly in the demo.

## 7. API contract the hardware and ML teammates must share

Authoritative source: `Backend/app/schemas/measurement.py`; interactive API schema: backend `/docs`.

### Backend request

`POST /measurements/bp/ppg`, header `Authorization: Bearer <authorized JWT>`.

| Field | Requirement |
|---|---|
| `patient_id` | Selected authorized patient identifier |
| `recorded_at` | Timezone-aware acquisition timestamp; no more than five minutes ahead |
| `contract_version` | String `"1"` |
| `samples` | 100–12000 finite JSON numbers; no numeric strings/booleans; magnitude at most 1e9 |
| `sampling_rate_hz` | 20–500; must describe actual acquisition/resampling |
| `sample_unit` | `adc` or `normalized` |
| Duration | `len(samples) / sampling_rate_hz` between 5 and 60 seconds |
| `metadata.source` | `physical_sensor` for live capture; `dataset_simulator` for replay/synthetic |
| `metadata.device_id` | Descriptive identifier; not authentication |
| `metadata.description` | Honest description, max 200 characters |
| `metadata.synthetic` | false for real capture; true for generated waveform |
| `metadata.screening_id` | Saved intake ID for linking to doctor queue; must match patient |
| `fixture` | Omit/null for actual inference |

Total HTTP request cap: 256 KiB. Unknown fields are rejected. Do not add timestamps-per-sample to this API without coordinating a contract change; retain those in the bridge's capture log and validate uniformity before submission.

### ML request/response

Backend forwards only Waveform fields to `POST <PPG_ML_URL>/analyze`, not top-level patient identity, JWT or fixture selection. Metadata includes optional screening_id; treat it as a correlation identifier, not an ML feature.

The service must return a **bare JSON Analysis**, not the backend's success/data envelope. Illustrative contract example, not measured output:

```json
{
  "contract_version": "1",
  "quality_score": 0.92,
  "acceptable": true,
  "retry_reason": null,
  "heart_rate_bpm": 72.0,
  "experimental_bp": null,
  "model": "actual-pipeline-name",
  "model_version": "actual-version"
}
```

- Quality score: 0–1. Define its calculation with the ML teammate; do not manufacture a constant success score.
- HR: null or 20–300 bpm under the schema. These are payload bounds, not proof of accuracy.
- Rejection: `acceptable=false`, meaningful `retry_reason`, and `experimental_bp=null`. HR may be null.
- If actual BP inference exists, return `experimental_bp` with exact label `Experimental BP Estimate`, systolic, diastolic and unit `mmHg`; systolic must exceed diastolic.
- Model and version must identify the actual processing implementation.
- Default backend deadline: 15 seconds; response cap: 16 KiB.
- Valid signal rejection is stored and returns HTTP 200 with `status=rejected`; service outage is 503; invalid upstream output is 502.
- No silent fixture fallback on ML failure. Rejected results are excluded from trends.

The backend stores results, sample count/rate/unit and provenance, **not raw samples**. If debugging recordings are required, save deliberate local capture files separately with an agreed retention policy; do not assume MongoDB retains them.

## 8. Hardware context and immediate next steps

### Available equipment, reported by Aadvik

ESP-12E board (photo appears to show a NodeMCU ESP8266 development board), IR sensor module plus LED, LDR, breadboard, jumper wires including some male-to-female, 330-ohm and 10-kilohm resistors, electrical tape, sponge, Velcro, USB-A to micro-USB cable, binder clip. The exact optical module and USB bridge chip are not identified from the photo.

### Current blocker

Arduino's Port menu is unavailable, and Aadvik reports no Device Manager change after reconnect/restart. No successful firmware upload or captured waveform is confirmed. Driver links have been supplied, but driver installation success is unknown.

### Ordered continuation

1. Disconnect sensor wiring. Confirm the board is powered, then try a known data-capable micro-USB cable and a direct laptop USB port.
2. Identify USB chip near the socket (CH340/CH341 versus CP210x); install the matching official driver if needed. A driver does not fix a charge-only cable.
3. Confirm a COM device appears, select NodeMCU 1.0 (ESP-12E Module) if board identity matches, upload the serial hello sketch, and read it at 115200 baud.
4. Photograph/read the optical module's front/back markings and connector labels. Determine whether it exposes analog output and whether it is appropriate for pulse acquisition.
5. Confirm the exact development board's A0 input range before wiring. Bare ESP8266 ADC and divider-equipped development boards differ. Do not assume 3.3 V or connect 5 V to A0.
6. Establish sensor response first, then inspect raw traces with and without a finger. An on/off obstacle signal is not an analog PPG waveform. An LDR's suitability for the IR setup is not established.
7. Once electrical compatibility is confirmed, build a gentle sponge/Velcro holder. Avoid excessive finger pressure, exposed contacts and a bare binder clip clamping the finger.
8. Implement stable sampling and log elapsed time, sample count, clipping and dropped samples. Agree the target rate/window with ML; 100 Hz for 10–20 seconds is a proposed starting target, not an achieved specification.
9. Transfer a real recording to the ML teammate with rate, units, sensor identity and capture conditions. The teammate checks whether usable pulse information is present.
10. Implement live bridge submission and verify stored provenance and linked screening.

**Decision gate:** if the module only has a threshold/digital detection output, or the analog trace cannot resolve pulse information, stop promising live PPG with this kit. Use a clearly labelled recording replay for the software demonstration while identifying suitable sensor hardware. No resistor/firmware trick can guarantee the current unidentified sensor will become a reliable pulse sensor.

Current UI text in `frontend/src/pages/patient/ARMeasurement.jsx` still says ESP32/MAX30102. Replace with confirmed kit wording or neutral sensor wording before the demo. MAX30102 is not in the user's reported inventory.

Official links already checked in the setup discussion:

- ESP8266 setup: https://arduino-esp8266.readthedocs.io/en/latest/installing.html
- ADC limitations: https://arduino-esp8266.readthedocs.io/en/latest/reference.html#analog-input
- CP210x: https://www.silabs.com/software-and-tools/usb-to-uart-bridge-vcp-drivers
- CH340/CH341: https://www.wch-ic.com/downloads/CH341SER_EXE.html

## 9. Four-hour team workflow

Assumption: four work lanes, ideally four people. Actual team size/names were not supplied. Aadvik owns hardware; the friend owns ML; assign backend/integration and frontend/QA to remaining teammates. With fewer people, preserve the gates and reduce optional scope rather than assuming the same schedule.

### Deliverable at four hours

A rehearsed screening → waveform analysis → saved result → doctor review flow, with source clearly identified. Best case: real sensor input. Fallback: real recording replay or explicit synthetic demonstration. Hardware, model and deployment limitations remain visible.

| Time | Aadvik — hardware | Friend — ML | Backend/integration owner | Frontend/QA owner |
|---|---|---|---|---|
| 00:00–00:15 | Confirm COM detection, cable, board markings | Report actual model/service status, expected sensor/rate/window | Start API/Mongo; agree contract and ports | Start app; confirm logins and designated patient |
| 00:15–00:45 | Upload hello; identify sensor pins/output and ADC limits | Implement/confirm `/analyze`; output quality/HR and null BP if absent | Build serial bridge skeleton; validate requests with existing schemas | Rehearse intake and record screening ID; fix misleading hardware text |
| 00:45–01:00 | Show sensor trace or declare blocker | Analyze one shared recording; document preprocessing | Test external endpoint call, rejection and outage paths | Check labels, results, missing-BP and error presentation |
| 01:00–01:45 | Capture repeatable windows with timing evidence | Tune quality rejection against available recordings; freeze response schema | Finish capture-to-POST path with patient/screening ID and token handling | Wire any needed operator instructions; verify queue refresh/linking |
| 01:45–02:00 | Hand over one trace and metadata | Hand over service URL, requirements and example responses | Execute first complete save | Confirm same record appears in history and doctor queue |
| 02:00–02:45 | Repeat capture; test finger removal/movement | Verify flat/noisy input rejects appropriately | Check auth, malformed samples, timeout, DB failure behavior | Test BP/glucose manual paths, condition gates, languages, camera-free mode |
| 02:45–03:15 | Freeze working wiring/firmware; label components | Freeze pipeline version and launch command | Freeze config and integration; run backend tests | Run build/geometry checks; rehearse patient/ASHA/doctor navigation |
| 03:15–03:45 | Participate in full demo, avoid rewiring | Monitor real output and explain limitations | Restart services from written instructions; validate persistence | Run full happy path and one rejection/outage scenario |
| 03:45–04:00 | Package wiring photo, firmware and sample evidence | Package service and model/preprocessing notes | Record commands, ports and unresolved issues | Save final demo script and evidence; stop feature additions |

### Mandatory checkpoints and fallback rules

- **Minute 15:** agree one API contract, one patient and one owner for each lane. ML work can proceed on labelled test recordings while USB is being fixed.
- **Minute 45–60:** if no usable analog signal is demonstrated, choose replay for this sprint and keep hardware work separate. If only synthetic input is available, call it synthetic.
- **Minute 60:** if no BP model is ready, freeze HR/quality-only scope. Do not substitute fixture BP in the real-input path.
- **Minute 120:** require one complete authorized request with persisted result and visible UI. If absent, all lanes prioritize integration over enhancements.
- **Minute 180:** freeze feature scope and rehearse. Do not begin fresh model training, production pairing, Bluetooth or a UI redesign.

### Required handoff artifacts per teammate

| Owner | Must deliver |
|---|---|
| Hardware | Board/sensor identities; labelled wiring photo; firmware; actual sampling rate/timing evidence; one raw capture; current limitations |
| ML | Runnable service; dependency versions; launch command; input preprocessing; accepted/rejected examples; model/version; training provenance if model-based; latency and known limitations |
| Backend | Bridge script; environment variable names; endpoint/port agreement; patient/screening linkage; saved record evidence; no committed tokens |
| Frontend/QA | Correct hardware copy; visible provenance; screenshots/demo script; tested role/condition/error paths; unresolved UI issues |

Suggested new artifacts, **not yet implemented**: `hardware/esp8266_ppg.ino`, `hardware/README.md`, `Backend/hardware_bridge.py`, and a separately named finger-PPG service directory. Agree names before editing; do not overwrite the facial-rPPG service.

## 10. Local runbook and configuration

Use separate PowerShell terminals. Commands assume starting from `NovaCare_Public-main`. Existing virtual environments and node_modules are present locally; teammates on fresh machines must install the declared dependencies.

### Backend

```powershell
cd Backend
$env:DEBUG='false'
$env:APP_ENV='dev'
$env:MONGO_URI='mongodb://localhost:27017'
$env:MONGO_DB='novacare_review'
$env:PPG_ALLOW_FIXTURES='false'
# Set this to the actual base URL supplied by the ML teammate:
$env:PPG_ML_URL='http://127.0.0.1:8011'
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Port 8011 above is a proposed allocation, not evidence of an existing service. Backend appends `/analyze`; do not include that suffix in PPG_ML_URL. Start MongoDB separately. If MONGODB_URI is set, it overrides MONGO_URI. Do not overwrite an existing .env or database blindly.

### Frontend

```powershell
cd frontend
$env:VITE_PPG_FIXTURES='false'
npm.cmd run dev
```

Frontend defaults to port 3000. Its Vite proxy currently targets backend port 8000. An existing `VITE_API_URL` overrides the relative API base, so check it if requests go elsewhere. Restart Vite after environment changes.

`NIRMAAN_DEMO.md` describes an earlier local setup on backend port 8020 and database `novacare_review`. Either use the 8000 convention above or configure the frontend API base/proxy consistently for 8020. The seed script also targets its documented demo setup: inspect before running, and do not reseed unnecessarily. Demo login details are kept in that local document, not copied into this handoff.

For explicit fixture rehearsal only, enable backend `PPG_ALLOW_FIXTURES=true` in dev and frontend `VITE_PPG_FIXTURES=true`, then restart both. Disable them for the real-sensor acceptance run. Browser fixtures are also gated by Vite development mode.

### Check commands

```powershell
# From Backend:
$env:DEBUG='false'
.\.venv\Scripts\python.exe -m pytest -q

# From frontend:
npm.cmd run build
node --test src/components/ar/*.test.js
```

If pytest needs a local temporary directory, use a dedicated test-only `--basetemp` path; pytest clears that directory on reuse. Never point it at data or source folders.

Optional service URLs in backend settings default to facial rPPG 8001, multilingual 8002 and voice 8003. The facial-rPPG README uses 8010 in its launch example: match actual service configuration explicitly rather than assuming all defaults agree.

## 11. Acceptance checklist

### Required for any integrated demonstration

- [ ] Fresh role logins work with the intended scoped patient.
- [ ] All ten answers save and remain reviewable before PPG succeeds.
- [ ] Waveform request uses correct patient_id and saved screening_id.
- [ ] Real `/analyze` response satisfies the schema; no fixture on this path.
- [ ] Accepted result persists and appears after page reload.
- [ ] Doctor queue shows the matching patient's linked PPG.
- [ ] Rejected quality shows retry reason and no BP; rejection does not lower symptom priority.
- [ ] ML outage shows error with no invented success record.
- [ ] BP may be absent while HR is present; UI does not invent BP.
- [ ] Reference BP/glucose remain distinct from experimental output.
- [ ] Doctor condition changes control intended patient guides.
- [ ] Cross-patient access is denied; wrong-scope staff access is denied.
- [ ] Frontend build, backend tests and geometry tests pass.
- [ ] Team can restart the stack from its documented configuration.

### Additional requirements to claim live hardware integration

- [ ] Board is recognized and flashed successfully.
- [ ] Sensor/ADC compatibility and wiring are identified.
- [ ] Capture demonstrably comes from the sensor, with actual sampling timing.
- [ ] Repeated capture produces usable pulse information, not merely light or finger detection.
- [ ] Live bridge sends physical_sensor / synthetic=false, with fixture absent.
- [ ] Samples are not silently replaced by generated or previously recorded values.
- [ ] Capture and saved result can be correlated by time, patient and screening.

Passing these checks demonstrates integration, not clinical accuracy.

## 12. Fresh validation results and documentation conflicts

Checked during preparation on 25 September 2026:

- **Backend: 101 tests passed.** One Starlette/AnyIO deprecation warning. Run with local dedicated temporary directory `.pytest-handoff-check`.
- **Frontend geometry: 8 tests passed.** Includes arm visibility, crop projection, hand tracking geometry, posture, stillness and limits on device-action claims.
- **Frontend production build: passed, 175 modules transformed.** Existing >500 kB chunk warning remains (main JS approximately 624 kB uncompressed).
- Initial sandboxed build failed on filesystem access before compilation; rerunning with approved expanded access succeeded. This was not an application build defect.
- Live browser, MongoDB, physical hardware and friend's ML service were not retested for this handoff.

Older `NIRMAAN.md` records 81 passes/5 failures and a then-unavailable MongoDB. Later `NIRMAAN_DEMO.md` records 101 passes and successful local Mongo/API/browser checks. The fresh test run confirms 101 passing tests; old failures are not treated as current failures. Previous live checks do not establish the database is running today.

Earlier frontend notes say no landmark tracking, then an appended update introduces MediaPipe tracking. Current code also includes limited position feedback. Current source and fresh checks take precedence over earlier narrative text.

## 13. Work remaining after the four-hour sprint

1. Confirm or replace the optical sensor and obtain repeatable hardware recordings.
2. Evaluate signal-quality/HR behavior across motion, lighting, placement and users; define meaningful validation criteria.
3. If pursuing BP, establish suitable training/reference data, subject-separated evaluation and target-device calibration strategy. Do not equate dataset performance with device performance.
4. Add scoped device credentials/pairing if moving beyond an operator laptop bridge.
5. Add remote acquisition start/status only if required by the product; currently absent.
6. Design idempotency/retry handling and offline measurement synchronization; current ambiguous retries may duplicate records.
7. Finish UI translation and positive live camera/device testing across intended browsers.
8. Audit authorization of legacy endpoints separately from stricter measurement routes.
9. Configure real messaging providers/secrets and deployment HTTPS/CORS; current defaults include mock services.
10. Address optional medication persistence, legacy service verification and bundle-size optimization outside the integration critical path.

## 14. Source map for the next teammate or assistant

Paths below are relative to `NovaCare_Public-main` unless stated otherwise.

| Topic | Source |
|---|---|
| Maintained scope | `readme.md` |
| Measurement contract/history | `NIRMAAN.md`, `Backend/app/schemas/measurement.py` |
| Current demo and prior live verification | `NIRMAAN_DEMO.md` |
| Current routing | `frontend/src/App.jsx` |
| ASHA intake transition | `frontend/src/pages/asha/screening/AssistedScreening.jsx` |
| PPG instructions | `frontend/src/pages/patient/ARMeasurement.jsx` |
| Fixture/upload/save/history UI | `frontend/src/pages/patient/Measurements.jsx` |
| Camera position heuristics | `frontend/src/components/ar/positionFeedback.js` |
| API authorization, save, queue, care plans | `Backend/app/routers/measurements.py` |
| External waveform adapter | `Backend/app/services/ppg.py` |
| Symptom review ordering | `Backend/app/services/screening_priority.py` |
| Simulator/replay provenance | `Backend/device_simulator.py` |
| Backend environment settings | `Backend/app/config.py` |
| Frontend API base/proxy | `frontend/src/api/client.js`, `frontend/vite.config.js` |
| Earlier UI/tracking notes | `frontend/STITCH_INTEGRATION.md` |
| Separate facial-video processing | `AI-Services(rPPG)/README.md` |
| Older inhaler ML | Sibling `NovaCare_full_v2/.../ml-service/README.md` |

**Resume point:** Aadvik first resolves USB enumeration and identifies the sensor. The ML friend delivers a Waveform-v1-compatible `/analyze` service. Backend and frontend owners can complete contract integration and role-flow testing independently while those two blockers are resolved.
