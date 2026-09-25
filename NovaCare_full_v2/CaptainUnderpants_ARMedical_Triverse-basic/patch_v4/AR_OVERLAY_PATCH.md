# AR overlay guidance patch — what changed and why

## The problem
The AR anchor (box/circle tracking indicator) only ever showed an **object or
body-part name** ("posture", "eye drop bottle", "hand") in its label pill —
never an instruction. The actual "what to do" text only lived in the bottom
GuidancePanel card, so the camera view itself gave no actionable cue, and
when nothing was detected yet, the anchor still rendered a solid-looking box
at a fallback center point, which reads as false tracking.

## What changed (6 files, all additive/surgical — nothing structural moved)

1. **`src/utils/actionPhrase.js`** (new) — one shared helper,
   `shortActionPhrase(title)`, that turns a full step title ("Position
   mouthpiece", "Create a complete seal") into a 2–3 word imperative phrase
   sized for an on-camera label. Used by both perception services so their
   overlays speak with one voice.

2. **`RealPerceptionService.js`** — now takes a `stepTitle` in its
   constructor and stamps `instruction: shortActionPhrase(stepTitle)` plus a
   new `tracked: boolean` field onto **every** emitted frame (all 5 emit
   sites: model-load-failure, manual-step passthrough, nothing-detected,
   normal tick, and the catch-block fallback). `tracked` is `false` exactly
   when there's genuinely nothing to show (no landmarks this frame, model
   still loading, or a detection error) — previously all of those still drew
   a normal-looking box.

3. **`AnchoredGuideService.js`** (Level C anchored-but-unverified workflows:
   insulin, ORS) — same `instruction`/`tracked` fields added, and it now
   uses the shared `shortActionPhrase` helper too instead of the old
   "just take the first word" logic, so labels read as real phrases
   ("Confirm dose" instead of "Confirm").

4. **`ARAnchor.jsx`** — the actual visual fix:
   - New `instruction` prop is now the label shown, in **both** shapes —
     previously only the Level C "circle" shape got an action word; the
     Level B "box" shape (the more polished, real-CV workflows) was showing
     the least useful label. Both now show the same kind of short
     instruction.
   - New `tracked` prop: when `false`, renders a distinctly different
     dashed, pulsing "searching" ring with a "Move into view" hint instead
     of a solid, confident-looking box — so a not-yet-tracking frame can
     never be mistaken for a real detection.
   - New **guide-line + arrowhead**: when a step's rule already computes two
     landmarks — a target point and the user's current tracked position
     (e.g. eye + fingertip for eye drops, nose + fingertip for nasal spray,
     mask + fingertip for nebulizer) — instead of just drawing a bounding
     box around both, an explicit dashed line with an arrowhead now points
     from the current position to the target. This is the main "what to do"
     upgrade: a directional cue, not just a passive box.
   - Both shapes now pulse while `guiding`/`detecting`, drawing the eye to
     the anchor at the moment it matters most.

5. **`ARExperience.jsx`** — passes the two new fields (`anchor.instruction`,
   `anchor.tracked`) through to `<ARAnchor />`.

6. **`useProcedureSession.js`** — both places that construct a perception
   service (`RealPerceptionService`, `AnchoredGuideService`) now look up and
   pass the current step's `title` so the shared instruction helper has
   something to work with.

## What did NOT change
No backend files. No workflow data (`data/workflows.json`). No routing. No
Phase 1 (inhaler) code — `MockPerceptionService.js` is untouched, and
`ARAnchor`'s new props all default safely (`tracked = true`,
`instruction` falls back to the old `label`/`target`), so inhaler's existing
overlay renders exactly as before until the real inhaler ML is wired in.

## Where your friend's inhaler model plugs in
Nothing in this patch touches inhaler. When the `.pkl` + `src/temporal/frame_step_detector.py`
arrive, the integration point is still exactly what it was: a new perception
service (e.g. `InhalerFrameModelService.js`, or a small local Python/Flask
inference server the frontend calls) that implements the same
`start(onFrame) / stop()` interface and emits the same frame shape
(`{ object, x, y, width, height, landmarks, instruction, tracked, rule }`) —
then `useProcedureSession.js` picks it for `inhaler_technique` the same way
it already picks `RealPerceptionService` for BP/eye-drops/nasal-spray. Once
that's wired, inhaler automatically gets this same overlay upgrade for free
(instruction label + tracked/searching state + guide line), no ARAnchor
changes needed.

If the model is a **frame classifier** (as your ChatGPT context describes —
20×1024 feature vectors → 8-class softmax) rather than a landmark/geometry
model, note the frame shape is slightly different: you'll want the service
to emit `x/y/width/height` as a best-effort box (e.g. from a hand or object
detector run alongside the classifier, or a fixed "look at your inhaler"
center box) since the classifier itself doesn't produce spatial coordinates
— only `rule.status`/`confidence`/`errorCode` come from the model directly.
