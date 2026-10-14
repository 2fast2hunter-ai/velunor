/** mulberry32. All gameplay rolls go through this, never Math.random(). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface RngState {
  seed: number
}

/** Advances a saved uint32 seed and returns a float in [0, 1). */
export function nextFloat(state: RngState): number {
  let a = state.seed | 0
  a = (a + 0x6d2b79f5) | 0
  state.seed = a >>> 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export function nextUint(state: RngState): number {
  nextFloat(state)
  return state.seed >>> 0
}

/** Stable 32-bit FNV-1a. Gameplay seeds come from this, never from Math.random. */
export function hashSeed(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  const out = hash >>> 0
  return out === 0 ? 1 : out
}

export function freshSeed(): number {
  const buf = new Uint32Array(1)
  crypto.getRandomValues(buf)
  return buf[0] || 1
}

export function weightedPick(rng: () => number, weights: Record<string, number>): number {
  const entries = Object.entries(weights).map(([k, v]) => [Number(k), v] as const)
  const total = entries.reduce((sum, [, v]) => sum + v, 0)
  let roll = rng() * total
  for (const [key, weight] of entries) {
    roll -= weight
    if (roll < 0) return key
  }
  return entries[entries.length - 1][0]
}
