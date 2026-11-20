/** Display-only helpers. They do not change a fight result. */

export function hpNumbersOn(settings?: { showHpNumbers?: boolean } | null): boolean {
  return settings?.showHpNumbers !== false
}

export function hpLabel(hp: number, max: number): string {
  const left = Math.max(0, Math.round(hp))
  const full = Math.max(1, Math.round(max))
  return `${left} / ${full}`
}

export function typeEdge(mult: number): 'strong' | 'weak' | 'neutral' {
  if (mult > 1) return 'strong'
  if (mult < 1) return 'weak'
  return 'neutral'
}

/** Null when the weather does not change this hit. */
export function weatherPct(factor: number | undefined): string | null {
  if (factor == null || Math.abs(factor - 1) <= 0.001) return null
  const pct = Math.round((factor - 1) * 100)
  return `${pct > 0 ? '+' : ''}${pct} %`
}

/** Phone circle inside the small ult segment, in UI px. 0.36 scale stays at least 8 css px. */
export const ULT_SEGMENT_UI = 36
export const ULT_CIRCLE_UI = 24
