/** Fixed pool. Fights reuse the same slots, so the object count cannot grow. */
export class FxPool {
  readonly capacity: number
  private readonly slots: { alive: boolean; x: number; y: number; vx: number; vy: number; life: number; color: string }[]
  highWater = 0

  constructor(capacity = 60) {
    this.capacity = capacity
    this.slots = Array.from({ length: capacity }, () => ({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, color: '#fff' }))
  }

  get allocated(): number {
    return this.slots.length
  }

  get live(): number {
    let count = 0
    for (const slot of this.slots) if (slot.alive) count += 1
    return count
  }

  acquire(n: number): number {
    let got = 0
    for (const slot of this.slots) {
      if (got >= n) break
      if (slot.alive) continue
      slot.alive = true
      slot.life = 1
      got += 1
    }
    this.highWater = Math.max(this.highWater, this.live)
    return got
  }

  releaseAll(): void {
    for (const slot of this.slots) slot.alive = false
  }

  step(): void {
    for (const slot of this.slots) {
      if (!slot.alive) continue
      slot.life -= 0.08
      slot.x += slot.vx
      slot.y += slot.vy
      if (slot.life <= 0) slot.alive = false
    }
  }
}
