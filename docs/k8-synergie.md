# K8 Synergie-Anzeige

Phase-2-Schritt 15 mit genau 12 Kombis und höchstens 2 aktiven ist im Abenteuer-Kampf nicht vorhanden. `src/synergy.ts` gehört zum alten Lager-Kampf und vergibt dort echte Werte. Der Abenteuer-Kampf übernimmt diese Werte nicht.

K8 erkennt deshalb nur. `src/adventure/combo.ts` enthält einen lokalen Stub mit 12 Typ-Paaren. Es gelten höchstens die ersten zwei Treffer in dieser festen Reihenfolge. Es gibt keine neuen Boni auf ATK, HP oder sonstige Werte.

Eine aktive Kombi zeigt `combo_synergy_64.png` neben der Teamleiste. Beim Kampfstart läuft `aura_flash.png` einmal: 5 Bilder à 128 px, 14 fps, 357 ms bei ×1, geteilt durch das Tempo. Der Blitz ist ein Sheet, kein Partikel, und zählt nicht in den Pool von 40. Bei ×3 wird er kürzer. „Effekte reduzieren“ schaltet Partikel und Hitstop aus, den Blitz nicht.

Feuer und Wasser im Team sind „Glut und Tropfen“.
