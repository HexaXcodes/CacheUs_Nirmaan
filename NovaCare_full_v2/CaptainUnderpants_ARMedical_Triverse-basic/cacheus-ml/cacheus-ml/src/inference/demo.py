from pathlib import Path

import cv2

from src.landmarks.extract import LandmarkExtractor
from src.workflow.engine import WorkflowEngine


IMAGE_DIR = Path("data/processed/inhaler")


def main():
    images = sorted(IMAGE_DIR.glob("preview_*.jpg"))

    if not images:
        raise RuntimeError(
            f"No preview images found in {IMAGE_DIR}"
        )

    extractor = LandmarkExtractor()
    workflow = WorkflowEngine()

    print("========== CACHEUS DEMO ==========")
    print(f"Images: {len(images)}")
    print()

    for image_path in images:
        image = cv2.imread(str(image_path))

        if image is None:
            print(f"{image_path.name}: could not read image")
            continue

        hands = extractor.extract(image)

        if hands:
            detected_step = workflow.current_step_name
            confidence = 0.5
        else:
            detected_step = None
            confidence = 0.0

        state = workflow.update(
            detected_step,
            confidence,
        )

        print(
            f"{image_path.name:20s} "
            f"hands={len(hands):2d} "
            f"step={workflow.current_step_name:28s} "
            f"status={state.status}"
        )

    extractor.close()

    print()
    print("========== FINAL STATE ==========")
    print(workflow.result())


if __name__ == "__main__":
    main()
