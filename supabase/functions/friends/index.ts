import { admin, caller, cors, json } from '../_shared/admin.ts'
import { arenaDayKey, crestCount } from '../../../src/adventure/arena.ts'
import { CODE_ALPHABET, giftGold, parseNameTag, validFriendCode } from '../../../src/adventure/social.ts'

function labelOf(row: { hidden?: boolean, display?: string, name?: string, tag?: string } | null): string {
  if (!row) return 'Spieler'
  if (row.hidden) return `Spieler#${row.tag ?? '0000'}`
  return row.display || `${row.name ?? 'Spieler'}#${row.tag ?? '0000'}`
}

function makeCode(): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return [...bytes].map((value) => CODE_ALPHABET[value % CODE_ALPHABET.length]).join('')
}

async function ensureCode(db: ReturnType<typeof admin>, userId: string): Promise<string> {
  const existing = await db.from('friend_codes').select('code').eq('user_id', userId).maybeSingle()
  if (existing.data?.code) return String(existing.data.code)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = makeCode()
    const inserted = await db.from('friend_codes').insert({ user_id: userId, code }).select('code').maybeSingle()
    if (inserted.data?.code) return String(inserted.data.code)
  }
  const again = await db.from('friend_codes').select('code').eq('user_id', userId).maybeSingle()
  return String(again.data?.code ?? '')
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
  const mine = await db.from('player_names').select('user_id, hidden, display, name, tag').eq('user_id', user.id).maybeSingle()
  if (!mine.data) return json({ error: 'name' }, 403)
  const code = await ensureCode(db, user.id)
  await db.from('friend_settings').upsert({ user_id: user.id, last_seen: new Date().toISOString() }, { onConflict: 'user_id' })

  const find = async (query: string) => {
    const trimmed = query.trim()
    if (validFriendCode(trimmed)) {
      const row = await db.from('friend_codes').select('user_id, code').eq('code', trimmed.toUpperCase()).maybeSingle()
      return row.data ? { userId: String(row.data.user_id), code: String(row.data.code), byName: false } : null
    }
    const tag = parseNameTag(trimmed)
    if (!tag) return null
    const row = await db.from('player_names').select('user_id').eq('name', tag.name).eq('tag', tag.tag).eq('hidden', false).maybeSingle()
    if (!row.data) return null
    const friendCode = await ensureCode(db, String(row.data.user_id))
    return { userId: String(row.data.user_id), code: friendCode, byName: true }
  }

  const blockedEither = async (otherId: string): Promise<boolean> => {
    const other = await db.from('player_names').select('hidden, display, name, tag').eq('user_id', otherId).maybeSingle()
    const labels = (row: typeof mine.data) => [labelOf(row), row?.display, row?.name && row?.tag ? `${row.name}#${row.tag}` : ''].filter((label): label is string => Boolean(label))
    const mineLabels = new Set(labels(mine.data))
    const otherLabels = new Set(labels(other.data))
    const outgoing = await db.from('blocks').select('label').eq('owner', user.id)
    const incoming = await db.from('blocks').select('label').eq('owner', otherId)
    const out = (outgoing.data ?? []).some((block) => otherLabels.has(String(block.label)))
    const inn = (incoming.data ?? []).some((block) => mineLabels.has(String(block.label)))
    return out || inn
  }

  if (action === 'search') {
    const found = await find(String(body.query ?? ''))
    if (!found || found.userId === user.id) return json({ status: 'none' })
    const name = await db.from('player_names').select('hidden, display, name, tag').eq('user_id', found.userId).maybeSingle()
    return json({ status: 'found', code: found.code, label: labelOf(name.data) })
  }

  if (action === 'request' || action === 'accept' || action === 'decline' || action === 'remove' || action === 'gift') {
    const found = await find(String(body.code ?? body.query ?? ''))
    if (!found || found.userId === user.id) return json({ error: 'none' }, 404)
    if (action === 'request') {
      if (found.byName) {
        const hidden = await db.from('player_names').select('hidden').eq('user_id', found.userId).maybeSingle()
        if (hidden.data?.hidden) return json({ error: 'hidden' }, 403)
      }
      if (await blockedEither(found.userId)) return json({ error: 'blocked' }, 403)
      const asked = await db.rpc('friend_ask', { p_sender: user.id, p_recipient: found.userId })
      return json(asked.data ?? { error: 'ask' })
    }
    if (action === 'accept' || action === 'decline') {
      const answered = await db.rpc('friend_answer', { p_user: user.id, p_other: found.userId, p_accept: action === 'accept' })
      return json(answered.data ?? { error: 'answer' })
    }
    if (action === 'remove') {
      const removed = await db.rpc('friend_remove', { p_user: user.id, p_other: found.userId })
      return json(removed.data ?? { error: 'remove' })
    }
    const regionRow = await db.from('profiles').select('last_audit').eq('user_id', found.userId).maybeSingle()
    const region = Number(regionRow.data?.last_audit?.region) || 1
    const sent = await db.rpc('friend_send_gift', {
      p_sender: user.id,
      p_recipient: found.userId,
      p_day: arenaDayKey(new Date()),
      p_gold: giftGold(region)
    })
    return json(sent.data ?? { error: 'gift' })
  }

  if (action === 'claim') {
    const claimed = await db.rpc('friend_claim', { p_user: user.id })
    return json(claimed.data ?? { gold: 0 })
  }

  if (action === 'privacy') {
    const patch: { user_id: string, show_online: boolean, last_seen: string, favorite?: string } = {
      user_id: user.id,
      show_online: body.showOnline !== false,
      last_seen: new Date().toISOString()
    }
    if (typeof body.favorite === 'string') {
      if (body.favorite) {
        const owned = await db.from('monsters_owned').select('species').eq('owner', user.id).eq('species', body.favorite).limit(1)
        if (!owned.data?.length) return json({ error: 'favorite' }, 400)
      }
      patch.favorite = body.favorite
    }
    await db.from('friend_settings').upsert(patch, { onConflict: 'user_id' })
    return json({ ok: true })
  }

  const links = await db.from('friendships').select('user_a, user_b').or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
  const friendIds = (links.data ?? []).map((row) => row.user_a === user.id ? String(row.user_b) : String(row.user_a))
  const requests = await db.from('friend_requests').select('sender, recipient, status').or(`sender.eq.${user.id},recipient.eq.${user.id}`).eq('status', 'pending')
  const requestIds = (requests.data ?? []).map((row) => row.sender === user.id ? String(row.recipient) : String(row.sender))
  const ids = [...new Set([...friendIds, ...requestIds])]
  const names = ids.length ? await db.from('player_names').select('user_id, hidden, display, name, tag').in('user_id', ids) : { data: [] }
  const profiles = ids.length ? await db.from('profiles').select('user_id, last_audit').in('user_id', ids) : { data: [] }
  const codes = ids.length ? await db.from('friend_codes').select('user_id, code').in('user_id', ids) : { data: [] }
  const settings = ids.length ? await db.from('friend_settings').select('user_id, show_online, favorite, last_seen').in('user_id', ids) : { data: [] }
  const monsters = ids.length ? await db.from('monsters_owned').select('owner, species').in('owner', ids) : { data: [] }
  const nameOf = new Map((names.data ?? []).map((row) => [row.user_id, row]))
  const profileOf = new Map((profiles.data ?? []).map((row) => [row.user_id, row]))
  const codeOf = new Map((codes.data ?? []).map((row) => [String(row.user_id), String(row.code)]))
  for (const id of ids) {
    if (!codeOf.get(id)) codeOf.set(id, await ensureCode(db, id))
  }
  const settingOf = new Map((settings.data ?? []).map((row) => [row.user_id, row]))
  const speciesOf = new Map<string, Set<string>>()
  for (const mon of monsters.data ?? []) {
    const key = String(mon.owner)
    const set = speciesOf.get(key) ?? new Set<string>()
    set.add(String(mon.species))
    speciesOf.set(key, set)
  }
  const card = (id: string) => {
    const audit = profileOf.get(id)?.last_audit
    const badges = Array.isArray(audit?.badges) ? audit.badges as string[] : []
    const setting = settingOf.get(id)
    const seen = Date.parse(String(setting?.last_seen ?? ''))
    const show = setting?.show_online !== false
    const age = Number.isFinite(seen) ? Date.now() - seen : 99 * 24 * 60 * 60 * 1000
    const presence = !show ? 'verborgen' : age <= 15 * 60 * 1000 ? 'online' : age <= 24 * 60 * 60 * 1000 ? 'heute' : 'offline'
    return {
      code: String(codeOf.get(id) ?? ''),
      label: labelOf(nameOf.get(id) ?? null),
      region: Number(audit?.region) || 1,
      crests: crestCount(badges),
      codex: speciesOf.get(id)?.size ?? 0,
      favorite: String(setting?.favorite ?? ''),
      presence
    }
  }
  const mineSettings = await db.from('friend_settings').select('show_online, favorite').eq('user_id', user.id).maybeSingle()
  const inbox = await db.from('friend_gifts').select('gold').eq('recipient', user.id).eq('claimed', false)
  const waiting = (inbox.data ?? []).reduce((sum, row) => sum + (Number(row.gold) || 0), 0)
  return json({
    status: 'ready',
    code,
    showOnline: mineSettings.data?.show_online !== false,
    favorite: String(mineSettings.data?.favorite ?? ''),
    gifts: waiting,
    friends: friendIds.map(card).filter((row) => row.code),
    requests: (requests.data ?? []).map((row) => {
      const other = row.sender === user.id ? String(row.recipient) : String(row.sender)
      return { ...card(other), incoming: row.recipient === user.id }
    }).filter((row) => row.code)
  })
})
