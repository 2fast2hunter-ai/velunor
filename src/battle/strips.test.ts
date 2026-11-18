import { describe, expect, it } from 'vitest'
import { FxPool } from './fxPool'
import { particleBudget, POOL_SIZE, typeFx } from './typeFx'
import { battleStripTypes, effectTiming, FX_MAX_MS, FX_MIN_MS, FX_POOL_MAX, hideStripImages, hitBurstLook, hitStrip, oldestByBorn, projStrip, stripFrame } from './strips'

describe('type strips', () => {
  it('does not reduce an empty hit-number pool', () => {
    expect(oldestByBorn([])).toBeUndefined()
    expect(oldestByBorn([{ born: 4 }, { born: 1 }, { born: 9 }])?.born).toBe(1)
  })

  it('hides strip images only after they exist', () => {
    expect(() => hideStripImages(undefined, undefined)).not.toThrow()
    let hidden = 0
    hideStripImages({ setVisible: () => { hidden += 1 } }, null)
    expect(hidden).toBe(1)
  })

  it('has a projectile and a hit burst for every type', () => {
    expect(battleStripTypes()).toHaveLength(20)
    for (const type of battleStripTypes()) {
      expect(projStrip(type).type).toBe(type)
      expect(projStrip(type).kind).not.toBe('hit')
      expect(hitStrip(type).kind).toBe('hit')
      expect(projStrip(type).frameW).toBe(128)
      expect(hitStrip(type).frames).toBeGreaterThan(0)
    }
  })

  it('keeps the effect at or under 700 ms and floors the tempo split at 150 ms', () => {
    for (const type of battleStripTypes()) {
      const once = effectTiming(type, 1)
      expect(once.totalMs).toBeLessThanOrEqual(FX_MAX_MS)
      expect(once.totalMs).toBeGreaterThanOrEqual(FX_MIN_MS)
      expect(once.travelMs + once.hitMs).toBe(once.totalMs)
      expect(effectTiming(type, 2).totalMs).toBeLessThanOrEqual(once.totalMs)
      expect(effectTiming(type, 3).totalMs).toBeGreaterThanOrEqual(FX_MIN_MS)
      expect(effectTiming(type, 3).totalMs).toBeLessThanOrEqual(once.totalMs)
    }
    expect(effectTiming('fire', 1).totalMs).toBe(522)
    expect(effectTiming('fire', 2).totalMs).toBe(261)
    expect(effectTiming('ghost', 1).totalMs).toBe(651)
    expect(effectTiming('lightning', 3).totalMs).toBe(FX_MIN_MS)
    expect(effectTiming('lightning', 1).travelMs).toBeGreaterThan(0)
  })

  it('scales a strong, weak and crit burst without recolouring', () => {
    expect(hitBurstLook('neutral', false)).toEqual({ scale: 1, alpha: 1 })
    expect(hitBurstLook('strong', false)).toEqual({ scale: 1.3, alpha: 1 })
    expect(hitBurstLook('weak', false)).toEqual({ scale: 0.7, alpha: 0.5 })
    expect(hitBurstLook('weak', true).scale).toBe(1.4)
  })

  it('loops a projectile frame and holds the last hit frame', () => {
    expect(stripFrame(6, 20, 0, true)).toBe(0)
    expect(stripFrame(6, 20, 300, true)).toBe(0)
    expect(stripFrame(4, 18, 500, false)).toBe(3)
  })

  it('shares one pool of 40 and spawns nothing at ×3 or reduced effects', () => {
    expect(POOL_SIZE).toBe(FX_POOL_MAX)
    expect(FX_POOL_MAX).toBe(40)
    const fire = typeFx('fire')
    const dragon = typeFx('dragon')
    expect(particleBudget(fire, { crit: false, tempo: 1, reduced: false })).toBe(21)
    expect(particleBudget(fire, { crit: true, tempo: 1, reduced: false })).toBe(28)
    expect(particleBudget(dragon, { crit: true, tempo: 1, reduced: false })).toBe(40)
    expect(particleBudget(fire, { crit: true, tempo: 3, reduced: false })).toBe(0)
    expect(particleBudget(fire, { crit: true, tempo: 1, reduced: true })).toBe(0)
    const pool = new FxPool()
    for (let fight = 0; fight < 500; fight++) {
      pool.releaseAll()
      expect(pool.acquire(fight % 2 === 0 ? 40 : 80)).toBeLessThanOrEqual(40)
      pool.step()
    }
    pool.releaseAll()
    expect(pool.live).toBe(0)
    expect(pool.allocated).toBe(40)
    expect(pool.highWater).toBeLessThanOrEqual(40)
  })
})
