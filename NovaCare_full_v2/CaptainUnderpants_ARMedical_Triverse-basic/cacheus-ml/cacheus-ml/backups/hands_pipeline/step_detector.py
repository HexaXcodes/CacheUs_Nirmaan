from pathlib import Path

import numpy as np

from src.landmarks.features import sequence_to_array


class TemporalStepDetector:
    """
    Temporal detector + trained inhaler step classifier.
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

    def __init__(
        self,
        model_path="data/processed/inhaler/models/baseline.pkl",
        minimum_active_frames=3,
    ):
        self.minimum_active_frames = minimum_active_frames

        import pickle

        with open(model_path, "rb") as f:
            self.model = pickle.load(f)

    def analyze(self, landmark_json):
        features = sequence_to_array(landmark_json)

        active_frames = np.any(features != 0, axis=1)

        active_count = int(np.sum(active_frames))
        total_frames = len(active_frames)

        usable = active_count >= self.minimum_active_frames

        confidence = (
            active_count / total_frames
            if total_frames > 0
            else 0.0
        )

        return {
            "usable": usable,
            "active_frames": active_count,
            "total_frames": total_frames,
            "confidence": float(confidence),
        }

    def predict(self, landmark_json):
        """
        Predict the inhaler workflow step for one sequence.
        """

        activity = self.analyze(landmark_json)

        if not activity["usable"]:
            return None

        features = sequence_to_array(landmark_json)

        flattened = features.reshape(1, -1)

        class_index = int(
            self.model.predict(flattened)[0]
        )

        confidence = 0.0

        if hasattr(self.model, "predict_proba"):
            probabilities = self.model.predict_proba(
                flattened
            )[0]

            confidence = float(
                probabilities[class_index]
            )

        return {
            "step": self.CLASSES[class_index],
            "class_index": class_index,
            "confidence": confidence,
        }

    def process(self, landmark_json):
        activity = self.analyze(landmark_json)

        prediction = None

        if activity["usable"]:
            prediction = self.predict(landmark_json)

        return {
            "activity": activity,
            "prediction": prediction,
        }


if __name__ == "__main__":
    import json
    import sys

    if len(sys.argv) != 2:
        print(
            "Usage:\n"
            "python -m src.temporal.step_detector "
            "<landmark_json>"
        )
        raise SystemExit(1)

    path = Path(sys.argv[1])

    detector = TemporalStepDetector()

    result = detector.process(path)

    print("Sequence:", path.name)
    print(
        "Active frames:",
        result["activity"]["active_frames"],
    )
    print(
        "Total frames:",
        result["activity"]["total_frames"],
    )
    print(
        "Activity confidence:",
        f'{result["activity"]["confidence"]:.3f}',
    )
    print(
        "Usable:",
        result["activity"]["usable"],
    )
    print()
    print("Prediction:")

    if result["prediction"] is None:
        print("  None")
    else:
        print(
            "  Step:",
            result["prediction"]["step"],
        )
        print(
            "  Class:",
            result["prediction"]["class_index"],
        )
        print(
            "  Confidence:",
            f'{result["prediction"]["confidence"]:.4f}',
        )