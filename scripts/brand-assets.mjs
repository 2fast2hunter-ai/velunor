import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import sharp from 'sharp'

const NIGHT = '#120e22'
const NIGHT_DARK = '#07060f'
const CREAM = '#f4efe4'
const GOLD = '#f0c14a'
const GOLD_DEEP = '#8a6a12'
const CRYSTAL = '#d7ecf7'
const INK = '#1c2744'

function chest(fill, lid, band, crystal) {
  return `
    <path d="M300 520c0-70 90-120 212-120s212 50 212 120v40H300z" fill="${lid}"/>
    <rect x="312" y="548" width="400" height="230" rx="36" fill="${fill}"/>
    <rect x="484" y="430" width="56" height="348" rx="12" fill="${band}"/>
    <path d="M512 250l92 168-92 70-92-70z" fill="${crystal}"/>
    <path d="M512 250l36 168-36 40z" fill="#ffffff" opacity="0.45"/>
  `
}

function iconForeground() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  ${chest(GOLD, '#ffe08a', GOLD_DEEP, CRYSTAL)}
</svg>`
}

function iconOnly() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${NIGHT}"/>
  ${chest(GOLD, '#ffe08a', GOLD_DEEP, CRYSTAL)}
</svg>`
}

function iconBackground() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${NIGHT}"/>
</svg>`
}

function splash(bg, fill, lid, band, crystal) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2732 2732">
  <rect width="2732" height="2732" fill="${bg}"/>
  <g transform="translate(854 854)">
    ${chest(fill, lid, band, crystal)}
  </g>
</svg>`
}

function feature() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 500">
  <rect width="1024" height="500" fill="${NIGHT}"/>
  <g transform="translate(40 40) scale(0.42)">
    ${chest(GOLD, '#ffe08a', GOLD_DEEP, CRYSTAL)}
  </g>
  <text x="520" y="230" fill="${CREAM}" font-family="sans-serif" font-size="92" font-weight="700">Velunor</text>
  <text x="520" y="300" fill="${GOLD}" font-family="sans-serif" font-size="36">Truhen, Team, Weg</text>
</svg>`
}

function frame(title, accent, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 2340">
  <rect width="1080" height="2340" fill="#0b1020"/>
  <rect x="70" y="80" width="940" height="2180" rx="64" fill="${NIGHT}"/>
  <text x="120" y="220" fill="${CREAM}" font-family="sans-serif" font-size="72" font-weight="700">${title}</text>
  <rect x="120" y="280" width="220" height="12" rx="6" fill="${accent}"/>
  ${body}
  <g fill="#24365f">
    <rect x="140" y="2080" width="120" height="72" rx="20"/>
    <rect x="300" y="2080" width="120" height="72" rx="20"/>
    <rect x="460" y="2080" width="160" height="72" rx="20" fill="${accent}"/>
    <rect x="660" y="2080" width="120" height="72" rx="20"/>
    <rect x="820" y="2080" width="120" height="72" rx="20"/>
  </g>
</svg>`
}

const frames = {
  abenteuer: frame('Abenteuer', GOLD, `
    <path d="M160 1680 C 360 900, 700 1100, 920 520" fill="none" stroke="${GOLD}" stroke-width="18" stroke-linecap="round"/>
    <circle cx="920" cy="520" r="28" fill="${CRYSTAL}"/>
    <rect x="160" y="1760" width="760" height="180" rx="28" fill="#1a2744"/>
  `),
  truhen: frame('Truhen', '#e7c56a', `
    <g transform="translate(180 700)">${chest(GOLD, '#ffe08a', GOLD_DEEP, CRYSTAL)}</g>
    <rect x="160" y="1500" width="220" height="220" rx="28" fill="#1a2744"/>
    <rect x="430" y="1500" width="220" height="220" rx="28" fill="#24365f"/>
    <rect x="700" y="1500" width="220" height="220" rx="28" fill="#1a2744"/>
  `),
  team: frame('Team', '#7eb6ff', `
    ${[0, 1, 2, 3, 4, 5].map((i) => {
      const x = 160 + (i % 3) * 280
      const y = 480 + Math.floor(i / 3) * 360
      return `<rect x="${x}" y="${y}" width="240" height="300" rx="32" fill="#1a2744"/>`
    }).join('')}
  `),
  kodex: frame('Kodex', '#7dcea0', `
    ${Array.from({ length: 12 }, (_, i) => {
      const x = 170 + (i % 4) * 220
      const y = 420 + Math.floor(i / 4) * 240
      return `<rect x="${x}" y="${y}" width="180" height="180" rx="28" fill="${i % 2 ? '#1a2744' : '#24365f'}"/>`
    }).join('')}
  `),
  baum: frame('Baum', '#c4b5fd', `
    ${[0, 1, 2].map((col) => [0, 1, 2, 3].map((row) => {
      const x = 180 + col * 280
      const y = 420 + row * 280
      return `<circle cx="${x + 80}" cy="${y + 80}" r="70" fill="${row === 0 ? '#c4b5fd' : '#1a2744'}"/>`
    }).join('')).join('')}
  `),
  expedition: frame('Expedition', '#7dcea0', `
    <path d="M200 1500h680" stroke="#8d6a43" stroke-width="16" stroke-linecap="round"/>
    <path d="M260 1500 V 700 h 280 l -70 120 70 120 H 260" fill="#7dcea0"/>
    <circle cx="760" cy="620" r="70" fill="${GOLD}"/>
    <rect x="160" y="1620" width="760" height="200" rx="28" fill="#1a2744"/>
  `)
}

async function writeSvgPng(svg, file, width, height) {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file.replace(/\.png$/, '.svg'), svg)
  await sharp(Buffer.from(svg)).resize(width, height).png().toFile(file)
}

// logo.png is what @capacitor/assets scales to the adaptive 432 layers.
// The named foreground and background live under quellen/, because a file
// named icon-foreground.png in assets/ makes the tool emit the legacy 192 size.
for (const stale of ['assets/icon-foreground.png', 'assets/icon-foreground.svg', 'assets/icon-background.png', 'assets/icon-background.svg']) {
  rmSync(stale, { force: true })
}

const jobs = [
  ['assets/logo.png', iconForeground(), 1024, 1024],
  ['assets/quellen/icon-foreground.png', iconForeground(), 1024, 1024],
  ['assets/quellen/icon-background.png', iconBackground(), 1024, 1024],
  ['assets/icon-only.png', iconOnly(), 1024, 1024],
  ['assets/splash.png', splash(NIGHT, GOLD, '#ffe08a', GOLD_DEEP, CRYSTAL), 2732, 2732],
  ['assets/splash-dark.png', splash(NIGHT_DARK, GOLD, '#ffe08a', GOLD_DEEP, CRYSTAL), 2732, 2732],
  ['assets/splash-light.png', splash(CREAM, INK, '#24365f', GOLD_DEEP, '#7eb6ff'), 2732, 2732],
  ['public/favicon-512.png', iconOnly(), 512, 512],
  ['store/entwuerfe/feature-1024x500.png', feature(), 1024, 500],
  ...Object.entries(frames).map(([name, svg]) => [`store/entwuerfe/rahmen-${name}.png`, svg, 1080, 2340])
]

for (const [file, svg, width, height] of jobs) {
  await writeSvgPng(svg, file, width, height)
  console.log(file, width, height)
}

writeFileSync('public/favicon.svg', `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="8" fill="${NIGHT}"/>
  <path d="M9 18c0-2.2 2.8-3.8 7-3.8s7 1.6 7 3.8v1H9z" fill="#ffe08a"/>
  <rect x="9.4" y="18.6" width="13.2" height="7.4" rx="1.4" fill="${GOLD}"/>
  <rect x="15" y="14.6" width="2" height="11.2" rx="0.4" fill="${GOLD_DEEP}"/>
  <path d="M16 8l3 5.4h-6z" fill="${CRYSTAL}"/>
</svg>`)
