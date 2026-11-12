import { describe, expect, it } from 'vitest'
import { nextFloat } from '../rng'
import { chapterById, encounterTable, routeOf, sightingShares } from './route'
import { beginAdventure, makeMon } from './save'
import { SHINY_ADVENTURE_RATE, SHINY_HORT_RATE, regionDexComplete, rollShiny, shinyChance } from './shiny'
import { hereSightings, moveToTeam, resolveEncounter } from './sim'
import { regionRoster } from './dex'
import { WEATHERS, weatherAt, weatherForecast, weatherName } from './weather'

describe('weather', () => {
  it('is the same for one UTC hour and lists 24 hours ahead', () => {
    const ts = Date.UTC(2026, 5, 2, 15, 40)
    expect(weatherAt(ts)).toBe(weatherAt(ts + 10 * 60_000))
    expect(WEATHERS).toContain(weatherAt(ts))
    const forecast = weatherForecast(ts)
    expect(forecast).toHaveLength(24)
    expect(forecast[0].weather).toBe(weatherAt(ts))
    expect(forecast[0].at).toBe(Date.UTC(2026, 5, 2, 15))
    expect(forecast[1].at - forecast[0].at).toBe(3_600_000)
    expect(weatherForecast(ts)).toEqual(forecast)
    expect(weatherName('gewitter')).toBe('Gewitter')
  })

  it('gives every wild chapter one or two weather species at 5 to 8 percent', () => {
    for (let id = 1; id <= 8; id++) {
      const chapter = chapterById(1, id)
      expect(chapter.weather?.length).toBeGreaterThanOrEqual(1)
      expect(chapter.weather?.length).toBeLessThanOrEqual(2)
      for (const row of chapter.weather ?? []) {
        expect(row.pct).toBeGreaterThanOrEqual(5)
        expect(row.pct).toBeLessThanOrEqual(8)
        expect(WEATHERS).toContain(row.weather)
      }
    }
    const storm = chapterById(1, 3).weather?.find((row) => row.weather === 'gewitter')
    expect(storm).toEqual({ weather: 'gewitter', species: 'm54', pct: 7 })
  })

  it('puts the weather species into that hour and keeps the shares at 100', () => {
    const chapter = chapterById(1, 3)
    let ts = Date.UTC(2026, 0, 1, 0)
    for (let hour = 0; hour < 400; hour++) {
      ts = Date.UTC(2026, 0, 1, hour)
      if (weatherAt(ts) === 'gewitter') break
    }
    expect(weatherAt(ts)).toBe('gewitter')
    const shares = sightingShares(encounterTable(chapter, ts))
    expect(shares.reduce((sum, row) => sum + row.pct, 0)).toBeCloseTo(100, 5)
    expect(shares.find((row) => row.species === 'm54')?.pct).toBeCloseTo(7, 5)
    const save = beginAdventure('Ada', 'A', 'm01', ts)
    save.chapter = 3
    const seen = hereSightings(save, ts).map((row) => row.species)
    expect(seen).toContain('m54')
  })
})

describe('shimmer', () => {
  it('uses 1/4000 in the wild, doubles a finished region, and keeps 1/512 for the hort', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    expect(SHINY_ADVENTURE_RATE).toBeCloseTo(1 / 4000)
    expect(SHINY_HORT_RATE).toBeCloseTo(1 / 512)
    expect(shinyChance(save, 1)).toBeCloseTo(1 / 4000)
    expect(shinyChance(save, 1, 'hort')).toBeCloseTo(1 / 512)
    expect(regionDexComplete(save, 1)).toBe(false)
    for (const id of regionRoster(1)) save.dex[id] = { seen: 1, caught: 1 }
    expect(regionDexComplete(save, 1)).toBe(true)
    expect(shinyChance(save, 1)).toBeCloseTo(1 / 2000)
    expect(shinyChance(save, 1, 'hort')).toBeCloseTo(1 / 512)
    expect(rollShiny(() => 0, SHINY_ADVENTURE_RATE)).toBe(true)
    expect(rollShiny(() => 0.5, SHINY_ADVENTURE_RATE)).toBe(false)
  })

  it('marks a wild encounter as shimmer when the roll hits', () => {
    let seed = 1
    for (; seed < 250_000; seed++) {
      const state = { seed }
      nextFloat(state)
      nextFloat(state)
      if (nextFloat(state) < SHINY_ADVENTURE_RATE) break
    }
    const save = beginAdventure('Ada', 'A', 'm01', Date.UTC(2026, 3, 4, 8))
    save.rng = seed
    save.step = routeOf(save.chapter).findIndex((kind, index) => index > 0 && kind === 'wild')
    save.mons[save.team[0]].lvl = 12
    const outcome = resolveEncounter(save, Date.UTC(2026, 3, 4, 8), { offline: true, trace: false })
    expect(outcome.kind).toBe('wild')
    expect(outcome.shiny).toBe(true)
    if (outcome.catch?.success && outcome.catch.place !== 'exp') {
      expect(outcome.catch.shiny).toBe(true)
    }
  })

  it('allows only one shimmer of a species on the team', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    const leader = save.team[0]
    save.mons[leader].shiny = true
    const other = 'pc-shiny'
    save.mons[other] = makeMon('m01', 6, 2, 'r1c1', true)
    save.pc.push(other)
    expect(moveToTeam(save, other, null)).toMatch(/Schimmer/)
    expect(save.team).toEqual([leader])
    const plain = 'pc-plain'
    save.mons[plain] = makeMon('m02', 5, 3, 'r1c1')
    save.pc.push(plain)
    expect(moveToTeam(save, plain, null)).toBeNull()
    expect(save.team).toContain(plain)
  })
})

