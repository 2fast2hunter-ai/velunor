import { mulberry32 } from '../rng'
import type { DailySave, FruitId, SaveV2 } from './types'
import type { TypeId } from '../types'

/**
 * Three daily tasks and a 7-day calendar.
 * The local day flips at 04:00 in the player's zone. The stored day key only moves forward,
 * so turning the clock back does not roll a new board or pay the calendar again.
 * A missed day does not reset the calendar and does not pay the days in between.
 * Catching tasks are not in the pool. Chests, shards and wild fights replace them.
 */
export const DAILY_MARK_CAP = 15
export const DAILY_GOLD_CAP = 3_000
export const DAILY_FRAMES = ['daily-dawn', 'daily-tide', 'daily-leaf', 'daily-ember'] as const
export type DailyFrameId = (typeof DAILY_FRAMES)[number]

export const TASK_KINDS = ['chest', 'shard', 'wild', 'trainer', 'warden', 'expedition', 'arena', 'coop'] as const
export type TaskKind = (typeof TASK_KINDS)[number]

const TYPES: TypeId[] = [
  'fire', 'water', 'plant', 'earth', 'wind', 'ice', 'lightning', 'poison', 'metal', 'stone',
  'light', 'shadow', 'ghost', 'dragon', 'insect', 'beast', 'fighting', 'psychic', 'sound', 'crystal'
]

const NEED: Record<TaskKind, number> = {
  chest: 3,
  shard: 20,
  wild: 50,
  trainer: 1,
  warden: 1,
  expedition: 2,
  arena: 2,
  coop: 1
}

/** Slot rewards. The three tasks together pay 15 marks, 2 500 gold and two fruits. */
const SLOT_REWARD: { marks: number, gold: number, fruit: FruitId | null }[] = [
  { marks: 4, gold: 600, fruit: 'lern' },
  { marks: 5, gold: 800, fruit: 'muenz' },
  { marks: 6, gold: 1_100, fruit: null }
]

/** Calendar days 1–6. Day 7 is the frame for this cycle. No marks, so the mark cap stays 15. */
const CALENDAR: { gold: number, fruit: FruitId | null }[] = [
  { gold: 300, fruit: null },
  { gold: 0, fruit: 'spuer' },
  { gold: 400, fruit: null },
  { gold: 0, fruit: 'neugier' },
  { gold: 500, fruit: null },
  { gold: 0, fruit: 'glanz' }
]

export interface DailyTask {
  kind: TaskKind
  need: number
  have: number
  claimed: boolean
  /** Set when the task is "defeat wild monsters of this type". */
  type?: TypeId
}

export interface DailyState {
  /** Highest accepted local day key, YYYY-MM-DD after 04:00. Empty until the first touch. */
  key: string
  /** How many distinct play days have been accepted. Only increases. */
  count: number
  /** Days credited in the current 7-day cycle, 0–7. */
  credited: number
  /** Which of the four frames the next day-7 reward uses. */
  cycle: number
  tasks: DailyTask[]
  frames: DailyFrameId[]
  /** Lifetime marks paid by tasks. The server caps the gain per Berlin day. */
  marks: number
  /** Lifetime gold paid by tasks and the calendar. */
  gold: number
}

export function emptyDaily(): DailyState {
  return { key: '', count: 0, credited: 0, cycle: 0, tasks: [], frames: [], marks: 0, gold: 0 }
}

export function isDailyFrame(id: string): id is DailyFrameId {
  return (DAILY_FRAMES as readonly string[]).includes(id)
}

/** Local calendar day, using the hours before 04:00 as the previous day. */
export function localDayKey(now: Date, timeZone?: string): string {
  const zone = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit'
  })
  const bag: Record<string, string> = {}
  for (const part of fmt.formatToParts(now)) bag[part.type] = part.value
  let year = Number(bag.year)
  let month = Number(bag.month)
  let day = Number(bag.day)
  const hour = Number(bag.hour)
  if (hour < 4) {
    const back = new Date(Date.UTC(year, month - 1, day))
    back.setUTCDate(back.getUTCDate() - 1)
    year = back.getUTCFullYear()
    month = back.getUTCMonth() + 1
    day = back.getUTCDate()
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function hash(text: string): number {
  let value = 2166136261
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619)
  return value >>> 0
}

function rollTasks(key: string, count: number): DailyTask[] {
  const rng = mulberry32(hash(`velunor-daily-${key}-${count}`) || 1)
  const pool: TaskKind[] = [...TASK_KINDS]
  const chosen: DailyTask[] = []
  while (chosen.length < 3 && pool.length) {
    const index = Math.floor(rng() * pool.length)
    const kind = pool.splice(index, 1)[0]
    const type = kind === 'wild' ? TYPES[Math.floor(rng() * TYPES.length)] : undefined
    chosen.push({ kind, need: NEED[kind], have: 0, claimed: false, type })
  }
  return chosen
}

function pay(save: SaveV2, marks: number, gold: number, fruit: FruitId | null): void {
  const state = save.daily ?? (save.daily = emptyDaily())
  if (marks > 0) {
    save.marks += marks
    state.marks += marks
  }
  if (gold > 0) {
    save.gold += gold
    state.gold += gold
  }
  if (fruit && save.bag?.fruits) save.bag.fruits[fruit] += 1
}

function grantCalendar(save: SaveV2): void {
  const state = save.daily ?? (save.daily = emptyDaily())
  if (state.credited >= 7) {
    state.credited = 1
    state.cycle += 1
  } else state.credited += 1
  if (state.credited === 7) {
    const frame = DAILY_FRAMES[state.cycle % DAILY_FRAMES.length]
    if (!state.frames.includes(frame)) state.frames.push(frame)
    return
  }
  const reward = CALENDAR[state.credited - 1]
  pay(save, 0, reward.gold, reward.fruit)
}

function ensure(save: SaveV2): DailySave {
  if (!save.daily) save.daily = emptyDaily()
  return save.daily
}

/** Fill a missing or broken board without paying. Used when an older save is loaded. */
export function normalizeDaily(save: SaveV2): void {
  const raw = save.daily
  const state = emptyDaily()
  if (raw && typeof raw.key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.key)) state.key = raw.key
  state.count = Math.max(0, Math.floor(Number(raw?.count)) || 0)
  state.credited = Math.max(0, Math.min(7, Math.floor(Number(raw?.credited)) || 0))
  state.cycle = Math.max(0, Math.floor(Number(raw?.cycle)) || 0)
  state.marks = Math.max(0, Math.floor(Number(raw?.marks)) || 0)
  state.gold = Math.max(0, Math.floor(Number(raw?.gold)) || 0)
  state.frames = (Array.isArray(raw?.frames) ? raw.frames : []).filter((id): id is DailyFrameId => typeof id === 'string' && isDailyFrame(id))
  const tasks = Array.isArray(raw?.tasks) ? raw.tasks : []
  state.tasks = tasks.slice(0, 3).flatMap((task) => {
    if (!task || !TASK_KINDS.includes(task.kind)) return []
    const type = task.type && TYPES.includes(task.type) ? task.type : undefined
    return [{
      kind: task.kind,
      need: NEED[task.kind],
      have: Math.max(0, Math.min(NEED[task.kind], Math.floor(Number(task.have)) || 0)),
      claimed: Boolean(task.claimed),
      type: task.kind === 'wild' ? type : undefined
    }]
  })
  if (state.key && state.tasks.length !== 3) state.tasks = rollTasks(state.key, state.count)
  save.daily = state
}

/**
 * Accept today's local key when it is newer than the stored one.
 * The same key and any earlier key do nothing.
 */
export function touchDaily(save: SaveV2, now: Date, timeZone?: string): void {
  const state = ensure(save)
  const key = localDayKey(now, timeZone)
  if (state.key && key <= state.key) return
  const first = state.key === ''
  state.key = key
  state.count = first ? 1 : state.count + 1
  state.tasks = rollTasks(key, state.count)
  grantCalendar(save)
}

export function noteDaily(save: SaveV2, kind: TaskKind, amount = 1, type?: TypeId): void {
  const tasks = save.daily?.tasks
  if (!tasks?.length || amount <= 0) return
  for (const task of tasks) {
    if (task.claimed || task.kind !== kind) continue
    if (kind === 'wild' && task.type && task.type !== type) continue
    task.have = Math.min(task.need, task.have + Math.floor(amount))
    if (task.have < task.need) continue
    task.claimed = true
    const slot = Math.max(0, Math.min(SLOT_REWARD.length - 1, tasks.indexOf(task)))
    const reward = SLOT_REWARD[slot]
    pay(save, reward.marks, reward.gold, reward.fruit)
  }
}

export function equipDailyFrame(save: SaveV2, id: string): void {
  if (isDailyFrame(id) && save.daily?.frames.includes(id)) save.equippedFrame = id
}

export function slotReward(index: number): { marks: number, gold: number, fruit: FruitId | null } {
  return SLOT_REWARD[Math.max(0, Math.min(SLOT_REWARD.length - 1, index))]
}

export function calendarReward(day: number): { gold: number, fruit: FruitId | null, frame: boolean } {
  if (day === 7) return { gold: 0, fruit: null, frame: true }
  const reward = CALENDAR[Math.max(0, Math.min(CALENDAR.length - 1, day - 1))]
  return { gold: reward.gold, fruit: reward.fruit, frame: false }
}
