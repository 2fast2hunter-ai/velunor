import { describe, expect, it } from 'vitest'
import { monsters, species, typeUnlocks, typesCfg } from './data'
import { pickSpecies } from './gacha'
import { createSave, migrateSaveData } from './state'
import type { Rarity } from './types'

const BATCH = ['m36', 'm37', 'm38', 'm39', 'm40', 'm41', 'm42', 'm43', 'm44', 'm45'] as const

describe('batch 02', () => {
  it('keeps every new species pullable, including cosmic and wind', () => {
    expect(monsters).toHaveLength(100)
    const seen = new Set<string>()
    for (const rarity of [0, 1, 2, 3, 4, 5, 6, 7, 8] as Rarity[]) {
      const pool = monsters.filter((monster) => monster.baseRarity === rarity)
      expect(pool.length).toBeGreaterThan(0)
      for (let i = 0; i < pool.length; i++) {
        const picked = pickSpecies(rarity, () => i / pool.length + 1e-9)
        expect(picked).toEqual({ speciesId: pool[i].id, upgraded: false })
        seen.add(picked.speciesId)
      }
    }
    for (const id of BATCH) expect(seen.has(id)).toBe(true)
    expect(species('m36')).toMatchObject({ name: 'Schlammkröte', type: 'poison', baseRarity: 1, class: 'guardian' })
    expect(species('m37')).toMatchObject({ name: 'Nachtschattenhydra', type: 'poison', baseRarity: 5 })
    expect(species('m38')).toMatchObject({ name: 'Kieselgolem', type: 'stone', baseRarity: 3, class: 'guardian' })
    expect(species('m39')).toMatchObject({ name: 'Monolithwächter', type: 'stone', baseRarity: 6 })
    expect(species('m40')).toMatchObject({ name: 'Prismadrache', type: 'crystal', baseRarity: 8 })
    expect(species('m41').aussehen).toContain('Segelohren')
    expect(species('m45').aussehen).toContain('Auge des Sturms')
    expect([...seen].map((id) => species(id).type)).toContain('wind')
  })

  it('activates wind immediately and does not put it behind a stage', () => {
    expect(typesCfg.activeTypes).toContain('wind')
    expect(typeUnlocks.activeTypesStart).toContain('wind')
    expect(typeUnlocks.typeUnlocks.map((row) => row.type)).not.toContain('wind')
    const save = createSave(1)
    expect(save.activeTypes).toEqual(['fire', 'water', 'plant', 'earth', 'wind', 'ice', 'lightning', 'metal', 'fighting', 'beast', 'light', 'shadow', 'ghost', 'psychic', 'sound', 'dragon'])
    save.version = 5
    save.activeTypes = ['fire', 'water', 'plant', 'earth', 'insect']
    const migrated = migrateSaveData(save, 2)
    expect(migrated.activeTypes).toEqual(['fire', 'water', 'plant', 'earth', 'insect', 'wind', 'ice', 'lightning', 'metal', 'fighting', 'beast', 'light', 'shadow', 'ghost', 'psychic', 'sound', 'dragon'])
    const again = migrateSaveData(migrated, 3)
    expect(again.activeTypes.filter((type) => type === 'wind')).toEqual(['wind'])
  })
})
