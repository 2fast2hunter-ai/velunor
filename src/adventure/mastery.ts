import { species } from '../data'
import { OFFLINE_EXP_FACTOR } from './const'
import { t } from './i18n'
import type { SaveV2 } from './types'

/**
 * Meisterschafts-EP for one species.
 * At speed 1 a main fighter wins about 1,220 fights an hour (13 wild and 3 trainers
 * on a 20-step loop, 2.8 s each). 60,000 M-EP is then about 49 hours.
 * The spec's 7,000 would have been about 6 hours, so the steps are scaled up.
 */
export const MASTERY_STEPS = [1_000, 4_000, 12_000, 30_000, 60_000] as const
export const MASTERY_WIN = 1
export const MASTERY_BOSS = 5
export const MASTERY_DUPE = 10

export interface MasteryUp {
  speciesId: string
  level: number
}

const queued: MasteryUp[] = []

export function masteryLevel(ep: number): number {
  const points = Math.max(0, Math.floor(ep) || 0)
  let level = 0
  for (const step of MASTERY_STEPS) if (points >= step) level += 1
  return level
}

/** +2 % HP/ATK/DEF per rank, so rank 5 is +10 %. */
export function masteryFactor(level: number): number {
  const rank = Math.max(0, Math.min(MASTERY_STEPS.length, Math.floor(level) || 0))
  return 1 + 0.02 * rank
}

export function masteryFrame(level: number): 'none' | 'bronze' | 'silver' | 'gold' {
  if (level >= 5) return 'gold'
  if (level >= 3) return 'silver'
  if (level >= 1) return 'bronze'
  return 'none'
}

/** Progress inside the current rank. Rank 5 stays full. */
export function masteryGoal(ep: number): { level: number; into: number; span: number; pct: number; done: boolean } {
  const points = Math.max(0, Math.floor(ep) || 0)
  const level = masteryLevel(points)
  if (level >= MASTERY_STEPS.length) {
    const last = MASTERY_STEPS[MASTERY_STEPS.length - 1]
    return { level, into: last, span: last, pct: 100, done: true }
  }
  const floor = level === 0 ? 0 : MASTERY_STEPS[level - 1]
  const ceil = MASTERY_STEPS[level]
  const span = ceil - floor
  const into = Math.max(0, points - floor)
  return { level, into, span, pct: span > 0 ? Math.round((into / span) * 100) : 0, done: false }
}

export function addMastery(save: SaveV2, speciesId: string, amount: number): MasteryUp | null {
  const gain = Math.floor(amount)
  if (!speciesId || gain <= 0) return null
  if (!save.mastery) save.mastery = {}
  const before = masteryLevel(save.mastery[speciesId] ?? 0)
  save.mastery[speciesId] = (save.mastery[speciesId] ?? 0) + gain
  const after = masteryLevel(save.mastery[speciesId])
  if (after <= before) return null
  const up = { speciesId, level: after }
  queued.push(up)
  const name = species(speciesId).name
  save.log.push({ t: Date.now(), text: t(save.settings?.lang, 'mastery.toast', { name, level: after }) })
  if (save.log.length > 50) save.log.splice(0, save.log.length - 50)
  return up
}

export function pullMasteryUps(): MasteryUp[] {
  return queued.splice(0, queued.length)
}

/** Offline points are kept whole, then halved and floored once per absence. */
export function settleOfflineMastery(save: SaveV2, bag: Map<string, number>, factor = OFFLINE_EXP_FACTOR): MasteryUp[] {
  for (const [speciesId, raw] of bag) {
    const paid = Math.floor(Math.max(0, raw) * factor)
    if (paid > 0) addMastery(save, speciesId, paid)
  }
  bag.clear()
  return pullMasteryUps()
}

export function masteryStarRow(level: number): string {
  const lit = Math.max(0, Math.min(5, Math.floor(level) || 0))
  const stars = Array.from({ length: 5 }, (_, index) => {
    const on = index < lit ? ' on' : ''
    return `<svg class="m-star${on}" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.6l2.7 5.6 6.1.7-4.6 4.1 1.3 6.1L12 16.2 6.5 19.1l1.3-6.1L3.2 8.9l6.1-.7z"/></svg>`
  }).join('')
  return `<span class="m-stars" data-level="${lit}" aria-hidden="true">${stars}</span>`
}
