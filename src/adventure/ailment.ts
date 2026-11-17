import type { TypeId } from '../types'

/** B2. One mark per monster. A new mark replaces the old one. Giftnebel stacks on itself. */
export type AilmentId = 'brand' | 'naesse' | 'frost' | 'giftnebel' | 'schock' | 'spreu'

export interface AilmentSpec {
  id: AilmentId
  name: string
  /** Attacks of the carrier. */
  attacks: number
  /** Fraction of max HP per attack of the carrier. Giftnebel multiplies by stacks. */
  dot: number
  stacks: number
  /** Incoming DEF multiplier, 1 means unchanged. */
  def: number
  /** Chance to skip the carrier's action. */
  skip: number
  /** Outgoing damage multiplier. */
  damage: number
  /** Chance an attack misses. */
  miss: number
  /** The applier's type is used for the weather factor on the dot. */
  weather: boolean
  tip: string
}

export const AILMENTS: Record<AilmentId, AilmentSpec> = {
  brand: { id: 'brand', name: 'Brand', attacks: 3, dot: 0.03, stacks: 1, def: 1, skip: 0, damage: 1, miss: 0, weather: true, tip: 'Brand: 3 % Max-HP je Angriff, 3 Angriffe.' },
  naesse: { id: 'naesse', name: 'Nässe', attacks: 3, dot: 0, stacks: 1, def: 0.85, skip: 0, damage: 1, miss: 0, weather: false, tip: 'Nässe: DEF −15 %, 3 Angriffe.' },
  frost: { id: 'frost', name: 'Frost', attacks: 2, dot: 0, stacks: 1, def: 1, skip: 0.3, damage: 1, miss: 0, weather: false, tip: 'Frost: greift 30 % seltener, 2 Angriffe.' },
  giftnebel: { id: 'giftnebel', name: 'Giftnebel', attacks: 4, dot: 0.02, stacks: 3, def: 1, skip: 0, damage: 1, miss: 0, weather: true, tip: 'Giftnebel: 2 % Max-HP je Angriff und Stapel, bis 3, 4 Angriffe.' },
  schock: { id: 'schock', name: 'Schock', attacks: 1, dot: 0, stacks: 1, def: 1, skip: 0, damage: 0.5, miss: 0, weather: false, tip: 'Schock: der nächste Angriff macht −50 % Schaden.' },
  spreu: { id: 'spreu', name: 'Spreu', attacks: 3, dot: 0, stacks: 1, def: 1, skip: 0, damage: 1, miss: 0.2, weather: false, tip: 'Spreu: 20 % der Angriffe gehen daneben, 3 Angriffe.' }
}

const BY_TYPE: Partial<Record<TypeId, AilmentId>> = {
  fire: 'brand',
  water: 'naesse',
  ice: 'frost',
  poison: 'giftnebel',
  lightning: 'schock',
  wind: 'spreu',
  insect: 'spreu'
}

/** Fire's plain jab does not mark. The ult and the skill do. Other listed types mark on every hit. */
export function ailmentFor(type: TypeId, kind: 'strike' | 'skill' | 'ult'): AilmentId | null {
  if (type === 'fire' && kind === 'strike') return null
  return BY_TYPE[type] ?? null
}

export function bossDuration(attacks: number, boss: boolean): number {
  if (!boss) return attacks
  return Math.max(1, Math.round(attacks * 0.5))
}

export function bossImmune(defender: TypeId, id: AilmentId): boolean {
  return BY_TYPE[defender] === id
}

export function ailmentIcon(id: AilmentId): string {
  return `battle/status_${id}_64.png`
}
