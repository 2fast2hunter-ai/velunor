import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { FightFrame, FightHit, FightTrace } from './battle'
import { activeFx, BATTLE_QUEUE, battleQueueOn, planBattle, zugDauer } from './battlePlayer'

function hit(over: Partial<FightHit> = {}): FightHit {
  return { from: 'ally', amount: 10, crit: false, type: 'fire', band: 'neutral', ko: false, kind: 'hit', ...over }
}

function frame(hits: FightHit[] = [hit()]): FightFrame {
  return { allyHp: 40, foeHp: 20, text: 'Schlag', hits }
}

function trace(frames: FightFrame[], over: Partial<FightTrace> = {}): FightTrace {
  return {
    allySpecies: 'm01', foeSpecies: 'm02', allyName: 'Ada', foeName: 'Bea',
    allyMax: 100, foeMax: 80, frames, win: true, foeKo: false, allyKo: false, timeout: false,
    allyHp: 40, foeHp: 0, ...over
  }
}

describe('battle queue', () => {
  it('stays off, so the live fight keeps today\'s clock', () => {
    expect(BATTLE_QUEUE.road).toBe(false)
    expect(BATTLE_QUEUE.focus).toBe(false)
    expect(battleQueueOn('road')).toBe(false)
    expect(battleQueueOn('focus')).toBe(false)
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8')
    expect(app).toContain('shotAt(outcome.traces')
    expect(app).not.toContain('planBattle(')
  })

  it('prices road pieces from the ×1 table and divides by tempo', () => {
    const empty = frame([])
    expect(zugDauer(empty, 'road', 1, 0, true)).toBe(300)
    expect(zugDauer(empty, 'road')).toBe(250)
    expect(zugDauer(frame([hit()]), 'road')).toBe(450)
    expect(zugDauer(frame([hit()]), 'road', 1, 6)).toBe(250)
    expect(zugDauer(frame([hit({ crit: true })]), 'road')).toBe(900)
    expect(zugDauer(frame([hit(), hit()]), 'road')).toBe(650)
    expect(zugDauer(frame([hit()]), 'road', 2)).toBe(225)
    expect(zugDauer(frame([hit()]), 'road', 3)).toBe(150)
  })

  it('splits a focus turn into four phases, 1300 or 2100, halved at 2x', () => {
    expect(zugDauer(frame([hit()]), 'focus')).toBe(1300)
    expect(zugDauer(frame([hit({ ult: 'durchschlag' })]), 'focus')).toBe(2100)
    expect(zugDauer(frame([hit()]), 'focus', 2)).toBe(650)
    expect(zugDauer(frame([hit({ ko: true })]), 'focus', 2)).toBe(1050)
    const planned = planBattle([trace([frame([hit()])])], 'focus', 1)
    expect(planned.map((step) => step.phase)).toEqual(['ansage', 'aktion', 'treffer', 'ergebnis'])
    expect(planned.map((step) => step.dur)).toEqual([300, 400, 400, 200])
  })

  it('plays one action at a time and never stacks FX', () => {
    const normals = Array.from({ length: 7 }, () => frame([hit()]))
    const road = planBattle([trace([
      frame([]),
      ...normals,
      frame([hit({ crit: true }), hit({ from: 'foe' })])
    ])], 'road', 1)
    expect(road[0]).toMatchObject({ phase: 'ansage', dur: 300, fx: false })
    expect(road.slice(1, 8).map((step) => step.dur)).toEqual([450, 450, 450, 450, 450, 450, 250])
    expect(road.at(-1)).toMatchObject({ phase: 'resultat' })
    expect(road.reduce((sum, step) => sum + step.dur, 0)).toBeGreaterThanOrEqual(2800)
    for (let i = 1; i < road.length; i++) {
      expect(road[i].start).toBe(road[i - 1].start + road[i - 1].dur)
    }
    const end = road[road.length - 1].start + road[road.length - 1].dur
    for (let at = 0; at < end; at += 25) expect(activeFx(road, at)).toBeLessThanOrEqual(1)
    const bouts = planBattle([
      trace([frame([hit({ ko: true })])], { foeKo: true }),
      trace([frame([hit()])])
    ], 'focus', 1)
    expect(bouts.map((step) => step.phase)).toContain('wechsel')
    expect(bouts.find((step) => step.phase === 'wechsel')?.dur).toBe(800)
    expect(bouts.filter((step) => step.fx).length).toBeGreaterThan(1)
    for (let i = 1; i < bouts.length; i++) {
      expect(bouts[i].start).toBe(bouts[i - 1].start + bouts[i - 1].dur)
    }
  })
})
