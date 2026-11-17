# K4 Ult-Abnahme

Werte aus `docs/kampf-upgrade-konzept.md`, Abschnitt B1. Die Leiste lebt nur im Kampf, nicht im Speicherstand. Freischaltung ist Level 25, nicht die Sternstufe. Sternstufen wirken nur über den bestehenden Wertebonus von +4 % je Stufe.

| Muster | Wirkung |
|---|---|
| Durchschlag | 1 Ziel, Schaden ×1,6, ignoriert 30 % DEF, danach der Wetterfaktor |
| Schildwall | Schaden −40 % für 3 s auf das aktive eigene Monster. Eine Aktion der Kampfuhr ist 1 s bei ×1, also drei Aktionen. Danach ist der Wall weg. Bei ×2 sind es zwei Aktionen, bei ×3 eine, weil die gleiche Uhr mit dem Tempo läuft. K.o. oder ein Wechsel beendet ihn sofort. |
| Impuls | ATK +25 % für die nächsten 4 eigenen Angriffe |
| Fessel | Das Ziel setzt 1 Runde aus. „Dauer −50 %“ beim Boss ist als 50-%-Chance ausgelegt, dass die Fessel greift. |
| Heilleucht | Heilt 25 % der eigenen Max-HP, ohne Wetterfaktor |

20 Arten je Muster, `m01` ist Durchschlag.

Die Weg-Uhr bleibt ein Kampf = 2 800 ms. Ein kurzer Kampf (Ziel 280 HP, 20 Läufe) dauert mit Level 24 und mit Level 25 gleich lang: 8 Frames. Ein langer Kampf läuft in beiden Fällen in das Aktionslimit und endet bei 32 Frames. Die Regionszeit ändert sich dadurch nicht, weil sie an den Kämpfen hängt und nicht an der Trefferzahl darin.
