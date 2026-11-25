import { admin, caller, cors, json } from '../_shared/admin.ts'
import { arenaDayKey, teamFromRegister } from '../../../src/adventure/arena.ts'
import { EGG_CHANCE, coopDamage, coopRoster, coopTeamIssue } from '../../../src/adventure/coop.ts'
import { beastAt } from '../../../src/adventure/season.ts'
import { expeditionBusy } from '../../../src/adventure/expedition.ts'
import { validFriendCode } from '../../../src/adventure/social.ts'
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
  const action = typeof body.action === 'string' ? body.action : 'state'
  const db = admin()
  const flag = await db.from('profiles').select('flag_level').eq('user_id', user.id).maybeSingle()
  if (flag.data?.flag_level === 2) return json({ error: 'flag' }, 403)
  const day = arenaDayKey(new Date())

  if (action === 'invite') {
    const code = String(body.code ?? '').trim().toUpperCase()
    if (!validFriendCode(code)) return json({ error: 'none' }, 404)
    const friend = await db.from('friend_codes').select('user_id').eq('code', code).maybeSingle()
    if (!friend.data?.user_id) return json({ error: 'none' }, 404)
    await db.rpc('coop_ensure', { p_user: user.id, p_day: day })
    const joined = await db.rpc('coop_join', { p_host: user.id, p_friend: friend.data.user_id })
    return json(joined.data ?? { error: 'join' })
  }

  if (action === 'attempt') {
    const uids = Array.isArray(body.uids) ? body.uids.filter((id): id is string => typeof id === 'string') : []
    const owned = await db.from('monsters_owned').select('uid, species, schimmer').eq('owner', user.id)
    const saved = await db.from('saves').select('save_json').eq('user_id', user.id).maybeSingle()
    if (!saved.data?.save_json) return json({ error: 'team' }, 400)
    const adventure = saved.data.save_json as SaveV2
    if (uids.some((uid) => expeditionBusy(adventure, uid))) return json({ error: 'expedition' }, 400)
    const issue = coopTeamIssue(uids, owned.data ?? [], adventure)
    if (issue) return json({ error: issue }, 400)
    const rows = coopRoster(uids, owned.data ?? [], adventure)
    if (!rows) return json({ error: 'team' }, 400)
    const team = teamFromRegister(rows, adventure)
    if (!team) return json({ error: 'team' }, 400)
    const ensured = await db.rpc('coop_ensure', { p_user: user.id, p_day: day })
    const beast = beastAt(new Date(String(ensured.data?.week ?? Date.now())))
    const seed = (Date.now() ^ user.id.length) >>> 0
    const damage = coopDamage(team.fighters, beast.type, seed || 1, team.synergy)
    const strike = await db.rpc('coop_strike', { p_user: user.id, p_day: day, p_damage: damage, p_seed: seed })
    return json(strike.data ?? { error: 'strike' })
  }

  if (action === 'claim') {
    const claimed = await db.rpc('coop_claim', { p_user: user.id })
    return json(claimed.data ?? { gold: 0, fruit: 0, marks: 0, eggs: [] })
  }

  const ensured = await db.rpc('coop_ensure', { p_user: user.id, p_day: day })
  if (!ensured.data || ensured.data.error) return json({ error: 'group' }, 500)
  const groupId = String(ensured.data.group_id ?? '')
  const members = await db.from('coop_members').select('user_id').eq('group_id', groupId)
  const ids = (members.data ?? []).map((row) => String(row.user_id))
  const names = ids.length ? await db.from('player_names').select('user_id, hidden, display, name, tag').in('user_id', ids) : { data: [] }
  const nameOf = new Map((names.data ?? []).map((row) => [row.user_id, row]))
  const rewards = await db.from('coop_rewards').select('gold, fruit, marks').eq('user_id', user.id).eq('claimed', false)
  const waiting = (rewards.data ?? []).reduce((sum, row) => ({
    gold: sum.gold + (Number(row.gold) || 0),
    fruit: sum.fruit + (Number(row.fruit) || 0),
    marks: sum.marks + (Number(row.marks) || 0)
  }), { gold: 0, fruit: 0, marks: 0 })
  const beast = beastAt(new Date(String(ensured.data.week)))
  return json({
    status: 'ready',
    beast: beast.id,
    name: beast.name,
    level: ensured.data.level,
    hp: ensured.data.hp,
    hpMax: ensured.data.hp_max,
    attempts: ensured.data.attempts,
    members: ids.map((id) => labelOf(nameOf.get(id) ?? null)),
    eggChance: EGG_CHANCE,
    reward: waiting
  })
})
