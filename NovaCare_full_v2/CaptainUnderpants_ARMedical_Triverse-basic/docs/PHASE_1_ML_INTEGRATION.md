# Phase 1 (Inhaler) — Frame Classifier Integration

Phase 1 was previously owned by a separate ML/AR workstream and not touched by the Phases 2-6
work (see `docs/RESEARCH.md`, `docs/PHASES_2-6_IMPLEMENTATION.md`). This document covers the
integration of that workstream's trained model: what it is, what it can and can't actually do,
and where the honesty boundary is drawn — in the same style as the rest of these docs, because a
model is not exempt from the "no fake medical claims" rule just because it's a model.

---

## What this is NOT

- **Not clinically validated.** Nothing here has been reviewed against real patient outcomes.
- **Not a technique-correctness detector.** The model was never shown an example of *incorrect*
  technique — every labeled training example is tagged `"status": "correct"`. It cannot detect
  bad form within a step. It only recognizes **which of 8 steps is currently happening**, and the
  app derives correct/incorrect purely by comparing that against the step the session expects
  next — sequencing, not technique quality. See "What the model actually does" below.
- **Not a CNN, not a learned embedding.** Despite an earlier internal description suggesting a
  frozen pretrained feature extractor, the model's input is **raw 32×32 grayscale pixels**,
  flattened. That's a meaningfully weaker/more brittle signal than an embedding — see
  "Sensitivity" below.

## Dataset

There is no public, labeled pMDI-technique video dataset (confirmed against the ML project's own
`data/DATASET_STATUS.md`: public sources are limited to reference/educational technique videos
and one non-redistributable published smartphone-video study, neither usable for direct training).
So the entire dataset is:

- **One self-recorded reference video** (`pmdi_reference.mp4`), ~174 seconds, demonstrating
  correct `pmdi_without_spacer` (metered-dose inhaler, no spacer) technique — one person, one
  take, one session, one lighting/background/camera setup.
- Cut into 174 back-to-back, non-overlapping 20-frame windows (~0.8s each at the source's native
  25fps).
- **Only 32 of those 174 windows carry a label** — the rest are unlabeled transition footage. All
  32 labels are `status: "correct"`; there are zero incorrect-technique examples anywhere in the
  data.

**n = 32, one person, one session.** State this next to every accuracy number below, not as a
footnote — with 32 samples across 8 classes and a 20,480-dimensional raw-pixel input, a
`LogisticRegression` fit on this is close to memorizing its own training set. Both accuracy
figures below are weak evidence of real-world generalization, and the badge in the app
("Experimental — single-demonstration frame classifier (n=32, one person, one session)")
deliberately doesn't read as equal-confidence to the rule-engine-verified phases (BP, eye drops,
nasal spray), which are transparent, hand-written, and independently inspectable rather than a
black-box fit on 32 examples.

## What the model actually does

An sklearn `Pipeline` (`StandardScaler` → `LogisticRegression`), 8-class:
`remove_cap`, `shake_inhaler`, `exhale_away`, `position_mouthpiece`, `begin_slow_inhalation`,
`actuate_during_inhalation`, `continue_inhalation`, `breath_hold`.

Per-frame preprocessing (`ml-service/frame_features.py`, refactored from the ML project's
`src/temporal/frame_step_detector.py` — same steps, same order, decoupled from disk I/O so live
camera frames can be fed in directly):

```
frame (BGR)  ->  cv2.cvtColor(BGR2GRAY)  ->  cv2.resize((32, 32))  ->  /255.0  ->  flatten (1024,)
```

20 frames' worth get concatenated into one `(1, 20480)` row and fed to `model.predict()` /
`model.predict_proba()` — **one prediction per 20-frame window, not per frame.**

**Reported accuracy: 75% (single validation split) and 84.38%, 27/32 (leave-one-out
cross-validation)** — both against the same n=32. Quote both, always with n=32 alongside.

**Known weak spot: step transitions.** Verified directly against the reference data during
integration — of 8 spot-checked labeled windows (one per class), 7 matched exactly and the one
miss was `actuate_during_inhalation` misclassified as the immediately-preceding
`begin_slow_inhalation`, on a window whose original label already had the lowest step-overlap
margin of its class (0.36s of a 0.8s window, vs 0.7-0.76s for cleaner examples). This corroborates
the friend's own flagged weak spot: windows straddling a step boundary are the most likely to
misclassify, and to a *neighboring* step specifically, not a random one.

## Sensitivity — raw pixels, not an embedding

Because the feature is a direct 32×32 grayscale downsample rather than a learned embedding, this
pipeline is more sensitive to **lighting, framing, background, and camera angle** than a
CNN-embedding-based approach would be. It was trained under one specific setup; a materially
different environment at inference time is a real, disclosed risk, not a hypothetical one.

## Sequencing-only verification, and where manual confirm kicks in

The app added a new `pmdi_no_spacer` device variant (`backend/data/workflows.json`) whose 8 middle
steps map 1:1 onto the model's 8 classes — none of the existing `mdi`/`dpi`/`soft_mist` variants
matched the model's vocabulary (e.g. `mdi` collapses "remove cap" and "shake" into one step and
has no per-phase inhalation breakdown), so forcing the model's classes onto them would have meant
an arbitrary many-to-few mapping. `identify_device` (before) and `finish` (after) flank those 8
steps but have **no matching model class** — they're `MANUAL_OVERRIDE_STEPS`-listed
(`frontend/src/services/perception/ruleEngine.js`), routed to an explicit "confirm manually"
button, exactly like the two ML-can't-verify-this steps in eye drops/nasal spray. Never silently
scored as correct or incorrect against a step the model was never trained to recognize.

## Live-testing status: 0 of 8 classes confirmed — all manual

All 8 of the model's classes are now `MANUAL_OVERRIDE_STEPS` entries. This section originally
claimed `remove_cap` as "1 of 8, live-confirmed working" — that claim has since been directly
contradicted by evidence and is corrected below, not softened.

What happened, in order:
- `shake_inhaler` — live testing showed it never settling on "correct"; shaking is a motion gesture
  and this model has no motion features (no optical flow, no frame differencing — just 20 raw-pixel
  frames concatenated). Manual-overridden.
- `exhale_away` — live testing showed it settling confidently (~90-98%) on the wrong class
  (`remove_cap`). It had passed its own training data perfectly. Manual-overridden.
- An attempt was made to *predict* which of the remaining classes were at risk, using cosine
  similarity between class centroids in the raw-pixel feature space, plus re-running the deployed
  model against its own 32 training windows as a "self-test." That analysis correctly flagged
  `actuate_during_inhalation` (which misclassifies one of its own training images at 99.7%
  confidence) but rated `begin_slow_inhalation`, `continue_inhalation`, `breath_hold`, and
  `position_mouthpiece` as comparatively low-risk, based on decisive self-test margins.
- `position_mouthpiece` — live testing then showed it settling confidently (~97%) on `remove_cap`
  — the exact same failure signature as `exhale_away` — **despite having passed its self-test
  cleanly.** This falsified the self-test-as-predictor approach: testing the model against the
  exact images it was fit on (same recording, same lighting, same camera, same session) tests
  memorization, not generalization to a new capture session, which is the only thing that matters
  for a live user. 20,480 features fit to 32 samples has essentially no pressure to generalize.
  `begin_slow_inhalation`, `actuate_during_inhalation`, `continue_inhalation`, `breath_hold` were
  manual-overridden at this point too, untested, on the same "no remaining basis to trust them"
  reasoning — three-for-three live failures on every tested non-`remove_cap` class, and the one
  predictive shortcut available had just been shown not to work.
- `remove_cap` — with server-side diagnostic logging added (`console.log` in
  `mlController.js`'s `inhalerPredict`), live testing with **no inhaler in the frame at all**
  produced three consecutive raw predictions of `remove_cap` at 73-87% confidence, which settled
  and returned `status: correct`. The verdict-comparison logic worked exactly as designed
  (`smoothedLabel === expectedStepId`) — the actual defect is that this model has no
  "nothing/background" class. Trained on 8 forced-choice classes, it has no way to say "I don't
  see the object" — every input, including an empty scene, gets forced into whichever of the 8
  training classes it resembles most, and an empty background apparently sits close enough to the
  `remove_cap` training images to win with high confidence. This also retroactively undermines
  `remove_cap`'s only prior positive evidence (the session progressing past it without a reported
  failure): that may have been this exact same failure mode the entire time, not genuine
  cap-removal recognition, and there is no way to distinguish the two after the fact. Manual
  confirm, no exceptions remaining.

A class is promoted back to auto-verified only after someone has actually watched it work on a
live camera in a real session, using footage that actually shows the target object/gesture (not an
empty frame) — never again from training-data similarity or self-test accuracy alone.

**This needs the right device selected, and that's enforced, not just documented.** Early testing
caught a real bug here: `perceptionLevelFor`/the frontend's perception-service selection were
keyed only by *workflow* id, so `inhaler_technique` unconditionally routed through the frame
classifier regardless of which device variant the session actually used — meaning selecting `mdi`
(whose steps don't match the model's 8 classes at all) still ran the classifier, which could then
never settle "correct" and looked exactly like "not detecting." Fixed by making
`perceptionLevelFor(workflowId, device)` / `perceptionBadge(workflowId, device)`
(`frontend/src/data/careWorkflowsMeta.js`) explicitly device-aware — only
`device === INHALER_ML_DEVICE` ('pmdi_no_spacer') resolves to `'real'`; every other inhaler device
variant falls back to the pre-existing mock/demo behavior, unchanged from before this model
existed. `pmdi_no_spacer` was also made the first (default-selected) entry in `deviceTypes` so a
patient starting the workflow gets the real model by default rather than needing to know to pick
it.

Verdict derivation (`backend/controllers/mlController.js`, `inhalerPredict`):

```
predicted step === session's expected current step  ->  correct
predicted step === a different known step (wrong order)  ->  incorrect
confidence below threshold, or not yet settled          ->  uncertain
```

## Live capture is a disclosed distribution shift from training

Training windows are **non-overlapping** — frame 0-19, then 20-39, etc. Live capture uses a
**sliding** window instead (most recent 20 captured frames, re-predicted roughly every 250ms) so
the UI feels responsive rather than waiting for a fresh non-overlapping block. This is strictly
better for UX but is itself a distribution shift from what the model was validated against — every
overlapping-window prediction sees frames the model has already "used" in a recent prediction,
which the training data never did. Disclosed here rather than hidden; it's one more reason the
25%/15.6% error rates shouldn't be treated as a live-conditions guarantee.

Live frames are captured at ~25fps (matching the training video's stated fps, confirmed directly
against `sequence_labels.json`'s `"fps": 25.0` field and the exact frame-boundary timestamps —
not estimated).

## Temporal smoothing

Mirrors `TemporalValidator`'s majority-of-window pattern in `ruleEngine.js`, just at the
model's own ~0.8s/window granularity instead of ~100ms/frame (`backend/services/
inhalerTemporalSmoothing.js`): a step transition only registers once **3 consecutive sliding-window
predictions agree** (≥75% agreement across the recent history). A single misclassified window —
concentrated around step transitions, per above — can't by itself advance or fail a step.

## Architecture

```
<video> (browser)
  -> InhalerFrameModelService.js   captures ~25fps, sends a 20-frame sliding window ~every 250ms
  -> POST /api/ml/inhaler/predict  [Node backend, auth + rate-limited like every other ML route]
       -> inhalerMlClient.js       forwards the 20 frames to the internal Python service
       -> ml-service/main.py       runs the EXACT friend's preprocessing + frame_baseline.pkl,
                                    returns {stepLabel, confidence, probabilities} — no verdict yet
       -> inhalerTemporalSmoothing.js   window-level majority smoothing (settled or not)
       -> compares settled label against session.currentStep -> {status, confidence, errorCode}
  -> frontend submits that through the SAME submitVerification -> POST /api/ml/verification
     path every other workflow uses — no parallel contract, no state-machine special-casing
```

`ml-service/` is a small internal-only FastAPI process (bound to `127.0.0.1`), never reachable
from the browser directly — see `ml-service/README.md` for setup/run. Considered running the
model client-side instead (it's a small `LogisticRegression`, trivially portable to a JS matrix
multiply) and rejected it: `cv2.resize`'s exact bilinear implementation isn't guaranteed to match a
`<canvas>` downscale pixel-for-pixel, and this is already the most sample-starved model in the app
— not the one to add even a small extra preprocessing drift to. A Python service running the
friend's own `cv2` call is the only way to guarantee zero drift from training.

## Trained-artifact provenance

`ml-service/model/frame_baseline.pkl` and `frame_baseline_metadata.json` are copies of the
friend's trained artifacts (`cacheus-ml/cacheus-ml/data/processed/inhaler/frame_models/`) — this
service doesn't train anything, it only serves inference. `frame_step_detector.py` in the ML
project itself is untouched; `ml-service/frame_features.py` is a separate, decoupled copy of its
preprocessing so the friend's existing scripts/tests keep working unmodified.
