# Настройка Supabase

Supabase — альтернатива собственному API рядом с ботом. Схема безопасности:

- браузер получает **только** `anon`/publishable ключ и может **читать** опубликованный каталог и публичный рейтинг;
- всё, что связано с конкретным игроком (профиль, инвентарь, задания, покупки, награды), идёт через
  **Edge Function**, которая проверяет Telegram `initData` и работает с базой на сервере;
- `service_role` ключ и токен бота существуют **только** в секретах Edge Function.

> Если основная база остаётся у Python-бота, Supabase нужно синхронизировать с ней (или бот должен
> перейти на Postgres Supabase). Не храните баланс в двух местах без единого источника истины.

## 1. Переменные фронтенда

```env
NEXT_PUBLIC_DATA_SOURCE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon или sb_publishable_ ключ>
NEXT_PUBLIC_SUPABASE_FUNCTION_NAME=miniapp-api
```

Фронтенд отклоняет ключи `sb_secret_…` и JWT с ролью `service_role` (статус «Ключ отклонён» в диагностике).

## 2. Схема

```sql
create table public.players (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique not null,
  public_id uuid unique not null default gen_random_uuid(),
  nickname text, username text, photo_url text,
  level int not null default 1,
  xp int not null default 0,
  usd_balance numeric(20,2) not null default 0 check (usd_balance >= 0),
  btc_balance numeric(18,8) not null default 0 check (btc_balance >= 0),
  bank_usd numeric(20,2) not null default 0,
  games_played int not null default 0,
  games_won int not null default 0,
  games_lost int not null default 0,
  total_wagered numeric(20,2) not null default 0,
  total_won numeric(20,2) not null default 0,
  daily_streak int not null default 0,
  last_daily_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_items (
  id text primary key,                         -- код предмета, напр. 'frame_neon'
  category text not null check (category in ('frame','badge','theme','name_style','avatar_effect')),
  name jsonb not null,                         -- {"ru": "...", "uz": "...", "en": "..."}
  description jsonb not null,
  rarity text not null check (rarity in ('common','rare','epic','legendary','limited')),
  price_usd numeric(20,2) not null default 0,
  purchasable boolean not null default true,
  is_limited boolean not null default false,
  limited_quantity int,
  sold_count int not null default 0,
  featured boolean not null default false,
  preview text not null,
  enabled boolean not null default true,
  sort_order int not null default 100
);

create table public.player_loadouts (
  player_id uuid primary key references public.players(id) on delete cascade,
  frame_item_id text references public.store_items(id),
  badge_item_id text references public.store_items(id),
  theme_item_id text references public.store_items(id),
  name_style_item_id text references public.store_items(id),
  avatar_effect_item_id text references public.store_items(id)
);

create table public.player_inventory (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  item_id text not null references public.store_items(id),
  serial_no int,
  source text not null check (source in ('purchase','reward','event','admin')),
  acquired_at timestamptz not null default now(),
  unique (player_id, item_id)
);

create table public.player_achievements (
  player_id uuid not null references public.players(id) on delete cascade,
  achievement_code text not null,
  unlocked_at timestamptz not null default now(),
  primary key (player_id, achievement_code)
);

create table public.tasks (
  id text primary key,
  period text not null check (period in ('daily','weekly','achievement')),
  title jsonb not null,
  description jsonb not null,
  target int not null,
  reward_usd numeric(20,2) not null default 0,
  reward_xp int not null default 0,
  icon text not null,
  active boolean not null default true,
  sort_order int not null default 100
);

create table public.player_tasks (
  player_id uuid not null references public.players(id) on delete cascade,
  task_id text not null references public.tasks(id),
  period_key text not null,                   -- '2026-10-09' для daily, '2026-W41' для weekly, 'all' для достижений
  progress int not null default 0,
  status text not null default 'in_progress' check (status in ('in_progress','completed','claimed')),
  claimed_at timestamptz,
  primary key (player_id, task_id, period_key)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  type text not null,
  currency text not null check (currency in ('USD','BTC')),
  amount numeric(20,8) not null,
  balance_before numeric(20,8) not null,
  balance_after numeric(20,8) not null,
  context text,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);
create index on public.transactions (player_id, created_at desc);

-- Публичный рейтинг: без telegram_id и балансов в открытом виде, кроме значения категории.
create view public.leaderboard_entries with (security_invoker = false) as
with base as (
  select p.public_id, coalesce(p.nickname, 'Player') as nickname, p.photo_url, p.level,
         l.frame_item_id, p.updated_at,
         p.usd_balance + p.bank_usd as capital, p.games_won
  from public.players p
  left join public.player_loadouts l on l.player_id = p.id
)
select 'capital'::text as category, rank() over (order by capital desc)::int as rank,
       public_id, nickname, photo_url, level, capital as value, frame_item_id, updated_at from base
union all
select 'level', rank() over (order by level desc, capital desc)::int,
       public_id, nickname, photo_url, level, level, frame_item_id, updated_at from base
union all
select 'wins', rank() over (order by games_won desc)::int,
       public_id, nickname, photo_url, level, games_won, frame_item_id, updated_at from base;
```

Для больших таблиц замените view на материализованное представление, обновляемое через `pg_cron`.

## 3. RLS

```sql
alter table public.players             enable row level security;
alter table public.player_loadouts     enable row level security;
alter table public.player_inventory    enable row level security;
alter table public.store_items         enable row level security;
alter table public.player_achievements enable row level security;
alter table public.tasks               enable row level security;
alter table public.player_tasks        enable row level security;
alter table public.transactions        enable row level security;

-- Единственная публичная таблица: опубликованный каталог, только чтение.
create policy "store items are public" on public.store_items
  for select to anon, authenticated using (enabled = true);

-- Остальные таблицы: политик для anon/authenticated НЕТ → прямой доступ из браузера запрещён.
-- Edge Function работает с service_role, который обходит RLS.

-- Рейтинг: view читает players от имени владельца, поэтому даём доступ только к нему.
revoke all on public.leaderboard_entries from anon, authenticated;
grant select on public.leaderboard_entries to anon, authenticated;
```

Никаких `insert`/`update`/`delete` политик для `anon` — баланс, инвентарь и награды меняет только сервер.

## 4. Edge Function `miniapp-api`

Функция реализует REST-контракт из [`BOT_INTEGRATION.md`](./BOT_INTEGRATION.md) (те же пути, формат и коды ошибок).
Фронтенд вызывает `https://<ref>.supabase.co/functions/v1/miniapp-api/<путь>` с заголовками
`apikey`, `Authorization: Bearer <anon>`, `X-Telegram-Init-Data`, `Idempotency-Key`.

```bash
supabase functions new miniapp-api
supabase secrets set TELEGRAM_BOT_TOKEN=... ALLOWED_ORIGIN=https://<user>.github.io
supabase functions deploy miniapp-api
```

`SUPABASE_URL` и `SUPABASE_SERVICE_ROLE_KEY` доступны функции автоматически.

Скелет (`supabase/functions/miniapp-api/index.ts`):

```ts
import { createClient } from "npm:@supabase/supabase-js@2";

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN")!;
const ORIGIN = Deno.env.get("ALLOWED_ORIGIN")!;
const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

const cors = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-telegram-init-data, idempotency-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

async function hmac(key: BufferSource, data: string) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data)));
}

async function verifyInitData(raw: string): Promise<{ id: number; first_name?: string } | null> {
  const params = new URLSearchParams(raw);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const check = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = await hmac(new TextEncoder().encode("WebAppData"), BOT_TOKEN);
  const hex = [...(await hmac(secret, check))].map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex !== hash) return null;
  if (Date.now() / 1000 - Number(params.get("auth_date")) > 86400) return null;
  return JSON.parse(params.get("user") ?? "null");
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const user = await verifyInitData(req.headers.get("x-telegram-init-data") ?? "");
  if (!user) return json({ ok: false, error: { code: "unauthorized" } }, 401);

  const path = new URL(req.url).pathname.replace(/^\/miniapp-api/, "");
  // Роутинг: /me, /me/activity, /me/daily-reward, /store/items, /me/inventory,
  // /store/purchase, /me/loadout, /leaderboard, /me/tasks, /me/tasks/:id/claim.
  // Денежные операции реализуйте как SQL-функции (security definer) и вызывайте через db.rpc(),
  // чтобы проверка баланса, списание и запись в transactions происходили атомарно.
  return json({ ok: false, error: { code: "not_found" } }, 404);
});
```

Пример атомарной покупки:

```sql
create or replace function public.purchase_item(p_telegram_id bigint, p_item_id text, p_key text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_player players; v_item store_items; v_serial int;
begin
  if exists (select 1 from transactions where idempotency_key = p_key) then
    raise exception 'duplicate' using errcode = 'P0001';
  end if;
  select * into v_player from players where telegram_id = p_telegram_id for update;
  select * into v_item from store_items where id = p_item_id and enabled for update;
  if v_item.id is null or not v_item.purchasable then raise exception 'not_purchasable'; end if;
  if exists (select 1 from player_inventory where player_id = v_player.id and item_id = p_item_id) then
    raise exception 'already_owned';
  end if;
  if v_item.is_limited and v_item.sold_count >= v_item.limited_quantity then raise exception 'sold_out'; end if;
  if v_player.usd_balance < v_item.price_usd then raise exception 'insufficient_funds'; end if;

  update players set usd_balance = usd_balance - v_item.price_usd, updated_at = now() where id = v_player.id;
  if v_item.is_limited then
    update store_items set sold_count = sold_count + 1 where id = p_item_id returning sold_count into v_serial;
  end if;
  insert into player_inventory (player_id, item_id, serial_no, source) values (v_player.id, p_item_id, v_serial, 'purchase');
  insert into transactions (player_id, type, currency, amount, balance_before, balance_after, context, idempotency_key)
  values (v_player.id, 'COSMETIC_BUY', 'USD', -v_item.price_usd, v_player.usd_balance,
          v_player.usd_balance - v_item.price_usd, p_item_id, p_key);
  return jsonb_build_object('itemId', p_item_id, 'balanceUsd', v_player.usd_balance - v_item.price_usd);
end $$;

revoke execute on function public.purchase_item from anon, authenticated;
```

## 5. Развёртывание Edge Function

Код функции: `supabase/functions/miniapp-api/index.ts`.

```bash
# Один раз
supabase login
supabase link --project-ref iflqtvazzfxfwybxkhxl

# Секреты (токен бота НИКОГДА не в frontend / GitHub Variables)
supabase secrets set TELEGRAM_BOT_TOKEN="****" ALLOWED_ORIGIN="https://USERNAME.github.io"

# Деплой
supabase functions deploy miniapp-api --project-ref iflqtvazzfxfwybxkhxl
```

В `supabase/config.toml` для этой функции `verify_jwt = false`: авторизация — HMAC Telegram `initData`, не Supabase Auth JWT.

Миграции лежат в `supabase/migrations/`. Уже применена схема core на проект `iflqtvazzfxfwybxkhxl` (таблицы + RLS + view рейтинга). RPC `purchase_item` — только через service_role из Edge Function.

Важно: эта схема **не является** автоматической копией SQLite/Postgres базы Python-бота. Пока бот — источник истины по деньгам, либо синхронизируйте данные, либо переводите бот на эту БД. Не запускайте две независимые экономики.

## 6. Проверка

1. Соберите фронтенд с переменными из п. 1 и откройте его в Telegram.
2. «Настройки → Диагностика»: Supabase «Настроен», кнопка «Проверить соединение» → «Сервер отвечает».
   `schema_missing` означает, что таблица `store_items` ещё не создана.
3. Активный режим должен быть `LIVE · Supabase`.
