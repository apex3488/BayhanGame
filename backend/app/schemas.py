from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class RegisterRequest(BaseModel):
    login: str = Field(min_length=3, max_length=32)
    password: str = Field(min_length=8, max_length=128)
    display_name: Optional[str] = Field(default=None, max_length=64)


class LoginRequest(BaseModel):
    login: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    login: str
    display_name: str
    is_admin: bool
    is_banned: bool = False
    wallet_usd: int
    bank_usd: int
    level: int
    xp: int
    created_at: datetime


class TransactionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    type: str
    amount_usd: int
    wallet_after: int
    bank_after: int
    reason: str
    status: str
    created_at: datetime


class TransferRequest(BaseModel):
    amount_usd: int = Field(gt=0, le=1_000_000_000)
    direction: Literal["to_bank", "to_wallet"]
    idempotency_key: str = Field(min_length=8, max_length=64)


class PromoRedeemRequest(BaseModel):
    code: str = Field(min_length=2, max_length=64)
    idempotency_key: str = Field(min_length=8, max_length=64)


class CrashBetRequest(BaseModel):
    stake_usd: int = Field(gt=0)
    client_seed: Optional[str] = Field(default=None, max_length=64)
    idempotency_key: str = Field(min_length=8, max_length=64)


class CrashCashoutRequest(BaseModel):
    bet_id: int
    # Client may send displayed multiplier for UX; server ignores it for settlement.
    displayed_multiplier: Optional[float] = None
    idempotency_key: str = Field(min_length=8, max_length=64)


class CrashRoundOut(BaseModel):
    public_id: str
    server_seed_hash: str
    server_seed: Optional[str] = None
    client_seed: str
    nonce: int
    crash_multiplier: float
    status: str
    started_at: Optional[datetime] = None
    crashed_at: Optional[datetime] = None


class CrashBetOut(BaseModel):
    id: int
    round_public_id: str
    stake_usd: int
    cashout_multiplier: Optional[float] = None
    payout_usd: int
    status: str
    round_status: str
    server_seed_hash: str
    crash_multiplier: Optional[float] = None


class AdminBootstrapRequest(BaseModel):
    bootstrap_secret: str
    login: str
    password: str
    display_name: Optional[str] = None


class AdminAdjustBalanceRequest(BaseModel):
    user_id: int
    amount_usd: int
    reason: str = Field(min_length=3, max_length=255)
    idempotency_key: str = Field(min_length=8, max_length=64)


class AdminPromoCreate(BaseModel):
    code: str
    description: str = ""
    reward_type: Literal["usd", "item"] = "usd"
    reward_usd: Optional[int] = None
    reward_item_id: Optional[str] = None
    max_total: Optional[int] = None
    max_per_user: int = 1
    is_active: bool = True


class AdminBanRequest(BaseModel):
    reason: str = Field(min_length=2, max_length=255)


class AdminResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)


class NotificationCreate(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    body: str = Field(min_length=1, max_length=2000)


class HealthOut(BaseModel):
    status: str = "ok"
    service: str = "bayhan-miniapp-v2"
    database: dict[str, Any]
