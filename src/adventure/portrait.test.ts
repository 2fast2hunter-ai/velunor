import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  BATTLE_H,
  NAV_H,
  SAFE_H,
  SAVE_KEY_V2,
  SAVE_VERSION,
  SHELL_BAND,
  SHELL_H,
  SHELL_W,
  TOUCH_MIN,
  fitScale,
  phoneLandscape,
  tabBarBottomGap
} from './const'
import { t } from './i18n'
import { beginAdventure, loadAdventure } from './save'
import type { StorageLike } from './types'
import { gameHtml, type CodexQuery, type PcQuery } from './view'

const pc: PcQuery = { q: '', type: '', rarity: '', shiny: '', sort: 'newest', dir: -1 }
const dex: CodexQuery = { q: '', type: '', rarity: '', shiny: '' }

function memory(): StorageLike {
  const box = new Map<string, string>()
  return {
    getItem: (key) => box.get(key) ?? null,
    setItem: (key, value) => { box.set(key, value) },
    removeItem: (key) => { box.delete(key) }
  }
}

describe('portrait shell', () => {
  it('fits a 1080×2340 base with a 1920 safe band and a 180 px bar', () => {
    expect(SHELL_W).toBe(1080)
    expect(SHELL_H).toBe(2340)
    expect(SAFE_H).toBe(1920)
    expect(SHELL_BAND).toBe(210)
    expect(NAV_H).toBe(180)
    expect(BATTLE_H).toBe(980)
    expect(BATTLE_H / SHELL_H).toBeCloseTo(0.42, 2)
    expect(TOUCH_MIN).toBe(132)
    expect(phoneLandscape(780, 360)).toBe(true)
    expect(phoneLandscape(844, 390)).toBe(true)
    expect(phoneLandscape(360, 780)).toBe(false)
    expect(phoneLandscape(390, 844)).toBe(false)
    expect(phoneLandscape(1920, 1080)).toBe(false)
    expect(fitScale(360, 780)).toBeCloseTo(1 / 3)
    expect(fitScale(390, 844)).toBeCloseTo(844 / 2340)
    expect(fitScale(1920, 1080)).toBeCloseTo(1080 / 2340)
    expect(tabBarBottomGap(360, 780)).toBeLessThan(1)
    expect(tabBarBottomGap(390, 844)).toBeLessThan(1)
    expect(tabBarBottomGap(430, 932)).toBeLessThan(1)
    const css = readFileSync(new URL('./adventure.css', import.meta.url), 'utf8')
    expect(css).toContain('padding-bottom: calc(env(safe-area-inset-bottom, 0px) / var(--ui-scale, 1))')
    expect(css).toMatch(/\.band-bot\s*\{[^}]*height:\s*0/)
    expect(readFileSync(new URL('../../index.html', import.meta.url), 'utf8')).toContain('viewport-fit=cover')
    expect(t('de', 'turn.please')).toBe('Bitte Handy drehen')
    expect(t('de', 'nav.more')).toBe('Mehr')
  })

  it('puts the chosen look on the chapter header and hides the boss card while fighting', () => {
    const look = { skin: 2, hair: 3, color: 1 }
    const save = beginAdventure('Mira', look, 'm01', 1_000)
    expect(save.look).toEqual(look)
    const road = gameHtml(save, 'adventure', 1_000, pc, dex, null, false, false, null)
    const header = road.slice(road.indexOf('chapter-line'), road.indexOf('chapter-text'))
    expect(header).toContain(`data-look="${look.skin},${look.hair},${look.color}"`)
    expect(road).toContain('guard-card')
    const fight = gameHtml(save, 'adventure', 1_000, pc, dex, null, false, false, null, save.step, undefined, { fighting: true })
    const fightHead = fight.slice(fight.indexOf('chapter-line'), fight.indexOf('chapter-text'))
    expect(fightHead).toContain(`data-look="${look.skin},${look.hair},${look.color}"`)
    expect(fight).not.toContain('guard-card')
  })

  it('stacks the adventure screen and keeps Mehr behind one tab', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    save.step = 4
    save.log = [0, 1, 2, 3, 4].map((n) => ({ t: n, text: `Zeile ${n}` }))
    const html = gameHtml(save, 'adventure', 1_000, pc, dex, null, false, false, null, save.step, undefined, { mapOpen: false, moreOpen: true })
    expect(html).toContain('anchor-top')
    expect(html).toContain('anchor-mid')
    expect(html).toContain('anchor-bot')
    expect(html).toContain('class="tabbar"')
    expect(html.match(/class="tab /g)).toHaveLength(5)
    expect(html).toContain('tab_abenteuer_128.png')
    expect(html).toContain('tab_team_128.png')
    expect(html).toContain('tab_kodex_128.png')
    expect(html).toContain('tab_aktivitaeten_128.png')
    expect(html).toContain('tab_mehr_128.png')
    expect(html).toContain('>Abenteuer<')
    expect(html).toContain('>Mehr<')
    expect(html).toContain('data-screen="shop"')
    expect(html).toContain('>Laden<')
    expect(html).toContain('>Erfolge<')
    expect(html).toContain('>Optionen<')
    expect(html).toContain('>Anleitung<')
    expect(html).toContain('Kodex 1/100')
    expect(html).toContain('bg_gm_wiese_p.webp')
    expect(html).toContain('top:44%')
    expect(html).toContain('top:86%')
    expect(html.match(/class="path-row"/g)).toHaveLength(2)
    expect(html.match(/class="node /g)).toHaveLength(20)
    expect(html).toContain('Zeile 4')
    expect(html).toContain('Zeile 2')
    expect(html).not.toContain('Zeile 0')
    expect(html).toContain('Spuren hier')
    expect(html).toContain('data-act="speed"')
    expect(html.match(/class="mini /g)?.length).toBe(6)
  })

  it('opens the chapter map and the full log without dropping the road', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    save.chapter = 10
    const council = gameHtml(save, 'adventure', 1_000, pc, dex, null, true, false, null, 2, undefined, { mapOpen: true })
    expect(council).toContain('council-path')
    expect(council.match(/class="path-row"/g)).toHaveLength(1)
    expect(council).toContain('class="map-sheet')
    expect(council).toContain('class="drawer')
    const logged = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    logged.log = [{ t: 1, text: 'Erste Zeile im Protokoll' }]
    const full = gameHtml(logged, 'adventure', 1_000, pc, dex, null, false, false, { kind: 'log' })
    expect(full).toContain('Ereignisprotokoll')
    expect(full).toContain('Erste Zeile im Protokoll')
  })

  it('loads an older v2 save on the same key without dropping fields', () => {
    const storage = memory()
    storage.setItem(SAVE_KEY_V2, JSON.stringify({
      v: 2,
      name: 'Ada',
      avatar: 'B',
      gold: 4321,
      marks: 7,
      lastSeenAt: 10,
      region: 1,
      chapter: 2,
      step: 5,
      loop: false,
      badges: ['Sonnenwappen'],
      team: ['u1'],
      pc: ['u2'],
      buddy: 'u1',
      mons: {
        u1: { species: 'm01', lvl: 12, exp: 3, hp: 4, shiny: true, caughtAt: 1, caughtWhere: 'r1c1', keepDupes: true },
        u2: { species: 'm02', lvl: 8, exp: 1, hp: null, shiny: false, caughtAt: 2, caughtWhere: 'r1c2', keepDupes: false }
      },
      dex: { m01: { seen: 2, caught: 2 } },
      settings: { speed: 3, lang: 'en', shake: true },
      rng: 99,
      nextId: 4,
      started: true,
      active: 'u1',
      log: [{ t: 1, text: 'Hallo' }],
      sealPity: { m03: 2 },
      layout: 1,
      fxShake: 1,
      councilBeaten: ['rat1'],
      regionsOpen: [1]
    }))
    const loaded = loadAdventure(storage, 50)
    expect(loaded?.v).toBe(2)
    expect(loaded?.saveVersion).toBe(SAVE_VERSION)
    expect(SAVE_VERSION).toBe(5)
    expect(loaded?.name).toBe('Ada')
    expect(loaded?.avatar).toBe('B')
    expect(loaded?.look).toEqual({ skin: 3, hair: 1, color: 3 })
    expect(loaded?.gold).toBe(4321)
    expect(loaded?.marks).toBe(7)
    expect(loaded?.chapter).toBe(2)
    expect(loaded?.step).toBe(5)
    expect(loaded?.loop).toBe(false)
    expect(loaded?.badges).toEqual(['Sonnenwappen'])
    expect(loaded?.team).toEqual(['u1'])
    expect(loaded?.pc).toEqual(['u2'])
    expect(loaded?.buddy).toBe('u1')
    expect(loaded?.mons.u1.lvl).toBe(12)
    expect(loaded?.mons.u1.shiny).toBe(true)
    expect(loaded?.mons.u1.keepDupes).toBe(true)
    expect(loaded?.mons.u1.hp).toBe(4)
    expect(loaded?.mons.u2.species).toBe('m02')
    expect(loaded?.dex.m01.caught).toBe(2)
    expect(loaded?.settings.speed).toBe(3)
    expect(loaded?.settings.lang).toBe('en')
    expect(loaded?.settings.shake).toBe(true)
    expect(loaded?.log[0].text).toBe('Hallo')
    expect(loaded?.sealPity.m03).toBe(2)
    expect(loaded?.rng).toBe(99)
    expect(loaded?.councilBeaten).toEqual(['rat1'])
    expect(storage.getItem(SAVE_KEY_V2)).toContain('"v":2')
  })
})
