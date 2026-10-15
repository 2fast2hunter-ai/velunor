import { simulateBattle } from './battle'
import { arenaCfg, dayKey, formatInt, hasUnlock, isoWeekKey, maxLevelFor, monsters, teamSlotLimit } from './data'
import { hashSeed, mulberry32 } from './rng'
import { combatPower, instanceStats } from './stats'
import {
  ALL_SLOTS,
  type ArenaState,
  type BattleUnitInput,
  type DefenseFight,
  type LastSeasonResult,
  type MonsterInstance,
  type Rarity,
  type SaveData,
  type SlotId
} from './types'

const RANK_LABEL: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silber',
  gold: 'Gold',
  platinum: 'Platin',
  diamond: 'Diamant'
}

const TIER_LABEL: Record<string, string> = {
  easy: 'Leicht',
  mid: 'Mittel',
  hard: 'Schwer'
}

export interface GhostMember {
  speciesId: string
  rarity: Rarity
  level: number
}

/** Runtime ghost. Only the seed inputs (dayKey + rerollIndex + slot) are stored. */
export interface GhostTeam {
  name: string
  tier: string
  kk: number
  seed: number
  statMult: number
  team: Record<SlotId, GhostMember>
}

export interface ArenaAction {
  ok: boolean
  reason?: string
  messages: string[]
}

export interface DefenseReport {
  ran: boolean
  log: DefenseFight[]
  points: number
  gold: number
  rankGems: number
}

type SeasonPayout = { gold?: number; gems?: number; essence?: number; tickets?: number }

function blankDefense(): Record<SlotId, string | null> {
  return { F1: null, F2: null, H1: null, H2: null, H3: null }
}

function defenseFromTeam(save: SaveData): Record<SlotId, string | null> {
  const defense = blankDefense()
  for (const slot of ALL_SLOTS) defense[slot] = save.team?.[slot] ?? null
  return defense
}

function pruneDefense(save: SaveData): void {
  if (!save.arena?.defense) return
  const alive = new Set(save.monsters.map((monster) => monster.uid))
  for (const slot of ALL_SLOTS) {
    const uid = save.arena.defense[slot]
    if (uid && !alive.has(uid)) save.arena.defense[slot] = null
  }
}

export function freshArena(key: string, now: number): ArenaState {
  return {
    dayKey: key,
    attemptsUsed: 0,
    rerollsUsed: 0,
    rerollIndex: 0,
    points: 0,
    bestRank: 'bronze',
    chestClaimed: false,
    wins: 0,
    losses: 0,
    defense: blankDefense(),
    defenseDayKey: null,
    defenseLog: [],
    seasonKey: isoWeekKey(now),
    seasonBest: 'bronze',
    lastSeasonResult: null
  }
}

export function arenaUnlocked(save: SaveData): boolean {
  return save.buildings.townhall.level >= arenaCfg.unlockTownhall
}

export function rankLabel(id: string): string {
  return RANK_LABEL[id] ?? id
}

export function tierLabel(id: string): string {
  return TIER_LABEL[id] ?? id
}

export function rankForPoints(points: number): { id: string; min: number; gems: number } {
  let current = arenaCfg.ranks[0]
  for (const rank of arenaCfg.ranks) {
    if (points >= rank.min) current = rank
  }
  return current
}

export function nextRank(points: number): { id: string; min: number; gems: number } | null {
  return arenaCfg.ranks.find((rank) => rank.min > points) ?? null
}

function rememberSeasonBest(save: SaveData): void {
  const order = arenaCfg.ranks.map((rank) => rank.id)
  const next = order.indexOf(rankForPoints(save.arena.points).id)
  const prev = order.indexOf(save.arena.seasonBest)
  if (next > prev) save.arena.seasonBest = order[next]
}

function initialSeasonBest(arena: ArenaState): string {
  const known = arenaCfg.ranks.some((rank) => rank.id === arena.bestRank)
  return known ? arena.bestRank : rankForPoints(arena.points).id
}

/** New dayKey only moves forward. Turning the clock back does not refill attempts. */
export function syncArenaDay(save: SaveData, now: number): void {
  const key = dayKey(now)
  if (!save.arena) save.arena = freshArena(key, now)
  if (key > save.arena.dayKey) {
    save.arena.dayKey = key
    save.arena.attemptsUsed = 0
    save.arena.rerollsUsed = 0
    save.arena.chestClaimed = false
  }
}

export function ensureArena(save: SaveData, now: number): void {
  const key = dayKey(now)
  const week = isoWeekKey(now)
  if (!save.arena) {
    save.arena = freshArena(key, now)
    save.arena.defense = defenseFromTeam(save)
  }
  const arena = save.arena
  if (!arena.dayKey) arena.dayKey = key
  if (arena.attemptsUsed == null) arena.attemptsUsed = 0
  if (arena.rerollsUsed == null) arena.rerollsUsed = 0
  if (arena.rerollIndex == null) arena.rerollIndex = 0
  arena.points = Math.max(0, arena.points || 0)
  if (!arena.bestRank) arena.bestRank = 'bronze'
  if (arena.chestClaimed == null) arena.chestClaimed = false
  if (arena.wins == null) arena.wins = 0
  if (arena.losses == null) arena.losses = 0
  if (!arena.defense) arena.defense = defenseFromTeam(save)
  for (const slot of ALL_SLOTS) {
    if (arena.defense[slot] === undefined) arena.defense[slot] = null
  }
  pruneDefense(save)
  if (arena.defenseDayKey === undefined) arena.defenseDayKey = null
  if (!Array.isArray(arena.defenseLog)) arena.defenseLog = []
  if (!arena.seasonKey) arena.seasonKey = week
  if (!arena.seasonBest) arena.seasonBest = initialSeasonBest(arena)
  if (arena.lastSeasonResult === undefined) arena.lastSeasonResult = null
  save.version = 4
}

function seasonPayout(rankId: string): { gold: number; gems: number; essence: number; tickets: number } {
  const table = arenaCfg.seasonRewards as Record<string, SeasonPayout>
  const row = table[rankId] ?? table.bronze ?? {}
  return {
    gold: row.gold ?? 0,
    gems: row.gems ?? 0,
    essence: row.essence ?? 0,
    tickets: row.tickets ?? 0
  }
}

/** Next Monday 00:00 local, strictly after `ts`. That is the season reset. */
export function nextSeasonAt(ts: number): number {
  const date = new Date(ts)
  const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = midnight.getDay()
  midnight.setDate(midnight.getDate() + ((8 - day) % 7 || 7))
  return midnight.getTime()
}

/** `3T 14h` while a day remains, otherwise hours and minutes. */
export function formatSeasonLeft(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 60000))
  const days = Math.floor(total / 1440)
  const hours = Math.floor((total % 1440) / 60)
  const mins = total % 60
  if (days > 0) return `${days}T ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

/** `?debugSeason=next` reads as the coming Monday 00:00 so a week switch can be played once. */
export function debugSeasonFlag(): string | null {
  if (typeof location === 'undefined') return null
  try {
    return new URLSearchParams(location.search).get('debugSeason')
  } catch {
    return null
  }
}

export function resolveSeasonNow(now: number, flag: string | null = debugSeasonFlag()): number {
  if (flag === 'next') return nextSeasonAt(now)
  return now
}

export function seasonStatusLine(seasonKey: string, now: number): string {
  const clock = resolveSeasonNow(now)
  const left = formatSeasonLeft(nextSeasonAt(clock) - clock)
  return `Saison ${seasonKey} · Reset Mo 00:00 · Saison endet in ${left}`
}

export function seasonRewardText(rankId: string): string {
  const table = arenaCfg.seasonRewards as Record<string, { gold?: number; gems?: number; essence?: number; tickets?: number }>
  const row = table[rankId] ?? {}
  const bits: string[] = []
  if (row.gems) bits.push(`${formatInt(row.gems)} Juwelen`)
  if (row.gold) bits.push(`${formatInt(row.gold)} Gold`)
  if (row.essence) bits.push(`${formatInt(row.essence)} Essenz`)
  if (row.tickets) bits.push(`${row.tickets} Ticket`)
  return bits.join(' · ')
}

export function defensePayoutLine(): string {
  return `Sieg +${arenaCfg.defense.winPoints} P./+${arenaCfg.defense.winGold} Gold, Niederlage ±0`
}

export const EMPTY_DEFENSE_HINT = 'Leer = keine Verteidigungskämpfe'

/**
 * Week switch is Monday 00:00 local. An older seasonKey (clock turned back) is ignored.
 * Several missed weeks pay the last season once, then jump to the current week.
 * `?debugSeason=next` treats the clock as the coming Monday so the switch can be played.
 */
export function syncArenaSeason(save: SaveData, now: number): LastSeasonResult | null {
  if (!save.arena?.seasonKey) return null
  const key = isoWeekKey(resolveSeasonNow(now))
  if (key <= save.arena.seasonKey) return null
  const rank = save.arena.seasonBest || 'bronze'
  const payout = seasonPayout(rank)
  save.currencies.gold += payout.gold
  save.currencies.gems += payout.gems
  save.currencies.essence += payout.essence
  save.currencies.tickets += payout.tickets
  const result: LastSeasonResult = { seasonKey: save.arena.seasonKey, rank, ...payout }
  save.arena.points = 0
  save.arena.seasonBest = 'bronze'
  save.arena.seasonKey = key
  save.arena.lastSeasonResult = result
  return result
}

export function dismissSeasonResult(save: SaveData): void {
  if (save.arena) save.arena.lastSeasonResult = null
}

function roster(save: SaveData): MonsterInstance[] {
  const open = new Set(teamSlotLimit(save.buildings.townhall.level))
  const list: MonsterInstance[] = []
  for (const slot of ALL_SLOTS) {
    if (!open.has(slot)) continue
    const uid = save.team[slot]
    const monster = uid ? save.monsters.find((entry) => entry.uid === uid) : undefined
    if (monster) list.push(monster)
  }
  return list
}

export function defenseRoster(save: SaveData): MonsterInstance[] {
  const open = new Set(teamSlotLimit(save.buildings.townhall.level))
  const list: MonsterInstance[] = []
  if (!save.arena?.defense) return list
  for (const slot of ALL_SLOTS) {
    if (!open.has(slot)) continue
    const uid = save.arena.defense[slot]
    const monster = uid ? save.monsters.find((entry) => entry.uid === uid) : undefined
    if (monster) list.push(monster)
  }
  return list
}

function powerOf(list: MonsterInstance[]): number {
  return list.reduce((sum, monster) => {
    const extra = (monster.skills?.slot2 ? 1 : 0) + (monster.skills?.slot3 ? 1 : 0)
    return sum + combatPower(instanceStats(monster.speciesId, monster.rarity, monster.level, monster.potential), extra)
  }, 0)
}

export function arenaPlayerPower(save: SaveData): number {
  return powerOf(roster(save))
}

export function defensePower(save: SaveData): number {
  return powerOf(defenseRoster(save))
}

function unlockedSpecies(save: SaveData): string[] {
  const active = new Set(save.activeTypes ?? [])
  const ids = monsters.filter((monster) => active.has(monster.type)).map((monster) => monster.id)
  return ids.length ? ids : monsters.map((monster) => monster.id)
}

function rollInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

export function ghostPower(members: GhostMember[], statMult = 1): number {
  return members.reduce((sum, member) => {
    const stats = instanceStats(member.speciesId, member.rarity, member.level)
    return sum + combatPower({
      hp: stats.hp * statMult,
      atk: stats.atk * statMult,
      def: stats.def * statMult,
      spd: stats.spd
    })
  }, 0)
}

function inBand(kk: number, target: number): boolean {
  return kk >= target * 0.95 && kk <= target * 1.05
}

/** Walk levels until combat power sits in the target band, then scale only if a level cap blocks it. */
function fitGhost(members: GhostMember[], target: number): { members: GhostMember[]; kk: number; statMult: number } {
  const fitted = members.map((member) => ({ ...member }))
  let kk = ghostPower(fitted, 1)
  for (let step = 0; step < 400 && !inBand(kk, target); step++) {
    const dir = kk < target ? 1 : -1
    let best = -1
    let bestKk = kk
    let bestDist = Math.abs(kk - target)
    for (let i = 0; i < fitted.length; i++) {
      const next = fitted[i].level + dir
      const cap = maxLevelFor(fitted[i].rarity)
      if (next < 1 || next > cap) continue
      fitted[i].level = next
      const trial = ghostPower(fitted, 1)
      fitted[i].level -= dir
      const dist = Math.abs(trial - target)
      if (dist < bestDist) {
        bestDist = dist
        bestKk = trial
        best = i
      }
    }
    if (best < 0) break
    fitted[best].level += dir
    kk = bestKk
  }
  if (inBand(kk, target) || kk <= 0 || target <= 0) return { members: fitted, kk, statMult: 1 }
  let statMult = target / kk
  let scaled = ghostPower(fitted, statMult)
  for (let i = 0; i < 16 && !inBand(scaled, target) && scaled > 0; i++) {
    statMult *= target / scaled
    scaled = ghostPower(fitted, statMult)
  }
  if (!inBand(scaled, target)) {
    const guess = target / Math.max(1, kk)
    let bestMult = statMult
    let bestKk = scaled
    for (let step = -50; step <= 50; step++) {
      const trialMult = guess * (1 + step * 0.004)
      const trialKk = ghostPower(fitted, trialMult)
      if (inBand(trialKk, target)) return { members: fitted, kk: trialKk, statMult: trialMult }
      if (Math.abs(trialKk - target) < Math.abs(bestKk - target)) {
        bestMult = trialMult
        bestKk = trialKk
      }
    }
    statMult = bestMult
    scaled = bestKk
  }
  return { members: fitted, kk: scaled, statMult }
}

function rollGhost(save: SaveData, seedText: string, tierId: string, target: number, samples: MonsterInstance[]): GhostTeam {
  const seed = hashSeed(seedText)
  const rng = mulberry32(seed)
  const name = arenaCfg.ghostNames[Math.floor(rng() * arenaCfg.ghostNames.length)] ?? arenaCfg.ghostNames[0]
  const avgLevel = Math.round(samples.reduce((sum, monster) => sum + monster.level, 0) / samples.length)
  const avgRarity = Math.round(samples.reduce((sum, monster) => sum + monster.rarity, 0) / samples.length)
  const pool = unlockedSpecies(save)
  const rolled: GhostMember[] = ALL_SLOTS.map(() => {
    const speciesId = pool[Math.floor(rng() * pool.length)]
    const rarity = clamp(avgRarity + rollInt(rng, -1, 1), 0, 9) as Rarity
    const level = clamp(avgLevel + rollInt(rng, -2, 2), 1, maxLevelFor(rarity))
    return { speciesId, rarity, level }
  })
  const fitted = fitGhost(rolled, Math.max(1, target))
  const slots = {} as Record<SlotId, GhostMember>
  ALL_SLOTS.forEach((slot, slotIndex) => {
    slots[slot] = fitted.members[slotIndex]
  })
  return { name, tier: tierId, kk: fitted.kk, seed, statMult: fitted.statMult, team: slots }
}

export function listArenaOpponents(save: SaveData, now = Date.now()): GhostTeam[] {
  syncArenaDay(save, now)
  const team = roster(save)
  if (!team.length || !save.arena) return []
  const power = arenaPlayerPower(save)
  return arenaCfg.tiers.map((tier, index) => {
    const seedText = `${save.arena.dayKey}:${save.arena.rerollIndex}:${index}:${tier.id}`
    return rollGhost(save, seedText, tier.id, power * tier.kkFactor, team)
  })
}

export function listDefenseAttackers(save: SaveData, now = Date.now()): GhostTeam[] {
  const team = defenseRoster(save)
  if (!team.length || !save.arena) return []
  const power = defensePower(save)
  const key = save.arena.dayKey || dayKey(now)
  const ghosts: GhostTeam[] = []
  for (let i = 0; i < arenaCfg.defense.fightsPerDay; i++) {
    ghosts.push(rollGhost(save, `${key}def${i}`, 'defense', power * arenaCfg.defense.kkFactor, team))
  }
  return ghosts
}

export function ghostBattleUnits(ghost: GhostTeam): BattleUnitInput[] {
  return ALL_SLOTS.map((slot) => {
    const member = ghost.team[slot]
    return {
      speciesId: member.speciesId,
      rarity: member.rarity,
      level: member.level,
      slot,
      statMult: ghost.statMult
    }
  })
}

function defenseBattleUnits(save: SaveData): BattleUnitInput[] {
  const open = new Set(teamSlotLimit(save.buildings.townhall.level))
  const list: BattleUnitInput[] = []
  for (const slot of ALL_SLOTS) {
    if (!open.has(slot) || !save.arena?.defense[slot]) continue
    const monster = save.monsters.find((entry) => entry.uid === save.arena.defense[slot])
    if (!monster) continue
    list.push({
      speciesId: monster.speciesId,
      rarity: monster.rarity,
      level: monster.level,
      slot,
      potential: monster.potential,
      sigRank: monster.skills.sigRank,
      learned: monster.skills.slot2,
      slot3: monster.skills.slot3,
      skillOrder: monster.skills.skillOrder
    })
  }
  return list
}

/** First-time rank gems. Dropping points never takes a rank reward back or pays it twice. */
export function awardNewRanks(save: SaveData): number {
  const ranks = arenaCfg.ranks
  const best = Math.max(0, ranks.findIndex((rank) => rank.id === save.arena.bestRank))
  let now = 0
  ranks.forEach((rank, index) => {
    if (save.arena.points >= rank.min) now = index
  })
  let gems = 0
  for (let i = best + 1; i <= now; i++) gems += ranks[i].gems
  if (now > best) save.arena.bestRank = ranks[now].id
  return gems
}

export function applyArenaOutcome(save: SaveData, tierId: string, result: 'win' | 'loss'): ArenaAction & {
  gold: number
  pointsDelta: number
  rankGems: number
  points: number
} {
  const tier = arenaCfg.tiers.find((entry) => entry.id === tierId)
  if (!tier) {
    return { ok: false, reason: 'Unbekannter Gegner.', messages: [], gold: 0, pointsDelta: 0, rankGems: 0, points: save.arena.points }
  }
  const won = result === 'win'
  const gold = won ? tier.gold : arenaCfg.lossGold
  const before = save.arena.points
  save.arena.points = Math.max(0, before + (won ? tier.win : arenaCfg.lossPoints))
  const pointsDelta = save.arena.points - before
  save.currencies.gold += gold
  if (won) save.arena.wins += 1
  else save.arena.losses += 1
  rememberSeasonBest(save)
  const rankGems = awardNewRanks(save)
  save.currencies.gems += rankGems
  return { ok: true, messages: [], gold, pointsDelta, rankGems, points: save.arena.points }
}

/**
 * First arena open of the day. Empty defense fights nothing and still spends the day.
 * A clock turned backwards does not run another set. Missed days are not caught up.
 * simulateBattle(ghost, defense, seed): the ghost attacks, a defense win is the attacker failing.
 */
export function runDefenseDay(save: SaveData, now: number): DefenseReport {
  syncArenaDay(save, now)
  if (!save.arena) return { ran: false, log: [], points: 0, gold: 0, rankGems: 0 }
  const key = dayKey(now)
  const idle: DefenseReport = { ran: false, log: save.arena.defenseLog ?? [], points: 0, gold: 0, rankGems: 0 }
  if (save.arena.defenseDayKey && key <= save.arena.defenseDayKey) return idle
  save.arena.defenseDayKey = key
  const defenders = defenseBattleUnits(save)
  if (!defenders.length) {
    save.arena.defenseLog = []
    return { ran: true, log: [], points: 0, gold: 0, rankGems: 0 }
  }
  const synergy = hasUnlock(save.buildings.townhall.level, 'synergies')
  const classSynergy = hasUnlock(save.buildings.townhall.level, 'class_synergies')
  const log: DefenseFight[] = listDefenseAttackers(save, now).map((ghost) => {
    const fought = simulateBattle({
      seed: ghost.seed,
      allies: ghostBattleUnits(ghost),
      enemies: defenders,
      allySynergy: synergy,
      enemySynergy: synergy,
      allyClassSynergy: classSynergy,
      enemyClassSynergy: classSynergy
    })
    return { name: ghost.name, win: fought.result !== 'win' }
  })
  const wins = log.filter((fight) => fight.win).length
  const gold = wins * arenaCfg.defense.winGold
  const before = save.arena.points
  save.arena.points = Math.max(0, before + wins * arenaCfg.defense.winPoints)
  save.currencies.gold += gold
  save.arena.defenseLog = log
  rememberSeasonBest(save)
  const rankGems = awardNewRanks(save)
  save.currencies.gems += rankGems
  return { ran: true, log, points: save.arena.points - before, gold, rankGems }
}

export function rerollArena(save: SaveData, now: number): ArenaAction {
  syncArenaDay(save, now)
  if (!arenaUnlocked(save)) return { ok: false, reason: 'Rathaus Stufe 3', messages: [] }
  if (save.arena.rerollsUsed >= arenaCfg.freeRerolls) return { ok: false, reason: 'Heute kein Neuwürfeln mehr.', messages: [] }
  save.arena.rerollsUsed += 1
  save.arena.rerollIndex += 1
  return { ok: true, messages: ['Neue Geister.'] }
}

export function claimArenaChest(save: SaveData, now: number): ArenaAction {
  syncArenaDay(save, now)
  if (!arenaUnlocked(save)) return { ok: false, reason: 'Rathaus Stufe 3', messages: [] }
  if (save.arena.attemptsUsed < arenaCfg.attemptsPerDay) return { ok: false, reason: 'Noch nicht alle Versuche genutzt.', messages: [] }
  if (save.arena.chestClaimed) return { ok: false, reason: 'Tagestruhe schon abgeholt.', messages: [] }
  save.arena.chestClaimed = true
  save.currencies.gems += arenaCfg.dailyChest.gems
  save.currencies.essence += arenaCfg.dailyChest.essence
  return {
    ok: true,
    messages: [`Tagestruhe: +${arenaCfg.dailyChest.gems} Juwelen, +${arenaCfg.dailyChest.essence} Essenz.`]
  }
}
