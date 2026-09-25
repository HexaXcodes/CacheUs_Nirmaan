"""External waveform inference, deliberately independent of facial-video rPPG."""
import json
import asyncio
import httpx
from pydantic import ValidationError
from app.config import settings
from app.core.responses import AppError
from app.schemas.measurement import Analysis, Waveform

async def analyze(body):
    if body.fixture:
        if settings.APP_ENV != 'dev' or not settings.PPG_ALLOW_FIXTURES:
            raise AppError('Development fixtures are disabled', 403)
        if body.metadata.source != 'dataset_simulator' or not body.metadata.synthetic:
            raise AppError('Fixtures require synthetic dataset_simulator provenance', 422)
        if body.fixture == 'unavailable':
            raise AppError('PPG ML service unavailable; retry later', 503)
        poor = body.fixture == 'poor'
        return Analysis(quality_score=0.1 if poor else 0.95, acceptable=not poor,
            retry_reason='Synthetic poor signal: reposition sensor and retry' if poor else None,
            heart_rate_bpm=None if poor else 72,
            experimental_bp={'systolic': 120, 'diastolic': 80} if body.fixture == 'experimental' else None,
            model='synthetic-ui-fixture', model_version='1')
    if not settings.PPG_ML_URL:
        raise AppError('PPG ML service is not configured', 503)
    payload = Waveform.model_validate(body.model_dump(include=set(Waveform.model_fields)))
    try:
        async with asyncio.timeout(settings.PPG_TIMEOUT_SECONDS), httpx.AsyncClient(timeout=settings.PPG_TIMEOUT_SECONDS) as client:
            async with client.stream('POST', settings.PPG_ML_URL.rstrip('/') + '/analyze',
                                     json=payload.model_dump(mode='json')) as response:
                response.raise_for_status()
                data = bytearray()
                async for chunk in response.aiter_bytes():
                    data.extend(chunk)
                    if len(data) > 16384:
                        raise AppError('Invalid oversized ML response', 502)
        return Analysis.model_validate(json.loads(data))
    except (httpx.HTTPError, TimeoutError) as exc:
        raise AppError('PPG ML service unavailable; retry later', 503) from exc
    except (ValidationError, ValueError) as exc:
        raise AppError('Invalid ML response', 502) from exc
