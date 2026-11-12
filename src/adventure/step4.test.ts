import { describe, expect, it } from 'vitest'
import { nextFloat } from '../rng'
import { SAVE_KEY_V2 } from './const'
import { chapterById, routeOf } from './route'
import { beginAdventure, loadAdventure, makeMon } from './save'
import { awardCombatExp, catchChance, resolveEncounter } from './sim'
import {
  CRYSTALS,
  FIND_FRUIT_CHANCE,
  FRUIT_MS,
  FRUITS,
  applyFruitWeights,
  buyCrystal,
  crystalUnlocked,
  fruitActive,
  grantGold,
  rollFindFruit,
  sellCrystal,
  sellFruit,
  sellValue,
  useCrystal,
  useFruit,
  wappenCount
} from './shop'
import type { StorageLike } from './types'

function memory(): StorageLike {
  const box = new Map<string, string>()
  return {
    getItem: (key) => box.get(key) ?? null,
    setItem: (key, value) => { box.set(key, value) },
    removeItem: (key) => { box.delete(key) }
  }
}

describe('shop', () => {
  it('prices crystals and fruits and unlocks them by wappen count', () => {
    expect(CRYSTALS.map((item) => [item.id, item.exp, item.price, item.wappen])).toEqual([
      ['s', 500, 1000, 0],
      ['m', 8000, 12000, 3],
      ['l', 120000, 150000, 6],
      ['xl', 500000, 500000, 8]
    ])
    expect(FRUITS).toHaveLength(7)
    expect(sellValue(1000)).toBe(250)
    expect(sellValue(15000)).toBe(3750)
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    expect(wappenCount(save)).toBe(0)
    expect(crystalUnlocked(save, 's')).toBe(true)
    expect(crystalUnlocked(save, 'm')).toBe(false)
    expect(buyCrystal(save, 'm')).toMatch(/Wappen/)
    save.badges.push('Kieselwappen', 'Wellenwappen', 'Funkenwappen', 'Ratsiegel')
    expect(wappenCount(save)).toBe(3)
    expect(crystalUnlocked(save, 'm')).toBe(true)
    expect(crystalUnlocked(save, 'l')).toBe(false)
    save.gold = 1000
    expect(buyCrystal(save, 's')).toBeNull()
    expect(save.bag.crystals.s).toBe(1)
    expect(save.gold).toBe(0)
    expect(sellCrystal(save, 's')).toBeNull()
    expect(save.gold).toBe(250)
    expect(save.bag.crystals.s).toBe(0)
  })

  it('gives crystal EP and stops at the cap', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    save.gold = 1000
    buyCrystal(save, 's')
    const uid = save.team[0]
    expect(useCrystal(save, 's', uid, 99)).toBeNull()
    expect(save.mons[uid].lvl).toBe(6)
    expect(save.mons[uid].exp).toBe(500 - 263)
    save.mons[uid].lvl = 12
    save.mons[uid].exp = 0
    save.bag.crystals.s = 1
    expect(useCrystal(save, 's', uid, 12)).toMatch(/Cap/)
    expect(save.bag.crystals.s).toBe(1)
    expect(save.mons[uid].lvl).toBe(12)
  })

  it('resets a fruit hour instead of extending it', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    save.bag.fruits.lern = 2
    expect(useFruit(save, 'lern', 1_000)).toBeNull()
    expect(save.activeFruits[0].until).toBe(1_000 + FRUIT_MS)
    save.activeFruits[0].until = 1_000 + 10_000
    expect(useFruit(save, 'lern', 5_000)).toBeNull()
    expect(save.activeFruits).toHaveLength(1)
    expect(save.activeFruits[0].until).toBe(5_000 + FRUIT_MS)
    expect(fruitActive(save, 'lern', 5_000 + FRUIT_MS - 1)).toBe(true)
    expect(fruitActive(save, 'lern', 5_000 + FRUIT_MS)).toBe(false)
    expect(sellFruit(save, 'lern')).toMatch(/Nichts/)
  })
})

describe('fruit effects', () => {
  it('raises catch chance, combat EP and gold while a fruit is active', () => {
    expect(catchChance(0, 1, 5, 1.5, 0.7)).toBe(0.7)
    expect(catchChance(0, 1, 5, 1.25, 0.6)).toBe(0.6)
    expect(catchChance(9, 1, 5, 1.5, 0.7)).toBeCloseTo(0.03)
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    const uid = save.team[0]
    save.mons[uid].exp = 0
    awardCombatExp(save, 99, 10, 0, uid, { offline: false, trace: false }, 1_000)
    const plain = save.mons[uid].exp
    save.mons[uid].exp = 0
    save.activeFruits.push({ id: 'lern', until: 1_000 + FRUIT_MS })
    awardCombatExp(save, 99, 10, 0, uid, { offline: false, trace: false }, 1_000)
    expect(save.mons[uid].exp).toBe(Math.round(plain * 1.25))
    save.gold = 0
    expect(grantGold(save, 100, 1_000)).toBe(100)
    save.activeFruits.push({ id: 'muenz', until: 1_000 + FRUIT_MS })
    expect(grantGold(save, 100, 1_000)).toBe(125)
    expect(grantGold(save, 100, 1_000 + FRUIT_MS)).toBe(100)
  })

  it('doubles the two rarest species and triples ones never caught', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    const table = [
      { species: 'm66', weight: 40 },
      { species: 'm41', weight: 35 },
      { species: 'm11', weight: 20 },
      { species: 'm03', weight: 5 }
    ]
    save.activeFruits.push({ id: 'spuer', until: 10_000 })
    const sensed = applyFruitWeights(table, save, 1_000)
    const boosted = sensed.filter((row) => row.weight > table.find((item) => item.species === row.species)!.weight)
    expect(boosted.map((row) => row.species).sort()).toEqual(['m03', 'm11'])
    save.dex.m03 = { seen: 1, caught: 1 }
    save.activeFruits.push({ id: 'neugier', until: 10_000 })
    const curious = applyFruitWeights(table, save, 1_000)
    expect(curious.find((row) => row.species === 'm66')?.weight).toBe(40 * 3)
    expect(curious.find((row) => row.species === 'm03')?.weight).toBe(5 * 2)
  })

  it('finds a fruit on 30 percent of find nodes', () => {
    expect(FIND_FRUIT_CHANCE).toBe(0.3)
    expect(rollFindFruit(() => 0.3)).toBeNull()
    expect(rollFindFruit(() => 0)).toBeTruthy()
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    const step = routeOf(1).findIndex((kind, index) => index > 0 && kind === 'find')
    save.step = step
    let seed = 1
    for (; seed < 100; seed++) {
      const state = { seed }
      if (nextFloat(state) < 0.3) break
    }
    save.rng = seed
    const before = save.gold
    resolveEncounter(save, 1_000, { offline: false, trace: false })
    const fruits = Object.values(save.bag.fruits).reduce((sum, count) => sum + count, 0)
    expect(fruits).toBe(1)
    expect(save.gold).toBe(before + 50)
    expect(chapterById(1, 1).id).toBe(1)
  })
})

describe('bag compatibility', () => {
  it('fills an empty bag on an older v2 save', () => {
    const storage = memory()
    storage.setItem(SAVE_KEY_V2, JSON.stringify({
      v: 2,
      name: 'Ada',
      avatar: 'A',
      gold: 80,
      lastSeenAt: 5,
      region: 1,
      chapter: 2,
      step: 3,
      loop: true,
      lastHealStep: 1,
      badges: ['Kieselwappen'],
      team: ['u1'],
      pc: [],
      buddy: 'u1',
      mons: { u1: makeMon('m01', 8, 1, 'r1c1') },
      dex: { m01: { seen: 1, caught: 1 } },
      settings: { speed: 1, autoSwitch: true, catchCard: true },
      stats: { wins: 0, catches: 0, dupes: 0 },
      rng: 4,
      nextId: 3,
      started: true,
      active: 'u1',
      loopsUntilRetry: 0,
      challengeNow: false,
      hold: false,
      log: [],
      migratedFrom: null,
      councilBeaten: [],
      regionsOpen: [1]
    }))
    const loaded = loadAdventure(storage, 9)
    expect(loaded?.gold).toBe(80)
    expect(loaded?.chapter).toBe(2)
    expect(loaded?.bag.crystals).toEqual({ s: 0, m: 0, l: 0, xl: 0 })
    expect(loaded?.bag.fruits.fang).toBe(0)
    expect(loaded?.activeFruits).toEqual([])
  })
})
