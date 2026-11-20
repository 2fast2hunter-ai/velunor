import { hitGrade, hitLook } from './hitReadout'
import { ARC_APEX_PX, HIT_FLASH_MS, HIT_SHAKE_PX, LUNGE_BACK_MS, LUNGE_HOLD_MS, LUNGE_OUT_MS, LUNGE_PX, LUNGE_SCALE } from './typeFx'

export function lungeOffset(elapsed: number, distance = LUNGE_PX): number {
  const out = LUNGE_OUT_MS
  const hold = LUNGE_HOLD_MS
  const back = LUNGE_BACK_MS
  if (elapsed <= 0) return 0
  if (elapsed < out) return distance * (elapsed / out)
  if (elapsed < out + hold) return distance
  if (elapsed < out + hold + back) return distance * (1 - (elapsed - out - hold) / back)
  return 0
}

export function lungeScale(elapsed: number): number {
  const moving = elapsed > 0 && elapsed < LUNGE_OUT_MS + LUNGE_HOLD_MS + LUNGE_BACK_MS
  return moving ? LUNGE_SCALE : 1
}

/** Flat arc. Progress 0 and 1 sit on the ground, the middle rises by `apex`. */
export function arcHeight(progress: number, apex = ARC_APEX_PX): number {
  const t = Math.max(0, Math.min(1, progress))
  return Math.sin(t * Math.PI) * apex
}

export function hitShake(elapsed: number, px = HIT_SHAKE_PX): number {
  if (elapsed < 0 || elapsed > HIT_FLASH_MS * 2) return 0
  const flips = elapsed < HIT_FLASH_MS ? 1 : -1
  return px * flips * (1 - elapsed / (HIT_FLASH_MS * 2))
}

export function idleBob(timeMs: number): { y: number; scale: number } {
  const wave = Math.sin((timeMs / 900) * Math.PI * 2)
  return { y: wave * 3, scale: 1 + wave * 0.015 }
}

export function koPose(progress: number): { rotate: number; opacity: number; drop: number } {
  const t = Math.max(0, Math.min(1, progress))
  return { rotate: t * 96, opacity: 1 - t, drop: t * 70 }
}

export function actorTransform(side: 'ally' | 'foe', elapsed: number, hitAge: number, ko: number, idleT: number, distance = LUNGE_PX): string {
  return `translate(-50%, -100%) ${spriteMotion(side, elapsed, hitAge, ko, idleT, distance, false)}`
}

/** Lunge, bob and knockout on the sprite. The name and the HP number stay put. */
export function spriteMotion(side: 'ally' | 'foe', elapsed: number, hitAge: number, ko: number, idleT: number, distance = LUNGE_PX, flip = true): string {
  const idle = idleBob(idleT)
  const base = side === 'foe' ? 0.72 : 1.05
  const dir = side === 'ally' ? 1 : -1
  const pose = koPose(ko)
  const x = lungeOffset(elapsed, distance) * dir + hitShake(hitAge)
  const y = idle.y + pose.drop
  const scale = base * idle.scale * lungeScale(elapsed) * (1 - pose.rotate / 400)
  const face = flip && side === 'ally' ? ' scaleX(-1)' : ''
  return `translate(${x}px, ${y}px) rotate(${pose.rotate}deg) scale(${scale})${face}`
}

export function numberStyle(band: 'strong' | 'weak' | 'neutral', crit: boolean, _awaken = false, _base = '#ffffff'): { scale: number; color: string; label: string } {
  const look = hitLook(hitGrade(band, crit))
  return { scale: look.scale, color: look.color, label: look.label }
}

/** Extra shift that keeps a sprite of `spriteWidth` inside the field. */
export function clampShift(anchor: number, x: number, fieldWidth: number, spriteWidth: number, margin = 16): number {
  const half = Math.max(0, spriteWidth) / 2
  const min = margin + half
  const max = Math.max(min, fieldWidth - margin - half)
  return Math.max(min, Math.min(max, anchor + x)) - anchor
}

export function parallaxShift(attack: number, shake: number): { far: number; mid: number; near: number } {
  const nudge = attack * 0.15 + shake
  return { far: nudge * 0.25, mid: nudge * 0.5, near: nudge }
}
