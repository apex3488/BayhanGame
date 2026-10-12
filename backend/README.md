# BAYHAN GAME — Independent Mini App API

This FastAPI service is **fully separate** from the Telegram bot in `Desktop/apex game`.

- Database default: `backend/data/bayhan_miniapp.db`
- Refusal guard: will not start if `MINIAPP_DATABASE_URL` points at `apex_game.db`
- Auth: login/password + Argon2id + JWT Bearer
- Economy: integer USD wallet/bank, starting **50000** once
- Crash: server-seeded rounds, cashout race handling
- Promos + Admin bootstrap

## Run locally

```bat
cd /d "C:\Users\Абдула\Desktop\game app\backend"
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --host 127.0.0.1 --port 8010 --reload
```

Health: `http://127.0.0.1:8010/health`

## First admin

1. Set `MINIAPP_ADMIN_BOOTSTRAP_SECRET` in `backend/.env`
2. `POST /api/admin/bootstrap` with `{ "bootstrap_secret", "login", "password" }`
3. Remove the bootstrap secret from env

## Tests

```bat
.venv\Scripts\activate
set PYTHONPATH=%CD%
pytest -q
```

## Important

Do **not** run this API against the bot SQLite file. Do **not** import `bot.*` modules.
