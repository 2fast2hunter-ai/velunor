import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { beginAdventure } from './save'
import { expeditionSlots } from './expedition'
import { LEVEL_HP } from './coop'
import { gameHtml, type CodexQuery, type PcQuery } from './view'
import {
  BEAST_SCALE,
  CREST_NEED,
  FOUND_GOLD,
  GOAL_MARKS,
  GOALS,
  GUILD_LEVELS,
  MEMBER_CAP,
  PHRASES,
  credit,
  foundCost,
  guildBeastHp,
  guildLevel,
  guildNameIssue,
  guildTagIssue,
  guildTextIssue,
  nextLeader,
  phraseOk,
  rewardFor,
  weekGoals
} from './guild'

const pc: PcQuery = { q: '', type: '', rarity: '', shiny: '', sort: 'newest', dir: -1 }
const dex: CodexQuery = { q: '', type: '', rarity: '', shiny: '' }
const now = new Date('2026-11-18T12:00:00Z')

describe('guilds', () => {
  it('prices a founding, filters the name and keeps twenty members', () => {
    expect(CREST_NEED).toBe(8)
    expect(foundCost(1)).toBe(FOUND_GOLD)
    expect(foundCost(3)).toBe(150_000)
    expect(guildNameIssue('Ok')).toBe('short')
    expect(guildNameIssue('A'.repeat(20))).toBeNull()
    expect(guildNameIssue('A'.repeat(21))).toBe('long')
    expect(guildNameIssue('Arschbande')).toBe('word')
    expect(guildTagIssue('AB')).toBe('short')
    expect(guildTagIssue('ABC')).toBeNull()
    expect(guildTagIssue('FUK')).toBe('word')
    expect(guildTextIssue('eine ruhige Runde')).toBeNull()
    expect(guildTextIssue('du hurensohn')).toBe('word')
    expect(MEMBER_CAP).toBe(20)
    expect(GOALS.find((goal) => goal.id === 'chests')?.target).toBe(300)
    expect(GOALS.find((goal) => goal.id === 'arena')?.target).toBe(30)
    expect(GOALS.find((goal) => goal.id === 'beast')?.target).toBe(6)
    expect(GOALS.find((goal) => goal.id === 'expedition')?.target).toBe(50)
    expect(GOALS.map((goal) => goal.id).join(',')).not.toContain('catch')
  })

  it('picks three stable goals, pays only a contributor, and opens the expedition slot at level 5', () => {
    expect(weekGoals(now)).toEqual(weekGoals(now))
    expect(weekGoals(now)).toHaveLength(3)
    expect(credit(10, 1000, 300)).toBe(300)
    expect(rewardFor(0, true, false)).toEqual({ marks: 0, fruits: 0, points: 0 })
    expect(rewardFor(1, true, false).marks).toBe(GOAL_MARKS)
    expect(rewardFor(1, true, true).points).toBe(0)
    expect(guildLevel(0)).toBe(1)
    expect(guildLevel(GUILD_LEVELS[4])).toBe(5)
    expect(guildLevel(GUILD_LEVELS[9])).toBe(10)
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', now.getTime())
    expect(expeditionSlots(save, 4)).toBe(expeditionSlots(save, 0))
    expect(expeditionSlots(save, 5)).toBe(expeditionSlots(save, 0) + 1)
    expect(guildBeastHp(1)).toBe(LEVEL_HP[0] * BEAST_SCALE)
    expect(PHRASES).toHaveLength(30)
    expect(phraseOk('hallo')).toBe(true)
    expect(phraseOk('freier chat text')).toBe(false)
  })

  it('gives a vacant lead to the deputy, otherwise to the oldest member', () => {
    const members = [
      { id: 'lead', role: 'lead' as const, joinedAt: 1, contrib: 1 },
      { id: 'old', role: 'member' as const, joinedAt: 2, contrib: 0 },
      { id: 'dep', role: 'deputy' as const, joinedAt: 3, contrib: 0 }
    ]
    expect(nextLeader(members, 'lead')).toBe('dep')
    expect(nextLeader(members.filter((member) => member.id !== 'dep'), 'lead')).toBe('old')
    expect(nextLeader([{ id: 'lead', role: 'lead', joinedAt: 1, contrib: 0 }], 'lead')).toBeNull()
    const html = gameHtml(saveOf(), 'guild', now.getTime(), pc, dex, null, false, false, null, 1, undefined, {
      guild: { status: 'ready', name: 'Mooswacht', tag: 'MOS', level: 5, points: 1400, note: '' }
    })
    expect(html).toContain('data-art="guild/shape-shield"')
    expect(html).toContain('data-art="guild/symbol-leaf"')
    expect(html).toContain('data-art="guild/color-moss"')
    expect(html).toContain('Mooswacht')
    const offline = gameHtml(saveOf(), 'guild', now.getTime(), pc, dex, null, false, false, null)
    expect(offline).toContain('Offline')
  })

  it('keeps guild writes on the service role and the weekly board on the rank cron', () => {
    const sql = readFileSync(new URL('../../supabase/migrations/20261118250000_schritt13_gilden.sql', import.meta.url), 'utf8')
    expect(sql).toContain('enable row level security')
    expect(sql).toContain('grant execute on function public.guild_act')
    expect(sql).toContain('to service_role')
    expect(sql).toContain('velunor-refresh-ranks')
    expect(sql).toContain('guild_ranks')
    expect(sql).not.toContain('freier chat')
  })
})

function saveOf() {
  return beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', now.getTime())
}
