import { monsters, rarityInfo, species, typeName } from '../data'
import type { TypeId } from '../types'
import {
  ALLY_X,
  FEET_Y,
  FOE_X,
  SCENE_FILES,
  SEAL_ADD,
  SEAL_FALLBACK,
  STARTERS,
  assetPath
} from './const'
import { baseLine, dexPlaces, dexStatus, dexStatusLabel, listCodex, regionProgress, speciesNumber, type DexFilter } from './dex'
import { goalName, goalTitle, rarityLabel, t, typeLabel, weatherLabel, whenLabel, type Lang } from './i18n'
import { exportCode } from './save'
import { fightsHere } from './origin'
import { chapterById, gateBadge, placeLabel, regionById, regions, routeOf, type NodeKind } from './route'
import { chapterUnlocked, dexCaughtCount, hereSightings, rarityName } from './sim'
import { equippedFrame, equippedTitle, GOALS } from './achievements'
import { HORT_PRICES, hortOffer } from './hort'
import { CRYSTALS, FRUITS, crystalExp, crystalPrice, crystalUnlocked, fruitDef, fruitMinutes, fruitPrice, sellValue, shopLevel, wappenCount } from './shop'
import { weatherForecast, weatherName, type WeatherId } from './weather'
import { FACES, MULTIPLIERS, PRIZES, faceById, spinCost, wheelOpen, type Multiplier, type SymbolId } from './wheel'
import { expToNext, isAlive, monStats, realHp } from './stats'
import type { OfflineSummary } from './sim'
import type { SaveV2 } from './types'

export type Screen = 'adventure' | 'progress' | 'team' | 'codex' | 'activities' | 'shop' | 'achievements' | 'options' | 'guide'

export interface WheelPanel {
  tab: 'hort' | 'wheel'
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

function nav(save: SaveV2, screen: Screen, step: number): string {
  const chapter = chapterById(save.region, save.chapter)
  const region = regionById(save.region)
  const caught = dexCaughtCount(save)
  const items: [Screen, string][] = [
    ['adventure', 'nav.adventure'],
    ['progress', 'nav.progress'],
    ['team', 'nav.team'],
    ['codex', 'nav.codex'],
    ['activities', 'nav.activities'],
    ['shop', 'nav.shop'],
    ['achievements', 'nav.achievements']
  ]
  return `<aside class="nav">
    <div class="card player">
      <div class="avatar ${save.avatar === 'B' ? 'b' : ''} ${equippedFrame(save) ? `frame-${equippedFrame(save)}` : ''}">${save.avatar}</div>
      <div>
        <div class="who">${esc(save.name)}</div>
        ${equippedTitle(save) ? `<div class="title">${esc(equippedTitle(save))}</div>` : ''}
        <div class="muted">${tr(save, 'nav.codexCount', { n: caught })}</div>
        <div class="gold" id="gold">${gold(save.gold)}</div>
        ${wheelOpen(save) || save.marks > 0 ? `<div class="muted">${tr(save, 'nav.marks', { n: save.marks.toLocaleString(L(save) === 'en' ? 'en' : 'de-DE') })}</div>` : ''}
      </div>
    </div>
    <div class="card chapter">
      <div class="kicker">${esc(region.name)}</div>
      <h2>${esc(chapter.name)}</h2>
      <div>${tr(save, 'nav.crest', { name: save.badges.includes(chapter.guardian.badge) ? chapter.guardian.badge : '—' })}</div>
      <div>${chapter.council ? tr(save, 'nav.council', { step, total: chapter.council.members.length }) : tr(save, 'nav.step', { step })}</div>
      <div class="muted">${chapter.council ? tr(save, 'nav.councilCap', { cap: chapter.council.members[Math.max(0, step - 1)]?.cap ?? chapter.cap }) : tr(save, 'nav.cap', { min: chapter.levelMin, max: chapter.levelMax, cap: chapter.cap })}</div>
      <label class="switch"><input type="checkbox" data-field="loop" ${save.loop ? 'checked' : ''}/> ${tr(save, 'nav.loop')}</label>
    </div>
    <div class="card menu">
      ${items.map(([id, label]) => `<button data-act="screen" data-screen="${id}" class="${screen === id ? 'active' : ''}">${tr(save, label)}</button>`).join('')}
    </div>
    <div class="nav-foot">
      <button class="text-btn" data-act="screen" data-screen="options">${tr(save, 'nav.options')}</button>
      <button class="text-btn" data-act="screen" data-screen="guide">${tr(save, 'nav.guide')}</button>
    </div>
  </aside>`
}

function path(save: SaveV2, here: number): string {
  const chapter = chapterById(save.region, save.chapter)
  if (chapter.council) {
    const cells = chapter.council.members.map((member, index) => {
      const step = index + 1
      const cls = step === here ? 'is-here' : step < here ? 'is-done' : ''
      return `<div class="node ${cls}" title="${esc(member.name)}">${icon('guardian')}<small>${step}</small></div>`
    })
    return `<div class="card path council-path" id="path">${cells.join('')}</div>`
  }
  const route = routeOf(save.chapter)
  const cells = []
  for (let step = 1; step <= 20; step++) {
    const kind = route[step]
    const cls = step === here ? 'is-here' : step < here ? 'is-done' : ''
    cells.push(`<div class="node ${cls}" title="${kind}">${icon(kind)}<small>${step}</small></div>`)
  }
  return `<div class="card path" id="path">${cells.join('')}</div>`
}

function battle(save: SaveV2, now: number): string {
  const chapter = chapterById(save.region, save.chapter)
  const scene = SCENE_FILES[chapter.scene]
  const active = save.active && save.mons[save.active] ? save.active : save.team[0]
  const mon = active ? save.mons[active] : null
  const hp = mon ? realHp(mon) : { hp: 1, max: 1 }
  const minis = save.team.map((uid) => {
    const row = save.mons[uid]
    const bar = realHp(row)
    const fainted = !isAlive(row)
    return `<button class="mini ${uid === active ? 'is-active' : ''} ${fainted ? 'is-fainted' : ''}" data-act="send" data-uid="${uid}">
      <img src="${monsterArt(row.species)}" alt=""/>
      <span class="bar"><span style="width:${fainted ? 0 : (bar.hp / bar.max) * 100}%"></span></span>
    </button>`
  }).join('')
  const clock = new Date(now)
  const part = tr(save, clock.getHours() >= 8 && clock.getHours() <= 19 ? 'battle.day' : 'battle.night')
  return `<div class="battle" id="battle">
    <picture>
      <source srcset="${art(scene.webp)}" type="image/webp"/>
      <img class="plate ${chapter.tint ? `tint-${chapter.tint}` : ''}" src="${art(scene.jpg)}" alt=""/>
    </picture>
    <div class="team-rail">${minis}</div>
    <div class="combatant ally" style="left:${ALLY_X}%;top:${FEET_Y}%">
      <b id="ally-name">${mon ? esc(species(mon.species).name) : ''}</b>
      <div class="hp"><span id="ally-hp" style="width:${(hp.hp / hp.max) * 100}%"></span></div>
      ${mon ? `<img class="sprite ${mon.shiny ? 'is-shiny' : ''}" id="ally-sprite" src="${monsterArt(mon.species, true)}" alt=""/>` : ''}
    </div>
    <div class="combatant foe" style="left:${FOE_X}%;top:${FEET_Y}%">
      <b id="foe-name"></b>
      <div class="hp"><span id="foe-hp" style="width:100%"></span></div>
      <img class="sprite" id="foe-sprite" alt="" hidden/>
    </div>
    <div class="flash" id="flash"></div>
    <img class="seal" id="seal" alt="" src="${art(SEAL_ADD)}" data-fb="${art(SEAL_FALLBACK)}"/>
    <div class="battle-text">
      <p id="battle-text">${tr(save, 'battle.place', { part, weather: weatherLabel(L(save), weatherForecast(now)[0].weather), place: chapter.name, state: tr(save, save.hold ? 'battle.waiting' : 'battle.walking') })}</p>
      <div class="speed">
        ${([1, 2, 3] as const).map((speed) => `<button data-act="speed" data-speed="${speed}" class="${save.settings.speed === speed ? 'on' : ''}">×${speed}</button>`).join('')}
      </div>
      ${gateBadge(save.region, chapter) && save.badges.includes(gateBadge(save.region, chapter)) ? '' : `<button class="primary" data-act="challenge">${tr(save, chapter.council || chapter.foyer ? 'battle.resume' : 'battle.challenge')}</button>`}
    </div>
  </div>`
}

function logBox(save: SaveV2): string {
  const lines = [...save.log].reverse().map((line) => `<div>${esc(line.text)}</div>`).join('')
  return `<div class="card log" id="log">${lines || `<div class="muted">${tr(save, 'log.empty')}</div>`}</div>`
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

function sightings(save: SaveV2, now: number, open: boolean): string {
  const rows = hereSightings(save, now)
  const hour = new Date(now).getHours()
  const night = hour < 8 || hour > 19
  const forecast = weatherForecast(now)
  const current = forecast[0]
  const body = rows.map((row) => `<div class="sight-row">
      <span class="seal-ring" style="--pity:${Math.max(0, Math.min(1, row.pity / 10))}" title="${row.pity ? `Bannsiegel +${row.pity.toLocaleString('de-DE')} Pp` : ''}">
        <img class="${row.caught ? '' : 'sil'}" src="${monsterArt(row.species)}" alt=""/>
      </span>
      <div><b>${row.caught ? esc(row.name) : '???'}</b><div class="muted">${esc(row.type)}</div></div>
      <span class="pct">${Math.round(row.pct)} %</span>
    </div>`).join('')
  const preview = forecast.map((slot, index) => {
    const label = new Date(slot.at).getUTCHours().toString().padStart(2, '0')
    return `<span class="wx ${index === 0 ? 'now' : ''}" title="${label} UTC · ${weatherName(slot.weather)}">${weatherIcon(slot.weather)}</span>`
  }).join('')
  return `<aside class="side">
    <div class="card side-card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h2>${tr(save, 'side.seen')}</h2>
        <button class="ghost" data-act="side">${tr(save, open ? 'side.close' : 'side.open')}</button>
      </div>
      ${open ? `<div class="clock"><span class="wx">${weatherIcon(current.weather)}</span> ${tr(save, night ? 'battle.night' : 'battle.day')} · ${weatherLabel(L(save), current.weather)}</div>
        <div class="forecast" aria-label="${tr(save, 'side.forecast')}">${preview}</div>
        <div class="sight">${body || `<div class="muted">${tr(save, 'side.empty')}</div>`}</div>` : `<div class="clock"><span class="wx">${weatherIcon(current.weather)}</span></div>`}
    </div>
    ${fruitCard(save, now, open)}
  </aside>`
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

function team(save: SaveV2, pc: PcQuery, selected: string | null): string {
  const types = [...new Set(monsters.map((mon) => mon.type))]
  const list = save.pc.filter((uid) => {
    const mon = save.mons[uid]
    const sp = species(mon.species)
    if (pc.q && !sp.name.toLowerCase().includes(pc.q.toLowerCase())) return false
    if (pc.type && sp.type !== pc.type) return false
    if (pc.rarity !== '' && String(sp.baseRarity) !== pc.rarity) return false
    if (pc.shiny === '1' && !mon.shiny) return false
    if (pc.shiny === '0' && mon.shiny) return false
    return true
  })
  const value = (uid: string): number => {
    const mon = save.mons[uid]
    const sp = species(mon.species)
    if (pc.sort === 'dex') return Number(sp.id.slice(1))
    if (pc.sort === 'name') return 0
    if (pc.sort === 'level') return mon.lvl
    if (pc.sort === 'rarity') return sp.baseRarity
    if (pc.sort === 'stats') {
      const stats = monStats(mon)
      return stats.hp + stats.atk + stats.def + stats.spd
    }
    return mon.caughtAt
  }
  list.sort((a, b) => {
    if (pc.sort === 'name') return species(save.mons[a].species).name.localeCompare(species(save.mons[b].species).name, 'de') * pc.dir
    return (value(a) - value(b)) * pc.dir
  })
  const cards = list.map((uid) => {
    const mon = save.mons[uid]
    const sp = species(mon.species)
    return `<button class="mon-card ${selected === uid ? 'on' : ''}" data-act="select" data-uid="${uid}" draggable="true" data-drag="pc">
      <img src="${monsterArt(sp.id)}" alt=""/>
      <div>${esc(sp.name)}</div>
      <div class="muted">Lv ${mon.lvl}${mon.shiny ? ' · Schimmer' : ''}</div>
    </button>`
  }).join('')
  const roster = save.team.map((uid, index) => {
    const mon = save.mons[uid]
    return `<button class="mon-card ${selected === uid ? 'on' : ''}" data-act="select" data-uid="${uid}" data-index="${index}" draggable="true" data-drag="team">
      <img src="${monsterArt(mon.species)}" alt=""/>
      <div>${index + 1}. ${esc(species(mon.species).name)}</div>
      <div class="muted">Lv ${mon.lvl}${save.buddy === uid ? ` · ${tr(save, 'team.buddy')}` : ''}${fightsHere(save, mon) ? '' : ` · ${tr(save, 'team.other')}`}</div>
    </button>`
  }).join('')
  return `<div class="card panel">
    <h2>${tr(save, 'team.title')}</h2>
    <p class="muted">${tr(save, 'team.note')}</p>
    <div class="grid" id="team-grid">${roster}</div>
    <div class="row-actions">
      <button data-act="nudge" data-dir="-1">Nach vorn</button>
      <button data-act="nudge" data-dir="1">Nach hinten</button>
      <button data-act="to-pc">In den PC</button>
      <button data-act="to-team">Ins Team</button>
      <button data-act="card" data-uid="${selected ?? ''}">Monsterkarte</button>
    </div>
    <h2>${tr(save, 'team.pc')}</h2>
    <div class="filters">
      <input data-field="q" placeholder="Name" value="${esc(pc.q)}"/>
      <select data-field="type"><option value="">Typ</option>${types.map((type) => `<option value="${type}" ${pc.type === type ? 'selected' : ''}>${esc(typeName(type as TypeId))}</option>`).join('')}</select>
      <select data-field="rarity"><option value="">Seltenheit</option>${rarityOptions(pc.rarity)}</select>
      <select data-field="shiny">
        <option value="" ${pc.shiny === '' ? 'selected' : ''}>Schimmer</option>
        <option value="1" ${pc.shiny === '1' ? 'selected' : ''}>Nur Schimmer</option>
        <option value="0" ${pc.shiny === '0' ? 'selected' : ''}>Ohne Schimmer</option>
      </select>
      <select data-field="sort">
        ${['newest:Neueste', 'dex:Kodex-Nr.', 'name:Name', 'level:Level', 'rarity:Seltenheit', 'stats:Werte'].map((entry) => {
          const [id, label] = entry.split(':')
          return `<option value="${id}" ${pc.sort === id ? 'selected' : ''}>${label}</option>`
        }).join('')}
      </select>
      <button data-act="dir">${pc.dir < 0 ? 'Abwärts' : 'Aufwärts'}</button>
    </div>
    <div class="grid">${cards || '<div class="muted">Der PC ist leer.</div>'}</div>
  </div>`
}

function rarityOptions(current: string): string {
  const rows = []
  for (let i = 0; i <= 9; i++) rows.push(`<option value="${i}" ${current === String(i) ? 'selected' : ''}>${esc(rarityInfo(i).name)}</option>`)
  return rows.join('')
}

function codex(save: SaveV2, filter: CodexQuery): string {
  const types = [...new Set(monsters.map((mon) => mon.type))]
  const bars = regions.map((entry) => entry.id).map((id) => {
    const row = regionProgress(save, id)
    const pct = row.total ? Math.round((row.caught / row.total) * 100) : 0
    const label = row.open ? `${esc(row.name)} ${row.caught}/${row.total}` : `${esc(row.name)} gesperrt`
    return `<div><div class="muted">${label}</div><div class="progress-track"><span style="width:${row.placeholder ? 0 : pct}%"></span></div></div>`
  }).join('')
  const rows = listCodex(save, filter)
  const cells = rows.map((mon) => {
    const status = dexStatus(save, mon.id)
    const hidden = status === 'missing'
    return `<button class="mon-card" data-act="dex" data-species="${mon.id}">
      <img class="${status === 'owned' || status === 'released' ? '' : 'sil'}" src="${monsterArt(mon.id)}" alt="" style="${hidden ? 'opacity:.25' : ''}"/>
      <div>${hidden ? `Nr. ${speciesNumber(mon.id)}` : esc(mon.name)}</div>
      <div class="muted">${dexStatusLabel(status)}</div>
    </button>`
  }).join('')
  return `<div class="card panel">
    <h2>${tr(save, 'nav.codex')} ${dexCaughtCount(save)}/100</h2>
    <div class="region-bars">${bars}</div>
    <div class="filters">
      <input data-field="dex-q" placeholder="Name oder Nr." value="${esc(filter.q)}"/>
      <select data-field="dex-type"><option value="">Typ</option>${types.map((type) => `<option value="${type}" ${filter.type === type ? 'selected' : ''}>${esc(typeName(type as TypeId))}</option>`).join('')}</select>
      <select data-field="dex-rarity"><option value="">Seltenheit</option>${rarityOptions(filter.rarity)}</select>
      <select data-field="dex-shiny">
        <option value="" ${filter.shiny === '' ? 'selected' : ''}>Schimmer</option>
        <option value="1" ${filter.shiny === '1' ? 'selected' : ''}>Mit Schimmer</option>
        <option value="0" ${filter.shiny === '0' ? 'selected' : ''}>Ohne Schimmer</option>
      </select>
    </div>
    <p class="muted">Schimmer im Abenteuer folgt später. Der Filter zeigt nur Exemplare, die schon schimmern.</p>
    <div class="grid">${cells || '<div class="muted">Keine Einträge für diesen Filter.</div>'}</div>
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
    return `<div class="shop-row">
      <div><b>${esc(item.name)}</b><div class="muted">+${exp.toLocaleString('de-DE')} EP · ${price.toLocaleString('de-DE')} G${item.wappen ? ` · ab ${item.wappen} Wappen` : ''}</div></div>
      <span>×${save.bag.crystals[item.id]}</span>
      <button data-act="buy-crystal" data-id="${item.id}" ${open ? '' : 'disabled'}>Kaufen</button>
      <button data-act="sell-crystal" data-id="${item.id}">Verkauf ${sellValue(price)} G</button>
      <button data-act="use-crystal" data-id="${item.id}">Geben</button>
    </div>`
  }).join('')
  const fruits = FRUITS.map((item) => `<div class="shop-row">
      <div><b>${esc(item.name)}</b><div class="muted">${esc(item.effect)} · ${fruitPrice(save, item.id).toLocaleString('de-DE')} G · 1 h</div></div>
      <span>×${save.bag.fruits[item.id]}</span>
      <button data-act="buy-fruit" data-id="${item.id}">Kaufen</button>
      <button data-act="sell-fruit" data-id="${item.id}">Verkauf ${sellValue(item.price)} G</button>
      <button data-act="use-fruit" data-id="${item.id}">Essen</button>
    </div>`).join('')
  return `<div class="card panel">
    <h2>${tr(save, 'shop.title')}</h2>
    <p class="muted">Wappen: ${crests}. Verkauf bringt 25 %. Eine gleiche Frucht setzt die Stunde zurück, sie verlängert sie nicht.</p>
    <label>Kristall an <select id="crystal-target">${mons}</select></label>
    <h2>${tr(save, 'shop.crystals')}</h2>
    ${crystals}
    <h2>${tr(save, 'shop.fruits')}</h2>
    ${fruits}
    <p class="muted">Stand ${new Date(now).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</p>
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

function activitiesView(save: SaveV2, now: number, selected: string | null, wheel: WheelPanel): string {
  const tabs = `<div class="row-actions">
    <button data-act="activity" data-id="hort" class="${wheel.tab === 'hort' ? 'primary' : ''}">Hort</button>
    <button data-act="activity" data-id="wheel" class="${wheel.tab === 'wheel' ? 'primary' : ''}">Glücksrad</button>
  </div>`
  return tabs + (wheel.tab === 'wheel' ? wheelView(save, wheel) : hortView(save, now, selected))
}

function wheelView(save: SaveV2, wheel: WheelPanel): string {
  if (!wheelOpen(save)) {
    return `<div class="card panel"><h2>${tr(save, 'act.wheel')}</h2><p>${tr(save, 'wheel.locked')}</p></div>`
  }
  const shown = wheel.symbols ?? (['funke', 'blatt', 'tropfen'] as [SymbolId, SymbolId, SymbolId])
  const reels = shown.map((id) => `<div class="reel">${glyph(id)}<span>${esc(faceById(id).name)}</span></div>`).join('')
  const bets = MULTIPLIERS.map((mult) => `<button data-act="wheel-mult" data-mult="${mult}" class="${wheel.mult === mult ? 'primary' : ''}">×${mult}</button>`).join('')
  const pay = FACES.map((face) => `<div class="shop-row"><div>3 ${esc(face.name)}</div><span>${face.triple.toLocaleString('de-DE')}</span></div>`).join('')
  const regions = [...new Set(PRIZES.map((prize) => prize.region))]
  const shop = regions.map((region) => {
    const rows = PRIZES.filter((prize) => prize.region === region).map((prize) => {
      const sp = species(prize.species)
      const open = save.regionsOpen.includes(prize.region)
      const owned = Object.values(save.mons).some((mon) => mon.species === prize.species)
      const label = !open ? 'Später' : owned ? 'Besessen' : `${prize.marks.toLocaleString('de-DE')} Marken`
      return `<div class="shop-row">
        <img src="${monsterArt(sp.id, true)}" alt=""/>
        <div><b>${esc(sp.name)}</b><div class="muted">${esc(prize.regionName)} · Lv 5</div></div>
        <button data-act="buy-prize" data-id="${prize.species}" ${open && !owned ? '' : 'disabled'}>${label}</button>
      </div>`
    }).join('')
    const name = PRIZES.find((prize) => prize.region === region)?.regionName ?? ''
    return `<h2>${esc(name)}</h2>${rows}`
  }).join('')
  return `<div class="card panel">
    <h2>${tr(save, 'act.wheel')}</h2>
    <p class="muted">Ein Dreh kostet ${(spinCost(save.region) * wheel.mult).toLocaleString('de-DE')} G. Die Marken gelten im Preisladen. Nur Spielgold, kein Echtgeld. Marken: ${save.marks.toLocaleString('de-DE')}</p>
    <div class="reels">${reels}</div>
    <div class="row-actions">${bets}<button class="primary" data-act="spin">Drehen</button></div>
    ${wheel.note ? `<p>${esc(wheel.note)}</p>` : ''}
    <h2>${tr(save, 'wheel.marks')}</h2>
    ${pay}
    <p class="muted">Zwei gleiche Formen: 2. Drei verschiedene mit einem Stern: 1. Sonst 0. Der Einsatz ×5 oder ×10 vervielfacht Kosten und Marken.</p>
    <h2>${tr(save, 'wheel.shop')}</h2>
    ${shop}
  </div>`
}

function hortView(save: SaveV2, now: number, selected: string | null): string {
  const offer = hortOffer(save)
  const residents = save.hort.map((uid) => {
    const mon = save.mons[uid]
    const sp = species(mon.species)
    return `<button class="mon-card ${selected === uid ? 'on' : ''}" data-act="select" data-uid="${uid}">
      <img src="${monsterArt(sp.id)}" alt=""/>
      <div>${esc(sp.name)}${mon.shiny ? ' · Schimmer' : ''}</div>
      <div class="muted">Lv ${mon.lvl} · ${esc(typeName(sp.type))}</div>
    </button>`
  }).join('')
  const eggs = save.eggs.map((egg) => {
    const left = Math.max(0, egg.readyAt - now)
    const hours = Math.floor(left / 3600000)
    const mins = Math.ceil((left % 3600000) / 60000)
    return `<div class="fruit-row"><b>${esc(species(egg.species).name)}</b><span>${left <= 0 ? 'schlüpft' : `${hours} h ${mins} min`}</span></div>`
  }).join('')
  const buy = offer
    ? `<button class="primary" data-act="buy-hort" ${offer.locked ? 'disabled' : ''}>${tr(save, 'hort.buy', { slot: offer.slot, price: offer.price.toLocaleString(L(save) === 'en' ? 'en' : 'de-DE') })}${offer.locked ? ` · ${esc(tr(save, offer.locked))}` : ''}</button>`
    : '<p class="muted">Alle vier Plätze sind offen.</p>'
  return `<div class="card panel">
    <h2>${tr(save, 'hort.title')}</h2>
    <p class="muted">Platz 1 ist frei. Weitere Plätze kosten ${HORT_PRICES[1].toLocaleString('de-DE')} G, ${HORT_PRICES[2].toLocaleString('de-DE')} G nach dem Hohen Rat 1 und ${HORT_PRICES[3].toLocaleString('de-DE')} G nach dem Hohen Rat 2. Monster im Hort sammeln Art-EP. Zwei vom selben Typ können alle 2 Stunden ein Ei legen.</p>
    <p>Offene Plätze: ${save.hortSlots} · Eier ${save.eggs.length}/${save.hortSlots}</p>
    ${buy}
    <div class="row-actions">
      <button data-act="to-hort">In den Hort</button>
      <button data-act="from-hort">In den PC</button>
    </div>
    <div class="grid">${residents || '<div class="muted">Der Hort ist leer.</div>'}</div>
    <h2>${tr(save, 'hort.eggs')}</h2>
    ${eggs || '<p class="muted">Kein Ei.</p>'}
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
    return `<div class="achieve ${have ? 'done' : ''}">
      <div><b>${esc(name)}</b><div class="muted">${have ? tr(save, 'ach.have', { title, frame: goal.frame }) : tr(save, 'ach.open')} · ${goal.gold.toLocaleString(L(save) === 'en' ? 'en' : 'de-DE')} G</div></div>
      ${have ? `<button data-act="equip-title" data-id="${goal.id}">${tr(save, 'ach.titleBtn')}</button><button data-act="equip-frame" data-id="${goal.id}">${tr(save, 'ach.frameBtn')}</button>` : ''}
    </div>`
  }).join('')
  return `<div class="card panel">
    <h2>${tr(save, 'ach.title', { done, total: GOALS.length })}</h2>
    <p class="muted">${tr(save, 'ach.note')}</p>
    ${rows}
  </div>`
}

function options(save: SaveV2, debug: boolean): string {
  const power = (minutes: 0 | 2 | 5, key: string) => `<button data-act="power" data-min="${minutes}" class="${save.settings.powerSave === minutes ? 'primary' : ''}">${tr(save, key)}</button>`
  return `<div class="card panel">
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
    <p><button class="primary" data-act="import-ask">${tr(save, 'opt.importBtn')}</button></p>
    ${debug ? `<div class="card" style="padding:12px;margin-top:12px"><b>${tr(save, 'opt.debug')}</b><p class="muted">${tr(save, 'opt.debugNote')}</p><input id="debug-hours" type="number" min="0" step="0.1" value="10"/> <button class="primary" data-act="jump">${tr(save, 'opt.jump')}</button></div>` : ''}
    <p><button class="ghost" data-act="reset">${tr(save, 'opt.reset')}</button></p>
  </div>`
}

function guide(save: SaveV2): string {
  return `<div class="card panel"><h2>${tr(save, 'guide.title')}</h2>
    ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => `<p>${tr(save, `guide.${n}`)}</p>`).join('')}
  </div>`
}

function center(save: SaveV2, screen: Screen, now: number, pc: PcQuery, dex: CodexQuery, selected: string | null, debug: boolean, step: number, wheel: WheelPanel): string {
  if (screen === 'adventure') return `${path(save, step)}${battle(save, now)}${logBox(save)}`
  if (screen === 'progress') return progress(save)
  if (screen === 'team') return team(save, pc, selected)
  if (screen === 'codex') return codex(save, dex)
  if (screen === 'activities') return activitiesView(save, now, selected, wheel)
  if (screen === 'shop') return shop(save, now)
  if (screen === 'achievements') return achievementsView(save)
  if (screen === 'options') return options(save, debug)
  return guide(save)
}

export function gameHtml(save: SaveV2, screen: Screen, now: number, pc: PcQuery, dex: CodexQuery, selected: string | null, sideOpen: boolean, debug: boolean, overlay: Overlay | null, step = save.step, wheel: WheelPanel = { tab: 'hort', mult: 1, symbols: null, note: '' }): string {
  return `<div id="stage" class="${sideOpen ? '' : 'side-shut'} ${save.settings.reduceMotion ? 'reduce-motion' : ''}">
    ${nav(save, screen, step)}
    <main class="center">${center(save, screen, now, pc, dex, selected, debug, step, wheel)}</main>
    ${sightings(save, now, sideOpen)}
    ${overlay ? `<div class="overlay">${overlayHtml(save, overlay)}</div>` : ''}
  </div>`
}

function overlayHtml(save: SaveV2, overlay: Overlay): string {
  if (overlay.kind === 'offline') {
    const pct = overlay.total ? Math.round((overlay.done / overlay.total) * 100) : 0
    return `<div class="modal"><h2>${tr(save, 'offline.title')}</h2><div class="progress-track"><span style="width:${pct}%"></span></div><p>${overlay.done.toLocaleString(L(save) === 'en' ? 'en' : 'de-DE')} / ${overlay.total.toLocaleString(L(save) === 'en' ? 'en' : 'de-DE')}</p></div>`
  }
  if (overlay.kind === 'confirm-reset') {
    return `<div class="modal"><h2>${tr(save, 'reset.title')}</h2><p>${tr(save, 'reset.body')}</p><button class="primary" data-act="reset-yes">${tr(save, 'reset.yes')}</button> <button class="ghost" data-act="close">${tr(save, 'reset.no')}</button></div>`
  }
  if (overlay.kind === 'confirm-import') {
    return `<div class="modal"><h2>${tr(save, 'import.title')}</h2><p>${tr(save, 'import.body')}</p><button class="primary" data-act="import-yes">${tr(save, 'import.yes')}</button> <button class="ghost" data-act="close">${tr(save, 'reset.no')}</button></div>`
  }
  if (overlay.kind === 'awaken') {
    const mon = save.mons[overlay.uid]
    const sp = mon ? species(mon.species) : null
    return `<div class="modal"><div class="kicker">${tr(save, 'awaken.title')}</div><h2>${sp ? esc(sp.name) : ''}</h2>
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
    return `<div class="modal"><h2>${tr(save, 'welcome.title')}</h2>
      <p>${tr(save, 'welcome.time', { away, cap: capped ? tr(save, 'welcome.cap') : '' })}</p>
      <p>${tr(save, 'welcome.stats', { fights: overlay.summary.fights.toLocaleString(locale), dupes: overlay.summary.dupes.toLocaleString(locale), gold: gold(overlay.summary.gold) })}</p>
      <div class="catches">${sprites || `<span class="muted">${tr(save, 'welcome.none')}</span>`}</div>
      ${levels || `<p class="muted">${tr(save, 'welcome.levels')}</p>`}
      <p>${tr(save, 'welcome.badges', { names: overlay.summary.badges.length ? overlay.summary.badges.join(', ') : '—' })}</p>
      <button class="primary" data-act="close">${tr(save, 'welcome.next')}</button>
    </div>`
  }
  if (overlay.kind === 'dex') return dexEntry(save, overlay.species)
  if (overlay.kind === 'catch') {
    const sp = species(overlay.species)
    return `<div class="modal"><div class="kicker">${tr(save, 'catch.got')}</div><h2>${esc(sp.name)}</h2>
      <img class="hero" src="${monsterArt(sp.id, true)}" alt=""/>
      <p>${esc(typeLabel(L(save), sp.type, typeName(sp.type)))} · ${esc(rarityLabel(L(save), sp.baseRarity, rarityName(sp.id)))} · Lv ${overlay.level}</p>
      <p>${esc(sp.blurb)}</p>
      <p>${tr(save, overlay.place === 'team' ? 'catch.team' : 'catch.pc')}</p>
      <button class="primary" data-act="close">${tr(save, 'welcome.next')}</button>
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
    : '<div class="muted">Noch kein Fundort in Grünmark.</div>'
  return `<div class="modal">
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
    <p><button class="primary" data-act="close">Schließen</button></p>
  </div>`
}

function card(save: SaveV2, uid: string): string {
  const mon = save.mons[uid]
  if (!mon) return `<div class="modal"><p>${tr(save, 'card.none')}</p><button data-act="close">${tr(save, 'codex.close')}</button></div>`
  const sp = species(mon.species)
  const stats = monStats(mon)
  const need = expToNext(mon.lvl)
  const pct = Math.max(0, Math.min(100, (mon.exp / need) * 100))
  const when = new Date(mon.caughtAt).toLocaleString('de-DE')
  return `<div class="modal">
    <img class="hero" src="${monsterArt(sp.id, true)}" alt=""/>
    <h2>${esc(sp.name)}${mon.shiny ? ' · Schimmer' : ''}</h2>
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
    <p><button class="primary" data-act="close">${tr(save, 'codex.close')}</button></p>
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
