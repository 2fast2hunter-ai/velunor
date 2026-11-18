-- Step 13. Guilds. Writes go through guild_act with the service role.
-- Deploy this migration before the guild function bundle, and before the updated arena-fight bundle.

alter table public.arena_logs
  add column if not exists attacker uuid references auth.users (id) on delete set null,
  add column if not exists attacker_win boolean;

create table if not exists public.guilds (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  tag text not null unique,
  description text not null default '',
  shape text not null default 'shield',
  symbol text not null default 'leaf',
  color text not null default 'moss',
  join_mode text not null default 'request' check (join_mode in ('open', 'request', 'code')),
  code text not null unique,
  points integer not null default 0,
  week timestamptz not null default public.board_week(now()),
  week_points integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.guild_members (
  guild_id uuid not null references public.guilds (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('lead', 'deputy', 'member')),
  joined_at timestamptz not null default now(),
  contrib integer not null default 0,
  contrib_week timestamptz not null default public.board_week(now()),
  chest_mark integer not null default 0,
  expedition_mark integer not null default 0,
  claimed text not null default '',
  primary key (guild_id, user_id)
);

create unique index if not exists guild_members_user on public.guild_members (user_id);

create table if not exists public.guild_requests (
  guild_id uuid not null references public.guilds (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (guild_id, user_id)
);

create table if not exists public.guild_goals (
  guild_id uuid not null references public.guilds (id) on delete cascade,
  week timestamptz not null,
  goal text not null,
  progress integer not null default 0,
  target integer not null,
  primary key (guild_id, week, goal)
);

create table if not exists public.guild_phrases (
  id bigint generated always as identity primary key,
  guild_id uuid not null references public.guilds (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  phrase text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.guild_beasts (
  guild_id uuid not null references public.guilds (id) on delete cascade,
  week timestamptz not null,
  level integer not null default 1,
  hp bigint not null,
  primary key (guild_id, week)
);

create table if not exists public.guild_beast_members (
  guild_id uuid not null,
  week timestamptz not null,
  user_id uuid not null,
  primary key (guild_id, week, user_id)
);

create table if not exists public.guild_beast_attempts (
  guild_id uuid not null,
  week timestamptz not null,
  user_id uuid not null,
  day_key text not null,
  n smallint not null check (n between 1 and 3),
  damage bigint not null,
  primary key (guild_id, week, user_id, day_key, n)
);

alter table public.guilds enable row level security;
alter table public.guild_members enable row level security;
alter table public.guild_requests enable row level security;
alter table public.guild_goals enable row level security;
alter table public.guild_phrases enable row level security;
alter table public.guild_beasts enable row level security;
alter table public.guild_beast_members enable row level security;
alter table public.guild_beast_attempts enable row level security;

create policy guilds_read on public.guilds for select to authenticated using (true);
create policy guild_members_read on public.guild_members for select to authenticated using (true);
create policy guild_goals_read on public.guild_goals for select to authenticated using (true);
create policy guild_phrases_read on public.guild_phrases for select to authenticated using (
  exists (select 1 from public.guild_members m where m.guild_id = guild_phrases.guild_id and m.user_id = auth.uid())
);

revoke insert, update, delete on public.guilds from public, anon, authenticated;
revoke insert, update, delete on public.guild_members from public, anon, authenticated;
revoke insert, update, delete on public.guild_requests from public, anon, authenticated;
revoke insert, update, delete on public.guild_goals from public, anon, authenticated;
revoke insert, update, delete on public.guild_phrases from public, anon, authenticated;
revoke insert, update, delete on public.guild_beasts from public, anon, authenticated;
revoke insert, update, delete on public.guild_beast_members from public, anon, authenticated;
revoke insert, update, delete on public.guild_beast_attempts from public, anon, authenticated;

create or replace function public.guild_act(p_user uuid, p_body jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  action text := coalesce(p_body->>'action', '');
  gid uuid;
  role text;
  mode text;
  members integer;
  heir uuid;
  phrase text;
  goal text;
  target integer;
  chest_now integer;
  gold_now integer;
  arena_now integer;
  beast_level integer;
  week_key timestamptz := public.board_week(now());
begin
  if action = 'found' then
    if exists (select 1 from public.guild_members where user_id = p_user) then
      return jsonb_build_object('error', 'member');
    end if;
    insert into public.guilds (name, tag, description, shape, symbol, color, join_mode, code)
    values (
      p_body->>'name',
      upper(p_body->>'tag'),
      coalesce(p_body->>'description', ''),
      coalesce(p_body->>'shape', 'shield'),
      coalesce(p_body->>'symbol', 'leaf'),
      coalesce(p_body->>'color', 'moss'),
      coalesce(p_body->>'join', 'request'),
      p_body->>'code'
    )
    returning id into gid;
    insert into public.guild_members (guild_id, user_id, role) values (gid, p_user, 'lead');
    return jsonb_build_object('ok', true, 'guild', gid);
  end if;

  select guild_id, guild_members.role into gid, role from public.guild_members where user_id = p_user;

  if action = 'join' then
    if gid is not null then return jsonb_build_object('error', 'member'); end if;
    select id, join_mode into gid, mode from public.guilds
      where (p_body->>'code' <> '' and code = p_body->>'code')
         or (p_body->>'name' <> '' and name = p_body->>'name')
      limit 1;
    if gid is null then return jsonb_build_object('error', 'missing'); end if;
    select count(*) into members from public.guild_members where guild_id = gid;
    if members >= 20 then return jsonb_build_object('error', 'full'); end if;
    if mode = 'request' and coalesce(p_body->>'code', '') = '' then
      insert into public.guild_requests (guild_id, user_id) values (gid, p_user) on conflict do nothing;
      return jsonb_build_object('ok', true, 'requested', true);
    end if;
    if mode = 'code' and p_body->>'code' = '' then
      return jsonb_build_object('error', 'code');
    end if;
    insert into public.guild_members (guild_id, user_id, role) values (gid, p_user, 'member');
    delete from public.guild_requests where guild_id = gid and user_id = p_user;
    return jsonb_build_object('ok', true);
  end if;

  if gid is null then return jsonb_build_object('error', 'missing'); end if;

  if action = 'accept' then
    if role not in ('lead', 'deputy') then return jsonb_build_object('error', 'role'); end if;
    select count(*) into members from public.guild_members where guild_id = gid;
    if members >= 20 then return jsonb_build_object('error', 'full'); end if;
    insert into public.guild_members (guild_id, user_id, role)
    select gid, user_id, 'member' from public.guild_requests
      where guild_id = gid and user_id = (p_body->>'target')::uuid;
    delete from public.guild_requests where guild_id = gid and user_id = (p_body->>'target')::uuid;
    return jsonb_build_object('ok', true);
  end if;

  if action = 'kick' then
    if role <> 'lead' then return jsonb_build_object('error', 'role'); end if;
    delete from public.guild_members where guild_id = gid and user_id = (p_body->>'target')::uuid and role <> 'lead';
    return jsonb_build_object('ok', true);
  end if;

  if action = 'role' then
    if role <> 'lead' then return jsonb_build_object('error', 'role'); end if;
    update public.guild_members set role = 'member' where guild_id = gid and role = 'deputy';
    update public.guild_members set role = 'deputy'
      where guild_id = gid and user_id = (p_body->>'target')::uuid and role = 'member';
    return jsonb_build_object('ok', true);
  end if;

  if action = 'leave' then
    if role = 'lead' then
      select user_id into heir from public.guild_members
        where guild_id = gid and user_id <> p_user and role = 'deputy'
        order by joined_at limit 1;
      if heir is null then
        select user_id into heir from public.guild_members
          where guild_id = gid and user_id <> p_user
          order by joined_at, user_id limit 1;
      end if;
      if heir is null then
        delete from public.guilds where id = gid;
        return jsonb_build_object('ok', true, 'closed', true);
      end if;
      update public.guild_members set role = 'lead' where guild_id = gid and user_id = heir;
    end if;
    delete from public.guild_members where guild_id = gid and user_id = p_user;
    return jsonb_build_object('ok', true, 'heir', heir);
  end if;

  if action = 'phrase' then
    phrase := p_body->>'phrase';
    if phrase not in (
      'hallo', 'danke', 'los', 'pause', 'stark', 'hilfe', 'geschafft', 'nochmal',
      'truhe', 'arena', 'biest', 'expedition', 'heute', 'morgen', 'bereit', 'warte',
      'gut', 'knapp', 'feier', 'ruhe', 'fokus', 'team', 'wappen', 'nacht',
      'welle', 'stern', 'blatt', 'flamme', 'ja', 'nein'
    ) then
      return jsonb_build_object('error', 'phrase');
    end if;
    insert into public.guild_phrases (guild_id, user_id, phrase) values (gid, p_user, phrase);
    return jsonb_build_object('ok', true);
  end if;

  if action = 'emblem' then
    if role <> 'lead' then return jsonb_build_object('error', 'role'); end if;
    update public.guilds set
      shape = coalesce(p_body->>'shape', shape),
      symbol = coalesce(p_body->>'symbol', symbol),
      color = coalesce(p_body->>'color', color),
      description = coalesce(p_body->>'description', description),
      join_mode = coalesce(p_body->>'join', join_mode)
    where id = gid;
    return jsonb_build_object('ok', true);
  end if;

  if action = 'sync' then
    select coalesce((save_json->'stats'->>'chestsOpened')::int, 0),
           coalesce((save_json->'expeditions'->>'goldDone')::int, 0)
      into chest_now, gold_now
    from public.saves where user_id = p_user;
    select count(*) into arena_now from public.arena_logs
      where attacker = p_user and attacker_win and at >= week_key;
    select level into beast_level from public.guild_beasts where guild_id = gid and week = week_key;
    perform 1 from public.guild_goals where guild_id = gid and week = week_key;
    if not found then
      foreach goal in array array['chests', 'arena', 'expedition'] loop
        target := case goal when 'chests' then 300 when 'arena' then 30 else 50 end;
        insert into public.guild_goals (guild_id, week, goal, target) values (gid, week_key, goal, target)
        on conflict do nothing;
      end loop;
      insert into public.guild_goals (guild_id, week, goal, target)
      values (gid, week_key, 'beast', 6)
      on conflict do nothing;
      delete from public.guild_goals
      where guild_id = gid and week = week_key
        and goal not in (
          select value from jsonb_array_elements_text(coalesce(p_body->'goals', '["chests","arena","beast"]'::jsonb))
        );
    end if;
    update public.guild_goals g set progress = least(g.target, g.progress + deltas.delta)
    from (
      select 'chests'::text as goal, greatest(0, coalesce(chest_now, 0) - m.chest_mark) as delta
      from public.guild_members m where m.guild_id = gid and m.user_id = p_user
      union all
      select 'expedition', greatest(0, coalesce(gold_now, 0) - m.expedition_mark)
      from public.guild_members m where m.guild_id = gid and m.user_id = p_user
    ) deltas
    where g.guild_id = gid and g.week = week_key and g.goal = deltas.goal;
    update public.guild_goals set progress = least(target, coalesce(arena_now, 0))
      where guild_id = gid and week = week_key and goal = 'arena';
    update public.guild_goals set progress = least(target, coalesce(beast_level, 0))
      where guild_id = gid and week = week_key and goal = 'beast';
    update public.guild_members m set
      contrib = case when m.contrib_week = week_key then m.contrib else 0 end
        + greatest(0, coalesce(chest_now, 0) - m.chest_mark)
        + greatest(0, coalesce(gold_now, 0) - m.expedition_mark)
        + case when coalesce(arena_now, 0) > 0 or coalesce(beast_level, 0) > 0 then 1 else 0 end,
      chest_mark = greatest(m.chest_mark, coalesce(chest_now, 0)),
      expedition_mark = greatest(m.expedition_mark, coalesce(gold_now, 0)),
      contrib_week = week_key
    where m.guild_id = gid and m.user_id = p_user;
    update public.guilds g set
      points = g.points + greatest(0, fresh.points - case when g.week = week_key then g.week_points else 0 end),
      week_points = fresh.points,
      week = week_key
    from (
      select coalesce(sum(100), 0) as points from public.guild_goals
      where guild_id = gid and week = week_key and progress >= target
    ) fresh
    where g.id = gid;
    return jsonb_build_object('ok', true);
  end if;

  if action = 'beast' then
    if (select count(*) from public.guild_beast_members where guild_id = gid and week = week_key) >= 20
       and not exists (
         select 1 from public.guild_beast_members
         where guild_id = gid and week = week_key and user_id = p_user
       ) then
      return jsonb_build_object('error', 'full');
    end if;
    insert into public.guild_beast_members (guild_id, week, user_id) values (gid, week_key, p_user)
    on conflict do nothing;
    insert into public.guild_beasts (guild_id, week, level, hp)
    values (gid, week_key, 1, 5060000)
    on conflict do nothing;
    return jsonb_build_object('ok', true, 'hp', 5060000);
  end if;

  return jsonb_build_object('error', 'missing');
end;
$$;

revoke all on function public.guild_act(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.guild_act(uuid, jsonb) to service_role;

create materialized view public.guild_ranks as
select public.board_week(now()) as week,
       g.id as guild_id,
       g.name,
       g.tag,
       g.week_points as points,
       row_number() over (order by g.week_points desc, g.name) as place
from public.guilds g
where g.week = public.board_week(now())
with no data;

create unique index guild_ranks_key on public.guild_ranks (week, guild_id);
refresh materialized view public.guild_ranks;
revoke all on public.guild_ranks from public, anon, authenticated;

create or replace function public.guild_board()
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
    return jsonb_build_object('status', 'offline');
  end if;
  select jsonb_build_object(
    'status', 'ready',
    'board', 'guild',
    'top', coalesce((
      select jsonb_agg(jsonb_build_object(
        'place', r.place,
        'label', r.name || ' · ' || r.tag,
        'score', r.points,
        'detail', '{}'::jsonb,
        'self', exists (
          select 1 from public.guild_members m
          where m.guild_id = r.guild_id and m.user_id = uid
        )
      ) order by r.place)
      from public.guild_ranks r
      where r.place <= 100
    ), '[]'::jsonb),
    'around', '[]'::jsonb,
    'honors', '[]'::jsonb
  ) into body;
  return body;
end;
$$;

revoke all on function public.guild_board() from public, anon;
grant execute on function public.guild_board() to authenticated;

do $$
declare
  job bigint;
begin
  select jobid into job from cron.job where jobname = 'velunor-refresh-ranks';
  if job is not null then
    perform cron.unschedule(job);
  end if;
end $$;

select cron.schedule(
  'velunor-refresh-ranks',
  '*/10 * * * *',
  $$refresh materialized view concurrently public.leaderboard_rows; refresh materialized view concurrently public.guild_ranks$$
);
