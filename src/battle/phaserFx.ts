import Phaser from 'phaser'
import { FxPool } from './fxPool'
import { arcHeight } from './stage'
import { effectScale, particleBudget, typeFx, type TypeFxDef } from './typeFx'

export interface FxBurst {
  type: TypeFxDef['type']
  crit: boolean
  band: 'strong' | 'weak' | 'neutral'
  awaken: boolean
  shimmer: boolean
  reduced: boolean
  tempo: number
  from: { x: number; y: number }
  to: { x: number; y: number }
  kind?: 'hit' | 'heal' | 'status'
}

interface Slot {
  dot: Phaser.GameObjects.Arc
  alive: boolean
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  color: number
}

class FxScene extends Phaser.Scene {
  gfx!: Phaser.GameObjects.Graphics
  slots: Slot[] = []
  burst: FxBurst | null = null
  started = 0
  hold = false
  holdAt = 0.45
  spawned = false

  constructor() {
    super('battle-fx')
  }

  create(): void {
    this.gfx = this.add.graphics()
    for (let i = 0; i < 60; i++) {
      const dot = this.add.circle(0, 0, 4, 0xffffff, 1)
      dot.setVisible(false)
      this.slots.push({ dot, alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, color: 0xffffff })
    }
  }

  play(next: FxBurst): void {
    this.burst = next
    this.started = this.time.now
    this.hold = false
    this.holdAt = 0.45
    this.spawned = false
    this.release()
  }

  freeze(at = 0.45): void {
    this.holdAt = at
    this.hold = true
  }

  release(): void {
    for (const slot of this.slots) {
      slot.alive = false
      slot.dot.setVisible(false)
    }
  }

  private spawn(n: number, x: number, y: number, color: number, spread: number, mode: 'out' | 'down' | 'up' | 'in'): void {
    let left = n
    let i = 0
    for (const slot of this.slots) {
      if (left <= 0) break
      if (slot.alive) continue
      const ang = (i / Math.max(1, n)) * Math.PI * 2
      const shimmer = this.burst?.shimmer && i % 4 === 0
      slot.alive = true
      slot.x = x
      slot.y = y
      if (mode === 'down') {
        slot.vx = Math.cos(ang) * spread * 0.35
        slot.vy = 18 + (i % 5) * 7
      } else if (mode === 'up') {
        slot.vx = Math.cos(ang) * spread * 0.45
        slot.vy = -28 - (i % 4) * 6
      } else if (mode === 'in') {
        slot.vx = -Math.cos(ang) * spread * 0.4
        slot.vy = -Math.sin(ang) * spread * 0.4
      } else {
        slot.vx = Math.cos(ang) * spread
        slot.vy = Math.sin(ang) * spread
      }
      slot.life = 1
      slot.max = 1
      slot.color = shimmer ? 0xffffff : color
      slot.dot.setFillStyle(slot.color, 1)
      slot.dot.setVisible(true)
      i += 1
      left -= 1
    }
  }

  private hex(value: string): number {
    return Phaser.Display.Color.HexStringToColor(value).color
  }

  private shadow(x: number, groundY: number, scale: number): void {
    this.gfx.fillStyle(0x000000, 0.25)
    this.gfx.fillEllipse(x, groundY, 28 * scale, 8)
  }

  private diamond(x: number, y: number, r: number, color: number, alpha: number): void {
    this.gfx.fillStyle(color, alpha)
    this.gfx.fillTriangle(x, y - r, x + r * 0.7, y, x, y + r)
    this.gfx.fillTriangle(x, y - r, x - r * 0.7, y, x, y + r)
  }

  update(time: number): void {
    if (!this.burst || !this.gfx) return
    const spec = typeFx(this.burst.type)
    const dur = Math.max(150, spec.travelMs / Math.max(1, this.burst.tempo))
    const age = this.hold ? dur * this.holdAt : time - this.started
    const t = Math.max(0, Math.min(1, age / dur))
    const scale = effectScale(this.burst.band, this.burst.crit, this.burst.awaken)
    const alpha = this.burst.band === 'weak' ? 0.5 : 0.95
    const base = this.hex(spec.base)
    const accent = this.hex(spec.accent)
    const { from, to } = this.burst
    const apex = spec.draw === 'bubble' ? 72 : spec.projectile ? 20 : 0
    const x = from.x + (to.x - from.x) * t
    const y = from.y + (to.y - from.y) * t - arcHeight(t, apex)
    const g = this.gfx
    g.clear()
    const kind = this.burst.kind ?? 'hit'
    if (kind === 'heal') this.drawHeal(from, base, scale)
    else if (kind === 'status') this.drawStatus(to, base, t)
    else this.drawForm(spec, t, x, y, scale, alpha, base, accent)
    if (kind === 'hit' && t > 0.72 && !this.spawned) {
      this.spawned = true
      const count = particleBudget(spec, { crit: this.burst.crit, tempo: this.burst.tempo, reduced: this.burst.reduced })
      const mode = spec.draw === 'orb' ? 'down' : spec.draw === 'void' ? 'in' : spec.draw === 'beam' || spec.draw === 'bubble' ? 'up' : 'out'
      this.spawn(count, to.x, to.y, accent, 36 * scale, mode)
    }
    for (const slot of this.slots) {
      if (!slot.alive) continue
      slot.life -= 0.03
      slot.x += slot.vx * 0.16
      slot.y += slot.vy * 0.16
      slot.dot.setPosition(slot.x, slot.y)
      slot.dot.setAlpha(Math.max(0, slot.life) * alpha)
      const shrink = spec.draw === 'orb' ? Math.max(0.4, slot.life) : 1
      slot.dot.setScale(shrink)
      if (slot.life <= 0) {
        slot.alive = false
        slot.dot.setVisible(false)
      }
    }
  }

  private drawHeal(from: { x: number; y: number }, base: number, scale: number): void {
    if (!this.spawned) {
      this.spawned = true
      this.spawn(8, from.x, from.y, base, 20 * scale, 'up')
    }
  }

  private drawStatus(to: { x: number; y: number }, base: number, t: number): void {
    this.gfx.fillStyle(base, Math.min(1, t * 2) * 0.9)
    this.diamond(to.x, to.y - 36, 10, base, Math.min(1, t * 2) * 0.9)
  }

  private drawForm(spec: TypeFxDef, t: number, x: number, y: number, scale: number, alpha: number, base: number, accent: number): void {
    const burst = this.burst
    if (!burst) return
    const { from, to } = burst
    const g = this.gfx
    const draw = spec.draw
    if (burst.awaken) {
      g.lineStyle(3, accent, 0.4)
      g.strokeCircle(x, y, 22 * scale)
    }
    if (draw === 'orb') {
      for (let i = 6; i >= 1; i--) {
        const p = Math.max(0, t - i * 0.05)
        const tx = from.x + (to.x - from.x) * p
        const ty = from.y + (to.y - from.y) * p - arcHeight(p, 20)
        g.fillStyle(accent, alpha * (1 - i / 8))
        g.fillCircle(tx, ty, Math.max(3, (14 - i * 1.5) * scale))
      }
      g.fillStyle(base, alpha)
      g.fillCircle(x, y, 16 * scale)
      this.shadow(x, to.y + 28, scale)
    } else if (draw === 'beam') {
      const width = (burst.crit ? 16 : 8) * scale
      g.lineStyle(width, base, alpha)
      g.beginPath()
      g.moveTo(from.x, from.y)
      for (let i = 1; i <= 10; i++) {
        const p = i / 10
        const wave = Math.sin(p * Math.PI * 5 + t * 6) * 7
        g.lineTo(from.x + (to.x - from.x) * p, from.y + (to.y - from.y) * p + wave)
      }
      g.strokePath()
    } else if (draw === 'swirl' || draw === 'swarm') {
      const n = draw === 'swarm' ? (burst.crit ? 20 : 10) : 8
      for (let i = 0; i < n; i++) {
        const p = (t + i / n) % 1
        const ang = p * Math.PI * 6 + i
        const tx = from.x + (to.x - from.x) * t + Math.cos(ang) * 16 * scale
        const ty = from.y + (to.y - from.y) * t + Math.sin(ang * 0.7) * 14 * scale
        if (draw === 'swirl') this.diamond(tx, ty, 7 * scale, i % 3 === 0 && burst.crit ? 0xf8bbd0 : base, alpha)
        else {
          g.fillStyle(i % 4 === 0 && burst.shimmer ? 0xffffff : base, alpha)
          g.fillCircle(tx, ty, 3 * scale)
        }
      }
      this.shadow(x, to.y + 28, scale)
    } else if (draw === 'ground') {
      g.lineStyle(4, base, alpha)
      g.beginPath()
      const gy = to.y + 24
      g.moveTo(from.x, gy)
      const bends = 6
      for (let i = 1; i <= bends; i++) {
        if (i / bends > t + 0.01) break
        g.lineTo(from.x + (to.x - from.x) * (i / bends), gy + (i % 2 === 0 ? 8 : -8))
      }
      g.strokePath()
    } else if (draw === 'sickle' || draw === 'arcs') {
      const n = burst.crit ? 5 : 3
      g.lineStyle(4, base, alpha)
      for (let i = 0; i < n; i++) {
        const p = Math.max(0, t - i * 0.08)
        const tx = from.x + (to.x - from.x) * p
        const ty = from.y + (to.y - from.y) * p - arcHeight(p, 20)
        g.beginPath()
        g.arc(tx, ty, 12 * scale, -0.8, 0.8, false)
        g.strokePath()
      }
      this.shadow(x, to.y + 28, scale)
    } else if (draw === 'shard' || draw === 'prism' || draw === 'rock' || draw === 'blade') {
      g.fillStyle(base, alpha)
      g.fillTriangle(x + 14 * scale, y, x - 8 * scale, y - 8 * scale, x - 8 * scale, y + 8 * scale)
      if (draw === 'prism') {
        g.lineStyle(2, 0xffee58, 0.8)
        g.strokeCircle(x, y, 8 * scale)
        g.lineStyle(2, accent, 0.8)
        g.strokeCircle(x, y, 12 * scale)
      }
      this.shadow(x, to.y + 28, scale)
    } else if (draw === 'bolt') {
      const bolts = burst.crit ? 3 : 2
      g.lineStyle(4, base, alpha)
      for (let b = 0; b < bolts; b++) {
        g.beginPath()
        g.moveTo(to.x + b * 10, 8)
        const bends = 4
        for (let i = 1; i <= bends; i++) {
          g.lineTo(to.x + (i % 2 === 0 ? 14 : -14) + b * 8, 8 + (to.y - 8) * (i / bends))
        }
        g.strokePath()
      }
    } else if (draw === 'bubble') {
      g.fillStyle(base, alpha * 0.85)
      g.fillCircle(x, y, 14 * scale)
      g.lineStyle(2, accent, alpha)
      g.strokeCircle(x, y - 4, 5 * scale)
      this.shadow(x, to.y + 28, scale)
    } else if (draw === 'pillar') {
      const width = (burst.crit ? 56 : 28) * scale
      g.fillStyle(base, alpha * 0.55)
      g.fillRect(to.x - width / 2, 0, width, to.y)
      if (burst.crit) {
        g.lineStyle(3, accent, 0.9)
        g.strokeLineShape(new Phaser.Geom.Line(to.x - 18, to.y - 40, to.x + 18, to.y - 40))
        g.strokeLineShape(new Phaser.Geom.Line(to.x, to.y - 58, to.x, to.y - 22))
      }
    } else if (draw === 'void' || draw === 'wisp') {
      const blink = draw === 'wisp' && Math.floor(t * 8) % 2 === 0 ? 0.35 : 1
      g.fillStyle(base, alpha * blink)
      g.fillCircle(x, y, 15 * scale)
      const ring = (1 - t) * 28 * scale + 8
      g.lineStyle(3, accent, alpha)
      g.strokeCircle(x, y, ring)
      this.shadow(x, to.y + 28, scale)
    } else if (draw === 'rings') {
      g.lineStyle(3, base, alpha)
      for (let i = 0; i < 3; i++) {
        const p = Math.max(0.05, t - i * 0.12)
        const cx = from.x + (to.x - from.x) * p
        const cy = from.y + (to.y - from.y) * p
        g.strokeCircle(cx, cy, (10 + i * 8) * scale)
      }
    } else if (draw === 'cone') {
      g.fillStyle(base, alpha * 0.35)
      g.fillTriangle(from.x, from.y - 10, to.x, to.y - 30 * scale, to.x, to.y + 30 * scale)
      g.fillStyle(accent, alpha * 0.45)
      g.fillTriangle(from.x, from.y, to.x, to.y - 16 * scale, to.x, to.y + 16 * scale)
      if (burst.crit) {
        g.lineStyle(3, accent, 0.9)
        g.strokeCircle(to.x, to.y - 46, 16 * scale)
        g.beginPath()
        g.moveTo(to.x - 18, to.y - 40)
        g.lineTo(to.x, to.y - 62)
        g.lineTo(to.x + 18, to.y - 40)
        g.strokePath()
      }
    } else if (draw === 'melee' || draw === 'claw') {
      const lines = draw === 'claw' ? (burst.crit ? 6 : 3) : (burst.crit ? 3 : 1)
      g.lineStyle(4, accent, alpha)
      for (let i = 0; i < lines; i++) {
        const ox = (i - 1) * 10
        g.strokeLineShape(new Phaser.Geom.Line(to.x - 20 + ox, to.y - 16, to.x + 16 + ox, to.y + 16))
      }
    }
    if (t > 0.72) this.drawImpact(spec, t, scale, alpha, base, accent)
  }

  private drawImpact(spec: TypeFxDef, t: number, scale: number, alpha: number, base: number, accent: number): void {
    const burst = this.burst
    if (!burst) return
    const grow = (t - 0.72) / 0.28
    const to = burst.to
    const g = this.gfx
    const radius = (spec.draw === 'orb' ? 48 : 28) * scale * Math.max(0.2, grow)
    g.lineStyle(4, accent, alpha * (1 - grow * 0.6))
    g.strokeCircle(to.x, to.y, radius)
    if (burst.crit) g.strokeCircle(to.x, to.y, radius * 1.35)
    if (spec.draw === 'orb' && burst.crit) {
      g.lineStyle(2, base, 0.35)
      g.strokeCircle(to.x, to.y, 20 + grow * 40)
    }
    if (spec.draw === 'beam') {
      g.fillStyle(base, alpha * (1 - grow))
      g.fillEllipse(to.x, to.y + 20, 36 * scale, 10)
    }
    if (spec.draw === 'melee') {
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2
        g.strokeLineShape(new Phaser.Geom.Line(to.x, to.y, to.x + Math.cos(ang) * 22 * scale, to.y + Math.sin(ang) * 22 * scale))
      }
    }
  }

}

let game: Phaser.Game | null = null
let scene: FxScene | null = null
const pool = new FxPool(60)

export function fxPoolSize(): number {
  return pool.allocated
}

export function mountBattleFx(parent: HTMLElement): void {
  if (game) {
    const canvas = game.canvas
    if (canvas.parentElement !== parent) parent.appendChild(canvas)
    game.scale.resize(parent.clientWidth || 640, parent.clientHeight || 360)
    return
  }
  game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent,
    width: parent.clientWidth || 640,
    height: parent.clientHeight || 360,
    transparent: true,
    banner: false,
    audio: { noAudio: true },
    scene: FxScene
  })
  game.events.once('ready', () => {
    scene = game?.scene.getScene('battle-fx') as FxScene
  })
}

export function playBattleFx(burst: FxBurst): void {
  if (game) {
    const parent = game.canvas.parentElement
    if (parent && parent.clientWidth > 0) game.scale.resize(parent.clientWidth, parent.clientHeight || 360)
  }
  pool.releaseAll()
  const spec = typeFx(burst.type)
  pool.acquire(particleBudget(spec, { crit: burst.crit, tempo: burst.tempo, reduced: burst.reduced }))
  const run = () => scene?.play(burst)
  if (scene) run()
  else game?.events.once('ready', run)
}

export function holdBattleFx(at = 0.45): void {
  scene?.freeze(at)
}

export function clearBattleFx(): void {
  pool.releaseAll()
  scene?.release()
}
