import type { StorageLike } from '../types'

/** Async key-value store. Preferences on the phone, unused on the web. */
export interface Kv {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
  keys(): Promise<string[]>
}

export interface ShellStorage extends StorageLike {
  flush(): Promise<void>
}

const SAVE_KEYS = ['velunor_v2', 'velunor_v2_backup']

function isKept(key: string): boolean {
  return SAVE_KEYS.includes(key) || key.startsWith('sb-')
}

/** Synchronous cache over an async store. Writes update the cache immediately and the store in the background. */
export function cacheStore(kv: Kv, seed: Record<string, string> = {}): ShellStorage {
  const box = new Map(Object.entries(seed))
  const pending: Promise<void>[] = []
  const tails = new Map<string, Promise<void>>()
  const track = (job: Promise<void>) => {
    pending.push(job)
    void job.finally(() => {
      const index = pending.indexOf(job)
      if (index >= 0) pending.splice(index, 1)
    })
  }
  const enqueue = (key: string, job: () => Promise<void>) => {
    const prev = tails.get(key) ?? Promise.resolve()
    const next = prev.then(job, job)
    tails.set(key, next)
    track(next)
  }
  return {
    getItem(key) {
      return box.has(key) ? box.get(key) ?? null : null
    },
    setItem(key, value) {
      box.set(key, value)
      enqueue(key, () => kv.set(key, value))
    },
    removeItem(key) {
      box.delete(key)
      enqueue(key, () => kv.remove(key))
    },
    async flush() {
      await Promise.all(pending)
    }
  }
}

/** Copy the save and the Supabase session from localStorage when Preferences is still empty. */
export async function hydrateStore(kv: Kv, local: StorageLike | null): Promise<ShellStorage> {
  const seed: Record<string, string> = {}
  for (const key of await kv.keys()) {
    const value = await kv.get(key)
    if (value != null) seed[key] = value
  }
  if (local && seed.velunor_v2 == null) {
    const names: string[] = []
    const browser = local as StorageLike & { length?: number, key?: (index: number) => string | null }
    if (typeof browser.length === 'number' && typeof browser.key === 'function') {
      for (let i = 0; i < browser.length; i++) {
        const key = browser.key(i)
        if (key) names.push(key)
      }
    }
    for (const key of names.filter(isKept)) {
      const value = local.getItem(key)
      if (value == null) continue
      seed[key] = value
      await kv.set(key, value)
    }
  }
  return cacheStore(kv, seed)
}

/** Web fallback: the browser store itself, with a no-op flush. */
export function webStore(local: StorageLike): ShellStorage {
  return {
    getItem: (key) => local.getItem(key),
    setItem: (key, value) => local.setItem(key, value),
    removeItem: (key) => local.removeItem(key),
    async flush() {}
  }
}
