import { SAVE_BACKUP, SAVE_KEY_V1, SAVE_KEY_V2 } from './const'
import { REPLACE_SERVER_KEY, RESET_SERVER_KEY } from './cloud/config'
import type { StorageLike } from './types'

/** Set before the file is removed. The next boot skips a legacy import. */
export const RESET_FLAG = 'velunor_v2_reset'

const SAVE_FILES = [SAVE_KEY_V2, SAVE_BACKUP, SAVE_KEY_V1] as const

let blocked = false

/** True from the moment a reset is confirmed until the page reloads. */
export function savesBlocked(): boolean {
  return blocked
}

/** Call before clearing timers and files, so a handler that slips through does not write. */
export function blockSaves(): void {
  blocked = true
}

/**
 * Stop every later write, then drop the local files.
 * The reset and server flags stay. The account session (`sb-`) stays too:
 * the next sync deletes the server row through the existing save delete
 * and must not download it again.
 */
export function applyLocalReset(storage: StorageLike): void {
  blocked = true
  storage.setItem(RESET_FLAG, '1')
  storage.setItem(RESET_SERVER_KEY, '1')
  storage.removeItem(REPLACE_SERVER_KEY)
  for (const key of SAVE_FILES) storage.removeItem(key)
}
