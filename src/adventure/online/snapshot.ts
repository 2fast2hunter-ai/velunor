import { species } from '../../data'
import { masteryLevel } from '../mastery'
import { researchAudit, researchEpMult, researchGoldMult, researchLootMult, researchShardYield, offlineCapMs } from '../research'
import { treeAudit } from '../tree'
import { START_GOLD } from '../const'
import { enteredRegions, poolFor } from '../lootbox'
import { progressOf } from '../cloud/progress'
import type { SaveV2 } from '../types'
import type { AuditMon, AuditState, ObtainedHow } from './check'

const HOW: Record<string, ObtainedHow> = {
  truhe: 'Truhe',
  werkstatt: 'Truhe',
  spur: 'Splitter',
  hort: 'Ei',
  rad: 'Rad',
  tausch: 'Tausch'
}

export function obtainedHow(where: string): string {
  return HOW[where] ?? where
}

export function auditFromSave(save: SaveV2): AuditState {
  const mons: AuditMon[] = Object.entries(save.mons ?? {}).map(([uid, mon]) => ({
    uid,
    species: mon.species,
    level: mon.lvl,
    rarity: species(mon.species).baseRarity,
    schimmer: Boolean(mon.shiny),
    obtainedAt: mon.caughtAt,
    obtainedHow: obtainedHow(mon.caughtWhere)
  }))
  const shards = Object.values(save.shards ?? {}).reduce((sum, n) => sum + (Number(n) || 0), 0)
  const mastery = Object.values(save.mastery ?? {}).reduce((sum, n) => sum + (Number(n) || 0), 0)
  const masteryRanks = Object.values(save.mastery ?? {}).reduce((sum, n) => sum + masteryLevel(Number(n) || 0), 0)
  const chests = (save.chests?.kiesel ?? 0) + (save.chests?.silber ?? 0) + (save.chests?.gold ?? 0) + (save.chests?.sternen ?? 0) + (save.roadReady ?? 0)
  return {
    at: save.lastSeenAt,
    gold: save.gold,
    ep: progressOf(save).ep,
    region: save.region,
    chapter: save.chapter,
    badges: [...(save.badges ?? [])],
    chests,
    shards,
    mastery,
    masteryRanks,
    ...treeAudit(save),
    treeCapMs: offlineCapMs(save),
    researchGold: researchGoldMult(save),
    researchEp: researchEpMult(save),
    researchLoot: researchLootMult(save),
    researchShard: researchShardYield(save),
    research: researchAudit(save),
    mons,
    speciesAllowed: poolFor(enteredRegions(save))
  }
}

/** A missing server row. The first upload is measured against this only by the caller. */
export function emptyAudit(at: number): AuditState {
  return {
    at,
    gold: START_GOLD,
    ep: 0,
    region: 1,
    chapter: 1,
    badges: [],
    chests: 0,
    shards: 0,
    mastery: 0,
    masteryRanks: 0,
    treeGold: 1,
    treeCapMs: 8 * 60 * 60 * 1000,
    mons: [],
    speciesAllowed: []
  }
}
