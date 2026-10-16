import { maybeInterstitial, tryRewarded } from './ads'
import {
  applyArenaOutcome,
  arenaUnlocked,
  dismissSeasonResult,
  ensureArena,
  freshArena,
  ghostBattleUnits,
  listArenaOpponents,
  syncArenaDay,
  syncArenaSeason
} from './arena'
import { SAVE_KEY, loadOrMigrateSave } from './saveMigrate'
import { simulateBattle, battleTip } from './battle'
import {
  adsCfg,
  arenaCfg,
  ascensionCosts,
  breedingCfg,
  buildings,
  dailyCfg,
  dayKey,
  hasUnlock,
  maxLevelFor,
  nextStageId,
  previousDayKey,
  rarityInfo,
  rewards,
  skillsCfg,
  species,
  stageById,
  stages,
  starChests,
  teamSlotLimit,
  typeUnlocks,
  typesCfg
} from './data'
import { pickSpecies, rollMulti, rollRarity } from './gacha'
import { freshSeed, nextFloat, nextUint } from './rng'
import { combatPower, grantExp, instanceStats, roomToMax } from './stats'
import { synergyView } from './synergy'
import type {
  AdPlacement,
  BattleInput,
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
  TrainingSlot,
  TypeId
} from './types'
import { ALL_SLOTS } from './types'

export { SAVE_KEY }

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

/** Types listed in config are live immediately. Stage clears never gate them. */
function starterTypes(): TypeId[] {
  return typesCfg.activeTypes.map((type) => type as TypeId)
}

function ensureStarterTypes(save: SaveData): void {
  if (!Array.isArray(save.activeTypes)) save.activeTypes = []
  for (const type of starterTypes()) {
    if (!save.activeTypes.includes(type)) save.activeTypes.push(type)
  }
}

export function createSave(now = Date.now()): SaveData {
  const starters = rewards.start.starters.map((id) => makeMonster(id, 0, now, true))
  const [fox, newt, sprout] = starters
  return {
    version: 5,
    createdAt: now,
    lastSeen: now,
    rngSeed: freshSeed(),
    currencies: { gold: rewards.start.gold, gems: rewards.start.gems, essence: 0, tickets: 0 },
    meta: { migratedFrom: null, migratedAt: 0 },
    activeTypes: starterTypes(),
    buildings: {
      townhall: { level: 1, upgradeEndsAt: null, upgradePaid: null },
      goldmine: { level: 1, stored: 0, lastTick: now, upgradeEndsAt: null, upgradePaid: null },
      training: { level: 1, slots: [], upgradeEndsAt: null, upgradePaid: null },
      breeding: { level: 0, slots: [], upgradeEndsAt: null, upgradePaid: null }
    },
    monsters: starters,
    team: { F1: newt.uid, F2: sprout.uid, H1: fox.uid, H2: null, H3: null },
    campaign: { cleared: {}, chestsClaimed: [] },
    lastBattleResult: null,
    tutorialDone: false,
    gacha: { pityLeg: 0, pityEpic: 0, totalPulls: 0, history: [] },
    daily: freshDaily(dayKey(now), 1),
    ads: freshAds(dayKey(now)),
    milestones: { firstEpic: false, firstLegendary: false, townhallRewards: [] },
    tutorial: { mineGranted: false, freeTrainUsed: false, pullClaimed: false, guideStep: 0 },
    settings: { battleSpeed: 1, sound: true },
    sessionStartedAt: now,
    arena: freshArena(dayKey(now), now),
    collection: [...new Set(starters.map((monster) => monster.speciesId))]
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
    obtainedAt: now,
    potential: { hp: 0, atk: 0, def: 0 },
    skills: { sigRank: 1, slot2: null, slot3: null, learned: [], skillOrder: ['sig', 'slot2'] },
    generation: 0,
    breedReadyAt: 0
  }
}

function freshDaily(key: string, streak: number): SaveData['daily'] {
  return {
    dayKey: key,
    loginStreak: streak,
    quests: { win3: 0, mine2: 0, train1: 0, levelup1: 0, synergy2: 0, pull1: 0, breed1: 0 },
    claimed: [],
    claimedAll: false
  }
}

function freshAds(key: string): SaveData['ads'] {
  return {
    dayKey: key,
    counts: { double_reward: 0, gem_bonus: 0, free_pull: 0, mine_boost: 0, build_speed: 0, training_speed: 0, breeding_speed: 0 },
    rewardedToday: 0,
    lastRewardedAt: 0,
    lastInterstitialAt: 0,
    interstitialToday: 0
  }
}

export function migrateSaveData(save: SaveData, _now: number): SaveData {
  if (!save.meta) save.meta = { migratedFrom: null, migratedAt: 0 }
  if (!save.tutorial) save.tutorial = { mineGranted: true, freeTrainUsed: true, pullClaimed: true, guideStep: 6 }
  if (save.tutorial.guideStep == null) {
    const progressed = Object.keys(save.campaign?.cleared ?? {}).length > 0 || save.tutorial.pullClaimed || (save.monsters?.length ?? 0) > 3
    save.tutorial.guideStep = progressed ? 6 : 0
  }
  const needsV2 = !(save.version >= 2 && save.buildings.breeding && save.activeTypes)
  if (!needsV2) {
    ensureStarterTypes(save)
    ensureArena(save, _now)
    ensureCollection(save)
    return save
  }
  save.version = 2
  ensureStarterTypes(save)
  save.campaign = save.campaign ?? { cleared: {}, chestsClaimed: [] }
  save.campaign.chestsClaimed = save.campaign.chestsClaimed ?? []
  save.lastBattleResult = save.lastBattleResult ?? null
  save.tutorialDone = save.tutorial.guideStep >= 6 || Boolean(save.campaign.cleared['1-5'])
  if (!save.buildings.breeding) save.buildings.breeding = { level: 0, slots: [], upgradeEndsAt: null, upgradePaid: null }
  for (const monster of save.monsters ?? []) {
    monster.potential = monster.potential ?? { hp: 0, atk: 0, def: 0 }
    monster.skills = monster.skills ?? { sigRank: 1, slot2: null, slot3: null, learned: [], skillOrder: ['sig', 'slot2'] }
    monster.generation = monster.generation ?? 0
    monster.breedReadyAt = monster.breedReadyAt ?? 0
  }
  for (const slot of save.buildings.training?.slots ?? []) {
    if (!slot.kind) slot.kind = 'exp'
  }
  const quests = (save.daily?.quests ?? {}) as Record<string, number>
  save.daily = {
    dayKey: save.daily?.dayKey ?? dayKey(_now),
    loginStreak: save.daily?.loginStreak ?? 1,
    quests: {
      win3: quests.win3 ?? 0,
      mine2: quests.mine2 ?? 0,
      train1: quests.train1 ?? 0,
      levelup1: quests.levelup1 ?? 0,
      synergy2: quests.synergy2 ?? 0,
      pull1: quests.pull1 ?? 0,
      breed1: quests.breed1 ?? 0
    },
    claimed: Array.isArray(save.daily?.claimed) ? save.daily.claimed : [],
    claimedAll: Boolean(save.daily?.claimedAll)
  }
  const counts = save.ads?.counts ?? {}
  save.ads = {
    dayKey: save.ads?.dayKey ?? save.daily.dayKey,
    counts: { ...freshAds(save.daily.dayKey).counts, ...counts },
    rewardedToday: save.ads?.rewardedToday ?? 0,
    lastRewardedAt: save.ads?.lastRewardedAt ?? 0,
    lastInterstitialAt: save.ads?.lastInterstitialAt ?? 0,
    interstitialToday: save.ads?.interstitialToday ?? 0
  }
  grantRetroChests(save)
  for (const stageId of Object.keys(save.campaign.cleared)) unlockTypeFor(save, stageId)
  ensureArena(save, _now)
  ensureCollection(save)
  return save
}

function rememberCollected(save: SaveData, speciesId: string): void {
  if (!Array.isArray(save.collection)) save.collection = []
  if (!save.collection.includes(speciesId)) save.collection.push(speciesId)
}

/** Version 5: collection is the set of every species ever obtained, including ones no longer in the stable. */
function ensureCollection(save: SaveData): void {
  const have: string[] = []
  const seen = new Set<string>()
  const add = (id: unknown) => {
    if (typeof id !== 'string' || !id || seen.has(id)) return
    seen.add(id)
    have.push(id)
  }
  if (Array.isArray(save.collection)) {
    for (const id of save.collection) add(id)
  }
  for (const monster of save.monsters ?? []) add(monster?.speciesId)
  save.collection = have
  save.version = Math.max(save.version || 0, 5)
}

export function loadGame(now = Date.now()): SaveData {
  const storage = {
    getItem: (key: string) => { try { return localStorage.getItem(key) } catch { return null } },
    setItem: (key: string, value: string) => { localStorage.setItem(key, value) },
    removeItem: (key: string) => { localStorage.removeItem(key) }
  }
  const save = loadOrMigrateSave(storage, now, { createSave, migrate: migrateSaveData })
  save.sessionStartedAt = now
  tick(save, now)
  return save
}

export function loadSave(raw: string | null, now = Date.now()): SaveData {
  if (!raw) return createSave(now)
  try {
    const parsed = JSON.parse(raw) as SaveData
    if (!parsed || typeof parsed.version !== 'number' || !parsed.currencies || !parsed.buildings) return createSave(now)
    return migrateSaveData(parsed, now)
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

/** Townhall level 1 lists the portal, but it stays shut until stage 1-2. */
export function portalUnlockText(save: SaveData): string {
  return portalOpen(save) ? 'Portal' : 'Portal nach Stage 1-2'
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
  syncArenaDay(save, now)
  syncArenaSeason(save, now)
  messages.push(...resolveUpgrade(save, 'townhall', now))
  messages.push(...resolveMine(save, now))
  messages.push(...resolveUpgrade(save, 'training', now))
  messages.push(...resolveUpgrade(save, 'breeding', now))
  save.lastSeen = now
  return messages
}

function rolloverDay(save: SaveData, now: number): string[] {
  if (now < save.lastSeen) return []
  const key = dayKey(now)
  if (save.daily.dayKey === key && save.ads.dayKey === key) return []
  const credited = autoClaimQuests(save)
  const continuing = save.daily.dayKey === previousDayKey(key)
  const streak = continuing ? (save.daily.loginStreak >= 7 ? 1 : save.daily.loginStreak + 1) : 1
  save.daily = freshDaily(key, streak)
  save.ads = freshAds(key)
  save.currencies.gems += rewards.login.gems
  save.currencies.gold += rewards.login.gold
  const messages = [...credited, `Täglicher Login: +${rewards.login.gems} Juwelen, +${rewards.login.gold} Gold (Serie Tag ${streak}).`]
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

function resolveUpgrade(save: SaveData, id: BuildingId, now: number): string[] {
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
    if (level >= 5) messages.push('Die Zuchtstation kann gebaut werden.')
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
    class_synergies: 'Klassen-Synergien',
    team_slots_5: '5. Team-Platz',
    breeding: 'Zuchtstation',
    ascension: 'Aufwertung',
    skip_uncleared: 'Überspringen neuer Stages',
    release_monster: 'Monster freilassen',
    campaign_ch2: 'Kampagne Kapitel 2',
    multi_battle: 'Mehrfach-Kampf',
    breeding_placeholder: 'Zuchtstation (Platzhalter)',
    arena: 'Arena'
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

function requirementMet(save: SaveData, req: { stageCleared?: string; townhall?: number; breeding?: number }): { ok: boolean; reason: string } {
  if (req.stageCleared && !save.campaign.cleared[req.stageCleared]) {
    return { ok: false, reason: `Gewinne zuerst Stage ${req.stageCleared}` }
  }
  if (req.townhall && save.buildings.townhall.level < req.townhall) {
    return { ok: false, reason: `Rathaus Stufe ${req.townhall}` }
  }
  if (req.breeding && save.buildings.breeding.level < req.breeding) {
    return { ok: false, reason: `Zuchtstation Stufe ${req.breeding}` }
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
  return (['townhall', 'goldmine', 'training', 'breeding'] as BuildingId[]).some((id) => save.buildings[id].upgradeEndsAt != null)
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
    kind: 'exp',
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

export interface SkillOffer {
  id: string
  name: string
  kind: 'rank' | 'learn' | 'passive'
  gold: number
  essence: number
  minutes: number
  blocked: string
}

function rankCost(rank: number): { gold: number; essence: number; minutes: number } {
  const cost = skillsCfg.signatureRank.cost
  return {
    gold: cost.goldPerRankSq * rank * rank,
    essence: cost.essencePerRankSq * rank * rank,
    minutes: cost.minutesPerRank * rank
  }
}

function tierCost(tier: 1 | 2 | 3 | 'passive'): { gold: number; essence: number; minutes: number; training: number } {
  if (tier === 1) return skillsCfg.tierCost['1']
  if (tier === 2) return skillsCfg.tierCost['2']
  if (tier === 3) return skillsCfg.tierCost['3']
  return skillsCfg.tierCost.passive
}

function skillGate(
  save: SaveData,
  monster: MonsterInstance,
  kind: 'rank' | 'learn' | 'passive',
  skillId: string
): { name: string; gold: number; essence: number; minutes: number } | { error: string } {
  if (kind === 'rank') {
    if (save.buildings.townhall.level < 3) return { error: 'Rathaus Stufe 3' }
    if (monster.skills.sigRank >= 5) return { error: 'Die Signatur hat den höchsten Rang.' }
    const rarityCap = skillsCfg.signatureRank.maxRankByRarity[monster.rarity] ?? 2
    const trainCap = skillsCfg.signatureRank.maxRankByTraining[save.buildings.training.level] ?? 1
    if (monster.skills.sigRank >= rarityCap) return { error: 'Diese Seltenheit kann den Rang nicht weiter steigern.' }
    if (monster.skills.sigRank >= trainCap) return { error: 'Das Trainingsgelände ist dafür noch zu niedrig.' }
    const cost = rankCost(monster.skills.sigRank)
    return { name: `Signatur-Rang ${monster.skills.sigRank + 1}`, ...cost }
  }
  const sp = species(monster.speciesId)
  if (kind === 'learn') {
    const skill = skillsCfg.learnSkills.find((row) => row.id === skillId)
    if (!skill) return { error: 'Unbekannter Skill.' }
    if (monster.skills.learned.includes(skill.id)) return { error: 'Dieser Skill ist schon gelernt.' }
    if (skill.typeReq && skill.typeReq !== sp.type) return { error: 'Dieser Skill passt nicht zum Typ.' }
    if (save.buildings.townhall.level < skillsCfg.slots.slot2.townhall) return { error: 'Rathaus Stufe 3' }
    if (monster.level < skillsCfg.slots.slot2.monsterLevel) return { error: `Monster-Stufe ${skillsCfg.slots.slot2.monsterLevel}` }
    const cost = tierCost(skill.tier as 1 | 2 | 3)
    if (save.buildings.training.level < cost.training) return { error: `Trainingsgelände Stufe ${cost.training}` }
    return { name: skill.name, gold: cost.gold, essence: cost.essence, minutes: cost.minutes }
  }
  const passive = skillsCfg.passives.find((row) => row.id === skillId)
  if (!passive) return { error: 'Unbekannte Passive.' }
  if (monster.skills.learned.includes(passive.id)) return { error: 'Diese Passive ist schon gelernt.' }
  if (passive.typeReq && passive.typeReq !== sp.type) return { error: 'Diese Passive passt nicht zum Typ.' }
  if (save.buildings.townhall.level < skillsCfg.slots.slot3.townhall) return { error: 'Rathaus Stufe 5' }
  if (save.buildings.training.level < skillsCfg.slots.slot3.training) return { error: 'Trainingsgelände Stufe 5' }
  if (monster.level < skillsCfg.slots.slot3.monsterLevel) return { error: `Monster-Stufe ${skillsCfg.slots.slot3.monsterLevel}` }
  const cost = tierCost('passive')
  return { name: passive.name, gold: cost.gold, essence: cost.essence, minutes: cost.minutes }
}

export function skillOffers(save: SaveData, uid: string): SkillOffer[] {
  const monster = monsterByUid(save, uid)
  if (!monster) return []
  const offers: SkillOffer[] = []
  if (monster.skills.sigRank < 5) {
    const gate = skillGate(save, monster, 'rank', 'sig')
    const cost = rankCost(monster.skills.sigRank)
    offers.push({
      id: 'sig',
      name: `Signatur auf Rang ${monster.skills.sigRank + 1}`,
      kind: 'rank',
      gold: cost.gold,
      essence: cost.essence,
      minutes: cost.minutes,
      blocked: 'error' in gate ? gate.error : ''
    })
  }
  const sp = species(monster.speciesId)
  for (const skill of skillsCfg.learnSkills) {
    if (skill.typeReq && skill.typeReq !== sp.type) continue
    if (monster.skills.learned.includes(skill.id)) continue
    const cost = tierCost(skill.tier as 1 | 2 | 3)
    if (save.buildings.training.level + 1 < cost.training) continue
    const gate = skillGate(save, monster, 'learn', skill.id)
    offers.push({
      id: skill.id,
      name: skill.name,
      kind: 'learn',
      gold: cost.gold,
      essence: cost.essence,
      minutes: cost.minutes,
      blocked: 'error' in gate ? gate.error : ''
    })
  }
  if (save.buildings.training.level >= 4) {
    for (const passive of skillsCfg.passives) {
      if (passive.typeReq && passive.typeReq !== sp.type) continue
      if (monster.skills.learned.includes(passive.id)) continue
      const cost = tierCost('passive')
      const gate = skillGate(save, monster, 'passive', passive.id)
      offers.push({
        id: passive.id,
        name: passive.name,
        kind: 'passive',
        gold: cost.gold,
        essence: cost.essence,
        minutes: cost.minutes,
        blocked: 'error' in gate ? gate.error : ''
      })
    }
  }
  return offers
}

export function startSkillTraining(save: SaveData, uid: string, kind: 'rank' | 'learn' | 'passive', skillId: string, now: number): ActionResult {
  tick(save, now)
  const monster = monsterByUid(save, uid)
  if (!monster) return fail('Monster nicht gefunden.')
  if (save.buildings.training.slots.some((slot) => slot.monsterUid === uid)) return fail('Dieses Monster trainiert bereits.')
  const def = buildings.training.levels[save.buildings.training.level - 1]
  if (!def || save.buildings.training.slots.length >= def.slots) return fail('Keine freien Trainingsplätze.')
  const gate = skillGate(save, monster, kind, skillId)
  if ('error' in gate) return fail(gate.error)
  if (save.currencies.gold < gate.gold) return fail(`Nicht genug Gold (${gate.gold}).`)
  if (save.currencies.essence < gate.essence) return fail(`Nicht genug Essenz (${gate.essence}).`)
  save.currencies.gold -= gate.gold
  save.currencies.essence -= gate.essence
  save.buildings.training.slots.push({
    kind: 'skill',
    monsterUid: uid,
    startAt: now,
    endsAt: now + gate.minutes * 60_000,
    exp: 0,
    goldPaid: 0,
    expPerMin: 0,
    skillJob: { type: kind, skillId: kind === 'rank' ? 'sig' : skillId, goldPaid: gate.gold, essencePaid: gate.essence }
  })
  return ok(undefined, [`${gate.name} gestartet (${gate.minutes} Min.).`])
}

export function equipSkill(save: SaveData, uid: string, skillId: string): ActionResult {
  const monster = monsterByUid(save, uid)
  if (!monster) return fail('Monster nicht gefunden.')
  if (!monster.skills.learned.includes(skillId)) return fail('Dieser Skill ist noch nicht gelernt.')
  const learn = skillsCfg.learnSkills.find((row) => row.id === skillId)
  if (learn) {
    if (save.buildings.townhall.level < skillsCfg.slots.slot2.townhall || monster.level < skillsCfg.slots.slot2.monsterLevel) return fail('Slot 2 ist noch gesperrt.')
    monster.skills.slot2 = skillId
    return ok(undefined, [`${learn.name} ausgerüstet.`])
  }
  const passive = skillsCfg.passives.find((row) => row.id === skillId)
  if (!passive) return fail('Unbekannter Skill.')
  if (save.buildings.townhall.level < skillsCfg.slots.slot3.townhall || save.buildings.training.level < skillsCfg.slots.slot3.training || monster.level < skillsCfg.slots.slot3.monsterLevel) {
    return fail('Slot 3 ist noch gesperrt.')
  }
  monster.skills.slot3 = skillId
  return ok(undefined, [`${passive.name} ausgerüstet.`])
}

export function swapSkillOrder(save: SaveData, uid: string): ActionResult {
  const monster = monsterByUid(save, uid)
  if (!monster) return fail('Monster nicht gefunden.')
  monster.skills.skillOrder = monster.skills.skillOrder[0] === 'sig' ? ['slot2', 'sig'] : ['sig', 'slot2']
  return ok(undefined, [monster.skills.skillOrder[0] === 'sig' ? 'Signatur zuerst.' : 'Lernskill zuerst.'])
}

export function trainingReadyAt(slot: TrainingSlot, monster: MonsterInstance): number {
  if (slot.kind === 'skill') return slot.endsAt
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
  if (slot.kind === 'skill' && slot.skillJob) {
    save.buildings.training.slots.splice(index, 1)
    const job = slot.skillJob
    const messages = [...noteQuest(save, 'train1')]
    if (job.type === 'rank') {
      monster.skills.sigRank = Math.min(5, monster.skills.sigRank + 1) as 1 | 2 | 3 | 4 | 5
      messages.unshift(`${species(monster.speciesId).name}: Signatur-Rang ${monster.skills.sigRank}.`)
    } else if (job.type === 'passive') {
      if (!monster.skills.learned.includes(job.skillId)) monster.skills.learned.push(job.skillId)
      if (!monster.skills.slot3) monster.skills.slot3 = job.skillId
      messages.unshift(`${species(monster.speciesId).name} lernt eine Passive.`)
    } else {
      if (!monster.skills.learned.includes(job.skillId)) monster.skills.learned.push(job.skillId)
      if (!monster.skills.slot2) monster.skills.slot2 = job.skillId
      messages.unshift(`${species(monster.speciesId).name} lernt einen Skill.`)
    }
    return ok(undefined, messages)
  }
  const settled = settleTraining(slot, monster, ready)
  const granted = grantExp(monster, settled.expGain)
  save.currencies.gold += settled.goldRefund
  save.buildings.training.slots.splice(index, 1)
  const messages = [`${species(monster.speciesId).name} erhält ${granted.gained} EP.`, ...noteQuest(save, 'train1')]
  if (granted.levels) {
    messages.push(`Level ${monster.level} erreicht.`)
    messages.push(...noteQuest(save, 'levelup1'))
  }
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
  if (slot.kind === 'skill' && slot.skillJob) {
    save.currencies.gold += slot.skillJob.goldPaid
    save.currencies.essence += slot.skillJob.essencePaid
    save.buildings.training.slots.splice(index, 1)
    return ok(undefined, [`Training abgebrochen. +${slot.skillJob.goldPaid} Gold, +${slot.skillJob.essencePaid} Essenz.`])
  }
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

function grantRetroChests(save: SaveData): void {
  for (const [chapter, chests] of Object.entries(starChests)) {
    const stars = stages.filter((stage) => stage.chapter === Number(chapter)).reduce((sum, stage) => sum + (save.campaign.cleared[stage.id] ?? 0), 0)
    for (const chest of chests) {
      const id = `${chapter}-${chest.stars}`
      if (stars < chest.stars || save.campaign.chestsClaimed.includes(id)) continue
      save.campaign.chestsClaimed.push(id)
      save.currencies.gold += chest.reward.gold ?? 0
      save.currencies.gems += chest.reward.gems ?? 0
      save.currencies.essence += chest.reward.essence ?? 0
      save.currencies.tickets += chest.reward.tickets ?? 0
    }
  }
}

function unlockTypeFor(save: SaveData, stageId: string): string[] {
  const messages: string[] = []
  const row = typeUnlocks.typeUnlocks.find((entry) => entry.onStageCleared === stageId)
  if (!row || save.activeTypes.includes(row.type as TypeId)) return messages
  save.activeTypes.push(row.type as TypeId)
  messages.push(`${row.type} ist jetzt im Portal.`)
  if (row.gift) {
    const gift = makeMonster(row.gift.speciesId, row.gift.rarity as Rarity, Date.now(), false)
    gift.level = row.gift.level
    save.monsters.push(gift)
    rememberCollected(save, gift.speciesId)
    messages.push(`Geschenk: ${species(gift.speciesId).name}.`)
  }
  return messages
}

export function chapterStars(save: SaveData, chapter: number): number {
  return stages.filter((stage) => stage.chapter === chapter).reduce((sum, stage) => sum + (save.campaign.cleared[stage.id] ?? 0), 0)
}

export function claimQuest(save: SaveData, id: string): ActionResult {
  if (!hasUnlock(save.buildings.townhall.level, 'daily_quests')) return fail('Rathaus Stufe 2')
  const def = dailyCfg.quests.find((quest) => quest.id === id)
  if (!def) return fail('Unbekannte Aufgabe.')
  if (save.daily.claimed.includes(id)) return fail('Schon abgeholt.')
  if ((save.daily.quests[id] ?? 0) < def.target) return fail('Noch nicht erfüllt.')
  save.daily.claimed.push(id)
  payReward(save, def.reward)
  const messages = [`${def.name} abgeholt.`]
  messages.push(...maybeChest(save))
  return ok(undefined, messages)
}

function payReward(save: SaveData, reward: { gold?: number; gems?: number; essence?: number; tickets?: number }): void {
  save.currencies.gold += reward.gold ?? 0
  save.currencies.gems += reward.gems ?? 0
  save.currencies.essence += reward.essence ?? 0
  save.currencies.tickets += reward.tickets ?? 0
}

function maybeChest(save: SaveData): string[] {
  if (save.daily.claimedAll) return []
  const base = dailyCfg.quests.filter((quest) => quest.countsForChest)
  if (!base.every((quest) => save.daily.claimed.includes(quest.id))) return []
  save.daily.claimedAll = true
  payReward(save, dailyCfg.chest.reward)
  return ['Abschluss-Truhe: +40 Juwelen, +500 Gold, +30 Essenz.']
}

function autoClaimQuests(save: SaveData): string[] {
  if (!dailyCfg.autoClaimOnReset || !hasUnlock(save.buildings.townhall.level, 'daily_quests')) return []
  const messages: string[] = []
  for (const quest of dailyCfg.quests) {
    if (quest.unlock && save.buildings.breeding.level < (quest.unlock.breeding ?? 1)) continue
    if (save.daily.claimed.includes(quest.id)) continue
    if ((save.daily.quests[quest.id] ?? 0) < quest.target) continue
    save.daily.claimed.push(quest.id)
    payReward(save, quest.reward)
    messages.push(`${quest.name} automatisch gutgeschrieben.`)
  }
  messages.push(...maybeChest(save))
  return messages
}

export function teamPower(save: SaveData): number {
  return teamMembers(save).reduce((sum, monster) => {
    const extra = (monster.skills.slot2 ? 1 : 0) + (monster.skills.slot3 ? 1 : 0)
    return sum + combatPower(instanceStats(monster.speciesId, monster.rarity, monster.level, monster.potential), extra)
  }, 0)
}

export function stageEnemyPower(stage: StageDef): number {
  return stageEnemyInputs(stage).reduce((sum, enemy) => {
    const extra = enemy.learned ? 1 : 0
    const stats = instanceStats(enemy.speciesId, enemy.rarity, enemy.level, enemy.potential)
    return sum + combatPower(stats, extra, enemy.boss ? { hpMult: enemy.hpMult, atkMult: enemy.atkMult } : undefined)
  }, 0)
}

function noteQuest(save: SaveData, key: string): string[] {
  if (!hasUnlock(save.buildings.townhall.level, 'daily_quests')) return []
  const def = dailyCfg.quests.find((quest) => quest.id === key)
  if (!def) return []
  if (def.unlock && save.buildings.breeding.level < (def.unlock.breeding ?? 1)) return []
  const prev = save.daily.quests[key] ?? 0
  if (prev >= def.target) return []
  save.daily.quests[key] = prev + 1
  if (save.daily.quests[key] >= def.target && !save.daily.claimed.includes(key)) return [`Tagesaufgabe fertig: ${def.name}.`]
  return []
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

export function setDefense(save: SaveData, slot: SlotId, uid: string | null): ActionResult {
  if (!save.arena?.defense) return fail('Arena ist noch nicht bereit.')
  const open = teamSlotLimit(save.buildings.townhall.level)
  if (!open.includes(slot)) return fail('Rathaus Stufe 3')
  if (uid == null) {
    save.arena.defense[slot] = null
    return ok(undefined, [])
  }
  const monster = monsterByUid(save, uid)
  if (!monster) return fail('Monster nicht gefunden.')
  for (const other of ALL_SLOTS) {
    if (other !== slot && save.arena.defense[other] === uid) save.arena.defense[other] = null
  }
  save.arena.defense[slot] = uid
  return ok(undefined, [])
}

export function copyTeamToDefense(save: SaveData): ActionResult {
  if (!save.arena) return fail('Arena ist noch nicht bereit.')
  const open = new Set(teamSlotLimit(save.buildings.townhall.level))
  const defense = { F1: null, F2: null, H1: null, H2: null, H3: null } as Record<SlotId, string | null>
  for (const slot of ALL_SLOTS) defense[slot] = open.has(slot) ? save.team[slot] : null
  save.arena.defense = defense
  return ok(undefined, ['Team übernommen.'])
}

export function clearDefense(save: SaveData): ActionResult {
  if (!save.arena) return fail('Arena ist noch nicht bereit.')
  save.arena.defense = { F1: null, F2: null, H1: null, H2: null, H3: null }
  return ok(undefined, ['Verteidigung geleert.'])
}

export { dismissSeasonResult }

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
  applied?: boolean
  arena?: {
    tier: string
    ghostName: string
    points: number
    pointsDelta: number
    rankGems: number
  }
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
  let allWins = true
  let bestStars: 0 | 1 | 2 | 3 = 0
  let previewCleared = save.campaign.cleared[stage.id] ?? 0
  let tip = ''
  for (let i = 0; i < count; i++) {
    const seed = nextSeed(save)
    const enemies = stageEnemyInputs(stage)
    const input = {
      seed,
      allies,
      enemies,
      allySynergy: hasUnlock(save.buildings.townhall.level, 'synergies'),
      allyClassSynergy: hasUnlock(save.buildings.townhall.level, 'class_synergies'),
      enemySynergy: Boolean(stage.enemySynergies),
      enemyClassSynergy: Boolean(stage.enemyClassSynergies)
    }
    const log = simulateBattle(input)
    logs.push(log)
    if (log.result === 'win') {
      const won = previewWin(stage, log.stars, previewCleared)
      addReward(bundle, won)
      previewCleared = Math.max(previewCleared, log.stars)
      if (log.stars > bestStars) bestStars = log.stars
    } else {
      allWins = false
      bundle.exp += Math.floor(stage.rewards.repeat.exp * rewardsCfgLoss())
      tip = battleTip(input, log)
    }
  }
  return ok({ stageId, logs, rewards: bundle, victory: allWins, tip, stars: bestStars, applied: false }, [])
}

export function previewArenaFight(save: SaveData, tierId: string, now: number): BattleLog | null {
  const fought = runArenaBattle(save, tierId, now)
  return fought?.log ?? null
}

function runArenaBattle(save: SaveData, tierId: string, now: number): { ghostName: string; tier: string; input: BattleInput; log: BattleLog } | null {
  const ghost = listArenaOpponents(save, now).find((entry) => entry.tier === tierId)
  const allies = allyInputs(save)
  if (!ghost || !allies.length) return null
  const synergy = hasUnlock(save.buildings.townhall.level, 'synergies')
  const classSynergy = hasUnlock(save.buildings.townhall.level, 'class_synergies')
  const input: BattleInput = {
    seed: ghost.seed,
    allies,
    enemies: ghostBattleUnits(ghost),
    allySynergy: synergy,
    enemySynergy: synergy,
    allyClassSynergy: classSynergy,
    enemyClassSynergy: classSynergy
  }
  return { ghostName: ghost.name, tier: ghost.tier, input, log: simulateBattle(input) }
}

export function fightArena(save: SaveData, tierId: string, now: number): ActionResult<FightReport> {
  tick(save, now)
  if (!arenaUnlocked(save)) return fail('Rathaus Stufe 3')
  if (!allyInputs(save).length) return fail('Stell mindestens ein Monster auf.')
  if (save.arena.attemptsUsed >= arenaCfg.attemptsPerDay) return fail('Keine Versuche mehr heute.')
  const fought = runArenaBattle(save, tierId, now)
  if (!fought) return fail('Unbekannter Gegner.')
  const victory = fought.log.result === 'win'
  const scored = applyArenaOutcome(save, tierId, victory ? 'win' : 'loss')
  save.arena.attemptsUsed += 1
  // A loss keeps the current three opponents, so the free daily reroll still changes the board.
  if (victory) save.arena.rerollIndex += 1
  save.lastBattleResult = victory ? 'win' : 'loss'
  const rewards = emptyReward()
  rewards.gold = scored.gold
  rewards.gems = scored.rankGems
  return ok({
    stageId: `Arena · ${fought.ghostName}`,
    logs: [fought.log],
    rewards,
    victory,
    tip: victory ? '' : battleTip(fought.input, fought.log),
    stars: victory ? fought.log.stars : 0,
    applied: true,
    arena: {
      tier: tierId,
      ghostName: fought.ghostName,
      points: scored.points,
      pointsDelta: scored.pointsDelta,
      rankGems: scored.rankGems
    }
  }, [])
}

export function commitFightRewards(save: SaveData, report: FightReport): string[] {
  if (report.arena || report.applied) return []
  report.applied = true
  const bundle = report.rewards
  save.currencies.gold += bundle.gold
  save.currencies.gems += bundle.gems
  save.currencies.essence += bundle.essence
  save.currencies.tickets += bundle.tickets
  save.lastBattleResult = report.victory ? 'win' : 'loss'
  const messages: string[] = []
  if (report.victory) {
    const previous = save.campaign.cleared[report.stageId] ?? 0
    const first = previous <= 0
    save.campaign.cleared[report.stageId] = Math.max(previous, report.stars) as 1 | 2 | 3
    if (first) messages.push(...unlockTypeFor(save, report.stageId))
    const beforeGold = save.currencies.gold
    grantRetroChests(save)
    if (save.currencies.gold > beforeGold) messages.push('Sterne-Truhe geöffnet.')
  }
  bundle.levels = grantTeamExp(save, bundle.exp)
  if (bundle.levels > 0) messages.push(...noteQuest(save, 'levelup1'))
  const synergy = synergyView(
    allyInputs(save).map((unit) => ({ type: species(unit.speciesId).type, class: species(unit.speciesId).class })),
    hasUnlock(save.buildings.townhall.level, 'synergies'),
    hasUnlock(save.buildings.townhall.level, 'class_synergies')
  ).active
  for (const log of report.logs) {
    if (log.result === 'win') {
      messages.push(...noteQuest(save, 'win3'))
      if (synergy) messages.push(...noteQuest(save, 'synergy2'))
    }
  }
  if (save.campaign.cleared['1-5']) save.tutorialDone = true
  return messages
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

function previewWin(stage: StageDef, stars: 0 | 1 | 2 | 3, previous: number): RewardBundle {
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
    list.push({
      speciesId: monster.speciesId,
      rarity: monster.rarity,
      level: monster.level,
      slot,
      potential: monster.potential,
      sigRank: monster.skills.sigRank,
      learned: monster.skills.slot2,
      slot3: monster.skills.slot3,
      skillOrder: monster.skills.skillOrder
    })
  }
  return list
}

export function stageEnemyInputs(stage: StageDef): BattleUnitInput[] {
  const rows: BattleUnitInput[] = stage.enemies.map((enemy) => ({
    speciesId: enemy.speciesId,
    rarity: (enemy.rarity ?? stage.enemyRarity) as Rarity,
    level: stage.enemyLevel,
    slot: enemy.slot,
    learned: enemy.learned ?? null,
    boss: Boolean(enemy.boss)
  }))
  if (stage.boss) {
    rows.push({
      speciesId: stage.boss.speciesId,
      rarity: stage.boss.rarity,
      level: stage.enemyLevel,
      slot: stage.boss.slot,
      learned: null,
      boss: true,
      hpMult: stage.boss.hpMult ?? 1.5,
      atkMult: stage.boss.atkMult ?? 0.85,
      stunChanceMult: stage.boss.statusResist?.stunChanceMult ?? 0.5,
      poisonPctPerStack: stage.boss.statusResist?.poisonPctPerStack ?? 0.02,
      mechanics: stage.boss.mechanics
    })
  }
  return rows
}

export function breedPreview(save: SaveData, uidA: string, uidB: string): { text: string; blocked: string } {
  if (save.buildings.breeding.level < 1) return { text: '', blocked: 'Die Zuchtstation ist noch nicht gebaut.' }
  if (uidA === uidB) return { text: '', blocked: 'Wähle zwei verschiedene Monster.' }
  const parentA = monsterByUid(save, uidA)
  const parentB = monsterByUid(save, uidB)
  if (!parentA || !parentB) return { text: '', blocked: 'Monster nicht gefunden.' }
  const baseRarity = Math.floor((parentA.rarity + parentB.rarity) / 2)
  const cost = breedingCfg.costByBaseRarity[baseRarity]
  const up = parentA.rarity === parentB.rarity ? breedingCfg.rarityUpChance.sameRarity : breedingCfg.rarityUpChance.differentRarity
  const def = buildings.breeding.levels[save.buildings.breeding.level - 1]
  const minutes = Math.round(cost.minutes * (def?.durationMult ?? 1))
  const names = [parentA, parentB]
    .filter((parent, index, list) => species(parent.speciesId).baseRarity <= Math.min(9, baseRarity + 1) && list.findIndex((other) => other.speciesId === parent.speciesId) === index)
    .map((parent) => species(parent.speciesId).name)
  const lo = Math.min(10, Math.floor((parentA.potential.hp + parentB.potential.hp) / 2))
  const hi = Math.min(10, lo + 2)
  const text = `Basis ${rarityInfo(baseRarity as Rarity).name} · Aufstieg ${Math.round(up * 100)} % · ${names.join(' / ')} · Potenzial ${lo}–${hi} · ${cost.essence * breedingCfg.goldPerEssence} Gold · ${cost.essence} Essenz · ${minutes} Min.`
  if (parentA.level < breedingCfg.minParentLevel || parentB.level < breedingCfg.minParentLevel) return { text, blocked: `Beide Eltern brauchen Stufe ${breedingCfg.minParentLevel}.` }
  if (Date.now() < parentA.breedReadyAt || Date.now() < parentB.breedReadyAt) return { text, blocked: 'Ein Elternteil ist noch nicht ausgeruht.' }
  return { text, blocked: '' }
}

export function startBreed(save: SaveData, uidA: string, uidB: string, now: number): ActionResult {
  tick(save, now)
  const level = save.buildings.breeding.level
  if (level < 1) return fail('Die Zuchtstation ist noch nicht gebaut.')
  const def = buildings.breeding.levels[level - 1]
  if (!def) return fail('Die Zuchtstation ist noch nicht gebaut.')
  if (save.buildings.breeding.slots.length >= def.slots) return fail('Kein freier Zuchtplatz.')
  if (uidA === uidB) return fail('Wähle zwei verschiedene Monster.')
  const parentA = monsterByUid(save, uidA)
  const parentB = monsterByUid(save, uidB)
  if (!parentA || !parentB) return fail('Monster nicht gefunden.')
  if (parentA.level < breedingCfg.minParentLevel || parentB.level < breedingCfg.minParentLevel) return fail(`Beide Eltern brauchen Stufe ${breedingCfg.minParentLevel}.`)
  if (now < parentA.breedReadyAt || now < parentB.breedReadyAt) return fail('Ein Elternteil ist noch nicht ausgeruht.')
  const busy = new Set(save.buildings.breeding.slots.flatMap((slot) => [slot.parentA, slot.parentB]))
  if (busy.has(uidA) || busy.has(uidB)) return fail('Dieses Monster züchtet schon.')
  const baseRarity = Math.floor((parentA.rarity + parentB.rarity) / 2)
  const cost = breedingCfg.costByBaseRarity[baseRarity]
  const essence = cost.essence
  const gold = essence * breedingCfg.goldPerEssence
  if (save.currencies.gold < gold) return fail(`Nicht genug Gold (${gold}).`)
  if (save.currencies.essence < essence) return fail(`Nicht genug Essenz (${essence}).`)
  const up = parentA.rarity === parentB.rarity ? breedingCfg.rarityUpChance.sameRarity : breedingCfg.rarityUpChance.differentRarity
  const rarity = (rng(save) < up ? Math.min(9, baseRarity + 1) : baseRarity) as Rarity
  const options = [parentA, parentB].filter((parent, index, list) => species(parent.speciesId).baseRarity <= rarity && list.findIndex((other) => other.speciesId === parent.speciesId) === index)
  const chosen = options.length === 1 || rng(save) < 0.5 ? options[0] : options[1]
  const potential = { hp: 0, atk: 0, def: 0 }
  for (const stat of ['hp', 'atk', 'def'] as const) {
    const roll = rng(save) * 100
    const bonus = roll < 50 ? 0 : roll < 85 ? 1 : 2
    potential[stat] = Math.min(10, Math.floor((parentA.potential[stat] + parentB.potential[stat]) / 2) + bonus)
  }
  const childType = species(chosen.speciesId).type
  const inheritedPool = [...parentA.skills.learned, ...parentB.skills.learned].filter((id) => {
    const skill = skillsCfg.learnSkills.find((row) => row.id === id)
    return !skill?.typeReq || skill.typeReq === childType
  })
  const inheritedSkill = inheritedPool.length && rng(save) < breedingCfg.skillInheritChance ? inheritedPool[Math.floor(rng(save) * inheritedPool.length)] : null
  save.currencies.gold -= gold
  save.currencies.essence -= essence
  const endsAt = now + Math.round(cost.minutes * 60 * def.durationMult) * 1000
  parentA.breedReadyAt = now + breedingCfg.parentCooldownSec * 1000
  parentB.breedReadyAt = now + breedingCfg.parentCooldownSec * 1000
  save.buildings.breeding.slots.push({
    parentA: uidA,
    parentB: uidB,
    startAt: now,
    endsAt,
    goldPaid: gold,
    essencePaid: essence,
    result: { speciesId: chosen.speciesId, rarity, potential, inheritedSkill, generation: Math.max(parentA.generation, parentB.generation) + 1 }
  })
  return ok(undefined, [`Zucht gestartet.`, ...noteQuest(save, 'breed1')])
}

export function claimBreed(save: SaveData, index: number, now: number): ActionResult {
  const slot = save.buildings.breeding.slots[index]
  if (!slot) return fail('Keine Zucht.')
  if (now < slot.endsAt) return fail('Die Zucht läuft noch.')
  if (!inventoryRoom(save, 1)) return fail('Das Lager ist voll. Die Zucht wartet.')
  const child = makeMonster(slot.result.speciesId, slot.result.rarity, now, false)
  child.potential = slot.result.potential
  child.generation = slot.result.generation
  if (slot.result.inheritedSkill) {
    child.skills.learned = [slot.result.inheritedSkill]
    child.skills.slot2 = slot.result.inheritedSkill
  }
  save.monsters.push(child)
  rememberCollected(save, child.speciesId)
  save.buildings.breeding.slots.splice(index, 1)
  return ok(undefined, [`${species(child.speciesId).name} ist geschlüpft.`, ...noteQuest(save, 'breed1')])
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
  const owned = new Set(save.monsters.map((monster) => monster.speciesId))
  for (const entry of raw) {
    const duplicateEssence = owned.has(entry.speciesId) ? rarityInfo(entry.rarity).essence : 0
    if (duplicateEssence > 0) {
      save.currencies.essence += duplicateEssence
      messages.push(`${species(entry.speciesId).name}: Duplikat +${duplicateEssence} Essenz.`)
    }
    owned.add(entry.speciesId)
    const monster = makeMonster(entry.speciesId, entry.rarity, now, false)
    save.monsters.push(monster)
    rememberCollected(save, entry.speciesId)
    const history: GachaHistoryEntry = { t: now, speciesId: entry.speciesId, rarity: entry.rarity, upgraded: entry.upgraded }
    save.gacha.history.unshift(history)
    results.push({ ...entry, uid: monster.uid, duplicateEssence })
    messages.push(...noteMilestone(save, entry.rarity))
  }
  save.gacha.history = save.gacha.history.slice(0, 100)
  messages.push(...noteQuest(save, 'pull1'))
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
  if (save.buildings.breeding.slots.some((slot) => slot.parentA === uid || slot.parentB === uid)) return fail('Dieses Monster züchtet gerade.')
  if (save.monsters.length <= 1) return fail('Dein letztes Monster bleibt bei dir.')
  const inTeam = ALL_SLOTS.filter((slot) => save.team[slot] === uid)
  const teamCount = ALL_SLOTS.filter((slot) => save.team[slot]).length
  if (inTeam.length && teamCount - inTeam.length < 1) return fail('Das letzte Monster im Team kann nicht freigelassen werden.')
  const essence = rarityInfo(monster.rarity).essence
  save.currencies.essence += essence
  save.monsters = save.monsters.filter((m) => m.uid !== uid)
  for (const slot of inTeam) save.team[slot] = null
  if (save.arena?.defense) {
    for (const slot of ALL_SLOTS) {
      if (save.arena.defense[slot] === uid) save.arena.defense[slot] = null
    }
  }
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

export function applyRewarded(save: SaveData, placement: AdPlacement, now: number, context?: { gold?: number; expEach?: number; buildingId?: BuildingId; trainUid?: string; breedIndex?: number }): Promise<ActionResult> {
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
    } else if (placement === 'breeding_speed' && context?.breedIndex != null) {
      const slot = save.buildings.breeding.slots[context.breedIndex]
      if (slot) {
        const remain = Math.max(0, slot.endsAt - now)
        slot.endsAt = now + Math.floor(remain * adsCfg.rewarded.placements.breeding_speed.reward.breedingRemainingPct)
        messages.push('Restliche Zuchtzeit verkürzt.')
      }
    } else if (placement === 'free_pull') {
      messages.push('Gratis-Ziehung bereit.')
    }
    return ok(undefined, messages)
  })
}

export async function closeToCity(save: SaveData, now: number, victory: boolean, allowAds = true): Promise<void> {
  save.lastBattleResult = victory ? 'win' : 'loss'
  if (!allowAds) return
  await maybeInterstitial(save, 'battle_end', now)
}

export async function notifyChapterChange(save: SaveData, now: number): Promise<void> {
  await maybeInterstitial(save, 'chapter_change', now)
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
