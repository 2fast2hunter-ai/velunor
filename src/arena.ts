import { arenaCfg, dayKey, maxLevelFor, monsters, teamSlotLimit } from './data'
import { hashSeed, mulberry32 } from './rng'
import { combatPower, instanceStats } from './stats'
import { ALL_SLOTS, type ArenaState, type BattleUnitInput, type MonsterInstance, type Rarity, type SaveData, type SlotId } from './types'

const RANK_LABEL: Record<string, string> = {
  bronze: 'Bronze',
  silver: 'Silber',
  gold: 'Gold',
  platinum: 'Platin'
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

export function freshArena(key: string): ArenaState {
  return {
    dayKey: key,
    attemptsUsed: 0,
    rerollsUsed: 0,
    rerollIndex: 0,
    points: 0,
    bestRank: 'bronze',
    chestClaimed: false,
    wins: 0,
    losses: 0
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

/** New dayKey only moves forward. Turning the clock back does not refill attempts. */
export function syncArenaDay(save: SaveData, now: number): void {
  const key = dayKey(now)
  if (!save.arena) save.arena = freshArena(key)
  if (key > save.arena.dayKey) {
    save.arena.dayKey = key
    save.arena.attemptsUsed = 0
    save.arena.rerollsUsed = 0
    save.arena.chestClaimed = false
  }
}

export function ensureArena(save: SaveData, now: number): void {
  if (save.version >= 3 && save.arena) return
  const key = dayKey(now)
  if (!save.arena) save.arena = freshArena(key)
  else {
    save.arena = {
      dayKey: save.arena.dayKey || key,
      attemptsUsed: save.arena.attemptsUsed || 0,
      rerollsUsed: save.arena.rerollsUsed || 0,
      rerollIndex: save.arena.rerollIndex || 0,
      points: Math.max(0, save.arena.points || 0),
      bestRank: save.arena.bestRank || 'bronze',
      chestClaimed: Boolean(save.arena.chestClaimed),
      wins: save.arena.wins || 0,
      losses: save.arena.losses || 0
    }
  }
  save.version = 3
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

export function arenaPlayerPower(save: SaveData): number {
  return roster(save).reduce((sum, monster) => {
    const extra = (monster.skills?.slot2 ? 1 : 0) + (monster.skills?.slot3 ? 1 : 0)
    return sum + combatPower(instanceStats(monster.speciesId, monster.rarity, monster.level, monster.potential), extra)
  }, 0)
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

export function listArenaOpponents(save: SaveData, now = Date.now()): GhostTeam[] {
  syncArenaDay(save, now)
  const team = roster(save)
  if (!team.length || !save.arena) return []
  const power = arenaPlayerPower(save)
  const avgLevel = Math.round(team.reduce((sum, monster) => sum + monster.level, 0) / team.length)
  const avgRarity = Math.round(team.reduce((sum, monster) => sum + monster.rarity, 0) / team.length)
  const pool = unlockedSpecies(save)
  return arenaCfg.tiers.map((tier, index) => {
    const seed = hashSeed(`${save.arena.dayKey}:${save.arena.rerollIndex}:${index}:${tier.id}`)
    const rng = mulberry32(seed)
    const name = arenaCfg.ghostNames[Math.floor(rng() * arenaCfg.ghostNames.length)] ?? arenaCfg.ghostNames[0]
    const rolled: GhostMember[] = ALL_SLOTS.map(() => {
      const speciesId = pool[Math.floor(rng() * pool.length)]
      const rarity = clamp(avgRarity + rollInt(rng, -1, 1), 0, 9) as Rarity
      const level = clamp(avgLevel + rollInt(rng, -2, 2), 1, maxLevelFor(rarity))
      return { speciesId, rarity, level }
    })
    const fitted = fitGhost(rolled, Math.max(1, power * tier.kkFactor))
    const slots = {} as Record<SlotId, GhostMember>
    ALL_SLOTS.forEach((slot, slotIndex) => {
      slots[slot] = fitted.members[slotIndex]
    })
    return { name, tier: tier.id, kk: fitted.kk, seed, statMult: fitted.statMult, team: slots }
  })
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
  const rankGems = awardNewRanks(save)
  save.currencies.gems += rankGems
  return { ok: true, messages: [], gold, pointsDelta, rankGems, points: save.arena.points }
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
