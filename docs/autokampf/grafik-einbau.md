---
datum: 2026-11-20
quelle: Smettbo · Grafik zum Konzept /workspace/webgame/autokampf-umbau-konzept.md Abschnitt 5 (Punkte 1–8)
status: Grafik fertig (v2 nach Tester-Hinweis), Einbau offen
---
# Auto-Kampf-UI: Einbau

**Zuordnung zu Lucarios Schrittliste (Konzept Abschnitt 8):**
- **A6 Wächter/Fokuskampf Zug für Zug:** `tempo/*` (1x/2x/Überspringen/Pause/Weiter), `ko/*`, `spotlight/*`, `callout/ansage`
- **A7 Kampflog:** `log/*` (10 Icons)
- **A8 Anzeigen:** `adv/*` (Vorteils-Chips), `wetter/*`, `status/*`, `ult/*` (Ult-Leiste + Schloss), `callout/ult` + `ult_glanz` (Ult-Ansage)
- **A9 Zusammenfassung „Warum?“:** `summary/*` (Karte, Grund-Zeile, Grund-Icons, Tipp)

**Ablage:** `assets/battle_ui/` (png), `assets/battle_ui/webp/` (gleiche Pfade), Manifest `assets/battle_ui/battle_ui.json`. Die Icons gibt es zusätzlich als `@2x.png` für scharfe Darstellung. Skripte liegen in `assets/raw_src/autokampf/` (`draw_battle_ui.py`, `preview_autokampf.py`). Vorschau: `assets/preview_autokampf_ui.jpg`.

**Maße:** Alle Angaben sind **UI-px im 1080er Raster** (`#stage`, skaliert per `--ui-scale`, ≈ 0,36 bei 390 css-px). Das sind keine Bildschirm-px. Grafiken sind @1x im UI-Raster gezeichnet; für 9-Slice gilt Slice-Wert = `border-image-width` in UI-px.

**Wichtig bei 9-Slice:**
- `border-image` deaktiviert `border-radius`, die Ecken stecken im Bild. Gegen die 1-px-Nähte unter `transform: scale` eine Grundfarbe auf die padding-box legen: `background: <Mittelfarbe> padding-box; border-radius: <r>` (der Radius klippt dann nur die Grundfarbe), wie im P9-Kit (Fix A1).
- Ein Mittelstück muss es geben (Slice-Summe < Bildmaß). Bei allen Teilen hier ist das so.
- Schmuck (Sterne) sitzt nur in den Ecken und wird nicht gedehnt.

## Teile
| Datei | Art | Bild (px) | Slice o r u l | Outset | Verwendung |
|---|---|---|---|---|---|
| `log/angriff.png` | image | 48×48 | – | – | Log-Icon 48: Angriff / normaler Treffer (2 Hiebe) |
| `log/krit.png` | image | 48×48 | – | – | Log-Icon 48: Kritischer Treffer (Zacken-Explosion) |
| `log/ult.png` | image | 48×48 | – | – | Log-Icon 48: Ultimate (Raute mit Stern) |
| `log/heilung.png` | image | 48×48 | – | – | Log-Icon 48: Heilung (Herz mit großem Plus) |
| `log/schild.png` | image | 48×48 | – | – | Log-Icon 48: Schild / Verteidigung |
| `log/status.png` | image | 48×48 | – | – | Log-Icon 48: Status zugefügt (Kreis mit Spirale) |
| `log/wetter.png` | image | 48×48 | – | – | Log-Icon 48: Wetter-Effekt (Wolke mit Tropfen) |
| `log/ko.png` | image | 48×48 | – | – | Log-Icon 48: KO (großes graues ×) |
| `log/wechsel.png` | image | 48×48 | – | – | Log-Icon 48: Wechsel / neues Monster (Gegenpfeile) |
| `log/boss.png` | image | 48×48 | – | – | Log-Icon 48: Boss-Mechanik (Zahnrad mit !) |
| `summary/grund_typ.png` | image | 64×64 | – | – | Grund-Icon 64 (Zusammenfassung): Typ-Vorteil/-Nachteil |
| `summary/grund_wetter.png` | image | 64×64 | – | – | Grund-Icon 64 (Zusammenfassung): Wetter |
| `summary/grund_erstschlag.png` | image | 64×64 | – | – | Grund-Icon 64 (Zusammenfassung): Erstschlag/Tempo |
| `summary/grund_ult.png` | image | 64×64 | – | – | Grund-Icon 64 (Zusammenfassung): Ult-Anteil |
| `summary/grund_status.png` | image | 64×64 | – | – | Grund-Icon 64 (Zusammenfassung): Status-Schaden |
| `summary/grund_mechanik.png` | image | 64×64 | – | – | Grund-Icon 64 (Zusammenfassung): Boss-Mechanik/Krits |
| `summary/tipp.png` | image | 64×64 | – | – | Tipp-Glühbirne 64 (Zusammenfassung, vor jedem Tipp) |
| `spotlight/ally.png` | image | 256×128 | – | – | Spotlight-Ring unter dem handelnden Monster (eigenes, runde Marker); mittig unter die Füße, Breite ≈ 1,1× Sprite-Breite |
| `spotlight/foe.png` | image | 256×128 | – | – | Spotlight-Ring unter dem handelnden Monster (Gegner, Rauten-Marker); mittig unter die Füße, Breite ≈ 1,1× Sprite-Breite |
| `callout/ansage.png` | 9slice | 192×128 | 48 52 52 52 | 12 | Ansage-Karte (feste Ansagezeile, halbtransparent 90 %), Text #4a2c17 ≥ 40 px |
| `callout/ult.png` | 9slice | 224×160 | 64 64 68 64 | 12 | Ult-Ansage-Karte mit Glanz (lila Band, Sternnieten in den Ecken), Name + Muster; Bühne dahinter per CSS abdunkeln |
| `callout/ult_glanz.png` | image | 160×160 | – | – | Glanzstreifen über der Ult-Karte (mix-blend normal, translateX-Animation 600 ms; bei reduzierter Bewegung weglassen) |
| `adv/stark.png` | image | 64×64 | – | – | Vorteils-Chip stark (Form: Doppelpfeil hoch), immer mit Wort daneben |
| `adv/pill_stark.png` | 9slice | 192×80 | 34 40 40 40 | 8 | Pille hinter „stark“-Label (links Platz für adv/stark.png 48 px), Text #fff3dc mit Kontur |
| `adv/schwach.png` | image | 64×64 | – | – | Vorteils-Chip schwach (Form: Pfeil runter), immer mit Wort daneben |
| `adv/pill_schwach.png` | 9slice | 192×80 | 34 40 40 40 | 8 | Pille hinter „schwach“-Label (links Platz für adv/schwach.png 48 px), Text #fff3dc mit Kontur |
| `adv/neutral.png` | image | 64×64 | – | – | Vorteils-Chip neutral (Form: Strich), immer mit Wort daneben |
| `adv/pill_neutral.png` | 9slice | 192×80 | 34 40 40 40 | 8 | Pille hinter „neutral“-Label (links Platz für adv/neutral.png 48 px), Text #fff3dc mit Kontur |
| `ult/seg_leer_l.png` | image | 60×60 | – | – | Ult-Segment leer (groß, Kreis 40 px, Bild 60 px inkl. Glow-Rand); Form: leer=Mulde, voll=gefüllt, bereit=gefüllt+Stern+Glow |
| `ult/seg_voll_l.png` | image | 60×60 | – | – | Ult-Segment voll (groß, Kreis 40 px, Bild 60 px inkl. Glow-Rand); Form: leer=Mulde, voll=gefüllt, bereit=gefüllt+Stern+Glow |
| `ult/seg_bereit_l.png` | image | 60×60 | – | – | Ult-Segment bereit (groß, Kreis 40 px, Bild 60 px inkl. Glow-Rand); Form: leer=Mulde, voll=gefüllt, bereit=gefüllt+Stern+Glow |
| `ult/schloss_l.png` | image | 60×60 | – | – | Schloss in der Ult-Leiste unter Lv 25, daneben Text „ab Lv 25“ (groß) |
| `ult/bahn_l.png` | 9slice | 160×64 | 24 32 24 32 | – | Bahn hinter den 5 Ult-Segmenten (groß), 9-Slice |
| `ult/seg_leer_s.png` | image | 36×36 | – | – | Ult-Segment leer (klein/Handy, Kreis 24 px, Bild 36 px inkl. Glow-Rand); Form: leer=Mulde, voll=gefüllt, bereit=gefüllt+Stern+Glow |
| `ult/seg_voll_s.png` | image | 36×36 | – | – | Ult-Segment voll (klein/Handy, Kreis 24 px, Bild 36 px inkl. Glow-Rand); Form: leer=Mulde, voll=gefüllt, bereit=gefüllt+Stern+Glow |
| `ult/seg_bereit_s.png` | image | 36×36 | – | – | Ult-Segment bereit (klein/Handy, Kreis 24 px, Bild 36 px inkl. Glow-Rand); Form: leer=Mulde, voll=gefüllt, bereit=gefüllt+Stern+Glow |
| `ult/schloss_s.png` | image | 36×36 | – | – | Schloss in der Ult-Leiste unter Lv 25, daneben Text „ab Lv 25“ (klein) |
| `ult/bahn_s.png` | 9slice | 112×40 | 12 20 12 20 | – | Bahn hinter den 5 Ult-Segmenten (klein), 9-Slice |
| `status/chip.png` | 9slice | 160×64 | 30 32 32 32 | 6 | Status-Chip-Rahmen: links vorhandenes Status-Icon (icons/status_*_128 auf 40 px), Kurzname + Runden, Text #4a2c17 |
| `status/stapel.png` | image | 40×40 | – | – | Stapel-/Runden-Kreis rechts am Status-Chip (Zahl #ffffff fett 24 px) |
| `wetter/tag.png` | 9slice | 128×56 | 24 26 26 26 | 5 | Wetter-Tag neben der Schadenszahl („−15 %“), links Platz für wetter/tag_icon 28 px, Text #1d3d66 fett |
| `wetter/tag_icon.png` | image | 32×32 | – | – | Mini-Wolke im Wetter-Tag (Form = Wetter, unabhängig von der Farbe) |
| `summary/karte.png` | 9slice | 224×224 | 76 76 84 76 | 14 | Zusammenfassungskarte „Warum?“ (Goldband, Sternnieten nur in den Ecken) |
| `summary/grund_zeile.png` | 9slice | 192×96 | 36 36 36 36 | – | Zeile für einen Grund (Grund-Icon 64 links, Satz rechts) bzw. Tipp-Zeile |
| `tempo/1x_normal.png` | image | 128×128 | – | – | Tempo-Knopf 1x (normal), Ziel 128 UI-px ≥ 120 |
| `tempo/1x_aktiv.png` | image | 128×128 | – | – | Tempo-Knopf 1x (aktiv), Ziel 128 UI-px ≥ 120 |
| `tempo/2x_normal.png` | image | 128×128 | – | – | Tempo-Knopf 2x (normal), Ziel 128 UI-px ≥ 120 |
| `tempo/2x_aktiv.png` | image | 128×128 | – | – | Tempo-Knopf 2x (aktiv), Ziel 128 UI-px ≥ 120 |
| `tempo/skip_normal.png` | image | 128×128 | – | – | Tempo-Knopf skip (normal), Ziel 128 UI-px ≥ 120 |
| `tempo/skip_aktiv.png` | image | 128×128 | – | – | Tempo-Knopf skip (aktiv), Ziel 128 UI-px ≥ 120 |
| `tempo/pause_normal.png` | image | 128×128 | – | – | Tempo-Knopf pause (normal), Ziel 128 UI-px ≥ 120 |
| `tempo/pause_aktiv.png` | image | 128×128 | – | – | Tempo-Knopf pause (aktiv), Ziel 128 UI-px ≥ 120 |
| `tempo/weiter_normal.png` | image | 128×128 | – | – | Tempo-Knopf weiter (normal), Ziel 128 UI-px ≥ 120 |
| `tempo/weiter_aktiv.png` | image | 128×128 | – | – | Tempo-Knopf weiter (aktiv), Ziel 128 UI-px ≥ 120 |
| `ko/voll_32.png` | image | 32×32 | – | – | KO-Punkt voll (gefüllt mit ×), 32 px; 6 nebeneinander, Abstand 8; 64 = Handy-Standard |
| `ko/voll_48.png` | image | 48×48 | – | – | KO-Punkt voll (gefüllt mit ×), 48 px; 6 nebeneinander, Abstand 8; 64 = Handy-Standard |
| `ko/voll_64.png` | image | 64×64 | – | – | KO-Punkt voll (gefüllt mit ×), 64 px; 6 nebeneinander, Abstand 8; 64 = Handy-Standard |
| `ko/leer_32.png` | image | 32×32 | – | – | KO-Punkt leer (hohler Ring), 32 px; 6 nebeneinander, Abstand 8; 64 = Handy-Standard |
| `ko/leer_48.png` | image | 48×48 | – | – | KO-Punkt leer (hohler Ring), 48 px; 6 nebeneinander, Abstand 8; 64 = Handy-Standard |
| `ko/leer_64.png` | image | 64×64 | – | – | KO-Punkt leer (hohler Ring), 64 px; 6 nebeneinander, Abstand 8; 64 = Handy-Standard |

## Größen im Layout (UI-px, Hochformat 1080 × 2340)
- **Spotlight (A6):** 256 × 128, auf ≈ 1,1 × Sprite-Breite skalieren, Mitte unter den Füßen, `z-index` unter dem Sprite. Eigenes Monster = `spotlight/ally` (blau, runde Marker), Gegner = `spotlight/foe` (rot, Rauten). Die Seite erkennt man an der Form der Marker, nicht nur an der Farbe.
- **Ansagezeile (A6):** volle Breite minus 2 × 40, Höhe ≥ 112 (Konzept: ≥ 44 Designmaß für die Zeile, Text 40–44 px). Ult-Ansage: Breite 860, Höhe ≥ 200, Name 48 px, Muster 34 px.
- **Vorteils-Chip (A8):** Icon 64 (in der Pille 48–52), Pille Höhe 72, Wort 32–34 px in `#fff3dc` mit 4-px-Kontur `#4a2c17`. Das Wort („stark“, „schwach“, „neutral“) steht immer dabei.
- **Ult-Leiste (A8) groß:** Segment 40 (Bild 60 inkl. Glow), Abstand 8, Bahn Höhe 56. **Klein (Gegnerkarte/Handy):** Segment 24 (Bild 36), Abstand 6, Bahn Höhe 40. Bei 0,36 Skalierung sind das ≈ 8,6 css-px, also ≥ 8 px. Darunter Lv 25: `ult/schloss_*` plus Text „ab Lv 25“, 32 px (groß) bzw. 28 px (klein). Bereit: alle 5 `seg_bereit` plus Text „ULT bereit“.
- **Status-Chip (A8):** Höhe 64, links das vorhandene `icons/status_*_128.png` auf 40 px, Kurzname 32 px, rechts `status/stapel.png` 40 mit Zahl 24 px.
- **Wetter-Tag (A8):** Höhe 56, `wetter/tag_icon.png` 28–32 links, Text „−15 %“ 32 px in `#1d3d66`.
- **Log-Icons (A7):** 48 in der eingeklappten Logzeile und im Log-Sheet (Zeilenhöhe ≥ 64). Das ergibt 17 css-px; @2x-Datei verwenden. Silhouetten: angriff 2 Hiebe, krit Zacken-Explosion, ult Raute mit Stern, heilung Herz mit großem Plus, schild Schild, status Kreis mit Spirale, wetter Wolke mit Tropfen, ko großes graues ×, wechsel Gegenpfeile, boss Zahnrad mit !. Nur Heilung ist ein Herz.
- **Zusammenfassung (A9):** Karte `summary/karte` (Breite 960), Grund-Zeilen `summary/grund_zeile` Höhe 150 mit Grund-Icon 64–96, Tipp-Zeile mit `summary/tipp`.
- **Tempo-Knöpfe (A6):** 128 × 128 (Ziel ≥ 120), Zustand `_normal` / `_aktiv` (aktiv = gold, das aktive Tempo zusätzlich `aria-pressed="true"`). Pause/Weiter tauschen beim Antippen der Bühne.
- **KO-Punkte (A6/A9):** **Standard fürs Handy: `ko/*_64` (≈ 23 css-px)**, 6 nebeneinander, Abstand 8 (Reihe 424 breit). `_48` nur auf Tablet/Desktop, `_32` nur in sehr engen Listen. Voll = dunkelrot gefüllt mit weißem ×, leer = hohler Ring mit hellem Kern. In Graustufen dunkel gegen hell.

## CSS-Beispiele
```css
:root {
  --bu-ansage: image-set(url(battle_ui/webp/callout/ansage.webp) type("image/webp"), url(battle_ui/callout/ansage.png) type("image/png"));
}
.battle-callout {                 /* feste Ansagezeile, aria-live="polite" */
  box-sizing: border-box; min-height: 112px; padding: 0 24px;
  border: 26px solid transparent;
  border-image: var(--bu-ansage) 48 52 52 52 fill / 48px 52px 52px 52px / 12px stretch;
  background: rgba(255, 250, 240, .9) padding-box; border-radius: 36px;   /* gegen Nähte */
  color: #4a2c17; font: 700 calc(42px * var(--font-scale, 1)) Fredoka, sans-serif;
}
.battle-callout.is-ult {
  border-image: url(battle_ui/callout/ult.png) 64 64 68 64 fill / 64px 64px 68px 64px / 12px stretch;
  background: #fbe3a6 padding-box;
}
.battle-stage.is-ult::after { content: ""; position: absolute; inset: 0; background: rgba(20, 12, 30, .55); }  /* Rest abdunkeln */

.adv-chip { display: inline-flex; align-items: center; gap: 8px; height: 72px; padding: 0 20px 0 8px;
  border: 20px solid transparent; border-image: url(battle_ui/adv/pill_stark.png) 34 40 40 40 fill / 34px 40px 40px 40px / 8px stretch;
  color: #fff3dc; -webkit-text-stroke: 4px #4a2c17; paint-order: stroke fill; font-size: 34px; }
.adv-chip.weak    { border-image-source: url(battle_ui/adv/pill_schwach.png); }
.adv-chip.neutral { border-image-source: url(battle_ui/adv/pill_neutral.png); }
.adv-chip::before { content: ""; width: 52px; height: 52px; background: url(battle_ui/adv/stark.png) center / contain no-repeat; }

.ult-bar { display: flex; gap: 8px; padding: 8px; border: 28px solid transparent;
  border-image: url(battle_ui/ult/bahn_l.png) 24 32 fill / 24px 32px / 0 stretch; }
.ult-bar i { width: 60px; height: 60px; margin: -10px; background: url(battle_ui/ult/seg_leer_l.png) center / contain no-repeat; }
.ult-bar i.on    { background-image: url(battle_ui/ult/seg_voll_l.png); }
.ult-bar.ready i { background-image: url(battle_ui/ult/seg_bereit_l.png); }
.ult-bar.small i { width: 36px; height: 36px; margin: -6px; }

.status-chip { display: inline-flex; align-items: center; gap: 8px; height: 64px; padding: 0 8px;
  border: 22px solid transparent; border-image: url(battle_ui/status/chip.png) 30 32 32 32 fill / 30px 32px 32px 32px / 6px stretch;
  color: #4a2c17; font-size: 32px; }
.wx-tag { border: 20px solid transparent; border-image: url(battle_ui/wetter/tag.png) 24 26 26 26 fill / 24px 26px 26px 26px / 5px stretch;
  color: #1d3d66; font-weight: 700; font-size: 32px; }
.speed-btn { width: 128px; height: 128px; background: url(battle_ui/tempo/1x_normal.png) center / contain no-repeat; border: 0; }
.speed-btn[aria-pressed="true"] { background-image: url(battle_ui/tempo/1x_aktiv.png); }
.ko-dots { display: flex; gap: 8px; }
.ko-dots i { width: 64px; height: 64px; background: url(battle_ui/ko/leer_64.png) center / contain no-repeat; }
.ko-dots i.on { background-image: url(battle_ui/ko/voll_64.png); }
@media (prefers-reduced-motion: reduce) { .ult-glanz { display: none; } }
```

## Hinweise
- Farbe ist nie das einzige Signal. Stark/schwach/neutral haben Doppelpfeil/Pfeil/Strich plus Wort. Die Ult-Segmente unterscheiden sich als Mulde, Füllung und Füllung mit Stern. KO-Punkte sind × oder Ring. Spotlight-Marker sind rund oder Raute. Wetter hat die Wolkenform. In Graustufen geprüft.
- Die Status-Icons kommen aus `icons/status_*` und wurden nicht neu gezeichnet.
- Der Glanzstreifen `callout/ult_glanz.png` ist optional und wird bei reduzierter Bewegung weggelassen.

## Änderungen 20.11. 13:xx (v2, Tester-Hinweis)
- `log/ko` ist kein Herz mehr, sondern ein großes graues ×. Heilung bleibt Herz, das Plus ist jetzt größer. Gleiche Dateinamen (png, @2x, webp). Kein anderes Icon nutzt mehr ein Herz für KO, auch keine `grund_*`.
- Alle 10 Log-Icons wurden vereinfacht: dicke Silhouetten ohne feine Details, bei 17 css-px unterscheidbar, in Graustufen geprüft. Neu sind `ult` als Raute, `wechsel` als Gegenpfeile und `angriff` mit 2 Hieben. `grund_ult` und `grund_status` übernehmen die neuen Formen automatisch.
- `ko/voll_64`, `ko/leer_64` sind neu und der Handy-Standard. Die volle Füllung ist dunkler und das × dicker, für besseren Graustufen-Kontrast. Die Größen 32 und 48 bleiben.
- Schritt-Verweise folgen jetzt Lucarios Nummerierung A6–A9 (oben).
- Die Vorschau ist neu und hat zusätzlich 1:1-Handy-Ausschnitte (3× Nearest), die Log-Icon-Reihe in 17 css-px (Farbe / Graustufen hell / dunkel) und die KO-Punkte 64 in Graustufen.
