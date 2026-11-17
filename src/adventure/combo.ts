import type { TypeId } from '../types'

/** Display only. Phase-2 step 15 is not in this fight loop, so these 12 pairs are a local stub. */
export interface ComboDef {
  id: string
  name: string
  types: readonly [TypeId, TypeId]
}

export const COMBOS: readonly ComboDef[] = [
  { id: 'glut_tropfen', name: 'Glut und Tropfen', types: ['fire', 'water'] },
  { id: 'wurzelbrand', name: 'Wurzelbrand', types: ['fire', 'plant'] },
  { id: 'moosstein', name: 'Moos und Stein', types: ['plant', 'earth'] },
  { id: 'sturmflut', name: 'Sturmflut', types: ['water', 'wind'] },
  { id: 'frosthauch', name: 'Frosthauch', types: ['ice', 'wind'] },
  { id: 'gewitterfront', name: 'Gewitterfront', types: ['lightning', 'water'] },
  { id: 'schattenlicht', name: 'Schattenlicht', types: ['light', 'shadow'] },
  { id: 'geisterklang', name: 'Geisterklang', types: ['ghost', 'sound'] },
  { id: 'erzfunke', name: 'Erz und Funke', types: ['metal', 'lightning'] },
  { id: 'bestienwut', name: 'Bestienwut', types: ['beast', 'fighting'] },
  { id: 'giftgarten', name: 'Giftgarten', types: ['poison', 'plant'] },
  { id: 'drachennebel', name: 'Drachennebel', types: ['dragon', 'ghost'] }
]

export const COMBO_CAP = 2
/** aura_flash.png is 5 frames of 128 px at 14 fps. */
export const AURA_MS = 357
export const AURA_FRAMES = 5

/** At most two combos, in the fixed list order. No stat change. */
export function activeCombos(types: readonly TypeId[]): ComboDef[] {
  const have = new Set(types)
  return COMBOS.filter((combo) => have.has(combo.types[0]) && have.has(combo.types[1])).slice(0, COMBO_CAP)
}
