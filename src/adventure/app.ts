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
import { t, type Lang } from './i18n'
import { shotAt, shouldRecover } from './present'
import { actorTransform, numberStyle, parallaxShift } from '../battle/stage'
import { clearBattleFx, holdBattleFx, mountBattleFx, playBattleFx } from '../battle/phaserFx'
import { CRIT_HITSTOP_MS, FIGHTING_LUNGE_PX, LUNGE_PX, STONE_CRIT_HITSTOP_MS, typeFx } from '../battle/typeFx'
import { beginAdventure, exportCode, importCode, loadAdventure, writeSave } from './save'
import { equipFrame, equipTitle } from './achievements'
import { buyHortSlot, moveFromHort, moveToHort } from './hort'
import { buyCrystal, buyFruit, sellCrystal, sellFruit, useCrystal, useFruit } from './shop'
import { buyPrize, spinWheel, type Multiplier, type SymbolId } from './wheel'
import { chapterCapNow } from './dex'
import { chapterById } from './route'
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
  type Screen,
  type WheelPanel
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
let draftLang: Lang = 'de'
let pendingImport: SaveV2 | null = null
let lastInput = Date.now()
let timer = 0
let animating = false
let lastTick = 0
let progressAt = Date.now()
let raf = 0
let playGen = 0
let pendingOutcome: EncounterOutcome | null = null
let activity: WheelPanel['tab'] = 'hort'
let wheelMult: Multiplier = 1
let wheelSymbols: [SymbolId, SymbolId, SymbolId] | null = null
let wheelNote = ''
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
  window.addEventListener('pointerdown', wake)
  window.addEventListener('keydown', wake)
  draftLang = localStorage.getItem('velunor_lang') === 'en' ? 'en' : 'de'
  window.addEventListener('pagehide', () => {
    if (!save) return
    if (Date.now() - lastTick < encounterMs(save.settings.speed) * 2) save.lastSeenAt = Date.now()
    writeSave(localStorage, save)
  })
  document.addEventListener('visibilitychange', () => {
    if (!save?.started) return
    if (document.hidden) {
      releasePresentation(true)
      kick()
      return
    }
    if (overlay) return
    const raw = Date.now() - save.lastSeenAt
    if (raw >= WELCOME_AFTER_MS) void runOffline(raw)
  })
  window.setInterval(watchdog, 1000)
  window.setInterval(() => {
    if (!save?.started || overlay?.kind === 'offline') return
    save.lastSeenAt = Date.now()
    try { writeSave(localStorage, save) } catch { /* keep playing */ }
  }, AUTOSAVE_MS)

  const fxDemo = new URLSearchParams(window.location.search).get('fx')
  if (debug && (fxDemo === 'fire' || fxDemo === 'crit')) {
    showFxDemo(fxDemo)
    return
  }
  const skipLegacy = localStorage.getItem(RESET_FLAG) === '1' && !localStorage.getItem(SAVE_KEY_V2)
  const loaded = skipLegacy ? null : loadAdventure(localStorage, Date.now())
  if (!loaded?.started) showOnboarding()
  else void start(loaded)
}

function showFxDemo(kind: 'fire' | 'crit'): void {
  const crit = kind === 'crit'
  paint(`<div id="stage" class="side-shut"><main class="center"><div class="battle" id="battle" data-fx="live" style="height:720px">
    <div class="battle-world" id="battle-world">
      <div class="parallax far" id="parallax-far"></div>
      <div class="parallax mid" id="parallax-mid"></div>
      <div class="parallax near" id="parallax-near"></div>
      <div id="battle-fx"></div>
      <div class="combatant foe" id="foe-actor" style="left:72%;top:56%"><b>Ziel</b><img class="sprite" src="${monsterArt('m66', true)}" alt=""/><span class="ground-shadow"></span></div>
      <div class="combatant ally" id="ally-actor" style="left:28%;top:68%"><b>Funkfuchs</b><img class="sprite" src="${monsterArt('m01', true)}" alt=""/><span class="ground-shadow"></span></div>
      <div id="floats"></div>
      <div class="crit-flash" id="crit-flash"></div>
    </div>
  </div></main></div>`)
  const host = document.getElementById('battle-fx')
  if (host) mountBattleFx(host)
  window.setTimeout(() => {
    const host = document.getElementById('battle-fx')
    const ally = document.getElementById('ally-actor')
    const foe = document.getElementById('foe-actor')
    const from = host && ally ? stagePoint(ally, host) : { x: 180, y: 280 }
    const to = host && foe ? stagePoint(foe, host) : { x: 420, y: 180 }
    playBattleFx({ type: 'fire', crit, band: crit ? 'strong' : 'neutral', awaken: crit, shimmer: false, reduced: false, tempo: 1, from, to })
    if (crit) {
      const flash = document.getElementById('crit-flash')
      if (flash) flash.style.opacity = '0.15'
      spawnFloat(document.getElementById('floats'), { amount: 48, crit: true, band: 'strong' }, '#ff7043')
      document.getElementById('battle-world')?.classList.add('shake-crit')
    }
    window.setTimeout(() => {
      holdBattleFx(crit ? 0.86 : 0.5)
      document.getElementById('battle')?.setAttribute('data-fx', 'hold')
    }, 180)
  }, 400)
}

function showOnboarding(): void {
  save = null
  paint(onboardingHtml(draftName, draftAvatar, draftPick, draftLang))
}

async function start(next: SaveV2): Promise<void> {
  save = next
  localStorage.removeItem(RESET_FLAG)
  try { writeSave(localStorage, save) } catch { /* ignore */ }
  screen = 'adventure'
  noteProgress()
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
  paint(gameHtml(save, screen, Date.now(), pc, dex, selected, sideOpen, debug, overlay, step ?? save.step, {
    tab: activity,
    mult: wheelMult,
    symbols: wheelSymbols,
    note: wheelNote
  }))
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

function wake(): void {
  lastInput = Date.now()
  document.getElementById('blackout')?.remove()
}

function powerCheck(): void {
  if (!save) return
  const minutes = save.settings.powerSave
  if (minutes !== 2 && minutes !== 5) {
    document.getElementById('blackout')?.remove()
    return
  }
  if (Date.now() - lastInput < minutes * 60_000) return
  if (document.getElementById('blackout')) return
  const dim = document.createElement('div')
  dim.id = 'blackout'
  document.body.appendChild(dim)
}

function showAwaken(): boolean {
  if (!save?.pendingAwaken.length || overlay) return false
  const next = save.pendingAwaken.shift()
  if (!next) return false
  overlay = { kind: 'awaken', uid: next.uid, level: next.level }
  render()
  return true
}

function noteProgress(): void {
  progressAt = Date.now()
}

function dropFrame(): void {
  playGen += 1
  if (raf) cancelAnimationFrame(raf)
  raf = 0
}

function releasePresentation(quiet: boolean): void {
  const outcome = pendingOutcome
  dropFrame()
  pendingOutcome = null
  animating = false
  if (!quiet && save) {
    save.log.push({ t: Date.now(), text: t(save.settings.lang, 'say.recover') })
    if (save.log.length > 50) save.log.splice(0, save.log.length - 50)
    console.debug('battle watchdog', save.region, save.chapter, save.step)
  }
  noteProgress()
  if (outcome) finishPresent(outcome)
  else if (!quiet) kick()
}

function watchdog(): void {
  if (!save?.started) return
  if (overlay || (save.hold && !save.challengeNow)) {
    noteProgress()
    return
  }
  const stalled = shouldRecover({
    started: true,
    overlay: false,
    hold: false,
    since: progressAt,
    now: Date.now(),
    speed: save.settings.speed
  })
  if (!stalled) return
  releasePresentation(false)
}

function kick(): void {
  window.clearTimeout(timer)
  if (!save?.started || animating || overlay) return
  if (save.hold && !save.challengeNow) return
  timer = window.setTimeout(loop, 30)
}

function loop(): void {
  powerCheck()
  if (!save?.started || animating || overlay || (save.hold && !save.challengeNow)) return
  const dur = encounterMs(save.settings.speed)
  const now = Date.now()
  if (document.hidden) {
    if (animating) {
      dropFrame()
      pendingOutcome = null
      animating = false
    }
    let steps = 0
    while (now - lastTick >= dur && steps < 200 && (!save.hold || save.challengeNow)) {
      try {
        resolveEncounter(save, Date.now(), { offline: false, trace: false })
      } catch (err) {
        console.error(err)
        break
      }
      lastTick += dur
      steps += 1
    }
    save.lastSeenAt = lastTick
    noteProgress()
    try { writeSave(localStorage, save) } catch { /* ignore */ }
    timer = window.setTimeout(loop, dur)
    return
  }
  if (now - lastTick < dur) {
    timer = window.setTimeout(loop, dur - (now - lastTick))
    return
  }
  lastTick = now
  noteProgress()
  let outcome: EncounterOutcome
  try {
    outcome = resolveEncounter(save, now, { offline: false, trace: true })
  } catch (err) {
    console.error(err)
    animating = false
    save.log.push({ t: now, text: t(save.settings.lang, 'say.recover') })
    if (save.log.length > 50) save.log.splice(0, save.log.length - 50)
    noteProgress()
    kick()
    return
  }
  save.lastSeenAt = now
  try { writeSave(localStorage, save) } catch { /* ignore */ }
  animating = true
  pendingOutcome = outcome
  if (screen !== 'adventure') {
    animating = false
    pendingOutcome = null
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
  if (pendingOutcome === outcome) pendingOutcome = null
  noteProgress()
  if (!save) return
  const fresh = outcome.catch
  if (fresh?.success && (fresh.place === 'team' || fresh.place === 'pc') && save.settings.catchCard) {
    overlay = { kind: 'catch', species: fresh.species, level: fresh.level, place: fresh.place }
    render()
    return
  }
  if (showAwaken()) return
  if (save.hold && !save.challengeNow) render()
  else kick()
}

function sealCaption(outcome: EncounterOutcome, result: boolean): string {
  const caught = outcome.catch
  if (!save || !caught) return ''
  const lang = save.settings.lang
  if (!result) return t(lang, 'say.seal', { pct: Math.round(caught.chance * 100) })
  if (!caught.success) return t(lang, 'say.escaped')
  if (caught.place === 'exp') return t(lang, 'say.dupeExp', { name: caught.name })
  if (caught.place === 'kept') return t(lang, 'say.dupeKeep', { name: caught.name })
  return t(lang, 'say.caught', { name: caught.name, place: t(lang, caught.place === 'team' ? 'say.placeTeam' : 'say.placePc') })
}

function paintSprite(img: HTMLImageElement | null, speciesId: string, shiny: boolean | null): void {
  if (!img) return
  img.hidden = false
  if (shiny != null) img.classList.toggle('is-shiny', shiny)
  if (img.dataset.species !== speciesId) {
    img.dataset.species = speciesId
    img.src = monsterArt(speciesId, true)
  }
}

function play(outcome: EncounterOutcome, speed: Speed, done: () => void): void {
  playGen += 1
  const gen = playGen
  if (raf) cancelAnimationFrame(raf)
  raf = 0
  let settled = false
  const finish = () => {
    if (settled || gen !== playGen) return
    settled = true
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    done()
  }
  const dur = encounterMs(speed)
  let backstop = 0
  const finishOnce = () => {
    window.clearTimeout(backstop)
    clearBattleFx()
    finish()
  }
  backstop = window.setTimeout(finishOnce, dur + 40)
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
  const allyActor = document.getElementById('ally-actor')
  const foeActor = document.getElementById('foe-actor')
  const fxHost = document.getElementById('battle-fx')
  const floats = document.getElementById('floats')
  const critFlash = document.getElementById('crit-flash')
  if (fxHost) mountBattleFx(fxHost)
  const reduced = Boolean(save?.settings.reduceMotion)
  const allowShake = Boolean(save?.settings.shake) && !reduced
  const allowFlash = Boolean(save?.settings.flashes) && !reduced
  const catching = Boolean(outcome.catch)
  const battleEnd = catching ? dur * 0.54 : dur
  let prevAlly: number | null = null
  let prevFoe: number | null = null
  let hitAt = -1
  const frame = (now: number) => {
    if (gen !== playGen) return
    try {
      const elapsed = now - started
      const shot = shotAt(outcome.traces, Math.min(elapsed, battleEnd), battleEnd)
      if (shot && allyHp && foeHp) {
        allyHp.style.width = `${(shot.allyHp / shot.allyMax) * 100}%`
        foeHp.style.width = `${(shot.foeHp / shot.foeMax) * 100}%`
        const dropped = (prevAlly != null && shot.allyHp < prevAlly) || (prevFoe != null && shot.foeHp < prevFoe)
        if (dropped) {
          hitAt = elapsed
          const hit = shot.hits.find((row) => row.kind === 'hit') ?? shot.hits[0]
          if (hit && fxHost && allyActor && foeActor) {
            const allyPt = stagePoint(allyActor, fxHost)
            const foePt = stagePoint(foeActor, fxHost)
            const from = hit.from === 'ally' ? allyPt : foePt
            const to = hit.from === 'ally' ? foePt : allyPt
            playBattleFx({ type: hit.type, crit: hit.crit, band: hit.band, awaken: Boolean(hit.awaken), shimmer: Boolean(outcome.shiny), reduced, tempo: speed, from, to, kind: hit.kind })
            if (hit.kind === 'hit') spawnFloat(floats, hit, typeFx(hit.type).base, save?.settings.lang)
            const struck = hit.from === 'ally' ? foeImg : allyImg
            if (struck) {
              struck.style.filter = `drop-shadow(0 0 12px ${typeFx(hit.type).accent})`
              window.setTimeout(() => { struck.style.filter = '' }, 60 * k)
            }
          }
          if (allowShake) {
            const world = document.getElementById('battle-world')
            world?.classList.remove('shake', 'shake-crit')
            void world?.offsetWidth
            world?.classList.add(shot.hits.some((row) => row.crit) ? 'shake-crit' : 'shake')
          }
          if (allowFlash && shot.hits.some((row) => row.crit) && critFlash) critFlash.style.opacity = '0.15'
        } else if (critFlash && elapsed - hitAt > 50 * k) critFlash.style.opacity = '0'
        prevAlly = shot.allyHp
        prevFoe = shot.foeHp
      }
      const hit = shot?.hits.find((row) => row.kind === 'hit')
      const hitstop = (hit?.crit ? (hit.type === 'stone' ? STONE_CRIT_HITSTOP_MS : CRIT_HITSTOP_MS) : 0) * k
      const age = hitAt < 0 ? -1 : elapsed - hitAt
      const pose = age < 0 ? -1 : age < hitstop ? 0 : (age - hitstop) / k
      const allyDist = hit?.type === 'fighting' && hit.from === 'ally' ? FIGHTING_LUNGE_PX : LUNGE_PX
      const foeDist = hit?.type === 'fighting' && hit.from === 'foe' ? FIGHTING_LUNGE_PX : LUNGE_PX
      if (allyActor) allyActor.style.transform = actorTransform('ally', pose, pose, shot?.allyHp === 0 ? Math.min(1, Math.max(0, age) / 400) : 0, elapsed, allyDist)
      if (foeActor) foeActor.style.transform = actorTransform('foe', pose, pose, shot?.foeHp === 0 ? Math.min(1, Math.max(0, age) / 400) : 0, elapsed + 180, foeDist)
      const layers = parallaxShift(age > 0 && age < 200 ? 12 : 0, allowShake && age > 0 && age < 120 ? 4 : 0)
      const far = document.getElementById('parallax-far')
      const mid = document.getElementById('parallax-mid')
      const near = document.getElementById('parallax-near')
      if (far) far.style.transform = `translateX(${layers.far}px)`
      if (mid) mid.style.transform = `translateX(${layers.mid}px)`
      if (near) near.style.transform = `translateX(${layers.near}px)`
      if (text && shot && elapsed < battleEnd) text.textContent = shot.text
      if (allyName && shot) allyName.textContent = shot.allyName
      if (foeName && shot) foeName.textContent = outcome.shiny ? `${shot.foeName} · ${t(save?.settings.lang, 'battle.shimmer')}` : shot.foeName
      if (shot) {
        paintSprite(allyImg, shot.allySpecies, null)
        paintSprite(foeImg, shot.foeSpecies, outcome.shiny)
      } else if (text && outcome.lines[0] && elapsed < battleEnd) text.textContent = outcome.lines[0]
      if (seal && catching && outcome.catch) {
        const age = elapsed - battleEnd
        if (age < 0) seal.style.opacity = '0'
        else paintSeal(seal, age, k, outcome.catch.success)
        if (text && age >= 0) text.textContent = sealCaption(outcome, age >= 900 * k)
      }
      if (elapsed < dur) raf = requestAnimationFrame(frame)
      else finishOnce()
    } catch (err) {
      console.error(err)
      finishOnce()
    }
  }
  raf = requestAnimationFrame(frame)
}

const floatPool: HTMLDivElement[] = []

function stagePoint(actor: HTMLElement, host: HTMLElement): { x: number; y: number } {
  const box = actor.getBoundingClientRect()
  const frame = host.getBoundingClientRect()
  const width = host.clientWidth || frame.width || 1
  const height = host.clientHeight || frame.height || 1
  return {
    x: ((box.left + box.width / 2) - frame.left) / (frame.width || 1) * width,
    y: ((box.top + box.height * 0.62) - frame.top) / (frame.height || 1) * height
  }
}

function spawnFloat(host: HTMLElement | null, hit: { amount: number; crit: boolean; band: 'strong' | 'weak' | 'neutral'; awaken?: boolean }, base: string, lang?: Lang): void {
  if (!host || hit.amount <= 0) return
  let node = floatPool.find((row) => row.hidden)
  if (!node) {
    node = floatPool.length >= 8 ? floatPool[0] : document.createElement('div')
    if (!floatPool.includes(node)) floatPool.push(node)
    node.className = 'float-num'
  }
  if (node.parentElement !== host) host.appendChild(node)
  const style = numberStyle(hit.band, hit.crit, Boolean(hit.awaken), base)
  const label = !lang ? style.label : hit.crit ? t(lang, 'battle.crit') : hit.band === 'strong' ? t(lang, 'battle.strong') : hit.band === 'weak' ? t(lang, 'battle.weak') : ''
  node.hidden = false
  node.textContent = label ? `${label} ${hit.amount}` : String(hit.amount)
  node.style.left = '68%'
  node.style.top = '42%'
  node.style.color = style.color
  node.style.fontSize = `${Math.round(18 * style.scale)}px`
  node.style.opacity = hit.band === 'weak' ? '0.5' : '1'
  const shown = node
  window.setTimeout(() => { shown.hidden = true }, 700)
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
    if (caught && save?.settings.flashes) {
      const flare = Math.min(1, p * 2)
      scale = 1 + (CAUGHT_SCALE - 1) * flare
      flat = SEAL_FLAT_Y + (1 - SEAL_FLAT_Y) * flare
      alpha = pulse * Math.max(0, 1 - Math.max(0, p - 0.25) / 0.75)
    } else if (!caught) {
      alpha = pulse * Math.max(0, 1 - p * 1.7)
      if (save?.settings.shake) shake = Math.sin(p * 20) * 12 * Math.max(0, 1 - p)
    } else alpha = pulse * Math.max(0, 1 - Math.max(0, p - 0.25) / 0.75)
  }
  if (!save?.settings.shake) shake = 0
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
  if (act === 'lang') {
    draftLang = node.getAttribute('data-lang') === 'en' ? 'en' : 'de'
    localStorage.setItem('velunor_lang', draftLang)
    if (!save) {
      showOnboarding()
      return
    }
    save.settings.lang = draftLang
    render()
    return
  }
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
    const next = beginAdventure(draftName, draftAvatar, draftPick, Date.now())
    next.settings.lang = draftLang
    if (draftLang === 'en' && next.log[0]) next.log[0].text = t('en', 'say.start', { name: next.name })
    void start(next)
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
  if (act === 'region') {
    const regionId = Number(node.getAttribute('data-region'))
    if (regionId !== save.region) {
      travelTo(save, regionId, 1)
      screen = 'adventure'
    }
    render()
    kick()
    return
  }
  if (act === 'travel') {
    travelTo(save, Number(node.getAttribute('data-region')) || save.region, Number(node.getAttribute('data-chapter')))
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
    if (showAwaken()) return
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
  if (act === 'buy-crystal' || act === 'buy-fruit' || act === 'sell-crystal' || act === 'sell-fruit' || act === 'use-fruit' || act === 'use-crystal') {
    const id = node.getAttribute('data-id') ?? ''
    let reason: string | null = 'Unbekannt.'
    if (act === 'buy-crystal') reason = buyCrystal(save, id as 's')
    if (act === 'buy-fruit') reason = buyFruit(save, id as 'fang')
    if (act === 'sell-crystal') reason = sellCrystal(save, id as 's')
    if (act === 'sell-fruit') reason = sellFruit(save, id as 'fang')
    if (act === 'use-fruit') reason = useFruit(save, id as 'fang', Date.now())
    if (act === 'use-crystal') {
      const target = document.getElementById('crystal-target')
      const uid = target instanceof HTMLSelectElement ? target.value : ''
      reason = useCrystal(save, id as 's', uid, chapterCapNow(save, chapterById(save.region, save.chapter)))
    }
    save.log.push({ t: Date.now(), text: reason ?? 'Erledigt.' })
    if (save.log.length > 50) save.log.splice(0, save.log.length - 50)
    try { writeSave(localStorage, save) } catch { /* ignore */ }
    render()
    return
  }
  if (act === 'to-hort' && selected) {
    const reason = moveToHort(save, selected)
    save.log.push({ t: Date.now(), text: reason ?? 'Im Hort.' })
    if (save.log.length > 50) save.log.splice(0, save.log.length - 50)
    render()
    return
  }
  if (act === 'from-hort' && selected) {
    const reason = moveFromHort(save, selected)
    save.log.push({ t: Date.now(), text: reason ?? 'Im PC.' })
    if (save.log.length > 50) save.log.splice(0, save.log.length - 50)
    render()
    return
  }
  if (act === 'equip-title') {
    equipTitle(save, node.getAttribute('data-id') ?? '')
    render()
    return
  }
  if (act === 'equip-frame') {
    equipFrame(save, node.getAttribute('data-id') ?? '')
    render()
    return
  }
  if (act === 'activity') {
    activity = node.getAttribute('data-id') === 'wheel' ? 'wheel' : 'hort'
    screen = 'activities'
    render()
    return
  }
  if (act === 'wheel-mult') {
    const mult = Number(node.getAttribute('data-mult'))
    if (mult === 1 || mult === 5 || mult === 10) wheelMult = mult
    render()
    return
  }
  if (act === 'spin') {
    const spun = spinWheel(save, wheelMult)
    if (typeof spun === 'string') wheelNote = spun
    else {
      wheelSymbols = spun.symbols
      wheelNote = `${spun.marks.toLocaleString('de-DE')} Glücksmarken.`
    }
    try { writeSave(localStorage, save) } catch { /* ignore */ }
    render()
    return
  }
  if (act === 'buy-prize') {
    const reason = buyPrize(save, node.getAttribute('data-id') ?? '', Date.now())
    wheelNote = reason ?? 'Im PC.'
    try { writeSave(localStorage, save) } catch { /* ignore */ }
    render()
    return
  }
  if (act === 'buy-hort') {
    const reason = buyHortSlot(save)
    save.log.push({ t: Date.now(), text: reason ?? 'Ein Hortplatz ist offen.' })
    if (save.log.length > 50) save.log.splice(0, save.log.length - 50)
    try { writeSave(localStorage, save) } catch { /* ignore */ }
    render()
    return
  }
  if (act === 'power') {
    const minutes = Number(node.getAttribute('data-min'))
    save.settings.powerSave = minutes === 2 || minutes === 5 ? minutes : 0
    wake()
    render()
    return
  }
  if (act === 'copy-code') {
    const code = exportCode(save)
    const box = document.getElementById('export-code')
    if (box instanceof HTMLTextAreaElement) {
      box.value = code
      box.focus()
      box.select()
    }
    navigator.clipboard?.writeText(code).catch(() => {})
    return
  }
  if (act === 'import-ask') {
    const box = document.getElementById('import-code')
    const loaded = importCode(box instanceof HTMLTextAreaElement ? box.value : '', Date.now())
    if (!loaded) {
      save.log.push({ t: Date.now(), text: t(save.settings.lang, 'import.bad') })
      if (save.log.length > 50) save.log.splice(0, save.log.length - 50)
      render()
      return
    }
    pendingImport = loaded
    overlay = { kind: 'confirm-import' }
    render()
    return
  }
  if (act === 'import-yes' && pendingImport) {
    save = pendingImport
    pendingImport = null
    overlay = null
    screen = 'adventure'
    try { writeSave(localStorage, save) } catch { /* ignore */ }
    render()
    kick()
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
  if (field === 'shake' && target instanceof HTMLInputElement) save.settings.shake = target.checked
  if (field === 'flash' && target instanceof HTMLInputElement) save.settings.flashes = target.checked
  if (field === 'motion' && target instanceof HTMLInputElement) save.settings.reduceMotion = target.checked
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
