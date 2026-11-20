import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium, type Page } from 'playwright-core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer, type ViteDevServer } from 'vite'

const chrome = [
  process.env.CHROME_PATH,
  '/usr/local/bin/google-chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable'
].find((path) => path && existsSync(path))
const hasChrome = Boolean(chrome)

interface Box { x: number; y: number; width: number; height: number }

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
}

async function box(page: Page, selector: string): Promise<Box | null> {
  const node = page.locator(selector).first()
  if (await node.count() === 0) return null
  return node.boundingBox()
}

async function reachGuardian(page: Page, base: string): Promise<void> {
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('#hero-name, [data-act="consent"]').first().waitFor({ timeout: 45_000 })
  const consent = page.locator('[data-act="consent"][data-consent="no"]')
  if (await consent.count()) await consent.click()
  await page.locator('#hero-name').waitFor({ timeout: 20_000 })
  await page.locator('#hero-name').fill('Ada')
  await page.locator('[data-act="next"]').click()
  await page.locator('[data-act="pick"][data-species="m01"]').click()
  await page.locator('[data-act="start"]').click()
  await page.locator('[data-screen="adventure"]').waitFor()
  await assertRoadDock(page)
  const raw = await page.evaluate(() => localStorage.getItem('velunor_v2'))
  const save = JSON.parse(raw ?? '{}')
  save.step = 20
  save.hold = true
  save.loop = false
  save.challengeNow = false
  save.guardMark = 0
  save.guardWins = 0
  save.lastSeenAt = Date.now()
  save.settings.catchCard = false
  save.settings.reduceMotion = true
  save.mons[save.team[0]].lvl = 20
  save.mons[save.team[0]].hp = null
  await page.evaluate((stored) => localStorage.setItem('velunor_v2', stored), JSON.stringify(save))
  await page.addInitScript((stored) => localStorage.setItem('velunor_v2', stored), JSON.stringify(save))
  await page.goto(base, { waitUntil: 'domcontentloaded' })
  await page.locator('[data-screen="adventure"], [data-act="continue"]').first().waitFor({ timeout: 45_000 })
  const resume = page.locator('[data-act="continue"]')
  if (await resume.count()) await resume.click()
  await page.locator('[data-screen="adventure"]').waitFor({ timeout: 45_000 })
  const bar = page.locator('#focus-bar:not([hidden])')
  const challenge = page.locator('[data-act="challenge"]')
  const opened = await bar.waitFor({ timeout: 8000 }).then(() => true, () => false)
  if (!opened) {
    await challenge.click()
    try {
      await bar.waitFor({ timeout: 15000 })
    } catch (err) {
      const text = await page.locator('#battle').innerText().catch(() => '')
      throw new Error(`${text.slice(0, 500)}\n${err}`)
    }
  }
}

async function assertRoadDock(page: Page): Promise<void> {
  const log = await box(page, '#battle-log')
  for (const speed of ['1', '2', '3']) {
    const button = await box(page, `[data-act="speed"][data-speed="${speed}"]`)
    expect(button && button.height, `×${speed}`).toBeGreaterThan(10)
    if (log && button) expect(overlaps(log, button), `log covers ×${speed}`).toBe(false)
  }
  const at = await box(page, '[data-act="speed"][data-speed="1"]')
  expect(at).toBeTruthy()
  const x = at!.x + at!.width / 2
  const y = at!.y + at!.height / 2
  const hit = await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y)
    return el?.closest('[data-act="speed"]')?.getAttribute('data-speed') ?? ''
  }, { x, y })
  expect(hit, 'tap on ×1').toBe('1')
  await page.touchscreen.tap(x, y)
}

async function assertNamesFree(page: Page): Promise<void> {
  await page.locator('#ally-name').waitFor()
  const names = ['#ally-name', '#foe-name', '#ally-hp-num', '#foe-hp-num']
  const covers = ['#battle-log', '#wx-chip', '#wx-announce', '#adv-chip']
  for (const name of names) {
    const area = await box(page, name)
    if (!area || area.width < 8 || area.height < 8) continue
    for (const cover of covers) {
      const node = page.locator(cover).first()
      if (await node.count() === 0) continue
      if (cover !== '#battle-log' && await node.getAttribute('hidden') !== null) continue
      const other = await node.boundingBox()
      if (!other || other.width < 4) continue
      expect(overlaps(area, other), `${cover} covers ${name}`).toBe(false)
    }
  }
}

async function assertClear(page: Page): Promise<void> {
  const bar = await box(page, '#focus-bar')
  const foeName = await box(page, '#foe-name')
  const foeHp = await box(page, '#foe-hp')
  const weather = await box(page, '#wx-chip')
  const banner = await box(page, '#name-banner')
  const log = await box(page, '#battle-log')
  expect(bar).toBeTruthy()
  if (bar && log && log.width > 2) expect(overlaps(bar, log), 'focus bar covers the battle log').toBe(false)
  if (bar && foeName && foeName.width > 2) expect(overlaps(bar, foeName), 'focus bar covers the foe name').toBe(false)
  if (bar && foeHp && foeHp.width > 2) expect(overlaps(bar, foeHp), 'focus bar covers the foe HP').toBe(false)
  if (weather && foeName && foeName.width > 2) expect(overlaps(weather, foeName), 'weather chip covers the foe name').toBe(false)
  if (weather && foeHp && foeHp.width > 2) expect(overlaps(weather, foeHp), 'weather chip covers the foe HP').toBe(false)
  for (const tempo of ['1', '2']) {
    const button = await box(page, `[data-act="focus-tempo"][data-tempo="${tempo}"]`)
    expect(button && button.width).toBeGreaterThan(20)
    if (button && banner && banner.width > 2) expect(overlaps(button, banner), `name banner covers ${tempo}x`).toBe(false)
  }
}

describe('focus bar tap', () => {
  let server: ViteDevServer | null = null
  beforeAll(async () => {
    if (!hasChrome) return
    server = await createServer({
      configFile: fileURLToPath(new URL('../../vite.config.ts', import.meta.url)),
      server: { host: '127.0.0.1', port: 5199, strictPort: true }
    })
    await server.listen()
  }, 30_000)
  afterAll(async () => { await server?.close() })

  it.skipIf(!hasChrome)('a real tap on the center of 2x changes the tempo at 390 and wider', async () => {
    if (!chrome) return
    const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--disable-gpu'] })
    try {
      for (const viewport of [{ width: 390, height: 844 }, { width: 900, height: 1200 }]) {
        const page = await browser.newPage({ viewport, hasTouch: true })
        const port = server?.config.server.port ?? 5173
        await reachGuardian(page, `http://127.0.0.1:${port}/?debug=1`)
        if (viewport.width === 390) {
          const client = await page.context().newCDPSession(page)
          await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })
          const gaps = await page.evaluate(() => new Promise<number[]>((resolve) => {
            const stamps: number[] = []
            let prev = performance.now()
            const step = (now: number) => {
              stamps.push(now - prev)
              prev = now
              if (stamps.length < 90) requestAnimationFrame(step)
              else resolve(stamps)
            }
            requestAnimationFrame(step)
          }))
          await client.send('Emulation.setCPUThrottlingRate', { rate: 1 })
          const fps = gaps.map((ms) => 1000 / Math.max(1, ms)).sort((a, b) => a - b)
          const low = fps[Math.max(0, Math.floor(fps.length * 0.05))]
          expect(low, `5% low ${low.toFixed(1)} fps`).toBeGreaterThanOrEqual(30)
        }
        await assertClear(page)
        await assertNamesFree(page)
        await page.locator('#battle-log').click()
        const sheet = page.locator('#battle-log-sheet:not([hidden])')
        await sheet.waitFor({ timeout: 5000 })
        const sheetBox = await box(page, '#battle-log-sheet')
        const foeActor = await box(page, '#foe-actor')
        const allyActor = await box(page, '#ally-actor')
        const challenge = await box(page, '[data-act="challenge"]')
        const tempo = await box(page, '[data-act="focus-tempo"][data-tempo="2"]')
        expect(sheetBox && sheetBox.height).toBeGreaterThan(40)
        const close = await box(page, '[data-act="log-close"]')
        expect(close && close.height, 'close button').toBeGreaterThan(10)
        const speed3 = await box(page, '[data-act="speed"][data-speed="3"]')
        if (sheetBox && speed3) expect(overlaps(sheetBox, speed3), 'sheet covers ×3').toBe(false)
        if (speed3) {
          const hit3 = await page.evaluate(({ x, y }) => {
            const el = document.elementFromPoint(x, y)
            return el?.closest('[data-act="speed"]')?.getAttribute('data-speed') ?? ''
          }, { x: speed3.x + speed3.width / 2, y: speed3.y + speed3.height / 2 })
          expect(hit3, 'tap on ×3').toBe('3')
        }
        if (close) await page.touchscreen.tap(close.x + close.width / 2, close.y + close.height / 2)
        await expect.poll(async () => page.locator('#battle-log-sheet').getAttribute('hidden')).not.toBeNull()
        await page.locator('#battle-log').click()
        if (sheetBox && foeActor && foeActor.height > 2) expect(overlaps(sheetBox, foeActor), 'log sheet covers the foe').toBe(false)
        if (sheetBox && allyActor && allyActor.height > 2) expect(overlaps(sheetBox, allyActor), 'log sheet covers the ally').toBe(false)
        if (sheetBox && challenge && challenge.width > 2) expect(overlaps(sheetBox, challenge), 'log sheet covers the challenge').toBe(false)
        if (sheetBox && tempo && tempo.width > 2) expect(overlaps(sheetBox, tempo), 'log sheet covers 2x').toBe(false)
        const floated = page.locator('.float-num')
        await expect.poll(async () => {
          const count = await floated.count()
          for (let i = 0; i < count; i++) {
            const text = (await floated.nth(i).textContent()) ?? ''
            if (/\d/.test(text) && await floated.nth(i).isVisible()) return text
          }
          return ''
        }, { timeout: 8000 }).not.toBe('')
        const button = page.locator('[data-act="focus-tempo"][data-tempo="2"]')
        const at = await button.boundingBox()
        expect(at).toBeTruthy()
        const x = at!.x + at!.width / 2
        const y = at!.y + at!.height / 2
        const hit = await page.evaluate(({ x, y }) => {
          const el = document.elementFromPoint(x, y)
          const act = el?.closest('[data-act]')
          return {
            tag: el?.tagName ?? '',
            act: act?.getAttribute('data-act') ?? '',
            tempo: act?.getAttribute('data-tempo') ?? ''
          }
        }, { x, y })
        expect(hit.act, `${viewport.width} hit ${hit.tag}`).toBe('focus-tempo')
        expect(hit.tempo).toBe('2')
        await page.touchscreen.tap(x, y)
        await expect.poll(async () => page.locator('[data-act="focus-tempo"][data-tempo="2"]').getAttribute('aria-pressed')).toBe('true')
        expect(await page.locator('#battle-log-sheet').getAttribute('hidden')).not.toBeNull()
        const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('velunor_v2') ?? '{}').settings?.tempoFokus)
        expect(stored).toBe(2)
        await page.close()
      }
    } finally {
      await browser.close()
    }
  }, 180_000)
})
