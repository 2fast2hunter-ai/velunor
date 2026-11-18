/** Player names. The same rules run in the client and in the set-name function. */

export const NAME_MIN = 3
export const NAME_MAX = 16
export const NAME_CHANGE_MS = 7 * 24 * 60 * 60 * 1000

const BLOCKED = [
  'arsch', 'fotze', 'hurensohn', 'missgeburt', 'nazi', 'neger', 'nigger',
  'faggot', 'fuck', 'shit', 'bitch', 'cunt', 'retard', 'whore'
]

const LEET: Record<string, string> = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's'
}

/** Lower case, leetspeak, then only letters, with long repeats folded. */
export function foldName(raw: string): string {
  const lower = raw.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '')
  const swapped = [...lower].map((ch) => LEET[ch] ?? ch).join('')
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
  const letters = swapped.replace(/[^a-z]/g, '')
  return letters.replace(/(.)\1{2,}/g, '$1$1')
}

export function nameIssue(raw: string): 'short' | 'long' | 'chars' | 'word' | null {
  const name = raw.trim()
  if (name.length < NAME_MIN) return 'short'
  if (name.length > NAME_MAX) return 'long'
  if (!/^[\p{L}\p{N} ]+$/u.test(name)) return 'chars'
  const folded = foldName(name)
  if (BLOCKED.some((word) => folded.includes(foldName(word)))) return 'word'
  return null
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
