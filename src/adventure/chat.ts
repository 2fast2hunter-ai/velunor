import { bannedChat } from './online/name'

export const CHAT_MAX = 200
export const BURST_LIMIT = 5
export const BURST_MS = 10_000
export const DAY_LIMIT = 200
export const REPEAT_LIMIT = 2
export const REPEAT_MS = 60_000
export const PAUSE_MS = 60_000
export const SEVERE_HITS = 3
export const SEVERE_BAN_MS = 24 * 60 * 60 * 1000
export const REPORT_BAN = 5
export const REPORT_BAN_MS = 7 * 24 * 60 * 60 * 1000
export const REPORTS_PER_DAY = 20
export const CONTEXT = 5
export const KEEP_MS = 30 * 24 * 60 * 60 * 1000
export const REPORTED_MS = 90 * 24 * 60 * 60 * 1000
export const WRITE_AGE_MS = 3 * 24 * 60 * 60 * 1000
export const WRITE_CRESTS = 3
export const ADULT_YEARS = 13

const MILD = ['idiot', 'noob', 'dummkopf', 'bloed', 'blod', 'dumm']

export type FilterResult =
  | { kind: 'ok', text: string }
  | { kind: 'mask', text: string }
  | { kind: 'severe' }
  | { kind: 'contact' }
  | { kind: 'length' }

export function adultFromYear(year: number, nowYear: number): boolean {
  if (!Number.isInteger(year) || year < 1900 || year > nowYear) return false
  return nowYear - year >= ADULT_YEARS
}

export function canWrite(input: {
  email: boolean
  ageMs: number
  crests: number
  flag: 0 | 1 | 2
  adult: boolean
  chatOff: boolean
  bannedUntil: number
  now: number
}): 'ok' | 'email' | 'age' | 'crests' | 'flag' | 'adult' | 'off' | 'ban' {
  if (input.chatOff) return 'off'
  if (!input.adult) return 'adult'
  if (input.bannedUntil > input.now) return 'ban'
  if (input.flag === 2) return 'flag'
  if (!input.email) return 'email'
  if (input.ageMs < WRITE_AGE_MS) return 'age'
  if (input.crests < WRITE_CRESTS) return 'crests'
  return 'ok'
}

export function filterChat(raw: string): FilterResult {
  const text = raw.trim()
  if (!text || text.length > CHAT_MAX) return { kind: 'length' }
  if (hasContact(text)) return { kind: 'contact' }
  if (bannedChat(text)) return { kind: 'severe' }
  const masked = maskMild(text)
  if (masked !== text) return { kind: 'mask', text: masked }
  return { kind: 'ok', text }
}

function hasContact(text: string): boolean {
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) return true
  if (/(https?:\/\/|www\.)\S+/i.test(text)) return true
  if (/\b[a-z0-9-]+\.(com|de|net|org|gg|io)\b/i.test(text)) return true
  if (/\b\w+\s+at\s+\w+\s+dot\s+\w+\b/i.test(text)) return true
  if (/(\d[\s().+\-]*){8,}/.test(text)) return true
  return /\b(?:insta|instagram|snapchat|snap|tiktok|telegram|whatsapp|discord|twitter|facebook|twitch|signal)\b\s*[:@]\s*@?[a-z0-9._]{2,}/i.test(text)
}

const CHAT_ERRORS = ['severe', 'contact', 'length', 'email', 'age', 'crests', 'flag', 'adult', 'off', 'ban', 'channel', 'burst', 'day', 'repeat', 'pause'] as const

export function chatErrorKey(code: string): string {
  return (CHAT_ERRORS as readonly string[]).includes(code) ? `chat.err.${code}` : 'chat.err.channel'
}

function maskMild(text: string): string {
  return text.replace(/[A-Za-zÄÖÜäöüß]+/g, (word) => {
    const flat = word.toLowerCase().replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    return MILD.some((mild) => flat.includes(mild)) ? '***' : word
  })
}

export function rateReason(input: {
  stamps: readonly number[]
  bodies: readonly string[]
  pauseUntil: number
  now: number
  text: string
}): 'ok' | 'burst' | 'day' | 'repeat' | 'pause' {
  if (input.pauseUntil > input.now) return 'pause'
  const burst = input.stamps.filter((stamp) => input.now - stamp < BURST_MS).length
  if (burst >= BURST_LIMIT) return 'burst'
  const day = input.stamps.filter((stamp) => input.now - stamp < 24 * 60 * 60 * 1000).length
  if (day >= DAY_LIMIT) return 'day'
  const same = input.bodies.filter((body, index) => body === input.text && input.now - input.stamps[index] < REPEAT_MS).length
  if (same >= REPEAT_LIMIT) return 'repeat'
  return 'ok'
}

export function pauseUntil(now: number): number {
  return now + PAUSE_MS
}

export function severeLock(hitsIn24h: number): boolean {
  return hitsIn24h >= SEVERE_HITS
}

export function reportLock(confirmed: number): boolean {
  return confirmed >= REPORT_BAN
}

export interface Triage {
  priority: 'hoch' | 'mittel' | 'niedrig'
  suggestion: 'verwarnen' | '24h' | '7tage' | 'dauerhaft' | 'keine'
  note: string
}

/** A suggestion only. This never writes a decision. */
export function triageReport(reason: string, repeats: number): Triage {
  const danger = reason === 'minderjaehrig' || reason === 'sexuell' || reason === 'hass'
  const priority = danger ? 'hoch' : reason === 'beleidigung' || reason === 'beleidigend' || reason === 'betrug' ? 'mittel' : 'niedrig'
  const suggestion = danger && repeats >= 2 ? 'dauerhaft' : danger ? '7tage' : repeats >= 3 ? '24h' : repeats >= 1 ? 'verwarnen' : 'keine'
  return { priority, suggestion, note: `Vorschlag: ${suggestion}. Keine Entscheidung.` }
}
