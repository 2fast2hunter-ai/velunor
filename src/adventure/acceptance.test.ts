import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { species, typeMult } from '../data'
import { SAVE_KEY } from '../saveMigrate'
import { fight1v1, rawDamage, type FightSide } from './battle'
import {
  BASE_ENCOUNTER_MS,
  CATCH_BASE,
  CATCH_CAP,
  CAUGHT_SCALE,
  ENCOUNTER_MS,
  FEET_Y,
  FOE_X,
  ALLY_X,
  OFFLINE_CAP_MS,
  OFFLINE_LEVEL_CAP,
  SAVE_KEY_V1,
  SAVE_KEY_V2,
  SEAL_ADD,
  SEAL_BLEND,
  SEAL_FALLBACK,
  SEAL_FLAT_Y,
  SEAL_SCALE_IN_MS,
  SEAL_SPIN_MS,
  SCENE_FILES,
  START_GOLD,
  WELCOME_AFTER_MS,
  debugAllowed,
  encounterMs,
  offlineEncounterCount,
  tempoScale
} from './const'
import { chapterById, chapterFormula, dayPart, findGold, routeOf, sightingShares } from './route'
import { beginAdventure, loadAdventure, makeMon, migrateFromV1 } from './save'
import { applyCatch, awardCombatExp, catchChance, chapterUnlocked, healTeam, hereSightings, moveToPc, moveToTeam, resolveEncounter, setKeepDupes, simulateOffline, travelTo } from './sim'
import { addExp, battleLevel, combatStats, expToNext, speciesExp } from './stats'
import type { SaveV2, StorageLike } from './types'

function memory(): StorageLike {
  const box = new Map<string, string>()
  return {
    getItem: (key) => box.get(key) ?? null,
    setItem: (key, value) => { box.set(key, value) },
    removeItem: (key) => { box.delete(key) }
  }
}

function fixed(name: string, hp: number, atk: number, def: number, spd: number): FightSide {
  return {
    speciesId: 'm01',
    name,
    type: 'fire',
    maxHp: hp,
    hp,
    atk,
    def,
    spd,
    skill: { id: 'basic', cooldown: 99, initialCooldown: 99, target: 'default', effects: [] },
    passive: null
  }
}

describe('step 1 numbers', () => {
  it('uses the new level curve and keeps speed flat', () => {
    expect(expToNext(5)).toBe(263)
    expect(expToNext(10)).toBe(796)
    expect(expToNext(20)).toBe(2414)
    expect(expToNext(50)).toBe(Math.round(20 * 50 ** 1.6))
    expect(speciesExp(5)).toBe(expToNext(5) + expToNext(6) + expToNext(7))
    const low = combatStats('m01', 5, false)
    const high = combatStats('m01', 10, false)
    expect(low.spd).toBe(species('m01').base.spd)
    expect(high.spd).toBe(low.spd)
    expect(low.atk).toBe(Math.round(species('m01').base.atk * (1 + 0.06 * 4)))
    expect(combatStats('m01', 5, true).hp).toBe(Math.round(species('m01').base.hp * (1 + 0.06 * 4) * 1.1))
  })

  it('caps battle level and discards EP past the cap', () => {
    expect(battleLevel(20, 12)).toBe(12)
    expect(combatStats('m01', battleLevel(30, 12), false)).toEqual(combatStats('m01', 12, false))
    const mon = makeMon('m01', 12, 0, 'r1c1')
    const granted = addExp(mon, 5000, 12, null)
    expect(granted.levels).toBe(0)
    expect(mon.lvl).toBe(12)
    expect(mon.exp).toBe(0)
  })

  it('stops an absence after 12 levels even when the EP would go further', () => {
    const mon = makeMon('m01', 5, 0, 'r1c1')
    const granted = addExp(mon, 5_000_000, 99, OFFLINE_LEVEL_CAP)
    expect(mon.lvl).toBe(5 + OFFLINE_LEVEL_CAP)
    expect(granted.levels).toBe(OFFLINE_LEVEL_CAP)
    expect(mon.exp).toBe(0)
  })

  it('keeps the published strike and the type table', () => {
    expect(rawDamage(40, 20, 1, 1, false, 1)).toBe(Math.max(1, Math.floor(1.5 * 40 * 40 / 60)))
    expect(rawDamage(40, 20, 1, 1.5, true, 1.1)).toBeGreaterThan(rawDamage(40, 20, 1, 0.75, false, 0.9))
    expect(typeMult('fire', 'plant')).toBe(1.5)
    expect(typeMult('fire', 'water')).toBe(1)
    expect(typeMult('water', 'fire')).toBe(1)
  })

  it('ends a stalled fight after 30 actions', () => {
    const left = fixed('Links', 100000, 1, 5000, 20)
    const right = fixed('Rechts', 100000, 1, 5000, 10)
    const trace = fight1v1(left, right, () => 0.5, true)
    expect(trace.timeout).toBe(true)
    expect(trace.frames.length).toBeGreaterThan(30)
    expect(trace.win).toBe(true)
    expect(trace.foeKo).toBe(false)
  })
})

describe('region 1 path', () => {
  it('matches the chapter formula and the three published routes', () => {
    for (const n of [1, 2, 3]) {
      const formula = chapterFormula(n)
      const chapter = (n === 1 ? 'Wiesenpfad' : n === 2 ? 'Bachufer' : 'Funkenwald')
      expect(formula.levelMin).toBe([2, 8, 14][n - 1])
      expect(formula.cap).toBe([12, 18, 24][n - 1])
      expect(formula.gold).toBe([1750, 2500, 3250][n - 1])
      expect(chapter.length).toBeGreaterThan(0)
    }
    const route = routeOf(1)
    expect(route[7]).toBe('spring')
    expect(route[14]).toBe('spring')
    expect(route[20]).toBe('guardian')
    const body = route.slice(1)
    expect(body.filter((kind) => kind === 'wild')).toHaveLength(13)
    expect(body.filter((kind) => kind === 'trainer')).toHaveLength(3)
    expect(body.filter((kind) => kind === 'find')).toHaveLength(1)
    expect(routeOf(1)).toEqual(routeOf(1))
    expect(findGold(2)).toBe(100)
  })

  it('switches the sighting table with the local clock', () => {
    expect(dayPart(new Date(2026, 10, 11, 7, 59).getTime())).toBe('night')
    expect(dayPart(new Date(2026, 10, 11, 8, 0).getTime())).toBe('day')
    expect(dayPart(new Date(2026, 10, 11, 19, 59).getTime())).toBe('day')
    expect(dayPart(new Date(2026, 10, 11, 20, 0).getTime())).toBe('night')
    const save = beginAdventure('Ada', 'A', 'm01', 0)
    const day = hereSightings(save, new Date(2026, 10, 11, 12).getTime())
    const night = hereSightings(save, new Date(2026, 10, 11, 21).getTime())
    expect(day.map((row) => row.species)).toEqual(expect.arrayContaining(['m66', 'm41', 'm11', 'm03']))
    expect(night.map((row) => row.species)).toEqual(expect.arrayContaining(['m66', 'm76', 'm81', 'm11']))
    expect(night.find((row) => row.species === 'm76')).toBeTruthy()
    expect(sightingShares([{ species: 'm66', weight: 35 }, { species: 'm76', weight: 65 }])[1].pct).toBe(65)
  })
})

describe('acceptance loop', () => {
  function wildStep(save: SaveV2): number {
    const route = routeOf(save.chapter)
    return route.findIndex((kind, index) => index > 0 && kind === 'wild')
  }

  it('starts with a level-5 starter, 3000 G and an automatic wild catch attempt', () => {
    const save = beginAdventure('Ada', 'B', 'm02', 1_000)
    expect(save.gold).toBe(START_GOLD)
    expect(save.mons[save.team[0]].lvl).toBe(5)
    expect(save.mons[save.team[0]].species).toBe('m02')
    expect(save.region).toBe(1)
    expect(save.chapter).toBe(1)
    expect(save.step).toBe(1)
    save.mons[save.team[0]].lvl = 12
    save.step = wildStep(save)
    let sawSeal = false
    for (let i = 0; i < 12; i++) {
      save.step = wildStep(save)
      save.mons[save.team[0]].hp = null
      save.mons[save.team[0]].lvl = 12
      const outcome = resolveEncounter(save, new Date(2026, 10, 11, 12).getTime(), { offline: false, trace: false })
      if (outcome.win && outcome.traces[0]?.foeKo) {
        expect(outcome.lines.some((line) => line.startsWith('Bannsiegel'))).toBe(true)
        expect(outcome.catch).not.toBeNull()
        sawSeal = true
        if (outcome.catch?.success && outcome.catch.place !== 'exp') {
          const ids = [...save.team, ...save.pc]
          expect(ids.some((uid) => save.mons[uid].species === outcome.catch?.species)).toBe(true)
        }
        break
      }
    }
    expect(sawSeal).toBe(true)
  })

  it('turns a duplicate into Art-EP and keeps a species when asked', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1_000)
    const uid = save.team[0]
    save.mons[uid].lvl = 5
    save.mons[uid].exp = 0
    const chapter = chapterById(1, 1)
    const before = speciesExp(5)
    const converted = applyCatch(save, 'm01', 4, false, 2_000, 'r1c1', chapter, { offline: false, trace: false })
    expect(converted.place).toBe('exp')
    expect(save.stats.dupes).toBe(1)
    expect(Object.keys(save.mons)).toHaveLength(1)
    expect(leveledExp(5, save.mons[uid].lvl, save.mons[uid].exp)).toBe(before)
    const shiny = applyCatch(save, 'm01', 4, true, 2_500, 'r1c1', chapter, { offline: false, trace: false })
    expect(shiny.place).toBe('kept')
    expect(save.pc.some((id) => save.mons[id].shiny)).toBe(true)
    setKeepDupes(save, uid, true)
    const kept = applyCatch(save, 'm01', 4, false, 3_000, 'r1c1', chapter, { offline: false, trace: false })
    expect(kept.place).toBe('kept')
    expect(save.pc.filter((id) => save.mons[id].species === 'm01').length).toBeGreaterThan(1)
  })

  it('puts a new species in the PC when the team is full', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1_000)
    for (const id of ['m02', 'm03', 'm04', 'm05', 'm06']) {
      const uid = `x${id}`
      save.mons[uid] = makeMon(id, 5, 1, 'r1c1')
      save.team.push(uid)
    }
    expect(save.team).toHaveLength(6)
    const caught = applyCatch(save, 'm11', 3, false, 2_000, 'r1c1', chapterById(1, 1), { offline: false, trace: false })
    expect(caught.place).toBe('pc')
    expect(save.team).toHaveLength(6)
    expect(save.pc.some((uid) => save.mons[uid].species === 'm11')).toBe(true)
  })

  it('caps the catch rate at 60 percent', () => {
    expect(catchChance(0, 4, 5)).toBe(CATCH_CAP)
    expect(catchChance(0, 8, 5)).toBeCloseTo(CATCH_BASE[0] * 0.8)
    expect(catchChance(9, 1, 50)).toBe(CATCH_BASE[9])
    expect(CATCH_BASE[9]).toBeLessThanOrEqual(CATCH_CAP)
  })

  it('heals at a spring and returns a wiped team without taking monsters or gold', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1_000)
    const route = routeOf(1)
    const spring = route.findIndex((kind, index) => index > 0 && kind === 'spring')
    save.step = spring
    save.mons[save.team[0]].hp = 3
    save.gold = 3000
    const healed = resolveEncounter(save, 1_000, { offline: false, trace: false })
    expect(healed.kind).toBe('spring')
    expect(save.mons[save.team[0]].hp).toBeNull()
    expect(save.lastHealStep).toBe(spring)
    save.step = wildStep(save)
    save.mons[save.team[0]].hp = 0
    const gold = save.gold
    const owned = Object.keys(save.mons).length
    const wiped = resolveEncounter(save, 1_000, { offline: false, trace: false })
    expect(wiped.wiped).toBe(true)
    expect(save.step).toBe(spring)
    expect(save.mons[save.team[0]].hp).toBeNull()
    expect(save.gold).toBe(gold)
    expect(Object.keys(save.mons)).toHaveLength(owned)
    healTeam(save)
    expect(save.mons[save.team[0]].hp).toBeNull()
  })

  it('opens chapter 2 after the first badge and loops when asked', () => {
    const save = beginAdventure('Ada', 'A', 'm07', 1_000)
    expect(chapterUnlocked(save, 2)).toBe(false)
    for (const id of ['m02', 'm28', 'm66', 'm18', 'm51']) {
      const uid = `g-${id}`
      save.mons[uid] = makeMon(id, 12, 0, 'r1c1')
      save.team.push(uid)
    }
    save.mons[save.team[0]].lvl = 12
    save.step = 20
    const outcome = resolveEncounter(save, 1_000, { offline: false, trace: false })
    expect(outcome.badge).toBe('Kieselwappen')
    expect(save.badges).toContain('Kieselwappen')
    // Guardian gold plus the achievements for a full level-12 team and the first crest.
    expect(save.gold).toBe(START_GOLD + 1750 + 1000 + 400 + 2000)
    expect(chapterUnlocked(save, 2)).toBe(true)
    expect(save.step).toBe(1)
    expect(travelTo(save, 1, 2)).toBeNull()
    expect(save.chapter).toBe(2)
    save.badges.push('Wellenwappen')
    save.loop = true
    save.step = 20
    resolveEncounter(save, 1_000, { offline: false, trace: false })
    expect(save.step).toBe(1)
    save.loop = false
    save.step = 20
    resolveEncounter(save, 1_000, { offline: false, trace: false })
    expect(save.hold).toBe(true)
    expect(save.step).toBe(20)
  })

  it('waits five loops after a guardian loss unless challenged', () => {
    const save = beginAdventure('Ada', 'A', 'm03', 1_000)
    save.mons[save.team[0]].lvl = 1
    save.mons[save.team[0]].hp = 1
    save.step = 20
    const loss = resolveEncounter(save, 1_000, { offline: false, trace: false })
    expect(loss.win).toBe(false)
    expect(save.badges).toHaveLength(0)
    expect(save.loopsUntilRetry).toBe(5)
    for (let lap = 0; lap < 4; lap++) {
      save.step = 20
      save.mons[save.team[0]].hp = null
      save.mons[save.team[0]].lvl = 12
      const skipped = resolveEncounter(save, 1_000, { offline: false, trace: false })
      expect(skipped.badge).toBeNull()
      expect(save.step).toBe(1)
    }
    save.step = 20
    save.mons[save.team[0]].hp = null
    save.mons[save.team[0]].lvl = 12
    const retry = resolveEncounter(save, 1_000, { offline: false, trace: false })
    expect(retry.kind).toBe('guardian')
    expect(retry.traces.length).toBeGreaterThan(0)
  })

  it('halves combat EP offline and counts 10 hours as 8', () => {
    expect(offlineEncounterCount(10 * 60 * 60 * 1000)).toBe(offlineEncounterCount(OFFLINE_CAP_MS))
    expect(offlineEncounterCount(OFFLINE_CAP_MS)).toBe(Math.floor(OFFLINE_CAP_MS / BASE_ENCOUNTER_MS))
    expect(WELCOME_AFTER_MS).toBe(5 * 60 * 1000)
    const save = beginAdventure('Ada', 'A', 'm01', 0)
    const uid = save.team[0]
    save.mons[uid].lvl = 5
    save.mons[uid].exp = 0
    const offline = { offline: true, trace: false, levelLeft: new Map<string, number>() }
    const online = { offline: false, trace: false }
    awardCombatExp(save, 99, 10, 0, uid, online, 1)
    const onlineLevel = save.mons[uid].lvl
    const onlineExp = save.mons[uid].exp
    save.mons[uid].lvl = 5
    save.mons[uid].exp = 0
    awardCombatExp(save, 99, 10, 0, uid, offline, 1)
    const full = 8 * 10 * (save.buddy === uid ? 1.3 : 1)
    expect(onlineLevel > 5 || onlineExp > 0).toBe(true)
    expect(save.mons[uid].lvl).toBeLessThanOrEqual(onlineLevel)
    expect(save.mons[uid].exp).toBeLessThanOrEqual(Math.round(full))
    save.mons[uid].lvl = 5
    save.mons[uid].exp = 0
    awardCombatExp(save, 99, 100000, 0, uid, offline, 1)
    expect(save.mons[uid].lvl).toBe(5 + OFFLINE_LEVEL_CAP)
  })

  it('simulates an 8 hour absence quickly', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 0)
    save.mons[save.team[0]].lvl = 12
    save.lastSeenAt = 0
    const started = performance.now()
    const { summary, countedMs } = simulateOffline(save, 10 * 60 * 60 * 1000, OFFLINE_CAP_MS)
    const elapsed = performance.now() - started
    expect(countedMs).toBe(OFFLINE_CAP_MS)
    expect(summary.encounters).toBe(offlineEncounterCount(OFFLINE_CAP_MS))
    expect(elapsed).toBeLessThan(3000)
    expect(save.mons[save.team[0]].lvl).toBeLessThanOrEqual(12)
  })
})

describe('migration', () => {
  it('keeps every old specimen and leaves velunor.save.v1 untouched', () => {
    expect(SAVE_KEY).toBe(SAVE_KEY_V1)
    const storage = memory()
    const legacy = {
      version: 6,
      currencies: { gold: 99999, gems: 4, essence: 0, tickets: 0 },
      monsters: [
        { uid: 'old-a', speciesId: 'm01', level: 1, exp: 40, obtainedAt: 50 },
        { uid: 'old-b', speciesId: 'm01', level: 12, exp: 10, obtainedAt: 60 },
        { uid: 'old-c', speciesId: 'm04', level: 8, exp: 3, obtainedAt: 70 }
      ],
      team: { F1: 'old-c', F2: 'old-a', H1: null, H2: null, H3: null },
      collection: ['m01', 'm04', 'm09']
    }
    const raw = JSON.stringify(legacy)
    storage.setItem(SAVE_KEY_V1, raw)
    const loaded = loadAdventure(storage, 5_000)
    expect(loaded?.started).toBe(true)
    expect(storage.getItem(SAVE_KEY_V1)).toBe(raw)
    expect(storage.getItem(SAVE_KEY_V2)).toContain('"v":2')
    expect(loaded?.mons['old-a'].lvl).toBe(5)
    expect(loaded?.mons['old-a'].exp).toBe(0)
    expect(loaded?.mons['old-b'].lvl).toBe(12)
    expect(loaded?.mons['old-b'].exp).toBe(10)
    expect(loaded?.mons['old-c'].species).toBe('m04')
    expect(loaded?.team[0]).toBe('old-c')
    expect(loaded?.team).toContain('old-a')
    expect(loaded?.pc).toContain('old-b')
    expect(Object.values(loaded?.mons ?? {}).some((mon) => mon.species === 'm09' && mon.lvl === 5)).toBe(true)
    expect(loaded?.gold).toBe(START_GOLD)
    expect(loaded?.dex.m01.caught).toBe(2)
    const again = loadAdventure(storage, 6_000)
    expect(Object.keys(again?.mons ?? {})).toHaveLength(Object.keys(loaded?.mons ?? {}).length)
    expect(migrateFromV1({ version: 'nope' }, 1)).toBeNull()
  })
})

describe('presentation', () => {
  it('paces encounters at 2.8s, 1.4s and 0.93s and scales the seal', () => {
    expect(encounterMs(1)).toBe(2800)
    expect(encounterMs(2)).toBe(1400)
    expect(encounterMs(3)).toBe(930)
    expect(ENCOUNTER_MS[3]).toBe(930)
    expect(tempoScale(1)).toBe(1)
    expect(SEAL_SCALE_IN_MS * tempoScale(2)).toBeCloseTo(125)
    expect(SEAL_SPIN_MS).toBe(2000)
    expect(SEAL_FLAT_Y).toBe(0.35)
    expect(CAUGHT_SCALE).toBe(1.3)
    expect(ALLY_X).toBe(28)
    expect(FOE_X).toBe(72)
    expect(FEET_Y).toBe(68)
    expect(SEAL_BLEND).toBe('plus-lighter')
    expect(SEAL_ADD).toBe('fx/fx_bannsiegel_add.jpg')
    expect(SEAL_FALLBACK).toBe('fx/fx_bannsiegel.png')
  })

  it('ships the Grünmark plates and does not boot the old ad shell', () => {
    for (const scene of Object.values(SCENE_FILES)) {
      expect(existsSync(`public/assets/${scene.webp}`)).toBe(true)
      expect(existsSync(`public/assets/${scene.jpg}`)).toBe(true)
    }
    expect(existsSync(`public/assets/${SEAL_ADD}`)).toBe(true)
    expect(existsSync(`public/assets/${SEAL_FALLBACK}`)).toBe(true)
    const main = readFileSync('src/main.ts', 'utf8')
    expect(main).not.toContain("from './ads'")
    expect(main).not.toContain('PortalScene')
    expect(main).not.toContain('idle_double')
    expect(debugAllowed(false, '?debug=1')).toBe(false)
    expect(debugAllowed(true, '?debug=1')).toBe(true)
    expect(debugAllowed(true, '')).toBe(false)
  })

  it('keeps one monster in the team', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    expect(moveToPc(save, save.team[0])).toMatch(/Team/)
    const extra = 'pc1'
    save.mons[extra] = makeMon('m02', 5, 1, 'r1c1')
    save.pc.push(extra)
    expect(moveToTeam(save, extra, null)).toBeNull()
    expect(save.team).toHaveLength(2)
    expect(moveToPc(save, extra)).toBeNull()
    expect(save.team).toHaveLength(1)
  })
})

function leveledExp(start: number, level: number, exp: number): number {
  let total = exp
  for (let lvl = start; lvl < level; lvl++) total += expToNext(lvl)
  return total
}
