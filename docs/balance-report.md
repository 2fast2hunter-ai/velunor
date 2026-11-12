# Balance-Messung

Messung gegen die aktuellen Spielwerte. Es wurde nichts daran geändert.

Parameter: Tempo ×1 (2,80 s je Begegnung), Offline-Anteil 50 %, Stichprobe 80 Kämpfe, Seed 100. Online-Stundenlimit: keins.

## Annahmen

- Ein Träger kämpft immer selbst und ist der Begleiter (+30 % EP). Wegkämpfe werden gewonnen.
- EP je besiegtem Gegner: 8 × Level × (1 + 0,25 × Seltenheit), wie im Kampf. Offline halbiert und höchstens 12 Level je 8 Stunden Abwesenheit.
- Der Träger schleift ein Kapitel bis zum Cap. Schritt 20 wird dabei nicht als Wächterkampf gewertet. Das Wappen-Gold gibt es einmal beim Erreichen.
- In einer neuen Region zählt der erste Fang. Das Tier startet auf dem mittleren Wild-Level. Der alte Träger darf diesen Fang noch bestreiten.
- Die Siegquote ist `fight1v1` mit einem Sechser-Team auf dem genannten Level. Ein verlorener 1v1 beendet den Wächter, wie im Spiel. Der Auto-Wechsel schickt das typstärkste lebende Tier, auch angeschlagen. Gegner bekommen die Erwachen-Werte, aber nicht den Skill-Bonus.
- Fund-Gold ist 50 × Kapitelnummer der Region. Trainer haben im Schnitt 2 Monster. Seltenheit und Wild-Level sind der gewichtete Tages-Schnitt.

## Spielzeit, Level, Gold

| Region | Station | Cap | Level rein | Level raus | Begegnungen | Stunden bis hier (gemischt) | Stunden bis hier (nur online) | Gold in der Station | Gold gesamt |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Grünmark | Wiesenpfad | 12 | 5 | 12 | 128 | 0,10 | 0,08 | 7.412 | 10.412 |
| Grünmark | Bachufer | 18 | 12 | 18 | 117 | 0,19 | 0,15 | 15.140 | 25.552 |
| Grünmark | Funkenwald | 24 | 18 | 24 | 110 | 0,28 | 0,21 | 22.208 | 47.760 |
| Grünmark | Moorsenke | 30 | 24 | 30 | 122 | 0,37 | 0,28 | 32.040 | 79.800 |
| Grünmark | Felsklamm | 36 | 30 | 36 | 128 | 0,47 | 0,36 | 43.684 | 123.484 |
| Grünmark | Sturmhöhe | 42 | 36 | 42 | 146 | 0,58 | 0,45 | 59.784 | 183.268 |
| Grünmark | Frostgrat | 48 | 42 | 48 | 186 | 0,73 | 0,55 | 83.080 | 266.348 |
| Grünmark | Klingenschmiede | 54 | 48 | 54 | 177 | 0,87 | 0,66 | 93.860 | 360.208 |
| Grünmark | Hoher Rat (Großwächter) | 68 | 54 | 54 | 15 | 0,88 | 0,67 | 55.000 | 415.208 |
| Frostküste | Eissaum | 60 | 52 | 60 | 298 | 1,11 | 0,77 | 163.460 | 578.668 |
| Frostküste | Gischtbucht | 66 | 60 | 66 | 206 | 1,27 | 0,86 | 128.052 | 706.720 |
| Frostküste | Treibholz | 72 | 66 | 72 | 210 | 1,44 | 0,94 | 148.222 | 854.942 |
| Frostküste | Packeis | 78 | 72 | 78 | 222 | 1,61 | 1,03 | 168.300 | 1.023.242 |
| Frostküste | Nordklippe | 84 | 78 | 84 | 230 | 1,79 | 1,13 | 192.046 | 1.215.288 |
| Frostküste | Salzmarsch | 90 | 84 | 90 | 238 | 1,97 | 1,23 | 213.540 | 1.428.828 |
| Frostküste | Fjordwacht | 96 | 90 | 96 | 310 | 2,21 | 1,33 | 295.404 | 1.724.232 |
| Frostküste | Polarnacht | 102 | 96 | 102 | 228 | 2,39 | 1,43 | 237.548 | 1.961.780 |
| Frostküste | Hoher Rat (Großwächterin) | 116 | 102 | 102 | 15 | 2,40 | 1,44 | 110.000 | 2.071.780 |
| Glutgebirge | Aschenhang | 108 | 100 | 108 | 370 | 2,69 | 1,57 | 390.700 | 2.462.480 |
| Glutgebirge | Schlackental | 114 | 108 | 114 | 230 | 2,87 | 1,66 | 264.700 | 2.727.180 |
| Glutgebirge | Kraterpfad | 120 | 114 | 120 | 238 | 3,06 | 1,76 | 288.090 | 3.015.270 |
| Glutgebirge | Brandstufe | 126 | 120 | 126 | 248 | 3,25 | 1,86 | 307.464 | 3.322.734 |
| Glutgebirge | Magmarinne | 132 | 126 | 132 | 252 | 3,44 | 1,97 | 342.648 | 3.665.382 |
| Glutgebirge | Rußkamm | 138 | 132 | 138 | 264 | 3,65 | 2,07 | 370.840 | 4.036.222 |
| Glutgebirge | Essengrund | 144 | 138 | 144 | 332 | 3,91 | 2,18 | 481.898 | 4.518.120 |
| Glutgebirge | Glutgipfel | 150 | 144 | 150 | 248 | 4,10 | 2,30 | 385.048 | 4.903.168 |
| Glutgebirge | Hoher Rat (Großwächter) | 164 | 150 | 150 | 15 | 4,11 | 2,31 | 165.000 | 5.068.168 |
| Schattenmoor | Dämmerpfad | 156 | 148 | 156 | 386 | 4,42 | 2,44 | 605.350 | 5.673.518 |
| Schattenmoor | Sumpfnacht | 162 | 156 | 162 | 238 | 4,60 | 2,54 | 394.380 | 6.067.898 |
| Schattenmoor | Schattenried | 168 | 162 | 168 | 246 | 4,79 | 2,64 | 414.730 | 6.482.628 |
| Schattenmoor | Nachtmoor | 174 | 168 | 174 | 236 | 4,98 | 2,73 | 424.792 | 6.907.420 |
| Schattenmoor | Schleiergrund | 180 | 174 | 180 | 250 | 5,17 | 2,84 | 464.256 | 7.371.676 |
| Schattenmoor | Tiefenwald | 186 | 180 | 186 | 252 | 5,37 | 2,94 | 482.368 | 7.854.044 |
| Schattenmoor | Morastwehr | 192 | 186 | 192 | 324 | 5,62 | 3,05 | 627.482 | 8.481.526 |
| Schattenmoor | Finsterkessel | 198 | 192 | 198 | 242 | 5,81 | 3,15 | 500.620 | 8.982.146 |
| Schattenmoor | Hoher Rat (Großwächter) | 212 | 198 | 198 | 15 | 5,82 | 3,17 | 220.000 | 9.202.146 |
| Himmelsthron | Wolkenstieg | 204 | 196 | 204 | 398 | 6,13 | 3,30 | 808.790 | 10.010.936 |
| Himmelsthron | Höhenwind | 210 | 204 | 210 | 256 | 6,33 | 3,41 | 546.536 | 10.557.472 |
| Himmelsthron | Sternenfeld | 216 | 210 | 216 | 262 | 6,54 | 3,51 | 577.072 | 11.134.544 |
| Himmelsthron | Ätherstieg | 222 | 216 | 222 | 266 | 6,74 | 3,62 | 597.044 | 11.731.588 |
| Himmelsthron | Thronnähe | 228 | 222 | 228 | 268 | 6,95 | 3,73 | 635.490 | 12.367.078 |
| Himmelsthron | Himmelsrand | 234 | 228 | 234 | 270 | 7,16 | 3,84 | 655.200 | 13.022.278 |
| Himmelsthron | Kronenlicht | 240 | 234 | 240 | 346 | 7,43 | 3,96 | 838.456 | 13.860.734 |
| Himmelsthron | Thronhalle | 246 | 240 | 246 | 252 | 7,63 | 4,07 | 656.028 | 14.516.762 |
| Himmelsthron | Hoher Rat (Großwächter) | 260 | 246 | 246 | 15 | 7,64 | 4,08 | 275.000 | 14.791.762 |

## Wächter und Rat

| Kampf | Cap | Team-Level | Gegner-Level | Siegquote |
|---|---:|---:|---|---:|
| Grünmark · Wiesenpfad | 12 | 12 | 9/10/12 | 29 % |
| Grünmark · Bachufer | 18 | 18 | 15/16/18 | 0 % |
| Grünmark · Funkenwald | 24 | 24 | 21/22/24 | 0 % |
| Grünmark · Moorsenke | 30 | 30 | 27/28/30 | 0 % |
| Grünmark · Felsklamm | 36 | 36 | 33/34/36 | 0 % |
| Grünmark · Sturmhöhe | 42 | 42 | 39/40/42 | 0 % |
| Grünmark · Frostgrat | 48 | 48 | 45/46/48 | 3 % |
| Grünmark · Klingenschmiede | 54 | 54 | 51/52/54 | 0 % |
| Grünmark · Rat Eldon | 55 | 55 | 53/54/55 | 14 % |
| Grünmark · Rätin Sura | 58 | 58 | 56/57/58 | 0 % |
| Grünmark · Rat Kelm | 61 | 61 | 59/60/61 | 100 % |
| Grünmark · Rätin Nyra | 64 | 64 | 62/63/64 | 9 % |
| Grünmark · Großwächter Orim | 68 | 68 | 66/67/68 | 0 % |
| Grünmark · Rat-Kette bei Ankunftslevel | 68 | 54 | alle fünf | 0 % |
| Frostküste · Eissaum | 60 | 60 | 57/58/60 | 0 % |
| Frostküste · Gischtbucht | 66 | 66 | 63/64/66 | 0 % |
| Frostküste · Treibholz | 72 | 72 | 69/70/72 | 86 % |
| Frostküste · Packeis | 78 | 78 | 75/76/78 | 60 % |
| Frostküste · Nordklippe | 84 | 84 | 81/82/84 | 1 % |
| Frostküste · Salzmarsch | 90 | 90 | 87/88/90 | 1 % |
| Frostküste · Fjordwacht | 96 | 96 | 93/94/96 | 4 % |
| Frostküste · Polarnacht | 102 | 102 | 99/100/102 | 34 % |
| Frostküste · Rat Veyr | 103 | 103 | 101/102/103 | 0 % |
| Frostküste · Rätin Signe | 106 | 106 | 104/105/106 | 0 % |
| Frostküste · Rat Odun | 109 | 109 | 107/108/109 | 0 % |
| Frostküste · Rätin Mael | 112 | 112 | 110/111/112 | 0 % |
| Frostküste · Großwächterin Hrim | 116 | 116 | 114/115/116 | 0 % |
| Frostküste · Rat-Kette bei Ankunftslevel | 116 | 102 | alle fünf | 0 % |
| Glutgebirge · Aschenhang | 108 | 108 | 105/106/108 | 0 % |
| Glutgebirge · Schlackental | 114 | 114 | 111/112/114 | 0 % |
| Glutgebirge · Kraterpfad | 120 | 120 | 117/118/120 | 0 % |
| Glutgebirge · Brandstufe | 126 | 126 | 123/124/126 | 0 % |
| Glutgebirge · Magmarinne | 132 | 132 | 129/130/132 | 0 % |
| Glutgebirge · Rußkamm | 138 | 138 | 135/136/138 | 11 % |
| Glutgebirge · Essengrund | 144 | 144 | 141/142/144 | 0 % |
| Glutgebirge · Glutgipfel | 150 | 150 | 147/148/150 | 0 % |
| Glutgebirge · Rat Ignaz | 151 | 151 | 149/150/151 | 0 % |
| Glutgebirge · Rätin Vesta | 154 | 154 | 152/153/154 | 0 % |
| Glutgebirge · Rat Harun | 157 | 157 | 155/156/157 | 0 % |
| Glutgebirge · Rätin Mila | 160 | 160 | 158/159/160 | 0 % |
| Glutgebirge · Großwächter Pyr | 164 | 164 | 162/163/164 | 0 % |
| Glutgebirge · Rat-Kette bei Ankunftslevel | 164 | 150 | alle fünf | 0 % |
| Schattenmoor · Dämmerpfad | 156 | 156 | 153/154/156 | 0 % |
| Schattenmoor · Sumpfnacht | 162 | 162 | 159/160/162 | 0 % |
| Schattenmoor · Schattenried | 168 | 168 | 165/166/168 | 0 % |
| Schattenmoor · Nachtmoor | 174 | 174 | 171/172/174 | 0 % |
| Schattenmoor · Schleiergrund | 180 | 180 | 177/178/180 | 0 % |
| Schattenmoor · Tiefenwald | 186 | 186 | 183/184/186 | 0 % |
| Schattenmoor · Morastwehr | 192 | 192 | 189/190/192 | 0 % |
| Schattenmoor · Finsterkessel | 198 | 198 | 195/196/198 | 0 % |
| Schattenmoor · Rat Kelv | 199 | 199 | 197/198/199 | 51 % |
| Schattenmoor · Rätin Duma | 202 | 202 | 200/201/202 | 53 % |
| Schattenmoor · Rat Soren | 205 | 205 | 203/204/205 | 44 % |
| Schattenmoor · Rätin Pira | 208 | 208 | 206/207/208 | 46 % |
| Schattenmoor · Großwächter Noct | 212 | 212 | 210/211/212 | 38 % |
| Schattenmoor · Rat-Kette bei Ankunftslevel | 212 | 198 | alle fünf | 0 % |
| Himmelsthron · Wolkenstieg | 204 | 204 | 201/202/204 | 0 % |
| Himmelsthron · Höhenwind | 210 | 210 | 207/208/210 | 100 % |
| Himmelsthron · Sternenfeld | 216 | 216 | 213/214/216 | 0 % |
| Himmelsthron · Ätherstieg | 222 | 222 | 219/220/222 | 0 % |
| Himmelsthron · Thronnähe | 228 | 228 | 225/226/228 | 29 % |
| Himmelsthron · Himmelsrand | 234 | 234 | 231/232/234 | 89 % |
| Himmelsthron · Kronenlicht | 240 | 240 | 237/238/240 | 0 % |
| Himmelsthron · Thronhalle | 246 | 246 | 243/244/246 | 57 % |
| Himmelsthron · Rat Oris | 247 | 247 | 245/246/247 | 0 % |
| Himmelsthron · Rätin Cael | 250 | 250 | 248/249/250 | 0 % |
| Himmelsthron · Rat Vion | 253 | 253 | 251/252/253 | 0 % |
| Himmelsthron · Rätin Nima | 256 | 256 | 254/255/256 | 0 % |
| Himmelsthron · Großwächter Ith | 260 | 260 | 258/259/260 | 0 % |
| Himmelsthron · Rat-Kette bei Ankunftslevel | 260 | 246 | alle fünf | 0 % |

## Fang

| Seltenheit | Basis | Chance, gleiches Level | Versuche | Chance, Gegner höher | Versuche |
|---|---:|---:|---:|---:|---:|
| 0 | 0,60 | 60 % | 1,7 | 48 % | 2,1 |
| 1 | 0,50 | 50 % | 2,0 | 40 % | 2,5 |
| 2 | 0,40 | 40 % | 2,5 | 32 % | 3,1 |
| 3 | 0,30 | 30 % | 3,3 | 24 % | 4,2 |
| 4 | 0,22 | 22 % | 4,5 | 18 % | 5,7 |
| 5 | 0,15 | 15 % | 6,7 | 12 % | 8,3 |
| 6 | 0,10 | 10 % | 10,0 | 8 % | 12,5 |
| 7 | 0,06 | 6 % | 16,7 | 5 % | 20,8 |
| 8 | 0,04 | 4 % | 25,0 | 3 % | 31,3 |
| 9 | 0,02 | 2 % | 50,0 | 2 % | 62,5 |

Deckel der Fangchance: 60 %. „Gegner höher“ setzt den Kämpfer 10 Level unter den Gegner und damit den Faktor 0,8.

## Gold gegen Preise

| Preis | Kosten | Gold beim Freischalten | Gold je Stunde dort | Stunden zum Preis |
|---|---:|---:|---:|---:|
| EP-Kristall S (sofort) | 1.000 G | 10.412 G | 74.451 G | 0,8 min |
| EP-Kristall M (ab 3 Wappen) | 12.000 G | 79.800 G | 337.658 G | 2,1 min |
| EP-Kristall L (ab 6 Wappen) | 150.000 G | 266.348 G | 574.286 G | 15,7 min |
| EP-Kristall XL (ab 8 Wappen) | 500.000 G | 360.208 G | 681.792 G | 44,0 min |
| teuerste Frucht (Glanzfrucht) | 25.000 G | 10.412 G | 74.451 G | 20,1 min |
| Hortplatz 2 (ohne Siegel) | 20.000 G | 10.412 G | 74.451 G | 16,1 min |
| Hortplatz 3 (nach Ratsiegel, Einkommen aus Klingenschmiede) | 120.000 G | 360.208 G | 681.792 G | 10,6 min |
| Hortplatz 4 (nach Zweitem Ratsiegel, Einkommen aus Polarnacht) | 500.000 G | 1.961.780 G | 1.339.556 G | 22,4 min |
| ein Dreh ×1 (ab Wappen 3) | 1.000 G | 47.760 G | 259.574 G | 0,2 min |

Ein Dreh kostet 1.000 G und zahlt im Schnitt 1,70 Glücksmarken (Auszahlungsquote 85 % bei 500 G je Marke).
- Grünmark Amethystwächter: 300 Marken, etwa 176 Drehungen, 176.467 G.
- Grünmark Sturmadler: 500 Marken, etwa 294 Drehungen, 294.112 G.
- Frostküste Gletscherbär: 700 Marken, etwa 412 Drehungen, 411.756 G.
- Glutgebirge Glutwidder: 900 Marken, etwa 529 Drehungen, 529.401 G.
- Schattenmoor Schattenpanther: 1.200 Marken, etwa 706 Drehungen, 705.868 G.
- Himmelsthron Wolkendrache: 1.500 Marken, etwa 882 Drehungen, 882.335 G.

Gold am Ende der Messung: 14.791.762 G.

## Auffälligkeiten

- Jeder Hohe Rat liegt 14 Level über dem Cap des 8. Kapitels. Dort gibt es keine Wildnis, und das Kapitel-Cap gibt vorher keine EP mehr her. Die Rat-Kette wird mit dem Ankunftslevel gemessen.
- 57 von 65 Einzelkämpfen liegen unter 50 % auf Cap-Level, davon 44 bei 0 %.
- Grünmark: Grünmark · Wiesenpfad 29 % (Gegner 9/10/12); Grünmark · Bachufer 0 % (Gegner 15/16/18); Grünmark · Funkenwald 0 % (Gegner 21/22/24); Grünmark · Moorsenke 0 % (Gegner 27/28/30); Grünmark · Felsklamm 0 % (Gegner 33/34/36); Grünmark · Sturmhöhe 0 % (Gegner 39/40/42); Grünmark · Frostgrat 3 % (Gegner 45/46/48); Grünmark · Klingenschmiede 0 % (Gegner 51/52/54); Grünmark · Rat Eldon 14 % (Gegner 53/54/55); Grünmark · Rätin Sura 0 % (Gegner 56/57/58); Grünmark · Rätin Nyra 9 % (Gegner 62/63/64); Grünmark · Großwächter Orim 0 % (Gegner 66/67/68).
- Frostküste: Frostküste · Eissaum 0 % (Gegner 57/58/60); Frostküste · Gischtbucht 0 % (Gegner 63/64/66); Frostküste · Nordklippe 1 % (Gegner 81/82/84); Frostküste · Salzmarsch 1 % (Gegner 87/88/90); Frostküste · Fjordwacht 4 % (Gegner 93/94/96); Frostküste · Polarnacht 34 % (Gegner 99/100/102); Frostküste · Rat Veyr 0 % (Gegner 101/102/103); Frostküste · Rätin Signe 0 % (Gegner 104/105/106); Frostküste · Rat Odun 0 % (Gegner 107/108/109); Frostküste · Rätin Mael 0 % (Gegner 110/111/112); Frostküste · Großwächterin Hrim 0 % (Gegner 114/115/116).
- Glutgebirge: Glutgebirge · Aschenhang 0 % (Gegner 105/106/108); Glutgebirge · Schlackental 0 % (Gegner 111/112/114); Glutgebirge · Kraterpfad 0 % (Gegner 117/118/120); Glutgebirge · Brandstufe 0 % (Gegner 123/124/126); Glutgebirge · Magmarinne 0 % (Gegner 129/130/132); Glutgebirge · Rußkamm 11 % (Gegner 135/136/138); Glutgebirge · Essengrund 0 % (Gegner 141/142/144); Glutgebirge · Glutgipfel 0 % (Gegner 147/148/150); Glutgebirge · Rat Ignaz 0 % (Gegner 149/150/151); Glutgebirge · Rätin Vesta 0 % (Gegner 152/153/154); Glutgebirge · Rat Harun 0 % (Gegner 155/156/157); Glutgebirge · Rätin Mila 0 % (Gegner 158/159/160); Glutgebirge · Großwächter Pyr 0 % (Gegner 162/163/164).
- Schattenmoor: Schattenmoor · Dämmerpfad 0 % (Gegner 153/154/156); Schattenmoor · Sumpfnacht 0 % (Gegner 159/160/162); Schattenmoor · Schattenried 0 % (Gegner 165/166/168); Schattenmoor · Nachtmoor 0 % (Gegner 171/172/174); Schattenmoor · Schleiergrund 0 % (Gegner 177/178/180); Schattenmoor · Tiefenwald 0 % (Gegner 183/184/186); Schattenmoor · Morastwehr 0 % (Gegner 189/190/192); Schattenmoor · Finsterkessel 0 % (Gegner 195/196/198); Schattenmoor · Rat Soren 44 % (Gegner 203/204/205); Schattenmoor · Rätin Pira 46 % (Gegner 206/207/208); Schattenmoor · Großwächter Noct 38 % (Gegner 210/211/212).
- Himmelsthron: Himmelsthron · Wolkenstieg 0 % (Gegner 201/202/204); Himmelsthron · Sternenfeld 0 % (Gegner 213/214/216); Himmelsthron · Ätherstieg 0 % (Gegner 219/220/222); Himmelsthron · Thronnähe 29 % (Gegner 225/226/228); Himmelsthron · Kronenlicht 0 % (Gegner 237/238/240); Himmelsthron · Rat Oris 0 % (Gegner 245/246/247); Himmelsthron · Rätin Cael 0 % (Gegner 248/249/250); Himmelsthron · Rat Vion 0 % (Gegner 251/252/253); Himmelsthron · Rätin Nima 0 % (Gegner 254/255/256); Himmelsthron · Großwächter Ith 0 % (Gegner 258/259/260).
- Rat-Ketten: Grünmark · Rat-Kette bei Ankunftslevel 0 % auf Level 54; Frostküste · Rat-Kette bei Ankunftslevel 0 % auf Level 102; Glutgebirge · Rat-Kette bei Ankunftslevel 0 % auf Level 150; Schattenmoor · Rat-Kette bei Ankunftslevel 0 % auf Level 198; Himmelsthron · Rat-Kette bei Ankunftslevel 0 % auf Level 246.
- EP von Level 5 bis 260: 14.547.935. Mit der Wild-EP von Thronhalle (5.569 EP je Online-Kampf) sind das 2.612 Kämpfe und 2,03 h. Die Kurve hat kein eigenes Höchstlevel. Das Kapitel-Cap schneidet sie ab, der Rat selbst füttert sie nicht.
- Seltenheit 9 braucht im Schnitt 50 Versuche bei gleichem Level (Basis 0,02). Seltenheit 0 ist bei 60 % gedeckelt. Seltenheit 8 braucht 25 Versuche.
