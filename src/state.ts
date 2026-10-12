import { maybeInterstitial, tryRewarded } from './ads'
import { simulateBattle, battleTip } from './battle'
import {
  ascensionCosts,
  buildings,
  dayKey,
  hasUnlock,
  maxLevelFor,
  nextStageId,
  previousDayKey,
  rarityInfo,
  rewards,
  species,
  stageById,
  stages,
  teamSlotLimit
} from './data'
import { pickSpecies, rollMulti, rollRarity } from './gacha'
import { freshSeed, nextFloat, nextUint } from './rng'
import { grantExp, roomToMax } from './stats'
import type {
  AdPlacement,
  BattleLog,
  BattleUnitInput,
  BuildingId,
  GachaHistoryEntry,
  MonsterInstance,
  PullResult,
  Rarity,
  RewardBundle,
  SaveData,
  SlotId,
  StageDef,
  TrainingSlot
} from './types'
import { ALL_SLOTS } from './types'

export const SAVE_KEY = 'mstadt.save.v1'

export interface ActionResult<T = void> {
  ok: boolean
  reason?: string
  value?: T
  messages: string[]
}

function ok<T>(value: T, messages: string[] = []): ActionResult<T> {
  return { ok: true, value, messages }
}

function fail(reason: string): ActionResult<never> {
  return { ok: false, reason, messages: [] }
}

export function createSave(now = Date.now()): SaveData {
  const starters = rewards.start.starters.map((id) => makeMonster(id, 0, now, true))
  const [fox, newt, sprout] = starters
  return {
    version: 1,
    createdAt: now,
    lastSeen: now,
    rngSeed: freshSeed(),
    currencies: { gold: rewards.start.gold, gems: rewards.start.gems, essence: 0, tickets: 0 },
    buildings: {
      townhall: { level: 1, upgradeEndsAt: null, upgradePaid: null },
      goldmine: { level: 1, stored: 0, lastTick: now, upgradeEndsAt: null, upgradePaid: null },
      training: { level: 1, slots: [], upgradeEndsAt: null, upgradePaid: null }
    },
    monsters: starters,
    team: { F1: newt.uid, F2: sprout.uid, H1: fox.uid, H2: null, H3: null },
    campaign: { cleared: {} },
    gacha: { pityLeg: 0, pityEpic: 0, totalPulls: 0, history: [] },
    daily: freshDaily(dayKey(now), 1),
    ads: freshAds(dayKey(now)),
    milestones: { firstEpic: false, firstLegendary: false, townhallRewards: [] },
    tutorial: { mineGranted: false, freeTrainUsed: false, pullClaimed: false },
    settings: { battleSpeed: 1, sound: true },
    sessionStartedAt: now
  }
}

function makeMonster(speciesId: string, rarity: Rarity, now: number, locked = false): MonsterInstance {
  return {
    uid: crypto.randomUUID(),
    speciesId,
    rarity,
    level: 1,
    exp: 0,
    locked,
    obtainedAt: now
  }
}

function freshDaily(key: string, streak: number): SaveData['daily'] {
  return {
    dayKey: key,
    loginStreak: streak,
    quests: { win3: 0, mine2: 0, train1: 0 },
    claimed: { win3: false, mine2: false, train1: false, all: false }
  }
}

function freshAds(key: string): SaveData['ads'] {
  return {
    dayKey: key,
    counts: { double_reward: 0, gem_bonus: 0, free_pull: 0, mine_boost: 0, build_speed: 0, training_speed: 0 },
    rewardedToday: 0,
    lastRewardedAt: 0,
    lastInterstitialAt: 0,
    interstitialToday: 0,
    interstitialHourKey: '',
    interstitialHourCount: 0
  }
}

export function loadSave(raw: string | null, now = Date.now()): SaveData {
  if (!raw) return createSave(now)
  try {
    const parsed = JSON.parse(raw) as SaveData
    if (!parsed || parsed.version !== 1 || !parsed.currencies || !parsed.buildings) return createSave(now)
    parsed.sessionStartedAt = now
    tick(parsed, now)
    return parsed
  } catch {
    return createSave(now)
  }
}

export function readStorage(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(SAVE_KEY)
  } catch {
    return null
  }
}

export function writeStorage(save: SaveData): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(SAVE_KEY, JSON.stringify(save))
  } catch {
    /* private mode or full storage: the session still runs */
  }
}

function rng(save: SaveData): number {
  const box = { seed: save.rngSeed }
  const value = nextFloat(box)
  save.rngSeed = box.seed
  return value
}

function nextSeed(save: SaveData): number {
  const box = { seed: save.rngSeed }
  const value = nextUint(box)
  save.rngSeed = box.seed
  return value || 1
}

export function monsterByUid(save: SaveData, uid: string | null): MonsterInstance | undefined {
  if (!uid) return undefined
  return save.monsters.find((m) => m.uid === uid)
}

export function teamMembers(save: SaveData): MonsterInstance[] {
  const open = new Set(teamSlotLimit(save.buildings.townhall.level))
  const list: MonsterInstance[] = []
  for (const slot of ALL_SLOTS) {
    if (!open.has(slot)) continue
    const monster = monsterByUid(save, save.team[slot])
    if (monster) list.push(monster)
  }
  return list
}

export function portalOpen(save: SaveData): boolean {
  return Boolean(save.campaign.cleared['1-2'])
}

export function coach(save: SaveData): { text: string; target: string } | null {
  if (!save.campaign.cleared['1-1']) {
    return {
      text: 'Willkommen in Velunor. Funkfuchs, Tropfmolch und Knospling warten am Kampagnentor. Kämpfe Stage 1-1 — der Kampf läuft von allein.',
      target: 'campaign'
    }
  }
  if (!save.campaign.cleared['1-2']) {
    return {
      text: 'Sieg. Vorne hält aus, hinten teilt aus. Schaffe Stage 1-2, dann öffnet das Portal.',
      target: 'campaign'
    }
  }
  if (!save.tutorial.pullClaimed) {
    return {
      text: 'Das Portal ist offen. Deine erste 10er-Beschwörung ist gratis und enthält mindestens ein episches Monster.',
      target: 'portal'
    }
  }
  if (!save.tutorial.mineGranted) {
    return { text: 'Hol das Gold aus der Mine. Die erste Ausbeute bringt zusätzlich 200 Gold.', target: 'goldmine' }
  }
  if (!save.tutorial.freeTrainUsed) {
    return { text: 'Starte dein erstes Training — diesmal kostenlos. Monster im Training dürfen weiter kämpfen.', target: 'training' }
  }
  if (save.campaign.cleared['1-5'] && save.buildings.townhall.level < 2 && save.buildings.townhall.upgradeEndsAt == null) {
    return {
      text: 'Baue das Rathaus auf Stufe 2 aus. Das schaltet den vierten Team-Platz, Typ-Synergien und 4× Tempo frei.',
      target: 'townhall'
    }
  }
  return null
}

export function tick(save: SaveData, now: number): string[] {
  const messages: string[] = []
  messages.push(...rolloverDay(save, now))
  messages.push(...resolveUpgrade(save, 'townhall', now))
  messages.push(...resolveMine(save, now))
  messages.push(...resolveUpgrade(save, 'training', now))
  save.lastSeen = now
  return messages
}

function rolloverDay(save: SaveData, now: number): string[] {
  const key = dayKey(now)
  if (save.daily.dayKey === key && save.ads.dayKey === key) return []
  const continuing = save.daily.dayKey === previousDayKey(key)
  const streak = continuing ? (save.daily.loginStreak >= 7 ? 1 : save.daily.loginStreak + 1) : 1
  save.daily = freshDaily(key, streak)
  save.ads = freshAds(key)
  save.currencies.gems += rewards.login.gems
  save.currencies.gold += rewards.login.gold
  const messages = [`Täglicher Login: +${rewards.login.gems} Juwelen, +${rewards.login.gold} Gold (Serie Tag ${streak}).`]
  if (streak === rewards.login.streakTicketDay) {
    save.currencies.tickets += 1
    messages.push('Login-Serie Tag 7: +1 Beschwörungsticket. Die Serie beginnt morgen neu.')
  }
  return messages
}

function resolveMine(save: SaveData, now: number): string[] {
  const mine = save.buildings.goldmine
  if (mine.upgradeEndsAt != null && now >= mine.upgradeEndsAt) {
    produceMine(save, mine.upgradeEndsAt)
    const messages = finishUpgrade(save, 'goldmine')
    produceMine(save, now)
    return messages
  }
  produceMine(save, now)
  return []
}

function produceMine(save: SaveData, until: number): void {
  const mine = save.buildings.goldmine
  const dt = until - mine.lastTick
  if (dt < 0) {
    mine.lastTick = until
    return
  }
  if (dt === 0) return
  const def = buildings.goldmine.levels[mine.level - 1]
  mine.stored = Math.min(def.capacity, mine.stored + def.ratePerHour * dt / 3_600_000)
  mine.lastTick = until
}

function resolveUpgrade(save: SaveData, id: 'townhall' | 'training', now: number): string[] {
  const building = save.buildings[id]
  if (building.upgradeEndsAt == null || now < building.upgradeEndsAt) return []
  return finishUpgrade(save, id)
}

function finishUpgrade(save: SaveData, id: BuildingId): string[] {
  const building = save.buildings[id]
  building.level += 1
  building.upgradeEndsAt = null
  building.upgradePaid = null
  const messages = [`${buildings[id].name} ist jetzt Stufe ${building.level}.`]
  if (id === 'townhall') {
    const level = building.level
    if (!save.milestones.townhallRewards.includes(level)) {
      const gems = rewards.townhallGemsPerLevel * level
      save.currencies.gems += gems
      save.milestones.townhallRewards.push(level)
      messages.push(`Rathaus-Stufe ${level}: +${gems} Juwelen.`)
    }
    const unlocks = buildings.townhall.levels[level - 1]?.unlocks ?? []
    if (unlocks.length) messages.push(`Frei: ${unlocks.map(unlockLabel).join(', ')}.`)
    if (level >= 5) messages.push('Zuchtstation: Bald verfügbar.')
  }
  return messages
}

export function unlockLabel(id: string): string {
  const labels: Record<string, string> = {
    campaign_ch1: 'Kampagne Kapitel 1',
    team_slots_3: '3 Team-Plätze',
    portal: 'Portal',
    speed_2x: 'Kampf 2×',
    team_slots_4: '4. Team-Platz',
    synergies: 'Typ-Synergien',
    speed_4x: 'Kampf 4×',
    daily_quests: 'Tagesaufgaben',
    team_slots_5: '5. Team-Platz',
    ascension: 'Aufwertung',
    skip_uncleared: 'Überspringen neuer Stages',
    release_monster: 'Monster freilassen',
    campaign_ch2: 'Kampagne Kapitel 2',
    multi_battle: 'Mehrfach-Kampf',
    breeding_placeholder: 'Zuchtstation (Platzhalter)'
  }
  return labels[id] ?? id
}

export function collectMine(save: SaveData, now: number): ActionResult<number> {
  const messages = tick(save, now)
  const mine = save.buildings.goldmine
  const gained = Math.floor(mine.stored)
  mine.stored -= gained
  save.currencies.gold += gained
  if (gained > 0) messages.push(`+${gained} Gold aus der Mine.`)
  if (!save.tutorial.mineGranted) {
    save.tutorial.mineGranted = true
    save.currencies.gold += rewards.tutorialMineGold
    messages.push(`Tutorial: +${rewards.tutorialMineGold} Gold.`)
  }
  if (gained > 0 || messages.some((m) => m.startsWith('Tutorial'))) messages.push(...noteQuest(save, 'mine2'))
  if (!gained && messages.length === 0) return fail('Die Mine ist noch leer.')
  return ok(gained, messages)
}

export function mineFill(save: SaveData): number {
  const def = buildings.goldmine.levels[save.buildings.goldmine.level - 1]
  return def.capacity <= 0 ? 0 : save.buildings.goldmine.stored / def.capacity
}

function requirementMet(save: SaveData, req: { stageCleared?: string; townhall?: number }): { ok: boolean; reason: string } {
  if (req.stageCleared && !save.campaign.cleared[req.stageCleared]) {
    return { ok: false, reason: `Gewinne zuerst Stage ${req.stageCleared}` }
  }
  if (req.townhall && save.buildings.townhall.level < req.townhall) {
    return { ok: false, reason: `Rathaus Stufe ${req.townhall}` }
  }
  return { ok: true, reason: '' }
}

export function upgradeInfo(save: SaveData, id: BuildingId): {
  next: { level: number; cost: number; buildSec: number; req: { stageCleared?: string; townhall?: number } } | null
  blocked: string
} {
  const levels = buildings[id].levels
  const current = save.buildings[id].level
  const next = levels[current]
  if (!next) return { next: null, blocked: 'Maximale Stufe erreicht.' }
  if (anyUpgrade(save)) return { next, blocked: 'Es wird bereits gebaut.' }
  const req = requirementMet(save, next.req)
  if (!req.ok) return { next, blocked: req.reason }
  if (save.currencies.gold < next.cost) return { next, blocked: `Nicht genug Gold (${next.cost}).` }
  return { next, blocked: '' }
}

function anyUpgrade(save: SaveData): boolean {
  return (['townhall', 'goldmine', 'training'] as BuildingId[]).some((id) => save.buildings[id].upgradeEndsAt != null)
}

export function startUpgrade(save: SaveData, id: BuildingId, now: number): ActionResult {
  tick(save, now)
  const info = upgradeInfo(save, id)
  if (!info.next) return fail(info.blocked || 'Nicht möglich.')
  if (info.blocked) return fail(info.blocked)
  save.currencies.gold -= info.next.cost
  save.buildings[id].upgradeEndsAt = now + info.next.buildSec * 1000
  save.buildings[id].upgradePaid = info.next.cost
  return ok(undefined, [`${buildings[id].name} wird ausgebaut (${formatBuild(info.next.buildSec)}).`])
}

function formatBuild(sec: number): string {
  if (sec >= 3600) return `${Math.round(sec / 60)} Min.`
  if (sec >= 60) return `${Math.round(sec / 60)} Min.`
  return `${sec}s`
}

export function cancelUpgrade(save: SaveData, id: BuildingId): ActionResult {
  const building = save.buildings[id]
  if (building.upgradeEndsAt == null) return fail('Hier wird nicht gebaut.')
  const refund = building.upgradePaid ?? 0
  save.currencies.gold += refund
  building.upgradeEndsAt = null
  building.upgradePaid = null
  return ok(undefined, [`Ausbau abgebrochen. +${refund} Gold zurück.`])
}

export function trainingQuote(save: SaveData, minutes: number): { exp: number; gold: number; free: boolean } {
  const def = buildings.training.levels[save.buildings.training.level - 1]
  const exp = def.expPerMin * minutes
  const free = !save.tutorial.freeTrainUsed
  const gold = free ? 0 : Math.ceil(exp * buildings.training.goldPerExp)
  return { exp, gold, free }
}

export function startTraining(save: SaveData, uid: string, minutes: number, now: number): ActionResult {
  tick(save, now)
  if (!buildings.training.durationsMin.includes(minutes)) return fail('Unbekannte Dauer.')
  const monster = monsterByUid(save, uid)
  if (!monster) return fail('Monster nicht gefunden.')
  if (save.buildings.training.slots.some((s) => s.monsterUid === uid)) return fail('Dieses Monster trainiert bereits.')
  const def = buildings.training.levels[save.buildings.training.level - 1]
  if (save.buildings.training.slots.length >= def.slots) return fail('Keine freien Trainingsplätze.')
  if (roomToMax(monster) <= 0) return fail('Dieses Monster hat die Maximalstufe erreicht.')
  const quote = trainingQuote(save, minutes)
  if (save.currencies.gold < quote.gold) return fail(`Nicht genug Gold (${quote.gold}).`)
  save.currencies.gold -= quote.gold
  const slot: TrainingSlot = {
    monsterUid: uid,
    startAt: now,
    endsAt: now + minutes * 60_000,
    exp: quote.exp,
    goldPaid: quote.gold,
    expPerMin: def.expPerMin
  }
  save.buildings.training.slots.push(slot)
  if (quote.free) save.tutorial.freeTrainUsed = true
  return ok(undefined, [`Training gestartet: ${quote.exp} EP${quote.free ? ' (gratis)' : ` für ${quote.gold} Gold`}.`])
}

export function trainingReadyAt(slot: TrainingSlot, monster: MonsterInstance): number {
  const room = roomToMax(monster)
  if (room >= slot.exp) return slot.endsAt
  if (room <= 0) return slot.startAt
  const planned = slot.endsAt - slot.startAt
  return slot.startAt + planned * (room / slot.exp)
}

export function claimTraining(save: SaveData, uid: string, now: number): ActionResult {
  tick(save, now)
  const index = save.buildings.training.slots.findIndex((s) => s.monsterUid === uid)
  if (index < 0) return fail('Kein Training.')
  const slot = save.buildings.training.slots[index]
  const monster = monsterByUid(save, uid)
  if (!monster) return fail('Monster fehlt.')
  const ready = trainingReadyAt(slot, monster)
  if (now < ready) return fail('Das Training läuft noch.')
  const settled = settleTraining(slot, monster, ready)
  const granted = grantExp(monster, settled.expGain)
  save.currencies.gold += settled.goldRefund
  save.buildings.training.slots.splice(index, 1)
  const messages = [`${species(monster.speciesId).name} erhält ${granted.gained} EP.`, ...noteQuest(save, 'train1')]
  if (granted.levels) messages.push(`Level ${monster.level} erreicht.`)
  if (settled.goldRefund) messages.push(`+${settled.goldRefund} Gold zurück (nicht gebrauchte EP).`)
  return ok(undefined, messages)
}

export function cancelTraining(save: SaveData, uid: string, now: number): ActionResult {
  tick(save, now)
  const index = save.buildings.training.slots.findIndex((s) => s.monsterUid === uid)
  if (index < 0) return fail('Kein Training.')
  const slot = save.buildings.training.slots[index]
  const monster = monsterByUid(save, uid)
  if (!monster) return fail('Monster fehlt.')
  const settled = settleTraining(slot, monster, Math.min(now, trainingReadyAt(slot, monster)))
  const granted = grantExp(monster, settled.expGain)
  save.currencies.gold += settled.goldRefund
  save.buildings.training.slots.splice(index, 1)
  const messages = [`Training abgebrochen. +${granted.gained} EP, +${settled.goldRefund} Gold.`]
  return ok(undefined, messages)
}

function settleTraining(slot: TrainingSlot, monster: MonsterInstance, at: number): { expGain: number; goldRefund: number } {
  const planned = Math.max(1, slot.endsAt - slot.startAt)
  const elapsed = Math.max(0, Math.min(at, slot.endsAt) - slot.startAt)
  const ratio = Math.min(1, elapsed / planned)
  const room = roomToMax(monster)
  const expGain = Math.min(room, Math.floor(slot.exp * ratio + 1e-6))
  const goldRefund = Math.floor(slot.goldPaid * (1 - ratio))
  return { expGain, goldRefund }
}

function noteQuest(save: SaveData, key: 'win3' | 'mine2' | 'train1'): string[] {
  if (!hasUnlock(save.buildings.townhall.level, 'daily_quests')) return []
  const need = rewards.quests[key].need
  if (save.daily.claimed[key]) return []
  save.daily.quests[key] = Math.min(need, save.daily.quests[key] + 1)
  const messages: string[] = []
  if (save.daily.quests[key] >= need) {
    save.daily.claimed[key] = true
    save.currencies.gems += rewards.quests[key].gems
    messages.push(`Tagesaufgabe erfüllt: +${rewards.quests[key].gems} Juwelen.`)
  }
  if (!save.daily.claimed.all && save.daily.claimed.win3 && save.daily.claimed.mine2 && save.daily.claimed.train1) {
    save.daily.claimed.all = true
    save.currencies.gems += rewards.quests.all.gems
    save.currencies.gold += rewards.quests.all.gold
    save.currencies.essence += rewards.quests.all.essence
    messages.push(`Alle Tagesaufgaben: +${rewards.quests.all.gems} Juwelen, +${rewards.quests.all.gold} Gold, +${rewards.quests.all.essence} Essenz.`)
  }
  return messages
}

export function setTeam(save: SaveData, slot: SlotId, uid: string | null): ActionResult {
  const open = teamSlotLimit(save.buildings.townhall.level)
  if (!open.includes(slot)) return fail(`Rathaus Stufe ${slot === 'H2' ? 2 : 3}`)
  if (uid == null) {
    const filled = open.filter((s) => save.team[s])
    if (filled.length <= 1 && save.team[slot]) return fail('Mindestens ein Monster muss aufgestellt sein.')
    save.team[slot] = null
    return ok(undefined, [])
  }
  const monster = monsterByUid(save, uid)
  if (!monster) return fail('Monster nicht gefunden.')
  for (const other of ALL_SLOTS) {
    if (other !== slot && save.team[other] === uid) save.team[other] = null
  }
  save.team[slot] = uid
  return ok(undefined, [])
}

export function stageUnlocked(save: SaveData, stage: StageDef): { ok: boolean; reason: string } {
  if (stage.chapter === 2 && !hasUnlock(save.buildings.townhall.level, 'campaign_ch2')) {
    return { ok: false, reason: 'Rathaus Stufe 4' }
  }
  const index = stages.findIndex((s) => s.id === stage.id)
  if (index > 0 && !save.campaign.cleared[stages[index - 1].id]) {
    return { ok: false, reason: `Zuerst ${stages[index - 1].id}` }
  }
  return { ok: true, reason: '' }
}

export function canSkip(save: SaveData, stageId: string): boolean {
  if (save.campaign.cleared[stageId]) return true
  return hasUnlock(save.buildings.townhall.level, 'skip_uncleared')
}

export function canMulti(save: SaveData): boolean {
  return hasUnlock(save.buildings.townhall.level, 'multi_battle')
}

export function maxSpeed(save: SaveData): 1 | 2 | 4 {
  if (hasUnlock(save.buildings.townhall.level, 'speed_4x')) return 4
  return 2
}

export interface FightReport {
  stageId: string
  logs: BattleLog[]
  rewards: RewardBundle
  victory: boolean
  tip: string
  stars: 0 | 1 | 2 | 3
}

export function fightStage(save: SaveData, stageId: string, count: 1 | 3, now: number): ActionResult<FightReport> {
  tick(save, now)
  const stage = stageById(stageId)
  const gate = stageUnlocked(save, stage)
  if (!gate.ok) return fail(gate.reason)
  if (count === 3 && !canMulti(save)) return fail('Rathaus Stufe 4')
  const allies = allyInputs(save)
  if (!allies.length) return fail('Stell mindestens ein Monster auf.')
  const bundle = emptyReward()
  const logs: BattleLog[] = []
  const messages: string[] = []
  let allWins = true
  let bestStars: 0 | 1 | 2 | 3 = 0
  let tip = ''
  for (let i = 0; i < count; i++) {
    const seed = nextSeed(save)
    const enemies = enemyInputs(stage)
    const input = {
      seed,
      allies,
      enemies,
      allySynergy: hasUnlock(save.buildings.townhall.level, 'synergies'),
      enemySynergy: true
    }
    const log = simulateBattle(input)
    logs.push(log)
    if (log.result === 'win') {
      const won = grantWin(save, stage, log.stars)
      addReward(bundle, won)
      if (log.stars > bestStars) bestStars = log.stars
      messages.push(...noteQuest(save, 'win3'))
    } else {
      allWins = false
      const consolation = Math.floor(stage.rewards.repeat.exp * rewardsCfgLoss())
      const levels = grantTeamExp(save, consolation)
      bundle.exp += consolation
      bundle.levels += levels
      tip = battleTip(input, log)
    }
  }
  return ok({ stageId, logs, rewards: bundle, victory: allWins, tip, stars: bestStars }, messages)
}

function rewardsCfgLoss(): number {
  return 0.25
}

function emptyReward(): RewardBundle {
  return { gold: 0, gems: 0, exp: 0, essence: 0, tickets: 0, levels: 0 }
}

function addReward(into: RewardBundle, extra: RewardBundle): void {
  into.gold += extra.gold
  into.gems += extra.gems
  into.exp += extra.exp
  into.essence += extra.essence
  into.tickets += extra.tickets
  into.levels += extra.levels
}

function grantWin(save: SaveData, stage: StageDef, stars: 0 | 1 | 2 | 3): RewardBundle {
  const previous = save.campaign.cleared[stage.id] ?? 0
  const bundle = emptyReward()
  const first = previous <= 0
  if (first) {
    bundle.gold = stage.rewards.firstClear.gold
    bundle.gems = stage.rewards.firstClear.gems
    bundle.essence = stage.rewards.firstClear.essence ?? 0
    bundle.tickets = stage.rewards.firstClear.tickets ?? 0
  } else {
    bundle.gold = stage.rewards.repeat.gold
  }
  bundle.exp = first ? stage.rewards.firstClear.exp : stage.rewards.repeat.exp
  if (stars === 3 && previous < 3) bundle.gems += stage.rewards.threeStarBonus.gems
  save.currencies.gold += bundle.gold
  save.currencies.gems += bundle.gems
  save.currencies.essence += bundle.essence
  save.currencies.tickets += bundle.tickets
  save.campaign.cleared[stage.id] = Math.max(previous, stars) as 1 | 2 | 3
  bundle.levels = grantTeamExp(save, bundle.exp)
  return bundle
}

function grantTeamExp(save: SaveData, amount: number): number {
  let levels = 0
  for (const monster of teamMembers(save)) {
    const granted = grantExp(monster, amount)
    levels += granted.levels
  }
  return levels
}

function allyInputs(save: SaveData): BattleUnitInput[] {
  const open = new Set(teamSlotLimit(save.buildings.townhall.level))
  const list: BattleUnitInput[] = []
  for (const slot of ALL_SLOTS) {
    if (!open.has(slot) || !save.team[slot]) continue
    const monster = monsterByUid(save, save.team[slot])
    if (!monster) continue
    list.push({ speciesId: monster.speciesId, rarity: monster.rarity, level: monster.level, slot })
  }
  return list
}

function enemyInputs(stage: StageDef): BattleUnitInput[] {
  return stage.enemies.map((enemy) => ({
    speciesId: enemy.speciesId,
    rarity: (enemy.rarity ?? stage.enemyRarity) as Rarity,
    level: stage.enemyLevel,
    slot: enemy.slot,
    boss: Boolean(enemy.boss)
  }))
}

export function inventoryRoom(save: SaveData, count: number): boolean {
  return save.monsters.length + count <= 60
}

export function pull(save: SaveData, kind: 'single' | 'multi' | 'tutorial', pay: 'gems' | 'tickets' | 'free', now: number): ActionResult<PullResult[]> {
  if (!portalOpen(save)) return fail('Schließe Stage 1-2 ab')
  if (kind === 'tutorial') {
    if (save.tutorial.pullClaimed) return fail('Die Tutorial-Ziehung ist schon benutzt.')
    if (!inventoryRoom(save, 10)) return fail('Nicht genug Platz im Lager (60).')
  } else if (kind === 'single') {
    if (!inventoryRoom(save, 1)) return fail('Nicht genug Platz im Lager (60).')
    if (pay === 'tickets') {
      if (save.currencies.tickets < 1) return fail('Kein Beschwörungsticket.')
      save.currencies.tickets -= 1
    } else if (pay === 'gems') {
      if (save.currencies.gems < 100) return fail('Nicht genug Juwelen (100).')
      save.currencies.gems -= 100
    } else return fail('Diese Ziehung ist nicht gratis.')
  } else {
    if (!inventoryRoom(save, 10)) return fail('Nicht genug Platz im Lager (60).')
    if (pay === 'tickets') {
      if (save.currencies.tickets < 10) return fail('Nicht genug Tickets (10).')
      save.currencies.tickets -= 10
    } else if (pay === 'gems') {
      if (save.currencies.gems < 900) return fail('Nicht genug Juwelen (900).')
      save.currencies.gems -= 900
    } else return fail('Diese Ziehung ist nicht gratis.')
  }

  const messages: string[] = []
  const raw = kind === 'single'
    ? [singlePull(save)]
    : rollMulti(save.gacha, () => rng(save), kind === 'tutorial' ? 3 : 2).map((p) => p)
  if (kind === 'tutorial') save.tutorial.pullClaimed = true
  const results: PullResult[] = []
  for (const entry of raw) {
    const monster = makeMonster(entry.speciesId, entry.rarity, now, false)
    save.monsters.push(monster)
    const history: GachaHistoryEntry = { t: now, speciesId: entry.speciesId, rarity: entry.rarity, upgraded: entry.upgraded }
    save.gacha.history.unshift(history)
    results.push({ ...entry, uid: monster.uid })
    messages.push(...noteMilestone(save, entry.rarity))
  }
  save.gacha.history = save.gacha.history.slice(0, 100)
  return ok(results, messages)
}

function singlePull(save: SaveData): { speciesId: string; rarity: Rarity; upgraded: boolean } {
  const rarity = rollRarity(save.gacha, () => rng(save))
  const picked = pickSpecies(rarity, () => rng(save))
  return {
    speciesId: picked.speciesId,
    rarity,
    upgraded: picked.upgraded || rarity > species(picked.speciesId).baseRarity
  }
}

function noteMilestone(save: SaveData, rarity: Rarity): string[] {
  const messages: string[] = []
  if (rarity >= 3 && !save.milestones.firstEpic) {
    save.milestones.firstEpic = true
    save.currencies.gems += rewards.firstEpicGems
    messages.push(`Erstes episches Monster: +${rewards.firstEpicGems} Juwelen.`)
  }
  if (rarity >= 5 && !save.milestones.firstLegendary) {
    save.milestones.firstLegendary = true
    save.currencies.gems += rewards.firstLegendaryGems
    messages.push(`Erstes legendäres Monster: +${rewards.firstLegendaryGems} Juwelen.`)
  }
  return messages
}

export function toggleLock(save: SaveData, uid: string): ActionResult {
  const monster = monsterByUid(save, uid)
  if (!monster) return fail('Monster nicht gefunden.')
  monster.locked = !monster.locked
  return ok(undefined, [monster.locked ? 'Monster geschützt.' : 'Schutz aufgehoben.'])
}

export function releaseMonster(save: SaveData, uid: string): ActionResult<number> {
  if (!hasUnlock(save.buildings.townhall.level, 'release_monster')) return fail('Rathaus Stufe 3')
  const monster = monsterByUid(save, uid)
  if (!monster) return fail('Monster nicht gefunden.')
  if (monster.locked) return fail('Geschützte Monster kann man nicht freilassen.')
  if (save.monsters.length <= 1) return fail('Dein letztes Monster bleibt bei dir.')
  const inTeam = ALL_SLOTS.filter((slot) => save.team[slot] === uid)
  const teamCount = ALL_SLOTS.filter((slot) => save.team[slot]).length
  if (inTeam.length && teamCount - inTeam.length < 1) return fail('Das letzte Monster im Team kann nicht freigelassen werden.')
  const essence = rarityInfo(monster.rarity).essence
  save.currencies.essence += essence
  save.monsters = save.monsters.filter((m) => m.uid !== uid)
  for (const slot of inTeam) save.team[slot] = null
  save.buildings.training.slots = save.buildings.training.slots.filter((s) => s.monsterUid !== uid)
  return ok(essence, [`${species(monster.speciesId).name} freigelassen. +${essence} Essenz.`])
}

export function ascend(save: SaveData, uid: string): ActionResult {
  if (!hasUnlock(save.buildings.townhall.level, 'ascension')) return fail('Rathaus Stufe 3')
  const monster = monsterByUid(save, uid)
  if (!monster) return fail('Monster nicht gefunden.')
  if (monster.rarity >= 9) return fail('Ursprung ist die höchste Stufe.')
  if (monster.level < maxLevelFor(monster.rarity)) return fail(`Zuerst Level ${maxLevelFor(monster.rarity)} erreichen.`)
  const cost = ascensionCosts.find((row) => row.from === monster.rarity)
  if (!cost) return fail('Keine Aufwertung möglich.')
  if (save.currencies.essence < cost.essence) return fail(`Nicht genug Essenz (${cost.essence}).`)
  if (save.currencies.gold < cost.gold) return fail(`Nicht genug Gold (${cost.gold}).`)
  save.currencies.essence -= cost.essence
  save.currencies.gold -= cost.gold
  monster.rarity = (monster.rarity + 1) as Rarity
  monster.exp = 0
  const messages = [`${species(monster.speciesId).name} ist jetzt ${rarityInfo(monster.rarity).name}.`, ...noteMilestone(save, monster.rarity)]
  return ok(undefined, messages)
}

export function applyRewarded(save: SaveData, placement: AdPlacement, now: number, context?: { gold?: number; expEach?: number; buildingId?: BuildingId; trainUid?: string }): Promise<ActionResult> {
  return tryRewarded(save, placement, now).then((result) => {
    if (result !== 'completed') {
      return result === 'unavailable' ? fail('Gerade keine Werbung verfügbar') : fail('Werbung abgebrochen.')
    }
    const messages: string[] = []
    if (placement === 'double_reward' && context) {
      const gold = context.gold ?? 0
      const exp = context.expEach ?? 0
      save.currencies.gold += gold
      grantTeamExp(save, exp)
      messages.push(`Belohnung verdoppelt: +${gold} Gold und +${exp} EP je Team-Monster.`)
    } else if (placement === 'gem_bonus') {
      save.currencies.gems += 20
      messages.push('+20 Juwelen.')
    } else if (placement === 'mine_boost') {
      const def = buildings.goldmine.levels[save.buildings.goldmine.level - 1]
      const gain = def.ratePerHour * 2
      save.currencies.gold += gain
      messages.push(`Turbo: +${gain} Gold.`)
    } else if (placement === 'build_speed' && context?.buildingId) {
      const building = save.buildings[context.buildingId]
      if (building.upgradeEndsAt != null) {
        building.upgradeEndsAt -= 1800 * 1000
        if (building.upgradeEndsAt <= now) messages.push(...tick(save, now))
        else messages.push('Bauzeit um 30 Minuten verkürzt.')
      }
    } else if (placement === 'training_speed' && context?.trainUid) {
      const slot = save.buildings.training.slots.find((s) => s.monsterUid === context.trainUid)
      if (slot) {
        const remain = Math.max(0, slot.endsAt - now)
        slot.endsAt = now + Math.floor(remain * 0.5)
        messages.push('Restliche Trainingszeit halbiert.')
      }
    } else if (placement === 'free_pull') {
      messages.push('Gratis-Ziehung bereit.')
    }
    return ok(undefined, messages)
  })
}

export async function closeToCity(save: SaveData, now: number, victory: boolean): Promise<void> {
  await maybeInterstitial(save, 'result_to_city', now, victory)
}

export function setSpeed(save: SaveData, speed: 1 | 2 | 4): void {
  if (speed === 4 && maxSpeed(save) < 4) speed = 2
  save.settings.battleSpeed = speed
}

export function nextCampaignTarget(save: SaveData): string | null {
  const id = nextStageId(save.campaign.cleared)
  if (!id) return null
  const stage = stageById(id)
  return stageUnlocked(save, stage).ok ? id : null
}

export function presentPulls<T extends { rarity: number }>(pulls: T[]): T[] {
  return [...pulls].sort((a, b) => a.rarity - b.rarity)
}
