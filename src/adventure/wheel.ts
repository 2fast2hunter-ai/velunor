import { nextFloat } from '../rng'
import { species } from '../data'
import { makeMon, takeId } from './save'
import { wappenCount } from './shop'
import type { SaveV2 } from './types'

export const SPIN_COST = 1000
export const WHEEL_WAPPEN = 3
/** Gold counted per Glücksmarke when the payout rate is measured. The reels are weighted for about 85 % of the 1.000 G spin. */
export const MARK_GOLD = 500
export const MULTIPLIERS = [1, 5, 10] as const
export type Multiplier = (typeof MULTIPLIERS)[number]

export type SymbolId = 'stern' | 'mond' | 'krone' | 'blatt' | 'tropfen' | 'funke'

export interface Face {
  id: SymbolId
  name: string
  weight: number
  triple: number
}

/** Rare shapes first. Three matching faces pay `triple`. A pair pays 2, three different faces with a Stern pay 1, anything else pays 0. */
export const FACES: Face[] = [
  { id: 'stern', name: 'Stern', weight: 1, triple: 200 },
  { id: 'mond', name: 'Mond', weight: 3, triple: 60 },
  { id: 'krone', name: 'Krone', weight: 4, triple: 25 },
  { id: 'blatt', name: 'Blatt', weight: 4, triple: 12 },
  { id: 'tropfen', name: 'Tropfen', weight: 8, triple: 8 },
  { id: 'funke', name: 'Funke', weight: 15, triple: 5 }
]

export const FACE_TOTAL = FACES.reduce((sum, face) => sum + face.weight, 0)

export interface Prize {
  region: number
  regionName: string
  species: string
  marks: number
}

export const PRIZES: Prize[] = [
  { region: 1, regionName: 'Grünmark', species: 'm22', marks: 300 },
  { region: 1, regionName: 'Grünmark', species: 'm44', marks: 500 },
  { region: 2, regionName: 'Frostküste', species: 'm49', marks: 700 },
  { region: 3, regionName: 'Glutgebirge', species: 'm26', marks: 900 },
  { region: 4, regionName: 'Schattenmoor', species: 'm79', marks: 1200 },
  { region: 5, regionName: 'Himmelsthron', species: 'm98', marks: 1500 }
]

export const PRIZE_LEVEL = 5

export interface SpinResult {
  symbols: [SymbolId, SymbolId, SymbolId]
  marks: number
}

export function wheelOpen(save: SaveV2): boolean {
  return wappenCount(save) >= WHEEL_WAPPEN
}

export function faceById(id: SymbolId): Face {
  return FACES.find((face) => face.id === id) ?? FACES[0]
}

export function drawSymbol(rng: () => number): SymbolId {
  let roll = rng() * FACE_TOTAL
  for (const face of FACES) {
    roll -= face.weight
    if (roll < 0) return face.id
  }
  return FACES[FACES.length - 1].id
}

/** Base Glücksmarken for one ×1 spin, before the stake multiplier. */
export function scoreSymbols(symbols: [SymbolId, SymbolId, SymbolId]): number {
  const [a, b, c] = symbols
  if (a === b && b === c) return faceById(a).triple
  if (a === b || b === c || a === c) return 2
  if (a === 'stern' || b === 'stern' || c === 'stern') return 1
  return 0
}

function saveRng(save: SaveV2): () => number {
  return () => {
    const state = { seed: save.rng >>> 0 }
    const value = nextFloat(state)
    save.rng = state.seed
    return value
  }
}

export function spinWheel(save: SaveV2, mult: Multiplier, rng?: () => number): SpinResult | string {
  if (!wheelOpen(save)) return 'Das Glücksrad öffnet nach dem dritten Wappen.'
  if (!MULTIPLIERS.includes(mult)) return 'Dieser Dreh gilt nicht.'
  const cost = SPIN_COST * mult
  if (save.gold < cost) return 'Zu wenig Gold.'
  save.gold -= cost
  const roll = rng ?? saveRng(save)
  const symbols: [SymbolId, SymbolId, SymbolId] = [drawSymbol(roll), drawSymbol(roll), drawSymbol(roll)]
  const marks = scoreSymbols(symbols) * mult
  save.marks += marks
  const names = symbols.map((id) => faceById(id).name).join(', ')
  save.log.push({ t: Date.now(), text: `Glücksrad ×${mult}: ${names}. ${marks.toLocaleString('de-DE')} Marken.` })
  if (save.log.length > 50) save.log.splice(0, save.log.length - 50)
  return { symbols, marks }
}

export function buyPrize(save: SaveV2, speciesId: string, now: number): string | null {
  const prize = PRIZES.find((row) => row.species === speciesId)
  if (!prize) return 'Das gibt es hier nicht.'
  if (!wheelOpen(save)) return 'Das Glücksrad öffnet nach dem dritten Wappen.'
  if (!save.regionsOpen.includes(prize.region)) return `${prize.regionName} folgt später.`
  if (Object.values(save.mons).some((mon) => mon.species === speciesId)) return 'Schon im Besitz.'
  if (save.marks < prize.marks) return 'Zu wenig Glücksmarken.'
  save.marks -= prize.marks
  const uid = takeId(save)
  save.mons[uid] = makeMon(speciesId, PRIZE_LEVEL, now, 'rad', false)
  save.pc.unshift(uid)
  const dex = save.dex[speciesId] ?? { seen: 0, caught: 0 }
  dex.seen += 1
  dex.caught += 1
  save.dex[speciesId] = dex
  save.log.push({ t: now, text: `${species(speciesId).name} aus dem Preisladen. Lv ${PRIZE_LEVEL}.` })
  if (save.log.length > 50) save.log.splice(0, save.log.length - 50)
  return null
}

/** Exact return of mark value against the 1.000 G spin. Same at every multiplier. */
export function exactPayoutRate(): number {
  let weighted = 0
  const total = FACE_TOTAL ** 3
  for (let a = 0; a < FACES.length; a++) {
    for (let b = 0; b < FACES.length; b++) {
      for (let c = 0; c < FACES.length; c++) {
        const symbols: [SymbolId, SymbolId, SymbolId] = [FACES[a].id, FACES[b].id, FACES[c].id]
        weighted += FACES[a].weight * FACES[b].weight * FACES[c].weight * scoreSymbols(symbols)
      }
    }
  }
  const expectedMarks = weighted / total
  return expectedMarks * MARK_GOLD / SPIN_COST
}
