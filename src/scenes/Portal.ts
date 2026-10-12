import Phaser from 'phaser'
import { rewardedButton } from '../ads'
import { monsterToken } from '../art'
import { gachaCfg, rarityInfo, species } from '../data'
import { pEpic, pLeg, pullsUntilEpic, pullsUntilLegendary } from '../gacha'
import { session } from '../session'
import { canOfferFreePull, canOfferGemBonus } from '../ads'
import { portalOpen, presentPulls } from '../state'
import type { PullResult } from '../types'
import { INK, MUTED, W, button, openModal, sfx, text } from '../ui'

export class PortalScene extends Phaser.Scene {
  constructor() { super('Portal') }

  create(): void {
    this.paint()
  }

  private paint(): void {
    this.children.removeAll(true)
    const g = this.add.graphics()
    g.fillGradientStyle(0x1a1038, 0x241848, 0x120e22, 0x1a1630, 1)
    g.fillRect(0, 0, W, 720)
    g.fillStyle(0x5c6bc0, 0.85)
    g.fillTriangle(180, 520, 320, 200, 460, 520)
    g.fillStyle(0xf0c14a, 1)
    g.fillCircle(320, 340, 18)
    text(this, 560, 96, 'Beschwörungsportal', 34, '#f0c14a')
    if (!portalOpen(session.save)) {
      text(this, 560, 320, 'Schließe Stage 1-2 ab', 24, INK)
      return
    }
    const gacha = session.save.gacha
    const legIn = pullsUntilLegendary(gacha.pityLeg)
    const epicIn = pullsUntilEpic(gacha.pityEpic)
    const nextLeg = Math.min(1, pLeg(gacha.pityLeg + 1))
    const nextEpic = Math.min(1, pEpic(gacha.pityEpic + 1))
    const lines = [
      `Legendär garantiert in ${legIn} Ziehungen`,
      `Episch+ garantiert in ${epicIn} Ziehungen`,
      `Nächste Ziehung: Legendär+ ${(nextLeg * 100).toFixed(1)} % · Episch+ ${(nextEpic * 100).toFixed(1)} %`,
      `Ziehungen insgesamt: ${gacha.totalPulls}`,
      gacha.pityLeg >= 60 ? 'Soft-Pity für Legendär+ ist aktiv.' : 'Soft-Pity Legendär+ ab Ziehung 60.',
      gacha.pityEpic >= 15 ? 'Soft-Pity für Episch+ ist aktiv.' : 'Soft-Pity Episch+ ab Ziehung 15.'
    ]
    lines.forEach((line, i) => text(this, 560, 160 + i * 32, line, 16, i < 2 ? INK : MUTED))
    const gems = session.save.currencies.gems
    const tickets = session.save.currencies.tickets
    button(this, 700, 400, 240, 52, '1×  ·  100 Juwelen', () => this.pay('single', 'gems'), { disabled: gems < 100 })
    button(this, 980, 400, 240, 52, '10×  ·  900 Juwelen', () => this.pay('multi', 'gems'), { disabled: gems < 900 })
    if (tickets > 0) {
      button(this, 700, 470, 240, 48, `Ticket ×1 (${tickets})`, () => this.pay('single', 'tickets'), { disabled: tickets < 1, fill: 0x3d4b6e, color: INK, size: 16 })
      button(this, 980, 470, 240, 48, 'Tickets ×10', () => this.pay('multi', 'tickets'), { disabled: tickets < 10, fill: 0x3d4b6e, color: INK, size: 16 })
    }
    if (!session.save.tutorial.pullClaimed) {
      button(this, 840, 545, 420, 52, 'Tutorial-10er · gratis, min. Episch', () => this.pay('tutorial', 'free'), { fill: 0x7e57c2, color: '#fff' })
    }
    button(this, 700, 610, 200, 42, 'Raten', () => this.showRates(), { fill: 0x3d4b6e, color: INK, size: 16 })
    if (canOfferGemBonus(session.save)) {
      const bonus = rewardedButton(session.save, 'gem_bonus', Date.now())
      if (bonus.visible) button(this, 980, 610, 240, 42, bonus.label, () => session.toast(bonus.reason || 'Gerade keine Werbung verfügbar'), { disabled: !bonus.enabled, fill: 0x3d4b6e, color: INK, size: 14 })
    }
    if (canOfferFreePull(session.save)) {
      const free = rewardedButton(session.save, 'free_pull', Date.now())
      if (free.visible) text(this, 980, 660, free.enabled ? free.label : `${free.label} · ${free.reason}`, 13, MUTED, [0.5, 0])
    }
  }

  private pay(kind: 'single' | 'multi' | 'tutorial', pay: 'gems' | 'tickets' | 'free'): void {
    const result = session.pull(kind, pay)
    if (!result.ok || !result.value) return
    sfx(result.value.some((p) => p.rarity >= 3) ? 'pull' : 'coin')
    this.reveal(presentPulls(result.value))
  }

  private reveal(pulls: PullResult[]): void {
    const root = this.add.container(0, 0).setDepth(40)
    const dim = this.add.rectangle(W / 2, 360, W, 720, 0x07060f, 0.78).setInteractive()
    root.add(dim)
    root.add(text(this, W / 2, 90, 'Beschwörung', 28, '#f0c14a', [0.5, 0.5]))
    const shown: Phaser.GameObjects.Container[] = []
    let index = 0
    const step = () => {
      if (index >= pulls.length) return
      const pull = pulls[index]
      const col = index % 5
      const row = Math.floor(index / 5)
      const x = 240 + col * 200
      const y = 240 + row * 200
      const card = this.add.container(x, y)
      const sp = species(pull.speciesId)
      const plate = this.add.graphics()
      plate.fillStyle(0x1b2438, 1)
      plate.fillRoundedRect(-80, -80, 160, 170, 14)
      plate.lineStyle(4, Phaser.Display.Color.HexStringToColor(rarityInfo(pull.rarity).color).color, 1)
      plate.strokeRoundedRect(-80, -80, 160, 170, 14)
      card.add(plate)
      card.add(monsterToken(this, 0, -20, pull.speciesId, 64, pull.rarity))
      card.add(text(this, 0, 40, sp.name, 14, INK, [0.5, 0]))
      card.add(text(this, 0, 60, `${rarityInfo(pull.rarity).name}${pull.upgraded ? ' · aufgewertet' : ''}`, 12, rarityInfo(pull.rarity).color, [0.5, 0]))
      card.setScale(0.2)
      root.add(card)
      this.tweens.add({ targets: card, scale: 1, duration: 180 })
      shown.push(card)
      index += 1
      if (index < pulls.length) this.time.delayedCall(220, step)
    }
    step()
    root.add(button(this, W / 2, 650, 220, 48, 'Weiter', () => {
      root.destroy()
      this.paint()
    }))
    void shown
  }

  private showRates(): void {
    const modal = openModal(this, 760, 540, 'Transparente Raten')
    gachaCfg.rates.forEach((rate, index) => {
      const col = index < 5 ? 0 : 1
      const row = index % 5
      modal.root.add(text(this, 300 + col * 340, 190 + row * 36, `${rarityInfo(index).name}`, 16, rarityInfo(index).color))
      modal.root.add(text(this, 520 + col * 340, 190 + row * 36, `${rate.toFixed(3)} %`, 16, INK))
    })
    const note = text(this, W / 2, 400, '10er garantiert mindestens Selten. Pity bleibt dauerhaft gespeichert und wird nie heimlich zurückgesetzt. Legendär+ effektiv ca. 1,88 % (etwa alle 53 Ziehungen). Episch+ inkl. Legendär+ ca. 11,1 %.', 15, MUTED, [0.5, 0])
    note.setWordWrapWidth(640)
    note.setAlign('center')
    modal.root.add(note)
    const history = session.save.gacha.history.slice(0, 5)
    if (history.length) {
      modal.root.add(text(this, 300, 500, 'Letzte Ziehungen', 14, '#f0c14a'))
      history.forEach((entry, i) => {
        modal.root.add(text(this, 300, 524 + i * 22, `${species(entry.speciesId).name} · ${rarityInfo(entry.rarity).name}`, 13, MUTED))
      })
    }
  }
}
