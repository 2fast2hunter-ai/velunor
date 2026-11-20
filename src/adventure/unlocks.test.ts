import { describe, expect, it, beforeEach } from 'vitest'
import { beginAdventure } from './save'
import { t } from './i18n'
import { WRITE_CRESTS } from './chat'
import { CREST_NEED as GUILD_CRESTS } from './guild'
import { ACCOUNT_AGE_MS, CREST_NEED as TRADE_CRESTS } from './trade'
import { WHEEL_WAPPEN } from './wheel'
import { normalizeOnboarding } from './onboarding'
import { gameHtml, type CodexQuery, type PcQuery } from './view'
import {
  HINT_GAP_MS,
  UNLOCK_PLAY_MS,
  anyNew,
  arenaNeed,
  clearNew,
  dueUnlockHint,
  dismissUnlockHint,
  isNew,
  ladder,
  noteUnlocks,
  pathUnlocked,
  resetUnlockHint
} from './unlocks'

const look = { skin: 0, hair: 0, color: 0 }
const pc: PcQuery = { q: '', type: '', rarity: '', shiny: '', sort: 'newest', dir: -1 }
const dex: CodexQuery = { q: '', type: '', rarity: '', shiny: '' }

describe('unlock path', () => {
  beforeEach(() => resetUnlockHint())

  it('reads the crest gates from the same functions the game uses', () => {
    const save = beginAdventure('Ada', look, 'm01', 1_000)
    const rows = Object.fromEntries(ladder(save).map((row) => [row.id, row]))
    const arena = arenaNeed()
    expect(rows.wheel.vars.n).toBe(WHEEL_WAPPEN)
    expect(rows.chat.vars.n).toBe(WRITE_CRESTS)
    expect(rows.arena.vars).toEqual({ crests: arena.crests, register: arena.register })
    expect(rows.found.vars.n).toBe(GUILD_CRESTS)
    expect(rows.trade.vars).toEqual({ crests: TRADE_CRESTS, days: ACCOUNT_AGE_MS / (24 * 60 * 60 * 1000) })
    expect(arena).toEqual({ crests: 5, register: 6 })
    expect(GUILD_CRESTS).toBe(8)
    expect(TRADE_CRESTS).toBe(8)
    const html = gameHtml(save, 'adventure', 1_000, pc, dex, null, false, false, null, save.step, { tab: 'hort', mult: 1, symbols: null, note: '' }, { moreOpen: true })
    expect(html).toContain('lock-chip')
    expect(html).toContain(t('de', 'unlock.arena', rows.arena.vars))
    expect(html).toContain(t('de', 'unlock.crests', { n: WHEEL_WAPPEN }))
    expect(html).not.toContain('unlock-popup')
  })

  it('opens the card after 15 minutes or the first crest, and the new dot clears on open', () => {
    const save = beginAdventure('Ada', look, 'm01', 1_000)
    expect(pathUnlocked(save)).toBe(false)
    save.onboarding!.playMs = UNLOCK_PLAY_MS
    expect(pathUnlocked(save)).toBe(true)
    expect(noteUnlocks(save)).toEqual([])
    save.badges = ['Kieselwappen', 'Wellenwappen', 'Funkenwappen']
    expect(noteUnlocks(save)).toEqual(expect.arrayContaining(['wheel', 'chat']))
    expect(isNew(save, 'wheel')).toBe(true)
    expect(anyNew(save)).toBe(true)
    clearNew(save, 'wheel')
    expect(isNew(save, 'wheel')).toBe(false)
    const aged = normalizeOnboarding({ v: 1, done: true, seen: [], sent: [], hintsOff: false, lastHintAt: 0 }, true, ['Kieselwappen'], 4)
    expect(aged.playMs).toBe(0)
  })

  it('shows one hint at a time, waits 90s, and stays quiet in a focus fight', () => {
    const save = beginAdventure('Ada', look, 'm01', 1_000)
    save.onboarding!.playMs = UNLOCK_PLAY_MS
    const now = 10_000
    const first = dueUnlockHint(save, now, false)
    expect(first?.id).toBe('sys:friends')
    expect(dueUnlockHint(save, now + 1_000, true)).toBeNull()
    expect(dueUnlockHint(save, now + 1_000, false)?.id).toBe('sys:friends')
    dismissUnlockHint(save, 'sys:friends', now + 1_000)
    expect(dueUnlockHint(save, now + 2_000, false)).toBeNull()
    expect(dueUnlockHint(save, now + 1_000 + HINT_GAP_MS, false)?.id).toBe('sys:guild')
    save.onboarding!.hintsOff = true
    resetUnlockHint()
    expect(dueUnlockHint(save, now + 1_000 + HINT_GAP_MS, false)).toBeNull()
  })
})
