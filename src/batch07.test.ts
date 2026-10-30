import { describe, expect, it } from 'vitest'
import { simulateBattle } from './battle'
import { monsters, species, typeColor, typeMult, typeName, typeUnlocks, typesCfg } from './data'
import { pickSpecies } from './gacha'
import { createSave, migrateSaveData } from './state'
import type { Rarity } from './types'

const BATCH = ['m86', 'm87', 'm88', 'm89', 'm90', 'm91', 'm92', 'm93', 'm94', 'm95'] as const
const STARTERS = ['fire', 'water', 'plant', 'earth', 'wind', 'ice', 'lightning', 'metal', 'fighting', 'beast', 'light', 'shadow', 'ghost', 'psychic', 'sound'] as const

describe('batch 07', () => {
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
    expect(species('m86')).toMatchObject({ name: 'Gedankenqualle', type: 'psychic', baseRarity: 0, role: 'back', class: 'disruptor', base: { hp: 121, atk: 26, def: 10, spd: 103 } })
    expect(species('m87')).toMatchObject({ name: 'Traumkatze', type: 'psychic', baseRarity: 1, role: 'back', class: 'support', base: { hp: 145, atk: 24, def: 16, spd: 98 } })
    expect(species('m88')).toMatchObject({ name: 'Augenmotte', type: 'psychic', baseRarity: 2, role: 'back', class: 'shooter', base: { hp: 125, atk: 31, def: 11, spd: 113 } })
    expect(species('m89')).toMatchObject({ name: 'Orakeleule', type: 'psychic', baseRarity: 4, role: 'back', class: 'support', base: { hp: 172, atk: 28, def: 19, spd: 105 } })
    expect(species('m90')).toMatchObject({ name: 'Astralsphinx', type: 'psychic', baseRarity: 7, role: 'back', class: 'disruptor', base: { hp: 210, atk: 41, def: 18, spd: 117 } })
    expect(species('m91')).toMatchObject({ name: 'Summhummel', type: 'sound', baseRarity: 0, role: 'back', class: 'support', base: { hp: 130, atk: 21, def: 14, spd: 96 } })
    expect(species('m92')).toMatchObject({ name: 'Echofledermaus', type: 'sound', baseRarity: 1, role: 'back', class: 'shooter', base: { hp: 112, atk: 26, def: 10, spd: 110 } })
    expect(species('m93')).toMatchObject({ name: 'Trommelfrosch', type: 'sound', baseRarity: 2, role: 'front', class: 'guardian', base: { hp: 205, atk: 22, def: 26, spd: 83 } })
    expect(species('m94')).toMatchObject({ name: 'Sirenenvogel', type: 'sound', baseRarity: 3, role: 'back', class: 'disruptor', base: { hp: 150, atk: 31, def: 13, spd: 110 } })
    expect(species('m95')).toMatchObject({ name: 'Resonanzhirsch', type: 'sound', baseRarity: 5, role: 'front', class: 'fighter', base: { hp: 205, atk: 34, def: 21, spd: 104 } })
    expect(species('m86').aussehen).toContain('Gehirn')
    expect(species('m89').aussehen).toContain('Tarotkarten')
    expect(species('m90').aussehen).toContain('Gedankenkrone')
    expect(species('m91').aussehen).toContain('Schallwellen')
    expect(species('m95').aussehen).toContain('Stimmgabeln')
    expect(species('m86').skill.name).toBe('Gedankenqualle-Fluch')
    expect(species('m92').skill.effects.some((effect) => effect.kind === 'status' && effect.status === 'stun')).toBe(true)
    expect(species('m93').skill.name).toBe('Trommelfrosch-Bollwerk')
    for (const id of ['m86', 'm87', 'm88', 'm89', 'm91', 'm92', 'm93', 'm94', 'm95']) {
      expect(species(id).passive).toBeUndefined()
    }
  })

  it('activates psychic and sound immediately and does not put them behind a stage', () => {
    expect(typesCfg.activeTypes).toEqual([...STARTERS])
    expect(typeUnlocks.activeTypesStart).toEqual([...STARTERS])
    const gated = typeUnlocks.typeUnlocks.map((row) => row.type)
    expect(gated).not.toContain('psychic')
    expect(gated).not.toContain('sound')
    expect(typeName('psychic')).toBe('Psycho')
    expect(typeName('sound')).toBe('Klang')
    expect(typeColor('psychic')).toBe('#f06292')
    expect(typeColor('sound')).toBe('#4dd0e1')
    expect(typesCfg.strongAgainst.psychic).toEqual(['fighting', 'poison'])
    expect(typesCfg.strongAgainst.sound).toEqual(['crystal', 'metal'])
    expect(typeMult('psychic', 'fighting')).toBe(1.5)
    expect(typeMult('psychic', 'poison')).toBe(1.5)
    expect(typeMult('sound', 'crystal')).toBe(1.5)
    expect(typeMult('sound', 'metal')).toBe(1.5)
    expect(typeMult('psychic', 'shadow')).toBe(0.75)
    expect(typeMult('psychic', 'ghost')).toBe(0.75)
    expect(typeMult('psychic', 'insect')).toBe(0.75)
    expect(typeMult('shadow', 'psychic')).toBe(1.5)
    expect(typeMult('ghost', 'psychic')).toBe(1.5)
    expect(typeMult('sound', 'ghost')).toBe(0.75)
    expect(typeMult('sound', 'dragon')).toBe(0.75)
    expect(typeMult('sound', 'beast')).toBe(0.75)
    expect(typeMult('ghost', 'sound')).toBe(1.5)
    expect(typeMult('beast', 'sound')).toBe(1.5)
    const save = createSave(1)
    expect(save.version).toBe(5)
    expect(save.activeTypes).toEqual([...STARTERS])
    save.version = 5
    save.activeTypes = ['fire', 'water', 'plant', 'earth', 'wind', 'ice', 'lightning', 'metal', 'fighting', 'beast', 'light', 'shadow', 'ghost']
    const migrated = migrateSaveData(save, 2)
    expect(migrated.version).toBe(5)
    expect(migrated.activeTypes).toEqual([...STARTERS])
    const again = migrateSaveData(migrated, 3)
    expect(again.activeTypes.filter((type) => type === 'psychic')).toEqual(['psychic'])
    expect(again.activeTypes.filter((type) => type === 'sound')).toEqual(['sound'])
  })

  it('reads the astral shield passive from trigger data, not from the shared name', () => {
    const passive = species('m90').passive
    expect(passive?.name).toBe('Letzter Wille')
    expect(passive?.id).toBe('astralsphinx_passive')
    expect(passive?.trigger).toEqual({ kind: 'hp_below', pct: 0.5 })
    const shieldPct = passive?.effects?.find((effect) => effect.kind === 'shield')
    expect(shieldPct && shieldPct.kind === 'shield' ? shieldPct.maxHpPctOfCaster : 0).toBe(0.18)
    const log = simulateBattle({
      seed: 4,
      allySynergy: false,
      enemySynergy: false,
      allies: [{ speciesId: 'm90', rarity: species('m90').baseRarity, level: 1, slot: 'H1', fixed: { hp: 300, atk: 1, def: 0, spd: 1 } }],
      enemies: [{ speciesId: 'm01', rarity: 0, level: 1, slot: 'H1', fixed: { hp: 8000, atk: 12, def: 0, spd: 80 } }]
    })
    expect(log.events.filter((event) => event.kind === 'passive' && event.passiveId === passive?.id).length).toBeGreaterThan(0)
    const gain = log.events.find((event) => event.kind === 'shield' && event.actor === 'A-H1')
    expect(gain && gain.kind === 'shield' ? gain.amount : 0).toBe(Math.floor(300 * 0.18))
  })
})
