import { describe, expect, it } from 'vitest'
import { classLabel, synergySummary, synergyView } from './synergy'

describe('team role summary', () => {
  it('names every class, including a back-row support placed with fighter and shooter', () => {
    const view = synergyView([
      { type: 'lightning', class: 'support' },
      { type: 'fire', class: 'fighter' },
      { type: 'fire', class: 'shooter' }
    ], false, true)
    const text = synergySummary(247, view.lines)
    expect(text).toBe('Kampfkraft 247 · Kämpfer 1/2 · Schütze 1/2 · Stütze ×1: +10 % Heilung/Schild')
    expect(text).not.toMatch(/·\s+·/)
    expect(text).not.toContain('undefined')
    expect(view.lines.every((line) => line.trim().length > 0 && !line.startsWith('·'))).toBe(true)
    expect(view.active).toBe(true)
  })

  it('labels guardian and disruptor on the way to their threshold', () => {
    const view = synergyView([
      { type: 'earth', class: 'guardian' },
      { type: 'poison', class: 'disruptor' }
    ], false, true)
    expect(synergySummary(10, view.lines)).toBe('Kampfkraft 10 · Wächter 1/2 · Störer 1/2')
    expect(view.active).toBe(false)
  })

  it('keeps a fallback label when a class name is missing from data', () => {
    expect(classLabel('support')).toBe('Stütze')
    expect(classLabel('guardian')).toBe('Wächter')
    expect(classLabel('disruptor')).toBe('Störer')
    expect(classLabel('fighter')).toBe('Kämpfer')
    expect(classLabel('shooter')).toBe('Schütze')
    expect(classLabel('')).toBe('Klasse')
    expect(classLabel('unknown-role').length).toBeGreaterThan(0)
  })
})
