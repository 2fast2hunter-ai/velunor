/** Step-1 timings and catch table. Chapter 4 numbers are intentionally absent. */

export const SAVE_KEY_V2 = 'velunor_v2'
export const SAVE_KEY_V1 = 'velunor.save.v1'

export const START_GOLD = 3000
export const STARTER_LEVEL = 5
export const TEAM_MAX = 6
/** Absolute level ceiling. Existing levels above it are kept. */
export const MAX_LEVEL = 280
/** Wins on the road after a warden loss before the next automatic try. */
export const RETRY_WINS = 10
export const LOG_LIMIT = 50
export const ACTION_LIMIT = 30
export const CATCH_CAP = 0.6
export const OFFLINE_EXP_FACTOR = 0.5
export const OFFLINE_LEVEL_CAP = 12
export const BUDDY_BONUS = 0.3
export const BENCH_EXP = 0.5

export const BASE_ENCOUNTER_MS = 2800
export const ENCOUNTER_MS = { 1: BASE_ENCOUNTER_MS, 2: 1400, 3: 930 } as const
export const OFFLINE_CAP_MS = 8 * 60 * 60 * 1000
export const WELCOME_AFTER_MS = 5 * 60 * 1000
export const AUTOSAVE_MS = 10_000
export const OFFLINE_BLOCK = 500

export const SEAL_SCALE_IN_MS = 250
export const SEAL_SPIN_MS = 2000
export const SEAL_FLAT_Y = 0.35
export const CAUGHT_SCALE = 1.3
export const SEAL_ADD = 'fx/fx_bannsiegel_add.jpg'
export const SEAL_FALLBACK = 'fx/fx_bannsiegel.png'
export const SEAL_BLEND = 'plus-lighter'

/** Feet sit on the open ground in the lower middle of the battle plate. */
export const ALLY_X = 28
export const FOE_X = 72
export const FEET_Y = 68

export const SCENE_FILES = {
  wiese: { webp: 'backgrounds/bg_gm_wiese.webp', jpg: 'backgrounds/bg_gm_wiese.jpg' },
  bach: { webp: 'backgrounds/bg_gm_bach.webp', jpg: 'backgrounds/bg_gm_bach.jpg' },
  wald: { webp: 'backgrounds/bg_gm_wald.webp', jpg: 'backgrounds/bg_gm_wald.jpg' }
} as const

export const CATCH_BASE = [0.6, 0.5, 0.4, 0.3, 0.22, 0.15, 0.1, 0.06, 0.04, 0.02] as const

export const STARTERS = [
  { id: 'm01', label: 'Funkfuchs' },
  { id: 'm02', label: 'Tropfmolch' },
  { id: 'm03', label: 'Knospling' }
] as const

export const HEAL_STEPS = [7, 14] as const
export const GUARDIAN_STEP = 20
export const PATH_LENGTH = 20

export type Speed = 1 | 2 | 3

export function encounterMs(speed: Speed): number {
  return ENCOUNTER_MS[speed]
}

export function tempoScale(speed: Speed): number {
  return encounterMs(speed) / BASE_ENCOUNTER_MS
}

/** No encounter progress for this long, and no dialog open, means the battle loop is stuck. */
export const WATCHDOG_MS = 10_000

export function watchdogLimit(speed: Speed): number {
  return WATCHDOG_MS * tempoScale(speed)
}

export function offlineEncounterCount(rawMs: number): number {
  if (!Number.isFinite(rawMs) || rawMs <= 0) return 0
  const counted = Math.min(rawMs, OFFLINE_CAP_MS)
  return Math.floor(counted / BASE_ENCOUNTER_MS)
}

export function debugAllowed(dev: boolean, search: string): boolean {
  if (!dev) return false
  return new URLSearchParams(search).get('debug') === '1'
}

export function assetPath(path: string, base = '/'): string {
  const prefix = base.endsWith('/') ? base : `${base}/`
  return `${prefix}assets/${path.replace(/^\//, '')}`
}
