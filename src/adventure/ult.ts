/** B1. Charge lives only inside one fight. Level 25 unlocks it, not star rank. */
export const ULT_LEVEL = 25
export const ULT_SEGMENTS = 5
export const ULT_DAMAGE = 1.6
export const ULT_PIERCE = 0.3
/** One encounter is 2.8 s, so a 3 s wall covers every later hit in that fight. */
export const ULT_WALL_MS = 3000
export const ULT_WALL_CUT = 0.4
export const ULT_IMPULSE = 0.25
export const ULT_IMPULSE_ATTACKS = 4
export const ULT_HEAL = 0.25
export const ULT_BOSS_FETTER = 0.5

export const ULT_PATTERNS = ['durchschlag', 'schildwall', 'impuls', 'fessel', 'heilleucht'] as const
export type UltPattern = (typeof ULT_PATTERNS)[number]

const NAMES: Record<UltPattern, string> = {
  durchschlag: 'Durchschlag',
  schildwall: 'Schildwall',
  impuls: 'Impuls',
  fessel: 'Fessel',
  heilleucht: 'Heilleucht'
}

export function ultUnlocked(level: number): boolean {
  return level >= ULT_LEVEL
}

/** Even spread: m01 Durchschlag, then Schildwall, Impuls, Fessel, Heilleucht, and again. */
export function ultPattern(speciesId: string): UltPattern {
  const n = Number(speciesId.replace(/\D/g, '')) || 1
  return ULT_PATTERNS[(Math.max(1, n) - 1) % ULT_PATTERNS.length]
}

export function ultName(pattern: UltPattern): string {
  return NAMES[pattern]
}

export function gainUlt(level: number, charge: number, amount: number): number {
  if (!ultUnlocked(level)) return 0
  return Math.max(0, Math.min(ULT_SEGMENTS, charge + amount))
}

export function ultReady(level: number, charge: number): boolean {
  return ultUnlocked(level) && charge >= ULT_SEGMENTS
}
