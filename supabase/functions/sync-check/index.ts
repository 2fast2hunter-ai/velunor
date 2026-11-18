import { auditSync, type AuditState } from '../../../src/adventure/online/check.ts'
import { auditFromSave } from '../../../src/adventure/online/snapshot.ts'
import type { SaveV2 } from '../../../src/adventure/types.ts'
import { admin, caller, cors, json } from '../_shared/admin.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const user = await caller(req)
  if (!user) return json({ error: 'auth' }, 401)
  const db = admin()
  const saved = await db.from('saves').select('save_json').eq('user_id', user.id).maybeSingle()
  if (saved.error || !saved.data?.save_json) return json({ flag: 0, reasons: [] })
  let after: AuditState
  try {
    after = auditFromSave(saved.data.save_json as SaveV2)
  } catch {
    return json({ error: 'save' }, 400)
  }
  const profile = await db.from('profiles').select('last_audit').eq('user_id', user.id).maybeSingle()
  const before = (profile.data?.last_audit ?? null) as AuditState | null
  const verdict = auditSync(before, after)
  await db.from('profiles').upsert({
    user_id: user.id,
    flag_level: verdict.flag,
    last_audit: after,
    updated_at: new Date().toISOString()
  })
  const known = new Set((before?.mons ?? []).map((mon) => mon.uid))
  const fresh = after.mons.filter((mon) => !known.has(mon.uid) && ['Truhe', 'Splitter', 'Ei', 'Rad', 'Tausch'].includes(mon.obtainedHow))
  if (fresh.length) {
    await db.from('monsters_owned').upsert(fresh.map((mon) => ({
      uid: mon.uid,
      owner: user.id,
      species: mon.species,
      level: mon.level,
      rarity: mon.rarity,
      schimmer: mon.schimmer,
      obtained_at: new Date(mon.obtainedAt).toISOString(),
      obtained_how: mon.obtainedHow,
      trade_lock_until: null,
      trade_count: 0
    })), { onConflict: 'owner,uid' })
  }
  return json(verdict)
})
