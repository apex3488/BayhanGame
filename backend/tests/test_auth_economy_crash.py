from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient


async def register(client: AsyncClient, login: str = "player1", password: str = "password123") -> str:
    res = await client.post(
        "/api/auth/register",
        json={"login": login, "password": password, "display_name": login},
    )
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


@pytest.mark.asyncio
async def test_register_starting_balance_once(client: AsyncClient) -> None:
    token = await register(client, "alice")
    me = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["wallet_usd"] == 50_000

    dup = await client.post(
        "/api/auth/register",
        json={"login": "alice", "password": "password123"},
    )
    assert dup.status_code == 400


@pytest.mark.asyncio
async def test_login_generic_error(client: AsyncClient) -> None:
    await register(client, "bob")
    bad = await client.post("/api/auth/login", json={"login": "bob", "password": "wrongpass1"})
    assert bad.status_code == 401
    assert bad.json()["detail"] == "Invalid login or password"


@pytest.mark.asyncio
async def test_transfer_and_history(client: AsyncClient) -> None:
    token = await register(client, "carol")
    headers = {"Authorization": f"Bearer {token}"}
    key = uuid.uuid4().hex
    tx = await client.post(
        "/api/economy/transfer",
        headers=headers,
        json={"amount_usd": 1000, "direction": "to_bank", "idempotency_key": key},
    )
    assert tx.status_code == 200
    me = await client.get("/api/auth/me", headers=headers)
    body = me.json()
    assert body["wallet_usd"] == 49_000
    assert body["bank_usd"] == 1000

    again = await client.post(
        "/api/economy/transfer",
        headers=headers,
        json={"amount_usd": 1000, "direction": "to_bank", "idempotency_key": key},
    )
    assert again.status_code == 200
    me2 = await client.get("/api/auth/me", headers=headers)
    assert me2.json()["wallet_usd"] == 49_000


@pytest.mark.asyncio
async def test_crash_bet_cashout_and_double_cashout(client: AsyncClient) -> None:
    token = await register(client, "dave")
    headers = {"Authorization": f"Bearer {token}"}
    bet_key = uuid.uuid4().hex
    bet = await client.post(
        "/api/crash/bet",
        headers=headers,
        json={"stake_usd": 100, "idempotency_key": bet_key},
    )
    assert bet.status_code == 200, bet.text
    bet_id = bet.json()["id"]
    assert bet.json()["status"] == "active"

    cash_key = uuid.uuid4().hex
    win = await client.post(
        "/api/crash/cashout",
        headers=headers,
        json={"bet_id": bet_id, "idempotency_key": cash_key},
    )
    assert win.status_code == 200, win.text
    assert win.json()["status"] in {"won", "lost"}

    again = await client.post(
        "/api/crash/cashout",
        headers=headers,
        json={"bet_id": bet_id, "idempotency_key": cash_key},
    )
    assert again.status_code == 200
    assert again.json()["payout_usd"] == win.json()["payout_usd"]


@pytest.mark.asyncio
async def test_promo_and_admin_isolation(client: AsyncClient) -> None:
    token = await register(client, "erin")
    headers = {"Authorization": f"Bearer {token}"}

    denied = await client.get("/api/admin/dashboard", headers=headers)
    assert denied.status_code == 403

    boot = await client.post(
        "/api/admin/bootstrap",
        json={
            "bootstrap_secret": "bootstrap-test-secret",
            "login": "rootadmin",
            "password": "password123",
        },
    )
    assert boot.status_code == 200
    admin_token = boot.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    promo = await client.post(
        "/api/admin/promos",
        headers=admin_headers,
        json={
            "code": "WELCOME100",
            "description": "test",
            "reward_type": "usd",
            "reward_usd": 100,
            "max_per_user": 1,
        },
    )
    assert promo.status_code == 200, promo.text

    key = uuid.uuid4().hex
    redeem = await client.post(
        "/api/promos/redeem",
        headers=headers,
        json={"code": "WELCOME100", "idempotency_key": key},
    )
    assert redeem.status_code == 200, redeem.text

    again = await client.post(
        "/api/promos/redeem",
        headers=headers,
        json={"code": "WELCOME100", "idempotency_key": uuid.uuid4().hex},
    )
    assert again.status_code == 400


@pytest.mark.asyncio
async def test_health_not_bot_db(client: AsyncClient) -> None:
    res = await client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["database"]["is_bot_db"] is False
