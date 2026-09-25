import numpy as np
from scipy.signal import butter, filtfilt, find_peaks
from typing import List, Tuple, Dict, Any, Union


def butter_bandpass_filter(data: np.ndarray, lowcut: float, highcut: float, fs: float, order: int = 2) -> np.ndarray:
    """
    Applies a zero-phase Butterworth bandpass filter to the data.
    """
    nyq = 0.5 * fs
    low = lowcut / nyq
    high = highcut / nyq
    b, a = butter(order, [low, high], btype='band')
    y = filtfilt(b, a, data)
    return y


def detrend_signal(data: np.ndarray, window_size: int) -> np.ndarray:
    """
    Detrends the signal by subtracting a moving average.
    This removes low-frequency drift from respiration or lighting changes.
    """
    box = np.ones(window_size) / window_size
    mean_drift = np.convolve(data, box, mode='same')
    # Adjust boundaries since 'same' mode has boundary effects
    half_w = window_size // 2
    for i in range(half_w):
        mean_drift[i] = np.mean(data[:i + half_w])
        mean_drift[-i - 1] = np.mean(data[-i - half_w:])
    
    return data - mean_drift


def process_pos(rgb_signals: np.ndarray, fps: float) -> np.ndarray:
    """
    Plane-Orthogonal-to-Skin (POS) rPPG algorithm.
    Wang, W., et al. (2017). "Algorithmic Principles of Remote PPG".
    rgb_signals shape: (N, 3) where N is number of frames.
    """
    N = len(rgb_signals)
    bvp = np.zeros(N)
    
    # Sliding window size of 1.6 seconds (recommended by POS authors)
    l_win = int(1.6 * fps)
    if l_win % 2 != 0:
        l_win += 1
        
    if N <= l_win:
        # Fallback to green channel if video is too short
        return rgb_signals[:, 1]
        
    for i in range(0, N - l_win + 1):
        window = rgb_signals[i:i + l_win]
        
        # Temporal normalization
        mean_rgb = np.mean(window, axis=0)
        c_n = window / (mean_rgb + 1e-6)
        
        # Projection
        # S = P * C_n
        # P = [[0, 3, -2], [1.5, 1.5, -3]]
        # X = 3*G - 2*B
        # Y = 1.5*R + 1.5*G - 3*B
        s_x = 3 * c_n[:, 1] - 2 * c_n[:, 2]
        s_y = 1.5 * c_n[:, 0] + 1.5 * c_n[:, 1] - 3 * c_n[:, 2]
        
        # Tuning parameter alpha
        std_x = np.std(s_x)
        std_y = np.std(s_y)
        
        if std_y == 0:
            h_win = s_x
        else:
            alpha = std_x / std_y
            h_win = s_x - alpha * s_y
            
        # Overlap-add
        # We detrend the current window projection segment first
        h_win = h_win - np.mean(h_win)
        bvp[i:i + l_win] += h_win
        
    return bvp


def process_chrom(rgb_signals: np.ndarray, fps: float) -> np.ndarray:
    """
    Chrominance-based (CHROM) rPPG algorithm.
    De Haan, G., & Jeanne, V. (2013). "Robust Pulse Rate From Chrominance-Based rPPG".
    """
    # Standard chrominance signals
    # X = 3R - 2G
    # Y = 1.5R + 1.5G - 3B
    r_val = rgb_signals[:, 0]
    g_val = rgb_signals[:, 1]
    b_val = rgb_signals[:, 2]
    
    # 5-frame moving average to smooth raw signals
    w_smooth = max(3, int(fps / 6))
    if w_smooth % 2 == 0:
        w_smooth += 1
        
    kernel = np.ones(w_smooth) / w_smooth
    r_smooth = np.convolve(r_val, kernel, mode='same')
    g_smooth = np.convolve(g_val, kernel, mode='same')
    b_smooth = np.convolve(b_val, kernel, mode='same')
    
    x = 3 * r_smooth - 2 * g_smooth
    y = 1.5 * r_smooth + 1.5 * g_smooth - 3 * b_smooth
    
    # Bandpass filter the two chrominance signals
    # Range: 0.7 to 4.0 Hz (42 to 240 BPM)
    x_f = butter_bandpass_filter(x, 0.7, 4.0, fps)
    y_f = butter_bandpass_filter(y, 0.7, 4.0, fps)
    
    std_x = np.std(x_f)
    std_y = np.std(y_f)
    
    if std_y == 0:
        return x_f
        
    alpha = std_x / std_y
    bvp = x_f - alpha * y_f
    return bvp


def estimate_heart_rate_fft(bvp: np.ndarray, fps: float) -> float:
    """
    Calculates the heart rate (BPM) from the dominant peak in the FFT spectrum.
    Uses zero-padding to achieve high frequency resolution.
    Filters the spectrum within the heart rate band [45, 180] BPM.
    """
    n = len(bvp)
    # Zero-pad to at least 4096 points to get fine frequency resolution
    n_fft = max(4096, int(2 ** np.ceil(np.log2(n) + 2)))
    freqs = np.fft.rfftfreq(n_fft, d=1.0/fps)
    fft_vals = np.abs(np.fft.rfft(bvp, n=n_fft))
    
    # Focus on heart rate frequency band: 0.75 Hz (45 BPM) to 3.0 Hz (180 BPM)
    hr_min_hz = 45.0 / 60.0
    hr_max_hz = 180.0 / 60.0
    
    valid_idx = np.where((freqs >= hr_min_hz) & (freqs <= hr_max_hz))[0]
    if len(valid_idx) == 0:
        return 72.0  # Safe default if no valid frequencies
        
    peak_idx = valid_idx[np.argmax(fft_vals[valid_idx])]
    peak_freq = freqs[peak_idx]
    
    return float(peak_freq * 60.0)


def extract_hrv_metrics(bvp: np.ndarray, fps: float) -> Tuple[float, float, float]:
    """
    Detects peaks in the BVP signal and computes HRV metrics:
    - hr_peaks: Heart rate based on peak intervals (BPM)
    - sdnn: Standard deviation of NN intervals (ms)
    - rmssd: Root mean square of successive differences (ms)
    """
    # A heart rate of 180 BPM corresponds to peaks spaced by:
    # 30 fps / (180/60 beats/sec) = 10 frames
    # Let's set the minimum distance between peaks to prevent false double peaks
    min_dist = max(5, int(fps * 60.0 / 180.0))
    
    # Standardize BVP signal before peak detection
    bvp_std = (bvp - np.mean(bvp)) / (np.std(bvp) + 1e-6)
    
    # We find peaks that are above 0.2 standard deviations
    peaks, _ = find_peaks(bvp_std, distance=min_dist, prominence=0.2)
    
    if len(peaks) < 3:
        # Not enough peaks to compute HRV metrics reliably. Return defaults.
        return 72.0, 45.0, 35.0
        
    # Peak intervals in milliseconds
    intervals_ms = np.diff(peaks) * 1000.0 / fps
    
    # Filter out physiological outliers (e.g. intervals corresponding to <40 BPM or >200 BPM)
    # 40 BPM -> 1500 ms, 200 BPM -> 300 ms
    valid_intervals = intervals_ms[(intervals_ms >= 300.0) & (intervals_ms <= 1500.0)]
    
    if len(valid_intervals) < 2:
        return 72.0, 45.0, 35.0
        
    # Compute HRV metrics
    sdnn = float(np.std(valid_intervals))
    
    diffs = np.diff(valid_intervals)
    rmssd = float(np.sqrt(np.mean(diffs ** 2)))
    
    mean_interval_sec = np.mean(valid_intervals) / 1000.0
    hr_peaks = float(60.0 / mean_interval_sec)
    
    return hr_peaks, sdnn, rmssd


def estimate_respiratory_rate(bvp: np.ndarray, fps: float) -> float:
    """
    Estimates respiratory rate (breaths per minute) from the BVP amplitude modulation
    or the raw green channel low frequency spectrum.
    Uses zero-padding to achieve high frequency resolution.
    Typical adult respiration is 9 to 27 breaths per minute (0.15 Hz to 0.45 Hz).
    """
    n = len(bvp)
    
    # Extracted respiratory band: 0.15 Hz (9 breaths/min) to 0.45 Hz (27 breaths/min)
    rr_min_hz = 9.0 / 60.0
    rr_max_hz = 27.0 / 60.0
    
    # Method: extract the amplitude envelope of BVP and perform FFT
    # Simple envelope: absolute value of the BVP signal, lowpass filtered
    envelope = np.abs(bvp)
    
    # Lowpass filter the envelope at 0.5 Hz to keep only the breathing components
    nyq = 0.5 * fps
    b, a = butter(2, 0.5 / nyq, btype='low')
    envelope_f = filtfilt(b, a, envelope)
    
    # Zero-pad to at least 4096 points to get fine frequency resolution
    n_fft = max(4096, int(2 ** np.ceil(np.log2(n) + 2)))
    freqs = np.fft.rfftfreq(n_fft, d=1.0/fps)
    fft_vals = np.abs(np.fft.rfft(envelope_f, n=n_fft))
    
    valid_idx = np.where((freqs >= rr_min_hz) & (freqs <= rr_max_hz))[0]
    if len(valid_idx) == 0:
        return 16.0  # Safe average default
        
    peak_idx = valid_idx[np.argmax(fft_vals[valid_idx])]
    rr_bpm = float(freqs[peak_idx] * 60.0)
    
    return rr_bpm


def analyze_rppg_signal(signal: Union[List[float], List[List[float]]], fps: float = 30.0, algorithm: str = "pos") -> Dict[str, Any]:
    """
    Main entry point for signal analysis.
    Supports 1D green channel signal or 3D RGB signals.
    """
    sig_arr = np.array(signal, dtype=np.float64)
    
    if len(sig_arr) < int(5 * fps):
        # We need at least 5 seconds of signal for minimal processing
        raise ValueError(f"Signal is too short. Need at least {int(5 * fps)} samples for {fps} FPS (5 seconds).")
        
    # Check if signal is 1D (Green only) or 2D (RGB)
    if sig_arr.ndim == 1:
        # Green channel analysis
        # Detrend and bandpass filter directly
        detrended = detrend_signal(sig_arr, int(2.0 * fps))
        bvp = butter_bandpass_filter(detrended, 0.7, 4.0, fps)
    elif sig_arr.ndim == 2 and sig_arr.shape[1] >= 3:
        # RGB analysis
        rgb = sig_arr[:, :3]  # keep first 3 columns as R, G, B
        if algorithm.lower() == "pos":
            bvp = process_pos(rgb, fps)
        elif algorithm.lower() == "chrom":
            bvp = process_chrom(rgb, fps)
        else:
            # Fall back to green channel
            detrended = detrend_signal(rgb[:, 1], int(2.0 * fps))
            bvp = butter_bandpass_filter(detrended, 0.7, 4.0, fps)
    else:
        raise ValueError("Invalid signal dimension. Must be 1D (Green values) or 2D of shape (N, >=3) for RGB.")
        
    # Apply standard Butterworth bandpass filter on the final BVP signal
    bvp = butter_bandpass_filter(bvp, 0.75, 3.5, fps)
    
    # Calculate heart rate using FFT (more robust) and peaks (for HRV)
    hr_fft = estimate_heart_rate_fft(bvp, fps)
    _, sdnn, rmssd = extract_hrv_metrics(bvp, fps)
    
    hr_bpm = hr_fft
        
    # Estimate respiratory rate
    rr_rate = estimate_respiratory_rate(bvp, fps)
    
    # HRV Risk Flag logic:
    # Low HRV (RMSSD < 25ms or SDNN < 30ms) is standard clinical threshold for autonomic stress.
    # We set hrv_flag = True if either metric indicates stress.
    hrv_flag = bool(rmssd < 25.0 or sdnn < 30.0)
    
    return {
        "hrv_flag": hrv_flag,
        "hr_bpm": round(hr_bpm, 1),
        "rr_rate": round(rr_rate, 1),
        "sdnn": round(sdnn, 2),
        "rmssd": round(rmssd, 2)
    }
