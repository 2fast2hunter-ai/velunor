import { describe, expect, it } from 'vitest'
import { species } from '../data'
import { SAVE_KEY_V2 } from './const'
import { chapterCapNow, councilChapter, dexPlaces, dexStatus, listCodex, regionProgress, regionRoster } from './dex'
import { chapterById, chapterFormula, regionById } from './route'
import { beginAdventure, loadAdventure, makeMon } from './save'
import { chapterUnlocked, recordCouncilWin, resolveEncounter } from './sim'
import type { StorageLike } from './types'

function memory(): StorageLike {
  const box = new Map<string, string>()
  return {
    getItem: (key) => box.get(key) ?? null,
    setItem: (key, value) => { box.set(key, value) },
    removeItem: (key) => { box.delete(key) }
  }
}

describe('chapters 4 to 8', () => {
  it('follows the chapter formula and reuses the three plates', () => {
    const names = ['Moorsenke', 'Felsklamm', 'Sturmhöhe', 'Frostgrat', 'Klingenschmiede']
    const tints = ['moor', 'fels', 'sturm', 'frost', 'schmiede']
    for (let n = 4; n <= 8; n++) {
      const chapter = chapterById(1, n)
      const formula = chapterFormula(n)
      expect(chapter.name).toBe(names[n - 4])
      expect(chapter.levelMin).toBe(formula.levelMin)
      expect(chapter.levelMax).toBe(formula.levelMax)
      expect(chapter.cap).toBe(formula.cap)
      expect(chapter.guardian.gold).toBe(formula.gold)
      expect(chapter.guardian.team.map((mon) => mon.level)).toEqual([6 * n + 3, 6 * n + 4, 6 * n + 6])
      expect(['wiese', 'bach', 'wald']).toContain(chapter.scene)
      expect(chapter.tint).toBe(tints[n - 4])
      const spawns = [...chapter.day, ...chapter.night]
      expect(chapter.day.reduce((sum, row) => sum + row.weight, 0)).toBe(100)
      expect(chapter.night.reduce((sum, row) => sum + row.weight, 0)).toBe(100)
      for (const row of spawns) expect(species(row.species).baseRarity).toBeLessThanOrEqual(3)
    }
  })

  it('adds one or two new species and keeps one rarity-3 species to the night', () => {
    const seen = new Set<string>()
    const remember = (n: number) => {
      const chapter = chapterById(1, n)
      for (const row of [...chapter.day, ...chapter.night, ...chapter.guardian.team]) seen.add(row.species)
    }
    for (let n = 1; n <= 3; n++) remember(n)
    for (let n = 4; n <= 8; n++) {
      const chapter = chapterById(1, n)
      const day = new Set(chapter.day.map((row) => row.species))
      const nightOnly = chapter.night.filter((row) => !day.has(row.species))
      const rare = nightOnly.filter((row) => species(row.species).baseRarity === 3)
      expect(rare).toHaveLength(1)
      expect(chapter.day.some((row) => species(row.species).baseRarity === 3)).toBe(false)
      const fresh = [...new Set([...chapter.day, ...chapter.night].map((row) => row.species))].filter((id) => !seen.has(id))
      expect(fresh.length).toBeGreaterThanOrEqual(1)
      expect(fresh.length).toBeLessThanOrEqual(2)
      remember(n)
    }
  })

  it('opens chapter 4 only after the Funkenwappen', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    expect(chapterUnlocked(save, 4)).toBe(false)
    save.badges.push('Funkenwappen')
    expect(chapterUnlocked(save, 4)).toBe(true)
    expect(chapterUnlocked(save, 9)).toBe(false)
    save.badges.push('Klingenwappen')
    expect(chapterUnlocked(save, 9)).toBe(true)
  })
})

describe('Hoher Rat', () => {
  it('lines up five fights with the published caps', () => {
    const council = councilChapter().council
    expect(council?.members.map((member) => member.cap)).toEqual([55, 58, 61, 64, 68])
    expect(council?.rewardGold).toBe(25000)
    expect(council?.members[4].epithet).toBe('Großwächter')
    expect(chapterCapNow(beginAdventure('Ada', 'A', 'm01', 1), chapterById(1, 4))).toBe(30)
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    save.chapter = 9
    save.step = 1
    expect(chapterCapNow(save, councilChapter())).toBe(55)
    save.step = 5
    expect(chapterCapNow(save, councilChapter())).toBe(68)
  })

  it('sends a loss back to Rat 1', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    save.chapter = 9
    save.step = 4
    save.mons[save.team[0]].lvl = 1
    save.mons[save.team[0]].hp = 1
    const outcome = resolveEncounter(save, 1_000, { offline: false, trace: false })
    expect(outcome.win).toBe(false)
    expect(save.step).toBe(1)
    expect(save.badges).not.toContain('Ratsiegel')
  })

  it('pays half gold on a repeat and 25000 G once the seal is new', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    save.chapter = 9
    save.step = 1
    save.gold = 0
    expect(recordCouncilWin(save, 1, true).gold).toBe(4000)
    save.step = 1
    expect(recordCouncilWin(save, 1, true).gold).toBe(2000)
    save.step = 2
    recordCouncilWin(save, 1, true)
    save.step = 3
    recordCouncilWin(save, 1, true)
    save.step = 4
    recordCouncilWin(save, 1, true)
    save.step = 5
    const grand = recordCouncilWin(save, 1, true)
    expect(grand.gold).toBe(8000 + 25000)
    expect(grand.badge).toBe('Ratsiegel')
    expect(save.regionsOpen).toContain(2)
    expect(regionById(2).name).toBe('Frostküste')
    expect(regionById(2).chapters.length).toBeGreaterThan(0)
    save.step = 1
    expect(recordCouncilWin(save, 1, true).gold).toBe(4000)
  })
})

describe('codex', () => {
  it('keeps four statuses, filters, and night-only places', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    expect(listCodex(save, { q: '', type: '', rarity: '', shiny: '' })).toHaveLength(100)
    expect(dexStatus(save, 'm01')).toBe('owned')
    expect(dexStatus(save, 'm66')).toBe('missing')
    save.dex.m66 = { seen: 2, caught: 0 }
    expect(dexStatus(save, 'm66')).toBe('seen')
    save.dex.m66.caught = 1
    expect(dexStatus(save, 'm66')).toBe('released')
    save.mons.x = makeMon('m66', 4, 1, 'r1c1')
    expect(dexStatus(save, 'm66')).toBe('owned')
    save.mons.x.shiny = true
    const shining = listCodex(save, { q: '', type: '', rarity: '', shiny: '1' }).map((mon) => mon.id)
    expect(shining).toEqual(['m66'])
    expect(listCodex(save, { q: 'fuchs', type: 'fire', rarity: '0', shiny: '' }).map((mon) => mon.id)).toContain('m01')
    const veil = dexPlaces('m84').find((place) => place.chapter === 'Moorsenke')
    expect(veil?.when).toBe('nur nachts')
    const jelly = dexPlaces('m15').find((place) => place.chapter === 'Moorsenke')
    expect(jelly?.when).toBe('nur tags')
    const before = regionProgress(save, 1).caught
    save.dex.m84 = { seen: 1, caught: 1 }
    expect(regionProgress(save, 1).caught).toBe(before + 1)
    expect(regionRoster(1).length).toBe(regionProgress(save, 1).total)
    expect(regionProgress(save, 2).open).toBe(false)
    expect(regionProgress(save, 2).total).toBeGreaterThan(0)
    expect(dexPlaces('m84').some((place) => place.when === 'direkt hintereinander')).toBe(true)
  })
})

describe('v2 compatibility', () => {
  it('keeps a step-1 save and fills the new fields', () => {
    const storage = memory()
    storage.setItem(SAVE_KEY_V2, JSON.stringify({
      v: 2,
      name: 'Ada',
      avatar: 'A',
      gold: 4200,
      lastSeenAt: 10,
      region: 1,
      chapter: 3,
      step: 6,
      loop: true,
      lastHealStep: 7,
      badges: ['Kieselwappen', 'Wellenwappen'],
      team: ['u1'],
      pc: [],
      buddy: 'u1',
      mons: { u1: { species: 'm02', lvl: 11, exp: 4, hp: 20, shiny: false, caughtAt: 1, caughtWhere: 'r1c1', keepDupes: false } },
      dex: { m02: { seen: 1, caught: 1 } },
      settings: { speed: 2, autoSwitch: true, catchCard: false },
      stats: { wins: 3, catches: 1, dupes: 0 },
      rng: 99,
      nextId: 4,
      started: true,
      active: 'u1',
      loopsUntilRetry: 2,
      challengeNow: false,
      hold: false,
      log: [],
      migratedFrom: null
    }))
    const loaded = loadAdventure(storage, 50)
    expect(loaded?.chapter).toBe(3)
    expect(loaded?.step).toBe(6)
    expect(loaded?.gold).toBe(4200)
    expect(loaded?.mons.u1.lvl).toBe(11)
    expect(loaded?.mons.u1.hp).toBe(20)
    expect(loaded?.settings.speed).toBe(2)
    expect(loaded?.badges).toEqual(['Kieselwappen', 'Wellenwappen'])
    expect(loaded?.councilBeaten).toEqual([])
    expect(loaded?.regionsOpen).toEqual([1])
    expect(loaded?.v).toBe(2)
  })
})
