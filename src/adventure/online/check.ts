import { BASE_ENCOUNTER_MS, OFFLINE_CAP_MS, STARTERS } from '../const'
import { arenaDayKey, lastDailyReset } from '../arena'
import { DAILY_GOLD_CAP, DAILY_MARK_CAP } from '../daily'
import { expeditionGold } from '../expedition'
import { researchDurationMs, researchMsNeeded, researchSpend, type ResearchAudit } from '../research'

/** Server plausibility for one sync. Numbers follow the live fight and the loot tables. */

export const PLAUSIBILITY_BUFFER = 1.2
export const SPEED3_MS = 930
export const COIN_BONUS = 1.25
export const LEARN_BONUS = 1.25
export const TRAINER_PARTY = 3
export const TRAINER_GOLD_PER_LEVEL = 25
export const START_GOLD = 3000
/** One crest this fast is still slower than a real chapter. A new account cannot arrive with a handful. */
export const CREST_PACE_MS = 3 * 60 * 1000
/** Eight crests in each of the five regions, plus the five council seals. */
export const CREST_CAP = 45
export const OBTAINED_HOW = ['Truhe', 'Splitter', 'Ei', 'Rad', 'Tausch'] as const
export type ObtainedHow = (typeof OBTAINED_HOW)[number]

export const CREST_ORDER = [
  'Kieselwappen',
  'Wellenwappen',
  'Funkenwappen',
  'Moorwappen',
  'Felswappen',
  'Sturmwappen',
  'Frostwappen',
  'Klingenwappen'
] as const

export interface AuditMon {
  uid: string
  species: string
  level: number
  rarity: number
  schimmer: boolean
  obtainedAt: number
  obtainedHow: string
}

export interface AuditState {
  at: number
  gold: number
  ep: number
  region: number
  chapter: number
  badges: string[]
  chests: number
  shards: number
  /** Sum of Meisterschafts-EP. Older audits omit it and count as 0. */
  mastery?: number
  /** Sum of mastery ranks, 0 to 5 per species. Older audits omit it. */
  masteryRanks?: number
  /** Gold multiplier from the mastery tree. Older audits omit it and count as 1. */
  treeGold?: number
  /** Offline cap in ms from the mastery tree and the research tower. Older audits omit it and count as 8 h. */
  treeCapMs?: number
  /** Gold multiplier from the research tower. Older audits omit it and count as 1. */
  researchGold?: number
  /** EP multiplier from the research tower. Older audits omit it and count as 1. */
  researchEp?: number
  /** Expedition loot multiplier. Older audits omit it and count as 1. */
  researchLoot?: number
  /** Expected wild shards per drop. Older audits omit it and count as 1. */
  researchShard?: number
  /** Completed ranks and the one running job. Missing means nothing has been researched. */
  research?: ResearchAudit
  /** Lifetime marks paid by daily tasks. Older audits omit it and count as 0. */
  dailyMarks?: number
  /** Lifetime gold paid by daily tasks and the calendar. Older audits omit it and count as 0. */
  dailyGold?: number
  /** Berlin day (04:00) the counters below belong to. Set by the server, not the client. */
  dailyDay?: string
  /** Marks from this source already accepted on dailyDay. */
  dailyMarksToday?: number
  /** Gold from this source already accepted on dailyDay. */
  dailyGoldToday?: number
  /** Gold the server has already granted as gifts and co-op rewards. */
  bonusGold?: number
  /** Berlin day whose expedition gold allowance is stored below. */
  expeditionDay?: string
  /** Expedition gold still allowed on that day. Missing means the full day. */
  expeditionGoldLeft?: number
  mons: AuditMon[]
  /** Species the opened regions can actually award. */
  speciesAllowed: string[]
}

export interface AuditResult {
  flag: 0 | 1 | 2
  reasons: string[]
}

export function reachLevel(region: number, chapter: number): number {
  const index = Math.max(1, (Math.max(1, Math.floor(region) || 1) - 1) * 8 + Math.max(1, Math.floor(chapter) || 1))
  return 6 * index
}

function encounters(elapsedMs: number): number {
  return Math.max(1, Math.ceil(Math.max(0, elapsedMs) / SPEED3_MS))
}

/** Highest gold the clock allows: speed ×3, coin fruit, a full trainer party, then the 1.2 buffer. */
export function allowedGold(elapsedMs: number, region: number, chapter: number, goldMult = 1): number {
  const level = reachLevel(region, chapter)
  const per = TRAINER_GOLD_PER_LEVEL * TRAINER_PARTY * level * COIN_BONUS
  const crest = (1000 + 750 * level) * COIN_BONUS
  const mult = Math.max(1, Math.min(1.1 * 1.3, goldMult))
  return Math.ceil((encounters(elapsedMs) * per + crest) * PLAUSIBILITY_BUFFER * mult)
}

/** Highest EP: speed ×3, learn fruit, buddy, full bench, four hort guests, rarity 9, then the 1.2 buffer. */
export function allowedEp(elapsedMs: number, region: number, chapter: number, epMult = 1): number {
  const level = reachLevel(region, chapter)
  const base = 8 * level * (1 + 0.15 * 9)
  const team = 1 * 1.3 * LEARN_BONUS + 5 * 0.5 * LEARN_BONUS
  const hort = 4 * 0.3 * LEARN_BONUS
  const mult = Math.max(1, Math.min(1.3, epMult))
  return Math.ceil(encounters(elapsedMs) * base * (team + hort) * PLAUSIBILITY_BUFFER * mult)
}

function countedOffline(elapsedMs: number, capMs = OFFLINE_CAP_MS): number {
  const cap = Math.min(12 * 60 * 60 * 1000, Math.max(OFFLINE_CAP_MS, capMs))
  return Math.min(Math.max(0, elapsedMs), cap)
}

/** Fights the offline catch-up can finish, capped at 8 h, or the faster online tempo. */
function fightCeiling(elapsedMs: number, capMs = OFFLINE_CAP_MS): number {
  const offline = Math.floor(countedOffline(elapsedMs, capMs) / BASE_ENCOUNTER_MS)
  const online = Math.ceil(Math.max(0, elapsedMs) / SPEED3_MS)
  return Math.max(offline, online, 1)
}

/**
 * One chest per fight covers finds and trainer drops, plus the road pile and the shop.
 * Storage stops at 99 of each of the four tiers.
 */
export function allowedChests(elapsedMs: number, capMs = OFFLINE_CAP_MS): number {
  const road = Math.floor(countedOffline(elapsedMs, capMs) / 60_000) + 5
  const shop = Math.max(1, Math.ceil(Math.max(elapsedMs, 1) / 86_400_000)) * 10
  return Math.min(99 * 4 + 5, Math.ceil((fightCeiling(elapsedMs, capMs) + road + shop) * PLAUSIBILITY_BUFFER))
}

/** One shard per fight. Offline catch-up and speed ×3 both fit, then the 1.2 buffer. */
export function allowedShards(elapsedMs: number, capMs = OFFLINE_CAP_MS, yieldMult = 1): number {
  const mult = Math.max(1, Math.min(1.3, yieldMult))
  return Math.ceil(fightCeiling(elapsedMs, capMs) * PLAUSIBILITY_BUFFER * mult)
}

/** One point per won bout, a boss bonus every few bouts, and a duplicate a minute. */
export function allowedMastery(elapsedMs: number, capMs = OFFLINE_CAP_MS): number {
  const fights = fightCeiling(elapsedMs, capMs)
  const bosses = Math.ceil(fights / 6)
  const dupes = Math.ceil(countedOffline(elapsedMs, capMs) / 60_000)
  return Math.ceil((fights + bosses * 5 + dupes * 10) * PLAUSIBILITY_BUFFER)
}

/** New monsters have to fit in chests, shard crafts, eggs and the wheel. */
export function allowedNewMons(elapsedMs: number, capMs = OFFLINE_CAP_MS): number {
  return allowedChests(elapsedMs, capMs) + Math.floor(allowedShards(elapsedMs, capMs) / 5) + Math.ceil(Math.max(0, elapsedMs) / 3_600_000) + 6
}

export function crestsInOrder(badges: readonly string[]): boolean {
  const indexes = badges.map((badge) => CREST_ORDER.indexOf(badge as (typeof CREST_ORDER)[number])).filter((index) => index >= 0)
  const unique = [...new Set(indexes)].sort((a, b) => a - b)
  return unique.every((index, place) => index === place)
}

/** Crests and council seals. The pace check counts both, because either one opens a gate. */
export function badgeProgress(badges: readonly string[]): number {
  return new Set(badges.filter((badge) => badge.length > 0)).size
}

export function allowedCrests(elapsedMs: number): number {
  return Math.min(CREST_CAP, Math.floor(Math.max(0, elapsedMs) / CREST_PACE_MS))
}

const STARTER_SPECIES = new Set<string>(STARTERS.map((starter) => starter.id))

/** The starter and a migrated v1 row are not register monsters. Anything else with a private source is. */
export function privateMonster(mon: AuditMon): boolean {
  if (OBTAINED_HOW.includes(mon.obtainedHow as ObtainedHow)) return false
  if (mon.obtainedHow === 'alt') return true
  return STARTER_SPECIES.has(mon.species) && /^r\d+c\d+$/.test(mon.obtainedHow)
}

function bump(flag: 0 | 1 | 2, next: 0 | 1 | 2): 0 | 1 | 2 {
  return next > flag ? next : flag
}

function gainFlag(gain: number, allowed: number): 0 | 1 | 2 {
  if (!(gain > allowed)) return 0
  if (gain > allowed * 2) return 2
  return 1
}

/** While offline catch-up is still owed, the save must not be uploaded. */
export function mayUploadSave(catchingUp: boolean): boolean {
  return !catchingUp
}

export function saveOwesCatchUp(lastSeenAt: number, now: number, welcomeMs: number): boolean {
  return now - lastSeenAt >= welcomeMs
}

/**
 * Flag 2 and flag 1 stick. A flagged row keeps the last clean baseline,
 * so the next sync is still judged against that baseline.
 */
/** Gold, EP, chests, shards, crests, region or a new monster. A newer timestamp alone is not progress. */
export function auditHasProgress(before: AuditState, after: AuditState): boolean {
  if (after.gold > before.gold || after.ep > before.ep) return true
  if (after.chests > before.chests || after.shards > before.shards) return true
  if ((after.mastery ?? 0) > (before.mastery ?? 0)) return true
  if (after.region > before.region || after.chapter > before.chapter) return true
  if (after.badges.some((badge) => !before.badges.includes(badge))) return true
  const known = new Set(before.mons.map((mon) => mon.uid))
  return after.mons.some((mon) => !known.has(mon.uid))
}

export function stickAudit(previousFlag: 0 | 1 | 2, baseline: AuditState | null, next: AuditState, elapsedMs: number, bonusGold = 0): { flag: 0 | 1 | 2, audit: AuditState | null, advanceClock: boolean, reasons: string[] } {
  const verdict = auditSync(baseline, next, elapsedMs, bonusGold)
  const flag = Math.max(previousFlag, verdict.flag) as 0 | 1 | 2
  const progress = baseline ? auditHasProgress(baseline, next) : true
  const advanceClock = previousFlag < 1 && verdict.flag < 1 && progress
  return { flag, audit: advanceClock ? next : baseline, advanceClock, reasons: verdict.reasons }
}

export function expeditionGoldCap(region: number, chapter: number): number {
  return expeditionGold(reachLevel(region, chapter), 1 + 4 + 8, 'gold')
}

const RESEARCH_SKEW_MS = 15_000

function researchVerdict(before: AuditState, after: AuditState, elapsedMs: number, nowMs: number): 0 | 1 | 2 {
  const next = after.research
  if (!next) return 0
  if (next.ranks.length !== 6 || next.ranks.some((rank) => !Number.isInteger(rank) || rank < 0 || rank > 10)) return 2
  const prev = before.research ?? null
  const prevRanks = prev?.ranks ?? [0, 0, 0, 0, 0, 0]
  if (prev && (prev.ranks.length !== 6 || prev.ranks.some((rank) => !Number.isInteger(rank) || rank < 0 || rank > 10))) return 2
  for (let line = 0; line < 6; line++) if (next.ranks[line] < prevRanks[line]) return 2
  const job = next.job
  if (job) {
    if (!Number.isInteger(job.line) || job.line < 0 || job.line > 5) return 2
    if (!Number.isInteger(job.level) || job.level !== next.ranks[job.line] + 1 || job.level > 10) return 2
    if (!Number.isFinite(job.startedAt) || !Number.isFinite(job.readyAt)) return 2
    if (job.startedAt > nowMs + RESEARCH_SKEW_MS) return 2
    if (job.readyAt - job.startedAt !== researchDurationMs(job.level)) return 2
    if (job.readyAt <= nowMs - RESEARCH_SKEW_MS) return 2
  }
  const prepaid = prev?.job ?? null
  if (prepaid && prepaid.level > (next.ranks[prepaid.line] ?? 0)) {
    if (!job || job.line !== prepaid.line || job.level !== prepaid.level || job.startedAt !== prepaid.startedAt || job.readyAt !== prepaid.readyAt) return 2
  }
  const beforeAt = Number.isFinite(before.at) ? before.at : nowMs - elapsedMs
  const needed = researchMsNeeded(prev, next, beforeAt)
  if (needed > elapsedMs + RESEARCH_SKEW_MS) return 2
  return 0
}

/**
 * Compare a new save with the last accepted one.
 * A missing row is a fresh account (start gold, no crests). The caller passes the
 * account age as the window, the same way a later upload passes the time since the last audit.
 */
export function auditSync(before: AuditState | null, after: AuditState, elapsedMs?: number, bonusGold = 0, nowMs = Date.now()): AuditResult {
  const baseline = before ?? freshBaseline(nowMs - Math.max(0, elapsedMs ?? 0))
  const reasons: string[] = []
  let flag: 0 | 1 | 2 = 0
  const elapsed = elapsedMs ?? (after.at - baseline.at)
  if (elapsedMs == null && elapsed < 0) {
    reasons.push('clock')
    flag = 2
  }
  const region = Math.max(baseline.region, after.region)
  const chapter = Math.max(baseline.chapter, after.chapter)
  const goldGain = after.gold - baseline.gold
  const windowMs = Math.max(0, elapsed)
  const goldMult = Math.max(1, baseline.treeGold ?? 1, after.treeGold ?? 1) * Math.max(1, baseline.researchGold ?? 1, after.researchGold ?? 1)
  const serverDay = arenaDayKey(new Date(nowMs))
  const sameDaily = baseline.dailyDay === serverDay
  const marksGain = (after.dailyMarks ?? 0) - (baseline.dailyMarks ?? 0)
  const dailyGoldGain = (after.dailyGold ?? 0) - (baseline.dailyGold ?? 0)
  const marksAlready = sameDaily ? (baseline.dailyMarksToday ?? 0) : 0
  const goldAlready = sameDaily ? (baseline.dailyGoldToday ?? 0) : 0
  const dailyGoldRoom = dailyGoldGain > 0 ? Math.max(0, Math.min(dailyGoldGain, DAILY_GOLD_CAP - goldAlready)) : 0
  const capMs = Math.max(OFFLINE_CAP_MS, baseline.treeCapMs ?? 0, after.treeCapMs ?? 0)
  const fightRoom = allowedGold(windowMs, region, chapter, goldMult) + Math.max(0, Math.floor(bonusGold))
  const day = lastDailyReset(new Date(nowMs)).toISOString()
  const lootMult = Math.max(1, baseline.researchLoot ?? 1, after.researchLoot ?? 1)
  const dayCap = Math.ceil(expeditionGoldCap(region, chapter) * Math.max(1, Math.min(1.4, lootMult)))
  const expeditionRoom = baseline.expeditionDay === day && typeof baseline.expeditionGoldLeft === 'number'
    ? Math.max(0, Math.min(dayCap, baseline.expeditionGoldLeft))
    : dayCap
  const spent = researchSpend(baseline.research ?? null, after.research ?? null)
  const goldFlag = gainFlag(goldGain + spent, fightRoom + expeditionRoom + dailyGoldRoom)
  if (goldFlag) reasons.push('gold')
  flag = bump(flag, goldFlag)
  const epGain = after.ep - baseline.ep
  const epMult = Math.max(1, baseline.researchEp ?? 1, after.researchEp ?? 1)
  const epFlag = gainFlag(epGain, allowedEp(windowMs, region, chapter, epMult))
  if (epFlag) reasons.push('ep')
  flag = bump(flag, epFlag)
  const crestGain = badgeProgress(after.badges) - badgeProgress(baseline.badges)
  if (!crestsInOrder(after.badges) || crestGain > allowedCrests(windowMs)) {
    reasons.push('crests')
    flag = 2
  }
  const known = new Set(baseline.mons.map((mon) => mon.uid))
  const fresh = after.mons.filter((mon) => !known.has(mon.uid))
  const registered = fresh.filter((mon) => !privateMonster(mon))
  const allowed = new Set(after.speciesAllowed)
  if (registered.length > allowedNewMons(windowMs, capMs)) {
    reasons.push('monsters')
    flag = 2
  }
  const starters = fresh.filter((mon) => STARTER_SPECIES.has(mon.species) && /^r\d+c\d+$/.test(mon.obtainedHow))
  if (starters.length > 1) {
    reasons.push('source')
    flag = 2
  }
  for (const mon of registered) {
    if (!OBTAINED_HOW.includes(mon.obtainedHow as ObtainedHow)) {
      reasons.push('source')
      flag = 2
    }
    if (allowed.size && !allowed.has(mon.species)) {
      reasons.push('region')
      flag = 2
    }
  }
  const chestGain = after.chests - baseline.chests
  if (chestGain > allowedChests(windowMs, capMs)) {
    reasons.push('chests')
    flag = 2
  }
  const shardGain = after.shards - baseline.shards
  const shardYield = Math.max(1, baseline.researchShard ?? 1, after.researchShard ?? 1)
  if (shardGain > allowedShards(windowMs, capMs, shardYield)) {
    reasons.push('shards')
    flag = 2
  }
  const masteryGain = (after.mastery ?? 0) - (baseline.mastery ?? 0)
  const masteryFlag = gainFlag(masteryGain, allowedMastery(windowMs, capMs))
  if (masteryFlag) reasons.push('mastery')
  flag = bump(flag, masteryFlag)
  const researchFlag = researchVerdict(baseline, after, windowMs, nowMs)
  if (researchFlag) {
    reasons.push('research')
    flag = bump(flag, researchFlag)
  }
  if (marksGain < 0 || dailyGoldGain < 0 || marksAlready + Math.max(0, marksGain) > DAILY_MARK_CAP || goldAlready + Math.max(0, dailyGoldGain) > DAILY_GOLD_CAP) {
    reasons.push('daily')
    flag = 2
  } else {
    after.dailyDay = serverDay
    after.dailyMarksToday = marksAlready + Math.max(0, marksGain)
    after.dailyGoldToday = goldAlready + Math.max(0, dailyGoldGain)
  }
  if (flag === 0) {
    const extra = Math.max(0, goldGain - fightRoom)
    after.expeditionDay = day
    after.expeditionGoldLeft = Math.max(0, expeditionRoom - extra)
  }
  return { flag, reasons }
}

function freshBaseline(at: number): AuditState {
  return {
    at,
    gold: START_GOLD,
    ep: 0,
    region: 1,
    chapter: 1,
    badges: [],
    chests: 0,
    shards: 0,
    mastery: 0,
    masteryRanks: 0,
    treeGold: 1,
    treeCapMs: OFFLINE_CAP_MS,
    mons: [],
    speciesAllowed: []
  }
}
