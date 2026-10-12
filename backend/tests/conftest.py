from __future__ import annotations

import os
from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

# Force isolated temp DB before app import
os.environ["MINIAPP_DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
os.environ["MINIAPP_JWT_SECRET"] = "test-secret-key-at-least-32-characters-long"
os.environ["MINIAPP_ADMIN_BOOTSTRAP_SECRET"] = "bootstrap-test-secret"
os.environ["MINIAPP_CORS_ORIGINS"] = "http://test"

from app.config import get_settings
from app.db import Base, get_session
from app.main import app
from app.seed import seed_store

get_settings.cache_clear()


@pytest_asyncio.fixture
async def client() -> AsyncIterator[AsyncClient]:
    get_settings.cache_clear()
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", connect_args={"check_same_thread": False})
    session_factory = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        await seed_store(session)

    async def _override():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_session] = _override

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
    await engine.dispose()
