// services/inhalerMlClient.js
// Thin HTTP client for the internal-only Python inhaler frame-classifier
// service (see ../../ml-service). Never called from the browser directly —
// the frontend only ever talks to POST /api/ml/inhaler/predict, which
// proxies through here (see controllers/mlController.js) so the existing
// auth/rate-limiting/session-ownership checks in that request path still
// apply before any frame data reaches the ML service.
const ML_SERVICE_URL = process.env.INHALER_ML_SERVICE_URL || 'http://127.0.0.1:8100';

// frames: array of base64-encoded JPEG/PNG strings, oldest first, length 20.
// Returns { stepLabel, classIndex, confidence, probabilities }.
async function predictInhalerStep(frames) {
  let res;
  try {
    res = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frames })
    });
  } catch (err) {
    throw new Error(`could not reach inhaler ML service at ${ML_SERVICE_URL}: ${err.message}`);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`ML service responded ${res.status}: ${text}`);
  }

  return res.json();
}

module.exports = { predictInhalerStep };
