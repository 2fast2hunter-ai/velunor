import { describe, expect, it } from 'vitest'
import { SAVE_KEY_V2, SAVE_VERSION } from './const'
import { beginAdventure, loadAdventure, writeSave } from './save'
import type { StorageLike } from './types'

function memory(): StorageLike {
  const box = new Map<string, string>()
  return {
    getItem: (key) => box.get(key) ?? null,
    setItem: (key, value) => { box.set(key, value) },
    removeItem: (key) => { box.delete(key) }
  }
}

/** A save written before `look` existed: monsters, gold and road progress included. */
function oldSave(avatar: 'A' | 'B' | 'C' | undefined) {
  const body: Record<string, unknown> = {
    v: 2,
    saveVersion: 4,
    name: avatar === 'B' ? 'Bea' : 'Ada',
    gold: 4321,
    marks: 7,
    lastSeenAt: 10,
    region: 1,
    chapter: 3,
    step: 8,
    loop: false,
    badges: ['Kieselwappen'],
    team: ['u1'],
    pc: ['u2'],
    buddy: 'u1',
    mons: {
      u1: { species: 'm01', lvl: 12, exp: 3, hp: 4, shiny: true, caughtAt: 1, caughtWhere: 'r1c1', keepDupes: true },
      u2: { species: 'm02', lvl: 8, exp: 1, hp: null, shiny: false, caughtAt: 2, caughtWhere: 'r1c2', keepDupes: false }
    },
    dex: { m01: { seen: 2, caught: 2 }, m02: { seen: 1, caught: 1 } },
    settings: { speed: 2, lang: 'de' },
    rng: 99,
    nextId: 4,
    started: true,
    active: 'u1',
    log: [{ t: 1, text: 'Hallo' }],
    regionsOpen: [1]
  }
  if (avatar) body.avatar = avatar
  return body
}

describe('look migration', () => {
  it('turns a real old A save and a real old B save into looks without dropping the game', () => {
    const storage = memory()
    storage.setItem(SAVE_KEY_V2, JSON.stringify(oldSave('A')))
    const ada = loadAdventure(storage, 50)
    expect(SAVE_VERSION).toBe(6)
    expect(ada?.saveVersion).toBe(6)
    expect(ada?.avatar).toBe('A')
    expect(ada?.look).toEqual({ skin: 1, hair: 0, color: 0 })
    expect(ada?.name).toBe('Ada')
    expect(ada?.gold).toBe(4321)
    expect(ada?.marks).toBe(7)
    expect(ada?.chapter).toBe(3)
    expect(ada?.step).toBe(8)
    expect(ada?.badges).toEqual(['Kieselwappen'])
    expect(ada?.team).toEqual(['u1'])
    expect(ada?.pc).toEqual(['u2'])
    expect(ada?.mons.u1.lvl).toBe(12)
    expect(ada?.mons.u1.shiny).toBe(true)
    expect(ada?.mons.u1.hp).toBe(4)
    expect(ada?.mons.u2.species).toBe('m02')
    expect(ada?.dex.m01.caught).toBe(2)

    storage.setItem(SAVE_KEY_V2, JSON.stringify(oldSave('B')))
    const bea = loadAdventure(storage, 60)
    expect(bea?.avatar).toBe('B')
    expect(bea?.look).toEqual({ skin: 3, hair: 1, color: 3 })
    expect(bea?.name).toBe('Bea')
    expect(bea?.gold).toBe(4321)
    expect(bea?.chapter).toBe(3)
    expect(bea?.mons.u1.species).toBe('m01')
    expect(bea?.mons.u2.lvl).toBe(8)
    expect(bea?.log[0].text).toBe('Hallo')
  })

  it('uses zeros when the old letter is missing or invalid, and does not write a letter for a new game', () => {
    const storage = memory()
    storage.setItem(SAVE_KEY_V2, JSON.stringify(oldSave(undefined)))
    expect(loadAdventure(storage, 1)?.look).toEqual({ skin: 0, hair: 0, color: 0 })
    expect(loadAdventure(storage, 1)?.avatar).toBeUndefined()
    storage.setItem(SAVE_KEY_V2, JSON.stringify(oldSave('C')))
    const broken = loadAdventure(storage, 2)
    expect(broken?.look).toEqual({ skin: 0, hair: 0, color: 0 })
    expect(broken?.avatar).toBeUndefined()
    expect(broken?.gold).toBe(4321)

    const fresh = beginAdventure('Mira', { skin: 4, hair: 6, color: 2 }, 'm03', 1_000)
    expect(fresh.look).toEqual({ skin: 4, hair: 6, color: 2 })
    expect(fresh.avatar).toBeUndefined()
    expect(fresh.mons[fresh.team[0]].species).toBe('m03')
    writeSave(storage, fresh)
    const raw = JSON.parse(storage.getItem(SAVE_KEY_V2) ?? '{}') as { avatar?: string; look: unknown }
    expect(raw.avatar).toBeUndefined()
    expect(raw.look).toEqual({ skin: 4, hair: 6, color: 2 })
  })
})
