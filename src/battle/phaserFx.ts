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
import { particleBudget, POOL_SIZE, sharedParticleRoom, typeFx, type TypeFxDef } from './typeFx'
import { effectTiming, hideStripImages, hitBurstLook, hitStrip, oldestByBorn, projStrip, stripFrame, stripTexture } from './strips'
import type { TypeId } from '../types'
import type { WeatherId } from '../adventure/weather'

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
  ult?: boolean
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
  ring: Phaser.GameObjects.Arc
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
  moodImages: Phaser.GameObjects.Image[] = []
  dissolveFx!: Phaser.GameObjects.Image
  moodWeather: WeatherId | null = null
  moodReduced = false
  moodTempo = 1
  nextBolt = 0
  boltUntil = 0
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
    const sheet = (key: string, file: string, w: number, h: number) => {
      this.load.spritesheet(key, `${prefix}assets/battle/${file}`, { frameWidth: w, frameHeight: h })
    }
    sheet('wx-regen', 'weather_rain.png', 32, 32)
    sheet('wx-schnee', 'weather_snow.png', 32, 32)
    sheet('wx-nebel', 'weather_fog.png', 64, 64)
    sheet('wx-wind', 'weather_wind.png', 32, 32)
    sheet('wx-gewitter', 'weather_storm.png', 64, 64)
    sheet('fx-dissolve', 'dissolve.png', 128, 128)
    sheet('fx-confetti', 'confetti.png', 32, 32)
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
    this.dissolveFx = this.add.image(0, 0, blank).setVisible(false).setOrigin(0.5, 0.55)
    for (let i = 0; i < 24; i++) this.moodImages.push(this.add.image(0, 0, blank).setVisible(false))
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
    const ring = this.add.circle(0, -36, 54).setStrokeStyle(5, 0x78beff, 0.9).setFillStyle(0x78beff, 0.08).setVisible(false)
    const root = this.add.container(0, 0, [ring, text, label, ...glyphs])
    root.setVisible(false)
    return { root, text, glyphs, label, ring, active: false, born: 0, hold: 600, x: 0, y: 0, bounce: false }
  }

  spawnNumber(x: number, y: number, amount: number, grade: HitGrade, holdMs: number, weather = 1): void {
    let slot = this.numbers.find((row) => !row.active)
    if (!slot) slot = oldestByBorn(this.numbers)
    if (!slot) return
    slot.active = true
    slot.born = this.time.now
    slot.hold = holdMs
    slot.x = x
    slot.y = y
    slot.bounce = hitLook(grade).bounce
    slot.root.setVisible(true).setAlpha(1).setPosition(x, y)
    slot.ring.setVisible(weather !== 1)
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
    this.tickMood(time)
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
      this.spawn(Math.min(count, this.particleRoom()), to.x, to.y, this.hex(spec.accent), 28, 'out')
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
      this.spawn(Math.min(8, this.particleRoom()), from.x, from.y, base, 20 * scale, 'up')
    }
  }

  private drawStatus(to: { x: number; y: number }, base: number, t: number): void {
    this.gfx.fillStyle(base, Math.min(1, t * 2) * 0.9)
    this.diamond(to.x, to.y - 36, 10, base, Math.min(1, t * 2) * 0.9)
  }

  moodLive(): number {
    return this.moodImages.filter((image) => image.visible).length
  }

  /** Weather sheets and hit dots together stay at or under the pool of 40. */
  particleRoom(): number {
    const dots = this.slots.filter((slot) => slot.alive).length
    return sharedParticleRoom(this.moodLive(), dots)
  }

  beginMood(weather: WeatherId | null, reduced: boolean, tempo: number): void {
    this.moodWeather = weather
    this.moodReduced = reduced
    this.moodTempo = tempo
    this.nextBolt = this.time.now + 4000 + Math.random() * 2000
    if (reduced || tempo >= 3 || !weather || weather === 'klar') {
      for (const image of this.moodImages) image.setVisible(false)
    }
  }

  showDissolve(x: number, y: number, tint: number): void {
    if (!this.textures.exists('fx-dissolve')) return
    this.dissolveFx.setTexture('fx-dissolve', 0).setPosition(x, y).setScale(2.1).setVisible(true).setTint(tint).setAlpha(1)
    this.dissolveFx.setData('born', this.time.now)
  }

  showConfetti(tint: number): void {
    if (this.moodReduced || this.moodTempo >= 3 || !this.textures.exists('fx-confetti')) return
    let left = this.particleRoom()
    this.moodImages.forEach((image, index) => {
      if (left <= 0) return
      left -= 1
      const frame = index % 12
      image.setTexture('fx-confetti', frame).setVisible(true).setTint(tint).setAlpha(1)
      image.setPosition(140 + (index % 8) * 110, 80 + (index % 3) * 30)
      image.setData('vx', (index % 2 === 0 ? -1 : 1) * (20 + index % 5))
      image.setData('vy', -40 - (index % 6) * 8)
      image.setData('mode', 'confetti')
    })
  }

  private tickMood(time: number): void {
    const dissolveBorn = this.dissolveFx.getData('born') as number | undefined
    if (this.dissolveFx.visible && dissolveBorn != null) {
      const age = time - dissolveBorn
      const frame = Math.min(7, Math.floor(age / (571 / 8)))
      if (this.textures.exists('fx-dissolve')) this.dissolveFx.setFrame(frame)
      if (age > 571) this.dissolveFx.setVisible(false)
    }
    const quiet = this.moodReduced || this.moodTempo >= 3 || !this.moodWeather || this.moodWeather === 'klar'
    if (quiet) {
      if (!this.moodImages.some((image) => image.getData('mode') === 'confetti' && image.visible)) return
    }
    const weather = this.moodWeather
    const key = weather === 'regen' ? 'wx-regen' : weather === 'schnee' ? 'wx-schnee' : weather === 'nebel' ? 'wx-nebel' : weather === 'wind' ? 'wx-wind' : weather === 'gewitter' ? 'wx-gewitter' : ''
    this.moodImages.forEach((image, index) => {
      if (image.getData('mode') === 'confetti') {
        const vx = Number(image.getData('vx') ?? 0)
        const vy = Number(image.getData('vy') ?? 0) + 1.4
        image.setData('vy', vy)
        image.x += vx * 0.05
        image.y += vy * 0.08
        image.rotation += 0.04
        if (image.y > 1100) image.setVisible(false).setData('mode', '')
        return
      }
      if (quiet || !key || !this.textures.exists(key)) {
        image.setVisible(false)
        return
      }
      if (!image.visible) {
        if (this.particleRoom() <= 0) return
        if (this.moodLive() >= (weather === 'nebel' ? 8 : 16)) return
        image.setTexture(key, index % (weather === 'nebel' ? 3 : 4)).setVisible(true).clearTint()
        image.setPosition(Math.random() * 1080, weather === 'wind' ? 80 + Math.random() * 700 : -20)
        image.setData('vy', weather === 'schnee' ? 18 : weather === 'nebel' ? 6 : weather === 'wind' ? 0 : 70)
        image.setData('vx', weather === 'wind' ? 90 : weather === 'regen' ? 28 : weather === 'nebel' ? 16 : 8)
        image.setAlpha(weather === 'nebel' ? 0.4 : 0.9)
        image.setScale(weather === 'nebel' ? 2.4 : weather === 'gewitter' ? 1.4 : 1)
      }
      image.x += Number(image.getData('vx') ?? 0) * 0.05
      image.y += Number(image.getData('vy') ?? 0) * 0.05
      if (weather === 'schnee' || weather === 'wind') image.rotation += 0.02
      if (image.y > 1000 || image.x > 1200) image.setVisible(false)
    })
    if (weather === 'gewitter' && !quiet && time > this.nextBolt) {
      this.nextBolt = time + 4000 + Math.random() * 2000
      this.boltUntil = time + 100
      const flash = document.getElementById('crit-flash')
      if (flash) flash.style.opacity = '0.35'
    }
    if (this.boltUntil && time > this.boltUntil) {
      this.boltUntil = 0
      const flash = document.getElementById('crit-flash')
      if (flash && flash.style.opacity === '0.35') flash.style.opacity = '0'
    }
  }

  private hideStrips(): void {
    hideStripImages(this.proj, this.hitFx)
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
      // A missing sheet (wrong path or a 503) leaves the particle burst in place.
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
    const boost = () => { if (burst.ult) image.setScale(image.scaleX * 1.45, image.scaleY * 1.45) }
    image.setTexture(key, frame).clearTint().setAlpha(1).setRotation(0).setFlipX(false)
    if (strip.kind === 'beam-tile' || (strip.kind === 'buildup' && burst.type === 'dragon')) {
      image.setOrigin(0, 0.5).setPosition(from.x, from.y).setRotation(angle)
      image.setScale(dist / strip.frameW, strip.kind === 'beam-tile' ? 1.35 : 1.6)
      boost()
      return
    }
    if (strip.kind === 'buildup' && burst.type === 'earth') {
      const ground = Math.max(from.y, to.y) + 18
      image.setOrigin(0, 98 / strip.frameH).setPosition(from.x, ground).setRotation(angle)
      image.setScale(dist / strip.frameW, 1.25)
      boost()
      return
    }
    if (strip.kind === 'buildup' || strip.kind === 'melee-overlay') {
      image.setOrigin(0.5, 0.72).setPosition(to.x, to.y).setScale(1.7)
      boost()
      return
    }
    const x = from.x + dx * t
    const y = from.y + dy * t - arcHeight(t, 28)
    image.setOrigin(0.5, 0.5).setPosition(x, y).setScale(1.7).setFlipX(dx < 0)
    boost()
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
    this.hitFx.setPosition(burst.to.x, burst.to.y).setScale(1.7 * look.scale * (burst.ult ? 1.45 : 1)).setAlpha(look.alpha).setRotation(0).setFlipX(false)
  }


}

let game: Phaser.Game | null = null
let scene: FxScene | null = null
const pool = new FxPool(POOL_SIZE)

export function fxPoolSize(): number {
  return pool.allocated
}

let fxW = 0
let fxH = 0

function resizeFx(width: number, height: number): void {
  if (!game || width < 1 || height < 1) return
  if (width === fxW && height === fxH) return
  fxW = width
  fxH = height
  game.scale.resize(width, height)
}

export function mountBattleFx(parent: HTMLElement): void {
  const width = parent.clientWidth || 1080
  const height = parent.clientHeight || 980
  if (game) {
    const canvas = game.canvas
    if (canvas.parentElement !== parent) parent.appendChild(canvas)
    resizeFx(width, height)
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
    if (parent && parent.clientWidth > 0) resizeFx(parent.clientWidth, parent.clientHeight || 360)
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

export function beginBattleMood(weather: WeatherId | null, reduced: boolean, tempo: number): void {
  scene?.beginMood(weather, reduced, tempo)
}

export function showBattleDissolve(x: number, y: number, tint: number): void {
  scene?.showDissolve(x, y, tint)
}

export function showBattleConfetti(tint: number): void {
  scene?.showConfetti(tint)
}

export function showHitNumber(x: number, y: number, amount: number, grade: HitGrade, holdMs: number, weather = 1): boolean {
  if (!scene) return false
  scene.spawnNumber(x, y, amount, grade, holdMs, weather)
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
