import { describe, expect, it } from 'vitest'
import {
  ARENA_SEASON,
  BEASTS,
  SEASON_DAYS,
  SEASON_LEAGUES,
  beastAt,
  inWeekend,
  leagueAt,
  seasonAt,
  seasonWindow,
  weekWindow,
  weekendWindow
} from './season'

function berlinLabel(date: Date): string {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Berlin',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
  const bag: Record<string, string> = {}
  for (const part of fmt.formatToParts(date)) bag[part.type] = part.value
  return `${bag.year}-${bag.month}-${bag.day} ${bag.hour}:${bag.minute}`
}

describe('season clock', () => {
  it('ends season 1 at 14 December 2026 04:00 and season 2 at 11 January 2027 04:00', () => {
    expect(SEASON_DAYS).toBe(28)
    const first = seasonWindow(1)
    const second = seasonWindow(2)
    expect(first.end.toISOString()).toBe('2026-12-14T03:00:00.000Z')
    expect(berlinLabel(first.end)).toBe('2026-12-14 04:00')
    expect(first.start.toISOString()).toBe('2026-11-16T03:00:00.000Z')
    expect(second.start).toEqual(first.end)
    expect(second.end.toISOString()).toBe('2027-01-11T03:00:00.000Z')
    expect(berlinLabel(second.end)).toBe('2027-01-11 04:00')
    expect(seasonAt(new Date(first.end.getTime() - 1))).toBe(1)
    expect(seasonAt(first.end)).toBe(2)
    expect(seasonAt(new Date(second.end.getTime() - 1))).toBe(2)
    expect(seasonAt(second.end)).toBe(3)
  })

  it('opens season 6 at 5 April 2027 04:00 Berlin, after the spring clock change', () => {
    const sixth = seasonWindow(6)
    expect(sixth.start.toISOString()).toBe('2027-04-05T02:00:00.000Z')
    expect(berlinLabel(sixth.start)).toBe('2027-04-05 04:00')
    expect(seasonAt(new Date('2027-04-05T01:59:00.000Z'))).toBe(5)
    expect(seasonAt(sixth.start)).toBe(6)
  })

  it('lists the instants arena_season has to return', () => {
    for (const row of ARENA_SEASON) {
      const at = new Date(row.at)
      expect(berlinLabel(at), row.at).toBe(row.berlin)
      expect(seasonAt(at), row.at).toBe(row.season)
    }
  })

  it('keeps Monday 04:00 and Friday 18:00 when the clocks change in 2027', () => {
    const springWeek = weekWindow(new Date('2027-03-28T12:00:00.000Z'))
    expect(springWeek.start.toISOString()).toBe('2027-03-22T03:00:00.000Z')
    expect(springWeek.end.toISOString()).toBe('2027-03-29T02:00:00.000Z')
    expect(berlinLabel(springWeek.start)).toBe('2027-03-22 04:00')
    expect(berlinLabel(springWeek.end)).toBe('2027-03-29 04:00')
    expect(springWeek.end.getTime() - springWeek.start.getTime()).toBe(167 * 60 * 60 * 1000)
    expect(weekWindow(new Date('2027-03-29T02:30:00.000Z')).start.toISOString()).toBe('2027-03-29T02:00:00.000Z')

    const autumnWeek = weekWindow(new Date('2027-10-31T12:00:00.000Z'))
    expect(autumnWeek.start.toISOString()).toBe('2027-10-25T02:00:00.000Z')
    expect(autumnWeek.end.toISOString()).toBe('2027-11-01T03:00:00.000Z')
    expect(berlinLabel(autumnWeek.start)).toBe('2027-10-25 04:00')
    expect(berlinLabel(autumnWeek.end)).toBe('2027-11-01 04:00')
    expect(autumnWeek.end.getTime() - autumnWeek.start.getTime()).toBe(169 * 60 * 60 * 1000)
    expect(weekWindow(new Date('2027-11-01T02:30:00.000Z')).start.toISOString()).toBe('2027-10-25T02:00:00.000Z')
    expect(weekWindow(new Date('2027-11-01T03:00:00.000Z')).start.toISOString()).toBe('2027-11-01T03:00:00.000Z')

    const springWeekend = weekendWindow(new Date('2027-03-28T12:00:00.000Z'))
    expect(springWeekend.start.toISOString()).toBe('2027-03-26T17:00:00.000Z')
    expect(springWeekend.end.toISOString()).toBe('2027-03-29T02:00:00.000Z')
    expect(berlinLabel(springWeekend.start)).toBe('2027-03-26 18:00')
    expect(berlinLabel(springWeekend.end)).toBe('2027-03-29 04:00')
    expect(inWeekend(new Date('2027-03-29T01:30:00.000Z'))).toBe(true)
    expect(inWeekend(new Date('2027-03-29T02:30:00.000Z'))).toBe(false)

    const autumnWeekend = weekendWindow(new Date('2027-10-31T12:00:00.000Z'))
    expect(autumnWeekend.start.toISOString()).toBe('2027-10-29T16:00:00.000Z')
    expect(autumnWeekend.end.toISOString()).toBe('2027-11-01T03:00:00.000Z')
    expect(berlinLabel(autumnWeekend.start)).toBe('2027-10-29 18:00')
    expect(berlinLabel(autumnWeekend.end)).toBe('2027-11-01 04:00')
    expect(inWeekend(new Date('2027-11-01T02:30:00.000Z'))).toBe(true)
    expect(inWeekend(new Date('2027-11-01T03:00:00.000Z'))).toBe(false)

    expect(berlinLabel(seasonWindow(14).start)).toBe('2027-11-15 04:00')
    expect(seasonWindow(14).start.toISOString()).toBe('2027-11-15T03:00:00.000Z')
  })

  it('opens the weekend on Friday at 18:00 and closes it on Monday at 04:00', () => {
    expect(inWeekend(new Date('2026-11-20T16:59:00.000Z'))).toBe(false)
    expect(inWeekend(new Date('2026-11-20T17:00:00.000Z'))).toBe(true)
    expect(inWeekend(new Date('2026-11-21T12:00:00.000Z'))).toBe(true)
    expect(inWeekend(new Date('2026-11-22T12:00:00.000Z'))).toBe(true)
    expect(inWeekend(new Date('2026-11-23T02:59:00.000Z'))).toBe(true)
    expect(inWeekend(new Date('2026-11-23T03:00:00.000Z'))).toBe(false)
    const open = weekendWindow(new Date('2026-11-20T17:00:00.000Z'))
    expect(open.start.toISOString()).toBe('2026-11-20T17:00:00.000Z')
    expect(open.end.toISOString()).toBe('2026-11-23T03:00:00.000Z')
    expect(berlinLabel(open.start)).toBe('2026-11-20 18:00')
    expect(berlinLabel(open.end)).toBe('2026-11-23 04:00')
    const next = weekendWindow(new Date('2026-11-23T03:00:00.000Z'))
    expect(next.start.toISOString()).toBe('2026-11-27T17:00:00.000Z')
    expect(berlinLabel(next.end)).toBe('2026-11-30 04:00')
  })

  it('resets the week on Monday at 04:00 Berlin', () => {
    expect(weekWindow(new Date('2026-11-16T02:59:00.000Z')).start.toISOString()).toBe('2026-11-09T03:00:00.000Z')
    expect(weekWindow(new Date('2026-11-16T03:00:00.000Z')).start.toISOString()).toBe('2026-11-16T03:00:00.000Z')
    expect(weekWindow(new Date('2026-11-16T03:00:00.000Z')).end.toISOString()).toBe('2026-11-23T03:00:00.000Z')
    expect(weekWindow(new Date('2026-07-06T02:00:00.000Z')).start.toISOString()).toBe('2026-07-06T02:00:00.000Z')
    expect(berlinLabel(weekWindow(new Date('2026-07-06T02:00:00.000Z')).start)).toBe('2026-07-06 04:00')
  })

  it('alternates the beast once per calendar week, including the weeks the clocks change', () => {
    expect(BEASTS.map((beast) => beast.id)).toEqual(['weltenwurm', 'himmelswal'])
    expect(beastAt(new Date('2026-11-16T03:00:00.000Z'))).toMatchObject({ id: 'himmelswal', week: 0 })
    expect(beastAt(new Date('2026-11-23T03:00:00.000Z'))).toMatchObject({ id: 'weltenwurm', week: 1 })
    const springBefore = beastAt(new Date('2027-03-22T03:00:00.000Z'))
    const springAfter = beastAt(new Date('2027-03-29T02:00:00.000Z'))
    expect(springAfter.week - springBefore.week).toBe(1)
    expect(springBefore.id).toBe('himmelswal')
    expect(springAfter.id).toBe('weltenwurm')
    const autumnBefore = beastAt(new Date('2027-10-25T02:00:00.000Z'))
    const autumnAfter = beastAt(new Date('2027-11-01T03:00:00.000Z'))
    expect(autumnAfter.week - autumnBefore.week).toBe(1)
    expect(autumnBefore.id).toBe('weltenwurm')
    expect(autumnAfter.id).toBe('himmelswal')
  })

  it('steps leagues at 1167 and at 1900', () => {
    expect(SEASON_LEAGUES.map((league) => league.min)).toEqual([0, 1167, 1300, 1500, 1700, 1900])
    expect(leagueAt(1000).id).toBe('kiesel')
    expect(leagueAt(1100).id).toBe('kiesel')
    expect(leagueAt(1166).id).toBe('kiesel')
    expect(leagueAt(1167).id).toBe('bronze')
    expect(leagueAt(1299).id).toBe('bronze')
    expect(leagueAt(1300).id).toBe('silber')
    expect(leagueAt(1499).id).toBe('silber')
    expect(leagueAt(1500).id).toBe('gold')
    expect(leagueAt(1699).id).toBe('gold')
    expect(leagueAt(1700).id).toBe('kristall')
    expect(leagueAt(1899).id).toBe('kristall')
    expect(leagueAt(1900).name).toBe('Velunor-Meister')
  })
})
