from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import CrashBet, CrashRound, User
from app.security import crash_multiplier_from_seeds, sha256_hex
from app.services.economy import EconomyError, apply_wallet_delta


def bp_to_mult(bp: int) -> float:
    return round(bp / 100.0, 2)


def mult_to_bp(mult: float) -> int:
    return int(round(mult * 100))


async def get_or_create_open_round(session: AsyncSession, client_seed: str | None = None) -> CrashRound:
    open_round = await session.scalar(
        select(CrashRound).where(CrashRound.status == "open").order_by(CrashRound.id.desc())
    )
    if open_round is not None:
        return open_round

    server_seed = secrets.token_hex(32)
    cseed = (client_seed or secrets.token_hex(8))[:64]
    nonce = 1
    crash_bp = crash_multiplier_from_seeds(server_seed, cseed, nonce)
    round_row = CrashRound(
        public_id=str(uuid.uuid4()),
        server_seed_hash=sha256_hex(server_seed),
        server_seed=server_seed,  # kept server-side until settled; not returned while open/running
        client_seed=cseed,
        nonce=nonce,
        crash_multiplier_bp=crash_bp,
        status="open",
    )
    session.add(round_row)
    await session.flush()
    return round_row


async def place_bet(
    session: AsyncSession,
    *,
    user: User,
    stake_usd: int,
    client_seed: str | None,
    idempotency_key: str,
) -> tuple[CrashRound, CrashBet]:
    settings = get_settings()
    # No hard max — stake is capped only by wallet balance.
    if stake_usd < settings.crash_min_bet:
        raise EconomyError("invalid_bet", "Stake outside allowed limits")

    existing = await session.scalar(
        select(CrashBet).where(CrashBet.idempotency_key == idempotency_key)
    )
    if existing is not None:
        round_row = await session.get(CrashRound, existing.round_id)
        assert round_row is not None
        return round_row, existing

    active = await session.scalar(
        select(CrashBet).where(CrashBet.user_id == user.id, CrashBet.status == "active")
    )
    if active is not None:
        raise EconomyError("active_bet", "You already have an active Crash bet")

    round_row = await get_or_create_open_round(session, client_seed)
    await apply_wallet_delta(
        session,
        user=user,
        amount_usd=-stake_usd,
        tx_type="CRASH_BET",
        reason=f"Crash stake round {round_row.public_id}",
        idempotency_key=f"crash-bet:{idempotency_key}",
    )

    if round_row.status == "open":
        round_row.status = "running"
        round_row.started_at = datetime.now(timezone.utc)

    bet = CrashBet(
        round_id=round_row.id,
        user_id=user.id,
        stake_usd=stake_usd,
        status="active",
        idempotency_key=idempotency_key,
    )
    session.add(bet)
    await session.flush()
    return round_row, bet


async def cashout(
    session: AsyncSession,
    *,
    user: User,
    bet_id: int,
    idempotency_key: str,
) -> CrashBet:
    # Idempotent cashout via economy key
    bet = await session.scalar(
        select(CrashBet).where(CrashBet.id == bet_id, CrashBet.user_id == user.id).with_for_update()
    )
    if bet is None:
        raise EconomyError("not_found", "Bet not found")
    if bet.status != "active":
        return bet

    round_row = await session.scalar(
        select(CrashRound).where(CrashRound.id == bet.round_id).with_for_update()
    )
    if round_row is None:
        raise EconomyError("not_found", "Round not found")

    # Simulate elapsed growth: 1.00x + 0.15x per second since start, capped by crash point.
    # Cashout is only valid if current visual multiplier has not reached crash yet.
    now = datetime.now(timezone.utc)
    if round_row.started_at is None:
        raise EconomyError("not_started", "Round not started")

    started = round_row.started_at
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    elapsed = max(0.0, (now - started).total_seconds())
    current_bp = min(100 + int(elapsed * 15), round_row.crash_multiplier_bp)

    if current_bp >= round_row.crash_multiplier_bp:
        # Race: round already at/over crash — lose
        bet.status = "lost"
        bet.settled_at = now
        if round_row.status == "running":
            round_row.status = "crashed"
            round_row.crashed_at = now
        await session.flush()
        return bet

    payout = (bet.stake_usd * current_bp) // 100
    bet.cashout_multiplier_bp = current_bp
    bet.payout_usd = payout
    bet.status = "won"
    bet.settled_at = now

    await apply_wallet_delta(
        session,
        user=user,
        amount_usd=payout,
        tx_type="CRASH_WIN",
        reason=f"Crash cashout @{bp_to_mult(current_bp):.2f}x",
        idempotency_key=f"crash-cashout:{idempotency_key}",
    )
    await session.flush()
    return bet


async def settle_round_if_due(session: AsyncSession, round_row: CrashRound) -> CrashRound:
    if round_row.status != "running" or round_row.started_at is None:
        return round_row
    now = datetime.now(timezone.utc)
    started = round_row.started_at
    if started.tzinfo is None:
        started = started.replace(tzinfo=timezone.utc)
    elapsed = max(0.0, (now - started).total_seconds())
    current_bp = 100 + int(elapsed * 15)
    if current_bp < round_row.crash_multiplier_bp:
        return round_row

    round_row.status = "crashed"
    round_row.crashed_at = now
    active_bets = (
        await session.scalars(
            select(CrashBet).where(CrashBet.round_id == round_row.id, CrashBet.status == "active")
        )
    ).all()
    for bet in active_bets:
        bet.status = "lost"
        bet.settled_at = now
    # Reveal seed after crash
    # server_seed already stored
    await session.flush()
    return round_row
