import { describe, expect, it } from 'vitest'
import { CATCH_BASE } from './const'
import { catchChance, expectedCatchAttempts } from './sim'
import { buildReport } from './balanceSim'

describe('balance measurement', () => {
  it('keeps the published catch rates and can write the report', () => {
    expect(catchChance(0, 10, 10)).toBe(CATCH_BASE[0])
    expect(CATCH_BASE[7]).toBe(0.05)
    expect(CATCH_BASE[8]).toBe(0.03)
    expect(CATCH_BASE[9]).toBe(0.015)
    expect(expectedCatchAttempts(8)).toBeGreaterThan(10)
    expect(expectedCatchAttempts(8)).toBeLessThan(20)
    expect(expectedCatchAttempts(9)).toBeGreaterThan(10)
    expect(expectedCatchAttempts(9)).toBeLessThan(20)
    const report = buildReport({ offlineShare: 0.5, onlineHours: 0, speed: 1, trials: 1, seed: 100 })
    expect(report).toContain('Grünmark')
    expect(report).toContain('Himmelsthron')
    expect(report).toContain('Cap')
    expect(report).toContain('Glücksmarken')
  })
})
