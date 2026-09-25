from typing import Optional
from pydantic import BaseModel


class RiskExplainRequest(BaseModel):
    composite_score: float
    tier: str  # green | amber | red
    target_lang: str = "en"
    generate_audio: bool = False


class RiskExplainResponse(BaseModel):
    explanation: str
    action: str
    headline: str
    audio_base64: Optional[str] = None
    target_lang: str


class TTSRequest(BaseModel):
    text: str
    lang: str = "en"


class TTSResponse(BaseModel):
    audio_base64: Optional[str] = None
    message: str
