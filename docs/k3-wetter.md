# K3 Wetter-Abnahme

Werte aus der freigegebenen Fassung `docs/kampf-upgrade-konzept.md`, Abschnitt A5. Der Faktor hängt am Typ des Angreifers und wird nach dem Typ-Multiplikator multipliziert. Offline und die PvP-Arena rechnen mit Faktor 1.

| Wetter | Stärker | Schwächer |
|---|---|---|
| Klar | Feuer +10 %, Licht +10 % | Eis −10 % |
| Regen | Wasser +15 % | Feuer −15 % |
| Gewitter | Blitz +15 % | Metall −10 % |
| Schnee | Eis +15 % | Pflanze −10 %, Drache −10 % |
| Nebel | Geist +10 %, Schatten +10 % | Licht −10 % |
| Wind | Wind +15 %, Klang +5 % | Insekt −10 % |

Über alle 6 Wetter gemittelt bleibt jeder Typ innerhalb von ±3 % gegenüber dem Kampf ohne Wetter. Der Mittelwert über alle 20 Typen liegt innerhalb von ±2 %. Offline ohne Wetter zieht die Spielzeit pro Region noch näher an die alte Dauer. Der Check steht als Test in `src/adventure/weather.test.ts`.
