import { describe, expect, it } from 'vitest'
import { activeCombos, AURA_FRAMES, AURA_MS, COMBOS, COMBO_CAP } from './combo'

describe('team synergies on the battle dock', () => {
  it('lists the twelve pairs and keeps the two strongest', () => {
    expect(COMBOS).toHaveLength(12)
    expect(new Set(COMBOS.map((combo) => combo.id)).size).toBe(12)
    expect(AURA_MS).toBe(357)
    expect(AURA_FRAMES).toBe(5)
    const many = activeCombos(['water', 'lightning', 'fire', 'wind', 'plant', 'earth'])
    expect(many).toHaveLength(COMBO_CAP)
    expect(many.map((combo) => combo.id)).toEqual(['wurzelgrund', 'flaechenbrand'])
  })

  it('names the pair that is actually on the team', () => {
    expect(activeCombos(['fire'])).toEqual([])
    expect(activeCombos(['fire', 'wind']).map((combo) => combo.name)).toEqual(['Flächenbrand'])
    expect(activeCombos(['fighting', 'beast']).map((combo) => combo.id)).toEqual(['rudelkraft'])
    expect(activeCombos(['wind', 'sound']).map((combo) => combo.id)).toEqual(['sturmlied'])
  })
})
