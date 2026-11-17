import lootboxJson from '../../data/lootbox.json'
import { species } from '../data'
import { regions, type RegionDef } from './route'
import { expToNext } from './stats'
import type { SaveV2 } from './types'

export type ChestTier = 'kiesel' | 'silber' | 'gold' | 'sternen'

export interface ChestCounts {
  kiesel: number
  silber: number
  gold: number
  sternen: number
}

export interface PityState {
  silber: number
  gold: number
  sternen: number
}

export interface OpenChestState {
  unlockedRegions: readonly number[]
  ownedSpecies: readonly string[]
  /** Current region number. Gold is multiplied by it when the file says so. */
  region: number
}

export interface ChestRoll {
  speciesId: string
  rarity: number
  isNew: boolean
  gold: number
}

export interface ChestGrant extends ChestRoll {
  name: string
  place: 'team' | 'pc' | 'exp'
}

interface RateSpecies {
  id: string
  chance: number
}

export interface RateRow {
  rarity: number
  percent: number
  species: RateSpecies[]
}

interface Prepared {
  total: number
  weights: number[]
  lists: string[][]
}

/** Pity and the new-species guard stay in the file. L3 turns this on. */
export const features = { pity: false }

export const CHEST_TIERS: readonly ChestTier[] = ['kiesel', 'silber', 'gold', 'sternen']
export const TIER_LABEL: Record<ChestTier, string> = {
  kiesel: 'Kieseltruhe',
  silber: 'Silbertruhe',
  gold: 'Goldtruhe',
  sternen: 'Sternentruhe'
}
export const RATES_HINT = 'Inhalt nur aus freigeschalteten Regionen. Fehlende Seltenheiten werden abgestuft.'
export const CHEST_PARTICLE_CAP = 40
export const OPEN_ALL_MAX = 10
export const INFO_HIT_PX = 132

const file = lootboxJson

const preparedCache = new Map<string, Prepared>()

export function emptyChests(): ChestCounts {
  return { kiesel: 0, silber: 0, gold: 0, sternen: 0 }
}

export function emptyPity(): PityState {
  return { silber: 0, gold: 0, sternen: 0 }
}

export function startChests(): ChestCounts {
  return {
    kiesel: Math.min(file.storageCap, file.debugStartChests.kiesel),
    silber: 0,
    gold: 0,
    sternen: 0
  }
}

export function clampChestCount(value: unknown): number {
  return Math.max(0, Math.min(file.storageCap, Math.floor(Number(value)) || 0))
}

/** One decimal, German comma. Dialog and tests share this. */
export function formatPercent(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1).replace('.', ',')
}

export function chestAnimMs(speed: number): number {
  return speed === 1 ? 1200 : 600
}

export function chestParticles(rarity: number, reduced: boolean): number {
  if (reduced || rarity < 7) return 0
  return CHEST_PARTICLE_CAP
}

export function speciesInRegion(regionId: number): string[] {
  const region = regions.find((entry) => entry.id === regionId)
  if (!region) return []
  return collectSpecies(region)
}

function collectSpecies(region: RegionDef): string[] {
  const ids = new Set<string>()
  for (const chapter of region.chapters) {
    for (const row of chapter.day) ids.add(row.species)
    for (const row of chapter.night) ids.add(row.species)
    for (const row of chapter.weather ?? []) ids.add(row.species)
    for (const row of chapter.guardian.team) ids.add(row.species)
    for (const member of chapter.council?.members ?? []) {
      for (const row of member.team) ids.add(row.species)
    }
  }
  return [...ids].sort()
}

/**
 * A region counts once its chapter 1 has been entered.
 * Region 1 is the start. Later regions stick in `regionsEntered` after a visit.
 */
export function enteredRegions(save: Pick<SaveV2, 'regionsOpen' | 'region' | 'regionsEntered'>): number[] {
  const open = new Set(save.regionsOpen ?? [])
  const ids = new Set<number>([1])
  for (const id of save.regionsEntered ?? []) if (id === 1 || open.has(id)) ids.add(id)
  if (open.has(save.region)) ids.add(save.region)
  return [...ids].sort((a, b) => a - b)
}


export function poolFor(unlockedRegions: readonly number[]): string[] {
  const ids = new Set<string>()
  for (const regionId of unlockedRegions) {
    for (const id of speciesInRegion(regionId)) ids.add(id)
  }
  return [...ids].sort()
}

/**
 * Move a rarity's share onto the next lower rarity that still has species.
 * If none is lower, move it onto the next higher one.
 */
export function foldRates(rates: readonly number[], counts: readonly number[]): number[] {
  const moved = rates.map((rate) => rate)
  for (let rarity = 0; rarity < moved.length; rarity++) {
    if (moved[rarity] <= 0 || (counts[rarity] ?? 0) > 0) continue
    const share = moved[rarity]
    moved[rarity] = 0
    let target = -1
    for (let lower = rarity - 1; lower >= 0; lower--) {
      if ((counts[lower] ?? 0) > 0) {
        target = lower
        break
      }
    }
    if (target < 0) {
      for (let higher = rarity + 1; higher < moved.length; higher++) {
        if ((counts[higher] ?? 0) > 0) {
          target = higher
          break
        }
      }
    }
    if (target >= 0) moved[target] += share
  }
  return moved
}

export function effectiveTable(tier: ChestTier, pool: readonly string[]): RateRow[] {
  const rates = file.tiers[tier].rates
  const byRarity: string[][] = Array.from({ length: 10 }, () => [])
  for (const id of pool) {
    const rarity = species(id).baseRarity
    if (rarity >= 0 && rarity < 10) byRarity[rarity].push(id)
  }
  for (const list of byRarity) list.sort()
  const weights = foldRates(rates, byRarity.map((list) => list.length))
  return weights.map((percent, rarity) => {
    const list = byRarity[rarity]
    const each = list.length ? percent / list.length : 0
    return {
      rarity,
      percent,
      species: list.map((id) => ({ id, chance: each }))
    }
  })
}

function prepare(tier: ChestTier, pool: readonly string[]): Prepared {
  const key = `${tier}:${pool.join(',')}`
  const cached = preparedCache.get(key)
  if (cached) return cached
  const table = effectiveTable(tier, pool)
  const weights = table.map((row) => row.percent)
  const prepared = {
    total: weights.reduce((sum, weight) => sum + weight, 0),
    weights,
    lists: table.map((row) => row.species.map((entry) => entry.id))
  }
  preparedCache.set(key, prepared)
  return prepared
}

function pickRarity(prepared: Prepared, rng: () => number): number {
  let cursor = rng() * prepared.total
  for (let rarity = 0; rarity < prepared.weights.length; rarity++) {
    cursor -= prepared.weights[rarity]
    if (cursor < 0 && prepared.lists[rarity].length) return rarity
  }
  for (let rarity = prepared.lists.length - 1; rarity >= 0; rarity--) {
    if (prepared.lists[rarity].length) return rarity
  }
  throw new Error('Die Truhe hat keinen Pool.')
}

function rollGold(tier: ChestTier, region: number, rng: () => number): number {
  const span = file.extraGold[tier]
  const min = span[0]
  const count = span[1] - span[0] + 1
  let gold = min + Math.floor(rng() * count)
  if (file.extraGold.perRegion) gold *= Math.max(1, Math.floor(region) || 1)
  return gold
}

/** Pure open. Pity stays off until L3, so the counters are not read. */
export function openChest(tier: ChestTier, state: OpenChestState, rng: () => number): ChestRoll {
  if (features.pity) {
    // L3 reads state pity and may reroll a duplicate in gold and star chests.
  }
  const pool = poolFor(state.unlockedRegions)
  const prepared = prepare(tier, pool)
  if (prepared.total <= 0) throw new Error('Die Truhe hat keinen Pool.')
  const rarity = pickRarity(prepared, rng)
  const list = prepared.lists[rarity]
  const speciesId = list[Math.min(list.length - 1, Math.floor(rng() * list.length))]
  const isNew = !state.ownedSpecies.includes(speciesId)
  return { speciesId, rarity, isNew, gold: rollGold(tier, state.region, rng) }
}

export function duplicateExp(level: number): number {
  return expToNext(level) + expToNext(level + 1)
}

export function chestStateOf(save: Pick<SaveV2, 'mons' | 'region' | 'regionsOpen' | 'regionsEntered'>): OpenChestState {
  const owned = new Set<string>()
  for (const mon of Object.values(save.mons)) owned.add(mon.species)
  return { unlockedRegions: enteredRegions(save), ownedSpecies: [...owned], region: save.region }
}
