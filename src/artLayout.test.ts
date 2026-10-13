import { describe, expect, it } from 'vitest'
import shipped from '../public/assets/manifest.json'
import manifest from './artManifest.json'
import { assetUrl, backgroundTextureKey, frameMonsterFit, frameTextureKey, iconTextureKey, monsterSlotScale, queueArt } from './artLayout'

describe('monster slot scale', () => {
  it('insets the wide motifs and leaves the others at full size', () => {
    expect(monsterSlotScale('m01')).toBeLessThan(1)
    expect(monsterSlotScale('m01')).toBeGreaterThan(0.7)
    expect(monsterSlotScale('m10')).toBeLessThan(monsterSlotScale('m01'))
    expect(monsterSlotScale('m10')).toBeGreaterThan(0.6)
    for (const id of ['m02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09']) {
      expect(monsterSlotScale(id)).toBe(1)
    }
  })

  it('keeps the monster inside the frame, and smaller again for the thick borders', () => {
    expect(frameMonsterFit(0)).toBeCloseTo(0.7)
    expect(frameMonsterFit(4)).toBeCloseTo(0.7)
    expect(frameMonsterFit(6)).toBeLessThan(frameMonsterFit(0))
    expect(frameMonsterFit(9)).toBeLessThan(frameMonsterFit(0))
  })
})

describe('art manifest', () => {
  it('ships monsters, buildings, frames, icons, and backgrounds', () => {
    expect(shipped).toEqual(manifest)
    expect(Object.keys(manifest.monsters)).toHaveLength(10)
    expect(Object.keys(manifest.buildings)).toEqual(['townhall', 'goldmine', 'training'])
    expect(Object.keys(manifest.frames)).toHaveLength(10)
    expect(Object.keys(manifest.icons).length).toBeGreaterThan(20)
    expect(Object.keys(manifest.backgrounds)).toEqual(['bg_city', 'bg_arena', 'bg_portal'])
  })

  it('preloads every manifest image on the pages base path', () => {
    const queued: [string, string][] = []
    queueArt({ image: (key, url) => queued.push([key, url]) }, '/velunor/')
    const monsters = Object.keys(manifest.monsters).length
    const buildings = Object.keys(manifest.buildings).length
    const frames = Object.keys(manifest.frames).length
    const icons = Object.keys(manifest.icons).length
    const backgrounds = Object.keys(manifest.backgrounds).length
    expect(queued).toHaveLength(monsters * 2 + buildings * 2 + frames * 2 + icons * 2 + backgrounds)
    const url = Object.fromEntries(queued)
    expect(url['monster-m01']).toBe('/velunor/assets/monsters/m01_256.png')
    expect(url['building-townhall-lg']).toBe('/velunor/assets/buildings/townhall.png')
    expect(url[frameTextureKey(0)]).toBe('/velunor/assets/frames/rarity_0_256.png')
    expect(url[frameTextureKey(9, true)]).toBe('/velunor/assets/frames/rarity_9.png')
    expect(url[iconTextureKey('gold')]).toBe('/velunor/assets/icons/gold_128.png')
    expect(url[iconTextureKey('status_burn', true)]).toBe('/velunor/assets/icons/status_burn.png')
    expect(url[iconTextureKey('speed_1x')]).toBe('/velunor/assets/icons/speed_1x_128.png')
    expect(url[backgroundTextureKey('bg_city')]).toBe('/velunor/assets/backgrounds/bg_city.webp')
    expect(url[backgroundTextureKey('bg_arena')]).toBe('/velunor/assets/backgrounds/bg_arena.webp')
    expect(url[backgroundTextureKey('bg_portal')]).toBe('/velunor/assets/backgrounds/bg_portal.webp')
    expect(assetUrl('monsters/m05_256.png', '/')).toBe('/assets/monsters/m05_256.png')
  })
})
