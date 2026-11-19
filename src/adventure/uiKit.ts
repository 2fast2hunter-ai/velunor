import { assetPath } from './const'

/** Skin files. A later skin replaces this map and nothing else. */
export const KIT_ART = {
  'badge-blue': { webp: 'ui_kit/webp/badge/blue.webp', png: 'ui_kit/badge/blue.png' },
  'badge-chip': { webp: 'ui_kit/webp/badge/chip.webp', png: 'ui_kit/badge/chip.png' },
  'badge-counter': { webp: 'ui_kit/webp/badge/counter.webp', png: 'ui_kit/badge/counter.png' },
  'badge-gold': { webp: 'ui_kit/webp/badge/gold.webp', png: 'ui_kit/badge/gold.png' },
  'badge-green': { webp: 'ui_kit/webp/badge/green.webp', png: 'ui_kit/badge/green.png' },
  'badge-red': { webp: 'ui_kit/webp/badge/red.webp', png: 'ui_kit/badge/red.png' },
  'bar-header': { webp: 'ui_kit/webp/bar/header.webp', png: 'ui_kit/bar/header.png' },
  'bar-hud-top': { webp: 'ui_kit/webp/bar/hud_top.webp', png: 'ui_kit/bar/hud_top.png' },
  'bar-tabbar': { webp: 'ui_kit/webp/bar/tabbar.webp', png: 'ui_kit/bar/tabbar.png' },
  'bg-pattern-night': { webp: 'ui_kit/webp/bg/pattern_night.webp', png: 'ui_kit/bg/pattern_night.png' },
  'bg-pattern-warm': { webp: 'ui_kit/webp/bg/pattern_warm.webp', png: 'ui_kit/bg/pattern_warm.png' },
  'button-close-normal': { webp: 'ui_kit/webp/button/close_normal.webp', png: 'ui_kit/button/close_normal.png' },
  'button-close-pressed': { webp: 'ui_kit/webp/button/close_pressed.webp', png: 'ui_kit/button/close_pressed.png' },
  'button-danger-disabled': { webp: 'ui_kit/webp/button/danger_disabled.webp', png: 'ui_kit/button/danger_disabled.png' },
  'button-danger-hover': { webp: 'ui_kit/webp/button/danger_hover.webp', png: 'ui_kit/button/danger_hover.png' },
  'button-danger-normal': { webp: 'ui_kit/webp/button/danger_normal.webp', png: 'ui_kit/button/danger_normal.png' },
  'button-danger-pressed': { webp: 'ui_kit/webp/button/danger_pressed.webp', png: 'ui_kit/button/danger_pressed.png' },
  'button-gold-disabled': { webp: 'ui_kit/webp/button/gold_disabled.webp', png: 'ui_kit/button/gold_disabled.png' },
  'button-gold-hover': { webp: 'ui_kit/webp/button/gold_hover.webp', png: 'ui_kit/button/gold_hover.png' },
  'button-gold-normal': { webp: 'ui_kit/webp/button/gold_normal.webp', png: 'ui_kit/button/gold_normal.png' },
  'button-gold-pressed': { webp: 'ui_kit/webp/button/gold_pressed.webp', png: 'ui_kit/button/gold_pressed.png' },
  'button-icon-normal': { webp: 'ui_kit/webp/button/icon_normal.webp', png: 'ui_kit/button/icon_normal.png' },
  'button-icon-pressed': { webp: 'ui_kit/webp/button/icon_pressed.webp', png: 'ui_kit/button/icon_pressed.png' },
  'button-primary-disabled': { webp: 'ui_kit/webp/button/primary_disabled.webp', png: 'ui_kit/button/primary_disabled.png' },
  'button-primary-hover': { webp: 'ui_kit/webp/button/primary_hover.webp', png: 'ui_kit/button/primary_hover.png' },
  'button-primary-normal': { webp: 'ui_kit/webp/button/primary_normal.webp', png: 'ui_kit/button/primary_normal.png' },
  'button-primary-pressed': { webp: 'ui_kit/webp/button/primary_pressed.webp', png: 'ui_kit/button/primary_pressed.png' },
  'button-secondary-disabled': { webp: 'ui_kit/webp/button/secondary_disabled.webp', png: 'ui_kit/button/secondary_disabled.png' },
  'button-secondary-hover': { webp: 'ui_kit/webp/button/secondary_hover.webp', png: 'ui_kit/button/secondary_hover.png' },
  'button-secondary-normal': { webp: 'ui_kit/webp/button/secondary_normal.webp', png: 'ui_kit/button/secondary_normal.png' },
  'button-secondary-pressed': { webp: 'ui_kit/webp/button/secondary_pressed.webp', png: 'ui_kit/button/secondary_pressed.png' },
  'control-check-off': { webp: 'ui_kit/webp/control/check_off.webp', png: 'ui_kit/control/check_off.png' },
  'control-check-on': { webp: 'ui_kit/webp/control/check_on.webp', png: 'ui_kit/control/check_on.png' },
  'control-slider-fill': { webp: 'ui_kit/webp/control/slider_fill.webp', png: 'ui_kit/control/slider_fill.png' },
  'control-slider-knob': { webp: 'ui_kit/webp/control/slider_knob.webp', png: 'ui_kit/control/slider_knob.png' },
  'control-slider-track': { webp: 'ui_kit/webp/control/slider_track.webp', png: 'ui_kit/control/slider_track.png' },
  'control-toggle-off': { webp: 'ui_kit/webp/control/toggle_off.webp', png: 'ui_kit/control/toggle_off.png' },
  'control-toggle-on': { webp: 'ui_kit/webp/control/toggle_on.webp', png: 'ui_kit/control/toggle_on.png' },
  'dialog-grab': { webp: 'ui_kit/webp/dialog/grab.webp', png: 'ui_kit/dialog/grab.png' },
  'dialog-head': { webp: 'ui_kit/webp/dialog/head.webp', png: 'ui_kit/dialog/head.png' },
  'mastery-ring-bronze': { webp: 'ui_kit/webp/mastery/ring_bronze.webp', png: 'ui_kit/mastery/ring_bronze.png' },
  'mastery-ring-gold': { webp: 'ui_kit/webp/mastery/ring_gold.webp', png: 'ui_kit/mastery/ring_gold.png' },
  'mastery-ring-silver': { webp: 'ui_kit/webp/mastery/ring_silver.webp', png: 'ui_kit/mastery/ring_silver.png' },
  'divider-line': { webp: 'ui_kit/webp/divider/line.webp', png: 'ui_kit/divider/line.png' },
  'divider-star': { webp: 'ui_kit/webp/divider/star.webp', png: 'ui_kit/divider/star.png' },
  'input-error': { webp: 'ui_kit/webp/input/error.webp', png: 'ui_kit/input/error.png' },
  'input-focus': { webp: 'ui_kit/webp/input/focus.webp', png: 'ui_kit/input/focus.png' },
  'input-normal': { webp: 'ui_kit/webp/input/normal.webp', png: 'ui_kit/input/normal.png' },
  'input-select-arrow': { webp: 'ui_kit/webp/input/select_arrow.webp', png: 'ui_kit/input/select_arrow.png' },
  'panel-base': { webp: 'ui_kit/webp/panel/base.webp', png: 'ui_kit/panel/base.png' },
  'panel-card': { webp: 'ui_kit/webp/panel/card.webp', png: 'ui_kit/panel/card.png' },
  'panel-dialog': { webp: 'ui_kit/webp/panel/dialog.webp', png: 'ui_kit/panel/dialog.png' },
  'panel-glass': { webp: 'ui_kit/webp/panel/glass.webp', png: 'ui_kit/panel/glass.png' },
  'panel-inset': { webp: 'ui_kit/webp/panel/inset.webp', png: 'ui_kit/panel/inset.png' },
  'panel-raised': { webp: 'ui_kit/webp/panel/raised.webp', png: 'ui_kit/panel/raised.png' },
  'panel-row': { webp: 'ui_kit/webp/panel/row.webp', png: 'ui_kit/panel/row.png' },
  'panel-row-alt': { webp: 'ui_kit/webp/panel/row_alt.webp', png: 'ui_kit/panel/row_alt.png' },
  'panel-row-selected': { webp: 'ui_kit/webp/panel/row_selected.webp', png: 'ui_kit/panel/row_selected.png' },
  'panel-tooltip': { webp: 'ui_kit/webp/panel/tooltip.webp', png: 'ui_kit/panel/tooltip.png' },
  'panel-tooltip-tail': { webp: 'ui_kit/webp/panel/tooltip_tail.webp', png: 'ui_kit/panel/tooltip_tail.png' },
  'progress-fill-blue': { webp: 'ui_kit/webp/progress/fill_blue.webp', png: 'ui_kit/progress/fill_blue.png' },
  'progress-fill-gold': { webp: 'ui_kit/webp/progress/fill_gold.webp', png: 'ui_kit/progress/fill_gold.png' },
  'progress-fill-green': { webp: 'ui_kit/webp/progress/fill_green.webp', png: 'ui_kit/progress/fill_green.png' },
  'progress-fill-purple': { webp: 'ui_kit/webp/progress/fill_purple.webp', png: 'ui_kit/progress/fill_purple.png' },
  'progress-fill-red': { webp: 'ui_kit/webp/progress/fill_red.webp', png: 'ui_kit/progress/fill_red.png' },
  'progress-track': { webp: 'ui_kit/webp/progress/track.webp', png: 'ui_kit/progress/track.png' },
  'scroll-thumb': { webp: 'ui_kit/webp/scroll/thumb.webp', png: 'ui_kit/scroll/thumb.png' },
  'starter-fire': { webp: 'ui_kit/webp/starter/starter_fire.webp', png: 'ui_kit/starter/starter_fire.png' },
  'starter-plant': { webp: 'ui_kit/webp/starter/starter_plant.webp', png: 'ui_kit/starter/starter_plant.png' },
  'starter-water': { webp: 'ui_kit/webp/starter/starter_water.webp', png: 'ui_kit/starter/starter_water.png' },
  'scroll-track': { webp: 'ui_kit/webp/scroll/track.webp', png: 'ui_kit/scroll/track.png' },
  'tab-active': { webp: 'ui_kit/webp/tab/active.webp', png: 'ui_kit/tab/active.png' },
  'tab-bar': { webp: 'ui_kit/webp/tab/bar.webp', png: 'ui_kit/tab/bar.png' },
  'tab-inactive': { webp: 'ui_kit/webp/tab/inactive.webp', png: 'ui_kit/tab/inactive.png' },
} as const

export type KitArtId = keyof typeof KIT_ART

/** Puts every kit image on the root as --kit-<id>, webp first, png if webp is missing. */
export function installKit(target: HTMLElement | null = typeof document === 'undefined' ? null : document.documentElement): void {
  if (!target) return
  const base = import.meta.env.BASE_URL || '/'
  for (const [id, file] of Object.entries(KIT_ART)) {
    const webp = assetPath(file.webp, base)
    const png = assetPath(file.png, base)
    target.style.setProperty(`--kit-${id}`, `image-set(url("${webp}") type("image/webp"), url("${png}") type("image/png"))`)
  }
}

