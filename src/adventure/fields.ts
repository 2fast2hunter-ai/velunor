const KEEP = new Set(['chat', 'guild-name', 'guild-tag', 'guild-query', 'guild-code', 'name', 'q', 'dex-q'])

/**
 * Text fields update in place. Rebuilding the screen from their change event
 * runs while the field blurs, replaces the button, and drops the first submit.
 */
export function fieldSkipsRender(field: string | undefined): boolean {
  if (!field) return true
  return KEEP.has(field)
}
