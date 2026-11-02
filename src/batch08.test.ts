import { describe, expect, it } from 'vitest'
import { simulateBattle } from './battle'
import { monsters, species, typeColor, typeMult, typeName, typeUnlocks, typesCfg } from './data'
import { pickSpecies } from './gacha'
import { createSave, migrateSaveData } from './state'
import type { Rarity } from './types'

const BATCH = ['m96', 'm97', 'm98', 'm99', 'm100'] as const
const STARTERS = ['fire', 'water', 'plant', 'earth', 'wind', 'ice', 'lightning', 'metal', 'fighting', 'beast', 'light', 'shadow', 'ghost', 'psychic', 'sound', 'dragon'] as const

describe('batch 08', () => {
  it('keeps every new species pullable by base rarity', () => {
    expect(monsters).toHaveLength(100)
    const seen = new Set<string>()
    for (const rarity of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as Rarity[]) {
      const pool = monsters.filter((monster) => monster.baseRarity === rarity)
      expect(pool.length).toBeGreaterThan(0)
      for (let i = 0; i < pool.length; i++) {
        const picked = pickSpecies(rarity, () => i / pool.length + 1e-9)
        expect(picked).toEqual({ speciesId: pool[i].id, upgraded: false })
        seen.add(picked.speciesId)
      }
    }
    for (const id of BATCH) expect(seen.has(id)).toBe(true)
    expect(species('m96')).toMatchObject({ name: 'Drachenwelpe', type: 'dragon', baseRarity: 1, role: 'front', class: 'fighter', base: { hp: 147, atk: 23, def: 14, spd: 94 } })
    expect(species('m97')).toMatchObject({ name: 'Schuppenwyrm', type: 'dragon', baseRarity: 2, role: 'back', class: 'shooter', base: { hp: 125, atk: 31, def: 11, spd: 112 } })
    expect(species('m98')).toMatchObject({ name: 'Wolkendrache', type: 'dragon', baseRarity: 3, role: 'back', class: 'support', base: { hp: 160, atk: 26, def: 18, spd: 102 } })
    expect(species('m99')).toMatchObject({ name: 'Hornlindwurm', type: 'dragon', baseRarity: 4, role: 'front', class: 'guardian', base: { hp: 230, atk: 22, def: 29, spd: 87 } })
    expect(species('m100')).toMatchObject({ name: 'Urdrache Velunor', type: 'dragon', baseRarity: 9, role: 'front', class: 'fighter', base: { hp: 260, atk: 42, def: 25, spd: 110 } })
    expect(species('m96').aussehen).toContain('Stummelflügeln')
    expect(species('m97').aussehen).toContain('Bronzeschuppen')
    expect(species('m98').aussehen).toContain('Wolkenbart')
    expect(species('m99').aussehen).toContain('Hornkrone')
    expect(species('m100').aussehen).toContain('Sternbilder')
    expect(species('m96').skill.name).toBe('Drachenwelpe-Ansturm')
    expect(species('m97').skill.effects.some((effect) => effect.kind === 'status' && effect.status === 'burn' && effect.chance === 0.36)).toBe(true)
    expect(species('m99').skill.name).toBe('Hornlindwurm-Bollwerk')
    const burn = species('m100').skill.effects.find((effect) => effect.kind === 'status' && effect.status === 'burn')
    expect(burn && burn.kind === 'status' ? burn.chance : 0).toBe(0.57)
    for (const id of ['m96', 'm97', 'm98', 'm99']) {
      expect(species(id).passive).toBeUndefined()
    }
  })

  it('activates dragon immediately and does not put it behind a stage', () => {
    expect(typesCfg.activeTypes).toEqual([...STARTERS])
    expect(typeUnlocks.activeTypesStart).toEqual([...STARTERS])
    const gated = typeUnlocks.typeUnlocks.map((row) => row.type)
    expect(gated).not.toContain('dragon')
    expect(typeName('dragon')).toBe('Drache')
    expect(typeColor('dragon')).toBe('#ef5350')
    expect(typesCfg.strongAgainst.dragon).toEqual(['dragon', 'sound'])
    expect(typeMult('dragon', 'dragon')).toBe(1.5)
    expect(typeMult('dragon', 'sound')).toBe(1.5)
    expect(typeMult('dragon', 'ice')).toBe(0.75)
    expect(typeMult('dragon', 'light')).toBe(0.75)
    expect(typeMult('ice', 'dragon')).toBe(1.5)
    expect(typeMult('light', 'dragon')).toBe(1.5)
    expect(typeMult('sound', 'dragon')).toBe(0.75)
    const save = createSave(1)
    expect(save.version).toBe(5)
    expect(save.activeTypes).toEqual([...STARTERS])
    save.version = 5
    save.activeTypes = ['fire', 'water', 'plant', 'earth', 'wind', 'ice', 'lightning', 'metal', 'fighting', 'beast', 'light', 'shadow', 'ghost', 'psychic', 'sound']
    const migrated = migrateSaveData(save, 2)
    expect(migrated.version).toBe(5)
    expect(migrated.activeTypes).toEqual([...STARTERS])
    const again = migrateSaveData(migrated, 3)
    expect(again.activeTypes.filter((type) => type === 'dragon')).toEqual(['dragon'])
  })

  it('reads the origin shield passive from trigger data, not from the shared name', () => {
    const passive = species('m100').passive
    expect(passive?.name).toBe('Letzter Wille')
    expect(passive?.id).toBe('urdrache_velunor_passive')
    expect(passive?.id).not.toBe(species('m90').passive?.id)
    expect(passive?.trigger).toEqual({ kind: 'hp_below', pct: 0.5 })
    const shieldPct = passive?.effects?.find((effect) => effect.kind === 'shield')
    expect(shieldPct && shieldPct.kind === 'shield' ? shieldPct.maxHpPctOfCaster : 0).toBe(0.24)
    const log = simulateBattle({
      seed: 4,
      allySynergy: false,
      enemySynergy: false,
      allies: [{ speciesId: 'm100', rarity: species('m100').baseRarity, level: 1, slot: 'F1', fixed: { hp: 300, atk: 1, def: 0, spd: 1 } }],
      enemies: [{ speciesId: 'm01', rarity: 0, level: 1, slot: 'H1', fixed: { hp: 8000, atk: 12, def: 0, spd: 80 } }]
    })
    expect(log.events.filter((event) => event.kind === 'passive' && event.passiveId === passive?.id).length).toBeGreaterThan(0)
    const gain = log.events.find((event) => event.kind === 'shield' && event.actor === 'A-F1')
    expect(gain && gain.kind === 'shield' ? gain.amount : 0).toBe(Math.floor(300 * 0.24))
  })
})
