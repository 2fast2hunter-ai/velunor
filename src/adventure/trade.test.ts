import { describe, expect, it } from 'vitest'
import { canTrade, type TradeAccount, type TradeMonster } from './trade'

const now = Date.parse('2026-11-17T00:00:00Z')
const week = 7 * 24 * 60 * 60 * 1000

function account(patch: Partial<TradeAccount> = {}): TradeAccount {
  return {
    now,
    ageDays: 10,
    crests: 8,
    emailLinked: true,
    flag: 0,
    tradesToday: 0,
    tradedRarity7: 0,
    oneWayToPartner: 0,
    ...patch
  }
}

function mon(patch: Partial<TradeMonster> = {}): TradeMonster {
  return { speciesId: 'm01', stars: 0, obtainedAt: now - week - 1000, ...patch }
}

describe('canTrade', () => {
  it('allows a plain monster and blocks the lootbox rules', () => {
    expect(canTrade(mon(), account()).ok).toBe(true)
    expect(canTrade(mon({ stars: 2 }), account()).ok).toBe(false)
    expect(canTrade(mon({ obtainedAt: now - 1000 }), account()).reason).toContain('7 Tage')
    expect(canTrade(mon({ speciesId: 'm33' }), account({ tradedRarity7: 1 })).reason).toContain('einmal')
    expect(canTrade(mon({ speciesId: 'm33' }), account()).ok).toBe(true)
    expect(canTrade(mon({ speciesId: 'm100' }), account()).reason).toContain('8 und 9')
    expect(canTrade(mon(), account({ ageDays: 3 })).ok).toBe(false)
    expect(canTrade(mon(), account({ crests: 7 })).ok).toBe(false)
    expect(canTrade(mon(), account({ emailLinked: false })).ok).toBe(false)
    expect(canTrade(mon(), account({ flag: 1 })).ok).toBe(false)
    expect(canTrade(mon(), account({ tradesToday: 3 })).ok).toBe(false)
    expect(canTrade(mon(), account({ oneWayToPartner: 4 })).ok).toBe(false)
  })
})
