import type { Lang } from './i18n'
import { clampLook } from './avatar'
import type { AvatarLook } from './types'

/** Original names. Forty each, so the dice is not a single default. */
export const NAMES_DE = [
  'Mira', 'Joren', 'Talve', 'Sunna', 'Brin', 'Elko', 'Nila', 'Korin', 'Sera', 'Venn',
  'Liora', 'Tarek', 'Ylva', 'Oren', 'Pina', 'Halvar', 'Esme', 'Quill', 'Maren', 'Soren',
  'Tilda', 'Ivo', 'Nelke', 'Runa', 'Kael', 'Fenna', 'Joris', 'Alma', 'Vesper', 'Nori',
  'Leif', 'Sable', 'Wren', 'Tove', 'Eira', 'Lumen', 'Aris', 'Kian', 'Noor', 'Pim'
] as const

export const NAMES_EN = [
  'Mira', 'Joren', 'Talve', 'Sunna', 'Brin', 'Elko', 'Nila', 'Corin', 'Sera', 'Venn',
  'Liora', 'Tarek', 'Ylva', 'Oren', 'Pina', 'Halvar', 'Esme', 'Quill', 'Maren', 'Soren',
  'Tilda', 'Ivo', 'Nell', 'Runa', 'Kael', 'Fenna', 'Jory', 'Alma', 'Vesper', 'Nori',
  'Leif', 'Sable', 'Wren', 'Tove', 'Eira', 'Lumen', 'Aris', 'Kian', 'Noor', 'Pip'
] as const

const BLOCKED = ['fuck', 'shit', 'arsch', 'fick', 'nazi']

export type NameProblem = 'short' | 'long' | 'chars' | 'blocked'

/** 2–16 letters, digits, spaces or hyphens. A blocked word fails on its own. */
export function nameProblem(raw: string): NameProblem | null {
  const name = raw.trim()
  if (name.length < 2) return 'short'
  if (name.length > 16) return 'long'
  if (!/^[\p{L}\p{N} -]+$/u.test(name)) return 'chars'
  const tokens = name.toLocaleLowerCase('de').split(/[\s-]+/)
  if (tokens.some((token) => BLOCKED.includes(token))) return 'blocked'
  return null
}

export function pickName(lang: Lang, roll: () => number): string {
  const list = lang === 'en' ? NAMES_EN : NAMES_DE
  const index = Math.min(list.length - 1, Math.max(0, Math.floor(roll() * list.length)))
  return list[index]
}

export function pickLook(roll: () => number): AvatarLook {
  return clampLook({
    skin: Math.floor(roll() * 6),
    hair: Math.floor(roll() * 8),
    color: Math.floor(roll() * 8)
  })
}
