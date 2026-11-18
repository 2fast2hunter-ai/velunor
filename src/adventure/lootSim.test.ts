import { describe, expect, it } from 'vitest'
import { beginAdventure, loadAdventure } from './save'
import { SAVE_KEY_V2 } from './const'
import { simulateRegion } from './lootSim'
import { meltDuplicate, workshopCost, craftSpecies } from './sources'
import { makeMon } from './save'
import type { StorageLike } from './types'

function memory(): StorageLike {
  const box = new Map<string, string>()
  return {
    getItem: (key) => box.get(key) ?? null,
    setItem: (key, value) => { box.set(key, value) },
    removeItem: (key) => { box.delete(key) }
  }
}

describe('lootbox L4 and L5', () => {
  it('keeps every monster and grants the thank-you once', () => {
    const storage = memory()
    storage.setItem(SAVE_KEY_V2, JSON.stringify({
      v: 2,
      saveVersion: 3,
      name: 'Ada',
      gold: 10,
      region: 1,
      chapter: 1,
      step: 2,
      team: ['u1', 'u2'],
      pc: ['u3'],
      mons: {
        u1: { species: 'm01', lvl: 40, exp: 1, hp: null, shiny: true, caughtAt: 1, caughtWhere: 'r1c1', keepDupes: false },
        u2: { species: 'm02', lvl: 12, exp: 0, hp: 3, shiny: false, caughtAt: 1, caughtWhere: 'r1c1', keepDupes: false },
        u3: { species: 'm01', lvl: 9, exp: 0, hp: null, shiny: false, caughtAt: 1, caughtWhere: 'r1c1', keepDupes: true }
      },
      badges: ['Kieselwappen', 'Ratsiegel'],
      bag: { crystals: { s: 0, m: 0, l: 0, xl: 0 }, fruits: { fang: 2, goldfang: 1, spuer: 0, neugier: 0, glanz: 0, lern: 0, muenz: 0 } },
      started: true,
      rng: 3,
      nextId: 4,
      regionsOpen: [1]
    }))
    const loaded = loadAdventure(storage, 50)
    expect(loaded?.saveVersion).toBe(8)
    expect(loaded?.mons.u1.lvl).toBe(40)
    expect(loaded?.mons.u1.shiny).toBe(true)
    expect(loaded?.mons.u2.hp).toBe(3)
    expect(loaded?.mons.u3.species).toBe('m01')
    expect(loaded?.gold).toBe(10 + 8000 + 15000)
    expect((loaded?.chests.silber ?? 0) + (loaded?.chests.gold ?? 0)).toBeGreaterThan(0)
    expect(loaded?.chestThanks).toBe(true)
    storage.setItem(SAVE_KEY_V2, JSON.stringify(loaded))
    const again = loadAdventure(storage, 80)
    expect(again?.chests.silber).toBe(loaded?.chests.silber)
    expect(again?.chests.gold).toBe(loaded?.chests.gold)
  })

  it('melts a spare copy into dust and crafts a missing species', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1)
    const spare = 'spare'
    save.mons[spare] = makeMon('m01', 1, 1, 'pc')
    save.pc.push(spare)
    save.nextId = 3
    expect(meltDuplicate(save, spare)).toBeNull()
    expect(save.mons[spare]).toBeUndefined()
    expect(save.dust).toBeGreaterThan(0)
    expect(workshopCost(0)).toBe(20)
    save.dust = workshopCost(0)
    expect(craftSpecies(save, 'm66', 2)).toBeNull()
    expect(Object.values(save.mons).some((mon) => mon.species === 'm66')).toBe(true)
  })

  it('reaches the day-7 and day-30 collection band', () => {
    const week = simulateRegion(1, 20261117).find((mark) => mark.day === 7)
    const month = simulateRegion(5, 20261117).find((mark) => mark.day === 30)
    expect(week && week.low / week.lowTotal).toBeGreaterThanOrEqual(0.85)
    expect(month && month.codex).toBeGreaterThanOrEqual(55)
    expect(month && month.codex).toBeLessThanOrEqual(85)
  })
})
