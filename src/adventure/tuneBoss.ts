import { readFileSync, writeFileSync } from 'node:fs'
import { clearRate, referenceTeam } from './gauntlet'
import { regions, type ChapterDef } from './route'

interface Band {
  cap: [number, number]
  low: [number, number]
  capTarget: number
  lowTarget: number
}

interface Fight {
  regionId: number
  label: string
  kind: 'early' | 'late' | 'council' | 'grand'
  cap: number
  foes: { species: string; level: number }[]
  apply: (factor: number) => void
}

const BANDS: Record<Fight['kind'], Band> = {
  early: { cap: [0.7, 0.9], low: [0.4, 0.6], capTarget: 0.8, lowTarget: 0.5 },
  late: { cap: [0.6, 0.8], low: [0.3, 0.5], capTarget: 0.7, lowTarget: 0.4 },
  council: { cap: [0.55, 0.75], low: [0.25, 0.45], capTarget: 0.65, lowTarget: 0.35 },
  grand: { cap: [0.45, 0.65], low: [0.15, 0.35], capTarget: 0.55, lowTarget: 0.25 }
}

function outside(rate: number, band: [number, number]): number {
  if (rate < band[0]) return band[0] - rate
  if (rate > band[1]) return rate - band[1]
  return 0
}

function score(kind: Fight['kind'], capRate: number, lowRate: number): number {
  const band = BANDS[kind]
  const hard = outside(capRate, [0.45, 0.9])
  if (hard > 0) return 10 + hard
  return outside(capRate, band.cap) * 3
    + outside(lowRate, band.low)
    + Math.abs(capRate - band.capTarget) * 0.05
    + Math.abs(lowRate - band.lowTarget) * 0.02
}

function fights(): Fight[] {
  const rows: Fight[] = []
  for (const region of regions) {
    const team = referenceTeam(region.id)
    void team
    for (const chapter of region.chapters) {
      if (chapter.foyer || chapter.special || chapter.council || !chapter.guardian.team.length) continue
      const kind = chapter.id <= 2 ? 'early' : 'late'
      rows.push({
        regionId: region.id,
        label: `${region.name} · ${chapter.name}`,
        kind,
        cap: chapter.cap,
        foes: chapter.guardian.team.map((mon) => ({ species: mon.species, level: mon.level })),
        apply: (factor) => { chapter.guardian.factor = factor }
      })
    }
    const council = region.chapters.find((chapter) => chapter.council)
    if (!council?.council) continue
    council.council.members.forEach((member, index) => {
      const last = index === council.council!.members.length - 1
      rows.push({
        regionId: region.id,
        label: `${region.name} · ${member.epithet} ${member.name}`,
        kind: last ? 'grand' : 'council',
        cap: council.cap,
        foes: member.team.map((mon) => ({ species: mon.species, level: mon.level })),
        apply: (factor) => {
          member.factor = factor
          if (last) council.guardian.factor = factor
        }
      })
    })
  }
  return rows
}

function snap(factor: number): number {
  return Math.round(factor * 20) / 20
}

function tuneOne(fight: Fight, index: number): { factor: number; cap: number; low: number } {
  const team = referenceTeam(fight.regionId)
  const seed = 100 + index * 17
  const target = BANDS[fight.kind].capTarget
  const coarse: { factor: number; rate: number }[] = []
  for (let factor = 0.5; factor <= 2.5; factor += 0.1) {
    const rounded = snap(factor)
    coarse.push({ factor: rounded, rate: clearRate(team, fight.cap, fight.foes, rounded, 50, seed) })
  }
  let lowFactor = coarse[0].factor
  let highFactor = coarse[coarse.length - 1].factor
  for (let i = 1; i < coarse.length; i++) {
    const left = coarse[i - 1]
    const right = coarse[i]
    if ((left.rate - target) * (right.rate - target) <= 0) {
      lowFactor = left.factor
      highFactor = right.factor
      break
    }
  }
  let chosen = lowFactor
  let chosenScore = Number.POSITIVE_INFINITY
  let chosenRates = { cap: 0, low: 0 }
  for (let factor = snap(lowFactor - 0.05); factor <= snap(highFactor + 0.05) + 1e-9; factor = snap(factor + 0.05)) {
    const capRate = clearRate(team, fight.cap, fight.foes, factor, 200, seed)
    const lowRate = clearRate(team, fight.cap - 3, fight.foes, factor, 200, seed + 1)
    const next = score(fight.kind, capRate, lowRate)
    if (next < chosenScore - 1e-9) {
      chosenScore = next
      chosen = factor
      chosenRates = { cap: capRate, low: lowRate }
    }
  }
  return { factor: chosen, cap: chosenRates.cap, low: chosenRates.low }
}

function main(): void {
  const rows = fights()
  const lines = ['# Boss-Faktoren', '']
  rows.forEach((fight, index) => {
    const tuned = tuneOne(fight, index)
    fight.apply(tuned.factor)
    const band = BANDS[fight.kind]
    const capOk = tuned.cap >= band.cap[0] && tuned.cap <= band.cap[1] && tuned.cap >= 0.45 && tuned.cap <= 0.9
    const lowOk = tuned.low >= band.low[0] && tuned.low <= band.low[1]
    lines.push(`- ${fight.label}: Faktor ${tuned.factor.toFixed(2)}, Cap ${(tuned.cap * 100).toFixed(0)} %, Cap−3 ${(tuned.low * 100).toFixed(0)} %${capOk && lowOk ? '' : ' — außerhalb'}`)
    console.log(`${index + 1}/${rows.length} ${fight.label} ×${tuned.factor.toFixed(2)} cap ${(tuned.cap * 100).toFixed(0)} low ${(tuned.low * 100).toFixed(0)}`)
  })
  const file = new URL('../../data/regions.json', import.meta.url)
  const data = JSON.parse(readFileSync(file, 'utf8')) as { regions: { id: number; chapters: ChapterDef[] }[] }
  for (const region of data.regions) {
    const live = regions.find((entry) => entry.id === region.id)
    if (!live) continue
    for (const chapter of region.chapters) {
      const source = live.chapters.find((entry) => entry.id === chapter.id)
      if (!source) continue
      chapter.guardian.factor = source.guardian.factor ?? 1
      chapter.council?.members.forEach((member, index) => {
        const from = source.council?.members[index]
        if (from) member.factor = from.factor ?? 1
      })
    }
  }
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
  console.log(lines.join('\n'))
}

if (!process.env.VITEST) main()
