import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { SPLASH_MAX_MS, splashShouldHide } from './splash'

function pngSize(path: string): { width: number, height: number } {
  const buf = readFileSync(path)
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

describe('brand assets', () => {
  it('hides the splash when the game is ready, and at three seconds at the latest', () => {
    expect(splashShouldHide(40, true)).toBe(true)
    expect(splashShouldHide(40, false)).toBe(false)
    expect(splashShouldHide(SPLASH_MAX_MS, false)).toBe(true)
    expect(splashShouldHide(SPLASH_MAX_MS - 1, false)).toBe(false)
  })

  it('keeps the icon, the favicon and the splash at the store sizes', () => {
    expect(pngSize('assets/icon-only.png')).toEqual({ width: 1024, height: 1024 })
    expect(pngSize('assets/logo.png')).toEqual({ width: 1024, height: 1024 })
    expect(pngSize('assets/quellen/icon-foreground.png')).toEqual({ width: 1024, height: 1024 })
    expect(pngSize('assets/quellen/icon-background.png')).toEqual({ width: 1024, height: 1024 })
    expect(pngSize('android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png')).toEqual({ width: 432, height: 432 })
    expect(pngSize('android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_background.png')).toEqual({ width: 432, height: 432 })
    expect(pngSize('assets/splash.png')).toEqual({ width: 2732, height: 2732 })
    expect(pngSize('assets/splash-dark.png')).toEqual({ width: 2732, height: 2732 })
    expect(pngSize('assets/splash-light.png')).toEqual({ width: 2732, height: 2732 })
    expect(pngSize('public/favicon-512.png')).toEqual({ width: 512, height: 512 })
    expect(pngSize('store/entwuerfe/feature-1024x500.png')).toEqual({ width: 1024, height: 500 })
    for (const name of ['abenteuer', 'truhen', 'team', 'kodex', 'baum', 'expedition']) {
      expect(pngSize(`store/entwuerfe/rahmen-${name}.png`)).toEqual({ width: 1080, height: 2340 })
    }
    const icon = readFileSync('assets/quellen/icon-foreground.svg', 'utf8')
    expect(icon.toLowerCase()).not.toContain('pokemon')
    expect(icon.toLowerCase()).not.toContain('bannsiegel')
  })
})
