import lootboxJson from '../../data/lootbox.json'
import { species } from '../data'
import {
  starCost,
  unlockShardCost,
  wildShardChance,
  type ChestTier
} from './lootbox'
import { makeMon, takeId } from './save'
import type { SaveV2 } from './types'

const file = lootboxJson

export function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10)
}

export function addChest(save: SaveV2, tier: ChestTier, count: number): number {
  const room = Math.max(0, file.storageCap - save.chests[tier])
  const gained = Math.max(0, Math.min(room, Math.floor(count)))
  save.chests[tier] += gained
  return gained
}

/** Bank play time. The ready pile stops at 4, and the clock pauses while it is full. */
export function bankRoad(save: SaveV2, ms: number): number {
  if (!Number.isFinite(ms) || ms <= 0) return 0
  if (save.roadReady >= file.roadReadyCap) return 0
  save.roadMs += ms
  let gained = 0
  while (save.roadMs >= file.roadMs && save.roadReady < file.roadReadyCap) {
    save.roadMs -= file.roadMs
    save.roadReady += 1
    gained += 1
  }
  if (save.roadReady >= file.roadReadyCap) save.roadMs = 0
  return gained
}

export function claimRoad(save: SaveV2): number {
  const moved = addChest(save, 'kiesel', save.roadReady)
  save.roadReady -= moved
  return moved
}

export function grantFindChest(save: SaveV2): number {
  return addChest(save, 'kiesel', 1)
}

export function grantTrainerChest(save: SaveV2, rng: () => number): boolean {
  if (rng() >= file.trainerSilver) return false
  return addChest(save, 'silber', 1) > 0
}

export function grantWardenChest(save: SaveV2): number {
  return addChest(save, 'gold', 1)
}

export function grantCouncilChest(save: SaveV2, grand: boolean): number {
  return addChest(save, grand ? 'sternen' : 'gold', 1)
}

export function grantCodexChests(save: SaveV2): number {
  const caught = Object.values(save.dex).filter((entry) => entry.caught > 0).length
  const earned = Math.floor(caught / file.codexEvery)
  const fresh = Math.max(0, earned - save.codexChestAt)
  save.codexChestAt = earned
  return addChest(save, 'gold', fresh)
}

function resetShopDay(save: SaveV2, now: number): void {
  const day = dayKey(now)
  if (save.chestDay === day) return
  save.chestDay = day
  save.chestBought = { kiesel: 0, silber: 0 }
}

export function chestGoldPrice(save: SaveV2, tier: 'kiesel' | 'silber'): number {
  const base = tier === 'kiesel' ? file.shopGold.kiesel : file.shopGold.silber
  return base * Math.max(1, save.region)
}

export function buyChestForGold(save: SaveV2, tier: 'kiesel' | 'silber', now: number): string | null {
  resetShopDay(save, now)
  if (save.chestBought[tier] >= file.shopGold.daily) return 'Heute ist das Tageslimit erreicht.'
  const price = chestGoldPrice(save, tier)
  if (save.gold < price) return 'Zu wenig Gold.'
  if (addChest(save, tier, 1) < 1) return 'Das Lager ist voll.'
  save.gold -= price
  save.chestBought[tier] += 1
  return null
}

export function buyChestForMarks(save: SaveV2, tier: 'gold' | 'sternen'): string | null {
  const price = file.shopMarks[tier]
  if (save.marks < price) return 'Zu wenig Glücksmarken.'
  if (addChest(save, tier, 1) < 1) return 'Das Lager ist voll.'
  save.marks -= price
  return null
}

export function rollWildShard(save: SaveV2, speciesId: string, rng: () => number, now: number): 'shard' | 'unlock' | null {
  const rarity = species(speciesId).baseRarity
  if (rng() >= wildShardChance(rarity)) return null
  const owned = Object.values(save.mons).some((mon) => mon.species === speciesId)
  save.shards[speciesId] = (save.shards[speciesId] ?? 0) + 1
  if (owned) return 'shard'
  const need = unlockShardCost(rarity)
  if ((save.shards[speciesId] ?? 0) < need) return 'shard'
  save.shards[speciesId] -= need
  const uid = takeId(save)
  const mon = makeMon(speciesId, 1, now, 'spur')
  mon.stars = save.stars[speciesId] ?? 0
  save.mons[uid] = mon
  if (save.team.length < 6) {
    save.team.push(uid)
    if (!save.active) save.active = uid
  } else save.pc.push(uid)
  const dex = save.dex[speciesId] ?? { seen: 0, caught: 0 }
  dex.seen += 1
  dex.caught += 1
  save.dex[speciesId] = dex
  grantCodexChests(save)
  return 'unlock'
}

export function raiseStar(save: SaveV2, speciesId: string): string | null {
  const rarity = species(speciesId).baseRarity
  const current = save.stars[speciesId] ?? 0
  if (current >= 5) return 'Die Sternstufe ist voll.'
  const cost = starCost(rarity, current + 1)
  if ((save.shards[speciesId] ?? 0) < cost) return 'Zu wenig Art-Splitter.'
  save.shards[speciesId] -= cost
  save.stars[speciesId] = current + 1
  for (const mon of Object.values(save.mons)) {
    if (mon.species === speciesId) mon.stars = current + 1
  }
  return null
}

export function debugStarChests(save: SaveV2): number {
  return addChest(save, 'sternen', 50)
}
