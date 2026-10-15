import Phaser from 'phaser'
import { addGhostOverlay, iconSprite, monsterToken, paintBackground } from '../art'
import {
  arenaUnlocked,
  defensePayoutLine,
  defensePower,
  defenseRoster,
  EMPTY_DEFENSE_HINT,
  listArenaOpponents,
  rankForPoints,
  rankLabel,
  runDefenseDay,
  seasonRewardText,
  seasonStatusLine,
  tierLabel,
  type DefenseReport,
  type GhostTeam
} from '../arena'
import { arenaCfg, formatInt, species, teamSlotLimit } from '../data'
import { go, session } from '../session'
import { ALL_SLOTS, type SlotId } from '../types'
import { GEM, GOLD, INK, MUTED, W, button, openModal, panel, text } from '../ui'

const SLOT_X = [430, 508, 586, 664, 742]

export class ArenaScene extends Phaser.Scene {
  private paintedDay = ''
  private paintedSeason = ''
  private paintedPoints = -1
  private pickerPage = 0
  private seasonLabel: Phaser.GameObjects.Text | null = null

  constructor() { super('Arena') }

  create(): void {
    const onClock = () => {
      const arena = session.save.arena
      if (!arena) return
      const line = seasonStatusLine(arena.seasonKey, Date.now())
      if (this.seasonLabel?.active && this.seasonLabel.text !== line) this.seasonLabel.setText(line)
      if (arena.dayKey !== this.paintedDay || arena.seasonKey !== this.paintedSeason || arena.points !== this.paintedPoints) this.paint()
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
    const defenseReport = runDefenseDay(save, now)
    const ghosts = listArenaOpponents(save, now)
    session.persist()
    this.paintedDay = save.arena.dayKey
    this.paintedSeason = save.arena.seasonKey
    this.paintedPoints = save.arena.points
    const rank = rankForPoints(save.arena.points)
    text(this, 88, 78, 'Arena', 26, GOLD, [0, 0.5])
    const mark = iconSprite(this, 52, 78, 'arena', 36)
    if (mark) mark.setDepth(2)
    text(this, 88, 100, `Versuche ${save.arena.attemptsUsed}/${arenaCfg.attemptsPerDay} · Siege ${save.arena.wins} · Niederlagen ${save.arena.losses}`, 13, MUTED)
    const chrome = this.add.graphics()
    panel(chrome, 430, 68, 830, 36, 0x12182a)
    this.seasonLabel = text(this, 846, 86, seasonStatusLine(save.arena.seasonKey, now), 15, GOLD, [0.5, 0.5])
    this.drawRankLadder(rank.id, save.arena.points)
    this.drawDefense(save)

    const attemptsLeft = arenaCfg.attemptsPerDay - save.arena.attemptsUsed
    if (!ghosts.length) {
      text(this, W / 2, 460, 'Stell mindestens ein Monster auf.', 20, INK, [0.5, 0.5])
    } else {
      ghosts.forEach((ghost, index) => this.drawCard(ghost, 28 + index * 416, 348, attemptsLeft > 0))
    }

    const rerollsLeft = Math.max(0, arenaCfg.freeRerolls - save.arena.rerollsUsed)
    const rerollUsed = rerollsLeft <= 0
    button(this, 360, 608, 280, 44, rerollUsed ? 'Heute gewürfelt' : `Neu würfeln (${rerollsLeft})`, () => {
      if (session.save.arena.rerollsUsed >= arenaCfg.freeRerolls) return
      session.rerollArena()
      this.paint()
    }, { disabled: rerollUsed, fill: 0xf0c14a, color: '#2a2112', size: 16 })
    const chestReady = save.arena.attemptsUsed >= arenaCfg.attemptsPerDay && !save.arena.chestClaimed
    const chestLabel = save.arena.chestClaimed ? 'Truhe geholt' : chestReady ? 'Tagestruhe' : 'Truhe nach 5 Versuchen'
    button(this, 680, 608, 300, 44, chestLabel, () => {
      if (session.save.arena.chestClaimed || session.save.arena.attemptsUsed < arenaCfg.attemptsPerDay) return
      session.claimArenaChest()
      this.paint()
    }, { disabled: !chestReady, fill: 0x7e57c2, color: '#fff', size: 16 })
    button(this, 980, 608, 200, 44, 'Zur Stadt', () => go(this, 'City'), { fill: 0x3d4b6e, color: INK, size: 16 })
    if (defenseReport.ran && defenseReport.log.length) this.showDefenseReport(defenseReport)
  }

  private drawRankLadder(current: string, points: number): void {
    const g = this.add.graphics()
    panel(g, 20, 114, 1240, 108, 0x1a2236)
    arenaCfg.ranks.forEach((rank, index) => {
      const x = 32 + index * 246
      const active = rank.id === current
      if (active) {
        const hi = this.add.graphics()
        panel(hi, x, 122, 236, 92, 0x243044)
      }
      const icon = iconSprite(this, x + 22, 150, `rank_${rank.id}`, 36)
      if (icon) icon.setDepth(2)
      text(this, x + 46, 128, active ? `${rankLabel(rank.id)} · ${formatInt(points)}` : rankLabel(rank.id), 16, active ? GOLD : INK)
      text(this, x + 46, 148, String(rank.min), 14, MUTED)
      const reward = text(this, x + 8, 172, seasonRewardText(rank.id), 12, INK)
      reward.setWordWrapWidth(220)
    })
  }

  private drawDefense(save: typeof session.save): void {
    const g = this.add.graphics()
    panel(g, 20, 230, 1240, 110, 0x1a2236)
    const shield = iconSprite(this, 52, 286, 'defense_shield', 40)
    if (shield) shield.setDepth(2)
    text(this, 80, 240, 'Verteidigung', 16, GOLD)
    const wins = save.arena.defenseLog.filter((fight) => fight.win).length
    const total = save.arena.defenseLog.length
    const filled = defenseRoster(save).length
    const status = filled === 0
      ? EMPTY_DEFENSE_HINT
      : total ? `Heute ${wins}/${total} Siege · KK ${formatInt(defensePower(save))}` : `Heute keine Kämpfe · KK ${formatInt(defensePower(save))}`
    text(this, 80, 262, status, 13, filled === 0 ? '#9dffc3' : MUTED)
    text(this, 80, 282, defensePayoutLine(), 13, INK)
    text(this, 80, 304, 'Gilt ab dem nächsten Tag.', 12, MUTED)
    const open = new Set(teamSlotLimit(save.buildings.townhall.level))
    ALL_SLOTS.forEach((slot, index) => {
      this.drawDefenseSlot(save, slot, SLOT_X[index], 286, open.has(slot))
    })
    button(this, 960, 270, 200, 40, 'Team übernehmen', () => {
      session.copyTeamToDefense()
      this.paint()
    }, { fill: 0xf0c14a, color: '#2a2112', size: 14, icon: 'defense_shield' })
    button(this, 1160, 270, 140, 40, 'Leeren', () => {
      session.clearDefense()
      this.paint()
    }, { fill: 0x3d4b6e, color: INK, size: 15 })
    text(this, 1060, 304, 'Plätze einzeln tippen.', 12, MUTED, [0.5, 0])
  }

  private drawDefenseSlot(save: typeof session.save, slot: SlotId, x: number, y: number, unlocked: boolean): void {
    const uid = save.arena.defense[slot]
    const monster = save.monsters.find((entry) => entry.uid === uid)
    const box = this.add.graphics()
    panel(box, x - 34, y - 36, 68, 78, 0x12182a)
    text(this, x, y - 28, slot, 11, GOLD, [0.5, 0])
    if (!unlocked) {
      text(this, x, y + 8, 'Zu', 12, MUTED, [0.5, 0.5])
      return
    }
    if (monster) monsterToken(this, x, y + 6, monster.speciesId, 40, monster.rarity)
    else text(this, x, y + 8, 'Leer', 12, MUTED, [0.5, 0.5])
    const hit = this.add.rectangle(x, y + 4, 68, 78, 0xffffff, 0.001)
    hit.setInteractive({ useHandCursor: true })
    hit.on('pointerup', () => this.openDefensePicker(slot))
  }

  private openDefensePicker(slot: SlotId): void {
    const save = session.save
    const modal = openModal(this, 900, 480, `Verteidigung ${slot}`)
    const roster = save.monsters
    const pageSize = 5
    const pages = Math.max(1, Math.ceil(roster.length / pageSize))
    if (this.pickerPage >= pages) this.pickerPage = 0
    const slice = roster.slice(this.pickerPage * pageSize, this.pickerPage * pageSize + pageSize)
    modal.root.add(text(this, W / 2, 180, 'Dasselbe Monster darf im Kampf- und Verteidigungsteam stehen.', 15, MUTED, [0.5, 0]))
    slice.forEach((monster, index) => {
      const x = 240 + index * 160
      const y = 300
      modal.root.add(monsterToken(this, x, y, monster.speciesId, 64, monster.rarity))
      const name = text(this, x, y + 48, species(monster.speciesId).name, 14, INK, [0.5, 0])
      modal.root.add(name)
      const placed = (Object.entries(save.arena.defense) as [SlotId, string | null][]).find(([, uid]) => uid === monster.uid)
      const onTeam = (Object.values(save.team) as (string | null)[]).includes(monster.uid)
      const note = placed ? placed[0] : onTeam ? 'im Team' : `Lv. ${monster.level}`
      modal.root.add(text(this, x, y + 68, note, 12, MUTED, [0.5, 0]))
      const hit = this.add.rectangle(x, y + 16, 140, 150, 0xffffff, 0.001)
      hit.setInteractive({ useHandCursor: true })
      hit.on('pointerup', () => {
        session.setDefense(slot, save.arena.defense[slot] === monster.uid ? null : monster.uid)
        modal.close()
        this.paint()
      })
      modal.root.add(hit)
    })
    if (this.pickerPage > 0) {
      modal.root.add(button(this, 360, 470, 80, 40, '‹', () => {
        this.pickerPage -= 1
        modal.close()
        this.openDefensePicker(slot)
      }, { fill: 0x3d4b6e, color: INK }))
    }
    if ((this.pickerPage + 1) * pageSize < roster.length) {
      modal.root.add(button(this, 920, 470, 80, 40, '›', () => {
        this.pickerPage += 1
        modal.close()
        this.openDefensePicker(slot)
      }, { fill: 0x3d4b6e, color: INK }))
    }
    modal.root.add(button(this, W / 2, 500, 200, 44, 'Leeren', () => {
      session.setDefense(slot, null)
      modal.close()
      this.paint()
    }, { fill: 0x3d4b6e, color: INK }))
  }

  private showDefenseReport(report: DefenseReport): void {
    const rows = report.log.length
    const extra = report.rankGems > 0 ? 32 : 0
    const h = 300 + rows * 42 + extra
    const modal = openModal(this, 760, h, 'Verteidigungsbericht')
    const top = (720 - h) / 2
    const wash = this.add.rectangle(W / 2, top + h / 2, 720, h - 24, 0x162033, 1)
    modal.root.addAt(wash, 2)
    const shield = iconSprite(this, 340, top + 118, 'defense_shield', 40)
    if (shield) modal.root.add(shield)
    report.log.forEach((fight, index) => {
      const line = `${fight.name}: ${fight.win ? 'Sieg' : 'Niederlage'}`
      modal.root.add(text(this, W / 2, top + 108 + index * 42, line, 22, fight.win ? '#9dffc3' : MUTED, [0.5, 0]))
    })
    let y = top + 124 + rows * 42
    const summary = report.points > 0 || report.gold > 0
      ? `+${report.points} Punkte, +${formatInt(report.gold)} Gold`
      : 'Keine Belohnung.'
    modal.root.add(text(this, W / 2, y, summary, 18, GOLD, [0.5, 0]))
    if (report.rankGems > 0) {
      y += 32
      modal.root.add(text(this, W / 2, y, `Neuer Rang: +${report.rankGems} Juwelen`, 16, GEM, [0.5, 0]))
    }
    modal.root.add(button(this, W / 2, top + h - 58, 220, 46, 'Weiter', modal.close, { fill: 0xf0c14a, color: '#2a2112' }))
  }

  private drawCard(ghost: GhostTeam, x: number, y: number, canFight: boolean): void {
    const g = this.add.graphics()
    panel(g, x, y, 400, 220, 0x1a2236)
    const tier = arenaCfg.tiers.find((entry) => entry.id === ghost.tier)
    text(this, x + 200, y + 10, ghost.name, 16, GOLD, [0.5, 0])
    text(this, x + 200, y + 30, `${tierLabel(ghost.tier)} · KK ${formatInt(ghost.kk)}`, 13, INK, [0.5, 0])
    ALL_SLOTS.forEach((slot, index) => {
      const member = ghost.team[slot]
      const mx = x + 44 + index * 72
      const token = monsterToken(this, mx, y + 78, member.speciesId, 40, member.rarity)
      addGhostOverlay(token, this, 40)
      text(this, mx, y + 102, `${member.level}`, 11, MUTED, [0.5, 0])
    })
    const winPoints = tier?.win ?? 0
    const winGold = tier?.gold ?? 0
    text(this, x + 200, y + 122, `Sieg: +${winPoints} Punkte, +${winGold} Gold`, 13, INK, [0.5, 0])
    text(this, x + 200, y + 140, `Niederlage: ${arenaCfg.lossPoints} Punkte, +${arenaCfg.lossGold} Gold`, 12, MUTED, [0.5, 0])
    button(this, x + 118, y + 180, 150, 36, 'Kämpfen', () => this.start(ghost.tier, false), {
      disabled: !canFight,
      fill: 0xf0c14a,
      color: '#2a2112',
      size: 14
    })
    button(this, x + 286, y + 180, 170, 36, 'Überspringen', () => this.start(ghost.tier, true), {
      disabled: !canFight,
      fill: 0x3d4b6e,
      color: INK,
      size: 13
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
