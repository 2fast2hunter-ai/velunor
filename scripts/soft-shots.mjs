import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'

const phase = process.argv[2] === 'after' ? 'after' : 'before'
const chrome = process.env.CHROME_PATH || '/usr/bin/google-chrome'
const base = process.env.BATTLE_URL || 'http://127.0.0.1:5173'
mkdirSync('docs/screens', { recursive: true })

const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--disable-gpu'] })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('pageerror', (err) => errors.push(err.message))

async function shot(name) {
  await page.screenshot({ path: `docs/screens/soft-${phase}-${name}.png` })
  console.log(phase, name)
}

try {
  await page.goto(`${base}/?debug=1&fx=shop`, { waitUntil: 'networkidle' })
  await page.locator('[data-fx="hold"]').waitFor({ timeout: 15000 })
  await page.locator('[data-act="screen"][data-screen="adventure"]').click()
  await page.locator('#stage.is-adventure').waitFor()
  await page.waitForTimeout(400)
  await shot('abenteuer')
  await page.locator('[data-act="screen"][data-screen="team"]').click()
  await page.locator('#team-grid, .team-grid, .menu-screen').first().waitFor()
  await shot('team')
  await page.locator('[data-act="screen"][data-screen="codex"]').click()
  await page.waitForTimeout(200)
  await shot('kodex')
  await page.locator('[data-act="screen"][data-screen="activities"]').click()
  await page.waitForTimeout(200)
  await shot('aktivitaeten')
  await page.locator('[data-act="activity"][data-id="chests"]').click()
  await page.waitForTimeout(200)
  await shot('truhenlager')
  await page.locator('[data-act="more"]').click()
  await page.locator('[data-act="screen"][data-screen="shop"]').click()
  await page.locator('.shop-screen').waitFor()
  await page.locator('[data-act="shop-tab"][data-id="boost"]').click()
  await page.waitForTimeout(150)
  await shot('laden-staerkung')
  await page.locator('[data-act="shop-tab"][data-id="marks"]').click()
  await page.waitForTimeout(150)
  await shot('laden-marken')
  await page.locator('[data-act="more"]').click()
  await page.locator('[data-act="screen"][data-screen="achievements"]').click()
  await page.waitForTimeout(200)
  await shot('erfolge')
  await page.locator('[data-act="more"]').click()
  await page.locator('[data-act="screen"][data-screen="options"]').click()
  await page.waitForTimeout(200)
  await shot('optionen')
  await page.locator('[data-act="more"]').click()
  await page.locator('[data-act="screen"][data-screen="guide"]').click()
  await page.waitForTimeout(200)
  await shot('anleitung')
  if (errors.length) throw new Error(errors.join('\n'))
} finally {
  await browser.close()
}
