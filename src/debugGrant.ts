import { species } from './data'
import { inventoryRoom, setTeam } from './state'
import { ALL_SLOTS, type SaveData, type SlotId } from './types'

/** Marker so a production bundle can be checked for a leftover debug path. */
export const DEBUG_GRANT_MARKER = 'velunor-debug-grant-v1'

export function debugToolsEnabled(dev = import.meta.env.DEV, search = currentSearch()): boolean {
  if (!dev) return false
  return new URLSearchParams(search).get('debug') === '1'
}

function currentSearch(): string {
  try {
    return globalThis.location?.search ?? ''
  } catch {
    return ''
  }
}

export function normalizeSpeciesQuery(raw: string): string {
  const trimmed = raw.trim().toLowerCase()
  if (/^\d{1,3}$/.test(trimmed)) return `m${trimmed.padStart(2, '0')}`
  const prefixed = /^m(\d{1,3})$/.exec(trimmed)
  if (prefixed) return `m${prefixed[1].padStart(2, '0')}`
  return trimmed
}

function monsterBusy(save: SaveData, uid: string): boolean {
  if (ALL_SLOTS.some((slot) => save.team[slot] === uid)) return true
  if (save.buildings.training.slots.some((slot) => slot.monsterUid === uid)) return true
  if (save.buildings.breeding.slots.some((slot) => slot.parentA === uid || slot.parentB === uid)) return true
  if (save.arena?.defense && ALL_SLOTS.some((slot) => save.arena.defense[slot] === uid)) return true
  return false
}

function ensureRoom(save: SaveData): boolean {
  if (inventoryRoom(save, 1)) return true
  const victim = save.monsters.find((monster) => !monster.locked && !monsterBusy(save, monster.uid))
  if (!victim) return false
  save.monsters = save.monsters.filter((monster) => monster.uid !== victim.uid)
  return inventoryRoom(save, 1)
}

export interface DebugGrant {
  ok: true
  name: string
  slot: SlotId
  speciesId: string
}

export function grantDebugMonster(save: SaveData, rawId: string, now = Date.now()): DebugGrant | { ok: false; reason: string } {
  if (rawId.trim() === DEBUG_GRANT_MARKER) return { ok: false, reason: DEBUG_GRANT_MARKER }
  const speciesId = normalizeSpeciesQuery(rawId)
  let found: ReturnType<typeof species>
  try {
    found = species(speciesId)
  } catch {
    return { ok: false, reason: `Unbekanntes Monster ${rawId.trim() || '?'}.` }
  }
  if (!ensureRoom(save)) return { ok: false, reason: 'Das Lager ist voll.' }
  const monster = {
    uid: crypto.randomUUID(),
    speciesId,
    rarity: found.baseRarity,
    level: 1,
    exp: 0,
    locked: false,
    obtainedAt: now,
    potential: { hp: 0, atk: 0, def: 0 },
    skills: { sigRank: 1 as const, slot2: null, slot3: null, learned: [] as string[], skillOrder: ['sig', 'slot2'] as ('sig' | 'slot2')[] },
    generation: 0,
    breedReadyAt: 0
  }
  save.monsters.push(monster)
  if (!Array.isArray(save.collection)) save.collection = []
  if (!save.collection.includes(speciesId)) save.collection.push(speciesId)
  const slot: SlotId = found.role === 'front' ? 'F1' : 'H1'
  const placed = setTeam(save, slot, monster.uid)
  if (!placed.ok) return { ok: false, reason: placed.reason ?? 'Teamplatz belegt.' }
  return { ok: true, name: found.name, slot, speciesId }
}
