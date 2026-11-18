import { bindAuthStorage } from '../cloud/supabaseApi'
import { hydrateStore, webStore, type Kv, type ShellStorage } from './storage'
import { setLineUp } from './line'

export interface ShellHandle {
  storage: ShellStorage
  native: boolean
  listen(hooks: {
    onPause: () => void
    onResume: () => void
    onBack: () => void
    onLine: (up: boolean) => void
  }): void
}

function memoryStore(): ShellStorage {
  const box = new Map<string, string>()
  return webStore({
    getItem: (key) => box.get(key) ?? null,
    setItem: (key, value) => { box.set(key, value) },
    removeItem: (key) => { box.delete(key) }
  })
}

/** Preferences when the Capacitor bridge is present, otherwise localStorage. */
export async function prepareShell(): Promise<ShellHandle> {
  try {
    const core = await import('@capacitor/core')
    if (!core.Capacitor.isNativePlatform()) return webHandle()
    const { Preferences } = await import('@capacitor/preferences')
    const kv: Kv = {
      async get(key) {
        return (await Preferences.get({ key })).value
      },
      async set(key, value) {
        await Preferences.set({ key, value })
      },
      async remove(key) {
        await Preferences.remove({ key })
      },
      async keys() {
        return (await Preferences.keys()).keys
      }
    }
    const local = typeof localStorage === 'undefined' ? null : localStorage
    const storage = await hydrateStore(kv, local)
    bindAuthStorage(storage)
    return {
      storage,
      native: true,
      listen(hooks) {
        void bindNative(hooks)
      }
    }
  } catch {
    return webHandle()
  }
}

function webHandle(): ShellHandle {
  const local = typeof localStorage === 'undefined' ? null : localStorage
  return {
    storage: local ? webStore(local) : memoryStore(),
    native: false,
    listen() {}
  }
}

async function bindNative(hooks: {
  onPause: () => void
  onResume: () => void
  onBack: () => void
  onLine: (up: boolean) => void
}): Promise<void> {
  const { App } = await import('@capacitor/app')
  const { Network } = await import('@capacitor/network')
  const status = await Network.getStatus()
  setLineUp(status.connected)
  hooks.onLine(status.connected)
  await Network.addListener('networkStatusChange', (next) => {
    setLineUp(next.connected)
    hooks.onLine(next.connected)
  })
  await App.addListener('pause', () => hooks.onPause())
  await App.addListener('resume', () => hooks.onResume())
  await App.addListener('backButton', () => hooks.onBack())
}

export async function exitApp(): Promise<void> {
  try {
    const core = await import('@capacitor/core')
    if (!core.Capacitor.isNativePlatform()) return
    const { App } = await import('@capacitor/app')
    await App.exitApp()
  } catch {
    /* The web build has no native bridge. */
  }
}
