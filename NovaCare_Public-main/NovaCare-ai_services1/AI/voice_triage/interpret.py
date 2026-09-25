import numpy as np

def interpret_prediction(feature_vector: np.ndarray, feature_names: list, scaler, config: dict) -> dict:
    """
    Analyzes specific biomarker thresholds and standard scores (z-scores)
    to compile a human-readable explanation and identify top stress contributors.
    """
    # 1. Compute z-scores (standard deviations from normal reference)
    if scaler is not None and hasattr(scaler, "mean_") and hasattr(scaler, "scale_"):
        # standard standardizer: z = (x - mean) / scale
        mean = scaler.mean_
        scale = scaler.scale_
        # Prevent division by zero
        scale_safe = np.where(scale > 0.0, scale, 1.0)
        z_scores = (feature_vector - mean) / scale_safe
    else:
        z_scores = np.zeros_like(feature_vector)
        
    # Create name -> {raw, z_score} mapping
    feat_map = {}
    for idx, name in enumerate(feature_names):
        feat_map[name] = {
            "raw_value": float(feature_vector[idx]),
            "z_score": float(z_scores[idx])
        }
        
    explanations = []
    stress_contributions = []
    
    # 2. Check primary clinical voice stressors
    
    # Fundamental pitch variations (Jitter)
    jitter = feat_map.get("jitter", {}).get("raw_value", 0.0)
    jitter_z = feat_map.get("jitter", {}).get("z_score", 0.0)
    jitter_thresh = config.get("jitter_threshold", 0.02)
    if jitter > jitter_thresh:
        explanations.append("Micro-variations in pitch period (vocal jitter) are elevated, showing speech instability.")
        stress_contributions.append(("jitter", jitter_z))
    elif jitter_z > 0.5:
        stress_contributions.append(("jitter", jitter_z))
        
    # Amplitude variations (Shimmer)
    shimmer = feat_map.get("shimmer", {}).get("raw_value", 0.0)
    shimmer_z = feat_map.get("shimmer", {}).get("z_score", 0.0)
    shimmer_thresh = config.get("shimmer_threshold", 0.05)
    if shimmer > shimmer_thresh:
        explanations.append("Micro-variations in amplitude (vocal shimmer) suggest vocal fold tension.")
        stress_contributions.append(("shimmer", shimmer_z))
    elif shimmer_z > 0.5:
        stress_contributions.append(("shimmer", shimmer_z))
        
    # Harmonics-to-Noise Ratio (HNR - breathiness / vocal quality)
    hnr = feat_map.get("hnr_mean", {}).get("raw_value", 20.0)
    hnr_z = feat_map.get("hnr_mean", {}).get("z_score", 0.0)
    hnr_thresh = config.get("hnr_threshold", 15.0)
    if hnr < hnr_thresh and hnr > 0.0:
        explanations.append("Harmonics-to-Noise Ratio is decreased, suggesting breathiness, weak phonation, or tension.")
        # Lower HNR means higher stress, so contribution is inversely proportional to z-score
        stress_contributions.append(("hnr_mean", -hnr_z))
    elif hnr_z < -0.5:
        stress_contributions.append(("hnr_mean", -hnr_z))
        
    # Pause Ratio (cognitive fatigue / hesitation)
    pause_ratio = feat_map.get("pause_ratio", {}).get("raw_value", 0.0)
    pause_z = feat_map.get("pause_ratio", {}).get("z_score", 0.0)
    pause_thresh = config.get("pause_ratio_threshold", 0.25)
    if pause_ratio > pause_thresh:
        explanations.append("Significant silent pause duration observed, which can indicate cognitive fatigue or speech hesitation.")
        stress_contributions.append(("pause_ratio", pause_z))
    elif pause_z > 0.5:
        stress_contributions.append(("pause_ratio", pause_z))
        
    # Speaking Rate (fatigue or rush)
    speaking_rate = feat_map.get("speaking_rate", {}).get("raw_value", 0.0)
    speaking_z = feat_map.get("speaking_rate", {}).get("z_score", 0.0)
    speaking_thresh = config.get("speaking_rate_threshold", 3.0)
    if speaking_rate < speaking_thresh and speaking_rate > 0.0:
        explanations.append("A slower-than-average speaking rate was observed, suggesting physiological fatigue.")
        stress_contributions.append(("speaking_rate", -speaking_z))
    elif speaking_z < -0.5 and speaking_rate > 0.0:
        stress_contributions.append(("speaking_rate", -speaking_z))
        
    # 3. Add other general acoustic features that are highly elevated
    for name, info in feat_map.items():
        if name in ["jitter", "shimmer", "hnr_mean", "pause_ratio", "speaking_rate"]:
            continue
        # Positive z-scores indicate elevation
        if info["z_score"] > 0.5:
            stress_contributions.append((name, info["z_score"]))
            
    # Sort contributions to find top stress biomarkers
    stress_contributions.sort(key=lambda x: x[1], reverse=True)
    
    # Extract top 3 names
    top_features = [item[0] for item in stress_contributions[:3]]
    
    # Fill in fallback explanation if no threshold was crossed
    if len(explanations) == 0:
        explanations.append("Acoustic voice biomarkers reflect stable, normal speech patterns with negligible stress indicators.")
        if len(top_features) == 0:
            # Fallback top features
            top_features = ["hnr_mean", "speaking_rate", "jitter"][:len(feature_names)]
            
    explanation_str = " ".join(explanations)
    
    return {
        "top_features": top_features,
        "explanation": explanation_str
    }
