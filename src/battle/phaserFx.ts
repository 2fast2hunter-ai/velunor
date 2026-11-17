import Phaser from 'phaser'
import { FxPool } from './fxPool'
import { arcHeight } from './stage'
import {
  DIGIT_ATLAS_KEY,
  DIGIT_STYLE,
  digitAtlasReady,
  digitStyle,
  hitLook,
  labelFrame,
  layoutDigits,
  numberAlpha,
  type HitGrade
} from './hitReadout'
import { effectScale, flightMs, FX_SIZE, particleBudget, POOL_SIZE, typeFx, type TypeFxDef } from './typeFx'

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

const NUMBER_POOL = 8
const DIGIT_SLOTS = 6

interface NumberSlot {
  root: Phaser.GameObjects.Container
  text: Phaser.GameObjects.Text
  glyphs: Phaser.GameObjects.Image[]
  label: Phaser.GameObjects.Image
  active: boolean
  born: number
  hold: number
  x: number
  y: number
  bounce: boolean
}

class FxScene extends Phaser.Scene {
  gfx!: Phaser.GameObjects.Graphics
  slots: Slot[] = []
  numbers: NumberSlot[] = []
  burst: FxBurst | null = null
  started = 0
  hold = false
  holdAt = 0.45
  spawned = false

  constructor() {
    super('battle-fx')
  }

  preload(): void {
    const base = import.meta.env.BASE_URL || '/'
    const prefix = base.endsWith('/') ? base : `${base}/`
    this.load.atlas(
      DIGIT_ATLAS_KEY,
      `${prefix}assets/battle/dmg_digits.png`,
      `${prefix}assets/battle/dmg_digits.json`
    )
  }

  create(): void {
    this.gfx = this.add.graphics()
    for (let i = 0; i < POOL_SIZE; i++) {
      const dot = this.add.circle(0, 0, 8, 0xffffff, 1)
      dot.setVisible(false)
      this.slots.push({ dot, alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, color: 0xffffff })
    }
    for (let i = 0; i < NUMBER_POOL; i++) this.numbers.push(this.makeNumber())
  }

  private blankKey(): string {
    if (this.textures.exists('hit-blank')) return 'hit-blank'
    const gfx = this.make.graphics({ x: 0, y: 0 }, false)
    gfx.fillStyle(0xffffff, 0)
    gfx.fillRect(0, 0, 2, 2)
    gfx.generateTexture('hit-blank', 2, 2)
    gfx.destroy()
    return 'hit-blank'
  }

  private makeNumber(): NumberSlot {
    const text = this.add.text(0, 0, '', {
      fontFamily: 'Fredoka, Nunito, sans-serif',
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#1a1208',
      strokeThickness: 6,
      align: 'center'
    }).setOrigin(0.5, 1)
    const blank = this.blankKey()
    const glyphs = Array.from({ length: DIGIT_SLOTS }, () => this.add.image(0, 0, blank).setVisible(false).setOrigin(0, 0))
    const label = this.add.image(0, 0, blank).setVisible(false).setOrigin(0.5, 1)
    const root = this.add.container(0, 0, [text, label, ...glyphs])
    root.setVisible(false)
    return { root, text, glyphs, label, active: false, born: 0, hold: 600, x: 0, y: 0, bounce: false }
  }

  spawnNumber(x: number, y: number, amount: number, grade: HitGrade, holdMs: number): void {
    let slot = this.numbers.find((row) => !row.active)
    if (!slot) slot = this.numbers.reduce((oldest, row) => row.born < oldest.born ? row : oldest)
    slot.active = true
    slot.born = this.time.now
    slot.hold = holdMs
    slot.x = x
    slot.y = y
    slot.bounce = hitLook(grade).bounce
    slot.root.setVisible(true).setAlpha(1).setPosition(x, y)
    const atlas = digitAtlasReady((key) => this.textures.exists(key)) && this.textures.get(DIGIT_ATLAS_KEY).has('n_0')
    slot.glyphs.forEach((glyph) => glyph.setVisible(false))
    slot.label.setVisible(false)
    slot.text.setVisible(!atlas)
    if (!atlas) {
      const look = hitLook(grade)
      const line = look.label ? `${look.label}\n${Math.floor(amount)}` : String(Math.floor(amount))
      slot.text.setText(line)
      slot.text.setColor(look.color)
      slot.text.setFontSize(Math.round(48 * look.scale))
      return
    }
    const styleId = digitStyle(grade)
    const style = DIGIT_STYLE[styleId]
    const widths: Record<string, number> = {}
    const texture = this.textures.get(DIGIT_ATLAS_KEY)
    const placed = layoutDigits(grade, amount, new Proxy(widths, {
      get: (_target, frame: string) => texture.has(frame) ? texture.get(frame).width : 0
    }))
    const last = placed[placed.length - 1]
    const total = last ? last.x + (texture.has(last.frame) ? texture.get(last.frame).width : 0) : 0
    placed.forEach((item, index) => {
      const glyph = slot.glyphs[index]
      if (!glyph || !texture.has(item.frame)) return
      glyph.setTexture(DIGIT_ATLAS_KEY, item.frame).clearTint().setAlpha(1).setVisible(true).setPosition(-total / 2 + item.x, -style.baseline)
    })
    const word = labelFrame(grade)
    if (word && texture.has(word)) {
      slot.label.setTexture(DIGIT_ATLAS_KEY, word).clearTint().setAlpha(1).setVisible(true).setPosition(0, -style.frameHeight - 4)
    }
  }

  private tickNumbers(time: number): void {
    for (const slot of this.numbers) {
      if (!slot.active) continue
      const age = time - slot.born
      const t = slot.hold <= 0 ? 1 : age / slot.hold
      if (t >= 1) {
        slot.active = false
        slot.root.setVisible(false)
        continue
      }
      const rise = 90 * t
      const bounce = slot.bounce ? Math.sin(age / 70) * 10 * (1 - t) : 0
      slot.root.setPosition(slot.x, slot.y - rise + bounce)
      slot.root.setAlpha(numberAlpha(t))
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
    this.tickNumbers(time)
    if (!this.burst || !this.gfx) return
    const spec = typeFx(this.burst.type)
    const dur = flightMs(spec.travelMs, this.burst.tempo)
    const age = this.hold ? dur * this.holdAt : time - this.started
    const t = Math.max(0, Math.min(1, age / dur))
    const scale = effectScale(this.burst.band, this.burst.crit, this.burst.awaken) * FX_SIZE
    const alpha = this.burst.band === 'weak' ? 0.5 : 0.95
    const base = this.hex(spec.base)
    const accent = this.hex(spec.accent)
    const { from, to } = this.burst
    const apex = (spec.draw === 'bubble' ? 72 : spec.projectile ? 20 : 0) * FX_SIZE
    const x = from.x + (to.x - from.x) * t
    const y = from.y + (to.y - from.y) * t - arcHeight(t, apex)
    const g = this.gfx
    g.clear()
    const kind = this.burst.kind ?? 'hit'
    if (kind === 'heal') this.drawHeal(from, base, scale)
    else if (kind === 'status') this.drawStatus(to, base, t)
    else this.drawForm(spec, t, x, y, scale, alpha, base, accent)
    if (kind === 'hit' && t > 0.82 && !this.spawned) {
      this.spawned = true
      const count = particleBudget(spec, { crit: this.burst.crit, tempo: this.burst.tempo, reduced: this.burst.reduced })
      const mode = spec.draw === 'orb' ? 'down' : spec.draw === 'void' ? 'in' : spec.draw === 'beam' || spec.draw === 'bubble' ? 'up' : 'out'
      this.spawn(count, to.x, to.y, accent, 36 * scale, mode)
    }
    for (const slot of this.slots) {
      if (!slot.alive) continue
      slot.life -= 0.012
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
    if (t > 0.82) this.drawImpact(spec, t, scale, alpha, base, accent)
  }

  private drawImpact(spec: TypeFxDef, t: number, scale: number, alpha: number, base: number, accent: number): void {
    const burst = this.burst
    if (!burst) return
    const grow = (t - 0.82) / 0.18
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
const pool = new FxPool(POOL_SIZE)

export function fxPoolSize(): number {
  return pool.allocated
}

export function mountBattleFx(parent: HTMLElement): void {
  const width = parent.clientWidth || 1080
  const height = parent.clientHeight || 980
  if (game) {
    const canvas = game.canvas
    if (canvas.parentElement !== parent) parent.appendChild(canvas)
    game.scale.resize(width, height)
    return
  }
  game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent,
    transparent: true,
    banner: false,
    audio: { noAudio: true },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width,
      height
    },
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

export function showHitNumber(x: number, y: number, amount: number, grade: HitGrade, holdMs: number): boolean {
  if (!scene) return false
  scene.spawnNumber(x, y, amount, grade, holdMs)
  return true
}

export function onBattleFxReady(done: () => void): void {
  if (scene) done()
  else game?.events.once('ready', () => done())
}

export function clearBattleFx(): void {
  pool.releaseAll()
  scene?.release()
}

/** Caps or pauses the particle canvas. A limit under 60 turns Phaser's fps gate on. */
export function setFxRunning(running: boolean, fps: number): void {
  const loop = game?.loop as {
    fpsLimit?: number
    hasFpsLimit?: boolean
    _limitRate?: number
    sleep?: () => void
    wake?: () => void
  } | undefined
  if (!loop) return
  const limit = fps > 0 && fps < 60 ? fps : 0
  loop.fpsLimit = limit
  loop.hasFpsLimit = limit > 0
  loop._limitRate = limit > 0 ? 1000 / limit : 0
  try {
    if (running) loop.wake?.()
    else loop.sleep?.()
  } catch {
    /* the effect canvas is optional */
  }
}
