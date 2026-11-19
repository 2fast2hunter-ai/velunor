---
datum: 2026-11-19
quelle: Smettbo · Live-Abnahme Paket 9 PR A (#92, main 5ade706, index-C1wUnvgF.js), https://2fast2hunter-ai.github.io/velunor/, headless Chrome 390×844 (1× und 3×) und 1280×800, de-DE, anonymer Neustart
status: abgenommen mit Fehlern (3 hoch, 5 mittel, 4 niedrig)
---

# Live-Abnahme Paket 9 PR A

**Screenshots:**
- `m390_*.png` / `d1280_*.png`: alle Bildschirme mit Flächen-Daten `*_surfaces.json`, Skript `assets/raw_src/paket9/audit_ui.mjs` mit `OUT=…/2026-11-19-pr-a`.
- `x3/*.png`: PR-A-Bildschirme mit 3× Pixeldichte für die Schärfe- und Slice-Prüfung, Skript `assets/raw_src/paket9/pra_dpr3.mjs`. Gezeigt werden Start/Zustimmung, Name/Avatar, Fokus/Fehler, Sprache, Starter, Hub, Kapitel offen, Log voll, Spuren, Mehr und Team.
- **Vorschau:** `assets/preview_pr_a_live.jpg`.

**Gesamteindruck:** Die Bildschirme wirken wie im Mock-up: Holz-HUD in zwei Zeilen, Kapitel-Leiste, Weg-Chips, helles Log, Tab-Leiste mit aktivem Creme-Tab, Mehr-Menü als Zeilen-Liste, Onboarding mit Chips und Eingabe, Zustimmung als Dialog. Die Automatik findet 0 kaputte Bilder und 0 Asset-404. Einziger HTTP-Fehler ist wie bisher `403 …/functions/v1/friends`. Auf hellen Flächen ist der Text überall `#4a2c17`.

## Fehler

| # | Prio | Bildschirm | Befund | Vermutung Datei:Zeile | Screenshot |
|---|---|---|---|---|---|
| 1 | **hoch** | alle Kit-Flächen (Log, Kapitel-Leiste, Weg, Eingabe, Tabs, Mehr-Zeilen, Dialog) | **Slice-Nähte:** 1-px graue Haarlinien an den Slice-Grenzen, waagrecht unter der oberen und senkrecht neben der linken/rechten Kante. Gemessen im Log: Zeile `rgb(198,193,186)` mitten im Creme. Chrome zeichnet die 9 Teile unter `transform: scale(--ui-scale)` auf Bruch-Pixel, dazwischen scheint der dunkle Hintergrund durch. | `ui-kit.css` alle Gruppen ab :33 (`background: none !important`). Abhilfe: unter jede helle Fläche eine Grundfarbe legen, die die Fugen füllt, z. B. `.card, button.log, .kit-panel { background: #fbf2df padding-box !important; border-radius: 24px !important; }` (Radius klippt nur die Hintergrundfarbe, nicht das border-image). Je Gruppe die passende Mittelfarbe: Zeile `#fbf3e2`, Eingabe `#f8ecd4`, Holz `#a86a36`, Tab inaktiv `#d2a46a`. Alternativ `border-image-width` auf ganze Vielfache von 1/`--ui-scale` runden (unsicher). | x3/05_hub.png (Log, Weg), x3/02_name_leer_fokus.png (Eingabe) |
| 2 | **hoch** | Sprache wählen (Onboarding und Optionen) | Knopf „English“ (nicht aktiv) ist dunkelblau `#1b2744` mit dunkler Schrift `#4a2c17`, also nicht lesbar. ui-kit.css stylt nur `.lang-sheet button.primary`. | `ui-kit.css` :142-153: `.lang-sheet button:not(.primary)` in die Button-Gruppe aufnehmen (sekundär). Alt: `adventure.css:794` + :1045 | x3/02_sprache.png |
| 3 | **hoch** | Log voll (Sheet über dem Kampf) | Wetter-Chip und Kampfstatus liegen **über** dem Sheet und verdecken die Überschrift „Ereignisprotokoll“. | `adventure.css:629/637` `.overlay { z-index: 6 }` liegt unter `.battle-status`/Kampf-HUD (z 7–9, :352, :412, :503). `.overlay` auf `z-index: 20` setzen. | x3/07_log_voll.png |
| 4 | mittel | alle Leisten/Panels im Vergleich | **Ungleich dicke Konturen und gestauchte Ecken:** Die `border-image-width` sind je Teil verschieden stark verkleinert. Panel ca. 0,56×, Header 0,29/0,37/0,28×, HUD 0,58/0,44/0,31×, Weg-Chip 0,39×. Dadurch hat die Kapitel-Leiste eine halb so dicke Kontur wie das Log darunter, die HUD-Unterlippe ist gestaucht, und die Header-Ecken sind leicht oval. Gegenüber dem Mock-up wirken Kontur und Glanz hier „dünn“. | `ui-kit.css` :46/:64 (Panel 36/28), :256 (HUD `14px 28px 22px`), :290 (Header `16px 22px 18px`), :318 (Tabbar), :332 (Tab `18 16 8`), :361 (Chip `14 16`). Einen gemeinsamen Faktor nehmen, z. B. **0,5 × Slice** und gleichmäßig auf alle Seiten: HUD `12 32 36`, Header `28 30 32`, Tab `28 28 12`, Chip `18 20 20`, Panel 32, Inset 32, Dialog 36 | x3/05_hub.png (HUD/Kapitel/Log), preview_ui_kit.jpg |
| 5 | mittel | Weg-Knoten (aktueller Knoten) | `.node.is-here` nimmt `badge/gold` (72×72, Slice 36/30) mit den Chip-Slices `36 40 40 40`. Links und rechts überlappen die Slices (80 > 72): goldene Halbkreise an den Enden, cremefarbene Mitte. Dazu kommt ein eckiger dunkler `outline` darum. | `ui-kit.css` :367-369 (Slice für Gold-Badge `36 30 fill`, Breite `14px 12px`) und :224 (`outline` entfernen; aktiv reicht Gold) | x3/05_hub.png Knoten 3 |
| 6 | mittel | Starter (Desktop 1280, auch 390 leicht) | Werte-Balken (HP/Angriff/Tempo) werden bei schmalen Karten zu leeren Pillen. Die Füllung ist kaum oder nicht sichtbar, weil `border-width: 0 18px` die schmale Bahn auffrisst. Die Typfarbe der Füllung ist verloren, jetzt grün für alle. | `ui-kit.css` :442-457 (Bahn `border-width 0 18px` → `0 10px`, `border-image-width 10px`), :458-473 (Füllung `min-width` 20px; Farbe je Typ: `.starter-card[data-type=fire] .starter-track span { border-image-source: var(--kit-progress-fill-red) }` usw.) | d1280_02_starter.png |
| 7 | mittel | Starter (390 und 1280) | Karte bleibt **dunkelblau** (`.starter-card` ist in der Liste #26 für PR A vorgesehen). Der grüne „Gewählt“-/„… wählen“-Knopf wird unten vom Kartenrand abgeschnitten. | `adventure.css:918` (`#16223c`) → Kit-Karte oder Innenfläche `panel/card`; Knopf: `ui-kit.css` :146-170 Höhe mit `border-width 16 22 18` + `min-height` der Karte; `starter-card` `padding-bottom` +24px | x3/03_starter_gewaehlt.png, d1280_02_starter.png |
| 8 | mittel | Name (Fehler) und Starter-Hinweis | Hinweistext in der Holz-Leiste unten („Mindestens 2 Zeichen.“, „Wähle zuerst einen Starter“) ist dunkelbraun auf Holz. Kontrast ca. 3:1, und der Text klebt an der Oberkante der Leiste. | `ui-kit.css:223` `.home-bar .home-reason` → `color: var(--ink-light); text-shadow: var(--ink-shadow)`; `.home-bar` `border-width` oben :313 18px → 28px oder `.home-reason { margin-top: 12px }` | x3/02_name_leer_fokus.png, m390_02_avatar_name.png |
| 9 | niedrig | Log-Kasten im Hub | Nur noch eine Logzeile sichtbar (vorher zwei), das Schriftrollen-Icon steht in eigener Zeile über dem Text. Der Platz geht an `border-width 18px` und Fredoka-Zeilenhöhe. | `ui-kit.css:36` (`button.log`): `border-width: 12px 18px`; `adventure.css:566` `.log` Icon `float/inline` beibehalten | x3/05_hub.png |
| 10 | niedrig | Weg-Knoten | Nummern überlappen die kleinen Knoten-Icons (Chip-Ränder `8px 10px` engen ein). | `ui-kit.css:356` → `border-width 4px 8px`, `adventure.css:232-245` `.node small` Position | x3/05_hub.png |
| 11 | niedrig | HUD zweite Zeile | Gold und Kodex sitzen in dunklen Zähler-Pillen, Uhrzeit und Wetter darunter stehen frei auf Holz. Das ist ein uneinheitlicher Rhythmus, der Kontrast ist aber OK. | `ui-kit.css:264-266`: `.hud-clock, .hud-wx` mit in die Zähler-Gruppe | x3/05_hub.png |
| 12 | niedrig | Kapitel-Sheet | Kapitel-Zeilen (`.map-sheet .text-btn`) sind jetzt blaue Knöpfe, die Unterzeile „Lv 2–6, Cap 12 …“ ist dunkelbraun auf Blau (schwach). Region-Knöpfe bleiben dunkelblau (PR C). | `ui-kit.css:151` (`.text-btn` in Button-Gruppe) → `.map-sheet .text-btn` als **Zeile** (`panel/row`, `row_selected` für „hier“); Unterzeile `var(--ink-soft)` | x3/06_kapitel_offen.png |

## Erwartete Stilbrüche (spätere PRs, kein Fehler von PR A)
- **PR B:** Kampfstatus, Wetter-Chip, Sieg-Banner, Namensband (alt: dunkles Glas), Tempo-Knöpfe ×1–×3, Team-Dock-Slots, Team/PC-Karten und Synergien.
- **PR C:** Region-Knöpfe im Kapitel-Sheet.
- **Alle übrigen Menüs:** Dort stehen noch dunkle Karten direkt neben den neuen hellen Flächen. Am deutlichsten ist das auf Team (x3/10_team_stilbruch.png).

## Nicht geprüft / Hinweise
- **Ladebildschirm:** Er war nicht zu fassen. Der Build lädt in unter 0,4 s, und auch mit 1,5 s Verzögerung je JS-Datei zeigte sich nur das Hintergrundmuster. Den Ladebalken (`ui-kit.css:442-473`, `.boot-track`) habe ich nur im Code geprüft.
- **Desktop 1280:** Es gibt keine eigenen Flächen. Rahmen, HUD, Mehr-Menü und Tab-Leiste skalieren mit. Die Starter-Karten sind auf Desktop (wie vorher) sehr schmal, siehe Befund 6/7.
- **Schärfe:** Die Kit-Teile sind bei 3× scharf, nichts ist hochskaliert. Unscharf wirken sie nur durch die dünnen Konturen aus Befund 4.

**Gegenprüfung main 4f6cbe2 (PR C, 12:15):** A12 behoben, alle übrigen Punkte unverändert (siehe ../2026-11-19-pr-c/ABNAHME.md).
