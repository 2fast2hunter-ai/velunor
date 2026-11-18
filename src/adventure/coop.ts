import { fight1v1, type FightSide } from './battle'
import { activeSynergies, purityOf, scaleSide, synergyMods } from './synergy'
import { boardWeek } from './online/ranks'
import { mulberry32 } from '../rng'
import type { ArenaFighter } from './arena'
import type { TypeId } from '../types'

export const COOP_ACTIONS = 60
export const COOP_ATTEMPTS = 3
export const GROUP_MAX = 4
export const EGG_CHANCE = 0.02
export const WEEK_ATTEMPTS = COOP_ATTEMPTS * 7 * GROUP_MAX

/**
 * HP for levels 1–10. Tuned so four players using every daily attempt
 * deal just enough in one week. See the test `clears level 10 on a full week`.
 * Filled after measuring a reference team; the constant is the result.
 */
export const LEVEL_HP = [
  1_012_000,
  2_023_000,
  3_035_000,
  4_046_000,
  5_058_000,
  6_070_000,
  8_093_000,
  10_116_000,
  13_151_000,
  17_197_000
] as const

export const BEASTS = [
  { id: 'weltenwurm', name: 'Weltenwurm', type: 'earth' as TypeId, egg: 'm18' },
  { id: 'himmelswal', name: 'Himmelswal', type: 'wind' as TypeId, egg: 'm24' }
] as const

export interface CoopTrack {
  level: number
  hp: number
}

export interface LevelReward {
  level: number
  gold: number
  fruit: number
  marks: number
  egg: boolean
}

export function weeklyBeast(now: Date): (typeof BEASTS)[number] & { week: number } {
  const week = boardWeek(now).getTime()
  const beast = BEASTS[Math.floor(week / (7 * 24 * 60 * 60 * 1000)) % BEASTS.length]
  return { ...beast, week }
}

export function levelReward(level: number, roll: number): LevelReward {
  return {
    level,
    gold: 1000 * level,
    fruit: 1,
    marks: 2 * level,
    egg: level >= 5 && roll < EGG_CHANCE
  }
}

export function freshTrack(): CoopTrack {
  return { level: 1, hp: LEVEL_HP[0] }
}

/** Adds group damage. Cleared levels are returned once, in order. */
export function addGroupDamage(track: CoopTrack, damage: number): { track: CoopTrack, cleared: number[] } {
  let level = Math.max(1, Math.min(10, track.level))
  let hp = Math.max(0, track.hp)
  let left = Math.max(0, Math.floor(damage))
  const cleared: number[] = []
  if (level >= 10 && hp <= 0) return { track: { level: 10, hp: 0 }, cleared }
  while (left > 0 && level <= 10) {
    const pool = level === track.level && hp > 0 ? hp : LEVEL_HP[level - 1]
    if (left < pool) return { track: { level, hp: pool - left }, cleared }
    left -= pool
    cleared.push(level)
    level += 1
    hp = level <= 10 ? LEVEL_HP[level - 1] : 0
  }
  if (level > 10) return { track: { level: 10, hp: 0 }, cleared }
  return { track: { level, hp }, cleared }
}

export function claimOnce(already: ReadonlySet<string>, user: string, level: number): boolean {
  const key = `${user}:${level}`
  if (already.has(key)) return false
  return true
}

function sideFrom(fighter: ArenaFighter): FightSide {
  return {
    speciesId: fighter.speciesId,
    name: fighter.name,
    type: fighter.type,
    maxHp: fighter.maxHp,
    hp: fighter.maxHp,
    atk: fighter.atk,
    def: fighter.def,
    spd: fighter.spd,
    skill: fighter.skill,
    passive: fighter.passive,
    level: 100
  }
}

/** Sixty actions of the shared fight, split across the six monsters. `picked == null` keeps the two strongest. */
export function coopDamage(fighters: readonly ArenaFighter[], beastType: TypeId, seed: number, picked?: readonly string[] | null): number {
  if (!fighters.length) return 0
  const rng = mulberry32(seed >>> 0 || 1)
  const each = Math.max(1, Math.floor(COOP_ACTIONS / fighters.length))
  const types = fighters.map((fighter) => fighter.type)
  const mods = synergyMods(activeSynergies(types, picked ?? null), false)
  let total = 0
  for (const fighter of fighters) {
    const foe: FightSide = {
      speciesId: 'beast',
      name: 'Weltenbiest',
      type: beastType,
      maxHp: 5_000_000,
      hp: 5_000_000,
      atk: 30,
      def: 140,
      spd: 1,
      skill: fighter.skill,
      passive: null,
      level: 100
    }
    const trace = fight1v1(scaleSide(sideFrom(fighter), mods, purityOf(types, fighter.type)), foe, rng, false, null, {
      actionCap: each,
      critAdd: mods.critAdd,
      dodge: mods.dodge,
      statusDur: mods.statusDur,
      cooldown: mods.cooldown,
      foeSpd: mods.foeSpd
    })
    total += Math.max(0, trace.foeMax - trace.foeHp)
  }
  return total
}
