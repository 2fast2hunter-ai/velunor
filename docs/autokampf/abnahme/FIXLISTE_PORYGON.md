# Fixliste Auto-Kampf-UI für Porygon (Stand: main ec0bcd0 / index-DUg5eR7L.js, 20.11.2026)
Hier stehen nur noch offene Punkte, nach Priorität. Maße in UI-px (1080er Raster). Belege: `ABNAHME.md`, Abschnitt „Re-Check ec0bcd0“.

## Hoch
**1. Ult-Schloss „ab Lv 25“ wird nie angezeigt** (`#ally-ult`, `#foe-ult`). Die Funktion, die `is-locked` setzt (direkt nach `Xd()`, setzt auch `.ult-lock b` und `.ult-ready`-Text), lässt das `hidden`-Attribut stehen, und `[hidden]{display:none}` gewinnt.
```js
const lock = S.querySelector('.ult-lock'), ready = S.querySelector('.ult-ready')
if (lock) lock.hidden = !locked          // locked = !y
if (ready) ready.hidden = !(y && E >= 5)
```
```css
.ult-bar.small { min-width: max-content; }
.ult-bar .ult-lock b, .ult-bar .ult-ready { white-space: nowrap; }
```

**2. Ansage-Karte `callout/ansage.png` wird von Kit-Regeln überschrieben** (`#battle-text.is-callout`, gesetzt in `g5()`). Die Regeln `.wx-chip,.battle-status{…!important}` gewinnen gegen das Inline-`border-image`. Diesen Block hinter die Kit-Regeln stellen:
```css
#battle-text.battle-status.is-callout {
  border-style: solid !important; border-color: transparent !important;
  border-width: 26px !important; border-radius: 36px !important;
  border-image: url(battle_ui/callout/ansage.png) 48 52 52 52 fill / 48px 52px 52px 52px / 12px stretch !important;
  background-color: rgba(255,250,240,.92) !important; background-clip: padding-box !important;
  color: #4a2c17 !important; text-shadow: none !important; padding: 28px 36px !important;
}
```

## Mittel
**3. Status-Chip ohne Rahmen-Asset** (`.status-chip`, `#foe-status` / `#ally-status`).
```css
.status-chip {
  border: 30px solid transparent; border-radius: 18px;
  border-image: url(battle_ui/status/chip.png) 30 32 32 32 fill / 30px 32px 32px 32px / 6px stretch;
  background: #fffaf0 padding-box; min-height: 64px; padding: 0 4px;
}
```

**4. Tempo-aktiv-Grafik deployen.** `assets/battle_ui/tempo/*_aktiv.png` und `webp/tempo/*_aktiv.webp` sind neu gezeichnet: eingedrückt, dunkler Innenring, Häkchen. Dateinamen sind gleich, am Code ändert sich nichts. Nur die Dateien übernehmen.

**5. Fokuskampf zeigt zwei Tempo-Steuerungen und den Wächter-Knopf.** Die Fokusleiste liegt außerdem über dem eigenen Monster.
```css
.battle:has(#focus-bar:not([hidden])) .speed,
.battle:has(#focus-bar:not([hidden])) [data-act=challenge] { display: none; }
.battle:has(#focus-bar:not([hidden])) .combatant.ally { margin-bottom: 300px; } /* oder: Fokusleiste unter die Bühne */
```

**6. Logzeile überdeckt „Wächter herausfordern“** (`.battle-log` mit `bottom:12px` gegen `.challenge-fab`).
```css
.battle-log { bottom: 168px; }  /* über dem Knopf; oder der Knopf rückt nach oben */
.battle:has(#focus-bar:not([hidden])) .battle-log { bottom: 12px; } /* im Fokus ist der Knopf ausgeblendet (Punkt 5) */
```

**7. Kopfbereich: Ansage über Gegnername und HP, Wetterzeile abgeschnitten** (`#battle-text`, `.wx-stack`, `.wx-chip`). Der Inhalt der Wetterzeile ist 662 css-px breit bei 369 verfügbar.
```css
.wx-stack { width: auto; right: 16px; }
.wx-stack .wx-chip { white-space: normal; max-width: 100%; }
.battle:has(#focus-bar:not([hidden])) .combatant.foe { margin-top: 140px; } /* Gegnerkarte unter die Ansage */
```

**8. Wetter-Ansage ohne Grund** (`.wx-announce`). Weißer Text auf hellem Himmel.
```css
.wx-announce { padding: 8px 20px; border-radius: 18px; background: rgba(8,12,24,.78);
  -webkit-text-stroke: 3px #1a1208; paint-order: stroke fill; }
```

**9. „ULT bereit“ ohne Kontur** (`.ult-bar .ult-ready`, sichtbar nach Fix 1).
```css
.ult-bar .ult-ready { -webkit-text-stroke: 3px #4a2c17; paint-order: stroke fill; }
```

## Niedrig
**10. Log-Blatt scheint durch** (`.battle-log-sheet`), Hub-Text ist dahinter lesbar.
```css
.battle-log-sheet { background: #080c18; }
```
Zusätzlich die Zeile „Wartet“ ohne Status-Icon (oder mit `log/schild`) ausgeben. Das passiert dort, wo das Log `ql(icon)` wählt.

**11. Warum-Karte:** Der Knopf „Kampflog“ ist ungestylt (Browser-Standard). Bei 3 Tipps ist die Karte 760 css-px hoch.
```css
.why-card button[data-act*=log] { /* Kit wie .kit-btn */ border-image-source: var(--kit-button-secondary-normal) !important; }
.why-card .why-row.is-tip ~ .why-row.is-tip ~ .why-row.is-tip { display: none; } /* höchstens 2 Tipps, oder in vM() kürzen */
```

**12. (Info)** Für die eigene Karte ist eine große Ult-Leiste vorhanden (`ult/seg_*_l.png`, `ult/bahn_l.png`), derzeit ungenutzt. Wird sie verwendet: `.ult-bar:not(.small) .ult-seg{width:60px;height:60px;margin:-10px}`.
