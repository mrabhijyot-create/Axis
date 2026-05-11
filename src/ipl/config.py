"""Centralised settings — every module reads from here, never from os.environ directly."""
from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
FIXTURES_DIR = DATA_DIR / "fixtures"
RAW_DIR = DATA_DIR / "raw"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-opus-4-6"

    openweather_api_key: str | None = None

    live_feed_url: str | None = None
    live_poll_interval_seconds: int = 30

    ipl_db_url: str = f"sqlite:///{DATA_DIR / 'ipl.db'}"

    warmup_lead_minutes: int = 30
    active_lead_minutes: int = 10


settings = Settings()
