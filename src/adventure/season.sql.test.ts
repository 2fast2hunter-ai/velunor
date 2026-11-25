import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { PGlite } from '@electric-sql/pglite'
import { ARENA_SEASON, beastAt, inWeekend, seasonAt } from './season'

function sliceFunction(sql: string, name: string): string {
  const marker = `create or replace function public.${name}`
  const start = sql.indexOf(marker)
  if (start < 0) throw new Error(marker)
  const end = sql.indexOf('$$;', start)
  if (end < 0) throw new Error(`end ${name}`)
  return sql.slice(start, end + 3)
}

const ranksSql = readFileSync(new URL('../../supabase/migrations/20261118210000_schritt7_ranks.sql', import.meta.url), 'utf8')
const seasonSql = readFileSync(new URL('../../supabase/migrations/20261124100000_e2_arena_season.sql', import.meta.url), 'utf8')

describe('arena_season SQL', () => {
  it('matches ARENA_SEASON, the weekend and the beast on Berlin calendar days', async () => {
    const db = new PGlite()
    await db.exec(sliceFunction(ranksSql, 'board_week'))
    await db.exec(sliceFunction(seasonSql, 'arena_season'))
    await db.exec(sliceFunction(seasonSql, 'in_weekend'))
    await db.exec(sliceFunction(seasonSql, 'week_beast'))

    for (const row of ARENA_SEASON) {
      const sql = await db.query<{ season: number }>('select public.arena_season($1::timestamptz) as season', [row.at])
      expect(sql.rows[0]?.season, row.at).toBe(row.season)
      expect(sql.rows[0]?.season, row.at).toBe(seasonAt(new Date(row.at)))
    }

    const clocks = [
      '2026-11-20T16:59:00.000Z',
      '2026-11-20T17:00:00.000Z',
      '2026-11-21T12:00:00.000Z',
      '2026-11-23T02:59:00.000Z',
      '2026-11-23T03:00:00.000Z',
      '2027-03-29T01:30:00.000Z',
      '2027-03-29T02:30:00.000Z',
      '2027-11-01T02:30:00.000Z',
      '2027-11-01T03:00:00.000Z'
    ]
    for (const at of clocks) {
      const sql = await db.query<{ open: boolean }>('select public.in_weekend($1::timestamptz) as open', [at])
      expect(sql.rows[0]?.open, at).toBe(inWeekend(new Date(at)))
    }

    const weeks = [
      '2026-11-16T03:00:00.000Z',
      '2026-11-23T03:00:00.000Z',
      '2027-03-22T03:00:00.000Z',
      '2027-03-29T02:00:00.000Z',
      '2027-10-25T02:00:00.000Z',
      '2027-11-01T03:00:00.000Z'
    ]
    for (const at of weeks) {
      const sql = await db.query<{ beast: string }>('select public.week_beast($1::timestamptz) as beast', [at])
      expect(sql.rows[0]?.beast, at).toBe(beastAt(new Date(at)).id)
    }
  })

  it('closes a season with Bronze from 1167 and Velunor-Meister from 1900', () => {
    const body = sliceFunction(seasonSql, 'close_arena_season')
    expect(body).toContain("when a.rating >= 1167 then 'Bronze'")
    expect(body).toContain("when a.rating >= 1167 then 40")
    expect(body).toContain("when a.rating >= 1167 then 'bronze'")
    expect(body).toContain("when a.rating >= 1900 then 'Velunor-Meister'")
    expect(body).toContain("when a.rating >= 1700 then 'Kristall'")
    expect(body.match(/1167/g)?.length).toBe(3)
    expect(sliceFunction(seasonSql, 'coop_ensure')).toContain('public.week_beast(week_key)')
  })
})
