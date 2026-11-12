import { regionRoster } from './dex'
import type { SaveV2 } from './types'

/** Wild encounters. Hort uses the other rate once that place exists. */
export const SHINY_ADVENTURE_RATE = 1 / 4000
export const SHINY_HORT_RATE = 1 / 512

export function regionDexComplete(save: SaveV2, regionId: number): boolean {
  const roster = regionRoster(regionId)
  return roster.length > 0 && roster.every((id) => (save.dex[id]?.caught ?? 0) > 0)
}

/** A finished regional codex doubles only wild shimmer, not the hort rate. */
export function shinyChance(save: SaveV2, regionId: number, source: 'adventure' | 'hort' = 'adventure'): number {
  if (source === 'hort') return SHINY_HORT_RATE
  const base = SHINY_ADVENTURE_RATE
  return regionDexComplete(save, regionId) ? base * 2 : base
}

export function rollShiny(rng: () => number, chance: number): boolean {
  return rng() < chance
}

export function teamBlocksShiny(save: SaveV2, speciesId: string, shiny: boolean, replacing: string | null = null): boolean {
  if (!shiny) return false
  return save.team.some((uid) => uid !== replacing && save.mons[uid]?.species === speciesId && save.mons[uid].shiny)
}
