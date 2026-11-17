import { describe, expect, it } from 'vitest'
import {
  bossUltHitstop,
  bossUltShake,
  cameraShake,
  digitAtlasReady,
  digitFrames,
  hitGrade,
  layoutDigits,
  hitLook,
  hitstopMs,
  numberAlpha,
  numberHoldMs
} from './hitReadout'

describe('hit readout styles', () => {
  it('picks normal, weak, strong and crit', () => {
    expect(hitGrade('neutral', false)).toBe('normal')
    expect(hitGrade('weak', false)).toBe('weak')
    expect(hitGrade('strong', false)).toBe('strong')
    expect(hitGrade('weak', true)).toBe('crit')
    expect(hitGrade('strong', true)).toBe('crit')
  })

  it('paints weak smaller and gray, strong larger and orange, crit gold', () => {
    const normal = hitLook('normal')
    const weak = hitLook('weak')
    const strong = hitLook('strong')
    const crit = hitLook('crit')
    expect(normal).toMatchObject({ color: '#ffffff', label: '', bounce: false, scale: 1 })
    expect(weak.scale).toBeLessThan(normal.scale)
    expect(weak.color).toBe('#9aa4b8')
    expect(weak.label).toBe('SCHWACH')
    expect(strong.scale).toBeGreaterThan(normal.scale)
    expect(strong.color).toBe('#ff8a3d')
    expect(strong.label).toBe('STARK')
    expect(crit.color).toBe('#ffd54f')
    expect(crit.label).toBe('KRIT!')
    expect(crit.bounce).toBe(true)
    expect(crit.scale).toBeGreaterThan(strong.scale)
  })

  it('floats for 600 ms at ×1, half at ×2 and a third at ×3', () => {
    expect(numberHoldMs(1)).toBe(600)
    expect(numberHoldMs(2)).toBe(300)
    expect(numberHoldMs(3)).toBe(200)
  })

  it('keeps full alpha until the last 30 percent of the float', () => {
    expect(numberAlpha(0)).toBe(1)
    expect(numberAlpha(0.7)).toBe(1)
    expect(numberAlpha(0.85)).toBeCloseTo(0.5)
    expect(numberAlpha(1)).toBe(0)
  })

  it('shakes 4, 8 and 12 px and halves that when reduced or at ×3', () => {
    expect(cameraShake('normal', 'hit', { speed: 1, reduced: false })).toEqual({ ms: 80, px: 4 })
    expect(cameraShake('weak', 'hit', { speed: 1, reduced: false })).toEqual({ ms: 80, px: 4 })
    expect(cameraShake('strong', 'hit', { speed: 2, reduced: false })).toEqual({ ms: 120, px: 8 })
    expect(cameraShake('crit', 'hit', { speed: 1, reduced: false })).toEqual({ ms: 120, px: 8 })
    expect(bossUltShake({ speed: 1, reduced: false })).toEqual({ ms: 200, px: 12 })
    expect(cameraShake('crit', 'hit', { speed: 1, reduced: true })).toEqual({ ms: 120, px: 4 })
    expect(cameraShake('normal', 'hit', { speed: 3, reduced: false })).toEqual({ ms: 80, px: 2 })
    expect(bossUltShake({ speed: 3, reduced: true })).toEqual({ ms: 200, px: 6 })
  })

  it('pauses 40 ms on crit and strong, 80 ms on an ult, and never at ×3 or reduced', () => {
    const calm = { speed: 1, reduced: false }
    expect(hitstopMs('normal', 'hit', calm)).toBe(0)
    expect(hitstopMs('weak', 'hit', calm)).toBe(0)
    expect(hitstopMs('strong', 'hit', calm)).toBe(40)
    expect(hitstopMs('crit', 'hit', calm)).toBe(40)
    expect(bossUltHitstop(calm)).toBe(80)
    expect(hitstopMs('crit', 'hit', { speed: 3, reduced: false })).toBe(0)
    expect(hitstopMs('strong', 'hit', { speed: 1, reduced: true })).toBe(0)
    expect(bossUltHitstop({ speed: 2, reduced: true })).toBe(0)
  })

  it('lays atlas digits with the style overlap and waits for the texture', () => {
    expect(digitFrames('crit', 36).digits).toBe('k_3 k_6')
    expect(digitFrames('strong', 8).word).toBe('lbl_stark')
    expect(digitFrames('weak', 12).digits).toBe('w_1 w_2')
    expect(digitFrames('weak', 12).word).toBe('lbl_schwach')
    const row = layoutDigits('crit', 10, { k_1: 60, k_0: 79 })
    expect(row).toEqual([{ frame: 'k_1', x: 0 }, { frame: 'k_0', x: 53 }])
    expect(digitAtlasReady(() => false)).toBe(false)
    expect(digitAtlasReady((key) => key === 'battle-digits')).toBe(true)
  })
})
