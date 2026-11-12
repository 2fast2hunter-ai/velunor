import type { Speed } from './const'
import type { Lang } from './i18n'

export type PowerSave = 0 | 2 | 5

export interface OwnedMon {
  species: string
  lvl: number
  exp: number
  /** null means full HP. 0 means fainted. */
  hp: number | null
  shiny: boolean
  caughtAt: number
  caughtWhere: string
  keepDupes: boolean
}

export interface DexEntry {
  seen: number
  caught: number
}

export interface LogLine {
  t: number
  text: string
}

export interface AdventureSettings {
  speed: Speed
  autoSwitch: boolean
  catchCard: boolean
  shake: boolean
  flashes: boolean
  reduceMotion: boolean
  powerSave: PowerSave
  lang: Lang
}

export interface AdventureStats {
  wins: number
  catches: number
  dupes: number
  eggs: number
  shinies: number
  fruitsUsed: number
  crystalsUsed: number
}

/**
 * Step-1 profile. Fields past `stats` keep the loop, the log and the migration
 * honest between sessions. They are not part of the printed example, and the
 * loader fills them when an older v2 file lacks them.
 */
export interface SaveV2 {
  v: 2
  name: string
  avatar: 'A' | 'B'
  gold: number
  /** Glücksmarken from the wheel. Older saves load as 0. */
  marks: number
  lastSeenAt: number
  region: number
  chapter: number
  step: number
  loop: boolean
  lastHealStep: number
  badges: string[]
  team: string[]
  pc: string[]
  buddy: string | null
  mons: Record<string, OwnedMon>
  dex: Record<string, DexEntry>
  settings: AdventureSettings
  stats: AdventureStats
  rng: number
  nextId: number
  started: boolean
  active: string | null
  /** Arrivals at step 20 still required before the guardian is fought again. */
  loopsUntilRetry: number
  challengeNow: boolean
  /** Cleared chapter with looping switched off. The path waits. */
  hold: boolean
  log: LogLine[]
  migratedFrom: string | null
  /** Council member ids already beaten before the Ratsiegel. */
  councilBeaten: string[]
  /** Region ids the player may enter. Each council seal opens the next one. */
  regionsOpen: number[]
  bag: BagState
  activeFruits: ActiveFruit[]
  /** Unlocked hort places, 1 to 4. The same number of eggs can incubate. */
  hortSlots: number
  hort: string[]
  eggs: HortEgg[]
  /** Last time a two-hour breeding check was applied. */
  lastBreedAt: number
  claimed: string[]
  equippedTitle: string | null
  equippedFrame: string | null
  /** Awakening sequences still waiting to be shown. */
  pendingAwaken: { uid: string; level: 25 | 50 }[]
}

export interface HortEgg {
  species: string
  shiny: boolean
  readyAt: number
}

export type CrystalId = 's' | 'm' | 'l' | 'xl'
export type FruitId = 'fang' | 'goldfang' | 'spuer' | 'neugier' | 'glanz' | 'lern' | 'muenz'

export interface BagState {
  crystals: Record<CrystalId, number>
  fruits: Record<FruitId, number>
}

export interface ActiveFruit {
  id: FruitId
  until: number
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
