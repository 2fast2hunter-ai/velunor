import { typeMult } from '../data'
import type { TypeId } from '../types'

export const VANGUARD_DEF = 0.1
export const COUNTER_BLOW = 0.2
export const COUNTER_ULT = 2
export const ANCHOR_ATK = 0.15
export const ANCHOR_ULT = 1

export interface OrderSeat {
  uid: string
  type: TypeId
  alive: boolean
}

/** Full bench: slot 6. A shorter team: the last occupied slot. */
export function anchorIndex(teamLength: number): number {
  if (teamLength <= 0) return -1
  if (teamLength >= 6) return 5
  return teamLength - 1
}

export function orderMods(team: OrderSeat[], fighterUid: string, foeType: TypeId, enteredAfterKo: boolean): {
  defMul: number
  atkMul: number
  counter: boolean
  anchor: boolean
} {
  const index = team.findIndex((seat) => seat.uid === fighterUid)
  const seat = index >= 0 ? team[index] : null
  const defMul = index === 0 ? 1 + VANGUARD_DEF : 1
  const lastAlive = team.filter((row) => row.alive)
  const anchor = index === anchorIndex(team.length) && lastAlive.length === 1 && lastAlive[0]?.uid === fighterUid
  const counter = Boolean(enteredAfterKo && seat && typeMult(seat.type, foeType) > 1)
  return { defMul, atkMul: anchor ? 1 + ANCHOR_ATK : 1, counter, anchor }
}

export function typeArrow(attacker: TypeId, defender: TypeId): 'up' | 'down' | null {
  const mult = typeMult(attacker, defender)
  if (mult > 1) return 'up'
  if (mult < 1) return 'down'
  return null
}
