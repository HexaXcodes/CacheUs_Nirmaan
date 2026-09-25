"""
TTS service — mock implementation.

Returns None for audio (no audio generated) so callers can handle gracefully.
Replace with Coqui TTS, Google TTS, or similar for production.
"""
from typing import Optional


async def text_to_speech(text: str, lang: str = "en") -> Optional[str]:
    """Returns base64-encoded audio string, or None if TTS is mocked."""
    return None
