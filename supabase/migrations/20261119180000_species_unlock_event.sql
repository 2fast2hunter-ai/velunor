-- Eleventh analytics event. The check is the server whitelist.
-- Existing rows stay: they already use one of the ten names.

alter table public.events drop constraint if exists events_event_check;

alter table public.events add constraint events_event_check
  check (event in (
    'session_start',
    'tutorial_step',
    'tab_open',
    'stage_clear',
    'stage_fail',
    'guardian_win',
    'guardian_fail',
    'lootbox_open',
    'shard_drop',
    'star_up',
    'species_unlock'
  ));
