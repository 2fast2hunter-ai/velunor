---
datum: 2026-11-19
quelle: Smettbo (Grafik), Repo 2fast2hunter-ai/velunor main @ c2f8e8c (frischer Clone /tmp/velunor-p4), grafik-gesamtliste.md Zeilen 11, 18, 21, 28, 29, 35, 42
status: Grafiken fertig, Einbau offen (Porygon, 1 PR)
---

# Velunor Grafik-Paket 4 – Kampf & Sammeln: Einbau

Alles per Code gezeichnet (`assets/raw_src/paket4/draw_paket4.py`, nutzt `raw_src/home/softlib.py`; Stil wie `icons_soft/draw_types.py`: Umriss #4a2c17, Verlauf, Glanzlicht, Rim-Light). Kein GenerateImage nötig. Kein Ball-/Fang-Motiv (Rahmen haben nie ein waagerechtes Band).
Ablage → Repo: `assets/frames/*` → `public/assets/frames/`, `assets/fx/fx_bannsiegel*` → `public/assets/fx/`, **`assets/ui/webp/<id>.webp` → `public/assets/ui/<id>.webp`** (flach, wie die übrigen ui-Icons). `assets/ui/<id>.png` sind nur die 128-px-Quellen.
Vorschau `assets/preview_paket4.jpg`. Alte Dateien gesichert in `assets/raw_src/paket4/old/`.

## Dateien

| Key | Dateien | Format |
|---|---|---|
| frames/rarity_0…9 | rarity_N.png, rarity_N_256.png (gleiche Namen wie bisher) | 512/256 RGBA, Ring, Mitte transparent (Innenradius 0,40 der Kante) |
| frames/ghost_overlay | ghost_overlay.png, _256.png (gleiche Namen) | 512/256, weicher lila Schimmerring |
| Weg-Knoten | ui/node_{wild,trainer,find,spring,guardian}.webp | 128 |
| Cloud-Status | ui/cloud_{online,offline,sync}.webp | 128 |
| Rad-Symbole | ui/wheel_{stern,mond,krone,blatt,tropfen,funke}.webp + @2x.webp | 128 / 256 |
| Splitter | ui/shard.webp, ui/shard_64.webp | 128 / 64 |
| Bannsiegel | fx/fx_bannsiegel.png, _256.png, fx/fx_bannsiegel_add.jpg (gleiche Namen/Formate) | 512/256 RGBA, 512 auf Schwarz für plus-lighter |

## Code-Änderungen

1. **Seltenheitsrahmen in `portrait()`** – `src/adventure/view.ts:245-248` ersetzen:
   ```ts
   function portrait(speciesId: string, large = false, extra = ''): string {
     const rarity = species(speciesId).baseRarity
     const color = rarityInfo(rarity).color
     const sil = extra.split(' ').includes('sil')
     const frame = sil ? `frames/ghost_overlay${large ? '' : '_256'}.png` : `frames/rarity_${rarity}${large ? '' : '_256'}.png`
     return `<span class="pframe" style="--rarity:${color};--frame:url('${art(frame)}')"><img class="portrait ${extra}" src="${monsterArt(speciesId, large)}" alt=""/></span>`
   }
   ```
   (Unentdeckte `sil`-Monster bekommen den neutralen Geisterring, damit die Seltenheit nicht verraten wird und der Rahmen nicht mit schwarz gefiltert wird.)
   - `view.ts:880` (`.replace('style="', 'style="opacity:.25;')`) trifft jetzt das `style` der Hülle → blendet Rahmen + Bild gemeinsam ab, passt.
   - CSS `src/adventure/adventure.css:131-137`: `.portrait` aus der Regel nehmen (`.hero, .pick img` behalten den alten Rand) und neu:
     ```css
     .pframe { position: relative; display: inline-grid; place-items: center; border-radius: 50%; flex: 0 0 auto; }
     .pframe::after { content: ''; position: absolute; inset: 0; background: var(--frame) center / 100% 100% no-repeat; pointer-events: none; }
     .portrait { border-radius: 50%; border: 0; padding: 12%; box-sizing: border-box;
       background: radial-gradient(circle at 50% 40%, #2a3c62, #10182c 62%); box-shadow: var(--shadow-soft); }
     ```
   - Prüfen: Selektoren, die `.portrait` als direktes Kind erwarten (z. B. `.m-plate > img`, `.prize-line img`, `.arena-slot img`) – mit `rg -n "portrait" src/adventure/adventure.css` gegenchecken.
   - `src/artLayout.ts:14-17` `FRAME_FIT` (6/9 = 0.58): alle neuen Ringe haben denselben Innenradius → Einträge löschen, Standard 0.7 gilt (nur Legacy-Phaser-Loader).
   - Dateinamen unverändert → `artManifest.json` und `artLayout.test.ts:32-33, 80-86` bleiben grün.
2. **Weg-Knoten** – `view.ts:278-284` `icon()`:
   ```ts
   function icon(kind: NodeKind): string {
     return `<img class="node-ico" src="${art(`ui/node_${kind}.webp`)}" alt=""/>`
   }
   ```
   CSS `adventure.css:237` `.node svg` → `.node img` (22 px), `adventure.css:1101` `.node svg` → `.node img` (28 px). `.node.is-here` setzt `color` – für Bilder wirkungslos, Hintergrund #f0c14a bleibt.
3. **Cloud-Status** – `view.ts:316-323` `cloudGlyph()`:
   ```ts
   function cloudGlyph(kind: 'online' | 'offline' | 'sync'): string {
     return `<img src="${art(`ui/cloud_${kind}.webp`)}" alt="" aria-hidden="true"/>`
   }
   ```
   Aufrufer `view.ts:327-329` und `1255` bleiben. CSS `adventure.css:1630` `.cloud-chip svg, .cloud-mark svg` → `… img` (Chip 48 px, Mark 40 px empfohlen).
4. **Rad-Symbole** – `view.ts:965-972` `glyph()`:
   ```ts
   function glyph(id: SymbolId): string {
     return `<img class="reel-sym" src="${art(`ui/wheel_${id}.webp`)}" srcset="${art(`ui/wheel_${id}.webp`)} 1x, ${art(`ui/wheel_${id}@2x.webp`)} 2x" width="72" height="72" alt=""/>`
   }
   ```
   Aufruf `view.ts:1062` unverändert.
5. **Splitter-Icon** – `view.ts:2113`:
   ```ts
   <p>${tr(save, 'chest.star', { n: save.stars[sp.id] ?? 0 })} · <img class="shard-ico" src="${art('ui/shard_64.webp')}" alt="${esc(tr(save, 'chest.shards'))}" width="28" height="28"/> ${save.shards[sp.id] ?? 0}</p>
   ```
   (falls es keinen i18n-Key `chest.shards` gibt: `alt="Splitter"`). CSS: `.shard-ico { vertical-align: -6px; }`. Die Turm-Zeile `view.ts:1549` (shard-Glyph) gehört zu Paket 6 und bleibt.
6. **Bannsiegel** – keine Code-Änderung (`const.ts:35-36` gleiche Pfade). Das neue Siegel ist eine runde Blüte mit Perlenring, ohne Goldfiligran; `.seal` (adventure.css:512) und `.chest-seal` (1564) bleiben.
7. **Alte Rahmen entfernen**: werden durch Überschreiben ersetzt (gleiche Namen); keine Löschung nötig.
