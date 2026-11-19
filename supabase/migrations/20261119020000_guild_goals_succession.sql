-- Guild weekly goals, join requests and empty guilds.
-- The old sync built goals with a nested array and then deleted every goal
-- that was not in that list. A failed insert left guild_goals empty.
-- This pass inserts the week's goals and leaves them there.
-- Deleting the last member removes the guild. A lead's row hands the role
-- to the deputy, otherwise to the oldest remaining member.

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

  if action = 'decline' then
    if role not in ('lead', 'deputy') then return jsonb_build_object('error', 'role'); end if;
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
    insert into public.guild_goals (guild_id, week, goal, target)
    select gid, week_key, picked.goal_id,
      case picked.goal_id
        when 'chests' then 300
        when 'arena' then 30
        when 'beast' then 6
        when 'expedition' then 50
      end
    from jsonb_array_elements_text(
      case
        when jsonb_typeof(p_body->'goals') = 'array' and jsonb_array_length(p_body->'goals') > 0 then p_body->'goals'
        else '["chests","arena","beast"]'::jsonb
      end
    ) as picked(goal_id)
    where picked.goal_id in ('chests', 'arena', 'beast', 'expedition')
    on conflict do nothing;
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


create or replace function public.guild_after_member_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  heir uuid;
begin
  if not exists (select 1 from public.guilds where id = old.guild_id) then
    return null;
  end if;
  if not exists (select 1 from public.guild_members where guild_id = old.guild_id) then
    delete from public.guilds where id = old.guild_id;
    return null;
  end if;
  if not exists (
    select 1 from public.guild_members where guild_id = old.guild_id and role = 'lead'
  ) then
    select user_id into heir from public.guild_members
      where guild_id = old.guild_id and role = 'deputy'
      order by joined_at, user_id
      limit 1;
    if heir is null then
      select user_id into heir from public.guild_members
        where guild_id = old.guild_id
        order by joined_at, user_id
        limit 1;
    end if;
    if heir is not null then
      update public.guild_members set role = 'lead'
        where guild_id = old.guild_id and user_id = heir;
    end if;
  end if;
  return null;
end;
$$;

revoke all on function public.guild_after_member_delete() from public, anon, authenticated;

drop trigger if exists guild_member_removed on public.guild_members;
create trigger guild_member_removed
  after delete on public.guild_members
  for each row execute function public.guild_after_member_delete();

delete from public.guilds g
where not exists (
  select 1 from public.guild_members m where m.guild_id = g.id
);
