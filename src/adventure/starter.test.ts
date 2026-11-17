import { describe, expect, it } from 'vitest'
import { STARTER_ART, starterBars, strongTypes, typeList, weakTypes } from './starter'
import { onboardingHtml } from './view'

const look = { skin: 1, hair: 0, color: 3 }

describe('starter cards', () => {
  it('scales the bars from the three base stats and keeps the type table', () => {
    const fox = starterBars('m01')
    const newt = starterBars('m02')
    const bud = starterBars('m03')
    expect(fox.atk).toBe(1)
    expect(fox.spd).toBe(1)
    expect(newt.hp).toBe(1)
    expect(bud.hp).toBeGreaterThan(0)
    expect(bud.hp).toBeLessThan(1)
    expect(fox.hp).toBeCloseTo(110 / 160)
    expect(strongTypes('fire')).toEqual(['plant', 'ice', 'insect'])
    expect(weakTypes('fire')).toEqual(expect.arrayContaining(['earth', 'stone']))
    expect(typeList('de', ['plant', 'ice'])).toBe('Pflanze, Eis')
    expect(typeList('en', ['plant'])).toBe('Plant')
  })

  it('shows the three cards with type, role and skill, and starts only after a pick', () => {
    const open = onboardingHtml('Mira', look, '', 'de', 'starter')
    expect(open).toContain('Mira')
    expect(open).toContain('data-look="1,0,3"')
    expect(open).toContain('data-act="back"')
    expect(open).toContain('Ein flinker Fuchs')
    expect(open).toContain('Glutstoß')
    expect(open).toContain('Wasserschild')
    expect(open).toContain('Photosynthese')
    expect(open).toContain(STARTER_ART.m01.frame)
    expect(open).toContain(STARTER_ART.m02.type)
    expect(open).toContain(STARTER_ART.m03.role)
    expect(open).toContain('Hinten')
    expect(open).toContain('Vorne')
    expect(open).toContain('Stark gegen')
    expect(open).toContain('Schwach gegen')
    expect(open).toContain('role="radiogroup"')
    expect(open).toContain('id="home-next" data-act="start" disabled')
    expect(open).not.toContain('starter-card is-on')

    const picked = onboardingHtml('Mira', look, 'm02', 'de', 'starter')
    expect(picked).toContain('starter-card is-on')
    expect(picked).toContain('aria-checked="true"')
    expect(picked).toContain('home/check.png')
    expect(picked).toContain('home/starter_m02.png')
    expect(picked).not.toContain('data-act="start" disabled')
  })
})
