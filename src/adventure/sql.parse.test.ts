import { readdirSync, readFileSync } from 'node:fs'
import { Buffer } from 'node:buffer'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const { loadModule, parseSync, parsePlPgSQLSync } = createRequire(import.meta.url)('libpg-query') as {
  loadModule: () => Promise<void>
  parseSync: (sql: string) => { stmts?: { stmt: Record<string, unknown>, stmt_location?: number, stmt_len?: number }[] }
  parsePlPgSQLSync: (sql: string) => unknown
}

describe('postgres migrations parse', () => {
  it('accepts every migration in the Postgres parser, including plpgsql bodies', async () => {
    await loadModule()
    const dir = new URL('../../supabase/migrations/', import.meta.url)
    const names = readdirSync(dir).filter((name) => name.endsWith('.sql')).sort()
    expect(names.length).toBeGreaterThan(0)
    for (const name of names) {
      const sql = readFileSync(new URL(name, dir), 'utf8')
      const tree = parseSync(sql)
      expect(tree.stmts?.length ?? 0, name).toBeGreaterThan(0)
      for (const stmt of tree.stmts ?? []) {
        if (stmt.stmt_location == null || stmt.stmt_len == null) continue
        const bytes = Buffer.from(sql, 'utf8')
        const start = bytes.subarray(0, stmt.stmt_location).toString('utf8').length
        const end = bytes.subarray(0, stmt.stmt_location + stmt.stmt_len).toString('utf8').length
        const text = sql.slice(start, end)
        const kind = Object.keys(stmt.stmt)[0]
        const plpgsql = kind === 'DoStmt' || (kind === 'CreateFunctionStmt' && /language\s+plpgsql/i.test(text))
        if (!plpgsql) continue
        expect(() => parsePlPgSQLSync(text), `${name} ${text.slice(0, 80)}`).not.toThrow()
      }
    }
  })
})
