from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.deps import CurrentUser, SessionDep
from app.schemas import PromoRedeemRequest
from app.services.economy import EconomyError
from app.services.promos import redeem_promo

router = APIRouter(prefix="/promos", tags=["promos"])


@router.post("/redeem")
async def redeem(body: PromoRedeemRequest, user: CurrentUser, session: SessionDep) -> dict:
    try:
        result = await redeem_promo(
            session,
            user=user,
            code=body.code,
            idempotency_key=body.idempotency_key,
        )
        await session.commit()
        return result
    except EconomyError as exc:
        await session.rollback()
        raise HTTPException(status_code=400, detail=exc.message) from exc
