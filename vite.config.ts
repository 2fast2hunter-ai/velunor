import { defineConfig } from 'vitest/config'

// GitHub Pages project site: https://<user>.github.io/velunor/
// Local `npm run dev` stays at the site root.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/velunor/' : '/',
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
