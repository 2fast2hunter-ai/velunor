import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium, type Page } from 'playwright-core'
import { LUNGE_PX, LUNGE_SCALE } from '../battle/typeFx'
import { koPose } from '../battle/stage'
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

/** 30 fps is one 33.3 ms frame. A 30 Hz runner can report 29.985 fps for that frame, so the gate allows 0.1 fps (about 33.4 ms). The A10 target stays 30 fps. */
const FPS_FLOOR = 30 - 0.1

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
  await assertHintClearsChip(page)
  const challengePoint = await assertRoadDock(page)
  if (page.viewportSize()?.width === 390) await assertRoadFps(page)
  await page.touchscreen.tap(challengePoint.x, challengePoint.y)
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

async function roadLowFps(page: Page): Promise<number> {
  const gaps = await page.evaluate(() => new Promise<number[]>((resolve) => {
    const stamps: number[] = []
    let prev = performance.now()
    const step = (now: number) => {
      stamps.push(now - prev)
      prev = now
      if (stamps.length < 150) requestAnimationFrame(step)
      else resolve(stamps)
    }
    requestAnimationFrame(step)
  }))
  const fps = gaps.map((ms) => 1000 / Math.max(1, ms)).sort((a, b) => a - b)
  const slow = fps.slice(0, Math.max(1, Math.ceil(fps.length * 0.05)))
  return slow.reduce((sum, n) => sum + n, 0) / slow.length
}

async function assertRoadFps(page: Page): Promise<void> {
  await page.locator('[data-act="speed"][data-speed="3"]').click()
  const client = await page.context().newCDPSession(page)
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.locator('.float-num').first().waitFor({ timeout: 20_000 })
  const samples: number[] = []
  for (let i = 0; i < 3; i++) samples.push(await roadLowFps(page))
  await client.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  const ordered = [...samples].sort((a, b) => a - b)
  const median = ordered[1] ?? 0
  expect(median, `road ×3 median 5% low ${median.toFixed(3)} fps (${samples.map((n) => n.toFixed(3)).join(', ')})`).toBeGreaterThanOrEqual(FPS_FLOOR)
}

async function assertRoadDock(page: Page): Promise<{ x: number, y: number }> {
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
  for (const speed of ['2', '3']) {
    const button = await box(page, `[data-act="speed"][data-speed="${speed}"]`)
    expect(button && button.height).toBeGreaterThan(40)
    const top = await page.evaluate(({ x, y }) => {
      const el = document.elementFromPoint(x, y)
      return {
        act: el?.closest('[data-act="speed"]')?.getAttribute('data-speed') ?? '',
        pe: el ? getComputedStyle(el).pointerEvents : ''
      }
    }, { x: button!.x + button!.width / 2, y: button!.y + button!.height / 2 })
    expect(top.act, `first hit on ×${speed}`).toBe(speed)
    expect(top.pe, `×${speed} icon`).not.toBe('none')
  }
  await page.touchscreen.tap(x, y)
  await page.locator('.float-num').first().waitFor({ timeout: 20_000 })
  await page.locator('#battle-log').click()
  await page.locator('[data-act="log-close"]').waitFor({ timeout: 5000 })
  const close = await box(page, '[data-act="log-close"]')
  expect(close && close.height, 'close button').toBeGreaterThan(10)
  const speed3 = await box(page, '[data-act="speed"][data-speed="3"]')
  const sheet = await box(page, '#battle-log-sheet')
  if (sheet && speed3) expect(overlaps(sheet, speed3), 'sheet covers ×3').toBe(false)
  if (close) await page.touchscreen.tap(close.x + close.width / 2, close.y + close.height / 2)
  await expect.poll(async () => page.locator('#battle-log-sheet').getAttribute('hidden')).not.toBeNull()
  return assertChallengeTap(page)
}

async function assertHintClearsChip(page: Page): Promise<void> {
  await page.evaluate(() => {
    const chip = document.getElementById('adv-chip')
    if (chip) chip.hidden = false
  })
  const hint = await box(page, '#hint-bubble')
  const chip = await box(page, '#adv-chip')
  expect(hint && hint.height, 'tempo hint is on the road').toBeGreaterThan(40)
  expect(chip && chip.height, 'advantage chip is measurable').toBeGreaterThan(20)
  if (hint && chip) expect(overlaps(hint, chip), 'hint covers the advantage chip').toBe(false)
}

async function assertChallengeTap(page: Page): Promise<{ x: number, y: number }> {
  const button = page.locator('[data-act="challenge"]')
  await button.waitFor()
  await page.evaluate(() => {
    const line = document.getElementById('battle-log-text')
    if (line) line.textContent = 'Ein langer Kampfsatz mit Typ, Wetter und Status, der auf zwei Zeilen umbrechen muss, damit der Herausfordern-Knopf frei bleibt.'
  })
  const at = await button.boundingBox()
  expect(at && at.height).toBeGreaterThan(40)
  const log = await box(page, '#battle-log')
  const lower = { x: at!.x, y: at!.y + at!.height / 2, width: at!.width, height: at!.height / 2 }
  if (log && log.height > 2) expect(overlaps(log, lower), 'two-line log covers the lower half of the challenge').toBe(false)
  const dock = await box(page, '.guard-dock')
  const adv = await box(page, '#adv-chip')
  const tag = await box(page, '#wx-tag')
  if (dock && adv && adv.width > 4 && await page.locator('#adv-chip').getAttribute('hidden') === null) {
    expect(overlaps(dock, adv), 'advantage chip covers the warden card').toBe(false)
  }
  if (dock && tag && tag.width > 4 && await page.locator('#wx-tag').getAttribute('hidden') === null) {
    expect(overlaps(dock, tag), 'weather tag covers the warden card').toBe(false)
  }
  const x = at!.x + at!.width / 2
  const y = at!.y + at!.height * 0.75
  const hit = await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y)
    return el?.closest('[data-act="challenge"]') ? 'challenge' : (el?.id || el?.className || '')
  }, { x, y })
  expect(hit, 'lower half of the challenge').toBe('challenge')
  return { x, y }
}

async function assertNamesFree(page: Page): Promise<void> {
  await page.locator('#ally-name').waitFor()
  const names = ['#ally-name', '#foe-name', '#ally-hp-num', '#foe-hp-num']
  const covers = ['#battle-log', '#wx-chip', '#wx-announce', '#adv-chip', '#wx-tag']
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

function allyPose(kind: 'lunge' | 'ko'): string {
  if (kind === 'lunge') {
    const scale = 1.05 * 1.015 * LUNGE_SCALE
    return `translate(${LUNGE_PX}px, 3px) scale(${scale}) scaleX(-1)`
  }
  const pose = koPose(1)
  const scale = 1.05 * (1 - pose.rotate / 400)
  return `translate(0px, ${pose.drop}px) rotate(${pose.rotate}deg) scale(${scale}) scaleX(-1)`
}

async function assertPoseClear(page: Page, pose: string, motion: string): Promise<void> {
  const boxes = await page.evaluate((value) => {
    const sprite = document.getElementById('ally-sprite')
    if (sprite instanceof HTMLElement) sprite.style.transform = value
    const helper = document.getElementById('foe-helper')
    if (helper instanceof HTMLElement) helper.style.width = '220px'
    const read = (selector: string) => {
      const node = document.querySelector(selector)
      if (!(node instanceof HTMLElement)) return null
      const box = node.getBoundingClientRect()
      if (box.width < 2 || box.height < 2) return null
      return { x: box.x, y: box.y, width: box.width, height: box.height }
    }
    return {
      log: read('#battle-log'),
      ally: read('#ally-sprite'),
      foe: read('#foe-sprite'),
      shadow: read('#foe-actor .ground-shadow'),
      helper: read('#foe-helper')
    }
  }, motion)
  expect(boxes.log && boxes.log.width, pose).toBeGreaterThan(40)
  if (boxes.log && boxes.ally) expect(overlaps(boxes.log, boxes.ally), `${pose} log covers the ally`).toBe(false)
  if (boxes.log && boxes.foe) expect(overlaps(boxes.log, boxes.foe), `${pose} log covers the foe`).toBe(false)
  if (boxes.log && boxes.shadow) expect(overlaps(boxes.log, boxes.shadow), `${pose} log covers the foe shadow`).toBe(false)
  if (boxes.log && boxes.helper) expect(overlaps(boxes.log, boxes.helper), `${pose} log covers the foe support`).toBe(false)
}

async function assertClear(page: Page): Promise<void> {
  await page.locator('#foe-sprite:not([hidden])').waitFor({ timeout: 8_000 }).catch(() => undefined)
  const nameBefore = await box(page, '#foe-name')
  await page.evaluate(() => {
    const chip = document.getElementById('foe-status')
    if (!(chip instanceof HTMLElement)) return
    chip.hidden = false
    const label = chip.querySelector('.status-name')
    if (label) label.textContent = 'Brand'
    Object.defineProperty(chip, 'hidden', { configurable: true, get: () => false, set() { /* stay visible for the overlap check */ } })
  })
  const bar = await box(page, '#focus-bar')
  const foeName = await box(page, '#foe-name')
  const foeHp = await box(page, '#foe-hp')
  const weather = await box(page, '#wx-chip')
  const banner = await box(page, '#name-banner')
  const log = await box(page, '#battle-log')
  const allySprite = await box(page, '#ally-sprite')
  expect(bar).toBeTruthy()
  if (bar && log && log.width > 2) expect(overlaps(bar, log), 'focus bar covers the battle log').toBe(false)
  if (allySprite && allySprite.width > 8 && log && log.width > 2) expect(overlaps(allySprite, log), 'battle log covers the ally').toBe(false)
  const advantageEarly = await box(page, '#adv-chip')
  if (advantageEarly && advantageEarly.width > 4 && allySprite && allySprite.width > 8) {
    expect(overlaps(advantageEarly, allySprite), 'advantage chip covers the ally').toBe(false)
  }
  expect(await page.locator('#why-chip').getAttribute('hidden'), 'road reason chip stays in focus').not.toBeNull()
  await page.evaluate(() => {
    const text = document.getElementById('battle-log-text')
    if (!text) return
    text.innerHTML = '<span id="battle-log-lead">Kieselkrabbe: Panzerschale</span><span id="battle-log-tail"> – 148 (Krit) (KO)</span>'
  })
  const longLog = await box(page, '#battle-log')
  if (allySprite && allySprite.width > 8 && longLog && longLog.width > 2) expect(overlaps(allySprite, longLog), 'long log covers the ally').toBe(false)
  const foeSprite = await box(page, '#foe-sprite')
  const foeShadow = await box(page, '#foe-actor .ground-shadow')
  if (foeSprite && foeSprite.width > 8 && longLog && longLog.width > 2) expect(overlaps(foeSprite, longLog), 'long log covers the foe').toBe(false)
  if (foeShadow && foeShadow.width > 4 && longLog && longLog.width > 2) expect(overlaps(foeShadow, longLog), 'long log covers the foe shadow').toBe(false)
  const logFit = await page.evaluate(() => {
    const text = document.getElementById('battle-log-text')
    const tail = document.getElementById('battle-log-tail')
    const lead = document.getElementById('battle-log-lead')
    if (!(text instanceof HTMLElement) || !(tail instanceof HTMLElement)) return { damage: false, tailCut: true, lines: 9, leadCut: false }
    const lineHeight = parseFloat(getComputedStyle(text).lineHeight) || text.clientHeight || 1
    const lines = Math.max(1, Math.round(text.clientHeight / lineHeight))
    return {
      damage: (text.innerText || '').includes('148') && (text.innerText || '').includes('KO'),
      tailCut: tail.scrollWidth > tail.clientWidth + 1,
      lines,
      leadCut: lead instanceof HTMLElement && lead.scrollWidth > lead.clientWidth + 1
    }
  })
  expect(logFit.damage, 'focus log keeps the damage and KO').toBe(true)
  expect(logFit.tailCut, 'focus log cuts the damage').toBe(false)
  expect(logFit.lines, 'focus log stays within two lines').toBeLessThanOrEqual(2)
  expect(logFit.lines, 'focus log still has a line').toBeGreaterThanOrEqual(1)
  expect(logFit.leadCut, 'a long name is shortened before the damage').toBe(true)
  if (weather && weather.width > 4) {
    const callout = await box(page, '#battle-text')
    if (callout && callout.width > 8) expect(overlaps(callout, weather), 'status line covers the weather chip').toBe(false)
  }
  const allyName = await box(page, '#ally-name')
  const allyHp = await box(page, '#ally-hp-num')
  if (bar && allyName && allyName.width > 8) expect(overlaps(bar, allyName), 'focus bar covers the ally name').toBe(false)
  if (bar && allyHp && allyHp.width > 8) expect(overlaps(bar, allyHp), 'focus bar covers the ally HP').toBe(false)
  expect(await page.locator('.speed').isVisible(), 'road tempo hidden in focus').toBe(false)
  expect(await page.locator('[data-act="challenge"]').isVisible(), 'challenge hidden in focus').toBe(false)
  if (bar && foeName && foeName.width > 8 && foeName.height > 8) expect(overlaps(bar, foeName), 'focus bar covers the foe name').toBe(false)
  if (bar && foeHp && foeHp.width > 2) expect(overlaps(bar, foeHp), 'focus bar covers the foe HP').toBe(false)
  const foeHpNum = await box(page, '#foe-hp-num')
  if (bar && foeHpNum && foeHpNum.width > 8 && foeHpNum.height > 8) expect(overlaps(bar, foeHpNum), 'focus bar covers the foe HP number').toBe(false)
  await page.evaluate(() => {
    const helper = document.getElementById('foe-helper')
    const ally = document.querySelector<HTMLImageElement>('#ally-sprite')
    if (!(helper instanceof HTMLImageElement) || !ally) return
    helper.hidden = false
    helper.src = ally.currentSrc || ally.src
  })
  await page.waitForFunction(() => {
    const helper = document.getElementById('foe-helper')
    return helper instanceof HTMLImageElement && helper.naturalWidth > 8
  })
  const helper = await box(page, '#foe-helper')
  const advantage = await box(page, '#adv-chip')
  if (helper && helper.width > 8 && helper.height > 8 && longLog && longLog.width > 2) {
    expect(overlaps(longLog, helper), 'battle log covers the foe support').toBe(false)
  }
  if (advantage && advantage.width > 4 && helper && helper.width > 8 && helper.height > 8) {
    expect(overlaps(advantage, helper), 'advantage chip covers the foe support').toBe(false)
  }
  for (const kind of ['lunge', 'ko'] as const) await assertPoseClear(page, kind, allyPose(kind))
  if (advantage && advantage.width > 4 && foeHp && foeHp.width > 2) expect(overlaps(advantage, foeHp), 'advantage chip covers the foe HP bar').toBe(false)
  if (advantage && advantage.width > 4 && foeHpNum && foeHpNum.width > 8) expect(overlaps(advantage, foeHpNum), 'advantage chip covers the foe HP number').toBe(false)
  await page.evaluate(() => {
    const chip = document.getElementById('ally-status')
    if (!(chip instanceof HTMLElement)) return
    chip.hidden = false
    const label = chip.querySelector('.status-name')
    if (label) label.textContent = '−15 %'
  })
  const allyStatus = await box(page, '#ally-status')
  const allyLock = await box(page, '#ally-ult .ult-lock')
  if (allyStatus && allyStatus.width > 4 && allyLock && allyLock.width > 4) {
    expect(overlaps(allyStatus, allyLock), 'status chip covers ab Lv 25').toBe(false)
  }
  const status = await box(page, '#foe-status')
  if (nameBefore && foeName && nameBefore.height > 8 && foeName.height > 8) {
    expect(Math.abs(foeName.y - nameBefore.y), 'status chip pushes the foe name').toBeLessThan(4)
  }
  if (status && foeName && foeName.height > 8) expect(overlaps(status, foeName), 'status chip covers the foe name').toBe(false)
  if (status && foeHpNum && foeHpNum.width > 8) expect(overlaps(status, foeHpNum), 'status chip covers the foe HP number').toBe(false)
  const allyHpNum = await box(page, '#ally-hp-num')
  if (status && allyHpNum && allyHpNum.width > 8) expect(overlaps(status, allyHpNum), 'status chip covers the ally HP number').toBe(false)
  if (status && weather && weather.width > 4) expect(overlaps(status, weather), 'status chip covers the weather chip').toBe(false)
  await page.evaluate(() => {
    const node = document.getElementById('wx-announce')
    if (!(node instanceof HTMLElement)) return
    node.hidden = false
    node.textContent = 'Wind: Wind +15 %, Sound +5 %, Insect −10 %'
  })
  const announce = await box(page, '#wx-announce')
  if (announce && announce.width > 4 && foeName && foeName.width > 8 && foeName.height > 8) {
    expect(overlaps(announce, foeName), 'weather announcement covers the foe name').toBe(false)
  }
  if (announce && announce.width > 4 && allyName && allyName.width > 8 && allyName.height > 8) {
    expect(overlaps(announce, allyName), 'weather announcement covers the ally name').toBe(false)
  }
  if (announce && announce.width > 4 && allyHp && allyHp.width > 8) {
    expect(overlaps(announce, allyHp), 'weather announcement covers the ally HP').toBe(false)
  }
  await page.evaluate(() => {
    const node = document.getElementById('wx-announce')
    if (node instanceof HTMLElement) node.hidden = true
  })
  const spotlight = await box(page, '#spotlight-foe')
  if (bar && foeSprite && foeSprite.width > 8 && foeSprite.height > 8) expect(overlaps(bar, foeSprite), 'focus bar covers the foe').toBe(false)
  if (bar && spotlight && spotlight.width > 8 && spotlight.height > 8) expect(overlaps(bar, spotlight), 'focus bar covers the spotlight').toBe(false)
  const ring = await page.evaluate(() => new Promise<{ seen: number, drift: number }>((resolve) => {
    const start = performance.now()
    let seen = 0
    let drift = 0
    const tick = () => {
      const spot = document.getElementById('spotlight-foe')
      const sprite = document.getElementById('foe-sprite')
      if (spot instanceof HTMLElement && sprite instanceof HTMLElement && !spot.hidden) {
        const ringBox = spot.getBoundingClientRect()
        const body = sprite.getBoundingClientRect()
        if (ringBox.width > 8 && body.width > 8) {
          seen += 1
          drift = Math.max(drift, Math.abs((ringBox.x + ringBox.width / 2) - (body.x + body.width / 2)))
        }
      }
      if (performance.now() - start > 1800) resolve({ seen, drift })
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }))
  if (ring.seen > 0) expect(ring.drift, 'spotlight sits beside the foe').toBeLessThan(28)
  if (weather && foeName && foeName.width > 8 && foeName.height > 8) expect(overlaps(weather, foeName), 'weather chip covers the foe name').toBe(false)
  if (weather && foeHp && foeHp.width > 2) expect(overlaps(weather, foeHp), 'weather chip covers the foe HP').toBe(false)
  const callout = await box(page, '#battle-text')
  const allyActor = await box(page, '#ally-actor')
  if (callout && foeName && foeName.width > 2) expect(overlaps(callout, foeName), 'callout covers the foe name').toBe(false)
  if (callout && foeHp && foeHp.width > 2) expect(overlaps(callout, foeHp), 'callout covers the foe HP').toBe(false)
  if (bar && allyActor && allyActor.height > 2) expect(overlaps(bar, allyActor), 'focus bar covers the ally').toBe(false)
  const chrome = await page.evaluate(() => {
    const node = document.getElementById('battle-text')
    const bar = document.getElementById('ally-ult')
    const lock = bar?.querySelector('.ult-lock')
    const ready = bar?.querySelector('.ult-ready')
    return {
      image: node ? getComputedStyle(node).borderImageSource : '',
      locked: bar?.classList.contains('is-locked') ?? false,
      ready: bar?.classList.contains('is-ready') ?? false,
      lockHidden: lock instanceof HTMLElement ? lock.hidden : true,
      readyHidden: ready instanceof HTMLElement ? ready.hidden : true
    }
  })
  expect(chrome.image, 'callout frame').toContain('ansage')
  expect(chrome.lockHidden, 'ult lock hidden').toBe(!chrome.locked)
  expect(chrome.readyHidden, 'ult ready hidden').toBe(!chrome.ready)
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
          expect(low, `5% low ${low.toFixed(3)} fps`).toBeGreaterThanOrEqual(FPS_FLOOR)
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
        await page.mouse.move(x, y)
        await page.mouse.down()
        await page.mouse.move(x - 40, y)
        await page.mouse.up()
        expect(await page.locator('#focus-bar:not([hidden])').count(), 'a drifting tap stays in the fight').toBe(1)
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
  }, 240_000)

  it.skipIf(!hasChrome)('the why card comes back after Kampflog and the road walks again', async () => {
    if (!chrome) return
    const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--disable-gpu'] })
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true })
      const port = server?.config.server.port ?? 5173
      const base = `http://127.0.0.1:${port}/?debug=1`
      await page.goto(base, { waitUntil: 'domcontentloaded' })
      await page.evaluate(() => localStorage.clear())
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.locator('#hero-name, [data-act="consent"]').first().waitFor({ timeout: 45_000 })
      const consent = page.locator('[data-act="consent"][data-consent="no"]')
      if (await consent.count()) await consent.click()
      await page.locator('#hero-name').fill('Ada')
      await page.locator('[data-act="next"]').click()
      await page.locator('[data-act="pick"][data-species="m01"]').click()
      await page.locator('[data-act="start"]').click()
      await page.locator('[data-screen="adventure"]').waitFor()
      await page.locator('#why-chip:not([hidden])').waitFor({ timeout: 30_000 })
      await page.locator('#why-chip').click()
      await page.locator('[data-act="why-log"]').waitFor({ timeout: 20_000 })
      await page.locator('[data-act="why-log"]').click()
      await page.locator('.log-full [data-act="close"]').click()
      await page.locator('[data-act="why-next"]').waitFor({ timeout: 5_000 })
      await page.locator('[data-act="why-next"]').click()
      await expect.poll(async () => page.evaluate(() => Boolean(JSON.parse(localStorage.getItem('velunor_v2') ?? '{}').hold))).toBe(false)
      await expect.poll(async () => page.locator('#battle-text').innerText(), { timeout: 8_000 }).not.toContain('wartet')
      await page.close()
    } finally {
      await browser.close()
    }
  }, 90_000)

  it.skipIf(!hasChrome)('a two-turn road loss keeps the minimum duration before the spring tip', async () => {
    if (!chrome) return
    const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--disable-gpu'] })
    try {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true })
      const port = server?.config.server.port ?? 5173
      const base = `http://127.0.0.1:${port}/?debug=1`
      await page.goto(base, { waitUntil: 'domcontentloaded' })
      await page.evaluate(() => localStorage.clear())
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.locator('#hero-name, [data-act="consent"]').first().waitFor({ timeout: 45_000 })
      const consent = page.locator('[data-act="consent"][data-consent="no"]')
      if (await consent.count()) await consent.click()
      await page.locator('#hero-name').fill('Ada')
      await page.locator('[data-act="next"]').click()
      await page.locator('[data-act="pick"][data-species="m01"]').click()
      await page.locator('[data-act="start"]').click()
      await page.locator('[data-screen="adventure"]').waitFor()
      const raw = await page.evaluate(() => localStorage.getItem('velunor_v2'))
      const save = JSON.parse(raw ?? '{}')
      const mon = save.mons[save.team[0]]
      mon.species = 'm55'
      mon.lvl = 1
      mon.hp = 1
      save.settings.speed = 1
      save.settings.tempoWeg = 1
      save.hold = false
      await page.evaluate((stored) => {
        localStorage.setItem('velunor_v2', stored)
        const set = localStorage.setItem.bind(localStorage)
        localStorage.setItem = (key, value) => { if (key !== 'velunor_v2') set(key, value) }
      }, JSON.stringify(save))
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.locator('[data-screen="adventure"], [data-act="continue"]').first().waitFor({ timeout: 45_000 })
      if (await page.locator('[data-act="continue"]').count()) await page.locator('[data-act="continue"]').click()
      await page.locator('[data-screen="adventure"]').waitFor()
      const timed = await page.evaluate(() => new Promise<{ tip: number, next: number, lines: string[] }>((resolve) => {
        const foe = document.getElementById('foe-name')
        const log = document.getElementById('battle-log-text')
        const lines: string[] = []
        let name = ''
        let seen = ''
        let start = 0
        let tip = 0
        let done = false
        const begun = performance.now()
        const finish = (next: number) => {
          if (done) return
          done = true
          resolve({ tip, next, lines })
        }
        const stamp = () => {
          const now = performance.now()
          const next = (foe?.textContent || '').trim()
          if (next && next !== name) {
            const origin = Number(document.getElementById('battle')?.getAttribute('data-fight-at') || 0)
            const from = origin > 0 ? origin : start
            if (tip && from) finish(Math.round(now - from))
            name = next
            if (!tip) start = now
          }
          const line = (log?.textContent || '').replace(/\s+/g, ' ').trim()
          if (line && line !== seen) {
            seen = line
            lines.push(`${Math.round(now - (start || begun))}:${line.slice(0, 70)}`)
            const origin = Number(document.getElementById('battle')?.getAttribute('data-fight-at') || 0)
            const from = origin > 0 ? origin : start
            if (from && !tip && /Quelle|spring|Tempo schlägt|speed strikes/i.test(line)) tip = Math.round(now - from)
            else if (tip && from) finish(Math.round(now - from))
          }
          if (now - begun > 20_000) finish(tip)
        }
        const watch = new MutationObserver(stamp)
        if (foe) watch.observe(foe, { childList: true, characterData: true, subtree: true })
        if (log) watch.observe(log, { childList: true, characterData: true, subtree: true })
        const tick = () => {
          if (done) return
          stamp()
          if (!done) requestAnimationFrame(tick)
        }
        requestAnimationFrame(tick)
      }))
      expect(timed.tip, `loss tip before the minimum (${timed.lines.join(' | ')})`).toBeGreaterThanOrEqual(2_700)
      expect(timed.next, 'next fight before the minimum').toBeGreaterThanOrEqual(2_700)
      await page.close()
    } finally {
      await browser.close()
    }
  }, 50_000)
})
