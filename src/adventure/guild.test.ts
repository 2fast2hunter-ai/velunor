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
  guildErrorKey,
  guildFoundBlock,
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
    const open = gameHtml(saveOf(), 'guild', now.getTime(), pc, dex, null, false, false, null, 1, undefined, {
      guild: { status: 'ready', name: '', tag: '', level: 1, points: 0, note: '' }
    })
    expect(open).toContain('id="guild-name"')
    expect(open).toContain('id="guild-tag"')
    expect(open).toContain('data-act="guild-search"')
    expect(open).toContain('id="guild-code"')
    expect(open).toContain('data-act="guild-found" disabled')
    expect(open).toContain('Gründen braucht 8 Wappen')
    expect(guildFoundBlock(7, 50_000, 1, 'Mooswacht', 'MOS').reason).toBe('crests')
    expect(guildFoundBlock(8, 1_000, 1, 'Mooswacht', 'MOS').reason).toBe('gold')
    expect(guildFoundBlock(8, 50_000, 1, 'Mo', 'MOS').reason).toBe('name')
    expect(guildFoundBlock(8, 50_000, 1, 'Mooswacht', 'MOS').disabled).toBe(false)
    expect(guildErrorKey('crests')).toBe('guild.err.crests')
    const lead = gameHtml(saveOf(), 'guild', now.getTime(), pc, dex, null, false, false, null, 1, undefined, {
      guild: {
        status: 'ready', name: 'Mooswacht', tag: 'MOS', level: 2, points: 10, note: '',
        role: 'lead', code: 'ABCD2345',
        members: [{ id: 'm1', label: 'Bea', role: 'member' }, { id: 'me', label: 'Ada', role: 'lead' }],
        requests: [{ id: 'r1', label: 'Ced' }],
        goals: [{ goal: 'chests', progress: 1, target: 300 }]
      }
    })
    expect(lead).toContain('ABCD2345')
    expect(lead).toContain('data-act="guild-accept"')
    expect(lead).toContain('data-act="guild-decline"')
    expect(lead).toContain('data-act="guild-kick"')
    expect(lead).toContain('data-act="guild-mute"')
    expect(lead).toContain('data-act="guild-role"')
    expect(lead).toContain('1/300')
    const member = gameHtml(saveOf(), 'guild', now.getTime(), pc, dex, null, false, false, null, 1, undefined, {
      guild: {
        status: 'ready', name: 'Mooswacht', tag: 'MOS', level: 2, points: 10, note: '',
        role: 'member', code: 'SECRET12',
        members: [{ id: 'me', label: 'Ada', role: 'member' }]
      }
    })
    expect(member).not.toContain('data-act="guild-kick"')
    expect(member).not.toContain('data-act="guild-mute"')
    expect(member).not.toContain('SECRET12')
  })

  it('keeps guild writes on the service role and the weekly board on the rank cron', () => {
    const sql = readFileSync(new URL('../../supabase/migrations/20261118250000_schritt13_gilden.sql', import.meta.url), 'utf8')
    expect(sql).toContain('enable row level security')
    expect(sql).toContain('grant execute on function public.guild_act')
    expect(sql).toContain('to service_role')
    expect(sql).toContain('velunor-refresh-ranks')
    expect(sql).toContain('guild_ranks')
    expect(sql).not.toContain('freier chat')
    const fix = readFileSync(new URL('../../supabase/migrations/20261119020000_guild_goals_succession.sql', import.meta.url), 'utf8')
    expect(fix).not.toContain('array array[')
    expect(fix).toContain("picked.goal_id in ('chests', 'arena', 'beast', 'expedition')")
    expect(fix).toContain("action = 'decline'")
    expect(fix).toContain('order by joined_at, user_id')
    expect(fix).toContain('delete from public.guilds g')
    expect(fix).not.toMatch(/delete from public\.guild_members m where m\.user_id/i)
  })
})

function saveOf() {
  return beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', now.getTime())
}
