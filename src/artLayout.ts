// Same document as public/assets/manifest.json. Vite will not import files from public/.
import manifest from './artManifest.json'

/** Wide silhouettes are drawn smaller so they stay inside the token slot. */
const MONSTER_SLOT_SCALE: Readonly<Record<string, number>> = {
  m01: 0.84,
  m10: 0.74
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

export function monsterTextureKey(speciesId: string, large = false): string {
  return large ? `monster-${speciesId}-lg` : `monster-${speciesId}`
}

export function buildingTextureKey(id: string, large = false): string {
  return large ? `building-${id}-lg` : `building-${id}`
}

export function assetUrl(relativePath: string, base = import.meta.env.BASE_URL): string {
  const prefix = base.endsWith('/') ? base : `${base}/`
  return `${prefix}assets/${relativePath.replace(/^\//, '')}`
}

type SizedArt = { readonly '512': string; readonly '256': string }

/** Queue monster and building PNGs. Frames and icons stay procedural. */
export function queueArt(load: { image: (key: string, url: string) => void }, base?: string): void {
  const monsters = manifest.monsters as Record<string, SizedArt>
  const buildings = manifest.buildings as Record<string, SizedArt>
  for (const [id, file] of Object.entries(monsters)) {
    load.image(monsterTextureKey(id), assetUrl(file['256'], base))
    load.image(monsterTextureKey(id, true), assetUrl(file['512'], base))
  }
  for (const [id, file] of Object.entries(buildings)) {
    load.image(buildingTextureKey(id), assetUrl(file['256'], base))
    load.image(buildingTextureKey(id, true), assetUrl(file['512'], base))
  }
}
