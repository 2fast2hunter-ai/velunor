---
datum: 2026-11-19
quelle: Live-Build https://2fast2hunter-ai.github.io/velunor/ (main fe74b3a, PR #93, Bundle index-DxgqAYCv.js), Playwright/Chrome 390x844 (x3) und 1280x800
status: abgenommen mit Fehlern (2 hoch, 5 mittel, 5 niedrig)
---
# Live-Abnahme Paket 9 PR B (Kampf, Team, Kodex, Truhen, Rad, Tagesaufgaben)

Screenshots: `m390_*`, `d1280_*` (audit_ui.mjs), `x3/` (prb_dpr3.mjs, DPR 3). Zeilen = /tmp/velunor-b (fe74b3a), Ursachen = Vermutung.
Desktop 1280 zeigt dieselbe 390er-Spalte (Letterbox) – keine eigenen Fehler.

| # | Prio | Befund | Datei:Zeile (Vermutung) / Fix |
|---|---|---|---|
| B1 | hoch | Truhen-Öffnen: Siegel (`chest-seal`, mix-blend-mode plus-lighter) und Strahl werden auf der neuen hellen Sheet-Fläche zu einer weißen Scheibe; Strahl unsichtbar, alle 3 Phasen (500/1200/2200 ms) sehen gleich aus (x3/09_oeffnen_*) | adventure.css:1567–1582 + ui-kit Dialog-Quelle für `.chest-sheet`; Fix: `.chest-stage` eigene dunkle Glas-Bühne (kit glass) oder blend-mode `normal` + Strahl-Farbe mit Kontur |
| B2 | hoch | Slice-Nähte (wie A1) jetzt auch auf mon-card, chest-tile, Kodex-Panel, battle-status, wx-chip, Buttons: 1-px Haarlinien | ui-kit.css ab :33/:58/:614; gleicher Füllfarben-Fix wie A1 |
| B3 | mittel | Kampf: wx-chip (Wetter-Leiste) liegt über Gegnername/HP-Leiste („Surrlibelle“ verdeckt), Schadenszahl „SCHWACH 19/30“ am linken Rand abgeschnitten und hinter battle-status | ui-kit.css:58/:614 (Inset-Rand macht Chip höher), adventure.css:351–366 `.battle-top`; :436 `.float-num` ohne Rand-Clamp |
| B4 | mittel | Aktivitäten-Dock: aktiver Tab (`[data-act=activity].primary`) wird volle Zeile → Dock 3-stöckig (Hort/Truhen/Glücksrad untereinander), frisst ~25 % Höhe, Truhen-Liste dadurch abgeschnitten | adventure.css:1401 `.menu-dock > button.primary {flex:1 1 100%}` greift auf Tab; Fix: `[data-act=activity]{flex:1 1 0}` in ui-kit.css:383/402 |
| B5 | mittel | Fortschrittsbalken: 0 % zeigt trotzdem Goldknopf (min-width), Balkenbreite hängt an Textlänge (Kodex-Regionen ungleich lang) | ui-kit.css:549 `min-width:20px` → nur bei width>0; adventure.css:1050 / view.ts:905 `.region-bar` Balken auf 100 % Breite |
| B6 | mittel | Synergie-Chips grau/ausgewaschen (opacity .38 bei disabled) auf Navy, Text kaum lesbar; Team-Seite ohne Panel-Fläche (Navy-Grund = Stilbruch zu Kodex/Truhen) | adventure.css:1246/:1262/:1264; ui-kit.css:414/:644/:654; Team-Container in Panel-Gruppe aufnehmen |
| B7 | mittel | `.konter-label` nutzt badge-gold mit Chip-Slices → gleiche Überlappung wie A5 (Vermutung aus Code, im Lauf nicht ausgelöst) | ui-kit.css:417/:648 |
| B8 | niedrig | Tagesaufgaben: Ring-Namen umbrechen mitten im Wort („Gezeitenrin/g“), Tages-Kachel „Rahmen“ am Rand abgeschnitten, heutige Kachel mit gelbem Streifen statt row_selected | ui-kit.css:562/:633/:643; adventure.css:1810–1813 (Schrift kleiner / `hyphens:auto`) |
| B9 | niedrig | Kampf-Namen (Funkfuchs/Wühlmaus) weiß ohne Grund auf Sand, schwacher Kontrast | adventure.css Kampfnamen (combatant), Kontur/inset-Chip ergänzen |
| B10 | niedrig | Truhen-Kachel: 3 volle Buttons übereinander (Raten/Öffnen/Alle öffnen), gesperrte grau-leer; sehr gedrängt | ui-kit.css Gold/Primary-Gruppe :171ff, Kachel-Layout |
| B12 | niedrig | Kodex-/Team-Karten: 5. Stern der Sternreihe rechts abgeschnitten (sichtbar auch im Store-Bild 07) | ui-kit.css Card-Gruppe (mon-card, border-image-width 40px frisst Innenbreite) / adventure.css Sternreihe – Sterne kleiner oder Rand 0.5× |
| B11 | niedrig | Glücksrad im Testlauf gesperrt (erst nach 3. Wappen) → Walzen/Drehen nicht live prüfbar; nur Marken-Liste und Preisladen geprüft (ok) | – |

Ok: HP-Füllung grün/rot, Ult lila, Kodex-Karten (Silhouetten lesbar), Kodex-Eintrag, Truhen-Quoten-Sheet, Filter-Sheet, Speed-Buttons, Dock-Slots.
Weiter offen aus PR A: A3 (Log-Sheet z-index) unverändert sichtbar (m390_03_popup_log).

**Gegenprüfung main 4f6cbe2 (PR C):** B1–B12 unverändert.
