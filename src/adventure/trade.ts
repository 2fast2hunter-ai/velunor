import { species } from '../data'

export interface TradeMonster {
  speciesId: string
  stars: number
  obtainedAt: number
}

export interface TradeAccount {
  now: number
  ageDays: number
  crests: number
  emailLinked: boolean
  flag: number
  tradesToday: number
  /** Rarity-7 monsters this account has already traded away. */
  tradedRarity7: number
  /** One-way trades to the same account in 30 days. */
  oneWayToPartner: number
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/** Monster trade rules. The trade screen itself arrives in phase-2 step 12. */
export function canTrade(mon: TradeMonster, account: TradeAccount): { ok: boolean; reason: string } {
  const rarity = species(mon.speciesId).baseRarity
  if (rarity >= 8) return { ok: false, reason: 'Seltenheit 8 und 9 bleiben hier.' }
  if (rarity === 7 && account.tradedRarity7 >= 1) return { ok: false, reason: 'Seltenheit 7 geht nur einmal.' }
  if (mon.stars > 0) return { ok: false, reason: 'Nur Sternstufe 0.' }
  if (account.now - mon.obtainedAt < WEEK_MS) return { ok: false, reason: 'Frisch aus der Truhe: 7 Tage gesperrt.' }
  if (account.ageDays < 7) return { ok: false, reason: 'Das Konto ist noch keine 7 Tage alt.' }
  if (account.crests < 8) return { ok: false, reason: 'Acht Wappen fehlen noch.' }
  if (!account.emailLinked) return { ok: false, reason: 'Die E-Mail ist nicht verknüpft.' }
  if (account.flag !== 0) return { ok: false, reason: 'Das Konto ist markiert.' }
  if (account.tradesToday >= 3) return { ok: false, reason: 'Heute sind schon 3 Tausche gelaufen.' }
  if (account.oneWayToPartner > 3) return { ok: false, reason: 'Zu viele einseitige Tausche an dasselbe Konto.' }
  return { ok: true, reason: '' }
}
