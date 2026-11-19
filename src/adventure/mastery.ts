import { species } from '../data'
import { OFFLINE_EXP_FACTOR, assetPath } from './const'
import { t } from './i18n'
import type { SaveV2 } from './types'

/**
 * Meisterschafts-EP for one species.
 * Rank 5 is 35,000 M-EP. At speed 3 that is inside 8–12 hours for the first species,
 * counting fight points and a duplicate chest of that species.
 */
export const MASTERY_STEPS = [1_000, 3_000, 8_000, 18_000, 35_000] as const
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
    const src = assetPath(index < lit ? 'mastery/star_on@2x.png' : 'mastery/star_off@2x.png', import.meta.env.BASE_URL || '/')
    return `<img class="m-star${on}" src="${src}" alt=""/>`
  }).join('')
  return `<span class="m-stars" data-level="${lit}" aria-hidden="true">${stars}</span>`
}
