/** What is covering the game when the Android back key is pressed. */
export interface BackLayers {
  overlay: boolean
  more: boolean
  filters: boolean
  dex: boolean
  map: boolean
  side: boolean
}

export type BackEffect =
  | 'close-overlay'
  | 'close-more'
  | 'close-filters'
  | 'close-dex'
  | 'close-map'
  | 'close-side'
  | 'ask-quit'

/**
 * Sheets close first. Only a bare screen asks whether to leave the game.
 * The quit question is itself an overlay, so the next press dismisses it.
 */
export function backEffect(layers: BackLayers): BackEffect {
  if (layers.overlay) return 'close-overlay'
  if (layers.more) return 'close-more'
  if (layers.filters) return 'close-filters'
  if (layers.dex) return 'close-dex'
  if (layers.map) return 'close-map'
  if (layers.side) return 'close-side'
  return 'ask-quit'
}
