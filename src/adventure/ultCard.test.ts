import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../rng'
import { fighterFromSpecies } from './arena'
import { fight1v1, type FightSide } from './battle'

function side(id: string, level: number): FightSide {
  const fighter = fighterFromSpecies(id, false, 0, 0, id)
  return {
    speciesId: fighter.speciesId,
    name: fighter.name,
    type: fighter.type,
    maxHp: fighter.maxHp,
    hp: fighter.maxHp,
    atk: fighter.atk,
    def: fighter.def,
    spd: fighter.spd,
    skill: fighter.skill,
    passive: fighter.passive,
    level
  }
}

describe('ult card', () => {
  it('shows the announcement for an ult hit, even before the effect canvas', () => {
    let found = false
    for (const seed of [4, 9, 15, 28, 41]) {
      const trace = fight1v1(side('m01', 30), side('m02', 20), mulberry32(seed), true)
      if (trace.frames.some((frame) => frame.hits?.some((hit) => hit.ult))) found = true
    }
    expect(found).toBe(true)
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8')
    const card = app.indexOf('if (hit?.ult) showUltCard(hit.ult, speed)')
    const fx = app.indexOf('if (hit && fxHost && allyActor && foeActor)')
    expect(card).toBeGreaterThan(0)
    expect(fx).toBeGreaterThan(card)
  })
})
