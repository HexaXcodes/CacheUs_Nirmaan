import json
import sys
from pathlib import Path

import cv2


STEPS = [
    "remove_cap",
    "shake_inhaler",
    "exhale_away",
    "position_mouthpiece",
    "begin_slow_inhalation",
    "actuate_during_inhalation",
    "continue_inhalation",
    "breath_hold",
]


def get_video_info(video_path):
    cap = cv2.VideoCapture(str(video_path))

    if not cap.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    fps = cap.get(cv2.CAP_PROP_FPS)
    frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = frames / fps if fps > 0 else 0

    cap.release()

    return fps, frames, duration


def make_template(video_path):
    return {
        "video_id": Path(video_path).stem,
        "workflow": "pmdi_without_spacer",
        "source_type": "reference_educational",
        "segments": [
            {
                "step_id": i + 1,
                "step_name": name,
                "start_seconds": None,
                "end_seconds": None,
                "status": "uncertain",
            }
            for i, name in enumerate(STEPS)
        ],
    }


def load_or_create_annotation(video_path, output_path):
    if output_path.exists():
        try:
            with output_path.open() as f:
                annotation = json.load(f)

            if "segments" in annotation:
                print(f"Loaded existing annotation: {output_path}")
                return annotation

        except (json.JSONDecodeError, OSError):
            print("WARNING: Could not load existing annotation.")
            print("Creating a new annotation.")

    return make_template(video_path)


def save_annotation(output_path, annotation):
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w") as f:
        json.dump(annotation, f, indent=2)

    print(f"Saved: {output_path}")


def print_annotation(annotation):
    print()
    print("========== CURRENT ANNOTATION ==========")

    for segment in annotation["segments"]:
        print(
            f'{segment["step_id"]}. '
            f'{segment["step_name"]:28s} '
            f'{segment["start_seconds"]} -> '
            f'{segment["end_seconds"]} '
            f'[{segment["status"]}]'
        )

    print("========================================")
    print()


def mark_all_annotated_correct(annotation):
    changed = 0

    for segment in annotation["segments"]:
        start = segment["start_seconds"]
        end = segment["end_seconds"]

        # Only mark a step correct if both timestamps exist.
        if start is not None and end is not None:
            if end >= start:
                if segment["status"] != "correct":
                    segment["status"] = "correct"
                    changed += 1

    print(
        f"Marked {changed} annotated step(s) as CORRECT."
    )


def main():
    if len(sys.argv) not in (2, 3):
        print(
            "Usage:\n"
            "python -m src.data.annotate_timeline "
            "<video_path> [output_json]"
        )
        raise SystemExit(1)

    video_path = Path(sys.argv[1])

    if not video_path.exists():
        print(f"ERROR: Video not found: {video_path}")
        raise SystemExit(1)

    if len(sys.argv) == 3:
        output_path = Path(sys.argv[2])
    else:
        output_path = (
            Path("data/annotations/inhaler/timelines")
            / f"{video_path.stem}.json"
        )

    fps, frames, duration = get_video_info(video_path)

    print("========== TIMELINE ANNOTATOR ==========")
    print(f"Video:    {video_path}")
    print(f"FPS:      {fps:.2f}")
    print(f"Frames:   {frames}")
    print(f"Duration: {duration:.2f}s")
    print()
    print("Keyboard controls:")
    print("  n       forward 0.5 seconds")
    print("  p       backward 0.5 seconds")
    print("  t       enter exact timestamp")
    print("  1-8     select workflow step")
    print("  s       set START")
    print("  e       set END")
    print("  u       mark UNCERTAIN")
    print("  c       mark selected step CORRECT")
    print("  i       mark selected step INCORRECT")
    print("  a       mark ALL annotated steps CORRECT")
    print("  v       view annotation")
    print("  w       save")
    print("  q       quit and save")
    print()
    print("=========================================")

    annotation = load_or_create_annotation(
        video_path,
        output_path,
    )

    cap = cv2.VideoCapture(str(video_path))

    if not cap.isOpened():
        print(f"ERROR: Could not open video: {video_path}")
        raise SystemExit(1)

    current_time = 0.0
    selected_step = 0
    step_size = 0.5

    window_name = "CacheUs Timeline Annotator"

    cv2.namedWindow(
        window_name,
        cv2.WINDOW_NORMAL,
    )

    def seek_and_show():
        cap.set(
            cv2.CAP_PROP_POS_MSEC,
            current_time * 1000,
        )

        ret, frame = cap.read()

        if not ret:
            return

        cv2.putText(
            frame,
            f"Time: {current_time:.2f}s",
            (30, 45),
            cv2.FONT_HERSHEY_SIMPLEX,
            1.0,
            (0, 255, 0),
            2,
        )

        cv2.putText(
            frame,
            f"Step {selected_step + 1}: "
            f"{STEPS[selected_step]}",
            (30, 85),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (0, 255, 255),
            2,
        )

        cv2.imshow(
            window_name,
            frame,
        )

    seek_and_show()

    while True:
        key = cv2.waitKey(50) & 0xFF

        if key == 255:
            continue

        if key == ord("q"):
            break

        elif key == ord("n"):
            current_time = min(
                duration,
                current_time + step_size,
            )
            seek_and_show()

        elif key == ord("p"):
            current_time = max(
                0,
                current_time - step_size,
            )
            seek_and_show()

        elif key == ord("t"):
            cv2.waitKey(1)

            value = input(
                "Timestamp in seconds: "
            ).strip()

            try:
                requested = float(value)

                if 0 <= requested <= duration:
                    current_time = requested

                    print(
                        f"Jumped to "
                        f"{current_time:.2f}s"
                    )
                else:
                    print(
                        f"Timestamp must be between "
                        f"0 and {duration:.2f}"
                    )

            except ValueError:
                print("Invalid timestamp.")

            seek_and_show()

        elif ord("1") <= key <= ord("8"):
            selected_step = key - ord("1")

            print(
                f"Selected step "
                f"{selected_step + 1}: "
                f"{STEPS[selected_step]}"
            )

            seek_and_show()

        elif key == ord("s"):
            annotation["segments"][selected_step][
                "start_seconds"
            ] = round(current_time, 2)

            print(
                f"START "
                f"{STEPS[selected_step]} = "
                f"{current_time:.2f}s"
            )

        elif key == ord("e"):
            annotation["segments"][selected_step][
                "end_seconds"
            ] = round(current_time, 2)

            print(
                f"END "
                f"{STEPS[selected_step]} = "
                f"{current_time:.2f}s"
            )

        elif key == ord("u"):
            annotation["segments"][selected_step][
                "status"
            ] = "uncertain"

            print(
                f"{STEPS[selected_step]} = uncertain"
            )

        elif key == ord("c"):
            annotation["segments"][selected_step][
                "status"
            ] = "correct"

            print(
                f"{STEPS[selected_step]} = correct"
            )

        elif key == ord("i"):
            annotation["segments"][selected_step][
                "status"
            ] = "incorrect"

            print(
                f"{STEPS[selected_step]} = incorrect"
            )

        elif key == ord("a"):
            mark_all_annotated_correct(annotation)

            print_annotation(annotation)

        elif key == ord("v"):
            print_annotation(annotation)

        elif key == ord("w"):
            save_annotation(
                output_path,
                annotation,
            )

    cap.release()
    cv2.destroyAllWindows()

    print()
    print_annotation(annotation)

    save_annotation(
        output_path,
        annotation,
    )


if __name__ == "__main__":
    main()