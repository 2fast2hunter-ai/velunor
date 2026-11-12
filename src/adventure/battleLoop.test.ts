import { describe, expect, it } from 'vitest'
import type { FightTrace } from './battle'
import { watchdogLimit } from './const'
import { shotAt, shouldRecover } from './present'
import { beginAdventure } from './save'
import { useCrystal } from './shop'
import { expToNext } from './stats'
import { resolveEncounter } from './sim'

function trace(frames: { allyHp: number; foeHp: number; text: string }[]): FightTrace {
  return {
    allySpecies: 'm01',
    foeSpecies: 'm66',
    allyName: 'Funkfuchs',
    foeName: 'Wühlmaus',
    allyMax: 40,
    foeMax: 20,
    frames,
    win: true,
    foeKo: true,
    allyKo: false,
    timeout: false,
    allyHp: 30,
    foeHp: 0
  }
}

describe('battle loop guards', () => {
  it('scales the stall limit with tempo', () => {
    expect(watchdogLimit(1)).toBe(10_000)
    expect(watchdogLimit(2)).toBe(5_000)
    expect(watchdogLimit(3)).toBeCloseTo(10_000 * 930 / 2800, 5)
  })

  it('stays quiet while a dialog is open or the road is held', () => {
    const now = 20_000
    expect(shouldRecover({ started: true, overlay: true, hold: false, since: 0, now, speed: 1 })).toBe(false)
    expect(shouldRecover({ started: true, overlay: false, hold: true, since: 0, now, speed: 1 })).toBe(false)
    expect(shouldRecover({ started: true, overlay: false, hold: false, since: now - 9_000, now, speed: 1 })).toBe(false)
    expect(shouldRecover({ started: true, overlay: false, hold: false, since: now - 10_000, now, speed: 1 })).toBe(true)
    expect(shouldRecover({ started: true, overlay: false, hold: false, since: now - 5_000, now, speed: 2 })).toBe(true)
  })

  it('reads battle frames without throwing when the trace is missing', () => {
    expect(shotAt([], 100, 2800)).toBeNull()
    expect(shotAt([trace([])], 100, 2800)).toBeNull()
    const shot = shotAt([trace([{ allyHp: 40, foeHp: 20, text: 'Start' }, { allyHp: 30, foeHp: 0, text: 'Treffer' }])], 0, 2800)
    expect(shot?.text).toBe('Start')
    const end = shotAt([trace([{ allyHp: 40, foeHp: 20, text: 'Start' }, { allyHp: 30, foeHp: 0, text: 'Treffer' }])], 2800, 2800)
    expect(end?.text).toBe('Treffer')
    expect(end?.foeHp).toBe(0)
  })

  it('keeps walking through many fights, including a wipe, a catch and an awakening', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    save.settings.catchCard = true
    const seen = new Set<number>()
    for (let i = 0; i < 40; i++) {
      const outcome = resolveEncounter(save, 1_000 + i * 2800, { offline: false, trace: true })
      expect(outcome.step).toBeGreaterThanOrEqual(1)
      expect(outcome.step).toBeLessThanOrEqual(20)
      for (const row of outcome.traces) expect(Array.isArray(row.frames)).toBe(true)
      seen.add(save.step)
    }
    expect(seen.size).toBeGreaterThan(1)
    expect(save.log.length).toBeGreaterThan(0)

    for (const id of save.team) save.mons[id].hp = 0
    const wiped = resolveEncounter(save, 200_000, { offline: false, trace: true })
    expect(wiped.wiped).toBe(true)
    expect([1, 7, 14]).toContain(save.step)
    expect(save.mons[save.team[0]].hp).toBeNull()

    const uid = save.team[0]
    save.mons[uid].lvl = 24
    save.mons[uid].exp = expToNext(24) - 1
    save.mons[uid].hp = null
    save.bag.crystals.s = 1
    expect(useCrystal(save, 's', uid, 100)).toBeNull()
    expect(save.pendingAwaken.some((row) => row.level === 25)).toBe(true)
    expect(save.mons[uid].species).toBe('m01')
    expect(save.gold).toBeGreaterThanOrEqual(3000)
  })
})
