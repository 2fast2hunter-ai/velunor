# Trichter der ersten 30 Minuten

Lesende Vorlage für Kokowei. Sie läuft gegen `public.events` und schreibt nichts. Keine Migration, kein Ausführen aus dem Spiel.

Spalten, wie sie am 20.11. genannt wurden:

| Spalte | Typ |
|---|---|
| `id` | `bigint` |
| `player_id` | `uuid` |
| `event` | `text` |
| `ts` | `timestamptz` |
| `props` | `jsonb` |

Die Kohorte ist die Kalenderwoche des ersten `session_start`. Die Woche beginnt Montag 04:00 Europe/Berlin, wie `board_week`. Dafür werden vier Stunden abgezogen, danach nimmt `date_trunc('week', …)` den Montag.

Der Trichter zählt nur Spieler mit Einwilligung „yes“, weil ohne Einwilligung nichts in `events` steht.

| Stufe | Bedeutung | Bedingung |
|---|---|---|
| T0 | neues Konto | erstes `session_start` |
| T1 | Namensschritt | `tutorial_step`, `props.step = 1` |
| T2 | Starterschritt | `tutorial_step`, `props.step = 2` |
| T3 | Spiel gestartet | `tutorial_step`, `props.step = 3` |
| T4 | erster Sieg | erstes `stage_clear` mit `region = 1` und `chapter = 1` |
| T5 | Truhen-Erklärung | `tutorial_step`, `props.step = 4` |
| T6 | erste Truhe | erstes `lootbox_open` |
| T7 | Team geändert | `tutorial_step`, `props.step = 5` |
| T8 | Heilquelle | erstes `stage_clear` mit `region = 1`, `chapter = 1`, `node >= 8` |
| T9 | erstes Wappen | `guardian_win` mit `region = 1` und `chapter = 1` |
| T10 | Freischalt-Pfad | `tutorial_step`, `props.step = 6` |
| T11 | Tagesaufgabe | `tutorial_step`, `props.step = 7` |
| T12 | Freunde | erstes `tab_open` mit `tab = social` |
| T13 | Gilde | erstes `tab_open` mit `tab = guild` |
| T14 | Rückkehr am Folgetag | `session_start` am nächsten Kalendertag Europe/Berlin |

Nebenbei: `step = 15` ist ein weggetippter Hinweis (`props.hint`), `step = 16` ist „Hinweise aus“.

```sql
with ev as (
  select id, player_id, event, ts, props
  from public.events
),
first_session as (
  select distinct on (player_id)
    player_id,
    ts as t0
  from ev
  where event = 'session_start'
  order by player_id, ts
),
cohort as (
  select
    player_id,
    t0,
    date_trunc('week', (t0 at time zone 'Europe/Berlin') - interval '4 hours') as week
  from first_session
),
marks as (
  select
    c.player_id,
    c.week,
    c.t0,
    min(e.ts) filter (where e.event = 'tutorial_step' and e.props->>'step' = '1') as t1,
    min(e.ts) filter (where e.event = 'tutorial_step' and e.props->>'step' = '2') as t2,
    min(e.ts) filter (where e.event = 'tutorial_step' and e.props->>'step' = '3') as t3,
    min(e.ts) filter (
      where e.event = 'stage_clear'
        and e.props->>'region' = '1'
        and e.props->>'chapter' = '1'
    ) as t4,
    min(e.ts) filter (where e.event = 'tutorial_step' and e.props->>'step' = '4') as t5,
    min(e.ts) filter (where e.event = 'lootbox_open') as t6,
    min(e.ts) filter (where e.event = 'tutorial_step' and e.props->>'step' = '5') as t7,
    min(e.ts) filter (
      where e.event = 'stage_clear'
        and e.props->>'region' = '1'
        and e.props->>'chapter' = '1'
        and coalesce((e.props->>'node')::int, 0) >= 8
    ) as t8,
    min(e.ts) filter (
      where e.event = 'guardian_win'
        and e.props->>'region' = '1'
        and e.props->>'chapter' = '1'
    ) as t9,
    min(e.ts) filter (where e.event = 'tutorial_step' and e.props->>'step' = '6') as t10,
    min(e.ts) filter (where e.event = 'tutorial_step' and e.props->>'step' = '7') as t11,
    min(e.ts) filter (where e.event = 'tab_open' and e.props->>'tab' = 'social') as t12,
    min(e.ts) filter (where e.event = 'tab_open' and e.props->>'tab' = 'guild') as t13,
    min(e.ts) filter (
      where e.event = 'session_start'
        and (e.ts at time zone 'Europe/Berlin')::date
          > (c.t0 at time zone 'Europe/Berlin')::date
    ) as t14
  from cohort c
  left join ev e on e.player_id = c.player_id
  group by c.player_id, c.week, c.t0
)
select
  week,
  count(*)::bigint as t0,
  count(t1)::bigint as t1,
  count(t2)::bigint as t2,
  count(t3)::bigint as t3,
  count(t4)::bigint as t4,
  count(t5)::bigint as t5,
  count(t6)::bigint as t6,
  count(t7)::bigint as t7,
  count(t8)::bigint as t8,
  count(t9)::bigint as t9,
  count(t10)::bigint as t10,
  count(t11)::bigint as t11,
  count(t12)::bigint as t12,
  count(t13)::bigint as t13,
  count(t14)::bigint as t14,
  percentile_cont(0.5) within group (order by extract(epoch from (t6 - t3))) as median_t3_t6_s,
  percentile_cont(0.5) within group (order by extract(epoch from (t9 - t3))) as median_t3_t9_s
from marks
group by week
order by week;
```

Hinweise, die am häufigsten weggetippt werden:

```sql
select props->>'hint' as hint, count(*)::bigint as n
from public.events
where event = 'tutorial_step'
  and props->>'step' = '15'
group by props->>'hint'
order by n desc;
```

„Hinweise aus“ in derselben Kohorte:

```sql
with ev as (
  select id, player_id, event, ts, props
  from public.events
),
first_session as (
  select distinct on (player_id) player_id, ts as t0
  from ev
  where event = 'session_start'
  order by player_id, ts
),
cohort as (
  select
    player_id,
    date_trunc('week', (t0 at time zone 'Europe/Berlin') - interval '4 hours') as week
  from first_session
)
select c.week, count(distinct c.player_id)::bigint as players, count(distinct e.player_id)::bigint as hints_off
from cohort c
left join ev e
  on e.player_id = c.player_id
 and e.event = 'tutorial_step'
 and e.props->>'step' = '16'
group by c.week
order by c.week;
```
