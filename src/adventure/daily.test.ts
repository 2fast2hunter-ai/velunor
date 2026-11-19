import { describe, expect, it } from 'vitest'
import { SAVE_VERSION } from './const'
import { auditSync } from './online/check'
import { auditFromSave } from './online/snapshot'
import { beginAdventure, loadAdventure, writeSave } from './save'
import { gameHtml, type CodexQuery, type PcQuery } from './view'
import type { StorageLike } from './types'
import {
  DAILY_FRAMES,
  DAILY_GOLD_CAP,
  DAILY_MARK_CAP,
  localDayKey,
  noteDaily,
  slotReward,
  touchDaily
} from './daily'

const pc: PcQuery = { q: '', type: '', rarity: '', shiny: '', sort: 'newest', dir: -1 }
const dex: CodexQuery = { q: '', type: '', rarity: '', shiny: '' }
const zone = 'Europe/Berlin'

function memory(): StorageLike {
  const box = new Map<string, string>()
  return {
    getItem: (key) => box.get(key) ?? null,
    setItem: (key, value) => { box.set(key, value) },
    removeItem: (key) => { box.delete(key) }
  }
}

describe('daily tasks and the calendar', () => {
  it('flips at 04:00 local time and differs by zone', () => {
    const before = new Date('2026-11-18T02:59:00Z')
    const after = new Date('2026-11-18T03:00:00Z')
    expect(localDayKey(before, 'Europe/Berlin')).toBe('2026-11-17')
    expect(localDayKey(after, 'Europe/Berlin')).toBe('2026-11-18')
    expect(localDayKey(after, 'America/New_York')).toBe('2026-11-17')
    expect(localDayKey(after, 'Pacific/Auckland')).toBe('2026-11-18')
    expect(slotReward(0).marks + slotReward(1).marks + slotReward(2).marks).toBe(DAILY_MARK_CAP)
    expect(slotReward(0).gold + slotReward(1).gold + slotReward(2).gold + 500).toBe(DAILY_GOLD_CAP)
  })

  it('does not pay twice when the clock is turned back', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    const noon = new Date('2026-11-18T11:00:00Z')
    touchDaily(save, noon, zone)
    save.daily!.tasks = [
      { kind: 'chest', need: 3, have: 0, claimed: false },
      { kind: 'shard', need: 20, have: 0, claimed: false },
      { kind: 'trainer', need: 1, have: 0, claimed: false }
    ]
    const marks = save.marks
    const gold = save.gold
    const count = save.daily?.count
    const tasks = save.daily?.tasks.map((task) => task.kind)
    noteDaily(save, 'chest', 3)
    const paid = save.marks
    expect(paid).toBe(marks + 4)
    touchDaily(save, new Date('2026-11-18T08:00:00Z'), zone)
    touchDaily(save, new Date('2026-11-17T11:00:00Z'), zone)
    expect(save.daily?.count).toBe(count)
    expect(save.daily?.key).toBe('2026-11-18')
    expect(save.marks).toBe(paid)
    expect(save.gold).toBe(gold + slotReward(0).gold)
    expect(save.daily?.tasks.map((task) => task.kind)).toEqual(tasks)
    noteDaily(save, 'chest', 3)
    expect(save.marks).toBe(paid)
  })

  it('counts one play day when several days were missed', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    touchDaily(save, new Date('2026-11-18T11:00:00Z'), zone)
    expect(save.daily?.credited).toBe(1)
    expect(save.daily?.gold).toBe(300)
    touchDaily(save, new Date('2026-11-23T11:00:00Z'), zone)
    expect(save.daily?.count).toBe(2)
    expect(save.daily?.credited).toBe(2)
    expect(save.daily?.key).toBe('2026-11-23')
    expect(save.bag.fruits.spuer).toBe(1)
  })

  it('gives the frame on day 7 and starts the next cosmetic', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    let day = Date.parse('2026-11-18T11:00:00Z')
    for (let i = 0; i < 7; i++) {
      touchDaily(save, new Date(day), zone)
      day += 24 * 60 * 60 * 1000
    }
    expect(save.daily?.credited).toBe(7)
    expect(save.daily?.frames).toEqual(['daily-dawn'])
    touchDaily(save, new Date(day), zone)
    expect(save.daily?.credited).toBe(1)
    expect(save.daily?.cycle).toBe(1)
    for (let i = 0; i < 6; i++) {
      day += 24 * 60 * 60 * 1000
      touchDaily(save, new Date(day), zone)
    }
    expect(save.daily?.frames).toEqual(['daily-dawn', 'daily-tide'])
    expect(DAILY_FRAMES).toHaveLength(4)
  })

  it('caps task marks at one Berlin day in sync-check', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', Date.parse('2026-11-18T12:00:00Z'))
    touchDaily(save, new Date('2026-11-18T11:00:00Z'), zone)
    save.daily!.tasks = [
      { kind: 'trainer', need: 1, have: 0, claimed: false },
      { kind: 'warden', need: 1, have: 0, claimed: false },
      { kind: 'coop', need: 1, have: 0, claimed: false }
    ]
    const before = auditFromSave(save)
    noteDaily(save, 'trainer', 1)
    noteDaily(save, 'warden', 1)
    noteDaily(save, 'coop', 1)
    const after = auditFromSave(save)
    const once = auditSync(before, after, 60_000, 0, Date.parse('2026-11-18T12:00:00Z'))
    expect(once.flag).toBe(0)
    expect(once.reasons).not.toContain('daily')
    expect(save.daily?.marks).toBe(DAILY_MARK_CAP)
    const again = beginAdventure('Bea', { skin: 0, hair: 0, color: 0 }, 'm01', Date.parse('2026-11-18T12:00:00Z'))
    again.daily = { ...save.daily!, marks: save.daily!.marks + DAILY_MARK_CAP, gold: save.daily!.gold }
    const doubled = auditSync(after, auditFromSave(again), 60_000, 0, Date.parse('2026-11-18T12:30:00Z'))
    expect(doubled.reasons).toContain('daily')
  })

  it('keeps an older save and shows the board', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    const box = memory()
    writeSave(box, save)
    const raw = JSON.parse(box.getItem('velunor_v2') ?? '{}') as { saveVersion: number, daily?: unknown, gold: number }
    raw.saveVersion = 10
    delete raw.daily
    box.setItem('velunor_v2', JSON.stringify(raw))
    const loaded = loadAdventure(box, 5_000)
    expect(loaded?.saveVersion).toBe(SAVE_VERSION)
    expect(SAVE_VERSION).toBe(12)
    expect(loaded?.gold).toBe(raw.gold)
    expect(loaded?.daily?.key).toBe('')
    expect(loaded?.daily?.tasks).toEqual([])
    touchDaily(loaded!, new Date('2026-11-18T11:00:00Z'), zone)
    const html = gameHtml(loaded!, 'activities', 1_000, pc, dex, null, false, false, null)
    expect(html).toContain('data-art="daily/board"')
    for (const id of DAILY_FRAMES) expect(html).toContain(`data-art="daily/frame-${id.slice('daily-'.length)}"`)
    expect(html).toContain('Tagesaufgaben')
    expect(html.match(/<li class="daily-task/g)?.length).toBe(3)
  })
})
