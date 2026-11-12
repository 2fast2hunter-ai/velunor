import { describe, expect, it } from 'vitest'
import typesJson from '../../data/types.json'
import type { TypeId } from '../types'
import { FxPool } from './fxPool'
import { arcHeight, lungeOffset } from './stage'
import { attackDuration, particleBudget, TYPE_FX, typeBase, typeFx } from './typeFx'

const ACCENTS: Record<TypeId, string> = {
  fire: '#ffca28', water: '#e3f2fd', plant: '#c5e1a5', earth: '#d7ccc8', wind: '#ffffff',
  ice: '#ffffff', lightning: '#ffffff', poison: '#ce93d8', stone: '#bcaaa4', crystal: '#80deea',
  metal: '#eceff1', fighting: '#ffcc80', beast: '#ffe0b2', insect: '#fff59d', light: '#ffd54f',
  shadow: '#212121', ghost: '#f3e5f5', psychic: '#e1bee7', sound: '#ffffff', dragon: '#7e57c2'
}

const TRAVEL: Record<TypeId, number> = {
  fire: 300, water: 280, plant: 340, earth: 260, wind: 240, ice: 280, lightning: 120, poison: 360,
  stone: 320, crystal: 300, metal: 260, fighting: 200, beast: 220, insect: 320, light: 220,
  shadow: 320, ghost: 380, psychic: 280, sound: 260, dragon: 340
}

describe('type effect table', () => {
  it('covers all 20 types with colours from types.json and the spec accents', () => {
    expect(TYPE_FX).toHaveLength(20)
    const colors = typesJson.colors as Record<TypeId, string>
    for (const entry of TYPE_FX) {
      expect(entry.base).toBe(colors[entry.type])
      expect(entry.base).toBe(typeBase(entry.type))
      expect(entry.accent).toBe(ACCENTS[entry.type])
      expect(entry.travelMs).toBe(TRAVEL[entry.type])
      expect(entry.particles).toBeLessThanOrEqual(40)
      expect(entry.critParticles).toBeLessThanOrEqual(60)
      expect(typeFx(entry.type)).toBe(entry)
    }
    expect(typeFx('fire').projectile).toBe(true)
    expect(typeFx('water').projectile).toBe(false)
    expect(typeFx('lightning').draw).toBe('bolt')
  })

  it('keeps an attack inside 700 ms and at least 150 ms after the tempo split', () => {
    expect(attackDuration(300, 1)).toBeLessThanOrEqual(700)
    expect(attackDuration(300, 1)).toBeGreaterThanOrEqual(150)
    expect(attackDuration(380, 3)).toBeGreaterThanOrEqual(150)
    expect(attackDuration(0, 3)).toBe(150)
    expect(attackDuration(300, 2)).toBeLessThan(attackDuration(300, 1))
  })

  it('caps particles, halves them at tempo 3, and cuts them to 30 % when reduced', () => {
    const fire = typeFx('fire')
    expect(particleBudget(fire, { crit: false, tempo: 1, reduced: false })).toBe(12)
    expect(particleBudget(fire, { crit: true, tempo: 1, reduced: false })).toBe(16)
    expect(particleBudget(fire, { crit: true, tempo: 3, reduced: false })).toBe(8)
    expect(particleBudget(fire, { crit: false, tempo: 1, reduced: true })).toBe(4)
  })

  it('returns the lunge and keeps the projectile arc flat', () => {
    expect(lungeOffset(0)).toBe(0)
    expect(lungeOffset(80)).toBe(12)
    expect(lungeOffset(200)).toBe(0)
    expect(arcHeight(0)).toBe(0)
    expect(arcHeight(0.5)).toBeCloseTo(20)
    expect(arcHeight(1)).toBeCloseTo(0)
  })

  it('reuses one pool across 500 fights', () => {
    const pool = new FxPool(60)
    for (let fight = 0; fight < 500; fight++) {
      pool.releaseAll()
      expect(pool.acquire(fight % 2 === 0 ? 40 : 60)).toBeLessThanOrEqual(60)
      pool.step()
    }
    pool.releaseAll()
    expect(pool.live).toBe(0)
    expect(pool.allocated).toBe(60)
    expect(pool.highWater).toBeLessThanOrEqual(60)
  })
})
