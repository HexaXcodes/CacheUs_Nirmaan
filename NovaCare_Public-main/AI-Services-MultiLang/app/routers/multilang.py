from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.schemas.translation import (
    TranslateInputRequest,
    TranslateOutputRequest,
)
from app.schemas.risk_explanation import RiskExplainRequest, TTSRequest
from app.services.translation_service import translate_to_english, translate_from_english
from app.services.risk_explanation_service import build_risk_explanation, get_ui_strings
from app.services.tts_service import text_to_speech

router = APIRouter(prefix="/multilang", tags=["multilang"])


@router.post("/translate-input")
async def translate_input(req: TranslateInputRequest):
    result = await translate_to_english(
        text=req.text,
        audio_base64=req.audio_base64,
        image_base64=req.image_base64,
        source_lang=req.source_lang,
    )
    return {"success": True, "data": result, "error": None}


@router.post("/translate-output")
async def translate_output(req: TranslateOutputRequest):
    result = await translate_from_english(req.text, req.target_lang)
    return {"success": True, "data": result, "error": None}


@router.post("/risk-explain")
async def risk_explain(req: RiskExplainRequest):
    result = await build_risk_explanation(
        composite_score=req.composite_score,
        tier=req.tier,
        target_lang=req.target_lang,
        generate_audio=req.generate_audio,
    )
    return {"success": True, "data": result, "error": None}


@router.post("/tts")
async def tts(req: TTSRequest):
    audio_b64 = await text_to_speech(req.text, req.lang)
    return {
        "success": True,
        "data": {
            "audio_base64": audio_b64,
            "message": "mock TTS — no audio generated" if audio_b64 is None else "ok",
        },
        "error": None,
    }


@router.get("/ui-strings/{lang}")
async def ui_strings(lang: str):
    data = get_ui_strings(lang)
    return {"success": True, "data": data, "error": None}
