import { describe, expect, it } from 'vitest'
import { species } from '../data'
import { mulberry32 } from '../rng'
import { fight1v1, type FightHit, type FightSide, type FightTrace } from './battle'
import { ENCOUNTER_MS } from './const'
import { ARMOR_CUT, assignMechs, councilAssignment, guardianAssignment, MECHS } from './mech'
import { orderMods } from './order'
import { regions } from './route'
import { beginAdventure } from './save'
import { monStats } from './stats'
import { challengeGuardian, resolveEncounter } from './sim'

function side(id: string, level: number, extra: Partial<FightSide> = {}): FightSide {
  const sp = species(id)
  return {
    speciesId: id, name: sp.name, type: sp.type, maxHp: 8000, hp: 8000, atk: 80, def: 40, spd: 100,
    skill: { ...sp.skill, initialCooldown: 99, cooldown: 99 },
    passive: null, level, ...extra
  }
}

function hitsFrom(trace: FightTrace, from: 'ally' | 'foe', pred: (hit: FightHit) => boolean = () => true): number[] {
  return trace.frames.flatMap((frame) => frame.hits ?? []).filter((hit) => hit.from === from && pred(hit)).map((hit) => hit.amount)
}

describe('boss mechanics', () => {
  it('assigns one fixed mechanic to a warden and two to the council and the world beast', () => {
    expect(assignMechs('guardian', 'guard:Kieselwappen')).toEqual(assignMechs('guardian', 'guard:Kieselwappen'))
    expect(assignMechs('guardian', 'guard:Kieselwappen')).toHaveLength(1)
    const pair = assignMechs('council', 'council:rat1')
    expect(pair).toHaveLength(2)
    expect(new Set(pair).size).toBe(2)
    expect(assignMechs('beast', 'beast:Ith')).toEqual(assignMechs('beast', 'beast:Ith'))
    expect(assignMechs('beast', 'beast:Ith')).toHaveLength(2)
    for (const region of regions) {
      for (const chapter of region.chapters) {
        if (chapter.guardian.team.length) {
          const mechs = guardianAssignment(chapter.guardian.badge, chapter.guardian.name, Boolean(chapter.special))
          expect(mechs.length).toBe(chapter.special ? 2 : 1)
          expect(mechs.every((id) => MECHS.includes(id))).toBe(true)
        }
        for (const member of chapter.council?.members ?? []) {
          const mechs = councilAssignment(member.id)
          expect(mechs).toHaveLength(2)
          expect(new Set(mechs).size).toBe(2)
        }
      }
    }
  })

  it('keeps armor until three crits have landed', () => {
    const foe = side('m17', 10, { spd: 1 })
    const bare = fight1v1(side('m01', 10, { spd: 200 }), foe, () => 0, true)
    const armed = fight1v1(side('m01', 10, { spd: 200 }), { ...foe, mechs: ['panzerung'], boss: true }, () => 0, true)
    const open = hitsFrom(bare, 'ally')
    const cut = hitsFrom(armed, 'ally')
    expect(cut[0]).toBe(Math.max(1, Math.floor(open[0] * (1 - ARMOR_CUT))))
    expect(cut[2]).toBe(Math.max(1, Math.floor(open[2] * (1 - ARMOR_CUT))))
    expect(cut[3]).toBe(open[3])
  })

  it('raises the boss attack once HP is under 40 percent', () => {
    const ally = side('m01', 10, { spd: 1, maxHp: 9000, hp: 9000 })
    const calm = fight1v1(ally, side('m17', 10, { spd: 200, maxHp: 1000, hp: 500, mechs: ['wut'], boss: true }), () => 0.99, true)
    const angry = fight1v1(ally, side('m17', 10, { spd: 200, maxHp: 1000, hp: 300, mechs: ['wut'], boss: true }), () => 0.99, true)
    const calmHit = hitsFrom(calm, 'foe')[0]
    const angryHit = hitsFrom(angry, 'foe')[0]
    expect(angryHit).toBeGreaterThan(calmHit)
    expect(angryHit / calmHit).toBeGreaterThan(1.4)
    expect(angryHit / calmHit).toBeLessThan(1.6)
  })

  it('sends the helper on every fourth attack while HP stays at 60 percent or more', () => {
    const ally = side('m01', 10, { spd: 1 })
    const up = fight1v1(ally, side('m17', 10, { spd: 200, mechs: ['beistand'], boss: true }), () => 0.99, true)
    const down = fight1v1(ally, side('m17', 10, { spd: 200, maxHp: 1000, hp: 500, mechs: ['beistand'], boss: true }), () => 0.99, true)
    const helpers = up.frames.flatMap((frame) => frame.hits ?? []).filter((hit) => hit.helper)
    expect(helpers.length).toBeGreaterThan(0)
    expect(down.frames.some((frame) => frame.hits?.some((hit) => hit.helper))).toBe(false)
    expect(up.frames.some((frame) => frame.helper)).toBe(true)
    expect(down.frames.some((frame) => frame.helper)).toBe(false)
    const jab = hitsFrom(up, 'foe', (hit) => !hit.helper)[0]
    expect(helpers[0].amount).toBeLessThan(jab)
  })

  it('adds an unavoidable pulse on every fifth attack', () => {
    const trace = fight1v1(
      side('m41', 10, { spd: 200, atk: 40 }),
      side('m17', 10, { spd: 1, mechs: ['puls'], boss: true }),
      () => 0.15,
      true
    )
    const pulses = hitsFrom(trace, 'foe', (hit) => Boolean(hit.pulse))
    const swings = trace.frames.filter((frame) => frame.text.startsWith('Kieselkrabbe greift an'))
    const landed = swings.filter((frame) => frame.hits?.some((hit) => hit.from === 'foe' && !hit.pulse && hit.amount > 0))
    expect(trace.frames.some((frame) => frame.foeMark === 'spreu')).toBe(true)
    expect(pulses.length).toBeGreaterThan(0)
    expect(pulses.every((amount) => amount > 0)).toBe(true)
    expect(landed.length).toBeLessThan(swings.length)
  })

  it('returns a fifth of a normal hit and nothing from an ultimate', () => {
    const trace = fight1v1(
      side('m01', 25, { spd: 200, atk: 70, maxHp: 20000, hp: 20000 }),
      side('m17', 25, { spd: 1, def: 80, maxHp: 20000, hp: 20000, mechs: ['spiegel'], boss: true }),
      () => 0.99,
      true
    )
    const mirrored = trace.frames.find((frame) => frame.hits?.some((hit) => hit.from === 'ally' && !hit.ult && hit.amount > 0) && frame.hits?.some((hit) => hit.mirror))
    const blow = mirrored?.hits?.find((hit) => hit.from === 'ally' && !hit.ult)
    const back = mirrored?.hits?.find((hit) => hit.mirror)
    expect(blow && back && back.amount).toBe(Math.floor((blow?.amount ?? 0) * 0.2))
    const ult = trace.frames.find((frame) => frame.hits?.some((hit) => hit.ult))
    expect(ult?.hits?.some((hit) => hit.mirror)).toBe(false)
  })

  it('puts the warden mechanic on the guardian fight and leaves the clock alone', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1)
    const lead = save.active
    if (lead) save.mons[lead].lvl = 25
    challengeGuardian(save)
    const outcome = resolveEncounter(save, 1, { offline: true, trace: true })
    expect(outcome.traces[0]?.mechs).toEqual(guardianAssignment('Kieselwappen', 'Mira', false))
    expect(ENCOUNTER_MS[1]).toBe(2800)
  })
})

const SCALE = { hp: 1.4, atk: 1.34, def: 1.4 }
const WARDEN = [
  { species: 'm17', level: 7 },
  { species: 'm04', level: 8 },
  { species: 'm18', level: 10 }
]

function actor(id: string, level: number, scale = { hp: 1, atk: 1, def: 1 }, mechs?: FightSide['mechs'], hpFrac = 1): FightSide {
  const sp = species(id)
  const stats = monStats({ species: id, lvl: level, exp: 0, hp: null, shiny: false, caughtAt: 0, caughtWhere: '', keepDupes: false })
  const maxHp = Math.max(1, Math.round(stats.hp * scale.hp))
  return {
    speciesId: id, name: sp.name, type: sp.type, maxHp,
    hp: Math.max(1, Math.round(maxHp * (hpFrac > 0 ? hpFrac : 1))),
    atk: Math.max(1, Math.round(stats.atk * scale.atk)),
    def: Math.max(1, Math.round(stats.def * scale.def)),
    spd: stats.spd, skill: sp.skill, passive: sp.passive ?? null, level,
    boss: scale.hp !== 1 || Boolean(mechs?.length), mechs
  }
}

function runBench(ids: string[], level: number, mechs: FightSide['mechs'], rng: () => number): { clear: boolean; bouts: Array<'win' | 'ko' | 'timeout'> } {
  const alive = ids.map(() => true)
  const bouts: Array<'win' | 'ko' | 'timeout'> = []
  let foeIndex = 0
  let fraction = 1
  let afterKo = false
  let guard = 0
  while (foeIndex < WARDEN.length && guard < 24) {
    guard += 1
    const fighter = alive.findIndex(Boolean)
    if (fighter < 0) return { clear: false, bouts }
    const foe = WARDEN[foeIndex]
    const seats = ids.map((id, index) => ({ uid: String(index), type: species(id).type, alive: alive[index] }))
    const mods = orderMods(seats, String(fighter), species(foe.species).type, afterKo)
    const ally = actor(ids[fighter], level)
    ally.atk = Math.max(1, Math.round(ally.atk * mods.atkMul))
    ally.def = Math.max(1, Math.round(ally.def * mods.defMul))
    ally.counter = mods.counter
    ally.anchor = mods.anchor
    const trace = fight1v1(ally, actor(foe.species, foe.level, SCALE, mechs, fraction), rng, false)
    const kind = bucket(trace)
    bouts.push(kind)
    const advance = kind === 'win' || (kind === 'timeout' && trace.win)
    if (advance) {
      foeIndex += 1
      fraction = 1
      afterKo = false
    } else {
      alive[fighter] = false
      fraction = trace.foeMax > 0 ? Math.max(0.01, trace.foeHp / trace.foeMax) : 1
      afterKo = true
    }
  }
  return { clear: foeIndex >= WARDEN.length, bouts }
}

function bucket(trace: FightTrace): 'win' | 'ko' | 'timeout' {
  if (trace.timeout) return 'timeout'
  if (trace.win) return 'win'
  return 'ko'
}

const BENCH = ['m66', 'm11', 'm14', 'm61', 'm03', 'm72']

function tallyOne(mechs: FightSide['mechs'], trials: number): { win: number; ko: number; timeout: number } {
  const out = { win: 0, ko: 0, timeout: 0 }
  for (let seed = 1; seed <= trials; seed++) {
    const trace = fight1v1(actor('m61', 12), actor('m17', 7, SCALE, mechs), mulberry32(seed), false)
    out[bucket(trace)] += 1
  }
  return out
}

function tallyBench(mechs: FightSide['mechs'], trials: number): { sieg: number; ko: number; timeout: number } {
  const out = { sieg: 0, ko: 0, timeout: 0 }
  for (let seed = 1; seed <= trials; seed++) {
    const run = runBench(BENCH, 12, mechs, mulberry32(seed))
    if (run.bouts.some((kind) => kind === 'timeout')) out.timeout += 1
    else if (run.clear) out.sieg += 1
    else out.ko += 1
  }
  return out
}

describe('boss mechanic sample', () => {
  it('measures the cap fight and the ordered bench', () => {
    const trials = 500
    const one: Record<string, { win: number; ko: number; timeout: number }> = { none: tallyOne(undefined, trials) }
    const bench: Record<string, { sieg: number; ko: number; timeout: number }> = { none: tallyBench(undefined, trials) }
    for (const id of MECHS) {
      one[id] = tallyOne([id], trials)
      bench[id] = tallyBench([id], trials)
    }
    expect(one.none).toEqual({ win: 463, ko: 37, timeout: 0 })
    expect(one.panzerung).toEqual({ win: 23, ko: 477, timeout: 0 })
    expect(one.wut).toEqual({ win: 187, ko: 313, timeout: 0 })
    expect(one.beistand).toEqual({ win: 454, ko: 46, timeout: 0 })
    expect(one.puls).toEqual({ win: 379, ko: 121, timeout: 0 })
    expect(one.spiegel).toEqual({ win: 24, ko: 476, timeout: 0 })
    expect(bench.none).toEqual({ sieg: 500, ko: 0, timeout: 0 })
    expect(bench.panzerung).toEqual({ sieg: 498, ko: 2, timeout: 0 })
    expect(bench.wut).toEqual({ sieg: 499, ko: 1, timeout: 0 })
    expect(bench.beistand).toEqual({ sieg: 500, ko: 0, timeout: 0 })
    expect(bench.puls).toEqual({ sieg: 500, ko: 0, timeout: 0 })
    expect(bench.spiegel).toEqual({ sieg: 500, ko: 0, timeout: 0 })
  })
})
