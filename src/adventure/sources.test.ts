import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../rng'
import { species } from '../data'
import { beginAdventure } from './save'
import { monStats } from './stats'
import { openChest, pityPush, starCost, wildShardChance } from './lootbox'
import {
  bankRoad,
  buyChestForGold,
  buyChestForMarks,
  claimRoad,
  grantCodexChests,
  grantFindChest,
  grantTrainerChest,
  raiseStar,
  rollWildShard
} from './sources'

describe('lootbox sources and pity', () => {
  it('banks one road chest every two hours and stops at four', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1)
    expect(bankRoad(save, 2 * 60 * 60 * 1000)).toBe(1)
    expect(save.roadReady).toBe(1)
    expect(bankRoad(save, 8 * 60 * 60 * 1000)).toBe(3)
    expect(save.roadReady).toBe(4)
    expect(bankRoad(save, 2 * 60 * 60 * 1000)).toBe(0)
    expect(claimRoad(save)).toBe(4)
    expect(save.chests.kiesel).toBe(6)
    expect(save.roadReady).toBe(0)
  })

  it('drops a kiesel on a find and a silver chest on one trainer in ten', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1)
    expect(grantFindChest(save)).toBe(1)
    expect(save.chests.kiesel).toBe(3)
    expect(grantTrainerChest(save, () => 0.09)).toBe(true)
    expect(save.chests.silber).toBe(1)
    expect(grantTrainerChest(save, () => 0.1)).toBe(false)
  })

  it('matches the wild shard table and frees a species after two duplicate-worth of shards', () => {
    expect(wildShardChance(0)).toBeCloseTo(0.2)
    expect(wildShardChance(9)).toBeCloseTo(0.01)
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1)
    const rarity = species('m66').baseRarity
    const need = 2 * [5, 6, 8, 10, 15, 20, 30, 40, 60, 100][rarity]
    let unlocked = false
    for (let i = 0; i < need; i++) {
      const hit = rollWildShard(save, 'm66', () => 0, 2)
      if (hit === 'unlock') unlocked = true
    }
    expect(unlocked).toBe(true)
    expect(save.team.some((uid) => save.mons[uid].species === 'm66')).toBe(true)
  })

  it('forces the pity rarity and raises HP by 4 percent per star', () => {
    expect(pityPush('silber', 9).force).toBe(true)
    expect(pityPush('gold', 19).force).toBe(true)
    expect(pityPush('sternen', 49).force).toBe(true)
    expect(pityPush('sternen', 29).bonusPp).toBe(3)
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1)
    save.chests.sternen = 50
    const pool = { unlockedRegions: [1, 2, 3, 4, 5], ownedSpecies: [] as string[], region: 1 }
    let hit = false
    const rng = mulberry32(7)
    for (let i = 0; i < 50; i++) {
      const roll = openChest('sternen', { ...pool, pity: i < 49 ? 0 : 49, ownedSpecies: pool.ownedSpecies }, rng)
      if (i === 49) hit = roll.rarity >= 8
    }
    expect(hit).toBe(true)
    const plain = monStats(save.mons[save.team[0]])
    save.shards.m01 = 1000
    expect(raiseStar(save, 'm01')).toBeNull()
    const starred = monStats(save.mons[save.team[0]])
    expect(starred.hp).toBe(Math.round(plain.hp * 1.04))
    expect(starred.spd).toBe(plain.spd)
    expect(starCost(0, 1)).toBe(5)
  })

  it('sells chests for gold and marks and pays one gold chest per ten codex entries', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1)
    save.gold = 100_000
    save.region = 2
    expect(buyChestForGold(save, 'kiesel', Date.parse('2026-11-17T12:00:00Z'))).toBeNull()
    expect(save.gold).toBe(100_000 - 4000)
    for (let i = 0; i < 4; i++) expect(buyChestForGold(save, 'kiesel', Date.parse('2026-11-17T12:00:00Z'))).toBeNull()
    expect(buyChestForGold(save, 'kiesel', Date.parse('2026-11-17T12:00:00Z'))).toBe('Heute ist das Tageslimit erreicht.')
    save.marks = 300
    expect(buyChestForMarks(save, 'gold')).toBeNull()
    expect(save.marks).toBe(0)
    expect(save.chests.gold).toBe(1)
    for (let i = 0; i < 9; i++) save.dex[`x${i}`] = { seen: 1, caught: 1 }
    expect(grantCodexChests(save)).toBe(1)
    expect(save.chests.gold).toBe(2)
    expect(grantCodexChests(save)).toBe(0)
  })
})
