import { describe, expect, it } from 'vitest'
import shipped from '../public/assets/manifest.json'
import manifest from './artManifest.json'
import { assetUrl, monsterSlotScale, queueArt } from './artLayout'

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
})

describe('art manifest', () => {
  it('ships ten monsters and three buildings', () => {
    expect(shipped).toEqual(manifest)
    expect(Object.keys(manifest.monsters)).toEqual([
      'm01', 'm02', 'm03', 'm04', 'm05', 'm06', 'm07', 'm08', 'm09', 'm10'
    ])
    expect(Object.keys(manifest.buildings)).toEqual(['townhall', 'goldmine', 'training'])
  })

  it('preloads monster and building sizes on the pages base path', () => {
    const queued: [string, string][] = []
    queueArt({ image: (key, url) => queued.push([key, url]) }, '/velunor/')
    expect(queued).toHaveLength(26)
    const url = Object.fromEntries(queued)
    expect(url['monster-m01']).toBe('/velunor/assets/monsters/m01_256.png')
    expect(url['monster-m01-lg']).toBe('/velunor/assets/monsters/m01.png')
    expect(url['monster-m10']).toBe('/velunor/assets/monsters/m10_256.png')
    expect(url['building-townhall-lg']).toBe('/velunor/assets/buildings/townhall.png')
    expect(url['building-goldmine-lg']).toBe('/velunor/assets/buildings/goldmine.png')
    expect(url['building-training-lg']).toBe('/velunor/assets/buildings/training.png')
    expect(queued.some(([key]) => key.startsWith('frame') || key.startsWith('icon'))).toBe(false)
    expect(assetUrl('monsters/m05_256.png', '/')).toBe('/assets/monsters/m05_256.png')
  })
})
