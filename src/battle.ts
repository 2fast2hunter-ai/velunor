import { combat, skillsCfg, species, typeMult } from './data'
import { mulberry32 } from './rng'
import { instanceStats } from './stats'
import { unitSynergy, type SynergyMember } from './synergy'
import {
  SLOT_LANE,
  SLOT_ROW,
  type BattleEvent,
  type BattleInput,
  type BattleLog,
  type BattleUnitInput,
  type BossAction,
  type BossMechanic,
  type Rarity,
  type Row,
  type Side,
  type SkillDef,
  type SkillEffect,
  type SkillTarget,
  type SlotId,
  type StatusId,
  type TypeId
} from './types'

interface StatusInst {
  id: StatusId
  duration: number
  value: number
  stacks: number
  burnDmg: number
  appliedSeq: number
}

interface ActiveSkill {
  def: SkillDef
  cd: number
  rank: number
  signature: boolean
}

interface PassiveInst {
  id: string
  usesLeft: number
  trigger: { kind: string; pct?: number; firstOnly?: boolean }
  effects: { kind: string; hp?: number; pctOfDamage?: number; stat?: string; value?: number; status?: string; chance?: number; duration?: number; stacks?: number; maxHpPctOfCaster?: number; target?: string }[]
  fired: boolean
}

interface Combatant {
  id: string
  side: Side
  slot: SlotId
  lane: number
  row: Row
  role: Row
  speciesId: string
  name: string
  type: TypeId
  rarity: Rarity
  baseSpd: number
  maxHp: number
  hp: number
  atk: number
  def: number
  spd: number
  actives: ActiveSkill[]
  rebirthsLeft: number
  rebirthHpPct: number
  passives: PassiveInst[]
  mechanics: (BossMechanic & { fired: boolean })[]
  poisonPct: number
  stunChanceMult: number
  critChance: number
  critMult: number
  healShield: number
  statusChance: number
  strongType: number
  shield: number
  shieldTurns: number
  shieldAppliedSeq: number
  statuses: StatusInst[]
  alive: boolean
  pendingRebirth: boolean
  revivedThisRound: boolean
  koCounted: boolean
  summoned: boolean
  hitTaken: boolean
}

const NEGATIVE: StatusId[] = ['burn', 'stun', 'poison', 'def_down', 'atk_down', 'spd_down']

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function modOf(unit: Combatant, up: StatusId, down: StatusId): number {
  let mod = 0
  for (const status of unit.statuses) {
    if (status.id === up) mod += status.value
    if (status.id === down) mod -= status.value
  }
  return clamp(mod, combat.modMin, combat.modMax)
}

function atkEff(unit: Combatant): number {
  return unit.atk * (1 + modOf(unit, 'atk_up', 'atk_down'))
}

function defEff(unit: Combatant, pierce = 0): number {
  return unit.def * (1 + modOf(unit, 'def_up', 'def_down')) * (1 - pierce)
}

function spdEff(unit: Combatant): number {
  return unit.spd * (1 + modOf(unit, 'spd_up', 'spd_down'))
}

function learnSkill(id: string | null | undefined): SkillDef | null {
  if (!id) return null
  const found = skillsCfg.learnSkills.find((skill) => skill.id === id)
  return (found as SkillDef | undefined) ?? null
}

function passiveById(id: string | null | undefined): PassiveInst | null {
  if (!id) return null
  const found = skillsCfg.passives.find((passive) => passive.id === id)
  if (!found) return null
  return {
    id: found.id,
    usesLeft: found.usesPerBattle === 0 ? Infinity : found.usesPerBattle,
    trigger: found.trigger,
    effects: found.effects as PassiveInst['effects'],
    fired: false
  }
}

function buildOne(input: BattleUnitInput, side: Side, members: SynergyMember[], typeOn: boolean, classOn: boolean, summonId?: string): Combatant {
  const sp = species(input.speciesId)
  const row = SLOT_ROW[input.slot]
  let hp: number
  let atk: number
  let def: number
  let spd: number
  let critChance = combat.critChance
  let critMult = combat.critMult
  let healShield = 0
  let statusChance = 0
  let strongType = 0
  if (input.fixed) {
    hp = input.fixed.hp
    atk = input.fixed.atk
    def = input.fixed.def
    spd = input.fixed.spd
  } else {
    const inst = instanceStats(input.speciesId, input.rarity, input.level, input.potential)
    const pos = sp.role === row ? 1 + combat.positionBonus : 1
    const syn = unitSynergy({ type: sp.type, class: sp.class }, members, typeOn, classOn)
    atk = inst.atk * pos * syn.atk * (input.atkMult ?? (input.boss ? 0.85 : 1))
    def = inst.def * pos * syn.def
    hp = inst.hp * syn.hp * (input.hpMult ?? (input.boss ? combat.bossHpMult : 1))
    spd = inst.spd * syn.spd
    critChance = Math.min(0.5, combat.critChance + syn.critChance)
    critMult = combat.critMult + syn.critMult
    healShield = syn.healShield
    statusChance = syn.statusChance
    strongType = 0
  }
  const rank = input.sigRank ?? 1
  const actives: ActiveSkill[] = [{ def: sp.skill, cd: sp.skill.initialCooldown, rank, signature: true }]
  const learned = learnSkill(input.learned)
  if (learned) actives.push({ def: learned, cd: learned.initialCooldown, rank: 1, signature: false })
  const order = input.skillOrder ?? ['sig', 'slot2']
  actives.sort((a, b) => order.indexOf(a.signature ? 'sig' : 'slot2') - order.indexOf(b.signature ? 'sig' : 'slot2'))
  const passives: PassiveInst[] = []
  const slot3 = passiveById(input.slot3)
  if (slot3) {
    const mod = slot3.effects.find((effect) => effect.kind === 'mod' && effect.stat === 'strongTypeDamage')
    if (mod?.value) strongType += mod.value
    if (slot3.trigger.kind !== 'passive_mod') passives.push(slot3)
  }
  let rebirthsLeft = 0
  let rebirthHpPct = 0
  if (sp.passive?.id === 'rebirth') {
    rebirthsLeft = sp.passive.usesPerBattle
    rebirthHpPct = sp.passive.hpPct ?? 0.4
  } else if (sp.passive?.trigger) {
    passives.push({
      id: sp.passive.id,
      usesLeft: sp.passive.usesPerBattle === 0 ? Infinity : sp.passive.usesPerBattle,
      trigger: sp.passive.trigger,
      effects: (sp.passive.effects ?? []) as PassiveInst['effects'],
      fired: false
    })
  }
  return {
    id: summonId ?? `${side}-${input.slot}`,
    side,
    slot: input.slot,
    lane: SLOT_LANE[input.slot],
    row,
    role: sp.role,
    speciesId: sp.id,
    name: sp.name,
    type: sp.type,
    rarity: input.rarity,
    baseSpd: sp.base.spd,
    maxHp: hp,
    hp,
    atk,
    def,
    spd,
    actives,
    rebirthsLeft,
    rebirthHpPct,
    passives,
    mechanics: (input.mechanics ?? []).map((mech) => ({ ...mech, fired: false })),
    poisonPct: input.poisonPctPerStack ?? 0.04,
    stunChanceMult: input.stunChanceMult ?? 1,
    critChance,
    critMult,
    healShield,
    statusChance,
    strongType,
    shield: 0,
    shieldTurns: 0,
    shieldAppliedSeq: -1,
    statuses: [],
    alive: true,
    pendingRebirth: false,
    revivedThisRound: false,
    koCounted: false,
    summoned: Boolean(summonId),
    hitTaken: false
  }
}

function buildSide(inputs: BattleUnitInput[], side: Side, typeOn: boolean, classOn: boolean): Combatant[] {
  const members: SynergyMember[] = inputs.map((input) => {
    const sp = species(input.speciesId)
    return { type: sp.type, class: sp.class }
  })
  return inputs.map((input) => buildOne(input, side, members, typeOn, classOn))
}

function living(units: Combatant[], side?: Side): Combatant[] {
  return units.filter((unit) => unit.alive && (side == null || unit.side === side))
}

function compareTurn(a: Combatant, b: Combatant): number {
  const spdA = spdEff(a)
  const spdB = spdEff(b)
  if (spdB !== spdA) return spdB - spdA
  if (b.baseSpd !== a.baseSpd) return b.baseSpd - a.baseSpd
  if (a.side !== b.side) return a.side === 'A' ? -1 : 1
  if (a.lane !== b.lane) return a.lane - b.lane
  if (a.row !== b.row) return a.row === 'front' ? -1 : 1
  return 0
}

function lowestHp(list: Combatant[]): Combatant {
  return [...list].sort((a, b) => a.hp - b.hp || a.lane - b.lane || (a.row === 'front' ? -1 : 1) - (b.row === 'front' ? -1 : 1))[0]
}

function lowestHpPct(list: Combatant[]): Combatant {
  return [...list].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp || a.hp - b.hp || a.lane - b.lane)[0]
}

function hasTaunt(unit: Combatant): boolean {
  return unit.statuses.some((status) => status.id === 'taunt')
}

function hasNegative(unit: Combatant): boolean {
  return unit.statuses.some((status) => NEGATIVE.includes(status.id))
}

function standardTarget(attacker: Combatant, units: Combatant[]): Combatant | null {
  const foes = living(units, attacker.side === 'A' ? 'B' : 'A')
  if (!foes.length) return null
  const taunts = foes.filter(hasTaunt)
  if (taunts.length) return lowestHp(taunts)
  const front = foes.filter((foe) => foe.row === 'front')
  const row = front.length ? front : foes.filter((foe) => foe.row === 'back')
  if (attacker.role === 'front') {
    const same = row.find((foe) => foe.lane === attacker.lane)
    if (same) return same
    return lowestHp(row)
  }
  return lowestHp(row)
}

function targetsFor(caster: Combatant, units: Combatant[], target: SkillTarget, attacker?: Combatant): Combatant[] | null {
  const enemySide: Side = caster.side === 'A' ? 'B' : 'A'
  const foes = living(units, enemySide)
  const allies = living(units, caster.side)
  switch (target) {
    case 'default': {
      const found = standardTarget(caster, units)
      return found ? [found] : null
    }
    case 'enemy_all':
    case 'enemy_random':
      return foes.length ? foes : null
    case 'enemy_front_all': {
      if (!foes.length) return null
      const front = foes.filter((foe) => foe.row === 'front')
      return front.length ? front : foes.filter((foe) => foe.row === 'back')
    }
    case 'enemy_back_all': {
      if (!foes.length) return null
      const back = foes.filter((foe) => foe.row === 'back')
      return back.length ? back : foes.filter((foe) => foe.row === 'front')
    }
    case 'enemy_back_lowest_hp': {
      const taunts = foes.filter(hasTaunt)
      if (taunts.length) return [lowestHp(taunts)]
      const back = foes.filter((foe) => foe.row === 'back')
      if (back.length) return [lowestHp(back)]
      const fallback = standardTarget(caster, units)
      return fallback ? [fallback] : null
    }
    case 'self':
      return [caster]
    case 'ally_all':
      return allies.length ? allies : null
    case 'ally_lowest_hp_pct': {
      const injured = allies.filter((ally) => ally.hp < ally.maxHp - 0.01)
      if (!injured.length) return null
      return [lowestHpPct(injured)]
    }
    case 'self_and_ally_lowest_hp_pct': {
      const picked = [caster]
      const others = allies.filter((ally) => ally !== caster)
      if (others.length) picked.push(lowestHpPct(others))
      return picked
    }
    case 'attacker':
      return attacker ? [attacker] : null
    default:
      return null
  }
}

function skillReady(skill: SkillDef, caster: Combatant, units: Combatant[]): boolean {
  const kinds = new Set(skill.effects.map((effect) => effect.kind))
  const picked = targetsFor(caster, units, skill.target)
  if (!picked?.length) return false
  if (kinds.size === 1 && kinds.has('heal') && !living(units, caster.side).some((ally) => ally.hp < ally.maxHp - 0.01)) return false
  if (kinds.size === 1 && kinds.has('cleanse') && !living(units, caster.side).some(hasNegative)) return false
  return true
}

export function simulateBattle(input: BattleInput): BattleLog {
  const rng = mulberry32(input.seed)
  const units = [
    ...buildSide(input.allies, 'A', input.allySynergy, Boolean(input.allyClassSynergy)),
    ...buildSide(input.enemies, 'B', input.enemySynergy, Boolean(input.enemyClassSynergy))
  ]
  const events: BattleEvent[] = []
  let actionSeq = 0
  let result: 'win' | 'loss' | null = null
  let rounds = 0
  let summonCount = 0

  const outcome = (): 'win' | 'loss' | null => {
    if (!living(units, 'B').length) return 'win'
    if (!living(units, 'A').length) return 'loss'
    return null
  }

  const markKo = (unit: Combatant) => {
    unit.alive = false
    unit.hp = 0
    if (unit.rebirthsLeft > 0) unit.pendingRebirth = true
    else if (unit.side === 'A' && !unit.summoned) unit.koCounted = true
    events.push({ r: rounds, kind: 'ko', target: unit.id })
    if (!unit.pendingRebirth) {
      for (const ally of living(units, unit.side)) triggerPassives(ally, 'on_ally_ko', unit)
    }
  }

  const resolveRebirths = () => {
    for (const unit of units) {
      if (!unit.pendingRebirth) continue
      unit.pendingRebirth = false
      unit.rebirthsLeft -= 1
      unit.alive = true
      unit.hp = Math.max(1, Math.floor(unit.maxHp * unit.rebirthHpPct))
      unit.statuses = []
      unit.shield = 0
      unit.shieldTurns = 0
      unit.revivedThisRound = true
      events.push({ r: rounds, kind: 'revive', target: unit.id, hp: unit.hp })
    }
  }

  const applyStatus = (target: Combatant, status: StatusId, duration: number, value: number, caster: Combatant, stacks = 1) => {
    if (!target.alive && status !== 'stun') return
    if (!target.alive) return
    if (status === 'burn') {
      const burnDmg = Math.max(0, Math.floor(atkEff(caster) * (value || combat.burnAtkFraction)))
      const existing = target.statuses.find((row) => row.id === 'burn')
      if (existing) {
        existing.duration = duration
        existing.burnDmg = burnDmg
        existing.appliedSeq = actionSeq
      } else target.statuses.push({ id: 'burn', duration, value, stacks: 1, burnDmg, appliedSeq: actionSeq })
    } else if (status === 'poison') {
      const existing = target.statuses.find((row) => row.id === 'poison')
      if (existing) {
        existing.stacks = Math.min(3, existing.stacks + stacks)
        existing.duration = duration
        existing.appliedSeq = actionSeq
      } else target.statuses.push({ id: 'poison', duration, value, stacks: Math.min(3, stacks), burnDmg: 0, appliedSeq: actionSeq })
    } else {
      const existing = target.statuses.find((row) => row.id === status)
      if (existing) {
        existing.duration = duration
        existing.value = value
        existing.appliedSeq = actionSeq
      } else target.statuses.push({ id: status, duration, value, stacks: 1, burnDmg: 0, appliedSeq: actionSeq })
    }
    events.push({ r: rounds, kind: 'status_add', target: target.id, status })
  }

  const giveShield = (target: Combatant, amount: number, duration: number, actor: Combatant) => {
    const boosted = Math.floor(amount * (1 + actor.healShield))
    if (boosted >= target.shield) {
      target.shield = boosted
      target.shieldTurns = duration
      target.shieldAppliedSeq = actionSeq
    }
    events.push({ r: rounds, kind: 'shield', actor: actor.id, target: target.id, amount: boosted })
  }

  const healUnit = (actor: Combatant, target: Combatant, amount: number) => {
    const boosted = Math.floor(amount * (1 + actor.healShield))
    const before = target.hp
    target.hp = Math.min(target.maxHp, target.hp + boosted)
    events.push({ r: rounds, kind: 'heal', actor: actor.id, target: target.id, amount: target.hp - before })
  }

  function triggerPassives(unit: Combatant, kind: string, other?: Combatant, damage = 0): void {
    for (const passive of unit.passives) {
      if (passive.trigger.kind !== kind || passive.usesLeft <= 0) continue
      if (passive.trigger.firstOnly && passive.fired) continue
      if (kind === 'hp_below' && unit.hp / unit.maxHp > (passive.trigger.pct ?? 1)) continue
      passive.fired = true
      passive.usesLeft -= 1
      events.push({ r: rounds, kind: 'passive', actor: unit.id, passiveId: passive.id })
      for (const effect of passive.effects) {
        if (effect.kind === 'shield' && effect.maxHpPctOfCaster) giveShield(unit, Math.floor(unit.maxHp * effect.maxHpPctOfCaster), effect.duration ?? 2, unit)
        if (effect.kind === 'lifesteal' && effect.pctOfDamage) healUnit(unit, unit, Math.floor(damage * effect.pctOfDamage))
        if (effect.kind === 'status' && effect.status && other) {
          const chance = Math.min(1, (effect.chance ?? 1) + unit.statusChance)
          if (rng() < chance) applyStatus(effect.target === 'attacker' ? other : unit, effect.status as StatusId, effect.duration ?? 2, effect.value ?? 0, unit, effect.stacks ?? 1)
        }
        if (effect.kind === 'status' && effect.status && !other) {
          applyStatus(unit, effect.status as StatusId, effect.duration ?? 2, effect.value ?? 0, unit, effect.stacks ?? 1)
        }
      }
    }
  }

  const deal = (target: Combatant, amount: number, attacker: Combatant | null, kind: 'hit' | 'dot' | 'thorns', meta?: { crit?: boolean; typeMult?: number }): number => {
    const bypassShield = kind === 'dot'
    let remaining = amount
    let absorbed = 0
    if (!bypassShield && target.shield > 0 && remaining > 0) {
      absorbed = Math.min(target.shield, remaining)
      target.shield -= absorbed
      remaining -= absorbed
      if (target.shield <= 0) {
        target.shield = 0
        target.shieldTurns = 0
      }
    }
    const before = target.hp
    if (remaining > 0) target.hp -= remaining
    if (kind === 'hit') {
      events.push({ r: rounds, kind: 'hit', actor: attacker?.id ?? target.id, target: target.id, dmg: amount, crit: meta?.crit ?? false, typeMult: meta?.typeMult ?? 1, shieldAbsorbed: absorbed })
    } else if (kind === 'dot') {
      events.push({ r: rounds, kind: 'dot', target: target.id, dmg: amount, shieldAbsorbed: 0 })
    } else {
      events.push({ r: rounds, kind: 'thorns', actor: attacker?.id ?? target.id, target: target.id, dmg: amount, shieldAbsorbed: absorbed })
    }
    if (target.hp <= 0 && target.alive) {
      const tough = target.passives.find((passive) => passive.trigger.kind === 'lethal_hit' && passive.usesLeft > 0)
      if (tough) {
        tough.usesLeft -= 1
        target.hp = 1
        events.push({ r: rounds, kind: 'passive', actor: target.id, passiveId: tough.id })
      } else markKo(target)
    } else if (target.alive && target.hp < before) {
      triggerPassives(target, 'hp_below')
      runHpMechanics(target)
    }
    return remaining
  }

  function runHpMechanics(unit: Combatant): void {
    for (const mech of unit.mechanics) {
      if (mech.fired || mech.trigger.kind !== 'hp_below') continue
      if (unit.hp / Math.max(1, unit.maxHp) > mech.trigger.pct) continue
      mech.fired = true
      runBossActions(unit, mech)
    }
  }

  function runBossActions(unit: Combatant, mech: BossMechanic): void {
    events.push({ r: rounds, kind: 'boss_mech', actor: unit.id, mechId: mech.id })
    for (const action of mech.actions) runBossAction(unit, action)
  }

  function runBossAction(unit: Combatant, action: BossAction): void {
    if (action.kind === 'status') applyStatus(unit, action.status, action.duration, action.value, unit)
    if (action.kind === 'shield') giveShield(unit, Math.floor(unit.maxHp * action.maxHpPct), action.duration, unit)
    if (action.kind === 'damage') {
      const picked = targetsFor(unit, units, action.target) ?? []
      for (const target of picked) strike(unit, target, action.atkMult, 0, false)
    }
    if (action.kind === 'summon') {
      const open = action.slots.find((slot) => !living(units, unit.side).some((ally) => ally.slot === slot))
      if (!open) {
        if (action.fallback?.kind === 'heal_all_pct') {
          for (const ally of living(units, unit.side)) healUnit(unit, ally, Math.floor(ally.maxHp * action.fallback.pct))
        }
        return
      }
      summonCount += 1
      const summoned = buildOne(
        { speciesId: action.speciesId, rarity: action.rarity as Rarity, level: action.level, slot: open },
        unit.side,
        [],
        false,
        false,
        `${unit.side}-summon-${summonCount}`
      )
      units.push(summoned)
      events.push({ r: rounds, kind: 'summon', actor: unit.id, unit: summoned.id, speciesId: action.speciesId })
    }
  }

  const strike = (attacker: Combatant, target: Combatant, skillMult: number, pierce: number, basic: boolean): number => {
    let tMult = typeMult(attacker.type, target.type)
    if (tMult === 1.5) tMult *= 1 + attacker.strongType
    const skin = target.passives.find((passive) => passive.trigger.kind === 'on_hit_taken' && passive.trigger.firstOnly && !target.hitTaken && passive.usesLeft > 0 && passive.effects.some((effect) => effect.kind === 'mod'))
    let taken = 1
    if (skin) {
      target.hitTaken = true
      skin.usesLeft -= 1
      skin.fired = true
      const mod = skin.effects.find((effect) => effect.kind === 'mod' && effect.stat === 'damageTaken')
      taken += mod?.value ?? 0
      events.push({ r: rounds, kind: 'passive', actor: target.id, passiveId: skin.id })
    }
    const crit = rng() < attacker.critChance
    const variance = combat.varianceMin + (combat.varianceMax - combat.varianceMin) * rng()
    const def = defEff(target, pierce)
    const atk = atkEff(attacker)
    const base = combat.dmgScale * atk * atk / (atk + def)
    const dmg = Math.max(1, Math.floor(base * skillMult * tMult * (crit ? attacker.critMult : 1) * variance * taken))
    const pastShield = deal(target, dmg, attacker, 'hit', { crit, typeMult: tMult })
    if (pastShield > 0 && attacker.alive && target.statuses.some((status) => status.id === 'thorns')) {
      const thorns = target.statuses.find((status) => status.id === 'thorns')!
      const reflected = Math.floor(pastShield * thorns.value)
      if (reflected > 0 && attacker.alive) deal(attacker, reflected, target, 'thorns')
    }
    if (target.alive || pastShield >= 0) triggerPassives(target, 'on_hit_taken', attacker, dmg)
    if (basic && attacker.alive) triggerPassives(attacker, 'on_basic_attack', target, dmg)
    return dmg
  }

  const effectTargets = (caster: Combatant, effect: SkillEffect, skill: SkillDef, attacker?: Combatant): Combatant[] => {
    const target = ('target' in effect && effect.target ? effect.target : skill.target) as SkillTarget
    return targetsFor(caster, units, target, attacker) ?? []
  }

  const castSkill = (unit: Combatant, active: ActiveSkill) => {
    const skill = active.def
    const picked = targetsFor(unit, units, skill.target) ?? []
    events.push({ r: rounds, kind: 'skill', actor: unit.id, skillId: skill.id, targets: picked.map((target) => target.id) })
    const damaged = new Set<string>()
    const hadDamage = skill.effects.some((effect) => effect.kind === 'damage')
    const rankBonus = active.signature ? 1 + 0.1 * (active.rank - 1) : 1
    const chanceBonus = active.signature ? 0.05 * (active.rank - 1) : 0
    for (const effect of skill.effects) {
      if (effect.kind === 'damage') {
        const hits = effect.hits ?? 1
        const pool = effectTargets(unit, effect, skill)
        const random = (effect.target ?? skill.target) === 'enemy_random'
        const victims = random ? [pool[Math.floor(rng() * pool.length)]].filter(Boolean) : pool
        for (const target of random ? Array.from({ length: hits }, () => pool[Math.floor(rng() * pool.length)]).filter(Boolean) : victims.flatMap((target) => Array.from({ length: hits }, () => target))) {
          if (!target?.alive || !unit.alive) continue
          const dmg = strike(unit, target, effect.atkMult * rankBonus, effect.defPierce ?? 0, false)
          if (dmg > 0) damaged.add(target.id)
        }
      } else if (effect.kind === 'heal') {
        for (const target of effectTargets(unit, effect, skill)) {
          if (!target.alive) continue
          healUnit(unit, target, Math.floor(atkEff(unit) * effect.atkMult * rankBonus))
        }
      } else if (effect.kind === 'shield') {
        for (const target of effectTargets(unit, effect, skill)) {
          if (!target.alive) continue
          giveShield(target, Math.floor(unit.maxHp * effect.maxHpPctOfCaster * rankBonus), effect.duration, unit)
        }
      } else if (effect.kind === 'cleanse') {
        for (const target of effectTargets(unit, effect, skill)) {
          const removed = target.statuses.filter((status) => NEGATIVE.includes(status.id)).map((status) => status.id)
          target.statuses = target.statuses.filter((status) => !NEGATIVE.includes(status.id))
          if (removed.length) events.push({ r: rounds, kind: 'cleanse', target: target.id, removed })
        }
      } else if (effect.kind === 'status') {
        for (const target of effectTargets(unit, effect, skill)) {
          if (!target.alive) continue
          const ownTarget = effect.target === 'self' || effect.target === 'ally_all' || skill.target === 'self' || skill.target === 'ally_all' || skill.target === 'ally_lowest_hp_pct'
          if (hadDamage && !ownTarget && !damaged.has(target.id)) continue
          let chance = effect.chance
          if (NEGATIVE.includes(effect.status) && target.side !== unit.side) {
            chance = Math.min(1, chance + chanceBonus + unit.statusChance)
            if (effect.status === 'stun') chance *= target.stunChanceMult
          }
          if (rng() >= chance) continue
          applyStatus(target, effect.status, effect.duration, effect.value ?? 0, unit, effect.stacks ?? 1)
        }
      }
    }
    const nextCd = active.signature && active.rank >= skillsCfg.signatureRank.cooldownReductionAtRank
      ? Math.max(skillsCfg.signatureRank.minCooldown, skill.cooldown - 1)
      : skill.cooldown
    active.cd = nextCd
  }

  const tickStatuses = (unit: Combatant) => {
    for (const status of unit.statuses) {
      if (status.appliedSeq === actionSeq) continue
      status.duration -= 1
      if (status.duration <= 0) events.push({ r: rounds, kind: 'status_remove', target: unit.id, status: status.id })
    }
    unit.statuses = unit.statuses.filter((status) => status.duration > 0)
    if (unit.shield > 0 && unit.shieldAppliedSeq !== actionSeq) {
      unit.shieldTurns -= 1
      if (unit.shieldTurns <= 0) {
        unit.shield = 0
        unit.shieldTurns = 0
        events.push({ r: rounds, kind: 'status_remove', target: unit.id, status: 'shield' })
      }
    }
  }

  const finishAction = () => {
    resolveRebirths()
    result = outcome()
  }

  for (const unit of units) triggerPassives(unit, 'battle_start')

  for (let round = 1; round <= combat.roundLimit && !result; round++) {
    rounds = round
    for (const unit of units) unit.revivedThisRound = false
    for (const unit of living(units)) {
      for (const mech of unit.mechanics) {
        if (mech.trigger.kind !== 'round_start' || mech.fired && mech.trigger.fromRound) continue
        const every = mech.trigger.kind === 'round_start' ? mech.trigger.every : undefined
        const from = mech.trigger.kind === 'round_start' ? mech.trigger.fromRound : undefined
        if (from && round === from && !mech.fired) {
          mech.fired = true
          runBossActions(unit, mech)
        } else if (every && round % every === 0) {
          runBossActions(unit, mech)
        }
      }
    }
    const order = living(units).sort(compareTurn)
    for (const unit of order) {
      if (result) break
      if (!unit.alive || unit.revivedThisRound) continue
      actionSeq += 1
      events.push({ r: round, kind: 'turn_start', actor: unit.id })
      const burn = unit.statuses.find((status) => status.id === 'burn')
      if (burn) {
        deal(unit, burn.burnDmg, null, 'dot')
        finishAction()
        if (!unit.alive || unit.revivedThisRound || result) continue
      }
      const poison = unit.statuses.find((status) => status.id === 'poison')
      if (poison) {
        deal(unit, Math.floor(unit.maxHp * unit.poisonPct * poison.stacks), null, 'dot')
        finishAction()
        if (!unit.alive || unit.revivedThisRound || result) continue
      }
      const stun = unit.statuses.find((status) => status.id === 'stun')
      if (stun) {
        unit.statuses = unit.statuses.filter((status) => status.id !== 'stun')
        events.push({ r: round, kind: 'status_remove', target: unit.id, status: 'stun' })
        tickStatuses(unit)
        finishAction()
        continue
      }
      const ready = unit.actives.find((active) => active.cd === 0 && skillReady(active.def, unit, units))
      if (ready) castSkill(unit, ready)
      else {
        const target = standardTarget(unit, units)
        if (target) {
          events.push({ r: round, kind: 'skill', actor: unit.id, skillId: 'basic', targets: [target.id] })
          strike(unit, target, 1, 0, true)
        }
      }
      for (const active of unit.actives) {
        if (active !== ready && active.cd > 0) active.cd -= 1
      }
      finishAction()
      if (unit.alive && !unit.revivedThisRound) tickStatuses(unit)
      if (result) break
    }
  }

  const finalResult: 'win' | 'loss' = result ?? 'loss'
  if (!result) rounds = combat.roundLimit
  const koCount = units.filter((unit) => unit.side === 'A' && unit.koCounted).length
  let stars: 0 | 1 | 2 | 3 = 0
  if (String(finalResult) === 'win') stars = koCount === 0 ? 3 : koCount <= 2 ? 2 : 1
  return {
    seed: input.seed,
    rounds,
    result: finalResult,
    stars,
    events,
    koCount,
    roster: units.map((unit) => ({ id: unit.id, name: unit.name, speciesId: unit.speciesId, maxHp: unit.maxHp, side: unit.side, slot: unit.slot, rarity: unit.rarity }))
  }
}

export function battleTip(input: BattleInput, log: BattleLog): string {
  if (log.result === 'win') return ''
  const resisted = input.allies.some((ally) => input.enemies.some((enemy) => typeMult(species(ally.speciesId).type, species(enemy.speciesId).type) < 1))
  if (resisted) return 'Tipp: Dein Typ ist hier im Nachteil. Stell Monster nach vorn, die stark gegen die Gegner sind.'
  const avgAlly = input.allies.reduce((sum, unit) => sum + unit.level, 0) / Math.max(1, input.allies.length)
  const avgEnemy = input.enemies.reduce((sum, unit) => sum + unit.level, 0) / Math.max(1, input.enemies.length)
  if (avgAlly + 2 < avgEnemy) return 'Tipp: Die Gegner sind deutlich höher im Level. Trainiere dein Team oder wiederhole frühere Stages.'
  if (input.allies.length < 3) return 'Tipp: Leere Plätze sind erlaubt, aber ein volles Team hält länger.'
  return 'Tipp: Front hält aus, Hinten fokussiert das niedrigste Ziel. Gift ignoriert Schilde, Spott ändert das Ziel.'
}
