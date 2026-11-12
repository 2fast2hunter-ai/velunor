import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'

const chrome = process.env.CHROME_PATH || '/usr/local/bin/google-chrome'
const base = process.env.BATTLE_URL || 'http://127.0.0.1:5173'
mkdirSync('docs/screens', { recursive: true })

async function shot(page, name) {
  await page.goto(`${base}/?debug=1&fx=${name}`, { waitUntil: 'networkidle' })
  await page.locator('[data-fx="hold"]').waitFor({ timeout: 15000 })
  await page.locator('#battle').screenshot({ path: `docs/screens/fx-${name}.png` })
}

async function run() {
  const browser = await chromium.launch({
    executablePath: chrome,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  })
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: 'docs/screens', size: { width: 1280, height: 720 } }
  })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))
  try {
    await shot(page, 'fire')
    await shot(page, 'crit')
    if (errors.length) throw new Error(errors.join('\n'))
    console.log('fx screens saved')
  } finally {
    await context.close()
    await browser.close()
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
