import { describe, expect, it } from 'vitest'
import { species } from '../data'
import { fight1v1, type FightSide } from './battle'
import { SAVE_VERSION } from './const'
import { auditSync } from './online/check'
import { auditFromSave } from './online/snapshot'
import { beginAdventure, loadAdventure, normalize, writeSave } from './save'
import type { StorageLike } from './types'
import { simulateOffline } from './sim'
import { FRUIT_MS, grantGold, useFruit } from './shop'
import { roadInterval } from './sources'
import {
  NODE_COSTS,
  TREE_NODES,
  branchNodes,
  berlinDay,
  buyNode,
  chestShinyChance,
  respecCost,
  respecTree,
  treeAtkBonus,
  treeCapMs,
  treeCritAdd,
  treeDupeMastery,
  treeExpeditionSlots,
  treeFree,
  treeFruitMs,
  treeGoldMult,
  treeGuardHp,
  treeLastBreath,
  treeOfflineFactor,
  treePointParts,
  treeRoadCut,
  treeShardBonus,
  treeStrongType,
  treeUnlocked
} from './tree'
import type { SkillDef } from '../types'

function fill(save: ReturnType<typeof beginAdventure>, branch: 'chest' | 'fight' | 'time', count: number): void {
  save.tree = { nodes: branchNodes(branch).slice(0, count).map((node) => node.id), resetDay: '', sealDay: '' }
}

function side(id: string, hp: number, atk: number, spd: number): FightSide {
  const sp = species(id)
  return {
    speciesId: id,
    name: sp.name,
    type: sp.type,
    maxHp: hp,
    hp,
    atk,
    def: 10,
    spd,
    skill: sp.skill as SkillDef,
    passive: null,
    level: 5
  }
}

describe('mastery tree', () => {
  it('counts crests, councils, codex and mastery rank 5, including an older save', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    save.badges = ['Kieselwappen', 'Wellenwappen', 'Funkenwappen', 'Ratsiegel', 'Ratsiegel']
    for (let i = 1; i <= 20; i++) save.dex[`m${String(i).padStart(2, '0')}`] = { seen: 1, caught: 1 }
    save.mastery = { m01: 60_000, m02: 60_000 }
    const parts = treePointParts(save)
    expect(parts).toMatchObject({ crests: 3, councils: 1, dex: 2, mastery: 2, earned: 3 + 3 + 2 + 2 })
    expect(treeUnlocked(save)).toBe(true)
    save.saveVersion = 7
    ;(save as { tree?: unknown }).tree = undefined
    save.mons[save.team[0]].lvl = 11
    normalize(save, 2_000)
    expect(SAVE_VERSION).toBe(13)
    expect(save.saveVersion).toBe(13)
    expect(save.tree?.nodes).toEqual([])
    expect(save.mons[save.team[0]].lvl).toBe(11)
    expect(treePointParts(save).earned).toBe(parts.earned)
  })

  it('applies each of the 24 nodes and refunds them on respec', () => {
    expect(TREE_NODES).toHaveLength(24)
    expect([...NODE_COSTS]).toEqual([1, 2, 3, 4, 5, 6, 7, 9])
    expect(NODE_COSTS.reduce((sum, cost) => sum + cost, 0) * 3).toBe(111)
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    save.badges = ['Kieselwappen', 'Wellenwappen', 'Funkenwappen']
    expect(buyNode(save, 'chest-2')).toBeTruthy()
    expect(buyNode(save, 'chest-1')).toBeNull()
    expect(treeShardBonus(save)).toBeCloseTo(0.1)
    fill(save, 'chest', 8)
    expect(treeShardBonus(save)).toBeCloseTo(0.3)
    expect(chestShinyChance(save)).toBeCloseTo((1 / 200) * 1.2)
    expect(treeDupeMastery(save)).toBe(1.25)
    expect(treeRoadCut(save)).toBe(0.1)
    expect(roadInterval(save)).toBeLessThan(7_200_000)
    fill(save, 'fight', 8)
    expect(treeAtkBonus(save)).toBeCloseTo(0.1)
    expect(treeCritAdd(save)).toBeCloseTo(0.05)
    expect(treeStrongType(save)).toBe(1.6)
    expect(treeGuardHp(save)).toBeCloseTo(0.1)
    expect(treeLastBreath(save)).toBe(true)
    fill(save, 'time', 8)
    expect(treeCapMs(save)).toBe(12 * 60 * 60 * 1000)
    expect(treeOfflineFactor(save)).toBeCloseTo(0.7)
    expect(treeGoldMult(save)).toBeCloseTo(1.1)
    expect(treeExpeditionSlots(save)).toBe(1)
    expect(treeFruitMs(save)).toBe(90 * 60 * 1000)
    save.bag.fruits.lern = 1
    useFruit(save, 'lern', 5_000)
    expect(save.activeFruits[0].until).toBe(5_000 + 90 * 60 * 1000)
    expect(save.activeFruits[0].until).not.toBe(5_000 + FRUIT_MS)
    const earned = treePointParts(save).earned
    expect(respecCost(save, 5_000)).toBe(0)
    expect(respecTree(save, 5_000)).toBeNull()
    expect(save.tree?.nodes).toEqual([])
    expect(treeFree(save)).toBe(earned)
    save.gold = 0
    fill(save, 'chest', 1)
    save.tree!.resetDay = berlinDay(new Date(5_000))
    expect(respecTree(save, 5_000)).toBe('Zu wenig Gold.')
    save.gold = 5_000
    expect(respecTree(save, 5_000)).toBeNull()
    expect(save.gold).toBe(0)
  })

  it('lets one monster survive a warden blow at 1 HP', () => {
    const foe = side('m02', 1, 400, 200)
    const plain = fight1v1(side('m01', 30, 400, 1), foe, () => 0.2, false)
    const saved = fight1v1(side('m01', 30, 400, 1), { ...foe }, () => 0.2, false, null, { breath: { left: 1 } })
    expect(plain.allyHp).toBe(0)
    expect(saved.allyHp).toBe(1)
  })

  it('accepts tree gold and a 12 hour offline cap, and still flags gold times 100', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    fill(save, 'time', 8)
    const before = auditFromSave(save)
    expect(before.treeGold).toBeCloseTo(1.1)
    expect(before.treeCapMs).toBe(12 * 60 * 60 * 1000)
    grantGold(save, 100, 1_000)
    expect(auditSync(before, auditFromSave(save), 60_000).flag).toBe(0)
    const offline = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    fill(offline, 'time', 8)
    const prior = auditFromSave(offline)
    const span = 12 * 60 * 60 * 1000
    simulateOffline(offline, span, 1_000 + span)
    const verdict = auditSync(prior, auditFromSave(offline), span)
    expect(verdict.flag).toBe(0)
    expect(verdict.reasons).not.toEqual(expect.arrayContaining(['gold', 'ep', 'chests', 'shards']))
    const cheat = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    const clean = auditFromSave(cheat)
    cheat.gold += 2_000_000
    expect(auditSync(clean, auditFromSave(cheat), 60_000).flag).toBe(2)
  })

  it('keeps bought nodes and frees the cheaper cost once', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    save.badges = Array.from({ length: 40 }, (_, index) => `Wappen ${index}`)
    fill(save, 'chest', 8)
    save.saveVersion = 11
    const spent = branchNodes('chest').reduce((sum, node) => sum + node.cost, 0)
    expect(spent).toBe(37)
    expect(treeFree(save)).toBe(treePointParts(save).earned - 37)
    const box: StorageLike = {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined
    }
    const memory = new Map<string, string>()
    box.getItem = (key) => memory.get(key) ?? null
    box.setItem = (key, value) => { memory.set(key, value) }
    writeSave(box, save)
    const loaded = loadAdventure(box, 2_000)
    expect(loaded?.tree?.nodes).toEqual(save.tree?.nodes)
    expect(loaded?.log.some((row) => row.text.includes('Baum neu bepreist'))).toBe(true)
    writeSave(box, loaded!)
    const again = loadAdventure(box, 3_000)
    expect(again?.log.filter((row) => row.text.includes('Baum neu bepreist'))).toHaveLength(1)
  })
})
