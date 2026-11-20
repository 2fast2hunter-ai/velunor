import { species } from '../../data'
import type { EncounterOutcome } from '../sim'
import type { SaveV2 } from '../types'
import type { AnalyticsEvent } from './analytics'

const SPECIES_ID = /^m\d{2,3}$/
const CHEST_TIER = new Set(['kiesel', 'silber', 'gold', 'sternen'])

export function shardGains(before: Record<string, number>, after: Record<string, number>): { species: string; amount: number }[] {
  const gains: { species: string; amount: number }[] = []
  for (const [id, amount] of Object.entries(after)) {
    if (!SPECIES_ID.test(id)) continue
    const gain = Math.floor(amount) - Math.floor(before[id] ?? 0)
    if (gain > 0) gains.push({ species: id, amount: gain })
  }
  return gains
}

export function teamProfile(save: SaveV2): { teamLevel: number; rarityAvg: number } {
  const mons = save.team.map((id) => save.mons[id]).filter((mon) => Boolean(mon))
  if (!mons.length) return { teamLevel: 0, rarityAvg: 0 }
  const level = mons.reduce((sum, mon) => sum + (Math.floor(mon.lvl) || 0), 0) / mons.length
  let rarity = 0
  let counted = 0
  for (const mon of mons) {
    try {
      rarity += species(mon.species).baseRarity
      counted += 1
    } catch {
      /* an unknown species does not enter the average */
    }
  }
  return {
    teamLevel: Math.round(level),
    rarityAvg: counted ? Math.round((rarity / counted) * 10) / 10 : 0
  }
}

/** Live encounters only. Offline catch-up stays in the save and is not one event per node. */
export function eventsForEncounter(input: {
  outcome: Pick<EncounterOutcome, 'kind' | 'step' | 'win'> & { unlock?: string }
  region: number
  chapter: number
  teamLevel: number
  rarityAvg: number
  shardsBefore: Record<string, number>
  shardsAfter: Record<string, number>
}): AnalyticsEvent[] {
  const events: AnalyticsEvent[] = []
  const region = Math.floor(input.region)
  const chapter = Math.floor(input.chapter)
  const node = Math.floor(input.outcome.step)
  if (input.outcome.kind === 'wild' || input.outcome.kind === 'trainer') {
    events.push({
      event: input.outcome.win ? 'stage_clear' : 'stage_fail',
      props: { region, chapter, node }
    })
  } else if (input.outcome.kind === 'guardian') {
    events.push({
      event: input.outcome.win ? 'guardian_win' : 'guardian_fail',
      props: {
        region,
        chapter,
        team_level: input.teamLevel,
        rarity_avg: input.rarityAvg
      }
    })
  }
  for (const drop of shardGains(input.shardsBefore, input.shardsAfter)) {
    events.push({ event: 'shard_drop', props: { speciesId: drop.species, amount: drop.amount, source: 'wild' } })
  }
  const unlocked = input.outcome.unlock
  if (typeof unlocked === 'string' && SPECIES_ID.test(unlocked)) {
    events.push({ event: 'species_unlock', props: { speciesId: unlocked, via: 'splitter' } })
  }
  return events
}

export interface LootOpen {
  speciesId: string
  rarity: number
  isNew: boolean
  pityHit?: boolean
}

export function eventsForLoot(tier: string, grants: readonly LootOpen[], before: Record<string, number>, after: Record<string, number>): AnalyticsEvent[] {
  const events: AnalyticsEvent[] = []
  if (CHEST_TIER.has(tier)) {
    for (const grant of grants) {
      events.push({
        event: 'chest_open',
        props: {
          tier,
          rarity: Math.max(0, Math.floor(grant.rarity)),
          isNew: Boolean(grant.isNew),
          pityHit: Boolean(grant.pityHit)
        }
      })
      if (grant.isNew && SPECIES_ID.test(grant.speciesId)) {
        events.push({ event: 'species_unlock', props: { speciesId: grant.speciesId, via: 'chest' } })
      }
    }
  }
  for (const drop of shardGains(before, after)) {
    events.push({ event: 'shard_drop', props: { speciesId: drop.species, amount: drop.amount, source: 'duplicate' } })
  }
  return events
}

export function unlockEvent(speciesId: string, via: 'chest' | 'splitter' | 'workshop'): AnalyticsEvent | null {
  if (!SPECIES_ID.test(speciesId)) return null
  return { event: 'species_unlock', props: { speciesId, via } }
}

export function starEvent(speciesId: string, star: number): AnalyticsEvent | null {
  if (!SPECIES_ID.test(speciesId)) return null
  const rank = Math.floor(star)
  if (rank < 1 || rank > 5) return null
  return { event: 'star_up', props: { species: speciesId, star: rank } }
}
