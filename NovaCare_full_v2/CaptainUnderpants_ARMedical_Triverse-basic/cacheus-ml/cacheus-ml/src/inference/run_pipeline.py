import json
from pathlib import Path

from src.temporal.workflow_adapter import WorkflowAdapter


TRAINING_DIR = Path(
    "data/processed/inhaler/sequences"
)

LABELS_PATH = Path(
    "data/processed/inhaler/sequence_labels.json"
)


def main():
    with LABELS_PATH.open() as f:
        data = json.load(f)

    sequences = sorted(
        data["sequences"],
        key=lambda x: x["start_seconds"],
    )

    adapter = WorkflowAdapter()

    print(
        "========== CACHEUS FRAME-ONLY PIPELINE =========="
    )
    print(
        f"Sequences: {len(sequences)}"
    )
    print(
        "Hand landmarks: DISABLED"
    )
    print(
        "Motion features: DISABLED"
    )
    print()

    for sequence in sequences:
        name = sequence["sequence"]

        sequence_dir = (
            TRAINING_DIR / name
        )

        if not sequence_dir.exists():
            print(
                f"{name}: MISSING FRAMES"
            )
            continue

        result = adapter.process(
            sequence_dir
        )

        prediction = result.get(
            "prediction"
        )

        if prediction:
            predicted = prediction["step"]
            confidence = prediction["confidence"]
        else:
            predicted = "-"
            confidence = 0.0

        workflow = result["workflow"]

        print(
            f"{name:16s} "
            f"pred={predicted:32s} "
            f"conf={confidence:.3f} "
            f"current={workflow['current_step_name']:32s} "
            f"status={result['status']}"
        )

    print()
    print(
        "========== FINAL RESULT =========="
    )

    print(
        json.dumps(
            adapter.engine.result(),
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
