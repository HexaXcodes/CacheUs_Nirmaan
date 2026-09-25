"""
Translation service — mock implementation.

Passes text through unchanged (English input assumed).
Replace with a real translation API (Google Translate, IndicTrans, etc.) for production.
"""
from typing import Optional


async def translate_to_english(
    text: Optional[str] = None,
    audio_base64: Optional[str] = None,
    image_base64: Optional[str] = None,
    source_lang: Optional[str] = None,
) -> dict:
    # Mock: return text as-is; detected lang is source_lang or "en"
    return {
        "translated_text": text or "",
        "detected_lang": source_lang or "en",
        "confidence": 1.0,
    }


async def translate_from_english(text: str, target_lang: str) -> dict:
    # Mock: return text as-is for English targets; stub for others
    return {
        "translated_text": text,
        "target_lang": target_lang,
    }
