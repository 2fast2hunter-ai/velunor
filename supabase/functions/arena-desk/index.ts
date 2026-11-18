import { admin, caller, cors, json } from '../_shared/admin.ts'
import {
  arenaUnlocked,
  chargeAttacks,
  crestCount,
  leagueOf,
  pickOpponents,
  teamFromRegister
} from '../../../src/adventure/arena.ts'
import type { SaveV2 } from '../../../src/adventure/types.ts'

function labelOf(row: { hidden?: boolean, display?: string, name?: string, tag?: string } | null): string {
  if (!row) return 'Spieler'
  if (row.hidden) return `Spieler#${row.tag ?? '0000'}`
  return row.display || 'Spieler'
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
  const action = body.action === 'defend' || body.action === 'suggest' || body.action === 'claim' || body.action === 'log' ? body.action : 'state'
  const db = admin()
  const closed = await db.rpc('close_arena_season')
  if (closed.error) return json({ error: 'season' }, 500)
  const flag = await db.from('profiles').select('flag_level, last_audit').eq('user_id', user.id).maybeSingle()
  if (flag.data?.flag_level === 2) return json({ error: 'flag' }, 403)
  const badges = Array.isArray(flag.data?.last_audit?.badges) ? flag.data.last_audit.badges as string[] : []
  const owned = await db.from('monsters_owned').select('uid, species, schimmer').eq('owner', user.id)
  const registered = owned.data?.length ?? 0
  const unlocked = arenaUnlocked(crestCount(badges), registered)
  const existing = await db.from('arena_profiles').select('*').eq('user_id', user.id).maybeSingle()
  if (!existing.data) {
    await db.from('arena_profiles').insert({ user_id: user.id })
  }
  const row = existing.data ?? { rating: 1000, attacks: 5, attacks_at: new Date().toISOString(), day_key: '', defense: null, suggestions: [] }
  const now = Date.now()
  const charged = chargeAttacks({
    attacks: Number(row.attacks) || 0,
    attacksAt: Date.parse(String(row.attacks_at)) || now,
    dayKey: String(row.day_key ?? '')
  }, now)
  await db.from('arena_profiles').update({
    attacks: charged.attacks,
    attacks_at: new Date(charged.attacksAt).toISOString(),
    day_key: charged.dayKey
  }).eq('user_id', user.id)

  if (action === 'defend') {
    const uids = Array.isArray(body.uids) ? body.uids.filter((id): id is string => typeof id === 'string') : []
    if (new Set(uids).size !== 6) return json({ error: 'team' }, 400)
    const byUid = new Map((owned.data ?? []).map((mon) => [mon.uid, mon]))
    const rows = uids.map((uid) => byUid.get(uid)).filter((mon): mon is { uid: string, species: string, schimmer: boolean } => Boolean(mon))
    if (rows.length !== 6) return json({ error: 'team' }, 400)
    const saved = await db.from('saves').select('save_json').eq('user_id', user.id).maybeSingle()
    if (!saved.data?.save_json) return json({ error: 'team' }, 400)
    const team = teamFromRegister(rows, saved.data.save_json as SaveV2)
    if (!team) return json({ error: 'team' }, 400)
    await db.from('arena_profiles').update({ defense: team }).eq('user_id', user.id)
    return json({ ok: true, species: team.fighters.map((fighter) => fighter.speciesId) })
  }

  if (action === 'suggest') {
    if (!unlocked) return json({ error: 'locked' }, 403)
    const poolRows = await db.from('arena_profiles').select('user_id, rating, defense').not('defense', 'is', null).neq('user_id', user.id).limit(80)
    const ids = (poolRows.data ?? []).map((entry) => entry.user_id)
    const flags = ids.length ? await db.from('profiles').select('user_id, flag_level').in('user_id', ids) : { data: [] }
    const names = ids.length ? await db.from('player_names').select('user_id, hidden, display, name, tag').in('user_id', ids) : { data: [] }
    const blocks = await db.from('blocks').select('label').eq('owner', user.id)
    const banned = new Set((blocks.data ?? []).map((block) => block.label))
    const flagged = new Set((flags.data ?? []).filter((entry) => entry.flag_level === 2).map((entry) => entry.user_id))
    const nameOf = new Map((names.data ?? []).map((entry) => [entry.user_id, entry]))
    const pool = (poolRows.data ?? []).flatMap((entry) => {
      if (flagged.has(entry.user_id)) return []
      const label = labelOf(nameOf.get(entry.user_id) ?? null)
      if (banned.has(label)) return []
      const fighters = entry.defense?.fighters
      const speciesIds = Array.isArray(fighters) ? fighters.map((fighter: { speciesId?: string }) => fighter.speciesId ?? '') : []
      return [{ practice: false, seed: 1, id: entry.user_id, label, rating: Number(entry.rating) || 1000, species: speciesIds }]
    })
    const seed = (now ^ user.id.length) >>> 0 || 1
    const cards = pickOpponents(user.id, Number(row.rating) || 1000, pool, seed)
    await db.from('arena_profiles').update({ suggestions: cards }).eq('user_id', user.id)
    return json({
      suggestions: cards.map((card, index) => ({
        index,
        practice: card.practice,
        label: card.label,
        rating: card.rating,
        league: leagueOf(card.rating).name,
        species: card.species
      }))
    })
  }

  if (action === 'claim') {
    const rewards = await db.from('arena_season_rewards').select('season, marks, frame').eq('user_id', user.id).eq('claimed', false)
    const rows = rewards.data ?? []
    if (rows.length) {
      await db.from('arena_season_rewards').update({ claimed: true }).eq('user_id', user.id).eq('claimed', false)
    }
    return json({
      marks: rows.reduce((sum, reward) => sum + (Number(reward.marks) || 0), 0),
      frames: rows.map((reward) => reward.frame)
    })
  }

  if (action === 'log') {
    const logs = await db.from('arena_logs').select('at, attacker_label, win, delta').eq('defender', user.id).order('at', { ascending: false }).limit(20)
    return json({ logs: logs.data ?? [] })
  }

  const rating = Number(row.rating) || 1000
  const defense = row.defense?.fighters
  return json({
    locked: !unlocked,
    rating,
    league: leagueOf(rating).name,
    attacks: charged.attacks,
    species: Array.isArray(defense) ? defense.map((fighter: { speciesId?: string }) => fighter.speciesId ?? '') : [],
    crests: crestCount(badges),
    registered
  })
})
