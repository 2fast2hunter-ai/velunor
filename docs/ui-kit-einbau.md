---
datum: 2026-11-19
quelle: Smettbo · Velunor Paket 9 UI-Kit (Auftrag Fabian-Noel 19.11. 11:08 über Evoli)
status: Kit geliefert, Einbau offen (PR A–E über Porygon, Prüfung Magnetilo)
---

# Einbau UI-Kit (Paket 9)

**Dateien:** `assets/ui_kit/**.png` und dazu `assets/ui_kit/webp/**.webp` (verlustfrei, gleiche Maße). Ins Repo kommen sie nach `public/assets/ui_kit/`. Die Maschinen-Beschreibung liegt in `assets/ui_kit/ui_kit.json` (Datei, Größe, Art, Slice-Ränder, Outset, Verwendung, Textfarbe). Die Vorschau ist `assets/preview_ui_kit.jpg`, die Flächenliste `ui-paket9-liste.md`.

**Maße:** Alles ist **@1x in UI-px** des 1080er-Rasters (`#stage` 1080×2340, verkleinert per `--ui-scale`). Die Slice-Werte in px gehören deshalb **1:1** in `border-image-width`. Nichts umrechnen, es ist keine @2x-Logik nötig (1 UI-px ≈ 1 Gerätepixel bei 390 css-px × DPR 3).

**Outset:** In die Bilder ist der weiche Schatten bereits eingezeichnet, deshalb hat jedes Teil einen transparenten Rand. Diesen Rand gleicht `border-image-outset` aus, damit die Kontur genau auf der Box sitzt. `box-shadow` muss dann weg.

**Textfarben:**
- Auf hellen Flächen (Grund, Erhaben, Eingelassen, Dialog, Karte, Zeile, Chip, Eingabe, Tab aktiv) ist der Text `#4a2c17`.
- Auf Holz, Blau, Grün, Rot, Gold und Glas ist er `#fff3dc` bzw. `#fff` mit Kontur `paint-order: stroke; -webkit-text-stroke: 5px #4a2c17` (Fallback `text-shadow` in 8 Richtungen, 3px).
- Die Schrift Fredoka (OFL) ist schon im Projekt (`raw_src/battle/Fredoka-*`). Für Knöpfe und Köpfe passt sie besser als Nunito: `font-family: Fredoka, Nunito, sans-serif; font-weight: 600`.

## Teile

| Datei | Größe | Art | Slice o r u l | Outset | Verwendung |
|---|---|---|---|---|---|
| `panel/base.png` | 192×192 | 9slice | 64 64 64 64 | 16 | Grundfläche: Inhaltsblöcke, Listen-Container (.card) |
| `panel/raised.png` | 192×192 | 9slice | 64 64 64 64 | 16 | Erhabene Fläche: Kacheln, Gruppen, Aktivitäts-Kacheln (.chest-tile, .side-card) |
| `panel/inset.png` | 192×192 | 9slice | 64 64 64 64 | 16 | Eingelassene Fläche: Werte-Felder, Slots, Log, Statistik-Kästen (.log, .stat) |
| `panel/dialog.png` | 192×192 | 9slice | 72 72 72 72 | 16 | Dialog/Sheet-Körper mit Goldband (.sheet, .more-sheet, .map-sheet) |
| `panel/card.png` | 192×192 | 9slice | 72 72 72 72 | 16 | Karte: Monster-, Angebots-, Erfolgs-Karte (.mon-card, .shop-card-Inhalt) |
| `panel/glass.png` | 192×192 | 9slice | 64 64 64 64 | 16 | Dunkle Glas-Fläche über Szenen: Kampf-HUD, Log über Bild, Chips (.wx-chip, .battle .log) |
| `panel/row.png` | 256×112 | 9slice | 44 48 50 48 | 10 | Listen-Zeile (Ranglisten, Freunde, Chat, Gilde, Truhenquote) |
| `panel/row_selected.png` | 256×112 | 9slice | 44 48 50 48 | 10 | Gewählte/eigene Zeile (eigener Rang, gewähltes Monster) |
| `panel/row_alt.png` | 256×112 | 9slice | 44 48 50 48 | 10 | Zweite Zeilenfarbe (Zebra) |
| `bar/header.png` | 256×160 | 9slice | 56 60 64 60 | 12 | Leiste/Header: Screen-Titel, Kapitel-Leiste (.chapter, .screen-head, h2-Leisten) |
| `bar/hud_top.png` | 256×160 | 9slice | 24 64 72 64 | – | Obere HUD-Leiste, unten abgerundet (.hud) |
| `bar/tabbar.png` | 256×160 | 9slice | 72 64 24 64 | – | Untere Tab-Leiste, oben abgerundet (.tabbar) |
| `panel/tooltip.png` | 192×128 | 9slice | 44 44 48 44 | 12 | Tooltip/Hinweisblase (.hint, .shop-toast, Info-Popover); Text #fff3dc |
| `panel/tooltip_tail.png` | 56×36 | image | – | – | Spitze unter dem Tooltip (zentriert, ::after) |
| `button/primary_normal.png` | 256×168 | 9slice | 60 64 70 64 | 12 | Button primary – normal |
| `button/primary_hover.png` | 256×168 | 9slice | 60 64 70 64 | 12 | Button primary – hover |
| `button/primary_pressed.png` | 256×168 | 9slice | 60 64 70 64 | 12 | Button primary – pressed |
| `button/primary_disabled.png` | 256×168 | 9slice | 60 64 70 64 | 12 | Button primary – disabled |
| `button/secondary_normal.png` | 256×168 | 9slice | 60 64 70 64 | 12 | Button secondary – normal |
| `button/secondary_hover.png` | 256×168 | 9slice | 60 64 70 64 | 12 | Button secondary – hover |
| `button/secondary_pressed.png` | 256×168 | 9slice | 60 64 70 64 | 12 | Button secondary – pressed |
| `button/secondary_disabled.png` | 256×168 | 9slice | 60 64 70 64 | 12 | Button secondary – disabled |
| `button/danger_normal.png` | 256×168 | 9slice | 60 64 70 64 | 12 | Button danger – normal |
| `button/danger_hover.png` | 256×168 | 9slice | 60 64 70 64 | 12 | Button danger – hover |
| `button/danger_pressed.png` | 256×168 | 9slice | 60 64 70 64 | 12 | Button danger – pressed |
| `button/danger_disabled.png` | 256×168 | 9slice | 60 64 70 64 | 12 | Button danger – disabled |
| `button/gold_normal.png` | 256×168 | 9slice | 60 64 70 64 | 12 | Button gold – normal |
| `button/gold_hover.png` | 256×168 | 9slice | 60 64 70 64 | 12 | Button gold – hover |
| `button/gold_pressed.png` | 256×168 | 9slice | 60 64 70 64 | 12 | Button gold – pressed |
| `button/gold_disabled.png` | 256×168 | 9slice | 60 64 70 64 | 12 | Button gold – disabled |
| `button/close_normal.png` | 128×128 | image | – | – | Schließen-Knopf (Dialog-Kopf, [data-act=close]) |
| `button/icon_normal.png` | 128×128 | image | – | – | Runder Icon-Knopf (Speed, Filter, Sprache, Log); Icon 64px mittig |
| `button/close_pressed.png` | 128×128 | image | – | – | Schließen-Knopf (Dialog-Kopf, [data-act=close]) |
| `button/icon_pressed.png` | 128×128 | image | – | – | Runder Icon-Knopf (Speed, Filter, Sprache, Log); Icon 64px mittig |
| `tab/active.png` | 240×136 | 9slice | 56 56 24 56 | – | Tab active (.tab, .shop-tabs button, Ranglisten-/Chat-/Aktivitäten-Tabs) |
| `tab/inactive.png` | 240×136 | 9slice | 56 56 24 56 | – | Tab inactive (.tab, .shop-tabs button, Ranglisten-/Chat-/Aktivitäten-Tabs) |
| `tab/bar.png` | 256×128 | 9slice | 24 16 24 16 | – | Tab-Leiste hinter den Tabs (Hintergrund der Tab-Zeile) |
| `badge/red.png` | 72×72 | 9slice | 36 30 36 30 | – | Badge/Zähler red (Neu-Punkt, Anzahl; dehnt sich zur Pille) |
| `badge/gold.png` | 72×72 | 9slice | 36 30 36 30 | – | Badge/Zähler gold (Neu-Punkt, Anzahl; dehnt sich zur Pille) |
| `badge/green.png` | 72×72 | 9slice | 36 30 36 30 | – | Badge/Zähler green (Neu-Punkt, Anzahl; dehnt sich zur Pille) |
| `badge/blue.png` | 72×72 | 9slice | 36 30 36 30 | – | Badge/Zähler blue (Neu-Punkt, Anzahl; dehnt sich zur Pille) |
| `badge/counter.png` | 160×80 | 9slice | 36 40 40 40 | 6 | Zähler-Pille dunkel (Gold, Marken, Kodex 12/100, Wallet) |
| `badge/chip.png` | 160×80 | 9slice | 36 40 40 40 | 6 | Chip hell (Typ-Chip, Filter-Chip, Wetter-Chip im Menü) |
| `input/normal.png` | 256×136 | 9slice | 52 52 52 52 | – | Eingabefeld normal (input, select, textarea; Chat, Name, Gildensuche) |
| `input/focus.png` | 256×136 | 9slice | 52 52 52 52 | – | Eingabefeld focus (input, select, textarea; Chat, Name, Gildensuche) |
| `input/error.png` | 256×136 | 9slice | 52 52 52 52 | – | Eingabefeld error (input, select, textarea; Chat, Name, Gildensuche) |
| `input/select_arrow.png` | 64×64 | image | – | – | Pfeil für select (rechts im Feld) |
| `control/slider_track.png` | 256×56 | 3slice | 28 28 28 28 | – | Schieberegler-Bahn (input[type=range] Lautstärke, Schriftgröße, Mengen) |
| `control/slider_fill.png` | 256×56 | 3slice | 28 28 28 28 | – | Gefüllter Teil der Bahn |
| `control/slider_knob.png` | 80×96 | image | – | – | Regler-Griff (::-webkit-slider-thumb / ::-moz-range-thumb) |
| `control/toggle_off.png` | 144×88 | image | – | – | Schalter off (Einstellungen: Ton, Animationen, Benachrichtigung) |
| `control/toggle_on.png` | 144×88 | image | – | – | Schalter on (Einstellungen: Ton, Animationen, Benachrichtigung) |
| `control/check_off.png` | 88×88 | image | – | – | Checkbox off (Zustimmung, Filter, Auto-Synergie) |
| `control/check_on.png` | 88×88 | image | – | – | Checkbox on (Zustimmung, Filter, Auto-Synergie) |
| `progress/track.png` | 256×56 | 3slice | 28 28 28 28 | – | Fortschritts-Bahn (.progress-track, HP-Balken, EP, Kapitel, Expedition) |
| `progress/fill_green.png` | 256×40 | 3slice | 20 20 20 20 | – | Füllung green (in Bahn mit 8px Innenabstand) |
| `progress/fill_gold.png` | 256×40 | 3slice | 20 20 20 20 | – | Füllung gold (in Bahn mit 8px Innenabstand) |
| `progress/fill_blue.png` | 256×40 | 3slice | 20 20 20 20 | – | Füllung blue (in Bahn mit 8px Innenabstand) |
| `progress/fill_red.png` | 256×40 | 3slice | 20 20 20 20 | – | Füllung red (in Bahn mit 8px Innenabstand) |
| `progress/fill_purple.png` | 256×40 | 3slice | 20 20 20 20 | – | Füllung purple (in Bahn mit 8px Innenabstand) |
| `divider/line.png` | 512×32 | 3slice | 0 32 0 32 | – | Trenner horizontal (hr, Abschnitts-Trennung in Sheets/Listen) |
| `divider/star.png` | 64×64 | image | – | – | Ziermitte für den Trenner (optional, ::after zentriert) |
| `scroll/track.png` | 32×128 | 3slice | 16 0 16 0 | – | Scrollbar-Bahn vertikal (::-webkit-scrollbar-track) |
| `scroll/thumb.png` | 32×128 | 3slice | 16 0 16 0 | – | Scrollbar-Griff (::-webkit-scrollbar-thumb) |
| `dialog/head.png` | 512×152 | 9slice | 76 80 76 80 | 14 | Dialog-Kopf (Titelband oben im Sheet, feste Höhe 152 – dehnt nur in der Breite; Schließen-Knopf rechts) |
| `dialog/grab.png` | 128×48 | image | – | – | Zieh-Griff oben im Sheet (.sheet-grab .sheet-handle) |
| `bg/pattern_night.png` | 512×512 | tile | – | – | Bildschirm-Hintergrund Menüs (#stage, .menu-scroll) – nahtlos kachelbar |
| `bg/pattern_warm.png` | 512×512 | tile | – | – | Innen-Muster für Dialoge/Laden-Kopf (optional als background-image auf .sheet-body) |

Die Art sagt, wie ein Teil gedehnt wird:
- **9slice** dehnt in Breite und Höhe.
- **3slice** dehnt nur in der Länge. Die Höhe bleibt fest oder wird über `border-image-width` angepasst, siehe Balken.
- **image** ist ein festes Bild, ein Icon oder ein Griff.
- **tile** wird gekachelt (`background-repeat: repeat`).

## Beispiel-CSS (in `adventure.css`, PR A)

```css
:root {
  --kit: url('/assets/ui_kit/webp/');           /* nur als Hinweis; Pfade unten über art()/Vite-Base auflösen */
  --ink: #4a2c17; --ink-light: #fff3dc;
}

/* Hintergrund statt #10182e */
#stage, .band, .home { background: #1c2447 url('/assets/ui_kit/webp/bg/pattern_night.webp') repeat; background-size: 512px; }

/* 1) Fläche Grund (.card) – Kontur sitzt genau auf der Box */
.card {
  background: none; border: 64px solid transparent; box-shadow: none;
  border-image: url('/assets/ui_kit/webp/panel/base.webp') 64 fill / 64px / 16px stretch;
  padding: 0;                     /* Innenabstand jetzt über border-width; bei Bedarf kleinere Breite: */
  color: var(--ink);
}
/* Wer weniger Rand will: border-width ≠ border-image-width, z. B. */
.card.tight { border-width: 28px; border-image-width: 64px; }   /* Rahmen bleibt gleich dick, Inhalt rückt näher */

/* Varianten */
.chest-tile, .side-card, .daily-day, .tower-floor { border-image-source: url('/assets/ui_kit/webp/panel/raised.webp'); }
.stat, .reel, .tree-detail, .mon-card.slot, .look-preview, .trade-escrow {
  border: 28px solid transparent; border-image: url('/assets/ui_kit/webp/panel/inset.webp') 64 fill / 64px / 16px stretch; background: none; }
.mon-card, .starter-card, .continue-card, .expedition-card, .trade-card, .arena-card, .beast-card {
  border: 36px solid transparent; border-image: url('/assets/ui_kit/webp/panel/card.webp') 72 fill / 72px / 16px stretch; background: none; }
.wx-chip, .battle-status, .victory, .name-banner, .guard-card, .mech-row, .boss-intro, .move-banner {
  border: 24px solid transparent; border-image: url('/assets/ui_kit/webp/panel/glass.webp') 64 fill / 64px / 16px stretch;
  background: none; color: var(--ink-light); }

/* 2) Sheets / Dialoge */
.sheet, .modal, .more-sheet, .map-sheet, .lang-sheet, .filter-body {
  background: none; border: 40px solid transparent; border-bottom-width: 0; box-shadow: none;
  border-image: url('/assets/ui_kit/webp/panel/dialog.webp') 72 72 0 fill / 72px 72px 0 / 16px 16px 0 stretch; color: var(--ink);
}
.sheet-head {                       /* neues Element über h2, PR E */
  height: 124px; border: 0 solid transparent; border-width: 76px 80px; box-sizing: border-box;
  border-image: url('/assets/ui_kit/webp/dialog/head.webp') 76 80 fill / 76px 80px / 14px stretch;
  display: grid; place-items: center; color: #fff; -webkit-text-stroke: 5px var(--ink); paint-order: stroke fill;
}
.sheet-head [data-act="close"] { width: 128px; height: 128px; background: url('/assets/ui_kit/webp/button/close_normal.webp') center / contain no-repeat; border: 0; }
.sheet-head [data-act="close"]:active { background-image: url('/assets/ui_kit/webp/button/close_pressed.webp'); }
.sheet-handle { width: 128px; height: 48px; background: url('/assets/ui_kit/webp/dialog/grab.webp') center / contain no-repeat; }

/* 3) Buttons mit Zuständen (gleiches Muster für secondary, danger, gold) */
.primary, .btn-primary {
  min-height: 132px; border: 0 solid transparent; border-width: 52px 56px 62px; box-sizing: border-box;
  border-image: url('/assets/ui_kit/webp/button/primary_normal.webp') 60 64 70 fill / 60px 64px 70px / 12px stretch;
  background: none; color: #fff; font-weight: 700; -webkit-text-stroke: 4px var(--ink); paint-order: stroke fill;
}
.primary:hover { border-image-source: url('/assets/ui_kit/webp/button/primary_hover.webp'); }
.primary:active { border-image-source: url('/assets/ui_kit/webp/button/primary_pressed.webp'); padding-top: 10px; }
.primary:disabled, .primary[aria-disabled="true"] { border-image-source: url('/assets/ui_kit/webp/button/primary_disabled.webp'); color: #7d776c; -webkit-text-stroke: 0; }
button:not(.primary):not(.tab):not(.ui-icon-btn) { border-image-source: url('/assets/ui_kit/webp/button/secondary_normal.webp'); /* + gleiche Geometrie wie oben */ }
.danger { border-image-source: url('/assets/ui_kit/webp/button/danger_normal.webp'); }
.challenge-fab, .shop-buy.can, .dock-primary[data-act="spin"] { border-image-source: url('/assets/ui_kit/webp/button/gold_normal.webp'); }
.speed button, .cloud-chip, .dice { width: 128px; height: 128px; border: 0; background: url('/assets/ui_kit/webp/button/icon_normal.webp') center / contain no-repeat; }
.speed button.on { background-image: url('/assets/ui_kit/webp/button/icon_pressed.webp'); }

/* 4) Tabs */
.tabbar { background: none; border: 0 solid transparent; border-width: 72px 64px 0; border-image: url('/assets/ui_kit/webp/bar/tabbar.webp') 72 64 24 fill / 72px 64px 24px stretch; }
.tab { border: 0 solid transparent; border-width: 56px 56px 24px; border-image: url('/assets/ui_kit/webp/tab/inactive.webp') 56 56 24 fill / 56px 56px 24px stretch; color: var(--ink-light); }
.tab.active, .rank-tabs button.on, .shop-tabs button.on { border-image-source: url('/assets/ui_kit/webp/tab/active.webp'); color: var(--ink); }
.hud { border: 0 solid transparent; border-width: 24px 64px 72px; border-image: url('/assets/ui_kit/webp/bar/hud_top.webp') 24 64 72 fill / 24px 64px 72px stretch; background: none; }
.chapter-line, .screen-head { border: 0 solid transparent; border-width: 56px 60px 64px; border-image: url('/assets/ui_kit/webp/bar/header.webp') 56 60 64 fill / 56px 60px 64px / 12px stretch; color: #fff; }

/* 5) Zeilen, Chips, Zähler, Badges */
.more-sheet button, .rank-row, .friend-row, .chat-line, .achieve, .rate-list li, .shop-stock, .grip {
  border: 0 solid transparent; border-width: 40px 44px; border-image: url('/assets/ui_kit/webp/panel/row.webp') 44 48 50 48 fill / 44px 48px 50px / 10px stretch; background: none; color: var(--ink); }
.rank-row.is-me, .chat-line.is-me, .achieve.done { border-image-source: url('/assets/ui_kit/webp/panel/row_selected.webp'); box-shadow: none; }
.wallet, .hud-gold, .hud-clock, .hud-dex { border: 0 solid transparent; border-width: 36px 40px; border-image: url('/assets/ui_kit/webp/badge/counter.webp') 36 40 40 40 fill / 36px 40px 40px / 6px stretch; color: #ffe9b0; }
.starter-chip, .look-choice, .synergy-pick, .daily-frame-btn { border-image: url('/assets/ui_kit/webp/badge/chip.webp') 36 40 40 40 fill / 36px 40px 40px / 6px stretch; }
.badge { min-width: 72px; height: 72px; border: 0 solid transparent; border-width: 36px 30px; box-sizing: border-box; border-image: url('/assets/ui_kit/webp/badge/red.webp') 36 30 fill / 36px 30px stretch; color: #fff; display: inline-grid; place-items: center; }

/* 6) Eingabe + select */
input:not([type="checkbox"]):not([type="range"]), select, textarea {
  border: 0 solid transparent; border-width: 40px 44px; border-image: url('/assets/ui_kit/webp/input/normal.webp') 52 fill / 52px stretch; background: none; color: var(--ink); }
input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 0; border-image-source: url('/assets/ui_kit/webp/input/focus.webp'); }
input[aria-invalid="true"], .name-row.has-error input { border-image-source: url('/assets/ui_kit/webp/input/error.webp'); }
select { appearance: none; background: url('/assets/ui_kit/webp/input/select_arrow.webp') right center / 64px no-repeat; }
::placeholder { color: #a58a66; }

/* 7) Schalter + Checkbox (label.switch > input[type=checkbox]) */
.switch input[type="checkbox"] { appearance: none; width: 144px; height: 88px; background: url('/assets/ui_kit/webp/control/toggle_off.webp') center / contain no-repeat; }
.switch input[type="checkbox"]:checked { background-image: url('/assets/ui_kit/webp/control/toggle_on.webp'); }
input[type="checkbox"].check { appearance: none; width: 88px; height: 88px; background: url('/assets/ui_kit/webp/control/check_off.webp') center / contain no-repeat; }
input[type="checkbox"].check:checked { background-image: url('/assets/ui_kit/webp/control/check_on.webp'); }
/* Schieberegler (falls neu, z. B. Schriftgröße) */
input[type="range"] { appearance: none; height: 96px; background: none; }
input[type="range"]::-webkit-slider-runnable-track { height: 56px; border: 0 solid transparent; border-width: 0 28px; border-image: url('/assets/ui_kit/webp/control/slider_track.webp') 28 fill / 28px stretch; }
input[type="range"]::-webkit-slider-thumb { appearance: none; width: 80px; height: 96px; margin-top: -20px; border: 0; background: url('/assets/ui_kit/webp/control/slider_knob.webp') center / contain no-repeat; }

/* 8) Fortschritt (Bahn + Füllung). Bei niedrigen Balken border-image-width = halbe Höhe */
.progress-track, .hp, .ult, .bar-exp, .hp-beast, .boot-track, .starter-track, .mini .bar {
  background: none; border: 0 solid transparent; border-width: 0 calc(var(--h, 56px) / 2); padding: 8px 0; box-sizing: border-box;
  border-image: url('/assets/ui_kit/webp/progress/track.webp') 28 fill / calc(var(--h, 56px) / 2) stretch; }
.progress-track span, .hp span, .bar-exp span, .hp-beast span, .boot-track span, .starter-track span {
  background: none; border: 0 solid transparent; border-image: url('/assets/ui_kit/webp/progress/fill_green.webp') 20 fill / calc(var(--h, 56px) / 2 - 8px) stretch; min-width: calc(var(--h, 56px) - 16px); }
.hp { --h: 28px; } .hp span { border-image-source: url('/assets/ui_kit/webp/progress/fill_red.webp'); }   /* Farbe je Zweck: gold Bannsiegel/Kodex, blue EP, purple Ult */

/* 9) Trenner + Scrollbar */
hr, .divider { height: 32px; border: 0 solid transparent; border-width: 0 32px; border-image: url('/assets/ui_kit/webp/divider/line.webp') 0 32 fill / 0 32px stretch; }
.menu-scroll::-webkit-scrollbar, .sheet-body::-webkit-scrollbar { width: 32px; }
.menu-scroll::-webkit-scrollbar-track, .sheet-body::-webkit-scrollbar-track { border: 16px solid transparent; border-width: 16px 0; border-image: url('/assets/ui_kit/webp/scroll/track.webp') 16 0 fill / 16px 0 stretch; }
.menu-scroll::-webkit-scrollbar-thumb, .sheet-body::-webkit-scrollbar-thumb { border: 16px solid transparent; border-width: 16px 0; border-image: url('/assets/ui_kit/webp/scroll/thumb.webp') 16 0 fill / 16px 0 stretch; }
* { scrollbar-color: #8a5126 #e4cba0; }   /* Firefox */

/* 10) Tooltip */
.combo-tip, .status-tip, .shop-toast, .mastery-toast { position: relative; border: 0 solid transparent; border-width: 32px 36px; border-image: url('/assets/ui_kit/webp/panel/tooltip.webp') 44 44 48 fill / 44px 44px 48px / 12px stretch; background: none; color: var(--ink-light); }
.combo-tip::after { content: ''; position: absolute; left: 50%; bottom: -34px; width: 56px; height: 36px; translate: -50% 0; background: url('/assets/ui_kit/webp/panel/tooltip_tail.webp') center / contain no-repeat; }
```

**Hinweise für Porygon:**
- Die Pfade oben sind Platzhalter. Im Spiel laufen sie über `art('ui_kit/…')` oder die Vite-Base, wie bei `shopOffer.ts:35`. Für die Tests `uiArt.test.ts` bzw. `artLayout.test.ts` sollten die Schlüssel als `kitArt`-Tabelle in `uiArt.ts` angelegt werden.
- Die Laden-Tabs und `card_frame_soft` funktionieren schon so (`.shop-card` css:1497 `border-image-slice: 56`). Das Kit nutzt dasselbe Prinzip.
- Den Innenabstand regelt `border-width`. Wo ein Element bisher `padding` hatte, wird `padding` kleiner, damit die Höhe gleich bleibt. Der Rahmen bleibt dabei über `border-image-width` gleich dick.
- `border-image` und `border-radius` vertragen sich nicht. Die runden Ecken stecken im Bild, deshalb `border-radius` auf den umgestellten Klassen weglassen (`--radius-*` css:5-8).
- Bei reduzierter Bewegung oder hohem Kontrast ändert sich nichts, denn die Bilder sind statisch.
- Bei `:focus-visible` hat die Eingabe die Fokusvariante. Buttons behalten `outline: 6px solid #fff8e1` (css:1004).
- Reihenfolge laut `ui-paket9-liste.md`: zuerst PR A mit dem Kit und den Basisklassen. Danach ordnen B–E nur noch Klassen zu.
- Browser-Test: `assets/raw_src/paket9/css_test.html` → `audit/2026-11-19-ui-bestand/css_test_border_image.png` (Karte, Button, Eingabe Fokus, Balken in Chrome mit dem Beispiel-CSS: sitzt sauber).
