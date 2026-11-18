/** Trade rules. The trade edge function and the SQL swap use the same limits. */

import { lastDailyReset } from './arena'
import { boardWeek } from './online/ranks'
import type { SaveV2 } from './types'

export const TRADE_LOCK_MS = 7 * 24 * 60 * 60 * 1000
export const FRIEND_MS = 48 * 60 * 60 * 1000
export const ACCOUNT_AGE_MS = 7 * 24 * 60 * 60 * 1000
export const CONFIRM_MS = 5_000
export const DAY_LIMIT = 3
export const WEEK_LIMIT = 10
export const ONE_WAY_LIMIT = 3
export const LIFE_CAP = 2
export const RARITY7_CAP = 1
export const CREST_NEED = 8
export const LEVEL_SLACK = 5

export const FRESH_HOW = ['Truhe', 'Ei', 'Splitter', 'Rad'] as const

export type TradeReason =
  | 'ok'
  | 'age'
  | 'crests'
  | 'flag'
  | 'email'
  | 'friend'
  | 'self'
  | 'fresh'
  | 'traded'
  | 'life'
  | 'rarity'
  | 'rarity7'
  | 'gap'
  | 'shiny'
  | 'day'
  | 'week'
  | 'escrow'
  | 'team'
  | 'missing'
  | 'wait'
  | 'done'

export interface TradeMon {
  owner: string
  uid: string
  species: string
  rarity: number
  shiny: boolean
  level: number
  how: string
  obtainedAt: number
  tradeCount: number
  inTeam: boolean
}

export interface TradeAccount {
  id: string
  createdAt: number
  crests: number
  flag: 0 | 1 | 2
  banned: boolean
  email: boolean
  teamMax: number
}

export function tradedOnly(save: SaveV2, speciesId: string): boolean {
  const rows = Object.values(save.mons).filter((mon) => mon.species === speciesId)
  return rows.length > 0 && rows.every((mon) => mon.caughtWhere === 'tausch')
}

export function receivedLevel(level: number, teamMax: number): number {
  const cap = Math.max(1, Math.floor(teamMax) || 1) + LEVEL_SLACK
  return Math.max(1, Math.min(Math.floor(level) || 1, cap))
}

export function accountReason(account: TradeAccount, now: number): TradeReason {
  if (account.flag > 0 || account.banned) return 'flag'
  if (!account.email) return 'email'
  if (now - account.createdAt < ACCOUNT_AGE_MS) return 'age'
  if (account.crests < CREST_NEED) return 'crests'
  return 'ok'
}

export function monsterReason(mon: TradeMon, now: number): TradeReason {
  if (mon.inTeam) return 'team'
  if (mon.rarity >= 8) return 'rarity'
  if (mon.rarity === 7 && mon.tradeCount >= RARITY7_CAP) return 'rarity7'
  if (mon.tradeCount >= LIFE_CAP) return 'life'
  if (mon.how === 'Tausch' && now - mon.obtainedAt < TRADE_LOCK_MS) return 'traded'
  if ((FRESH_HOW as readonly string[]).includes(mon.how) && now - mon.obtainedAt < TRADE_LOCK_MS) return 'fresh'
  return 'ok'
}

export function pairReason(left: TradeMon, right: TradeMon): TradeReason {
  if (left.owner === right.owner) return 'self'
  if (left.shiny !== right.shiny) return 'shiny'
  if (Math.abs(left.rarity - right.rarity) > 1) return 'gap'
  return 'ok'
}

export function oneWay(left: TradeMon, right: TradeMon): boolean {
  return Math.abs(left.rarity - right.rarity) >= 2
}

/** The account that receives the monster worth at least two rarity steps more. */
export function oneWayReceiver(left: TradeMon, right: TradeMon): string | null {
  if (left.rarity >= right.rarity + 2) return left.owner === right.owner ? null : right.owner
  if (right.rarity >= left.rarity + 2) return left.owner
  return null
}

export interface DeskOffer {
  id: string
  host: string
  guest: string
  hostUid: string
  guestUid: string
  status: 'offered' | 'countered' | 'locked' | 'done' | 'cancelled'
  lockAt: number
  hostConfirm: number
  guestConfirm: number
  version: number
}

export interface DeskTrade {
  offerId: string
  host: string
  guest: string
  hostRarity: number
  guestRarity: number
  oneWayTo: string | null
  at: number
}

export interface TradeDesk {
  mons: TradeMon[]
  offers: DeskOffer[]
  trades: DeskTrade[]
  flags: Record<string, 0 | 1 | 2>
  banned: Record<string, boolean>
  friends: { a: string, b: string, since: number }[]
  accounts: Record<string, TradeAccount>
  next: number
}

export function emptyDesk(): TradeDesk {
  return { mons: [], offers: [], trades: [], flags: {}, banned: {}, friends: [], accounts: {}, next: 1 }
}

function monOf(desk: TradeDesk, owner: string, uid: string): TradeMon | undefined {
  return desk.mons.find((mon) => mon.owner === owner && mon.uid === uid)
}

function openOfferFor(desk: TradeDesk, owner: string, uid: string): DeskOffer | undefined {
  return desk.offers.find((offer) => offer.status !== 'done' && offer.status !== 'cancelled' && (
    (offer.host === owner && offer.hostUid === uid) || (offer.guest === owner && offer.guestUid === uid)
  ))
}

function countSince(desk: TradeDesk, user: string, since: number): number {
  return desk.trades.filter((trade) => trade.at >= since && (trade.host === user || trade.guest === user)).length
}

function oneWayCount(desk: TradeDesk, giver: string, receiver: string, since: number): number {
  return desk.trades.filter((trade) => trade.at >= since && trade.oneWayTo === receiver && (
    (trade.host === giver && trade.guest === receiver) || (trade.guest === giver && trade.host === receiver)
  )).length
}

export function friendReady(desk: TradeDesk, a: string, b: string, now: number): boolean {
  return desk.friends.some((row) => {
    const pair = (row.a === a && row.b === b) || (row.a === b && row.b === a)
    return pair && now - row.since >= FRIEND_MS
  })
}

export function openTrade(desk: TradeDesk, host: string, guest: string, hostUid: string, guestUid: string, now: number): TradeReason {
  if (host === guest) return 'self'
  const account = desk.accounts[host]
  const other = desk.accounts[guest]
  if (!account || !other) return 'missing'
  const hostBlock = accountReason({ ...account, flag: desk.flags[host] ?? account.flag, banned: desk.banned[host] ?? account.banned }, now)
  if (hostBlock !== 'ok') return hostBlock
  const guestBlock = accountReason({ ...other, flag: desk.flags[guest] ?? other.flag, banned: desk.banned[guest] ?? other.banned }, now)
  if (guestBlock !== 'ok') return guestBlock
  if (!friendReady(desk, host, guest, now)) return 'friend'
  const dayStart = lastDailyReset(new Date(now)).getTime()
  const weekStart = boardWeek(new Date(now)).getTime()
  for (const id of [host, guest]) {
    if (countSince(desk, id, dayStart) >= DAY_LIMIT) return 'day'
    if (countSince(desk, id, weekStart) >= WEEK_LIMIT) return 'week'
  }
  const left = monOf(desk, host, hostUid)
  const right = monOf(desk, guest, guestUid)
  if (!left || !right) return 'missing'
  const leftLock = monsterReason(left, now)
  if (leftLock !== 'ok') return leftLock
  const rightLock = monsterReason(right, now)
  if (rightLock !== 'ok') return rightLock
  const pair = pairReason(left, right)
  if (pair !== 'ok') return pair
  if (openOfferFor(desk, host, hostUid) || openOfferFor(desk, guest, guestUid)) return 'escrow'
  desk.offers.push({
    id: `o${desk.next++}`,
    host,
    guest,
    hostUid,
    guestUid,
    status: 'offered',
    lockAt: 0,
    hostConfirm: 0,
    guestConfirm: 0,
    version: 1
  })
  return 'ok'
}

export function counterTrade(desk: TradeDesk, offerId: string, user: string, uid: string, now: number): TradeReason {
  const offer = desk.offers.find((row) => row.id === offerId)
  if (!offer || (offer.status !== 'offered' && offer.status !== 'countered')) return 'missing'
  if (user !== offer.guest && user !== offer.host) return 'missing'
  const owner = user
  const mon = monOf(desk, owner, uid)
  if (!mon) return 'missing'
  const lock = monsterReason(mon, now)
  if (lock !== 'ok') return lock
  if (openOfferFor(desk, owner, uid) && openOfferFor(desk, owner, uid)?.id !== offer.id) return 'escrow'
  if (user === offer.guest) offer.guestUid = uid
  else offer.hostUid = uid
  const left = monOf(desk, offer.host, offer.hostUid)
  const right = monOf(desk, offer.guest, offer.guestUid)
  if (!left || !right) return 'missing'
  const pair = pairReason(left, right)
  if (pair !== 'ok') return pair
  offer.status = 'countered'
  offer.lockAt = 0
  offer.hostConfirm = 0
  offer.guestConfirm = 0
  offer.version += 1
  return 'ok'
}

export function lockTrade(desk: TradeDesk, offerId: string, user: string, now: number): TradeReason {
  const offer = desk.offers.find((row) => row.id === offerId)
  if (!offer || offer.status === 'cancelled' || offer.status === 'done') return 'missing'
  if (user !== offer.host && user !== offer.guest) return 'missing'
  if (offer.status === 'locked') return 'ok'
  offer.status = 'locked'
  offer.lockAt = now
  offer.version += 1
  return 'ok'
}

function applySwap(desk: TradeDesk, offer: DeskOffer, now: number): void {
  const left = monOf(desk, offer.host, offer.hostUid)
  const right = monOf(desk, offer.guest, offer.guestUid)
  if (!left || !right) return
  const hostAccount = desk.accounts[offer.host]
  const guestAccount = desk.accounts[offer.guest]
  const hostNext = receivedLevel(right.level, hostAccount?.teamMax ?? 1)
  const guestNext = receivedLevel(left.level, guestAccount?.teamMax ?? 1)
  const hostUid = `n${desk.next++}`
  const guestUid = `n${desk.next++}`
  desk.mons = desk.mons.filter((mon) => mon !== left && mon !== right)
  desk.mons.push({
    ...right,
    owner: offer.host,
    uid: hostUid,
    level: hostNext,
    how: 'Tausch',
    obtainedAt: now,
    tradeCount: right.tradeCount + 1,
    inTeam: false
  })
  desk.mons.push({
    ...left,
    owner: offer.guest,
    uid: guestUid,
    level: guestNext,
    how: 'Tausch',
    obtainedAt: now,
    tradeCount: left.tradeCount + 1,
    inTeam: false
  })
  const trade: DeskTrade = {
    offerId: offer.id,
    host: offer.host,
    guest: offer.guest,
    hostRarity: left.rarity,
    guestRarity: right.rarity,
    oneWayTo: oneWayReceiver(left, right),
    at: now
  }
  desk.trades.push(trade)
  offer.status = 'done'
  offer.version += 1
  if (trade.oneWayTo) {
    const giver = trade.oneWayTo === offer.host ? offer.guest : offer.host
    flagOneWay(desk, giver, trade.oneWayTo, now)
  }
}

export function flagOneWay(desk: TradeDesk, giver: string, receiver: string, now: number): boolean {
  if (oneWayCount(desk, giver, receiver, now - 30 * 24 * 60 * 60 * 1000) <= ONE_WAY_LIMIT) return false
  desk.flags[giver] = desk.flags[giver] === 2 ? 2 : 1
  desk.flags[receiver] = desk.flags[receiver] === 2 ? 2 : 1
  desk.banned[giver] = true
  desk.banned[receiver] = true
  return true
}

/** Confirms one side. The swap runs only after both confirms and the 5 s lock. A second call does not swap again. */
export function confirmTrade(desk: TradeDesk, offerId: string, user: string, now: number, crashBeforeWrite = false): TradeReason {
  const offer = desk.offers.find((row) => row.id === offerId)
  if (!offer) return 'missing'
  if (offer.status === 'done') return 'done'
  if (offer.status !== 'locked') return 'wait'
  if (user !== offer.host && user !== offer.guest) return 'missing'
  if (now - offer.lockAt < CONFIRM_MS) return 'wait'
  if (user === offer.host) offer.hostConfirm = offer.hostConfirm || now
  else offer.guestConfirm = offer.guestConfirm || now
  if (!offer.hostConfirm || !offer.guestConfirm) return 'ok'
  const left = monOf(desk, offer.host, offer.hostUid)
  const right = monOf(desk, offer.guest, offer.guestUid)
  if (!left || !right) return 'missing'
  const again = pairReason(left, right)
  if (again !== 'ok') return again
  if (monsterReason(left, now) !== 'ok' || monsterReason(right, now) !== 'ok') return 'fresh'
  if (crashBeforeWrite) throw new Error('abort')
  const version = offer.version
  applySwap(desk, offer, now)
  if (offer.version === version) return 'missing'
  return 'done'
}
