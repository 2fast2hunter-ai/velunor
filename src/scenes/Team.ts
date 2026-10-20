import Phaser from 'phaser'
import { monsterToken } from '../art'
import { rarityInfo, species, teamSlotLimit, typeName } from '../data'
import { session } from '../session'
import { hasUnlock } from '../data'
import { previewStats } from '../stats'
import { synergySummary, synergyView } from '../synergy'
import { teamPower } from '../state'
import { ALL_SLOTS, SLOT_ROW, type SlotId } from '../types'
import { openGuide } from '../guide'
import { INK, MUTED, W, attachTip, button, hoverTip, panel, text } from '../ui'

const SLOT_POS: Record<SlotId, [number, number]> = {
  F1: [480, 250],
  F2: [700, 250],
  H1: [360, 400],
  H2: [590, 400],
  H3: [820, 400]
}

export class TeamScene extends Phaser.Scene {
  private selected: SlotId = 'F1'
  private page = 0

  constructor() { super('Team') }

  create(): void {
    this.paint()
    const guide = openGuide(this, 'Team')
    if (guide) this.events.once('shutdown', () => guide.close())
  }

  private paint(): void {
    this.children.removeAll(true)
    const g = this.add.graphics()
    g.fillStyle(0x1a1630, 1)
    g.fillRect(0, 0, W, 720)
    text(this, 48, 88, 'Team', 32, '#f0c14a')
    const hint = text(this, 48, 128, 'Front hält aus und zielt auf die eigene Spur. Hinten fokussiert das niedrigste Ziel. Passende Reihe: +10 % ATK und DEF.', 15, MUTED)
    hint.setWordWrapWidth(790)
    const save = session.save
    const open = new Set(teamSlotLimit(save.buildings.townhall.level))
    const showDetail = open.has(this.selected) && save.monsters.some((monster) => monster.uid === save.team[this.selected])
    for (const slot of ALL_SLOTS) {
      const [x, y] = SLOT_POS[slot]
      const unlocked = open.has(slot)
      const uid = save.team[slot]
      const monster = save.monsters.find((m) => m.uid === uid)
      const box = this.add.graphics()
      panel(box, x - 70, y - 70, 150, 150, this.selected === slot ? 0x3a2a20 : 0x1b2438)
        text(this, x + 5, y - 58, slot, 14, '#f0c14a', [0.5, 0])
      if (!unlocked) {
        text(this, x + 5, y, slot === 'H2' ? 'Rathaus 2' : 'Rathaus 3', 14, MUTED, [0.5, 0.5])
      } else if (monster) {
        monsterToken(this, x + 5, y - 6, monster.speciesId, 56, monster.rarity)
        const sp = species(monster.speciesId)
        const match = sp.role === SLOT_ROW[slot]
        text(this, x + 5, y + 48, sp.name, 13, INK, [0.5, 0])
        text(this, x + 5, y + 66, match ? 'Bonus aktiv' : 'Keine Reihe', 12, match ? '#9dffc3' : '#ffb4b4', [0.5, 0])
      } else {
        text(this, x + 5, y, 'Leer', 16, MUTED, [0.5, 0.5])
      }
      if (unlocked) {
        const hit = this.add.rectangle(x + 5, y + 8, 150, 150, 0xffffff, 0.001)
        hit.setInteractive(new Phaser.Geom.Rectangle(0, 0, 150, 150), Phaser.Geom.Rectangle.Contains)
        if (hit.input) hit.input.cursor = 'pointer'
        attachTip(this, hit, x + 5, y - 70, slot.startsWith('F')
          ? `${slot} ist Front. Das Monster hält aus und zielt auf seine Spur. Die passende Rolle gibt +10 % ATK und DEF.`
          : `${slot} ist Hinten. Das Monster greift das schwächste Ziel an. Die passende Rolle gibt +10 % ATK und DEF.`,
        showDetail ? 844 : W - 12)
        hit.on('pointerup', () => {
          this.selected = slot
          this.paint()
        })
      }
    }
    const members = [...open].map((slot) => save.team[slot]).map((uid) => save.monsters.find((m) => m.uid === uid)).filter((m) => m != null)
    const syn = synergyView(
      members.map((m) => ({ type: species(m.speciesId).type, class: species(m.speciesId).class })),
      hasUnlock(save.buildings.townhall.level, 'synergies'),
      hasUnlock(save.buildings.townhall.level, 'class_synergies')
    )
    const synText = synergySummary(teamPower(save), syn.lines)
    const synLabel = text(this, 48, 492, synText, 15, INK)
    synLabel.setWordWrapWidth(1180)
    hoverTip(this, 360, 500, 640, 28, 'Zwei gleiche Typen im Team verstärken sich. Das Rathaus schaltet Typ-Synergien auf Stufe 2 frei.')

    const roster = save.monsters
    const pageSize = 5
    const slice = roster.slice(this.page * pageSize, this.page * pageSize + pageSize)
    slice.forEach((monster, index) => {
      const x = 120 + index * 200
      const y = 575
      const sp = species(monster.speciesId)
      monsterToken(this, x, y, monster.speciesId, 48, monster.rarity)
      text(this, x, y + 40, sp.name, 13, INK, [0.5, 0])
      const placed = (Object.entries(save.team) as [SlotId, string | null][]).find(([, uid]) => uid === monster.uid)
      text(this, x, y + 58, placed ? placed[0] : rarityInfo(monster.rarity).name, 12, MUTED, [0.5, 0])
      const hit = this.add.rectangle(x, y + 8, 140, 88, 0xffffff, 0.001)
      hit.setInteractive({ useHandCursor: true })
      hit.on('pointerup', () => {
        if (!open.has(this.selected)) return
        if (save.team[this.selected] === monster.uid) session.setTeam(this.selected, null)
        else session.setTeam(this.selected, monster.uid)
        this.paint()
      })
    })
    if (this.page > 0) button(this, 1120, 500, 70, 36, '‹', () => { this.page -= 1; this.paint() }, { fill: 0x3d4b6e, color: INK })
    if ((this.page + 1) * pageSize < roster.length) button(this, 1200, 500, 70, 36, '›', () => { this.page += 1; this.paint() }, { fill: 0x3d4b6e, color: INK })

    const selectedMonster = save.monsters.find((m) => m.uid === save.team[this.selected])
    if (selectedMonster && open.has(this.selected)) {
      const types = hasUnlock(save.buildings.townhall.level, 'synergies') ? members.map((m) => species(m.speciesId).type) : null
      const stats = previewStats(selectedMonster, SLOT_ROW[this.selected], types)
      const sp = species(selectedMonster.speciesId)
      text(this, 860, 88, sp.name, 22, rarityInfo(selectedMonster.rarity).color)
      text(this, 860, 120, `${typeName(sp.type)} · ${sp.role === 'front' ? 'Front' : 'Hinten'} · Lv. ${selectedMonster.level}`, 15, MUTED)
      text(this, 860, 150, `HP ${Math.floor(stats.hp)}   ATK ${Math.floor(stats.atk)}   DEF ${Math.floor(stats.def)}   SPD ${Math.floor(stats.spd)}`, 15, INK)
      text(this, 860, 180, sp.skill.name ?? sp.skill.id, 16, '#f0c14a')
      const desc = text(this, 860, 206, sp.skill.description ?? '', 14, MUTED)
      desc.setWordWrapWidth(380)
    }
  }
}
