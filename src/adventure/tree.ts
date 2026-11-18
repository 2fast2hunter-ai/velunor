import { COUNCILS } from './online/ranks'
import { masteryLevel } from './mastery'
import { OFFLINE_CAP_MS, OFFLINE_EXP_FACTOR } from './const'
import type { SaveV2 } from './types'

/**
 * Node costs are the spec sequence doubled (2/2/4/4/6/6/8/10).
 * Three branches then cost 126. The point cap is 80, so the whole tree does not fit.
 */
export const NODE_COSTS = [2, 2, 4, 4, 6, 6, 8, 10] as const
export const TREE_POINT_CAP = 80
export const TREE_UNLOCK_CRESTS = 3
export const RESPEC_GOLD = 5_000
export const CHEST_SHINY_BASE = 1 / 200
export const HOUR_MS = 60 * 60 * 1000
export const TREE_CAP_MAX_MS = 12 * HOUR_MS

export type BranchId = 'chest' | 'fight' | 'time'

export interface TreeNode {
  id: string
  branch: BranchId
  index: number
  cost: number
  nameDe: string
  nameEn: string
  textDe: string
  textEn: string
}

const CHEST: Array<[string, string, string, string]> = [
  ['Splitter I', 'Shards I', 'Splitter aus wilden Kämpfen +10 %.', 'Wild-fight shards +10%.'],
  ['Splitter II', 'Shards II', 'Splitter aus wilden Kämpfen +20 %.', 'Wild-fight shards +20%.'],
  ['Splitter III', 'Shards III', 'Splitter aus wilden Kämpfen +30 %.', 'Wild-fight shards +30%.'],
  ['Schimmer I', 'Shimmer I', 'Schimmerchance aus Truhen +10 %, auf 1/200 gerechnet. Steht in den Truhen-Chancen.', 'Chest shimmer +10% on a 1/200 base. Shown with the chest rates.'],
  ['Schimmer II', 'Shimmer II', 'Schimmerchance aus Truhen +20 %.', 'Chest shimmer +20%.'],
  ['Doppelspur', 'Duplicate trace', 'Duplikate aus Truhen geben 25 % mehr Meisterschafts-EP.', 'Chest duplicates grant 25% more mastery EP.'],
  ['Kürzerer Weg', 'Shorter road', 'Wegtruhen brauchen 10 % weniger Zeit.', 'Road chests need 10% less time.'],
  ['Siegelmeister', 'Seal master', 'Einmal am Tag eine zweite Ziehung, wenn die Truhe Seltenheit 6 oder höher trifft. Die bessere Ziehung bleibt.', 'Once a day, a second draw when a chest hits rarity 6 or higher. The better draw stays.']
]

const FIGHT: Array<[string, string, string, string]> = [
  ['Schlag I', 'Strike I', 'ATK +3 % in jedem Kampf.', 'ATK +3% in every fight.'],
  ['Schlag II', 'Strike II', 'ATK +6 %.', 'ATK +6%.'],
  ['Schlag III', 'Strike III', 'ATK +10 %.', 'ATK +10%.'],
  ['Krit I', 'Crit I', 'Kritische Treffer +2 Prozentpunkte.', 'Critical hits +2 percentage points.'],
  ['Krit II', 'Crit II', 'Kritische Treffer +5 Prozentpunkte.', 'Critical hits +5 percentage points.'],
  ['Typvorteil', 'Type edge', 'Typvorteil steigt von 1,5 auf 1,6.', 'Type advantage rises from 1.5 to 1.6.'],
  ['Wächterhaut', 'Warden hide', 'Im Wächter- und Ratskampf hat das eigene Team +10 % HP.', 'In warden and council fights the team has +10% HP.'],
  ['Letzter Atem', 'Last breath', 'Einmal je Wächter- oder Ratskampf überlebt ein Monster mit 1 HP.', 'Once each warden or council fight, a monster survives at 1 HP.']
]

const TIME: Array<[string, string, string, string]> = [
  ['Stunde I', 'Hour I', 'Offline-Deckel +1 Stunde, auf 9 Stunden.', 'Offline cap +1 hour, to 9 hours.'],
  ['Stunde II', 'Hour II', 'Offline-Deckel +4 Stunden, auf 12 Stunden.', 'Offline cap +4 hours, to 12 hours.'],
  ['Nachklang I', 'Echo I', 'Offline-EP von ×0,5 auf ×0,6.', 'Offline EP from ×0.5 to ×0.6.'],
  ['Nachklang II', 'Echo II', 'Offline-EP auf ×0,7.', 'Offline EP to ×0.7.'],
  ['Münze I', 'Coin I', 'Gold aus Kämpfen und Funden +5 %.', 'Gold from fights and finds +5%.'],
  ['Münze II', 'Coin II', 'Gold aus Kämpfen und Funden +10 %.', 'Gold from fights and finds +10%.'],
  ['Expedition', 'Expedition', 'Ein weiterer Expeditionsslot, zusätzlich zu den drei festen.', 'One more expedition slot, on top of the three fixed ones.'],
  ['Zeitweber', 'Time weaver', 'Früchte halten 90 statt 60 Minuten.', 'Fruits last 90 minutes instead of 60.']
]

function column(branch: BranchId, rows: Array<[string, string, string, string]>): TreeNode[] {
  return rows.map((row, index) => ({
    id: `${branch}-${index + 1}`,
    branch,
    index,
    cost: NODE_COSTS[index],
    nameDe: row[0],
    nameEn: row[1],
    textDe: row[2],
    textEn: row[3]
  }))
}

export const TREE_NODES: TreeNode[] = [
  ...column('chest', CHEST),
  ...column('fight', FIGHT),
  ...column('time', TIME)
]

const BY_ID = new Map(TREE_NODES.map((node) => [node.id, node]))

export function treeNode(id: string): TreeNode | undefined {
  return BY_ID.get(id)
}

export function normalizeTreeNodes(ids: readonly string[]): string[] {
  const set = new Set(ids)
  const kept: string[] = []
  for (const branch of ['chest', 'fight', 'time'] as const) {
    for (const node of branchNodes(branch)) {
      if (!set.has(node.id)) break
      kept.push(node.id)
    }
  }
  return kept
}

export function branchNodes(branch: BranchId): TreeNode[] {
  return TREE_NODES.filter((node) => node.branch === branch)
}

function owned(save: SaveV2): Set<string> {
  return new Set(save.tree?.nodes ?? [])
}

function rank(save: SaveV2, branch: BranchId): number {
  const set = owned(save)
  let have = 0
  for (const node of branchNodes(branch)) {
    if (!set.has(node.id)) break
    have += 1
  }
  return have
}

export function isCouncilBadge(badge: string): boolean {
  return (COUNCILS as readonly string[]).includes(badge) || badge.includes('Ratsiegel')
}

export function treePointParts(save: SaveV2): { crests: number, councils: number, dex: number, mastery: number, earned: number } {
  const badges = [...new Set(save.badges ?? [])]
  const crests = Math.min(40, badges.filter((badge) => !isCouncilBadge(badge)).length)
  const councils = Math.min(5, badges.filter((badge) => isCouncilBadge(badge)).length)
  const caught = Object.values(save.dex ?? {}).filter((entry) => entry.caught > 0).length
  const dex = Math.min(10, Math.floor(caught / 10))
  let mastery = 0
  for (const ep of Object.values(save.mastery ?? {})) {
    if (masteryLevel(Number(ep) || 0) >= 5) mastery += 1
  }
  mastery = Math.min(15, mastery)
  return { crests, councils, dex, mastery, earned: Math.min(TREE_POINT_CAP, crests + councils * 3 + dex + mastery) }
}

export function treeSpent(save: SaveV2): number {
  let spent = 0
  for (const id of owned(save)) spent += treeNode(id)?.cost ?? 0
  return spent
}

export function treeFree(save: SaveV2): number {
  return Math.max(0, treePointParts(save).earned - treeSpent(save))
}

export function treeUnlocked(save: SaveV2): boolean {
  return treePointParts(save).crests >= TREE_UNLOCK_CRESTS
}

export function berlinDay(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export function respecCost(save: SaveV2, now: number): number {
  if (!treeSpent(save)) return 0
  if ((save.tree?.resetDay ?? '') !== berlinDay(new Date(now))) return 0
  return RESPEC_GOLD * Math.max(1, Math.floor(save.region) || 1)
}

export function canBuy(save: SaveV2, id: string): boolean {
  const node = treeNode(id)
  if (!node || !treeUnlocked(save) || owned(save).has(id)) return false
  if (node.index > 0) {
    const prev = branchNodes(node.branch)[node.index - 1]
    if (!owned(save).has(prev.id)) return false
  }
  return treeFree(save) >= node.cost
}

export function buyNode(save: SaveV2, id: string): string | null {
  if (!treeUnlocked(save)) return 'Der Baum öffnet ab dem dritten Wappen.'
  if (!canBuy(save, id)) return 'Der Knoten ist noch zu.'
  if (!save.tree) save.tree = { nodes: [], resetDay: '', sealDay: '' }
  save.tree.nodes.push(id)
  return null
}

export function respecTree(save: SaveV2, now: number): string | null {
  const cost = respecCost(save, now)
  if (!treeSpent(save)) return 'Es ist nichts gesetzt.'
  if (save.gold < cost) return 'Zu wenig Gold.'
  save.gold -= cost
  if (!save.tree) save.tree = { nodes: [], resetDay: '', sealDay: '' }
  save.tree.nodes = []
  save.tree.resetDay = berlinDay(new Date(now))
  return null
}

export function treeShardBonus(save: SaveV2): number {
  const have = rank(save, 'chest')
  if (have >= 3) return 0.3
  if (have >= 2) return 0.2
  if (have >= 1) return 0.1
  return 0
}

export function chestShinyChance(save: SaveV2): number {
  const have = rank(save, 'chest')
  const mult = have >= 5 ? 1.2 : have >= 4 ? 1.1 : 1
  return CHEST_SHINY_BASE * mult
}

export function treeDupeMastery(save: SaveV2): number {
  return rank(save, 'chest') >= 6 ? 1.25 : 1
}

export function treeRoadCut(save: SaveV2): number {
  return rank(save, 'chest') >= 7 ? 0.1 : 0
}

export function sealReady(save: SaveV2, now: number): boolean {
  if (rank(save, 'chest') < 8) return false
  return (save.tree?.sealDay ?? '') !== berlinDay(new Date(now))
}

export function markSeal(save: SaveV2, now: number): void {
  if (!save.tree) save.tree = { nodes: [], resetDay: '', sealDay: '' }
  save.tree.sealDay = berlinDay(new Date(now))
}

export function treeAtkBonus(save: SaveV2): number {
  const have = rank(save, 'fight')
  if (have >= 3) return 0.1
  if (have >= 2) return 0.06
  if (have >= 1) return 0.03
  return 0
}

export function treeCritAdd(save: SaveV2): number {
  const have = rank(save, 'fight')
  if (have >= 5) return 0.05
  if (have >= 4) return 0.02
  return 0
}

export function treeStrongType(save: SaveV2): number {
  return rank(save, 'fight') >= 6 ? 1.6 : 1.5
}

export function treeGuardHp(save: SaveV2): number {
  return rank(save, 'fight') >= 7 ? 0.1 : 0
}

export function treeLastBreath(save: SaveV2): boolean {
  return rank(save, 'fight') >= 8
}

export function treeCapMs(save: SaveV2): number {
  const have = rank(save, 'time')
  const hours = have >= 2 ? 12 : have >= 1 ? 9 : 8
  return Math.min(TREE_CAP_MAX_MS, hours * HOUR_MS)
}

export function treeOfflineFactor(save: SaveV2): number {
  const have = rank(save, 'time')
  if (have >= 4) return 0.7
  if (have >= 3) return 0.6
  return OFFLINE_EXP_FACTOR
}

export function treeGoldMult(save: SaveV2): number {
  const have = rank(save, 'time')
  if (have >= 6) return 1.1
  if (have >= 5) return 1.05
  return 1
}

/** One extra expedition slot once this node is bought. */
export function treeExpeditionSlots(save: SaveV2): number {
  return rank(save, 'time') >= 7 ? 1 : 0
}

export function treeFruitMs(save: SaveV2): number {
  return rank(save, 'time') >= 8 ? 90 * 60 * 1000 : 60 * 60 * 1000
}

export function treeAudit(save: SaveV2): { treeGold: number, treeCapMs: number } {
  return {
    treeGold: treeGoldMult(save),
    treeCapMs: Math.max(OFFLINE_CAP_MS, treeCapMs(save))
  }
}
