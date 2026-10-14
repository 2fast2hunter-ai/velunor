import { describe, expect, it, vi } from 'vitest'
import * as ads from './ads'
import {
  applyArenaOutcome,
  arenaPlayerPower,
  arenaUnlocked,
  awardNewRanks,
  claimArenaChest,
  listArenaOpponents,
  rerollArena
} from './arena'
import { arenaCfg, dayKey, species } from './data'
import { setSessionPlaytimeForTests } from './ads'
import {
  closeToCity,
  commitFightRewards,
  createSave,
  fightArena,
  migrateSaveData,
  previewArenaFight,
  teamPower,
  tick
} from './state'
import type { SaveData } from './types'

function at(year: number, month: number, day: number, hour: number): number {
  return new Date(year, month - 1, day, hour).getTime()
}

function ready(level: number, now: number): SaveData {
  const save = createSave(now)
  save.buildings.townhall.level = 3
  for (const monster of save.monsters) {
    monster.level = level
    monster.rarity = 1
  }
  const fourth = { ...save.monsters[0], uid: 'h2', speciesId: 'm04' }
  const fifth = { ...save.monsters[1], uid: 'h3', speciesId: 'm05' }
  save.monsters.push(fourth, fifth)
  save.team.H2 = 'h2'
  save.team.H3 = 'h3'
  return save
}

describe('arena unlock and ghosts', () => {
  const now = at(2026, 10, 14, 12)

  it('stays shut until town hall 3', () => {
    const save = createSave(now)
    expect(arenaUnlocked(save)).toBe(false)
    expect(fightArena(save, 'easy', now).reason).toBe('Rathaus Stufe 3')
    save.buildings.townhall.level = 3
    expect(arenaUnlocked(save)).toBe(true)
  })

  it('builds three ghosts inside the KK band and keeps them after a reload', () => {
    for (const level of [1, 12]) {
      const save = ready(level, now)
      expect(arenaPlayerPower(save)).toBe(teamPower(save))
      const power = teamPower(save)
      const ghosts = listArenaOpponents(save, now)
      expect(ghosts.map((ghost) => ghost.tier)).toEqual(['easy', 'mid', 'hard'])
      expect(new Set(ghosts.map((ghost) => ghost.seed)).size).toBe(3)
      for (const ghost of ghosts) {
        const factor = arenaCfg.tiers.find((tier) => tier.id === ghost.tier)!.kkFactor
        const target = power * factor
        expect(ghost.kk, `level ${level} ${ghost.tier} ${ghost.kk} vs ${target}`).toBeGreaterThanOrEqual(target * 0.95)
        expect(ghost.kk).toBeLessThanOrEqual(target * 1.05)
        expect(arenaCfg.ghostNames).toContain(ghost.name)
        for (const member of Object.values(ghost.team)) {
          expect(save.activeTypes).toContain(species(member.speciesId).type)
        }
      }
      const copy = JSON.parse(JSON.stringify(save)) as SaveData
      expect(listArenaOpponents(copy, now)).toEqual(ghosts)
    }
  })
})

describe('arena rewards', () => {
  const now = at(2026, 10, 14, 12)

  it('pays the table, never drops points below zero, and pays rank gems once', () => {
    const save = ready(12, now)
    const gold = save.currencies.gold
    expect(applyArenaOutcome(save, 'easy', 'win')).toMatchObject({ gold: 150, pointsDelta: 10 })
    expect(save.arena.points).toBe(10)
    expect(applyArenaOutcome(save, 'mid', 'win').pointsDelta).toBe(20)
    expect(applyArenaOutcome(save, 'hard', 'win').pointsDelta).toBe(30)
    expect(save.arena.points).toBe(60)
    expect(save.currencies.gold).toBe(gold + 150 + 250 + 400)
    save.arena.points = 3
    expect(applyArenaOutcome(save, 'hard', 'loss')).toMatchObject({ gold: 50, pointsDelta: -3 })
    expect(save.arena.points).toBe(0)

    save.arena.points = 90
    save.arena.bestRank = 'bronze'
    const gems = save.currencies.gems
    expect(applyArenaOutcome(save, 'mid', 'win').rankGems).toBe(100)
    expect(save.arena.bestRank).toBe('silver')
    expect(save.arena.points).toBe(110)
    expect(save.currencies.gems).toBe(gems + 100)
    save.arena.points = 90
    expect(applyArenaOutcome(save, 'mid', 'win').rankGems).toBe(0)
    expect(save.currencies.gems).toBe(gems + 100)

    save.arena.points = 500
    save.arena.bestRank = 'bronze'
    expect(awardNewRanks(save)).toBe(600)
    expect(save.arena.bestRank).toBe('platinum')
    expect(awardNewRanks(save)).toBe(0)
  })

  it('uses simulateBattle, grants no experience, and skipping sees that same log', () => {
    const save = ready(12, now)
    const exp = save.monsters.map((monster) => monster.exp)
    const cleared = { ...save.campaign.cleared }
    const adsBefore = JSON.stringify(save.ads)
    const first = previewArenaFight(save, 'mid', now)
    const second = previewArenaFight(save, 'mid', now)
    expect(second).toEqual(first)
    expect(first).not.toBeNull()
    const before = listArenaOpponents(save, now)
    const goldBefore = save.currencies.gold
    const report = fightArena(save, 'mid', now)
    expect(report.ok).toBe(true)
    const value = report.value!
    expect(value.logs[0]).toEqual(first)
    expect(value.rewards.exp).toBe(0)
    expect(value.applied).toBe(true)
    const tier = arenaCfg.tiers.find((entry) => entry.id === 'mid')!
    expect(value.rewards.gold).toBe(value.victory ? tier.gold : arenaCfg.lossGold)
    expect(value.arena?.pointsDelta).toBe(value.victory ? tier.win : 0)
    expect(save.arena.points).toBe(value.victory ? tier.win : 0)
    expect(save.arena.attemptsUsed).toBe(1)
    expect(save.arena.rerollIndex).toBe(1)
    expect(save.monsters.map((monster) => monster.exp)).toEqual(exp)
    expect(save.campaign.cleared).toEqual(cleared)
    expect(JSON.stringify(save.ads)).toBe(adsBefore)
    expect(commitFightRewards(save, value)).toEqual([])
    expect(save.currencies.gold).toBe(goldBefore + value.rewards.gold)
    expect(listArenaOpponents(save, now).map((ghost) => ghost.seed)).not.toEqual(before.map((ghost) => ghost.seed))
  })

  it('caps the day at 5 attempts and 1 free reroll, then opens the chest once', () => {
    const save = ready(8, now)
    const first = listArenaOpponents(save, now)
    expect(rerollArena(save, now).ok).toBe(true)
    const rerolled = listArenaOpponents(save, now)
    expect(rerolled.map((ghost) => ghost.seed)).not.toEqual(first.map((ghost) => ghost.seed))
    expect(listArenaOpponents(save, now)).toEqual(rerolled)
    expect(rerollArena(save, now).ok).toBe(false)
    expect(save.arena.rerollsUsed).toBe(1)

    expect(claimArenaChest(save, now).ok).toBe(false)
    for (let i = 0; i < 5; i++) expect(fightArena(save, 'easy', now).ok).toBe(true)
    expect(fightArena(save, 'easy', now).reason).toBe('Keine Versuche mehr heute.')
    expect(save.arena.attemptsUsed).toBe(5)
    const gems = save.currencies.gems
    const essence = save.currencies.essence
    expect(claimArenaChest(save, now).ok).toBe(true)
    expect(save.currencies.gems).toBe(gems + 30)
    expect(save.currencies.essence).toBe(essence + 20)
    expect(claimArenaChest(save, now).ok).toBe(false)
  })
})

describe('arena day and migration', () => {
  it('resets on a new day and ignores a clock turned backwards', () => {
    const today = at(2026, 10, 14, 12)
    const save = ready(8, today)
    save.arena.attemptsUsed = 5
    save.arena.rerollsUsed = 1
    save.arena.chestClaimed = true
    save.arena.points = 40
    save.arena.rerollIndex = 3
    tick(save, at(2026, 10, 13, 12))
    expect(save.arena.dayKey).toBe('2026-10-14')
    expect(save.arena.attemptsUsed).toBe(5)
    expect(save.arena.rerollsUsed).toBe(1)
    expect(fightArena(save, 'easy', at(2026, 10, 13, 18)).ok).toBe(false)

    const fresh = ready(8, at(2026, 10, 13, 12))
    fresh.arena.dayKey = dayKey(at(2026, 10, 13, 12))
    fresh.arena.attemptsUsed = 5
    fresh.arena.rerollsUsed = 1
    fresh.arena.chestClaimed = true
    fresh.arena.points = 40
    fresh.arena.rerollIndex = 3
    fresh.lastSeen = at(2026, 10, 13, 12)
    tick(fresh, at(2026, 10, 14, 12))
    expect(fresh.arena.dayKey).toBe('2026-10-14')
    expect(fresh.arena.attemptsUsed).toBe(0)
    expect(fresh.arena.rerollsUsed).toBe(0)
    expect(fresh.arena.chestClaimed).toBe(false)
    expect(fresh.arena.points).toBe(40)
    expect(fresh.arena.rerollIndex).toBe(3)

    const same = ready(8, at(2026, 10, 14, 8))
    same.arena.attemptsUsed = 2
    tick(same, at(2026, 10, 14, 20))
    expect(same.arena.attemptsUsed).toBe(2)
  })

  it('migrates an older save that has no arena block', () => {
    const now = at(2026, 10, 14, 12)
    const save = createSave(now)
    const legacy = { ...save, version: 2 } as Partial<SaveData>
    delete legacy.arena
    const migrated = migrateSaveData(legacy as SaveData, now)
    expect(migrated.version).toBe(3)
    expect(migrated.arena).toEqual({
      dayKey: dayKey(now),
      attemptsUsed: 0,
      rerollsUsed: 0,
      rerollIndex: 0,
      points: 0,
      bestRank: 'bronze',
      chestClaimed: false,
      wins: 0,
      losses: 0
    })
    migrated.arena.attemptsUsed = 4
    migrated.arena.points = 12
    const again = migrateSaveData(migrated, now + 5000)
    expect(again.arena.attemptsUsed).toBe(4)
    expect(again.arena.points).toBe(12)
    expect(again.currencies.gold).toBe(save.currencies.gold)
  })
})

describe('arena ads', () => {
  it('does not request an interstitial or a rewarded button from the arena flow', async () => {
    const spy = vi.spyOn(ads, 'maybeInterstitial').mockResolvedValue()
    const save = createSave(0)
    save.tutorialDone = true
    save.campaign.cleared['1-5'] = 3
    setSessionPlaytimeForTests(10_000)
    await closeToCity(save, 5_000_000, true, false)
    expect(spy).not.toHaveBeenCalled()
    await closeToCity(save, 5_000_000, true, true)
    expect(spy).toHaveBeenCalledTimes(1)
    spy.mockRestore()
  })
})
