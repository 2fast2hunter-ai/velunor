import { describe, expect, it } from 'vitest'
import { simulateBattle } from './battle'
import { monsters, species, typeColor, typeMult, typeName, typeUnlocks, typesCfg } from './data'
import { pickSpecies } from './gacha'
import { createSave, migrateSaveData } from './state'
import type { Rarity } from './types'

const BATCH = ['m46', 'm47', 'm48', 'm49', 'm50', 'm51', 'm52', 'm53', 'm54', 'm55'] as const

describe('batch 03', () => {
  it('keeps every new species pullable by base rarity', () => {
    expect(monsters).toHaveLength(85)
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
    expect(species('m46')).toMatchObject({ name: 'Frostpinguin', type: 'ice', baseRarity: 0, class: 'guardian' })
    expect(species('m47')).toMatchObject({ name: 'Schneehase', type: 'ice', baseRarity: 0, class: 'shooter' })
    expect(species('m48')).toMatchObject({ name: 'Eiszapfenwolf', type: 'ice', baseRarity: 2, class: 'fighter' })
    expect(species('m49')).toMatchObject({ name: 'Gletscherbär', type: 'ice', baseRarity: 4, class: 'guardian' })
    expect(species('m50')).toMatchObject({ name: 'Winterkönigin', type: 'ice', baseRarity: 6, class: 'disruptor' })
    expect(species('m51')).toMatchObject({ name: 'Funkenigel', type: 'lightning', baseRarity: 0, class: 'shooter' })
    expect(species('m52')).toMatchObject({ name: 'Volthamster', type: 'lightning', baseRarity: 1, class: 'support' })
    expect(species('m53')).toMatchObject({ name: 'Donnerbock', type: 'lightning', baseRarity: 3, class: 'fighter' })
    expect(species('m54')).toMatchObject({ name: 'Gewitterraupe', type: 'lightning', baseRarity: 4, class: 'disruptor' })
    expect(species('m55')).toMatchObject({ name: 'Himmelsdonner', type: 'lightning', baseRarity: 7, class: 'shooter' })
    expect(species('m46').aussehen).toContain('Eiskristallen')
    expect(species('m50').aussehen).toContain('Frostkristallen')
    expect(species('m51').aussehen).toContain('Funken')
    expect(species('m55').aussehen).toContain('Gewitterwolken')
    expect(species('m46').passive).toBeUndefined()
  })

  it('activates ice and lightning immediately and does not put them behind a stage', () => {
    expect(typesCfg.activeTypes).toEqual(['fire', 'water', 'plant', 'earth', 'wind', 'ice', 'lightning', 'metal', 'fighting', 'beast', 'light', 'shadow', 'ghost'])
    expect(typeUnlocks.activeTypesStart).toEqual(['fire', 'water', 'plant', 'earth', 'wind', 'ice', 'lightning', 'metal', 'fighting', 'beast', 'light', 'shadow', 'ghost'])
    const gated = typeUnlocks.typeUnlocks.map((row) => row.type)
    expect(gated).not.toContain('ice')
    expect(gated).not.toContain('lightning')
    expect(typeName('ice')).toBe('Eis')
    expect(typeName('lightning')).toBe('Blitz')
    expect(typeColor('ice')).toBe('#b3e5fc')
    expect(typeColor('lightning')).toBe('#ffee58')
    expect(typeMult('ice', 'wind')).toBe(1.5)
    expect(typeMult('ice', 'fire')).toBe(0.75)
    expect(typeMult('lightning', 'water')).toBe(1.5)
    expect(typeMult('lightning', 'earth')).toBe(0.75)
    expect(typeMult('earth', 'lightning')).toBe(1.5)
    expect(typeMult('fire', 'ice')).toBe(1.5)
    const save = createSave(1)
    expect(save.version).toBe(5)
    expect(save.activeTypes).toEqual(['fire', 'water', 'plant', 'earth', 'wind', 'ice', 'lightning', 'metal', 'fighting', 'beast', 'light', 'shadow', 'ghost'])
    save.version = 5
    save.activeTypes = ['fire', 'water', 'plant', 'earth', 'wind']
    const migrated = migrateSaveData(save, 2)
    expect(migrated.version).toBe(5)
    expect(migrated.activeTypes).toEqual(['fire', 'water', 'plant', 'earth', 'wind', 'ice', 'lightning', 'metal', 'fighting', 'beast', 'light', 'shadow', 'ghost'])
    const again = migrateSaveData(migrated, 3)
    expect(again.activeTypes.filter((type) => type === 'ice')).toEqual(['ice'])
    expect(again.activeTypes.filter((type) => type === 'lightning')).toEqual(['lightning'])
  })

  it('reads shield passives from trigger data, not from the shared name', () => {
    for (const [id, pct] of [['m50', 0.15], ['m55', 0.18]] as const) {
      const passive = species(id).passive
      expect(passive?.name).toBe('Letzter Wille')
      expect(passive?.id).toBe(`${id === 'm50' ? 'winterkoenigin' : 'himmelsdonner'}_passive`)
      expect(passive?.trigger).toEqual({ kind: 'hp_below', pct: 0.5 })
      const shieldPct = passive?.effects?.find((effect) => effect.kind === 'shield')
      expect(shieldPct && shieldPct.kind === 'shield' ? shieldPct.maxHpPctOfCaster : 0).toBe(pct)
      const log = simulateBattle({
        seed: 4,
        allySynergy: false,
        enemySynergy: false,
        allies: [{ speciesId: id, rarity: species(id).baseRarity, level: 1, slot: 'H1', fixed: { hp: 300, atk: 1, def: 0, spd: 1 } }],
        enemies: [{ speciesId: 'm01', rarity: 0, level: 1, slot: 'H1', fixed: { hp: 8000, atk: 12, def: 0, spd: 80 } }]
      })
      const fired = log.events.filter((event) => event.kind === 'passive' && event.passiveId === passive?.id)
      expect(fired.length).toBeGreaterThan(0)
      const shield = log.events.find((event) => event.kind === 'shield' && event.actor === 'A-H1')
      expect(shield && shield.kind === 'shield' ? shield.amount : 0).toBe(Math.floor(300 * pct))
    }
  })
})
