import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { hpLabel, hpNumbersOn, typeEdge, weatherPct, ULT_SEGMENT_UI } from './battleHud'
import { fitScale, SAVE_VERSION } from './const'
import { beginAdventure, loadAdventure, writeSave } from './save'
import type { StorageLike } from './types'

function box(): StorageLike {
  const map = new Map<string, string>()
  return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => { map.set(key, value) }, removeItem: (key) => { map.delete(key) } }
}

describe('battle hud', () => {
  it('shows hit points unless the option is stored off', () => {
    expect(SAVE_VERSION).toBe(12)
    expect(hpNumbersOn(undefined)).toBe(true)
    expect(hpNumbersOn({})).toBe(true)
    expect(hpNumbersOn({ showHpNumbers: false })).toBe(false)
    expect(hpLabel(34, 120)).toBe('34 / 120')
    expect(typeEdge(1.5)).toBe('strong')
    expect(typeEdge(0.5)).toBe('weak')
    expect(typeEdge(1)).toBe('neutral')
    expect(weatherPct(0.85)).toBe('-15 %')
    expect(weatherPct(1)).toBeNull()
    const phone = fitScale(390, 844)
    expect(ULT_SEGMENT_UI * phone).toBeGreaterThanOrEqual(8)
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    const store = box()
    writeSave(store, save)
    expect(loadAdventure(store, 2_000)?.settings.showHpNumbers).toBeUndefined()
    save.settings.showHpNumbers = false
    writeSave(store, save)
    const kept = loadAdventure(store, 3_000)
    expect(kept?.settings.showHpNumbers).toBe(false)
    expect(kept?.saveVersion).toBe(12)
    expect(hpNumbersOn(kept?.settings)).toBe(false)
    const view = readFileSync(new URL('./view.ts', import.meta.url), 'utf8')
    const css = readFileSync(new URL('./adventure.css', import.meta.url), 'utf8')
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8')
    expect(view).toContain('battle_ui/ult/seg_leer_s.png')
    expect(view).toContain('battle_ui/ult/schloss_s.png')
    expect(view).toContain('battle_ui/status/stapel.png')
    expect(view).toContain('battle_ui/wetter/tag_icon.png')
    expect(view).toContain('data-field="hp"')
    expect(view).toContain('hp-num')
    expect(app).toContain('battle_ui/adv/')
    expect(app).toContain('battle_ui/callout/ult.png')
    expect(css).toContain('.ult-bar.small .ult-seg { width: 36px; height: 36px; }')
  })
})
