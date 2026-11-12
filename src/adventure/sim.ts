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
  OFFLINE_LEVEL_CAP,
  TEAM_MAX
} from './const'
import {
  chapterById,
  findChapter,
  findGold,
  pickWeighted,
  placeLabel,
  rollInt,
  routeOf,
  sightingShares,
  tableFor,
  trainerCount,
  trainerName,
  type ChapterDef,
  type NodeKind
} from './route'
import { chapterCapNow } from './dex'
import { makeMon, takeId } from './save'
import { addExp, battleLevel, isAlive, monStats, realHp, speciesExp } from './stats'
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

export function catchChance(rarity: number, foeLevel: number, fighterLevel: number): number {
  const base = CATCH_BASE[Math.max(0, Math.min(9, rarity))] ?? CATCH_BASE[0]
  const levelFactor = foeLevel <= fighterLevel ? 1 : 0.8
  return Math.min(CATCH_CAP, base * levelFactor)
}

export function hasBadge(save: SaveV2, badge: string): boolean {
  return save.badges.includes(badge)
}

export function chapterUnlocked(save: SaveV2, chapterId: number): boolean {
  if (chapterId <= 1) return true
  const previous = chapterById(save.region, chapterId - 1)
  return hasBadge(save, previous.guardian.badge)
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

function budget(opts: ResolveOpts, uid: string): number | null {
  if (!opts.offline) return null
  if (!opts.levelLeft) opts.levelLeft = new Map()
  if (!opts.levelLeft.has(uid)) opts.levelLeft.set(uid, OFFLINE_LEVEL_CAP)
  return opts.levelLeft.get(uid) ?? 0
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
  const base = 8 * foeLevel * (1 + 0.25 * rarity)
  for (const uid of save.team) {
    const mon = save.mons[uid]
    if (!mon) continue
    let share = base * (uid === fighter ? 1 : BENCH_EXP)
    if (save.buddy === uid) share *= 1 + BUDDY_BONUS
    if (opts.offline) share *= OFFLINE_EXP_FACTOR
    const before = mon.lvl
    const gained = addExp(mon, share, cap, budget(opts, uid))
    spendBudget(opts, uid, gained.levels)
    noteLevel(opts.summary, uid, mon, before)
    if (!opts.offline && gained.levels > 0) log(save, now, `${species(mon.species).name} erreicht Level ${mon.lvl}.`, false)
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
    skill: sp.skill,
    passive: sp.passive ?? null
  }
}

function foeSide(speciesId: string, level: number): FightSide {
  const sp = species(speciesId)
  const stats = monStats({ species: speciesId, lvl: level, exp: 0, hp: null, shiny: false, caughtAt: 0, caughtWhere: '', keepDupes: false })
  return {
    speciesId: sp.id,
    name: sp.name,
    type: sp.type,
    maxHp: stats.hp,
    hp: stats.hp,
    atk: stats.atk,
    def: stats.def,
    spd: stats.spd,
    skill: sp.skill,
    passive: sp.passive ?? null
  }
}

export function pickFighter(save: SaveV2, foeType: TypeId): string | null {
  const living = livingTeam(save)
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
  save.step = chapter.council ? 1 : (save.lastHealStep || 1)
  save.hold = false
  const text = chapter.council
    ? 'Das Team ist erschöpft. Der Hohe Rat beginnt wieder bei Rat 1. Nichts geht verloren.'
    : 'Das Team ist erschöpft und kehrt zur letzten Heilquelle zurück. Nichts geht verloren.'
  log(save, now, text, quiet)
}

function finish(save: SaveV2, chapter: ChapterDef, outcome: EncounterOutcome): EncounterOutcome {
  outcome.hold = save.hold
  outcome.scene = chapter.scene
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
    scene: chapter.scene
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
  if (hasBadge(save, chapter.guardian.badge) && !save.loop) {
    save.hold = true
    save.step = 20
    return
  }
  save.step = 1
  save.hold = false
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
    if (existing.length) save.stats.dupes += 1
    if (opts.summary) {
      if (!existing.length) opts.summary.catches.push(speciesId)
      else opts.summary.dupes += 1
    }
    return { species: speciesId, name, chance: 0, success: true, place: existing.length ? 'kept' : place, shiny, level }
  }
  const target = highestOf(save, speciesId)
  if (target) {
    const mon = save.mons[target]
    const before = mon.lvl
    const gained = addExp(mon, speciesExp(before), chapter.cap, budget(opts, target))
    spendBudget(opts, target, gained.levels)
    noteLevel(opts.summary, target, mon, before)
  }
  const dex = save.dex[speciesId] ?? { seen: 0, caught: 0 }
  dex.caught += 1
  save.dex[speciesId] = dex
  save.stats.dupes += 1
  if (opts.summary) opts.summary.dupes += 1
  return { species: speciesId, name, chance: 0, success: true, place: 'exp', shiny, level }
}

function fightOne(save: SaveV2, chapter: ChapterDef, speciesId: string, level: number, opts: ResolveOpts, now: number): { trace: FightTrace; fighter: string } | null {
  const foe = foeSide(speciesId, level)
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
  foes: { species: string; level: number }[],
  opts: ResolveOpts,
  now: number,
  goldFor: (wins: number) => number
): { traces: FightTrace[]; wins: number; lastFighter: string | null; wiped: boolean } {
  const traces: FightTrace[] = []
  let wins = 0
  let lastFighter: string | null = null
  for (const foe of foes) {
    const dex = save.dex[foe.species] ?? { seen: 0, caught: 0 }
    dex.seen += 1
    save.dex[foe.species] = dex
    if (!livingTeam(save).length) return { traces, wins, lastFighter, wiped: true }
    const fought = fightOne(save, chapter, foe.species, foe.level, opts, now)
    if (!fought) return { traces, wins, lastFighter, wiped: true }
    traces.push(fought.trace)
    lastFighter = fought.fighter
    if (!fought.trace.win) {
      const wiped = !livingTeam(save).length
      return { traces, wins, lastFighter, wiped }
    }
    wins += 1
    if (fought.trace.allyKo) {
      const wiped = !livingTeam(save).length
      if (wiped) return { traces, wins, lastFighter, wiped }
    }
  }
  const gold = goldFor(wins)
  if (gold > 0 && wins === foes.length) {
    save.gold += gold
    if (opts.summary) opts.summary.gold += gold
  }
  return { traces, wins, lastFighter, wiped: false }
}

function doWild(save: SaveV2, chapter: ChapterDef, now: number, opts: ResolveOpts): EncounterOutcome {
  const quiet = opts.offline
  const outcome = baseOutcome('wild', save.step, chapter)
  const rng = rngOf(save)
  const table = tableFor(chapter, now)
  const speciesId = pickWeighted(rng, table)
  const level = rollInt(rng, chapter.levelMin, chapter.levelMax)
  const name = species(speciesId).name
  say(save, outcome, now, `${name} (Lv ${level}) kreuzt den Weg.`, quiet)
  const bouts = runBouts(save, chapter, [{ species: speciesId, level }], opts, now, (wins) => (wins === 1 ? 4 * level : 0))
  outcome.traces = bouts.traces
  const trace = bouts.traces[0]
  if (bouts.wiped) {
    outcome.win = false
    outcome.wiped = true
    say(save, outcome, now, 'Niederlage.', quiet)
    wipe(save, now, quiet)
    return finish(save, chapter, outcome)
  }
  if (!trace?.win) {
    outcome.win = false
    say(save, outcome, now, 'Das wilde Monster entkommt.', quiet)
    advance(save, chapter)
    return finish(save, chapter, outcome)
  }
  outcome.gold = 4 * level
  say(save, outcome, now, `Sieg. +${outcome.gold} G.`, quiet)
  if (trace.foeKo && bouts.lastFighter) {
    const fighter = save.mons[bouts.lastFighter]
    const rarity = species(speciesId).baseRarity
    const chance = catchChance(rarity, level, fighter.lvl)
    const roll = rngOf(save)()
    const success = roll < chance
    const percent = Math.round(chance * 100)
    say(save, outcome, now, `Bannsiegel … (${percent} %)`, quiet)
    if (success) {
      const caught = applyCatch(save, speciesId, level, false, now, `r${save.region}c${chapter.id}`, chapter, opts)
      caught.chance = chance
      outcome.catch = caught
      if (caught.place === 'exp') say(save, outcome, now, `Duplikat wird zu Art-EP für ${caught.name}.`, quiet)
      else if (caught.place === 'kept') say(save, outcome, now, `${caught.name} bleibt als Duplikat im PC.`, quiet)
      else say(save, outcome, now, `gefangen! ${caught.name} ist ${caught.place === 'team' ? 'im Team' : 'im PC'}.`, quiet)
    } else {
      outcome.catch = { species: speciesId, name, chance, success: false, place: null, shiny: false, level }
      say(save, outcome, now, 'entkommen.', quiet)
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
  const table = tableFor(chapter, now)
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
  say(save, outcome, now, `${name} will kämpfen (${foes.length}).`, quiet)
  const bouts = runBouts(save, chapter, foes, opts, now, (wins) => (wins === foes.length ? 25 * foes.reduce((sum, foe) => sum + foe.level, 0) : 0))
  outcome.traces = bouts.traces
  if (bouts.wiped) {
    outcome.win = false
    outcome.wiped = true
    say(save, outcome, now, 'Niederlage.', quiet)
    wipe(save, now, quiet)
    return finish(save, chapter, outcome)
  }
  if (bouts.wins < foes.length) {
    outcome.win = false
    say(save, outcome, now, `${name} behält das Feld.`, quiet)
    advance(save, chapter)
    return finish(save, chapter, outcome)
  }
  outcome.gold = 25 * foes.reduce((sum, foe) => sum + foe.level, 0)
  say(save, outcome, now, `${name} ist besiegt. +${outcome.gold} G.`, quiet)
  advance(save, chapter)
  return finish(save, chapter, outcome)
}

function doGuardian(save: SaveV2, chapter: ChapterDef, now: number, opts: ResolveOpts, forced: boolean): EncounterOutcome {
  const quiet = opts.offline
  const outcome = baseOutcome('guardian', save.step, chapter)
  const badge = chapter.guardian.badge
  if (hasBadge(save, badge) && !forced) {
    say(save, outcome, now, save.loop ? 'Das Kapitel beginnt von vorn.' : 'Das Kapitel wartet.', quiet)
    advance(save, chapter)
    return finish(save, chapter, outcome)
  }
  if (!forced && save.loopsUntilRetry > 0) {
    save.loopsUntilRetry -= 1
    if (save.loopsUntilRetry > 0) {
      say(save, outcome, now, `Der Wächter wartet. Nächster Versuch in ${save.loopsUntilRetry} Runden.`, quiet)
      save.step = 1
      save.hold = false
      return finish(save, chapter, outcome)
    }
  }
  const guard = chapter.guardian
  say(save, outcome, now, `${guard.epithet} ${guard.name} stellt sich (${typeName(species(guard.team[0].species).type)}).`, quiet)
  const foes = guard.team.map((mon) => ({ species: mon.species, level: mon.level }))
  const bouts = runBouts(save, chapter, foes, opts, now, () => 0)
  outcome.traces = bouts.traces
  if (bouts.wiped || bouts.wins < foes.length) {
    outcome.win = false
    outcome.wiped = bouts.wiped
    save.loopsUntilRetry = 5
    say(save, outcome, now, bouts.wiped ? 'Niederlage.' : `${guard.name} bleibt stehen.`, quiet)
    if (bouts.wiped) wipe(save, now, quiet)
    else {
      save.step = 1
      save.hold = false
    }
    return finish(save, chapter, outcome)
  }
  save.badges.push(badge)
  save.gold += guard.gold
  save.loopsUntilRetry = 0
  healTeam(save)
  outcome.win = true
  outcome.gold = guard.gold
  outcome.badge = badge
  if (opts.summary) {
    opts.summary.gold += guard.gold
    opts.summary.badges.push(badge)
  }
  say(save, outcome, now, `${badge} errungen. +${guard.gold} G. Das Team ist geheilt.`, quiet)
  const next = findChapter(save.region, chapter.id + 1)
  if (next) say(save, outcome, now, `${next.name} ist offen.`, quiet)
  else say(save, outcome, now, 'Weitere Kapitel folgen später.', quiet)
  if (save.loop) {
    save.step = 1
    save.hold = false
  } else {
    save.step = 20
    save.hold = true
  }
  return finish(save, chapter, outcome)
}

/** Gold for one council member. Repeat wins pay half until the Ratsiegel exists. */
export function councilPurse(save: SaveV2, memberId: string, baseGold: number): number {
  const repeat = save.councilBeaten.includes(memberId) && !hasBadge(save, 'Ratsiegel')
  return repeat ? Math.floor(baseGold / 2) : baseGold
}

export function recordCouncilWin(save: SaveV2, now: number, quiet: boolean): EncounterOutcome {
  const chapter = chapterById(save.region, save.chapter)
  const council = chapter.council
  if (!council) throw new Error('Kein Hoher Rat')
  const outcome = baseOutcome('guardian', save.step, chapter)
  const index = Math.min(council.members.length - 1, Math.max(0, save.step - 1))
  const member = council.members[index]
  const pay = councilPurse(save, member.id, member.gold)
  if (!save.councilBeaten.includes(member.id)) save.councilBeaten.push(member.id)
  save.gold += pay
  outcome.gold = pay
  say(save, outcome, now, `${member.epithet} ${member.name} weicht. +${pay} G.`, quiet)
  if (index < council.members.length - 1) {
    save.step = index + 2
    say(save, outcome, now, `Als Nächstes: ${council.members[index + 1].epithet} ${council.members[index + 1].name}.`, quiet)
    return finish(save, chapter, outcome)
  }
  const firstSeal = !hasBadge(save, chapter.guardian.badge)
  if (firstSeal) {
    save.gold += council.rewardGold
    outcome.gold += council.rewardGold
    save.badges.push(chapter.guardian.badge)
    outcome.badge = chapter.guardian.badge
    if (!save.regionsOpen.includes(council.unlocksRegion)) save.regionsOpen.push(council.unlocksRegion)
    say(save, outcome, now, `Ratsiegel errungen. +${council.rewardGold} G. Region 2 ist sichtbar und folgt später.`, quiet)
  }
  healTeam(save)
  outcome.win = true
  if (save.loop) {
    save.step = 1
    save.hold = false
  } else {
    save.step = council.members.length
    save.hold = true
  }
  return finish(save, chapter, outcome)
}

function doCouncil(save: SaveV2, chapter: ChapterDef, now: number, opts: ResolveOpts): EncounterOutcome {
  const quiet = opts.offline
  const council = chapter.council
  if (!council) return doGuardian(save, chapter, now, opts, false)
  const outcome = baseOutcome('guardian', save.step, chapter)
  if (hasBadge(save, chapter.guardian.badge) && !save.loop && save.hold) {
    say(save, outcome, now, 'Der Hohe Rat wartet.', quiet)
    return finish(save, chapter, outcome)
  }
  const index = Math.min(council.members.length - 1, Math.max(0, save.step - 1))
  const member = council.members[index]
  say(save, outcome, now, `${member.epithet} ${member.name} tritt vor. Cap ${member.cap}.`, quiet)
  const foes = member.team.map((mon) => ({ species: mon.species, level: mon.level }))
  const bouts = runBouts(save, chapter, foes, opts, now, () => 0)
  outcome.traces = bouts.traces
  if (bouts.wiped || bouts.wins < foes.length) {
    outcome.win = false
    outcome.wiped = bouts.wiped
    save.loopsUntilRetry = 0
    if (bouts.wiped) wipe(save, now, quiet)
    else {
      save.step = 1
      save.hold = false
      say(save, outcome, now, 'Niederlage. Es geht zurück zu Rat 1.', quiet)
    }
    return finish(save, chapter, outcome)
  }
  const won = recordCouncilWin(save, now, quiet)
  won.traces = bouts.traces
  if (opts.summary) {
    opts.summary.gold += won.gold
    if (won.badge) opts.summary.badges.push(won.badge)
  }
  return won
}

export function resolveEncounter(save: SaveV2, now: number, opts: ResolveOpts): EncounterOutcome {
  if (opts.summary) opts.summary.encounters += 1
  const chapter = chapterById(save.region, save.chapter)
  const quiet = opts.offline
  if (!livingTeam(save).length && Object.keys(save.mons).length) {
    const outcome = baseOutcome('spring', save.step, chapter)
    outcome.wiped = true
    wipe(save, now, quiet)
    return finish(save, chapter, outcome)
  }
  if (chapter.council) return doCouncil(save, chapter, now, opts)
  if (save.challengeNow && !hasBadge(save, chapter.guardian.badge)) {
    save.challengeNow = false
    save.loopsUntilRetry = 0
    return doGuardian(save, chapter, now, opts, true)
  }
  const kind = routeOf(chapter.id)[save.step] ?? 'wild'
  if (kind === 'spring') {
    const outcome = baseOutcome('spring', save.step, chapter)
    healTeam(save)
    save.lastHealStep = save.step
    say(save, outcome, now, 'Die Heilquelle füllt das Team.', quiet)
    advance(save, chapter)
    return finish(save, chapter, outcome)
  }
  if (kind === 'find') {
    const outcome = baseOutcome('find', save.step, chapter)
    const gold = findGold(chapter.id)
    save.gold += gold
    outcome.gold = gold
    if (opts.summary) opts.summary.gold += gold
    say(save, outcome, now, `Fund am Weg. +${gold} G.`, quiet)
    advance(save, chapter)
    return finish(save, chapter, outcome)
  }
  if (kind === 'trainer') return doTrainer(save, chapter, now, opts)
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

export function travelTo(save: SaveV2, chapterId: number): string | null {
  if (!chapterUnlocked(save, chapterId)) return 'Dieses Kapitel ist noch zu.'
  const chapter = chapterById(save.region, chapterId)
  if (chapter.id !== chapterId) return 'Dieses Kapitel gibt es noch nicht.'
  save.chapter = chapterId
  save.step = 1
  save.lastHealStep = 1
  save.hold = false
  save.challengeNow = false
  save.loopsUntilRetry = 0
  healTeam(save)
  return null
}

export function setBuddy(save: SaveV2, uid: string): string | null {
  if (!save.team.includes(uid)) return 'Der Begleiter muss im Team stehen.'
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
  if (!save.team.includes(uid)) return 'Das Monster ist nicht im Team.'
  if (save.team.length <= 1) return 'Mindestens ein Monster bleibt im Team.'
  save.team = save.team.filter((id) => id !== uid)
  save.pc.unshift(uid)
  if (save.buddy === uid) save.buddy = null
  if (save.active === uid) save.active = save.team[0] ?? null
  return null
}

export function moveToTeam(save: SaveV2, uid: string, swapWith: string | null): string | null {
  if (!save.pc.includes(uid)) return 'Das Monster liegt nicht im PC.'
  if (save.team.length < TEAM_MAX) {
    save.pc = save.pc.filter((id) => id !== uid)
    save.team.push(uid)
    return null
  }
  if (!swapWith || !save.team.includes(swapWith)) return 'Das Team ist voll. Tausche gegen ein Teammitglied.'
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
  if (!save.team.includes(uid)) return 'Nur Teammitglieder können in den Kampf.'
  if (!isAlive(save.mons[uid])) return 'Dieses Monster braucht die Heilquelle.'
  save.active = uid
  return null
}

export function challengeGuardian(save: SaveV2): string | null {
  const chapter = chapterById(save.region, save.chapter)
  if (hasBadge(save, chapter.guardian.badge)) return 'Das Wappen ist schon da.'
  save.challengeNow = true
  save.loopsUntilRetry = 0
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

export function hereSightings(save: SaveV2, now: number): { species: string; name: string; pct: number; caught: boolean; type: string }[] {
  const chapter = chapterById(save.region, save.chapter)
  return sightingShares(tableFor(chapter, now)).map((row) => ({
    species: row.species,
    name: species(row.species).name,
    pct: row.pct,
    caught: (save.dex[row.species]?.caught ?? 0) > 0,
    type: typeName(species(row.species).type)
  }))
}

export function rarityName(speciesId: string): string {
  return rarityInfo(species(speciesId).baseRarity).name
}

export { placeLabel }
