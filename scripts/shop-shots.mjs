import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'

const chrome = process.env.CHROME_PATH || '/usr/bin/google-chrome'
const base = process.env.BATTLE_URL || 'http://127.0.0.1:5173'
mkdirSync('docs/screens', { recursive: true })

const names = {
  shop: 'shop-chests',
  'shop-poor': 'shop-blocked',
  'shop-ask': 'shop-confirm'
}

const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--disable-gpu'] })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('pageerror', (err) => errors.push(err.message))
try {
  for (const [fx, file] of Object.entries(names)) {
    await page.goto(`${base}/?debug=1&fx=${fx}`, { waitUntil: 'networkidle' })
    await page.locator('[data-fx="hold"]').waitFor({ timeout: 15000 })
    await page.screenshot({ path: `docs/screens/${file}.png` })
  }
  if (errors.length) throw new Error(errors.join('\n'))
  console.log('shop screens saved')
} finally {
  await browser.close()
}
