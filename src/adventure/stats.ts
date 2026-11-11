import { species } from '../data'
import type { TypeId } from '../types'
import type { OwnedMon } from './types'

export interface CombatStats {
  hp: number
  atk: number
  def: number
  spd: number
}

/** HP/ATK/DEF grow by 6 % per level above 1. SPD stays at the species base. Shimmer is ×1.10 on all four. */
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

export function expToNext(level: number): number {
  return Math.round(20 * Math.pow(level, 1.6))
}

/** Art-EP for a duplicate: the cost of the next three levels of the highest specimen. */
export function speciesExp(level: number): number {
  return expToNext(level) + expToNext(level + 1) + expToNext(level + 2)
}

export function battleLevel(level: number, cap: number): number {
  return Math.min(level, cap)
}

export function monStats(mon: OwnedMon, level = mon.lvl): CombatStats {
  return combatStats(mon.species, level, mon.shiny)
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
  if (mon.lvl >= cap) {
    mon.exp = 0
    return { gained: 0, levels: 0 }
  }
  if (amount <= 0 || (levelBudget !== null && levelBudget <= 0)) return { gained: 0, levels: 0 }
  let left = Math.max(0, Math.round(amount))
  const start = left
  let levels = 0
  const maxLevels = levelBudget === null ? Number.POSITIVE_INFINITY : levelBudget
  while (left > 0 && mon.lvl < cap && levels < maxLevels) {
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
  if (mon.lvl >= cap) mon.exp = 0
  return { gained: start - left, levels }
}

export function typeOf(speciesId: string): TypeId {
  return species(speciesId).type
}
