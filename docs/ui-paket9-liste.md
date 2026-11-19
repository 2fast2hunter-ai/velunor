---
datum: 2026-11-19
quelle: Smettbo · UI-Bestand Velunor Live-Build (https://2fast2hunter-ai.github.io/velunor/, main 75ffc40 „Store-Screenshots … (#88)“), headless Chrome 390×844 und 1280×800, de-DE, anonymer Neustart; Code-Abgleich adventure.css / view.ts (main 75ffc40)
status: Schritt 1 (Bestand) + Schritt 2 (UI-Kit) fertig, Einbau offen (Paket 9, Auftrag Fabian-Noel 19.11. 11:08)
---

# Velunor Paket 9 – UI-Bestand: ungestaltete Flächen

**Ergebnis:** Bis auf den Laden (Tab-Leiste und Angebotskarten mit Bildern) bestehen **alle** Flächen aus nackten CSS-Farben: Dunkelblau `#10182c`–`#24365f`, 1-px-Ränder `rgba(168,190,240,.22)`, Goldfläche `#f0c14a` als „primär“, Glas `rgba(8,12,24,.7–.9)` über der Kampfszene. Die Auswertung hat **154 verschiedene Flächen-Selektoren** auf 39 Aufnahmen (390 px) gezählt, davon 9 mit Bild (nur Laden). In `adventure.css` setzen **211 Regeln** Fläche, Rand oder Schatten, und nur **eine** davon nutzt ein Bild (`.shop-card` border-image, :1497).

Unten stehen **26 Bildschirme plus 1 Gruppe Popups/Sheets** mit **118 Flächen** (zusammengefasst nach gleicher Klasse). Die Zeilennummern gelten für `src/adventure/adventure.css` (= css) und `src/adventure/view.ts` (= view), Stand main 75ffc40.

- **Screenshots:** `audit/2026-11-19-ui-bestand/m390_*.png` (dazu `_full.png` als ganze Seite) und `d1280_*.png`.
- **Flächen-Rohdaten je Bildschirm:** `m390_surfaces.json` und `d1280_surfaces.json`, je Eintrag mit Klasse, Größe, Farbe, Rand und Radius.
- **Skripte:** `assets/raw_src/paket9/audit_ui.mjs` (Durchlauf) und `css_rules.py` (Regel-Liste).
- **Desktop 1280:** Der Aufbau ist gleich, weil das 1080er-Raster per `--ui-scale` skaliert wird und daneben `bg_frame_desktop` liegt. Es gibt dort keine eigenen Flächen. Was bei 390 px gestaltet ist, ist also auch bei 1280 px gestaltet.
- **(Code)** heißt: nicht live erreichbar, weil `functions/v1/friends` mit 403 antwortet (nur Konto/Offline-Text, siehe frühere Abnahme). Die Flächen sind aus view.ts und css abgeleitet.

**Kit-Kürzel** (Dateien in `assets/ui_kit/`, Maße und Slices in `ui_kit.json`):

| Kürzel | Datei(en) |
|---|---|
| Grund | panel/base |
| Erhaben | panel/raised |
| Eingelassen | panel/inset |
| Dialog | panel/dialog |
| Karte | panel/card |
| Glas | panel/glass |
| Zeile | panel/row, row_alt, row_selected |
| Tooltip | panel/tooltip + tooltip_tail |
| Leiste | bar/header |
| HUD | bar/hud_top |
| Tabbar | bar/tabbar |
| Tab | tab/active, tab/inactive, tab/bar |
| B-Prim, B-Sek, B-Gef, B-Gold | button/{primary, secondary, danger, gold}_{normal, hover, pressed, disabled} |
| B-Icon | button/icon_* |
| B-Zu | button/close_* |
| Badge | badge/{red, gold, green, blue} |
| Zähler | badge/counter |
| Chip | badge/chip |
| Eingabe | input/{normal, focus, error} + select_arrow |
| Schalter | control/toggle_* |
| Check | control/check_* |
| Regler | control/slider_* |
| Balken | progress/track + fill_* |
| Trenner | divider/line + star |
| Scroll | scroll/track + thumb |
| Kopf | dialog/head |
| Griff | dialog/grab |
| Muster | bg/pattern_night, bg/pattern_warm |

**Prio:** H = jede Sitzung sichtbar, M = häufig, N = selten oder nur online.

## 0 Global (gilt auf allen Bildschirmen)
| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 1 | Seiten-/Bühnen-Hintergrund | Hintergrund | `:root`, `html, body, #game` css:1, :12; `#stage` :71; `.band` :85; `#turn` :54 | Muster (night) | H | A |
| 2 | Allgemeine Karte | Panel | `.card` css:116 (+ Sammelregel :112) | Grund | H | A |
| 3 | Standard-Button | Button | `button, .primary, .ghost …` :122; `.row-actions button, .primary, .ghost` :618; `.primary` :625; `.ghost` :626; `.danger` :905 | B-Sek / B-Prim / B-Gef, ghost = B-Icon-Stil | H | A |
| 4 | Menü-Knöpfe allgemein | Button | `.menu button, .text-btn, .speed button, .choice, .mini button` :197; `.menu button.active` :205-208 | B-Sek bzw. Zeile | H | A |
| 5 | Eingabe/Select/Textarea | Eingabe | `textarea` :268; `.is-menu select, textarea, input` :1406; `.filters input/select/button` :610 | Eingabe (+ select_arrow) | M | A |
| 6 | Checkbox-Schalter | Schalter | `label.switch` css:1048, :1416 · view:1339-1352, :1694 (input checkbox) | Schalter/Check | M | A |
| 7 | Scrollbalken | Scroll | `.menu-scroll` :110, `.sheet-body` :1430 (ohne Styling, nativer Balken) | Scroll | M | A |
| 8 | Trennlinien | Trenner | `.achieve` :187, `.shop-row, .fruit-row` :271, `.list-row` :1393, `.daily-task, .daily-day` :1804 (border-bottom 1px) | Trenner | N | A |
| 9 | Überlagerung/Abdunklung | Hintergrund | `.overlay` :629 | bleibt CSS (Farbe → `rgba(30,18,8,.55)` warm) | M | E |
| 10 | Sheet-Körper (alle Popups) | Dialog | `.modal, .sheet` :641, :130; Griff `.sheet-handle` :1440 / `.sheet-grab` :1432 | Dialog + Griff | H | A |
| 11 | Tooltips | Tooltip | `.combo-tip` :294, `.status-tip` :502 | Tooltip | M | B |

## 1 Ladebildschirm (`loadingHtml` view:2256) – m390_00_laden

| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 12 | Ladebalken | Balken | `.boot-track` css:753, `span` :754 | Balken (gold) | H | A |

## 2 Start / Zustimmung / Weiter (view:2189 `continueHtml`, Cloud-Zustimmung view:1433) – m390_01_start, 01b_consent

| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 13 | Startseiten-Hintergrund | Hintergrund | `.home` css:667 (radial-gradient) | Muster (night) unter Key-Art | H | A |
| 14 | Titelkopf | Leiste | `.home-hero` :680 | Leiste | M | A |
| 15 | Weiter-Karte | Karte | `.continue-card` :850 | Karte | H | A |
| 16 | Überschreiben-Dialog | Dialog | `.overwrite` :876, `.overwrite-card` :885, `.overwrite-card .primary, .danger` :896 | Dialog + B-Prim/B-Gef | N | E |
| 17 | Zustimmungs-Sheet „Ja/Nein“ | Dialog/Button | `#cloud-layer .sheet` view:1433, `.choice-row button` css:1662, `.primary` :1692 | Dialog + B-Sek/B-Prim | H | A |
| 18 | Sprach-Chip | Button | `.lang-chip` :794 (Sammelregel) | Chip + B-Icon | M | A |
| 19 | Sprach-Auswahl | Dialog/Liste | `.lang-sheet` :1033, `.lang-sheet button(.primary)` :794, :1046 – m390_02_popup_sprache | Dialog + Zeile/Zeile gewählt | N | A |

## 3 Onboarding Name + Avatar (view:2311 `nameStepHtml`) – m390_02_onb_start, 02_avatar_name

| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 20 | Namensfeld | Eingabe | `.name-row input` css:802 | Eingabe (Fokus/Fehler) | H | A |
| 21 | Würfel-/Zufall-Knopf | Button | `.dice`, `.look-dice` :794 | B-Icon | H | A |
| 22 | Avatar-Vorschau | Panel | `.look-preview` :819 | Eingelassen (rund) | H | A |
| 23 | Aussehen-Auswahl | Button/Tab | `.look-choice` :794, `[aria-pressed=true]` :837; Farbmuster `.swatch` :836 | Chip / Chip + Rahmen gewählt | H | A |
| 24 | Zurück-Knopf | Button | `.home-back` :794 | B-Sek | H | A |
| 25 | Untere Leiste + Weiter | Leiste/Button | `.home-bar` :1017, `.home-bar .primary` :1018, `:disabled` :1032 | Tabbar-Stil + B-Prim (disabled) | H | A |

## 4 Starter wählen (view:2337, :2351) – m390_02_starter

| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 26 | Starter-Karte | Karte | `.starter-card` css:918, `.is-on` :933 | Karte (home/card_frame_* bleibt außen) | H | A |
| 27 | Typ-/Rollen-Chip | Chip | `.starter-chip` :960 | Chip | H | A |
| 28 | Werte-Balken | Balken | `.starter-track` :976, `span` :977 | Balken (Typfarbe → fill_red/blue/green) | H | A |
| 29 | „… wählen“-Knopf | Button | `.starter-choose` :978, `.is-on` :988 | B-Sek → B-Prim | H | A |
| 30 | Seiten-Punkte | Badge | `.starter-dot span` :999-1000 | Badge (klein) | N | A |

## 5 Hub / Kampf (view:380 `header`, :393, :458, :478, :540) – m390_03_hub_kampf, 02_kampf_erst

| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 31 | HUD oben | Leiste | `.hud` css:128, :1055; `.hud-gold, .hud-wx` :1069 · view:384-388 | HUD + Zähler | H | A |
| 32 | Cloud-Chip | Button | `.cloud-chip, .cloud-mark` :1604 | B-Icon | H | A |
| 33 | Kapitel-Leiste | Leiste | `.chapter-line` :1075 · view:399 | Leiste | H | A |
| 34 | Weg-Leiste + Knoten | Panel/Badge | `.card.path` (Sammel) :116; `.node` :232, `.is-here` :243, `.is-done` :244 | Eingelassen + Chip/Badge gold | H | A |
| 35 | Wetter-Chip in Szene | Leiste | `.wx-chip` :360 | Glas | H | B |
| 36 | Kampfstatus-Zeile | Leiste | `.battle-status` :522 | Glas | H | B |
| 37 | Sieg-Banner | Leiste | `.victory` :424 | Glas (+ Goldschrift) | H | B |
| 38 | Namensband | Leiste | `.name-banner` :414 | Glas | H | B |
| 39 | HP-/Ult-Balken | Balken | `.hp` :471, `.hp span` :479; `.ult` :480, `::before` :486; `.ult.is-locked` | Balken (fill_green/red, fill_purple) | H | B |
| 40 | Wächter-Karte/-Vorschau | Karte | `.guard-card` :375, `.ult` :391; `.mech-row` :397; `.konter-label` :406 | Glas + Badge gold | H | B |
| 41 | Boss-Intro / Zugbanner | Dialog | `.boss-intro` :418, `.move-banner` :445 | Glas + Kopf | M | B |
| 42 | Status-Marke | Badge | `.status-mark` :497, `.combo-mark` :289 | Badge / B-Icon klein | M | B |
| 43 | Tempo-Knöpfe ×1/×2/×3 | Button | `.speed button` :150, :197, `.on` :564 · view:568 | B-Icon (pressed = aktiv) | H | B |
| 44 | „Wächter herausfordern“ | Button | `.primary.challenge-fab` :535 | B-Gold | H | B |
| 45 | Team-Dock-Slots | Panel | `.mini` :312, `.is-active` :329, `.mini .bar` :332-333; `span.mini.is-empty` | Erhaben (Dock) + Eingelassen (Slot) + Balken | H | B |
| 46 | Log-Kasten | Panel | `button.card.log` :566 | Grund | H | A |
| 47 | „Spuren hier“-Griff | Leiste | `.grip` :1101, `.grip-pill` :1117 · view:689 | Zeile + Griff | H | A |
| 48 | Tab-Leiste unten | Leiste/Tab | `.tabbar` :129, :1119; `.tab` :1130, `.tab.active` :1158 · view:413-428 | Tabbar + Tab aktiv + Badge | H | A |
| 49 | Sichtungen-Liste | Liste | `.sight-row img` :580; `.seal-ring` :581 | Zeile | M | B |
| 50 | Wetter-Vorhersage | Liste | `.forecast .now` :595 | Zeile gewählt | N | B |

## 6 Karte / Fortschritt (view:704 `progress`, :1952 map-sheet) – m390_s_map, s_progress

| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 51 | Karten-Sheet | Dialog | `.map-sheet.card` :112, :1160, :1178 | Dialog | M | C |
| 52 | Regions-Knöpfe | Tab | `[data-act=region]` (Sammel :1178), `.primary` aktiv | Tab aktiv/inaktiv | M | C |
| 53 | Kapitel-Zeilen | Liste | `.text-btn[data-act=travel]` :197 | Zeile / Zeile gewählt („hier“) | M | C |
| 54 | Fortschritts-Panel | Panel | `.card.panel` (Fortschritt) :116, `.progress-track` :1050-1051 | Grund + Balken | M | C |

## 7 Team / PC (view:841 `team`, :778) – m390_s_team, s_team_filter

| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 55 | Monster-Karte (Team/PC) | Karte | `.mon-card` :599, :1342, `.on` :608, :1346 | Karte / Zeile gewählt (Goldrahmen) | H | B |
| 56 | Leerer Slot | Panel | `.mon-card.slot` :1290, `.slot-ghost` :1302 | Eingelassen | H | B |
| 57 | Synergie-Wahl | Button | `.synergy-pick` :1246, `.on` :1263; `.synergy-auto` :1265, `.on` :1274 | Chip / Check | M | B |
| 58 | Aktions-Knöpfe (Nach vorn, Ins Team, PC, Karte) | Button | `.menu-dock > button, .filter-bar, .list-actions button, .is-menu .row-actions button` :1210, `.primary` :1401 | B-Sek / B-Prim | H | B |
| 59 | Dock-Leiste | Leiste | `.menu-dock` :1202 | Tabbar-Stil (bar/tabbar) | H | B |
| 60 | Filter-Leiste + Sheet | Leiste/Dialog | `.filter-bar` :1210; `.filter-sheet.open .filter-body` :1350; Felder `.filter-body input/select/button` :1366 | Leiste + Dialog + Eingabe | M | B |

## 8 Kodex (view:898 `codex`, :2114) – m390_s_codex, s_popup_dex

| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 61 | Kodex-Kachel | Karte | `button.mon-card[act=dex]` :599 (+ :1342) | Karte (gesperrt = disabled-Ton) | H | B |
| 62 | Kodex-Fortschritt | Balken | `.progress-track` :1050 | Balken (gold) | M | B |
| 63 | Eintrag-Sheet Werte | Panel | `.stat` :659, `.bar-exp` :660-661 | Eingelassen + Balken (blue) | M | B |

## 9 Aktivitäten: Tagesaufgaben + Hort (view:1077, :1134, :1175) – m390_s_activities, s_act_hort

| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 64 | Aktivitäten-Tabs | Tab | `button[act=activity]`, `.primary[act=activity]` (Sammel :618/:625) · view:999 | Tab + tab/bar | H | B |
| 65 | Tages-Karte | Panel | `section.card.panel.daily-card` :1801 | Grund (daily/board bleibt) | H | B |
| 66 | Tages-Felder 1–7 | Karte | `.daily-day` :1810, `.on` :1811 | Erhaben / Zeile gewählt | H | B |
| 67 | Tagesrahmen-Knöpfe | Button | `.daily-frame-btn` :1813, `.on` :1818 | Chip | M | B |
| 68 | Hort-Knöpfe + Platz kaufen | Button | `[act=to-hort/from-hort]` :1210; `.primary.dock-primary[act=buy-hort]` :1401 | B-Sek / B-Gold | M | B |

## 10 Truhen / Lootbox (view:1033, :1012, :1018, Sheet view:2034) – m390_s_act_chests, s_popup_truhenquote

| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 69 | Truhen-Kachel | Karte | `article.chest-tile` :1553 | Karte (Gold-/Silber-Ton je Truhe) | H | B |
| 70 | Öffnen / Alle / Einsammeln | Button | `.primary[act=chest-open]`, `.ghost[act=chest-all]`, `.primary[act=chest-claim]` (:618-626) | B-Prim / B-Sek / B-Gold | H | B |
| 71 | „Raten“-Knopf | Button | `.chest-info` :1561 | B-Sek klein + Badge | M | B |
| 72 | Herstellen-Kachel | Karte | `button[act=craft]` (Sammel :1754) | Erhaben | M | B |
| 73 | Quoten-Liste (Sheet) | Liste | `.rate-list` :1563-1565 · view:2022, :2027 | Dialog + Zeile/Zeile 2 | M | B |
| 74 | Enthüllung (Karte, Strahl) | Karte | `.chest-sheet` view:2034, `.chest-beam` :1570, `.chest-ring i` :1588 | Karte (Strahl/Ring bleiben FX) | H | B |

## 11 Glücksrad (view:1083 `wheelView`) – m390_s_act_wheel

| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 75 | Walzen | Panel | `.reel` :274 | Eingelassen | M | B |
| 76 | Drehen / Preis kaufen | Button | `.primary.dock-primary[act=spin]`, `.primary[act=buy-prize]` | B-Gold / B-Prim | M | B |
| 77 | Gewinntabelle | Liste | `.wheel` Zeilen :1419-1421 | Zeile | N | B |

## 12 Mehr-Menü (view:430 `moreSheet`) – m390_s_more_sheet

| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 78 | Mehr-Sheet | Dialog | `.more-sheet.card` :1160, :1169 | Dialog + Griff | H | A |
| 79 | Menü-Zeilen (13) | Liste | `.more-sheet button` :1170, :1178 | Zeile + Icon | H | A |

## 13 Laden (view:966, :946) – m390_s_shop, s_popup_shopinfo  *(teilweise gestaltet)*

| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 80 | Geldbörse | Leiste | `.wallet` :1460 (+ :125) | Zähler | H | C |
| 81 | Laden-Tabs | Tab | `.shop-tabs` :1463-1483 (shop/tab_*.png, **bereits Bild**) | Tab (auf Kit umstellen, gleicher Look) | N | C |
| 82 | Angebotskarte | Karte | `.shop-card` :1487-1499 (card_frame_soft, **bereits Bild**), Innen `#1a160f` | Karte (Innenfläche hell) | M | C |
| 83 | Kaufen-Knopf | Button | `.shop-buy` :1539, `.can` :1540, `.blocked` :1541 | B-Gold / B-Gold disabled | H | C |
| 84 | Truhen-Lager-Leiste | Leiste | `.shop-stock` :1543 | Zeile | M | C |
| 85 | Hinweis-Toast | Tooltip | `.shop-toast` :1547 · view:979 | Tooltip / B-Gold | M | C |
| 86 | Info/Bestätigen-Sheet | Dialog | `.shop-sheet` :1545, `.shop-confirm` :1546 · view:2005, :2012 | Dialog + Kopf + B-Prim/B-Sek | M | C |

## 14 Erfolge (view:1230) – m390_s_achievements

| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 87 | Erfolgs-Zeile | Liste | `.achieve` :187, `.done` :188 | Zeile / Zeile gewählt + Balken | M | C |
| 88 | Titel/Rahmen anlegen | Button | `.achieve button` :189; `[act=equip-title/equip-frame]` (Sammel :1754) | B-Sek / Tab | M | C |

## 15 Ranglisten (view:1471) – m390_s_ranks

| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 89 | Ranglisten-Tabs | Tab | `.rank-tabs button` :1747, `.on` :1748, :1766 | Tab | M | C |
| 90 | Rang-Zeile | Liste | `.rank-row` :1749, `.is-me` :1750 | Zeile / Zeile gewählt | M | C |
| 91 | leere weiße Knöpfe (alter Befund 5) | Button | unbeschriftete Buttons view:~1435-1450 | B-Sek (oder entfernen) | N | C |

## 16 Meisterschaftsbaum (view:1608) – m390_s_tree

| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 92 | Baum-Knoten | Button | `.tree-node` :1775, `.owned` :1776, `.on` :1777 | Chip / Badge / Zeile gewählt | M | C |
| 93 | Detail-Kasten | Panel | `.tree-detail` :1822 | Eingelassen | M | C |
| 94 | Setzen / Umbau | Button | `.primary[act=tree-buy]`, `[act=tree-reset]` | B-Prim / B-Sek | M | C |

## 17 Forschungsturm (view:1573) – m390_s_tower

| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 95 | Turm-Panel | Panel | `.card.panel.tower-screen` :116 | Grund (+ Kopfbild tower/screen) | M | C |
| 96 | Stockwerk-Karte | Karte | `.tower-floor` :1779, `.running` :1788, `.primary` :1795 | Erhaben / Zeile gewählt + B-Prim | M | C |
| 97 | Stufen-Punkte | Badge | `.tower-pips i` :1792-1793 | Badge (klein) | N | C |

## 18 Expedition (view:1725) – m390_s_expedition

| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 98 | Expeditions-Karte | Karte | `.expedition-card` :1843, `.on` :1844 | Karte / gewählt | M | C |
| 99 | Schicken/Bank-Knöpfe | Button | `.expedition-card button:not(.primary)`, `.expedition-bench button` :1754-1756 | B-Sek / B-Prim | M | C |

## 19 Arena (view:1512) – m390_s_arena *(Code, online 403)*

| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 100 | Ligen-Abzeichen-Kästen | Karte | `.league-item` :1824 | Erhaben | N | C |
| 101 | Arena-Slots | Panel | `.arena-slot` :1824-1826 | Eingelassen | N | C |
| 102 | Vorschlags-Karten / Wiederholung | Karte | `.arena-card` :1824, `.arena-replay` :1828 | Karte / Grund | N | C |

## 20 Freunde + Koop (view:1663 `socialScreen`) – m390_s_social *(Code, online 403)*

| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 103 | Freundes-Zeile / Anfrage | Liste | `.friend-row` :1838 · view:1671, :1679 | Zeile | M | D |
| 104 | Suche | Eingabe | `.friend-search input` :1837 | Eingabe | M | D |
| 105 | Weltenbiest-Karte + HP | Karte/Balken | `.beast-card` :1838, `.hp-beast` :1840-1841 · view:1699 | Karte + Balken (red) | M | D |
| 106 | Koop-Knöpfe | Button | `[act=coop-attempt]` (.primary), `[act=coop-claim]` view:1706-1707 | B-Gold / B-Sek | M | D |
| 107 | Online-Schalter | Schalter | `label.switch` view:1694 | Schalter | N | D |

## 21 Tausch (view:1774) – m390_s_trade *(Code, online 403)*

| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 108 | Tausch-Brett | Panel | `.card.panel.trade-board` view:1780 | Grund | N | D |
| 109 | Tausch-Karte (leer/belegt) | Karte | `.trade-card` :1851-1852 · view:1765-1767 | Karte / Eingelassen (leer) | N | D |
| 110 | Treuhand-Leiste | Leiste | `.trade-escrow` :1853-1855 | Eingelassen | N | D |

## 22 Gilde (view:1819, :1861) – m390_s_guild *(Code, online 403)*

| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 111 | Gilden-Brett + Mitglieder | Panel/Liste | `.card.panel.guild-board` view:1840; Zeilen `.friend-row` view:1837-1839 | Grund + Zeile | N | D |
| 112 | Satz-Knöpfe / Gründen-Form | Button/Eingabe | `.guild-phrases` :1879; Gründen-Felder view:1861-1885 (`.is-menu input` :1406) | Chip + Eingabe | N | D |

## 23 Chat (view:1886) – m390_s_chat *(Code, online 403)*

| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 113 | Kanal-Tabs | Tab | `[act=chat-channel]` view:1886-1905 | Tab | N | D |
| 114 | Chat-Zeile | Liste | `.chat-line` :1883 · view:1906 | Zeile (eigene = Zeile gewählt) | N | D |
| 115 | Eingabe-Zeile | Eingabe/Leiste | `.chat-form` :1881, `input` :1882 · view:1921 | Leiste + Eingabe + B-Icon (chat/send) | N | D |

## 24 Einstellungen + Konto (view:1319, :1274) – m390_s_options

| # | Fläche | Typ | Selektor · Ort | Kit-Teil | Prio | PR |
|---|---|---|---|---|---|---|
| 116 | Konto-/Cloud-Karte | Panel | `.card.panel.cloud-card` :1286 view, css `.cloud-card .offline-note, .cloud-notice` :1644, `.cloud-preview` :1712, `.shadow-note` :1674 | Grund + Eingelassen (Hinweise) | M | E |
| 117 | Knöpfe Konto/Optionen | Button | `.cloud-card button, #cloud-layer button, .cloud-block` :1703, `.primary` :1709, `.danger` :1710; Wahl-Reihen `[act=speed/font/power/lang]` (`.primary` = aktiv) | B-Sek / B-Prim / B-Gef; Wahl-Reihen = Tab | M | E |
| 118 | E-Mail-Feld | Eingabe | `.cloud-mail input, .cloud-card input, #cloud-layer input` :1653 | Eingabe | N | E |
| – | Schalter-Zeilen (9) | Schalter | `label.switch` view:1339-1352 | Schalter (s. #6) | M | E |
| – | Export/Zurücksetzen/Links | Button | `.ghost[act=export-save/reset]`, `a.ghost` :626 | B-Sek / Trenner | N | E |

## 25 Anleitung (view:1443) – m390_s_guide
Nur Text in `.card.panel` → Grund + Trenner (#2, #8), PR E.

## 26 Popups / Sheets (view:1388 `cloudLayerHtml`, :1990 `overlayHtml`, :2144 `card`)
Alle nutzen `.sheet` (#10). Sie bekommen Dialog + Kopf + B-Zu + Griff, ihre Knöpfe B-Prim und `.ghost` B-Sek. Aufgenommen: Sprache, Log, Team-Filter, Kodex-Eintrag, Truhen-Quoten, Laden-Info, Zurücksetzen (m390_*_popup_*). Die übrigen sind aus dem Code abgeleitet:
- **Cloud:** löschen, melden, Name, Konflikt, Zustimmung (view:1391-1433, Konflikt mit `.cloud-preview` :1712)
- **Laden:** Wisch-Gold, Angebot, Bestätigen (view:1994-2012)
- **Truhen:** Quoten, Zusammenfassung, Enthüllung (view:2022-2034)
- **Log voll:** view:2051, `.log-full` :1187
- **Offline-Fortschritt:** view:2055, mit Balken
- **Beenden und Zurücksetzen:** view:2058/2061
- **Erwachen, Willkommen, Wächter-Ergebnis und Neues Monster:** view:2066-2123, `.kicker` :195 → Kopf
- **Monsterkarte voll:** view:2146-2154, `.sheet-full` :1423
- **Meisterschafts-Toast:** `.mastery-toast` :1731 → Tooltip (hell)

## PR-Vorschlag (5 PRs, je ein PR über Porygon, Magnetilo prüft)
| PR | Inhalt | Flächen (#) | Prio |
|---|---|---|---|
| **A – Grund-Kit + Hub/Navi + Einstieg** | `assets/ui_kit/` komplett, CSS-Variablen + Basisklassen (Karte, Button-Zustände, Eingabe, Schalter, Scroll, Trenner, Sheet, Griff), Hintergrund-Muster; HUD, Kapitel-Leiste, Weg, Log, Spuren-Griff, Tab-Leiste, Mehr-Menü; Laden-/Start-/Onboarding-/Starter-Flächen | 1–8, 10, 12–34, 46–48, 78–79 | H |
| **B – Kampf, Team, Kodex, Aktivitäten (Truhen, Rad, Tage, Hort)** | Glas-Flächen in der Kampfszene, Balken, Tempo-Knöpfe, Dock; Monster-Karten, Filter; Kodex; Truhen-Kacheln + Quoten + Enthüllung; Rad; Tagesaufgaben | 11, 35–45, 49–50, 55–77 | H |
| **C – Laden, Erfolge, Ränge, Baum, Turm, Expedition, Arena, Karte** | Geldbörse, Kaufen, Laden-Sheets; Rang-Tabs/-Zeilen; Baum-Knoten; Turm-Stockwerke; Expeditions-Karten; Arena | 51–54, 80–102 | M |
| **D – Sozial: Freunde/Koop, Tausch, Gilde, Chat** | Zeilen, Suche, Biest-Karte, Tausch-Karten/Treuhand, Gilden-Brett, Chat-Zeilen + Eingabe | 103–115 | N (online) |
| **E – Einstellungen + alle Popups** | Konto-Karte, Wahl-Reihen, Schalter-Zeilen, alle Sheets mit Kopf + Schließen, Überschreiben, Toasts | 9, 16, 116–118, Abschnitt 26 | M |

**Technischer Hinweis für Porygon:** Die Kit-Teile sind in UI-px (1080er Raster) gezeichnet, also `border-image-width` = Slice-Wert in px (siehe `ui-kit-einbau.md`). Auf hellen Flächen wird der Text dunkel (`#4a2c17`). Auf Holz, Blau und Glas bleibt er hell (`#fff3dc`) mit brauner Kontur. Das ist die größte sichtbare Änderung, deshalb gehört sie in PR A zu den Basisklassen, damit PR B–E nur noch Klassen zuordnen.
