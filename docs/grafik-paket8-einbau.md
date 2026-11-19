---
datum: 2026-11-19
quelle: Smettbo · Grafik-Paket 8 (Monster weicher), freigegeben von Fabian-Noel 19.11. 09:46 MEZ; Repo-Stand main 21be48e
status: geliefert, Einbau offen (Porygon, 1 PR)
---

# Grafik-Paket 8 – Monster weicher (Einbau)

15 Monster neu gezeichnet: weicher, runder, freundlichere Proportionen. Silhouette, Farben und Typ-Merkmale bleiben gleich.
Vorschau alt/neu: `assets/preview_paket8_vorher_nachher.jpg`.

## 1. Dateien → Repo (`public/assets/monsters/`, **ersetzen**)

Reiner Dateitausch. Dateinamen, Format (PNG RGBA, transparent) und Größen sind identisch mit den Originalen.

| Quelle `/workspace/webgame/assets/monsters/` | Ziel | Größe |
|---|---|---|
| `m16, m19, m26, m33, m37, m40, m55, m60, m78, m79, m80, m83, m85, m99, m100` `.png` | `public/assets/monsters/` | 512×512 |
| dieselben `_256.png` | `public/assets/monsters/` | 256×256 |

= 30 Dateien. Andere Varianten gibt es im Repo nicht: `monsters/` enthält nur `.png` + `_256.png`, kein webp.

## 2. Code / Manifest / Tests

- **Keine Code-Änderung nötig.** `artManifest.json` / `public/assets/manifest.json` behalten dieselben Pfade.
  `artLayout.test.ts` (z. B. Zeilen 102–109 m33/m55) prüft nur Pfade, nicht den Inhalt.
- `MONSTER_SLOT_SCALE` (`artLayout.ts:5`) betrifft keines der 15 (nur m01/m10). Alle füllen ihr Quadrat wie bisher mit 16 px Rand bei 512, also kein neuer Slot-Wert.
- **m33 Bergtitan** (`art.ts:45–52`): Die dunkle Matte hinter m33 bitte erst einmal **lassen**. Der neue Bergtitan hat wieder halbtransparenten Schnee/Nebel, und der Körper ist jetzt hell (beige-grau). Nach dem Einbau einmal auf heller Platte prüfen; wenn er ohne Matte gut lesbar ist, darf die Sonderregel raus (optional, eigener Commit).
- Anzeige im Spiel (UI-px, 1080er Raster): `drawMonster` Standard 72 UI-px. Unter 160 UI-px wird `_256` geladen, ab 160 UI-px die 512er (`monsterTextureKey`, `art.ts:44`). Die Vorschau zeigt groß (240 px) und in Spielnähe (96 und 56 px).

## 3. Danach prüfen

- Kodex (gesichtete Silhouette, `dim`), Team-Karte, Truhen-Enthüllung (m33 ist Beispiel-Grant in `adventure/app.ts:889`), Glücksrad (m26, m79 in `adventure/wheel.ts:47-48`), Legenden m40/m80/m100 (`adventure/origin.ts:6`).
- Store-Screenshots: zeigt ein Store-Bild eines der 15 Monster, ist es noch die alte Fassung. Neu aufnehmen nach dem Merge (Smettbo).

## 4. Herkunft

- KI-generiert mit dem Grok-Bot-Bildgenerator, eigenes altes Sprite als Referenz (Img2Img). Freigestellt mit rembg isnet-general-use + Hintergrund-Differenz für lose Teile (Funken, Steine, Zahnräder, Ringe): `assets/raw_src/paket8/cut_p8.py`.
- Rohbilder `raw_src/paket8/gen/` (inkl. verworfene Varianten `alt_*`), alte Fassungen `raw_src/paket8/old/` (png, _256, Quell-jpg).
- Vorschau-Skript `raw_src/paket8/preview_p8.py`, Vergleich mit Nachbarn `raw_src/paket8/compare_p8.py`.
- Keine Fremdvorlagen, nichts aus Pokémon/PokeCatch, keine Ball-/Fang-Motive.
