# NovaCare AI Services — Remote PPG (rPPG) Microservice

This is a standalone Python FastAPI microservice that extracts cardiovascular health metrics — **Heart Rate (HR)**, **Heart Rate Variability (HRV)**, and **Respiratory Rate (RR)** — from a 60-second facial video recording using **remote Photoplethysmography (rPPG)**.

This microservice runs alongside the NovaCare backend to enable non-contact, hardware-free screening of cardiovascular stress markers in community-level health settings.

---

## How It Works

1. **Face Mesh & Region of Interest (ROI) Tracking**:
   The service uses **MediaPipe Face Mesh** to track the patient's face and segment a precise polygon on the forehead. Averaging the skin pixels over this polygon eliminates background noise.
   * *Fallback*: If MediaPipe is not supported by the environment, it automatically falls back to an OpenCV Haar Cascade face detector. If no face is detected (e.g. poor lighting), it uses a center-top screen ROI fallback.

2. **Pulse Signal Extraction (rPPG)**:
   It extracts the Blood Volume Pulse (BVP) signal from skin color variations. It supports:
   - **POS (Plane-Orthogonal-to-Skin)**: A state-of-the-art projection algorithm robust to minor head motion.
   - **CHROM (Chrominance-based method)**: A robust method based on the color differences of the skin.
   - **Green-only**: Simple green channel analysis (since hemoglobin absorbs green light best).

3. **Autonomic Stress (HRV) & Respiratory Rate**:
   - **Heart Rate**: Computed using Fast Fourier Transform (FFT) to identify the dominant frequency peak.
   - **HRV metrics (SDNN/RMSSD)**: Extracted by identifying peaks in the BVP signal and analyzing the standard deviation and successive differences of peak-to-peak (NN) intervals in milliseconds.
   - **Respiratory Rate**: Estimated from the low-frequency amplitude modulation envelope of the BVP signal.
   - **HRV Risk Flag**: Set to `True` if `RMSSD < 25ms` or `SDNN < 30ms`, which are standard clinical indicators of elevated autonomic stress (e.g. associated with hypertension or chronic fatigue).

---

## Directory Structure

```
AI-Services(rPPG)/
├── app/
│   ├── __init__.py
│   ├── main.py                   # FastAPI server endpoints
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── rppg.py               # Pydantic schemas
│   └── services/
│       ├── __init__.py
│       ├── face_mesh_extractor.py # Video reading & ROI tracking
│       └── signal_processor.py   # Signal processing algorithms (POS, CHROM, FFT)
├── tests/
│   ├── __init__.py
│   └── test_pipeline.py          # pytest suite with synthetic signal generators
├── requirements.txt              # Microservice dependencies
├── README.md                     # Documentation
├── generate_zip.py               # Packager script
└── rppg_ai_service.zip           # Packaged ZIP archive
```

---

## Quick Start

### 1. Installation
Ensure you have **Python 3.11+** installed. In this directory, run:

```bash
# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Running the Server
Start the development server using uvicorn:

```bash
uvicorn app.main:app --reload --port 8010
```

The interactive API documentation will be available at:
* Swagger UI: http://localhost:8010/docs
* Redoc: http://localhost:8010/redoc

---

## API Endpoints

### 1. `POST /rppg/process-video`
Processes an uploaded facial video clip (MP4, AVI, WebM, etc.) and returns the extracted rPPG features.
* **Payload**: Multipart Form-Data with a `file` field.
* **Query Parameters**:
  - `algorithm`: (Optional) `'pos'` (default), `'chrom'`, or `'green'`.
* **Response**:
  ```json
  {
    "hrv_flag": false,
    "hr_bpm": 72.5,
    "rr_rate": 16.0,
    "sdnn": 48.2,
    "rmssd": 38.6
  }
  ```

### 2. `POST /rppg/process-signal`
Allows offline-first clients (like an Android/iOS App) to extract average skin color signals on-device (saving bandwidth and preserving privacy) and upload the time-series to the server for advanced filtering, peak detection, and HRV analytics.
* **Payload**: JSON
  ```json
  {
    "signal": [[120.1, 130.4, 95.2], [120.2, 130.5, 95.3], ...],
    "fps": 30.0,
    "algorithm": "pos"
  }
  ```
* **Response**: Same as `/rppg/process-video`.

### 3. `GET /health`
Returns the status of the service and confirms the availability of MediaPipe Face Mesh.

---

## Running Tests

Run the test suite using `pytest` to verify the signal processing and endpoint logic against synthetic heart rate and respiratory rate modulations:

```bash
pytest
```
