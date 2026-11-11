import { describe, expect, it } from 'vitest'
import shellSource from './scenes/Shell.ts?raw'
import campaignSource from './scenes/Campaign.ts?raw'
import { ads } from './ads'
import { monsters, species, strongAgainst, typeName } from './data'
import {
  HOUR_MS,
  capReachedLabel,
  catalogBonusLabel,
  combatRates,
  effectiveCombatHours,
  idleDoubleVisible,
  incomeBonus,
  monoCounterTeam,
  offlineCapHours,
  planIdle,
  qFromWinRate,
  regionMainType,
  sealStatMult,
  stageId,
  type IdlePlanInput
} from './idleMath'
import { SAVE_KEY, loadOrMigrateSave, type SaveStorage } from './saveMigrate'
import { generateStage, resolveStage, stageGlobal } from './stageGen'
import {
  allyInputs,
  commitFightRewards,
  consumeIdleNotice,
  createSave,
  debugAdvanceHours,
  ensureIdleRating,
  migrateSaveData,
  stageEnemyInputs,
  teamPower,
  tick,
  type FightReport
} from './state'
import type { SaveData, SlotId, TypeId } from './types'

class MemoryStorage implements SaveStorage {
  readonly map = new Map<string, string>()
  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }
  removeItem(key: string): void {
    this.map.delete(key)
  }
}

function farmInput(over: Partial<IdlePlanInput> = {}): IdlePlanInput {
  return {
    from: 0,
    until: 3 * HOUR_MS,
    capMs: 8 * HOUR_MS,
    stage: 20,
    lastAdvanceCheck: 0,
    currentW: 1,
    wNext: 0,
    wNextStage: 0,
    bonus: 1,
    cleared: (stage) => stage === 20,
    unlocked: () => true,
    isBoss: (stage) => stage % 10 === 0,
    rates: (stage) => (stage === 20 ? { repeatGold: 450, exp: 330, globalStage: 20 } : { repeatGold: 10, exp: 10, globalStage: stage }),
    winRate: () => 0.5,
    ...over
  }
}

function bossReport(stageId: string): FightReport {
  return {
    stageId,
    logs: [],
    rewards: { gold: 0, gems: 0, exp: 0, essence: 0, tickets: 0, levels: 0 },
    victory: true,
    tip: '',
    stars: 1
  }
}

describe('offline formula', () => {
  it('matches the stage 2-10 example without a bonus', () => {
    const stage = resolveStage('2-10')
    expect(stageGlobal(stage)).toBe(20)
    expect(stage.rewards.repeat.gold).toBe(450)
    expect(stage.rewards.repeat.exp).toBe(330)
    const rates = combatRates(450, 330, 20, 1, 1)
    expect(rates.goldPerHour).toBeCloseTo(270)
    expect(rates.expPerHour).toBeCloseTo(198)
    expect(rates.essencePerHour).toBeCloseTo(0.6)
  })

  it('weights the first 2 h at full rate and the next hour at 0.8', () => {
    expect(effectiveCombatHours(3 * HOUR_MS)).toBeCloseTo(2.8)
    const plan = planIdle(farmInput())
    expect(plan.advances).toEqual([])
    expect(plan.capped).toBe(false)
    expect(plan.gold).toBeCloseTo(270 * 2.8)
    expect(plan.exp).toBeCloseTo(198 * 2.8)
    expect(plan.essence).toBeCloseTo(0.6 * 2.8)
  })

  it('caps 20 h at 8 h for town hall 1–2 and keeps the same curve', () => {
    expect(offlineCapHours(1)).toBe(8)
    expect(offlineCapHours(2)).toBe(8)
    expect(offlineCapHours(3)).toBe(10)
    expect(offlineCapHours(4)).toBe(10)
    expect(offlineCapHours(5)).toBe(12)
    const plan = planIdle(farmInput({ until: 20 * HOUR_MS }))
    expect(plan.capped).toBe(true)
    expect(plan.countedMs).toBe(8 * HOUR_MS)
    expect(plan.gold).toBeCloseTo(270 * (2 + 6 * 0.8))
    expect(plan.exp).toBeCloseTo(198 * (2 + 6 * 0.8))
    expect(plan.essence).toBeCloseTo(0.6 * (2 + 6 * 0.8))
  })

  it('ignores a backwards clock', () => {
    const plan = planIdle(farmInput({ from: 5_000, until: 1_000 }))
    expect(plan.awayMs).toBe(0)
    expect(plan.gold).toBe(0)
    expect(plan.exp).toBe(0)
    expect(plan.essence).toBe(0)
    const save = createSave(5_000)
    save.idle.pending.gold = 12
    save.buildings.goldmine.stored = 4
    tick(save, 1_000)
    expect(save.idle.pending.gold).toBe(12)
    expect(save.buildings.goldmine.stored).toBe(4)
    expect(save.idle.lastSeenAt).toBe(1_000)
  })

  it('does not apply the combat curve to the mine', () => {
    const save = createSave(0)
    save.collection = []
    save.buildings.goldmine.lastTick = 0
    save.idle.lastSeenAt = 0
    save.idle.lastAdvanceCheck = 0
    save.lastSeen = 0
    tick(save, 3 * HOUR_MS)
    expect(save.buildings.goldmine.stored).toBeCloseTo(180)
  })

  it('uses q bands 70 %, 20 % and the 0.2 floor', () => {
    expect(qFromWinRate(1)).toBe(1)
    expect(qFromWinRate(0.7)).toBe(1)
    expect(qFromWinRate(0.69)).toBeCloseTo(0.69 / 0.7)
    expect(qFromWinRate(0.2)).toBeCloseTo(0.2 / 0.7)
    expect(qFromWinRate(0.19)).toBe(0.2)
    expect(qFromWinRate(0)).toBe(0.2)
  })

  it('pays the catalog bonus on gold and EP only', () => {
    expect(incomeBonus(0, 0)).toBe(1)
    expect(incomeBonus(1, 0)).toBeCloseTo(1.005)
    expect(incomeBonus(100, 0)).toBeCloseTo(1.5)
    expect(catalogBonusLabel(3)).toContain('1,5')
    const plain = combatRates(450, 330, 20, 1, 1)
    const bonus = combatRates(450, 330, 20, 1, incomeBonus(100, 0))
    expect(bonus.goldPerHour).toBeCloseTo(plain.goldPerHour * 1.5)
    expect(bonus.expPerHour).toBeCloseTo(plain.expPerHour * 1.5)
    expect(bonus.essencePerHour).toBeCloseTo(plain.essencePerHour)
  })
})

describe('idle settlement', () => {
  function parkedOnBossFarm(): SaveData {
    const save = createSave(0)
    save.collection = []
    save.campaign.cleared['2-10'] = 1
    save.idle.stage = 20
    save.idle.lastSeenAt = 0
    save.idle.lastAdvanceCheck = 0
    save.buildings.goldmine.lastTick = 0
    save.lastSeen = 0
    ensureIdleRating(save)
    save.idle.w = 1
    save.idle.q = 1
    save.idle.wNext = 0.5
    save.idle.wNextStage = 21
    return save
  }

  it('settles +3 h through the saved timestamp', () => {
    const save = parkedOnBossFarm()
    tick(save, 3 * HOUR_MS)
    expect(save.idle.stage).toBe(20)
    expect(save.campaign.cleared['3-1']).toBeUndefined()
    expect(save.idle.pending.gold).toBeCloseTo(270 * 2.8)
    expect(save.idle.pending.exp).toBeCloseTo(198 * 2.8)
    expect(save.idle.pending.essence).toBeCloseTo(0.6 * 2.8)
    const notice = consumeIdleNotice()
    expect(notice?.capped).toBe(false)
    expect(notice?.showAd).toBe(false)
    expect(notice?.awayLabel).toBe('3 h')
  })

  it('settles +20 h down to the 8 h cap', () => {
    const save = parkedOnBossFarm()
    tick(save, 20 * HOUR_MS)
    expect(save.idle.pending.gold).toBeCloseTo(270 * 6.8)
    expect(save.buildings.townhall.level).toBeLessThan(3)
    const notice = consumeIdleNotice()
    expect(notice?.capped).toBe(true)
    expect(notice?.capText).toBe(capReachedLabel(1))
    expect(notice?.countedMs).toBe(8 * HOUR_MS)
  })

  it('stops a winning team in front of a boss and continues after that boss is cleared', () => {
    const calls: number[] = []
    const plan = planIdle({
      from: 0,
      until: 5 * HOUR_MS,
      capMs: 8 * HOUR_MS,
      stage: 5,
      lastAdvanceCheck: 0,
      currentW: 1,
      wNext: 0,
      wNextStage: 0,
      bonus: 1,
      cleared: (stage) => stage <= 5,
      unlocked: () => true,
      isBoss: (stage) => stage % 10 === 0,
      rates: (stage) => ({ repeatGold: 100, exp: 10, globalStage: stage }),
      winRate: (stage) => {
        calls.push(stage)
        return 1
      }
    })
    expect(plan.advances.map((row) => row.stage)).toEqual([6, 7, 8, 9])
    expect(plan.stage).toBe(9)
    expect(calls).not.toContain(10)
    const afterBoss = planIdle({
      from: 0,
      until: HOUR_MS,
      capMs: 8 * HOUR_MS,
      stage: 10,
      lastAdvanceCheck: 0,
      currentW: 1,
      wNext: 0,
      wNextStage: 0,
      bonus: 1,
      cleared: (stage) => stage <= 10,
      unlocked: () => true,
      isBoss: (stage) => stage % 10 === 0,
      rates: (stage) => ({ repeatGold: 100, exp: 10, globalStage: stage }),
      winRate: () => 1
    })
    expect(afterBoss.advances.map((row) => row.stage)).toEqual([11, 12])
    expect(afterBoss.stage).toBe(12)
  })
})

describe('endless path', () => {
  it('keeps chapters 1–2 and generates stage 21 with a region type', () => {
    expect(resolveStage('1-1').name).toBe('Dorfbrunnen')
    expect(resolveStage('2-10').rewards.repeat).toEqual({ gold: 450, exp: 330 })
    const first = generateStage(21)
    const again = generateStage(21)
    expect(again).toEqual(first)
    expect(first.chapter).toBe(3)
    expect(first.enemyLevel).toBe(Math.round(1.2 * 21))
    expect(first.enemyRarity).toBe(2)
    expect(first.rewards.firstClear.gold).toBe(100 + 40 * 21)
    expect(first.rewards.repeat.gold).toBe((100 + 40 * 21) / 2)
    expect(first.rewards.firstClear.exp).toBe(30 + 15 * 21)
    expect(first.rewards.repeat.exp).toBe(30 + 15 * 21)
    expect(first.rewards.firstClear.gems).toBe(30)
    const main = regionMainType(3)
    expect(first.stageText).toContain(typeName(main))
    const units = stageEnemyInputs(first)
    expect(units).toHaveLength(5)
    expect(units.filter((unit) => species(unit.speciesId).type === main)).toHaveLength(3)
    const boss = generateStage(30)
    expect(boss.boss?.hpMult).toBe(1.5)
    expect(boss.boss?.atkMult).toBe(1)
    expect(boss.boss?.rarity).toBe(3)
    expect(boss.rewards.firstClear.gems).toBe(100)
    expect(stageEnemyInputs(boss)).toHaveLength(5)
    expect(stageEnemyInputs(boss).filter((unit) => unit.boss)).toHaveLength(1)
    expect(generateStage(31).enemyRarity).toBe(3)
    expect(generateStage(41).enemyRarity).toBe(4)
    expect(generateStage(51).enemyRarity).toBe(5)
    expect(generateStage(61).enemyRarity).toBe(6)
    expect(campaignSource).toContain('Boss wartet')
    expect(campaignSource).toContain('Region')
    expect(campaignSource).not.toContain('3× kämpfen')
  })
})

describe('region seals', () => {
  function speciesOf(type: TypeId): string {
    const found = monsters.find((monster) => monster.type === type)
    if (!found) throw new Error(`no species for ${type}`)
    return found.id
  }

  function withTeam(save: SaveData, type: TypeId): void {
    save.buildings.townhall.level = 5
    const slots: SlotId[] = ['F1', 'F2', 'H1', 'H2', 'H3']
    slots.forEach((slot, index) => {
      const monster = {
        ...save.monsters[0],
        uid: `seal-${slot}`,
        speciesId: speciesOf(type),
        level: 30,
        locked: false
      }
      save.monsters.push(monster)
      save.team[slot] = monster.uid
      expect(index).toBeGreaterThanOrEqual(0)
    })
  }

  it('gives one seal for the first boss win and none for a repeat', () => {
    const save = createSave(1_000)
    commitFightRewards(save, bossReport('1-10'))
    expect(save.idle.seals).toEqual({ count: 0, bosses: [], typeBonus: [] })
    commitFightRewards(save, bossReport('2-10'))
    expect(save.idle.seals.bosses).toEqual(['2-10'])
    expect(save.idle.seals.typeBonus).toEqual([])
    expect(save.idle.seals.count).toBe(1)
    expect(save.idle.stage).toBe(20)
    commitFightRewards(save, bossReport('2-10'))
    expect(save.idle.seals.count).toBe(1)
    expect(save.idle.seals.bosses).toEqual(['2-10'])
  })

  it('gives the type-bonus seal once per region and only for a full counter team', () => {
    const main = regionMainType(2)
    const counter = monoType(main)
    expect(monoCounterTeam([counter, counter, counter, counter, counter], main, strongAgainst)).toBe(true)
    expect(monoCounterTeam([counter, counter, counter, counter, main], main, strongAgainst)).toBe(false)
    expect(monoCounterTeam([counter, counter, counter, counter], main, strongAgainst)).toBe(false)
    const save = createSave(1_000)
    withTeam(save, counter)
    commitFightRewards(save, bossReport('2-10'))
    expect(save.idle.seals.bosses).toEqual(['2-10'])
    expect(save.idle.seals.typeBonus).toEqual([2])
    expect(save.idle.seals.count).toBe(2)
    commitFightRewards(save, bossReport('2-10'))
    expect(save.idle.seals.count).toBe(2)
    const rates = combatRates(450, 330, 20, 1, incomeBonus(0, save.idle.seals.count))
    expect(rates.goldPerHour).toBeCloseTo(270 * 1.06)
    expect(rates.expPerHour).toBeCloseTo(198 * 1.06)
    expect(rates.essencePerHour).toBeCloseTo(0.6)
    expect(sealStatMult(save.idle.seals.count)).toBeCloseTo(1.02)
    const unsealed = structuredClone(save)
    unsealed.idle.seals.count = 0
    expect(teamPower(save)).toBeGreaterThan(teamPower(unsealed))
    const allies = allyInputs(save)
    expect(allies.length).toBe(5)
    expect(allies.every((unit) => unit.hpMult === 1.02 && unit.atkMult === 1.02)).toBe(true)
    expect(save.idle).not.toHaveProperty('prestige')
    expect(JSON.stringify(save)).not.toContain('Weltenwende')
    expect(JSON.stringify(save)).not.toContain('"shards"')
  })
})

function monoType(main: TypeId): TypeId {
  for (const type of ['fire', 'water', 'plant', 'earth', 'wind', 'ice', 'lightning', 'poison', 'metal', 'stone', 'light', 'shadow', 'ghost', 'dragon', 'insect', 'beast', 'fighting', 'psychic', 'sound', 'crystal'] as TypeId[]) {
    if (type !== main && strongAgainst(type).includes(main)) return type
  }
  throw new Error(`no counter for ${main}`)
}

describe('save migration', () => {
  it('keeps an old velunor save and does not pay an offline gift', () => {
    const now = 50_000
    const original = createSave(1_000)
    original.version = 5
    original.currencies = { gold: 1234, gems: 56, essence: 7, tickets: 2 }
    original.campaign.cleared = { '1-1': 3, '1-2': 2, '2-4': 1 }
    original.collection = ['m01', 'm02', 'm03', 'm10']
    const monstersSnapshot = structuredClone(original.monsters)
    const teamSnapshot = structuredClone(original.team)
    const { idle: _idle, firstClearGemsClaimed: _claimed, ...kept } = structuredClone(original)
    void _idle
    void _claimed
    const raw = kept as SaveData
    const storage = new MemoryStorage()
    storage.setItem(SAVE_KEY, JSON.stringify(raw))
    const loaded = loadOrMigrateSave(storage, now, { createSave, migrate: migrateSaveData })
    expect(loaded.currencies).toEqual({ gold: 1234, gems: 56, essence: 7, tickets: 2 })
    expect(loaded.monsters).toEqual(monstersSnapshot)
    expect(loaded.team).toEqual(teamSnapshot)
    expect(loaded.collection).toEqual(['m01', 'm02', 'm03', 'm10'])
    expect(loaded.campaign.cleared).toEqual({ '1-1': 3, '1-2': 2, '2-4': 1 })
    expect(loaded.idle.stage).toBe(14)
    expect(loaded.idle.lastSeenAt).toBe(now)
    expect(loaded.idle.pending).toEqual({ gold: 0, exp: 0, essence: 0, stagesWon: 0 })
    expect(loaded.idle.seals).toEqual({ count: 0, bosses: [], typeBonus: [] })
    expect(loaded.firstClearGemsClaimed.slice().sort()).toEqual(['1-1', '1-2', '2-4'])
    expect(loaded.idle).not.toHaveProperty('prestige')
    expect(stageId(loaded.idle.stage)).toBe('2-4')
    consumeIdleNotice()
    tick(loaded, now)
    expect(consumeIdleNotice()).toBeNull()
    expect(loaded.idle.pending.gold).toBe(0)
    expect(loaded.currencies.gold).toBe(1234)
  })
})

describe('idle presentation', () => {
  it('hides the rewarded button and keeps the time jump behind the dev debug gate', () => {
    expect(ads.isRewardedAvailable()).toBe(false)
    expect(idleDoubleVisible(ads.isRewardedAvailable())).toBe(false)
    expect(shellSource).toContain('Alles einsammeln')
    expect(shellSource).not.toContain('×2 Gold')
    expect(shellSource).not.toContain('idle_double')
    expect(shellSource).toContain('if (import.meta.env.DEV && showDebug)')
    expect(shellSource).toContain('Debug: +N Stunden')
    const debugAt = shellSource.indexOf('Debug: +N Stunden')
    const gateAt = shellSource.indexOf('if (import.meta.env.DEV && showDebug)')
    expect(debugAt).toBeGreaterThan(gateAt)
  })

  it('loads 12 h offline in under 2 s', () => {
    const save = createSave(0)
    save.buildings.townhall.level = 5
    save.buildings.goldmine.level = 5
    save.campaign.cleared['1-9'] = 1
    save.idle.stage = 9
    save.idle.lastSeenAt = 0
    save.idle.lastAdvanceCheck = 0
    save.buildings.goldmine.lastTick = 0
    save.lastSeen = 0
    const started = performance.now()
    tick(save, 12 * HOUR_MS)
    expect(performance.now() - started).toBeLessThan(2000)
    expect(save.campaign.cleared['1-10']).toBeUndefined()
    expect(save.buildings.goldmine.stored).toBe(480 * 12)
  })

  it('lets a strong team auto-clear up to the boss and no further', () => {
    const save = createSave(0)
    for (const monster of save.monsters) {
      monster.level = 70
      monster.rarity = 9
    }
    save.campaign.cleared['1-1'] = 3
    save.idle.stage = 1
    save.idle.sig = ''
    save.idle.lastSeenAt = 0
    save.idle.lastAdvanceCheck = 0
    save.lastSeen = 0
    save.buildings.goldmine.lastTick = 0
    tick(save, 5 * HOUR_MS)
    expect(save.idle.stage).toBeGreaterThan(1)
    expect(save.idle.stage).toBeLessThan(10)
    expect(save.campaign.cleared['1-10']).toBeUndefined()
    expect(save.campaign.cleared[stageId(save.idle.stage)]).toBeGreaterThan(0)
    const report = bossReport('1-10')
    commitFightRewards(save, report)
    expect(save.campaign.cleared['1-10']).toBe(1)
    expect(save.idle.seals.count).toBe(0)
    save.buildings.townhall.level = 4
    save.idle.sig = ''
    save.idle.lastSeenAt = 5 * HOUR_MS
    save.idle.lastAdvanceCheck = 5 * HOUR_MS
    tick(save, 7 * HOUR_MS)
    expect(save.idle.stage).toBeGreaterThan(10)
  })
})

describe('debug time jump', () => {
  it('moves the idle clock forward when called directly', () => {
    const save = createSave(10_000)
    save.collection = []
    save.campaign.cleared['2-10'] = 1
    save.idle.stage = 20
    ensureIdleRating(save)
    save.idle.w = 1
    save.idle.q = 1
    save.idle.wNext = 0.5
    save.idle.wNextStage = 21
    const now = save.idle.lastSeenAt
    debugAdvanceHours(save, 3, now)
    expect(save.idle.pending.gold).toBeCloseTo(270 * 2.8)
    expect(save.idle.lastSeenAt).toBe(now)
  })
})
