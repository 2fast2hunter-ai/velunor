import { chromium } from 'playwright-core'

const chrome = process.env.CHROME_PATH || '/usr/local/bin/google-chrome'
const base = process.env.BATTLE_URL || 'http://127.0.0.1:5173/?debug=1'

async function run() {
  const browser = await chromium.launch({
    executablePath: chrome,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  })
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  const errors = []
  page.on('pageerror', (err) => errors.push(err.message))
  try {
    await page.goto(base, { waitUntil: 'networkidle' })
    await page.evaluate(() => localStorage.clear())
    await page.reload({ waitUntil: 'networkidle' })
    await page.locator('[data-species="m01"]').click()
    await page.locator('[data-act="start"]').click()
    await page.locator('[data-screen="adventure"]').waitFor()
    const raw = await page.evaluate(() => localStorage.getItem('velunor_v2'))
    const save = JSON.parse(raw)
    save.step = 20
    save.hold = true
    save.loop = false
    save.challengeNow = false
    save.guardMark = 0
    save.guardWins = 0
    save.lastSeenAt = Date.now()
    save.settings.catchCard = false
    save.mons[save.team[0]].lvl = 12
    save.mons[save.team[0]].hp = null
    await page.addInitScript((stored) => {
      localStorage.setItem('velunor_v2', stored)
    }, JSON.stringify(save))
    await page.goto(base, { waitUntil: 'networkidle' })
    await page.locator('[data-screen="adventure"]').waitFor()
    await page.waitForFunction(() => {
      const log = document.querySelector('#log')?.textContent ?? ''
      return log.includes('stellt sich') || log.includes('steps up')
    }, null, { timeout: 15000 })
    if (errors.length) throw new Error(errors.join('\n'))
    console.log('guardian auto-start ok, no challenge click')
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
