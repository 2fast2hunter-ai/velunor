import Phaser from 'phaser'
import { addGhostOverlay, iconSprite, monsterToken, paintBackground } from '../art'
import { species } from '../data'
import { go, session } from '../session'
import { maxSpeed } from '../state'
import type { FightReport } from '../state'
import type { BattleEvent, BattleLog, SlotId } from '../types'
import { INK, W, button, floatText, text } from '../ui'

interface FightPayload {
  report: FightReport
  index: number
}

interface Token {
  id: string
  name: string
  speciesId: string
  hp: number
  max: number
  root: Phaser.GameObjects.Container
  bar: Phaser.GameObjects.Graphics
  x: number
  y: number
  statuses: Phaser.GameObjects.Image[]
}

export class BattleScene extends Phaser.Scene {
  private tokens = new Map<string, Token>()
  private log!: Phaser.GameObjects.Text
  private roundText!: Phaser.GameObjects.Text
  private stopped = false

  constructor() { super('Battle') }

  create(): void {
    this.stopped = false
    this.tokens.clear()
    const payload = this.game.registry.get('fight') as FightPayload | undefined
    if (!payload || payload.index >= payload.report.logs.length) {
      go(this, 'Result')
      return
    }
    const log = payload.report.logs[payload.index]
    this.paintBackdrop(payload)
    this.buildTokens(log, Boolean(payload.report.arena))
    this.events.once('shutdown', () => { this.stopped = true })
    this.time.delayedCall(300, () => this.play(groupEvents(log.events), 0))
  }

  private paintBackdrop(payload: FightPayload): void {
    if (!paintBackground(this, 'arena')) {
      const g = this.add.graphics()
      g.fillStyle(0x24160f, 1)
      g.fillRect(0, 0, W, 360)
      g.fillStyle(0x1d2a22, 1)
      g.fillRect(0, 360, W, 360)
      g.fillStyle(0xc4a574, 1)
      g.fillRect(0, 348, W, 24)
    }
    text(this, 40, 80, 'Gegner', 16, '#ffb4b4')
    text(this, 40, 430, 'Dein Team', 16, '#9dffc3')
    const count = payload.report.logs.length
    this.roundText = text(this, W / 2, 80, count > 1 ? `Kampf ${payload.index + 1}/${count}` : 'Runde 1', 18, '#f0c14a', [0.5, 0.5])
    this.log = text(this, W / 2, 360, 'Der Kampf läuft von allein.', 16, INK, [0.5, 0.5])
    this.log.setWordWrapWidth(520)
    this.log.setAlign('center')
    button(this, 1160, 100, 140, 42, 'Skip', () => this.skip(), { fill: 0x3d4b6e, color: INK, size: 16 })
    const speed = session.save.settings.battleSpeed
    button(this, 1160, 154, 150, 46, `${speed}×`, () => {
      const cap = maxSpeed(session.save)
      const current = session.save.settings.battleSpeed
      const next = current === 1 ? 2 : current === 2 && cap === 4 ? 4 : 1
      session.setSpeed(next)
    }, { fill: 0x3d4b6e, color: INK, size: 16, icon: `speed_${speed}x`, hitPad: 8 })
  }

  private buildTokens(log: BattleLog, arena: boolean): void {
    for (const unit of log.roster) {
      const [x, y] = place(unit.side, unit.slot)
      const root = monsterToken(this, x, y, unit.speciesId, 72, unit.rarity)
      if (arena && unit.side === 'B') addGhostOverlay(root, this, 72)
      const name = text(this, 0, 50, unit.name, 13, INK, [0.5, 0])
      const bar = this.add.graphics()
      root.add(name)
      const token: Token = { id: unit.id, name: unit.name, speciesId: unit.speciesId, hp: unit.maxHp, max: unit.maxHp, root, bar, x, y, statuses: [] }
      this.tokens.set(unit.id, token)
      this.redraw(token)
    }
  }

  private redraw(token: Token): void {
    token.bar.clear()
    const width = 70
    const pct = token.max <= 0 ? 0 : Math.max(0, token.hp / token.max)
    token.bar.fillStyle(0x2a2030, 1)
    token.bar.fillRoundedRect(token.x - width / 2, token.y - 52, width, 8, 3)
    token.bar.fillStyle(pct > 0.35 ? 0x66bb6a : 0xef5350, 1)
    token.bar.fillRoundedRect(token.x - width / 2, token.y - 52, width * pct, 8, 3)
  }

  private play(groups: BattleEvent[][], index: number): void {
    if (this.stopped) return
    if (index >= groups.length) {
      this.finish()
      return
    }
    this.playEvents(groups[index], 0, () => {
      if (this.stopped) return
      this.time.delayedCall(600 / session.save.settings.battleSpeed, () => this.play(groups, index + 1))
    })
  }

  private playEvents(events: BattleEvent[], index: number, done: () => void): void {
    if (this.stopped) return
    if (index >= events.length) {
      done()
      return
    }
    this.apply(events[index])
    this.time.delayedCall(70, () => this.playEvents(events, index + 1, done))
  }

  private apply(event: BattleEvent): void {
    if (event.kind === 'turn_start') {
      this.roundText.setText(`Runde ${event.r}`)
      this.focus(event.actor)
      return
    }
    if (event.kind === 'skill') {
      const actor = this.tokens.get(event.actor)
      const skill = event.skillId === 'basic' ? 'Angriff' : species(actor?.speciesId ?? 'm01').skill.name
      this.log.setText(`${actor?.name ?? 'Monster'} · ${skill}`)
      return
    }
    if (event.kind === 'hit' || event.kind === 'dot' || event.kind === 'thorns') {
      const target = this.tokens.get(event.target)
      if (!target) return
      const loss = Math.max(0, event.dmg - event.shieldAbsorbed)
      target.hp = Math.max(0, target.hp - loss)
      this.redraw(target)
      const color = event.kind === 'hit' && event.crit ? '#f0c14a' : event.kind === 'hit' && event.typeMult > 1 ? '#ff8a65' : event.kind === 'hit' && event.typeMult < 1 ? '#90a4ae' : '#ff8a80'
      floatText(this, target.x, target.y - 20, `${event.dmg}${event.kind === 'hit' && event.crit ? '!' : ''}`, color)
      return
    }
    if (event.kind === 'heal' || event.kind === 'shield') {
      const target = this.tokens.get(event.target)
      if (!target) return
      if (event.kind === 'heal') target.hp = Math.min(target.max, target.hp + event.amount)
      this.redraw(target)
      floatText(this, target.x, target.y - 20, event.kind === 'heal' ? `+${event.amount}` : 'Schild', '#80deea')
      return
    }
    if (event.kind === 'ko') {
      const target = this.tokens.get(event.target)
      if (!target) return
      target.hp = 0
      target.root.setAlpha(0.3)
      this.redraw(target)
      this.log.setText(`${target.name} ist kampfunfähig.`)
      return
    }
    if (event.kind === 'status_add' || event.kind === 'status_remove') {
      const target = this.tokens.get(event.target)
      if (!target) return
      if (event.kind === 'status_remove') {
        const index = target.statuses.findIndex((icon) => icon.getData('status') === event.status)
        if (index >= 0) target.statuses.splice(index, 1)[0].destroy()
      } else {
        const icon = iconSprite(this, 0, 0, `status_${event.status}`, 18)
        if (icon) {
          icon.setData('status', event.status)
          target.root.add(icon)
          target.statuses.push(icon)
        }
      }
      target.statuses.forEach((icon, index) => icon.setPosition(-20 + index * 20, -36))
      return
    }
    if (event.kind === 'revive') {
      const target = this.tokens.get(event.target)
      if (!target) return
      target.hp = event.hp
      target.root.setAlpha(1)
      this.redraw(target)
      this.log.setText(`${target.name} erhebt sich wieder.`)
    }
  }

  private focus(id: string): void {
    for (const token of this.tokens.values()) token.root.setScale(token.id === id ? 1.12 : 1)
  }

  private finish(): void {
    if (this.stopped) return
    const payload = this.game.registry.get('fight') as FightPayload
    payload.index += 1
    this.game.registry.set('fight', payload)
    if (payload.index < payload.report.logs.length) this.scene.restart()
    else go(this, 'Result')
  }

  private skip(): void {
    this.stopped = true
    this.time.removeAllEvents()
    const payload = this.game.registry.get('fight') as FightPayload
    payload.index = payload.report.logs.length
    this.game.registry.set('fight', payload)
    go(this, 'Result')
  }
}

function place(side: 'A' | 'B', slot: SlotId): [number, number] {
  const col = slot === 'F2' || slot === 'H2' ? 1 : slot === 'H3' ? 2 : 0
  const front = slot.startsWith('F')
  if (side === 'B') return front ? [520 + col * 170, 230] : [430 + col * 170, 130]
  return front ? [520 + col * 170, 470] : [430 + col * 170, 575]
}

function groupEvents(events: BattleEvent[]): BattleEvent[][] {
  const groups: BattleEvent[][] = []
  for (const event of events) {
    if (event.kind === 'turn_start' || groups.length === 0) groups.push([event])
    else groups[groups.length - 1].push(event)
  }
  return groups
}
