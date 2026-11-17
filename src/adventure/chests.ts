import { species } from '../data'
import { nextFloat } from '../rng'
import {
  OPEN_ALL_MAX,
  chestStateOf,
  openChest,
  shardValue,
  type ChestGrant,
  type ChestRoll,
  type ChestTier
} from './lootbox'
import { makeMon, takeId } from './save'
import { grantCodexChests } from './sources'
import type { SaveV2 } from './types'

export type { ChestGrant }

function draw(save: SaveV2): number {
  const state = { seed: save.rng >>> 0 }
  const value = nextFloat(state)
  save.rng = state.seed
  return value
}

export function applyChest(save: SaveV2, roll: ChestRoll, now: number): ChestGrant {
  save.gold += roll.gold
  const name = species(roll.speciesId).name
  if (roll.isNew) {
    const uid = takeId(save)
    const mon = makeMon(roll.speciesId, 1, now, 'truhe')
    mon.stars = save.stars[roll.speciesId] ?? 0
    save.mons[uid] = mon
    const place = save.team.length < 6 ? 'team' : 'pc'
    if (place === 'team') {
      save.team.push(uid)
      if (!save.active) save.active = uid
    } else save.pc.push(uid)
    const dex = save.dex[roll.speciesId] ?? { seen: 0, caught: 0 }
    dex.seen += 1
    dex.caught += 1
    save.dex[roll.speciesId] = dex
    grantCodexChests(save)
    return { ...roll, name, place }
  }
  save.shards[roll.speciesId] = (save.shards[roll.speciesId] ?? 0) + shardValue(roll.rarity)
  return { ...roll, name, place: 'exp' }
}

export function takeChests(save: SaveV2, tier: ChestTier, count: number, now: number): ChestGrant[] {
  const grants: ChestGrant[] = []
  const n = Math.max(0, Math.min(OPEN_ALL_MAX, Math.floor(count), save.chests[tier]))
  for (let i = 0; i < n; i++) {
    const state = chestStateOf(save)
    if (tier !== 'kiesel') state.pity = save.pity[tier]
    const roll = openChest(tier, state, () => draw(save))
    if (tier !== 'kiesel') save.pity[tier] = roll.pity
    grants.push(applyChest(save, roll, now))
    save.chests[tier] -= 1
  }
  return grants
}

