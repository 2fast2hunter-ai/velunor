import { describe, expect, it } from 'vitest'
import { SAVE_KEY_V2 } from './const'
import {
  BREED_MS,
  HATCH_MS,
  HORT_EP_RATE,
  RAT_2_BADGE,
  SHINY_PARENT_RATE,
  advanceHort,
  buyHortSlot,
  moveToHort
} from './hort'
import { beginAdventure, loadAdventure, makeMon } from './save'
import { awardCombatExp } from './sim'
import { SHINY_HORT_RATE } from './shiny'
import type { StorageLike } from './types'

function memory(): StorageLike {
  const box = new Map<string, string>()
  return {
    getItem: (key) => box.get(key) ?? null,
    setItem: (key, value) => { box.set(key, value) },
    removeItem: (key) => { box.delete(key) }
  }
}

describe('hort places', () => {
  it('sells slot 2 for 20000 and holds slot 3 and 4 behind the councils', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    expect(save.hortSlots).toBe(1)
    save.gold = 20_000
    expect(buyHortSlot(save)).toBeNull()
    expect(save.hortSlots).toBe(2)
    expect(save.gold).toBe(1500)
    save.gold = 120_000
    expect(buyHortSlot(save)).toMatch(/Hohen Rat 1/)
    save.badges.push('Ratsiegel')
    expect(buyHortSlot(save)).toBeNull()
    expect(save.hortSlots).toBe(3)
    save.gold = 500_000
    expect(buyHortSlot(save)).toMatch(/Hohen Rat 2/)
    save.badges.push(RAT_2_BADGE)
    expect(buyHortSlot(save)).toBeNull()
    expect(save.hortSlots).toBe(4)
    expect(SHINY_PARENT_RATE).toBe(0.1)
  })

  it('keeps one monster in the team', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    expect(moveToHort(save, save.team[0])).toMatch(/Team/)
    const extra = 'pc1'
    save.mons[extra] = makeMon('m01', 4, 2, 'r1c1')
    save.pc.push(extra)
    expect(moveToHort(save, extra)).toBeNull()
    expect(save.hort).toEqual([extra])
    expect(save.pc).not.toContain(extra)
  })
})

describe('hort growth and eggs', () => {
  it('gives hort monsters 30 percent of the combat EP rate, including offline', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    const guest = 'h1'
    save.mons[guest] = makeMon('m03', 5, 1, 'r1c1')
    save.hort = [guest]
    awardCombatExp(save, 99, 10, 0, save.team[0], { offline: false, trace: false }, 1_000)
    expect(save.mons[guest].exp).toBe(Math.round(8 * 10 * HORT_EP_RATE))
    save.mons[guest].exp = 0
    awardCombatExp(save, 99, 10, 0, save.team[0], { offline: true, trace: false }, 1_000)
    expect(save.mons[guest].exp).toBe(Math.round(8 * 10 * HORT_EP_RATE * 0.5))
  })

  it('lays an egg for two of the same type and hatches it at level 1', () => {
    const save = beginAdventure('Ada', 'A', 'm02', 1_000)
    save.hortSlots = 2
    save.mons.a = makeMon('m01', 3, 1, 'r1c1')
    save.mons.b = makeMon('m01', 4, 1, 'r1c1')
    save.hort = ['a', 'b']
    save.lastBreedAt = 1_000
    const rolls = [0, 0, 0.9]
    let index = 0
    advanceHort(save, 1_000 + BREED_MS, () => rolls[index++] ?? 0.9)
    expect(save.eggs).toHaveLength(1)
    expect(save.eggs[0].species).toBe('m01')
    expect(save.eggs[0].shiny).toBe(false)
    expect(save.eggs[0].readyAt).toBe(1_000 + BREED_MS + HATCH_MS)
    advanceHort(save, save.eggs[0].readyAt, () => 0.9)
    const baby = Object.values(save.mons).find((mon) => mon.lvl === 1 && mon.species === 'm01')
    expect(baby?.caughtWhere).toBe('hort')
    expect(baby?.shiny).toBe(false)
    expect(save.pc.some((uid) => save.mons[uid].lvl === 1)).toBe(true)
  })

  it('uses 1/10 when a parent shimmers and skips different types', () => {
    const save = beginAdventure('Ada', 'A', 'm02', 1_000)
    save.hortSlots = 2
    save.mons.a = makeMon('m01', 3, 1, 'r1c1', true)
    save.mons.b = makeMon('m01', 4, 1, 'r1c1')
    save.hort = ['a', 'b']
    save.lastBreedAt = 1_000
    const rolls = [0, 1, 0.05]
    let index = 0
    advanceHort(save, 1_000 + BREED_MS, () => rolls[index++] ?? 0.9)
    expect(save.eggs[0].shiny).toBe(true)
    expect(0.05 < SHINY_PARENT_RATE).toBe(true)
    expect(SHINY_HORT_RATE).toBeCloseTo(1 / 512)
    save.eggs = []
    save.mons.b = makeMon('m02', 4, 1, 'r1c2')
    save.lastBreedAt = 1_000
    advanceHort(save, 1_000 + BREED_MS, () => 0)
    expect(save.eggs).toHaveLength(0)
  })
})

describe('hort compatibility', () => {
  it('opens one free place on an older save', () => {
    const storage = memory()
    storage.setItem(SAVE_KEY_V2, JSON.stringify({
      v: 2,
      name: 'Ada',
      avatar: 'B',
      gold: 40,
      lastSeenAt: 80,
      region: 1,
      chapter: 1,
      step: 2,
      loop: true,
      lastHealStep: 1,
      badges: [],
      team: ['u1'],
      pc: [],
      buddy: 'u1',
      mons: { u1: makeMon('m03', 5, 1, 'r1c1') },
      dex: { m03: { seen: 1, caught: 1 } },
      settings: { speed: 1, autoSwitch: true, catchCard: true },
      stats: { wins: 0, catches: 0, dupes: 0 },
      rng: 8,
      nextId: 2,
      started: true,
      active: 'u1',
      loopsUntilRetry: 0,
      challengeNow: false,
      hold: false,
      log: [],
      migratedFrom: null,
      councilBeaten: [],
      regionsOpen: [1],
      bag: { crystals: { s: 1, m: 0, l: 0, xl: 0 }, fruits: { fang: 0, goldfang: 0, spuer: 0, neugier: 0, glanz: 0, lern: 0, muenz: 0 } },
      activeFruits: []
    }))
    const loaded = loadAdventure(storage, 90)
    expect(loaded?.gold).toBe(40)
    expect(loaded?.bag.crystals.s).toBe(1)
    expect(loaded?.hortSlots).toBe(1)
    expect(loaded?.hort).toEqual([])
    expect(loaded?.eggs).toEqual([])
    expect(loaded?.lastBreedAt).toBe(80)
  })
})
