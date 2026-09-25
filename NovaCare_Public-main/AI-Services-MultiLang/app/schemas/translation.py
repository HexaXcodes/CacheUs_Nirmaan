from typing import Optional
from pydantic import BaseModel


class TranslateInputRequest(BaseModel):
    text: Optional[str] = None
    audio_base64: Optional[str] = None
    image_base64: Optional[str] = None
    source_lang: Optional[str] = None


class TranslateInputResponse(BaseModel):
    translated_text: str
    detected_lang: Optional[str] = None
    confidence: Optional[float] = None


class TranslateOutputRequest(BaseModel):
    text: str
    target_lang: str


class TranslateOutputResponse(BaseModel):
    translated_text: str
    target_lang: str
