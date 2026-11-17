import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { UI_ART } from './uiArt'
import { SHOP_ART } from './shopOffer'

describe('ui art placeholders', () => {
  it('ships a file for every path the screens already ask for', () => {
    for (const path of Object.values(UI_ART)) {
      expect(existsSync(new URL(`../../public/assets/${path}`, import.meta.url))).toBe(true)
    }
    for (const path of Object.values(SHOP_ART.fruit)) {
      expect(existsSync(new URL(`../../public/assets/${path}`, import.meta.url))).toBe(true)
    }
  })
})
