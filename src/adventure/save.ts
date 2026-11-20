import { freshSeed, nextFloat } from '../rng'
import { emptyBag } from './shop'
import { SAVE_BACKUP, SAVE_KEY_V1, SAVE_KEY_V2, SAVE_VERSION, START_GOLD, STARTER_LEVEL } from './const'
import { chapterById, councilOf, findChapter, regions, speciesKnown } from './route'
import { expToNext } from './stats'
import { clampChestCount, emptyPity, enteredRegions, startChests, type ChestTier } from './lootbox'
import { fontScale } from './touch'
import { settleExpeditions } from './expedition'
import { isDailyFrame, normalizeDaily } from './daily'
import { normalizeResearch } from './research'
import { t } from './i18n'
import { normalizeTreeNodes } from './tree'
import { SYNERGY_CAP, synergyKnown } from './synergyIds'
import { readLook } from './avatar'
import { freshOnboarding, normalizeOnboarding } from './onboarding'
import type { AdventureSettings, AvatarLook, OwnedMon, SaveV2, StorageLike } from './types'

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

function settingsFrom(raw: Partial<AdventureSettings> | undefined, shake: boolean): AdventureSettings {
  const speed = raw?.speed
  const power = raw?.powerSave
  return {
    speed: speed === 2 || speed === 3 ? speed : 1,
    ...(raw?.tempoWeg === 1 || raw?.tempoWeg === 2 || raw?.tempoWeg === 3 ? { tempoWeg: raw.tempoWeg } : {}),
    ...(raw?.tempoFokus === 2 ? { tempoFokus: 2 as const } : {}),
    ...(raw?.showHpNumbers === false ? { showHpNumbers: false } : {}),
    autoSwitch: raw?.autoSwitch !== false,
    catchCard: raw?.catchCard !== false,
    shake,
    flashes: raw?.flashes !== false,
    reduceMotion: raw?.reduceMotion === true,
    powerSave: power === 2 || power === 5 ? power : 0,
    lang: raw?.lang === 'en' ? 'en' : 'de',
    swipeTabs: raw?.swipeTabs !== false,
    haptics: raw?.haptics !== false,
    font: fontScale(raw?.font),
    battery: raw?.battery === true
  }
}

export function blankSave(now: number): SaveV2 {
  return {
    v: 2,
    saveVersion: SAVE_VERSION,
    name: 'Abenteurer',
    look: { skin: 0, hair: 0, color: 0 },
    gold: START_GOLD,
    marks: 0,
    lastSeenAt: now,
    region: 1,
    chapter: 1,
    step: 1,
    loop: true,
    lastHealStep: 1,
    findClaims: [],
    badges: [],
    team: [],
    pc: [],
    buddy: null,
    mons: {},
    dex: {},
    settings: settingsFrom(undefined, false),
    stats: { wins: 0, catches: 0, dupes: 0, eggs: 0, shinies: 0, fruitsUsed: 0, crystalsUsed: 0, chestsOpened: 0 },
    rng: freshSeed(),
    nextId: 1,
    started: false,
    active: null,
    loopsUntilRetry: 0,
    challengeNow: false,
    guardMark: 0,
    guardWins: 0,
    layout: 1,
    fxShake: 1,
    sealPity: {},
    hold: false,
    log: [],
    migratedFrom: null,
    councilBeaten: [],
    regionsOpen: [1],
    regionsEntered: [1],
    chests: startChests(),
    pity: emptyPity(),
    shards: {},
    stars: {},
    mastery: {},
    roadMs: 0,
    roadReady: 0,
    roadAt: now,
    chestDay: '',
    chestBought: { kiesel: 0, silber: 0 },
    codexChestAt: 0,
    dust: 0,
    chestLuck: 0,
    chestThanks: true,
    silverOpened: 0,
    chestTree: { pace: 0, extraSlot: false, shard: 0, master: false },
    bag: emptyBag(),
    activeFruits: [],
    hortSlots: 1,
    hort: [],
    eggs: [],
    lastBreedAt: now,
    claimed: [],
    equippedTitle: null,
    equippedFrame: null,
    pendingAwaken: [],
    tree: { nodes: [], resetDay: '', sealDay: '' },
    onboarding: freshOnboarding(false)
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

export function beginAdventure(name: string, look: AvatarLook, speciesId: string, now: number): SaveV2 {
  const save = blankSave(now)
  const clean = name.trim().slice(0, 24)
  save.name = clean || 'Abenteurer'
  save.look = readLook(look, undefined)
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

function recordOf(value: unknown): Record<string, number> {
  const out: Record<string, number> = {}
  if (!value || typeof value !== 'object') return out
  for (const [id, amount] of Object.entries(value as Record<string, unknown>)) {
    const n = Math.max(0, Math.floor(Number(amount)) || 0)
    if (n > 0) out[id] = n
  }
  return out
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
  // saveVersion climbs to the current step. 2 was portrait menus.
  // 3 adds swipe, vibration, font scale and battery mode.
  // 6 adds the anonymous account. 7 adds mastery. 8 adds the mastery tree, empty until a node is bought.
  // 9 adds expeditions. Older files get an empty board and keep every monster.
  // 10 adds the research tower. Older files get an empty tower and keep every monster.
  // 11 adds daily tasks and the 7-day calendar. Older files get an empty board and keep every monster.
  // 12 reprices the mastery tree. Bought nodes stay. The cheaper costs free the difference.
  // 13 adds the first-30-minutes board. A veteran skips the entrance. Stored chests stay as they are.
  // Older files keep every stored value. Missing setting fields take the defaults.
  const seenVersion = Math.max(0, Math.floor(Number(save.saveVersion)) || 0)
  if (seenVersion < SAVE_VERSION) save.saveVersion = SAVE_VERSION
  save.name = (save.name || 'Abenteurer').toString().slice(0, 24)
  const kept = save.avatar === 'A' || save.avatar === 'B' ? save.avatar : undefined
  save.look = readLook(save.look, kept)
  if (kept) save.avatar = kept
  else delete save.avatar
  save.gold = Math.max(0, Math.floor(save.gold) || 0)
  save.marks = Math.max(0, Math.floor(save.marks) || 0)
  save.lastSeenAt = save.lastSeenAt || now
  const askedRegion = Math.floor(Number(save.region)) || 1
  save.region = askedRegion
  const askedChapter = Math.floor(Number(save.chapter))
  save.chapter = askedChapter >= 1 ? askedChapter : 1
  save.layout = Math.max(0, Math.floor(Number(save.layout)) || 0)
  if (save.layout < 1) {
    const badges = Array.isArray(save.badges) ? save.badges.filter((badge) => typeof badge === 'string') : []
    if (save.region === 5 && save.chapter === 10) save.chapter = 11
    const council = councilOf(save.region)
    const eighth = findChapter(save.region, 8)
    const sealed = Boolean(council && badges.includes(council.guardian.badge))
    const roadDone = Boolean(eighth && badges.includes(eighth.guardian.badge))
    if (save.chapter === 9 && sealed && council) {
      save.chapter = council.id
      save.step = council.council?.members.length ?? 1
      save.hold = false
    } else if (save.chapter === 9 || (save.chapter === 8 && save.hold && roadDone && !sealed)) {
      save.chapter = findChapter(save.region, 9)?.id ?? save.chapter
      save.step = 1
      save.hold = false
    }
    save.layout = 1
  }
  const stepMax = chapterById(save.region, save.chapter).council ? 5 : 20
  save.step = Math.min(stepMax, Math.max(1, Math.floor(save.step) || 1))
  save.loop = save.loop !== false
  save.lastHealStep = save.lastHealStep || 1
  const claims = Array.isArray(save.findClaims) ? save.findClaims : []
  const seenClaims = new Set<string>()
  save.findClaims = []
  for (const key of claims) {
    if (typeof key !== 'string') continue
    const text = key.trim().slice(0, 24)
    if (!text || seenClaims.has(text)) continue
    seenClaims.add(text)
    save.findClaims.push(text)
  }
  save.findClaims = save.findClaims.slice(-64)
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
  const storedShake = save.settings?.shake === true
  save.fxShake = Math.max(0, Math.floor(Number(save.fxShake)) || 0)
  const shake = save.fxShake < 1 ? false : storedShake
  if (save.fxShake < 1) save.fxShake = 1
  save.settings = settingsFrom(save.settings, shake)
  const shinyHeld = Object.values(save.mons).filter((mon) => mon.shiny).length
  save.stats = {
    wins: save.stats?.wins ?? 0,
    catches: save.stats?.catches ?? 0,
    dupes: save.stats?.dupes ?? 0,
    eggs: save.stats?.eggs ?? 0,
    shinies: save.stats?.shinies ?? shinyHeld,
    fruitsUsed: save.stats?.fruitsUsed ?? 0,
    crystalsUsed: save.stats?.crystalsUsed ?? 0,
    chestsOpened: Math.max(0, Math.floor(Number(save.stats?.chestsOpened)) || 0)
  }
  if (!save.rng) save.rng = freshSeed()
  if (!save.nextId) {
    const nums = Object.keys(save.mons).map((uid) => Number(/^a(\d+)$/.exec(uid)?.[1] ?? 0))
    save.nextId = Math.max(1, ...nums, 0) + 1
  }
  save.started = Boolean(save.started && Object.keys(save.mons).length)
  save.onboarding = normalizeOnboarding(save.onboarding, save.started, save.badges, Object.keys(save.dex).length)
  save.loopsUntilRetry = Math.max(0, Math.floor(save.loopsUntilRetry) || 0)
  save.challengeNow = Boolean(save.challengeNow)
  save.guardMark = Math.max(0, Math.floor(Number(save.guardMark)) || 0)
  save.guardWins = Math.max(0, Math.floor(Number(save.guardWins)) || 0)
  save.layout = Math.max(1, Math.floor(Number(save.layout)) || 1)
  const pity: Record<string, number> = {}
  if (save.sealPity && typeof save.sealPity === 'object') {
    for (const [id, value] of Object.entries(save.sealPity)) {
      if (!speciesKnown(id)) continue
      const points = Math.max(0, Math.min(10, Number(value) || 0))
      if (points > 0) pity[id] = points
    }
  }
  save.sealPity = pity
  save.hold = false
  save.log = Array.isArray(save.log) ? save.log.slice(-50) : []
  save.migratedFrom = save.migratedFrom ?? null
  save.councilBeaten = Array.isArray(save.councilBeaten) ? save.councilBeaten.filter((id) => typeof id === 'string') : []
  const open = Array.isArray(save.regionsOpen) ? save.regionsOpen.map((id) => Math.floor(Number(id))).filter((id) => id > 0) : []
  if (!open.includes(1)) open.unshift(1)
  const seals: [string, number][] = [
    ['Ratsiegel', 2],
    ['Zweites Ratsiegel', 3],
    ['Drittes Ratsiegel', 4],
    ['Viertes Ratsiegel', 5]
  ]
  for (const [badge, id] of seals) {
    if (save.badges.includes(badge) && !open.includes(id)) open.push(id)
  }
  save.regionsOpen = [...new Set(open)]
  if (!save.regionsOpen.includes(save.region)) save.region = 1
  const rawChests = save.chests
  if (!rawChests || typeof rawChests !== 'object') save.chests = startChests()
  else {
    const next = startChests()
    for (const tier of Object.keys(next) as ChestTier[]) next[tier] = clampChestCount(rawChests[tier])
    save.chests = next
  }
  const rawPity = save.pity
  save.pity = emptyPity()
  if (rawPity && typeof rawPity === 'object') {
    save.pity.silber = Math.max(0, Math.floor(Number(rawPity.silber)) || 0)
    save.pity.gold = Math.max(0, Math.floor(Number(rawPity.gold)) || 0)
    save.pity.sternen = Math.max(0, Math.floor(Number(rawPity.sternen)) || 0)
  }
  save.shards = recordOf(save.shards)
  save.stars = recordOf(save.stars)
  for (const id of Object.keys(save.stars)) save.stars[id] = Math.max(0, Math.min(5, Math.floor(save.stars[id]) || 0))
  save.mastery = recordOf(save.mastery)
  const masteryTree = save.tree
  const nodes = normalizeTreeNodes(Array.isArray(masteryTree?.nodes) ? masteryTree.nodes.filter((id) => typeof id === 'string') : [])
  save.tree = {
    nodes,
    resetDay: typeof masteryTree?.resetDay === 'string' ? masteryTree.resetDay : '',
    sealDay: typeof masteryTree?.sealDay === 'string' ? masteryTree.sealDay : ''
  }
  if (seenVersion < 12 && nodes.length) {
    const note = t(save.settings?.lang, 'tree.reprice')
    if (!save.log.some((row) => row.text === note)) save.log.push({ t: now, text: note })
    if (save.log.length > 50) save.log.splice(0, save.log.length - 50)
  }
  const roadPace = Number(save.roadPace)
  if (Number.isFinite(roadPace)) save.roadPace = roadPace
  else delete save.roadPace
  const bank = save.rewardBank
  if (bank && typeof bank === 'object') {
    const part = (value: unknown) => {
      const n = Number(value)
      return Number.isFinite(n) && n > 0 ? n : 0
    }
    save.rewardBank = {
      mastery: part(bank.mastery),
      findChest: part(bank.findChest),
      trainerChest: part(bank.trainerChest),
      shard: part(bank.shard)
    }
  } else delete save.rewardBank
  save.roadMs = Math.max(0, Math.floor(Number(save.roadMs)) || 0)
  save.roadReady = Math.max(0, Math.min(4, Math.floor(Number(save.roadReady)) || 0))
  save.roadAt = Math.max(0, Math.floor(Number(save.roadAt)) || now)
  save.chestDay = typeof save.chestDay === 'string' ? save.chestDay : ''
  const bought = save.chestBought
  save.chestBought = {
    kiesel: Math.max(0, Math.floor(Number(bought?.kiesel)) || 0),
    silber: Math.max(0, Math.floor(Number(bought?.silber)) || 0)
  }
  save.codexChestAt = Math.max(0, Math.floor(Number(save.codexChestAt)) || 0)
  save.dust = Math.max(0, Math.floor(Number(save.dust)) || 0)
  save.chestLuck = save.chestLuck ? 1 : 0
  save.silverOpened = Math.max(0, Math.floor(Number(save.silverOpened)) || 0)
  const tree = save.chestTree
  const pace = tree?.pace === 2 ? 2 : tree?.pace === 1 ? 1 : 0
  const shardRank = tree?.shard === 2 ? 2 : tree?.shard === 1 ? 1 : 0
  save.chestTree = { pace, extraSlot: Boolean(tree?.extraSlot), shard: shardRank, master: Boolean(tree?.master) }
  if (seenVersion < 4) {
    let silver = 0
    let gold = 0
    for (const region of regions) {
      for (const chapter of region.chapters) {
        const badge = chapter.guardian?.badge
        if (!badge || !save.badges.includes(badge)) continue
        if (chapter.council) gold += 1
        else silver += 1
      }
    }
    save.chests.silber = Math.min(99, save.chests.silber + silver)
    save.chests.gold = Math.min(99, save.chests.gold + gold)
    const bag = save.bag
    if (bag?.fruits) {
      const refund = (bag.fruits.fang ?? 0) * 4000 + (bag.fruits.goldfang ?? 0) * 15000
      save.gold += refund
      bag.fruits.fang = 0
      bag.fruits.goldfang = 0
    }
    save.activeFruits = (save.activeFruits ?? []).filter((fruit) => fruit.id !== 'fang' && fruit.id !== 'goldfang')
    save.chestThanks = true
  } else save.chestThanks = save.chestThanks !== false
  save.regionsEntered = enteredRegions({
    regionsOpen: save.regionsOpen,
    region: save.region,
    regionsEntered: Array.isArray(save.regionsEntered) ? save.regionsEntered : []
  })
  const here = findChapter(save.region, save.chapter)
  save.chapter = here ? here.id : 1
  const stepNow = chapterById(save.region, save.chapter).council ? 5 : 20
  save.step = Math.min(stepNow, Math.max(1, save.step))
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
  save.equippedFrame = typeof save.equippedFrame === 'string' ? save.equippedFrame : null
  save.pendingAwaken = Array.isArray(save.pendingAwaken)
    ? save.pendingAwaken.filter((row) => row && save.mons[row.uid] && (row.level === 25 || row.level === 50))
    : []
  settleExpeditions(save, now)
  if ('synergy' in save) save.synergy = readSynergy(save.synergy)
  normalizeResearch(save, now)
  normalizeDaily(save)
  if (typeof save.equippedFrame === 'string' && !save.claimed.includes(save.equippedFrame) && !isDailyFrame(save.equippedFrame)) save.equippedFrame = null
  if (typeof save.equippedFrame === 'string' && isDailyFrame(save.equippedFrame) && !save.daily?.frames.includes(save.equippedFrame)) save.equippedFrame = null
  return save
}

function readSynergy(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined
  const out: string[] = []
  for (const id of value) {
    if (typeof id !== 'string' || !synergyKnown(id) || out.includes(id)) continue
    out.push(id)
    if (out.length >= SYNERGY_CAP) break
  }
  return out
}

const CODE_PREFIX = 'VELUNOR1.'

export function exportCode(save: SaveV2): string {
  const bytes = new TextEncoder().encode(JSON.stringify(save))
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return CODE_PREFIX + btoa(binary)
}

export function importCode(code: string, now: number): SaveV2 | null {
  const trimmed = code.trim().replace(/\s+/g, '')
  if (!trimmed.startsWith(CODE_PREFIX)) return null
  let json = ''
  try {
    const binary = atob(trimmed.slice(CODE_PREFIX.length))
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    json = new TextDecoder().decode(bytes)
  } catch {
    return null
  }
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return null
  }
  if (!data || typeof data !== 'object') return null
  const record = data as Partial<SaveV2>
  if (record.v !== 2 || !record.mons || typeof record.mons !== 'object') return null
  const save = normalize(record as SaveV2, now)
  if (!save.started || !Object.keys(save.mons).length) return null
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
  const current = storage.getItem(SAVE_KEY_V2)
  if (current && readableSave(current)) storage.setItem(SAVE_BACKUP, current)
  storage.setItem(SAVE_KEY_V2, JSON.stringify(save))
}

function readableSave(raw: string): boolean {
  try {
    const data = JSON.parse(raw) as { v?: number }
    return Boolean(data && typeof data === 'object' && data.v === 2)
  } catch {
    return false
  }
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
