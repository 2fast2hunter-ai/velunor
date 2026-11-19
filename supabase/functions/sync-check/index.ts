import { stickAudit, type AuditState } from '../../../src/adventure/online/check.ts'
import { auditFromSave, emptyAudit } from '../../../src/adventure/online/snapshot.ts'
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
  const profile = await db.from('profiles').select('last_audit, flag_level, audited_at, updated_at, audit_generation, bonus_gold').eq('user_id', user.id).maybeSingle()
  const before = (profile.data?.last_audit ?? null) as AuditState | null
  const previousFlag = profile.data?.flag_level === 2 ? 2 : profile.data?.flag_level === 1 ? 1 : 0
  const auditedAt = Date.parse(String(profile.data?.audited_at ?? profile.data?.updated_at ?? ''))
  const authUser = await db.auth.admin.getUserById(user.id)
  const createdAt = Date.parse(String(authUser.data.user?.created_at ?? ''))
  const accountAge = Number.isFinite(createdAt) ? Math.max(0, Date.now() - createdAt) : 0
  const elapsed = before && Number.isFinite(auditedAt) ? Date.now() - auditedAt : accountAge
  const baseline = before ?? emptyAudit(Date.now() - elapsed)
  const bonusNow = Number(profile.data?.bonus_gold) || 0
  after.bonusGold = bonusNow
  const bonusGold = Math.max(0, bonusNow - Number(before?.bonusGold ?? 0))
  const stuck = stickAudit(previousFlag, baseline, after, elapsed, bonusGold)
  const nowIso = new Date().toISOString()
  const generation = Number(profile.data?.audit_generation) || 0
  if (!profile.data) {
    await db.from('profiles').insert({
      user_id: user.id,
      flag_level: stuck.flag,
      last_audit: stuck.audit,
      audited_at: nowIso,
      audit_generation: stuck.advanceClock ? 1 : 0,
      updated_at: nowIso
    })
  } else if (!stuck.advanceClock) {
    await db.from('profiles').update({ flag_level: stuck.flag, updated_at: nowIso }).eq('user_id', user.id)
  } else {
    await db.from('profiles').update({
      flag_level: stuck.flag,
      last_audit: stuck.audit,
      audited_at: nowIso,
      audit_generation: generation + 1,
      updated_at: nowIso
    }).eq('user_id', user.id)
  }
  const known = new Set((before?.mons ?? []).map((mon) => mon.uid))
  const fresh = stuck.advanceClock ? after.mons.filter((mon) => !known.has(mon.uid) && ['Truhe', 'Splitter', 'Ei', 'Rad', 'Tausch'].includes(mon.obtainedHow)) : []
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
  return json({ flag: stuck.flag, reasons: stuck.reasons })
})
