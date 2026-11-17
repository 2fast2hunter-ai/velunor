# Startseite – Barrierefreiheit (S4)

Geprüft an der Tür, am Ladebild und an Name/Avatar, Ansicht 390×844 und 360 px Breite. Die Shell ist 1080×2340 und wird auf die Fensterbreite skaliert. Bei 360 px ist der Faktor 1/3, deshalb sind 36 px in der Layoutfläche 12 px auf dem Schirm und 133 px in der Layoutfläche 44 px.

## Checkliste

- [x] Kontrast der lesbaren Paare liegt über 4,5:1. Creme `#fff8e1` auf Nachtblau `#10182e` ist 16,6:1, auf Kartenblau `#16223c` 14,9:1. Schrift `#1a1208` auf Gold `#f0c14a` ist 11,0:1. Creme auf dem roten Überschreiben-Knopf `#c62828` ist 5,3:1. Helles Grau `#d5def3` auf `#10182e` ist 13,1:1.
- [x] Typ ist nie nur Farbe: die Starterkarten zeigen Typ-Symbol und Wort, die Rolle Symbol und Wort.
- [x] Fokusreihenfolge folgt der Ansicht. Auf der Tür: Sprachchip, Weiterspielen, Neues Spiel. In der Abfrage liegt der Fokus auf Abbrechen, Tab bleibt in Abbrechen und Überschreiben, Escape bricht ab. Im Namen: Sprachchip, Namensfeld, Würfel, Zufällig, Haut, Haare, Farbe, Weiter. Bei den Startern sind die Karten eine Auswahlgruppe und mit den Pfeiltasten erreichbar.
- [x] Sichtbarer Fokusrahmen über `:focus-visible`.
- [x] Beschriftungen: das Logo hat `alt="Velunor"`, die Key-Art den Untertitel, der Ladebalken `role="progressbar"` mit Namen, der Einlauf einen `aria-label`. Dekorative Blätter und Lichtpunkte haben ein leeres `alt`.
- [x] Tippflächen der Tür, des Sprachchips, der Würfel, der Look-Knöpfe, der Punkte unter den Starterkarten und der Lade-Knöpfe sind mindestens 133 px in der Layoutfläche, also 44 px bei 360 px Breite. Weiterspielen und Weiter sind 177 px hoch.
- [x] Text auf der Startseite ist mindestens 36 px in der Layoutfläche, also 12 px bei 360 px Breite. Überschriften und der Goldbetrag sind größer.
- [x] `prefers-reduced-motion` schaltet Puls, Schimmer, Blätter und den Einlauf aus. „Effekte reduzieren“ im Spielstand lässt die Partikel auf der Weiterspielen-Seite weg. Es sind höchstens 8 Blätter und 12 Lichtpunkte, zusammen 20.
- [x] `lang` am Dokument und an der Bühne folgt der gewählten Sprache.

Offen bleibt der Lauf auf einem echten Handy. Der steht im Konzept bei Magnetilo und ist nicht Teil dieses Prüflaufs.
