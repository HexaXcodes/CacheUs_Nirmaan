// src/services/perception/ruleEngine.js
// ============================================================================
//  Level B verification: turns real MediaPipe landmarks into a
//  correct/incorrect/uncertain verdict via transparent, hand-written
//  geometric + temporal rules — never a trained classifier (see
//  docs/RESEARCH.md for why no technique-specific dataset exists for any of
//  these procedures).
//
//  Confidence (per docs/RESEARCH.md "Confidence — how it's computed"):
//    confidence = landmarkDetectionConfidence * 0.4
//               + geometricConditionScore     * 0.35
//               + temporalStabilityScore      * 0.25
//
//  Temporal validation: no single frame is proof. A condition must hold for
//  the clear majority (75%) of a ~1s rolling window (the perception loop
//  runs at ~10 fps, so a 7-frame window) before a step settles to
//  'correct' — likewise for 'incorrect'. A single missed/occluded frame
//  doesn't reset progress the way a strict unbroken streak would. Anything
//  short of that reports 'uncertain'/'guiding', and a step stuck there past
//  a stall timeout is surfaced as 'uncertain' with a Retry button rather
//  than left hanging forever (see RealPerceptionService's STALL_TIMEOUT_MS).
//
//  Steps this engine does NOT claim to verify (eyelid pull, spray angle) are
//  listed in MANUAL_OVERRIDE_STEPS and routed to a user-confirm button
//  instead of a fabricated verdict — see docs/RESEARCH.md §5.
// ============================================================================

export const HOLD_FRAMES = 7; // ~1s at the ~10fps perception loop

// Steps no generic landmark set can reliably verify — explicit manual
// confirmation, never presented as ML-verified. Namespaced by workflow
// since step ids like "complete_measurement" or "finish" repeat across
// workflows with different verifiability (e.g. BP's complete_measurement
// is a real posture-presence check, glucose's is a device-specific action
// no generic landmark can judge).
const MANUAL_OVERRIDE_STEPS = new Set([
  'bp_measurement:record_reading', // reading a number off the monitor — nothing to see
  // The inhaler frame classifier's 8 classes (see
  // docs/PHASE_1_ML_INTEGRATION.md) start at "remove cap" and end at
  // "breath hold" — device identification and the final wrap-up have no
  // matching model class, so they're never auto-verified, never faked.
  'inhaler_technique:identify_device',
  'inhaler_technique:finish',
  // Confidence-rejection attempt (mlController.js's LOW_CONFIDENCE_THRESHOLD,
  // 0.4 -> 0.9) tried and disproven by live re-test, not assumed: a second
  // empty-frame attempt settled remove_cap at 100.0% confidence with
  // runnerUp probability 0.0% — a full split, not a borderline case. No
  // threshold (max-probability OR margin) can reject that without also
  // rejecting every genuine correct prediction, which scores the same way.
  // The model isn't uncertain about this failure; it's maximally confident
  // and wrong, which a probability-based reject layer structurally cannot
  // catch. Back to manual confirm — see docs/PHASE_1_ML_INTEGRATION.md.
  'inhaler_technique:remove_cap',
  // Confirmed via live testing, not assumed: "shake" is a MOTION gesture,
  // and this model has no motion features at all (no optical flow / frame
  // differencing — just 20 raw-pixel frames concatenated). A held-still
  // inhaler shake looks close to a static hold, which the model repeatedly
  // confused with other static-pose classes. Rather than tune thresholds to
  // paper over a class the architecture genuinely can't distinguish, this
  // is honest: manual confirm, like the two steps above.
  'inhaler_technique:shake_inhaler',
  // Confirmed via live testing: settled confidently (~90-98%) on the wrong
  // class (remove_cap) instead of exhale_away. Passes its OWN training data
  // perfectly (see docs/PHASE_1_ML_INTEGRATION.md), so this isn't a boundary
  // call visible in training — exhale_away has only 4 training samples, the
  // thinnest class in the dataset, and its real decision boundary clearly
  // doesn't generalize to a different camera/framing.
  'inhaler_technique:exhale_away',
  // Confirmed via live testing: settled confidently (~97%) on the wrong
  // class (remove_cap) instead of position_mouthpiece — same signature as
  // exhale_away above (confident, non-adjacent, wrong). This step had
  // PASSED its own training-data self-test with a decisive margin, which
  // is the result that falsified self-test-on-training-data as a predictor
  // of live robustness for this model: 20,480 features fit to 32 samples
  // is closer to memorizing the exact recording (same lighting, same
  // camera, same session) than learning something that generalizes to a
  // new capture. Self-test evidence is no longer treated as sufficient to
  // call a class ML-verified — see the entries below.
  'inhaler_technique:position_mouthpiece',
  // Not yet individually live-tested. Originally manual-overridden on
  // self-test evidence alone (this model's own training image was
  // misclassified at 99.7% confidence — see git history), which was
  // reasonable at the time but has since been shown insufficient as
  // *positive* evidence either way (position_mouthpiece passed its
  // self-test cleanly and still failed live). Left here under the current
  // policy: no inhaler class is claimed ML-verified until it has actually
  // been watched succeeding on a live camera in a real session, not just
  // inferred from training-data behavior.
  'inhaler_technique:actuate_during_inhalation',
  // Never live-tested. Defaulting to manual under the same policy above —
  // three of the four classes tested live so far (shake_inhaler,
  // exhale_away, position_mouthpiece) have failed, so there is no basis
  // left to assume an untested class will behave differently. Promote back
  // to auto-verified only after someone has actually watched it work on
  // camera, not from a training-data similarity/self-test argument.
  'inhaler_technique:begin_slow_inhalation',
  'inhaler_technique:continue_inhalation',
  'inhaler_technique:breath_hold',
  'eye_drops:eyelid_position',
  'nasal_spray:spray_angle',
  'glucose_measurement:insert_strip',
  'glucose_measurement:prepare_lancet',
  'glucose_measurement:complete_measurement', // sharps disposal — safety-relevant, not hand-presence-verifiable
  'glucose_measurement:log_result',
  'nebulizer:assemble',
  'nebulizer:add_medication',
  'nebulizer:connect',
  'nebulizer:establish_seal', // seal quality — no detector distinguishes this (see docs/RESEARCH.md)
  'wound_dressing:clean_wound',
  'wound_dressing:apply_dressing',
  'wound_dressing:secure_dressing'
]);

export const isManualStep = (workflowId, stepId) => MANUAL_OVERRIDE_STEPS.has(`${workflowId}:${stepId}`);

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------
const dist2D = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const midpoint = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

// Angle (degrees) between the vector a->b and the vertical (y) axis. 0 =
// perfectly vertical/upright, 90 = horizontal.
const angleFromVertical = (a, b) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const rad = Math.atan2(Math.abs(dx), Math.abs(dy) || 1e-6);
  return (rad * 180) / Math.PI;
};

const clamp01 = (n) => Math.min(1, Math.max(0, n));

// Score that decays linearly from 1 (at target) to 0 (at target ± tolerance).
const scoreAgainstTarget = (value, target, tolerance) =>
  clamp01(1 - Math.abs(value - target) / tolerance);

// ---------------------------------------------------------------------------
// Temporal validator — one instance per active step.
//
// Majority-of-window, not strict-unbroken-streak: a landmarker missing one
// frame (motion blur, brief occlusion, a hand at a bad angle) is normal and
// shouldn't blow away several seconds of real progress. Settles once enough
// of the recent window agrees, not only when every single frame agrees.
// ---------------------------------------------------------------------------
export class TemporalValidator {
  constructor(holdFrames = HOLD_FRAMES) {
    this.windowSize = holdFrames;
    this.minSamples = Math.max(3, Math.ceil(holdFrames * 0.6));
    this.agreementRatio = 0.75; // fraction of known (non-null) samples that must agree to settle
    this.history = []; // recent true/false/null outcomes
  }

  reset() {
    this.history = [];
  }

  // outcome: true (pass), false (fail), or null (unknown / no landmark)
  push(outcome) {
    this.history.push(outcome);
    if (this.history.length > this.windowSize) this.history.shift();

    const known = this.history.filter((o) => o !== null);
    if (known.length < this.minSamples) return 'uncertain';

    const passRatio = known.filter(Boolean).length / known.length;
    if (passRatio >= this.agreementRatio) return 'correct';
    if (1 - passRatio >= this.agreementRatio) return 'incorrect';
    return 'uncertain';
  }

  // Fraction of the recent window that agrees with the current direction —
  // used as the temporalStabilityScore term in the confidence formula.
  get stabilityScore() {
    const known = this.history.filter((o) => o !== null);
    if (known.length === 0) return 0;
    const passRatio = known.filter(Boolean).length / known.length;
    return Math.max(passRatio, 1 - passRatio); // agreement in either direction
  }
}

const computeConfidence = ({ landmarkConf, geometricScore, temporalScore }) =>
  +(clamp01(landmarkConf) * 0.4 + clamp01(geometricScore) * 0.35 + clamp01(temporalScore) * 0.25).toFixed(2);

// ---------------------------------------------------------------------------
// Phase 2 — BP measurement (MediaPipe Pose, 33 keypoints)
// Indices: 11/12 shoulders, 15/16 wrists, 23/24 hips.
// ---------------------------------------------------------------------------
const POSE = { L_SHOULDER: 11, R_SHOULDER: 12, L_WRIST: 15, R_WRIST: 16, L_HIP: 23, R_HIP: 24 };

function bpRule(stepId, pose) {
  if (!pose || pose.length === 0) return null; // no person detected

  const lm = pose;
  const shoulders = midpoint(lm[POSE.L_SHOULDER], lm[POSE.R_SHOULDER]);
  const hips = midpoint(lm[POSE.L_HIP], lm[POSE.R_HIP]);
  const wrist = lm[POSE.R_WRIST].visibility >= lm[POSE.L_WRIST].visibility ? lm[POSE.R_WRIST] : lm[POSE.L_WRIST];
  const landmarkConf =
    (lm[POSE.L_SHOULDER].visibility + lm[POSE.R_SHOULDER].visibility + lm[POSE.L_HIP].visibility + lm[POSE.R_HIP].visibility) / 4;

  switch (stepId) {
    // Torso verticality — shoulder-hip alignment for seated posture.
    case 'seated_position':
    case 'feet_position': // feet aren't reliably in frame; posture is the observable proxy
    case 'stay_still': {
      const tiltDeg = angleFromVertical(hips, shoulders);
      const geometricScore = scoreAgainstTarget(tiltDeg, 0, 20);
      return { pass: tiltDeg < 15, landmarkConf, geometricScore, errorCode: 'posture_not_upright', bboxLandmarks: [shoulders, hips] };
    }
    // Wrist height relative to shoulder — "arm at heart level".
    case 'arm_position':
    case 'cuff_position': {
      const heightDiff = wrist.y - shoulders.y; // 0 = level with shoulder, image-y grows downward
      const geometricScore = scoreAgainstTarget(heightDiff, 0.05, 0.18);
      return { pass: Math.abs(heightDiff) < 0.12, landmarkConf, geometricScore, errorCode: 'arm_not_at_heart_height', bboxLandmarks: [shoulders, wrist] };
    }
    // Generic presence checks — no specific geometry claimed for these.
    case 'rest_prep':
    case 'start_measurement':
    case 'complete_measurement':
    default:
      return { pass: landmarkConf > 0.5, landmarkConf, geometricScore: landmarkConf, errorCode: 'person_not_clearly_visible', bboxLandmarks: [shoulders, hips] };
  }
}

// ---------------------------------------------------------------------------
// Phases 5a/5b — eye drops & nasal spray (MediaPipe Face + Hand landmarkers)
// Face indices (478-pt mesh): 1 nose tip, 33 left-eye outer, 263 right-eye
// outer, 13 upper-lip / mouth center.
// ---------------------------------------------------------------------------
const FACE = { NOSE_TIP: 1, L_EYE: 33, R_EYE: 263, MOUTH: 13 };

// Head pitch from MediaPipe's facial transformation matrix (column-major
// flat 16-value array). Positive = chin tilted up/back, per this matrix's
// rotation convention — verify sign against a live camera before a demo and
// flip if it reads backwards; the *magnitude* thresholds below are the part
// that matters for the pass/fail call.
function pitchDegreesFromMatrix(matrixData) {
  if (!matrixData || matrixData.length < 16) return 0;
  const r21 = matrixData[6]; // R[2][1]
  const r22 = matrixData[10]; // R[2][2]
  return (Math.atan2(-r21, r22) * 180) / Math.PI;
}

function medicationRule(stepId, face, hand, { neutralPitch, tiltTarget, proximityLandmark }) {
  if (!face) return null;

  const nose = face.landmarks[FACE.NOSE_TIP];
  const targetPoint = proximityLandmark === 'eye' ? face.landmarks[FACE.L_EYE] : nose;
  const landmarkConf = 0.9; // FaceLandmarker doesn't expose per-point visibility; presence implies high confidence
  const pitch = pitchDegreesFromMatrix(face.transformMatrix);

  switch (stepId) {
    case 'head_position': {
      const tolerance = 15; // degrees
      const geometricScore = scoreAgainstTarget(pitch, tiltTarget, tolerance + 10);
      const pass = neutralPitch ? Math.abs(pitch) < tolerance : pitch > tiltTarget - tolerance;
      return { pass, landmarkConf, geometricScore, errorCode: neutralPitch ? 'head_not_neutral' : 'head_not_tilted_back', bboxLandmarks: [nose] };
    }
    // Hand-near-eye / hand-near-nose proximity — 2D distance between a
    // fingertip (index 8) and the relevant face landmark.
    case 'bottle_position':
    case 'administer':
    case 'nostril_position':
    case 'actuation': {
      if (!hand || hand.length === 0) {
        return { pass: false, landmarkConf: 0.9, geometricScore: 0, errorCode: 'hand_not_visible', bboxLandmarks: [targetPoint] };
      }
      const fingertip = hand[0][8]; // index fingertip of the first detected hand
      const d = dist2D(fingertip, targetPoint);
      const geometricScore = scoreAgainstTarget(d, 0.03, 0.15);
      return { pass: d < 0.1, landmarkConf: 0.9, geometricScore, errorCode: 'hand_not_near_target', bboxLandmarks: [targetPoint, fingertip] };
    }
    // Generic presence checks.
    case 'prepare':
    case 'avoid_contact':
    case 'inhale_gently':
    case 'finish':
    default:
      return { pass: true, landmarkConf, geometricScore: 0.8, errorCode: 'face_not_clearly_visible', bboxLandmarks: [nose] };
  }
}

const eyeDropsRule = (stepId, face, hand) =>
  medicationRule(stepId, face, hand, { neutralPitch: false, tiltTarget: 30, proximityLandmark: 'eye' });

const nasalSprayRule = (stepId, face, hand) =>
  medicationRule(stepId, face, hand, { neutralPitch: true, tiltTarget: 0, proximityLandmark: 'nose' });

// ---------------------------------------------------------------------------
// Phase 4 — Glucose measurement (MediaPipe Hand landmarker only)
//
// Per docs/RESEARCH.md: "What's genuinely implementable: hand presence
// during the finger-prick and strip-application steps... but not
// glucometer/strip detection, which has no dataset." So this is
// deliberately coarse — hand-presence/steadiness only, nothing claiming to
// read the device or judge the strip. Insert/prepare/dispose/log steps are
// MANUAL_OVERRIDE (device-specific or safety-relevant).
// ---------------------------------------------------------------------------
const HAND_INDEX_TIP = 8;

function handPresenceRule(hand, { errorCode = 'hand_not_visible', passScore = 0.8 } = {}) {
  const present = !!(hand && hand.length > 0);
  const point = present ? hand[0][HAND_INDEX_TIP] : { x: 0.5, y: 0.5 };
  return {
    pass: present,
    landmarkConf: present ? 0.85 : 0.3,
    geometricScore: present ? passScore : 0.1,
    errorCode,
    bboxLandmarks: [point]
  };
}

function glucoseRule(stepId, hand) {
  switch (stepId) {
    case 'obtain_sample':
    case 'apply_sample':
    case 'wait_reading':
    case 'prepare_glucometer':
    default:
      return handPresenceRule(hand);
  }
}

// ---------------------------------------------------------------------------
// Phase 5c — Nebulizer (MediaPipe Face + Hand landmarkers)
//
// Per docs/RESEARCH.md: no detector distinguishes assembled vs. unassembled,
// or judges mask-seal quality — assemble/add_medication/connect/
// establish_seal are MANUAL_OVERRIDE. What IS legitimately checkable with
// generic landmarks: is something (a hand, standing in for the mask) held
// near the face, and is the face still present through the session — the
// same face+hand-proximity primitive already used for eye drops/nasal spray.
// ---------------------------------------------------------------------------
function nebulizerRule(stepId, face, hand) {
  if (!face) return null;

  const nose = face.landmarks[FACE.NOSE_TIP];
  const mouth = face.landmarks[FACE.MOUTH];
  const maskTarget = midpoint(nose, mouth);
  const landmarkConf = 0.9;

  switch (stepId) {
    case 'position_mask': {
      if (!hand || hand.length === 0) {
        return { pass: false, landmarkConf, geometricScore: 0, errorCode: 'mask_not_near_face', bboxLandmarks: [maskTarget] };
      }
      const fingertip = hand[0][HAND_INDEX_TIP];
      const d = dist2D(fingertip, maskTarget);
      const geometricScore = scoreAgainstTarget(d, 0.03, 0.15);
      return { pass: d < 0.12, landmarkConf, geometricScore, errorCode: 'mask_not_near_face', bboxLandmarks: [maskTarget, fingertip] };
    }
    case 'perform_session':
    case 'finish':
    default:
      return { pass: true, landmarkConf, geometricScore: 0.75, errorCode: 'face_not_clearly_visible', bboxLandmarks: [maskTarget] };
  }
}

// ---------------------------------------------------------------------------
// Phase 6a — Wound dressing (MediaPipe Hand landmarker only)
//
// Per docs/RESEARCH.md: wound/dressing-placement itself needs object
// detection nothing pretrained provides (and the only public wound
// datasets are diagnostic, explicitly out of scope) — clean_wound/
// apply_dressing/secure_dressing are MANUAL_OVERRIDE. Hand-washing is a
// legitimately generic gesture check: hands presence is all this claims.
// ---------------------------------------------------------------------------
function woundDressingRule(stepId, hand) {
  switch (stepId) {
    case 'wash_hands':
    case 'finish':
    default:
      return handPresenceRule(hand);
  }
}

// ---------------------------------------------------------------------------
// Dispatcher — called once per detection frame by RealPerceptionService.
// ---------------------------------------------------------------------------
export function evaluateRule(workflowId, stepId, detections) {
  if (isManualStep(workflowId, stepId)) return null; // handled by confirmManual, not a rule

  let raw = null;
  if (workflowId === 'bp_measurement') {
    raw = bpRule(stepId, detections.pose);
  } else if (workflowId === 'eye_drops') {
    raw = eyeDropsRule(stepId, detections.face, detections.hand);
  } else if (workflowId === 'nasal_spray') {
    raw = nasalSprayRule(stepId, detections.face, detections.hand);
  } else if (workflowId === 'glucose_measurement') {
    raw = glucoseRule(stepId, detections.hand);
  } else if (workflowId === 'nebulizer') {
    raw = nebulizerRule(stepId, detections.face, detections.hand);
  } else if (workflowId === 'wound_dressing') {
    raw = woundDressingRule(stepId, detections.hand);
  }
  return raw;
}

export { computeConfidence };
