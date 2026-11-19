import { species } from '../data'
import { hashSeed, mulberry32 } from '../rng'
import type { TypeId } from '../types'
import { lastDailyReset } from './arena'
import { t } from './i18n'
import { chestStateOf, openChest, type ChestTier } from './lootbox'
import { chapterById } from './route'
import { noteDaily } from './daily'
import { researchLootMult, scaleHatch } from './research'
import { crystalExp } from './shop'
import { addExp } from './stats'
import { treeExpeditionSlots } from './tree'
import type { CrystalId, ExpeditionQuest, ExpeditionRun, ExpeditionState, SaveV2 } from './types'
import { chapterCapNow } from './dex'

export const EXPEDITION_SLOTS = 3
export const EXPEDITION_HOURS = [1, 4, 8] as const
export const MARK_CAP = 30
export const EP_SHARE = 0.25
export const ROAD_STEPS = 20
export const WILD_STEPS = 13
export const WILD_INTERVAL_MS = 2800
export const WILD_GOLD_PER_LEVEL = 4
export const HOUR_MS = 60 * 60 * 1000
/** Same wait as a hort egg. Kept here so the save loader does not import the hort. */
const EGG_READY_MS = 4 * HOUR_MS

export type ExpeditionTier = 'bronze' | 'silber' | 'gold'

export const TIER_GOLD: Record<ExpeditionTier, number> = { bronze: 1, silber: 1.25, gold: 1.5 }
export const TIER_MARKS: Record<ExpeditionTier, number> = { bronze: 2, silber: 4, gold: 6 }
export const TIER_FRUITS: Record<ExpeditionTier, number> = { bronze: 1, silber: 2, gold: 3 }
export const TIER_EGG: Record<ExpeditionTier, number> = { bronze: 0.02, silber: 0.04, gold: 0.08 }
export const TIER_CHEST: Record<ExpeditionTier, ChestTier> = { bronze: 'kiesel', silber: 'silber', gold: 'gold' }
export const TIER_CRYSTALS: Record<ExpeditionTier, readonly CrystalId[]> = {
  bronze: ['s'],
  silber: ['s', 's'],
  gold: ['m']
}

const TYPES: TypeId[] = [
  'fire', 'water', 'plant', 'earth', 'wind', 'ice', 'lightning', 'poison', 'metal', 'stone',
  'light', 'shadow', 'ghost', 'dragon', 'insect', 'beast', 'fighting', 'psychic', 'sound', 'crystal'
]

export const PLACES: Record<TypeId, { place: string, art: string }> = {
  fire: { place: 'Glutkessel', art: 'expedition/glutkessel' },
  water: { place: 'Stillbucht', art: 'expedition/stillbucht' },
  plant: { place: 'Mooslichtung', art: 'expedition/mooslichtung' },
  earth: { place: 'Wurzelhang', art: 'expedition/wurzelhang' },
  wind: { place: 'Wolkenpass', art: 'expedition/wolkenpass' },
  ice: { place: 'Reiftal', art: 'expedition/reiftal' },
  lightning: { place: 'Funkensteig', art: 'expedition/funkensteig' },
  poison: { place: 'Nebelmoor', art: 'expedition/nebelmoor' },
  metal: { place: 'Klangschlucht', art: 'expedition/klangschlucht' },
  stone: { place: 'Rundfels', art: 'expedition/rundfels' },
  light: { place: 'Klarfeld', art: 'expedition/klarfeld' },
  shadow: { place: 'Dämmerpfad', art: 'expedition/daemmerpfad' },
  ghost: { place: 'Nebelhof', art: 'expedition/nebelhof' },
  dragon: { place: 'Horstring', art: 'expedition/horstring' },
  insect: { place: 'Summwiese', art: 'expedition/summwiese' },
  beast: { place: 'Fährtenwald', art: 'expedition/faehrtenwald' },
  fighting: { place: 'Rundarena', art: 'expedition/rundarena' },
  psychic: { place: 'Sternenruh', art: 'expedition/sternenruh' },
  sound: { place: 'Echobogen', art: 'expedition/echobogen' },
  crystal: { place: 'Glitzerkammer', art: 'expedition/glitzerkammer' }
}

const WISHES = [2, 3, 4] as const

export function expeditionDayKey(now: Date): string {
  return lastDailyReset(now).toISOString()
}

/** Gold from about 30 minutes of wild fights: 13 wild steps on the 20-step road, 4 G per level. */
export function wildGold30(level: number): number {
  const encounters = (30 * 60 * 1000) / WILD_INTERVAL_MS
  const wild = encounters * (WILD_STEPS / ROAD_STEPS)
  return Math.round(wild * WILD_GOLD_PER_LEVEL * Math.max(1, level))
}

export function expeditionGold(level: number, hours: number, tier: ExpeditionTier): number {
  return Math.round(wildGold30(level) * Math.max(0, hours) * TIER_GOLD[tier])
}

export function expeditionSlots(save: SaveV2, guildLevel = 0): number {
  return EXPEDITION_SLOTS + treeExpeditionSlots(save) + (guildLevel >= 5 ? 1 : 0)
}

export function expeditionBusy(save: SaveV2, uid: string): boolean {
  return Boolean(save.expeditions?.runs.some((run) => run.uid === uid))
}

export function expeditionTier(type: TypeId, rarity: number, quest: Pick<ExpeditionQuest, 'type' | 'rarity'>): ExpeditionTier {
  const matches = (type === quest.type ? 1 : 0) + (rarity >= quest.rarity ? 1 : 0)
  if (matches >= 2) return 'gold'
  if (matches === 1) return 'silber'
  return 'bronze'
}

export function rollQuests(dayKey: string, seed: number): ExpeditionQuest[] {
  const rng = mulberry32(hashSeed(`velunor-expedition-${dayKey}-${seed >>> 0}`) || 1)
  const types = TYPES.slice()
  const hours = [...EXPEDITION_HOURS]
  const wishes = [...WISHES]
  const shuffle = <T>(list: T[]) => {
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1))
      const swap = list[i]
      list[i] = list[j]
      list[j] = swap
    }
  }
  shuffle(types)
  shuffle(hours)
  shuffle(wishes)
  return hours.map((span, index) => {
    const type = types[index]
    const place = PLACES[type]
    return {
      id: `${dayKey}:${index}:${type}`,
      type,
      rarity: wishes[index],
      hours: span,
      place: place.place,
      art: place.art
    }
  })
}

function emptyState(seed: number): ExpeditionState {
  return { seed, day: '', quests: [], runs: [], marks: 0, marksDay: '', notes: [], goldDone: 0 }
}

function cleanState(raw: ExpeditionState | undefined, seed: number): ExpeditionState {
  const state = emptyState(seed)
  if (!raw) return state
  state.seed = Math.floor(Number(raw.seed)) || seed
  state.day = typeof raw.day === 'string' ? raw.day : ''
  state.marks = Math.max(0, Math.floor(Number(raw.marks)) || 0)
  state.marksDay = typeof raw.marksDay === 'string' ? raw.marksDay : ''
  state.notes = Array.isArray(raw.notes) ? raw.notes.filter((line) => typeof line === 'string').slice(0, 8) : []
  state.goldDone = Math.max(0, Math.floor(Number(raw.goldDone)) || 0)
  state.quests = Array.isArray(raw.quests) ? raw.quests.flatMap((quest): ExpeditionQuest[] => {
    if (!quest || typeof quest.id !== 'string' || !PLACES[quest.type as TypeId]) return []
    const hours: 1 | 4 | 8 = quest.hours === 4 || quest.hours === 8 ? quest.hours : 1
    return [{
      id: quest.id,
      type: quest.type,
      rarity: Math.max(0, Math.min(9, Math.floor(Number(quest.rarity)) || 0)),
      hours,
      place: PLACES[quest.type].place,
      art: PLACES[quest.type].art
    }]
  }).slice(0, 3) : []
  state.runs = Array.isArray(raw.runs) ? raw.runs.flatMap((run): ExpeditionRun[] => {
    if (!run || typeof run.questId !== 'string' || typeof run.uid !== 'string' || !PLACES[run.type as TypeId]) return []
    const hours: 1 | 4 | 8 = run.hours === 4 || run.hours === 8 ? run.hours : 1
    return [{
      questId: run.questId,
      uid: run.uid,
      startedAt: Math.max(0, Math.floor(Number(run.startedAt)) || 0),
      hours,
      type: run.type,
      rarity: Math.max(0, Math.min(9, Math.floor(Number(run.rarity)) || 0)),
      place: PLACES[run.type].place,
      art: PLACES[run.type].art
    }]
  }) : []
  return state
}

export function ensureExpeditions(save: SaveV2, now: number): ExpeditionState {
  const seed = Math.floor(Number(save.expeditions?.seed)) || (save.rng >>> 0) || 1
  const state = cleanState(save.expeditions, seed)
  const day = expeditionDayKey(new Date(now))
  if (state.day !== day || state.quests.length !== 3) {
    state.day = day
    state.quests = rollQuests(day, state.seed)
  }
  save.expeditions = state
  return state
}

export function startExpedition(save: SaveV2, questId: string, uid: string, now: number): string | null {
  const state = ensureExpeditions(save, now)
  const quest = state.quests.find((item) => item.id === questId)
  if (!quest) return t(save.settings.lang, 'err.expeditionQuest')
  if (state.runs.some((run) => run.questId === questId)) return t(save.settings.lang, 'err.expeditionQuest')
  if (state.runs.length >= expeditionSlots(save)) return t(save.settings.lang, 'err.expeditionFull')
  if (!save.pc.includes(uid) || save.team.includes(uid)) return t(save.settings.lang, 'err.notPc')
  if (expeditionBusy(save, uid)) return t(save.settings.lang, 'err.expedition')
  if (!save.mons[uid]) return t(save.settings.lang, 'err.noMon')
  state.runs.push({
    questId: quest.id,
    uid,
    startedAt: now,
    hours: quest.hours,
    type: quest.type,
    rarity: quest.rarity,
    place: quest.place,
    art: quest.art
  })
  noteDaily(save, 'expedition', 1)
  return null
}

function lootLevel(save: SaveV2): number {
  const chapter = chapterById(save.region, save.chapter)
  return Math.max(1, Math.round((chapter.levelMin + chapter.levelMax) / 2))
}

export interface ExpeditionReport {
  place: string
  tier: ExpeditionTier
  gold: number
  marks: number
  crystals: CrystalId[]
  fruits: number
  egg: boolean
  ep: number
}

export function previewLoot(level: number, hours: number, tier: ExpeditionTier, monsterLevel: number): ExpeditionReport {
  const crystals = [...TIER_CRYSTALS[tier]]
  const ep = Math.floor(crystals.reduce((sum, id) => sum + crystalExp(id, monsterLevel), 0) * EP_SHARE)
  return {
    place: '',
    tier,
    gold: expeditionGold(level, hours, tier),
    marks: TIER_MARKS[tier] * hours,
    crystals,
    fruits: TIER_FRUITS[tier],
    egg: false,
    ep
  }
}

function rollFor(run: ExpeditionRun): () => number {
  return mulberry32(hashSeed(`velunor-expedition-loot-${run.questId}-${run.startedAt}`) || 1)
}

export function settleExpeditions(save: SaveV2, now: number): ExpeditionReport[] {
  const state = ensureExpeditions(save, now)
  const day = expeditionDayKey(new Date(now))
  if (state.marksDay !== day) {
    state.marksDay = day
    state.marks = 0
  }
  const done: ExpeditionRun[] = []
  const keep: ExpeditionRun[] = []
  for (const run of state.runs) {
    if (now >= run.startedAt + run.hours * HOUR_MS) done.push(run)
    else keep.push(run)
  }
  state.runs = keep
  const reports: ExpeditionReport[] = []
  for (const run of done) {
    const mon = save.mons[run.uid]
    const rarity = mon ? species(mon.species).baseRarity : 0
    const type = mon ? species(mon.species).type : run.type
    const tier = mon ? expeditionTier(type, rarity, run) : 'bronze'
    const loot = previewLoot(lootLevel(save), run.hours, tier, mon?.lvl ?? 1)
    const lootMult = researchLootMult(save)
    loot.gold = Math.round(loot.gold * lootMult)
    loot.marks = Math.round(loot.marks * lootMult)
    loot.ep = Math.round(loot.ep * lootMult)
    const room = Math.max(0, MARK_CAP - state.marks)
    const marks = Math.min(room, loot.marks)
    state.marks += marks
    save.marks += marks
    save.gold += loot.gold
    for (const id of loot.crystals) save.bag.crystals[id] += 1
    save.bag.fruits.lern += loot.fruits
    let ep = 0
    if (mon) {
      const chapter = chapterById(save.region, save.chapter)
      ep = addExp(mon, loot.ep, chapterCapNow(save, chapter), null).gained
    }
    const rng = rollFor(run)
    let egg = false
    if (rng() < TIER_EGG[tier]) {
      try {
        const chest = TIER_CHEST[tier]
        const rolled = openChest(chest, chestStateOf(save), rng)
        if (chest !== 'kiesel') save.pity[chest] = rolled.pity
        save.eggs.push({ species: rolled.speciesId, shiny: false, readyAt: now + scaleHatch(EGG_READY_MS, save) })
        egg = true
      } catch {
        egg = false
      }
    }
    if (tier === 'gold') state.goldDone = (state.goldDone ?? 0) + 1
    const report: ExpeditionReport = { ...loot, place: run.place, marks, ep, egg }
    reports.push(report)
    const line = t(save.settings.lang, 'expedition.back', {
      place: run.place,
      tier: t(save.settings.lang, `expedition.tier.${tier}`),
      gold: loot.gold,
      marks
    })
    state.notes.push(line)
  }
  if (state.notes.length > 8) state.notes.splice(0, state.notes.length - 8)
  return reports
}

export function takeExpeditionNotes(save: SaveV2): string[] {
  const notes = save.expeditions?.notes ?? []
  if (save.expeditions) save.expeditions.notes = []
  return notes.slice()
}
