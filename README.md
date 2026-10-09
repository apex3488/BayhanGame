# BAYHAN GAME — Telegram Mini App

Мобильное веб-приложение для Telegram-бота BAYHAN GAME: профиль, баланс, ежедневная награда,
BAYHAN STORE, рейтинг, задания, тренировочные Mines / Up/Down / Slots, а также хаб **Город**
со всеми разделами бота — работы, банк, магазин ресурсов, VIP, донат, промокоды, недвижимость,
авто, бизнес, кейсы, добыча, рефералы, корпорации, брак, события.

Приложение — полностью статический сайт (Next.js `output: "export"`), который публикуется на GitHub Pages.
У него нет собственного сервера, API-роутов и секретов. Реальные данные игрока подключаются через
отдельный backend рядом с Python-ботом или через Supabase Edge Function.

- Интерфейс: RU / UZ / EN (по умолчанию — язык Telegram, иначе русский).
- Mobile-first (320–430 px), safe-area Telegram, планшет и десктоп с боковой навигацией.
- Палитра: чёрный, синий, белый.

## Режимы данных

| Режим | Когда | Что видно |
| --- | --- | --- |
| **DEMO** | только если `NEXT_PUBLIC_DATA_SOURCE=demo` | песочница в памяти; явно помечена DEMO; для локального UI |
| **LIVE · API** | `DATA_SOURCE=api` + Telegram `initData` + URL API | данные из Mini App API рядом с ботом |
| **LIVE · Supabase** | `DATA_SOURCE=supabase` + Telegram `initData` + конфиг | каталог/рейтинг (RLS), профиль и операции — Edge Function |
| **НЕТ ПОДКЛЮЧЕНИЯ** | live выбран, но нет Telegram или конфига | **демопрофиль не подставляется**; баннер + диагностика |

Режим и блокировка видны в «Профиль → Настройки → Диагностика».

Mines, Up/Down и Slots в Mini App — **тренировочные**: отдельные фишки в памяти страницы, без влияния на баланс.
Игры на игровую валюту остаются в боте.

## Требования

- Node.js ≥ 20.9 (в CI используется 22)
- npm

## Установка и запуск

```bash
npm install
cp .env.example .env.local   # PowerShell: Copy-Item .env.example .env.local
npm run dev                  # http://localhost:3000
```

Без `.env.local` приложение собирается и работает в DEMO-режиме.

> Если `npm install` падает с `UNABLE_TO_VERIFY_LEAF_SIGNATURE` (корпоративный прокси/антивирус),
> используйте системные сертификаты: PowerShell — `$env:NODE_OPTIONS="--use-system-ca"`,
> bash — `export NODE_OPTIONS=--use-system-ca`.

### Команды

| Команда | Что делает |
| --- | --- |
| `npm run dev` | dev-сервер |
| `npm run build` | статическая сборка в `out/` |
| `npm run preview` | раздаёт `out/` так же, как GitHub Pages (учитывает `NEXT_PUBLIC_BASE_PATH`), порт 4173 |
| `npm run typecheck` | TypeScript без эмита |
| `npm run lint` | ESLint |
| `npm run verify:export` | проверка `out/`: все маршруты, `.nojekyll`, пути ассетов под base path, отсутствие секретов и серверных роутов |
| `npm run check` | всё вышеперечисленное подряд |

Проверить сборку под подпутём, как на GitHub Pages:

```powershell
$env:NEXT_PUBLIC_BASE_PATH="/my-repo"; npm run build; npm run verify:export; npm run preview
# открыть http://localhost:4173/my-repo/
```

## Переменные окружения

Все переменные `NEXT_PUBLIC_*` встраиваются в публичный JavaScript. **Не помещайте туда токен бота,
`service_role` key или другие секреты.**

| Переменная | Назначение |
| --- | --- |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | имя бота **без @** — для кнопки «Вернуться в бот». Если не задано, кнопка неактивна |
| `NEXT_PUBLIC_DATA_SOURCE` | `demo` \| `api` \| `supabase` — для живого профиля с ботом: `api` |
| `NEXT_PUBLIC_GAME_API_URL` | базовый URL FastAPI (`GET /health`, `GET /api/me`), без `/` в конце |
| `NEXT_PUBLIC_SUPABASE_URL` | URL проекта Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | только anon / publishable ключ (секретные ключи отклоняются) |
| `NEXT_PUBLIC_SUPABASE_FUNCTION_NAME` | имя Edge Function, по умолчанию `miniapp-api` |
| `NEXT_PUBLIC_BASE_PATH` | подпуть публикации. Локально пусто, в GitHub Actions подставляется автоматически |

## Публикация на GitHub Pages

Репозиторий: [apex3488/BayhanGame](https://github.com/apex3488/BayhanGame) →  
сайт: https://apex3488.github.io/BayhanGame/

> Если по ссылке виден **README**, а не приложение — в Settings → Pages выбран деплой **ветки main**
> (Jekyll показывает README, потому что в корне репозитория нет `index.html`). Нужно публиковать
> собранную папку `out/` через Actions или ветку `gh-pages`.

### Обязательная настройка Pages (один раз)

Откройте **Settings → Pages → Build and deployment** и выберите **один** вариант:

**Вариант A (рекомендуется):** Source → **GitHub Actions**

**Вариант B:** Source → **Deploy from a branch** → Branch: **`gh-pages`** / folder: `/ (root)`  
Workflow сам обновляет ветку `gh-pages` содержимым `out/`.

Не выбирайте `main` как источник Pages — иначе снова откроется README.

### После настройки

1. **Settings → Secrets and variables → Actions → Variables** — публичные `NEXT_PUBLIC_*`
   (кроме `NEXT_PUBLIC_BASE_PATH`). Не кладите туда BOT_TOKEN / service_role.
2. Пуш в `main` или Actions → **Deploy to GitHub Pages** → Run workflow.
3. Workflow: `npm ci` → typecheck → lint → build с `basePath=/BayhanGame` → verify → деплой `out/`.

Локальная проверка с тем же подпутём:

```powershell
$env:NEXT_PUBLIC_BASE_PATH="/BayhanGame"; npm run build; npm run verify:export; npm run preview
# http://localhost:4173/BayhanGame/
```

## Подключение к Telegram

1. В [@BotFather](https://t.me/BotFather): ваш бот → **Bot Settings → Menu Button** → URL из GitHub Pages
   (или создайте Mini App через `/newapp`).
2. Задайте `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` в Variables и перезапустите workflow.
3. Откройте бота в Telegram и нажмите кнопку меню.

В браузере вне Telegram приложение показывает предупреждение и работает в DEMO.

## Что нужно сделать для реальных данных

Фронтенд готов к работе с сервером, но сам сервер — отдельная часть, которая на GitHub Pages работать не может.
Варианты:

- **Mini App API рядом с Python-ботом** (рекомендуется — база остаётся у бота): см. [`docs/BOT_INTEGRATION.md`](docs/BOT_INTEGRATION.md).
  Нужно реализовать 10 REST-эндпоинтов, проверку `initData` токеном бота и CORS.
- **Supabase**: см. [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) — схема, RLS, Edge Function.

## Безопасность

- Токен бота и `service_role` ключ — только на сервере.
- Клиент передаёт подписанный `initData` в заголовке `X-Telegram-Init-Data`; сервер проверяет HMAC.
  `initDataUnsafe` используется только для отображения имени и аватара.
- Баланс, покупки, экипировка и награды меняются только сервером; суммы наград берутся из ответа сервера.
- Ответы сервера валидируются в рантайме; некорректные данные показываются как ошибка.
- Предметы применяют оформление только по белому списку ключей — произвольный CSS с сервера не исполняется.
- `.env*` (кроме `.env.example`) в `.gitignore`.

## Структура

```
app/                    маршруты (/, games, store, leaderboard, profile, tasks, settings)
components/             UI по разделам + общие компоненты (ui/, layout/)
lib/api/                контракт GameApi, HTTP-адаптер, выбор источника данных, валидация ответов
lib/demo/               демо-данные и песочница
lib/supabase/           клиент, типы таблиц, Supabase-адаптер
lib/services/           player / store / leaderboard / task сервисы и React-хуки
lib/telegram/           обёртка над Telegram WebApp SDK
lib/i18n/               словари RU/UZ/EN и форматирование
lib/games/              логика тренировочных режимов
scripts/                проверка экспорта и локальный static-сервер
docs/                   интеграция с ботом и Supabase
```

## Ограничения

- Тренировочные игры не связаны с балансом; реальные игры — в боте.
- В DEMO данные сбрасываются при перезагрузке страницы.
- Категории бота `name_color`, `title` и `box` в Mini App пока не отображаются.
- Без backend нет персонального рейтинга, истории операций и синхронизации с ботом.

---

© BAYHAN STUDIO
