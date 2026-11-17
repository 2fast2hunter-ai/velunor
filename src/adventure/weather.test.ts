import { describe, expect, it } from 'vitest'
import type { TypeId } from '../types'
import { rawDamage } from './battle'
import { meanWeatherFactor, teamWeatherMarks, weatherArrow, weatherFactor, WEATHERS, WEATHER_SHIFTS } from './weather'

const TYPES: TypeId[] = [
  'fire', 'water', 'plant', 'earth', 'wind', 'ice', 'lightning', 'poison', 'metal', 'stone',
  'light', 'shadow', 'ghost', 'dragon', 'insect', 'beast', 'fighting', 'psychic', 'sound', 'crystal'
]

describe('weather damage', () => {
  it('uses the A5 table and never moves a type by more than 15 percent', () => {
    expect(weatherFactor(null, 'fire')).toBe(1)
    expect(weatherFactor('regen', 'water')).toBe(1.15)
    expect(weatherFactor('regen', 'fire')).toBe(0.85)
    expect(weatherArrow('regen', 'fire')).toBe('down')
    expect(weatherArrow('regen', 'water')).toBe('up')
    expect(weatherArrow('regen', 'beast')).toBeNull()
    expect(weatherFactor('klar', 'light')).toBe(1.1)
    expect(weatherFactor('klar', 'ice')).toBe(0.9)
    expect(weatherFactor('gewitter', 'lightning')).toBe(1.15)
    expect(weatherFactor('gewitter', 'metal')).toBe(0.9)
    expect(weatherFactor('schnee', 'ice')).toBe(1.15)
    expect(weatherFactor('schnee', 'plant')).toBe(0.9)
    expect(weatherFactor('schnee', 'dragon')).toBe(0.9)
    expect(weatherFactor('nebel', 'ghost')).toBe(1.1)
    expect(weatherFactor('nebel', 'shadow')).toBe(1.1)
    expect(weatherFactor('nebel', 'light')).toBe(0.9)
    expect(weatherFactor('wind', 'wind')).toBe(1.15)
    expect(weatherFactor('wind', 'sound')).toBe(1.05)
    expect(weatherFactor('wind', 'insect')).toBe(0.9)
    expect(weatherFactor('regen', 'earth')).toBe(1)
    for (const weather of WEATHERS) {
      for (const shift of [...WEATHER_SHIFTS[weather].up, ...WEATHER_SHIFTS[weather].down]) {
        expect(Math.abs(shift.pct)).toBeLessThanOrEqual(15)
      }
    }
  })

  it('multiplies after the type chart', () => {
    const typed = rawDamage(40, 20, 1, 1.5, false, 1)
    const wet = rawDamage(40, 20, 1, 1.5 * weatherFactor('regen', 'fire'), false, 1)
    expect(wet).toBeLessThan(typed)
    expect(teamWeatherMarks(['water', 'water', 'fire'], 'regen')).toEqual({ up: 2, down: 1 })
    expect(teamWeatherMarks(['fire'], 'regen')).toEqual({ up: 0, down: 1 })
  })

  it('keeps every type within 3 percent of neutral across the six weathers', () => {
    let grand = 0
    for (const type of TYPES) {
      const mean = meanWeatherFactor(type)
      grand += mean
      expect(mean).toBeGreaterThanOrEqual(0.97)
      expect(mean).toBeLessThanOrEqual(1.03)
    }
    const overall = grand / TYPES.length
    expect(overall).toBeGreaterThanOrEqual(0.98)
    expect(overall).toBeLessThanOrEqual(1.02)
  })
})
