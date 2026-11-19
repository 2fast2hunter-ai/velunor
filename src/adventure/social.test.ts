import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { practiceTeam } from './arena'
import { LEVEL_HP, addGroupDamage, claimOnce, coopDamage, coopErrorKey, coopRoster, freshTrack, levelReward, weeklyBeast } from './coop'
import { auditSync } from './online/check'
import { auditFromSave } from './online/snapshot'
import { beginAdventure } from './save'
import { gameHtml, type CodexQuery, type PcQuery } from './view'
import {
  canAccept,
  canGift,
  canRequest,
  friendCode,
  giftGold,
  parseNameTag,
  presence,
  validFriendCode
} from './social'

const pc: PcQuery = { q: '', type: '', rarity: '', shiny: '', sort: 'newest', dir: -1 }
const dex: CodexQuery = { q: '', type: '', rarity: '', shiny: '' }

describe('friends', () => {
  it('asks, accepts, removes and blocks in both directions', () => {
    const code = friendCode(99)
    expect(validFriendCode(code)).toBe(true)
    expect(validFriendCode('short')).toBe(false)
    expect(parseNameTag('Ada#1234')).toEqual({ name: 'Ada', tag: '1234' })
    expect(parseNameTag('Ada')).toBeNull()
    const open = { from: 'a', to: 'b', fromFriends: 1, toFriends: 1, blockedEither: false, hidden: false, existing: null as null }
    expect(canRequest(open)).toBe('ok')
    expect(canRequest({ ...open, from: 'a', to: 'a' })).toBe('self')
    expect(canRequest({ ...open, hidden: true })).toBe('hidden')
    expect(canRequest({ ...open, blockedEither: true })).toBe('blocked')
    expect(canRequest({ ...open, existing: 'pending' })).toBe('pending')
    expect(canRequest({ ...open, existing: 'friends' })).toBe('friends')
    expect(canRequest({ ...open, fromFriends: 50 })).toBe('full')
    expect(canAccept(49, 49)).toBe('ok')
    expect(canAccept(50, 1)).toBe('full')
    expect(canGift({ friends: true, alreadySent: false, receivedToday: 19 })).toBe('ok')
    expect(canGift({ friends: true, alreadySent: true, receivedToday: 0 })).toBe('sent')
    expect(canGift({ friends: true, alreadySent: false, receivedToday: 20 })).toBe('cap')
    expect(canGift({ friends: false, alreadySent: false, receivedToday: 0 })).toBe('strangers')
    expect(giftGold(3)).toBe(1500)
    expect(presence(0, 10 * 60 * 1000, true)).toBe('online')
    expect(presence(0, 2 * 60 * 60 * 1000, true)).toBe('heute')
    expect(presence(0, 3 * 24 * 60 * 60 * 1000, true)).toBe('offline')
    expect(presence(0, 0, false)).toBe('verborgen')
  })

  it('lets sync-check accept gift gold and shows Offline without a connection', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    const before = auditFromSave(save)
    const granted = giftGold(5) * 20 + 10_000_000
    save.gold += granted
    expect(auditSync(before, auditFromSave(save), 60_000).flag).toBe(2)
    expect(auditSync(before, auditFromSave(save), 60_000, granted).flag).toBe(0)
    const html = gameHtml(save, 'social', 1_000, pc, dex, null, false, false, null, 1, undefined, {
      social: { status: 'offline', code: '', friends: [], requests: [], note: '' }
    })
    expect(html).toContain('Offline')
    expect(html).not.toContain('1970')
    const ready = gameHtml(save, 'social', 1_000, pc, dex, null, false, false, null, 1, undefined, {
      social: {
        status: 'ready',
        code: 'ABCD2345',
        friends: [{ code: 'HJKM6789', label: 'Ada#1234', region: 2, crests: 3, codex: 12, favorite: 'm01', presence: 'online' }],
        requests: [],
        note: '',
        beast: 'weltenwurm',
        beastName: 'Weltenwurm',
        level: 1,
        hp: 500,
        hpMax: 1000,
        attempts: 1,
        members: ['Ada#1234'],
        eggChance: 0.02
      }
    })
    expect(ready).toContain('data-art="friends/code"')
    expect(ready).toContain('data-art="beasts/weltenwurm"')
    expect(ready).toContain('ABCD2345')
    expect(ready).not.toContain('1970')
    const sql = readFileSync(new URL('../../supabase/migrations/20261118230000_schritt10_freunde.sql', import.meta.url), 'utf8')
    expect(sql).toContain('bonus_gold')
    expect(sql).toContain('p_friends')
    expect(sql).toContain('primary key (group_id, user_id, level)')
    expect(sql).toContain('n between 1 and 3')
    for (const hp of LEVEL_HP) expect(sql).toContain(String(hp))
  })
})

describe('co-op beast', () => {
  it('sums group damage, opens the next level and pays a level once', () => {
    const start = freshTrack()
    const first = addGroupDamage(start, LEVEL_HP[0] - 1)
    expect(first.cleared).toEqual([])
    expect(first.track.level).toBe(1)
    const second = addGroupDamage(first.track, 1)
    expect(second.cleared).toEqual([1])
    expect(second.track.level).toBe(2)
    const paid = new Set<string>()
    expect(claimOnce(paid, 'a', 1)).toBe(true)
    paid.add('a:1')
    expect(claimOnce(paid, 'a', 1)).toBe(false)
    expect(levelReward(4, 0).egg).toBe(false)
    expect(levelReward(5, 0.01).egg).toBe(true)
    expect(levelReward(5, 0.5).egg).toBe(false)
    const beast = weeklyBeast(new Date('2026-11-18T12:00:00Z'))
    expect(beast.week).toBe(Date.parse('2026-11-16T03:00:00.000Z'))
    expect(beast.name === 'Weltenwurm' || beast.name === 'Himmelswal').toBe(true)
  })

  it('lets four active players just clear level 10 in a week', () => {
    const team = practiceTeam(3).fighters
    const damage = coopDamage(team, 'earth', 1)
    const week = damage * 4 * 3 * 7
    const sum = LEVEL_HP.reduce((total, hp) => total + hp, 0)
    expect(week).toBeGreaterThan(sum)
    expect(week / sum).toBeLessThan(1.15)
    let track = freshTrack()
    for (let i = 0; i < 84; i++) {
      track = addGroupDamage(track, damage).track
    }
    expect(track.hp).toBe(0)
    expect(track.level).toBe(10)
  })

  it('accepts one road starter beside five registered monsters and names the team error', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    const starter = save.team[0]
    const owned = ['b', 'c', 'd', 'e', 'f'].map((uid, index) => ({ uid, species: `m${index + 2}`, schimmer: false }))
    const rows = coopRoster([starter, ...owned.map((row) => row.uid)], owned, save)
    expect(rows?.map((row) => row.uid)).toEqual([starter, 'b', 'c', 'd', 'e', 'f'])
    save.mons.y = { ...save.mons[starter], species: 'm02', caughtWhere: 'r1c1' }
    expect(coopRoster([starter, 'y', 'b', 'c', 'd', 'e'], owned.slice(0, 4), save)).toBeNull()
    save.mons.x = { ...save.mons[starter], species: 'm09', caughtWhere: 'truhe' }
    expect(coopRoster(['x', ...owned.map((row) => row.uid)], owned, save)).toBeNull()
    expect(coopErrorKey('team')).toBe('social.err.team')
    expect(coopErrorKey('attempts')).toBe('social.err.attempts')
    const app = readFileSync(new URL('./app.ts', import.meta.url), 'utf8')
    expect(app).toContain("coopErrorKey(String(result.data.error || result.error || 'team'))")
  })
})
