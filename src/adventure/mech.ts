/** B5. Fixed per guardian. Nothing here is rolled per fight. */
export const MECHS = ['panzerung', 'wut', 'beistand', 'puls', 'spiegel'] as const
export type MechId = (typeof MECHS)[number]
export type BossKind = 'guardian' | 'council' | 'beast'

export const ARMOR_CUT = 0.3
export const ARMOR_CRITS = 3
export const RAGE_HP = 0.4
export const RAGE_MULT = 1.5
/** "Ab 60 %" reads like "ab Lv 25": the helper acts while HP is still at least 60 %. */
export const AIDE_HP = 0.6
export const AIDE_EVERY = 4
export const AIDE_ATK = 0.4
export const PULSE_EVERY = 5
export const PULSE_MULT = 0.6
export const MIRROR = 0.2

const NAMES: Record<MechId, string> = {
  panzerung: 'Panzerung',
  wut: 'Wut',
  beistand: 'Beistand',
  puls: 'Puls',
  spiegel: 'Spiegel'
}

const TIPS: Record<MechId, string> = {
  panzerung: 'Schaden −30 %, bis 3 Krits',
  wut: 'unter 40 % HP Angriffe ×1,5',
  beistand: 'Helfer ab 60 % HP, alle 4 Angriffe',
  puls: 'alle 5 Angriffe ein Zusatztreffer',
  spiegel: '20 % zurück, nicht bei Ult'
}

export function mechName(id: MechId): string {
  return NAMES[id]
}

export function mechTip(id: MechId): string {
  return TIPS[id]
}

export function mechIcon(id: MechId): string {
  return `battle/mech_${id}_64.png`
}

function hashKey(key: string): number {
  let hash = 2166136261
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** One mechanic for a warden. Two different ones for a council member or a world beast. */
export function assignMechs(kind: BossKind, key: string): MechId[] {
  const first = hashKey(`${kind}:${key}`) % MECHS.length
  if (kind === 'guardian') return [MECHS[first]]
  const second = (first + 2) % MECHS.length
  return [MECHS[first], MECHS[second]]
}

export function guardianAssignment(badge: string, name: string, special: boolean): MechId[] {
  if (special) return assignMechs('beast', `beast:${name}`)
  return assignMechs('guardian', `guard:${badge || name}`)
}

export function councilAssignment(memberId: string): MechId[] {
  return assignMechs('council', `council:${memberId}`)
}
