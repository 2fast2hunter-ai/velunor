import { combat, species, typeMult } from './data'
import { SLOT_LANE, SLOT_ROW, type BattleEvent, type BattleInput, type BattleLog, type BattleUnitInput, type Rarity, type Row, type Side, type SkillDef, type SlotId, type StatusId, type TypeId } from './types'
import { instanceStats, synergyMultFor } from './stats'
import { mulberry32 } from './rng'

interface StatusInst {
  id: StatusId
  duration: number
  value: number
  burnDmg: number
  appliedSeq: number
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
  skill: SkillDef
  rebirthsLeft: number
  rebirthHpPct: number
  skillCd: number
  shield: number
  shieldTurns: number
  shieldAppliedSeq: number
  statuses: StatusInst[]
  alive: boolean
  pendingRebirth: boolean
  revivedThisRound: boolean
  koCounted: boolean
}

function atkEff(unit: Combatant): number {
  const mod = clamp(0, combat.modMin, combat.modMax)
  return unit.atk * (1 + mod)
}

function defEff(unit: Combatant): number {
  let mod = 0
  for (const status of unit.statuses) {
    if (status.id === 'def_up') mod += status.value
    if (status.id === 'def_down') mod -= status.value
  }
  mod = clamp(mod, combat.modMin, combat.modMax)
  return unit.def * (1 + mod)
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function buildSide(inputs: BattleUnitInput[], side: Side, synergy: boolean): Combatant[] {
  const prepared = inputs.map((input) => ({ input, type: species(input.speciesId).type }))
  return inputs.map((input) => {
    const sp = species(input.speciesId)
    const row = SLOT_ROW[input.slot]
    let hp: number
    let atk: number
    let def: number
    let spd: number
    if (input.fixed) {
      hp = input.fixed.hp
      atk = input.fixed.atk
      def = input.fixed.def
      spd = input.fixed.spd
    } else {
      const inst = instanceStats(input.speciesId, input.rarity, input.level)
      const pos = sp.role === row ? 1 + combat.positionBonus : 1
      atk = inst.atk * pos
      def = inst.def * pos
      hp = inst.hp
      spd = inst.spd
      if (synergy) {
        const syn = synergyMultFor(sp.type, prepared)
        atk *= syn.atk
        hp *= syn.hp
        spd *= syn.spd
      }
      if (input.boss) hp *= combat.bossHpMult
    }
    return {
      id: `${side}-${input.slot}`,
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
      skill: sp.skill,
      rebirthsLeft: sp.passive?.id === 'rebirth' ? sp.passive.usesPerBattle : 0,
      rebirthHpPct: sp.passive?.hpPct ?? 0,
      skillCd: sp.skill.initialCooldown,
      shield: 0,
      shieldTurns: 0,
      shieldAppliedSeq: -1,
      statuses: [],
      alive: true,
      pendingRebirth: false,
      revivedThisRound: false,
      koCounted: false
    }
  })
}

function living(units: Combatant[], side?: Side): Combatant[] {
  return units.filter((u) => u.alive && (side == null || u.side === side))
}

function compareTurn(a: Combatant, b: Combatant): number {
  if (b.spd !== a.spd) return b.spd - a.spd
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
  return unit.statuses.some((s) => s.id === 'taunt')
}

function standardTarget(attacker: Combatant, units: Combatant[]): Combatant | null {
  const foes = living(units, attacker.side === 'A' ? 'B' : 'A')
  if (!foes.length) return null
  const taunts = foes.filter(hasTaunt)
  if (taunts.length) return lowestHp(taunts)
  const front = foes.filter((f) => f.row === 'front')
  const row = front.length ? front : foes.filter((f) => f.row === 'back')
  if (attacker.role === 'front') {
    const same = row.find((f) => f.lane === attacker.lane)
    if (same) return same
    return lowestHp(row)
  }
  return lowestHp(row)
}

function skillTargets(caster: Combatant, units: Combatant[]): Combatant[] | null {
  const enemySide: Side = caster.side === 'A' ? 'B' : 'A'
  const foes = living(units, enemySide)
  const allies = living(units, caster.side)
  switch (caster.skill.target) {
    case 'default': {
      const target = standardTarget(caster, units)
      return target ? [target] : null
    }
    case 'enemy_all':
      return foes.length ? foes : null
    case 'enemy_front_all': {
      if (!foes.length) return null
      const front = foes.filter((f) => f.row === 'front')
      return front.length ? front : foes.filter((f) => f.row === 'back')
    }
    case 'enemy_back_lowest_hp': {
      const taunts = foes.filter(hasTaunt)
      if (taunts.length) return [lowestHp(taunts)]
      const back = foes.filter((f) => f.row === 'back')
      if (back.length) return [lowestHp(back)]
      const fallback = standardTarget(caster, units)
      return fallback ? [fallback] : null
    }
    case 'self':
      return [caster]
    case 'ally_lowest_hp_pct': {
      const injured = allies.filter((a) => a.hp < a.maxHp - 0.01)
      if (!injured.length) return null
      return [lowestHpPct(injured)]
    }
    case 'self_and_ally_lowest_hp_pct': {
      const targets = [caster]
      const others = allies.filter((a) => a !== caster)
      if (others.length) targets.push(lowestHpPct(others))
      return targets
    }
    default:
      return null
  }
}

export function simulateBattle(input: BattleInput): BattleLog {
  const rng = mulberry32(input.seed)
  const units = [
    ...buildSide(input.allies, 'A', input.allySynergy),
    ...buildSide(input.enemies, 'B', input.enemySynergy)
  ]
  const events: BattleEvent[] = []
  let actionSeq = 0
  let result: 'win' | 'loss' | null = null
  let rounds = 0

  const outcome = (): 'win' | 'loss' | null => {
    const enemiesAlive = living(units, 'B').length > 0
    const alliesAlive = living(units, 'A').length > 0
    if (!enemiesAlive) return 'win'
    if (!alliesAlive) return 'loss'
    return null
  }

  const markKo = (unit: Combatant) => {
    unit.alive = false
    unit.hp = 0
    if (unit.rebirthsLeft > 0) {
      unit.pendingRebirth = true
    } else if (unit.side === 'A') {
      unit.koCounted = true
    }
    events.push({ r: rounds, kind: 'ko', target: unit.id })
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

  const deal = (
    target: Combatant,
    amount: number,
    attacker: Combatant | null,
    kind: 'hit' | 'dot' | 'thorns',
    meta?: { crit?: boolean; typeMult?: number; actor?: string }
  ): number => {
    let remaining = amount
    let absorbed = 0
    if (target.shield > 0 && remaining > 0) {
      absorbed = Math.min(target.shield, remaining)
      target.shield -= absorbed
      remaining -= absorbed
      if (target.shield <= 0) {
        target.shield = 0
        target.shieldTurns = 0
      }
    }
    if (remaining > 0) target.hp -= remaining
    if (kind === 'hit') {
      events.push({
        r: rounds,
        kind: 'hit',
        actor: meta?.actor ?? attacker?.id ?? target.id,
        target: target.id,
        dmg: amount,
        crit: meta?.crit ?? false,
        typeMult: meta?.typeMult ?? 1,
        shieldAbsorbed: absorbed
      })
    } else if (kind === 'dot') {
      events.push({ r: rounds, kind: 'dot', target: target.id, dmg: amount, shieldAbsorbed: absorbed })
    } else {
      events.push({
        r: rounds,
        kind: 'thorns',
        actor: attacker?.id ?? target.id,
        target: target.id,
        dmg: amount,
        shieldAbsorbed: absorbed
      })
    }
    if (target.hp <= 0 && target.alive) markKo(target)
    return remaining
  }

  const applyStatus = (target: Combatant, status: StatusId, duration: number, value: number, caster: Combatant) => {
    if (!target.alive) return
    if (status === 'burn') {
      const burnDmg = Math.max(0, Math.floor(atkEff(caster) * (value || combat.burnAtkFraction)))
      const existing = target.statuses.find((s) => s.id === 'burn')
      if (existing) {
        existing.duration = duration
        existing.burnDmg = burnDmg
        existing.appliedSeq = actionSeq
      } else {
        target.statuses.push({ id: 'burn', duration, value, burnDmg, appliedSeq: actionSeq })
      }
    } else {
      const existing = target.statuses.find((s) => s.id === status)
      if (existing) {
        existing.duration = duration
        existing.value = value
        existing.appliedSeq = actionSeq
      } else {
        target.statuses.push({ id: status, duration, value, burnDmg: 0, appliedSeq: actionSeq })
      }
    }
    events.push({ r: rounds, kind: 'status_add', target: target.id, status })
  }

  const tickStatuses = (unit: Combatant) => {
    for (const status of unit.statuses) {
      if (status.appliedSeq === actionSeq) continue
      status.duration -= 1
      if (status.duration <= 0) events.push({ r: rounds, kind: 'status_remove', target: unit.id, status: status.id })
    }
    unit.statuses = unit.statuses.filter((s) => s.duration > 0)
    if (unit.shield > 0) {
      if (unit.shieldAppliedSeq !== actionSeq) {
        unit.shieldTurns -= 1
        if (unit.shieldTurns <= 0) {
          unit.shield = 0
          unit.shieldTurns = 0
          events.push({ r: rounds, kind: 'status_remove', target: unit.id, status: 'shield' })
        }
      }
    }
  }

  const strike = (attacker: Combatant, target: Combatant, skillMult: number) => {
    const tMult = typeMult(attacker.type, target.type)
    const crit = rng() < combat.critChance
    const variance = combat.varianceMin + (combat.varianceMax - combat.varianceMin) * rng()
    const def = defEff(target)
    const atk = atkEff(attacker)
    const base = combat.dmgScale * atk * atk / (atk + def)
    const dmg = Math.max(1, Math.floor(base * skillMult * tMult * (crit ? combat.critMult : 1) * variance))
    const pastShield = deal(target, dmg, attacker, 'hit', { crit, typeMult: tMult, actor: attacker.id })
    if (pastShield > 0 && attacker.alive && target.statuses.some((s) => s.id === 'thorns')) {
      const thorns = target.statuses.find((s) => s.id === 'thorns')!
      const reflected = Math.floor(pastShield * thorns.value)
      if (reflected > 0 && attacker.alive) deal(attacker, reflected, target, 'thorns')
    }
    return dmg
  }

  const finishAction = () => {
    resolveRebirths()
    result = outcome()
  }

  for (let round = 1; round <= combat.roundLimit; round++) {
    rounds = round
    for (const unit of units) unit.revivedThisRound = false
    const order = living(units).sort(compareTurn)
    for (const unit of order) {
      if (result) break
      if (!unit.alive || unit.revivedThisRound) continue
      actionSeq += 1
      events.push({ r: round, kind: 'turn_start', actor: unit.id })

      const burn = unit.statuses.find((s) => s.id === 'burn')
      if (burn) {
        deal(unit, burn.burnDmg, null, 'dot')
        finishAction()
        if (!unit.alive || unit.revivedThisRound || result) continue
      }

      const stun = unit.statuses.find((s) => s.id === 'stun')
      if (stun) {
        unit.statuses = unit.statuses.filter((s) => s.id !== 'stun')
        events.push({ r: round, kind: 'status_remove', target: unit.id, status: 'stun' })
        tickStatuses(unit)
        finishAction()
        continue
      }

      const ready = unit.skillCd === 0
      const targets = ready ? skillTargets(unit, units) : null
      if (ready && targets && targets.length) {
        events.push({ r: round, kind: 'skill', actor: unit.id, skillId: unit.skill.id, targets: targets.map((t) => t.id) })
        const damaged = new Set<string>()
        const hadDamage = unit.skill.effects.some((e) => e.kind === 'damage')
        for (const effect of unit.skill.effects) {
          if (effect.kind === 'damage') {
            for (const target of targets) {
              if (!target.alive || !unit.alive) continue
              const dmg = strike(unit, target, effect.atkMult)
              if (dmg > 0) damaged.add(target.id)
            }
          } else if (effect.kind === 'heal') {
            for (const target of targets) {
              if (!target.alive) continue
              const amount = Math.floor(atkEff(unit) * effect.atkMult)
              const before = target.hp
              target.hp = Math.min(target.maxHp, target.hp + amount)
              events.push({ r: round, kind: 'heal', actor: unit.id, target: target.id, amount: target.hp - before })
            }
          } else if (effect.kind === 'shield') {
            for (const target of targets) {
              if (!target.alive) continue
              const amount = Math.floor(unit.maxHp * effect.maxHpPctOfCaster)
              if (amount >= target.shield) {
                target.shield = amount
                target.shieldTurns = effect.duration
                target.shieldAppliedSeq = actionSeq
              }
              events.push({ r: round, kind: 'shield', actor: unit.id, target: target.id, amount })
            }
          } else if (effect.kind === 'status') {
            for (const target of targets) {
              if (!target.alive) continue
              if (hadDamage && !damaged.has(target.id)) continue
              if (rng() >= effect.chance) continue
              applyStatus(target, effect.status, effect.duration, effect.value ?? 0, unit)
            }
          }
        }
        unit.skillCd = unit.skill.cooldown
      } else {
        const target = standardTarget(unit, units)
        if (target) {
          events.push({ r: round, kind: 'skill', actor: unit.id, skillId: 'basic', targets: [target.id] })
          strike(unit, target, 1)
        }
        unit.skillCd = Math.max(0, unit.skillCd - 1)
      }

      finishAction()
      if (unit.alive && !unit.revivedThisRound) tickStatuses(unit)
      if (result) break
    }
    if (result) break
  }

  const finalResult: 'win' | 'loss' = (result ?? 'loss') as 'win' | 'loss'
  if (!result) rounds = combat.roundLimit
  const koCount = units.filter((u) => u.side === 'A' && u.koCounted).length
  let stars: 0 | 1 | 2 | 3 = 0
  if (finalResult === 'win') {
    if (koCount === 0) stars = 3
    else if (koCount <= 2) stars = 2
    else stars = 1
  }
  const roster = units.map((unit) => ({
    id: unit.id,
    name: unit.name,
    speciesId: unit.speciesId,
    maxHp: unit.maxHp,
    side: unit.side,
    slot: unit.slot
  }))
  return { seed: input.seed, rounds, result: finalResult, stars, events, koCount, roster }
}

export function battleTip(input: BattleInput, log: BattleLog): string {
  if (log.result === 'win') return ''
  const allyTypes = input.allies.map((u) => species(u.speciesId).type)
  const enemyTypes = input.enemies.map((u) => species(u.speciesId).type)
  const resisted = input.allies.some((ally) =>
    input.enemies.some((enemy) => typeMult(species(ally.speciesId).type, species(enemy.speciesId).type) < 1)
  )
  if (resisted) return 'Tipp: Dein Typ ist hier im Nachteil. Stell Monster nach vorn, die stark gegen die Gegner sind.'
  const avgAlly = input.allies.reduce((s, u) => s + u.level, 0) / Math.max(1, input.allies.length)
  const avgEnemy = input.enemies.reduce((s, u) => s + u.level, 0) / Math.max(1, input.enemies.length)
  if (avgAlly + 2 < avgEnemy) return 'Tipp: Die Gegner sind deutlich höher im Level. Trainiere dein Team oder wiederhole frühere Stages.'
  if (input.allies.length < 3) return 'Tipp: Leere Plätze sind erlaubt, aber ein volles Team hält länger.'
  if (new Set(allyTypes).size === 1 && new Set(enemyTypes).size > 1) {
    return 'Tipp: Ein Mono-Typ-Team trifft hart, ist aber vorhersehbar. Mische Typen oder nutze den Elementarkreis.'
  }
  return 'Tipp: Front hält aus, Hinten fokussiert das niedrigste Ziel. Spott und Schilde ändern den Kampf mehr als reine ATK.'
}
