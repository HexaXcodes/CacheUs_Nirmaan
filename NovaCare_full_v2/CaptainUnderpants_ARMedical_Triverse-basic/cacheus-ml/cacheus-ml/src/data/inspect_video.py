import cv2
import sys
from pathlib import Path


def inspect_video(video_path):
    path = Path(video_path)

    if not path.exists():
        print(f"ERROR: File not found: {path}")
        return

    cap = cv2.VideoCapture(str(path))

    if not cap.isOpened():
        print(f"ERROR: Could not open video: {path}")
        return

    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    duration = frame_count / fps if fps > 0 else 0

    print("\n--- VIDEO INFORMATION ---")
    print(f"File:       {path.name}")
    print(f"Resolution: {width} x {height}")
    print(f"FPS:        {fps:.2f}")
    print(f"Frames:     {frame_count}")
    print(f"Duration:   {duration:.2f} seconds")
    print("--------------------------\n")

    cap.release()


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage:")
        print("python src/data/inspect_video.py <path-to-video>")
        sys.exit(1)

    inspect_video(sys.argv[1])