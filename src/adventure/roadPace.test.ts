import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { setRoadQueue } from './battlePlayer'
import { BASE_ENCOUNTER_MS, OFFLINE_CAP_MS } from './const'
import { referenceTeam } from './gauntlet'
import { MASTERY_STEPS } from './mastery'
import { chapterById } from './route'
import {
  CHANCE_CAP,
  PACE_K,
  PACE_STEP,
  ROAD_PACE_DEFAULT,
  ROAD_PACE_SWITCH,
  W_CAP,
  bankAdd,
  noteRoadNode,
  paceChance,
  paceWeight,
  readRoadPace,
  roadNodeMs,
  roadPaceFromSearch,
  roadPaceLive,
  setRoadPace
} from './roadPace'
import { beginAdventure, loadAdventure, makeMon, writeSave } from './save'
import { resolveEncounter, simulateOffline } from './sim'
import { grantFindChest } from './sources'
import type { FightTrace } from './battle'
import type { SaveV2, StorageLike } from './types'

afterEach(() => {
  setRoadPace(null)
  setRoadQueue(null)
})

function memory(): StorageLike {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => { map.set(key, value) },
    removeItem: (key) => { map.delete(key) }
  }
}

function arm(): void {
  setRoadQueue(true)
  setRoadPace(true)
}

describe('road pace', () => {
  it('is on with the road queue, and a save without roadPace still loads', () => {
    expect(ROAD_PACE_SWITCH).toBe(true)
    expect(roadPaceLive()).toBe(true)
    expect(roadPaceFromSearch(false, '?debug=1&roadQueue=1&roadPace=1')).toBe(false)
    expect(roadPaceFromSearch(true, '?roadPace=1')).toBe(true)
    expect(roadPaceFromSearch(true, '?debug=1&roadQueue=1')).toBe(false)
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8')
    expect(app).toContain("roadPaceFromSearch(debug, window.location.search) && battleQueueOn('road')")
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    save.rng = 42
    for (let i = 0; i < 40; i++) resolveEncounter(save, 2_000 + i * 2800, { offline: false, trace: false })
    expect(save.roadPace).toBeGreaterThan(1)
    const box = memory()
    writeSave(box, save)
    const raw = JSON.parse(box.getItem('velunor_v2') ?? '{}') as SaveV2
    raw.roadPace = 2.25
    raw.rewardBank = { mastery: 0.4, findChest: 0.2, trainerChest: 0, shard: 1.5 }
    box.setItem('velunor_v2', JSON.stringify(raw))
    const loaded = loadAdventure(box, 9_000)
    expect(loaded?.roadPace).toBe(2.25)
    expect(loaded?.rewardBank).toEqual({ mastery: 0.4, findChest: 0.2, trainerChest: 0, shard: 1.5 })
    const plain = beginAdventure('Bea', { skin: 0, hair: 0, color: 0 }, 'm02', 3_000)
    writeSave(box, plain)
    expect(loadAdventure(box, 4_000)?.roadPace).toBeUndefined()
  })

  it('reads W before the node, caps the payout, and parks the fraction', () => {
    arm()
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    expect(readRoadPace(save)).toBe(ROAD_PACE_DEFAULT)
    expect(paceWeight(save)).toBe(1.6)
    save.roadPace = 10
    expect(paceWeight(save)).toBe(W_CAP)
    const mild = paceChance(save, 0.2, 'shard')
    expect(mild.roll).toBeCloseTo(0.7)
    expect(mild.overflow).toBe(0)
    const hot = paceChance(save, 0.4, 'shard')
    expect(hot.roll).toBe(CHANCE_CAP)
    expect(hot.overflow).toBeCloseTo(0.4 * W_CAP - CHANCE_CAP)
    save.roadPace = 1.6
    noteRoadNode(save, 'find', [], false)
    expect(save.roadPace).toBeCloseTo(1.6 + PACE_STEP * (1 - 1.6))
    const held = save.roadPace ?? 0
    noteRoadNode(save, 'guardian', [], false)
    noteRoadNode(save, 'find', [], true)
    expect(save.roadPace).toBeCloseTo(held)
    setRoadPace(false)
    noteRoadNode(save, 'wild', [], false)
    expect(save.roadPace).toBeCloseTo(held)
    setRoadPace(true)
    save.roadPace = 1.6
    expect(grantFindChest(save, true)).toBe(1)
    expect(save.rewardBank?.findChest).toBeCloseTo(0.6)
    expect(grantFindChest(save, true)).toBe(2)
    expect(save.rewardBank?.findChest).toBeCloseTo(0.2)
    expect(bankAdd(save, 'mastery', 1.6 * PACE_K.mastery)).toBe(1)
    const trace = { frames: [{ allyHp: 1, foeHp: 0, text: 'Schlag', hits: [{ from: 'ally' as const, amount: 1, crit: false, type: 'fire' as const, band: 'neutral' as const, ko: true, kind: 'hit' as const }] }] } as FightTrace
    expect(roadNodeMs('find', [])).toBe(BASE_ENCOUNTER_MS)
    expect(roadNodeMs('wild', [trace])).toBeGreaterThanOrEqual(BASE_ENCOUNTER_MS)
    expect(roadNodeMs('guardian', [trace])).toBe(0)
  })

  it('keeps an 8 h offline catch-up identical while the switch is on', () => {
    const seeded = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 5_000)
    seeded.rng = 99
    const quiet = structuredClone(seeded)
    const paced = structuredClone(seeded)
    arm()
    const left = simulateOffline(quiet, OFFLINE_CAP_MS, 5_000 + OFFLINE_CAP_MS)
    const right = simulateOffline(paced, OFFLINE_CAP_MS, 5_000 + OFFLINE_CAP_MS)
    expect(paced.gold).toBe(quiet.gold)
    expect(paced.rng).toBe(quiet.rng)
    expect(paced.shards).toEqual(quiet.shards)
    expect(paced.chests).toEqual(quiet.chests)
    expect(paced.mastery).toEqual(quiet.mastery)
    expect(paced.roadPace).toBeUndefined()
    expect(left.summary.gold).toBe(right.summary.gold)
    expect(Object.values(paced.mons).map((mon) => [mon.species, mon.lvl, mon.exp])).toEqual(
      Object.values(quiet.mons).map((mon) => [mon.species, mon.lvl, mon.exp])
    )
  })
})

const RUNS = 6
const N = 3000
const HOUR = 3_600_000

function sumRecord(value: Record<string, number> | undefined): number {
  let total = 0
  for (const part of Object.values(value ?? {})) total += typeof part === 'number' ? part : 0
  return total
}

function sumChests(save: SaveV2): number {
  return save.chests.kiesel + save.chests.silber + save.chests.gold + save.chests.sternen
}

function prepare(region: number, chapter: number, run: number): SaveV2 {
  const now = Date.UTC(2026, 10, 20, 8) + run * 7_777_777
  const starter = ['m01', 'm02', 'm03'][run % 3]
  const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, starter, now)
  save.rng = ((run + 1) * 0x9e3779b1) >>> 0
  const cap = chapterById(region, chapter).cap
  save.region = region
  save.chapter = chapter
  save.step = 1
  save.hold = false
  save.regionsOpen = Array.from({ length: region }, (_, index) => index + 1)
  if (region === 1) {
    const uid = save.team[0]
    save.mons[uid].lvl = cap
    save.mons[uid].exp = 0
    return save
  }
  save.mons = {}
  save.team = []
  save.pc = []
  save.buddy = null
  referenceTeam(region).slice(0, 6).forEach((id, index) => {
    const uid = `u${index}`
    save.mons[uid] = makeMon(id, cap, now, 'spur')
    save.team.push(uid)
  })
  save.active = save.team[0]
  save.buddy = save.team[0]
  return save
}

function measure(region: number, chapter: number): { pct: Record<string, number>, hoursOld: number, hoursNew: number, wildMin: number } {
  setRoadQueue(false)
  setRoadPace(false)
  let oldMs = 0
  let newMs = 0
  let oldAll = 0
  let newAll = 0
  const base = { gold: 0, exp: 0, shards: 0, mastery: 0, chests: 0 }
  const paced = { gold: 0, exp: 0, shards: 0, mastery: 0, chests: 0 }
  const masteryAll = { base: 0, paced: 0 }
  let wildMin = Number.POSITIVE_INFINITY
  for (let run = 0; run < RUNS; run++) {
    const save = prepare(region, chapter, run)
    let ema = ROAD_PACE_DEFAULT
    let now = Date.UTC(2026, 10, 20, 8) + run * 7_777_777
    for (let i = 0; i < N; i++) {
      now += BASE_ENCOUNTER_MS
      save.hold = false
      save.region = region
      save.chapter = chapter
      const gold0 = save.gold
      const shard0 = sumRecord(save.shards)
      const mastery0 = sumRecord(save.mastery)
      const chest0 = sumChests(save)
      let outcome
      try {
        outcome = resolveEncounter(save, now, { offline: false, trace: true })
      } catch {
        continue
      }
      const row = {
        gold: save.gold - gold0,
        exp: outcome.exp ?? 0,
        shards: Math.max(0, sumRecord(save.shards) - shard0),
        mastery: sumRecord(save.mastery) - mastery0,
        chests: Math.max(0, sumChests(save) - chest0)
      }
      const road = outcome.kind === 'wild' || outcome.kind === 'trainer' || outcome.kind === 'find' || outcome.kind === 'spring'
      const d = road ? roadNodeMs(outcome.kind, outcome.traces) : BASE_ENCOUNTER_MS
      if (outcome.kind === 'wild') wildMin = Math.min(wildMin, d)
      oldAll += BASE_ENCOUNTER_MS
      newAll += d
      masteryAll.base += row.mastery
      const w = Math.min(W_CAP, Math.max(1, ema))
      masteryAll.paced += road ? row.mastery * w * PACE_K.mastery : row.mastery
      if (road) {
        oldMs += BASE_ENCOUNTER_MS
        newMs += d
        for (const key of Object.keys(base) as (keyof typeof base)[]) {
          base[key] += row[key]
          const kind = key === 'exp' ? 'exp' : key === 'gold' ? 'gold' : key === 'shards' ? 'shard' : key === 'mastery' ? 'mastery' : 'chest'
          paced[key] += row[key] * w * PACE_K[kind]
        }
        ema += PACE_STEP * (d / BASE_ENCOUNTER_MS - ema)
      }
    }
  }
  const oldH = oldMs / HOUR
  const newH = newMs / HOUR
  const pct: Record<string, number> = {}
  for (const key of Object.keys(base) as (keyof typeof base)[]) {
    const alt = base[key] / oldH
    const neu = paced[key] / newH
    pct[key] = (neu / alt - 1) * 100
  }
  const perHour = (points: number, ms: number) => points / (ms / HOUR) * (BASE_ENCOUNTER_MS / 930)
  return {
    pct,
    hoursOld: MASTERY_STEPS[4] / perHour(masteryAll.base, oldAll),
    hoursNew: MASTERY_STEPS[4] / perHour(masteryAll.paced, newAll),
    wildMin
  }
}

describe('road pace acceptance', () => {
  it('keeps EP/h and Gold/h within ±10 % of the 2800 ms clock', { timeout: 180_000 }, () => {
    const stands = [
      [1, 1, 'R1 K1'],
      [2, 4, 'R2 K4'],
      [4, 4, 'R4 K4']
    ] as const
    for (const [region, chapter, name] of stands) {
      const row = measure(region, chapter)
      console.log(name, 'EP', row.pct.exp.toFixed(1) + '%', 'Gold', row.pct.gold.toFixed(1) + '%', 'Splitter', row.pct.shards.toFixed(1) + '%', 'M-EP', row.pct.mastery.toFixed(1) + '%', 'Truhen', row.pct.chests.toFixed(1) + '%', '35000 M-EP ×3 alt', row.hoursOld.toFixed(2) + 'h', 'neu', row.hoursNew.toFixed(2) + 'h', 'k', JSON.stringify(PACE_K))
      expect(row.wildMin).toBeGreaterThanOrEqual(BASE_ENCOUNTER_MS)
      for (const key of ['exp', 'gold', 'shards', 'mastery', 'chests']) {
        expect(Math.abs(row.pct[key]), `${name} ${key}`).toBeLessThanOrEqual(10)
      }
      expect(Math.abs(row.hoursNew / row.hoursOld - 1), `${name} mastery hours`).toBeLessThanOrEqual(0.1)
    }
  })
})
