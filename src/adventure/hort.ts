import { species } from '../data'
import { makeMon, takeId } from './save'
import { rollShiny, SHINY_HORT_RATE } from './shiny'
import type { SaveV2 } from './types'

export const HORT_EP_RATE = 0.3
export const HORT_PRICES = [0, 20_000, 120_000, 500_000] as const
export const BREED_MS = 2 * 60 * 60 * 1000
export const HATCH_MS = 4 * 60 * 60 * 1000
export const BREED_CHANCE = 0.5
export const SHINY_PARENT_RATE = 0.1
/** Prepared for the second council. Nothing grants this badge yet. */
export const RAT_2_BADGE = 'Zweites Ratsiegel'

export function hortOffer(save: SaveV2): { slot: number; price: number; locked: string | null } | null {
  if (save.hortSlots >= 4) return null
  const slot = save.hortSlots + 1
  const price = HORT_PRICES[slot - 1]
  if (slot === 3 && !save.badges.includes('Ratsiegel')) return { slot, price, locked: 'nach dem Hohen Rat 1' }
  if (slot === 4 && !save.badges.includes(RAT_2_BADGE)) return { slot, price, locked: 'nach dem Hohen Rat 2' }
  return { slot, price, locked: null }
}

export function buyHortSlot(save: SaveV2): string | null {
  const offer = hortOffer(save)
  if (!offer) return 'Alle Hortplätze sind offen.'
  if (offer.locked) return `Platz ${offer.slot} öffnet ${offer.locked}.`
  if (save.gold < offer.price) return 'Zu wenig Gold.'
  save.gold -= offer.price
  save.hortSlots += 1
  return null
}

export function moveToHort(save: SaveV2, uid: string): string | null {
  if (!save.mons[uid]) return 'Dieses Monster gibt es nicht.'
  if (save.hort.includes(uid)) return 'Liegt schon im Hort.'
  if (save.hort.length >= save.hortSlots) return 'Der Hort ist voll.'
  const inTeam = save.team.includes(uid)
  if (!inTeam && !save.pc.includes(uid)) return 'Das Monster ist nicht greifbar.'
  if (inTeam && save.team.length <= 1) return 'Mindestens ein Monster bleibt im Team.'
  if (inTeam) {
    save.team = save.team.filter((id) => id !== uid)
    if (save.buddy === uid) save.buddy = null
    if (save.active === uid) save.active = save.team[0] ?? null
  } else save.pc = save.pc.filter((id) => id !== uid)
  save.hort.push(uid)
  return null
}

export function moveFromHort(save: SaveV2, uid: string): string | null {
  if (!save.hort.includes(uid)) return 'Nicht im Hort.'
  save.hort = save.hort.filter((id) => id !== uid)
  save.pc.unshift(uid)
  return null
}

function pairs(save: SaveV2): [string, string][] {
  const byType = new Map<string, string[]>()
  for (const uid of save.hort) {
    const mon = save.mons[uid]
    if (!mon) continue
    const type = species(mon.species).type
    const list = byType.get(type) ?? []
    list.push(uid)
    byType.set(type, list)
  }
  const found: [string, string][] = []
  for (const list of byType.values()) {
    for (let i = 0; i + 1 < list.length; i += 2) found.push([list[i], list[i + 1]])
  }
  return found
}

function hatch(save: SaveV2, now: number): void {
  const ready = save.eggs.filter((egg) => egg.readyAt <= now)
  save.eggs = save.eggs.filter((egg) => egg.readyAt > now)
  for (const egg of ready) {
    const uid = takeId(save)
    save.mons[uid] = makeMon(egg.species, 1, egg.readyAt, 'hort', egg.shiny)
    save.pc.unshift(uid)
    const dex = save.dex[egg.species] ?? { seen: 0, caught: 0 }
    dex.seen += 1
    dex.caught += 1
    save.dex[egg.species] = dex
    save.log.push({ t: now, text: `${species(egg.species).name} schlüpft${egg.shiny ? ' als Schimmer' : ''}.` })
  }
  if (save.log.length > 50) save.log.splice(0, save.log.length - 50)
}

/** Catch breeding up to `now`. Eggs use one incubation place per unlocked hort slot. */
export function advanceHort(save: SaveV2, now: number, rng: () => number): void {
  if (!Number.isFinite(save.lastBreedAt) || save.lastBreedAt <= 0) save.lastBreedAt = now
  hatch(save, now)
  let guard = 0
  while (now - save.lastBreedAt >= BREED_MS && guard < 4000) {
    save.lastBreedAt += BREED_MS
    guard += 1
    for (const [left, right] of pairs(save)) {
      if (save.eggs.length >= save.hortSlots) break
      if (rng() >= BREED_CHANCE) continue
      const monA = save.mons[left]
      const monB = save.mons[right]
      const speciesId = rng() < 0.5 ? monA.species : monB.species
      const chance = monA.shiny || monB.shiny ? SHINY_PARENT_RATE : SHINY_HORT_RATE
      const shiny = rollShiny(rng, chance)
      save.eggs.push({ species: speciesId, shiny, readyAt: save.lastBreedAt + HATCH_MS })
    }
    hatch(save, now)
  }
}
