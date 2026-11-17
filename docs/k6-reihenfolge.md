# K6 Reihenfolge

Werte aus `docs/kampf-upgrade-konzept.md`, Abschnitt B3. Der Kampf bleibt 1v1. Die Reihenfolge im Team-Tab ist die Taktik. Es gibt kein automatisches Umsortieren. Ziehen im Team-Tab bleibt der Weg, die Plätze zu tauschen.

## Auslegung

- **Vorhut** ist Platz 1 (`team[0]`). Solange dieses Monster selbst kämpft, hat es +10 % DEF.
- **Konter-Einlauf** gilt nur, wenn im selben Wächter- oder Ratskampf ein eigenes Monster k. o. geht und das nächste gegen denselben, noch stehenden Gegner einwechselt. Der Typ muss stark sein (`typeMult` > 1). Der erste treffende Angriff dieses Einwechsels macht +20 % Schaden. Ein Schild oder ein ausgesetzter Zug verbraucht den Bonus nicht. +2 Ult-Segmente gibt es nur, wenn die Ult freigeschaltet ist, also ab Stufe 25. Darunter bleibt die Leiste leer. Ein kurzes Label „Konter!“ zeigt den Einlauf. Der erste Kämpfer eines Kampfes ist kein Konter, auch wenn sein Typ stark ist. Wilde Kämpfe und Trainer enden beim eigenen K. o., dort gibt es keinen Einlauf.
- **Schlussmann** ist bei einem vollen 6er-Team Platz 6 (`team[5]`). Bei einem kürzeren Team ist es der letzte belegte Platz. Der Bonus gilt, wenn dieses Monster als einziges noch steht: +15 % ATK und +1 Ult-Segment je eigenem Angriff, zusätzlich zum normalen Segment. Unter Stufe 25 bringt das Extra-Segment nichts, weil die Leiste gesperrt bleibt. Ein Team mit einem Monster ist zugleich Vorhut und Schlussmann.
- Die Einwechslung folgt der Team-Reihenfolge. Die alte Typ-Suche beim Wechsel ist abgeschaltet. Steht das aktuelle Monster noch, bleibt es im Kampf.

Neue Speicherfelder gibt es nicht. `SAVE_VERSION` bleibt 4. Die Weg-Uhr bleibt 2 800 ms je Begegnung. Die Boni ändern Werte, nicht die Uhr.

## Messung

Gleicher Schlag, Würfel 0,99, ohne Krit, Fertigkeit auf Abklingzeit. Schaden ist `floor(ATK² / (ATK + DEF))` mit den übrigen Faktoren bei 1.

| Vergleich | Treffer | Verhältnis |
|---|---|---|
| DEF 100 gegen ATK 80 | 58 | |
| DEF 110 (+10 %) gegen denselben Schlag | 55 | 55 / 58 = 94,8 % Schaden kassiert |
| ATK 80 gegen DEF 40 | 87 | |
| ATK 92 (+15 %, gerundet) gegen DEF 40 | 105 | 105 / 87 = 120,7 % Schaden |
| erster Konter-Schlag gegen denselben Gegner | 105 gegen 87 | 120,7 %, der zweite Schlag ist wieder gleich |

Der ATK-Bonus liegt über +15 % Schaden, weil der Schlag mit `ATK² / (ATK + DEF)` rechnet. Der DEF-Bonus liegt unter −10 % kassiertem Schaden, weil DEF nur im Nenner steht.
