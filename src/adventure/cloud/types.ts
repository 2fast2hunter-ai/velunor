import type { SaveV2 } from '../types'
import type { AnalyticsEvent, Consent } from './analytics'
import type { DevicePreview } from './conflict'
import type { ProgressScore } from './progress'

export type CloudStatus = 'offline' | 'online' | 'sync'
export type SyncReason = 'start' | 'interval' | 'pause' | 'online'

export type CloudNotice =
  | ''
  | 'offline'
  | 'sent'
  | 'email-bad'
  | 'link-fail'
  | 'auth-off'
  | 'write-fail'
  | 'unreadable'

export interface CloudView {
  status: CloudStatus
  consent: Consent
  email: string
  notice: CloudNotice
  askConsent: boolean
  conflict: { local: DevicePreview; remote: DevicePreview } | null
  /** 2 locks trade, arena, ranks and guild contributions. Single player stays open. */
  flagLevel?: 0 | 1 | 2
  playerLabel?: string
  nameError?: string
  nameOpen?: boolean
  reportOpen?: boolean
  deleteStep?: 0 | 1 | 2
  onlineDown?: boolean
}

export interface CloudApi {
  ensureUser(): Promise<{ userId: string | null; email: string | null; disabled: boolean; error: string | null }>
  linkEmail(email: string, redirectTo: string): Promise<{ error: string | null }>
  readSave(userId: string): Promise<{ ok: true; row: { save: unknown; deviceId: string | null } | null } | { ok: false; error: string }>
  writeSave(userId: string, save: SaveV2, progress: ProgressScore, deviceId: string): Promise<{ error: string | null }>
  deleteSave(userId: string): Promise<{ error: string | null }>
  writeEvents(userId: string, events: AnalyticsEvent[]): Promise<{ error: string | null }>
  /** Missing when the function is not deployed yet. The local game keeps going. */
  syncCheck?(snapshot: import('../online/check').AuditState): Promise<{ flag: 0 | 1 | 2; missing: boolean }>
}

export interface CloudPorts {
  now(): number
  online(): boolean
  deviceId(): string
  consent(): Consent
  setConsent(value: Consent): void
  queue(): AnalyticsEvent[]
  setQueue(events: AnalyticsEvent[]): void
  loadSave(): SaveV2 | null
  storeSave(save: SaveV2): void
  redirectTo(): string
  pendingReset(): boolean
  clearReset(): void
  pendingReplace(): boolean
  clearReplace(): void
  onView(view: CloudView): void
}
