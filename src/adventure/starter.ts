import typesCfg from '../../data/types.json'
import { species, typeName } from '../data'
import { STARTERS } from './const'
import type { Lang } from './i18n'
import { typeLabel } from './i18n'
import type { TypeId } from '../types'

export interface StarterBars {
  hp: number
  atk: number
  spd: number
}

/** Bars are the three starters' base stats, each divided by the highest of the three. */
export function starterBars(id: string): StarterBars {
  const rows = STARTERS.map((starter) => species(starter.id).base)
  const row = species(id).base
  const top = {
    hp: Math.max(...rows.map((base) => base.hp)),
    atk: Math.max(...rows.map((base) => base.atk)),
    spd: Math.max(...rows.map((base) => base.spd))
  }
  return {
    hp: top.hp > 0 ? row.hp / top.hp : 0,
    atk: top.atk > 0 ? row.atk / top.atk : 0,
    spd: top.spd > 0 ? row.spd / top.spd : 0
  }
}

export function strongTypes(id: TypeId): TypeId[] {
  return (typesCfg.strongAgainst[id] ?? []) as TypeId[]
}

export function weakTypes(id: TypeId): TypeId[] {
  return (Object.keys(typesCfg.strongAgainst) as TypeId[]).filter((other) => other !== id && (typesCfg.strongAgainst[other] as string[]).includes(id))
}

export function typeList(lang: Lang, ids: TypeId[]): string {
  return ids.map((id) => typeLabel(lang, id, typeName(id))).join(', ')
}

export const STARTER_ART: Record<string, { frame: string; type: string; role: string }> = {
  m01: { frame: 'home/card_frame_fire.png', type: 'home/type_fire.png', role: 'home/role_back.png' },
  m02: { frame: 'home/card_frame_water.png', type: 'home/type_water.png', role: 'home/role_front.png' },
  m03: { frame: 'home/card_frame_plant.png', type: 'home/type_plant.png', role: 'home/role_back.png' }
}
