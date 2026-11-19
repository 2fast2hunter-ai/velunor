-- First uploads used to become the baseline with no check.
-- Flag an existing snapshot that could not have been earned since the account was created.
-- Rows are kept. Flag 2 already drops them from the boards and from the guild and arena crest gates.

create or replace function public.audit_implausible(audit jsonb, age_ms double precision)
returns boolean
language plpgsql
immutable
as $$
declare
  age double precision := greatest(0, coalesce(age_ms, 0));
  badges integer := 0;
  gold bigint := 0;
  ep bigint := 0;
  region integer := 1;
  chapter integer := 1;
  level integer;
  encounters integer;
  crest_allowed integer;
  gold_allowed bigint;
  ep_allowed bigint;
begin
  if audit is null or jsonb_typeof(audit) <> 'object' then
    return false;
  end if;
  if jsonb_typeof(audit->'badges') = 'array' then
    select count(distinct badge.value)::integer into badges
    from jsonb_array_elements_text(audit->'badges') as badge
    where badge.value <> '';
  end if;
  crest_allowed := least(45, floor(age / 180000)::integer);
  if badges > crest_allowed then
    return true;
  end if;
  if coalesce(audit->>'gold', '') ~ '^[0-9]+$' then
    gold := greatest(0, (audit->>'gold')::bigint - 3000);
  end if;
  if coalesce(audit->>'ep', '') ~ '^[0-9]+$' then
    ep := greatest(0, (audit->>'ep')::bigint);
  end if;
  if coalesce(audit->>'region', '') ~ '^[0-9]+$' then
    region := greatest(1, (audit->>'region')::integer);
  end if;
  if coalesce(audit->>'chapter', '') ~ '^[0-9]+$' then
    chapter := greatest(1, (audit->>'chapter')::integer);
  end if;
  level := 6 * greatest(1, (region - 1) * 8 + chapter);
  encounters := greatest(1, ceil(age / 930.0)::integer);
  -- Same ceiling as allowedGold / allowedEp, at the highest tree multiplier, then the flag-2 doubling.
  gold_allowed := ceil((encounters * (25.0 * 3 * level * 1.25) + (1000 + 750.0 * level) * 1.25) * 1.2 * 1.43);
  ep_allowed := ceil(encounters * (8.0 * level * (1 + 0.15 * 9)) * 6.25 * 1.2 * 1.3);
  if gold > gold_allowed * 2 or ep > ep_allowed * 2 then
    return true;
  end if;
  return false;
end;
$$;

revoke all on function public.audit_implausible(jsonb, double precision) from public, anon, authenticated;

update public.profiles p
set flag_level = 2
from auth.users u
where u.id = p.user_id
  and p.flag_level < 2
  and p.last_audit is not null
  and public.audit_implausible(
    p.last_audit,
    extract(epoch from (coalesce(p.audited_at, p.updated_at, now()) - u.created_at)) * 1000
  );

refresh materialized view public.leaderboard_rows;
refresh materialized view public.guild_ranks;
