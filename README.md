# BAYHAN GAME Mini App (v2 — independent browser game)

Профессиональный браузерный игровой клиент с **собственной** регистрацией, экономикой, Crash и админкой.

Telegram-бот в `Desktop/apex game` и его SQLite `apex_game.db` — **отдельная система**. Этот проект их не читает и не изменяет.

## Что реализовано

- Регистрация / вход по логину и паролю (JWT)
- Стартовый баланс **$50,000** один раз на аккаунт (сервер)
- Кошелёк + банк + история операций
- **Crash** — серверные раунды, ставки, cash out, защита от двойной выплаты
- Промокоды Mini App (отдельно от бота)
- Админка `/admin` + bootstrap первого админа
- Frontend: Next.js static export для GitHub Pages (`basePath` `/BayhanGame` в CI)
- **База данных: Supabase Postgres** (`public.ma_*` таблицы)
- **API production: Edge Function** `bayhan-api`  
  `https://iflqtvazzfxfwybxkhxl.supabase.co/functions/v1/bayhan-api`
- Опционально локальный FastAPI в `backend/` (SQLite) для разработки

Тренировочные Mines / Up/Down / Slots и хаб «Город» сохранены как UI; живая экономика — через Supabase API.

## Структура

| Путь | Назначение |
| --- | --- |
| `app/`, `components/`, `lib/` | Next.js frontend |
| `backend/` | Независимый FastAPI (см. `backend/README.md`) |
| `docs/MINIAPP_V2.md` | Изоляция от бота, хостинг, безопасность |
| `Desktop/bayhan-miniapp-backup-20261012/` | Резервная копия исходников (без секретов) |

## Локальный запуск

### 1) Backend (порт **8010**, чтобы не пересечься с ботом на 8000)

```bat
cd /d "C:\Users\Абдула\Desktop\game app\backend"
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --host 127.0.0.1 --port 8010 --reload
```

Проверка: http://127.0.0.1:8010/health → `is_bot_db: false`

### 2) Frontend

```bat
cd /d "C:\Users\Абдула\Desktop\game app"
copy .env.example .env.local
```

В `.env.local`:

```
NEXT_PUBLIC_GAME_API_URL=http://127.0.0.1:8010
NEXT_PUBLIC_BASE_PATH=
```

```bat
npm install
npm run dev
```

Откройте http://localhost:3000 → регистрация → баланс $50,000 → Crash / банк / промо.

### Первый администратор

1. В `backend/.env` задайте `MINIAPP_ADMIN_BOOTSTRAP_SECRET`
2. `POST /api/admin/bootstrap` с JSON `{ "bootstrap_secret", "login", "password" }`
3. Удалите bootstrap-секрет из env
4. Войдите этим логином → `/admin`

## Команды frontend

| Команда | Назначение |
| --- | --- |
| `npm run dev` | dev-сервер |
| `npm run build` | static export → `out/` |
| `npm run preview` | раздача `out/` (порт 4173) |
| `npm run typecheck` / `lint` / `test` | проверки |
| `npm run doctor` | диагностика старого Pages/tunnel пути (legacy) |

## Тесты backend

```bat
cd backend
.venv\Scripts\activate
set PYTHONPATH=%CD%
pytest -q
```

## Переменные

### Frontend (`NEXT_PUBLIC_*` попадают в бандл)

| Переменная | Назначение |
| --- | --- |
| `NEXT_PUBLIC_GAME_API_URL` | URL независимого Mini App API |
| `NEXT_PUBLIC_BASE_PATH` | локально пусто; в CI `/BayhanGame` |

Секреты (`JWT`, bootstrap, пароли) **не** кладите в `NEXT_PUBLIC_*`.

### Backend (`backend/.env`)

См. `backend/.env.example`: `MINIAPP_DATABASE_URL`, `MINIAPP_JWT_SECRET`, `MINIAPP_ADMIN_BOOTSTRAP_SECRET`, CORS, лимиты Crash.

**Запрещено** указывать путь к `apex_game.db`.

## Публикация

- **Frontend:** GitHub Pages (статический `out/`), как раньше.
- **Backend:** нужен отдельный HTTPS-хост с **постоянным диском** для SQLite. GitHub Pages backend не запускает. Cloudflare Quick Tunnel — только временно.
- Бесплатный постоянный хостинг на момент разработки **не подтверждён автоматически** — выберите PaaS с free tier + volume и проверьте сохранение файла БД после рестарта.

## Изоляция от бота

- Код бота не изменялся.
- Новая БД: `backend/data/bayhan_miniapp.db`
- API при старте отказывается работать, если URL указывает на `apex_game.db`
- Промокоды/балансы/админка Mini App не связаны с ботом

Подробнее: [`docs/MINIAPP_V2.md`](docs/MINIAPP_V2.md), [`backend/README.md`](backend/README.md)
