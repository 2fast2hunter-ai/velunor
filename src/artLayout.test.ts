import { describe, expect, it } from 'vitest'
import shipped from '../public/assets/manifest.json'
import manifest from './artManifest.json'
import { assetUrl, backgroundTextureKey, frameMonsterFit, frameTextureKey, ghostOverlayTextureKey, iconTextureKey, monsterSlotScale, queueArt } from './artLayout'

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
    expect(Object.keys(manifest.monsters)).toHaveLength(75)
    expect(Object.keys(manifest.buildings)).toEqual(['townhall', 'goldmine', 'training'])
    expect(Object.keys(manifest.frames).filter((id) => Number.isInteger(Number(id)))).toHaveLength(10)
    expect(manifest.frames.ghost_overlay['512']).toBe('frames/ghost_overlay.png')
    expect(manifest.frames.ghost_overlay['256']).toBe('frames/ghost_overlay_256.png')
    expect(manifest.icons.arena).toEqual({ '128': 'icons/arena.png', '64': 'icons/arena_64.png' })
    expect(manifest.icons.rank_bronze['48']).toBe('icons/rank_bronze.png')
    expect(manifest.icons.rank_bronze['96']).toBe('icons/rank_bronze_96.png')
    expect(manifest.icons.rank_sheet.order).toEqual(['bronze', 'silver', 'gold', 'platinum', 'diamond'])
    expect(manifest.icons.rank_diamond).toEqual({ '48': 'icons/rank_diamond.png', '96': 'icons/rank_diamond_96.png' })
    expect(manifest.icons.defense_shield).toEqual({ '128': 'icons/defense_shield.png', '64': 'icons/defense_shield_64.png' })
    expect(manifest.icons.catalog).toEqual({ '128': 'icons/catalog.png', '64': 'icons/catalog_64.png' })
    for (let id = 1; id <= 75; id++) {
      const key = `m${String(id).padStart(2, '0')}`
      expect(manifest.monsters[key as keyof typeof manifest.monsters]).toEqual({
        '512': `monsters/${key}.png`,
        '256': `monsters/${key}_256.png`
      })
    }
    expect(manifest.icons.rank_sheet.frame).toEqual([48, 48])
    expect(Object.keys(manifest.icons).length).toBeGreaterThan(20)
    expect(Object.keys(manifest.backgrounds)).toEqual(['bg_city', 'bg_arena', 'bg_portal'])
  })

  it('preloads every manifest image on the pages base path', () => {
    const queued: [string, string][] = []
    const sheets: [string, string, number, number][] = []
    queueArt({
      image: (key, url) => queued.push([key, url]),
      spritesheet: (key, url, config) => sheets.push([key, url, config.frameWidth, config.frameHeight])
    }, '/velunor/')
    const monsters = Object.keys(manifest.monsters).length
    const buildings = Object.keys(manifest.buildings).length
    const frames = Object.keys(manifest.frames).length
    const icons = Object.keys(manifest.icons).length
    const backgrounds = Object.keys(manifest.backgrounds).length
    expect(queued).toHaveLength(monsters * 2 + buildings * 2 + frames * 2 + (icons - 1) * 2 + backgrounds)
    expect(sheets).toEqual([[iconTextureKey('rank_sheet'), '/velunor/assets/icons/rank_sheet.png', 48, 48]])
    const url = Object.fromEntries(queued)
    expect(url['monster-m01']).toBe('/velunor/assets/monsters/m01_256.png')
    expect(url['building-townhall-lg']).toBe('/velunor/assets/buildings/townhall.png')
    expect(url[frameTextureKey(0)]).toBe('/velunor/assets/frames/rarity_0_256.png')
    expect(url[frameTextureKey(9, true)]).toBe('/velunor/assets/frames/rarity_9.png')
    expect(url[iconTextureKey('gold')]).toBe('/velunor/assets/icons/gold_128.png')
    expect(url[iconTextureKey('status_burn', true)]).toBe('/velunor/assets/icons/status_burn.png')
    expect(url[iconTextureKey('speed_1x')]).toBe('/velunor/assets/icons/speed_1x_128.png')
    expect(url[ghostOverlayTextureKey()]).toBe('/velunor/assets/frames/ghost_overlay_256.png')
    expect(url[ghostOverlayTextureKey(true)]).toBe('/velunor/assets/frames/ghost_overlay.png')
    expect(url[iconTextureKey('arena')]).toBe('/velunor/assets/icons/arena_64.png')
    expect(url[iconTextureKey('arena', true)]).toBe('/velunor/assets/icons/arena.png')
    expect(url[iconTextureKey('rank_gold')]).toBe('/velunor/assets/icons/rank_gold.png')
    expect(url[iconTextureKey('rank_gold', true)]).toBe('/velunor/assets/icons/rank_gold_96.png')
    expect(url[iconTextureKey('rank_silver')]).toBe('/velunor/assets/icons/rank_silver.png')
    expect(url[iconTextureKey('rank_platinum', true)]).toBe('/velunor/assets/icons/rank_platinum_96.png')
    expect(url[iconTextureKey('rank_diamond')]).toBe('/velunor/assets/icons/rank_diamond.png')
    expect(url[iconTextureKey('rank_diamond', true)]).toBe('/velunor/assets/icons/rank_diamond_96.png')
    expect(url[iconTextureKey('defense_shield')]).toBe('/velunor/assets/icons/defense_shield_64.png')
    expect(url[iconTextureKey('defense_shield', true)]).toBe('/velunor/assets/icons/defense_shield.png')
    expect(url[iconTextureKey('catalog')]).toBe('/velunor/assets/icons/catalog_64.png')
    expect(url[iconTextureKey('catalog', true)]).toBe('/velunor/assets/icons/catalog.png')
    expect(url['monster-m33']).toBe('/velunor/assets/monsters/m33_256.png')
    expect(url['monster-m33-lg']).toBe('/velunor/assets/monsters/m33.png')
    expect(url['monster-m35']).toBe('/velunor/assets/monsters/m35_256.png')
    expect(url['monster-m45']).toBe('/velunor/assets/monsters/m45_256.png')
    expect(url['monster-m45-lg']).toBe('/velunor/assets/monsters/m45.png')
    expect(url['monster-m46']).toBe('/velunor/assets/monsters/m46_256.png')
    expect(url['monster-m55']).toBe('/velunor/assets/monsters/m55_256.png')
    expect(url['monster-m55-lg']).toBe('/velunor/assets/monsters/m55.png')
    expect(url['monster-m56']).toBe('/velunor/assets/monsters/m56_256.png')
    expect(url['monster-m65']).toBe('/velunor/assets/monsters/m65_256.png')
    expect(url['monster-m65-lg']).toBe('/velunor/assets/monsters/m65.png')
    expect(url['monster-m66']).toBe('/velunor/assets/monsters/m66_256.png')
    expect(url['monster-m75']).toBe('/velunor/assets/monsters/m75_256.png')
    expect(url['monster-m75-lg']).toBe('/velunor/assets/monsters/m75.png')
    expect(url[iconTextureKey('type_ice')]).toBe('/velunor/assets/icons/type_ice_128.png')
    expect(url[iconTextureKey('type_ice', true)]).toBe('/velunor/assets/icons/type_ice.png')
    expect(url[iconTextureKey('type_lightning')]).toBe('/velunor/assets/icons/type_lightning_128.png')
    expect(url[iconTextureKey('type_lightning', true)]).toBe('/velunor/assets/icons/type_lightning.png')
    expect(url[backgroundTextureKey('bg_city')]).toBe('/velunor/assets/backgrounds/bg_city.webp')
    expect(url[backgroundTextureKey('bg_arena')]).toBe('/velunor/assets/backgrounds/bg_arena.webp')
    expect(url[backgroundTextureKey('bg_portal')]).toBe('/velunor/assets/backgrounds/bg_portal.webp')
    expect(assetUrl('monsters/m05_256.png', '/')).toBe('/assets/monsters/m05_256.png')
  })
})
