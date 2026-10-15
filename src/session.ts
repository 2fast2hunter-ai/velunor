import {
  ascend,
  cancelTraining,
  cancelUpgrade,
  claimBreed,
  claimQuest,
  claimTraining,
  closeToCity,
  collectMine,
  createSave,
  SAVE_KEY,
  commitFightRewards,
  equipSkill,
  fightArena,
  fightStage,
  loadGame,
  notifyChapterChange,
  pull,
  clearDefense,
  copyTeamToDefense,
  dismissSeasonResult,
  releaseMonster,
  setDefense,
  setSpeed,
  setTeam,
  startBreed,
  startSkillTraining,
  startTraining,
  startUpgrade,
  swapSkillOrder,
  tick,
  toggleLock,
  writeStorage,
  type ActionResult,
  type FightReport
} from './state'
import { claimArenaChest, rerollArena } from './arena'
import type { BuildingId, SlotId } from './types'

export const prefs = { sound: true }

type Listener = () => void
const listeners = new Set<Listener>()

class Session {
  save = createSave()
  toasts: string[] = []

  boot(): void {
    this.save = loadGame(Date.now())
    prefs.sound = this.save.settings.sound
    this.persist()
  }

  persist(): void {
    if (!persistEnabled) return
    prefs.sound = this.save.settings.sound
    writeStorage(this.save)
  }

  on(listener: Listener): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  private emit(): void {
    for (const listener of listeners) listener()
  }

  private take(result: ActionResult<unknown>): void {
    if (result.messages.length) this.toasts.push(...result.messages)
    this.persist()
    this.emit()
  }

  tick(): void {
    const seasonKey = this.save.arena?.seasonKey
    const pending = this.save.arena?.lastSeasonResult
    const messages = tick(this.save, Date.now())
    const seasonMoved = this.save.arena?.seasonKey !== seasonKey || this.save.arena?.lastSeasonResult !== pending
    if (messages.length) this.toasts.push(...messages)
    if (messages.length || seasonMoved) {
      this.persist()
      this.emit()
    }
  }

  toast(message: string): void {
    this.toasts.push(message)
    this.emit()
  }

  collectMine(): number {
    const result = collectMine(this.save, Date.now())
    this.take(result)
    return result.ok ? result.value ?? 0 : 0
  }

  startUpgrade(id: BuildingId): boolean {
    const result = startUpgrade(this.save, id, Date.now())
    this.take(result)
    if (!result.ok && result.reason) this.toast(result.reason)
    return result.ok
  }

  cancelUpgrade(id: BuildingId): void {
    this.take(cancelUpgrade(this.save, id))
  }

  startTraining(uid: string, minutes: number): boolean {
    const result = startTraining(this.save, uid, minutes, Date.now())
    this.take(result)
    if (!result.ok && result.reason) this.toast(result.reason)
    return result.ok
  }

  startSkill(uid: string, kind: 'rank' | 'learn' | 'passive', skillId: string): boolean {
    const result = startSkillTraining(this.save, uid, kind, skillId, Date.now())
    this.take(result)
    if (!result.ok && result.reason) this.toast(result.reason)
    return result.ok
  }

  equipSkill(uid: string, skillId: string): void {
    const result = equipSkill(this.save, uid, skillId)
    this.take(result)
    if (!result.ok && result.reason) this.toast(result.reason)
  }

  swapSkillOrder(uid: string): void {
    const result = swapSkillOrder(this.save, uid)
    this.take(result)
    if (!result.ok && result.reason) this.toast(result.reason)
  }

  startBreed(uidA: string, uidB: string): boolean {
    const result = startBreed(this.save, uidA, uidB, Date.now())
    this.take(result)
    if (!result.ok && result.reason) this.toast(result.reason)
    return result.ok
  }

  claimBreed(index: number): void {
    const result = claimBreed(this.save, index, Date.now())
    this.take(result)
    if (!result.ok && result.reason) this.toast(result.reason)
  }

  async changeChapter(): Promise<void> {
    await notifyChapterChange(this.save, Date.now())
    this.persist()
  }

  claimQuest(id: string): void {
    const result = claimQuest(this.save, id)
    this.take(result)
    if (!result.ok && result.reason) this.toast(result.reason)
  }

  claimTraining(uid: string): void {
    const result = claimTraining(this.save, uid, Date.now())
    this.take(result)
    if (!result.ok && result.reason) this.toast(result.reason)
  }

  cancelTraining(uid: string): void {
    this.take(cancelTraining(this.save, uid, Date.now()))
  }

  setTeam(slot: SlotId, uid: string | null): void {
    const result = setTeam(this.save, slot, uid)
    this.take(result)
    if (!result.ok && result.reason) this.toast(result.reason)
  }

  setDefense(slot: SlotId, uid: string | null): void {
    const result = setDefense(this.save, slot, uid)
    this.take(result)
    if (!result.ok && result.reason) this.toast(result.reason)
  }

  copyTeamToDefense(): void {
    const result = copyTeamToDefense(this.save)
    this.take(result)
  }

  clearDefense(): void {
    const result = clearDefense(this.save)
    this.take(result)
  }

  dismissSeason(): void {
    dismissSeasonResult(this.save)
    this.persist()
    this.emit()
  }

  arenaFight(tierId: string): FightReport | null {
    const result = fightArena(this.save, tierId, Date.now())
    if (!result.ok) {
      if (result.reason) this.toast(result.reason)
      return null
    }
    this.persist()
    this.emit()
    return result.value ?? null
  }

  rerollArena(): void {
    const result = rerollArena(this.save, Date.now())
    this.take({ ok: result.ok, reason: result.reason, messages: result.messages })
    if (!result.ok && result.reason) this.toast(result.reason)
  }

  claimArenaChest(): void {
    const result = claimArenaChest(this.save, Date.now())
    this.take({ ok: result.ok, reason: result.reason, messages: result.messages })
    if (!result.ok && result.reason) this.toast(result.reason)
  }

  fight(stageId: string, count: 1 | 3): FightReport | null {
    const result = fightStage(this.save, stageId, count, Date.now())
    if (!result.ok) {
      if (result.reason) this.toast(result.reason)
      return null
    }
    return result.value ?? null
  }

  commitResult(report: FightReport): void {
    const messages = commitFightRewards(this.save, report)
    if (messages.length) this.toasts.push(...messages)
    this.persist()
    this.emit()
  }

  pull(kind: 'single' | 'multi' | 'tutorial', pay: 'gems' | 'tickets' | 'free') {
    const result = pull(this.save, kind, pay, Date.now())
    this.take(result)
    if (!result.ok && result.reason) this.toast(result.reason)
    return result
  }

  toggleLock(uid: string): void {
    this.take(toggleLock(this.save, uid))
  }

  release(uid: string): void {
    const result = releaseMonster(this.save, uid)
    this.take(result)
    if (!result.ok && result.reason) this.toast(result.reason)
  }

  ascend(uid: string): void {
    const result = ascend(this.save, uid)
    this.take(result)
    if (!result.ok && result.reason) this.toast(result.reason)
  }

  setSpeed(speed: 1 | 2 | 4): void {
    setSpeed(this.save, speed)
    this.persist()
    this.emit()
  }

  toggleSound(): void {
    this.save.settings.sound = !this.save.settings.sound
    prefs.sound = this.save.settings.sound
    this.persist()
    this.emit()
  }

  async leaveResult(victory: boolean, allowAds = true): Promise<void> {
    await closeToCity(this.save, Date.now(), victory, allowAds)
    this.persist()
  }
}

export const session = new Session()

let persistEnabled = true
let switching = false

export function wipeSave(): void {
  persistEnabled = false
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    /* private mode */
  }
}

export function go(from: Phaser.Scene, key: string): void {
  if (switching) return
  if (from.scene.isActive('Battle') && key !== 'Result' && key !== 'City') return
  const plugin = from.scene
  switching = true
  // Let the current pointerup finish before the next scene exists, so the
  // release cannot land on a building and open its modal.
  window.setTimeout(() => {
    switching = false
    const mains = ['City', 'Catalog', 'Team', 'Monsters', 'Portal', 'Campaign', 'Arena', 'Battle', 'Result', 'Preload', 'Boot']
    session.persist()
    if (plugin.isActive(key)) plugin.stop(key)
    plugin.launch(key)
    for (const name of mains) {
      if (name !== key && plugin.isActive(name)) plugin.stop(name)
    }
  }, 0)
}
