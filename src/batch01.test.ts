import { describe, expect, it } from 'vitest'
import { simulateBattle } from './battle'
import { monsters, species } from './data'
import { pickSpecies } from './gacha'
import { commitFightRewards, createSave, migrateSaveData, pull, releaseMonster } from './state'
import type { Rarity } from './types'

describe('batch 01 gacha', () => {
  it('can roll every active species, including later types and the new rarities', () => {
    const seen = new Set<string>()
    for (const rarity of [0, 1, 2, 3, 4, 5, 6, 7] as Rarity[]) {
      const pool = monsters.filter((monster) => monster.baseRarity === rarity)
      expect(pool.length).toBeGreaterThan(0)
      for (let i = 0; i < pool.length; i++) {
        const picked = pickSpecies(rarity, () => i / pool.length + 1e-9)
        expect(picked.upgraded).toBe(false)
        expect(picked.speciesId).toBe(pool[i].id)
        seen.add(picked.speciesId)
      }
    }
    for (const id of ['m26', 'm27', 'm28', 'm29', 'm30', 'm31', 'm32', 'm33', 'm34', 'm35']) {
      expect(seen.has(id)).toBe(true)
    }
    const types = new Set([...seen].map((id) => species(id).type))
    const expected = ['fire', 'water', 'plant', 'earth', 'insect', 'poison', 'stone', 'crystal'] as const
    for (const type of expected) expect(types.has(type)).toBe(true)
    const cosmic = pickSpecies(8, () => 0)
    const cosmicLast = pickSpecies(8, () => 0.99)
    const origin = pickSpecies(9, () => 0.99)
    expect(cosmic).toEqual({ speciesId: 'm40', upgraded: false })
    expect(cosmicLast).toEqual({ speciesId: 'm80', upgraded: false })
    expect(origin).toEqual({ speciesId: 'm100', upgraded: false })
  })

  it('adds a pull to the collection immediately', () => {
    const save = createSave(5_000)
    save.campaign.cleared['1-2'] = 3
    save.currencies.gems = 100
    const result = pull(save, 'single', 'gems', 5_000)
    expect(result.ok).toBe(true)
    expect(save.collection).toContain(result.value?.[0].speciesId)
  })
})

describe('collection save', () => {
  it('starts at version 5 with the starters collected', () => {
    const save = createSave(1)
    expect(save.version).toBe(5)
    expect(save.collection).toEqual(['m01', 'm02', 'm03'])
  })

  it('fills collection from monsters already owned', () => {
    const save = createSave(1)
    save.version = 4
    save.monsters.push({ ...save.monsters[0], uid: 'ram', speciesId: 'm26' })
    delete (save as Partial<typeof save>).collection
    const migrated = migrateSaveData(save, 2)
    expect(migrated.version).toBe(5)
    expect(migrated.collection).toEqual(['m01', 'm02', 'm03', 'm26'])
  })

  it('keeps a species collected after it is released', () => {
    const save = createSave(1)
    save.buildings.townhall.level = 3
    const fox = save.monsters[0]
    fox.locked = false
    expect(releaseMonster(save, fox.uid).ok).toBe(true)
    expect(save.monsters.some((monster) => monster.speciesId === 'm01')).toBe(false)
    expect(save.collection).toContain('m01')
    const again = migrateSaveData(save, 3)
    expect(again.collection).toContain('m01')
  })

  it('keeps ids that are no longer in the stable and records a stage gift', () => {
    const save = createSave(1)
    save.collection = ['m01', 'm02', 'm03', 'm35']
    save.version = 5
    const migrated = migrateSaveData(save, 2)
    expect(migrated.collection).toContain('m35')
    commitFightRewards(save, {
      stageId: '2-1',
      logs: [],
      rewards: { gold: 0, gems: 0, exp: 0, essence: 0, tickets: 0, levels: 0 },
      victory: true,
      tip: '',
      stars: 1,
      applied: false
    })
    expect(save.collection).toContain('m11')
    expect(save.monsters.some((monster) => monster.speciesId === 'm11')).toBe(true)
  })
})

describe('innate passives', () => {
  it('reads the shield passive from trigger data, not from its id', () => {
    const passive = species('m27').passive
    expect(passive?.id).toBe('aschenkoenig_passive')
    expect(passive?.trigger).toEqual({ kind: 'hp_below', pct: 0.5 })
    const shieldPct = passive?.effects?.find((effect) => effect.kind === 'shield')
    expect(shieldPct && shieldPct.kind === 'shield' ? shieldPct.maxHpPctOfCaster : 0).toBe(0.15)
    const log = simulateBattle({
      seed: 4,
      allySynergy: false,
      enemySynergy: false,
      allies: [{ speciesId: 'm27', rarity: 6, level: 1, slot: 'H1', fixed: { hp: 300, atk: 1, def: 0, spd: 1 } }],
      enemies: [{ speciesId: 'm01', rarity: 0, level: 1, slot: 'H1', fixed: { hp: 8000, atk: 12, def: 0, spd: 80 } }]
    })
    const fired = log.events.filter((event) => event.kind === 'passive' && event.passiveId === 'aschenkoenig_passive')
    expect(fired.length).toBeGreaterThan(0)
    const shield = log.events.find((event) => event.kind === 'shield' && event.actor === 'A-H1')
    expect(shield && shield.kind === 'shield' ? shield.amount : 0).toBe(Math.floor(300 * 0.15))
  })
})
