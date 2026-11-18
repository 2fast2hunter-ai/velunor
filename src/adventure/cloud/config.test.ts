import { describe, expect, it } from 'vitest'
import { LIVE_SUPABASE_PUBLISHABLE_KEY, LIVE_SUPABASE_URL, resolveSupabase } from './config'

describe('supabase build target', () => {
  it('keeps the Frankfurt project when no test variables are set', () => {
    expect(resolveSupabase(undefined, undefined)).toEqual({
      url: LIVE_SUPABASE_URL,
      key: LIVE_SUPABASE_PUBLISHABLE_KEY
    })
    expect(resolveSupabase('  ', '')).toEqual({
      url: LIVE_SUPABASE_URL,
      key: LIVE_SUPABASE_PUBLISHABLE_KEY
    })
    expect(LIVE_SUPABASE_URL).toBe('https://psbouhfgvsygadihwtdk.supabase.co')
  })

  it('switches only when both the url and the publishable key are set', () => {
    expect(resolveSupabase('https://example.supabase.co', 'sb_publishable_test')).toEqual({
      url: 'https://example.supabase.co',
      key: 'sb_publishable_test'
    })
    expect(() => resolveSupabase('https://example.supabase.co', '')).toThrow(/both/)
    expect(() => resolveSupabase('', 'sb_publishable_test')).toThrow(/both/)
    expect(() => resolveSupabase('http://example.supabase.co', 'sb_publishable_test')).toThrow(/https/)
  })
})
