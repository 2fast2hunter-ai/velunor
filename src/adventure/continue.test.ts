import { describe, expect, it } from 'vitest'
import { SAVE_BACKUP, SAVE_KEY_V2 } from './const'
import { agoParts, continueFacts, inspectSave, nextDoor, resumeSave } from './continue'
import { beginAdventure, loadAdventure, writeSave } from './save'
import { brokenHtml, continueHtml } from './view'
import type { StorageLike } from './types'

function memory(): StorageLike {
  const box = new Map<string, string>()
  return {
    getItem: (key) => box.get(key) ?? null,
    setItem: (key, value) => { box.set(key, value) },
    removeItem: (key) => { box.delete(key) }
  }
}

const look = { skin: 1, hair: 0, color: 3 }

describe('continue door', () => {
  it('loads an existing save unchanged and leaves it untouched on cancel', () => {
    const storage = memory()
    const save = beginAdventure('Mira', look, 'm01', 1_000)
    save.gold = 4321
    save.region = 1
    save.chapter = 3
    save.step = 8
    save.lastSeenAt = 1_000
    const uid = save.team[0]
    save.mons[uid].lvl = 12
    writeSave(storage, save)
    const before = storage.getItem(SAVE_KEY_V2)

    const gate = inspectSave(storage, 1_000 + 2 * 60 * 60 * 1000)
    expect(nextDoor('create', 'open-ready')).toBe('continue')
    expect(gate.kind).toBe('ready')
    const resumed = resumeSave(gate.save!)
    expect(resumed).toBe(gate.save)
    expect(resumed.gold).toBe(4321)
    expect(resumed.name).toBe('Mira')
    expect(Object.keys(resumed.mons)).toEqual([uid])
    expect(resumed.mons[uid].lvl).toBe(12)
    expect(resumed.mons[uid].species).toBe('m01')
    expect(storage.getItem(SAVE_KEY_V2)).toBe(before)

    expect(nextDoor('continue', 'new')).toBe('ask')
    expect(nextDoor('ask', 'cancel')).toBe('continue')
    expect(storage.getItem(SAVE_KEY_V2)).toBe(before)
    const facts = continueFacts(resumed, 1_000 + 2 * 60 * 60 * 1000)
    expect(facts.lead).toBe('Funkfuchs')
    expect(facts.leadLevel).toBe(12)
    expect(facts.gold).toBe(4321)
    expect(facts.region).toBe('Grünmark')
    expect(agoParts(facts.agoMs)).toEqual({ unit: 'hour', n: 2 })
  })

  it('replaces the save only after overwrite is confirmed and a new game is written', () => {
    const storage = memory()
    const old = beginAdventure('Mira', look, 'm01', 1_000)
    old.gold = 4321
    writeSave(storage, old)
    const before = storage.getItem(SAVE_KEY_V2)
    expect(nextDoor('ask', 'confirm')).toBe('create')
    expect(storage.getItem(SAVE_KEY_V2)).toBe(before)

    const fresh = beginAdventure('Neu', { skin: 0, hair: 2, color: 1 }, 'm02', 2_000)
    writeSave(storage, fresh)
    const loaded = loadAdventure(storage, 3_000)
    expect(loaded?.name).toBe('Neu')
    expect(loaded?.gold).not.toBe(4321)
    expect(loaded?.mons[loaded.team[0]].species).toBe('m02')
    expect(loaded?.look).toEqual({ skin: 0, hair: 2, color: 1 })
  })

  it('offers a backup when the file is damaged and otherwise starts a new game', () => {
    const storage = memory()
    expect(nextDoor('create', 'open-empty')).toBe('create')
    const good = beginAdventure('Mira', look, 'm01', 1_000)
    writeSave(storage, good)
    writeSave(storage, good)
    storage.setItem(SAVE_KEY_V2, '{')
    const gate = inspectSave(storage, 2_000)
    expect(gate.kind).toBe('broken')
    expect(gate.backup).toBe(true)
    expect(nextDoor('broken', 'open-broken')).toBe('broken')
    expect(storage.getItem(SAVE_BACKUP)).toContain('"name":"Mira"')
    const broken = brokenHtml('de', true)
    expect(broken).toContain('Spielstand konnte nicht gelesen werden')
    expect(broken).toContain('data-act="restore"')
    expect(broken).toContain('data-act="new-game"')
    const card = continueHtml(good, 1_000, 'de', true)
    expect(card).toContain('data-act="continue"')
    expect(card).toContain('data-act="new-game"')
    expect(card).toContain('id="overwrite-no"')
    expect(card).toContain('class="danger"')
    expect(card).toContain('Mira')
  })
})
