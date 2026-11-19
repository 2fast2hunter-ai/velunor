---
datum: 2026-11-19
quelle: Live-Build https://2fast2hunter-ai.github.io/velunor/ (main 4f6cbe2, PR #94, Bundle index-PUOlh6qT.js), audit_ui.mjs 390x844 DPR3 (m390_*) und 1280x800 (d1280_*)
status: abgenommen mit Fehlern (0 hoch, 4 mittel, 4 niedrig); A/B gegengeprüft
---
# Live-Abnahme Paket 9 PR C (Laden, Karte, Erfolge, Ränge, Baum, Turm, Expedition, Arena)

Zeilen = /tmp/velunor-c (4f6cbe2), Ursachen = Vermutung. Diff C vs B: nur ui-kit.css (+77/-23) und view.ts:724 (`.text-btn.on`).

| # | Prio | Befund | Datei:Zeile (Vermutung) / Fix |
|---|---|---|---|
| C1 | mittel | Erfolge: einlösbarer Eintrag (row_selected, hellgelb) mit Titel „10 Siege“ in Gold #f0c14a → Kontrast ~1,5:1, kaum lesbar | adventure.css:188 `.achieve.done b`; ui-kit.css:687 – auf `var(--ink)` setzen |
| C2 | mittel | Erfolge-Zeilen: Icon mittig oben, Text eingerückt/zentriert-links, Buttons darunter → kein Zeilen-Layout wie im Kit (Icon links, Text, Aktion rechts) | adventure.css:187/:1392 vs. ui-kit.css:141/:595 (Row-Rand verschiebt Flex) |
| C3 | mittel | Laden: Kopf „Laden“ ohne Header-Fläche direkt auf Nachthimmel, ~110 css-px Leerraum oben; Wallet-Kästen eckig-dunkel statt Counter-Pille | adventure.css:1454–1461 `.shop-head`; ui-kit.css:348 (`.wallet` bekommt Counter-Rand, aber Radius/Höhe aus adventure.css:1460) – `.shop-head` in Header-Gruppe (ui-kit.css ~:361) |
| C4 | mittel | Ränge: Tab-Leiste läuft rechts aus („Meisterschaf…“ abgeschnitten, kein Scroll-Hinweis); „Freunde“ als blauer Primary-Knopf unter den Tabs = Stilbruch | ui-kit.css:397/:414; adventure.css:1746–1748/:1766 |
| C5 | niedrig | Karte: Kapitel-Sheet überdeckt Kapitel-Leiste, Avatar halb abgeschnitten | adventure.css `.map-sheet` top; ui-kit.css Dialog-Gruppe (+`.map-sheet`) |
| C6 | niedrig | Turm: Stufen-Pips als 10 winzige blaue Badges (14 px) – wirken wie gepunktete Linie; Fortschrittsbalken wäre lesbarer | ui-kit.css:724–728; adventure.css:1791–1793 |
| C7 | niedrig | Laden: gesperrte Kaufknöpfe „Fehlen 5.686“ grau auf grau, schwach | ui-kit.css (`.shop-buy.blocked`, Disabled-Gruppe) |
| C8 | niedrig | Arena/Expedition/Baum im Testspielstand gesperrt → nur Sperr-Ansicht geprüft (Arena-Karte, Expeditions-Karten, Baum-Knoten ok) | – |

Slice-Nähte (A1/B2) auch auf allen neuen C-Flächen sichtbar (shop-card, achieve, tower-floor).

## Gegenprüfung A/B auf main 4f6cbe2
- A12 (Karten-Zeilen als blaue Knöpfe): **behoben** (travel-Zeilen jetzt Kit-Zeilen, „hier“ = row_selected).
- A1, A2 (English-Knopf dunkel), A3 (Log-Sheet unter wx-chip), A7 (Starter-Karte dunkel) und alle übrigen A-Punkte: **unverändert**.
- B1–B11: **unverändert** (C berührt chest-stage, menu-dock-Aktivitäten, progress-track, synergy nicht).
