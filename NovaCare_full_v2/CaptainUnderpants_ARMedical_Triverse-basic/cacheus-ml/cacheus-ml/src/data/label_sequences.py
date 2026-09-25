import json
from pathlib import Path


TIMELINE_PATH = Path(
    "data/annotations/inhaler/timelines/pmdi_reference.json"
)

SEQUENCES_DIR = Path(
    "data/processed/inhaler/sequences"
)

OUTPUT_PATH = Path(
    "data/processed/inhaler/sequence_labels.json"
)

FPS = 25.0
FRAMES_PER_SEQUENCE = 20


def load_timeline():
    with TIMELINE_PATH.open() as f:
        return json.load(f)


def get_sequence_time(sequence_index):
    """
    Each sequence contains 20 frames.
    Convert sequence index into its approximate
    start/end time in the original video.
    """

    start_frame = sequence_index * FRAMES_PER_SEQUENCE
    end_frame = start_frame + FRAMES_PER_SEQUENCE - 1

    start_time = start_frame / FPS
    end_time = end_frame / FPS

    return start_time, end_time


def find_step(start_time, end_time, segments):
    """
    Assign a sequence to a workflow step if the
    sequence overlaps that step's annotated interval.
    """

    best_step = None
    best_overlap = 0.0

    for segment in segments:
        step_start = segment["start_seconds"]
        step_end = segment["end_seconds"]

        if step_start is None or step_end is None:
            continue

        overlap_start = max(start_time, step_start)
        overlap_end = min(end_time, step_end)

        overlap = max(0.0, overlap_end - overlap_start)

        if overlap > best_overlap:
            best_overlap = overlap
            best_step = segment

    if best_step is None:
        return None

    return {
        "step_id": best_step["step_id"],
        "step_name": best_step["step_name"],
        "status": best_step["status"],
        "overlap_seconds": round(best_overlap, 4),
    }


def main():
    timeline = load_timeline()
    segments = timeline["segments"]

    sequences = sorted(
        SEQUENCES_DIR.glob("sequence_*")
    )

    print("========== SEQUENCE LABELING ==========")
    print(f"Sequences found: {len(sequences)}")
    print(f"FPS:              {FPS}")
    print(f"Frames/sequence:  {FRAMES_PER_SEQUENCE}")
    print()

    labels = []

    for sequence_dir in sequences:
        sequence_name = sequence_dir.name

        try:
            sequence_index = int(
                sequence_name.split("_")[-1]
            )
        except ValueError:
            print(
                f"WARNING: skipping invalid sequence "
                f"name: {sequence_name}"
            )
            continue

        frame_files = sorted(
            sequence_dir.glob("frame_*.jpg")
        )

        if not frame_files:
            print(
                f"WARNING: {sequence_name} has no frames"
            )
            continue

        start_time, end_time = get_sequence_time(
            sequence_index
        )

        step = find_step(
            start_time,
            end_time,
            segments,
        )

        record = {
            "sequence": sequence_name,
            "start_seconds": round(start_time, 4),
            "end_seconds": round(end_time, 4),
            "num_frames": len(frame_files),
            "label": step,
        }

        labels.append(record)

    OUTPUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with OUTPUT_PATH.open("w") as f:
        json.dump(
            {
                "video_id": timeline["video_id"],
                "workflow": timeline["workflow"],
                "fps": FPS,
                "frames_per_sequence": FRAMES_PER_SEQUENCE,
                "num_sequences": len(labels),
                "sequences": labels,
            },
            f,
            indent=2,
        )

    print()
    print(f"Saved: {OUTPUT_PATH}")
    print()

    # Summary
    counts = {}

    for record in labels:
        label = record["label"]

        if label is None:
            name = "unlabeled"
        else:
            name = label["step_name"]

        counts[name] = counts.get(name, 0) + 1

    print("========== LABEL SUMMARY ==========")

    for name, count in counts.items():
        print(f"{name:32s} {count}")

    print("===================================")


if __name__ == "__main__":
    main()