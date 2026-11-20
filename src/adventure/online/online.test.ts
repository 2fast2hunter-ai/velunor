import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { fitScale } from '../const'
import { beginAdventure } from '../save'
import { simulateOffline } from '../sim'
import { CREST_PACE_MS, REWARD_PACE_CAP, SPEED3_MS, auditSync, mayUploadSave, saveOwesCatchUp, stickAudit } from './check'
import { W_CAP, setRoadPace } from '../roadPace'
import { setRoadQueue } from '../battlePlayer'
import { resolveEncounter } from '../sim'
import { WELCOME_AFTER_MS } from '../const'
import { clearVelunorKeys, functionFailure } from './calls'
import { foldName, nameChangeAllowed, nameIssue, pickTag, planNameSave, publicLabel, NAME_CHANGE_MS } from './name'
import { hiddenByReports, reportReason } from './report'
import { auditFromSave } from './snapshot'

describe('sync check', () => {
  it('flags gold multiplied by 100 and accepts a normal 8 hour offline gap', () => {
    const start = 1_700_000_000_000
    const save = beginAdventure('Mira', { skin: 2, hair: 3, color: 1 }, 'm01', start)
    const before = auditFromSave(save)
    save.gold += 2_000_000
    save.lastSeenAt = start + 60_000
    expect(auditSync(before, auditFromSave(save)).flag).toBe(2)
    save.gold = before.gold
    save.lastSeenAt = start
    const honest = beginAdventure('Mira', { skin: 2, hair: 3, color: 1 }, 'm01', start)
    const prior = auditFromSave(honest)
    simulateOffline(honest, 8 * 60 * 60 * 1000, start + 8 * 60 * 60 * 1000)
    expect(auditSync(prior, auditFromSave(honest)).flag).toBe(0)
  })

  it('keeps flag 2 and the clean baseline, and judges earnings by the given window', () => {
    const start = 1_700_000_000_000
    const save = beginAdventure('Mira', { skin: 0, hair: 0, color: 0 }, 'm01', start)
    const clean = auditFromSave(save)
    save.gold += 2_000_000
    const cheated = auditFromSave(save)
    const first = stickAudit(0, clean, cheated, 60_000)
    expect(first.flag).toBe(2)
    expect(first.audit).toEqual(clean)
    const again = stickAudit(first.flag, first.audit, cheated, 60_000)
    expect(again.flag).toBe(2)
    expect(again.audit).toEqual(clean)
    const honest = beginAdventure('Mira', { skin: 0, hair: 0, color: 0 }, 'm01', start)
    const prior = auditFromSave(honest)
    simulateOffline(honest, 8 * 60 * 60 * 1000, start + 8 * 60 * 60 * 1000)
    const earned = auditFromSave(honest)
    expect(auditSync(prior, earned, 8 * 60 * 60 * 1000).flag).toBe(0)
    expect(auditSync(prior, earned, 1000).flag).toBe(2)
    expect(mayUploadSave(true)).toBe(false)
    expect(mayUploadSave(false)).toBe(true)
    expect(saveOwesCatchUp(start, start + WELCOME_AFTER_MS, WELCOME_AFTER_MS)).toBe(true)
    expect(saveOwesCatchUp(start, start + 1000, WELCOME_AFTER_MS)).toBe(false)
  })

  it('stays at flag 0 for 8 minutes, 1 hour and 8 hours, even after an early sync of the old save', () => {
    for (const minutes of [8, 60, 8 * 60]) {
      const ms = minutes * 60 * 1000
      const start = 1_700_000_000_000
      const save = beginAdventure('Mira', { skin: 0, hair: 0, color: 0 }, 'm01', start)
      const baseline = auditFromSave(save)
      const early = stickAudit(0, baseline, auditFromSave(save), ms)
      expect(early.flag, `${minutes} early`).toBe(0)
      expect(early.advanceClock, `${minutes} early`).toBe(false)
      expect(early.audit).toEqual(baseline)
      simulateOffline(save, ms, start + ms)
      const earnedSnap = auditFromSave(save)
      const earned = stickAudit(early.flag, early.audit, earnedSnap, ms)
      expect(earned.flag, `${minutes} earned`).toBe(0)
      expect(earned.reasons, `${minutes} earned`).not.toEqual(expect.arrayContaining(['chests', 'shards', 'gold', 'ep']))
      const rushed = stickAudit(0, baseline, earnedSnap, 2_000)
      expect(rushed.flag, `${minutes} rushed`).toBe(2)
    }
  })

  it('judges the first upload against a fresh account and the account age', () => {
    const start = 1_700_000_000_000
    const fresh = beginAdventure('Mira', { skin: 0, hair: 0, color: 0 }, 'm01', start)
    expect(auditSync(null, auditFromSave(fresh), 60_000, 0, start + 60_000).flag).toBe(0)
    const cheated = beginAdventure('Mira', { skin: 0, hair: 0, color: 0 }, 'm01', start)
    cheated.gold = 600_000
    cheated.badges = [
      'Kieselwappen', 'Wellenwappen', 'Funkenwappen', 'Moorwappen',
      'Felswappen', 'Sturmwappen', 'Frostwappen', 'Klingenwappen'
    ]
    const dumped = auditSync(null, auditFromSave(cheated), 60_000, 0, start + 60_000)
    expect(dumped.flag).toBe(2)
    expect(dumped.reasons).toEqual(expect.arrayContaining(['crests', 'gold']))
    const stuck = stickAudit(0, null, auditFromSave(cheated), 60_000)
    expect(stuck.flag).toBe(2)
    expect(stuck.advanceClock).toBe(false)
    expect(stuck.audit).toBeNull()
    const sql = readFileSync(new URL('../../../supabase/migrations/20261119010000_first_upload_audit.sql', import.meta.url), 'utf8')
    expect(sql).toContain('audit_implausible')
    expect(sql).toContain('set flag_level = 2')
    expect(sql).toContain(String(CREST_PACE_MS))
    expect(sql).not.toMatch(/delete from public\.profiles/i)
    expect(sql).not.toMatch(/delete from auth\.users/i)
    expect(sql).toContain('refresh materialized view public.leaderboard_rows')
  })

  it('accepts an honest speed-3 hour and still flags five times the old gold ceiling', () => {
    expect(REWARD_PACE_CAP).toBe(3.5)
    expect(REWARD_PACE_CAP).toBe(W_CAP)
    const hour = 60 * 60 * 1000
    const start = 1_700_000_000_000
    const steps = Math.ceil(hour / SPEED3_MS)
    const play = (paced: boolean) => {
      const save = beginAdventure('Mira', { skin: 0, hair: 0, color: 0 }, 'm01', start)
      save.rng = 11
      const before = auditFromSave(save)
      if (paced) {
        setRoadQueue(true)
        setRoadPace(true)
      } else {
        setRoadQueue(false)
        setRoadPace(false)
      }
      let now = start
      try {
        for (let i = 0; i < steps; i++) {
          now += SPEED3_MS
          try { resolveEncounter(save, now, { offline: false, trace: false }) } catch { /* a stuck gate ends the hour early */ }
        }
      } finally {
        setRoadQueue(null)
        setRoadPace(null)
      }
      return auditSync(before, auditFromSave(save), hour, 0, start + hour)
    }
    expect(play(false).flag).toBe(0)
    expect(play(true).flag).toBe(0)
    const level = 6
    const per = 25 * 3 * level * 1.25
    const crest = (1000 + 750 * level) * 1.25
    const unpaced = Math.ceil((steps * per + crest) * 1.2)
    const cheated = beginAdventure('Mira', { skin: 0, hair: 0, color: 0 }, 'm01', start)
    const prior = auditFromSave(cheated)
    cheated.gold += unpaced * 5
    const dumped = auditSync(prior, auditFromSave(cheated), hour, 0, start + hour)
    expect(dumped.flag).toBeGreaterThanOrEqual(1)
    expect(dumped.reasons).toContain('gold')
    const sql = readFileSync(new URL('../../../supabase/migrations/20261120140000_reward_pace_cap.sql', import.meta.url), 'utf8')
    expect(sql).toContain('audit_implausible')
    expect(sql).toContain('3.5')
    expect(sql).not.toMatch(/set flag_level/i)
    expect(sql).not.toMatch(/delete from/i)
    expect(sql).not.toContain('refresh materialized view')
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
    for (const blocked of ['f4ck', 'fvck', 'phuck', 'fuk', 'fuuuck', 'shiiit', '\u0455hit', 'Hitler', 'Arschloch', 'fuckyou', 'Hitlerfan', 'Hurensohn1', 'sh1t', 'n4z1', 's h i t', 'hur3ns0hn', 'Hurensohn']) {
      expect(nameIssue(blocked), blocked).toBe('word')
    }
    for (const allowed of ['Barsch', 'Marschall', 'Scunthorpe', 'Shitake', 'Harsch', 'Marsch', 'Fackel', 'Nazim', 'Fukuda', 'Yamashita']) {
      expect(nameIssue(allowed), allowed).toBeNull()
    }
    const hidden = { name: 'Testling', tag: '5544', hidden: true, changedAt: 5_000 }
    expect(planNameSave(hidden, 'Testling', 5_000 + 1000)).toEqual({ ok: false, error: 'wait' })
    expect(planNameSave(hidden, 'Testling', 5_000 + NAME_CHANGE_MS)).toEqual({ ok: true, hidden: true, same: true })
    expect(planNameSave(null, 'Mira', 5_000)).toEqual({ ok: true, hidden: false, same: false })
  })
})

describe('account cleanup', () => {
  it('reads a function error body and clears every local velunor key', async () => {
    const failure = await functionFailure({
      message: 'Edge Function returned a non-2xx status code',
      context: { json: async () => ({ error: 'wait' }) }
    })
    expect(failure).toEqual({ missing: false, error: 'wait' })
    expect(await functionFailure({ message: 'Failed to send a request to the Edge Function' })).toEqual({
      missing: true,
      error: 'Failed to send a request to the Edge Function'
    })
    expect(clearVelunorKeys(['velunor_v2', 'velunor_flag', 'sb-abc-auth-token', 'other'])).toEqual([
      'velunor_v2', 'velunor_flag', 'sb-abc-auth-token'
    ])
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
