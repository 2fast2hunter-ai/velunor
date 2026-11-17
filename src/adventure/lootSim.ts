import { species } from '../data'
import { mulberry32 } from '../rng'
import { openChest, poolFor, speciesInRegion } from './lootbox'

const SHARDS = [5, 6, 8, 10, 15, 20, 30, 40, 60, 100]
const WILD = [0.2, 0.15, 0.12, 0.1, 0.08, 0.06, 0.04, 0.03, 0.02, 0.01]

export interface DayMark {
  day: number
  owned: number
  low: number
  lowTotal: number
  codex: number
}

function table(regionId: number): { species: string; weight: number }[] {
  const ids = speciesInRegion(regionId)
  return ids.map((id) => ({ species: id, weight: 1 }))
}

function pick(rng: () => number, rows: { species: string; weight: number }[]): string {
  const total = rows.reduce((sum, row) => sum + row.weight, 0)
  let cursor = rng() * total
  for (const row of rows) {
    cursor -= row.weight
    if (cursor < 0) return row.species
  }
  return rows[rows.length - 1].species
}

/** One region, 30 days: 8 road kiesel, 1 find, 3 trainer rolls, 200 wild wins. */
export function simulateRegion(regionId: number, seed: number, wildPerDay = 360): DayMark[] {
  const rng = mulberry32(seed + regionId * 1000)
  const unlocked = Array.from({ length: regionId }, (_, i) => i + 1)
  poolFor(unlocked)
  const home = new Set(speciesInRegion(regionId))
  const lowTotal = [...home].filter((id) => species(id).baseRarity <= 3).length
  const owned = new Set<string>()
  const shards: Record<string, number> = {}
  const marks: DayMark[] = []
  const fights = table(regionId)
  for (let day = 1; day <= 30; day++) {
    const chests: { tier: 'kiesel' | 'silber'; n: number }[] = [
      { tier: 'kiesel', n: 9 },
      { tier: 'silber', n: 0 }
    ]
    for (let i = 0; i < 3; i++) if (rng() < 0.1) chests[1].n += 1
    for (const batch of chests) {
      for (let i = 0; i < batch.n; i++) {
        const roll = openChest(batch.tier, { unlockedRegions: unlocked, ownedSpecies: [...owned], region: regionId }, rng)
        if (roll.isNew) owned.add(roll.speciesId)
        else shards[roll.speciesId] = (shards[roll.speciesId] ?? 0) + SHARDS[roll.rarity]
      }
    }
    for (let i = 0; i < wildPerDay; i++) {
      const id = pick(rng, fights)
      const rarity = species(id).baseRarity
      if (rng() >= WILD[rarity]) continue
      if (owned.has(id)) shards[id] = (shards[id] ?? 0) + 1
      else {
        shards[id] = (shards[id] ?? 0) + 1
        if (shards[id] >= 2 * SHARDS[rarity]) {
          shards[id] -= 2 * SHARDS[rarity]
          owned.add(id)
        }
      }
    }
    if (day === 1 || day === 7 || day === 30) {
      const low = [...home].filter((id) => species(id).baseRarity <= 3 && owned.has(id)).length
      marks.push({ day, owned: [...owned].filter((id) => home.has(id)).length, low, lowTotal, codex: owned.size })
    }
  }
  return marks
}

export function collectionReport(seed = 20261117): string {
  const lines = ['# Lootbox-Simulation, 30 Tage', '', 'Annahme je Tag und Region: 8 Wegtruhen plus 1 Fund (9 Kiesel), 3 Trainerwürfe à 10 % Silber, 360 wilde Siege. Der Pool enthält die Region und alle vorherigen.', '']
  for (let region = 1; region <= 5; region++) {
    const marks = simulateRegion(region, seed)
    lines.push(`## Region ${region}`)
    for (const mark of marks) {
      const low = mark.lowTotal ? Math.round((mark.low / mark.lowTotal) * 100) : 0
      lines.push(`- Tag ${mark.day}: ${mark.owned} Arten hier, Seltenheit 0–3 ${mark.low}/${mark.lowTotal} (${low} %), Kodex ${mark.codex}/100`)
    }
    lines.push('')
  }
  const week = simulateRegion(1, seed).find((mark) => mark.day === 7)
  const month = simulateRegion(5, seed).find((mark) => mark.day === 30)
  lines.push('## Ziel')
  lines.push(`Region 1, Tag 7, Seltenheit 0–3: ${week ? Math.round((week.low / week.lowTotal) * 100) : 0} %. Ziel 100 % ± 15, also 85–100.`)
  lines.push(`Nach 30 Tagen in Region 5 (Pool 1–5): ${month?.codex ?? 0}/100. Ziel etwa 70 ± 15, also 55–85.`)
  return lines.join('\n')
}
