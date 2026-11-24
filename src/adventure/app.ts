import './adventure.css'
import './ui-kit.css'
import { installKit } from './uiKit'
import {
  AUTOSAVE_MS,
  BASE_ENCOUNTER_MS,
  CAUGHT_SCALE,
  OFFLINE_BLOCK,
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
import { chatErrorKey } from './chat'
import { t, typeLabel, weatherLabel, type Lang } from './i18n'
import { shouldRecover } from './present'
import { actionAt, battleQueueOn, focusKo, focusSide, focusTempo, hitNumberPhase, planBattle, replayStepMs, roadQueueFromSearch, roadTempo, setRoadQueue, shotFromAction } from './battlePlayer'
import { battleLogFromTraces, lineFor, lineForFrame, logIconFile, rememberBattleLog, type BattleFightLog, type BattleLogLine } from './battleLog'
import { hpLabel, typeEdge, weatherPct } from './battleHud'
import { whyAutoMs, whyBattle, whyIconFile } from './battleWhy'
import { rememberTutorial, TUTORIAL_STEP } from './onboarding'
import { dueHint, goalLine, hintClosable, noteHintReach } from './hints'
import { CHEST_CARD_COUNT, CHEST_SEEN, chestLessonOpen } from './chestLesson'
import { bankPlay, clearNew, dismissUnlockHint, dueUnlockHint, noteUnlocks, pathUnlocked } from './unlocks'
import { roadPaceFromSearch, setRoadPace } from './roadPace'
import { species, typeColor, typeMult, typeName } from '../data'
import { teamWeatherMarks, weatherArrow, weatherAt, WEATHER_SHIFTS } from './weather'
import { ULT_LEVEL, ultName, type UltPattern } from './ult'
import { AURA_FRAMES, AURA_MS } from './combo'
import { activeSynergies, presentSynergies, SYNERGY_CAP, synergyKnown } from './synergy'
import { mechIcon, type MechId } from './mech'
import { AILMENTS, ailmentIcon, type AilmentId } from './ailment'
import { sfx } from '../ui'
import { actorTransform, clampShift, hitShake, koPose, lungeOffset, numberStyle, parallaxShift, spriteMotion } from '../battle/stage'
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
import { beginAdventure, loadAdventure, makeMon, writeSave } from './save'
import { browserCloudApi, watchAuth } from './cloud/supabaseApi'
import { callOnline, claimRankRewards, clearVelunorKeys, loadOwnLabel, loadRankPage, sendBlockRow, sendReportRow } from './online/calls'
import { isBoard, parseRankPage, RANK_FRAMES, type BoardId, type RankModel } from './online/ranks'
import { equipDailyFrame, noteDaily, touchDaily } from './daily'
import { backEffect } from './shell/back'
import { lineUp, setLineUp } from './shell/line'
import { webStore, type ShellStorage } from './shell/storage'
import { offlineCapMs, settleResearch, startResearch, RESEARCH_LINES, type ResearchLine } from './research'
import { buyNode, respecTree } from './tree'
import type { ArenaPanel, ChatPanel, GuildPanel, SocialPanel, TradePanel } from './view'
import { saveOwesCatchUp } from './online/check'
import { nameIssue } from './online/name'
import { createCloud, type CloudController } from './cloud/session'
import type { CloudView } from './cloud/types'
import { CONSENT_KEY, DEVICE_KEY, QUEUE_KEY, REPLACE_SERVER_KEY, RESET_SERVER_KEY } from './cloud/config'
import { applyLocalReset, blockSaves, RESET_FLAG, savesBlocked } from './reset'
import { isEventName, type AnalyticsEvent, type Consent } from './cloud/analytics'
import { eventsForEncounter, eventsForLoot, starEvent, teamProfile, unlockEvent } from './cloud/playEvents'
import { equipFrame, equipTitle, syncAchievements } from './achievements'
import { HATCH_MS, buyHortSlot, moveFromHort, moveToHort } from './hort'
import { expeditionBusy, settleExpeditions, startExpedition, takeExpeditionNotes } from './expedition'
import { coopErrorKey } from './coop'
import { fieldSkipsRender } from './fields'
import { foundCost, guildErrorKey, guildFoundBlock } from './guild'
import { arenaFightErrorKey, crestCount } from './arena'
import { buyCrystal, buyFruit, sellCrystal, sellFruit, useCrystal, useFruit } from './shop'
import { buyPrize, spinWheel, type Multiplier, type SymbolId } from './wheel'
import { chapterCapNow } from './dex'
import { chapterById, encounterTable } from './route'
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
import { crestArt } from './crestArt'
import {
  art,
  battleLogBody,
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

installKit()

const SHELL_SAVE_MS = 30_000

function browserStore(): ShellStorage {
  const local = typeof localStorage === 'undefined'
    ? { getItem: () => null, setItem: () => undefined, removeItem: () => undefined }
    : localStorage
  return webStore(local)
}

let gameStore: ShellStorage = browserStore()
let nativeShell = false

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
const tutorialPending = new Set<number>()
let shownHint = ''
let hintShownAt = 0
let coachGoal = ''
let coachHint = ''
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
let rankBoard: BoardId = 'codex'
let rankFriends = false
let rankToken = 0
let rankView: RankModel = { board: 'codex', status: 'offline', top: [], around: [], honors: [], excluded: false }
let treePick = 'chest-1'
let arenaTimer = 0
let arenaPanel: ArenaPanel = { status: 'offline', note: '', rating: 1000, league: 'Kiesel', attacks: 0, slots: [], suggestions: [], logs: [], frames: [], replay: null }
let socialPanel: SocialPanel = { status: 'offline', code: '', friends: [], requests: [], note: '' }
let expeditionPick = ''
let tradePanel: TradePanel = { status: 'offline', note: '', mine: null, theirs: null, lockMs: 0, phase: 'pick' }
let guildPanel: GuildPanel = { status: 'offline', name: '', tag: '', level: 1, points: 0, note: '' }
let chatPanel: ChatPanel = { status: 'offline', lines: [], note: '', adult: null }
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
let autosaveTimer = 0
let watchdogTimer = 0
let cloudSyncTimer = 0
let cloudFlushTimer = 0

function blockSaveWrites(): void {
  window.clearInterval(autosaveTimer)
  window.clearInterval(watchdogTimer)
  window.clearInterval(cloudSyncTimer)
  window.clearInterval(cloudFlushTimer)
  window.clearTimeout(timer)
}
let animating = false
let lastTick = 0
let holdCounter = false
let progressAt = Date.now()
let raf = 0
let playGen = 0
let pendingOutcome: EncounterOutcome | null = null
let activity: WheelPanel['tab'] = 'hort'
let chestCard = 0
let shownUnlock = ''
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

function exportSaveJson(): void {
  if (!save) return
  const blob = new Blob([JSON.stringify(save)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'velunor-spielstand.json'
  link.click()
  URL.revokeObjectURL(url)
}

function activeLang(): Lang {
  if (save?.settings.lang === 'en' || keptSave?.settings.lang === 'en') return 'en'
  if (save || keptSave) return 'de'
  return draftLang
}

function cloudBlocks(): boolean {
  return cloudView.askConsent || cloudView.conflict !== null
}

function closeHint(id: string): boolean {
  if (!save?.onboarding || !id || !hintClosable(hintShownAt, Date.now())) return false
  if (!save.onboarding.seen.includes(id)) {
    save.onboarding.seen = [...save.onboarding.seen, id].slice(-64)
    const remembered = rememberTutorial(save.onboarding.sent, TUTORIAL_STEP.hintDismiss)
    save.onboarding.sent = remembered.sent
    cloud?.track('tutorial_step', { step: TUTORIAL_STEP.hintDismiss, hint: id })
  }
  if (shownHint === id) shownHint = ''
  hintShownAt = 0
  coachHint = ''
  try { writeSave(gameStore, save) } catch { /* the memory copy still applies */ }
  return true
}

function finishChestLesson(): void {
  if (!save) return
  const board = save.onboarding
  if (board && !board.seen.includes(CHEST_SEEN)) board.seen = [...board.seen, CHEST_SEEN].slice(-64)
  noteTutorial(TUTORIAL_STEP.chestSeen)
  chestCard = 0
  try { writeSave(gameStore, save) } catch { /* the memory copy still applies */ }
  render()
}

function stepChestLesson(dir: -1 | 1): void {
  if (dir < 0) {
    chestCard = Math.max(0, chestCard - 1)
    render()
    return
  }
  if (chestCard >= CHEST_CARD_COUNT - 1) finishChestLesson()
  else {
    chestCard += 1
    render()
  }
}

function closeUnlockHint(id: string): void {
  if (!save || !id) return
  dismissUnlockHint(save, id, Date.now())
  const board = save.onboarding
  if (board) {
    const remembered = rememberTutorial(board.sent, TUTORIAL_STEP.hintDismiss)
    board.sent = remembered.sent
  }
  cloud?.track('tutorial_step', { step: TUTORIAL_STEP.hintDismiss, hint: id })
  if (shownUnlock === id) shownUnlock = ''
  try { writeSave(gameStore, save) } catch { /* the memory copy still applies */ }
}

function noteTutorial(step: number): void {
  const board = save?.onboarding
  const prior = board ? board.sent : [...tutorialPending]
  const next = rememberTutorial(prior, step)
  if (!next.send) return
  if (board) board.sent = next.sent
  else tutorialPending.add(Math.floor(step))
  cloud?.track('tutorial_step', { step: Math.floor(step) })
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
  const existing = loadAdventure(gameStore, Date.now())
  cloud = createCloud(browserCloudApi(), {
    now: () => Date.now(),
    online: () => lineUp(),
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
      if (savesBlocked() || !saveReady || catchingUp) return null
      const live = save?.started ? save : keptSave?.started ? keptSave : null
      if (live) settleResearch(live, Date.now())
      return live
    },
    storeSave(next) {
      const playing = Boolean(save?.started)
      try { writeSave(gameStore, next) } catch { /* the memory copy still applies */ }
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
  cloudSyncTimer = window.setInterval(() => { void cloud?.sync('interval') }, 5 * 60 * 1000)
  cloudFlushTimer = window.setInterval(() => { void cloud?.flush() }, 60 * 1000)
}

function releaseSync(): void {
  saveReady = true
  void cloud?.sync('start')
}

export function bootAdventure(shell?: { storage: ShellStorage, native: boolean, listen?: (hooks: { onPause: () => void, onResume: () => void, onBack: () => void, onLine: (up: boolean) => void }) => void }): void {
  if (shell) {
    gameStore = shell.storage
    nativeShell = shell.native
  }
  const root = document.getElementById('game')
  if (!root) return
  root.innerHTML = `<picture id="frame-bg"><source srcset="${art('backgrounds/bg_frame_desktop.webp')}" type="image/webp"/><img src="${art('backgrounds/bg_frame_desktop.jpg')}" alt=""/></picture><div id="fit"></div><div id="turn" hidden></div>`
  root.addEventListener('click', onClick)
  root.addEventListener('submit', onSubmit)
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
    if (savesBlocked()) return
    if (!save) {
      void cloud?.pause()
      return
    }
    if (save) {
      const paused = batteryPause(save.settings.battery, currentPresence())
      if (!paused && Date.now() - lastTick < encounterMs(save.settings.speed) * 2) save.lastSeenAt = Date.now()
      writeSave(gameStore, save)
      void gameStore.flush()
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
  watchdogTimer = window.setInterval(watchdog, 1000)
  autosaveTimer = window.setInterval(() => {
    if (savesBlocked() || !save?.started || overlay?.kind === 'offline') return
    save.lastSeenAt = stampWhilePaused(save.lastSeenAt, Date.now(), away)
    try { writeSave(gameStore, save) } catch { /* keep playing */ }
  }, nativeShell ? SHELL_SAVE_MS : AUTOSAVE_MS)

  shell?.listen?.({
    onPause() {
      if (savesBlocked()) return
      if (save) {
        save.lastSeenAt = Date.now()
        writeSave(gameStore, save)
      }
      void gameStore.flush()
      void cloud?.pause()
    },
    onResume() {
      if (save?.started) {
        const raw = resumeGap(Date.now(), save.lastSeenAt)
        if (shouldCatchUp(raw) || raw >= WELCOME_AFTER_MS) {
          void runOffline(raw)
        } else kick()
      }
      void cloud?.sync('online')
    },
    onBack() {
      hardwareBack()
    },
    onLine(up) {
      setLineUp(up)
      if (up) void cloud?.sync('online')
      else cloud?.markOffline()
    }
  })

  const params = new URLSearchParams(window.location.search)
  setRoadQueue(roadQueueFromSearch(debug, window.location.search) ? true : null)
  setRoadPace(roadPaceFromSearch(debug, window.location.search) && battleQueueOn('road') ? true : null)
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
        <p class="wx-preview">Jetzt: Regen. Dein Team: ${marks.up} <img class="arrow" src="${art('battle/stat_up.png')}" alt="▲"/>, ${marks.down} <img class="arrow" src="${art('battle/stat_down.png')}" alt="▼"/></p>
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
      paintCrest(crest, 'Kieselwappen')
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
  noteTutorial(draftStep === 'starter' ? TUTORIAL_STEP.starter : TUTORIAL_STEP.name)
  paint(onboardingHtml(draftName, draftLook, draftPick, draftLang, draftStep, draftLangOpen))
  const nameField = document.getElementById('hero-name')
  if (nameField instanceof HTMLInputElement) nameField.addEventListener('focus', () => nameField.select())
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
    if (save.onboarding) {
      for (const step of tutorialPending) {
        save.onboarding.sent = rememberTutorial(save.onboarding.sent, step).sent
      }
    }
    noteTutorial(TUTORIAL_STEP.started)
  }
  try { writeSave(gameStore, save) } catch { /* ignore */ }
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

function pumpExpeditions(now = Date.now()): void {
  if (!save) return
  settleExpeditions(save, now)
  settleResearch(save, now)
  touchDaily(save, new Date(now))
  const notes = takeExpeditionNotes(save)
  if (!notes.length) return
  masteryNote = notes.join(' · ')
  masteryUntil = now + 4200
  try { writeSave(gameStore, save) } catch { /* the return is already in the save */ }
}

function render(step = save?.step): void {
  if (!save) return
  pumpExpeditions()
  document.documentElement.lang = save.settings.lang === 'en' ? 'en' : 'de'
  const prev = document.getElementById('pc-viewport')
  if (prev && keepPcScroll) pcScroll = prev.scrollTop
  keepPcScroll = true
  if (pathUnlocked(save) && save.onboarding && !save.onboarding.seen.includes('path:open')) {
    save.onboarding.seen = [...save.onboarding.seen, 'path:open'].slice(-64)
    noteTutorial(TUTORIAL_STEP.path)
  }
  const fresh = noteUnlocks(save)
  for (const id of fresh) {
    const text = t(save.settings.lang, `unlock.log.${id}`)
    if (text !== `unlock.log.${id}`) save.log.push({ t: Date.now(), text })
  }
  if (save.log.length > 50) save.log.splice(0, save.log.length - 50)
  const focusFight = animating && pendingOutcome?.kind === 'guardian'
  const hint = dueUnlockHint(save, Date.now(), focusFight)
  if (hint && hint.id !== shownUnlock) {
    shownUnlock = hint.id
    if (save.onboarding) save.onboarding.lastHintAt = Date.now()
  }
  if (!hint) shownUnlock = ''
  paint(gameHtml(save, screen, Date.now(), pc, dex, selected, sideOpen, debug, overlay, step ?? save.step, {
    tab: activity,
    mult: wheelMult,
    symbols: wheelSymbols,
    note: wheelNote
  }, { mapOpen, moreOpen, pcScroll, filtersOpen, dexOpen, shopTab, shopHint: Date.now() < shopFlashUntil, fighting: animating, focusFight, chestCard: screen === 'activities' && chestLessonOpen(save) ? chestCard : null, unlockHint: hint, cloud: mergedCloud(), masteryNote: Date.now() < masteryUntil ? masteryNote : '', ranks: { ...rankView, board: rankBoard, excluded: mergedCloud().flagLevel === 2 }, treePick, arena: arenaPanel, social: socialPanel, expeditionPick, trade: tradePanel, guild: guildPanel, chat: chatPanel, battleLog: battleLogs }))
  const shown = document.getElementById('hint-bubble')?.getAttribute('data-hint') ?? ''
  if (!hint && save.onboarding && shown && shown !== shownHint) {
    shownHint = shown
    hintShownAt = Date.now()
    save.onboarding.lastHintAt = Date.now()
  }
  refreshCoach()
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
  if (savesBlocked()) return
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
      try { writeSave(gameStore, save) } catch { /* keep the gap */ }
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
  pumpExpeditions()
  if (!save?.started || animating || overlay || cloudBlocks() || (save.hold && !save.challengeNow)) return
  const dur = encounterMs(save.settings.speed)
  const now = Date.now()
  const played = Math.max(0, now - (save.roadAt || now))
  bankPlay(save, played)
  bankRoad(save, played)
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
    try { writeSave(gameStore, save) } catch { /* ignore */ }
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
  persistSave()
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
  if (screen === 'adventure' && !overlay && document.getElementById('battle') && document.getElementById('path')) patchAdventure(outcome.step)
  else render(outcome.step)
  play(outcome, save.settings.speed, () => finishPresent(outcome))
}

let persistAt = 0

function persistSave(force = false): void {
  if (!save) return
  const now = Date.now()
  if (!force && now - persistAt < 3000) return
  persistAt = now
  try { writeSave(gameStore, save) } catch { /* the memory copy still applies */ }
}

const warmedArt = new Set<string>()

function warmArt(src: string): void {
  if (!src || warmedArt.has(src)) return
  warmedArt.add(src)
  const img = new Image()
  img.decoding = 'async'
  img.src = src
}

function warmChapterArt(): void {
  if (!save) return
  const chapter = chapterById(save.region, save.chapter)
  for (const row of encounterTable(chapter, Date.now())) warmArt(monsterArt(row.species, true))
  const uid = save.active && save.mons[save.active] ? save.active : save.team[0]
  const mon = uid ? save.mons[uid] : null
  if (mon) warmArt(monsterArt(mon.species, true))
}

function refreshCoach(): void {
  if (!save || screen !== 'adventure') return
  noteHintReach(save)
  const chapter = chapterById(save.region, save.chapter)
  const line = goalLine(save, chapter.name)
  const text = t(save.settings.lang, line.key, { n: line.n ?? 0, name: line.name ?? '' })
  if (text !== coachGoal) {
    const chip = document.getElementById('goal-chip')
    if (chip) chip.textContent = text
    coachGoal = text
  }
  const focus = animating && pendingOutcome?.kind === 'guardian'
  const bubble = document.getElementById('hint-bubble')
  if (focus) {
    if (bubble) bubble.remove()
    coachHint = ''
    return
  }
  if (bubble) {
    coachHint = bubble.getAttribute('data-hint') ?? coachHint
    return
  }
  if (coachHint) coachHint = ''
  const next = dueHint(save, Date.now(), false)
  if (!next) return
  const host = document.querySelector('.anchor-mid')
  if (!host) return
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'hint-bubble'
  button.id = 'hint-bubble'
  button.dataset.act = 'hint-close'
  button.dataset.hint = next.id
  button.textContent = t(save.settings.lang, next.key)
  host.prepend(button)
  shownHint = next.id
  coachHint = next.id
  hintShownAt = Date.now()
  if (save.onboarding) save.onboarding.lastHintAt = hintShownAt
}

function patchAdventure(step: number): void {
  if (!save) return
  const gold = document.getElementById('gold')
  if (gold) gold.textContent = `${Math.floor(save.gold).toLocaleString('de-DE')} G`
  document.querySelectorAll('#path .node').forEach((node, index) => {
    const n = index + 1
    node.classList.toggle('is-here', n === step)
    node.classList.toggle('is-done', n < step)
  })
  refreshCoach()
}

function hardwareBack(): void {
  const effect = backEffect({
    overlay: overlay != null,
    more: moreOpen,
    filters: filtersOpen,
    dex: dexOpen,
    map: mapOpen,
    side: sideOpen
  })
  if (effect === 'close-overlay') {
    overlay = null
    render()
    return
  }
  if (effect === 'close-more') {
    moreOpen = false
    render()
    return
  }
  if (effect === 'close-filters') {
    filtersOpen = false
    render()
    return
  }
  if (effect === 'close-dex') {
    dexOpen = false
    render()
    return
  }
  if (effect === 'close-map') {
    mapOpen = false
    render()
    return
  }
  if (effect === 'close-side') {
    sideOpen = false
    render()
    return
  }
  overlay = { kind: 'quit' }
  render()
}

let arenaToken = 0

async function refreshArena(): Promise<void> {
  const token = ++arenaToken
  if (!lineUp()) {
    arenaPanel = { ...arenaPanel, status: 'offline', note: '' }
    render()
    return
  }
  const keepReplay = arenaPanel.replay
  if (!keepReplay) {
    arenaPanel = { ...arenaPanel, status: 'loading' }
    render()
  }
  const state = await Promise.race([
    callOnline('arena-desk', { action: 'state' }),
    new Promise<Awaited<ReturnType<typeof callOnline>>>((resolve) => {
      window.setTimeout(() => resolve({ ok: false, missing: true, error: 'timeout', data: {} }), 8000)
    })
  ])
  if (token !== arenaToken) return
  if (!state.ok || !state.data) {
    arenaPanel = { ...arenaPanel, status: keepReplay ? arenaPanel.status : 'offline', note: keepReplay ? arenaPanel.note : '' }
    render()
    return
  }
  const claim = await callOnline('arena-desk', { action: 'claim' })
  const logs = await callOnline('arena-desk', { action: 'log' })
  if (token !== arenaToken) return
  if (claim.ok && save) {
    const marks = Math.max(0, Math.floor(Number(claim.data.marks)) || 0)
    if (marks > 0) {
      save.marks += marks
      try { writeSave(gameStore, save) } catch { /* the server already marked the season claimed */ }
      masteryNote = t(save.settings.lang, 'ranks.reward', { marks: marks.toLocaleString(save.settings.lang === 'en' ? 'en' : 'de-DE'), titles: '' })
      masteryUntil = Date.now() + 4200
    }
  }
  const frames = Array.isArray(claim.data?.frames) ? claim.data.frames.filter((frame): frame is string => typeof frame === 'string') : arenaPanel.frames
  const rows = Array.isArray(logs.data?.logs) ? logs.data.logs : []
  arenaPanel = {
    ...arenaPanel,
    status: state.data.locked ? 'locked' : 'ready',
    rating: Math.floor(Number(state.data.rating)) || 1000,
    league: typeof state.data.league === 'string' ? state.data.league : 'Kiesel',
    attacks: Math.floor(Number(state.data.attacks)) || 0,
    frames,
    logs: rows.flatMap((line) => {
      if (!line || typeof line !== 'object') return []
      const row = line as { attacker_label?: unknown, win?: unknown, delta?: unknown }
      return [{ label: String(row.attacker_label ?? 'Spieler'), win: Boolean(row.win), delta: Math.floor(Number(row.delta)) || 0 }]
    })
  }
  render()
}

function asFriends(value: unknown): SocialPanel['friends'] {
  if (!Array.isArray(value)) return []
  return value.flatMap((row) => {
    if (!row || typeof row !== 'object') return []
    const item = row as Record<string, unknown>
    if (typeof item.code !== 'string' || typeof item.label !== 'string') return []
    return [{
      code: item.code,
      label: item.label,
      region: Math.floor(Number(item.region)) || 1,
      crests: Math.floor(Number(item.crests)) || 0,
      codex: Math.floor(Number(item.codex)) || 0,
      favorite: typeof item.favorite === 'string' ? item.favorite : '',
      presence: typeof item.presence === 'string' ? item.presence : 'offline',
      incoming: Boolean(item.incoming)
    }]
  })
}

function grantServerGift(gold: number, fruit: number, marks: number, eggs: string[]): void {
  if (!save) return
  save.gold += Math.max(0, Math.floor(gold))
  save.bag.fruits.fang += Math.max(0, Math.floor(fruit))
  save.marks += Math.max(0, Math.floor(marks))
  const readyAt = Date.now() + HATCH_MS
  for (const speciesId of eggs) {
    if (speciesId) save.eggs.push({ species: speciesId, shiny: true, readyAt })
  }
  try { writeSave(gameStore, save) } catch { /* the server already marked the grant claimed */ }
}

function tradeText(code: string): string {
  if (!code || !save) return ''
  const key = `trade.reason.${code}`
  const text = t(save.settings.lang, key)
  return text === key ? code : text
}

async function refreshChat(): Promise<void> {
  if (!lineUp()) {
    chatPanel = { ...chatPanel, status: 'offline' }
    render()
    return
  }
  const state = await callOnline('chat-send', {
    action: 'state',
    kind: chatPanel.channel === 'dm' ? 'dm' : 'guild',
    code: chatPanel.friend ?? ''
  })
  if (!state.ok) {
    chatPanel = { ...chatPanel, status: 'offline' }
    render()
    return
  }
  const lines = Array.isArray(state.data.lines) ? state.data.lines.flatMap((line) => {
    if (!line || typeof line !== 'object') return []
    const row = line as { label?: unknown, body?: unknown }
    if (typeof row.label !== 'string' || typeof row.body !== 'string') return []
    return [{ label: row.label, body: row.body }]
  }) : []
  const friends = Array.isArray(state.data.friends) ? state.data.friends.flatMap((friend) => {
    if (!friend || typeof friend !== 'object') return []
    const row = friend as { code?: unknown, label?: unknown }
    if (typeof row.code !== 'string' || typeof row.label !== 'string') return []
    return [{ code: row.code, label: row.label }]
  }) : (chatPanel.friends ?? [])
  chatPanel = {
    ...chatPanel,
    status: state.data.adult === true || state.data.adult === false ? 'ready' : 'age',
    adult: state.data.adult === true ? true : state.data.adult === false ? false : null,
    lines,
    friends,
    channel: state.data.kind === 'dm' ? 'dm' : (chatPanel.channel === 'dm' ? 'dm' : 'guild')
  }
  render()
}

async function sendChat(): Promise<void> {
  const input = document.getElementById('chat-text') as HTMLInputElement | null
  const text = input?.value ?? chatPanel.draft ?? ''
  const friend = (document.getElementById('chat-friend') as HTMLSelectElement | null)?.value || chatPanel.friend || ''
  chatPanel = { ...chatPanel, draft: text, friend }
  const result = await callOnline('chat-send', {
    action: 'send',
    kind: chatPanel.channel === 'dm' ? 'dm' : 'guild',
    code: friend,
    text
  })
  if (!result.ok) {
    chatPanel = { ...chatPanel, draft: text, note: t(save?.settings.lang, chatErrorKey(result.error)) }
    render()
    return
  }
  chatPanel = { ...chatPanel, draft: '', note: '' }
  await refreshChat()
}

async function refreshGuild(): Promise<void> {
  if (!save) return
  if (!lineUp()) {
    guildPanel = { ...guildPanel, status: 'offline' }
    render()
    return
  }
  const state = await callOnline('guild', { action: 'state' })
  if (!state.ok) {
    guildPanel = { ...guildPanel, status: 'offline' }
    render()
    return
  }
  const row = state.data.guild && typeof state.data.guild === 'object' ? state.data.guild as Record<string, unknown> : {}
  const people = (value: unknown): { id: string, label: string, role?: 'lead' | 'deputy' | 'member' }[] => {
    if (!Array.isArray(value)) return []
    return value.flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const person = item as { id?: unknown, label?: unknown, role?: unknown }
      if (typeof person.id !== 'string' || typeof person.label !== 'string') return []
      const role = person.role === 'lead' || person.role === 'deputy' || person.role === 'member' ? person.role : undefined
      return [{ id: person.id, label: person.label, role }]
    })
  }
  const goals = Array.isArray(state.data.goals) ? state.data.goals.flatMap((item) => {
    if (!item || typeof item !== 'object') return []
    const goal = item as { goal?: unknown, progress?: unknown, target?: unknown }
    if (typeof goal.goal !== 'string') return []
    return [{ goal: goal.goal, progress: Math.max(0, Math.floor(Number(goal.progress)) || 0), target: Math.max(0, Math.floor(Number(goal.target)) || 0) }]
  }) : []
  guildPanel = {
    ...guildPanel,
    status: 'ready',
    id: typeof row.id === 'string' ? row.id : '',
    name: typeof row.name === 'string' ? row.name : '',
    tag: typeof row.tag === 'string' ? row.tag : '',
    level: Math.max(1, Math.floor(Number(row.level)) || 1),
    points: Math.max(0, Math.floor(Number(row.points)) || 0),
    role: state.data.role === 'lead' || state.data.role === 'deputy' || state.data.role === 'member' ? state.data.role : '',
    code: typeof row.code === 'string' ? row.code : '',
    shape: typeof row.shape === 'string' ? row.shape : '',
    symbol: typeof row.symbol === 'string' ? row.symbol : '',
    color: typeof row.color === 'string' ? row.color : '',
    members: people(state.data.members),
    requests: people(state.data.requests),
    goals,
    note: guildPanel.note
  }
  render()
}

function guildNote(code: string): string {
  return t(save?.settings.lang, guildErrorKey(code))
}

async function guildAction(act: string, node: Element): Promise<void> {
  if (!save) return
  const name = (document.getElementById('guild-name') as HTMLInputElement | null)?.value ?? guildPanel.draftName ?? ''
  const tag = (document.getElementById('guild-tag') as HTMLInputElement | null)?.value ?? guildPanel.draftTag ?? ''
  const query = (document.getElementById('guild-query') as HTMLInputElement | null)?.value ?? guildPanel.draftQuery ?? ''
  const code = (document.getElementById('guild-code') as HTMLInputElement | null)?.value ?? guildPanel.draftCode ?? ''
  guildPanel = { ...guildPanel, draftName: name, draftTag: tag, draftQuery: query, draftCode: code }
  if (act === 'guild-search') {
    const result = await callOnline('guild', { action: 'search', query })
    const hits = Array.isArray(result.data.guilds) ? result.data.guilds.flatMap((item) => {
      if (!item || typeof item !== 'object') return []
      const row = item as { id?: unknown, name?: unknown, tag?: unknown }
      if (typeof row.id !== 'string' || typeof row.name !== 'string' || typeof row.tag !== 'string') return []
      return [{ id: row.id, name: row.name, tag: row.tag }]
    }) : []
    guildPanel = { ...guildPanel, hits, note: result.ok ? '' : guildNote(result.error) }
    render()
    return
  }
  if (act === 'guild-found') {
    const block = guildFoundBlock(crestCount(save.badges), save.gold, save.region, name, tag)
    if (block.disabled) {
      guildPanel = { ...guildPanel, note: guildNote(block.reason) }
      render()
      return
    }
    const result = await callOnline('guild', { action: 'found', name: name.trim(), tag: tag.trim().toUpperCase() })
    if (result.ok && !result.data.error) {
      save.gold = Math.max(0, save.gold - foundCost(save.region))
      try { writeSave(gameStore, save) } catch { /* the guild row already exists */ }
      guildPanel = { ...guildPanel, note: '' }
    } else guildPanel = { ...guildPanel, note: guildNote(String(result.data.error || result.error || 'missing')) }
    await refreshGuild()
    return
  }
  if (act === 'guild-join') {
    const picked = node.getAttribute('data-name') || ''
    const result = await callOnline('guild', {
      action: 'join',
      name: picked,
      code: picked ? '' : code.trim().toUpperCase()
    })
    guildPanel = { ...guildPanel, note: result.ok && !result.data.error ? '' : guildNote(String(result.data.error || result.error || 'missing')) }
    await refreshGuild()
    return
  }
  if (act === 'guild-mute') {
    const result = await callOnline('chat-send', {
      action: 'guild-mute',
      target: node.getAttribute('data-id') ?? '',
      guild: guildPanel.id ?? '',
      hours: 24
    })
    guildPanel = { ...guildPanel, note: result.ok ? '' : guildNote(result.error) }
    render()
    return
  }
  const named: Record<string, string> = {
    'guild-phrase': 'phrase',
    'guild-leave': 'leave',
    'guild-accept': 'accept',
    'guild-decline': 'decline',
    'guild-kick': 'kick',
    'guild-role': 'role'
  }
  const action = named[act]
  if (!action) return
  const result = await callOnline('guild', {
    action,
    phrase: node.getAttribute('data-id') ?? '',
    target: node.getAttribute('data-id') ?? ''
  })
  guildPanel = { ...guildPanel, note: result.ok && !result.data.error ? '' : guildNote(String(result.data.error || result.error || 'missing')) }
  await refreshGuild()
}

async function refreshTrade(): Promise<void> {
  if (!lineUp()) {
    tradePanel = { ...tradePanel, status: 'offline', note: '' }
    render()
    return
  }
  tradePanel = { ...tradePanel, status: 'loading' }
  render()
  const state = await callOnline('trade', { action: 'state' })
  if (!state.ok || !save) {
    tradePanel = { ...tradePanel, status: 'offline', note: '' }
    render()
    return
  }
  const rows = Array.isArray(state.data.monsters) ? state.data.monsters : []
  const offers = Array.isArray(state.data.offers) ? state.data.offers : []
  const offer = offers[0] as { id?: string, host?: boolean, hostUid?: string, guestUid?: string, status?: string, lockAt?: string } | undefined
  const ownUid = offer ? (offer.host ? offer.hostUid : offer.guestUid) : rows.find((row) => row && !(row as { reason?: string }).reason)?.uid
  const own = rows.find((row) => (row as { uid?: string }).uid === ownUid) as { uid?: string, species?: string, rarity?: number, shiny?: boolean, level?: number, reason?: string } | undefined
  const lockAt = Date.parse(String(offer?.lockAt ?? ''))
  const phase = offer?.status === 'locked' ? 'locked' : offer ? 'offered' : 'pick'
  tradePanel = {
    status: 'ready',
    note: tradeText(String(state.data.ready ?? '')),
    mine: own?.species ? { uid: String(own.uid), name: (() => { try { return species(String(own.species)).name } catch { return String(own.species) } })(), rarity: Number(own.rarity) || 0, shiny: Boolean(own.shiny), level: Number(own.level) || 1, reason: tradeText(String(own.reason ?? '')) } : null,
    theirs: null,
    lockMs: Number.isFinite(lockAt) ? Math.max(0, lockAt + 5000 - Date.now()) : 0,
    phase,
    offerId: offer?.id,
    ownUid: typeof ownUid === 'string' ? ownUid : undefined,
    host: offer?.host === true
  }
  render()
}

async function tradeAction(act: string): Promise<void> {
  if (!save) return
  const code = (document.getElementById('trade-code') as HTMLInputElement | null)?.value ?? ''
  const action = act === 'trade-offer' ? 'offer' : act === 'trade-lock' ? 'lock' : act === 'trade-confirm' ? 'confirm' : 'cancel'
  const result = await callOnline('trade', {
    action,
    code,
    offer: tradePanel.offerId ?? '',
    mine: tradePanel.ownUid ?? tradePanel.mine?.uid ?? '',
    theirs: tradePanel.theirs?.uid ?? ''
  })
  if (!result.ok) tradePanel = { ...tradePanel, note: tradeText(result.error) }
  if (result.data.done && tradePanel.ownUid) {
    const host = tradePanel.host === true
    const received = String((host ? result.data.host_uid : result.data.guest_uid) ?? '')
    const speciesId = String((host ? result.data.host_species : result.data.guest_species) ?? '')
    const level = Math.max(1, Math.floor(Number(host ? result.data.host_level : result.data.guest_level)) || 1)
    const shiny = Boolean(host ? result.data.host_shiny : result.data.guest_shiny)
    const gone = tradePanel.ownUid
    if (received && speciesId && save.mons[gone]) {
      delete save.mons[gone]
      save.team = save.team.filter((id) => id !== gone)
      save.pc = save.pc.filter((id) => id !== gone)
      save.hort = save.hort.filter((id) => id !== gone)
      save.mons[received] = makeMon(speciesId, level, Date.now(), 'tausch', shiny)
      save.pc.push(received)
      const entry = save.dex[speciesId] ?? { seen: 0, caught: 0 }
      entry.seen += 1
      entry.caught = Math.max(1, entry.caught)
      save.dex[speciesId] = entry
      try { writeSave(gameStore, save) } catch { /* the server already swapped the row */ }
    }
  }
  await refreshTrade()
}

async function refreshSocial(keepNote = false): Promise<void> {
  const note = keepNote ? socialPanel.note : ''
  if (!lineUp()) {
    socialPanel = { ...socialPanel, status: 'offline', note }
    render()
    return
  }
  socialPanel = { ...socialPanel, status: 'loading', note }
  render()
  const friends = await callOnline('friends', { action: 'state' })
  const beast = await callOnline('coop-boss', { action: 'state' })
  if (!friends.ok || !beast.ok) {
    socialPanel = { ...socialPanel, status: 'offline', note }
    render()
    return
  }
  socialPanel = {
    status: 'ready',
    code: typeof friends.data.code === 'string' ? friends.data.code : '',
    friends: asFriends(friends.data.friends),
    requests: asFriends(friends.data.requests),
    note,
    showOnline: friends.data.showOnline !== false,
    gifts: Math.floor(Number(friends.data.gifts)) || 0,
    beast: typeof beast.data.beast === 'string' ? beast.data.beast : 'weltenwurm',
    beastName: typeof beast.data.name === 'string' ? beast.data.name : '',
    level: Math.floor(Number(beast.data.level)) || 1,
    hp: Math.floor(Number(beast.data.hp)) || 0,
    hpMax: Math.floor(Number(beast.data.hpMax)) || 1,
    attempts: Math.floor(Number(beast.data.attempts)) || 0,
    members: Array.isArray(beast.data.members) ? beast.data.members.filter((name): name is string => typeof name === 'string') : [],
    eggChance: Number(beast.data.eggChance) || 0.02
  }
  render()
}

async function socialAction(act: string, code: string | null): Promise<void> {
  const current = save
  if (!current) return
  if (act === 'friend-ask') {
    const query = (document.getElementById('friend-query') as HTMLInputElement | null)?.value ?? ''
    const result = await callOnline('friends', { action: 'request', query })
    socialPanel = { ...socialPanel, note: result.ok ? '' : t(current.settings.lang, 'social.noFriends') }
    await refreshSocial(true)
    return
  }
  if (act === 'friend-online') {
    const box = document.querySelector('[data-act="friend-online"]') as HTMLInputElement | null
    await callOnline('friends', { action: 'privacy', showOnline: box?.checked !== false })
    return
  }
  const named: Record<string, string> = {
    'friend-accept': 'accept',
    'friend-decline': 'decline',
    'friend-remove': 'remove',
    'friend-gift': 'gift',
    'friend-invite': 'invite'
  }
  if (named[act] && code) {
    const target = named[act] === 'invite' ? 'coop-boss' : 'friends'
    const result = await callOnline(target, { action: named[act], code })
    const failed = !result.ok || Boolean(result.data.error)
    socialPanel = {
      ...socialPanel,
      note: failed
        ? (target === 'coop-boss'
          ? t(current.settings.lang, coopErrorKey(String(result.data.error || result.error || 'join')))
          : t(current.settings.lang, 'social.noFriends'))
        : ''
    }
    await refreshSocial(true)
    return
  }
  if (act === 'friend-claim' || act === 'coop-claim') {
    const result = await callOnline(act === 'friend-claim' ? 'friends' : 'coop-boss', { action: 'claim' })
    const eggs = Array.isArray(result.data.eggs) ? result.data.eggs.filter((id): id is string => typeof id === 'string') : []
    grantServerGift(Number(result.data.gold) || 0, Number(result.data.fruit) || 0, Number(result.data.marks) || 0, eggs)
    await refreshSocial()
    return
  }
  if (act === 'coop-attempt') {
    const roster = [...current.team, ...Object.keys(current.mons)].filter((uid, index, all) => current.mons[uid] && !expeditionBusy(current, uid) && all.indexOf(uid) === index).slice(0, 6)
    const result = await callOnline('coop-boss', { action: 'attempt', uids: roster })
    const failed = !result.ok || Boolean(result.data.error)
    if (!failed) noteDaily(current, 'coop', 1)
    socialPanel = { ...socialPanel, note: failed ? t(current.settings.lang, coopErrorKey(String(result.data.error || result.error || 'team'))) : '' }
    await refreshSocial(true)
  }
}

async function arenaAction(act: string, index: string | null): Promise<void> {
  if (!save) return
  if (act === 'arena-save') {
    const result = await callOnline('arena-desk', { action: 'defend', uids: arenaPanel.slots })
    arenaPanel = { ...arenaPanel, note: result.ok ? '' : t(save.settings.lang, 'arena.locked') }
    render()
    return
  }
  if (act === 'arena-suggest') {
    const result = await callOnline('arena-desk', { action: 'suggest' })
    const cards = Array.isArray(result.data.suggestions) ? result.data.suggestions : []
    arenaPanel = {
      ...arenaPanel,
      suggestions: cards.flatMap((card) => {
        if (!card || typeof card !== 'object') return []
        const row = card as { index?: unknown, practice?: unknown, label?: unknown, rating?: unknown, league?: unknown, species?: unknown }
        return [{
          index: Math.floor(Number(row.index)) || 0,
          practice: Boolean(row.practice),
          label: String(row.label ?? 'Übung'),
          rating: Math.floor(Number(row.rating)) || 0,
          league: String(row.league ?? ''),
          species: Array.isArray(row.species) ? row.species.filter((id): id is string => typeof id === 'string') : []
        }]
      })
    }
    render()
    return
  }
  const result = await callOnline('arena-fight', { index: Math.floor(Number(index)) || 0 })
  if (!result.ok || !result.data.replay || typeof result.data.replay !== 'object') {
    const code = String(result.data.error || result.error || '')
    const key = arenaFightErrorKey(code)
    arenaPanel = { ...arenaPanel, note: t(save.settings.lang, key, key === 'arena.attacks' ? { n: 0 } : undefined) }
    render()
    return
  }
  noteDaily(save, 'arena', 1)
  const replay = result.data.replay as { win?: unknown, bouts?: unknown }
  const bouts = Array.isArray(replay.bouts) ? replay.bouts.flatMap((bout) => {
    if (!bout || typeof bout !== 'object') return []
    const row = bout as { allyName?: unknown, foeName?: unknown, allyHp?: unknown, allyMax?: unknown, foeHp?: unknown, foeMax?: unknown, win?: unknown }
    return [{
      allyName: String(row.allyName ?? ''),
      foeName: String(row.foeName ?? ''),
      allyHp: Math.floor(Number(row.allyHp)) || 0,
      allyMax: Math.max(1, Math.floor(Number(row.allyMax)) || 1),
      foeHp: Math.floor(Number(row.foeHp)) || 0,
      foeMax: Math.max(1, Math.floor(Number(row.foeMax)) || 1),
      win: Boolean(row.win)
    }]
  }) : []
  arenaPanel = {
    ...arenaPanel,
    rating: Math.floor(Number(result.data.rating)) || arenaPanel.rating,
    league: typeof result.data.league === 'string' ? result.data.league : arenaPanel.league,
    attacks: Math.floor(Number(result.data.attacks)) || 0,
    suggestions: [],
    replay: { label: String(result.data.label ?? ''), win: Boolean(replay.win), step: 0, bouts }
  }
  render()
  window.clearInterval(arenaTimer)
  let pace = 700
  try {
    pace = replayStepMs()
  } catch {
    pace = 700
  }
  arenaTimer = window.setInterval(() => {
    const current = arenaPanel.replay
    if (!current || current.step >= current.bouts.length - 1) {
      window.clearInterval(arenaTimer)
      return
    }
    arenaPanel = { ...arenaPanel, status: 'ready', replay: { ...current, step: current.step + 1 } }
    const card = document.querySelector('.arena-replay')
    const bout = arenaPanel.replay?.bouts[arenaPanel.replay.step]
    const bars = card?.querySelectorAll('.bar-exp span')
    const count = card?.querySelector('p.muted')
    if (card && bout && bars && bars.length >= 2 && arenaPanel.replay) {
      const names = card.querySelectorAll('b')
      if (names[0]) names[0].textContent = bout.foeName
      if (names[1]) names[1].textContent = bout.allyName
      ;(bars[0] as HTMLElement).style.width = `${Math.round(bout.foeHp / Math.max(1, bout.foeMax) * 100)}%`
      ;(bars[1] as HTMLElement).style.width = `${Math.round(bout.allyHp / Math.max(1, bout.allyMax) * 100)}%`
      if (count) count.textContent = `${arenaPanel.replay.step + 1} / ${arenaPanel.replay.bouts.length}`
      return
    }
    render()
  }, Math.min(1200, Math.max(400, pace)))
}

async function refreshRanks(): Promise<void> {
  if (!lineUp()) {
    rankView = { ...rankView, status: 'offline' }
    render()
    return
  }
  const token = ++rankToken
  rankView = { ...rankView, board: rankBoard, status: 'loading' }
  render()
  const page = parseRankPage(await loadRankPage(rankBoard, rankFriends), save?.settings.lang === 'en' ? 'en' : 'de')
  if (token !== rankToken || !save) return
  if (page.status === 'ready') {
    const reward = await claimRankRewards()
    if (token !== rankToken || !save) return
    if (reward.marks > 0) {
      save.marks += reward.marks
      try { writeSave(gameStore, save) } catch { /* the server already marked the reward claimed */ }
      const titles = reward.titles.length ? ` · ${reward.titles.join(', ')}` : ''
      masteryNote = t(save.settings.lang, 'ranks.reward', { marks: reward.marks.toLocaleString(save.settings.lang === 'en' ? 'en' : 'de-DE'), titles })
      masteryUntil = Date.now() + 4200
      window.setTimeout(() => {
        if (Date.now() < masteryUntil) return
        masteryNote = ''
        render()
      }, 4300)
    }
    const earned = RANK_FRAMES.filter((frame) => reward.titles.includes(frame.title)).map((frame) => frame.id)
    rankView = {
      ...page,
      board: rankBoard,
      excluded: mergedCloud().flagLevel === 2,
      honors: [...new Set([...page.honors, ...earned])],
      friends: rankFriends
    }
    render()
    return
  }
  rankView = { ...page, board: rankBoard, excluded: mergedCloud().flagLevel === 2, friends: rankFriends }
  render()
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

function ultUnlocked(): boolean {
  if (!save) return false
  const uid = save.active && save.mons[save.active] ? save.active : save.team[0]
  const mon = uid ? save.mons[uid] : null
  return Boolean(mon && mon.lvl >= ULT_LEVEL)
}

function showWhyChip(outcome: EncounterOutcome): void {
  if (!save || !outcome.traces.length) return
  lastWhy = outcome
  const card = whyBattle(outcome.traces, { win: outcome.win, gold: outcome.gold, exp: outcome.exp, ultUnlocked: ultUnlocked() }, save.settings.lang)
  const chip = document.getElementById('why-chip')
  const icon = document.querySelector<HTMLImageElement>('#why-chip img')
  const text = document.getElementById('why-chip-text')
  if (chip) chip.hidden = false
  if (icon) icon.src = art(whyIconFile(card.chip.icon))
  if (text) text.textContent = card.chip.sentence
  if (!outcome.win && card.tips[0]) {
    const line = document.getElementById('battle-log-text')
    if (line) line.textContent = card.tips[0]
  }
}

function openWhy(outcome: EncounterOutcome | null, focus: boolean): void {
  if (!save || !outcome) return
  const card = whyBattle(outcome.traces, { win: outcome.win, gold: outcome.gold, exp: outcome.exp, ultUnlocked: ultUnlocked() }, save.settings.lang)
  overlay = { kind: 'why', card, badge: outcome.badge }
  render()
  window.clearTimeout(whyTimer)
  const ms = whyAutoMs(card.win, focus)
  whyTimer = ms > 0 ? window.setTimeout(() => closeWhy(), ms) : 0
}

function closeWhy(): void {
  window.clearTimeout(whyTimer)
  whyTimer = 0
  overlay = null
  whyArmed = false
  if (save) save.hold = false
  persistSave(true)
  render()
  kick()
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
    openWhy(outcome, true)
    return
  }
  if (whyArmed) {
    whyArmed = false
    openWhy(outcome, false)
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

let focusCtl: { paused: boolean, stop: () => void } | null = null
let whyArmed = false
let whyTimer = 0
let lastWhy: EncounterOutcome | null = null
let battleLogs: BattleFightLog[] = []
let liveFight: BattleFightLog | null = null

function paintBattleLog(line: BattleLogLine | null): void {
  const text = document.getElementById('battle-log-text')
  const img = document.querySelector<HTMLImageElement>('#battle-log img')
  if (!text) return
  const sentence = line?.sentence ?? (save ? t(save.settings.lang, 'log.none') : '')
  const icon = line?.icon ?? 'angriff'
  if (text.dataset.line !== sentence) {
    text.dataset.line = sentence
    text.textContent = sentence
  }
  if (img && img.dataset.icon !== icon) {
    img.dataset.icon = icon
    img.src = art(logIconFile(icon))
  }
}

function openBattleLogPanel(): void {
  const sheet = document.getElementById('battle-log-sheet')
  if (!sheet || !save) return
  if (!sheet.hidden && sheet.innerHTML) {
    sheet.hidden = true
    sheet.innerHTML = ''
    return
  }
  sheet.innerHTML = `<button type="button" class="primary log-close" data-act="log-close">${t(save.settings.lang, 'log.close')}</button>${battleLogBody(save, battleLogs)}`
  sheet.hidden = false
}

function tempoArt(name: string): string {
  return art(`battle_ui/tempo/${name}.png`)
}

function paintFocusTempo(): void {
  const tempo = focusTempo(save?.settings.tempoFokus)
  const paused = Boolean(focusCtl?.paused)
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-act="focus-tempo"]')) {
    const on = button.getAttribute('data-tempo') === String(tempo)
    button.setAttribute('aria-pressed', on ? 'true' : 'false')
    const img = button.querySelector('img')
    if (img) img.src = tempoArt(`${button.getAttribute('data-tempo')}x_${on ? 'aktiv' : 'normal'}`)
  }
  const pause = document.querySelector<HTMLButtonElement>('[data-act="focus-pause"]')
  if (pause) {
    pause.setAttribute('aria-pressed', paused ? 'true' : 'false')
    pause.setAttribute('aria-label', t(save?.settings.lang, paused ? 'battle.resumePlay' : 'battle.pause'))
    const img = pause.querySelector('img')
    if (img) img.src = tempoArt(paused ? 'weiter_aktiv' : 'pause_normal')
  }
}

function showFocusChrome(): void {
  const why = document.getElementById('why-chip')
  if (why) why.hidden = true
  document.getElementById('hint-bubble')?.remove()
  document.getElementById('focus-bar')?.removeAttribute('hidden')
  const text = document.getElementById('battle-text')
  if (text) {
    text.classList.add('is-callout')
    text.setAttribute('aria-live', 'polite')
    text.style.setProperty('--callout', `url("${art('battle_ui/callout/ansage.png')}")`)
    text.style.borderImage = `url("${art('battle_ui/callout/ansage.png')}") 48 52 52 52 fill / 48px 52px 52px 52px / 12px stretch`
  }
  paintFocusTempo()
}

function hideFocusChrome(): void {
  document.getElementById('focus-bar')?.setAttribute('hidden', '')
  const text = document.getElementById('battle-text')
  if (text) {
    text.classList.remove('is-callout')
    text.style.borderImage = ''
    text.style.removeProperty('--callout')
  }
  const ally = document.getElementById('spotlight-ally')
  const foe = document.getElementById('spotlight-foe')
  if (ally) ally.hidden = true
  if (foe) foe.hidden = true
  focusCtl = null
}

function paintFocusStep(traces: EncounterOutcome['traces'], step: NonNullable<ReturnType<typeof actionAt>>, foeHp: number): void {
  const n = focusKo(traces, step.traceIndex, foeHp)
  document.querySelectorAll<HTMLImageElement>('#ko-dots img').forEach((img, index) => {
    img.src = art(index < n ? 'battle_ui/ko/voll_64.png' : 'battle_ui/ko/leer_64.png')
  })
  const side = focusSide(traces, step)
  const ally = document.getElementById('spotlight-ally')
  const foe = document.getElementById('spotlight-foe')
  if (ally) ally.hidden = side !== 'ally'
  if (foe) foe.hidden = side !== 'foe'
}

function toggleFocusPause(): void {
  if (!focusCtl) return
  focusCtl.paused = !focusCtl.paused
  paintFocusTempo()
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
    hideFocusChrome()
    done()
  }
  const catching = Boolean(outcome.catch)
  const focusOn = outcome.kind === 'guardian' && outcome.traces.length > 0
  const roadOn = !focusOn && (outcome.kind === 'wild' || outcome.kind === 'trainer') && outcome.traces.length > 0
  const queue = focusOn
    ? planBattle(outcome.traces, 'focus', focusTempo(save?.settings.tempoFokus))
    : roadOn
      ? planBattle(outcome.traces, 'road', roadTempo(speed, save?.settings.tempoWeg))
      : null
  const queueEnd = queue?.length ? queue[queue.length - 1].start + queue[queue.length - 1].dur : 0
  const floor = encounterMs(speed) + (focusOn ? 0 : 80)
  const dur = focusOn ? queueEnd : queue ? Math.max(floor, queueEnd) + (catching ? Math.round(floor * 0.46) : 0) : floor
  let skipped = false
  let backstop = 0
  const finishOnce = () => {
    window.clearTimeout(backstop)
    window.clearTimeout(impactTimer)
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    if (!skipped && outcome.win && outcome.traces.length && !focusOn) {
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
  let started = 0
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
  const fxTempo = focusOn ? focusTempo(save?.settings.tempoFokus) : roadTempo(speed, save?.settings.tempoWeg)
  setFxRunning(true, battery || fxTempo >= 3 ? BATTERY_FPS : 60)
  const reduced = effectsReduced()
  if (fxHost) onBattleFxReady(() => beginBattleMood(weather, reduced, speed))
  const allowFlash = Boolean(save?.settings.flashes) && !reduced
  let shakeStart = 0
  let shakeFor = 0
  let shakePx = 0
  const battleEnd = focusOn ? dur : queue ? (catching ? queueEnd : dur) : catching ? dur * 0.54 : dur
  let queueShown = -1
  let held = 0
  let holdStart = -1
  if (focusOn) {
    focusCtl = { paused: false, stop: () => { skipped = true; finishOnce() } }
    showFocusChrome()
  }
  warmChapterArt()
  announceWeather()
  if (save && outcome.traces.length) {
    liveFight = battleLogFromTraces(outcome.traces, save.settings.lang)
    battleLogs = rememberBattleLog(battleLogs, liveFight)
    const sheet = document.getElementById('battle-log-sheet')
    if (sheet) {
      sheet.hidden = true
      sheet.innerHTML = ''
    }
    paintBattleLog(liveFight.bouts[0]?.lines[0] ?? null)
  }
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
      if (queue) noteProgress()
      if (focusCtl?.paused) {
        if (holdStart < 0) holdStart = now
      } else if (holdStart >= 0) {
        held += now - holdStart
        holdStart = -1
      }
      let motion = started === 0 ? 0 : now - started - held - (holdStart >= 0 ? now - holdStart : 0)
      if (frozen >= 0) motion = frozen
      const elapsed = frozen >= 0 || !(scriptAt > 0) ? motion : Math.max(0, motion - scriptAt)
      const queueStep = queue ? actionAt(queue, Math.min(elapsed, queueEnd)) : null
      if (roadOn && started > 0 && queueStep?.phase === 'resultat' && (outcome.win || now - started >= floor)) showWhyChip(outcome)
      let armFx = false
      if (queue && queueStep) {
        const stepIndex = queue.indexOf(queueStep)
        if (stepIndex !== queueShown) {
          queueShown = stepIndex
          window.clearTimeout(impactTimer)
          armFx = queueStep.fx
        }
      }
      const shot = queueStep ? shotFromAction(outcome.traces, queueStep) : null
      if (holdCounter && shot?.counter) {
        if (counterAt < 0) counterAt = elapsed
        if (frozen < 0 && elapsed - counterAt >= 320) frozen = elapsed
      }
      if (shot && allyHp && foeHp) {
        paintHp('ally-hp', shot.allyHp, shot.allyMax)
        paintHp('foe-hp', shot.foeHp, shot.foeMax)
        paintAdvantage(shot.allySpecies, shot.foeSpecies, shot.hits[0]?.band)
        const dropped = queue
          ? armFx
          : ((prevAlly != null && shot.allyHp < prevAlly) || (prevFoe != null && shot.foeHp < prevFoe))
        if (dropped) {
          hitAt = elapsed
          const hit = shot.hits.find((row) => row.ult) ?? shot.hits.find((row) => row.kind === 'hit') ?? shot.hits[0]
          if (hit?.ult) showUltCard(hit.ult, speed)
          if (hit && fxHost && allyActor && foeActor) {
            const allyPt = stagePoint(allyActor, fxHost)
            const foePt = stagePoint(foeActor, fxHost)
            const from = hit.from === 'ally' ? allyPt : foePt
            const to = hit.from === 'ally' ? foePt : allyPt
            playBattleFx({ type: hit.type, crit: hit.crit, band: hit.band, awaken: Boolean(hit.awaken), shimmer: Boolean(outcome.shiny), reduced, tempo: speed, from, to, kind: hit.kind, ult: Boolean(hit.ult) })
            const attackerId = hit.from === 'ally' ? shot.allySpecies : shot.foeSpecies
            const struck = hit.from === 'ally' ? foeActor : allyActor
            const keyMove = Boolean(hit.crit || hit.ko || hit.ult || hit.kind === 'status' || hit.helper || hit.pulse)
            if ((hit.kind === 'hit' || hit.ult) && !(roadOn && !keyMove)) showMove(hit.ult ? ultName(hit.ult) : attackTitle(attackerId, hit.type), hit.from === 'ally' ? allyActor : foeActor, k)
            paintWeatherTag(hit.weather, to.x, to.y)
            const paintNumber = () => {
              if (gen !== playGen || !hit) return
              if ((hit.kind === 'hit' || hit.kind === 'heal') && hit.amount > 0) {
                const grade = hitGrade(hit.band, hit.crit)
                const hold = numberHoldMs(speed)
                const above = numberPoint(struck, fxHost)
                if (queue) spawnFloat(floats, hit, typeFx(hit.type).base, hit.from === 'ally' ? '70%' : '30%', hold, above)
                else {
                  const shown = showHitNumber(above.x, above.y, hit.amount, grade, hold, hit.weather ?? 1)
                  if (!shown) spawnFloat(floats, hit, typeFx(hit.type).base, hit.from === 'ally' ? '70%' : '30%', hold, above)
                }
                struck.classList.remove('recoil')
                void struck.offsetWidth
                struck.classList.add('recoil')
                const picture = struck.querySelector('img')
                if (picture instanceof HTMLImageElement) picture.style.animationDuration = `${RECOIL_MS * k}ms`
              }
              if (save?.settings.shake && hit.kind === 'hit' && (!queue || hit.crit || hit.ult)) {
                const spec = hit.ult ? bossUltShake({ speed, reduced }) : cameraShake(hitGrade(hit.band, hit.crit), 'hit', { speed, reduced })
                shakeStart = performance.now() - started
                shakeFor = spec.ms
                shakePx = spec.px
              }
              if (allowFlash && hit.crit && critFlash) critFlash.style.opacity = '0.15'
            }
            if (!queueStep || hitNumberPhase(queueStep.phase)) paintNumber()
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
        poseActor(allyActor, 'ally', allyMove, allyHit, allyKo, elapsed, reach, slide)
        if (allyMove >= 0 || enter > 0) clampActorPose(allyActor, field)
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
        poseActor(foeActor, 'foe', foeMove, foeHit, foeKo, elapsed + 180, reach, 0)
        if (foeMove >= 0) clampActorPose(foeActor, field)
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
      const layers = reduced ? { far: 0, mid: 0, near: 0 } : parallaxShift(pose > 0 ? lungeOffset(pose, reach) : 0, 0)
      const far = document.getElementById('parallax-far')
      const mid = document.getElementById('parallax-mid')
      const near = document.getElementById('parallax-near')
      if (far) far.style.transform = `translateX(${layers.far}px)`
      if (mid) mid.style.transform = `translateX(${layers.mid}px)`
      if (near) near.style.transform = `translateX(${layers.near}px)`
      if (focusOn && queueStep && shot) paintFocusStep(outcome.traces, queueStep, shot.foeHp)
      if (liveFight) {
        const logged = queueStep
          ? lineFor(liveFight, queueStep.traceIndex, queueStep.frameIndex, queueStep.hitIndex)
          : shot
            ? lineForFrame(liveFight, shot.allyHp, shot.foeHp, shot.text)
            : null
        if (logged) paintBattleLog(logged)
      }
      if (text && shot && elapsed < battleEnd && text.textContent !== shot.text) text.textContent = shot.text
      if (allyName && shot) setActorName(allyName, shot.allyName)
      if (foeName && shot) setActorName(foeName, outcome.shiny ? `${shot.foeName} · ${t(save?.settings.lang, 'battle.shimmer')}` : shot.foeName)
      if (shot) {
        paintSprite(allyImg, shot.allySpecies, null)
        paintSprite(foeImg, shot.foeSpecies, outcome.shiny)
      } else if (text && outcome.lines[0] && elapsed < battleEnd && text.textContent !== outcome.lines[0]) text.textContent = outcome.lines[0]
      if (seal && catching && outcome.catch) {
        const age = elapsed - battleEnd
        if (age < 0) seal.style.opacity = '0'
        else paintSeal(seal, age, k, outcome.catch.success)
        if (text && age >= 0) {
          const caption = sealCaption(outcome, age >= 900 * k)
          if (text.textContent !== caption) text.textContent = caption
        }
      }
      if (started === 0 && shot) {
        started = performance.now()
        document.getElementById('battle')?.setAttribute('data-fight-at', String(started))
      }
      if (started === 0 || elapsed < dur) raf = requestAnimationFrame(frame)
      else finishOnce()
    } catch (err) {
      console.error(err)
      finishOnce()
    }
  }
  const run = () => {
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
  if (node.dataset.name === name) return
  node.dataset.name = name
  const arrow = node.querySelector('img')
  node.textContent = name
  if (arrow) node.appendChild(arrow)
}

function paintMark(id: string, mark: string | null, stacks: number): void {
  const node = document.getElementById(id)
  if (!(node instanceof HTMLButtonElement)) return
  const key = `${mark ?? ''}:${Math.max(0, stacks)}`
  if (node.dataset.mark === key) return
  node.dataset.mark = key
  if (!mark || !(mark in AILMENTS)) {
    node.hidden = true
    return
  }
  const spec = AILMENTS[mark as AilmentId]
  node.hidden = false
  node.style.setProperty('--status-chip', `url("${art('battle_ui/status/chip.png')}")`)
  const img = node.querySelector('img')
  if (img instanceof HTMLImageElement) {
    img.src = art(ailmentIcon(spec.id))
    img.alt = spec.name
  }
  const name = node.querySelector('.status-name')
  if (name) name.textContent = t(save?.settings.lang, `log.ailment.${spec.id}`)
  const pile = node.querySelector('.status-stack')
  const count = node.querySelector('.status-stack b')
  if (pile instanceof HTMLElement) pile.hidden = stacks <= 1
  if (count) count.textContent = String(Math.max(1, stacks))
  const piles = spec.id === 'giftnebel' && stacks > 1 ? ` Stapel ${stacks}.` : ''
  node.dataset.tip = `${spec.tip}${piles}`
}

function paintHp(id: string, hp: number, max: number): void {
  const bar = document.getElementById(id)
  if (!(bar instanceof HTMLElement) || !(max > 0)) return
  const next = Math.max(0, Math.min(100, (hp / max) * 100))
  const prev = Number(bar.dataset.pct ?? next)
  const ghost = document.getElementById(`${id}-ghost`)
  if (ghost instanceof HTMLElement && next < prev - 0.5) {
    ghost.style.width = `${prev}%`
    window.setTimeout(() => { ghost.style.width = `${next}%` }, 400)
  } else if (ghost instanceof HTMLElement) ghost.style.width = `${next}%`
  bar.dataset.pct = String(next)
  bar.style.width = `${next}%`
  const num = document.getElementById(`${id}-num`)
  if (num) num.textContent = hpLabel(hp, max)
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
  if (!save) return false
  return activeSynergies(teamTypes(), save.synergy).length > 0
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

function poseActor(actor: HTMLElement, side: 'ally' | 'foe', move: number, hit: number, ko: number, idle: number, reach: number, extraX: number): void {
  const placed = `translate(-50%, -100%)${extraX ? ` translate(${extraX.toFixed(1)}px, 0px)` : ''}`
  if (actor.style.transform !== placed) actor.style.transform = placed
  const sprite = actor.querySelector('img.sprite')
  if (sprite instanceof HTMLElement) {
    const motion = spriteMotion(side, move, hit, ko, idle, reach)
    if (sprite.style.transform !== motion) sprite.style.transform = motion
  }
  const spot = actor.querySelector('img.spotlight')
  if (spot instanceof HTMLElement) {
    const x = lungeOffset(move, reach) * (side === 'ally' ? 1 : -1) + hitShake(hit)
    const y = koPose(ko).drop
    const placedSpot = `translateX(calc(-50% + ${x.toFixed(1)}px)) translateY(${y.toFixed(1)}px)`
    if (spot.style.transform !== placedSpot) spot.style.transform = placedSpot
  }
  const opacity = String(koPose(ko).opacity)
  if (actor.style.opacity !== opacity) actor.style.opacity = opacity
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
  const filled = Math.max(0, Math.min(5, Math.floor(n)))
  const ready = open && filled >= 5
  const paintKey = `${filled}:${open ? 1 : 0}:${ready ? 1 : 0}`
  if (node.dataset.paint === paintKey) return
  node.dataset.paint = paintKey
  node.hidden = false
  node.dataset.n = String(filled)
  node.dataset.open = open ? '1' : '0'
  node.classList.toggle('is-ready', ready)
  node.classList.toggle('is-locked', !open)
  node.querySelectorAll<HTMLImageElement>('.ult-seg').forEach((img, index) => {
    const file = ready ? 'seg_bereit_s' : index < filled ? 'seg_voll_s' : 'seg_leer_s'
    const src = art(`battle_ui/ult/${file}.png`)
    if (!img.src.endsWith(src) && img.getAttribute('src') !== src) img.src = src
  })
  const lock = node.querySelector('.ult-lock')
  const banner = node.querySelector('.ult-ready')
  if (lock instanceof HTMLElement) lock.hidden = open
  if (banner instanceof HTMLElement) banner.hidden = !ready
  const note = lock?.querySelector('b')
  if (note) note.textContent = t(save?.settings.lang, 'battle.ultLocked')
  if (banner) banner.textContent = t(save?.settings.lang, 'battle.ultReady')
}

function paintAdvantage(allyId: string, foeId: string, band?: 'strong' | 'weak' | 'neutral'): void {
  const chip = document.getElementById('adv-chip')
  if (!(chip instanceof HTMLElement)) return
  let allyType: TypeId
  let foeType: TypeId
  try {
    allyType = species(allyId).type
    foeType = species(foeId).type
  } catch {
    chip.hidden = true
    return
  }
  const edge = band ?? typeEdge(typeMult(allyType, foeType))
  const formName = edge === 'strong' ? 'stark' : edge === 'weak' ? 'schwach' : 'neutral'
  const paintKey = `${allyId}:${foeId}:${formName}`
  if (chip.dataset.paint === paintKey) {
    chip.hidden = false
    return
  }
  chip.dataset.paint = paintKey
  chip.hidden = false
  const from = document.getElementById('adv-from')
  const to = document.getElementById('adv-to')
  const form = document.getElementById('adv-form')
  const word = document.getElementById('adv-word')
  if (from instanceof HTMLImageElement) from.src = art(`icons/type_${allyType}_128.png`)
  if (to instanceof HTMLImageElement) to.src = art(`icons/type_${foeType}_128.png`)
  if (form instanceof HTMLImageElement) form.src = art(`battle_ui/adv/${formName}.png`)
  if (word) word.textContent = t(save?.settings.lang, `log.tag.${edge === 'strong' ? 'strong' : edge === 'weak' ? 'weak' : 'neutral'}`)
  chip.style.borderImage = `url("${art(`battle_ui/adv/pill_${formName}.png`)}") 34 40 40 40 fill / 34px 40px 40px 40px / 8px stretch`
}

function paintWeatherTag(factor: number | undefined, x: number, y: number): void {
  const node = document.getElementById('wx-tag')
  const pct = weatherPct(factor)
  if (!(node instanceof HTMLElement) || !pct) {
    if (node instanceof HTMLElement) node.hidden = true
    return
  }
  node.hidden = false
  node.style.left = `${Math.round(x)}px`
  node.style.top = `${Math.round(y - 96)}px`
  node.style.borderImage = `url("${art('battle_ui/wetter/tag.png')}") 24 26 26 26 fill / 24px 26px 26px 26px / 5px stretch`
  const text = document.getElementById('wx-tag-text')
  if (text) text.textContent = pct
  clearWeatherTag(node)
}

function clearWeatherTag(node: HTMLElement): void {
  const host = node.offsetParent instanceof HTMLElement ? node.offsetParent : node.parentElement
  if (!(host instanceof HTMLElement)) return
  const obstacles: HTMLElement[] = []
  const dock = document.querySelector('.guard-dock')
  if (dock instanceof HTMLElement && dock.getClientRects().length > 0) obstacles.push(dock)
  const lock = document.querySelector('#ally-actor .ult-lock')
  if (lock instanceof HTMLElement && !lock.hidden && lock.getClientRects().length > 0) obstacles.push(lock)
  for (const sel of ['#ally-hp-num', '#foe-hp-num', '#ally-name', '#foe-name', '#ally-status', '#foe-status', '#wx-chip', '#wx-announce']) {
    const plate = document.querySelector(sel)
    if (plate instanceof HTMLElement && !plate.hidden && plate.getClientRects().length > 0) obstacles.push(plate)
  }
  if (!obstacles.length) return
  const hostBox = host.getBoundingClientRect()
  const scaleX = hostBox.width / (host.clientWidth || hostBox.width || 1) || 1
  const scaleY = hostBox.height / (host.clientHeight || hostBox.height || 1) || 1
  const gap = 12
  for (let pass = 0; pass < 4; pass++) {
    const tag = node.getBoundingClientRect()
    if (tag.width < 2 || tag.height < 2) return
    let bestDx = 0
    let bestDy = 0
    let best = Number.POSITIVE_INFINITY
    for (const obstacle of obstacles) {
      const box = obstacle.getBoundingClientRect()
      if (!(tag.left < box.right && tag.right > box.left && tag.top < box.bottom && tag.bottom > box.top)) continue
      const options = [
        { dx: box.left - gap - tag.right, dy: 0 },
        { dx: box.right + gap - tag.left, dy: 0 },
        { dx: 0, dy: box.top - gap - tag.bottom },
        { dx: 0, dy: box.bottom + gap - tag.top }
      ]
      for (const option of options) {
        const left = tag.left + option.dx
        const top = tag.top + option.dy
        if (left < hostBox.left + 16 || top < hostBox.top + 16) continue
        if (left + tag.width > hostBox.right - 16 || top + tag.height > hostBox.bottom - 16) continue
        const cost = Math.abs(option.dx) + Math.abs(option.dy)
        if (cost < best) {
          best = cost
          bestDx = option.dx
          bestDy = option.dy
        }
      }
    }
    if (best === Number.POSITIVE_INFINITY) return
    const left = (Number.parseFloat(node.style.left) || 0) + bestDx / scaleX
    const top = (Number.parseFloat(node.style.top) || 0) + bestDy / scaleY
    node.style.left = `${Math.round(Math.max(16, left))}px`
    node.style.top = `${Math.round(Math.max(16, top))}px`
  }
}

let ultCardTimer = 0

function showUltCard(pattern: UltPattern, tempo: number): void {
  const card = document.getElementById('ult-card')
  const world = document.getElementById('battle-world')
  if (!(card instanceof HTMLElement)) return
  const key = pattern === 'durchschlag' ? 'log.ult.strike' : pattern === 'schildwall' ? 'log.ult.wall' : pattern === 'impuls' ? 'log.ult.impulse' : pattern === 'fessel' ? 'log.ult.fetter' : 'log.ult.glow'
  const name = document.getElementById('ult-card-name')
  const sub = document.getElementById('ult-card-pattern')
  if (name) name.textContent = t(save?.settings.lang, key)
  if (sub) sub.textContent = t(save?.settings.lang, 'battle.ultReady')
  card.hidden = false
  card.style.borderImage = `url("${art('battle_ui/callout/ult.png')}") 64 64 68 64 fill / 64px 64px 68px 64px / 12px stretch`
  world?.classList.add('is-ult')
  window.clearTimeout(ultCardTimer)
  const pace = tempo === 2 || tempo === 3 ? tempo : 1
  ultCardTimer = window.setTimeout(() => {
    card.hidden = true
    world?.classList.remove('is-ult')
  }, Math.round(900 / pace))
}

function announceWeather(): void {
  const node = document.getElementById('wx-announce')
  if (!(node instanceof HTMLElement) || !save) return
  const weather = weatherAt(Date.now())
  const row = WEATHER_SHIFTS[weather]
  if (!row || weather === 'klar') {
    node.hidden = true
    return
  }
  const lang = save.settings.lang
  const bit = (shift: { type: TypeId; pct: number }, sign: string) => `${typeLabel(lang, shift.type, typeName(shift.type))} ${sign}${shift.pct} %`
  const parts = [...row.up.map((shift) => bit(shift, '+')), ...row.down.map((shift) => bit(shift, '−'))]
  node.hidden = false
  node.textContent = `${weatherLabel(lang, weather)}: ${parts.join(', ')}`
  window.setTimeout(() => { node.hidden = true }, 1200)
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

function paintCrest(node: HTMLImageElement, badge: string): void {
  const file = crestArt(badge)
  node.onerror = () => {
    if (node.src.includes('achieve.webp')) {
      node.hidden = true
      return
    }
    node.onerror = () => { node.hidden = true }
    node.removeAttribute('srcset')
    node.src = art('ui/achieve.webp')
  }
  node.srcset = file.startsWith('crests/') ? `${art(file)} 1x, ${art(file.replace('.webp', '@2x.webp'))} 2x` : ''
  node.src = art(file)
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
    paintCrest(crest, badge)
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

function spawnFloat(host: HTMLElement | null, hit: { amount: number; crit: boolean; band: 'strong' | 'weak' | 'neutral'; awaken?: boolean }, base: string, left = '68%', holdMs = numberHoldMs(1), point?: { x: number, y: number }): void {
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
  const text = label ? `${label} ${hit.amount}` : String(hit.amount)
  const size = Math.max(40, Math.round(36 * style.scale))
  const hostWidth = host.clientWidth || 1080
  const center = (Number.parseFloat(left) / 100) * hostWidth
  const half = text.length * size * 0.34 + 12
  const clamped = Math.min(hostWidth - half, Math.max(half, Number.isFinite(center) ? center : hostWidth * 0.5))
  node.hidden = false
  node.textContent = text
  node.style.left = `${Math.round(point ? point.x : clamped)}px`
  node.style.transform = 'translateX(-50%)'
  node.style.top = point ? `${Math.round(point.y)}px` : '46%'
  node.style.color = style.color
  node.style.fontSize = `${size}px`
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
  const counted = Math.min(Math.max(0, rawMs), offlineCapMs(save))
  const total = Math.floor(counted / BASE_ENCOUNTER_MS)
  if (total < OFFLINE_BLOCK && rawMs < WELCOME_AFTER_MS) {
    const quiet = simulateOffline(save, rawMs, Date.now())
    animating = false
    overlay = null
    lastTick = Date.now()
    if (quiet.summary.catches.length) buzz('unlock')
    if (quiet.summary.badges.length) buzz('crest')
    try { writeSave(gameStore, save) } catch { /* keep playing */ }
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
  bankPlay(save, counted)
  bankRoad(save, counted)
  save.roadAt = Date.now()
  save.lastSeenAt = stopped ? reached : Date.now()
  lastTick = Date.now()
  try { writeSave(gameStore, save) } catch { /* ignore */ }
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

function onSubmit(event: Event): void {
  const form = event.target
  if (!(form instanceof HTMLFormElement) || form.dataset.act !== 'chat-form') return
  event.preventDefault()
  void sendChat()
}

function onClick(event: Event): void {
  if (ignoreClick) {
    ignoreClick = false
    return
  }
  const target = event.target
  if (!(target instanceof Element)) return
  const logSheet = document.getElementById('battle-log-sheet')
  if (logSheet && !logSheet.hidden && !target.closest('#battle-log-sheet') && !target.closest('[data-act="battle-log"]')) {
    logSheet.hidden = true
    logSheet.innerHTML = ''
    if (!target.closest('[data-act]')) return
  }
  const node = target.closest('[data-act]')
  if (!node) {
    const bubble = document.getElementById('hint-bubble')
    if (bubble && save && closeHint(bubble.getAttribute('data-hint') ?? '')) bubble.remove()
    const unlock = document.getElementById('unlock-hint')
    if (unlock && save) {
      closeUnlockHint(unlock.getAttribute('data-hint') ?? '')
      unlock.remove()
    }
    if (focusCtl && target.closest('#battle-world') && !target.closest('.focus-bar')) toggleFocusPause()
    return
  }
  if (target.closest('.focus-bar')) event.stopPropagation()
  const act = node.getAttribute('data-act')
  if (act !== 'hint-close' && save?.onboarding) {
    const bubble = document.getElementById('hint-bubble')
    const id = bubble?.getAttribute('data-hint') ?? ''
    if (id && closeHint(id)) bubble?.remove()
  }
  if (save && act !== 'unlock-hint') {
    const bubble = document.getElementById('unlock-hint')
    const hintId = bubble?.getAttribute('data-hint') ?? ''
    if (hintId) closeUnlockHint(hintId)
  }
  if (act === 'unlock-hint' && save) {
    closeUnlockHint(node.getAttribute('data-hint') ?? '')
    render()
    return
  }
  if (act === 'log-close') {
    const sheet = document.getElementById('battle-log-sheet')
    if (sheet) {
      sheet.hidden = true
      sheet.innerHTML = ''
    }
    return
  }
  if (act === 'battle-log') {
    if (animating) {
      openBattleLogPanel()
      return
    }
    overlay = overlay?.kind === 'battle-log' ? null : { kind: 'battle-log' }
    render()
    return
  }
  if (act === 'focus-tempo' && save) {
    const tempo = node.getAttribute('data-tempo') === '2' ? 2 : 1
    save.settings.tempoFokus = tempo
    try { writeSave(gameStore, save) } catch { /* the next warden still reads the memory copy */ }
    paintFocusTempo()
    return
  }
  if (act === 'hint-close' && save) {
    if (!closeHint(node.getAttribute('data-hint') ?? '')) return
    render()
    return
  }
  if (act === 'why-open' && save) {
    save.hold = true
    whyArmed = true
    if (!animating) openWhy(lastWhy, false)
    return
  }
  if (act === 'why-log') {
    window.clearTimeout(whyTimer)
    whyTimer = 0
    overlay = { kind: 'battle-log', back: 'why' }
    render()
    return
  }
  if (act === 'why-next') {
    closeWhy()
    return
  }
  if (act === 'focus-skip') {
    focusCtl?.stop()
    return
  }
  if (act === 'focus-pause') {
    toggleFocusPause()
    return
  }
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
        try { writeSave(gameStore, keptSave) } catch { /* keep the door */ }
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
    if (next === 'activities' && chestLessonOpen(save)) {
      activity = 'chests'
      if (screen !== 'activities') chestCard = 0
    }
    clearNew(save, next === 'social' ? 'friends' : next)
    if (next === 'activities') clearNew(save, activity)
    screen = next
    overlay = null
    moreOpen = false
    mapOpen = false
    render()
    if (screen === 'options') void refreshOwnLabel()
    if (screen === 'ranks') void refreshRanks()
    if (screen === 'arena') void refreshArena()
    if (screen === 'social') void refreshSocial()
    if (screen === 'trade') void refreshTrade()
    if (screen === 'guild') void refreshGuild()
    if (screen === 'chat') void refreshChat()
    kick()
    return
  }
  if (act === 'chat-age') {
    const year = Math.floor(Number((document.getElementById('chat-year') as HTMLInputElement | null)?.value))
    const adult = year > 1900 && new Date().getFullYear() - year >= 13
    void callOnline('chat-send', { action: 'age', adult }).then((result) => {
      chatPanel = { ...chatPanel, adult: result.ok ? adult : null, status: result.ok ? 'ready' : 'age', note: result.ok ? '' : result.error }
      render()
    })
    return
  }
  if (act === 'chat-channel') {
    const next = node.getAttribute('data-id') === 'dm' ? 'dm' : 'guild'
    chatPanel = { ...chatPanel, channel: next, note: '' }
    void refreshChat()
    return
  }
  if (act === 'guild-found' || act === 'guild-join' || act === 'guild-leave' || act === 'guild-phrase' || act === 'guild-search' || act === 'guild-accept' || act === 'guild-decline' || act === 'guild-kick' || act === 'guild-role' || act === 'guild-mute') {
    void guildAction(act, node)
    return
  }
  if (act === 'trade-offer' || act === 'trade-lock' || act === 'trade-confirm' || act === 'trade-cancel') {
    void tradeAction(act)
    return
  }
  if (act === 'expedition-quest') {
    expeditionPick = node.getAttribute('data-id') ?? ''
    render()
    return
  }
  if (act === 'expedition-send') {
    if (!save) return
    const reason = startExpedition(save, node.getAttribute('data-id') ?? expeditionPick, node.getAttribute('data-uid') ?? '', Date.now())
    if (reason) save.log.push({ t: Date.now(), text: reason })
    else try { writeSave(gameStore, save) } catch { /* the run is in the save */ }
    render()
    return
  }
  if (act === 'arena-pick') {
    const uid = node.getAttribute('data-uid') ?? ''
    if (!uid || !save || expeditionBusy(save, uid) || arenaPanel.slots.includes(uid) || arenaPanel.slots.length >= 6) return
    arenaPanel = { ...arenaPanel, slots: [...arenaPanel.slots, uid] }
    render()
    return
  }
  if (act === 'arena-clear') {
    const index = Number(node.getAttribute('data-index'))
    arenaPanel = { ...arenaPanel, slots: arenaPanel.slots.filter((_, place) => place !== index) }
    render()
    return
  }
  if (act === 'friend-ask' || act === 'friend-accept' || act === 'friend-decline' || act === 'friend-remove' || act === 'friend-gift' || act === 'friend-invite' || act === 'friend-claim' || act === 'friend-online' || act === 'coop-attempt' || act === 'coop-claim') {
    void socialAction(act, node.getAttribute('data-code'))
    return
  }
  if (act === 'arena-save' || act === 'arena-suggest' || act === 'arena-fight') {
    void arenaAction(act, node.getAttribute('data-index'))
    return
  }
  if (act === 'tree-node') {
    treePick = node.getAttribute('data-id') || treePick
    render()
    return
  }
  if (act === 'tree-buy' || act === 'tree-reset') {
    if (!save) return
    const reason = act === 'tree-buy'
      ? buyNode(save, node.getAttribute('data-id') || treePick)
      : respecTree(save, Date.now())
    if (reason) save.log.push({ t: Date.now(), text: reason })
    else try { writeSave(gameStore, save) } catch { /* keep the local tree */ }
    render()
    return
  }
  if (act === 'research-start') {
    if (!save) return
    const line = node.getAttribute('data-id') ?? ''
    if (!RESEARCH_LINES.includes(line as ResearchLine)) return
    const problem = startResearch(save, line as ResearchLine, Date.now())
    if (problem) masteryNote = t(save.settings.lang, `research.err.${problem}`)
    else try { writeSave(gameStore, save) } catch { /* the job is already on the save */ }
    masteryUntil = Date.now() + 4200
    render()
    return
  }
  if (act === 'rank-friends') {
    rankFriends = !rankFriends
    void refreshRanks()
    return
  }
  if (act === 'rank-board') {
    const next = node.getAttribute('data-board') ?? ''
    if (!isBoard(next)) return
    rankBoard = next
    void refreshRanks()
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
  if (act === 'quit-yes') {
    void import('./shell/native').then((mod) => mod.exitApp())
    return
  }
  if (act === 'close') {
    if (overlay?.kind === 'battle-log' && overlay.back === 'why' && lastWhy) {
      openWhy(lastWhy, false)
      return
    }
    overlay = null
    if (showAwaken()) return
    render()
    kick()
    return
  }
  if (act === 'synergy-auto') {
    delete save.synergy
    render()
    return
  }
  if (act === 'synergy') {
    const id = node.getAttribute('data-id') ?? ''
    if (!synergyKnown(id)) return
    const types = teamTypes()
    const present = new Set(presentSynergies(types).map((row) => row.id))
    if (!present.has(id)) return
    const current = activeSynergies(types, save.synergy).map((row) => row.id)
    const next = current.includes(id)
      ? current.filter((row) => row !== id)
      : current.length >= SYNERGY_CAP
        ? [...current.slice(1), id]
        : [...current, id]
    save.synergy = next
    render()
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
    try { writeSave(gameStore, save) } catch { /* ignore */ }
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
    try { writeSave(gameStore, save) } catch { /* ignore */ }
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
    equipDailyFrame(save, node.getAttribute('data-id') ?? '')
    render()
    return
  }
  if (act === 'activity') {
    const id = node.getAttribute('data-id')
    activity = id === 'wheel' || id === 'chests' ? id : 'hort'
    if (activity === 'wheel') clearNew(save, 'wheel')
    if (chestLessonOpen(save)) {
      activity = 'chests'
      if (screen !== 'activities') chestCard = 0
    }
    screen = 'activities'
    render()
    return
  }
  if (act === 'chest-lesson') {
    if (node.getAttribute('data-id') === 'skip') finishChestLesson()
    else stepChestLesson(1)
    return
  }
  if (act === 'chest-claim') {
    claimRoad(save)
    try { writeSave(gameStore, save) } catch { /* ignore */ }
    render()
    return
  }
  if (act === 'chest-buy') {
    const tier = node.getAttribute('data-tier') === 'silber' ? 'silber' : 'kiesel'
    const reason = buyChestForGold(save, tier, Date.now())
    if (reason) save.log.push({ t: Date.now(), text: reason })
    try { writeSave(gameStore, save) } catch { /* ignore */ }
    render()
    return
  }
  if (act === 'chest-marks') {
    const tier = node.getAttribute('data-tier') === 'sternen' ? 'sternen' : 'gold'
    const reason = buyChestForMarks(save, tier)
    if (reason) save.log.push({ t: Date.now(), text: reason })
    try { writeSave(gameStore, save) } catch { /* ignore */ }
    render()
    return
  }
  if (act === 'melt') {
    const reason = meltDuplicate(save, node.getAttribute('data-uid') ?? '')
    if (reason) save.log.push({ t: Date.now(), text: reason })
    try { writeSave(gameStore, save) } catch { /* ignore */ }
    render()
    return
  }
  if (act === 'craft') {
    const crafted = node.getAttribute('data-id') ?? ''
    const reason = craftSpecies(save, crafted, Date.now())
    if (reason) save.log.push({ t: Date.now(), text: reason })
    else {
      const event = unlockEvent(crafted, 'workshop')
      if (event) cloud?.track(event.event, event.props)
    }
    try { writeSave(gameStore, save) } catch { /* ignore */ }
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
    try { writeSave(gameStore, save) } catch { /* ignore */ }
    render()
    return
  }
  if (act === 'debug-stars' && debug) {
    debugStarChests(save)
    try { writeSave(gameStore, save) } catch { /* ignore */ }
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
    for (const event of eventsForLoot(tier, grants, shardsBefore, save.shards)) cloud?.track(event.event, event.props)
    overlay = act === 'chest-all' ? { kind: 'chest-summary', grants } : { kind: 'chest-reveal', grant: grants[0] }
    try { writeSave(gameStore, save) } catch { /* ignore */ }
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
    try { writeSave(gameStore, save) } catch { /* ignore */ }
    render()
    return
  }
  if (act === 'buy-prize') {
    const reason = buyPrize(save, node.getAttribute('data-id') ?? '', Date.now())
    wheelNote = reason ?? 'Im PC.'
    try { writeSave(gameStore, save) } catch { /* ignore */ }
    render()
    return
  }
  if (act === 'buy-hort') {
    const reason = buyHortSlot(save)
    save.log.push({ t: Date.now(), text: reason ?? 'Ein Hortplatz ist offen.' })
    if (save.log.length > 50) save.log.splice(0, save.log.length - 50)
    try { writeSave(gameStore, save) } catch { /* ignore */ }
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
  if (act === 'export-save') {
    exportSaveJson()
    return
  }
  if (act === 'reset') {
    overlay = { kind: 'confirm-reset' }
    render()
    return
  }
  if (act === 'reset-yes') {
    blockSaves()
    blockSaveWrites()
    save = null
    keptSave = null
    applyLocalReset(localStorage)
    applyLocalReset(gameStore)
    void gameStore.flush()
    window.location.reload()
  }
}

function onChange(event: Event): void {
  const target = event.target
  if (target instanceof HTMLSelectElement && target.dataset.act === 'chat-friend') {
    chatPanel = { ...chatPanel, friend: target.value, channel: 'dm' }
    void refreshChat()
    return
  }
  syncField(target)
}

function onInput(event: Event): void {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  if (target.dataset.field === 'chat') {
    chatPanel = { ...chatPanel, draft: target.value }
    return
  }
  if (target.dataset.field === 'guild-name' || target.dataset.field === 'guild-tag' || target.dataset.field === 'guild-query' || target.dataset.field === 'guild-code') {
    if (target.dataset.field === 'guild-name') guildPanel = { ...guildPanel, draftName: target.value }
    if (target.dataset.field === 'guild-tag') guildPanel = { ...guildPanel, draftTag: target.value }
    if (target.dataset.field === 'guild-query') guildPanel = { ...guildPanel, draftQuery: target.value }
    if (target.dataset.field === 'guild-code') guildPanel = { ...guildPanel, draftCode: target.value }
    if (save && (target.dataset.field === 'guild-name' || target.dataset.field === 'guild-tag')) {
      const block = guildFoundBlock(crestCount(save.badges), save.gold, save.region, guildPanel.draftName ?? '', guildPanel.draftTag ?? '')
      const button = document.querySelector('[data-act="guild-found"]')
      const reason = document.getElementById('guild-reason')
      if (button instanceof HTMLButtonElement) button.disabled = block.disabled
      if (reason) {
        reason.textContent = !block.disabled
          ? ''
          : block.reason === 'crests'
            ? t(save.settings.lang, 'guild.reason.crests', { n: crestCount(save.badges) })
            : block.reason === 'gold'
              ? t(save.settings.lang, 'guild.reason.gold', { gold: foundCost(save.region).toLocaleString(save.settings.lang === 'en' ? 'en' : 'de-DE') })
              : t(save.settings.lang, 'guild.reason.name')
      }
    }
    return
  }
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
  if (fieldSkipsRender(field)) return
  if (field === 'loop') setLoop(save, target instanceof HTMLInputElement ? target.checked : save.loop)
  if (field === 'auto' && target instanceof HTMLInputElement) save.settings.autoSwitch = target.checked
  if (field === 'card' && target instanceof HTMLInputElement) save.settings.catchCard = target.checked
  if (field === 'shake' && target instanceof HTMLInputElement) save.settings.shake = target.checked
  if (field === 'flash' && target instanceof HTMLInputElement) save.settings.flashes = target.checked
  if (field === 'motion' && target instanceof HTMLInputElement) save.settings.reduceMotion = target.checked
  if (field === 'swipe' && target instanceof HTMLInputElement) save.settings.swipeTabs = target.checked
  if (field === 'haptic' && target instanceof HTMLInputElement) save.settings.haptics = target.checked
  if (field === 'hp' && target instanceof HTMLInputElement) {
    if (target.checked) delete save.settings.showHpNumbers
    else save.settings.showHpNumbers = false
    try { writeSave(gameStore, save) } catch { /* the memory copy still applies */ }
  }
  if (field === 'hints' && target instanceof HTMLInputElement && save.onboarding) {
    save.onboarding.hintsOff = target.checked
    if (target.checked) noteTutorial(TUTORIAL_STEP.hintsOff)
    try { writeSave(gameStore, save) } catch { /* the memory copy still applies */ }
  }
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
  const block = Boolean(target?.closest('input, textarea, select, button, .focus-bar, .speed, .guard-dock, .sheet-grab, #cloud-layer'))
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
  if (save && dir !== 0 && document.querySelector('.chest-lesson')) {
    ignoreClick = true
    stepChestLesson(dir)
    return
  }
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
