import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SYNERGIES } from './synergy'
import { DAILY_FRAMES } from './daily'
import { RANK_FRAMES } from './online/ranks'
import { SHAPES, SYMBOLS } from './guild'
import { PLACES } from './expedition'

const LEAGUES = ['kiesel', 'bronze', 'silber', 'gold', 'kristall', 'meister']
const BEASTS = ['himmelswal', 'weltenwurm']
const TIERS = ['bronze', 'silber', 'gold']

function file(path: string): boolean {
  return existsSync(new URL(`../../public/assets/${path}`, import.meta.url))
}

describe('grafik paket 1', () => {
  it('ships every picture the phase-2 screens reference', () => {
    const paths = [
      ...SYNERGIES.flatMap((row) => [`synergy/${row.id}.png`, `synergy/${row.id}_64.png`]),
      ...LEAGUES.flatMap((id) => [`arena/league_${id}.png`, `arena/league_${id}_64.png`]),
      ...DAILY_FRAMES.flatMap((id) => {
        const name = id.slice('daily-'.length)
        return [`daily/frame-${name}.png`, `daily/frame-${name}_128.png`]
      }),
      ...RANK_FRAMES.flatMap((frame) => [`ranks/frame-${frame.id}.png`, `ranks/frame-${frame.id}_128.png`]),
      ...Object.values(PLACES).flatMap((place) => [`${place.art}.jpg`, `${place.art}.webp`, `${place.art}_480.webp`]),
      ...TIERS.flatMap((tier) => [`expedition/tier-${tier}.png`, `expedition/tier-${tier}_48.png`]),
      ...BEASTS.flatMap((id) => [`beasts/${id}.png`, `beasts/${id}.webp`, `beasts/${id}_480.png`]),
      ...SHAPES.map((shape) => `guild/shape-${shape}.png`),
      ...SYMBOLS.map((symbol) => `guild/symbol-${symbol}.png`),
      'friends/code.png',
      'friends/code_360.png',
      'guild/colors.json'
    ]
    const missing = paths.filter((path) => !file(path))
    expect(missing).toEqual([])
    expect(Object.keys(PLACES)).toHaveLength(20)
  })
})
