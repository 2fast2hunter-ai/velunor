import { species } from '../data'
import { mulberry32 } from '../rng'
import { fight1v1, type FightMods, type FightSide } from './battle'
import { masteryLevel } from './mastery'
import { monStats } from './stats'
import { activeSynergies, purityOf, scaleSide, synergyMods } from './synergy'
import { treeAtkBonus, treeCritAdd, treeGuardHp, treeLastBreath, treeStrongType } from './tree'
import type { SaveV2 } from './types'
import type { SkillDef, SpeciesPassive, TypeId } from '../types'

export const ELO_START = 1000
export const ELO_K = 32
export const ATTACKS_MAX = 5
export const ATTACK_REGEN_MS = 4 * 60 * 60 * 1000
export const DEFENSE_WIN = 2
export const DEFENSE_WIN_CAP = 20
export const DEFENSE_LOSS = 2
export const DEFENSE_LOSS_CAP = 10
export const SEASON_DAYS = 14
export const ARENA_LEVEL = 100
export const PRACTICE_LABEL = 'Übung'
export const PRACTICE_SPECIES = ['m01', 'm02', 'm03', 'm04', 'm05', 'm06'] as const

/** Rating floors. A new account starts at 1000, inside Kiesel. */
export const LEAGUES = [
  { id: 'kiesel', name: 'Kiesel', min: 0, marks: 20 },
  { id: 'bronze', name: 'Bronze', min: 1100, marks: 40 },
  { id: 'silber', name: 'Silber', min: 1300, marks: 60 },
  { id: 'gold', name: 'Gold', min: 1500, marks: 80 },
  { id: 'kristall', name: 'Kristall', min: 1700, marks: 100 },
  { id: 'meister', name: 'Velunor-Meister', min: 1900, marks: 150 }
] as const

export type LeagueId = (typeof LEAGUES)[number]['id']

export interface ArenaFighter {
  uid: string
  speciesId: string
  name: string
  type: TypeId
  skill: SkillDef
  passive: SpeciesPassive | null
  maxHp: number
  atk: number
  def: number
  spd: number
  shiny: boolean
}

/** null keeps the two strongest. An array is the player's choice and holds at most two ids. */
export interface ArenaTeam {
  fighters: ArenaFighter[]
  critAdd: number
  strongType: number
  breath: boolean
  synergy: readonly string[] | null
}

export interface ArenaBout {
  allySpecies: string
  foeSpecies: string
  allyName: string
  foeName: string
  allyMax: number
  foeMax: number
  allyHp: number
  foeHp: number
  win: boolean
}

export interface ArenaReplay {
  seed: number
  win: boolean
  allyKos: number
  foeKos: number
  bouts: ArenaBout[]
}

export interface AttackState {
  attacks: number
  attacksAt: number
  dayKey: string
}

export interface OpponentCard {
  practice: boolean
  seed: number
  id: string
  label: string
  rating: number
  species: string[]
}

const SEASON_ANCHOR = Date.parse('2026-11-16T03:00:00.000Z')

function berlinParts(date: Date): { year: number, month: number, day: number, hour: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit'
  })
  const bag: Record<string, string> = {}
  for (const part of fmt.formatToParts(date)) bag[part.type] = part.value
  return { year: Number(bag.year), month: Number(bag.month), day: Number(bag.day), hour: Number(bag.hour) }
}

function offsetMs(date: Date): number {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  const bag: Record<string, string> = {}
  for (const part of fmt.formatToParts(date)) bag[part.type] = part.value
  const asUtc = Date.UTC(Number(bag.year), Number(bag.month) - 1, Number(bag.day), Number(bag.hour), Number(bag.minute), Number(bag.second))
  return asUtc - date.getTime()
}

function berlinWall(year: number, month: number, day: number, hour: number): Date {
  const utc = new Date(Date.UTC(year, month - 1, day, hour, 0, 0))
  const first = new Date(utc.getTime() - offsetMs(utc))
  return new Date(utc.getTime() - offsetMs(first))
}

/** The most recent 04:00 Europe/Berlin. */
export function lastDailyReset(now: Date): Date {
  const local = berlinParts(now)
  const back = local.hour < 4 ? 1 : 0
  return berlinWall(local.year, local.month, local.day - back, 4)
}

export function arenaDayKey(now: Date): string {
  return lastDailyReset(now).toISOString()
}

export function seasonIndex(now: Date): number {
  const start = lastDailyReset(now).getTime()
  if (start < SEASON_ANCHOR) return 0
  return Math.floor((start - SEASON_ANCHOR) / (SEASON_DAYS * 24 * 60 * 60 * 1000))
}

export function softReset(rating: number): number {
  return Math.floor((Math.max(0, Math.floor(rating)) + ELO_START) / 2)
}

export function leagueOf(rating: number): (typeof LEAGUES)[number] {
  let found: (typeof LEAGUES)[number] = LEAGUES[0]
  for (const league of LEAGUES) {
    if (rating >= league.min) found = league
  }
  return found
}

export function expectedScore(own: number, other: number): number {
  return 1 / (1 + 10 ** ((other - own) / 400))
}

export function eloDelta(own: number, other: number, win: boolean): number {
  return Math.round(ELO_K * ((win ? 1 : 0) - expectedScore(own, other)))
}

export function defenseApply(today: number, win: boolean): { today: number, applied: number } {
  const raw = win ? DEFENSE_WIN : -DEFENSE_LOSS
  const applied = raw > 0
    ? Math.min(raw, Math.max(0, DEFENSE_WIN_CAP - today))
    : Math.max(raw, Math.min(0, -DEFENSE_LOSS_CAP - today))
  return { today: today + applied, applied }
}

export function chargeAttacks(state: AttackState, now: number): AttackState {
  const key = arenaDayKey(new Date(now))
  if (state.dayKey !== key) return { attacks: ATTACKS_MAX, attacksAt: now, dayKey: key }
  const gained = Math.floor(Math.max(0, now - state.attacksAt) / ATTACK_REGEN_MS)
  if (gained <= 0 || state.attacks >= ATTACKS_MAX) return { ...state, attacks: Math.min(ATTACKS_MAX, state.attacks) }
  return {
    attacks: Math.min(ATTACKS_MAX, state.attacks + gained),
    attacksAt: state.attacksAt + gained * ATTACK_REGEN_MS,
    dayKey: key
  }
}

export function spendAttack(state: AttackState, now: number): AttackState | null {
  const charged = chargeAttacks(state, now)
  if (charged.attacks <= 0) return null
  return {
    attacks: charged.attacks - 1,
    attacksAt: charged.attacks >= ATTACKS_MAX ? now : charged.attacksAt,
    dayKey: charged.dayKey
  }
}

/** Only the suggestion slot. Stats, seeds and ids in the body are ignored. */
export function readFightIndex(body: unknown): number | null {
  if (!body || typeof body !== 'object') return null
  const index = (body as { index?: unknown }).index
  if (index !== 0 && index !== 1 && index !== 2) return null
  return index
}

export function arenaUnlocked(crests: number, registered: number): boolean {
  return crests >= 5 && registered >= 6
}

export function crestCount(badges: readonly string[]): number {
  return new Set(badges.filter((badge) => !badge.includes('Ratsiegel'))).size
}

function blankFighter(speciesId: string, shiny: boolean, stars: number, masteryRank: number, uid: string): ArenaFighter {
  const sp = species(speciesId)
  const stats = monStats({
    species: speciesId,
    lvl: ARENA_LEVEL,
    exp: 0,
    hp: null,
    shiny,
    caughtAt: 0,
    caughtWhere: 'arena',
    keepDupes: false,
    stars
  }, ARENA_LEVEL, masteryRank)
  return {
    uid,
    speciesId,
    name: sp.name,
    type: sp.type,
    skill: sp.skill,
    passive: sp.passive ?? null,
    maxHp: stats.hp,
    atk: stats.atk,
    def: stats.def,
    spd: stats.spd,
    shiny
  }
}

export function fighterFromSpecies(speciesId: string, shiny = false, stars = 0, masteryRank = 0, uid = ''): ArenaFighter {
  return blankFighter(speciesId, shiny, stars, masteryRank, uid)
}

export function bakeTeam(fighters: ArenaFighter[], save: SaveV2 | null): ArenaTeam {
  const hp = 1 + (save ? treeGuardHp(save) : 0)
  const atk = 1 + (save ? treeAtkBonus(save) : 0)
  return {
    fighters: fighters.map((fighter) => ({
      ...fighter,
      maxHp: Math.max(1, Math.round(fighter.maxHp * hp)),
      atk: Math.max(1, Math.round(fighter.atk * atk))
    })),
    critAdd: save ? treeCritAdd(save) : 0,
    strongType: save ? treeStrongType(save) : 1.5,
    breath: save ? treeLastBreath(save) : false,
    synergy: save?.synergy == null ? null : save.synergy.slice(0, 2)
  }
}

export function teamFromRegister(rows: readonly { uid: string, species: string, schimmer: boolean }[], save: SaveV2): ArenaTeam | null {
  if (rows.length !== 6) return null
  const fighters = rows.map((row) => blankFighter(
    row.species,
    row.schimmer,
    save.stars?.[row.species] ?? 0,
    masteryLevel(save.mastery?.[row.species] ?? 0),
    row.uid
  ))
  return bakeTeam(fighters, save)
}

export function practiceTeam(seed: number): ArenaTeam {
  const rng = mulberry32(seed || 1)
  const ids = [...PRACTICE_SPECIES]
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const swap = ids[i]
    ids[i] = ids[j]
    ids[j] = swap
  }
  return bakeTeam(ids.map((id, index) => fighterFromSpecies(id, false, 0, 0, `practice-${index}`)), null)
}

function toSide(fighter: ArenaFighter, fraction: number): FightSide {
  const hp = Math.max(1, Math.round(fighter.maxHp * Math.max(0.01, Math.min(1, fraction))))
  return {
    speciesId: fighter.speciesId,
    name: fighter.name,
    type: fighter.type,
    maxHp: fighter.maxHp,
    hp,
    atk: fighter.atk,
    def: fighter.def,
    spd: fighter.spd,
    skill: fighter.skill,
    passive: fighter.passive,
    level: ARENA_LEVEL
  }
}

/** Six against six, one pair at a time, until one side has six knockouts. */
export function arenaMatch(attack: ArenaTeam, defense: ArenaTeam, seed: number): ArenaReplay {
  const rng = mulberry32(seed >>> 0 || 1)
  const allyBreath = { left: attack.breath ? 1 : 0 }
  const foeBreath = { left: defense.breath ? 1 : 0 }
  const allyTypes = attack.fighters.map((fighter) => fighter.type)
  const foeTypes = defense.fighters.map((fighter) => fighter.type)
  const allyMods = synergyMods(activeSynergies(allyTypes, attack.synergy), false)
  const foeMods = synergyMods(activeSynergies(foeTypes, defense.synergy), false)
  const mods: FightMods = {
    critAdd: attack.critAdd + allyMods.critAdd,
    foeCritAdd: defense.critAdd + foeMods.critAdd,
    strongType: attack.strongType,
    foeStrongType: defense.strongType,
    breath: allyBreath,
    foeBreath,
    dodge: allyMods.dodge,
    foeDodge: foeMods.dodge,
    statusDur: allyMods.statusDur,
    foeStatusDur: foeMods.statusDur,
    cooldown: allyMods.cooldown,
    foeCooldown: foeMods.cooldown,
    allySpd: foeMods.foeSpd,
    foeSpd: allyMods.foeSpd
  }
  let ai = 0
  let di = 0
  let allyFrac = 1
  let foeFrac = 1
  let allyKos = 0
  let foeKos = 0
  const bouts: ArenaBout[] = []
  while (ai < attack.fighters.length && di < defense.fighters.length && allyKos < 6 && foeKos < 6 && bouts.length < 12) {
    const ally = attack.fighters[ai]
    const foe = defense.fighters[di]
    const allySide = scaleSide(toSide(ally, allyFrac), allyMods, purityOf(allyTypes, ally.type))
    const foeSide = scaleSide(toSide(foe, foeFrac), foeMods, purityOf(foeTypes, foe.type))
    const trace = fight1v1(allySide, foeSide, rng, false, null, mods)
    bouts.push({
      allySpecies: ally.speciesId,
      foeSpecies: foe.speciesId,
      allyName: ally.name,
      foeName: foe.name,
      allyMax: trace.allyMax,
      foeMax: trace.foeMax,
      allyHp: trace.allyHp,
      foeHp: trace.foeHp,
      win: trace.win
    })
    if (trace.win) {
      allyFrac = trace.allyMax > 0 ? trace.allyHp / trace.allyMax : 1
      foeFrac = 1
      di += 1
      foeKos += 1
    } else {
      foeFrac = trace.foeMax > 0 ? trace.foeHp / trace.foeMax : 1
      allyFrac = 1
      ai += 1
      allyKos += 1
    }
  }
  return { seed, win: di >= defense.fighters.length && ai < attack.fighters.length, allyKos, foeKos, bouts }
}

export function pickOpponents(selfId: string, selfRating: number, pool: readonly OpponentCard[], seed: number): OpponentCard[] {
  const others = pool.filter((card) => card.id !== selfId)
  const byDistance = (a: OpponentCard, b: OpponentCard) => Math.abs(a.rating - selfRating) - Math.abs(b.rating - selfRating) || a.id.localeCompare(b.id)
  const near = others.filter((card) => Math.abs(card.rating - selfRating) <= 100).slice().sort(byDistance)
  const far = others.filter((card) => Math.abs(card.rating - selfRating) > 100).slice().sort(byDistance)
  const chosen = [...near, ...far].slice(0, 3).map((card) => ({ ...card, practice: false, seed }))
  let extra = 0
  while (chosen.length < 3) {
    const practiceSeed = ((seed + (extra + 1) * 997) >>> 0) || 1
    chosen.push({
      practice: true,
      seed: practiceSeed,
      id: '',
      label: PRACTICE_LABEL,
      rating: selfRating,
      species: practiceTeam(practiceSeed).fighters.map((fighter) => fighter.speciesId)
    })
    extra += 1
  }
  return chosen
}

/** Maps an arena-fight error to a sentence. Unknown transport errors stay the offline note. */
export function arenaFightErrorKey(code: string): string {
  const known: Record<string, string> = {
    team: 'arena.err.team',
    opponent: 'arena.err.opponent',
    index: 'arena.err.index',
    flag: 'arena.err.flag',
    season: 'arena.err.season',
    limit: 'arena.attacks',
    auth: 'arena.offline'
  }
  return known[code] ?? 'arena.offline'
}
