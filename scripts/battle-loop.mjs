import { chromium } from 'playwright-core'

const chrome = process.env.CHROME_PATH || '/usr/local/bin/google-chrome'
const base = process.env.BATTLE_URL || 'http://127.0.0.1:5173/?debug=1'

async function readPulse(page) {
  return page.evaluate(() => {
    const chapter = document.querySelector('.chapter')?.textContent?.replace(/\s+/g, ' ') ?? ''
    const log = document.querySelector('#log')?.textContent?.replace(/\s+/g, ' ') ?? ''
    const overlay = document.querySelector('.overlay h2, .overlay .kicker')?.textContent ?? ''
    return `${chapter}|${log.slice(0, 120)}|${overlay}`
  })
}

async function startGame(page) {
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle' })
  await page.locator('[data-species="m01"]').click()
  await page.locator('[data-act="start"]').click()
  await page.locator('[data-screen="adventure"]').waitFor()
}

async function dismiss(page) {
  const close = page.locator('.overlay [data-act="close"]')
  if (await close.count()) await close.click()
}

async function setSpeed(page, speed) {
  await page.locator(`[data-act="speed"][data-speed="${speed}"]`).first().click()
}

async function countMoves(page, ms) {
  let last = await readPulse(page)
  let moves = 0
  const start = Date.now()
  while (Date.now() - start < ms) {
    await page.waitForTimeout(400)
    const next = await readPulse(page)
    if (next !== last) {
      moves += 1
      last = next
    }
  }
  return { moves, last }
}

async function run() {
  const browser = await chromium.launch({
    executablePath: chrome,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  })
  const results = []
  const errors = []
  try {
    const only = process.env.BATTLE_ONLY
    if (only !== 'jump') for (const viewport of [{ width: 1920, height: 1080 }, { width: 390, height: 844 }]) {
      for (const speed of [1, 2, 3]) {
        const page = await browser.newPage({ viewport })
        page.on('pageerror', (err) => errors.push(`${viewport.width}x${speed}: ${err.message}`))
        await startGame(page)
        await page.locator('[data-screen="options"]').click()
        const card = page.locator('[data-field="card"]')
        if (await card.isChecked()) await card.click()
        await page.locator('[data-screen="adventure"]').click()
        await setSpeed(page, speed)
        const wait = process.env.BATTLE_FAST === '1' ? 3500 : speed === 1 ? 9000 : speed === 2 ? 7000 : 6000
        const run = await countMoves(page, wait)
        results.push({ viewport: `${viewport.width}x${viewport.height}`, speed, moves: run.moves })
        if (run.moves < 2) throw new Error(`Loop stalled at ${viewport.width} ×${speed}: ${run.last}`)
        await page.close()
      }
    }

    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
    page.on('pageerror', (err) => errors.push(`dialog: ${err.message}`))
    await startGame(page)
    await setSpeed(page, 3)
    await page.locator('.overlay button[data-act="close"], .overlay').first().waitFor({ timeout: 20000 }).catch(() => {})
    const overlay = await page.locator('.overlay').count()
    if (overlay) {
      await page.locator('.overlay [data-act="close"]').click()
      const after = await countMoves(page, 4000)
      results.push({ viewport: '1920x1080', speed: 'catch-close', moves: after.moves })
      if (after.moves < 1) throw new Error('Loop did not resume after the catch card')
    } else results.push({ viewport: '1920x1080', speed: 'catch-close', moves: -1, note: 'no catch card in time' })

    await page.evaluate(() => {
      const proto = Document.prototype
      const desc = Object.getOwnPropertyDescriptor(proto, 'hidden')
      if (desc?.configurable) {
        Object.defineProperty(proto, 'hidden', { configurable: true, get: () => true })
      }
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.waitForTimeout(1500)
    await page.evaluate(() => {
      const proto = Document.prototype
      Object.defineProperty(proto, 'hidden', { configurable: true, get: () => false })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    const hiddenResume = await countMoves(page, 4000)
    results.push({ viewport: '1920x1080', speed: 'visibility', moves: hiddenResume.moves })

    await dismiss(page)
    await page.locator('[data-screen="options"]').click()
    const hasDebug = await page.locator('#debug-hours').count()
    if (!hasDebug) throw new Error('Debug jump is missing')
    await page.locator('#debug-hours').evaluate((el) => { el.value = '0.1' })
    await page.evaluate(() => document.querySelector('[data-act="jump"]')?.click())
    await page.locator('.overlay h2').waitFor({ timeout: 15000 })
    const title = await page.locator('.overlay h2').innerText()
    await page.locator('.overlay [data-act="close"]').click()
    await page.locator('[data-screen="adventure"]').click()
    const afterJump = await countMoves(page, 4000)
    results.push({ viewport: '1920x1080', speed: 'offline-welcome', moves: afterJump.moves, title })
    if (afterJump.moves < 1) throw new Error('Loop did not resume after the welcome dialog')

    await setSpeed(page, 3)
    await page.evaluate(() => {
      window.__raf = window.requestAnimationFrame.bind(window)
      window.requestAnimationFrame = () => 0
    })
    await page.waitForTimeout(8000)
    const recovered = await page.evaluate(() => document.querySelector('#log')?.textContent?.includes('Kampf neu aufgesetzt') ?? false)
    await page.evaluate(() => { window.requestAnimationFrame = window.__raf })
    const afterWatch = await countMoves(page, 4000)
    results.push({ viewport: '1920x1080', speed: 'watchdog', moves: afterWatch.moves, recovered })
    if (!recovered || afterWatch.moves < 1) throw new Error('Watchdog did not restart a stalled battle')
    await page.close()
  } finally {
    await browser.close()
  }
  console.log(JSON.stringify({ results, errors }, null, 2))
  if (errors.length) process.exitCode = 1
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
