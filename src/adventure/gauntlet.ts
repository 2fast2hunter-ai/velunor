import { species, typeMult } from '../data'
import { mulberry32 } from '../rng'
import { regionById } from './route'
import type { TypeId } from '../types'
import type { FightSide, FightTrace } from './battle'
import { fight1v1 } from './battle'
import { awakenCount, monStats } from './stats'
import type { SkillDef } from '../types'

export interface BossScale {
  hp: number
  atk: number
  def: number
}

export function bossScale(source: number | { factor?: number; hpFactor?: number; atkFactor?: number; defFactor?: number }): BossScale {
  if (typeof source === 'number') {
    const scale = source > 0 ? source : 1
    return { hp: scale, atk: scale, def: scale }
  }
  const base = source.factor && source.factor > 0 ? source.factor : 1
  return {
    hp: source.hpFactor && source.hpFactor > 0 ? source.hpFactor : base,
    atk: source.atkFactor && source.atkFactor > 0 ? source.atkFactor : base,
    def: source.defFactor && source.defFactor > 0 ? source.defFactor : base
  }
}

export interface GauntletMon {
  species: string
  level: number
  /** 0 means fainted. 1 means full. */
  hpFraction: number
  skillBonus: boolean
  factor: number
  hpFactor?: number
  atkFactor?: number
  defFactor?: number
}

function scaledSkill(skill: SkillDef, level: number, bonus: boolean): SkillDef {
  const extra = bonus ? 0.25 * awakenCount(level) : 0
  if (!extra) return skill
  return {
    ...skill,
    effects: skill.effects.map((effect) => ('atkMult' in effect ? { ...effect, atkMult: effect.atkMult + extra } : effect))
  }
}

/** Six species from this region's road pool: the common one of each type, then the next heaviest. */
export function referenceTeam(regionId: number): string[] {
  const weight = new Map<string, number>()
  for (const chapter of regionById(regionId).chapters) {
    if (chapter.id > 8 || chapter.council || chapter.special || chapter.foyer) continue
    for (const row of chapter.day) weight.set(row.species, (weight.get(row.species) ?? 0) + row.weight)
    for (const row of [...chapter.night, ...(chapter.weather ?? [])]) {
      if (!weight.has(row.species)) weight.set(row.species, 0)
    }
  }
  const ranked = [...weight.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const picked: string[] = []
  const seen = new Set<string>()
  for (const [id] of ranked) {
    const type = species(id).type
    if (seen.has(type)) continue
    picked.push(id)
    seen.add(type)
    if (picked.length === 6) break
  }
  for (const [id] of ranked) {
    if (picked.length === 6) break
    if (!picked.includes(id)) picked.push(id)
  }
  if (picked.length < 6) throw new Error(`Region ${regionId} hat nur ${picked.length} Arten im Pool`)
  return picked
}

export function gauntletSide(mon: GauntletMon): FightSide {
  const sp = species(mon.species)
  const stats = monStats({ species: mon.species, lvl: mon.level, exp: 0, hp: null, shiny: false, caughtAt: 0, caughtWhere: '', keepDupes: false })
  const scale = bossScale(mon)
  const maxHp = Math.max(1, Math.round(stats.hp * scale.hp))
  const fraction = Math.max(0, Math.min(1, mon.hpFraction))
  return {
    speciesId: sp.id,
    name: sp.name,
    type: sp.type,
    maxHp,
    hp: Math.max(1, Math.round(maxHp * (fraction || 0.001))),
    atk: Math.max(1, Math.round(stats.atk * scale.atk)),
    def: Math.max(1, Math.round(stats.def * scale.def)),
    spd: stats.spd,
    skill: scaledSkill(sp.skill, mon.level, mon.skillBonus),
    passive: sp.passive ?? null
  }
}

/** Living ally with the best type match. The active mon stays in if it is still up. */
export function pickGauntlet(team: GauntletMon[], foeType: TypeId, active: number): number {
  if (active >= 0 && (team[active]?.hpFraction ?? 0) > 0) return active
  let best = -1
  let bestScore = -1
  let bestLevel = -1
  for (let i = 0; i < team.length; i++) {
    const mon = team[i]
    if (mon.hpFraction <= 0) continue
    const score = typeMult(species(mon.species).type, foeType)
    if (score > bestScore + 1e-9 || (Math.abs(score - bestScore) <= 1e-9 && mon.level > bestLevel)) {
      best = i
      bestScore = score
      bestLevel = mon.level
    }
  }
  return best
}

/**
 * Warden and council rule: the fight ends when every ally is down or every foe is down.
 * A lost exchange removes that ally. The foe keeps its remaining HP.
 * A won exchange removes that foe. The ally keeps its remaining HP and stays active.
 */
export function settleGauntlet(allies: GauntletMon[], foes: GauntletMon[], rng: () => number): { win: boolean; traces: FightTrace[] } {
  const traces: FightTrace[] = []
  let foeIndex = 0
  let active = -1
  let guard = 0
  while (foeIndex < foes.length && guard < 24) {
    guard += 1
    const foe = foes[foeIndex]
    const allyIndex = pickGauntlet(allies, species(foe.species).type, active)
    if (allyIndex < 0) return { win: false, traces }
    const ally = allies[allyIndex]
    const trace = fight1v1(gauntletSide(ally), gauntletSide(foe), rng, false)
    traces.push(trace)
    if (trace.win) {
      ally.hpFraction = trace.allyMax > 0 ? trace.allyHp / trace.allyMax : 0
      foe.hpFraction = 0
      foeIndex += 1
      active = allyIndex
    } else {
      ally.hpFraction = 0
      foe.hpFraction = trace.foeMax > 0 ? trace.foeHp / trace.foeMax : 0
      active = -1
    }
  }
  return { win: foeIndex >= foes.length, traces }
}

export function clearRate(
  team: string[],
  level: number,
  foes: { species: string; level: number }[],
  scale: number | { factor?: number; hpFactor?: number; atkFactor?: number; defFactor?: number },
  trials: number,
  seed: number
): number {
  const boss = bossScale(scale)
  const rng = mulberry32(seed)
  let wins = 0
  for (let trial = 0; trial < trials; trial++) {
    const allies = team.map((id) => ({ species: id, level, hpFraction: 1, skillBonus: true, factor: 1 }))
    const enemies = foes.map((foe) => ({
      species: foe.species,
      level: foe.level,
      hpFraction: 1,
      skillBonus: false,
      factor: 1,
      hpFactor: boss.hp,
      atkFactor: boss.atk,
      defFactor: boss.def
    }))
    if (settleGauntlet(allies, enemies, rng).win) wins += 1
  }
  return trials ? wins / trials : 0
}
