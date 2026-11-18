import { admin, caller, cors, json } from '../_shared/admin.ts'
import { crestCount } from '../../../src/adventure/arena.ts'
import {
  CONTEXT,
  REPORTS_PER_DAY,
  SEVERE_BAN_MS,
  SEVERE_HITS,
  canWrite,
  filterChat,
  pauseUntil,
  rateReason,
  severeLock
} from '../../../src/adventure/chat.ts'

function channelOf(kind: string, mine: string, other: string, guild: string): string | null {
  if (kind === 'guild' && guild) return `guild:${guild}`
  if (kind === 'dm' && other) return `dm:${mine < other ? mine : other}:${mine < other ? other : mine}`
  return null
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
  if ('year' in body || 'birth' in body) return json({ error: 'year' }, 400)
  const action = typeof body.action === 'string' ? body.action : 'send'
  const db = admin()
  const authUser = await db.auth.admin.getUserById(user.id)
  const flags = await db.from('chat_flags').select('adult, chat_off, pause_until, ban_until').eq('user_id', user.id).maybeSingle()
  if (action === 'age') {
    if (typeof body.adult !== 'boolean') return json({ error: 'adult' }, 400)
    await db.from('chat_flags').upsert({ user_id: user.id, adult: body.adult }, { onConflict: 'user_id' })
    return json({ ok: true, adult: body.adult })
  }
  if (action === 'state') {
    const member = await db.from('guild_members').select('guild_id').eq('user_id', user.id).maybeSingle()
    const channel = member.data?.guild_id ? `guild:${member.data.guild_id}` : ''
    const lines = channel
      ? await db.from('messages').select('sender_label, body').eq('channel', channel).order('created_at', { ascending: false }).limit(30)
      : { data: [] }
    return json({
      adult: flags.data?.adult ?? null,
      lines: (lines.data ?? []).map((row) => ({ label: row.sender_label, body: row.body })).reverse()
    })
  }
  if (action === 'off') {
    await db.from('chat_flags').upsert({ user_id: user.id, chat_off: body.chat === false }, { onConflict: 'user_id' })
    return json({ ok: true })
  }
  const profile = await db.from('profiles').select('flag_level, last_audit').eq('user_id', user.id).maybeSingle()
  const flag = profile.data?.flag_level === 2 ? 2 : profile.data?.flag_level === 1 ? 1 : 0
  const badges = Array.isArray(profile.data?.last_audit?.badges) ? profile.data?.last_audit?.badges as string[] : []
  const created = Date.parse(String(authUser.data.user?.created_at ?? '')) || Date.now()
  const gate = canWrite({
    email: Boolean(authUser.data.user?.email && authUser.data.user?.email_confirmed_at),
    ageMs: Date.now() - created,
    crests: crestCount(badges),
    flag,
    adult: flags.data?.adult === true,
    chatOff: flags.data?.chat_off === true,
    bannedUntil: Date.parse(String(flags.data?.ban_until ?? '')) || 0,
    now: Date.now()
  })
  if (action === 'mute' || action === 'guild-mute') {
    if (gate === 'flag') return json({ error: gate }, 403)
    const hours = body.hours === 24 ? 24 : 1
    const target = String(body.target ?? '')
    if (!target) return json({ error: 'target' }, 400)
    await db.from('chat_mutes').upsert({
      owner: user.id,
      target,
      guild_id: action === 'guild-mute' ? body.guild ?? null : null,
      until: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
    }, { onConflict: 'owner,target' })
    return json({ ok: true })
  }
  if (gate !== 'ok' && action !== 'report') return json({ error: gate }, 403)

  if (action === 'report') {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const count = await db.from('reports').select('id', { count: 'exact', head: true }).eq('reporter', user.id).gte('created_at', since)
    if ((count.count ?? 0) >= REPORTS_PER_DAY) return json({ error: 'reports' }, 429)
    const messageId = String(body.message ?? '')
    const message = await db.from('messages').select('id, channel, created_at').eq('id', messageId).maybeSingle()
    if (!message.data) return json({ error: 'missing' }, 404)
    const before = await db.from('messages').select('id, sender_label, body, created_at').eq('channel', message.data.channel).lt('created_at', message.data.created_at).order('created_at', { ascending: false }).limit(CONTEXT)
    const after = await db.from('messages').select('id, sender_label, body, created_at').eq('channel', message.data.channel).gt('created_at', message.data.created_at).order('created_at', { ascending: true }).limit(CONTEXT)
    const reason = String(body.reason ?? 'sonstiges')
    const inserted = await db.from('reports').insert({
      reporter: user.id,
      target_label: String(body.target ?? 'chat'),
      reason,
      message_id: messageId,
      context: { before: before.data ?? [], after: after.data ?? [] }
    }).select('id').maybeSingle()
    await db.from('messages').update({
      reported: true,
      purge_after: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    }).eq('id', messageId)
    return json({ ok: true, id: inserted.data?.id ?? null })
  }

  const text = String(body.text ?? '')
  const filtered = filterChat(text)
  if (filtered.kind === 'severe') {
    await db.from('chat_strikes').insert({ user_id: user.id })
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const hits = await db.from('chat_strikes').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since)
    if (severeLock(hits.count ?? 0)) {
      await db.from('chat_flags').upsert({
        user_id: user.id,
        ban_until: new Date(Date.now() + SEVERE_BAN_MS).toISOString()
      }, { onConflict: 'user_id' })
    }
    return json({ error: 'severe' }, 400)
  }
  if (filtered.kind === 'contact' || filtered.kind === 'length') return json({ error: filtered.kind }, 400)

  const recent = await db.from('messages').select('body, created_at').eq('sender', user.id).gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()).order('created_at', { ascending: false }).limit(DAY_LIMIT)
  const stamps = (recent.data ?? []).map((row) => Date.parse(String(row.created_at)))
  const bodies = (recent.data ?? []).map((row) => String(row.body))
  const rate = rateReason({
    stamps,
    bodies,
    pauseUntil: Date.parse(String(flags.data?.pause_until ?? '')) || 0,
    now: Date.now(),
    text: filtered.text
  })
  if (rate !== 'ok') {
    await db.from('chat_flags').upsert({ user_id: user.id, pause_until: new Date(pauseUntil(Date.now())).toISOString() }, { onConflict: 'user_id' })
    return json({ error: rate }, 429)
  }

  const member = await db.from('guild_members').select('guild_id').eq('user_id', user.id).maybeSingle()
  const friend = body.code ? await db.from('friend_codes').select('user_id').eq('code', String(body.code).toUpperCase()).maybeSingle() : { data: null }
  const other = friend.data?.user_id ? String(friend.data.user_id) : ''
  const link = other ? await db.from('friendships').select('user_a').eq('user_a', user.id < other ? user.id : other).eq('user_b', user.id < other ? other : user.id).maybeSingle() : { data: null }
  const channel = channelOf(String(body.kind ?? 'guild'), user.id, link.data ? other : '', String(member.data?.guild_id ?? ''))
  if (!channel) return json({ error: 'channel' }, 403)
  const name = await db.from('player_names').select('hidden, display, name, tag').eq('user_id', user.id).maybeSingle()
  const label = name.data?.hidden ? `Spieler#${name.data.tag ?? '0000'}` : (name.data?.display || 'Spieler')
  const saved = await db.from('messages').insert({ channel, sender: user.id, sender_label: label, body: filtered.text }).select('id, created_at').maybeSingle()
  return json({ ok: true, id: saved.data?.id ?? null, text: filtered.text })
})
