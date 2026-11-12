import { writeFileSync } from 'node:fs'
import { species, typeMult } from '../data'
import { mulberry32 } from '../rng'
import { fight1v1, type FightSide } from './battle'
import {
  BASE_ENCOUNTER_MS,
  BUDDY_BONUS,
  CATCH_BASE,
  CATCH_CAP,
  OFFLINE_CAP_MS,
  OFFLINE_EXP_FACTOR,
  OFFLINE_LEVEL_CAP,
  START_GOLD,
  STARTER_LEVEL,
  type Speed
} from './const'
import { catchChance } from './sim'
import { HORT_PRICES } from './hort'
import { regions, routeOf, type ChapterDef } from './route'
import { CRYSTALS, FRUITS } from './shop'
import { addExp, awakenCount, expToNext, monStats } from './stats'
import type { OwnedMon } from './types'
import { MARK_GOLD, PRIZES, SPIN_COST, exactPayoutRate } from './wheel'

const EXP_PER_LEVEL = 8
const TRAINER_COUNT = 2
const MAX_ENCOUNTERS = 200_000

export interface BalanceOptions {
  offlineShare: number
  onlineHours: number
  speed: Speed
  trials: number
  seed: number
}

interface ClimbRow {
  regionId: number
  region: string
  name: string
  kind: 'chapter' | 'council'
  cap: number
  levelIn: number
  levelOut: number
  encounters: number
  hours: number
  goldGain: number
  reached: boolean
}

interface WinRow {
  label: string
  cap: number
  teamLevel: number
  foes: string
  rate: number
}

function parseArgs(argv: string[]): BalanceOptions {
  const read = (name: string, fallback: number) => {
    const hit = argv.find((arg) => arg.startsWith(`--${name}=`))
    if (!hit) return fallback
    const value = Number(hit.slice(name.length + 3))
    return Number.isFinite(value) ? value : fallback
  }
  const speed = read('speed', 1)
  return {
    offlineShare: Math.min(1, Math.max(0, read('offline-share', 0.5))),
    onlineHours: Math.max(0, read('online-hours', 0)),
    speed: speed === 2 || speed === 3 ? speed : 1,
    trials: Math.max(1, Math.floor(read('trials', 80))),
    seed: Math.floor(read('seed', 100)) || 1
  }
}

function fmt(value: number, digits = 1): string {
  return value.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

function pct(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return `${fmt(value * 100, 0)} %`
}

function hours(ms: number): string {
  if (ms < 3_600_000) return `${fmt(ms / 60_000, 1)} min`
  return `${fmt(ms / 3_600_000, 2)} h`
}

function monAt(level: number): OwnedMon {
  return { species: 'm01', lvl: level, exp: 0, hp: null, shiny: false, caughtAt: 0, caughtWhere: 'r1c1', keepDupes: false }
}

function meanLevel(chapter: ChapterDef): number {
  return Math.round((chapter.levelMin + chapter.levelMax) / 2)
}

function expectedRarity(chapter: ChapterDef): number {
  const rows = chapter.day.length ? chapter.day : chapter.night
  const total = rows.reduce((sum, row) => sum + row.weight, 0)
  if (!total) return 0
  return rows.reduce((sum, row) => sum + row.weight * species(row.species).baseRarity, 0) / total
}

function isOffline(index: number, share: number): boolean {
  if (share <= 0) return false
  if (share >= 1) return true
  return Math.floor((index + 1) * share) !== Math.floor(index * share)
}

function fightExp(level: number, rarity: number, offline: boolean): number {
  const base = EXP_PER_LEVEL * level * (1 + 0.25 * rarity) * (1 + BUDDY_BONUS)
  return offline ? base * OFFLINE_EXP_FACTOR : base
}

function expBetween(from: number, to: number): number {
  let total = 0
  for (let level = from; level < to; level++) total += expToNext(level)
  return total
}

function teamOf(regionId: number): string[] {
  const region = regions.find((entry) => entry.id === regionId)
  const weight = new Map<string, number>()
  for (const chapter of region?.chapters ?? []) {
    if (chapter.council || chapter.special) continue
    for (const row of chapter.day) weight.set(row.species, (weight.get(row.species) ?? 0) + row.weight)
  }
  const ranked = [...weight.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).map(([id]) => id)
  if (regionId === 1) {
    for (const id of ['m03', 'm02', 'm01']) {
      const at = ranked.indexOf(id)
      if (at >= 0) ranked.splice(at, 1)
      ranked.unshift(id)
    }
  }
  return ranked.slice(0, 6)
}

function side(id: string, level: number, hpFraction: number, skillBonus: boolean): FightSide {
  const stats = monStats({ ...monAt(level), species: id })
  const sp = species(id)
  const bonus = skillBonus ? 0.25 * awakenCount(level) : 0
  const skill = bonus
    ? { ...sp.skill, effects: sp.skill.effects.map((effect) => ('atkMult' in effect ? { ...effect, atkMult: effect.atkMult + bonus } : effect)) }
    : sp.skill
  return {
    speciesId: id,
    name: sp.name,
    type: sp.type,
    maxHp: stats.hp,
    hp: Math.max(1, Math.round(stats.hp * hpFraction)),
    atk: stats.atk,
    def: stats.def,
    spd: stats.spd,
    skill,
    passive: sp.passive ?? null
  }
}

function clearRate(team: string[], level: number, foes: { species: string; level: number }[], trials: number, seed: number): number {
  if (!team.length || !foes.length) return 0
  const rng = mulberry32(seed)
  let wins = 0
  for (let trial = 0; trial < trials; trial++) {
    const hp = new Map(team.map((id) => [id, 1]))
    let cleared = true
    for (const foe of foes) {
      const living = team.filter((id) => (hp.get(id) ?? 0) > 0)
      if (!living.length) {
        cleared = false
        break
      }
      const foeType = species(foe.species).type
      living.sort((a, b) => typeMult(species(b).type, foeType) - typeMult(species(a).type, foeType))
      const allyId = living[0]
      const trace = fight1v1(side(allyId, level, hp.get(allyId) ?? 1, true), side(foe.species, foe.level, 1, false), rng, false)
      if (!trace.win || trace.allyKo) hp.set(allyId, 0)
      else hp.set(allyId, trace.allyMax > 0 ? trace.allyHp / trace.allyMax : 0)
      if (!trace.win) {
        cleared = false
        break
      }
    }
    if (cleared) wins += 1
  }
  return wins / trials
}

interface Clock {
  encounters: number
  onlineMs: number
  offlineMs: number
  gold: number
  offlineSeen: number
  offlineLevels: number
  stopped: boolean
}

function tick(clock: Clock, offline: boolean, interval: number, onlineCapMs: number): void {
  clock.encounters += 1
  if (offline) clock.offlineMs += interval
  else {
    clock.onlineMs += interval
    if (onlineCapMs > 0 && clock.onlineMs >= onlineCapMs) clock.stopped = true
  }
}

function grindChapter(chapter: ChapterDef, mon: OwnedMon, clock: Clock, share: number, interval: number, onlineCapMs: number): boolean {
  const level = meanLevel(chapter)
  const rarity = expectedRarity(chapter)
  const window = Math.floor(OFFLINE_CAP_MS / BASE_ENCOUNTER_MS)
  const route = routeOf(chapter.id)
  const started = clock.encounters
  while (mon.lvl < chapter.cap && clock.encounters - started < MAX_ENCOUNTERS && !clock.stopped) {
    const step = ((clock.encounters - started) % 20) + 1
    const kind = route[step]
    const offline = isOffline(clock.encounters, share)
    if (offline && clock.offlineSeen >= window) {
      clock.offlineSeen = 0
      clock.offlineLevels = OFFLINE_LEVEL_CAP
    }
    const before = mon.lvl
    if (kind === 'wild') {
      addExp(mon, fightExp(level, rarity, offline), chapter.cap, offline ? clock.offlineLevels : null)
      clock.gold += 4 * level
    } else if (kind === 'trainer') {
      for (let foe = 0; foe < TRAINER_COUNT; foe++) {
        addExp(mon, fightExp(level, rarity, offline), chapter.cap, offline ? clock.offlineLevels : null)
      }
      clock.gold += 25 * level * TRAINER_COUNT
    } else if (kind === 'find') clock.gold += 50 * chapter.id
    if (offline) {
      clock.offlineSeen += 1
      clock.offlineLevels = Math.max(0, clock.offlineLevels - (mon.lvl - before))
    }
    tick(clock, offline, interval, onlineCapMs)
  }
  return mon.lvl >= chapter.cap
}

function climb(options: BalanceOptions): ClimbRow[] {
  const interval = BASE_ENCOUNTER_MS / options.speed
  const onlineCapMs = options.onlineHours > 0 ? options.onlineHours * 3_600_000 : 0
  const rows: ClimbRow[] = []
  const clock: Clock = {
    encounters: 0,
    onlineMs: 0,
    offlineMs: 0,
    gold: START_GOLD,
    offlineSeen: 0,
    offlineLevels: OFFLINE_LEVEL_CAP,
    stopped: false
  }
  let carry = monAt(STARTER_LEVEL)
  for (const region of regions) {
    const roads = region.chapters.filter((chapter) => !chapter.council && !chapter.special)
    const council = region.chapters.find((chapter) => chapter.council)
    if (region.id > 1 && !clock.stopped) {
      const first = roads[0]
      const wild = meanLevel(first)
      const common = [...first.day].sort((a, b) => b.weight - a.weight)[0]
      const rarity = common ? species(common.species).baseRarity : 0
      const chance = catchChance(rarity, wild, carry.lvl)
      const attempts = Math.max(1, Math.ceil(1 / Math.max(chance, 0.0001)))
      for (let i = 0; i < attempts && !clock.stopped; i++) {
        const offline = isOffline(clock.encounters, options.offlineShare)
        clock.gold += 4 * wild
        tick(clock, offline, interval, onlineCapMs)
      }
      carry = monAt(wild)
    }
    for (const chapter of roads) {
      const levelIn = carry.lvl
      const before = clock.encounters
      const goldBefore = clock.gold
      const reached = clock.stopped ? false : grindChapter(chapter, carry, clock, options.offlineShare, interval, onlineCapMs)
      if (reached) clock.gold += chapter.guardian.gold
      rows.push({
        regionId: region.id,
        region: region.name,
        name: chapter.name,
        kind: 'chapter',
        cap: chapter.cap,
        levelIn,
        levelOut: carry.lvl,
        encounters: clock.encounters - before,
        hours: (clock.onlineMs + clock.offlineMs) / 3_600_000,
        goldGain: clock.gold - goldBefore,
        reached
      })
    }
    if (council?.council) {
      const grand = council.council.members[council.council.members.length - 1]
      const levelIn = carry.lvl
      const before = clock.encounters
      const goldBefore = clock.gold
      if (!clock.stopped) {
        for (const member of council.council.members) {
          const rarity = expectedRarity(roads[roads.length - 1] ?? council)
          for (const foe of member.team) {
            const offline = isOffline(clock.encounters, options.offlineShare)
            const beforeLevel = carry.lvl
            addExp(carry, fightExp(foe.level, rarity, offline), member.cap, offline ? clock.offlineLevels : null)
            if (offline) clock.offlineLevels = Math.max(0, clock.offlineLevels - (carry.lvl - beforeLevel))
            tick(clock, offline, interval, onlineCapMs)
          }
          clock.gold += member.gold
        }
        clock.gold += council.council.rewardGold
      }
      rows.push({
        regionId: region.id,
        region: region.name,
        name: `Hoher Rat (${grand.epithet})`,
        kind: 'council',
        cap: grand.cap,
        levelIn,
        levelOut: carry.lvl,
        encounters: clock.encounters - before,
        hours: (clock.onlineMs + clock.offlineMs) / 3_600_000,
        goldGain: clock.gold - goldBefore,
        reached: !clock.stopped
      })
    }
  }
  return rows
}

function winRows(trials: number, seed: number): WinRow[] {
  const rows: WinRow[] = []
  let salt = seed
  for (const region of regions) {
    const team = teamOf(region.id)
    for (const chapter of region.chapters) {
      if (chapter.council || chapter.special || !chapter.guardian.team.length) continue
      rows.push({
        label: `${region.name} · ${chapter.name}`,
        cap: chapter.cap,
        teamLevel: chapter.cap,
        foes: chapter.guardian.team.map((mon) => mon.level).join('/'),
        rate: clearRate(team, chapter.cap, chapter.guardian.team, trials, salt++)
      })
    }
    const council = region.chapters.find((chapter) => chapter.council)?.council
    const roadCap = [...region.chapters].reverse().find((chapter) => !chapter.council && !chapter.special)?.cap ?? 0
    if (!council) continue
    for (const member of council.members) {
      rows.push({
        label: `${region.name} · ${member.epithet} ${member.name}`,
        cap: member.cap,
        teamLevel: member.cap,
        foes: member.team.map((mon) => mon.level).join('/'),
        rate: clearRate(team, member.cap, member.team, trials, salt++)
      })
    }
    const chain = council.members.flatMap((member) => member.team)
    rows.push({
      label: `${region.name} · Rat-Kette bei Ankunftslevel`,
      cap: council.members[council.members.length - 1].cap,
      teamLevel: roadCap,
      foes: 'alle fünf',
      rate: clearRate(team, roadCap, chain, trials, salt++)
    })
  }
  return rows
}

function catchLines(): string[] {
  const lines = ['| Seltenheit | Basis | Chance, gleiches Level | Versuche | Chance, Gegner höher | Versuche |', '|---|---:|---:|---:|---:|---:|']
  for (let rarity = 0; rarity <= 9; rarity++) {
    const even = catchChance(rarity, 30, 30)
    const under = catchChance(rarity, 30, 20)
    lines.push(`| ${rarity} | ${fmt(CATCH_BASE[rarity], 2)} | ${pct(even)} | ${fmt(1 / even, 1)} | ${pct(under)} | ${fmt(1 / under, 1)} |`)
  }
  lines.push('')
  lines.push(`Deckel der Fangchance: ${pct(CATCH_CAP)}. „Gegner höher“ setzt den Kämpfer 10 Level unter den Gegner und damit den Faktor 0,8.`)
  return lines
}

function priceLines(rows: ClimbRow[]): string[] {
  const reached = rows.filter((row) => row.reached)
  const last = reached[reached.length - 1]
  const perHour = (row: ClimbRow | undefined) => {
    if (!row || row.encounters <= 0) return 0
    const slice = row.hours - (reached[reached.indexOf(row) - 1]?.hours ?? 0)
    return slice > 0 ? row.goldGain / slice : 0
  }
  const chapter = (regionId: number, name: string) => reached.find((row) => row.regionId === regionId && row.name === name)
  const gates: { name: string; cost: number; at: ClimbRow | undefined; note: string }[] = [
    { name: 'EP-Kristall S', cost: CRYSTALS[0].price, at: chapter(1, 'Wiesenpfad'), note: 'sofort' },
    { name: 'EP-Kristall M', cost: CRYSTALS[1].price, at: chapter(1, 'Moorsenke'), note: 'ab 3 Wappen' },
    { name: 'EP-Kristall L', cost: CRYSTALS[2].price, at: chapter(1, 'Frostgrat'), note: 'ab 6 Wappen' },
    { name: 'EP-Kristall XL', cost: CRYSTALS[3].price, at: chapter(1, 'Klingenschmiede'), note: 'ab 8 Wappen' },
    { name: 'teuerste Frucht', cost: Math.max(...FRUITS.map((fruit) => fruit.price)), at: chapter(1, 'Wiesenpfad'), note: 'Glanzfrucht' },
    { name: 'Hortplatz 2', cost: HORT_PRICES[1], at: chapter(1, 'Wiesenpfad'), note: 'ohne Siegel' },
    { name: 'Hortplatz 3', cost: HORT_PRICES[2], at: chapter(1, 'Klingenschmiede'), note: 'nach Ratsiegel, Einkommen aus Klingenschmiede' },
    { name: 'Hortplatz 4', cost: HORT_PRICES[3], at: chapter(2, 'Polarnacht'), note: 'nach Zweitem Ratsiegel, Einkommen aus Polarnacht' },
    { name: 'ein Dreh ×1', cost: SPIN_COST, at: chapter(1, 'Funkenwald'), note: 'ab Wappen 3' }
  ]
  const lines = ['| Preis | Kosten | Gold beim Freischalten | Gold je Stunde dort | Stunden zum Preis |', '|---|---:|---:|---:|---:|']
  for (const gate of gates) {
    const have = gate.at ? gate.at.hours === 0 ? START_GOLD : cumulativeGold(reached, gate.at) : 0
    const rate = perHour(gate.at)
    const need = rate > 0 ? gate.cost / rate : Number.POSITIVE_INFINITY
    lines.push(`| ${gate.name} (${gate.note}) | ${fmt(gate.cost, 0)} G | ${gate.at ? fmt(have, 0) : '—'} G | ${fmt(rate, 0)} G | ${Number.isFinite(need) ? hours(need * 3_600_000) : '—'} |`)
  }
  const marks = exactPayoutRate() * SPIN_COST / MARK_GOLD
  lines.push('')
  lines.push(`Ein Dreh kostet ${fmt(SPIN_COST, 0)} G und zahlt im Schnitt ${fmt(marks, 2)} Glücksmarken (Auszahlungsquote ${pct(exactPayoutRate())} bei ${fmt(MARK_GOLD, 0)} G je Marke).`)
  for (const prize of PRIZES) {
    const spins = prize.marks / marks
    lines.push(`- ${prize.regionName} ${species(prize.species).name}: ${fmt(prize.marks, 0)} Marken, etwa ${fmt(spins, 0)} Drehungen, ${fmt(spins * SPIN_COST, 0)} G.`)
  }
  if (last) lines.push('')
  lines.push(`Gold am Ende der Messung: ${fmt(cumulativeGold(reached, reached[reached.length - 1]), 0)} G.`)
  return lines
}

function cumulativeGold(rows: ClimbRow[], until: ClimbRow | undefined): number {
  if (!until) return START_GOLD
  let gold = START_GOLD
  for (const row of rows) {
    gold += row.goldGain
    if (row === until) break
  }
  return gold
}

function findings(rows: ClimbRow[], wins: WinRow[]): string[] {
  const notes: string[] = []
  let previous = 0
  const slow: string[] = []
  for (const row of rows) {
    const slice = row.hours - previous
    previous = row.hours
    if (row.kind === 'chapter' && slice >= 1) slow.push(`${row.region} ${row.name} ${fmt(slice, 2)} h bis Cap ${row.cap}`)
  }
  if (slow.length) notes.push(`Lange Schleifzeiten: ${slow.join('; ')}.`)
  notes.push('Jeder Hohe Rat liegt 14 Level über dem Cap des 8. Kapitels. Dort gibt es keine Wildnis, und das Kapitel-Cap gibt vorher keine EP mehr her. Die Rat-Kette wird mit dem Ankunftslevel gemessen.')
  const singles = wins.filter((win) => !win.label.includes('Rat-Kette'))
  const hard = singles.filter((win) => win.rate < 0.5)
  const chains = wins.filter((win) => win.label.includes('Rat-Kette'))
  if (hard.length) notes.push(`${hard.length} von ${singles.length} Einzelkämpfen liegen unter 50 % auf Cap-Level, davon ${hard.filter((win) => win.rate === 0).length} bei 0 %.`)
  for (const region of regions) {
    const slice = hard.filter((win) => win.label.startsWith(region.name))
    if (slice.length) notes.push(`${region.name}: ${slice.map((win) => `${win.label} ${pct(win.rate)} (Gegner ${win.foes})`).join('; ')}.`)
  }
  notes.push(`Rat-Ketten: ${chains.map((win) => `${win.label} ${pct(win.rate)} auf Level ${win.teamLevel}`).join('; ')}.`)
  const to260 = expBetween(STARTER_LEVEL, 260)
  const lastRoad = regions.flatMap((region) => region.chapters).filter((chapter) => !chapter.council && !chapter.special).at(-1)
  const rate = lastRoad ? fightExp(meanLevel(lastRoad), expectedRarity(lastRoad), false) : 1
  const fights = to260 / Math.max(rate, 1)
  notes.push(`EP von Level ${STARTER_LEVEL} bis 260: ${fmt(to260, 0)}. Mit der Wild-EP von ${lastRoad?.name ?? 'dem letzten Kapitel'} (${fmt(rate, 0)} EP je Online-Kampf) sind das ${fmt(fights, 0)} Kämpfe und ${hours(fights * BASE_ENCOUNTER_MS)}. Die Kurve hat kein eigenes Höchstlevel. Das Kapitel-Cap schneidet sie ab, der Rat selbst füttert sie nicht.`)
  notes.push(`Seltenheit 9 braucht im Schnitt ${fmt(1 / catchChance(9, 30, 30), 0)} Versuche bei gleichem Level (Basis ${fmt(CATCH_BASE[9], 2)}). Seltenheit 0 ist bei ${pct(CATCH_CAP)} gedeckelt. Seltenheit 8 braucht ${fmt(1 / catchChance(8, 30, 30), 0)} Versuche.`)
  return notes
}

export function buildReport(options: BalanceOptions): string {
  const rows = climb(options)
  const online = climb({ ...options, offlineShare: 0 })
  const wins = winRows(options.trials, options.seed)
  const lines: string[] = []
  lines.push('# Balance-Messung')
  lines.push('')
  lines.push('Messung gegen die aktuellen Spielwerte. Es wurde nichts daran geändert.')
  lines.push('')
  lines.push(`Parameter: Tempo ×${options.speed} (${fmt(BASE_ENCOUNTER_MS / options.speed / 1000, 2)} s je Begegnung), Offline-Anteil ${pct(options.offlineShare)}, Stichprobe ${options.trials} Kämpfe, Seed ${options.seed}. Online-Stundenlimit: ${options.onlineHours > 0 ? fmt(options.onlineHours, 1) : 'keins'}.`)
  lines.push('')
  lines.push('## Annahmen')
  lines.push('')
  lines.push('- Ein Träger kämpft immer selbst und ist der Begleiter (+30 % EP). Wegkämpfe werden gewonnen.')
  lines.push('- EP je besiegtem Gegner: 8 × Level × (1 + 0,25 × Seltenheit), wie im Kampf. Offline halbiert und höchstens 12 Level je 8 Stunden Abwesenheit.')
  lines.push('- Der Träger schleift ein Kapitel bis zum Cap. Schritt 20 wird dabei nicht als Wächterkampf gewertet. Das Wappen-Gold gibt es einmal beim Erreichen.')
  lines.push('- In einer neuen Region zählt der erste Fang. Das Tier startet auf dem mittleren Wild-Level. Der alte Träger darf diesen Fang noch bestreiten.')
  lines.push('- Die Siegquote ist `fight1v1` mit einem Sechser-Team auf dem genannten Level. Ein verlorener 1v1 beendet den Wächter, wie im Spiel. Der Auto-Wechsel schickt das typstärkste lebende Tier, auch angeschlagen. Gegner bekommen die Erwachen-Werte, aber nicht den Skill-Bonus.')
  lines.push('- Fund-Gold ist 50 × Kapitelnummer der Region. Trainer haben im Schnitt 2 Monster. Seltenheit und Wild-Level sind der gewichtete Tages-Schnitt.')
  lines.push('')
  lines.push('## Spielzeit, Level, Gold')
  lines.push('')
  lines.push('| Region | Station | Cap | Level rein | Level raus | Begegnungen | Stunden bis hier (gemischt) | Stunden bis hier (nur online) | Gold in der Station | Gold gesamt |')
  lines.push('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|')
  rows.forEach((row, index) => {
    const pure = online[index]
    lines.push(`| ${row.region} | ${row.name}${row.reached ? '' : ' (nicht erreicht)'} | ${row.cap} | ${row.levelIn} | ${row.levelOut} | ${fmt(row.encounters, 0)} | ${fmt(row.hours, 2)} | ${fmt(pure?.hours ?? 0, 2)} | ${fmt(row.goldGain, 0)} | ${fmt(cumulativeGold(rows, row), 0)} |`)
  })
  lines.push('')
  lines.push('## Wächter und Rat')
  lines.push('')
  lines.push('| Kampf | Cap | Team-Level | Gegner-Level | Siegquote |')
  lines.push('|---|---:|---:|---|---:|')
  for (const win of wins) lines.push(`| ${win.label} | ${win.cap} | ${win.teamLevel} | ${win.foes} | ${pct(win.rate)} |`)
  lines.push('')
  lines.push('## Fang')
  lines.push('')
  lines.push(...catchLines())
  lines.push('')
  lines.push('## Gold gegen Preise')
  lines.push('')
  lines.push(...priceLines(rows))
  lines.push('')
  lines.push('## Auffälligkeiten')
  lines.push('')
  for (const note of findings(rows, wins)) lines.push(`- ${note}`)
  lines.push('')
  return lines.join('\n')
}

if (!process.env.VITEST) {
  const report = buildReport(parseArgs(process.argv.slice(2)))
  writeFileSync(new URL('../../docs/balance-report.md', import.meta.url), report)
  console.log(report)
}
