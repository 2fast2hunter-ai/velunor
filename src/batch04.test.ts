import { describe, expect, it } from 'vitest'
import { simulateBattle } from './battle'
import { monsters, species, typeColor, typeMult, typeName, typeUnlocks, typesCfg } from './data'
import { pickSpecies } from './gacha'
import { createSave, migrateSaveData } from './state'
import type { Rarity } from './types'

const BATCH = ['m56', 'm57', 'm58', 'm59', 'm60', 'm61', 'm62', 'm63', 'm64', 'm65'] as const
const STARTERS = ['fire', 'water', 'plant', 'earth', 'wind', 'ice', 'lightning', 'metal', 'fighting'] as const

describe('batch 04', () => {
  it('keeps every new species pullable by base rarity', () => {
    expect(monsters).toHaveLength(65)
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
    expect(species('m56')).toMatchObject({ name: 'Schraubkäfer', type: 'metal', baseRarity: 0, class: 'guardian' })
    expect(species('m57')).toMatchObject({ name: 'Zahnradkatze', type: 'metal', baseRarity: 1, class: 'shooter' })
    expect(species('m58')).toMatchObject({ name: 'Rüstungsechse', type: 'metal', baseRarity: 2, class: 'guardian' })
    expect(species('m59')).toMatchObject({ name: 'Klingenschwalbe', type: 'metal', baseRarity: 3, class: 'disruptor' })
    expect(species('m60')).toMatchObject({ name: 'Eisenkoloss', type: 'metal', baseRarity: 5, class: 'fighter' })
    expect(species('m61')).toMatchObject({ name: 'Raufkänguru', type: 'fighting', baseRarity: 0, class: 'fighter' })
    expect(species('m62')).toMatchObject({ name: 'Mönchsaffe', type: 'fighting', baseRarity: 1, class: 'support' })
    expect(species('m63')).toMatchObject({ name: 'Hiebkrabbe', type: 'fighting', baseRarity: 2, class: 'fighter' })
    expect(species('m64')).toMatchObject({ name: 'Ringerbär', type: 'fighting', baseRarity: 4, class: 'guardian' })
    expect(species('m65')).toMatchObject({ name: 'Großmeisterkranich', type: 'fighting', baseRarity: 6, class: 'shooter' })
    expect(species('m56').aussehen).toContain('Stahlschale')
    expect(species('m60').aussehen).toContain('Ofenbrust')
    expect(species('m61').aussehen).toContain('Boxhandschuhen')
    expect(species('m65').aussehen).toContain('Schriftrollen')
    expect(species('m56').passive).toBeUndefined()
    expect(species('m64').passive).toBeUndefined()
  })

  it('activates metal and fighting immediately and does not put them behind a stage', () => {
    expect(typesCfg.activeTypes).toEqual([...STARTERS])
    expect(typeUnlocks.activeTypesStart).toEqual([...STARTERS])
    const gated = typeUnlocks.typeUnlocks.map((row) => row.type)
    expect(gated).not.toContain('metal')
    expect(gated).not.toContain('fighting')
    expect(typeName('metal')).toBe('Metall')
    expect(typeName('fighting')).toBe('Kampf')
    expect(typeColor('metal')).toBe('#b0bec5')
    expect(typeColor('fighting')).toBe('#e53935')
    expect(typesCfg.strongAgainst.metal).toEqual(['ice', 'stone', 'crystal'])
    expect(typesCfg.strongAgainst.fighting).toEqual(['stone', 'metal', 'beast'])
    expect(typeMult('metal', 'ice')).toBe(1.5)
    expect(typeMult('metal', 'stone')).toBe(1.5)
    expect(typeMult('metal', 'crystal')).toBe(1.5)
    expect(typeMult('metal', 'lightning')).toBe(0.75)
    expect(typeMult('metal', 'fighting')).toBe(0.75)
    expect(typeMult('metal', 'sound')).toBe(0.75)
    expect(typeMult('fighting', 'stone')).toBe(1.5)
    expect(typeMult('fighting', 'metal')).toBe(1.5)
    expect(typeMult('fighting', 'beast')).toBe(1.5)
    expect(typeMult('fighting', 'wind')).toBe(0.75)
    expect(typeMult('fighting', 'psychic')).toBe(0.75)
    expect(typeMult('lightning', 'metal')).toBe(1.5)
    expect(typeMult('wind', 'fighting')).toBe(1.5)
    const save = createSave(1)
    expect(save.version).toBe(5)
    expect(save.activeTypes).toEqual([...STARTERS])
    save.version = 5
    save.activeTypes = ['fire', 'water', 'plant', 'earth', 'wind', 'ice', 'lightning']
    const migrated = migrateSaveData(save, 2)
    expect(migrated.version).toBe(5)
    expect(migrated.activeTypes).toEqual([...STARTERS])
    const again = migrateSaveData(migrated, 3)
    expect(again.activeTypes.filter((type) => type === 'metal')).toEqual(['metal'])
    expect(again.activeTypes.filter((type) => type === 'fighting')).toEqual(['fighting'])
  })

  it('reads the crane shield passive from trigger data, not from the shared name', () => {
    const passive = species('m65').passive
    expect(passive?.name).toBe('Letzter Wille')
    expect(passive?.id).toBe('grossmeisterkranich_passive')
    expect(passive?.trigger).toEqual({ kind: 'hp_below', pct: 0.5 })
    const shieldPct = passive?.effects?.find((effect) => effect.kind === 'shield')
    expect(shieldPct && shieldPct.kind === 'shield' ? shieldPct.maxHpPctOfCaster : 0).toBe(0.15)
    const log = simulateBattle({
      seed: 4,
      allySynergy: false,
      enemySynergy: false,
      allies: [{ speciesId: 'm65', rarity: species('m65').baseRarity, level: 1, slot: 'H1', fixed: { hp: 300, atk: 1, def: 0, spd: 1 } }],
      enemies: [{ speciesId: 'm01', rarity: 0, level: 1, slot: 'H1', fixed: { hp: 8000, atk: 12, def: 0, spd: 80 } }]
    })
    const fired = log.events.filter((event) => event.kind === 'passive' && event.passiveId === passive?.id)
    expect(fired.length).toBeGreaterThan(0)
    const shield = log.events.find((event) => event.kind === 'shield' && event.actor === 'A-H1')
    expect(shield && shield.kind === 'shield' ? shield.amount : 0).toBe(Math.floor(300 * 0.15))
  })
})
