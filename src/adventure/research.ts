import type { ResearchJobState, ResearchLineId, ResearchSave, SaveV2 } from './types'
import { TREE_CAP_MAX_MS, treeCapMs } from './tree'

/**
 * Research tower. One job at a time. It keeps running while the game is closed.
 * Level n costs 20_000 × 1.8^(n−1) gold and takes 30 min × 1.6^(n−1).
 * The banner-seal line is shard yield from wild fights: the expected number of
 * shards rises by 3% per level. Whole shards are paid from a remainder, because
 * +3% of one shard would disappear if it were rounded on every drop.
 */
export const RESEARCH_LINES = ['gold', 'ep', 'offline', 'expedition', 'egg', 'shard'] as const
export type ResearchLine = ResearchLineId
export const RESEARCH_MAX = 10
/** The first High Council. The same seal opens hort place 3. */
export const RESEARCH_BADGE = 'Ratsiegel'

export type ResearchJob = ResearchJobState
export type ResearchState = ResearchSave

export function researchCost(level: number): number {
  const step = Math.max(1, Math.min(RESEARCH_MAX, Math.floor(level)))
  return Math.round(20_000 * 1.8 ** (step - 1))
}

export function researchDurationMs(level: number): number {
  const step = Math.max(1, Math.min(RESEARCH_MAX, Math.floor(level)))
  return Math.round(30 * 60 * 1000 * 1.6 ** (step - 1))
}

export function researchLineTotal(): { gold: number, ms: number } {
  let gold = 0
  let ms = 0
  for (let level = 1; level <= RESEARCH_MAX; level++) {
    gold += researchCost(level)
    ms += researchDurationMs(level)
  }
  return { gold, ms }
}

export function emptyResearch(): ResearchState {
  return {
    ranks: { gold: 0, ep: 0, offline: 0, expedition: 0, egg: 0, shard: 0 },
    job: null,
    shardBank: 0
  }
}

export function researchRank(save: SaveV2, line: ResearchLine): number {
  const n = Math.floor(Number(save.research?.ranks?.[line]))
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(RESEARCH_MAX, n))
}

export function researchUnlocked(save: SaveV2): boolean {
  return (save.badges ?? []).includes(RESEARCH_BADGE)
}

export function researchGoldMult(save: SaveV2): number {
  return 1 + 0.03 * researchRank(save, 'gold')
}

export function researchEpMult(save: SaveV2): number {
  return 1 + 0.03 * researchRank(save, 'ep')
}

export function researchLootMult(save: SaveV2): number {
  return 1 + 0.04 * researchRank(save, 'expedition')
}

export function researchHatchMult(save: SaveV2): number {
  return 1 - 0.04 * researchRank(save, 'egg')
}

/** Expected wild shards per drop. 1 at rank 0, 1.3 at rank 10. */
export function researchShardYield(save: SaveV2): number {
  return 1 + 0.03 * researchRank(save, 'shard')
}

export function scaleHatch(baseMs: number, save: SaveV2): number {
  return Math.max(60_000, Math.round(baseMs * researchHatchMult(save)))
}

/** Tree cap plus 15 min per offline-line level, never past 12 h. */
export function offlineCapMs(save: SaveV2): number {
  const bonus = researchRank(save, 'offline') * 15 * 60 * 1000
  return Math.min(TREE_CAP_MAX_MS, treeCapMs(save) + bonus)
}

function ensure(save: SaveV2): ResearchState {
  if (!save.research) save.research = emptyResearch()
  return save.research
}

export function normalizeResearch(save: SaveV2, now: number): void {
  const raw = save.research
  const ranks = emptyResearch().ranks
  for (const line of RESEARCH_LINES) {
    const n = Math.floor(Number(raw?.ranks?.[line]))
    ranks[line] = Number.isFinite(n) ? Math.max(0, Math.min(RESEARCH_MAX, n)) : 0
  }
  let job: ResearchJob | null = null
  const candidate = raw?.job
  if (candidate && RESEARCH_LINES.includes(candidate.line)) {
    const level = Math.floor(Number(candidate.level))
    const startedAt = Math.floor(Number(candidate.startedAt))
    const readyAt = Math.floor(Number(candidate.readyAt))
    if (level === ranks[candidate.line] + 1 && level <= RESEARCH_MAX && Number.isFinite(startedAt) && Number.isFinite(readyAt) && readyAt > startedAt) {
      job = { line: candidate.line, level, startedAt, readyAt }
    }
  }
  const bank = Number(raw?.shardBank)
  save.research = {
    ranks,
    job,
    shardBank: Number.isFinite(bank) ? Math.max(0, Math.min(0.999999, bank)) : 0
  }
  settleResearch(save, now)
}

/** Finishes the running job once its clock is up. It does not start the next one. */
export function settleResearch(save: SaveV2, now: number): boolean {
  const job = save.research?.job
  if (!job || now < job.readyAt) return false
  const state = ensure(save)
  if (job.level === researchRank(save, job.line) + 1 && job.level <= RESEARCH_MAX) state.ranks[job.line] = job.level
  state.job = null
  return true
}

export function startResearch(save: SaveV2, line: ResearchLine, now: number): 'locked' | 'busy' | 'max' | 'gold' | null {
  settleResearch(save, now)
  if (!researchUnlocked(save)) return 'locked'
  const state = ensure(save)
  if (state.job) return 'busy'
  const next = researchRank(save, line) + 1
  if (next > RESEARCH_MAX) return 'max'
  const cost = researchCost(next)
  if (save.gold < cost) return 'gold'
  save.gold -= cost
  state.job = { line, level: next, startedAt: now, readyAt: now + researchDurationMs(next) }
  return null
}

/** Whole shards from one wild drop, including any remainder that just filled up. */
export function takeWildShards(save: SaveV2): number {
  const extra = researchShardYield(save) - 1
  if (extra <= 0) return 1
  const state = ensure(save)
  state.shardBank = Math.max(0, Math.min(0.999999, state.shardBank)) + extra
  let bonus = 0
  if (state.shardBank >= 1) {
    bonus = Math.floor(state.shardBank)
    state.shardBank -= bonus
  }
  return 1 + bonus
}

export interface ResearchAuditJob {
  line: number
  level: number
  startedAt: number
  readyAt: number
}

export interface ResearchAudit {
  ranks: number[]
  job: ResearchAuditJob | null
}

const EMPTY_RANKS = [0, 0, 0, 0, 0, 0]

export function researchAudit(save: SaveV2): ResearchAudit {
  if (!save.research) return { ranks: [...EMPTY_RANKS], job: null }
  const ranks = RESEARCH_LINES.map((line) => {
    const n = Number(save.research?.ranks?.[line])
    return Number.isFinite(n) ? Math.floor(n) : -1
  })
  const job = save.research.job
  if (!job) return { ranks, job: null }
  return {
    ranks,
    job: {
      line: RESEARCH_LINES.indexOf(job.line),
      level: Math.floor(Number(job.level)),
      startedAt: Math.floor(Number(job.startedAt)),
      readyAt: Math.floor(Number(job.readyAt))
    }
  }
}

/** Milliseconds of research that must already have passed. A prepaid job only costs its remainder. */
export function researchMsNeeded(before: ResearchAudit | null, after: ResearchAudit, beforeAt: number): number {
  const prev = before?.ranks ?? EMPTY_RANKS
  const prepaid = before?.job ?? null
  let needed = 0
  let used = false
  for (let line = 0; line < RESEARCH_LINES.length; line++) {
    const from = Number.isFinite(prev[line]) ? prev[line] : 0
    for (let level = from + 1; level <= after.ranks[line]; level++) {
      if (prepaid && !used && prepaid.line === line && prepaid.level === level) {
        needed += Math.max(0, prepaid.readyAt - beforeAt)
        used = true
      } else needed += researchDurationMs(level)
    }
  }
  return needed
}

/** Gold that must have been paid since the previous audit. A job that was already running is not paid again. */
export function researchSpend(before: ResearchAudit | null, after: ResearchAudit | null): number {
  if (!after) return 0
  const prev = before?.ranks ?? EMPTY_RANKS
  const prepaid = before?.job ?? null
  let spend = 0
  let used = false
  for (let line = 0; line < RESEARCH_LINES.length; line++) {
    const from = Number.isFinite(prev[line]) ? prev[line] : 0
    for (let level = from + 1; level <= after.ranks[line]; level++) {
      if (prepaid && !used && prepaid.line === line && prepaid.level === level) used = true
      else spend += researchCost(level)
    }
  }
  const job = after.job
  const same = Boolean(job && prepaid && job.line === prepaid.line && job.level === prepaid.level && job.startedAt === prepaid.startedAt && job.readyAt === prepaid.readyAt)
  if (job && !same) spend += researchCost(job.level)
  return spend
}
