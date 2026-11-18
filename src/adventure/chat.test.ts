import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  BURST_LIMIT,
  BURST_MS,
  CHAT_MAX,
  DAY_LIMIT,
  PAUSE_MS,
  REPORTS_PER_DAY,
  adultFromYear,
  canWrite,
  filterChat,
  pauseUntil,
  rateReason,
  reportLock,
  severeLock,
  triageReport
} from './chat'

const cases: { text: string, kind: 'ok' | 'mask' | 'severe' | 'contact' | 'length' }[] = [
  { text: 'Arsch', kind: 'severe' },
  { text: '4r5ch', kind: 'severe' },
  { text: 'a.r.s.c.h', kind: 'severe' },
  { text: 'arsch loch', kind: 'severe' },
  { text: 'fuck', kind: 'severe' },
  { text: 'f.u.c.k', kind: 'severe' },
  { text: 'fu ck', kind: 'severe' },
  { text: 'f*ck', kind: 'severe' },
  { text: 'F U C K', kind: 'severe' },
  { text: 'fuk', kind: 'severe' },
  { text: 'shit', kind: 'severe' },
  { text: 'bitch', kind: 'severe' },
  { text: 'nazi', kind: 'severe' },
  { text: 'n4z1', kind: 'severe' },
  { text: 'hurensohn', kind: 'severe' },
  { text: 'fotze', kind: 'severe' },
  { text: 'nigger', kind: 'severe' },
  { text: 'faggot', kind: 'severe' },
  { text: 'cunt', kind: 'severe' },
  { text: 'retard', kind: 'severe' },
  { text: 'whore', kind: 'severe' },
  { text: 'hitler', kind: 'severe' },
  { text: 'porn', kind: 'severe' },
  { text: 'p0rn', kind: 'severe' },
  { text: 'ada@example.com', kind: 'contact' },
  { text: 'test@mail.de', kind: 'contact' },
  { text: 'https://evil.example/x', kind: 'contact' },
  { text: 'http://evil.example', kind: 'contact' },
  { text: 'www.evil.example', kind: 'contact' },
  { text: 'schau auf evil.com bitte', kind: 'contact' },
  { text: '01711234567', kind: 'contact' },
  { text: '0171 123 4567', kind: 'contact' },
  { text: '+49 171 1234567', kind: 'contact' },
  { text: 'name at gmail dot com', kind: 'contact' },
  { text: 'so ein idiot', kind: 'mask' },
  { text: 'NOOB', kind: 'mask' },
  { text: 'dummkopf', kind: 'mask' },
  { text: 'blöd', kind: 'mask' },
  { text: 'hallo', kind: 'ok' },
  { text: 'Marschall', kind: 'ok' },
  { text: 'barsch', kind: 'ok' },
  { text: 'shitake', kind: 'ok' },
  { text: 'fackel', kind: 'ok' },
  { text: 'nazim', kind: 'ok' },
  { text: 'ich habe 12 gold', kind: 'ok' },
  { text: '', kind: 'length' },
  { text: 'a'.repeat(CHAT_MAX + 1), kind: 'length' },
  { text: 'a'.repeat(CHAT_MAX), kind: 'ok' },
  { text: 'gute nacht', kind: 'ok' },
  { text: 'bis morgen am teich', kind: 'ok' }
]

describe('chat filter', () => {
  it('covers fifty edge cases', () => {
    expect(cases).toHaveLength(50)
    for (const row of cases) {
      expect(filterChat(row.text).kind, row.text).toBe(row.kind)
    }
    const masked = filterChat('so ein idiot')
    expect(masked.kind === 'mask' && masked.text.includes('***')).toBe(true)
  })

  it('limits writing, rate, age and suggestions without deciding', () => {
    const now = 1_000_000
    expect(canWrite({ email: true, ageMs: 4 * 864e5, crests: 3, flag: 0, adult: true, chatOff: false, bannedUntil: 0, now })).toBe('ok')
    expect(canWrite({ email: false, ageMs: 4 * 864e5, crests: 3, flag: 0, adult: true, chatOff: false, bannedUntil: 0, now })).toBe('email')
    expect(canWrite({ email: true, ageMs: 864e5, crests: 3, flag: 0, adult: true, chatOff: false, bannedUntil: 0, now })).toBe('age')
    expect(canWrite({ email: true, ageMs: 4 * 864e5, crests: 2, flag: 0, adult: true, chatOff: false, bannedUntil: 0, now })).toBe('crests')
    expect(canWrite({ email: true, ageMs: 4 * 864e5, crests: 3, flag: 2, adult: true, chatOff: false, bannedUntil: 0, now })).toBe('flag')
    expect(canWrite({ email: true, ageMs: 4 * 864e5, crests: 3, flag: 1, adult: false, chatOff: false, bannedUntil: 0, now })).toBe('adult')
    expect(canWrite({ email: true, ageMs: 4 * 864e5, crests: 3, flag: 0, adult: true, chatOff: true, bannedUntil: 0, now })).toBe('off')
    expect(adultFromYear(2014, 2026)).toBe(false)
    expect(adultFromYear(2013, 2026)).toBe(true)
    const stamps = [now - 1000, now - 2000, now - 3000, now - 4000, now - 5000]
    expect(rateReason({ stamps, bodies: ['a', 'a', 'a', 'a', 'a'], pauseUntil: 0, now, text: 'b' })).toBe('burst')
    expect(rateReason({ stamps: Array.from({ length: DAY_LIMIT }, () => now - 60_000), bodies: [], pauseUntil: 0, now, text: 'b' })).toBe('day')
    expect(rateReason({ stamps: [now - 1000, now - 2000], bodies: ['hallo', 'hallo'], pauseUntil: 0, now, text: 'hallo' })).toBe('repeat')
    expect(rateReason({ stamps: [], bodies: [], pauseUntil: now + 10, now, text: 'hallo' })).toBe('pause')
    expect(pauseUntil(now) - now).toBe(PAUSE_MS)
    expect(BURST_LIMIT).toBe(5)
    expect(BURST_MS).toBe(10_000)
    expect(severeLock(3)).toBe(true)
    expect(severeLock(2)).toBe(false)
    expect(reportLock(5)).toBe(true)
    expect(REPORTS_PER_DAY).toBe(20)
    const suggestion = triageReport('minderjaehrig', 2)
    expect(suggestion.priority).toBe('hoch')
    expect(suggestion.note).toContain('Keine Entscheidung')
    expect(suggestion).not.toHaveProperty('decision')
  })

  it('keeps birth year out of the schema and limits retention', () => {
    const sql = readFileSync(new URL('../../supabase/migrations/20261118260000_schritt14_chat.sql', import.meta.url), 'utf8')
    expect(sql).toContain('adult boolean')
    expect(sql).not.toContain('birth_year')
    expect(sql).toContain("interval '30 days'")
    expect(sql).toContain("interval '90 days'")
    expect(sql).toContain('urgent_alerts')
    expect(sql).toContain('gelöschtes Konto')
    expect(sql).toContain('to service_role')
    expect(sql).not.toMatch(/insert into public\.admins/i)
  })
})
