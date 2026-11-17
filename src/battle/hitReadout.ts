/** How a hit number is drawn. Crit wins over the type band. */
export type HitGrade = 'normal' | 'weak' | 'strong' | 'crit'

export type ImpactKind = 'hit' | 'ult'

export interface ImpactOpts {
  speed: number
  reduced: boolean
}

export interface HitLook {
  grade: HitGrade
  /** Relative to a normal number. */
  scale: number
  color: string
  /** Empty for a plain hit. */
  label: string
  bounce: boolean
}

export interface ShakeSpec {
  ms: number
  px: number
}

const LOOK: Record<HitGrade, HitLook> = {
  normal: { grade: 'normal', scale: 1, color: '#ffffff', label: '', bounce: false },
  weak: { grade: 'weak', scale: 0.8, color: '#9aa4b8', label: 'SCHWACH', bounce: false },
  strong: { grade: 'strong', scale: 1.2, color: '#ff8a3d', label: 'STARK', bounce: false },
  crit: { grade: 'crit', scale: 1.4, color: '#ffd54f', label: 'KRIT!', bounce: true }
}

/** Float time at tempo ×1. ×2 halves it, ×3 takes a third. */
export const NUMBER_FLOAT_MS = 600

const SHAKE: Record<'normal' | 'heavy' | 'ult', ShakeSpec> = {
  normal: { ms: 80, px: 4 },
  heavy: { ms: 120, px: 8 },
  ult: { ms: 200, px: 12 }
}

const HITSTOP = { heavy: 40, ult: 80 }

/**
 * public/assets/battle/dmg_digits.png + dmg_digits.json.
 * Frames n_/s_/k_/w_ plus lbl_krit, lbl_stark, lbl_schwach.
 * Next digit sits at x += width − advanceOverlap. Baseline is from the frame top.
 */
export const DIGIT_ATLAS_KEY = 'battle-digits'

export const DIGIT_STYLE = {
  n: { frameHeight: 82, baseline: 61, advanceOverlap: 5 },
  s: { frameHeight: 98, baseline: 72, advanceOverlap: 6 },
  k: { frameHeight: 114, baseline: 84, advanceOverlap: 7 },
  w: { frameHeight: 67, baseline: 49, advanceOverlap: 4 }
} as const

export type DigitStyleId = keyof typeof DIGIT_STYLE

export function digitStyle(grade: HitGrade): DigitStyleId {
  if (grade === 'strong') return 's'
  if (grade === 'crit') return 'k'
  if (grade === 'weak') return 'w'
  return 'n'
}

export function labelFrame(grade: HitGrade): string {
  if (grade === 'crit') return 'lbl_krit'
  if (grade === 'strong') return 'lbl_stark'
  if (grade === 'weak') return 'lbl_schwach'
  return ''
}

/** Side-by-side digits. `x` is the left edge; the next digit starts at width − advanceOverlap. */
export function layoutDigits(grade: HitGrade, amount: number, widths: Record<string, number>): { frame: string; x: number }[] {
  const styleId = digitStyle(grade)
  const overlap = DIGIT_STYLE[styleId].advanceOverlap
  const chars = String(Math.max(0, Math.floor(amount)))
  const placed: { frame: string; x: number }[] = []
  let x = 0
  for (const ch of chars) {
    const frame = `${styleId}_${ch}`
    placed.push({ frame, x })
    x += (widths[frame] ?? 0) - overlap
  }
  return placed
}

export function hitGrade(band: 'strong' | 'weak' | 'neutral', crit: boolean): HitGrade {
  if (crit) return 'crit'
  if (band === 'strong') return 'strong'
  if (band === 'weak') return 'weak'
  return 'normal'
}

export function hitLook(grade: HitGrade): HitLook {
  return LOOK[grade]
}

export function numberHoldMs(speed: number): number {
  const pace = speed === 2 || speed === 3 ? speed : 1
  return NUMBER_FLOAT_MS / pace
}

export function cameraShake(grade: HitGrade, kind: ImpactKind, opts: ImpactOpts): ShakeSpec {
  const base = kind === 'ult' ? SHAKE.ult : grade === 'crit' || grade === 'strong' ? SHAKE.heavy : SHAKE.normal
  if (opts.reduced || opts.speed >= 3) return { ms: base.ms, px: base.px * 0.5 }
  return { ...base }
}

/** Boss ultimate, for when that move exists. Same rules as a heavy hit, longer. */
export function bossUltShake(opts: ImpactOpts): ShakeSpec {
  return cameraShake('strong', 'ult', opts)
}

export function hitstopMs(grade: HitGrade, kind: ImpactKind, opts: ImpactOpts): number {
  if (opts.reduced || opts.speed >= 3) return 0
  if (kind === 'ult') return HITSTOP.ult
  if (grade === 'crit' || grade === 'strong') return HITSTOP.heavy
  return 0
}

export function bossUltHitstop(opts: ImpactOpts): number {
  return hitstopMs('strong', 'ult', opts)
}

export function digitAtlasReady(exists: (key: string) => boolean): boolean {
  return exists(DIGIT_ATLAS_KEY)
}

/** Frame names inside dmg_digits.json. */
export function digitFrames(grade: HitGrade, amount: number): { digits: string; word: string } {
  const placed = layoutDigits(grade, amount, {})
  return { digits: placed.map((item) => item.frame).join(' '), word: labelFrame(grade) }
}
