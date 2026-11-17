import { describe, expect, it } from 'vitest'
import { species } from '../data'
import { mulberry32 } from '../rng'
import { fight1v1, type FightHit, type FightSide, type FightTrace } from './battle'
import { ENCOUNTER_MS } from './const'
import { assignMechs, councilAssignment, guardianAssignment, MECHS } from './mech'
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
    expect(cut[0]).toBe(Math.max(1, Math.floor(open[0] * 0.7)))
    expect(cut[2]).toBe(Math.max(1, Math.floor(open[2] * 0.7)))
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
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    const lead = save.active
    if (lead) save.mons[lead].lvl = 25
    challengeGuardian(save)
    const outcome = resolveEncounter(save, 1, { offline: true, trace: true })
    expect(outcome.traces[0]?.mechs).toEqual(guardianAssignment('Kieselwappen', 'Mira', false))
    expect(ENCOUNTER_MS[1]).toBe(2800)
  })
})

function sample(allyLevel: number, foeLevel: number, scale: number, mechs: FightSide['mechs'], trials: number): { wins: number; frames: number } {
  let wins = 0
  let frames = 0
  for (let seed = 1; seed <= trials; seed++) {
    const allyStats = monStats({ species: 'm02', lvl: allyLevel, exp: 0, hp: null, shiny: false, caughtAt: 0, caughtWhere: '', keepDupes: false })
    const foeStats = monStats({ species: 'm17', lvl: foeLevel, exp: 0, hp: null, shiny: false, caughtAt: 0, caughtWhere: '', keepDupes: false })
    const ally = side('m02', allyLevel, { maxHp: allyStats.hp, hp: allyStats.hp, atk: allyStats.atk, def: allyStats.def, spd: allyStats.spd, skill: species('m02').skill })
    const foe = side('m17', foeLevel, {
      maxHp: Math.round(foeStats.hp * scale),
      hp: Math.round(foeStats.hp * scale),
      atk: Math.round(foeStats.atk * scale),
      def: Math.round(foeStats.def * scale),
      spd: foeStats.spd,
      skill: species('m17').skill,
      boss: true,
      mechs
    })
    const trace = fight1v1(ally, foe, mulberry32(seed), true)
    if (trace.win) wins += 1
    frames += trace.frames.length
  }
  return { wins, frames }
}

describe('boss mechanic sample', () => {
  it('records the close fight: Tropfmolch 25 against Kieselkrabbe 25 at scale 1.4', () => {
    const trials = 200
    const plain = sample(25, 25, 1.4, undefined, trials)
    const rows = Object.fromEntries(MECHS.map((id) => [id, sample(25, 25, 1.4, [id], trials)]))
    expect(plain.wins).toBe(78)
    expect(plain.frames).toBe(6400)
    expect(rows.panzerung).toEqual({ wins: 3, frames: 6400 })
    expect(rows.wut).toEqual({ wins: 78, frames: 6400 })
    expect(rows.beistand).toEqual({ wins: 52, frames: 6780 })
    expect(rows.puls).toEqual({ wins: 41, frames: 6791 })
    expect(rows.spiegel).toEqual({ wins: 9, frames: 6400 })
  })
})
