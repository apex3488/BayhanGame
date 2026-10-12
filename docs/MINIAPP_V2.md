# BAYHAN GAME Mini App v2 — Independent browser game

## Isolation from Telegram bot

| System | Path | Database |
| --- | --- | --- |
| Telegram bot | `Desktop/apex game` | `apex_game.db` (**do not touch**) |
| Mini App (prod) | Supabase project `iflqtvazzfxfwybxkhxl` | Postgres `public.ma_*` + Edge Function `bayhan-api` |
| Mini App UI | `game app` (Next.js static / GitHub Pages) | none |
| Mini App (optional local) | `game app/backend` | SQLite `bayhan_miniapp.db` only for offline API work |

Telegram tables (`players`, …) are untouched. Mini App money lives in `ma_users` / `ma_transactions` / …

## Local / Pages stack

1. Production API (default in `.env.local` / `.env.production`):
   `https://iflqtvazzfxfwybxkhxl.supabase.co/functions/v1/bayhan-api`
2. Frontend:
   ```
   NEXT_PUBLIC_GAME_API_URL=https://iflqtvazzfxfwybxkhxl.supabase.co/functions/v1/bayhan-api
   NEXT_PUBLIC_SUPABASE_URL=https://iflqtvazzfxfwybxkhxl.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon>
   NEXT_PUBLIC_BASE_PATH=
   ```
3. `npm run dev` → register → $50,000 → Crash / bank / promos.
4. Optional local FastAPI on **8010** if you point `NEXT_PUBLIC_GAME_API_URL` at it.

## Free hosting notes

- GitHub Pages hosts **static frontend only**.
- Backend needs a separate free host with **persistent disk** (SQLite file must survive restarts).
- Cloudflare Quick Tunnel is temporary — not production.
- Confirm current free-tier persistence before claiming permanent storage.

## Security

- Passwords: Argon2id
- Sessions: JWT in `Authorization` header (not in NEXT_PUBLIC_*)
- Admin bootstrap secret is one-shot (fails after first admin exists)
- Client cannot set starting balance or Crash outcome
