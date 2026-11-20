import { ONBOARDING_V1, type OnboardingState } from './onboarding'
import { arenaUnlocked, crestCount } from './arena'
import { CREST_NEED as GUILD_CRESTS } from './guild'
import { ACCOUNT_AGE_MS, CREST_NEED as TRADE_CRESTS } from './trade'
import { WRITE_CRESTS } from './chat'
import { WHEEL_WAPPEN, wheelOpen } from './wheel'
import { dexCaughtCount } from './sim'
import type { SaveV2 } from './types'

export const UNLOCK_PLAY_MS = 15 * 60 * 1000
export const HINT_GAP_MS = 90_000
const PLAY_CAP = 48 * 60 * 60 * 1000
const WATCH = 'unlock:watch'

export interface UnlockHint {
  id: string
  key: string
}

export interface LadderRow {
  id: string
  open: boolean
  key: string
  vars: Record<string, number>
}

/** The two numbers arenaUnlocked itself requires. */
export function arenaNeed(): { crests: number, register: number } {
  let crests = 0
  while (!arenaUnlocked(crests, 99) && crests < 50) crests += 1
  let register = 0
  while (!arenaUnlocked(99, register) && register < 50) register += 1
  return { crests, register }
}

export function bankPlay(save: SaveV2, ms: number): void {
  if (!save.onboarding || !Number.isFinite(ms) || ms <= 0) return
  save.onboarding.playMs = Math.min(PLAY_CAP, (save.onboarding.playMs ?? 0) + Math.floor(ms))
}

export function pathUnlocked(save: SaveV2): boolean {
  if (!ONBOARDING_V1 || !save.onboarding) return false
  return (save.onboarding.playMs ?? 0) >= UNLOCK_PLAY_MS || crestCount(save.badges) >= 1
}

function arenaOpen(save: SaveV2): boolean {
  return arenaUnlocked(crestCount(save.badges), dexCaughtCount(save))
}

function tradeOpen(save: SaveV2, account?: { email: boolean, ageMs: number }): boolean {
  if (crestCount(save.badges) < TRADE_CRESTS) return false
  if (!account?.email) return false
  return account.ageMs >= ACCOUNT_AGE_MS
}

export function ladder(save: SaveV2, account?: { email: boolean, ageMs: number }): LadderRow[] {
  const arena = arenaNeed()
  const days = Math.round(ACCOUNT_AGE_MS / (24 * 60 * 60 * 1000))
  return [
    { id: 'friends', open: true, key: 'unlock.open', vars: {} },
    { id: 'guild', open: true, key: 'unlock.open', vars: {} },
    { id: 'wheel', open: wheelOpen(save), key: 'unlock.crests', vars: { n: WHEEL_WAPPEN } },
    { id: 'chat', open: crestCount(save.badges) >= WRITE_CRESTS, key: 'unlock.crests', vars: { n: WRITE_CRESTS } },
    { id: 'arena', open: arenaOpen(save), key: 'unlock.arena', vars: { crests: arena.crests, register: arena.register } },
    { id: 'found', open: crestCount(save.badges) >= GUILD_CRESTS, key: 'unlock.crests', vars: { n: GUILD_CRESTS } },
    { id: 'trade', open: tradeOpen(save, account), key: 'unlock.trade', vars: { crests: TRADE_CRESTS, days } }
  ]
}

/** Locked Mehr entries. Joining a guild stays open, so Gilde has no chip. */
export function lockChip(save: SaveV2, screen: string, account?: { email: boolean, ageMs: number }): LadderRow | null {
  const row = ladder(save, account).find((item) => item.id === screen)
  if (!row || row.open || row.id === 'friends' || row.id === 'guild') return null
  return row
}

export function isNew(save: SaveV2, id: string): boolean {
  return Boolean(save.onboarding?.seen.includes(`new:${id}`))
}

export function anyNew(save: SaveV2): boolean {
  return Boolean(save.onboarding?.seen.some((item) => item.startsWith('new:')))
}

/** Remember what is already open. A later opening gets a dot and a log line, no popup. */
export function noteUnlocks(save: SaveV2): string[] {
  const board = save.onboarding
  if (!ONBOARDING_V1 || !board) return []
  const lines: string[] = []
  const rows = ladder(save)
  if (!board.seen.includes(WATCH)) {
    for (const row of rows) if (row.open) board.seen.push(`open:${row.id}`)
    board.seen.push(WATCH)
    board.seen = board.seen.slice(-64)
    return []
  }
  for (const row of rows) {
    if (!row.open || board.seen.includes(`open:${row.id}`)) continue
    board.seen.push(`open:${row.id}`)
    if (!board.seen.includes(`opened:${row.id}`)) {
      board.seen.push(`new:${row.id}`)
      lines.push(row.id)
    }
  }
  board.seen = board.seen.slice(-64)
  return lines
}

export function clearNew(save: SaveV2, id: string): void {
  const board = save.onboarding
  if (!board) return
  board.seen = board.seen.filter((item) => item !== `new:${id}`)
  if (!board.seen.includes(`opened:${id}`)) board.seen.push(`opened:${id}`)
  board.seen = board.seen.slice(-64)
}

const HINTS: { id: string, key: string, when: (save: SaveV2) => boolean }[] = [
  { id: 'sys:friends', key: 'unlock.hint.friends', when: pathUnlocked },
  { id: 'sys:guild', key: 'unlock.hint.guild', when: pathUnlocked },
  { id: 'sys:wheel', key: 'unlock.hint.wheel', when: (save) => wheelOpen(save) },
  { id: 'sys:arena', key: 'unlock.hint.arena', when: arenaOpen },
  { id: 'sys:found', key: 'unlock.hint.found', when: (save) => crestCount(save.badges) >= GUILD_CRESTS },
  { id: 'sys:trade', key: 'unlock.hint.trade', when: (save) => crestCount(save.badges) >= TRADE_CRESTS }
]

let pinned = ''

export function resetUnlockHint(): void {
  pinned = ''
}

/** One hint. The one on screen stays until it is dismissed. The next waits 90s. Never during a focus fight. */
export function dueUnlockHint(save: SaveV2, now: number, focus: boolean): UnlockHint | null {
  if (!ONBOARDING_V1 || focus) return null
  const board: OnboardingState | undefined = save.onboarding
  if (!board || board.hintsOff) return null
  const seen = new Set(board.seen)
  if (pinned && !seen.has(pinned)) {
    const held = HINTS.find((item) => item.id === pinned)
    if (held?.when(save)) return { id: held.id, key: held.key }
    pinned = ''
  }
  if (board.lastHintAt > 0 && now - board.lastHintAt < HINT_GAP_MS) return null
  for (const hint of HINTS) {
    if (seen.has(hint.id) || !hint.when(save)) continue
    pinned = hint.id
    return { id: hint.id, key: hint.key }
  }
  return null
}

export function dismissUnlockHint(save: SaveV2, id: string, now: number): void {
  const board = save.onboarding
  if (!board || !id) return
  if (!board.seen.includes(id)) board.seen = [...board.seen, id].slice(-64)
  board.lastHintAt = now
  if (pinned === id) pinned = ''
}
