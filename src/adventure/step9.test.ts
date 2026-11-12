import { describe, expect, it } from 'vitest'
import { t } from './i18n'
import { beginAdventure, exportCode, importCode, makeMon } from './save'
import { useCrystal } from './shop'
import { awakenCount, awakenFactor, combatStats, expToNext, monStats } from './stats'

describe('options and awakening', () => {
  it('raises stats by 15 percent at 25 and again at 50, and the skill by 0.25', () => {
    const at25 = makeMon('m01', 25, 0, 'r1c1')
    const at50 = makeMon('m01', 50, 0, 'r1c1')
    expect(awakenCount(24)).toBe(0)
    expect(awakenCount(25)).toBe(1)
    expect(awakenCount(50)).toBe(2)
    expect(awakenFactor(25)).toBeCloseTo(1.15)
    expect(awakenFactor(50)).toBeCloseTo(1.3)
    expect(monStats(at25).atk).toBe(Math.round(combatStats('m01', 25, false).atk * 1.15))
    expect(monStats(at50).spd).toBe(Math.round(combatStats('m01', 50, false).spd * 1.3))
    expect(monStats(at50).hp).toBeGreaterThan(monStats(at25).hp)
    expect(0.25 * awakenCount(25)).toBe(0.25)
    expect(0.25 * awakenCount(50)).toBe(0.5)
  })

  it('queues an awakening when a level crosses 25', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    const uid = save.team[0]
    save.mons[uid].lvl = 24
    save.mons[uid].exp = expToNext(24) - 1
    save.bag.crystals.s = 1
    useCrystal(save, 's', uid, 100)
    expect(save.mons[uid].lvl).toBeGreaterThanOrEqual(25)
    expect(save.pendingAwaken.some((row) => row.uid === uid && row.level === 25)).toBe(true)
  })

  it('exports a code and rejects a broken one', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1)
    save.gold = 4321
    save.settings.lang = 'en'
    const code = exportCode(save)
    expect(code.startsWith('VELUNOR1.')).toBe(true)
    const loaded = importCode(code, 2)
    expect(loaded?.gold).toBe(4321)
    expect(loaded?.mons[loaded.team[0]].species).toBe('m01')
    expect(loaded?.settings.lang).toBe('en')
    expect(importCode('nope', 2)).toBeNull()
    expect(importCode('VELUNOR1.@@@', 2)).toBeNull()
  })

  it('switches the same label between German and English', () => {
    expect(t('de', 'nav.adventure')).toBe('Abenteuer')
    expect(t('en', 'nav.adventure')).toBe('Adventure')
    expect(t('en', 'opt.power2')).toContain('2')
    expect(t('de', 'err.wheelLock')).toContain('Wappen')
    expect(t('de', 'awaken.body', { name: 'Funkfuchs', level: 25 })).toContain('15')
  })
})

