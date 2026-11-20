-- Allow the renamed chest event. lootbox_open stays in the check so old rows
-- remain valid. This migration does not update or rewrite any events row.

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
    'chest_open',
    'shard_drop',
    'star_up',
    'species_unlock'
  ));
