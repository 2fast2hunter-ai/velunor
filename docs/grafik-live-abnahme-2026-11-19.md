---
datum: 2026-11-19
quelle: Smettbo · Live-Abnahme Grafik P1–P7, main 103ed88, https://2fast2hunter-ai.github.io/velunor/ (headless Chrome, anonymer Neustart, Starter Funkfuchs, de-DE)
status: abgenommen mit Fehlern (1 hoch, 2 mittel, 4 niedrig)
---

# Live-Abnahme Grafik-Pakete 1–7

Screenshots: `m390_*` (390×844) und `d1280_*` (1280×800), gleiche 28 Bildschirme wie im Audit vom 19.11. Automatische Prüfung je Bildschirm: `m390_report.json`, `d1280_report.json` (kaputte Bilder, Inline-SVG, hochskalierte Bilder, ▲/▼-Text, HTTP-Fehler). Skript: `/workspace/webgame/assets/raw_src/paket3/audit.mjs`.

## Ergebnis Automatik
- **0 kaputte Bilder, 0 Asset-404** auf allen 56 Aufnahmen. Einziger HTTP-Fehler: `403 …supabase.co/functions/v1/friends` (Online-Backend, kein Grafikfehler).
- **0 Inline-SVG** mehr in `view.ts` (statisch geprüft) und auf keinem Bildschirm. Die gemeldeten `m-star` sind `<img>` (Fehlalarm der Prüfung).
- **0 ▲/▼ als Text**: Pfeile kommen als Bilder `stat_up`/`stat_down` (view.ts:572, 574, 615-616; app.ts:790).
- Hochskaliert ist nur `home/keyart_1080_lqip.jpg` (gewollt: unscharfer Platzhalter beim Laden).

## Sichtprüfung OK
Tab-Leiste, Mehr-Menü (9 neue Icons), HUD-Gold und Cloud, Weg-Knoten, Wetter-Chip und HUD-Wetter (PNG), runde Seltenheitsrahmen um Porträts, Regions-Nadeln, 8 Erfolgs-Kategorien, Forschungsturm- und Arena-Kopfbild, Turm-Symbole, Expeditionsorte und Stufenmarken, Tages-Tafel und Tagesrahmen, neue Spin-Taste. Desktop: Spalte mit Rahmenbild korrekt.

## Fehler

| # | Prio | Bildschirm | Befund | Vermutung Datei:Zeile | Screenshot |
|---|---|---|---|---|---|
| 1 | **hoch** | Expeditionen, Team, Kodex, Tagesaufgaben, Ranglisten, Wetter-Vorhersage, Tausch, Chat | Neue Inline-Bilder viel zu klein (Typ-Icon ≈ 8 css-px, Sterne ≈ 6 px, Tafel ≈ 130 px breit). Ursache: die Oberfläche ist auf ein ~1080-px-Raster ausgelegt und wird mit `--ui-scale` ≈ 0,36 verkleinert; meine Größenangaben in den Einbau-Dokus P3/P7 waren in Bildschirm-px gedacht. | adventure.css: `.type-icon` :382 und :1383-1387 → **56px**; `.guard-card .arrow, .wx-preview .arrow` :381 → **44px**; `.m-stars` :1719 height → **44px**, `.m-star` :1720-1725 → **40px**; `.wx img` :592 → **56px** (HUD :1072 passt); `.rank-badge` :1747 → **112px**, `.rank-badge.plain b` :1749 font → **40px**; `.daily-board` :1784 max-width → **960px**; `.escrow-art` :1836 → **400×120**; `.trade-lock img, .trade-escrow p img` :1838 → **64px**; `.trade-mark` :1839-1841 → **48px**; `.chat-icon` :1864 → **52px**, `.chat-form .chat-icon` :1865 → **60px** | m390_s_expedition.png, m390_s_codex.png, m390_s_team.png, m390_s_act_hort.png, m390_s_ranks.png |
| 2 | mittel | Kodex (Status „gesichtet“) | Porträt ist eine schwarze Scheibe statt Silhouette: `img.sil { filter: brightness(0) }` färbt auch den Verlaufs-Hintergrund von `.portrait` schwarz | adventure.css:588 + :140-141 → `img.portrait.sil { background: none; }` (Verlauf ggf. auf `.pframe` legen) | m390_s_codex.png (Nr. 11 Surrlibelle), d1280_s_codex.png |
| 3 | niedrig | Glücksrad | Gewinntabelle „3 Stern … 3 Funke“ nur Text, die neuen Walzen-Symbole erscheinen erst nach Freischaltung | view.ts:1049 `pay` → `${glyph(face.id)}` vor den Namen (Größe ~48px) | m390_s_act_wheel.png |
| 4 | niedrig | Ranglisten | Titelrahmen (`ranks/frame-*`) wirken klein alle wie gleiche dünne Ringe | Anzeigegröße in `frameGlyph()`-Ersatz (view.ts ~1420-1430) auf ≥ 96px, gesperrt nicht nur ausgrauen | m390_s_ranks.png |
| 5 | niedrig, schon im alten Audit | Ranglisten (unter den Tabs), Baum (unter „Setzen“), Expeditionskarte | leere weiße Knöpfe/Leisten ohne Text | unbeschriftete Buttons/Inputs ohne Klasse, view.ts Ranglisten ~1435-1450, Baum ~1585-1600, Expedition ~1695-1710 | m390_s_ranks.png, m390_s_tree.png, m390_s_expedition.png |
| 7 | mittel | Truhen öffnen (Enthüllung) | Neues Bannsiegel ist da (weich, rund) ✓, aber der farbige Lichtstrahl `.chest-beam` liegt in der Karten-Phase über Monster und Name (grauer/lila Balken quer durch den Namen) | adventure.css:1569-1579: `.chest-card { position: relative; z-index: 1; }`, `.chest-beam { z-index: 0; }` und in `[data-phase="card"]` opacity auf ~0.35 oder Strahl hinter das Monster legen | m390x3_chest_reveal.png |
| 6 | niedrig (Text) | Erfolge | Kategorie heißt noch „10/100/500 Fänge“, Titel „Bannmeister“, „Fänger“ (Fang-Wording) | achievements.ts:75-77 → an Lucario | m390_s_achievements.png |

## Nicht live prüfbar
Freunde, Tausch, Gilde, Chat, Arena-Kampf zeigen ohne Online-Konto nur Offline-/Ladetext (Supabase 403). Treuhand, Schloss, Chat-Icons, Gildenwappen, Weltenbiester, Freundescode-Karte, Ligen sind deshalb nur im Code geprüft (Pfade vorhanden, `uiArt.test.ts` grün laut Porygon). Regions-Szenen außer Grünmark und Wächter-Wappen wurden nicht erreicht (nach ~9 min bei ×3 erst Grünmark Schritt 14/20, Kodex 11/100, Erfolge 3/65); Rahmen „gold“ am Avatar und in Erfolgen sichtbar. `m390x3_*` sind Aufnahmen mit 3× Pixeldichte aus dem fortgeschrittenen Lauf.
