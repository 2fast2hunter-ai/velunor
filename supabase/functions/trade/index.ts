import { admin, caller, cors, json } from '../_shared/admin.ts'
import { crestCount } from '../../../src/adventure/arena.ts'
import { expeditionBusy } from '../../../src/adventure/expedition.ts'
import {
  accountReason,
  monsterReason,
  pairReason,
  type TradeAccount,
  type TradeMon
} from '../../../src/adventure/trade.ts'
import type { SaveV2 } from '../../../src/adventure/types.ts'

function accountFrom(id: string, user: { created_at?: string, email?: string | null, email_confirmed_at?: string | null }, profile: { flag_level?: number, trade_banned?: boolean, last_audit?: { badges?: string[] } } | null, teamMax: number): TradeAccount {
  const badges = Array.isArray(profile?.last_audit?.badges) ? profile?.last_audit?.badges ?? [] : []
  const flag = profile?.flag_level === 2 ? 2 : profile?.flag_level === 1 ? 1 : 0
  return {
    id,
    createdAt: Date.parse(String(user.created_at ?? '')) || Date.now(),
    crests: crestCount(badges),
    flag,
    banned: profile?.trade_banned === true,
    email: Boolean(user.email && user.email_confirmed_at),
    teamMax
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const user = await caller(req)
  if (!user) return json({ error: 'auth' }, 401)
  let body: Record<string, unknown> = {}
  try {
    const parsed = await req.json()
    if (parsed && typeof parsed === 'object') body = parsed as Record<string, unknown>
  } catch { body = {} }
  const action = typeof body.action === 'string' ? body.action : 'state'
  const db = admin()
  const authUser = await db.auth.admin.getUserById(user.id)
  const profile = await db.from('profiles').select('flag_level, trade_banned, last_audit').eq('user_id', user.id).maybeSingle()
  const saved = await db.from('saves').select('save_json').eq('user_id', user.id).maybeSingle()
  const adventure = (saved.data?.save_json ?? null) as SaveV2 | null
  const team = new Set(adventure?.team ?? [])
  const owned = await db.from('monsters_owned').select('uid, species, level, rarity, schimmer, obtained_at, obtained_how, trade_count').eq('owner', user.id)
  const mineAccount = accountFrom(user.id, authUser.data.user ?? {}, profile.data, 1)
  const gate = accountReason(mineAccount, Date.now())

  const card = (row: { uid: string, species: string, level: number, rarity: number, schimmer: boolean, obtained_at: string, obtained_how: string, trade_count: number }, owner: string) => {
    const mon: TradeMon = {
      owner,
      uid: row.uid,
      species: row.species,
      rarity: row.rarity,
      shiny: row.schimmer,
      level: row.level,
      how: row.obtained_how,
      obtainedAt: Date.parse(row.obtained_at) || 0,
      tradeCount: row.trade_count,
      inTeam: team.has(row.uid) || (adventure ? expeditionBusy(adventure, row.uid) : false)
    }
    const reason = monsterReason(mon, Date.now())
    return { uid: row.uid, species: row.species, rarity: row.rarity, shiny: row.schimmer, level: row.level, reason: reason === 'ok' ? '' : reason }
  }

  if (action === 'state') {
    const offers = await db.from('trade_offers').select('id, host, guest, host_uid, guest_uid, status, lock_at, host_confirm, guest_confirm').or(`host.eq.${user.id},guest.eq.${user.id}`).in('status', ['offered', 'countered', 'locked'])
    return json({
      status: 'ready',
      ready: gate,
      monsters: (owned.data ?? []).map((row) => card(row, user.id)),
      offers: (offers.data ?? []).map((row) => ({
        id: row.id,
        host: row.host === user.id,
        hostUid: row.host_uid,
        guestUid: row.guest_uid,
        status: row.status,
        lockAt: row.lock_at,
        hostConfirm: Boolean(row.host_confirm),
        guestConfirm: Boolean(row.guest_confirm)
      }))
    })
  }

  if (gate !== 'ok') return json({ error: gate }, 403)
  const code = String(body.code ?? '').trim().toUpperCase()
  const friend = code ? await db.from('friend_codes').select('user_id').eq('code', code).maybeSingle() : { data: null }
  const otherId = friend.data?.user_id ? String(friend.data.user_id) : String(body.user ?? '')
  if (action === 'offer') {
    if (!otherId) return json({ error: 'friend' }, 404)
    const link = await db.from('friendships').select('created_at').eq('user_a', user.id < otherId ? user.id : otherId).eq('user_b', user.id < otherId ? otherId : user.id).maybeSingle()
    const since = Date.parse(String(link.data?.created_at ?? ''))
    if (!Number.isFinite(since) || Date.now() - since < 48 * 60 * 60 * 1000) return json({ error: 'friend' }, 403)
    const otherRows = await db.from('monsters_owned').select('uid, species, level, rarity, schimmer, obtained_at, obtained_how, trade_count').eq('owner', otherId)
    const mine = (owned.data ?? []).find((row) => row.uid === body.mine)
    const theirs = (otherRows.data ?? []).find((row) => row.uid === body.theirs)
    if (!mine || !theirs) return json({ error: 'missing' }, 404)
    const left = card(mine, user.id)
    const right = card(theirs, otherId)
    if (left.reason) return json({ error: left.reason }, 403)
    if (right.reason) return json({ error: right.reason }, 403)
    const pair = pairReason({
      owner: user.id, uid: mine.uid, species: mine.species, rarity: mine.rarity, shiny: mine.schimmer, level: mine.level,
      how: mine.obtained_how, obtainedAt: Date.parse(mine.obtained_at) || 0, tradeCount: mine.trade_count, inTeam: false
    }, {
      owner: otherId, uid: theirs.uid, species: theirs.species, rarity: theirs.rarity, shiny: theirs.schimmer, level: theirs.level,
      how: theirs.obtained_how, obtainedAt: Date.parse(theirs.obtained_at) || 0, tradeCount: theirs.trade_count, inTeam: false
    })
    if (pair !== 'ok') return json({ error: pair }, 403)
    const opened = await db.rpc('trade_act', {
      p_user: user.id,
      p_action: 'open',
      p_offer: null,
      p_other: otherId,
      p_mine: mine.uid,
      p_theirs: theirs.uid
    })
    return json(opened.data ?? { error: 'open' })
  }

  const offerId = typeof body.offer === 'string' ? body.offer : null
  if (!offerId) return json({ error: 'missing' }, 400)
  const acted = await db.rpc('trade_act', {
    p_user: user.id,
    p_action: action,
    p_offer: offerId,
    p_other: otherId || null,
    p_mine: typeof body.mine === 'string' ? body.mine : '',
    p_theirs: typeof body.theirs === 'string' ? body.theirs : ''
  })
  return json(acted.data ?? { error: 'trade' })
})
