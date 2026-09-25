# ml-service/frame_features.py
# ============================================================================
#  Refactored from the friend's data/processed inference code
#  (cacheus-ml/cacheus-ml/src/temporal/frame_step_detector.py) — same
#  cv2.cvtColor -> cv2.resize((32,32)) -> /255.0 -> flatten steps, in the
#  same order, just separated from disk I/O so live in-memory camera frames
#  can be fed through it directly instead of round-tripping through a temp
#  directory of frame_*.jpg files.
#
#  This is a COPY, not the friend's original file — frame_step_detector.py
#  in the ML project is untouched, so their existing scripts/tests keep
#  working unmodified.
#
#  Model facts (see docs/PHASE_1_ML_INTEGRATION.md for the full disclosure):
#    - 8-class step classifier (WHICH step, never correct/incorrect
#      technique — see docs)
#    - Trained on n=32 labeled windows, all from ONE reference video, ONE
#      person, ONE session — no incorrect-technique examples exist
#    - Features are raw 32x32 grayscale pixels (NOT a learned embedding),
#      so this pipeline is sensitive to lighting/framing/background/camera
#      angle in a way a CNN embedding wouldn't be
# ============================================================================
from typing import Sequence

import cv2
import numpy as np

CLASSES = [
    "remove_cap",
    "shake_inhaler",
    "exhale_away",
    "position_mouthpiece",
    "begin_slow_inhalation",
    "actuate_during_inhalation",
    "continue_inhalation",
    "breath_hold",
]

FRAME_SIZE = (32, 32)  # (width, height) passed to cv2.resize, matches training exactly
EXPECTED_FRAMES = 20  # one prediction per 20-frame window (~0.8s at the training video's 25fps)


def frame_to_feature(image: np.ndarray) -> np.ndarray:
    """
    image: a BGR ndarray (matching cv2.imread's convention — see
    decode_frame() in main.py for why frames arriving as JPEG bytes over the
    wire are guaranteed to decode into this same convention).

    Identical to frame_step_detector.py's per-frame preprocessing:
    grayscale -> resize to 32x32 -> normalize to [0,1] -> flatten to 1024.
    """
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    small = cv2.resize(gray, FRAME_SIZE)
    normalized = small.astype(np.float32) / 255.0
    return normalized.flatten()


def frames_to_features(frames: Sequence[np.ndarray]) -> np.ndarray:
    """(N, 1024) array of per-frame features, N frames in chronological order."""
    return np.asarray([frame_to_feature(f) for f in frames], dtype=np.float32)


def frames_to_model_input(frames: Sequence[np.ndarray]) -> np.ndarray:
    """
    The exact shape frame_baseline.pkl expects: a single (1, 20*1024)=(1,20480)
    row — all 20 frames' flattened pixels concatenated, matching
    frame_step_detector.py's `features.reshape(1, -1)`.
    """
    features = frames_to_features(frames)
    return features.reshape(1, -1)
