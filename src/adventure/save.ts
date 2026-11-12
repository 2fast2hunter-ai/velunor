import { freshSeed, nextFloat } from '../rng'
import { emptyBag } from './shop'
import { SAVE_KEY_V1, SAVE_KEY_V2, START_GOLD, STARTER_LEVEL } from './const'
import { speciesKnown } from './route'
import { expToNext } from './stats'
import type { OwnedMon, SaveV2, StorageLike } from './types'

interface LegacyMon {
  uid?: string
  speciesId?: string
  level?: number
  exp?: number
  obtainedAt?: number
}

interface LegacySave {
  version?: number
  monsters?: LegacyMon[]
  team?: Record<string, string | null>
  collection?: string[]
}

const TEAM_ORDER = ['F1', 'F2', 'H1', 'H2', 'H3']

export function blankSave(now: number): SaveV2 {
  return {
    v: 2,
    name: 'Abenteurer',
    avatar: 'A',
    gold: START_GOLD,
    marks: 0,
    lastSeenAt: now,
    region: 1,
    chapter: 1,
    step: 1,
    loop: true,
    lastHealStep: 1,
    badges: [],
    team: [],
    pc: [],
    buddy: null,
    mons: {},
    dex: {},
    settings: { speed: 1, autoSwitch: true, catchCard: true },
    stats: { wins: 0, catches: 0, dupes: 0, eggs: 0, shinies: 0, fruitsUsed: 0, crystalsUsed: 0 },
    rng: freshSeed(),
    nextId: 1,
    started: false,
    active: null,
    loopsUntilRetry: 0,
    challengeNow: false,
    hold: false,
    log: [],
    migratedFrom: null,
    councilBeaten: [],
    regionsOpen: [1],
    bag: emptyBag(),
    activeFruits: [],
    hortSlots: 1,
    hort: [],
    eggs: [],
    lastBreedAt: now,
    claimed: [],
    equippedTitle: null,
    equippedFrame: null
  }
}

export function makeMon(speciesId: string, level: number, now: number, where: string, shiny = false): OwnedMon {
  return {
    species: speciesId,
    lvl: level,
    exp: 0,
    hp: null,
    shiny,
    caughtAt: now,
    caughtWhere: where,
    keepDupes: false
  }
}

export function beginAdventure(name: string, avatar: 'A' | 'B', speciesId: string, now: number): SaveV2 {
  const save = blankSave(now)
  const clean = name.trim().slice(0, 24)
  save.name = clean || 'Abenteurer'
  save.avatar = avatar === 'B' ? 'B' : 'A'
  save.started = true
  save.rng = freshSeed()
  const uid = takeId(save)
  save.mons[uid] = makeMon(speciesId, STARTER_LEVEL, now, 'r1c1')
  save.team = [uid]
  save.active = uid
  save.buddy = uid
  save.dex[speciesId] = { seen: 1, caught: 1 }
  save.log.push({ t: now, text: `${save.name} bricht mit dem Starter auf.` })
  return save
}

export function takeId(save: SaveV2): string {
  const id = `a${save.nextId}`
  save.nextId += 1
  return id
}

function clampExp(level: number, exp: number): number {
  if (level < STARTER_LEVEL) return 0
  const room = Math.max(0, expToNext(level) - 1)
  return Math.max(0, Math.min(room, Math.floor(exp) || 0))
}

/** Keep every old specimen. Level 1–4 rise to 5. Species that were released return once at level 5. */
export function migrateFromV1(raw: unknown, now: number): SaveV2 | null {
  if (!raw || typeof raw !== 'object') return null
  const legacy = raw as LegacySave
  if (typeof legacy.version !== 'number') return null
  const save = blankSave(now)
  save.migratedFrom = SAVE_KEY_V1
  save.started = false
  const owned = new Set<string>()
  const teamIds: string[] = []
  for (const slot of TEAM_ORDER) {
    const uid = legacy.team?.[slot]
    if (uid) teamIds.push(uid)
  }
  const ordered: LegacyMon[] = []
  const rest: LegacyMon[] = []
  for (const mon of legacy.monsters ?? []) {
    if (mon?.uid && teamIds.includes(mon.uid)) ordered.push(mon)
    else rest.push(mon)
  }
  ordered.sort((a, b) => teamIds.indexOf(a.uid ?? '') - teamIds.indexOf(b.uid ?? ''))
  const place = (mon: LegacyMon, preferTeam: boolean) => {
    const speciesId = mon.speciesId
    if (!speciesId || !speciesKnown(speciesId)) return
    const uid = mon.uid && !save.mons[mon.uid] ? mon.uid : takeId(save)
    const level = Math.max(STARTER_LEVEL, Math.floor(mon.level ?? 1) || 1)
    save.mons[uid] = {
      species: speciesId,
      lvl: level,
      exp: clampExp(level, mon.level != null && mon.level >= STARTER_LEVEL ? mon.exp ?? 0 : 0),
      hp: null,
      shiny: false,
      caughtAt: mon.obtainedAt || now,
      caughtWhere: 'alt',
      keepDupes: false
    }
    owned.add(speciesId)
    if (preferTeam && save.team.length < 6) save.team.push(uid)
    else save.pc.push(uid)
    const dex = save.dex[speciesId] ?? { seen: 0, caught: 0 }
    dex.seen += 1
    dex.caught += 1
    save.dex[speciesId] = dex
  }
  for (const mon of ordered) place(mon, true)
  for (const mon of rest) place(mon, false)
  for (const speciesId of legacy.collection ?? []) {
    if (!speciesId || owned.has(speciesId) || !speciesKnown(speciesId)) continue
    const uid = takeId(save)
    save.mons[uid] = makeMon(speciesId, STARTER_LEVEL, now, 'alt')
    save.pc.push(uid)
    owned.add(speciesId)
    save.dex[speciesId] = { seen: 1, caught: 1 }
  }
  if (!Object.keys(save.mons).length) return save
  if (!save.team.length && save.pc.length) save.team.push(save.pc.shift() as string)
  save.active = save.team[0] ?? null
  save.buddy = save.team[0] ?? null
  save.started = true
  save.gold = START_GOLD
  save.log.push({ t: now, text: 'Alte Gefährten sind da. Jedes Exemplar aus dem bisherigen Speicher bleibt erhalten.' })
  return save
}

export function normalize(save: SaveV2, now: number): SaveV2 {
  save.v = 2
  save.name = (save.name || 'Abenteurer').toString().slice(0, 24)
  save.avatar = save.avatar === 'B' ? 'B' : 'A'
  save.gold = Math.max(0, Math.floor(save.gold) || 0)
  save.marks = Math.max(0, Math.floor(save.marks) || 0)
  save.lastSeenAt = save.lastSeenAt || now
  save.region = 1
  const chapter = Math.floor(Number(save.chapter))
  save.chapter = chapter >= 1 && chapter <= 9 ? chapter : 1
  const stepMax = save.chapter === 9 ? 5 : 20
  save.step = Math.min(stepMax, Math.max(1, Math.floor(save.step) || 1))
  save.loop = save.loop !== false
  save.lastHealStep = save.lastHealStep || 1
  save.badges = Array.isArray(save.badges) ? save.badges.filter((badge) => typeof badge === 'string') : []
  save.mons = save.mons && typeof save.mons === 'object' ? save.mons : {}
  save.team = (save.team ?? []).filter((uid) => save.mons[uid]).slice(0, 6)
  save.pc = (save.pc ?? []).filter((uid) => save.mons[uid] && !save.team.includes(uid))
  const known = new Set([...save.team, ...save.pc])
  for (const uid of Object.keys(save.mons)) {
    if (!known.has(uid)) save.pc.push(uid)
    const mon = save.mons[uid]
    mon.lvl = Math.max(1, Math.floor(mon.lvl) || 1)
    mon.exp = Math.max(0, Math.floor(mon.exp) || 0)
    mon.shiny = Boolean(mon.shiny)
    mon.keepDupes = Boolean(mon.keepDupes)
    if (mon.hp != null) mon.hp = Math.max(0, Math.floor(mon.hp))
  }
  if (!save.team.length && save.pc.length) save.team.push(save.pc.shift() as string)
  if (save.active && !save.team.includes(save.active)) save.active = save.team[0] ?? null
  if (!save.active) save.active = save.team[0] ?? null
  if (save.buddy && !save.team.includes(save.buddy)) save.buddy = null
  save.dex = save.dex ?? {}
  const speed = save.settings?.speed
  save.settings = {
    speed: speed === 2 || speed === 3 ? speed : 1,
    autoSwitch: save.settings?.autoSwitch !== false,
    catchCard: save.settings?.catchCard !== false
  }
  const shinyHeld = Object.values(save.mons).filter((mon) => mon.shiny).length
  save.stats = {
    wins: save.stats?.wins ?? 0,
    catches: save.stats?.catches ?? 0,
    dupes: save.stats?.dupes ?? 0,
    eggs: save.stats?.eggs ?? 0,
    shinies: save.stats?.shinies ?? shinyHeld,
    fruitsUsed: save.stats?.fruitsUsed ?? 0,
    crystalsUsed: save.stats?.crystalsUsed ?? 0
  }
  if (!save.rng) save.rng = freshSeed()
  if (!save.nextId) {
    const nums = Object.keys(save.mons).map((uid) => Number(/^a(\d+)$/.exec(uid)?.[1] ?? 0))
    save.nextId = Math.max(1, ...nums, 0) + 1
  }
  save.started = Boolean(save.started && Object.keys(save.mons).length)
  save.loopsUntilRetry = Math.max(0, Math.floor(save.loopsUntilRetry) || 0)
  save.challengeNow = Boolean(save.challengeNow)
  save.hold = Boolean(save.hold)
  save.log = Array.isArray(save.log) ? save.log.slice(-50) : []
  save.migratedFrom = save.migratedFrom ?? null
  save.councilBeaten = Array.isArray(save.councilBeaten) ? save.councilBeaten.filter((id) => typeof id === 'string') : []
  const open = Array.isArray(save.regionsOpen) ? save.regionsOpen.map((id) => Math.floor(Number(id))).filter((id) => id > 0) : []
  if (!open.includes(1)) open.unshift(1)
  if (save.badges.includes('Ratsiegel') && !open.includes(2)) open.push(2)
  save.regionsOpen = [...new Set(open)]
  const bag = emptyBag()
  const rawBag = save.bag
  if (rawBag?.crystals) {
    for (const id of Object.keys(bag.crystals) as (keyof typeof bag.crystals)[]) {
      bag.crystals[id] = Math.max(0, Math.floor(Number(rawBag.crystals[id])) || 0)
    }
  }
  if (rawBag?.fruits) {
    for (const id of Object.keys(bag.fruits) as (keyof typeof bag.fruits)[]) {
      bag.fruits[id] = Math.max(0, Math.floor(Number(rawBag.fruits[id])) || 0)
    }
  }
  save.bag = bag
  const fruits = Array.isArray(save.activeFruits) ? save.activeFruits : []
  save.activeFruits = fruits.filter((fruit) => fruit && bag.fruits[fruit.id] != null && Number(fruit.until) > 0)
    .map((fruit) => ({ id: fruit.id, until: Math.floor(Number(fruit.until)) }))
  const slots = Math.floor(Number(save.hortSlots))
  save.hortSlots = slots >= 1 && slots <= 4 ? slots : 1
  save.hort = (Array.isArray(save.hort) ? save.hort : []).filter((uid) => save.mons[uid] && !save.team.includes(uid))
  save.pc = save.pc.filter((uid) => !save.hort.includes(uid))
  if (save.hort.length > save.hortSlots) {
    save.pc.unshift(...save.hort.slice(save.hortSlots))
    save.hort = save.hort.slice(0, save.hortSlots)
  }
  save.eggs = (Array.isArray(save.eggs) ? save.eggs : []).filter((egg) => egg && typeof egg.species === 'string' && Number(egg.readyAt) > 0)
    .map((egg) => ({ species: egg.species, shiny: Boolean(egg.shiny), readyAt: Math.floor(Number(egg.readyAt)) }))
  if (!Number.isFinite(save.lastBreedAt) || save.lastBreedAt <= 0) save.lastBreedAt = save.lastSeenAt || now
  save.claimed = Array.isArray(save.claimed) ? save.claimed.filter((id) => typeof id === 'string') : []
  save.equippedTitle = typeof save.equippedTitle === 'string' && save.claimed.includes(save.equippedTitle) ? save.equippedTitle : null
  save.equippedFrame = typeof save.equippedFrame === 'string' && save.claimed.includes(save.equippedFrame) ? save.equippedFrame : null
  return save
}

function readJson(storage: StorageLike, key: string): unknown {
  const raw = storage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

export function writeSave(storage: StorageLike, save: SaveV2): void {
  storage.setItem(SAVE_KEY_V2, JSON.stringify(save))
}

export function loadAdventure(storage: StorageLike, now: number): SaveV2 | null {
  const current = readJson(storage, SAVE_KEY_V2)
  if (current && typeof current === 'object' && (current as { v?: number }).v === 2) {
    return normalize(current as SaveV2, now)
  }
  const legacy = readJson(storage, SAVE_KEY_V1)
  if (!legacy) return null
  const migrated = migrateFromV1(legacy, now)
  if (!migrated) return null
  writeSave(storage, migrated)
  return migrated
}

/** Test helper: draw the next float and keep the seed on the save. */
export function draw(save: SaveV2): number {
  const state = { seed: save.rng }
  const value = nextFloat(state)
  save.rng = state.seed
  return value
}
