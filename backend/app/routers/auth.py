from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select

from app.config import get_settings
from app.deps import CurrentUser, SessionDep
from app.models import Loadout, Transaction, User
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserPublic
from app.security import (
    auth_limiter,
    create_access_token,
    hash_password,
    validate_login,
    validate_password,
    verify_password,
)
from app.services.audit import write_audit

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(body: RegisterRequest, request: Request, session: SessionDep) -> TokenResponse:
    settings = get_settings()
    ip = request.client.host if request.client else "unknown"
    if not auth_limiter.allow(f"reg:{ip}", limit=settings.rate_limit_auth_per_minute):
        raise HTTPException(status_code=429, detail="Too many requests")

    login = validate_login(body.login)
    if login is None or not validate_password(body.password):
        raise HTTPException(status_code=400, detail="Invalid login or password")

    exists = await session.scalar(select(User.id).where(User.login == login))
    if exists is not None:
        raise HTTPException(status_code=400, detail="Invalid login or password")

    display = (body.display_name or login).strip()[:64] or login
    user = User(
        login=login,
        password_hash=hash_password(body.password),
        display_name=display,
        wallet_usd=settings.starting_balance_usd,
        bank_usd=0,
        starting_granted=True,
        level=1,
        xp=0,
    )
    session.add(user)
    await session.flush()
    session.add(Loadout(user_id=user.id))
    session.add(
        Transaction(
            user_id=user.id,
            type="STARTING_CAPITAL",
            amount_usd=settings.starting_balance_usd,
            wallet_after=user.wallet_usd,
            bank_after=0,
            reason="Starting capital",
            status="completed",
            idempotency_key=f"start:{user.id}",
        )
    )
    await write_audit(session, actor_user_id=user.id, action="user.register", target=str(user.id))
    await session.commit()
    return TokenResponse(access_token=create_access_token(user_id=user.id, is_admin=user.is_admin))


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, request: Request, session: SessionDep) -> TokenResponse:
    settings = get_settings()
    ip = request.client.host if request.client else "unknown"
    if not auth_limiter.allow(f"login:{ip}", limit=settings.rate_limit_auth_per_minute):
        raise HTTPException(status_code=429, detail="Too many requests")

    login = validate_login(body.login) or ""
    user = await session.scalar(select(User).where(User.login == login))
    # Generic error — do not reveal whether login exists
    if user is None or not verify_password(user.password_hash, body.password):
        raise HTTPException(status_code=401, detail="Invalid login or password")
    if user.is_banned:
        raise HTTPException(status_code=403, detail="Account banned")

    await write_audit(session, actor_user_id=user.id, action="user.login", target=str(user.id))
    await session.commit()
    return TokenResponse(access_token=create_access_token(user_id=user.id, is_admin=user.is_admin))


@router.get("/me", response_model=UserPublic)
async def me(user: CurrentUser) -> User:
    return user
