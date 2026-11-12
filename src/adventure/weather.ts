import { hashSeed } from '../rng'

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
