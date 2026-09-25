"""
NovaCare Experiment 2 runtime inference.

This module contains the exact validated preprocessing, peak detection,
feature extraction, and saved Linear Regression inference pipeline.

Experiment 2 only:
- SBP model: linear_regression_sbp.joblib
- DBP model: linear_regression_dbp.joblib
- 23 model features
- Sampling rate: 125 Hz
"""

from pathlib import Path

import joblib
import numpy as np
from scipy.signal import butter, filtfilt, find_peaks
from scipy.stats import skew, kurtosis


MODEL_FEATURES = [
    "n_peaks",
    "peak_interval_mean_s",
    "peak_interval_std_s",
    "rise_time_mean_s",
    "rise_time_std_s",
    "fall_time_mean_s",
    "fall_time_std_s",
    "pulse_width_mean_s",
    "pulse_width_std_s",
    "peak_amplitude_mean",
    "peak_amplitude_std",
    "pulse_amplitude_mean",
    "pulse_amplitude_std",
    "pulse_area_mean",
    "pulse_area_std",
    "rising_slope_mean",
    "rising_slope_std",
    "falling_slope_mean",
    "falling_slope_std",
    "signal_mean",
    "signal_skewness",
    "signal_kurtosis",
    "dominant_frequency_hz",
]

DEFAULT_FS = 125


def preprocess_signal(x, fs=DEFAULT_FS):
    """Apply the exact validated Experiment 2 preprocessing."""
    x = np.asarray(x, dtype=np.float64).copy()

    finite = np.isfinite(x)

    if not finite.all():
        if finite.sum() < 2:
            raise ValueError("Signal does not contain enough finite samples.")

        idx = np.arange(len(x))
        x[~finite] = np.interp(
            idx[~finite],
            idx[finite],
            x[finite],
        )

    low = 0.5 / (fs / 2)
    high = 8.0 / (fs / 2)

    b, a = butter(
        4,
        [low, high],
        btype="bandpass",
    )

    x = filtfilt(b, a, x)

    x = x - np.mean(x)

    std = np.std(x)

    if std > 0:
        x = x / std

    return x.astype(np.float32)


def detect_peaks(x, fs=DEFAULT_FS):
    """Apply the exact validated Experiment 2 peak detector."""
    min_distance = int(fs * 60 / 200)
    prominence = 0.30 * np.std(x)

    peaks, _ = find_peaks(
        x,
        distance=min_distance,
        prominence=prominence,
    )

    return peaks


def extract_features(x, fs=DEFAULT_FS):
    """Extract the exact validated 23 model features."""
    peaks = detect_peaks(x, fs)

    if len(peaks) < 3:
        raise ValueError(
            f"Too few peaks for morphology features: {len(peaks)}"
        )

    peak_intervals = np.diff(peaks) / fs

    peak_interval_mean = np.mean(peak_intervals)
    peak_interval_std = np.std(peak_intervals)

    rise_times = []
    fall_times = []
    pulse_widths = []

    peak_amplitudes = []
    pulse_amplitudes = []
    pulse_areas = []

    rising_slopes = []
    falling_slopes = []

    for i in range(1, len(peaks) - 1):
        prev_peak = peaks[i - 1]
        peak = peaks[i]
        next_peak = peaks[i + 1]

        pre_region = x[prev_peak:peak + 1]
        pre_trough = prev_peak + np.argmin(pre_region)

        post_region = x[peak:next_peak + 1]
        post_trough = peak + np.argmin(post_region)

        rise_time = (peak - pre_trough) / fs
        fall_time = (post_trough - peak) / fs
        pulse_width = (next_peak - peak) / fs

        rise_times.append(rise_time)
        fall_times.append(fall_time)
        pulse_widths.append(pulse_width)

        peak_amplitudes.append(x[peak])

        # Confirmed definition from the validated pipeline:
        # current peak -> following trough.
        pulse_amplitudes.append(
            x[peak] - x[post_trough]
        )

        pulse_areas.append(
            np.trapezoid(
                x[peak:next_peak + 1],
                dx=1 / fs,
            )
        )

        if rise_time > 0:
            rising_slopes.append(
                (x[peak] - x[pre_trough]) / rise_time
            )

        if fall_time > 0:
            falling_slopes.append(
                (x[post_trough] - x[peak]) / fall_time
            )

    signal_mean = np.mean(x)
    signal_skewness = skew(x)
    signal_kurtosis = kurtosis(x)

    n = len(x)

    freqs = np.fft.rfftfreq(
        n,
        d=1 / fs,
    )

    spectrum = np.abs(
        np.fft.rfft(x)
    )

    valid = freqs > 0

    dominant_frequency_hz = freqs[valid][
        np.argmax(spectrum[valid])
    ]

    return {
        "n_peaks": len(peaks),
        "peak_interval_mean_s": peak_interval_mean,
        "peak_interval_std_s": peak_interval_std,
        "rise_time_mean_s": np.mean(rise_times),
        "rise_time_std_s": np.std(rise_times),
        "fall_time_mean_s": np.mean(fall_times),
        "fall_time_std_s": np.std(fall_times),
        "pulse_width_mean_s": np.mean(pulse_widths),
        "pulse_width_std_s": np.std(pulse_widths),
        "peak_amplitude_mean": np.mean(peak_amplitudes),
        "peak_amplitude_std": np.std(peak_amplitudes),
        "pulse_amplitude_mean": np.mean(pulse_amplitudes),
        "pulse_amplitude_std": np.std(pulse_amplitudes),
        "pulse_area_mean": np.mean(pulse_areas),
        "pulse_area_std": np.std(pulse_areas),
        "rising_slope_mean": np.mean(rising_slopes),
        "rising_slope_std": np.std(rising_slopes),
        "falling_slope_mean": np.mean(falling_slopes),
        "falling_slope_std": np.std(falling_slopes),
        "signal_mean": signal_mean,
        "signal_skewness": signal_skewness,
        "signal_kurtosis": signal_kurtosis,
        "dominant_frequency_hz": dominant_frequency_hz,
    }


def load_models(model_dir=None):
    """Load the saved Experiment 2 SBP and DBP models."""
    if model_dir is None:
        model_dir = Path(__file__).resolve().parent
    else:
        model_dir = Path(model_dir)

    sbp_model = joblib.load(
        model_dir / "linear_regression_sbp.joblib"
    )
    dbp_model = joblib.load(
        model_dir / "linear_regression_dbp.joblib"
    )

    if sbp_model.n_features_in_ != 23:
        raise ValueError("SBP model does not expect 23 features.")

    if dbp_model.n_features_in_ != 23:
        raise ValueError("DBP model does not expect 23 features.")

    return sbp_model, dbp_model


def analyze_ppg(ppg, fs=DEFAULT_FS, model_dir=None):
    """
    Run one PPG waveform through the validated Experiment 2 pipeline.

    Returns:
        dict containing heart rate, the 23 features, and experimental SBP/DBP.
    """
    if fs != DEFAULT_FS:
        raise ValueError(
            f"Experiment 2 runtime pipeline expects fs={DEFAULT_FS} Hz."
        )

    x = np.asarray(ppg, dtype=np.float64).reshape(-1)

    if len(x) != 1250:
        raise ValueError(
            f"Experiment 2 runtime pipeline expects 1250 samples; "
            f"received {len(x)}."
        )

    x_preprocessed = preprocess_signal(x, fs)
    peaks = detect_peaks(x_preprocessed, fs)

    if len(peaks) < 3:
        raise ValueError(
            f"Too few peaks for morphology features: {len(peaks)}"
        )

    features = extract_features(x_preprocessed, fs)

    feature_vector = np.asarray(
        [features[name] for name in MODEL_FEATURES],
        dtype=np.float64,
    ).reshape(1, -1)

    if not np.isfinite(feature_vector).all():
        raise ValueError("Non-finite model features produced.")

    sbp_model, dbp_model = load_models(model_dir)

    predicted_sbp = float(sbp_model.predict(feature_vector)[0])
    predicted_dbp = float(dbp_model.predict(feature_vector)[0])

    peak_intervals = np.diff(peaks) / fs
    heart_rate_bpm = float(60.0 / np.mean(peak_intervals))

    if not (predicted_sbp > predicted_dbp):
        raise ValueError("Predicted SBP is not greater than predicted DBP.")

    return {
        "heart_rate_bpm": heart_rate_bpm,
        "features": features,
        "experimental_bp": {
            "systolic": predicted_sbp,
            "diastolic": predicted_dbp,
            "unit": "mmHg",
            "experimental": True,
        },
    }


__all__ = [
    "MODEL_FEATURES",
    "preprocess_signal",
    "detect_peaks",
    "extract_features",
    "load_models",
    "analyze_ppg",
]
