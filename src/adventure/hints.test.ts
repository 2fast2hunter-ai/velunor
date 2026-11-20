import { describe, expect, it } from 'vitest'
import { beginAdventure } from './save'
import { dueHint, goalLine, HINT_GAP_MS } from './hints'
import { gameHtml, type CodexQuery, type PcQuery } from './view'

const pc: PcQuery = { q: '', type: '', rarity: '', shiny: '', sort: 'newest', dir: -1 }
const dex: CodexQuery = { q: '', type: '', rarity: '', shiny: '' }

function fresh() {
  const save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', 1_000)
  save.onboarding = { v: 1, done: false, seen: [], sent: [], hintsOff: false, lastHintAt: 0 }
  return save
}

describe('goal and hints', () => {
  it('shows exactly one goal', () => {
    const save = fresh()
    expect(goalLine(save, 'Wiesenpfad').key).toBe('goal.win')
    save.stats.wins = 1
    save.chests.kiesel = 2
    expect(goalLine(save, 'Wiesenpfad').key).toBe('goal.chest')
    save.stats.chestsOpened = 1
    save.team = ['a', 'b']
    save.step = 3
    expect(goalLine(save, 'Wiesenpfad').key).toBe('goal.spring')
    save.step = 20
    save.region = 2
    expect(goalLine(save, 'Bachufer').key).toBe('goal.next')
  })

  it('waits 90 seconds, stays quiet in a focus fight, and lets veterans see one sys hint', () => {
    const save = fresh()
    const now = 10_000
    expect(dueHint(save, now, false)?.id).toBe('speed')
    save.onboarding!.lastHintAt = now
    expect(dueHint(save, now + HINT_GAP_MS - 1, false)).toBeNull()
    expect(dueHint(save, now + HINT_GAP_MS, false)?.id).toBe('speed')
    expect(dueHint(save, now + HINT_GAP_MS, true)).toBeNull()
    save.onboarding!.hintsOff = true
    expect(dueHint(save, now + HINT_GAP_MS, false)).toBeNull()
    save.onboarding!.hintsOff = false
    save.onboarding!.done = true
    expect(dueHint(save, now + HINT_GAP_MS, false)).toBeNull()
    const sys = dueHint(save, now + HINT_GAP_MS, false, [{ id: 'sys:season', key: 'hint.speed', audience: 'sys' }])
    expect(sys?.id).toBe('sys:season')
    save.onboarding!.seen = ['sys:season']
    expect(dueHint(save, now + HINT_GAP_MS, false, [{ id: 'sys:season', key: 'hint.speed', audience: 'sys' }])).toBeNull()
  })

  it('paints one goal and a hint, and hides the hint during a focus fight', () => {
    const save = fresh()
    const road = gameHtml(save, 'adventure', 1_000, pc, dex, null, false, false, null)
    expect(road).toContain('id="goal-chip"')
    expect(road).toContain('Gewinne deinen ersten Kampf')
    expect(road).toContain('id="hint-bubble"')
    expect(road).toContain('Tippe ×2')
    const focus = gameHtml(save, 'adventure', 1_000, pc, dex, null, false, false, null, save.step, undefined, { focusFight: true })
    expect(focus).toContain('id="goal-chip"')
    expect(focus).not.toContain('id="hint-bubble"')
    const options = gameHtml(save, 'options', 1_000, pc, dex, null, false, false, null)
    expect(options).toContain('data-field="hints"')
    expect(options).toContain('Hinweise aus')
  })
})
