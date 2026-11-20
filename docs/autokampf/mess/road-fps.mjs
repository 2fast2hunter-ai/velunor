// Headless road fight at ×3, 390×844, CPU 4×. One sample.
// Prints the mean of the slowest 5% of animation frames. Target: ≥ 30 fps.
// A 30 Hz clock quantizes a true 30 fps frame to about 33.4 ms (29.9 fps),
// so the exit check allows 0.1 fps. The A10 target in the concept stays 30 fps.
// This single run is the acceptance check. The CI tap test takes the median
// of three samples so one wobble on the runner does not block the deploy.
// Run from the repo root: node docs/autokampf/mess/road-fps.mjs
import { createServer } from 'vite'
import { chromium } from 'playwright-core'
import { existsSync } from 'node:fs'

const chrome = ['/usr/local/bin/google-chrome', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'].find((path) => existsSync(path))
if (!chrome) throw new Error('Chrome fehlt')

const server = await createServer({ server: { host: '127.0.0.1', port: 5201, strictPort: true } })
await server.listen()
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--no-sandbox', '--disable-gpu'] })
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true })
  const port = server.config.server.port
  await page.goto(`http://127.0.0.1:${port}/?debug=1`, { waitUntil: 'domcontentloaded' })
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
  await page.locator('[data-act="speed"][data-speed="3"]').click()
  const client = await page.context().newCDPSession(page)
  await client.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.locator('.float-num').first().waitFor({ timeout: 20_000 })
  const gaps = await page.evaluate(() => new Promise((resolve) => {
    const stamps = []
    let prev = performance.now()
    const step = (now) => {
      stamps.push(now - prev)
      prev = now
      if (stamps.length < 150) requestAnimationFrame(step)
      else resolve(stamps)
    }
    requestAnimationFrame(step)
  }))
  const fps = gaps.map((ms) => 1000 / Math.max(1, ms)).sort((a, b) => a - b)
  const slow = fps.slice(0, Math.max(1, Math.ceil(fps.length * 0.05)))
  const low = slow.reduce((sum, n) => sum + n, 0) / slow.length
  const peak = Math.max(...gaps)
  console.log(JSON.stringify({ frames: gaps.length, lowFps: Number(low.toFixed(1)), peakMs: Number(peak.toFixed(1)) }))
  if (low < 30 - 0.1) process.exitCode = 1
} finally {
  await browser.close()
  await server.close()
}
