import { monsters, rarityInfo, species, typeName } from '../data'
import type { TypeId } from '../types'
import {
  ALLY_X,
  FEET_Y,
  FOE_X,
  FOE_Y,
  SCENE_FILES,
  SEAL_ADD,
  SEAL_FALLBACK,
  STARTERS,
  assetPath
} from './const'
import { fontFactor } from './touch'
import { baseLine, dexPlaces, dexStatus, dexStatusLabel, listCodex, regionProgress, speciesNumber, type DexFilter } from './dex'
import { goalName, goalTitle, rarityLabel, t, typeLabel, weatherLabel, whenLabel, type Lang } from './i18n'
import { exportCode } from './save'
import {
  CHEST_TIERS,
  chestParticles,
  pityLine,
  starCost,
  effectiveTable,
  enteredRegions,
  formatPercent,
  poolFor,
  type ChestTier
} from './lootbox'
import type { ChestGrant } from './chests'
import { fightsHere } from './origin'
import { chapterById, gateBadge, placeLabel, regionById, regions, routeOf, type NodeKind } from './route'
import { chapterUnlocked, dexCaughtCount, hereSightings, rarityName } from './sim'
import { GOALS } from './achievements'
import { HORT_PRICES, hortOffer } from './hort'
import { CRYSTALS, FRUITS, crystalExp, crystalPrice, crystalUnlocked, fruitDef, fruitMinutes, fruitPrice, sellValue, shopLevel, wappenCount } from './shop'
import { weatherForecast, weatherName, type WeatherId } from './weather'
import { FACES, MULTIPLIERS, PRIZES, faceById, spinCost, wheelOpen, type Multiplier, type SymbolId } from './wheel'
import { expToNext, isAlive, monStats, realHp } from './stats'
import type { OfflineSummary } from './sim'
import type { SaveV2 } from './types'
import { PC_VIEW_FALLBACK, virtualWindow } from './virtualList'

export type Screen = 'adventure' | 'progress' | 'team' | 'codex' | 'activities' | 'shop' | 'achievements' | 'options' | 'guide'

export interface WheelPanel {
  tab: 'hort' | 'wheel' | 'chests'
  mult: Multiplier
  symbols: [SymbolId, SymbolId, SymbolId] | null
  note: string
}

export interface PcQuery {
  q: string
  type: string
  rarity: string
  shiny: string
  sort: string
  dir: number
}

export type CodexQuery = DexFilter

export type Overlay =
  | { kind: 'catch'; species: string; level: number; place: string }
  | { kind: 'dex'; species: string }
  | { kind: 'welcome'; summary: OfflineSummary; countedMs: number; rawMs: number }
  | { kind: 'card'; uid: string }
  | { kind: 'confirm-reset' }
  | { kind: 'confirm-import' }
  | { kind: 'awaken'; uid: string; level: 25 | 50 }
  | { kind: 'offline'; done: number; total: number }
  | { kind: 'log' }
  | { kind: 'guard'; win: boolean; badge: string | null; gold: number; text: string }
  | { kind: 'chest-rates'; tier: ChestTier }
  | { kind: 'chest-reveal'; grant: ChestGrant; hold?: 'seal' | 'beam' | 'card' }
  | { kind: 'chest-summary'; grants: ChestGrant[] }

export interface ShellFlags {
  mapOpen?: boolean
  moreOpen?: boolean
  /** Scroll offset of the PC viewport, in logical px. */
  pcScroll?: number
  /** Measured PC viewport height. 0 uses the fallback. */
  pcView?: number
  filtersOpen?: boolean
  dexOpen?: boolean
}

const base = (): string => import.meta.env.BASE_URL || '/'

export function art(path: string): string {
  return assetPath(path, base())
}

export function monsterArt(id: string, large = false): string {
  return art(`monsters/${id}${large ? '' : '_256'}.png`)
}

export function esc(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] ?? ch))
}

function gold(n: number): string {
  return `${Math.floor(n).toLocaleString('de-DE')} G`
}

function L(save: SaveV2): Lang {
  return save.settings?.lang === 'en' ? 'en' : 'de'
}

function tr(save: SaveV2, key: string, vars?: Record<string, string | number>): string {
  return t(L(save), key, vars)
}

function icon(kind: NodeKind): string {
  const common = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"'
  if (kind === 'wild') return `<svg viewBox="0 0 24 24" ${common}><path d="M4 16c2-6 4-6 6 0M10 16c2-6 4-6 6 0M8 10c1.2-3 2.4-3 4 0"/></svg>`
  if (kind === 'trainer') return `<svg viewBox="0 0 24 24" ${common}><circle cx="12" cy="8" r="3"/><path d="M6 19c1.2-3 3.2-4.5 6-4.5S16.8 16 18 19"/></svg>`
  if (kind === 'find') return `<svg viewBox="0 0 24 24" ${common}><path d="M12 3l3 6 6 .5-4.5 4 1.4 6.5L12 17l-6 3 1.4-6.5L3 9.5 9 9z"/></svg>`
  if (kind === 'spring') return `<svg viewBox="0 0 24 24" ${common}><path d="M12 3s5 6 5 10a5 5 0 0 1-10 0c0-4 5-10 5-10z"/></svg>`
  return `<svg viewBox="0 0 24 24" ${common}><path d="M12 3l7 3v6c0 5-3.2 7.6-7 9-3.8-1.4-7-4-7-9V6z"/></svg>`
}

function clockLabel(save: SaveV2, now: number): { time: string; part: string } {
  const clock = new Date(now)
  const day = clock.getHours() >= 8 && clock.getHours() <= 19
  const locale = L(save) === 'en' ? 'en' : 'de-DE'
  return {
    time: new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(clock),
    part: tr(save, day ? 'battle.day' : 'battle.night')
  }
}

function header(save: SaveV2, now: number): string {
  const caught = dexCaughtCount(save)
  const clock = clockLabel(save, now)
  const weather = weatherForecast(now)[0]
  return `<header class="hud anchor-top-bar">
    <div class="hud-gold"><img src="${art('icons/gold_128.png')}" alt=""/><b id="gold">${gold(save.gold)}</b></div>
    <div class="hud-dex">${tr(save, 'nav.codexCount', { n: caught })}</div>
    <div class="hud-clock">${esc(clock.time)} · ${esc(clock.part)}</div>
    <div class="hud-wx"><span class="wx">${weatherIcon(weather.weather)}</span> ${esc(weatherLabel(L(save), weather.weather))}</div>
  </header>`
}

function chapterLine(save: SaveV2, step: number, mapOpen: boolean): string {
  const chapter = chapterById(save.region, save.chapter)
  const region = regionById(save.region)
  const place = chapter.council
    ? tr(save, 'nav.council', { step, total: chapter.council.members.length })
    : tr(save, 'nav.step', { step })
  return `<button type="button" class="chapter-line" data-act="map" aria-expanded="${mapOpen ? 'true' : 'false'}">
    <span class="chapter-text">${esc(region.name)} · ${esc(chapter.name)} · ${esc(place)}</span>
    <span class="chev" aria-hidden="true">${mapOpen ? '▴' : '▾'}</span>
  </button>`
}

const TAB_ICONS: Record<string, string> = {
  adventure: 'icons/tab_abenteuer_128.png',
  team: 'icons/tab_team_128.png',
  codex: 'icons/tab_kodex_128.png',
  activities: 'icons/tab_aktivitaeten_128.png',
  more: 'icons/tab_mehr_128.png'
}

function tabbar(save: SaveV2, screen: Screen, moreOpen: boolean): string {
  const moreScreens: Screen[] = ['shop', 'achievements', 'options', 'guide']
  const tabs: { id: string; label: string; active: boolean; act: string; screen?: Screen }[] = [
    { id: 'adventure', label: 'nav.adventure', active: screen === 'adventure', act: 'screen', screen: 'adventure' },
    { id: 'team', label: 'nav.team', active: screen === 'team', act: 'screen', screen: 'team' },
    { id: 'codex', label: 'nav.codex', active: screen === 'codex', act: 'screen', screen: 'codex' },
    { id: 'activities', label: 'nav.activities', active: screen === 'activities', act: 'screen', screen: 'activities' },
    { id: 'more', label: 'nav.more', active: moreOpen || moreScreens.includes(screen), act: 'more' }
  ]
  return `<nav class="tabbar" aria-label="${esc(tr(save, 'nav.more'))}">
    ${tabs.map((tab) => `<button type="button" class="tab ${tab.active ? 'active' : ''}" data-act="${tab.act}" ${tab.screen ? `data-screen="${tab.screen}"` : ''}>
      <img src="${art(TAB_ICONS[tab.id])}" alt=""/>
      <span>${tr(save, tab.label)}</span>
    </button>`).join('')}
  </nav>`
}

function moreSheet(save: SaveV2, open: boolean): string {
  const items: [Screen, string][] = [
    ['shop', 'nav.shop'],
    ['achievements', 'nav.achievements'],
    ['options', 'nav.options'],
    ['guide', 'nav.guide']
  ]
  return `<div class="more-sheet card" ${open ? '' : 'hidden'}>
    ${items.map(([id, label]) => `<button type="button" data-act="screen" data-screen="${id}">${tr(save, label)}</button>`).join('')}
  </div>`
}

function pathNodes(cells: string[], council: boolean): string {
  if (council) return `<div class="card path council-path" id="path"><div class="path-row">${cells.join('')}</div></div>`
  const mid = Math.ceil(cells.length / 2)
  return `<div class="card path" id="path"><div class="path-row">${cells.slice(0, mid).join('')}</div><div class="path-row">${cells.slice(mid).join('')}</div></div>`
}

function path(save: SaveV2, here: number): string {
  const chapter = chapterById(save.region, save.chapter)
  if (chapter.council) {
    const cells = chapter.council.members.map((member, index) => {
      const step = index + 1
      const cls = step === here ? 'is-here' : step < here ? 'is-done' : ''
      return `<div class="node ${cls}" title="${esc(member.name)}">${icon('guardian')}<small>${step}</small></div>`
    })
    return pathNodes(cells, true)
  }
  const route = routeOf(save.chapter)
  const cells = []
  for (let step = 1; step <= 20; step++) {
    const kind = route[step]
    const cls = step === here ? 'is-here' : step < here ? 'is-done' : ''
    cells.push(`<div class="node ${cls}" title="${kind}">${icon(kind)}<small>${step}</small></div>`)
  }
  return pathNodes(cells, false)
}

function battle(save: SaveV2, now: number): string {
  const chapter = chapterById(save.region, save.chapter)
  const scene = SCENE_FILES[chapter.scene]
  const active = save.active && save.mons[save.active] ? save.active : save.team[0]
  const mon = active ? save.mons[active] : null
  const hp = mon ? realHp(mon) : { hp: 1, max: 1 }
  const clock = clockLabel(save, now)
  const sealed = Boolean(gateBadge(save.region, chapter) && save.badges.includes(gateBadge(save.region, chapter)))
  return `<div class="battle" id="battle">
    <div class="battle-world" id="battle-world">
      <picture>
        <source srcset="${art(scene.webp)}" type="image/webp"/>
        <img class="plate ${chapter.tint ? `tint-${chapter.tint}` : ''}" src="${art(scene.jpg)}" alt=""/>
      </picture>
      <div class="parallax far" id="parallax-far"></div>
      <div class="parallax mid" id="parallax-mid"></div>
      <div class="parallax near" id="parallax-near"></div>
      <div id="battle-fx"></div>
      <div class="combatant foe" id="foe-actor" style="left:${FOE_X}%;top:${FOE_Y}%">
        <b id="foe-name"></b>
        <div class="hp"><span id="foe-hp" style="width:100%"></span></div>
        <img class="sprite" id="foe-sprite" alt="" hidden/>
        <span class="ground-shadow"></span>
      </div>
      <div class="combatant ally" id="ally-actor" style="left:${ALLY_X}%;top:${FEET_Y}%">
        <b id="ally-name">${mon ? esc(species(mon.species).name) : ''}</b>
        <div class="hp"><span id="ally-hp" style="width:${(hp.hp / hp.max) * 100}%"></span></div>
        ${mon ? `<img class="sprite ${mon.shiny ? 'is-shiny' : ''}" id="ally-sprite" src="${monsterArt(mon.species, true)}" alt=""/>` : ''}
        <span class="ground-shadow"></span>
      </div>
      <div id="floats"></div>
      <div class="move-banner" id="move-banner" hidden></div>
      <div class="crit-flash" id="crit-flash"></div>
    </div>
    <div class="flash" id="flash"></div>
    <img class="seal" id="seal" alt="" src="${art(SEAL_ADD)}" data-fb="${art(SEAL_FALLBACK)}" style="left:${FOE_X}%;top:${FOE_Y}%"/>
    <p id="battle-text" class="battle-status">${tr(save, 'battle.place', { part: clock.part, weather: weatherLabel(L(save), weatherForecast(now)[0].weather), place: chapter.name, state: tr(save, save.hold ? 'battle.waiting' : 'battle.walking') })}</p>
    ${sealed ? '' : `<button type="button" class="primary challenge-fab" data-act="challenge">${tr(save, chapter.council || chapter.foyer ? 'battle.resume' : 'battle.challenge')}</button>`}
  </div>`
}

function teamDock(save: SaveV2): string {
  const active = save.active && save.mons[save.active] ? save.active : save.team[0]
  const slots = Array.from({ length: 6 }, (_, index) => save.team[index] ?? '')
  const minis = slots.map((uid) => {
    if (!uid || !save.mons[uid]) return `<span class="mini is-empty" aria-hidden="true"></span>`
    const row = save.mons[uid]
    const bar = realHp(row)
    const fainted = !isAlive(row)
    return `<button type="button" class="mini ${uid === active ? 'is-active' : ''} ${fainted ? 'is-fainted' : ''}" data-act="send" data-uid="${uid}">
      <img src="${monsterArt(row.species)}" alt=""/>
      <span class="bar"><span style="width:${fainted ? 0 : (bar.hp / bar.max) * 100}%"></span></span>
    </button>`
  }).join('')
  const speeds = ([1, 2, 3] as const).map((speed) => `<button type="button" data-act="speed" data-speed="${speed}" class="${save.settings.speed === speed ? 'on' : ''}">×${speed}</button>`).join('')
  return `<div class="dock">
    <div class="team-rail">${minis}</div>
    <div class="speed" aria-label="×1 ×2 ×3">${speeds}</div>
  </div>`
}

function logLines(save: SaveV2, limit: number): string {
  const lines = [...save.log].reverse().slice(0, limit).map((line) => `<div>${esc(line.text)}</div>`).join('')
  return lines || `<div class="muted">${tr(save, 'log.empty')}</div>`
}

function logBox(save: SaveV2): string {
  return `<button type="button" class="card log" id="log" data-act="log">${logLines(save, 3)}</button>`
}

function weatherIcon(id: WeatherId): string {
  const common = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'
  if (id === 'klar') return `<svg viewBox="0 0 24 24" ${common}><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2 2M17.1 17.1l2 2M19.1 4.9l-2 2M6.9 17.1l-2 2"/></svg>`
  if (id === 'regen') return `<svg viewBox="0 0 24 24" ${common}><path d="M7 15c-2 0-3-1.4-3-3 0-2 2-3 3.2-2.2C8 7 10 6 12 6c2.4 0 4 1.6 4.4 3.6 1.8.2 3.6 1.6 3.6 3.6 0 1.8-1.4 2.8-3 2.8"/><path d="M8 18v3M12 18v3M16 18v3"/></svg>`
  if (id === 'gewitter') return `<svg viewBox="0 0 24 24" ${common}><path d="M7 14c-2 0-3-1.4-3-3 0-2 2-3 3.2-2.2C8 6 10 5 12 5c2.4 0 4 1.6 4.4 3.6 1.8.2 3.6 1.6 3.6 3.6 0 1.6-1.2 2.6-2.6 2.8"/><path d="M13 14l-3 5h3l-1 4 5-6h-3l2-3z"/></svg>`
  if (id === 'schnee') return `<svg viewBox="0 0 24 24" ${common}><path d="M12 3v18M5 7l14 10M19 7L5 17"/><path d="M12 7l-1.5-1M12 7l1.5-1M12 17l-1.5 1M12 17l1.5 1"/></svg>`
  if (id === 'nebel') return `<svg viewBox="0 0 24 24" ${common}><path d="M4 9h16M3 13h18M5 17h14"/></svg>`
  return `<svg viewBox="0 0 24 24" ${common}><path d="M3 8c3 0 3 3 6 3s3-3 6-3 3 3 6 3M3 14c3 0 3 3 6 3s3-3 6-3 3 3 6 3"/></svg>`
}

function drawerSheet(save: SaveV2, now: number): string {
  const rows = hereSightings(save, now)
  const forecast = weatherForecast(now)
  const current = forecast[0]
  const clock = clockLabel(save, now)
  const body = rows.map((row) => `<div class="sight-row">
      <span class="seal-ring" style="--pity:${Math.max(0, Math.min(1, row.pity / 10))}" title="${row.pity ? `Spur ${row.pity}` : ''}">
        <img class="${row.caught ? '' : 'sil'}" src="${monsterArt(row.species)}" alt=""/>
      </span>
      <div><b>${row.caught ? esc(row.name) : '???'}</b><div class="muted">${esc(row.type)}</div></div>
      <span class="pct">${Math.round(row.pct)} %</span>
    </div>`).join('')
  const preview = forecast.map((slot, index) => {
    const label = new Date(slot.at).getUTCHours().toString().padStart(2, '0')
    return `<span class="wx ${index === 0 ? 'now' : ''}" title="${label} UTC · ${weatherName(slot.weather)}">${weatherIcon(slot.weather)}</span>`
  }).join('')
  return `<div class="drawer card">
    <h2>${tr(save, 'side.seen')}</h2>
    <div class="clock"><span class="wx">${weatherIcon(current.weather)}</span> ${esc(clock.part)} · ${esc(weatherLabel(L(save), current.weather))}</div>
    <div class="forecast" aria-label="${tr(save, 'side.forecast')}">${preview}</div>
    <div class="sight">${body || `<div class="muted">${tr(save, 'side.empty')}</div>`}</div>
    ${fruitCard(save, now, true)}
  </div>`
}

function sightings(save: SaveV2, open: boolean): string {
  return `<button type="button" class="grip" data-act="side" aria-expanded="${open ? 'true' : 'false'}">
    <i class="grip-pill"></i>
    <span>${tr(save, 'side.seen')}</span>
  </button>`
}

function fruitCard(save: SaveV2, now: number, open: boolean): string {
  const active = save.activeFruits.filter((fruit) => fruit.until > now)
  const rows = active.map((fruit) => `<div class="fruit-row"><b>${esc(fruitDef(fruit.id).name)}</b><span>${fruitMinutes(fruit.until, now)} min</span></div>`).join('')
  return `<div class="card side-card">
    <h2>${tr(save, 'fruit.title')}</h2>
    ${open ? (rows || `<p class="muted">${tr(save, 'fruit.none')}</p>`) : `<p class="muted">${active.length}</p>`}
  </div>`
}

function progress(save: SaveV2): string {
  const region = regionById(save.region)
  const switches = regions.map((entry) => {
    const open = save.regionsOpen.includes(entry.id)
    const here = save.region === entry.id
    return `<button data-act="region" data-region="${entry.id}" class="${here ? 'primary' : ''}" ${open ? '' : 'disabled'}>${esc(entry.name)}</button>`
  }).join('')
  const buttons = region.chapters.map((chapter) => {
    const open = chapterUnlocked(save, chapter.id)
    const here = save.chapter === chapter.id
    const range = chapter.special
      ? `Sonderzone, Lv ${chapter.levelMin}–${chapter.levelMax}`
      : chapter.council
        ? `Vier Räte und der Großwächter, Cap ${chapter.council.members.map((member) => member.cap).join('/')}`
        : `Lv ${chapter.levelMin}–${chapter.levelMax}, Cap ${chapter.cap}`
    const mark = chapter.special ? 'Urgrund' : (save.badges.includes(chapter.guardian.badge) ? chapter.guardian.badge : 'Wappen fehlt')
    return `<button class="text-btn" data-act="travel" data-region="${region.id}" data-chapter="${chapter.id}" ${open ? '' : 'disabled'}>
      <b>${esc(chapter.name)}</b> ${here ? '· hier' : ''}
      <div class="muted">${range}, ${esc(mark)}</div>
    </button>`
  }).join('')
  return `<div class="card panel"><h2>${tr(save, 'nav.progress')} · ${esc(region.name)}</h2>
    <div class="row-actions">${switches}</div>
    <p class="muted">${tr(save, 'progress.note')}</p>
    <div class="chapters">${buttons}</div>
  </div>`
}

const SORTS: [string, string][] = [
  ['newest', 'team.newest'],
  ['dex', 'team.dexNo'],
  ['name', 'team.search'],
  ['level', 'team.level'],
  ['rarity', 'team.rarity'],
  ['stats', 'team.stats']
]

export function visiblePc(save: SaveV2, query: PcQuery): string[] {
  const list = save.pc.filter((uid) => {
    const mon = save.mons[uid]
    if (!mon) return false
    const sp = species(mon.species)
    if (query.q && !sp.name.toLowerCase().includes(query.q.toLowerCase())) return false
    if (query.type && sp.type !== query.type) return false
    if (query.rarity !== '' && String(sp.baseRarity) !== query.rarity) return false
    if (query.shiny === '1' && !mon.shiny) return false
    if (query.shiny === '0' && mon.shiny) return false
    return true
  })
  const value = (uid: string): number => {
    const mon = save.mons[uid]
    const sp = species(mon.species)
    if (query.sort === 'dex') return Number(sp.id.slice(1))
    if (query.sort === 'name') return 0
    if (query.sort === 'level') return mon.lvl
    if (query.sort === 'rarity') return sp.baseRarity
    if (query.sort === 'stats') {
      const stats = monStats(mon)
      return stats.hp + stats.atk + stats.def + stats.spd
    }
    return mon.caughtAt
  }
  const locale = L(save) === 'en' ? 'en' : 'de'
  list.sort((a, b) => {
    if (query.sort === 'name') return species(save.mons[a].species).name.localeCompare(species(save.mons[b].species).name, locale) * query.dir
    return (value(a) - value(b)) * query.dir
  })
  return list
}

export function pcWindowHtml(save: SaveV2, uids: string[], selected: string | null): string {
  return uids.map((uid) => {
    const mon = save.mons[uid]
    if (!mon) return ''
    const sp = species(mon.species)
    return `<button type="button" class="mon-card ${selected === uid ? 'on' : ''}" data-act="select" data-uid="${uid}" draggable="true" data-drag="pc">
      <img src="${monsterArt(sp.id)}" alt=""/>
      <div>${esc(sp.name)}</div>
      <div class="muted">Lv ${mon.lvl}${mon.shiny ? ' · Schimmer' : ''}</div>
    </button>`
  }).join('')
}

function typeOptions(current: string): string {
  const types = [...new Set(monsters.map((mon) => mon.type))]
  return types.map((type) => `<option value="${type}" ${current === type ? 'selected' : ''}>${esc(typeName(type as TypeId))}</option>`).join('')
}

function shinyOptions(save: SaveV2, current: string, have: boolean): string {
  return `<option value="" ${current === '' ? 'selected' : ''}>${tr(save, 'team.shiny')}</option>
    <option value="1" ${current === '1' ? 'selected' : ''}>${tr(save, have ? 'team.shinyHave' : 'team.shinyOnly')}</option>
    <option value="0" ${current === '0' ? 'selected' : ''}>${tr(save, 'team.shinyOff')}</option>`
}

function team(save: SaveV2, query: PcQuery, selected: string | null, shell: ShellFlags): string {
  const list = visiblePc(save, query)
  const viewH = shell.pcView && shell.pcView > 0 ? shell.pcView : PC_VIEW_FALLBACK
  const win = virtualWindow(list.length, shell.pcScroll ?? 0, viewH)
  const cards = pcWindowHtml(save, list.slice(win.start, win.end), selected)
  const roster = Array.from({ length: 6 }, (_, index) => {
    const uid = save.team[index]
    if (!uid || !save.mons[uid]) return `<div class="mon-card slot" aria-hidden="true"><span>${index + 1}</span></div>`
    const mon = save.mons[uid]
    return `<button type="button" class="mon-card ${selected === uid ? 'on' : ''}" data-act="select" data-uid="${uid}" data-index="${index}" data-press="card" draggable="true" data-drag="team">
      <img src="${monsterArt(mon.species)}" alt=""/>
      <div>${index + 1}. ${esc(species(mon.species).name)}</div>
      <div class="muted">Lv ${mon.lvl}${save.buddy === uid ? ` · ${tr(save, 'team.buddy')}` : ''}${fightsHere(save, mon) ? '' : ` · ${tr(save, 'team.other')}`}</div>
    </button>`
  }).join('')
  const sortLabel = tr(save, SORTS.find((row) => row[0] === query.sort)?.[1] ?? 'team.newest')
  const body = list.length
    ? `<div class="vlist-spacer" style="height:${win.totalHeight}px"><div class="vlist-window" style="transform:translateY(${win.offset}px)">${cards}</div></div>`
    : `<div class="muted pc-empty">${tr(save, 'team.empty')}</div>`
  return `<div class="menu-screen team-screen">
    <div class="team-block">
      <h2>${tr(save, 'team.title')}</h2>
      <p class="muted">${tr(save, 'team.note')}</p>
      <div class="team-grid" id="team-grid" data-cols="3">${roster}</div>
    </div>
    <h2 class="pc-label">${tr(save, 'team.pc')} · ${list.length}</h2>
    <div id="pc-viewport" class="vlist" data-cols="4" data-count="${list.length}" data-start="${win.start}" data-end="${win.end}">${body}</div>
    <div class="menu-dock" data-dock="team">
      <button type="button" data-act="nudge" data-dir="-1">${tr(save, 'team.forward')}</button>
      <button type="button" data-act="nudge" data-dir="1">${tr(save, 'team.back')}</button>
      <button type="button" data-act="to-pc">${tr(save, 'team.toPc')}</button>
      <button type="button" data-act="to-team">${tr(save, 'team.toTeam')}</button>
      <button type="button" data-act="card" data-uid="${selected ?? ''}">${tr(save, 'team.card')}</button>
    </div>
    <div class="filter-sheet ${shell.filtersOpen ? 'open' : ''}">
      <button type="button" class="filter-bar" data-act="filters" aria-expanded="${shell.filtersOpen ? 'true' : 'false'}">${tr(save, 'team.filters')} · ${esc(sortLabel)}</button>
      <div class="filter-body">
        <input data-field="q" placeholder="${esc(tr(save, 'team.search'))}" value="${esc(query.q)}"/>
        <select data-field="type"><option value="">${tr(save, 'team.type')}</option>${typeOptions(query.type)}</select>
        <select data-field="rarity"><option value="">${tr(save, 'team.rarity')}</option>${rarityOptions(query.rarity)}</select>
        <select data-field="shiny">${shinyOptions(save, query.shiny, false)}</select>
        <select data-field="sort">
          ${SORTS.map(([id, key]) => `<option value="${id}" ${query.sort === id ? 'selected' : ''}>${tr(save, key)}</option>`).join('')}
        </select>
        <button type="button" data-act="dir">${query.dir < 0 ? tr(save, 'team.down') : tr(save, 'team.up')}</button>
      </div>
    </div>
  </div>`
}

function rarityOptions(current: string): string {
  const rows = []
  for (let i = 0; i <= 9; i++) rows.push(`<option value="${i}" ${current === String(i) ? 'selected' : ''}>${esc(rarityInfo(i).name)}</option>`)
  return rows.join('')
}

function codex(save: SaveV2, filter: CodexQuery, shell: ShellFlags): string {
  const bars = regions.map((entry) => entry.id).map((id) => {
    const row = regionProgress(save, id)
    const pct = row.total ? Math.round((row.caught / row.total) * 100) : 0
    const label = row.open ? `${esc(row.name)} ${row.caught}/${row.total}` : tr(save, 'progress.locked', { name: esc(row.name) })
    return `<div><div class="muted">${label}</div><div class="progress-track"><span style="width:${row.placeholder ? 0 : pct}%"></span></div></div>`
  }).join('')
  const rows = listCodex(save, filter)
  const cells = rows.map((mon) => {
    const status = dexStatus(save, mon.id)
    const hidden = status === 'missing'
    return `<button type="button" class="mon-card" data-act="dex" data-species="${mon.id}">
      <img class="${status === 'owned' || status === 'released' ? '' : 'sil'}" src="${monsterArt(mon.id)}" alt="" style="${hidden ? 'opacity:.25' : ''}"/>
      <div>${hidden ? tr(save, 'codex.no', { n: speciesNumber(mon.id) }) : esc(mon.name)}</div>
      <div class="muted">${dexStatusLabel(status)}</div>
    </button>`
  }).join('')
  return `<div class="menu-screen">
    <div class="menu-scroll">
      <div class="card panel">
        <h2>${tr(save, 'nav.codex')} ${dexCaughtCount(save)}/100</h2>
        <div class="region-bars">${bars}</div>
        <p class="muted">${tr(save, 'codex.note')}</p>
        <div class="codex-grid" data-cols="4">${cells || `<div class="muted">${tr(save, 'team.codexEmpty')}</div>`}</div>
      </div>
    </div>
    <div class="filter-sheet ${shell.dexOpen ? 'open' : ''}">
      <button type="button" class="filter-bar" data-act="dex-filters" aria-expanded="${shell.dexOpen ? 'true' : 'false'}">${tr(save, 'team.filters')}</button>
      <div class="filter-body">
        <input data-field="dex-q" placeholder="${esc(tr(save, 'codex.search'))}" value="${esc(filter.q)}"/>
        <select data-field="dex-type"><option value="">${tr(save, 'team.type')}</option>${typeOptions(filter.type)}</select>
        <select data-field="dex-rarity"><option value="">${tr(save, 'team.rarity')}</option>${rarityOptions(filter.rarity)}</select>
        <select data-field="dex-shiny">${shinyOptions(save, filter.shiny, true)}</select>
      </div>
    </div>
  </div>`
}

function shop(save: SaveV2, now: number): string {
  const crests = wappenCount(save)
  const mons = [...save.team, ...save.pc].map((uid) => {
    const mon = save.mons[uid]
    return `<option value="${uid}">${esc(species(mon.species).name)} Lv ${mon.lvl}</option>`
  }).join('')
  const level = shopLevel(save)
  const crystals = CRYSTALS.map((item) => {
    const open = crystalUnlocked(save, item.id)
    const price = crystalPrice(save, item.id)
    const exp = crystalExp(item.id, level)
    return `<article class="list-row">
      <div><b>${esc(item.name)}</b><div class="muted">+${exp.toLocaleString('de-DE')} EP · ${price.toLocaleString('de-DE')} G${item.wappen ? ` · ab ${item.wappen} Wappen` : ''}</div><span>×${save.bag.crystals[item.id]}</span></div>
      <div class="list-actions">
        <button type="button" data-act="sell-crystal" data-id="${item.id}">${tr(save, 'shop.sell', { n: sellValue(price) })}</button>
        <button type="button" data-act="use-crystal" data-id="${item.id}">${tr(save, 'shop.use')}</button>
        <button type="button" class="primary" data-act="buy-crystal" data-id="${item.id}" ${open ? '' : 'disabled'}>${tr(save, 'shop.buy')}</button>
      </div>
    </article>`
  }).join('')
  const fruits = FRUITS.map((item) => `<article class="list-row">
      <div><b>${esc(item.name)}</b><div class="muted">${esc(item.effect)} · ${fruitPrice(save, item.id).toLocaleString('de-DE')} G · 1 h</div><span>×${save.bag.fruits[item.id]}</span></div>
      <div class="list-actions">
        <button type="button" data-act="sell-fruit" data-id="${item.id}">${tr(save, 'shop.sell', { n: sellValue(item.price) })}</button>
        <button type="button" data-act="use-fruit" data-id="${item.id}">${tr(save, 'shop.eat')}</button>
        <button type="button" class="primary" data-act="buy-fruit" data-id="${item.id}">${tr(save, 'shop.buy')}</button>
      </div>
    </article>`).join('')
  return `<div class="menu-screen">
    <div class="menu-scroll">
      <div class="card panel">
        <h2>${tr(save, 'shop.title')}</h2>
        <p class="muted">${tr(save, 'shop.note', { n: crests })}</p>
        <label class="switch">${tr(save, 'shop.give')} <select id="crystal-target">${mons}</select></label>
        <p class="muted">Stand ${new Date(now).toLocaleTimeString(L(save) === 'en' ? 'en' : 'de-DE', { hour: '2-digit', minute: '2-digit' })}</p>
        <h2>${tr(save, 'shop.crystals')}</h2>
        ${crystals}
        <h2>${tr(save, 'shop.fruits')}</h2>
        ${fruits}
      </div>
    </div>
  </div>`
}

function glyph(id: SymbolId): string {
  const box = 'viewBox="0 0 64 64" width="72" height="72" aria-hidden="true"'
  if (id === 'stern') return `<svg ${box}><polygon points="32,6 38,24 58,24 42,36 48,56 32,44 16,56 22,36 6,24 26,24" fill="#f0c14a"/></svg>`
  if (id === 'mond') return `<svg ${box}><path d="M42 8a22 22 0 1 0 0 48 16 16 0 1 1 0-48z" fill="#d6e4ff"/></svg>`
  if (id === 'krone') return `<svg ${box}><path d="M8 48 L14 22 L26 34 L32 12 L38 34 L50 22 L56 48 Z" fill="#f0c14a"/></svg>`
  if (id === 'blatt') return `<svg ${box}><ellipse cx="32" cy="36" rx="14" ry="22" transform="rotate(-28 32 36)" fill="#7dcea0"/></svg>`
  if (id === 'tropfen') return `<svg ${box}><path d="M32 8 C32 8 14 30 14 42 a18 18 0 0 0 36 0 C50 30 32 8 32 8Z" fill="#4fc3f7"/></svg>`
  return `<svg ${box}><polygon points="32,4 38,26 60,32 38,38 32,60 26,38 4,32 26,26" fill="#fff176"/></svg>`
}

function activityTabs(save: SaveV2, wheel: WheelPanel): string {
  return `<button type="button" data-act="activity" data-id="hort" class="${wheel.tab === 'hort' ? 'primary' : ''}">${tr(save, 'act.hort')}</button>
    <button type="button" data-act="activity" data-id="chests" class="${wheel.tab === 'chests' ? 'primary' : ''}">${tr(save, 'act.chests')}</button>
    <button type="button" data-act="activity" data-id="wheel" class="${wheel.tab === 'wheel' ? 'primary' : ''}">${tr(save, 'act.wheel')}</button>`
}

const CHEST_KEY: Record<ChestTier, string> = {
  kiesel: 'chest.kiesel',
  silber: 'chest.silber',
  gold: 'chest.gold',
  sternen: 'chest.sternen'
}

function chestPlace(save: SaveV2, grant: ChestGrant): string {
  if (grant.place === 'team') return tr(save, 'chest.team')
  if (grant.place === 'pc') return tr(save, 'chest.pc')
  return tr(save, 'chest.dupe')
}

function chestRatesHtml(save: SaveV2, tier: ChestTier): string {
  const table = effectiveTable(tier, poolFor(enteredRegions(save)))
  const rows = table.map((row) => {
    const name = rarityInfo(row.rarity).name
    const speciesRows = row.species.map((entry) => `<li>${esc(species(entry.id).name)} <b data-chance="${entry.id}">${formatPercent(entry.chance)} %</b></li>`).join('')
    return `<details>
      <summary><span>${esc(name)}</span> <b data-rate="${row.rarity}">${formatPercent(row.percent)} %</b></summary>
      <ul>${speciesRows}</ul>
    </details>`
  }).join('')
  const pity = pityLine(tier, tier === 'kiesel' ? 0 : save.pity[tier])
  return `<p class="muted">${esc(tr(save, 'chest.hint'))}</p>${pity ? `<p data-pity="${tier}">${esc(pity)}</p>` : ''}<div class="rate-list">${rows}</div>`
}

function chestView(save: SaveV2, wheel: WheelPanel): string {
  const tiles = CHEST_TIERS.map((tier) => {
    const count = save.chests[tier]
    const off = count <= 0 ? 'disabled' : ''
    return `<article class="chest-tile">
      <h3>${tr(save, CHEST_KEY[tier])}</h3>
      <p class="chest-count">${count}</p>
      <button type="button" class="chest-info" data-act="chest-info" data-tier="${tier}">${tr(save, 'chest.info')}</button>
      <button type="button" class="primary" data-act="chest-open" data-tier="${tier}" ${off}>${tr(save, 'chest.open')}</button>
      <button type="button" class="ghost" data-act="chest-all" data-tier="${tier}" ${off}>${tr(save, 'chest.all')}</button>
    </article>`
  }).join('')
  return `<div class="menu-screen">
    <div class="menu-scroll">
      <div class="card panel">
        <h2>${tr(save, 'act.chests')}</h2>
        <div class="chest-grid">${tiles}</div>
        <p>${tr(save, 'chest.road', { n: save.roadReady })}</p>
        <button type="button" class="primary" data-act="chest-claim" ${save.roadReady > 0 ? '' : 'disabled'}>${tr(save, 'chest.claim')}</button>
        <button type="button" data-act="chest-buy" data-tier="kiesel">${tr(save, 'chest.kiesel')} · ${tr(save, 'chest.buyGold')}</button>
        <button type="button" data-act="chest-buy" data-tier="silber">${tr(save, 'chest.silber')} · ${tr(save, 'chest.buyGold')}</button>
        <button type="button" data-act="chest-marks" data-tier="gold">${tr(save, 'chest.gold')} · ${tr(save, 'chest.buyMarks')}</button>
        <button type="button" data-act="chest-marks" data-tier="sternen">${tr(save, 'chest.sternen')} · ${tr(save, 'chest.buyMarks')}</button>
      </div>
    </div>
    <div class="menu-dock" data-dock="chests">${activityTabs(save, wheel)}</div>
  </div>`
}

function ringDots(count: number): string {
  let html = ''
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2
    const x = 50 + Math.cos(angle) * 34
    const y = 42 + Math.sin(angle) * 22
    html += `<i style="left:${x.toFixed(2)}%;top:${y.toFixed(2)}%"></i>`
  }
  return html
}

function activitiesView(save: SaveV2, now: number, selected: string | null, wheel: WheelPanel): string {
  if (wheel.tab === 'wheel') return wheelView(save, wheel)
  if (wheel.tab === 'chests') return chestView(save, wheel)
  return hortView(save, now, selected, wheel)
}

function wheelView(save: SaveV2, wheel: WheelPanel): string {
  const open = wheelOpen(save)
  const shown = wheel.symbols ?? (['funke', 'blatt', 'tropfen'] as [SymbolId, SymbolId, SymbolId])
  const reels = shown.map((id) => `<div class="reel">${glyph(id)}<span>${esc(faceById(id).name)}</span></div>`).join('')
  const bets = MULTIPLIERS.map((mult) => `<button type="button" data-act="wheel-mult" data-mult="${mult}" class="${wheel.mult === mult ? 'primary' : ''}">×${mult}</button>`).join('')
  const pay = FACES.map((face) => `<div class="shop-row"><div>3 ${esc(face.name)}</div><span>${face.triple.toLocaleString('de-DE')}</span></div>`).join('')
  const zones = [...new Set(PRIZES.map((prize) => prize.region))]
  const shop = zones.map((region) => {
    const rows = PRIZES.filter((prize) => prize.region === region).map((prize) => {
      const sp = species(prize.species)
      const unlocked = save.regionsOpen.includes(prize.region)
      const owned = Object.values(save.mons).some((mon) => mon.species === prize.species)
      const label = !unlocked ? tr(save, 'wheel.later') : owned ? tr(save, 'wheel.owned') : tr(save, 'wheel.price', { n: prize.marks.toLocaleString(L(save) === 'en' ? 'en' : 'de-DE') })
      return `<article class="list-row">
        <div class="prize-line"><img src="${monsterArt(sp.id, true)}" alt=""/><div><b>${esc(sp.name)}</b><div class="muted">${esc(prize.regionName)} · Lv 5</div></div></div>
        <div class="list-actions"><button type="button" class="primary" data-act="buy-prize" data-id="${prize.species}" ${unlocked && !owned ? '' : 'disabled'}>${label}</button></div>
      </article>`
    }).join('')
    const name = PRIZES.find((prize) => prize.region === region)?.regionName ?? ''
    return `<h2>${esc(name)}</h2>${rows}`
  }).join('')
  const cost = (spinCost(save.region) * wheel.mult).toLocaleString(L(save) === 'en' ? 'en' : 'de-DE')
  return `<div class="menu-screen">
    <div class="wheel-stage">
      <h2>${tr(save, 'act.wheel')}</h2>
      ${open
        ? `<p class="muted">${tr(save, 'wheel.note', { cost, marks: save.marks.toLocaleString(L(save) === 'en' ? 'en' : 'de-DE') })}</p><div class="reels">${reels}</div>${wheel.note ? `<p>${esc(wheel.note)}</p>` : ''}`
        : `<p>${tr(save, 'wheel.locked')}</p>`}
    </div>
    <div class="menu-scroll">
      <div class="card panel">
        <h2>${tr(save, 'wheel.marks')}</h2>
        ${pay}
        <p class="muted">${tr(save, 'wheel.pair')}</p>
        <h2>${tr(save, 'wheel.shop')}</h2>
        ${shop}
      </div>
    </div>
    <div class="menu-dock" data-dock="wheel">
      ${activityTabs(save, wheel)}
      ${open ? bets : ''}
      <button type="button" class="primary dock-primary" data-act="spin" ${open ? '' : 'disabled'}>${tr(save, 'wheel.spin')}</button>
    </div>
  </div>`
}

function hortView(save: SaveV2, now: number, selected: string | null, wheel: WheelPanel): string {
  const offer = hortOffer(save)
  const locale = L(save) === 'en' ? 'en' : 'de-DE'
  const residents = save.hort.map((uid) => {
    const mon = save.mons[uid]
    if (!mon) return ''
    const sp = species(mon.species)
    return `<button type="button" class="mon-card ${selected === uid ? 'on' : ''}" data-act="select" data-uid="${uid}">
      <img src="${monsterArt(sp.id)}" alt=""/>
      <div>${esc(sp.name)}${mon.shiny ? ' · Schimmer' : ''}</div>
      <div class="muted">Lv ${mon.lvl} · ${esc(typeName(sp.type))}</div>
    </button>`
  }).join('')
  const eggs = save.eggs.map((egg) => {
    const left = Math.max(0, egg.readyAt - now)
    const hours = Math.floor(left / 3600000)
    const mins = Math.ceil((left % 3600000) / 60000)
    return `<div class="list-row"><b>${esc(species(egg.species).name)}</b><span>${left <= 0 ? tr(save, 'hort.hatch') : `${hours} h ${mins} min`}</span></div>`
  }).join('')
  const buy = offer
    ? `<button type="button" class="primary dock-primary" data-act="buy-hort" ${offer.locked ? 'disabled' : ''}>${tr(save, 'hort.buy', { slot: offer.slot, price: offer.price.toLocaleString(locale) })}${offer.locked ? ` · ${esc(tr(save, offer.locked))}` : ''}</button>`
    : ''
  return `<div class="menu-screen">
    <div class="menu-scroll">
      <div class="card panel">
        <h2>${tr(save, 'hort.title')}</h2>
        <p class="muted">${tr(save, 'hort.note', { a: HORT_PRICES[1].toLocaleString(locale), b: HORT_PRICES[2].toLocaleString(locale), c: HORT_PRICES[3].toLocaleString(locale) })}</p>
        <p>${tr(save, 'hort.slots', { slots: save.hortSlots, eggs: save.eggs.length, max: save.hortSlots })}</p>
        <div class="hort-grid">${residents || `<div class="muted">${tr(save, 'hort.empty')}</div>`}</div>
        <h2>${tr(save, 'hort.eggs')}</h2>
        ${eggs || `<p class="muted">${tr(save, 'hort.noEgg')}</p>`}
        ${offer ? '' : `<p class="muted">${tr(save, 'hort.all')}</p>`}
      </div>
    </div>
    <div class="menu-dock" data-dock="hort">
      ${activityTabs(save, wheel)}
      <button type="button" data-act="to-hort">${tr(save, 'hort.to')}</button>
      <button type="button" data-act="from-hort">${tr(save, 'hort.from')}</button>
      ${buy}
    </div>
  </div>`
}

function achievementsView(save: SaveV2): string {
  const done = save.claimed.length
  const rows = GOALS.map((goal) => {
    const have = save.claimed.includes(goal.id)
    const typeId = goal.id.startsWith('type-') ? goal.id.slice(5) : ''
    const typeBit = typeId ? typeLabel(L(save), typeId, typeName(typeId as TypeId)) : ''
    const name = goalName(L(save), goal.id, goal.name, typeBit)
    const title = goalTitle(L(save), goal.id, goal.title, typeBit)
    return `<article class="list-row achieve ${have ? 'done' : ''}">
      <div><b>${esc(name)}</b><div class="muted">${have ? tr(save, 'ach.have', { title, frame: goal.frame }) : tr(save, 'ach.open')} · ${goal.gold.toLocaleString(L(save) === 'en' ? 'en' : 'de-DE')} G</div></div>
      ${have ? `<div class="list-actions"><button type="button" data-act="equip-title" data-id="${goal.id}">${tr(save, 'ach.titleBtn')}</button><button type="button" data-act="equip-frame" data-id="${goal.id}">${tr(save, 'ach.frameBtn')}</button></div>` : ''}
    </article>`
  }).join('')
  return `<div class="menu-screen">
    <div class="menu-scroll">
      <div class="card panel">
        <h2>${tr(save, 'ach.title', { done, total: GOALS.length })}</h2>
        <p class="muted">${tr(save, 'ach.note')}</p>
        ${rows}
      </div>
    </div>
  </div>`
}

function options(save: SaveV2, debug: boolean): string {
  const power = (minutes: 0 | 2 | 5, key: string) => `<button type="button" data-act="power" data-min="${minutes}" class="${save.settings.powerSave === minutes ? 'primary' : ''}">${tr(save, key)}</button>`
  return `<div class="menu-screen">
    <div class="menu-scroll">
      <div class="card panel">
    <h2>${tr(save, 'opt.title')}</h2>
    <div class="row-actions">
      <span>${tr(save, 'opt.lang')}</span>
      <button data-act="lang" data-lang="de" class="${L(save) === 'de' ? 'primary' : ''}">Deutsch</button>
      <button data-act="lang" data-lang="en" class="${L(save) === 'en' ? 'primary' : ''}">English</button>
    </div>
    <div class="row-actions">
      <span>${tr(save, 'opt.speed')}</span>
      ${([1, 2, 3] as const).map((speed) => `<button data-act="speed" data-speed="${speed}" class="${save.settings.speed === speed ? 'primary' : ''}">×${speed}</button>`).join('')}
    </div>
    <label class="switch"><input type="checkbox" data-field="auto" ${save.settings.autoSwitch ? 'checked' : ''}/> ${tr(save, 'opt.auto')}</label>
    <label class="switch"><input type="checkbox" data-field="card" ${save.settings.catchCard ? 'checked' : ''}/> ${tr(save, 'opt.card')}</label>
    <label class="switch"><input type="checkbox" data-field="shake" ${save.settings.shake ? 'checked' : ''}/> ${tr(save, 'opt.shake')}</label>
    <label class="switch"><input type="checkbox" data-field="flash" ${save.settings.flashes ? 'checked' : ''}/> ${tr(save, 'opt.flash')}</label>
    <label class="switch"><input type="checkbox" data-field="motion" ${save.settings.reduceMotion ? 'checked' : ''}/> ${tr(save, 'opt.motion')}</label>
    <label class="switch"><input type="checkbox" data-field="swipe" ${save.settings.swipeTabs ? 'checked' : ''}/> ${tr(save, 'opt.swipe')}</label>
    <label class="switch"><input type="checkbox" data-field="haptic" ${save.settings.haptics ? 'checked' : ''}/> ${tr(save, 'opt.haptic')}</label>
    <div class="row-actions">
      <span>${tr(save, 'opt.font')}</span>
      ${([100, 115, 130] as const).map((size) => `<button type="button" data-act="font" data-size="${size}" class="${save.settings.font === size ? 'primary' : ''}">${size} %</button>`).join('')}
    </div>
    <label class="switch"><input type="checkbox" data-field="battery" ${save.settings.battery ? 'checked' : ''}/> ${tr(save, 'opt.battery')}</label>
    <p class="muted">${tr(save, 'opt.batteryNote')}</p>
    <label class="switch"><input type="checkbox" data-field="loop" ${save.loop ? 'checked' : ''}/> ${tr(save, 'nav.loop')}</label>
    <div class="row-actions">
      <span>${tr(save, 'opt.power')}</span>
      ${power(0, 'opt.powerOff')}${power(2, 'opt.power2')}${power(5, 'opt.power5')}
    </div>
    <h2>${tr(save, 'opt.export')}</h2>
    <textarea id="export-code" readonly rows="3">${esc(exportCode(save))}</textarea>
    <p><button data-act="copy-code">${tr(save, 'opt.copy')}</button></p>
    <h2>${tr(save, 'opt.import')}</h2>
    <textarea id="import-code" rows="3"></textarea>
    ${debug ? `<div class="card" style="padding:12px;margin-top:12px"><b>${tr(save, 'opt.debug')}</b><p class="muted">${tr(save, 'opt.debugNote')}</p><input id="debug-hours" type="number" min="0" step="0.1" value="10"/> <button type="button" class="primary" data-act="jump">${tr(save, 'opt.jump')}</button> <button type="button" data-act="debug-stars">${tr(save, 'chest.debug')}</button></div>` : ''}
    <p><button type="button" class="ghost" data-act="reset">${tr(save, 'opt.reset')}</button></p>
      </div>
    </div>
    <div class="menu-dock" data-dock="options">
      <button type="button" class="primary dock-primary" data-act="import-ask">${tr(save, 'opt.importBtn')}</button>
    </div>
  </div>`
}

function guide(save: SaveV2): string {
  return `<div class="menu-screen">
    <div class="menu-scroll">
      <div class="card panel"><h2>${tr(save, 'guide.title')}</h2>
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => `<p>${tr(save, `guide.${n}`)}</p>`).join('')}
      </div>
    </div>
  </div>`
}

function center(save: SaveV2, screen: Screen, now: number, pc: PcQuery, dex: CodexQuery, selected: string | null, debug: boolean, wheel: WheelPanel, shell: ShellFlags): string {
  if (screen === 'progress') return `<div class="menu-screen"><div class="menu-scroll">${progress(save)}</div></div>`
  if (screen === 'team') return team(save, pc, selected, shell)
  if (screen === 'codex') return codex(save, dex, shell)
  if (screen === 'activities') return activitiesView(save, now, selected, wheel)
  if (screen === 'shop') return shop(save, now)
  if (screen === 'achievements') return achievementsView(save)
  if (screen === 'options') return options(save, debug)
  return guide(save)
}

export function gameHtml(save: SaveV2, screen: Screen, now: number, pc: PcQuery, dex: CodexQuery, selected: string | null, sideOpen: boolean, debug: boolean, overlay: Overlay | null, step = save.step, wheel: WheelPanel = { tab: 'hort', mult: 1, symbols: null, note: '' }, shell: ShellFlags = {}): string {
  const adventure = screen === 'adventure'
  const mapOpen = Boolean(shell.mapOpen)
  const moreOpen = Boolean(shell.moreOpen)
  const chapter = chapterById(save.region, save.chapter)
  const map = mapOpen ? `<div class="map-sheet card">
      <label class="switch"><input type="checkbox" data-field="loop" ${save.loop ? 'checked' : ''}/> ${tr(save, 'nav.loop')}</label>
      <p class="muted">${tr(save, 'nav.crest', { name: save.badges.includes(chapter.guardian.badge) ? chapter.guardian.badge : '—' })}</p>
      ${progress(save)}
    </div>` : ''
  const typeScale = fontFactor(save.settings.font)
  return `<div id="stage" data-font="${save.settings.font}" data-swipe="${save.settings.swipeTabs ? '1' : '0'}" data-battery="${save.settings.battery ? '1' : '0'}" style="--font-scale:${typeScale}" class="${adventure ? 'is-adventure' : 'is-menu'} ${save.settings.reduceMotion ? 'reduce-motion' : ''}">
    <div class="band band-top"></div>
    <div class="safe">
      <div class="anchor anchor-top">
        ${header(save, now)}
        ${adventure ? chapterLine(save, step, mapOpen) : ''}
        ${adventure ? path(save, step) : ''}
      </div>
      <div class="anchor anchor-mid">${adventure ? battle(save, now) : center(save, screen, now, pc, dex, selected, debug, wheel, shell)}</div>
      <div class="anchor anchor-bot">
        ${adventure ? teamDock(save) : ''}
        ${adventure ? logBox(save) : ''}
        ${adventure ? sightings(save, sideOpen) : ''}
        ${tabbar(save, screen, moreOpen)}
      </div>
      ${map}
      ${adventure && sideOpen ? drawerSheet(save, now) : ''}
      ${moreSheet(save, moreOpen)}
      ${overlay ? `<div class="overlay overlay-sheet">${overlayHtml(save, overlay)}</div>` : ''}
    </div>
    <div class="band band-bot"></div>
  </div>`
}

function grab(): string {
  return `<div class="sheet-grab"><span class="sheet-handle"></span></div>`
}

function overlayHtml(save: SaveV2, overlay: Overlay): string {
  if (overlay.kind === 'chest-rates') {
    return `<div class="sheet" data-sheet="swipe">${grab()}<h2>${tr(save, CHEST_KEY[overlay.tier])}</h2>${chestRatesHtml(save, overlay.tier)}<button type="button" class="primary" data-act="close">${tr(save, 'chest.next')}</button></div>`
  }
  if (overlay.kind === 'chest-summary') {
    const lines = overlay.grants.map((grant) => `<li><b>${esc(grant.name)}</b> · ${esc(rarityInfo(grant.rarity).name)} · ${esc(chestPlace(save, grant))} · ${grant.gold.toLocaleString(L(save) === 'en' ? 'en' : 'de-DE')} G</li>`).join('')
    const goldSum = overlay.grants.reduce((sum, grant) => sum + grant.gold, 0)
    return `<div class="sheet" data-sheet="swipe">${grab()}<h2>${tr(save, 'chest.summary')}</h2><ul class="rate-list">${lines}</ul><p>${goldSum.toLocaleString(L(save) === 'en' ? 'en' : 'de-DE')} G</p><button type="button" class="primary" data-act="close">${tr(save, 'chest.next')}</button></div>`
  }
  if (overlay.kind === 'chest-reveal') {
    const grant = overlay.grant
    const color = rarityInfo(grant.rarity).color
    const particles = chestParticles(grant.rarity, save.settings.reduceMotion)
    const phase = overlay.hold ?? (save.settings.reduceMotion ? 'card' : 'seal')
    return `<div class="sheet chest-sheet">${grab()}
      <div class="chest-stage" data-phase="${phase}" data-particles="${particles}" data-reduced="${save.settings.reduceMotion ? '1' : '0'}">
        <img class="chest-seal" alt="" src="${art(SEAL_ADD)}" data-fb="${art(SEAL_FALLBACK)}"/>
        <div class="chest-beam" style="background:${color}"></div>
        <div class="chest-ring">${ringDots(particles)}</div>
        <article class="chest-card">
          <img src="${monsterArt(grant.speciesId, true)}" alt=""/>
          <h2>${esc(grant.name)}</h2>
          <p>${esc(rarityInfo(grant.rarity).name)}</p>
          <p>${esc(chestPlace(save, grant))}</p>
          <p>${grant.gold.toLocaleString(L(save) === 'en' ? 'en' : 'de-DE')} G</p>
        </article>
      </div>
      <button type="button" class="primary" data-act="chest-skip">${tr(save, 'chest.next')}</button>
    </div>`
  }
  if (overlay.kind === 'log') {
    return `<div class="sheet log-full" data-sheet="swipe">${grab()}<h2>${tr(save, 'log.title')}</h2><div class="log-full-body">${logLines(save, 50)}</div><button type="button" class="primary" data-act="close">${tr(save, 'log.close')}</button></div>`
  }
  if (overlay.kind === 'offline') {
    const pct = overlay.total ? Math.round((overlay.done / overlay.total) * 100) : 0
    return `<div class="sheet"><h2>${tr(save, 'offline.title')}</h2><div class="progress-track"><span style="width:${pct}%"></span></div><p>${overlay.done.toLocaleString(L(save) === 'en' ? 'en' : 'de-DE')} / ${overlay.total.toLocaleString(L(save) === 'en' ? 'en' : 'de-DE')}</p></div>`
  }
  if (overlay.kind === 'confirm-reset') {
    return `<div class="sheet" data-sheet="swipe">${grab()}<h2>${tr(save, 'reset.title')}</h2><p>${tr(save, 'reset.body')}</p><button class="primary" data-act="reset-yes">${tr(save, 'reset.yes')}</button> <button class="ghost" data-act="close">${tr(save, 'reset.no')}</button></div>`
  }
  if (overlay.kind === 'confirm-import') {
    return `<div class="sheet" data-sheet="swipe">${grab()}<h2>${tr(save, 'import.title')}</h2><p>${tr(save, 'import.body')}</p><button class="primary" data-act="import-yes">${tr(save, 'import.yes')}</button> <button class="ghost" data-act="close">${tr(save, 'reset.no')}</button></div>`
  }
  if (overlay.kind === 'awaken') {
    const mon = save.mons[overlay.uid]
    const sp = mon ? species(mon.species) : null
    return `<div class="sheet" data-sheet="swipe">${grab()}<div class="kicker">${tr(save, 'awaken.title')}</div><h2>${sp ? esc(sp.name) : ''}</h2>
      ${sp ? `<img class="hero" src="${monsterArt(sp.id, true)}" alt=""/>` : ''}
      <p>${tr(save, 'awaken.body', { name: sp?.name ?? '', level: overlay.level })}</p>
      <button class="primary" data-act="close">${tr(save, 'welcome.next')}</button></div>`
  }
  if (overlay.kind === 'welcome') {
    const hours = overlay.countedMs / 3600000
    const locale = L(save) === 'en' ? 'en' : 'de-DE'
    const away = hours >= 1 ? tr(save, 'welcome.hours', { n: hours.toLocaleString(locale, { maximumFractionDigits: 1 }) }) : tr(save, 'welcome.minutes', { n: Math.round(overlay.countedMs / 60000) })
    const capped = overlay.rawMs > overlay.countedMs + 1000
    const sprites = overlay.summary.catches.map((id) => `<img src="${monsterArt(id, true)}" alt="${esc(species(id).name)}" title="${esc(species(id).name)}"/>`).join('')
    const levels = overlay.summary.levels.map((row) => `<div>${esc(row.name)} ${row.from} → ${row.to}</div>`).join('')
    return `<div class="sheet" data-sheet="swipe">${grab()}<div class="sheet-body"><h2>${tr(save, 'welcome.title')}</h2>
      <p>${tr(save, 'welcome.time', { away, cap: capped ? tr(save, 'welcome.cap') : '' })}</p>
      <p>${tr(save, 'welcome.stats', { fights: overlay.summary.fights.toLocaleString(locale), dupes: overlay.summary.dupes.toLocaleString(locale), gold: gold(overlay.summary.gold) })}</p>
      <div class="catches">${sprites || `<span class="muted">${tr(save, 'welcome.none')}</span>`}</div>
      ${levels || `<p class="muted">${tr(save, 'welcome.levels')}</p>`}
      <p>${tr(save, 'welcome.badges', { names: overlay.summary.badges.length ? overlay.summary.badges.join(', ') : '—' })}</p>
    </div>
    <button type="button" class="primary" data-act="close">${tr(save, 'welcome.next')}</button>
    </div>`
  }
  if (overlay.kind === 'guard') {
    return `<div class="sheet" data-sheet="swipe">${grab()}<div class="sheet-body"><div class="kicker">${tr(save, 'guard.title')}</div><h2>${tr(save, overlay.win ? 'guard.win' : 'guard.loss')}</h2>
      <p>${esc(overlay.text)}</p>
      ${overlay.badge ? `<p>${tr(save, 'guard.badge', { name: esc(overlay.badge) })}</p>` : ''}
      ${overlay.gold ? `<p>${tr(save, 'guard.gold', { gold: overlay.gold.toLocaleString(L(save) === 'en' ? 'en' : 'de-DE') })}</p>` : ''}
    </div>
      <button type="button" class="primary" data-act="close">${tr(save, 'welcome.next')}</button>
    </div>`
  }
  if (overlay.kind === 'dex') return dexEntry(save, overlay.species)
  if (overlay.kind === 'catch') {
    const sp = species(overlay.species)
    return `<div class="sheet" data-sheet="swipe">${grab()}<div class="sheet-body"><div class="kicker">${tr(save, 'catch.got')}</div><h2>${esc(sp.name)}</h2>
      <img class="hero" src="${monsterArt(sp.id, true)}" alt=""/>
      <p>${esc(typeLabel(L(save), sp.type, typeName(sp.type)))} · ${esc(rarityLabel(L(save), sp.baseRarity, rarityName(sp.id)))} · Lv ${overlay.level}</p>
      <p>${esc(sp.blurb)}</p>
      <p>${tr(save, overlay.place === 'team' ? 'catch.team' : 'catch.pc')}</p>
    </div>
      <button type="button" class="primary" data-act="close">${tr(save, 'welcome.next')}</button>
    </div>`
  }
  return card(save, overlay.uid)
}

function dexEntry(save: SaveV2, id: string): string {
  const sp = species(id)
  const base = baseLine(id)
  const status = dexStatus(save, id)
  const places = dexPlaces(id)
  const hidden = status === 'missing'
  const where = places.length
    ? places.map((place) => `<div>${esc(place.region)} · ${esc(place.chapter)} · ${esc(whenLabel(L(save), place.when))}</div>`).join('')
    : `<div class="muted">${tr(save, 'codex.noPlace')}</div>`
  return `<div class="sheet" data-sheet="swipe">${grab()}<div class="sheet-body">
    <img class="hero ${hidden ? 'sil' : ''}" src="${monsterArt(id, true)}" alt=""/>
    <div class="kicker">Nr. ${speciesNumber(id)} · ${dexStatusLabel(status)}</div>
    <h2>${esc(sp.name)}</h2>
    <p>${esc(typeName(sp.type))} · ${esc(rarityInfo(sp.baseRarity).name)} · Fangzahl ${(save.dex[id]?.caught ?? 0).toLocaleString('de-DE')}</p>
    <div class="stats">
      <div class="stat">HP<br/>${base.hp}</div>
      <div class="stat">ATK<br/>${base.atk}</div>
      <div class="stat">DEF<br/>${base.def}</div>
      <div class="stat">SPD<br/>${base.spd}</div>
    </div>
    <p><b>${esc(sp.skill.name ?? 'Fähigkeit')}</b> — ${esc(sp.skill.description ?? '')}</p>
    <p>${esc(sp.blurb)}</p>
    <p><b>Fundorte</b></p>
    ${where}
    </div>
    <button type="button" class="primary" data-act="close">${tr(save, 'codex.close')}</button>
  </div>`
}

function card(save: SaveV2, uid: string): string {
  const mon = save.mons[uid]
  if (!mon) return `<div class="sheet sheet-full" data-sheet="swipe">${grab()}<p>${tr(save, 'card.none')}</p><button type="button" class="primary" data-act="close">${tr(save, 'codex.close')}</button></div>`
  const sp = species(mon.species)
  const stats = monStats(mon)
  const need = expToNext(mon.lvl)
  const pct = Math.max(0, Math.min(100, (mon.exp / need) * 100))
  const when = new Date(mon.caughtAt).toLocaleString('de-DE')
  return `<div class="sheet sheet-full" data-sheet="swipe">${grab()}
    <div class="sheet-body">
    <img class="hero" src="${monsterArt(sp.id, true)}" alt=""/>
    <h2>${esc(sp.name)}${mon.shiny ? ' · Schimmer' : ''} · ${tr(save, 'chest.star', { n: save.stars[sp.id] ?? 0 })}</h2>
    <p>${esc(typeLabel(L(save), sp.type, typeName(sp.type)))} · ${esc(rarityLabel(L(save), sp.baseRarity, rarityInfo(sp.baseRarity).name))} · Lv ${mon.lvl} · ${tr(save, 'card.awaken', { n: mon.lvl >= 50 ? 2 : mon.lvl >= 25 ? 1 : 0 })}</p>
    <div class="bar-exp"><span style="width:${pct}%"></span></div>
    <p class="muted">EP ${mon.exp.toLocaleString('de-DE')} / ${need.toLocaleString('de-DE')}</p>
    <div class="stats">
      <div class="stat">HP<br/>${stats.hp}</div>
      <div class="stat">ATK<br/>${stats.atk}</div>
      <div class="stat">DEF<br/>${stats.def}</div>
      <div class="stat">SPD<br/>${stats.spd}</div>
    </div>
    <p><b>${esc(sp.skill.name ?? 'Fähigkeit')}</b> — ${esc(sp.skill.description ?? '')}</p>
    <p>${esc(sp.blurb)}</p>
    <p class="muted">${tr(save, 'card.caught', { when, where: placeLabel(mon.caughtWhere, L(save)) })}</p>
    <label class="switch"><input type="checkbox" data-field="buddy" data-uid="${uid}" ${save.buddy === uid ? 'checked' : ''}/> ${tr(save, 'team.buddy')}</label>
    <label class="switch"><input type="checkbox" data-field="keep" data-uid="${uid}" ${mon.keepDupes ? 'checked' : ''}/> ${tr(save, 'card.keep')}</label>
    <p>${tr(save, 'chest.star', { n: save.stars[sp.id] ?? 0 })} · ${save.shards[sp.id] ?? 0}</p>
    ${(save.stars[sp.id] ?? 0) < 5 ? `<button type="button" class="primary" data-act="star" data-id="${sp.id}">${tr(save, 'chest.starUp')} (${starCost(sp.baseRarity, (save.stars[sp.id] ?? 0) + 1)})</button>` : ''}
    </div>
    <button type="button" class="primary" data-act="close">${tr(save, 'codex.close')}</button>
  </div>`
}

export function onboardingHtml(name: string, avatar: 'A' | 'B', picked: string, lang: Lang = 'de'): string {
  const chosen = picked ? species(picked) : null
  const stats = picked ? monStats(makePreview(picked)) : null
  return `<div id="stage" class="onboard">
    <div>
      <div class="kicker">${t(lang, 'start.kicker')}</div>
      <h1>Grünmark</h1>
      <p>${t(lang, 'start.lead')}</p>
      <div class="row-actions"><button data-act="lang" data-lang="de" class="${lang === 'de' ? 'primary' : ''}">Deutsch</button><button data-act="lang" data-lang="en" class="${lang === 'en' ? 'primary' : ''}">English</button></div>
    </div>
    <div class="card panel">
      <label>${t(lang, 'start.name')}<br/><input class="start-name" data-field="name" maxlength="24" value="${esc(name)}"/></label>
      <p>${t(lang, 'start.avatar')}</p>
      <div class="choices">
        <button class="choice ${avatar === 'A' ? 'on' : ''}" data-act="avatar" data-avatar="A"><div class="avatar">A</div>A</button>
        <button class="choice ${avatar === 'B' ? 'on' : ''}" data-act="avatar" data-avatar="B"><div class="avatar b">B</div>B</button>
      </div>
      <p>${t(lang, 'start.starter')}</p>
      <div class="choices">
        ${STARTERS.map((starter) => `<button class="pick ${picked === starter.id ? 'on' : ''}" data-act="pick" data-species="${starter.id}"><img src="${monsterArt(starter.id, true)}" alt=""/><div>${esc(starter.label)}</div></button>`).join('')}
      </div>
      ${chosen && stats ? `<div class="card" style="padding:12px;margin-top:12px">
        <h2>${esc(chosen.name)}</h2>
        <p>${esc(typeName(chosen.type))} · ${esc(rarityInfo(chosen.baseRarity).name)} · Lv 5</p>
        <div class="stats">
          <div class="stat">HP<br/>${stats.hp}</div><div class="stat">ATK<br/>${stats.atk}</div><div class="stat">DEF<br/>${stats.def}</div><div class="stat">SPD<br/>${stats.spd}</div>
        </div>
        <p><b>${esc(chosen.skill.name ?? '')}</b> — ${esc(chosen.skill.description ?? '')}</p>
        <p>${esc(chosen.blurb)}</p>
        <button class="primary" data-act="start">${t(lang, 'start.go')}</button>
      </div>` : `<p class="muted">${t(lang, 'start.pick')}</p>`}
    </div>
  </div>`
}

function makePreview(id: string) {
  return { species: id, lvl: 5, exp: 0, hp: null, shiny: false, caughtAt: 0, caughtWhere: 'r1c1', keepDupes: false }
}
