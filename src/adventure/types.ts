import type { TypeId } from '../types'
import type { Speed } from './const'
import type { ChestCounts, PityState } from './lootbox'
import type { Lang } from './i18n'

export type PowerSave = 0 | 2 | 5
export type FontScale = 100 | 115 | 130

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
  /** Species star rank, copied onto every specimen. 0 to 5. */
  stars?: number
}

export interface DexEntry {
  seen: number
  caught: number
}

export interface LogLine {
  t: number
  text: string
}

/** Fractional road rewards. Whole units are paid out and the rest stays here. */
export interface RewardBank {
  mastery: number
  findChest: number
  trainerChest: number
  shard: number
}

export interface AdventureSettings {
  speed: Speed
  /** Road playback tempo. Missing on older saves, which keep `speed`. */
  tempoWeg?: Speed
  /** Last focus tempo. Missing starts the next warden at 1x. */
  tempoFokus?: 1 | 2
  /** Hit points as a number. Missing means on. */
  showHpNumbers?: boolean
  autoSwitch: boolean
  catchCard: boolean
  shake: boolean
  flashes: boolean
  reduceMotion: boolean
  powerSave: PowerSave
  lang: Lang
  /** Horizontal swipe moves between the portrait tabs. */
  swipeTabs: boolean
  /** Vibration API pulse for an unlock and for a crest. */
  haptics: boolean
  font: FontScale
  /** Hidden or locked: stop drawing and catch up offline. Visible: 30 fps. */
  battery: boolean
}

export interface AdventureStats {
  wins: number
  catches: number
  dupes: number
  eggs: number
  shinies: number
  fruitsUsed: number
  crystalsUsed: number
  /** Chests opened. Older saves load as 0. The guild reads this from the server copy. */
  chestsOpened?: number
}

/**
 * Step-1 profile. Fields past `stats` keep the loop, the log and the migration
 * honest between sessions. They are not part of the printed example, and the
 * loader fills them when an older v2 file lacks them.
 */
/** Built portrait. Indexes into data/avatar.json. */
export interface AvatarLook {
  skin: number
  hair: number
  color: number
}

export interface SaveV2 {
  v: 2
  /** Portrait-step counter. 6 = anonymous account and server save. Missing on older files; the loader fills it. */
  saveVersion: number
  name: string
  look: AvatarLook
  /** Old A/B letter. Read for migration, never written for a new game. */
  avatar?: 'A' | 'B'
  gold: number
  /** Glücksmarken from the wheel. Older saves load as 0. */
  marks: number
  lastSeenAt: number
  region: number
  chapter: number
  step: number
  loop: boolean
  lastHealStep: number
  /** Find nodes already paid this lap, `region:chapter:step`. Missing on older files; the loader fills []. */
  findClaims?: string[]
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
  /** Strongest team level at the last warden or council loss. 0 means the gate is open. */
  guardMark: number
  /** Wild and trainer wins since that loss. */
  guardWins: number
  /** 1 once the Vorhof layout has been applied to this save. */
  layout: number
  /** 1 once the default screen shake has been turned off for this save. */
  fxShake: number
  /** Failed-seal progress per species, in percentage points, at most 10. */
  sealPity: Record<string, number>
  /** Cleared chapter with looping switched off. The path waits. */
  hold: boolean
  log: LogLine[]
  migratedFrom: string | null
  /** Council member ids already beaten before the Ratsiegel. */
  councilBeaten: string[]
  /** Region ids the player may enter. Each council seal opens the next one. */
  regionsOpen: number[]
  /** Regions whose chapter 1 has been entered. The chest pool uses this. */
  regionsEntered: number[]
  chests: ChestCounts
  pity: PityState
  /** Art shards keyed by species id. */
  shards: Record<string, number>
  /** Star rank 0 to 5 keyed by species id. */
  stars: Record<string, number>
  /** Meisterschafts-EP keyed by species id. Missing on older files; the loader fills {}. */
  mastery?: Record<string, number>
  /** Mastery tree. Missing on older files; the loader fills an empty tree. */
  tree?: { nodes: string[], resetDay: string, sealDay: string }
  /**
   * Moving average of road-node length / 2800. Missing until the pace switch runs.
   * Rewards then start from 1.6.
   */
  roadPace?: number
  /** Fractions left after W. Missing until the pace switch runs. */
  rewardBank?: RewardBank
  /** Play time saved toward the next road chest. */
  roadMs: number
  /** Kiesel chests waiting on the road, at most 4. */
  roadReady: number
  roadAt: number
  chestDay: string
  chestBought: { kiesel: number; silber: number }
  /** Codex milestones already paid in gold chests. */
  codexChestAt: number
  dust: number
  chestLuck: number
  chestThanks: boolean
  silverOpened: number
  chestTree: { pace: 0 | 1 | 2; extraSlot: boolean; shard: 0 | 1 | 2; master: boolean }
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
  /** PC expeditions. Missing on older files; the loader fills an empty board. */
  expeditions?: ExpeditionState
  /**
   * Chosen synergy ids, at most two. Missing means the two strongest on the team.
   * An empty array means the player turned both off.
   */
  synergy?: string[]
  /** Research tower. Missing on older files; the loader fills an empty tower. */
  research?: ResearchSave
  /** Daily tasks and the 7-day calendar. Missing on older files; the loader fills an empty board. */
  daily?: DailySave
  /** First 30 minutes. Missing on older files; the loader fills it. A veteran skips the entrance. */
  onboarding?: import('./onboarding').OnboardingState
}

export type ResearchLineId = 'gold' | 'ep' | 'offline' | 'expedition' | 'egg' | 'shard'

export interface ResearchJobState {
  line: ResearchLineId
  level: number
  startedAt: number
  readyAt: number
}

export interface ResearchSave {
  ranks: Record<ResearchLineId, number>
  job: ResearchJobState | null
  /** Remainder toward the next bonus wild shard. Kept in [0, 1). */
  shardBank: number
}

export interface DailyTaskSave {
  kind: 'chest' | 'shard' | 'wild' | 'trainer' | 'warden' | 'expedition' | 'arena' | 'coop'
  need: number
  have: number
  claimed: boolean
  type?: import('../types').TypeId
}

export interface DailySave {
  key: string
  count: number
  credited: number
  cycle: number
  tasks: DailyTaskSave[]
  frames: string[]
  marks: number
  gold: number
}

export interface ExpeditionQuest {
  id: string
  type: TypeId
  rarity: number
  hours: 1 | 4 | 8
  place: string
  art: string
}

export interface ExpeditionRun {
  questId: string
  uid: string
  startedAt: number
  hours: 1 | 4 | 8
  type: TypeId
  rarity: number
  place: string
  art: string
}

export interface ExpeditionState {
  seed: number
  day: string
  quests: ExpeditionQuest[]
  runs: ExpeditionRun[]
  marks: number
  marksDay: string
  notes: string[]
  /** Gold-tier returns. The guild reads this from the server copy of the save. */
  goldDone?: number
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
