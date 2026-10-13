import { describe, expect, it } from 'vitest'
import { canShowInterstitial, setSessionPlaytimeForTests } from './ads'
import { buildings } from './data'
import { LEGACY_BACKUP_KEY, LEGACY_KEYS, SAVE_KEY, loadOrMigrateSave, migrationEvents, type SaveStorage } from './saveMigrate'
import { createSave, migrateSaveData, releaseMonster, startBreed, startSkillTraining, claimTraining, cancelTraining } from './state'

class MemoryStorage implements SaveStorage {
  readonly map = new Map<string, string>()
  failWrites = false
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null
  }
  setItem(key: string, value: string): void {
    if (this.failWrites && key === SAVE_KEY) throw new Error('QuotaExceededError')
    this.map.set(key, value)
  }
  removeItem(key: string): void {
    this.map.delete(key)
  }
}

function legacySave(gold: number) {
  return {
    version: 1,
    createdAt: 10,
    lastSeen: 20,
    rngSeed: 7,
    currencies: { gold, gems: 4, essence: 2, tickets: 0 },
    buildings: {
      townhall: { level: 2, upgradeEndsAt: null, upgradePaid: null },
      goldmine: { level: 1, stored: 0, lastTick: 20, upgradeEndsAt: null, upgradePaid: null },
      training: { level: 1, slots: [], upgradeEndsAt: null, upgradePaid: null }
    },
    monsters: [{ uid: 'fox', speciesId: 'm01', rarity: 0, level: 6, exp: 3, locked: true, obtainedAt: 10 }],
    team: { F1: 'fox', F2: null, H1: null, H2: null, H3: null },
    campaign: { cleared: { '1-1': 2 } },
    gacha: { pityLeg: 1, pityEpic: 1, totalPulls: 1, history: [] },
    daily: { dayKey: '2026-10-13', loginStreak: 2, quests: { win3: 1, mine2: 2, train1: 0 } },
    ads: { dayKey: '2026-10-13', counts: { double_reward: 0 }, lastRewardedAt: 0, lastInterstitialAt: 0, interstitialsToday: 0 },
    settings: { battleSpeed: 2, sound: true },
    tutorialDone: false
  }
}

describe('town hall', () => {
  it('builds level 4 in 15 minutes', () => {
    expect(buildings.townhall.levels[3].buildSec).toBe(900)
    expect(buildings.townhall.levels[3].cost).toBe(6000)
  })
})

describe('save migration', () => {
  const deps = { createSave, migrate: migrateSaveData }

  it('moves a legacy save onto velunor.save.v1 and keeps the values', () => {
    migrationEvents.length = 0
    const storage = new MemoryStorage()
    const raw = JSON.stringify(legacySave(2222))
    storage.setItem(LEGACY_KEYS[0], raw)
    const save = loadOrMigrateSave(storage, 5_000, deps)
    expect(save.version).toBe(2)
    expect(save.currencies.gold).toBe(2222)
    expect(save.currencies.gems).toBe(4)
    expect(save.monsters[0].level).toBe(6)
    expect(save.monsters[0].potential).toEqual({ hp: 0, atk: 0, def: 0 })
    expect(save.monsters[0].skills.sigRank).toBe(1)
    expect(save.meta.migratedFrom).toBe('mstadt.save.v1')
    expect(storage.getItem(SAVE_KEY)).toBeTruthy()
    expect(storage.getItem(LEGACY_KEYS[0])).toBeNull()
    expect(storage.getItem(LEGACY_BACKUP_KEY)).toBe(raw)
  })

  it('keeps the new key when both saves exist', () => {
    const storage = new MemoryStorage()
    const current = createSave(1)
    current.currencies.gold = 5
    storage.setItem(SAVE_KEY, JSON.stringify(current))
    storage.setItem(LEGACY_KEYS[0], JSON.stringify(legacySave(9999)))
    const save = loadOrMigrateSave(storage, 8_000, deps)
    expect(save.currencies.gold).toBe(5)
    expect(storage.getItem(LEGACY_KEYS[0])).toBeNull()
    expect(storage.getItem(LEGACY_BACKUP_KEY)).toContain('9999')
  })

  it('starts a new game and leaves a corrupt legacy key untouched', () => {
    migrationEvents.length = 0
    const storage = new MemoryStorage()
    storage.setItem(LEGACY_KEYS[0], '{not json')
    const save = loadOrMigrateSave(storage, 9_000, deps)
    expect(save.currencies.gold).toBe(500)
    expect(save.version).toBe(2)
    expect(storage.getItem(LEGACY_KEYS[0])).toBe('{not json')
    expect(migrationEvents).toContain('save_migration_corrupt')
  })

  it('keeps the legacy key when writing the new key fails, then migrates on the next start', () => {
    const storage = new MemoryStorage()
    storage.setItem(LEGACY_KEYS[0], JSON.stringify(legacySave(3333)))
    storage.failWrites = true
    const first = loadOrMigrateSave(storage, 11_000, deps)
    expect(first.currencies.gold).toBe(3333)
    expect(first.version).toBe(2)
    expect(storage.getItem(LEGACY_KEYS[0])).toContain('3333')
    expect(storage.getItem(SAVE_KEY)).toBeNull()
    expect(migrationEvents).toContain('save_migration_failed')
    storage.failWrites = false
    const second = loadOrMigrateSave(storage, 12_000, deps)
    expect(second.currencies.gold).toBe(3333)
    expect(storage.getItem(LEGACY_KEYS[0])).toBeNull()
    expect(storage.getItem(SAVE_KEY)).toContain('"gold":3333')
  })

  it('does not change a save that was already migrated', () => {
    const storage = new MemoryStorage()
    storage.setItem(LEGACY_KEYS[0], JSON.stringify(legacySave(4444)))
    const first = loadOrMigrateSave(storage, 13_000, deps)
    const backup = storage.getItem(LEGACY_BACKUP_KEY)
    const again = loadOrMigrateSave(storage, 14_000, deps)
    expect(again.currencies.gold).toBe(first.currencies.gold)
    expect(again.monsters).toHaveLength(first.monsters.length)
    expect(again.meta.migratedAt).toBe(first.meta.migratedAt)
    expect(storage.getItem(LEGACY_KEYS[0])).toBeNull()
    expect(storage.getItem(LEGACY_BACKUP_KEY)).toBe(backup)
  })
})

describe('interstitial ads', () => {
  it('stays off unless the platform requires them, and waits 10 minutes of the session', () => {
    const save = createSave(0)
    save.tutorialDone = true
    save.lastBattleResult = 'win'
    save.campaign.cleared['1-5'] = 3
    setSessionPlaytimeForTests(60)
    expect(canShowInterstitial(save, 'battle_end', 1_000_000, 'poki')).toBe(false)
    setSessionPlaytimeForTests(600)
    expect(canShowInterstitial(save, 'battle_end', 1_000_000, 'none')).toBe(false)
    expect(canShowInterstitial(save, 'battle_end', 1_000_000, 'poki')).toBe(true)
    expect(canShowInterstitial(save, 'battle_end', 1_000_000, 'crazygames')).toBe(true)
    expect(canShowInterstitial(save, 'battle_end', 1_000_000, 'gamedistribution')).toBe(true)
    save.lastBattleResult = 'loss'
    expect(canShowInterstitial(save, 'battle_end', 1_000_000, 'poki')).toBe(false)
  })
})

describe('breeding', () => {
  it('stores the rolled child when breeding starts and does not spend the parents', () => {
    const save = createSave(0)
    save.buildings.breeding.level = 1
    save.buildings.townhall.level = 5
    save.currencies.gold = 10000
    save.currencies.essence = 1000
    const a = save.monsters[0]
    const b = save.monsters[1]
    a.level = 15
    b.level = 15
    save.rngSeed = 1
    const started = startBreed(save, a.uid, b.uid, 0)
    expect(started.ok).toBe(true)
    expect(save.buildings.breeding.slots).toHaveLength(1)
    expect(save.monsters).toHaveLength(3)
    expect(save.buildings.breeding.slots[0].result.rarity).toBeGreaterThanOrEqual(0)
    expect(a.breedReadyAt).toBe(43200 * 1000)
    expect(releaseMonster(save, a.uid).ok).toBe(false)
  })

  it('starts a signature rank, refunds a cancel, and rejects a mismatched skill', () => {
    const save = createSave(0)
    save.buildings.townhall.level = 3
    save.buildings.training.level = 2
    save.currencies.gold = 2000
    save.currencies.essence = 100
    const monster = save.monsters[0]
    monster.level = 10
    const started = startSkillTraining(save, monster.uid, 'rank', 'sig', 0)
    expect(started.ok).toBe(true)
    expect(save.currencies.gold).toBe(1700)
    expect(save.currencies.essence).toBe(90)
    expect(cancelTraining(save, monster.uid, 0).ok).toBe(true)
    expect(save.currencies.gold).toBe(2000)
    expect(save.currencies.essence).toBe(100)
    expect(startSkillTraining(save, monster.uid, 'learn', 'L05', 0).ok).toBe(false)
    expect(startSkillTraining(save, monster.uid, 'learn', 'L01', 0).ok).toBe(true)
    expect(claimTraining(save, monster.uid, 30 * 60_000).ok).toBe(true)
    expect(monster.skills.learned).toContain('L01')
    expect(monster.skills.slot2).toBe('L01')
  })
})
