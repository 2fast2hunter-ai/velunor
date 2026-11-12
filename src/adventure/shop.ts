import { syncAchievements } from './achievements'
import { species } from '../data'
import type { Spawn } from './route'
import { addExp } from './stats'
import type { CrystalId, FruitId, SaveV2 } from './types'

export type { CrystalId, FruitId }

export const FRUIT_MS = 60 * 60 * 1000
export const FIND_FRUIT_CHANCE = 0.3
export const SELL_RATE = 0.25

export const CHAPTER_BADGES = [
  'Kieselwappen',
  'Wellenwappen',
  'Funkenwappen',
  'Moorwappen',
  'Felswappen',
  'Sturmwappen',
  'Frostwappen',
  'Klingenwappen'
] as const

export interface CrystalDef {
  id: CrystalId
  name: string
  exp: number
  price: number
  wappen: number
}

export interface FruitDef {
  id: FruitId
  name: string
  price: number
  effect: string
}

export const CRYSTALS: CrystalDef[] = [
  { id: 's', name: 'EP-Kristall S', exp: 500, price: 1000, wappen: 0 },
  { id: 'm', name: 'EP-Kristall M', exp: 8000, price: 12000, wappen: 3 },
  { id: 'l', name: 'EP-Kristall L', exp: 120000, price: 150000, wappen: 6 },
  { id: 'xl', name: 'EP-Kristall XL', exp: 500000, price: 500000, wappen: 8 }
]

export const FRUITS: FruitDef[] = [
  { id: 'fang', name: 'Fangfrucht', price: 4000, effect: 'Fangchance ×1,25' },
  { id: 'goldfang', name: 'Goldfangfrucht', price: 15000, effect: 'Fangchance ×1,5, Deckel 70 %' },
  { id: 'spuer', name: 'Spürfrucht', price: 8000, effect: 'Die zwei seltensten Arten am Ort ×2' },
  { id: 'neugier', name: 'Neugierfrucht', price: 10000, effect: 'Nie gefangene Arten ×3' },
  { id: 'glanz', name: 'Glanzfrucht', price: 25000, effect: 'Schimmer-Chance ×2' },
  { id: 'lern', name: 'Lernfrucht', price: 6000, effect: 'Kampf-EP +25 %' },
  { id: 'muenz', name: 'Münzfrucht', price: 6000, effect: 'Gold +25 %' }
]

export const CRYSTAL_IDS: CrystalId[] = ['s', 'm', 'l', 'xl']
export const FRUIT_IDS: FruitId[] = FRUITS.map((fruit) => fruit.id)

export function emptyBag(): SaveV2['bag'] {
  return {
    crystals: { s: 0, m: 0, l: 0, xl: 0 },
    fruits: { fang: 0, goldfang: 0, spuer: 0, neugier: 0, glanz: 0, lern: 0, muenz: 0 }
  }
}

export function crystalDef(id: CrystalId): CrystalDef {
  return CRYSTALS.find((row) => row.id === id) ?? CRYSTALS[0]
}

export function fruitDef(id: FruitId): FruitDef {
  return FRUITS.find((row) => row.id === id) ?? FRUITS[0]
}

/** Chapter crests only. The Ratsiegel is not one of the eight Wappen. */
export function wappenCount(save: SaveV2): number {
  return CHAPTER_BADGES.filter((badge) => save.badges.includes(badge)).length
}

export function crystalUnlocked(save: SaveV2, id: CrystalId): boolean {
  return wappenCount(save) >= crystalDef(id).wappen
}

export function sellValue(price: number): number {
  return Math.floor(price * SELL_RATE)
}

export function fruitActive(save: SaveV2, id: FruitId, at: number): boolean {
  return (save.activeFruits ?? []).some((fruit) => fruit.id === id && fruit.until > at)
}

export function catchMods(save: SaveV2, at: number): { mult: number; cap: number } {
  if (fruitActive(save, 'goldfang', at)) return { mult: 1.5, cap: 0.7 }
  if (fruitActive(save, 'fang', at)) return { mult: 1.25, cap: 0.6 }
  return { mult: 1, cap: 0.6 }
}

export function combatExpFactor(save: SaveV2, at: number): number {
  return fruitActive(save, 'lern', at) ? 1.25 : 1
}

export function goldFactor(save: SaveV2, at: number): number {
  return fruitActive(save, 'muenz', at) ? 1.25 : 1
}

export function grantGold(save: SaveV2, amount: number, at: number): number {
  const paid = Math.round(amount * goldFactor(save, at))
  save.gold += paid
  return paid
}

/** Two rarest species by rarity, then by the smaller share. Never-caught species can also be tripled. */
export function applyFruitWeights(spawns: Spawn[], save: SaveV2, at: number): Spawn[] {
  if (!spawns.length) return spawns
  let rows = spawns.map((row) => ({ ...row }))
  if (fruitActive(save, 'spuer', at)) {
    const ranked = [...rows].sort((a, b) => {
      const rarity = species(b.species).baseRarity - species(a.species).baseRarity
      if (rarity) return rarity
      if (a.weight !== b.weight) return a.weight - b.weight
      return a.species < b.species ? -1 : 1
    })
    const boosted = new Set(ranked.slice(0, 2).map((row) => row.species))
    rows = rows.map((row) => boosted.has(row.species) ? { ...row, weight: row.weight * 2 } : row)
  }
  if (fruitActive(save, 'neugier', at)) {
    rows = rows.map((row) => (save.dex[row.species]?.caught ?? 0) > 0 ? row : { ...row, weight: row.weight * 3 })
  }
  return rows
}

export function rollFindFruit(rng: () => number): FruitId | null {
  if (rng() >= FIND_FRUIT_CHANCE) return null
  return FRUIT_IDS[Math.floor(rng() * FRUIT_IDS.length)]
}

export function buyCrystal(save: SaveV2, id: CrystalId): string | null {
  const item = crystalDef(id)
  if (!crystalUnlocked(save, id)) return `Noch nicht frei. ${item.name} braucht ${item.wappen} Wappen.`
  if (save.gold < item.price) return 'Zu wenig Gold.'
  save.gold -= item.price
  save.bag.crystals[id] += 1
  return null
}

export function buyFruit(save: SaveV2, id: FruitId): string | null {
  const item = fruitDef(id)
  if (save.gold < item.price) return 'Zu wenig Gold.'
  save.gold -= item.price
  save.bag.fruits[id] += 1
  return null
}

export function sellCrystal(save: SaveV2, id: CrystalId): string | null {
  if (save.bag.crystals[id] <= 0) return 'Nichts zu verkaufen.'
  save.bag.crystals[id] -= 1
  save.gold += sellValue(crystalDef(id).price)
  return null
}

export function sellFruit(save: SaveV2, id: FruitId): string | null {
  if (save.bag.fruits[id] <= 0) return 'Nichts zu verkaufen.'
  save.bag.fruits[id] -= 1
  save.gold += sellValue(fruitDef(id).price)
  return null
}

export function useCrystal(save: SaveV2, id: CrystalId, uid: string, cap: number): string | null {
  const mon = save.mons[uid]
  if (!mon) return 'Wähle ein Monster.'
  if (save.bag.crystals[id] <= 0) return 'Kein Kristall in der Tasche.'
  save.bag.crystals[id] -= 1
  const gained = addExp(mon, crystalDef(id).exp, cap, null)
  if (gained.gained <= 0) {
    save.bag.crystals[id] += 1
    return 'Das Level-Cap lässt keine EP mehr zu.'
  }
  save.stats.crystalsUsed += 1
  syncAchievements(save)
  return null
}

export function useFruit(save: SaveV2, id: FruitId, now: number): string | null {
  if (save.bag.fruits[id] <= 0) return 'Keine Frucht in der Tasche.'
  save.bag.fruits[id] -= 1
  save.stats.fruitsUsed += 1
  const until = now + FRUIT_MS
  const current = save.activeFruits.find((fruit) => fruit.id === id)
  if (current) current.until = until
  else save.activeFruits.push({ id, until })
  syncAchievements(save)
  return null
}

export function fruitMinutes(until: number, now: number): number {
  return Math.max(0, Math.ceil((until - now) / 60000))
}
