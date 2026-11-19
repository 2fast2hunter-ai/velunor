import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GOALS } from './achievements'
import { UI_ART } from './uiArt'
import { SHOP_ART } from './shopOffer'
import { beginAdventure } from './save'
import { gameHtml, type CodexQuery, type PcQuery } from './view'

describe('ui art placeholders', () => {
  it('ships a file for every path the screens already ask for', () => {
    for (const path of Object.values(UI_ART)) {
      expect(existsSync(new URL(`../../public/assets/${path}`, import.meta.url))).toBe(true)
    }
    for (const path of Object.values(SHOP_ART.fruit)) {
      expect(existsSync(new URL(`../../public/assets/${path}`, import.meta.url))).toBe(true)
    }
    for (const key of ['achWins', 'achFinds', 'achCollect', 'achBadges', 'achRegion', 'achTypes', 'achCodex', 'achCare'] as const) {
      expect(existsSync(new URL(`../../public/assets/${UI_ART[key]}`, import.meta.url))).toBe(true)
    }
  })

  it('picks an achievement picture for every goal and keeps the screens when a file is only a path', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    const pc: PcQuery = { q: '', type: '', rarity: '', shiny: '', sort: 'newest', dir: -1 }
    const dex: CodexQuery = { q: '', type: '', rarity: '', shiny: '' }
    const html = gameHtml(save, 'achievements', 1_000, pc, dex, null, false, false, null)
    expect(html).toContain('ui/ach_wins.webp')
    expect(html).toContain('ui/ach_finds.webp')
    expect(html).toContain('ui/ach_care.webp')
    expect(GOALS.length).toBeGreaterThan(8)
    const ranks = gameHtml(save, 'ranks', 1_000, pc, dex, null, false, false, null)
    expect(ranks).not.toContain('ranks/place-0')
    const daily = gameHtml(save, 'activities', 1_000, pc, dex, null, false, false, null)
    expect(daily).toContain('daily/board@2x.png')
  })
})
