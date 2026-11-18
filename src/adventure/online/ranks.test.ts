import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { beginAdventure } from '../save'
import { gameHtml, type CodexQuery, type PcQuery } from '../view'
import { auditSync } from './check'
import {
  BOARDS,
  COUNCILS,
  CRESTS,
  aroundSlice,
  boardWeek,
  displayRank,
  eligibleRank,
  grantWeekly,
  hideBlocked,
  honorIds,
  inBoardWeek,
  parseRankPage,
  progressParts,
  publicLabel,
  rewardTier,
  topSlice
} from './ranks'
import { auditFromSave } from './snapshot'

const pc: PcQuery = { q: '', type: '', rarity: '', shiny: '', sort: 'newest', dir: -1 }
const dex: CodexQuery = { q: '', type: '', rarity: '', shiny: '' }

describe('leaderboards', () => {
  it('opens the week on Monday at 04:00 Europe/Berlin', () => {
    expect(boardWeek(new Date('2026-11-16T02:59:00Z')).toISOString()).toBe('2026-11-09T03:00:00.000Z')
    expect(boardWeek(new Date('2026-11-16T03:00:00Z')).toISOString()).toBe('2026-11-16T03:00:00.000Z')
    expect(boardWeek(new Date('2026-11-15T22:00:00Z')).toISOString()).toBe('2026-11-09T03:00:00.000Z')
    expect(boardWeek(new Date('2026-07-06T01:59:00Z')).toISOString()).toBe('2026-06-29T02:00:00.000Z')
    expect(boardWeek(new Date('2026-07-06T02:00:00Z')).toISOString()).toBe('2026-07-06T02:00:00.000Z')
    const start = boardWeek(new Date('2026-11-16T03:00:00Z'))
    expect(inBoardWeek(new Date('2026-11-16T03:00:00Z'), new Date('2026-11-18T12:00:00Z'))).toBe(true)
    expect(inBoardWeek(new Date(start.getTime() - 1), new Date('2026-11-18T12:00:00Z'))).toBe(false)
  })

  it('drops flag 2, keeps flag 1 visible, and pays a week only once', () => {
    const rows = [
      { user: 'cheat', score: 99, flag: 2 as const, label: 'Cheat#0001' },
      { user: 'flagged', score: 50, flag: 1 as const, label: 'Spieler#0002' },
      ...Array.from({ length: 10 }, (_, index) => ({
        user: `u${index}`,
        score: 40 - index,
        flag: 0 as const,
        label: `Ada#${String(index).padStart(4, '0')}`
      }))
    ]
    expect(displayRank(rows).some((row) => row.user === 'cheat')).toBe(false)
    expect(displayRank(rows).some((row) => row.user === 'flagged')).toBe(true)
    expect(eligibleRank(rows).some((row) => row.flag !== 0)).toBe(false)
    const first = grantWeekly([], '2026-11-09T03:00:00.000Z', 'codex', rows)
    expect(first.some((row) => row.user === 'cheat' || row.user === 'flagged')).toBe(false)
    expect(first.find((row) => row.place === 1)).toMatchObject({ marks: 100, title: 'Kodexlicht', tier: 'top1' })
    expect(first.find((row) => row.place === 2)?.marks).toBe(20)
    expect(grantWeekly(first, '2026-11-09T03:00:00.000Z', 'codex', rows)).toEqual([])
    expect(rewardTier(1, 100)).toBe('top1')
    expect(rewardTier(2, 100)).toBe('top10')
    expect(rewardTier(11, 100)).toBe('top50')
    expect(rewardTier(51, 100)).toBeNull()
  })

  it('ranks the top 100 and ten places either side, and hides a blocked name', () => {
    const ranked = displayRank(Array.from({ length: 120 }, (_, index) => ({
      user: String(index).padStart(3, '0'),
      score: 200 - index,
      flag: 0 as const,
      label: index === 14 ? 'Block#1111' : `Spiel#${index}`
    })))
    expect(topSlice(ranked)).toHaveLength(100)
    expect(aroundSlice(ranked, 40).map((row) => row.place)[0]).toBe(30)
    expect(aroundSlice(ranked, 40).at(-1)?.place).toBe(50)
    const hidden = publicLabel('Testling', '9411', true)
    expect(hidden).toBe('Spieler#9411')
    const visible = hideBlocked(ranked.map((row) => ({ ...row, self: row.place === 40 })), ['Block#1111'])
    expect(visible.some((row) => row.label === 'Block#1111')).toBe(false)
    expect(visible.some((row) => row.self)).toBe(true)
    expect(progressParts(3, ['Kieselwappen', 'Ratsiegel'])).toEqual({ region: 3, crests: 1, council: 1, score: 300101 })
    expect(honorIds([{ week: 'w', user: 'a', board: 'codex', tier: 'top1', marks: 100, title: 'Kodexlicht', place: 1 }])).toEqual(['codex', 'ehren'])
  })

  it('keeps luck tokens out of the cheat check and reads a rank page', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    const before = auditFromSave(save)
    save.marks += 500
    save.mastery = { m01: 60_000 }
    const after = auditFromSave(save)
    expect(after.masteryRanks).toBe(5)
    expect(auditSync(before, after).reasons).not.toContain('marks')
    const page = parseRankPage({
      status: 'ready',
      top: [{ place: 4, label: 'Spieler#2222', score: 3, detail: { region: 2, crests: 1, council: 0 }, self: true }],
      around: [],
      honors: ['progress']
    })
    expect(page.top[0].detail).toBe('Region 2 · 1 Wappen · 0 Rat')
    expect(page.honors).toEqual(['progress'])
    expect(parseRankPage({ status: 'offline' }).status).toBe('offline')
  })

  it('shows the own row, six frames and no friends filter', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    const html = gameHtml(save, 'ranks', 1_000, pc, dex, null, false, false, null, 1, undefined, {
      ranks: {
        board: 'codex',
        status: 'ready',
        excluded: false,
        honors: ['codex'],
        top: [{ place: 1, label: 'Spieler#1111', score: 4, detail: '', self: true }],
        around: []
      }
    })
    expect(html).toContain('is-me')
    expect(html).toContain('Spieler#1111')
    expect(html).toContain('rank-frame on')
    expect(html).not.toContain('Freunde')
    expect(BOARDS).toHaveLength(5)
    const offline = gameHtml(save, 'ranks', 1_000, pc, dex, null, false, false, null)
    expect(offline).toContain('Dein Spielstand bleibt auf diesem Gerät')
    const sql = readFileSync(new URL('../../../supabase/migrations/20261118210000_schritt7_ranks.sql', import.meta.url), 'utf8')
    expect(sql).toContain('Europe/Berlin')
    expect(sql).toContain("interval '4 hours'")
    expect(sql).toContain('flag_level < 2')
    expect(sql).toContain('p.flag_level = 0')
    expect(sql).toContain('primary key (week, user_id, board)')
    expect(sql).toContain('on conflict (week, user_id, board) do nothing')
    expect(sql).toContain('create extension if not exists pg_cron')
    expect(sql).toContain("'*/10 * * * *'")
    expect(sql).toContain("'Spieler#'")
    for (const name of [...CRESTS, ...COUNCILS]) expect(sql).toContain(name)
  })
})
