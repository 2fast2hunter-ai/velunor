---
datum: 2026-11-19
quelle: Live-Build https://2fast2hunter-ai.github.io/velunor/ (main b32c0f9, PR #96, Bundle index-CURw1FxJ.js), 390x844 DPR3: m390_* (audit_ui.mjs), xa/ (pra_dpr3.mjs), xb/ (prb_dpr3.mjs)
status: abgenommen mit Restfehlern (0 hoch, 2 mittel, 7 niedrig); alle Flächen 1–118 am Kit
---
# Live-Abnahme Paket 9 PR E + Gesamtprüfung A–E

PR E (Einstellungen, Konto, Anleitung, Dialoge/Sheets): Optionen/Konto, Anleitung, Zurücksetzen-Dialog, Zustimmung, Truhen-Quoten-, Kodex-, Mehr-Sheet hell, Dialog-Kopf blau, keine Nähte (m390_s_options/guide/popup_*.png, 01b_consent.png).

## Restfehler (Stand b32c0f9)
| # | Prio | Befund | Datei:Zeile (Vermutung) |
|---|---|---|---|
| E1 | mittel | `.sheet h2` macht **jede** h2 im Sheet zum blauen Dialog-Kopf: Monstername im Kodex-Eintrag und im Truhen-Ergebnis („Spukrüstung“) wird zum vollbreiten Balken, doppelt mit Kicker | ui-kit.css:1417 → `.sheet > h2` bzw. `:not(.chest-card h2):not(.dex-head h2)` |
| R1 | mittel | Starter-Wertebalken (HP/Angriff/Tempo) weiter nur dünne Linie, Füllung kaum sichtbar (A6) | ui-kit.css:1054–1055 |
| E2 | niedrig | Dock-Knöpfe mit 22-px-Schrift: „Jetzt abgleichen“ (Optionen), „Platz 2 · 50.000 G“, „Drehen“ winzig im großen Knopf | ui-kit.css:1261–1269 gilt auch für `.dock-primary` → `:not(.dock-primary)` |
| E3 | niedrig | Starter-Karte: alter Rahmen (`.starter-frame`) liegt in der Kit-Karte → Rahmen-im-Rahmen, „Gewählt“-Knopf unten angeschnitten | adventure.css:934 `.starter-frame`, ui-kit.css:784/:1068 → neuer Rahmen ui_kit/starter/ (s. u.) |
| R2 | niedrig | „Mindestens 2 Zeichen.“ in der Holz-Leiste oben angeschnitten | ui-kit.css:320–324 |
| R3 | niedrig | Hub: Dock-Slots überdecken die erste Log-Zeile | ui-kit.css:1077–1086 / :706 |
| R4 | niedrig | Aktivitäten-Dock: „Glücksrad“ abgeschnitten (5 Knöpfe/Zeile) | ui-kit.css:1088 |
| R5 | niedrig | Team: „PC · 0“ außerhalb des Panels auf Navy | ui-kit.css:789 `.team-block` (PC-Block fehlt) |
| R6/R7 | niedrig | Rang-Untertab „Freunde“ stößt an Tab-Zeile; Erfolge-Knopf „Titel“ Icon über Text | ui-kit.css :414/:436-Gruppe; adventure.css:189 |

A1–A5, A7, A10–A12, B1–B3, B5–B12, C1–C8 bleiben behoben. Sozial weiter nur Offline-Ansicht (friends 403).

## Neu gezeichnet (ui_kit, eigene Code-Grafik, raw_src/paket9/draw_mastery.py)
- `ui_kit/mastery/ring_{bronze,silver,gold}.png` (+webp), 160×160, 9-Slice 56, Mitte transparent; Silber mit 4 Sternnieten, Gold zusätzlich Stern oben. Für `.m-plate.m-bronze/-silver/-gold` (adventure.css:1719–1721, ersetzt box-shadow-Ring). CSS-Beispiel in ui_kit.json.
- `ui_kit/starter/starter_{fire,water,plant}.png` (+webp), 200×200, 9-Slice 72, Mitte transparent – ersetzt den alten `.starter-frame` (E3); Zuordnung m01 fire, m02 water, m03 plant.
