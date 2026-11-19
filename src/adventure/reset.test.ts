import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { REPLACE_SERVER_KEY, RESET_SERVER_KEY } from './cloud/config'
import { SAVE_BACKUP, SAVE_KEY_V1, SAVE_KEY_V2 } from './const'
import { applyLocalReset, blockSaves, RESET_FLAG, savesBlocked } from './reset'
import { cacheStore } from './shell/storage'
import type { StorageLike } from './types'

function memory(): StorageLike {
  const box = new Map<string, string>()
  return {
    getItem: (key) => box.get(key) ?? null,
    setItem: (key, value) => { box.set(key, value) },
    removeItem: (key) => { box.delete(key) }
  }
}

describe('save reset', () => {
  it('blocks the reload write that used to put the old file back', () => {
    const storage = memory()
    storage.setItem(SAVE_KEY_V2, '{"v":2,"name":"Ada","gold":3560}')
    storage.setItem(SAVE_BACKUP, '{"v":2,"name":"Ada"}')
    storage.setItem(SAVE_KEY_V1, '{"name":"Ada"}')
    storage.setItem(REPLACE_SERVER_KEY, '1')
    storage.setItem('sb-auth-token', 'keep')
    const pagehide = () => {
      if (savesBlocked()) return
      storage.setItem(SAVE_KEY_V2, '{"v":2,"name":"Ada","gold":3560}')
    }
    blockSaves()
    applyLocalReset(storage)
    pagehide()
    expect(storage.getItem(SAVE_KEY_V2)).toBeNull()
    expect(storage.getItem(SAVE_BACKUP)).toBeNull()
    expect(storage.getItem(SAVE_KEY_V1)).toBeNull()
    expect(storage.getItem(REPLACE_SERVER_KEY)).toBeNull()
    expect(storage.getItem(RESET_FLAG)).toBe('1')
    expect(storage.getItem(RESET_SERVER_KEY)).toBe('1')
    expect(storage.getItem('sb-auth-token')).toBe('keep')
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8')
    const hide = app.slice(app.indexOf("addEventListener('pagehide'"))
    expect(hide.indexOf('if (savesBlocked()) return')).toBeGreaterThan(-1)
    expect(hide.indexOf('if (savesBlocked()) return')).toBeLessThan(hide.indexOf('writeSave(gameStore, save)'))
    expect(app).toContain('blockSaves()')
    expect(app).toContain('blockSaveWrites()')
  })

  it('keeps a slow phone write from restoring a save that was just removed', async () => {
    let release = () => {}
    const gate = new Promise<void>((resolve) => { release = resolve })
    const disk = new Map<string, string>()
    const store = cacheStore({
      async get(key) { return disk.get(key) ?? null },
      async set(key, value) {
        await gate
        disk.set(key, value)
      },
      async remove(key) { disk.delete(key) },
      async keys() { return [...disk.keys()] }
    })
    store.setItem(SAVE_KEY_V2, 'old')
    store.removeItem(SAVE_KEY_V2)
    release()
    await store.flush()
    expect(disk.has(SAVE_KEY_V2)).toBe(false)
    expect(store.getItem(SAVE_KEY_V2)).toBeNull()
  })
})
