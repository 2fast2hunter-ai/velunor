import { describe, expect, it } from 'vitest'
import { backEffect } from './back'
import { backoffMs, withBackoff } from './backoff'
import { blockOnline, lineUp, setLineUp } from './line'
import { hydrateStore, webStore, type Kv } from './storage'
import { gameHtml, type CodexQuery, type PcQuery } from '../view'
import { beginAdventure } from '../save'

const pc: PcQuery = { q: '', type: '', rarity: '', shiny: '', sort: 'newest', dir: -1 }
const dex: CodexQuery = { q: '', type: '', rarity: '', shiny: '' }

function memoryKv(seed: Record<string, string> = {}): Kv & { box: Map<string, string> } {
  const box = new Map(Object.entries(seed))
  return {
    box,
    async get(key) { return box.get(key) ?? null },
    async set(key, value) { box.set(key, value) },
    async remove(key) { box.delete(key) },
    async keys() { return [...box.keys()] }
  }
}

function browserLike(seed: Record<string, string> = {}) {
  const box = new Map(Object.entries(seed))
  const keys = () => [...box.keys()]
  return {
    box,
    getItem: (key: string) => box.get(key) ?? null,
    setItem: (key: string, value: string) => { box.set(key, value) },
    removeItem: (key: string) => { box.delete(key) },
    get length() { return box.size },
    key: (index: number) => keys()[index] ?? null
  }
}

describe('app shell', () => {
  it('closes sheets before it asks to leave', () => {
    expect(backEffect({ overlay: true, more: true, filters: true, dex: true, map: true, side: true })).toBe('close-overlay')
    expect(backEffect({ overlay: false, more: true, filters: true, dex: false, map: false, side: false })).toBe('close-more')
    expect(backEffect({ overlay: false, more: false, filters: true, dex: true, map: true, side: true })).toBe('close-filters')
    expect(backEffect({ overlay: false, more: false, filters: false, dex: true, map: true, side: false })).toBe('close-dex')
    expect(backEffect({ overlay: false, more: false, filters: false, dex: false, map: true, side: true })).toBe('close-map')
    expect(backEffect({ overlay: false, more: false, filters: false, dex: false, map: false, side: true })).toBe('close-side')
    expect(backEffect({ overlay: false, more: false, filters: false, dex: false, map: false, side: false })).toBe('ask-quit')
  })

  it('waits longer between network retries and stops at the cap', async () => {
    expect(backoffMs(0)).toBe(400)
    expect(backoffMs(1)).toBe(800)
    expect(backoffMs(2)).toBe(1600)
    expect(backoffMs(8)).toBe(8_000)
    const delays: number[] = []
    let tries = 0
    const result = await withBackoff(async () => {
      tries += 1
      return tries < 3 ? { missing: true } : { missing: false }
    }, {
      attempts: 4,
      retryable: (row) => row.missing,
      sleep: async (ms) => { delays.push(ms) },
      base: 100,
      cap: 150
    })
    expect(result.missing).toBe(false)
    expect(tries).toBe(3)
    expect(delays).toEqual([100, 150])
  })

  it('keeps the save in the preference cache and copies it out of localStorage once', async () => {
    const kv = memoryKv()
    const local = browserLike({ velunor_v2: '{"v":2}', 'sb-session': 'token', other: 'no' })
    const store = await hydrateStore(kv, local)
    expect(store.getItem('velunor_v2')).toBe('{"v":2}')
    expect(store.getItem('sb-session')).toBe('token')
    expect(store.getItem('other')).toBeNull()
    expect(kv.box.get('velunor_v2')).toBe('{"v":2}')
    store.setItem('velunor_v2', '{"v":2,"gold":1}')
    await store.flush()
    expect(kv.box.get('velunor_v2')).toBe('{"v":2,"gold":1}')
    const again = await hydrateStore(kv, browserLike({ velunor_v2: '{"v":2,"gold":9}' }))
    expect(again.getItem('velunor_v2')).toBe('{"v":2,"gold":1}')
    const web = webStore(browserLike({ velunor_v2: 'web' }))
    expect(web.getItem('velunor_v2')).toBe('web')
    await web.flush()
  })

  it('shows the offline card for online areas and leaves the road alone', () => {
    setLineUp(false)
    expect(lineUp()).toBe(false)
    expect(blockOnline('arena')).toBe(true)
    expect(blockOnline('trade')).toBe(true)
    expect(blockOnline('guild')).toBe(true)
    expect(blockOnline('chat')).toBe(true)
    expect(blockOnline('ranks')).toBe(true)
    expect(blockOnline('social')).toBe(true)
    expect(blockOnline('sync')).toBe(true)
    setLineUp(true)
    expect(blockOnline('arena')).toBe(false)
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    const arena = gameHtml(save, 'arena', 1_000, pc, dex, null, false, false, null)
    const trade = gameHtml(save, 'trade', 1_000, pc, dex, null, false, false, null)
    const guild = gameHtml(save, 'guild', 1_000, pc, dex, null, false, false, null)
    const chat = gameHtml(save, 'chat', 1_000, pc, dex, null, false, false, null)
    const ranks = gameHtml(save, 'ranks', 1_000, pc, dex, null, false, false, null)
    const social = gameHtml(save, 'social', 1_000, pc, dex, null, false, false, null)
    expect(arena).toContain('Die Arena braucht ein Konto und eine Verbindung')
    expect(trade).toContain('Der Tausch braucht eine Verbindung')
    expect(guild).toContain('Die Gilde braucht eine Verbindung')
    expect(chat).toContain('Der Chat braucht eine Verbindung')
    expect(ranks).toContain('Ranglisten brauchen ein Konto und eine Verbindung')
    expect(social).toContain('Die Freundesliste und das Weltenbiest brauchen eine Verbindung')
    const road = gameHtml(save, 'adventure', 1_000, pc, dex, null, false, false, null)
    expect(road).toContain('data-screen="adventure"')
    expect(road).not.toContain('braucht eine Verbindung')
  })
})
