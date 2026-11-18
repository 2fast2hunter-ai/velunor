/** Player names. The same rules run in the client and in the set-name function. */

export const NAME_MIN = 3
export const NAME_MAX = 16
export const NAME_CHANGE_MS = 7 * 24 * 60 * 60 * 1000

const BLOCKED = [
  'arsch', 'fotze', 'hurensohn', 'missgeburt', 'nazi', 'neger', 'nigger',
  'faggot', 'fuck', 'fuk', 'fack', 'shit', 'bitch', 'cunt', 'retard', 'whore', 'hitler'
]

/** Whole names that merely contain a blocked piece and are still allowed. */
const ALLOWED = new Set([
  'barsch', 'marschall', 'scunthorpe', 'shitake',
  'harsch', 'marsch', 'fackel', 'nazim', 'fukuda', 'yamashita'
])

const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's'
}

/** Letters that look like Latin. Cyrillic and Greek lookalikes become the Latin letter. */
const HOMO: Record<string, string> = {
  '\u0430': 'a', '\u0410': 'a', '\u0435': 'e', '\u0415': 'e', '\u043e': 'o', '\u041e': 'o',
  '\u0440': 'p', '\u0420': 'p', '\u0441': 'c', '\u0421': 'c', '\u0443': 'y', '\u0423': 'y',
  '\u0445': 'x', '\u0425': 'x', '\u0456': 'i', '\u0406': 'i', '\u0455': 's', '\u0405': 's',
  '\u03bf': 'o', '\u039f': 'o', '\u03bd': 'v'
}

/** Lower case, leetspeak, then only letters, with long repeats folded to two. */
export function foldName(raw: string): string {
  return collapseRepeats(nameLetters(raw), 2)
}

function nameLetters(raw: string): string {
  const lower = raw.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '')
  const swapped = [...lower].map((ch) => HOMO[ch] ?? LEET[ch] ?? ch).join('')
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .replace(/ph/g, 'f')
    .replace(/v/g, 'u')
  return swapped.replace(/[^a-z]/g, '')
}

function collapseRepeats(letters: string, keep: number): string {
  return letters.replace(/(.)\1+/g, (run, ch: string) => ch.repeat(Math.min(keep, run.length)))
}

export function bannedWord(raw: string): boolean {
  const letters = nameLetters(raw)
  const forms = [collapseRepeats(letters, 2), collapseRepeats(letters, 1)]
  if (forms.some((form) => ALLOWED.has(form))) return false
  return forms.some((form) => BLOCKED.some((word) => form.includes(word)))
}

export function nameIssue(raw: string, max = NAME_MAX): 'short' | 'long' | 'chars' | 'word' | null {
  const name = raw.trim()
  if (name.length < NAME_MIN) return 'short'
  if (name.length > max) return 'long'
  if (!/^[\p{L}\p{N} ]+$/u.test(name)) return 'chars'
  if (bannedWord(name)) return 'word'
  return null
}

export interface StoredName {
  name: string
  tag: string
  hidden: boolean
  changedAt: number
}

/**
 * A hidden name stays hidden. Saving again, even the same letters, still waits out the 7 days.
 * The first save has no previous row and is allowed.
 */
export function planNameSave(existing: StoredName | null, nextName: string, now: number):
  | { ok: false, error: 'wait' }
  | { ok: true, hidden: boolean, same: boolean } {
  if (existing && !nameChangeAllowed(existing.changedAt, now)) return { ok: false, error: 'wait' }
  return { ok: true, hidden: Boolean(existing?.hidden), same: existing?.name === nextName.trim() }
}

export function nameChangeAllowed(changedAt: number | null, now: number): boolean {
  if (changedAt == null || !(changedAt > 0)) return true
  return now - changedAt >= NAME_CHANGE_MS
}

/** Four digits, unique for this name. `taken` lists tags already used by the same letters. */
export function pickTag(taken: readonly string[], rng: () => number): string | null {
  const used = new Set(taken)
  for (let i = 0; i < 40; i += 1) {
    const tag = String(Math.floor(rng() * 10000)).padStart(4, '0')
    if (!used.has(tag)) return tag
  }
  for (let n = 0; n < 10000; n += 1) {
    const tag = String(n).padStart(4, '0')
    if (!used.has(tag)) return tag
  }
  return null
}

export function publicLabel(name: string, tag: string, hidden: boolean): string {
  return hidden ? `Spieler#${tag}` : `${name}#${tag}`
}
