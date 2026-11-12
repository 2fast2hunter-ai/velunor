import { readFileSync, writeFileSync } from 'node:fs'
import { bossScale, clearRate, referenceTeam } from './gauntlet'
import { regions, type ChapterDef } from './route'

interface Fight {
  label: string
  kind: 'early' | 'late' | 'council' | 'grand'
  cap: number
  team: string[]
  foes: { species: string; level: number }[]
  source: { factor?: number; hpFactor?: number; atkFactor?: number; defFactor?: number }
}

const TARGET = { early: 0.8, late: 0.7, council: 0.65, grand: 0.55 }

function fights(): Fight[] {
  const rows: Fight[] = []
  for (const region of regions) {
    const team = referenceTeam(region.id)
    for (const chapter of region.chapters) {
      if (chapter.foyer || chapter.council || chapter.special || !chapter.guardian.team.length) continue
      rows.push({
        label: `${region.name} · ${chapter.name}`,
        kind: chapter.id <= 2 ? 'early' : 'late',
        cap: chapter.cap,
        team,
        foes: chapter.guardian.team,
        source: chapter.guardian
      })
    }
    const council = region.chapters.find((chapter) => chapter.council)
    council?.council?.members.forEach((member, index) => {
      const last = index === (council.council?.members.length ?? 0) - 1
      rows.push({
        label: `${region.name} · ${member.epithet} ${member.name}`,
        kind: last ? 'grand' : 'council',
        cap: council.cap,
        team,
        foes: member.team,
        source: member
      })
    })
  }
  return rows
}

function snap(value: number): number {
  return Math.round(value * 100) / 100
}

function search(fight: Fight, seed: number): void {
  const current = bossScale(fight.source)
  const now = clearRate(fight.team, fight.cap, fight.foes, { hpFactor: current.hp, atkFactor: current.atk, defFactor: current.def }, 80, seed)
  if (now >= 0.45 && now <= 0.9) return
  let best: { atk: number; hp: number; rate: number; dist: number } | null = null
  const consider = (hp: number, atk: number, trials: number) => {
    const rate = clearRate(fight.team, fight.cap, fight.foes, { hpFactor: hp, atkFactor: atk, defFactor: current.def }, trials, seed)
    if (rate < 0.45 || rate > 0.9) return
    const dist = Math.abs(rate - TARGET[fight.kind])
    if (!best || dist < best.dist) best = { atk, hp, rate, dist }
  }
  for (let atk = 40; atk <= 250; atk += 1) consider(current.hp, atk / 100, 40)
  if (!best) {
    for (let hp = 50; hp <= 250; hp += 5) {
      for (let atk = 50; atk <= 200; atk += 5) consider(hp / 100, atk / 100, 20)
    }
  }
  if (!best) {
    console.log(`kein Treffer ${fight.label} jetzt ${(now * 100).toFixed(0)} %`)
    return
  }
  const found = best as { atk: number; hp: number; rate: number; dist: number }
  const confirmed = clearRate(fight.team, fight.cap, fight.foes, { hpFactor: found.hp, atkFactor: found.atk, defFactor: current.def }, 200, seed)
  fight.source.hpFactor = snap(found.hp)
  fight.source.atkFactor = snap(found.atk)
  fight.source.defFactor = snap(current.def)
  console.log(`${fight.label}: HP ${found.hp.toFixed(2)} ATK ${found.atk.toFixed(2)} → ${(confirmed * 100).toFixed(0)} %`)
}

function main(): void {
  fights().forEach((fight, index) => search(fight, 100 + index * 17))
  const file = new URL('../../data/regions.json', import.meta.url)
  const data = JSON.parse(readFileSync(file, 'utf8')) as { regions: { id: number; chapters: ChapterDef[] }[] }
  for (const region of data.regions) {
    const live = regions.find((entry) => entry.id === region.id)
    if (!live) continue
    for (const chapter of region.chapters) {
      const source = live.chapters.find((entry) => entry.id === chapter.id)
      if (!source) continue
      chapter.guardian.hpFactor = source.guardian.hpFactor
      chapter.guardian.atkFactor = source.guardian.atkFactor
      chapter.guardian.defFactor = source.guardian.defFactor
      chapter.council?.members.forEach((member, index) => {
        const from = source.council?.members[index]
        if (!from) return
        member.hpFactor = from.hpFactor
        member.atkFactor = from.atkFactor
        member.defFactor = from.defFactor
      })
    }
  }
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
}

if (!process.env.VITEST) main()
