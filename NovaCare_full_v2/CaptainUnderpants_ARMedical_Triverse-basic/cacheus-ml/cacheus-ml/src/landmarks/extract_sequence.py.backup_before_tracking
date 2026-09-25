from pathlib import Path
import json

import cv2

from src.landmarks.extract import LandmarkExtractor


def extract_sequence(sequence_dir, output_file):
    sequence_dir = Path(sequence_dir)
    output_file = Path(output_file)

    frames = sorted(sequence_dir.glob("frame_*.jpg"))

    if not frames:
        raise RuntimeError(f"No frames found in {sequence_dir}")

    extractor = LandmarkExtractor()

    result = {
        "sequence": sequence_dir.name,
        "frames": [],
    }

    for frame_path in frames:
        image = cv2.imread(str(frame_path))

        if image is None:
            print(f"Skipping unreadable frame: {frame_path}")
            continue

        hands = extractor.extract(image)

        result["frames"].append(
            {
                "frame": frame_path.name,
                "hands": hands,
            }
        )

    extractor.close()

    output_file.parent.mkdir(parents=True, exist_ok=True)

    with output_file.open("w") as f:
        json.dump(result, f, indent=2)

    print(f"Sequence: {sequence_dir.name}")
    print(f"Frames processed: {len(result['frames'])}")
    print(f"Saved landmarks: {output_file}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) != 3:
        print(
            "Usage:\n"
            "python -m src.landmarks.extract_sequence "
            "<sequence_dir> <output_json>"
        )
        raise SystemExit(1)

    extract_sequence(
        sys.argv[1],
        sys.argv[2],
    )
