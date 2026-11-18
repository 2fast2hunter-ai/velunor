import { build } from 'esbuild'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const FUNCTIONS = ['sync-check', 'set-name', 'delete-account']
const EXTERNAL = ['https://esm.sh/@supabase/supabase-js@2.49.1']

export async function bundleSource(name) {
  const result = await build({
    absWorkingDir: root,
    entryPoints: [`supabase/functions/${name}/index.ts`],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    write: false,
    external: EXTERNAL,
    outfile: `supabase/functions/${name}/index.bundle.ts`
  })
  return result.outputFiles[0].text
}

export function bundlePath(name) {
  return resolve(root, `supabase/functions/${name}/index.bundle.ts`)
}

export async function bundlesAreCurrent() {
  for (const name of FUNCTIONS) {
    const fresh = await bundleSource(name)
    const committed = readFileSync(bundlePath(name), 'utf8')
    if (fresh !== committed) return false
  }
  return true
}

async function main() {
  const check = process.argv.includes('--check')
  if (check) {
    const current = await bundlesAreCurrent()
    if (!current) {
      console.error('Function bundles are stale. Run npm run build:functions.')
      process.exit(1)
    }
    return
  }
  for (const name of FUNCTIONS) {
    writeFileSync(bundlePath(name), await bundleSource(name))
    console.log(`supabase/functions/${name}/index.bundle.ts`)
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
