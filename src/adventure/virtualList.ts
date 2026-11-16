/** Portrait PC grid. Four columns, one row is the card plus the gap. */
export const PC_COLUMNS = 4
export const PC_ROW_H = 212
export const PC_OVERSCAN = 2
/** Used before the viewport has a measured height. */
export const PC_VIEW_FALLBACK = 880
/** Downward travel, in logical px, that closes a bottom sheet. */
export const SHEET_SWIPE = 80

export interface VirtualWindow {
  start: number
  end: number
  offset: number
  totalHeight: number
  rows: number
}

/**
 * The slice of a grid that should be in the DOM. `count` is items, not rows.
 * Scrolling inside a row keeps the same slice, so a fling does not rebuild
 * every pixel.
 */
export function virtualWindow(
  count: number,
  scrollTop: number,
  viewport: number,
  rowHeight = PC_ROW_H,
  columns = PC_COLUMNS,
  overscan = PC_OVERSCAN
): VirtualWindow {
  const safeCount = Math.max(0, Math.floor(count))
  const cols = Math.max(1, Math.floor(columns))
  const row = Math.max(1, rowHeight)
  const rows = Math.ceil(safeCount / cols)
  const totalHeight = rows * row
  const view = Math.max(row, viewport > 0 ? viewport : PC_VIEW_FALLBACK)
  const firstRow = Math.max(0, Math.floor(Math.max(0, scrollTop) / row) - overscan)
  const visibleRows = Math.ceil(view / row) + overscan * 2
  const lastRow = Math.min(rows, firstRow + visibleRows)
  const start = Math.min(safeCount, firstRow * cols)
  const end = Math.min(safeCount, lastRow * cols)
  return { start, end, offset: firstRow * row, totalHeight, rows }
}

/** `deltaY` is screen px. Scale is the FIT factor of the 1080×2340 stage. */
export function sheetShouldClose(deltaY: number, scale: number): boolean {
  const logical = deltaY / (scale > 0 ? scale : 1)
  return logical >= SHEET_SWIPE
}
