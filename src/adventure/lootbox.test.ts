import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../rng'
import { t } from './i18n'
import { applyChest, takeChests } from './chests'
import {
  RATES_HINT,
  chestParticles,
  duplicateExp,
  effectiveTable,
  enteredRegions,
  features,
  foldRates,
  formatPercent,
  openChest,
  poolFor,
  speciesInRegion
} from './lootbox'
import { SAVE_KEY_V2, SAVE_VERSION, START_GOLD } from './const'
import { beginAdventure, loadAdventure, makeMon } from './save'
import { expToNext } from './stats'
import { gameHtml, type CodexQuery, type PcQuery } from './view'
import type { StorageLike } from './types'

function memory(): StorageLike {
  const box = new Map<string, string>()
  return {
    getItem: (key) => box.get(key) ?? null,
    setItem: (key, value) => { box.set(key, value) },
    removeItem: (key) => { box.delete(key) }
  }
}

const pc: PcQuery = { q: '', type: '', rarity: '', shiny: '', sort: 'newest', dir: -1 }
const dex: CodexQuery = { q: '', type: '', rarity: '', shiny: '' }

describe('lootbox L1', () => {
  it('keeps pity off and shows the file text', () => {
    expect(features.pity).toBe(true)
    expect(t('de', 'chest.hint')).toBe(RATES_HINT)
    expect(chestParticles(6, false)).toBe(0)
    expect(chestParticles(7, false)).toBe(40)
    expect(chestParticles(9, true)).toBe(0)
  })

  it('steps a missing rarity down, otherwise up', () => {
    const down = foldRates([10, 0, 5, 0, 0, 0, 0, 0, 0, 0], [0, 3, 2, 0, 0, 0, 0, 0, 0, 0])
    expect(down[0]).toBe(0)
    expect(down[1]).toBe(10)
    const up = foldRates([8, 0, 0, 4, 0, 0, 0, 0, 0, 0], [0, 0, 0, 2, 0, 0, 0, 0, 0, 0])
    expect(up[0]).toBe(0)
    expect(up[3]).toBe(12)
  })

  it('gives a new monster level 1 and a duplicate two levels of EP', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    save.stats.catches = 4
    save.mons[save.team[0]].lvl = 10
    save.mons[save.team[0]].exp = 0
    const added = duplicateExp(10)
    expect(added).toBe(expToNext(10) + expToNext(11))
    const dupe = applyChest(save, { speciesId: 'm01', rarity: 0, isNew: false, gold: 120, pity: 0 }, 2_000)
    expect(dupe.place).toBe('exp')
    expect(save.mons[save.team[0]].lvl).toBe(10)
    expect(save.shards.m01).toBe(5)
    expect(save.gold).toBe(START_GOLD + 120)
    const fresh = applyChest(save, { speciesId: 'm66', rarity: 0, isNew: true, gold: 50, pity: 0 }, 3_000)
    expect(fresh.place).toBe('team')
    expect(save.mons[save.team[1]].lvl).toBe(1)
    while (save.team.length < 6) {
      const uid = `pad${save.team.length}`
      save.mons[uid] = makeMon('m02', 1, 4_000, 'test')
      save.team.push(uid)
    }
    const parked = applyChest(save, { speciesId: 'm11', rarity: 0, isNew: true, gold: 10, pity: 0 }, 5_000)
    expect(parked.place).toBe('pc')
    expect(save.pc.some((uid) => save.mons[uid]?.species === 'm11')).toBe(true)
    expect(save.stats.catches).toBe(7)
    expect(save.stats.chestsOpened).toBe(3)
  })

  it('opens only the region-1 pool and stays within 0.1 points of the effective rates', () => {
    const region1 = new Set(speciesInRegion(1))
    const elsewhere = speciesInRegion(2).filter((id) => !region1.has(id))
    expect(elsewhere.length).toBeGreaterThan(0)
    const pool = poolFor([1])
    for (const id of pool) expect(region1.has(id)).toBe(true)
    for (const id of elsewhere) expect(pool).not.toContain(id)
    const state = { unlockedRegions: [1], ownedSpecies: [] as string[], region: 1 }
    for (const tier of ['kiesel', 'silber', 'gold', 'sternen'] as const) {
      const table = effectiveTable(tier, pool)
      const counts = new Array(10).fill(0)
      const rng = mulberry32(20261117)
      const trials = 1_000_000
      let foreign = 0
      for (let i = 0; i < trials; i++) {
        const roll = openChest(tier, state, rng)
        if (!region1.has(roll.speciesId)) foreign += 1
        counts[roll.rarity] += 1
      }
      expect(foreign).toBe(0)
      for (const row of table) {
        const seen = (counts[row.rarity] / trials) * 100
        expect(Math.abs(seen - row.percent)).toBeLessThanOrEqual(0.1)
      }
    }
  }, 120_000)

  it('prints the same percentages the simulation uses', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    expect(enteredRegions(save)).toEqual([1])
    const html = gameHtml(save, 'activities', 1_000, pc, dex, null, false, false, { kind: 'chest-rates', tier: 'kiesel' }, save.step, { tab: 'chests', mult: 1, symbols: null, note: '' })
    const table = effectiveTable('kiesel', poolFor(enteredRegions(save)))
    for (const row of table) {
      expect(html).toContain(`data-rate="${row.rarity}">${formatPercent(row.percent)} %`)
      for (const entry of row.species) {
        expect(html).toContain(`data-chance="${entry.id}">${formatPercent(entry.chance)} %`)
      }
    }
    expect(html).toContain(RATES_HINT)
    expect(html).toContain('class="chest-info"')
    const css = readFileSync(new URL('./adventure.css', import.meta.url), 'utf8')
    expect(css).toMatch(/\.chest-info[^{]*\{[^}]*min-width:\s*132px/)
    expect(css).toMatch(/\.chest-info[^{]*\{[^}]*min-height:\s*132px/)
  })

  it('gives an old save the start chests once and does not raise saveVersion', () => {
    const storage = memory()
    storage.setItem(SAVE_KEY_V2, JSON.stringify({
      v: 2,
      saveVersion: 3,
      name: 'Ada',
      avatar: 'A',
      gold: 4321,
      region: 1,
      chapter: 1,
      step: 4,
      team: ['u1'],
      pc: [],
      mons: { u1: { species: 'm01', lvl: 40, exp: 2, hp: null, shiny: false, caughtAt: 1, caughtWhere: 'r1c1', keepDupes: false } },
      dex: { m01: { seen: 1, caught: 1 } },
      settings: { speed: 1 },
      rng: 5,
      nextId: 2,
      started: true,
      regionsOpen: [1]
    }))
    const loaded = loadAdventure(storage, 50)
    expect(loaded?.v).toBe(2)
    expect(loaded?.saveVersion).toBe(12)
    expect(SAVE_VERSION).toBe(12)
    expect(loaded?.gold).toBe(4321)
    expect(loaded?.mons.u1.lvl).toBe(40)
    expect(loaded?.chests).toEqual({ kiesel: 5, silber: 0, gold: 0, sternen: 0 })
    expect(loaded?.pity).toEqual({ silber: 0, gold: 0, sternen: 0 })
    if (!loaded) return
    const opened = takeChests(loaded, 'kiesel', 10, 60)
    expect(opened.length).toBe(5)
    expect(loaded.chests.kiesel).toBe(0)
    storage.setItem(SAVE_KEY_V2, JSON.stringify(loaded))
    const again = loadAdventure(storage, 70)
    expect(again?.chests.kiesel).toBe(0)
    expect(again?.mons.u1.lvl).toBe(40)
  })
})
