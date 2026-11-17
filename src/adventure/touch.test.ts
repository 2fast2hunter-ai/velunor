import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BASE_ENCOUNTER_MS, SAVE_KEY_V2, SAVE_VERSION, offlineEncounterCount } from './const'
import { beginAdventure, loadAdventure, writeSave } from './save'
import { simulateOffline } from './sim'
import type { StorageLike } from './types'
import {
  BATTERY_FPS,
  FONT_SCALES,
  FRAME_MS,
  LONG_PRESS_MS,
  LONG_PRESS_SLOP,
  SWIPE_MIN,
  batteryPause,
  battleRemainder,
  fontFactor,
  fontScale,
  hapticPattern,
  headerRow,
  hudBlock,
  logBlock,
  logRow,
  longPressCard,
  nextTab,
  paintDue,
  requestHaptic,
  resumeGap,
  shouldCatchUp,
  stampWhilePaused,
  swipeDirection,
  tabBlock
} from './touch'
import { gameHtml, type CodexQuery, type PcQuery } from './view'

const dex: CodexQuery = { q: '', type: '', rarity: '', shiny: '' }
const pcQuery: PcQuery = { q: '', type: '', rarity: '', shiny: '', sort: 'newest', dir: -1 }

function memory(): StorageLike {
  const box = new Map<string, string>()
  return {
    getItem: (key) => box.get(key) ?? null,
    setItem: (key, value) => { box.set(key, value) },
    removeItem: (key) => { box.delete(key) }
  }
}

describe('touch polish', () => {
  it('migrates saveVersion 2 to 3 on velunor_v2 and keeps the chosen settings', () => {
    const storage = memory()
    const save = beginAdventure('Ada', 'B', 'm02', 1_000)
    save.gold = 4321
    save.settings.speed = 3
    save.settings.lang = 'en'
    save.settings.shake = true
    save.settings.swipeTabs = false
    save.settings.haptics = false
    save.settings.font = 130
    save.settings.battery = true
    const uid = save.team[0]
    writeSave(storage, save)
    const raw = JSON.parse(storage.getItem(SAVE_KEY_V2) ?? '{}') as { saveVersion: number; settings: { font?: number; battery?: boolean } }
    raw.saveVersion = 2
    delete raw.settings.font
    delete raw.settings.battery
    storage.setItem(SAVE_KEY_V2, JSON.stringify(raw))

    const loaded = loadAdventure(storage, 5_000)
    expect(SAVE_VERSION).toBe(3)
    expect(SAVE_KEY_V2).toBe('velunor_v2')
    expect(storage.getItem(SAVE_KEY_V2)).toBeTruthy()
    expect(loaded?.v).toBe(2)
    expect(loaded?.saveVersion).toBe(3)
    expect(loaded?.gold).toBe(4321)
    expect(loaded?.name).toBe('Ada')
    expect(loaded?.team).toEqual([uid])
    expect(loaded?.mons[uid].species).toBe('m02')
    expect(loaded?.settings.speed).toBe(3)
    expect(loaded?.settings.lang).toBe('en')
    expect(loaded?.settings.shake).toBe(true)
    expect(loaded?.settings.swipeTabs).toBe(false)
    expect(loaded?.settings.haptics).toBe(false)
    expect(loaded?.settings.font).toBe(100)
    expect(loaded?.settings.battery).toBe(false)

    loaded!.settings.font = 115
    loaded!.settings.battery = true
    loaded!.settings.swipeTabs = true
    loaded!.settings.haptics = true
    writeSave(storage, loaded!)
    const again = loadAdventure(storage, 9_000)
    expect(again?.saveVersion).toBe(3)
    expect(again?.settings.font).toBe(115)
    expect(again?.settings.battery).toBe(true)
    expect(again?.settings.swipeTabs).toBe(true)
    expect(again?.settings.haptics).toBe(true)
    expect(again?.gold).toBe(4321)
  })

  it('catches up with the offline sim after a battery pause and leaves the clock alone while paused', () => {
    const save = beginAdventure('Ada', 'A', 'm01', 1_000)
    save.settings.battery = true
    save.lastSeenAt = 10_000
    const hiddenFor = 60_000
    const now = save.lastSeenAt + hiddenFor
    expect(batteryPause(true, 'hidden')).toBe(true)
    expect(batteryPause(true, 'locked')).toBe(true)
    expect(batteryPause(true, 'visible')).toBe(false)
    expect(batteryPause(false, 'hidden')).toBe(false)
    expect(stampWhilePaused(save.lastSeenAt, now, true)).toBe(10_000)
    expect(stampWhilePaused(save.lastSeenAt, now, false)).toBe(now)

    const gap = resumeGap(now, save.lastSeenAt)
    expect(gap).toBe(hiddenFor)
    expect(shouldCatchUp(gap)).toBe(true)
    expect(shouldCatchUp(BASE_ENCOUNTER_MS - 1)).toBe(false)
    const before = save.stats.wins
    const { summary, countedMs } = simulateOffline(save, gap, now)
    expect(countedMs).toBe(hiddenFor)
    expect(summary.encounters).toBe(offlineEncounterCount(hiddenFor))
    expect(summary.encounters).toBeGreaterThan(0)
    expect(save.lastSeenAt).toBe(now)
    expect(save.stats.wins).toBeGreaterThanOrEqual(before)
    expect(save.gold).toBeGreaterThan(0)
  })

  it('scales type to 100, 115 and 130 percent without leaving the safe area', () => {
    expect(fontScale(100)).toBe(100)
    expect(fontScale(115)).toBe(115)
    expect(fontScale('130')).toBe(130)
    expect(fontScale(90)).toBe(100)
    expect(fontScale(140)).toBe(100)
    expect(fontFactor(100)).toBe(1)
    expect(fontFactor(115)).toBeCloseTo(1.15)
    expect(fontFactor(130)).toBeCloseTo(1.3)
    for (const scale of FONT_SCALES) {
      expect(hudBlock(scale)).toBeLessThanOrEqual(headerRow(scale))
      expect(tabBlock(scale)).toBeLessThanOrEqual(180)
      expect(logBlock(scale)).toBeLessThanOrEqual(logRow(scale))
      expect(battleRemainder(scale)).toBeGreaterThan(640)
    }
    expect(hudBlock(130)).toBeGreaterThan(hudBlock(100))
    expect(headerRow(130)).toBeGreaterThan(headerRow(100))

    const save = beginAdventure('Ada', 'A', 'm01', 1_000)
    save.settings.font = 130
    const html = gameHtml(save, 'options', 1_000, pcQuery, dex, null, false, false, null)
    expect(html).toContain('data-font="130"')
    expect(html).toContain('style="--font-scale:1.3"')
    expect(html).toContain('data-act="font" data-size="100"')
    expect(html).toContain('data-act="font" data-size="115"')
    expect(html).toContain('data-act="font" data-size="130"')
    expect(html).toContain('data-field="swipe"')
    expect(html).toContain('data-field="haptic"')
    expect(html).toContain('data-field="battery"')
    const team = html.split('id="team-grid"')[1] ?? ''
    expect(team).not.toContain('data-press="card"')
    const roster = gameHtml(save, 'team', 1_000, pcQuery, dex, null, false, false, null)
    const grid = roster.split('id="team-grid"')[1]?.split('id="pc-viewport"')[0] ?? ''
    expect(grid).toContain('data-press="card"')
    expect((grid.match(/data-press="card"/g) ?? []).length).toBe(1)

    const css = readFileSync(new URL('./adventure.css', import.meta.url), 'utf8')
    expect(css).toContain('--font-scale')
    expect(css).toMatch(/#stage\s*\{[^}]*overflow:\s*hidden/)
    expect(css).toContain('minmax(96px, calc(96px * var(--font-scale, 1)))')
    expect(css).toContain('max(132px, calc(16px + 34px * var(--font-scale, 1) * 3))')
    expect(css).toContain('-webkit-line-clamp: 2')
  })

  it('swipes between tabs only when asked, opens a held team card, and pulses unlock and crest', () => {
    expect(nextTab('team', swipeDirection(-SWIPE_MIN, 8, 1), true)).toBe('codex')
    expect(nextTab('team', swipeDirection(SWIPE_MIN, 8, 1), true)).toBe('adventure')
    expect(nextTab('adventure', swipeDirection(SWIPE_MIN, 0, 1), true)).toBeNull()
    expect(nextTab('guide', swipeDirection(-SWIPE_MIN, 0, 1), true)).toBeNull()
    expect(nextTab('team', swipeDirection(-SWIPE_MIN, 8, 1), false)).toBeNull()
    expect(swipeDirection(-(SWIPE_MIN - 1), 0, 1)).toBe(0)
    expect(swipeDirection(-SWIPE_MIN, SWIPE_MIN, 1)).toBe(0)
    expect(swipeDirection(-40, 0, 0.5)).toBe(1)

    expect(longPressCard(0, LONG_PRESS_MS)).toBe(true)
    expect(longPressCard(LONG_PRESS_SLOP, LONG_PRESS_MS)).toBe(true)
    expect(longPressCard(LONG_PRESS_SLOP + 1, LONG_PRESS_MS + 200)).toBe(false)
    expect(longPressCard(0, LONG_PRESS_MS - 1)).toBe(false)

    const heard: unknown[] = []
    expect(requestHaptic('unlock', true, (pattern) => { heard.push(pattern); return true })).toBe(true)
    expect(heard).toEqual([hapticPattern('unlock')])
    expect(hapticPattern('unlock')).toBe(22)
    expect(hapticPattern('crest')).toEqual([18, 40, 28])
    expect(requestHaptic('crest', false, () => true)).toBe(false)
    expect(requestHaptic('unlock', true, () => { throw new Error('missing') })).toBe(false)

    expect(BATTERY_FPS).toBe(30)
    expect(FRAME_MS).toBeCloseTo(1000 / 30)
    expect(paintDue(10, 0, false)).toBe(true)
    expect(paintDue(10, 0, true)).toBe(false)
    expect(paintDue(FRAME_MS, 0, true)).toBe(true)
  })
})
