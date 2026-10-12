import { combat, maxLevelFor, rarityInfo, species, typeMult } from './data'
import { SLOT_ROW, type MonsterInstance, type Rarity, type Row, type TypeId } from './types'

export interface InstanceStats {
  hp: number
  atk: number
  def: number
  spd: number
}

export function instanceStats(speciesId: string, rarity: Rarity, level: number): InstanceStats {
  const sp = species(speciesId)
  const mult = rarityInfo(rarity).mult
  const growth = 1 + combat.levelStat * (level - 1)
  const spdGrowth = 1 + combat.levelSpd * (level - 1)
  const spdRarity = 1 + combat.spdPerRarity * rarity
  return {
    hp: Math.floor(sp.base.hp * mult * growth),
    atk: Math.floor(sp.base.atk * mult * growth),
    def: Math.floor(sp.base.def * mult * growth),
    spd: Math.floor(sp.base.spd * spdRarity * spdGrowth)
  }
}

export function positionMatches(speciesId: string, row: Row): boolean {
  return species(speciesId).role === row
}

export interface SynergyResult {
  atk: number
  hp: number
  spd: number
  lines: string[]
  circle: boolean
}

export function synergyForTeam(members: { type: TypeId }[]): SynergyResult {
  const counts = new Map<TypeId, number>()
  for (const member of members) counts.set(member.type, (counts.get(member.type) ?? 0) + 1)
  const circle = (['fire', 'water', 'plant', 'earth'] as TypeId[]).every((t) => (counts.get(t) ?? 0) > 0)
  const lines: string[] = []
  for (const [type, count] of counts) {
    const tier = [...combat.synergy].reverse().find((row) => count >= row.count)
    if (!tier) continue
    const parts = [`+${Math.round(tier.atk * 100)} % ATK`]
    if (tier.hp > 0) parts.push(`+${Math.round(tier.hp * 100)} % HP`)
    lines.push(`${typeLabel(type)} ×${count}: ${parts.join(', ')}`)
  }
  if (circle) lines.push(`Elementarkreis: +${Math.round(combat.elementCircleSpd * 100)} % SPD`)
  return {
    atk: 1,
    hp: 1,
    spd: circle ? 1 + combat.elementCircleSpd : 1,
    lines,
    circle
  }
}

function typeLabel(type: TypeId): string {
  const names: Record<string, string> = {
    fire: 'Feuer', water: 'Wasser', plant: 'Pflanze', earth: 'Erde'
  }
  return names[type] ?? type
}

/** Per-monster synergy multipliers. The highest tier for that monster's own type. */
export function synergyMultFor(type: TypeId, members: { type: TypeId }[]): { atk: number; hp: number; spd: number } {
  const count = members.filter((m) => m.type === type).length
  const tier = [...combat.synergy].reverse().find((row) => count >= row.count)
  const circle = (['fire', 'water', 'plant', 'earth'] as TypeId[]).every((t) => members.some((m) => m.type === t))
  return {
    atk: 1 + (tier?.atk ?? 0),
    hp: 1 + (tier?.hp ?? 0),
    spd: circle ? 1 + combat.elementCircleSpd : 1
  }
}

export function previewStats(monster: MonsterInstance, row: Row | null, teamTypes: TypeId[] | null): InstanceStats {
  const base = instanceStats(monster.speciesId, monster.rarity, monster.level)
  const pos = row != null && positionMatches(monster.speciesId, row)
  const posMult = pos ? 1 + combat.positionBonus : 1
  let atk = base.atk * posMult
  let def = base.def * posMult
  let hp = base.hp
  let spd = base.spd
  if (teamTypes) {
    const members = teamTypes.map((type) => ({ type }))
    const syn = synergyMultFor(species(monster.speciesId).type, members)
    atk *= syn.atk
    hp *= syn.hp
    spd *= syn.spd
  }
  return { hp, atk, def, spd }
}

export function calcDamage(atk: number, def: number, skillMult: number, tMult: number, crit: boolean, variance: number): number {
  const base = combat.dmgScale * atk * atk / (atk + def)
  const critMult = crit ? combat.critMult : 1
  return Math.max(1, Math.floor(base * skillMult * tMult * critMult * variance))
}

export function expectedTypeMult(att: string, def: string): number {
  return typeMult(att as TypeId, def as TypeId)
}

export function roomToMax(monster: MonsterInstance): number {
  const cap = maxLevelFor(monster.rarity)
  if (monster.level >= cap) return 0
  let room = expToNextSafe(monster.level) - monster.exp
  for (let level = monster.level + 1; level < cap; level++) room += expToNextSafe(level)
  return Math.max(0, room)
}

function expToNextSafe(level: number): number {
  return Math.round(combat.expBase * Math.pow(level, combat.expPower))
}

export function grantExp(monster: MonsterInstance, amount: number): { gained: number; overflow: number; levels: number } {
  const cap = maxLevelFor(monster.rarity)
  if (monster.level >= cap || amount <= 0) return { gained: 0, overflow: Math.max(0, amount), levels: 0 }
  let left = amount
  let levels = 0
  while (left > 0 && monster.level < cap) {
    const need = expToNextSafe(monster.level) - monster.exp
    if (left >= need) {
      left -= need
      monster.exp = 0
      monster.level += 1
      levels += 1
    } else {
      monster.exp += left
      left = 0
    }
  }
  if (monster.level >= cap) monster.exp = 0
  return { gained: amount - left, overflow: left, levels }
}

export { SLOT_ROW }
