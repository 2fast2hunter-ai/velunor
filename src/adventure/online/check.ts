import { BASE_ENCOUNTER_MS, OFFLINE_CAP_MS } from '../const'

/** Server plausibility for one sync. Numbers follow the live fight and the loot tables. */

export const PLAUSIBILITY_BUFFER = 1.2
export const SPEED3_MS = 930
export const COIN_BONUS = 1.25
export const LEARN_BONUS = 1.25
export const TRAINER_PARTY = 3
export const TRAINER_GOLD_PER_LEVEL = 25
export const START_GOLD = 3000
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
export function allowedGold(elapsedMs: number, region: number, chapter: number): number {
  const level = reachLevel(region, chapter)
  const per = TRAINER_GOLD_PER_LEVEL * TRAINER_PARTY * level * COIN_BONUS
  const crest = (1000 + 750 * level) * COIN_BONUS
  return Math.ceil((encounters(elapsedMs) * per + crest) * PLAUSIBILITY_BUFFER)
}

/** Highest EP: speed ×3, learn fruit, buddy, full bench, four hort guests, rarity 9, then the 1.2 buffer. */
export function allowedEp(elapsedMs: number, region: number, chapter: number): number {
  const level = reachLevel(region, chapter)
  const base = 8 * level * (1 + 0.15 * 9)
  const team = 1 * 1.3 * LEARN_BONUS + 5 * 0.5 * LEARN_BONUS
  const hort = 4 * 0.3 * LEARN_BONUS
  return Math.ceil(encounters(elapsedMs) * base * (team + hort) * PLAUSIBILITY_BUFFER)
}

function countedOffline(elapsedMs: number): number {
  return Math.min(Math.max(0, elapsedMs), OFFLINE_CAP_MS)
}

/** Fights the offline catch-up can finish, capped at 8 h, or the faster online tempo. */
function fightCeiling(elapsedMs: number): number {
  const offline = Math.floor(countedOffline(elapsedMs) / BASE_ENCOUNTER_MS)
  const online = Math.ceil(Math.max(0, elapsedMs) / SPEED3_MS)
  return Math.max(offline, online, 1)
}

/**
 * One chest per fight covers finds and trainer drops, plus the road pile and the shop.
 * Storage stops at 99 of each of the four tiers.
 */
export function allowedChests(elapsedMs: number): number {
  const road = Math.floor(countedOffline(elapsedMs) / 60_000) + 5
  const shop = Math.max(1, Math.ceil(Math.max(elapsedMs, 1) / 86_400_000)) * 10
  return Math.min(99 * 4 + 5, Math.ceil((fightCeiling(elapsedMs) + road + shop) * PLAUSIBILITY_BUFFER))
}

/** One shard per fight. Offline catch-up and speed ×3 both fit, then the 1.2 buffer. */
export function allowedShards(elapsedMs: number): number {
  return Math.ceil(fightCeiling(elapsedMs) * PLAUSIBILITY_BUFFER)
}

/** One point per won bout, a boss bonus every few bouts, and a duplicate a minute. */
export function allowedMastery(elapsedMs: number): number {
  const fights = fightCeiling(elapsedMs)
  const bosses = Math.ceil(fights / 6)
  const dupes = Math.ceil(countedOffline(elapsedMs) / 60_000)
  return Math.ceil((fights + bosses * 5 + dupes * 10) * PLAUSIBILITY_BUFFER)
}

/** New monsters have to fit in chests, shard crafts, eggs and the wheel. */
export function allowedNewMons(elapsedMs: number): number {
  return allowedChests(elapsedMs) + Math.floor(allowedShards(elapsedMs) / 5) + Math.ceil(Math.max(0, elapsedMs) / 3_600_000) + 6
}

export function crestsInOrder(badges: readonly string[]): boolean {
  const indexes = badges.map((badge) => CREST_ORDER.indexOf(badge as (typeof CREST_ORDER)[number])).filter((index) => index >= 0)
  const unique = [...new Set(indexes)].sort((a, b) => a - b)
  return unique.every((index, place) => index === place)
}

function bump(flag: 0 | 1 | 2, next: 0 | 1 | 2): 0 | 1 | 2 {
  return next > flag ? next : flag
}

function gainFlag(gain: number, allowed: number): 0 | 1 | 2 {
  if (!(gain > allowed)) return 0
  if (gain > allowed * 2) return 2
  return 1
}

/**
 * Compare a new save with the last accepted one.
 * The first upload (no previous row) is the baseline and stays at flag 0.
 */
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

export function stickAudit(previousFlag: 0 | 1 | 2, baseline: AuditState | null, next: AuditState, elapsedMs: number): { flag: 0 | 1 | 2, audit: AuditState | null, advanceClock: boolean, reasons: string[] } {
  const verdict = auditSync(baseline, next, elapsedMs)
  const flag = Math.max(previousFlag, verdict.flag) as 0 | 1 | 2
  const progress = baseline ? auditHasProgress(baseline, next) : true
  const advanceClock = previousFlag < 1 && verdict.flag < 1 && progress
  return { flag, audit: advanceClock ? next : baseline, advanceClock, reasons: verdict.reasons }
}

export function auditSync(before: AuditState | null, after: AuditState, elapsedMs?: number): AuditResult {
  if (!before) return { flag: 0, reasons: [] }
  const reasons: string[] = []
  let flag: 0 | 1 | 2 = 0
  const elapsed = elapsedMs ?? (after.at - before.at)
  if (elapsedMs == null && elapsed < 0) {
    reasons.push('clock')
    flag = 2
  }
  const region = Math.max(before.region, after.region)
  const chapter = Math.max(before.chapter, after.chapter)
  const goldGain = after.gold - before.gold
  const windowMs = Math.max(0, elapsed)
  const goldFlag = gainFlag(goldGain, allowedGold(windowMs, region, chapter))
  if (goldFlag) reasons.push('gold')
  flag = bump(flag, goldFlag)
  const epGain = after.ep - before.ep
  const epFlag = gainFlag(epGain, allowedEp(windowMs, region, chapter))
  if (epFlag) reasons.push('ep')
  flag = bump(flag, epFlag)
  if (!crestsInOrder(after.badges)) {
    reasons.push('crests')
    flag = 2
  }
  const known = new Set(before.mons.map((mon) => mon.uid))
  const fresh = after.mons.filter((mon) => !known.has(mon.uid))
  const allowed = new Set(after.speciesAllowed)
  if (fresh.length > allowedNewMons(windowMs)) {
    reasons.push('monsters')
    flag = 2
  }
  for (const mon of fresh) {
    if (!OBTAINED_HOW.includes(mon.obtainedHow as ObtainedHow)) {
      reasons.push('source')
      flag = 2
    }
    if (allowed.size && !allowed.has(mon.species)) {
      reasons.push('region')
      flag = 2
    }
  }
  const chestGain = after.chests - before.chests
  if (chestGain > allowedChests(windowMs)) {
    reasons.push('chests')
    flag = 2
  }
  const shardGain = after.shards - before.shards
  if (shardGain > allowedShards(windowMs)) {
    reasons.push('shards')
    flag = 2
  }
  const masteryGain = (after.mastery ?? 0) - (before.mastery ?? 0)
  const masteryFlag = gainFlag(masteryGain, allowedMastery(windowMs))
  if (masteryFlag) reasons.push('mastery')
  flag = bump(flag, masteryFlag)
  return { flag, reasons }
}
