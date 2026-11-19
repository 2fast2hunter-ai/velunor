---
datum: 2026-11-19
quelle: Smettbo (Grafik), Repo 2fast2hunter-ai/velunor @ c2f8e8c (frischer Clone), grafik-gesamtliste.md Zeilen 17, 53, 56
status: Grafiken fertig, Einbau offen (Porygon, 1 PR)
---

# Velunor Grafik-Paket 5 – Hintergründe: Einbau

Alle Bilder KI-generiert (Grok-Bot-Bildgenerator), Referenzen nur eigene Assets (bg_gm_*, home/keyart_1600x900). Keine Monster, kein Text, kein Fang-/Ball-Motiv. Kampffläche jeweils unten frei (Horizont ~40 %).
Quelle der Dateien: `/workspace/webgame/assets/` → ins Repo nach `public/assets/` (gleiche Unterordner).
Vorschau: `assets/preview_paket5.jpg`. Skripte: `assets/raw_src/paket5/` (`process.py` Zuschnitt/Export, `preview.py`, Rohbilder `gen/`, Herkunft `sources.txt`).

## 1. Regions-Szenen (ersetzen die CSS-Umfärbung)

Je Szene: `<id>_p.webp/.jpg` 1080×980 (wie bg_gm_*_p, wird im Spiel benutzt) + `<id>_p_lqip.jpg` 27×25, außerdem Querformat `<id>.webp/.jpg` 1920×1080 (wie bg_gm_*) + `<id>_lqip.jpg` 40×22. Alles in `backgrounds/`.

| tint (route.ts SceneTint, regions.json) | Kapitel | Datei-ID |
|---|---|---|
| moor | Grünmark 4 Moorsenke | bg_gm_moor |
| fels | Grünmark 5 Felsklamm | bg_gm_fels |
| sturm | Grünmark 6 Sturmhöhe | bg_gm_sturm |
| frost | Grünmark 7 Frostgrat | bg_gm_frost |
| schmiede | Grünmark 8 Klingenschmiede + 9 Vorhof | bg_gm_schmiede |
| rat | Grünmark 10 Hoher Rat | bg_gm_rat |
| kueste | Frostküste 1–10 | bg_fk_kueste |
| glut | Glutgebirge 1–10 | bg_gg_glut |
| schatten | Schattenmoor 1–10 | bg_sm_schatten |
| himmel | Himmelsthron 1–10 | bg_ht_himmel |
| horst | Himmelsthron 11 Urgrund | bg_ht_horst |

### Code-Änderungen

1. `src/adventure/const.ts:62-66` – `SCENE_FILES` um die 11 tint-Schlüssel erweitern:
   ```ts
   moor: { webp: 'backgrounds/bg_gm_moor_p.webp', jpg: 'backgrounds/bg_gm_moor_p.jpg' },
   fels: { webp: 'backgrounds/bg_gm_fels_p.webp', jpg: 'backgrounds/bg_gm_fels_p.jpg' },
   sturm: { webp: 'backgrounds/bg_gm_sturm_p.webp', jpg: 'backgrounds/bg_gm_sturm_p.jpg' },
   frost: { webp: 'backgrounds/bg_gm_frost_p.webp', jpg: 'backgrounds/bg_gm_frost_p.jpg' },
   schmiede: { webp: 'backgrounds/bg_gm_schmiede_p.webp', jpg: 'backgrounds/bg_gm_schmiede_p.jpg' },
   rat: { webp: 'backgrounds/bg_gm_rat_p.webp', jpg: 'backgrounds/bg_gm_rat_p.jpg' },
   kueste: { webp: 'backgrounds/bg_fk_kueste_p.webp', jpg: 'backgrounds/bg_fk_kueste_p.jpg' },
   glut: { webp: 'backgrounds/bg_gg_glut_p.webp', jpg: 'backgrounds/bg_gg_glut_p.jpg' },
   schatten: { webp: 'backgrounds/bg_sm_schatten_p.webp', jpg: 'backgrounds/bg_sm_schatten_p.jpg' },
   himmel: { webp: 'backgrounds/bg_ht_himmel_p.webp', jpg: 'backgrounds/bg_ht_himmel_p.jpg' },
   horst: { webp: 'backgrounds/bg_ht_horst_p.webp', jpg: 'backgrounds/bg_ht_horst_p.jpg' }
   ```
2. `src/adventure/view.ts:438` – `const scene = SCENE_FILES[chapter.tint ?? chapter.scene]`
3. `src/adventure/view.ts:448` – Filterklasse entfernen: `<img class="plate" src="${art(scene.jpg)}" alt=""/>`
4. `src/adventure/adventure.css:255-265` – die 11 Regeln `.plate.tint-*` löschen.
5. `src/adventure/route.ts:63` – Kommentar anpassen: „Own plate per tint (SCENE_FILES), no recolour.“ Typ `SceneTint` (Z. 57) und `regions.json` bleiben unverändert; `step2.test.ts:22/33` und `step8.test.ts:58` prüfen weiter die tint-Werte und bleiben grün.
6. Optional `src/artManifest.json` (backgrounds, nach Z. 747) 11 Einträge `bg_<…>_p` mit `size: [1080, 980]`. Dann `src/artLayout.test.ts:50-53` (exakte Schlüsselliste) mit erweitern – sonst Manifest weglassen.
7. `acceptance.test.ts:408-412` prüft automatisch alle `SCENE_FILES` unter `public/assets/` → Dateien müssen mitkommen.
8. Querformat-Dateien und LQIPs werden heute nicht referenziert (bg_gm_* Querformat ebenso). Für Querformat-Handys (const.ts „A handset held sideways“) bei Bedarf `<source media="(orientation: landscape)" srcset="…/<id>.webp">` vor der Portrait-Quelle in view.ts:446-447 ergänzen.

## 2. Kopfbilder Arena und Forschungsturm

Code erwartet kein festes Format (nur `data-art="tower/screen"`, Arena ohne Bild). Format laut Gesamtliste: 1080×480 (9:4), plus 540×240 für Handys.

| Key | Dateien |
|---|---|
| arena/screen | arena/screen.webp, arena/screen.jpg (1080×480), arena/screen_540.webp |
| tower/screen | tower/screen.webp, tower/screen.jpg (1080×480), tower/screen_540.webp |

Snippet (Helfer in view.ts):
```ts
function screenHead(key: 'arena' | 'tower'): string {
  return `<picture class="screen-head"><source type="image/webp" srcset="${art(`${key}/screen_540.webp`)} 540w, ${art(`${key}/screen.webp`)} 1080w" sizes="(max-width: 600px) 100vw, 600px"/><img src="${art(`${key}/screen.jpg`)}" alt="" width="1080" height="480" loading="lazy"/></picture>`
}
```
- Arena: `view.ts:1499`, `1502` (Lade-/Offline-Karte) und `1523` direkt nach `<div class="card panel">` `${screenHead('arena')}` einfügen.
- Turm: `view.ts:1589` direkt nach `<div class="card panel tower-screen" data-art="tower/screen">` `${screenHead('tower')}` einfügen.
- CSS (adventure.css, z. B. nach Z. 1773):
  ```css
  .screen-head { display: block; margin: 0 0 12px; }
  .screen-head img { display: block; width: 100%; height: auto; aspect-ratio: 9 / 4; object-fit: cover; border-radius: 18px; }
  ```
