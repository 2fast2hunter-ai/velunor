/** Friend rules. The friends edge function uses the same checks. */

export const FRIEND_CAP = 50
export const GIFT_GOLD = 500
export const GIFT_RECEIVE_CAP = 20
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export type RequestState = 'pending' | 'accepted' | 'declined'

export function friendCode(seed: number): string {
  let value = seed >>> 0 || 1
  let out = ''
  for (let i = 0; i < 8; i++) {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0
    out += CODE_ALPHABET[value % CODE_ALPHABET.length]
  }
  return out
}

export function validFriendCode(code: string): boolean {
  return /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(code.trim().toUpperCase())
}

export function parseNameTag(raw: string): { name: string, tag: string } | null {
  const match = /^(.{1,16})#(\d{4})$/.exec(raw.trim())
  if (!match) return null
  return { name: match[1], tag: match[2] }
}

export function canRequest(input: {
  from: string
  to: string
  fromFriends: number
  toFriends: number
  blockedEither: boolean
  hidden: boolean
  existing: RequestState | 'friends' | null
}): 'ok' | 'self' | 'full' | 'blocked' | 'hidden' | 'pending' | 'friends' {
  if (!input.from || input.from === input.to) return 'self'
  if (input.hidden) return 'hidden'
  if (input.blockedEither) return 'blocked'
  if (input.existing === 'friends' || input.existing === 'accepted') return 'friends'
  if (input.existing === 'pending') return 'pending'
  if (input.fromFriends >= FRIEND_CAP || input.toFriends >= FRIEND_CAP) return 'full'
  return 'ok'
}

export function canAccept(fromFriends: number, toFriends: number): 'ok' | 'full' {
  if (fromFriends >= FRIEND_CAP || toFriends >= FRIEND_CAP) return 'full'
  return 'ok'
}

export function giftGold(region: number): number {
  return GIFT_GOLD * Math.max(1, Math.min(5, Math.floor(region) || 1))
}

export function canGift(input: { friends: boolean, alreadySent: boolean, receivedToday: number }): 'ok' | 'strangers' | 'sent' | 'cap' {
  if (!input.friends) return 'strangers'
  if (input.alreadySent) return 'sent'
  if (input.receivedToday >= GIFT_RECEIVE_CAP) return 'cap'
  return 'ok'
}

/** Coarse presence. No clock time leaves the server. */
export function presence(lastSeenMs: number, now: number, show: boolean): 'online' | 'heute' | 'offline' | 'verborgen' {
  if (!show) return 'verborgen'
  if (now - lastSeenMs <= 15 * 60 * 1000) return 'online'
  if (now - lastSeenMs <= 24 * 60 * 60 * 1000) return 'heute'
  return 'offline'
}
