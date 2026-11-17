import { describe, expect, it } from 'vitest'
import { species } from '../data'
import { fight1v1, rawDamage, type FightSide } from './battle'
import { ENCOUNTER_MS } from './const'
import { ULT_DAMAGE, ULT_PATTERNS, ULT_PIERCE, ULT_SEGMENTS, ultPattern, ultReady, ultUnlocked } from './ult'
import { weatherFactor } from './weather'

function side(id: string, level: number, hp: number, atk: number, spd = 100): FightSide {
  const sp = species(id)
  return {
    speciesId: id,
    name: sp.name,
    type: sp.type,
    maxHp: hp,
    hp,
    atk,
    def: 20,
    spd,
    skill: { ...sp.skill, initialCooldown: 99, cooldown: 99 },
    passive: null,
    level
  }
}

describe('ultimates', () => {
  it('unlocks at level 25 and spreads the five patterns evenly', () => {
    expect(ultUnlocked(24)).toBe(false)
    expect(ultUnlocked(25)).toBe(true)
    expect(ultReady(24, 5)).toBe(false)
    expect(ultReady(25, 4)).toBe(false)
    expect(ultReady(25, 5)).toBe(true)
    const counts = Object.fromEntries(ULT_PATTERNS.map((name) => [name, 0])) as Record<string, number>
    for (let n = 1; n <= 100; n++) counts[ultPattern(`m${String(n).padStart(2, '0')}`)] += 1
    expect(counts).toEqual({ durchschlag: 20, schildwall: 20, impuls: 20, fessel: 20, heilleucht: 20 })
    expect(ultPattern('m01')).toBe('durchschlag')
  })

  it('spends five attacks on the next swing and keeps level 24 on the normal hit', () => {
    const foe = side('m02', 25, 5000, 1, 1)
    const young = fight1v1(side('m01', 24, 5000, 40, 200), foe, () => 0.9, true)
    const grown = fight1v1(side('m01', 25, 5000, 40, 200), { ...foe }, () => 0.9, true)
    const ults = (trace: typeof grown) => trace.frames.flatMap((frame) => frame.hits ?? []).filter((hit) => hit.from === 'ally' && hit.ult)
    expect(ults(young)).toHaveLength(0)
    expect(ults(grown).some((hit) => hit.ult === 'durchschlag')).toBe(true)
    expect(grown.frames.some((frame) => (frame.allyUlt ?? 0) >= ULT_SEGMENTS) || ults(grown).length > 0).toBe(true)
  })

  it('hits harder with pierce and still takes the weather factor', () => {
    const plain = rawDamage(80, 40, 1, 1, false, 1)
    const ult = rawDamage(80, 40, ULT_DAMAGE, 1, false, 1)
    const pierced = rawDamage(80, 40 * (1 - ULT_PIERCE), ULT_DAMAGE, 1, false, 1)
    expect(ult).toBeGreaterThan(plain)
    expect(pierced).toBeGreaterThan(ult)
    const wet = fight1v1(side('m01', 25, 4000, 50, 200), side('m02', 1, 8000, 1, 1), () => 0.9, true, 'regen')
    const dry = fight1v1(side('m01', 25, 4000, 50, 200), side('m02', 1, 8000, 1, 1), () => 0.9, true, null)
    const amount = (trace: typeof wet) => trace.frames.flatMap((frame) => frame.hits ?? []).find((hit) => hit.ult === 'durchschlag')?.amount ?? 0
    expect(weatherFactor('regen', 'fire')).toBe(0.85)
    expect(amount(wet)).toBeLessThan(amount(dry))
  })

  it('heals a quarter without the weather factor and the road clock stays one encounter', () => {
    const healer = side('m05', 25, 1000, 10, 200)
    const rain = fight1v1(healer, side('m02', 1, 8000, 1, 1), () => 0.9, true, 'regen')
    const clear = fight1v1({ ...healer, hp: 1000 }, side('m02', 1, 8000, 1, 1), () => 0.9, true, null)
    const heal = (trace: typeof rain) => trace.frames.flatMap((frame) => frame.hits ?? []).find((hit) => hit.ult === 'heilleucht')
    expect(heal(rain)?.amount).toBe(Math.floor(1000 * 0.25))
    expect(heal(rain)?.amount).toBe(heal(clear)?.amount)
    expect(ENCOUNTER_MS[1]).toBe(2800)
  })

  it('keeps a short fight near the old length and reports the long one', () => {
    const meanFrames = (level: number, foeHp: number) => {
      let total = 0
      const runs = 20
      for (let i = 0; i < runs; i++) {
        const trace = fight1v1(side('m01', level, 4000, 70, 130), side('m10', 20, foeHp, 22, 80), () => 0.15 + (i % 7) * 0.1, true)
        total += trace.frames.length
      }
      return total / runs
    }
    const shortYoung = meanFrames(24, 280)
    const shortGrown = meanFrames(25, 280)
    const longYoung = meanFrames(24, 2200)
    const longGrown = meanFrames(25, 2200)
    expect(shortGrown).toBe(shortYoung)
    expect(longGrown).toBe(longYoung)
    expect(longGrown).toBeLessThanOrEqual(32)
  })
})
