import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { FightFrame, FightHit, FightTrace } from './battle'
import { fitScale } from './const'
import { beginAdventure, loadAdventure, writeSave } from './save'
import type { StorageLike } from './types'
import { actionAt, activeFx, BATTLE_QUEUE, battleQueueOn, focusKo, focusTempo, planBattle, roadQueueFromSearch, roadTempo, setRoadQueue, shotFromAction, zugDauer } from './battlePlayer'

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
  it('is on together with the pace switch, so a road fight plays turn by turn', () => {
    expect(BATTLE_QUEUE.road).toBe(true)
    expect(BATTLE_QUEUE.focus).toBe(true)
    expect(battleQueueOn('road')).toBe(true)
    expect(battleQueueOn('focus')).toBe(true)
    expect(focusTempo(undefined)).toBe(1)
    expect(focusTempo(2)).toBe(2)
    expect(focusTempo(3)).toBe(1)
    expect(roadQueueFromSearch(false, '?debug=1&roadQueue=1')).toBe(false)
    expect(roadQueueFromSearch(true, '?roadQueue=1')).toBe(true)
    expect(roadQueueFromSearch(true, '?debug=1')).toBe(false)
    setRoadQueue(false)
    expect(battleQueueOn('road')).toBe(false)
    expect(BATTLE_QUEUE.road).toBe(true)
    setRoadQueue(null)
    expect(battleQueueOn('road')).toBe(true)
    expect(roadTempo(3)).toBe(3)
    expect(roadTempo(3, 1)).toBe(1)
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8')
    expect(app).toContain('shotAt(outcome.traces')
    expect(app).toContain("battleQueueOn('road')")
    expect(app).toContain("outcome.kind === 'wild' || outcome.kind === 'trainer'")
    expect(app).toContain("battleQueueOn('focus') && outcome.kind === 'guardian'")
    const view = readFileSync(new URL('./view.ts', import.meta.url), 'utf8')
    const css = readFileSync(new URL('./adventure.css', import.meta.url), 'utf8')
    expect(view).toContain('battle_ui/ko/leer_64.png')
    expect(app).toContain('battle_ui/ko/voll_64.png')
    expect(view).not.toContain('ko/leer_32')
    expect(css).toContain('.ko-dots img { width: 64px; height: 64px; }')
    expect(css).toContain('width: 128px;')
    const phone = fitScale(390, 844)
    expect((6 * 64 + 5 * 8) * phone).toBeLessThanOrEqual(390)
    expect((4 * 128 + 3 * 12) * phone).toBeLessThanOrEqual(390)
    expect(64 * phone).toBeGreaterThan(20)
    expect(BATTLE_QUEUE.road).toBe(true)
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
    const duo = trace([frame([hit({ amount: 4 }), hit({ amount: 9, from: 'foe' })])])
    const steps = planBattle([duo], 'road', 1)
    const firstHit = steps.find((step) => step.hitIndex === 0)
    const secondHit = steps.find((step) => step.hitIndex === 1)
    expect(firstHit && shotFromAction([duo], firstHit)?.hits.map((row) => row.amount)).toEqual([4])
    expect(secondHit && shotFromAction([duo], secondHit)?.hits.map((row) => row.amount)).toEqual([9])
    expect(actionAt(steps, 0)?.phase).toBe('zug')
    expect(road.at(-1)).toMatchObject({ phase: 'resultat' })
    expect(road.reduce((sum, step) => sum + step.dur, 0)).toBeGreaterThanOrEqual(2800)
    expect(planBattle([trace([frame([hit()])])], 'road', 2).reduce((sum, step) => sum + step.dur, 0)).toBeGreaterThanOrEqual(1400)
    expect(planBattle([trace([frame([hit()])])], 'road', 3).reduce((sum, step) => sum + step.dur, 0)).toBeGreaterThanOrEqual(930)
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
    const fresh = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    fresh.settings.speed = 2
    const box: StorageLike = (() => {
      const map = new Map<string, string>()
      return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => { map.set(key, value) }, removeItem: (key) => { map.delete(key) } }
    })()
    writeSave(box, fresh)
    const loaded = loadAdventure(box, 2_000)
    expect(loaded?.settings.tempoWeg).toBeUndefined()
    expect(roadTempo(loaded?.settings.speed ?? 1, loaded?.settings.tempoWeg)).toBe(2)
    fresh.settings.tempoWeg = 1
    fresh.settings.speed = 3
    writeSave(box, fresh)
    const kept = loadAdventure(box, 3_000)
    expect(kept?.settings.tempoWeg).toBe(1)
    expect(roadTempo(kept?.settings.speed ?? 1, kept?.settings.tempoWeg)).toBe(1)
    expect(loaded?.settings.tempoFokus).toBeUndefined()
    expect(focusTempo(loaded?.settings.tempoFokus)).toBe(1)
    fresh.settings.tempoFokus = 2
    writeSave(box, fresh)
    expect(loadAdventure(box, 4_000)?.settings.tempoFokus).toBe(2)
    const bouts4 = Array.from({ length: 4 }, () => trace([frame([hit()])], { foeKo: true }))
    const focus = planBattle(bouts4, 'focus', 1)
    expect(focus.filter((step) => step.phase === 'ansage')).toHaveLength(4)
    expect(focusKo(bouts4, 2, 10)).toBe(2)
    expect(focusKo(bouts4, 2, 0)).toBe(3)
    for (let i = 1; i < bouts.length; i++) {
      expect(bouts[i].start).toBe(bouts[i - 1].start + bouts[i - 1].dur)
    }
  })
})
