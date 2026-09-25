import json
from pathlib import Path

from src.temporal.workflow_adapter import WorkflowAdapter


SEQUENCE_DIR = Path("data/processed/inhaler/landmarks")


def main():
    files = sorted(
        SEQUENCE_DIR.glob("sequence_*.json")
    )

    if not files:
        raise RuntimeError(
            f"No landmark sequences found in {SEQUENCE_DIR}"
        )

    adapter = WorkflowAdapter()

    print("========== WORKFLOW EVALUATION ==========")
    print("Sequences:", len(files))
    print()

    predictions = 0
    uncertain = 0
    correct = 0
    incorrect = 0

    for path in files:
        result = adapter.process(path)

        prediction = result["prediction"]
        workflow = result["workflow"]

        if prediction is None:
            predicted = "NONE"
            confidence = 0.0
            uncertain += 1
        else:
            predicted = prediction["step"]
            confidence = prediction["confidence"]
            predictions += 1

        status = result["status"]

        if status == "correct":
            correct += 1
        elif status == "incorrect":
            incorrect += 1

        print(
            f'{path.stem:16s} '
            f'pred={predicted:28s} '
            f'conf={confidence:.3f} '
            f'status={status:10s} '
            f'next={workflow["current_step_name"]}'
        )

    print()
    print("========== SUMMARY ==========")
    print("Total sequences:", len(files))
    print("Predictions:", predictions)
    print("Uncertain:", uncertain)
    print("Correct workflow updates:", correct)
    print("Incorrect workflow updates:", incorrect)
    print("Final state:")
    print(json.dumps(adapter.engine.result(), indent=2))
    print("==============================")


if __name__ == "__main__":
    main()
