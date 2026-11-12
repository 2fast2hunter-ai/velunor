import { describe, expect, it } from 'vitest'
import { SAVE_KEY_V2 } from './const'
import { equipFrame, equipTitle, equippedFrame, equippedTitle, GOALS, syncAchievements } from './achievements'
import { beginAdventure, loadAdventure, makeMon } from './save'
import type { StorageLike } from './types'

function memory(): StorageLike {
  const box = new Map<string, string>()
  return {
    getItem: (key) => box.get(key) ?? null,
    setItem: (key, value) => { box.set(key, value) },
    removeItem: (key) => { box.delete(key) }
  }
}

describe('achievements', () => {
  it('lists about 60 goals, including the published examples', () => {
    expect(GOALS).toHaveLength(60)
    const ids = GOALS.map((goal) => goal.id)
    expect(new Set(ids).size).toBe(60)
    for (const id of ['win-10', 'win-100', 'win-1000', 'catch-10', 'catch-100', 'catch-500', 'egg-10', 'egg-50', 'shiny-1', 'shiny-10', 'region-1', 'region-2', 'badge-Kieselwappen', 'type-fire', 'hort-4']) {
      expect(ids).toContain(id)
    }
    expect(GOALS.every((goal) => goal.gold > 0 && goal.title && goal.frame)).toBe(true)
  })

  it('pays gold and a title once when a goal is met', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    save.stats.wins = 10
    const gold = save.gold
    const first = syncAchievements(save)
    expect(first).toContain('win-10')
    expect(save.gold).toBe(gold + 500)
    expect(syncAchievements(save)).not.toContain('win-10')
    expect(save.gold).toBe(gold + 500)
    equipTitle(save, 'win-10')
    equipFrame(save, 'win-10')
    expect(equippedTitle(save)).toBe('Wegbereiter')
    expect(equippedFrame(save)).toBe('gold')
  })

  it('keeps later goals closed until their content exists', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    const closed = ['region-2', 'hort-4', 'type-dragon']
    for (const id of closed) expect(GOALS.find((goal) => goal.id === id)?.met(save)).toBe(false)
    save.hortSlots = 4
    expect(GOALS.find((goal) => goal.id === 'hort-4')?.met(save)).toBe(true)
  })

  it('counts an existing shimmer when an older save has no shimmer stat', () => {
    const storage = memory()
    const mon = makeMon('m01', 5, 1, 'r1c1', true)
    storage.setItem(SAVE_KEY_V2, JSON.stringify({
      v: 2,
      name: 'Ada',
      avatar: 'A',
      gold: 15,
      lastSeenAt: 4,
      region: 1,
      chapter: 1,
      step: 1,
      loop: true,
      lastHealStep: 1,
      badges: [],
      team: ['u1'],
      pc: [],
      buddy: 'u1',
      mons: { u1: mon },
      dex: { m01: { seen: 1, caught: 1 } },
      settings: { speed: 1, autoSwitch: true, catchCard: true },
      stats: { wins: 12, catches: 1, dupes: 0 },
      rng: 3,
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
      lastBreedAt: 4
    }))
    const loaded = loadAdventure(storage, 9)
    expect(loaded?.stats.shinies).toBe(1)
    expect(loaded?.stats.eggs).toBe(0)
    expect(loaded?.stats.wins).toBe(12)
    expect(loaded?.claimed).toEqual([])
    const granted = syncAchievements(loaded!)
    expect(granted).toContain('shiny-1')
    expect(granted).toContain('win-10')
    expect(loaded?.mons.u1.shiny).toBe(true)
  })
})
