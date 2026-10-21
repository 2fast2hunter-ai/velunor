import { synergies } from './data'
import type { MonsterClass, TypeId } from './types'

export interface SynergyMember {
  type: TypeId
  class: MonsterClass
}

export interface UnitSynergy {
  hp: number
  atk: number
  def: number
  spd: number
  critChance: number
  critMult: number
  healShield: number
  statusChance: number
}

export interface SynergyView {
  lines: string[]
  active: boolean
}

const CLASS_LABELS: Record<string, string> = {
  guardian: 'Wächter',
  fighter: 'Kämpfer',
  shooter: 'Schütze',
  support: 'Stütze',
  disruptor: 'Störer'
}

/** German class name. Never blank, including support, guardian, and disruptor. */
export function classLabel(id: string): string {
  const fromData = (synergies.classNames as Record<string, string> | undefined)?.[id]
  const label = (typeof fromData === 'string' ? fromData.trim() : '') || CLASS_LABELS[id] || id.trim()
  return label || 'Klasse'
}

/** One team-screen line. Progress rows are names, so two separators never collapse into an empty role. */
export function synergySummary(power: number, lines: string[]): string {
  const bits = lines.map((line) => line.trim()).filter((line) => line.length > 0 && !/^·+$/.test(line))
  return [`Kampfkraft ${power}`, ...(bits.length ? bits : ['Noch keine Synergie.'])].join(' · ')
}

const TYPE_NAMES: Record<string, string> = {
  fire: 'Feuer', water: 'Wasser', plant: 'Pflanze', earth: 'Erde', wind: 'Wind', ice: 'Eis', lightning: 'Blitz',
  poison: 'Gift', metal: 'Metall', stone: 'Stein', insect: 'Insekt', fighting: 'Kampf', crystal: 'Kristall'
}

function cap(n: number): number {
  return Math.max(0, Math.min(synergies.capPerStat, n))
}

export function synergyView(members: SynergyMember[], typeOn: boolean, classOn: boolean): SynergyView {
  const lines: string[] = []
  let active = false
  if (typeOn) {
    const counts = new Map<TypeId, number>()
    for (const member of members) counts.set(member.type, (counts.get(member.type) ?? 0) + 1)
    for (const [type, count] of counts) {
      const tier = tierFor(String(count))
      if (!tier) continue
      const parts = [`+${pct(tier.atk)} ATK`]
      if (tier.hp) parts.push(`+${pct(tier.hp)} HP`)
      lines.push(`${TYPE_NAMES[type] ?? type} ×${count}: ${parts.join(', ')}`)
      active = true
    }
    for (const combo of synergies.typeCombos) {
      if (!comboActive(combo, counts)) continue
      lines.push(`${combo.name}: ${bonusText(combo.bonus)}`)
      active = true
    }
  }
  if (classOn) {
    const counts = classCounts(members)
    const listed = new Set<string>()
    for (const [id, tiers] of Object.entries(synergies.classTiers)) {
      listed.add(id)
      const count = counts.get(id as MonsterClass) ?? 0
      const tier = [...tiers].reverse().find((row) => count >= row.count)
      const name = classLabel(id)
      if (!tier) {
        const need = tiers[0]?.count ?? 2
        if (count > 0 && count < need) lines.push(`${name} ${count}/${need}`)
        continue
      }
      lines.push(`${name} ×${count}: ${bonusText(tier.bonus)}`)
      active = true
    }
    for (const [id, count] of counts) {
      if (listed.has(id) || count <= 0) continue
      lines.push(`${classLabel(id)} ${count}`)
    }
    if (balancedOn(counts)) {
      lines.push(`${synergies.balanced.name}: ${bonusText(synergies.balanced.bonus)}`)
      active = true
    }
  } else if (members.length) {
    lines.push('Klassen-Synergien ab Rathaus 3')
  }
  return { lines, active }
}

export function unitSynergy(member: SynergyMember, members: SynergyMember[], typeOn: boolean, classOn: boolean): UnitSynergy {
  const bonus = { hp: 0, atk: 0, def: 0, spd: 0, critChance: 0, critDamage: 0, healShield: 0, statusChance: 0 }
  if (typeOn) {
    const counts = new Map<TypeId, number>()
    for (const row of members) counts.set(row.type, (counts.get(row.type) ?? 0) + 1)
    const own = tierFor(String(counts.get(member.type) ?? 0))
    if (own) {
      bonus.atk += own.atk ?? 0
      bonus.hp += own.hp ?? 0
    }
    for (const combo of synergies.typeCombos) {
      if (!comboActive(combo, counts)) continue
      if (combo.appliesTo === 'matching' && !(combo.requires ?? []).includes(member.type)) continue
      addBonus(bonus, combo.bonus)
    }
  }
  if (classOn) {
    const counts = classCounts(members)
    for (const [id, tiers] of Object.entries(synergies.classTiers)) {
      const count = counts.get(id as MonsterClass) ?? 0
      const tier = [...tiers].reverse().find((row) => count >= row.count)
      if (!tier) continue
      if (tier.appliesTo === 'class' && member.class !== id) continue
      addBonus(bonus, tier.bonus)
    }
    if (balancedOn(counts)) addBonus(bonus, synergies.balanced.bonus)
  }
  return {
    hp: 1 + cap(bonus.hp),
    atk: 1 + cap(bonus.atk),
    def: 1 + cap(bonus.def),
    spd: 1 + cap(bonus.spd),
    critChance: Math.min(synergies.critChanceCap, bonus.critChance),
    critMult: bonus.critDamage,
    healShield: bonus.healShield,
    statusChance: bonus.statusChance
  }
}

function tierFor(count: string): { atk?: number; hp?: number } | undefined {
  return (synergies.typeTiers as Record<string, { atk?: number; hp?: number }>)[count]
}

function comboActive(combo: { requires?: string[]; minDistinctTypes?: number }, counts: Map<TypeId, number>): boolean {
  if (combo.minDistinctTypes) return counts.size >= combo.minDistinctTypes
  return (combo.requires ?? []).every((type) => (counts.get(type as TypeId) ?? 0) > 0)
}

function classCounts(members: SynergyMember[]): Map<MonsterClass, number> {
  const counts = new Map<MonsterClass, number>()
  for (const member of members) counts.set(member.class, (counts.get(member.class) ?? 0) + 1)
  return counts
}

function balancedOn(counts: Map<MonsterClass, number>): boolean {
  const req = synergies.balanced.requires
  const fighters = (counts.get('fighter') ?? 0) + (counts.get('shooter') ?? 0)
  return (counts.get('guardian') ?? 0) >= req.guardian && (counts.get('support') ?? 0) >= req.support && fighters >= req.fighterOrShooter
}

function addBonus(into: Record<string, number>, bonus: Record<string, number | undefined>): void {
  for (const [key, value] of Object.entries(bonus)) into[key] = (into[key] ?? 0) + (value ?? 0)
}

function bonusText(bonus: Record<string, number | undefined>): string {
  const names: Record<string, string> = {
    hp: 'HP', atk: 'ATK', def: 'DEF', spd: 'SPD', critChance: 'Krit', critDamage: 'Krit-Schaden', healShield: 'Heilung/Schild', statusChance: 'Status'
  }
  return Object.entries(bonus).map(([key, value]) => `+${pct(value)} ${names[key] ?? key}`).join(', ')
}

function pct(value: number | undefined): string {
  return `${Math.round((value ?? 0) * 100)} %`
}
