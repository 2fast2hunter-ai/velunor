import { species } from '../data'
import { MAX_LEVEL } from './const'
import type { TypeId } from '../types'
import type { OwnedMon } from './types'

export interface CombatStats {
  hp: number
  atk: number
  def: number
  spd: number
}

/** HP/ATK/DEF grow by 6 % per level above 1. SPD stays at the species base. Shimmer is ×1.10 on all four. */
/** 0, then 1 at level 25 and 2 at level 50. Each step is +15 % stats and +0.25 skill multiplier. */
export function awakenCount(level: number): number {
  return (level >= 50 ? 1 : 0) + (level >= 25 ? 1 : 0)
}

export function awakenFactor(level: number): number {
  return 1 + 0.15 * awakenCount(level)
}

export function crossedAwaken(before: number, after: number): (25 | 50)[] {
  const hits: (25 | 50)[] = []
  if (before < 25 && after >= 25) hits.push(25)
  if (before < 50 && after >= 50) hits.push(50)
  return hits
}

export function combatStats(speciesId: string, level: number, shiny = false): CombatStats {
  const base = species(speciesId).base
  const growth = 1 + 0.06 * (level - 1)
  const shine = shiny ? 1.1 : 1
  return {
    hp: Math.round(base.hp * growth * shine),
    atk: Math.round(base.atk * growth * shine),
    def: Math.round(base.def * growth * shine),
    spd: Math.round(base.spd * shine)
  }
}

/** EP to the next level. The exponent stays fixed; only EXP_FACTOR may be retuned. */
export const EXP_FACTOR = 12
export const EXP_EXPONENT = 2.45

export function expToNext(level: number): number {
  return Math.round(EXP_FACTOR * Math.pow(level, EXP_EXPONENT))
}

/** Art-EP for a duplicate: the cost of the next three levels of the highest specimen. */
export function speciesExp(level: number): number {
  return expToNext(level) + expToNext(level + 1) + expToNext(level + 2)
}

export function battleLevel(level: number, cap: number): number {
  return Math.min(level, cap)
}

export function monStats(mon: OwnedMon, level = mon.lvl): CombatStats {
  const raw = combatStats(mon.species, level, mon.shiny)
  const factor = awakenFactor(level)
  if (factor === 1) return raw
  return {
    hp: Math.round(raw.hp * factor),
    atk: Math.round(raw.atk * factor),
    def: Math.round(raw.def * factor),
    spd: Math.round(raw.spd * factor)
  }
}

export function isAlive(mon: OwnedMon): boolean {
  return mon.hp === null || mon.hp > 0
}

export function realHp(mon: OwnedMon): { hp: number; max: number } {
  const max = monStats(mon).hp
  if (mon.hp === null) return { hp: max, max }
  return { hp: Math.max(0, Math.min(max, mon.hp)), max }
}

/**
 * Grant EP. Levels stop at the chapter cap, and EP past the cap is discarded.
 * `levelBudget` limits how many levels this grant may add (offline: 12 per absence).
 */
export function addExp(
  mon: OwnedMon,
  amount: number,
  cap: number,
  levelBudget: number | null
): { gained: number; levels: number } {
  const limit = Math.min(cap, MAX_LEVEL)
  if (mon.lvl >= limit) {
    mon.exp = 0
    return { gained: 0, levels: 0 }
  }
  if (amount <= 0 || (levelBudget !== null && levelBudget <= 0)) return { gained: 0, levels: 0 }
  let left = Math.max(0, Math.round(amount))
  const start = left
  let levels = 0
  const maxLevels = levelBudget === null ? Number.POSITIVE_INFINITY : levelBudget
  while (left > 0 && mon.lvl < limit && levels < maxLevels) {
    const need = expToNext(mon.lvl) - mon.exp
    if (left >= need) {
      left -= need
      const before = monStats(mon).hp
      mon.exp = 0
      mon.lvl += 1
      levels += 1
      const after = monStats(mon).hp
      if (mon.hp != null && mon.hp > 0) mon.hp = Math.min(after, mon.hp + (after - before))
    } else {
      mon.exp += left
      left = 0
    }
  }
  if (mon.lvl >= limit) mon.exp = 0
  return { gained: start - left, levels }
}

export function typeOf(speciesId: string): TypeId {
  return species(speciesId).type
}
