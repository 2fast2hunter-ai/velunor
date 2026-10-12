import {
  ascend,
  cancelTraining,
  cancelUpgrade,
  claimTraining,
  closeToCity,
  collectMine,
  createSave,
  fightStage,
  loadSave,
  pull,
  readStorage,
  releaseMonster,
  setSpeed,
  setTeam,
  startTraining,
  startUpgrade,
  tick,
  toggleLock,
  writeStorage,
  type ActionResult,
  type FightReport
} from './state'
import type { BuildingId, SlotId } from './types'

export const prefs = { sound: true }

type Listener = () => void
const listeners = new Set<Listener>()

class Session {
  save = createSave()
  toasts: string[] = []

  boot(): void {
    this.save = loadSave(readStorage(), Date.now())
    prefs.sound = this.save.settings.sound
    this.persist()
  }

  persist(): void {
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
    const messages = tick(this.save, Date.now())
    if (messages.length) {
      this.toasts.push(...messages)
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

  fight(stageId: string, count: 1 | 3): FightReport | null {
    const result = fightStage(this.save, stageId, count, Date.now())
    this.take(result)
    if (!result.ok) {
      if (result.reason) this.toast(result.reason)
      return null
    }
    return result.value ?? null
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

  async leaveResult(victory: boolean): Promise<void> {
    await closeToCity(this.save, Date.now(), victory)
    this.persist()
  }
}

export const session = new Session()

export function go(from: Phaser.Scene, key: string): void {
  if (from.scene.isActive('Battle') && key !== 'Result' && key !== 'City') return
  const mains = ['City', 'Team', 'Monsters', 'Portal', 'Campaign', 'Battle', 'Result', 'Preload', 'Boot']
  session.persist()
  from.scene.launch(key)
  for (const name of mains) {
    if (name !== key && from.scene.isActive(name)) from.scene.stop(name)
  }
}
