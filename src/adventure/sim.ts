import { rarityInfo, species, typeMult, typeName } from '../data'
import { nextFloat } from '../rng'
import type { TypeId } from '../types'
import type { FightSide, FightTrace } from './battle'
import { fight1v1 } from './battle'
import {
  BASE_ENCOUNTER_MS,
  BENCH_EXP,
  BUDDY_BONUS,
  CATCH_BASE,
  CATCH_CAP,
  LOG_LIMIT,
  OFFLINE_CAP_MS,
  OFFLINE_EXP_FACTOR,
  RARITY_EXP,
  RETRY_WINS,
  SEAL_PITY_CAP,
  SEAL_PITY_STEP,
  TEAM_MAX
} from './const'
import {
  chapterById,
  councilOf,
  findChapter,
  foyerOf,
  gateBadge,
  regionById,
  findGold,
  pickWeighted,
  placeLabel,
  rollInt,
  routeOf,
  sightingShares,
  encounterTable,
  trainerCount,
  trainerName,
  type ChapterDef,
  type NodeKind
} from './route'
import { chapterCapNow, regionRoster } from './dex'
import { rollShiny, shinyChance, teamBlocksShiny } from './shiny'
import { syncAchievements } from './achievements'
import { advanceHort, HORT_EP_RATE } from './hort'
import { applyFruitWeights, catchMods, combatExpFactor, fruitActive, fruitDef, grantGold, rollFindFruit } from './shop'
import { bossScale, type BossScale } from './gauntlet'
import { battleRoster, fightsHere, ownsRegional, seatRegional } from './origin'
import { makeMon, takeId } from './save'
import { addExp, awakenCount, battleLevel, crossedAwaken, isAlive, monStats, realHp, speciesExp } from './stats'
import { t } from './i18n'
import type { SkillDef } from '../types'
import type { OwnedMon, SaveV2 } from './types'

export interface CatchResult {
  species: string
  name: string
  chance: number
  success: boolean
  place: 'team' | 'pc' | 'exp' | 'kept' | null
  shiny: boolean
  level: number
}

export interface EncounterOutcome {
  kind: NodeKind
  step: number
  lines: string[]
  traces: FightTrace[]
  win: boolean
  catch: CatchResult | null
  gold: number
  badge: string | null
  wiped: boolean
  hold: boolean
  scene: ChapterDef['scene']
  shiny: boolean
}

export interface OfflineSummary {
  encounters: number
  fights: number
  gold: number
  dupes: number
  catches: string[]
  levels: { uid: string; name: string; from: number; to: number }[]
  badges: string[]
}

export interface ResolveOpts {
  offline: boolean
  trace: boolean
  summary?: OfflineSummary
  levelLeft?: Map<string, number>
}

export function emptySummary(): OfflineSummary {
  return { encounters: 0, fights: 0, gold: 0, dupes: 0, catches: [], levels: [], badges: [] }
}

export function catchChance(rarity: number, foeLevel: number, fighterLevel: number, mult = 1, cap = CATCH_CAP, pityPp = 0): number {
  const base = CATCH_BASE[Math.max(0, Math.min(9, rarity))] ?? CATCH_BASE[0]
  const levelFactor = foeLevel <= fighterLevel ? 1 : 0.8
  const pity = Math.max(0, Math.min(SEAL_PITY_CAP, pityPp)) / 100
  return Math.min(cap, base * levelFactor * mult + pity)
}

/** Mean tries until the seal lands, including the +0.5 pp pity per miss. */
export function expectedCatchAttempts(rarity: number, foeLevel = 30, fighterLevel = 30): number {
  let survive = 1
  let expected = 0
  for (let fails = 0; fails < 400 && survive > 1e-9; fails++) {
    const chance = catchChance(rarity, foeLevel, fighterLevel, 1, CATCH_CAP, Math.min(SEAL_PITY_CAP, fails * SEAL_PITY_STEP))
    expected += (fails + 1) * survive * chance
    survive *= 1 - chance
  }
  return expected
}

export function hasBadge(save: SaveV2, badge: string): boolean {
  return save.badges.includes(badge)
}

export function chapterUnlocked(save: SaveV2, chapterId: number): boolean {
  const chapter = findChapter(save.region, chapterId)
  if (!chapter) return false
  if (chapter.special) {
    const council = councilOf(save.region)
    const sealed = council ? hasBadge(save, council.guardian.badge) : false
    return sealed || roadComplete(save, save.region)
  }
  if (chapter.council) return hasBadge(save, chapter.guardian.badge)
  if (chapterId <= 1) return true
  const previous = chapterById(save.region, chapterId - 1)
  return hasBadge(save, previous.guardian.badge)
}

export function strongestLevel(save: SaveV2): number {
  return save.team.reduce((max, uid) => Math.max(max, save.mons[uid]?.lvl ?? 0), 0)
}

/** Open on the first try, after one level on the strongest mon, or after 10 wins. */
export function guardReady(save: SaveV2): boolean {
  if (save.challengeNow) return true
  if ((save.guardMark ?? 0) <= 0) return true
  if ((save.guardWins ?? 0) >= RETRY_WINS) return true
  return strongestLevel(save) >= save.guardMark + 1
}

function clearGuard(save: SaveV2): void {
  save.guardMark = 0
  save.guardWins = 0
  save.loopsUntilRetry = 0
}

function noteGuardLoss(save: SaveV2): void {
  save.guardMark = strongestLevel(save)
  save.guardWins = 0
  save.loopsUntilRetry = 0
  save.challengeNow = false
  save.hold = false
}

function noteFarmWin(save: SaveV2): void {
  if ((save.guardMark ?? 0) > 0) save.guardWins = (save.guardWins ?? 0) + 1
}

function continuePast(save: SaveV2, chapter: ChapterDef): void {
  save.hold = false
  save.challengeNow = false
  clearGuard(save)
  if (!save.loop) {
    const next = findChapter(save.region, chapter.id + 1)
    if (next && !next.council && !next.special && chapterUnlocked(save, next.id)) {
      save.chapter = next.id
      save.step = 1
      save.lastHealStep = 1
      return
    }
  }
  save.step = 1
}

function roadComplete(save: SaveV2, regionId: number): boolean {
  const roster = regionRoster(regionId)
  return roster.length > 0 && roster.every((id) => (save.dex[id]?.caught ?? 0) > 0)
}

export function healTeam(save: SaveV2): void {
  for (const uid of save.team) {
    const mon = save.mons[uid]
    if (mon) mon.hp = null
  }
}

export function livingTeam(save: SaveV2): string[] {
  return save.team.filter((uid) => save.mons[uid] && isAlive(save.mons[uid]))
}

function line(save: SaveV2, key: string, vars?: Record<string, string | number>): string {
  return t(save.settings?.lang, key, vars)
}

function awakenSkill(skill: SkillDef, level: number): SkillDef {
  const bonus = 0.25 * awakenCount(level)
  if (!bonus) return skill
  return {
    ...skill,
    effects: skill.effects.map((effect) => ('atkMult' in effect ? { ...effect, atkMult: effect.atkMult + bonus } : effect))
  }
}

function rememberAwaken(save: SaveV2, uid: string, before: number, after: number): void {
  if (!save.pendingAwaken) save.pendingAwaken = []
  for (const level of crossedAwaken(before, after)) save.pendingAwaken.push({ uid, level })
}

function log(save: SaveV2, now: number, text: string, quiet: boolean): void {
  if (quiet) return
  save.log.push({ t: now, text })
  if (save.log.length > LOG_LIMIT) save.log.splice(0, save.log.length - LOG_LIMIT)
}

function rngOf(save: SaveV2): () => number {
  return () => {
    const state = { seed: save.rng >>> 0 }
    const value = nextFloat(state)
    save.rng = state.seed
    return value
  }
}

function noteLevel(summary: OfflineSummary | undefined, uid: string, mon: OwnedMon, before: number): void {
  if (!summary || mon.lvl === before) return
  const found = summary.levels.find((row) => row.uid === uid)
  if (found) found.to = mon.lvl
  else summary.levels.push({ uid, name: species(mon.species).name, from: before, to: mon.lvl })
}

function spendBudget(opts: ResolveOpts, uid: string, levels: number): void {
  if (!opts.offline || !opts.levelLeft || levels <= 0) return
  opts.levelLeft.set(uid, Math.max(0, (opts.levelLeft.get(uid) ?? 0) - levels))
}

export function awardCombatExp(
  save: SaveV2,
  cap: number,
  foeLevel: number,
  rarity: number,
  fighter: string,
  opts: ResolveOpts,
  now: number
): void {
  const base = 8 * foeLevel * (1 + RARITY_EXP * rarity)
  for (const uid of save.team) {
    const mon = save.mons[uid]
    if (!mon) continue
    let share = base * (uid === fighter ? 1 : BENCH_EXP)
    if (save.buddy === uid) share *= 1 + BUDDY_BONUS
    share *= combatExpFactor(save, now)
    if (opts.offline) share *= OFFLINE_EXP_FACTOR
    const before = mon.lvl
    const gained = addExp(mon, share, cap, null)
    spendBudget(opts, uid, gained.levels)
    noteLevel(opts.summary, uid, mon, before)
    rememberAwaken(save, uid, before, mon.lvl)
    if (!opts.offline && gained.levels > 0) log(save, now, line(save, 'say.level', { name: species(mon.species).name, level: mon.lvl }), false)
  }
  const hortShare = base * HORT_EP_RATE * combatExpFactor(save, now) * (opts.offline ? OFFLINE_EXP_FACTOR : 1)
  for (const uid of save.hort ?? []) {
    const mon = save.mons[uid]
    if (!mon) continue
    const before = mon.lvl
    const gained = addExp(mon, hortShare, cap, null)
    spendBudget(opts, uid, gained.levels)
    rememberAwaken(save, uid, before, mon.lvl)
    noteLevel(opts.summary, uid, mon, before)
  }
}

function storeHp(mon: OwnedMon, battleHp: number, battleMax: number): void {
  if (battleHp <= 0 || battleMax <= 0) {
    mon.hp = 0
    return
  }
  const fraction = battleHp / battleMax
  if (fraction >= 0.999) {
    mon.hp = null
    return
  }
  const real = monStats(mon).hp
  mon.hp = Math.max(1, Math.min(real, Math.round(fraction * real)))
}

function sideFrom(mon: OwnedMon, cap: number): FightSide {
  const sp = species(mon.species)
  const level = battleLevel(mon.lvl, cap)
  const stats = monStats({ ...mon, lvl: level })
  const real = realHp(mon)
  const fraction = real.max > 0 ? real.hp / real.max : 1
  const maxHp = stats.hp
  return {
    speciesId: sp.id,
    name: sp.name,
    type: sp.type,
    maxHp,
    hp: Math.max(1, Math.round(maxHp * fraction)),
    atk: stats.atk,
    def: stats.def,
    spd: stats.spd,
    skill: awakenSkill(sp.skill, level),
    passive: sp.passive ?? null,
    level
  }
}

function foeSide(speciesId: string, level: number, shiny = false, scale: BossScale = { hp: 1, atk: 1, def: 1 }, hpFraction = 1): FightSide {
  const sp = species(speciesId)
  const stats = monStats({ species: speciesId, lvl: level, exp: 0, hp: null, shiny, caughtAt: 0, caughtWhere: '', keepDupes: false })
  const maxHp = Math.max(1, Math.round(stats.hp * scale.hp))
  const fraction = Math.max(0, Math.min(1, hpFraction))
  return {
    speciesId: sp.id,
    name: sp.name,
    type: sp.type,
    maxHp,
    hp: Math.max(1, Math.round(maxHp * (fraction > 0 ? fraction : 1))),
    atk: Math.max(1, Math.round(stats.atk * scale.atk)),
    def: Math.max(1, Math.round(stats.def * scale.def)),
    spd: stats.spd,
    skill: sp.skill,
    passive: sp.passive ?? null,
    level
  }
}

export function pickFighter(save: SaveV2, foeType: TypeId): string | null {
  const living = battleRoster(save)
  if (!living.length) return null
  if (save.active && living.includes(save.active)) return save.active
  if (!save.settings.autoSwitch) return living[0]
  let best = living[0]
  let bestScore = -1
  let bestLevel = -1
  for (const uid of living) {
    const mon = save.mons[uid]
    const score = typeMult(species(mon.species).type, foeType)
    if (score > bestScore + 1e-9 || (Math.abs(score - bestScore) <= 1e-9 && mon.lvl > bestLevel)) {
      best = uid
      bestScore = score
      bestLevel = mon.lvl
    }
  }
  return best
}

function wipe(save: SaveV2, now: number, quiet: boolean): void {
  healTeam(save)
  const chapter = chapterById(save.region, save.chapter)
  save.hold = false
  if (chapter.council || chapter.foyer) {
    const foyer = foyerOf(save.region)
    if (foyer) save.chapter = foyer.id
    save.step = 1
    noteGuardLoss(save)
    log(save, now, line(save, 'say.wipeCouncil'), quiet)
    return
  }
  save.step = save.lastHealStep || 1
  log(save, now, line(save, 'say.wipeRoad'), quiet)
}

function finish(save: SaveV2, chapter: ChapterDef, outcome: EncounterOutcome): EncounterOutcome {
  outcome.hold = save.hold
  outcome.scene = chapter.scene
  syncAchievements(save)
  return outcome
}

function baseOutcome(kind: NodeKind, step: number, chapter: ChapterDef): EncounterOutcome {
  return {
    kind,
    step,
    lines: [],
    traces: [],
    win: true,
    catch: null,
    gold: 0,
    badge: null,
    wiped: false,
    hold: false,
    scene: chapter.scene,
    shiny: false
  }
}

function say(save: SaveV2, outcome: EncounterOutcome, now: number, text: string, quiet: boolean): void {
  outcome.lines.push(text)
  log(save, now, text, quiet)
}

function advance(save: SaveV2, chapter: ChapterDef): void {
  if (save.step < 20) {
    save.step += 1
    return
  }
  save.hold = false
  const badge = chapter.guardian.badge
  if (badge && hasBadge(save, badge) && !save.loop) {
    const next = findChapter(save.region, chapter.id + 1)
    if (next && !next.council && !next.special && chapterUnlocked(save, next.id)) {
      save.chapter = next.id
      save.step = 1
      save.lastHealStep = 1
      return
    }
  }
  save.step = 1
}

function ownedSpecies(save: SaveV2, speciesId: string): string[] {
  return Object.keys(save.mons).filter((uid) => save.mons[uid].species === speciesId)
}

function highestOf(save: SaveV2, speciesId: string): string | null {
  const ids = ownedSpecies(save, speciesId)
  if (!ids.length) return null
  ids.sort((a, b) => {
    const left = save.mons[a]
    const right = save.mons[b]
    if (right.lvl !== left.lvl) return right.lvl - left.lvl
    if (right.exp !== left.exp) return right.exp - left.exp
    const teamA = save.team.includes(a) ? 1 : 0
    const teamB = save.team.includes(b) ? 1 : 0
    return teamB - teamA
  })
  return ids[0]
}

export function applyCatch(save: SaveV2, speciesId: string, level: number, shiny: boolean, now: number, where: string, chapter: ChapterDef, opts: ResolveOpts): CatchResult {
  const name = species(speciesId).name
  const existing = ownedSpecies(save, speciesId)
  const keep = shiny || existing.some((uid) => save.mons[uid].keepDupes)
  if (!existing.length || keep) {
    const uid = takeId(save)
    const mon = makeMon(speciesId, level, now, where, shiny)
    save.mons[uid] = mon
    let place: 'team' | 'pc' = 'pc'
    if (!existing.length && save.team.length < TEAM_MAX) {
      save.team.push(uid)
      place = 'team'
    } else save.pc.push(uid)
    const dex = save.dex[speciesId] ?? { seen: 0, caught: 0 }
    dex.caught += 1
    save.dex[speciesId] = dex
    save.stats.catches += 1
    if (shiny) save.stats.shinies += 1
    if (existing.length) save.stats.dupes += 1
    if (opts.summary) {
      if (!existing.length) opts.summary.catches.push(speciesId)
      else opts.summary.dupes += 1
    }
    seatRegional(save, uid)
    if (!existing.length && save.team.includes(uid)) place = 'team'
    return { species: speciesId, name, chance: 0, success: true, place: existing.length ? 'kept' : place, shiny, level }
  }
  const target = highestOf(save, speciesId)
  if (target) {
    const mon = save.mons[target]
    const before = mon.lvl
    const gained = addExp(mon, speciesExp(before), chapter.cap, null)
    spendBudget(opts, target, gained.levels)
    rememberAwaken(save, target, before, mon.lvl)
    noteLevel(opts.summary, target, mon, before)
  }
  const dex = save.dex[speciesId] ?? { seen: 0, caught: 0 }
  dex.caught += 1
  save.dex[speciesId] = dex
  save.stats.dupes += 1
  if (opts.summary) opts.summary.dupes += 1
  return { species: speciesId, name, chance: 0, success: true, place: 'exp', shiny, level }
}

function fightOne(save: SaveV2, chapter: ChapterDef, speciesId: string, level: number, opts: ResolveOpts, now: number, shiny = false): { trace: FightTrace; fighter: string } | null {
  const foe = foeSide(speciesId, level, shiny)
  const fighter = pickFighter(save, foe.type)
  if (!fighter) return null
  save.active = fighter
  const allyMon = save.mons[fighter]
  const cap = chapterCapNow(save, chapter)
  const ally = sideFrom(allyMon, cap)
  const trace = fight1v1(ally, foe, rngOf(save), opts.trace)
  storeHp(allyMon, trace.allyHp, trace.allyMax)
  if (trace.win) {
    save.stats.wins += 1
    awardCombatExp(save, cap, level, species(speciesId).baseRarity, fighter, opts, now)
    if (opts.summary) opts.summary.fights += 1
    return { trace, fighter }
  }
  if (opts.summary) opts.summary.fights += 1
  return { trace, fighter }
}

function runBouts(
  save: SaveV2,
  chapter: ChapterDef,
  foes: { species: string; level: number; shiny?: boolean }[],
  opts: ResolveOpts,
  now: number,
  goldFor: (wins: number) => number
): { traces: FightTrace[]; wins: number; lastFighter: string | null; wiped: boolean; gold: number } {
  const traces: FightTrace[] = []
  let wins = 0
  let lastFighter: string | null = null
  for (const foe of foes) {
    const dex = save.dex[foe.species] ?? { seen: 0, caught: 0 }
    dex.seen += 1
    save.dex[foe.species] = dex
    if (!livingTeam(save).length) return { traces, wins, lastFighter, wiped: true, gold: 0 }
    const fought = fightOne(save, chapter, foe.species, foe.level, opts, now, foe.shiny ?? false)
    if (!fought) return { traces, wins, lastFighter, wiped: true, gold: 0 }
    traces.push(fought.trace)
    lastFighter = fought.fighter
    if (!fought.trace.win) {
      const wiped = !livingTeam(save).length
      return { traces, wins, lastFighter, wiped, gold: 0 }
    }
    wins += 1
    if (fought.trace.allyKo) {
      const wiped = !livingTeam(save).length
      if (wiped) return { traces, wins, lastFighter, wiped, gold: 0 }
    }
  }
  const gold = goldFor(wins)
  let paid = 0
  if (gold > 0 && wins === foes.length) {
    paid = grantGold(save, gold, now)
    if (opts.summary) opts.summary.gold += paid
  }
  return { traces, wins, lastFighter, wiped: false, gold: paid }
}

function doWild(save: SaveV2, chapter: ChapterDef, now: number, opts: ResolveOpts): EncounterOutcome {
  const quiet = opts.offline
  const outcome = baseOutcome('wild', save.step, chapter)
  const rng = rngOf(save)
  const table = applyFruitWeights(encounterTable(chapter, now), save, now)
  const speciesId = pickWeighted(rng, table)
  const level = rollInt(rng, chapter.levelMin, chapter.levelMax)
  const glanz = fruitActive(save, 'glanz', now)
  const shiny = rollShiny(rng, shinyChance(save, save.region, 'adventure', glanz))
  outcome.shiny = shiny
  const name = species(speciesId).name
  say(save, outcome, now, line(save, shiny ? 'say.shiny' : 'say.wild', { name, level }), quiet)
  const bouts = runBouts(save, chapter, [{ species: speciesId, level, shiny }], opts, now, (wins) => (wins === 1 ? 4 * level : 0))
  outcome.traces = bouts.traces
  const trace = bouts.traces[0]
  if (bouts.wiped) {
    outcome.win = false
    outcome.wiped = true
    say(save, outcome, now, line(save, 'say.loss'), quiet)
    wipe(save, now, quiet)
    return finish(save, chapter, outcome)
  }
  if (!trace?.win) {
    outcome.win = false
    say(save, outcome, now, line(save, 'say.flee'), quiet)
    advance(save, chapter)
    return finish(save, chapter, outcome)
  }
  outcome.gold = bouts.gold
  noteFarmWin(save)
  say(save, outcome, now, line(save, 'say.winGold', { gold: outcome.gold }), quiet)
  if (trace.foeKo && bouts.lastFighter) {
    const fighter = save.mons[bouts.lastFighter]
    const rarity = species(speciesId).baseRarity
    const mods = catchMods(save, now)
    const pity = save.sealPity?.[speciesId] ?? 0
    const chance = catchChance(rarity, level, fighter.lvl, mods.mult, mods.cap, pity)
    const roll = rngOf(save)()
    const success = roll < chance
    const percent = Math.round(chance * 100)
    say(save, outcome, now, line(save, 'say.seal', { pct: percent }), quiet)
    if (success) {
      const caught = applyCatch(save, speciesId, level, shiny, now, `r${save.region}c${chapter.id}`, chapter, opts)
      caught.chance = chance
      outcome.catch = caught
      if (caught.place === 'exp') say(save, outcome, now, line(save, 'say.dupeExp', { name: caught.name }), quiet)
      else if (caught.place === 'kept') say(save, outcome, now, line(save, 'say.dupeKeep', { name: caught.name }), quiet)
      else say(save, outcome, now, line(save, 'say.caught', { name: caught.name, place: line(save, caught.place === 'team' ? 'say.placeTeam' : 'say.placePc') }), quiet)
      save.sealPity[speciesId] = 0
    } else {
      outcome.catch = { species: speciesId, name, chance, success: false, place: null, shiny, level }
      save.sealPity[speciesId] = Math.min(SEAL_PITY_CAP, pity + SEAL_PITY_STEP)
      say(save, outcome, now, line(save, 'say.escaped'), quiet)
    }
  }
  advance(save, chapter)
  return finish(save, chapter, outcome)
}

function doTrainer(save: SaveV2, chapter: ChapterDef, now: number, opts: ResolveOpts): EncounterOutcome {
  const quiet = opts.offline
  const outcome = baseOutcome('trainer', save.step, chapter)
  const count = trainerCount(chapter.id, save.step)
  const name = trainerName(chapter.id, save.step)
  const rng = rngOf(save)
  const table = applyFruitWeights(encounterTable(chapter, now), save, now)
  const foes: { species: string; level: number }[] = []
  const used = new Set<string>()
  for (let i = 0; i < count; i++) {
    let speciesId = pickWeighted(rng, table)
    if (used.has(speciesId)) {
      const other = table.find((spawn) => !used.has(spawn.species))
      if (other) speciesId = other.species
    }
    used.add(speciesId)
    foes.push({ species: speciesId, level: chapter.levelMax })
  }
  say(save, outcome, now, line(save, 'say.trainer', { name, n: foes.length }), quiet)
  const bouts = runBouts(save, chapter, foes, opts, now, (wins) => (wins === foes.length ? 25 * foes.reduce((sum, foe) => sum + foe.level, 0) : 0))
  outcome.traces = bouts.traces
  if (bouts.wiped) {
    outcome.win = false
    outcome.wiped = true
    say(save, outcome, now, line(save, 'say.loss'), quiet)
    wipe(save, now, quiet)
    return finish(save, chapter, outcome)
  }
  if (bouts.wins < foes.length) {
    outcome.win = false
    say(save, outcome, now, line(save, 'say.trainerHold', { name }), quiet)
    advance(save, chapter)
    return finish(save, chapter, outcome)
  }
  outcome.gold = 25 * foes.reduce((sum, foe) => sum + foe.level, 0)
  noteFarmWin(save)
  say(save, outcome, now, line(save, 'say.trainerWin', { name, gold: outcome.gold }), quiet)
  advance(save, chapter)
  return finish(save, chapter, outcome)
}

function runGauntlet(
  save: SaveV2,
  chapter: ChapterDef,
  foes: { species: string; level: number; shiny?: boolean }[],
  scale: BossScale,
  opts: ResolveOpts,
  now: number
): { traces: FightTrace[]; wins: number; lastFighter: string | null; wiped: boolean } {
  const traces: FightTrace[] = []
  let index = 0
  let foeFraction = 1
  let wins = 0
  let lastFighter: string | null = null
  const seen = new Set<number>()
  let guard = 0
  while (index < foes.length && guard < 24) {
    guard += 1
    if (!livingTeam(save).length) return { traces, wins, lastFighter, wiped: true }
    const foe = foes[index]
    if (!seen.has(index)) {
      seen.add(index)
      const dex = save.dex[foe.species] ?? { seen: 0, caught: 0 }
      dex.seen += 1
      save.dex[foe.species] = dex
    }
    const fighter = pickFighter(save, species(foe.species).type)
    if (!fighter) return { traces, wins, lastFighter, wiped: true }
    save.active = fighter
    const allyMon = save.mons[fighter]
    const cap = chapterCapNow(save, chapter)
    const trace = fight1v1(sideFrom(allyMon, cap), foeSide(foe.species, foe.level, foe.shiny ?? false, scale, foeFraction), rngOf(save), opts.trace)
    traces.push(trace)
    lastFighter = fighter
    if (opts.summary) opts.summary.fights += 1
    if (trace.win) {
      storeHp(allyMon, trace.allyHp, trace.allyMax)
      save.stats.wins += 1
      awardCombatExp(save, cap, foe.level, species(foe.species).baseRarity, fighter, opts, now)
      index += 1
      foeFraction = 1
      wins += 1
    } else {
      storeHp(allyMon, 0, trace.allyMax)
      foeFraction = trace.foeMax > 0 ? Math.max(0.01, trace.foeHp / trace.foeMax) : 1
    }
  }
  return { traces, wins, lastFighter, wiped: wins < foes.length && !livingTeam(save).length }
}

function doGuardian(save: SaveV2, chapter: ChapterDef, now: number, opts: ResolveOpts, forced: boolean): EncounterOutcome {
  const quiet = opts.offline
  const outcome = baseOutcome('guardian', save.step, chapter)
  const badge = chapter.guardian.badge
  if (badge && hasBadge(save, badge) && !forced) {
    const before = save.chapter
    continuePast(save, chapter)
    const moved = findChapter(save.region, save.chapter)
    say(save, outcome, now, moved && save.chapter !== before ? line(save, 'say.open', { name: moved.name }) : line(save, 'say.loop'), quiet)
    return finish(save, chapter, outcome)
  }
  if (!forced && !guardReady(save)) {
    say(save, outcome, now, line(save, 'say.guardWait'), quiet)
    save.step = 1
    save.hold = false
    return finish(save, chapter, outcome)
  }
  save.challengeNow = false
  const guard = chapter.guardian
  if (!guard.team.length) {
    continuePast(save, chapter)
    return finish(save, chapter, outcome)
  }
  say(save, outcome, now, line(save, 'say.guard', { epithet: guard.epithet, name: guard.name, type: typeName(species(guard.team[0].species).type) }), quiet)
  const foes = guard.team.map((mon) => ({ species: mon.species, level: mon.level }))
  const bouts = runGauntlet(save, chapter, foes, bossScale(guard), opts, now)
  outcome.traces = bouts.traces
  if (bouts.wins < foes.length) {
    outcome.win = false
    outcome.wiped = bouts.wiped
    noteGuardLoss(save)
    say(save, outcome, now, bouts.wiped ? line(save, 'say.loss') : line(save, 'say.guardStay', { name: guard.name }), quiet)
    if (bouts.wiped) wipe(save, now, quiet)
    else {
      save.step = 1
      save.hold = false
    }
    return finish(save, chapter, outcome)
  }
  if (badge && !hasBadge(save, badge)) save.badges.push(badge)
  const paidGuard = grantGold(save, guard.gold, now)
  healTeam(save)
  clearGuard(save)
  outcome.win = true
  outcome.gold = paidGuard
  outcome.badge = badge || null
  if (opts.summary) {
    opts.summary.gold += paidGuard
    if (badge) opts.summary.badges.push(badge)
  }
  say(save, outcome, now, line(save, 'say.badge', { badge, gold: paidGuard }), quiet)
  const before = save.chapter
  continuePast(save, chapter)
  const moved = findChapter(save.region, save.chapter)
  if (moved && save.chapter !== before) say(save, outcome, now, line(save, 'say.open', { name: moved.name }), quiet)
  return finish(save, chapter, outcome)
}

function enterCouncil(save: SaveV2, chapter: ChapterDef, now: number, opts: ResolveOpts): EncounterOutcome {
  const quiet = opts.offline
  const outcome = baseOutcome('guardian', save.step, chapter)
  const councilChapter = councilOf(save.region)
  const council = councilChapter?.council
  if (!councilChapter || !council) return finish(save, chapter, outcome)
  if (hasBadge(save, councilChapter.guardian.badge)) {
    say(save, outcome, now, line(save, 'say.councilWait'), quiet)
    save.step = 1
    save.hold = false
    return finish(save, chapter, outcome)
  }
  if (!guardReady(save)) {
    say(save, outcome, now, line(save, 'say.guardWait'), quiet)
    save.step = 1
    save.hold = false
    return finish(save, chapter, outcome)
  }
  const next = council.members.findIndex((member) => !save.councilBeaten.includes(member.id))
  save.chapter = councilChapter.id
  save.step = (next >= 0 ? next : 0) + 1
  save.hold = false
  save.challengeNow = false
  return doCouncil(save, councilChapter, now, opts)
}

/** Gold for one council member. Repeat wins pay half until that region's seal exists. */
export function councilPurse(save: SaveV2, memberId: string, baseGold: number, seal: string): number {
  const repeat = save.councilBeaten.includes(memberId) && !hasBadge(save, seal)
  return repeat ? Math.floor(baseGold / 2) : baseGold
}

export function recordCouncilWin(save: SaveV2, now: number, quiet: boolean): EncounterOutcome {
  const chapter = chapterById(save.region, save.chapter)
  const council = chapter.council
  if (!council) throw new Error('Kein Hoher Rat')
  const outcome = baseOutcome('guardian', save.step, chapter)
  const index = Math.min(council.members.length - 1, Math.max(0, save.step - 1))
  const member = council.members[index]
  const pay = councilPurse(save, member.id, member.gold, chapter.guardian.badge)
  if (!save.councilBeaten.includes(member.id)) save.councilBeaten.push(member.id)
  const paid = grantGold(save, pay, now)
  outcome.gold = paid
  say(save, outcome, now, line(save, 'say.councilWin', { epithet: member.epithet, name: member.name, gold: paid }), quiet)
  healTeam(save)
  clearGuard(save)
  outcome.win = true
  save.hold = false
  if (index < council.members.length - 1) {
    save.step = index + 2
    say(save, outcome, now, line(save, 'say.councilNext', { epithet: council.members[index + 1].epithet, name: council.members[index + 1].name }), quiet)
    return finish(save, chapter, outcome)
  }
  const firstSeal = !hasBadge(save, chapter.guardian.badge)
  if (firstSeal) {
    const bonus = grantGold(save, council.rewardGold, now)
    outcome.gold += bonus
    save.badges.push(chapter.guardian.badge)
    outcome.badge = chapter.guardian.badge
    if (council.unlocksRegion > 0 && !save.regionsOpen.includes(council.unlocksRegion)) save.regionsOpen.push(council.unlocksRegion)
    const opened = council.unlocksRegion > 0 ? ` ${regionById(council.unlocksRegion).name} ist offen.` : ''
    say(save, outcome, now, line(save, 'say.sealWin', { badge: chapter.guardian.badge, gold: bonus, opened }), quiet)
  }
  save.step = 1
  return finish(save, chapter, outcome)
}

function doCouncil(save: SaveV2, chapter: ChapterDef, now: number, opts: ResolveOpts): EncounterOutcome {
  const quiet = opts.offline
  const council = chapter.council
  if (!council) return doGuardian(save, chapter, now, opts, false)
  const outcome = baseOutcome('guardian', save.step, chapter)
  if (hasBadge(save, chapter.guardian.badge)) {
    const foyer = foyerOf(save.region)
    say(save, outcome, now, line(save, 'say.councilWait'), quiet)
    if (foyer) save.chapter = foyer.id
    save.step = 1
    save.hold = false
    return finish(save, chapter, outcome)
  }
  const index = council.members.findIndex((member) => !save.councilBeaten.includes(member.id))
  if (index < 0) {
    save.step = 1
    save.hold = false
    return finish(save, chapter, outcome)
  }
  const member = council.members[index]
  save.step = index + 1
  say(save, outcome, now, line(save, 'say.councilEnter', { epithet: member.epithet, name: member.name, cap: chapter.cap }), quiet)
  const foes = member.team.map((mon) => ({ species: mon.species, level: mon.level }))
  const bouts = runGauntlet(save, chapter, foes, bossScale(member), opts, now)
  outcome.traces = bouts.traces
  if (bouts.wins < foes.length) {
    outcome.win = false
    outcome.wiped = bouts.wiped
    if (bouts.wiped) wipe(save, now, quiet)
    else {
      noteGuardLoss(save)
      const foyer = foyerOf(save.region)
      if (foyer) save.chapter = foyer.id
      save.step = 1
      save.hold = false
      say(save, outcome, now, line(save, 'say.councilLoss'), quiet)
    }
    return finish(save, chapter, outcome)
  }
  const won = recordCouncilWin(save, now, quiet)
  won.traces = bouts.traces
  if (opts.summary) {
    opts.summary.gold += won.gold
    if (won.badge) opts.summary.badges.push(won.badge)
  }
  if (hasBadge(save, chapter.guardian.badge)) {
    const foyer = foyerOf(save.region)
    if (foyer) {
      save.chapter = foyer.id
      save.step = 1
      save.hold = false
    }
  }
  return won
}

export function resolveEncounter(save: SaveV2, now: number, opts: ResolveOpts): EncounterOutcome {
  if (opts.summary) opts.summary.encounters += 1
  const chapter = chapterById(save.region, save.chapter)
  const quiet = opts.offline
  advanceHort(save, now, rngOf(save))
  if (!battleRoster(save).length && Object.keys(save.mons).length) {
    const outcome = baseOutcome('spring', save.step, chapter)
    outcome.wiped = true
    wipe(save, now, quiet)
    return finish(save, chapter, outcome)
  }
  if (save.challengeNow) {
    const badge = gateBadge(save.region, chapter)
    if (!badge || !hasBadge(save, badge)) {
      save.challengeNow = false
      clearGuard(save)
      if (chapter.foyer || chapter.council) return enterCouncil(save, chapter.foyer ? chapter : (foyerOf(save.region) ?? chapter), now, opts)
      return doGuardian(save, chapter, now, opts, true)
    }
    save.challengeNow = false
  }
  if (chapter.council) return doCouncil(save, chapter, now, opts)
  const kind = chapter.special ? 'wild' : (routeOf(chapter.id)[save.step] ?? 'wild')
  if (kind === 'spring') {
    const outcome = baseOutcome('spring', save.step, chapter)
    healTeam(save)
    save.lastHealStep = save.step
    say(save, outcome, now, line(save, 'say.spring'), quiet)
    advance(save, chapter)
    return finish(save, chapter, outcome)
  }
  if (kind === 'find') {
    const outcome = baseOutcome('find', save.step, chapter)
    const gold = grantGold(save, findGold(chapter.id), now)
    outcome.gold = gold
    if (opts.summary) opts.summary.gold += gold
    const found = rollFindFruit(rngOf(save))
    if (found) {
      save.bag.fruits[found] += 1
      const label = fruitDef(found).name
      say(save, outcome, now, line(save, 'say.findFruit', { gold, fruit: label }), quiet)
    } else say(save, outcome, now, line(save, 'say.find', { gold }), quiet)
    advance(save, chapter)
    return finish(save, chapter, outcome)
  }
  if (kind === 'trainer') return doTrainer(save, chapter, now, opts)
  if (kind === 'guardian' && chapter.foyer) return enterCouncil(save, chapter, now, opts)
  if (kind === 'guardian') return doGuardian(save, chapter, now, opts, false)
  return doWild(save, chapter, now, opts)
}

export function simulateOffline(save: SaveV2, rawMs: number, now: number): { summary: OfflineSummary; countedMs: number } {
  const countedMs = Math.min(Math.max(0, rawMs), OFFLINE_CAP_MS)
  const count = Math.floor(countedMs / BASE_ENCOUNTER_MS)
  const summary = emptySummary()
  const levelLeft = new Map<string, number>()
  const start = save.lastSeenAt || now - countedMs
  for (let i = 0; i < count; i++) {
    if (save.hold) break
    const at = start + (i + 1) * 2800
    resolveEncounter(save, at, { offline: true, trace: false, summary, levelLeft })
  }
  save.lastSeenAt = now
  return { summary, countedMs }
}

export function travelTo(save: SaveV2, regionId: number, chapterId: number): string | null {
  if (!save.regionsOpen.includes(regionId)) return line(save, 'err.region')
  const previous = save.region
  save.region = regionId
  if (!chapterUnlocked(save, chapterId)) {
    save.region = previous
    return line(save, 'err.chapter')
  }
  const chapter = findChapter(regionId, chapterId)
  if (!chapter) {
    save.region = previous
    return line(save, 'err.missing')
  }
  save.chapter = chapterId
  save.step = 1
  save.lastHealStep = 1
  save.hold = false
  save.challengeNow = false
  save.loopsUntilRetry = 0
  healTeam(save)
  const local = [...save.pc].filter((uid) => fightsHere(save, save.mons[uid])).sort((a, b) => save.mons[b].lvl - save.mons[a].lvl)
  if (local[0]) seatRegional(save, local[0])
  return null
}

export function setBuddy(save: SaveV2, uid: string): string | null {
  if (!save.team.includes(uid)) return line(save, 'err.buddy')
  save.buddy = save.buddy === uid ? null : uid
  return null
}

export function setKeepDupes(save: SaveV2, uid: string, keep: boolean): void {
  const mon = save.mons[uid]
  if (!mon) return
  for (const other of Object.values(save.mons)) {
    if (other.species === mon.species) other.keepDupes = keep
  }
}

export function moveToPc(save: SaveV2, uid: string): string | null {
  if (!save.team.includes(uid)) return line(save, 'err.notTeam')
  if (save.team.length <= 1) return line(save, 'err.keepOne')
  save.team = save.team.filter((id) => id !== uid)
  save.pc.unshift(uid)
  if (save.buddy === uid) save.buddy = null
  if (save.active === uid) save.active = save.team[0] ?? null
  return null
}

export function moveToTeam(save: SaveV2, uid: string, swapWith: string | null): string | null {
  if (!save.pc.includes(uid)) return line(save, 'err.notPc')
  const mon = save.mons[uid]
  if (mon && teamBlocksShiny(save, mon.species, mon.shiny, swapWith)) return line(save, 'err.shiny')
  if (save.team.length < TEAM_MAX) {
    save.pc = save.pc.filter((id) => id !== uid)
    save.team.push(uid)
    return null
  }
  if (!swapWith || !save.team.includes(swapWith)) return line(save, 'err.full')
  const index = save.team.indexOf(swapWith)
  save.team[index] = uid
  save.pc = save.pc.filter((id) => id !== uid)
  save.pc.unshift(swapWith)
  if (save.buddy === swapWith) save.buddy = null
  if (save.active === swapWith) save.active = uid
  return null
}

export function reorderTeam(save: SaveV2, from: number, to: number): void {
  if (from === to || from < 0 || to < 0 || from >= save.team.length || to >= save.team.length) return
  const [uid] = save.team.splice(from, 1)
  save.team.splice(to, 0, uid)
}

export function sendOut(save: SaveV2, uid: string): string | null {
  if (!save.team.includes(uid)) return line(save, 'err.send')
  if (!isAlive(save.mons[uid])) return line(save, 'err.fainted')
  if (ownsRegional(save) && !fightsHere(save, save.mons[uid])) return line(save, 'err.local')
  save.active = uid
  return null
}

export function challengeGuardian(save: SaveV2): string | null {
  const chapter = chapterById(save.region, save.chapter)
  const badge = gateBadge(save.region, chapter)
  if (badge && hasBadge(save, badge)) return line(save, 'err.badge')
  clearGuard(save)
  save.challengeNow = true
  save.hold = false
  return null
}

export function setLoop(save: SaveV2, loop: boolean): void {
  save.loop = loop
  if (loop) save.hold = false
}

export function dexCaughtCount(save: SaveV2): number {
  return Object.values(save.dex).filter((entry) => entry.caught > 0).length
}

export function hereSightings(save: SaveV2, now: number): { species: string; name: string; pct: number; caught: boolean; type: string; pity: number }[] {
  const chapter = chapterById(save.region, save.chapter)
  return sightingShares(applyFruitWeights(encounterTable(chapter, now), save, now)).map((row) => ({
    species: row.species,
    name: species(row.species).name,
    pct: row.pct,
    caught: (save.dex[row.species]?.caught ?? 0) > 0,
    type: typeName(species(row.species).type),
    pity: save.sealPity?.[row.species] ?? 0
  }))
}

export function rarityName(speciesId: string): string {
  return rarityInfo(species(speciesId).baseRarity).name
}

export { placeLabel }
