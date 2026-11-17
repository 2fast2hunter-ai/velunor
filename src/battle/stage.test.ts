import { describe, expect, it } from 'vitest'
import { clampShift } from './stage'

describe('sprite stays in the field', () => {
  it('pulls a left-edge lunge and the entrance slide back inside', () => {
    const field = 1080
    const sprite = 280
    const ally = 0.28 * field
    const foe = 0.72 * field
    expect(clampShift(ally, -240, field, sprite)).toBeGreaterThan(-240)
    expect(ally + clampShift(ally, -240, field, sprite)).toBeGreaterThanOrEqual(16 + sprite / 2)
    expect(clampShift(ally, 360, field, sprite)).toBeCloseTo(360)
    expect(foe + clampShift(foe, -420, field, sprite)).toBeGreaterThanOrEqual(16 + sprite / 2)
    expect(foe + clampShift(foe, 80, field, sprite)).toBeLessThanOrEqual(field - 16 - sprite / 2)
  })
})
