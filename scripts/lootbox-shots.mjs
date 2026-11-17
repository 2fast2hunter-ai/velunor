import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'

const chrome = process.env.CHROME_PATH || '/usr/bin/google-chrome'
const base = process.env.BATTLE_URL || 'http://127.0.0.1:5173'
mkdirSync('docs/screens', { recursive: true })

async function shot(page, name) {
  await page.goto(`${base}/?debug=1&fx=${name}`, { waitUntil: 'networkidle' })
  await page.locator('[data-fx="hold"]').waitFor({ timeout: 15000 })
  await page.locator('#stage').screenshot({ path: `docs/screens/loot-${name}.png` })
}

const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--disable-gpu'] })
const page = await browser.newPage({ viewport: { width: 540, height: 1170 } })
const errors = []
page.on('pageerror', (err) => errors.push(err.message))
try {
  await shot(page, 'lager')
  await shot(page, 'raten')
  await shot(page, 'seal')
  if (errors.length) throw new Error(errors.join('\n'))
  console.log('loot screens saved')
} finally {
  await browser.close()
}
