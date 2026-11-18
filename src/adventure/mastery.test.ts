import { describe, expect, it } from 'vitest'
import { councilChapter, regionRoster } from './dex'
import { SAVE_VERSION, OFFLINE_EXP_FACTOR } from './const'
import { applyChest } from './chests'
import { syncAchievements } from './achievements'
import { MASTERY_STEPS, addMastery, masteryFactor, masteryLevel, settleOfflineMastery } from './mastery'
import { auditFromSave } from './online/snapshot'
import { auditSync } from './online/check'
import { beginAdventure, normalize } from './save'
import { recordCouncilWin, resolveEncounter, simulateOffline } from './sim'
import { monStats } from './stats'

describe('species mastery', () => {
  it('opens ranks at 1000, 4000, 12000, 30000 and 60000 and buffs HP, ATK and DEF', () => {
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
    expect(SAVE_VERSION).toBe(9)
    expect(save.saveVersion).toBe(9)
    expect(save.mastery).toEqual({})
    expect(save.mons[uid].lvl).toBe(9)
    expect(save.gold).toBeGreaterThan(0)
  })

  it('names a region master after five species reach rank 5, and a huge jump in two seconds is flag 2', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    const before = auditFromSave(save)
    for (const id of regionRoster(1).slice(0, 5)) save.mastery![id] = MASTERY_STEPS[4]
    expect(syncAchievements(save)).toContain('master-1')
    const rushed = auditSync(before, auditFromSave(save), 2_000)
    expect(rushed.flag).toBe(2)
    expect(rushed.reasons).toContain('mastery')
  })
})
