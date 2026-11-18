import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { beginAdventure } from '../save'
import { gameHtml, type CodexQuery, type PcQuery } from '../view'

function text(path: string): string {
  return readFileSync(path, 'utf8')
}

describe('privacy drafts', () => {
  const policy = text('docs/datenschutz.md')
  const page = text('public/datenschutz.html')
  const wipe = text('public/loeschen.html')
  const drafts = [policy, page, wipe, text('store/texte/lang-de.md'), text('store/texte/altersfreigabe.md'), text('store/texte/datensicherheit.md')]

  it('names the real host, the placeholder and the facts the code actually keeps', () => {
    for (const body of [policy, page]) {
      expect(body).toContain('https://psbouhfgvsygadihwtdk.supabase.co')
      expect(body).toContain('Frankfurt')
      expect(body).toContain('[VON FABIAN-NOEL AUSZUFÜLLEN]')
      expect(body).toContain('[ANNAHME]')
      expect(body).toContain('[rechtlich prüfen lassen]')
      expect(body).toContain('Geburtsjahr wird nicht gespeichert')
      expect(body).toContain('nur mit Einwilligung')
      expect(body).toContain('Keine Käufe')
      expect(body).toContain('Art. 6 Abs. 1 lit. b')
      expect(body).toContain('lit. f')
    }
    expect(wipe).toContain('/functions/v1/delete-account')
    expect(wipe).toContain('https://psbouhfgvsygadihwtdk.supabase.co')
    expect(wipe).toContain('create_user: false')
    expect(wipe).toContain('LÖSCHEN')
    expect(wipe).toContain('keinen Konto-Code')
  })

  it('stays on our own hosts and does not borrow other games', () => {
    for (const body of [...drafts, text('store/texte/lang-en.md'), text('store/texte/kurz-de.txt'), text('store/texte/kurz-en.txt')]) {
      const lower = body.toLowerCase()
      expect(lower).not.toContain('pokemon')
      expect(lower).not.toContain('pokémon')
      expect(lower).not.toContain('bannsiegel')
      expect(lower).not.toContain('esm.sh')
      expect(lower).not.toContain('googletagmanager')
    }
    const hosts = wipe.match(/https:\/\/[a-z0-9.-]+/g) ?? []
    expect(hosts.every((host) => host === 'https://psbouhfgvsygadihwtdk.supabase.co')).toBe(true)
  })

  it('keeps the store copy inside the character limits', () => {
    const de = text('store/texte/kurz-de.txt').trim()
    const en = text('store/texte/kurz-en.txt').trim()
    expect(de.length).toBeLessThanOrEqual(80)
    expect(en.length).toBeLessThanOrEqual(80)
    expect(de).toContain('Keine Käufe')
    expect(en).toContain('No purchases')
    const longDe = text('store/texte/lang-de.md')
    const longEn = text('store/texte/lang-en.md')
    expect(longDe.length).toBeLessThanOrEqual(4000)
    expect(longEn.length).toBeLessThanOrEqual(4000)
    expect(longDe).toContain('Online-Funktionen erfordern eine Internetverbindung')
    expect(longEn).toContain('Online features require an internet connection')
  })

  it('links privacy, deletion and the save export from options', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    const pc: PcQuery = { q: '', type: '', rarity: '', shiny: '', sort: 'newest', dir: -1 }
    const dex: CodexQuery = { q: '', type: '', rarity: '', shiny: '' }
    const html = gameHtml(save, 'options', 1_000, pc, dex, null, false, false, null)
    expect(html).toContain('href="datenschutz.html"')
    expect(html).toContain('href="loeschen.html"')
    expect(html).toContain('data-act="export-save"')
    expect(html).toContain('Speicherstand exportieren')
  })
})
