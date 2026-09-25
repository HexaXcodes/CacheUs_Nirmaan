import cv2
import sys
from pathlib import Path


def extract_frames(video_path, output_dir, interval_seconds=5):
    video_path = Path(video_path)
    output_dir = Path(output_dir)

    if not video_path.exists():
        print(f"ERROR: File not found: {video_path}")
        return

    output_dir.mkdir(parents=True, exist_ok=True)

    cap = cv2.VideoCapture(str(video_path))

    if not cap.isOpened():
        print(f"ERROR: Could not open video: {video_path}")
        return

    fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    duration = frame_count / fps if fps > 0 else 0

    print(f"Video duration: {duration:.2f} seconds")
    print(f"Extracting one frame every {interval_seconds} seconds...")

    frame_number = 0
    extracted = 0

    while True:
        ret, frame = cap.read()

        if not ret:
            break

        current_time = frame_number / fps if fps > 0 else 0

        if current_time >= extracted * interval_seconds:
            output_file = output_dir / f"frame_{extracted:04d}.jpg"
            cv2.imwrite(str(output_file), frame)
            print(f"Saved {output_file} ({current_time:.1f}s)")
            extracted += 1

        frame_number += 1

    cap.release()

    print(f"\nDone. Extracted {extracted} frames.")
    print(f"Frames saved to: {output_dir}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print(
            "python src/data/extract_frames.py "
            "<video_path> [output_dir] [interval_seconds]"
        )
        sys.exit(1)

    video = sys.argv[1]

    output = (
        sys.argv[2]
        if len(sys.argv) >= 3
        else "data/processed/inhaler/reference_frames"
    )

    interval = float(sys.argv[3]) if len(sys.argv) >= 4 else 5

    extract_frames(video, output, interval)