import { monsters, stages as handcrafted, typeName } from './data'
import { regionMainType, REGION_TYPES, stageId as idFor } from './idleMath'
import { mulberry32 } from './rng'
import type { Rarity, SlotId, StageDef, TypeId } from './types'

const SLOTS: SlotId[] = ['F1', 'F2', 'H1', 'H2', 'H3']

const byType = new Map<TypeId, string[]>()
for (const monster of monsters) {
  const list = byType.get(monster.type) ?? []
  list.push(monster.id)
  byType.set(monster.type, list)
}

const typesWithMonsters = REGION_TYPES.filter((type) => (byType.get(type)?.length ?? 0) > 0)

const handById = new Map(handcrafted.map((stage) => [stage.id, stage]))
const generated = new Map<string, StageDef>()

export function stageGlobal(stage: { chapter: number; s: number }): number {
  return (stage.chapter - 1) * 10 + stage.s
}

export function highestClearedStage(cleared: Record<string, number>): number {
  let best = 0
  for (const [id, stars] of Object.entries(cleared)) {
    if (!stars) continue
    const parsed = parseHandOrGenerated(id)
    if (parsed && parsed > best) best = parsed
  }
  return best
}

function parseHandOrGenerated(id: string): number | null {
  const match = /^(\d+)-(\d+)$/.exec(id)
  if (!match) return null
  const chapter = Number(match[1])
  const local = Number(match[2])
  if (chapter < 1 || local < 1 || local > 10) return null
  return (chapter - 1) * 10 + local
}

/** Chapter 3 is Selten, then one step per chapter, capped at Mythisch. */
export function regionEnemyRarity(chapter: number): Rarity {
  if (chapter <= 3) return 2
  if (chapter === 4) return 3
  if (chapter === 5) return 4
  if (chapter === 6) return 5
  return 6
}

export function generatedRewards(globalStage: number): StageDef['rewards'] {
  const firstGold = 100 + 40 * globalStage
  const exp = 30 + 15 * globalStage
  const boss = globalStage % 10 === 0
  return {
    firstClear: { gold: firstGold, gems: boss ? 100 : 30, exp },
    repeat: { gold: firstGold / 2, exp },
    threeStarBonus: { gems: 0 }
  }
}

function pickSpecies(type: TypeId, rng: () => number): string {
  const pool = byType.get(type)
  const source = pool && pool.length ? pool : monsters.map((monster) => monster.id)
  return source[Math.floor(rng() * source.length)] ?? monsters[0].id
}

function pickType(rng: () => number): TypeId {
  const source = typesWithMonsters.length ? typesWithMonsters : REGION_TYPES
  return source[Math.floor(rng() * source.length)] ?? REGION_TYPES[0]
}

/** Deterministic stage from seed = global stage number. Chapters 1–2 stay handcrafted. */
export function generateStage(globalStage: number): StageDef {
  const chapter = Math.floor((globalStage - 1) / 10) + 1
  const local = ((globalStage - 1) % 10) + 1
  const boss = local === 10
  const main = regionMainType(chapter)
  const rarity = regionEnemyRarity(chapter)
  const level = Math.round(1.2 * globalStage)
  const rng = mulberry32(globalStage)
  const types: TypeId[] = []
  for (let i = 0; i < 5; i++) types.push(i < 3 ? main : pickType(rng))
  const speciesIds = types.map((type) => pickSpecies(type, rng))
  const bossRarity = Math.min(9, rarity + 1) as Rarity
  const enemies = speciesIds.map((speciesId, index) => ({
    slot: SLOTS[index],
    speciesId,
    rarity: boss && index === 0 ? bossRarity : rarity,
    boss: boss && index === 0
  })).filter((enemy) => !(boss && enemy.slot === 'F1'))
  const id = idFor(globalStage)
  const stage: StageDef = {
    id,
    chapter,
    s: local,
    name: boss ? `Boss der Region ${chapter}` : `Region ${chapter}-${local}`,
    enemyLevel: level,
    enemyRarity: rarity,
    enemySynergies: false,
    enemyClassSynergies: false,
    hint: `Haupttyp ${typeName(main)}`,
    stageText: `Region ${chapter}: ${typeName(main)}`,
    enemies,
    rewards: generatedRewards(globalStage)
  }
  if (boss) {
    stage.boss = {
      slot: 'F1',
      speciesId: speciesIds[0],
      rarity: bossRarity,
      hpMult: 1.5,
      atkMult: 1
    }
  }
  return stage
}

export function resolveStage(id: string): StageDef {
  const hand = handById.get(id)
  if (hand) return hand
  const globalStage = parseHandOrGenerated(id)
  if (globalStage == null || globalStage <= 20) throw new Error(`Unknown stage ${id}`)
  const cached = generated.get(id)
  if (cached) return cached
  const stage = generateStage(globalStage)
  generated.set(id, stage)
  return stage
}

export function stagesInChapter(chapter: number): StageDef[] {
  if (chapter <= 2) return handcrafted.filter((stage) => stage.chapter === chapter)
  const list: StageDef[] = []
  for (let local = 1; local <= 10; local++) list.push(resolveStage(`${chapter}-${local}`))
  return list
}

export function regionUnlocked(cleared: Record<string, number>, chapter: number): boolean {
  if (chapter <= 1) return true
  if (chapter === 2) return Boolean(cleared['1-10'])
  return Boolean(cleared[`${chapter - 1}-10`])
}
