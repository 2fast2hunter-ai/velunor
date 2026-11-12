import { writeFileSync } from 'node:fs'
import { species } from '../data'
import {
  BASE_ENCOUNTER_MS,
  BUDDY_BONUS,
  CATCH_BASE,
  CATCH_CAP,
  OFFLINE_EXP_FACTOR,
  RARITY_EXP,
  START_GOLD,
  STARTER_LEVEL,
  type Speed
} from './const'
import { bossScale, clearRate, referenceTeam } from './gauntlet'
import { catchChance, expectedCatchAttempts } from './sim'
import { HORT_PRICES } from './hort'
import { regions, routeOf, type ChapterDef } from './route'
import { FRUITS, crystalExp, sig2, wildFightValue } from './shop'
import { addExp, expToNext } from './stats'
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
  kind: 'early' | 'late' | 'council' | 'grand'
  factor: number
  scale: string
  cap: number
  foes: string
  rate: number
  low: number
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
    trials: Math.max(1, Math.floor(read('trials', 200))),
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
  const base = EXP_PER_LEVEL * level * (1 + RARITY_EXP * rarity) * (1 + BUDDY_BONUS)
  return offline ? base * OFFLINE_EXP_FACTOR : base
}

function expBetween(from: number, to: number): number {
  let total = 0
  for (let level = from; level < to; level++) total += expToNext(level)
  return total
}


interface Clock {
  encounters: number
  onlineMs: number
  offlineMs: number
  gold: number
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
  const route = routeOf(chapter.id)
  const started = clock.encounters
  while (mon.lvl < chapter.cap && clock.encounters - started < MAX_ENCOUNTERS && !clock.stopped) {
    const step = ((clock.encounters - started) % 20) + 1
    const kind = route[step]
    const offline = isOffline(clock.encounters, share)
    if (kind === 'wild') {
      addExp(mon, fightExp(level, rarity, offline), chapter.cap, null)
      clock.gold += 4 * level
    } else if (kind === 'trainer') {
      for (let foe = 0; foe < TRAINER_COUNT; foe++) {
        addExp(mon, fightExp(level, rarity, offline), chapter.cap, null)
      }
      clock.gold += 25 * level * TRAINER_COUNT
    } else if (kind === 'find') clock.gold += 50 * chapter.id
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
            addExp(carry, fightExp(foe.level, rarity, offline), member.cap, null)
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

const BANDS = {
  early: { cap: [0.7, 0.9], low: [0.4, 0.6] },
  late: { cap: [0.6, 0.8], low: [0.3, 0.5] },
  council: { cap: [0.55, 0.75], low: [0.25, 0.45] },
  grand: { cap: [0.45, 0.65], low: [0.15, 0.35] }
} as const

function scaleText(source: { factor?: number; hpFactor?: number; atkFactor?: number; defFactor?: number }): string {
  const scale = bossScale(source)
  return `${fmt(scale.hp, 2)}/${fmt(scale.atk, 2)}/${fmt(scale.def, 2)}`
}

function inBand(rate: number, band: readonly [number, number]): boolean {
  return rate >= band[0] - 1e-9 && rate <= band[1] + 1e-9
}

function winRows(trials: number, seed: number): WinRow[] {
  const rows: WinRow[] = []
  let salt = seed
  for (const region of regions) {
    const team = referenceTeam(region.id)
    for (const chapter of region.chapters) {
      if (chapter.foyer || chapter.council || chapter.special || !chapter.guardian.team.length) continue
      const kind = chapter.id <= 2 ? 'early' : 'late'
      const factor = chapter.guardian.factor ?? 1
      const foes = chapter.guardian.team
      rows.push({
        label: `${region.name} · ${chapter.name}`,
        kind,
        factor,
        scale: scaleText(chapter.guardian),
        cap: chapter.cap,
        foes: foes.map((mon) => mon.level).join('/'),
        rate: clearRate(team, chapter.cap, foes, chapter.guardian, trials, salt++),
        low: clearRate(team, chapter.cap - 3, foes, chapter.guardian, trials, salt++)
      })
    }
    const councilChapter = region.chapters.find((chapter) => chapter.council)
    const council = councilChapter?.council
    if (!council || !councilChapter) continue
    council.members.forEach((member, index) => {
      const kind = index === council.members.length - 1 ? 'grand' : 'council'
      const factor = member.factor ?? 1
      rows.push({
        label: `${region.name} · ${member.epithet} ${member.name}`,
        kind,
        factor,
        scale: scaleText(member),
        cap: councilChapter.cap,
        foes: member.team.map((mon) => mon.level).join('/'),
        rate: clearRate(team, councilChapter.cap, member.team, member, trials, salt++),
        low: clearRate(team, councilChapter.cap - 3, member.team, member, trials, salt++)
      })
    })
  }
  return rows
}

function catchLines(): string[] {
  const lines = ['| Seltenheit | Basis | Chance, gleiches Level | Versuche | Chance, Gegner höher | Versuche |', '|---|---:|---:|---:|---:|---:|']
  for (let rarity = 0; rarity <= 9; rarity++) {
    const even = catchChance(rarity, 30, 30)
    const under = catchChance(rarity, 30, 20)
    lines.push(`| ${rarity} | ${fmt(CATCH_BASE[rarity], 3)} | ${pct(even)} | ${fmt(expectedCatchAttempts(rarity, 30, 30), 1)} | ${pct(under)} | ${fmt(expectedCatchAttempts(rarity, 30, 20), 1)} |`)
  }
  lines.push('')
  lines.push(`Deckel der Fangchance: ${pct(CATCH_CAP)}. „Gegner höher“ setzt den Kämpfer 10 Level unter den Gegner und damit den Faktor 0,8.`)
  return lines
}

function crystalCost(row: ClimbRow | undefined, id: 's' | 'm' | 'l' | 'xl'): number {
  if (!row) return 0
  const chapter = regions.find((region) => region.id === row.regionId)?.chapters.find((item) => item.name === row.name)
  if (!chapter) return 0
  const wild = wildFightValue(chapter)
  return sig2(2 * (crystalExp(id, Math.max(1, row.levelOut)) / Math.max(1, wild.exp)) * wild.gold)
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
    { name: 'EP-Kristall S', cost: crystalCost(chapter(1, 'Wiesenpfad'), 's'), at: chapter(1, 'Wiesenpfad'), note: 'sofort' },
    { name: 'EP-Kristall M', cost: crystalCost(chapter(1, 'Moorsenke'), 'm'), at: chapter(1, 'Moorsenke'), note: 'ab 3 Wappen' },
    { name: 'EP-Kristall L', cost: crystalCost(chapter(1, 'Frostgrat'), 'l'), at: chapter(1, 'Frostgrat'), note: 'ab 6 Wappen' },
    { name: 'EP-Kristall XL', cost: crystalCost(chapter(1, 'Klingenschmiede'), 'xl'), at: chapter(1, 'Klingenschmiede'), note: 'ab 8 Wappen' },
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
  const names = { early: 'Wächter Kap. 1–2', late: 'Wächter Kap. 3–8', council: 'Rat 1–4', grand: 'Großwächter' } as const
  for (const kind of ['early', 'late', 'council', 'grand'] as const) {
    const slice = wins.filter((win) => win.kind === kind)
    if (!slice.length) continue
    const caps = slice.map((win) => win.rate).sort((a, b) => a - b)
    const lows = slice.map((win) => win.low).sort((a, b) => a - b)
    const mid = (values: number[]) => values.length % 2 ? values[(values.length - 1) / 2] : (values[values.length / 2 - 1] + values[values.length / 2]) / 2
    const band = BANDS[kind]
    const missed = slice.filter((win) => !inBand(win.rate, band.cap) || !inBand(win.low, band.low) || win.rate < 0.45 || win.rate > 0.9)
    notes.push(`${names[kind]}: Cap min ${pct(caps[0])} / median ${pct(mid(caps))}, Cap−3 min ${pct(lows[0])} / median ${pct(mid(lows))}. Ziel Cap ${pct(band.cap[0])}–${pct(band.cap[1])}, Cap−3 ${pct(band.low[0])}–${pct(band.low[1])}.${missed.length ? ` Daneben: ${missed.map((win) => `${win.label} ${pct(win.rate)} / ${pct(win.low)}`).join('; ')}.` : ' Alle im Band.'}`)
  }
  const to260 = expBetween(STARTER_LEVEL, 260)
  const lastRoad = regions.flatMap((region) => region.chapters).filter((chapter) => !chapter.council && !chapter.special).at(-1)
  const rate = lastRoad ? fightExp(meanLevel(lastRoad), expectedRarity(lastRoad), false) : 1
  const fights = to260 / Math.max(rate, 1)
  notes.push(`EP von Level ${STARTER_LEVEL} bis 260: ${fmt(to260, 0)}. Mit der Wild-EP von ${lastRoad?.name ?? 'dem letzten Kapitel'} (${fmt(rate, 0)} EP je Online-Kampf) sind das ${fmt(fights, 0)} Kämpfe und ${hours(fights * BASE_ENCOUNTER_MS)}. Die Kurve hat kein eigenes Höchstlevel. Das Kapitel-Cap schneidet sie ab, der Rat selbst füttert sie nicht.`)
  notes.push(`Seltenheit 9 braucht mit Bannsiegel-Fortschritt im Schnitt ${fmt(expectedCatchAttempts(9), 1)} Versuche (Basis ${fmt(CATCH_BASE[9], 3)}). Seltenheit 8 braucht ${fmt(expectedCatchAttempts(8), 1)}. Seltenheit 0 bleibt bei ${pct(CATCH_CAP)} gedeckelt.`)
  return notes
}

export function buildReport(options: BalanceOptions): string {
  const rows = climb(options)
  const online = climb({ ...options, offlineShare: 0 })
  const wins = winRows(options.trials, options.seed)
  const lines: string[] = []
  lines.push('# Balance-Messung')
  lines.push('')
  lines.push('Abschnitt B–E gegen die Werte nach Schritt 10a. EP-Faktor 12, Exponent 2,45. Offline ohne Level-Deckel, weiter 8 Stunden und EP ×0,5.')
  lines.push('')
  lines.push(`Parameter: Tempo ×${options.speed} (${fmt(BASE_ENCOUNTER_MS / options.speed / 1000, 2)} s je Begegnung), Offline-Anteil ${pct(options.offlineShare)}, Stichprobe ${options.trials} Kämpfe, Seed ${options.seed}. Online-Stundenlimit: ${options.onlineHours > 0 ? fmt(options.onlineHours, 1) : 'keins'}.`)
  lines.push('')
  lines.push('## Annahmen')
  lines.push('')
  lines.push('- Ein Träger kämpft immer selbst und ist der Begleiter (+30 % EP). Wegkämpfe werden gewonnen.')
  lines.push('- EP je besiegtem Gegner: 8 × Level × (1 + 0,15 × Seltenheit), Kämpfer 100 %, Team 50 %, Begleiter +30 %. Offline halbiert, ohne Level-Deckel.')
  lines.push('- Der Träger schleift ein Kapitel bis zum Cap. Schritt 20 wird dabei nicht als Wächterkampf gewertet. Das Wappen-Gold gibt es einmal beim Erreichen.')
  lines.push('- In einer neuen Region zählt der erste Fang. Das Tier startet auf dem mittleren Wild-Level. Der alte Träger darf diesen Fang noch bestreiten.')
  lines.push('- Die Siegquote ist ein Sechser-Team aus dem Pool der Region. Der Kampf endet erst, wenn alle Verbündeten oder alle Gegner k.o. sind. HP bleiben. Der Boss-Faktor liegt auf HP, ATK und DEF.')
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
  lines.push('| Kampf | Faktor HP/ATK/DEF | Cap | Gegner | Quote auf Cap | Quote auf Cap−3 |')
  lines.push('|---|---:|---:|---|---:|---:|')
  for (const win of wins) lines.push(`| ${win.label} | ${win.scale} | ${win.cap} | ${win.foes} | ${pct(win.rate)} | ${pct(win.low)} |`)
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
  lines.push(...acceptanceLines(online, wins))
  return lines.join('\n')
}

const REGION_GOALS: Record<string, number> = {
  Grünmark: 10,
  Frostküste: 30,
  Glutgebirge: 50,
  Schattenmoor: 70,
  Himmelsthron: 90
}

function acceptanceLines(online: ClimbRow[], wins: WinRow[]): string[] {
  const lines = ['## Abnahme', '']
  let previous = 0
  let gold = START_GOLD
  const hours = new Map<string, number>()
  const bank = new Map<string, number>()
  const level = new Map<string, number>()
  for (const row of online) {
    const slice = row.hours - previous
    previous = row.hours
    hours.set(row.region, (hours.get(row.region) ?? 0) + slice)
    gold += row.goldGain
    bank.set(row.region, gold)
    level.set(row.region, row.levelOut)
  }
  lines.push('| Region | Stunden online | Ziel | Spanne ±20 % |')
  lines.push('|---|---:|---:|---|')
  let sum = 0
  for (const [name, goal] of Object.entries(REGION_GOALS)) {
    const got = hours.get(name) ?? 0
    sum += got
    const low = goal * 0.8
    const high = goal * 1.2
    lines.push(`| ${name} | ${fmt(got, 2)} | ${goal} | ${fmt(low, 1)}–${fmt(high, 1)} ${got >= low && got <= high ? 'im Band' : 'daneben'} |`)
  }
  lines.push('')
  lines.push(`Summe ${fmt(sum, 1)} h. Ziel 200–300 h: ${sum >= 200 && sum <= 300 ? 'erfüllt' : 'daneben'}.`)
  const outside = wins.filter((win) => win.rate < 0.45 - 1e-9 || win.rate > 0.9 + 1e-9)
  const caps = wins.map((win) => win.rate).sort((a, b) => a - b)
  lines.push(`Cap-Quoten ${pct(caps[0])} bis ${pct(caps[caps.length - 1])}. Außerhalb 45–90 %: ${outside.length ? outside.map((win) => `${win.label} ${pct(win.rate)}`).join('; ') : 'keine'}.`)
  lines.push(`Fangversuche mit Bannsiegel-Fortschritt: Seltenheit 8 im Schnitt ${fmt(expectedCatchAttempts(8), 1)}, Seltenheit 9 im Schnitt ${fmt(expectedCatchAttempts(9), 1)}. Ziel 10–20.`)
  lines.push('Gold: Wild- und Trainer-Gold unverändert. Kristallpreise folgen 2 × (Kristall-EP ÷ Wild-EP) × Wild-Gold, zwei signifikante Stellen. Hort 0 / 50.000 / 400.000 / 3.000.000 G. Rad 1.000 × Regionsnummer² G, weiter 1,7 Marken je Dreh.')
  for (const region of regions) {
    const road = [...region.chapters].reverse().find((chapter) => !chapter.council && !chapter.special)
    if (!road) continue
    const at = level.get(region.name) ?? road.cap
    const wild = wildFightValue(road)
    const xl = sig2(2 * (crystalExp('xl', at) / Math.max(1, wild.exp)) * wild.gold)
    const fruit = 25_000 * region.id
    const hort = region.id <= 1 ? 400_000 : 3_000_000
    const dearest = Math.max(xl, fruit, hort)
    const held = bank.get(region.name) ?? 0
    lines.push(`- ${region.name}: Kontostand ${fmt(held, 0)} G, teuerster Preis ${fmt(dearest, 0)} G (XL ${fmt(xl, 0)}), Verhältnis ${fmt(held / dearest, 1)}.`)
  }
  lines.push('')
  return lines
}

if (!process.env.VITEST) {
  const report = buildReport(parseArgs(process.argv.slice(2)))
  writeFileSync(new URL('../../docs/balance-report.md', import.meta.url), report)
  console.log(report)
}
