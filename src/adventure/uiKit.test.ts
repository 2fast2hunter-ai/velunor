import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SAVE_VERSION } from './const'
import { KIT_ART } from './uiKit'

describe('ui kit theme', () => {
  it('keeps every skin file and only references those variables', () => {
    const css = readFileSync(new URL('./ui-kit.css', import.meta.url), 'utf8')
    expect(Object.keys(KIT_ART).length).toBeGreaterThan(60)
    for (const file of Object.values(KIT_ART)) {
      expect(existsSync(new URL(`../../public/assets/${file.webp}`, import.meta.url)), file.webp).toBe(true)
      expect(existsSync(new URL(`../../public/assets/${file.png}`, import.meta.url)), file.png).toBe(true)
    }
    const used = [...css.matchAll(/var\(--kit-([a-z0-9-]+)\)/g)].map((match) => match[1])
    expect(used.length).toBeGreaterThan(20)
    for (const id of used) expect(KIT_ART).toHaveProperty(id)
    expect(css).toContain('--ink: #4a2c17')
    expect(SAVE_VERSION).toBe(13)
  })
})