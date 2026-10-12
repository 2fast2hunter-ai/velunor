import Phaser from 'phaser'
import { rewardedButton } from '../ads'
import { go, session } from '../session'
import type { FightReport } from '../state'
import { INK, MUTED, W, button, panel, text } from '../ui'

interface FightPayload {
  report: FightReport
  index: number
}

export class ResultScene extends Phaser.Scene {
  constructor() { super('Result') }

  create(): void {
    const payload = this.game.registry.get('fight') as FightPayload | undefined
    const g = this.add.graphics()
    g.fillStyle(0x141028, 1)
    g.fillRect(0, 0, W, 720)
    if (!payload) {
      button(this, W / 2, 400, 220, 48, 'Zur Stadt', () => go(this, 'City'))
      return
    }
    const report = payload.report
    const card = this.add.graphics()
    panel(card, 280, 120, 720, 460)
    text(this, W / 2, 150, report.victory ? 'Sieg' : 'Niederlage', 40, report.victory ? '#f0c14a' : '#ff8a80', [0.5, 0])
    const stars = report.victory ? '★'.repeat(report.stars) + '☆'.repeat(3 - report.stars) : 'Keine Sterne'
    text(this, W / 2, 210, `${report.stageId}   ${stars}`, 22, INK, [0.5, 0])
    const rewards = report.rewards
    const lines = [
      `+${rewards.gold} Gold`,
      rewards.gems ? `+${rewards.gems} Juwelen` : 'Keine Juwelen',
      `+${rewards.exp} EP je Monster im Team`,
      rewards.essence ? `+${rewards.essence} Essenz` : '',
      rewards.tickets ? `+${rewards.tickets} Beschwörungsticket` : '',
      rewards.levels ? `${rewards.levels} Level-Aufstiege` : ''
    ].filter(Boolean)
    lines.forEach((line, i) => text(this, W / 2, 270 + i * 28, line, 18, INK, [0.5, 0]))
    if (report.logs.length > 1) {
      const summary = report.logs.map((log, i) => `${i + 1}:${log.result === 'win' ? 'Sieg' : 'Niederlage'}`).join('   ')
      text(this, W / 2, 450, summary, 15, MUTED, [0.5, 0])
    }
    if (!report.victory && report.tip) {
      const tip = text(this, W / 2, 470, report.tip, 15, '#ffd59e', [0.5, 0])
      tip.setWordWrapWidth(640)
      tip.setAlign('center')
    }
    button(this, W / 2, 530, 240, 50, 'Weiter zur Stadt', () => {
      void session.leaveResult(report.victory).then(() => go(this, 'City'))
    })
    if (report.victory && report.logs.length === 1) {
      const ad = rewardedButton(session.save, 'double_reward', Date.now())
      if (ad.visible) {
        button(this, W / 2, 590, 320, 42, ad.label, () => session.toast(ad.reason || 'Gerade keine Werbung verfügbar'), {
          disabled: !ad.enabled,
          fill: 0x3d4b6e,
          color: INK,
          size: 15
        })
        if (ad.reason) text(this, W / 2, 624, ad.reason, 13, MUTED, [0.5, 0])
      }
    }
  }
}
