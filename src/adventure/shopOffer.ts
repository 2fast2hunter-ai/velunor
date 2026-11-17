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

/** Swap these paths when the chest and crystal art arrives. */
export const SHOP_ART = {
  gold: 'icons/gold_128.png',
  marks: 'icons/gems_128.png',
  kiesel: 'icons/rank_bronze_96.png',
  silber: 'icons/rank_silver_96.png',
  goldChest: 'icons/rank_gold_96.png',
  sternen: 'icons/star_128.png',
  crystal: 'icons/essence_128.png',
  fruit: 'icons/catalog_64.png'
} as const

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
  tone: string
  quota: ShopQuota | null
  canBuy: boolean
  reason: string
  act: string
  dataId: string
  info: 'chest' | 'item'
  chestTier?: ChestTier
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

function offer(partial: ShopOffer): ShopOffer {
  return partial
}

function say(save: SaveV2, key: string, vars?: Record<string, string | number>): string {
  return t(save.settings.lang, key, vars)
}

function chestOffer(save: SaveV2, tier: ChestTier, tab: ShopTab, now: number): ShopOffer {
  const art: Record<ChestTier, string> = {
    kiesel: SHOP_ART.kiesel,
    silber: SHOP_ART.silber,
    gold: SHOP_ART.goldChest,
    sternen: SHOP_ART.sternen
  }
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
    art: art[tier],
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
      art: SHOP_ART.crystal,
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
      art: SHOP_ART.fruit,
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
