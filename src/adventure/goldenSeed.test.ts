import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../rng'
import { ARENA_LEVEL, fighterFromSpecies } from './arena'
import { fight1v1, type FightSide, type FightTrace } from './battle'

/**
 * Locked picture of the battle core on main (8ff5e77).
 * 10_000 seeds, six fixed pairs at arena level, trace on.
 * Win, remaining HP and every frame (HP, text, hits) fold into one SHA-256.
 */
const GOLDEN_SEEDS = 10_000
const GOLDEN_SHA256 = 'ee9ae90bfbdaccc52bdd9bfa87a34847a842ae64177a54a0b7b68ef1af3cad35'

const PAIRS = [
  ['m01', 'm02'],
  ['m02', 'm03'],
  ['m03', 'm04'],
  ['m04', 'm05'],
  ['m05', 'm06'],
  ['m06', 'm01']
] as const

function side(id: string): FightSide {
  const fighter = fighterFromSpecies(id, false, 0, 0, id)
  return {
    speciesId: fighter.speciesId,
    name: fighter.name,
    type: fighter.type,
    maxHp: fighter.maxHp,
    hp: fighter.maxHp,
    atk: fighter.atk,
    def: fighter.def,
    spd: fighter.spd,
    skill: fighter.skill,
    passive: fighter.passive,
    level: ARENA_LEVEL
  }
}

const SIDES = PAIRS.map(([ally, foe]) => [side(ally), side(foe)] as const)

function put(hash: ReturnType<typeof createHash>, value: string | number | boolean): void {
  hash.update(String(value))
  hash.update('\0')
}

function fold(hash: ReturnType<typeof createHash>, trace: FightTrace): void {
  put(hash, trace.win)
  put(hash, trace.allyHp)
  put(hash, trace.foeHp)
  put(hash, trace.allyKo)
  put(hash, trace.foeKo)
  put(hash, trace.frames.length)
  for (const frame of trace.frames) {
    put(hash, frame.allyHp)
    put(hash, frame.foeHp)
    put(hash, frame.text)
    const hits = frame.hits ?? []
    put(hash, hits.length)
    for (const hit of hits) {
      put(hash, hit.from)
      put(hash, hit.amount)
      put(hash, hit.crit)
      put(hash, hit.ko)
      put(hash, hit.kind)
      put(hash, hit.band)
      put(hash, hit.type)
    }
  }
}

export function goldenDigest(count = GOLDEN_SEEDS): string {
  const hash = createHash('sha256')
  for (let seed = 1; seed <= count; seed++) {
    const [ally, foe] = SIDES[(seed - 1) % SIDES.length]
    fold(hash, fight1v1(ally, foe, mulberry32(seed), true))
  }
  return hash.digest('hex')
}

describe('golden battle seeds', () => {
  it('keeps win, HP and frames for 10_000 seeds identical to main', () => {
    const started = Date.now()
    const digest = goldenDigest()
    expect(Date.now() - started).toBeLessThan(20_000)
    expect(digest).toBe(GOLDEN_SHA256)
  })
})
