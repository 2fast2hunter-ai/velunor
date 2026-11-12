import { combat, typeMult } from '../data'
import { nextFloat } from '../rng'
import type { SkillDef, SkillEffect, SpeciesPassive, StatusId, TypeId } from '../types'
import { ACTION_LIMIT } from './const'
import { awakenCount } from './stats'

export interface FightSide {
  speciesId: string
  name: string
  type: TypeId
  maxHp: number
  hp: number
  atk: number
  def: number
  spd: number
  skill: SkillDef
  passive: SpeciesPassive | null
  /** Presentation only. Damage already includes the awaken bonus. */
  level?: number
}

export interface FightHit {
  from: 'ally' | 'foe'
  amount: number
  crit: boolean
  type: TypeId
  band: 'strong' | 'weak' | 'neutral'
  ko: boolean
  kind: 'hit' | 'heal' | 'status'
  /** Lv 25/50 glow. Does not change the damage. */
  awaken?: boolean
}

export interface FightFrame {
  allyHp: number
  foeHp: number
  text: string
  hits?: FightHit[]
}

export interface FightTrace {
  allySpecies: string
  foeSpecies: string
  allyName: string
  foeName: string
  allyMax: number
  foeMax: number
  frames: FightFrame[]
  win: boolean
  foeKo: boolean
  allyKo: boolean
  timeout: boolean
  allyHp: number
  foeHp: number
}

interface StatusInst {
  id: StatusId
  duration: number
  value: number
  stacks: number
  burnDmg: number
  fresh: boolean
}

interface Actor {
  side: FightSide
  hp: number
  cd: number
  shield: number
  shieldTurns: number
  shieldFresh: boolean
  statuses: StatusInst[]
  rebirths: number
  rebirthPct: number
  passiveLeft: number
  passivePct: number
  passiveShield: number
  passiveDuration: number
}

const ALLY_TARGET = new Set(['self', 'ally_all', 'ally_lowest_hp_pct', 'self_and_ally_lowest_hp_pct'])
const NEGATIVE: StatusId[] = ['burn', 'stun', 'poison', 'def_down', 'atk_down', 'spd_down']

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function mod(unit: Actor, up: StatusId, down: StatusId): number {
  let value = 0
  for (const status of unit.statuses) {
    if (status.id === up) value += status.value
    if (status.id === down) value -= status.value
  }
  return clamp(value, combat.modMin, combat.modMax)
}

function atkOf(unit: Actor): number {
  return unit.side.atk * (1 + mod(unit, 'atk_up', 'atk_down'))
}

function defOf(unit: Actor, pierce = 0): number {
  return Math.max(0, unit.side.def * (1 + mod(unit, 'def_up', 'def_down')) * (1 - pierce))
}

/** Published strike: 1.5·ATK²/(ATK+DEF) × type × variance × crit. */
export function rawDamage(atk: number, def: number, skillMult: number, tMult: number, crit: boolean, variance: number): number {
  const safeDef = Math.max(0, def)
  const base = combat.dmgScale * atk * atk / (atk + safeDef)
  const critMult = crit ? combat.critMult : 1
  return Math.max(1, Math.floor(base * skillMult * tMult * critMult * variance))
}

function makeActor(side: FightSide): Actor {
  const passive = side.passive
  let rebirths = 0
  let rebirthPct = 0
  let passiveLeft = 0
  let passivePct = 1
  let passiveShield = 0
  let passiveDuration = 2
  if (passive && passive.hpPct != null && !passive.trigger) {
    rebirths = passive.usesPerBattle
    rebirthPct = passive.hpPct
  } else if (passive?.trigger?.kind === 'hp_below') {
    passiveLeft = passive.usesPerBattle
    passivePct = passive.trigger.pct ?? 0.5
    const shield = passive.effects?.find((effect) => effect.kind === 'shield')
    if (shield && shield.kind === 'shield') {
      passiveShield = shield.maxHpPctOfCaster
      passiveDuration = shield.duration
    }
  }
  return {
    side,
    hp: Math.max(0, Math.min(side.maxHp, side.hp)),
    cd: side.skill.initialCooldown,
    shield: 0,
    shieldTurns: 0,
    shieldFresh: false,
    statuses: [],
    rebirths,
    rebirthPct,
    passiveLeft,
    passivePct,
    passiveShield,
    passiveDuration
  }
}

function skillUsable(unit: Actor, foe: Actor): boolean {
  const skill = unit.side.skill
  const kinds = new Set(skill.effects.map((effect) => effect.kind))
  const ally = ALLY_TARGET.has(skill.target)
  if (!ally && foe.hp <= 0) return false
  if (kinds.size === 1 && kinds.has('heal') && unit.hp >= unit.side.maxHp - 0.01) return false
  return true
}

function applyStatus(target: Actor, effect: Extract<SkillEffect, { kind: 'status' }>, caster: Actor): void {
  const duration = effect.duration
  const value = effect.value ?? 0
  if (effect.status === 'burn') {
    const burnDmg = Math.max(0, Math.floor(atkOf(caster) * (value || combat.burnAtkFraction)))
    const existing = target.statuses.find((row) => row.id === 'burn')
    if (existing) {
      existing.duration = duration
      existing.burnDmg = burnDmg
      existing.fresh = true
    } else target.statuses.push({ id: 'burn', duration, value, stacks: 1, burnDmg, fresh: true })
    return
  }
  if (effect.status === 'poison') {
    const stacks = effect.stacks ?? 1
    const existing = target.statuses.find((row) => row.id === 'poison')
    if (existing) {
      existing.stacks = Math.min(3, existing.stacks + stacks)
      existing.duration = duration
      existing.fresh = true
    } else target.statuses.push({ id: 'poison', duration, value, stacks: Math.min(3, stacks), burnDmg: 0, fresh: true })
    return
  }
  const existing = target.statuses.find((row) => row.id === effect.status)
  if (existing) {
    existing.duration = duration
    existing.value = value
    existing.fresh = true
  } else target.statuses.push({ id: effect.status, duration, value, stacks: 1, burnDmg: 0, fresh: true })
}

function giveShield(target: Actor, amount: number, duration: number): void {
  const next = Math.max(0, Math.floor(amount))
  if (next >= target.shield) {
    target.shield = next
    target.shieldTurns = duration
    target.shieldFresh = true
  }
}

function maybePassive(unit: Actor): void {
  if (unit.passiveLeft <= 0 || unit.hp <= 0) return
  if (unit.hp / unit.side.maxHp > unit.passivePct) return
  unit.passiveLeft = 0
  if (unit.passiveShield > 0) giveShield(unit, unit.side.maxHp * unit.passiveShield, unit.passiveDuration)
}

function tick(unit: Actor): void {
  for (const status of unit.statuses) {
    if (status.fresh) status.fresh = false
    else status.duration -= 1
  }
  unit.statuses = unit.statuses.filter((status) => status.duration > 0)
  if (unit.shield > 0) {
    if (unit.shieldFresh) unit.shieldFresh = false
    else {
      unit.shieldTurns -= 1
      if (unit.shieldTurns <= 0) {
        unit.shield = 0
        unit.shieldTurns = 0
      }
    }
  }
}

export function fight1v1(allySide: FightSide, foeSide: FightSide, rng: () => number, trace: boolean): FightTrace {
  const ally = makeActor(allySide)
  const foe = makeActor(foeSide)
  const frames: FightFrame[] = []
  const pending: FightHit[] = []
  const push = (text: string) => {
    if (!trace) return
    frames.push({ allyHp: Math.max(0, ally.hp), foeHp: Math.max(0, foe.hp), text, hits: pending.splice(0) })
  }
  const bandOf = (mult: number): FightHit['band'] => (mult > 1 ? 'strong' : mult < 1 ? 'weak' : 'neutral')
  push(`${ally.side.name} gegen ${foe.side.name}`)

  const hurt = (target: Actor, amount: number, ignoreShield: boolean): number => {
    let remaining = amount
    if (!ignoreShield && target.shield > 0 && remaining > 0) {
      const absorbed = Math.min(target.shield, remaining)
      target.shield -= absorbed
      remaining -= absorbed
      if (target.shield <= 0) {
        target.shield = 0
        target.shieldTurns = 0
      }
    }
    const past = remaining
    if (remaining > 0) target.hp -= remaining
    if (target.hp <= 0) {
      if (target.rebirths > 0) {
        target.rebirths -= 1
        target.hp = Math.max(1, Math.floor(target.side.maxHp * target.rebirthPct))
        target.statuses = []
        target.shield = 0
        target.shieldTurns = 0
      } else target.hp = 0
    } else maybePassive(target)
    return past
  }

  const strike = (attacker: Actor, target: Actor, skillMult: number, pierce: number): number => {
    const tMult = typeMult(attacker.side.type, target.side.type)
    const crit = rng() < combat.critChance
    const variance = combat.varianceMin + (combat.varianceMax - combat.varianceMin) * rng()
    const dmg = rawDamage(atkOf(attacker), defOf(target, pierce), skillMult, tMult, crit, variance)
    const past = hurt(target, dmg, false)
    if (trace && past > 0) {
      pending.push({
        from: attacker === ally ? 'ally' : 'foe',
        amount: past,
        crit,
        type: attacker.side.type,
        band: bandOf(tMult),
        ko: target.hp <= 0,
        kind: 'hit',
        awaken: awakenCount(attacker.side.level ?? 0) > 0
      })
    }
    const thorns = target.statuses.find((status) => status.id === 'thorns')
    if (past > 0 && thorns && attacker.hp > 0) {
      const reflected = Math.floor(past * thorns.value)
      if (reflected > 0) hurt(attacker, reflected, false)
    }
    return dmg
  }

  const cast = (unit: Actor, other: Actor) => {
    const skill = unit.side.skill
    const allyTarget = ALLY_TARGET.has(skill.target)
    const damaged = { ok: false }
    const hadDamage = skill.effects.some((effect) => effect.kind === 'damage')
    for (const effect of skill.effects) {
      if (effect.kind === 'damage') {
        const hits = effect.hits ?? 1
        for (let hit = 0; hit < hits; hit++) {
          if (unit.hp <= 0 || other.hp <= 0) break
          const dealt = strike(unit, other, effect.atkMult, effect.defPierce ?? 0)
          if (dealt > 0) damaged.ok = true
        }
      } else if (effect.kind === 'heal') {
        const gain = Math.floor(atkOf(unit) * effect.atkMult)
        unit.hp = Math.min(unit.side.maxHp, unit.hp + gain)
        if (trace && gain > 0) pending.push({ from: unit === ally ? 'ally' : 'foe', amount: gain, crit: false, type: unit.side.type, band: 'neutral', ko: false, kind: 'heal' })
      } else if (effect.kind === 'shield') {
        giveShield(unit, unit.side.maxHp * effect.maxHpPctOfCaster, effect.duration)
      } else if (effect.kind === 'cleanse') {
        unit.statuses = unit.statuses.filter((status) => !NEGATIVE.includes(status.id))
      } else if (effect.kind === 'status') {
        const own = effect.target ? ALLY_TARGET.has(effect.target) : allyTarget
        const victim = own ? unit : other
        if (hadDamage && !own && !damaged.ok) continue
        if (victim.hp <= 0) continue
        if (rng() >= effect.chance) continue
        applyStatus(victim, effect, unit)
        if (trace) pending.push({ from: unit === ally ? 'ally' : 'foe', amount: 0, crit: false, type: unit.side.type, band: 'neutral', ko: false, kind: 'status' })
      }
    }
    unit.cd = skill.cooldown
    push(`${unit.side.name} setzt ${skill.name ?? 'eine Fähigkeit'} ein.`)
  }

  const act = (unit: Actor, other: Actor) => {
    if (unit.hp <= 0 || other.hp <= 0) return
    const burn = unit.statuses.find((status) => status.id === 'burn')
    if (burn) hurt(unit, burn.burnDmg, true)
    if (unit.hp <= 0) {
      push(`${unit.side.name} geht k.o.`)
      return
    }
    const poison = unit.statuses.find((status) => status.id === 'poison')
    if (poison) hurt(unit, Math.floor(unit.side.maxHp * 0.04 * poison.stacks), true)
    if (unit.hp <= 0) {
      push(`${unit.side.name} geht k.o.`)
      return
    }
    if (unit.statuses.some((status) => status.id === 'stun')) {
      unit.statuses = unit.statuses.filter((status) => status.id !== 'stun')
      tick(unit)
      push(`${unit.side.name} ist benommen.`)
      return
    }
    if (unit.cd <= 0 && skillUsable(unit, other)) cast(unit, other)
    else {
      if (other.hp > 0 && unit.hp > 0) strike(unit, other, 1, 0)
      if (unit.cd > 0) unit.cd -= 1
      push(`${unit.side.name} greift an.`)
    }
    if (unit.hp > 0) tick(unit)
  }

  const allyFirst = ally.side.spd >= foe.side.spd
  let actions = 0
  let timeout = false
  while (actions < ACTION_LIMIT && ally.hp > 0 && foe.hp > 0) {
    const turn = actions % 2 === 0 ? (allyFirst ? ally : foe) : (allyFirst ? foe : ally)
    const other = turn === ally ? foe : ally
    act(turn, other)
    actions += 1
  }
  if (ally.hp > 0 && foe.hp > 0) timeout = true
  const allyPct = ally.hp / ally.side.maxHp
  const foePct = foe.hp / foe.side.maxHp
  const win = ally.hp > 0 && (foe.hp <= 0 || allyPct > foePct || (timeout && allyPct === foePct))
  if (timeout) push(win ? 'Die Kraft reicht. Sieg.' : 'Die Kraft reicht nicht.')
  return {
    allySpecies: ally.side.speciesId,
    foeSpecies: foe.side.speciesId,
    allyName: ally.side.name,
    foeName: foe.side.name,
    allyMax: ally.side.maxHp,
    foeMax: foe.side.maxHp,
    frames,
    win,
    foeKo: foe.hp <= 0,
    allyKo: ally.hp <= 0,
    timeout,
    allyHp: Math.max(0, ally.hp),
    foeHp: Math.max(0, foe.hp)
  }
}

export function fightSeeded(ally: FightSide, foe: FightSide, seed: { seed: number }, trace: boolean): FightTrace {
  return fight1v1(ally, foe, () => nextFloat(seed), trace)
}
