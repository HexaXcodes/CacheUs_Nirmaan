"""
NovaCare rPPG AI Service — v2.0 (fingertip PPG)

ARCHITECTURE CHANGE (v2):
  - REMOVED: facial blood-flow tracking, MediaPipe face-mesh, OpenCV face ROI
  - REASON:   skin-tone / melanin / outdoor-lighting variability made facial
              rPPG scientifically fragile for rural Indian population
  - REPLACED: client-side fingertip PPG (rear camera + flash) sends an
              already-extracted RGB signal array to /rppg/process-signal
  - RETAINED: /rppg/process-video as a DEPRECATED fallback (no face tracking;
              it will be removed in a future release)

Scientific basis of fingertip PPG:
  Blood-volume pulse changes modulate the amount of flashlight transmitted
  through the finger. The red channel (~660 nm) tracks oxyhaemoglobin
  concentration changes with each heartbeat. This approach is skin-tone
  agnostic — it measures temporal variation, not static colour.

Primary endpoint: POST /rppg/process-signal
"""
import logging

from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware

from app.schemas.rppg import SignalInput, RppgOutput
from app.services.signal_processor import analyze_rppg_signal

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s :: %(message)s",
)
logger = logging.getLogger("novacare.rppg")

app = FastAPI(
    title="NovaCare rPPG Service — fingertip PPG",
    description=(
        "Processes pre-extracted fingertip PPG signals (RGB intensity arrays) "
        "captured by the frontend via rear camera + flashlight. "
        "Returns heart rate, HRV metrics, and a cardiovascular stress flag."
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "components": {
            "fastapi": "OK",
            "numpy":   "OK",
            "scipy":   "OK",
        },
        "mode": "fingertip-ppg",
        "facial_rppg": "removed",
    }


@app.post(
    "/rppg/process-signal",
    response_model=RppgOutput,
    summary="Primary endpoint — process fingertip PPG signal array.",
)
async def process_signal(body: SignalInput):
    """
    Accepts a pre-extracted RGB signal array from the frontend.

    The client captures ~30 fps video frames from the rear camera while the
    user's fingertip covers the lens + flashlight, computes average R/G/B
    per frame (64×64 canvas), and sends the resulting list here.

    Processing pipeline:
      1. Bandpass filter (0.7–4.0 Hz, ~42–240 bpm)
      2. Detrending (remove slow drift)
      3. POS or CHROM algorithm for pulse signal extraction
      4. FFT peak detection → heart rate (bpm)
      5. Peak-to-peak intervals → HRV metrics (RMSSD, SDNN)
    """
    logger.info(
        "Signal received: %d frames at %.1f fps, algorithm=%s",
        len(body.signal), body.fps, body.algorithm,
    )
    try:
        results = analyze_rppg_signal(body.signal, fps=body.fps, algorithm=body.algorithm)
        logger.info("Signal processed: hr=%.1f bpm", results.get("hr_bpm", 0))
        return RppgOutput(**results)
    except ValueError as exc:
        logger.error("Signal validation error: %s", exc)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except Exception as exc:
        logger.error("Signal processing error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signal processing failed: {exc}",
        )


# ── DEPRECATED ─────────────────────────────────────────────────────────────
# /rppg/process-video is kept only for backward compatibility during the
# transition period. It no longer performs face tracking — it extracts the
# average frame colour directly (simulating what the frontend now does
# client-side). Will be removed once all clients use /rppg/process-signal.

import os, shutil, tempfile
from fastapi import UploadFile, File

@app.post(
    "/rppg/process-video",
    response_model=RppgOutput,
    summary="[DEPRECATED] Video upload — use /rppg/process-signal instead.",
    deprecated=True,
)
async def process_video_deprecated(
    file: UploadFile = File(...),
    algorithm: str = Query(default="pos"),
):
    """
    DEPRECATED — accepts a video file, extracts per-frame average RGB
    (no face tracking), then calls process-signal pipeline.
    Kept for backward compatibility only.
    """
    logger.warning("DEPRECATED /rppg/process-video called. Migrate to /rppg/process-signal.")

    ext = os.path.splitext(file.filename or "upload")[1].lower() or ".webm"
    allowed = {".mp4", ".avi", ".mov", ".mkv", ".webm", ".3gp"}
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported format: {ext}")

    tmp_path = os.path.join(tempfile.gettempdir(), next(tempfile._get_candidate_names()) + ext)
    try:
        with open(tmp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        try:
            import cv2
            import numpy as np
        except ImportError:
            raise HTTPException(
                status_code=501,
                detail=(
                    "OpenCV (cv2) is not installed on this service. "
                    "Please use the /rppg/process-signal endpoint instead: "
                    "capture per-frame average RGB client-side and POST the signal array."
                ),
            )

        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            raise HTTPException(
                status_code=400,
                detail=f"Could not open video file (format: {ext}). Try re-recording or use /rppg/process-signal.",
            )

        fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
        if fps < 5 or fps > 240:
            fps = 30.0  # guard against malformed metadata

        signals = []
        max_frames = int(fps * 120)  # cap at 2 minutes to avoid memory issues
        while len(signals) < max_frames:
            ok, frame = cap.read()
            if not ok:
                break
            b, g, r = cv2.split(frame)
            signals.append([float(r.mean()), float(g.mean()), float(b.mean())])
        cap.release()

        if len(signals) < int(fps * 5):
            raise HTTPException(
                status_code=400,
                detail=f"Video too short ({len(signals)} frames at {fps:.0f} fps). Need at least 5 seconds.",
            )

        results = analyze_rppg_signal(signals, fps=fps, algorithm=algorithm)
        return RppgOutput(**results)

    except HTTPException:
        raise
    except ValueError as exc:
        logger.error("Signal validation error in deprecated endpoint: %s", exc)
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("Deprecated video endpoint error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Video processing failed: {exc}. Consider using /rppg/process-signal instead.",
        )
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass
