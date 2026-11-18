/** Ids only, so a save can check a choice without loading the fight math. */
export const SYNERGY_IDS = [
  'gewitter',
  'flaechenbrand',
  'wurzelgrund',
  'polarstrom',
  'bollwerk',
  'prisma',
  'zwielicht',
  'rudelkraft',
  'schwarmgift',
  'resonanz',
  'glutschwinge',
  'sturmlied'
] as const

export const SYNERGY_CAP = 2

const KNOWN = new Set<string>(SYNERGY_IDS)

export function synergyKnown(id: string): boolean {
  return KNOWN.has(id)
}
