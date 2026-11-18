/**
 * Public Supabase project (Frankfurt). The publishable key is meant for the client.
 * The service key must never be added to this repo.
 */
export const SUPABASE_URL = 'https://psbouhfgvsygadihwtdk.supabase.co'
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_HSKBENtyF_1BAZbYwjsdEQ_KZVRVLFG'

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
