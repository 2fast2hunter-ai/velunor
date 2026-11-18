-- Step 9. Async arena. Ratings, defense snapshots, logs and season rewards.
-- The fight itself runs in the arena-fight edge function. This file is the data and the clocks.

create table if not exists public.arena_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  rating integer not null default 1000,
  season integer not null default 0,
  attacks integer not null default 5,
  attacks_at timestamptz not null default now(),
  day_key text not null default '',
  defense_delta integer not null default 0,
  defense_day text not null default '',
  defense jsonb,
  suggestions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.arena_logs (
  id bigint generated always as identity primary key,
  defender uuid not null references auth.users (id) on delete cascade,
  at timestamptz not null default now(),
  attacker_label text not null,
  practice boolean not null default false,
  win boolean not null,
  delta integer not null,
  seed bigint not null
);

create table if not exists public.arena_season_rewards (
  season integer not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  league text not null,
  marks integer not null,
  frame text not null,
  claimed boolean not null default false,
  primary key (season, user_id)
);

alter table public.arena_profiles enable row level security;
alter table public.arena_logs enable row level security;
alter table public.arena_season_rewards enable row level security;

drop policy if exists arena_own on public.arena_profiles;
create policy arena_own on public.arena_profiles
  for select using (user_id = auth.uid());

drop policy if exists arena_logs_own on public.arena_logs;
create policy arena_logs_own on public.arena_logs
  for select using (defender = auth.uid());

drop policy if exists arena_rewards_own on public.arena_season_rewards;
create policy arena_rewards_own on public.arena_season_rewards
  for select using (user_id = auth.uid());

create index if not exists arena_profiles_rating on public.arena_profiles (rating);

-- Most recent 04:00 Europe/Berlin. 2026-11-16 04:00 Berlin is 03:00 UTC.
create or replace function public.arena_reset(ts timestamptz)
returns timestamptz
language sql
stable
as $$
  with local as (
    select ts at time zone 'Europe/Berlin' as wall
  )
  select case
    when wall < date_trunc('day', wall) + interval '4 hours'
    then (date_trunc('day', wall) + interval '4 hours' - interval '1 day') at time zone 'Europe/Berlin'
    else (date_trunc('day', wall) + interval '4 hours') at time zone 'Europe/Berlin'
  end
  from local
$$;

create or replace function public.arena_season(ts timestamptz)
returns integer
language sql
stable
as $$
  select greatest(0, floor(extract(epoch from (public.arena_reset(ts) - timestamptz '2026-11-16 03:00:00+00')) / (14 * 86400))::int)
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
      when a.rating >= 1100 then 'Bronze'
      else 'Kiesel'
    end,
    case
      when a.rating >= 1900 then 150
      when a.rating >= 1700 then 100
      when a.rating >= 1500 then 80
      when a.rating >= 1300 then 60
      when a.rating >= 1100 then 40
      else 20
    end,
    case
      when a.rating >= 1900 then 'meister'
      when a.rating >= 1700 then 'kristall'
      when a.rating >= 1500 then 'gold'
      when a.rating >= 1300 then 'silber'
      when a.rating >= 1100 then 'bronze'
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

revoke all on function public.close_arena_season() from public, anon, authenticated;

do $$
declare
  job bigint;
begin
  select jobid into job from cron.job where jobname = 'velunor-refresh-ranks';
  if job is not null then
    perform cron.unschedule(job);
  end if;
  select jobid into job from cron.job where jobname = 'velunor-arena-season';
  if job is not null then
    perform cron.unschedule(job);
  end if;
end $$;

drop materialized view if exists public.leaderboard_rows;

create materialized view public.leaderboard_rows as
with visible as (
  select user_id, flag_level, last_audit
  from public.profiles
  where flag_level < 2
),
codex as (
  select 'codex'::text as board,
         timestamptz '1970-01-01+00' as week,
         m.owner as user_id,
         count(distinct m.species)::bigint as score,
         '{}'::jsonb as detail
  from public.monsters_owned m
  join visible v on v.user_id = m.owner
  group by m.owner
  having count(distinct m.species) > 0
),
shimmer as (
  select 'shimmer'::text,
         timestamptz '1970-01-01+00',
         m.owner,
         count(distinct m.species)::bigint,
         '{}'::jsonb
  from public.monsters_owned m
  join visible v on v.user_id = m.owner
  where m.schimmer
  group by m.owner
  having count(distinct m.species) > 0
),
week_rows as (
  select 'week'::text,
         public.board_week(m.obtained_at),
         m.owner,
         count(*)::bigint,
         '{}'::jsonb
  from public.monsters_owned m
  join visible v on v.user_id = m.owner
  where m.obtained_at >= public.board_week(now()) - interval '7 days'
    and m.obtained_at < public.board_week(now()) + interval '7 days'
  group by m.owner, public.board_week(m.obtained_at)
),
progress as (
  select 'progress'::text,
         timestamptz '1970-01-01+00',
         v.user_id,
         (
           greatest(1, coalesce((v.last_audit->>'region')::int, 1)) * 100000
           + (
             select count(*) from jsonb_array_elements_text(coalesce(v.last_audit->'badges', '[]'::jsonb)) badge
             where badge in (
               'Kieselwappen', 'Wellenwappen', 'Funkenwappen', 'Moorwappen',
               'Felswappen', 'Sturmwappen', 'Frostwappen', 'Klingenwappen'
             )
           ) * 100
           + (
             select count(*) from jsonb_array_elements_text(coalesce(v.last_audit->'badges', '[]'::jsonb)) badge
             where badge in (
               'Ratsiegel', 'Zweites Ratsiegel', 'Drittes Ratsiegel', 'Viertes Ratsiegel', 'Fünftes Ratsiegel'
             )
           )
         )::bigint,
         jsonb_build_object(
           'region', greatest(1, coalesce((v.last_audit->>'region')::int, 1)),
           'crests', (
             select count(*) from jsonb_array_elements_text(coalesce(v.last_audit->'badges', '[]'::jsonb)) badge
             where badge in (
               'Kieselwappen', 'Wellenwappen', 'Funkenwappen', 'Moorwappen',
               'Felswappen', 'Sturmwappen', 'Frostwappen', 'Klingenwappen'
             )
           ),
           'council', (
             select count(*) from jsonb_array_elements_text(coalesce(v.last_audit->'badges', '[]'::jsonb)) badge
             where badge in (
               'Ratsiegel', 'Zweites Ratsiegel', 'Drittes Ratsiegel', 'Viertes Ratsiegel', 'Fünftes Ratsiegel'
             )
           )
         )
  from visible v
  where v.last_audit is not null
),
mastery as (
  select 'mastery'::text,
         timestamptz '1970-01-01+00',
         v.user_id,
         coalesce((v.last_audit->>'masteryRanks')::bigint, 0),
         '{}'::jsonb
  from visible v
  where coalesce((v.last_audit->>'masteryRanks')::bigint, 0) > 0
),
arena as (
  select 'arena'::text,
         timestamptz '1970-01-01+00',
         a.user_id,
         a.rating::bigint,
         jsonb_build_object('league',
           case
             when a.rating >= 1900 then 'Velunor-Meister'
             when a.rating >= 1700 then 'Kristall'
             when a.rating >= 1500 then 'Gold'
             when a.rating >= 1300 then 'Silber'
             when a.rating >= 1100 then 'Bronze'
             else 'Kiesel'
           end
         )
  from public.arena_profiles a
  join visible v on v.user_id = a.user_id
)
select * from codex
union all select * from shimmer
union all select * from week_rows
union all select * from progress
union all select * from mastery
union all select * from arena
with no data;

create unique index leaderboard_rows_key on public.leaderboard_rows (board, week, user_id);
refresh materialized view public.leaderboard_rows;
revoke all on public.leaderboard_rows from public, anon, authenticated;

create or replace function public.grant_weekly_rewards()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  prev timestamptz := public.board_week(now()) - interval '7 days';
  inserted bigint := 0;
begin
  with pool as (
    select r.user_id, r.board, r.score,
           row_number() over (partition by r.board order by r.score desc, r.user_id) as place,
           count(*) over (partition by r.board) as eligible
    from public.leaderboard_rows r
    join public.profiles p on p.user_id = r.user_id and p.flag_level = 0
    where r.board <> 'arena'
      and (
        (r.board <> 'week' and r.week = timestamptz '1970-01-01+00')
        or (r.board = 'week' and r.week = prev)
      )
  ),
  ready as (
    select prev as week, user_id, board, place::integer, eligible::integer,
      case
        when place <= ceil(eligible * 0.01) then 'top1'
        when place <= ceil(eligible * 0.10) then 'top10'
        when place <= ceil(eligible * 0.50) then 'top50'
        else null
      end as tier
    from pool
  )
  insert into public.weekly_rewards (week, user_id, board, place, eligible, tier, marks, title)
  select week, user_id, board, place, eligible, tier,
    case tier when 'top1' then 100 when 'top10' then 50 else 20 end,
    case
      when tier = 'top1' and board = 'codex' then 'Kodexlicht'
      when tier = 'top1' and board = 'progress' then 'Wegmarke'
      when tier = 'top1' and board = 'week' then 'Wochenkranz'
      when tier = 'top1' and board = 'shimmer' then 'Schimmerreif'
      when tier = 'top1' and board = 'mastery' then 'Meisterkrone'
      else null
    end
  from ready
  where tier is not null
  on conflict (week, user_id, board) do nothing;
  get diagnostics inserted = row_count;
  return inserted;
end;
$$;

revoke all on function public.grant_weekly_rewards() from public, anon, authenticated;

create or replace function public.leaderboard_page(p_board text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  week_key timestamptz;
  body jsonb;
begin
  if uid is null then
    return jsonb_build_object('status', 'offline');
  end if;
  if p_board not in ('codex', 'progress', 'week', 'shimmer', 'mastery', 'arena') then
    return jsonb_build_object('status', 'offline');
  end if;
  week_key := case
    when p_board = 'week' then public.board_week(now())
    else timestamptz '1970-01-01+00'
  end;
  with ranked as (
    select r.user_id, r.score, r.detail,
           row_number() over (order by r.score desc, r.user_id) as place,
           public.rank_label(n.hidden, n.display, n.name, n.tag) as label
    from public.leaderboard_rows r
    left join public.player_names n on n.user_id = r.user_id
    where r.board = p_board and r.week = week_key
  ),
  shown as (
    select ranked.*,
           exists (
             select 1 from public.blocks b
             where b.owner = uid
               and ranked.user_id <> uid
               and (b.label = ranked.label or b.label = coalesce((select name || '#' || tag from public.player_names where user_id = ranked.user_id), ''))
           ) as blocked
    from ranked
  ),
  me as (
    select place from shown where user_id = uid
  )
  select jsonb_build_object(
    'status', 'ready',
    'board', p_board,
    'top', coalesce((
      select jsonb_agg(jsonb_build_object(
        'place', place, 'label', label, 'score', score, 'detail', detail, 'self', user_id = uid
      ) order by place)
      from shown
      where place <= 100 and not blocked
    ), '[]'::jsonb),
    'around', coalesce((
      select jsonb_agg(jsonb_build_object(
        'place', s.place, 'label', s.label, 'score', s.score, 'detail', s.detail, 'self', s.user_id = uid
      ) order by s.place)
      from shown s, me
      where s.place between greatest(1, me.place - 10) and me.place + 10
        and not s.blocked
    ), '[]'::jsonb),
    'honors', coalesce((
      select jsonb_agg(distinct honor)
      from (
        select board as honor from public.weekly_rewards
        where user_id = uid and tier = 'top1'
        union
        select 'ehren' from public.weekly_rewards
        where user_id = uid and place = 1
      ) frames
    ), '[]'::jsonb)
  ) into body;
  return body;
end;
$$;

revoke all on function public.leaderboard_page(text) from public;
grant execute on function public.leaderboard_page(text) to authenticated;

select cron.schedule(
  'velunor-refresh-ranks',
  '*/10 * * * *',
  $$refresh materialized view concurrently public.leaderboard_rows$$
);

select cron.schedule(
  'velunor-arena-season',
  '15 * * * *',
  $$select public.close_arena_season()$$
);
