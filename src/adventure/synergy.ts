import { combat } from '../data'
import type { TypeId } from '../types'
import { SYNERGY_CAP } from './synergyIds'

export { SYNERGY_CAP, synergyKnown } from './synergyIds'

/**
 * Team type synergies. At most two are active.
 * A missing choice means the two strongest that the six-monster team actually has.
 * Sturmlied is +3% dodge. Polarstrom is HP and DEF. Speed no longer decides a mirror by itself.
 * Crit is a fraction of the base crit chance (0.1). 0.3 is +3 percentage points.
 * `power` is the measured Arena-L100 mirror wins out of 200, not a formula.
 */
export interface SynergyBonus {
  atk?: number
  hp?: number
  def?: number
  spd?: number
  /** Multiplier on the opposing side's speed. 0.96 is −4%. */
  foeSpd?: number
  /** Fraction of the base crit chance. 0.1 is +10% crit. */
  crit?: number
  dodge?: number
  /** Status duration multiplier for statuses this team applies. */
  status?: number
  /** Skill cooldown multiplier. */
  cooldown?: number
  /** Extra attack, and only while the fight is a warden. */
  wardenAtk?: number
}

export interface SynergyDef {
  id: string
  name: string
  types: readonly [TypeId, TypeId]
  bonus: SynergyBonus
  /** Higher is stronger. Ties keep the table order. */
  power: number
  order: number
}

export interface SynergyMods {
  atk: number
  hp: number
  def: number
  spd: number
  wardenAtk: number
  foeSpd: number
  critAdd: number
  dodge: number
  statusDur: number
  cooldown: number
}

export const PURITY_THREE = 0.0165
export const PURITY_FOUR = 0.02
/** Both active synergies together stop at +6% on one of ATK, HP, DEF or speed. */
export const SYNERGY_STAT_CAP = 0.06

const ROWS: readonly Omit<SynergyDef, 'order'>[] = [
  { id: 'gewitter', name: 'Gewitter', types: ['water', 'lightning'], bonus: { crit: 0.194, atk: 0.013 }, power: 124 },
  { id: 'flaechenbrand', name: 'Flächenbrand', types: ['fire', 'wind'], bonus: { atk: 0.0139 }, power: 129 },
  { id: 'wurzelgrund', name: 'Wurzelgrund', types: ['plant', 'earth'], bonus: { hp: 0.022 }, power: 125 },
  { id: 'polarstrom', name: 'Polarstrom', types: ['ice', 'water'], bonus: { hp: 0.019, def: 0.0125 }, power: 125 },
  { id: 'bollwerk', name: 'Bollwerk', types: ['stone', 'metal'], bonus: { def: 0.06 }, power: 123 },
  { id: 'prisma', name: 'Prisma', types: ['light', 'crystal'], bonus: { atk: 0.0105, crit: 0.0354 }, power: 124 },
  { id: 'zwielicht', name: 'Zwielicht', types: ['shadow', 'ghost'], bonus: { dodge: 0.035 }, power: 124 },
  { id: 'rudelkraft', name: 'Rudelkraft', types: ['fighting', 'beast'], bonus: { wardenAtk: 0.0168 }, power: 129 },
  { id: 'schwarmgift', name: 'Schwarmgift', types: ['poison', 'insect'], bonus: { status: 1.15 }, power: 119 },
  { id: 'resonanz', name: 'Resonanz', types: ['psychic', 'sound'], bonus: { cooldown: 0.92 }, power: 119 },
  { id: 'glutschwinge', name: 'Glutschwinge', types: ['dragon', 'fire'], bonus: { atk: 0.011, hp: 0.011 }, power: 126 },
  { id: 'sturmlied', name: 'Sturmlied', types: ['wind', 'sound'], bonus: { dodge: 0.03 }, power: 124 }
]

export const SYNERGIES: readonly SynergyDef[] = ROWS.map((row, order) => ({
  ...row,
  order
}))

export function presentSynergies(types: readonly TypeId[]): SynergyDef[] {
  const have = new Set(types)
  return SYNERGIES.filter((row) => have.has(row.types[0]) && have.has(row.types[1]))
}

/** `picked == null` keeps the two strongest. An array is an explicit choice, and may be empty. */
export function activeSynergies(types: readonly TypeId[], picked?: readonly string[] | null): SynergyDef[] {
  const present = presentSynergies(types)
  if (picked == null) {
    return [...present].sort((a, b) => b.power - a.power || a.order - b.order).slice(0, SYNERGY_CAP)
  }
  const byId = new Map(present.map((row) => [row.id, row]))
  const out: SynergyDef[] = []
  for (const id of picked) {
    const row = byId.get(id)
    if (!row || out.includes(row)) continue
    out.push(row)
    if (out.length >= SYNERGY_CAP) break
  }
  return out
}

/** 3 of one type: +1.65% HP and DEF. 4 or more: +2%. Not attack or speed. Counts toward the 6% cap. */
export function purityOf(types: readonly TypeId[], type: TypeId): number {
  let count = 0
  for (const row of types) if (row === type) count += 1
  if (count >= 4) return PURITY_FOUR
  if (count >= 3) return PURITY_THREE
  return 0
}

export function synergyMods(active: readonly SynergyDef[], warden: boolean): SynergyMods {
  const mods: SynergyMods = {
    atk: 0,
    hp: 0,
    def: 0,
    spd: 0,
    wardenAtk: 0,
    foeSpd: 1,
    critAdd: 0,
    dodge: 0,
    statusDur: 1,
    cooldown: 1
  }
  for (const row of active) {
    const bonus = row.bonus
    mods.atk += bonus.atk ?? 0
    mods.hp += bonus.hp ?? 0
    mods.def += bonus.def ?? 0
    mods.spd += bonus.spd ?? 0
    if (warden) mods.wardenAtk += bonus.wardenAtk ?? 0
    if (bonus.foeSpd) mods.foeSpd *= bonus.foeSpd
    mods.critAdd += combat.critChance * (bonus.crit ?? 0)
    mods.dodge += bonus.dodge ?? 0
    if (bonus.status) mods.statusDur *= bonus.status
    if (bonus.cooldown) mods.cooldown *= bonus.cooldown
  }
  mods.hp = Math.min(SYNERGY_STAT_CAP, mods.hp)
  mods.def = Math.min(SYNERGY_STAT_CAP, mods.def)
  mods.spd = Math.min(SYNERGY_STAT_CAP, mods.spd)
  mods.atk = Math.min(SYNERGY_STAT_CAP, mods.atk)
  mods.wardenAtk = Math.min(Math.max(0, SYNERGY_STAT_CAP - mods.atk), mods.wardenAtk)
  return mods
}

export function scaleSide<T extends { maxHp: number, hp: number, atk: number, def: number, spd: number }>(
  side: T,
  mods: SynergyMods,
  purity = 0
): T {
  const hp = 1 + Math.min(SYNERGY_STAT_CAP, mods.hp + purity)
  const atk = 1 + Math.min(SYNERGY_STAT_CAP, mods.atk + mods.wardenAtk)
  const def = 1 + Math.min(SYNERGY_STAT_CAP, mods.def + purity)
  const spd = 1 + Math.min(SYNERGY_STAT_CAP, mods.spd)
  if (hp === 1 && atk === 1 && def === 1 && spd === 1) return side
  const maxHp = Math.max(1, Math.round(side.maxHp * hp))
  const fraction = side.maxHp > 0 ? side.hp / side.maxHp : 1
  return {
    ...side,
    maxHp,
    hp: side.hp <= 0 ? 0 : Math.max(1, Math.round(maxHp * fraction)),
    atk: Math.max(1, Math.round(side.atk * atk)),
    def: Math.max(1, Math.round(side.def * def)),
    spd: Math.max(1, Math.round(side.spd * spd))
  }
}
