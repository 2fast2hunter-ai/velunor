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
import { species, typeColor } from '../data'
import { teamWeatherMarks, weatherArrow, weatherAt } from './weather'
import { ultName } from './ult'
import { AILMENTS, ailmentIcon, type AilmentId } from './ailment'
import { sfx } from '../ui'
import { actorTransform, hitShake, koPose, lungeOffset, numberStyle, parallaxShift } from '../battle/stage'
import { bossUltHitstop, bossUltShake, cameraShake, hitGrade, hitstopMs, numberHoldMs } from '../battle/hitReadout'
import { beginBattleMood, clearBattleFx, holdBattleFx, mountBattleFx, onBattleFxReady, playBattleFx, preloadBattleStrips, setFxRunning, showBattleConfetti, showBattleDissolve, showHitNumber } from '../battle/phaserFx'
import { effectTiming, battleStripTypes } from '../battle/strips'
import { BANNER_MS, LUNGE_OUT_MS, moveLabel, RECOIL_MS, typeFx } from '../battle/typeFx'
import type { TypeId } from '../types'
import { takeChests } from './chests'
import { bankRoad, buyChestForGold, buyChestForMarks, claimRoad, craftSpecies, debugStarChests, meltDuplicate, raiseStar } from './sources'
import { chestAnimMs, type ChestTier } from './lootbox'
import { needsConfirm, shopOffer } from './shopOffer'
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
let shopTab: 'chests' | 'boost' | 'marks' = 'chests'
let shopFlashUntil = 0
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
let gesture: { x: number; y: number; t: number; block: boolean; shop: boolean } | null = null
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

  const params = new URLSearchParams(window.location.search)
  const fxDemo = params.get('fx')
  if (debug && fxDemo === 'k6') {
    showK6Demo(params.get('part'))
    return
  }
  if (debug && fxDemo === 'k5') {
    showK5Demo(params.get('part'))
    return
  }
  if (debug && fxDemo === 'k4') {
    showK4Demo(params.get('part'))
    return
  }
  if (debug && fxDemo === 'k3') {
    showK3Demo(params.get('part'))
    return
  }
  if (debug && (fxDemo === 'fire' || fxDemo === 'hit' || fxDemo === 'ko' || fxDemo === 'strip')) {
    showFxDemo(fxDemo === 'strip' ? 'hit' : fxDemo, params.get('type'))
    return
  }
  if (debug && (fxDemo === 'lager' || fxDemo === 'raten' || fxDemo === 'seal')) {
    showChestDemo(fxDemo)
    return
  }
  if (debug && (fxDemo === 'shop' || fxDemo === 'shop-poor' || fxDemo === 'shop-ask')) {
    showShopDemo(fxDemo)
    return
  }
  const skipLegacy = localStorage.getItem(RESET_FLAG) === '1' && !localStorage.getItem(SAVE_KEY_V2)
  const loaded = skipLegacy ? null : loadAdventure(localStorage, Date.now())
  if (!loaded?.started) showOnboarding()
  else void start(loaded)
}

function demoType(requested: string | null): TypeId {
  const known = battleStripTypes()
  return requested && known.includes(requested as TypeId) ? requested as TypeId : 'fire'
}

function showFxDemo(kind: 'fire' | 'hit' | 'ko', requested: string | null = null): void {
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
  const type = demoType(requested)
  if (host) mountBattleFx(host)
  preloadBattleStrips([type], () => onBattleFxReady(() => window.setTimeout(() => {
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
      spawnFloat(document.getElementById('floats'), { amount: 54, crit: false, band: 'neutral' }, '#ffffff', '70%')
    } else {
      ally.style.transform = actorTransform('ally', kind === 'hit' ? LUNGE_OUT_MS * 0.35 : LUNGE_OUT_MS * 0.85, -1, 0, 0, distance)
      showMove(moveLabel(type), ally, 1)
      const from = stagePoint(ally, fx)
      const to = stagePoint(foe, fx)
      const timing = effectTiming(type, 1)
      playBattleFx({ type, crit: kind === 'hit', band: 'neutral', awaken: false, shimmer: false, reduced: false, tempo: 1, from, to })
      window.setTimeout(() => document.getElementById('battle')?.setAttribute('data-proj', 'ready'), Math.max(40, Math.round(timing.travelMs * 0.45)))
      if (kind === 'hit') {
        window.setTimeout(() => {
          const picture = foe.querySelector('img')
          if (picture instanceof HTMLImageElement) picture.style.filter = 'brightness(2.8)'
          foe.style.transform = `translate(-50%, -100%) translate(${hitShake(40)}px, 0px) scale(0.72)`
          const head = numberPoint(foe, fx)
          const shown = showHitNumber(head.x, head.y, 36, 'crit', numberHoldMs(1))
          if (!shown) spawnFloat(document.getElementById('floats'), { amount: 36, crit: true, band: 'neutral' }, typeFx(type).base, '70%', numberHoldMs(1))
          document.getElementById('battle')?.setAttribute('data-digits', 'ready')
        }, timing.travelMs)
      }
    }
    window.setTimeout(() => {
      if (kind !== 'ko') holdBattleFx(kind === 'hit' ? 0.55 : 0.5)
      document.getElementById('battle')?.setAttribute('data-fx', 'hold')
    }, 280)
  }, 40)))
}

const REGION_TINT = [0x7dcea0, 0x7dcea0, 0x9ad7ff, 0xff8a3d, 0x7e57c2, 0xf0c14a]

function showK6Demo(part: string | null): void {
  const kind = part === 'konter' ? 'konter' : part === 'karte' ? 'karte' : 'before'
  save = beginAdventure('Ada', 'A', 'm01', Date.now())
  screen = 'adventure'
  const lead = save.active
  if (lead && save.mons[lead]) save.mons[lead].lvl = 25
  if (kind === 'karte') {
    const water = `a${save.nextId}`
    save.nextId += 1
    save.mons[water] = { species: 'm02', lvl: 25, exp: 0, hp: null, shiny: false, caughtAt: 1, caughtWhere: 'r1c1', keepDupes: false }
    save.team.push(water)
  }
  save.settings.speed = 1
  render()
  const foeName = document.getElementById('foe-name')
  if (foeName) setActorName(foeName, 'Tropfmolch')
  const foeImg = document.getElementById('foe-sprite')
  if (foeImg instanceof HTMLImageElement) {
    foeImg.hidden = false
    foeImg.src = monsterArt('m02', true)
  }
  const foeHp = document.getElementById('foe-hp')
  if (foeHp) foeHp.style.width = '70%'
  paintUlt('ally-ult', kind === 'konter' ? 2 : 0, true)
  paintUlt('foe-ult', 0, false)
  if (kind === 'konter') {
    const label = document.getElementById('konter-label')
    if (label) label.hidden = false
  }
  document.getElementById('battle')?.setAttribute('data-fx', 'hold')
}

function showK5Demo(part: string | null): void {
  const kind = part === 'tooltip' ? 'tooltip' : part === 'before' ? 'before' : 'status'
  save = beginAdventure('Ada', 'A', 'm01', Date.now())
  screen = 'adventure'
  const uid = save.active
  if (uid && save.mons[uid]) save.mons[uid].lvl = 25
  save.settings.speed = 1
  render()
  const foeName = document.getElementById('foe-name')
  if (foeName) setActorName(foeName, 'Tropfmolch')
  const foeImg = document.getElementById('foe-sprite')
  if (foeImg instanceof HTMLImageElement) {
    foeImg.hidden = false
    foeImg.src = monsterArt('m02', true)
  }
  const foeHp = document.getElementById('foe-hp')
  if (foeHp) foeHp.style.width = '72%'
  const allyHp = document.getElementById('ally-hp')
  if (allyHp) allyHp.style.width = '64%'
  paintUlt('ally-ult', 3, true)
  paintUlt('foe-ult', 2, true)
  if (kind !== 'before') {
    paintMark('ally-status', 'naesse', 1)
    paintMark('foe-status', 'brand', 1)
  }
  if (kind === 'tooltip') {
    const tip = document.getElementById('ally-tip')
    const button = document.getElementById('ally-status')
    if (tip && button) {
      tip.hidden = false
      tip.textContent = button.dataset.tip ?? ''
    }
  }
  document.getElementById('battle')?.setAttribute('data-fx', 'hold')
}

function showK4Demo(part: string | null): void {
  const kind = part === 'ult' || part === 'gesperrt' ? part : 'leiste'
  const locked = kind === 'gesperrt'
  paint(`<div id="stage" class="fx-demo"><div class="anchor anchor-mid"><div class="battle" id="battle" data-fx="live" style="height:980px">
    <div class="battle-world" id="battle-world">
      <div id="battle-fx"></div>
      <div class="combatant foe" id="foe-actor" style="left:72%;top:58%"><b>Ziel</b><div class="hp"><span style="width:80%"></span></div><div class="ult" id="foe-ult" data-n="3"></div><img class="sprite" src="${monsterArt('m66', true)}" alt=""/></div>
      <div class="combatant ally" id="ally-actor" style="left:28%;top:72%"><b>Funkfuchs</b><div class="hp"><span style="width:70%"></span></div><div class="ult ${locked ? 'is-locked' : 'is-ready'}" id="ally-ult" data-n="${locked ? 0 : 5}"></div><img class="sprite" src="${monsterArt('m01', true)}" alt=""/></div>
      <div class="move-banner" id="move-banner" hidden></div>
    </div>
  </div></div></div>`)
  const mark = () => document.getElementById('battle')?.setAttribute('data-fx', 'hold')
  if (kind !== 'ult') {
    mark()
    return
  }
  const host = document.getElementById('battle-fx')
  if (host) mountBattleFx(host)
  preloadBattleStrips(['fire'], () => onBattleFxReady(() => {
    const fx = document.getElementById('battle-fx')
    const ally = document.getElementById('ally-actor')
    const foe = document.getElementById('foe-actor')
    if (!fx || !ally || !foe) return
    const banner = document.getElementById('move-banner')
    if (banner) {
      ally.appendChild(banner)
      banner.hidden = false
      banner.textContent = 'Durchschlag'
    }
    const from = stagePoint(ally, fx)
    const to = stagePoint(foe, fx)
    const head = numberPoint(foe, fx)
    playBattleFx({ type: 'fire', crit: true, band: 'strong', awaken: true, shimmer: false, reduced: false, tempo: 1, from, to, ult: true })
    showHitNumber(head.x, head.y, 86, 'crit', numberHoldMs(1))
    window.setTimeout(mark, 160)
  }))
}

function arrowTag(type: TypeId, weather: 'regen'): string {
  const arrow = weatherArrow(weather, type)
  if (!arrow) return ''
  return `<img class="wx-arrow" src="${art(arrow === 'up' ? 'battle/stat_up.png' : 'battle/stat_down.png')}" alt=""/>`
}

function showK3Demo(part: string | null): void {
  const kind = part === 'ko' || part === 'sieg' || part === 'intro' ? part : 'wetter'
  const allyType = species('m01').type
  const foeType = species('m66').type
  const marks = teamWeatherMarks([allyType], 'regen')
  paint(`<div id="stage" class="fx-demo"><div class="anchor anchor-mid"><div class="battle" id="battle" data-fx="live" style="height:980px">
    <div class="battle-world" id="battle-world">
      <div id="battle-fx"></div>
      <div class="wx-stack">
        <div class="wx-chip" id="wx-chip"><img src="${art('battle/weather_icon_regen.png')}" alt=""/> Regen · Wasser +15 % · Feuer −15 %</div>
        <p class="wx-preview">Jetzt: Regen. Dein Team: ${marks.up} ▲, ${marks.down} ▼</p>
      </div>
      <div class="combatant foe" id="foe-actor" style="left:72%;top:58%"><b>Ziel ${arrowTag(foeType, 'regen')}</b><img class="sprite" src="${monsterArt('m66', true)}" alt=""/></div>
      <div class="combatant ally" id="ally-actor" style="left:28%;top:72%"><b>Funkfuchs ${arrowTag(allyType, 'regen')}</b><img class="sprite" src="${monsterArt('m01', true)}" alt=""/></div>
      <div class="name-banner" id="name-banner" hidden>Funkfuchs</div>
      <div class="boss-intro" id="boss-intro" hidden></div>
      <button type="button" class="victory" id="victory" hidden></button>
      <img class="crest-fly" id="crest-fly" alt="" hidden/>
    </div>
  </div></div></div>`)
  const host = document.getElementById('battle-fx')
  if (host) mountBattleFx(host)
  const mark = () => document.getElementById('battle')?.setAttribute('data-fx', 'hold')
  if (kind === 'intro') {
    const intro = document.getElementById('boss-intro')
    if (intro) {
      intro.hidden = false
      intro.innerHTML = `<img src="${monsterArt('m66', true)}" alt=""/><b>Mira</b><span>Wächterin</span>`
    }
    mark()
    return
  }
  if (kind === 'sieg') {
    const world = document.getElementById('battle-world')
    world?.classList.add('is-zoom')
    const banner = document.getElementById('victory')
    if (banner) {
      banner.hidden = false
      banner.textContent = 'Sieg · +48 G · +96 EP'
    }
    const crest = document.getElementById('crest-fly')
    if (crest instanceof HTMLImageElement) {
      crest.hidden = false
      crest.src = art('ui/achieve.webp')
    }
    onBattleFxReady(() => {
      beginBattleMood('regen', false, 1)
      showBattleConfetti(REGION_TINT[1])
      window.setTimeout(mark, 420)
    })
    return
  }
  if (kind === 'ko') {
    const foe = document.getElementById('foe-actor')
    if (foe) {
      const pose = koPose(1)
      foe.style.transform = `translate(-50%, -100%) translate(0px, ${pose.drop}px) rotate(${pose.rotate}deg) scale(0.72)`
      const picture = foe.querySelector('img')
      if (picture instanceof HTMLImageElement) picture.style.filter = 'brightness(2.4)'
    }
    onBattleFxReady(() => {
      const fx = document.getElementById('battle-fx')
      const foe = document.getElementById('foe-actor')
      if (fx && foe) {
        const at = stagePoint(foe, fx)
        showBattleDissolve(at.x, at.y - 40, parseInt(typeColor('fire').slice(1), 16))
      }
      window.setTimeout(mark, 420)
    })
    return
  }
  onBattleFxReady(() => {
    beginBattleMood('regen', false, 1)
    window.setTimeout(mark, 280)
  })
}

function showShopDemo(kind: 'shop' | 'shop-poor' | 'shop-ask'): void {
  save = beginAdventure('Ada', 'A', 'm01', Date.now())
  screen = 'shop'
  shopTab = 'chests'
  save.region = 1
  save.chestDay = new Date().toISOString().slice(0, 10)
  save.chestBought = { kiesel: 2, silber: 0 }
  if (kind === 'shop-poor') {
    save.gold = 700
    save.marks = 0
  } else {
    save.gold = 20_000
    save.marks = 400
  }
  if (kind === 'shop-ask') overlay = { kind: 'shop-confirm', offerId: 'chest-silber' }
  render()
  document.getElementById('stage')?.setAttribute('data-fx', 'hold')
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
      grant: { speciesId: 'm33', rarity: 7, isNew: true, gold: 400, name: 'Bergtitan', place: 'team', pity: 0 }
    }
  }
  render()
  document.getElementById('stage')?.setAttribute('data-fx', 'hold')
}

function performShopBuy(row: { act: string; dataId: string }): string | null {
  if (!save) return 'Unbekannt.'
  if (row.act === 'chest-buy') return buyChestForGold(save, row.dataId === 'silber' ? 'silber' : 'kiesel', Date.now())
  if (row.act === 'chest-marks') return buyChestForMarks(save, row.dataId === 'sternen' ? 'sternen' : 'gold')
  if (row.act === 'buy-crystal') return buyCrystal(save, row.dataId as 's')
  if (row.act === 'buy-fruit') return buyFruit(save, row.dataId as 'fang')
  if (row.act === 'buy-prize') return buyPrize(save, row.dataId, Date.now())
  return 'Unbekannt.'
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
  }, { mapOpen, moreOpen, pcScroll, filtersOpen, dexOpen, shopTab, shopHint: Date.now() < shopFlashUntil }))
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
  bankRoad(save, Math.max(0, now - (save.roadAt || now)))
  save.roadAt = now
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
    window.clearTimeout(impactTimer)
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    if (outcome.win && outcome.traces.length) {
      showVictory(outcome, speed, reduced, regionTint(save?.region ?? 1), outcome.badge, () => {
        clearBattleFx()
        finish()
      })
      return
    }
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
  const weather = weatherAt(Date.now())
  if (fxHost) {
    mountBattleFx(fxHost)
    preloadBattleStrips(fightTypes(outcome))
  }
  const battery = Boolean(save?.settings.battery)
  setFxRunning(true, battery ? BATTERY_FPS : 60)
  const reduced = Boolean(save?.settings.reduceMotion)
  if (fxHost) onBattleFxReady(() => beginBattleMood(weather, reduced, speed))
  const allowFlash = Boolean(save?.settings.flashes) && !reduced
  let shakeStart = 0
  let shakeFor = 0
  let shakePx = 0
  const catching = Boolean(outcome.catch)
  const battleEnd = catching ? dur * 0.54 : dur
  let prevAlly: number | null = null
  let prevFoe: number | null = null
  let hitAt = -1
  let drawnAt = 0
  let impactTimer = 0
  let allySeen = ''
  let enterAt = -1
  let dissolved = ''
  let konterFor = ''
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
          const hit = shot.hits.find((row) => row.ult) ?? shot.hits.find((row) => row.kind === 'hit') ?? shot.hits[0]
          if (hit && fxHost && allyActor && foeActor) {
            const allyPt = stagePoint(allyActor, fxHost)
            const foePt = stagePoint(foeActor, fxHost)
            const from = hit.from === 'ally' ? allyPt : foePt
            const to = hit.from === 'ally' ? foePt : allyPt
            playBattleFx({ type: hit.type, crit: hit.crit, band: hit.band, awaken: Boolean(hit.awaken), shimmer: Boolean(outcome.shiny), reduced, tempo: speed, from, to, kind: hit.kind, ult: Boolean(hit.ult) })
            const attackerId = hit.from === 'ally' ? shot.allySpecies : shot.foeSpecies
            const struck = hit.from === 'ally' ? foeActor : allyActor
            const travel = hit.kind === 'hit' ? effectTiming(hit.type, speed).travelMs : 0
              if (hit.kind === 'hit' || hit.ult) showMove(hit.ult ? ultName(hit.ult) : attackTitle(attackerId, hit.type), hit.from === 'ally' ? allyActor : foeActor, k)
            window.clearTimeout(impactTimer)
            impactTimer = window.setTimeout(() => {
              if (gen !== playGen || !hit) return
              if (hit.kind === 'hit') {
                const grade = hitGrade(hit.band, hit.crit)
                const hold = numberHoldMs(speed)
                const above = numberPoint(struck, fxHost)
                const shown = showHitNumber(above.x, above.y, hit.amount, grade, hold, hit.weather ?? 1)
                if (!shown) spawnFloat(floats, hit, typeFx(hit.type).base, hit.from === 'ally' ? '70%' : '30%', hold)
                struck.classList.remove('recoil')
                void struck.offsetWidth
                struck.classList.add('recoil')
                const picture = struck.querySelector('img')
                if (picture instanceof HTMLImageElement) picture.style.animationDuration = `${RECOIL_MS * k}ms`
              }
              if (save?.settings.shake && hit.kind === 'hit') {
                const spec = hit.ult ? bossUltShake({ speed, reduced }) : cameraShake(hitGrade(hit.band, hit.crit), 'hit', { speed, reduced })
                shakeStart = performance.now() - started
                shakeFor = spec.ms
                shakePx = spec.px
              }
              if (allowFlash && hit.crit && critFlash) critFlash.style.opacity = '0.15'
            }, travel)
          }
        } else if (critFlash && elapsed - hitAt > 50 * k) critFlash.style.opacity = '0'
        prevAlly = shot.allyHp
        prevFoe = shot.foeHp
      }
      const hit = shot?.hits.find((row) => row.ult) ?? shot?.hits.find((row) => row.kind === 'hit')
      const hitstop = hit ? (hit.ult ? bossUltHitstop({ speed, reduced }) : hitstopMs(hitGrade(hit.band, hit.crit), 'hit', { speed, reduced })) : 0
      const age = hitAt < 0 ? -1 : elapsed - hitAt
      const travel = hit ? effectTiming(hit.type, speed).travelMs : 0
      const sinceImpact = age < 0 ? -1 : age - travel
      const pose = age < 0 ? -1 : sinceImpact < 0 ? age / k : sinceImpact < hitstop ? travel / k : (age - hitstop) / k
      const hitAge = sinceImpact < 0 ? -1 : sinceImpact < hitstop ? 0 : (sinceImpact - hitstop) / k
      const reach = allyActor && foeActor ? reachDistance(allyActor, foeActor, hit?.type === 'fighting' ? 0.88 : 0.76) : 160
      const allyMove = hit?.from === 'ally' ? pose : -1
      const foeMove = hit?.from === 'foe' ? pose : -1
      const allyHit = hit?.from === 'foe' ? hitAge : -1
      const foeHit = hit?.from === 'ally' ? hitAge : -1
      const allyKo = shot?.allyHp === 0 ? Math.min(1, Math.max(0, age) / 200) : 0
      const foeKo = shot?.foeHp === 0 ? Math.min(1, Math.max(0, age) / 200) : 0
      if (shot && shot.allySpecies !== allySeen) {
        allySeen = shot.allySpecies
        enterAt = elapsed
        const banner = document.getElementById('name-banner')
        if (banner) {
          banner.hidden = false
          banner.textContent = shot.allyName
          window.setTimeout(() => { banner.hidden = true }, 800 / Math.max(1, speed))
        }
      }
      const enter = enterAt < 0 ? 0 : Math.max(0, 1 - (elapsed - enterAt) / (300 / Math.max(1, speed)))
      if (allyActor) {
        allyActor.style.transform = `${actorTransform('ally', allyMove, allyHit, allyKo, elapsed, reach)} translate(${(-240 * enter).toFixed(1)}px, 0px)`
        allyActor.style.opacity = String(koPose(allyKo).opacity)
      }
      paintWeatherArrow('ally-arrow', shot ? species(shot.allySpecies).type : null, weather)
      paintWeatherArrow('foe-arrow', shot ? species(shot.foeSpecies).type : null, weather)
      paintUlt('ally-ult', shot?.allyUlt ?? 0, shot?.allyUltOpen ?? false)
      paintUlt('foe-ult', shot?.foeUlt ?? 0, shot?.foeUltOpen ?? false)
      paintMark('ally-status', shot?.allyMark ?? null, shot?.allyStacks ?? 0)
      paintMark('foe-status', shot?.foeMark ?? null, shot?.foeStacks ?? 0)
      const konter = document.getElementById('konter-label')
      if (konter && shot?.counter && konterFor !== shot.allySpecies) {
        konterFor = shot.allySpecies
        konter.hidden = false
        window.setTimeout(() => { konter.hidden = true }, 800)
      }
      if (foeKo >= 1 && shot && dissolved !== `foe-${shot.foeSpecies}` && fxHost && foeActor) {
        dissolved = `foe-${shot.foeSpecies}`
        const at = stagePoint(foeActor, fxHost)
        showBattleDissolve(at.x, at.y - 40, parseInt(typeColor(species(shot.foeSpecies).type).slice(1), 16))
        const picture = foeActor.querySelector('img')
        if (picture instanceof HTMLImageElement) picture.style.filter = 'brightness(2.4)'
      }
      if (foeActor) {
        foeActor.style.transform = actorTransform('foe', foeMove, foeHit, foeKo, elapsed + 180, reach)
        foeActor.style.opacity = String(koPose(foeKo).opacity)
      }
      const world = document.getElementById('battle-world')
      const shakeAge = elapsed - shakeStart
      if (world) {
        if (shakeFor > 0 && shakeAge >= 0 && shakeAge < shakeFor) {
          const damp = 1 - shakeAge / shakeFor
          const x = Math.sin(shakeAge / 18) * shakePx * damp
          world.style.transform = `translate(${x.toFixed(2)}px, ${(x * 0.35).toFixed(2)}px)`
        } else if (world.style.transform) world.style.transform = ''
      }
      const layers = parallaxShift(pose > 0 ? lungeOffset(pose, reach) : 0, 0)
      const far = document.getElementById('parallax-far')
      const mid = document.getElementById('parallax-mid')
      const near = document.getElementById('parallax-near')
      if (far) far.style.transform = `translateX(${layers.far}px)`
      if (mid) mid.style.transform = `translateX(${layers.mid}px)`
      if (near) near.style.transform = `translateX(${layers.near}px)`
      if (text && shot && elapsed < battleEnd) text.textContent = shot.text
      if (allyName && shot) setActorName(allyName, shot.allyName)
      if (foeName && shot) setActorName(foeName, outcome.shiny ? `${shot.foeName} · ${t(save?.settings.lang, 'battle.shimmer')}` : shot.foeName)
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
  const run = () => { raf = requestAnimationFrame(frame) }
  if (outcome.boss?.species) showBossIntro(outcome.boss, run)
  else run()
}

const floatPool: HTMLDivElement[] = []

function regionTint(region: number): number {
  return REGION_TINT[region] ?? REGION_TINT[1]
}

function setActorName(node: HTMLElement, name: string): void {
  const arrow = node.querySelector('img')
  node.textContent = name
  if (arrow) node.appendChild(arrow)
}

function paintMark(id: string, mark: string | null, stacks: number): void {
  const node = document.getElementById(id)
  if (!(node instanceof HTMLButtonElement)) return
  if (!mark || !(mark in AILMENTS)) {
    node.hidden = true
    return
  }
  const spec = AILMENTS[mark as AilmentId]
  node.hidden = false
  const img = node.querySelector('img')
  if (img instanceof HTMLImageElement) {
    img.src = art(ailmentIcon(spec.id))
    img.alt = spec.name
  }
  const piles = spec.id === 'giftnebel' && stacks > 1 ? ` Stapel ${stacks}.` : ''
  node.dataset.tip = `${spec.tip}${piles}`
}

function paintUlt(id: string, n: number, open: boolean): void {
  const node = document.getElementById(id)
  if (!node) return
  node.hidden = false
  node.dataset.n = String(Math.max(0, Math.min(5, Math.floor(n))))
  node.classList.toggle('is-ready', open && n >= 5)
  node.classList.toggle('is-locked', !open)
}

function paintWeatherArrow(id: string, type: TypeId | null, weather: ReturnType<typeof weatherAt>): void {
  const node = document.getElementById(id)
  if (!(node instanceof HTMLImageElement) || !type) return
  const arrow = weatherArrow(weather, type)
  if (!arrow) {
    node.hidden = true
    return
  }
  node.hidden = false
  node.src = art(arrow === 'up' ? 'battle/stat_up.png' : 'battle/stat_down.png')
}

function showBossIntro(boss: { name: string; title: string; species: string }, done: () => void): void {
  const intro = document.getElementById('boss-intro')
  if (!intro) {
    done()
    return
  }
  intro.hidden = false
  intro.innerHTML = `<img src="${monsterArt(boss.species, true)}" alt=""/><b>${boss.name}</b><span>${boss.title}</span>`
  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    intro.hidden = true
    intro.onclick = null
    done()
  }
  intro.onclick = close
  window.setTimeout(close, 1000)
}

function showVictory(outcome: EncounterOutcome, speed: Speed, reduced: boolean, tint: number, badge: string | null, done: () => void): void {
  const world = document.getElementById('battle-world')
  world?.classList.add('is-zoom')
  const banner = document.getElementById('victory')
  if (banner) {
    banner.hidden = false
    banner.textContent = `Sieg · +${outcome.gold} G · +${outcome.exp} EP`
  }
  if (!reduced && speed < 3) showBattleConfetti(tint)
  const crest = document.getElementById('crest-fly')
  if (badge && crest instanceof HTMLImageElement) {
    crest.hidden = false
    crest.src = art('ui/achieve.webp')
    crest.animate([{ transform: 'translate(-50%, 0)' }, { transform: 'translate(-50%, -280px) scale(0.6)' }], { duration: 900, easing: 'ease-in' })
  }
  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    world?.classList.remove('is-zoom')
    if (banner) banner.hidden = true
    if (crest) crest.hidden = true
    done()
  }
  if (banner) banner.onclick = close
  window.setTimeout(close, 1200 / Math.max(1, speed))
}

function fightTypes(outcome: EncounterOutcome): TypeId[] {
  const found = new Set<TypeId>()
  for (const trace of outcome.traces) {
    try { found.add(species(trace.allySpecies).type) } catch { /* skip a missing species */ }
    try { found.add(species(trace.foeSpecies).type) } catch { /* skip a missing species */ }
    for (const frame of trace.frames) {
      for (const hit of frame.hits ?? []) found.add(hit.type)
    }
  }
  return [...found]
}

function numberPoint(actor: HTMLElement, host: HTMLElement): { x: number; y: number } {
  const pt = stagePoint(actor, host)
  const img = actor.querySelector('img')
  if (!(img instanceof HTMLElement)) return { x: pt.x, y: pt.y - 220 }
  const box = img.getBoundingClientRect()
  const frame = host.getBoundingClientRect()
  const width = host.clientWidth || frame.width || 1
  const height = host.clientHeight || frame.height || 1
  const top = ((box.top - frame.top) / (frame.height || 1)) * height
  // The label sits about 200px above this point. Keep it above the name and off the HP bar.
  const side = pt.x > width / 2 ? 1 : -1
  return { x: pt.x + side * 78, y: Math.max(170, top - 150) }
}

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

function spawnFloat(host: HTMLElement | null, hit: { amount: number; crit: boolean; band: 'strong' | 'weak' | 'neutral'; awaken?: boolean }, base: string, left = '68%', holdMs = numberHoldMs(1)): void {
  if (!host || hit.amount <= 0) return
  let node = floatPool.find((row) => row.hidden)
  if (!node) {
    node = floatPool.length >= 8 ? floatPool[0] : document.createElement('div')
    if (!floatPool.includes(node)) floatPool.push(node)
    node.className = 'float-num'
  }
  if (node.parentElement !== host) host.appendChild(node)
  const style = numberStyle(hit.band, hit.crit, Boolean(hit.awaken), base)
  const label = style.label
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
  bankRoad(save, counted)
  save.roadAt = Date.now()
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
  if (act === 'status') {
    if (save && save.settings.speed !== 1) return
    const who = node.getAttribute('data-who') === 'foe' ? 'foe' : 'ally'
    const tip = document.getElementById(`${who}-tip`)
    if (!(tip instanceof HTMLElement)) return
    tip.hidden = !tip.hidden
    tip.textContent = node.getAttribute('data-tip') ?? ''
    return
  }
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
  if (act === 'wallet') {
    const id = node.getAttribute('data-id')
    overlay = { kind: 'wallet', id: id === 'marks' ? 'marks' : 'gold' }
    render()
    return
  }
  if (act === 'shop-tab') {
    const id = node.getAttribute('data-id')
    if (id === 'chests' || id === 'boost' || id === 'marks') shopTab = id
    render()
    return
  }
  if (act === 'shop-info') {
    overlay = { kind: 'shop-info', offerId: node.getAttribute('data-id') ?? '' }
    render()
    return
  }
  if (act === 'shop-blocked') {
    node.classList.remove('shop-shake')
    void (node as HTMLElement).offsetWidth
    node.classList.add('shop-shake')
    return
  }
  if (act === 'shop-buy' || act === 'shop-yes') {
    const id = node.getAttribute('data-id') ?? ''
    const row = shopOffer(save, Date.now(), id)
    if (!row || !row.canBuy) return
    const balance = row.pay === 'gold' ? save.gold : save.marks
    if (act === 'shop-buy' && needsConfirm(row.price, balance, row.pay)) {
      overlay = { kind: 'shop-confirm', offerId: row.id }
      render()
      return
    }
    const reason = performShopBuy(row)
    overlay = null
    if (!reason) sfx('coin')
    if (!reason && (row.act === 'chest-buy' || row.act === 'chest-marks')) {
      shopFlashUntil = Date.now() + 3000
      window.setTimeout(() => { if (screen === 'shop') render() }, 3100)
    }
    save.log.push({ t: Date.now(), text: reason ?? t(save.settings.lang, 'shop.bought', { name: row.name }) })
    if (save.log.length > 50) save.log.splice(0, save.log.length - 50)
    try { writeSave(localStorage, save) } catch { /* ignore */ }
    render()
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
      const uid = target instanceof HTMLSelectElement && target.value ? target.value : (save.active ?? save.team[0] ?? '')
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
  if (act === 'chest-claim') {
    claimRoad(save)
    try { writeSave(localStorage, save) } catch { /* ignore */ }
    render()
    return
  }
  if (act === 'chest-buy') {
    const tier = node.getAttribute('data-tier') === 'silber' ? 'silber' : 'kiesel'
    const reason = buyChestForGold(save, tier, Date.now())
    if (reason) save.log.push({ t: Date.now(), text: reason })
    try { writeSave(localStorage, save) } catch { /* ignore */ }
    render()
    return
  }
  if (act === 'chest-marks') {
    const tier = node.getAttribute('data-tier') === 'sternen' ? 'sternen' : 'gold'
    const reason = buyChestForMarks(save, tier)
    if (reason) save.log.push({ t: Date.now(), text: reason })
    try { writeSave(localStorage, save) } catch { /* ignore */ }
    render()
    return
  }
  if (act === 'melt') {
    const reason = meltDuplicate(save, node.getAttribute('data-uid') ?? '')
    if (reason) save.log.push({ t: Date.now(), text: reason })
    try { writeSave(localStorage, save) } catch { /* ignore */ }
    render()
    return
  }
  if (act === 'craft') {
    const reason = craftSpecies(save, node.getAttribute('data-id') ?? '', Date.now())
    if (reason) save.log.push({ t: Date.now(), text: reason })
    try { writeSave(localStorage, save) } catch { /* ignore */ }
    render()
    return
  }
  if (act === 'star') {
    const reason = raiseStar(save, node.getAttribute('data-id') ?? '')
    if (reason) save.log.push({ t: Date.now(), text: reason })
    try { writeSave(localStorage, save) } catch { /* ignore */ }
    render()
    return
  }
  if (act === 'debug-stars' && debug) {
    debugStarChests(save)
    try { writeSave(localStorage, save) } catch { /* ignore */ }
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
  const onShop = Boolean(target?.closest('.shop-screen'))
  gesture = { x: event.clientX, y: event.clientY, t: performance.now(), block, shop: onShop }
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
  const dir = start ? swipeDirection(event.clientX - start.x, event.clientY - start.y, fitScale(window.innerWidth, window.innerHeight)) : 0
  if (save && start?.shop && !start.block && !overlay && dir !== 0) {
    const order = ['chests', 'boost', 'marks'] as const
    const index = order.indexOf(shopTab)
    const next = index + dir
    if (next >= 0 && next < order.length) {
      ignoreClick = true
      shopTab = order[next]
      render()
    }
    return
  }
  if (!save || !start || start.block || overlay || moreOpen || mapOpen || !save.settings.swipeTabs) return
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
