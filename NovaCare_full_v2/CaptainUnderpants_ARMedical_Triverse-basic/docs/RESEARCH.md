# NovaCare Phases 2–6 — Dataset Research & Implementation Level

Phase 1 (inhaler technique) was built separately as the primary ML+AR workflow and is **not
covered here** — see `docs/PHASE_1_ML_INTEGRATION.md` for its own dataset/accuracy/limitation
disclosure (a trained frame classifier, not a rule engine, so its honesty framing differs from
everything below). This document covers the research and decisions behind Phases 2–6, done before
any code was written, per the brief.

## How to read the levels

- **Level A — Real ML**: a labeled dataset exists that actually matches our task (technique
  correctness), so training/fine-tuning a small model is justified.
- **Level B — Pretrained CV + rule engine**: no technique-specific dataset exists, but a
  well-documented pretrained perception model (pose/hand/face landmarks) can supply real
  geometric signals, which a transparent rule engine turns into correct/incorrect/uncertain.
- **Level C — Workflow simulation (demo/prototype)**: neither a suitable dataset nor a reliable
  pretrained detector exists for the object/action in question. The step is still fully
  functional as a *workflow* (instructions, AR anchor, session tracking), but verification is
  either manual (the user confirms) or a clearly labeled mock/demo simulation — never presented
  as ML.

## Summary table

| Phase | Task | Dataset found? | Dataset source | ML approach | Rule-based approach | Difficulty | Demo ready? |
|---|---|---|---|---|---|---|---|
| 2 | BP measurement — posture/technique | Generic pose datasets only (no BP-specific technique labels) | MPII Human Pose, PoseTrack, Human3.6M (used only indirectly — they're what BlazePose/MediaPipe Pose was validated against, not something we train on) | None needed — use pretrained MediaPipe Pose Landmarker (33 keypoints) | **Level B**: seated posture, arm-at-heart-height, stillness, via joint-angle + temporal rules | Low–Medium | **Yes** |
| 3 | Insulin injection technique | No dataset found for consumer insulin-pen/technique | Egocentric hand-object datasets exist (100DOH, EPIC-KITCHENS VISOR, HOT3D) but label kitchen/generic objects or *surgical* tools, not insulin pens/needles | None justified | Generic hand presence/steadiness only (MediaPipe Hands) — device-specific steps can't be verified | High (device recognition, safety-critical) | **Level C** (demo) |
| 4 | Glucose measurement | No dataset found for glucometer technique | PhysioNet/MIMIC host physiological *signal* datasets (CGM traces, vitals) — not RGB video of the measurement procedure, so not applicable here | None justified | Generic hand presence/steadiness only | Medium | **Level C** (demo) |
| 5a | Eye drops | No technique-specific dataset | MediaPipe Face Landmarker (478 pts + head-pose transform matrix) and Hand Landmarker (21 pts) are pretrained, well-documented, Apache-2.0-licensed | None needed | **Level B**: head-tilt-back via face pose pitch, hand-near-eye proximity, temporal hold | Medium | **Yes** |
| 5b | Nasal spray | No technique-specific dataset | Same as above | None needed | **Level B**: head position (near-neutral pitch), hand-near-nose proximity, temporal hold | Medium | **Yes** |
| 5c | Nebulizer | No dataset for mask-seal/device assembly | No suitable pretrained detector for nebulizer parts or mask-seal quality | None justified | Generic face+device presence only, can't verify seal | High | **Level C** (demo) |
| 6a | Minor wound dressing | Datasets exist (AZH, Medetec, FUSeg, DFUC) **but for wound-type/severity classification**, i.e. diagnosis — explicitly out of scope and the opposite of what we want | AZH Wound & Vascular Center dataset, Medetec Wound Dataset, FUSeg Challenge | **Not usable for this task** — see note below | Generic hand/object presence only | Medium–High | **Level C** (demo) |
| 6b | ORS preparation | No suitable dataset exists or is needed — task is a checklist, not a vision problem | — | None | Deterministic checklist (no camera measurement of "how much water") | Low | **Yes**, non-ML |

## Why the wound datasets are explicitly *not* used

AZH/Medetec/FUSeg/DFUC are real, well-documented, and genuinely public — but every one of them
exists to **classify or segment wound type and severity** (diabetic vs. pressure vs. venous ulcer,
etc.), which is diagnostic content. The brief explicitly rules out "infection detection, wound
severity prediction, disease classification" for this phase. Using these datasets — even
indirectly — would mean building exactly the diagnostic system we're told not to build. So for
Phase 6a we explicitly say: **no suitable public dataset found for direct technique
verification**, and fall back to Level C.

## Per-phase detail

### Phase 2 — Blood Pressure Measurement (Level B — real, ships today)

**What's genuinely implementable:** posture and positioning, which is what actually affects
measurement accuracy and is what the step list asks NovaCare to check — not the BP value itself.

**Dataset supports:** nothing dataset-specific is trained; MediaPipe's Pose Landmarker (BlazePose,
MobileNetV2-based) is a pretrained, production-grade model validated against public
2D/3D pose benchmarks (COCO, MPII-style keypoint conventions). We use it purely for **inference**.

**Dataset does NOT support:** cuff detection, arm-cuff relative position, or anything about the
actual BP reading. There's no public dataset for BP-cuff object detection, so cuff placement and
the "start/complete measurement" steps use posture-stillness as a defensible procedural proxy, not
literal cuff detection — this is stated in-app.

**Rules implemented:** torso verticality (shoulder-hip alignment) for seated posture, wrist-height
relative to shoulder for "arm at heart level," and a rolling-variance stillness check across ~1s of
frames for "remain still."

**Training necessary?** No — explicitly not justified; no technique-labeled data exists to train
against, and the pretrained landmarker is already accurate for the geometry we need.

### Phase 3 — Insulin Injection Technique (Level C — demo/prototype)

**What's genuinely implementable:** none of the safety-critical steps (needle attachment, priming,
dose confirmation, injection, disposal) can be verified without a device-specific object detector,
and no such detector or dataset exists publicly for insulin pens/needles. Egocentric hand-object
datasets (100 Days of Hands, EPIC-KITCHENS VISOR, HOT3D) label everyday kitchen objects or, in the
surgical-tool case (EgoSurgery-HTS), OR instruments — neither transfers to a consumer insulin pen.

**Decision:** Phase 3 stays a fully functional *workflow* (steps, instructions, AR anchor, session
tracking) with **manual/demo verification only**, clearly labeled. This is also the most
safety-sensitive phase — a false "correct" on injection technique is the worst possible failure
mode for a hackathon prototype, so defaulting to honest demo-mode here is a deliberate safety
choice, not just a data-availability one.

### Phase 4 — Glucose Measurement (Level C — demo/prototype)

**What's genuinely implementable:** hand presence during the finger-prick and strip-application
steps, using generic MediaPipe Hands — but not glucometer/strip detection, which has no dataset.

**Important distinction preserved:** PhysioNet/MIMIC-type sources host *numeric* glucose
signal/CGM datasets, not procedure video — they answer "what was the glucose value," which is a
completely different problem from "did the user perform the measurement correctly," and NovaCare
only ever wants the latter. No numeric-glucose dataset is used anywhere, and no interpretation of
a glucose value is implemented.

**Decision:** demo/prototype, same reasoning as Phase 3 minus the safety severity.

### Phase 5 — Medication Delivery (mixed: eye drops & nasal spray = Level B, nebulizer = Level C)

Built as one generic engine (see Implementation section) rather than three separate systems, per
the brief.

**Eye drops & nasal spray — genuinely implementable:** MediaPipe Face Landmarker exposes a
head-pose transformation matrix (pitch/yaw/roll) directly, and Hand Landmarker gives fingertip
position — both pretrained, well-documented, Apache-2.0. Head-tilt-back (eye drops) and
near-neutral head position (nasal spray) are legitimate pitch-angle checks; hand-near-eye /
hand-near-nose proximity is a legitimate 2D-distance check between landmark sets. Both get real
Level B verification.

**What Level B does NOT cover, even for these two:** "pull down the lower eyelid" and "correct
spray angle into the nostril" are too fine-grained for generic landmarks — no blendshape or
landmark reliably distinguishes "eyelid pulled down by a finger" from "finger near the eye." Those
specific steps are marked `verificationMode: manual` rather than falsely claimed as ML-verified.

**Nebulizer — not implementable at Level B:** no pretrained detector distinguishes an assembled
vs. unassembled nebulizer, or judges mask-seal quality. Level C (demo).

### Phase 6 — Low-Risk Home Procedures

**Wound dressing:** Level C, per the dataset-mismatch explanation above.

**ORS preparation:** intentionally **not a CV problem**. The brief itself says to keep this
instructional rather than pretend the camera can measure exact water quantity — implemented as a
deterministic, non-ML checklist workflow (same session/state-machine architecture, verification
mode `manual` throughout). This is the one phase where "no ML" is the *correct* engineering
decision, not a limitation.

## Confidence — how it's computed (Level B phases only)

Never a fabricated "95% medically accurate" number. For Level B steps:

```
confidence = (landmarkDetectionConfidence * 0.4)
           + (geometricConditionScore     * 0.35)
           + (temporalStabilityScore      * 0.25)
```

This is logged and surfaced internally as **rule confidence**, and the UI badge for every Level B
step reads "ML-assisted verification (rule-based)" — never "AI-verified" or similar. Level C steps
carry a "Demo / Prototype" badge and never report a confidence number that looks clinical.

## Temporal validation

No single frame is treated as proof. Every Level B rule requires the geometric condition to hold
for a minimum consecutive-frame window (~1 second at the perception loop's ~10 fps, i.e. ≥7
consecutive passing frames) before a step is marked `correct` — implemented in
`frontend/src/services/perception/ruleEngine.js`.

## What can be upgraded later

Every phase currently at Level C follows the exact same session/state-machine/ML-contract
architecture as Level B and Phase 1. Upgrading any of them later only means: (1) find or collect a
real labeled dataset for that device/action, (2) train or fine-tune a small classifier or
detector, (3) drop its inference into a `RealPerceptionService`-shaped adapter that emits the same
`{status, confidence, errorCode, perception}` contract. Nothing else in the frontend, backend, or
session engine needs to change — that's the entire point of the shared contract.
