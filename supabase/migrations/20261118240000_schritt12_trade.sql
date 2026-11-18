-- Step 12. Monster trades. Offers are mutable. Completed trades are not.
-- Deploy this migration before the trade function bundle.

alter table public.profiles
  add column if not exists trade_banned boolean not null default false;

create table if not exists public.trade_offers (
  id uuid primary key default gen_random_uuid(),
  host uuid not null references auth.users (id) on delete cascade,
  guest uuid not null references auth.users (id) on delete cascade,
  host_uid text not null,
  guest_uid text not null,
  status text not null default 'offered' check (status in ('offered', 'countered', 'locked', 'done', 'cancelled')),
  lock_at timestamptz,
  host_confirm timestamptz,
  guest_confirm timestamptz,
  created_at timestamptz not null default now(),
  check (host <> guest)
);

create unique index if not exists trade_offers_host_open
  on public.trade_offers (host, host_uid)
  where status in ('offered', 'countered', 'locked');

create unique index if not exists trade_offers_guest_open
  on public.trade_offers (guest, guest_uid)
  where status in ('offered', 'countered', 'locked');

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null unique,
  host uuid not null,
  guest uuid not null,
  host_species text not null,
  guest_species text not null,
  host_rarity integer not null,
  guest_rarity integer not null,
  host_shiny boolean not null,
  guest_shiny boolean not null,
  host_level integer not null,
  guest_level integer not null,
  one_way boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.trades_frozen()
returns trigger
language plpgsql
as $$
begin
  raise exception 'trades are immutable';
end;
$$;

drop trigger if exists trades_no_change on public.trades;
create trigger trades_no_change
  before update or delete on public.trades
  for each row execute function public.trades_frozen();

alter table public.trade_offers enable row level security;
alter table public.trades enable row level security;

drop policy if exists trade_offers_own on public.trade_offers;
create policy trade_offers_own on public.trade_offers
  for select using (host = auth.uid() or guest = auth.uid());

drop policy if exists trades_own on public.trades;
create policy trades_own on public.trades
  for select using (host = auth.uid() or guest = auth.uid());

revoke insert, update, delete on public.trade_offers from public, anon, authenticated;
revoke insert, update, delete on public.trades from public, anon, authenticated;

create or replace function public.trade_team_max(p_user uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(max((mon.value->>'lvl')::int), 1)
  from public.saves s
  cross join lateral jsonb_each(coalesce(s.save_json->'mons', '{}'::jsonb)) as mon
  where s.user_id = p_user
    and mon.key in (
      select jsonb_array_elements_text(coalesce(s.save_json->'team', '[]'::jsonb))
    )
$$;

create or replace function public.trade_ready(p_user uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  born timestamptz;
  mail timestamptz;
  flagged smallint;
  banned boolean;
  crests integer;
  today integer;
  week_n integer;
begin
  select created_at, email_confirmed_at into born, mail from auth.users where id = p_user;
  if born is null or born > now() - interval '7 days' then
    return 'age';
  end if;
  if mail is null then
    return 'email';
  end if;
  select flag_level, trade_banned into flagged, banned from public.profiles where user_id = p_user;
  if coalesce(flagged, 0) > 0 or coalesce(banned, false) then
    return 'flag';
  end if;
  select count(*) into crests
  from jsonb_array_elements_text(coalesce((select last_audit->'badges' from public.profiles where user_id = p_user), '[]'::jsonb)) badge
  where badge in (
    'Kieselwappen', 'Wellenwappen', 'Funkenwappen', 'Moorwappen',
    'Felswappen', 'Sturmwappen', 'Frostwappen', 'Klingenwappen'
  );
  if coalesce(crests, 0) < 8 then
    return 'crests';
  end if;
  select count(*) into today from public.trades
    where created_at >= public.arena_reset(now()) and (host = p_user or guest = p_user);
  if today >= 3 then
    return 'day';
  end if;
  select count(*) into week_n from public.trades
    where created_at >= public.board_week(now()) and (host = p_user or guest = p_user);
  if week_n >= 10 then
    return 'week';
  end if;
  return 'ok';
end;
$$;

create or replace function public.trade_act(
  p_user uuid,
  p_action text,
  p_offer uuid,
  p_other uuid,
  p_mine text,
  p_theirs text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  offer public.trade_offers%rowtype;
  mine public.monsters_owned%rowtype;
  theirs public.monsters_owned%rowtype;
  friend_at timestamptz;
  mine_level integer;
  their_level integer;
  mine_uid text;
  their_uid text;
  one_way boolean := false;
  receiver uuid;
  giver uuid;
  prior integer;
begin
  if p_action = 'cancel' then
    update public.trade_offers
      set status = 'cancelled'
      where id = p_offer and status in ('offered', 'countered', 'locked')
        and (host = p_user or guest = p_user);
    return jsonb_build_object('ok', true);
  end if;

  if p_action = 'open' then
    select created_at into friend_at from public.friendships
      where user_a = least(p_user, p_other) and user_b = greatest(p_user, p_other);
    if friend_at is null or friend_at > now() - interval '48 hours' then
      return jsonb_build_object('error', 'friend');
    end if;
    if public.trade_ready(p_user) <> 'ok' then
      return jsonb_build_object('error', public.trade_ready(p_user));
    end if;
    if public.trade_ready(p_other) <> 'ok' then
      return jsonb_build_object('error', public.trade_ready(p_other));
    end if;
    insert into public.trade_offers (host, guest, host_uid, guest_uid)
    values (p_user, p_other, p_mine, p_theirs)
    returning * into offer;
    return jsonb_build_object('ok', true, 'offer', offer.id);
  end if;

  select * into offer from public.trade_offers where id = p_offer for update;
  if not found then
    return jsonb_build_object('error', 'missing');
  end if;
  if offer.status = 'done' then
    return jsonb_build_object('ok', true, 'done', true, 'offer', offer.id);
  end if;
  if p_user <> offer.host and p_user <> offer.guest then
    return jsonb_build_object('error', 'missing');
  end if;

  if p_action = 'counter' then
    if offer.status not in ('offered', 'countered') then
      return jsonb_build_object('error', 'missing');
    end if;
    if p_user = offer.guest then
      update public.trade_offers
        set guest_uid = p_mine, status = 'countered', lock_at = null, host_confirm = null, guest_confirm = null
        where id = offer.id;
    else
      update public.trade_offers
        set host_uid = p_mine, status = 'countered', lock_at = null, host_confirm = null, guest_confirm = null
        where id = offer.id;
    end if;
    return jsonb_build_object('ok', true, 'offer', offer.id);
  end if;

  if p_action = 'lock' then
    if offer.status = 'locked' then
      return jsonb_build_object('ok', true, 'offer', offer.id, 'lock_at', offer.lock_at);
    end if;
    update public.trade_offers set status = 'locked', lock_at = now() where id = offer.id;
    return jsonb_build_object('ok', true, 'offer', offer.id);
  end if;

  if p_action <> 'confirm' then
    return jsonb_build_object('error', 'missing');
  end if;
  if offer.status <> 'locked' or offer.lock_at is null or offer.lock_at > now() - interval '5 seconds' then
    return jsonb_build_object('error', 'wait');
  end if;
  if p_user = offer.host then
    update public.trade_offers set host_confirm = coalesce(host_confirm, now()) where id = offer.id;
  else
    update public.trade_offers set guest_confirm = coalesce(guest_confirm, now()) where id = offer.id;
  end if;
  select * into offer from public.trade_offers where id = offer.id for update;
  if offer.host_confirm is null or offer.guest_confirm is null then
    return jsonb_build_object('ok', true, 'offer', offer.id);
  end if;

  select * into mine from public.monsters_owned
    where owner = offer.host and uid = offer.host_uid for update;
  if not found then
    return jsonb_build_object('error', 'missing');
  end if;
  select * into theirs from public.monsters_owned
    where owner = offer.guest and uid = offer.guest_uid for update;
  if not found then
    return jsonb_build_object('error', 'missing');
  end if;
  if public.trade_ready(offer.host) <> 'ok' then
    return jsonb_build_object('error', public.trade_ready(offer.host));
  end if;
  if public.trade_ready(offer.guest) <> 'ok' then
    return jsonb_build_object('error', public.trade_ready(offer.guest));
  end if;
  if mine.rarity >= 8 or theirs.rarity >= 8 then
    return jsonb_build_object('error', 'rarity');
  end if;
  if mine.schimmer <> theirs.schimmer then
    return jsonb_build_object('error', 'shiny');
  end if;
  if abs(mine.rarity - theirs.rarity) > 1 then
    return jsonb_build_object('error', 'gap');
  end if;
  if mine.trade_count >= 2 or theirs.trade_count >= 2 then
    return jsonb_build_object('error', 'life');
  end if;
  if (mine.rarity = 7 and mine.trade_count >= 1) or (theirs.rarity = 7 and theirs.trade_count >= 1) then
    return jsonb_build_object('error', 'rarity7');
  end if;
  if mine.obtained_how = 'Tausch' and mine.obtained_at > now() - interval '7 days' then
    return jsonb_build_object('error', 'traded');
  end if;
  if theirs.obtained_how = 'Tausch' and theirs.obtained_at > now() - interval '7 days' then
    return jsonb_build_object('error', 'traded');
  end if;
  if mine.obtained_how in ('Truhe', 'Ei', 'Splitter', 'Rad') and mine.obtained_at > now() - interval '7 days' then
    return jsonb_build_object('error', 'fresh');
  end if;
  if theirs.obtained_how in ('Truhe', 'Ei', 'Splitter', 'Rad') and theirs.obtained_at > now() - interval '7 days' then
    return jsonb_build_object('error', 'fresh');
  end if;

  mine_level := least(theirs.level, public.trade_team_max(offer.host) + 5);
  their_level := least(mine.level, public.trade_team_max(offer.guest) + 5);
  mine_level := greatest(mine_level, 1);
  their_level := greatest(their_level, 1);
  mine_uid := 't' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  their_uid := 't' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);

  delete from public.monsters_owned where owner = offer.host and uid = mine.uid;
  delete from public.monsters_owned where owner = offer.guest and uid = theirs.uid;
  insert into public.monsters_owned (uid, owner, species, level, rarity, schimmer, obtained_at, obtained_how, trade_lock_until, trade_count)
  values
    (mine_uid, offer.host, theirs.species, mine_level, theirs.rarity, theirs.schimmer, now(), 'Tausch', now() + interval '7 days', theirs.trade_count + 1),
    (their_uid, offer.guest, mine.species, their_level, mine.rarity, mine.schimmer, now(), 'Tausch', now() + interval '7 days', mine.trade_count + 1);

  one_way := abs(mine.rarity - theirs.rarity) >= 2;
  insert into public.trades (offer_id, host, guest, host_species, guest_species, host_rarity, guest_rarity, host_shiny, guest_shiny, host_level, guest_level, one_way)
  values (offer.id, offer.host, offer.guest, mine.species, theirs.species, mine.rarity, theirs.rarity, mine.schimmer, theirs.schimmer, mine.level, theirs.level, one_way);
  update public.trade_offers set status = 'done' where id = offer.id and status = 'locked';

  if mine.rarity >= theirs.rarity + 2 then
    receiver := offer.guest;
    giver := offer.host;
  elsif theirs.rarity >= mine.rarity + 2 then
    receiver := offer.host;
    giver := offer.guest;
  end if;
  if receiver is not null then
    select count(*) into prior from public.trades
      where created_at >= now() - interval '30 days'
        and ((host = giver and guest = receiver and host_rarity >= guest_rarity + 2)
          or (guest = giver and host = receiver and guest_rarity >= host_rarity + 2));
    if prior > 3 then
      update public.profiles
        set flag_level = greatest(flag_level, 1), trade_banned = true
        where user_id in (offer.host, offer.guest);
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'done', true,
    'offer', offer.id,
    'host_uid', mine_uid,
    'guest_uid', their_uid,
    'host_species', theirs.species,
    'guest_species', mine.species,
    'host_level', mine_level,
    'guest_level', their_level,
    'host_shiny', theirs.schimmer,
    'guest_shiny', mine.schimmer
  );
exception
  when unique_violation then
    return jsonb_build_object('error', 'escrow');
end;
$$;

revoke all on function public.trade_act(uuid, text, uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.trade_act(uuid, text, uuid, uuid, text, text) to service_role;
revoke all on function public.trade_team_max(uuid) from public, anon, authenticated;
grant execute on function public.trade_team_max(uuid) to service_role;
revoke all on function public.trade_ready(uuid) from public, anon, authenticated;
grant execute on function public.trade_ready(uuid) to service_role;


do $$
declare
  job bigint;
begin
  select jobid into job from cron.job where jobname = 'velunor-refresh-ranks';
  if job is not null then
    perform cron.unschedule(job);
  end if;
end $$;

drop materialized view if exists public.leaderboard_rows cascade;

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
  where m.obtained_how in ('Truhe', 'Splitter')
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

select cron.schedule(
  'velunor-refresh-ranks',
  '*/10 * * * *',
  $$refresh materialized view concurrently public.leaderboard_rows$$
);
