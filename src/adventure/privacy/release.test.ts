import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('release checklist and tag workflow', () => {
  const list = readFileSync('docs/release-checkliste.md', 'utf8')
  const workflow = readFileSync('.github/workflows/release.yml', 'utf8')

  it('tells Fabian-Noel what only he can do', () => {
    expect(list).toContain('Google Play')
    expect(list).toContain('25 $')
    expect(list).toContain('Apple Developer')
    expect(list).toContain('99 $')
    expect(list).toContain('[Preise vor Entscheidung prüfen]')
    expect(list).toContain('VITE_SUPABASE_URL')
    expect(list).toContain('VITE_SUPABASE_KEY')
    expect(list).toContain('kein Projekt angelegt')
    expect(list).toContain('DPA')
    expect(list).toContain('public.admins')
    expect(list).toContain('[rechtlich prüfen lassen]')
    expect(list).toContain('[VON FABIAN-NOEL AUSZUFÜLLEN]')
    expect(list).toContain('Testgruppe')
    expect(list).toContain('altersfreigabe.md')
    expect(list).toContain('Block A')
    expect(list).toContain('Block O')
    expect(list).toContain('Block MP')
    expect(list).toContain('Block C')
  })

  it('builds unsigned artifacts from a version tag and reads no secrets', () => {
    expect(workflow).toContain("tags:")
    expect(workflow).toContain("- 'v*'")
    expect(workflow).toContain('runs-on: macos-latest')
    expect(workflow).toContain('assembleDebug bundleRelease')
    expect(workflow).toContain('CODE_SIGNING_ALLOWED=NO')
    expect(workflow).toContain('velunor-debug-apk')
    expect(workflow).toContain('velunor-unsigned-aab')
    expect(workflow).toContain('velunor-ios-simulator')
    expect(workflow).toContain('vars.VITE_SUPABASE_URL')
    expect(workflow).toContain('vars.VITE_SUPABASE_KEY')
    expect(workflow).not.toContain('secrets.')
    expect(workflow.toLowerCase()).not.toContain('keystore')
    expect(workflow.toLowerCase()).not.toContain('play store')
  })
})
