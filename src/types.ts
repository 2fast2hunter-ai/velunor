export type TypeId =
  | 'fire' | 'water' | 'plant' | 'earth' | 'wind' | 'ice' | 'lightning' | 'poison' | 'metal' | 'stone'
  | 'light' | 'shadow' | 'ghost' | 'dragon' | 'insect' | 'beast' | 'fighting' | 'psychic' | 'sound' | 'crystal'

export type Rarity = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
export type Row = 'front' | 'back'
export type SlotId = 'F1' | 'F2' | 'H1' | 'H2' | 'H3'
export type BuildingId = 'townhall' | 'goldmine' | 'training' | 'breeding'
export type MonsterClass = 'guardian' | 'fighter' | 'shooter' | 'support' | 'disruptor'
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
  | 'enemy_back_all'
  | 'enemy_back_lowest_hp'
  | 'enemy_all'
  | 'enemy_random'
  | 'ally_lowest_hp_pct'
  | 'ally_all'
  | 'self'
  | 'self_and_ally_lowest_hp_pct'
  | 'attacker'

export type StatusId =
  | 'burn' | 'stun' | 'taunt' | 'def_up' | 'def_down' | 'thorns'
  | 'poison' | 'atk_up' | 'atk_down' | 'spd_up' | 'spd_down'

export type SkillEffect =
  | { kind: 'damage'; atkMult: number; hits?: number; defPierce?: number; target?: SkillTarget }
  | { kind: 'heal'; atkMult: number; target?: SkillTarget }
  | { kind: 'shield'; maxHpPctOfCaster: number; duration: number; target?: SkillTarget }
  | { kind: 'status'; status: StatusId; chance: number; duration: number; value?: number; stacks?: number; target?: SkillTarget }
  | { kind: 'cleanse'; target?: SkillTarget }

export interface SkillDef {
  id: string
  name?: string
  description?: string
  cooldown: number
  initialCooldown: number
  target: SkillTarget
  effects: SkillEffect[]
}

export interface SpeciesPassive {
  id: string
  name: string
  description: string
  hpPct?: number
  usesPerBattle: number
  trigger?: { kind: string; pct?: number; firstOnly?: boolean }
  effects?: SkillEffect[]
}

export interface MonsterSpecies {
  id: string
  name: string
  type: TypeId
  baseRarity: Rarity
  role: Row
  class: MonsterClass
  base: { hp: number; atk: number; def: number; spd: number }
  blurb: string
  skill: SkillDef
  passive?: SpeciesPassive
  sprite: string
}

export interface MonsterSkills {
  sigRank: 1 | 2 | 3 | 4 | 5
  slot2: string | null
  slot3: string | null
  learned: string[]
  skillOrder: ('sig' | 'slot2')[]
}

export interface MonsterInstance {
  uid: string
  speciesId: string
  rarity: Rarity
  level: number
  exp: number
  locked: boolean
  obtainedAt: number
  potential: { hp: number; atk: number; def: number }
  skills: MonsterSkills
  generation: number
  breedReadyAt: number
}

export interface SkillJob {
  type: 'learn' | 'rank' | 'passive'
  skillId: string
  goldPaid: number
  essencePaid: number
}

export interface TrainingSlot {
  kind: 'exp' | 'skill'
  monsterUid: string
  startAt: number
  endsAt: number
  exp: number
  goldPaid: number
  expPerMin: number
  skillJob?: SkillJob
}

export interface BreedingSlot {
  parentA: string
  parentB: string
  startAt: number
  endsAt: number
  goldPaid: number
  essencePaid: number
  result: {
    speciesId: string
    rarity: Rarity
    potential: { hp: number; atk: number; def: number }
    inheritedSkill: string | null
    generation: number
  }
}

export interface BreedingState extends BuildingState {
  slots: BreedingSlot[]
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
  | 'breeding_speed'

export interface SaveData {
  version: number
  createdAt: number
  lastSeen: number
  rngSeed: number
  currencies: { gold: number; gems: number; essence: number; tickets: number }
  meta: { migratedFrom: string | null; migratedAt: number }
  activeTypes: TypeId[]
  buildings: {
    townhall: BuildingState
    goldmine: GoldmineState
    training: TrainingState
    breeding: BreedingState
  }
  monsters: MonsterInstance[]
  team: Record<SlotId, string | null>
  campaign: { cleared: Record<string, number>; chestsClaimed: string[] }
  lastBattleResult: 'win' | 'loss' | null
  tutorialDone: boolean
  gacha: GachaState
  daily: {
    dayKey: string
    loginStreak: number
    quests: Record<string, number>
    claimed: string[]
    claimedAll: boolean
  }
  ads: {
    dayKey: string
    counts: Record<string, number>
    rewardedToday: number
    lastRewardedAt: number
    lastInterstitialAt: number
    interstitialToday: number
  }
  milestones: { firstEpic: boolean; firstLegendary: boolean; townhallRewards: number[] }
  tutorial: { mineGranted: boolean; freeTrainUsed: boolean; pullClaimed: boolean; guideStep: number }
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
  | (BattleEventBase & { kind: 'passive'; actor: string; passiveId: string })
  | (BattleEventBase & { kind: 'boss_mech'; actor: string; mechId: string })
  | (BattleEventBase & { kind: 'summon'; actor: string; unit: string; speciesId: string })
  | (BattleEventBase & { kind: 'cleanse'; target: string; removed: string[] })

export interface BattleLog {
  seed: number
  rounds: number
  result: 'win' | 'loss'
  stars: 0 | 1 | 2 | 3
  events: BattleEvent[]
  koCount: number
  roster: { id: string; name: string; speciesId: string; maxHp: number; side: Side; slot: SlotId; rarity: Rarity }[]
}

export interface BattleUnitInput {
  speciesId: string
  rarity: Rarity
  level: number
  slot: SlotId
  boss?: boolean
  learned?: string | null
  slot3?: string | null
  skillOrder?: ('sig' | 'slot2')[]
  sigRank?: 1 | 2 | 3 | 4 | 5
  potential?: { hp: number; atk: number; def: number }
  hpMult?: number
  atkMult?: number
  stunChanceMult?: number
  poisonPctPerStack?: number
  mechanics?: BossMechanic[]
  /** Exact pre-bonus stats. Used by tests to pin mechanics. */
  fixed?: { hp: number; atk: number; def: number; spd: number }
}

export interface BossMechanic {
  id: string
  trigger: { kind: 'hp_below'; pct: number } | { kind: 'round_start'; fromRound?: number; every?: number }
  actions: BossAction[]
}

export type BossAction =
  | { kind: 'summon'; speciesId: string; level: number; rarity: number; slots: SlotId[]; max: number; fallback?: { kind: 'heal_all_pct'; pct: number } }
  | { kind: 'status'; target: 'self'; status: StatusId; value: number; duration: number }
  | { kind: 'shield'; target: 'self'; maxHpPct: number; duration: number }
  | { kind: 'damage'; target: SkillTarget; atkMult: number }

export interface BattleInput {
  seed: number
  allies: BattleUnitInput[]
  enemies: BattleUnitInput[]
  allySynergy: boolean
  enemySynergy: boolean
  allyClassSynergy?: boolean
  enemyClassSynergy?: boolean
}

export interface PullResult {
  speciesId: string
  rarity: Rarity
  upgraded: boolean
  uid: string
  duplicateEssence: number
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
  learned?: string
}

export interface StageDef {
  id: string
  chapter: number
  s: number
  name: string
  enemyLevel: number
  enemyRarity: number
  enemySynergies?: boolean
  enemyClassSynergies?: boolean
  hint?: string
  stageText?: string
  recommendedKK?: number
  onFirstClear?: { unlockType?: TypeId; gift?: { speciesId: string; rarity: Rarity; level: number } }
  boss?: {
    slot: SlotId
    speciesId: string
    rarity: Rarity
    hpMult?: number
    atkMult?: number
    statusResist?: { stunChanceMult?: number; poisonPctPerStack?: number }
    mechanics?: BossMechanic[]
  }
  enemies: StageEnemy[]
  rewards: {
    firstClear: { gold: number; gems: number; exp: number; essence?: number; tickets?: number }
    repeat: { gold: number; exp: number }
    threeStarBonus: { gems: number }
  }
}
