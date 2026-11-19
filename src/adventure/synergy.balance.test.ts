import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../rng'
import { fight1v1, type FightMods, type FightSide } from './battle'
import { ARENA_LEVEL, fighterFromSpecies } from './arena'
import { coopDamage } from './coop'
import {
  PURITY_FOUR,
  SYNERGIES,
  activeSynergies,
  purityOf,
  scaleSide,
  synergyMods,
  type SynergyMods
} from './synergy'

function arenaSide(): FightSide {
  const fighter = fighterFromSpecies('m01', false, 0, 0, 'a')
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
    level: ARENA_LEVEL
  }
}

function allyMods(mods: SynergyMods): FightMods {
  return {
    critAdd: mods.critAdd,
    dodge: mods.dodge,
    statusDur: mods.statusDur,
    cooldown: mods.cooldown,
    foeSpd: mods.foeSpd
  }
}

function foeMods(mods: SynergyMods): FightMods {
  return {
    foeCritAdd: mods.critAdd,
    foeDodge: mods.dodge,
    foeStatusDur: mods.statusDur,
    foeCooldown: mods.cooldown,
    allySpd: mods.foeSpd
  }
}

/** 200 mirrors. The bonus switches sides, so the first strike is not always the bonus. A win is a knockout. */
function mirrorWins(make: () => FightSide, mods: SynergyMods, purity = 0): number {
  let wins = 0
  for (let seed = 1; seed <= 200; seed++) {
    const bonusOnAlly = seed % 2 === 1
    const ally = make()
    const foe = make()
    foe.name = 'Spiegel'
    const boostedAlly = bonusOnAlly ? scaleSide(ally, mods, purity) : ally
    const boostedFoe = bonusOnAlly ? foe : scaleSide(foe, mods, purity)
    const trace = fight1v1(boostedAlly, boostedFoe, mulberry32(seed), false, null, bonusOnAlly ? allyMods(mods) : foeMods(mods))
    if (bonusOnAlly ? trace.foeKo : trace.allyKo) wins += 1
  }
  return wins
}

/** Arena level 100, identical monster, knockout wins out of 200. Power uses this column. */
const ARENA_WINS: Record<string, number> = {
  gewitter: 124,
  flaechenbrand: 129,
  wurzelgrund: 125,
  polarstrom: 125,
  bollwerk: 123,
  prisma: 124,
  zwielicht: 124,
  rudelkraft: 129,
  schwarmgift: 119,
  resonanz: 119,
  glutschwinge: 126,
  sturmlied: 124
}

describe('synergy mirror balance', () => {
  it('measures 200 arena mirrors and keeps the automatic order on those wins', () => {
    for (const row of SYNERGIES) {
      const mods = synergyMods([row], row.id === 'rudelkraft')
      const arena = mirrorWins(arenaSide, mods)
      expect(arena, row.id).toBe(ARENA_WINS[row.id])
      expect(arena, row.id).toBeGreaterThanOrEqual(110)
      expect(arena, row.id).toBeLessThanOrEqual(130)
      expect(row.power).toBe(ARENA_WINS[row.id])
    }
    const types = ['fire', 'fire', 'fire', 'fire', 'wind', 'dragon'] as const
    const pair = activeSynergies(types)
    const stacked = synergyMods(pair, false)
    expect(pair.map((row) => row.id).sort()).toEqual(['flaechenbrand', 'glutschwinge'])
    expect(mirrorWins(arenaSide, stacked)).toBe(134)
    expect(mirrorWins(arenaSide, stacked, purityOf(types, 'fire'))).toBe(145)
    expect(PURITY_FOUR).toBe(0.02)
    expect(145 / 200).toBeLessThanOrEqual(0.75)
    const boosted = coopDamage([
      fighterFromSpecies('m01', false, 0, 0, 'c'),
      fighterFromSpecies('m41', false, 0, 0, 'd')
    ], 'earth', 7, ['flaechenbrand'])
    const bare = coopDamage([
      fighterFromSpecies('m01', false, 0, 0, 'c'),
      fighterFromSpecies('m41', false, 0, 0, 'd')
    ], 'earth', 7, [])
    expect(boosted).toBeGreaterThanOrEqual(bare)
  })
})
