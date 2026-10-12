from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import StoreItem

DEFAULT_ITEMS = [
    ("frame_blue", "frame", "Blue Frame", "Electric blue profile frame", "rare", 500, "frame-blue"),
    ("frame_gold", "frame", "Gold Frame", "Premium gold frame", "legendary", 5000, "frame-gold"),
    ("badge_star", "badge", "Star Badge", "Bright star badge", "common", 200, "badge-star"),
    ("theme_night", "theme", "Night Theme", "Deep night theme", "epic", 1500, "theme-night"),
    ("name_neon", "name_style", "Neon Name", "Neon name style", "rare", 800, "name-neon"),
    ("fx_pulse", "avatar_effect", "Pulse FX", "Soft pulse avatar effect", "epic", 2000, "fx-pulse"),
]


async def seed_store(session: AsyncSession) -> None:
    for item_id, category, name, desc, rarity, price, preview in DEFAULT_ITEMS:
        exists = await session.get(StoreItem, item_id)
        if exists is None:
            session.add(
                StoreItem(
                    id=item_id,
                    category=category,
                    name=name,
                    description=desc,
                    rarity=rarity,
                    price_usd=price,
                    purchasable=True,
                    preview=preview,
                    is_active=True,
                )
            )
    await session.commit()
