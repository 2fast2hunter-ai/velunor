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
import { chapterById, placeLabel, regionById, routeOf, type NodeKind } from './route'
import { dexCaughtCount, hereSightings, rarityName } from './sim'
import { expToNext, isAlive, monStats, realHp } from './stats'
import type { OfflineSummary } from './sim'
import type { SaveV2 } from './types'

export type Screen = 'adventure' | 'progress' | 'team' | 'codex' | 'activities' | 'shop' | 'achievements' | 'options' | 'guide'

export interface PcQuery {
  q: string
  type: string
  rarity: string
  shiny: string
  sort: string
  dir: number
}

export type Overlay =
  | { kind: 'catch'; species: string; level: number; place: string }
  | { kind: 'welcome'; summary: OfflineSummary; countedMs: number; rawMs: number }
  | { kind: 'card'; uid: string }
  | { kind: 'confirm-reset' }
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
    ['adventure', 'Abenteuer'],
    ['progress', 'Fortschritt'],
    ['team', 'Team/PC'],
    ['codex', 'Kodex'],
    ['activities', 'Aktivitäten'],
    ['shop', 'Laden'],
    ['achievements', 'Erfolge']
  ]
  return `<aside class="nav">
    <div class="card player">
      <div class="avatar ${save.avatar === 'B' ? 'b' : ''}">${save.avatar}</div>
      <div>
        <div class="who">${esc(save.name)}</div>
        <div class="muted">Kodex ${caught}/100</div>
        <div class="gold" id="gold">${gold(save.gold)}</div>
      </div>
    </div>
    <div class="card chapter">
      <div class="kicker">${esc(region.name)}</div>
      <h2>${esc(chapter.name)}</h2>
      <div>Wappen: ${save.badges.includes(chapter.guardian.badge) ? esc(chapter.guardian.badge) : '—'}</div>
      <div>Schritt ${step}/20</div>
      <div class="muted">Lv ${chapter.levelMin}–${chapter.levelMax} · Cap ${chapter.cap}</div>
      <label class="switch"><input type="checkbox" data-field="loop" ${save.loop ? 'checked' : ''}/> Kapitel wiederholen</label>
    </div>
    <div class="card menu">
      ${items.map(([id, label]) => `<button data-act="screen" data-screen="${id}" class="${screen === id ? 'active' : ''}">${label}</button>`).join('')}
    </div>
    <div class="nav-foot">
      <button class="text-btn" data-act="screen" data-screen="options">Optionen</button>
      <button class="text-btn" data-act="screen" data-screen="guide">Anleitung</button>
    </div>
  </aside>`
}

function path(save: SaveV2, here: number): string {
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
  const part = clock.getHours() >= 8 && clock.getHours() <= 19 ? 'Tag' : 'Nacht'
  return `<div class="battle" id="battle">
    <picture>
      <source srcset="${art(scene.webp)}" type="image/webp"/>
      <img class="plate" src="${art(scene.jpg)}" alt=""/>
    </picture>
    <div class="team-rail">${minis}</div>
    <div class="combatant ally" style="left:${ALLY_X}%;top:${FEET_Y}%">
      <b id="ally-name">${mon ? esc(species(mon.species).name) : ''}</b>
      <div class="hp"><span id="ally-hp" style="width:${(hp.hp / hp.max) * 100}%"></span></div>
      ${mon ? `<img class="sprite" id="ally-sprite" src="${monsterArt(mon.species, true)}" alt=""/>` : ''}
    </div>
    <div class="combatant foe" style="left:${FOE_X}%;top:${FEET_Y}%">
      <b id="foe-name"></b>
      <div class="hp"><span id="foe-hp" style="width:100%"></span></div>
      <img class="sprite" id="foe-sprite" alt="" hidden/>
    </div>
    <img class="seal" id="seal" alt="" src="${art(SEAL_ADD)}" data-fb="${art(SEAL_FALLBACK)}"/>
    <div class="battle-text">
      <p id="battle-text">${part} auf dem ${esc(chapter.name)}. ${save.hold ? 'Das Kapitel wartet.' : 'Der Weg läuft.'}</p>
      <div class="speed">
        ${([1, 2, 3] as const).map((speed) => `<button data-act="speed" data-speed="${speed}" class="${save.settings.speed === speed ? 'on' : ''}">×${speed}</button>`).join('')}
      </div>
      ${save.badges.includes(chapter.guardian.badge) ? '' : '<button class="primary" data-act="challenge">Wächter herausfordern</button>'}
    </div>
  </div>`
}

function logBox(save: SaveV2): string {
  const lines = [...save.log].reverse().map((line) => `<div>${esc(line.text)}</div>`).join('')
  return `<div class="card log" id="log">${lines || '<div class="muted">Noch keine Ereignisse.</div>'}</div>`
}

function sightings(save: SaveV2, now: number, open: boolean): string {
  const rows = hereSightings(save, now)
  const hour = new Date(now).getHours()
  const night = hour < 8 || hour > 19
  const body = rows.map((row) => `<div class="sight-row">
      <img class="${row.caught ? '' : 'sil'}" src="${monsterArt(row.species)}" alt=""/>
      <div><b>${row.caught ? esc(row.name) : '???'}</b><div class="muted">${esc(row.type)}</div></div>
      <span class="pct">${Math.round(row.pct)} %</span>
    </div>`).join('')
  return `<aside class="side">
    <div class="card side-card">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <h2>Hier gesichtet</h2>
        <button class="ghost" data-act="side">${open ? 'Zu' : 'Auf'}</button>
      </div>
      ${open ? `<div class="clock">${night ? 'Nacht' : 'Tag'}</div><div class="sight">${body}</div>` : ''}
    </div>
  </aside>`
}

function progress(save: SaveV2): string {
  const region = regionById(1)
  const buttons = region.chapters.map((chapter) => {
    const open = chapter.id === 1 || save.badges.includes(region.chapters[chapter.id - 2].guardian.badge)
    const here = save.chapter === chapter.id
    return `<button class="text-btn" data-act="travel" data-chapter="${chapter.id}" ${open ? '' : 'disabled'}>
      <b>${esc(chapter.name)}</b> ${here ? '· hier' : ''}
      <div class="muted">Lv ${chapter.levelMin}–${chapter.levelMax}, Cap ${chapter.cap}, ${save.badges.includes(chapter.guardian.badge) ? esc(chapter.guardian.badge) : 'Wappen fehlt'}</div>
    </button>`
  }).join('')
  return `<div class="card panel"><h2>Fortschritt · ${esc(region.name)}</h2><div class="chapters">${buttons}</div><p class="muted">Kapitel 4 folgt später. Der Hohe Rat ebenfalls.</p></div>`
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
      <div class="muted">Lv ${mon.lvl}${save.buddy === uid ? ' · Begleiter' : ''}</div>
    </button>`
  }).join('')
  return `<div class="card panel">
    <h2>Team</h2>
    <p class="muted">Vorne kämpft zuerst. Ziehen tauscht die Reihenfolge, ein langer Druck startet das Ziehen. Mindestens ein Monster bleibt im Team.</p>
    <div class="grid" id="team-grid">${roster}</div>
    <div class="row-actions">
      <button data-act="nudge" data-dir="-1">Nach vorn</button>
      <button data-act="nudge" data-dir="1">Nach hinten</button>
      <button data-act="to-pc">In den PC</button>
      <button data-act="to-team">Ins Team</button>
      <button data-act="card" data-uid="${selected ?? ''}">Monsterkarte</button>
    </div>
    <h2>PC</h2>
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

function codex(save: SaveV2): string {
  const cells = monsters.map((mon) => {
    const caught = (save.dex[mon.id]?.caught ?? 0) > 0
    const seen = (save.dex[mon.id]?.seen ?? 0) > 0
    return `<div class="mon-card">
      <img class="${caught ? '' : 'sil'}" src="${monsterArt(mon.id)}" alt="" style="${seen || caught ? '' : 'opacity:.25'}"/>
      <div>${caught ? esc(mon.name) : mon.id.toUpperCase()}</div>
      <div class="muted">${caught ? esc(typeName(mon.type)) : seen ? 'gesichtet' : 'fehlt'}</div>
    </div>`
  }).join('')
  return `<div class="card panel"><h2>Velunor-Kodex ${dexCaughtCount(save)}/100</h2><p class="muted">Die ausführliche Kodex-Ansicht mit Fundorten folgt später. Hier zählt, was du schon besitzt.</p><div class="grid">${cells}</div></div>`
}

function placeholder(title: string, text: string): string {
  return `<div class="card panel"><h2>${esc(title)}</h2><p>${esc(text)}</p></div>`
}

function options(save: SaveV2, debug: boolean): string {
  return `<div class="card panel">
    <h2>Optionen</h2>
    <label class="switch"><input type="checkbox" data-field="auto" ${save.settings.autoSwitch ? 'checked' : ''}/> Auto-Wechsel</label>
    <label class="switch"><input type="checkbox" data-field="card" ${save.settings.catchCard ? 'checked' : ''}/> Karte bei neuem Fang</label>
    <label class="switch"><input type="checkbox" data-field="loop" ${save.loop ? 'checked' : ''}/> Kapitel wiederholen</label>
    <div class="row-actions">
      <span>Tempo</span>
      ${([1, 2, 3] as const).map((speed) => `<button data-act="speed" data-speed="${speed}" class="${save.settings.speed === speed ? 'primary' : ''}">×${speed}</button>`).join('')}
    </div>
    ${debug ? `<div class="card" style="padding:12px;margin-top:12px"><b>Abnahme</b><p class="muted">Nur im Dev-Build mit ?debug=1. +10 Stunden rechnen 8 Stunden.</p><input id="debug-hours" type="number" min="0" step="0.1" value="10"/> <button class="primary" data-act="jump">Stunden springen</button></div>` : ''}
    <p><button class="ghost" data-act="reset">Spielstand zurücksetzen</button></p>
  </div>`
}

function guide(): string {
  return `<div class="card panel"><h2>Anleitung</h2>
    <p>Du wanderst einen Weg mit 20 Schritten. Kämpfe laufen von selbst, Tempo ×1, ×2 oder ×3.</p>
    <p>Nach dem K.O. eines wilden Monsters versucht das Bannsiegel den Fang. Eine neue Art kommt ins Team oder in den PC. Ein Duplikat wird zu Art-EP, außer du behältst es.</p>
    <p>Heilquellen heilen das Team. Fällt das ganze Team, kehrt ihr zur letzten Heilquelle zurück, ohne etwas zu verlieren.</p>
    <p>Der Wächter am Schritt 20 bringt ein Wappen und öffnet das nächste Kapitel. Mit „Kapitel wiederholen“ farmst du weiter.</p>
    <p>Bis zu 8 Stunden Abwesenheit werden nachgerechnet. Der Begleiter bekommt mehr Kampf-EP.</p>
  </div>`
}

function center(save: SaveV2, screen: Screen, now: number, pc: PcQuery, selected: string | null, debug: boolean, step: number): string {
  if (screen === 'adventure') return `${path(save, step)}${battle(save, now)}${logBox(save)}`
  if (screen === 'progress') return progress(save)
  if (screen === 'team') return team(save, pc, selected)
  if (screen === 'codex') return codex(save)
  if (screen === 'activities') return placeholder('Aktivitäten', 'Hort und Glücksrad folgen in einem späteren Schritt.')
  if (screen === 'shop') return placeholder('Laden', 'EP-Kristalle und Früchte folgen in einem späteren Schritt.')
  if (screen === 'achievements') return placeholder('Erfolge', 'Die Erfolgsliste folgt in einem späteren Schritt.')
  if (screen === 'options') return options(save, debug)
  return guide()
}

export function gameHtml(save: SaveV2, screen: Screen, now: number, pc: PcQuery, selected: string | null, sideOpen: boolean, debug: boolean, overlay: Overlay | null, step = save.step): string {
  return `<div id="stage" class="${sideOpen ? '' : 'side-shut'}">
    ${nav(save, screen, step)}
    <main class="center">${center(save, screen, now, pc, selected, debug, step)}</main>
    ${sightings(save, now, sideOpen)}
    ${overlay ? `<div class="overlay">${overlayHtml(save, overlay)}</div>` : ''}
  </div>`
}

function overlayHtml(save: SaveV2, overlay: Overlay): string {
  if (overlay.kind === 'offline') {
    const pct = overlay.total ? Math.round((overlay.done / overlay.total) * 100) : 0
    return `<div class="modal"><h2>Nachrechnen …</h2><div class="progress-track"><span style="width:${pct}%"></span></div><p>${overlay.done.toLocaleString('de-DE')} / ${overlay.total.toLocaleString('de-DE')}</p></div>`
  }
  if (overlay.kind === 'confirm-reset') {
    return `<div class="modal"><h2>Spielstand zurücksetzen?</h2><p>Der Fang-Speicher wird geleert. Der alte Speicher bleibt liegen.</p><button class="primary" data-act="reset-yes">Ja, neu anfangen</button> <button class="ghost" data-act="close">Abbrechen</button></div>`
  }
  if (overlay.kind === 'welcome') {
    const hours = overlay.countedMs / 3600000
    const away = hours >= 1 ? `${hours.toLocaleString('de-DE', { maximumFractionDigits: 1 })} Stunden` : `${Math.round(overlay.countedMs / 60000)} Minuten`
    const capped = overlay.rawMs > overlay.countedMs + 1000
    const sprites = overlay.summary.catches.map((id) => `<img src="${monsterArt(id, true)}" alt="${esc(species(id).name)}" title="${esc(species(id).name)}"/>`).join('')
    const levels = overlay.summary.levels.map((row) => `<div>${esc(row.name)} ${row.from} → ${row.to}</div>`).join('')
    return `<div class="modal"><h2>Willkommen zurück</h2>
      <p>Zeit: ${away}${capped ? ' (Obergrenze 8 Stunden)' : ''}.</p>
      <p>Kämpfe: ${overlay.summary.fights.toLocaleString('de-DE')} · Duplikate: ${overlay.summary.dupes.toLocaleString('de-DE')} · Gold: ${gold(overlay.summary.gold)}</p>
      <div class="catches">${sprites || '<span class="muted">Keine neue Art.</span>'}</div>
      ${levels || '<p class="muted">Keine Level-Aufstiege.</p>'}
      <p>Wappen: ${overlay.summary.badges.length ? esc(overlay.summary.badges.join(', ')) : '—'}</p>
      <button class="primary" data-act="close">Weiter</button>
    </div>`
  }
  if (overlay.kind === 'catch') {
    const sp = species(overlay.species)
    return `<div class="modal"><div class="kicker">gefangen!</div><h2>${esc(sp.name)}</h2>
      <img class="hero" src="${monsterArt(sp.id, true)}" alt=""/>
      <p>${esc(typeName(sp.type))} · ${esc(rarityName(sp.id))} · Lv ${overlay.level}</p>
      <p>${esc(sp.blurb)}</p>
      <p>${overlay.place === 'team' ? 'Im Team.' : 'Im PC.'}</p>
      <button class="primary" data-act="close">Weiter</button>
    </div>`
  }
  return card(save, overlay.uid)
}

function card(save: SaveV2, uid: string): string {
  const mon = save.mons[uid]
  if (!mon) return `<div class="modal"><p>Kein Monster.</p><button data-act="close">Schließen</button></div>`
  const sp = species(mon.species)
  const stats = monStats(mon)
  const need = expToNext(mon.lvl)
  const pct = Math.max(0, Math.min(100, (mon.exp / need) * 100))
  const when = new Date(mon.caughtAt).toLocaleString('de-DE')
  return `<div class="modal">
    <img class="hero" src="${monsterArt(sp.id, true)}" alt=""/>
    <h2>${esc(sp.name)}${mon.shiny ? ' · Schimmer' : ''}</h2>
    <p>${esc(typeName(sp.type))} · ${esc(rarityInfo(sp.baseRarity).name)} · Lv ${mon.lvl}</p>
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
    <p class="muted">Gefangen ${esc(when)} · ${esc(placeLabel(mon.caughtWhere))}</p>
    <label class="switch"><input type="checkbox" data-field="buddy" data-uid="${uid}" ${save.buddy === uid ? 'checked' : ''}/> Begleiter</label>
    <label class="switch"><input type="checkbox" data-field="keep" data-uid="${uid}" ${mon.keepDupes ? 'checked' : ''}/> Duplikate behalten</label>
    <p><button class="primary" data-act="close">Schließen</button></p>
  </div>`
}

export function onboardingHtml(name: string, avatar: 'A' | 'B', picked: string): string {
  const chosen = picked ? species(picked) : null
  const stats = picked ? monStats(makePreview(picked)) : null
  return `<div id="stage" class="onboard">
    <div>
      <div class="kicker">Velunor</div>
      <h1>Grünmark</h1>
      <p>Ein Fang-Idle-Abenteuer. Drei Starter, ein Weg, ein Bannsiegel.</p>
    </div>
    <div class="card panel">
      <label>Name<br/><input class="start-name" data-field="name" maxlength="24" value="${esc(name)}"/></label>
      <p>Avatar</p>
      <div class="choices">
        <button class="choice ${avatar === 'A' ? 'on' : ''}" data-act="avatar" data-avatar="A"><div class="avatar">A</div>A</button>
        <button class="choice ${avatar === 'B' ? 'on' : ''}" data-act="avatar" data-avatar="B"><div class="avatar b">B</div>B</button>
      </div>
      <p>Starter</p>
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
        <button class="primary" data-act="start">Los geht's!</button>
      </div>` : '<p class="muted">Wähle einen Starter.</p>'}
    </div>
  </div>`
}

function makePreview(id: string) {
  return { species: id, lvl: 5, exp: 0, hp: null, shiny: false, caughtAt: 0, caughtWhere: 'r1c1', keepDupes: false }
}
