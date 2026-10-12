from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.config import get_settings
from app.db import create_tables, database_identity_check, dispose_engine, init_engine
from app.routers import admin, auth, crash, economy, promos, store
from app.schemas import HealthOut
from app.seed import seed_store


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings = get_settings()
    settings.assert_not_bot_database()
    session_factory = init_engine()
    await create_tables()
    async with session_factory() as session:
        await seed_store(session)
    yield
    await dispose_engine()


app = FastAPI(
    title="BAYHAN GAME Mini App API",
    version=__version__,
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth.router, prefix="/api")
app.include_router(economy.router, prefix="/api")
app.include_router(crash.router, prefix="/api")
app.include_router(promos.router, prefix="/api")
app.include_router(store.router, prefix="/api")
app.include_router(admin.router, prefix="/api")


@app.get("/health", response_model=HealthOut)
async def health() -> HealthOut:
    return HealthOut(database=await database_identity_check())
