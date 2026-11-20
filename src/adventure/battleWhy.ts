import type { FightTrace } from './battle'
import { t, type Lang } from './i18n'

export type WhyIcon = 'typ' | 'wetter' | 'erstschlag' | 'ult' | 'status' | 'mechanik'

export interface WhyReason {
  icon: WhyIcon
  sentence: string
  score: number
}

export interface WhyShare {
  name: string
  normal: number
  ult: number
  status: number
}

export interface WhyCard {
  win: boolean
  ko: number
  koMax: number
  gold: number
  exp: number
  reasons: WhyReason[]
  shares: WhyShare[]
  tips: string[]
  chip: WhyReason
  /** A loss stays until the player taps. A win on the focus card may close itself. */
  wait: boolean
}

const SHOP = /kauf|shop|markt|edelstein|gems|premium|marken/i

/** Focus wins close on their own. Everything else waits for a tap. */
export function whyAutoMs(win: boolean, focus: boolean): number {
  return win && focus ? 4000 : 0
}

export function whyIconFile(icon: WhyIcon): string {
  return `battle_ui/summary/grund_${icon}.png`
}

export function whyBattle(traces: readonly FightTrace[], facts: { win: boolean, gold: number, exp: number, ultUnlocked?: boolean }, lang: Lang): WhyCard {
  const hits = traces.flatMap((trace) => (trace.frames ?? []).flatMap((frame) => (frame.hits ?? []).map((hit) => ({
    from: hit.from,
    amount: hit.amount,
    crit: hit.crit,
    band: hit.band,
    kind: hit.kind,
    weather: hit.weather,
    ult: Boolean(hit.ult),
    mech: Boolean(hit.helper || hit.pulse),
    ally: trace.allyName,
    foe: trace.foeName
  }))))
  const allyHits = hits.filter((hit) => hit.from === 'ally' && hit.kind === 'hit')
  const strong = allyHits.filter((hit) => hit.band === 'strong').length
  const weak = allyHits.filter((hit) => hit.band === 'weak').length
  const strongPct = allyHits.length ? Math.round((strong / allyHits.length) * 100) : 0
  const weakPct = allyHits.length ? Math.round((weak / allyHits.length) * 100) : 0
  const weatherHits = allyHits.filter((hit) => hit.weather != null && Math.abs(hit.weather - 1) > 0.001)
  const weatherPct = weatherHits.length
    ? Math.round(weatherHits.reduce((sum, hit) => sum + ((hit.weather ?? 1) - 1) * 100, 0) / weatherHits.length)
    : 0
  const first = hits.find((hit) => hit.kind === 'hit')
  const allyDamage = allyHits.reduce((sum, hit) => sum + Math.max(0, hit.amount), 0)
  const ultDamage = allyHits.filter((hit) => hit.ult).reduce((sum, hit) => sum + Math.max(0, hit.amount), 0)
  const ultPct = allyDamage > 0 ? Math.round((ultDamage / allyDamage) * 100) : 0
  const statusN = hits.filter((hit) => hit.kind === 'status').length
  const critN = allyHits.filter((hit) => hit.crit).length
  const mechN = hits.filter((hit) => hit.mech).length
  const reasons: WhyReason[] = []
  if (allyHits.length && strongPct >= weakPct) reasons.push({ icon: 'typ', score: strongPct, sentence: t(lang, strongPct > 0 ? 'why.typ.strong' : 'why.typ.even', { pct: strongPct }) })
  else if (allyHits.length) reasons.push({ icon: 'typ', score: weakPct, sentence: t(lang, 'why.typ.weak', { pct: weakPct }) })
  if (weatherHits.length) reasons.push({ icon: 'wetter', score: Math.abs(weatherPct) + weatherHits.length, sentence: t(lang, 'why.wetter', { pct: `${weatherPct > 0 ? '+' : ''}${weatherPct}` }) })
  if (first) reasons.push({ icon: 'erstschlag', score: 40, sentence: t(lang, first.from === 'ally' ? 'why.first.you' : 'why.first.foe') })
  if (ultPct > 0) reasons.push({ icon: 'ult', score: ultPct, sentence: t(lang, 'why.ult', { pct: ultPct }) })
  if (statusN > 0) reasons.push({ icon: 'status', score: statusN * 25, sentence: t(lang, statusN === 1 ? 'why.status.one' : 'why.status', { n: statusN }) })
  if (critN > 0) reasons.push({ icon: 'mechanik', score: critN * 20, sentence: t(lang, critN === 1 ? 'why.crit.one' : 'why.crit', { n: critN }) })
  if (mechN > 0) reasons.push({ icon: 'mechanik', score: mechN * 35, sentence: t(lang, 'why.mech', { n: mechN }) })
  reasons.sort((a, b) => b.score - a.score)
  const picked = reasons.slice(0, 3)
  if (!picked.length) picked.push({ icon: 'erstschlag', score: 0, sentence: t(lang, facts.win ? 'why.tip.win' : 'why.tip.loss') })
  const shares = shareRows(hits)
  const tips = tipLines(lang, { win: facts.win, strongPct, weakPct, firstAlly: first?.from === 'ally', ultPct, statusN, critN, ultUnlocked: facts.ultUnlocked !== false })
  return {
    win: facts.win,
    ko: Math.min(6, traces.filter((trace) => trace.foeKo).length),
    koMax: 6,
    gold: facts.gold,
    exp: facts.exp,
    reasons: picked,
    shares,
    tips: tips.slice(0, 2),
    chip: picked[0],
    wait: !facts.win
  }
}

export function tipIsSafe(tip: string): boolean {
  return !SHOP.test(tip)
}

function shareRows(hits: { from: 'ally' | 'foe', amount: number, kind: string, ult: boolean, ally: string, foe: string }[]): WhyShare[] {
  const rows = new Map<string, WhyShare>()
  const row = (name: string) => {
    const found = rows.get(name)
    if (found) return found
    const fresh = { name, normal: 0, ult: 0, status: 0 }
    rows.set(name, fresh)
    return fresh
  }
  for (const hit of hits) {
    const name = hit.from === 'ally' ? hit.ally : hit.foe
    const bucket = row(name || (hit.from === 'ally' ? 'ally' : 'foe'))
    const amount = Math.max(0, hit.amount)
    if (hit.kind === 'status') bucket.status += amount
    else if (hit.ult) bucket.ult += amount
    else if (hit.kind === 'hit') bucket.normal += amount
  }
  return [...rows.values()]
}

export function shareLegend(share: WhyShare, lang: Lang): string {
  const total = share.normal + share.ult + share.status
  const pct = (part: number) => total > 0 ? Math.round((part / total) * 100) : 0
  return t(lang, 'why.share', { normal: pct(share.normal), ult: pct(share.ult), status: pct(share.status) })
}

function tipLines(lang: Lang, row: { win: boolean, strongPct: number, weakPct: number, firstAlly: boolean | undefined, ultPct: number, statusN: number, critN: number, ultUnlocked: boolean }): string[] {
  const tips: string[] = []
  if (row.weakPct >= 50) tips.push(t(lang, 'why.tip.weak'))
  if (row.firstAlly === false) tips.push(t(lang, 'why.tip.tempo'))
  if (row.statusN > 0) tips.push(t(lang, 'why.tip.status'))
  if (!row.win && row.ultPct === 0 && row.ultUnlocked) tips.push(t(lang, 'why.tip.ult'))
  if (row.win && row.strongPct >= 50) tips.push(t(lang, 'why.tip.strong'))
  if (row.critN >= 2) tips.push(t(lang, 'why.tip.crit'))
  tips.push(t(lang, row.win ? 'why.tip.win' : 'why.tip.loss'))
  return tips
}
