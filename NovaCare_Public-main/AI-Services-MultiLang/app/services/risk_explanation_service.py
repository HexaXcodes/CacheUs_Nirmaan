"""
Risk explanation service.

Loads translation JSON files from the Backend data directory and formats
a human-readable explanation for a given risk tier and language.
"""
import json
import os
from typing import Optional

from app.config import settings
from app.services.tts_service import text_to_speech

_STRING_CACHE: dict = {}


def _load_strings(lang: str) -> dict:
    if lang in _STRING_CACHE:
        return _STRING_CACHE[lang]

    path = os.path.join(settings.TRANSLATIONS_DIR, f"{lang}.json")
    fallback = os.path.join(settings.TRANSLATIONS_DIR, "en.json")

    for p in (path, fallback):
        if os.path.exists(p):
            with open(p, encoding="utf-8") as f:
                data = json.load(f)
            _STRING_CACHE[lang] = data
            return data

    return {}


async def build_risk_explanation(
    composite_score: float,
    tier: str,
    target_lang: str = "en",
    generate_audio: bool = False,
) -> dict:
    strings = _load_strings(target_lang)

    tier_key = tier.lower()  # green | amber | red
    score_str = str(round(composite_score, 1))

    explanation_tmpl = strings.get(f"explain_{tier_key}", f"Risk tier: {tier_key}. Score: {score_str}.")
    explanation = explanation_tmpl.replace("{score}", score_str)

    action = strings.get(f"action_{tier_key}", "Follow up with your health worker.")
    headline = strings.get(f"report_headline_{tier_key}", f"Risk: {tier_key}")

    audio_b64: Optional[str] = None
    if generate_audio:
        audio_b64 = await text_to_speech(explanation, target_lang)

    return {
        "explanation": explanation,
        "action": action,
        "headline": headline,
        "audio_base64": audio_b64,
        "target_lang": target_lang,
    }


def get_ui_strings(lang: str) -> dict:
    return _load_strings(lang)
