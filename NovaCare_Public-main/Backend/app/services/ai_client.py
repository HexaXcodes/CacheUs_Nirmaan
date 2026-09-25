"""
HTTP client for the three AI microservices:
  - rPPG service      (port 8001)  — /rppg/process-signal, /rppg/process-video
  - Voice triage      (port 8003)  — /voice-triage/analyze
  - Multilang service (port 8002)  — /health only (used for status)

Failures return a degraded dict rather than raising so the backend stays up
even when AI services are offline.
"""
from __future__ import annotations

import logging
from typing import Any

import httpx
from fastapi import UploadFile

from app.config import settings

logger = logging.getLogger(__name__)

_TIMEOUT = 30.0
_LONG_TIMEOUT = 120.0  # video/audio uploads can be slow


class AIClient:
    def __init__(self) -> None:
        self._client: httpx.AsyncClient | None = None

    async def startup(self) -> None:
        self._client = httpx.AsyncClient(timeout=_LONG_TIMEOUT)

    async def shutdown(self) -> None:
        if self._client:
            await self._client.aclose()
            self._client = None

    async def _get(self, url: str) -> dict[str, Any]:
        try:
            r = await self._client.get(url, timeout=_TIMEOUT)
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            logger.warning("AI service GET %s failed: %s", url, exc)
            return {"status": "unavailable", "error": str(exc)}

    async def _post_json(self, url: str, payload: dict) -> dict[str, Any]:
        try:
            r = await self._client.post(url, json=payload)
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            logger.warning("AI service POST %s failed: %s", url, exc)
            return {"status": "unavailable", "error": str(exc)}

    async def _post_file(self, url: str, upload: UploadFile, extra_params: dict | None = None) -> dict[str, Any]:
        try:
            contents = await upload.read()
            files = {"file": (upload.filename or "upload", contents, upload.content_type or "application/octet-stream")}
            r = await self._client.post(url, files=files, params=extra_params or {})
            r.raise_for_status()
            return r.json()
        except Exception as exc:
            logger.warning("AI service file POST %s failed: %s", url, exc)
            return {"status": "unavailable", "error": str(exc)}

    # ------------------------------------------------------------------
    # Health checks
    # ------------------------------------------------------------------

    async def rppg_health(self) -> dict[str, Any]:
        return await self._get(f"{settings.RPPG_SERVICE_URL}/health")

    async def multilang_health(self) -> dict[str, Any]:
        return await self._get(f"{settings.MULTILANG_SERVICE_URL}/health")

    async def voice_triage_health(self) -> dict[str, Any]:
        return await self._get(f"{settings.VOICE_TRIAGE_SERVICE_URL}/health")

    # ------------------------------------------------------------------
    # rPPG
    # ------------------------------------------------------------------

    async def process_signal(self, payload: dict[str, Any]) -> dict[str, Any]:
        return await self._post_json(f"{settings.RPPG_SERVICE_URL}/rppg/process-signal", payload)

    async def process_video(self, upload: UploadFile, algorithm: str = "pos") -> dict[str, Any]:
        return await self._post_file(
            f"{settings.RPPG_SERVICE_URL}/rppg/process-video",
            upload,
            extra_params={"algorithm": algorithm},
        )

    # ------------------------------------------------------------------
    # Voice triage
    # ------------------------------------------------------------------

    async def analyze_voice(self, upload: UploadFile) -> dict[str, Any]:
        return await self._post_file(
            f"{settings.VOICE_TRIAGE_SERVICE_URL}/voice-triage/analyze",
            upload,
        )


ai_client = AIClient()
