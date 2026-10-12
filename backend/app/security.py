from __future__ import annotations

import hashlib
import hmac
import secrets
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

from app.config import get_settings

_ph = PasswordHasher(time_cost=3, memory_cost=65536, parallelism=2)


def hash_password(password: str) -> str:
    return _ph.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return _ph.verify(password_hash, password)
    except VerifyMismatchError:
        return False


def create_access_token(*, user_id: int, is_admin: bool) -> str:
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "adm": bool(is_admin),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=settings.jwt_ttl_seconds)).timestamp()),
        "jti": secrets.token_hex(8),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


@dataclass(frozen=True)
class TokenPayload:
    user_id: int
    is_admin: bool


def decode_access_token(token: str) -> TokenPayload | None:
    settings = get_settings()
    try:
        data = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
        return TokenPayload(user_id=int(data["sub"]), is_admin=bool(data.get("adm")))
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        return None


class RateLimiter:
    """Simple in-memory sliding window. Fine for a single-process free deploy."""

    def __init__(self) -> None:
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str, *, limit: int, window_seconds: int = 60) -> bool:
        now = time.monotonic()
        bucket = self._hits[key]
        while bucket and now - bucket[0] > window_seconds:
            bucket.popleft()
        if len(bucket) >= limit:
            return False
        bucket.append(now)
        return True


auth_limiter = RateLimiter()


def validate_login(login: str) -> str | None:
    value = login.strip()
    if len(value) < 3 or len(value) > 32:
        return None
    if not value.replace("_", "").isalnum():
        return None
    if not value[0].isalpha():
        return None
    return value.lower()


def validate_password(password: str) -> bool:
    return 8 <= len(password) <= 128


def sha256_hex(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def crash_multiplier_from_seeds(server_seed: str, client_seed: str, nonce: int) -> int:
    """Return crash multiplier in basis points (100 = 1.00x). Min 101 (1.01x)."""
    msg = f"{server_seed}:{client_seed}:{nonce}".encode()
    digest = hmac.new(server_seed.encode(), msg, hashlib.sha256).hexdigest()
    # Use first 52 bits like many crash implementations
    h = int(digest[:13], 16)
    if h % 33 == 0:
        return 100  # instant crash 1.00x (house edge ~3%)
    raw = (2**52) / ((h % (2**52)) + 1) * 100
    # Cap at 1_000_000x (100_000_000 bp) for storage safety
    bp = max(101, min(int(raw), 100_000_000))
    return bp


def json_dumps(data: Any) -> str:
    import json

    return json.dumps(data, separators=(",", ":"), ensure_ascii=False)
