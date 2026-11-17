# K7 Boss-Mechaniken

Werte aus `docs/kampf-upgrade-konzept.md`, Abschnitt B5. Der Kampf bleibt 1v1. Der Helfer hat keine eigenen Lebenspunkte und kann nicht getroffen werden. Neue Speicherfelder gibt es nicht. `SAVE_VERSION` bleibt 4. Die Weg-Uhr bleibt 2 800 ms.

## Auslegung

Die Mechanik hängt am Wächter, nicht am einzelnen Zug. Derselbe Wächter hat immer dieselbe Mechanik. Der Schlüssel ist das Wappen, sonst der Name. Ein Ratsherr und das Weltenbiest im Urgrund (Kapitel `special`) bekommen zwei verschiedene Mechaniken. Die Wahl ist ein fester Hash, kein Würfel im Kampf.

Ein Angriff für Puls und Beistand ist ein Schlag, eine schadensbringende Fertigkeit oder die Ult Durchschlag. Ein Mehrfachtreffer zählt als ein Angriff. Ein Schild, eine Heilung oder ein Fehlschlag der Ult zählt nicht. Ein daneben gegangener Schlag zählt mit.

- **Panzerung:** erlittener Schaden ×0,7, solange noch keine 3 Krits gelandet sind. Der dritte Krit ist noch gemindert, danach ist die Panzerung weg. Ein Fehlschlag zählt nicht als gelandeter Krit.
- **Wut:** solange die HP unter 40 % liegen, ist der Schaden der eigenen Angriffe ×1,5. Genau 40 % lösen sie nicht aus. Der Helfer bekommt die Wut nicht.
- **Beistand:** solange die HP bei mindestens 60 % liegen, schlägt zum 4., 8., 12. Angriff ein Helfer zusätzlich zu. Seine ATK ist 40 % der Boss-ATK und geht in dieselbe Schadensformel. Er verschwindet, wenn der Boss k.o. geht. „Ab 60 %“ ist hier wie „ab Lv 25“ gelesen: die Schwelle gilt nach oben.
- **Puls:** zum 5., 10., 15. Angriff ein Zusatztreffer mit 60 % des normalen Schlagfaktors. Spreu und andere Fehlschläge lassen ihn nicht aus. Schock mindert ihn noch.
- **Spiegel:** 20 % der wirklich verlorenen HP gehen an den Angreifer zurück. Ult-Treffer spiegeln nicht. Punkte aus Brand oder Giftnebel auch nicht, weil das kein gegnerischer Schlag ist.

## Messung

Die empfohlene Stufe ist die Kapitel-Obergrenze. Für den Wiesenpfad ist das Stufe 12. Der Wächter steht mit seinen eigenen Stufen und der Skala 1,4 / 1,34 / 1,4 da. 500 Kämpfe, Samen 1 bis 500. Ein Sieg ist ein K.o. des Bosses. Eine Niederlage ist ein eigener K.o. Ein Timeout ist die Grenze von 30 Aktionen, auch wenn danach noch HP übrig sind. Die Werte aus B5 bleiben unverändert.

### Ein Kämpfer

Raufkänguru, Stufe 12, Typ Kampf, stark gegen Stein. Gegner ist die Kieselkrabbe, Stufe 7, der erste Wächter. Ohne Mechanik 463 Siege (92,6 %), 37 K.o.-Niederlagen, kein Timeout. Stufe 11 fällt auf etwa 21 %. Dazwischen gibt es keine ganzzahlige Stufe im Fenster 70–85 %. Deshalb bleibt die Obergrenze der Messpunkt: die Kämpfe enden wirklich, nicht an der Grenze.

| Mechanik | Sieg | K.o. | Timeout | Abstand |
|---|---|---|---|---|
| keine | 463 | 37 | 0 | |
| Panzerung | 10 | 490 | 0 | −90,6 Punkte |
| Wut | 187 | 313 | 0 | −55,2 Punkte |
| Beistand | 454 | 46 | 0 | −1,8 Punkte |
| Puls | 379 | 121 | 0 | −16,8 Punkte |
| Spiegel | 24 | 476 | 0 | −87,8 Punkte |

### Sechser-Team in Reihenfolge

Dieselben Wächter, drei Monster, der Boss behält nach einem K.o. seine HP. Das Team steht auf Stufe 12 in dieser Reihenfolge: Wühlmaus, Surrlibelle, Sumpfunke, Raufkänguru, Knospling, Sonnenküken. Vorhut, Konter und Schlussmann gelten. Ein Lauf zählt als Timeout, sobald ein einzelner Kampf die Grenze trifft.

| Mechanik | Sieg | K.o. | Timeout | Abstand |
|---|---|---|---|---|
| keine | 500 | 0 | 0 | |
| Panzerung | 401 | 99 | 0 | −19,8 Punkte |
| Wut | 499 | 1 | 0 | −0,2 Punkte |
| Beistand | 500 | 0 | 0 | 0 |
| Puls | 500 | 0 | 0 | 0 |
| Spiegel | 500 | 0 | 0 | 0 |

Panzerung, Wut, Puls und Spiegel drücken den einzelnen typstarken Kampf um mehr als 10 Punkte. Im vollen Team bleibt davon nur die Panzerung über 10 Punkten. Beistand ändert den einzelnen Kampf kaum und das Team gar nicht. Kein Lauf in dieser Messung endet an der Aktionsgrenze.
