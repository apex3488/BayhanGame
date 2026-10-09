-- BAYHAN GAME Mini App schema (independent of the Python bot SQLite/Postgres DB).
-- Do NOT treat this as a 1:1 mirror of bot tables unless you migrate the bot onto the same DB.
-- Player money mutations must go through Edge Function RPCs with Telegram initData verification.

create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  telegram_id bigint unique not null,
  public_id uuid unique not null default gen_random_uuid(),
  nickname text,
  username text,
  photo_url text,
  level int not null default 1 check (level >= 1),
  xp int not null default 0 check (xp >= 0),
  usd_balance numeric(20, 2) not null default 0 check (usd_balance >= 0),
  btc_balance numeric(18, 8) not null default 0 check (btc_balance >= 0),
  bank_usd numeric(20, 2) not null default 0 check (bank_usd >= 0),
  games_played int not null default 0,
  games_won int not null default 0,
  games_lost int not null default 0,
  total_wagered numeric(20, 2) not null default 0,
  total_won numeric(20, 2) not null default 0,
  daily_streak int not null default 0,
  last_daily_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_items (
  id text primary key,
  category text not null check (category in ('frame', 'badge', 'theme', 'name_style', 'avatar_effect')),
  name jsonb not null,
  description jsonb not null,
  rarity text not null check (rarity in ('common', 'rare', 'epic', 'legendary', 'limited')),
  price_usd numeric(20, 2) not null default 0 check (price_usd >= 0),
  purchasable boolean not null default true,
  is_limited boolean not null default false,
  limited_quantity int,
  sold_count int not null default 0 check (sold_count >= 0),
  featured boolean not null default false,
  preview text not null,
  enabled boolean not null default true,
  sort_order int not null default 100
);

create table if not exists public.player_loadouts (
  player_id uuid primary key references public.players (id) on delete cascade,
  frame_item_id text references public.store_items (id),
  badge_item_id text references public.store_items (id),
  theme_item_id text references public.store_items (id),
  name_style_item_id text references public.store_items (id),
  avatar_effect_item_id text references public.store_items (id)
);

create table if not exists public.player_inventory (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  item_id text not null references public.store_items (id),
  serial_no int,
  source text not null check (source in ('purchase', 'reward', 'event', 'admin')),
  acquired_at timestamptz not null default now(),
  unique (player_id, item_id)
);

create table if not exists public.player_achievements (
  player_id uuid not null references public.players (id) on delete cascade,
  achievement_code text not null,
  unlocked_at timestamptz not null default now(),
  primary key (player_id, achievement_code)
);

create table if not exists public.tasks (
  id text primary key,
  period text not null check (period in ('daily', 'weekly', 'achievement')),
  title jsonb not null,
  description jsonb not null,
  target int not null check (target > 0),
  reward_usd numeric(20, 2) not null default 0,
  reward_xp int not null default 0,
  icon text not null,
  active boolean not null default true,
  sort_order int not null default 100
);

create table if not exists public.player_tasks (
  player_id uuid not null references public.players (id) on delete cascade,
  task_id text not null references public.tasks (id),
  period_key text not null,
  progress int not null default 0,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'claimed')),
  claimed_at timestamptz,
  primary key (player_id, task_id, period_key)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players (id) on delete cascade,
  type text not null,
  currency text not null check (currency in ('USD', 'BTC')),
  amount numeric(20, 8) not null,
  balance_before numeric(20, 8) not null,
  balance_after numeric(20, 8) not null,
  context text,
  idempotency_key text unique,
  created_at timestamptz not null default now()
);

create index if not exists players_telegram_id_idx on public.players (telegram_id);
create index if not exists player_inventory_player_idx on public.player_inventory (player_id);
create index if not exists transactions_player_created_idx on public.transactions (player_id, created_at desc);
create index if not exists store_items_enabled_sort_idx on public.store_items (enabled, sort_order);

create or replace view public.leaderboard_entries
with (security_invoker = false)
as
with base as (
  select
    p.public_id,
    coalesce(nullif(p.nickname, ''), nullif(p.username, ''), 'Player') as nickname,
    p.photo_url,
    p.level,
    l.frame_item_id,
    p.updated_at,
    (p.usd_balance + p.bank_usd) as capital,
    p.games_won
  from public.players p
  left join public.player_loadouts l on l.player_id = p.id
)
select 'capital'::text as category,
       rank() over (order by capital desc)::int as rank,
       public_id, nickname, photo_url, level, capital as value, frame_item_id, updated_at
from base
union all
select 'level',
       rank() over (order by level desc, capital desc)::int,
       public_id, nickname, photo_url, level, level::numeric, frame_item_id, updated_at
from base
union all
select 'wins',
       rank() over (order by games_won desc)::int,
       public_id, nickname, photo_url, level, games_won::numeric, frame_item_id, updated_at
from base;

alter table public.players enable row level security;
alter table public.player_loadouts enable row level security;
alter table public.player_inventory enable row level security;
alter table public.store_items enable row level security;
alter table public.player_achievements enable row level security;
alter table public.tasks enable row level security;
alter table public.player_tasks enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "store items are public" on public.store_items;
create policy "store items are public"
  on public.store_items for select to anon, authenticated
  using (enabled = true);

drop policy if exists "tasks catalog is public" on public.tasks;
create policy "tasks catalog is public"
  on public.tasks for select to anon, authenticated
  using (active = true);

-- No anon policies on player tables: Edge Function uses service_role.

revoke all on public.leaderboard_entries from anon, authenticated;
grant select on public.leaderboard_entries to anon, authenticated;
grant select on public.store_items to anon, authenticated;
grant select on public.tasks to anon, authenticated;

-- Atomic purchase (called only from Edge Function with service_role).
create or replace function public.purchase_item(p_telegram_id bigint, p_item_id text, p_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players;
  v_item public.store_items;
  v_serial int;
  v_inventory jsonb;
begin
  if p_key is not null and exists (select 1 from public.transactions where idempotency_key = p_key) then
    select jsonb_build_object(
      'itemId', p_item_id,
      'balanceUsd', p.usd_balance,
      'inventory', coalesce((
        select jsonb_agg(jsonb_build_object(
          'itemId', i.item_id,
          'acquiredAt', i.acquired_at,
          'serialNo', i.serial_no,
          'source', i.source
        ))
        from public.player_inventory i where i.player_id = p.id
      ), '[]'::jsonb)
    ) into v_inventory
    from public.players p where p.telegram_id = p_telegram_id;
    return v_inventory;
  end if;

  select * into v_player from public.players where telegram_id = p_telegram_id for update;
  if v_player.id is null then
    raise exception 'not_found' using errcode = 'P0002';
  end if;

  select * into v_item from public.store_items where id = p_item_id and enabled for update;
  if v_item.id is null or not v_item.purchasable then
    raise exception 'not_purchasable' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.player_inventory where player_id = v_player.id and item_id = p_item_id) then
    raise exception 'already_owned' using errcode = 'P0001';
  end if;
  if v_item.is_limited and v_item.limited_quantity is not null and v_item.sold_count >= v_item.limited_quantity then
    raise exception 'sold_out' using errcode = 'P0001';
  end if;
  if v_player.usd_balance < v_item.price_usd then
    raise exception 'insufficient_funds' using errcode = 'P0001';
  end if;

  update public.players
    set usd_balance = usd_balance - v_item.price_usd, updated_at = now()
    where id = v_player.id;

  if v_item.is_limited then
    update public.store_items set sold_count = sold_count + 1 where id = p_item_id returning sold_count into v_serial;
  end if;

  insert into public.player_inventory (player_id, item_id, serial_no, source)
  values (v_player.id, p_item_id, v_serial, 'purchase');

  insert into public.transactions (
    player_id, type, currency, amount, balance_before, balance_after, context, idempotency_key
  ) values (
    v_player.id, 'COSMETIC_BUY', 'USD', -v_item.price_usd,
    v_player.usd_balance, v_player.usd_balance - v_item.price_usd, p_item_id, p_key
  );

  return jsonb_build_object(
    'itemId', p_item_id,
    'balanceUsd', v_player.usd_balance - v_item.price_usd,
    'inventory', coalesce((
      select jsonb_agg(jsonb_build_object(
        'itemId', i.item_id,
        'acquiredAt', i.acquired_at,
        'serialNo', i.serial_no,
        'source', i.source
      ))
      from public.player_inventory i where i.player_id = v_player.id
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.purchase_item(bigint, text, text) from public, anon, authenticated;
