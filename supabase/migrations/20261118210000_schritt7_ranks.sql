-- Step 7. Leaderboards from the register and the checked profile.
-- Arena and guild stay reserved board ids so a later step can fill them.
-- Week boundary: Monday 04:00 Europe/Berlin, through the next Monday 04:00.

create extension if not exists pg_cron;

create table if not exists public.weekly_rewards (
  week timestamptz not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  board text not null check (board in ('codex', 'progress', 'week', 'shimmer', 'mastery', 'arena', 'guild')),
  place integer not null,
  eligible integer not null,
  tier text not null check (tier in ('top1', 'top10', 'top50')),
  marks integer not null check (marks in (100, 50, 20)),
  title text,
  claimed boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (week, user_id, board)
);

alter table public.weekly_rewards enable row level security;

drop policy if exists weekly_rewards_own on public.weekly_rewards;
create policy weekly_rewards_own on public.weekly_rewards
  for select using (user_id = auth.uid());

create index if not exists monsters_owned_obtained_at on public.monsters_owned (obtained_at);
create index if not exists monsters_owned_owner_species on public.monsters_owned (owner, species);

-- Monday 04:00 Europe/Berlin that opened the week containing ts.
create or replace function public.board_week(ts timestamptz)
returns timestamptz
language sql
stable
as $$
  with local as (
    select ts at time zone 'Europe/Berlin' as wall
  ),
  monday as (
    select case
      when wall < date_trunc('week', wall) + interval '4 hours'
      then date_trunc('week', wall) + interval '4 hours' - interval '7 days'
      else date_trunc('week', wall) + interval '4 hours'
    end as wall_start
    from local
  )
  select wall_start at time zone 'Europe/Berlin' from monday
$$;

create or replace function public.rank_label(hidden boolean, display text, name text, tag text)
returns text
language sql
immutable
as $$
  select case
    when coalesce(hidden, false) then 'Spieler#' || coalesce(tag, '0000')
    when coalesce(display, '') <> '' then display
    when coalesce(name, '') <> '' then name || '#' || coalesce(tag, '0000')
    else 'Spieler'
  end
$$;

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
         )::bigint as score,
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
         ) as detail
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
)
select * from codex
union all select * from shimmer
union all select * from week_rows
union all select * from progress
union all select * from mastery
with no data;

create unique index leaderboard_rows_key on public.leaderboard_rows (board, week, user_id);

refresh materialized view public.leaderboard_rows;

revoke all on public.leaderboard_rows from public, anon, authenticated;

-- Pays the week that just closed. A second call inserts nothing.
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
    where (r.board <> 'week' and r.week = timestamptz '1970-01-01+00')
       or (r.board = 'week' and r.week = prev)
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
stable
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
  if p_board not in ('codex', 'progress', 'week', 'shimmer', 'mastery') then
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

create or replace function public.claim_rank_rewards()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  body jsonb;
begin
  if uid is null then
    return jsonb_build_object('marks', 0, 'titles', '[]'::jsonb);
  end if;
  with got as (
    update public.weekly_rewards
    set claimed = true
    where user_id = uid and claimed = false
    returning marks, title
  )
  select jsonb_build_object(
    'marks', coalesce(sum(marks), 0),
    'titles', coalesce(jsonb_agg(title) filter (where title is not null), '[]'::jsonb)
  ) into body
  from got;
  return coalesce(body, jsonb_build_object('marks', 0, 'titles', '[]'::jsonb));
end;
$$;

revoke all on function public.claim_rank_rewards() from public;
grant execute on function public.claim_rank_rewards() to authenticated;

do $$
declare
  job bigint;
begin
  select jobid into job from cron.job where jobname = 'velunor-refresh-ranks';
  if job is not null then
    perform cron.unschedule(job);
  end if;
  select jobid into job from cron.job where jobname = 'velunor-grant-ranks';
  if job is not null then
    perform cron.unschedule(job);
  end if;
end $$;

select cron.schedule(
  'velunor-refresh-ranks',
  '*/10 * * * *',
  $$refresh materialized view concurrently public.leaderboard_rows$$
);

select cron.schedule(
  'velunor-grant-ranks',
  '2,12,22,32,42,52 * * * *',
  $$select public.grant_weekly_rewards()$$
);
