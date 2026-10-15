import { gachaCfg, monsters, species } from './data'
import { weightedPick } from './rng'
import type { GachaState, Rarity } from './types'

export function pLeg(n: number): number {
  const pity = gachaCfg.pity.legendaryPlus
  if (n >= pity.hard) return 1
  return pity.base + Math.max(0, n - (pity.softStart - 1)) * pity.softStep
}

export function pEpic(n: number): number {
  const pity = gachaCfg.pity.epicPlus
  if (n >= pity.hard) return 1
  return pity.baseConditional + Math.max(0, n - (pity.softStart - 1)) * pity.softStep
}

export interface RollFlags {
  forceRarePlus?: boolean
  forceEpicPlus?: boolean
}

/** One rarity roll. Mutates pity counters. `n` includes the current pull. */
export function rollRarity(state: GachaState, rng: () => number, flags: RollFlags = {}): Rarity {
  state.pityLeg += 1
  state.pityEpic += 1
  state.totalPulls += 1
  if (rng() < pLeg(state.pityLeg)) {
    state.pityLeg = 0
    state.pityEpic = 0
    return weightedPick(rng, gachaCfg.legendaryWeights) as Rarity
  }
  if (rng() < pEpic(state.pityEpic)) {
    state.pityEpic = 0
    return weightedPick(rng, gachaCfg.epicWeights) as Rarity
  }
  if (flags.forceEpicPlus) {
    state.pityEpic = 0
    return gachaCfg.tutorialMulti.guaranteeMinRarity as Rarity
  }
  if (flags.forceRarePlus) return gachaCfg.multiGuaranteeMinRarity as Rarity
  return weightedPick(rng, gachaCfg.commonWeights) as Rarity
}

/**
 * One species of the rolled rarity. The pool is every monster in the data file:
 * type unlocks and town-hall level do not remove anyone, and a rarity with no
 * exact species still resolves to the closest lower species (upgraded).
 */
export function pickSpecies(rarity: Rarity, rng: () => number): { speciesId: string; upgraded: boolean } {
  const exact = monsters.filter((monster) => monster.baseRarity === rarity)
  if (exact.length) {
    const index = Math.min(exact.length - 1, Math.floor(rng() * exact.length))
    return { speciesId: exact[index].id, upgraded: false }
  }
  const below = monsters.filter((monster) => monster.baseRarity < rarity)
  const maxBase = Math.max(...below.map((monster) => monster.baseRarity))
  const pool = below.filter((monster) => monster.baseRarity === maxBase)
  const index = Math.min(pool.length - 1, Math.floor(rng() * pool.length))
  return { speciesId: pool[index].id, upgraded: true }
}

export interface RawPull {
  speciesId: string
  rarity: Rarity
  upgraded: boolean
}

/**
 * Ten pulls in order. If the first nine are all below `minRarity`,
 * the tenth is forced to at least that rarity (legendary/epic rolls still win).
 */
export function rollMulti(state: GachaState, rng: () => number, minRarity: Rarity): RawPull[] {
  const pulls: RawPull[] = []
  for (let i = 0; i < 10; i++) {
    const needForce = i === 9 && pulls.every((p) => p.rarity < minRarity)
    const rarity = rollRarity(state, rng, {
      forceRarePlus: needForce && minRarity <= 2,
      forceEpicPlus: needForce && minRarity >= 3
    })
    const picked = pickSpecies(rarity, rng)
    pulls.push({ speciesId: picked.speciesId, rarity, upgraded: picked.upgraded || rarity > species(picked.speciesId).baseRarity })
  }
  return pulls
}

export function pullsUntilLegendary(pityLeg: number): number {
  return Math.max(0, gachaCfg.pity.legendaryPlus.hard - pityLeg)
}

export function pullsUntilEpic(pityEpic: number): number {
  return Math.max(0, gachaCfg.pity.epicPlus.hard - pityEpic)
}
