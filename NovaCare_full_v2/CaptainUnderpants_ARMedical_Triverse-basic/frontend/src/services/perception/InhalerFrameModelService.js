// src/services/perception/InhalerFrameModelService.js
// ============================================================================
//  Phase 1 (inhaler) perception service — samples live camera frames and
//  proxies them through the backend's POST /api/ml/inhaler/predict (which
//  forwards to the internal Python frame-classifier service; see
//  ml-service/ and docs/PHASE_1_ML_INTEGRATION.md). Same
//  start(onFrame)/stop() interface as RealPerceptionService and
//  AnchoredGuideService, and emits the same post-Part-1 frame shape:
//    { object, x, y, width, height, landmarks, instruction, tracked, rule }
//
//  This is a pure 8-class step CLASSIFIER — it has no spatial/landmark
//  output at all (unlike the MediaPipe-backed services, which sometimes
//  lack tracking but sometimes have real hand/face/pose points). Since
//  there is never anything to anchor to honestly, this always reports
//  tracked:true with a gentle drift box (matching MockPerceptionService's
//  pattern for "nothing to anchor to") rather than either fabricating
//  landmark coordinates or permanently showing ARAnchor's "Move into view"
//  searching state (tracked:false), which would be misleading in the
//  opposite direction — the classifier IS actively running, it just has no
//  position to report.
//
//  Verdict application is NOT this service's job: it calls
//  mlService.inhalerPredict() to get a settled/unsettled result, and emits
//  it as `rule` in the exact shape useProcedureSession.js's existing
//  real-perception onFrame handler already expects (status
//  correct/incorrect/uncertain, confidence, errorCode, and `stalled` for a
//  settled-but-low-confidence read) — so that handler needs no
//  inhaler-specific branching to submit it through the normal
//  submitVerification -> POST /api/ml/verification path.
//
//  Sampling: buffers frames from the live <video> at ~25fps (matching the
//  training video's fps — see docs/PHASE_1_ML_INTEGRATION.md), and sends
//  the most recent 20-frame SLIDING window every ~250ms — not once per
//  fresh non-overlapping 20-frame block. That overlapping-window live setup
//  is a disclosed distribution shift from the non-overlapping training
//  windows (see docs). Window-level temporal smoothing across calls happens
//  server-side (inhalerTemporalSmoothing.js); this service just reports
//  whatever the backend returns.
//
//  Each frame is JPEG-encoded exactly ONCE, at capture time, and cached as
//  a base64 string in the rolling buffer — NOT re-encoded on every send.
//  At 25fps capture / 250ms send cadence, consecutive windows overlap ~70%
//  (~14 of 20 frames unchanged between sends); re-encoding all 20 on every
//  send would mean ~80 JPEG encodes/sec for only ~25/sec of actual new
//  frames. The buffer stores strings, not ImageBitmaps, for the same
//  reason — nothing needs decoding again later, so there's no benefit to
//  holding onto the bitmap past its one encode.
// ============================================================================
import { shortActionPhrase } from '../../utils/actionPhrase';
import { isManualStep } from './ruleEngine';
import { mlService } from '../mlService';

const CAPTURE_INTERVAL_MS = 40; // ~25fps, matching the training video's fps
const SEND_INTERVAL_MS = 250; // sliding-window prediction cadence
const WINDOW_SIZE = 20;
const JPEG_QUALITY = 0.7;

// Gentle drift within a central viewport region — same idea as
// MockPerceptionService's box; this model produces no spatial output to
// anchor to honestly, so this is clearly a placeholder, not a claim.
const driftBox = () => {
  const t = performance.now() / 1000;
  return {
    x: 0.5 + 0.08 * Math.sin(t * 0.5),
    y: 0.48 + 0.06 * Math.cos(t * 0.4),
    width: 0.3,
    height: 0.24
  };
};

export default class InhalerFrameModelService {
  constructor({ sessionId, workflowId, stepId, stepTitle, videoEl }) {
    this.sessionId = sessionId;
    this.workflowId = workflowId;
    this.stepId = stepId;
    this.instruction = shortActionPhrase(stepTitle) || 'Follow the instruction';
    this.videoEl = videoEl;
    // remove_cap..breath_hold are the model's 8 classes; identify_device
    // and finish (the steps flanking them in the pmdi_no_spacer variant)
    // have no matching class, so they're routed to manual confirm instead
    // of being scored against a step the model was never trained on.
    this._isManual = isManualStep(workflowId, stepId);

    this._onFrame = null;
    this._stopped = false;
    this._captureTimer = null;
    this._sendTimer = null;
    this._buffer = []; // rolling buffer of already-encoded base64 JPEG strings, oldest first
    this._canvas = document.createElement('canvas');
    this._ctx = this._canvas.getContext('2d');
    this._sending = false;
  }

  start(onFrame) {
    this._onFrame = onFrame;
    this._stopped = false;

    if (this._isManual) {
      // No model class covers this step — don't burn camera/network on
      // predictions that can never match. Emit one passthrough frame so the
      // AR box still shows the instruction; useProcedureSession's
      // handleRuleFrame ignores anything with rule.manual === true, and
      // manualStepAvailable drives the "Confirm manually" button from here.
      this._emit({ status: 'guiding', confidence: 0, errorCode: null, manual: true });
      return;
    }

    // Immediate "gathering evidence" frame so the overlay shows something
    // right away instead of nothing until the first window is full.
    this._emit({ status: 'detecting', confidence: 0, errorCode: null });

    this._captureLoop();
    this._sendTimer = setInterval(() => this._sendWindow(), SEND_INTERVAL_MS);
  }

  async _captureLoop() {
    if (this._stopped) return;
    try {
      await this._captureFrame();
    } catch {
      /* a single missed capture (codec hiccup, tab backgrounded) is fine — keep going */
    }
    if (!this._stopped) {
      this._captureTimer = setTimeout(() => this._captureLoop(), CAPTURE_INTERVAL_MS);
    }
  }

  async _captureFrame() {
    const { videoEl } = this;
    if (!videoEl || videoEl.readyState < 2) return;
    if (!videoEl.videoWidth || !videoEl.videoHeight) return;

    const bitmap = await createImageBitmap(videoEl);
    const encoded = this._encodeBitmap(bitmap);
    bitmap.close(); // encoded already — no reason to hold the bitmap any longer

    this._buffer.push(encoded);
    if (this._buffer.length > WINDOW_SIZE) this._buffer.shift();
  }

  async _sendWindow() {
    if (this._stopped || this._sending) return;
    if (this._buffer.length < WINDOW_SIZE) return; // not enough evidence yet

    this._sending = true;
    try {
      // Already-encoded strings — just the last WINDOW_SIZE captured, no
      // re-encoding work happens here.
      const frames = this._buffer.slice(-WINDOW_SIZE);

      const data = await mlService.inhalerPredict({
        sessionId: this.sessionId,
        workflowId: this.workflowId,
        stepId: this.stepId,
        frames
      });

      // Surfaced up to the UI (GuidancePanel's auto-verifying hint) so a
      // never-settling window is visibly "guessing shake_inhaler at 40%"
      // instead of an opaque spinner — the difference between "the model
      // is flickering/wrong" (a real, disclosed limitation — see
      // docs/PHASE_1_ML_INTEGRATION.md) and "something is actually broken"
      // should be visible, not something you have to take on faith.
      const debug = data.rawPrediction ? { stepLabel: data.rawPrediction.stepLabel, confidence: data.rawPrediction.confidence } : null;

      if (!data.settled) {
        this._emit({ status: 'detecting', confidence: 0, errorCode: null, debug });
      } else {
        // Settled means a verdict is on its way to submitVerification() —
        // every settled status here (correct/incorrect/stalled-uncertain)
        // is one shouldSubmit already accepts. Stop capturing/sending now
        // instead of waiting for the caller's delayed stop() (up to ~700ms
        // later, after the step-transition timeout): there's nothing left
        // for this window to decide, so further windows were previously
        // just extra ml-service calls racing the transition.
        this._haltPolling();
        this._emit({
          status: data.status,
          confidence: data.confidence ?? 0,
          errorCode: data.errorCode || null,
          // Settled-but-uncertain (low confidence) reuses the same
          // "stalled" auto-submit path RealPerceptionService uses after its
          // own stall timeout — here it's not a timeout, it's a genuinely
          // settled low-confidence read, but the effect (submit as
          // uncertain, give the user a Retry button) is exactly right.
          stalled: data.status === 'uncertain',
          debug
        });
      }
    } catch (err) {
      this._emit({ status: 'uncertain', confidence: 0, errorCode: `predict_failed: ${err.message}` });
    } finally {
      this._sending = false;
    }
  }

  _encodeBitmap(bitmap) {
    if (this._canvas.width !== bitmap.width || this._canvas.height !== bitmap.height) {
      this._canvas.width = bitmap.width;
      this._canvas.height = bitmap.height;
    }
    this._ctx.drawImage(bitmap, 0, 0);
    const dataUrl = this._canvas.toDataURL('image/jpeg', JPEG_QUALITY);
    return dataUrl.split(',', 2)[1]; // strip the "data:image/jpeg;base64," prefix
  }

  _emit({ status, confidence, errorCode, stalled, manual, debug }) {
    this._onFrame?.({
      object: this.instruction,
      instruction: this.instruction,
      tracked: true, // always shows the drift box + instruction label — see file header
      ...driftBox(),
      landmarks: [],
      rule: { status, confidence, errorCode, stalled: !!stalled, manual: !!manual },
      debug, // { stepLabel, confidence } from the model's raw single-window read, or null
      timestamp: new Date().toISOString()
    });
  }

  // Clears the capture/send timers only — leaves _onFrame and _buffer
  // alone, since this also runs mid-emit (see _sendWindow's settled
  // branch), before the caller's own stop() has been invoked.
  _haltPolling() {
    this._stopped = true;
    if (this._captureTimer) clearTimeout(this._captureTimer);
    if (this._sendTimer) clearInterval(this._sendTimer);
    this._captureTimer = null;
    this._sendTimer = null;
  }

  stop() {
    this._haltPolling();
    this._onFrame = null;
    this._buffer = [];
  }
}
