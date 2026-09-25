import json
from pathlib import Path

from src.temporal.workflow_adapter import WorkflowAdapter


LANDMARKS_DIR = Path(
    "data/processed/inhaler/landmarks"
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

    print("========== CACHEUS END-TO-END PIPELINE ==========")
    print(f"Sequences: {len(sequences)}")
    print()

    for sequence in sequences:
        name = sequence["sequence"]

        path = LANDMARKS_DIR / f"{name}.json"

        if not path.exists():
            print(f"{name}: MISSING LANDMARKS")
            continue

        result = adapter.process(path)

        prediction = result.get("prediction")

        if prediction:
            predicted = prediction["step"]
            confidence = prediction["confidence"]
        else:
            predicted = "-"
            confidence = 0.0

        workflow = result["workflow"]

        print(
            f"{name:16s} "
            f"pred={predicted:28s} "
            f"conf={confidence:.3f} "
            f"current={workflow['current_step_name']:28s} "
            f"status={result['status']}"
        )

    print()
    print("========== FINAL RESULT ==========")
    print(json.dumps(
        adapter.engine.result(),
        indent=2,
    ))


if __name__ == "__main__":
    main()