import { BASE_ENCOUNTER_MS, SAFE_H } from './const'
import type { FontScale } from './types'

/**
 * Touch polish for the portrait shell.
 * An unlock event is any moment a monster becomes available (a catch today,
 * a loot box later). Crests stay a separate pulse.
 */

export const FONT_SCALES = [100, 115, 130] as const
export const SWIPE_TABS = ['adventure', 'team', 'codex', 'activities', 'shop', 'achievements', 'options', 'guide'] as const
export type SwipeTab = (typeof SWIPE_TABS)[number]

/** Horizontal travel, in logical px, that changes the tab. */
export const SWIPE_MIN = 72
export const LONG_PRESS_MS = 480
/** Finger travel, in logical px, that cancels a long-press. */
export const LONG_PRESS_SLOP = 24

export const BATTERY_FPS = 30
export const FRAME_MS = 1000 / BATTERY_FPS

export type Presence = 'visible' | 'hidden' | 'locked'
export type HapticKind = 'unlock' | 'crest'

export function fontScale(value: unknown): FontScale {
  const n = typeof value === 'number' ? value : Number(value)
  if (n === 115 || n === 130) return n
  return 100
}

export function fontFactor(scale: FontScale): number {
  if (scale === 115) return 1.15
  if (scale === 130) return 1.3
  return 1
}

/** Header row grows with the type so two HUD lines still fit. */
export function headerRow(scale: FontScale): number {
  return Math.max(96, 96 * fontFactor(scale))
}

/** Two HUD lines plus the 6 px padding on each side. */
export function hudBlock(scale: FontScale): number {
  return 12 + 2 * 32 * fontFactor(scale) * 1.15
}

/** Two tab lines under the 72 px icon, inside the 180 px bar. */
export function tabBlock(scale: FontScale): number {
  return 16 + 72 + 6 + 26 * fontFactor(scale) * 1.15 * 2
}

export function logBlock(scale: FontScale): number {
  return 16 + 46 * fontFactor(scale) * 3
}

export function logRow(scale: FontScale): number {
  return Math.max(168, logBlock(scale))
}

/** Battle plate left after the chrome grows. The safe area stays 1920 px tall. */
export function battleRemainder(scale: FontScale): number {
  const top = headerRow(scale) + 132 + 120
  const bottom = 148 + logRow(scale) + 132 + 180
  return SAFE_H - top - bottom
}

export function swipeDirection(dx: number, dy: number, scale: number): -1 | 0 | 1 {
  const factor = scale > 0 ? scale : 1
  const logicalX = dx / factor
  const logicalY = dy / factor
  if (Math.abs(logicalX) < SWIPE_MIN) return 0
  if (Math.abs(logicalX) < Math.abs(logicalY) * 1.25) return 0
  return logicalX < 0 ? 1 : -1
}

export function nextTab(current: string, direction: -1 | 0 | 1, enabled: boolean): SwipeTab | null {
  if (!enabled || direction === 0) return null
  const index = SWIPE_TABS.indexOf(current as SwipeTab)
  if (index < 0) return null
  const next = index + direction
  if (next < 0 || next >= SWIPE_TABS.length) return null
  return SWIPE_TABS[next]
}

export function longPressCard(movedLogical: number, elapsedMs: number): boolean {
  return movedLogical <= LONG_PRESS_SLOP && elapsedMs >= LONG_PRESS_MS
}

/** One short tick. Catch and a future loot box both call this. */
export function hapticPattern(kind: HapticKind): number | number[] {
  if (kind === 'crest') return [18, 40, 28]
  return 22
}

export function requestHaptic(
  kind: HapticKind,
  enabled: boolean,
  vibrate: (pattern: number | number[]) => boolean
): boolean {
  if (!enabled) return false
  try {
    return vibrate(hapticPattern(kind)) !== false
  } catch {
    return false
  }
}

export function batteryPause(battery: boolean, presence: Presence): boolean {
  return battery && presence !== 'visible'
}

export function resumeGap(now: number, lastSeenAt: number): number {
  if (!Number.isFinite(now) || !Number.isFinite(lastSeenAt)) return 0
  return Math.max(0, Math.floor(now - lastSeenAt))
}

/** A gap shorter than one beat has nothing for the offline sim to resolve. */
export function shouldCatchUp(gapMs: number): boolean {
  return gapMs >= BASE_ENCOUNTER_MS
}

/** While the render loop is stopped, the absence clock must stay put. */
export function stampWhilePaused(lastSeenAt: number, now: number, paused: boolean): number {
  if (paused) return lastSeenAt
  return now
}

export function paintDue(now: number, lastPaint: number, battery: boolean): boolean {
  if (!battery) return true
  return now - lastPaint >= FRAME_MS - 0.5
}
