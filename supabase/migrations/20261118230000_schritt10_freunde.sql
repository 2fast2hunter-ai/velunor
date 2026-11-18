-- Step 10. Friends, daily gifts, and the weekly co-op beast.
-- Writes go through these functions with the service role.
-- A client may only read its own rows. Deploy this migration before the function bundles.

alter table public.profiles
  add column if not exists bonus_gold integer not null default 0;

comment on column public.profiles.bonus_gold is
  'Gold the server granted as gifts and co-op rewards. sync-check allows only the increase since the last baseline.';

create table if not exists public.friend_codes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null unique check (code ~ '^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$')
);

create table if not exists public.friend_requests (
  sender uuid not null references auth.users (id) on delete cascade,
  recipient uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  primary key (sender, recipient),
  check (sender <> recipient)
);

create table if not exists public.friendships (
  user_a uuid not null references auth.users (id) on delete cascade,
  user_b uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_a, user_b),
  check (user_a < user_b)
);

create index if not exists friendships_user_b on public.friendships (user_b);

create table if not exists public.friend_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  show_online boolean not null default true,
  favorite text not null default '',
  last_seen timestamptz not null default now()
);

create table if not exists public.friend_gifts (
  sender uuid not null references auth.users (id) on delete cascade,
  recipient uuid not null references auth.users (id) on delete cascade,
  day_key text not null,
  gold integer not null check (gold > 0),
  claimed boolean not null default false,
  primary key (sender, recipient, day_key),
  check (sender <> recipient)
);

create index if not exists friend_gifts_inbox on public.friend_gifts (recipient, day_key);

create table if not exists public.coop_groups (
  id uuid primary key default gen_random_uuid(),
  week timestamptz not null,
  beast text not null check (beast in ('weltenwurm', 'himmelswal')),
  host uuid not null references auth.users (id) on delete cascade,
  level integer not null default 1 check (level between 1 and 10),
  hp bigint not null check (hp >= 0),
  guild_id uuid
);

comment on column public.coop_groups.guild_id is
  'Reserved for a later guild. Unused in step 10.';

create table if not exists public.coop_members (
  user_id uuid not null references auth.users (id) on delete cascade,
  week timestamptz not null,
  group_id uuid not null references public.coop_groups (id) on delete cascade,
  primary key (user_id, week)
);

create index if not exists coop_members_group on public.coop_members (group_id);

create table if not exists public.coop_attempts (
  group_id uuid not null references public.coop_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  day_key text not null,
  n smallint not null check (n between 1 and 3),
  damage bigint not null check (damage >= 0),
  seed bigint not null,
  primary key (group_id, user_id, day_key, n)
);

create table if not exists public.coop_rewards (
  group_id uuid not null references public.coop_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  level integer not null check (level between 1 and 10),
  gold integer not null,
  fruit integer not null,
  marks integer not null,
  egg text not null default '',
  claimed boolean not null default false,
  primary key (group_id, user_id, level)
);

alter table public.friend_codes enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;
alter table public.friend_settings enable row level security;
alter table public.friend_gifts enable row level security;
alter table public.coop_groups enable row level security;
alter table public.coop_members enable row level security;
alter table public.coop_attempts enable row level security;
alter table public.coop_rewards enable row level security;

create policy friend_codes_own on public.friend_codes
  for select using (user_id = auth.uid());

create policy friend_requests_own on public.friend_requests
  for select using (sender = auth.uid() or recipient = auth.uid());

create policy friendships_own on public.friendships
  for select using (user_a = auth.uid() or user_b = auth.uid());

create policy friend_settings_own on public.friend_settings
  for select using (user_id = auth.uid());

create policy friend_gifts_own on public.friend_gifts
  for select using (sender = auth.uid() or recipient = auth.uid());

create policy coop_groups_own on public.coop_groups
  for select using (exists (
    select 1 from public.coop_members m
    where m.group_id = coop_groups.id and m.user_id = auth.uid()
  ));

create policy coop_members_own on public.coop_members
  for select using (user_id = auth.uid());

create policy coop_attempts_own on public.coop_attempts
  for select using (user_id = auth.uid());

create policy coop_rewards_own on public.coop_rewards
  for select using (user_id = auth.uid());

create or replace function public.friend_ask(p_sender uuid, p_recipient uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n_from int;
  n_to int;
  sent int;
  a uuid;
  b uuid;
  existing text;
begin
  if p_sender is null or p_recipient is null or p_sender = p_recipient then
    return jsonb_build_object('error', 'self');
  end if;
  perform pg_advisory_xact_lock(hashtext(least(p_sender, p_recipient)::text), hashtext(greatest(p_sender, p_recipient)::text));
  a := least(p_sender, p_recipient);
  b := greatest(p_sender, p_recipient);
  if exists (select 1 from public.friendships where user_a = a and user_b = b) then
    return jsonb_build_object('error', 'friends');
  end if;
  select status into existing from public.friend_requests where sender = p_sender and recipient = p_recipient;
  if existing = 'pending' then
    return jsonb_build_object('error', 'pending');
  end if;
  select count(*) into sent from public.friend_requests
    where sender = p_sender and created_at >= public.arena_reset(now()) and status = 'pending';
  if sent >= 20 then
    return jsonb_build_object('error', 'rate');
  end if;
  select count(*) into n_from from public.friendships where user_a = p_sender or user_b = p_sender;
  select count(*) into n_to from public.friendships where user_a = p_recipient or user_b = p_recipient;
  if n_from >= 50 or n_to >= 50 then
    return jsonb_build_object('error', 'full');
  end if;
  insert into public.friend_requests (sender, recipient, status)
  values (p_sender, p_recipient, 'pending')
  on conflict (sender, recipient) do update set status = 'pending', created_at = now();
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.friend_answer(p_user uuid, p_other uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n_from int;
  n_to int;
  a uuid;
  b uuid;
begin
  if p_user is null or p_other is null or p_user = p_other then
    return jsonb_build_object('error', 'self');
  end if;
  perform pg_advisory_xact_lock(hashtext(least(p_user, p_other)::text), hashtext(greatest(p_user, p_other)::text));
  if not p_accept then
    update public.friend_requests set status = 'declined'
      where sender = p_other and recipient = p_user and status = 'pending';
    return jsonb_build_object('ok', true);
  end if;
  if not exists (
    select 1 from public.friend_requests
    where sender = p_other and recipient = p_user and status = 'pending'
  ) then
    return jsonb_build_object('error', 'pending');
  end if;
  select count(*) into n_from from public.friendships where user_a = p_user or user_b = p_user;
  select count(*) into n_to from public.friendships where user_a = p_other or user_b = p_other;
  if n_from >= 50 or n_to >= 50 then
    return jsonb_build_object('error', 'full');
  end if;
  a := least(p_user, p_other);
  b := greatest(p_user, p_other);
  insert into public.friendships (user_a, user_b) values (a, b) on conflict do nothing;
  update public.friend_requests set status = 'accepted'
    where sender = p_other and recipient = p_user;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.friend_remove(p_user uuid, p_other uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.friendships
    where user_a = least(p_user, p_other) and user_b = greatest(p_user, p_other);
  delete from public.friend_requests
    where (sender = p_user and recipient = p_other) or (sender = p_other and recipient = p_user);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.friend_send_gift(p_sender uuid, p_recipient uuid, p_day text, p_gold integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
  a uuid;
  b uuid;
begin
  if p_sender = p_recipient or p_gold <= 0 or p_day = '' then
    return jsonb_build_object('error', 'strangers');
  end if;
  perform pg_advisory_xact_lock(hashtext('gift'), hashtext(p_recipient::text));
  a := least(p_sender, p_recipient);
  b := greatest(p_sender, p_recipient);
  if not exists (select 1 from public.friendships where user_a = a and user_b = b) then
    return jsonb_build_object('error', 'strangers');
  end if;
  if exists (
    select 1 from public.friend_gifts
    where sender = p_sender and recipient = p_recipient and day_key = p_day
  ) then
    return jsonb_build_object('error', 'sent');
  end if;
  select count(*) into n from public.friend_gifts where recipient = p_recipient and day_key = p_day;
  if n >= 20 then
    return jsonb_build_object('error', 'cap');
  end if;
  insert into public.friend_gifts (sender, recipient, day_key, gold)
  values (p_sender, p_recipient, p_day, p_gold);
  return jsonb_build_object('ok', true, 'gold', p_gold);
end;
$$;

create or replace function public.friend_claim(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  total int;
begin
  insert into public.profiles (user_id) values (p_user) on conflict do nothing;
  with taken as (
    update public.friend_gifts set claimed = true
    where recipient = p_user and claimed = false
    returning gold
  )
  select coalesce(sum(gold), 0) into total from taken;
  update public.profiles set bonus_gold = bonus_gold + total where user_id = p_user;
  return jsonb_build_object('gold', total);
end;
$$;

create or replace function public.coop_pool(p_level integer)
returns bigint
language sql
immutable
as $$
  select case p_level
    when 1 then 1012000
    when 2 then 2023000
    when 3 then 3035000
    when 4 then 4046000
    when 5 then 5058000
    when 6 then 6070000
    when 7 then 8093000
    when 8 then 10116000
    when 9 then 13151000
    else 17197000
  end::bigint
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
    beast_id := case
      when floor(extract(epoch from week_key) / (7 * 24 * 3600))::bigint % 2 = 0 then 'weltenwurm'
      else 'himmelswal'
    end;
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

create or replace function public.coop_join(p_host uuid, p_friend uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  week_key timestamptz;
  host_group uuid;
  old_group uuid;
  n int;
  lvl int;
  hp_left bigint;
begin
  if p_host = p_friend then
    return jsonb_build_object('error', 'self');
  end if;
  week_key := public.board_week(now());
  if not exists (
    select 1 from public.friendships
    where user_a = least(p_host, p_friend) and user_b = greatest(p_host, p_friend)
  ) then
    return jsonb_build_object('error', 'strangers');
  end if;
  select group_id into host_group from public.coop_members where user_id = p_host and week = week_key;
  if host_group is null then
    return jsonb_build_object('error', 'group');
  end if;
  perform 1 from public.coop_groups where id = host_group for update;
  select count(*) into n from public.coop_members where group_id = host_group;
  if n >= 4 then
    return jsonb_build_object('error', 'full');
  end if;
  select group_id into old_group from public.coop_members where user_id = p_friend and week = week_key;
  if old_group = host_group then
    return jsonb_build_object('ok', true);
  end if;
  if old_group is not null then
    select level, hp into lvl, hp_left from public.coop_groups where id = old_group for update;
    if lvl <> 1 or hp_left <> public.coop_pool(1) or exists (
      select 1 from public.coop_attempts where group_id = old_group
    ) then
      return jsonb_build_object('error', 'busy');
    end if;
    delete from public.coop_members where user_id = p_friend and week = week_key;
    delete from public.coop_groups where id = old_group;
  end if;
  insert into public.coop_members (user_id, week, group_id) values (p_friend, week_key, host_group);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.coop_strike(p_user uuid, p_day text, p_damage bigint, p_seed bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  week_key timestamptz;
  gid uuid;
  lvl int;
  hp_left bigint;
  beast_id text;
  egg_species text;
  used int;
  left_dmg bigint;
  pool bigint;
  cleared int[] := '{}';
begin
  if p_damage < 0 then
    return jsonb_build_object('error', 'damage');
  end if;
  week_key := public.board_week(now());
  select group_id into gid from public.coop_members where user_id = p_user and week = week_key;
  if gid is null then
    return jsonb_build_object('error', 'group');
  end if;
  select level, hp, beast into lvl, hp_left, beast_id from public.coop_groups where id = gid for update;
  if lvl >= 10 and hp_left <= 0 then
    return jsonb_build_object('error', 'clear');
  end if;
  select count(*) into used from public.coop_attempts
    where group_id = gid and user_id = p_user and day_key = p_day;
  if used >= 3 then
    return jsonb_build_object('error', 'attempts');
  end if;
  insert into public.coop_attempts (group_id, user_id, day_key, n, damage, seed)
  values (gid, p_user, p_day, used + 1, p_damage, p_seed);
  left_dmg := p_damage;
  while left_dmg > 0 and lvl <= 10 loop
    pool := case when hp_left > 0 then hp_left else public.coop_pool(lvl) end;
    if left_dmg < pool then
      hp_left := pool - left_dmg;
      left_dmg := 0;
    else
      left_dmg := left_dmg - pool;
      cleared := cleared || lvl;
      lvl := lvl + 1;
      hp_left := case when lvl <= 10 then public.coop_pool(lvl) else 0 end;
    end if;
  end loop;
  if lvl > 10 then
    lvl := 10;
    hp_left := 0;
  end if;
  update public.coop_groups set level = lvl, hp = hp_left where id = gid;
  egg_species := case beast_id when 'himmelswal' then 'm24' else 'm18' end;
  insert into public.coop_rewards (group_id, user_id, level, gold, fruit, marks, egg)
  select gid, m.user_id, reward.level, 1000 * reward.level, 1, 2 * reward.level,
    case
      when reward.level >= 5 and abs(hashtext(gid::text || ':' || reward.level::text)) % 100 < 2 then egg_species
      else ''
    end
  from public.coop_members m
  cross join unnest(cleared) as reward(level)
  where m.group_id = gid
  on conflict do nothing;
  return jsonb_build_object(
    'ok', true,
    'level', lvl,
    'hp', hp_left,
    'hp_max', public.coop_pool(lvl),
    'attempts', used + 1,
    'damage', p_damage,
    'cleared', to_jsonb(cleared)
  );
end;
$$;

create or replace function public.coop_claim(p_user uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  total_gold int;
  total_fruit int;
  total_marks int;
  eggs jsonb;
begin
  insert into public.profiles (user_id) values (p_user) on conflict do nothing;
  with taken as (
    update public.coop_rewards set claimed = true
    where user_id = p_user and claimed = false
    returning gold, fruit, marks, egg
  )
  select coalesce(sum(gold), 0), coalesce(sum(fruit), 0), coalesce(sum(marks), 0),
         coalesce(jsonb_agg(egg) filter (where egg <> ''), '[]'::jsonb)
    into total_gold, total_fruit, total_marks, eggs
  from taken;
  update public.profiles set bonus_gold = bonus_gold + total_gold where user_id = p_user;
  return jsonb_build_object('gold', total_gold, 'fruit', total_fruit, 'marks', total_marks, 'eggs', eggs);
end;
$$;

revoke all on function public.friend_ask(uuid, uuid) from public, anon, authenticated;
revoke all on function public.friend_answer(uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.friend_remove(uuid, uuid) from public, anon, authenticated;
revoke all on function public.friend_send_gift(uuid, uuid, text, integer) from public, anon, authenticated;
revoke all on function public.friend_claim(uuid) from public, anon, authenticated;
revoke all on function public.coop_ensure(uuid, text) from public, anon, authenticated;
revoke all on function public.coop_join(uuid, uuid) from public, anon, authenticated;
revoke all on function public.coop_strike(uuid, text, bigint, bigint) from public, anon, authenticated;
revoke all on function public.coop_claim(uuid) from public, anon, authenticated;
grant execute on function public.friend_ask(uuid, uuid) to service_role;
grant execute on function public.friend_answer(uuid, uuid, boolean) to service_role;
grant execute on function public.friend_remove(uuid, uuid) to service_role;
grant execute on function public.friend_send_gift(uuid, uuid, text, integer) to service_role;
grant execute on function public.friend_claim(uuid) to service_role;
grant execute on function public.coop_ensure(uuid, text) to service_role;
grant execute on function public.coop_join(uuid, uuid) to service_role;
grant execute on function public.coop_strike(uuid, text, bigint, bigint) to service_role;
grant execute on function public.coop_claim(uuid) to service_role;

drop function if exists public.leaderboard_page(text);

create or replace function public.leaderboard_page(p_board text, p_friends boolean default false)
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
      and (
        not coalesce(p_friends, false)
        or r.user_id = uid
        or exists (
          select 1 from public.friendships f
          where (f.user_a = uid and f.user_b = r.user_id)
             or (f.user_b = uid and f.user_a = r.user_id)
        )
      )
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
    'friends', coalesce(p_friends, false),
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

revoke all on function public.leaderboard_page(text, boolean) from public, anon;
grant execute on function public.leaderboard_page(text, boolean) to authenticated;
