import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright-core'

const phase = process.argv[2] === 'after' ? 'after' : 'before'
const chrome = process.env.CHROME_PATH || '/usr/bin/google-chrome'
const base = process.env.BATTLE_URL || 'http://127.0.0.1:5173'
const sizes = [[360, 780], [390, 844], [430, 932]]
mkdirSync('docs/screens', { recursive: true })

const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--disable-gpu'] })
const errors = []
try {
  for (const [width, height] of sizes) {
    const page = await browser.newPage({ viewport: { width, height } })
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto(`${base}/?debug=1&fx=shop`, { waitUntil: 'networkidle' })
    await page.locator('[data-fx="hold"]').waitFor({ timeout: 15000 })
    await page.screenshot({ path: `docs/screens/nav-${phase}-shop-${width}x${height}.png` })
    const shopGap = await gap(page)
    await page.locator('[data-act="screen"][data-screen="adventure"]').click()
    await page.locator('#stage.is-adventure').waitFor({ timeout: 15000 })
    await page.screenshot({ path: `docs/screens/nav-${phase}-adventure-${width}x${height}.png` })
    const adventureGap = await gap(page)
    console.log(phase, `${width}x${height}`, { shopGap, adventureGap })
    await page.close()
  }
  if (errors.length) throw new Error(errors.join('\n'))
} finally {
  await browser.close()
}

async function gap(page) {
  return page.evaluate(() => {
    const bar = document.querySelector('.tabbar')
    const rect = bar.getBoundingClientRect()
    return Math.round((window.innerHeight - rect.bottom) * 10) / 10
  })
}
