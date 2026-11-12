import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../rng'
import { SAVE_KEY_V2 } from './const'
import { settleGauntlet } from './gauntlet'
import { chapterById, ratscap } from './route'
import { beginAdventure, loadAdventure, makeMon } from './save'
import { catchChance, challengeGuardian, expectedCatchAttempts, resolveEncounter } from './sim'
import { addExp } from './stats'
import type { StorageLike } from './types'

function memory(): StorageLike {
  const box = new Map<string, string>()
  return {
    getItem: (key) => box.get(key) ?? null,
    setItem: (key, value) => { box.set(key, value) },
    removeItem: (key) => { box.delete(key) }
  }
}

describe('section A wards and court', () => {
  it('adds half a point of seal progress after a miss and resets it', () => {
    expect(catchChance(8, 30, 30, 1, 0.6, 10)).toBeCloseTo(0.13)
    expect(expectedCatchAttempts(8)).toBeGreaterThan(10)
    expect(expectedCatchAttempts(9)).toBeLessThan(20)
    const save = beginAdventure('Ada', 'A', 'm01', 1_000)
    save.mons[save.team[0]].lvl = 20
    let moved = false
    for (let i = 0; i < 40 && !moved; i++) {
      save.step = 1
      resolveEncounter(save, 2_000 + i, { offline: false, trace: false })
      moved = Object.values(save.sealPity).some((value) => value >= 0.5)
    }
    expect(moved).toBe(true)
  })

  it('lays the court path and the new caps', () => {
    const court = chapterById(1, 9)
    expect(court.foyer).toBe(true)
    expect(court.name).toBe('Vorhof des Rates')
    expect(court.cap).toBe(60)
    expect(court.levelMin).toBe(52)
    expect(court.levelMax).toBe(57)
    expect(court.day.reduce((sum, row) => sum + row.weight, 0)).toBe(100)
    expect(chapterById(1, 1).guardian.team.map((mon) => mon.level)).toEqual([7, 8, 10])
    expect(chapterById(2, 1).cap).toBe(66)
    expect(chapterById(5, 8).cap).toBe(270)
    expect(ratscap(5)).toBe(276)
    expect(chapterById(5, 9).cap).toBe(276)
    expect(chapterById(5, 11).cap).toBe(280)
    const aces = chapterById(1, 10).council?.members.map((member) => member.team[2].level)
    expect(aces).toEqual([56, 57, 58, 59, 60])
  })

  it('keeps fighting after one ally falls', () => {
    const allies = [
      { species: 'm03', level: 1, hpFraction: 1, skillBonus: true, factor: 1 },
      { species: 'm01', level: 60, hpFraction: 1, skillBonus: true, factor: 1 }
    ]
    const foes = [{ species: 'm02', level: 25, hpFraction: 1, skillBonus: false, factor: 1.5 }]
    const fought = settleGauntlet(allies, foes, mulberry32(7))
    expect(fought.win).toBe(true)
    expect(allies[0].hpFraction).toBe(0)
    expect(fought.traces.length).toBeGreaterThan(1)
  })

  it('starts the warden at step 20 without a button', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1_000)
    save.step = 20
    save.challengeNow = false
    save.loop = true
    const outcome = resolveEncounter(save, 1_000, { offline: false, trace: false })
    expect(outcome.kind).toBe('guardian')
    expect(outcome.traces.length).toBeGreaterThan(0)
    expect(save.hold).toBe(false)
  })

  it('opens the gate again after ten wins and on a manual challenge', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1_000)
    save.guardMark = 30
    save.guardWins = 10
    save.mons[save.team[0]].lvl = 5
    save.step = 20
    const retry = resolveEncounter(save, 1_000, { offline: false, trace: false })
    expect(retry.traces.length).toBeGreaterThan(0)
    const held = beginAdventure('Bea', 'B', 'm02', 1_000)
    held.guardMark = 80
    held.guardWins = 0
    held.step = 4
    held.hold = true
    expect(challengeGuardian(held)).toBeNull()
    const forced = resolveEncounter(held, 1_000, { offline: false, trace: false })
    expect(forced.kind).toBe('guardian')
    expect(forced.traces.length).toBeGreaterThan(0)
  })

  it('migrates an old council visit into the court and keeps a high level', () => {
    const storage = memory()
    storage.setItem(SAVE_KEY_V2, JSON.stringify({
      v: 2,
      name: 'Ada',
      avatar: 'A',
      gold: 10,
      lastSeenAt: 10,
      region: 1,
      chapter: 9,
      step: 3,
      loop: true,
      badges: [],
      team: ['u1'],
      pc: [],
      mons: { u1: { species: 'm01', lvl: 90, exp: 0, hp: null, shiny: false, caughtAt: 1, caughtWhere: 'r1c1', keepDupes: false } },
      dex: {},
      settings: { speed: 1 },
      rng: 3,
      nextId: 2,
      started: true,
      councilBeaten: ['rat1'],
      hold: true
    }))
    const loaded = loadAdventure(storage, 50)
    expect(loaded?.chapter).toBe(9)
    expect(loaded?.step).toBe(1)
    expect(loaded?.hold).toBe(false)
    expect(loaded?.councilBeaten).toEqual(['rat1'])
    expect(loaded?.mons.u1.lvl).toBe(90)
    expect(loaded?.layout).toBe(1)
    expect(loaded?.settings.shake).toBe(false)
    expect(loaded?.fxShake).toBe(1)
    const capped = makeMon('m01', 280, 1, 'r1c1')
    addExp(capped, 5_000_000, 999, null)
    expect(capped.lvl).toBe(280)
    const over = makeMon('m01', 300, 1, 'r1c1')
    addExp(over, 5_000_000, 280, null)
    expect(over.lvl).toBe(300)
  })

  it('turns screen shake off once and then keeps the choice', () => {
    const storage = memory()
    const save = beginAdventure('Ada', 'A', 'm01', 1_000)
    expect(save.settings.shake).toBe(false)
    expect(save.fxShake).toBe(1)
    save.settings.shake = true
    save.fxShake = 0
    storage.setItem(SAVE_KEY_V2, JSON.stringify(save))
    const once = loadAdventure(storage, 2_000)
    expect(once?.settings.shake).toBe(false)
    expect(once?.fxShake).toBe(1)
    if (!once) return
    once.settings.shake = true
    storage.setItem(SAVE_KEY_V2, JSON.stringify(once))
    const kept = loadAdventure(storage, 3_000)
    expect(kept?.settings.shake).toBe(true)
    expect(kept?.fxShake).toBe(1)
  })
})
