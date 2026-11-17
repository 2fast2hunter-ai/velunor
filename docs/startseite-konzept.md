# Velunor – Startseite „Neues Spiel“ (Konzept)

**Status: FREIGEGEBEN 17.11. 18:22 (mit Änderungen, siehe Abschnitt 10)** (17.11.2026, Lucario). Wird erst nach Freigabe durch Fabian-Noel gebaut.
Grundlage: Handy-Screenshot `startseite/start-ist-handy.png`, Code `src/adventure/app.ts`, `const.ts` (STARTERS), `save.ts` (`avatar: 'A'|'B'`), `data/monsters.json`.

## 1. Probleme heute
- Das Spiel nutzt nur einen schmalen Streifen, links und rechts ist leerer Rand, unten ist die Hälfte leer.
- Schrift 9–12 px, Namensfeld etwa 20 px hoch, Sprach-Knöpfe ohne klaren Zustand.
- Avatar ist nur „A/B“ ohne Bild.
- Starter-Karten etwa 60 px, ohne Typ, Werte oder Beschreibung.
- Kein Start-Button, nur der Hinweis „Wähle einen Starter.“
- Kein „Weiterspielen“, kein Ladezustand.

## 2. Leitlinien
- Mobil zuerst: Hochformat 390×844 als Referenz, die Fläche wird voll genutzt. Auf dem Desktop dieselbe Spalte, max. 480 px breit, mittig vor dem Hintergrundbild.
- Weicher, runder Velunor-Look: Ecken 20–28 px, weiche Schatten, Pastell-Verlauf über dem Hintergrund, Schrift wie im Spiel.
- Mindestgrößen: Fließtext 16 px, Überschrift 28–34 px, jede Tippfläche ≥ 48 px hoch.
- Nichts von Pokémon oder PokeCatch (keine Bälle, keine bekannten Begriffe oder Layouts). Kein Echtgeld, keine Werbung.

## 3. Aufbau (von oben nach unten, ein Bildschirm plus kurzes Scrollen)
1. **Kopf (ca. 30 % Höhe):** Key-Art (Grünmark-Wiese mit den drei Startern) mit Logo „Velunor“ und Untertitel „Ein Idle-Abenteuer“. Rechts oben ein dezenter Sprachchip „DE ▾“ (Bottom-Sheet mit Deutsch/English). Die Wahl gilt sofort, ohne Neuladen.
2. **Weiterspielen (nur wenn ein Spielstand da ist, genau ein Stand):** große Karte ganz oben unter der Key-Art mit Avatar, Name, Kapitel, Stufe des stärksten Monsters und „Zuletzt gespielt vor 2 h“. Button „Weiterspielen“ (primär). Darunter klein „Neues Spiel“. Ein neues Spiel über einen bestehenden Stand fragt nach: „Dein Spielstand wird überschrieben.“ (roter Button, Eingabe nicht nötig). Ohne Spielstand entfällt die Karte und der Neu-Ablauf startet direkt.
3. **Schritt 1: Wer bist du?**
   - Name: Feld 56 px hoch, 18 px Schrift, Platzhalter „Dein Name“. Rechts im Feld ein Würfel-Knopf (48 px) für einen Zufallsnamen aus einer eigenen Liste (z. B. Mira, Joren, Talve, Sunna, Brin, Elko, 40 Namen je Sprache). Vorbelegt mit einem Zufallsnamen statt „Abenteurer“.
   - Regeln: 2–16 Zeichen, Buchstaben, Ziffern, Leerzeichen, Bindestrich. Fehler direkt unter dem Feld in klarer Sprache. Einfacher Wortfilter, weil der Name später in Ranglisten und Gilden (Phase 2) sichtbar ist.
   - **Avatar-Baukasten:** große runde Vorschau (160 px) über drei Zeilen mit Auswahlknöpfen (je ≥ 48 px, waagerecht wischbar):
     - Haut: 6 Töne.
     - Haare: 8 Frisuren (inkl. kurz, lang, Zopf, Locken, Mütze, ohne), keine Geschlechtsbezeichnung.
     - Farbe: 8 Farben, gilt für Haare und Umhang gemeinsam.
     - Würfel-Knopf „Zufällig“ neben der Vorschau. Vorauswahl zufällig. 6×8×8 = 384 Kombinationen.
   - Button „Weiter“ (64 px, volle Breite). Der Name muss gültig sein.
4. **Schritt 2: Starter wählen** (eigene Ansicht, oben „Zurück“ zu Schritt 1, Name und Avatar bleiben erhalten).
   - Drei große Karten, horizontal wischbar (eine Karte ca. 80 % breit, Nachbarn angeschnitten) mit Punkten als Anzeige. Auf dem Desktop drei nebeneinander.
   - Jede Karte: großes Bild (ca. 220 px) mit leichter Wipp-Animation, Name, Typ-Chip (Symbol + Farbe + Text), Rollen-Chip (Vorne/Hinten), Kurzbeschreibung (aus `blurb`), drei Balken HP/Angriff/Tempo (aus `base`, auf 0–1 der drei Starter normiert), Fertigkeit in einer Zeile, Hinweis „Stark gegen … · Schwach gegen …“ (aus der Typtabelle).
   - Vorschau: Tipp auf das Bild spielt eine 2-s-Probe der Fertigkeit (vorhandene Typ-Effekte aus K2, kein Schaden, kein Gegner).
   - Gewählt: dicker weicher Rahmen in Typfarbe, Haken, Karte hebt sich leicht an. Nichts ist vorausgewählt.
   - Kurzer Hinweis unter den Karten: „Alle drei sind gleich stark, nur anders. Weitere Monster gibt es aus Siegeltruhen.“
   - Starter-Texte [ANNAHME, Wortlaut aus Daten]: Funkfuchs Feuer, flink, hoher Angriff. Tropfmolch Wasser, Schild, hält viel aus. Knospling Pflanze, heilt.
   - Oben klein der gebaute Avatar mit Name, damit die Wahl sichtbar bleibt.
5. **Start-Button (in Schritt 2):** fest am unteren Rand (sticky, über der sicheren Zone), volle Breite, 64 px hoch, Text „Abenteuer starten“. Grau mit Grund, solange etwas fehlt („Wähle zuerst einen Starter“). Mit Auswahl zeigt er das Starter-Bild klein links im Button.
6. **Übergang:** Button wird zum Ladekreis, dann kurze Einlauf-Animation des Starters in den ersten Kampf (≤ 1,5 s, überspringbar per Tipp).

## 4. Ladezustand und Fehler
- Erste Ladung: Logo mit weichem Puls und Fortschrittsbalken (echte Asset-Zahl), Hinweistext wechselt alle 3 s („Die Wiese erwacht …“).
- Bilder: Platzhalter-Silhouetten in Kartenform, bis das Bild da ist. Key-Art zuerst als kleines unscharfes Vorschaubild.
- Kein Netz nach dem ersten Laden: das Spiel läuft weiter, Hinweis nur bei Funktionen mit Server (Phase 2).
- Spielstand defekt: Karte „Spielstand konnte nicht gelesen werden“ mit „Sicherung laden“ (falls vorhanden) und „Neues Spiel“.

## 5. Barrierefreiheit
- Kontrast ≥ 4,5:1 für Text, Typ nie nur über Farbe (immer Symbol + Wort).
- Echte Schaltflächen mit Beschriftung, Tab-Reihenfolge wie die Optik, sichtbarer Fokusrahmen.
- Starter-Karten als Auswahlgruppe (eine wählbar), mit Pfeiltasten bedienbar.
- Animationen aus, wenn „Bewegung reduzieren“ im System gesetzt ist.
- Schrift skaliert mit der Systemgröße bis 200 % ohne abgeschnittenen Text.
- Sprache des Dokuments wechselt mit (`lang="de"/"en"`).

## 6. Technik und Spielstand
- Neues Feld `save.look = { skin: 0–5, hair: 0–7, color: 0–7 }` (ganze Zahlen, Index in `data/avatar.json`). `save.avatar` (`'A'|'B'`) bleibt zum Lesen alter Stände erhalten und wird nicht mehr geschrieben.
- Migration beim Laden, wenn `look` fehlt: `A` → `{skin:1, hair:0, color:0}`, `B` → `{skin:3, hair:1, color:3}` [ANNAHME: Smettbo baut Haar 0/Farbe 0 und Haar 1/Farbe 3 so, dass sie den heutigen Platzhaltern A/B (gelber bzw. grüner Rahmen) entsprechen]. Fehlende oder ungültige Werte werden auf 0 gesetzt, nie Absturz. `beginAdventure(name, look, speciesId, now)` statt `avatar`.
- Die Speicherversion steigt um 1, Test: alte Stände mit A und B laden, Ergebnis prüfen, Rest des Spielstands unverändert.
- `data/avatar.json` listet Haut-Töne (Hex), Frisuren (Dateinamen) und Farben (Hex). Der Avatar wird aus Ebenen zusammengesetzt (Basis-Kopf in Hautton, Umhang/Kragen in Farbe, Haare in Farbe), Einfärben per Tint, damit nur wenige Dateien nötig sind.
- Nur ein Spielstand, keine Auswahl mehrerer Stände.
- Sprache bleibt in der vorhandenen Einstellung, Startseite liest sie zuerst, sonst Browsersprache.
- Startseite als eigene Ansicht, keine neuen Spielregeln, keine neuen Währungen.
- Ereignisse für Kokowei (anonym): `start_view`, `starter_preview`, `starter_pick`, `random_name`, `start_game`, `continue_game`.

## 7. Grafiken für Smettbo
1. Key-Art Hochformat 1080×1080 (plus 1600×900 Querformat für Desktop): Grünmark-Wiese, die drei Starter zusammen, Platz oben für das Logo.
2. Logo „Velunor“ als Schriftzug, transparent, 1200×360, heller und dunkler Stand.
3. Avatar-Baukasten (alle 512×512, transparent, gleicher Ausschnitt und Ankerpunkt, damit die Ebenen genau übereinander passen; Anzeige rund 160 px und klein 48 px):
   - 3a. Basis: Kopf mit Schultern in neutralem Grau zum Einfärben (Hautton per Tint), mit Gesicht (Augen, Mund) als eigener, nicht eingefärbter Ebene.
   - 3b. Kleidung: Umhang/Kragen in Graustufen zum Einfärben (Farbe).
   - 3c. Haare: 8 Frisuren in Graustufen zum Einfärben (kurz, lang, Zopf, Locken, Dutt, Strubbel, Mütze, ohne/kahl als leere Ebene), je mit Vorder- und Hinterteil, falls die Frisur hinter den Kopf reicht.
   - 3d. Farbtabellen als Vorschlag: 6 Hauttöne (hell bis dunkel) und 8 Farben (Velunor-Pastell), als Hex in einer kleinen Liste, damit Porygon `data/avatar.json` füllen kann.
   - 3e. Runder Rahmen für die Vorschau (weich, 4 px) und ein Würfel-Symbol (vorhanden aus Punkt 6).
4. Starter-Karten: großes Bild je Starter 512×512 (vorhandene Art reicht, falls Auflösung passt) plus Kartenrahmen in 3 Typfarben (Feuer, Wasser, Pflanze), Ecken rund.
5. Typ-Symbole Feuer/Wasser/Pflanze 64 px (vorhandene nutzen, falls schon da) und Rollen-Symbole Vorne/Hinten 48 px.
6. Würfel-Symbol 48 px, Haken für „gewählt“ 48 px, Sprach-Globus 32 px.
7. Ladebildschirm: Logo-Puls (kann das Logo sein) und 3 kleine Silhouetten-Platzhalter.
8. Weicher Hintergrundverlauf/Partikel (Blätter, Lichtpunkte) als leichte Ebene, max. 20 Partikel.

## 8. Bauschritte (nach Freigabe)
- S1: Layout, Größen, sticky Button, Sprachchip, Zufallsname (ohne neue Grafiken, mit Platzhaltern).
- S2: Starter-Karten mit Infos, Wischen, Vorschau.
- S3: Avatar-Baukasten und Migration, Weiterspielen-Karte, Überschreib-Abfrage.
- S4: Key-Art, Logo, Ladezustand, Barrierefreiheits-Check, Test durch Magnetilo auf echtem Handy.
Aufwand [ANNAHME]: je Schritt ein Tag, Grafiken parallel.

## 9. Offene Entscheidungen für Fabian-Noel (beantwortet, siehe Abschnitt 10)
1. Reihenfolge: zuerst Starter, dann Name/Avatar (Vorschlag) oder umgekehrt?
2. Avatare: 8 feste Porträts (Vorschlag) oder einfacher Baukasten (Haut, Haare, Farbe)?
3. Weiterspielen-Karte mit Möglichkeit für mehrere Spielstände (später) oder nur einer (Vorschlag)?

## 10. Entscheidungen Fabian-Noel (17.11. 18:22)
1. Reihenfolge: ZUERST Name und Avatar, DANN Starter (abweichend vom Vorschlag).
2. Avatar: einfacher Baukasten (Haut, Haare, Farbe) statt 8 fester Porträts (abweichend vom Vorschlag).
3. Nur ein Spielstand (Weiterspielen-Karte für genau einen Stand).
4. Freigegeben: S1–S4 bauen.
