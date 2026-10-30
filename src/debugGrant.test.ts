import { describe, expect, it } from 'vitest'
import grantSource from './debugGrant.ts?raw'
import shellSource from './scenes/Shell.ts?raw'
import { DEBUG_GRANT_MARKER, debugToolsEnabled, grantDebugMonster, normalizeSpeciesQuery } from './debugGrant'
import { createSave } from './state'

describe('debug grant', () => {
  it('honors ?debug=1 only when the dev flag is on', () => {
    expect(debugToolsEnabled(false, '?debug=1')).toBe(false)
    expect(debugToolsEnabled(false, '?debug=1&x=1')).toBe(false)
    expect(debugToolsEnabled(true, '?debug=1')).toBe(true)
    expect(debugToolsEnabled(true, '?x=1&debug=1')).toBe(true)
    expect(debugToolsEnabled(true, '')).toBe(false)
    expect(debugToolsEnabled(true, '?debug=0')).toBe(false)
    expect(debugToolsEnabled(true, '?debug=true')).toBe(false)
  })

  it('puts a species into the inventory and the matching team slot', () => {
    expect(normalizeSpeciesQuery('M80')).toBe('m80')
    expect(normalizeSpeciesQuery('80')).toBe('m80')
    expect(normalizeSpeciesQuery(' m8 ')).toBe('m08')
    const save = createSave(1)
    const before = save.monsters.length
    const back = grantDebugMonster(save, 'm80', 50)
    expect(back.ok).toBe(true)
    if (!back.ok) return
    expect(back).toMatchObject({ name: 'Finsterfürst', slot: 'H1', speciesId: 'm80' })
    expect(save.monsters).toHaveLength(before + 1)
    expect(save.collection).toContain('m80')
    expect(save.team.H1).toBe(save.monsters.at(-1)?.uid)
    expect(save.monsters.find((monster) => monster.uid === save.team.F1)?.speciesId).toBe('m02')
    const front = grantDebugMonster(save, 'm93', 60)
    expect(front.ok).toBe(true)
    if (!front.ok) return
    expect(front.slot).toBe('F1')
    expect(save.team.F1).toBe(save.monsters.at(-1)?.uid)
    expect(save.monsters.some((monster) => monster.speciesId === 'm02')).toBe(true)
    const missing = grantDebugMonster(save, 'm999', 70)
    expect(missing).toEqual({ ok: false, reason: 'Unbekanntes Monster m999.' })
    expect(grantDebugMonster(save, DEBUG_GRANT_MARKER, 80)).toEqual({ ok: false, reason: DEBUG_GRANT_MARKER })
  })

  it('keeps the dev gate in the settings scene and out of an unconditional call', () => {
    const shell = shellSource
    const grant = grantSource
    expect(shell).toContain('if (import.meta.env.DEV) showDebug = debugToolsEnabled()')
    expect(shell).toContain('if (import.meta.env.DEV && showDebug)')
    expect(shell).toContain('grantDebugMonster')
    expect(grant).toContain('if (!dev) return false')
    expect(grant).toContain(DEBUG_GRANT_MARKER)
  })
})
