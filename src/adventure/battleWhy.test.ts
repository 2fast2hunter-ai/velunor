import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../rng'
import { ARENA_LEVEL, fighterFromSpecies } from './arena'
import { fight1v1, type FightSide } from './battle'
import { tipIsSafe, whyAutoMs, whyBattle, whyIconFile } from './battleWhy'

const SEEDS = [3, 5, 8, 13, 21, 34, 55, 89, 144, 233]

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

describe('why summary', () => {
  it('matches the trace on 10 fixed seeds and never sells anything', () => {
    expect(SEEDS).toHaveLength(10)
    expect(whyAutoMs(true, true)).toBe(4000)
    expect(whyAutoMs(false, true)).toBe(0)
    expect(whyAutoMs(true, false)).toBe(0)
    expect(whyIconFile('typ')).toBe('battle_ui/summary/grund_typ.png')
    let losses = 0
    for (const seed of SEEDS) {
      const trace = fight1v1(side('m01', ARENA_LEVEL), side(seed % 2 ? 'm05' : 'm02', ARENA_LEVEL), mulberry32(seed), true)
      const card = whyBattle([trace], { win: trace.win, gold: 40, exp: 12 }, 'de')
      const allyHits = trace.frames.flatMap((frame) => frame.hits ?? []).filter((hit) => hit.from === 'ally' && hit.kind === 'hit')
      const strong = allyHits.filter((hit) => hit.band === 'strong').length
      const weak = allyHits.filter((hit) => hit.band === 'weak').length
      const strongPct = allyHits.length ? Math.round((strong / allyHits.length) * 100) : 0
      const weakPct = allyHits.length ? Math.round((weak / allyHits.length) * 100) : 0
      const typed = card.reasons.find((reason) => reason.icon === 'typ')
      if (strongPct >= 50 || weakPct >= 50) {
        expect(typed?.sentence).toContain(String(strongPct >= weakPct ? strongPct : weakPct))
      } else if (typed && strongPct === 0 && weakPct === 0) expect(typed.sentence).toContain('neutral')
      expect(card.reasons.length).toBeGreaterThan(0)
      expect(card.reasons.length).toBeLessThanOrEqual(3)
      expect(card.chip).toBe(card.reasons[0])
      expect(card.wait).toBe(!trace.win)
      expect(card.ko).toBe(trace.foeKo ? 1 : 0)
      for (const tip of card.tips) expect(tipIsSafe(tip)).toBe(true)
      const dealt = allyHits.reduce((sum, hit) => sum + hit.amount, 0)
      const share = card.shares.find((row) => row.name === trace.allyName)
      expect((share?.normal ?? 0) + (share?.ult ?? 0)).toBe(dealt)
      if (!trace.win) losses += 1
    }
    expect(losses).toBeGreaterThan(0)
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8')
    expect(app).toContain('whyAutoMs(')
    expect(app).toContain("save.hold = true")
    expect(app).toContain("act === 'why-open'")
    const oneHit = {
      allySpecies: 'm01', foeSpecies: 'm02', allyName: 'A', foeName: 'B',
      allyMax: 20, foeMax: 20, allyHp: 0, foeHp: 10, win: false, foeKo: false, allyKo: true, timeout: false,
      frames: [{
        allyHp: 0, foeHp: 10, text: '',
        hits: [
          { from: 'ally' as const, amount: 4, crit: true, type: 'fire' as const, band: 'neutral' as const, ko: false, kind: 'hit' as const },
          { from: 'foe' as const, amount: 0, crit: false, type: 'water' as const, band: 'neutral' as const, ko: false, kind: 'status' as const }
        ]
      }]
    }
    const one = whyBattle([oneHit], { win: false, gold: 0, exp: 0, ultUnlocked: false }, 'de')
    expect(one.tips.some((tip) => tip.includes('Ult-Leiste'))).toBe(false)
    expect(one.reasons.map((reason) => reason.sentence)).toContain('1 kritischer Treffer')
    expect(one.reasons.map((reason) => reason.sentence)).toContain('1 Status hat den Kampf geprägt')
    expect(one.shares[0] && `${one.shares[0].normal}`).toBe('4')
  })
})
