import { nameIssue, pickTag, planNameSave, publicLabel } from '../../../src/adventure/online/name.ts'
import { admin, caller, cors, json } from '../_shared/admin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const user = await caller(req)
  if (!user) return json({ error: 'auth' }, 401)
  const body = await req.json().catch(() => ({})) as { name?: string }
  const issue = nameIssue(String(body.name ?? ''))
  if (issue) return json({ error: issue }, 400)
  const name = String(body.name).trim()
  const db = admin()
  const existing = await db.from('player_names').select('name, tag, hidden, changed_at').eq('user_id', user.id).maybeSingle()
  const row = existing.data
  const plan = planNameSave(row ? {
    name: String(row.name),
    tag: String(row.tag),
    hidden: Boolean(row.hidden),
    changedAt: Date.parse(String(row.changed_at))
  } : null, name, Date.now())
  if (!plan.ok) return json({ error: plan.error }, 400)
  let tag = row?.tag ?? ''
  if (!row || row.name !== name) {
    const taken = await db.from('player_names').select('tag').eq('name', name).neq('user_id', user.id)
    const tags = (taken.data ?? []).map((item) => String(item.tag))
    if (row && !tags.includes(row.tag)) tag = row.tag
    else {
      const next = pickTag(tags, Math.random)
      if (!next) return json({ error: 'taken' }, 409)
      tag = next
    }
  }
  const display = publicLabel(name, tag, plan.hidden)
  const { error } = await db.from('player_names').upsert({
    user_id: user.id,
    name,
    tag,
    display,
    hidden: plan.hidden,
    changed_at: new Date().toISOString()
  })
  if (error) return json({ error: 'taken' }, 409)
  return json({ label: display })
})
