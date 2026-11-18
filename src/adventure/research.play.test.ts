import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { beginAdventure } from './save'

const chrome = process.env.CHROME_PATH || '/usr/bin/google-chrome'
const hasChrome = existsSync(chrome)

async function waitForServer(url: string): Promise<void> {
  const started = Date.now()
  while (Date.now() - started < 20_000) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      /* The server is still starting. */
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
  throw new Error('vite did not start')
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      const port = typeof address === 'object' && address ? address.port : 0
      probe.close(() => resolve(port))
    })
    probe.on('error', reject)
  })
}

describe.skipIf(!hasChrome)('research tower screen', () => {
  it('shows six lines and keeps a second study from starting', async () => {
    const port = await freePort()
    const server: ChildProcess = spawn(fileURLToPath(new URL('../../node_modules/.bin/vite', import.meta.url)), ['--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
      cwd: fileURLToPath(new URL('../../', import.meta.url)),
      stdio: 'ignore'
    })
    const save = beginAdventure('Mira', { skin: 0, hair: 0, color: 0 }, 'm01', Date.now())
    save.badges.push('Ratsiegel')
    save.gold = 40_000
    try {
      await waitForServer(`http://127.0.0.1:${port}/`)
      const { chromium } = await import('playwright-core')
      const browser = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox', '--disable-gpu'], headless: true })
      try {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
        const errors: string[] = []
        page.on('pageerror', (error) => errors.push(error.message))
        await page.addInitScript((raw) => {
          localStorage.setItem('velunor_v2', raw)
          localStorage.setItem('velunor_lang', 'de')
          localStorage.setItem('velunor_consent', 'no')
        }, JSON.stringify(save))
        await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' })
        await page.locator('[data-act="continue"]').click()
        await page.locator('[data-act="more"]').click()
        await page.locator('[data-screen="tower"]').click()
        await page.locator('[data-art="tower/screen"]').waitFor()
        for (const line of ['gold', 'ep', 'offline', 'expedition', 'egg', 'shard']) {
          expect(await page.locator(`[data-art="tower/${line}"]`).count()).toBeGreaterThan(0)
        }
        expect(await page.locator('[data-act="research-start"]').count()).toBe(6)
        await page.locator('[data-act="research-start"][data-id="gold"]').click()
        await page.locator('.tower-run').waitFor()
        expect(await page.locator('[data-act="research-start"]').count()).toBe(0)
        expect(errors).toEqual([])
      } finally {
        await browser.close()
      }
    } finally {
      server.kill('SIGTERM')
    }
  }, 30_000)
})
