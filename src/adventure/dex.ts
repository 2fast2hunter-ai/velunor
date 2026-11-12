import { monsters, species } from '../data'
import { chapterById, regionById, regions, type ChapterDef } from './route'
import type { SaveV2 } from './types'
import { weatherName } from './weather'

export type DexStatus = 'owned' | 'released' | 'seen' | 'missing'

export interface DexPlace {
  region: string
  chapter: string
  when: string
}

export interface DexFilter {
  q: string
  type: string
  rarity: string
  /** '' all, '1' owns a shimmer, '0' no shimmer. Shimmer spawns themselves come later. */
  shiny: string
}

const STATUS_LABEL: Record<DexStatus, string> = {
  owned: 'besessen',
  released: 'nicht mehr besessen',
  seen: 'gesichtet',
  missing: 'fehlt'
}

export function dexStatusLabel(status: DexStatus): string {
  return STATUS_LABEL[status]
}

export function dexStatus(save: SaveV2, speciesId: string): DexStatus {
  const held = Object.values(save.mons).some((mon) => mon.species === speciesId)
  const entry = save.dex[speciesId]
  if (held) return 'owned'
  if ((entry?.caught ?? 0) > 0) return 'released'
  if ((entry?.seen ?? 0) > 0) return 'seen'
  return 'missing'
}

export function ownsShiny(save: SaveV2, speciesId: string): boolean {
  return Object.values(save.mons).some((mon) => mon.species === speciesId && mon.shiny)
}

function whenFor(day: boolean, night: boolean): string {
  if (day && night) return 'Tag und Nacht'
  if (night) return 'nur nachts'
  return 'nur tags'
}

export function dexPlaces(speciesId: string): DexPlace[] {
  const places: DexPlace[] = []
  for (const region of regions) {
    for (const chapter of region.chapters) {
      const day = chapter.day.some((row) => row.species === speciesId)
      const night = chapter.night.some((row) => row.species === speciesId)
      if (day || night) {
        places.push({ region: region.name, chapter: chapter.name, when: whenFor(day, night) })
      }
      if (!chapter.council && chapter.guardian.team.some((mon) => mon.species === speciesId)) {
        places.push({ region: region.name, chapter: chapter.name, when: 'Wächterteam' })
      }
      for (const member of chapter.council?.members ?? []) {
        if (member.team.some((mon) => mon.species === speciesId)) {
          places.push({ region: region.name, chapter: `${chapter.name} · ${member.epithet} ${member.name}`, when: 'direkt hintereinander' })
        }
      }
      for (const row of chapter.weather ?? []) {
        if (row.species === speciesId) {
          places.push({ region: region.name, chapter: chapter.name, when: `bei ${weatherName(row.weather)}` })
        }
      }
    }
  }
  return places
}

export function regionRoster(regionId: number): string[] {
  const region = regions.find((entry) => entry.id === regionId)
  if (!region) return []
  const ids = new Set<string>()
  for (const chapter of region.chapters) {
    if (chapter.council) continue
    for (const row of [...chapter.day, ...chapter.night, ...(chapter.weather ?? [])]) ids.add(row.species)
  }
  return [...ids]
}

export function regionProgress(save: SaveV2, regionId: number): { name: string; caught: number; total: number; open: boolean; placeholder: boolean } {
  const region = regionById(regionId)
  const roster = regionRoster(regionId)
  const caught = roster.filter((id) => (save.dex[id]?.caught ?? 0) > 0).length
  return {
    name: region.name,
    caught,
    total: roster.length,
    open: save.regionsOpen.includes(regionId),
    placeholder: Boolean(region.placeholder)
  }
}

export function listCodex(save: SaveV2, filter: DexFilter): typeof monsters {
  const q = filter.q.trim().toLowerCase()
  return monsters.filter((mon) => {
    if (q && !mon.name.toLowerCase().includes(q) && !mon.id.includes(q)) return false
    if (filter.type && mon.type !== filter.type) return false
    if (filter.rarity !== '' && String(mon.baseRarity) !== filter.rarity) return false
    if (filter.shiny === '1' && !ownsShiny(save, mon.id)) return false
    if (filter.shiny === '0' && ownsShiny(save, mon.id)) return false
    return true
  })
}

export function chapterCapNow(save: SaveV2, chapter: ChapterDef): number {
  if (!chapter.council) return chapter.cap
  const index = Math.min(chapter.council.members.length - 1, Math.max(0, save.step - 1))
  return chapter.council.members[index].cap
}

export function councilChapter(): ChapterDef {
  const found = chapterById(1, 9)
  if (!found.council) throw new Error('Hoher Rat fehlt')
  return found
}

export function speciesNumber(id: string): number {
  return Number(id.replace(/^m/, '')) || 0
}

export function baseLine(id: string): { hp: number; atk: number; def: number; spd: number } {
  return species(id).base
}
