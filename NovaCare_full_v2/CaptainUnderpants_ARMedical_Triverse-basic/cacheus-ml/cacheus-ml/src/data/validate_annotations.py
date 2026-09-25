import json
import sys
from pathlib import Path


VALID_STATUSES = {
    "correct",
    "incorrect",
    "uncertain",
}

REQUIRED_STEPS = [
    "remove_cap",
    "shake_inhaler",
    "exhale_away",
    "position_mouthpiece",
    "begin_slow_inhalation",
    "actuate_during_inhalation",
    "continue_inhalation",
    "breath_hold",
]


def validate_annotation(path):
    path = Path(path)

    errors = []

    if not path.exists():
        errors.append(f"File does not exist: {path}")
        return errors

    try:
        with path.open() as f:
            data = json.load(f)
    except json.JSONDecodeError as exc:
        errors.append(f"Invalid JSON: {exc}")
        return errors

    if not isinstance(data, dict):
        errors.append("Root must be a JSON object.")
        return errors

    if "video_id" not in data:
        errors.append("Missing: video_id")

    if "workflow" not in data:
        errors.append("Missing: workflow")
    elif data["workflow"] != "pmdi_without_spacer":
        errors.append(
            f"Invalid workflow: {data['workflow']}"
        )

    if "source_type" not in data:
        errors.append("Missing: source_type")

    if "steps" not in data:
        errors.append("Missing: steps")
        return errors

    if not isinstance(data["steps"], list):
        errors.append("steps must be a list.")
        return errors

    if len(data["steps"]) != len(REQUIRED_STEPS):
        errors.append(
            f"Expected {len(REQUIRED_STEPS)} steps, "
            f"found {len(data['steps'])}."
        )

    seen_names = []

    for index, step in enumerate(data["steps"], start=1):
        if not isinstance(step, dict):
            errors.append(
                f"Step {index}: must be an object."
            )
            continue

        step_id = step.get("id")
        name = step.get("name")
        status = step.get("status")

        expected_name = (
            REQUIRED_STEPS[index - 1]
            if index <= len(REQUIRED_STEPS)
            else None
        )

        if step_id != index:
            errors.append(
                f"Step {index}: expected id {index}, "
                f"found {step_id}."
            )

        if name != expected_name:
            errors.append(
                f"Step {index}: expected name "
                f"'{expected_name}', found '{name}'."
            )

        if name in seen_names:
            errors.append(
                f"Duplicate step name: {name}"
            )

        seen_names.append(name)

        if status not in VALID_STATUSES:
            errors.append(
                f"Step {index}: invalid status "
                f"'{status}'."
            )

        start = step.get("start_seconds")
        end = step.get("end_seconds")

        if start is not None and not isinstance(
            start, (int, float)
        ):
            errors.append(
                f"Step {index}: start_seconds must be "
                f"a number or null."
            )

        if end is not None and not isinstance(
            end, (int, float)
        ):
            errors.append(
                f"Step {index}: end_seconds must be "
                f"a number or null."
            )

        if (
            start is not None
            and end is not None
            and end < start
        ):
            errors.append(
                f"Step {index}: end_seconds is before "
                f"start_seconds."
            )

    return errors


def main():
    if len(sys.argv) != 2:
        print(
            "Usage:\n"
            "python -m src.data.validate_annotations "
            "<annotation.json>"
        )
        raise SystemExit(1)

    path = Path(sys.argv[1])

    errors = validate_annotation(path)

    print("========== ANNOTATION VALIDATION ==========")
    print("File:", path)

    if errors:
        print("Status: INVALID")
        print()

        for error in errors:
            print("ERROR:", error)

        raise SystemExit(1)

    print("Status: VALID")
    print("Workflow: pmdi_without_spacer")
    print("Steps: 8")
    print("===========================================")


if __name__ == "__main__":
    main()
