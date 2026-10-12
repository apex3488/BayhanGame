from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import InventoryItem, PromoCode, PromoRedemption, StoreItem, User
from app.services.economy import EconomyError, apply_wallet_delta


async def redeem_promo(
    session: AsyncSession,
    *,
    user: User,
    code: str,
    idempotency_key: str,
) -> dict:
    normalized = code.strip().upper()
    promo = await session.scalar(
        select(PromoCode).where(func.upper(PromoCode.code) == normalized).with_for_update()
    )
    if promo is None or not promo.is_active:
        raise EconomyError("invalid_promo", "Promo code is not valid")

    now = datetime.now(timezone.utc)
    if promo.starts_at and promo.starts_at.replace(tzinfo=timezone.utc) > now:
        raise EconomyError("invalid_promo", "Promo code is not valid")
    if promo.ends_at and promo.ends_at.replace(tzinfo=timezone.utc) < now:
        raise EconomyError("invalid_promo", "Promo code is not valid")
    if promo.max_total is not None and promo.used_total >= promo.max_total:
        raise EconomyError("invalid_promo", "Promo code is not valid")

    used_by_user = await session.scalar(
        select(func.count())
        .select_from(PromoRedemption)
        .where(PromoRedemption.promo_id == promo.id, PromoRedemption.user_id == user.id)
    )
    if (used_by_user or 0) >= promo.max_per_user:
        raise EconomyError("already_redeemed", "Promo already used")

    # Idempotency via economy / redemption nonce
    existing = await session.scalar(
        select(PromoRedemption).where(
            PromoRedemption.promo_id == promo.id,
            PromoRedemption.user_id == user.id,
            PromoRedemption.nonce == idempotency_key,
        )
    )
    if existing is not None:
        return {"status": "already_applied", "promo_id": promo.id}

    payload = json.loads(promo.reward_payload)
    if promo.reward_type == "usd":
        amount = int(payload.get("usd", 0))
        if amount <= 0:
            raise EconomyError("invalid_promo", "Promo code is not valid")
        await apply_wallet_delta(
            session,
            user=user,
            amount_usd=amount,
            tx_type="PROMO_REWARD",
            reason=f"Promo {promo.code}",
            idempotency_key=f"promo:{idempotency_key}",
        )
    elif promo.reward_type == "item":
        item_id = str(payload.get("item_id", ""))
        item = await session.get(StoreItem, item_id)
        if item is None or not item.is_active:
            raise EconomyError("invalid_promo", "Promo code is not valid")
        owned = await session.scalar(
            select(InventoryItem).where(
                InventoryItem.user_id == user.id, InventoryItem.item_id == item_id
            )
        )
        if owned is None:
            session.add(InventoryItem(user_id=user.id, item_id=item_id, source="reward"))
    else:
        raise EconomyError("invalid_promo", "Promo code is not valid")

    promo.used_total += 1
    session.add(PromoRedemption(promo_id=promo.id, user_id=user.id, nonce=idempotency_key))
    await session.flush()
    return {"status": "ok", "promo_id": promo.id, "reward_type": promo.reward_type}
