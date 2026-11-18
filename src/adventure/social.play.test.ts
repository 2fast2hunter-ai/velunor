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

describe.skipIf(!hasChrome)('friends and the world beast', () => {
  it('shows Offline without a connection and the beast when the server answers', async () => {
    const port = await freePort()
    const server: ChildProcess = spawn(fileURLToPath(new URL('../../node_modules/.bin/vite', import.meta.url)), ['--port', String(port), '--strictPort'], {
      cwd: fileURLToPath(new URL('../../', import.meta.url)),
      stdio: 'pipe'
    })
    try {
      await waitForServer(`http://localhost:${port}/`)
      const { chromium } = await import('playwright-core')
      const browser = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox', '--disable-gpu'], headless: true })
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
      const save = beginAdventure('Mira', { skin: 0, hair: 0, color: 0 }, 'm01', Date.now())
      await page.addInitScript((raw) => {
        localStorage.setItem('velunor_v2', raw)
        localStorage.setItem('velunor_lang', 'de')
        localStorage.setItem('velunor_consent', 'no')
      }, JSON.stringify(save))
      await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('[data-act="continue"]')
      await page.locator('[data-act="continue"]').click()
      await page.locator('[data-act="more"]').click()
      await page.locator('[data-screen="social"]').click()
      await page.waitForFunction(() => document.body.innerText.includes('Offline'))
      expect(await page.locator('body').innerText()).toContain('Offline')

      const online = await browser.newPage({ viewport: { width: 390, height: 844 } })
      await online.addInitScript((raw) => {
        localStorage.setItem('velunor_v2', raw)
        localStorage.setItem('velunor_lang', 'de')
        localStorage.setItem('velunor_consent', 'no')
      }, JSON.stringify(save))
      await online.route('**/*supabase.co/**', async (route) => {
        const url = route.request().url()
        if (url.includes('/auth/v1/')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              access_token: 'test-access',
              token_type: 'bearer',
              expires_in: 3600,
              refresh_token: 'test-refresh',
              user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', is_anonymous: true }
            })
          })
          return
        }
        if (url.includes('/functions/v1/friends')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              status: 'ready',
              code: 'ABCD2345',
              showOnline: true,
              gifts: 0,
              friends: [{ code: 'HJKM6789', label: 'Ada#1234', region: 2, crests: 3, codex: 12, favorite: 'm01', presence: 'online' }],
              requests: []
            })
          })
          return
        }
        if (url.includes('/functions/v1/coop-boss')) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              status: 'ready',
              beast: 'himmelswal',
              name: 'Himmelswal',
              level: 5,
              hp: 4000,
              hpMax: 5000,
              attempts: 1,
              members: ['Mira'],
              eggChance: 0.02,
              reward: { gold: 0, fruit: 0, marks: 0 }
            })
          })
          return
        }
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
      })
      await online.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' })
      await online.waitForSelector('[data-act="continue"]')
      await online.locator('[data-act="continue"]').click()
      await online.locator('[data-act="more"]').click()
      await online.locator('[data-screen="social"]').click()
      await online.waitForFunction(() => document.body.innerText.includes('ABCD2345'))
      const text = await online.locator('body').innerText()
      expect(text).toContain('ABCD2345')
      expect(text).toContain('Himmelswal')
      expect(text).toContain('Ei-Chance 2 %')
      expect(await online.locator('[data-art="beasts/himmelswal"]').count()).toBe(1)
      await browser.close()
    } finally {
      server.kill('SIGTERM')
    }
  }, 60_000)
})
