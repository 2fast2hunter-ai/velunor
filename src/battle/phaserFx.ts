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
import { particleBudget, POOL_SIZE, typeFx, type TypeFxDef } from './typeFx'
import { effectTiming, hitBurstLook, hitStrip, projStrip, stripFrame, stripTexture } from './strips'
import type { TypeId } from '../types'

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
  proj!: Phaser.GameObjects.Image
  hitFx!: Phaser.GameObjects.Image
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
    const blank = this.blankKey()
    this.proj = this.add.image(0, 0, blank).setVisible(false).setOrigin(0.5, 0.5)
    this.hitFx = this.add.image(0, 0, blank).setVisible(false).setOrigin(0.5, 0.5)
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
    this.hideStrips()
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

  private diamond(x: number, y: number, r: number, color: number, alpha: number): void {
    this.gfx.fillStyle(color, alpha)
    this.gfx.fillTriangle(x, y - r, x + r * 0.7, y, x, y + r)
    this.gfx.fillTriangle(x, y - r, x - r * 0.7, y, x, y + r)
  }

  update(time: number): void {
    this.tickNumbers(time)
    if (!this.burst || !this.gfx) return
    const spec = typeFx(this.burst.type)
    const timing = effectTiming(this.burst.type, this.burst.tempo)
    const age = this.hold ? timing.totalMs * this.holdAt : time - this.started
    const { from, to } = this.burst
    const g = this.gfx
    g.clear()
    const kind = this.burst.kind ?? 'hit'
    const sparks = !this.burst.reduced && this.burst.tempo < 3
    if (kind === 'heal') {
      this.hideStrips()
      if (sparks) this.drawHeal(from, this.hex(spec.base), 1.4)
    } else if (kind === 'status') {
      this.hideStrips()
      this.drawStatus(to, this.hex(spec.base), Math.min(1, age / 200))
    } else this.drawStrip(age, timing.travelMs, timing.hitMs)
    if (kind === 'hit' && age >= timing.travelMs && !this.spawned) {
      this.spawned = true
      const count = particleBudget(spec, { crit: this.burst.crit, tempo: this.burst.tempo, reduced: this.burst.reduced })
      this.spawn(count, to.x, to.y, this.hex(spec.accent), 28, 'out')
    }
    for (const slot of this.slots) {
      if (!slot.alive) continue
      slot.life -= 0.012
      slot.x += slot.vx * 0.16
      slot.y += slot.vy * 0.16
      slot.dot.setPosition(slot.x, slot.y)
      slot.dot.setAlpha(Math.max(0, slot.life))
      slot.dot.setScale(Math.max(0.4, slot.life))
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

  private hideStrips(): void {
    this.proj.setVisible(false)
    this.hitFx.setVisible(false)
  }

  private drawStrip(age: number, travelMs: number, hitMs: number): void {
    const burst = this.burst
    if (!burst) return
    const flying = age < travelMs
    this.proj.setVisible(flying)
    this.hitFx.setVisible(!flying && age < travelMs + hitMs)
    if (flying) this.placeProj(age, travelMs)
    else if (age < travelMs + hitMs) this.placeHit(age - travelMs, hitMs)
  }

  private placeProj(age: number, travelMs: number): void {
    const burst = this.burst
    if (!burst) return
    const strip = projStrip(burst.type)
    const key = stripTexture(burst.type, 'proj')
    if (!this.textures.exists(key)) {
      this.proj.setVisible(false)
      return
    }
    const speed = strip.durationMs / Math.max(1, travelMs)
    const frame = stripFrame(strip.frames, strip.fps, age, strip.loop, speed)
    const t = travelMs <= 0 ? 1 : Math.max(0, Math.min(1, age / travelMs))
    const { from, to } = burst
    const dx = to.x - from.x
    const dy = to.y - from.y
    const dist = Math.hypot(dx, dy) || 1
    const angle = Math.atan2(dy, dx)
    const image = this.proj
    image.setTexture(key, frame).clearTint().setAlpha(1).setRotation(0).setFlipX(false)
    if (strip.kind === 'beam-tile' || (strip.kind === 'buildup' && burst.type === 'dragon')) {
      image.setOrigin(0, 0.5).setPosition(from.x, from.y).setRotation(angle)
      image.setScale(dist / strip.frameW, strip.kind === 'beam-tile' ? 1.35 : 1.6)
      return
    }
    if (strip.kind === 'buildup' && burst.type === 'earth') {
      const ground = Math.max(from.y, to.y) + 18
      image.setOrigin(0, 98 / strip.frameH).setPosition(from.x, ground).setRotation(angle)
      image.setScale(dist / strip.frameW, 1.25)
      return
    }
    if (strip.kind === 'buildup' || strip.kind === 'melee-overlay') {
      image.setOrigin(0.5, 0.72).setPosition(to.x, to.y).setScale(1.7)
      return
    }
    const x = from.x + dx * t
    const y = from.y + dy * t - arcHeight(t, 28)
    image.setOrigin(0.5, 0.5).setPosition(x, y).setScale(1.7).setFlipX(dx < 0)
  }

  private placeHit(age: number, hitMs: number): void {
    const burst = this.burst
    if (!burst) return
    const strip = hitStrip(burst.type)
    const key = stripTexture(burst.type, 'hit')
    if (!this.textures.exists(key)) {
      this.hitFx.setVisible(false)
      return
    }
    const speed = strip.durationMs / Math.max(1, hitMs)
    const frame = stripFrame(strip.frames, strip.fps, age, false, speed)
    const look = hitBurstLook(burst.band, burst.crit)
    this.hitFx.setTexture(key, frame).clearTint().setOrigin(0.5, 0.5)
    this.hitFx.setPosition(burst.to.x, burst.to.y).setScale(1.7 * look.scale).setAlpha(look.alpha).setRotation(0).setFlipX(false)
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

const stripQueue = new Set<TypeId>()
let stripLoading = false
const stripWaiters: (() => void)[] = []

function assetPrefix(): string {
  const base = import.meta.env.BASE_URL || '/'
  return base.endsWith('/') ? base : `${base}/`
}

function queueStrips(): void {
  if (!scene || stripLoading) return
  const pending = [...stripQueue].filter((type) => !scene?.textures.exists(stripTexture(type, 'proj')))
  if (!pending.length) {
    const waiters = stripWaiters.splice(0)
    waiters.forEach((done) => done())
    return
  }
  stripLoading = true
  const prefix = assetPrefix()
  for (const type of pending) {
    const proj = projStrip(type)
    const hit = hitStrip(type)
    scene.load.spritesheet(stripTexture(type, 'proj'), `${prefix}assets/battle/${proj.file}`, { frameWidth: proj.frameW, frameHeight: proj.frameH })
    scene.load.spritesheet(stripTexture(type, 'hit'), `${prefix}assets/battle/${hit.file}`, { frameWidth: hit.frameW, frameHeight: hit.frameH })
  }
  scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
    stripLoading = false
    queueStrips()
  })
  scene.load.start()
}

/** Loads proj_/hit_ for the monsters in this fight. Weather and KO sheets stay on disk for later. */
export function preloadBattleStrips(types: TypeId[], done?: () => void): void {
  for (const type of types) stripQueue.add(type)
  if (done) stripWaiters.push(done)
  const run = () => queueStrips()
  if (scene) run()
  else game?.events.once('ready', run)
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
