from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Transaction, User


class EconomyError(Exception):
    def __init__(self, code: str, message: str) -> None:
        self.code = code
        self.message = message
        super().__init__(message)


async def apply_wallet_delta(
    session: AsyncSession,
    *,
    user: User,
    amount_usd: int,
    tx_type: str,
    reason: str,
    idempotency_key: str | None = None,
    meta_json: str | None = None,
) -> Transaction:
    if idempotency_key:
        existing = await session.scalar(
            select(Transaction).where(Transaction.idempotency_key == idempotency_key)
        )
        if existing is not None:
            return existing

    locked = await session.scalar(select(User).where(User.id == user.id).with_for_update())
    if locked is None:
        raise EconomyError("not_found", "User not found")

    new_wallet = locked.wallet_usd + amount_usd
    if new_wallet < 0:
        raise EconomyError("insufficient_funds", "Insufficient wallet balance")

    locked.wallet_usd = new_wallet
    tx = Transaction(
        user_id=locked.id,
        type=tx_type,
        amount_usd=amount_usd,
        wallet_after=locked.wallet_usd,
        bank_after=locked.bank_usd,
        reason=reason,
        status="completed",
        idempotency_key=idempotency_key,
        meta_json=meta_json,
    )
    session.add(tx)
    await session.flush()
    return tx


async def transfer(
    session: AsyncSession,
    *,
    user: User,
    amount_usd: int,
    direction: str,
    idempotency_key: str,
) -> Transaction:
    existing = await session.scalar(
        select(Transaction).where(Transaction.idempotency_key == idempotency_key)
    )
    if existing is not None:
        return existing

    locked = await session.scalar(select(User).where(User.id == user.id).with_for_update())
    if locked is None:
        raise EconomyError("not_found", "User not found")

    if direction == "to_bank":
        if locked.wallet_usd < amount_usd:
            raise EconomyError("insufficient_funds", "Insufficient wallet balance")
        locked.wallet_usd -= amount_usd
        locked.bank_usd += amount_usd
        amount_signed = -amount_usd
        tx_type = "BANK_DEPOSIT"
        reason = "Transfer wallet → bank"
    elif direction == "to_wallet":
        if locked.bank_usd < amount_usd:
            raise EconomyError("insufficient_funds", "Insufficient bank balance")
        locked.bank_usd -= amount_usd
        locked.wallet_usd += amount_usd
        amount_signed = amount_usd
        tx_type = "BANK_WITHDRAW"
        reason = "Transfer bank → wallet"
    else:
        raise EconomyError("invalid", "Invalid transfer direction")

    tx = Transaction(
        user_id=locked.id,
        type=tx_type,
        amount_usd=amount_signed,
        wallet_after=locked.wallet_usd,
        bank_after=locked.bank_usd,
        reason=reason,
        status="completed",
        idempotency_key=idempotency_key,
    )
    session.add(tx)
    await session.flush()
    return tx
