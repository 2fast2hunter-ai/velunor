import { rarityInfo, species, typeColor } from './data'
import { monsterSlotScale, monsterTextureKey } from './artLayout'
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
  if (rarity != null) {
    const ring = Phaser.Display.Color.HexStringToColor(rarityInfo(rarity).color).color
    g.lineStyle(4, ring, 1)
    g.strokeCircle(0, 0, size * 0.56)
  }
  root.add(g)
  const scale = monsterSlotScale(speciesId)
  const display = size * scale
  const key = monsterTextureKey(speciesId, display >= 160)
  if (scene.textures.exists(key)) {
    const image = scene.add.image(0, 0, key)
    image.setDisplaySize(display, display)
    root.add(image)
  } else {
    const color = Phaser.Display.Color.HexStringToColor(typeColor(species(speciesId).type)).color
    g.fillStyle(color, 1)
    g.fillCircle(0, 0, display * 0.38)
  }
  return root
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
