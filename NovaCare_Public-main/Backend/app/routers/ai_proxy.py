"""
AI proxy router — forwards requests to the AI microservices.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, Query, UploadFile

from app.core.deps import get_current_principal as get_current_user
from app.services.ai_client import ai_client

router = APIRouter(prefix="/ai", tags=["ai"])


@router.get("/health")
async def ai_health():
    rppg = await ai_client.rppg_health()
    multilang = await ai_client.multilang_health()
    voice = await ai_client.voice_triage_health()
    return {
        "success": True,
        "data": {"rppg": rppg, "multilang": multilang, "voice_triage": voice},
        "error": None,
    }


@router.post("/rppg/process-signal")
async def proxy_rppg_signal(payload: dict, _=Depends(get_current_user)):
    result = await ai_client.process_signal(payload)
    return {"success": True, "data": result, "error": None}


@router.post("/rppg/process-video")
async def proxy_rppg_video(
    file: UploadFile = File(...),
    algorithm: str = Query(default="pos"),
    _=Depends(get_current_user),
):
    result = await ai_client.process_video(file, algorithm)
    return {"success": True, "data": result, "error": None}


@router.post("/voice-triage/analyze")
async def proxy_voice_triage(
    file: UploadFile = File(...),
    _=Depends(get_current_user),
):
    result = await ai_client.analyze_voice(file)
    return {"success": True, "data": result, "error": None}
