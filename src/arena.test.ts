import { describe, expect, it, vi } from 'vitest'
import * as ads from './ads'
import * as battle from './battle'
import {
  applyArenaOutcome,
  arenaPlayerPower,
  arenaUnlocked,
  awardNewRanks,
  claimArenaChest,
  defensePower,
  listArenaOpponents,
  listDefenseAttackers,
  rankForPoints,
  rankLabel,
  rerollArena,
  runDefenseDay,
  syncArenaSeason
} from './arena'
import { arenaCfg, dayKey, isoWeekKey, species } from './data'
import { hashSeed } from './rng'
import { setSessionPlaytimeForTests } from './ads'
import {
  closeToCity,
  commitFightRewards,
  copyTeamToDefense,
  createSave,
  fightArena,
  migrateSaveData,
  previewArenaFight,
  releaseMonster,
  setDefense,
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
    expect(arenaCfg.tiers.map((tier) => tier.kkFactor)).toEqual([0.8, 1, 1.2])
    expect(arenaCfg.tiers.map((tier) => tier.win)).toEqual([8, 16, 28])
    expect(arenaCfg.tiers.map((tier) => tier.gold)).toEqual([120, 200, 350])
    expect(arenaCfg.lossPoints).toBe(-3)
    expect(arenaCfg.ranks.map((rank) => rank.min)).toEqual([0, 80, 200, 400, 650])
    expect(applyArenaOutcome(save, 'easy', 'win')).toMatchObject({ gold: 120, pointsDelta: 8 })
    expect(save.arena.points).toBe(8)
    expect(applyArenaOutcome(save, 'mid', 'win').pointsDelta).toBe(16)
    expect(applyArenaOutcome(save, 'hard', 'win').pointsDelta).toBe(28)
    expect(save.arena.points).toBe(52)
    expect(save.currencies.gold).toBe(gold + 120 + 200 + 350)
    save.arena.points = 3
    expect(applyArenaOutcome(save, 'hard', 'loss')).toMatchObject({ gold: 50, pointsDelta: -3 })
    expect(save.arena.points).toBe(0)

    save.arena.points = 90
    save.arena.bestRank = 'bronze'
    const gems = save.currencies.gems
    expect(applyArenaOutcome(save, 'mid', 'win').rankGems).toBe(100)
    expect(save.arena.bestRank).toBe('silver')
    expect(save.arena.points).toBe(106)
    expect(save.currencies.gems).toBe(gems + 100)
    save.arena.points = 90
    expect(applyArenaOutcome(save, 'mid', 'win').rankGems).toBe(0)
    expect(save.currencies.gems).toBe(gems + 100)

    save.arena.points = 500
    save.arena.bestRank = 'bronze'
    expect(awardNewRanks(save)).toBe(600)
    expect(save.arena.bestRank).toBe('platinum')
    expect(awardNewRanks(save)).toBe(0)

    save.arena.points = 642
    save.arena.bestRank = 'platinum'
    save.arena.seasonBest = 'platinum'
    expect(applyArenaOutcome(save, 'easy', 'win')).toMatchObject({ rankGems: 400, points: 650 })
    expect(save.arena.bestRank).toBe('diamond')
    expect(save.arena.seasonBest).toBe('diamond')
    expect(rankLabel('diamond')).toBe('Diamant')
    expect(rankForPoints(650).id).toBe('diamond')
    expect(rankForPoints(649).id).toBe('platinum')
    const gemsAfter = save.currencies.gems
    save.arena.points = 0
    save.arena.points = 650
    expect(awardNewRanks(save)).toBe(0)
    expect(save.currencies.gems).toBe(gemsAfter)
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
    expect(save.arena.rerollIndex).toBe(value.victory ? 1 : 0)
    expect(save.monsters.map((monster) => monster.exp)).toEqual(exp)
    expect(save.campaign.cleared).toEqual(cleared)
    expect(JSON.stringify(save.ads)).toBe(adsBefore)
    expect(commitFightRewards(save, value)).toEqual([])
    expect(save.currencies.gold).toBe(goldBefore + value.rewards.gold)
    const after = listArenaOpponents(save, now).map((ghost) => ghost.seed)
    if (value.victory) expect(after).not.toEqual(before.map((ghost) => ghost.seed))
    else expect(after).toEqual(before.map((ghost) => ghost.seed))
  })

  it('rolls a new board only after a win and keeps it after a loss', () => {
    const save = ready(8, now)
    const before = listArenaOpponents(save, now).map((ghost) => ghost.seed)
    const log = {
      seed: 1,
      rounds: 1,
      result: 'loss' as const,
      stars: 0 as const,
      events: [],
      koCount: 0,
      roster: []
    }
    const spy = vi.spyOn(battle, 'simulateBattle').mockReturnValue(log)
    const loss = fightArena(save, 'hard', now)
    expect(loss.ok).toBe(true)
    expect(loss.value?.victory).toBe(false)
    expect(loss.value?.rewards.exp).toBe(0)
    expect(save.arena.attemptsUsed).toBe(1)
    expect(save.arena.rerollIndex).toBe(0)
    expect(save.arena.losses).toBe(1)
    expect(listArenaOpponents(save, now).map((ghost) => ghost.seed)).toEqual(before)

    spy.mockReturnValue({ ...log, result: 'win', stars: 3 })
    const win = fightArena(save, 'hard', now)
    expect(win.value?.victory).toBe(true)
    expect(win.value?.rewards.exp).toBe(0)
    expect(save.arena.attemptsUsed).toBe(2)
    expect(save.arena.rerollIndex).toBe(1)
    expect(save.arena.wins).toBe(1)
    expect(listArenaOpponents(save, now).map((ghost) => ghost.seed)).not.toEqual(before)
    spy.mockRestore()
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
    expect(migrated.version).toBe(4)
    expect(migrated.arena).toEqual({
      dayKey: dayKey(now),
      attemptsUsed: 0,
      rerollsUsed: 0,
      rerollIndex: 0,
      points: 0,
      bestRank: 'bronze',
      chestClaimed: false,
      wins: 0,
      losses: 0,
      defense: { ...save.team },
      defenseDayKey: null,
      defenseLog: [],
      seasonKey: isoWeekKey(now),
      seasonBest: 'bronze',
      lastSeasonResult: null
    })
    migrated.arena.attemptsUsed = 4
    migrated.arena.points = 12
    const again = migrateSaveData(migrated, now + 5000)
    expect(again.arena.attemptsUsed).toBe(4)
    expect(again.arena.points).toBe(12)
    expect(again.currencies.gold).toBe(save.currencies.gold)
  })
})

describe('arena defense', () => {
  const now = at(2026, 10, 14, 12)

  function defended(level = 12): SaveData {
    const save = ready(level, now)
    copyTeamToDefense(save)
    return save
  }

  it('copies the campaign team and still allows the same monster in both', () => {
    const save = ready(8, now)
    for (const slot of Object.keys(save.arena.defense) as (keyof SaveData['arena']['defense'])[]) {
      save.arena.defense[slot] = null
    }
    expect(copyTeamToDefense(save).messages).toContain('Team übernommen.')
    expect(save.arena.defense).toEqual(save.team)
    const uid = save.team.F1
    expect(uid).toBeTruthy()
    setDefense(save, 'H3', null)
    expect(save.team.H3).toBeTruthy()
    setDefense(save, 'F2', uid)
    expect(save.team.F1).toBe(uid)
    expect(save.arena.defense.F1).toBeNull()
    expect(save.arena.defense.F2).toBe(uid)
  })

  it('removes a released monster from the defense team', () => {
    const save = defended()
    const uid = save.arena.defense.H3
    expect(uid).toBeTruthy()
    const monster = save.monsters.find((entry) => entry.uid === uid)
    expect(monster).toBeTruthy()
    monster!.locked = false
    expect(releaseMonster(save, uid!).ok).toBe(true)
    expect(save.arena.defense.H3).toBeNull()
    expect(save.team.H3).toBeNull()
    expect(save.monsters.some((monster) => monster.uid === uid)).toBe(false)
  })

  it('simulates three ghost attackers at the defense KK and pays only for wins', () => {
    const save = defended()
    const power = defensePower(save)
    expect(power).toBe(teamPower(save))
    const ghosts = listDefenseAttackers(save, now)
    expect(ghosts).toHaveLength(3)
    ghosts.forEach((ghost, index) => {
      expect(ghost.seed).toBe(hashSeed(`${dayKey(now)}def${index}`))
      const target = power * arenaCfg.defense.kkFactor
      expect(ghost.kk).toBeGreaterThanOrEqual(target * 0.95)
      expect(ghost.kk).toBeLessThanOrEqual(target * 1.05)
    })
    const exp = save.monsters.map((monster) => monster.exp)
    const spy = vi.spyOn(battle, 'simulateBattle').mockReturnValue({
      seed: 1,
      rounds: 1,
      result: 'loss',
      stars: 0,
      events: [],
      koCount: 0,
      roster: []
    })
    const gold = save.currencies.gold
    const report = runDefenseDay(save, now)
    expect(spy).toHaveBeenCalledTimes(3)
    const first = spy.mock.calls[0][0]
    expect(first.seed).toBe(hashSeed(`${dayKey(now)}def0`))
    expect(first.allies).toHaveLength(5)
    expect(first.enemies.length).toBeGreaterThan(0)
    expect(first.enemies.map((unit) => unit.speciesId).sort()).toEqual(save.monsters.map((monster) => monster.speciesId).sort())
    expect(report).toMatchObject({ ran: true, points: 24, gold: 300 })
    expect(report.log.every((fight) => fight.win)).toBe(true)
    expect(save.arena.points).toBe(24)
    expect(save.currencies.gold).toBe(gold + 300)
    expect(save.arena.attemptsUsed).toBe(0)
    expect(save.monsters.map((monster) => monster.exp)).toEqual(exp)
    expect(runDefenseDay(save, now)).toMatchObject({ ran: false, points: 0, gold: 0 })
    expect(save.currencies.gold).toBe(gold + 300)
    expect(save.arena.defenseLog).toEqual(report.log)
    spy.mockRestore()
  })

  it('keeps the same report after a reload and pays nothing for losses or an empty team', () => {
    const save = defended()
    const first = runDefenseDay(save, now)
    const copy = JSON.parse(JSON.stringify(save)) as SaveData
    copy.arena.defenseDayKey = null
    const second = runDefenseDay(copy, now)
    expect(second.log).toEqual(first.log)
    expect(second.gold).toBe(first.gold)
    expect(second.points).toBe(first.points)

    const empty = defended()
    for (const slot of Object.keys(empty.arena.defense) as (keyof SaveData['arena']['defense'])[]) empty.arena.defense[slot] = null
    const gold = empty.currencies.gold
    const skipped = runDefenseDay(empty, now)
    expect(skipped).toMatchObject({ ran: true, log: [], gold: 0, points: 0 })
    expect(empty.arena.defenseDayKey).toBe(dayKey(now))
    expect(empty.currencies.gold).toBe(gold)
    copyTeamToDefense(empty)
    expect(runDefenseDay(empty, now).ran).toBe(false)
    expect(empty.currencies.gold).toBe(gold)

    const losses = defended()
    const spy = vi.spyOn(battle, 'simulateBattle').mockReturnValue({
      seed: 1,
      rounds: 1,
      result: 'win',
      stars: 3,
      events: [],
      koCount: 0,
      roster: []
    })
    const before = losses.currencies.gold
    expect(runDefenseDay(losses, now)).toMatchObject({ points: 0, gold: 0 })
    expect(losses.arena.points).toBe(0)
    expect(losses.currencies.gold).toBe(before)
    expect(losses.arena.defenseLog.every((fight) => !fight.win)).toBe(true)
    spy.mockRestore()
  })

  it('does not catch up missed days and ignores a clock turned backwards', () => {
    const save = defended()
    save.arena.defenseDayKey = dayKey(at(2026, 10, 12, 12))
    const spy = vi.spyOn(battle, 'simulateBattle').mockReturnValue({
      seed: 1,
      rounds: 1,
      result: 'loss',
      stars: 0,
      events: [],
      koCount: 0,
      roster: []
    })
    runDefenseDay(save, now)
    expect(spy).toHaveBeenCalledTimes(3)
    expect(save.arena.points).toBe(24)
    expect(save.arena.defenseDayKey).toBe('2026-10-14')
    spy.mockClear()
    runDefenseDay(save, at(2026, 10, 13, 12))
    expect(spy).not.toHaveBeenCalled()
    expect(save.arena.points).toBe(24)
    expect(save.arena.defenseDayKey).toBe('2026-10-14')
    runDefenseDay(save, at(2026, 10, 16, 12))
    expect(spy).toHaveBeenCalledTimes(3)
    expect(save.arena.points).toBe(48)
    spy.mockRestore()
  })
})

describe('arena season', () => {
  const monday = at(2026, 10, 19, 0)
  const beforeMonday = at(2026, 10, 18, 23)
  const twoWeeksLater = at(2026, 11, 2, 12)

  it('switches on Monday 00:00 local, not at the 04:00 day reset', () => {
    expect(isoWeekKey(monday)).toMatch(/^\d{4}-W\d{2}$/)
    expect(isoWeekKey(monday)).not.toBe(isoWeekKey(beforeMonday))
    expect(isoWeekKey(at(2026, 10, 19, 3))).toBe(isoWeekKey(monday))
    expect(dayKey(at(2026, 10, 19, 2))).toBe(dayKey(at(2026, 10, 18, 12)))
    expect(isoWeekKey(at(2026, 10, 19, 2))).not.toBe(isoWeekKey(at(2026, 10, 18, 12)))
  })

  it('pays the last season once, resets points, and keeps lifetime rank gems', () => {
    const save = ready(8, at(2026, 10, 14, 12))
    save.arena.seasonKey = isoWeekKey(at(2026, 10, 12, 12))
    save.arena.seasonBest = 'diamond'
    save.arena.bestRank = 'diamond'
    save.arena.points = 700
    const gold = save.currencies.gold
    const gems = save.currencies.gems
    const essence = save.currencies.essence
    const tickets = save.currencies.tickets
    const result = syncArenaSeason(save, twoWeeksLater)
    expect(result).toMatchObject({
      seasonKey: isoWeekKey(at(2026, 10, 12, 12)),
      rank: 'diamond',
      gold: 4000,
      gems: 200,
      essence: 100,
      tickets: 1
    })
    expect(save.currencies.gold).toBe(gold + 4000)
    expect(save.currencies.gems).toBe(gems + 200)
    expect(save.currencies.essence).toBe(essence + 100)
    expect(save.currencies.tickets).toBe(tickets + 1)
    expect(save.arena.points).toBe(0)
    expect(save.arena.seasonBest).toBe('bronze')
    expect(save.arena.seasonKey).toBe(isoWeekKey(twoWeeksLater))
    expect(save.arena.bestRank).toBe('diamond')
    expect(save.arena.lastSeasonResult).toEqual(result)
    expect(syncArenaSeason(save, twoWeeksLater)).toBeNull()
    expect(save.currencies.gold).toBe(gold + 4000)

    save.arena.points = 650
    expect(applyArenaOutcome(save, 'easy', 'win').rankGems).toBe(0)
    expect(save.arena.bestRank).toBe('diamond')
  })

  it('ignores a clock turned back to an older week', () => {
    const save = ready(8, twoWeeksLater)
    save.arena.seasonKey = isoWeekKey(twoWeeksLater)
    save.arena.points = 220
    save.arena.seasonBest = 'gold'
    const gold = save.currencies.gold
    expect(syncArenaSeason(save, at(2026, 10, 14, 12))).toBeNull()
    expect(save.arena.seasonKey).toBe(isoWeekKey(twoWeeksLater))
    expect(save.arena.points).toBe(220)
    expect(save.arena.seasonBest).toBe('gold')
    expect(save.currencies.gold).toBe(gold)
    tick(save, at(2026, 10, 14, 12))
    expect(save.arena.points).toBe(220)
    expect(save.arena.seasonKey).toBe(isoWeekKey(twoWeeksLater))
  })

  it('migrates a slice 1 save with the team as defense and keeps the points', () => {
    const now = at(2026, 10, 14, 12)
    const save = ready(8, now)
    const slice1 = {
      dayKey: save.arena.dayKey,
      attemptsUsed: 2,
      rerollsUsed: 0,
      rerollIndex: 1,
      points: 40,
      bestRank: 'silver',
      chestClaimed: false,
      wins: 1,
      losses: 0
    }
    save.arena = slice1 as SaveData['arena']
    save.version = 3
    const migrated = migrateSaveData(save, now)
    expect(migrated.version).toBe(4)
    expect(migrated.arena.points).toBe(40)
    expect(migrated.arena.attemptsUsed).toBe(2)
    expect(migrated.arena.rerollIndex).toBe(1)
    expect(migrated.arena.defense).toEqual(save.team)
    expect(migrated.arena.seasonKey).toBe(isoWeekKey(now))
    expect(migrated.arena.seasonBest).toBe('silver')
    expect(migrated.arena.bestRank).toBe('silver')
    expect(migrated.arena.defenseDayKey).toBeNull()
    expect(migrated.arena.lastSeasonResult).toBeNull()
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
