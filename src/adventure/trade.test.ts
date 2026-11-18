import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { beginAdventure, makeMon, takeId } from './save'
import { gameHtml, type CodexQuery, type PcQuery } from './view'
import {
  CONFIRM_MS,
  DAY_LIMIT,
  LIFE_CAP,
  ONE_WAY_LIMIT,
  TRADE_LOCK_MS,
  accountReason,
  confirmTrade,
  counterTrade,
  emptyDesk,
  flagOneWay,
  lockTrade,
  monsterReason,
  openTrade,
  pairReason,
  receivedLevel,
  type TradeAccount,
  type TradeDesk,
  type TradeMon
} from './trade'

const pc: PcQuery = { q: '', type: '', rarity: '', shiny: '', sort: 'newest', dir: -1 }
const dex: CodexQuery = { q: '', type: '', rarity: '', shiny: '' }
const now = Date.parse('2026-11-18T12:00:00Z')

function account(id: string, extra: Partial<TradeAccount> = {}): TradeAccount {
  return { id, createdAt: now - 8 * 24 * 60 * 60 * 1000, crests: 8, flag: 0, banned: false, email: true, teamMax: 20, ...extra }
}

function mon(owner: string, uid: string, extra: Partial<TradeMon> = {}): TradeMon {
  return {
    owner, uid, species: uid, rarity: 3, shiny: false, level: 12, how: 'Truhe',
    obtainedAt: now - TRADE_LOCK_MS - 1000, tradeCount: 0, inTeam: false, ...extra
  }
}

function desk(): TradeDesk {
  const board = emptyDesk()
  board.accounts.a = account('a')
  board.accounts.b = account('b')
  board.friends.push({ a: 'a', b: 'b', since: now - 49 * 60 * 60 * 1000 })
  board.mons.push(mon('a', 'a1'), mon('b', 'b1', { rarity: 4 }))
  return board
}

describe('monster trades', () => {
  it('checks every lock on its own', () => {
    expect(accountReason(account('a', { createdAt: now - 1000 }), now)).toBe('age')
    expect(accountReason(account('a', { crests: 7 }), now)).toBe('crests')
    expect(accountReason(account('a', { flag: 1 }), now)).toBe('flag')
    expect(accountReason(account('a', { flag: 2 }), now)).toBe('flag')
    expect(accountReason(account('a', { banned: true }), now)).toBe('flag')
    expect(accountReason(account('a', { email: false }), now)).toBe('email')
    expect(monsterReason(mon('a', 'a1', { how: 'Truhe', obtainedAt: now - 1000 }), now)).toBe('fresh')
    expect(monsterReason(mon('a', 'a1', { how: 'Ei', obtainedAt: now - 1000 }), now)).toBe('fresh')
    expect(monsterReason(mon('a', 'a1', { how: 'Splitter', obtainedAt: now - 1000 }), now)).toBe('fresh')
    expect(monsterReason(mon('a', 'a1', { how: 'Tausch', obtainedAt: now - 1000 }), now)).toBe('traded')
    expect(monsterReason(mon('a', 'a1', { tradeCount: LIFE_CAP }), now)).toBe('life')
    expect(monsterReason(mon('a', 'a1', { rarity: 8 }), now)).toBe('rarity')
    expect(monsterReason(mon('a', 'a1', { rarity: 9 }), now)).toBe('rarity')
    expect(monsterReason(mon('a', 'a1', { rarity: 7, tradeCount: 1 }), now)).toBe('rarity7')
    expect(monsterReason(mon('a', 'a1', { inTeam: true }), now)).toBe('team')
    expect(pairReason(mon('a', 'a1', { rarity: 3 }), mon('b', 'b1', { rarity: 5 }))).toBe('gap')
    expect(pairReason(mon('a', 'a1', { shiny: true }), mon('b', 'b1'))).toBe('shiny')
    expect(receivedLevel(40, 20)).toBe(25)
    expect(receivedLevel(10, 20)).toBe(10)
    const young = desk()
    young.friends[0].since = now - 60 * 60 * 1000
    expect(openTrade(young, 'a', 'b', 'a1', 'b1', now)).toBe('friend')
  })

  it('rolls back a crash, ignores a second confirm, and blocks a second offer', () => {
    const board = desk()
    expect(openTrade(board, 'a', 'b', 'a1', 'b1', now)).toBe('ok')
    const offer = board.offers[0]
    expect(lockTrade(board, offer.id, 'b', now)).toBe('ok')
    expect(confirmTrade(board, offer.id, 'a', now + 1000)).toBe('wait')
    expect(confirmTrade(board, offer.id, 'a', now + CONFIRM_MS)).toBe('ok')
    const before = board.mons.map((row) => ({ ...row }))
    expect(() => confirmTrade(board, offer.id, 'b', now + CONFIRM_MS, true)).toThrow(/abort/)
    expect(board.mons.map((row) => row.uid)).toEqual(before.map((row) => row.uid))
    expect(board.trades).toHaveLength(0)
    expect(confirmTrade(board, offer.id, 'b', now + CONFIRM_MS)).toBe('done')
    expect(confirmTrade(board, offer.id, 'b', now + CONFIRM_MS)).toBe('done')
    expect(board.trades).toHaveLength(1)
    expect(board.mons.find((row) => row.species === 'a1')?.owner).toBe('b')
    expect(board.mons.find((row) => row.species === 'b1')?.owner).toBe('a')
    expect(board.mons.find((row) => row.owner === 'a')?.level).toBe(12)
    expect(board.mons.every((row) => row.how === 'Tausch')).toBe(true)
    const again = desk()
    expect(openTrade(again, 'a', 'b', 'a1', 'b1', now)).toBe('ok')
    expect(openTrade(again, 'a', 'b', 'a1', 'b1', now)).toBe('escrow')
    expect(again.offers).toHaveLength(1)
  })

  it('stops at three trades a day and flags the fourth one-way transfer', () => {
    const board = desk()
    for (let i = 0; i < DAY_LIMIT; i++) board.trades.push({
      offerId: `old-${i}`, host: 'a', guest: 'b', hostRarity: 3, guestRarity: 3, oneWayTo: null, at: now
    })
    expect(openTrade(board, 'a', 'b', 'a1', 'b1', now)).toBe('day')
    const review = emptyDesk()
    for (let i = 0; i < ONE_WAY_LIMIT + 1; i++) review.trades.push({
      offerId: `way-${i}`, host: 'a', guest: 'b', hostRarity: 6, guestRarity: 3, oneWayTo: 'b', at: now - i * 1000
    })
    expect(flagOneWay(review, 'a', 'b', now)).toBe(true)
    expect(review.flags.a).toBe(1)
    expect(review.flags.b).toBe(1)
    expect(review.banned.a).toBe(true)
    const blocked = desk()
    blocked.flags.a = 1
    expect(openTrade(blocked, 'a', 'b', 'a1', 'b1', now)).toBe('flag')
  })

  it('shows two cards, the lock, and a traded codex mark without an email address', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', now)
    const uid = takeId(save)
    save.mons[uid] = makeMon('m02', 8, now, 'tausch')
    save.pc.push(uid)
    save.dex.m02 = { seen: 1, caught: 1 }
    const html = gameHtml(save, 'trade', now, pc, dex, null, false, false, null, 1, undefined, {
      trade: {
        status: 'ready',
        note: '',
        mine: { uid: 'a1', name: 'Funkfuchs', rarity: 3, shiny: false, level: 12, reason: '' },
        theirs: { uid: 'b1', name: 'Tropfmolch', rarity: 4, shiny: false, level: 9, reason: 'frisch aus einer Truhe' },
        lockMs: 4000,
        phase: 'locked'
      }
    })
    expect(html).toContain('trade-card')
    expect(html).toContain('data-art="trade/lock"')
    expect(html).toContain('frisch aus einer Truhe')
    expect(html).toContain('trade-escrow')
    const dexHtml = gameHtml(save, 'codex', now, pc, dex, null, false, false, null)
    expect(dexHtml).toContain('data-art="codex/traded"')
    const linked = gameHtml(save, 'options', now, pc, dex, null, false, false, null, 1, undefined, {
      cloud: { status: 'online', consent: 'yes', email: 'ada@example.com', notice: '', askConsent: false, conflict: null }
    })
    expect(linked).not.toContain('ada@example.com')
    expect(linked).toContain('verknüpft')
  })

  it('keeps the trade log immutable and the codex board on own chests and shards', () => {
    const sql = readFileSync(new URL('../../supabase/migrations/20261118240000_schritt12_trade.sql', import.meta.url), 'utf8')
    expect(sql).toContain('trades are immutable')
    expect(sql).toContain('before update or delete')
    expect(sql).toContain("obtained_how in ('Truhe', 'Splitter')")
    expect(sql).toContain("interval '5 seconds'")
    expect(sql).toContain("interval '48 hours'")
    expect(sql).toContain("interval '7 days'")
    expect(counterTrade(desk(), 'missing', 'b', 'b1', now)).toBe('missing')
  })
})
