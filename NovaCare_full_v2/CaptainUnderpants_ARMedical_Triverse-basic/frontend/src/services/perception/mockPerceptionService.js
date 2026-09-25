// src/services/perception/mockPerceptionService.js
// ============================================================================
//  MockPerceptionService — stands in for the real markerless ML/CV model.
//
//  It never claims a medical result on its own. It only emits normalized
//  (0-1) bounding-box/landmark "frames" so the AR layer has something to
//  anchor to and can demonstrate that guidance is NOT pinned to one fixed
//  screen position. The actual correct/incorrect/uncertain verdict is either
//  triggered by the dev-only simulate controls, or (later) by a real
//  RealPerceptionService implementing this exact same interface:
//
//    start(onFrame) -> void       // begin emitting { x, y, width, height, landmarks }
//    stop() -> void
//
//  Swapping this file for a real implementation is the ONLY change required
//  to plug in production ML — see hooks/useProcedureSession.js.
// ============================================================================

export default class MockPerceptionService {
  constructor({ objectLabel = 'object' } = {}) {
    this.objectLabel = objectLabel;
    this._raf = null;
    this._start = null;
    this._onFrame = null;
  }

  start(onFrame) {
    this._onFrame = onFrame;
    this._start = performance.now();
    const tick = (now) => {
      const t = (now - this._start) / 1000;
      // Slow Lissajous-ish drift within a comfortable central viewport region
      // — enough motion to prove the anchor isn't hardcoded, gentle enough
      // to stay legible.
      const x = 0.5 + 0.14 * Math.sin(t * 0.6);
      const y = 0.46 + 0.10 * Math.cos(t * 0.5);
      const width = 0.26 + 0.015 * Math.sin(t * 1.3);
      const height = 0.2 + 0.015 * Math.cos(t * 1.1);

      this._onFrame?.({
        object: this.objectLabel,
        x,
        y,
        width,
        height,
        landmarks: [{ name: this.objectLabel, x, y }],
        timestamp: new Date().toISOString()
      });

      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
    this._onFrame = null;
  }
}
