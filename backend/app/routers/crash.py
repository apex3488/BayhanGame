from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.deps import CurrentUser, SessionDep
from app.models import CrashBet, CrashRound
from app.schemas import CrashBetOut, CrashBetRequest, CrashCashoutRequest, CrashRoundOut
from app.services.crash import (
    bp_to_mult,
    cashout,
    get_or_create_open_round,
    place_bet,
    settle_round_if_due,
)
from app.services.economy import EconomyError

router = APIRouter(prefix="/crash", tags=["crash"])


def _round_out(round_row: CrashRound, *, reveal: bool) -> CrashRoundOut:
    return CrashRoundOut(
        public_id=round_row.public_id,
        server_seed_hash=round_row.server_seed_hash,
        server_seed=round_row.server_seed if reveal else None,
        client_seed=round_row.client_seed,
        nonce=round_row.nonce,
        crash_multiplier=bp_to_mult(round_row.crash_multiplier_bp) if reveal else 0.0,
        status=round_row.status,
        started_at=round_row.started_at,
        crashed_at=round_row.crashed_at,
    )


def _bet_out(bet: CrashBet, round_row: CrashRound) -> CrashBetOut:
    reveal = round_row.status in {"crashed", "settled"} or bet.status in {"won", "lost"}
    return CrashBetOut(
        id=bet.id,
        round_public_id=round_row.public_id,
        stake_usd=bet.stake_usd,
        cashout_multiplier=bp_to_mult(bet.cashout_multiplier_bp) if bet.cashout_multiplier_bp else None,
        payout_usd=bet.payout_usd,
        status=bet.status,
        round_status=round_row.status,
        server_seed_hash=round_row.server_seed_hash,
        crash_multiplier=bp_to_mult(round_row.crash_multiplier_bp) if reveal else None,
    )


@router.get("/state")
async def crash_state(user: CurrentUser, session: SessionDep) -> dict:
    round_row = await get_or_create_open_round(session)
    round_row = await settle_round_if_due(session, round_row)
    active = await session.scalar(
        select(CrashBet).where(CrashBet.user_id == user.id, CrashBet.status == "active")
    )
    history = (
        await session.scalars(
            select(CrashRound)
            .where(CrashRound.status.in_(("crashed", "settled")))
            .order_by(CrashRound.id.desc())
            .limit(20)
        )
    ).all()
    await session.commit()
    return {
        "round": _round_out(round_row, reveal=round_row.status in {"crashed", "settled"}),
        "active_bet": _bet_out(active, round_row) if active else None,
        "history": [
            {
                "public_id": r.public_id,
                "crash_multiplier": bp_to_mult(r.crash_multiplier_bp),
                "server_seed_hash": r.server_seed_hash,
                "server_seed": r.server_seed,
            }
            for r in history
        ],
    }


@router.post("/bet", response_model=CrashBetOut)
async def crash_bet(body: CrashBetRequest, user: CurrentUser, session: SessionDep) -> CrashBetOut:
    try:
        round_row, bet = await place_bet(
            session,
            user=user,
            stake_usd=body.stake_usd,
            client_seed=body.client_seed,
            idempotency_key=body.idempotency_key,
        )
        await session.commit()
        return _bet_out(bet, round_row)
    except EconomyError as exc:
        await session.rollback()
        raise HTTPException(status_code=400, detail=exc.message) from exc


@router.post("/cashout", response_model=CrashBetOut)
async def crash_cashout(body: CrashCashoutRequest, user: CurrentUser, session: SessionDep) -> CrashBetOut:
    try:
        bet = await cashout(
            session,
            user=user,
            bet_id=body.bet_id,
            idempotency_key=body.idempotency_key,
        )
        round_row = await session.get(CrashRound, bet.round_id)
        assert round_row is not None
        await session.commit()
        return _bet_out(bet, round_row)
    except EconomyError as exc:
        await session.rollback()
        raise HTTPException(status_code=400, detail=exc.message) from exc
