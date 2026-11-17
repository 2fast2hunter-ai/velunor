# Velunor: Kampf-Upgrade (Konzept, Lucario, 17.11.2026)

Auftrag von Fabian-Noel (17.11., über Evoli): Der weiche Look bleibt, die Kämpfe sollen besser und cooler werden.
**Status: FREIGEGEBEN von Fabian-Noel am 17.11., 16:02 (über Evoli).** K1–K8 werden gebaut, mit drei Änderungen:
1. **Immer 1v1, keine Formation 2v2.** K6 ist ersetzt durch die Reihenfolge-Taktik.
2. **Ult ab Level 25.**
3. **Wetter wirkt auf den Schaden** (A5).

**Rahmen:** weicher Look bleibt · Idle und Auto-Kampf bleiben · kein Input mitten im Kampf · nichts aus Pokémon/PokeCatch · kein Echtgeld · kein Pay-to-win · Spielstände kompatibel · Zahlen **[ANNAHME]** · baut auf `kampf-effekte-typen.md` und Phase-2-Schritt 15 auf.

**Leitlinie Idle:** Man schaut zu und entscheidet **vor** dem Kampf (Team und Reihenfolge). Währenddessen gibt es nur Speed ×1/×2/×3 und „Effekte reduzieren“.

---

## A. Optik und Feedback

### A1 Was heute fehlt
- Trefferzahlen sind flach, Krit und Effektivität unterscheiden sich kaum.
- Typ-Effekte laufen schon (Feuer-Demo), aber ungleichmäßig und ohne Kamera-Reaktion.
- Wetter steht oben, ist im Kampf aber unsichtbar.
- KO und Sieg sind leise. Team-Wechsel und Boss-Einführung fehlen als Moment.

### A2 Was dazu kommt
| Thema | Regel | Was Smettbo zeichnet |
|---|---|---|
| **Trefferzahlen** | Normal weiß, schwach grau klein, stark orange größer, Krit gold + „KRIT!“ + leichter Bounce. Zahlen schweben 600 ms (×1) nach oben und werden bei Speed gekürzt. | 1 Sprite-Atlas für Ziffern 0–9 in 3 Stilen (normal / stark / krit), plus die Worte KRIT / STARK / SCHWACH. |
| **Typ-Effekte** | Alle 20 Typen nach `kampf-effekte-typen.md`. Dauer ≤ 700 ms bei ×1, Floor 150 ms. Höchstens 40 Partikel. „Effekte reduzieren“ schaltet Partikel aus, lässt Trefferflash und Zahlen. | Pro Typ 1 Projectile-Sheet (4–6 Frames) und 1 Hit-Burst (4 Frames), 128 px. Bestehende Feuer-Assets bleiben. |
| **Kamera** | Treffer: Shake 80 ms / 4 px. Krit oder Stark: 120 ms / 8 px. Boss-Ult: 200 ms / 12 px. Bei „Effekte reduzieren“ und ×3: Shake −50 %. | nichts |
| **Hitstop** | Krit und Stark: 40 ms Pause. Boss-Ult: 80 ms. Bei ×3 aus. | nichts |
| **Wetter im Kampf** | Leichte Overlay-Partikel (Regen-Linien, Schneeflocken, Nebel-Weichzeichner, Wind-Blätter, Gewitter-Blitze alle 4–6 s). Die Schadenswirkung steht in A5. | 5 kleine Particle-Sheets (32–64 px), wiederverwendbar. |
| **KO** | Sprite wird weiß, kippt 200 ms, verschwindet in Partikeln der Typfarbe. Nächstes Team-Monster läuft von links in 300 ms ein, Namensbanner 800 ms. | 1 generisches „Dissolve“-Sheet, getönt nach Typfarbe. |
| **Sieg** | Kurzer Zoom 1,05×, Konfetti in Regionsfarbe, Banner „Sieg · +G · +EP“, 1,2 s, tippbar zum Überspringen. Wächter-Sieg: längerer Banner + Wappen-Flug zur Kopfzeile. | Konfetti-Sheet, Wappen-Flug nutzt vorhandenes Wappen. |
| **Boss-Intro** | Vor Wächter/Rat/Weltenbiest: Name, Titel, Silhouette 1,0 s, dann Kampf. Einmal pro Kampf, überspringbar. | Silhouette aus dem vorhandenen Monster-Asset (invertieren), kein neues Zeichnen. |

### A5 Wetter-Schaden (freigegeben)
Das Wetter ist das bestehende aus Schritt 3: stündlich, deterministisch und für alle gleich.

**Wirkung:**
- Der Bonus hängt am **Typ des angreifenden Monsters** (dem Angriffstyp).
- Er wird **nach** dem Typ-Multiplikator multipliziert: Schaden × Typ (1,5/1/0,75) × Wetter.
- Pro Wetter werden 1–2 Typen gestärkt und 1–2 geschwächt. Mehr als ±15 % gibt es nicht [ANNAHME].

| Wetter | Stärker | Schwächer |
|---|---|---|
| Klar | Feuer +10 %, Licht +10 % | Eis −10 % |
| Regen | Wasser +15 % | Feuer −15 % |
| Gewitter | Blitz +15 % | Metall −10 % |
| Schnee | Eis +15 % | Pflanze −10 %, Drache −10 % |
| Nebel | Geist +10 %, Schatten +10 % | Licht −10 % |
| Wind | Wind +15 %, Klang +5 % | Insekt −10 % |

**Regeln:**
- Auch **Ult und Brand/Gift** bekommen den Wetter-Bonus, Heilung und Schilde nicht.
- Bosse sind nicht ausgenommen. So kann das Warten auf passendes Wetter (24-h-Vorschau) bei einem harten Wächter helfen. Das ist bewusst ein Taktik-Hebel.
- **Offline-Fortschritt** rechnet ohne Wetter (Faktor 1), weil er schnell und berechenbar bleiben soll.
- **PvP-Arena:** **Kein Wetter (neutral)**, weil Angreifer und Verteidiger nicht zur selben Zeit spielen.
- Koop-Weltenbiest: das Wetter zum Zeitpunkt des Angriffs.

**UI:**
- Oben im Kampf zeigt ein Wetter-Chip das Symbol mit der Wirkung, z. B. „🌧 Wasser +15 % · Feuer −15 %“ (eigene Symbole).
- Ein **kleiner Pfeil ▲ grün / ▼ rot** steht am Namensschild jedes Monsters, das betroffen ist.
- Die Trefferzahl bekommt einen dezenten Wetter-Tropfen-Rand, wenn der Bonus gegriffen hat.
- Auf der Wächter-Herausforderungskarte steht: „Jetzt: Regen. Dein Team: 2 ▲, 1 ▼“.

**Balance-Check (K3-Abnahme):**
- Über alle 6 Wetter gemittelt ist kein Typ um mehr als ±3 % stärker als ohne Wetter.
- Die Spielzeit pro Region verändert sich um weniger als ±2 %. Grund: Offline läuft ohne Wetter, online gleicht es sich über den Tag aus.

**Smettbo:** 6 Wetter-Symbole (64 px) und die Pfeile ▲/▼.

### A3 Performance Handy
- Ein gemeinsamer Particle-Pool, höchstens 40 aktiv.
- Atlas statt Einzelbilder. Effekte werden bei Kampfstart vorgeladen, nicht erst beim Treffer.
- Bei ×3 oder „Effekte reduzieren“: keine Partikel, kein Hitstop, Shake halbiert. Ziel: stabile 30 fps auf Mittelklasse-Android.

### A4 Aufwand Optik
| Schritt | Inhalt | Aufwand |
|---|---|---|
| **K1** | Trefferzahlen (3 Stile) + Krit-/Stark-/Schwach-Labels + Hitstop + Shake | 1 Tag Porygon, 0,5 Tag Smettbo (Ziffern-Atlas) |
| **K2** | Fehlende Typ-Effekte (die noch nicht dem Spec entsprechen), Particle-Pool, Speed-Skalierung | 1–2 Tage Porygon, 2–3 Tage Smettbo (Sheets parallel) |
| **K3** | Wetter-Overlay **und Wetter-Schaden (A5) mit Chip, Pfeilen und Vorschau**, KO-Dissolve, Team-Einlauf, Sieg-Banner, Boss-Intro | 1,5 Tage Porygon, 1 Tag Smettbo |

---

## B. Spieltiefe im Auto-Kampf

Alles lädt sich von allein auf. Der Spieler stellt **vor** dem Kampf ein: die Reihenfolge der 6 und welche Synergie aktiv ist. Währenddessen gibt es keinen Extra-Tipp.

### B1 Ultimate (Aufladung)
- Jede Art hat **1 Ultimate**, freigeschaltet ab **Level 25** (passt zum ersten Erwachen). Darunter gibt es nur den normalen Angriff.
- **Aufladung:** +1 Segment je eigenem Angriff, +1 bei erlittenem Krit, +2 bei eigenem KO-Schlag. Ult kostet 5 Segmente [ANNAHME].
- Die Leiste liegt unter der HP-Leiste. Bei 5/5 pulsiert sie. Die Ult ersetzt den nächsten Angriff automatisch.
- **Ult-Typen** (Velunor-eigene Namen, 5 Muster, über die 100 Arten verteilt):
  - **Durchschlag:** 1 Ziel, Schaden ×1,6, ignoriert 30 % DEF.
  - **Schildwall:** 3 s Schaden −40 % auf das aktive eigene Monster.
  - **Impuls:** ATK +25 % für 4 eigene Angriffe.
  - **Fessel:** Ziel greift 1 Runde nicht an (Boss: Dauer −50 %).
  - **Heilleucht:** Heilt das aktive eigene Monster um 25 % Max-HP.
- Schaden und Dauer skalieren **nicht** mit Shop-Käufen. Sternstufen wirken nur über die allgemeinen Werteboni (+4 % je Stufe, wie im Lootbox-Konzept).

### B2 Status-Effekte
| Status | Wirkung | Dauer | Wer verteilt ihn |
|---|---|---|---|
| Brand | 3 % Max-HP je Angriff des Trägers | 3 Angriffe | Feuer-Ult / manche Feuer-Angriffe |
| Nässe | DEF −15 % | 3 | Wasser |
| Frost | SPD −30 % (greift seltener) | 2 | Eis |
| Giftnebel | 2 % Max-HP je Angriff, stapelt bis 3 | 4 | Gift |
| Schock | nächster Angriff −50 % Schaden | 1 | Blitz |
| Spreu | Genauigkeit −20 % (mehr Fehlschläge) | 3 | Wind / Insekt |

- Höchstens **1 Status pro Monster**. Neu überschreibt Alt.
- Icons über dem Sprite, Tooltip bei Tippen auf die Pause (Speed ×1).
- Bosse: Status-Dauer −50 %, Immunität gegen den eigenen Typ-Status.

### B3 Reihenfolge-Taktik (ersetzt Formation, immer 1v1)
Die Reihenfolge der 6 im Team-Tab (Ziehen zum Umsortieren, gibt es schon) wird zur Taktik:

- **Vorhut (Platz 1):** +10 % DEF, solange sie das erste Monster ist.
- **Konter-Einlauf:** Kommt nach einem KO das nächste Monster herein und ist sein Typ **stark** gegen den aktuellen Gegner, bekommt es +2 Ult-Segmente und der erste Angriff macht +20 % Schaden. Das zeigt ein kurzes „Konter!“-Label.
- **Schlussmann (Platz 6):** Ist er als Letzter übrig, bekommt er +15 % ATK und +1 Ult-Segment je Angriff.
- **Reihenfolge-Tipp:** Auf der Wächter-Karte steht ein Hinweis, welche Teammitglieder gegen den Boss-Typ stark oder schwach sind. Die Reihenfolge stellt der Spieler selbst ein, es gibt kein Auto-Sortieren [ANNAHME].

Gegner kommen immer 1v1, auch Wächter, Rat und Weltenbiest.

### B4 Typ-Synergien
- Übernahme von Phase-2-Schritt 15 (12 Kombis, höchstens 2 aktiv).
- Neu: Eine aktive Synergie zeigt im Kampf ein kleines Kombi-Icon neben der Teamleiste und einen einmaligen Aura-Blitz beim Kampfstart.
- Keine neuen Werte hier. Die Tabelle aus der Phase-2-Spec gilt.

### B5 Boss-Mechaniken (Wächter, Rat, Weltenbiest)
Jeder Wächter bekommt **1 Mechanik** aus dieser Liste, sichtbar als Icon unter dem Namen:
1. **Panzerung:** Schaden −30 %, bis 3 Krit gelandet wurden.
2. **Wut:** Unter 40 % HP Angriffe ×1,5.
3. **Beistand:** Ab 60 % HP greift ein Helfer aus dem Hintergrund alle 4 Boss-Angriffe zusätzlich an, mit 40 % Boss-ATK. Er ist nicht angreifbar und verschwindet beim Boss-KO.
4. **Puls:** Alle 5 eigenen Angriffe ein Zusatztreffer mit 60 % Schaden auf das aktive Monster, der nicht ausweichbar ist.
5. **Spiegel:** 20 % des erlittenen Schadens kehren zum Angreifer zurück (nicht bei Ult).

- Rat und Weltenbiest kombinieren 2 Mechaniken.
- Mechanik und Ult-Leiste des Bosses sind **vor** dem Kampf in der Herausforderungs-Karte lesbar (kein Hidden-Spike).

### B6 Was unangetastet bleibt
- Auto-Kampf, Tick-Tempo, Speed ×1/×2/×3.
- EP-, Gold- und Cap-Formel aus Balance-Schritt 10.
- Weg mit 20 Knoten, Tag/Nacht, Pool-Logik.
- Save-Felder werden nicht ergänzt, außer der vorhandenen Teamreihenfolge. Ult-Ladung und Status gelten nur während eines Kampfs. Alte Stände bleiben voll kompatibel.

### B7 Aufwand Tiefe
| Schritt | Inhalt | Aufwand | Abhängigkeit |
|---|---|---|---|
| **K4** | Ult-Leiste + 5 Ult-Muster (Durchschlag statt Welle) + Freischaltung ab Level 25 | 1,5 Tage | K1 |
| **K5** | 6 Status-Effekte + Icons + Boss-Immunitäten | 1 Tag | K4 |
| **K6** | Reihenfolge-Taktik: Vorhut, Konter-Einlauf, Schlussmann, Hinweis auf der Wächter-Karte | 0,5–1 Tag | K4 |
| **K7** | Boss-Mechaniken 1–5 (Beistand, Puls auf 1 Ziel) + Vorschau-Karte | 1 Tag | K5 |
| **K8** | Synergie-Aura (Optik) + Feinschliff, Messung 30 fps | 0,5 Tag | Phase-2-Schritt 15 oder lokaler Stub |

---

## Reihenfolge (nach Freigabe)

```
K1 Zahlen/Shake/Hitstop
 → K2 Typ-Effekte komplett
 → K3 Wetter/KO/Sieg/Intro
 → K4 Ultimates
 → K5 Status
 → K6 Reihenfolge-Taktik
 → K7 Boss-Mechaniken
 → K8 Synergie-Aura + Performance-Pass
```

- **K1–K3** können parallel zu L2–L5 (Lootbox) laufen und brauchen keine Server-Änderung.
- **K4** ist unabhängig von der Lootbox (Ult ab Level 25).
- Einordnung gegen Phase 2: K1–K3 vor oder parallel zu Schritt 4; K4–K8 vor Schritt 9 (Arena), damit die Arena dieselben Systeme nutzt.

## Entscheidungen (Fabian-Noel, 17.11. 16:02)
1. **Keine Formation 2v2, immer 1v1.** K6 ist jetzt die Reihenfolge-Taktik. Die Welle-Ult wird zu Durchschlag (1 Ziel), Puls und Beistand treffen nur 1 Ziel.
2. **Ult ab Level 25**, nicht an Sternstufen gekoppelt.
3. **Wetter wirkt auf den Schaden**, Werte in A5, sichtbar per Chip, Pfeilen und Wächter-Vorschau. Gebaut in K3.
