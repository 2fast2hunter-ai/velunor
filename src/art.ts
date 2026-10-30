import { rarityInfo, species, typeColor } from './data'
import {
  backgroundTextureKey,
  frameMonsterFit,
  frameTextureKey,
  ghostOverlayTextureKey,
  iconTextureKey,
  monsterSlotScale,
  monsterTextureKey
} from './artLayout'
import type { TypeId } from './types'

/**
 * Warm disc and rim behind a sprite on a dark card. The sprite file is unchanged.
 * Bergtitan keeps its own dark matte, so the glow stays off that one.
 */
function addReadableGlow(scene: Phaser.Scene, root: Phaser.GameObjects.Container, display: number): void {
  const glow = scene.add.graphics()
  glow.fillStyle(0xfff3e0, 0.28)
  glow.fillCircle(0, 0, display * 0.5)
  glow.fillStyle(0xfffaf3, 0.5)
  glow.fillCircle(0, 0, display * 0.36)
  const rim = Math.max(3, Math.round(display * 0.055))
  glow.lineStyle(rim, 0xfff6ea, 0.92)
  glow.strokeCircle(0, 0, display * 0.42)
  root.add(glow)
}

export function monsterToken(
  scene: Phaser.Scene,
  x: number,
  y: number,
  speciesId: string,
  size = 72,
  rarity?: number,
  dim = false,
  glow = false
): Phaser.GameObjects.Container {
  const root = scene.add.container(x, y)
  const slot = monsterSlotScale(speciesId)
  const framed = rarity != null && scene.textures.exists(frameTextureKey(rarity, size >= 160))
  const fit = framed ? frameMonsterFit(rarity) : 1
  const display = size * fit * slot
  const key = monsterTextureKey(speciesId, display >= 160)
  if (glow && speciesId !== 'm33') addReadableGlow(scene, root, display)
  // Bergtitan's snow is real transparency. A dark matte keeps that dust readable
  // when the sprite sits on a lighter plate or the arena stone.
  if (speciesId === 'm33') {
    const matte = scene.add.graphics()
    matte.fillStyle(dim ? 0x3c3a4a : 0x140e22, 1)
    matte.fillRoundedRect(-display / 2, -display / 2, display, display, display * 0.2)
    root.add(matte)
  }
  if (scene.textures.exists(key)) {
    const image = scene.add.image(0, 0, key)
    image.setDisplaySize(display, display)
    if (dim) {
      const outline = 0xf4f0e6
      for (const [ox, oy] of [[-2, 0], [2, 0], [0, -2], [0, 2]] as const) {
        const edge = scene.add.image(ox, oy, key)
        edge.setDisplaySize(display, display)
        edge.setTint(outline)
        root.add(edge)
      }
      image.setTint(0xd8d8e0)
    }
    root.add(image)
  } else {
    const g = scene.add.graphics()
    const color = dim ? 0xd0d0d8 : Phaser.Display.Color.HexStringToColor(typeColor(species(speciesId).type)).color
    g.fillStyle(color, 1)
    g.fillCircle(0, 0, display * 0.38)
    if (dim) {
      g.lineStyle(2, 0xf4f0e6, 1)
      g.strokeCircle(0, 0, display * 0.38)
    }
    root.add(g)
  }
  if (rarity != null) {
    const frameKey = frameTextureKey(rarity, size >= 160)
    if (dim) {
      const g = scene.add.graphics()
      g.lineStyle(3, 0xe6e2d8, 1)
      g.strokeRoundedRect(-size / 2 + 2, -size / 2 + 2, size - 4, size - 4, size * 0.16)
      root.add(g)
    } else if (scene.textures.exists(frameKey)) {
      const frame = scene.add.image(0, 0, frameKey)
      frame.setDisplaySize(size, size)
      root.add(frame)
    } else {
      const g = scene.add.graphics()
      const ring = Phaser.Display.Color.HexStringToColor(rarityInfo(rarity).color).color
      g.lineStyle(4, ring, 1)
      g.strokeCircle(0, 0, size * 0.56)
      root.add(g)
    }
  }
  return root
}

export function addGhostOverlay(token: Phaser.GameObjects.Container, scene: Phaser.Scene, size: number): void {
  const key = ghostOverlayTextureKey(size >= 160)
  if (!scene.textures.exists(key)) return
  token.add(scene.add.image(0, 0, key).setDisplaySize(size, size))
}

export function iconSprite(
  scene: Phaser.Scene,
  x: number,
  y: number,
  id: string,
  size = 28
): Phaser.GameObjects.Image | undefined {
  const key = iconTextureKey(id, size >= 96)
  if (!scene.textures.exists(key)) return undefined
  return scene.add.image(x, y, key).setDisplaySize(size, size)
}

export function paintBackground(scene: Phaser.Scene, id: 'city' | 'arena' | 'portal'): Phaser.GameObjects.Image | undefined {
  const key = backgroundTextureKey(`bg_${id}`)
  if (!scene.textures.exists(key)) return undefined
  return scene.add.image(0, 0, key).setOrigin(0, 0).setDisplaySize(1280, 720)
}

export function typeChip(scene: Phaser.Scene, x: number, y: number, type: TypeId, name: string): Phaser.GameObjects.Container {
  const root = scene.add.container(x, y)
  const g = scene.add.graphics()
  const color = Phaser.Display.Color.HexStringToColor(typeColor(type)).color
  g.fillStyle(color, 1)
  g.fillRoundedRect(0, 0, 92, 24, 8)
  const icon = iconSprite(scene, 16, 12, `type_${type}`, 16)
  const t = scene.add.text(icon ? 30 : 46, 12, name, {
    fontFamily: 'Nunito, "Segoe UI", sans-serif',
    fontSize: '13px',
    color: '#1a120c',
    fontStyle: '700',
    resolution: 2
  }).setOrigin(icon ? 0 : 0.5, 0.5)
  root.add(icon ? [g, icon, t] : [g, t])
  return root
}
