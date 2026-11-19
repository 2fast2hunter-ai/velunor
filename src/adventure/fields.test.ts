import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { fieldSkipsRender } from './fields'

describe('field changes', () => {
  it('keeps the chat and guild fields in place so the first submit is not lost on blur', () => {
    expect(fieldSkipsRender('chat')).toBe(true)
    expect(fieldSkipsRender('guild-name')).toBe(true)
    expect(fieldSkipsRender('guild-tag')).toBe(true)
    expect(fieldSkipsRender('guild-query')).toBe(true)
    expect(fieldSkipsRender('guild-code')).toBe(true)
    expect(fieldSkipsRender('name')).toBe(true)
    expect(fieldSkipsRender(undefined)).toBe(true)
    expect(fieldSkipsRender('loop')).toBe(false)
    expect(fieldSkipsRender('auto')).toBe(false)
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8')
    const sync = app.slice(app.indexOf('function syncField'))
    expect(sync.indexOf('if (fieldSkipsRender(field)) return')).toBeGreaterThan(-1)
    expect(sync.indexOf('if (fieldSkipsRender(field)) return')).toBeLessThan(sync.indexOf('render()'))
  })
})
