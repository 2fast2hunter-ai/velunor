import { nextFloat } from '../rng'
import { t } from './i18n'
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

function say(save: SaveV2, key: string, vars?: Record<string, string | number>): string {
  return t(save.settings?.lang, key, vars)
}

export function spinCost(regionId = 1): number {
  const region = Math.max(1, Math.floor(regionId) || 1)
  return SPIN_COST * region * region
}

export function spinWheel(save: SaveV2, mult: Multiplier, rng?: () => number): SpinResult | string {
  if (!wheelOpen(save)) return say(save, 'err.wheelLock')
  if (!MULTIPLIERS.includes(mult)) return say(save, 'err.wheelBad')
  const cost = spinCost(save.region) * mult
  if (save.gold < cost) return say(save, 'err.gold')
  save.gold -= cost
  const roll = rng ?? saveRng(save)
  const symbols: [SymbolId, SymbolId, SymbolId] = [drawSymbol(roll), drawSymbol(roll), drawSymbol(roll)]
  const marks = scoreSymbols(symbols) * mult
  save.marks += marks
  const names = symbols.map((id) => t(save.settings?.lang, `sym.${id}`)).join(', ')
  save.log.push({ t: Date.now(), text: say(save, 'say.wheel', { mult, symbols: names, marks: marks.toLocaleString(save.settings?.lang === 'en' ? 'en' : 'de-DE') }) })
  if (save.log.length > 50) save.log.splice(0, save.log.length - 50)
  return { symbols, marks }
}

export function buyPrize(save: SaveV2, speciesId: string, now: number): string | null {
  const prize = PRIZES.find((row) => row.species === speciesId)
  if (!prize) return say(save, 'err.noPrize')
  if (!wheelOpen(save)) return say(save, 'err.wheelLock')
  if (!save.regionsOpen.includes(prize.region)) return say(save, 'err.later', { name: prize.regionName })
  if (Object.values(save.mons).some((mon) => mon.species === speciesId)) return say(save, 'err.owned')
  if (save.marks < prize.marks) return say(save, 'err.marks')
  save.marks -= prize.marks
  const uid = takeId(save)
  save.mons[uid] = makeMon(speciesId, PRIZE_LEVEL, now, 'rad', false)
  save.pc.unshift(uid)
  const dex = save.dex[speciesId] ?? { seen: 0, caught: 0 }
  dex.seen += 1
  dex.caught += 1
  save.dex[speciesId] = dex
  save.log.push({ t: now, text: say(save, 'say.prize', { name: species(speciesId).name, level: PRIZE_LEVEL }) })
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
