import type { SaveData } from './types'

export const SAVE_KEY = 'velunor.save.v1'
export const LEGACY_KEYS = ['mstadt.save.v1']
export const LEGACY_BACKUP_KEY = 'velunor.save.legacy'
export const LEGACY_BACKUP_DAYS = 14

export interface SaveStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface SaveMigrationDeps {
  createSave(now: number): SaveData
  migrate(save: SaveData, now: number): SaveData
}

export const migrationEvents: string[] = []

function track(event: string): void {
  migrationEvents.push(event)
}

function readSave(storage: SaveStorage, key: string): { raw: string; save: SaveData } | null {
  const raw = storage.getItem(key)
  if (raw === null) return null
  try {
    const save = JSON.parse(raw) as SaveData
    return typeof save?.version === 'number' ? { raw, save } : null
  } catch {
    return null
  }
}

function writeVerified(storage: SaveStorage, key: string, save: SaveData): boolean {
  try {
    const raw = JSON.stringify(save)
    storage.setItem(key, raw)
    return storage.getItem(key) === raw
  } catch {
    return false
  }
}

function moveToBackup(storage: SaveStorage, legacyKey: string, raw: string): void {
  try {
    if (storage.getItem(LEGACY_BACKUP_KEY) === null) storage.setItem(LEGACY_BACKUP_KEY, raw)
    storage.removeItem(legacyKey)
  } catch {
    /* backup is optional */
  }
}

/** Key migration first, then the caller's data migration. Idempotent. */
export function loadOrMigrateSave(storage: SaveStorage, now: number, deps: SaveMigrationDeps): SaveData {
  const current = readSave(storage, SAVE_KEY)
  if (current) {
    for (const key of LEGACY_KEYS) {
      const legacyRaw = storage.getItem(key)
      if (legacyRaw !== null && readSave(storage, key)) moveToBackup(storage, key, legacyRaw)
    }
    const save = deps.migrate(current.save, now)
    if (save.meta?.migratedAt && now - save.meta.migratedAt > LEGACY_BACKUP_DAYS * 86400e3) {
      storage.removeItem(LEGACY_BACKUP_KEY)
    }
    return save
  }
  for (const key of LEGACY_KEYS) {
    const legacy = readSave(storage, key)
    if (!legacy) {
      if (storage.getItem(key) !== null) track('save_migration_corrupt')
      continue
    }
    const save = deps.migrate(legacy.save, now)
    save.meta = { ...(save.meta ?? { migratedFrom: null, migratedAt: 0 }), migratedFrom: key, migratedAt: now }
    if (writeVerified(storage, SAVE_KEY, save)) moveToBackup(storage, key, legacy.raw)
    else track('save_migration_failed')
    return save
  }
  const fresh = deps.createSave(now)
  writeVerified(storage, SAVE_KEY, fresh)
  return fresh
}
