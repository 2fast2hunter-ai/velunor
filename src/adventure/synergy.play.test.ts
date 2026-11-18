import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { beginAdventure, makeMon, takeId } from './save'

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

describe.skipIf(!hasChrome)('synergy team screen', () => {
  it('shows twelve symbols and keeps two, swapping when a third is chosen', async () => {
    const port = await freePort()
    const server: ChildProcess = spawn(fileURLToPath(new URL('../../node_modules/.bin/vite', import.meta.url)), ['--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
      cwd: fileURLToPath(new URL('../../', import.meta.url)),
      stdio: 'ignore'
    })
    const save = beginAdventure('Mira', { skin: 0, hair: 0, color: 0 }, 'm02', Date.now())
    for (const id of ['m51', 'm01', 'm41', 'm03', 'm04']) {
      const uid = takeId(save)
      save.mons[uid] = makeMon(id, 8, Date.now(), 'test')
      save.team.push(uid)
    }
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
        await page.locator('[data-screen="team"]').click()
        await page.locator('[data-art="synergy/board"]').waitFor()
        expect(await page.locator('.synergy-pick').count()).toBe(12)
        expect(await page.locator('[data-id="sturmlied"]').isDisabled()).toBe(true)
        const pressed = () => page.locator('.synergy-pick[aria-pressed="true"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-id')))
        expect(await pressed()).toEqual(['gewitter', 'wurzelgrund'])
        await page.locator('[data-id="flaechenbrand"]').click()
        expect(await pressed()).toEqual(['flaechenbrand', 'wurzelgrund'])
        await page.locator('[data-act="synergy-auto"]').click()
        expect(await pressed()).toEqual(['gewitter', 'wurzelgrund'])
        expect(errors).toEqual([])
      } finally {
        await browser.close()
      }
    } finally {
      server.kill('SIGTERM')
    }
  }, 30_000)
})
