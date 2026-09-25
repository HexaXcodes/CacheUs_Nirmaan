from pathlib import Path

from src.temporal.frame_step_detector import FrameStepDetector
from src.workflow.engine import WorkflowEngine


class WorkflowAdapter:
    """
    Connects frame-only step classification
    to the sequential workflow engine.

    Hand landmarks are intentionally not used.
    """

    def __init__(self):
        self.detector = FrameStepDetector()
        self.engine = WorkflowEngine()

    def process(self, sequence_dir):
        sequence_dir = Path(sequence_dir)

        result = self.detector.analyze(
            sequence_dir
        )

        prediction = None

        if result["usable"]:
            prediction = self.detector.predict(
                sequence_dir
            )

        if prediction is None:
            state = self.engine.update(
                detected_step=None,
                confidence=0.0,
            )
        else:
            state = self.engine.update(
                detected_step=prediction["step"],
                confidence=prediction["confidence"],
            )

        return {
            "sequence": sequence_dir.name,
            "activity": result,
            "prediction": prediction,
            "workflow": self.engine.result(),
            "status": state.status,
        }


if __name__ == "__main__":
    import json
    import sys

    if len(sys.argv) != 2:
        print(
            "Usage:\n"
            "python -m src.temporal.workflow_adapter "
            "<sequence_directory>"
        )
        raise SystemExit(1)

    adapter = WorkflowAdapter()

    result = adapter.process(sys.argv[1])

    print(
        json.dumps(
            result,
            indent=2,
        )
    )
