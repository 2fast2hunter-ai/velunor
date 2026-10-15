import { describe, expect, it } from 'vitest'
import { simulateBattle } from './battle'
import { monsters, rarityInfo } from './data'
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

describe('batch 01 balance', () => {
  it('prints level-1 win rates against existing monsters of the same rarity', { timeout: 120_000 }, () => {
    const fresh = monsters.filter((monster) => {
      const index = Number(monster.id.slice(1))
      return index >= 26 && index <= 35
    })
    const prior = monsters.filter((monster) => Number(monster.id.slice(1)) <= 25)
    expect(fresh).toHaveLength(10)
    const outliers: string[] = []
    for (const challenger of fresh) {
      const foes = prior.filter((monster) => monster.baseRarity === challenger.baseRarity)
      const rarity = rarityInfo(challenger.baseRarity).name
      if (!foes.length) {
        console.log(`BALANCE ${challenger.id} ${challenger.name} (R${challenger.baseRarity} ${rarity}): keine Gegner gleicher Seltenheit`)
        continue
      }
      let wins = 0
      let fights = 0
      const lines: string[] = []
      for (const foe of foes) {
        const won = winsOf(challenger, foe)
        const total = SEEDS * 2
        const rate = won / total
        wins += won
        fights += total
        const mark = rate > 0.65 || rate < 0.35 ? ' OUTLIER' : ''
        if (mark) outliers.push(`${challenger.id} vs ${foe.id} ${(rate * 100).toFixed(1)}%`)
        lines.push(`  vs ${foe.id} ${foe.name}: ${(rate * 100).toFixed(1)}% (${won}/${total})${mark}`)
      }
      const overall = wins / fights
      const mark = overall > 0.65 || overall < 0.35 ? ' OUTLIER' : ''
      if (mark) outliers.push(`${challenger.id} ${challenger.name} overall ${(overall * 100).toFixed(1)}%`)
      console.log(`BALANCE ${challenger.id} ${challenger.name} (R${challenger.baseRarity} ${rarity}): ${(overall * 100).toFixed(1)}% (${wins}/${fights})${mark}`)
      for (const line of lines) console.log(line)
    }
    console.log(outliers.length ? `OUTLIER_SUMMARY: ${outliers.join('; ')}` : 'OUTLIER_SUMMARY: none')
    expect(fresh.every((monster) => monster.baseRarity >= 0)).toBe(true)
  })
})
