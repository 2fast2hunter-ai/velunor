import { monsters, rarities, typesCfg } from './data'
import type { MonsterSpecies, Rarity, TypeId } from './types'

export { classLabel } from './synergy'

export type CatalogTypeFilter = TypeId | 'all'
export type CatalogRarityFilter = Rarity | 'all'

export interface CatalogQuery {
  type: CatalogTypeFilter
  rarity: CatalogRarityFilter
  obtainedOnly: boolean
  collected: ReadonlySet<string>
}

export function catalogTypeIds(): TypeId[] {
  return Object.keys(typesCfg.names) as TypeId[]
}

export function catalogRarities(): { index: Rarity; name: string; color: string }[] {
  return rarities.map((row) => ({ index: row.index as Rarity, name: row.name, color: row.color }))
}

/** Species order follows monsters.json, so a later batch shows up without a scene change. */
export function filterCatalog(query: CatalogQuery): MonsterSpecies[] {
  return monsters.filter((monster) => {
    if (query.type !== 'all' && monster.type !== query.type) return false
    if (query.rarity !== 'all' && monster.baseRarity !== query.rarity) return false
    if (query.obtainedOnly && !query.collected.has(monster.id)) return false
    return true
  })
}

export function catalogProgress(collected: readonly string[], shown: readonly { id: string }[]): {
  collectedLabel: string
  selectionLabel: string
} {
  const have = new Set(collected)
  const owned = monsters.filter((monster) => have.has(monster.id)).length
  const shownOwned = shown.filter((monster) => have.has(monster.id)).length
  return {
    collectedLabel: `${owned}/${monsters.length} gesammelt`,
    selectionLabel: `${shownOwned}/${shown.length} in Auswahl`
  }
}
