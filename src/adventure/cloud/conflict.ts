import { SAVE_KEY_V2 } from '../const'
import { loadAdventure } from '../save'
import type { SaveV2, StorageLike } from '../types'
import { compareProgress, progressOf } from './progress'

export interface DevicePreview {
  crests: number
  codex: number
  ep: number
  gold: number
  region: number
  chapter: number
  step: number
}

export interface RemoteSide {
  save: SaveV2
  deviceId: string | null
}

export type SyncDecision =
  | { type: 'keep'; reason: 'empty' | 'same' }
  | { type: 'upload'; reason: 'empty-remote' | 'local-ahead' | 'same-device' | 'replace' }
  | { type: 'download'; reason: 'local-empty' | 'remote-ahead' }
  | { type: 'choose'; local: DevicePreview; remote: DevicePreview }

export function previewOf(save: SaveV2): DevicePreview {
  const progress = progressOf(save)
  return {
    crests: progress.crests,
    codex: progress.codex,
    ep: progress.ep,
    gold: Math.max(0, Math.floor(save.gold) || 0),
    region: Math.floor(save.region) || 1,
    chapter: Math.floor(save.chapter) || 1,
    step: Math.floor(save.step) || 1
  }
}

function pairs(value: Record<string, number> | undefined): [string, number][] {
  return Object.entries(value ?? {})
    .map(([key, amount]) => [key, Math.floor(Number(amount)) || 0] as [string, number])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
}

/** Gameplay fields only. Clock, log, rng and settings do not make a second device. */
export function saveFingerprint(save: SaveV2): string {
  const mons = Object.entries(save.mons ?? {})
    .map(([id, mon]) => ({
      id,
      species: mon?.species ?? '',
      lvl: mon?.lvl ?? 0,
      exp: mon?.exp ?? 0,
      shiny: Boolean(mon?.shiny)
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return JSON.stringify({
    started: Boolean(save.started),
    badges: [...save.badges].sort(),
    dex: save.dex,
    mons,
    gold: save.gold,
    marks: save.marks,
    shards: pairs(save.shards),
    stars: pairs(save.stars),
    region: save.region,
    chapter: save.chapter,
    step: save.step,
    dust: save.dust,
    chests: save.chests,
    council: [...(save.councilBeaten ?? [])].sort(),
    bag: save.bag
  })
}

/**
 * Higher progress wins: crests, then codex, then total EP.
 * A tie on two devices with different gameplay is a real conflict.
 * The same device keeps its local file. A new game (`replace`) uploads.
 */
export function decideSync(local: SaveV2 | null, remote: RemoteSide | null, deviceId: string, replace = false): SyncDecision {
  const localOn = Boolean(local?.started)
  const remoteOn = Boolean(remote?.save.started)
  if (replace && localOn && local) return { type: 'upload', reason: 'replace' }
  if (!localOn && !remoteOn) return { type: 'keep', reason: 'empty' }
  if (!remoteOn && local) return { type: 'upload', reason: 'empty-remote' }
  if (!localOn && remote) return { type: 'download', reason: 'local-empty' }
  if (!local || !remote) return { type: 'keep', reason: 'empty' }
  const cmp = compareProgress(progressOf(local), progressOf(remote.save))
  if (cmp > 0) return { type: 'upload', reason: 'local-ahead' }
  if (cmp < 0) return { type: 'download', reason: 'remote-ahead' }
  if (saveFingerprint(local) === saveFingerprint(remote.save)) return { type: 'keep', reason: 'same' }
  if (remote.deviceId && remote.deviceId === deviceId) return { type: 'upload', reason: 'same-device' }
  return { type: 'choose', local: previewOf(local), remote: previewOf(remote.save) }
}

export function saveFromUnknown(raw: unknown, now: number): SaveV2 | null {
  if (!raw || typeof raw !== 'object') return null
  let text = ''
  try {
    text = JSON.stringify(raw)
  } catch {
    return null
  }
  const storage: StorageLike = {
    getItem(key) {
      return key === SAVE_KEY_V2 ? text : null
    },
    setItem() {},
    removeItem() {}
  }
  try {
    return loadAdventure(storage, now)
  } catch {
    return null
  }
}

export function syncDue(lastAt: number, now: number, reason: 'start' | 'interval' | 'pause' | 'online'): boolean {
  if (reason === 'interval') return now - lastAt >= 5 * 60 * 1000
  return true
}
