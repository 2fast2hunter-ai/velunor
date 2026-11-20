import { describe, expect, it } from 'vitest'
import { SAVE_KEY_V2, SAVE_VERSION } from './const'
import { startChests } from './lootbox'
import { rememberTutorial, TUTORIAL_STEP, TUTORIAL_STEP_NUMBERS } from './onboarding'
import { beginAdventure, loadAdventure } from './save'
import type { StorageLike } from './types'

function memory(): StorageLike {
  const box = new Map<string, string>()
  return {
    getItem: (key) => box.get(key) ?? null,
    setItem: (key, value) => { box.set(key, value) },
    removeItem: (key) => { box.delete(key) }
  }
}

const mon = {
  species: 'm01',
  lvl: 12,
  exp: 4,
  hp: 30,
  shiny: false,
  caughtAt: 1,
  caughtWhere: 'r1c1',
  keepDupes: false
}

describe('first 30 minutes save', () => {
  it('migrates a v12 save without dropping chests, gold or monsters', () => {
    const storage = memory()
    storage.setItem(SAVE_KEY_V2, JSON.stringify({
      v: 2,
      saveVersion: 12,
      name: 'Ada',
      look: { skin: 1, hair: 2, color: 0 },
      gold: 4321,
      marks: 3,
      region: 1,
      chapter: 1,
      step: 9,
      badges: ['Kieselwappen'],
      team: ['u1'],
      pc: [],
      mons: { u1: mon },
      dex: { m01: { seen: 1, caught: 1 }, m02: { seen: 1, caught: 1 }, m03: { seen: 1, caught: 0 } },
      settings: { speed: 2, lang: 'de' },
      rng: 5,
      nextId: 2,
      started: true,
      chests: { kiesel: 4, silber: 1, gold: 0, sternen: 0 },
      regionsOpen: [1]
    }))
    const loaded = loadAdventure(storage, 50)
    expect(loaded?.saveVersion).toBe(13)
    expect(SAVE_VERSION).toBe(13)
    expect(loaded?.started).toBe(true)
    expect(loaded?.name).toBe('Ada')
    expect(loaded?.gold).toBe(4321)
    expect(loaded?.marks).toBe(3)
    expect(loaded?.step).toBe(9)
    expect(loaded?.mons.u1.lvl).toBe(12)
    expect(loaded?.mons.u1.hp).toBe(30)
    expect(loaded?.chests).toEqual({ kiesel: 4, silber: 1, gold: 0, sternen: 0 })
    expect(loaded?.onboarding?.done).toBe(true)
    expect(loaded?.onboarding?.seen).toEqual([])
    expect(loaded?.onboarding?.sent).toEqual([])
  })

  it('keeps a fresh starter on the entrance and does not refill stored chests', () => {
    const storage = memory()
    storage.setItem(SAVE_KEY_V2, JSON.stringify({
      v: 2,
      saveVersion: 12,
      name: 'Bea',
      gold: 3000,
      region: 1,
      chapter: 1,
      step: 2,
      team: ['u1'],
      pc: [],
      mons: { u1: { ...mon, lvl: 5, hp: null } },
      dex: { m01: { seen: 1, caught: 1 } },
      settings: { speed: 1 },
      rng: 5,
      nextId: 2,
      started: true,
      chests: { kiesel: 8, silber: 0, gold: 0, sternen: 0 },
      regionsOpen: [1]
    }))
    const loaded = loadAdventure(storage, 50)
    expect(loaded?.onboarding?.done).toBe(false)
    expect(loaded?.chests.kiesel).toBe(8)
    expect(loaded?.mons.u1.lvl).toBe(5)
  })

  it('starts a new game with the entrance open and two kiesel chests', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    expect(save.onboarding?.done).toBe(false)
    expect(save.chests).toEqual(startChests())
    expect(save.chests.kiesel).toBe(2)
  })

  it('sends step 12 and step 4, then sends neither again after a reload', () => {
    expect(TUTORIAL_STEP_NUMBERS).toContain(TUTORIAL_STEP.chestSeen)
    expect(TUTORIAL_STEP_NUMBERS).toContain(12)
    const first = rememberTutorial([], 12)
    const second = rememberTutorial(first.sent, 4)
    expect(first.send).toBe(true)
    expect(second.send).toBe(true)
    expect(second.sent).toEqual([12, 4])
    const storage = memory()
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    save.onboarding = { v: 1, done: false, seen: [], sent: second.sent, hintsOff: false, lastHintAt: 0, playMs: 0 }
    storage.setItem(SAVE_KEY_V2, JSON.stringify(save))
    const loaded = loadAdventure(storage, 2_000)
    expect(loaded?.onboarding?.sent).toEqual([12, 4])
    expect(rememberTutorial(loaded?.onboarding?.sent ?? [], 12).send).toBe(false)
    expect(rememberTutorial(loaded?.onboarding?.sent ?? [], 4).send).toBe(false)
    expect(rememberTutorial(loaded?.onboarding?.sent ?? [], 6).send).toBe(true)
  })
})
