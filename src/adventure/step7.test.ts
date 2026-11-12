import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../rng'
import { SAVE_KEY_V2 } from './const'
import { beginAdventure, loadAdventure, makeMon } from './save'
import type { StorageLike } from './types'
import {
  MARK_GOLD,
  PRIZES,
  SPIN_COST,
  buyPrize,
  drawSymbol,
  exactPayoutRate,
  scoreSymbols,
  spinWheel,
  wheelOpen,
  type SymbolId
} from './wheel'

function memory(): StorageLike {
  const box = new Map<string, string>()
  return {
    getItem: (key) => box.get(key) ?? null,
    setItem: (key, value) => { box.set(key, value) },
    removeItem: (key) => { box.delete(key) }
  }
}

function openWheel() {
  const save = beginAdventure('Ada', 'A', 'm01', 1)
  save.badges.push('Kieselwappen', 'Wellenwappen', 'Funkenwappen')
  return save
}

describe('glücksrad', () => {
  it('stays shut until the third crest', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    save.gold = 5000
    expect(wheelOpen(save)).toBe(false)
    expect(spinWheel(save, 1)).toBe('Das Glücksrad öffnet nach dem dritten Wappen.')
    expect(save.gold).toBe(5000)
    save.badges.push('Kieselwappen', 'Wellenwappen')
    expect(wheelOpen(save)).toBe(false)
    save.badges.push('Funkenwappen')
    expect(wheelOpen(save)).toBe(true)
  })

  it('pays the published mark table and scales the stake', () => {
    expect(scoreSymbols(['stern', 'stern', 'stern'])).toBe(200)
    expect(scoreSymbols(['mond', 'mond', 'mond'])).toBe(60)
    expect(scoreSymbols(['krone', 'krone', 'krone'])).toBe(25)
    expect(scoreSymbols(['blatt', 'blatt', 'blatt'])).toBe(12)
    expect(scoreSymbols(['tropfen', 'tropfen', 'tropfen'])).toBe(8)
    expect(scoreSymbols(['funke', 'funke', 'funke'])).toBe(5)
    expect(scoreSymbols(['stern', 'stern', 'mond'])).toBe(2)
    expect(scoreSymbols(['stern', 'mond', 'krone'])).toBe(1)
    expect(scoreSymbols(['mond', 'krone', 'blatt'])).toBe(0)

    const save = openWheel()
    save.gold = 20_000
    const spun = spinWheel(save, 10, () => 0)
    expect(typeof spun).not.toBe('string')
    if (typeof spun === 'string') return
    expect(spun.symbols).toEqual(['stern', 'stern', 'stern'])
    expect(spun.marks).toBe(2000)
    expect(save.gold).toBe(20_000 - SPIN_COST * 10)
    expect(save.marks).toBe(2000)
  })

  it('returns about 85 percent of the stake when marks are valued at the balancing rate', () => {
    const exact = exactPayoutRate()
    expect(exact).toBeGreaterThan(0.845)
    expect(exact).toBeLessThan(0.855)

    const rng = mulberry32(7265234)
    const spins = 200_000
    let marks = 0
    for (let i = 0; i < spins; i++) {
      const symbols: [SymbolId, SymbolId, SymbolId] = [drawSymbol(rng), drawSymbol(rng), drawSymbol(rng)]
      marks += scoreSymbols(symbols)
    }
    const measured = (marks / spins) * MARK_GOLD / SPIN_COST
    expect(measured).toBeGreaterThan(0.84)
    expect(measured).toBeLessThan(0.86)
    expect(PRIZES.find((prize) => prize.species === 'm22')?.marks).toBe(300)
    expect(PRIZES.find((prize) => prize.species === 'm44')?.marks).toBe(500)
    expect(PRIZES.find((prize) => prize.species === 'm98')?.marks).toBe(1500)
  })

  it('sells a prize into the PC and keeps later regions shut', () => {
    const save = openWheel()
    save.marks = 300
    expect(buyPrize(save, 'm98', 5)).toMatch(/später/)
    expect(save.marks).toBe(300)
    expect(buyPrize(save, 'm22', 5)).toBeNull()
    expect(save.marks).toBe(0)
    const mon = Object.values(save.mons).find((row) => row.species === 'm22')
    expect(mon).toMatchObject({ lvl: 5, shiny: false, caughtWhere: 'rad' })
    expect(save.pc).toContain(Object.keys(save.mons).find((uid) => save.mons[uid].species === 'm22'))
    expect(save.dex.m22).toEqual({ seen: 1, caught: 1 })
    save.marks = 300
    expect(buyPrize(save, 'm22', 6)).toBe('Schon im Besitz.')
    expect(save.marks).toBe(300)
  })

  it('keeps an older save and starts its marks at zero', () => {
    const storage = memory()
    storage.setItem(SAVE_KEY_V2, JSON.stringify({
      v: 2,
      name: 'Ada',
      avatar: 'A',
      gold: 40,
      lastSeenAt: 4,
      region: 1,
      chapter: 3,
      step: 4,
      loop: true,
      lastHealStep: 1,
      badges: ['Kieselwappen'],
      team: ['u1'],
      pc: [],
      buddy: 'u1',
      mons: { u1: makeMon('m01', 8, 1, 'r1c1') },
      dex: { m01: { seen: 1, caught: 1 } },
      settings: { speed: 1, autoSwitch: true, catchCard: true },
      stats: { wins: 3, catches: 1, dupes: 0, eggs: 0, shinies: 0, fruitsUsed: 0, crystalsUsed: 0 },
      rng: 9,
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
      bag: { crystals: { s: 0, m: 0, l: 0, xl: 0 }, fruits: { fang: 0, goldfang: 0, spuer: 0, neugier: 0, glanz: 0, lern: 0, muenz: 0 } },
      activeFruits: [],
      hortSlots: 1,
      hort: [],
      eggs: [],
      lastBreedAt: 4,
      claimed: [],
      equippedTitle: null,
      equippedFrame: null
    }))
    const loaded = loadAdventure(storage, 9)
    expect(loaded?.marks).toBe(0)
    expect(loaded?.gold).toBe(40)
    expect(loaded?.mons.u1.lvl).toBe(8)
  })
})
