import type { TypeId } from '../types'
import { activeSynergies, SYNERGIES, SYNERGY_CAP } from './synergy'

/** Battle-dock view of a synergy. The numbers live in synergy.ts. */
export interface ComboDef {
  id: string
  name: string
  types: readonly [TypeId, TypeId]
}

export const COMBOS: readonly ComboDef[] = SYNERGIES.map((row) => ({ id: row.id, name: row.name, types: row.types }))
export const COMBO_CAP = SYNERGY_CAP
/** aura_flash.png is 5 frames of 128 px at 14 fps. */
export const AURA_MS = 357
export const AURA_FRAMES = 5

/** At most two synergies. A missing choice keeps the two strongest. */
export function activeCombos(types: readonly TypeId[], picked?: readonly string[] | null): ComboDef[] {
  return activeSynergies(types, picked).map((row) => ({ id: row.id, name: row.name, types: row.types }))
}
