# K4 Ult-Abnahme

Werte aus `docs/kampf-upgrade-konzept.md`, Abschnitt B1. Die Leiste lebt nur im Kampf, nicht im Speicherstand. Freischaltung ist Level 25, nicht die Sternstufe. Sternstufen wirken nur über den bestehenden Wertebonus von +4 % je Stufe.

| Muster | Wirkung |
|---|---|
| Durchschlag | 1 Ziel, Schaden ×1,6, ignoriert 30 % DEF, danach der Wetterfaktor |
| Schildwall | Schaden −40 % auf das eigene Monster für den Rest des Kampfes. Ein Kampf dauert 2,8 s, die 3 s aus dem Konzept decken also jeden späteren Treffer. |
| Impuls | ATK +25 % für die nächsten 4 eigenen Angriffe |
| Fessel | Das Ziel setzt 1 Runde aus. Bei einem Boss greift sie mit 50 % |
| Heilleucht | Heilt 25 % der eigenen Max-HP, ohne Wetterfaktor |

20 Arten je Muster, `m01` ist Durchschlag.

Die Weg-Uhr bleibt ein Kampf = 2 800 ms. Ein kurzer Kampf (Ziel 280 HP, 20 Läufe) dauert mit Level 24 und mit Level 25 gleich lang: 8 Frames. Ein langer Kampf läuft in beiden Fällen in das Aktionslimit und endet bei 32 Frames. Die Regionszeit ändert sich dadurch nicht, weil sie an den Kämpfen hängt und nicht an der Trefferzahl darin.
