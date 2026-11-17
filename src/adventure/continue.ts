import { species } from '../data'
import { SAVE_BACKUP, SAVE_KEY_V2 } from './const'
import { chapterById, regionById } from './route'
import { loadAdventure } from './save'
import type { SaveV2, StorageLike } from './types'

export type Door = 'continue' | 'ask' | 'create' | 'play' | 'broken'

export interface SaveGate {
  kind: 'empty' | 'ready' | 'broken'
  save: SaveV2 | null
  backup: boolean
}

export interface ContinueFacts {
  name: string
  gold: number
  region: string
  chapter: string
  step: number
  lead: string
  leadLevel: number
  team: number
  strongest: string
  strongestLevel: number
  agoMs: number
}

/** Where the front door goes. Cancel always returns to the existing save. */
export function nextDoor(door: Door, action: 'open-ready' | 'open-empty' | 'open-broken' | 'resume' | 'new' | 'cancel' | 'confirm' | 'restore'): Door {
  if (action === 'open-ready') return 'continue'
  if (action === 'open-empty') return 'create'
  if (action === 'open-broken') return 'broken'
  if (door === 'continue' && action === 'resume') return 'play'
  if (door === 'continue' && action === 'new') return 'ask'
  if (door === 'ask' && action === 'cancel') return 'continue'
  if (door === 'ask' && action === 'confirm') return 'create'
  if (door === 'broken' && action === 'new') return 'create'
  if (door === 'broken' && action === 'restore') return 'continue'
  return door
}

/** Continue uses the loaded save itself. It does not build a new one. */
export function resumeSave(save: SaveV2): SaveV2 {
  return save
}

export function inspectSave(storage: StorageLike, now: number): SaveGate {
  const raw = storage.getItem(SAVE_KEY_V2)
  const backup = backupReadable(storage.getItem(SAVE_BACKUP))
  if (!raw) return { kind: 'empty', save: null, backup }
  const loaded = loadAdventure(storage, now)
  if (!loaded) return { kind: 'broken', save: null, backup }
  if (!loaded.started) return { kind: 'empty', save: loaded, backup }
  return { kind: 'ready', save: loaded, backup }
}

export function continueFacts(save: SaveV2, now: number): ContinueFacts {
  const region = regionById(save.region)
  const chapter = chapterById(save.region, save.chapter)
  const members = save.team.map((uid) => save.mons[uid]).filter(Boolean)
  const leadId = save.active && save.mons[save.active] ? save.active : save.team[0]
  const lead = leadId ? save.mons[leadId] : members[0]
  const strongest = members.reduce((best, mon) => (mon.lvl > best.lvl ? mon : best), members[0] ?? lead)
  const named = (mon: { species: string; lvl: number } | undefined) => {
    if (!mon) return { name: '—', lvl: 0 }
    try { return { name: species(mon.species).name, lvl: mon.lvl } } catch { return { name: mon.species, lvl: mon.lvl } }
  }
  const leadInfo = named(lead)
  const bestInfo = named(strongest)
  return {
    name: save.name,
    gold: save.gold,
    region: region.name,
    chapter: chapter.name,
    step: save.step,
    lead: leadInfo.name,
    leadLevel: leadInfo.lvl,
    team: save.team.length,
    strongest: bestInfo.name,
    strongestLevel: bestInfo.lvl,
    agoMs: Math.max(0, now - (save.lastSeenAt || now))
  }
}

export function agoParts(ms: number): { unit: 'now' | 'min' | 'hour' | 'day'; n: number } {
  const minutes = Math.floor(Math.max(0, ms) / 60000)
  if (minutes < 1) return { unit: 'now', n: 0 }
  if (minutes < 60) return { unit: 'min', n: minutes }
  const hours = Math.floor(minutes / 60)
  if (hours < 48) return { unit: 'hour', n: hours }
  return { unit: 'day', n: Math.floor(hours / 24) }
}

function backupReadable(raw: string | null): boolean {
  if (!raw) return false
  try {
    const data = JSON.parse(raw) as { v?: number }
    return Boolean(data && typeof data === 'object' && data.v === 2)
  } catch {
    return false
  }
}
