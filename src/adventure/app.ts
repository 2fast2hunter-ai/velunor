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
  fitScale,
  phoneLandscape,
  tempoScale,
  type Speed
} from './const'
import { t, type Lang } from './i18n'
import { shotAt, shouldRecover } from './present'
import { species } from '../data'
import { actorTransform, hitShake, koPose, lungeOffset, numberStyle, parallaxShift } from '../battle/stage'
import { clearBattleFx, holdBattleFx, mountBattleFx, playBattleFx, setFxRunning } from '../battle/phaserFx'
import { BANNER_MS, CRIT_HITSTOP_MS, KO_MS, LUNGE_HOLD_MS, LUNGE_OUT_MS, moveLabel, NUMBER_MS, RECOIL_MS, STONE_CRIT_HITSTOP_MS, typeFx } from '../battle/typeFx'
import type { TypeId } from '../types'
import { takeChests } from './chests'
import { chestAnimMs, type ChestTier } from './lootbox'
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
  simulateOffline,
  setBuddy,
  setKeepDupes,
  setLoop,
  travelTo,
  type EncounterOutcome,
  type OfflineSummary
} from './sim'
import type { SaveV2 } from './types'
import { PC_VIEW_FALLBACK, sheetShouldClose, virtualWindow } from './virtualList'
import {
  BATTERY_FPS,
  batteryPause,
  fontScale,
  longPressCard,
  nextTab,
  paintDue,
  requestHaptic,
  resumeGap,
  shouldCatchUp,
  stampWhilePaused,
  swipeDirection,
  type HapticKind,
  type Presence
} from './touch'
import {
  art,
  gameHtml,
  monsterArt,
  onboardingHtml,
  pcWindowHtml,
  visiblePc,
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
let sideOpen = false
let mapOpen = false
let moreOpen = false
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
let chestFrame = 0
let wheelMult: Multiplier = 1
let wheelSymbols: [SymbolId, SymbolId, SymbolId] | null = null
let wheelNote = ''
let dragUid = ''
let dragKind = ''
let pcScroll = 0
let keepPcScroll = true
let filtersOpen = false
let dexOpen = false
let pcIds: string[] = []
let pcPainted = -1
let sheetY: number | null = null
let away = false
let screenLocked = false
let gesture: { x: number; y: number; t: number; block: boolean } | null = null
let heldCard = ''
let ignoreClick = false

const debug = debugAllowed(import.meta.env.DEV, window.location.search)

export function bootAdventure(): void {
  const root = document.getElementById('game')
  if (!root) return
  root.innerHTML = `<picture id="frame-bg"><source srcset="${art('backgrounds/bg_frame_desktop.webp')}" type="image/webp"/><img src="${art('backgrounds/bg_frame_desktop.jpg')}" alt=""/></picture><div id="fit"></div><div id="turn" hidden></div>`
  root.addEventListener('click', onClick)
  root.addEventListener('change', onChange)
  root.addEventListener('input', onInput)
  root.addEventListener('dragstart', onDragStart)
  root.addEventListener('dragover', onDragOver)
  root.addEventListener('drop', onDrop)
  root.addEventListener('pointerdown', onPointerDown)
  root.addEventListener('pointerup', onPointerUp)
  root.addEventListener('pointercancel', onPointerUp)
  root.addEventListener('scroll', onPcScroll, true)
  window.addEventListener('resize', fit)
  window.addEventListener('pointerdown', wake)
  window.addEventListener('keydown', wake)
  draftLang = localStorage.getItem('velunor_lang') === 'en' ? 'en' : 'de'
  window.addEventListener('pagehide', () => {
    if (!save) return
    const paused = batteryPause(save.settings.battery, currentPresence())
    if (!paused && Date.now() - lastTick < encounterMs(save.settings.speed) * 2) save.lastSeenAt = Date.now()
    writeSave(localStorage, save)
  })
  document.addEventListener('visibilitychange', onPresence)
  document.addEventListener('freeze', () => {
    screenLocked = true
    onPresence()
  })
  document.addEventListener('resume', () => {
    screenLocked = false
    onPresence()
  })
  window.setInterval(watchdog, 1000)
  window.setInterval(() => {
    if (!save?.started || overlay?.kind === 'offline') return
    save.lastSeenAt = stampWhilePaused(save.lastSeenAt, Date.now(), away)
    try { writeSave(localStorage, save) } catch { /* keep playing */ }
  }, AUTOSAVE_MS)

  const fxDemo = new URLSearchParams(window.location.search).get('fx')
  if (debug && (fxDemo === 'fire' || fxDemo === 'hit' || fxDemo === 'ko')) {
    showFxDemo(fxDemo)
    return
  }
  if (debug && (fxDemo === 'lager' || fxDemo === 'raten' || fxDemo === 'seal')) {
    showChestDemo(fxDemo)
    return
  }
  const skipLegacy = localStorage.getItem(RESET_FLAG) === '1' && !localStorage.getItem(SAVE_KEY_V2)
  const loaded = skipLegacy ? null : loadAdventure(localStorage, Date.now())
  if (!loaded?.started) showOnboarding()
  else void start(loaded)
}

function showFxDemo(kind: 'fire' | 'hit' | 'ko'): void {
  paint(`<div id="stage" class="fx-demo"><div class="anchor anchor-mid"><div class="battle" id="battle" data-fx="live" style="height:980px">
    <div class="battle-world" id="battle-world">
      <div class="parallax far" id="parallax-far"></div>
      <div class="parallax mid" id="parallax-mid"></div>
      <div class="parallax near" id="parallax-near"></div>
      <div id="battle-fx"></div>
      <div class="combatant foe" id="foe-actor" style="left:72%;top:58%"><b>Ziel</b><img class="sprite" src="${monsterArt('m66', true)}" alt=""/><span class="ground-shadow"></span></div>
      <div class="combatant ally" id="ally-actor" style="left:28%;top:72%"><b>Funkfuchs</b><img class="sprite" src="${monsterArt('m01', true)}" alt=""/><span class="ground-shadow"></span></div>
      <div id="floats"></div>
      <div class="move-banner" id="move-banner" hidden></div>
      <div class="crit-flash" id="crit-flash"></div>
    </div>
  </div></div></div>`)
  const host = document.getElementById('battle-fx')
  if (host) mountBattleFx(host)
  window.setTimeout(() => {
    const fx = document.getElementById('battle-fx')
    const ally = document.getElementById('ally-actor')
    const foe = document.getElementById('foe-actor')
    if (!fx || !ally || !foe) return
    const distance = reachDistance(ally, foe, 0.76)
    if (kind === 'ko') {
      const pose = koPose(0.82)
      foe.style.transform = `translate(-50%, -100%) translate(0px, ${pose.drop}px) rotate(${pose.rotate}deg) scale(0.72)`
      foe.style.opacity = String(pose.opacity)
      showMove(attackTitle('m01', 'fire'), ally, 1)
      spawnFloat(document.getElementById('floats'), { amount: 54, crit: false, band: 'neutral' }, '#ffffff', undefined, '70%')
    } else {
      ally.style.transform = actorTransform('ally', kind === 'hit' ? LUNGE_OUT_MS + LUNGE_HOLD_MS : LUNGE_OUT_MS * 0.85, -1, 0, 0, distance)
      showMove(attackTitle('m01', 'fire'), ally, 1)
      const from = stagePoint(ally, fx)
      const to = stagePoint(foe, fx)
      playBattleFx({ type: 'fire', crit: false, band: 'neutral', awaken: false, shimmer: false, reduced: false, tempo: 1, from, to })
      if (kind === 'hit') {
        const picture = foe.querySelector('img')
        if (picture instanceof HTMLImageElement) picture.style.filter = 'brightness(2.8)'
        foe.style.transform = `translate(-50%, -100%) translate(${hitShake(40)}px, 0px) scale(0.72)`
        spawnFloat(document.getElementById('floats'), { amount: 36, crit: false, band: 'strong' }, typeFx('fire').base, undefined, '70%')
      }
    }
    window.setTimeout(() => {
      if (kind !== 'ko') holdBattleFx(kind === 'hit' ? 0.92 : 0.5)
      document.getElementById('battle')?.setAttribute('data-fx', 'hold')
    }, 220)
  }, 400)
}

function showChestDemo(kind: 'lager' | 'raten' | 'seal'): void {
  save = beginAdventure('Ada', 'A', 'm01', Date.now())
  screen = 'activities'
  activity = 'chests'
  if (kind === 'raten') overlay = { kind: 'chest-rates', tier: 'kiesel' }
  if (kind === 'seal') {
    overlay = {
      kind: 'chest-reveal',
      hold: 'card',
      grant: { speciesId: 'm33', rarity: 7, isNew: true, gold: 400, name: 'Bergtitan', place: 'team' }
    }
  }
  render()
  document.getElementById('stage')?.setAttribute('data-fx', 'hold')
}

function chestTier(value: string | null): ChestTier | null {
  if (value === 'kiesel' || value === 'silber' || value === 'gold' || value === 'sternen') return value
  return null
}

function startChestAnim(speed: Speed, reduced: boolean): void {
  if (chestFrame) cancelAnimationFrame(chestFrame)
  const stage = document.querySelector('.chest-stage')
  if (!(stage instanceof HTMLElement) || reduced || stage.dataset.phase === 'card') return
  const ms = chestAnimMs(speed)
  const started = performance.now()
  const step = (now: number) => {
    if (!stage.isConnected) return
    const t = Math.min(1, (now - started) / ms)
    stage.dataset.phase = t < 0.4 ? 'seal' : t < 0.72 ? 'beam' : 'card'
    if (t < 1) chestFrame = requestAnimationFrame(step)
  }
  chestFrame = requestAnimationFrame(step)
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
  const raw = resumeGap(Date.now(), save.lastSeenAt)
  if ((save.settings.battery && shouldCatchUp(raw)) || raw >= WELCOME_AFTER_MS) await runOffline(raw)
  else {
    lastTick = Date.now() - encounterMs(save.settings.speed)
    kick()
  }
}

function render(step = save?.step): void {
  if (!save) return
  const prev = document.getElementById('pc-viewport')
  if (prev && keepPcScroll) pcScroll = prev.scrollTop
  keepPcScroll = true
  paint(gameHtml(save, screen, Date.now(), pc, dex, selected, sideOpen, debug, overlay, step ?? save.step, {
    tab: activity,
    mult: wheelMult,
    symbols: wheelSymbols,
    note: wheelNote
  }, { mapOpen, moreOpen, pcScroll, filtersOpen, dexOpen }))
  if (screen === 'team') {
    pcIds = visiblePc(save, pc)
    const view = document.getElementById('pc-viewport')
    if (view) {
      pcPainted = virtualWindow(pcIds.length, pcScroll, view.clientHeight || PC_VIEW_FALLBACK).start
      view.scrollTop = pcScroll
    }
  }
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

function syncTurn(): void {
  const turn = document.getElementById('turn')
  if (!turn) return
  const lang = save?.settings.lang ?? draftLang
  turn.textContent = t(lang, 'turn.please')
}

function fit(): void {
  const host = document.getElementById('fit')
  const landscape = phoneLandscape(window.innerWidth, window.innerHeight)
  document.body.classList.toggle('is-landscape-phone', landscape)
  syncTurn()
  const turn = document.getElementById('turn')
  if (turn) turn.hidden = !landscape
  if (!host) return
  const scale = fitScale(window.innerWidth, window.innerHeight)
  host.style.setProperty('--ui-scale', String(scale))
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
  if (away) return
  if (!save?.started || animating || overlay) return
  if (save.hold && !save.challengeNow) return
  timer = window.setTimeout(loop, 30)
}

function currentPresence(): Presence {
  if (screenLocked) return 'locked'
  if (document.hidden) return 'hidden'
  return 'visible'
}

function onPresence(): void {
  if (!save?.started) return
  const pause = batteryPause(save.settings.battery, currentPresence())
  if (pause) {
    if (!away) {
      away = true
      releasePresentation(true)
      window.clearTimeout(timer)
      dropFrame()
      setFxRunning(false, BATTERY_FPS)
      try { writeSave(localStorage, save) } catch { /* keep the gap */ }
    }
    return
  }
  setFxRunning(true, save.settings.battery ? BATTERY_FPS : 60)
  if (away) {
    away = false
    const raw = resumeGap(Date.now(), save.lastSeenAt)
    if (shouldCatchUp(raw)) {
      void runOffline(raw)
      return
    }
  }
  if (document.hidden) {
    releasePresentation(true)
    kick()
    return
  }
  if (overlay) return
  const raw = resumeGap(Date.now(), save.lastSeenAt)
  if (raw >= WELCOME_AFTER_MS) void runOffline(raw)
}

function buzz(kind: HapticKind): void {
  if (!save) return
  requestHaptic(kind, save.settings.haptics, (pattern) => {
    const vibrate = navigator.vibrate?.bind(navigator)
    if (!vibrate) return false
    return vibrate(pattern) !== false
  })
}

function loop(): void {
  powerCheck()
  if (!save?.started || animating || overlay || (save.hold && !save.challengeNow)) return
  const dur = encounterMs(save.settings.speed)
  const now = Date.now()
  if (save.settings.battery && (document.hidden || screenLocked)) {
    away = true
    return
  }
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
  if (fresh?.success && (fresh.place === 'team' || fresh.place === 'pc' || fresh.place === 'kept')) buzz('unlock')
  if (outcome.badge) buzz('crest')
  if (fresh?.success && (fresh.place === 'team' || fresh.place === 'pc') && save.settings.catchCard) {
    overlay = { kind: 'catch', species: fresh.species, level: fresh.level, place: fresh.place }
    render()
    return
  }
  if (outcome.kind === 'guardian') {
    overlay = {
      kind: 'guard',
      win: outcome.win,
      badge: outcome.badge,
      gold: outcome.gold,
      text: outcome.lines.filter(Boolean).slice(-2).join(' ')
    }
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
  const battery = Boolean(save?.settings.battery)
  setFxRunning(true, battery ? BATTERY_FPS : 60)
  const reduced = Boolean(save?.settings.reduceMotion)
  const allowShake = Boolean(save?.settings.shake) && !reduced
  const allowFlash = Boolean(save?.settings.flashes) && !reduced
  const catching = Boolean(outcome.catch)
  const battleEnd = catching ? dur * 0.54 : dur
  let prevAlly: number | null = null
  let prevFoe: number | null = null
  let hitAt = -1
  let drawnAt = 0
  const frame = (now: number) => {
    if (gen !== playGen) return
    if (!paintDue(now, drawnAt, battery)) {
      raf = requestAnimationFrame(frame)
      return
    }
    drawnAt = now
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
            const attackerId = hit.from === 'ally' ? shot.allySpecies : shot.foeSpecies
            if (hit.kind === 'hit') {
              showMove(attackTitle(attackerId, hit.type), hit.from === 'ally' ? allyActor : foeActor, k)
              spawnFloat(floats, hit, typeFx(hit.type).base, save?.settings.lang, hit.from === 'ally' ? '70%' : '30%', NUMBER_MS * k)
            }
            const struck = hit.from === 'ally' ? foeActor : allyActor
            struck.classList.remove('recoil')
            void struck.offsetWidth
            struck.classList.add('recoil')
            const picture = struck.querySelector('img')
            if (picture instanceof HTMLImageElement) picture.style.animationDuration = `${RECOIL_MS * k}ms`
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
      const reach = allyActor && foeActor ? reachDistance(allyActor, foeActor, hit?.type === 'fighting' ? 0.88 : 0.76) : 160
      const allyMove = hit?.from === 'ally' ? pose : -1
      const foeMove = hit?.from === 'foe' ? pose : -1
      const allyHit = hit?.from === 'foe' ? pose : -1
      const foeHit = hit?.from === 'ally' ? pose : -1
      const allyKo = shot?.allyHp === 0 ? Math.min(1, Math.max(0, age) / (KO_MS * k)) : 0
      const foeKo = shot?.foeHp === 0 ? Math.min(1, Math.max(0, age) / (KO_MS * k)) : 0
      if (allyActor) {
        allyActor.style.transform = actorTransform('ally', allyMove, allyHit, allyKo, elapsed, reach)
        allyActor.style.opacity = String(koPose(allyKo).opacity)
      }
      if (foeActor) {
        foeActor.style.transform = actorTransform('foe', foeMove, foeHit, foeKo, elapsed + 180, reach)
        foeActor.style.opacity = String(koPose(foeKo).opacity)
      }
      const layers = parallaxShift(pose > 0 ? lungeOffset(pose, reach) : 0, 0)
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

function attackTitle(speciesId: string, type: TypeId): string {
  try {
    const named = species(speciesId).skill.name?.trim()
    if (named) return named
  } catch { /* type label below */ }
  return moveLabel(type)
}

function showMove(name: string, actor: HTMLElement, k: number): void {
  const banner = document.getElementById('move-banner')
  if (!banner) return
  actor.appendChild(banner)
  banner.hidden = false
  banner.textContent = name
  banner.style.left = '50%'
  banner.style.top = '0px'
  window.setTimeout(() => { banner.hidden = true }, BANNER_MS * k)
}

function reachDistance(from: HTMLElement, toward: HTMLElement, portion: number): number {
  const scale = fitScale(window.innerWidth, window.innerHeight) || 1
  const a = from.getBoundingClientRect()
  const b = toward.getBoundingClientRect()
  const gap = Math.abs((b.left + b.width / 2) - (a.left + a.width / 2)) / scale
  return Math.max(140, gap * portion)
}

function spawnFloat(host: HTMLElement | null, hit: { amount: number; crit: boolean; band: 'strong' | 'weak' | 'neutral'; awaken?: boolean }, base: string, lang?: Lang, left = '68%', holdMs = NUMBER_MS): void {
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
  node.style.left = left
  node.style.top = '38%'
  node.style.color = style.color
  node.style.fontSize = `${Math.round(36 * style.scale)}px`
  node.style.opacity = hit.band === 'weak' ? '0.5' : '1'
  const shown = node
  window.setTimeout(() => { shown.hidden = true }, holdMs)
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
  const counted = Math.min(Math.max(0, rawMs), OFFLINE_CAP_MS)
  const total = Math.floor(counted / BASE_ENCOUNTER_MS)
  if (total < OFFLINE_BLOCK && rawMs < WELCOME_AFTER_MS) {
    const quiet = simulateOffline(save, rawMs, Date.now())
    animating = false
    overlay = null
    lastTick = Date.now()
    if (quiet.summary.catches.length) buzz('unlock')
    if (quiet.summary.badges.length) buzz('crest')
    try { writeSave(localStorage, save) } catch { /* keep playing */ }
    render()
    kick()
    return
  }
  animating = true
  const summary: OfflineSummary = emptySummary()
  const levelLeft = new Map<string, number>()
  const start = save.lastSeenAt || Date.now() - counted
  overlay = { kind: 'offline', done: 0, total }
  render()
  let reached = save.lastSeenAt
  let stopped = false
  for (let i = 0; i < total; i++) {
    if (away && save.settings.battery) { stopped = true; break }
    if (save.hold && !save.challengeNow) break
    const at = start + (i + 1) * BASE_ENCOUNTER_MS
    resolveEncounter(save, at, { offline: true, trace: false, summary, levelLeft })
    reached = at
    if ((i + 1) % OFFLINE_BLOCK === 0 || i + 1 === total) {
      overlay = { kind: 'offline', done: i + 1, total }
      const bar = document.querySelector('.progress-track span') as HTMLElement | null
      const label = document.querySelector('.overlay p')
      if (bar) bar.style.width = `${Math.round(((i + 1) / total) * 100)}%`
      if (label) label.textContent = `${(i + 1).toLocaleString('de-DE')} / ${total.toLocaleString('de-DE')}`
      await new Promise((resolve) => window.setTimeout(resolve, 0))
    }
  }
  save.lastSeenAt = stopped ? reached : Date.now()
  lastTick = Date.now()
  try { writeSave(localStorage, save) } catch { /* ignore */ }
  animating = false
  if (stopped) {
    overlay = null
    return
  }
  overlay = rawMs >= WELCOME_AFTER_MS
    ? { kind: 'welcome', summary, countedMs: counted, rawMs }
    : null
  if (summary.catches.length) buzz('unlock')
  if (summary.badges.length) buzz('crest')
  render()
  if (!overlay) kick()
}

function onClick(event: Event): void {
  if (ignoreClick) {
    ignoreClick = false
    return
  }
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
  if (act === 'filters') {
    filtersOpen = !filtersOpen
    render()
    return
  }
  if (act === 'dex-filters') {
    dexOpen = !dexOpen
    render()
    return
  }
  if (act === 'screen') {
    screen = (node.getAttribute('data-screen') as Screen) || 'adventure'
    overlay = null
    moreOpen = false
    mapOpen = false
    render()
    kick()
    return
  }
  if (act === 'map') {
    mapOpen = !mapOpen
    if (mapOpen) moreOpen = false
    render()
    return
  }
  if (act === 'more') {
    moreOpen = !moreOpen
    if (moreOpen) {
      sideOpen = false
      mapOpen = false
    }
    render()
    return
  }
  if (act === 'log') {
    overlay = { kind: 'log' }
    render()
    return
  }
  if (act === 'side') {
    sideOpen = !sideOpen
    if (sideOpen) moreOpen = false
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
    keepPcScroll = false
    pcScroll = 0
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
    const id = node.getAttribute('data-id')
    activity = id === 'wheel' || id === 'chests' ? id : 'hort'
    screen = 'activities'
    render()
    return
  }
  if (act === 'chest-info' || act === 'chest-open' || act === 'chest-all') {
    const tier = chestTier(node.getAttribute('data-tier'))
    if (!tier) return
    if (act === 'chest-info') {
      overlay = { kind: 'chest-rates', tier }
      render()
      return
    }
    const grants = takeChests(save, tier, act === 'chest-all' ? 10 : 1, Date.now())
    if (!grants.length) return
    overlay = act === 'chest-all' ? { kind: 'chest-summary', grants } : { kind: 'chest-reveal', grant: grants[0] }
    try { writeSave(localStorage, save) } catch { /* ignore */ }
    render()
    if (overlay?.kind === 'chest-reveal') startChestAnim(save.settings.speed, save.settings.reduceMotion)
    return
  }
  if (act === 'chest-skip') {
    const stage = document.querySelector('.chest-stage')
    if (stage instanceof HTMLElement && stage.dataset.phase !== 'card') {
      if (chestFrame) cancelAnimationFrame(chestFrame)
      stage.dataset.phase = 'card'
      return
    }
    overlay = null
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
  if (act === 'font') {
    save.settings.font = fontScale(Number(node.getAttribute('data-size')))
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
    if (target.dataset.field === 'q') {
      pc.q = target.value
      keepPcScroll = false
      pcScroll = 0
    } else dex.q = target.value
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
  if (field === 'swipe' && target instanceof HTMLInputElement) save.settings.swipeTabs = target.checked
  if (field === 'haptic' && target instanceof HTMLInputElement) save.settings.haptics = target.checked
  if (field === 'battery' && target instanceof HTMLInputElement) {
    save.settings.battery = target.checked
    setFxRunning(true, target.checked ? BATTERY_FPS : 60)
    onPresence()
  }
  if (field === 'buddy' && target instanceof HTMLInputElement) setBuddy(save, target.dataset.uid ?? '')
  if (field === 'keep' && target instanceof HTMLInputElement) setKeepDupes(save, target.dataset.uid ?? '', target.checked)
  if (field === 'type' || field === 'rarity' || field === 'shiny' || field === 'sort') {
    pc[field] = target.value
    keepPcScroll = false
    pcScroll = 0
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

function onPcScroll(event: Event): void {
  const viewport = event.target
  if (!(viewport instanceof HTMLElement) || viewport.id !== 'pc-viewport' || !save) return
  pcScroll = viewport.scrollTop
  const win = virtualWindow(pcIds.length, pcScroll, viewport.clientHeight || PC_VIEW_FALLBACK)
  if (win.start === pcPainted) return
  pcPainted = win.start
  const windowEl = viewport.querySelector('.vlist-window')
  if (!(windowEl instanceof HTMLElement)) return
  windowEl.style.transform = `translateY(${win.offset}px)`
  windowEl.innerHTML = pcWindowHtml(save, pcIds.slice(win.start, win.end), selected)
}

function onPointerDown(event: PointerEvent): void {
  ignoreClick = false
  const target = event.target instanceof Element ? event.target : null
  const grab = target?.closest('.sheet-grab') ?? null
  sheetY = grab ? event.clientY : null
  const card = target?.closest('[data-press="card"]')
  heldCard = card?.getAttribute('data-uid') ?? ''
  const block = Boolean(target?.closest('input, textarea, select, .sheet-grab'))
  gesture = { x: event.clientX, y: event.clientY, t: performance.now(), block }
}

function onPointerUp(event: PointerEvent): void {
  const start = gesture
  const card = heldCard
  gesture = null
  heldCard = ''
  if (sheetY != null) {
    const dy = event.clientY - sheetY
    sheetY = null
    if (overlay && sheetShouldClose(dy, fitScale(window.innerWidth, window.innerHeight))) {
      overlay = null
      if (showAwaken()) return
      render()
      kick()
      return
    }
  }
  if (save && card && start) {
    const scale = fitScale(window.innerWidth, window.innerHeight) || 1
    const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y) / scale
    if (longPressCard(moved, performance.now() - start.t) && save.mons[card]) {
      ignoreClick = true
      selected = card
      overlay = { kind: 'card', uid: card }
      render()
      return
    }
  }
  if (!save || !start || start.block || overlay || moreOpen || mapOpen || !save.settings.swipeTabs) return
  const dir = swipeDirection(event.clientX - start.x, event.clientY - start.y, fitScale(window.innerWidth, window.innerHeight))
  const next = nextTab(screen, dir, true)
  if (!next || next === screen) return
  ignoreClick = true
  screen = next
  sideOpen = false
  render()
  kick()
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
