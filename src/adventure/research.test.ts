import { describe, expect, it } from 'vitest'
import { SAVE_VERSION } from './const'
import { auditSync } from './online/check'
import { auditFromSave } from './online/snapshot'
import { beginAdventure, loadAdventure, writeSave } from './save'
import { grantGold } from './shop'
import { rollWildShard } from './sources'
import { gameHtml, type CodexQuery, type PcQuery } from './view'
import type { StorageLike } from './types'
import { TREE_CAP_MAX_MS } from './tree'
import {
  RESEARCH_LINES,
  RESEARCH_MAX,
  offlineCapMs,
  researchCost,
  researchDurationMs,
  researchLineTotal,
  researchRank,
  scaleHatch,
  settleResearch,
  startResearch,
  takeWildShards
} from './research'

const pc: PcQuery = { q: '', type: '', rarity: '', shiny: '', sort: 'newest', dir: -1 }
const dex: CodexQuery = { q: '', type: '', rarity: '', shiny: '' }

function memory(): StorageLike {
  const box = new Map<string, string>()
  return {
    getItem: (key) => box.get(key) ?? null,
    setItem: (key, value) => { box.set(key, value) },
    removeItem: (key) => { box.delete(key) }
  }
}

function openSave() {
  const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
  save.badges.push('Ratsiegel')
  save.gold = 20_000_000
  return save
}

describe('research tower', () => {
  it('follows the cost and duration formula for every level', () => {
    expect(researchCost(1)).toBe(20_000)
    expect(researchDurationMs(1)).toBe(30 * 60 * 1000)
    expect(researchCost(2)).toBe(36_000)
    expect(researchDurationMs(2)).toBe(48 * 60 * 1000)
    let gold = 0
    let ms = 0
    for (let level = 1; level <= RESEARCH_MAX; level++) {
      expect(researchCost(level)).toBe(Math.round(20_000 * 1.8 ** (level - 1)))
      expect(researchDurationMs(level)).toBe(Math.round(30 * 60 * 1000 * 1.6 ** (level - 1)))
      gold += researchCost(level)
      ms += researchDurationMs(level)
    }
    expect(researchLineTotal()).toEqual({ gold, ms })
    expect(gold).toBe(8_901_168)
    expect(ms).toBe(326_853_488)
    expect(RESEARCH_LINES).toHaveLength(6)
  })

  it('runs one study at a time and finishes it offline', () => {
    const save = openSave()
    expect(startResearch(save, 'gold', 1_000)).toBeNull()
    expect(save.gold).toBe(20_000_000 - 20_000)
    expect(startResearch(save, 'ep', 1_000)).toBe('busy')
    expect(researchRank(save, 'gold')).toBe(0)
    expect(settleResearch(save, 1_000 + researchDurationMs(1) - 1)).toBe(false)
    expect(settleResearch(save, 1_000 + researchDurationMs(1))).toBe(true)
    expect(researchRank(save, 'gold')).toBe(1)
    expect(save.research?.job).toBeNull()
    expect(startResearch(save, 'ep', 5_000)).toBeNull()
    expect(save.research?.job?.line).toBe('ep')
  })

  it('keeps the offline cap at 12 hours together with the tree', () => {
    const save = openSave()
    expect(offlineCapMs(save)).toBe(8 * 60 * 60 * 1000)
    save.research = {
      ranks: { gold: 0, ep: 0, offline: 10, expedition: 0, egg: 0, shard: 0 },
      job: null,
      shardBank: 0
    }
    expect(offlineCapMs(save)).toBe(8 * 60 * 60 * 1000 + 10 * 15 * 60 * 1000)
    save.tree = { nodes: ['time-1', 'time-2', 'time-3', 'time-4', 'time-5', 'time-6', 'time-7', 'time-8'], resetDay: '', sealDay: '' }
    expect(offlineCapMs(save)).toBe(TREE_CAP_MAX_MS)
  })

  it('pays bonus wild shards from the remainder and shortens an egg', () => {
    const save = openSave()
    save.research = {
      ranks: { gold: 10, ep: 10, offline: 0, expedition: 10, egg: 10, shard: 10 },
      job: null,
      shardBank: 0
    }
    expect(grantGold(save, 100, 1_000)).toBe(130)
    expect(scaleHatch(4 * 60 * 60 * 1000, save)).toBe(Math.round(4 * 60 * 60 * 1000 * 0.6))
    let extra = 0
    for (let i = 0; i < 10; i++) extra += takeWildShards(save) - 1
    expect(extra).toBeGreaterThanOrEqual(2)
    expect(extra).toBeLessThanOrEqual(3)
    const before = (save.shards.m66 ?? 0)
    expect(rollWildShard(save, 'm66', () => 0, 2)).toBe('shard')
    expect((save.shards.m66 ?? 0) - before).toBeGreaterThanOrEqual(1)
  })

  it('rejects an early finish, a dropped rank and an unpaid jump', () => {
    const save = openSave()
    const before = auditFromSave(save)
    expect(startResearch(save, 'shard', 10_000)).toBeNull()
    const running = auditFromSave(save)
    expect(auditSync(before, running, 1_000, 0, 10_000).flag).toBe(0)
    running.research!.ranks[5] = 1
    running.research!.job = null
    expect(auditSync(before, running, 1_000, 0, 10_000).reasons).toContain('research')
    const honest = auditFromSave(save)
    honest.research!.ranks[5] = 0
    expect(auditSync(running, honest, 60_000, 0, 70_000).reasons).toContain('research')
    const shortened = auditFromSave(save)
    shortened.research!.job!.readyAt = shortened.research!.job!.startedAt + 1_000
    expect(auditSync(before, shortened, 60_000, 0, 10_000).reasons).toContain('research')
    const closed = beginAdventure('Bea', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    closed.gold = 100_000
    expect(startResearch(closed, 'gold', 1_000)).toBe('locked')
  })

  it('keeps an old save and shows six symbols', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    const box = memory()
    writeSave(box, save)
    const raw = JSON.parse(box.getItem('velunor_v2') ?? '{}') as { saveVersion: number, research?: unknown }
    raw.saveVersion = 9
    delete raw.research
    box.setItem('velunor_v2', JSON.stringify(raw))
    const loaded = loadAdventure(box, 5_000)
    expect(loaded?.saveVersion).toBe(SAVE_VERSION)
    expect(loaded?.research?.ranks.gold).toBe(0)
    expect(loaded?.research?.job).toBeNull()
    expect(SAVE_VERSION).toBe(10)
    save.badges.push('Ratsiegel')
    const html = gameHtml(save, 'tower', 1_000, pc, dex, null, false, false, null)
    for (const line of RESEARCH_LINES) expect(html).toContain(`data-art="tower/${line}"`)
    expect(html).toContain('data-art="tower/screen"')
    expect(html).toContain('Splitterkammer')
    const locked = beginAdventure('Bea', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    expect(gameHtml(locked, 'tower', 1_000, pc, dex, null, false, false, null)).toContain('Ratsiegel')
  })
})
