import type { Speed } from './const'

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
}

export interface AdventureStats {
  wins: number
  catches: number
  dupes: number
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
}

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}
