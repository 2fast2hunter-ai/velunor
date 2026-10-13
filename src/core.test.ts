import { describe, expect, it } from 'vitest'
import { simulateBattle } from './battle'
import { expToNext, expToReach, rarityInfo, typeMult } from './data'
import { pEpic, pLeg, rollMulti, rollRarity } from './gacha'
import { calcDamage, grantExp, instanceStats } from './stats'
import { cancelUpgrade, collectMine, commitFightRewards, createSave, fightStage, portalOpen, portalUnlockText, pull, startTraining, startUpgrade, tick } from './state'
import type { GachaState } from './types'

describe('types', () => {
  it('matches the prototype circle and the special cases', () => {
    expect(typeMult('fire', 'plant')).toBe(1.5)
    expect(typeMult('fire', 'earth')).toBe(0.75)
    expect(typeMult('fire', 'water')).toBe(1)
    expect(typeMult('fire', 'ice')).toBe(1.5)
    expect(typeMult('fire', 'stone')).toBe(0.75)
    expect(typeMult('water', 'earth')).toBe(1.5)
    expect(typeMult('water', 'plant')).toBe(0.75)
    expect(typeMult('plant', 'water')).toBe(1.5)
    expect(typeMult('plant', 'fire')).toBe(0.75)
    expect(typeMult('earth', 'fire')).toBe(1.5)
    expect(typeMult('earth', 'water')).toBe(0.75)
    expect(typeMult('light', 'shadow')).toBe(1.5)
    expect(typeMult('shadow', 'light')).toBe(1.5)
    expect(typeMult('dragon', 'dragon')).toBe(1.5)
    expect(typeMult('fire', 'fire')).toBe(1)
    expect(typeMult('ice', 'fire')).toBe(0.75)
    expect(typeMult('psychic', 'ghost')).toBe(0.75)
  })
})

describe('stats', () => {
  it('uses the published level curve', () => {
    expect(expToNext(1)).toBe(20)
    expect(expToNext(5)).toBe(224)
    expect(expToNext(10)).toBe(632)
    expect(expToNext(20)).toBe(1789)
    expect(expToNext(69)).toBe(11463)
    expect(expToReach(10)).toBe(2222)
  })

  it('reproduces the Funkfuchs vs Lehmbrocken example', () => {
    const fox = instanceStats('m01', 0, 5)
    const clay = instanceStats('m04', 0, 5)
    expect(fox.atk).toBe(36)
    expect(clay.def).toBe(29)
    expect(calcDamage(36 * 1.1, 29 * 1.1, 1, 0.75, false, 0.95)).toBe(23)
  })

  it('stops experience at the rarity cap', () => {
    const monster = { uid: 'a', speciesId: 'm01', rarity: 0 as const, level: 20, exp: 0, locked: false, obtainedAt: 0 }
    const granted = grantExp(monster, 100)
    expect(granted.overflow).toBe(100)
    expect(monster.level).toBe(20)
  })
})

describe('gacha pity', () => {
  it('computes soft and hard pity', () => {
    expect(pLeg(59)).toBeCloseTo(0.007)
    expect(pLeg(60)).toBeCloseTo(0.037)
    expect(pLeg(70)).toBeCloseTo(0.337)
    expect(pLeg(89)).toBeCloseTo(0.907)
    expect(pLeg(90)).toBe(1)
    expect(pEpic(14)).toBeCloseTo(0.0735)
    expect(pEpic(15)).toBeCloseTo(0.1535)
    expect(pEpic(20)).toBe(1)
  })

  it('guarantees legendary+ on pull 90 and resets both counters', () => {
    const state: GachaState = { pityLeg: 89, pityEpic: 10, totalPulls: 89, history: [] }
    const rarity = rollRarity(state, () => 0)
    expect(rarity).toBeGreaterThanOrEqual(5)
    expect(state.pityLeg).toBe(0)
    expect(state.pityEpic).toBe(0)
  })

  it('forces the tenth pull to rare or better', () => {
    const state: GachaState = { pityLeg: 0, pityEpic: 0, totalPulls: 0, history: [] }
    const pulls = rollMulti(state, () => 0.5, 2)
    expect(pulls).toHaveLength(10)
    expect(pulls.slice(0, 9).every((p) => p.rarity < 2)).toBe(true)
    expect(pulls[9].rarity).toBeGreaterThanOrEqual(2)
    expect(state.totalPulls).toBe(10)
  })

  it('forces the tutorial tenth pull to epic or better and counts pity', () => {
    const state: GachaState = { pityLeg: 0, pityEpic: 0, totalPulls: 0, history: [] }
    const pulls = rollMulti(state, () => 0.5, 3)
    expect(pulls.slice(0, 9).every((p) => p.rarity < 3)).toBe(true)
    expect(pulls[9].rarity).toBeGreaterThanOrEqual(3)
    expect(state.pityEpic).toBe(0)
    expect(state.pityLeg).toBe(10)
  })
})

describe('city economy', () => {
  it('fills the gold mine and respects the cap', () => {
    const save = createSave(0)
    save.buildings.goldmine.lastTick = 0
    tick(save, 3_600_000)
    expect(save.buildings.goldmine.stored).toBeCloseTo(60)
    tick(save, 11 * 3_600_000)
    expect(save.buildings.goldmine.stored).toBe(480)
  })

  it('treats a backwards clock as zero production', () => {
    const save = createSave(5_000)
    save.buildings.goldmine.stored = 10
    tick(save, 1_000)
    expect(save.buildings.goldmine.stored).toBe(10)
    expect(save.buildings.goldmine.lastTick).toBe(1_000)
  })

  it('collects stored gold and the one-time tutorial bonus', () => {
    const save = createSave(0)
    save.buildings.goldmine.lastTick = 0
    save.buildings.goldmine.stored = 40.9
    const before = save.currencies.gold
    const result = collectMine(save, 0)
    expect(result.ok).toBe(true)
    expect(save.currencies.gold).toBe(before + 40 + 200)
    expect(save.tutorial.mineGranted).toBe(true)
  })

  it('refunds a cancelled upgrade in full', () => {
    const save = createSave(0)
    save.campaign.cleared['1-5'] = 3
    save.currencies.gold = 500
    const started = startUpgrade(save, 'townhall', 0)
    expect(started.ok).toBe(true)
    expect(save.currencies.gold).toBe(0)
    cancelUpgrade(save, 'townhall')
    expect(save.currencies.gold).toBe(500)
    expect(save.buildings.townhall.level).toBe(1)
  })

  it('finishes the town hall and pays the level reward', () => {
    const save = createSave(0)
    save.campaign.cleared['1-5'] = 3
    save.currencies.gold = 500
    const gems = save.currencies.gems
    startUpgrade(save, 'townhall', 0)
    tick(save, 120_000)
    expect(save.buildings.townhall.level).toBe(2)
    expect(save.currencies.gems).toBe(gems + 200)
  })

  it('makes the first training free', () => {
    const save = createSave(0)
    const uid = save.team.H1!
    const before = save.currencies.gold
    const started = startTraining(save, uid, 30, 0)
    expect(started.ok).toBe(true)
    expect(save.currencies.gold).toBe(before)
    expect(save.buildings.training.slots[0].exp).toBe(360)
  })
})

describe('combat', () => {
  it('lets the starter team beat stage 1-1', () => {
    const save = createSave(1_000)
    let wins = 0
    for (let i = 0; i < 12; i++) {
      const copy = structuredClone(save)
      const report = fightStage(copy, '1-1', 1, 1_000)
      expect(report.ok).toBe(true)
      if (report.value?.victory) wins += 1
    }
    expect(wins).toBeGreaterThanOrEqual(10)
  })

  it('casts the skill on the third turn when the start cooldown is 2', () => {
    const log = simulateBattle({
      seed: 1,
      allySynergy: false,
      enemySynergy: false,
      allies: [{ speciesId: 'm01', rarity: 0, level: 1, slot: 'H1', fixed: { hp: 5000, atk: 10, def: 10, spd: 200 } }],
      enemies: [{ speciesId: 'm04', rarity: 0, level: 1, slot: 'F1', fixed: { hp: 5000, atk: 1, def: 10, spd: 1 } }]
    })
    const casts = log.events.filter((e) => e.kind === 'skill' && e.actor === 'A-H1').map((e) => (e.kind === 'skill' ? e.skillId : ''))
    expect(casts[0]).toBe('basic')
    expect(casts[1]).toBe('basic')
    expect(casts[2]).toBe('ember_strike')
  })

  it('holds battle rewards until the result is committed', () => {
    const save = createSave(1_000)
    const gold = save.currencies.gold
    const gems = save.currencies.gems
    let report = fightStage(save, '1-1', 1, 1_000)
    expect(report.ok).toBe(true)
    expect(save.currencies.gold).toBe(gold)
    expect(save.currencies.gems).toBe(gems)
    expect(save.campaign.cleared['1-1']).toBeUndefined()
    for (let i = 0; i < 8 && !report.value?.victory; i++) {
      const retry = createSave(1_000 + i + 1)
      report = fightStage(retry, '1-1', 1, 1_000)
      if (report.value?.victory) {
        const before = retry.currencies.gold
        commitFightRewards(retry, report.value)
        expect(retry.currencies.gold).toBeGreaterThan(before)
        expect(retry.campaign.cleared['1-1']).toBeGreaterThan(0)
        expect(portalOpen(retry)).toBe(false)
        const paid = retry.currencies.gold
        commitFightRewards(retry, report.value)
        expect(retry.currencies.gold).toBe(paid)
        return
      }
    }
    expect(report.value?.victory).toBe(true)
  })

  it('opens the portal only after stage 1-2, even though the townhall lists it', () => {
    const save = createSave(1_000)
    expect(portalUnlockText(save)).toBe('Portal nach Stage 1-2')
    expect(portalOpen(save)).toBe(false)
    save.campaign.cleared['1-2'] = 3
    expect(portalOpen(save)).toBe(true)
    expect(portalUnlockText(save)).toBe('Portal')
  })

  it('revives the phoenix once', () => {
    const log = simulateBattle({
      seed: 2,
      allySynergy: false,
      enemySynergy: false,
      allies: [{ speciesId: 'm10', rarity: 5, level: 1, slot: 'H1', fixed: { hp: 100, atk: 1, def: 0, spd: 1 } }],
      enemies: [{ speciesId: 'm01', rarity: 0, level: 1, slot: 'H1', fixed: { hp: 5000, atk: 400, def: 1, spd: 50 } }]
    })
    const revives = log.events.filter((e) => e.kind === 'revive')
    expect(revives).toHaveLength(1)
    expect(log.result).toBe('loss')
  })
})

describe('portal costs', () => {
  it('spends 900 gems on a ten-pull after stage 1-2', () => {
    const save = createSave(5_000)
    save.campaign.cleared['1-1'] = 3
    save.campaign.cleared['1-2'] = 3
    save.currencies.gems = 900
    const result = pull(save, 'multi', 'gems', 5_000)
    expect(result.ok).toBe(true)
    expect(result.value).toHaveLength(10)
    const bonus =
      (result.value?.some((p) => p.rarity >= 3) ? 100 : 0) +
      (result.value?.some((p) => p.rarity >= 5) ? 300 : 0)
    expect(save.currencies.gems).toBe(bonus)
    expect(save.monsters.length).toBe(13)
  })

  it('pays essence when a pull repeats a species you already own', () => {
    const save = createSave(5_000)
    save.campaign.cleared['1-1'] = 3
    save.campaign.cleared['1-2'] = 3
    save.currencies.gems = 10000
    let found = false
    for (let i = 0; i < 40 && !found; i++) {
      const owned = new Set(save.monsters.map((monster) => monster.speciesId))
      const before = save.currencies.essence
      const result = pull(save, 'single', 'gems', 5_000)
      const got = result.value?.[0]
      expect(got).toBeTruthy()
      if (!got) break
      if (owned.has(got.speciesId)) {
        expect(got.duplicateEssence).toBe(rarityInfo(got.rarity).essence)
        expect(save.currencies.essence).toBe(before + got.duplicateEssence)
        found = true
      } else {
        expect(got.duplicateEssence).toBe(0)
        expect(save.currencies.essence).toBe(before)
      }
    }
    expect(found).toBe(true)
  })
})
