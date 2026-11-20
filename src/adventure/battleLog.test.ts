import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { FightHit, FightFrame, FightTrace } from './battle'
import { battleLogFromTraces, latestLine, logIconFile, rememberBattleLog, sentenceWords, sheetLine } from './battleLog'
import { fitScale } from './const'
import { beginAdventure, writeSave } from './save'
import type { StorageLike } from './types'

function hit(over: Partial<FightHit> = {}): FightHit {
  return { from: 'ally', amount: 34, crit: false, type: 'fire', band: 'neutral', ko: false, kind: 'hit', ...over }
}

function frame(hits: FightHit[], text = 'Schlag'): FightFrame {
  return { allyHp: 40, foeHp: 20, text, hits }
}

function trace(frames: FightFrame[], over: Partial<FightTrace> = {}): FightTrace {
  return {
    allySpecies: 'm01', foeSpecies: 'm02', allyName: 'Ada', foeName: 'Bea',
    allyMax: 100, foeMax: 80, frames, win: true, foeKo: false, allyKo: false, timeout: false,
    allyHp: 40, foeHp: 0, ...over
  }
}

describe('battle log', () => {
  it('writes every hit, including a quick one, with the same number', () => {
    const fight = battleLogFromTraces([trace([
      frame([hit(), hit({ amount: 9, crit: true, band: 'strong' })]),
      frame([hit({ kind: 'heal', amount: 12, from: 'ally' })]),
      frame([hit({ kind: 'status', amount: 0 })]),
      frame([hit({ amount: 40, ko: true, ult: 'durchschlag' })])
    ])], 'de')
    const lines = fight.bouts.flatMap((bout) => bout.lines)
    expect(lines.map((line) => line.amount)).toEqual([34, 9, 12, null, 40])
    expect(lines.map((line) => line.icon)).toEqual(['angriff', 'krit', 'heilung', 'status', 'ko'])
    expect(lines[1].tags).toContain('stark')
    expect(lines[1].sentence).toContain('9')
    expect(lines[1].sentence).toContain('Krit')
    const shown = sheetLine(lines[1])
    expect(shown.main).toContain('9')
    expect(shown.main).not.toContain('stark')
    expect(shown.tags.match(/stark/g)).toEqual(['stark'])
    const ko = sheetLine(lines[4])
    expect(ko.main).not.toContain('KO')
    expect(ko.tags.match(/KO/g)).toEqual(['KO'])
    expect(sentenceWords(lines[0].sentence)).toBeLessThanOrEqual(6)
    expect(sentenceWords(lines[1].sentence)).toBeLessThanOrEqual(6)
    const marked = battleLogFromTraces([trace([frame([hit({ kind: 'status', amount: 0, from: 'foe' })], 'Kieselkrabbe setzt Panzerschale ein.')], { foeName: 'Kieselkrabbe', foeSpecies: 'm17' })], 'de')
    expect(marked.bouts[0].lines[0].sentence).toBe('Kieselkrabbe: Zieht Angriffe auf sich')
    expect(marked.bouts[0].lines[0].move).toBe('Zieht Angriffe auf sich')
    expect(marked.bouts[0].lines[0].tags.join(' ')).not.toContain('Status')
    const english = battleLogFromTraces([trace([frame([hit({ crit: true, band: 'strong', weather: 0.85 })])])], 'en')
    const row = english.bouts[0].lines[0]
    expect(row.sentence).toContain('Ember Strike')
    expect(row.sentence).toContain('crit')
    expect(row.sentence).not.toContain('Fire')
    expect(row.sentence).not.toContain('stark')
    expect(row.tags.join(' ')).toContain('strong')
    expect(row.tags.join(' ')).toContain('%')
    expect(row.icon).toBe('krit')
    expect(logIconFile('ko')).toBe('battle_ui/log/ko@2x.png')
    expect(logIconFile('heilung')).toBe('battle_ui/log/heilung@2x.png')
    const kept = rememberBattleLog(Array.from({ length: 10 }, () => fight), fight)
    expect(kept).toHaveLength(10)
    expect(latestLine(kept)?.amount).toBe(40)
    const phone = fitScale(390, 844)
    expect(48 * phone).toBeGreaterThan(16)
    expect(48 * phone).toBeLessThan(19)
    const css = readFileSync(new URL('./adventure.css', import.meta.url), 'utf8')
    expect(css).toContain('min-height: 64px')
    expect(css).toContain('width: 48px; height: 48px')
    expect(css).toContain('.battle-log span { white-space: normal; overflow: visible; overflow-wrap: anywhere; }')
    expect(css).toContain('right: 180px')
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8')
    expect(app).toContain('rememberBattleLog')
    expect(app).not.toContain('save.battleLog')
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    const box: StorageLike = (() => {
      const map = new Map<string, string>()
      return { getItem: (key) => map.get(key) ?? null, setItem: (key, value) => { map.set(key, value) }, removeItem: (key) => { map.delete(key) } }
    })()
    writeSave(box, save)
    expect(box.getItem('velunor_v2')).not.toContain('battleLog')
  })
})
