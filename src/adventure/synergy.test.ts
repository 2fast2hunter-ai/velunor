import { describe, expect, it } from 'vitest'
import type { SkillDef } from '../types'
import { fight1v1, type FightSide } from './battle'
import { arenaMatch, fighterFromSpecies, bakeTeam } from './arena'
import { SAVE_VERSION } from './const'
import { beginAdventure, loadAdventure, writeSave } from './save'
import type { StorageLike } from './types'
import { gameHtml, type CodexQuery, type PcQuery } from './view'
import {
  PURITY_FOUR,
  PURITY_THREE,
  SYNERGIES,
  SYNERGY_CAP,
  activeSynergies,
  presentSynergies,
  purityOf,
  scaleSide,
  synergyMods
} from './synergy'
import { SYNERGY_IDS } from './synergyIds'

const dex: CodexQuery = { q: '', type: '', rarity: '', shiny: '' }
const pc: PcQuery = { q: '', type: '', rarity: '', shiny: '', sort: 'newest', dir: -1 }

const skill: SkillDef = {
  id: 'schlag',
  name: 'Schlag',
  cooldown: 4,
  initialCooldown: 1,
  target: 'default',
  effects: [{ kind: 'damage', atkMult: 1.2 }]
}

function memory(): StorageLike {
  const box = new Map<string, string>()
  return {
    getItem: (key) => box.get(key) ?? null,
    setItem: (key, value) => { box.set(key, value) },
    removeItem: (key) => { box.delete(key) }
  }
}

function fighter(atk: number, spd: number): FightSide {
  return {
    speciesId: 'm01',
    name: 'Funke',
    type: 'fire',
    maxHp: 900,
    hp: 900,
    atk,
    def: 30,
    spd,
    skill,
    passive: null,
    level: 10
  }
}

describe('type synergies', () => {
  it('keeps twelve pairs, two active, and the strongest by default', () => {
    expect(SYNERGIES).toHaveLength(12)
    expect(SYNERGIES.map((row) => row.id)).toEqual([...SYNERGY_IDS])
    expect(new Set(SYNERGIES.map((row) => row.types.join('+'))).size).toBe(12)
    const types = ['water', 'lightning', 'fire', 'wind', 'plant', 'earth'] as const
    expect(presentSynergies(types).map((row) => row.id)).toEqual(['gewitter', 'flaechenbrand', 'wurzelgrund'])
    const chosen = activeSynergies(types)
    expect(chosen).toHaveLength(SYNERGY_CAP)
    expect(chosen.map((row) => row.id)).toEqual(['wurzelgrund', 'flaechenbrand'])
    expect(activeSynergies(types, ['flaechenbrand', 'gewitter', 'wurzelgrund']).map((row) => row.id)).toEqual(['flaechenbrand', 'gewitter'])
    expect(activeSynergies(types, [])).toEqual([])
    expect(activeSynergies(['fire'], ['flaechenbrand'])).toEqual([])
  })

  it('maps the table onto the existing types, with Sturmlied as speed', () => {
    const byId = new Map(SYNERGIES.map((row) => [row.id, row]))
    expect(byId.get('gewitter')?.bonus).toMatchObject({ crit: 0.3, atk: 0.02 })
    expect(byId.get('flaechenbrand')?.bonus.atk).toBe(0.04)
    expect(byId.get('wurzelgrund')?.bonus.hp).toBe(0.05)
    expect(byId.get('polarstrom')?.bonus.foeSpd).toBe(0.96)
    expect(byId.get('bollwerk')?.bonus.def).toBe(0.06)
    expect(byId.get('prisma')?.bonus).toMatchObject({ atk: 0.03, crit: 0.1 })
    expect(byId.get('zwielicht')?.bonus.dodge).toBe(0.04)
    expect(byId.get('rudelkraft')?.bonus.wardenAtk).toBe(0.06)
    expect(byId.get('schwarmgift')?.bonus.status).toBe(1.15)
    expect(byId.get('resonanz')?.bonus.cooldown).toBe(0.92)
    expect(byId.get('glutschwinge')?.bonus).toMatchObject({ atk: 0.02, hp: 0.03 })
    expect(byId.get('sturmlied')?.bonus.spd).toBe(0.04)
    expect(byId.get('flaechenbrand')?.power).toBeGreaterThan(byId.get('gewitter')?.power ?? 0)
    expect(byId.get('sturmlied')?.bonus).not.toHaveProperty('crit')
    const wild = synergyMods(activeSynergies(['fighting', 'beast']), false)
    const warden = synergyMods(activeSynergies(['fighting', 'beast']), true)
    expect(wild.wardenAtk).toBe(0)
    expect(wild.atk).toBe(0)
    expect(warden.wardenAtk).toBe(0.06)
    expect(synergyMods(activeSynergies(['water', 'lightning']), false).critAdd).toBeCloseTo(0.03)
    const stacked = synergyMods(activeSynergies(['fire', 'wind', 'light', 'crystal']), false)
    expect(stacked.atk).toBeCloseTo(0.06)
  })

  it('gives three of a type 3% and four of a type 5%', () => {
    const three = ['fire', 'fire', 'fire', 'water', 'wind', 'plant'] as const
    const four = ['fire', 'fire', 'fire', 'fire', 'water', 'wind'] as const
    expect(purityOf(three, 'fire')).toBe(PURITY_THREE)
    expect(purityOf(four, 'fire')).toBe(PURITY_FOUR)
    expect(purityOf(['fire', 'fire', 'water'], 'fire')).toBe(0)
    expect(purityOf(['fire', 'fire', 'fire', 'fire', 'fire', 'fire'], 'fire')).toBe(PURITY_FOUR)
    const plain = fighter(100, 100)
    const typed = scaleSide(plain, synergyMods([], false), PURITY_THREE)
    expect(typed.atk).toBe(103)
    expect(typed.maxHp).toBe(927)
  })

  it('slows the foe, dodges, and shortens a cooldown only when the mod is on', () => {
    const ally = fighter(80, 96)
    ally.maxHp = 80
    ally.hp = 80
    const foe = fighter(80, 100)
    foe.name = 'Frost'
    foe.maxHp = 80
    foe.hp = 80
    expect(fight1v1(ally, foe, () => 0.4, false).win).toBe(false)
    expect(fight1v1({ ...ally }, { ...foe }, () => 0.4, false, null, { foeSpd: 0.95 }).win).toBe(true)
    const sturdy = fighter(20, 10)
    sturdy.maxHp = 400
    sturdy.hp = 400
    const bully = fighter(80, 200)
    bully.name = 'Wucht'
    expect(fight1v1(sturdy, bully, () => 0, false).win).toBe(false)
    expect(fight1v1({ ...sturdy }, { ...bully }, () => 0, false, null, { dodge: 1 }).win).toBe(true)
    const cooled = fighter(40, 50)
    cooled.skill = { ...skill, cooldown: 10, initialCooldown: 0 }
    const trace = fight1v1(cooled, fighter(10, 1), () => 0.99, true, null, { cooldown: 0.9 })
    expect(trace.frames.some((frame) => frame.text.includes('Schlag'))).toBe(true)
  })

  it('keeps an old save and stores at most two known ids', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    expect(save.synergy).toBeUndefined()
    expect(save.saveVersion).toBe(SAVE_VERSION)
    const box = memory()
    writeSave(box, save)
    expect(loadAdventure(box, 1_000)?.synergy).toBeUndefined()
    save.synergy = ['sturmlied', 'nope', 'sturmlied', 'gewitter', 'prisma']
    writeSave(box, save)
    expect(loadAdventure(box, 1_000)?.synergy).toEqual(['sturmlied', 'gewitter'])
    save.synergy = []
    writeSave(box, save)
    expect(loadAdventure(box, 1_000)?.synergy).toEqual([])
  })

  it('draws twelve original symbols on the team screen', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    const html = gameHtml(save, 'team', 1_000, pc, dex, null, false, false, null)
    for (const row of SYNERGIES) expect(html).toContain(`data-art="synergy/${row.id}"`)
    expect(html).toContain('data-art="synergy/board"')
    expect(html).toContain('data-act="synergy-auto"')
    expect(html).not.toContain('combo_synergy')
    expect(html).toContain('+4 % Tempo')
  })

  it('changes an arena replay when the team actually has the pair', () => {
    const ids = ['m01', 'm41', 'm05', 'm02', 'm03', 'm06']
    const fighters = ids.map((id, index) => fighterFromSpecies(id, false, 0, 0, `s${index}`))
    const on = bakeTeam(fighters, null)
    const off = { ...on, synergy: [] as string[] }
    const foe = bakeTeam(ids.map((id, index) => fighterFromSpecies(id, false, 0, 0, `f${index}`)), null)
    foe.synergy = []
    let onWins = 0
    let offWins = 0
    for (let seed = 1; seed <= 40; seed++) {
      if (arenaMatch(on, foe, seed).win) onWins += 1
      if (arenaMatch(off, foe, seed).win) offWins += 1
    }
    expect(onWins).toBeGreaterThan(offWins)
    expect(arenaMatch(on, foe, 7)).toEqual(arenaMatch(on, foe, 7))
  })
})
