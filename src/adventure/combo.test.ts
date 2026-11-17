import { describe, expect, it } from 'vitest'
import { activeCombos, AURA_FRAMES, AURA_MS, COMBOS, COMBO_CAP } from './combo'

describe('synergy stub', () => {
  it('lists 12 pairs and keeps at most two', () => {
    expect(COMBOS).toHaveLength(12)
    expect(new Set(COMBOS.map((combo) => combo.id)).size).toBe(12)
    expect(AURA_MS).toBe(357)
    expect(AURA_FRAMES).toBe(5)
    const many = activeCombos(['fire', 'water', 'plant', 'earth', 'wind', 'ice'])
    expect(many).toHaveLength(COMBO_CAP)
    expect(many.map((combo) => combo.id)).toEqual(['glut_tropfen', 'wurzelbrand'])
  })

  it('matches the pair that is actually on the team', () => {
    expect(activeCombos(['fire'])).toEqual([])
    expect(activeCombos(['fire', 'water']).map((combo) => combo.name)).toEqual(['Glut und Tropfen'])
    expect(activeCombos(['beast', 'fighting']).map((combo) => combo.id)).toEqual(['bestienwut'])
    expect(activeCombos(['plant', 'poison']).map((combo) => combo.id)).toEqual(['giftgarten'])
  })
})
