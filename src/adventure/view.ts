import { monsters, rarityInfo, species, typeColor, typeName } from '../data'
import type { TypeId } from '../types'
import {
  ALLY_X,
  FEET_Y,
  FOE_X,
  FOE_Y,
  sceneFile,
  SEAL_ADD,
  SEAL_FALLBACK,
  STARTERS,
  assetPath
} from './const'
import { fontFactor } from './touch'
import { baseLine, dexPlaces, dexStatus, dexStatusLabel, listCodex, regionProgress, speciesNumber, type DexFilter } from './dex'
import { goalName, goalTitle, rarityLabel, t, typeLabel, weatherLabel, whenLabel, type Lang } from './i18n'
import { colorHex, colorId, skinHex } from './avatar'
import { agoParts, continueFacts } from './continue'
import { STARTER_ART, starterBars, strongTypes, typeList, weakTypes } from './starter'
import { nameProblem } from './home'
import type { CloudView } from './cloud/types'
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
import { expeditionBusy, expeditionSlots, expeditionTier } from './expedition'
import { crestCount } from './arena'
import { COLORS, SHAPES, SYMBOLS, foundCost, guildFoundBlock } from './guild'
import { tradedOnly } from './trade'
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
import { crestArt } from './crestArt'
import { fightsHere } from './origin'
import { chapterById, councilOf, gateBadge, placeLabel, regionById, regions, routeOf, type NodeKind } from './route'
import { chapterUnlocked, dexCaughtCount, hereSightings, rarityName } from './sim'
import { GOALS } from './achievements'
import { HORT_PRICES, hortOffer } from './hort'
import { fruitDef, fruitMinutes } from './shop'
import { teamWeatherMarks, weatherArrow, weatherForecast, weatherName, WEATHER_SHIFTS, type WeatherId } from './weather'
import { typeArrow } from './order'
import { activeSynergies, purityOf, SYNERGIES } from './synergy'
import { councilAssignment, guardianAssignment, mechIcon, mechName, mechTip, type MechId } from './mech'
import { ultName, ultPattern } from './ult'
import { FACES, MULTIPLIERS, PRIZES, faceById, spinCost, wheelOpen, type Multiplier, type SymbolId } from './wheel'
import { expToNext, isAlive, monStats, realHp } from './stats'
import { masteryFrame, masteryGoal, masteryLevel, masteryStarRow } from './mastery'
import { BOARDS, RANK_FRAMES, type RankLine, type RankModel } from './online/ranks'
import { TREE_NODES, branchNodes, respecCost, treeFree, treePointParts, treeUnlocked, chestShinyChance, type BranchId } from './tree'
import {
  RESEARCH_LINES,
  RESEARCH_MAX,
  researchCost,
  researchDurationMs,
  researchLootMult,
  researchRank,
  researchUnlocked,
  type ResearchLine
} from './research'
import { DAILY_FRAMES, calendarReward, isDailyFrame, slotReward, type DailyFrameId } from './daily'
import type { OfflineSummary } from './sim'
import type { SaveV2 } from './types'
import { PC_VIEW_FALLBACK, virtualWindow } from './virtualList'

export type Screen = 'adventure' | 'progress' | 'team' | 'codex' | 'activities' | 'shop' | 'achievements' | 'ranks' | 'tree' | 'tower' | 'arena' | 'social' | 'expedition' | 'trade' | 'guild' | 'chat' | 'options' | 'guide'

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
  | { kind: 'quit' }

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
  cloud?: CloudView
  masteryNote?: string
  ranks?: RankModel
  treePick?: string
  arena?: ArenaPanel
  social?: SocialPanel
  expeditionPick?: string
  trade?: TradePanel
  guild?: GuildPanel
  chat?: ChatPanel
}

export interface ChatLine {
  label: string
  body: string
}

export interface ChatFriend {
  code: string
  label: string
}

export interface ChatPanel {
  status: 'offline' | 'ready' | 'loading' | 'age'
  lines: ChatLine[]
  note: string
  adult: boolean | null
  channel?: 'guild' | 'dm'
  friend?: string
  friends?: ChatFriend[]
  draft?: string
}

export interface GuildPerson {
  id: string
  label: string
  role?: 'lead' | 'deputy' | 'member'
}

export interface GuildGoalView {
  goal: string
  progress: number
  target: number
}

export interface GuildHit {
  id: string
  name: string
  tag: string
}

export interface GuildPanel {
  status: 'offline' | 'ready' | 'loading'
  name: string
  tag: string
  level: number
  points: number
  note: string
  id?: string
  role?: 'lead' | 'deputy' | 'member' | ''
  code?: string
  members?: GuildPerson[]
  requests?: GuildPerson[]
  goals?: GuildGoalView[]
  hits?: GuildHit[]
  draftName?: string
  draftTag?: string
  draftQuery?: string
  draftCode?: string
  shape?: string
  symbol?: string
  color?: string
}

export interface TradeCard {
  uid: string
  name: string
  rarity: number
  shiny: boolean
  level: number
  reason: string
}

export interface TradePanel {
  status: 'offline' | 'ready' | 'loading'
  note: string
  mine: TradeCard | null
  theirs: TradeCard | null
  lockMs: number
  phase: 'pick' | 'offered' | 'locked' | 'done'
  offerId?: string
  ownUid?: string
  host?: boolean
}

export interface SocialFriend {
  code: string
  label: string
  region: number
  crests: number
  codex: number
  favorite: string
  presence: string
  incoming?: boolean
}

export interface SocialPanel {
  status: 'offline' | 'ready' | 'loading'
  code: string
  friends: SocialFriend[]
  requests: SocialFriend[]
  note: string
  showOnline?: boolean
  gifts?: number
  beast?: string
  beastName?: string
  level?: number
  hp?: number
  hpMax?: number
  attempts?: number
  members?: string[]
  eggChance?: number
}

export interface ArenaCardView {
  index: number
  practice: boolean
  label: string
  rating: number
  league: string
  species: string[]
}

export interface ArenaPanel {
  status: 'offline' | 'locked' | 'ready' | 'loading'
  note: string
  rating: number
  league: string
  attacks: number
  slots: string[]
  suggestions: ArenaCardView[]
  logs: { label: string, win: boolean, delta: number }[]
  frames: string[]
  replay: { label: string, win: boolean, step: number, bouts: { allyName: string, foeName: string, allyHp: number, allyMax: number, foeHp: number, foeMax: number, win: boolean }[] } | null
}

const base = (): string => import.meta.env.BASE_URL || '/'

export function art(path: string): string {
  return assetPath(path, base())
}

/** A missing file hides the image. The surrounding layout stays. */
function artImg(file: string, className: string, dataArt: string): string {
  return `<img class="${className}" data-art="${esc(dataArt)}" src="${art(file)}" alt="" onerror="this.style.visibility='hidden'">`
}

function ui(id: UiArtId): string {
  return `<img class="ui-icon" src="${art(UI_ART[id])}" alt=""/>`
}

function typeIcon(type: TypeId, cls = 'type-icon'): string {
  return `<img class="${cls}" src="${art(`icons/type_${type}_128.png`)}" alt=""/>`
}

function portrait(speciesId: string, large = false, extra = ''): string {
  const rarity = species(speciesId).baseRarity
  const color = rarityInfo(rarity).color
  const sil = extra.split(' ').includes('sil')
  const frame = sil ? `frames/ghost_overlay${large ? '' : '_256'}.png` : `frames/rarity_${rarity}${large ? '' : '_256'}.png`
  return `<span class="pframe" style="--rarity:${color};--frame:url('${art(frame)}')"><img class="portrait ${extra}" src="${monsterArt(speciesId, large)}" alt=""/></span>`
}

function masteryPlate(save: SaveV2, speciesId: string, extra = ''): string {
  const level = masteryLevel(save.mastery?.[speciesId] ?? 0)
  const frame = masteryFrame(level)
  const ring = frame === 'none' ? '' : ` m-${frame}`
  const shine = frame === 'gold' ? ' m-shine' : ''
  return `<span class="m-plate${ring}${shine}">${portrait(speciesId, false, extra)}${masteryStarRow(level)}</span>`
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
  return `<img class="node-ico" src="${art(`ui/node_${kind}.webp`)}" alt=""/>`
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

const QUIET_CLOUD: CloudView = {
  status: 'offline',
  consent: 'unset',
  email: '',
  notice: '',
  askConsent: false,
  conflict: null
}

function cloudState(shell: ShellFlags): CloudView {
  return shell.cloud ?? QUIET_CLOUD
}

function cloudStatusKey(status: CloudView['status']): string {
  if (status === 'online') return 'cloud.online'
  if (status === 'sync') return 'cloud.sync'
  return 'cloud.offline'
}

function cloudGlyph(kind: 'online' | 'offline' | 'sync'): string {
  return `<img src="${art(`ui/cloud_${kind}.webp`)}" alt="" aria-hidden="true"/>`
}

function cloudChip(save: SaveV2, cloud: CloudView): string {
  const label = tr(save, cloudStatusKey(cloud.status))
  return `<button type="button" class="cloud-chip" data-act="account" data-cloud="${cloud.status}" aria-label="${esc(label)}">
    <span data-icon="online">${cloudGlyph('online')}</span>
    <span data-icon="offline">${cloudGlyph('offline')}</span>
    <span data-icon="sync">${cloudGlyph('sync')}</span>
  </button>`
}

function header(save: SaveV2, now: number, cloud: CloudView): string {
  const caught = dexCaughtCount(save)
  const clock = clockLabel(save, now)
  const weather = weatherForecast(now)[0]
  return `<header class="hud anchor-top-bar">
    <div class="hud-gold"><img src="${art('icons/gold_128.png')}" alt=""/><b id="gold">${gold(save.gold)}</b></div>
    <div class="hud-dex">${ui('codexCount')}${tr(save, 'nav.codexCount', { n: caught })}</div>
    <div class="hud-clock">${ui('clock')}${esc(clock.time)} · ${esc(clock.part)}</div>
    <div class="hud-wx"><span class="wx">${weatherIcon(weather.weather)}</span> ${esc(weatherLabel(L(save), weather.weather))}</div>
    ${cloudChip(save, cloud)}
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
  const moreScreens: Screen[] = ['shop', 'achievements', 'ranks', 'tree', 'tower', 'arena', 'social', 'expedition', 'trade', 'guild', 'chat', 'options', 'guide']
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
    ['ranks', 'moreRanks', 'nav.ranks'],
    ['tree', 'moreTree', 'nav.tree'],
    ['tower', 'moreTower', 'nav.tower'],
    ['arena', 'moreArena', 'nav.arena'],
    ['social', 'moreFriends', 'nav.friends'],
    ['expedition', 'moreExpedition', 'nav.expedition'],
    ['trade', 'moreTrade', 'nav.trade'],
    ['guild', 'moreGuild', 'nav.guild'],
    ['chat', 'moreChat', 'nav.chat'],
    ['options', 'moreOptions', 'nav.options'],
    ['guide', 'moreGuide', 'nav.guide']
  ]
  return `<div class="more-sheet card" ${open ? '' : 'hidden'}>
    <div class="more-who">${lookFace(save.look, save.equippedFrame ?? '')}<b>${esc(save.name)}</b></div>
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

function battle(save: SaveV2, now: number, fighting = false, shadow = false): string {
  const chapter = chapterById(save.region, save.chapter)
  const scene = sceneFile(chapter.scene, chapter.tint)
  const wide = scene.webp.replace('_p.webp', '.webp')
  const active = save.active && save.mons[save.active] ? save.active : save.team[0]
  const mon = active ? save.mons[active] : null
  const hp = mon ? realHp(mon) : { hp: 1, max: 1 }
  const clock = clockLabel(save, now)
  const sealed = Boolean(gateBadge(save.region, chapter) && save.badges.includes(gateBadge(save.region, chapter)))
  return `<div class="battle" id="battle">
    <div class="battle-world" id="battle-world">
      <picture>
        <source media="(orientation: landscape) and (max-height: 520px)" srcset="${art(wide)}" type="image/webp"/>
        <source srcset="${art(scene.webp)}" type="image/webp"/>
        <img class="plate" src="${art(scene.jpg)}" alt=""/>
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
      ${bossAhead(save) ? `<p class="wx-preview">${weatherPreview(save, now)}</p>` : ''}
    </div>
    ${sealed ? '' : `<div class="guard-dock">${fighting ? '' : guardCard(save)}<button type="button" class="primary challenge-fab" data-act="challenge">${ui('challenge')}${tr(save, chapter.council || chapter.foyer ? 'battle.resume' : 'battle.challenge')}</button></div>`}
    ${shadow ? `<p class="shadow-note shadow-battle" role="status">${esc(tr(save, 'cloud.shadow'))}</p>` : ''}
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
  const combos = activeSynergies(save.team.flatMap((uid) => {
    const mon = save.mons[uid]
    return mon ? [species(mon.species).type] : []
  }), save.synergy)
  const comboName = combos.map((row) => tr(save, `synergy.${row.id}`)).join(', ')
  const combo = combos.length
    ? `<span class="combo-slot"><button type="button" class="combo-mark" data-act="combo" data-tip="${esc(comboName)}" aria-label="${esc(comboName)}">${combos.map((row) => synergyGlyph(row.id)).join('')}</button><p class="combo-tip" id="combo-tip" hidden></p></span>`
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
  const bit = (type: TypeId, pct: number, sign: string) => `${typeIcon(type)}${esc(typeLabel(L(save), type, typeName(type)))} ${sign}${pct} %`
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
      ? `<img class="arrow up" src="${art('battle/stat_up.png')}" alt="▲"/>`
      : arrow === 'down'
        ? `<img class="arrow down" src="${art('battle/stat_down.png')}" alt="▼"/>`
        : ''
    return [`<span>${esc(species(mon.species).name)}${mark}</span>`]
  }).join('')
  const lead = bossLead(save)
  const preview = lead ? bossPreview(lead.speciesId, lead.level, lead.mechs) : ''
  return `<div class="guard-card"><div class="guard-title">Gegen ${typeIcon(foeType)} ${esc(typeName(foeType))}</div><div class="guard-names">${bits}</div>${preview}</div>`
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
  const up = `<img class="arrow" src="${art('battle/stat_up.png')}" alt="▲"/>`
  const down = `<img class="arrow" src="${art('battle/stat_down.png')}" alt="▼"/>`
  return `Jetzt: ${esc(weatherLabel(L(save), weather))}. Dein Team: ${marks.up} ${up}, ${marks.down} ${down}`
}

function weatherIcon(id: WeatherId): string {
  return `<img class="wx-icon" src="${art(`battle/weather_icon_${id}_128.png`)}" alt=""/>`
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
    const badge = gateBadge(region.id, chapter)
    const crest = chapter.special || !badge
      ? ''
      : `<img class="crest-mini${save.badges.includes(badge) ? '' : ' off'}" src="${art(crestArt(badge))}" alt=""/>`
    return `<button class="text-btn${here ? ' on' : ''}" data-act="travel" data-region="${region.id}" data-chapter="${chapter.id}" ${open ? '' : 'disabled'}>
      ${crest || ui('chapterMark')}<b>${esc(chapter.name)}</b> ${here ? '· hier' : ''}
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
      const stats = monStats(mon, mon.lvl, masteryLevel(save.mastery?.[mon.species] ?? 0))
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
      ${masteryPlate(save, sp.id)}
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

function synergyGlyph(id: string): string {
  return artImg(`synergy/${id}_64.png`, 'synergy-svg', `synergy/${id}`)
}

function synergyBoard(save: SaveV2): string {
  const types = save.team.flatMap((uid) => {
    const mon = save.mons[uid]
    return mon ? [species(mon.species).type] : []
  })
  const active = new Set(activeSynergies(types, save.synergy).map((row) => row.id))
  const present = new Set(SYNERGIES.filter((row) => types.includes(row.types[0]) && types.includes(row.types[1])).map((row) => row.id))
  const buttons = SYNERGIES.map((row) => {
    const on = active.has(row.id)
    const open = present.has(row.id)
    const name = tr(save, `synergy.${row.id}`)
    const line = tr(save, `synergy.${row.id}.line`)
    return `<button type="button" class="synergy-pick${on ? ' on' : ''}" data-act="synergy" data-id="${row.id}" data-art="synergy/${row.id}" aria-pressed="${on ? 'true' : 'false'}" ${open ? '' : 'disabled'}>
      ${synergyGlyph(row.id)}
      <b>${esc(name)}</b>
      <span>${esc(line)}</span>
    </button>`
  }).join('')
  const counts = new Map<TypeId, number>()
  for (const type of types) counts.set(type, (counts.get(type) ?? 0) + 1)
  const purity = [...counts].flatMap(([type, count]) => {
    const bonus = purityOf(types, type)
    if (bonus <= 0) return []
    const pct = Math.round(bonus * 10000) / 100
    const shown = Number.isInteger(pct) ? String(pct) : (L(save) === 'en' ? pct.toFixed(2) : pct.toFixed(2).replace('.', ','))
    const text = tr(save, 'synergy.purity', { count, type: typeLabel(L(save), type, typeName(type)), pct: shown })
    return [`${typeIcon(type)}${esc(text)}`]
  }).join(' · ')
  return `<section class="synergy-board" data-art="synergy/board">
    <h3>${tr(save, 'synergy.title')}</h3>
    <p class="synergy-note">${tr(save, 'synergy.note')}</p>
    <div class="synergy-grid">${buttons}</div>
    <button type="button" class="synergy-auto${save.synergy == null ? ' on' : ''}" data-act="synergy-auto">${tr(save, 'synergy.auto')}</button>
    ${purity ? `<p class="synergy-purity">${purity}</p>` : ''}
  </section>`
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
      ${masteryPlate(save, mon.species)}
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
    ${synergyBoard(save)}
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
    const face = hidden
      ? portrait(mon.id, false, 'sil').replace('style="', 'style="opacity:.25;')
      : masteryPlate(save, mon.id, status === 'owned' || status === 'released' ? '' : 'sil')
    return `<button type="button" class="mon-card" data-act="dex" data-species="${mon.id}">
      ${face}
      <div>${hidden ? tr(save, 'codex.no', { n: speciesNumber(mon.id) }) : esc(mon.name)}</div>
      <div class="muted">${dexStatusLabel(status)}${tradedOnly(save, mon.id) ? ` <img class="trade-mark" data-art="codex/traded" src="${art('codex/traded@2x.png')}" alt="${esc(tr(save, 'trade.traded'))}" title="${esc(tr(save, 'trade.traded'))}"/>` : ''}</div>
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
  return `<img class="reel-sym" src="${art(`ui/wheel_${id}.webp`)}" srcset="${art(`ui/wheel_${id}.webp`)} 1x, ${art(`ui/wheel_${id}@2x.webp`)} 2x" width="72" height="72" alt=""/>`
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
  const shimmer = formatPercent(chestShinyChance(save) * 100)
  return `<p class="muted">${esc(tr(save, 'chest.hint'))}</p><p class="muted">${esc(tr(save, 'tree.shinyLine', { n: shimmer }))}</p>${pity ? `<p data-pity="${tier}">${esc(pity)}</p>` : ''}<div class="rate-list">${rows}</div>`
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
  const pay = FACES.map((face) => `<div class="shop-row"><div>${glyph(face.id)} 3 ${esc(face.name)}</div><span>${face.triple.toLocaleString('de-DE')}</span></div>`).join('')
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

function dailyFrameSvg(id: DailyFrameId): string {
  const name = id.slice('daily-'.length)
  return artImg(`daily/frame-${name}_128.png`, 'daily-frame', `daily/frame-${name}`)
}

/** Break a German compound at „frucht“ only when the calendar cell is too narrow. */
function calendarFruit(save: SaveV2, fruit: string): string {
  const name = tr(save, `fruit.${fruit}`)
  if (name.includes(' ') || !name.endsWith('frucht')) return name
  return `${name.slice(0, -'frucht'.length)}\u00ADfrucht`
}

function dailyCard(save: SaveV2): string {
  const board = save.daily
  const tasks = (board?.tasks ?? []).map((task, index) => {
    const reward = slotReward(index)
    const type = task.type ? typeLabel(L(save), task.type, typeName(task.type)) : ''
    const name = tr(save, `daily.task.${task.kind}`, { n: task.need, type })
    const fruit = reward.fruit ? ` · ${tr(save, `fruit.${reward.fruit}`)}` : ''
    const mark = task.type ? typeIcon(task.type) : ''
    return `<li class="daily-task${task.claimed ? ' done' : ''}">
      ${mark}<b>${esc(name)}</b>
      <span>${task.have}/${task.need}</span>
      <span class="muted">${tr(save, 'daily.pay', { marks: reward.marks, gold: reward.gold })}${fruit}</span>
    </li>`
  }).join('')
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = index + 1
    const on = (board?.credited ?? 0) >= day
    const reward = calendarReward(day)
    const label = reward.frame ? tr(save, 'daily.frameDay') : reward.fruit ? calendarFruit(save, reward.fruit) : `${reward.gold} G`
    return `<li class="daily-day${on ? ' on' : ''}"><b>${day}</b><span>${esc(label)}</span></li>`
  }).join('')
  const frames = DAILY_FRAMES.map((id) => {
    const owned = Boolean(board?.frames.includes(id))
    const on = save.equippedFrame === id
    return `<button type="button" class="daily-frame-btn${on ? ' on' : ''}" data-act="equip-frame" data-id="${id}" data-art="daily/frame-${id.slice('daily-'.length)}" ${owned ? '' : 'disabled'}>
      ${dailyFrameSvg(id)}
      <span>${esc(tr(save, `daily.frame.${id}`))}</span>
    </button>`
  }).join('')
  return `<section class="card panel daily-card" data-art="daily/board">
    <h2>${tr(save, 'daily.title')}</h2>
    <img class="daily-board" src="${art('daily/board@2x.png')}" alt=""/>
    <p class="muted">${tr(save, 'daily.note')}</p>
    <ul class="daily-tasks">${tasks || `<li class="muted">${tr(save, 'daily.wait')}</li>`}</ul>
    <h3>${tr(save, 'daily.calendar')}</h3>
    <p class="muted">${tr(save, 'daily.calendarNote')}</p>
    <ol class="daily-days">${days}</ol>
    <div class="daily-frames">${frames}</div>
  </section>`
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
      <div class="muted">Lv ${mon.lvl} · ${typeIcon(sp.type)} ${esc(typeName(sp.type))}</div>
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
      ${dailyCard(save)}
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

function achieveArt(id: string): UiArtId {
  if (id.startsWith('win-')) return 'achWins'
  if (id.startsWith('catch-') || id.startsWith('shiny-')) return 'achFinds'
  if (id.startsWith('dupe-')) return 'achCollect'
  if (id.startsWith('badge-')) return 'achBadges'
  if (id.startsWith('region-') || id.startsWith('master-')) return 'achRegion'
  if (id.startsWith('type-')) return 'achTypes'
  if (id.startsWith('dex-') || id.startsWith('seen-')) return 'achCodex'
  return 'achCare'
}

function achievementsView(save: SaveV2): string {
  const done = save.claimed.length
  const rows = GOALS.map((goal) => {
    const have = save.claimed.includes(goal.id)
    const typeId = goal.id.startsWith('type-') ? goal.id.slice(5) : ''
    const typeBit = typeId ? typeLabel(L(save), typeId, typeName(typeId as TypeId)) : ''
    const name = goalName(L(save), goal.id, goal.name, typeBit)
    const title = goalTitle(L(save), goal.id, goal.title, typeBit)
    const mark = typeId ? typeIcon(typeId as TypeId) : ''
    return `<article class="list-row achieve ${have ? 'done' : ''}">
      ${ui(achieveArt(goal.id))}<div>${mark}<b>${esc(name)}</b><div class="muted">${have ? tr(save, 'ach.have', { title, frame: goal.frame }) : tr(save, 'ach.open')} · ${goal.gold.toLocaleString(L(save) === 'en' ? 'en' : 'de-DE')} G</div></div>
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

function cloudNotice(save: SaveV2, cloud: CloudView): string {
  const key = cloud.notice === 'offline'
    ? 'cloud.offlineArea'
    : cloud.notice === 'sent'
      ? 'cloud.sent'
      : cloud.notice === 'email-bad'
        ? 'cloud.emailBad'
        : cloud.notice === 'link-fail'
          ? 'cloud.linkFail'
          : cloud.notice === 'auth-off'
            ? 'cloud.authOff'
            : cloud.notice === 'write-fail'
              ? 'cloud.writeFail'
              : cloud.notice === 'unreadable'
                ? 'cloud.unreadable'
                : ''
  return key ? `<p class="cloud-notice">${esc(tr(save, key))}</p>` : ''
}

function accountCard(save: SaveV2, cloud: CloudView): string {
  const offline = cloud.status !== 'online' && cloud.status !== 'sync'
  const secure = offline
    ? `<p class="offline-note">${esc(tr(save, 'cloud.offlineArea'))}</p>`
    : `<p class="muted">${tr(save, 'cloud.secureNote')}</p>
      ${cloud.email ? `<p>${esc(tr(save, 'cloud.linked'))}</p>` : ''}
      <label class="cloud-mail">${esc(tr(save, 'cloud.secure'))}
        <input id="account-email" type="email" autocomplete="email" inputmode="email" placeholder="name@example.com"/>
      </label>
      <button type="button" class="primary" data-act="link-email">${esc(tr(save, 'cloud.send'))}</button>`
  const yes = cloud.consent === 'yes' ? 'primary' : ''
  const no = cloud.consent === 'no' ? 'primary' : ''
  return `<div class="card panel cloud-card" data-cloud="${cloud.status}">
    <h2><span class="cloud-mark" data-cloud="${cloud.status}" aria-hidden="true"><span data-icon="online">${cloudGlyph('online')}</span><span data-icon="offline">${cloudGlyph('offline')}</span><span data-icon="sync">${cloudGlyph('sync')}</span></span> ${esc(tr(save, 'cloud.account'))}</h2>
    <p class="cloud-state">${esc(tr(save, cloudStatusKey(cloud.status)))}</p>
    <p class="muted">${tr(save, 'cloud.anon')}</p>
    <h2>${esc(tr(save, 'cloud.nameTitle'))}</h2>
    <p>${esc(cloud.playerLabel || tr(save, 'cloud.nameNone'))}</p>
    <div class="row-actions">
      <button type="button" data-act="name-open">${esc(tr(save, 'cloud.nameBtn'))}</button>
      <button type="button" data-act="report-open">${esc(tr(save, 'cloud.report'))}</button>
    </div>
    <label class="cloud-mail" for="player-target">${esc(tr(save, 'cloud.block'))}</label>
    <input id="player-target" maxlength="24" autocomplete="off" placeholder="${esc(tr(save, 'cloud.reportHint'))}" aria-label="${esc(tr(save, 'cloud.block'))}"/>
    <button type="button" class="cloud-block" data-act="block-player">${esc(tr(save, 'cloud.block'))}</button>
    ${cloud.statusNote ? `<p class="cloud-notice" role="status">${esc(cloud.statusNote)}</p>` : ''}
    ${cloud.flagLevel === 2 ? `<p class="shadow-note" role="status">${esc(tr(save, 'cloud.shadow'))}</p>` : ''}
    ${cloud.onlineDown ? `<p class="offline-note">${esc(tr(save, 'cloud.unavailable'))}</p>` : ''}
    <p><button type="button" class="danger" data-act="delete-ask">${esc(tr(save, 'cloud.delete'))}</button></p>
    <h2>${esc(tr(save, 'cloud.secure'))}</h2>
    ${secure}
    <div class="row-actions later-row">
      <button type="button" disabled aria-disabled="true" title="${esc(tr(save, 'cloud.later'))}">${esc(tr(save, 'cloud.google'))}</button>
      <button type="button" disabled aria-disabled="true" title="${esc(tr(save, 'cloud.later'))}">${esc(tr(save, 'cloud.apple'))}</button>
    </div>
    <p class="muted">${tr(save, 'cloud.later')}</p>
    <h2>${esc(tr(save, 'cloud.stats'))}</h2>
    <div class="row-actions">
      <button type="button" class="${yes}" data-act="consent" data-consent="yes">${esc(tr(save, 'cloud.yes'))}</button>
      <button type="button" class="${no}" data-act="consent" data-consent="no">${esc(tr(save, 'cloud.no'))}</button>
    </div>
    ${cloudNotice(save, cloud)}
  </div>`
}

function options(save: SaveV2, debug: boolean, shell: ShellFlags): string {
  const cloud = cloudState(shell)
  const power = (minutes: 0 | 2 | 5, key: string) => `<button type="button" data-act="power" data-min="${minutes}" class="${save.settings.powerSave === minutes ? 'primary' : ''}">${tr(save, key)}</button>`
  return `<div class="menu-screen">
    <div class="menu-scroll">
      ${accountCard(save, cloud)}
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
    ${debug ? `<div class="card" style="padding:12px;margin-top:12px"><b>${tr(save, 'opt.debug')}</b><p class="muted">${tr(save, 'opt.debugNote')}</p><input id="debug-hours" type="number" min="0" step="0.1" value="10"/> <button type="button" class="primary" data-act="jump">${tr(save, 'opt.jump')}</button> <button type="button" data-act="debug-stars">${tr(save, 'chest.debug')}</button></div>` : ''}
    <p><button type="button" class="ghost" data-act="export-save">${tr(save, 'opt.export')}</button></p>
    <p><a class="ghost" href="datenschutz.html">${tr(save, 'opt.privacy')}</a></p>
    <p><a class="ghost" href="loeschen.html">${tr(save, 'opt.deleteWeb')}</a></p>
    <p><button type="button" class="ghost" data-act="reset">${ui('reset')}${tr(save, 'opt.reset')}</button></p>
      </div>
    </div>
    <div class="menu-dock" data-dock="options">
      <button type="button" class="primary dock-primary" data-act="sync-now">${esc(tr(save, 'cloud.syncNow'))}</button>
    </div>
  </div>`
}

function previewLine(lang: Lang, preview: NonNullable<CloudView['conflict']>['local']): string {
  const locale = lang === 'en' ? 'en' : 'de-DE'
  return `<p>${esc(t(lang, 'cloud.preview', {
    crests: preview.crests,
    codex: preview.codex,
    ep: preview.ep.toLocaleString(locale),
    gold: preview.gold.toLocaleString(locale)
  }))}</p><p class="muted">${esc(t(lang, 'cloud.place', { region: preview.region, chapter: preview.chapter, step: preview.step }))}</p>`
}

function sheetButtons(lang: Lang, yesAct: string, yesKey: string, noAct: string): string {
  return `<div class="choice-row">
    <button type="button" data-act="${noAct}">${esc(t(lang, 'cloud.cancel'))}</button>
    <button type="button" class="primary" data-act="${yesAct}">${esc(t(lang, yesKey))}</button>
  </div>`
}

/** Consent, name, report, deletion and the two-device choice. Neither answer is preselected. */
export function cloudLayerHtml(cloud: CloudView, lang: Lang): string {
  if (cloud.deleteStep === 1 || cloud.deleteStep === 2) {
    const finalStep = cloud.deleteStep === 2
    return `<div id="cloud-layer" class="overlay overlay-sheet"><div class="sheet" role="dialog" aria-labelledby="delete-title">${grab()}
      <h2 id="delete-title">${esc(t(lang, finalStep ? 'cloud.deleteFinal' : 'cloud.deleteTitle'))}</h2>
      <p>${esc(t(lang, finalStep ? 'cloud.deleteFinalBody' : 'cloud.deleteBody'))}</p>
      ${sheetButtons(lang, finalStep ? 'delete-yes' : 'delete-next', finalStep ? 'cloud.deleteYes' : 'cloud.deleteNext', 'delete-no')}
    </div></div>`
  }
  if (cloud.reportOpen) {
    const reasons = (['beleidigend', 'unangemessen', 'betrug', 'sonstiges'] as const).map((reason) =>
      `<button type="button" data-act="report-send" data-reason="${reason}">${esc(t(lang, `cloud.reason.${reason}`))}</button>`
    ).join('')
    return `<div id="cloud-layer" class="overlay overlay-sheet"><div class="sheet" role="dialog" aria-labelledby="report-title">${grab()}
      <h2 id="report-title">${esc(t(lang, 'cloud.reportTitle'))}</h2>
      <label class="cloud-mail">${esc(t(lang, 'cloud.reportHint'))}
        <input id="report-target" maxlength="24" autocomplete="off" placeholder="${esc(t(lang, 'cloud.reportHint'))}"/>
      </label>
      <div class="row-actions">${reasons}</div>
      <div class="choice-row"><button type="button" data-act="report-close">${esc(t(lang, 'cloud.cancel'))}</button></div>
    </div></div>`
  }
  if (cloud.nameOpen) {
    return `<div id="cloud-layer" class="overlay overlay-sheet"><div class="sheet" role="dialog" aria-labelledby="name-title">${grab()}
      <h2 id="name-title">${esc(t(lang, 'cloud.nameTitle'))}</h2>
      <label class="cloud-mail">${esc(t(lang, 'cloud.nameTitle'))}
        <input id="player-name" maxlength="16" autocomplete="nickname" value=""/>
      </label>
      <p class="name-error" id="name-error" role="alert">${esc(cloud.nameError ?? '')}</p>
      ${sheetButtons(lang, 'name-save', 'cloud.nameSave', 'name-close')}
    </div></div>`
  }
  if (cloud.conflict) {
    return `<div id="cloud-layer" class="overlay overlay-sheet"><div class="sheet" role="dialog" aria-labelledby="conflict-title">${grab()}
      <h2 id="conflict-title">${esc(t(lang, 'cloud.conflictTitle'))}</h2>
      <p>${esc(t(lang, 'cloud.conflictBody'))}</p>
      <article class="cloud-preview"><b>${esc(t(lang, 'cloud.deviceA'))}</b> · ${esc(t(lang, 'cloud.thisDevice'))}${previewLine(lang, cloud.conflict.local)}</article>
      <article class="cloud-preview"><b>${esc(t(lang, 'cloud.deviceB'))}</b> · ${esc(t(lang, 'cloud.otherDevice'))}${previewLine(lang, cloud.conflict.remote)}</article>
      <div class="choice-row">
        <button type="button" data-act="conflict-a">${esc(t(lang, 'cloud.deviceA'))}</button>
        <button type="button" data-act="conflict-b">${esc(t(lang, 'cloud.deviceB'))}</button>
      </div>
    </div></div>`
  }
  if (!cloud.askConsent) return ''
  return `<div id="cloud-layer" class="overlay overlay-sheet"><div class="sheet" role="dialog" aria-labelledby="consent-q">${grab()}
    <h2 id="consent-q">${esc(t(lang, 'cloud.consentQ'))}</h2>
    <p class="muted">${esc(t(lang, 'cloud.consentNote'))}</p>
    <div class="choice-row">
      <button type="button" data-act="consent" data-consent="yes">${esc(t(lang, 'cloud.yes'))}</button>
      <button type="button" data-act="consent" data-consent="no">${esc(t(lang, 'cloud.no'))}</button>
    </div>
  </div></div>`
}

function guide(save: SaveV2): string {
  return `<div class="menu-screen">
    <div class="menu-scroll">
      <div class="card panel guide-card"><h2>${ui('guide')}${tr(save, 'guide.title')}</h2>
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((n) => `<p>${ui('guide')}${tr(save, `guide.${n}`)}</p>`).join('')}
      </div>
    </div>
  </div>`
}

function placeBadge(place: number): string {
  if (place >= 1 && place <= 3) return `<img class="rank-badge" src="${art(`ranks/place-${place}@2x.png`)}" alt="${place}"/>`
  return `<span class="rank-badge plain"><img src="${art('ranks/place-n@2x.png')}" alt=""/><b>${place}</b></span>`
}

function frameGlyph(id: string, on: boolean): string {
  const key = `ranks/frame-${id}`
  return artImg(`${key}_128.png`, `rank-frame${on ? ' on' : ''}`, key)
}

function rankRows(rows: RankLine[]): string {
  if (!rows.length) return ''
  return rows.map((row) => `<article class="rank-row ${row.self ? 'is-me' : ''}">
    ${placeBadge(row.place)}
    <div><b>${esc(row.label)}</b><div class="muted">${row.detail || row.score.toLocaleString('de-DE')}</div></div>
  </article>`).join('')
}

function ranksScreen(save: SaveV2, model: RankModel | undefined): string {
  const board = model?.board ?? 'codex'
  const tabs = BOARDS.map((id) => `<button type="button" data-act="rank-board" data-board="${id}" class="${id === board ? 'on' : ''}">${tr(save, `ranks.board.${id}`)}</button>`).join('')
  const frames = RANK_FRAMES.map((frame) => `<div class="rank-honor">${frameGlyph(frame.id, Boolean(model?.honors?.includes(frame.id)))}<span>${esc(tr(save, `ranks.frame.${frame.id}`))}</span></div>`).join('')
  const status = model?.status ?? 'offline'
  const body = status === 'loading'
    ? `<p class="muted">${tr(save, 'ranks.loading')}</p>`
    : status !== 'ready'
      ? `<p class="muted">${tr(save, 'ranks.offline')}</p>`
      : `${model?.excluded ? `<p class="muted">${tr(save, 'ranks.excluded')}</p>` : ''}
        <h2>${tr(save, 'ranks.top')}</h2>
        ${rankRows(model?.top ?? []) || `<p class="muted">${tr(save, 'ranks.empty')}</p>`}
        <h2>${tr(save, 'ranks.around')}</h2>
        ${rankRows(model?.around ?? []) || `<p class="muted">${tr(save, 'ranks.noSelf')}</p>`}`
  return `<div class="menu-screen">
    <div class="menu-scroll">
      <div class="card panel">
        <h2>${tr(save, 'nav.ranks')}</h2>
        <div class="rank-tabs">${tabs}</div>
        <button type="button" data-act="rank-friends" class="${model?.friends ? 'on' : ''}">${tr(save, 'ranks.friends')}</button>
        ${body}
        <h2>${tr(save, 'ranks.frames')}</h2>
        <div class="rank-frames">${frames}</div>
      </div>
    </div>
  </div>`
}

function treeGlyph(branch: BranchId, index: number, on: boolean): string {
  return `<img class="tree-glyph${on ? '' : ' off'}" src="${art(`tree/${branch}-${index + 1}.webp`)}" alt=""/>`
}

function leagueBadge(id: string, on: boolean): string {
  const key = `arena/league_${id}`
  return artImg(`${key}_64.png`, `league-badge${on ? ' on' : ''}`, key)
}

function screenHead(key: 'arena' | 'tower'): string {
  return `<picture class="screen-head"><source type="image/webp" srcset="${art(`${key}/screen_540.webp`)} 540w, ${art(`${key}/screen.webp`)} 1080w" sizes="(max-width: 600px) 100vw, 600px"/><img src="${art(`${key}/screen.jpg`)}" alt="" width="1080" height="480" loading="lazy"/></picture>`
}

function arenaScreen(save: SaveV2, panel: ArenaPanel | undefined): string {
  const view = panel ?? { status: 'offline' as const, note: '', rating: 1000, league: 'Kiesel', attacks: 0, slots: [], suggestions: [], logs: [], frames: [], replay: null }
  const badges = ['kiesel', 'bronze', 'silber', 'gold', 'kristall', 'meister'].map((id) => `<div class="league-item">${leagueBadge(id, view.frames.includes(id) || view.league.toLowerCase().includes(id === 'meister' ? 'meister' : id))}<span>${esc(tr(save, `arena.league.${id}`))}</span></div>`).join('')
  if (view.status === 'loading') {
    return `<div class="menu-screen"><div class="menu-scroll"><div class="card panel">${screenHead('arena')}<h2>${tr(save, 'nav.arena')}</h2><p class="muted">${tr(save, 'arena.loading')}</p></div></div></div>`
  }
  if (view.status !== 'ready' && view.status !== 'locked') {
    return `<div class="menu-screen"><div class="menu-scroll"><div class="card panel">${screenHead('arena')}<h2>${tr(save, 'nav.arena')}</h2><p class="muted">${tr(save, 'arena.offline')}</p></div></div></div>`
  }
  const slots = Array.from({ length: 6 }, (_, index) => {
    const uid = view.slots[index]
    const mon = uid ? save.mons[uid] : undefined
    return `<button type="button" class="arena-slot" data-act="arena-clear" data-index="${index}">${mon ? portrait(mon.species) : ''}<span>${mon ? esc(species(mon.species).name) : index + 1}</span></button>`
  }).join('')
  const bench = Object.keys(save.mons).slice(0, 18).map((uid) => `<button type="button" data-act="arena-pick" data-uid="${uid}">${esc(species(save.mons[uid].species).name)}</button>`).join('')
  const cards = view.suggestions.map((card) => `<article class="arena-card">
    <b>${esc(card.label)}</b>
    <p>${esc(card.league)} · ${card.rating}</p>
    <button type="button" class="primary" data-act="arena-fight" data-index="${card.index}">${tr(save, 'arena.fight')}</button>
  </article>`).join('')
  const bout = view.replay?.bouts[view.replay.step]
  const replay = view.replay && bout ? `<article class="arena-replay">
    <h3>${esc(view.replay.label)} · ${tr(save, view.replay.win ? 'arena.win' : 'arena.loss')}</h3>
    <div class="arena-pair"><div><b>${esc(bout.foeName)}</b><div class="bar-exp"><span style="width:${Math.round(bout.foeHp / Math.max(1, bout.foeMax) * 100)}%"></span></div></div>
    <div><b>${esc(bout.allyName)}</b><div class="bar-exp"><span style="width:${Math.round(bout.allyHp / Math.max(1, bout.allyMax) * 100)}%"></span></div></div></div>
    <p class="muted">${view.replay.step + 1} / ${view.replay.bouts.length}</p>
  </article>` : ''
  const logs = view.logs.map((line) => `<p>${esc(line.label)} · ${tr(save, line.win ? 'arena.held' : 'arena.fell')} · ${line.delta}</p>`).join('')
  return `<div class="menu-screen"><div class="menu-scroll"><div class="card panel">
    ${screenHead('arena')}
    <h2>${tr(save, 'nav.arena')}</h2>
    <p>${esc(view.league)} · ${view.rating} · ${tr(save, 'arena.attacks', { n: view.attacks })}</p>
    ${view.status === 'locked' ? `<p class="muted">${tr(save, 'arena.locked')}</p>` : ''}
    <div class="league-row">${badges}</div>
    <h3>${tr(save, 'arena.defense')}</h3>
    <div class="arena-slots">${slots}</div>
    <div class="arena-bench">${bench}</div>
    <button type="button" class="primary" data-act="arena-save">${tr(save, 'arena.save')}</button>
    <button type="button" data-act="arena-suggest">${tr(save, 'arena.suggest')}</button>
    <div class="arena-cards">${cards}</div>
    ${replay}
    <h3>${tr(save, 'arena.log')}</h3>
    ${logs || `<p class="muted">${tr(save, 'arena.noLog')}</p>`}
    ${view.note ? `<p class="muted">${esc(view.note)}</p>` : ''}
  </div></div></div>`
}

function towerGlyph(line: ResearchLine): string {
  return `<img class="tower-svg" data-art="tower/${line}" src="${art(`tower/${line}.webp`)}" alt=""/>`
}

function towerTime(ms: number): string {
  const mins = Math.max(1, Math.round(ms / 60000))
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  const rest = mins % 60
  if (hours < 48) return rest ? `${hours} h ${rest} min` : `${hours} h`
  const days = ms / 86_400_000
  return `${days.toFixed(1)} d`
}

function towerScreen(save: SaveV2, now: number): string {
  const unlocked = researchUnlocked(save)
  const job = save.research?.job ?? null
  const floors = [...RESEARCH_LINES].reverse().map((line) => {
    const rank = researchRank(save, line)
    const running = job?.line === line
    const next = rank + 1
    const pips = Array.from({ length: RESEARCH_MAX }, (_, index) => `<i class="${index < rank ? 'on' : ''}"></i>`).join('')
    const pct = (line === 'expedition' ? 4 : line === 'egg' ? -4 : 3) * rank
    const action = !unlocked || rank >= RESEARCH_MAX || (job && !running)
      ? ''
      : running
        ? `<p class="tower-run">${tr(save, 'research.running', { time: towerTime(Math.max(0, job.readyAt - now)) })}</p>`
        : `<button type="button" class="primary" data-act="research-start" data-id="${line}" ${save.gold < researchCost(next) ? 'disabled' : ''}>${tr(save, 'research.start', { gold: researchCost(next).toLocaleString('de-DE'), time: towerTime(researchDurationMs(next)) })}</button>`
    return `<article class="tower-floor${running ? ' running' : ''}" data-art="tower/${line}">
      ${towerGlyph(line)}
      <div>
        <h3>${tr(save, `research.${line}`)}</h3>
        <p>${tr(save, 'research.rank', { rank, max: RESEARCH_MAX, pct })}</p>
        <p class="muted">${tr(save, `research.${line}.line`)}</p>
        <div class="tower-pips" aria-hidden="true">${pips}</div>
        ${action}
      </div>
    </article>`
  }).join('')
  return `<div class="menu-screen"><div class="menu-scroll"><div class="card panel tower-screen" data-art="tower/screen">
    ${screenHead('tower')}
    <h2>${tr(save, 'nav.tower')}</h2>
    <p class="muted">${tr(save, unlocked ? 'research.note' : 'research.locked')}</p>
    ${job ? '' : `<p class="muted">${tr(save, 'research.one')}</p>`}
    <div class="tower-stack">${floors}</div>
    <p class="muted">${tr(save, 'research.lootNow', { n: Math.round((researchLootMult(save) - 1) * 100) })}</p>
  </div></div></div>`
}

function treeScreen(save: SaveV2, pick: string | undefined, now: number): string {
  const lang = L(save)
  const parts = treePointParts(save)
  const chosen = TREE_NODES.find((node) => node.id === pick) ?? TREE_NODES[0]
  const owned = new Set(save.tree?.nodes ?? [])
  const columns = (['chest', 'fight', 'time'] as const).map((branch) => {
    const nodes = branchNodes(branch).map((node) => `<button type="button" class="tree-node ${owned.has(node.id) ? 'owned' : ''} ${node.id === chosen.id ? 'on' : ''}" data-act="tree-node" data-id="${node.id}">
      ${treeGlyph(branch, node.index, owned.has(node.id))}
      <span>${esc(lang === 'en' ? node.nameEn : node.nameDe)}</span>
    </button>`).join('')
    return `<div class="tree-col"><h3>${tr(save, `tree.branch.${branch}`)}</h3>${nodes}</div>`
  }).join('')
  const cost = respecCost(save, now)
  const locked = !treeUnlocked(save)
  return `<div class="menu-screen">
    <div class="menu-scroll">
      <div class="card panel">
        <h2>${tr(save, 'nav.tree')}</h2>
        <p>${tr(save, 'tree.points', { free: treeFree(save), earned: parts.earned })}</p>
        <p class="muted">${tr(save, 'tree.parts', parts)}</p>
        ${locked ? `<p class="muted">${tr(save, 'tree.locked')}</p>` : ''}
        <div class="tree-board">${columns}</div>
        <article class="tree-detail">
          <h3>${esc(lang === 'en' ? chosen.nameEn : chosen.nameDe)}</h3>
          <p>${esc(lang === 'en' ? chosen.textEn : chosen.textDe)}</p>
          <p class="muted">${tr(save, 'tree.cost', { n: chosen.cost })}</p>
          <button type="button" class="primary" data-act="tree-buy" data-id="${chosen.id}" ${owned.has(chosen.id) || locked ? 'disabled' : ''}>${tr(save, owned.has(chosen.id) ? 'tree.owned' : 'tree.buy')}</button>
        </article>
        <button type="button" data-act="tree-reset">${tr(save, 'tree.respec', { gold: cost ? cost.toLocaleString(lang === 'en' ? 'en' : 'de-DE') : tr(save, 'tree.free') })}</button>
      </div>
    </div>
  </div>`
}

function beastArt(id: string): string {
  const key = id === 'himmelswal' ? 'himmelswal' : 'weltenwurm'
  const label = key === 'himmelswal' ? 'Himmelswal' : 'Weltenwurm'
  return `<picture class="beast-art" data-art="beasts/${key}">
    <source type="image/webp" srcset="${art(`beasts/${key}.webp`)}">
    <img src="${art(`beasts/${key}.png`)}" alt="${label}" onerror="this.style.visibility='hidden'">
  </picture>`
}

function friendName(id: string): string {
  if (!id) return '—'
  try { return species(id).name } catch { return '—' }
}

function presenceWord(save: SaveV2, value: string): string {
  if (value === 'online') return tr(save, 'social.online')
  if (value === 'heute') return tr(save, 'social.today')
  if (value === 'verborgen') return tr(save, 'social.hidden')
  return tr(save, 'social.away')
}

function socialScreen(save: SaveV2, panel: SocialPanel | undefined): string {
  const view = panel ?? { status: 'offline' as const, code: '', friends: [], requests: [], note: '' }
  if (view.status === 'loading') {
    return `<div class="menu-screen"><div class="menu-scroll"><div class="card panel"><h2>${tr(save, 'nav.friends')}</h2><p class="muted">${tr(save, 'social.loading')}</p></div></div></div>`
  }
  if (view.status !== 'ready') {
    return `<div class="menu-screen"><div class="menu-scroll"><div class="card panel"><h2>Offline</h2><p class="muted">${tr(save, 'social.offlineNote')}</p></div></div></div>`
  }
  const friends = view.friends.map((friend) => `<article class="friend-row">
    <b>${esc(friend.label)}</b>
    <p>${esc(tr(save, 'social.progress', { region: friend.region, crests: friend.crests, codex: friend.codex }))}</p>
    <p class="muted">${tr(save, 'social.favorite')}: ${esc(friendName(friend.favorite))} · ${esc(presenceWord(save, friend.presence))}</p>
    <button type="button" data-act="friend-gift" data-code="${esc(friend.code)}">${tr(save, 'social.gift')}</button>
    <button type="button" data-act="friend-invite" data-code="${esc(friend.code)}">${tr(save, 'social.invite')}</button>
    <button type="button" data-act="friend-remove" data-code="${esc(friend.code)}">${tr(save, 'social.remove')}</button>
  </article>`).join('')
  const requests = view.requests.map((request) => `<article class="friend-row">
    <b>${esc(request.label)}</b>
    ${request.incoming ? `<button type="button" data-act="friend-accept" data-code="${esc(request.code)}">${tr(save, 'social.accept')}</button><button type="button" data-act="friend-decline" data-code="${esc(request.code)}">${tr(save, 'social.decline')}</button>` : `<p class="muted">${tr(save, 'social.pending')}</p>`}
  </article>`).join('')
  const hpMax = Math.max(1, view.hpMax ?? 1)
  const hpWidth = Math.max(0, Math.min(100, Math.round(((view.hp ?? 0) / hpMax) * 100)))
  return `<div class="menu-screen"><div class="menu-scroll"><div class="card panel">
    <h2>${tr(save, 'nav.friends')}</h2>
    <article class="friend-code" data-art="friends/code" style="background-image:url('${art('friends/code.png')}')">
      <p>${tr(save, 'social.code')}</p>
      <b>${esc(view.code)}</b>
    </article>
    <label class="friend-search">${tr(save, 'social.search')}<input id="friend-query" maxlength="24" /></label>
    <button type="button" class="primary" data-act="friend-ask">${tr(save, 'social.ask')}</button>
    <button type="button" data-act="friend-claim">${tr(save, 'social.claim')} ${view.gifts ? `· ${view.gifts} G` : ''}</button>
    <label class="switch"><input type="checkbox" data-act="friend-online" ${view.showOnline === false ? '' : 'checked'}/> ${tr(save, 'social.privacy')}</label>
    <h3>${tr(save, 'social.requests')}</h3>
    ${requests || `<p class="muted">${tr(save, 'social.noRequests')}</p>`}
    <h3>${tr(save, 'nav.friends')}</h3>
    ${friends || `<p class="muted">${tr(save, 'social.noFriends')}</p>`}
    <article class="beast-card" data-art="beasts/screen">
      ${beastArt(view.beast ?? 'weltenwurm')}
      <h3>${esc(view.beastName || tr(save, 'social.beast'))}</h3>
      <p>${tr(save, 'social.level', { n: view.level ?? 1 })} · ${tr(save, 'social.attempts', { n: Math.max(0, 3 - (view.attempts ?? 0)) })}</p>
      <div class="hp-beast"><span style="width:${hpWidth}%"></span></div>
      <p class="muted">${tr(save, 'social.chance', { n: Math.round((view.eggChance ?? 0.02) * 100) })}</p>
      <p>${(view.members ?? []).map((name) => esc(name)).join(' · ')}</p>
      <button type="button" class="primary" data-act="coop-attempt">${tr(save, 'social.fight')}</button>
      <button type="button" data-act="coop-claim">${tr(save, 'social.claim')}</button>
    </article>
    ${view.note ? `<p class="muted">${esc(view.note)}</p>` : ''}
  </div></div></div>`
}

function placeArt(path: string, place: string): string {
  const key = path.replace(/\.(webp|jpe?g|png)$/i, '')
  return `<picture class="expedition-art" data-art="${esc(key)}">
    <source type="image/webp" srcset="${art(`${key}.webp`)}">
    <img src="${art(`${key}.jpg`)}" alt="${esc(place)}" onerror="this.style.visibility='hidden'">
  </picture>`
}

function tierMark(tier: 'bronze' | 'silber' | 'gold', on: boolean): string {
  return artImg(`expedition/tier-${tier}_48.png`, `tier-mark${on ? ' on' : ''}`, `expedition/tier-${tier}`)
}

function expeditionScreen(save: SaveV2, now: number, pick: string | undefined, guildLevel = 0): string {
  const state = save.expeditions
  const slots = expeditionSlots(save, guildLevel)
  const used = state?.runs.length ?? 0
  const chosen = state?.quests.find((quest) => quest.id === pick) ?? state?.quests[0]
  const marks = tierMark('bronze', false) + tierMark('silber', false) + tierMark('gold', false)
  const cards = (state?.quests ?? []).map((quest) => {
    const gone = state?.runs.some((run) => run.questId === quest.id)
    const selected = chosen?.id === quest.id
    return `<article class="expedition-card${selected ? ' on' : ''}" data-art="${esc(quest.art)}">
      ${placeArt(quest.art, quest.place)}
      <h3>${esc(quest.place)}</h3>
      <p>${typeIcon(quest.type)}${esc(tr(save, 'expedition.wish', { type: typeLabel(L(save), quest.type, typeName(quest.type)), rarity: quest.rarity }))}</p>
      <p>${tr(save, 'expedition.hours', { n: quest.hours })}</p>
      <div class="tier-row">${marks}</div>
      <p class="muted">${tr(save, 'expedition.egg', { n: 2 })} · ${tr(save, 'expedition.egg', { n: 4 })} · ${tr(save, 'expedition.egg', { n: 8 })}</p>
      ${gone ? `<p class="muted">${tr(save, 'expedition.away')}</p>` : `<button type="button" data-act="expedition-quest" data-id="${esc(quest.id)}">${tr(save, 'expedition.send')}</button>`}
    </article>`
  }).join('')
  const bench = save.pc.filter((uid) => save.mons[uid] && !expeditionBusy(save, uid)).slice(0, 12).map((uid) => {
    const mon = save.mons[uid]
    const tier = chosen ? expeditionTier(species(mon.species).type, species(mon.species).baseRarity, chosen) : 'bronze'
    return `<button type="button" data-act="expedition-send" data-id="${esc(chosen?.id ?? '')}" data-uid="${esc(uid)}">${esc(species(mon.species).name)} · ${tr(save, `expedition.tier.${tier}`)}</button>`
  }).join('')
  const away = (state?.runs ?? []).map((run) => {
    const left = Math.max(0, run.startedAt + run.hours * 60 * 60 * 1000 - now)
    const hours = Math.ceil(left / (60 * 60 * 1000))
    return `<p>${esc(run.place)} · ${tr(save, 'expedition.hours', { n: hours })}</p>`
  }).join('')
  return `<div class="menu-screen"><div class="menu-scroll"><div class="card panel">
    <h2>${tr(save, 'nav.expedition')}</h2>
    <p>${tr(save, 'expedition.lead')}</p>
    <p>${tr(save, 'expedition.slots', { used, slots })}</p>
    <div class="expedition-list">${cards}</div>
    <h3>${tr(save, 'nav.team')}</h3>
    <div class="expedition-bench">${bench || `<p class="muted">${tr(save, 'expedition.empty')}</p>`}</div>
    ${away}
  </div></div></div>`
}

function tradeCard(card: TradeCard | null, save: SaveV2): string {
  if (!card) return `<article class="trade-card empty"><p class="muted">${tr(save, 'trade.pick')}</p></article>`
  return `<article class="trade-card">
    <b>${esc(card.name)}</b>
    <p>${tr(save, 'trade.rarity', { n: card.rarity })} · ${tr(save, 'trade.level', { n: card.level })}${card.shiny ? ` · ${tr(save, 'trade.shiny')}` : ''}</p>
    ${card.reason ? `<p class="trade-lock"><img data-art="trade/lock" src="${art('trade/lock@2x.png')}" alt=""/> ${esc(card.reason)}</p>` : ''}
  </article>`
}

function tradeScreen(save: SaveV2, panel: TradePanel | undefined): string {
  const view = panel ?? { status: 'offline' as const, note: '', mine: null, theirs: null, lockMs: 0, phase: 'pick' as const }
  if (view.status !== 'ready') {
    return `<div class="menu-screen"><div class="menu-scroll"><div class="card panel"><h2>Offline</h2><p class="muted">${tr(save, 'trade.offline')}</p></div></div></div>`
  }
  const seconds = Math.max(0, Math.ceil(view.lockMs / 1000))
  return `<div class="menu-screen"><div class="menu-scroll"><div class="card panel trade-board">
    <h2>${tr(save, 'nav.trade')}</h2>
    <p class="muted">${tr(save, 'trade.lead')}</p>
    ${tradeCard(view.theirs, save)}
    <div class="trade-escrow" data-art="trade/escrow">
      <img class="escrow-art" src="${art('trade/escrow@2x.png')}" alt=""/>
      ${view.phase === 'locked' ? `<p><img data-art="trade/lock" src="${art('trade/lock@2x.png')}" alt=""/> ${tr(save, 'trade.wait', { n: seconds })}</p>` : ''}
    </div>
    ${tradeCard(view.mine, save)}
    <label class="friend-search">${tr(save, 'trade.code')}<input id="trade-code" maxlength="8"/></label>
    <button type="button" class="primary" data-act="trade-offer">${tr(save, 'trade.offer')}</button>
    <button type="button" data-act="trade-lock">${tr(save, 'trade.accept')}</button>
    <button type="button" data-act="trade-confirm">${tr(save, 'trade.confirm')}</button>
    <button type="button" data-act="trade-cancel">${tr(save, 'trade.cancel')}</button>
    ${view.note ? `<p class="muted">${esc(view.note)}</p>` : ''}
  </div></div></div>`
}

const GUILD_TINT: Record<(typeof COLORS)[number], string> = {
  moss: '#8fd27a',
  gold: '#f5c64a',
  sky: '#7cc0f0',
  berry: '#ec7aa4'
}

function guildEmblem(panel?: GuildPanel): string {
  const shape = (SHAPES as readonly string[]).includes(panel?.shape ?? '') ? panel?.shape ?? 'shield' : 'shield'
  const symbol = (SYMBOLS as readonly string[]).includes(panel?.symbol ?? '') ? panel?.symbol ?? 'leaf' : 'leaf'
  const color = (COLORS as readonly string[]).includes(panel?.color ?? '') ? panel?.color ?? 'moss' : 'moss'
  const tint = GUILD_TINT[color as (typeof COLORS)[number]]
  const shapeFile = `guild/shape-${shape}.png`
  return `<span class="guild-emblem" role="img" aria-label="Wappen" data-art="guild/color-${color}">
    <span class="guild-form" data-art="guild/shape-${shape}" style="--guild-color:${tint};--guild-shape:url('${art(shapeFile)}')">
      <img src="${art(shapeFile)}" alt="" onerror="this.style.visibility='hidden'">
    </span>
    <img class="guild-symbol" data-art="guild/symbol-${symbol}" src="${art(`guild/symbol-${symbol}.png`)}" alt="" onerror="this.style.visibility='hidden'">
  </span>`
}

function guildScreen(save: SaveV2, panel: GuildPanel | undefined): string {
  const view = panel ?? { status: 'offline' as const, name: '', tag: '', level: 1, points: 0, note: '' }
  if (view.status !== 'ready') {
    return `<div class="menu-screen"><div class="menu-scroll"><div class="card panel"><h2>Offline</h2><p class="muted">${tr(save, 'guild.offline')}</p></div></div></div>`
  }
  if (!view.name) return guildFoundScreen(save, view)
  const officer = view.role === 'lead' || view.role === 'deputy'
  const goals = (view.goals ?? []).map((goal) => {
    const label = tr(save, `guild.goal.${goal.goal}`)
    return `<li>${esc(label === `guild.goal.${goal.goal}` ? goal.goal : label)} · ${goal.progress}/${goal.target}</li>`
  }).join('')
  const members = (view.members ?? []).map((member) => {
    const role = member.role ?? 'member'
    const actions = [
      view.role === 'lead' && role === 'member' ? `<button type="button" data-act="guild-role" data-id="${esc(member.id)}">${tr(save, 'guild.promote')}</button>` : '',
      view.role === 'lead' && role !== 'lead' && member.id !== '' ? `<button type="button" data-act="guild-kick" data-id="${esc(member.id)}">${tr(save, 'guild.kick')}</button>` : '',
      officer && role !== 'lead' ? `<button type="button" data-act="guild-mute" data-id="${esc(member.id)}">${tr(save, 'guild.mute')}</button>` : ''
    ].join(' ')
    return `<article class="friend-row"><b>${esc(member.label)}</b><p class="muted">${tr(save, `guild.role.${role}`)}</p>${actions}</article>`
  }).join('')
  const requests = officer ? (view.requests ?? []).map((request) => `<article class="friend-row"><b>${esc(request.label)}</b><button type="button" data-act="guild-accept" data-id="${esc(request.id)}">${tr(save, 'guild.accept')}</button><button type="button" data-act="guild-decline" data-id="${esc(request.id)}">${tr(save, 'guild.decline')}</button></article>`).join('') : ''
  return `<div class="menu-screen"><div class="menu-scroll"><div class="card panel guild-board">
    <h2>${tr(save, 'nav.guild')}</h2>
    ${guildEmblem(view)}
    <h3>${esc(view.name)} ${view.tag ? `· ${esc(view.tag)}` : ''}</h3>
    <p>${tr(save, 'guild.level', { n: view.level })} · ${tr(save, 'guild.points', { n: view.points })}</p>
    ${officer && view.code ? `<p>${tr(save, 'guild.code')}: <b>${esc(view.code)}</b></p>` : ''}
    <p class="muted">${tr(save, 'guild.lead')}</p>
    <ul class="guild-goals">${goals}</ul>
    ${officer ? `<h3>${tr(save, 'guild.requests')}</h3>${requests || `<p class="muted">${tr(save, 'social.noRequests')}</p>`}` : ''}
    <h3>${tr(save, 'guild.members')}</h3>
    ${members}
    <div class="guild-phrases">
      <button type="button" data-act="guild-phrase" data-id="hallo">${tr(save, 'guild.phrase')}</button>
      <button type="button" data-act="guild-phrase" data-id="danke">Danke</button>
      <button type="button" data-act="guild-phrase" data-id="los">Los</button>
    </div>
    <button type="button" data-act="guild-leave">${tr(save, 'guild.leave')}</button>
    ${view.note ? `<p class="muted">${esc(view.note)}</p>` : ''}
  </div></div></div>`
}

function guildFoundScreen(save: SaveV2, view: GuildPanel): string {
  const crests = crestCount(save.badges)
  const block = guildFoundBlock(crests, save.gold, save.region, view.draftName ?? '', view.draftTag ?? '')
  const reason = block.reason === 'crests'
    ? tr(save, 'guild.reason.crests', { n: crests })
    : block.reason === 'gold'
      ? tr(save, 'guild.reason.gold', { gold: foundCost(save.region).toLocaleString(L(save) === 'en' ? 'en' : 'de-DE') })
      : tr(save, 'guild.reason.name')
  const hits = (view.hits ?? []).map((hit) => `<article class="friend-row"><b>${esc(hit.name)} · ${esc(hit.tag)}</b><button type="button" data-act="guild-join" data-name="${esc(hit.name)}">${tr(save, 'guild.join')}</button></article>`).join('')
  return `<div class="menu-screen"><div class="menu-scroll"><div class="card panel guild-board">
    <h2>${tr(save, 'nav.guild')}</h2>
    ${guildEmblem()}
    <label class="friend-search">${tr(save, 'guild.name')}<input id="guild-name" data-field="guild-name" maxlength="20" value="${esc(view.draftName ?? '')}"/></label>
    <label class="friend-search">${tr(save, 'guild.tag')}<input id="guild-tag" data-field="guild-tag" maxlength="3" value="${esc(view.draftTag ?? '')}"/></label>
    <button type="button" class="primary" data-act="guild-found" ${block.disabled ? 'disabled' : ''}>${tr(save, 'guild.found')}</button>
    <p id="guild-reason" class="muted">${block.disabled ? esc(reason) : ''}</p>
    <label class="friend-search">${tr(save, 'guild.search')}<input id="guild-query" data-field="guild-query" maxlength="20" value="${esc(view.draftQuery ?? '')}"/></label>
    <button type="button" data-act="guild-search">${tr(save, 'guild.search')}</button>
    ${hits}
    <label class="friend-search">${tr(save, 'guild.code')}<input id="guild-code" data-field="guild-code" maxlength="8" value="${esc(view.draftCode ?? '')}"/></label>
    <button type="button" data-act="guild-join">${tr(save, 'guild.join')}</button>
    ${view.note ? `<p class="muted">${esc(view.note)}</p>` : ''}
  </div></div></div>`
}

function chatScreen(save: SaveV2, panel: ChatPanel | undefined): string {
  const view = panel ?? { status: 'offline' as const, lines: [], note: '', adult: null }
  if (view.status === 'offline') {
    return `<div class="menu-screen"><div class="menu-scroll"><div class="card panel"><h2>Offline</h2><p class="muted">${tr(save, 'chat.offline')}</p></div></div></div>`
  }
  if (view.status === 'age' || view.adult === null) {
    return `<div class="menu-screen"><div class="menu-scroll"><div class="card panel">
      <h2>${tr(save, 'nav.chat')}</h2>
      <p>${tr(save, 'chat.year')}</p>
      <input id="chat-year" type="number" inputmode="numeric" min="1900" max="2026"/>
      <button type="button" class="primary" data-act="chat-age">${tr(save, 'chat.yearSave')}</button>
    </div></div></div>`
  }
  if (!view.adult) {
    return `<div class="menu-screen"><div class="menu-scroll"><div class="card panel">
      <h2>${tr(save, 'nav.chat')}</h2>
      <p>${tr(save, 'chat.young')}</p>
      <button type="button" data-act="guild-phrase" data-id="hallo">${tr(save, 'guild.phrase')}</button>
    </div></div></div>`
  }
  const lines = view.lines.map((line) => `<p class="chat-line"><b>${esc(line.label)}</b> ${esc(line.body)} <button type="button" data-act="chat-report" data-id="${esc(line.label)}"><img class="chat-icon" src="${art('chat/report@2x.png')}" alt="" onerror="this.style.visibility='hidden'"/>${tr(save, 'chat.report')}</button> <button type="button" data-act="chat-mute" data-id="${esc(line.label)}"><img class="chat-icon" src="${art('chat/mute@2x.png')}" alt="" onerror="this.style.visibility='hidden'"/>${tr(save, 'chat.mute')}</button></p>`).join('')
  const channel = view.channel === 'dm' ? 'dm' : 'guild'
  const friends = view.friends ?? []
  const friend = view.friend && friends.some((row) => row.code === view.friend) ? view.friend : (friends[0]?.code ?? '')
  const options = friends.map((row) => `<option value="${esc(row.code)}"${row.code === friend ? ' selected' : ''}>${esc(row.label)}</option>`).join('')
  return `<div class="menu-screen chat-screen"><div class="menu-scroll"><div class="card panel">
    <h2>${tr(save, 'nav.chat')}</h2>
    <div class="chat-channel">
      <button type="button" data-act="chat-channel" data-id="guild" aria-pressed="${channel === 'guild' ? 'true' : 'false'}">${tr(save, 'chat.channel.guild')}</button>
      <button type="button" data-act="chat-channel" data-id="dm" aria-pressed="${channel === 'dm' ? 'true' : 'false'}">${tr(save, 'chat.channel.friend')}</button>
    </div>
    ${channel === 'dm' ? (options ? `<label class="friend-search">${tr(save, 'chat.pickFriend')}<select id="chat-friend" data-act="chat-friend">${options}</select></label>` : `<p class="muted">${tr(save, 'chat.noFriend')}</p>`) : ''}
    ${lines || `<p class="muted">${tr(save, 'chat.empty')}</p>`}
    ${view.note ? `<p class="chat-error">${esc(view.note)}</p>` : ''}
  </div></div>
  <form class="chat-form" data-act="chat-form">
    <input id="chat-text" data-field="chat" maxlength="200" autocomplete="off" value="${esc(view.draft ?? '')}"/>
    <button type="submit" class="chat-send"><img class="chat-icon" src="${art('chat/send@2x.png')}" alt="" onerror="this.style.visibility='hidden'"/>${tr(save, 'chat.send')}</button>
  </form></div>`
}

function center(save: SaveV2, screen: Screen, now: number, pc: PcQuery, dex: CodexQuery, selected: string | null, debug: boolean, wheel: WheelPanel, shell: ShellFlags): string {
  if (screen === 'progress') return `<div class="menu-screen"><div class="menu-scroll">${progress(save)}</div></div>`
  if (screen === 'ranks') return ranksScreen(save, shell.ranks)
  if (screen === 'tree') return treeScreen(save, shell.treePick, now)
  if (screen === 'tower') return towerScreen(save, now)
  if (screen === 'arena') return arenaScreen(save, shell.arena)
  if (screen === 'social') return socialScreen(save, shell.social)
  if (screen === 'expedition') return expeditionScreen(save, now, shell.expeditionPick, shell.guild?.level ?? 0)
  if (screen === 'trade') return tradeScreen(save, shell.trade)
  if (screen === 'guild') return guildScreen(save, shell.guild)
  if (screen === 'chat') return chatScreen(save, shell.chat)
  if (screen === 'team') return team(save, pc, selected, shell)
  if (screen === 'codex') return codex(save, dex, shell)
  if (screen === 'activities') return activitiesView(save, now, selected, wheel)
  if (screen === 'shop') return shop(save, now, shell.shopTab ?? 'chests', shell.shopHint === true)
  if (screen === 'achievements') return achievementsView(save)
  if (screen === 'options') return options(save, debug, shell)
  return guide(save)
}

export function gameHtml(save: SaveV2, screen: Screen, now: number, pc: PcQuery, dex: CodexQuery, selected: string | null, sideOpen: boolean, debug: boolean, overlay: Overlay | null, step = save.step, wheel: WheelPanel = { tab: 'hort', mult: 1, symbols: null, note: '' }, shell: ShellFlags = {}): string {
  const adventure = screen === 'adventure'
  const mapOpen = Boolean(shell.mapOpen)
  const moreOpen = Boolean(shell.moreOpen)
  const chapter = chapterById(save.region, save.chapter)
  const map = mapOpen ? `<div class="map-sheet card">
      <label class="switch">${ui('optLoop')}<input type="checkbox" data-field="loop" ${save.loop ? 'checked' : ''}/> ${tr(save, 'nav.loop')}</label>
      <p class="muted">${save.badges.includes(chapter.guardian.badge) && chapter.guardian.badge ? `<img class="crest-mini" src="${art(crestArt(chapter.guardian.badge))}" alt=""/>` : ''}${tr(save, 'nav.crest', { name: save.badges.includes(chapter.guardian.badge) && chapter.guardian.badge ? chapter.guardian.badge : '—' })}</p>
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
        ${screen === 'shop' ? '' : header(save, now, cloudState(shell))}
        ${adventure ? chapterLine(save, step, mapOpen) : ''}
        ${adventure ? path(save, step) : ''}
      </div>
      <div class="anchor anchor-mid">${adventure ? battle(save, now, shell.fighting, cloudState(shell).flagLevel === 2) : center(save, screen, now, pc, dex, selected, debug, wheel, shell)}</div>
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
      ${shell.masteryNote ? `<p class="mastery-toast" role="status">${esc(shell.masteryNote)}</p>` : ''}
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
  if (overlay.kind === 'quit') {
    return `<div class="sheet" data-sheet="swipe">${grab()}<h2>${tr(save, 'shell.quitTitle')}</h2><p>${tr(save, 'shell.quitBody')}</p><button class="primary" data-act="quit-yes">${tr(save, 'shell.quitYes')}</button> <button class="ghost" data-act="close">${tr(save, 'shell.quitNo')}</button></div>`
  }
  if (overlay.kind === 'confirm-reset') {
    return `<div class="sheet" data-sheet="swipe">${grab()}<h2>${tr(save, 'reset.title')}</h2><p>${tr(save, 'reset.body')}</p><button class="primary" data-act="reset-yes">${tr(save, 'reset.yes')}</button> <button class="ghost" data-act="close">${tr(save, 'reset.no')}</button></div>`
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
      <p>${tr(save, 'welcome.mastery', { names: overlay.summary.mastery.length ? overlay.summary.mastery.map((row) => `${species(row.speciesId).name} ${row.level}`).join(', ') : '—' })}</p>
      ${overlay.summary.badges.length ? `<p class="crest-row">${overlay.summary.badges.map((name) => `<img class="crest-mini" src="${art(crestArt(name))}" alt="${esc(name)}"/>`).join('')}</p>` : ''}
      <p>${tr(save, 'welcome.badges', { names: overlay.summary.badges.length ? overlay.summary.badges.join(', ') : '—' })}</p>
    </div>
    <button type="button" class="primary" data-act="close">${tr(save, 'welcome.next')}</button>
    </div>`
  }
  if (overlay.kind === 'guard') {
    return `<div class="sheet" data-sheet="swipe">${grab()}<div class="sheet-body"><div class="kicker">${tr(save, 'guard.title')}</div><h2>${tr(save, overlay.win ? 'guard.win' : 'guard.loss')}</h2>
      <p>${esc(overlay.text)}</p>
      ${overlay.badge ? `<p><img class="crest-mini" src="${art(crestArt(overlay.badge))}" alt=""/>${tr(save, 'guard.badge', { name: esc(overlay.badge) })}</p>` : ''}
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
      <p>${typeIcon(sp.type)}${esc(typeLabel(L(save), sp.type, typeName(sp.type)))} · ${esc(rarityLabel(L(save), sp.baseRarity, rarityName(sp.id)))} · Lv ${overlay.level}</p>
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
    ${masteryStarRow(masteryLevel(save.mastery?.[id] ?? 0))}
    <p>${typeIcon(sp.type)}${esc(typeName(sp.type))} · ${esc(rarityInfo(sp.baseRarity).name)} · ${tr(save, 'codex.catches', { n: (save.dex[id]?.caught ?? 0).toLocaleString('de-DE') })}</p>
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
  const rank = masteryLevel(save.mastery?.[mon.species] ?? 0)
  const goal = masteryGoal(save.mastery?.[mon.species] ?? 0)
  const stats = monStats(mon, mon.lvl, rank)
  const need = expToNext(mon.lvl)
  const pct = Math.max(0, Math.min(100, (mon.exp / need) * 100))
  const when = new Date(mon.caughtAt).toLocaleString('de-DE')
  return `<div class="sheet sheet-full" data-sheet="swipe">${grab()}
    <div class="sheet-body">
    <img class="hero" src="${monsterArt(sp.id, true)}" alt=""/>
    <h2>${esc(sp.name)}${mon.shiny ? ' · Schimmer' : ''} · ${tr(save, 'chest.star', { n: save.stars[sp.id] ?? 0 })}</h2>
    ${masteryPlate(save, sp.id)}
    <div class="bar-exp m-bar"><span style="width:${goal.pct}%"></span></div>
    <p class="muted">${goal.done ? tr(save, 'mastery.max') : tr(save, 'mastery.ep', { have: goal.into.toLocaleString('de-DE'), need: goal.span.toLocaleString('de-DE') })} · ${tr(save, 'mastery.bonus', { pct: rank * 2 })}</p>
    <p>${typeIcon(sp.type)}${esc(typeLabel(L(save), sp.type, typeName(sp.type)))} · ${esc(rarityLabel(L(save), sp.baseRarity, rarityInfo(sp.baseRarity).name))} · Lv ${mon.lvl} · ${tr(save, 'card.awaken', { n: mon.lvl >= 50 ? 2 : mon.lvl >= 25 ? 1 : 0 })}</p>
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
    <p>${tr(save, 'chest.star', { n: save.stars[sp.id] ?? 0 })} · <img class="shard-ico" src="${art('ui/shard_64.webp')}" alt="Splitter" width="28" height="28"/> ${save.shards[sp.id] ?? 0}</p>
    ${(save.stars[sp.id] ?? 0) < 5 ? `<button type="button" class="primary" data-act="star" data-id="${sp.id}">${tr(save, 'chest.starUp')} (${starCost(sp.baseRarity, (save.stars[sp.id] ?? 0) + 1)})</button>` : ''}
    ${Object.values(save.mons).filter((row) => row.species === sp.id).length > 1 ? `<button type="button" data-act="melt" data-uid="${uid}">Einschmelzen</button>` : ''}
    </div>
    <button type="button" class="primary" data-act="close">${tr(save, 'codex.close')}</button>
  </div>`
}

export function lookFace(look: AvatarLook, frame = ''): string {
  const canvas = `<canvas class="look-face" data-look="${look.skin},${look.hair},${look.color}" width="512" height="512"></canvas>`
  if (!isDailyFrame(frame)) return canvas
  return `<span class="look-wrap">${dailyFrameSvg(frame)}<span class="look-face-clip">${canvas}</span></span>`
}

export function continueHtml(save: SaveV2, now: number, lang: Lang = 'de', asking = false): string {
  const facts = continueFacts(save, now)
  const ago = agoParts(facts.agoMs)
  const played = ago.unit === 'now'
    ? t(lang, 'start.playedNow')
    : t(lang, ago.unit === 'min' ? 'start.playedMin' : ago.unit === 'hour' ? 'start.playedHour' : 'start.playedDay', { n: ago.n })
  return `<div id="stage" class="home is-door" lang="${lang}">
    <div class="home-scroll">
      ${homeTop(lang, false, true, Boolean(save.settings.reduceMotion))}
      <article class="continue-card">
        <div class="continue-who">${lookFace(save.look, save.equippedFrame ?? '')}<div><b>${esc(facts.name)}</b><p>${esc(played)}</p></div></div>
        <p>${esc(t(lang, 'start.place', { region: facts.region, chapter: facts.chapter, step: facts.step }))}</p>
        <p>${esc(t(lang, 'start.teamLine', { name: facts.lead, level: facts.leadLevel, team: facts.team }))}</p>
        <p>${esc(t(lang, 'start.best', { name: facts.strongest, level: facts.strongestLevel }))}</p>
        <p class="continue-gold">${gold(facts.gold)}</p>
      </article>
    </div>
    <div class="home-bar">
      <button type="button" class="primary" data-act="continue">${esc(t(lang, 'start.resume'))}</button>
      <button type="button" class="door-new" data-act="new-game">${esc(t(lang, 'start.new'))}</button>
    </div>
    ${asking ? overwriteHtml(lang) : ''}
  </div>`
}

export function brokenHtml(lang: Lang = 'de', backup = false): string {
  return `<div id="stage" class="home is-door" lang="${lang}">
    <div class="home-scroll">
      ${homeTop(lang, false, true, false)}
      <article class="continue-card">
        <h1>${esc(t(lang, 'start.broken'))}</h1>
        <p>${esc(t(lang, 'start.brokenBody'))}</p>
      </article>
    </div>
    <div class="home-bar">
      ${backup ? `<button type="button" class="primary" data-act="restore">${esc(t(lang, 'start.restore'))}</button>` : ''}
      <button type="button" class="door-new" data-act="new-game">${esc(t(lang, 'start.new'))}</button>
    </div>
  </div>`
}

function homeTop(lang: Lang, open: boolean, hero = false, reduced = false, compact = false): string {
  const chip = `<button type="button" class="lang-chip" data-act="lang-sheet" aria-expanded="${open ? 'true' : 'false'}" aria-label="${esc(t(lang, 'start.lang'))}">${lang === 'en' ? 'EN' : 'DE'} ▾</button>`
  if (!hero) {
    return `<div class="home-top">
      <p class="home-kicker">${t(lang, 'start.kicker')}</p>
      ${chip}
    </div>`
  }
  const picture = `<img class="home-lqip" src="${art('home/keyart_1080_lqip.jpg')}" alt=""/>
    <img class="home-key" src="${art('home/keyart_1080.webp')}" alt="${esc(t(lang, 'start.lead'))}"/>
    <img class="home-logo" src="${art('home/logo_velunor_light.png')}" alt="Velunor"/>
    <div class="home-particles" data-reduced="${reduced ? '1' : '0'}"></div>`
  if (!compact) {
    return `<header class="home-hero">
      ${picture}
      <p class="home-hero-lead">${esc(t(lang, 'start.lead'))}</p>
      ${chip}
    </header>`
  }
  return `<div class="home-head">
    <header class="home-hero">${picture}</header>
    ${chip}
  </div>
  <p class="home-hero-lead">${esc(t(lang, 'start.lead'))}</p>`
}

export function loadingHtml(fraction: number, hint: string, failed: boolean, lang: Lang = 'de'): string {
  const pct = Math.round(Math.max(0, Math.min(1, fraction)) * 100)
  const fail = failed
    ? `<p class="boot-fail">${esc(t(lang, 'boot.fail'))}</p><button type="button" class="primary" data-act="reload">${esc(t(lang, 'boot.reload'))}</button>`
    : `<div class="boot-silhouettes" aria-hidden="true">
        <img src="${art('home/loading_silhouette_1.png')}" alt=""/>
        <img src="${art('home/loading_silhouette_2.png')}" alt=""/>
        <img src="${art('home/loading_silhouette_3.png')}" alt=""/>
      </div>`
  return `<div id="stage" class="home is-boot${failed ? ' is-boot-fail' : ''}" lang="${lang}">
    <img class="boot-logo" src="${art('home/loading_logo.png')}" alt="Velunor"/>
    <p id="boot-hint">${esc(hint)}</p>
    <div class="boot-track" role="progressbar" aria-label="${esc(t(lang, 'boot.loading'))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span id="boot-bar" style="width:${pct}%"></span></div>
    ${fail}
  </div>`
}

function overwriteHtml(lang: Lang): string {
  return `<div class="overwrite" role="alertdialog" aria-modal="true" aria-labelledby="overwrite-title" aria-describedby="overwrite-body">
    <div class="overwrite-card">
      <h2 id="overwrite-title">${esc(t(lang, 'start.overwriteTitle'))}</h2>
      <p id="overwrite-body">${esc(t(lang, 'start.overwriteBody'))}</p>
      <button type="button" class="primary" id="overwrite-no" data-act="overwrite-no">${esc(t(lang, 'start.cancel'))}</button>
      <button type="button" class="danger" data-act="overwrite-yes">${esc(t(lang, 'start.overwriteYes'))}</button>
    </div>
  </div>`
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
  const thumb = !nameStep && picked ? `<img src="${art(`home/starter_${picked}.png`)}" alt=""/>` : ''
  return `<div id="stage" class="home${nameStep ? ' is-name' : ' is-starter'}" lang="${lang}">
    <div class="home-scroll">
      ${homeTop(lang, langOpen, nameStep, false, nameStep)}
      ${nameStep ? nameStepHtml(name, look, lang, problem ? t(lang, `start.err.${problem}`) : '') : starterStepHtml(name, look, picked, lang)}
    </div>
    <div class="home-bar">
      <p class="home-reason" id="home-reason" ${reason ? '' : 'hidden'}>${esc(reason)}</p>
      <button type="button" class="primary" id="home-next" data-act="${nextAct}" ${nextOff ? 'disabled' : ''}>${thumb}${esc(nextLabel)}</button>
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
  const cards = STARTERS.map((starter, index) => starterCard(starter.id, index, picked, lang)).join('')
  const dots = STARTERS.map((starter, index) => `<button type="button" class="starter-dot${index === 0 ? ' on' : ''}" data-act="starter-dot" data-index="${index}" aria-label="${esc(species(starter.id).name)}" aria-current="${index === 0 ? 'true' : 'false'}"><span></span></button>`).join('')
  return `<div class="starter-head">
      <button type="button" class="home-back" data-act="back">${esc(t(lang, 'start.back'))}</button>
      <div class="home-you">${lookFace(look)}<b>${esc(name.trim())}</b></div>
    </div>
    <h1>${t(lang, 'start.pickTitle')}</h1>
    <div id="starter-scroller" class="starter-scroller" role="radiogroup" aria-label="${esc(t(lang, 'start.group'))}">${cards}</div>
    <div class="starter-dots">${dots}</div>
    <p class="starter-note">${esc(t(lang, 'start.equal'))}</p>
    <div id="starter-fx" hidden></div>`
}

function starterCard(id: string, index: number, picked: string, lang: Lang): string {
  const row = species(id)
  const artSet = STARTER_ART[id]
  const on = picked === id
  const bars = starterBars(id)
  const type = typeLabel(lang, row.type, typeName(row.type))
  const role = t(lang, row.role === 'front' ? 'start.front' : 'start.backRole')
  const strong = typeList(lang, strongTypes(row.type))
  const weak = typeList(lang, weakTypes(row.type))
  const skill = row.skill.name ?? ''
  const pct = (value: number) => `${Math.round(value * 100)}%`
  return `<article class="starter-card${on ? ' is-on' : ''}" role="radio" tabindex="0" data-species="${id}" data-index="${index}" aria-checked="${on ? 'true' : 'false'}" style="--type:${typeColor(row.type)}">
    <img class="starter-frame" src="${art(artSet.frame)}" alt=""/>
    ${on ? `<img class="starter-check" src="${art('home/check.png')}" alt=""/>` : ''}
    <div class="starter-body">
      <button type="button" class="starter-art" data-act="preview" data-species="${id}" aria-label="${esc(t(lang, 'start.preview', { name: row.name }))}">
        <img src="${art(`home/starter_${id}.png`)}" alt=""/>
      </button>
      <div class="starter-copy">
        <b class="starter-name">${esc(row.name)}</b>
        <div class="starter-chips">
          <span class="starter-chip"><img src="${art(artSet.type)}" alt=""/>${esc(type)}</span>
          <span class="starter-chip"><img src="${art(artSet.role)}" alt=""/>${esc(role)}</span>
        </div>
        <p class="starter-blurb">${esc(row.blurb)}</p>
        <div class="starter-bars">
          ${bar(t(lang, 'start.hp'), bars.hp, pct(bars.hp))}
          ${bar(t(lang, 'start.atk'), bars.atk, pct(bars.atk))}
          ${bar(t(lang, 'start.tempo'), bars.spd, pct(bars.spd))}
        </div>
        <p class="starter-skill"><b>${esc(skill)}</b> ${esc(row.skill.description ?? '')}</p>
        <p class="starter-match">${esc(t(lang, 'start.strong', { list: strong }))} · ${esc(t(lang, 'start.weak', { list: weak }))}</p>
      </div>
      <button type="button" class="starter-choose" data-act="pick" data-species="${id}">${esc(t(lang, on ? 'start.chosen' : 'start.choose', { name: row.name }))}</button>
    </div>
  </article>`
}

function bar(label: string, value: number, text: string): string {
  return `<div class="starter-bar"><span>${esc(label)}</span><span class="starter-track" role="img" aria-label="${esc(label)} ${esc(text)}"><span style="width:${Math.round(value * 100)}%"></span></span></div>`
}
