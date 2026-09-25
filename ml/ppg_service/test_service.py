"""Tests for the PPG service. Run from ml/:  .venv\\Scripts\\python -m pytest ppg_service -q

The waveforms here are SYNTHETIC. They check plumbing, contract compatibility and
the accept/reject behaviour; they say nothing about accuracy on real sensors.
"""
import importlib.util
import sys
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient

ML_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ML_DIR))

from ppg_service.app import app  # noqa: E402

client = TestClient(app)

# Load the backend's own Analysis schema so we test against the real contract.
_schema_path = ML_DIR.parent / "NovaCare_Public-main" / "Backend" / "app" / "schemas" / "measurement.py"
_spec = importlib.util.spec_from_file_location("backend_measurement_schema", _schema_path)
backend_schema = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(backend_schema)


def synthetic_ppg(seconds=12.0, fs=100.0, hr=72.0, noise=0.02, seed=1, scale=30.0, base=500.0):
    rng = np.random.default_rng(seed)
    t = np.arange(int(seconds * fs)) / fs
    beat_times, tt = [], 0.4
    while tt < seconds:
        beat_times.append(tt)
        tt += 60.0 / hr * (1 + rng.normal(0, 0.02))
    x = np.zeros_like(t)
    for b in beat_times:  # systolic peak + smaller dicrotic wave
        x += np.exp(-((t - b - 0.15) ** 2) / (2 * 0.06 ** 2))
        x += 0.35 * np.exp(-((t - b - 0.40) ** 2) / (2 * 0.09 ** 2))
    x += 0.15 * np.sin(2 * np.pi * 0.1 * t)          # slow baseline drift
    x += rng.normal(0, noise, len(t))
    return np.round(base + scale * x)


def payload(samples, fs=100.0, unit="adc"):
    return {
        "contract_version": "1",
        "samples": [float(v) for v in samples],
        "sampling_rate_hz": float(fs),
        "sample_unit": unit,
        "metadata": {"source": "dataset_simulator", "device_id": "pytest", "description": "synthetic test waveform", "synthetic": True},
    }


def post(samples, fs=100.0):
    r = client.post("/analyze", json=payload(samples, fs))
    assert r.status_code == 200, r.text
    body = r.json()
    backend_schema.Analysis.model_validate(body)      # must satisfy the backend's strict contract
    return body


def test_health():
    assert client.get("/health").json()["status"] == "ok"


@pytest.mark.parametrize("fs", [100.0, 125.0, 250.0, 99.7])
def test_clean_signal_accepted_at_various_rates(fs):
    body = post(synthetic_ppg(seconds=12, fs=fs), fs)
    assert body["acceptable"] is True and body["retry_reason"] is None
    assert body["quality_score"] >= 0.5
    assert abs(body["heart_rate_bpm"] - 72) < 4
    bp = body["experimental_bp"]
    if bp is not None:                                  # BP may be withheld if the model output is implausible
        assert bp["label"] == "Experimental BP Estimate" and bp["systolic"] > bp["diastolic"]


def test_longer_recording_uses_a_window():
    body = post(synthetic_ppg(seconds=30, fs=100), 100)
    assert body["acceptable"] is True


def test_too_short_is_rejected_with_reason():
    body = post(synthetic_ppg(seconds=7, fs=100), 100)   # valid for the backend (>=5 s) but < 10 s
    assert body["acceptable"] is False and "10 seconds" in body["retry_reason"]
    assert body["experimental_bp"] is None and body["heart_rate_bpm"] is None


def test_flat_signal_rejected():
    body = post(np.full(1200, 512.0), 100)
    assert body["acceptable"] is False and body["experimental_bp"] is None


def test_white_noise_rejected():
    rng = np.random.default_rng(3)
    body = post(np.round(500 + 30 * rng.normal(size=1200)), 100)
    assert body["acceptable"] is False and body["retry_reason"] and body["experimental_bp"] is None


def test_saturated_signal_rejected():
    x = np.clip(synthetic_ppg(12, 100, scale=400.0), 0, 800)      # peaks flattened at a rail (raw max is ~966)
    assert (x == 800).mean() > 0.03                                 # make sure the test signal really is clipped
    body = post(x, 100)
    assert body["acceptable"] is False and body["experimental_bp"] is None


def test_non_finite_input_is_a_validation_error():
    p = payload(synthetic_ppg())
    p["samples"][10] = float("nan")
    r = client.post("/analyze", content=__import__("json").dumps(p, allow_nan=True), headers={"content-type": "application/json"})
    assert r.status_code == 422


def test_unknown_field_rejected_like_the_backend():
    p = payload(synthetic_ppg())
    p["patient_id"] = "x"
    assert client.post("/analyze", json=p).status_code == 422


@pytest.mark.parametrize("screening_id", [None, "3bb0eb13-d0ca-488b-b0e2-41b3fce9185a"])
def test_payload_exactly_as_backend_forwards_it(screening_id):
    """Build the request the way Backend/app/services/ppg.py does: validate the full PPG
    request with the backend's own models, keep only Waveform fields, dump as JSON."""
    import datetime as dt
    body = {"patient_id": "p1", "recorded_at": dt.datetime.now(dt.timezone.utc).isoformat(), **payload(synthetic_ppg(12, 100))}
    body["metadata"]["screening_id"] = screening_id
    ppg = backend_schema.PPG.model_validate(body)
    fwd = backend_schema.Waveform.model_validate(ppg.model_dump(include=set(backend_schema.Waveform.model_fields)))
    r = client.post("/analyze", json=fwd.model_dump(mode="json"))
    assert r.status_code == 200, r.text
    backend_schema.Analysis.model_validate(r.json())
