import { describe, expect, it } from 'vitest'
import { species } from '../data'
import { nextFloat } from '../rng'
import { beginAdventure } from './save'
import { takeChests } from './chests'
import { chestStateOf, effectiveTable, enteredRegions, formatPercent, openChest, poolFor } from './lootbox'
import file from '../../data/lootbox.json'
import { chestLessonOpen, showChestArrow, showJetztDu, CHEST_SEEN } from './chestLesson'
import { gameHtml, type CodexQuery, type PcQuery } from './view'
import { t } from './i18n'

const pc: PcQuery = { q: '', type: '', rarity: '', shiny: '', sort: 'newest', dir: -1 }
const dex: CodexQuery = { q: '', type: '', rarity: '', shiny: '' }

const look = { skin: 0, hair: 0, color: 0 }

describe('first chest', () => {
  it('is a new species of the rolled rarity in 100 seeds, and the second chest matches a normal open', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const save = beginAdventure('Ada', look, 'm01', 1_000)
      save.rng = seed
      const owned = chestStateOf(save)
      const probe = { seed }
      const plain = openChest('kiesel', owned, () => nextFloat(probe))
      save.rng = seed
      const first = takeChests(save, 'kiesel', 1, 1_000)[0]
      expect(first.isNew, `seed ${seed}`).toBe(true)
      expect(first.rarity, `seed ${seed}`).toBe(plain.rarity)
      expect(species(first.speciesId).baseRarity, `seed ${seed}`).toBe(first.rarity)
      expect(owned.ownedSpecies.includes(first.speciesId), `seed ${seed}`).toBe(false)
      if (plain.isNew) expect(first.speciesId, `seed ${seed}`).toBe(plain.speciesId)

      const again = chestStateOf(save)
      const before = save.rng
      const replay = { seed: before }
      const expected = openChest('kiesel', again, () => nextFloat(replay))
      const second = takeChests(save, 'kiesel', 1, 1_000)[0]
      expect(second.speciesId, `seed ${seed}`).toBe(expected.speciesId)
      expect(second.rarity, `seed ${seed}`).toBe(expected.rarity)
      expect(second.isNew, `seed ${seed}`).toBe(expected.isNew)
    }
  })

  it('shows three short cards, the arrow, then Jetzt du, and the real kiesel rates', () => {
    const save = beginAdventure('Ada', look, 'm01', 1_000)
    expect(chestLessonOpen(save)).toBe(true)
    expect(showChestArrow(save, 'adventure')).toBe(true)
    expect(showChestArrow(save, 'activities')).toBe(false)
    const html = gameHtml(save, 'activities', 1_000, pc, dex, null, false, false, null, save.step, { tab: 'chests', mult: 1, symbols: null, note: '' }, { chestCard: 0 })
    expect(html).toContain('data-card="0"')
    expect(html).toContain('data-act="chest-lesson"')
    expect(html).toContain(t('de', 'chest.card.1'))
    const road = gameHtml(save, 'adventure', 1_000, pc, dex, null, false, false, null)
    expect(road).toContain('chest-arrow')
    for (const key of ['chest.card.1', 'chest.card.2', 'chest.card.3']) {
      expect(t('de', key).length).toBeLessThanOrEqual(72)
      expect(t('en', key).length).toBeLessThanOrEqual(72)
    }
    save.onboarding!.seen = [CHEST_SEEN]
    save.stats.chestsOpened = 1
    expect(showJetztDu(save)).toBe(true)
    const you = gameHtml(save, 'activities', 1_000, pc, dex, null, false, false, null, save.step, { tab: 'chests', mult: 1, symbols: null, note: '' })
    expect(you).toContain(t('de', 'chest.you'))
    expect(you).not.toContain('chest-lesson')
    expect(file.tiers.kiesel.rates).toEqual([45, 30, 15, 7, 2.5, 0.5, 0, 0, 0, 0])
    const sheet = gameHtml(save, 'activities', 1_000, pc, dex, null, false, false, { kind: 'chest-rates', tier: 'kiesel' }, save.step, { tab: 'chests', mult: 1, symbols: null, note: '' })
    const table = effectiveTable('kiesel', poolFor(enteredRegions(save)))
    for (const row of table) expect(sheet).toContain(`data-rate="${row.rarity}">${formatPercent(row.percent)} %`)
  })
})
