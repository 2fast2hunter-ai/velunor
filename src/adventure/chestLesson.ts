import { ONBOARDING_V1 } from './onboarding'
import type { SaveV2 } from './types'

/** Stored once the three cards are finished or skipped. */
export const CHEST_SEEN = 'chest:cards'

export const CHEST_CARD_COUNT = 3

function freshPlayer(save: SaveV2): boolean {
  return ONBOARDING_V1 && save.onboarding?.done !== true
}

/** The three cards, until the first chest is opened or the cards are dismissed. */
export function chestLessonOpen(save: SaveV2): boolean {
  if (!freshPlayer(save)) return false
  if ((save.stats?.chestsOpened ?? 0) > 0) return false
  if (save.onboarding?.seen.includes(CHEST_SEEN)) return false
  return (save.chests?.kiesel ?? 0) > 0
}

/** Arrow on Aktivitäten while the cards are still waiting. */
export function showChestArrow(save: SaveV2, screen: string): boolean {
  return chestLessonOpen(save) && screen !== 'activities'
}

/** The second chest, after the cards, opened by the player. */
export function showJetztDu(save: SaveV2): boolean {
  if (!freshPlayer(save)) return false
  if (!save.onboarding?.seen.includes(CHEST_SEEN)) return false
  return (save.stats?.chestsOpened ?? 0) === 1 && (save.chests?.kiesel ?? 0) > 0
}
