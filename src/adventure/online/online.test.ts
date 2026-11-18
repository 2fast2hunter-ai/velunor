import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { fitScale } from '../const'
import { beginAdventure } from '../save'
import { simulateOffline } from '../sim'
import { auditSync } from './check'
import { foldName, nameChangeAllowed, nameIssue, pickTag, publicLabel, NAME_CHANGE_MS } from './name'
import { hiddenByReports, reportReason } from './report'
import { auditFromSave } from './snapshot'

describe('sync check', () => {
  it('flags gold multiplied by 100 and accepts a normal 8 hour offline gap', () => {
    const start = 1_700_000_000_000
    const save = beginAdventure('Mira', { skin: 2, hair: 3, color: 1 }, 'm01', start)
    const before = auditFromSave(save)
    save.gold *= 100
    save.lastSeenAt = start + 60_000
    expect(auditSync(before, auditFromSave(save)).flag).toBe(2)
    save.gold = before.gold
    save.lastSeenAt = start
    const honest = beginAdventure('Mira', { skin: 2, hair: 3, color: 1 }, 'm01', start)
    const prior = auditFromSave(honest)
    simulateOffline(honest, 8 * 60 * 60 * 1000, start + 8 * 60 * 60 * 1000)
    expect(auditSync(prior, auditFromSave(honest)).flag).toBe(0)
  })

  it('rejects a clock turned back and a crest taken out of order', () => {
    const save = beginAdventure('Mira', { skin: 0, hair: 0, color: 0 }, 'm01', 5_000)
    const before = auditFromSave(save)
    save.lastSeenAt = 4_000
    expect(auditSync(before, auditFromSave(save)).reasons).toContain('clock')
    save.lastSeenAt = 5_000
    save.badges = ['Wellenwappen']
    expect(auditSync(before, auditFromSave(save)).flag).toBe(2)
  })
})

describe('player names', () => {
  it('accepts a plain name and rejects length, symbols, leetspeak and a fresh rename', () => {
    expect(nameIssue('Mira')).toBeNull()
    expect(nameIssue('ab')).toBe('short')
    expect(nameIssue('Velunor Spieler')).toBeNull()
    expect(nameIssue('dieser name ist zu lang')).toBe('long')
    expect(nameIssue('Mira!')).toBe('chars')
    expect(nameIssue('4r5ch')).toBe('word')
    expect(foldName('4r5ch')).toBe('arsch')
    expect(nameChangeAllowed(null, 10)).toBe(true)
    expect(nameChangeAllowed(1_000, 1_000 + NAME_CHANGE_MS - 1)).toBe(false)
    expect(nameChangeAllowed(1_000, 1_000 + NAME_CHANGE_MS)).toBe(true)
    expect(pickTag(['0001'], () => 0.00011)).toBe('0000')
    expect(pickTag(['0001'], () => 0.00021)?.length).toBe(4)
    expect(publicLabel('Mira', '1234', false)).toBe('Mira#1234')
    expect(publicLabel('Mira', '1234', true)).toBe('Spieler#1234')
  })
})

describe('reports', () => {
  it('hides a name after three different accounts and keeps the reason list', () => {
    const rows = [
      { reporter: 'a', target: 'z' },
      { reporter: 'a', target: 'z' },
      { reporter: 'b', target: 'z' }
    ]
    expect(hiddenByReports(rows, 'z')).toBe(false)
    expect(hiddenByReports([...rows, { reporter: 'c', target: 'z' }], 'z')).toBe(true)
    expect(reportReason('betrug')).toBe('betrug')
    expect(reportReason('spam')).toBeNull()
  })
})

describe('function bundles', () => {
  it('matches the committed Deno bundles', () => {
    execFileSync('node', ['scripts/build-functions.mjs', '--check'], {
      cwd: fileURLToPath(new URL('../../../', import.meta.url)),
      stdio: 'pipe'
    })
  })
})

describe('start layout fixes', () => {
  it('keeps the loading logo, the choose button and the consent buttons large enough', () => {
    const css = readFileSync(new URL('../adventure.css', import.meta.url), 'utf8')
    expect(css).toContain('aspect-ratio: 600 / 180')
    expect(css).toContain('#stage.is-entering .guard-card')
    expect(css).toMatch(/\.starter-choose\s*\{[^}]*min-height:\s*148px/)
    expect(css).toMatch(/\.starter-head \.home-back\s*\{[^}]*min-height:\s*148px/)
    expect(css).toMatch(/\.choice-row button\s*\{[^}]*min-height:\s*148px/)
    expect(css).toMatch(/\.choice-row button\s*\{[^}]*font-size:\s*48px/)
  })

  it('keeps sheet and account type readable at 390 px', () => {
    const css = readFileSync(new URL('../adventure.css', import.meta.url), 'utf8')
    const scale = fitScale(390, 844)
    const body = 44
    const title = 56
    const button = 48
    const height = 148
    expect(body * scale).toBeGreaterThanOrEqual(14)
    expect(title * scale).toBeGreaterThanOrEqual(18)
    expect(button * scale).toBeGreaterThanOrEqual(16)
    expect(height * scale).toBeGreaterThanOrEqual(48)
    expect(css).toMatch(/\.sheet, #cloud-layer, \.cloud-card \{ font-size: 44px; \}/)
    expect(css).toMatch(/\.sheet h2, #cloud-layer h2, \.is-menu \.cloud-card h2 \{ font-size: 56px;/)
    expect(css).toContain('font-size: 48px')
    expect(css).toContain('min-height: 148px')
    const view = readFileSync(new URL('../view.ts', import.meta.url), 'utf8')
    expect(view).toContain('class="cloud-block"')
    expect(view).toContain('for="player-target"')
  })
})
