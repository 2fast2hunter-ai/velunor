import Phaser from 'phaser'
import { iconSprite } from './art'
import { prefs } from './session'

export const W = 1280
export const H = 720
export const FONT = 'Nunito, "Segoe UI", sans-serif'

export const INK = '#f6f1e7'
export const MUTED = '#b7c0d4'
export const GOLD = '#f0c14a'
export const GEM = '#8ecbff'
export const ESSENCE = '#e0b3ff'
export const TICKET = '#9dffc3'

let audio: AudioContext | null = null

export function sfx(kind: 'click' | 'win' | 'lose' | 'pull' | 'coin' = 'click'): void {
  if (!prefs.sound) return
  const Ctx = window.AudioContext
  if (!Ctx) return
  if (!audio) audio = new Ctx()
  if (audio.state === 'suspended') void audio.resume()
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  const notes: Record<typeof kind, [number, number]> = {
    click: [520, 0.05],
    coin: [880, 0.08],
    pull: [660, 0.12],
    win: [740, 0.16],
    lose: [220, 0.18]
  }
  const [freq, dur] = notes[kind]
  osc.type = kind === 'lose' ? 'sawtooth' : 'triangle'
  osc.frequency.value = freq
  gain.gain.value = 0.045
  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start()
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur)
  osc.stop(audio.currentTime + dur + 0.02)
}

export function text(
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size = 18,
  color = INK,
  origin: [number, number] = [0, 0]
): Phaser.GameObjects.Text {
  return scene.add.text(x, y, value, {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    fontStyle: '700',
    resolution: 2
  }).setOrigin(origin[0], origin[1])
}

export function panel(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, fill = 0x1b2438): void {
  g.fillStyle(0x090b14, 0.25)
  g.fillRoundedRect(x + 3, y + 5, w, h, 18)
  g.fillStyle(fill, 0.96)
  g.fillRoundedRect(x, y, w, h, 18)
  g.lineStyle(2, 0x8ea0cc, 0.55)
  g.strokeRoundedRect(x, y, w, h, 18)
}

export interface ButtonOpts {
  disabled?: boolean
  fill?: number
  color?: string
  size?: number
  /** Extra pixels around the visible button. Close controls need this under canvas scaling. */
  hitPad?: number
  icon?: string
}

export function button(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  onClick: () => void,
  opts: ButtonOpts = {}
): Phaser.GameObjects.Container {
  const root = scene.add.container(x, y)
  const g = scene.add.graphics()
  const fill = opts.disabled ? 0x3c445c : (opts.fill ?? 0xf0c14a)
  g.fillStyle(fill, 1)
  g.fillRoundedRect(-w / 2, -h / 2, w, h, 14)
  if (!opts.disabled) {
    g.lineStyle(2, 0xfff4cc, 0.35)
    g.strokeRoundedRect(-w / 2, -h / 2, w, h, 14)
  }
  const icon = opts.icon ? iconSprite(scene, -w / 2 + 22, 0, opts.icon, Math.min(28, h - 10)) : undefined
  const color = opts.disabled ? '#aeb6c9' : (opts.color ?? '#2a2112')
  const t = text(scene, icon ? 12 : 0, 0, label, opts.size ?? 18, color, [0.5, 0.5])
  root.add(icon ? [g, icon, t] : [g, t])
  if (opts.disabled) {
    root.setAlpha(0.45)
    const blocker = scene.add.rectangle(0, 0, w, h, 0xffffff, 0.001)
    blocker.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, w, h),
      Phaser.Geom.Rectangle.Contains
    )
    root.add(blocker)
    return root
  }
  const pad = opts.hitPad ?? 10
  const hitW = w + pad * 2
  const hitH = h + pad * 2
  const hit = scene.add.rectangle(0, 0, hitW, hitH, 0xffffff, 0.001)
  hit.setInteractive(
    new Phaser.Geom.Rectangle(0, 0, hitW, hitH),
    Phaser.Geom.Rectangle.Contains
  )
  hit.input!.cursor = 'pointer'
  let armed = false
  hit.on('pointerdown', () => { armed = true })
  hit.on('pointerout', () => { armed = false })
  hit.on('pointerup', () => {
    if (!armed) return
    armed = false
    sfx('click')
    onClick()
  })
  root.add(hit)
  return root
}

export function floatText(scene: Phaser.Scene, x: number, y: number, value: string, color = GOLD): void {
  const t = text(scene, x, y, value, 22, color, [0.5, 0.5]).setDepth(80)
  scene.tweens.add({
    targets: t,
    y: y - 48,
    alpha: 0,
    duration: 900,
    onComplete: () => t.destroy()
  })
}

export function openModal(
  scene: Phaser.Scene,
  w: number,
  h: number,
  title: string
): { root: Phaser.GameObjects.Container; close: () => void } {
  const root = scene.add.container(0, 0).setDepth(60)
  const dim = scene.add.rectangle(W / 2, H / 2, W, H, 0x07060f, 0.66)
  dim.setInteractive()
  const g = scene.add.graphics()
  panel(g, (W - w) / 2, (H - h) / 2, w, h, 0x1a2236)
  const titleText = text(scene, W / 2, (H - h) / 2 + 28, title, 26, GOLD, [0.5, 0])
  const close = () => root.destroy()
  const closer = button(scene, (W + w) / 2 - 52, (H - h) / 2 + 40, 64, 48, 'X', close, { fill: 0x3d4b6e, color: INK, size: 18, hitPad: 22 })
  root.add([dim, g, titleText, closer])
  return { root, close }
}

export function attachTip(
  scene: Phaser.Scene,
  zone: Phaser.GameObjects.GameObject,
  x: number,
  y: number,
  message: string,
  maxRight = W - 12
): void {
  let tip: Phaser.GameObjects.Container | undefined
  const hide = () => {
    tip?.destroy()
    tip = undefined
  }
  zone.on('pointerover', () => {
    hide()
    const body = text(scene, 0, 0, message, 14, INK, [0, 0])
    body.setWordWrapWidth(300)
    const width = Math.min(340, Math.max(180, body.width + 24))
    body.setWordWrapWidth(width - 24)
    const height = body.height + 20
    const left = Math.min(Math.max(12, x - width / 2), Math.max(12, maxRight - width))
    const top = Math.min(y + 28, H - height - 80)
    const holder = scene.add.container(left, top).setDepth(220)
    const g = scene.add.graphics()
    panel(g, 0, 0, width, height, 0x241848)
    body.setPosition(12, 10)
    holder.add([g, body])
    tip = holder
  })
  zone.on('pointerout', hide)
  zone.once('destroy', hide)
}

export function hoverTip(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  message: string
): Phaser.GameObjects.Rectangle {
  const zone = scene.add.rectangle(x, y, w, h, 0xffffff, 0.001).setDepth(180)
  zone.setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains)
  if (zone.input) zone.input.cursor = 'help'
  attachTip(scene, zone, x, y, message)
  return zone
}

export function confirm(scene: Phaser.Scene, message: string, onYes: () => void): void {
  const modal = openModal(scene, 560, 240, 'Sicher?')
  const body = text(scene, W / 2, H / 2 - 20, message, 18, INK, [0.5, 0.5])
  body.setWordWrapWidth(480)
  body.setAlign('center')
  const yes = button(scene, W / 2 - 90, H / 2 + 60, 150, 46, 'Ja', () => {
    modal.close()
    onYes()
  }, { fill: 0xe15b64, color: '#fff' })
  const no = button(scene, W / 2 + 90, H / 2 + 60, 150, 46, 'Nein', modal.close, { fill: 0x3d4b6e, color: INK })
  modal.root.add([body, yes, no])
}
