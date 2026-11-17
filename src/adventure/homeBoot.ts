/** Files the front door waits for. The bar uses this count, not a fake timer. */
export const HOME_ASSETS = [
  'home/keyart_1080.webp',
  'home/keyart_1080_lqip.jpg',
  'home/logo_velunor_light.png',
  'home/loading_logo.png',
  'home/loading_silhouette_1.png',
  'home/loading_silhouette_2.png',
  'home/loading_silhouette_3.png',
  'home/leaf_1.png',
  'home/leaf_2.png',
  'home/leaf_3.png',
  'home/light_dot.png'
] as const

/** Concept: the starter steps into the first fight, and a tap can skip it. */
export const FIRST_ENTRANCE_MS = 1500

/** home_fx.json: 8 leaves and 12 lights, never more than 20. Reduced motion draws none. */
export function homeParticlePlan(reduced: boolean): { leaves: number; lights: number; total: number } {
  if (reduced) return { leaves: 0, lights: 0, total: 0 }
  const leaves = 8
  const lights = 12
  return { leaves, lights, total: Math.min(20, leaves + lights) }
}

export function loadFraction(done: number, total: number): number {
  if (!(total > 0)) return 1
  return Math.max(0, Math.min(1, done / total))
}

export function mountHomeParticles(host: HTMLElement, reduced: boolean, src: (file: string) => string): void {
  host.replaceChildren()
  const plan = homeParticlePlan(reduced)
  for (let i = 0; i < plan.leaves; i += 1) {
    const img = document.createElement('img')
    img.className = 'home-leaf'
    img.alt = ''
    img.src = src(`home/leaf_${(i % 3) + 1}.png`)
    img.style.left = `${(i * 13) % 100}%`
    img.style.animationDuration = `${9 + (i % 6)}s`
    img.style.animationDelay = `${-i * 0.8}s`
    host.appendChild(img)
  }
  for (let i = 0; i < plan.lights; i += 1) {
    const img = document.createElement('img')
    img.className = 'home-light'
    img.alt = ''
    img.src = src('home/light_dot.png')
    img.style.left = `${(i * 8 + 4) % 100}%`
    img.style.bottom = `${(i * 7) % 55}%`
    img.style.animationDuration = `${4 + (i % 4)}s`
    img.style.animationDelay = `${-i * 0.4}s`
    host.appendChild(img)
  }
}
