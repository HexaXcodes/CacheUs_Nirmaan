from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    TRANSLATIONS_DIR: str = Field(default="data/translations")
    TTS_PROVIDER: str = Field(default="mock")  # mock | google | coqui
    TTS_OUTPUT_DIR: str = Field(default="./data/tts_cache")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
