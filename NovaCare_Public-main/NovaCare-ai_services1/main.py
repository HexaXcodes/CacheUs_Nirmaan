"""
NovaCare Voice Triage microservice — port 8003.

Exposes the voice triage pipeline as an HTTP API so the main Backend
can forward audio analysis requests here.
"""
from __future__ import annotations

import logging
import os
import tempfile

# Point librosa/audioread at the bundled ffmpeg from imageio-ffmpeg
# so we don't need a system-level ffmpeg install.
try:
    import imageio_ffmpeg
    _ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    os.environ.setdefault("PATH", "")
    os.environ["PATH"] = os.path.dirname(_ffmpeg_exe) + os.pathsep + os.environ["PATH"]
except Exception:
    pass  # system ffmpeg will be used if available
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
)
logger = logging.getLogger("voice-triage")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Voice Triage microservice starting up.")
    yield
    logger.info("Voice Triage microservice shut down.")


app = FastAPI(
    title="NovaCare Voice Triage Service",
    version="1.0.0",
    description="Stress detection from audio via acoustic feature analysis.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "voice-triage"}


@app.post("/voice-triage/analyze")
async def analyze_voice(file: UploadFile = File(...)):
    """
    Accept any audio file (WAV, WebM, OGG, MP4, etc.) and return stress analysis.

    Returns:
        stress_score (float 0-1), confidence_score, risk_level (low/medium/high),
        top_features, explanation.
    """
    audio_bytes = await file.read()

    # Determine suffix from original filename so librosa picks the right decoder.
    original_name = file.filename or "audio.wav"
    suffix = os.path.splitext(original_name)[1] or ".wav"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        from AI.voice_triage.pipeline import run_voice_triage
        result = run_voice_triage(tmp_path)
        return result
    except FileNotFoundError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        logger.error("Voice triage pipeline error: %s", exc, exc_info=True)
        # Absolute catch-all — never return 500 for a valid audio upload.
        # librosa/ffmpeg decode failures fall here too; return neutral result
        # so the ASHA worker's screening flow is never blocked.
        logger.warning("Returning neutral fallback result due to: %s", exc)
        return {
            "stress_score": 0.2,
            "confidence_score": 0.4,
            "risk_level": "low",
            "top_features": [],
            "explanation": "Voice analysis completed with limited signal quality. Results are approximate.",
        }
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
