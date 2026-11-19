import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import regions from '../../data/regions.json'
import { CREST_ART, crestArt } from './crestArt'
import { RESEARCH_LINES } from './research'
import { beginAdventure } from './save'
import { TREE_NODES } from './tree'
import { gameHtml, type CodexQuery, type PcQuery } from './view'

const pc: PcQuery = { q: '', type: '', rarity: '', shiny: '', sort: 'newest', dir: -1 }
const dex: CodexQuery = { q: '', type: '', rarity: '', shiny: '' }

describe('crest art', () => {
  it('maps every guardian badge to a shipped crest and falls back when the name is unknown', () => {
    const badges = regions.regions.flatMap((region) => region.chapters.map((chapter) => chapter.guardian.badge)).filter((badge) => badge.length > 0)
    expect(new Set(badges).size).toBe(45)
    for (const badge of badges) {
      const file = crestArt(badge)
      expect(file.startsWith('crests/')).toBe(true)
      expect(existsSync(`public/assets/${file}`)).toBe(true)
      expect(existsSync(`public/assets/${file.replace('.webp', '@2x.webp')}`)).toBe(true)
    }
    expect(Object.keys(CREST_ART)).toHaveLength(45)
    expect(crestArt('')).toBe('ui/achieve.webp')
    expect(crestArt('kein-wappen')).toBe('ui/achieve.webp')
  })

  it('ships the tree nodes and the tower symbols the screens ask for', () => {
    expect(TREE_NODES).toHaveLength(24)
    for (const node of TREE_NODES) expect(existsSync(`public/assets/tree/${node.id}.webp`)).toBe(true)
    expect(RESEARCH_LINES).toHaveLength(6)
    for (const line of RESEARCH_LINES) expect(existsSync(`public/assets/tower/${line}.webp`)).toBe(true)
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
    const map = gameHtml(save, 'adventure', 1_000, pc, dex, null, false, false, null, save.step, undefined, { mapOpen: true })
    expect(map).toContain('crests/kieselwappen.webp')
    expect(map).toContain('class="crest-mini off"')
    const tree = gameHtml(save, 'tree', 1_000, pc, dex, null, false, false, null)
    expect(tree).toContain('tree/chest-1.webp')
    expect(tree).toContain('tree/fight-8.webp')
    expect(tree).toContain('tree/time-8.webp')
    const tower = gameHtml(save, 'tower', 1_000, pc, dex, null, false, false, null)
    expect(tower).toContain('tower/gold.webp')
    expect(tower).toContain('tower/shard.webp')
    const css = readFileSync(new URL('./adventure.css', import.meta.url), 'utf8')
    expect(css).toContain('.crest-mini.off')
    expect(css).toContain('.tree-glyph.off')
  })
})
