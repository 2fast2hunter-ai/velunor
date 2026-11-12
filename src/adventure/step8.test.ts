import { describe, expect, it } from 'vitest'
import { species } from '../data'
import { regionRoster } from './dex'
import { hortOffer } from './hort'
import { LEGEND_SPECIES, battleRoster } from './origin'
import { chapterById, chapterFormula, continuedIndex, councilFormula, regionById, routeOf } from './route'
import { beginAdventure, makeMon } from './save'
import { chapterUnlocked, pickFighter, recordCouncilWin, travelTo } from './sim'

const RANGES: Record<number, [number, number]> = {
  2: [1, 4],
  3: [2, 6],
  4: [4, 7],
  5: [5, 7]
}

describe('regions 2 to 5', () => {
  it('continues the chapter and council formula', () => {
    for (const regionId of [2, 3, 4, 5]) {
      for (let chapterId = 1; chapterId <= 8; chapterId++) {
        const chapter = chapterById(regionId, chapterId)
        const n = continuedIndex(regionId, chapterId)
        const formula = chapterFormula(n)
        expect(chapter.levelMin).toBe(formula.levelMin)
        expect(chapter.levelMax).toBe(formula.levelMax)
        expect(chapter.cap).toBe(formula.cap)
        expect(chapter.guardian.gold).toBe(formula.gold)
        expect(chapter.guardian.team.map((mon) => mon.level)).toEqual([6 * n + 3, 6 * n + 4, 6 * n + 6])
        expect(chapter.day.reduce((sum, row) => sum + row.weight, 0)).toBe(100)
        expect(chapter.night.reduce((sum, row) => sum + row.weight, 0)).toBe(100)
      }
      const expected = councilFormula(regionId)
      const council = chapterById(regionId, 9).council
      expect(council?.members.map((member) => member.cap)).toEqual(expected.caps)
      expect(council?.members.map((member) => member.gold)).toEqual(expected.gold)
      expect(council?.rewardGold).toBe(expected.reward)
      expect(council?.members[4].epithet.startsWith('Großwächter')).toBe(true)
    }
    expect(councilFormula(1)).toEqual({ caps: [55, 58, 61, 64, 68], gold: [4000, 5000, 6000, 7000, 8000], reward: 25000 })
  })

  it('keeps road species in the rarity pool and legends in the Urgrund', () => {
    for (const regionId of [2, 3, 4, 5]) {
      const [low, high] = RANGES[regionId]
      for (const chapter of regionById(regionId).chapters) {
        if (chapter.special || chapter.council) continue
        const rows = [...chapter.day, ...chapter.night, ...(chapter.weather ?? []), ...chapter.guardian.team]
        for (const row of rows) {
          expect(LEGEND_SPECIES).not.toContain(row.species)
          expect(species(row.species).baseRarity).toBeGreaterThanOrEqual(low)
          expect(species(row.species).baseRarity).toBeLessThanOrEqual(high)
        }
        for (const row of chapter.weather ?? []) expect(row.pct).toBeGreaterThanOrEqual(5)
      }
    }
    const zone = chapterById(5, 10)
    expect(zone.special).toBe(true)
    expect(zone.tint).toBe('horst')
    expect([...zone.day.map((row) => row.species)].sort()).toEqual([...LEGEND_SPECIES].sort())
    expect(routeOf(10).slice(1).every((kind) => kind === 'wild')).toBe(true)
    for (const id of LEGEND_SPECIES) expect(regionRoster(5)).not.toContain(id)
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    save.region = 5
    save.regionsOpen.push(5)
    expect(chapterUnlocked(save, 10)).toBe(false)
    for (const id of regionRoster(5)) save.dex[id] = { seen: 1, caught: 1 }
    expect(chapterUnlocked(save, 10)).toBe(true)
    for (const id of regionRoster(5)) delete save.dex[id]
    expect(chapterUnlocked(save, 10)).toBe(false)
    save.badges.push('Fünftes Ratsiegel')
    expect(chapterUnlocked(save, 10)).toBe(true)
  })

  it('benches visitors after the first monster caught in the region', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    save.regionsOpen.push(2)
    save.region = 2
    expect(battleRoster(save)).toEqual(save.team)
    save.mons.local = makeMon('m05', 50, 1, 'r2c1')
    save.team.push('local')
    expect(battleRoster(save)).toEqual(['local'])
    expect(pickFighter(save, 'water')).toBe('local')
  })

  it('lets the second council open slot 4 and leaves Grünmark playable', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    save.badges.push('Ratsiegel')
    save.regionsOpen.push(2)
    save.region = 2
    save.chapter = 9
    save.step = 5
    save.gold = 0
    const won = recordCouncilWin(save, 1, true)
    expect(won.badge).toBe('Zweites Ratsiegel')
    expect(save.regionsOpen).toContain(3)
    expect(won.gold).toBe(14000 + 50000)
    save.hortSlots = 3
    expect(hortOffer(save)?.locked).toBeNull()
    expect(hortOffer(save)?.price).toBe(500000)
    expect(travelTo(save, 1, 1)).toBeNull()
    expect(save.region).toBe(1)
    expect(save.chapter).toBe(1)
    expect(travelTo(save, 4, 1)).toMatch(/zu/)
    expect(save.region).toBe(1)
  })
})
