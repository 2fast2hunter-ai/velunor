/** The native splash stays up until the game has painted, and never longer than this. */
export const SPLASH_MAX_MS = 3000
export const SPLASH_FADE_MS = 280

export function splashShouldHide(elapsedMs: number, ready: boolean, maxMs = SPLASH_MAX_MS): boolean {
  return ready || elapsedMs >= maxMs
}
