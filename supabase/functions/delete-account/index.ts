import { admin, caller, cors, json } from '../_shared/admin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const user = await caller(req)
  if (!user) return json({ error: 'auth' }, 401)
  const db = admin()
  const named = await db.from('player_names').select('tag').eq('user_id', user.id).maybeSingle()
  const tag = named.data?.tag ?? '0000'
  await db.from('reports').update({ reporter: null, target_label: `Spieler#${tag}` }).eq('reporter', user.id)
  await db.from('monsters_owned').delete().eq('owner', user.id)
  await db.from('blocks').delete().eq('owner', user.id)
  await db.from('player_names').delete().eq('user_id', user.id)
  await db.from('profiles').delete().eq('user_id', user.id)
  await db.from('saves').delete().eq('user_id', user.id)
  await db.from('events').delete().eq('player_id', user.id)
  const removed = await db.auth.admin.deleteUser(user.id)
  if (removed.error) return json({ error: 'auth' }, 500)
  return json({ ok: true })
})
