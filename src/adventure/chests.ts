import { species } from '../data'
import { nextFloat } from '../rng'
import { chapterById } from './route'
import {
  OPEN_ALL_MAX,
  chestStateOf,
  duplicateExp,
  enteredRegions,
  openChest,
  type ChestGrant,
  type ChestRoll,
  type ChestTier
} from './lootbox'
import { makeMon, takeId } from './save'
import { addExp } from './stats'
import type { SaveV2 } from './types'

export type { ChestGrant }

function draw(save: SaveV2): number {
  const state = { seed: save.rng >>> 0 }
  const value = nextFloat(state)
  save.rng = state.seed
  return value
}

function highest(save: SaveV2, speciesId: string): string | null {
  let best: string | null = null
  let level = -1
  for (const [uid, mon] of Object.entries(save.mons)) {
    if (mon.species !== speciesId || mon.lvl < level) continue
    best = uid
    level = mon.lvl
  }
  return best
}

export function applyChest(save: SaveV2, roll: ChestRoll, now: number, cap: number): ChestGrant {
  save.gold += roll.gold
  const name = species(roll.speciesId).name
  if (roll.isNew) {
    const uid = takeId(save)
    save.mons[uid] = makeMon(roll.speciesId, 1, now, 'truhe')
    const place = save.team.length < 6 ? 'team' : 'pc'
    if (place === 'team') {
      save.team.push(uid)
      if (!save.active) save.active = uid
    } else save.pc.push(uid)
    const dex = save.dex[roll.speciesId] ?? { seen: 0, caught: 0 }
    dex.seen += 1
    dex.caught += 1
    save.dex[roll.speciesId] = dex
    return { ...roll, name, place }
  }
  const uid = highest(save, roll.speciesId)
  if (uid) addExp(save.mons[uid], duplicateExp(save.mons[uid].lvl), cap, 2)
  return { ...roll, name, place: 'exp' }
}

export function takeChests(save: SaveV2, tier: ChestTier, count: number, now: number): ChestGrant[] {
  const cap = chapterById(save.region, save.chapter).cap
  const grants: ChestGrant[] = []
  const n = Math.max(0, Math.min(OPEN_ALL_MAX, Math.floor(count), save.chests[tier]))
  for (let i = 0; i < n; i++) {
    const roll = openChest(tier, chestStateOf(save), () => draw(save))
    grants.push(applyChest(save, roll, now, cap))
    save.chests[tier] -= 1
  }
  return grants
}

export function regionsOf(save: SaveV2): number[] {
  return enteredRegions(save)
}
