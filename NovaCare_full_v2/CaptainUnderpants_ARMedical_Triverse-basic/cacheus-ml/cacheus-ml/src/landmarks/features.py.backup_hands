import json
from pathlib import Path

import numpy as np


LANDMARKS_PER_HAND = 21
COORDINATES_PER_LANDMARK = 3


def load_sequence(path):
    path = Path(path)

    with path.open() as f:
        return json.load(f)


def frame_to_vector(frame):
    """
    Convert one frame's hand landmarks into a fixed-size vector.

    The current representation supports up to two hands.
    Missing hands are represented by zeros.
    """

    vector = np.zeros(
        2 * LANDMARKS_PER_HAND * COORDINATES_PER_LANDMARK,
        dtype=np.float32,
    )

    hands = frame.get("hands", [])

    for hand_index, hand in enumerate(hands[:2]):
        for landmark_index, landmark in enumerate(
            hand[:LANDMARKS_PER_HAND]
        ):
            offset = (
                hand_index
                * LANDMARKS_PER_HAND
                * COORDINATES_PER_LANDMARK
                + landmark_index
                * COORDINATES_PER_LANDMARK
            )

            vector[offset] = landmark["x"]
            vector[offset + 1] = landmark["y"]
            vector[offset + 2] = landmark["z"]

    return vector


def sequence_to_array(path):
    """
    Convert a landmark JSON sequence into:

        shape = (number_of_frames, 126)

    126 = 2 hands × 21 landmarks × 3 coordinates
    """

    data = load_sequence(path)

    frames = data["frames"]

    if not frames:
        raise ValueError(f"No frames found in {path}")

    vectors = [
        frame_to_vector(frame)
        for frame in frames
    ]

    return np.stack(vectors)


if __name__ == "__main__":
    import sys

    if len(sys.argv) != 2:
        print(
            "Usage:\n"
            "python -m src.landmarks.features "
            "<landmark_json>"
        )
        raise SystemExit(1)

    path = sys.argv[1]

    array = sequence_to_array(path)

    print("File:", path)
    print("Shape:", array.shape)
    print("dtype:", array.dtype)
    print("Non-zero values:", np.count_nonzero(array))
