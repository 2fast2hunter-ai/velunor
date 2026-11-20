import type { FightFrame, FightHit, FightTrace } from './battle'
import { ENCOUNTER_MS, type Speed } from './const'
import type { FrameShot } from './present'

/** Road fights are A3. Focus fights are A6. Both stay off until those steps go live. */
export const BATTLE_QUEUE = { road: false, focus: false } as const

export type BattleArt = keyof typeof BATTLE_QUEUE

/** Dev-only override. `null` keeps the constant, which is false on main. */
let roadOverride: boolean | null = null

export function setRoadQueue(on: boolean | null): void {
  roadOverride = on
}

/** `?debug=1&roadQueue=1` in a dev build. A production page ignores it. */
export function roadQueueFromSearch(debug: boolean, search: string): boolean {
  if (!debug) return false
  return new URLSearchParams(search).get('roadQueue') === '1'
}

export function battleQueueOn(art: BattleArt): boolean {
  if (art === 'road' && roadOverride != null) return roadOverride
  return BATTLE_QUEUE[art]
}

/** Missing `tempoWeg` keeps the speed the save already had. */
export function roadTempo(speed: Speed, tempoWeg?: Speed | null): Speed {
  return tempoWeg === 1 || tempoWeg === 2 || tempoWeg === 3 ? tempoWeg : speed
}

export type BattlePhase = 'ansage' | 'text' | 'zug' | 'aktion' | 'treffer' | 'ergebnis' | 'wechsel' | 'resultat'

export interface PlannedAction {
  phase: BattlePhase
  start: number
  dur: number
  /** A projectile, a swing or a hit number. At most one of these is active. */
  fx: boolean
  traceIndex: number
  frameIndex: number
  /** -1 when the step is not one hit. */
  hitIndex: number
}

const ROAD = { intro: 300, text: 250, normal: 450, short: 250, key: 900, extra: 200, result: 500, wechsel: 400 }
const FOCUS = { text: 300, ansage: 300, ansageKey: 500, aktion: 400, aktionKey: 600, treffer: 400, trefferKey: 600, ergebnis: 200, ergebnisKey: 400, extra: 200, wechsel: 800 }

function scaleOf(art: BattleArt, tempo: Speed): number {
  if (art === 'focus') return tempo >= 2 ? 2 : 1
  return tempo
}

function ms(base: number, scale: number): number {
  return Math.round(base / scale)
}

function hitIsKey(hit: FightHit): boolean {
  return Boolean(hit.crit || hit.ko || hit.ult || hit.kind === 'status' || hit.helper || hit.pulse)
}

export function frameIsKey(frame: FightFrame, konter = false): boolean {
  if (konter) return true
  return (frame.hits ?? []).some(hitIsKey)
}

/** Length of one trace frame at the given tempo. Road ×2/×3 and focus 2x divide the ×1 table. */
export function zugDauer(frame: FightFrame, art: BattleArt, tempo: Speed = 1, normalsBefore = 0, intro = false, konter = false): number {
  return phasesFor(frame, art, tempo, normalsBefore, intro, konter).reduce((sum, step) => sum + step.dur, 0)
}

function phasesFor(frame: FightFrame, art: BattleArt, tempo: Speed, normalsBefore: number, intro: boolean, konter: boolean): { phase: BattlePhase, dur: number, fx: boolean, hit: number }[] {
  const scale = scaleOf(art, tempo)
  const hits = frame.hits ?? []
  if (!hits.length) {
    if (art === 'road' && intro) return [{ phase: 'ansage', dur: ms(ROAD.intro, scale), fx: false, hit: -1 }]
    const base = art === 'road' ? ROAD.text : FOCUS.text
    return [{ phase: 'text', dur: ms(base, scale), fx: false, hit: -1 }]
  }
  const key = frameIsKey(frame, konter)
  if (art === 'focus') {
    const steps = [
      { phase: 'ansage' as const, dur: ms(key ? FOCUS.ansageKey : FOCUS.ansage, scale), fx: false, hit: -1 },
      { phase: 'aktion' as const, dur: ms(key ? FOCUS.aktionKey : FOCUS.aktion, scale), fx: true, hit: 0 },
      { phase: 'treffer' as const, dur: ms(key ? FOCUS.trefferKey : FOCUS.treffer, scale), fx: true, hit: 0 },
      { phase: 'ergebnis' as const, dur: ms(key ? FOCUS.ergebnisKey : FOCUS.ergebnis, scale), fx: false, hit: -1 }
    ]
    for (let i = 1; i < hits.length; i++) steps.push({ phase: 'treffer', dur: ms(FOCUS.extra, scale), fx: true, hit: i })
    return steps
  }
  const base = key ? ROAD.key : normalsBefore >= 6 ? ROAD.short : ROAD.normal
  const steps = [{ phase: 'zug' as const, dur: ms(base, scale), fx: true, hit: 0 }]
  for (let i = 1; i < hits.length; i++) steps.push({ phase: 'zug', dur: ms(ROAD.extra, scale), fx: true, hit: i })
  return steps
}

/** One action at a time. Road fights are padded to today's encounter window. */
export function planBattle(traces: readonly FightTrace[], art: BattleArt, tempo: Speed = 1): PlannedAction[] {
  const actions: PlannedAction[] = []
  let cursor = 0
  let normals = 0
  const push = (phase: BattlePhase, dur: number, fx: boolean, traceIndex: number, frameIndex: number, hitIndex: number) => {
    actions.push({ phase, start: cursor, dur, fx, traceIndex, frameIndex, hitIndex })
    cursor += dur
  }
  traces.forEach((trace, traceIndex) => {
    trace.frames.forEach((frame, frameIndex) => {
      const hits = frame.hits ?? []
      const intro = art === 'road' && traceIndex === 0 && frameIndex === 0 && hits.length === 0
      const konter = Boolean(trace.counter) && frameIndex === 0 && hits.length > 0
      for (const step of phasesFor(frame, art, tempo, normals, intro, konter)) {
        push(step.phase, step.dur, step.fx, traceIndex, frameIndex, step.hit)
      }
      if (art === 'road' && hits.length > 0 && !frameIsKey(frame, konter)) normals += 1
    })
    if (trace.foeKo && traceIndex < traces.length - 1) {
      const wechsel = art === 'road' ? ROAD.wechsel : FOCUS.wechsel
      push('wechsel', ms(wechsel, scaleOf(art, tempo)), false, traceIndex, -1, -1)
    }
  })
  if (art === 'road') {
    push('resultat', ms(ROAD.result, scaleOf(art, tempo)), false, traces.length - 1, -1, -1)
    const floor = ENCOUNTER_MS[tempo]
    if (cursor < floor && actions.length > 0) {
      const last = actions[actions.length - 1]
      last.dur += floor - cursor
      cursor = floor
    }
  }
  return actions
}

/** How many FX actions cover the instant `at`. The queue must stay at 0 or 1. */
export function activeFx(actions: readonly PlannedAction[], at: number): number {
  return actions.filter((action) => action.fx && at >= action.start && at < action.start + action.dur).length
}

export function actionAt(actions: readonly PlannedAction[], elapsed: number): PlannedAction | null {
  if (!actions.length) return null
  return actions.find((action) => elapsed >= action.start && elapsed < action.start + action.dur) ?? actions[actions.length - 1]
}

export function shotFromAction(traces: readonly FightTrace[], action: PlannedAction): FrameShot | null {
  const trace = traces[action.traceIndex]
  const frame = trace?.frames[action.frameIndex]
  if (trace && frame) {
    const hits = frame.hits ?? []
    const one = action.hitIndex >= 0 && hits[action.hitIndex] ? [hits[action.hitIndex]] : []
    return shotOf(trace, frame, one)
  }
  const last = traces[traces.length - 1]
  const end = last?.frames[last.frames.length - 1]
  if (!last || !end) return null
  return shotOf(last, end, [])
}

function shotOf(trace: FightTrace, frame: FightFrame, hits: FightHit[]): FrameShot {
  return {
    allyHp: frame.allyHp,
    foeHp: frame.foeHp,
    allyMax: trace.allyMax,
    foeMax: trace.foeMax,
    text: frame.text,
    allyName: trace.allyName,
    foeName: trace.foeName,
    allySpecies: trace.allySpecies,
    foeSpecies: trace.foeSpecies,
    hits,
    allyUlt: frame.allyUlt ?? 0,
    foeUlt: frame.foeUlt ?? 0,
    allyUltOpen: Boolean(frame.allyUltOpen),
    foeUltOpen: Boolean(frame.foeUltOpen),
    allyMark: frame.allyMark ?? null,
    foeMark: frame.foeMark ?? null,
    allyStacks: frame.allyStacks ?? 0,
    foeStacks: frame.foeStacks ?? 0,
    counter: Boolean(trace.counter),
    mechs: trace.mechs ?? [],
    helper: Boolean(frame.helper)
  }
}
