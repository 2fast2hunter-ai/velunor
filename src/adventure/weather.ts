import { hashSeed } from '../rng'
import type { TypeId } from '../types'

/** Same hour yields the same weather for every player. The clock is UTC. */
export const WEATHERS = ['klar', 'regen', 'gewitter', 'schnee', 'nebel', 'wind'] as const
export type WeatherId = (typeof WEATHERS)[number]

const NAMES: Record<WeatherId, string> = {
  klar: 'Klar',
  regen: 'Regen',
  gewitter: 'Gewitter',
  schnee: 'Schnee',
  nebel: 'Nebel',
  wind: 'Wind'
}

export function weatherName(id: WeatherId): string {
  return NAMES[id]
}

/** A5. Percent points, never past ±15. Applied after the type chart, on the attacker's type. */
export const WEATHER_SHIFTS: Record<WeatherId, { up: { type: TypeId; pct: number }[]; down: { type: TypeId; pct: number }[] }> = {
  klar: { up: [{ type: 'fire', pct: 10 }, { type: 'light', pct: 10 }], down: [{ type: 'ice', pct: 10 }] },
  regen: { up: [{ type: 'water', pct: 15 }], down: [{ type: 'fire', pct: 15 }] },
  gewitter: { up: [{ type: 'lightning', pct: 15 }], down: [{ type: 'metal', pct: 10 }] },
  schnee: { up: [{ type: 'ice', pct: 15 }], down: [{ type: 'plant', pct: 10 }, { type: 'dragon', pct: 10 }] },
  nebel: { up: [{ type: 'ghost', pct: 10 }, { type: 'shadow', pct: 10 }], down: [{ type: 'light', pct: 10 }] },
  wind: { up: [{ type: 'wind', pct: 15 }, { type: 'sound', pct: 5 }], down: [{ type: 'insect', pct: 10 }] }
}

/** 1 when there is no weather (offline, arena). */
export function weatherFactor(weather: WeatherId | null, type: TypeId): number {
  if (!weather) return 1
  const row = WEATHER_SHIFTS[weather]
  const up = row.up.find((shift) => shift.type === type)
  if (up) return 1 + up.pct / 100
  const down = row.down.find((shift) => shift.type === type)
  if (down) return 1 - down.pct / 100
  return 1
}

export function weatherArrow(weather: WeatherId | null, type: TypeId): 'up' | 'down' | null {
  const factor = weatherFactor(weather, type)
  if (factor > 1) return 'up'
  if (factor < 1) return 'down'
  return null
}

export function teamWeatherMarks(types: TypeId[], weather: WeatherId | null): { up: number; down: number } {
  let up = 0
  let down = 0
  for (const type of types) {
    const arrow = weatherArrow(weather, type)
    if (arrow === 'up') up += 1
    else if (arrow === 'down') down += 1
  }
  return { up, down }
}

/** Mean factor of one type across the six weathers. The K3 check wants this within ±3 %. */
export function meanWeatherFactor(type: TypeId): number {
  let sum = 0
  for (const id of WEATHERS) sum += weatherFactor(id, type)
  return sum / WEATHERS.length
}

export function weatherAt(ts: number): WeatherId {
  const date = new Date(ts)
  const key = `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}-${date.getUTCHours()}`
  const index = hashSeed(`velunor-wetter-${key}`) % WEATHERS.length
  return WEATHERS[index]
}

export function hourStart(ts: number): number {
  const date = new Date(ts)
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), date.getUTCHours())
}

/** Current hour plus the next 23, in UTC. */
export function weatherForecast(ts: number, hours = 24): { at: number; weather: WeatherId }[] {
  const start = hourStart(ts)
  return Array.from({ length: hours }, (_, index) => {
    const at = start + index * 3_600_000
    return { at, weather: weatherAt(at) }
  })
}
