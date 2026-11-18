import { expToNext } from '../stats'
import type { SaveV2 } from '../types'

/** Crests (Wappen), then codex entries, then total invested EP. */
export interface ProgressScore {
  crests: number
  codex: number
  ep: number
}

/** EP already spent to reach `level`, plus the EP sitting on the current level. */
export function investedExp(level: number, exp: number): number {
  const lvl = Math.max(1, Math.min(999, Math.floor(level) || 1))
  let sum = Math.max(0, Math.floor(exp) || 0)
  for (let i = 1; i < lvl; i++) sum += expToNext(i)
  return sum
}

export function progressOf(save: SaveV2): ProgressScore {
  const crests = new Set(save.badges.filter((badge) => typeof badge === 'string' && badge.length > 0)).size
  const codex = Object.values(save.dex ?? {}).filter((entry) => (entry?.caught ?? 0) > 0).length
  let ep = 0
  for (const mon of Object.values(save.mons ?? {})) {
    if (!mon) continue
    ep += investedExp(mon.lvl, mon.exp)
  }
  return { crests, codex, ep }
}

/** Positive when `a` is ahead of `b`. Crests win, then codex, then total EP. */
export function compareProgress(a: ProgressScore, b: ProgressScore): number {
  if (a.crests !== b.crests) return a.crests > b.crests ? 1 : -1
  if (a.codex !== b.codex) return a.codex > b.codex ? 1 : -1
  if (a.ep !== b.ep) return a.ep > b.ep ? 1 : -1
  return 0
}
