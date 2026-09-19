from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "ClipSage"
    APP_DESCRIPTION: str = (
        "AI-powered media summarizer that turns audio, video, and image content "
        "into structured notes. Transcribes with Groq Whisper, identifies speakers "
        "with Pyannote, and generates TL;DRs, key points, and action items as JSON."
    )
    APP_PHASE: Literal["development", "production"] = "development"

    APP_VERSION: str = "1.0.0"
    APP_VERSION_PREFIX: str = "v1"

    AUTHOR_NAME: str = "Sheharyar Sarmad"
    AUTHOR_EMAIL: str = "developersheharyar2010@gmail.com"

    GROQ_API_KEY: str
    HUGGINGFACEHUB_ACCESS_TOKEN: str

    @property
    def is_production(self) -> bool:
        return self.APP_PHASE == "production"

    @property
    def is_development(self) -> bool:
        return self.APP_PHASE == "development"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    # Return a cached Settings instance. Created once per process
    return Settings()


settings = get_settings()