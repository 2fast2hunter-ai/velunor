import './adventure.css'
import {
  AUTOSAVE_MS,
  BASE_ENCOUNTER_MS,
  CAUGHT_SCALE,
  OFFLINE_BLOCK,
  OFFLINE_CAP_MS,
  SAVE_KEY_V2,
  SEAL_BLEND,
  SEAL_FLAT_Y,
  SEAL_SCALE_IN_MS,
  SEAL_SPIN_MS,
  WELCOME_AFTER_MS,
  debugAllowed,
  encounterMs,
  tempoScale,
  type Speed
} from './const'
import { beginAdventure, loadAdventure, writeSave } from './save'
import {
  challengeGuardian,
  emptySummary,
  moveToPc,
  moveToTeam,
  reorderTeam,
  resolveEncounter,
  sendOut,
  setBuddy,
  setKeepDupes,
  setLoop,
  travelTo,
  type EncounterOutcome,
  type OfflineSummary
} from './sim'
import type { SaveV2 } from './types'
import {
  gameHtml,
  monsterArt,
  onboardingHtml,
  type CodexQuery,
  type Overlay,
  type PcQuery,
  type Screen
} from './view'

const RESET_FLAG = 'velunor_v2_reset'

let save: SaveV2 | null = null
let screen: Screen = 'adventure'
let pc: PcQuery = { q: '', type: '', rarity: '', shiny: '', sort: 'newest', dir: -1 }
let dex: CodexQuery = { q: '', type: '', rarity: '', shiny: '' }
let selected: string | null = null
let sideOpen = true
let overlay: Overlay | null = null
let draftName = 'Abenteurer'
let draftAvatar: 'A' | 'B' = 'A'
let draftPick = ''
let timer = 0
let animating = false
let lastTick = 0
let dragUid = ''
let dragKind = ''
let pressTimer = 0
let pressedUid = ''

const debug = debugAllowed(import.meta.env.DEV, window.location.search)

export function bootAdventure(): void {
  const root = document.getElementById('game')
  if (!root) return
  root.innerHTML = '<div id="fit"></div>'
  root.addEventListener('click', onClick)
  root.addEventListener('change', onChange)
  root.addEventListener('input', onInput)
  root.addEventListener('dragstart', onDragStart)
  root.addEventListener('dragover', onDragOver)
  root.addEventListener('drop', onDrop)
  root.addEventListener('pointerdown', onPointerDown)
  root.addEventListener('pointerup', onPointerUp)
  window.addEventListener('resize', fit)
  window.addEventListener('pagehide', () => {
    if (!save) return
    if (Date.now() - lastTick < encounterMs(save.settings.speed) * 2) save.lastSeenAt = Date.now()
    writeSave(localStorage, save)
  })
  document.addEventListener('visibilitychange', () => {
    if (!save?.started || document.hidden || overlay) return
    const raw = Date.now() - save.lastSeenAt
    if (raw >= WELCOME_AFTER_MS) void runOffline(raw)
  })
  window.setInterval(() => {
    if (!save?.started || overlay?.kind === 'offline') return
    save.lastSeenAt = Date.now()
    try { writeSave(localStorage, save) } catch { /* keep playing */ }
  }, AUTOSAVE_MS)

  const skipLegacy = localStorage.getItem(RESET_FLAG) === '1' && !localStorage.getItem(SAVE_KEY_V2)
  const loaded = skipLegacy ? null : loadAdventure(localStorage, Date.now())
  if (!loaded?.started) showOnboarding()
  else void start(loaded)
}

function showOnboarding(): void {
  save = null
  paint(onboardingHtml(draftName, draftAvatar, draftPick))
}

async function start(next: SaveV2): Promise<void> {
  save = next
  localStorage.removeItem(RESET_FLAG)
  try { writeSave(localStorage, save) } catch { /* ignore */ }
  screen = 'adventure'
  render()
  const raw = Date.now() - save.lastSeenAt
  if (raw >= WELCOME_AFTER_MS) await runOffline(raw)
  else {
    lastTick = Date.now() - encounterMs(save.settings.speed)
    kick()
  }
}

function render(step = save?.step): void {
  if (!save) return
  paint(gameHtml(save, screen, Date.now(), pc, dex, selected, sideOpen, debug, overlay, step ?? save.step))
  const seal = document.getElementById('seal') as HTMLImageElement | null
  if (seal) {
    seal.style.mixBlendMode = SEAL_BLEND
    seal.addEventListener('error', () => {
      const fb = seal.dataset.fb
      if (fb && seal.src !== fb) seal.src = fb
    })
  }
}

function paint(html: string): void {
  const host = document.getElementById('fit')
  if (!host) return
  host.innerHTML = html
  fit()
}

function fit(): void {
  const host = document.getElementById('fit')
  if (!host) return
  const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080)
  host.style.transform = `translate(-50%, -50%) scale(${scale})`
}

function kick(): void {
  window.clearTimeout(timer)
  if (!save?.started || animating || overlay || save.hold) return
  timer = window.setTimeout(loop, 30)
}

function loop(): void {
  if (!save?.started || animating || overlay || (save.hold && !save.challengeNow)) return
  const dur = encounterMs(save.settings.speed)
  const now = Date.now()
  if (document.hidden) {
    let steps = 0
    while (now - lastTick >= dur && steps < 200 && !save.hold) {
      resolveEncounter(save, Date.now(), { offline: false, trace: false })
      lastTick += dur
      steps += 1
    }
    save.lastSeenAt = lastTick
    try { writeSave(localStorage, save) } catch { /* ignore */ }
    timer = window.setTimeout(loop, dur)
    return
  }
  if (now - lastTick < dur) {
    timer = window.setTimeout(loop, dur - (now - lastTick))
    return
  }
  lastTick = now
  const outcome = resolveEncounter(save, now, { offline: false, trace: true })
  save.lastSeenAt = now
  try { writeSave(localStorage, save) } catch { /* ignore */ }
  animating = true
  if (screen !== 'adventure') {
    animating = false
    const gold = document.getElementById('gold')
    if (gold) gold.textContent = `${Math.floor(save.gold).toLocaleString('de-DE')} G`
    timer = window.setTimeout(loop, 0)
    return
  }
  render(outcome.step)
  play(outcome, save.settings.speed, () => finishPresent(outcome))
}

function finishPresent(outcome: EncounterOutcome): void {
  animating = false
  if (!save) return
  const fresh = outcome.catch
  if (fresh?.success && (fresh.place === 'team' || fresh.place === 'pc') && save.settings.catchCard) {
    overlay = { kind: 'catch', species: fresh.species, level: fresh.level, place: fresh.place }
    render()
    return
  }
  if (save.hold) render()
  else kick()
}

function play(outcome: EncounterOutcome, speed: Speed, done: () => void): void {
  const dur = encounterMs(speed)
  const k = tempoScale(speed)
  const started = performance.now()
  const seal = document.getElementById('seal') as HTMLImageElement | null
  const allyHp = document.getElementById('ally-hp')
  const foeHp = document.getElementById('foe-hp')
  const allyImg = document.getElementById('ally-sprite') as HTMLImageElement | null
  const foeImg = document.getElementById('foe-sprite') as HTMLImageElement | null
  const allyName = document.getElementById('ally-name')
  const foeName = document.getElementById('foe-name')
  const text = document.getElementById('battle-text')
  const traces = outcome.traces
  const catching = Boolean(outcome.catch)
  const frame = (now: number) => {
    const elapsed = now - started
    const battleEnd = catching ? dur * 0.54 : dur
    const bt = Math.min(1, elapsed / battleEnd)
    if (traces.length) {
      const slice = 1 / traces.length
      const index = Math.min(traces.length - 1, Math.floor(bt / slice))
      const local = Math.min(1, (bt - index * slice) / slice)
      const trace = traces[index]
      const at = Math.min(trace.frames.length - 1, Math.floor(local * Math.max(1, trace.frames.length)))
      const shot = trace.frames[Math.max(0, at)]
      if (shot && allyHp && foeHp) {
        allyHp.style.width = `${(shot.allyHp / trace.allyMax) * 100}%`
        foeHp.style.width = `${(shot.foeHp / trace.foeMax) * 100}%`
      }
      if (text && shot && elapsed < battleEnd) text.textContent = shot.text
      if (allyName) allyName.textContent = trace.allyName
      if (foeName) foeName.textContent = trace.foeName
      if (allyImg) allyImg.src = monsterArt(trace.allySpecies, true)
      if (foeImg) {
        foeImg.hidden = false
        foeImg.src = monsterArt(trace.foeSpecies, true)
      }
    } else if (text && outcome.lines[0]) text.textContent = outcome.lines[0]
    if (seal && catching && outcome.catch) {
      const t = elapsed - battleEnd
      if (t < 0) seal.style.opacity = '0'
      else paintSeal(seal, t, k, outcome.catch.success)
      if (text && t >= 0) {
        const sealLine = outcome.lines.find((line) => line.startsWith('Bannsiegel'))
        const resultLine = outcome.lines.find((line) => line.startsWith('gefangen') || line.startsWith('entkommen') || line.startsWith('Duplikat'))
        text.textContent = t < 900 * k ? (sealLine ?? '') : (resultLine ?? sealLine ?? '')
      }
    }
    if (elapsed < dur) requestAnimationFrame(frame)
    else done()
  }
  requestAnimationFrame(frame)
}

function paintSeal(seal: HTMLImageElement, t: number, k: number, caught: boolean): void {
  const scaleIn = SEAL_SCALE_IN_MS * k
  const spin = (t / (SEAL_SPIN_MS * k)) * 360
  const pulse = 0.62 + 0.38 * (0.5 + 0.5 * Math.sin((t / (320 * k)) * Math.PI * 2))
  let scale = t < scaleIn ? Math.max(0, t / scaleIn) : 1
  let flat = SEAL_FLAT_Y
  let alpha = pulse
  let shake = 0
  const flareAt = 1000 * k
  if (t > flareAt) {
    const p = (t - flareAt) / (300 * k)
    if (caught) {
      const flare = Math.min(1, p * 2)
      scale = 1 + (CAUGHT_SCALE - 1) * flare
      flat = SEAL_FLAT_Y + (1 - SEAL_FLAT_Y) * flare
      alpha = pulse * Math.max(0, 1 - Math.max(0, p - 0.25) / 0.75)
    } else {
      alpha = pulse * Math.max(0, 1 - p * 1.7)
      shake = Math.sin(p * 20) * 12 * Math.max(0, 1 - p)
    }
  }
  seal.style.opacity = String(Math.max(0, alpha))
  seal.style.transform = `translate(-50%, -50%) translateX(${shake}px) rotate(${spin}deg) scale(${scale}, ${scale * flat})`
}

async function runOffline(rawMs: number): Promise<void> {
  if (!save) return
  window.clearTimeout(timer)
  animating = true
  const counted = Math.min(Math.max(0, rawMs), OFFLINE_CAP_MS)
  const total = Math.floor(counted / BASE_ENCOUNTER_MS)
  const summary: OfflineSummary = emptySummary()
  const levelLeft = new Map<string, number>()
  const start = save.lastSeenAt || Date.now() - counted
  overlay = { kind: 'offline', done: 0, total }
  render()
  for (let i = 0; i < total; i++) {
    if (save.hold && !save.challengeNow) break
    resolveEncounter(save, start + (i + 1) * BASE_ENCOUNTER_MS, { offline: true, trace: false, summary, levelLeft })
    if ((i + 1) % OFFLINE_BLOCK === 0 || i + 1 === total) {
      overlay = { kind: 'offline', done: i + 1, total }
      const bar = document.querySelector('.progress-track span') as HTMLElement | null
      const label = document.querySelector('.overlay p')
      if (bar) bar.style.width = `${Math.round(((i + 1) / total) * 100)}%`
      if (label) label.textContent = `${(i + 1).toLocaleString('de-DE')} / ${total.toLocaleString('de-DE')}`
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    }
  }
  save.lastSeenAt = Date.now()
  lastTick = Date.now()
  try { writeSave(localStorage, save) } catch { /* ignore */ }
  animating = false
  overlay = rawMs >= WELCOME_AFTER_MS
    ? { kind: 'welcome', summary, countedMs: counted, rawMs }
    : null
  render()
  if (!overlay) kick()
}

function onClick(event: Event): void {
  const target = event.target
  if (!(target instanceof Element)) return
  const node = target.closest('[data-act]')
  if (!node) return
  const act = node.getAttribute('data-act')
  if (act === 'avatar') {
    draftAvatar = node.getAttribute('data-avatar') === 'B' ? 'B' : 'A'
    showOnboarding()
    return
  }
  if (act === 'pick') {
    draftPick = node.getAttribute('data-species') ?? ''
    showOnboarding()
    return
  }
  if (act === 'start') {
    if (!draftPick) return
    const field = document.querySelector('[data-field="name"]')
    if (field instanceof HTMLInputElement) draftName = field.value
    void start(beginAdventure(draftName, draftAvatar, draftPick, Date.now()))
    return
  }
  if (!save) return
  if (act === 'screen') {
    screen = (node.getAttribute('data-screen') as Screen) || 'adventure'
    overlay = null
    render()
    kick()
    return
  }
  if (act === 'side') {
    sideOpen = !sideOpen
    render()
    return
  }
  if (act === 'speed') {
    const speed = Number(node.getAttribute('data-speed'))
    if (speed === 1 || speed === 2 || speed === 3) save.settings.speed = speed
    lastTick = Date.now()
    render()
    kick()
    return
  }
  if (act === 'challenge') {
    challengeGuardian(save)
    save.hold = false
    render()
    kick()
    return
  }
  if (act === 'send') {
    sendOut(save, node.getAttribute('data-uid') ?? '')
    render()
    return
  }
  if (act === 'travel') {
    travelTo(save, Number(node.getAttribute('data-chapter')))
    screen = 'adventure'
    render()
    kick()
    return
  }
  if (act === 'select') {
    selected = node.getAttribute('data-uid')
    render()
    return
  }
  if (act === 'dex') {
    const speciesId = node.getAttribute('data-species')
    if (speciesId) overlay = { kind: 'dex', species: speciesId }
    render()
    return
  }
  if (act === 'card') {
    const uid = node.getAttribute('data-uid') || selected || save.team[0] || save.pc[0]
    if (uid && save.mons[uid]) overlay = { kind: 'card', uid }
    render()
    return
  }
  if (act === 'close') {
    overlay = null
    render()
    kick()
    return
  }
  if (act === 'to-pc' && selected) {
    moveToPc(save, selected)
    render()
    return
  }
  if (act === 'to-team' && selected) {
    const swap = save.team.includes(selected) ? null : save.team[save.team.length - 1] ?? null
    moveToTeam(save, selected, save.team.length >= 6 ? swap : null)
    render()
    return
  }
  if (act === 'nudge' && selected) {
    const index = save.team.indexOf(selected)
    reorderTeam(save, index, index + Number(node.getAttribute('data-dir')))
    render()
    return
  }
  if (act === 'dir') {
    pc.dir = pc.dir < 0 ? 1 : -1
    render()
    return
  }
  if (act === 'jump') {
    const input = document.getElementById('debug-hours')
    const hours = input instanceof HTMLInputElement ? Number(input.value) : 10
    if (!Number.isFinite(hours) || hours <= 0 || !debug) return
    save.lastSeenAt = Date.now() - hours * 3600e3
    void runOffline(hours * 3600e3)
    return
  }
  if (act === 'reset') {
    overlay = { kind: 'confirm-reset' }
    render()
    return
  }
  if (act === 'reset-yes') {
    localStorage.removeItem(SAVE_KEY_V2)
    localStorage.setItem(RESET_FLAG, '1')
    window.location.reload()
  }
}

function onChange(event: Event): void {
  syncField(event.target)
}

function onInput(event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  if (target.dataset.field === 'name') {
    draftName = target.value
    return
  }
  if (target.dataset.field === 'q' || target.dataset.field === 'dex-q') {
    if (target.dataset.field === 'q') pc.q = target.value
    else dex.q = target.value
    const caret = target.selectionStart
    const field = target.dataset.field
    render()
    const next = document.querySelector(`[data-field="${field}"]`)
    if (next instanceof HTMLInputElement) {
      next.focus()
      next.setSelectionRange(caret, caret)
    }
  }
}

function syncField(target: EventTarget | null): void {
  if (!save || !(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return
  const field = target.dataset.field
  if (field === 'loop') setLoop(save, target instanceof HTMLInputElement ? target.checked : save.loop)
  if (field === 'auto' && target instanceof HTMLInputElement) save.settings.autoSwitch = target.checked
  if (field === 'card' && target instanceof HTMLInputElement) save.settings.catchCard = target.checked
  if (field === 'buddy' && target instanceof HTMLInputElement) setBuddy(save, target.dataset.uid ?? '')
  if (field === 'keep' && target instanceof HTMLInputElement) setKeepDupes(save, target.dataset.uid ?? '', target.checked)
  if (field === 'type' || field === 'rarity' || field === 'shiny' || field === 'sort') {
    pc[field] = target.value
  }
  if (field === 'dex-type') dex.type = target.value
  if (field === 'dex-rarity') dex.rarity = target.value
  if (field === 'dex-shiny') dex.shiny = target.value
  if (field !== 'q' && field !== 'name') render()
  if (field === 'loop') kick()
}

function onDragStart(event: DragEvent): void {
  const node = event.target instanceof Element ? event.target.closest('[data-drag]') : null
  if (!node) return
  dragUid = node.getAttribute('data-uid') ?? ''
  dragKind = node.getAttribute('data-drag') ?? ''
  event.dataTransfer?.setData('text/plain', dragUid)
}

function onDragOver(event: DragEvent): void {
  if (event.target instanceof Element && event.target.closest('[data-drag]')) event.preventDefault()
}

function onDrop(event: DragEvent): void {
  event.preventDefault()
  if (!save) return
  const node = event.target instanceof Element ? event.target.closest('[data-drag]') : null
  const uid = node?.getAttribute('data-uid') ?? ''
  const kind = node?.getAttribute('data-drag') ?? ''
  applyDrag(dragKind, dragUid, kind, uid)
  dragUid = ''
}

function onPointerDown(event: PointerEvent): void {
  const node = event.target instanceof Element ? event.target.closest('[data-drag="team"]') : null
  if (!node) return
  pressedUid = node.getAttribute('data-uid') ?? ''
  window.clearTimeout(pressTimer)
  pressTimer = window.setTimeout(() => {
    dragUid = pressedUid
    dragKind = 'team'
  }, 350)
}

function onPointerUp(event: PointerEvent): void {
  window.clearTimeout(pressTimer)
  if (!save || dragKind !== 'team' || !dragUid) return
  const node = event.target instanceof Element ? document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-drag="team"]') : null
  const uid = node?.getAttribute('data-uid') ?? ''
  if (uid && uid !== dragUid) applyDrag('team', dragUid, 'team', uid)
  dragUid = ''
  dragKind = ''
}

function applyDrag(fromKind: string, fromUid: string, toKind: string, toUid: string): void {
  if (!save || !fromUid || !toUid || fromUid === toUid) return
  if (fromKind === 'team' && toKind === 'team') {
    reorderTeam(save, save.team.indexOf(fromUid), save.team.indexOf(toUid))
  } else if (fromKind === 'pc' && toKind === 'team') {
    moveToTeam(save, fromUid, toUid)
  } else if (fromKind === 'team' && toKind === 'pc') {
    moveToPc(save, fromUid)
  }
  selected = fromUid
  render()
}
