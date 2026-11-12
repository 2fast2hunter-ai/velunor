import { readFileSync, writeFileSync } from 'node:fs'

const file = new URL('../data/regions.json', import.meta.url)
const data = JSON.parse(readFileSync(file, 'utf8'))

function roadIndex(regionId, chapterId) {
  return (regionId - 1) * 9 + chapterId
}

function formula(n) {
  return { levelMin: 6 * n - 4, levelMax: 6 * n, cap: 6 * n + 6 }
}

function mix(primary, extra) {
  const map = new Map()
  for (const row of primary) map.set(row.species, (map.get(row.species) ?? 0) + row.weight)
  for (const row of extra) if (!map.has(row.species)) map.set(row.species, row.weight)
  const entries = [...map.entries()]
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0) || 1
  const raw = entries.map(([species, weight]) => ({ species, weight: (weight / total) * 100 }))
  const scaled = raw.map((row) => ({ species: row.species, weight: Math.floor(row.weight) }))
  let left = 100 - scaled.reduce((sum, row) => sum + row.weight, 0)
  const order = raw
    .map((row, index) => ({ index, frac: row.weight - Math.floor(row.weight) }))
    .sort((a, b) => b.frac - a.frac)
  for (let n = 0; left > 0; n += 1) {
    scaled[order[n % order.length].index].weight += 1
    left -= 1
  }
  for (const row of scaled) {
    if (row.weight > 0) continue
    const donor = scaled.reduce((best, item) => (item.weight > best.weight ? item : best))
    donor.weight -= 1
    row.weight += 1
  }
  if (scaled.reduce((sum, row) => sum + row.weight, 0) !== 100) throw new Error('spawn weights must sum to 100')
  return scaled
}

for (const region of data.regions) {
  const roads = region.chapters.filter((chapter) => chapter.id >= 1 && chapter.id <= 8 && !chapter.council && !chapter.special)
  for (const chapter of roads) {
    const next = formula(roadIndex(region.id, chapter.id))
    chapter.levelMin = next.levelMin
    chapter.levelMax = next.levelMax
    chapter.cap = next.cap
    const levels = [next.cap - 5, next.cap - 4, next.cap - 2]
    chapter.guardian.team.forEach((mon, index) => {
      mon.level = levels[index]
    })
    chapter.guardian.factor = chapter.guardian.factor ?? 1
  }
  const chapter7 = roads.find((chapter) => chapter.id === 7)
  const chapter8 = roads.find((chapter) => chapter.id === 8)
  const council = region.chapters.find((chapter) => chapter.council)
  const special = region.chapters.find((chapter) => chapter.special)
  const cap8 = chapter8.cap
  const ratscap = cap8 + 6
  const foyer = {
    id: 9,
    name: 'Vorhof des Rates',
    scene: chapter8.scene,
    ...(chapter8.tint ? { tint: chapter8.tint } : {}),
    foyer: true,
    levelMin: cap8 - 2,
    levelMax: cap8 + 3,
    cap: ratscap,
    weather: chapter8.weather ?? [],
    guardian: { name: 'Ratstor', epithet: 'Eingang', badge: '', gold: 0, factor: 1, team: [] },
    day: mix(chapter8.day, chapter7.day),
    night: mix(chapter8.night, chapter7.night)
  }
  council.id = 10
  council.cap = ratscap
  council.levelMin = cap8 + 2
  council.levelMax = ratscap
  const aces = [2, 3, 4, 5, 6]
  council.council.members.forEach((member, index) => {
    const ace = cap8 + aces[index]
    member.cap = ratscap
    member.factor = member.factor ?? 1
    member.team.forEach((mon, slot) => {
      mon.level = ace - 2 + slot
    })
  })
  const grand = council.council.members[council.council.members.length - 1]
  council.guardian.team = grand.team.map((mon) => ({ species: mon.species, level: mon.level }))
  council.guardian.factor = council.guardian.factor ?? 1
  if (special) {
    special.id = 11
    special.levelMin = 276
    special.levelMax = 280
    special.cap = 280
    special.guardian.team.forEach((mon, index) => {
      mon.level = 278 + index
    })
    special.guardian.factor = 1
  }
  region.chapters = [...roads, foyer, council, ...(special ? [special] : [])]
}

writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`)
console.log('regions rewritten')
