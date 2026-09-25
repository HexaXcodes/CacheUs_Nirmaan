"""Signal-quality gate + windowing for the PPG service.

backend_ml_package (Experiment 2) has no signal-quality check and only accepts
exactly 1250 samples at 125 Hz. NovaCare's backend requires a quality score and
an accept/reject decision, and hardware sends whatever rate/length it recorded
(20-500 Hz, 5-60 s). This module bridges the two:

  raw samples @ any rate -> resample to 125 Hz -> pick the best 10 s window
  -> hard checks + heuristic score -> (accept/reject, score, reason)

The checks and thresholds below are simple heuristics written for this
integration. They are NOT clinically validated and were NOT tuned on
MAX30102 / Uno data - only sanity-checked on synthetic waveforms.
"""
from dataclasses import dataclass

import numpy as np
from scipy.signal import butter, filtfilt

from backend_ml_package.inference import DEFAULT_FS, detect_peaks, preprocess_signal

FS = DEFAULT_FS                 # 125 Hz, required by the model package
WINDOW_S = 10
WINDOW_N = FS * WINDOW_S        # 1250 samples, required by the model package
WINDOW_STEP_N = FS              # candidate windows start every 1 s

# --- thresholds (heuristic) -------------------------------------------------
MIN_HR_BPM, MAX_HR_BPM = 40.0, 180.0
MIN_PEAKS = 5
MAX_INTERVAL_CV = 0.35          # std/mean of peak-to-peak intervals
CLIP_RUN_S = 0.30               # this long at the min or max value == clipping
MIN_SCORE = 0.50                # combined score needed to accept
CLIP_FRACTION = 0.03            # share of samples piled on the min or max value...
CLIP_MIN_DISTINCT = 100         # ...counts as clipping only if the signal otherwise has fine resolution

MSG_SHORT = f"Recording too short: at least {WINDOW_S} seconds are needed. Keep your finger on the sensor and retry."
MSG_FLAT = "No signal variation detected. Check the sensor connection and finger placement, then retry."
MSG_CLIPPED = "Signal is saturated (flat at its maximum or minimum). Reduce finger pressure or ambient light, then retry."
MSG_NO_PULSE = "No clear pulse detected. Keep your finger still on the sensor, shield it from room light, and retry."
MSG_IRREGULAR = "Pulse looks too irregular. Keep your hand still and retry."
MSG_NOISY = "Pulse signal is too weak or noisy. Keep your finger still and shielded from light, then retry."


@dataclass
class Assessment:
    acceptable: bool
    score: float
    reason: str | None
    heart_rate_bpm: float | None = None


def resample_to_fs(samples, fs_in, fs_out=FS):
    """Linear resample to fs_out Hz (zero-phase anti-alias low-pass first if downsampling)."""
    x = np.asarray(samples, dtype=np.float64)
    if abs(fs_in - fs_out) < 1e-9:
        return x
    if fs_in > fs_out:
        cutoff = 0.8 * fs_out / 2                      # 50 Hz, above the 8 Hz band we use
        b, a = butter(4, cutoff / (fs_in / 2), btype="low")
        x = filtfilt(b, a, x)
    t_in = np.arange(len(x)) / fs_in
    n_out = int(np.floor(t_in[-1] * fs_out)) + 1
    return np.interp(np.arange(n_out) / fs_out, t_in, x)


def _longest_run(mask):
    if not mask.any():
        return 0
    d = np.diff(np.concatenate(([0], mask.astype(np.int8), [0])))
    return int((np.flatnonzero(d == -1) - np.flatnonzero(d == 1)).max())


def raw_signal_problem(raw, fs_in):
    """Checks on the ORIGINAL samples (before resampling smooths flat runs)."""
    raw = np.asarray(raw, dtype=np.float64)
    if not np.isfinite(raw).all() or np.ptp(raw) == 0:
        return MSG_FLAT
    run = max(_longest_run(raw == raw.min()), _longest_run(raw == raw.max()))
    if run / fs_in >= CLIP_RUN_S:                       # one long flat stretch at a rail
        return MSG_CLIPPED
    # Flat-topped peaks/troughs repeated every beat: a spike in the histogram at the
    # extreme value while the rest of the signal has fine resolution. (A low-amplitude,
    # coarsely quantised signal legitimately repeats its min/max, so it is exempt.)
    at_extreme = max((raw == raw.min()).mean(), (raw == raw.max()).mean())
    if at_extreme >= CLIP_FRACTION and len(np.unique(raw)) >= CLIP_MIN_DISTINCT:
        return MSG_CLIPPED
    return None


def assess_window(window):
    """Assess one 1250-sample, 125 Hz window (raw, unfiltered)."""
    xp = preprocess_signal(window, FS)
    peaks = detect_peaks(xp, FS)
    if len(peaks) < MIN_PEAKS:
        return Assessment(False, 0.0, MSG_NO_PULSE)

    intervals = np.diff(peaks) / FS
    hr = float(60.0 / intervals.mean())
    cv = float(intervals.std() / intervals.mean())

    # 1) rhythm regularity
    regularity = float(np.clip(1.0 - cv / MAX_INTERVAL_CV, 0.0, 1.0))

    # 2) share of 0.5-8 Hz power sitting on the pulse fundamental + 2nd harmonic
    power = np.abs(np.fft.rfft(xp)) ** 2
    freqs = np.fft.rfftfreq(len(xp), d=1.0 / FS)
    band = (freqs >= 0.5) & (freqs <= 8.0)
    f0 = hr / 60.0
    on_pulse = band & ((np.abs(freqs - f0) <= 0.2) | (np.abs(freqs - 2 * f0) <= 0.2))
    spectral = float(np.clip((power[on_pulse].sum() / power[band].sum()) / 0.5, 0.0, 1.0))

    # 3) beat-to-beat similarity (each beat vs. the median beat)
    beats = []
    for a, b in zip(peaks[:-1], peaks[1:]):
        seg = xp[a:b + 1]
        beats.append(np.interp(np.linspace(0, len(seg) - 1, 40), np.arange(len(seg)), seg))
    beats = np.asarray(beats)
    template = np.median(beats, axis=0)
    corrs = [np.corrcoef(bt, template)[0, 1] for bt in beats]
    corr = float(np.nanmean(corrs)) if np.isfinite(corrs).any() else 0.0
    similarity = float(np.clip((corr - 0.2) / 0.7, 0.0, 1.0))

    score = float(np.mean([regularity, spectral, similarity]))

    if not (MIN_HR_BPM <= hr <= MAX_HR_BPM):
        return Assessment(False, score, MSG_NO_PULSE, hr)
    if cv > MAX_INTERVAL_CV:
        return Assessment(False, score, MSG_IRREGULAR, hr)
    if score < MIN_SCORE:
        return Assessment(False, score, MSG_NOISY, hr)
    return Assessment(True, score, None, hr)


def select_window(samples, fs_in, invert=False):
    """Returns (assessment, window). window is None when nothing could be assessed."""
    raw = np.asarray(samples, dtype=np.float64)
    problem = raw_signal_problem(raw, fs_in)
    if problem:
        return Assessment(False, 0.0, problem), None

    x = resample_to_fs(raw, fs_in)
    if invert:
        x = -x
    if len(x) < WINDOW_N:
        return Assessment(False, 0.0, MSG_SHORT), None

    best = None
    for start in range(0, len(x) - WINDOW_N + 1, WINDOW_STEP_N):
        win = x[start:start + WINDOW_N]
        result = assess_window(win)
        # prefer passing windows, then higher score
        key = (result.acceptable, result.score)
        if best is None or key > best[0]:
            best = (key, result, win)
    return best[1], best[2]
