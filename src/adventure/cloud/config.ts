/**
 * Live Supabase project (Frankfurt). The publishable key is meant for the client.
 * The service key must never be added to this repo.
 * A test build can point elsewhere with VITE_SUPABASE_URL and VITE_SUPABASE_KEY.
 * Both must be set, or neither. An empty value keeps this project.
 */
export const LIVE_SUPABASE_URL = 'https://psbouhfgvsygadihwtdk.supabase.co'
export const LIVE_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_HSKBENtyF_1BAZbYwjsdEQ_KZVRVLFG'

export function resolveSupabase(url: string | undefined, key: string | undefined): { url: string, key: string } {
  const nextUrl = (url ?? '').trim()
  const nextKey = (key ?? '').trim()
  if (!nextUrl && !nextKey) return { url: LIVE_SUPABASE_URL, key: LIVE_SUPABASE_PUBLISHABLE_KEY }
  if (!nextUrl || !nextKey) throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_KEY must both be set, or neither.')
  if (!nextUrl.startsWith('https://')) throw new Error('VITE_SUPABASE_URL must start with https://')
  return { url: nextUrl, key: nextKey }
}

const resolved = resolveSupabase(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY)
export const SUPABASE_URL = resolved.url
export const SUPABASE_PUBLISHABLE_KEY = resolved.key

export const APP_VERSION = '0.1.0'

/** Sync on start, on this interval, on pause/close, and before an online action. */
export const SYNC_MS = 5 * 60 * 1000
/** Analytics leave the device in a batch on this interval and on pause. */
export const FLUSH_MS = 60 * 1000
/** Offline analytics queue. The oldest events are dropped past this. */
export const QUEUE_MAX = 500

export const DEVICE_KEY = 'velunor_device_id'
export const CONSENT_KEY = 'velunor_consent'
export const QUEUE_KEY = 'velunor_event_queue'
/** Set by reset until the server row for this account is deleted. */
export const RESET_SERVER_KEY = 'velunor_reset_server'
/** Set when the player starts a new game, so the next sync uploads it. */
export const REPLACE_SERVER_KEY = 'velunor_force_upload'
