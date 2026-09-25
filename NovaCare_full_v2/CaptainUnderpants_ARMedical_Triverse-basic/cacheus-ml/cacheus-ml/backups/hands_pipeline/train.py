import json
from pathlib import Path

import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report


DATA_DIR = Path("data/processed/inhaler/training")
MODEL_DIR = Path("data/processed/inhaler/models")


def main():
    X = np.load(DATA_DIR / "X.npy")
    y = np.load(DATA_DIR / "y.npy")

    with open(DATA_DIR / "metadata.json") as f:
        metadata = json.load(f)

    print("========== CACHEUS TRAINING ==========")
    print("X shape:", X.shape)
    print("y shape:", y.shape)
    print("Samples:", len(y))
    print("Classes:", len(np.unique(y)))

    # Flatten each 20-frame sequence into one feature vector.
    X_flat = X.reshape(X.shape[0], -1)

    X_train, X_val, y_train, y_val = train_test_split(
        X_flat,
        y,
        test_size=0.25,
        random_state=42,
        stratify=y,
    )

    print()
    print("Training samples:", len(y_train))
    print("Validation samples:", len(y_val))

    model = Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "classifier",
                LogisticRegression(
                    max_iter=2000,
                    random_state=42,
                ),
            ),
        ]
    )

    print()
    print("Training...")
    model.fit(X_train, y_train)

    predictions = model.predict(X_val)

    accuracy = accuracy_score(y_val, predictions)

    print()
    print("========== RESULTS ==========")
    print(f"Validation accuracy: {accuracy:.4f}")
    print()
    print(classification_report(y_val, predictions, zero_division=0))

    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    model_path = MODEL_DIR / "baseline.pkl"

    import pickle

    with model_path.open("wb") as f:
        pickle.dump(model, f)

    training_metadata = {
        "model": "logistic_regression_baseline",
        "input_shape": list(X.shape),
        "flattened_shape": list(X_flat.shape),
        "num_samples": int(len(y)),
        "num_classes": int(len(np.unique(y))),
        "validation_accuracy": float(accuracy),
        "classes": metadata.get("classes", []),
    }

    metadata_path = MODEL_DIR / "baseline_metadata.json"

    with metadata_path.open("w") as f:
        json.dump(training_metadata, f, indent=2)

    print("Saved model:", model_path)
    print("Saved metadata:", metadata_path)
    print("================================")


if __name__ == "__main__":
    main()
