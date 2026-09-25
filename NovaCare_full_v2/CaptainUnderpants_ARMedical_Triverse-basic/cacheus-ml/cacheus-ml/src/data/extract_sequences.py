import cv2
import sys
from pathlib import Path


FPS = 10
WINDOW_SECONDS = 2
STRIDE_SECONDS = 1


def extract_sequences(video_path, output_dir):
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

    source_fps = cap.get(cv2.CAP_PROP_FPS)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = frame_count / source_fps if source_fps > 0 else 0

    frames_per_window = FPS * WINDOW_SECONDS
    stride_frames = FPS * STRIDE_SECONDS

    print(f"Source FPS: {source_fps:.2f}")
    print(f"Duration: {duration:.2f}s")
    print(f"Target FPS: {FPS}")
    print(f"Window: {WINDOW_SECONDS}s ({frames_per_window} frames)")
    print(f"Stride: {STRIDE_SECONDS}s")
    print()

    # Read the video and sample at approximately 10 FPS.
    sampled_frames = []
    sample_interval = source_fps / FPS
    next_sample = 0.0
    frame_index = 0

    while True:
        ret, frame = cap.read()

        if not ret:
            break

        if frame_index >= next_sample:
            sampled_frames.append(frame.copy())
            next_sample += sample_interval

        frame_index += 1

    cap.release()

    print(f"Sampled frames: {len(sampled_frames)}")

    sequence_count = 0

    for start in range(
        0,
        len(sampled_frames) - frames_per_window + 1,
        stride_frames,
    ):
        sequence = sampled_frames[start:start + frames_per_window]

        sequence_dir = output_dir / f"sequence_{sequence_count:04d}"
        sequence_dir.mkdir(parents=True, exist_ok=True)

        for i, frame in enumerate(sequence):
            output_file = sequence_dir / f"frame_{i:03d}.jpg"
            cv2.imwrite(str(output_file), frame)

        sequence_count += 1

    print(f"Created {sequence_count} sequences.")
    print(f"Saved to: {output_dir}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(
            "Usage:\n"
            "python src/data/extract_sequences.py "
            "<video_path> <output_dir>"
        )
        sys.exit(1)

    extract_sequences(sys.argv[1], sys.argv[2])