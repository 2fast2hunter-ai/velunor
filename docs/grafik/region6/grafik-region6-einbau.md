---
datum: 2026-11-20
quelle: Smettbo · Region 6 „Glimmerwildnis“ Grafik P0–P4 (Freigabe Fabian-Noel 20.11. 19:44, Konzept neue-region-konzept.md §3.3/§3.5/§8); Teil A abgenommen 20.11. 20:04
status: komplett geliefert (P1 20/20, P2, P3, P4), Einbau offen (R9)
---

# Region 6 „Glimmerwildnis“: Grafik (Einbau)

Vorschauen:
- komplett: `assets/preview_region6_komplett.jpg`
- Teil A: `assets/preview_region6_teilA.jpg` (Stand vor Teil B)

## 1. Monster (`assets/monsters/` → `public/assets/monsters/`, neu, R9)

- **Dateien:** `m101 … m120`, je `.png` (512×512) und `_256.png` (256×256), RGBA transparent, kein webp. Das sind 40 Dateien, alle **final**; keiner der 20 ist noch Platzhalter.
- **Schema:** wie m01–m100. Der Sprite-Schlüssel ist gleich der ID.
- **Anzeige** (UI-px, 1080er Raster):
  - `drawMonster` Standard 72 UI-px.
  - Unter 160 UI-px lädt das Spiel `_256`, ab 160 UI-px die 512er (`monsterTextureKey`).
  - 4 % Rand pro Seite (pad 1.08), also kein eigener `MONSTER_SLOT_SCALE`.
- **Teil B (20.11. abends):**
  - neu: m107, m108, m114–m117, m119, m120
  - überarbeitet:
    - m112 neu gezeichnet (längliche Trüffel mit Schlafmütze, Traumwolke am Bauch)
    - m101 mit 8 Leuchtsporen nah am Hut
    - m102 ohne Schattenrest
  - Teil-A-Fassungen von m101, m102 und m112 liegen in `raw_src/region6/teilA_v1/`.
- **Platzhalter:** Die 20 P0-Silhouetten bleiben nur als Rückfall in `assets/monsters_ph/` (nicht ins Repo).
  - Für R2–R8 ohne echte Sprites können sie unter denselben Namen nach `monsters/` kopiert werden.

## 2. Szenen-Platten (`assets/backgrounds/` → `public/assets/backgrounds/`, P2 ersetzt P0, R6/R9)

| Datei | Größe |
|---|---|
| `bg_gm_{hain,myzel,krone}_p.jpg/.webp` | 1080×980 (Hochformat) |
| `bg_gm_{hain,myzel,krone}_p_lqip.jpg` | 27×25 |
| `bg_gm_{hain,myzel,krone}.jpg/.webp` | 1920×1080 |
| `bg_gm_{hain,myzel,krone}_lqip.jpg` | 40×22 |

- **Szenen:**
  - hain: Pilzlichtung
  - myzel: Grotte mit Leuchtfäden
  - krone: Baumkronen-Steg aus Holzplanken
- Namen und Varianten sind dieselben wie bei P0, also reiner Dateitausch. Schlüssel `hain`, `myzel` und `krone` in `SceneTint`/`SCENE_FILES`.
- Aufbau wie die vorhandenen Platten: Kulisse oben, freie Bodenfläche unten.
- **m118 auf myzel:** lesbar. Der Grottenboden ist hell-oliv, m118 dunkel-indigo mit hellen Kanten, auch in Graustufen klar; Test in der Vorschau.
- Die P0-Fassungen liegen in `raw_src/region6/p0_old/`.

## 3. Wappen und Ratsiegel (`assets/crests/` → `public/assets/crests/`, R9)

- **Dateien:**
  - `sporenwappen`, `tauwappen`, `wurzelwappen`, `myzelwappen`, `lampionwappen`, `harzwappen`, `wipfelwappen`, `laubwappen`, `ratsiegel_6`
  - je `.webp` (128), `@2x.webp` (256) und `.png` (256, nur Quelle)
  - das sind 27 Dateien
- **Schema:** wie Paket 6, gleiche Bibliothek und Kontur. Regionsfarbe Türkis, Schildform Pilzhut-Schild, Bernstein-Pilz als Schildkrone. Das Siegel trägt den Sporen-Pilz und 6 Punkte.
- **Zuordnung Badge → Datei:**
  - `raw_src/region6/crests_r6.json`
  - komplette neue `CREST_ART` (45 alte + 9 neue) in `raw_src/region6/crestArt_r6.ts`: ersetzt `src/adventure/crestArt.ts`
  - Schlüssel: Sporenwappen … Laubwappen, Sechstes Ratsiegel
- **Anzeige:** `.crest-mini` 40 px, `.crest-fly` 72 px; srcset mit `@2x` wie bisher.

## 4. P4

- **Erfolgsrahmen:** kein neuer. Der vorhandene `daily/frame-leaf` passt thematisch (Wald/Blatt) und ist laut Konzept §3.8 schon der Rahmen der Typ-Erfolge.
  - Die neuen Erfolge dex-120, seen-120, region-6 und Siegel können `leaf` oder die vorhandenen Rahmen nutzen.
- **Intro-Karte:** `assets/intro/intro_glimmerwildnis.jpg/.webp` in 1080×600, ohne Text, also für eine UI-Überschrift gedacht.
  - Variante mit Titel „Glimmerwildnis · Region 6“ (Fredoka): `intro_glimmerwildnis_titel.jpg/.webp`, nur DE.
  - Ziel z. B. `public/assets/intro/`.
  - Die linke untere Ecke ist ruhig und dunkel für den Titel.

## 5. Skripte (`assets/raw_src/region6/`, cwd `assets/`)

- `p0_placeholder.py`: P0 (Silhouetten, Tint-Platten)
- `cut_r6.py`: Freistellen, mit `/workspace/.venv-rembg/bin/python`
  - rembg isnet + Hintergrund-Differenz nahe am Körper + Rim-Light
  - `DESHADOW` für m102, `POST` Sporen für m101
  - Auswahl der Rohbilder in `PICK`
- `plates_r6.py`: P2
- `draw_crests_r6.py`: P3, nutzt `paket6/draw_paket6.py`
- `intro_r6.py`: Intro-Karte
- Vorschauen: `preview_r6.py`, `preview_r6_komplett.py`
- Rohbilder in `gen/`, Stil-Referenzen in `ref/`

## 6. Herkunft

- **KI-generiert mit dem Grok-Bot-Bildgenerator** (eigene Prompts nach STYLE.md und Konzept §3.3):
  - Monster
  - Platten: wald-Platte als Stil-Referenz, Querformat mit der eigenen Hochformat-Fassung als Referenz
  - Intro: m120 als Referenz
- **Eigene Code-Grafik:** Wappen, Siegel, Platzhalter, Titel (Fredoka, SIL OFL 1.1).
- Keine Ball- oder Fang-Motive, keine Fremdfiguren.
