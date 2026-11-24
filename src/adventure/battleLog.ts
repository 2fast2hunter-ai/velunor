import { species } from '../data'
import { moveLabel } from '../battle/typeFx'
import type { TypeId } from '../types'
import type { FightHit, FightTrace } from './battle'
import { t, type Lang } from './i18n'
import type { UltPattern } from './ult'

export const BATTLE_LOG_KEEP = 10

export type LogIcon = 'angriff' | 'krit' | 'ult' | 'heilung' | 'schild' | 'status' | 'wetter' | 'ko' | 'wechsel' | 'boss'

export interface BattleLogLine {
  icon: LogIcon
  sentence: string
  who: string
  move: string
  amount: number | null
  tags: string[]
  traceIndex: number
  frameIndex: number
  hitIndex: number
  frameAllyHp: number
  frameFoeHp: number
  frameText: string
}

export interface BattleLogBout {
  label: string
  lines: BattleLogLine[]
}

export interface BattleFightLog {
  bouts: BattleLogBout[]
}

const ULT_KEY: Record<UltPattern, string> = {
  durchschlag: 'log.ult.strike',
  schildwall: 'log.ult.wall',
  impuls: 'log.ult.impulse',
  fessel: 'log.ult.fetter',
  heilleucht: 'log.ult.glow'
}

export function rememberBattleLog(prev: readonly BattleFightLog[], next: BattleFightLog): BattleFightLog[] {
  return [...prev, next].slice(-BATTLE_LOG_KEEP)
}

export function sentenceWords(sentence: string): number {
  return sentence.split(/\s+/).filter((word) => word.replace(/[–—\-:.,]/g, '').length > 0).length
}

function iconFor(hit: FightHit): LogIcon {
  if (hit.ko) return 'ko'
  if (hit.helper || hit.pulse) return 'boss'
  if (hit.ult === 'schildwall') return 'schild'
  if (hit.ult) return 'ult'
  if (hit.crit) return 'krit'
  if (hit.kind === 'heal') return 'heilung'
  if (hit.kind === 'status') return 'status'
  if (hit.weather != null && Math.abs(hit.weather - 1) > 0.001) return 'wetter'
  return 'angriff'
}

const MOVE_EN: Record<TypeId, string> = {
  fire: 'Ember Strike', water: 'Water Jet', plant: 'Vine Lash', earth: 'Earth Rift', wind: 'Wind Sickle',
  ice: 'Ice Splinter', lightning: 'Lightning Strike', poison: 'Poison Bubble', stone: 'Stone Throw', crystal: 'Prism Flash',
  metal: 'Metal Blade', fighting: 'Strike Flurry', beast: 'Claw Strike', insect: 'Swarm Sting', light: 'Light Pillar',
  shadow: 'Shadow Pull', ghost: 'Ghost Flame', psychic: 'Psycho Wave', sound: 'Sound Burst', dragon: 'Dragon Breath'
}

function englishSkill(id: string): string | null {
  if (!/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(id) || id.endsWith('_skill')) return null
  const words = id.split('_').filter((word) => word.length > 1)
  if (!words.length) return null
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
}

function attackName(lang: Lang, speciesId: string, type: TypeId): string {
  try {
    const skill = species(speciesId).skill
    if (lang === 'en') return englishSkill(skill.id) ?? MOVE_EN[type] ?? moveLabel(type)
    const named = skill.name?.trim()
    if (named) return named
  } catch { /* type attack below */ }
  return lang === 'en' ? (MOVE_EN[type] ?? moveLabel(type)) : moveLabel(type)
}

function skillStatusIds(speciesId: string): string[] {
  try {
    return species(speciesId).skill.effects.flatMap((effect) => effect.kind === 'status' ? [effect.status] : [])
  } catch { return [] }
}

function moveOf(lang: Lang, hit: FightHit, speciesId: string, mark: string | null, statusId: string | null): string {
  if (hit.ult) return t(lang, ULT_KEY[hit.ult])
  if (hit.kind === 'heal') return t(lang, 'log.healName')
  if (hit.kind === 'status') {
    if (statusId) return t(lang, `log.status.${statusId}`)
    if (mark) return t(lang, `log.ailment.${mark}`)
    return t(lang, 'log.statusName')
  }
  return attackName(lang, speciesId, hit.type)
}

function weatherTag(lang: Lang, factor: number | undefined): string | null {
  if (factor == null || Math.abs(factor - 1) <= 0.001) return null
  const pct = Math.round((factor - 1) * 100)
  const shown = `${pct > 0 ? '+' : ''}${pct}`
  return t(lang, 'log.tag.weather', { pct: shown })
}

function tagsFor(lang: Lang, hit: FightHit): string[] {
  const tags: string[] = []
  if (hit.band === 'strong') tags.push(t(lang, 'log.tag.strong'))
  if (hit.band === 'weak') tags.push(t(lang, 'log.tag.weak'))
  const weather = weatherTag(lang, hit.weather)
  if (weather) tags.push(weather)
  if (hit.crit) tags.push(t(lang, 'log.tag.crit'))
  if (hit.kind === 'status' && hit.ult) tags.push(t(lang, 'log.tag.status'))
  if (hit.ko) tags.push(t(lang, 'log.tag.ko'))
  return tags
}

/** Name and move stay in front. Damage, crit and KO stay in the tail so a narrow line can shorten only the front. */
export function focusLogParts(sentence: string): { lead: string, tail: string } {
  const mark = sentence.lastIndexOf(' – ')
  if (mark < 0) return { lead: sentence, tail: '' }
  return { lead: sentence.slice(0, mark), tail: sentence.slice(mark) }
}

function sentence(lang: Lang, who: string, move: string, amount: number | null, kind: FightHit['kind'], tag: string | null): string {
  if (kind === 'status' || amount == null) return t(lang, 'log.plain', { who, move })
  if (tag) return t(lang, 'log.lineTag', { who, move, n: amount, tag })
  return t(lang, 'log.line', { who, move, n: amount })
}

function shortTag(tags: string[], lang: Lang, hit: FightHit): string | null {
  if (hit.ko) return t(lang, 'log.tag.ko')
  if (hit.crit) return t(lang, 'log.tag.crit')
  if (hit.band === 'strong') return t(lang, 'log.tag.strong')
  if (hit.band === 'weak') return t(lang, 'log.tag.weak')
  const weather = weatherTag(lang, hit.weather)
  if (weather) return weather
  if (hit.kind === 'status') return t(lang, 'log.tag.status')
  return tags[0] ?? null
}

export function battleLogFromTraces(traces: readonly FightTrace[], lang: Lang): BattleFightLog {
  const bouts: BattleLogBout[] = []
  let kos = 0
  traces.forEach((trace, traceIndex) => {
    const lines: BattleLogLine[] = []
    trace.frames.forEach((frame, frameIndex) => {
      const hits = frame.hits ?? []
      if (!hits.length) {
        const who = frame.text.includes(trace.foeName) && !frame.text.includes(trace.allyName) ? trace.foeName : trace.allyName
        lines.push({
          icon: 'schild',
          sentence: t(lang, 'log.wait', { who }),
          who,
          move: t(lang, 'log.waitMove'),
          amount: null,
          tags: [],
          traceIndex,
          frameIndex,
          hitIndex: -1,
          frameAllyHp: frame.allyHp,
          frameFoeHp: frame.foeHp,
          frameText: frame.text
        })
        return
      }
      const statusIds = new Map<string, string[]>()
      const statusUsed = new Map<string, number>()
      hits.forEach((hit, hitIndex) => {
        const who = hit.from === 'ally' ? trace.allyName : trace.foeName
        const speciesId = hit.from === 'ally' ? trace.allySpecies : trace.foeSpecies
        const mark = hit.from === 'ally' ? (frame.foeMark ?? null) : (frame.allyMark ?? null)
        let statusId: string | null = null
        if (hit.kind === 'status' && !hit.ult) {
          if (!statusIds.has(speciesId)) statusIds.set(speciesId, skillStatusIds(speciesId))
          const list = statusIds.get(speciesId) ?? []
          const at = statusUsed.get(speciesId) ?? 0
          statusId = list[at] ?? list[list.length - 1] ?? null
          statusUsed.set(speciesId, at + 1)
        }
        const move = moveOf(lang, hit, speciesId, mark, statusId)
        const tags = tagsFor(lang, hit)
        const amount = hit.kind === 'status' ? null : hit.amount
        lines.push({
          icon: iconFor(hit),
          sentence: sentence(lang, who, move, amount, hit.kind, shortTag(tags, lang, hit)),
          who,
          move,
          amount,
          tags,
          traceIndex,
          frameIndex,
          hitIndex,
          frameAllyHp: frame.allyHp,
          frameFoeHp: frame.foeHp,
          frameText: frame.text
        })
      })
    })
    if (trace.foeKo) kos += 1
    bouts.push({ label: t(lang, 'log.bout', { n: traceIndex + 1, total: Math.max(traces.length, 1) }), lines })
    if (trace.foeKo && traceIndex < traces.length - 1) {
      const next = traces[traceIndex + 1]
      bouts.push({
        label: t(lang, 'log.switchBout'),
        lines: [{
          icon: 'wechsel',
          sentence: t(lang, 'log.switch', { who: next.allyName, n: kos, total: 6 }),
          who: next.allyName,
          move: t(lang, 'log.switchMove'),
          amount: null,
          tags: [],
          traceIndex,
          frameIndex: -1,
          hitIndex: -1,
          frameAllyHp: trace.frames.at(-1)?.allyHp ?? trace.allyHp,
          frameFoeHp: 0,
          frameText: ''
        }]
      })
    }
  })
  return { bouts }
}

export function lineFor(fight: BattleFightLog, traceIndex: number, frameIndex: number, hitIndex: number): BattleLogLine | null {
  for (const bout of fight.bouts) {
    const found = bout.lines.find((line) => line.traceIndex === traceIndex && line.frameIndex === frameIndex && (hitIndex < 0 || line.hitIndex === hitIndex || line.hitIndex < 0))
    if (found) return found
  }
  return null
}

export function lineForFrame(fight: BattleFightLog, allyHp: number, foeHp: number, text: string): BattleLogLine | null {
  let found: BattleLogLine | null = null
  for (const bout of fight.bouts) {
    for (const line of bout.lines) {
      if (line.frameAllyHp === allyHp && line.frameFoeHp === foeHp && line.frameText === text) found = line
    }
  }
  return found
}

/** Sheet text. The tag lives once, beside the move, not again inside the sentence. */
export function sheetLine(line: BattleLogLine): { main: string, tags: string } {
  const main = line.amount == null ? `${line.who}: ${line.move}` : `${line.who}: ${line.move} – ${line.amount}`
  return { main, tags: line.tags.join(' · ') }
}

export function latestLine(fights: readonly BattleFightLog[]): BattleLogLine | null {
  for (let i = fights.length - 1; i >= 0; i--) {
    const bouts = fights[i].bouts
    for (let b = bouts.length - 1; b >= 0; b--) {
      const lines = bouts[b].lines
      if (lines.length) return lines[lines.length - 1]
    }
  }
  return null
}

export function logIconFile(icon: LogIcon): string {
  return `battle_ui/log/${icon}@2x.png`
}
