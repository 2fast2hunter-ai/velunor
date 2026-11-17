import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { beginAdventure } from './save'
import { chestGoldPrice, goldChestLeft } from './sources'
import { missingText, needsConfirm, quotaLine, shopOffers } from './shopOffer'
import { gameHtml, type CodexQuery, type PcQuery } from './view'

const pc: PcQuery = { q: '', type: '', rarity: '', shiny: '', sort: 'newest', dir: -1 }
const dex: CodexQuery = { q: '', type: '', rarity: '', shiny: '' }

describe('shop offers', () => {
  it('confirms a gold buy at a quarter of the balance and every affordable marks buy', () => {
    expect(missingText(4300)).toBe('Fehlen 4.300')
    expect(needsConfirm(2500, 10_000, 'gold')).toBe(true)
    expect(needsConfirm(2499, 10_000, 'gold')).toBe(false)
    expect(needsConfirm(10_000, 1000, 'gold')).toBe(false)
    expect(needsConfirm(1, 100, 'marks')).toBe(true)
    expect(needsConfirm(50, 10, 'marks')).toBe(false)
  })

  it('puts the daily chest quota on the card and reads a new day without writing the save', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    const now = Date.parse('2026-11-17T12:00:00.000Z')
    save.gold = 1_000_000
    save.chestDay = '2026-11-16'
    save.chestBought = { kiesel: 5, silber: 0 }
    expect(goldChestLeft(save, 'kiesel', now)).toEqual({ left: 5, max: 5 })
    expect(save.chestDay).toBe('2026-11-16')
    save.chestDay = '2026-11-17'
    save.chestBought.kiesel = 2
    const open = shopOffers(save, now).find((row) => row.id === 'chest-kiesel')
    expect(open?.quota).toEqual({ left: 3, max: 5 })
    expect(open?.canBuy).toBe(true)
    expect(quotaLine(open!.quota!, now)).toBe('Heute noch 3/5')
    save.chestBought.kiesel = 5
    const done = shopOffers(save, now).find((row) => row.id === 'chest-kiesel')
    expect(done?.reason).toBe('Limit erreicht')
    expect(done?.canBuy).toBe(false)
    expect(quotaLine(done!.quota!, now)).toContain('Morgen wieder')
  })

  it('greys the button reason for a crest lock, a full store and a short balance', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    save.gold = 1_000_000
    expect(shopOffers(save, 1).find((row) => row.id === 'crystal-l')?.reason).toBe('Ab Wappen 6')
    expect(shopOffers(save, 1).find((row) => row.id === 'crystal-xl')?.reason).toBe('Ab Wappen 8')
    save.chests.kiesel = 99
    expect(shopOffers(save, 1).find((row) => row.id === 'chest-kiesel')?.reason).toBe('Lager voll')
    save.chests.kiesel = 0
    save.gold = 0
    const price = chestGoldPrice(save, 'kiesel')
    expect(shopOffers(save, 1).find((row) => row.id === 'chest-kiesel')?.reason).toBe(`Fehlen ${price.toLocaleString('de-DE')}`)
  })

  it('draws two cards a row and keeps the daily line on the chest, not a fourth tab', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    const now = Date.parse('2026-11-17T12:00:00.000Z')
    save.gold = 20_000
    save.chestDay = '2026-11-17'
    save.chestBought = { kiesel: 2, silber: 0 }
    const html = gameHtml(save, 'shop', now, pc, dex, null, false, false, null, save.step, undefined, { shopTab: 'chests' })
    expect(html).toContain('Truhen')
    expect(html).toContain('Stärkung')
    expect(html).toContain('Marken')
    expect(html).not.toContain('Tagesangebote')
    expect(html).toContain('Heute noch 3/5')
    expect(html).toContain('class="shop-grid"')
    const ask = gameHtml(save, 'shop', now, pc, dex, null, false, false, { kind: 'shop-confirm', offerId: 'chest-silber' })
    expect(ask).toContain('Danach:')
    expect(ask).toContain('data-act="shop-yes"')
    const activities = gameHtml(save, 'activities', now, pc, dex, null, false, false, null, save.step, { tab: 'chests', mult: 1, symbols: null, note: '' })
    expect(activities).not.toContain('data-act="chest-buy"')
    expect(activities).not.toContain('data-act="chest-marks"')
    const css = readFileSync(new URL('./adventure.css', import.meta.url), 'utf8')
    expect(css).toContain('grid-template-columns: 480px 480px')
    expect(css).toContain('border-image-slice: 130 129 147 133')
    expect(css).toContain('border-width: 46px 45px 51px 47px')
    expect(css).toContain('min-height: 132px')
    expect(shopOffers(save, now).find((row) => row.id === 'crystal-s')?.pict).toBe(60)
    expect(shopOffers(save, now).find((row) => row.id === 'crystal-m')?.pict).toBe(72)
    expect(shopOffers(save, now).find((row) => row.id === 'crystal-l')?.pict).toBe(86)
    expect(shopOffers(save, now).find((row) => row.id === 'crystal-xl')?.pict).toBe(96)
    expect(shopOffers(save, now).find((row) => row.id === 'crystal-xl')?.foot).toBe(true)
    expect(shopOffers(save, now).find((row) => row.id === 'crystal-s')?.plate).toContain('card_bg_neutral')
    const kiesel = shopOffers(save, now).find((row) => row.id === 'chest-kiesel')
    expect(kiesel?.art).toBe('shop/chest_kiesel.webp')
    expect(kiesel?.plate).toContain('card_bg_kiesel')
    expect(shopOffers(save, now).find((row) => row.id === 'fruit-fang')?.art).toBe('shop/frucht_glueck.webp')
    expect(html).not.toContain('frucht_fang')
    expect(html).toContain('shop/shop_bg.webp')
    expect(html).toContain('icon_gold.webp')
  })
})
