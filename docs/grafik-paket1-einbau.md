# Grafik-Paket 1 (Phase-2-Platzhalter) – Einbauhinweise für Porygon
Stand 19.11.2026, Smettbo. Basis: velunor-pr5 fdf5a25 (#73). Alle Dateien unter /workspace/webgame/assets/, Dateiname = <data-art>.png. Vorschau: assets/preview_phase2.jpg

## Assets
- Synergie (synergyGlyph): synergy/{gewitter,flaechenbrand,wurzelgrund,polarstrom,bollwerk,prisma,zwielicht,rudelkraft,schwarmgift,resonanz,glutschwinge,sturmlied}.png 128 + _64
- Ligen (leagueBadge, NEUE Keys): arena/league_{kiesel,bronze,silber,gold,kristall,meister}.png 128 + _64
- Avatar-Rahmen: daily/frame-{dawn,tide,leaf,ember}, ranks/frame-{codex,progress,week,shimmer,mastery,ehren} .png 256 + _128 (Ringe, Mitte transparent; frameGlyph-Keys NEU ranks/frame-<id>)
- Expeditionsorte: expedition/<ort>.jpg + .webp 960×360 + _480.webp (alle 20 aus PLACES)
- Expeditionsstufen: expedition/tier-{bronze,silber,gold} 96 + _48
- Weltenbiester: beasts/{himmelswal,weltenwurm}.png 960×560 transparent + .webp + _480.png
- Gildenwappen-Baukasten (guild.ts SHAPES/SYMBOLS/COLORS): guild/shape-{shield,circle,banner,diamond}.png 240×280 grau (Multiply), guild/symbol-{star,leaf,wave,flame}.png 240×280 creme darüber, guild/colors.json, Beispiele guild/emblem_*.png
- Freundescode: friends/code.png 720×300 + _360

## Code-Änderungen
1. view.ts: SVG-Funktionen synergyGlyph, leagueBadge, frameGlyph, dailyFrameSvg (auch in lookFace), tierMark, placeArt, beastArt, guildEmblem durch <img src=art('…')> ersetzen; Größen-CSS bleibt.
2. Neue Keys: arena/league_<id>, ranks/frame-<id>.
3. .look-wrap .daily-frame: inset:-15%, Größe 130 % (statt -10px); Lochradius 0,36 × Bildbreite.
4. Expedition: <picture> webp+jpg, Seitenverhältnis 8:3.
5. Gilde: Form per Multiply einfärben (wie avatar.ts), Symbol darüber; guildEmblem() braucht Form/Symbol/Farbe aus Gildendaten.
6. Freundescode: background:url(friends/code.png) center/100% 100%; aspect-ratio:12/5; Code unten mittig (~padding-top:40px).

## Store-Fixes (unversioniert im Checkout, Originale unverändert)
- store/entwuerfe/rahmen-*_fix.png 1080×1920 (Play, max 2:1) und rahmen-*_ios_fix.png 1290×2796. Hinweis: Stores verlangen echte Build-Screenshots, die rahmen-* sind Wireframes.
- store/entwuerfe/feature-1024x500_fix.png ohne Alpha (24-Bit).
- assets/quellen/icon-foreground_fix.png (auf 0,94 verkleinert, Safe-Zone) → danach @capacitor/assets neu erzeugen.

## Noch nicht ersetzt (kommt in späteren Paketen)
tower/*, trade/lock, trade/escrow, daily/board, codex/traded, placeBadge 1–3; Icon/Splash/Feature in weichem Stil.
