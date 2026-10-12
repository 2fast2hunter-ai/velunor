export type TypeId =
  | 'fire' | 'water' | 'plant' | 'earth' | 'wind' | 'ice' | 'lightning' | 'poison' | 'metal' | 'stone'
  | 'light' | 'shadow' | 'ghost' | 'dragon' | 'insect' | 'beast' | 'fighting' | 'psychic' | 'sound' | 'crystal'

export type Rarity = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export type Row = 'front' | 'back'
export type SlotId = 'F1' | 'F2' | 'H1' | 'H2' | 'H3'
export type BuildingId = 'townhall' | 'goldmine' | 'training'
export type Side = 'A' | 'B'

export const ALL_SLOTS: SlotId[] = ['F1', 'F2', 'H1', 'H2', 'H3']
export const SLOT_ROW: Record<SlotId, Row> = {
  F1: 'front', F2: 'front', H1: 'back', H2: 'back', H3: 'back'
}
export const SLOT_LANE: Record<SlotId, number> = {
  F1: 1, F2: 2, H1: 1, H2: 2, H3: 3
}

export type SkillTarget =
  | 'default'
  | 'enemy_front_all'
  | 'enemy_back_lowest_hp'
  | 'enemy_all'
  | 'ally_lowest_hp_pct'
  | 'self'
  | 'self_and_ally_lowest_hp_pct'

export type StatusId = 'burn' | 'stun' | 'taunt' | 'def_up' | 'def_down' | 'thorns'

export type SkillEffect =
  | { kind: 'damage'; atkMult: number }
  | { kind: 'heal'; atkMult: number }
  | { kind: 'shield'; maxHpPctOfCaster: number; duration: number }
  | { kind: 'status'; status: StatusId; chance: number; duration: number; value?: number }

export interface SkillDef {
  id: string
  name: string
  description: string
  cooldown: number
  initialCooldown: number
  target: SkillTarget
  effects: SkillEffect[]
}

export interface MonsterSpecies {
  id: string
  name: string
  type: TypeId
  baseRarity: Rarity
  role: Row
  base: { hp: number; atk: number; def: number; spd: number }
  blurb: string
  skill: SkillDef
  passive?: { id: 'rebirth'; name: string; description: string; hpPct: number; usesPerBattle: number }
  sprite: string
}

export interface MonsterInstance {
  uid: string
  speciesId: string
  rarity: Rarity
  level: number
  exp: number
  locked: boolean
  obtainedAt: number
}

export interface TrainingSlot {
  monsterUid: string
  startAt: number
  endsAt: number
  exp: number
  goldPaid: number
  expPerMin: number
}

export interface BuildingState {
  level: number
  upgradeEndsAt: number | null
  upgradePaid: number | null
}

export interface GoldmineState extends BuildingState {
  stored: number
  lastTick: number
}

export interface TrainingState extends BuildingState {
  slots: TrainingSlot[]
}

export interface GachaHistoryEntry {
  t: number
  speciesId: string
  rarity: Rarity
  upgraded: boolean
}

export interface GachaState {
  pityLeg: number
  pityEpic: number
  totalPulls: number
  history: GachaHistoryEntry[]
}

export type AdPlacement =
  | 'double_reward'
  | 'gem_bonus'
  | 'free_pull'
  | 'mine_boost'
  | 'build_speed'
  | 'training_speed'

export interface SaveData {
  version: number
  createdAt: number
  lastSeen: number
  rngSeed: number
  currencies: { gold: number; gems: number; essence: number; tickets: number }
  buildings: {
    townhall: BuildingState
    goldmine: GoldmineState
    training: TrainingState
  }
  monsters: MonsterInstance[]
  team: Record<SlotId, string | null>
  campaign: { cleared: Record<string, number> }
  gacha: GachaState
  daily: {
    dayKey: string
    loginStreak: number
    quests: { win3: number; mine2: number; train1: number }
    claimed: { win3: boolean; mine2: boolean; train1: boolean; all: boolean }
  }
  ads: {
    dayKey: string
    counts: Record<AdPlacement, number>
    rewardedToday: number
    lastRewardedAt: number
    lastInterstitialAt: number
    interstitialToday: number
    interstitialHourKey: string
    interstitialHourCount: number
  }
  milestones: { firstEpic: boolean; firstLegendary: boolean; townhallRewards: number[] }
  tutorial: { mineGranted: boolean; freeTrainUsed: boolean; pullClaimed: boolean }
  settings: { battleSpeed: 1 | 2 | 4; sound: boolean }
  sessionStartedAt: number
}

export interface BattleEventBase {
  r: number
}

export type BattleEvent =
  | (BattleEventBase & { kind: 'turn_start'; actor: string })
  | (BattleEventBase & { kind: 'skill'; actor: string; skillId: string; targets: string[] })
  | (BattleEventBase & { kind: 'hit'; actor: string; target: string; dmg: number; crit: boolean; typeMult: number; shieldAbsorbed: number })
  | (BattleEventBase & { kind: 'heal'; actor: string; target: string; amount: number })
  | (BattleEventBase & { kind: 'shield'; actor: string; target: string; amount: number })
  | (BattleEventBase & { kind: 'status_add'; target: string; status: string })
  | (BattleEventBase & { kind: 'status_remove'; target: string; status: string })
  | (BattleEventBase & { kind: 'dot'; target: string; dmg: number; shieldAbsorbed: number })
  | (BattleEventBase & { kind: 'ko'; target: string })
  | (BattleEventBase & { kind: 'revive'; target: string; hp: number })
  | (BattleEventBase & { kind: 'thorns'; actor: string; target: string; dmg: number; shieldAbsorbed: number })

export interface BattleLog {
  seed: number
  rounds: number
  result: 'win' | 'loss'
  stars: 0 | 1 | 2 | 3
  events: BattleEvent[]
  koCount: number
  roster: { id: string; name: string; speciesId: string; maxHp: number; side: Side; slot: SlotId }[]
}

export interface BattleUnitInput {
  speciesId: string
  rarity: Rarity
  level: number
  slot: SlotId
  boss?: boolean
  /** Exact pre-bonus stats. Used by tests to pin mechanics. */
  fixed?: { hp: number; atk: number; def: number; spd: number }
}

export interface BattleInput {
  seed: number
  allies: BattleUnitInput[]
  enemies: BattleUnitInput[]
  allySynergy: boolean
  enemySynergy: boolean
}

export interface PullResult {
  speciesId: string
  rarity: Rarity
  upgraded: boolean
  uid: string
}

export interface RewardBundle {
  gold: number
  gems: number
  exp: number
  essence: number
  tickets: number
  levels: number
}

export interface StageEnemy {
  slot: SlotId
  speciesId: string
  boss?: boolean
  rarity?: Rarity
}

export interface StageDef {
  id: string
  chapter: number
  s: number
  name: string
  enemyLevel: number
  enemyRarity: number
  boss?: boolean
  enemies: StageEnemy[]
  rewards: {
    firstClear: { gold: number; gems: number; exp: number; essence?: number; tickets?: number }
    repeat: { gold: number; exp: number }
    threeStarBonus: { gems: number }
  }
}
