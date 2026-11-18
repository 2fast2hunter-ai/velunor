/** Delay before retry n, doubling from the base and stopping at the cap. */
export function backoffMs(attempt: number, base = 400, cap = 8_000): number {
  const step = Math.max(0, Math.floor(attempt))
  const delay = base * 2 ** step
  return Math.min(cap, delay)
}

export async function withBackoff<T>(
  run: () => Promise<T>,
  opts: {
    attempts: number
    retryable: (result: T) => boolean
    sleep?: (ms: number) => Promise<void>
    base?: number
    cap?: number
  }
): Promise<T> {
  const attempts = Math.max(1, Math.floor(opts.attempts))
  const sleep = opts.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
  let last = await run()
  for (let attempt = 0; attempt < attempts - 1 && opts.retryable(last); attempt++) {
    await sleep(backoffMs(attempt, opts.base, opts.cap))
    last = await run()
  }
  return last
}
