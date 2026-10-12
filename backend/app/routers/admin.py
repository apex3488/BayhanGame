from __future__ import annotations

import json
import secrets

from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select

from app.config import get_settings
from app.deps import CurrentAdmin, SessionDep
from app.models import AuditLog, CrashRound, PromoCode, Transaction, User
from app.schemas import (
    AdminAdjustBalanceRequest,
    AdminBanRequest,
    AdminBootstrapRequest,
    AdminPromoCreate,
    AdminResetPasswordRequest,
    NotificationCreate,
    TokenResponse,
    UserPublic,
)
from app.models import Notification
from app.security import create_access_token, hash_password, validate_login, validate_password
from app.services.audit import write_audit
from app.services.economy import EconomyError, apply_wallet_delta

router = APIRouter(prefix="/admin", tags=["admin"])


@router.post("/bootstrap", response_model=TokenResponse)
async def bootstrap_admin(body: AdminBootstrapRequest, session: SessionDep) -> TokenResponse:
    """One-time first admin creation. Requires MINIAPP_ADMIN_BOOTSTRAP_SECRET."""
    settings = get_settings()
    secret = settings.admin_bootstrap_secret
    if not secret or not secrets.compare_digest(secret, body.bootstrap_secret):
        raise HTTPException(status_code=403, detail="Bootstrap disabled")

    existing_admin = await session.scalar(select(User.id).where(User.is_admin.is_(True)))
    if existing_admin is not None:
        raise HTTPException(status_code=403, detail="Bootstrap already used")

    login = validate_login(body.login)
    if login is None or not validate_password(body.password):
        raise HTTPException(status_code=400, detail="Invalid login or password")

    user = User(
        login=login,
        password_hash=hash_password(body.password),
        display_name=(body.display_name or login)[:64],
        is_admin=True,
        wallet_usd=settings.starting_balance_usd,
        bank_usd=0,
        starting_granted=True,
    )
    session.add(user)
    await session.flush()
    await write_audit(session, actor_user_id=user.id, action="admin.bootstrap", target=str(user.id))
    # Consume bootstrap by clearing effectiveness: require secret match AND no admins.
    # Document that operator should remove MINIAPP_ADMIN_BOOTSTRAP_SECRET after use.
    await session.commit()
    return TokenResponse(access_token=create_access_token(user_id=user.id, is_admin=True))


@router.get("/dashboard")
async def dashboard(_: CurrentAdmin, session: SessionDep) -> dict:
    players = await session.scalar(select(func.count()).select_from(User)) or 0
    wallet_sum = await session.scalar(select(func.coalesce(func.sum(User.wallet_usd), 0))) or 0
    bank_sum = await session.scalar(select(func.coalesce(func.sum(User.bank_usd), 0))) or 0
    rounds = await session.scalar(select(func.count()).select_from(CrashRound)) or 0
    promos = await session.scalar(select(func.count()).select_from(PromoCode)) or 0
    return {
        "players": players,
        "wallet_sum_usd": int(wallet_sum),
        "bank_sum_usd": int(bank_sum),
        "crash_rounds": rounds,
        "promo_codes": promos,
    }


@router.get("/players", response_model=list[UserPublic])
async def list_players(_: CurrentAdmin, session: SessionDep, q: str | None = None) -> list[User]:
    stmt = select(User).order_by(User.id.desc()).limit(100)
    if q:
        like = f"%{q.strip().lower()}%"
        stmt = select(User).where(User.login.like(like)).order_by(User.id.desc()).limit(100)
    return list((await session.scalars(stmt)).all())


@router.post("/players/{user_id}/ban")
async def ban_player(
    user_id: int, body: AdminBanRequest, admin: CurrentAdmin, session: SessionDep
) -> dict:
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Not found")
    user.is_banned = True
    user.ban_reason = body.reason
    await write_audit(
        session, actor_user_id=admin.id, action="admin.ban", target=str(user_id), detail=body.reason
    )
    await session.commit()
    return {"ok": True}


@router.post("/players/{user_id}/unban")
async def unban_player(user_id: int, admin: CurrentAdmin, session: SessionDep) -> dict:
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Not found")
    user.is_banned = False
    user.ban_reason = None
    await write_audit(session, actor_user_id=admin.id, action="admin.unban", target=str(user_id))
    await session.commit()
    return {"ok": True}


@router.post("/players/{user_id}/reset-password")
async def reset_password(
    user_id: int, body: AdminResetPasswordRequest, admin: CurrentAdmin, session: SessionDep
) -> dict:
    if not validate_password(body.new_password):
        raise HTTPException(status_code=400, detail="Invalid password")
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Not found")
    user.password_hash = hash_password(body.new_password)
    await write_audit(
        session, actor_user_id=admin.id, action="admin.reset_password", target=str(user_id)
    )
    await session.commit()
    return {"ok": True}


@router.post("/balance/adjust")
async def adjust_balance(
    body: AdminAdjustBalanceRequest, admin: CurrentAdmin, session: SessionDep
) -> dict:
    user = await session.get(User, body.user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Not found")
    try:
        tx = await apply_wallet_delta(
            session,
            user=user,
            amount_usd=body.amount_usd,
            tx_type="ADMIN_ADJUST",
            reason=body.reason,
            idempotency_key=f"admin-adj:{body.idempotency_key}",
        )
        await write_audit(
            session,
            actor_user_id=admin.id,
            action="admin.balance",
            target=str(body.user_id),
            detail=f"{body.amount_usd}:{body.reason}",
        )
        await session.commit()
        return {"ok": True, "transaction_id": tx.id}
    except EconomyError as exc:
        await session.rollback()
        raise HTTPException(status_code=400, detail=exc.message) from exc


@router.post("/promos")
async def create_promo(body: AdminPromoCreate, admin: CurrentAdmin, session: SessionDep) -> dict:
    if body.reward_type == "usd":
        if not body.reward_usd or body.reward_usd <= 0:
            raise HTTPException(status_code=400, detail="reward_usd required")
        payload = {"usd": body.reward_usd}
    else:
        if not body.reward_item_id:
            raise HTTPException(status_code=400, detail="reward_item_id required")
        payload = {"item_id": body.reward_item_id}

    code = body.code.strip().upper()
    promo = PromoCode(
        code=code,
        description=body.description,
        reward_type=body.reward_type,
        reward_payload=json.dumps(payload),
        max_total=body.max_total,
        max_per_user=body.max_per_user,
        is_active=body.is_active,
    )
    session.add(promo)
    await write_audit(session, actor_user_id=admin.id, action="admin.promo_create", target=code)
    await session.commit()
    return {"ok": True, "code": code}


@router.get("/audit")
async def audit_logs(_: CurrentAdmin, session: SessionDep, limit: int = 50) -> list[dict]:
    limit = max(1, min(limit, 200))
    rows = (
        await session.scalars(select(AuditLog).order_by(AuditLog.id.desc()).limit(limit))
    ).all()
    return [
        {
            "id": r.id,
            "actor_user_id": r.actor_user_id,
            "action": r.action,
            "target": r.target,
            "detail": r.detail,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.post("/notifications")
async def create_notification(
    body: NotificationCreate, admin: CurrentAdmin, session: SessionDep
) -> dict:
    note = Notification(title=body.title, body=body.body, is_published=True)
    session.add(note)
    await write_audit(session, actor_user_id=admin.id, action="admin.notification", target=body.title)
    await session.commit()
    return {"ok": True, "id": note.id}


@router.get("/crash/rounds")
async def crash_rounds(_: CurrentAdmin, session: SessionDep) -> list[dict]:
    rows = (
        await session.scalars(select(CrashRound).order_by(CrashRound.id.desc()).limit(50))
    ).all()
    return [
        {
            "public_id": r.public_id,
            "status": r.status,
            "crash_multiplier": round(r.crash_multiplier_bp / 100, 2),
            "server_seed_hash": r.server_seed_hash,
            "server_seed": r.server_seed,
        }
        for r in rows
    ]
