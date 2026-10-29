import Phaser from 'phaser'
import { iconSprite, monsterToken } from '../art'
import {
  catalogProgress,
  catalogRarities,
  catalogTypeIds,
  classLabel,
  filterCatalog,
  type CatalogRarityFilter,
  type CatalogTypeFilter
} from '../catalog'
import { rarityInfo, species, typeName } from '../data'
import { session } from '../session'
import { instanceStats } from '../stats'
import type { MonsterSpecies } from '../types'
import { GOLD, INK, MUTED, W, button, openModal, text } from '../ui'

const COLS = 6
const ROWS = 2
const PAGE = COLS * ROWS
const CARD_W = 188
const CARD_H = 156
const GAP = 8
const GRID_TOP = 300

export class CatalogScene extends Phaser.Scene {
  private typeFilter: CatalogTypeFilter = 'all'
  private rarityFilter: CatalogRarityFilter = 'all'
  private obtainedOnly = false
  private page = 0
  private collectedKey = ''

  constructor() { super('Catalog') }

  create(): void {
    this.typeFilter = 'all'
    this.rarityFilter = 'all'
    this.obtainedOnly = false
    this.page = 0
    this.draw()
    const refresh = () => {
      const next = (session.save.collection ?? []).join('\n')
      if (next !== this.collectedKey) this.draw()
    }
    const off = session.on(refresh)
    this.game.events.on('clock', refresh)
    this.events.once('shutdown', () => {
      off()
      this.game.events.off('clock', refresh)
    })
  }

  private draw(): void {
    this.collectedKey = (session.save.collection ?? []).join('\n')
    this.children.removeAll(true)
    const bg = this.add.graphics()
    bg.fillStyle(0x141028, 1)
    bg.fillRect(0, 0, W, 720)
    const collected = session.save.collection ?? []
    const shown = filterCatalog({
      type: this.typeFilter,
      rarity: this.rarityFilter,
      obtainedOnly: this.obtainedOnly,
      collected: new Set(collected)
    })
    const pages = Math.max(1, Math.ceil(shown.length / PAGE))
    if (this.page >= pages) this.page = pages - 1
    if (this.page < 0) this.page = 0
    const progress = catalogProgress(collected, shown)
    text(this, 48, 82, 'Katalog', 32, GOLD)
    text(this, 1232, 88, progress.collectedLabel, 22, GOLD, [1, 0])
    text(this, 48, 122, progress.selectionLabel, 15, MUTED)
    if (pages > 1) {
      if (this.page > 0) {
        button(this, 980, 128, 100, 32, 'Zurück', () => {
          this.page -= 1
          this.draw()
        }, { fill: 0x3d4b6e, color: INK, size: 14, hitPad: 4 })
      }
      text(this, 1104, 128, `${this.page + 1}/${pages}`, 14, INK, [0.5, 0.5])
      if (this.page < pages - 1) {
        button(this, 1210, 128, 100, 32, 'Weiter', () => {
          this.page += 1
          this.draw()
        }, { fill: 0x3d4b6e, color: INK, size: 14, hitPad: 4 })
      }
    }
    const types: { id: CatalogTypeFilter; label: string; icon?: string }[] = [
      { id: 'all', label: 'Alle' },
      ...catalogTypeIds().map((id) => ({ id, label: typeName(id), icon: `type_${id}` }))
    ]
    this.chipRow(types.slice(0, 11), 168, this.typeFilter, (id) => {
      this.typeFilter = id
      this.page = 0
      this.draw()
    })
    this.chipRow(types.slice(11), 202, this.typeFilter, (id) => {
      this.typeFilter = id
      this.page = 0
      this.draw()
    })
    const rarities: { id: CatalogRarityFilter; label: string }[] = [
      { id: 'all', label: 'Alle' },
      ...catalogRarities().map((row) => ({ id: row.index, label: row.name }))
    ]
    this.chipRow(rarities.slice(0, 6), 238, this.rarityFilter, (id) => {
      this.rarityFilter = id
      this.page = 0
      this.draw()
    }, 176)
    this.chipRow(rarities.slice(6), 272, this.rarityFilter, (id) => {
      this.rarityFilter = id
      this.page = 0
      this.draw()
    }, 176)
    button(this, 1148, 272, 200, 30, 'nur gesammelt', () => {
      this.obtainedOnly = !this.obtainedOnly
      this.page = 0
      this.draw()
    }, {
      fill: this.obtainedOnly ? 0xf0c14a : 0x2c3654,
      color: this.obtainedOnly ? '#2a2112' : INK,
      size: 14,
      hitPad: 4
    })
    if (!shown.length) {
      text(this, W / 2, 460, 'Keine Monster in dieser Auswahl.', 18, MUTED, [0.5, 0.5])
      return
    }
    const owned = new Set(collected)
    const slice = shown.slice(this.page * PAGE, this.page * PAGE + PAGE)
    const gridLeft = (W - (COLS * CARD_W + (COLS - 1) * GAP)) / 2
    slice.forEach((monster, index) => {
      const col = index % COLS
      const row = Math.floor(index / COLS)
      const x = gridLeft + CARD_W / 2 + col * (CARD_W + GAP)
      const y = GRID_TOP + CARD_H / 2 + row * (CARD_H + GAP)
      this.card(monster, x, y, owned.has(monster.id))
    })
  }

  private chipRow<T extends string | number>(
    items: { id: T; label: string; icon?: string }[],
    y: number,
    selected: T,
    onPick: (id: T) => void,
    width = 104
  ): void {
    items.forEach((item, index) => {
      const x = 28 + width / 2 + index * (width + 6)
      const on = item.id === selected
      button(this, x, y, width, 30, item.label, () => onPick(item.id), {
        fill: on ? 0xf0c14a : 0x2c3654,
        color: on ? '#2a2112' : INK,
        size: 12,
        hitPad: 2,
        icon: item.icon
      })
    })
  }

  private card(monster: MonsterSpecies, x: number, y: number, owned: boolean): void {
    const plate = this.add.graphics()
    const rarity = rarityInfo(monster.baseRarity)
    const left = x - CARD_W / 2
    const top = y - CARD_H / 2
    plate.fillStyle(0x2a3148, 1)
    plate.fillRoundedRect(left, top, CARD_W, CARD_H, 14)
    const stroke = owned ? Phaser.Display.Color.HexStringToColor(rarity.color).color : 0xc8c4bc
    plate.lineStyle(3, stroke, 1)
    plate.strokeRoundedRect(left, top, CARD_W, CARD_H, 14)
    const tokenX = left + 42
    const tokenY = top + 44
    monsterToken(this, tokenX, tokenY, monster.sprite || monster.id, 68, monster.baseRarity, !owned, true)
    if (!owned) iconSprite(this, tokenX + 18, tokenY + 14, 'lock', 18)
    const rarityText = text(this, left + 80, top + 36, rarity.name, 12, owned ? rarity.color : MUTED)
    rarityText.setWordWrapWidth(CARD_W - 88)
    const name = text(this, x, top + 84, monster.name, 13, INK, [0.5, 0])
    name.setWordWrapWidth(CARD_W - 16)
    name.setAlign('center')
    const typeY = top + 108 + Math.max(0, name.height - 16)
    const icon = iconSprite(this, x - 36, typeY, `type_${monster.type}`, 14)
    text(this, icon ? x - 24 : x, typeY, typeName(monster.type), 12, INK, icon ? [0, 0.5] : [0.5, 0.5])
    const hit = this.add.rectangle(x, y, CARD_W, CARD_H, 0xffffff, 0.001)
    hit.setInteractive({ useHandCursor: true })
    hit.on('pointerup', () => {
      if (owned) this.openDetail(monster.id)
      else session.toast('Noch nicht gesammelt')
    })
  }

  private openDetail(id: string): void {
    const monster = species(id)
    const stats = instanceStats(monster.id, monster.baseRarity, 1)
    const modalW = 1040
    const modalH = 560
    const modal = openModal(this, modalW, modalH, monster.name)
    const left = (W - modalW) / 2
    const top = (720 - modalH) / 2
    const pad = 48
    const plate = this.add.graphics()
    plate.fillStyle(0x343c58, 1)
    plate.fillRoundedRect(left + pad, top + 72, 200, 210, 18)
    modal.root.add(plate)
    modal.root.add(monsterToken(this, left + pad + 100, top + 176, monster.sprite || monster.id, 168, monster.baseRarity, false, true))
    const lines = [
      `${typeName(monster.type)} · ${rarityInfo(monster.baseRarity).name}`,
      `Klasse: ${classLabel(monster.class)}`,
      `Rolle: ${monster.role === 'front' ? 'Front' : 'Hinten'}`,
      'Basiswerte, Stufe 1',
      `HP ${stats.hp}    ATK ${stats.atk}    DEF ${stats.def}    SPD ${stats.spd}`
    ]
    const infoX = left + pad + 232
    const typeIcon = iconSprite(this, infoX + 9, top + 96, `type_${monster.type}`, 18)
    if (typeIcon) modal.root.add(typeIcon)
    lines.forEach((line, index) => {
      const x = index === 0 && typeIcon ? infoX + 24 : infoX
      modal.root.add(text(this, x, top + 88 + index * 30, line, 16, index === 0 ? rarityInfo(monster.baseRarity).color : INK))
    })
    let y = top + 308
    const bodyX = left + pad
    const wrap = modalW - pad * 2
    modal.root.add(text(this, bodyX, y, monster.skill.name ?? monster.skill.id, 18, GOLD))
    y += 32
    const desc = text(this, bodyX, y, monster.skill.description ?? '', 15, MUTED)
    desc.setWordWrapWidth(wrap)
    modal.root.add(desc)
    y += desc.height + 12
    modal.root.add(text(this, bodyX, y, `Abklingzeit: ${monster.skill.cooldown}`, 15, INK))
    y += 28
    const passiveLine = monster.passive
      ? `${monster.passive.name}: ${monster.passive.description}`
      : 'Keine angeborene Passive.'
    const passive = text(this, bodyX, y, passiveLine, 15, monster.passive ? '#e0b3ff' : MUTED)
    passive.setWordWrapWidth(wrap)
    modal.root.add(passive)
    y += passive.height + 12
    if (monster.aussehen) {
      const look = text(this, bodyX, y, monster.aussehen, 14, INK)
      look.setWordWrapWidth(wrap)
      modal.root.add(look)
    }
  }
}
