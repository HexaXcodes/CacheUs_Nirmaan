// src/services/perception/AnchoredGuideService.js
// ============================================================================
//  Level C perception service — no rule-verified verdict (no dataset exists
//  for these procedures, see docs/RESEARCH.md), but the AR guide box is
//  still spatially real: it tracks the user's actual hand or face with the
//  same pretrained MediaPipe landmarkers used by the real (Level B)
//  workflows, so the "what to do" label sits on the body part actually
//  doing the action instead of drifting to a random point on screen.
//
//  This is NOT technique verification — it never emits a rule/status, so
//  useProcedureSession's auto-verify path never fires for it. Correctness
//  is still confirmed only through the dev Simulate buttons, and the UI
//  badge stays "Demo / Prototype". Same start(onFrame)/stop() interface as
//  every other perception service.
// ============================================================================
import { getHandLandmarker, getFaceLandmarker } from './landmarkTasks';
import { shortActionPhrase } from '../../utils/actionPhrase';

const TICK_MS = 100;
const FALLBACK_BOX = { x: 0.5, y: 0.55, width: 0.32, height: 0.26 };

const boxFromPoints = (points, padding = 0.06, minSize = 0.16) => {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs) - padding;
  const maxX = Math.max(...xs) + padding;
  const minY = Math.min(...ys) - padding;
  const maxY = Math.max(...ys) + padding;
  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    width: Math.max(maxX - minX, minSize),
    height: Math.max(maxY - minY, minSize)
  };
};

export default class AnchoredGuideService {
  constructor({ target = 'hand', label = 'here', stepTitle, videoEl }) {
    this.target = target; // 'hand' | 'face'
    // Prefer a proper multi-word instruction derived from the step title
    // (shared with RealPerceptionService so both perception paths label
    // their overlay the same way); fall back to whatever short label the
    // caller passed directly.
    this.label = shortActionPhrase(stepTitle) || label;
    this.videoEl = videoEl;
    this._timer = null;
    this._onFrame = null;
    this._stopped = false;
    this._landmarker = null;
  }

  async _load() {
    this._landmarker = this.target === 'face' ? await getFaceLandmarker() : await getHandLandmarker();
  }

  _detectPoints() {
    const { videoEl } = this;
    if (!videoEl || videoEl.readyState < 2 || !this._landmarker) return null;
    const now = performance.now();
    const res = this._landmarker.detectForVideo(videoEl, now);
    if (this.target === 'face') return res.faceLandmarks?.[0] || null;
    return res.landmarks?.[0] || null; // first detected hand
  }

  start(onFrame) {
    this._onFrame = onFrame;
    this._stopped = false;
    this._load()
      .catch(() => {
        /* model load failed — loop still runs and emits the fallback box below */
      })
      .then(() => this._loop());
  }

  _loop() {
    if (this._stopped) return;

    const points = this._detectPoints();
    const tracked = !!(points && points.length);
    const box = tracked ? boxFromPoints(points) : FALLBACK_BOX;

    this._onFrame?.({
      object: this.label,
      instruction: this.label,
      tracked,
      ...box,
      landmarks: [],
      rule: null, // no verdict — Level C stays Simulate-button-verified
      timestamp: new Date().toISOString()
    });

    this._timer = setTimeout(() => this._loop(), TICK_MS);
  }

  stop() {
    this._stopped = true;
    if (this._timer) clearTimeout(this._timer);
    this._timer = null;
    this._onFrame = null;
  }
}
