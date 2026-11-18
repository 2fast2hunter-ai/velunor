-- Step 5 fix. The baseline clock is server time and stays put while a flag sticks.
alter table public.profiles
  add column if not exists audited_at timestamptz;

comment on column public.profiles.audited_at is
  'Server time of the last clean baseline. A flagged account keeps this value.';
