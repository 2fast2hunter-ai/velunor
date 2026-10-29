import { describe, expect, it } from 'vitest'
import { simulateBattle } from './battle'
import { monsters, species, typeColor, typeMult, typeName, typeUnlocks, typesCfg } from './data'
import { pickSpecies } from './gacha'
import { createSave, migrateSaveData } from './state'
import type { Rarity } from './types'

const BATCH = ['m76', 'm77', 'm78', 'm79', 'm80', 'm81', 'm82', 'm83', 'm84', 'm85'] as const
const STARTERS = ['fire', 'water', 'plant', 'earth', 'wind', 'ice', 'lightning', 'metal', 'fighting', 'beast', 'light', 'shadow', 'ghost', 'psychic', 'sound'] as const

describe('batch 06', () => {
  it('keeps every new species pullable by base rarity', () => {
    expect(monsters).toHaveLength(95)
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
    expect(species('m76')).toMatchObject({ name: 'Schattenmaus', type: 'shadow', baseRarity: 0, class: 'disruptor', base: { hp: 121, atk: 26, def: 10, spd: 103 } })
    expect(species('m77')).toMatchObject({ name: 'Dämmerkatze', type: 'shadow', baseRarity: 1, class: 'shooter', base: { hp: 108, atk: 26, def: 10, spd: 110 } })
    expect(species('m78')).toMatchObject({ name: 'Nebelkrähe', type: 'shadow', baseRarity: 2, class: 'disruptor' })
    expect(species('m79')).toMatchObject({ name: 'Schattenpanther', type: 'shadow', baseRarity: 4, class: 'fighter' })
    expect(species('m80')).toMatchObject({ name: 'Finsterfürst', type: 'shadow', baseRarity: 8, class: 'disruptor', base: { hp: 222, atk: 47, def: 19, spd: 124 } })
    expect(species('m81')).toMatchObject({ name: 'Irrlicht', type: 'ghost', baseRarity: 0, class: 'shooter', base: { hp: 104, atk: 25, def: 10, spd: 108 } })
    expect(species('m82')).toMatchObject({ name: 'Laternengeist', type: 'ghost', baseRarity: 1, class: 'support' })
    expect(species('m83')).toMatchObject({ name: 'Spukrüstung', type: 'ghost', baseRarity: 2, class: 'guardian', base: { hp: 215, atk: 20, def: 27, spd: 83 } })
    expect(species('m84')).toMatchObject({ name: 'Seelenschleier', type: 'ghost', baseRarity: 3, class: 'disruptor', base: { hp: 145, atk: 30, def: 12, spd: 110 } })
    expect(species('m85')).toMatchObject({ name: 'Geisterkönig', type: 'ghost', baseRarity: 6, class: 'fighter' })
    expect(species('m76').aussehen).toContain('violetten Augen')
    expect(species('m77').aussehen).toContain('Abendhimmel')
    expect(species('m80').aussehen).toContain('verschluckten Lichts')
    expect(species('m85').aussehen).toContain('Grabkerzen')
    expect(species('m76').passive).toBeUndefined()
    expect(species('m79').passive).toBeUndefined()
    expect(species('m83').passive).toBeUndefined()
    expect(species('m84').passive).toBeUndefined()
  })

  it('activates shadow and ghost immediately and does not put them behind a stage', () => {
    expect(typesCfg.activeTypes).toEqual([...STARTERS])
    expect(typeUnlocks.activeTypesStart).toEqual([...STARTERS])
    const gated = typeUnlocks.typeUnlocks.map((row) => row.type)
    expect(gated).not.toContain('shadow')
    expect(gated).not.toContain('ghost')
    expect(typeName('shadow')).toBe('Schatten')
    expect(typeName('ghost')).toBe('Geist')
    expect(typeColor('shadow')).toBe('#5e35b1')
    expect(typeColor('ghost')).toBe('#ce93d8')
    expect(typesCfg.strongAgainst.shadow).toEqual(['psychic', 'ghost', 'light'])
    expect(typesCfg.strongAgainst.ghost).toEqual(['psychic', 'sound'])
    expect(typesCfg.strongAgainst.light).toEqual(['shadow', 'ghost', 'dragon'])
    expect(typesCfg.mutualStrong).toEqual([['light', 'shadow']])
    expect(typeMult('shadow', 'light')).toBe(1.5)
    expect(typeMult('shadow', 'ghost')).toBe(1.5)
    expect(typeMult('shadow', 'psychic')).toBe(1.5)
    expect(typeMult('light', 'shadow')).toBe(1.5)
    expect(typeMult('shadow', 'insect')).toBe(0.75)
    expect(typeMult('insect', 'shadow')).toBe(1.5)
    expect(typeMult('ghost', 'psychic')).toBe(1.5)
    expect(typeMult('ghost', 'sound')).toBe(1.5)
    expect(typeMult('ghost', 'light')).toBe(0.75)
    expect(typeMult('ghost', 'shadow')).toBe(0.75)
    expect(typeMult('light', 'ghost')).toBe(1.5)
    const save = createSave(1)
    expect(save.version).toBe(5)
    expect(save.activeTypes).toEqual([...STARTERS])
    save.version = 5
    save.activeTypes = ['fire', 'water', 'plant', 'earth', 'wind', 'ice', 'lightning', 'metal', 'fighting', 'beast', 'light']
    const migrated = migrateSaveData(save, 2)
    expect(migrated.version).toBe(5)
    expect(migrated.activeTypes).toEqual([...STARTERS])
    const again = migrateSaveData(migrated, 3)
    expect(again.activeTypes.filter((type) => type === 'shadow')).toEqual(['shadow'])
    expect(again.activeTypes.filter((type) => type === 'ghost')).toEqual(['ghost'])
  })

  it('reads the shadow and ghost shield passives from trigger data, not from the shared name', () => {
    const shadow = species('m80').passive
    expect(shadow?.name).toBe('Letzter Wille')
    expect(shadow?.id).toBe('finsterfuerst_passive')
    expect(shadow?.trigger).toEqual({ kind: 'hp_below', pct: 0.5 })
    const shadowShield = shadow?.effects?.find((effect) => effect.kind === 'shield')
    expect(shadowShield && shadowShield.kind === 'shield' ? shadowShield.maxHpPctOfCaster : 0).toBe(0.21)
    const ghost = species('m85').passive
    expect(ghost?.name).toBe('Letzter Wille')
    expect(ghost?.id).toBe('geisterkoenig_passive')
    expect(ghost?.trigger).toEqual({ kind: 'hp_below', pct: 0.5 })
    const ghostShield = ghost?.effects?.find((effect) => effect.kind === 'shield')
    expect(ghostShield && ghostShield.kind === 'shield' ? ghostShield.maxHpPctOfCaster : 0).toBe(0.15)
    const shadowLog = simulateBattle({
      seed: 4,
      allySynergy: false,
      enemySynergy: false,
      allies: [{ speciesId: 'm80', rarity: species('m80').baseRarity, level: 1, slot: 'H1', fixed: { hp: 300, atk: 1, def: 0, spd: 1 } }],
      enemies: [{ speciesId: 'm01', rarity: 0, level: 1, slot: 'H1', fixed: { hp: 8000, atk: 12, def: 0, spd: 80 } }]
    })
    expect(shadowLog.events.filter((event) => event.kind === 'passive' && event.passiveId === shadow?.id).length).toBeGreaterThan(0)
    const shadowGain = shadowLog.events.find((event) => event.kind === 'shield' && event.actor === 'A-H1')
    expect(shadowGain && shadowGain.kind === 'shield' ? shadowGain.amount : 0).toBe(Math.floor(300 * 0.21))
    const ghostLog = simulateBattle({
      seed: 4,
      allySynergy: false,
      enemySynergy: false,
      allies: [{ speciesId: 'm85', rarity: species('m85').baseRarity, level: 1, slot: 'F1', fixed: { hp: 300, atk: 1, def: 0, spd: 1 } }],
      enemies: [{ speciesId: 'm01', rarity: 0, level: 1, slot: 'H1', fixed: { hp: 8000, atk: 12, def: 0, spd: 80 } }]
    })
    expect(ghostLog.events.filter((event) => event.kind === 'passive' && event.passiveId === ghost?.id).length).toBeGreaterThan(0)
    const ghostGain = ghostLog.events.find((event) => event.kind === 'shield' && event.actor === 'A-F1')
    expect(ghostGain && ghostGain.kind === 'shield' ? ghostGain.amount : 0).toBe(Math.floor(300 * 0.15))
  })
})
