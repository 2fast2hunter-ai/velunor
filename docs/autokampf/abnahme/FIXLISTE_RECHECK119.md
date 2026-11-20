# Fixliste Auto-Kampf-UI für Porygon (Stand: #119 / index-Ck2ztNJW.js, 20.11.2026)
Alle Punkte der vorigen Listen sind **erledigt**: H1, H2, M1, Tempo, Fokus-Knöpfe, Log/Knopf, Ansage/HP, Wetterzeile, Wetter-Ansage, ULT-Kontur, Log-Blatt, Warum-Karte, guard-dock, adv-chip, Warum-Chip. Belege in `ABNAHME.md`, Abschnitt „Re-Check #119“. Offen sind nur noch:

## Mittel
**1. Fokusleiste über dem Gegner-Sprite** (`#focus-bar` rechts, `.battle:has(#focus-bar:not([hidden])) .combatant.foe{margin-top:430px}`). KO-Punkte und Tempo-Knöpfe (225–384 × 496–620 css-px) verdecken Gegner und Spotlight.
```css
/* Variante A: Gegner im Fokus nicht so weit nach unten schieben */
.battle:has(#focus-bar:not([hidden])) .combatant.foe { margin-top: 320px; }
/* Variante B: Leiste unter die Bühne, volle Breite, Gegner bleibt frei */
.battle:has(#focus-bar:not([hidden])) .focus-bar { left: 16px; right: 16px; width: auto; bottom: 12px; justify-content: flex-end; }
.battle:has(#focus-bar:not([hidden])) .focus-bar .ko-dots { order: -1; margin-right: auto; }
```
Prüfen: Gegner-Sprite und `#spotlight-foe` dürfen `#focus-bar` nicht schneiden (in `live_focus.mjs` als `focus_foe` messbar).

## Niedrig
**2. Vorteils-Chip und Wetter-Tag auf der Wächter-Karte** (`.adv-chip{top:58%}`, `#wx-tag` mit Position aus `M5()`, `.guard-dock` rechts unten, z 4).
```css
.adv-chip { top: 50%; }                   /* über die Wächter-Karte (deren Oberkante ≈ 60 %) */
#stage:not(:has(#focus-bar:not([hidden]))) .guard-dock { bottom: 96px; max-height: 34%; overflow: hidden; }
```
Alternativ die Wächter-Karte nur auf Tap aufklappen.
