import { ARC_APEX_PX, effectScale, HIT_FLASH_MS, HIT_SHAKE_PX, LUNGE_BACK_MS, LUNGE_HOLD_MS, LUNGE_OUT_MS, LUNGE_PX, LUNGE_SCALE } from './typeFx'

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
  const idle = idleBob(idleT)
  const base = side === 'foe' ? 0.72 : 1.05
  const dir = side === 'ally' ? 1 : -1
  const pose = koPose(ko)
  const x = lungeOffset(elapsed, distance) * dir + hitShake(hitAge)
  const y = idle.y + pose.drop
  const scale = base * idle.scale * lungeScale(elapsed) * (1 - pose.rotate / 400)
  return `translate(-50%, -100%) translate(${x}px, ${y}px) rotate(${pose.rotate}deg) scale(${scale})`
}

export function numberStyle(band: 'strong' | 'weak' | 'neutral', crit: boolean, awaken: boolean, base = '#ffffff'): { scale: number; color: string; label: string } {
  const scale = effectScale(band, crit, awaken)
  if (crit) return { scale: 1.5 * (awaken ? 1.15 : 1), color: '#ffd54f', label: 'KRIT' }
  if (band === 'strong') return { scale, color: base, label: 'Stark!' }
  if (band === 'weak') return { scale, color: '#9aa4b8', label: 'Schwach…' }
  return { scale, color: '#ffffff', label: '' }
}

export function parallaxShift(attack: number, shake: number): { far: number; mid: number; near: number } {
  const nudge = attack * 0.15 + shake
  return { far: nudge * 0.25, mid: nudge * 0.5, near: nudge }
}
