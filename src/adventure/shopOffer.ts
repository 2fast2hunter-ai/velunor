import { species } from '../data'
import {
  CRYSTALS,
  FRUITS,
  crystalExp,
  crystalPrice,
  crystalUnlocked,
  fruitPrice,
  shopLevel
} from './shop'
import { PRIZES } from './wheel'
import {
  chestGoldPrice,
  chestIsFull,
  chestMarkPrice,
  goldChestLeft
} from './sources'
import type { ChestTier } from './lootbox'
import type { SaveV2 } from './types'
import { t, type Lang } from './i18n'

/** A buy confirms when it spends at least this share of the current balance, or any Glücksmarken. */
export const CONFIRM_SHARE = 0.25

export const SHOP_TABS = ['chests', 'boost', 'marks'] as const
export type ShopTab = (typeof SHOP_TABS)[number]
export type ShopPay = 'gold' | 'marks'

/**
 * Smettbo shop art. Swap these paths when a drawing is replaced.
 * Fangfrucht is no longer sold; the Glücksfrucht (id fang) uses frucht_glueck.
 */
export const SHOP_ART = {
  bg: 'shop/shop_bg.webp',
  frame: 'shop/card_frame.webp',
  gold: 'shop/icon_gold.webp',
  goldSm: 'shop/icon_gold_64.webp',
  marks: 'shop/icon_marke.webp',
  marksSm: 'shop/icon_marke_64.webp',
  chest: {
    kiesel: 'shop/chest_kiesel.webp',
    silber: 'shop/chest_silber.webp',
    gold: 'shop/chest_gold.webp',
    sternen: 'shop/chest_sternen.webp'
  },
  plate: {
    kiesel: 'shop/card_bg_kiesel.webp',
    silber: 'shop/card_bg_silber.webp',
    gold: 'shop/card_bg_gold.webp',
    sternen: 'shop/card_bg_sternen.webp',
    neutral: 'shop/card_bg_neutral.webp'
  },
  crystal: {
    s: 'shop/ep_kristall_s.webp',
    m: 'shop/ep_kristall_m.webp',
    l: 'shop/ep_kristall_l.webp',
    xl: 'shop/ep_kristall_xl.webp'
  },
  fruit: {
    fang: 'shop/frucht_glueck.webp',
    goldfang: 'shop/frucht_goldfang.webp',
    spuer: 'shop/frucht_spur.webp',
    neugier: 'ui/fruit_neugier.png',
    glanz: 'ui/fruit_glanz.png',
    lern: 'ui/fruit_lern.png',
    muenz: 'ui/fruit_muenz.png'
  },
  tabBar: 'shop/tab_bar_bg.webp',
  tabOn: 'shop/tab_active.webp',
  tabOff: 'shop/tab_inactive.webp'
} as const

/** 9-slice insets of the 480×600 frame. Corners stay this size; only the edges stretch. */
export const FRAME_SLICE = { top: 130, right: 129, bottom: 147, left: 133 } as const

/** Card width stays within 15 percent of the 480px frame. */
export const CARD_WIDTH = { base: 480, min: 408, max: 552 } as const

/** Crystal drawings, shortest to tallest, feet on the same line. */
export const CRYSTAL_PICT = { s: 60, m: 72, l: 86, xl: 96 } as const

export interface ShopQuota {
  left: number
  max: number
}

export interface ShopOffer {
  id: string
  tab: ShopTab
  group: string
  name: string
  effect: string
  price: number
  pay: ShopPay
  art: string
  plate: string
  tone: string
  quota: ShopQuota | null
  canBuy: boolean
  reason: string
  act: string
  dataId: string
  info: 'chest' | 'item'
  chestTier?: ChestTier
  /** Draw the picture against the bottom of the plate. */
  foot: boolean
  /** Picture height as a percent of the plate. 0 uses the default fit. */
  pict: number
}

export function missingText(amount: number, lang: Lang = 'de'): string {
  const n = Math.max(0, Math.ceil(amount)).toLocaleString('de-DE')
  return t(lang, 'shop.missing', { n })
}

export function needsConfirm(price: number, balance: number, pay: ShopPay): boolean {
  if (price <= 0 || price > balance) return false
  if (pay === 'marks') return true
  return price >= balance * CONFIRM_SHARE
}

export function compactAmount(value: number): string {
  const n = Math.floor(value)
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${(n / 1_000_000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} Mio`
  if (abs >= 10_000) return `${(n / 1_000).toLocaleString('de-DE', { maximumFractionDigits: 1 })} K`
  return n.toLocaleString('de-DE')
}

export function nextShopMidnight(now: number): number {
  const day = new Date(now)
  return Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate() + 1)
}

export function resetCountdown(now: number): string {
  const left = Math.max(0, nextShopMidnight(now) - now)
  const hours = Math.floor(left / 3_600_000)
  const minutes = Math.floor((left % 3_600_000) / 60_000)
  return `${hours} h ${String(minutes).padStart(2, '0')} min`
}

export function quotaLine(quota: ShopQuota, now: number, lang: Lang = 'de'): string {
  if (quota.left > 0) return t(lang, 'shop.today', { left: quota.left, max: quota.max })
  return t(lang, 'shop.tomorrow', { time: resetCountdown(now) })
}

function offer(partial: Omit<ShopOffer, 'foot' | 'pict'> & Partial<Pick<ShopOffer, 'foot' | 'pict'>>): ShopOffer {
  return { foot: false, pict: 0, ...partial }
}

function say(save: SaveV2, key: string, vars?: Record<string, string | number>): string {
  return t(save.settings.lang, key, vars)
}

function chestOffer(save: SaveV2, tier: ChestTier, tab: ShopTab, now: number): ShopOffer {
  const art = SHOP_ART.chest[tier]
  const gold = tier === 'kiesel' || tier === 'silber'
  const price = gold ? chestGoldPrice(save, tier) : chestMarkPrice(tier === 'gold' ? 'gold' : 'sternen')
  const pay: ShopPay = gold ? 'gold' : 'marks'
  const balance = pay === 'gold' ? save.gold : save.marks
  const quota = gold ? goldChestLeft(save, tier, now) : null
  let reason = ''
  if (quota && quota.left <= 0) reason = say(save, 'shop.limit')
  else if (chestIsFull(save, tier)) reason = say(save, 'shop.full')
  else if (balance < price) reason = missingText(price - balance, save.settings.lang)
  return offer({
    id: `chest-${tier}`,
    tab,
    group: gold ? say(save, 'shop.group.gold') : say(save, 'shop.group.marks'),
    name: say(save, `chest.${tier}`),
    effect: say(save, 'shop.chestFx'),
    price,
    pay,
    art,
    plate: SHOP_ART.plate[tier],
    tone: `tone-${tier}`,
    quota,
    canBuy: reason === '',
    reason,
    act: gold ? 'chest-buy' : 'chest-marks',
    dataId: tier,
    info: 'chest',
    chestTier: tier
  })
}

export function shopOffers(save: SaveV2, now: number): ShopOffer[] {
  const level = shopLevel(save)
  const owned = new Set(Object.values(save.mons).map((mon) => mon.species))
  const chests: ShopOffer[] = [
    chestOffer(save, 'kiesel', 'chests', now),
    chestOffer(save, 'silber', 'chests', now),
    chestOffer(save, 'gold', 'chests', now),
    chestOffer(save, 'sternen', 'chests', now)
  ]
  const marksChests = chests.filter((row) => row.pay === 'marks').map((row) => ({ ...row, tab: 'marks' as const, group: t(save.settings.lang, 'shop.group.chests') }))
  const crystals = CRYSTALS.map((item) => {
    const price = crystalPrice(save, item.id)
    const open = crystalUnlocked(save, item.id)
    let reason = ''
    if (!open) reason = say(save, 'shop.crest', { n: item.wappen })
    else if (save.gold < price) reason = missingText(price - save.gold, save.settings.lang)
    return offer({
      id: `crystal-${item.id}`,
      tab: 'boost',
      group: say(save, 'shop.group.crystals'),
      name: say(save, `crystal.${item.id}`),
      effect: `+${crystalExp(item.id, level).toLocaleString('de-DE')} EP.`,
      price,
      pay: 'gold',
      art: SHOP_ART.crystal[item.id],
      plate: SHOP_ART.plate.neutral,
      foot: true,
      pict: CRYSTAL_PICT[item.id],
      tone: 'tone-plain',
      quota: null,
      canBuy: reason === '',
      reason,
      act: 'buy-crystal',
      dataId: item.id,
      info: 'item'
    })
  })
  const fruits = FRUITS.map((item) => {
    const price = fruitPrice(save, item.id)
    const reason = save.gold < price ? missingText(price - save.gold, save.settings.lang) : ''
    return offer({
      id: `fruit-${item.id}`,
      tab: 'boost',
      group: say(save, 'shop.group.fruits'),
      name: say(save, `fruit.${item.id}`),
      effect: say(save, `fruit.fx.${item.id}`),
      price,
      pay: 'gold',
      art: SHOP_ART.fruit[item.id as keyof typeof SHOP_ART.fruit] ?? '',
      plate: SHOP_ART.plate.neutral,
      tone: 'tone-plain',
      quota: null,
      canBuy: reason === '',
      reason,
      act: 'buy-fruit',
      dataId: item.id,
      info: 'item'
    })
  })
  const prizes = PRIZES.map((prize) => {
    const sp = species(prize.species)
    const unlocked = save.regionsOpen.includes(prize.region)
    const have = owned.has(prize.species)
    let reason = ''
    if (!unlocked) reason = say(save, 'shop.region')
    else if (have) reason = say(save, 'shop.owned')
    else if (save.marks < prize.marks) reason = missingText(prize.marks - save.marks, save.settings.lang)
    return offer({
      id: `prize-${prize.species}`,
      tab: 'marks',
      group: prize.regionName,
      name: sp.name,
      effect: `${prize.regionName} · Lv 5`,
      price: prize.marks,
      pay: 'marks',
      art: `monsters/${sp.id}_256.png`,
      plate: SHOP_ART.plate.neutral,
      tone: 'tone-plain',
      quota: null,
      canBuy: reason === '',
      reason,
      act: 'buy-prize',
      dataId: prize.species,
      info: 'item'
    })
  })
  return [...chests, ...crystals, ...fruits, ...marksChests, ...prizes]
}

export function shopOffer(save: SaveV2, now: number, id: string): ShopOffer | null {
  return shopOffers(save, now).find((row) => row.id === id) ?? null
}

export function stockLine(save: SaveV2): string {
  const names: Record<string, string> = { kiesel: 'Kiesel', silber: 'Silber', gold: 'Gold', sternen: 'Sternen' }
  const parts = (['kiesel', 'silber', 'gold', 'sternen'] as const)
    .filter((tier) => save.chests[tier] > 0)
    .map((tier) => `${save.chests[tier]} ${names[tier]}`)
  return parts.length ? parts.join(', ') : 'leer'
}
