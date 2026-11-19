import { describe, expect, it } from 'vitest'
import { councilChapter, regionRoster } from './dex'
import { ENCOUNTER_MS, PATH_LENGTH, SAVE_VERSION, OFFLINE_EXP_FACTOR } from './const'
import { speciesInRegion } from './lootbox'
import { applyChest } from './chests'
import { syncAchievements } from './achievements'
import { MASTERY_STEPS, addMastery, masteryFactor, masteryLevel, settleOfflineMastery } from './mastery'
import { auditFromSave } from './online/snapshot'
import { auditSync } from './online/check'
import { beginAdventure, normalize } from './save'
import { recordCouncilWin, resolveEncounter, simulateOffline } from './sim'
import { monStats } from './stats'

describe('species mastery', () => {
  it('opens ranks at 1000, 3000, 8000, 18000 and 35000 and buffs HP, ATK and DEF', () => {
    expect(masteryLevel(999)).toBe(0)
    expect(MASTERY_STEPS.map((step) => masteryLevel(step))).toEqual([1, 2, 3, 4, 5])
    expect(masteryFactor(1)).toBeCloseTo(1.02)
    expect(masteryFactor(5)).toBeCloseTo(1.1)
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    const mon = save.mons[save.team[0]]
    const plain = monStats(mon)
    addMastery(save, mon.species, MASTERY_STEPS[4])
    const buffed = monStats(mon, mon.lvl, masteryLevel(save.mastery?.[mon.species] ?? 0))
    expect(buffed.hp).toBe(Math.round(plain.hp * 1.1))
    expect(buffed.atk).toBe(Math.round(plain.atk * 1.1))
    expect(buffed.def).toBe(Math.round(plain.def * 1.1))
    expect(buffed.spd).toBe(plain.spd)
  })

  it('counts a won fight, a council win and a chest duplicate', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    const uid = save.team[0]
    const id = save.mons[uid].species
    save.mons[uid].lvl = 40
    const fought = resolveEncounter(save, 5_000, { offline: false, trace: false })
    expect(fought.win).toBe(true)
    expect(save.mastery?.[id]).toBe(1)
    save.chapter = councilChapter().id
    save.step = 1
    recordCouncilWin(save, 6_000, true, uid, { offline: false, trace: false })
    expect(save.mastery?.[id]).toBe(6)
    applyChest(save, { speciesId: id, rarity: 0, isNew: false, gold: 10, pity: 0 }, 7_000)
    expect(save.mastery?.[id]).toBe(16)
  })

  it('pays half the offline points, floored, and survives a guardian after 30 minutes', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    const uid = save.team[0]
    const id = save.mons[uid].species
    save.mons[uid].lvl = 40
    const bag = new Map<string, number>()
    let at = 2_000
    let guard = 0
    while ((bag.get(id) ?? 0) < 2 && guard < 12) {
      resolveEncounter(save, at, { offline: true, trace: false, masteryBag: bag })
      at += 2_800
      guard += 1
    }
    const raw = bag.get(id) ?? 0
    expect(raw).toBeGreaterThanOrEqual(2)
    settleOfflineMastery(save, bag)
    expect(save.mastery?.[id]).toBe(Math.floor(raw * OFFLINE_EXP_FACTOR))
    expect(save.mastery?.[id]).toBeLessThan(raw)
    save.step = 20
    expect(() => simulateOffline(save, 30 * 60 * 1000, 30 * 60 * 1000)).not.toThrow()
    expect((save.mastery?.[id] ?? 0)).toBeGreaterThan(0)
  })

  it('keeps an older save and starts mastery at zero', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    const uid = save.team[0]
    save.saveVersion = 6
    save.mons[uid].lvl = 9
    delete save.mastery
    normalize(save, 2_000)
    expect(SAVE_VERSION).toBe(12)
    expect(save.saveVersion).toBe(12)
    expect(save.mastery).toEqual({})
    expect(save.mons[uid].lvl).toBe(9)
    expect(save.gold).toBeGreaterThan(0)
  })

  it('names a region master after five species reach rank 5, and a huge jump in two seconds is flag 2', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    const before = auditFromSave(save)
    for (const id of regionRoster(1).slice(0, 5)) save.mastery![id] = 60_000
    expect(syncAchievements(save)).toContain('master-1')
    const rushed = auditSync(before, auditFromSave(save), 2_000)
    expect(rushed.flag).toBe(2)
    expect(rushed.reasons).toContain('mastery')
  })

  it('never drops a rank that the old steps had already granted', () => {
    const old = [1_000, 4_000, 12_000, 30_000, 60_000]
    const oldLevel = (ep: number) => old.filter((step) => ep >= step).length
    for (const ep of [0, 999, 1_000, 3_000, 4_000, 8_000, 12_000, 18_000, 30_000, 35_000, 60_000, 90_000]) {
      expect(masteryLevel(ep)).toBeGreaterThanOrEqual(oldLevel(ep))
    }
  })

  it('reaches the first rank 5 inside 8 to 12 hours at speed 3', () => {
    const pool = speciesInRegion(1).length
    const fights = 13 + 3
    const boss = 1
    const epPerLoop = fights * 1 + boss * 5
    const loopMs = PATH_LENGTH * ENCOUNTER_MS[3]
    const loopsPerHour = 3_600_000 / loopMs
    const fightPerHour = epPerLoop * loopsPerHour
    const dupe = (1 / pool) * 12.5
    const findPerHour = 1 * loopsPerHour * dupe
    const trainerPerHour = 0.3 * loopsPerHour * dupe
    const roadPerHour = (1 / 2) * dupe
    const perHour = fightPerHour + findPerHour + trainerPerHour + roadPerHour
    const hours = 35_000 / perHour
    expect(hours).toBeGreaterThanOrEqual(8)
    expect(hours).toBeLessThanOrEqual(12)
    expect(pool).toBeGreaterThan(1)
  })
})
