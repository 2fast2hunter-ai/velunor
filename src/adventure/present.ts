import type { FightHit, FightTrace } from './battle'
import type { MechId } from './mech'
import { watchdogLimit, type Speed } from './const'

export interface StallInput {
  started: boolean
  overlay: boolean
  hold: boolean
  since: number
  now: number
  speed: Speed
}

/** True when the auto-battle should be put back on its rails. */
export function shouldRecover(input: StallInput): boolean {
  if (!input.started || input.overlay || input.hold) return false
  if (!Number.isFinite(input.since) || !Number.isFinite(input.now)) return false
  return input.now - input.since >= watchdogLimit(input.speed)
}

export interface FrameShot {
  allyHp: number
  foeHp: number
  allyMax: number
  foeMax: number
  text: string
  allyName: string
  foeName: string
  allySpecies: string
  foeSpecies: string
  hits: FightHit[]
  allyUlt: number
  foeUlt: number
  allyUltOpen: boolean
  foeUltOpen: boolean
  allyMark: string | null
  foeMark: string | null
  allyStacks: number
  foeStacks: number
  counter: boolean
  mechs: MechId[]
  helper: boolean
}

/** The battle frame at `elapsed` ms. Missing traces never throw. */
export function shotAt(traces: FightTrace[], elapsed: number, dur: number): FrameShot | null {
  if (!traces.length || !(dur > 0) || !Number.isFinite(elapsed)) return null
  const bt = Math.min(1, Math.max(0, elapsed / dur))
  const slice = 1 / traces.length
  const index = Math.min(traces.length - 1, Math.max(0, Math.floor(bt / slice)))
  const trace = traces[index]
  const frames = trace?.frames
  if (!trace || !frames?.length || !(trace.allyMax > 0) || !(trace.foeMax > 0)) return null
  const local = Math.min(1, Math.max(0, (bt - index * slice) / slice))
  const at = Math.min(frames.length - 1, Math.max(0, Math.floor(local * frames.length)))
  const shot = frames[at]
  if (!shot) return null
  return {
    allyHp: shot.allyHp,
    foeHp: shot.foeHp,
    allyMax: trace.allyMax,
    foeMax: trace.foeMax,
    text: shot.text,
    allyName: trace.allyName,
    foeName: trace.foeName,
    allySpecies: trace.allySpecies,
    foeSpecies: trace.foeSpecies,
    hits: shot.hits ?? trace.frames[at]?.hits ?? [],
    allyUlt: shot.allyUlt ?? 0,
    foeUlt: shot.foeUlt ?? 0,
    allyUltOpen: Boolean(shot.allyUltOpen),
    foeUltOpen: Boolean(shot.foeUltOpen),
    allyMark: shot.allyMark ?? null,
    foeMark: shot.foeMark ?? null,
    allyStacks: shot.allyStacks ?? 0,
    foeStacks: shot.foeStacks ?? 0,
    counter: Boolean(trace.counter),
    mechs: trace.mechs ?? [],
    helper: Boolean(shot.helper)
  }
}
