# Velunor: Die ersten 30 Minuten und Analytics-Trichter (Konzept, Lucario, 20.11.2026)

**Status: FREIGEGEBEN am 20.11. um 19:44 (laut Evoli), Reihenfolge F → E → R.** Porygon baut F1–F5. Die Entscheidungen stehen in Abschnitt 9.
Auftrag: Fabian-Noel über Evoli, 20.11., 19:18 („Alle 3“). PR-Präfix **F**.

**Rahmen:** kein Pay-to-Win, kein Echtgeld, keine Werbung, nichts aus Pokémon, weicher und runder Look, Spielstände bleiben kompatibel, immer 1v1 mit 6-KO-Regel, Ult ab Lv 25. Zahlen mit **[ANNAHME]** sind nicht gemessen. Gemessene Zahlen nennen ihre Quelle.

Grundlage ist `origin/main` 104bb96 im Repo `/tmp/k7`.

---

## 1. Ziel und Nutzen

- Neue Spieler sollen in 30 Minuten verstehen, was Velunor ausmacht: Der Weg läuft von selbst, Truhen bringen neue Arten, Wappen öffnen neue Bereiche, und mit anderen spielt man zusammen.
- Dafür gibt es **ein sichtbares Ziel zur Zeit**, kurze Hinweise statt Textwänden und eine erklärte erste Truhe. Arena, Gilde, Tausch und Freunde öffnen sich schrittweise und werden vorher angekündigt.
- Ein **Trichter aus vorhandenen Events** zeigt, an welcher Stelle neue Spieler aufhören. **Neue Eventnamen sind nicht nötig**, also gibt es keine Änderung an der Allowlist (Abschnitt 5).
- Der Aufwand ist klein: 5 PRs, nur Client, keine Migration, kein Edge-Deploy.

## 2. Ist-Stand mit Fundstellen

| Thema | Heute im Code |
|---|---|
| Einstieg | Name, Aussehen und Sprache in `onboardingHtml` (`view.ts:2372`), danach Starterwahl Funkfuchs/Tropfmolch/Knospling (`const.ts` STARTERS, `STARTER_LEVEL = 5`) |
| Startausstattung | `START_GOLD = 3000` (`const.ts`). **5 Kieseltruhen** über `startChests()` aus `lootbox.json` → `debugStartChests.kiesel: 5`. Der Schlüssel heißt „debug“, wirkt aber bei jedem neuen Spiel (`save.ts:95`) |
| Weg | 20 Schritte, Heilquellen auf 7 und 14, Wächter auf 20 (`const.ts` HEAL_STEPS, GUARDIAN_STEP). 3 Trainer und 1 Fund pro Kapitel (`route.ts` routeOf) |
| Kampf | Seit A1–A10 Zug für Zug mit Log und „Warum?“. Tempo ×1/×2/×3 |
| Hilfe heute | Ein Leitfaden-Bildschirm mit 13 Absätzen (`view.ts:1495`, `i18n.ts` guide.1–13). Ladetipps `boot.hint1–3`. **Es gibt keine geführten Hinweise im Spiel** |
| Menü | Unten 5 Tabs (Abenteuer, Fortschritt/Team, Kodex, Aktivitäten, Mehr). Im „Mehr“-Blatt stehen **13 Einträge immer sichtbar** (`view.ts:437–455`), auch gesperrte. Die Sperre erklärt erst der jeweilige Bildschirm |
| Freischaltungen | Glücksrad ab 3 Wappen (`wheel.ts` WHEEL_WAPPEN = 3). Chat schreiben ab 3 Wappen (`chat.ts` WRITE_CRESTS = 3). Arena ab 5 Wappen und 6 Monstern im Register (`arena.ts:208`). Gilde gründen ab 8 Wappen (`guild.ts` CREST_NEED, Edge `guild/index.ts:54`). Für den Beitritt steht im Edge-Code keine Wappen-Grenze. Tausch ab 8 Wappen, Konto 7 Tage, E-Mail (`trade.ts`). Freunde ohne Grenze |
| Tempo (gemessen, Sim) | `docs/balance-report.md`: Wiesenpfad (Kap. 1) ist nach **0,30 h online** fertig, Bachufer (Kap. 2) nach 0,70 h, das 3. Wappen nach 1,24 h, das 5. Wappen nach 2,91 h. Gemessen wurde mit dem 2800-ms-Takt. Der Wegtakt-Ausgleich W aus A4 hält den Ertrag pro Stunde bei −2 bis +1 %. Die Zeiten bleiben also ungefähr gleich, bis der Trichter echte Werte liefert |
| Analytics | 11 Events in `src/adventure/cloud/analytics.ts`. Die Server-Allowlist ist der Check-Constraint `events_event_check` (Migration `20261119180000_species_unlock_event.sql`). Spalten in `supabaseApi.ts:111`: `player_id` (anonyme Konto-ID), `event`, `props`. Es wird nur mit Einwilligung „yes“ gesendet, und `sanitizeProps` entfernt Namen, Mails und Geräte-IDs |
| Tutorial-Event | `tutorial_step` mit `{ step }`: 1 = Namensschritt, 2 = Starterschritt, 3 = Spiel gestartet (`app.ts:319–323, 1101, 1252`). `noteTutorial` sendet nur, wenn `step` größer als der bisher gesendete ist. Das gilt nur im laufenden Tab, nicht im Spielstand |
| Weitere Events | `tab_open { tab }` bei jedem Bildschirmwechsel (`app.ts:3646, 4376`). `stage_clear`/`stage_fail { region, chapter, node }`, `guardian_win`/`guardian_fail { region, chapter, team_level, rarity_avg }`, `lootbox_open { tier, rarity, isNew, pityHit }`, `species_unlock { speciesId, via }`, `shard_drop`, `star_up`, `session_start { app_version, platform, offline_minutes }` (`playEvents.ts`, `session.ts:305`) |

**Was heute fehlt:** ein sichtbares nächstes Ziel, eine Erklärung der ersten Truhe, Hinweise im richtigen Moment, ein Ausblick auf gesperrte Bereiche und ein auswertbarer Trichter über Schritt 3 hinaus.

## 3. Design

### 3.1 Leitlinien
- **Ein Ziel zur Zeit:** Ein Ziel-Chip oben im Abenteuer zeigt eine Zeile, z. B. „Besiege Wächterin Mira · Schritt 12/20“.
- **Hinweise sind kurz:** höchstens 1 Satz und höchstens 80 Zeichen [ANNAHME]. Ein Hinweis zeigt auf genau ein Bedienelement und schließt per Tippen irgendwo. Er hält den Auto-Kampf nie an.
- **Höchstens 1 Hinweis pro 90 s** [ANNAHME]. Es steht nie mehr als ein Hinweis zugleich auf dem Bildschirm. Ein Hinweis kommt **nie während eines Fokuskampfs** (Wächter).
- **Abschaltbar:** In den Optionen gibt es „Hinweise aus“. Erledigte Hinweise kommen nicht wieder.
- **Keine Textwand:** Der Leitfaden (guide.1–13) bleibt als Nachschlagewerk. Neu kommt kein Absatz dazu.
- **Kein Druck:** Es gibt keine Countdowns. Wer einen Hinweis wegtippt, verliert nichts.

### 3.2 Zeitleiste Minute 0–30
- Die Minuten sind **[ANNAHME]**, außer wo „Sim“ steht.
- Die Zeit für Wappen 1 kommt aus meiner Sim-Messung vom 20.11. (Abschnitt 4.1). Sie liegt **später als die 0,30 h aus `balance-report.md`**. Der Bericht nimmt an, dass der Träger immer selbst kämpft und gewinnt. Die Sim spielt mit echtem Team, Niederlagen und Heilquellen-Rücksprung.
- Deshalb hängen Freischalt-Pfad, Freunde und Gilde **nicht** an Wappen 1, sondern an Spielzeit oder Fortschritt.

| Min | Was passiert | Ziel-Chip | Hinweis (Beispieltext) | Trichter-Stufe |
|---:|---|---|---|---|
| 0–1,5 | Name, Aussehen, Starter (wie heute) | – | – | T1–T3 |
| 1,5–2,5 | Erster Wildkampf läuft Zug für Zug. Der Fund auf Schritt 2 bringt die erste Fund-Kieseltruhe (Sim: bei Knoten 2) | „Gewinne deinen ersten Kampf“ | „Tippe ×2, wenn es schneller gehen soll.“ | T4 |
| 2,5–5 | **Erste Truhe erklärt** (Abschnitt 3.3): 2 Starttruhen, die erste geführt und sicher neu, die zweite öffnet man selbst | „Öffne eine Siegeltruhe“ | Pfeil auf „Aktivitäten“: „Hier warten Truhen auf dich.“ | T5, T6 |
| 5–8 | Das Team füllt sich aus Fund-Truhen (Sim: 6 Monster nach etwa Knoten 34, also etwa 3 min) | „Wähle deinen Begleiter“ | „Bis zu 6 Monster kämpfen nacheinander. Der Begleiter bekommt mehr EP.“ | T7 |
| 8–10 | Heilquelle Schritt 7 | „Erreiche die Heilquelle (7/20)“ | „Quellen heilen dein Team. Fällst du, geht es hier weiter.“ | T8 |
| 10–14 | Weg und erste Spur | „Weiter zu Schritt 14“ | Beim ersten `shard_drop`: „Spuren sammeln sich zu einer neuen Art.“ | – |
| 14–17 | Tagesaufgaben (Schritt 17). Die Truhen-Aufgabe ist meist schon erledigt | „Hol dir deine Tagesbelohnung“ | „Jeden Tag 3 kleine Aufgaben, verpasste Tage kosten nichts.“ | T11 |
| 17–21 | **Freischalt-Pfad** öffnet sich, nach 15 min Spielzeit oder bei Wappen 1, je nachdem, was zuerst kommt | „Sieh dir an, was kommt“ | Punkt auf „Mehr“ | T10 |
| 21–25 | **Freunde** (keine Grenze) | „Teile deinen Freundescode“ | „Freunde schicken sich täglich Gold und kämpfen zusammen gegen das Weltenbiest.“ | T12 |
| 25–30 | **Gilde beitreten** (Gründen erst ab 8 Wappen) | „Finde eine Gilde“ | „Eine Gilde hat gemeinsame Wochenziele.“ | T13 |
| 28–40 | **Wächterin Mira**: Fokuskampf mit 1x/2x/Überspringen. Der Ziel-Chip zeigt ab Minute 15 „Mira: {Lv} / empfohlen Lv 10“ | „Mach dein Team bereit für Mira“ | Erst nach dem Sieg: „Wappen öffnen neue Bereiche.“ | T9 |
| ab Wappen 1 | Das Ziel wird Kapitel 2 und das 3. Wappen (Glücksrad, Chat) | „Nächstes Wappen: Bachufer“ | keine weiteren Pflicht-Hinweise | T14 = D1-Rückkehr |

**Ergebnis nach 30 Minuten [Sim]:**
- etwa 18 oder mehr neue Arten (gemessen ohne W 17,8–19,1, mit W eher mehr) und ein volles Team
- 1 Tagesaufgabe, Freunde und Gilde sind bekannt
- **Wappen 1 hat etwa jeder Dritte** (p25 ≈ 28 min). Der Median liegt bei 34–41 min.
- Arena, Glücksrad, Chat und Tausch sind angekündigt, mit Bedingung und grober Spielzeit.

### 3.3 Die erklärte erste Truhe
- Auslöser: Der Spieler öffnet die Aktivitäten zum ersten Mal oder tippt auf den Hinweis.
- Es erscheinen **3 kleine Karten** über dem Truhen-Dialog, je höchstens 2 Zeilen. Wischen oder „Weiter“ blättert, „Überspringen“ ist immer da.
  1. „Eine Kieseltruhe enthält ein Monster aus den Regionen, die du kennst.“
  2. „Neue Art: Sie kommt ins Team oder in den PC. Kennst du sie schon, gibt es Splitter, die sie stärker machen.“
  3. „Die Chancen stehen offen unter ‚Raten‘.“ Der Knopf zeigt die echten Raten aus `lootbox.json` (Kiesel 45/30/15/7/2,5/0,5 %).
- Danach öffnet der Spieler selbst mit der bestehenden Siegel-Animation (`SEAL_SPIN_MS = 2000`).
- **Entschieden (Fabian-Noel, 20.11. 19:44):** Die allererste Truhe bringt **garantiert eine neue Art**, mit der Seltenheit nach den normalen Kiesel-Raten. Ist die gezogene Art schon bekannt, wird innerhalb derselben Seltenheit eine unbekannte gezogen. Das ist kein Machtschub.
- **Neu: 2 Starttruhen statt 5** (Begründung in Abschnitt 4.1). Die erste wird geführt geöffnet, die zweite mit dem Hinweis „Jetzt du“ selbst. Danach kommen die Truhen aus dem Weg (Fund auf Schritt 2).

### 3.4 Freischalt-Pfad und sanfte Hinweise
- **Neue Karte „Was als Nächstes kommt“** (Fortschritt-Tab und „Mehr“). Sie zeigt eine Leiter mit Schloss-Chips:
  - Freunde: offen
  - Gilde beitreten: offen
  - 3 Wappen: Glücksrad und Chat schreiben, ca. 1¼ h [Sim]
  - 5 Wappen und 6 Arten: Arena, ca. 3 h [Sim]
  - 8 Wappen: Gilde gründen, ca. 7½ h [Sim]
  - 8 Wappen, Konto 7 Tage, E-Mail: Tausch
- Im **„Mehr“-Blatt** bekommen gesperrte Einträge einen kleinen Schloss-Chip mit der Bedingung („ab 5 Wappen“) statt des leeren Bildschirms. Sie bleiben antippbar und zeigen dann eine Zeile Erklärung.
- Wird etwas frei, erscheint ein **„Neu“-Punkt** auf „Mehr“ und am Eintrag, bis man ihn einmal geöffnet hat. Dazu kommt eine Zeile im Log („Die Arena ist offen.“). Es gibt kein Pop-up.
- Spätere Hinweise einmalig: bei Wappen 3 (Glücksrad), Wappen 5 (Arena), Wappen 8 (Gilde gründen, Tausch). Sie erscheinen nur, wenn „Hinweise aus“ nicht gesetzt ist.

### 3.5 Bestandsspieler
- Wer schon spielt, sieht **keinen** Einstieg. Beim Laden wird `onboarding.done = true` gesetzt, wenn `started` gilt und mindestens 1 Wappen oder mindestens 3 Arten im Kodex sind.
- Den Freischalt-Pfad und die Schloss-Chips sehen alle, denn sie helfen auch Bestandsspielern.
- **Entschieden (20.11. 19:44):** Bestandsspieler sehen **kurze Hinweise zu neuen Systemen**, auch mit `done = true`.
  - höchstens **1 Hinweis pro neuem System**, gleiche Regeln wie 3.1 (1 Satz, 90 s Abstand, nie im Fokuskampf, „Hinweise aus“ gilt)
  - Kennung in `onboarding.seen` als `sys:<id>`, z. B. `sys:season`, `sys:pass`, `sys:beastWeekend`, `sys:region6`
  - Der Baustein entsteht in F2. E8 und R9 tragen ihre Hinweise nur noch als Daten ein.

## 4. Balancing und Wirtschaft

- **Keine neuen Belohnungen und keine neuen Währungen.** Gold, EP und Marken bleiben unverändert.
- Es gibt zwei Änderungen:
  1. die Neu-Garantie der ersten Truhe
  2. **2 statt 5 Starttruhen** (Abschnitt 4.1)

### 4.1 Zahl der Starttruhen: 2 (Balancing)

**Messung:**
- eigener Sim-Lauf vom 20.11. auf `origin/main` 104bb96 mit `beginAdventure` → `resolveEncounter` → `takeChests` und dem echten Spielcode
- 12 Seeds × 3 Starter = 36 Läufe pro Variante, alle Truhen sofort geöffnet, neue Arten gehen wie im Spiel automatisch ins Team
- gerechnet pro Wegknoten, ohne Wegtakt-Ausgleich W

**30 Minuten ≈ 643 Knoten-Äquivalente**, in beiden Fällen:
- alter Takt (2800 ms, A3 aus): 643 Knoten
- Zug-für-Zug (A3–A5): 383 Knoten bei 4,7 s (R1-Mittel aus dem Autokampf-Konzept), aber W ≈ 1,68 hebt Truhen und EP auf das gleiche Stundenniveau

| Starttruhen | neue Arten nach 77 Knoten (≈ 6 min) | neue Arten nach 383 Knoten | Team voll (6) ab Knoten | Wappen 1: Median der Knoten (p25–p75) |
|---:|---:|---:|---:|---|
| 5 (heute) | 8,9 | 19,1 | 6 | 874 (655–1206) |
| 2 | 6,8 | 18,6 | 34 | 829 (594–1118) |
| 1 | 5,8 | 17,8 | 48 | 720 (408–1153) |
| 0 | 5,8 | – | 54 | 805 (549–1211) |

**Begründung für 2:**
- **Für den Fortschritt in Minute 0–30 ist die Zahl der Starttruhen fast egal.** Schon der Fund auf Schritt 2 bringt eine Kieseltruhe (Knoten 2.0, in allen Läufen), und danach gibt es etwa **1 Kieseltruhe pro 20 Knoten**. Nach 383 Knoten liegt der Unterschied zwischen 5 und 2 Truhen bei 0,5 Arten, und das ist Rauschen.
- 5 Starttruhen füllen das Team **in der ersten Minute mit 5 Monstern auf Lv 1** (`makeMon(…, 1)` in `chests.ts`). Wappen 1 wird dadurch nicht schneller (Median 874 gegenüber 829 Knoten), und der Einstieg wirkt voller.
- **2 Truhen** reichen genau für den Lernbogen: die erste geführt und sicher neu, die zweite allein. Danach lernt der Spieler, dass **Truhen vom Weg kommen**. 1 Truhe würde diesen Wiederholungsschritt verlieren.
- **Pity spielt hier keine Rolle:** Kieseltruhen haben in `lootbox.json` `pity: null`, und `takeChests` führt den Zähler nur für Silber, Gold und Sterne (`chests.ts`: `if (tier !== 'kiesel')`). Starttruhen füllen also keinen Pity-Zähler. Weniger Starttruhen kosten keinen Pity-Fortschritt.
- Silber-Pity (Seltenheit ≥ 4, hart bei 10) kommt erst mit etwa 10 Silbertruhen, also nach rund 2½ h [Sim: etwa 1,9 Silber pro 643 Knoten].

**Reichen die Truhen-Quellen danach?** Ja. Pro 30 min (≈ 643 Knoten-Äquivalente) [Sim und Code]:
- **Fund-Knoten:** etwa 31–32 Kieseltruhen (0,048–0,050 pro Knoten). Ein Fund steht in jedem Kapitel (`routeOf`). Nach einem Team-K.o. führt der Rücksprung zur Heilquelle oft erneut darüber.
- **Trainer:** 10 % Silber pro Trainerkampf (`trainerSilver`), etwa 2 Silbertruhen
- **Kodex:** 1 Goldtruhe je 10 Arten (`codexEvery`), bei etwa 18 Arten also 1 Goldtruhe in den ersten 30 min
- **Mira:** 1 Goldtruhe (`grantWardenChest`), beim Sieg
- **Wegtruhe:** 1 Kiesel je 2 h Spielzeit (`roadMs = 7 200 000`, bis 4 gestapelt). Sie greift erst nach den ersten 30 min.
- **Laden:** Kiesel 2000 G × Region, 5 pro Tag (`shopGold`). Mit 3000 Startgold ist 1 sofort kaufbar.
- Die Tagesaufgabe „Truhen öffnen“ (Ziel 3) ist damit nach wenigen Minuten erfüllbar.
- **Kein Spieler steht ohne Truhe da.** Die Lücke zwischen der zweiten Starttruhe und der ersten Fund-Truhe ist höchstens 1 Knoten.

**Bestand:** Bestehende Spielstände behalten ihre Truhen. `startChests()` gilt nur für neue Spiele und für den Reparaturfall „`chests` fehlt“ (`save.ts:361–363`).

**Abnahme der Zahl:**
- Magnetilo spielt 3 neue Spiele (je Starter) 30 min und notiert Truhen, Arten und Wappen-Zeit.
- Weicht der Wappen-Median um mehr als ±25 % von der Sim ab, meldet Kokowei das mit dem Trichter (T3→T9).

**Nebenbefund für später (keine F-Änderung):** Wappen 1 kommt im Median nach 34–41 min statt nach den 18 min aus `balance-report.md`. Liegt der echte Median nach F über 40 min, wäre Miras Faktor (1,4, `regions.json`) der Hebel. Das wäre eine eigene Entscheidung von Fabian-Noel.
- Hinweise ändern kein Tempo. Der Wegtakt-Ausgleich W aus A4 bleibt unberührt.

## 5. Spielstand, Server und Analytics

### 5.1 Spielstand
- Neues optionales Feld `onboarding?: { v: 1, done: boolean, seen: string[], sent: number[], hintsOff: boolean, lastHintAt: number }`.
- Ein fehlendes Feld lädt mit Standardwert (Regel aus 3.5). `saveVersion` steigt um 1, auf **13** [Stand heute 12 in `const.ts`].
- Alte Spielstände laden unverändert. `seen` und `sent` sind auf je 64 Einträge begrenzt.

### 5.2 Server
- **Keine Migration, kein Edge-Deploy.** Alles läuft im Client.

### 5.3 Analytics-Trichter: nur vorhandene Events
- Für neue Trichter-Stufen werden **weitere `tutorial_step`-Nummern** genutzt (4–16). Der Eventname steht schon auf der Allowlist, und `props` sind frei (nur `sanitizeProps`). **Es gibt also keine Allowlist-Änderung.**
- **Code-Fix in F1:** `noteTutorial` merkt sich heute nur das Maximum im laufenden Tab. Künftig gilt eine Menge pro Spielstand (`onboarding.sent`). Damit werden Schritte, die außer der Reihe kommen (Freunde vor Truhe), nicht verschluckt, und nach einem Neuladen wird nichts doppelt gesendet.

| Stufe | Bedeutung | Event und Bedingung |
|---|---|---|
| T0 | neues Konto mit Einwilligung | erstes `session_start` je `player_id` |
| T1 | Namensschritt | `tutorial_step step=1` (gibt es) |
| T2 | Starterschritt | `tutorial_step step=2` (gibt es) |
| T3 | Spiel gestartet | `tutorial_step step=3` (gibt es) |
| T4 | erster Sieg | erstes `stage_clear region=1 chapter=1` |
| T5 | Truhen-Erklärung gesehen | `tutorial_step step=4` (neu als Nummer) |
| T6 | erste Truhe geöffnet | erstes `lootbox_open` |
| T7 | Team geändert | `tutorial_step step=5` |
| T8 | Heilquelle 7 erreicht | erstes `stage_clear region=1 chapter=1 node>=8` |
| T9 | erstes Wappen | `guardian_win region=1 chapter=1` |
| T10 | Freischalt-Pfad geöffnet | `tutorial_step step=6` |
| T11 | Tagesaufgabe erledigt | `tutorial_step step=7` |
| T12 | Freunde geöffnet | erstes `tab_open tab=social` |
| T13 | Gilde geöffnet | erstes `tab_open tab=guild` |
| T14 | Rückkehr am Folgetag (D1) | `session_start` am nächsten Kalendertag Europe/Berlin |
| (Neben) | Hinweis weggetippt / „Hinweise aus“ | `tutorial_step step=15 { hint: "<id>" }` / `step=16` |

- Hinweis-IDs sind kurze Codes (`speed`, `chest`, `team` …) und keine Texte.
- **Keine personenbezogenen Daten:** Es gibt nur die pseudonyme `player_id`, die schon heute gesendet wird. Kein Name, keine Mail, keine Geräte-ID. Ohne Einwilligung wird nichts gesendet (`acceptEvent`).
- Hinweis für die Auswertung: Der Trichter zählt nur Spieler mit Einwilligung „yes“. Das verzerrt die Stichprobe, und Kokowei weist das im Bericht aus.

### 5.4 Auswertungsvorlage für Kokowei
Die Vorlage liegt in F5 als `docs/analytics/trichter-erste-30.md`, mit SQL zum Lesen. **Die Zeitstempel-Spalte der Tabelle `events` steht nicht im Repo** (Tabelle aus Schritt 4). Porygon nennt den Namen, bevor Kokowei die SQL nutzt.

| Kennzahl | Definition | Zielwert [ANNAHME] |
|---|---|---:|
| Start-Quote | T3 / T1 | ≥ 90 % |
| Erster Sieg | T4 / T3 | ≥ 95 % |
| Truhe verstanden | T6 / T4 | ≥ 85 % |
| Erstes Wappen | T9 / T3 | ≥ 70 % |
| Sozial entdeckt | (T12 oder T13) / T9 | ≥ 40 % |
| D1-Rückkehr | T14 / T3 | ≥ 35 % |
| Zeit bis erstes Wappen (Median) | Zeit T3 → T9 | 30–40 min (Sim 34–41) |
| Hinweis-Abbruch | Anteil Spieler mit `step=16` (alle Hinweise aus) | ≤ 10 % |
| Größter Abfall | Stufe mit dem höchsten relativen Verlust | wird jede Woche benannt |

**Wöchentlicher Bericht (Kokowei):**
- Tabelle T0–T14 mit absoluten Zahlen und Quote zur Vorstufe
- Median-Zeiten T3→T6 und T3→T9
- Hinweis-IDs mit den meisten Wegtipp-Ereignissen
- 1–3 Empfehlungen
- Die Kohorte ist jeweils die Kalenderwoche des ersten `session_start` (Mo 04:00 Europe/Berlin wie `board_week`)

## 6. Schritte als kleine PRs (Reihenfolge F1 → F5)

| PR | Inhalt | Abnahmekriterium für Magnetilo (Handy 390×844 Hochformat) |
|---|---|---|
| **F1** | `onboarding` im Spielstand mit Standardwert, saveVersion 13. Regel für Bestandsspieler. `noteTutorial` mit Menge statt Maximum. Neue Schrittnummern 4–16 als Konstanten. **Starttruhen 5 → 2** (Schlüssel `debugStartChests` wird zu `startChests`) | Ein alter Spielstand (v12) lädt ohne Einstieg und mit unveränderten Truhen. Ein neues Spiel hat `done=false` und 2 Kieseltruhen. Schritt 12 vor Schritt 4 wird beides gesendet. Nach dem Neuladen wird nichts doppelt gesendet. Test grün |
| **F2** | Ziel-Chip oben im Abenteuer. Hinweis-Baustein (ein Hinweis zur Zeit, 90 s Abstand, nie im Fokuskampf, Tippen schließt) mit System-Hinweisen `sys:<id>` auch für Bestandsspieler. „Hinweise aus“ in den Optionen. Hinweise Tempo, Begleiter, Heilquelle | Der Chip zeigt immer genau ein Ziel. Ein Hinweis verdeckt nie die Tempo-Knöpfe oder das Kampflog. Während Mira erscheint kein Hinweis. „Hinweise aus“ wirkt sofort und bleibt nach dem Neuladen |
| **F3** | Erklärte erste Truhe (3 Karten, Überspringen). Pfeil-Hinweis auf „Aktivitäten“. **Neu-Garantie der ersten Truhe.** Zweite Truhe mit „Jetzt du“ | Die Karten haben je höchstens 2 Zeilen bei 390 px. „Raten“ zeigt dieselben Werte wie `lootbox.json`. Die erste Truhe bringt in 100 von 100 Testläufen eine neue Art in der gezogenen Seltenheit. Die zweite und alle späteren verhalten sich wie heute |
| **F4** | Karte „Was als Nächstes kommt“ (Auslöser 15 min oder Wappen 1). Schloss-Chips im „Mehr“-Blatt. „Neu“-Punkt beim Freischalten. Hinweise Freunde, Gilde, Wappen 3/5/8 | Jede Bedingung im Chip stimmt mit dem Code überein (3/5/8 Wappen, Register 6, Konto 7 Tage). Der „Neu“-Punkt verschwindet nach dem Öffnen. Kein Pop-up beim Freischalten |
| **F5** | Doku und SQL-Vorlage für den Trichter (nur lesen) | Kokowei kann T0–T14 für eine Testkohorte ausgeben. Die Zahlen stimmen mit einem Testkonto überein, das Magnetilo durchspielt |

Alle F-Schritte hängen am Schalter `onboardingV1` und dürfen einzeln live gehen.

## 7. Migrationen, Edge-Deploys, Allowlist

| Art | Bedarf |
|---|---|
| Supabase-Migration | **keine** |
| Edge-Function-Deploy | **keiner**. Die Bundles von guild, arena-fight, arena-desk und coop-boss enthalten `lootbox.json`, rufen `startChests()` aber nicht auf (geprüft per Suche in `index.bundle.ts`). Die Umbenennung in F1 wird beim nächsten Re-Bundle mit E einfach mitgenommen |
| Allowlist-Änderung | **keine** (nur neue `tutorial_step`-Nummern) |

Wenn Fabian-Noel später doch eigene Eventnamen möchte, z. B. `hint_dismiss`, wäre das eine Allowlist-Migration mit Freigabe bei Porygon. Dafür würde ich sie mit E bündeln (Termin 1, siehe `naechste-schritte-reihenfolge.md`).

## 8. Grafikbedarf für Smettbo (weich und rund, UI-Kit P9)

| # | Teil | Größe (UI-px) | Formate |
|---|---|---|---|
| 1 | Hinweis-Blase, 9-Slice mit runder Spitze (4 Richtungen) | 320×96, Ränder 24 | png + webp, @2x |
| 2 | Zeige-Pfeil, weich und pulsierend (2 Frames) | 64×64 | png, @2x |
| 3 | Ziel-Chip-Hintergrund (9-Slice) | 360×56, Ränder 20 | png + webp, @2x |
| 4 | Schloss-Chip für das Mehr-Blatt | 48×48 | png, @2x |
| 5 | „Neu“-Punkt (nicht nur über die Farbe erkennbar, mit Stern) | 24×24 | png, @2x |
| 6 | Illustrationen für die 3 Truhen-Karten | 3 × 280×160 | webp, @2x |
| 7 | Icons für den Freischalt-Pfad: Freunde, Gilde, Rad, Arena, Tausch, Gilde gründen | 6 × 96×96 | png, @2x |

Insgesamt sind das etwa 14 Teile plus @2x. Platzhalter aus dem UI-Kit reichen für F1–F2. Die Grafik wird bei F3/F4 gebraucht.

## 9. Entscheidungen von Fabian-Noel (20.11., 19:44, laut Evoli)

1. ~~Erste Truhe mit sicher neuer Art?~~ **Entschieden: ja**, garantiert neu (3.3, F3).
2. ~~5 Starttruhen behalten?~~ **Entschieden: weniger als 5.** Per Balancing festgelegt: **2** (4.1, F1).
3. ~~Hinweise für Bestandsspieler?~~ **Entschieden: ja**, kurze Hinweise zu neuen Systemen, 1 pro System (3.5, F2).

Damit sind keine Fragen mehr offen.
