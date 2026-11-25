-- E2. Season, weekend and beast clocks on Europe/Berlin calendar days.
-- This file is the migration. It is not applied and nothing is deployed from it.
-- arena_season: before 14 December 2026 04:00 Berlin the open season is 1
-- (0 only before season 1 opens on 16 November 2026 04:00). From that Monday
-- reset onward the number is 2 + floor(calendar days since 2026-12-14 / 28).
-- The day count uses the Monday 04:00 reset, not a fixed UTC epoch.

create or replace function public.arena_season(ts timestamptz)
returns integer
language sql
stable
as $$
  select greatest(0, 2 + floor((
    ((public.board_week(ts) at time zone 'Europe/Berlin')::date - date '2026-12-14')
  )::numeric / 28)::int)
$$;

-- Friday 18:00 inclusive through Monday 04:00 exclusive, Berlin wall time.
create or replace function public.in_weekend(ts timestamptz)
returns boolean
language sql
stable
as $$
  with local as (
    select ts at time zone 'Europe/Berlin' as wall
  )
  select case extract(isodow from wall)
    when 6 then true
    when 7 then true
    when 5 then extract(hour from wall) >= 18
    when 1 then extract(hour from wall) < 4
    else false
  end
  from local
$$;

-- Calendar week from Monday 16 November 2026. That week is Himmelswal.
-- Later weeks alternate. Negative week indexes stay on the same alternation.
create or replace function public.week_beast(ts timestamptz)
returns text
language sql
stable
as $$
  select case (
    (
      (((public.board_week(ts) at time zone 'Europe/Berlin')::date - date '2026-11-16') / 7) + 1
    ) % 2 + 2
  ) % 2
    when 0 then 'weltenwurm'
    else 'himmelswal'
  end
$$;

create or replace function public.close_arena_season()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_season integer := public.arena_season(now());
  closed integer := 0;
begin
  insert into public.arena_season_rewards (season, user_id, league, marks, frame)
  select a.season, a.user_id,
    case
      when a.rating >= 1900 then 'Velunor-Meister'
      when a.rating >= 1700 then 'Kristall'
      when a.rating >= 1500 then 'Gold'
      when a.rating >= 1300 then 'Silber'
      when a.rating >= 1167 then 'Bronze'
      else 'Kiesel'
    end,
    case
      when a.rating >= 1900 then 150
      when a.rating >= 1700 then 100
      when a.rating >= 1500 then 80
      when a.rating >= 1300 then 60
      when a.rating >= 1167 then 40
      else 20
    end,
    case
      when a.rating >= 1900 then 'meister'
      when a.rating >= 1700 then 'kristall'
      when a.rating >= 1500 then 'gold'
      when a.rating >= 1300 then 'silber'
      when a.rating >= 1167 then 'bronze'
      else 'kiesel'
    end
  from public.arena_profiles a
  where a.season < current_season
  on conflict (season, user_id) do nothing;
  update public.arena_profiles
  set rating = floor((rating + 1000) / 2.0)::int,
      season = current_season,
      defense_delta = 0,
      defense_day = ''
  where season < current_season;
  get diagnostics closed = row_count;
  return closed;
end;
$$;

create or replace function public.coop_ensure(p_user uuid, p_day text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  week_key timestamptz;
  gid uuid;
  beast_id text;
  lvl int;
  hp_left bigint;
  used int;
begin
  week_key := public.board_week(now());
  select group_id into gid from public.coop_members where user_id = p_user and week = week_key;
  if gid is null then
    beast_id := public.week_beast(week_key);
    insert into public.coop_groups (week, beast, host, level, hp)
    values (week_key, beast_id, p_user, 1, public.coop_pool(1))
    returning id into gid;
    insert into public.coop_members (user_id, week, group_id) values (p_user, week_key, gid);
  end if;
  select level, hp, beast into lvl, hp_left, beast_id from public.coop_groups where id = gid;
  select count(*) into used from public.coop_attempts
    where group_id = gid and user_id = p_user and day_key = p_day;
  return jsonb_build_object(
    'level', lvl,
    'hp', hp_left,
    'hp_max', public.coop_pool(lvl),
    'beast', beast_id,
    'week', week_key,
    'attempts', used,
    'group_id', gid
  );
end;
$$;
