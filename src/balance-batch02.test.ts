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

/** Target band is 35–65%. Guardians may sit as low as 25%. */
function flagFor(rate: number, monster: MonsterSpecies): string {
  const low = monster.class === 'guardian' ? 0.25 : 0.35
  if (rate < low || rate > 0.65) return monster.class === 'guardian' ? ' FLAG outside 25-65%' : ' FLAG outside 35-65%'
  return ''
}

describe('batch 02 balance', () => {
  it('prints level-1 win rates against earlier monsters of the same rarity', { timeout: 300_000 }, () => {
    const fresh = monsters.filter((monster) => {
      const index = Number(monster.id.slice(1))
      return index >= 36 && index <= 45
    })
    const prior = monsters.filter((monster) => Number(monster.id.slice(1)) <= 35)
    expect(fresh).toHaveLength(10)
    const outliers: string[] = []
    for (const challenger of fresh) {
      const foes = prior.filter((monster) => monster.baseRarity === challenger.baseRarity)
      const rarity = rarityInfo(challenger.baseRarity).name
      if (!foes.length) {
        console.log(`BALANCE ${challenger.id} ${challenger.name} (R${challenger.baseRarity} ${rarity}, ${challenger.class}): keine Gegner gleicher Seltenheit`)
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
    console.log(outliers.length ? `OUTLIER_SUMMARY: ${outliers.join('; ')}` : 'OUTLIER_SUMMARY: none')
    expect(fresh.every((monster) => monster.baseRarity >= 0)).toBe(true)
  })
})
