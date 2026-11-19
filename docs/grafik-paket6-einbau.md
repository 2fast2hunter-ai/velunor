---
datum: 2026-11-19
quelle: Smettbo (Grafik), Repo 2fast2hunter-ai/velunor main @ d67f904 (frischer Clone /tmp/velunor-p6), grafik-gesamtliste.md Zeilen 19, 20, 54, 55
status: Grafiken fertig, Einbau offen (Porygon, 1 PR)
---

# Velunor Grafik-Paket 6 – Fortschritt: Einbau

Alles per Code gezeichnet (`assets/raw_src/paket6/draw_paket6.py`, softlib.py, Stil wie Paket 2/4). Kein Ball-/Fang-Motiv.
Ablage → Repo: `assets/crests/*.webp` → `public/assets/crests/`, `assets/tree/*.webp` → `public/assets/tree/`, `assets/tower/{gold,ep,offline,expedition,egg,shard}.webp` → `public/assets/tower/` (die `.png` sind nur Quellen). Vorschau `assets/preview_paket6.jpg`.

## 1. Wächter-Wappen und Ratsiegel (45)

- Baukasten: 5 Regions-Schildformen (Grünmark Wappenschild grün + Blätter, Frostküste Oval blau + Stern, Glutgebirge Fünfeck orange + Flamme, Schattenmoor Spitzbogen violett + Perle, Himmelsthron Wolkenschild gold + Stern) × 8 Kapitel-Symbole passend zum Badge-Namen (Kiesel, Wellen, Funken …). Jedes der 40 Wappen ist eindeutig.
- 5 Ratsiegel: gezacktes Siegel in Regionsfarbe mit Bändern, Regionssymbol und 1–5 Punkten (Zweites/Drittes … Ratsiegel).
- Dateien: `crests/<slug>.webp` (128), `crests/<slug>@2x.webp` (256); Siegel `crests/ratsiegel_1…5`. Vollständige Zuordnung Badge → Datei: `assets/raw_src/paket6/crests.json`.
- Keys = `guardian.badge` aus `data/regions.json` (Vorhof/Urgrund haben kein eigenes Badge, `gateBadge()` route.ts:151 liefert für den Vorhof das Ratsiegel).

### Code
1. Neue Datei `src/adventure/crestArt.ts` = Kopie von `assets/raw_src/paket6/crestArt.ts` (`CREST_ART` + `crestArt(badge)`, Fallback `ui/achieve.webp`).
2. Wappen-Flug ohne achieve.webp:
   - `src/adventure/app.ts:2437` `crest.src = art(crestArt(badge))`
   - `src/adventure/app.ts:821` (Debug-Demo `sieg`) `crest.src = art(crestArt('Kieselwappen'))`
   - optional `srcset` mit `@2x`: `crest.srcset = \`${art(file)} 1x, ${art(file.replace('.webp', '@2x.webp'))} 2x\``
3. Fortschrittsliste `src/adventure/view.ts:679-683`: vor dem Text das Wappen zeigen
   ```ts
   const crest = chapter.special ? '' : `<img class="crest-mini${save.badges.includes(gateBadge(region.id, chapter)) ? '' : ' off'}" src="${art(crestArt(gateBadge(region.id, chapter)))}" alt=""/>`
   ```
   und in der Zeile `${ui('chapterMark')}` durch `${crest || ui('chapterMark')}` ersetzen.
4. Karte `view.ts:1893` (`nav.crest`) und Wächter-Sheet `view.ts:2031` (`guard.badge`): jeweils `<img class="crest-mini" src="${art(crestArt(name))}" alt=""/>` vor den Namen.
5. Optional Willkommen `view.ts:2023`: Badge-Liste als Reihe `crest-mini`.
6. CSS (adventure.css, nach Z. 435 `.crest-fly`):
   ```css
   .crest-mini { width: 40px; height: 40px; vertical-align: middle; margin-right: 8px; }
   .crest-mini.off { filter: grayscale(1) brightness(0.55); opacity: 0.55; }
   ```
   `.crest-fly` (72 px) bleibt.

## 2. Meisterschaftsbaum (24)

Dateien `tree/<node-id>.webp` 128 px, IDs wie `tree.ts:66` (`chest-1…8`, `fight-1…8`, `time-1…8`). Astfarbe: chest gold, fight korall, time blau; Stufen I/II/III als Punkte unten.
- `src/adventure/view.ts:1474-1487` `treeGlyph()` ersetzen:
  ```ts
  function treeGlyph(branch: BranchId, index: number, on: boolean): string {
    return `<img class="tree-glyph${on ? '' : ' off'}" src="${art(`tree/${branch}-${index + 1}.webp`)}" alt=""/>`
  }
  ```
  Aufruf `view.ts:1605` bleibt.
- CSS `adventure.css:1794` ergänzen: `.tree-glyph.off { filter: grayscale(1); opacity: 0.6; }`

## 3. Forschungsturm (6)

Dateien `tower/{gold,ep,offline,expedition,egg,shard}.webp` 128 px (Keys = `RESEARCH_LINES`, research.ts:11; `data-art="tower/<line>"` passt schon).
- `src/adventure/view.ts:1541-1552` `towerGlyph()` ersetzen:
  ```ts
  function towerGlyph(line: ResearchLine): string {
    return `<img class="tower-svg" data-art="tower/${line}" src="${art(`tower/${line}.webp`)}" alt=""/>`
  }
  ```
  CSS `.tower-svg` (adventure.css:1767, 64 px) bleibt.
- Hinweis: `tower/screen.*` (Kopfbild) kommt aus Paket 5, gleicher Ordner.
