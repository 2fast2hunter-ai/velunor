import Phaser from 'phaser'
import { addGhostOverlay, iconSprite, monsterToken, paintBackground } from '../art'
import {
  arenaUnlocked,
  listArenaOpponents,
  nextRank,
  rankForPoints,
  rankLabel,
  tierLabel,
  type GhostTeam
} from '../arena'
import { arenaCfg, formatInt } from '../data'
import { go, session } from '../session'
import { ALL_SLOTS } from '../types'
import { GOLD, INK, MUTED, W, button, panel, text } from '../ui'

export class ArenaScene extends Phaser.Scene {
  private paintedDay = ''

  constructor() { super('Arena') }

  create(): void {
    const onClock = () => {
      if (session.save.arena?.dayKey !== this.paintedDay) this.paint()
    }
    this.game.events.on('clock', onClock)
    this.events.once('shutdown', () => this.game.events.off('clock', onClock))
    this.paint()
  }

  private paint(): void {
    this.children.removeAll(true)
    if (!paintBackground(this, 'arena')) {
      const sky = this.add.graphics()
      sky.fillStyle(0x141028, 1)
      sky.fillRect(0, 0, W, 720)
    }
    const save = session.save
    if (!arenaUnlocked(save)) {
      text(this, W / 2, 300, 'Arena', 36, GOLD, [0.5, 0.5])
      text(this, W / 2, 360, 'Rathaus Stufe 3', 22, INK, [0.5, 0.5])
      button(this, W / 2, 440, 220, 48, 'Zur Stadt', () => go(this, 'City'))
      return
    }
    const now = Date.now()
    const ghosts = listArenaOpponents(save, now)
    session.persist()
    this.paintedDay = save.arena.dayKey
    const rank = rankForPoints(save.arena.points)
    const upcoming = nextRank(save.arena.points)
    text(this, 88, 86, 'Arena', 32, GOLD, [0, 0.5])
    const mark = iconSprite(this, 52, 86, 'arena', 48)
    if (mark) mark.setDepth(2)
    text(this, 88, 118, `Versuche ${save.arena.attemptsUsed}/${arenaCfg.attemptsPerDay} · Siege ${save.arena.wins} · Niederlagen ${save.arena.losses}`, 15, MUTED)
    const badge = iconSprite(this, 1088, 100, `rank_${rank.id}`, 72)
    if (badge) badge.setDepth(2)
    text(this, 1136, 78, rankLabel(rank.id), 20, GOLD)
    text(this, 1136, 104, `${formatInt(save.arena.points)} Punkte`, 16, INK)
    text(this, 1136, 128, upcoming ? `Nächster Rang: ${rankLabel(upcoming.id)} (${upcoming.min})` : 'Höchster Rang', 13, MUTED)
    this.drawRankSheet(760, 108, rank.id)

    const attemptsLeft = arenaCfg.attemptsPerDay - save.arena.attemptsUsed
    if (!ghosts.length) {
      text(this, W / 2, 360, 'Stell mindestens ein Monster auf.', 20, INK, [0.5, 0.5])
    } else {
      ghosts.forEach((ghost, index) => this.drawCard(ghost, 28 + index * 416, attemptsLeft > 0))
    }

    const rerollsLeft = Math.max(0, arenaCfg.freeRerolls - save.arena.rerollsUsed)
    const rerollUsed = rerollsLeft <= 0
    button(this, 360, 608, 280, 46, rerollUsed ? 'Heute gewürfelt' : `Neu würfeln (${rerollsLeft})`, () => {
      if (session.save.arena.rerollsUsed >= arenaCfg.freeRerolls) return
      session.rerollArena()
      this.paint()
    }, { disabled: rerollUsed, fill: 0xf0c14a, color: '#2a2112', size: 16 })
    const chestReady = save.arena.attemptsUsed >= arenaCfg.attemptsPerDay && !save.arena.chestClaimed
    const chestLabel = save.arena.chestClaimed ? 'Truhe geholt' : chestReady ? 'Tagestruhe' : 'Truhe nach 5 Versuchen'
    button(this, 680, 608, 300, 46, chestLabel, () => {
      if (session.save.arena.chestClaimed || session.save.arena.attemptsUsed < arenaCfg.attemptsPerDay) return
      session.claimArenaChest()
      this.paint()
    }, { disabled: !chestReady, fill: 0x7e57c2, color: '#fff', size: 16 })
    button(this, 980, 608, 200, 46, 'Zur Stadt', () => go(this, 'City'), { fill: 0x3d4b6e, color: INK, size: 16 })
  }

  private drawRankSheet(x: number, y: number, current: string): void {
    const order = arenaCfg.ranks.map((rank) => rank.id)
    if (this.textures.exists('icon-rank_sheet')) {
      order.forEach((id, index) => {
        const frame = this.add.image(x + index * 52, y, 'icon-rank_sheet', index).setDisplaySize(40, 40)
        frame.setAlpha(id === current ? 1 : 0.4)
      })
      return
    }
    order.forEach((id, index) => {
      const icon = iconSprite(this, x + index * 52, y, `rank_${id}`, 40)
      if (icon && id !== current) icon.setAlpha(0.4)
    })
  }

  private drawCard(ghost: GhostTeam, x: number, canFight: boolean): void {
    const g = this.add.graphics()
    panel(g, x, 168, 400, 400, 0x1a2236)
    const tier = arenaCfg.tiers.find((entry) => entry.id === ghost.tier)
    text(this, x + 200, 188, ghost.name, 20, GOLD, [0.5, 0])
    text(this, x + 200, 216, `${tierLabel(ghost.tier)} · KK ${formatInt(ghost.kk)}`, 16, INK, [0.5, 0])
    ALL_SLOTS.forEach((slot, index) => {
      const member = ghost.team[slot]
      const mx = x + 44 + index * 72
      const token = monsterToken(this, mx, 292, member.speciesId, 60, member.rarity)
      addGhostOverlay(token, this, 60)
      text(this, mx, 330, `${member.level}`, 12, MUTED, [0.5, 0])
    })
    const winPoints = tier?.win ?? 0
    const winGold = tier?.gold ?? 0
    text(this, x + 200, 368, `Sieg: +${winPoints} Punkte, +${winGold} Gold`, 14, INK, [0.5, 0])
    text(this, x + 200, 390, `Niederlage: ${arenaCfg.lossPoints} Punkte, +${arenaCfg.lossGold} Gold`, 14, MUTED, [0.5, 0])
    button(this, x + 118, 500, 160, 44, 'Kämpfen', () => this.start(ghost.tier, false), {
      disabled: !canFight,
      fill: 0xf0c14a,
      color: '#2a2112',
      size: 16
    })
    button(this, x + 286, 500, 180, 44, 'Überspringen', () => this.start(ghost.tier, true), {
      disabled: !canFight,
      fill: 0x3d4b6e,
      color: INK,
      size: 15
    })
  }

  private start(tierId: string, skip: boolean): void {
    const report = session.arenaFight(tierId)
    if (!report) {
      this.paint()
      return
    }
    this.game.registry.set('fight', { report, index: skip ? report.logs.length : 0 })
    go(this, skip ? 'Result' : 'Battle')
  }
}
