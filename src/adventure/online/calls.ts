import { supabaseClient } from '../cloud/supabaseApi'
import { reportReason } from './report'

/** Keys removed after account deletion. The auth token lives under sb-. */
export function clearVelunorKeys(keys: readonly string[]): string[] {
  return keys.filter((key) => key.startsWith('velunor_') || key.startsWith('sb-'))
}

export interface OnlineCall {
  ok: boolean
  missing: boolean
  error: string
  data: Record<string, unknown>
}

/** Read `{ error }` from a non-2xx function response. A network failure stays "missing". */
export async function functionFailure(error: { message?: string, context?: unknown }): Promise<{ missing: boolean, error: string }> {
  const context = error.context
  if (context && typeof context === 'object' && 'json' in context && typeof (context as { json: () => Promise<unknown> }).json === 'function') {
    try {
      const body = await (context as { json: () => Promise<unknown> }).json()
      if (body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string') {
        return { missing: false, error: (body as { error: string }).error }
      }
    } catch {
      /* The body was not JSON. Fall through to the transport error. */
    }
  }
  return { missing: true, error: error.message ?? 'Netz' }
}

/** A missing function is not a crash. The caller keeps the local game and says the area is unavailable. */
export async function callOnline(name: string, body: unknown): Promise<OnlineCall> {
  try {
    const { data, error } = await supabaseClient().functions.invoke(name, { body: body as Record<string, unknown> })
    if (error) {
      const failure = await functionFailure(error)
      return { ok: false, missing: failure.missing, error: failure.error, data: {} }
    }
    const row = data && typeof data === 'object' ? data as Record<string, unknown> : {}
    if (row.error) return { ok: false, missing: false, error: String(row.error), data: row }
    return { ok: true, missing: false, error: '', data: row }
  } catch (err) {
    return { ok: false, missing: true, error: err instanceof Error ? err.message : 'Netz', data: {} }
  }
}

async function userId(): Promise<string | null> {
  try {
    const { data } = await supabaseClient().auth.getSession()
    return data.session?.user.id ?? null
  } catch {
    return null
  }
}

export async function sendReportRow(target: string, reason: string): Promise<OnlineCall> {
  if (!reportReason(reason)) return { ok: false, missing: false, error: 'reason', data: {} }
  const id = await userId()
  if (!id) return { ok: false, missing: true, error: 'offline', data: {} }
  const { error } = await supabaseClient().from('reports').insert({ reporter: id, target_label: target, reason })
  if (error) return { ok: false, missing: true, error: error.message, data: {} }
  return { ok: true, missing: false, error: '', data: {} }
}

export async function loadOwnLabel(): Promise<string | null> {
  const id = await userId()
  if (!id) return null
  const { data, error } = await supabaseClient().from('player_names').select('display').eq('user_id', id).maybeSingle()
  if (error || !data || typeof data.display !== 'string' || !data.display) return null
  return data.display
}

export async function sendBlockRow(target: string): Promise<OnlineCall> {
  const id = await userId()
  if (!id) return { ok: false, missing: true, error: 'offline', data: {} }
  const { error } = await supabaseClient().from('blocks').insert({ owner: id, label: target })
  if (error) return { ok: false, missing: true, error: error.message, data: {} }
  return { ok: true, missing: false, error: '', data: {} }
}
