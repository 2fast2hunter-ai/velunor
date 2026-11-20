/** First 30 minutes. Later screens hang off ONBOARDING_V1. The save field is always stored. */
export const ONBOARDING_V1 = true

export const ONBOARDING_CAP = 64

export const TUTORIAL_FIRST = 1
export const TUTORIAL_LAST = 16

/** Funnel marks. 8–14 stay free. 15 is a dismissed hint, 16 is “Hinweise aus”. */
export const TUTORIAL_STEP = {
  name: 1,
  starter: 2,
  started: 3,
  chestSeen: 4,
  team: 5,
  path: 6,
  daily: 7,
  hintDismiss: 15,
  hintsOff: 16
} as const

export const TUTORIAL_STEP_NUMBERS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] as const

export interface OnboardingState {
  v: 1
  done: boolean
  seen: string[]
  sent: number[]
  hintsOff: boolean
  lastHintAt: number
  /** Play time in ms. Missing files load as 0. The unlock card uses the first 15 minutes. */
  playMs: number
}

export function freshOnboarding(done = false): OnboardingState {
  return { v: 1, done, seen: [], sent: [], hintsOff: false, lastHintAt: 0, playMs: 0 }
}

/** An existing game skips the entrance once a crest or three species are in the codex. */
export function onboardingForExisting(started: boolean, badges: readonly string[], dexCount: number): OnboardingState {
  const done = Boolean(started && (badges.length >= 1 || dexCount >= 3))
  return freshOnboarding(done)
}

function uniqueCap(values: readonly (string | number)[], cap: number): (string | number)[] {
  const seen = new Set<string | number>()
  const out: (string | number)[] = []
  for (const value of values) {
    if (seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out.slice(-cap)
}

export function normalizeOnboarding(raw: unknown, started: boolean, badges: readonly string[], dexCount: number): OnboardingState {
  if (!raw || typeof raw !== 'object') return onboardingForExisting(started, badges, dexCount)
  const row = raw as Partial<OnboardingState>
  const seen: string[] = []
  if (Array.isArray(row.seen)) {
    for (const item of row.seen) {
      if (typeof item !== 'string') continue
      const text = item.trim().slice(0, 32)
      if (text) seen.push(text)
    }
  }
  const sent: number[] = []
  if (Array.isArray(row.sent)) {
    for (const item of row.sent) {
      const n = Math.floor(Number(item))
      if (n >= TUTORIAL_FIRST && n <= TUTORIAL_LAST) sent.push(n)
    }
  }
  return {
    v: 1,
    done: row.done === true,
    seen: uniqueCap(seen, ONBOARDING_CAP) as string[],
    sent: uniqueCap(sent, ONBOARDING_CAP) as number[],
    hintsOff: row.hintsOff === true,
    lastHintAt: Math.max(0, Math.floor(Number(row.lastHintAt)) || 0),
    playMs: Math.max(0, Math.min(48 * 60 * 60 * 1000, Math.floor(Number(row.playMs)) || 0))
  }
}

/** Remember a step in the save. A later smaller step is still new. A repeat is not. */
export function rememberTutorial(sent: readonly number[], step: number): { sent: number[], send: boolean } {
  const n = Math.floor(step)
  if (n < TUTORIAL_FIRST || n > TUTORIAL_LAST) return { sent: [...sent], send: false }
  if (sent.includes(n)) return { sent: [...sent], send: false }
  return { sent: [...sent, n].slice(-ONBOARDING_CAP), send: true }
}
