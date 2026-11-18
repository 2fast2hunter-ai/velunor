import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SAVE_KEY_V2, SAVE_VERSION } from './const'
import { emptySummary } from './sim'
import { beginAdventure, loadAdventure, writeSave } from './save'
import type { StorageLike } from './types'
import { gameHtml, pcWindowHtml, visiblePc, type CodexQuery, type PcQuery } from './view'
import {
  PC_COLUMNS,
  PC_OVERSCAN,
  PC_ROW_H,
  PC_VIEW_FALLBACK,
  SHEET_SWIPE,
  sheetShouldClose,
  virtualWindow
} from './virtualList'

const dex: CodexQuery = { q: '', type: '', rarity: '', shiny: '' }
const pcQuery: PcQuery = { q: '', type: '', rarity: '', shiny: '', sort: 'newest', dir: -1 }

function memory(): StorageLike {
  const box = new Map<string, string>()
  return {
    getItem: (key) => box.get(key) ?? null,
    setItem: (key, value) => { box.set(key, value) },
    removeItem: (key) => { box.delete(key) }
  }
}

function fillPc(count: number) {
  const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
  const starter = save.team[0]
  for (let i = 0; i < count; i++) {
    const uid = `p${i}`
    save.mons[uid] = { ...save.mons[starter], caughtAt: count - i, lvl: (i % 40) + 1, shiny: i % 50 === 0 }
    save.pc.push(uid)
  }
  return save
}

describe('portrait menus', () => {
  it('opens a short slice of a 1000-monster PC and stays under a 50 fps budget', () => {
    const save = fillPc(1000)
    const query: PcQuery = { ...pcQuery, sort: 'level', dir: -1 }
    const ids = visiblePc(save, query)
    expect(ids).toHaveLength(1000)
    expect(save.mons[ids[0]].lvl).toBeGreaterThanOrEqual(save.mons[ids[999]].lvl)

    const top = virtualWindow(ids.length, 0, PC_VIEW_FALLBACK)
    const rowBudget = PC_COLUMNS * (Math.ceil(PC_VIEW_FALLBACK / PC_ROW_H) + 4)
    expect(top.end - top.start).toBeGreaterThan(0)
    expect(top.end - top.start).toBeLessThanOrEqual(rowBudget)
    expect(virtualWindow(1000, 10, PC_VIEW_FALLBACK).start).toBe(top.start)
    expect(virtualWindow(1000, (PC_OVERSCAN + 1) * PC_ROW_H, PC_VIEW_FALLBACK).start).toBeGreaterThan(top.start)

    const html = gameHtml(save, 'team', 1_000, query, dex, null, false, false, null)
    const viewport = html.split('id="pc-viewport"')[1] ?? ''
    const drawn = viewport.match(/data-drag="pc"/g) ?? []
    expect(drawn).toHaveLength(top.end - top.start)
    expect(drawn.length).toBeLessThan(48)
    expect(html).toContain('data-cols="3"')
    expect(html).toContain('data-cols="4"')
    expect(html).toContain('data-dock="team"')
    expect(html).toContain('Sortieren und Filtern')
    const team = html.split('id="team-grid"')[1]?.split('id="pc-viewport"')[0] ?? ''
    expect(team.match(/class="mon-card/g)).toHaveLength(6)
    expect(html.indexOf('id="team-grid"')).toBeLessThan(html.indexOf('id="pc-viewport"'))

    const frames = 60
    const started = performance.now()
    let built = 0
    for (let frame = 0; frame < frames; frame++) {
      const win = virtualWindow(1000, frame * 40, PC_VIEW_FALLBACK)
      const slice = pcWindowHtml(save, ids.slice(win.start, win.end), null)
      built += slice.length
      expect(win.end - win.start).toBeLessThanOrEqual(rowBudget)
    }
    expect((performance.now() - started) / frames).toBeLessThan(20)
    expect(built).toBeGreaterThan(0)

    const rows = Math.ceil(1000 / PC_COLUMNS)
    const bottom = virtualWindow(1000, rows * PC_ROW_H - PC_VIEW_FALLBACK, PC_VIEW_FALLBACK)
    expect(bottom.end).toBe(1000)
    expect(bottom.start).toBeGreaterThan(900)
  })

  it('lays codex, wheel, hort and options out as portrait lists', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    save.badges = ['Kieselwappen', 'Wellenwappen', 'Funkenwappen']
    const codex = gameHtml(save, 'codex', 1_000, pcQuery, dex, null, false, false, null)
    expect(codex).toContain('data-cols="4"')
    expect(codex).toContain('class="codex-grid"')
    expect(codex).toContain('data-act="dex-filters"')

    const wheel = gameHtml(save, 'activities', 1_000, pcQuery, dex, null, false, false, null, save.step, { tab: 'wheel', mult: 1, symbols: null, note: '' })
    expect(wheel.indexOf('class="reels"')).toBeGreaterThan(-1)
    expect(wheel.indexOf('class="reels"')).toBeLessThan(wheel.indexOf('data-dock="wheel"'))
    const dock = wheel.split('data-dock="wheel"')[1] ?? ''
    expect(dock).toContain('data-act="spin"')
    expect(dock).toContain('>Drehen<')

    const hort = gameHtml(save, 'activities', 1_000, pcQuery, dex, null, false, false, null)
    expect(hort).toContain('data-dock="hort"')
    expect(hort).toContain('data-act="buy-hort"')
    expect(hort.indexOf('data-act="buy-hort"')).toBeGreaterThan(hort.indexOf('class="hort-grid"'))

    const options = gameHtml(save, 'options', 1_000, pcQuery, dex, null, false, false, null)
    const optDock = options.split('data-dock="options"')[1] ?? ''
    expect(optDock).toContain('data-act="sync-now"')
    expect(optDock).not.toContain('import-ask')
    expect(options).not.toContain('id="import-code"')
    expect(options).not.toContain('id="export-code"')
    expect(options).toContain('Konto sichern')
    expect(options).toContain('Offline, nicht verfügbar')
    expect(options.indexOf('Konto sichern')).toBeLessThan(options.indexOf('data-dock="options"'))

    const css = readFileSync(new URL('./adventure.css', import.meta.url), 'utf8')
    expect(css).toMatch(/\.team-grid\s*\{[^}]*repeat\(3,\s*minmax\(0,\s*1fr\)\)/)
    expect(css).toMatch(/\.vlist-window\s*\{[^}]*repeat\(4,\s*minmax\(0,\s*1fr\)\)/)
    expect(css).toMatch(/\.codex-grid[^{]*\{[^}]*repeat\(4/)
    expect(css).not.toContain('minmax(148px')
  })

  it('draws welcome, warden and catch results as bottom sheets', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    const summary = emptySummary()
    summary.fights = 3
    const welcome = gameHtml(save, 'adventure', 1_000, pcQuery, dex, null, false, false, {
      kind: 'welcome', summary, countedMs: 60_000, rawMs: 60_000
    })
    expect(welcome).toContain('overlay-sheet')
    expect(welcome).toContain('data-sheet="swipe"')
    expect(welcome).toContain('Willkommen zurück')
    expect(welcome).toContain('class="sheet"')

    const caught = gameHtml(save, 'adventure', 1_000, pcQuery, dex, null, false, false, {
      kind: 'catch', species: 'm01', level: 5, place: 'team'
    })
    expect(caught).toContain('data-sheet="swipe"')
    expect(caught).toContain('Neu dabei!')

    const guard = gameHtml(save, 'adventure', 1_000, pcQuery, dex, null, false, false, {
      kind: 'guard', win: true, badge: 'Sonnenwappen', gold: 40, text: 'Wappen errungen.'
    })
    expect(guard).toContain('>Wächter<')
    expect(guard).toContain('>Sieg<')
    expect(guard).toContain('data-sheet="swipe"')
    expect(guard).not.toContain('place-items: center')

    const card = gameHtml(save, 'team', 1_000, pcQuery, dex, null, false, false, { kind: 'card', uid: save.team[0] })
    expect(card).toContain('sheet-full')
    expect(card).toContain('data-sheet="swipe"')
    expect(sheetShouldClose(SHEET_SWIPE, 1)).toBe(true)
    expect(sheetShouldClose(SHEET_SWIPE - 1, 1)).toBe(false)
    expect(sheetShouldClose(Math.ceil(SHEET_SWIPE / 3), 1 / 3)).toBe(true)
  })

  it('migrates an older saveVersion on velunor_v2 without dropping the profile', () => {
    const storage = memory()
    const save = beginAdventure('Ada', { skin: 3, hair: 1, color: 3 }, 'm02', 1_000)
    save.gold = 4321
    save.marks = 7
    save.badges = ['Sonnenwappen']
    const uid = save.team[0]
    save.mons[uid].lvl = 12
    save.mons[uid].shiny = true
    writeSave(storage, save)
    const raw = JSON.parse(storage.getItem(SAVE_KEY_V2) ?? '{}') as { saveVersion: number; gold: number }
    raw.saveVersion = 1
    raw.gold = 4321
    storage.setItem(SAVE_KEY_V2, JSON.stringify(raw))
    const loaded = loadAdventure(storage, 5_000)
    expect(SAVE_VERSION).toBe(8)
    expect(loaded?.v).toBe(2)
    expect(loaded?.saveVersion).toBe(8)
    expect(loaded?.name).toBe('Ada')
    expect(loaded?.look).toEqual({ skin: 3, hair: 1, color: 3 })
    expect(loaded?.gold).toBe(4321)
    expect(loaded?.marks).toBe(7)
    expect(loaded?.badges).toEqual(['Sonnenwappen'])
    expect(loaded?.team).toEqual([uid])
    expect(loaded?.mons[uid].species).toBe('m02')
    expect(loaded?.mons[uid].lvl).toBe(12)
    expect(loaded?.mons[uid].shiny).toBe(true)
    expect(loaded?.dex.m02.caught).toBe(1)
  })
})
