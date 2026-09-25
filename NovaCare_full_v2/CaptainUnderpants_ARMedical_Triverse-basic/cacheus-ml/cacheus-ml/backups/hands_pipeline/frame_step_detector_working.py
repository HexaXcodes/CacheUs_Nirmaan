from pathlib import Path
import pickle

import cv2
import numpy as np


class FrameStepDetector:
    """
    Frame-only temporal step detector.

    Uses the experimental frame_baseline.pkl model.
    No hand landmarks, MediaPipe, hand detection, or motion features.
    """

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

    SIZE = (32, 32)
    EXPECTED_FRAMES = 20

    def __init__(
        self,
        model_path="data/processed/inhaler/frame_models/frame_baseline.pkl",
    ):
        self.model_path = Path(model_path)

        with self.model_path.open("rb") as f:
            self.model = pickle.load(f)

    def _load_frames(self, sequence_dir):
        sequence_dir = Path(sequence_dir)

        frame_paths = sorted(
            sequence_dir.glob("frame_*.jpg")
        )

        frames = []

        for frame_path in frame_paths:
            image = cv2.imread(str(frame_path))

            if image is None:
                continue

            gray = cv2.cvtColor(
                image,
                cv2.COLOR_BGR2GRAY,
            )

            small = cv2.resize(
                gray,
                self.SIZE,
            )

            normalized = (
                small.astype(np.float32) / 255.0
            )

            frames.append(normalized.flatten())

        return np.asarray(
            frames,
            dtype=np.float32,
        )

    def analyze(self, sequence_dir):
        features = self._load_frames(sequence_dir)

        total_frames = len(features)

        usable = (
            total_frames == self.EXPECTED_FRAMES
        )

        return {
            "usable": usable,
            "active_frames": total_frames,
            "total_frames": total_frames,
            "confidence": (
                1.0 if usable else 0.0
            ),
        }

    def predict(self, sequence_dir):
        activity = self.analyze(sequence_dir)

        if not activity["usable"]:
            return None

        features = self._load_frames(sequence_dir)

        flattened = features.reshape(1, -1)

        class_index = int(
            self.model.predict(flattened)[0]
        )

        confidence = 0.0

        if hasattr(self.model, "predict_proba"):
            probabilities = (
                self.model.predict_proba(
                    flattened
                )[0]
            )

            confidence = float(
                probabilities[class_index]
            )

        return {
            "step": self.CLASSES[class_index],
            "class_index": class_index,
            "confidence": confidence,
        }

    def process(self, sequence_dir):
        activity = self.analyze(sequence_dir)

        prediction = None

        if activity["usable"]:
            prediction = self.predict(
                sequence_dir
            )

        return {
            "sequence": Path(sequence_dir).name,
            "activity": activity,
            "prediction": prediction,
        }


if __name__ == "__main__":
    import json
    import sys

    if len(sys.argv) != 2:
        print(
            "Usage:\n"
            "python -m src.temporal.frame_step_detector "
            "<sequence_directory>"
        )
        raise SystemExit(1)

    detector = FrameStepDetector()

    result = detector.process(sys.argv[1])

    print(
        json.dumps(
            result,
            indent=2,
        )
    )
