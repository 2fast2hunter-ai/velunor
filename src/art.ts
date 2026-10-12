import { rarityInfo, species, typeColor } from './data'
import type { TypeId } from './types'

export function monsterToken(
  scene: Phaser.Scene,
  x: number,
  y: number,
  speciesId: string,
  size = 72,
  rarity?: number
): Phaser.GameObjects.Container {
  const root = scene.add.container(x, y)
  const g = scene.add.graphics()
  const sp = species(speciesId)
  const color = Phaser.Display.Color.HexStringToColor(typeColor(sp.type)).color
  if (rarity != null) {
    const ring = Phaser.Display.Color.HexStringToColor(rarityInfo(rarity).color).color
    g.lineStyle(4, ring, 1)
    g.strokeCircle(0, 0, size * 0.56)
  }
  g.fillStyle(color, 1)
  drawBody(g, sp.id, size)
  root.add(g)
  return root
}

function drawBody(g: Phaser.GameObjects.Graphics, id: string, s: number): void {
  const u = s / 72
  if (id === 'm01') {
    g.fillEllipse(0, 6 * u, 40 * u, 28 * u)
    g.fillCircle(-8 * u, -8 * u, 14 * u)
    g.fillTriangle(-18 * u, -16 * u, -8 * u, -28 * u, -2 * u, -14 * u)
    g.fillTriangle(0, -14 * u, 8 * u, -28 * u, 12 * u, -12 * u)
    g.fillStyle(0xfff3e0, 1)
    g.fillEllipse(18 * u, 10 * u, 16 * u, 10 * u)
    g.fillStyle(0xffab40, 1)
    g.fillCircle(26 * u, 4 * u, 6 * u)
  } else if (id === 'm02') {
    g.fillEllipse(0, 4 * u, 46 * u, 26 * u)
    g.fillCircle(-16 * u, -2 * u, 10 * u)
    g.fillStyle(0xe3f2fd, 0.9)
    g.fillCircle(10 * u, -16 * u, 8 * u)
  } else if (id === 'm03') {
    g.fillStyle(0x2e7d32, 1)
    g.fillRoundedRect(-3 * u, 0, 6 * u, 22 * u, 3)
    g.fillStyle(0x66bb6a, 1)
    g.fillEllipse(0, -6 * u, 22 * u, 22 * u)
    g.fillStyle(0xa5d6a7, 1)
    g.fillEllipse(-14 * u, -2 * u, 16 * u, 8 * u)
    g.fillEllipse(14 * u, -2 * u, 16 * u, 8 * u)
  } else if (id === 'm04') {
    g.fillRoundedRect(-22 * u, -18 * u, 44 * u, 40 * u, 10)
    g.fillStyle(0x6d4c41, 1)
    g.fillCircle(-8 * u, -2 * u, 3 * u)
    g.fillCircle(8 * u, -2 * u, 3 * u)
    g.fillRoundedRect(-6 * u, 8 * u, 12 * u, 3 * u, 2)
  } else if (id === 'm05') {
    g.fillEllipse(4 * u, 4 * u, 48 * u, 18 * u)
    g.fillCircle(-16 * u, -2 * u, 10 * u)
    g.fillTriangle(16 * u, 0, 30 * u, -12 * u, 28 * u, 8 * u)
  } else if (id === 'm06') {
    g.fillCircle(0, 2 * u, 22 * u)
    g.fillStyle(0x1b5e20, 0.45)
    g.fillCircle(0, 2 * u, 12 * u)
    g.fillStyle(0x81c784, 1)
    g.fillCircle(-6 * u, 18 * u, 6 * u)
  } else if (id === 'm07') {
    g.fillEllipse(0, 2 * u, 36 * u, 22 * u)
    g.fillCircle(-14 * u, -4 * u, 9 * u)
    g.lineStyle(3, 0xbbdefb, 0.9)
    g.beginPath()
    g.arc(8 * u, 16 * u, 12 * u, Math.PI, 0, true)
    g.strokePath()
  } else if (id === 'm08') {
    g.fillCircle(-8 * u, 8 * u, 12 * u)
    g.fillCircle(8 * u, -2 * u, 11 * u)
    g.fillCircle(16 * u, -14 * u, 7 * u)
    g.fillStyle(0x3e2723, 1)
    g.fillCircle(18 * u, -16 * u, 2 * u)
  } else if (id === 'm09') {
    g.fillRoundedRect(-8 * u, -4 * u, 16 * u, 28 * u, 6)
    g.fillCircle(0, -14 * u, 12 * u)
    g.lineStyle(3, 0x4a148c, 1)
    g.beginPath()
    g.moveTo(-8 * u, 0)
    g.lineTo(-24 * u, -16 * u)
    g.moveTo(8 * u, 0)
    g.lineTo(24 * u, -12 * u)
    g.strokePath()
    g.fillStyle(0xce93d8, 1)
    g.fillCircle(-24 * u, -16 * u, 5 * u)
    g.fillCircle(24 * u, -12 * u, 5 * u)
  } else {
    g.fillEllipse(0, 4 * u, 20 * u, 26 * u)
    g.fillTriangle(-8 * u, 0, -34 * u, 12 * u, -6 * u, 14 * u)
    g.fillTriangle(8 * u, 0, 34 * u, 12 * u, 6 * u, 14 * u)
    g.fillTriangle(-4 * u, -16 * u, 0, -30 * u, 4 * u, -16 * u)
    g.fillStyle(0xfff8e1, 1)
    g.fillCircle(0, 2 * u, 5 * u)
  }
}

export function typeChip(scene: Phaser.Scene, x: number, y: number, type: TypeId, name: string): Phaser.GameObjects.Container {
  const root = scene.add.container(x, y)
  const g = scene.add.graphics()
  const color = Phaser.Display.Color.HexStringToColor(typeColor(type)).color
  g.fillStyle(color, 1)
  g.fillRoundedRect(0, 0, 92, 24, 8)
  const t = scene.add.text(46, 12, name, {
    fontFamily: 'Nunito, "Segoe UI", sans-serif',
    fontSize: '13px',
    color: '#1a120c',
    fontStyle: '700',
    resolution: 2
  }).setOrigin(0.5)
  root.add([g, t])
  return root
}
