import numpy as np
import librosa

def reduce_noise(y: np.ndarray, sr: int, config: dict) -> np.ndarray:
    """
    Applies Spectral Gating (Spectral Subtraction) noise reduction.
    Estimates the noise floor from the first 0.5 seconds of the signal.
    """
    noise_floor_duration = config.get("noise_floor_duration", 0.5)
    noise_samples = int(noise_floor_duration * sr)
    
    # Handle files shorter than the requested noise floor duration
    if len(y) <= noise_samples:
        noise_part = y
    else:
        noise_part = y[:noise_samples]
        
    if len(noise_part) == 0:
        return y
        
    # Compute STFT for noise floor and overall signal
    stft_noise = librosa.stft(noise_part)
    stft_signal = librosa.stft(y)
    
    # Estimate noise floor (mean magnitude per frequency bin)
    noise_magnitude = np.mean(np.abs(stft_noise), axis=1, keepdims=True)
    
    # Perform spectral subtraction
    signal_magnitude = np.abs(stft_signal)
    signal_phase = np.angle(stft_signal)
    
    # Subtract noise magnitude from signal magnitude (ensure floor of 0)
    clean_magnitude = np.maximum(signal_magnitude - noise_magnitude, 0.0)
    
    # Reconstruct the complex STFT representation and apply inverse STFT
    stft_clean = clean_magnitude * np.exp(1j * signal_phase)
    y_clean = librosa.istft(stft_clean)
    
    return y_clean

def trim_silence(y: np.ndarray, sr: int, config: dict) -> np.ndarray:
    """
    Removes silent segments from the audio using non-overlapping frame energy thresholding.
    frame_energy = sum(x^2) / N
    """
    threshold = config.get("silence_energy_threshold", 0.005)
    frame_length = 1024  # N
    
    num_frames = len(y) // frame_length
    if num_frames == 0:
        return y
        
    # Truncate to a multiple of frame_length
    y_truncated = y[:num_frames * frame_length]
    frames = y_truncated.reshape((num_frames, frame_length))
    
    # Compute energy for each frame: sum(x^2) / N
    energies = np.sum(frames ** 2, axis=1) / frame_length
    
    # Filter out frames below the energy threshold
    active_frames = frames[energies >= threshold]
    
    if len(active_frames) == 0:
        # If all frames are silence, avoid returning empty array
        return y
        
    # Flatten active frames back to a 1D audio array
    y_trimmed = active_frames.flatten()
    return y_trimmed

def normalize_signal(y: np.ndarray) -> np.ndarray:
    """
    Normalizes the signal amplitude: x_norm = x / max(|x|).
    """
    max_val = np.max(np.abs(y))
    if max_val > 0.0:
        return y / max_val
    return y
