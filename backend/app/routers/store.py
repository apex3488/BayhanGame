from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.deps import CurrentUser, SessionDep
from app.models import InventoryItem, Loadout, StoreItem
from app.services.economy import EconomyError, apply_wallet_delta

router = APIRouter(prefix="/store", tags=["store"])


@router.get("/catalog")
async def catalog(_: CurrentUser, session: SessionDep) -> list[dict]:
    items = (
        await session.scalars(select(StoreItem).where(StoreItem.is_active.is_(True)))
    ).all()
    return [
        {
            "id": i.id,
            "category": i.category,
            "name": i.name,
            "description": i.description,
            "rarity": i.rarity,
            "priceUsd": i.price_usd,
            "purchasable": i.purchasable,
            "preview": i.preview,
        }
        for i in items
    ]


@router.get("/inventory")
async def inventory(user: CurrentUser, session: SessionDep) -> list[dict]:
    rows = (
        await session.scalars(select(InventoryItem).where(InventoryItem.user_id == user.id))
    ).all()
    return [
        {
            "itemId": r.item_id,
            "acquiredAt": r.acquired_at.isoformat() if r.acquired_at else datetime.now(timezone.utc).isoformat(),
            "source": r.source,
        }
        for r in rows
    ]


@router.post("/purchase")
async def purchase(body: dict, user: CurrentUser, session: SessionDep) -> dict:
    item_id = str(body.get("itemId", ""))
    idem = str(body.get("idempotency_key", ""))
    if not item_id or len(idem) < 8:
        raise HTTPException(status_code=400, detail="Invalid request")
    item = await session.get(StoreItem, item_id)
    if item is None or not item.is_active or not item.purchasable:
        raise HTTPException(status_code=404, detail="Item not found")
    owned = await session.scalar(
        select(InventoryItem).where(InventoryItem.user_id == user.id, InventoryItem.item_id == item_id)
    )
    if owned is not None:
        raise HTTPException(status_code=400, detail="Already owned")
    try:
        await apply_wallet_delta(
            session,
            user=user,
            amount_usd=-item.price_usd,
            tx_type="STORE_PURCHASE",
            reason=f"Purchase {item.id}",
            idempotency_key=f"buy:{idem}",
        )
        session.add(InventoryItem(user_id=user.id, item_id=item.id, source="purchase"))
        await session.commit()
        return {"ok": True, "itemId": item.id, "balanceUsd": user.wallet_usd}
    except EconomyError as exc:
        await session.rollback()
        raise HTTPException(status_code=400, detail=exc.message) from exc


@router.get("/loadout")
async def get_loadout(user: CurrentUser, session: SessionDep) -> dict:
    row = await session.get(Loadout, user.id)
    if row is None:
        row = Loadout(user_id=user.id)
        session.add(row)
        await session.commit()
    return {
        "frame": row.frame,
        "badge": row.badge,
        "theme": row.theme,
        "name_style": row.name_style,
        "avatar_effect": row.avatar_effect,
    }


@router.post("/loadout")
async def set_loadout(body: dict, user: CurrentUser, session: SessionDep) -> dict:
    slot = str(body.get("slot", ""))
    item_id = body.get("itemId")
    allowed = {"frame", "badge", "theme", "name_style", "avatar_effect"}
    if slot not in allowed:
        raise HTTPException(status_code=400, detail="Invalid slot")
    row = await session.get(Loadout, user.id)
    if row is None:
        row = Loadout(user_id=user.id)
        session.add(row)
    if item_id:
        owned = await session.scalar(
            select(InventoryItem).where(
                InventoryItem.user_id == user.id, InventoryItem.item_id == str(item_id)
            )
        )
        if owned is None:
            raise HTTPException(status_code=400, detail="Item not owned")
        setattr(row, slot, str(item_id))
    else:
        setattr(row, slot, None)
    await session.commit()
    return {
        "frame": row.frame,
        "badge": row.badge,
        "theme": row.theme,
        "name_style": row.name_style,
        "avatar_effect": row.avatar_effect,
    }
