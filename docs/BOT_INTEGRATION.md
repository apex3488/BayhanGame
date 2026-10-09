# Интеграция Mini App с Python-ботом BAYHAN GAME

Mini App — статический сайт на GitHub Pages. Он **не имеет доступа** к базе бота и не хранит секретов.
Реальные данные игрока появляются только когда рядом с ботом запущен небольшой HTTP-сервер
(далее — **Mini App API**), который:

1. проверяет подпись Telegram `initData` токеном бота;
2. читает и изменяет данные **через существующие сервисы и репозитории бота**;
3. отдаёт ответы в формате, описанном ниже.

Сам бот (aiogram 3 + SQLAlchemy async) переписывать не нужно: его команды, база и миграции остаются как есть.
API — это отдельный процесс, использующий те же модели и ту же базу.

---

## 1. Как фронтенд выбирает источник данных

| `NEXT_PUBLIC_DATA_SOURCE` | Что происходит |
| --- | --- |
| `demo` (по умолчанию) | Демо-данные в памяти браузера. Ничего не сохраняется. |
| `api` | Запросы к `NEXT_PUBLIC_GAME_API_URL` (Mini App API рядом с ботом). |
| `supabase` | Каталог и рейтинг — из Supabase, всё остальное — через Edge Function (см. `SUPABASE_SETUP.md`). |

Даже при `api`/`supabase` приложение **не** подставляет демо-баланс, если открыто не в Telegram
(нет подписанного `initData`) или конфигурация неполная: показывается баннер «Нет подключения».
Причина видна в «Настройки → Диагностика».

### Текущий FastAPI backend (реализовано)

Источник `api` ходит в Python `miniapp_api` (тот же SQLite, что у бота):

| Метод | Путь | Ответ |
| --- | --- | --- |
| GET | `/health` | `{ "status": "ok", "service": "bayhan-miniapp-api" }` |
| GET | `/api/me` | профиль игрока (snake_case, балансы — строки Decimal) |

Адаптер: `lib/api/bayhan-api-game-api.ts`. Остальные операции GameApi пока возвращают
`not_configured` (покупки/награды не вызываются, пока нет безопасных write-эндпоинтов).

`GET /api/me` отвечает **без** обёртки `{ ok, data }` — это обычный FastAPI JSON.
HTTP: `401` → `unauthorized`, `403` → `forbidden`, `404` → `not_found`.

## 2. Аутентификация

Каждый запрос содержит заголовок:

```
X-Telegram-Init-Data: <window.Telegram.WebApp.initData>
```

POST-запросы дополнительно содержат `Idempotency-Key: <uuid>` — сервер должен
не выполнять операцию повторно с тем же ключом (защита от двойного списания при повторе запроса).

Сервер **обязан** проверить подпись по [официальному алгоритму](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app):

```python
import hashlib, hmac, json, time
from urllib.parse import parse_qsl

def verify_init_data(init_data: str, bot_token: str, max_age: int = 24 * 3600) -> dict:
    pairs = dict(parse_qsl(init_data, keep_blank_values=True))
    received_hash = pairs.pop("hash", None)
    if not received_hash:
        raise PermissionError("no hash")
    check_string = "\n".join(f"{k}={v}" for k, v in sorted(pairs.items()))
    secret = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
    expected = hmac.new(secret, check_string.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, received_hash):
        raise PermissionError("bad signature")
    if time.time() - int(pairs.get("auth_date", "0")) > max_age:
        raise PermissionError("expired")
    return json.loads(pairs["user"])  # {"id": ..., "first_name": ..., ...}
```

`user.id` из **проверенной** строки — единственный источник идентичности.
`initDataUnsafe` на клиенте используется только для отображения имени/аватара.

## 3. Формат ответов

```json
{ "ok": true, "data": { ... } }
{ "ok": false, "error": { "code": "insufficient_funds", "message": "optional" } }
```

Коды ошибок, которые понимает фронтенд (`lib/api/result.ts`):
`unauthorized`, `not_found`, `insufficient_funds`, `already_owned`, `not_owned`, `sold_out`,
`not_purchasable`, `cooldown`, `not_completed`, `already_claimed`, `unknown`.
Любой другой код показывается как `unknown`; HTTP 401 всегда трактуется как `unauthorized`.

Деньги передаются числами в USD (бот хранит `Decimal` — конвертируйте в `float` при сериализации),
даты — ISO 8601 в UTC. Полные TypeScript-типы — в `types/game.ts`; фронтенд валидирует
каждый ответ (`lib/api/guards.ts`) и показывает ошибку вместо «битых» данных.

## 4. Эндпоинты

Базовый URL — `NEXT_PUBLIC_GAME_API_URL`, например `https://api.example.com/miniapp`.

| Метод | Путь | Ответ `data` | Источник в боте |
| --- | --- | --- | --- |
| GET | `/me?locale=ru` | `Player` | `users`, `user_cosmetic_loadouts`, `user_achievements` |
| GET | `/me/activity?locale=ru&limit=20` | `Transaction[]` | `transactions` |
| POST | `/me/daily-reward` | `DailyRewardResult` | логика ежедневного бонуса бота (`daily_streak`, `last_daily_at`, `DAILY_BASE`) |
| GET | `/store/items?locale=ru` | `StoreItem[]` | `cosmetic_items` (`enabled = true`) |
| GET | `/me/inventory` | `InventoryEntry[]` | `user_cosmetics` |
| POST | `/store/purchase` `{ "itemId" }` | `PurchaseResult` | сервис покупки косметики бота (`cosmetic_purchases`, транзакция `COSMETIC_BUY`) |
| POST | `/me/loadout` `{ "slot", "itemId" \| null }` | `Loadout` | `user_cosmetic_loadouts` |
| GET | `/leaderboard?category=capital&limit=10` | `Leaderboard` | `users` (`usd_balance + bank_usd`, `level`, `games_won`) |
| GET | `/me/tasks?locale=ru` | `GameTask[]` | `quests`, `user_quests`, `achievements`, `user_achievements` |
| POST | `/me/tasks/{id}/claim` | `ClaimTaskResult` | сервис выдачи наград за квесты бота |

Все изменения баланса выполняются **в одной транзакции БД** с записью в `transactions`
(как это уже делает бот) и с проверками на сервере: цена, наличие денег, владение предметом,
лимит тиража, кулдаун, статус задания. Сумма награды берётся из базы, а не из запроса.

## 5. Соответствие моделей

| Поле Mini App | Бот |
| --- | --- |
| `Player.telegramId` | `users.telegram_id` |
| `Player.nickname` | `users.nickname` → `first_name` → `username` |
| `Player.usdBalance` / `btcBalance` / `bankUsd` | `users.usd_balance` / `btc_balance` / `bank_usd` |
| `Player.level`, `xp` | `users.level`, `users.xp` (`xpForNextLevel` — по формуле уровня бота) |
| `Player.stats.*` | `games_played`, `games_won`, `games_lost`, `total_wagered`, `total_won` |
| `Player.dailyStreak`, `nextDailyAt` | `daily_streak`, `last_daily_at` + интервал бонуса |
| `StoreItem.id` | `cosmetic_items.code` (например `frame_neon`) |
| `StoreItem.name` / `description` | перевод `name_key` / `description_key` на `locale` |
| `StoreItem.category` | `frame`, `badge`, `theme`, `name_style`; `effect` → `avatar_effect` |
| `StoreItem.rarity` | как есть; `mythic` → `legendary` |
| `StoreItem.preview` | ключ визуального пресета (см. ниже) |
| `InventoryEntry.source` | `PURCHASE` → `purchase`; `ACHIEVEMENT`, `COLLECTION`, `REWARD`, `MYSTERY_BOX` → `reward`; `EVENT` → `event`; `ADMIN` → `admin` |
| `Loadout` | `frame_id`, `badge_id`, `theme_id`, `name_style_id`, `effect_id` → коды предметов |
| `Transaction.type` | `transactions.type` (неизвестные типы → `OTHER`) |

Категории `name_color`, `title` и `box` в Mini App пока не отображаются — не отдавайте их в `/store/items`.

### Ключи `preview`

Фронтенд применяет оформление только по белому списку ключей (`app/globals.css`, `components/ui/avatar.tsx`,
`components/store/item-visuals.tsx`). Примеры: `frame-neon`, `frame-diamond`, `frame-galaxy`, `badge-crown`,
`theme-grid`, `theme-aurora`, `ns-brackets`, `ns-glow`, `fx-pulse`, `fx-orbit`. Полный список с привязкой
к кодам бота — в `lib/demo/catalog.ts`. Неизвестный ключ просто не даёт эффекта.

## 6. Рекомендуемая реализация: FastAPI рядом с ботом

```
apex game/
  bot/            ← существующий бот, без изменений
  miniapp_api/    ← новый пакет
    main.py       ← FastAPI-приложение, CORS, роуты
    auth.py       ← verify_init_data + dependency current_user
    schemas.py    ← Pydantic-модели = types/game.ts
```

- Используйте тот же `DATABASE_URL` и `async_session` из `bot/database/database.py`.
- Для покупок, бонуса и квестов вызывайте существующие сервисы бота, чтобы правила игры не дублировались.
- CORS: разрешите только origin GitHub Pages (`https://<user>.github.io`), методы `GET, POST`,
  заголовки `Content-Type, X-Telegram-Init-Data, Idempotency-Key`. Cookies не используются.
- Нужен HTTPS (Telegram и GitHub Pages не разрешат смешанный контент).
- При SQLite бот и API должны работать на одной машине; для отдельных серверов перейдите на PostgreSQL.
- Добавьте rate limit на POST-эндпоинты.

## 7. Подключение Mini App к боту

1. В [@BotFather](https://t.me/BotFather): `/mybots` → бот → **Bot Settings → Menu Button** (или `/newapp`)
   и укажите URL GitHub Pages.
2. В репозитории Mini App задайте переменные (см. README): `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`,
   `NEXT_PUBLIC_DATA_SOURCE=api`, `NEXT_PUBLIC_GAME_API_URL`.
3. Опционально — кнопка в боте (aiogram):

```python
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

kb = InlineKeyboardMarkup(inline_keyboard=[[
    InlineKeyboardButton(text="BAYHAN GAME", web_app=WebAppInfo(url=settings.MINIAPP_URL)),
]])
```

## 8. Разделы города (lifestyle)

В Mini App добавлен хаб `/city` со всеми разделами бота: работы, банк, магазин ресурсов,
VIP, донат Stars, промокоды, недвижимость, авто, бизнес, кейсы, добыча, рефералы,
корпорации, брак, события, помощь. Каталоги совпадают с сидами бота
(`lifestyle_seed`, `jobs_cases_seed`, `settings_service`, `corporation_seed`).

В DEMO покупки/сборы работают в памяти браузера. В LIVE кнопки действий ведут в бота,
пока API не отдаёт эти операции. Когда будете расширять Mini App API, добавьте
эндпоинты по тому же контракту `{ok,data}` (например `/jobs/work`, `/realty/buy`,
`/business/collect`, `/cases/open`, `/resources/mine`) с проверкой `initData` и
идемпотентностью — суммы и награды только с сервера.

## 9. Публичный доступ к API (обязательно для Telegram)

Единый источник данных — SQLite бота (`apex_game.db`). FastAPI `miniapp_api` читает ту же БД.
GitHub Pages отдаёт только статику; браузер Telegram ходит на `NEXT_PUBLIC_GAME_API_URL`.

Минимальная рабочая схема на вашей машине:

1. Запущен API: `uvicorn miniapp_api.main:app --host 127.0.0.1 --port 8000`
2. Запущен HTTPS-туннель на этот порт (Cloudflare Quick Tunnel или постоянный хост).
3. `GET https://<tunnel>/health` → `200` и `{"status":"ok",...}`.
4. В GitHub → **Settings → Secrets and variables → Actions → Variables**:
   - `NEXT_PUBLIC_DATA_SOURCE` = `api`
   - `NEXT_PUBLIC_GAME_API_URL` = `https://<tunnel>` (без `/` в конце)
   - `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` = имя бота без `@`
5. Пересобрать Pages (workflow **Deploy to GitHub Pages**), потому что URL **вшивается в JS при build**.
6. В BotFather Mini App URL = `https://apex3488.github.io/BayhanGame/`.
7. Игрок хотя бы раз написал боту `/start` (иначе `/api/me` → `404`).

Quick Tunnel (`*.trycloudflare.com`) **одноразовый**: после остановки `cloudflared` старый URL даёт 530/DNS error.
Тогда нужно новый туннель → обновить Variable → перезапустить workflow. Для продакшена лучше постоянный HTTPS-хост API.

`401` на `/api/me` без заголовка или с битой подписью — ожидаемое поведение (проверка HMAC включена).
В обычном браузере без Telegram `initData` баланс не загрузится — это не баг.

## 10. Чеклист

- [ ] `BOT_TOKEN` есть только на сервере API, не во фронтенде и не в репозитории.
- [ ] Каждая операция проверяет подпись и срок `initData`.
- [ ] Все изменения баланса — серверные, атомарные, с записью в `transactions`.
- [ ] `Idempotency-Key` учитывается для POST.
- [ ] CORS ограничен доменом GitHub Pages.
- [ ] Ответы соответствуют `types/game.ts` (проверьте в «Настройки → Диагностика», режим LIVE).
- [ ] Практические режимы в Mini App остаются без реальных ставок, пока игры не перенесены на сервер.
- [ ] Публичный `NEXT_PUBLIC_GAME_API_URL` отвечает `/health` = 200 из интернета.
