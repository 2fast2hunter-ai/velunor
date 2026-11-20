import { describe, expect, it } from 'vitest'
import { SAVE_KEY_V2 } from './const'
import { beginAdventure, loadAdventure } from './save'
import { resolveEncounter } from './sim'
import { releaseFindClaims } from './sources'
import { routeOf } from './route'
import type { StorageLike } from './types'

function memory(): StorageLike {
  const box = new Map<string, string>()
  return {
    getItem: (key) => box.get(key) ?? null,
    setItem: (key, value) => { box.set(key, value) },
    removeItem: (key) => { box.delete(key) }
  }
}

describe('find chests', () => {
  it('pays the step-2 find once, and defeats at ×3 do not mint another', () => {
    const findStep = routeOf(1).findIndex((kind, step) => step > 0 && kind === 'find')
    expect(findStep).toBe(2)
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    save.settings.speed = 3
    save.settings.tempoWeg = 3
    const start = save.chests.kiesel
    const mon = save.mons[save.team[0]]
    mon.lvl = 40
    mon.hp = null
    for (let i = 0; i < 8 && save.chests.kiesel === start; i++) {
      resolveEncounter(save, 2_000 + i, { offline: false, trace: false })
    }
    expect(save.chests.kiesel).toBe(start + 1)
    const held = save.chests.kiesel
    for (let i = 0; i < 12; i++) {
      save.step = 1
      save.lastHealStep = 1
      mon.lvl = 1
      mon.hp = 1
      resolveEncounter(save, 10_000 + i, { offline: false, trace: false })
    }
    for (let i = 0; i < 6; i++) {
      save.step = findStep
      save.lastHealStep = 1
      resolveEncounter(save, 20_000 + i, { offline: false, trace: false })
    }
    expect(save.chests.kiesel).toBe(held)
    const storage = memory()
    storage.setItem(SAVE_KEY_V2, JSON.stringify(save))
    const loaded = loadAdventure(storage, 30_000)
    expect(loaded?.chests.kiesel).toBe(held)
    expect(loaded?.findClaims).toContain(`1:1:${findStep}`)
    if (!loaded) return
    loaded.step = findStep
    resolveEncounter(loaded, 40_000, { offline: false, trace: false })
    expect(loaded.chests.kiesel).toBe(held)
    releaseFindClaims(loaded, 1)
    loaded.step = findStep
    const mon2 = loaded.mons[loaded.team[0]]
    mon2.lvl = 40
    mon2.hp = null
    resolveEncounter(loaded, 50_000, { offline: false, trace: false })
    expect(loaded.chests.kiesel).toBe(held + 1)
  })
})
