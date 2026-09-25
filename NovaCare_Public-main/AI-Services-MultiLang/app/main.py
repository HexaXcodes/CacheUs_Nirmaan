"""
NovaCare MultiLang microservice — port 8002.

Handles multilingual translation, risk explanation, TTS, and UI string lookup.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers.multilang import router as multilang_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s :: %(message)s",
)
logger = logging.getLogger("multilang")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("MultiLang microservice starting up.")
    yield
    logger.info("MultiLang microservice shut down.")


app = FastAPI(
    title="NovaCare MultiLang Service",
    version="1.0.0",
    description="Multilingual translation, risk explanation, and TTS for NovaCare.",
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
    return {"status": "healthy", "service": "multilang"}


app.include_router(multilang_router)
