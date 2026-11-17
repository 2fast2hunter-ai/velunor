# K8 Feinschliff und 30 fps

## A3

Die Regeln aus K1 bis K7 stehen schon im Code und bleiben so:

- Shake: Treffer 80 ms / 4 px, Krit oder stark 120 ms / 8 px, Boss-Ult 200 ms / 12 px. Bei „Effekte reduzieren“ und bei ×3 wird nur die Pixelweite halbiert.
- Hitstop: Krit oder stark 40 ms, Boss-Ult 80 ms. Bei „Effekte reduzieren“ und bei ×3 ist er 0.
- Partikel aus bei „Effekte reduzieren“ und bei ×3. Trefferflash und Zahlen bleiben.

Abweichung: Wetter und Konfetti lagen in einem zweiten Satz von 24 Bildern neben den 40 Trefferpunkten. Heilfunken haben den gemeinsamen Deckel nicht geprüft. Jetzt teilen sich Wetter, Konfetti und Trefferpunkte einen Raum von 40. `sharedParticleRoom` zieht beide Zähler ab.

Die Synergie-Anzeige steht in `docs/k8-synergie.md`. Der Aura-Blitz ist ein Sheet, kein Partikel, und zählt nicht in die 40.

## Messung

Headless Chrome, Viewport 390×844, CPU-Drossel 4× über `Emulation.setCPUThrottlingRate`. Je ein Wächterkampf von Funkfuchs und Tropfmolch, Intro weggetippt, dann 3 Sekunden `requestAnimationFrame`. Durchschnitt und 5-%-Low sind die sortierten Framezeiten.

| Fall | Schnitt | 5-%-Low | Frames |
|---|---|---|---|
| ×1, Effekte an | 59,3 | 30,0 | 165 |
| ×3, Effekte an | 65,8 | 59,9 | 181 |
| ×1, Effekte reduzieren | 64,0 | 59,5 | 179 |
| ×3, Effekte reduzieren | 60,7 | 59,9 | 181 |

Kein Fall liegt unter 30 fps. Der engste ist ×1 mit Effekten, dort ist der 5-%-Low genau 30. Wetter und Treffer laufen dort zusammen, bleiben aber im Pool von 40.
