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

200 Kämpfe, Samen 1 bis 200. Tropfmolch Stufe 25 gegen Kieselkrabbe Stufe 25, Boss-Skala 1,4 auf HP, ATK und DEF. Ohne Mechanik 78 Siege (39 %). Fast jeder Kampf läuft in die Grenze von 32 Aktionen, der Sieg ist dann der höhere HP-Anteil.

| Mechanik | Siege | Abstand | Mittlere Aktionen |
|---|---|---|---|
| keine | 78 | | 32,00 |
| Panzerung | 3 | −37,5 Punkte | 32,00 |
| Wut | 78 | 0 | 32,00 |
| Beistand | 52 | −13,0 Punkte | 33,90 |
| Puls | 41 | −18,5 Punkte | 33,96 |
| Spiegel | 9 | −34,5 Punkte | 32,00 |

Panzerung, Beistand, Puls und Spiegel drücken die Siegquote in diesem engen Kampf um mehr als 10 Punkte. Die Werte aus B5 bleiben unverändert. Wut verschiebt hier nichts, weil der Kampf an der Aktionsgrenze endet, bevor die 40-%-Schwelle den Ausgang dreht. Beistand und Puls verlängern den Kampf um die Extra-Treffer.
