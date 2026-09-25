import os
import tempfile
import librosa
from AI.voice_triage.utils import load_config
from AI.voice_triage.preprocess import reduce_noise, trim_silence, normalize_signal
from AI.voice_triage.features import extract_acoustic_features
from AI.voice_triage.model import predict_stress
from AI.voice_triage.interpret import interpret_prediction


def _to_wav(src: str) -> tuple[str, bool]:
    """
    Convert any audio format to a 16-bit PCM WAV using imageio_ffmpeg.
    Returns (path_to_wav, needs_cleanup).
    Falls back to the original path if already a WAV or conversion fails.
    """
    ext = os.path.splitext(src)[1].lower()
    if ext in (".wav",):
        return src, False
    try:
        import imageio_ffmpeg
        ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
        tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        tmp.close()
        import subprocess
        result = subprocess.run(
            [ffmpeg_exe, "-y", "-i", src, "-ar", "16000", "-ac", "1",
             "-sample_fmt", "s16", tmp.name],
            capture_output=True, timeout=30,
        )
        if result.returncode == 0:
            return tmp.name, True
        # ffmpeg failed — clean up and fall back
        os.unlink(tmp.name)
    except Exception:
        pass
    return src, False


def run_voice_triage(audio_path: str) -> dict:
    """
    Main entry point for Voice Triage.
    Accepts any browser audio format (webm, ogg, mp4, wav).
    Converts to WAV via imageio_ffmpeg before librosa processing.
    """
    # 1. Load configuration
    config = load_config()
    sr = config.get("sampling_rate", 16000)

    if not os.path.exists(audio_path):
        raise FileNotFoundError(f"Audio file not found: {audio_path}")

    # 2. Convert to WAV if needed (handles webm/ogg from browser MediaRecorder)
    wav_path, needs_cleanup = _to_wav(audio_path)

    # 2b. Load raw audio
    y, loaded_sr = librosa.load(wav_path, sr=sr)

    if needs_cleanup:
        try:
            os.unlink(wav_path)
        except OSError:
            pass
    
    # 3. Preprocess
    # - Apply Spectral Gating (Spectral Subtraction) noise reduction
    y_clean = reduce_noise(y, sr, config)
    
    # - Pause analysis and speaking rate are computed on pre-trimmed clean audio
    y_clean = normalize_signal(y_clean)
    
    # - Apply Silence Trimming based on frame-energy thresholding
    y_trimmed = trim_silence(y_clean, sr, config)
    y_trimmed = normalize_signal(y_trimmed)
    
    # 4. Extract scientifically valid acoustic features
    features, feature_names = extract_acoustic_features(y_trimmed, y_clean, sr, config)
    feature_dict = dict(zip(feature_names, features.tolist()))

    # 5. Score Stress using loaded XGBoost model or Fallback classifier
    stress_score, confidence_score, _, scaler = predict_stress(features, feature_names)
    
    # 6. Map to Risk Levels
    # if stress_score < 0.3 -> low
    # if 0.3-0.7 -> medium
    # if > 0.7 -> high
    if stress_score < 0.3:
        risk_level = "low"
    elif stress_score <= 0.7:
        risk_level = "medium"
    else:
        risk_level = "high"
        
    # 7. Generate Dynamic Explainability
    interpretation = interpret_prediction(features, feature_names, scaler, config)
    
    return {
        "stress_score": float(round(stress_score, 4)),
        "confidence_score": float(round(confidence_score, 4)),
        "risk_level": risk_level,
        "top_features": interpretation["top_features"],
        "explanation": interpretation["explanation"],
        "jitter": float(round(feature_dict.get("jitter", 0.0), 6)),
        "shimmer": float(round(feature_dict.get("shimmer", 0.0), 6)),
        "hnr": float(round(feature_dict.get("hnr_mean", feature_dict.get("hnr", 0.0)), 4)),
        "feature_vector": features.tolist(),
    }
