import { describe, expect, it } from 'vitest'
import { species } from '../data'
import { fight1v1, type FightSide } from './battle'
import { ENCOUNTER_MS } from './const'
import { anchorIndex, orderMods, typeArrow } from './order'
import { beginAdventure } from './save'
import { challengeGuardian, pickFighter, resolveEncounter } from './sim'

function side(id: string, level: number, extra: Partial<FightSide> = {}): FightSide {
  const sp = species(id)
  return {
    speciesId: id, name: sp.name, type: sp.type, maxHp: 4000, hp: 4000, atk: 80, def: 40, spd: 100,
    skill: { ...sp.skill, initialCooldown: 99, cooldown: 99 },
    passive: null, level, ...extra
  }
}

function firstAllyHit(trace: ReturnType<typeof fight1v1>): number {
  for (const frame of trace.frames) {
    const hit = frame.hits?.find((row) => row.from === 'ally' && row.amount > 0)
    if (hit) return hit.amount
  }
  return 0
}

describe('order tactics', () => {
  it('gives the front slot more defense and the last standing slot more attack', () => {
    expect(anchorIndex(6)).toBe(5)
    expect(anchorIndex(3)).toBe(2)
    expect(anchorIndex(1)).toBe(0)
    const team = [
      { uid: 'a', type: 'fire' as const, alive: true },
      { uid: 'b', type: 'water' as const, alive: true }
    ]
    expect(orderMods(team, 'a', 'water', false)).toMatchObject({ defMul: 1.1, atkMul: 1, counter: false, anchor: false })
    expect(orderMods(team, 'b', 'fire', false)).toMatchObject({ defMul: 1, atkMul: 1, counter: false, anchor: false })
    const last = [
      { uid: 'a', type: 'fire' as const, alive: false },
      { uid: 'b', type: 'water' as const, alive: true }
    ]
    expect(orderMods(last, 'b', 'stone', true)).toMatchObject({ defMul: 1, atkMul: 1.15, counter: true, anchor: true })
    expect(orderMods([{ uid: 'a', type: 'fire' as const, alive: true }], 'a', 'water', false)).toMatchObject({ defMul: 1.1, atkMul: 1.15 })
    const six = ['a', 'b', 'c', 'd', 'e', 'f'].map((uid) => ({ uid, type: 'fire' as const, alive: uid === 'b' }))
    expect(orderMods(six, 'b', 'stone', true).anchor).toBe(false)
    for (const seat of six) seat.alive = seat.uid === 'f'
    expect(orderMods(six, 'f', 'stone', true)).toMatchObject({ atkMul: 1.15, anchor: true, counter: false })
  })

  it('opens a counter only after a knockout and only when the type is strong', () => {
    const team = [
      { uid: 'a', type: 'fire' as const, alive: false },
      { uid: 'b', type: 'water' as const, alive: true }
    ]
    expect(orderMods(team, 'b', 'fire', false).counter).toBe(false)
    expect(orderMods(team, 'b', 'plant', true).counter).toBe(false)
    expect(typeArrow('water', 'stone')).toBe('up')
    expect(typeArrow('fire', 'stone')).toBe('down')
    expect(typeArrow('fire', 'fire')).toBeNull()
  })

  it('adds two ult segments from level 25 and a stronger first swing', () => {
    const foe = side('m01', 1, { spd: 1, maxHp: 9000, hp: 9000 })
    const plain = fight1v1(side('m02', 25, { spd: 200 }), foe, () => 0.99, true)
    const counter = fight1v1(side('m02', 25, { spd: 200, counter: true }), foe, () => 0.99, true)
    const locked = fight1v1(side('m02', 24, { spd: 200, counter: true }), foe, () => 0.99, true)
    expect(counter.counter).toBe(true)
    expect(counter.frames[0]?.allyUlt).toBe(2)
    expect(locked.frames[0]?.allyUlt).toBe(0)
    const plainHit = firstAllyHit(plain)
    const counterHit = firstAllyHit(counter)
    expect(counterHit).toBeGreaterThan(plainHit)
    expect(counterHit / plainHit).toBeGreaterThan(1.15)
    expect(counterHit / plainHit).toBeLessThan(1.25)
    const amounts = (trace: ReturnType<typeof fight1v1>) => trace.frames.map((frame) => frame.hits?.find((row) => row.from === 'ally' && row.amount > 0)?.amount).filter((n): n is number => n !== undefined)
    expect(amounts(counter)[1]).toBe(amounts(plain)[1])
    expect(plainHit).toBe(87)
    expect(counterHit).toBe(105)
    const taken = (def: number) => {
      const trace = fight1v1(side('m01', 1, { spd: 1, def, maxHp: 9000, hp: 9000 }), side('m02', 1, { spd: 200, atk: 80 }), () => 0.99, true)
      return trace.frames.map((frame) => frame.hits?.find((row) => row.from === 'foe' && row.amount > 0)?.amount).find((n): n is number => n !== undefined) ?? 0
    }
    const swung = (atk: number) => firstAllyHit(fight1v1(side('m02', 1, { spd: 200, atk }), side('m01', 1, { spd: 1, def: 40, maxHp: 9000, hp: 9000 }), () => 0.99, true))
    expect(taken(100)).toBe(58)
    expect(taken(110)).toBe(55)
    expect(swung(80)).toBe(87)
    expect(swung(92)).toBe(105)
  })

  it('charges the last monster one extra segment per attack', () => {
    const trace = fight1v1(side('m02', 25, { spd: 200, anchor: true }), side('m01', 1, { spd: 1, maxHp: 9000, hp: 9000 }), () => 0.99, true)
    expect(trace.frames[0]?.allyUlt).toBe(0)
    expect(trace.frames.find((frame) => (frame.allyUlt ?? 0) >= 2)?.allyUlt).toBeGreaterThanOrEqual(2)
    expect(ENCOUNTER_MS[1]).toBe(2800)
  })

  it('sends the next fighter in team order', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1)
    const lead = save.active
    if (!lead) throw new Error('starter')
    save.mons[lead].hp = 0
    const water = `a${save.nextId}`
    save.nextId += 1
    save.mons[water] = { species: 'm02', lvl: 30, exp: 0, hp: null, shiny: false, caughtAt: 1, caughtWhere: 'r1c1', keepDupes: false }
    save.team.push(water)
    save.active = null
    expect(pickFighter(save, 'fire')).toBe(water)
    const fire = `a${save.nextId}`
    save.nextId += 1
    save.mons[fire] = { species: 'm10', lvl: 40, exp: 0, hp: null, shiny: false, caughtAt: 1, caughtWhere: 'r1c1', keepDupes: false }
    save.team.push(fire)
    expect(pickFighter(save, 'plant')).toBe(water)
  })

  it('counters only after a knockout against the same guardian', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1)
    const lead = save.active
    if (!lead) throw new Error('starter')
    save.mons[lead].lvl = 5
    save.mons[lead].hp = 1
    const water = `a${save.nextId}`
    save.nextId += 1
    save.mons[water] = { species: 'm02', lvl: 25, exp: 0, hp: null, shiny: false, caughtAt: 1, caughtWhere: 'r1c1', keepDupes: false }
    save.team.push(water)
    challengeGuardian(save)
    const outcome = resolveEncounter(save, 1, { offline: true, trace: true })
    expect(outcome.kind).toBe('guardian')
    expect(outcome.traces[0]?.allySpecies).toBe('m01')
    expect(outcome.traces[0]?.counter).toBeFalsy()
    const counter = outcome.traces.find((trace) => trace.counter)
    expect(counter?.allySpecies).toBe('m02')
    expect(counter?.foeSpecies).toBe('m17')
    // Chapter 1 caps the bout at level 12, so the extra segments stay locked.
    expect(counter?.frames[0]?.allyUlt).toBe(0)
  })
})
