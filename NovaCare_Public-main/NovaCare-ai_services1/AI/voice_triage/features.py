import numpy as np
import librosa

def estimate_frame_f0(frame: np.ndarray, sr: int, f0_min: float = 50.0, f0_max: float = 500.0) -> float:
    """
    Estimates the fundamental frequency (F0) of a single frame using autocorrelation.
    R(k) = sum(x(n) * x(n-k))
    F0 = sr / argmax(R(k))
    """
    n = len(frame)
    if np.max(np.abs(frame)) < 1e-4:
        return 0.0  # Silent/unvoiced frame
        
    # Calculate autocorrelation using numpy
    corr = np.correlate(frame, frame, mode='full')
    r = corr[n-1:]  # Keep lags >= 0
    
    # Map F0 range limits to lag ranges
    k_min = int(np.floor(sr / f0_max))
    k_max = int(np.ceil(sr / f0_min))
    k_min = max(1, min(k_min, n - 1))
    k_max = max(1, min(k_max, n - 1))
    
    if k_min >= k_max:
        return 0.0
        
    # Search for peak in the valid lag slice [k_min, k_max]
    lag_slice = r[k_min:k_max+1]
    if len(lag_slice) == 0:
        return 0.0
    peak_idx = np.argmax(lag_slice) + k_min
    
    if r[peak_idx] <= 0:
        return 0.0
        
    f0 = sr / peak_idx
    return float(f0)

def estimate_frame_hnr(frame: np.ndarray, sr: int, f0_min: float = 50.0, f0_max: float = 500.0) -> float:
    """
    Estimates the Harmonics-to-Noise Ratio (HNR) of a single voiced frame.
    HNR = 10 * log10(R(k_opt) / (R(0) - R(k_opt)))
    """
    n = len(frame)
    r0 = np.sum(frame ** 2)
    if r0 < 1e-6:
        return 0.0
        
    corr = np.correlate(frame, frame, mode='full')
    r = corr[n-1:]
    
    k_min = int(np.floor(sr / f0_max))
    k_max = int(np.ceil(sr / f0_min))
    k_min = max(1, min(k_min, n - 1))
    k_max = max(1, min(k_max, n - 1))
    
    if k_min >= k_max:
        return 0.0
        
    lag_slice = r[k_min:k_max+1]
    if len(lag_slice) == 0:
        return 0.0
    peak_idx = np.argmax(lag_slice) + k_min
    r_k = r[peak_idx]
    
    if r_k <= 0 or r_k >= r0:
        return 0.0
        
    noise_energy = r0 - r_k
    hnr = 10 * np.log10(r_k / noise_energy)
    return float(hnr)

def detect_pauses(y_clean: np.ndarray, sr: int, config: dict):
    """
    Detects silent pause segments on the pre-trimmed clean audio.
    Computes avg_pause_duration and pause_ratio.
    """
    threshold = config.get("silence_energy_threshold", 0.005)
    frame_length = 1024
    hop_length = 512
    
    total_duration = len(y_clean) / sr
    if total_duration == 0:
        return 0.0, 0.0
        
    # Frame the signal
    frames = librosa.util.frame(y_clean, frame_length=frame_length, hop_length=hop_length)
    # Shape: (frame_length, num_frames)
    
    # Compute energy for each frame
    energies = np.sum(frames ** 2, axis=0) / frame_length
    
    # Identify silent frames
    silent_mask = energies < threshold
    
    # Group silent frames into contiguous pause segments
    pauses = []
    current_pause_frames = 0
    
    frame_duration = hop_length / sr
    
    for is_silent in silent_mask:
        if is_silent:
            current_pause_frames += 1
        else:
            if current_pause_frames > 0:
                pauses.append(current_pause_frames * frame_duration)
                current_pause_frames = 0
    if current_pause_frames > 0:
        pauses.append(current_pause_frames * frame_duration)
        
    # Calculate statistics
    avg_pause_duration = float(np.mean(pauses)) if len(pauses) > 0 else 0.0
    total_silence_time = float(np.sum(pauses))
    pause_ratio = float(total_silence_time / total_duration)
    
    return avg_pause_duration, min(1.0, pause_ratio)

def extract_acoustic_features(y_trimmed: np.ndarray, y_clean: np.ndarray, sr: int, config: dict):
    """
    Extracts a highly rigorous scientifically valid 51-length feature vector of biomarkers.
    """
    f0_min = config.get("f0_min", 50.0)
    f0_max = config.get("f0_max", 500.0)
    
    # --- 1. Frame analysis for F0, Jitter, Shimmer, HNR ---
    frame_length = 2048
    hop_length = 512
    
    # Frame the trimmed signal
    if len(y_trimmed) >= frame_length:
        frames = librosa.util.frame(y_trimmed, frame_length=frame_length, hop_length=hop_length)
        # Transpose to shape (num_frames, frame_length)
        frames = frames.T
    else:
        frames = np.array([y_trimmed]) if len(y_trimmed) > 0 else np.array([])
        
    f0_values = []
    voiced_indices = []
    voiced_frames = []
    voiced_f0 = []
    
    for i, frame in enumerate(frames):
        # Ensure frame is long enough
        if len(frame) < 128:
            continue
        f0 = estimate_frame_f0(frame, sr, f0_min, f0_max)
        f0_values.append(f0)
        if f0 > 0.0:
            voiced_indices.append(i)
            voiced_frames.append(frame)
            voiced_f0.append(f0)
            
    # Calculate F0 statistics
    if len(voiced_f0) > 0:
        f0_mean = float(np.mean(voiced_f0))
        f0_std = float(np.std(voiced_f0))
        f0_min_val = float(np.min(voiced_f0))
        f0_max_val = float(np.max(voiced_f0))
        f0_median = float(np.median(voiced_f0))
    else:
        f0_mean = 0.0
        f0_std = 0.0
        f0_min_val = 0.0
        f0_max_val = 0.0
        f0_median = 0.0
        
    # Calculate Jitter: mean(|T_i - T_{i+1}|) / mean(T_i)
    if len(voiced_f0) >= 2:
        periods = 1.0 / np.array(voiced_f0)
        period_diffs = np.abs(periods[:-1] - periods[1:])
        jitter = float(np.mean(period_diffs) / np.mean(periods))
    else:
        jitter = 0.0
        
    # Calculate Shimmer: mean(|A_i - A_{i+1}|) / mean(A_i)
    if len(voiced_frames) >= 2:
        amplitudes = np.array([np.max(np.abs(f)) for f in voiced_frames])
        amp_mean = np.mean(amplitudes)
        if amp_mean > 0:
            amp_diffs = np.abs(amplitudes[:-1] - amplitudes[1:])
            shimmer = float(np.mean(amp_diffs) / amp_mean)
        else:
            shimmer = 0.0
    else:
        shimmer = 0.0
        
    # Calculate HNR statistics
    hnr_values = []
    for frame in voiced_frames:
        hnr = estimate_frame_hnr(frame, sr, f0_min, f0_max)
        hnr_values.append(hnr)
        
    if len(hnr_values) > 0:
        hnr_mean = float(np.mean(hnr_values))
        hnr_std = float(np.std(hnr_values))
        hnr_min = float(np.min(hnr_values))
        hnr_max = float(np.max(hnr_values))
        hnr_median = float(np.median(hnr_values))
    else:
        hnr_mean = 0.0
        hnr_std = 0.0
        hnr_min = 0.0
        hnr_max = 0.0
        hnr_median = 0.0
        
    # --- 2. Speaking Rate ---
    total_trimmed_duration = len(y_trimmed) / sr
    if total_trimmed_duration > 0:
        speaking_rate = float(len(voiced_frames) / total_trimmed_duration)
    else:
        speaking_rate = 0.0
        
    # --- 3. Pause Statistics (on y_clean) ---
    avg_pause_duration, pause_ratio = detect_pauses(y_clean, sr, config)
    
    # --- 4. MFCC Features ---
    # 13 coefficients -> mean + std = 26 features
    if len(y_trimmed) > 128:
        mfccs = librosa.feature.mfcc(y=y_trimmed, sr=sr, n_mfcc=13)
        mfcc_means = np.mean(mfccs, axis=1)
        mfcc_stds = np.std(mfccs, axis=1)
    else:
        mfcc_means = np.zeros(13)
        mfcc_stds = np.zeros(13)
        
    # --- 5. Spectral Shape Descriptors (10 features) ---
    if len(y_trimmed) > 128:
        # Centroid
        spec_cent = librosa.feature.spectral_centroid(y=y_trimmed, sr=sr)
        sc_mean, sc_std = float(np.mean(spec_cent)), float(np.std(spec_cent))
        # Bandwidth
        spec_bw = librosa.feature.spectral_bandwidth(y=y_trimmed, sr=sr)
        sb_mean, sb_std = float(np.mean(spec_bw)), float(np.std(spec_bw))
        # Rolloff
        spec_roll = librosa.feature.spectral_rolloff(y=y_trimmed, sr=sr)
        sr_mean, sr_std = float(np.mean(spec_roll)), float(np.std(spec_roll))
        # ZCR
        zcr = librosa.feature.zero_crossing_rate(y=y_trimmed)
        z_mean, z_std = float(np.mean(zcr)), float(np.std(zcr))
        # RMS
        rms = librosa.feature.rms(y=y_trimmed)
        r_mean, r_std = float(np.mean(rms)), float(np.std(rms))
    else:
        sc_mean, sc_std = 0.0, 0.0
        sb_mean, sb_std = 0.0, 0.0
        sr_mean, sr_std = 0.0, 0.0
        z_mean, z_std = 0.0, 0.0
        r_mean, r_std = 0.0, 0.0
        
    # --- 6. Assemble standard named features in a fixed vector ---
    feature_dict = {
        "f0_mean": f0_mean,
        "f0_std": f0_std,
        "f0_min": f0_min_val,
        "f0_max": f0_max_val,
        "f0_median": f0_median,
        "jitter": jitter,
        "shimmer": shimmer,
        "hnr_mean": hnr_mean,
        "hnr_std": hnr_std,
        "hnr_min": hnr_min,
        "hnr_max": hnr_max,
        "hnr_median": hnr_median,
        "speaking_rate": speaking_rate,
        "avg_pause_duration": avg_pause_duration,
        "pause_ratio": pause_ratio,
    }
    
    # Add MFCC means & stds
    for idx in range(13):
        feature_dict[f"mfcc_mean_{idx}"] = float(mfcc_means[idx])
        feature_dict[f"mfcc_std_{idx}"] = float(mfcc_stds[idx])
        
    # Add spectral shapes
    feature_dict["spectral_centroid_mean"] = sc_mean
    feature_dict["spectral_centroid_std"] = sc_std
    feature_dict["spectral_bandwidth_mean"] = sb_mean
    feature_dict["spectral_bandwidth_std"] = sb_std
    feature_dict["spectral_rolloff_mean"] = sr_mean
    feature_dict["spectral_rolloff_std"] = sr_std
    feature_dict["zero_crossing_rate_mean"] = z_mean
    feature_dict["zero_crossing_rate_std"] = z_std
    feature_dict["rms_mean"] = r_mean
    feature_dict["rms_std"] = r_std
    
    # Separate names and values in an ordered fashion
    feature_names = list(feature_dict.keys())
    feature_vector = np.array([feature_dict[name] for name in feature_names], dtype=np.float32)
    
    return feature_vector, feature_names
