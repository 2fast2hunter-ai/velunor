import lootboxJson from '../../data/lootbox.json'
import { species } from '../data'
import { fruitActive } from './shop'
import {
  dustValue,
  enteredRegions,
  poolFor,
  shardValue,
  starCost,
  unlockShardCost,
  wildShardChance,
  type ChestTier
} from './lootbox'
import { makeMon, takeId } from './save'
import { noteDaily } from './daily'
import { takeWildShards } from './research'
import { treeRoadCut, treeShardBonus } from './tree'
import { bankAdd, bankRemainder, bankTake, paceChance, pacedBase } from './roadPace'
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
export function roadInterval(save: SaveV2): number {
  const cut = (save.chestTree?.pace ?? 0) * 10 * 60 * 1000
  return Math.max(60_000, Math.round((file.roadMs - cut) * (1 - treeRoadCut(save))))
}

function roadCap(save: SaveV2): number {
  return file.roadReadyCap + (save.chestTree?.extraSlot ? 1 : 0)
}

export function bankRoad(save: SaveV2, ms: number): number {
  if (!Number.isFinite(ms) || ms <= 0) return 0
  const cap = roadCap(save)
  if (save.roadReady >= cap) return 0
  save.roadMs += ms
  let gained = 0
  const step = roadInterval(save)
  while (save.roadMs >= step && save.roadReady < cap) {
    save.roadMs -= step
    save.roadReady += 1
    gained += 1
  }
  if (save.roadReady >= cap) save.roadMs = 0
  return gained
}

export function claimRoad(save: SaveV2): number {
  const moved = addChest(save, 'kiesel', save.roadReady)
  save.roadReady -= moved
  return moved
}

export function grantFindChest(save: SaveV2, paced = false): number {
  if (!paced) return addChest(save, 'kiesel', 1)
  return addChest(save, 'kiesel', bankAdd(save, 'findChest', pacedBase(save, 1, 'chest')))
}

const FIND_CLAIM_CAP = 64

/** `region:chapter:step`. One paid find stays marked until that chapter starts a new lap. */
export function findNodeKey(save: Pick<SaveV2, 'region' | 'chapter' | 'step'>): string {
  return `${save.region}:${save.chapter}:${save.step}`
}

/** Pay the find once. A later visit in the same lap, including after a defeat, pays nothing. */
export function claimFindChest(save: SaveV2, paced = false): number {
  const key = findNodeKey(save)
  const claims = save.findClaims ?? []
  if (claims.includes(key)) return 0
  save.findClaims = [...claims, key].slice(-FIND_CLAIM_CAP)
  return grantFindChest(save, paced)
}

/** The chapter finished a lap, so its find may pay again. Defeats do not call this. */
export function releaseFindClaims(save: SaveV2, chapterId = save.chapter): void {
  const prefix = `${save.region}:${chapterId}:`
  if (!save.findClaims?.length) return
  save.findClaims = save.findClaims.filter((key) => !key.startsWith(prefix))
}

export function grantTrainerChest(save: SaveV2, rng: () => number, paced = false): boolean {
  if (!paced) {
    if (rng() >= file.trainerSilver) return false
    return addChest(save, 'silber', 1) > 0
  }
  const scaled = paceChance(save, file.trainerSilver, 'chest')
  bankRemainder(save, 'trainerChest', scaled.overflow)
  const hit = rng() >= scaled.roll ? 0 : 1
  return addChest(save, 'silber', hit + bankTake(save, 'trainerChest')) > 0
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

export function goldChestLeft(save: SaveV2, tier: 'kiesel' | 'silber', now: number): { left: number; max: number } {
  const bought = save.chestDay === dayKey(now) ? save.chestBought[tier] : 0
  const max = file.shopGold.daily
  return { left: Math.max(0, max - bought), max }
}

export function chestMarkPrice(tier: 'gold' | 'sternen'): number {
  return file.shopMarks[tier]
}

export function chestIsFull(save: SaveV2, tier: ChestTier): boolean {
  return save.chests[tier] >= file.storageCap
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

export function rollWildShard(save: SaveV2, speciesId: string, rng: () => number, now: number, paced = false): 'shard' | 'unlock' | null {
  const rarity = species(speciesId).baseRarity
  let chance = wildShardChance(rarity) * (1 + 0.1 * (save.chestTree?.shard ?? 0))
  if (fruitActive(save, 'spuer', now)) chance *= 1.5
  chance *= 1 + treeShardBonus(save)
  let gate = chance
  if (paced) {
    const scaled = paceChance(save, chance, 'shard')
    gate = scaled.roll
    bankRemainder(save, 'shard', scaled.overflow)
  }
  const grant = (): 'shard' | 'unlock' => {
    const owned = Object.values(save.mons).some((mon) => mon.species === speciesId)
    const gained = takeWildShards(save)
    save.shards[speciesId] = (save.shards[speciesId] ?? 0) + gained
    noteDaily(save, 'shard', gained)
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
  if (rng() >= gate) {
    if (!paced) return null
    return drainShards()
  }
  const first = grant()
  if (!paced) return first
  return drainShards() ?? first

  function drainShards(): 'shard' | 'unlock' | null {
    let last: 'shard' | 'unlock' | null = null
    const extra = bankTake(save, 'shard')
    for (let i = 0; i < extra; i++) last = grant()
    return last
  }
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

export function workshopCost(rarity: number): number {
  return file.workshopMult * dustValue(rarity)
}

export function meltDuplicate(save: SaveV2, uid: string): string | null {
  const mon = save.mons[uid]
  if (!mon) return 'Das Monster fehlt.'
  const copies = Object.values(save.mons).filter((row) => row.species === mon.species)
  if (copies.length < 2) return 'Das letzte Exemplar bleibt.'
  const dust = dustValue(species(mon.species).baseRarity)
  delete save.mons[uid]
  save.team = save.team.filter((id) => id !== uid)
  save.pc = save.pc.filter((id) => id !== uid)
  save.hort = save.hort.filter((id) => id !== uid)
  if (save.active === uid) save.active = save.team[0] ?? null
  if (save.buddy === uid) save.buddy = null
  save.dust += dust
  const melted = shardValue(species(mon.species).baseRarity)
  save.shards[mon.species] = (save.shards[mon.species] ?? 0) + melted
  noteDaily(save, 'shard', melted)
  return null
}

export function craftSpecies(save: SaveV2, speciesId: string, now: number): string | null {
  if (!poolFor(enteredRegions(save)).includes(speciesId)) return 'Die Region ist noch zu.'
  const rarity = species(speciesId).baseRarity
  const cost = workshopCost(rarity)
  if (save.dust < cost) return 'Zu wenig Velunorstaub.'
  if (Object.values(save.mons).some((mon) => mon.species === speciesId)) return 'Die Art ist schon da.'
  save.dust -= cost
  const uid = takeId(save)
  const mon = makeMon(speciesId, 1, now, 'werkstatt')
  mon.stars = save.stars[speciesId] ?? 0
  save.mons[uid] = mon
  if (save.team.length < 6) save.team.push(uid)
  else save.pc.push(uid)
  const dex = save.dex[speciesId] ?? { seen: 0, caught: 0 }
  dex.seen += 1
  dex.caught += 1
  save.dex[speciesId] = dex
  grantCodexChests(save)
  return null
}
