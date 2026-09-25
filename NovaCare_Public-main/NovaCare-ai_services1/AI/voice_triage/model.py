import os
import pickle
import numpy as np
from AI.voice_triage.utils import get_ai_path, load_config


def calculate_entropy(probs: np.ndarray) -> float:
    """Shannon entropy of a 2-class probability vector, normalised to [0, 1]."""
    eps = 1e-15
    p0 = max(eps, min(1.0 - eps, float(probs[0])))
    p1 = max(eps, min(1.0 - eps, float(probs[1])))
    return float(-(p0 * np.log2(p0) + p1 * np.log2(p1)))


def _biomarker_score(value: float, healthy: float, threshold: float, severe: float, inverted: bool = False) -> float:
    """
    Two-segment linear scaling for a single biomarker.

    healthy   → 0.0   (no stress contribution)
    threshold → 0.5   (clinical concern boundary)
    severe    → 1.0   (maximum stress contribution)

    inverted=True: lower value = more stress (HNR, speaking_rate).
    """
    if inverted:
        value = -value
        healthy, threshold, severe = -healthy, -threshold, -severe

    if value <= healthy:
        return 0.0
    if value <= threshold:
        return 0.5 * (value - healthy) / (threshold - healthy + 1e-9)
    return float(np.clip(0.5 + 0.5 * (value - threshold) / (severe - threshold + 1e-9), 0.5, 1.0))


def _rule_based_stress(features: np.ndarray, feature_names: list, config: dict) -> tuple[float, float, np.ndarray, None]:
    """
    Deterministic clinical threshold scorer.

    Two-segment scaling per biomarker:
      healthy → 0.0,  clinical threshold → 0.5,  severe ceiling → 1.0

    Thresholds from feature_config.yaml:
        jitter       > 0.02   → stressed
        shimmer      > 0.05   → stressed
        hnr_mean     < 15.0   → stressed  (inverted: lower = worse)
        speaking_rate< 3.0    → stressed  (inverted)
        pause_ratio  > 0.25   → stressed
    """
    feat = dict(zip(feature_names, features.tolist()))

    jitter        = feat.get("jitter",        0.0)
    shimmer       = feat.get("shimmer",       0.0)
    hnr           = feat.get("hnr_mean",      22.0)
    speaking_rate = feat.get("speaking_rate",  4.5)
    pause_ratio   = feat.get("pause_ratio",   0.0)

    # Biomarker scores — each maps cleanly to [0, 1]
    # (healthy, threshold, severe, inverted)
    jitter_score  = _biomarker_score(jitter,        0.005, 0.02,  0.06)
    shimmer_score = _biomarker_score(shimmer,        0.015, 0.05,  0.15)
    hnr_score     = _biomarker_score(hnr,            22.0,  15.0,   5.0, inverted=True)
    rate_score    = _biomarker_score(speaking_rate,   4.5,   3.0,   1.0, inverted=True) if speaking_rate > 0 else 0.0
    pause_score   = _biomarker_score(pause_ratio,    0.08,  0.25,  0.65)

    # Weighted composite
    stress_score = float(np.clip(
        0.20 * jitter_score +
        0.20 * shimmer_score +
        0.25 * hnr_score +
        0.20 * rate_score +
        0.15 * pause_score,
        0.0, 1.0
    ))

    # Confidence grows with distance from the 0.5 decision boundary
    distance = abs(stress_score - 0.5)
    confidence_score = float(np.clip(0.5 + distance * 1.4, 0.5, 0.98))

    probs = np.array([1.0 - stress_score, stress_score])
    return stress_score, confidence_score, probs, None


def predict_stress(features: np.ndarray, feature_names: list):
    """
    Primary inference entry point.

    Priority:
      1. XGBoost model (voice_xgb.json) — if xgboost installed and file present.
      2. Rule-based clinical threshold scorer — always available, no training needed,
         produces clinically interpretable scores across the full 0–1 range.

    Returns: stress_score, confidence_score, probs, scaler
    """
    config = load_config()
    xgb_path   = get_ai_path("models", "voice_xgb.json")
    scaler_path = get_ai_path("models", "scaler.pkl")

    # --- 1. Try XGBoost primary model ---
    try:
        import xgboost as xgb
        if os.path.exists(xgb_path):
            model = xgb.XGBClassifier()
            model.load_model(xgb_path)
            scaler = None
            if os.path.exists(scaler_path):
                with open(scaler_path, "rb") as f:
                    scaler = pickle.load(f)
            feat_in = features.reshape(1, -1)
            if scaler is not None:
                feat_in = scaler.transform(feat_in)
            probs = model.predict_proba(feat_in)[0]
            stress_score = float(probs[1])
            entropy_val  = calculate_entropy(probs)
            confidence_score = float(1.0 - entropy_val)
            return stress_score, confidence_score, probs, scaler
    except Exception:
        pass

    # --- 2. Rule-based fallback (always consistent, no training bias) ---
    return _rule_based_stress(features, feature_names, config)
