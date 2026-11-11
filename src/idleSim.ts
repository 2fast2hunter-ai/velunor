import { simulateBattle } from './battle'
import { hashSeed } from './rng'
import type { BattleUnitInput } from './types'

export const IDLE_SEED_COUNT = 10

export function idleSeeds(globalStage: number, count = IDLE_SEED_COUNT): number[] {
  const seeds: number[] = []
  for (let i = 0; i < count; i++) seeds.push(hashSeed(`idle-w:${globalStage}:${i}`))
  return seeds
}

export function measureWinRate(input: {
  allies: BattleUnitInput[]
  enemies: BattleUnitInput[]
  globalStage: number
  allySynergy: boolean
  allyClassSynergy: boolean
  enemySynergy: boolean
  enemyClassSynergy: boolean
  seedCount?: number
}): number {
  if (!input.allies.length || !input.enemies.length) return 0
  const seeds = idleSeeds(input.globalStage, input.seedCount ?? IDLE_SEED_COUNT)
  let wins = 0
  for (const seed of seeds) {
    const log = simulateBattle({
      seed,
      allies: input.allies,
      enemies: input.enemies,
      allySynergy: input.allySynergy,
      allyClassSynergy: input.allyClassSynergy,
      enemySynergy: input.enemySynergy,
      enemyClassSynergy: input.enemyClassSynergy
    })
    if (log.result === 'win') wins += 1
  }
  return wins / seeds.length
}
