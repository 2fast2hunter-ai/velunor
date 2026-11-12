import { isAlive } from './stats'
import type { OwnedMon, SaveV2 } from './types'
import { PRIZES } from './wheel'

/** Rarity 8 and 9. They are not part of a road roster. */
export const LEGEND_SPECIES = ['m40', 'm80', 'm100']

/** Region a monster may fight in. null means every region, used for hort young. */
export function homeRegion(mon: OwnedMon): number | null {
  const match = /^r(\d+)/.exec(mon.caughtWhere)
  if (match) return Number(match[1])
  if (mon.caughtWhere === 'hort') return null
  if (mon.caughtWhere === 'rad') return PRIZES.find((prize) => prize.species === mon.species)?.region ?? 1
  return 1
}

export function fightsHere(save: SaveV2, mon: OwnedMon): boolean {
  const home = homeRegion(mon)
  return home == null || home === save.region
}

export function ownsRegional(save: SaveV2): boolean {
  return Object.values(save.mons).some((mon) => homeRegion(mon) === save.region)
}

/** Locals fight once any exist. Until the first catch here, visitors may still battle. */
export function battleRoster(save: SaveV2): string[] {
  const living = save.team.filter((uid) => save.mons[uid] && isAlive(save.mons[uid]))
  const local = living.filter((uid) => fightsHere(save, save.mons[uid]))
  if (local.length) return local
  if (ownsRegional(save)) return []
  return living
}

/** Put a monster caught in this region into the team if nobody here can fight yet. */
export function seatRegional(save: SaveV2, uid: string): void {
  const mon = save.mons[uid]
  if (!mon || !fightsHere(save, mon)) return
  if (save.team.some((id) => id !== uid && fightsHere(save, save.mons[id]))) return
  if (save.team.includes(uid)) return
  if (save.team.length < 6) {
    save.pc = save.pc.filter((id) => id !== uid)
    save.team.push(uid)
    return
  }
  const visitor = save.team.find((id) => !fightsHere(save, save.mons[id]))
  if (!visitor) return
  save.team = save.team.map((id) => (id === visitor ? uid : id))
  save.pc = save.pc.filter((id) => id !== uid)
  save.pc.unshift(visitor)
  if (save.active === visitor) save.active = uid
  if (save.buddy === visitor) save.buddy = null
}
