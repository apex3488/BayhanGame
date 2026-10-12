from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = BACKEND_ROOT / "data" / "bayhan_miniapp.db"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Absolute path only — never point this at the Telegram bot apex_game.db
    miniapp_database_url: str = Field(
        default=f"sqlite+aiosqlite:///{DEFAULT_DB_PATH.as_posix()}",
        alias="MINIAPP_DATABASE_URL",
    )
    jwt_secret: str = Field(default="", alias="MINIAPP_JWT_SECRET")
    jwt_ttl_seconds: int = Field(default=60 * 60 * 24 * 7, alias="MINIAPP_JWT_TTL_SECONDS")
    cors_origins: str = Field(
        default="http://localhost:3000,http://localhost:4173,https://apex3488.github.io",
        alias="MINIAPP_CORS_ORIGINS",
    )
    starting_balance_usd: int = Field(default=50_000, alias="MINIAPP_STARTING_BALANCE_USD")
    crash_min_bet: int = Field(default=1, alias="MINIAPP_CRASH_MIN_BET")
    crash_max_bet: int = Field(default=10_000, alias="MINIAPP_CRASH_MAX_BET")
    # One-time bootstrap secret for creating the first admin (empty = disabled)
    admin_bootstrap_secret: str = Field(default="", alias="MINIAPP_ADMIN_BOOTSTRAP_SECRET")
    rate_limit_auth_per_minute: int = Field(default=20, alias="MINIAPP_AUTH_RATE_LIMIT")

    def resolved_sqlite_path(self) -> Path | None:
        url = self.miniapp_database_url
        prefix = "sqlite+aiosqlite:///"
        if not url.startswith(prefix):
            return None
        raw = url[len(prefix) :]
        if raw.startswith("./"):
            return (BACKEND_ROOT / raw[2:]).resolve()
        return Path(raw).resolve()

    def assert_not_bot_database(self) -> None:
        path = self.resolved_sqlite_path()
        if path is None:
            return
        name = path.name.lower()
        if name == "apex_game.db":
            raise RuntimeError(
                "Refusing to use apex_game.db — that file belongs to the Telegram bot. "
                "Set MINIAPP_DATABASE_URL to a dedicated Mini App database."
            )
        # Also refuse if path clearly lives inside the bot project folder name
        parts = {p.lower() for p in path.parts}
        if "apex game" in parts and name == "apex_game.db":
            raise RuntimeError("Refusing Mini App DB path inside the Telegram bot project.")

    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if not settings.jwt_secret or len(settings.jwt_secret) < 32:
        # Dev fallback — production must set MINIAPP_JWT_SECRET
        settings.jwt_secret = os.getenv("MINIAPP_JWT_SECRET") or (
            "dev-only-change-me-bayhan-miniapp-jwt-secret!!"
        )
    settings.assert_not_bot_database()
    return settings
