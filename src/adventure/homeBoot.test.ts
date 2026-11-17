import { describe, expect, it } from 'vitest'
import { FIRST_ENTRANCE_MS, HOME_ASSETS, homeParticlePlan, loadFraction } from './homeBoot'
import { loadingHtml } from './view'

describe('home boot', () => {
  it('counts real files and keeps particles inside the cap', () => {
    expect(HOME_ASSETS).toContain('home/keyart_1080.webp')
    expect(HOME_ASSETS).toContain('home/loading_logo.png')
    expect(loadFraction(0, HOME_ASSETS.length)).toBe(0)
    expect(loadFraction(HOME_ASSETS.length, HOME_ASSETS.length)).toBe(1)
    expect(loadFraction(3, 0)).toBe(1)
    const live = homeParticlePlan(false)
    expect(live.total).toBeLessThanOrEqual(20)
    expect(live.leaves + live.lights).toBe(live.total)
    expect(homeParticlePlan(true)).toEqual({ leaves: 0, lights: 0, total: 0 })
    expect(FIRST_ENTRANCE_MS).toBeLessThanOrEqual(1500)
  })

  it('shows a reload button when the boot images fail', () => {
    const ok = loadingHtml(0.4, 'Die Wiese erwacht …', false, 'de')
    expect(ok).toContain('role="progressbar"')
    expect(ok).toContain('aria-valuenow="40"')
    expect(ok).toContain('loading_logo.png')
    expect(ok).not.toContain('data-act="reload"')
    const failed = loadingHtml(0.2, 'Die Wiese erwacht …', true, 'de')
    expect(failed).toContain('data-act="reload"')
    expect(failed).toContain('Neu laden')
  })
})
