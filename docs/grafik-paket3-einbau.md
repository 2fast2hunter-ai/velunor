---
datum: 2026-11-19
quelle: Smettbo · Grafik-Paket 3 (Erster Eindruck & Navigation); Repo-Stand c2f8e8c (frischer Clone, 19.11. 00:53 MEZ)
status: geliefert, Einbau offen (Porygon, 1 PR)
---

# Grafik-Paket 3 – Einbau

Vorschau: `assets/preview_paket3.jpg`. Skripte: `assets/raw_src/paket3/` (`draw_icons_p3.py`, `brand_p3.py`, `store_shots_p3.py`, `shots.mjs`, `preview_p3.py`). Alles per Code gezeichnet (softlib), Feature-Grafik nutzt die eigene Key-Art. Kein Ball-, Fang- oder Pokémon-Motiv.

## 1. Reiner Dateitausch (gleiche Keys, kein Code nötig)

| Quelle (`/workspace/webgame/assets/…`) | Ziel im Repo |
|---|---|
| `icons/tab_{abenteuer,team,kodex,aktivitaeten,mehr}.png` (256) + `_128.png` | `public/assets/icons/` (Keys `TAB_ICONS`, view.ts:358-364) |
| `icons/gold.png` (256) + `icons/gold_128.png` | `public/assets/icons/` (HUD view.ts:338) |
| `brand/web/icon-{48,72,96,128,192,256,512}.webp` | `public/assets/icons/` (manifest.webmanifest, unverändert) |
| `brand/web/favicon-512.png`, `brand/web/favicon.svg` | `public/favicon-512.png`, `public/favicon.svg` (index.html:8-9). `public/favicon-512.svg` löschen oder durch `favicon.svg` ersetzen |
| `brand/capacitor/icon-only.png` (1024, RGB) | `assets/icon-only.png` |
| `brand/capacitor/icon-foreground.png`, `icon-background.png` | `assets/quellen/icon-foreground.png`, `assets/quellen/icon-background.png` |
| `brand/capacitor/logo.png` | `assets/logo.png` |
| `brand/capacitor/splash.png` (= dunkel), `splash-dark.png`, `splash-light.png` (2732²) | `assets/` |
| `brand/android/mipmap-*/ic_launcher{,_round,_foreground,_background}.png` | `android/app/src/main/res/mipmap-*/` |
| `brand/android/drawable*/splash.png` (port/land × night × ldpi…xxxhdpi + drawable/, drawable-night/) | `android/app/src/main/res/` gleiche Ordnernamen |
| `brand/ios/AppIcon.appiconset/AppIcon-512@2x.png` (1024, RGB ohne Alpha) | `ios/App/App/Assets.xcassets/AppIcon.appiconset/` |
| `brand/ios/Splash.imageset/Default@{1,2,3}x~universal~anyany{,-dark}.png` | `ios/App/App/Assets.xcassets/Splash.imageset/` |
| `store/feature-1024x500.png` (RGB) | `store/entwuerfe/feature-1024x500.png` (alte `.svg` + `_fix` löschen) |
| `store/icon-512-play.png` | `store/entwuerfe/icon-512-play.png` (neu, Play-Hi-Res-Icon) |
| `store/screenshots/play/01–06_*.png` (1080×1920, gerahmt) | `store/screenshots/play/` (neu); `store/entwuerfe/rahmen-*.{png,svg}` löschen |
| `store/screenshots/ios/01–06_*.png` (1290×2796, gerahmt) + `ios_raw/` (ungerahmt) | `store/screenshots/ios/`, `store/screenshots/ios_raw/` |

Master: `brand/icon_1024_apple.png`, `brand/icon_512_play.png`, `brand/adaptive_{foreground,background}_1024.png`.

**Wichtig:** `scripts/brand-assets.mjs` zeichnet die alte Kiste und würde Icon/Splash/Feature überschreiben → löschen oder nicht mehr ausführen. `npx @capacitor/assets generate` würde aus den neuen `assets/`-Quellen zwar ähnlich ableiten, aber die Adaptive-XML wieder mit Inset schreiben → lieber die gelieferten Dateien direkt nehmen.

## 2. Nötige Code-Änderungen

### 2a Adaptive-Icon-XML (Pflicht)
`android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml` und `ic_launcher_round.xml` haben `android:inset="16.7%"` – das verkleinert den Vordergrund ein zweites Mal. Der neue Vordergrund liegt schon in der Safe-Zone 66/108 (432 px Ebene). Ersetzen durch `brand/android/mipmap-anydpi-v26/*.xml` (ohne Inset, mit `<monochrome>` für Android-13-Themen-Icons).

### 2b Splash-Hintergrund
`capacitor.config.ts` `SplashScreen.backgroundColor: '#120e22'` passt zum dunklen Splash (`splash.png` = dunkel). Bleibt so. Heller Splash wird nur über `drawable-*` ohne `-night` bzw. iOS-Light genutzt.

### 2c Mehr-Menü: 9 Inline-SVG → Bilder
`src/adventure/uiArt.ts` nach Zeile 67 (`close`) ergänzen:
```ts
  moreRanks: 'ui/nav_ranks.webp',
  moreTree: 'ui/nav_tree.webp',
  moreTower: 'ui/nav_tower.webp',
  moreArena: 'ui/nav_arena.webp',
  moreFriends: 'ui/nav_friends.webp',
  moreExpedition: 'ui/nav_expedition.webp',
  moreTrade: 'ui/nav_trade.webp',
  moreGuild: 'ui/nav_guild.webp',
  moreChat: 'ui/nav_chat.webp',
```
Dateien: `assets/ui/webp/nav_*.webp` (128) → `public/assets/ui/nav_*.webp` (`@2x.webp` 256 optional, PNG-Master in `assets/ui/nav_*.png`).
`src/adventure/view.ts` `moreSheet()`: Zeilen 390-393 (`ranks`, `treeBtn`, `arenaBtn`, `socialBtn`) und 399, 402-405 (tower, expedition, trade, guild, chat) – das `<svg class="ui-icon" …>…</svg>` jeweils durch `${ui('moreRanks')}` usw. ersetzen (social → `moreFriends`). Am einfachsten alle 13 Einträge in die `items`-Liste aufnehmen. Klasse bleibt `ui-icon`, CSS (adventure.css:1173-1181) passt.

### 2d Wetter-Symbole statt SVG
`view.ts:613-620` `weatherIcon()` ersetzen durch:
```ts
function weatherIcon(id: WeatherId): string {
  return `<img class="wx-icon" src="${art(`battle/weather_icon_${id}_128.png`)}" alt=""/>`
}
```
Aufrufer bleiben (341 HUD, 637 Vorhersage, 641 Uhr-Karte). CSS: adventure.css:596 `.wx svg` → `.wx img` (22 px), :1076 `.hud .wx svg` → `.hud .wx img` (36 px). Dateien liegen schon im Repo (`public/assets/battle/weather_icon_*.png` 64 / `_128.png`).

### 2e Pfeile ▲/▼ → stat_up/stat_down.png
- `view.ts:567` `<b class="up">▲</b>` → `<img class="arrow up" src="${art('battle/stat_up.png')}" alt="▲"/>`; `:569` analog `stat_down.png`, `alt="▼"`.
- `view.ts:610` `weatherPreview()` liefert Klartext und wird bei 489 per `esc()` eingesetzt → auf HTML umstellen: Rückgabe mit `<img class="arrow" src="${art('battle/stat_up.png')}" alt="▲"/>` und bei 489 das `esc()` nur um `weatherLabel` legen.
- `app.ts:789` (K3-Demo) gleiche Zeile → gleiche Bilder.
- CSS adventure.css:388-389 `.guard-card .up/.down` (Farbe) → `.guard-card .arrow, .wx-preview .arrow { width: 18px; height: 18px; vertical-align: -3px; }`.

### 2f Typ-Symbole statt Typ-Text
Helfer in view.ts (neben `ui()`, ~Zeile 241):
```ts
function typeIcon(type: TypeId, cls = 'type-icon'): string {
  return `<img class="${cls}" src="${art(`icons/type_${type}_128.png`)}" alt=""/>`
}
```
Einsetzen (Text danach behalten, Bild davor, 20–24 px):
- `view.ts:540` Wetter-Chip `bit()` → `${typeIcon(type)}${esc(typeLabel(…))}`
- `view.ts:575` Wächter-Karte „Gegen …“ → `Gegen ${typeIcon(foeType)} ${esc(typeName(foeType))}`
- `view.ts:1165` Team-/PC-Karte `Lv … · typ`
- `view.ts:2042` Monster-Overlay, `:2066` Kodex-Detail, `:2099` Monsterkarte
- `view.ts:1742` Expeditions-Wunsch, `:1120` Tagesaufgabe, `:1204` Erfolge (Typ-Erfolge), `:800` Synergie „Reinheit“
- `view.ts:749` ist ein `<option>` (Filter) → dort geht kein Bild, Text bleibt.
CSS: `.type-icon { width: 22px; height: 22px; vertical-align: -5px; margin-right: 4px; }`.

## 3. Größen/Formate (geprüft)
- Apple 1024 RGB ohne Alpha (icon-only, AppIcon). Play 512 RGB. Feature 1024×500 RGB.
- Adaptive: Ebenen 108 dp (81/108/162/216/324/432 px), Emblem innerhalb Kreis 66/108 (bis auf Blattspitze/Funkel, dekorativ).
- PWA: `purpose: any maskable` bleibt, Emblem im 80-%-Kreis.
- Splash 2732², Inhalt mittig in ~1100 px Breite → passt in Hoch- und Querformat-Zuschnitt.
- Screenshots: Play 1080×1920 (9:16), iOS 6,7" 1290×2796.
