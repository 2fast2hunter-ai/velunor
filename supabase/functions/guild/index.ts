import { admin, caller, cors, json } from '../_shared/admin.ts'
import { crestCount } from '../../../src/adventure/arena.ts'
import { coopDamage, weeklyBeast } from '../../../src/adventure/coop.ts'
import { teamFromRegister } from '../../../src/adventure/arena.ts'
import {
  foundCost,
  guildNameIssue,
  guildTagIssue,
  guildLevel,
  guildTextIssue,
  phraseOk,
  weekGoals
} from '../../../src/adventure/guild.ts'
import type { SaveV2 } from '../../../src/adventure/types.ts'

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
  const profile = await db.from('profiles').select('flag_level, last_audit').eq('user_id', user.id).maybeSingle()
  if (profile.data?.flag_level === 2 && action !== 'state' && action !== 'leave') return json({ error: 'flag' }, 403)
  const badges = Array.isArray(profile.data?.last_audit?.badges) ? profile.data?.last_audit?.badges as string[] : []
  const saved = await db.from('saves').select('save_json').eq('user_id', user.id).maybeSingle()
  const adventure = (saved.data?.save_json ?? null) as SaveV2 | null

  if (action === 'found') {
    const name = String(body.name ?? '')
    const tag = String(body.tag ?? '').toUpperCase()
    const description = String(body.description ?? '')
    if (guildNameIssue(name) || guildTagIssue(tag) || guildTextIssue(description)) return json({ error: 'name' }, 400)
    if (crestCount(badges) < 8) return json({ error: 'crests' }, 403)
    const region = Math.max(1, Math.floor(Number(adventure?.region)) || 1)
    const cost = foundCost(region)
    if ((adventure?.gold ?? 0) < cost) return json({ error: 'gold' }, 400)
    const code = Math.random().toString(36).slice(2, 10).toUpperCase().replace(/[^A-Z0-9]/g, 'A').padEnd(8, 'A').slice(0, 8)
    const created = await db.rpc('guild_act', {
      p_user: user.id,
      p_body: { action: 'found', name, tag, description, code, join: 'request', shape: 'shield', symbol: 'leaf', color: 'moss' }
    })
    return json({ ...(created.data ?? { error: 'found' }), cost })
  }

  if (action === 'beast') {
    const uids = Array.isArray(body.uids) ? body.uids.filter((id): id is string => typeof id === 'string') : []
    const owned = await db.from('monsters_owned').select('uid, species, schimmer').eq('owner', user.id)
    const byUid = new Map((owned.data ?? []).map((mon) => [mon.uid, mon]))
    const rows = uids.map((uid) => byUid.get(uid)).filter((mon): mon is { uid: string, species: string, schimmer: boolean } => Boolean(mon))
    if (!adventure || rows.length !== 6) return json({ error: 'team' }, 400)
    const team = teamFromRegister(rows, adventure)
    if (!team) return json({ error: 'team' }, 400)
    const beast = weeklyBeast(new Date())
    const damage = coopDamage(team.fighters, beast.type, (Date.now() >>> 0) || 1, team.synergy)
    const hit = await db.rpc('guild_act', { p_user: user.id, p_body: { action: 'beast', damage } })
    return json({ ...(hit.data ?? {}), damage })
  }

  if (action === 'phrase' && !phraseOk(String(body.phrase ?? ''))) return json({ error: 'phrase' }, 400)
  if (action === 'sync' || action === 'state') {
    await db.rpc('guild_act', { p_user: user.id, p_body: { action: 'sync', goals: weekGoals(new Date()) } })
  }
  if (action === 'sync') return json({ ok: true })
  if (action === 'state') {
    const member = await db.from('guild_members').select('guild_id, role, contrib').eq('user_id', user.id).maybeSingle()
    if (!member.data) return json({ status: 'ready', guild: null })
    const guild = await db.from('guilds').select('name, tag, points, week_points, shape, symbol, color').eq('id', member.data.guild_id).maybeSingle()
    const goals = await db.from('guild_goals').select('goal, progress, target').eq('guild_id', member.data.guild_id)
    return json({
      status: 'ready',
      guild: {
        name: guild.data?.name ?? '',
        tag: guild.data?.tag ?? '',
        points: guild.data?.points ?? 0,
        weekPoints: guild.data?.week_points ?? 0,
        level: guildLevel(Number(guild.data?.points) || 0),
        shape: guild.data?.shape,
        symbol: guild.data?.symbol,
        color: guild.data?.color
      },
      goals: goals.data ?? [],
      contrib: member.data.contrib
    })
  }
  const acted = await db.rpc('guild_act', { p_user: user.id, p_body: { ...body, action } })
  return json(acted.data ?? { error: 'guild' })
})
