// Same document as public/assets/manifest.json. Vite will not import files from public/.
import manifest from './artManifest.json'

/** Wide silhouettes are drawn smaller so they stay inside the token slot. */
const MONSTER_SLOT_SCALE: Readonly<Record<string, number>> = {
  m01: 0.84,
  m10: 0.74
}

/**
 * Monster side length as a fraction of the rarity frame.
 * The frame is a square with a transparent center. Rarity 6 and 9 use a thicker border.
 */
const FRAME_FIT: Readonly<Record<number, number>> = {
  6: 0.58,
  9: 0.58
}

/** Where the building base sits in the square texture, top = 0. */
export const BUILDING_FOOT: Readonly<Record<string, number>> = {
  townhall: 0.916,
  goldmine: 0.9,
  training: 0.857
}

export function monsterSlotScale(speciesId: string): number {
  return MONSTER_SLOT_SCALE[speciesId] ?? 1
}

export function frameMonsterFit(rarity: number): number {
  return FRAME_FIT[rarity] ?? 0.7
}

export function monsterTextureKey(speciesId: string, large = false): string {
  return large ? `monster-${speciesId}-lg` : `monster-${speciesId}`
}

export function buildingTextureKey(id: string, large = false): string {
  return large ? `building-${id}-lg` : `building-${id}`
}

export function frameTextureKey(rarity: number, large = false): string {
  return large ? `frame-${rarity}-lg` : `frame-${rarity}`
}

export function ghostOverlayTextureKey(large = false): string {
  return large ? 'frame-ghost-lg' : 'frame-ghost'
}

export function iconTextureKey(id: string, large = false): string {
  return large ? `icon-${id}-lg` : `icon-${id}`
}

export function backgroundTextureKey(id: string): string {
  return `bg-${id.replace(/^bg_/, '')}`
}

export function assetUrl(relativePath: string, base = import.meta.env.BASE_URL): string {
  const prefix = base.endsWith('/') ? base : `${base}/`
  return `${prefix}assets/${relativePath.replace(/^\//, '')}`
}

type SizedArt = { readonly '512': string; readonly '256': string }
type IconArt = {
  readonly '256'?: string
  readonly '128'?: string
  readonly '96'?: string
  readonly '64'?: string
  readonly '48'?: string
  readonly sheet?: string
  readonly frame?: readonly number[]
  readonly order?: readonly string[]
}
type BackgroundArt = { readonly jpg: string; readonly webp: string }

export interface ArtLoader {
  image: (key: string, url: string) => void
  spritesheet?: (key: string, url: string, config: { frameWidth: number; frameHeight: number }) => void
}

function iconPair(file: IconArt): [string, string] | null {
  if (file['256'] && file['128']) return [file['128'], file['256']]
  if (file['64'] && file['128']) return [file['64'], file['128']]
  if (file['48'] && file['96']) return [file['48'], file['96']]
  return null
}

/** Queue every image the manifest ships. Backgrounds prefer webp. */
export function queueArt(load: ArtLoader, base?: string): void {
  const monsters = manifest.monsters as Record<string, SizedArt>
  const buildings = manifest.buildings as Record<string, SizedArt>
  const frames = manifest.frames as Record<string, SizedArt>
  const icons = manifest.icons as Record<string, IconArt>
  const backgrounds = manifest.backgrounds as unknown as Record<string, BackgroundArt>
  for (const [id, file] of Object.entries(monsters)) {
    load.image(monsterTextureKey(id), assetUrl(file['256'], base))
    load.image(monsterTextureKey(id, true), assetUrl(file['512'], base))
  }
  for (const [id, file] of Object.entries(buildings)) {
    load.image(buildingTextureKey(id), assetUrl(file['256'], base))
    load.image(buildingTextureKey(id, true), assetUrl(file['512'], base))
  }
  for (const [id, file] of Object.entries(frames)) {
    if (id === 'ghost_overlay') {
      load.image(ghostOverlayTextureKey(), assetUrl(file['256'], base))
      load.image(ghostOverlayTextureKey(true), assetUrl(file['512'], base))
      continue
    }
    const rarity = Number(id)
    if (!Number.isInteger(rarity)) continue
    load.image(frameTextureKey(rarity), assetUrl(file['256'], base))
    load.image(frameTextureKey(rarity, true), assetUrl(file['512'], base))
  }
  for (const [id, file] of Object.entries(icons)) {
    if (file.sheet && file.frame && file.frame.length >= 2) {
      const config = { frameWidth: file.frame[0], frameHeight: file.frame[1] }
      if (load.spritesheet) load.spritesheet(iconTextureKey(id), assetUrl(file.sheet, base), config)
      else load.image(iconTextureKey(id), assetUrl(file.sheet, base))
      continue
    }
    const pair = iconPair(file)
    if (!pair) continue
    load.image(iconTextureKey(id), assetUrl(pair[0], base))
    load.image(iconTextureKey(id, true), assetUrl(pair[1], base))
  }
  for (const [id, file] of Object.entries(backgrounds)) {
    load.image(backgroundTextureKey(id), assetUrl(file.webp, base))
  }
}
