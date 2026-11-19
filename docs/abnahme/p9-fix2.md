---
datum: 2026-11-19
quelle: Live-Build https://2fast2hunter-ai.github.io/velunor/ (main d8ac500, Fix-PR #99, Bundle index-BVXZwNPq.js), 390x844 DPR3: m390_*, xa/, xb/, ring_*_{team,kodex}.png (fix2_mastery.mjs, Meisterschaft lokal per Init-Skript gesetzt)
status: abgenommen, 1 Rest mittel (R1), 2 niedrig
---
# Nachprüfung Fix-PR #99

| Punkt | behoben? | Screenshot |
|---|---|---|
| E1 Monstername kein blauer Balken (Kodex-Eintrag, Truhen-Ergebnis) | ja | m390_s_popup_dex.png, xb/09_oeffnen_1200.png |
| E2 Dock-Schrift „Jetzt abgleichen“ | ja | m390_s_options.png |
| E3 neuer Starter-Rahmen, „Gewählt“ ganz sichtbar | ja | xa/03_starter_gewaehlt.png |
| Meisterschaftsringe Bronze/Silber/Gold | ja, sichtbar | ring_bronze/silber/gold_kodex.png |
| R1 Starter-Wertebalken | **nein** | xa/03_starter_gewaehlt.png |
| R2 Hinweis Holz-Leiste | ja | xa/02_name_leer_fokus.png |
| R3 Log unter Dock-Slots | ja | xa/05_hub.png |
| R4 Aktivitäten-Dock | ja (Tabs eigene Zeile) | xb/06_aktivitaeten_tage.png |
| R5 PC-Bereich im Panel | ja | m390_s_team.png |
| R6 Rang-Untertab „Freunde“ | ja | m390_s_ranks.png |
| R7 Erfolge-Knopf „Titel“ | ja | m390_s_achievements.png |

## Rest
| # | Prio | Befund | Datei:Zeile / Fix |
|---|---|---|---|
| R1 | mittel | Starter-Balken: Mitte der Füllung leer (dunkle Bahn scheint durch), nur roter Rand oben/unten. Ursache liegt in meiner Kit-Angabe: fill_*.png ist 40 px hoch mit Slice 20 oben/unten → kein Mittelstück; bei Balken > 2× border-image-width bleibt die Mitte leer | ui-kit.css:1055 (+ Fortschritts-Gruppe :602–622): `border-image-slice: 0 20 fill; border-image-width: 0 8px` (Bahn: `0 28 fill`). ui_kit.json ist korrigiert (Slice oben/unten 0) |
| F1 | niedrig | Goldring: Stern oben wurde im Kantenstück in die Breite gezogen | Asset neu gezeichnet ohne Stern (ui_kit/mastery/ring_gold.png + webp) – bitte ins Repo übernehmen |
| F2 | niedrig | Aktivitäten-Tabs/„In den Hort“/„In den PC“: Beschriftung sehr klein (~8 css-px) | ui-kit.css:1261–1269 (22 px) → 28–30 px für `.menu-dock > button` |
