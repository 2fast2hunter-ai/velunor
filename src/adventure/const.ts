/** Step-1 timings and catch table. Chapter 4 numbers are intentionally absent. */

export const SAVE_KEY_V2 = 'velunor_v2'
/** Previous readable save. Used only when the current file cannot be read. */
export const SAVE_BACKUP = 'velunor_v2_backup'
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
export const BUDDY_BONUS = 0.3
/** Added to combat EP per rarity step. */
export const RARITY_EXP = 0.15
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

/** Own monster stands bottom left. The foe stands top right on the portrait plate. */
export const ALLY_X = 28
export const FOE_X = 72
export const FEET_Y = 86
export const FOE_Y = 44

/** Logical portrait base. Phaser and the DOM shell both use Scale FIT against this. */
export const SHELL_W = 1080
export const SHELL_H = 2340
/** Safe area in the middle. The bands above and below are background color. */
export const SAFE_W = 1080
export const SAFE_H = 1920
export const SHELL_BAND = (SHELL_H - SAFE_H) / 2
export const NAV_H = 180
/** 980 / 2340 is about 42% of the logical screen. The plates are this size. */
export const BATTLE_H = 980
export const TOUCH_MIN = 132
/**
 * Bumped once per portrait step. 1 = shell, 2 = portrait menus, 3 = touch polish, 4 = lootbox workshop, 5 = built avatar, 6 = anonymous account and server save.
 * Files written before this field load as 0 and keep every stored value.
 */
export const SAVE_VERSION = 6

export const SCENE_FILES = {
  wiese: { webp: 'backgrounds/bg_gm_wiese_p.webp', jpg: 'backgrounds/bg_gm_wiese_p.jpg' },
  bach: { webp: 'backgrounds/bg_gm_bach_p.webp', jpg: 'backgrounds/bg_gm_bach_p.jpg' },
  wald: { webp: 'backgrounds/bg_gm_wald_p.webp', jpg: 'backgrounds/bg_gm_wald_p.jpg' }
} as const

/** A handset held sideways. A desktop window stays in the portrait frame. */
export function phoneLandscape(width: number, height: number): boolean {
  return width > height && height <= 520
}

/** Same fit as Phaser Scale.FIT: the whole 1080×2340 base stays on screen. */
export function fitScale(width: number, height: number): number {
  if (!(width > 0) || !(height > 0)) return 1
  return Math.min(width / SHELL_W, height / SHELL_H)
}

/**
 * Empty device pixels under the painted tab bar.
 * The home-indicator inset is part of the bar, so only letterboxing remains.
 */
export function tabBarBottomGap(width: number, height: number): number {
  const scale = fitScale(width, height)
  return Math.max(0, (height - SHELL_H * scale) / 2)
}

export const CATCH_BASE = [0.6, 0.5, 0.4, 0.3, 0.22, 0.15, 0.1, 0.05, 0.03, 0.015] as const
/** Extra catch chance per failed seal of the same species, in percentage points. */
export const SEAL_PITY_STEP = 0.5
export const SEAL_PITY_CAP = 10

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

/** No encounter progress for this long, and no dialog open, means the battle loop is stuck. One attack is at most 1.2 s and a beat is 2.8 s, so this stays clear of a healthy fight. */
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
