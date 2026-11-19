---
datum: 2026-11-19
quelle: Live-Build https://2fast2hunter-ai.github.io/velunor/ (main d5e5b78, PR #95, Bundle index-Dk2nd-79.js), 390x844 DPR3: m390_* (audit_ui.mjs, Map-Sheet-Schließen ergänzt), xa/ (pra_dpr3.mjs), xb/ (prb_dpr3.mjs)
status: abgenommen mit Restfehlern (0 hoch, 1 mittel, 6 niedrig); Sozial nur Offline-/Code-Prüfung (Supabase friends 403)
---
# Live-Abnahme Paket 9 PR D + Nachprüfung A/B/C

## Nachprüfung (390 px)
| Punkte | behoben? | Screenshot |
|---|---|---|
| A1 / B2 Slice-Nähte | ja, keine Haarlinien mehr bei 3× | xa/05_hub.png, m390_s_achievements.png |
| A2 English-Knopf | ja (blau, helle Schrift) | xa/02_sprache.png |
| A3 Log-Sheet unter wx-chip | ja | xa/07_log_voll.png |
| A4, A5, A7, A10, A11, A12 | ja | xa/05_hub.png, xa/03_starter_gewaehlt.png, xa/06_kapitel_offen.png |
| A6 Starter-Wertebalken | **nein**, s. R1 | xa/03_starter_gewaehlt.png |
| A8 Hinweis in Holz-Leiste | teilweise (hell, lesbar), s. R2 | xa/02_name_leer_fokus.png |
| A9 Log-Zeilen | teilweise (3 Zeilen), s. R3 | xa/05_hub.png |
| B1 Truhen-Siegel | ja (dunkle Bühne, Siegel sichtbar) | xb/09_oeffnen_500/1200/2200.png |
| B3, B5, B8, B9, B12 | ja | xb/03_status_tip.png, xb/05_kodex.png, xb/06_aktivitaeten_tage.png |
| B4 Aktivitäten-Dock | teilweise (1 Zeile), s. R4 | xb/06_aktivitaeten_tage.png |
| B6 Synergien/Team | teilweise (Synergien hell im Panel), s. R5 | xb/04_team.png |
| B7 konter-label | ja (Code: ui-kit.css:1288–1296, Gold-Slices 36 30) | – |
| B10, B11 | B10 ok; B11 Rad weiter gesperrt im Testlauf | xb/08_truhen.png, xb/10_rad.png |
| C1, C2, C3, C5, C6, C7 | ja | m390_s_achievements/shop/map/tower.png |
| C4 Rang-Tabs | ja (Raster), Kleinigkeit s. R6 | m390_s_ranks.png |
| C8 | weiter gesperrt (nur Sperr-Ansicht) | m390_s_arena/expedition/tree.png |

## Restfehler
| # | Prio | Befund | Datei:Zeile (Vermutung) |
|---|---|---|---|
| R1 | mittel | Starter-Wertebalken: Füllung nur als dünner roter Strich sichtbar, Werte nicht ablesbar (A6) | ui-kit.css:1054–1055 (Bahn 4 px/Füllung 3 px Randbild bei 18 px Höhe) → Höhe 24 px, Füllung `border-image-width 6px`, ohne dunkle Bahnmitte |
| R2 | niedrig | „Mindestens 2 Zeichen.“ klebt oben an/über der Holz-Leiste (Oberkante schneidet Schrift) | ui-kit.css:320–324 `margin-top` greift nicht, `.home-bar` border-width oben erhöhen |
| R3 | niedrig | Hub: Dock-Slots ragen über die Log-Oberkante, erste Log-Zeile halb verdeckt | ui-kit.css:1077–1086 `button.log` / :706 `.dock` (Abstand/Höhe) |
| R4 | niedrig | Aktivitäten-Dock: 5 Knöpfe in einer Zeile, „Glücksrad“ abgeschnitten („Glücksrac“) | ui-kit.css:1088 – Aktivitäten-Tabs eigene Zeile, Aktionen darunter |
| R5 | niedrig | Team: Bereich „PC · 0“ steht weiter auf Navy außerhalb des Panels | Team-Container in Panel-Gruppe (ui-kit.css Panel :36ff) |
| R6 | niedrig | Ränge: „Freunde“-Untertab berührt/überlappt die Tab-Zeile darüber | ui-kit.css Rank-Tabs (:414/:436-Gruppe) `margin-top` |
| R7 | niedrig | Erfolge: Icon im Knopf „Titel“ überlappt die Beschriftung | adventure.css:189 `.achieve button` + ui-kit Button-Gruppe (Icon über Text stellen wie „Rahmen“) |

## PR D Sozial (Freunde, Tausch, Gilde, Chat)
- **Live:** Freunde bleibt bei „Die Freundesliste wird geöffnet.“ (`functions/v1/friends` 403), Tausch/Gilde/Chat zeigen „Offline …“-Panel. Diese Panels sind Kit-hell, korrekt, ohne Nähte (m390_s_social/trade/guild/chat.png).
- **Aus Code (nicht live sichtbar):** alle Klassen in view.ts:1672–1960 haben Kit-Regeln oder erben sie (friend-row, trade-card, trade-escrow, chat-line, chat-send, chat-form, guild-phrases, beast-card, hp-beast; Eingaben global ui-kit.css:528–539). Keine dunkle Fläche mehr offen (adventure.css:1838 `.friend-search input #10182c` wird von ui-kit.css:529 überschrieben). Online-Zustände bitte mit Konto/Netz nachprüfen.
- Hinweis: Optionen zeigt „Online“, Sozial-Screens „Offline“ – Textlogik, kein Grafikfehler.
