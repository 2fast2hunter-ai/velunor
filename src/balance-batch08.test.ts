import { describe, expect, it } from 'vitest'
import { simulateBattle } from './battle'
import { monsters, rarityInfo, species } from './data'
import type { MonsterSpecies, SlotId } from './types'

const SEEDS = 40

function slotFor(monster: MonsterSpecies): SlotId {
  return monster.role === 'front' ? 'F1' : 'H1'
}

function winsOf(challenger: MonsterSpecies, opponent: MonsterSpecies): number {
  let wins = 0
  for (let seed = 0; seed < SEEDS; seed++) {
    const asAlly = simulateBattle({
      seed,
      allySynergy: false,
      enemySynergy: false,
      allies: [{ speciesId: challenger.id, rarity: challenger.baseRarity, level: 1, slot: slotFor(challenger) }],
      enemies: [{ speciesId: opponent.id, rarity: opponent.baseRarity, level: 1, slot: slotFor(opponent) }]
    })
    if (asAlly.result === 'win') wins += 1
    const asEnemy = simulateBattle({
      seed: seed + 10_000,
      allySynergy: false,
      enemySynergy: false,
      allies: [{ speciesId: opponent.id, rarity: opponent.baseRarity, level: 1, slot: slotFor(opponent) }],
      enemies: [{ speciesId: challenger.id, rarity: challenger.baseRarity, level: 1, slot: slotFor(challenger) }]
    })
    if (asEnemy.result === 'loss') wins += 1
  }
  return wins
}

/**
 * Correction band for this batch: below 25% or above 75%.
 * Guardians use the same 25% floor. m100 only fails the floor of 60% against m40 and m80.
 */
function flagFor(rate: number, monster: MonsterSpecies): string {
  if (monster.id === 'm100') return rate < 0.6 ? ' FLAG under 60%' : ''
  if (rate < 0.25 || rate > 0.75) return ' FLAG outside 25-75%'
  return ''
}

describe('batch 08 balance', () => {
  it('prints level-1 win rates for the dragon batch', { timeout: 300_000 }, () => {
    const fresh = monsters.filter((monster) => {
      const index = Number(monster.id.slice(1))
      return index >= 96 && index <= 99
    })
    const prior = monsters.filter((monster) => Number(monster.id.slice(1)) <= 95)
    expect(fresh).toHaveLength(4)
    const outliers: string[] = []
    for (const challenger of fresh) {
      const foes = prior.filter((monster) => monster.baseRarity === challenger.baseRarity)
      const rarity = rarityInfo(challenger.baseRarity).name
      expect(foes.length).toBeGreaterThan(0)
      let wins = 0
      let fights = 0
      const lines: string[] = []
      for (const foe of foes) {
        const won = winsOf(challenger, foe)
        const total = SEEDS * 2
        const rate = won / total
        wins += won
        fights += total
        const mark = flagFor(rate, challenger)
        if (mark) outliers.push(`${challenger.id} vs ${foe.id} ${(rate * 100).toFixed(1)}%${mark}`)
        lines.push(`  vs ${foe.id} ${foe.name}: ${(rate * 100).toFixed(1)}% (${won}/${total})${mark}`)
      }
      const overall = wins / fights
      const mark = flagFor(overall, challenger)
      if (mark) outliers.push(`${challenger.id} ${challenger.name} overall ${(overall * 100).toFixed(1)}%${mark}`)
      console.log(`BALANCE ${challenger.id} ${challenger.name} (R${challenger.baseRarity} ${rarity}, ${challenger.class}): ${(overall * 100).toFixed(1)}% (${wins}/${fights})${mark}`)
      for (const line of lines) console.log(line)
    }
    const origin = species('m100')
    const bosses = ['m40', 'm80'].map((id) => species(id))
    for (const foe of bosses) {
      const won = winsOf(origin, foe)
      const total = SEEDS * 2
      const rate = won / total
      const mark = flagFor(rate, origin)
      if (mark) outliers.push(`${origin.id} vs ${foe.id} ${(rate * 100).toFixed(1)}%${mark}`)
      console.log(`BALANCE ${origin.id} ${origin.name} vs ${foe.id} ${foe.name} (R${foe.baseRarity} ${rarityInfo(foe.baseRarity).name}): ${(rate * 100).toFixed(1)}% (${won}/${total})${mark}`)
    }
    console.log(outliers.length ? `OUTLIER_SUMMARY: ${outliers.join('; ')}` : 'OUTLIER_SUMMARY: none')
    expect(fresh.every((monster) => monster.baseRarity >= 0)).toBe(true)
    expect(origin.baseRarity).toBe(9)
  })
})
