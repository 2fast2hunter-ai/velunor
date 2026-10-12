import Phaser from 'phaser'
import { monsterToken } from '../art'
import { ascensionCosts, expToNext, hasUnlock, maxLevelFor, rarityInfo, species, strongAgainst, typeName } from '../data'
import { session } from '../session'
import { instanceStats } from '../stats'
import { INK, MUTED, W, button, confirm, openModal, text } from '../ui'

export class MonsterListScene extends Phaser.Scene {
  private page = 0

  constructor() { super('Monsters') }

  create(): void {
    this.paint()
  }

  private paint(): void {
    this.children.removeAll(true)
    const g = this.add.graphics()
    g.fillStyle(0x1a1630, 1)
    g.fillRect(0, 0, W, 720)
    const save = session.save
    text(this, 48, 88, 'Monster', 32, '#f0c14a')
    text(this, 48, 128, `${save.monsters.length} / 60 im Lager`, 16, MUTED)
    const pageSize = 8
    const slice = save.monsters.slice(this.page * pageSize, this.page * pageSize + pageSize)
    slice.forEach((monster, index) => {
      const col = index % 4
      const row = Math.floor(index / 4)
      const x = 180 + col * 250
      const y = 250 + row * 180
      const sp = species(monster.speciesId)
      const box = this.add.graphics()
      box.fillStyle(0x1b2438, 1)
      box.fillRoundedRect(x - 90, y - 70, 200, 150, 16)
      box.lineStyle(3, Phaser.Display.Color.HexStringToColor(rarityInfo(monster.rarity).color).color, 1)
      box.strokeRoundedRect(x - 90, y - 70, 200, 150, 16)
      monsterToken(this, x - 40, y - 10, monster.speciesId, 56, monster.rarity)
      text(this, x + 10, y - 36, sp.name, 16, INK)
      text(this, x + 10, y - 12, `${rarityInfo(monster.rarity).name}`, 13, rarityInfo(monster.rarity).color)
      text(this, x + 10, y + 8, `Lv. ${monster.level}`, 14, MUTED)
      if (monster.locked) text(this, x + 10, y + 28, 'geschützt', 12, '#9dffc3')
      const hit = this.add.rectangle(x, y, 200, 150, 0xffffff, 0.001)
      hit.setInteractive({ useHandCursor: true })
      hit.on('pointerup', () => this.openDetail(monster.uid))
    })
    if (this.page > 0) button(this, 1040, 600, 90, 40, 'Zurück', () => { this.page -= 1; this.paint() }, { fill: 0x3d4b6e, color: INK, size: 15 })
    if ((this.page + 1) * pageSize < save.monsters.length) button(this, 1160, 600, 90, 40, 'Weiter', () => { this.page += 1; this.paint() }, { fill: 0x3d4b6e, color: INK, size: 15 })
  }

  private openDetail(uid: string): void {
    const monster = session.save.monsters.find((m) => m.uid === uid)
    if (!monster) return
    const sp = species(monster.speciesId)
    const modal = openModal(this, 760, 520, sp.name)
    modal.root.add(monsterToken(this, 280, 250, sp.id, 88, monster.rarity))
    const stats = instanceStats(monster.speciesId, monster.rarity, monster.level)
    const cap = maxLevelFor(monster.rarity)
    const need = monster.level >= cap ? 0 : expToNext(monster.level)
    const lines = [
      `${typeName(sp.type)} · ${rarityInfo(monster.rarity).name}${monster.rarity > sp.baseRarity ? ' · aufgewertet' : ''}`,
      `Level ${monster.level} / ${cap}${need ? ` · ${monster.exp}/${need} EP` : ''}`,
      `HP ${stats.hp}   ATK ${stats.atk}   DEF ${stats.def}   SPD ${stats.spd}`,
      `Rolle: ${sp.role === 'front' ? 'Front' : 'Hinten'}`,
      sp.blurb
    ]
    lines.forEach((line, i) => modal.root.add(text(this, 360, 200 + i * 26, line, 15, i === 0 ? rarityInfo(monster.rarity).color : INK)))
    modal.root.add(text(this, 200, 360, sp.skill.name, 18, '#f0c14a'))
    const desc = text(this, 200, 388, sp.skill.description, 15, MUTED)
    desc.setWordWrapWidth(520)
    modal.root.add(desc)
    if (sp.passive) {
      const passive = text(this, 200, 450, `${sp.passive.name}: ${sp.passive.description}`, 14, '#e0b3ff')
      passive.setWordWrapWidth(520)
      modal.root.add(passive)
    }
    const strong = strongAgainst(sp.type).slice(0, 3).map((id) => typeName(id)).join(', ')
    modal.root.add(text(this, 200, 500, `Stark gegen: ${strong}`, 14, MUTED))
    modal.root.add(button(this, 260, 560, 160, 42, monster.locked ? 'Entsperren' : 'Schützen', () => {
      session.toggleLock(uid)
      modal.close()
      this.paint()
    }, { fill: 0x3d4b6e, color: INK, size: 15 }))
    const canRelease = hasUnlock(session.save.buildings.townhall.level, 'release_monster')
    modal.root.add(button(this, 450, 560, 180, 42, canRelease ? 'Freilassen' : 'Rathaus 3', () => {
      if (!canRelease) {
        session.toast('Rathaus Stufe 3')
        return
      }
      confirm(this, `${sp.name} freilassen für ${rarityInfo(monster.rarity).essence} Essenz?`, () => {
        session.release(uid)
        modal.close()
        this.paint()
      })
    }, { disabled: !canRelease, fill: 0xe15b64, color: '#fff', size: 15 }))
    const cost = ascensionCosts.find((row) => row.from === monster.rarity)
    const ascendReady = hasUnlock(session.save.buildings.townhall.level, 'ascension') && monster.level >= cap && cost
    const ascendLabel = !hasUnlock(session.save.buildings.townhall.level, 'ascension')
      ? 'Aufwertung: Rathaus 3'
      : monster.rarity >= 9
        ? 'Ursprung'
        : monster.level < cap
          ? `Aufwertung ab Lv. ${cap}`
          : `Aufwerten · ${cost?.essence} Essenz`
    modal.root.add(button(this, 680, 560, 240, 42, ascendLabel, () => {
      session.ascend(uid)
      modal.close()
      this.paint()
    }, { disabled: !ascendReady, fill: 0xf0c14a, size: 14 }))
  }
}
