-- Step 5. Saves and events already exist from step 4.
-- The service role writes profiles, names and the monster register.
-- A client only reads its own rows, and may insert its own reports and blocks.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  flag_level smallint not null default 0 check (flag_level between 0 and 2),
  last_audit jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.player_names (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  tag text not null check (tag ~ '^[0-9]{4}$'),
  display text not null,
  hidden boolean not null default false,
  changed_at timestamptz not null default now(),
  unique (name, tag)
);

create table if not exists public.monsters_owned (
  uid text not null,
  owner uuid not null references auth.users (id) on delete cascade,
  species text not null,
  level integer not null,
  rarity integer not null,
  schimmer boolean not null default false,
  obtained_at timestamptz not null,
  obtained_how text not null check (obtained_how in ('Truhe', 'Splitter', 'Ei', 'Rad', 'Tausch')),
  trade_lock_until timestamptz,
  trade_count integer not null default 0,
  primary key (owner, uid)
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter uuid references auth.users (id) on delete set null,
  target_label text not null,
  reason text not null check (reason in ('beleidigend', 'unangemessen', 'betrug', 'sonstiges')),
  created_at timestamptz not null default now(),
  purge_after timestamptz not null default (now() + interval '90 days')
);

create table if not exists public.blocks (
  owner uuid not null references auth.users (id) on delete cascade,
  label text not null,
  created_at timestamptz not null default now(),
  primary key (owner, label)
);

alter table public.profiles enable row level security;
alter table public.player_names enable row level security;
alter table public.monsters_owned enable row level security;
alter table public.reports enable row level security;
alter table public.blocks enable row level security;

create policy profiles_own on public.profiles
  for select using (user_id = auth.uid());

create policy names_read on public.player_names
  for select to authenticated using (true);

create policy monsters_own on public.monsters_owned
  for select using (owner = auth.uid());

create policy reports_own_read on public.reports
  for select using (reporter = auth.uid());

create policy reports_own_insert on public.reports
  for insert with check (reporter = auth.uid());

create policy blocks_own on public.blocks
  for all using (owner = auth.uid()) with check (owner = auth.uid());

-- Three different accounts hide the name until someone reviews it.
create or replace function public.hide_reported_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  voices integer;
begin
  select count(distinct reporter) into voices
  from public.reports
  where target_label = new.target_label and reporter is not null;
  if voices >= 3 then
    update public.player_names
      set hidden = true,
          display = 'Spieler#' || tag
      where (name || '#' || tag) = new.target_label
         or display = new.target_label;
  end if;
  return new;
end;
$$;

drop trigger if exists reports_hide_name on public.reports;
create trigger reports_hide_name
  after insert on public.reports
  for each row execute function public.hide_reported_name();
