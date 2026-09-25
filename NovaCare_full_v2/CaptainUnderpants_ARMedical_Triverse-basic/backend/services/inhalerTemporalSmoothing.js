// services/inhalerTemporalSmoothing.js
// ============================================================================
//  Window-level temporal smoothing for the inhaler frame classifier — same
//  majority-of-recent-window idea as frontend/src/services/perception/
//  ruleEngine.js's TemporalValidator, but at ~0.8s/window granularity
//  instead of ~100ms/frame, because this model predicts once per 20-frame
//  window rather than once per camera frame (see
//  docs/PHASE_1_ML_INTEGRATION.md). A single-window misclassification —
//  the friend's context flagged these as concentrated around step
//  transitions — should never by itself advance or fail a step.
//
//  In-memory, keyed by sessionId. Fine for a single-process dev/demo
//  deployment; would need a shared store (Redis, etc.) behind a load
//  balancer with multiple backend instances.
// ============================================================================
const HOLD_WINDOWS = 3; // consecutive agreeing window predictions required to settle
const AGREEMENT_RATIO = 0.75;
const MAX_HISTORY = HOLD_WINDOWS + 2;

const sessionHistory = new Map(); // sessionId -> [{ label, confidence, ts }]

// Records one raw window prediction and returns whether the recent window
// has settled on a majority label. Returns { settled: false } while still
// gathering evidence, or { settled: true, label, confidence } once enough
// of the recent window agrees.
function pushPrediction(sessionId, label, confidence) {
  const history = sessionHistory.get(sessionId) || [];
  history.push({ label, confidence, ts: Date.now() });
  while (history.length > MAX_HISTORY) history.shift();
  sessionHistory.set(sessionId, history);

  const recent = history.slice(-HOLD_WINDOWS);
  if (recent.length < HOLD_WINDOWS) {
    return { settled: false };
  }

  const counts = {};
  for (const h of recent) counts[h.label] = (counts[h.label] || 0) + 1;
  const [topLabel, topCount] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const ratio = topCount / recent.length;

  if (ratio < AGREEMENT_RATIO) {
    return { settled: false };
  }

  const agreeing = recent.filter((h) => h.label === topLabel);
  const avgConfidence = agreeing.reduce((sum, h) => sum + h.confidence, 0) / agreeing.length;
  return { settled: true, label: topLabel, confidence: avgConfidence };
}

// Called after any settled verdict (correct, incorrect, or a confident-but-
// wrong read) so the next verdict requires fresh evidence rather than
// re-firing immediately from stale history — mirrors the frontend's
// verifiedRef guard in useProcedureSession.js.
function clearSession(sessionId) {
  sessionHistory.delete(sessionId);
}

module.exports = { pushPrediction, clearSession };
