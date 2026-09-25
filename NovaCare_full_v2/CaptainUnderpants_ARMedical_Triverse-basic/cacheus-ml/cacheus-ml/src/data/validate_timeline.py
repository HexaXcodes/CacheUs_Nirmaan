import json
import sys
from pathlib import Path


EXPECTED_STEPS = [
    "remove_cap",
    "shake_inhaler",
    "exhale_away",
    "position_mouthpiece",
    "begin_slow_inhalation",
    "actuate_during_inhalation",
    "continue_inhalation",
    "breath_hold",
]

VALID_STATUSES = {
    "correct",
    "incorrect",
    "uncertain",
}


def validate_timeline(path):
    errors = []

    path = Path(path)

    if not path.exists():
        return [f"File not found: {path}"]

    try:
        with path.open() as f:
            data = json.load(f)
    except json.JSONDecodeError as exc:
        return [f"Invalid JSON: {exc}"]

    required_fields = [
        "video_id",
        "workflow",
        "source_type",
        "segments",
    ]

    for field in required_fields:
        if field not in data:
            errors.append(f"Missing: {field}")

    if errors:
        return errors

    segments = data["segments"]

    if not isinstance(segments, list):
        return ["segments must be a list"]

    if len(segments) != 8:
        errors.append(
            f"Expected 8 segments, found {len(segments)}"
        )

    previous_end = None

    for index, segment in enumerate(segments):
        step_number = index + 1

        if not isinstance(segment, dict):
            errors.append(
                f"Step {step_number}: segment must be an object"
            )
            continue

        expected_name = (
            EXPECTED_STEPS[index]
            if index < len(EXPECTED_STEPS)
            else None
        )

        step_id = segment.get("step_id")
        step_name = segment.get("step_name")
        start = segment.get("start_seconds")
        end = segment.get("end_seconds")
        status = segment.get("status")

        if step_id != step_number:
            errors.append(
                f"Step {step_number}: expected step_id "
                f"{step_number}, found {step_id}"
            )

        if expected_name and step_name != expected_name:
            errors.append(
                f"Step {step_number}: expected step_name "
                f"'{expected_name}', found '{step_name}'"
            )

        if status not in VALID_STATUSES:
            errors.append(
                f"Step {step_number}: invalid status "
                f"'{status}'"
            )

        if start is None:
            errors.append(
                f"Step {step_number}: missing start_seconds"
            )

        if end is None:
            errors.append(
                f"Step {step_number}: missing end_seconds"
            )

        if start is not None:
            if not isinstance(start, (int, float)):
                errors.append(
                    f"Step {step_number}: start_seconds "
                    f"must be numeric"
                )
            elif start < 0:
                errors.append(
                    f"Step {step_number}: start_seconds "
                    f"cannot be negative"
                )
            elif start > 175.88:
                errors.append(
                    f"Step {step_number}: start_seconds "
                    f"exceeds video duration"
                )

        if end is not None:
            if not isinstance(end, (int, float)):
                errors.append(
                    f"Step {step_number}: end_seconds "
                    f"must be numeric"
                )
            elif end < 0:
                errors.append(
                    f"Step {step_number}: end_seconds "
                    f"cannot be negative"
                )
            elif end > 175.88:
                errors.append(
                    f"Step {step_number}: end_seconds "
                    f"exceeds video duration"
                )

        if (
            isinstance(start, (int, float))
            and isinstance(end, (int, float))
        ):
            if end <= start:
                errors.append(
                    f"Step {step_number}: end_seconds "
                    f"must be greater than start_seconds"
                )

            if previous_end is not None:
                if start < previous_end:
                    errors.append(
                        f"Step {step_number}: overlaps "
                        f"previous step"
                    )

            previous_end = end

    return errors


def main():
    if len(sys.argv) != 2:
        print(
            "Usage:\n"
            "python -m src.data.validate_timeline "
            "<timeline_json>"
        )
        raise SystemExit(1)

    path = Path(sys.argv[1])

    print("========== TIMELINE VALIDATION ==========")
    print(f"File: {path}")

    errors = validate_timeline(path)

    if errors:
        print("Status: INVALID")
        print()

        for error in errors:
            print(f"ERROR: {error}")

        raise SystemExit(1)

    print("Status: VALID")
    print()
    print("All 8 workflow steps are valid.")
    print("All timestamps are present and ordered.")
    print("All statuses are valid.")
    print("No timeline overlaps detected.")


if __name__ == "__main__":
    main()
