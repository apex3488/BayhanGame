from __future__ import annotations

from collections.abc import AsyncIterator
from pathlib import Path

from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import get_settings


class Base(DeclarativeBase):
    pass


engine = None
SessionLocal: async_sessionmaker[AsyncSession] | None = None


def _configure_sqlite(sync_engine) -> None:
    @event.listens_for(sync_engine, "connect")
    def _on_connect(dbapi_connection, _record) -> None:  # noqa: ANN001
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.close()


def init_engine() -> async_sessionmaker[AsyncSession]:
    global engine, SessionLocal
    settings = get_settings()
    settings.assert_not_bot_database()
    path = settings.resolved_sqlite_path()
    if path is not None:
        path.parent.mkdir(parents=True, exist_ok=True)

    engine = create_async_engine(
        settings.miniapp_database_url,
        echo=False,
        connect_args={"check_same_thread": False},
    )
    _configure_sqlite(engine.sync_engine)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    return SessionLocal


async def create_tables() -> None:
    from app import models  # noqa: F401

    assert engine is not None
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def dispose_engine() -> None:
    global engine, SessionLocal
    if engine is not None:
        await engine.dispose()
    engine = None
    SessionLocal = None


async def get_session() -> AsyncIterator[AsyncSession]:
    assert SessionLocal is not None
    async with SessionLocal() as session:
        yield session


async def database_identity_check() -> dict[str, str | bool]:
    """Return safe diagnostics confirming we are not on the bot DB."""
    settings = get_settings()
    path = settings.resolved_sqlite_path()
    return {
        "engine": "sqlite",
        "basename": path.name if path else "unknown",
        "is_bot_db": bool(path and path.name.lower() == "apex_game.db"),
        "path_exists": bool(path and path.exists()),
    }
