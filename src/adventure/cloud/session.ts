import { acceptEvent, capQueue, enqueue, eventsToSend, validEmail, type AnalyticsEvent, type Consent } from './analytics'
import { decideSync, previewOf, saveFromUnknown, syncDue } from './conflict'
import { APP_VERSION, SYNC_MS } from './config'
import { mayUploadSave } from '../online/check'
import { auditFromSave } from '../online/snapshot'
import { progressOf } from './progress'
import type { CloudApi, CloudNotice, CloudPorts, CloudStatus, CloudView, SyncReason } from './types'

export interface CloudController {
  start(): Promise<void>
  sync(reason: SyncReason): Promise<void>
  /** Stops the interval. A wiped session must not upload again. */
  stop(): void
  pause(): Promise<void>
  flush(): Promise<void>
  track(event: string, props: Record<string, unknown>): void
  setConsent(value: Exclude<Consent, 'unset'>): void
  choose(which: 'A' | 'B'): Promise<void>
  linkEmail(email: string): Promise<void>
  markOffline(): void
  noteSession(offlineMinutes: number): void
  view(): CloudView
}

/**
 * Offline-first account sync. The local save is never dropped for a network error.
 * A higher progress score wins. Equal progress on two devices asks the player.
 */
export function createCloud(api: CloudApi, ports: CloudPorts): CloudController {
  let status: CloudStatus = ports.online() ? 'online' : 'offline'
  let email = ''
  let notice: CloudNotice = ''
  let userId: string | null = null
  let lastSync = 0
  let syncTimer: ReturnType<typeof setTimeout> | null = null
  let lastFlush = ports.now()
  let holding: { local: NonNullable<ReturnType<CloudPorts['loadSave']>>; remote: NonNullable<ReturnType<CloudPorts['loadSave']>> } | null = null
  let pending: Promise<void> | null = null
  let again: SyncReason | null = null
  let flagLevel: 0 | 1 | 2 | null = null
  let sessionSent = false
  let sessionProps: Record<string, string | number> | null = null
  let sending = false

  function view(): CloudView {
    const consent = ports.consent()
    return {
      status: ports.online() ? status : 'offline',
      consent,
      email,
      notice,
      askConsent: consent === 'unset',
      conflict: holding ? { local: previewOf(holding.local), remote: previewOf(holding.remote) } : null,
      ...(flagLevel == null ? {} : { flagLevel })
    }
  }

  function emit(): void {
    if (!ports.online() && status !== 'offline') status = 'offline'
    ports.onView(view())
  }

  function setNotice(next: CloudNotice): void {
    notice = next
  }

  async function send(batch: AnalyticsEvent[]): Promise<void> {
    if (sending || !batch.length || ports.consent() !== 'yes' || !ports.online() || !userId) return
    sending = true
    const rest = ports.queue().filter((event) => !batch.includes(event))
    ports.setQueue(rest)
    try {
      const result = await api.writeEvents(userId, batch)
      if (result.error) {
        ports.setQueue(capQueue(batch.concat(ports.queue())))
        return
      }
      lastFlush = ports.now()
    } finally {
      sending = false
    }
  }

  async function flush(force: boolean): Promise<void> {
    if (ports.consent() !== 'yes') {
      if (ports.consent() === 'no' && ports.queue().length) ports.setQueue([])
      return
    }
    const plan = eventsToSend(ports.queue(), ports.now(), lastFlush, force)
    if (!plan.send.length) return
    await send(plan.send)
  }

  function track(event: string, props: Record<string, unknown>): void {
    const accepted = acceptEvent(event, props, ports.consent())
    if (!accepted) return
    ports.setQueue(enqueue(ports.queue(), accepted))
    const plan = eventsToSend(ports.queue(), ports.now(), lastFlush, false)
    if (plan.send.length) void send(plan.send)
  }

  function trySession(): void {
    if (sessionSent || !sessionProps || ports.consent() !== 'yes') return
    sessionSent = true
    track('session_start', sessionProps)
  }

  async function noteFlag(local: NonNullable<ReturnType<CloudPorts['loadSave']>>): Promise<void> {
    if (!api.syncCheck) return
    try {
      const verdict = await api.syncCheck(auditFromSave(local))
      if (!verdict.missing) flagLevel = verdict.flag
    } catch {
      /* A missing function must not stop the local save. */
    }
  }

  function clearSyncTimer(): void {
    if (syncTimer != null) clearTimeout(syncTimer)
    syncTimer = null
  }

  /**
   * The next upload is 5 minutes after the last successful one.
   * A fixed interval started at boot fires just before that mark and then waits another 5 minutes.
   */
  function armSync(): void {
    clearSyncTimer()
    const now = ports.now()
    let wait = SYNC_MS
    if (lastSync > 0) {
      const remain = SYNC_MS - (now - lastSync)
      wait = remain > 0 ? remain : SYNC_MS
    }
    const handle = setTimeout(() => {
      syncTimer = null
      void request('interval').finally(() => armSync())
    }, wait)
    if (typeof handle === 'object' && handle && 'unref' in handle) handle.unref()
    syncTimer = handle
  }

  function markSynced(): void {
    lastSync = ports.now()
    armSync()
  }

  async function run(reason: SyncReason): Promise<void> {
    if (!ports.online()) {
      status = 'offline'
      if (reason === 'online') setNotice('offline')
      emit()
      return
    }
    if (reason === 'interval' && !syncDue(lastSync, ports.now(), 'interval')) {
      await flush(false)
      return
    }
    if (holding && reason !== 'online') {
      await flush(reason === 'pause')
      return
    }
    if (!mayUploadSave(Boolean(ports.deferUpload?.()))) {
      status = 'online'
      emit()
      return
    }
    status = 'sync'
    emit()
    const auth = await api.ensureUser()
    if (!auth.userId) {
      status = 'offline'
      setNotice(auth.disabled ? 'auth-off' : '')
      emit()
      await flush(reason === 'pause')
      return
    }
    userId = auth.userId
    email = auth.email ?? ''
    if (ports.pendingReset()) {
      // The account stays. deleteSave is the existing row delete, not a new function.
      // Stop here: a later read would download the old cloud save, and loadSave can
      // still hold the game that was in memory when the player confirmed the reset.
      const deleted = await api.deleteSave(userId)
      if (deleted.error) {
        status = 'online'
        setNotice('write-fail')
        emit()
        return
      }
      ports.clearReset()
      status = 'online'
      if (notice === 'write-fail') setNotice('')
      emit()
      await flush(reason === 'pause')
      return
    }
    const local = ports.loadSave()
    const replace = ports.pendingReplace()
    if (replace && local?.started) {
      const wrote = await api.writeSave(userId, local, progressOf(local), ports.deviceId())
      status = 'online'
      if (wrote.error) setNotice('write-fail')
      else {
        ports.clearReplace()
        markSynced()
        if (notice === 'write-fail') setNotice('')
        await noteFlag(local)
      }
      emit()
      await flush(reason === 'pause')
      return
    }
    const read = await api.readSave(userId)
    if (!read.ok) {
      status = 'offline'
      emit()
      return
    }
    let remote = null as ReturnType<typeof saveFromUnknown>
    if (read.row?.save) {
      remote = saveFromUnknown(read.row.save, ports.now())
      if (!remote) {
        status = 'online'
        setNotice('unreadable')
        emit()
        await flush(reason === 'pause')
        return
      }
    }
    const decision = decideSync(local, remote ? { save: remote, deviceId: read.row?.deviceId ?? null } : null, ports.deviceId(), replace)
    let synced = true
    if (decision.type === 'upload' && local) {
      const wrote = await api.writeSave(userId, local, progressOf(local), ports.deviceId())
      if (wrote.error) {
        setNotice('write-fail')
        synced = false
      } else {
        if (notice === 'write-fail' || notice === 'offline') setNotice('')
        await noteFlag(local)
      }
    } else if (decision.type === 'download' && remote) {
      ports.storeSave(remote)
      if (notice === 'write-fail' || notice === 'offline') setNotice('')
    } else if (decision.type === 'choose' && local && remote) {
      holding = { local, remote }
      status = 'online'
      emit()
      return
    }
    if (synced) markSynced()
    status = 'online'
    emit()
    await flush(reason === 'pause')
  }

  function request(reason: SyncReason): Promise<void> {
    if (pending) {
      again = reason
      return pending
    }
    pending = run(reason)
      .catch(() => {
        status = ports.online() ? 'online' : 'offline'
        emit()
      })
      .finally(() => {
        pending = null
        const follow = again
        again = null
        if (follow) void request(follow)
      })
    return pending
  }

  armSync()

  return {
    start: () => request('start'),
    sync: (reason) => request(reason),
    stop: () => clearSyncTimer(),
    pause: () => request('pause'),
    flush: () => flush(false),
    track,
    setConsent(value) {
      ports.setConsent(value)
      if (value !== 'yes') ports.setQueue([])
      trySession()
      emit()
    },
    async choose(which) {
      if (!holding || !userId) return
      const picked = holding
      status = 'sync'
      emit()
      if (which === 'A') {
        const wrote = await api.writeSave(userId, picked.local, progressOf(picked.local), ports.deviceId())
        if (wrote.error) {
          status = 'online'
          setNotice('write-fail')
          emit()
          return
        }
      } else {
        ports.storeSave(picked.remote)
      }
      holding = null
      markSynced()
      status = 'online'
      if (notice === 'write-fail') setNotice('')
      emit()
    },
    async linkEmail(raw) {
      const emailText = raw.trim()
      if (!ports.online()) {
        setNotice('offline')
        emit()
        return
      }
      await request('online')
      if (!ports.online() || !userId) {
        setNotice(notice === 'auth-off' ? 'auth-off' : 'offline')
        emit()
        return
      }
      if (!validEmail(emailText)) {
        setNotice('email-bad')
        emit()
        return
      }
      const linked = await api.linkEmail(emailText, ports.redirectTo())
      setNotice(linked.error ? 'link-fail' : 'sent')
      emit()
    },
    markOffline() {
      status = 'offline'
      emit()
    },
    noteSession(offlineMinutes) {
      const minutes = Math.max(0, Math.min(24 * 60 * 400, Math.floor(offlineMinutes) || 0))
      sessionProps = { app_version: APP_VERSION, platform: 'web', offline_minutes: minutes }
      trySession()
    },
    view
  }
}
