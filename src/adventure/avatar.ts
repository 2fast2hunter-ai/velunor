import avatarData from '../../data/avatar.json'
import type { AvatarLook } from './types'

export const SKIN_MAX = 5
export const HAIR_MAX = 7
export const COLOR_MAX = 7

export function skinHex(index: number): string {
  return avatarData.skin[index] ?? avatarData.skin[0]
}

export function colorHex(index: number): string {
  return avatarData.colors[index]?.hex ?? avatarData.colors[0].hex
}

export function colorId(index: number): string {
  return avatarData.colors[index]?.id ?? avatarData.colors[0].id
}

export function hairName(index: number): string {
  return avatarData.hair[index]?.name ?? avatarData.hair[0].name
}

/** Whole numbers only. Anything else becomes 0. */
export function clampLook(raw: Partial<AvatarLook> | null | undefined): AvatarLook {
  return {
    skin: indexOrZero(raw?.skin, SKIN_MAX),
    hair: indexOrZero(raw?.hair, HAIR_MAX),
    color: indexOrZero(raw?.color, COLOR_MAX)
  }
}

/** Old portrait letter, used only when `look` itself is missing. */
export function lookFromAvatar(avatar: unknown): AvatarLook {
  if (avatar === 'B') return { skin: avatarData.legacy.B.skin, hair: avatarData.legacy.B.hair, color: avatarData.legacy.B.color }
  if (avatar === 'A') return { skin: avatarData.legacy.A.skin, hair: avatarData.legacy.A.hair, color: avatarData.legacy.A.color }
  return { skin: 0, hair: 0, color: 0 }
}

/** One builder tap. Only skin, hair and color change, and the index is clamped. */
export function chooseLook(look: AvatarLook, part: string, index: number): AvatarLook {
  if (part !== 'skin' && part !== 'hair' && part !== 'color') return clampLook(look)
  return clampLook({ ...look, [part]: index })
}

/** A present `look` object wins. Missing `look` falls back to the old letter. */
export function readLook(look: unknown, avatar: unknown): AvatarLook {
  if (look && typeof look === 'object') return clampLook(look as Partial<AvatarLook>)
  return lookFromAvatar(avatar)
}

function indexOrZero(value: unknown, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > max) return 0
  return value
}

const images = new Map<string, Promise<HTMLImageElement>>()

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = images.get(src)
  if (cached) return cached
  const pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(src))
    img.src = src
  })
  images.set(src, pending)
  return pending
}

function drawTinted(ctx: CanvasRenderingContext2D, img: HTMLImageElement, color: string, size: number): void {
  const off = document.createElement('canvas')
  off.width = size
  off.height = size
  const g = off.getContext('2d')
  if (!g) return
  g.drawImage(img, 0, 0, size, size)
  g.globalCompositeOperation = 'multiply'
  g.fillStyle = color
  g.fillRect(0, 0, size, size)
  g.globalCompositeOperation = 'destination-in'
  g.drawImage(img, 0, 0, size, size)
  ctx.drawImage(off, 0, 0)
}

/** Stack the 512 px layers. Tint is multiply, then the layer alpha is restored. */
export async function paintLook(canvas: HTMLCanvasElement, look: AvatarLook, src: (file: string) => string): Promise<void> {
  const size = avatarData.anchor
  const row = clampLook(look)
  const hair = avatarData.hair[row.hair] ?? avatarData.hair[0]
  const layers: { file: string; tint: string | null }[] = [
    { file: 'avatar_bg.png', tint: avatarData.background },
    ...(hair.back ? [{ file: hair.back, tint: colorHex(row.color) }] : []),
    { file: 'head_base.png', tint: skinHex(row.skin) },
    { file: 'face.png', tint: null },
    { file: 'cape.png', tint: colorHex(row.color) },
    { file: 'cape_clasp.png', tint: null },
    { file: hair.front, tint: colorHex(row.color) },
    { file: 'avatar_frame.png', tint: avatarData.frame }
  ]
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, size, size)
  for (const layer of layers) {
    const img = await loadImage(src(`home/avatar/${layer.file}`))
    if (layer.tint) drawTinted(ctx, img, layer.tint, size)
    else ctx.drawImage(img, 0, 0, size, size)
  }
  canvas.dataset.ready = '1'
}

export function paintLooks(root: ParentNode, src: (file: string) => string): void {
  root.querySelectorAll('canvas.look-face').forEach((node) => {
    if (!(node instanceof HTMLCanvasElement)) return
    const [skin, hair, color] = (node.dataset.look ?? '0,0,0').split(',').map((part) => Number(part))
    void paintLook(node, { skin, hair, color }, src).catch(() => {
      node.dataset.ready = '0'
    })
  })
}
