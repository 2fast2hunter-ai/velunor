import { admin, caller, cors, json } from '../_shared/admin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const user = await caller(req)
  if (!user) return json({ error: 'auth' }, 401)
  const db = admin()
  await db.rpc('guild_act', { p_user: user.id, p_body: { action: 'leave' } })
  await db.from('reports').update({ reporter: null }).eq('reporter', user.id)
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
