# NovaCare — Frontend (v2.0)

**Medical delivery + procedure guidance + markerless AR assistance.** Same app shell as v1
(login, dashboard, profile, records, care workflows, AR launch) evolved for the new product
direction — see `MIGRATION.md` for the full before/after.

## Stack

- Vite + React 18, React Router v6, TailwindCSS v3, Lucide React icons, Framer Motion, Spline
- Pure `fetch` for API calls (no axios)
- No new AR library — the markerless AR experience uses the browser's native `getUserMedia`
  camera feed with data-driven overlay positioning (`components/ar/ARAnchor.jsx`). The legacy
  AR.js/A-Frame marker stack is retained but isolated (see `MIGRATION.md` §4).

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173. The app talks to `http://localhost:5000/api` by default — override
via `.env.local`:

```
VITE_API_BASE=https://your-backend-tunnel.trycloudflare.com/api
```

Requires the NovaCare backend v2.0 running (see `../backend/README.md`).

## Folder structure (what's new)

```
src/
  data/careWorkflowsMeta.js      # six-phase config: icons, availability tiers, subject labels
  i18n/translations.js           # UI chrome strings (en/hi/kn) — workflow content is per-step
  context/LanguageContext.jsx    # active language + t() helper
  context/WorkflowContext.jsx    # workflow catalog + selected/resolved workflow (rewritten)
  hooks/useProcedureSession.js   # generic AR workflow state machine (all 6 phases)
  services/
    workflowService.js           # GET /workflows, GET /workflows/:id
    sessionService.js            # POST/GET /sessions, /sessions/:id/steps, /complete
    mlService.js                 # POST /ml/verification, /ml/mock
    medicationService.js         # /medications CRUD, /today, /history, /:id/log
    aiService.js                 # POST /ai/explain, /ai/summary (rewritten contract)
    reportService.js             # /reports (renamed from workflowService.uploadReport)
    perception/mockPerceptionService.js  # swap point for a real ML perception model
  components/
    ar/ARAnchor.jsx              # markerless AR overlay, positioned from normalized coords
    ar/CameraFeed.jsx            # plain getUserMedia camera surface
    ar/GuidancePanel.jsx         # instruction/status/simulate panel
    care/PhaseCard.jsx           # six-phase grid card
    care/WorkflowDetailPanel.jsx # purpose / steps / duration / medical boundary / Start
    dashboard/MedicationToday.jsx, UpNextCard.jsx, RecentActivity.jsx
    common/LanguageSwitcher.jsx, SafetyDisclaimer.jsx
```

See `MIGRATION.md` for the complete list of what changed, what's legacy, and how a real ML model
plugs in.
