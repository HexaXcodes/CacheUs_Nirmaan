# NovaCare Backend — v2.0

Backend for **NovaCare**: a medical-delivery and procedure-technique guidance platform.

NovaCare is **not** a doctor, diagnostic system, or prescriber. It helps a patient correctly
*execute* a procedure they've already been prescribed or instructed to do — inhaler technique,
home BP measurement, insulin injection, glucose testing, eye drops/nasal spray/nebulizer use,
and a small set of low-risk home procedures (minor wound dressing, ORS preparation) — plus
structured medication reminders and adherence tracking.

---

## 1. Migration summary (v1.1 → v2.0)

### What was preserved
- **Authentication** (`/api/auth/register`, `/login`, `/me`) — JWT + bcrypt, unchanged behavior.
- **Security stack** — Helmet, Morgan, rate limiting, centralized error handler, graceful shutdown,
  `asyncHandler` wrapper, `protect` / `optionalAuth` middleware.
- **`User` model** — kept `medicalInfo` (age/gender/bloodGroup/conditions/allergies/notes) and
  `reports` (uploaded file metadata).
- **Report upload** — same multer/disk-storage architecture, just moved from `/api/upload` to
  `/api/reports` to match the new route naming.
- **Node-cache layer** (`services/cache.js`) — reused for workflow-config and LLM response caching.
- **LLM retry/backoff/timeout infra** in `services/llmService.js` — reused, prompts refocused.

### What was removed / replaced
- The **severity-based wound/burn/CPR workflow model** (`data/workflows.json` with
  `mild`/`moderate`/`severe` branches, `GET /api/workflow/:id/:severity`, `POST
  /api/workflow/detect` with random severity) is **gone**. It encoded first-aid emergency triage,
  which is outside NovaCare's new scope (procedure-technique guidance, not emergency diagnosis).
- The **QR/marker-based AR assumption** baked into the old `/api/workflow/detect` (`markerHint`)
  is gone. The new architecture assumes markerless ML perception feeding normalized
  coordinates/landmarks — see §5.
- `medicalInfo.medications` (free-text string array) was removed from `User` in favor of the
  structured `Medication` model (§3).

### New in v2.0
1. Structured **medication management + adherence logging** (`/api/medications`).
2. Generic **six-phase procedure workflow engine**, config-driven (`data/workflows.json`,
   `services/workflowConfig.js`) — adding workflow #7 means editing JSON, not backend code.
3. **Procedure sessions** (`/api/sessions`) — tracks a user's attempt at a workflow, step by step.
4. **ML verification contract** (`/api/ml/verification`) — a clean, validated interface for the
   (separately developed) perception model. No fake ML is implemented here.
5. **Mock ML endpoint** (`/api/ml/mock`) — dev/demo-only simulation of correct/incorrect/uncertain,
   clearly tagged `mock: true` everywhere it appears.
6. **AI coaching refactor** (`/api/ai/explain`, `/api/ai/summary`) — step/workflow explanations in
   the requested language, under a strict no-diagnose/no-prescribe/no-dose guardrail prompt.

### Frontend compatibility note
The old frontend (`frontend/src/services/*.js`, `pages/ARExperience.jsx`, `components/ar/*`) was
built against the v1.1 severity/marker API and is **not updated by this backend change** (per
scope: "do not implement frontend UI"). It will need updates to:
- `authService.js` — `/user/*` → `/users/*` (auth endpoints themselves are unchanged).
- `workflowService.js` — replace `/workflow/detect` and `/workflow/:id/:severity` with
  `/workflows` and `/workflows/:id?device=`, plus new `/sessions` and `/ml/*` calls.
- `aiService.js` — `explainStep`/`scenarioSummary` now take `{ workflowId, stepId, language }` /
  `{ workflowId, language }` instead of `{ workflowName, severity, step }`.
- AR components (`MarkerTracker.jsx`, `arConfig.js`, `.patt` files) — replaced conceptually by
  consuming ML perception output (objects/landmarks/bboxes) instead of AR.js marker events; that
  perception model is being built separately.

---

## 2. Quick start

```bash
npm install
npm run dev
```

Server runs on `http://localhost:5000` (or `PORT` from `.env`).

### `.env`

```
PORT=5000
MONGO_URI=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/novacare?retryWrites=true&w=majority
JWT_SECRET=replace_with_long_random_string
OPENAI_API_KEY=sk-proj-your-key-here
NODE_ENV=development
ENABLE_MOCK_ML=true    # set to "false" to disable /api/ml/mock (e.g. in production)
```

> No OpenAI key? `/api/ai/*` falls back to hand-built explanations from the workflow config —
> demo still works. No MongoDB? Auth/medications/sessions/reports will fail with a clear 500;
> `/api/workflows` (read-only, public) and `/api/ai/explain` for guests still work.

---

## 3. Data models

| Model | Purpose |
|---|---|
| `User` | Auth + medical profile (age/gender/bloodGroup/conditions/allergies/notes) + reports |
| `Medication` | One structured prescribed medication (`name, dosage, form, frequency, scheduledTimes, startDate, endDate, instructions, prescribedBy, active, reminderEnabled`) |
| `MedicationLog` | One adherence event (`scheduledTime, status: taken/skipped/missed, takenAt, note`) |
| `ProcedureSession` | One attempt at a workflow (`workflowId, device?, currentStep, status, stepResults[]`) |

Workflow **definitions** themselves are not a DB model — they live in `data/workflows.json` and
are read through `services/workflowConfig.js`, matching the generic shape described in §5 of the
original spec (id/phase/category/name/steps/expectedSignals/verificationMode/nextStep, with
optional `deviceVariants` for workflows like inhaler technique that differ by device type).

---

## 4. API reference

### Auth (`/api/auth`) — rate limited 10/min, **unchanged**
| Method | Path | Body | Auth |
|---|---|---|---|
| POST | `/register` | `{ name, email, password }` | — |
| POST | `/login` | `{ email, password }` | — |
| GET | `/me` | — | Bearer |

### Users (`/api/users`)
| Method | Path | Body | Auth |
|---|---|---|---|
| GET | `/profile` | — | Bearer |
| PUT | `/medical-info` | `{ age, gender, bloodGroup, conditions:[], allergies:[], notes }` | Bearer |

### Medications (`/api/medications`) — all require Bearer, all scoped to the caller
| Method | Path | Body |
|---|---|---|
| GET | `/` | — (optional `?active=true`) |
| POST | `/` | `{ name, dosage, form?, frequency?, scheduledTimes?, startDate?, endDate?, instructions?, prescribedBy?, active?, reminderEnabled? }` |
| GET | `/:id` | — |
| PUT | `/:id` | any of the fields above |
| DELETE | `/:id` | — |
| POST | `/:id/log` | `{ scheduledTime, status: taken\|skipped\|missed, takenAt?, note? }` |
| GET | `/today` | — → today's dose slots with `pending/taken/skipped/missed` |
| GET | `/history` | — (optional `?medicationId=&from=&to=`) |

### Workflows (`/api/workflows`) — public, cached 24h
| Method | Path | Notes |
|---|---|---|
| GET | `/` | List of `{ id, phase, category, name, description, supported, requiresML, requiresAR, deviceTypes? }` |
| GET | `/:id?device=` | Full workflow with steps. `device` required for `deviceVariants` workflows (e.g. `inhaler_technique`: `mdi`\|`dpi`\|`soft_mist`), otherwise defaults to the first device type. Unsupported workflows return the guidance message instead of steps. |

Supported workflow IDs today: `inhaler_technique` (phase 1), `bp_measurement` (phase 2),
`insulin_injection` (phase 3), `glucose_measurement` (phase 4), `eye_drops` / `nasal_spray` /
`nebulizer` (phase 5), `wound_dressing` / `ors_preparation` (phase 6).

### Sessions (`/api/sessions`) — all require Bearer, all scoped to the caller
| Method | Path | Body |
|---|---|---|
| GET | `/` | — list caller's sessions |
| POST | `/` | `{ workflowId, device? }` → creates session, returns first step + resolved workflow |
| GET | `/:id` | — |
| PUT | `/:id` | `{ status?, currentStep? }` |
| POST | `/:id/steps` | `{ stepId, status, confidence?, errorCode?, perception?, timestamp? }` — records a step result directly (e.g. for `verificationMode: "manual"` steps) |
| POST | `/:id/complete` | — marks session completed |

### ML contract (`/api/ml`) — all require Bearer (writes into the caller's own session)
| Method | Path | Notes |
|---|---|---|
| POST | `/verification` | The real perception-service contract (see §5) |
| POST | `/mock` | **Dev/demo only.** Same body shape; every result is tagged `mock: true`. Disable via `ENABLE_MOCK_ML=false`. |

### AI coaching (`/api/ai`) — rate limited 30/min, cached 1h, optional auth
| Method | Path | Body |
|---|---|---|
| POST | `/explain` | `{ workflowId, stepId, language?, device? }` → `{ explanation, commonMistakes }` |
| POST | `/summary` | `{ workflowId, language? }` → `{ explanation }` |

Guardrails (enforced via prompt, see `services/llmService.js`): never diagnoses, prescribes,
changes/calculates dose, judges severity, or overrides the deterministic workflow.

### Reports (`/api/reports`) — require Bearer
| Method | Path | Body | Auth |
|---|---|---|---|
| POST | `/` | multipart, field `report` (+ optional `category`: prescription/lab_report/medical_record/other) | Bearer |
| GET | `/` | — | Bearer |

PDF/DOC/DOCX/TXT/JPG/PNG, max 10MB.

---

## 5. ML verification contract

`POST /api/ml/verification` (also `/api/ml/mock` for dev simulation) — the backend validates
shape and applies it to the session's deterministic step machine. **No medical intelligence is
implemented here**; the real perception model is developed separately.

```jsonc
// Request
{
  "workflowId": "inhaler_technique",
  "sessionId": "665f1a2b3c4d5e6f7a8b9c0d",
  "stepId": "position_mouthpiece",
  "status": "incorrect",           // "correct" | "incorrect" | "uncertain"
  "confidence": 0.91,               // 0-1
  "errorCode": "incorrect_position",
  "perception": {
    "objects": [
      { "label": "inhaler", "confidence": 0.97, "bbox": [0.32, 0.41, 0.21, 0.17] }
    ],
    "landmarks": [
      { "name": "mouthpiece", "x": 0.55, "y": 0.42 }
    ],
    "boundingBoxes": []
  },
  "timestamp": "2026-08-19T12:00:00.000Z"
}
```

```jsonc
// Response
{
  "mock": false,
  "sessionId": "665f1a2b3c4d5e6f7a8b9c0d",
  "stepId": "position_mouthpiece",
  "status": "incorrect",
  "nextStep": null,          // null when status != "correct" — the session stays on this step
  "workflowComplete": false,
  "session": { /* full updated ProcedureSession */ }
}
```

Coordinates in `perception` are normalized `0–1`, independent of camera resolution. The backend
never renders AR or interprets pixel coordinates — it only stores/relays this metadata; the
frontend AR renderer owns all rendering.

### Mock mode

```
POST /api/ml/mock
Body: same shape as above.
```

Every mock result is stored with `metadata.mock: true` inside the session's `stepResults`, and
the API response is tagged `mock: true` at the top level, so it can never be mistaken for a real,
medically-validated result. Set `ENABLE_MOCK_ML=false` to disable this endpoint entirely (e.g. in
a production deployment).

---

## 6. Sample flow

```bash
BASE=http://localhost:5000/api

# 1. Register / login (unchanged)
TOKEN=$(curl -s $BASE/auth/register -H 'Content-Type: application/json' \
  -d '{"name":"Asha","email":"asha@example.com","password":"secret123"}' | jq -r .token)

# 2. Add a prescribed medication
curl -s $BASE/medications -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Salbutamol","dosage":"100mcg","form":"inhaler","frequency":"as needed",
       "scheduledTimes":["08:00","20:00"],"instructions":"2 puffs","prescribedBy":"Dr. Rao"}'

# 3. Look at the inhaler workflow for a metered-dose inhaler
curl -s "$BASE/workflows/inhaler_technique?device=mdi"

# 4. Start a session
SESSION=$(curl -s $BASE/sessions -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"workflowId":"inhaler_technique","device":"mdi"}' | jq -r .session._id)

# 5. Simulate a correct first step (mock ML, dev only)
curl -s $BASE/ml/mock -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"workflowId\":\"inhaler_technique\",\"sessionId\":\"$SESSION\",\"stepId\":\"identify_device\",\"status\":\"correct\",\"confidence\":0.95}"

# 6. Get a coaching explanation for the next step
curl -s $BASE/ai/explain -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"workflowId":"inhaler_technique","stepId":"prepare_device","language":"en"}'
```

---

## 7. Files changed / added

**Added:** `models/Medication.js`, `models/MedicationLog.js`, `models/ProcedureSession.js`,
`services/workflowConfig.js`, `services/sessionEngine.js`, `controllers/medicationController.js`,
`controllers/sessionController.js`, `controllers/mlController.js`, `routes/medicationRoutes.js`,
`routes/sessionRoutes.js`, `routes/mlRoutes.js`, `routes/reportRoutes.js` (replaces
`routes/uploadRoutes.js`).

**Rewritten:** `data/workflows.json`, `controllers/workflowController.js`,
`routes/workflowRoutes.js`, `controllers/aiController.js`, `routes/aiRoutes.js`,
`services/llmService.js`, `app.js` (route mounts).

**Modified:** `models/User.js` (removed free-text `medications`), `controllers/userController.js`
(dropped `medications` from the allowed medical-info fields).

**Removed:** `routes/uploadRoutes.js` (superseded by `routes/reportRoutes.js`).

**Unchanged:** `controllers/authController.js`, `routes/authRoutes.js`,
`middleware/authMiddleware.js`, `middleware/asyncHandler.js`, `config/db.js`, `services/cache.js`,
`routes/userRoutes.js`, security/logging/rate-limiting setup.
