import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  ATTACKS_MAX,
  ATTACK_REGEN_MS,
  DEFENSE_LOSS_CAP,
  DEFENSE_WIN_CAP,
  ELO_K,
  ELO_START,
  LEAGUES,
  PRACTICE_LABEL,
  arenaDayKey,
  arenaMatch,
  arenaUnlocked,
  chargeAttacks,
  defenseApply,
  eloDelta,
  lastDailyReset,
  leagueOf,
  pickOpponents,
  practiceTeam,
  readFightIndex,
  seasonIndex,
  softReset,
  spendAttack,
  arenaFightErrorKey,
  teamFromRegister
} from './arena'
import { t } from './i18n'
import { beginAdventure } from './save'

describe('arena', () => {
  it('repeats a match from the same seed and finishes quickly', () => {
    const left = practiceTeam(11)
    const right = practiceTeam(29)
    const start = Date.now()
    const once = arenaMatch(left, right, 404)
    const twice = arenaMatch(left, right, 404)
    const other = arenaMatch(left, right, 405)
    expect(Date.now() - start).toBeLessThan(300)
    expect(once).toEqual(twice)
    expect(once.bouts.length).toBeGreaterThan(0)
    expect(once.bouts.length).toBeLessThanOrEqual(11)
    expect(once.win ? once.foeKos : once.allyKos).toBe(6)
    expect(other.bouts).not.toEqual(once.bouts)
    expect(once.win === twice.win).toBe(true)
  })

  it('ignores every field except the suggestion slot', () => {
    expect(readFightIndex({ index: 1, rating: 4000, team: [{ atk: 99999 }] })).toBe(1)
    expect(readFightIndex({ index: 4 })).toBeNull()
    expect(readFightIndex({ opponent: 'someone' })).toBeNull()
    expect(readFightIndex(null)).toBeNull()
  })

  it('refills five attacks at 04:00 Berlin and one more every four hours', () => {
    const morning = Date.parse('2026-11-18T03:00:00.000Z')
    const key = arenaDayKey(new Date(morning))
    expect(lastDailyReset(new Date('2026-11-16T02:59:00Z')).toISOString()).toBe('2026-11-15T03:00:00.000Z')
    expect(lastDailyReset(new Date('2026-11-16T03:00:00Z')).toISOString()).toBe('2026-11-16T03:00:00.000Z')
    const empty = { attacks: 0, attacksAt: morning, dayKey: key }
    expect(chargeAttacks(empty, morning + 3 * 60 * 60 * 1000).attacks).toBe(0)
    expect(chargeAttacks(empty, morning + ATTACK_REGEN_MS).attacks).toBe(1)
    expect(chargeAttacks(empty, morning + ATTACK_REGEN_MS * 9).attacks).toBe(ATTACKS_MAX)
    const spent = spendAttack({ attacks: ATTACKS_MAX, attacksAt: morning - 1000, dayKey: key }, morning)
    expect(spent?.attacks).toBe(4)
    const nextDay = Date.parse('2026-11-19T03:00:00.000Z')
    expect(chargeAttacks({ attacks: 0, attacksAt: morning, dayKey: key }, nextDay).attacks).toBe(5)
    expect(spendAttack({ attacks: 0, attacksAt: nextDay, dayKey: arenaDayKey(new Date(nextDay)) }, nextDay)).toBeNull()
  })

  it('moves Elo by K=32 and caps a day of defending', () => {
    expect(ELO_K).toBe(32)
    expect(eloDelta(ELO_START, ELO_START, true)).toBe(16)
    expect(eloDelta(ELO_START, ELO_START, false)).toBe(-16)
    expect(eloDelta(1400, 1000, true)).toBeGreaterThan(0)
    expect(eloDelta(1400, 1000, true)).toBeLessThan(16)
    let today = 0
    for (let i = 0; i < 12; i++) today = defenseApply(today, true).today
    expect(today).toBe(DEFENSE_WIN_CAP)
    today = 0
    for (let i = 0; i < 8; i++) today = defenseApply(today, false).today
    expect(today).toBe(-DEFENSE_LOSS_CAP)
    expect(defenseApply(DEFENSE_WIN_CAP, true).applied).toBe(0)
    expect(defenseApply(-DEFENSE_LOSS_CAP, false).applied).toBe(0)
  })

  it('places leagues and closes a season once', () => {
    expect(leagueOf(1000).id).toBe('kiesel')
    expect(leagueOf(1100).id).toBe('bronze')
    expect(leagueOf(1300).id).toBe('silber')
    expect(leagueOf(1500).id).toBe('gold')
    expect(leagueOf(1700).id).toBe('kristall')
    expect(leagueOf(1900).name).toBe('Velunor-Meister')
    expect(LEAGUES.map((league) => league.min)).toEqual([0, 1100, 1300, 1500, 1700, 1900])
    expect(softReset(1000)).toBe(1000)
    expect(softReset(1400)).toBe(1200)
    expect(seasonIndex(new Date('2026-11-16T03:00:00.000Z'))).toBe(0)
    expect(seasonIndex(new Date('2026-11-30T03:00:00.000Z'))).toBe(1)
    expect(seasonIndex(new Date('2026-11-30T02:59:00.000Z'))).toBe(0)
    const first = softReset(1400)
    expect(softReset(first)).not.toBe(first)
  })

  it('offers the nearest real teams and fills the rest with labelled practice', () => {
    const pool = [
      { practice: false, seed: 1, id: 'near', label: 'Ada#1000', rating: 1040, species: ['m01'] },
      { practice: false, seed: 1, id: 'far', label: 'Bea#2000', rating: 1600, species: ['m02'] },
      { practice: false, seed: 1, id: 'self', label: 'Ich#0001', rating: 1000, species: ['m03'] }
    ]
    const cards = pickOpponents('self', 1000, pool, 77)
    expect(cards).toHaveLength(3)
    expect(cards[0].id).toBe('near')
    expect(cards.filter((card) => card.practice).every((card) => card.label === PRACTICE_LABEL)).toBe(true)
    expect(cards.some((card) => card.id === 'self')).toBe(false)
    expect(arenaUnlocked(4, 6)).toBe(false)
    expect(arenaUnlocked(5, 5)).toBe(false)
    expect(arenaUnlocked(5, 6)).toBe(true)
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    const rows = ['m01', 'm02', 'm03', 'm04', 'm05', 'm06'].map((id, index) => ({ uid: `a${index}`, species: id, schimmer: index === 0 }))
    const team = teamFromRegister(rows, save)
    expect(team?.fighters).toHaveLength(6)
    expect(team?.fighters[0].maxHp).toBeGreaterThan(0)
    expect(team?.synergy).toBeNull()
    expect(teamFromRegister(rows.slice(0, 5), save)).toBeNull()
    const sql = readFileSync(new URL('../../supabase/migrations/20261118220000_schritt9_arena.sql', import.meta.url), 'utf8')
    expect(sql).toContain("'arena'")
    expect(sql).toContain('close_arena_season')
    expect(sql).toContain('flag_level < 2')
    expect(sql).toContain('primary key (season, user_id)')
    expect(sql).toContain('floor((rating + 1000) / 2.0)')
  })

  it('names a missing defense team instead of a connection error', () => {
    expect(arenaFightErrorKey('team')).toBe('arena.err.team')
    expect(t('de', arenaFightErrorKey('team'))).toBe('Speichere zuerst ein Verteidigungsteam mit sechs Monstern.')
    expect(arenaFightErrorKey('opponent')).toBe('arena.err.opponent')
    expect(arenaFightErrorKey('index')).toBe('arena.err.index')
    expect(arenaFightErrorKey('flag')).toBe('arena.err.flag')
    expect(arenaFightErrorKey('season')).toBe('arena.err.season')
    expect(arenaFightErrorKey('limit')).toBe('arena.attacks')
    expect(arenaFightErrorKey('auth')).toBe('arena.offline')
    expect(arenaFightErrorKey('Failed to fetch')).toBe('arena.offline')
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8')
    expect(app).toContain('arenaFightErrorKey(code)')
  })
})
