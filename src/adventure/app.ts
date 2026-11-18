import './adventure.css'
import {
  AUTOSAVE_MS,
  BASE_ENCOUNTER_MS,
  CAUGHT_SCALE,
  OFFLINE_BLOCK,
  OFFLINE_CAP_MS,
  SAVE_BACKUP,
  SAVE_KEY_V2,
  SEAL_BLEND,
  SEAL_FLAT_Y,
  SEAL_SCALE_IN_MS,
  SEAL_SPIN_MS,
  WELCOME_AFTER_MS,
  STARTERS,
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
import { activeCombos, AURA_FRAMES, AURA_MS } from './combo'
import { mechIcon, type MechId } from './mech'
import { AILMENTS, ailmentIcon, type AilmentId } from './ailment'
import { sfx } from '../ui'
import { actorTransform, clampShift, hitShake, koPose, lungeOffset, numberStyle, parallaxShift } from '../battle/stage'
import { bossUltHitstop, bossUltShake, cameraShake, hitGrade, hitstopMs, numberHoldMs } from '../battle/hitReadout'
import { beginBattleMood, clearBattleFx, holdBattleFx, mountBattleFx, onBattleFxReady, playBattleFx, preloadBattleStrips, setFxRunning, showBattleConfetti, showBattleDissolve, showHitNumber } from '../battle/phaserFx'
import { effectTiming, battleStripTypes } from '../battle/strips'
import { BANNER_MS, LUNGE_OUT_MS, moveLabel, RECOIL_MS, typeFx } from '../battle/typeFx'
import type { TypeId } from '../types'
import { takeChests } from './chests'
import { bankRoad, buyChestForGold, buyChestForMarks, claimRoad, craftSpecies, debugStarChests, meltDuplicate, raiseStar } from './sources'
import { chestAnimMs, type ChestTier } from './lootbox'
import { needsConfirm, shopOffer } from './shopOffer'
import { chooseLook, paintLooks } from './avatar'
import { nameProblem, pickLook, pickName } from './home'
import { inspectSave, nextDoor, resumeSave, type Door } from './continue'
import { FIRST_ENTRANCE_MS, HOME_ASSETS, loadFraction, mountHomeParticles } from './homeBoot'
import { beginAdventure, loadAdventure, writeSave } from './save'
import { browserCloudApi, watchAuth } from './cloud/supabaseApi'
import { callOnline, clearVelunorKeys, loadOwnLabel, sendBlockRow, sendReportRow } from './online/calls'
import { saveOwesCatchUp } from './online/check'
import { nameIssue } from './online/name'
import { createCloud, type CloudController } from './cloud/session'
import type { CloudView } from './cloud/types'
import { CONSENT_KEY, DEVICE_KEY, QUEUE_KEY, REPLACE_SERVER_KEY, RESET_SERVER_KEY } from './cloud/config'
import { isEventName, type AnalyticsEvent, type Consent } from './cloud/analytics'
import { eventsForEncounter, eventsForLoot, starEvent, teamProfile } from './cloud/playEvents'
import { equipFrame, equipTitle, syncAchievements } from './achievements'
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
import { pullMasteryUps, settleOfflineMastery, type MasteryUp } from './mastery'
import type { AvatarLook, SaveV2 } from './types'
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
  brokenHtml,
  cloudLayerHtml,
  continueHtml,
  loadingHtml,
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
let draftName = ''
let draftLook: AvatarLook = { skin: 0, hair: 0, color: 0 }
let draftPick = ''
let draftStep: 'name' | 'starter' = 'name'
let draftLangOpen = false
let homeReady = false
let door: Door = 'create'
let keptSave: SaveV2 | null = null
let doorBackup = false
let draftLang: Lang = 'de'
let cloud: CloudController | null = null
let cloudReady = false
let cloudLanded = false
let cloudReplaced = false
let tutorialNoted = 0
let cloudView: CloudView = {
  status: 'offline',
  consent: 'unset',
  email: '',
  notice: '',
  askConsent: false,
  conflict: null
}
let accountUi = {
  flagLevel: (Number(localStorage.getItem('velunor_flag')) === 2 ? 2 : Number(localStorage.getItem('velunor_flag')) === 1 ? 1 : 0) as 0 | 1 | 2,
  playerLabel: localStorage.getItem('velunor_player_label') ?? '',
  nameError: '',
  nameOpen: false,
  reportOpen: false,
  deleteStep: 0 as 0 | 1 | 2,
  onlineDown: false,
  statusNote: ''
}
let catchingUp = false
let masteryNote = ''
let masteryUntil = 0
let saveReady = false
let wipingAccount = false

function mergedCloud(): CloudView {
  return {
    ...cloudView,
    flagLevel: accountUi.flagLevel,
    playerLabel: accountUi.playerLabel,
    nameError: accountUi.nameError,
    nameOpen: accountUi.nameOpen,
    reportOpen: accountUi.reportOpen,
    deleteStep: accountUi.deleteStep,
    onlineDown: accountUi.onlineDown,
    statusNote: accountUi.statusNote
  }
}

function cloudInputBusy(): boolean {
  const active = document.activeElement
  return active instanceof HTMLInputElement && Boolean(active.closest('#cloud-layer, .cloud-card'))
}
let lastInput = Date.now()
let timer = 0
let animating = false
let lastTick = 0
let holdCounter = false
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

function readConsent(): Consent {
  const value = localStorage.getItem(CONSENT_KEY)
  return value === 'yes' || value === 'no' ? value : 'unset'
}

function readQueue(): AnalyticsEvent[] {
  try {
    const raw = JSON.parse(localStorage.getItem(QUEUE_KEY) ?? '[]') as AnalyticsEvent[]
    if (!Array.isArray(raw)) return []
    return raw.filter((event) => Boolean(event) && isEventName(event.event) && event.props && typeof event.props === 'object')
  } catch {
    return []
  }
}

function deviceId(): string {
  const current = localStorage.getItem(DEVICE_KEY)
  if (current && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(current)) return current
  const id = crypto.randomUUID()
  localStorage.setItem(DEVICE_KEY, id)
  return id
}

function activeLang(): Lang {
  if (save?.settings.lang === 'en' || keptSave?.settings.lang === 'en') return 'en'
  if (save || keptSave) return 'de'
  return draftLang
}

function cloudBlocks(): boolean {
  return cloudView.askConsent || cloudView.conflict !== null
}

function noteTutorial(step: number): void {
  if (step <= tutorialNoted) return
  tutorialNoted = step
  cloud?.track('tutorial_step', { step })
}

function mountCloudLayer(): void {
  document.getElementById('cloud-layer')?.remove()
  if (!cloudReady) return
  const host = document.getElementById('fit')
  if (!host) return
  const html = cloudLayerHtml(mergedCloud(), activeLang())
  if (html) host.insertAdjacentHTML('beforeend', html)
}

function paintCloudChip(): void {
  const chip = document.querySelector('.cloud-chip')
  if (chip instanceof HTMLElement) {
    chip.setAttribute('data-cloud', cloudView.status)
    const key = cloudView.status === 'online' ? 'cloud.online' : cloudView.status === 'sync' ? 'cloud.sync' : 'cloud.offline'
    chip.setAttribute('aria-label', t(activeLang(), key))
  }
  const mark = document.querySelector('.cloud-mark')
  if (mark instanceof HTMLElement) mark.setAttribute('data-cloud', cloudView.status)
}

function refreshCloud(): void {
  if (!cloudReady) return
  if (cloudLanded && !save?.started) {
    cloudLanded = false
    showDoor(nextDoor('create', 'open-ready'))
    return
  }
  paintCloudChip()
  if (cloudInputBusy()) return
  if (cloudReplaced && save && !animating) {
    cloudReplaced = false
    render()
    return
  }
  if (save && screen === 'options' && !animating) {
    render()
    return
  }
  mountCloudLayer()
}

function trackedEncounter(now: number, trace: boolean): EncounterOutcome {
  if (!save) throw new Error('no save')
  const region = save.region
  const chapter = save.chapter
  const before = { ...save.shards }
  const profile = teamProfile(save)
  const outcome = resolveEncounter(save, now, { offline: false, trace })
  for (const event of eventsForEncounter({
    outcome,
    region,
    chapter,
    teamLevel: profile.teamLevel,
    rarityAvg: profile.rarityAvg,
    shardsBefore: before,
    shardsAfter: save.shards
  })) cloud?.track(event.event, event.props)
  return outcome
}

function attachCloud(): void {
  const consent = readConsent()
  cloudView = { ...cloudView, consent, askConsent: consent === 'unset' }
  const existing = loadAdventure(localStorage, Date.now())
  cloud = createCloud(browserCloudApi(), {
    now: () => Date.now(),
    online: () => navigator.onLine,
    deviceId,
    consent: readConsent,
    setConsent(value) {
      localStorage.setItem(CONSENT_KEY, value)
    },
    queue: readQueue,
    setQueue(events) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(events))
    },
    loadSave() {
      if (!saveReady || catchingUp) return null
      if (save?.started) return save
      if (keptSave?.started) return keptSave
      return null
    },
    storeSave(next) {
      const playing = Boolean(save?.started)
      try { writeSave(localStorage, next) } catch { /* the memory copy still applies */ }
      if (playing) {
        save = next
        keptSave = next
        cloudReplaced = true
        return
      }
      save = null
      keptSave = next
      cloudLanded = true
    },
    redirectTo() {
      const url = new URL(import.meta.env.BASE_URL || '/', window.location.origin)
      url.hash = ''
      url.search = ''
      return url.href
    },
    pendingReset: () => localStorage.getItem(RESET_SERVER_KEY) === '1',
    clearReset: () => { localStorage.removeItem(RESET_SERVER_KEY) },
    deferUpload: () => {
      if (!saveReady || catchingUp) return true
      const current = save?.started ? save : keptSave?.started ? keptSave : null
      return Boolean(current && saveOwesCatchUp(current.lastSeenAt, Date.now(), WELCOME_AFTER_MS))
    },
    pendingReplace: () => localStorage.getItem(REPLACE_SERVER_KEY) === '1',
    clearReplace: () => { localStorage.removeItem(REPLACE_SERVER_KEY) },
    onView(view) {
      if (wipingAccount) return
      cloudView = view
      if (view.flagLevel === 0 || view.flagLevel === 1 || view.flagLevel === 2) {
        accountUi.flagLevel = view.flagLevel
        localStorage.setItem('velunor_flag', String(view.flagLevel))
      }
      refreshCloud()
    }
  })
  const minutes = existing ? Math.max(0, Math.round((Date.now() - existing.lastSeenAt) / 60000)) : 0
  cloud.noteSession(minutes)
  watchAuth(() => { void cloud?.sync('start') })
  window.setInterval(() => { void cloud?.sync('interval') }, 5 * 60 * 1000)
  window.setInterval(() => { void cloud?.flush() }, 60 * 1000)
}

function releaseSync(): void {
  saveReady = true
  void cloud?.sync('start')
}

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
  window.addEventListener('keydown', onStarterKey)
  window.addEventListener('keydown', onDoorKey)
  const storedLang = localStorage.getItem('velunor_lang')
  draftLang = storedLang === 'en' || storedLang === 'de' ? storedLang : (navigator.language.toLowerCase().startsWith('en') ? 'en' : 'de')
  document.documentElement.lang = draftLang
  window.addEventListener('pagehide', () => {
    if (wipingAccount) {
      for (const key of clearVelunorKeys(Object.keys(localStorage))) localStorage.removeItem(key)
      return
    }
    if (!save) {
      void cloud?.pause()
      return
    }
    if (save) {
      const paused = batteryPause(save.settings.battery, currentPresence())
      if (!paused && Date.now() - lastTick < encounterMs(save.settings.speed) * 2) save.lastSeenAt = Date.now()
      writeSave(localStorage, save)
    }
    void cloud?.pause()
  })
  window.addEventListener('online', () => { void cloud?.sync('start') })
  window.addEventListener('offline', () => { cloud?.markOffline() })
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
  if (debug && fxDemo === 'k8') {
    showK8Demo(params.get('part'))
    return
  }
  if (debug && fxDemo === 'k7') {
    showK7Demo(params.get('part'))
    return
  }
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
  if (debug && fxDemo === 'boot') {
    paint(loadingHtml(0.45, t(draftLang, 'boot.hint1'), params.get('part') === 'fail', draftLang))
    return
  }
  paint(loadingHtml(0, t(draftLang, 'boot.hint1'), false, draftLang))
  attachCloud()
  void openFrontDoor()
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

function showK8Demo(part: string | null): void {
  const fight = part === 'aura'
  save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', Date.now())
  const lead = save.active
  if (lead && save.mons[lead]) save.mons[lead].lvl = 12
  const water = `a${save.nextId}`
  save.nextId += 1
  save.mons[water] = { species: 'm02', lvl: 12, exp: 0, hp: null, shiny: false, caughtAt: 1, caughtWhere: 'r1c1', keepDupes: false }
  save.team.push(water)
  save.dex.m02 = { seen: 1, caught: 1 }
  save.settings.speed = 1
  save.settings.reduceMotion = false
  if (fight) {
    challengeGuardian(save)
    void start(save)
    return
  }
  screen = 'adventure'
  render()
  document.querySelector('#foe-actor .hp')?.setAttribute('hidden', '')
  document.getElementById('foe-ult')?.setAttribute('hidden', '')
}

function showK7Demo(part: string | null): void {
  const kind = part === 'kampf' ? 'kampf' : part === 'vorschau' ? 'vorschau' : 'before'
  save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', Date.now())
  const lead = save.active
  if (lead && save.mons[lead]) save.mons[lead].lvl = kind === 'kampf' ? 12 : 25
  if (kind === 'vorschau') {
    const water = `a${save.nextId}`
    save.nextId += 1
    save.mons[water] = { species: 'm02', lvl: 25, exp: 0, hp: null, shiny: false, caughtAt: 1, caughtWhere: 'r1c1', keepDupes: false }
    save.team.push(water)
    save.dex.m02 = { seen: 1, caught: 1 }
  }
  if (kind === 'kampf' && lead && save.mons[lead]) save.mons[lead].species = 'm02'
  save.settings.speed = 1
  save.settings.reduceMotion = true
  if (kind === 'kampf') {
    challengeGuardian(save)
    void start(save)
    return
  }
  screen = 'adventure'
  render()
  document.querySelector('#foe-actor .hp')?.setAttribute('hidden', '')
  document.getElementById('foe-ult')?.setAttribute('hidden', '')
}

function showK6Demo(part: string | null): void {
  const kind = part === 'konter' ? 'konter' : part === 'karte' ? 'karte' : 'before'
  holdCounter = kind === 'konter'
  save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', Date.now())
  const lead = save.active
  if (lead && save.mons[lead]) {
    save.mons[lead].lvl = kind === 'konter' ? 5 : 25
    if (kind === 'konter') save.mons[lead].hp = 1
  }
  if (kind === 'karte' || kind === 'konter') {
    const water = `a${save.nextId}`
    save.nextId += 1
    save.mons[water] = { species: 'm02', lvl: 25, exp: 0, hp: null, shiny: false, caughtAt: 1, caughtWhere: 'r1c1', keepDupes: false }
    save.team.push(water)
    save.dex.m02 = { seen: 1, caught: 1 }
  }
  save.settings.speed = 1
  if (kind === 'konter') challengeGuardian(save)
  void start(save)
}

function showK5Demo(part: string | null): void {
  const kind = part === 'tooltip' ? 'tooltip' : part === 'before' ? 'before' : 'status'
  save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', Date.now())
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
  save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', Date.now())
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
  save = beginAdventure('Ada', { skin: 0, hair: 0, color: 0 }, 'm01', Date.now())
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

const BOOT_HINTS = ['boot.hint1', 'boot.hint2', 'boot.hint3'] as const
let bootHint = 0
let bootTimer = 0

function openFrontDoor(): Promise<void> {
  window.clearInterval(bootTimer)
  bootTimer = window.setInterval(() => {
    bootHint = (bootHint + 1) % BOOT_HINTS.length
    const node = document.getElementById('boot-hint')
    if (node) node.textContent = t(draftLang, BOOT_HINTS[bootHint])
  }, 3000)
  let done = 0
  let failed = 0
  const paintBar = () => {
    const pct = Math.round(loadFraction(done, HOME_ASSETS.length) * 100)
    const bar = document.getElementById('boot-bar')
    const track = document.querySelector('.boot-track')
    if (bar instanceof HTMLElement) bar.style.width = `${pct}%`
    if (track instanceof HTMLElement) track.setAttribute('aria-valuenow', String(pct))
  }
  return Promise.all(HOME_ASSETS.map((file) => loadHomeImage(art(file)).then(() => {
    done += 1
    paintBar()
  }, () => {
    done += 1
    failed += 1
    paintBar()
  }))).then(() => {
    window.clearInterval(bootTimer)
    if (failed >= 3) {
      paint(loadingHtml(loadFraction(Math.max(0, done - failed), HOME_ASSETS.length), t(draftLang, 'boot.fail'), true, draftLang))
    } else if (!cloudLanded) {
      const skipLegacy = localStorage.getItem(RESET_FLAG) === '1' && !localStorage.getItem(SAVE_KEY_V2)
      const gate = skipLegacy ? { kind: 'empty' as const, save: null, backup: false } : inspectSave(localStorage, Date.now())
      if (gate.kind === 'ready' && gate.save) {
        keptSave = gate.save
        showDoor(nextDoor('create', 'open-ready'))
      } else if (gate.kind === 'broken') {
        doorBackup = gate.backup
        showDoor(nextDoor('create', 'open-broken'))
      } else showOnboarding()
    }
    cloudReady = true
    refreshCloud()
    const owed = Boolean(keptSave?.started && saveOwesCatchUp(keptSave.lastSeenAt, Date.now(), WELCOME_AFTER_MS))
    if (!owed) releaseSync()
  })
}

function loadHomeImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => reject(new Error(src))
    img.src = src
  })
}

function effectsReduced(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches || Boolean(save?.settings.reduceMotion)
}

function runFirstEntrance(next: SaveV2): Promise<void> {
  return new Promise((resolve) => {
    const stage = document.getElementById('stage')
    const ally = document.getElementById('ally-actor')
    if (!stage) {
      resolve()
      return
    }
    if (ally) ally.style.opacity = '0'
    stage.classList.add('is-entering')
    const reduced = effectsReduced()
    const layer = document.createElement('button')
    layer.type = 'button'
    layer.id = 'first-in'
    layer.className = `first-in${reduced ? ' is-still' : ''}`
    const id = next.team[0] && next.mons[next.team[0]] ? next.mons[next.team[0]].species : 'm01'
    let label = id
    try { label = species(id).name } catch { /* the id is enough */ }
    layer.innerHTML = `<img src="${art(`home/starter_${id}.png`)}" alt=""><b>${label}</b>`
    layer.setAttribute('aria-label', t(next.settings.lang, 'boot.enter', { name: label }))
    stage.appendChild(layer)
    const sprite = document.getElementById('ally-sprite') ?? ally
    if (sprite) {
      const stageRect = stage.getBoundingClientRect()
      const box = sprite.getBoundingClientRect()
      const scale = stage.clientWidth > 0 ? stageRect.width / stage.clientWidth : 0
      const rawLeft = (box.left - stageRect.left) / scale
      const left = box.width > 8 ? rawLeft : rawLeft - 140
      const top = (box.top - stageRect.top) / scale
      const width = box.width > 8 ? box.width / scale : 280
      const height = box.height > 8 ? box.height / scale : 280
      if (scale > 0 && left > -40 && top > -40 && left < 1000 && top < 2200) {
        layer.style.left = `${left}px`
        layer.style.top = `${top}px`
        layer.style.width = `${width}px`
        layer.style.height = `${height}px`
        layer.style.padding = '0'
        layer.style.margin = '0'
        const img = layer.querySelector('img')
        if (img instanceof HTMLElement) {
          img.style.width = `${width}px`
          img.style.height = `${height}px`
        }
      }
    }
    let settled = false
    const finish = () => {
      if (settled) return
      settled = true
      layer.remove()
      stage.classList.remove('is-entering')
      if (ally) ally.style.opacity = ''
      resolve()
    }
    layer.addEventListener('click', finish)
    window.setTimeout(finish, reduced ? 0 : FIRST_ENTRANCE_MS)
  })
}

function showDoor(next: Door): void {
  door = next
  if (next === 'create') {
    showOnboarding()
    return
  }
  if (next === 'play' && keptSave) {
    void start(resumeSave(keptSave))
    return
  }
  const lang = keptSave?.settings.lang === 'en' ? 'en' : draftLang
  document.documentElement.lang = lang
  if (next === 'broken') paint(brokenHtml(draftLang, doorBackup))
  else if (keptSave) paint(continueHtml(keptSave, Date.now(), lang, next === 'ask'))
  else paint(brokenHtml(draftLang, doorBackup))
  if (next === 'ask') document.getElementById('overwrite-no')?.focus()
}

function showOnboarding(): void {
  door = 'create'
  save = null
  if (!homeReady) {
    homeReady = true
    draftName = pickName(draftLang, Math.random)
    draftLook = pickLook(Math.random)
  }
  document.documentElement.lang = draftLang
  noteTutorial(draftStep === 'starter' ? 2 : 1)
  paint(onboardingHtml(draftName, draftLook, draftPick, draftLang, draftStep, draftLangOpen))
  if (draftStep === 'starter') {
    bindStarterScroller()
    placeStarter(draftPick)
  }
}

let starterFx = 0

function placeStarter(id: string): void {
  const scroller = document.getElementById('starter-scroller')
  if (!scroller) return
  const card = (id ? scroller.querySelector(`[data-species="${id}"]`) : null) ?? scroller.querySelector('.starter-card')
  if (!(card instanceof HTMLElement)) return
  scroller.scrollLeft = Math.max(0, card.offsetLeft - (scroller.clientWidth - card.offsetWidth) / 2)
  const index = card.dataset.index ?? '0'
  document.querySelectorAll('.starter-dot').forEach((dot) => {
    const on = dot.getAttribute('data-index') === index
    dot.classList.toggle('on', on)
    dot.setAttribute('aria-current', on ? 'true' : 'false')
  })
}

function bindStarterScroller(): void {
  const scroller = document.getElementById('starter-scroller')
  if (!scroller) return
  scroller.addEventListener('scroll', () => {
    const cards = [...scroller.querySelectorAll('.starter-card')]
    const mid = scroller.scrollLeft + scroller.clientWidth / 2
    let best: Element | null = cards[0] ?? null
    let dist = Number.POSITIVE_INFINITY
    for (const card of cards) {
      if (!(card instanceof HTMLElement)) continue
      const delta = Math.abs(card.offsetLeft + card.offsetWidth / 2 - mid)
      if (delta < dist) {
        dist = delta
        best = card
      }
    }
    if (best instanceof HTMLElement) {
      const index = best.dataset.index ?? '0'
      document.querySelectorAll('.starter-dot').forEach((dot) => {
        const on = dot.getAttribute('data-index') === index
        dot.classList.toggle('on', on)
        dot.setAttribute('aria-current', on ? 'true' : 'false')
      })
    }
  }, { passive: true })
}

function onDoorKey(event: KeyboardEvent): void {
  if (door !== 'ask') return
  if (event.key === 'Escape') {
    event.preventDefault()
    showDoor(nextDoor('ask', 'cancel'))
    return
  }
  if (event.key !== 'Tab') return
  const dialog = document.querySelector('.overwrite')
  if (!(dialog instanceof HTMLElement)) return
  const buttons = [...dialog.querySelectorAll('button')].filter((node): node is HTMLButtonElement => node instanceof HTMLButtonElement)
  if (buttons.length < 2) return
  const first = buttons[0]
  const last = buttons[buttons.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

function restoreBackup(): void {
  const raw = localStorage.getItem(SAVE_BACKUP)
  if (!raw) return
  localStorage.setItem(SAVE_KEY_V2, raw)
  const gate = inspectSave(localStorage, Date.now())
  if (gate.kind === 'ready' && gate.save) {
    keptSave = gate.save
    doorBackup = gate.backup
    showDoor('continue')
  }
}

function onStarterKey(event: KeyboardEvent): void {
  if (save || draftStep !== 'starter') return
  const scroller = document.getElementById('starter-scroller')
  if (!scroller) return
  const cards = [...scroller.querySelectorAll('.starter-card')].filter((node): node is HTMLElement => node instanceof HTMLElement)
  const active = document.activeElement
  const index = cards.findIndex((card) => card === active || card.contains(active))
  if ((event.key === 'ArrowRight' || event.key === 'ArrowLeft') && index >= 0) {
    event.preventDefault()
    const next = event.key === 'ArrowRight' ? Math.min(cards.length - 1, index + 1) : Math.max(0, index - 1)
    cards[next].focus()
    placeStarter(cards[next].dataset.species ?? '')
  }
  if ((event.key === 'Enter' || event.key === ' ') && active instanceof HTMLElement && active.classList.contains('starter-card')) {
    event.preventDefault()
    draftPick = active.dataset.species ?? ''
    showOnboarding()
  }
}

function playStarterPreview(node: HTMLElement, speciesId: string): void {
  const host = document.getElementById('starter-fx')
  const stage = document.getElementById('stage')
  if (!(host instanceof HTMLElement) || !(stage instanceof HTMLElement) || !speciesId) return
  let row: ReturnType<typeof species>
  try { row = species(speciesId) } catch { return }
  const box = node.getBoundingClientRect()
  const frame = stage.getBoundingClientRect()
  const scale = frame.width / (stage.clientWidth || 1) || 1
  host.hidden = false
  host.style.left = `${((box.left - frame.left) / scale).toFixed(1)}px`
  host.style.top = `${((box.top - frame.top) / scale).toFixed(1)}px`
  host.style.width = `${(box.width / scale).toFixed(1)}px`
  host.style.height = `${(box.height / scale).toFixed(1)}px`
  mountBattleFx(host)
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const kind = speciesId === 'm03' ? 'heal' : speciesId === 'm02' ? 'status' : 'hit'
  window.clearTimeout(starterFx)
  preloadBattleStrips([row.type], () => onBattleFxReady(() => {
    const width = host.clientWidth || 200
    const height = host.clientHeight || 200
    playBattleFx({
      type: row.type,
      crit: false,
      band: 'neutral',
      awaken: false,
      shimmer: false,
      reduced,
      tempo: 1,
      from: { x: width * 0.22, y: height * 0.62 },
      to: { x: width * 0.78, y: height * 0.4 },
      kind
    })
    starterFx = window.setTimeout(() => {
      host.hidden = true
      clearBattleFx()
    }, 2000)
  }))
}

async function start(next: SaveV2, intro = false): Promise<void> {
  save = next
  localStorage.removeItem(RESET_FLAG)
  if (intro) {
    localStorage.setItem(REPLACE_SERVER_KEY, '1')
    noteTutorial(3)
  }
  try { writeSave(localStorage, save) } catch { /* ignore */ }
  if (intro) void cloud?.sync('online')
  screen = 'adventure'
  noteProgress()
  render()
  if (intro) await runFirstEntrance(next)
  const raw = resumeGap(Date.now(), save.lastSeenAt)
  if ((save.settings.battery && shouldCatchUp(raw)) || raw >= WELCOME_AFTER_MS) await runOffline(raw)
  else {
    lastTick = Date.now() - encounterMs(save.settings.speed)
    kick()
  }
}

function render(step = save?.step): void {
  if (!save) return
  document.documentElement.lang = save.settings.lang === 'en' ? 'en' : 'de'
  const prev = document.getElementById('pc-viewport')
  if (prev && keepPcScroll) pcScroll = prev.scrollTop
  keepPcScroll = true
  paint(gameHtml(save, screen, Date.now(), pc, dex, selected, sideOpen, debug, overlay, step ?? save.step, {
    tab: activity,
    mult: wheelMult,
    symbols: wheelSymbols,
    note: wheelNote
  }, { mapOpen, moreOpen, pcScroll, filtersOpen, dexOpen, shopTab, shopHint: Date.now() < shopFlashUntil, fighting: animating, cloud: mergedCloud(), masteryNote: Date.now() < masteryUntil ? masteryNote : '' }))
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
  mountCloudLayer()
  fit()
  paintLooks(host, art)
  const dust = host.querySelector('.home-particles')
  if (dust instanceof HTMLElement) {
    const reduced = dust.dataset.reduced === '1' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    mountHomeParticles(dust, reduced, art)
  }
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
  if (document.hidden && !wipingAccount) void cloud?.pause()
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
  if (!save?.started || animating || overlay || cloudBlocks() || (save.hold && !save.challengeNow)) return
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
    outcome = trackedEncounter(now, true)
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

function showMastery(ups: MasteryUp[] | undefined): void {
  const up = ups?.[ups.length - 1]
  if (!up || !save) return
  masteryNote = t(save.settings.lang, 'mastery.toast', { name: species(up.speciesId).name, level: up.level })
  masteryUntil = Date.now() + 4200
  window.setTimeout(() => {
    if (Date.now() < masteryUntil) return
    masteryNote = ''
    render()
  }, 4300)
}

function finishPresent(outcome: EncounterOutcome): void {
  animating = false
  if (pendingOutcome === outcome) pendingOutcome = null
  showMastery(outcome.masteryUps)
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
  const enterMs = 300 / Math.max(1, speed)
  const auraMs = teamHasCombo() ? AURA_MS / Math.max(1, speed) : 0
  let auraArmed = false
  // Hold the fight script until the monster has stepped in and the aura has finished.
  let scriptAt = auraMs > 0 ? Number.POSITIVE_INFINITY : 0
  backstop = window.setTimeout(finishOnce, dur + enterMs + auraMs + 400)
  const k = tempoScale(speed)
  let started = performance.now()
  let counterAt = -1
  let frozen = -1
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
  const frame = (now: number) => {
    if (gen !== playGen) return
    if (!paintDue(now, drawnAt, battery)) {
      raf = requestAnimationFrame(frame)
      return
    }
    drawnAt = now
    try {
      let motion = now - started
      if (frozen >= 0) motion = frozen
      const elapsed = frozen >= 0 || !(scriptAt > 0) ? motion : Math.max(0, motion - scriptAt)
      const shot = shotAt(outcome.traces, Math.min(elapsed, battleEnd), battleEnd)
      if (holdCounter && shot?.counter) {
        if (counterAt < 0) counterAt = elapsed
        if (frozen < 0 && elapsed - counterAt >= 320) frozen = elapsed
      }
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
        enterAt = motion
        const banner = document.getElementById('name-banner')
        if (banner) {
          banner.hidden = false
          banner.textContent = shot.allyName
          window.setTimeout(() => { banner.hidden = true }, 800 / Math.max(1, speed))
        }
      }
      if (!auraArmed && auraMs > 0 && frozen < 0 && enterAt >= 0 && motion >= enterAt + enterMs) {
        auraArmed = true
        scriptAt = motion + auraMs + 40
        showAura(speed)
      }
      const enter = enterAt < 0 ? 0 : Math.max(0, 1 - (motion - enterAt) / enterMs)
      const field = document.getElementById('battle-world')
      if (allyActor) {
        const slide = clampActorSlide(allyActor, field, -240 * enter)
        allyActor.style.transform = `${actorTransform('ally', allyMove, allyHit, allyKo, elapsed, reach)} translate(${slide.toFixed(1)}px, 0px)`
        allyActor.style.opacity = String(koPose(allyKo).opacity)
        clampActorPose(allyActor, field)
      }
      paintWeatherArrow('ally-arrow', shot ? species(shot.allySpecies).type : null, weather)
      paintWeatherArrow('foe-arrow', shot ? species(shot.foeSpecies).type : null, weather)
      paintUlt('ally-ult', shot?.allyUlt ?? 0, shot?.allyUltOpen ?? false)
      paintUlt('foe-ult', shot?.foeUlt ?? 0, shot?.foeUltOpen ?? false)
      paintMark('ally-status', shot?.allyMark ?? null, shot?.allyStacks ?? 0)
      paintMark('foe-status', shot?.foeMark ?? null, shot?.foeStacks ?? 0)
      paintMechs(shot?.mechs ?? [])
      paintHelper(Boolean(shot?.helper), shot?.foeSpecies ?? '')
      const konter = document.getElementById('konter-label')
      if (konter) {
        konter.hidden = !shot?.counter
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
        clampActorPose(foeActor, field)
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
  const run = () => {
    started = performance.now()
    raf = requestAnimationFrame(frame)
  }
  if (outcome.boss?.species && !holdCounter) showBossIntro(outcome.boss, run)
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

let auraTimer = 0

function teamTypes(): TypeId[] {
  if (!save) return []
  return save.team.flatMap((uid) => {
    const mon = save!.mons[uid]
    return mon ? [species(mon.species).type] : []
  })
}

function teamHasCombo(): boolean {
  return activeCombos(teamTypes()).length > 0
}

function showAura(speed: number): void {
  if (!teamHasCombo()) return
  const node = document.getElementById('aura-flash')
  if (!(node instanceof HTMLElement)) return
  window.clearInterval(auraTimer)
  node.style.backgroundImage = `url(${art('battle/aura_flash.png')})`
  node.style.backgroundPosition = '0 0'
  node.hidden = false
  const step = AURA_MS / AURA_FRAMES / Math.max(1, speed)
  let frame = 0
  auraTimer = window.setInterval(() => {
    frame += 1
    if (frame >= AURA_FRAMES) {
      window.clearInterval(auraTimer)
      node.hidden = true
      return
    }
    node.style.backgroundPosition = `${-frame * 420}px 0`
  }, step)
}

function clampActorSlide(actor: HTMLElement, field: HTMLElement | null, x: number): number {
  const img = actor.querySelector('img.sprite')
  const width = field?.clientWidth || 1080
  const sprite = img instanceof HTMLImageElement ? Math.max(img.offsetWidth, 220) * 1.2 : 280
  const anchor = (parseFloat(actor.style.left) / 100) * width
  return clampShift(anchor, x, width, sprite)
}

function clampActorPose(actor: HTMLElement, field: HTMLElement | null): void {
  if (!(field instanceof HTMLElement)) return
  const img = actor.querySelector('img.sprite')
  if (!(img instanceof HTMLElement)) return
  const box = img.getBoundingClientRect()
  if (box.width < 2) return
  const frame = field.getBoundingClientRect()
  const pad = 8
  let dx = 0
  if (box.left < frame.left + pad) dx = frame.left + pad - box.left
  else if (box.right > frame.right - pad) dx = frame.right - pad - box.right
  if (dx === 0) return
  const scale = fitScale(window.innerWidth, window.innerHeight) || 1
  actor.style.transform += ` translateX(${(dx / scale).toFixed(1)}px)`
}

function paintMechs(ids: MechId[]): void {
  const row = document.getElementById('foe-mechs')
  if (!row) return
  const key = ids.join(',')
  if (row.dataset.ids !== key) {
    row.dataset.ids = key
    row.innerHTML = ids.map((id) => `<img src="${art(mechIcon(id))}" alt="${id}"/>`).join('')
  }
  row.hidden = ids.length === 0
}

function paintHelper(on: boolean, speciesId: string): void {
  const img = document.getElementById('foe-helper')
  if (!(img instanceof HTMLImageElement)) return
  if (!on || !speciesId) {
    img.hidden = true
    return
  }
  const src = monsterArt(speciesId, true)
  if (!img.src.endsWith(src) && img.getAttribute('src') !== src) img.src = src
  img.hidden = false
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
  catchingUp = true
  window.clearTimeout(timer)
  try {
    await finishOffline(rawMs)
  } finally {
    catchingUp = false
    releaseSync()
  }
}

async function finishOffline(rawMs: number): Promise<void> {
  if (!save) return
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
  const masteryBag = new Map<string, number>()
  const start = save.lastSeenAt || Date.now() - counted
  overlay = { kind: 'offline', done: 0, total }
  render()
  let reached = save.lastSeenAt
  let stopped = false
  for (let i = 0; i < total; i++) {
    if (away && save.settings.battery) { stopped = true; break }
    if (save.hold && !save.challengeNow) break
    const at = start + (i + 1) * BASE_ENCOUNTER_MS
    resolveEncounter(save, at, { offline: true, trace: false, summary, levelLeft, masteryBag })
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
  summary.mastery = settleOfflineMastery(save, masteryBag)
  syncAchievements(save)
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

async function refreshOwnLabel(): Promise<void> {
  const label = await loadOwnLabel()
  if (!label || label === accountUi.playerLabel) return
  accountUi.playerLabel = label
  localStorage.setItem('velunor_player_label', label)
  if (save && screen === 'options' && !cloudInputBusy()) render()
}

function nameServerKey(code: string): string {
  if (code === 'wait') return 'cloud.nameWait'
  if (code === 'taken') return 'cloud.nameTaken'
  if (code === 'short') return 'cloud.nameShort'
  if (code === 'long') return 'cloud.nameLong'
  if (code === 'chars') return 'cloud.nameChars'
  return 'cloud.nameWord'
}

function nameErrorKey(issue: ReturnType<typeof nameIssue>): string {
  if (issue === 'short') return 'cloud.nameShort'
  if (issue === 'long') return 'cloud.nameLong'
  if (issue === 'chars') return 'cloud.nameChars'
  return 'cloud.nameWord'
}

async function savePlayerName(): Promise<void> {
  const field = document.getElementById('player-name')
  const raw = field instanceof HTMLInputElement ? field.value : ''
  const issue = nameIssue(raw)
  if (issue) {
    accountUi.nameError = t(activeLang(), nameErrorKey(issue))
    accountUi.nameOpen = true
    mountCloudLayer()
    const again = document.getElementById('player-name')
    if (again instanceof HTMLInputElement) again.value = raw
    return
  }
  const result = await callOnline('set-name', { name: raw.trim() })
  if (!result.ok) {
    accountUi.onlineDown = result.missing
    accountUi.nameError = t(activeLang(), result.missing ? 'cloud.unavailable' : nameServerKey(result.error))
    accountUi.nameOpen = true
    mountCloudLayer()
    const again = document.getElementById('player-name')
    if (again instanceof HTMLInputElement) again.value = raw
    return
  }
  accountUi.playerLabel = String(result.data.label ?? '')
  accountUi.nameError = ''
  accountUi.nameOpen = false
  accountUi.onlineDown = false
  localStorage.setItem('velunor_player_label', accountUi.playerLabel)
  if (save) render()
  else mountCloudLayer()
}

async function sendReport(reason: string): Promise<void> {
  const field = document.getElementById('report-target')
  const target = field instanceof HTMLInputElement ? field.value.trim() : ''
  if (!target) {
    accountUi.nameError = t(activeLang(), 'cloud.reportHint')
    mountCloudLayer()
    return
  }
  const result = await sendReportRow(target, reason)
  accountUi.reportOpen = false
  accountUi.onlineDown = !result.ok && result.missing
  accountUi.statusNote = result.ok ? t(activeLang(), 'cloud.reported') : ''
  accountUi.nameError = result.ok ? '' : t(activeLang(), result.missing ? 'cloud.unavailable' : 'cloud.nameWord')
  if (save && screen === 'options') render()
  else mountCloudLayer()
}

async function sendBlock(): Promise<void> {
  const field = document.getElementById('player-target')
  const target = field instanceof HTMLInputElement ? field.value.trim() : ''
  if (!target) return
  const result = await sendBlockRow(target)
  accountUi.onlineDown = !result.ok && result.missing
  accountUi.statusNote = result.ok ? t(activeLang(), 'cloud.blocked') : ''
  accountUi.nameError = result.ok ? '' : t(activeLang(), result.missing ? 'cloud.unavailable' : 'cloud.nameWord')
  if (save) render()
}

async function deleteAccount(): Promise<void> {
  const result = await callOnline('delete-account', {})
  if (!result.ok) {
    accountUi.onlineDown = true
    accountUi.deleteStep = 0
    accountUi.nameError = t(activeLang(), 'cloud.unavailable')
    if (save) render()
    return
  }
  wipingAccount = true
  save = null
  keptSave = null
  for (const key of clearVelunorKeys(Object.keys(localStorage))) localStorage.removeItem(key)
  window.location.reload()
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
  if (act === 'name-open') {
    accountUi.nameOpen = true
    accountUi.nameError = ''
    accountUi.reportOpen = false
    mountCloudLayer()
    return
  }
  if (act === 'name-close' || act === 'report-close' || act === 'delete-no') {
    accountUi.nameOpen = false
    accountUi.reportOpen = false
    accountUi.deleteStep = 0
    mountCloudLayer()
    return
  }
  if (act === 'name-save') {
    void savePlayerName()
    return
  }
  if (act === 'report-open') {
    accountUi.reportOpen = true
    accountUi.nameOpen = false
    mountCloudLayer()
    return
  }
  if (act === 'report-send') {
    void sendReport(node.getAttribute('data-reason') ?? '')
    return
  }
  if (act === 'block-player') {
    void sendBlock()
    return
  }
  if (act === 'delete-ask') {
    accountUi.deleteStep = 1
    mountCloudLayer()
    return
  }
  if (act === 'delete-next') {
    accountUi.deleteStep = 2
    mountCloudLayer()
    return
  }
  if (act === 'delete-yes') {
    void deleteAccount()
    return
  }
  if (act === 'consent') {
    cloud?.setConsent(node.getAttribute('data-consent') === 'yes' ? 'yes' : 'no')
    if (save) kick()
    return
  }
  if (act === 'conflict-a' || act === 'conflict-b') {
    void cloud?.choose(act === 'conflict-a' ? 'A' : 'B').then(() => { if (save) kick() })
    return
  }
  if (act === 'combo') {
    if (save && save.settings.speed !== 1) return
    const tip = document.getElementById('combo-tip')
    if (!(tip instanceof HTMLElement)) return
    tip.hidden = !tip.hidden
    tip.textContent = node.getAttribute('data-tip') ?? ''
    return
  }
  if (act === 'status') {
    if (save && save.settings.speed !== 1) return
    const who = node.getAttribute('data-who') === 'foe' ? 'foe' : 'ally'
    const tip = document.getElementById(`${who}-tip`)
    if (!(tip instanceof HTMLElement)) return
    tip.hidden = !tip.hidden
    tip.textContent = node.getAttribute('data-tip') ?? ''
    return
  }
  if (act === 'lang-sheet') {
    if (save) return
    draftLangOpen = !draftLangOpen
    showOnboarding()
    return
  }
  if (act === 'lang') {
    draftLang = node.getAttribute('data-lang') === 'en' ? 'en' : 'de'
    localStorage.setItem('velunor_lang', draftLang)
    document.documentElement.lang = draftLang
    draftLangOpen = false
    if (!save) {
      if (keptSave && (door === 'continue' || door === 'ask')) {
        keptSave.settings.lang = draftLang
        try { writeSave(localStorage, keptSave) } catch { /* keep the door */ }
        showDoor(door)
        return
      }
      showOnboarding()
      return
    }
    save.settings.lang = draftLang
    render()
    return
  }
  if (act === 'look') {
    if (save) return
    const part = node.getAttribute('data-part')
    const index = Number(node.getAttribute('data-index'))
    if (part === 'skin' || part === 'hair' || part === 'color') {
      draftLook = chooseLook(draftLook, part, index)
      showOnboarding()
    }
    return
  }
  if (act === 'random-name') {
    if (save) return
    draftName = pickName(draftLang, Math.random)
    showOnboarding()
    return
  }
  if (act === 'random-look') {
    if (save) return
    draftLook = pickLook(Math.random)
    showOnboarding()
    return
  }
  if (act === 'next') {
    if (save) return
    const field = document.querySelector('[data-field="name"]')
    if (field instanceof HTMLInputElement) draftName = field.value
    if (nameProblem(draftName)) return
    draftStep = 'starter'
    showOnboarding()
    return
  }
  if (act === 'back') {
    if (save) return
    draftStep = 'name'
    showOnboarding()
    return
  }
  if (act === 'reload') {
    window.location.reload()
    return
  }
  if (act === 'continue') {
    if (keptSave && nextDoor(door, 'resume') === 'play') void start(resumeSave(keptSave))
    return
  }
  if (act === 'new-game') {
    showDoor(nextDoor(door, 'new'))
    return
  }
  if (act === 'overwrite-no') {
    showDoor(nextDoor(door, 'cancel'))
    return
  }
  if (act === 'overwrite-yes') {
    showDoor(nextDoor(door, 'confirm'))
    return
  }
  if (act === 'restore') {
    restoreBackup()
    return
  }
  if (act === 'preview') {
    if (save) return
    if (node instanceof HTMLElement) playStarterPreview(node, node.getAttribute('data-species') ?? '')
    return
  }
  if (act === 'starter-dot') {
    if (save) return
    placeStarter(STARTERS[Number(node.getAttribute('data-index'))]?.id ?? '')
    return
  }
  if (act === 'pick') {
    if (save) return
    draftPick = node.getAttribute('data-species') ?? ''
    showOnboarding()
    return
  }
  if (act === 'start') {
    if (save || !draftPick || nameProblem(draftName)) return
    const next = beginAdventure(draftName.trim(), draftLook, draftPick, Date.now())
    next.settings.lang = draftLang
    if (draftLang === 'en' && next.log[0]) next.log[0].text = t('en', 'say.start', { name: next.name })
    void start(next, true)
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
    const next = (node.getAttribute('data-screen') as Screen) || 'adventure'
    if (next !== screen) cloud?.track('tab_open', { tab: next })
    screen = next
    overlay = null
    moreOpen = false
    mapOpen = false
    render()
    if (screen === 'options') void refreshOwnLabel()
    kick()
    return
  }
  if (act === 'map') {
    mapOpen = !mapOpen
    if (mapOpen) moreOpen = false
    render()
    return
  }
  if (act === 'account') {
    if (screen !== 'options') cloud?.track('tab_open', { tab: 'options' })
    screen = 'options'
    overlay = null
    moreOpen = false
    mapOpen = false
    void cloud?.sync('online')
    render()
    void refreshOwnLabel()
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
    const speciesId = node.getAttribute('data-id') ?? ''
    const before = save.stars[speciesId] ?? 0
    const reason = raiseStar(save, speciesId)
    if (reason) save.log.push({ t: Date.now(), text: reason })
    else {
      const event = starEvent(speciesId, before + 1)
      if (event) cloud?.track(event.event, event.props)
    }
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
    const shardsBefore = { ...save.shards }
    const grants = takeChests(save, tier, act === 'chest-all' ? 10 : 1, Date.now())
    if (!grants.length) return
    showMastery(pullMasteryUps())
    syncAchievements(save)
    for (const event of eventsForLoot(tier, grants.length, shardsBefore, save.shards)) cloud?.track(event.event, event.props)
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
  if (act === 'sync-now') {
    void cloud?.sync('online')
    return
  }
  if (act === 'link-email') {
    const field = document.getElementById('account-email')
    const email = field instanceof HTMLInputElement ? field.value : ''
    void cloud?.linkEmail(email)
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
    localStorage.setItem(RESET_SERVER_KEY, '1')
    localStorage.removeItem(REPLACE_SERVER_KEY)
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
    const problem = nameProblem(draftName)
    const text = problem ? t(draftLang, `start.err.${problem}`) : ''
    const error = document.getElementById('name-error')
    const reason = document.getElementById('home-reason')
    const button = document.getElementById('home-next')
    if (error) error.textContent = text
    if (reason) {
      reason.textContent = text
      reason.hidden = !text
    }
    if (button instanceof HTMLButtonElement && button.dataset.act === 'next') button.disabled = Boolean(problem)
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
  if (!field || field === 'q' || field === 'name') return
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
  render()
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
  const block = Boolean(target?.closest('input, textarea, select, .sheet-grab, #cloud-layer'))
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
  cloud?.track('tab_open', { tab: next })
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
