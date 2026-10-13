import Phaser from 'phaser'
import { rewardedButton } from '../ads'
import {
  buildingName,
  buildings,
  formatInt,
  formatRemain,
  hasUnlock,
  species
} from '../data'
import { go, session } from '../session'
import { breedPreview, coach, mineFill, monsterByUid, portalOpen, portalUnlockText, skillOffers, trainingQuote, trainingReadyAt, unlockLabel, upgradeInfo } from '../state'
import type { BuildingId } from '../types'
import { BUILDING_FOOT, buildingTextureKey } from '../artLayout'
import { paintBackground } from '../art'
import { openGuide } from '../guide'
import { GOLD, INK, MUTED, W, button, floatText, openModal, panel, text } from '../ui'

export class CityScene extends Phaser.Scene {
  private dynamic!: Phaser.GameObjects.Container
  private modal?: { close: () => void }
  private inputReady = false
  private breedA: string | null = null
  private breedB: string | null = null

  constructor() { super('City') }

  create(): void {
    this.inputReady = false
    this.time.delayedCall(350, () => { this.inputReady = true })
    if (!paintBackground(this, 'city')) this.drawSky()
    this.drawStructures()
    this.dynamic = this.add.container(0, 0)
    const onClock = () => this.refresh()
    this.game.events.on('clock', onClock)
    const off = session.on(() => this.refresh())
    this.events.once('shutdown', () => {
      this.game.events.off('clock', onClock)
      off()
      this.modal?.close()
    })
    this.refresh()
    const hint = coach(session.save)
    if (hint) this.cameras.main.flash(200, 20, 16, 40)
    const guide = openGuide(this, 'City')
    if (guide) this.modal = guide
  }

  private drawSky(): void {
    const g = this.add.graphics()
    g.fillGradientStyle(0x241848, 0x1a1038, 0x3d2a58, 0x4a3068, 1)
    g.fillRect(0, 0, W, 720)
    g.fillStyle(0xfff6d8, 0.9)
    g.fillCircle(1080, 130, 36)
    g.fillStyle(0x1a1038, 0.35)
    g.fillCircle(1094, 122, 30)
    g.fillStyle(0xffffff, 0.8)
    const stars = [[120, 100], [200, 160], [340, 90], [760, 120], [900, 80], [980, 170], [80, 200], [640, 90]]
    for (const [x, y] of stars) g.fillCircle(x, y, 1.6)
    g.fillStyle(0x2a2048, 1)
    g.fillEllipse(280, 520, 520, 180)
    g.fillEllipse(980, 530, 560, 200)
    g.fillStyle(0x3a6b45, 1)
    g.fillRect(0, 500, W, 220)
    g.fillStyle(0x4e8a56, 1)
    g.fillEllipse(640, 520, 1500, 120)
    g.fillStyle(0xc4a574, 1)
    g.fillRoundedRect(180, 548, 920, 28, 14)
  }

  private drawStructures(): void {
    this.structure(230, 'training', () => this.openBuilding('training'))
    this.structure(640, 'townhall', () => this.openBuilding('townhall'))
    this.structure(1030, 'goldmine', () => this.openBuilding('goldmine'))
    this.portal(460, 210)
    this.gate(820, 210)
    button(this, 1148, 586, 150, 40, 'Aufgaben', () => this.openQuests(), { fill: 0x3d4b6e, color: INK, size: 15 })
  }

  private structure(x: number, id: BuildingId, onClick: () => void): void {
    const display = id === 'townhall' ? 236 : 214
    const feet = id === 'townhall' ? 432 : 458
    const originY = BUILDING_FOOT[id]
    const key = buildingTextureKey(id, true)
    if (this.textures.exists(key)) {
      this.add.image(x, feet, key).setOrigin(0.5, originY).setDisplaySize(display, display)
    }
    const hitW = display * 0.88
    const hitH = display * originY * 0.86
    const hit = this.add.rectangle(x, feet - hitH / 2, hitW, hitH, 0xffffff, 0.001)
    hit.setInteractive(new Phaser.Geom.Rectangle(0, 0, hitW, hitH), Phaser.Geom.Rectangle.Contains)
    if (hit.input) hit.input.cursor = 'pointer'
    hit.on('pointerup', () => {
      if (!this.inputReady) return
      onClick()
    })
  }

  private portal(x: number, y: number): void {
    const g = this.add.graphics()
    g.fillStyle(0x5c6bc0, 1)
    g.fillTriangle(x - 36, y + 40, x, y - 50, x + 36, y + 40)
    g.fillStyle(0xb39ddb, 0.9)
    g.fillCircle(x, y - 4, 14)
    g.fillStyle(0xf0c14a, 1)
    g.fillCircle(x, y - 4, 5)
    const hit = this.add.rectangle(x, y, 100, 120, 0xffffff, 0.001)
    hit.setInteractive({ useHandCursor: true })
    hit.on('pointerup', () => {
      if (!this.inputReady) return
      if (!portalOpen(session.save)) {
        session.toast(portalUnlockText(session.save))
        return
      }
      go(this, 'Portal')
    })
  }

  private gate(x: number, y: number): void {
    const g = this.add.graphics()
    g.fillStyle(0x5d4037, 1)
    g.fillRect(x - 40, y - 10, 12, 56)
    g.fillRect(x + 28, y - 10, 12, 56)
    g.lineStyle(8, 0x8d6e63, 1)
    g.beginPath()
    g.arc(x, y - 6, 34, Math.PI, 0, false)
    g.strokePath()
    g.fillStyle(0xe15b64, 1)
    g.fillTriangle(x - 8, y - 48, x + 8, y - 48, x, y - 64)
    const hit = this.add.rectangle(x, y, 110, 120, 0xffffff, 0.001)
    hit.setInteractive({ useHandCursor: true })
    hit.on('pointerup', () => {
      if (!this.inputReady) return
      go(this, 'Campaign')
    })
  }

  private refresh(): void {
    this.dynamic.removeAll(true)
    const save = session.save
    const now = Date.now()
    const spots: [number, number, string, string][] = [
      [230, 500, 'Trainingsgelände', this.buildingStatus('training', now)],
      [640, 470, 'Rathaus', this.buildingStatus('townhall', now)],
      [1030, 500, 'Goldmine', this.buildingStatus('goldmine', now)]
    ]
    for (const [x, y, title, sub] of spots) {
      this.dynamic.add(text(this, x, y, title, 16, INK, [0.5, 0]))
      this.dynamic.add(text(this, x, y + 20, sub, 13, GOLD, [0.5, 0]))
    }
    const hint = coach(save)
    if (hint) {
      const g = this.add.graphics()
      panel(g, 48, 536, 980, 100, 0x241848)
      const body = text(this, 68, 548, hint.text, 15, INK)
      body.setWordWrapWidth(940)
      this.dynamic.add([g, body])
      const mark = text(this, this.markX(hint.target), this.markY(hint.target), '!', 22, '#2a2112', [0.5, 0.5])
      const badge = this.add.graphics()
      badge.fillStyle(0xf0c14a, 1)
      badge.fillCircle(mark.x, mark.y, 14)
      this.dynamic.add([badge, mark])
      this.tweens.add({ targets: mark, y: mark.y - 6, yoyo: true, repeat: -1, duration: 500 })
    }
    if (mineFill(save) >= 0.25) {
      const coin = text(this, 1030, 248, `${formatInt(save.buildings.goldmine.stored)}`, 14, GOLD, [0.5, 0.5])
      this.dynamic.add(coin)
    }
    this.dynamic.add(text(this, 460, 268, 'Portal', 14, INK, [0.5, 0]))
    this.dynamic.add(text(this, 820, 268, 'Kampagne', 14, INK, [0.5, 0]))
    const breed = save.buildings.breeding
    const breedLabel = breed.level > 0 ? `Zuchtstation ${breed.level}` : save.buildings.townhall.level >= 5 ? 'Zuchtstation bauen' : ''
    if (breedLabel) {
      const label = text(this, 640, 150, breedLabel, 16, GOLD, [0.5, 0.5])
      label.setInteractive({ useHandCursor: true })
      label.on('pointerup', () => this.openBuilding('breeding'))
      this.dynamic.add(label)
    }
  }

  private markX(target: string): number {
    if (target === 'training') return 300
    if (target === 'townhall') return 720
    if (target === 'goldmine') return 1100
    if (target === 'portal') return 500
    return 860
  }

  private markY(target: string): number {
    if (target === 'portal' || target === 'campaign') return 150
    return 280
  }

  private buildingStatus(id: BuildingId, now: number): string {
    const save = session.save
    const building = save.buildings[id]
    const level = `Stufe ${building.level}`
    if (building.upgradeEndsAt != null) return `${level} · Bau ${formatRemain(building.upgradeEndsAt - now)}`
    if (id === 'goldmine') return `${level} · ${formatInt(save.buildings.goldmine.stored)} Gold`
    if (id === 'training') {
      const ready = save.buildings.training.slots.some((slot) => {
        const monster = monsterByUid(save, slot.monsterUid)
        return monster ? now >= trainingReadyAt(slot, monster) : false
      })
      return ready ? `${level} · fertig` : `${level} · ${save.buildings.training.slots.length} läuft`
    }
    return level
  }

  private openBuilding(id: BuildingId): void {
    this.modal?.close()
    const save = session.save
    const wide = id === 'training' || (id === 'breeding' && save.buildings.breeding.level > 0)
    const modal = openModal(this, wide ? 980 : 640, wide ? 560 : 460, buildingName(id))
    this.modal = modal
    const now = Date.now()
    const info = upgradeInfo(save, id)
    const left = 180
    let y = 180
    modal.root.add(text(this, left, y, `Stufe ${save.buildings[id].level}`, 20, INK))
    y += 36
    if (id === 'goldmine') {
      const def = buildings.goldmine.levels[save.buildings.goldmine.level - 1]
      modal.root.add(text(this, left, y, `Lager ${formatInt(save.buildings.goldmine.stored)} / ${formatInt(def.capacity)}  ·  ${def.ratePerHour} Gold/Std.`, 16, MUTED))
      y += 48
      modal.root.add(button(this, 320, y, 220, 48, 'Einsammeln', () => {
        const gained = session.collectMine()
        if (gained > 0) floatText(this, 1030, 360, `+${gained}`, GOLD)
        modal.close()
        this.refresh()
      }))
      const turbo = rewardedButton(save, 'mine_boost', now)
      if (turbo.visible) {
        modal.root.add(button(this, 560, y, 240, 48, turbo.label, () => session.toast(turbo.reason || 'Gerade keine Werbung verfügbar'), { disabled: !turbo.enabled, fill: 0x3d4b6e, color: INK, size: 14 }))
        if (turbo.reason) modal.root.add(text(this, 560, y + 36, turbo.reason, 12, MUTED, [0.5, 0]))
      }
    }
    if (id === 'townhall') {
      const current = buildings.townhall.levels[save.buildings.townhall.level - 1]
      modal.root.add(text(this, left, y, 'Schon frei:', 16, MUTED))
      y += 26
      current.unlocks.forEach((unlock) => {
        const label = unlock === 'portal' ? portalUnlockText(save) : unlockLabel(unlock)
        modal.root.add(text(this, left, y, `· ${label}`, 15, INK))
        y += 22
      })
      y += 8
    }
    if (id === 'training') this.trainingBody(modal.root, now)
    if (id === 'breeding' && save.buildings.breeding.level > 0) this.breedingBody(modal.root, now)
    const upgradeX = id === 'breeding' && save.buildings.breeding.level > 0 ? 860 : wide ? 780 : 320
    const upgradeY = id === 'training' ? 500 : id === 'breeding' && save.buildings.breeding.level > 0 ? 470 : 400
    this.upgradeRow(modal.root, id, info, upgradeX, upgradeY)
  }

  private upgradeRow(
    root: Phaser.GameObjects.Container,
    id: BuildingId,
    info: ReturnType<typeof upgradeInfo>,
    x: number,
    y: number
  ): void {
    const building = session.save.buildings[id]
    if (building.upgradeEndsAt != null) {
      root.add(text(this, x, y - 28, `Fertig in ${formatRemain(building.upgradeEndsAt - Date.now())}`, 16, GOLD, [0.5, 0]))
      root.add(button(this, x, y + 20, 200, 44, 'Abbrechen', () => {
        session.cancelUpgrade(id)
        this.modal?.close()
        this.refresh()
      }, { fill: 0x3d4b6e, color: INK }))
      const speed = rewardedButton(session.save, 'build_speed', Date.now())
      if (speed.visible) {
        root.add(button(this, x, y + 74, 220, 40, speed.label, () => session.toast(speed.reason || 'Gerade keine Werbung verfügbar'), { disabled: !speed.enabled, fill: 0x3d4b6e, color: INK, size: 13 }))
      }
      return
    }
    if (!info.next) {
      root.add(text(this, x, y, 'Maximale Stufe.', 16, MUTED, [0.5, 0]))
      return
    }
    const req = info.blocked || `${formatInt(info.next.cost)} Gold · ${formatRemain(info.next.buildSec * 1000)}`
    root.add(text(this, x, y - 24, `Stufe ${info.next.level}: ${req}`, 14, info.blocked ? '#ffb4b4' : MUTED, [0.5, 0]))
    root.add(button(this, x, y + 24, 220, 46, 'Ausbauen', () => {
      if (session.startUpgrade(id)) {
        this.modal?.close()
        this.refresh()
      }
    }, { disabled: Boolean(info.blocked) }))
  }

  private trainingBody(root: Phaser.GameObjects.Container, now: number): void {
    const save = session.save
    const def = buildings.training.levels[save.buildings.training.level - 1]
    root.add(text(this, 180, 210, `${def.slots} Plätze · ${def.expPerMin} EP/Min.  Monster im Training dürfen kämpfen.`, 15, MUTED))
    save.buildings.training.slots.forEach((slot, index) => {
      const monster = monsterByUid(save, slot.monsterUid)
      const y = 260 + index * 70
      const name = monster ? species(monster.speciesId).name : '—'
      const ready = monster ? now >= trainingReadyAt(slot, monster) : false
      root.add(text(this, 180, y, `${name} · ${ready ? 'fertig' : formatRemain((monster ? trainingReadyAt(slot, monster) : slot.endsAt) - now)}`, 16, INK))
      root.add(button(this, 520, y + 10, 140, 40, ready ? 'Abholen' : 'Abbrechen', () => {
        if (ready) session.claimTraining(slot.monsterUid)
        else session.cancelTraining(slot.monsterUid)
        this.modal?.close()
        this.openBuilding('training')
      }, { fill: ready ? 0x3ecf8e : 0x3d4b6e, color: ready ? '#1a120c' : INK, size: 15 }))
    })
    const busy = new Set(save.buildings.training.slots.map((s) => s.monsterUid))
    const free = save.monsters.filter((m) => !busy.has(m.uid)).slice(0, 6)
    if (save.buildings.training.slots.length >= def.slots) return
    root.add(text(this, 180, 470, 'Neues Training', 16, GOLD))
    free.forEach((monster, index) => {
      root.add(button(this, 250 + (index % 3) * 180, 520 + Math.floor(index / 3) * 50, 160, 40, species(monster.speciesId).name, () => {
        this.pickKind(monster.uid)
      }, { fill: 0x2c3654, color: INK, size: 14 }))
    })
  }

  private pickKind(uid: string): void {
    this.modal?.close()
    const modal = openModal(this, 720, 280, 'Training')
    this.modal = modal
    const monster = monsterByUid(session.save, uid)
    modal.root.add(text(this, W / 2, 250, monster ? species(monster.speciesId).name : '', 18, INK, [0.5, 0]))
    modal.root.add(button(this, W / 2 - 150, 340, 260, 48, 'EP-Training', () => this.pickDuration(uid)))
    modal.root.add(button(this, W / 2 + 150, 340, 260, 48, 'Skill lernen', () => this.pickSkill(uid), { fill: 0x3d4b6e, color: INK }))
  }

  private pickSkill(uid: string): void {
    this.modal?.close()
    const modal = openModal(this, 860, 560, 'Skills')
    this.modal = modal
    const offers = skillOffers(session.save, uid)
    const ready = offers.filter((offer) => !offer.blocked)
    const locked = offers.filter((offer) => offer.blocked)
    if (!offers.length) {
      modal.root.add(text(this, W / 2, 360, 'Für dieses Monster gibt es gerade keinen Skill.', 16, MUTED, [0.5, 0.5]))
      return
    }
    ready.slice(0, 6).forEach((offer, index) => {
      const y = 200 + index * 52
      const label = `${offer.name} · ${offer.gold} Gold · ${offer.essence} Essenz · ${offer.minutes} Min.`
      modal.root.add(button(this, W / 2, y, 720, 44, label, () => {
        if (session.startSkill(uid, offer.kind, offer.id)) {
          modal.close()
          this.refresh()
        }
      }, { size: 14 }))
    })
    locked.slice(0, 4).forEach((offer, index) => {
      modal.root.add(text(this, 220, 520 + index * 22, `${offer.name}: ${offer.blocked}`, 13, MUTED))
    })
  }

  private breedingBody(root: Phaser.GameObjects.Container, now: number): void {
    const save = session.save
    save.buildings.breeding.slots.forEach((slot, index) => {
      const y = 230 + index * 56
      const a = monsterByUid(save, slot.parentA)
      const b = monsterByUid(save, slot.parentB)
      const ready = now >= slot.endsAt
      const names = `${a ? species(a.speciesId).name : '—'} × ${b ? species(b.speciesId).name : '—'}`
      root.add(text(this, 180, y, `${names} · ${ready ? 'fertig' : formatRemain(slot.endsAt - now)}`, 15, INK))
      root.add(button(this, 520, y + 8, 120, 36, ready ? 'Abholen' : 'läuft', () => {
        if (!ready) return
        session.claimBreed(index)
        this.modal?.close()
        this.refresh()
        this.openBuilding('breeding')
      }, { disabled: !ready, fill: ready ? 0x3ecf8e : 0x3d4b6e, color: ready ? '#1a120c' : INK, size: 14 }))
      if (!ready) {
        const speed = rewardedButton(save, 'breeding_speed', now)
        if (speed.visible) {
          root.add(button(this, 660, y + 8, 150, 36, 'Zucht -50%', () => session.toast(speed.reason || 'Gerade keine Werbung verfügbar'), { disabled: !speed.enabled, fill: 0x3d4b6e, color: INK, size: 13 }))
        }
      }
    })
    const busy = new Set(save.buildings.breeding.slots.flatMap((slot) => [slot.parentA, slot.parentB]))
    const eligible = save.monsters.filter((monster) => monster.level >= 15 && !busy.has(monster.uid)).slice(0, 6)
    root.add(text(this, 180, 340, 'Eltern (Stufe 15, ausgeruht)', 15, GOLD))
    eligible.forEach((monster, index) => {
      const picked = this.breedA === monster.uid || this.breedB === monster.uid
      root.add(button(this, 220 + (index % 2) * 180, 390 + Math.floor(index / 2) * 46, 164, 38, species(monster.speciesId).name, () => {
        if (this.breedA === monster.uid) this.breedA = null
        else if (this.breedB === monster.uid) this.breedB = null
        else if (!this.breedA) this.breedA = monster.uid
        else this.breedB = monster.uid
        this.modal?.close()
        this.openBuilding('breeding')
      }, { fill: picked ? 0xf0c14a : 0x2c3654, color: picked ? '#2a2112' : INK, size: 13 }))
    })
    if (this.breedA && this.breedB) {
      const preview = breedPreview(save, this.breedA, this.breedB)
      const note = text(this, 180, 530, preview.blocked || preview.text, 13, preview.blocked ? '#ffb4b4' : MUTED)
      note.setWordWrapWidth(520)
      root.add(note)
      root.add(button(this, 400, 590, 180, 40, 'Züchten', () => {
        if (session.startBreed(this.breedA!, this.breedB!)) {
          this.breedA = null
          this.breedB = null
          this.modal?.close()
          this.refresh()
        }
      }, { disabled: Boolean(preview.blocked), size: 15 }))
    }
  }

  private pickDuration(uid: string): void {
    this.modal?.close()
    const modal = openModal(this, 640, 320, 'Trainingsdauer')
    this.modal = modal
    const monster = monsterByUid(session.save, uid)
    modal.root.add(text(this, W / 2, 250, monster ? species(monster.speciesId).name : '', 18, INK, [0.5, 0]))
    buildings.training.durationsMin.forEach((minutes, index) => {
      const quote = trainingQuote(session.save, minutes)
      const label = `${minutes >= 60 ? `${minutes / 60} Std.` : `${minutes} Min.`} · ${quote.exp} EP · ${quote.free ? 'gratis' : `${quote.gold} Gold`}`
      modal.root.add(button(this, W / 2, 310 + index * 58, 460, 46, label, () => {
        if (session.startTraining(uid, minutes)) {
          modal.close()
          this.refresh()
        }
      }, { size: 15 }))
    })
  }

  private openQuests(): void {
    this.modal?.close()
    const modal = openModal(this, 640, 420, 'Tagesaufgaben')
    this.modal = modal
    const save = session.save
    modal.root.add(text(this, 360, 200, `Login-Serie: Tag ${save.daily.loginStreak}  ·  Reset 04:00`, 16, MUTED))
    if (!hasUnlock(save.buildings.townhall.level, 'daily_quests')) {
      modal.root.add(text(this, W / 2, 320, 'Rathaus Stufe 2', 22, GOLD, [0.5, 0.5]))
      return
    }
    const quests = [
      ['win3', '3 Kämpfe gewinnen', 3],
      ['mine2', 'Goldmine 2× einsammeln', 2],
      ['train1', '1 Training abschließen', 1],
      ['levelup1', '1 Level-Aufstieg', 1],
      ['synergy2', '2 Siege mit Synergie', 2]
    ] as const
    quests.forEach((row, i) => {
      const y = 240 + i * 36
      const done = save.daily.claimed.includes(row[0])
      const progress = save.daily.quests[row[0]] ?? 0
      modal.root.add(text(this, 220, y, `${done ? '✓' : '·'} ${row[1]}  ${progress}/${row[2]}`, 15, done ? '#9dffc3' : INK))
      if (!done && progress >= row[2]) {
        modal.root.add(button(this, 560, y, 120, 30, 'Abholen', () => {
          session.claimQuest(row[0])
          modal.close()
          this.openQuests()
        }, { fill: 0x3ecf8e, color: '#1a120c', size: 13 }))
      }
    })
    modal.root.add(text(this, 360, 430, save.daily.claimedAll ? 'Abschluss-Truhe abgeholt.' : 'Alle fünf Basis-Aufgaben: +40 Juwelen, +500 Gold, +30 Essenz', 14, GOLD))
  }
}
