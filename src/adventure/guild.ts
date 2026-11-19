import { hashSeed, mulberry32 } from '../rng'
import { bannedWord, nameIssue } from './online/name'
import { LEVEL_HP } from './coop'
import { boardWeek } from './online/ranks'

export const FOUND_GOLD = 50_000
export const CREST_NEED = 8
export const MEMBER_CAP = 20
export const GUILD_LEVELS = [0, 200, 500, 900, 1_400, 2_000, 2_800, 3_800, 5_000, 6_500] as const
export const GOAL_POINTS = 100
export const GOAL_MARKS = 25
export const GOAL_FRUITS = 2
export const BEAST_SCALE = 5
export const GUILD_BEAST_CAP = 20

export const GOALS = [
  { id: 'chests', target: 300 },
  { id: 'arena', target: 30 },
  { id: 'beast', target: 6 },
  { id: 'expedition', target: 50 }
] as const

export type GoalId = (typeof GOALS)[number]['id']
export type GuildRole = 'lead' | 'deputy' | 'member'
export type JoinMode = 'open' | 'request' | 'code'

export const SHAPES = ['shield', 'circle', 'banner', 'diamond'] as const
export const SYMBOLS = ['star', 'leaf', 'wave', 'flame'] as const
export const COLORS = ['moss', 'gold', 'sky', 'berry'] as const

export const PHRASES = [
  'hallo', 'danke', 'los', 'pause', 'stark', 'hilfe', 'geschafft', 'nochmal',
  'truhe', 'arena', 'biest', 'expedition', 'heute', 'morgen', 'bereit', 'warte',
  'gut', 'knapp', 'feier', 'ruhe', 'fokus', 'team', 'wappen', 'nacht',
  'welle', 'stern', 'blatt', 'flamme', 'ja', 'nein'
] as const

export function foundCost(region: number): number {
  return FOUND_GOLD * Math.max(1, Math.min(5, Math.floor(region) || 1))
}

export function guildNameIssue(raw: string): 'short' | 'long' | 'chars' | 'word' | null {
  return nameIssue(raw, 20)
}

export function guildTagIssue(raw: string): 'short' | 'chars' | 'word' | null {
  const tag = raw.trim().toUpperCase()
  if (tag.length !== 3) return 'short'
  if (!/^[A-Z]{3}$/.test(tag)) return 'chars'
  if (bannedWord(tag)) return 'word'
  return null
}

export function guildTextIssue(raw: string): 'long' | 'word' | null {
  const text = raw.trim()
  if (text.length > 80) return 'long'
  if (text && bannedWord(text)) return 'word'
  return null
}

export function weekGoals(now: Date): GoalId[] {
  const week = boardWeek(now).toISOString()
  const rng = mulberry32(hashSeed(`velunor-guild-${week}`) || 1)
  const ids = GOALS.map((goal) => goal.id)
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const swap = ids[i]
    ids[i] = ids[j]
    ids[j] = swap
  }
  return ids.slice(0, 3)
}

export function guildLevel(points: number): number {
  let level = 1
  for (let i = 0; i < GUILD_LEVELS.length; i++) {
    if (points >= GUILD_LEVELS[i]) level = i + 1
  }
  return level
}

export function guildBeastHp(level: number): number {
  const index = Math.max(1, Math.min(10, Math.floor(level) || 1)) - 1
  return LEVEL_HP[index] * BEAST_SCALE
}

export interface GuildMember {
  id: string
  role: GuildRole
  joinedAt: number
  contrib: number
}

export function nextLeader(members: readonly GuildMember[], leaving: string): string | null {
  const rest = members.filter((member) => member.id !== leaving)
  if (!rest.length) return null
  const deputy = rest.find((member) => member.role === 'deputy')
  if (deputy) return deputy.id
  return [...rest].sort((a, b) => a.joinedAt - b.joinedAt || (a.id < b.id ? -1 : 1))[0].id
}

export function credit(progress: number, delta: number, target: number): number {
  return Math.max(0, Math.min(target, progress + Math.max(0, Math.floor(delta) || 0)))
}

export function rewardFor(contrib: number, done: boolean, claimed: boolean): { marks: number, fruits: number, points: number } {
  if (!done || claimed || contrib < 1) return { marks: 0, fruits: 0, points: 0 }
  return { marks: GOAL_MARKS, fruits: GOAL_FRUITS, points: GOAL_POINTS }
}

export function phraseOk(id: string): boolean {
  return (PHRASES as readonly string[]).includes(id)
}

/** Guild mute: only the lead and the deputy, and never against the lead. */
export function mayGuildMute(actor: GuildRole | null, target: GuildRole | null): 'ok' | 'member' | 'role' | 'lead' {
  if (actor !== 'lead' && actor !== 'deputy') return actor ? 'role' : 'member'
  if (!target) return 'member'
  if (target === 'lead') return 'lead'
  return 'ok'
}

/**
 * Edge-level gate for guild actions. SQL repeats it inside guild_act.
 * `state` and `search` stay open. Founding and joining require no current guild.
 */
export function guildActionDenial(action: string, role: GuildRole | null): 'missing' | 'member' | 'role' | null {
  if (action === 'state' || action === 'search') return null
  if (action === 'found' || action === 'join') return role ? 'member' : null
  if (!role) return 'missing'
  if (action === 'kick' || action === 'role' || action === 'emblem') return role === 'lead' ? null : 'role'
  if (action === 'accept' || action === 'decline') return role === 'member' ? 'role' : null
  return null
}
