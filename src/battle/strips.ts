import manifest from '../../public/assets/battle/battle_fx.json'
import type { TypeId } from '../types'

/** One shared pool. Nothing past this stays on screen. */
export const FX_POOL_MAX = 40
/** A full attack effect at ×1, projectile plus hit burst. */
export const FX_MAX_MS = 700
/** Floor after the tempo split, for the whole effect. */
export const FX_MIN_MS = 150

export type StripKind = 'projectile-loop' | 'beam-tile' | 'buildup' | 'melee-overlay' | 'wave-loop' | 'hit'

interface StripFile {
  frame_w?: number
  frame_h?: number
  frames?: number
  fps?: number | null
  duration_ms?: number | null
  loop?: boolean
  kind?: string
  type?: string
}

export interface StripDef {
  file: string
  type: TypeId
  kind: StripKind
  frameW: number
  frameH: number
  frames: number
  fps: number
  durationMs: number
  loop: boolean
}

const FILES = manifest.files as Record<string, StripFile>

function asStrip(file: string, row: StripFile): StripDef | null {
  if (row.duration_ms == null || row.fps == null || !row.type || row.frame_w == null || row.frame_h == null || row.frames == null || row.loop == null || row.kind == null) return null
  if (row.kind !== 'projectile-loop' && row.kind !== 'beam-tile' && row.kind !== 'buildup' && row.kind !== 'melee-overlay' && row.kind !== 'wave-loop' && row.kind !== 'hit') return null
  return {
    file,
    type: row.type as TypeId,
    kind: row.kind,
    frameW: row.frame_w,
    frameH: row.frame_h,
    frames: row.frames,
    fps: row.fps,
    durationMs: row.duration_ms,
    loop: row.loop
  }
}

const STRIPS = Object.entries(FILES).flatMap(([file, row]) => {
  const strip = asStrip(file, row)
  return strip ? [strip] : []
})

export function projStrip(type: TypeId): StripDef {
  return STRIPS.find((row) => row.type === type && row.kind !== 'hit') ?? STRIPS[0]
}

export function hitStrip(type: TypeId): StripDef {
  return STRIPS.find((row) => row.type === type && row.kind === 'hit') ?? STRIPS[0]
}

export function stripTexture(type: TypeId, role: 'proj' | 'hit'): string {
  return `fx-${role}-${type}`
}

/** Projectile, then the hit burst. ×2 and ×3 divide it. Never under 150 ms, never over 700 ms at ×1. */
export function effectTiming(type: TypeId, tempo: number): { travelMs: number; hitMs: number; totalMs: number } {
  const travel = projStrip(type).durationMs
  const hit = hitStrip(type).durationMs
  const raw = Math.max(1, travel + hit)
  const pace = tempo === 2 || tempo === 3 ? tempo : 1
  const totalMs = Math.round(Math.max(FX_MIN_MS, Math.min(FX_MAX_MS, raw) / pace))
  const travelMs = Math.round(totalMs * (travel / raw))
  return { travelMs, hitMs: totalMs - travelMs, totalMs }
}

/** Strong ×1.3, weak ×0.7 at half alpha, crit ×1.4. The colours stay in the strip. */
export function hitBurstLook(band: 'strong' | 'weak' | 'neutral', crit: boolean): { scale: number; alpha: number } {
  if (crit) return { scale: 1.4, alpha: 1 }
  if (band === 'strong') return { scale: 1.3, alpha: 1 }
  if (band === 'weak') return { scale: 0.7, alpha: 0.5 }
  return { scale: 1, alpha: 1 }
}

/** Frame inside a horizontal strip. `speed` plays the sheet faster when the window is shorter. */
export function stripFrame(frames: number, fps: number, ageMs: number, loop: boolean, speed = 1): number {
  if (frames <= 1) return 0
  const frame = Math.floor((Math.max(0, ageMs) / 1000) * fps * Math.max(0.01, speed))
  if (loop) return frame % frames
  return Math.min(frames - 1, frame)
}

export function battleStripTypes(): TypeId[] {
  const seen: TypeId[] = []
  for (const row of STRIPS) {
    if (row.kind === 'hit') continue
    if (!seen.includes(row.type)) seen.push(row.type)
  }
  return seen
}
