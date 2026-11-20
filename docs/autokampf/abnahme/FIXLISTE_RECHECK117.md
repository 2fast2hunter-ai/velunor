# Fixliste Auto-Kampf-UI für Porygon (Stand: main 11ed0f2 / index-er6JNRe7.js, 20.11.2026)
Nur offene Punkte. Die anderen 10 Punkte der vorigen Liste sind behoben, siehe `ABNAHME.md`, Abschnitt „Re-Check 11ed0f2“. Maße in UI-px (1080er Raster).

## Hoch
**1. Wetterzeile bricht Buchstabe für Buchstabe um** (`.wx-stack` mit `.wx-chip` und `.wx-announce`). Seit #117 ist `.wx-stack{width:min(168px,20%); overflow:hidden}` gesetzt, das sind 61 css-px. Inhalt 338 in 148 UI-px, Text abgeschnitten. Im Fokus gilt dasselbe über `.battle:has(#focus-bar:not([hidden])) .wx-stack`.
```css
.wx-stack,
.battle:has(#focus-bar:not([hidden])) .wx-stack {
  width: auto; left: 16px; right: 16px; max-width: none; overflow: visible; align-items: flex-start;
}
.wx-stack .wx-chip, .wx-stack .wx-announce { width: auto; max-width: 100%; white-space: normal; overflow-wrap: normal; word-break: normal; }
```
Für den Platz die Wetterzeile als volle Zeile unter `#battle-text` setzen (top 108 bzw. 188 wie bisher), nicht als linke Spalte.

## Mittel
**2. Wächter-Karte deckt die Logzeile** (`.guard-dock`, in #117 von `z-index:4` auf `9` gehoben, `.battle-log` hat 8).
```css
.guard-dock { z-index: 4; }                 /* wieder unter Log und Chips */
/* oder Platz schaffen: */
.guard-dock { bottom: 96px; }               /* über der Logzeile (Log bottom 12 + ≥ 64 hoch) */
```

**3. Vorteils-Chip in der linken Spalte** (`.adv-chip`, jetzt `left:12px; top:33%`). Er überdeckt Ally-Name und HP-Balken in 13/30 Proben und ragt zeitweise links aus dem Bild (−5 css-px, vermutlich Shake/Recoil-Animation).
```css
.adv-chip { left: 50%; top: 30%; transform: translateX(-50%); }  /* zwischen den Kämpfern, frei von Karten */
.adv-chip { animation: none; }                                     /* falls die Recoil-Animation erbt */
```

## Niedrig
**4. „Warum?“-Hinweis über der Schlosszeile** (`.why-chip` auf dem Weg, `bottom:200px`). Er liegt über „ab Lv 25“ der eigenen Karte.
```css
.why-chip { bottom: 96px; }   /* knapp über der Logzeile, unter der Ally-Karte */
```

**5. (Info)** Die große Ult-Leiste (`ult/seg_*_l.png`, `ult/bahn_l.png`) ist weiter ungenutzt.
