import json
from pathlib import Path

import numpy as np

from src.landmarks.features import sequence_to_array


LABELS_PATH = Path(
    "data/processed/inhaler/sequence_labels.json"
)

LANDMARKS_DIR = Path(
    "data/processed/inhaler/landmarks"
)

OUTPUT_DIR = Path(
    "data/processed/inhaler/training"
)

X_PATH = OUTPUT_DIR / "X.npy"
Y_PATH = OUTPUT_DIR / "y.npy"
META_PATH = OUTPUT_DIR / "metadata.json"


STEP_NAMES = [
    "remove_cap",
    "shake_inhaler",
    "exhale_away",
    "position_mouthpiece",
    "begin_slow_inhalation",
    "actuate_during_inhalation",
    "continue_inhalation",
    "breath_hold",
]


def load_labels():
    with LABELS_PATH.open() as f:
        return json.load(f)


def load_sequence_features(sequence_name):
    path = LANDMARKS_DIR / f"{sequence_name}.json"

    if not path.exists():
        return None

    return sequence_to_array(path)


def main():
    data = load_labels()

    X = []
    y = []
    metadata = []

    for sequence in data["sequences"]:
        label = sequence["label"]

        if label is None:
            continue

        sequence_name = sequence["sequence"]
        step_name = label["step_name"]

        if step_name not in STEP_NAMES:
            print(
                f"WARNING: unknown label "
                f"{step_name} for {sequence_name}"
            )
            continue

        features = load_sequence_features(sequence_name)

        if features is None:
            print(
                f"WARNING: missing landmarks "
                f"for {sequence_name}"
            )
            continue

        X.append(features)
        y.append(STEP_NAMES.index(step_name))

        metadata.append(
            {
                "sequence": sequence_name,
                "step_id": label["step_id"],
                "step_name": step_name,
                "start_seconds": sequence[
                    "start_seconds"
                ],
                "end_seconds": sequence[
                    "end_seconds"
                ],
            }
        )

    if not X:
        raise RuntimeError(
            "No training sequences found."
        )

    X = np.asarray(X, dtype=np.float32)
    y = np.asarray(y, dtype=np.int64)

    OUTPUT_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    np.save(X_PATH, X)
    np.save(Y_PATH, y)

    with META_PATH.open("w") as f:
        json.dump(
            {
                "num_samples": len(X),
                "shape": list(X.shape),
                "num_classes": len(STEP_NAMES),
                "classes": STEP_NAMES,
                "metadata": metadata,
            },
            f,
            indent=2,
        )

    print("========== TRAINING DATASET ==========")
    print(f"Samples:     {len(X)}")
    print(f"Shape:       {X.shape}")
    print(f"Labels:      {y.shape}")
    print(f"Classes:     {len(STEP_NAMES)}")
    print()
    print("Classes:")

    for index, name in enumerate(STEP_NAMES):
        count = int(np.sum(y == index))
        print(f"  {index}: {name:32s} {count}")

    print()
    print(f"Saved: {X_PATH}")
    print(f"Saved: {Y_PATH}")
    print(f"Saved: {META_PATH}")
    print("=======================================")


if __name__ == "__main__":
    main()