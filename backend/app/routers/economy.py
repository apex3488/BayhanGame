from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.deps import CurrentUser, SessionDep
from app.models import Transaction
from app.schemas import TransactionOut, TransferRequest
from app.services.economy import EconomyError, transfer

router = APIRouter(prefix="/economy", tags=["economy"])


@router.get("/transactions", response_model=list[TransactionOut])
async def list_transactions(user: CurrentUser, session: SessionDep, limit: int = 50) -> list[Transaction]:
    limit = max(1, min(limit, 100))
    rows = (
        await session.scalars(
            select(Transaction)
            .where(Transaction.user_id == user.id)
            .order_by(Transaction.id.desc())
            .limit(limit)
        )
    ).all()
    return list(rows)


@router.post("/transfer", response_model=TransactionOut)
async def do_transfer(body: TransferRequest, user: CurrentUser, session: SessionDep) -> Transaction:
    try:
        tx = await transfer(
            session,
            user=user,
            amount_usd=body.amount_usd,
            direction=body.direction,
            idempotency_key=body.idempotency_key,
        )
        await session.commit()
        return tx
    except EconomyError as exc:
        await session.rollback()
        code = 400 if exc.code != "not_found" else 404
        raise HTTPException(status_code=code, detail=exc.message) from exc
