import type { FightTrace } from './battle'
import { planBattle, battleQueueOn } from './battlePlayer'
import { BASE_ENCOUNTER_MS } from './const'
import type { NodeKind } from './route'
import type { RewardBank, SaveV2 } from './types'

/** Road-pace compensation is live together with the road queue. */
export const ROAD_PACE_SWITCH = true

/** Chapter-1 measurement. Missing `roadPace` uses this once the switch is on. */
export const ROAD_PACE_DEFAULT = 1.6

/** Rewards never multiply by more than this. The stored average may sit above it. */
export const W_CAP = 3.5

/** One chance roll stays at or below this. The rest waits in the bank. */
export const CHANCE_CAP = 0.95

/**
 * Moving average over about 50 road nodes: `W + (2/51) * (d/2800 - W)`.
 * 2/51 is the sample weight for a window of 50.
 */
export const PACE_STEP = 2 / 51

/** Linear trims. 1 keeps the measured rate. Rescale only from the A4 acceptance run. */
export const PACE_K = {
  exp: 1,
  gold: 1,
  shard: 1,
  mastery: 1,
  chest: 1
} as const

export type PaceKind = keyof typeof PACE_K

/** Dev-only override. `null` keeps `ROAD_PACE_SWITCH`. */
let paceOverride: boolean | null = null

export function setRoadPace(on: boolean | null): void {
  paceOverride = on
}

/** `?debug=1&roadPace=1` in a dev build. A production page ignores it. */
export function roadPaceFromSearch(debug: boolean, search: string): boolean {
  if (!debug) return false
  return new URLSearchParams(search).get('roadPace') === '1'
}

export function roadPaceSwitchOn(): boolean {
  if (paceOverride != null) return paceOverride
  return ROAD_PACE_SWITCH
}

/** Live only together with the road-queue switch. Offline callers stay at W = 1. */
export function roadPaceLive(): boolean {
  return roadPaceSwitchOn() && battleQueueOn('road')
}

export function readRoadPace(save: SaveV2): number {
  const raw = save.roadPace
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : ROAD_PACE_DEFAULT
}

/** Weight read before the node. Clamped. The save still holds the raw average. */
export function paceWeight(save: SaveV2): number {
  return Math.min(W_CAP, Math.max(1, readRoadPace(save)))
}

export function pacedBase(save: SaveV2, base: number, kind: PaceKind): number {
  return base * paceWeight(save) * PACE_K[kind]
}

/** Chance after W and k, plus the part that no longer fits in one roll. */
export function paceChance(save: SaveV2, chance: number, kind: 'shard' | 'chest'): { roll: number, overflow: number } {
  const want = Math.max(0, chance) * paceWeight(save) * PACE_K[kind === 'shard' ? 'shard' : 'chest']
  const roll = Math.min(CHANCE_CAP, want)
  return { roll, overflow: Math.max(0, want - roll) }
}

function ensureBank(save: SaveV2): RewardBank {
  if (!save.rewardBank) save.rewardBank = { mastery: 0, findChest: 0, trainerChest: 0, shard: 0 }
  return save.rewardBank
}

/** Add a fractional reward and return how many whole units are ready. */
export function bankAdd(save: SaveV2, key: keyof RewardBank, amount: number): number {
  const bank = ensureBank(save)
  bank[key] = Math.max(0, (bank[key] || 0) + amount)
  const whole = Math.floor(bank[key])
  if (whole > 0) bank[key] -= whole
  return whole
}

export function bankRemainder(save: SaveV2, key: keyof RewardBank, amount: number): void {
  if (!(amount > 0)) return
  const bank = ensureBank(save)
  bank[key] = Math.max(0, (bank[key] || 0) + amount)
}

export function bankTake(save: SaveV2, key: keyof RewardBank): number {
  const bank = save.rewardBank
  if (!bank) return 0
  const whole = Math.floor(bank[key] || 0)
  if (whole > 0) bank[key] -= whole
  return Math.max(0, whole)
}

/** Find and spring stay on today's clock. Guardian, council and world beast are not road nodes. */
export function roadNodeMs(kind: NodeKind, traces: readonly FightTrace[]): number {
  if (kind === 'find' || kind === 'spring') return BASE_ENCOUNTER_MS
  if (kind !== 'wild' && kind !== 'trainer') return 0
  const plan = planBattle(traces, 'road', 1)
  const last = plan[plan.length - 1]
  return last ? last.start + last.dur : BASE_ENCOUNTER_MS
}

/** Read W before the rewards, then call this. Offline and a dark switch leave the save alone. */
export function noteRoadNode(save: SaveV2, kind: NodeKind, traces: readonly FightTrace[], offline: boolean): void {
  if (offline || !roadPaceLive()) return
  if (kind !== 'wild' && kind !== 'trainer' && kind !== 'find' && kind !== 'spring') return
  const d = roadNodeMs(kind, traces)
  const prev = readRoadPace(save)
  const next = prev + PACE_STEP * (d / BASE_ENCOUNTER_MS - prev)
  if (Number.isFinite(next)) save.roadPace = next
}
