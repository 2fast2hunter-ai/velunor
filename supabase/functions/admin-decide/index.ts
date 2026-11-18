import { admin, caller, cors, json } from '../_shared/admin.ts'

const DECISIONS = ['keine', 'verwarnen', '24h', '7tage', 'dauerhaft', 'name']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const user = await caller(req)
  if (!user) return json({ error: 'auth' }, 401)
  let body: Record<string, unknown> = {}
  try {
    const parsed = await req.json()
    if (parsed && typeof parsed === 'object') body = parsed as Record<string, unknown>
  } catch { body = {} }
  const decision = String(body.decision ?? '')
  if (!DECISIONS.includes(decision)) return json({ error: 'decision' }, 400)
  const db = admin()
  const adminRow = await db.from('admins').select('user_id').eq('user_id', user.id).maybeSingle()
  if (!adminRow.data) return json({ error: 'admin' }, 403)
  const applied = await db.rpc('admin_apply', {
    p_admin: user.id,
    p_report: body.report,
    p_decision: decision,
    p_note: typeof body.note === 'string' ? body.note.slice(0, 200) : ''
  })
  return json(applied.data ?? { error: 'apply' })
})
