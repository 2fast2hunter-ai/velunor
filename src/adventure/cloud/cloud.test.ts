import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { beginAdventure } from '../save'
import { cloudLayerHtml, gameHtml, type CodexQuery, type PcQuery } from '../view'
import {
  EVENT_NAMES,
  acceptEvent,
  anonymousDisabled,
  enqueue,
  eventsToSend,
  sanitizeProps,
  validEmail,
  type AnalyticsEvent,
  type Consent
} from './analytics'
import { FLUSH_MS, QUEUE_MAX, SYNC_MS } from './config'
import { decideSync, syncDue } from './conflict'
import { eventsForEncounter, eventsForLoot, starEvent, unlockEvent } from './playEvents'
import { compareProgress, progressOf } from './progress'
import { createCloud } from './session'
import type { CloudApi, CloudPorts, CloudView } from './types'
import type { SaveV2 } from '../types'

const look = { skin: 0, hair: 0, color: 0 }

function game(name: string, now = 1_000): SaveV2 {
  return beginAdventure(name, look, 'm01', now)
}

describe('progress order', () => {
  it('ranks crests, then codex, then total EP', () => {
    const low = game('A')
    const highEp = game('B')
    const lead = highEp.team[0]
    highEp.mons[lead].exp = 50_000
    expect(compareProgress(progressOf(low), progressOf(highEp))).toBe(-1)

    low.badges = ['Kieselwappen', 'Wellenwappen']
    expect(compareProgress(progressOf(low), progressOf(highEp))).toBe(1)

    const sameCrests = game('C')
    sameCrests.badges = ['Kieselwappen']
    highEp.badges = ['Kieselwappen']
    sameCrests.dex.m02 = { seen: 1, caught: 1 }
    expect(progressOf(sameCrests).codex).toBeGreaterThan(progressOf(highEp).codex)
    expect(compareProgress(progressOf(sameCrests), progressOf(highEp))).toBe(1)

    const fewerEp = game('D')
    const moreEp = game('E')
    moreEp.mons[moreEp.team[0]].exp = 20
    expect(compareProgress(progressOf(fewerEp), progressOf(moreEp))).toBe(-1)
  })
})

describe('sync decisions', () => {
  it('uploads a local save when the server is empty, and downloads when the device is empty', () => {
    const local = game('Ada')
    expect(decideSync(local, null, 'device-a')).toEqual({ type: 'upload', reason: 'empty-remote' })
    const blank = game('Neu')
    blank.started = false
    expect(decideSync(blank, { save: local, deviceId: 'device-b' }, 'device-a').type).toBe('download')
    expect(decideSync(null, null, 'device-a')).toEqual({ type: 'keep', reason: 'empty' })
  })

  it('lets the higher crest win without asking, even when the other device has more EP', () => {
    const local = game('Ada')
    const remote = game('Bea')
    local.badges = ['Eins', 'Zwei']
    remote.mons[remote.team[0]].exp = 80_000
    expect(decideSync(local, { save: remote, deviceId: 'device-b' }, 'device-a').type).toBe('upload')
    remote.badges = ['Eins', 'Zwei', 'Drei']
    expect(decideSync(local, { save: remote, deviceId: 'device-b' }, 'device-a').type).toBe('download')
  })

  it('asks only for a real two-device tie and keeps the same device local', () => {
    const local = game('Ada')
    const remote = game('Ada')
    remote.gold = local.gold + 25
    const choice = decideSync(local, { save: remote, deviceId: 'device-b' }, 'device-a')
    expect(choice.type).toBe('choose')
    if (choice.type === 'choose') {
      expect(choice.local.crests).toBe(choice.remote.crests)
      expect(choice.local.gold).toBe(local.gold)
      expect(choice.remote.gold).toBe(remote.gold)
    }
    expect(decideSync(local, { save: remote, deviceId: 'device-a' }, 'device-a').type).toBe('upload')
    remote.gold = local.gold
    expect(decideSync(local, { save: remote, deviceId: 'device-b' }, 'device-a')).toEqual({ type: 'keep', reason: 'same' })
  })

  it('uploads a new game even when the server progress is higher', () => {
    const local = game('Neu')
    const remote = game('Alt')
    remote.badges = ['Eins', 'Zwei', 'Drei']
    expect(decideSync(local, { save: remote, deviceId: 'device-b' }, 'device-a', true)).toEqual({ type: 'upload', reason: 'replace' })
  })

  it('syncs on start, pause and online actions, and on a 5 minute interval', () => {
    expect(SYNC_MS).toBe(5 * 60 * 1000)
    expect(syncDue(0, SYNC_MS - 1, 'interval')).toBe(false)
    expect(syncDue(0, SYNC_MS, 'interval')).toBe(true)
    expect(syncDue(1_000, 1_001, 'start')).toBe(true)
    expect(syncDue(1_000, 1_001, 'pause')).toBe(true)
    expect(syncDue(1_000, 1_001, 'online')).toBe(true)
  })
})

describe('consent gating', () => {
  it('drops every event unless consent is yes, and rejects catch, gacha and ad names', () => {
    expect(EVENT_NAMES).toHaveLength(11)
    expect(EVENT_NAMES).toContain('chest_open')
    expect(EVENT_NAMES).not.toContain('lootbox_open')
    expect(EVENT_NAMES).not.toContain('catch_attempt')
    expect(EVENT_NAMES).not.toContain('catch_success')
    expect(acceptEvent('session_start', { app_version: '0.1.0' }, 'unset')).toBeNull()
    expect(acceptEvent('session_start', { app_version: '0.1.0' }, 'no')).toBeNull()
    expect(acceptEvent('catch_attempt', { speciesId: 'm01' }, 'yes')).toBeNull()
    expect(acceptEvent('catch_success', { speciesId: 'm01' }, 'yes')).toBeNull()
    expect(acceptEvent('lootbox_open', { tier: 'kiesel' }, 'yes')).toBeNull()
    expect(acceptEvent('gacha_pull', { tier: 'gold' }, 'yes')).toBeNull()
    expect(acceptEvent('ad_view', { placement: 'shop' }, 'yes')).toBeNull()
    for (const name of EVENT_NAMES) {
      expect(acceptEvent(name, { step: 1 }, 'yes')?.event).toBe(name)
    }
  })

  it('strips emails, names and other personal fields from props', () => {
    expect(sanitizeProps({
      email: 'ada@example.com',
      name: 'Ada',
      player_id: 'abc',
      device_id: 'dev',
      species: 'm01',
      note: 'mail ada@example.com',
      region: 1,
      ok: true
    })).toEqual({ species: 'm01', region: 1, ok: true })
  })

  it('keeps at most 500 events and drops the oldest', () => {
    expect(QUEUE_MAX).toBe(500)
    let queue: AnalyticsEvent[] = []
    for (let i = 0; i < 500; i++) queue = enqueue(queue, { event: 'tab_open', props: { tab: 'adventure', n: i } })
    queue = enqueue(queue, { event: 'tab_open', props: { tab: 'codex', n: 500 } })
    expect(queue).toHaveLength(500)
    expect(queue[0].props.n).toBe(1)
    expect(queue[499].props.n).toBe(500)
  })

  it('holds the batch for 60 seconds and sends it on pause', () => {
    expect(FLUSH_MS).toBe(60_000)
    const queue = [{ event: 'tab_open' as const, props: { tab: 'team' } }]
    expect(eventsToSend(queue, 50_000, 0, false).send).toHaveLength(0)
    expect(eventsToSend(queue, 60_000, 0, false).send).toHaveLength(1)
    expect(eventsToSend(queue, 1_000, 0, true).send).toHaveLength(1)
  })

  it('recognises a disabled anonymous provider', () => {
    expect(anonymousDisabled('Anonymous sign-ins are disabled', 'anonymous_provider_disabled')).toBe(true)
    expect(anonymousDisabled('Failed to fetch')).toBe(false)
    expect(validEmail('ada@example.com')).toBe(true)
    expect(validEmail('ada')).toBe(false)
  })
})

describe('play events', () => {
  it('maps clears, guardian fights, chests, shards and stars without personal fields', () => {
    const clear = eventsForEncounter({
      outcome: { kind: 'wild', step: 4, win: true },
      region: 1,
      chapter: 2,
      teamLevel: 8,
      rarityAvg: 1.5,
      shardsBefore: {},
      shardsAfter: { m03: 1 }
    })
    expect(clear.map((event) => event.event)).toEqual(['stage_clear', 'shard_drop'])
    expect(clear[0].props).toEqual({ region: 1, chapter: 2, node: 4 })
    expect(clear[1].props).toEqual({ speciesId: 'm03', amount: 1, source: 'wild' })

    const fail = eventsForEncounter({
      outcome: { kind: 'trainer', step: 9, win: false },
      region: 2,
      chapter: 1,
      teamLevel: 3,
      rarityAvg: 1,
      shardsBefore: {},
      shardsAfter: {}
    })
    expect(fail).toEqual([{ event: 'stage_fail', props: { region: 2, chapter: 1, node: 9 } }])

    const guard = eventsForEncounter({
      outcome: { kind: 'guardian', step: 20, win: false },
      region: 1,
      chapter: 3,
      teamLevel: 12,
      rarityAvg: 2.5,
      shardsBefore: {},
      shardsAfter: {}
    })
    expect(guard[0]).toEqual({
      event: 'guardian_fail',
      props: { region: 1, chapter: 3, team_level: 12, rarity_avg: 2.5 }
    })
    expect(eventsForEncounter({
      outcome: { kind: 'spring', step: 7, win: true },
      region: 1,
      chapter: 1,
      teamLevel: 1,
      rarityAvg: 1,
      shardsBefore: {},
      shardsAfter: {}
    })).toEqual([])

    const opened = eventsForLoot('kiesel', [
      { speciesId: 'm04', rarity: 2, isNew: false, pityHit: false },
      { speciesId: 'm05', rarity: 4, isNew: true, pityHit: true }
    ], {}, { m04: 3 })
    expect(opened.map((event) => event.event)).toEqual(['chest_open', 'chest_open', 'species_unlock', 'shard_drop'])
    expect(opened[0].props).toEqual({ tier: 'kiesel', rarity: 2, isNew: false, pityHit: false })
    expect(opened[1].props).toEqual({ tier: 'kiesel', rarity: 4, isNew: true, pityHit: true })
    expect(opened[2].props).toEqual({ speciesId: 'm05', via: 'chest' })
    expect(opened[3].props).toEqual({ speciesId: 'm04', amount: 3, source: 'duplicate' })
    expect(eventsForEncounter({
      outcome: { kind: 'wild', step: 1, win: true, unlock: 'm08' },
      region: 1,
      chapter: 1,
      teamLevel: 1,
      rarityAvg: 1,
      shardsBefore: {},
      shardsAfter: {}
    }).map((event) => event.event)).toEqual(['stage_clear', 'species_unlock'])
    expect(unlockEvent('m12', 'workshop')).toEqual({ event: 'species_unlock', props: { speciesId: 'm12', via: 'workshop' } })
    expect(unlockEvent('ada', 'workshop')).toBeNull()
    expect(acceptEvent('species_unlock', { speciesId: 'm12', via: 'workshop' }, 'no')).toBeNull()
    expect(starEvent('m01', 3)).toEqual({ event: 'star_up', props: { species: 'm01', star: 3 } })
    expect(starEvent('ada@example.com', 1)).toBeNull()
    const sql = readFileSync(new URL('../../../supabase/migrations/20261120120000_chest_open_event.sql', import.meta.url), 'utf8')
    expect(sql).toContain('events_event_check')
    expect(sql).toContain("'chest_open'")
    expect(sql).toContain("'lootbox_open'")
    expect(sql).not.toMatch(/update\s+public\.events/i)
  })
})

describe('cloud session', () => {
  function harness(options?: { disabled?: boolean; online?: boolean }) {
    const calls = {
      users: 0,
      writes: 0,
      reads: 0,
      deleted: 0,
      events: [] as AnalyticsEvent[],
      emails: [] as string[]
    }
    let remote: { save: unknown; deviceId: string | null } | null = null
    let current: SaveV2 | null = game('Ada')
    let consent: Consent = 'no'
    let queue: AnalyticsEvent[] = []
    let online = options?.online !== false
    let reset = false
    let replace = false
    let stored: SaveV2 | null = null
    const views: CloudView[] = []
    const api: CloudApi = {
      async ensureUser() {
        calls.users += 1
        if (options?.disabled) return { userId: null, email: null, disabled: true, error: 'Anonymous sign-ins are disabled' }
        return { userId: 'user-1', email: null, disabled: false, error: null }
      },
      async linkEmail(email) {
        calls.emails.push(email)
        return { error: null }
      },
      async readSave() {
        calls.reads += 1
        return { ok: true, row: remote }
      },
      async writeSave(_userId, save, _progress, deviceId) {
        calls.writes += 1
        remote = { save, deviceId }
        return { error: null }
      },
      async deleteSave() {
        calls.deleted += 1
        remote = null
        return { error: null }
      },
      async writeEvents(_userId, events) {
        calls.events.push(...events)
        return { error: null }
      }
    }
    const ports: CloudPorts = {
      now: () => 10_000_000,
      online: () => online,
      deviceId: () => 'device-a',
      consent: () => consent,
      setConsent(value) { consent = value },
      queue: () => queue,
      setQueue(events) { queue = events },
      loadSave: () => current,
      storeSave(save) {
        stored = save
        current = save
      },
      redirectTo: () => 'https://2fast2hunter-ai.github.io/velunor/',
      pendingReset: () => reset,
      clearReset() { reset = false },
      pendingReplace: () => replace,
      clearReplace() { replace = false },
      onView(view) { views.push(view) }
    }
    return {
      cloud: createCloud(api, ports),
      calls,
      views,
      queue: () => queue,
      setRemote(save: SaveV2, deviceId = 'device-b') { remote = { save, deviceId } },
      setCurrent(save: SaveV2 | null) { current = save },
      setConsent(value: Consent) { consent = value },
      setOnline(value: boolean) { online = value },
      setReset(value: boolean) { reset = value },
      setReplace(value: boolean) { replace = value },
      stored: () => stored,
      remoteDevice: () => remote?.deviceId ?? null
    }
  }

  it('uploads the existing local save on the first online start', async () => {
    const box = harness()
    await box.cloud.start()
    expect(box.calls.writes).toBe(1)
    expect(box.remoteDevice()).toBe('device-a')
    expect(box.calls.deleted).toBe(0)
  })

  it('does not send events without consent, and sends them after Ja', async () => {
    const box = harness()
    box.cloud.noteSession(12)
    box.cloud.track('tab_open', { tab: 'team', email: 'ada@example.com' })
    await box.cloud.pause()
    expect(box.calls.events).toEqual([])

    box.setConsent('yes')
    box.cloud.setConsent('yes')
    await box.cloud.pause()
    expect(box.calls.events.map((event) => event.event)).toContain('session_start')
    const session = box.calls.events.find((event) => event.event === 'session_start')
    expect(session?.props).toMatchObject({ app_version: '0.1.0', platform: 'web', offline_minutes: 12 })
    expect(JSON.stringify(box.calls.events)).not.toContain('ada@')
    expect(JSON.stringify(box.calls.events)).not.toContain('email')
  })

  it('shows Gerät A / Gerät B and writes only the chosen side', async () => {
    const box = harness()
    const local = game('Ada')
    const remote = game('Ada')
    remote.gold = local.gold + 40
    box.setCurrent(local)
    box.setRemote(remote, 'device-b')
    await box.cloud.start()
    expect(box.calls.writes).toBe(0)
    const conflict = box.cloud.view().conflict
    expect(conflict?.local.gold).toBe(local.gold)
    expect(conflict?.remote.gold).toBe(remote.gold)
    await box.cloud.choose('A')
    expect(box.calls.writes).toBe(1)
    expect(box.cloud.view().conflict).toBeNull()

    const other = harness()
    other.setCurrent(local)
    other.setRemote(remote, 'device-b')
    await other.cloud.start()
    await other.cloud.choose('B')
    expect(other.calls.writes).toBe(0)
    expect(other.stored()?.gold).toBe(remote.gold)
  })

  it('stays on the local save when anonymous sign-in is disabled or the device is offline', async () => {
    const disabled = harness({ disabled: true })
    await disabled.cloud.start()
    expect(disabled.calls.writes).toBe(0)
    expect(disabled.cloud.view().status).toBe('offline')
    expect(disabled.cloud.view().notice).toBe('auth-off')

    const offline = harness({ online: false })
    await offline.cloud.start()
    expect(offline.calls.users).toBe(0)
    expect(offline.calls.writes).toBe(0)
    expect(offline.cloud.view().status).toBe('offline')
    await offline.cloud.linkEmail('ada@example.com')
    expect(offline.calls.emails).toEqual([])
    expect(offline.cloud.view().notice).toBe('offline')
  })

  it('deletes the server row after a reset and uploads a replacement game', async () => {
    const box = harness()
    box.setRemote(game('Alt'), 'device-b')
    box.setCurrent(null)
    box.setReset(true)
    await box.cloud.start()
    expect(box.calls.deleted).toBe(1)
    expect(box.calls.writes).toBe(0)
    expect(box.calls.reads).toBe(0)
    expect(box.stored()).toBeNull()

    const memory = harness()
    const old = game('Alt')
    old.gold = 3560
    memory.setRemote(old, 'device-a')
    memory.setCurrent(old)
    memory.setReset(true)
    await memory.cloud.start()
    expect(memory.calls.deleted).toBe(1)
    expect(memory.calls.writes).toBe(0)
    expect(memory.calls.reads).toBe(0)
    expect(memory.stored()).toBeNull()

    const replaced = harness()
    const remote = game('Alt')
    remote.badges = ['Eins', 'Zwei']
    replaced.setRemote(remote, 'device-b')
    replaced.setReplace(true)
    await replaced.cloud.start()
    expect(replaced.calls.writes).toBe(1)
    expect(replaced.remoteDevice()).toBe('device-a')
  })
})

describe('account dialogs', () => {
  it('marks only the saved consent answer in Options', () => {
    const save = game('Ada')
    const pc: PcQuery = { q: '', type: '', rarity: '', shiny: '', sort: 'newest', dir: -1 }
    const dex: CodexQuery = { q: '', type: '', rarity: '', shiny: '' }
    const cloud = { status: 'offline' as const, email: '', notice: 'auth-off' as const, askConsent: false, conflict: null }
    const wheel = { tab: 'hort' as const, mult: 1 as const, symbols: null, note: '' }
    const no = gameHtml(save, 'options', 1_000, pc, dex, null, false, false, null, save.step, wheel, { cloud: { ...cloud, consent: 'no' } })
    expect(no).toContain('class="primary" data-act="consent" data-consent="no"')
    expect(no).toContain('class="" data-act="consent" data-consent="yes"')
    const yes = gameHtml(save, 'options', 1_000, pc, dex, null, false, false, null, save.step, wheel, { cloud: { ...cloud, consent: 'yes' } })
    expect(yes).toContain('class="primary" data-act="consent" data-consent="yes"')
    expect(yes).toContain('class="" data-act="consent" data-consent="no"')
    const reset = gameHtml(save, 'options', 1_000, pc, dex, null, false, false, { kind: 'confirm-reset' }, save.step, wheel)
    expect(reset).toContain('class="danger" data-act="reset-yes"')
    expect(reset).toContain('class="ghost" data-act="close"')
    const wipe = cloudLayerHtml({ ...cloud, consent: 'yes', deleteStep: 2 }, 'de')
    expect(wipe).toContain('class="danger" data-act="delete-yes"')
    expect(wipe).toContain('data-act="delete-no"')
    expect(wipe).not.toContain('class="primary" data-act="delete-yes"')
    expect(wipe).not.toContain('class="danger" data-act="delete-no"')
  })

  it('asks for consent with Ja and Nein and no preselected button', () => {
    const html = cloudLayerHtml({
      status: 'offline',
      consent: 'unset',
      email: '',
      notice: '',
      askConsent: true,
      conflict: null
    }, 'de')
    expect(html).toContain('Anonyme Spielstatistik teilen, um Velunor zu verbessern?')
    expect(html).toContain('>Ja<')
    expect(html).toContain('>Nein<')
    expect(html).not.toContain('primary')
    expect(html).not.toContain('checked')
  })

  it('previews both devices in the conflict dialog', () => {
    const html = cloudLayerHtml({
      status: 'online',
      consent: 'yes',
      email: '',
      notice: '',
      askConsent: false,
      conflict: {
        local: { crests: 2, codex: 4, ep: 100, gold: 20, region: 1, chapter: 2, step: 5 },
        remote: { crests: 2, codex: 4, ep: 100, gold: 90, region: 1, chapter: 3, step: 1 }
      }
    }, 'de')
    expect(html).toContain('Gerät A')
    expect(html).toContain('Gerät B')
    expect(html).toContain('Wappen 2')
    expect(html).toContain('Kodex 4/100')
    expect(html).not.toContain('primary')
  })
})
