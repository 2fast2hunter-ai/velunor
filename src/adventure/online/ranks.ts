/** Leaderboard rules. The SQL migration uses the same weeks, cutoffs and titles. */

export const BOARDS = ['codex', 'progress', 'week', 'shimmer', 'mastery'] as const
export type BoardId = (typeof BOARDS)[number]

export const CRESTS = [
  'Kieselwappen',
  'Wellenwappen',
  'Funkenwappen',
  'Moorwappen',
  'Felswappen',
  'Sturmwappen',
  'Frostwappen',
  'Klingenwappen'
] as const

export const COUNCILS = [
  'Ratsiegel',
  'Zweites Ratsiegel',
  'Drittes Ratsiegel',
  'Viertes Ratsiegel',
  'Fünftes Ratsiegel'
] as const

export const REWARD_MARKS = { top1: 100, top10: 50, top50: 20 } as const
export type RewardTier = keyof typeof REWARD_MARKS

export const BOARD_TITLES: Record<BoardId, string> = {
  codex: 'Kodexlicht',
  progress: 'Wegmarke',
  week: 'Wochenkranz',
  shimmer: 'Schimmerreif',
  mastery: 'Meisterkrone'
}

export const RANK_FRAMES = [
  { id: 'codex', title: 'Kodexlicht' },
  { id: 'progress', title: 'Wegmarke' },
  { id: 'week', title: 'Wochenkranz' },
  { id: 'shimmer', title: 'Schimmerreif' },
  { id: 'mastery', title: 'Meisterkrone' },
  { id: 'ehren', title: 'Ehrenplatz' }
] as const

const BERLIN = 'Europe/Berlin'

export function isBoard(value: string): value is BoardId {
  return (BOARDS as readonly string[]).includes(value)
}

function berlinParts(date: Date): { year: number, month: number, day: number, hour: number, weekday: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: BERLIN,
    hourCycle: 'h23',
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit'
  })
  const bag: Record<string, string> = {}
  for (const part of fmt.formatToParts(date)) bag[part.type] = part.value
  const days: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour),
    weekday: days[bag.weekday] ?? 1
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
  const asUtc = Date.UTC(Number(bag.year), Number(bag.month) - 1, Number(bag.day), Number(bag.hour), Number(bag.minute), Number(bag.second))
  return asUtc - date.getTime()
}

function berlinWall(year: number, month: number, day: number, hour: number): Date {
  const utc = new Date(Date.UTC(year, month - 1, day, hour, 0, 0))
  const first = new Date(utc.getTime() - offsetMs(utc))
  return new Date(utc.getTime() - offsetMs(first))
}

/** Monday 04:00 Europe/Berlin that opened the current board week. */
export function boardWeek(now: Date): Date {
  const local = berlinParts(now)
  let back = (local.weekday + 6) % 7
  if (local.weekday === 1 && local.hour < 4) back = 7
  return berlinWall(local.year, local.month, local.day - back, 4)
}

export function inBoardWeek(at: Date, now: Date): boolean {
  const start = boardWeek(now).getTime()
  const time = at.getTime()
  return time >= start && time < start + 7 * 24 * 60 * 60 * 1000
}

export function progressParts(region: number, badges: readonly string[]): { region: number, crests: number, council: number, score: number } {
  const crestSet = new Set<string>(CRESTS)
  const councilSet = new Set<string>(COUNCILS)
  const crests = badges.filter((badge) => crestSet.has(badge)).length
  const council = badges.filter((badge) => councilSet.has(badge)).length
  const regionN = Math.max(1, Math.floor(region) || 1)
  return { region: regionN, crests, council, score: regionN * 100_000 + crests * 100 + council }
}

export interface RankSeed {
  user: string
  score: number
  flag: 0 | 1 | 2
  label: string
}

export interface RankedRow extends RankSeed {
  place: number
}

/** Flag 2 stays off the board. Ties break by user id so the order is stable. */
export function displayRank(rows: readonly RankSeed[]): RankedRow[] {
  return rows
    .filter((row) => row.flag < 2)
    .slice()
    .sort((a, b) => b.score - a.score || (a.user < b.user ? -1 : a.user > b.user ? 1 : 0))
    .map((row, index) => ({ ...row, place: index + 1 }))
}

/** Reward places are numbered again among flag 0 only. Flag 1 stays visible and unpaid. */
export function eligibleRank(rows: readonly RankSeed[]): RankedRow[] {
  return displayRank(rows.filter((row) => row.flag === 0))
}

export function rewardTier(place: number, eligible: number): RewardTier | null {
  if (eligible < 1 || place < 1 || place > eligible) return null
  if (place <= Math.ceil(eligible * 0.01)) return 'top1'
  if (place <= Math.ceil(eligible * 0.10)) return 'top10'
  if (place <= Math.ceil(eligible * 0.50)) return 'top50'
  return null
}

export interface StoredReward {
  week: string
  user: string
  board: string
  tier: RewardTier
  marks: number
  title: string | null
  place: number
}

export function grantWeekly(existing: readonly StoredReward[], week: string, board: string, rows: readonly RankSeed[]): StoredReward[] {
  const keys = new Set(existing.map((row) => `${row.week}|${row.user}|${row.board}`))
  const ranked = eligibleRank(rows)
  const eligible = ranked.length
  const added: StoredReward[] = []
  for (const row of ranked) {
    const tier = rewardTier(row.place, eligible)
    if (!tier) continue
    const key = `${week}|${row.user}|${board}`
    if (keys.has(key)) continue
    keys.add(key)
    added.push({
      week,
      user: row.user,
      board,
      tier,
      marks: REWARD_MARKS[tier],
      title: tier === 'top1' && isBoard(board) ? BOARD_TITLES[board] : null,
      place: row.place
    })
  }
  return added
}

export function topSlice<T extends { place: number }>(rows: readonly T[], limit = 100): T[] {
  return rows.filter((row) => row.place <= limit)
}

export function aroundSlice<T extends { place: number }>(rows: readonly T[], place: number, span = 10): T[] {
  return rows.filter((row) => row.place >= place - span && row.place <= place + span)
}

export function hideBlocked<T extends { label: string, self?: boolean }>(rows: readonly T[], blocked: readonly string[]): T[] {
  const banned = new Set(blocked)
  return rows.filter((row) => row.self || !banned.has(row.label))
}

export function publicLabel(name: string, tag: string, hidden: boolean): string {
  if (hidden) return `Spieler#${tag}`
  return name ? `${name}#${tag}` : 'Spieler'
}

export interface RankModel {
  board: BoardId
  status: 'ready' | 'offline' | 'loading'
  top: RankLine[]
  around: RankLine[]
  honors: string[]
  excluded: boolean
}

export interface RankLine {
  place: number
  label: string
  score: number
  detail: string
  self: boolean
}

export function rankDetail(detail: { region?: number, crests?: number, council?: number }, lang: 'de' | 'en'): string {
  if (typeof detail.region !== 'number') return ''
  const crests = Number(detail.crests) || 0
  const council = Number(detail.council) || 0
  if (lang === 'en') return `Region ${detail.region} · ${crests} crests · ${council} council`
  return `Region ${detail.region} · ${crests} Wappen · ${council} Rat`
}

export function parseRankPage(raw: unknown, lang: 'de' | 'en' = 'de'): { status: 'ready' | 'offline', top: RankLine[], around: RankLine[], honors: string[] } {
  if (!raw || typeof raw !== 'object') return { status: 'offline', top: [], around: [], honors: [] }
  const body = raw as Record<string, unknown>
  if (body.status !== 'ready') return { status: 'offline', top: [], around: [], honors: [] }
  const honors = Array.isArray(body.honors) ? body.honors.filter((item): item is string => typeof item === 'string') : []
  return { status: 'ready', top: parseLines(body.top, lang), around: parseLines(body.around, lang), honors }
}

function parseLines(value: unknown, lang: 'de' | 'en'): RankLine[] {
  if (!Array.isArray(value)) return []
  const lines: RankLine[] = []
  for (const row of value) {
    if (!row || typeof row !== 'object') continue
    const item = row as Record<string, unknown>
    const place = Math.floor(Number(item.place))
    if (!(place > 0)) continue
    const detail = item.detail && typeof item.detail === 'object' ? item.detail as { region?: number, crests?: number, council?: number } : {}
    lines.push({
      place,
      label: typeof item.label === 'string' && item.label ? item.label : 'Spieler',
      score: Math.max(0, Math.floor(Number(item.score)) || 0),
      detail: rankDetail(detail, lang),
      self: item.self === true
    })
  }
  return lines
}

export function honorIds(rewards: readonly StoredReward[]): string[] {
  const ids = new Set<string>()
  for (const reward of rewards) {
    if (reward.tier === 'top1' && isBoard(reward.board)) ids.add(reward.board)
    if (reward.place === 1) ids.add('ehren')
  }
  return RANK_FRAMES.map((frame) => frame.id).filter((id) => ids.has(id))
}
