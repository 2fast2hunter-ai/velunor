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
import { colorHex, colorId, skinHex } from './avatar'
import { nameProblem } from './home'
import { exportCode } from './save'
import type { AvatarLook } from './types'
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
import { workshopCost } from './sources'
import {
  SHOP_ART,
  compactAmount,
  quotaLine,
  shopOffers,
  stockLine,
  type ShopOffer,
  type ShopTab
} from './shopOffer'
import { UI_ART, type UiArtId } from './uiArt'
import { fightsHere } from './origin'
import { chapterById, councilOf, gateBadge, placeLabel, regionById, regions, routeOf, type NodeKind } from './route'
import { chapterUnlocked, dexCaughtCount, hereSightings, rarityName } from './sim'
import { GOALS } from './achievements'
import { HORT_PRICES, hortOffer } from './hort'
import { fruitDef, fruitMinutes } from './shop'
import { teamWeatherMarks, weatherArrow, weatherForecast, weatherName, WEATHER_SHIFTS, type WeatherId } from './weather'
import { typeArrow } from './order'
import { activeCombos } from './combo'
import { councilAssignment, guardianAssignment, mechIcon, mechName, mechTip, type MechId } from './mech'
import { ultName, ultPattern } from './ult'
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
  | { kind: 'shop-confirm'; offerId: string }
  | { kind: 'shop-info'; offerId: string }
  | { kind: 'wallet'; id: 'gold' | 'marks' }

export interface ShellFlags {
  mapOpen?: boolean
  moreOpen?: boolean
  /** A fight is on screen. The preview card stays off the field. */
  fighting?: boolean
  /** Scroll offset of the PC viewport, in logical px. */
  pcScroll?: number
  /** Measured PC viewport height. 0 uses the fallback. */
  pcView?: number
  filtersOpen?: boolean
  dexOpen?: boolean
  shopTab?: ShopTab
  shopHint?: boolean
}

const base = (): string => import.meta.env.BASE_URL || '/'

export function art(path: string): string {
  return assetPath(path, base())
}

function ui(id: UiArtId): string {
  return `<img class="ui-icon" src="${art(UI_ART[id])}" alt=""/>`
}

function portrait(speciesId: string, large = false, extra = ''): string {
  const color = rarityInfo(species(speciesId).baseRarity).color
  return `<img class="portrait ${extra}" style="--rarity:${color}" src="${monsterArt(speciesId, large)}" alt=""/>`
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
    <div class="hud-dex">${ui('codexCount')}${tr(save, 'nav.codexCount', { n: caught })}</div>
    <div class="hud-clock">${ui('clock')}${esc(clock.time)} · ${esc(clock.part)}</div>
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
    ${lookFace(save.look)}${ui('chapter')}<span class="chapter-text">${esc(region.name)} · ${esc(chapter.name)} · ${esc(place)}</span>
    <span class="chev" aria-hidden="true">${ui('chevron')}</span>
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
  const items: [Screen, UiArtId, string][] = [
    ['shop', 'moreShop', 'nav.shop'],
    ['achievements', 'moreAchievements', 'nav.achievements'],
    ['options', 'moreOptions', 'nav.options'],
    ['guide', 'moreGuide', 'nav.guide']
  ]
  return `<div class="more-sheet card" ${open ? '' : 'hidden'}>
    <div class="more-who">${lookFace(save.look)}<b>${esc(save.name)}</b></div>
    ${items.map(([id, icon, label]) => `<button type="button" data-act="screen" data-screen="${id}">${ui(icon)}${tr(save, label)}</button>`).join('')}
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

function battle(save: SaveV2, now: number, fighting = false): string {
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
        <button type="button" class="status-mark" id="foe-status" data-act="status" data-who="foe" hidden><img alt=""/></button>
        <p class="status-tip" id="foe-tip" hidden></p>
        <b id="foe-name"><img class="wx-arrow" id="foe-arrow" alt="" hidden/></b>
        <div class="mech-row" id="foe-mechs" hidden></div>
        <img class="helper" id="foe-helper" alt="" hidden/>
        <div class="hp"><span id="foe-hp" style="width:100%"></span></div>
        <div class="ult" id="foe-ult" data-n="0" hidden></div>
        <img class="sprite" id="foe-sprite" alt="" hidden/>
        <span class="ground-shadow"></span>
      </div>
      <div class="combatant ally" id="ally-actor" style="left:${ALLY_X}%;top:${FEET_Y}%">
        <button type="button" class="status-mark" id="ally-status" data-act="status" data-who="ally" hidden><img alt=""/></button>
        <p class="status-tip" id="ally-tip" hidden></p>
        <div class="konter-label" id="konter-label" hidden>Konter!</div>
        <b id="ally-name">${mon ? esc(species(mon.species).name) : ''}<img class="wx-arrow" id="ally-arrow" alt="" ${mon && weatherArrow(weatherForecast(now)[0].weather, species(mon.species).type) ? `src="${art(weatherArrow(weatherForecast(now)[0].weather, species(mon.species).type) === 'up' ? 'battle/stat_up.png' : 'battle/stat_down.png')}"` : 'hidden'}/></b>
        <div class="hp"><span id="ally-hp" style="width:${(hp.hp / hp.max) * 100}%"></span></div>
        <div class="ult ${mon && mon.lvl >= 25 ? '' : 'is-locked'}" id="ally-ult" data-n="0" title="${mon && mon.lvl >= 25 ? 'Ult' : 'ab Level 25'}"></div>
        <div id="aura-flash" class="aura-flash" hidden></div>
        ${mon ? `<img class="sprite ${mon.shiny ? 'is-shiny' : ''}" id="ally-sprite" src="${monsterArt(mon.species, true)}" alt=""/>` : ''}
        <span class="ground-shadow"></span>
      </div>
      <div id="floats"></div>
      <div class="move-banner" id="move-banner" hidden></div>
      <div class="name-banner" id="name-banner" hidden></div>
      <div class="crit-flash" id="crit-flash"></div>
      <div class="boss-intro" id="boss-intro" hidden></div>
      <button type="button" class="victory" id="victory" hidden></button>
      <img class="crest-fly" id="crest-fly" alt="" hidden/>
    </div>
    <div class="flash" id="flash"></div>
    <img class="seal" id="seal" alt="" src="${art(SEAL_ADD)}" data-fb="${art(SEAL_FALLBACK)}" style="left:${FOE_X}%;top:${FOE_Y}%"/>
    <div class="battle-top">
      <p id="battle-text" class="battle-status">${tr(save, 'battle.place', { part: clock.part, weather: weatherLabel(L(save), weatherForecast(now)[0].weather), place: chapter.name, state: tr(save, save.hold ? 'battle.waiting' : 'battle.walking') })}</p>
      <div class="wx-stack"><div class="wx-chip" id="wx-chip">${weatherChip(save, now)}</div></div>
      ${bossAhead(save) ? `<p class="wx-preview">${esc(weatherPreview(save, now))}</p>` : ''}
    </div>
    ${sealed ? '' : `<div class="guard-dock">${fighting ? '' : guardCard(save)}<button type="button" class="primary challenge-fab" data-act="challenge">${ui('challenge')}${tr(save, chapter.council || chapter.foyer ? 'battle.resume' : 'battle.challenge')}</button></div>`}
  </div>`
}

function teamDock(save: SaveV2): string {
  const active = save.active && save.mons[save.active] ? save.active : save.team[0]
  const slots = Array.from({ length: 6 }, (_, index) => save.team[index] ?? '')
  const minis = slots.map((uid) => {
    if (!uid || !save.mons[uid]) return `<span class="mini is-empty" aria-hidden="true">${ui('slotEmpty')}</span>`
    const row = save.mons[uid]
    const bar = realHp(row)
    const fainted = !isAlive(row)
    return `<button type="button" class="mini ${uid === active ? 'is-active' : ''} ${fainted ? 'is-fainted' : ''}" data-act="send" data-uid="${uid}">
      ${portrait(row.species)}
      <span class="bar"><span style="width:${fainted ? 0 : (bar.hp / bar.max) * 100}%"></span></span>
    </button>`
  }).join('')
  const combos = activeCombos(save.team.flatMap((uid) => {
    const mon = save.mons[uid]
    return mon ? [species(mon.species).type] : []
  }))
  const comboName = combos.map((row) => row.name).join(', ')
  const combo = combos.length
    ? `<span class="combo-slot"><button type="button" class="combo-mark" data-act="combo" data-tip="${esc(comboName)}" aria-label="${esc(comboName)}"><img src="${art('battle/combo_synergy_64.png')}" alt=""/></button><p class="combo-tip" id="combo-tip" hidden></p></span>`
    : ''
  const speeds = ([1, 2, 3] as const).map((speed) => {
    const iconId = speed === 1 ? 'speed1' : speed === 2 ? 'speed2' : 'speed3'
    return `<button type="button" data-act="speed" data-speed="${speed}" class="${save.settings.speed === speed ? 'on' : ''}">${ui(iconId)}×${speed}</button>`
  }).join('')
  return `<div class="dock${combo ? ' has-combo' : ''}">
    ${combo}
    <div class="team-rail">${minis}</div>
    <div class="speed" aria-label="×1 ×2 ×3">${speeds}</div>
  </div>`
}

function logLines(save: SaveV2, limit: number): string {
  const lines = [...save.log].reverse().slice(0, limit).map((line) => `<div>${esc(line.text)}</div>`).join('')
  return lines || `<div class="muted">${tr(save, 'log.empty')}</div>`
}

function logBox(save: SaveV2): string {
  return `<button type="button" class="card log" id="log" data-act="log">${ui('log')}${logLines(save, 3)}</button>`
}

function weatherChip(save: SaveV2, now: number): string {
  const weather = weatherForecast(now)[0].weather
  const row = WEATHER_SHIFTS[weather]
  const bit = (type: TypeId, pct: number, sign: string) => `${esc(typeLabel(L(save), type, typeName(type)))} ${sign}${pct} %`
  const parts = [...row.up.map((shift) => bit(shift.type, shift.pct, '+')), ...row.down.map((shift) => bit(shift.type, shift.pct, '−'))]
  return `<img src="${art(`battle/weather_icon_${weather}.png`)}" alt=""/> ${esc(weatherLabel(L(save), weather))} · ${parts.join(' · ')}`
}

function bossAhead(save: SaveV2): boolean {
  const chapter = chapterById(save.region, save.chapter)
  if (chapter.council || chapter.special || chapter.foyer) return true
  return routeOf(chapter.id)[save.step] === 'guardian'
}

function guardCard(save: SaveV2): string {
  const chapter = chapterById(save.region, save.chapter)
  const badge = gateBadge(save.region, chapter)
  if (badge && save.badges.includes(badge)) return ''
  let speciesId = chapter.guardian.team[0]?.species ?? ''
  if (chapter.council) {
    const member = chapter.council.members.find((row) => !save.councilBeaten.includes(row.id))
    speciesId = member?.team[0]?.species ?? speciesId
  }
  if (!speciesId) return ''
  const foeType = species(speciesId).type
  const bits = save.team.flatMap((uid) => {
    const mon = save.mons[uid]
    if (!mon) return []
    const arrow = typeArrow(species(mon.species).type, foeType)
    const mark = arrow === 'up'
      ? `<b class="up">▲</b>`
      : arrow === 'down'
        ? `<b class="down">▼</b>`
        : ''
    return [`<span>${esc(species(mon.species).name)}${mark}</span>`]
  }).join('')
  const lead = bossLead(save)
  const preview = lead ? bossPreview(lead.speciesId, lead.level, lead.mechs) : ''
  return `<div class="guard-card"><div class="guard-title">Gegen ${esc(typeName(foeType))}</div><div class="guard-names">${bits}</div>${preview}</div>`
}

function bossLead(save: SaveV2): { speciesId: string; level: number; mechs: MechId[] } | null {
  const chapter = chapterById(save.region, save.chapter)
  if (chapter.foyer) {
    const council = councilOf(save.region)
    const member = council?.council?.members.find((row) => !save.councilBeaten.includes(row.id))
    const lead = member?.team[0]
    if (!member || !lead) return null
    return { speciesId: lead.species, level: lead.level, mechs: councilAssignment(member.id) }
  }
  if (chapter.council) {
    const member = chapter.council.members.find((row) => !save.councilBeaten.includes(row.id))
    const lead = member?.team[0]
    if (!member || !lead) return null
    return { speciesId: lead.species, level: lead.level, mechs: councilAssignment(member.id) }
  }
  const lead = chapter.guardian.team[0]
  if (!lead) return null
  return { speciesId: lead.species, level: lead.level, mechs: guardianAssignment(chapter.guardian.badge, chapter.guardian.name, Boolean(chapter.special)) }
}

function bossPreview(speciesId: string, _level: number, mechs: MechId[]): string {
  const lines = mechs.map((id) => `<div class="mech-line"><img src="${art(mechIcon(id))}" alt=""/><span><b>${esc(mechName(id))}</b>${esc(mechTip(id))}</span></div>`).join('')
  return `${lines}<div class="guard-ult"><div>Boss-Ult: ${esc(ultName(ultPattern(speciesId)))}</div><span class="ult" data-n="0"></span></div>`
}

function weatherPreview(save: SaveV2, now: number): string {
  const weather = weatherForecast(now)[0].weather
  const types = save.team.flatMap((uid) => {
    const mon = save.mons[uid]
    return mon ? [species(mon.species).type] : []
  })
  const marks = teamWeatherMarks(types, weather)
  return `Jetzt: ${weatherLabel(L(save), weather)}. Dein Team: ${marks.up} ▲, ${marks.down} ▼`
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
        ${portrait(row.species, false, row.caught ? '' : 'sil')}
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
    ${ui('traces')}<i class="grip-pill"></i>
    <span>${tr(save, 'side.seen')}</span>
  </button>`
}

function fruitCard(save: SaveV2, now: number, open: boolean): string {
  const active = save.activeFruits.filter((fruit) => fruit.until > now)
  const rows = active.map((fruit) => `<div class="fruit-row"><b>${esc(fruitDef(fruit.id).name)}</b><span>${fruitMinutes(fruit.until, now)} min</span></div>`).join('')
  return `<div class="card side-card">
    <h2>${ui('fruitBuff')}${tr(save, 'fruit.title')}</h2>
    ${open ? (rows || `<p class="muted">${tr(save, 'fruit.none')}</p>`) : `<p class="muted">${active.length}</p>`}
  </div>`
}

function progress(save: SaveV2): string {
  const region = regionById(save.region)
  const switches = regions.map((entry) => {
    const open = save.regionsOpen.includes(entry.id)
    const here = save.region === entry.id
    return `<button data-act="region" data-region="${entry.id}" class="${here ? 'primary' : ''}" ${open ? '' : 'disabled'}>${ui('region')}${esc(entry.name)}</button>`
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
      ${ui('chapterMark')}<b>${esc(chapter.name)}</b> ${here ? '· hier' : ''}
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
      ${portrait(sp.id)}
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
    if (!uid || !save.mons[uid]) return `<div class="mon-card slot" aria-hidden="true"><img class="slot-ghost" src="${art(UI_ART.slotEmpty)}" alt=""/><span class="slot-num">${index + 1}</span></div>`
    const mon = save.mons[uid]
    return `<button type="button" class="mon-card ${selected === uid ? 'on' : ''}" data-act="select" data-uid="${uid}" data-index="${index}" data-press="card" draggable="true" data-drag="team">
      ${portrait(mon.species)}
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
      <button type="button" data-act="nudge" data-dir="-1">${ui('forward')}${tr(save, 'team.forward')}</button>
      <button type="button" data-act="nudge" data-dir="1">${ui('back')}${tr(save, 'team.back')}</button>
      <button type="button" data-act="to-pc">${ui('toPc')}${tr(save, 'team.toPc')}</button>
      <button type="button" data-act="to-team">${ui('toTeam')}${tr(save, 'team.toTeam')}</button>
      <button type="button" data-act="card" data-uid="${selected ?? ''}">${ui('card')}${tr(save, 'team.card')}</button>
    </div>
    <div class="filter-sheet ${shell.filtersOpen ? 'open' : ''}">
      <button type="button" class="filter-bar" data-act="filters" aria-expanded="${shell.filtersOpen ? 'true' : 'false'}">${ui('filter')}${tr(save, 'team.filters')} · ${esc(sortLabel)}</button>
      <div class="filter-body">
        <input data-field="q" placeholder="${esc(tr(save, 'team.search'))}" value="${esc(query.q)}"/>
        <select data-field="type"><option value="">${tr(save, 'team.type')}</option>${typeOptions(query.type)}</select>
        <select data-field="rarity"><option value="">${tr(save, 'team.rarity')}</option>${rarityOptions(query.rarity)}</select>
        <select data-field="shiny">${shinyOptions(save, query.shiny, false)}</select>
        <select data-field="sort">
          ${SORTS.map(([id, key]) => `<option value="${id}" ${query.sort === id ? 'selected' : ''}>${tr(save, key)}</option>`).join('')}
        </select>
        <button type="button" data-act="dir">${ui('sort')}${query.dir < 0 ? tr(save, 'team.down') : tr(save, 'team.up')}</button>
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
    return `<div class="region-bar">${ui('regionBar')}<div><div class="muted">${label}</div><div class="progress-track"><span style="width:${row.placeholder ? 0 : pct}%"></span></div></div></div>`
  }).join('')
  const rows = listCodex(save, filter)
  const cells = rows.map((mon) => {
    const status = dexStatus(save, mon.id)
    const hidden = status === 'missing'
    return `<button type="button" class="mon-card" data-act="dex" data-species="${mon.id}">
      ${portrait(mon.id, false, status === 'owned' || status === 'released' ? '' : 'sil').replace('style="', hidden ? 'style="opacity:.25;' : 'style="')}
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
      <button type="button" class="filter-bar" data-act="dex-filters" aria-expanded="${shell.dexOpen ? 'true' : 'false'}">${ui('filter')}${tr(save, 'team.filters')}</button>
      <div class="filter-body">
        <input data-field="dex-q" placeholder="${esc(tr(save, 'codex.search'))}" value="${esc(filter.q)}"/>
        <select data-field="dex-type"><option value="">${tr(save, 'team.type')}</option>${typeOptions(filter.type)}</select>
        <select data-field="dex-rarity"><option value="">${tr(save, 'team.rarity')}</option>${rarityOptions(filter.rarity)}</select>
        <select data-field="dex-shiny">${shinyOptions(save, filter.shiny, true)}</select>
      </div>
    </div>
  </div>`
}

function coin(kind: 'gold' | 'marks', large = false): string {
  const src = kind === 'gold'
    ? (large ? SHOP_ART.gold : SHOP_ART.goldSm)
    : (large ? SHOP_ART.marks : SHOP_ART.marksSm)
  return `<img class="coin" src="${art(src)}" alt=""/>`
}

function shopCard(save: SaveV2, row: ShopOffer, now: number): string {
  const buy = row.canBuy
    ? `${coin(row.pay)} ${row.price.toLocaleString('de-DE')}`
    : esc(row.reason)
  const info = row.info === 'chest' && row.chestTier
    ? `<button type="button" class="shop-info" data-act="chest-info" data-tier="${row.chestTier}" aria-label="Raten">${ui('info')}</button>`
    : `<button type="button" class="shop-info" data-act="shop-info" data-id="${row.id}" aria-label="Info">${ui('info')}</button>`
  const limit = row.quota ? `<p class="shop-limit">${esc(quotaLine(row.quota, now, save.settings.lang))}</p>` : ''
  const picture = row.art
    ? `<img class="shop-item" src="${art(row.art)}" alt=""${row.pict ? ` style="height:${row.pict}%"` : ''}/>`
    : ''
  return `<article class="shop-card ${row.tone}" data-offer="${row.id}" style="border-image-source:url('${art(SHOP_ART.frame)}')">
    <div class="shop-art${row.foot ? ' foot' : ''}" style="background-image:url('${art(row.plate)}')">${picture}${info}</div>
    <h3>${esc(row.name)}</h3>
    <p>${esc(row.effect)}</p>
    ${limit}
    <button type="button" class="shop-buy ${row.canBuy ? 'can' : 'blocked'}" data-act="${row.canBuy ? 'shop-buy' : 'shop-blocked'}" data-id="${row.id}" data-reason="${esc(row.reason)}">${buy}</button>
  </article>`
}

function shop(save: SaveV2, now: number, tab: ShopTab, hint: boolean): string {
  const rows = shopOffers(save, now).filter((row) => row.tab === tab)
  const groups = [...new Set(rows.map((row) => row.group))]
  const body = groups.map((group) => `<h3 class="shop-group">${esc(group)}</h3><div class="shop-grid">${rows.filter((row) => row.group === group).map((row) => shopCard(save, row, now)).join('')}</div>`).join('')
  const tabs: [ShopTab, UiArtId, string][] = [
    ['chests', 'tabChests', tr(save, 'shop.tab.chests')],
    ['boost', 'tabBoost', tr(save, 'shop.tab.boost')],
    ['marks', 'tabMarks', tr(save, 'shop.tab.marks')]
  ]
  const stock = tab === 'chests'
    ? `<button type="button" class="shop-stock" data-act="activity" data-id="chests">${ui('storage')}${esc(tr(save, 'shop.stock', { n: stockLine(save) }))}</button>`
    : ''
  const open = hint
    ? `<button type="button" class="shop-toast" data-act="activity" data-id="chests">${esc(tr(save, 'shop.open'))}</button>`
    : ''
  return `<div class="shop-screen" lang="${L(save)}">
    <header class="shop-head">
      <h2>${esc(tr(save, 'shop.head'))}</h2>
      <button type="button" class="wallet" data-act="wallet" data-id="gold">${coin('gold', true)}<b>${compactAmount(save.gold)}</b></button>
      <button type="button" class="wallet" data-act="wallet" data-id="marks">${coin('marks', true)}<b>${compactAmount(save.marks)}</b></button>
    </header>
    <div class="shop-tabs" data-shop-tabs="1" style="--tab-bar:url('${art(SHOP_ART.tabBar)}');--tab-on:url('${art(SHOP_ART.tabOn)}');--tab-off:url('${art(SHOP_ART.tabOff)}')">
      ${tabs.map(([id, icon, label]) => `<button type="button" data-act="shop-tab" data-id="${id}" class="${tab === id ? 'on' : ''}">${ui(icon)}${label}</button>`).join('')}
    </div>
    <div class="shop-scroll">${body}${stock}</div>
    ${open}
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
  return `<button type="button" data-act="activity" data-id="hort" class="${wheel.tab === 'hort' ? 'primary' : ''}">${ui('hort')}${tr(save, 'act.hort')}</button>
    <button type="button" data-act="activity" data-id="chests" class="${wheel.tab === 'chests' ? 'primary' : ''}">${ui('chests')}${tr(save, 'act.chests')}</button>
    <button type="button" data-act="activity" data-id="wheel" class="${wheel.tab === 'wheel' ? 'primary' : ''}">${ui('wheel')}${tr(save, 'act.wheel')}</button>`
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
      <img class="ui-icon chest-art" src="${art(SHOP_ART.chest[tier])}" alt=""/>
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
        <p>${ui('road')}${tr(save, 'chest.road', { n: save.roadReady })}</p>
        <button type="button" class="primary" data-act="chest-claim" ${save.roadReady > 0 ? '' : 'disabled'}>${ui('road')}${tr(save, 'chest.claim')}</button>
        <p class="muted">${tr(save, 'shop.inShop')}</p>
        <h3>${ui('dust')}Werkstatt</h3>
        <p>${ui('dust')}Velunorstaub ${save.dust}</p>
        ${poolFor(enteredRegions(save)).filter((id) => !Object.values(save.mons).some((mon) => mon.species === id)).slice(0, 6).map((id) => {
          const sp = species(id)
          return `<button type="button" data-act="craft" data-id="${id}">${portrait(id)}${esc(sp.name)} · ${workshopCost(sp.baseRarity)} Staub</button>`
        }).join('')}
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
        <div class="prize-line">${portrait(sp.id, true)}<div><b>${esc(sp.name)}</b><div class="muted">${esc(prize.regionName)} · Lv 5</div></div></div>
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
      <button type="button" class="primary dock-primary" data-act="spin" ${open ? '' : 'disabled'}>${ui('spin')}${tr(save, 'wheel.spin')}</button>
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
      ${portrait(sp.id)}
      <div>${esc(sp.name)}${mon.shiny ? ' · Schimmer' : ''}</div>
      <div class="muted">Lv ${mon.lvl} · ${esc(typeName(sp.type))}</div>
    </button>`
  }).join('')
  const eggs = save.eggs.map((egg) => {
    const left = Math.max(0, egg.readyAt - now)
    const hours = Math.floor(left / 3600000)
    const mins = Math.ceil((left % 3600000) / 60000)
    return `<div class="list-row">${ui('egg')}<b>${esc(species(egg.species).name)}</b><span>${left <= 0 ? tr(save, 'hort.hatch') : `${hours} h ${mins} min`}</span></div>`
  }).join('')
  const buy = offer
    ? `<button type="button" class="primary dock-primary" data-act="buy-hort" ${offer.locked ? 'disabled' : ''}>${ui('hortBuy')}${tr(save, 'hort.buy', { slot: offer.slot, price: offer.price.toLocaleString(locale) })}${offer.locked ? ` · ${esc(tr(save, offer.locked))}` : ''}</button>`
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
      <button type="button" data-act="to-hort">${ui('hortIn')}${tr(save, 'hort.to')}</button>
      <button type="button" data-act="from-hort">${ui('hortOut')}${tr(save, 'hort.from')}</button>
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
      ${ui('achieve')}<div><b>${esc(name)}</b><div class="muted">${have ? tr(save, 'ach.have', { title, frame: goal.frame }) : tr(save, 'ach.open')} · ${goal.gold.toLocaleString(L(save) === 'en' ? 'en' : 'de-DE')} G</div></div>
      ${have ? `<div class="list-actions"><button type="button" data-act="equip-title" data-id="${goal.id}">${ui('equipTitle')}${tr(save, 'ach.titleBtn')}</button><button type="button" data-act="equip-frame" data-id="${goal.id}">${ui('equipFrame')}${tr(save, 'ach.frameBtn')}</button></div>` : ''}
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
      <span>${ui('lang')}${tr(save, 'opt.lang')}</span>
      <button data-act="lang" data-lang="de" class="${L(save) === 'de' ? 'primary' : ''}">Deutsch</button>
      <button data-act="lang" data-lang="en" class="${L(save) === 'en' ? 'primary' : ''}">English</button>
    </div>
    <div class="row-actions">
      <span>${ui('speed1')}${tr(save, 'opt.speed')}</span>
      ${([1, 2, 3] as const).map((speed) => {
        const iconId = speed === 1 ? 'speed1' : speed === 2 ? 'speed2' : 'speed3'
        return `<button data-act="speed" data-speed="${speed}" class="${save.settings.speed === speed ? 'primary' : ''}">${ui(iconId)}×${speed}</button>`
      }).join('')}
    </div>
    <label class="switch">${ui('optAuto')}<input type="checkbox" data-field="auto" ${save.settings.autoSwitch ? 'checked' : ''}/> ${tr(save, 'opt.auto')}</label>
    <label class="switch">${ui('optCard')}<input type="checkbox" data-field="card" ${save.settings.catchCard ? 'checked' : ''}/> ${tr(save, 'opt.card')}</label>
    <label class="switch">${ui('optShake')}<input type="checkbox" data-field="shake" ${save.settings.shake ? 'checked' : ''}/> ${tr(save, 'opt.shake')}</label>
    <label class="switch">${ui('optFlash')}<input type="checkbox" data-field="flash" ${save.settings.flashes ? 'checked' : ''}/> ${tr(save, 'opt.flash')}</label>
    <label class="switch">${ui('optMotion')}<input type="checkbox" data-field="motion" ${save.settings.reduceMotion ? 'checked' : ''}/> ${tr(save, 'opt.motion')}</label>
    <label class="switch">${ui('optSwipe')}<input type="checkbox" data-field="swipe" ${save.settings.swipeTabs ? 'checked' : ''}/> ${tr(save, 'opt.swipe')}</label>
    <label class="switch">${ui('optHaptic')}<input type="checkbox" data-field="haptic" ${save.settings.haptics ? 'checked' : ''}/> ${tr(save, 'opt.haptic')}</label>
    <div class="row-actions">
      <span>${ui('optFont')}${tr(save, 'opt.font')}</span>
      ${([100, 115, 130] as const).map((size) => `<button type="button" data-act="font" data-size="${size}" class="${save.settings.font === size ? 'primary' : ''}">${size} %</button>`).join('')}
    </div>
    <label class="switch">${ui('optBattery')}<input type="checkbox" data-field="battery" ${save.settings.battery ? 'checked' : ''}/> ${tr(save, 'opt.battery')}</label>
    <p class="muted">${tr(save, 'opt.batteryNote')}</p>
    <label class="switch">${ui('optLoop')}<input type="checkbox" data-field="loop" ${save.loop ? 'checked' : ''}/> ${tr(save, 'nav.loop')}</label>
    <div class="row-actions">
      <span>${ui('optPower')}${tr(save, 'opt.power')}</span>
      ${power(0, 'opt.powerOff')}${power(2, 'opt.power2')}${power(5, 'opt.power5')}
    </div>
    <h2>${tr(save, 'opt.export')}</h2>
    <textarea id="export-code" readonly rows="3">${esc(exportCode(save))}</textarea>
    <p><button data-act="copy-code">${ui('copy')}${tr(save, 'opt.copy')}</button></p>
    <h2>${tr(save, 'opt.import')}</h2>
    <textarea id="import-code" rows="3"></textarea>
    ${debug ? `<div class="card" style="padding:12px;margin-top:12px"><b>${tr(save, 'opt.debug')}</b><p class="muted">${tr(save, 'opt.debugNote')}</p><input id="debug-hours" type="number" min="0" step="0.1" value="10"/> <button type="button" class="primary" data-act="jump">${tr(save, 'opt.jump')}</button> <button type="button" data-act="debug-stars">${tr(save, 'chest.debug')}</button></div>` : ''}
    <p><button type="button" class="ghost" data-act="reset">${ui('reset')}${tr(save, 'opt.reset')}</button></p>
      </div>
    </div>
    <div class="menu-dock" data-dock="options">
      <button type="button" class="primary dock-primary" data-act="import-ask">${ui('importCode')}${tr(save, 'opt.importBtn')}</button>
    </div>
  </div>`
}

function guide(save: SaveV2): string {
  return `<div class="menu-screen">
    <div class="menu-scroll">
      <div class="card panel"><h2>${ui('guide')}${tr(save, 'guide.title')}</h2>
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => `<p>${ui('guide')}${tr(save, `guide.${n}`)}</p>`).join('')}
      </div>
    </div>
  </div>`
}

function center(save: SaveV2, screen: Screen, now: number, pc: PcQuery, dex: CodexQuery, selected: string | null, debug: boolean, wheel: WheelPanel, shell: ShellFlags): string {
  if (screen === 'progress') return `<div class="menu-screen"><div class="menu-scroll">${progress(save)}</div></div>`
  if (screen === 'team') return team(save, pc, selected, shell)
  if (screen === 'codex') return codex(save, dex, shell)
  if (screen === 'activities') return activitiesView(save, now, selected, wheel)
  if (screen === 'shop') return shop(save, now, shell.shopTab ?? 'chests', shell.shopHint === true)
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
      <label class="switch">${ui('optLoop')}<input type="checkbox" data-field="loop" ${save.loop ? 'checked' : ''}/> ${tr(save, 'nav.loop')}</label>
      <p class="muted">${tr(save, 'nav.crest', { name: save.badges.includes(chapter.guardian.badge) ? chapter.guardian.badge : '—' })}</p>
      ${progress(save)}
    </div>` : ''
  const typeScale = fontFactor(save.settings.font)
  const stageStyle = screen === 'shop'
    ? `--font-scale:${typeScale};background-image:url('${art(SHOP_ART.bg)}');background-size:100% 100%`
    : `--font-scale:${typeScale}`
  return `<div id="stage" data-font="${save.settings.font}" data-swipe="${save.settings.swipeTabs ? '1' : '0'}" data-battery="${save.settings.battery ? '1' : '0'}" style="${stageStyle}" class="${adventure ? 'is-adventure' : 'is-menu'} ${screen === 'shop' ? 'is-shop' : ''} ${save.settings.reduceMotion ? 'reduce-motion' : ''}">
    <div class="band band-top"></div>
    <div class="safe">
      <div class="anchor anchor-top">
        ${screen === 'shop' ? '' : header(save, now)}
        ${adventure ? chapterLine(save, step, mapOpen) : ''}
        ${adventure ? path(save, step) : ''}
      </div>
      <div class="anchor anchor-mid">${adventure ? battle(save, now, shell.fighting) : center(save, screen, now, pc, dex, selected, debug, wheel, shell)}</div>
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
  if (overlay.kind === 'wallet') {
    const gold = overlay.id === 'gold'
    const amount = (gold ? save.gold : save.marks).toLocaleString('de-DE')
    return `<div class="sheet" data-sheet="swipe">${grab()}<h2>${coin(gold ? 'gold' : 'marks', true)} ${amount}</h2><p>${esc(tr(save, gold ? 'shop.goldFrom' : 'shop.marksFrom'))}</p><button type="button" class="primary" data-act="close">${ui('close')}${esc(tr(save, 'shop.close'))}</button></div>`
  }
  if (overlay.kind === 'shop-info') {
    const row = shopOffers(save, Date.now()).find((item) => item.id === overlay.offerId)
    if (!row) return `<div class="sheet"><button type="button" class="primary" data-act="close">Schließen</button></div>`
    const extra = row.act === 'buy-crystal'
      ? `<button type="button" data-act="use-crystal" data-id="${row.dataId}">${esc(tr(save, 'shop.use'))}</button><button type="button" data-act="sell-crystal" data-id="${row.dataId}">${esc(tr(save, 'shop.sellBtn'))}</button>`
      : row.act === 'buy-fruit'
        ? `<button type="button" data-act="use-fruit" data-id="${row.dataId}">${esc(tr(save, 'shop.eat'))}</button><button type="button" data-act="sell-fruit" data-id="${row.dataId}">${esc(tr(save, 'shop.sellBtn'))}</button>`
        : ''
    const hero = row.art ? `<img class="hero" src="${art(row.art)}" alt=""/>` : ''
    return `<div class="sheet shop-sheet" data-sheet="swipe">${grab()}${hero}<h2>${esc(row.name)}</h2><p>${esc(row.effect)}</p>${extra}<button type="button" class="primary" data-act="close">${ui('close')}${esc(tr(save, 'shop.close'))}</button></div>`
  }
  if (overlay.kind === 'shop-confirm') {
    const row = shopOffers(save, Date.now()).find((item) => item.id === overlay.offerId)
    if (!row) return `<div class="sheet"><button type="button" class="primary" data-act="close">${esc(tr(save, 'shop.buy'))}</button></div>`
    const balance = row.pay === 'gold' ? save.gold : save.marks
    const after = Math.max(0, balance - row.price)
    return `<div class="sheet shop-sheet shop-confirm" data-sheet="swipe">${grab()}
      ${row.art ? `<img class="hero" src="${art(row.art)}" alt=""/>` : ''}
      <h2>${esc(row.name)}</h2>
      <p class="shop-price">${coin(row.pay, true)} ${row.price.toLocaleString('de-DE')}</p>
      <p class="shop-price">${esc(tr(save, 'shop.after'))} ${coin(row.pay, true)} ${after.toLocaleString('de-DE')}</p>
      <button type="button" class="primary" data-act="shop-yes" data-id="${row.id}">${esc(tr(save, 'shop.buy'))}</button>
      <button type="button" class="ghost" data-act="close">${ui('close')}${esc(tr(save, 'reset.no'))}</button>
    </div>`
  }
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
    <p>${esc(typeName(sp.type))} · ${esc(rarityInfo(sp.baseRarity).name)} · ${tr(save, 'codex.catches', { n: (save.dex[id]?.caught ?? 0).toLocaleString('de-DE') })}</p>
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
    ${Object.values(save.mons).filter((row) => row.species === sp.id).length > 1 ? `<button type="button" data-act="melt" data-uid="${uid}">Einschmelzen</button>` : ''}
    </div>
    <button type="button" class="primary" data-act="close">${tr(save, 'codex.close')}</button>
  </div>`
}

export function lookFace(look: AvatarLook): string {
  return `<canvas class="look-face" data-look="${look.skin},${look.hair},${look.color}" width="512" height="512"></canvas>`
}

export function onboardingHtml(name: string, look: AvatarLook, picked: string, lang: Lang = 'de', step: 'name' | 'starter' = 'name', langOpen = false): string {
  const problem = nameProblem(name)
  const nameStep = step !== 'starter'
  const starterReady = Boolean(picked)
  const reason = nameStep
    ? (problem ? t(lang, `start.err.${problem}`) : '')
    : (starterReady ? '' : t(lang, 'start.pick'))
  const nextLabel = nameStep ? t(lang, 'start.next') : t(lang, 'start.go')
  const nextAct = nameStep ? 'next' : 'start'
  const nextOff = nameStep ? Boolean(problem) : !starterReady
  return `<div id="stage" class="home" lang="${lang}">
    <div class="home-scroll">
      <div class="home-top">
        <p class="home-kicker">${t(lang, 'start.kicker')}</p>
        <button type="button" class="lang-chip" data-act="lang-sheet" aria-expanded="${langOpen ? 'true' : 'false'}" aria-label="${esc(t(lang, 'start.lang'))}">${lang === 'en' ? 'EN' : 'DE'} ▾</button>
      </div>
      ${nameStep ? nameStepHtml(name, look, lang, problem ? t(lang, `start.err.${problem}`) : '') : starterStepHtml(name, look, picked, lang)}
    </div>
    <div class="home-bar">
      <p class="home-reason" id="home-reason" ${reason ? '' : 'hidden'}>${esc(reason)}</p>
      <button type="button" class="primary" id="home-next" data-act="${nextAct}" ${nextOff ? 'disabled' : ''}>${esc(nextLabel)}</button>
    </div>
    <div class="lang-sheet card" ${langOpen ? '' : 'hidden'}>
      <button type="button" data-act="lang" data-lang="de" class="${lang === 'de' ? 'primary' : ''}">Deutsch</button>
      <button type="button" data-act="lang" data-lang="en" class="${lang === 'en' ? 'primary' : ''}">English</button>
    </div>
  </div>`
}

function nameStepHtml(name: string, look: AvatarLook, lang: Lang, error: string): string {
  const skins = Array.from({ length: 6 }, (_, index) => `<button type="button" class="look-choice" data-act="look" data-part="skin" data-index="${index}" aria-pressed="${look.skin === index ? 'true' : 'false'}" aria-label="${esc(t(lang, 'start.skinN', { n: index + 1 }))}"><span class="swatch" style="background:${skinHex(index)}"></span><span>${index + 1}</span></button>`).join('')
  const hairs = Array.from({ length: 8 }, (_, index) => `<button type="button" class="look-choice" data-act="look" data-part="hair" data-index="${index}" aria-pressed="${look.hair === index ? 'true' : 'false'}"><canvas class="look-face" data-look="${look.skin},${index},${look.color}" width="512" height="512"></canvas><span>${esc(t(lang, `start.hair${index}`))}</span></button>`).join('')
  const colors = Array.from({ length: 8 }, (_, index) => {
    const id = colorId(index)
    return `<button type="button" class="look-choice" data-act="look" data-part="color" data-index="${index}" aria-pressed="${look.color === index ? 'true' : 'false'}"><span class="swatch is-color" style="background:${colorHex(index)}"></span><span>${esc(t(lang, `start.${id}`))}</span></button>`
  }).join('')
  return `<h1>${t(lang, 'start.you')}</h1>
    <p class="home-lead">${t(lang, 'start.lead')}</p>
    <label class="home-label" for="hero-name">${t(lang, 'start.name')}</label>
    <div class="name-row">
      <input id="hero-name" data-field="name" maxlength="16" autocomplete="nickname" placeholder="${esc(t(lang, 'start.placeholder'))}" value="${esc(name)}"/>
      <button type="button" class="dice" data-act="random-name" aria-label="${esc(t(lang, 'start.randomName'))}"><img src="${art('home/dice.png')}" alt=""/></button>
    </div>
    <p class="home-error" id="name-error" role="alert">${esc(error)}</p>
    <div class="look-head">
      <div class="look-preview">${lookFace(look)}</div>
      <button type="button" class="dice look-dice" data-act="random-look">${esc(t(lang, 'start.randomLook'))}</button>
    </div>
    <p class="home-label">${t(lang, 'start.skin')}</p>
    <div class="look-row is-skin">${skins}</div>
    <p class="home-label">${t(lang, 'start.hair')}</p>
    <div class="look-row">${hairs}</div>
    <p class="home-label">${t(lang, 'start.color')}</p>
    <div class="look-row">${colors}</div>`
}

function starterStepHtml(name: string, look: AvatarLook, picked: string, lang: Lang): string {
  const cards = STARTERS.map((starter) => {
    const row = species(starter.id)
    const on = picked === starter.id
    return `<button type="button" class="starter-card ${on ? 'on' : ''}" data-act="pick" data-species="${starter.id}" aria-pressed="${on ? 'true' : 'false'}">
      <img src="${monsterArt(starter.id, true)}" alt=""/>
      <span><b>${esc(row.name)}</b><span>${esc(typeLabel(lang, row.type, typeName(row.type)))}</span></span>
    </button>`
  }).join('')
  return `<button type="button" class="home-back" data-act="back">${esc(t(lang, 'start.back'))}</button>
    <h1>${t(lang, 'start.pickTitle')}</h1>
    <div class="home-you">${lookFace(look)}<b>${esc(name.trim())}</b></div>
    <div class="starter-list">${cards}</div>`
}
