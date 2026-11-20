import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'

const { loadModule, parseSync } = createRequire(import.meta.url)('libpg-query') as {
  loadModule: () => Promise<void>
  parseSync: (sql: string) => { stmts?: { stmt: Record<string, unknown> }[] }
}

describe('first-30-minutes funnel', () => {
  it('reads public.events and does not write', async () => {
    await loadModule()
    const doc = readFileSync(new URL('../../docs/analytics/trichter-erste-30.md', import.meta.url), 'utf8')
    expect(doc).toContain('public.events')
    for (const column of ['id', 'player_id', 'event', 'ts', 'props']) expect(doc).toContain(column)
    const blocks = [...doc.matchAll(/```sql\n([\s\S]*?)```/g)].map((match) => match[1])
    expect(blocks.length).toBe(3)
    for (const sql of blocks) {
      expect(sql).toMatch(/select/i)
      expect(sql).not.toMatch(/\b(insert|update|delete|alter|drop|create|truncate|grant|revoke)\b/i)
      const tree = parseSync(sql)
      expect(tree.stmts?.length ?? 0).toBeGreaterThan(0)
      for (const stmt of tree.stmts ?? []) expect(Object.keys(stmt.stmt)).toEqual(['SelectStmt'])
    }
  })
})
