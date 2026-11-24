/**
 * Season, week and weekend clocks for Europe/Berlin.
 *
 * Boundaries are wall-clock times on calendar days. A season is 28 Berlin
 * dates, a week runs Monday 04:00 to the next Monday 04:00, and a weekend
 * runs Friday 18:00 to Monday 04:00. Adding a fixed number of UTC seconds
 * shifts those walls by an hour when the clocks change, so this module
 * never does that.
 *
 * Not wired into the arena or the co-op beast yet.
 */

const BERLIN = 'Europe/Berlin'

export const SEASON_DAYS = 28

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

interface BerlinParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  weekday: number
}

function berlinParts(date: Date): BerlinParts {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: BERLIN,
    hourCycle: 'h23',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
  const bag: Record<string, string> = {}
  for (const part of fmt.formatToParts(date)) bag[part.type] = part.value
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour),
    minute: Number(bag.minute),
    weekday: WEEKDAYS[bag.weekday] ?? 1
  }
}

function offsetMs(date: Date): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: BERLIN,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  const bag: Record<string, string> = {}
  for (const part of fmt.formatToParts(date)) bag[part.type] = part.value
  const asUtc = Date.UTC(
    Number(bag.year),
    Number(bag.month) - 1,
    Number(bag.day),
    Number(bag.hour),
    Number(bag.minute),
    Number(bag.second)
  )
  return asUtc - date.getTime()
}

/** The UTC instant of a Europe/Berlin wall time. Day numbers may overflow. */
function berlinWall(year: number, month: number, day: number, hour: number, minute = 0): Date {
  const utc = new Date(Date.UTC(year, month - 1, day, hour, minute, 0))
  const first = new Date(utc.getTime() - offsetMs(utc))
  return new Date(utc.getTime() - offsetMs(first))
}

function addCalendarDays(origin: Date, days: number): Date {
  const part = berlinParts(origin)
  return berlinWall(part.year, part.month, part.day + days, part.hour, part.minute)
}

function calendarDays(from: Date, to: Date): number {
  const start = berlinParts(from)
  const end = berlinParts(to)
  const ms = Date.UTC(end.year, end.month - 1, end.day) - Date.UTC(start.year, start.month - 1, start.day)
  return Math.round(ms / 86_400_000)
}

/** Season 1 ends on this Monday. Later seasons step 28 calendar days from here. */
const SEASON_1_END = berlinWall(2026, 12, 14, 4)

export interface SeasonWindow {
  season: number
  start: Date
  end: Date
}

/**
 * Season 1 opens 28 calendar days before 14 December 2026, on Monday
 * 16 November 2026 at 04:00. Season 2 and every season after it last 28
 * Berlin dates, measured from that end.
 */
export function seasonWindow(season: number): SeasonWindow {
  const index = Math.floor(season)
  if (index < 1) throw new RangeError('season starts at 1')
  return {
    season: index,
    start: addCalendarDays(SEASON_1_END, (index - 2) * SEASON_DAYS),
    end: addCalendarDays(SEASON_1_END, (index - 1) * SEASON_DAYS)
  }
}

/** Most recent 04:00 Europe/Berlin. */
function lastReset(now: Date): Date {
  const local = berlinParts(now)
  const back = local.hour < 4 ? 1 : 0
  return berlinWall(local.year, local.month, local.day - back, 4)
}

/**
 * 1-based season containing `now`. 0 is only before season 1 opens.
 * The instant of the end belongs to the next season.
 */
export function seasonAt(now: Date): number {
  const first = seasonWindow(1)
  if (now.getTime() < first.start.getTime()) return 0
  if (now.getTime() < first.end.getTime()) return 1
  const days = calendarDays(first.end, lastReset(now))
  return 2 + Math.floor(days / SEASON_DAYS)
}

export interface ClockWindow {
  start: Date
  end: Date
}

/** Monday 04:00 Europe/Berlin through the next Monday 04:00. */
export function weekWindow(now: Date): ClockWindow {
  const local = berlinParts(now)
  let back = (local.weekday + 6) % 7
  if (local.weekday === 1 && local.hour < 4) back = 7
  const start = berlinWall(local.year, local.month, local.day - back, 4)
  return { start, end: addCalendarDays(start, 7) }
}

/** Friday 18:00 inclusive through Monday 04:00 exclusive. */
export function inWeekend(now: Date): boolean {
  const local = berlinParts(now)
  if (local.weekday === 6 || local.weekday === 0) return true
  if (local.weekday === 5 && local.hour >= 18) return true
  return local.weekday === 1 && local.hour < 4
}

/**
 * The weekend that contains `now`, or the next one when `now` is outside it.
 * The end is always the following Monday at 04:00 Berlin.
 */
export function weekendWindow(now: Date): ClockWindow {
  const local = berlinParts(now)
  if (inWeekend(now)) {
    const toMonday = (1 - local.weekday + 7) % 7
    const end = berlinWall(local.year, local.month, local.day + toMonday, 4)
    return { start: shiftToFriday(end), end }
  }
  const toFriday = (5 - local.weekday + 7) % 7
  const start = berlinWall(local.year, local.month, local.day + toFriday, 18)
  const friday = berlinParts(start)
  return { start, end: berlinWall(friday.year, friday.month, friday.day + 3, 4) }
}

function shiftToFriday(mondayReset: Date): Date {
  const part = berlinParts(mondayReset)
  return berlinWall(part.year, part.month, part.day - 3, 18)
}

/** Co-op beasts in roster order. The November 2026 anchor week uses the second entry. */
export const BEASTS = [
  { id: 'weltenwurm', name: 'Weltenwurm' },
  { id: 'himmelswal', name: 'Himmelswal' }
] as const

/**
 * The week of Monday 16 November 2026 is Himmelswal, matching the beast the
 * current week counter already shows. Later weeks alternate by calendar week.
 */
const BEAST_ANCHOR = berlinWall(2026, 11, 16, 4)
const BEAST_WEEK0 = 1

export interface BeastTurn {
  id: (typeof BEASTS)[number]['id']
  name: string
  week: number
}

export function beastAt(now: Date): BeastTurn {
  const week = Math.round(calendarDays(BEAST_ANCHOR, weekWindow(now).start) / 7)
  const slot = ((week + BEAST_WEEK0) % BEASTS.length + BEASTS.length) % BEASTS.length
  const beast = BEASTS[slot]
  return { id: beast.id, name: beast.name, week }
}

/**
 * Inclusive rating floors. 1166 stays Kiesel and 1167 is Bronze.
 * 1899 stays Kristall and 1900 is Velunor-Meister.
 * The steps between Bronze and Kristall stay on the live floors.
 */
export const SEASON_LEAGUES = [
  { id: 'kiesel', name: 'Kiesel', min: 0, marks: 20 },
  { id: 'bronze', name: 'Bronze', min: 1167, marks: 40 },
  { id: 'silber', name: 'Silber', min: 1300, marks: 60 },
  { id: 'gold', name: 'Gold', min: 1500, marks: 80 },
  { id: 'kristall', name: 'Kristall', min: 1700, marks: 100 },
  { id: 'meister', name: 'Velunor-Meister', min: 1900, marks: 150 }
] as const

export type SeasonLeagueId = (typeof SEASON_LEAGUES)[number]['id']

export function leagueAt(rating: number): (typeof SEASON_LEAGUES)[number] {
  let found: (typeof SEASON_LEAGUES)[number] = SEASON_LEAGUES[0]
  for (const league of SEASON_LEAGUES) {
    if (rating >= league.min) found = league
  }
  return found
}
