import cv2
import sys
from pathlib import Path


def make_contact_sheet(sequence_dir, output_file):
    sequence_dir = Path(sequence_dir)

    frames = sorted(sequence_dir.glob("*.jpg"))

    if not frames:
        print(f"No frames found in {sequence_dir}")
        return

    images = []

    for frame_path in frames:
        image = cv2.imread(str(frame_path))

        if image is None:
            continue

        image = cv2.resize(image, (320, 180))
        images.append(image)

    # Pick 6 representative frames from the 20-frame sequence.
    indices = [0, 4, 8, 12, 16, 19]
    selected = [images[i] for i in indices if i < len(images)]

    while len(selected) < 6:
        selected.append(
            255 * __import__("numpy").ones((180, 320, 3), dtype="uint8")
        )

    top = cv2.hconcat(selected[:3])
    bottom = cv2.hconcat(selected[3:6])
    sheet = cv2.vconcat([top, bottom])

    cv2.imwrite(str(output_file), sheet)


def main():
    if len(sys.argv) != 3:
        print(
            "Usage:\n"
            "python src/data/preview_sequences.py "
            "<sequence_directory> <output_file>"
        )
        sys.exit(1)

    sequence_dir = Path(sys.argv[1])
    output_file = Path(sys.argv[2])

    make_contact_sheet(sequence_dir, output_file)

    print(f"Saved preview: {output_file}")


if __name__ == "__main__":
    main()