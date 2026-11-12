import regionsJson from '../../data/regions.json'
import { species } from '../data'
import { hashSeed, mulberry32 } from '../rng'
import { GUARDIAN_STEP, HEAL_STEPS, PATH_LENGTH } from './const'

export interface Spawn {
  species: string
  weight: number
}

export interface GuardianMon {
  species: string
  level: number
}

export interface GuardianDef {
  name: string
  epithet: string
  badge: string
  gold: number
  team: GuardianMon[]
}

export interface CouncilMember {
  id: string
  name: string
  epithet: string
  cap: number
  gold: number
  team: GuardianMon[]
}

export interface CouncilDef {
  rewardGold: number
  unlocksRegion: number
  members: CouncilMember[]
}

export type SceneTint = 'moor' | 'fels' | 'sturm' | 'frost' | 'schmiede' | 'rat'

export interface ChapterDef {
  id: number
  name: string
  scene: 'wiese' | 'bach' | 'wald'
  /** Recolour of an existing Grünmark plate. No extra image files. */
  tint?: SceneTint
  levelMin: number
  levelMax: number
  cap: number
  guardian: GuardianDef
  day: Spawn[]
  night: Spawn[]
  council?: CouncilDef
}

export interface RegionDef {
  id: number
  name: string
  placeholder?: boolean
  chapters: ChapterDef[]
}

export type NodeKind = 'wild' | 'trainer' | 'find' | 'spring' | 'guardian'

export const regions = regionsJson.regions as RegionDef[]

const TRAINERS = [
  'Wanderin Lisa',
  'Angler Bo',
  'Forscher Tim',
  'Kräuterin Nila',
  'Späher Ed',
  'Hüterin Mara',
  'Fährtenleser Jo',
  'Köhlerin Rike',
  'Bachläufer Ulf',
  'Sternenguckerin Pia',
  'Moorgänger Ken',
  'Wappenlehrling Siri',
  'Pfadfinder Ole',
  'Nebelgängerin Ylva',
  'Steinmetz Lars'
]

const routeCache = new Map<number, NodeKind[]>()

export function regionById(id: number): RegionDef {
  return regions.find((region) => region.id === id) ?? regions[0]
}

export function findChapter(regionId: number, chapterId: number): ChapterDef | null {
  const region = regionById(regionId)
  return region.chapters.find((chapter) => chapter.id === chapterId) ?? null
}

export function chapterById(regionId: number, chapterId: number): ChapterDef {
  return findChapter(regionId, chapterId) ?? regionById(regionId).chapters[0]
}

export function chapterFormula(n: number): { levelMin: number; levelMax: number; cap: number; gold: number } {
  return { levelMin: 6 * n - 4, levelMax: 6 * n, cap: 6 * n + 6, gold: 1000 + 750 * n }
}

/** Fixed layout. Seed is the chapter id. Springs sit on 7 and 14, the guardian on 20. */
export function routeOf(chapterId: number): NodeKind[] {
  const cached = routeCache.get(chapterId)
  if (cached) return cached
  const nodes: NodeKind[] = Array.from({ length: PATH_LENGTH + 1 }, () => 'wild')
  for (const step of HEAL_STEPS) nodes[step] = 'spring'
  nodes[GUARDIAN_STEP] = 'guardian'
  const open: number[] = []
  for (let step = 1; step < GUARDIAN_STEP; step++) {
    if (nodes[step] === 'wild') open.push(step)
  }
  const rng = mulberry32(chapterId)
  for (let i = open.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const swap = open[i]
    open[i] = open[j]
    open[j] = swap
  }
  nodes[open[0]] = 'trainer'
  nodes[open[1]] = 'trainer'
  nodes[open[2]] = 'trainer'
  nodes[open[3]] = 'find'
  routeCache.set(chapterId, nodes)
  return nodes
}

export function dayPart(ts: number): 'day' | 'night' {
  const hour = new Date(ts).getHours()
  return hour >= 8 && hour <= 19 ? 'day' : 'night'
}

export function tableFor(chapter: ChapterDef, ts: number): Spawn[] {
  return dayPart(ts) === 'day' ? chapter.day : chapter.night
}

export function sightingShares(spawns: Spawn[]): { species: string; pct: number }[] {
  const total = spawns.reduce((sum, spawn) => sum + spawn.weight, 0)
  return spawns.map((spawn) => ({ species: spawn.species, pct: total ? (spawn.weight / total) * 100 : 0 }))
}

export function pickWeighted(rng: () => number, spawns: Spawn[]): string {
  const total = spawns.reduce((sum, spawn) => sum + spawn.weight, 0)
  let roll = rng() * total
  for (const spawn of spawns) {
    roll -= spawn.weight
    if (roll < 0) return spawn.species
  }
  return spawns[spawns.length - 1].species
}

export function rollInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

export function trainerName(chapterId: number, step: number): string {
  const rng = mulberry32(hashSeed(`velunor-trainer-${chapterId}-${step}`))
  return TRAINERS[Math.floor(rng() * TRAINERS.length)]
}

export function trainerCount(chapterId: number, step: number): number {
  const rng = mulberry32(hashSeed(`velunor-party-${chapterId}-${step}`))
  return 1 + Math.floor(rng() * 3)
}

export function findGold(chapterId: number): number {
  return 50 * chapterId
}

export function placeLabel(where: string): string {
  const match = /^r(\d+)c(\d+)$/.exec(where)
  if (!match) return where === 'alt' ? 'Früherer Speicher' : 'Grünmark'
  const region = regionById(Number(match[1]))
  const chapter = chapterById(Number(match[1]), Number(match[2]))
  return `${region.name} · ${chapter.name}`
}

export function speciesKnown(id: string): boolean {
  try {
    species(id)
    return true
  } catch {
    return false
  }
}
