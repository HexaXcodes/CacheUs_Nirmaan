# NovaCare Frontend Migration — v1.1 → v2.0

Same application, evolved: patient login/register, dashboard, records upload, a scenario picker,
and an AR launch page all still exist at the same routes. What changed is the *product* those
pages serve — from emergency wound/burn/CPR first aid with QR-marker AR, to medication delivery +
procedure guidance + markerless AR, matching the backend v2.0 rewrite.

## 0. Inspection summary (done before any code changes)

**Pages found:** LandingPage, Login, Register, Dashboard, UploadReport, WorkflowSelect,
ARExperience — all six kept, at their original routes (`/`, `/login`, `/register`, `/dashboard`,
`/upload`, `/workflow`, `/ar`).

**AR components found:** two parallel implementations —
1. `components/ar/*` — a real AR.js + A-Frame marker-tracking stack (`ARScene`, `MarkerTracker`,
   `useArScripts`, `useMarkerEvents`, `StepRenderer`, `OverlayObjects`, `arConfig`) using
   `hiro`/`kanji` presets and custom `.patt` files under `public/markers/`.
2. `components/workflow/ARScene.jsx` — a placeholder/demo AR view (gradient + crosshair, no real
   camera tracking) explicitly marked in its own header comment as a stand-in.

**QR/marker dependencies found:** `WORKFLOW_TO_MARKER` in `arConfig.js` mapped each old
scenario (`wound_care`/`burn_care`/`cpr`) to the AR.js `hiro` preset; `MarkerTracker` rendered an
`<a-marker>`; `public/markers/*.patt` held custom pattern files; `public/lib/aframe*.js` and
`public/hiro.html` supported the AR.js runtime.

**Reusable UI identified:** `PageShell`, `Navbar`, `Card`, `Spinner`, `ErrorMsg`, `AuthLayout`,
`StatTile`, `UploadDropzone`, the whole `card-glass` / `btn-primary` / brutalist design system in
`index.css` and `tailwind.config.js` — **all kept as-is**, zero visual-language changes.

**Workflow context/state identified:** `WorkflowContext` held `selectedWorkflow` +
`selectedSeverity` + `activeScenario` (a severity-resolved wound/burn/CPR payload) + a linear
`currentStep` index, with `detect()` (QR-marker quick start) and `loadScenario()` (manual
severity pick) actions.

**API service layer identified:** `services/api.js` (generic fetch wrapper — kept unchanged),
`authService`, `workflowService` (`list`, `detect`, `get(id,severity)`, `uploadReport`,
`listReports`), `aiService` (`explainStep({workflowName,severity,step})`, `scenarioSummary`).

## 1. Migration plan (as executed)

1. **Services** — rewritten to the backend v2 contract: `authService` (`/users/*`),
   `workflowService` (`list`, `get(id, device)`), new `sessionService`, `mlService`,
   `medicationService`, `reportService` (renamed from the upload calls that lived in
   `workflowService`), and `aiService` (`explainStep({workflowId, stepId, language})`).
2. **WorkflowContext** — rewritten to hold a `catalog` (from `GET /workflows`) and a single
   resolved `selectedWorkflow` (with `steps`), no severity concept.
3. **New generic workflow data layer** — `data/careWorkflowsMeta.js` groups the backend's 9
   workflow IDs into the product's 6 phases, and is the single place that decides launch
   availability (`available` / `beta` / `coming_soon`) independent of backend `supported` flags.
4. **New AR architecture** — `CameraFeed` (raw camera, no marker lib) + `ARAnchor` (position from
   normalized `x/y/width/height/landmarks`, never a fixed screen position) +
   `MockPerceptionService` (swap point for real ML) + `useProcedureSession` (the generic
   `IDLE → DETECTING → ... → CORRECT/INCORRECT/UNCERTAIN → COMPLETE` state machine, identical
   code path for all 6 phases) + `GuidancePanel` (instruction/status/simulate/exit UI).
5. **Pages updated in place, same routes**: `Dashboard` (medication reminders + up-next + recent
   activity), `WorkflowSelect` → "Care Workflows" (6-phase grid → detail panel → Start),
   `ARExperience` (markerless), `UploadReport` → "Medical Records" (category tagging, no
   diagnosis), `LandingPage` (messaging only), `Navbar` (Dashboard/Care/Records + due-medication
   badge).
6. **i18n** — a lightweight flat `translations.js` (en/hi/kn) + `LanguageContext` for UI chrome;
   workflow *content* carries its own `instruction.en/hi/kn` straight from the backend config, so
   step text was never hand-translated per component.
7. **Legacy isolation** — the AR.js/marker stack and the severity-based UI were **not deleted**;
   every file got a `LEGACY` header comment explaining why it's retained and confirming it's
   unreferenced by any current page/route (verified by grep + a Vite dev-server transform check
   on every legacy file — see §6).

## 2. Files changed

**Rewritten:** `App.jsx` (added `LanguageProvider`, routes unchanged), `context/WorkflowContext.jsx`,
`pages/LandingPage.jsx`, `pages/Dashboard.jsx`, `pages/WorkflowSelect.jsx`, `pages/ARExperience.jsx`,
`pages/UploadReport.jsx`, `components/layout/Navbar.jsx`, `components/dashboard/MedicalInfoForm.jsx`
(dropped the free-text `medications` field — see backend model change), `services/authService.js`,
`services/workflowService.js`, `services/aiService.js`.

**Added:**
- `context/LanguageContext.jsx`, `i18n/translations.js`
- `data/careWorkflowsMeta.js`
- `services/sessionService.js`, `services/mlService.js`, `services/medicationService.js`,
  `services/reportService.js`, `services/perception/mockPerceptionService.js`
- `hooks/useProcedureSession.js`
- `components/ar/ARAnchor.jsx`, `components/ar/CameraFeed.jsx`, `components/ar/GuidancePanel.jsx`
- `components/care/PhaseCard.jsx`, `components/care/WorkflowDetailPanel.jsx`
- `components/dashboard/MedicationToday.jsx`, `UpNextCard.jsx`, `RecentActivity.jsx`
- `components/common/LanguageSwitcher.jsx`, `SafetyDisclaimer.jsx`

**Unchanged:** `pages/Login.jsx`, `pages/Register.jsx`, `components/auth/AuthLayout.jsx`,
`context/AuthContext.jsx`, `routes/ProtectedRoute.jsx`, `services/api.js`,
`components/layout/PageShell.jsx`, `components/common/Card.jsx`, `Spinner.jsx`, `ErrorMsg.jsx`,
`components/upload/UploadDropzone.jsx`, `components/dashboard/StatTile.jsx`, all Tailwind/CSS
design tokens, `index.html`, Spline scene reference.

**Retained as legacy (headers added, not deleted, not imported anywhere new):**
`components/ar/ARScene.jsx`, `MarkerTracker.jsx`, `arConfig.js`, `useMarkerEvents.js`,
`useArScripts.js`, `StepRenderer.jsx`, `OverlayObjects.jsx`, `components/workflow/ARScene.jsx`
(placeholder), `components/workflow/SeveritySelector.jsx`, `components/common/SeverityBadge.jsx`,
`components/workflow/StepOverlay.jsx`, `components/workflow/WorkflowCard.jsx`,
`hooks/useStepExplanation.js`. Static assets `public/markers/*.patt/.png`, `public/lib/aframe*.js`,
`public/hiro.html` were left untouched (harmless, unreferenced by the new flow).

## 3. Components created

`LanguageProvider`/`useLanguage`, `careWorkflowsMeta` (data module), `useProcedureSession` (state
machine hook), `MockPerceptionService`, `ARAnchor`, `CameraFeed`, `GuidancePanel`, `PhaseCard`,
`WorkflowDetailPanel`, `MedicationToday`, `UpNextCard`, `RecentActivity`, `LanguageSwitcher`,
`SafetyDisclaimer` — full list and purpose in `README.md`.

## 4. Legacy AR/QR — retained and isolated

The AR.js + A-Frame marker stack is a working, non-trivial implementation (script loading with
customElements-registry polling, marker found/lost event binding, 3D overlay primitives) — it was
**not deleted**, since the instructions call for isolating rather than blindly removing legacy
code. It now sits entirely unused: no page or route imports `components/ar/ARScene.jsx`,
`MarkerTracker.jsx`, or `components/workflow/ARScene.jsx` anymore (verified by `grep -rn` across
`src/` finding only the new code's own comments referencing these files by name, plus a live Vite
dev-server request against every legacy file to confirm none of them error on transform even in
isolation). Each file's header now says explicitly that it's legacy and what replaced it.

**No QR/marker scan appears anywhere in the new primary flow.** `WorkflowSelect` → `ARExperience`
never touches `.patt` files, `hiro`/`kanji` presets, or `<a-marker>`.

## 5. New markerless AR architecture

```
CameraFeed (getUserMedia)
   ↓ onReady
useProcedureSession (state machine)
   ↓ creates ProcedureSession via sessionService.create()
   ↓ starts MockPerceptionService.start(onFrame)
MockPerceptionService
   ↓ emits {x, y, width, height, landmarks} every animation frame (normalized 0-1, drifting —
   ↓  proves positioning isn't hardcoded to one spot on screen)
ARAnchor
   ↓ renders a bounding box + landmark dots at `left/top = (x±w/2, y±h/2) * 100%`
GuidancePanel
   ↓ shows step title/instruction (localized), status text, Explain, and (dev-only) Simulate
   ↓  Correct/Incorrect/Uncertain buttons
useProcedureSession.actions.simulate(status)
   ↓ POSTs { workflowId, sessionId, stepId, status, confidence, errorCode, perception } to
   ↓  mlService.mock() (or .verify() when mock=false)
Backend applies it to the session's deterministic step machine, returns { nextStep, workflowComplete }
   ↓
useProcedureSession updates local state: CORRECT → advance step / complete;
   INCORRECT/UNCERTAIN → stay on step, show Retry
```

This is the exact same code path for all six phases — nothing in `useProcedureSession.js`,
`ARAnchor.jsx`, or `GuidancePanel.jsx` branches on `workflowId`. Per-workflow differences (device
variants, step count, instruction text) all come from the backend's generic workflow config.

## 6. Mock ML interface (and how the real one plugs in)

`services/perception/mockPerceptionService.js` implements exactly two methods:

```js
start(onFrame)   // begin emitting perception frames
stop()           // stop emitting
```

A real perception service (TensorFlow.js, MediaPipe, a WASM/ONNX model, or a WebSocket to a
server-side model) only needs to implement this same interface and emit the same frame shape
(`{ object, x, y, width, height, landmarks, timestamp }`) — normalized 0-1, resolution-independent.
Swap the `new MockPerceptionService(...)` call in `useProcedureSession.js` for
`new RealPerceptionService(...)` and nothing else in the AR page, anchor, or panel changes.

The **verdict** (correct/incorrect/uncertain) currently comes from the dev-only Simulate buttons
in `GuidancePanel`, which call `mlService.mock()`. A real model would instead call
`mlService.verify()` with its own computed `status`/`confidence`/`errorCode` on some cadence (e.g.
every N frames, or once per user-triggered check) — the backend contract, session-state handling,
and UI response are already identical between `.mock()` and `.verify()`.

## 7. Backend API dependencies

```
GET  /api/workflows                      catalog for the 6-phase grid
GET  /api/workflows/:id?device=          resolved workflow + steps (device only for variants)
POST /api/sessions                       start a guided session
GET  /api/sessions                       recent-activity feed
PUT  /api/sessions/:id                   mark abandoned on exit
POST /api/sessions/:id/steps             (available if a step needs manual, non-ML confirmation)
POST /api/sessions/:id/complete
POST /api/ml/mock                        dev/demo verification (used today)
POST /api/ml/verification                real verification (same shape, ready when ML lands)
POST /api/ai/explain                     step coaching text
GET  /api/medications/today              dashboard reminders
POST /api/medications/:id/log            mark taken/skipped
GET  /api/medications  (+/history)       stat tile + recent activity
POST /api/reports  (+GET)                Medical Records page
GET  /api/auth/me, /login, /register     unchanged
GET/PUT /api/users/profile, /medical-info
```

## 8. Remaining limitations

- The "Explain" button's coaching text and the mock ML verdicts both depend on the backend being
  reachable; `MedicationToday`/`RecentActivity`/the Navbar due-badge degrade to an empty state
  rather than crashing if it isn't, but there's no offline/retry queue.
- `MockPerceptionService`'s drift pattern is a fixed Lissajous curve, not real object tracking —
  it's a visual proof that anchoring is data-driven, not a simulation of actual detection
  accuracy or failure modes a real model would have.
- Guided sessions require login (the backend's `/sessions` and `/ml/*` routes are auth-gated);
  unauthenticated users who reach the workflow detail panel are redirected to `/login` on Start
  rather than getting a guest quick-start, since v1's guest path (`detect()` with a random
  marker-hint severity) no longer has a backend equivalent to preserve.
- Phase 5 (medication delivery) and Phase 6 (home procedures) group multiple backend workflow IDs
  under one phase card; only Phase 1 (inhaler) is tier `available` and Phase 2 (BP) is `beta`
  today — the rest render full detail/step content from the backend but with Start disabled, per
  the instruction not to pretend ML is implemented for all six.
- No automated component/e2e tests were added — verification was manual: a production `vite build`,
  and a live Vite dev-server fetch of every changed and legacy file to confirm none error on
  transform (see below).
