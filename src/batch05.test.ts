import { describe, expect, it } from 'vitest'
import { simulateBattle } from './battle'
import { monsters, species, typeColor, typeMult, typeName, typeUnlocks, typesCfg } from './data'
import { pickSpecies } from './gacha'
import { createSave, migrateSaveData } from './state'
import type { Rarity } from './types'

const BATCH = ['m66', 'm67', 'm68', 'm69', 'm70', 'm71', 'm72', 'm73', 'm74', 'm75'] as const
const STARTERS = ['fire', 'water', 'plant', 'earth', 'wind', 'ice', 'lightning', 'metal', 'fighting', 'beast', 'light'] as const

describe('batch 05', () => {
  it('keeps every new species pullable by base rarity', () => {
    expect(monsters).toHaveLength(75)
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
    expect(species('m66')).toMatchObject({ name: 'Wühlmaus', type: 'beast', baseRarity: 0, class: 'fighter' })
    expect(species('m67')).toMatchObject({ name: 'Borstenferkel', type: 'beast', baseRarity: 0, class: 'guardian' })
    expect(species('m68')).toMatchObject({ name: 'Steppenluchs', type: 'beast', baseRarity: 1, class: 'shooter' })
    expect(species('m69')).toMatchObject({ name: 'Hornbüffel', type: 'beast', baseRarity: 2, class: 'guardian' })
    expect(species('m70')).toMatchObject({ name: 'Rudelwolf', type: 'beast', baseRarity: 3, class: 'disruptor' })
    expect(species('m71')).toMatchObject({ name: 'Lichtglühwurm', type: 'light', baseRarity: 0, class: 'support' })
    expect(species('m72')).toMatchObject({ name: 'Sonnenküken', type: 'light', baseRarity: 1, class: 'shooter' })
    expect(species('m73')).toMatchObject({ name: 'Heiligenreh', type: 'light', baseRarity: 3, class: 'support' })
    expect(species('m74')).toMatchObject({ name: 'Glanzlöwe', type: 'light', baseRarity: 5, class: 'fighter' })
    expect(species('m75')).toMatchObject({ name: 'Seraphhirsch', type: 'light', baseRarity: 7, class: 'guardian' })
    expect(species('m66').aussehen).toContain('Grabklauen')
    expect(species('m70').aussehen).toContain('Rudel-Rune')
    expect(species('m71').aussehen).toContain('Lichtpunkten')
    expect(species('m75').aussehen).toContain('Lichtflügeln')
    expect(species('m66').passive).toBeUndefined()
    expect(species('m74').passive).toBeUndefined()
  })

  it('activates beast and light immediately and does not put light behind a stage', () => {
    expect(typesCfg.activeTypes).toEqual([...STARTERS])
    expect(typeUnlocks.activeTypesStart).toEqual([...STARTERS])
    const gated = typeUnlocks.typeUnlocks.map((row) => row.type)
    expect(gated).not.toContain('beast')
    expect(gated).not.toContain('light')
    expect(typeName('beast')).toBe('Bestie')
    expect(typeName('light')).toBe('Licht')
    expect(typeColor('beast')).toBe('#ff8a65')
    expect(typeColor('light')).toBe('#fff8e1')
    expect(typesCfg.strongAgainst.beast).toEqual(['insect', 'sound'])
    expect(typesCfg.strongAgainst.light).toEqual(['shadow', 'ghost', 'dragon'])
    expect(typeMult('beast', 'insect')).toBe(1.5)
    expect(typeMult('beast', 'sound')).toBe(1.5)
    expect(typeMult('beast', 'ice')).toBe(0.75)
    expect(typeMult('beast', 'poison')).toBe(0.75)
    expect(typeMult('beast', 'fighting')).toBe(0.75)
    expect(typeMult('ice', 'beast')).toBe(1.5)
    expect(typeMult('fighting', 'beast')).toBe(1.5)
    expect(typeMult('light', 'shadow')).toBe(1.5)
    expect(typeMult('light', 'ghost')).toBe(1.5)
    expect(typeMult('light', 'dragon')).toBe(1.5)
    expect(typeMult('shadow', 'light')).toBe(1.5)
    expect(typeMult('light', 'plant')).toBe(0.75)
    expect(typeMult('light', 'crystal')).toBe(0.75)
    expect(typeMult('plant', 'light')).toBe(1.5)
    expect(typeMult('crystal', 'light')).toBe(1.5)
    const save = createSave(1)
    expect(save.version).toBe(5)
    expect(save.activeTypes).toEqual([...STARTERS])
    save.version = 5
    save.activeTypes = ['fire', 'water', 'plant', 'earth', 'wind', 'ice', 'lightning', 'metal', 'fighting']
    const migrated = migrateSaveData(save, 2)
    expect(migrated.version).toBe(5)
    expect(migrated.activeTypes).toEqual([...STARTERS])
    const again = migrateSaveData(migrated, 3)
    expect(again.activeTypes.filter((type) => type === 'beast')).toEqual(['beast'])
    expect(again.activeTypes.filter((type) => type === 'light')).toEqual(['light'])
  })

  it('reads the seraph shield passive from trigger data, not from the shared name', () => {
    const passive = species('m75').passive
    expect(passive?.name).toBe('Letzter Wille')
    expect(passive?.id).toBe('seraphhirsch_passive')
    expect(passive?.trigger).toEqual({ kind: 'hp_below', pct: 0.5 })
    const shieldPct = passive?.effects?.find((effect) => effect.kind === 'shield')
    expect(shieldPct && shieldPct.kind === 'shield' ? shieldPct.maxHpPctOfCaster : 0).toBe(0.18)
    const log = simulateBattle({
      seed: 4,
      allySynergy: false,
      enemySynergy: false,
      allies: [{ speciesId: 'm75', rarity: species('m75').baseRarity, level: 1, slot: 'F1', fixed: { hp: 300, atk: 1, def: 0, spd: 1 } }],
      enemies: [{ speciesId: 'm01', rarity: 0, level: 1, slot: 'H1', fixed: { hp: 8000, atk: 12, def: 0, spd: 80 } }]
    })
    const fired = log.events.filter((event) => event.kind === 'passive' && event.passiveId === passive?.id)
    expect(fired.length).toBeGreaterThan(0)
    const shield = log.events.find((event) => event.kind === 'shield' && event.actor === 'A-F1')
    expect(shield && shield.kind === 'shield' ? shield.amount : 0).toBe(Math.floor(300 * 0.18))
  })
})
