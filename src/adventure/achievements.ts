import { monsters, typeName, typesCfg } from '../data'
import { t } from './i18n'
import { regionRoster } from './dex'
import type { SaveV2 } from './types'
import type { TypeId } from '../types'

export interface Goal {
  id: string
  name: string
  title: string
  frame: string
  gold: number
  met: (save: SaveV2) => boolean
}

const WAPPEN = [
  ['Kieselwappen', 'Kieselträger', 'stone'],
  ['Wellenwappen', 'Wellenläufer', 'tide'],
  ['Funkenwappen', 'Funkenhüter', 'spark'],
  ['Moorwappen', 'Moorwächter', 'veil'],
  ['Felswappen', 'Felssetzer', 'stone'],
  ['Sturmwappen', 'Sturmrufer', 'night'],
  ['Frostwappen', 'Frostmark', 'frost'],
  ['Klingenwappen', 'Klingenträger', 'ember']
] as const

function caughtCount(save: SaveV2): number {
  return Object.values(save.dex).filter((entry) => entry.caught > 0).length
}

function seenCount(save: SaveV2): number {
  return Object.values(save.dex).filter((entry) => entry.seen > 0).length
}

function regionDone(save: SaveV2, regionId: number): boolean {
  const roster = regionRoster(regionId)
  return roster.length > 0 && roster.every((id) => (save.dex[id]?.caught ?? 0) > 0)
}

function typeDone(save: SaveV2, type: string): boolean {
  const all = monsters.filter((mon) => mon.type === type)
  return all.length > 0 && all.every((mon) => (save.dex[mon.id]?.caught ?? 0) > 0)
}

function atLeast(read: (save: SaveV2) => number, need: number): (save: SaveV2) => boolean {
  return (save) => read(save) >= need
}

const wins = (save: SaveV2) => save.stats.wins
const catches = (save: SaveV2) => save.stats.catches
const dupes = (save: SaveV2) => save.stats.dupes
const eggs = (save: SaveV2) => save.stats.eggs
const shinies = (save: SaveV2) => save.stats.shinies
const level = (save: SaveV2) => Math.max(0, ...Object.values(save.mons).map((mon) => mon.lvl))

function row(id: string, name: string, title: string, frame: string, gold: number, met: (save: SaveV2) => boolean): Goal {
  return { id, name, title, frame, gold, met }
}

const typeGoals: Goal[] = (Object.keys(typesCfg.names) as TypeId[]).map((type) => row(
  `type-${type}`,
  `Alle ${typeName(type)}-Arten`,
  `Kenner der ${typeName(type)}`,
  'leaf',
  8000,
  (save) => typeDone(save, type)
))

export const GOALS: Goal[] = [
  row('win-10', '10 Siege', 'Wegbereiter', 'gold', 500, atLeast(wins, 10)),
  row('win-100', '100 Siege', 'Hundertkämper', 'night', 4000, atLeast(wins, 100)),
  row('win-1000', '1.000 Siege', 'Tausendkämper', 'ember', 25000, atLeast(wins, 1000)),
  row('catch-10', '10 Fänge', 'Fänger', 'tide', 500, atLeast(catches, 10)),
  row('catch-100', '100 Fänge', 'Bannmeister', 'tide', 4000, atLeast(catches, 100)),
  row('catch-500', '500 Fänge', 'Siegelhüter', 'gold', 20000, atLeast(catches, 500)),
  row('dupe-10', '10 Duplikate', 'Sammler', 'plain', 400, atLeast(dupes, 10)),
  row('dupe-100', '100 Duplikate', 'Archivar', 'plain', 3000, atLeast(dupes, 100)),
  row('dupe-1000', '1.000 Duplikate', 'Hüter der Arten', 'gold', 15000, atLeast(dupes, 1000)),
  ...WAPPEN.map(([badge, title, frame]) => row(`badge-${badge}`, badge, title, frame, 2000, (save) => save.badges.includes(badge))),
  row('badge-Ratsiegel', 'Ratsiegel', 'Ratsmitglied', 'gold', 10000, (save) => save.badges.includes('Ratsiegel')),
  row('region-1', 'Grünmark komplett', 'Markgraf', 'leaf', 20000, (save) => regionDone(save, 1)),
  row('region-2', 'Frostküste komplett', 'Küstenwächter', 'frost', 50000, (save) => regionDone(save, 2)),
  ...typeGoals,
  row('egg-1', 'Erstes Ei', 'Brutpfleger', 'plain', 500, atLeast(eggs, 1)),
  row('egg-10', '10 Eier', 'Nester', 'leaf', 3000, atLeast(eggs, 10)),
  row('egg-50', '50 Eier', 'Hortmeister', 'gold', 15000, atLeast(eggs, 50)),
  row('shiny-1', 'Erster Schimmer', 'Glanzsucher', 'spark', 2000, atLeast(shinies, 1)),
  row('shiny-10', '10 Schimmer', 'Lichtträger', 'spark', 25000, atLeast(shinies, 10)),
  row('level-10', 'Ein Monster auf Lv 10', 'Lehrling', 'plain', 400, atLeast(level, 10)),
  row('level-25', 'Ein Monster auf Lv 25', 'Erfahrener', 'night', 2500, atLeast(level, 25)),
  row('level-50', 'Ein Monster auf Lv 50', 'Veteran', 'ember', 12000, atLeast(level, 50)),
  row('dex-10', '10 Arten gefangen', 'Kodexanwärter', 'plain', 800, atLeast(caughtCount, 10)),
  row('dex-25', '25 Arten gefangen', 'Kodexschreiber', 'leaf', 2500, atLeast(caughtCount, 25)),
  row('dex-50', '50 Arten gefangen', 'Kodexhüter', 'night', 8000, atLeast(caughtCount, 50)),
  row('dex-100', '100 Arten gefangen', 'Kodexmeister', 'gold', 40000, atLeast(caughtCount, 100)),
  row('seen-100', '100 Arten gesichtet', 'Späher des Kodex', 'veil', 10000, atLeast(seenCount, 100)),
  row('hort-2', 'Hortplatz 2', 'Hortbauer', 'leaf', 1500, (save) => save.hortSlots >= 2),
  row('hort-3', 'Hortplatz 3', 'Hortvogt', 'stone', 8000, (save) => save.hortSlots >= 3),
  row('hort-4', 'Hortplatz 4', 'Hortfürst', 'gold', 20000, (save) => save.hortSlots >= 4),
  row('team-6', 'Team aus 6', 'Sechserzug', 'tide', 1000, (save) => save.team.length >= 6),
  row('fruit-10', '10 Früchte gegessen', 'Fruchtkenner', 'leaf', 3000, (save) => save.stats.fruitsUsed >= 10),
  row('crystal-10', '10 Kristalle gegeben', 'Kristallhand', 'spark', 3000, (save) => save.stats.crystalsUsed >= 10),
  row('hort-guest', 'Ein Monster im Hort', 'Hortgast', 'plain', 300, (save) => save.hort.length >= 1)
]

export function goalById(id: string): Goal | undefined {
  return GOALS.find((goal) => goal.id === id)
}

export function equippedTitle(save: SaveV2): string {
  const goal = save.equippedTitle ? goalById(save.equippedTitle) : undefined
  return goal?.title ?? ''
}

export function equippedFrame(save: SaveV2): string {
  const goal = save.equippedFrame ? goalById(save.equippedFrame) : undefined
  return goal?.frame ?? ''
}

/** Grant every newly met goal once. Gold is paid immediately. */
export function syncAchievements(save: SaveV2): string[] {
  if (!save.claimed) save.claimed = []
  const fresh: string[] = []
  for (const goal of GOALS) {
    if (save.claimed.includes(goal.id) || !goal.met(save)) continue
    save.claimed.push(goal.id)
    save.gold += goal.gold
    fresh.push(goal.id)
    save.log.push({ t: Date.now(), text: t(save.settings?.lang, 'say.achieve', { name: goal.name, gold: goal.gold.toLocaleString(save.settings?.lang === 'en' ? 'en' : 'de-DE'), title: goal.title }) })
  }
  if (save.log.length > 50) save.log.splice(0, save.log.length - 50)
  return fresh
}

export function equipTitle(save: SaveV2, id: string): void {
  if (save.claimed.includes(id)) save.equippedTitle = id
}

export function equipFrame(save: SaveV2, id: string): void {
  if (save.claimed.includes(id)) save.equippedFrame = id
}
