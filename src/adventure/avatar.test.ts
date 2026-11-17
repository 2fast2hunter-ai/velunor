import { describe, expect, it } from 'vitest'
import { clampLook, lookFromAvatar, readLook } from './avatar'
import { NAMES_DE, NAMES_EN, nameProblem, pickLook, pickName } from './home'

describe('avatar look', () => {
  it('maps the old letters and sends anything else to zero', () => {
    expect(lookFromAvatar('A')).toEqual({ skin: 1, hair: 0, color: 0 })
    expect(lookFromAvatar('B')).toEqual({ skin: 3, hair: 1, color: 3 })
    expect(lookFromAvatar(undefined)).toEqual({ skin: 0, hair: 0, color: 0 })
    expect(lookFromAvatar('C')).toEqual({ skin: 0, hair: 0, color: 0 })
    expect(lookFromAvatar(1)).toEqual({ skin: 0, hair: 0, color: 0 })
  })

  it('keeps a stored look and replaces only invalid numbers', () => {
    expect(readLook({ skin: 5, hair: 7, color: 7 }, 'A')).toEqual({ skin: 5, hair: 7, color: 7 })
    expect(readLook({ skin: 9, hair: -1, color: 1.5 }, 'B')).toEqual({ skin: 0, hair: 0, color: 0 })
    expect(readLook({ skin: 2 }, 'B')).toEqual({ skin: 2, hair: 0, color: 0 })
    expect(readLook(undefined, 'A')).toEqual({ skin: 1, hair: 0, color: 0 })
    expect(readLook(null, 'B')).toEqual({ skin: 3, hair: 1, color: 3 })
    expect(clampLook({ skin: 4, hair: 2, color: 6 })).toEqual({ skin: 4, hair: 2, color: 6 })
  })
})

describe('start name', () => {
  it('accepts a listed name and rejects the rest', () => {
    expect(NAMES_DE).toHaveLength(40)
    expect(NAMES_EN).toHaveLength(40)
    expect(new Set(NAMES_DE).size).toBe(40)
    expect(new Set(NAMES_EN).size).toBe(40)
    expect(nameProblem('Mira')).toBeNull()
    expect(nameProblem('  Talve  ')).toBeNull()
    expect(nameProblem('Ada-2')).toBeNull()
    expect(nameProblem('A')).toBe('short')
    expect(nameProblem('DiesIstEinLangerName')).toBe('long')
    expect(nameProblem('Ada!')).toBe('chars')
    expect(nameProblem('fick')).toBe('blocked')
    expect(nameProblem('Fenna')).toBeNull()
  })

  it('rolls inside the lists', () => {
    expect(pickName('de', () => 0)).toBe('Mira')
    expect(pickName('en', () => 0.999)).toBe('Pip')
    expect(pickLook(() => 0)).toEqual({ skin: 0, hair: 0, color: 0 })
    const high = pickLook(() => 0.999)
    expect(high.skin).toBe(5)
    expect(high.hair).toBe(7)
    expect(high.color).toBe(7)
  })
})
