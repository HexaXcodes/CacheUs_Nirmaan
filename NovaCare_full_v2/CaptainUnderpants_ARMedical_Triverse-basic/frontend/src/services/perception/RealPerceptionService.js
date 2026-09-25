// src/services/perception/RealPerceptionService.js
// ============================================================================
//  Level B perception service — real pretrained MediaPipe landmarks run
//  against the live camera feed, turned into a verdict by ruleEngine.js.
//  Implements the exact same two-method interface as MockPerceptionService
//  so useProcedureSession.js doesn't need to know which one it's driving:
//
//    start(onFrame) -> void   // begin emitting { object, x, y, width,
//                              //   height, landmarks, rule: {status,
//                              //   confidence, errorCode} }
//    stop() -> void
//
//  One instance per active step (mirrors MockPerceptionService — a fresh
//  instance is created by useProcedureSession's startPerception() on every
//  step change, which also gives every step its own TemporalValidator).
// ============================================================================
import { getPoseLandmarker, getFaceLandmarker, getHandLandmarker, WORKFLOW_LANDMARKERS } from './landmarkTasks';
import { evaluateRule, TemporalValidator, computeConfidence, isManualStep } from './ruleEngine';
import { shortActionPhrase } from '../../utils/actionPhrase';

const TICK_MS = 100; // ~10 fps perception loop, per docs/RESEARCH.md temporal validation window
const STALL_TIMEOUT_MS = 7000; // never leave the user hanging on "auto-verifying" indefinitely

const boxFromPoints = (points, minSize = 0.18, padding = 0.08) => {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs) - padding;
  const maxX = Math.max(...xs) + padding;
  const minY = Math.min(...ys) - padding;
  const maxY = Math.max(...ys) + padding;
  const width = Math.max(maxX - minX, minSize);
  const height = Math.max(maxY - minY, minSize);
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, width, height };
};

export default class RealPerceptionService {
  constructor({ workflowId, stepId, stepTitle, objectLabel = 'target', videoEl }) {
    this.workflowId = workflowId;
    this.stepId = stepId;
    this.instruction = shortActionPhrase(stepTitle) || objectLabel;
    this.objectLabel = objectLabel;
    this.videoEl = videoEl;
    this.validator = new TemporalValidator();
    this._timer = null;
    this._onFrame = null;
    this._stopped = false;
    this._landmarkers = {};
    this._stepStartedAt = Date.now();
  }

  // Called by useProcedureSession's retry() so a fresh attempt gets a full
  // stall window again, instead of immediately re-stalling because the old
  // clock (and any stale flickery history) carried over.
  resetStall() {
    this._stepStartedAt = Date.now();
    this.validator.reset();
  }

  async _loadLandmarkers() {
    const needed = WORKFLOW_LANDMARKERS[this.workflowId] || [];
    const loaders = {
      pose: getPoseLandmarker,
      face: getFaceLandmarker,
      hand: getHandLandmarker
    };
    await Promise.all(
      needed.map(async (kind) => {
        this._landmarkers[kind] = await loaders[kind]();
      })
    );
  }

  _detect() {
    const { videoEl } = this;
    if (!videoEl || videoEl.readyState < 2) return { pose: null, face: null, hand: null };
    const now = performance.now();

    let pose = null;
    let face = null;
    let hand = null;

    if (this._landmarkers.pose) {
      const res = this._landmarkers.pose.detectForVideo(videoEl, now);
      pose = res.landmarks?.[0] || null;
    }
    if (this._landmarkers.face) {
      const res = this._landmarkers.face.detectForVideo(videoEl, now);
      const landmarks = res.faceLandmarks?.[0];
      face = landmarks
        ? { landmarks, transformMatrix: res.facialTransformationMatrixes?.[0]?.data }
        : null;
    }
    if (this._landmarkers.hand) {
      const res = this._landmarkers.hand.detectForVideo(videoEl, now);
      hand = res.landmarks?.length ? res.landmarks : null;
    }

    return { pose, face, hand };
  }

  start(onFrame) {
    this._onFrame = onFrame;
    this._stopped = false;

    this._loadLandmarkers()
      .then(() => this._loop())
      .catch((err) => {
        // Model load failed (offline, blocked CDN, etc.) — report as a
        // permanent "uncertain" so the UI can fall back to manual confirm
        // rather than hanging silently.
        this._onFrame?.({
          object: this.objectLabel,
          instruction: this.instruction,
          tracked: false,
          x: 0.5,
          y: 0.5,
          width: 0.3,
          height: 0.3,
          landmarks: [],
          rule: { status: 'uncertain', confidence: 0, errorCode: `model_load_failed: ${err.message}` },
          timestamp: new Date().toISOString()
        });
      });
  }

  _loop() {
    if (this._stopped) return;

    // The whole tick is guarded: a single bad frame (a detector throwing on
    // an unexpected landmark shape, a codec hiccup, etc.) must never kill
    // the setTimeout chain silently — that would freeze the AR box and the
    // "auto-verifying" hint forever with no error visible to the user. On
    // any exception, log it, report 'uncertain', and — critically — still
    // schedule the next tick in `finally`.
    try {
      if (isManualStep(this.workflowId, this.stepId)) {
        // No rule to run — still emit a live anchor frame (best-effort face
        // position) so the AR box tracks the user, but the verdict is left
        // to the explicit "confirm manually" action in useProcedureSession.
        const { face, pose } = this._detect();
        const points = face?.landmarks || pose || null;
        const box = points ? boxFromPoints([points[Math.floor(points.length / 2)]]) : { x: 0.5, y: 0.5, width: 0.3, height: 0.3 };
        this._onFrame?.({
          object: this.objectLabel,
          instruction: this.instruction,
          tracked: !!points,
          ...box,
          landmarks: [],
          rule: { status: 'guiding', confidence: 0, errorCode: null, manual: true },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const detections = this._detect();

      // Diagnostic logging (temporary — remove once the BP "MOVE INTO VIEW"
      // report is resolved). Throttled to ~1/sec so it's readable instead of
      // 10/sec at TICK_MS. Prints exactly what MediaPipe returned this tick,
      // before ruleEngine.js does anything with it.
      if (this.workflowId === 'bp_measurement' && (!this._lastDebugLog || Date.now() - this._lastDebugLog > 1000)) {
        this._lastDebugLog = Date.now();
        if (!detections.pose) {
          console.log('[RealPerceptionService][BP] pose=null (MediaPipe found no person at all this tick)');
        } else {
          const lm = detections.pose;
          const v = (i) => lm[i] ? lm[i].visibility?.toFixed(3) : 'MISSING_INDEX';
          console.log(
            `[RealPerceptionService][BP] pose landmarks=${lm.length} ` +
            `L_SHOULDER(11)=${v(11)} R_SHOULDER(12)=${v(12)} L_HIP(23)=${v(23)} R_HIP(24)=${v(24)}`
          );
        }
      }

      const raw = evaluateRule(this.workflowId, this.stepId, detections);
      const stalled = Date.now() - this._stepStartedAt > STALL_TIMEOUT_MS;

      if (!raw) {
        // Nothing detected this frame — don't count it as a fail, just
        // report "detecting" so the UI knows to prompt the user into frame.
        // If that goes on too long, surface 'uncertain' so the Retry button
        // appears instead of an indefinite "detecting" spinner.
        this.validator.push(null);
        this._onFrame?.({
          object: this.objectLabel,
          instruction: this.instruction,
          tracked: false,
          x: 0.5,
          y: 0.5,
          width: 0.3,
          height: 0.3,
          landmarks: [],
          rule: {
            status: stalled ? 'uncertain' : 'detecting',
            confidence: 0,
            errorCode: 'target_not_in_frame',
            stalled
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const status = this.validator.push(raw.pass);
      const confidence = computeConfidence({
        landmarkConf: raw.landmarkConf,
        geometricScore: raw.geometricScore,
        temporalScore: this.validator.stabilityScore
      });
      const box = boxFromPoints(raw.bboxLandmarks);
      const landmarks = raw.bboxLandmarks.map((p, i) => ({ name: `${this.objectLabel}_${i}`, x: p.x, y: p.y }));

      this._onFrame?.({
        object: this.objectLabel,
        instruction: this.instruction,
        tracked: true,
        ...box,
        landmarks,
        rule: {
          status,
          confidence,
          errorCode: status === 'incorrect' || (status === 'uncertain' && stalled) ? raw.errorCode : null,
          stalled: status === 'uncertain' && stalled
        },
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[RealPerceptionService] detection tick failed:', err);
      const stalled = Date.now() - this._stepStartedAt > STALL_TIMEOUT_MS;
      this._onFrame?.({
        object: this.objectLabel,
        instruction: this.instruction,
        tracked: false,
        x: 0.5,
        y: 0.5,
        width: 0.3,
        height: 0.3,
        landmarks: [],
        rule: { status: stalled ? 'uncertain' : 'detecting', confidence: 0, errorCode: `detection_error: ${err.message}`, stalled },
        timestamp: new Date().toISOString()
      });
    } finally {
      if (!this._stopped) this._timer = setTimeout(() => this._loop(), TICK_MS);
    }
  }

  stop() {
    this._stopped = true;
    if (this._timer) clearTimeout(this._timer);
    this._timer = null;
    this._onFrame = null;
  }
}
