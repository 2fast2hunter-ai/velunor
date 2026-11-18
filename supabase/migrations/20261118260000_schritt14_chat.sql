-- Step 14. Guild and friend chat, plus the admin report list.
-- Deploy this migration before chat-send and admin-decide.
-- No admin row is inserted. Fabian-Noel adds his own user id later. The statement is in the pull request, not here.

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  channel text not null,
  sender uuid references auth.users (id) on delete set null,
  sender_label text not null,
  body text not null check (char_length(body) <= 200),
  created_at timestamptz not null default now(),
  reported boolean not null default false,
  purge_after timestamptz not null default (now() + interval '30 days')
);

create index if not exists messages_channel on public.messages (channel, created_at);

create table if not exists public.chat_flags (
  user_id uuid primary key references auth.users (id) on delete cascade,
  adult boolean,
  chat_off boolean not null default false,
  pause_until timestamptz,
  ban_until timestamptz
);

comment on column public.chat_flags.adult is
  'True means 13 or older. The birth year is not stored.';

create table if not exists public.chat_mutes (
  owner uuid not null references auth.users (id) on delete cascade,
  target uuid not null references auth.users (id) on delete cascade,
  guild_id uuid,
  until timestamptz not null,
  primary key (owner, target)
);

create table if not exists public.chat_strikes (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_decisions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null,
  admin_id uuid not null,
  decision text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.urgent_alerts (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null,
  created_at timestamptz not null default now(),
  seen boolean not null default false
);

alter table public.reports
  add column if not exists status text not null default 'neu',
  add column if not exists priority text not null default 'niedrig',
  add column if not exists agent_note text not null default '',
  add column if not exists decision text,
  add column if not exists decided_at timestamptz,
  add column if not exists context jsonb,
  add column if not exists message_id uuid;

alter table public.reports drop constraint if exists reports_reason_check;
alter table public.reports add constraint reports_reason_check check (reason in (
  'beleidigend', 'unangemessen', 'betrug', 'sonstiges',
  'beleidigung', 'hass', 'sexuell', 'spam', 'daten', 'minderjaehrig'
));

alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports add constraint reports_status_check check (status in ('neu', 'vorsortiert', 'entschieden'));
alter table public.reports drop constraint if exists reports_priority_check;
alter table public.reports add constraint reports_priority_check check (priority in ('hoch', 'mittel', 'niedrig'));

create or replace function public.triage_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.id is null then
    new.id := gen_random_uuid();
  end if;
  new.status := 'vorsortiert';
  new.priority := case
    when new.reason in ('minderjaehrig', 'sexuell', 'hass') then 'hoch'
    when new.reason in ('beleidigung', 'beleidigend', 'betrug') then 'mittel'
    else 'niedrig'
  end;
  new.agent_note := case
    when new.reason = 'minderjaehrig' then 'Vorschlag: 7tage. Keine Entscheidung.'
    when new.reason in ('sexuell', 'hass') then 'Vorschlag: 24h. Keine Entscheidung.'
    else 'Vorschlag: verwarnen. Keine Entscheidung.'
  end;
  new.decision := null;
  if new.reason = 'minderjaehrig' then
    insert into public.urgent_alerts (report_id) values (new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists reports_triage on public.reports;
create trigger reports_triage
  before insert on public.reports
  for each row execute function public.triage_report();

create or replace function public.reports_guard()
returns trigger
language plpgsql
as $$
begin
  if new.decision is distinct from old.decision and current_setting('velunor.admin', true) is distinct from '1' then
    raise exception 'only admin-decide may set a decision';
  end if;
  return new;
end;
$$;

drop trigger if exists reports_no_client_decision on public.reports;
create trigger reports_no_client_decision
  before update on public.reports
  for each row execute function public.reports_guard();

alter table public.messages enable row level security;
alter table public.chat_flags enable row level security;
alter table public.chat_mutes enable row level security;
alter table public.admins enable row level security;
alter table public.admin_decisions enable row level security;
alter table public.urgent_alerts enable row level security;

create policy messages_read on public.messages
  for select to authenticated using (
    (
      channel like 'guild:%'
      and exists (
        select 1 from public.guild_members m
        where m.user_id = auth.uid()
          and m.guild_id::text = split_part(channel, ':', 2)
      )
    )
    or (
      channel like 'dm:%'
      and auth.uid()::text in (split_part(channel, ':', 2), split_part(channel, ':', 3))
    )
  )
  and not exists (
    select 1 from public.blocks b
    where b.owner = auth.uid() and b.label = messages.sender_label
  )
  and not exists (
    select 1 from public.chat_mutes mute
    where mute.target = messages.sender
      and mute.until > now()
      and (
        (mute.guild_id is null and mute.owner = auth.uid())
        or (mute.guild_id::text = split_part(messages.channel, ':', 2))
      )
  );

create policy chat_flags_own on public.chat_flags
  for select to authenticated using (user_id = auth.uid());

create policy chat_mutes_own on public.chat_mutes
  for select to authenticated using (owner = auth.uid());

create policy admins_self on public.admins
  for select to authenticated using (user_id = auth.uid());

create policy reports_admin on public.reports
  for select to authenticated using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

create policy decisions_admin on public.admin_decisions
  for select to authenticated using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

create policy alerts_admin on public.urgent_alerts
  for select to authenticated using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

revoke insert, update, delete on public.messages from public, anon, authenticated;
revoke insert, update, delete on public.chat_flags from public, anon, authenticated;
revoke insert, update, delete on public.chat_mutes from public, anon, authenticated;
revoke insert, update, delete on public.admins from public, anon, authenticated;
revoke insert, update, delete on public.admin_decisions from public, anon, authenticated;
revoke insert, update, delete on public.urgent_alerts from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
exception
  when undefined_object then
    null;
end $$;

create or replace function public.anonymize_chat(p_user uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.messages
    set sender = null, sender_label = 'gelöschtes Konto'
    where sender = p_user;
$$;

revoke all on function public.anonymize_chat(uuid) from public, anon, authenticated;
grant execute on function public.anonymize_chat(uuid) to service_role;

create or replace function public.admin_apply(p_admin uuid, p_report uuid, p_decision text, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target uuid;
  report_reason text;
begin
  if p_decision not in ('keine', 'verwarnen', '24h', '7tage', 'dauerhaft', 'name') then
    return jsonb_build_object('error', 'decision');
  end if;
  if not exists (select 1 from public.admins where user_id = p_admin) then
    return jsonb_build_object('error', 'admin');
  end if;
  perform set_config('velunor.admin', '1', true);
  update public.reports
    set decision = p_decision, decided_at = now(), status = 'entschieden'
    where id = p_report
    returning reason into report_reason;
  if report_reason is null then
    return jsonb_build_object('error', 'missing');
  end if;
  insert into public.admin_decisions (report_id, admin_id, decision, note)
  values (p_report, p_admin, p_decision, coalesce(p_note, ''));
  select sender into target from public.messages
    where id = (select message_id from public.reports where id = p_report);
  if target is not null and p_decision in ('24h', '7tage', 'dauerhaft') then
    insert into public.chat_flags (user_id, ban_until)
    values (target, now() + case p_decision when '24h' then interval '24 hours' when '7tage' then interval '7 days' else interval '100 years' end)
    on conflict (user_id) do update set ban_until = excluded.ban_until;
  end if;
  if target is not null and p_decision = 'name' then
    update public.player_names set hidden = true where user_id = target;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.admin_apply(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_apply(uuid, uuid, text, text) to service_role;

create or replace function public.chat_purge()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.messages
  where (reported = false and purge_after < now())
     or (reported = true and created_at < now() - interval '90 days');
$$;

revoke all on function public.chat_purge() from public, anon, authenticated;
grant execute on function public.chat_purge() to service_role;

do $$
declare
  job bigint;
begin
  select jobid into job from cron.job where jobname = 'velunor-chat-purge';
  if job is not null then
    perform cron.unschedule(job);
  end if;
end $$;

select cron.schedule(
  'velunor-chat-purge',
  '20 * * * *',
  $$select public.chat_purge()$$
);
