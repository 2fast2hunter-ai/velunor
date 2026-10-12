import Phaser from 'phaser'
import { monsterToken } from '../art'
import { chapters, hasUnlock, rarityInfo, stages } from '../data'
import { go, session } from '../session'
import { canMulti, canSkip, stageUnlocked } from '../state'
import type { StageDef } from '../types'
import { INK, MUTED, W, button, openModal, text } from '../ui'

export class CampaignScene extends Phaser.Scene {
  private chapter = 1

  constructor() { super('Campaign') }

  create(): void {
    if (session.save.campaign.cleared['1-10'] && hasUnlock(session.save.buildings.townhall.level, 'campaign_ch2')) this.chapter = 2
    this.paint()
  }

  private paint(): void {
    this.children.removeAll(true)
    const g = this.add.graphics()
    g.fillStyle(0x1a1630, 1)
    g.fillRect(0, 0, W, 720)
    g.fillStyle(0x3a6b45, 1)
    g.fillEllipse(640, 430, 1100, 360)
    text(this, 48, 88, 'Kampagne', 32, '#f0c14a')
    chapters.forEach((chapter, index) => {
      const locked = chapter.id === 2 && !hasUnlock(session.save.buildings.townhall.level, 'campaign_ch2')
      button(this, 280 + index * 280, 140, 250, 42, locked ? `${chapter.name.split('·')[0]} 🔒` : chapter.name.split('·')[0].trim(), () => {
        if (locked) {
          session.toast('Rathaus Stufe 4')
          return
        }
        this.chapter = chapter.id
        this.paint()
      }, { fill: this.chapter === chapter.id ? 0xf0c14a : 0x2c3654, color: this.chapter === chapter.id ? '#2a2112' : INK, size: 16 })
    })
    const list = stages.filter((stage) => stage.chapter === this.chapter)
    list.forEach((stage, index) => {
      const col = index % 5
      const row = Math.floor(index / 5)
      const x = 160 + col * 220
      const y = 280 + row * 170
      const gate = stageUnlocked(session.save, stage)
      const stars = session.save.campaign.cleared[stage.id] ?? 0
      const node = this.add.graphics()
      node.fillStyle(gate.ok ? 0x1b2438 : 0x2a2438, 1)
      node.fillCircle(x, y, 46)
      node.lineStyle(4, stars ? 0xf0c14a : 0x6d7eab, 1)
      node.strokeCircle(x, y, 46)
      text(this, x, y - 8, stage.id, 16, INK, [0.5, 0.5])
      text(this, x, y + 14, stars ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '—', 12, '#f0c14a', [0.5, 0.5])
      text(this, x, y + 62, stage.name, 13, MUTED, [0.5, 0])
      const hit = this.add.rectangle(x, y, 110, 110, 0xffffff, 0.001)
      hit.setInteractive({ useHandCursor: true })
      hit.on('pointerup', () => {
        if (!gate.ok) {
          session.toast(gate.reason)
          return
        }
        this.openStage(stage)
      })
    })
  }

  private openStage(stage: StageDef): void {
    const modal = openModal(this, 820, 500, `${stage.id}  ${stage.name}`)
    modal.root.add(text(this, 280, 180, `Gegner Level ${stage.enemyLevel}`, 16, MUTED))
    stage.enemies.forEach((enemy, index) => {
      const rarity = enemy.rarity ?? stage.enemyRarity
      const x = 300 + index * 110
      modal.root.add(monsterToken(this, x, 270, enemy.speciesId, 48, rarity))
      modal.root.add(text(this, x, 310, `${enemy.slot}${enemy.boss ? ' Boss' : ''}`, 12, enemy.boss ? '#f0c14a' : MUTED, [0.5, 0]))
      modal.root.add(text(this, x, 326, rarityInfo(rarity).name, 11, rarityInfo(rarity).color, [0.5, 0]))
    })
    const reward = session.save.campaign.cleared[stage.id]
      ? `Wiederholung: ${stage.rewards.repeat.gold} Gold, ${stage.rewards.repeat.exp} EP je Monster`
      : `Erstsieg: ${stage.rewards.firstClear.gold} Gold, ${stage.rewards.firstClear.gems} Juwelen, ${stage.rewards.firstClear.exp} EP`
    const body = text(this, W / 2, 390, reward, 16, INK, [0.5, 0])
    body.setWordWrapWidth(700)
    body.setAlign('center')
    modal.root.add(body)
    const speed = session.save.settings.battleSpeed
    modal.root.add(button(this, 360, 470, 140, 44, `Tempo ${speed}×`, () => {
      const cap = hasUnlock(session.save.buildings.townhall.level, 'speed_4x') ? 4 : 2
      const next = speed === 1 ? 2 : speed === 2 && cap === 4 ? 4 : 1
      session.setSpeed(next as 1 | 2 | 4)
      modal.close()
      this.openStage(stage)
    }, { fill: 0x3d4b6e, color: INK, size: 15 }))
    modal.root.add(button(this, 530, 470, 160, 44, 'Kämpfen', () => this.start(stage, 1, false)))
    const skip = canSkip(session.save, stage.id)
    modal.root.add(button(this, 720, 470, 180, 44, skip ? 'Überspringen' : 'Skip gesperrt', () => {
      if (!skip) {
        session.toast(session.save.campaign.cleared[stage.id] ? 'Schon frei.' : 'Rathaus Stufe 3')
        return
      }
      this.start(stage, 1, true)
    }, { disabled: !skip, fill: 0x3d4b6e, color: INK, size: 15 }))
    const multi = canMulti(session.save)
    modal.root.add(button(this, 530, 530, 200, 44, multi ? '3× kämpfen' : '3×: Rathaus 4', () => {
      if (!multi) {
        session.toast('Rathaus Stufe 4')
        return
      }
      this.start(stage, 3, true)
    }, { disabled: !multi, fill: 0x7e57c2, color: '#fff', size: 15 }))
  }

  private start(stage: StageDef, count: 1 | 3, skip: boolean): void {
    const report = session.fight(stage.id, count)
    if (!report) return
    this.game.registry.set('fight', { report, index: skip ? report.logs.length : 0 })
    go(this, skip ? 'Result' : 'Battle')
  }
}
