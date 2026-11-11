import type { TypeId } from './types'

/** Idle numbers from the approved concept (Teil A). All of them are [ANNAHME]. */
export const HOUR_MS = 3_600_000
export const ADVANCE_MS = 30 * 60_000
export const FULL_RATE_MS = 2 * HOUR_MS
export const TAIL_RATE = 0.8
export const WELCOME_MS = 5 * 60_000
export const GOLD_FACTOR = 0.6
export const EXP_FACTOR = 0.6
export const ESSENCE_PER_STAGE_HOUR = 0.03
export const CATALOG_BONUS_PER_SPECIES = 0.005
export const SEAL_INCOME_PER = 0.03
export const SEAL_STAT_PER = 0.01
export const SAVE_VERSION = 6

/**
 * The concept indexes `activeTypes[(chapter * 7) % 20]`.
 * The shipped active-type list has 16 entries, so the modulo needs the full
 * 20-type order from the type table. Chapters 1 and 2 use the same formula
 * for the counter tip and the type-bonus seal.
 */
export const REGION_TYPES: TypeId[] = [
  'fire', 'water', 'plant', 'earth', 'wind', 'ice', 'lightning', 'poison', 'metal', 'stone',
  'light', 'shadow', 'ghost', 'dragon', 'insect', 'beast', 'fighting', 'psychic', 'sound', 'crystal'
]

export function offlineCapMs(townhallLevel: number): number {
  if (townhallLevel >= 5) return 12 * HOUR_MS
  if (townhallLevel >= 3) return 10 * HOUR_MS
  return 8 * HOUR_MS
}

export function offlineCapHours(townhallLevel: number): number {
  return offlineCapMs(townhallLevel) / HOUR_MS
}

/** Mine warehouse follows the same cap: rate × hours. The curve below does not apply. */
export function mineCapacity(ratePerHour: number, townhallLevel: number): number {
  return ratePerHour * offlineCapHours(townhallLevel)
}

/** Negative or non-finite clock deltas count as zero. Anything above the cap is dropped. */
export function clampedAwayMs(now: number, lastSeenAt: number, capMs: number): { awayMs: number; countedMs: number; capped: boolean } {
  const awayMs = now - lastSeenAt
  if (!Number.isFinite(awayMs) || awayMs <= 0) return { awayMs: 0, countedMs: 0, capped: false }
  const capped = awayMs > capMs
  return { awayMs, countedMs: Math.min(awayMs, capMs), capped }
}

/** First 2 h of the capped absence at ×1, everything after that at ×0.8. */
export function effectiveCombatMs(countedMs: number): number {
  const safe = Math.max(0, countedMs)
  const full = Math.min(safe, FULL_RATE_MS)
  const tail = Math.max(0, safe - FULL_RATE_MS)
  return full + tail * TAIL_RATE
}

export function effectiveCombatHours(countedMs: number): number {
  return effectiveCombatMs(countedMs) / HOUR_MS
}

/** Piece of the efficiency curve between two offsets from the start of the capped window. */
export function efficiencyMs(startOffset: number, endOffset: number): number {
  const start = Math.max(0, startOffset)
  const end = Math.max(start, endOffset)
  const fullEnd = FULL_RATE_MS
  const full = Math.max(0, Math.min(end, fullEnd) - Math.min(start, fullEnd))
  const tail = Math.max(0, end - Math.max(start, fullEnd))
  return full + tail * TAIL_RATE
}

export function qFromWinRate(w: number): number {
  if (!Number.isFinite(w) || w < 0.2) return 0.2
  if (w >= 0.7) return 1
  return w / 0.7
}

export function catalogMultiplier(speciesCount: number): number {
  return 1 + CATALOG_BONUS_PER_SPECIES * Math.max(0, speciesCount)
}

export function sealMultiplier(seals: number): number {
  return 1 + SEAL_INCOME_PER * Math.max(0, seals)
}

/** Income bonus is the catalog multiplier only. Seals multiply on top. There is no prestige term. */
export function incomeBonus(speciesCount: number, seals: number): number {
  return catalogMultiplier(speciesCount) * sealMultiplier(seals)
}

export function sealStatMult(seals: number): number {
  return 1 + SEAL_STAT_PER * Math.max(0, seals)
}

export interface CombatRates {
  goldPerHour: number
  expPerHour: number
  essencePerHour: number
}

export function combatRates(repeatGold: number, exp: number, globalStage: number, q: number, bonus: number): CombatRates {
  return {
    goldPerHour: GOLD_FACTOR * repeatGold * q * bonus,
    expPerHour: EXP_FACTOR * exp * q * bonus,
    essencePerHour: ESSENCE_PER_STAGE_HOUR * globalStage * q
  }
}

export function stageId(globalStage: number): string {
  const chapter = Math.floor((globalStage - 1) / 10) + 1
  const local = ((globalStage - 1) % 10) + 1
  return `${chapter}-${local}`
}

export function parseStageId(id: string): { chapter: number; local: number; globalStage: number } | null {
  const match = /^(\d+)-(\d+)$/.exec(id)
  if (!match) return null
  const chapter = Number(match[1])
  const local = Number(match[2])
  if (chapter < 1 || local < 1 || local > 10) return null
  return { chapter, local, globalStage: (chapter - 1) * 10 + local }
}

export function isBossStage(globalStage: number): boolean {
  return globalStage > 0 && globalStage % 10 === 0
}

/** Boss seals start at 2-10. Stage 1-10 stays a boss fight, but it does not mint a seal. */
export function bossGrantsSeal(globalStage: number): boolean {
  return globalStage >= 20 && isBossStage(globalStage)
}

export function regionMainType(chapter: number): TypeId {
  const index = (Math.max(1, chapter) * 7) % REGION_TYPES.length
  return REGION_TYPES[index]
}

export function counterType(main: TypeId, strong: (type: TypeId) => readonly TypeId[]): TypeId {
  for (const type of REGION_TYPES) {
    if (type !== main && strong(type).includes(main)) return type
  }
  return REGION_TYPES[0]
}

export function monoCounterTeam(types: readonly TypeId[], main: TypeId, strong: (type: TypeId) => readonly TypeId[]): boolean {
  if (types.length !== 5) return false
  const type = types[0]
  if (!types.every((entry) => entry === type)) return false
  return strong(type).includes(main)
}

export interface StageRateInput {
  repeatGold: number
  exp: number
  globalStage: number
}

export interface IdleAdvance {
  stage: number
  w: number
}

export interface IdlePlanInput {
  from: number
  until: number
  capMs: number
  stage: number
  lastAdvanceCheck: number
  currentW: number
  wNext: number
  wNextStage: number
  bonus: number
  cleared: (globalStage: number) => boolean
  unlocked: (globalStage: number) => boolean
  isBoss: (globalStage: number) => boolean
  rates: (globalStage: number) => StageRateInput | null
  winRate: (globalStage: number) => number
}

export interface IdlePlan {
  gold: number
  exp: number
  essence: number
  advances: IdleAdvance[]
  stage: number
  w: number
  q: number
  wNext: number
  wNextStage: number
  lastAdvanceCheck: number
  awayMs: number
  countedMs: number
  capped: boolean
}

/**
 * Pure offline ledger. One advance check each 30 minutes, at most one stage per check.
 * Boss stages are never taken. A failed check is not simulated again inside the same window.
 */
export function planIdle(input: IdlePlanInput): IdlePlan {
  const clock = clampedAwayMs(input.until, input.from, input.capMs)
  const base = {
    gold: 0,
    exp: 0,
    essence: 0,
    advances: [] as IdleAdvance[],
    stage: input.stage,
    w: input.currentW,
    q: qFromWinRate(input.currentW),
    wNext: input.wNext,
    wNextStage: input.wNextStage,
    lastAdvanceCheck: input.lastAdvanceCheck > input.until ? input.until : input.lastAdvanceCheck,
    awayMs: clock.awayMs,
    countedMs: clock.countedMs,
    capped: clock.capped
  }
  if (clock.countedMs <= 0) return base

  const from = input.from
  const windowEnd = from + clock.countedMs
  let check = input.lastAdvanceCheck > 0 ? input.lastAdvanceCheck : from
  while (check + ADVANCE_MS < from) check += ADVANCE_MS

  let stage = input.stage
  let w = input.currentW
  let q = qFromWinRate(w)
  const owned = new Set<number>()
  const ratesFor = (globalStage: number): StageRateInput | null => {
    if (globalStage <= 0) return null
    if (!owned.has(globalStage) && !input.cleared(globalStage)) return null
    return input.rates(globalStage)
  }

  let cursor = from
  let guard = 0
  while (cursor < windowEnd && guard++ < 64) {
    const nextCheck = check + ADVANCE_MS
    const sliceEnd = Math.min(windowEnd, nextCheck)
    if (sliceEnd > cursor) {
      const rates = ratesFor(stage)
      if (rates) {
        const hours = efficiencyMs(cursor - from, sliceEnd - from) / HOUR_MS
        const earned = combatRates(rates.repeatGold, rates.exp, rates.globalStage, q, input.bonus)
        base.gold += earned.goldPerHour * hours
        base.exp += earned.expPerHour * hours
        base.essence += earned.essencePerHour * hours
      }
      cursor = sliceEnd
    }
    if (nextCheck > windowEnd || cursor < nextCheck) break
    check = nextCheck
    base.lastAdvanceCheck = nextCheck
    const next = stage + 1
    const previousReady = next === 1 || owned.has(stage) || input.cleared(stage)
    if (next <= 0 || !previousReady || input.isBoss(next) || !input.unlocked(next)) continue
    const nextW = input.winRate(next)
    base.wNext = nextW
    base.wNextStage = next
    if (nextW < 0.7) continue
    owned.add(next)
    stage = next
    w = nextW
    q = qFromWinRate(nextW)
    base.advances.push({ stage: next, w: nextW })
  }

  base.stage = stage
  base.w = w
  base.q = q
  return base
}

export function shouldWelcome(awayMs: number): boolean {
  return awayMs >= WELCOME_MS
}

export function formatAway(ms: number): string {
  const totalMin = Math.max(0, Math.floor(ms / 60_000))
  const hours = Math.floor(totalMin / 60)
  const minutes = totalMin % 60
  if (hours <= 0) return `${minutes} Min.`
  if (minutes === 0) return `${hours} h`
  return `${hours} h ${minutes} Min.`
}

export function capReachedLabel(townhallLevel: number): string {
  return `Deckel ${offlineCapHours(townhallLevel)} h erreicht`
}

export function catalogBonusLabel(speciesCount: number): string {
  const pct = (Math.max(0, speciesCount) * 50 / 100).toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return `Katalog-Bonus: +${pct} % Gold und EP (${Math.max(0, speciesCount)} Arten)`
}

export function sealLabel(seals: number): string {
  const count = Math.max(0, seals)
  return `Regionssiegel: ${count} (+${3 * count} % Ertrag, +${count} % Werte)`
}

export function capLabel(townhallLevel: number): string {
  return `Offline-Deckel: ${offlineCapHours(townhallLevel)} h`
}

export function idleStatusLine(stage: number, w: number): string {
  if (stage <= 0) return 'Idle: noch keine Stage'
  const weak = w < 0.2 ? ' · Team zu schwach' : ''
  return `Idle ${stageId(stage)}: ${Math.round(w * 100)} %${weak}`
}

export function stagesWonLine(fromStage: number, toStage: number, won: number): string {
  if (won <= 0 || toStage <= 0) return 'Keine neue Stage'
  const fromLabel = fromStage <= 0 ? 'Start' : stageId(fromStage)
  return `${fromLabel} → ${stageId(toStage)} (${won} ${won === 1 ? 'Sieg' : 'Siege'})`
}

export interface TipInput {
  stage: number
  w: number
  q: number
  bossWaitingId: string | null
  counterName: string
  upgrade: { name: string; level: number } | null
}

export function welcomeTip(input: TipInput): string {
  if (input.bossWaitingId) return `Boss ${input.bossWaitingId} wartet auf dich`
  if (input.stage > 0 && input.q < 1) {
    const weak = input.w < 0.2 ? ' Team zu schwach.' : ''
    return `Team schafft Stage ${stageId(input.stage)} nur zu ${Math.round(input.w * 100)} %, probier Typ ${input.counterName}.${weak}`
  }
  if (input.upgrade) return `${input.upgrade.name} ${input.upgrade.level} ausbaubar`
  return ''
}

/** The rewarded button stays hidden while the no-ads adapter reports no fill. */
export function idleDoubleVisible(rewardedAvailable: boolean): boolean {
  return rewardedAvailable
}
