import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { SaveV2 } from '../types'
import { anonymousDisabled } from './analytics'
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config'
import type { ProgressScore } from './progress'
import type { CloudApi } from './types'
import type { AnalyticsEvent } from './analytics'

let client: SupabaseClient | null = null

export function supabaseClient(): SupabaseClient {
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'implicit'
      }
    })
  }
  return client
}

function plainSave(save: SaveV2): Record<string, unknown> {
  return JSON.parse(JSON.stringify(save)) as Record<string, unknown>
}

/** Browser client. Anonymous sign-in stays optional: a disabled provider does not throw. */
export function browserCloudApi(): CloudApi {
  const supabase = supabaseClient()
  return {
    async ensureUser() {
      try {
        const existing = await supabase.auth.getSession()
        const session = existing.data.session
        if (session?.user) {
          return { userId: session.user.id, email: session.user.email ?? null, disabled: false, error: null }
        }
        const created = await supabase.auth.signInAnonymously()
        if (created.error || !created.data.user) {
          const message = created.error?.message ?? 'Keine anonyme Sitzung.'
          const code = created.error && 'code' in created.error ? String(created.error.code ?? '') : ''
          return { userId: null, email: null, disabled: anonymousDisabled(message, code), error: message }
        }
        return {
          userId: created.data.user.id,
          email: created.data.user.email ?? null,
          disabled: false,
          error: null
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Netz'
        return { userId: null, email: null, disabled: false, error: message }
      }
    },
    async linkEmail(email, redirectTo) {
      const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: redirectTo })
      return { error: error?.message ?? null }
    },
    async readSave(userId) {
      const { data, error } = await supabase.from('saves').select('save_json, device_id').eq('user_id', userId).maybeSingle()
      if (error) return { ok: false as const, error: error.message }
      if (!data) return { ok: true as const, row: null }
      const row = data as { save_json?: unknown; device_id?: string | null }
      return { ok: true as const, row: { save: row.save_json ?? null, deviceId: row.device_id ?? null } }
    },
    async writeSave(userId, save, progress: ProgressScore, deviceId) {
      const { error } = await supabase.from('saves').upsert({
        user_id: userId,
        save_json: plainSave(save),
        save_version: save.saveVersion,
        progress: { crests: progress.crests, codex: progress.codex, ep: progress.ep },
        device_id: deviceId,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' })
      return { error: error?.message ?? null }
    },
    async deleteSave(userId) {
      const { error } = await supabase.from('saves').delete().eq('user_id', userId)
      return { error: error?.message ?? null }
    },
    async writeEvents(userId, events: AnalyticsEvent[]) {
      if (!events.length) return { error: null }
      const { error } = await supabase.from('events').insert(events.map((event) => ({
        player_id: userId,
        event: event.event,
        props: event.props
      })))
      return { error: error?.message ?? null }
    }
  }
}

/** Fires when a magic link or a fresh anonymous session lands. */
export function watchAuth(onChange: () => void): () => void {
  const { data } = supabaseClient().auth.onAuthStateChange((event, session) => {
    if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && session?.user) onChange()
  })
  return () => {
    data.subscription.unsubscribe()
  }
}
