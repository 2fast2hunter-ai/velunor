# Velunor: Auto-Kampf-Umbau „Ruhig und verständlich“ (Konzept, Lucario, 20.11.2026)

**Status: FREIGEGEBEN am 20.11. um 13:02 von Fabian-Noel (über Evoli), mit seinen Antworten:**
- a) Auch Wildkämpfe laufen Zug für Zug, auch wenn der Fortschritt dadurch langsamer wird.
- b) Der Wächterkampf merkt sich das zuletzt gewählte Tempo.
- c) Die Lebenspunkte werden standardmäßig als Zahl angezeigt.

Die Antworten sind in den Abschnitten 2, 3, 6, 7 und 8 eingearbeitet. Der Ausgleich steht in Abschnitt 7 (Balancing).
Auftrag (Fabian-Noel über Evoli, 20.11., 12:55): „das ist viel zu hektisch und man blickt da nicht wirklich durch“.
Code-Stand der Analyse: `origin/main` 071ba91 (20.11.). Zahlen ohne Code-Beleg sind **[ANNAHME]**.

**Feste Entscheidungen, die bleiben:** immer 1v1 mit 6-KO-Regel · Ult ab Lv 25 · Wetter wirkt auf den Schaden (±10–15 %) · weicher, runder Look · kein Pay-to-win, kein Echtgeld, keine Werbung · nichts aus Pokémon kopieren · Spielstände kompatibel.

---

## 1. Analyse: Was ist heute unübersichtlich? (nach Priorität)

Messung: 6 Läufe × 400 Begegnungen mit `resolveEncounter(..., { trace: true })` (Starter m01/m02/m03, frühe Kapitel). Frames = Einträge in `FightTrace.frames`.

| Art | n | Frames Median / p90 / max | Treffer pro Begegnung Median / max |
|---|---|---|---|
| Wild | 1585 | 10 / 18 / 32 | 8 / 26 |
| Trainer | 153 | 6 / 13 / 20 | 5 / 17 |
| Wächter | 96 | 18 / 66 / 81 (bis 4 Teilkämpfe) | 14 / 63 |

**P1 – Jeder Kampf wird in ein festes Zeitfenster gepresst, egal wie lang er ist.**
- Eine Begegnung dauert immer `ENCOUNTER_MS = { 1: 2800, 2: 1400, 3: 930 }` ms (`src/adventure/const.ts:24–25`, `play()` in `src/adventure/app.ts:2200`).
- `shotAt()` verteilt alle Frames aller Teilkämpfe gleichmäßig auf dieses Fenster (`src/adventure/present.ts:46–56`).
- Folge pro Frame bei ×1: Wild Median 280 ms, p90 156 ms. **Wächter p90: 42 ms, max 35 ms.** Bei ×3: Wild 93 ms, Wächter max 11 ms. Das liegt unter einem Bildschirm-Frame im Akkumodus (30 fps = 33 ms, `src/adventure/touch.ts:20`), also werden Züge gar nicht gezeigt.
- Ein Wächterkampf mit 6-KO-Regel läuft also in 2,8 s ab, genau wie eine Wildbegegnung.

**P2 – Effekte sind länger als ein Zug und überlagern sich.**
- Projektil plus Treffer dauern 150–700 ms (`FX_MIN_MS`/`FX_MAX_MS`, `src/battle/strips.ts:7–9, 84`). Die Zahl schwebt 600 ms (`NUMBER_FLOAT_MS`, `src/battle/hitReadout.ts:34`), die Attacken-Banner 600 ms (`BANNER_MS`, `src/battle/typeFx.ts:20`, `app.ts:2679`) und der Namensbanner 800 ms (`app.ts:2345`).
- Dazu kommen Shake 80–200 ms, Hitstop 40/80 ms (`hitReadout.ts:36–42`), Rückstoß 280 ms (`RECOIL_MS`), Krit-Blitz, Parallax in 3 Ebenen, Wetter-Partikel und Konfetti (zusammen bis zu 40 Partikel, `docs/k8-performance.md`).
- Bei 156–280 ms pro Frame laufen also 2–4 Effekte gleichzeitig. Kommt der nächste Treffer vor dem Einschlag, wird die alte Trefferzahl verworfen (`window.clearTimeout(impactTimer)`, `app.ts:2296`).
- Von mehreren Treffern in einem Frame (627 solche Frames in 1585 Wildbegegnungen) wird nur einer gezeigt (`app.ts:2285`). Heilung und Status ohne HP-Verlust werden nicht animiert, denn `dropped` prüft nur sinkende HP (`app.ts:2282`).

**P3 – Es gibt kein Kampflog und keine Erklärung am Ende.**
- Der Kampftext ist eine einzige Zeile mit 28 px auf einer Bühne von 1080 px Breite (`.battle-status`, `adventure.css:522–534`, `SHELL_W`, `const.ts:46`). Auf einem 390-px-Handy sind das etwa 10 px. Sie ist einzeilig, lange Sätze werden mit „…“ abgeschnitten, und sie wechselt mit jedem Frame (`app.ts:2401`). Ein Satz bleibt also 93–280 ms stehen. Lesen braucht etwa 1,2–1,5 s pro kurzem Satz **[ANNAHME]**.
- Das Log unten (`view.ts:572–578`, 3 Zeilen, maximal 50, `LOG_LIMIT`) ist das allgemeine Abenteuerlog. Es enthält keine Kampfzüge.
- Bei einem Sieg zeigt das Ende nur „Sieg · +G · +EP“ für 1,2 s (`app.ts:2604, 2623`). Bei einer Wild-Niederlage gibt es keinen Endbildschirm. Beim Wächter stehen die letzten 2 Textzeilen da (`app.ts:2156`). Es gibt kein „Warum“.

**P4 – Wichtige Anzeigen sind winzig oder nur Symbole.**
- Ult-Leiste: 180 × 10 px (`adventure.css:480–481`), auf dem Handy etwa 65 × 3,6 px. „ab Lv 25“ hat 16 px, also etwa 6 px. Eine Ult-Ansage gibt es nur als normalen Attacken-Banner (`app.ts:2295`).
- Status: nur ein Symbol mit 40 px, etwa 14 px auf dem Handy, Name nur nach Tippen (`view.ts:510`, `app.ts:2441`).
- Typ-Vorteil: nur indirekt über Farbe und Größe der Zahl (stark ×1,3, schwach ×0,7 mit halber Deckkraft, `strips.ts`) und die Worte STARK/SCHWACH für 600 ms. Es gibt keine Ansage „Feuer ist stark gegen Pflanze“.
- Wetter: Chip oben mit 20 px und ein Pfeil mit 28 px am Namen (`adventure.css:360–368`). Die Wirkung auf einen Treffer zeigt nur ein blauer Rand um die Zahl (`.float-num.is-weather`).
- Die Lebensbalken springen ohne Übergang (`.hp span` ohne transition, `adventure.css:479`).

**P5 – Gleichzeitig sichtbar sind ≥ 15 Elemente** (`view.ts:487–537`):
- pro Seite Name, Wetterpfeil, HP, Ult, Status, Boss-Mechaniken (72-px-Symbole), Helfer und „Konter!“
- dazu Kampftext, Wetter-Chip, Wetter-Vorschau, Attacken-Banner, Namensbanner, Zahlen, Krit-Blitz und FX-Canvas
- darunter Wächterkarte (36 px), Herausfordern-Knopf (132 px hoch), Team-Leiste, ×1/×2/×3 und Logkarte

**P6 – „Tempo“ bedeutet zwei Dinge.** ×1/×2/×3 (`view.ts:563`) beschleunigt die Darstellung und zugleich den Spielfortschritt. Der Takt in `loop()` ist `encounterMs(speed)` (`app.ts:1470`), also gibt es bei ×3 dreimal so viele Begegnungen pro Stunde. Wer langsamer schauen will, kommt langsamer voran.

---

## 2. Ruhiger Ablauf

### 2.1 Jeder Kampf läuft Zug für Zug (Entscheidung Fabian-Noel, 20.11., Antwort a)
| | **Wegkampf** (Wild, Trainer) | **Fokuskampf** (Wächter, Rat, Weltenbiest, Arena-Replay) |
|---|---|---|
| Ablauf | Zug für Zug: kurze Schnell-Züge, ausführliche Schlüssel-Züge | Zug für Zug in 4 Phasen, jeder Zug ausführlich |
| Länge | So lang wie die Züge, mindestens 2800 ms ÷ Tempo (Mindestdauer, siehe 7.5) | So lang wie die Züge, der Weg pausiert |
| Tempo | Weg-Tempo ×1 / ×2 / ×3, kein Überspringen | 1x / 2x und „Überspringen“ als einmaliger Knopf |
| Gemerkt | `tempoWeg`, Standard ist das bisherige `settings.speed` | `tempoFokus`, Standard 1x, merkt die letzte Wahl (Antwort b) |

**Tempo und Fortschritt (so unabhängig wie sinnvoll):**
- **Fokus-Tempo ist völlig unabhängig vom Fortschritt.** Das Ergebnis steht beim Start fest, der Weg pausiert.
- **Weg-Tempo bleibt ein Fortschrittshebel wie heute** (×2 und ×3 bringen doppelt bzw. dreifach so viel pro Stunde). Würden wir das entkoppeln, verlören heutige ×3-Spieler 67 % ihrer Belohnung pro Stunde.
- **Neu:** Wie lange ein einzelner Kampf dauert, ändert die Belohnung pro Stunde nicht mehr. Das gleicht der Wegtakt-Ausgleich W aus (Abschnitt 7).
- In der UI heißen die Knöpfe „Weg ×1 / ×2 / ×3“ mit dem Hinweis „mehr Tempo = mehr pro Stunde“. Im Fokuskampf heißen sie „Abspielen 1x / 2x / ⏭“.

### 2.2 Wegkampf: Schnell-Züge und Schlüssel-Züge [ANNAHME ms, bei ×1; ×2 und ×3 teilen alles]
| Baustein | ms ×1 | Was man sieht |
|---|---|---|
| Ansage | 300 | Gegner, Typ-Chip „▲ Vorteil“ / „▼ Nachteil“, Wetter-Tag falls betroffen |
| **Schnell-Zug** (normaler Treffer) | 450, ab dem 7. normalen Zug 250 | Ausfallschritt, eine Zahl, HP gleitet. Kein Banner, kein Shake. |
| **Schlüssel-Zug** (Krit, Ult, KO, Status, Konter, Mechanik) | 900 | Spotlight-Ring, Ansagezeile, Label, bei der Ult die Ult-Karte |
| Text-Frame ohne Treffer („zögert“, „gefesselt“) | 250 | nur Icon in der Ansagezeile |
| weiterer Treffer im selben Zug | +200 | nacheinander, nie gleichzeitig |
| Ergebnis | 500 | „Sieg“ / „Niederlage“ und ein Grund-Chip |
| **Mindestdauer** | 2800 ÷ Tempo | kurze Kämpfe werden nie schneller als heute (wichtig für die Server-Prüfung) |

Gemessene Wirkung: Median 4,4 s, p90 6,8 s pro Wildbegegnung bei ×1 in Kapitel 1. Die Werte für spätere Regionen stehen in 7.1.

### 2.3 Fokuskampf: ein Zug = 4 Phasen, immer nur eine Aktion
| Phase | Was passiert | 1x normal | 1x Schlüsselzug | 2x |
|---|---|---|---|---|
| **Ansage** | Spotlight-Ring unter dem Handelnden, Name der Aktion in der festen Ansagezeile | 300 | 500 | ÷2 |
| **Aktion** | Ausfallschritt und Projektil (FX ≤ 500 ms) | 400 | 600 | ÷2 |
| **Treffer** | eine Zahl mit Label (STARK / KRIT / Wetter), HP gleitet 300 ms, Status-Chip erscheint | 400 | 600 | ÷2 |
| **Ergebnis** | kurze Ruhe, Logzeile erscheint | 200 | 400 | ÷2 |
| Summe | | **1300** | **2100** | 650 / 1050 |

Alle Werte sind **[ANNAHME]**. Ein Wächterkampf mit Median 18 Zügen dauert bei 1x etwa 27 s, p90 (66) etwa 95 s.

### 2.4 Regeln für beide Kampfarten
- Es läuft nie mehr als **eine** Aktion. Die nächste startet erst nach dem Ende der vorigen, es gibt keine Überlappung (behebt P2).
- Mehrere Treffer in einem Zug laufen nacheinander. Heilung und Status bekommen eine eigene Treffer-Phase.
- Shake gibt es nur bei Krit und Ult, Hitstop nur bei der Ult. Parallax bewegt sich nur in der Aktionsphase.
- **Überspringen** gibt es nur im Fokuskampf und führt sofort zur Zusammenfassung. Im Wegkampf gibt es kein Überspringen, weil es sonst den Wegtakt aushebeln würde. Ein Tap auf die Bühne pausiert in beiden Kampfarten.
- KO-Wechsel (6-KO-Regel): eine Zwischenkarte von 800 ms, „Glutschwinge kommt rein – 2 / 6 KO“, im Wegkampf 400 ms.
- Die Zugdauer berechnet die reine Funktion `zugDauer(frame, art)` aus dem Trace (A1). Player und Belohnungsausgleich nutzen dieselbe Funktion.

### 2.5 Kampflog
- **Eingeklappt:** eine Zeile unter der Bühne mit der neuesten Aktion, Icon und kurzem Satz (≤ 6 Wörter), z. B. „🔥 Funkfuchs: Glutbiss – 34 (stark)“ (eigene Icons statt Emoji).
- **Aufgeklappt:** ein Tap öffnet ein Sheet mit allen Zügen, gruppiert nach Teilkampf (1 / 6 …). Jede Zeile hat ein Icon, wer, was, die Zahl und Tags: ▲ stark · ▼ schwach · ☂ Wetter ±% · ✦ Krit · Status. Auch jeder Schnell-Zug steht dort ausgeschrieben.
- Die Sätze kommen aus i18n (DE/EN), nicht mehr fest im Kampfcode (`battle.ts:381–644`).
- Gespeichert werden die letzten 10 Kämpfe nur im Speicher der Sitzung, **nicht im Spielstand** **[ANNAHME]**.

### 2.6 Zusammenfassung am Ende („Warum?“)
- **Fokuskampf:** eine volle Karte.
  1. **Ergebnis:** Sieg / Niederlage, KO 4 / 6, +G, +EP.
  2. **Die 3 wichtigsten Gründe**, aus dem Trace berechnet: Typ („62 % deiner Treffer waren stark“), Wetter, Erstschlag, Ult-Anteil, Statusschaden, Krits und Boss-Mechanik.
  3. **Schadensanteile:** ein Balken pro Monster (normal / Ult / Status).
  4. **1–3 Tipps** aus einer festen Regeltabelle, nie kaufbezogen.
  5. Knöpfe „Kampflog“ und „Weiter“: bei Sieg nach 4 s automatisch weiter, bei Niederlage wartet die Karte.
- **Wegkampf:** nur die 500-ms-Ergebniszeile mit einem Grund-Chip. Ein Tap darauf öffnet die volle Karte, der Weg pausiert solange. Bei einer Niederlage im Wegkampf steht 1 Tipp in der Logzeile.

---

## 3. Klare Anzeigen

| Was | Neu |
|---|---|
| **Typ-Vorteil** | Vor dem Kampf (Ansage) steht ein Chip zwischen den Monstern: Typ-Icon → Typ-Icon mit „▲ stark“ / „▼ schwach“ / „= neutral“. Beim Treffer gibt es ein Label **mit Form** (Doppelpfeil, Pfeil, Strich), nicht nur Farbe. |
| **Wetter** | Der Chip oben bleibt. Zusätzlich gibt es in der Ansage einmal „☂ Regen: Wasser +15 %, Feuer −15 %“. Betroffene Treffer bekommen das Wetter-Tag „−15 %“ neben der Zahl, statt nur einem Rand. |
| **Status** | Ein Chip mit Icon **und** Kurzname, Runden und Stapeln, z. B. „Brand 2“, direkt unter dem HP-Balken. Der Statusschaden hat eine eigene Treffer-Phase. |
| **Ultimate** | Eine Leiste mit 5 großen runden Segmenten unter dem HP-Balken, auf dem Handy mindestens 8 px hoch **[ANNAHME]**. Ist sie voll, steht dort „ULT bereit“. Die Ult bekommt eine eigene Ansage von 900 ms: eine Karte mit Name und Muster, und der Rest der Bühne wird abgedunkelt. Unter Lv 25 steht in der Leiste ein Schloss mit „ab Lv 25“ (lesbar groß), sonst nichts. |
| **Lebenspunkte** | Der Balken gleitet in 300 ms, der verlorene Teil bleibt 400 ms hell sichtbar. **Der Zahlenwert „34 / 120“ ist standardmäßig an** (Antwort c) und lässt sich in den Optionen abschalten (`showHpNumbers`). |
| **Boss-Mechanik** | Ein Symbol mit 1-Wort-Label. Löst eine Mechanik aus, bekommt sie eine eigene Ansage, z. B. „Panzerung: −20 %“. |

**Mobile-Layout im Hochformat (1080 × 2340, von oben nach unten):**
1. Kopfzeile: Wetter-Chip · KO-Punkte (●●○○○○) · Tempo (Weg ×1 / ×2 / ×3, im Fokuskampf 1x / 2x / ⏭)
2. Gegnerkarte oben rechts: Name, Typ, HP, Status, Ult
3. Bühne mit den Monstern
4. **Feste Ansagezeile** in der Mitte, eine Zeile, mindestens 44 px Designmaß
5. Eigene Karte unten links: Name, Typ, HP, Status, Ult
6. Logzeile (Tippen klappt das Log auf)
7. Team-Leiste

Wächterkarte, Herausfordern-Knopf und Wetter-Vorschau werden im Fokuskampf ausgeblendet.

---

## 4. Barrierefreiheit
- **Reduzierte Bewegung** folgt der Einstellung im Spiel oder `prefers-reduced-motion` (`app.ts:1004`). Dann gibt es keine Shakes, keinen Hitstop, keine Parallax und keine Partikel. Die Aktion ist eine Überblendung von 200 ms, die Phasenlängen bleiben.
- **Lesbarkeit:**
  - Kampftexte mindestens 40 px Designmaß (etwa 14 px auf einem 390-px-Handy), Labels mindestens 32 px **[ANNAHME]**.
  - Schlüssel-Ansagen stehen bei ×1 mindestens 900 ms. Schnell-Züge zeigen nur Symbol und Zahl, der Satz dazu steht im Log.
  - Die Schriftgröße `--font-scale` wirkt auch hier.
  - Ansagen wechseln nie, während sie einblenden.
- **Farbe ist nie das einzige Signal:** stark, schwach, Krit, Wetter und Status haben immer Form oder Wort. Die Zahlen bekommen zusätzlich Tags.
- **Screenreader:** Die Ansagezeile ist `aria-live="polite"`. Das Log ist eine echte Liste.
- **Bedienung:** Pause per Tap und (im Fokuskampf) Überspringen sind mit 1 Tap erreichbar, mit einer Zielgröße von mindestens 120 px Designmaß (etwa 44 pt).

---

## 5. Grafik für Smettbo (weich und rund, eigene Formen)
1. **Spotlight-Ring** unter dem handelnden Monster, 2 Varianten (eigenes Monster / Gegner), 256 px.
2. **Ansage-Karte** (abgerundet, halbtransparent) und **Ult-Ansage-Karte** mit Glanz, 9-Slice.
3. **Vorteils-Chips** „stark / schwach / neutral“ mit Form (Doppelpfeil / Pfeil / Strich), 64 px.
4. **Ult-Leiste neu:** 5 runde Segmente (leer, voll, bereit-Glow), Schloss-Symbol, 2 Größen.
5. **Status-Chip-Rahmen** (die Status-Icons gibt es schon) und **Wetter-Tag** für Zahlen.
6. **Log-Icons** 48 px: Angriff, Krit, Ult, Heilung, Schild, Status, Wetter, KO, Wechsel, Boss-Mechanik (10 Stück).
7. **Zusammenfassungskarte:** Rahmen, Grund-Icons (Typ, Wetter, Erstschlag, Ult, Status, Mechanik) und Tipp-Glühbirne.
8. **Tempo-Knöpfe** Weg ×1 / ×2 / ×3, Fokus 1x / 2x / Überspringen / Pause sowie die **KO-Punkte** (6, voll und leer).

---

## 6. Spielstand und Seed
- **Das Kampfergebnis bleibt identisch.** `fight1v1`, die Schadensformel, die RNG-Reihenfolge, der Seed (`fightSeeded`), der Ablauf der Wegknoten und die Server-Prüfung der Kampfregeln bleiben unverändert.
- Die Belohnungsänderungen in Abschnitt 7 ändern **keine Anzahl von Zufallszügen**: Chancen werden nur als Schwelle multipliziert (`rng() < p`), Bruchteile laufen über deterministische Banken. Die Fund-Frucht (`shop.ts:173–175`) zieht bei Erfolg eine zweite Zahl, deshalb bleibt ihre Chance unverändert.
- **Neue Felder im Spielstand, alle optional mit Standardwert, ohne Migration:**

| Feld | Typ | Standard | Zweck |
|---|---|---|---|
| `settings.tempoWeg` | 1 \| 2 \| 3 | bisheriges `settings.speed` | Weg-Tempo. Fehlt das Feld, bleibt `settings.speed` die Quelle. Der Wert liegt schon im Spielstand und hält nach dem Neuladen. Es wird dafür nichts Neues geschrieben. |
| `settings.tempoFokus` | 1 \| 2 | 1 | letztes Fokus-Tempo (Antwort b). Überspringen ist eine einmalige Aktion und wird nicht gemerkt. |
| `settings.showHpNumbers` | boolean | `true` | HP als Zahl (Antwort c) |
| `roadPace` | number | 1,6 (Messung Kapitel 1) | Wegtakt-Ausgleich W (7.3) |
| `rewardBank` | `{ mastery, findChest, trainerChest, shard }` | alle 0 | Bruchteile aus W |

- `settings.speed` bleibt erhalten, damit ältere Builds den Spielstand weiter lesen können. Porygon prüft, ob ein v12-Bump nötig ist **[ANNAHME: nein]**.
- **Ausnahme:** Die Trace-Felder nur für die Darstellung (`actor`, `isStatusTick`, `firstStrike`, `mechHit`) werden nur bei `trace = true` gesetzt und ziehen keine Zufallszahl. Ein Golden-Seed-Test sichert das ab (A1).

---

## 7. Balancing: langsamerer Wegfortschritt und Ausgleich

### 7.1 Messung (`origin/main` 071ba91)
- **Messaufbau:**
  - Skript `/tmp/k7m/b.ts` und `/tmp/k7m/c.ts` auf einer Kopie, kein Repo-Code geändert.
  - Je 6 Läufe × 3000 Begegnungen mit `resolveEncounter(..., { trace: true })`.
  - Neue Dauer = `zugDauer` nach Tabelle 2.2 mit Mindestdauer, normale Züge ab dem 7. mit 250 ms.
  - Drei Stände: Region 1 Kapitel 1 (Starter, Lv 12) sowie Region 2 Kapitel 4 (Lv 84) und Region 4 Kapitel 4 (Lv 192), beide mit `referenceTeam` auf dem Kapitel-Cap. Die beiden späteren Stände sind synthetisch **[ANNAHME: repräsentativ]**.
- **Alt:** Jede Begegnung dauert 2800 / 1400 / 930 ms (`const.ts:24–25`), unabhängig vom Kampf.

| Stand | Züge Wild Median / p90 | **Wild alt ×1** | **Wild neu ×1** Median / p90 / Mittel | Wild neu ×2 Median / p90 | Wildkämpfe/h ×1 alt → neu | Faktor Weg gesamt* |
|---|---|---|---|---|---|---|
| R1 K1 | 6 / 11 | 2800 ms | 4400 / 6800 / 4698 ms | 2200 / 3400 ms | 1286 → 766 (×0,60) | **1,60** |
| R2 K4 | 9 / 20 | 2800 ms | 5750 / 12.900 / 6705 ms | 2875 / 6450 ms | 1286 → 537 (×0,42) | **2,21** |
| R4 K4 | 13 / 24 | 2800 ms | 8700 / 15.550 / 8807 ms | 4350 / 7775 ms | 1286 → 409 (×0,32) | **2,87** |

\*Faktor Weg gesamt = Weg-Zeit neu / alt über Wild, Trainer, Fund und Quelle. Fund und Quelle bleiben 2800 ms. Trainer allein: 5379 / 7150 / 9271 ms im Mittel.
Bei ×2 und ×3 halbiert bzw. drittelt sich alles. Die Faktoren bleiben gleich, weil auch „alt“ geteilt wird (1400 / 930 ms).

**Ohne Ausgleich** sinken EP/h, Gold/h, Splitter/h, M-EP/h und Truhen/h beim aktiven Spielen um **−37 % (R1), −55 % (R2) und −65 % (R4)**. Die Kämpfe werden mit dem Spielfortschritt länger, deshalb reicht **kein fester Faktor**: ein fester Faktor 1,65 passt in R1 (−0,4 %), liegt aber in R2 bei −29 % und in R4 bei −46 % (gemessen in einer Vorfassung ohne die 250-ms-Verkürzung).

### 7.2 Wegkämpfe kürzer machen (schon eingerechnet)
- Schlüssel-Züge sind ausführlich (900 ms), alle anderen sind Schnell-Züge (450 ms, ab dem 7. normalen Zug 250 ms). Eine erste Fassung mit 500 / 1000 ms ohne Verkürzung lag in R1 bei 5477 ms im Mittel und einem Wegfaktor von 1,83, gemessen.
- Kein Banner, kein Shake und keine Parallax bei Schnell-Zügen. Die Ergebniszeile dauert nur 500 ms.

### 7.3 Ausgleich: Wegtakt-Ausgleich W (pro Spielstand, deterministisch)
**Formel:**
- `d = zugDauer(Begegnung, ×1)` in ms. Fund und Quelle zählen mit 2800 ms, Wächter, Rat und Weltenbiest zählen nicht.
- `W_alt = save.roadPace` (Standard 1,6)
- **Belohnung = Basis × clamp(W_alt, 1, W_CAP) × k_X**, mit `W_CAP = 3,5` **[ANNAHME]** und `k_X = 1,00` als Start (je ein k für EP, Gold, Splitter und M-EP)
- danach `roadPace = W_alt + (2/51) × (d/2800 − W_alt)`, also ein gleitender Schnitt über etwa 50 Wegknoten

W wird **vor** der aktuellen Begegnung gelesen und erst danach aktualisiert. Es ist zeitunabhängig, rechnet immer mit ×1 und hängt nicht am Tempo. Damit bleibt ×2 / ×3 als Fortschrittshebel wie heute.

**Gemessen mit W (Kampfzeit neu gegen alt, Tempo ×1, je 18.000 Begegnungen):**

| Stand | EP/h | Gold/h | Splitter/h | M-EP/h | Truhen/h |
|---|---|---|---|---|---|
| R1 K1 | −1,4 % | −0,7 % | −0,5 % | −1,1 % | −0,2 % |
| R2 K4 | −0,5 % | −1,4 % | −0,6 % | −0,6 % | −0,4 % |
| R4 K4 | −0,5 % | −2,0 % | −0,8 % | −0,4 % | +1,2 % |

Alle Werte liegen innerhalb des Ziels von höchstens −10 %.

### 7.4 Wo W wirkt (Konstanten und Fundstellen), nur online, nur Wegknoten
| Belohnung | Fundstelle | heute | neu (Beispiel W = 1,6 / 2,9) |
|---|---|---|---|
| Wild-Gold | `sim.ts:618` `4 * level` | 4 × Lv | 4 × Lv × W → 6,4 / 11,6 × Lv |
| Trainer-Gold | `sim.ts:670, 685` `25 * Σlevel` | 25 × ΣLv | 25 × ΣLv × W → 40 / 72,5 × ΣLv |
| Fund-Gold | `route.ts:252–253` `50 * chapterId` | 50 × Kap. | 50 × Kap. × W |
| Kampf-EP | `sim.ts:269` `8 * foeLevel * (1 + RARITY_EXP * rarity)` | 8 × Lv × … | 8 × Lv × … × W → 12,8 / 23,2 × Lv × … |
| Splitter-Chance (Wild) | `data/lootbox.json:16` `wildShardPct` [20 … 1 %], `sources.ts:137–140` | 20 % (Rarität 0) | Chance × W, gedeckelt auf 95 %. Der Rest kommt in `rewardBank.shard` (Bruchteil, ganzer Splitter bei ≥ 1). |
| Fund-Truhe | `sources.ts:65–66` (1 × Kiesel) | 1 | `rewardBank.findChest += W`, ganze Truhen werden ausgegeben |
| Trainer-Silbertruhe | `data/lootbox.json:20` `trainerSilver 0.1`, `sources.ts:69–71` | 10 % | 10 % × W, gedeckelt auf 95 %, Rest in die Bank (eine Zufallszahl wie bisher) |
| Meisterschaft pro Sieg | `mastery.ts:12` `MASTERY_WIN = 1`, `sim.ts:390` | 1 M-EP | W M-EP über `rewardBank.mastery`. Die Stufengrenzen `MASTERY_STEPS` (`mastery.ts:11`) bleiben, Spielstände bleiben gültig. |
| Fund-Frucht | `shop.ts:173–175` | unverändert | bleibt (2 Zufallszahlen). Die Früchte pro Stunde aus Funden sinken um bis zu 65 %, siehe Risiken. |

**Nicht betroffen:** Wächter, Rat, Weltenbiest und `MASTERY_BOSS`, denn diese Kämpfe startet der Spieler und der Weg pausiert. Ebenso der zeitbasierte Wegstapel `bankRoad` (`sources.ts:43–55`), Expeditionen und Forschung.

### 7.5 Idle und Offline
- Offline ist **begegnungsbasiert und rechnet mit einem festen Takt**: `count = floor(countedMs / BASE_ENCOUNTER_MS)` (`sim.ts:1007`, `const.ts:138–141`), also 1 Begegnung pro 2800 ms, gedeckelt auf 8 h (`OFFLINE_CAP_MS`, `const.ts:26`), EP × 0,5 (`OFFLINE_EXP_FACTOR`, `const.ts:18`).
- **Offline bleibt unverändert, W = 1**, weil offline kein Abspielen stattfindet. Offline/h bleibt damit exakt wie heute, die Abnahme erlaubt ±1 %.
- Dass online mit W aktiv gespielt wird, offline aber nicht, ist gewollt. Online/h liegt wie heute bei etwa ×2 von offline (EP-Faktor 0,5).
- Die **Mindestdauer** von 2800 ms ÷ Tempo pro Wegkampf sorgt dafür, dass online nie mehr Begegnungen pro Stunde möglich sind als heute.

### 7.6 Meisterschaft
- Bisher: Stufe 5 (35.000 M-EP, `mastery.ts:11`) nach etwa 8,5 h bei Tempo 3 (Porygons Simulation, Schritt 6).
- Mit W ändert sich M-EP/h um −0,4 bis −1,1 % (7.3). **Ziel: Stufe 5 nach 8,5 h ±10 % bei Tempo 3**, gemessen in der Abnahme A4.

### 7.7 Server-Prüfung (Plausibilität) wächst mit
- **Heute:** Die Grenzen rechnen mit 1 Begegnung pro 930 ms mal der höchsten Belohnung pro Begegnung, mal Puffer 1,2:
  - `check.ts:9–10, 102–164`: `allowedGold`, `allowedEp`, `allowedShards`, `allowedMastery`, `allowedChests`
  - SQL `supabase/migrations/20261119010000_first_upload_audit.sql:48–52`, Flag 2 erst ab dem Doppelten
- **Neu:** Die Belohnung pro Begegnung steigt um bis zu `W_CAP`. Die Begegnungszahl pro Stunde sinkt um W, aber auf kurzen Strecken mit kurzen Kämpfen kann sie bis zur Mindestdauer gehen. Deshalb gilt:
  - `allowedEp`, `allowedGold` (Weg-Anteil), `allowedShards`, `allowedMastery` und `allowedChests` (Kampf-Anteil) werden mit `W_CAP = 3,5` multipliziert. Neue Konstante `REWARD_PACE_CAP` in `check.ts`, gleicher Wert in einer neuen SQL-Migration (`audit_implausible`).
  - Die Wappen-Grenze, Offline-Grenzen und der Puffer 1,2 bleiben.
  - Spätere Verschärfung, wenn Kokowei echte `roadPace`-Daten hat: `W_CAP` auf p99 + 10 %.
- **Muss gemeinsam mit A4 live gehen**, sonst drohen falsche Flags.

### 7.8 Nachskalieren (darf Porygon ohne Rückfrage, linear)
- Nach der Messung in der Abnahme gilt für jede Größe X ∈ {EP, Gold, Splitter, M-EP, Truhen}: **`k_X,neu = k_X,alt × (X/h alt ÷ X/h neu)`**.
- Erlaubt ist auch, alle Zugzeiten aus 2.2 gleichmäßig mit einem Faktor s zu skalieren. W passt sich dann von selbst an. Danach wird erneut gemessen.
- Nicht erlaubt ohne Rückfrage: andere Kampfwerte, andere Mindestdauer, andere Offline-Regeln, W auf Wächter.

### 7.9 Abnahmekriterium Balancing (Magnetilo / Porygon)
- Simulation mit Tempo ×1, je 6 Läufe × 3000 Begegnungen, auf drei Ständen (R1 K1, R2 K4, R4 K4) wie in 7.1. Verglichen wird `main` (2800 ms pro Begegnung) mit dem neuen Stand (`zugDauer` und W).
- **EP/h und Gold/h neu gegen alt innerhalb ±10 %** auf allen drei Ständen. Splitter/h, M-EP/h und Truhen/h ebenfalls innerhalb ±10 %.
- Offline-Ertrag für 8 h identisch (±1 %).
- Golden-Seed: Sieg, HP und Frames bei 10.000 Seeds bitgleich.
- Keine Wegbegegnung kürzer als 2800 ms ÷ Tempo.
- Server: Ein ehrlicher 1-h-Lauf bei ×3 bleibt bei Flag 0.

---

## 8. Schrittliste (kleine PRs, einzeln testbar)
| PR | Inhalt | Abnahme für Magnetilo |
|---|---|---|
| **A1** | Trace-Felder nur für die Darstellung, reine Funktion `zugDauer()`, Golden-Seed-Test | 10.000 Seeds: Sieg, HP und Frames identisch zu `main`. `zugDauer` liefert für Testtraces die Werte aus 2.2 und 2.3. |
| **A2** | Abspiel-Warteschlange „eine Aktion zur Zeit“ (`battlePlayer.ts`), hinter einem Flag | Unit-Test: Phasenfolge und Längen. Aktive FX nie mehr als 1. |
| **A3** | Wegkampf Zug für Zug (Wild, Trainer) mit Schnell- und Schlüssel-Zügen, Mindestdauer, `tempoWeg` im Spielstand | Live ×1 / ×2 / ×3: jeder Zug sichtbar, keine Begegnung unter 2800 / 1400 / 930 ms, alter Spielstand lädt mit seinem bisherigen Tempo. |
| **A4** | Wegtakt-Ausgleich W (`roadPace`, `rewardBank`, k-Faktoren), offline W = 1 | Simulation nach 7.9: EP/h und Gold/h innerhalb ±10 %, Offline ±1 %, Meisterschaft Stufe 5 nach 8,5 h ±10 % bei ×3. |
| **A5** | Server-Plausibilität × `REWARD_PACE_CAP` (`check.ts` und neue SQL-Migration), **gemeinsam mit A4 live** | Ehrlicher 1-h-Lauf bei ×3 ergibt Flag 0. Ein manipulierter Spielstand mit 5× Gold ergibt weiterhin Flag ≥ 1. |
| **A6** | Fokuskampf (Wächter, Rat, Weltenbiest): Weg pausiert, 1x / 2x / Überspringen, `tempoFokus` gemerkt | Wächter mit 4 Teilkämpfen: jeder Zug sichtbar. 2x wählen, App neu laden, nächster Wächter startet in 2x. Überspringen führt in ≤ 300 ms zur Zusammenfassung. |
| **A7** | Kampflog: eingeklappte Zeile und Sheet, i18n DE/EN | Jeder Zug steht im Log, auch Schnell-Züge. Zahlen gleich den Trefferzahlen. Englisch zeigt englische Zeilen. |
| **A8** | Anzeigen: Vorteils-Chip, Wetter-Tag, Status-Chip, Ult-Leiste und Ult-Ansage, **HP-Zahl standardmäßig an** und Option `showHpNumbers` | 390 × 844: Ult-Leiste ≥ 8 px, HP-Zahl sichtbar und in den Optionen abschaltbar (bleibt nach Neuladen aus), Graustufen-Screenshot verständlich. |
| **A9** | Zusammenfassung „Warum?“ (Fokus: volle Karte, Weg: Grund-Chip plus Tap) | 10 feste Seeds: Gründe passen zum Log, Tipps nie kaufbezogen, Niederlage wartet auf Tap. |
| **A10** | Hochformat-Layout und Barrierefreiheit, Smettbos Grafiken, Arena-Replay auf den Player, Flag und altes `shotAt`-Abspielen weg, 30-fps-Messung | Reduzierte Bewegung: 0 Shakes und 0 Partikel. Text ≥ 40 px Designmaß. Headless 390 × 844 mit CPU 4×: 5-%-Low ≥ 30 fps im Wegkampf bei ×3 und im Fokuskampf. |

---

## 9. Entscheidungen von Fabian-Noel (20.11., 13:02)
1. **Wildkämpfe:** Zug für Zug, auch wenn der Fortschritt langsamer wird. Der Ausgleich steht in Abschnitt 7.
2. **Tempo im Fokuskampf:** merkt sich die letzte Wahl (`tempoFokus`).
3. **Lebenspunkte:** standardmäßig als Zahl, abschaltbar (`showHpNumbers`).

**Risiken:**
- Spätere Stände sind synthetisch gemessen (`referenceTeam` auf Cap). W gleicht das zwar selbst aus, aber die Kampfdauer in R4 (Median 8,7 s bei ×1) kann sich zäh anfühlen. Das prüfen wir im Playtest, sonst skaliert Porygon nach 7.8 mit s < 1.
- `W_CAP` lockert die Server-Grenzen pro Begegnung bis 3,5×.
- Früchte aus Funden pro Stunde sinken um 37–65 %.
- Weniger Kämpfe pro Stunde machen die Tages- und Erfolgszähler langsamer, z. B. 50 Wildkämpfe pro Tag (`daily.ts:28`): in R4 etwa 7 statt 2,3 min bei ×1.
