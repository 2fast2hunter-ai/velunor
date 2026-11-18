import { defineConfig } from 'vitest/config'

// GitHub Pages project site: https://<user>.github.io/velunor/
// The Capacitor app is a file bundle, so its base is relative.
// Local `npm run dev` stays at the site root.
const base = process.env.CAPACITOR === '1' ? './' : process.env.GITHUB_ACTIONS ? '/velunor/' : '/'

export default defineConfig({
  base,
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  server: {
    port: 5173,
    strictPort: true
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts']
  }
})
