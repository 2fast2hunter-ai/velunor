import { describe, expect, it } from 'vitest'
import { beginAdventure, loadAdventure, makeMon, takeId, writeSave } from './save'
import { moveToTeam } from './sim'
import { crystalExp } from './shop'
import { TREE_NODES } from './tree'
import { auditSync, allowedGold, expeditionGoldCap } from './online/check'
import { auditFromSave } from './online/snapshot'
import { gameHtml, type CodexQuery, type PcQuery } from './view'
import {
  EXPEDITION_SLOTS,
  HOUR_MS,
  MARK_CAP,
  TIER_EGG,
  ensureExpeditions,
  expeditionDayKey,
  expeditionGold,
  expeditionSlots,
  expeditionTier,
  rollQuests,
  settleExpeditions,
  startExpedition,
  wildGold30
} from './expedition'

const pc: PcQuery = { q: '', type: '', rarity: '', shiny: '', sort: 'newest', dir: -1 }
const dex: CodexQuery = { q: '', type: '', rarity: '', shiny: '' }
const early = Date.parse('2026-11-18T02:59:00Z')
const rolled = Date.parse('2026-11-18T03:00:00Z')

function memory(): Storage {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => { data.set(key, value) },
    removeItem: (key) => { data.delete(key) },
    clear: () => data.clear(),
    key: (index) => [...data.keys()][index] ?? null,
    get length() { return data.size }
  }
}

function park(save: ReturnType<typeof beginAdventure>, speciesId = 'm01'): string {
  const uid = takeId(save)
  save.mons[uid] = makeMon(speciesId, 10, early, 'pc')
  save.pc.push(uid)
  return uid
}

describe('expeditions', () => {
  it('offers three durations, keeps the day stable, and opens the fourth slot from the tree', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', early)
    const first = ensureExpeditions(save, early)
    expect(first.quests.map((quest) => quest.hours).sort()).toEqual([1, 4, 8])
    expect(rollQuests(first.day, first.seed)).toEqual(first.quests)
    expect(expeditionSlots(save)).toBe(EXPEDITION_SLOTS)
    expect(expeditionDayKey(new Date(rolled))).not.toBe(first.day)
    ensureExpeditions(save, rolled)
    expect(save.expeditions?.day).toBe(expeditionDayKey(new Date(rolled)))
    expect(save.expeditions?.quests).not.toEqual(first.quests)
    const uid = [park(save), park(save), park(save), park(save)]
    const overnight = first.quests.find((quest) => quest.hours === 8)
    expect(overnight).toBeTruthy()
    expect(startExpedition(save, overnight?.id ?? '', uid[0], early)).toBeNull()
    const board = ensureExpeditions(save, rolled)
    expect(board.runs).toHaveLength(1)
    expect(startExpedition(save, board.quests[0].id, uid[1], rolled)).toBeNull()
    expect(startExpedition(save, board.quests[1].id, uid[2], rolled)).toBeNull()
    expect(startExpedition(save, board.quests[2].id, uid[3], rolled)).toMatch(/belegt/)
    save.tree = {
      nodes: TREE_NODES.filter((node) => node.branch === 'time').slice(0, 7).map((node) => node.id),
      resetDay: '',
      sealDay: ''
    }
    expect(expeditionSlots(save)).toBe(4)
    expect(startExpedition(save, board.quests[2].id, uid[3], rolled)).toBeNull()
  })

  it('pays scaled loot, blocks the team, survives a restart, and stops marks at 30', () => {
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', early)
    const uid = park(save)
    const state = ensureExpeditions(save, early)
    state.quests[0] = { ...state.quests[0], type: 'water', rarity: 3, hours: 1, place: 'Stillbucht', art: 'expedition/stillbucht' }
    expect(expeditionTier('fire', 0, state.quests[0])).toBe('bronze')
    expect(startExpedition(save, state.quests[0].id, uid, early)).toBeNull()
    expect(moveToTeam(save, uid, null)).toMatch(/Expedition/)
    expect(settleExpeditions(save, early + 30 * 60 * 1000)).toEqual([])
    expect(save.expeditions?.runs).toHaveLength(1)
    const beforeGold = save.gold
    const back = settleExpeditions(save, early + HOUR_MS)
    expect(back).toHaveLength(1)
    expect(back[0].tier).toBe('bronze')
    expect(back[0].gold).toBe(expeditionGold(4, 1, 'bronze'))
    expect(back[0].gold).toBe(wildGold30(4))
    expect(save.gold - beforeGold).toBe(back[0].gold)
    expect(back[0].ep).toBe(Math.floor(crystalExp('s', 10) * 0.25))
    expect(save.bag.crystals.s).toBe(1)
    expect(save.bag.fruits.lern).toBe(1)
    expect(TIER_EGG).toEqual({ bronze: 0.02, silber: 0.04, gold: 0.08 })

    const away = beginAdventure('Bea', { skin: 0, hair: 0, color: 0 }, 'm01', early)
    const traveler = park(away)
    const board = ensureExpeditions(away, early)
    board.quests[0] = { ...board.quests[0], type: 'fire', rarity: 0, hours: 4 }
    expect(expeditionTier('fire', 0, board.quests[0])).toBe('gold')
    expect(startExpedition(away, board.quests[0].id, traveler, early)).toBeNull()
    const store = memory()
    writeSave(store, away)
    const soon = loadAdventure(store, early + HOUR_MS)
    expect(soon?.expeditions?.runs).toHaveLength(1)
    const home = loadAdventure(store, early + 4 * HOUR_MS)
    expect(home?.expeditions?.runs).toEqual([])
    expect(home?.bag.crystals.m).toBe(1)
    expect((home?.marks ?? 0)).toBeLessThanOrEqual(MARK_CAP)

    const capped = beginAdventure('Cleo', { skin: 0, hair: 0, color: 0 }, 'm01', early)
    const walker = park(capped)
    const jobs = ensureExpeditions(capped, early)
    jobs.runs.push({
      questId: 'cap',
      uid: walker,
      startedAt: early - 8 * HOUR_MS,
      hours: 8,
      type: 'fire',
      rarity: 0,
      place: 'Glutkessel',
      art: 'expedition/glutkessel'
    })
    const paid = settleExpeditions(capped, early)
    expect(paid[0].marks).toBe(MARK_CAP)
    expect(capped.marks).toBe(MARK_CAP)
    jobs.runs.push({
      questId: 'cap-2',
      uid: walker,
      startedAt: early - 8 * HOUR_MS,
      hours: 8,
      type: 'fire',
      rarity: 0,
      place: 'Glutkessel',
      art: 'expedition/glutkessel'
    })
    expect(settleExpeditions(capped, early + 1000)[0]?.marks ?? 0).toBe(0)
    expect(capped.marks).toBe(MARK_CAP)
  })

  it('lets sync-check accept one expedition day and shows the card without a network', () => {
    const now = rolled
    const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', now)
    const before = auditFromSave(save)
    const cap = expeditionGoldCap(1, 1)
    const room = allowedGold(60_000, 1, 1)
    save.gold += cap + room
    const after = auditFromSave(save)
    const accepted = auditSync(before, after, 60_000, 0, now)
    expect(accepted.flag).toBe(0)
    expect(after.expeditionGoldLeft).toBe(0)
    const again = auditFromSave(save)
    again.gold += room * 3
    expect(auditSync(after, again, 60_000, 0, now).flag).toBe(2)
    ensureExpeditions(save, now)
    const html = gameHtml(save, 'expedition', now, pc, dex, null, false, false, null)
    expect(html).toContain('data-art="expedition/')
    expect(html).toContain('2 %')
    expect(html).toContain('8 %')
    expect(html).toContain('tier-bronze')
  })
})
