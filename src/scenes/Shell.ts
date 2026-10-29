import Phaser from 'phaser'
import { monsterToken } from '../art'
import { queueArt } from '../artLayout'
import { tickAdSession } from '../ads'
import { go, session, wipeSave } from '../session'
import { iconSprite } from '../art'
import { rankLabel } from '../arena'
import type { LastSeasonResult } from '../types'
import { ESSENCE, GEM, GOLD, INK, MUTED, TICKET, W, button, confirm, hoverTip, openModal, panel, text } from '../ui'
import { formatInt } from '../data'
import { debugToolsEnabled, grantDebugMonster } from '../debugGrant'
import { portalOpen, portalUnlockText } from '../state'

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot') }
  create(): void {
    this.scene.start('Preload')
  }
}

export class PreloadScene extends Phaser.Scene {
  constructor() { super('Preload') }

  preload(): void {
    queueArt(this.load)
  }

  create(): void {
    const g = this.add.graphics()
    g.fillGradientStyle(0x1a1038, 0x1a1038, 0x3a2460, 0x3a2460, 1)
    g.fillRect(0, 0, W, 720)
    text(this, W / 2, 230, 'VELUNOR', 64, GOLD, [0.5, 0.5])
    text(this, W / 2, 290, 'Stadt · Monster · Portal', 22, INK, [0.5, 0.5])
    ;['m01', 'm02', 'm03'].forEach((id, i) => monsterToken(this, W / 2 - 90 + i * 90, 390, id, 64, 0))
    text(this, W / 2, 480, 'Stilisierte Fantasy', 16, MUTED, [0.5, 0.5])
    button(this, W / 2, 560, 280, 64, 'Spielen', () => {
      this.scene.launch('HUD')
      this.scene.start('City')
    }, { hitPad: 16 })
  }
}

export class HUDScene extends Phaser.Scene {
  private toast?: Phaser.GameObjects.Text
  private nav!: Phaser.GameObjects.Container
  private currencies!: Phaser.GameObjects.Container
  private navKey = ''
  private seasonPopup = false

  constructor() { super('HUD') }

  create(): void {
    this.currencies = this.add.container(0, 0).setDepth(100)
    this.nav = this.add.container(0, 0).setDepth(100)
    this.drawBar()
    this.drawNav()
    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.pump() })
    session.on(() => {
      this.drawBar()
      this.drawNav()
    })
    this.pump()
    this.maybeSeason()
  }

  private pump(): void {
    tickAdSession()
    session.tick()
    const message = session.toasts.shift()
    if (message) this.showToast(message)
    const battle = this.scene.isActive('Battle') || this.scene.isActive('Result')
    this.nav.setVisible(!battle)
    const key = ['City', 'Team', 'Monsters', 'Portal', 'Campaign'].find((name) => this.scene.isActive(name)) ?? ''
    if (key !== this.navKey) {
      this.navKey = key
      this.drawNav()
    }
    this.game.events.emit('clock')
    this.maybeSeason()
    this.scene.bringToTop()
  }

  private maybeSeason(): void {
    const result = session.save.arena?.lastSeasonResult
    if (!result) {
      this.seasonPopup = false
      return
    }
    if (this.seasonPopup) return
    if (this.scene.isActive('Battle') || this.scene.isActive('Result')) return
    this.seasonPopup = true
    this.showSeason(result)
  }

  private showSeason(result: LastSeasonResult): void {
    const lines = [`Höchster Rang: ${rankLabel(result.rank)}`]
    if (result.gold) lines.push(`+${formatInt(result.gold)} Gold`)
    if (result.gems) lines.push(`+${formatInt(result.gems)} Juwelen`)
    if (result.essence) lines.push(`+${formatInt(result.essence)} Essenz`)
    if (result.tickets) lines.push(`+${result.tickets} Beschwörungsticket`)
    lines.push('Punkte stehen wieder auf 0.')
    const h = 250 + lines.length * 28
    const modal = openModal(this, 640, h, 'Saison beendet')
    modal.root.setDepth(180)
    const top = (720 - h) / 2
    const wash = this.add.rectangle(W / 2, top + h / 2, 600, h - 24, 0x162033, 1)
    modal.root.addAt(wash, 2)
    const badge = iconSprite(this, W / 2, top + 88, `rank_${result.rank}`, 64)
    if (badge) modal.root.add(badge)
    modal.root.add(text(this, W / 2, top + 128, `Saison ${result.seasonKey}`, 16, MUTED, [0.5, 0]))
    lines.forEach((line, index) => {
      modal.root.add(text(this, W / 2, top + 160 + index * 28, line, 18, index === 0 ? GOLD : INK, [0.5, 0]))
    })
    modal.root.add(button(this, W / 2, top + h - 56, 220, 46, 'Weiter', () => {
      session.dismissSeason()
      this.seasonPopup = false
      modal.close()
    }, { fill: 0xf0c14a, color: '#2a2112' }))
  }

  private drawBar(): void {
    this.currencies.removeAll(true)
    const g = this.add.graphics()
    g.fillStyle(0x100c1c, 0.92)
    g.fillRect(0, 0, W, 64)
    g.lineStyle(2, 0xf0c14a, 0.35)
    g.lineBetween(0, 64, W, 64)
    const title = text(this, 24, 32, 'VELUNOR', 22, GOLD, [0, 0.5])
    this.currencies.add([g, title])
    const c = session.save.currencies
    const bits: [string, string, string, string, string][] = [
      ['gold', 'Gold', formatInt(c.gold), GOLD, 'Gold bezahlt Gebäude, Training und Aufwertung.'],
      ['gems', 'Juwelen', formatInt(c.gems), GEM, 'Juwelen bezahlen das Portal: 100 für eine Ziehung, 900 für zehn.'],
      ['essence', 'Essenz', formatInt(c.essence), ESSENCE, 'Essenz wertet die Seltenheit auf. Duplikate, Freilassen und Boss-Siege bringen welche.'],
      ['tickets', 'Tickets', formatInt(c.tickets), TICKET, 'Ein Ticket ersetzt die Juwelen für eine Ziehung.']
    ]
    bits.forEach((bit, i) => {
      const x = 230 + i * 190
      const chip = this.add.graphics()
      chip.fillStyle(0x2a334c, 1)
      chip.fillRoundedRect(x, 16, 176, 32, 10)
      const icon = iconSprite(this, x + 20, 32, bit[0], 22)
      const value = text(this, x + 164, 32, bit[2], 16, bit[3], [1, 0.5])
      const tip = hoverTip(this, x + 88, 32, 176, 36, bit[4])
      this.currencies.add(icon ? [chip, icon, value, tip] : [chip, value, tip])
    })
    const gear = button(this, 1210, 32, 108, 40, 'Menü', () => this.openSettings(), { fill: 0x3d4b6e, color: INK, size: 16, icon: 'settings', hitPad: 12 })
    this.currencies.add(gear)
  }

  private drawNav(): void {
    this.nav.removeAll(true)
    const g = this.add.graphics()
    g.fillStyle(0x100c1c, 0.94)
    g.fillRect(0, 648, W, 72)
    this.nav.add(g)
    const items: [string, string, string, string?][] = [
      ['Stadt', 'City', 'nav_city'],
      ['Team', 'Team', 'nav_team'],
      ['Monster', 'Monsters', 'nav_monsters'],
      ['Portal', 'Portal', 'nav_portal', 'portal'],
      ['Kampagne', 'Campaign', 'nav_campaign']
    ]
    items.forEach((item, i) => {
      const x = 140 + i * 230
      const locked = item[3] === 'portal' && !portalOpen(session.save)
      const active = this.scene.isActive(item[1])
      const b = button(this, x, 684, 200, 48, locked ? 'Portal · 1-2' : item[0], () => {
        if (locked) {
          session.toast(portalUnlockText(session.save))
          return
        }
        go(this, item[1])
        this.time.delayedCall(30, () => this.drawNav())
      }, { fill: active ? 0xf0c14a : 0x2c3654, color: active ? '#2a2112' : INK, size: 16, icon: locked ? 'lock' : item[2], hitPad: 8 })
      this.nav.add(b)
    })
  }

  private showToast(message: string): void {
    this.toast?.destroy()
    this.toast = text(this, W / 2, 96, message, 16, INK, [0.5, 0.5]).setDepth(120)
    this.toast.setWordWrapWidth(760)
    this.toast.setAlign('center')
    const bg = this.add.graphics().setDepth(119)
    const bounds = this.toast.getBounds()
    bg.fillStyle(0x241848, 0.94)
    bg.fillRoundedRect(bounds.x - 16, bounds.y - 8, bounds.width + 32, bounds.height + 16, 12)
    this.tweens.add({
      targets: [this.toast, bg],
      alpha: 0,
      delay: 2200,
      duration: 400,
      onComplete: () => {
        bg.destroy()
        this.toast?.destroy()
        this.toast = undefined
      }
    })
  }

  private openSettings(): void {
    const { root, close } = (() => {
      const modalW = 520
      let showDebug = false
      if (import.meta.env.DEV) showDebug = debugToolsEnabled()
      const modalH = showDebug ? 520 : 440
      const holder = this.add.container(0, 0).setDepth(140)
      const dim = this.add.rectangle(W / 2, 360, W, 720, 0x07060f, 0.66).setInteractive()
      const g = this.add.graphics()
      panel(g, (W - modalW) / 2, (720 - modalH) / 2, modalW, modalH)
      const done = () => holder.destroy()
      holder.add([dim, g, text(this, W / 2, showDebug ? 180 : 220, 'Einstellungen', 26, GOLD, [0.5, 0])])
      holder.add(button(this, W / 2 + 200, showDebug ? 190 : 230, 56, 36, 'X', done, { fill: 0x3d4b6e, color: INK, size: 16 }))
      const soundLabel = session.save.settings.sound ? 'Ton an' : 'Ton aus'
      holder.add(button(this, W / 2, 310, 280, 46, soundLabel, () => {
        session.toggleSound()
        done()
        this.openSettings()
      }, { fill: 0x3d4b6e, color: INK }))
      holder.add(button(this, W / 2, 370, 280, 46, `Tempo ${session.save.settings.battleSpeed}×`, () => {
        const cap = session.save.buildings.townhall.level >= 2 ? 4 : 2
        const next = session.save.settings.battleSpeed === 1 ? 2 : session.save.settings.battleSpeed === 2 && cap === 4 ? 4 : 1
        session.setSpeed(next as 1 | 2 | 4)
        done()
        this.openSettings()
      }, { fill: 0x3d4b6e, color: INK }))
      holder.add(button(this, W / 2, 430, 280, 46, 'Anleitung', () => {
        session.save.tutorial.guideStep = 0
        session.persist()
        done()
        go(this, 'City')
      }, { fill: 0x3d4b6e, color: INK }))
      holder.add(button(this, W / 2, 490, 280, 46, 'Spielstand löschen', () => {
        done()
        confirm(this, 'Der lokale Speicherstand wird gelöscht.', () => {
          wipeSave()
          location.reload()
        })
      }, { fill: 0xe15b64, color: '#fff' }))
      if (import.meta.env.DEV && showDebug) {
        holder.add(button(this, W / 2, 550, 280, 46, 'Debug: Monster ins Team', () => {
          const raw = window.prompt('Monster-ID, zum Beispiel m80', 'm80')
          if (!raw) return
          const result = grantDebugMonster(session.save, raw, Date.now())
          if (!result.ok) {
            session.toast(result.reason)
            return
          }
          session.toast(`${result.name} ist im Lager und steht auf ${result.slot}.`)
          done()
          go(this, 'Team')
        }, { fill: 0x5e35b1, color: INK, size: 15 }))
      }
      return { root: holder, close: done }
    })()
    void root
    void close
  }
}
