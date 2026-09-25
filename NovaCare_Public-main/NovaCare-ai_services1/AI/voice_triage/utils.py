import os
import yaml

# Dynamically locate the AI root directory based on file structure
AI_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def get_ai_path(*paths):
    """
    Returns an absolute path relative to the /AI root folder.
    """
    return os.path.join(AI_DIR, *paths)

def load_config():
    """
    Loads YAML configuration or returns default parameters.
    """
    config_path = get_ai_path("configs", "feature_config.yaml")
    if not os.path.exists(config_path):
        return {
            "sampling_rate": 16000,
            "noise_floor_duration": 0.5,
            "silence_energy_threshold": 0.005,
            "f0_min": 50.0,
            "f0_max": 500.0,
            "jitter_threshold": 0.02,
            "shimmer_threshold": 0.05,
            "hnr_threshold": 15.0,
            "pause_ratio_threshold": 0.25,
            "speaking_rate_threshold": 3.0
        }
    with open(config_path, "r") as f:
        try:
            return yaml.safe_load(f)
        except Exception:
            # Fallback to default dictionary on failure
            return {
                "sampling_rate": 16000,
                "noise_floor_duration": 0.5,
                "silence_energy_threshold": 0.005,
                "f0_min": 50.0,
                "f0_max": 500.0,
                "jitter_threshold": 0.02,
                "shimmer_threshold": 0.05,
                "hnr_threshold": 15.0,
                "pause_ratio_threshold": 0.25,
                "speaking_rate_threshold": 3.0
            }

