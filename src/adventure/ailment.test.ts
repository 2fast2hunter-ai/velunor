import { describe, expect, it } from 'vitest'
import { species } from '../data'
import { ailmentFor, bossDuration, bossImmune } from './ailment'
import { fight1v1, type FightSide } from './battle'
import { ENCOUNTER_MS } from './const'

function side(id: string, level: number, hp: number, atk: number, spd = 100, boss = false): FightSide {
  const sp = species(id)
  return {
    speciesId: id, name: sp.name, type: sp.type, maxHp: hp, hp, atk, def: 30, spd,
    skill: { ...sp.skill, initialCooldown: 99, cooldown: 99 },
    passive: null, level, boss
  }
}

describe('battle ailments', () => {
  it('follows the table: fire jabs stay clean, water soaks, bosses shrug off their own mark', () => {
    expect(ailmentFor('fire', 'strike')).toBeNull()
    expect(ailmentFor('fire', 'ult')).toBe('brand')
    expect(ailmentFor('water', 'strike')).toBe('naesse')
    expect(ailmentFor('wind', 'strike')).toBe('spreu')
    expect(ailmentFor('insect', 'skill')).toBe('spreu')
    expect(bossDuration(3, false)).toBe(3)
    expect(bossDuration(3, true)).toBe(2)
    expect(bossDuration(1, true)).toBe(1)
    expect(bossImmune('fire', 'brand')).toBe(true)
    expect(bossImmune('water', 'brand')).toBe(false)
    const plain = fight1v1(side('m01', 1, 4000, 20, 200), side('m10', 1, 4000, 20, 1), () => 0.99, true)
    expect(plain.frames.some((frame) => frame.foeMark === 'brand')).toBe(false)
    const soaked = fight1v1(side('m02', 1, 4000, 20, 200), side('m10', 1, 4000, 20, 1), () => 0.99, true)
    expect(soaked.frames.some((frame) => frame.foeMark === 'naesse')).toBe(true)
    const immune = fight1v1(side('m01', 25, 6000, 30, 200), side('m01', 1, 6000, 10, 1, true), () => 0.99, true)
    expect(immune.frames.some((frame) => frame.foeMark === 'brand')).toBe(false)
  })

  it('puts the mark on the monster that was hit, not on the attacker', () => {
    const soaked = fight1v1(side('m02', 1, 4000, 20, 200), side('m10', 1, 4000, 20, 1), () => 0.99, true)
    expect(soaked.frames.some((frame) => frame.foeMark === 'naesse')).toBe(true)
    expect(soaked.frames.some((frame) => frame.allyMark === 'naesse')).toBe(false)
    const branded = fight1v1(side('m01', 25, 6000, 30, 200), side('m10', 1, 6000, 20, 1), () => 0.99, true)
    expect(branded.frames.some((frame) => frame.foeMark === 'brand')).toBe(true)
    expect(branded.frames.some((frame) => frame.allyMark === 'brand')).toBe(false)
  })

  it('stacks Giftnebel to 3 and keeps the encounter clock', () => {
    const trace = fight1v1(side('m14', 1, 8000, 15, 200), side('m10', 1, 8000, 10, 1), () => 0.99, true)
    const stacks = trace.frames.map((frame) => frame.foeStacks ?? 0)
    expect(Math.max(...stacks)).toBe(3)
    expect(ENCOUNTER_MS[1]).toBe(2800)
  })
})
