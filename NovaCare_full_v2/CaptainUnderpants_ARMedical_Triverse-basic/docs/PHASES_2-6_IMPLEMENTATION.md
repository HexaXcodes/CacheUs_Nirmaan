# Phases 2–6 — Implementation Summary

See `docs/RESEARCH.md` for the full dataset research, the Level A/B/C framework, and the
per-phase reasoning. This document is the final deliverable: what was built, where, and how to
run/demo it.

## 1. Files created

```
docs/RESEARCH.md                                      dataset research + level decisions
docs/PHASES_2-6_IMPLEMENTATION.md                      this file

frontend/src/services/perception/landmarkTasks.js      pretrained MediaPipe Pose/Face/Hand loader
frontend/src/services/perception/ruleEngine.js          geometric/temporal rules + TemporalValidator;
                                                         rules for bp_measurement, eye_drops,
                                                         nasal_spray, glucose_measurement, nebulizer,
                                                         wound_dressing; isManualStep(workflowId, stepId)
                                                         (namespaced — step ids like "finish" or
                                                         "complete_measurement" repeat across workflows
                                                         with different verifiability)
frontend/src/services/perception/RealPerceptionService.js  Level B perception service (real, not mock)

frontend/src/services/perception/AnchoredGuideService.js  Perception service for the remaining Level C
                                                         workflows (insulin, ORS) — no rule/verdict (no
                                                         dataset exists, see RESEARCH.md), but the AR box
                                                         is real: tracks the user's actual hand with the
                                                         same pretrained MediaPipe landmarkers, so the
                                                         guide sits on the body part doing the action
                                                         instead of drifting randomly. Verification is
                                                         still Simulate-button-only — this only makes the
                                                         *pointer*, not the verdict, real.
```

## 2. Files modified

```
frontend/package.json                       + @mediapipe/tasks-vision dependency
frontend/src/data/careWorkflowsMeta.js       + PERCEPTION_LEVEL map, BODY_ANCHOR map + bodyAnchorFor(),
                                              perceptionBadge(), updated AVAILABILITY (all phases now
                                              'available')
frontend/src/components/ar/CameraFeed.jsx    + onVideoReady callback (exposes <video> for real CV)
frontend/src/hooks/useProcedureSession.js    rewritten: real / anchored-mock / plain-mock perception
                                              branch (RealPerceptionService, AnchoredGuideService, or
                                              MockPerceptionService), auto-verify for real,
                                              manualStepAvailable, confirmManual action
frontend/src/pages/ARExperience.jsx          passes videoEl + perceptionLevel through to the panel;
                                              ARAnchor's on-camera label now prefers the live per-step
                                              title from the perception frame over the static subject
                                              name
frontend/src/components/ar/GuidancePanel.jsx + live "ML-assisted (rule-based)" / "Demo/Prototype" badge,
                                              branches controls: auto-hold hint (real) vs Simulate
                                              buttons (mock) vs manual-confirm button (real, no-rule step);
                                              panel padding tightened so it covers less of the camera —
                                              the AR anchor overlay is the primary "what to do where"
                                              guide, not this card
frontend/src/components/care/WorkflowDetailPanel.jsx  + same perception badge before Start
```

**Not modified:** the backend (`backend/`) required **zero changes**. The ML contract
(`POST /api/ml/verification` / `/api/ml/mock`) already accepted an arbitrary `perception` object
and didn't care which phase or which detector produced it — exactly the "no separate interfaces
per phase" requirement. Phase 1 (inhaler) code was not touched anywhere.

## 3. How each phase connects to the common workflow engine

Nothing new was added to the state machine, the session model, or the ML contract. Every phase —
Level A/B/C alike — flows through the exact same pipeline:

```
CameraFeed (raw video)
  → RealPerceptionService  OR  AnchoredGuideService  OR  MockPerceptionService
      (chosen per-workflow by PERCEPTION_LEVEL + BODY_ANCHOR in careWorkflowsMeta.js)
      RealPerceptionService:   pretrained MediaPipe landmarks → ruleEngine.js → {status, confidence, errorCode}
      AnchoredGuideService:    pretrained MediaPipe hand/face landmarks → real box position, rule: null
                               (no verdict — Simulate buttons still drive correctness)
      MockPerceptionService:   fully synthetic drift box (workflows with no camera dependency at all)
  → useProcedureSession (same hook, same STATES machine, for every workflow)
  → POST /api/ml/verification (real) or /api/ml/mock (demo/anchored)   [backend, unchanged]
  → ProcedureSession step machine (backend, unchanged) → nextStep / workflowComplete
  → GuidancePanel renders instruction + live status + perception badge
  → ARAnchor renders the box on the camera feed, labeled with the current step's title
```

The only per-workflow branching anywhere in the frontend is a lookup into small config maps
(`PERCEPTION_LEVEL`, `BODY_ANCHOR`, `SUBJECT_LABEL` in `careWorkflowsMeta.js`) and a `switch (stepId)`
inside `ruleEngine.js` for the workflows that have real rules. No workflow gets its own copy of the
session/state-machine/API-calling logic.

## 4. How a real ML model plugs in later (upgrade path)

For the remaining Level C workflows (insulin injection, ORS preparation):

1. Find or collect a real labeled dataset for the specific device/action (see `docs/RESEARCH.md`
   for what's missing per phase).
2. Train/fine-tune a small classifier or object detector against it.
3. Wrap its inference in a class implementing the same two-method interface as
   `RealPerceptionService`/`MockPerceptionService`: `start(onFrame)` / `stop()`, emitting the same
   frame shape (`{ object, x, y, width, height, landmarks, rule: {status, confidence, errorCode} }`).
4. Add the workflow id to `PERCEPTION_LEVEL` as `'real'` (or a new level if the new model needs a
   different loader), and flip its `AVAILABILITY` tier once it's actually reliable.

Nothing in `useProcedureSession.js`, `ARAnchor.jsx`, `GuidancePanel.jsx`, or the backend needs to
change — this was the entire point of keeping the perception layer behind one small interface.

For the two Level B phases already shipped (BP, eye drops/nasal spray), upgrading means replacing
the hand-written geometric rules in `ruleEngine.js` with a trained classifier over the same
landmark features, if/when a technique-labeled dataset for those specific procedures becomes
available — the landmark extraction (MediaPipe) and the temporal-validation wrapper stay as-is.

## 5. Which phases are genuinely functional vs. demonstration-only

| Phase | Status |
|---|---|
| 1 — Inhaler | **Experimental** — real trained frame classifier (n=32, one demonstration), sequencing-only verification; see `docs/PHASE_1_ML_INTEGRATION.md` |
| 2 — BP measurement | **Genuinely functional** — real pretrained pose landmarks + documented geometric/temporal rules, auto-verifying |
| 3 — Insulin injection | **Demonstration-only, deliberately** — not a data gap this time: RESEARCH.md frames a false "correct" on injection technique as the worst possible failure mode for this prototype, so it stays fully dev-simulated and labeled "Demo / Prototype" even though generic hand-presence rules (like glucose's) were technically available |
| 4 — Glucose measurement | **Partially functional** — real hand-presence/steadiness rules (obtain_sample, apply_sample, wait_reading, prepare_glucometer), auto-verifying; insert_strip, prepare_lancet, complete_measurement (sharps disposal), and log_result are explicit manual-confirm — no glucometer/strip detector exists |
| 5a — Eye drops | **Genuinely functional** for head-position and hand-near-eye steps; the one step that isn't reliably distinguishable from landmarks alone (eyelid pulling) is an explicit user-confirm step, not faked |
| 5b — Nasal spray | **Genuinely functional** for head-position and device-near-nose steps; same manual-confirm honesty for spray angle |
| 5c — Nebulizer | **Partially functional** — real face+hand-proximity rule for position_mask (is something held near the face) and presence checks for perform_session/finish, auto-verifying; assemble, add_medication, connect, and establish_seal (seal quality) are manual-confirm — no detector judges assembly or seal |
| 6a — Wound dressing | **Partially functional** — real hand-presence rule for wash_hands/finish, auto-verifying; clean_wound, apply_dressing, and secure_dressing are manual-confirm, deliberately, because the only public wound datasets are for diagnosis, which is out of scope |
| 6b — ORS preparation | Workflow defined and documented as intentionally non-ML (checklist) — the brief's own call that "no ML" is correct here, not a limitation; still uses the anchored-hand-tracking demo path (`AnchoredGuideService`), Simulate-button-verified like insulin |

"Genuinely/partially functional" here means: real pretrained models run against your actual camera
feed in the browser, real geometry is computed, and a real temporal-hold threshold gates the
"correct" result for at least some of the phase's steps — not that it's clinically validated, and
not that every step is covered. It is explicitly labeled "ML-assisted verification (rule-based)" in
the UI, never "AI-verified" or similar, and the honesty boundary is per-step: any step no generic
landmark set can judge (device assembly, seal quality, wound contact, sharps disposal, a number
read off a screen) is `isManualStep`-listed in `ruleEngine.js` and routed to an explicit
"confirm manually" button instead of a fabricated verdict — see `MANUAL_OVERRIDE_STEPS` there for
the full per-workflow list.

**The two fully-demo phases (insulin, ORS) still get a real camera overlay, just not a verified
one.** Both run `AnchoredGuideService`, which tracks the user's actual hand with the same pretrained
MediaPipe landmarkers as the real phases, and positions the AR circle + short action-word callout
there (e.g. "Apply") — so the guide visually points at the body part doing the action even though
nothing judges whether the action was done correctly. It never emits a rule/verdict, so auto-verify
never fires for it, and the Simulate buttons remain the only way a step is marked correct/incorrect
— the "Demo / Prototype" badge stays, because the *pointer* being real doesn't make the *technique
check* real.

## 6. Commands to run everything

```bash
# Backend (unchanged from v2.0)
cd backend
npm install
npm run dev            # http://localhost:5000

# Frontend
cd frontend
npm install             # pulls in @mediapipe/tasks-vision
npm run dev              # http://localhost:5173
```

Camera-based perception (Phases 2, 4, 5a, 5b, 5c, 6a) requires HTTPS or `localhost` and camera
permission — same requirement the app already had. The MediaPipe model files (a few MB each) load
from Google's public model CDN the first time any of these workflows is launched, then are cached
by the browser.

## 7. Recommended demo flow for the internal hackathon

1. **Open Care Workflows** (`/workflow`) — show all six phase cards, all tiered `Available` now
   that Phases 2-6 have shipped (real or demo verification either way — see the perception badge
   on each, never the tier badge alone, for which is which).
2. **Phase 1 (Inhaler)** — start it with the `pmdi_no_spacer` device (the ML-verified one), point
   out the "Experimental — single-demonstration frame classifier (n=32...)" badge — deliberately
   more cautious wording than Phase 2's badge, see `docs/PHASE_1_ML_INTEGRATION.md` for why. Walk
   through remove-cap, shake, exhale-away etc. and show it auto-advancing; then reach
   `identify_device` or `finish` and show the manual-confirm button (no matching model class for
   either).
3. **Phase 2 (BP measurement)** — start it, sit upright with a visible torso in frame. Show the
   live pose-landmark dots on the AR anchor, the "ML-assisted verification (rule-based)" badge,
   and the step auto-advancing after holding correct posture for ~1 second. Then deliberately
   slouch/move to show the incorrect/uncertain live feedback.
4. **Phase 5a or 5b (Eye drops / Nasal spray)** — tilt head back for eye drops (or keep it neutral
   for nasal spray), bring a hand near the eye/nose, and show the same live auto-verification.
   Then reach a step marked "Not camera-verifiable — confirm manually" and show the explicit
   confirm button, to demonstrate the honesty boundary rather than faking coverage.
5. **Phase 4, 5c, or 6a (Glucose / Nebulizer / Wound dressing)** — start one, show the
   "ML-assisted verification (rule-based)" badge and the real hand/face tracking auto-verifying the
   generic steps (hand visible for glucose/wound dressing, hand-near-face for the nebulizer mask).
   Then reach a step marked "Not camera-verifiable — confirm manually" (device assembly, seal
   quality, sharps disposal, wound contact) and show the explicit confirm button — same honesty
   boundary as Phase 5a/5b, just for a different reason (no object detector exists for these
   devices, not that the geometry is ambiguous).
6. **Phase 3 (Insulin)** — start it, point out the "Demo / Prototype" badge, and show the AR
   circle+callout still tracking your actual hand (real MediaPipe landmarks, `AnchoredGuideService`)
   even though nothing here auto-verifies. Explain *why*: RESEARCH.md frames this as a deliberate
   safety choice — a false "correct" on injection technique is the worst failure mode for this
   prototype — not a limitation like the other phases. Then use the three dev Simulate buttons to
   walk through Correct → next step, Incorrect → Retry, Uncertain → Retry.
7. **Close with `docs/RESEARCH.md`** on screen — the dataset table and the explicit
   "no suitable public dataset found" calls are the strongest evidence this is a legitimate
   prototype and not six faked medical AI models.
