import { ONBOARDING_V1, type OnboardingState } from './onboarding'
import type { SaveV2 } from './types'

export const HINT_GAP_MS = 90_000
/** A hint stays up at least this long, so the first tap cannot close it before it is visible. */
export const HINT_HOLD_MS = 3_000

export function hintClosable(shownAt: number, now: number): boolean {
  return shownAt > 0 && now - shownAt >= HINT_HOLD_MS
}

/** Remember that the spring was reached, so the hint can still appear after the 90 s gap. */
export function noteHintReach(save: SaveV2): void {
  const board = save.onboarding
  if (!board || board.done) return
  if (save.region !== 1 || save.chapter !== 1 || save.step < 6) return
  if (board.seen.includes('reach:spring')) return
  board.seen = [...board.seen, 'reach:spring'].slice(-64)
}

export interface GoalLine {
  key: string
  n?: number
  name?: string
}

export interface HintDef {
  id: string
  key: string
  /** New players see the entrance hints. Veterans see only sys: hints. */
  audience: 'new' | 'sys'
}

export const HINTS: readonly HintDef[] = [
  { id: 'speed', key: 'hint.speed', audience: 'new' },
  { id: 'team', key: 'hint.team', audience: 'new' },
  { id: 'spring', key: 'hint.spring', audience: 'new' }
]

/** One line. Later chapters keep a single next step. */
export function goalLine(save: SaveV2, chapterName: string): GoalLine {
  const fresh = save.onboarding?.done !== true
  const wins = save.stats?.wins ?? 0
  if (fresh && wins <= 0) return { key: 'goal.win' }
  if (fresh && (save.stats?.chestsOpened ?? 0) <= 0 && (save.chests?.kiesel ?? 0) > 0) return { key: 'goal.chest', n: save.chests.kiesel }
  if (fresh && save.team.length < 2) return { key: 'goal.buddy' }
  if (save.region === 1 && save.chapter === 1 && save.step < 7) return { key: 'goal.spring', n: save.step }
  if (save.region === 1 && save.chapter === 1 && save.step < 14) return { key: 'goal.road', n: 14 }
  if (save.region === 1 && save.chapter === 1 && save.step < 20) return { key: 'goal.mira', n: save.step }
  return { key: 'goal.next', name: chapterName }
}

function ready(hint: HintDef, save: SaveV2): boolean {
  if (hint.id === 'spring') {
    const reached = save.onboarding?.seen.includes('reach:spring') === true
    return save.region === 1 && save.chapter === 1 && reached && save.step < 20
  }
  if (hint.id === 'team') return save.team.length >= 1
  return true
}

/** At most one hint. None during a focus fight, none inside 90s, none when hints are off. */
export function dueHint(save: SaveV2, now: number, focus: boolean, extra: readonly HintDef[] = []): HintDef | null {
  if (!ONBOARDING_V1 || focus) return null
  const board: OnboardingState | undefined = save.onboarding
  if (!board || board.hintsOff) return null
  if (board.lastHintAt > 0 && now - board.lastHintAt < HINT_GAP_MS) return null
  const seen = new Set(board.seen)
  const pool = [...HINTS, ...extra]
  for (const hint of pool) {
    if (seen.has(hint.id) || seen.has(`sys:${hint.id}`)) continue
    const sys = hint.audience === 'sys' || hint.id.startsWith('sys:')
    if (board.done && !sys) continue
    if (!board.done && sys) continue
    if (!ready(hint, save)) continue
    return hint
  }
  return null
}
