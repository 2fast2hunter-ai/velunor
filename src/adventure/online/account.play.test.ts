import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { beginAdventure } from '../save'

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

describe.skipIf(!hasChrome)('account forms keep what was typed', () => {
  it('sends the typed name, the report and the block', async () => {
    const port = await freePort()
    const server: ChildProcess = spawn(fileURLToPath(new URL('../../../node_modules/.bin/vite', import.meta.url)), ['--port', String(port), '--strictPort'], {
      cwd: fileURLToPath(new URL('../../../', import.meta.url)),
      stdio: 'pipe'
    })
    const calls: { url: string, body: string }[] = []
    let log = ''
    server.stderr?.on('data', (chunk) => { log += String(chunk) })
    server.stdout?.on('data', (chunk) => { log += String(chunk) })
    try {
      try {
        await waitForServer(`http://localhost:${port}/`)
      } catch (err) {
        throw new Error(`${err instanceof Error ? err.message : 'vite'} ${log}`)
      }
      const { chromium } = await import('playwright-core')
      const browser = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox', '--disable-gpu'], headless: true })
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
      const save = beginAdventure('Mira', { skin: 0, hair: 0, color: 0 }, 'm01', Date.now())
      await page.addInitScript((raw) => {
        localStorage.setItem('velunor_v2', raw)
        localStorage.setItem('velunor_lang', 'de')
        localStorage.setItem('velunor_consent', 'no')
      }, JSON.stringify(save))
      await page.route('**/*supabase.co/**', async (route) => {
        const request = route.request()
        calls.push({ url: request.url(), body: request.postData() ?? '' })
        const url = request.url()
        if (url.includes('/functions/v1/set-name')) {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ label: 'Mira#1111' }) })
          return
        }
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
        await route.fulfill({ status: 201, contentType: 'application/json', body: '[]' })
      })
      await page.goto(`http://localhost:${port}/`, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('[data-act="continue"]')
      await page.locator('[data-act="continue"]').click()
      await page.locator('[data-act="more"]').click()
      await page.locator('[data-screen="options"]').click()
      await page.locator('[data-act="name-open"]').click()
      await page.locator('#player-name').click()
      await page.keyboard.type('Mira')
      await page.locator('[data-act="name-save"]').click()
      await page.waitForFunction(() => document.body.innerText.includes('Mira#1111'))
      const named = calls.find((call) => call.url.includes('/functions/v1/set-name'))
      expect(named?.body).toContain('Mira')

      await page.locator('[data-act="report-open"]').click()
      await page.locator('#report-target').click()
      await page.keyboard.type('Mira#1111')
      await page.locator('[data-reason="beleidigend"]').click()
      await page.waitForTimeout(1000)
      const text = await page.locator('body').innerText()
      const urls = calls.map((call) => call.url).join('\n')
      if (!text.includes('Meldung ist raus.')) throw new Error(`${text.slice(0, 800)}\n---\n${urls}`)
      const report = calls.find((call) => call.url.includes('/rest/v1/reports'))
      expect(report?.body).toContain('Mira#1111')
      expect(report?.body).toContain('beleidigend')

      await page.locator('#player-target').click()
      await page.keyboard.type('Mira#2222')
      await page.locator('[data-act="block-player"]').click()
      await page.waitForFunction(() => document.body.innerText.includes('Blockiert'))
      const block = calls.find((call) => call.url.includes('/rest/v1/blocks'))
      expect(block?.body).toContain('Mira#2222')
      await browser.close()
    } finally {
      server.kill('SIGTERM')
    }
  }, 60_000)
})
