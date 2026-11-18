-- Step 5 fix 2. The baseline clock moves only when the save actually advances.
alter table public.profiles
  add column if not exists audit_generation integer not null default 0;

comment on column public.profiles.audit_generation is
  'Counts accepted baselines. A repeat of the same save does not increment it and does not move audited_at.';
