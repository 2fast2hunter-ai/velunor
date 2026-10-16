import { describe, expect, it } from 'vitest'
import { catalogProgress, catalogRarities, catalogTypeIds, filterCatalog } from './catalog'
import { monsters, species } from './data'

describe('catalog', () => {
  it('lists every active species in file order and grows with the data file', () => {
    const shown = filterCatalog({ type: 'all', rarity: 'all', obtainedOnly: false, collected: new Set() })
    expect(shown.map((monster) => monster.id)).toEqual(monsters.map((monster) => monster.id))
    expect(monsters).toHaveLength(45)
    expect(monsters.at(-1)?.id).toBe('m45')
    expect(catalogTypeIds()).toHaveLength(20)
    expect(catalogRarities()).toHaveLength(10)
  })

  it('combines type, rarity, and obtained filters', () => {
    const fireRare = filterCatalog({ type: 'fire', rarity: 1, obtainedOnly: false, collected: new Set() })
    expect(fireRare.length).toBeGreaterThan(0)
    expect(fireRare.every((monster) => monster.type === 'fire' && monster.baseRarity === 1)).toBe(true)
    expect(fireRare.map((monster) => monster.id)).toContain('m26')
    const locked = filterCatalog({
      type: 'fire',
      rarity: 1,
      obtainedOnly: true,
      collected: new Set(['m26'])
    })
    expect(locked.map((monster) => monster.id)).toEqual(['m26'])
    const wind = filterCatalog({ type: 'wind', rarity: 'all', obtainedOnly: false, collected: new Set() })
    expect(wind.map((monster) => monster.id)).toEqual(['m41', 'm42', 'm43', 'm44', 'm45'])
  })

  it('counts collected species against the active roster and the current selection', () => {
    const shown = filterCatalog({ type: 'insect', rarity: 'all', obtainedOnly: false, collected: new Set() })
    const progress = catalogProgress(['m01', 'm02', 'm03', 'm34', 'm99'], shown)
    expect(progress.collectedLabel).toBe('4/45 gesammelt')
    const insectOwned = shown.filter((monster) => monster.id === 'm34').length
    expect(progress.selectionLabel).toBe(`${insectOwned}/${shown.length} in Auswahl`)
    expect(species('m26').aussehen).toContain('Widder')
    expect(species('m33').aussehen).toContain('Schneeschleier')
    expect(species('m01').aussehen).toBeUndefined()
  })
})
