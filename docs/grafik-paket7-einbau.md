---
datum: 2026-11-19
quelle: Smettbo · Grafik-Paket 7 (Feinschliff Kleinteile); Repo-Stand d67f904 (frischer Clone, 19.11. 01:16 MEZ)
status: geliefert, Einbau offen (Porygon, 1 PR)
---

# Grafik-Paket 7 – Einbau

Vorschau `assets/preview_paket7.jpg`, Skript `assets/raw_src/paket7/draw_paket7.py` (+ `preview_p7.py`), alte Fassungen in `raw_src/paket7/old/`. Alles per Code gezeichnet (softlib), Medaillen-Ziffern in Fredoka Bold (OFL). `@2x` = doppelte Größe für scharfe Anzeige.

## 1. Dateien → Repo (`public/assets/…`)

| Quelle `/workspace/webgame/assets/` | Ziel | Größe |
|---|---|---|
| `trade/lock(.png,@2x)` | `trade/` | 32 / 64 |
| `trade/escrow(.png,@2x)` | `trade/` | 160×48 / 320×96 |
| `codex/traded(.png,@2x)` | `codex/` | 24 / 48 |
| `mastery/star_on`, `star_off` (+@2x) | `mastery/` | 24 / 48 |
| `ranks/place-1`, `-2`, `-3` (mit Ziffer), `place-n` (ohne Ziffer) (+@2x) | `ranks/` | 64 / 128 |
| `chat/report`, `mute`, `send` (+@2x) | `chat/` | 32 / 64 |
| `daily/board(.png,@2x)` | `daily/` | 360×120 / 720×240 |
| `ui/webp/ach_{wins,finds,collect,badges,region,types,codex,care}.webp` (PNG-Master `ui/ach_*.png`) | `ui/` | 128 |
| `ui/webp/{spin,road_chest,region}.webp` | `ui/` (**ersetzt**, gleiche Keys) | 128 |
| `icons/type_dragon.png` (256), `type_dragon_128.png` | `icons/` (**ersetzt**) | – |

Reiner Dateitausch ohne Code: `spin`, `road_chest`, `region`, `type_dragon`. `home/` hat keine Drachen-Größe.

## 2. Code-Änderungen

**uiArt.ts** (nach `close`, Zeile 67) – nötig, weil `uiArt.test.ts` jede Datei prüft:
```ts
  achWins: 'ui/ach_wins.webp', achFinds: 'ui/ach_finds.webp', achCollect: 'ui/ach_collect.webp',
  achBadges: 'ui/ach_badges.webp', achRegion: 'ui/ach_region.webp', achTypes: 'ui/ach_types.webp',
  achCodex: 'ui/ach_codex.webp', achCare: 'ui/ach_care.webp',
```

**Erfolge** `view.ts:1208` `${ui('achieve')}` → `${ui(achieveArt(goal.id))}` mit
```ts
function achieveArt(id: string): UiArtId {
  if (id.startsWith('win-')) return 'achWins'
  if (id.startsWith('catch-') || id.startsWith('shiny-')) return 'achFinds'
  if (id.startsWith('dupe-')) return 'achCollect'
  if (id.startsWith('badge-')) return 'achBadges'
  if (id.startsWith('region-') || id.startsWith('master-')) return 'achRegion'
  if (id.startsWith('type-')) return 'achTypes'
  if (id.startsWith('dex-') || id.startsWith('seen-')) return 'achCodex'
  return 'achCare' // egg-, hort-, hort-guest, fruit-, crystal-, level-, team-
}
```
`ui/achieve.webp` bleibt für den Wappen-Flug (app.ts:819-822, 2435-2438) bis Paket 6.

**Getauscht-Marke** `view.ts:885`: `<svg class="trade-mark" …>…</svg>` → `<img class="trade-mark" src="${art('codex/traded@2x.png')}" alt="${esc(tr(save, 'trade.traded'))}" title="${esc(tr(save, 'trade.traded'))}"/>`. CSS adventure.css:1826 passt (18 px).

**Schloss** `view.ts:1775` und `:1791`: `<svg data-art="trade/lock" …>…</svg>` → `<img data-art="trade/lock" src="${art('trade/lock@2x.png')}" alt=""/>`. CSS :1825 `.trade-lock svg, .trade-escrow p svg` → `img`.

**Treuhand** `view.ts:1790`: `<svg viewBox="0 0 160 48">…</svg>` → `<img class="escrow-art" src="${art('trade/escrow@2x.png')}" alt=""/>`. CSS :1823 und :1828 `.trade-escrow svg` → `.trade-escrow .escrow-art` (160×48, Animation bleibt).

**Meisterschafts-Sterne** `mastery.ts:92`: `import { assetPath } from './const'` ergänzen und
```ts
const src = assetPath(index < lit ? 'mastery/star_on@2x.png' : 'mastery/star_off@2x.png', import.meta.env.BASE_URL || '/')
return `<img class="m-star${on}" src="${src}" alt=""/>`
```
CSS :1717-1718: `fill` entfernen, `.m-star { width: 16px; height: 16px; }`.

**Platz-Medaille** `view.ts:1421-1424`:
```ts
function placeBadge(place: number): string {
  if (place >= 1 && place <= 3) return `<img class="rank-badge" src="${art(`ranks/place-${place}@2x.png`)}" alt="${place}"/>`
  return `<span class="rank-badge plain"><img src="${art('ranks/place-n@2x.png')}" alt=""/><b>${place}</b></span>`
}
```
CSS :1740-1745 ersetzen: `.rank-badge { width: 64px; height: 64px; position: relative; flex: 0 0 auto; } .rank-badge.plain img { width: 100%; } .rank-badge.plain b { position: absolute; left: 0; right: 0; top: 50%; text-align: center; font: 800 16px Fredoka, sans-serif; color: #4a2c17; }` (Ziffer sitzt im unteren Kreis, ggf. `top: 52%`).

**Tages-Tafel** `view.ts:1144` (`data-art="daily/board"`): nach `<h2>` einfügen `<img class="daily-board" src="${art('daily/board@2x.png')}" alt=""/>`. CSS: `.daily-board { display: block; width: 100%; max-width: 360px; height: auto; margin: 4px auto 8px; }`.

**Chat** `view.ts:1854`: Buttons `chat-report` / `chat-mute` → Bild davor `<img class="chat-icon" src="${art('chat/report@2x.png')}" alt=""/>` bzw. `chat/mute@2x.png`; `view.ts:1862` `chat-send` → `chat/send@2x.png`. CSS: `.chat-icon { width: 20px; height: 20px; vertical-align: -4px; margin-right: 4px; }` (Senden-Knopf 24 px).

## 3. Prüfpunkte
- spin und reset bei 48 px: spin ist jetzt ein grüner runder Start-Knopf mit Dreieck, reset bleibt der rote Kreispfeil → klar unterscheidbar (Vorschau unten rechts, 48 und 32 px).
- Drache: Hörner zeigen nach hinten, lange Schnauze mit Nasenhöcker und Zahn, Nackenstacheln, Flügel-Andeutung links.
