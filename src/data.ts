import type { BuildingId, MonsterSpecies, Rarity, SlotId, StageDef, TypeId } from './types'
import typesJson from '../data/types.json'
import raritiesJson from '../data/rarities.json'
import combatJson from '../data/combat.json'
import gachaJson from '../data/gacha.json'
import buildingsJson from '../data/buildings.json'
import adsJson from '../data/ads.json'
import rewardsJson from '../data/rewards.json'
import monstersJson from '../data/monsters.json'
import stagesJson from '../data/stages.json'
import skillsJson from '../data/skills.json'
import synergiesJson from '../data/synergies.json'
import breedingJson from '../data/breeding.json'
import dailyJson from '../data/daily.json'
import typeUnlocksJson from '../data/typeUnlocks.json'
import arenaJson from '../data/arena.json'

export const typesCfg = typesJson
export const rarities = raritiesJson.levels
export const ascensionCosts = raritiesJson.ascension
export const combat = combatJson
export const gachaCfg = gachaJson
export const buildings = buildingsJson
export const adsCfg = adsJson
export const rewards = rewardsJson
export const monsters = monstersJson as MonsterSpecies[]
export const stages = stagesJson.stages as StageDef[]
export const chapters = stagesJson.chapters
export const starChests = stagesJson.starChests as Record<string, { stars: number; reward: { gold?: number; gems?: number; essence?: number; tickets?: number } }[]>
export const skillsCfg = skillsJson
export const synergies = synergiesJson
export const breedingCfg = breedingJson
export const dailyCfg = dailyJson
export const typeUnlocks = typeUnlocksJson
export const arenaCfg = arenaJson

const monsterById = new Map(monsters.map((m) => [m.id, m]))

export function species(id: string): MonsterSpecies {
  const found = monsterById.get(id)
  if (!found) throw new Error(`Unknown species ${id}`)
  return found
}

export function rarityInfo(index: number) {
  return rarities[index]
}

export function typeName(id: TypeId): string {
  return typesCfg.names[id]
}

export function typeColor(id: TypeId): string {
  return typesCfg.colors[id]
}

export function typeMult(att: TypeId, def: TypeId): number {
  const strong = typesCfg.strongAgainst[att] as string[]
  if (strong.includes(def)) return typesCfg.multipliers.strong
  if (att !== def && (typesCfg.strongAgainst[def] as string[]).includes(att)) return typesCfg.multipliers.weak
  return typesCfg.multipliers.neutral
}

export function strongAgainst(id: TypeId): TypeId[] {
  return typesCfg.strongAgainst[id] as TypeId[]
}

export function stageById(id: string) {
  const found = stages.find((s) => s.id === id)
  if (!found) throw new Error(`Unknown stage ${id}`)
  return found
}

export function nextStageId(cleared: Record<string, number>): string | null {
  for (const stage of stages) {
    if (!cleared[stage.id]) return stage.id
  }
  return null
}

export function buildingName(id: BuildingId): string {
  return buildings[id].name
}

export function townhallLevelDef(level: number) {
  return buildings.townhall.levels[level - 1]
}

export function hasUnlock(townhallLevel: number, unlock: string): boolean {
  for (let lv = 1; lv <= townhallLevel; lv++) {
    const def = buildings.townhall.levels[lv - 1]
    if (def?.unlocks.includes(unlock)) return true
  }
  return false
}

export function teamSlotLimit(townhallLevel: number): SlotId[] {
  const slots: SlotId[] = ['F1', 'F2', 'H1']
  if (townhallLevel >= 2) slots.push('H2')
  if (townhallLevel >= 3) slots.push('H3')
  return slots
}

export function maxLevelFor(rarity: Rarity): number {
  return rarities[rarity].maxLevel
}

export function expToNext(level: number): number {
  return Math.round(combat.expBase * Math.pow(level, combat.expPower))
}

export function expToReach(targetLevel: number): number {
  let total = 0
  for (let level = 1; level < targetLevel; level++) total += expToNext(level)
  return total
}

export function formatInt(n: number): string {
  return Math.floor(n).toLocaleString('de-DE')
}

export function formatRemain(ms: number): string {
  const safe = Math.max(0, ms)
  const total = Math.ceil(safe / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

export function dayKey(ts: number): string {
  const d = new Date(ts)
  if (d.getHours() < rewards.dailyResetHour) d.setDate(d.getDate() - 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function previousDayKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() - 1)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}
