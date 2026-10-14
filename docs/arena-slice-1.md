# Arena-Slice 1 – Asynchrone Geister-Arena (Velunor)
Stand 14.10.2026 · Umfang: 1 Tag · Basis: P-GDD (Kampf 7.x, `simulateBattle`, Währungen 8.1, Save 8.5), M2 (Kampfkraft 8.1)

## Ziel
Erstes PvP-Gefühl ohne Backend: Spieler kämpft gegen "Geister"-Teams (Snapshots), die deterministisch aus einem Seed nahe seiner Team-KK erzeugt werden. Tägliche Zusatzquelle für Juwelen/Gold, Rang-Punkte als Fortschritt.

## Freischaltung
**Rathaus 3** (5er-Team vorhanden). Vorher Button "Arena" mit Schloss + "Rathaus Stufe 3". Kein neues Gebäude: Eintrag in CityScene (Schild/Icon).

## Regeln
- **5 Versuche/Tag** (Reset bei neuem `dayKey`, lokale Zeit). Kein Kauf, keine Werbung für Extra-Versuche (Slice 1).
- **3 Gegner-Optionen** pro Auswahl: Leicht 0,85 ×, Mittel 1,00 ×, Schwer 1,15 × Spieler-Team-KK (M2 8.1). Neu würfeln: 1×/Tag gratis; nach jedem Kampf neue 3 Optionen.
- Gegner-Generierung: `seed = hash(dayKey + rerollIndex + slot)` → mulberry32. Aus freigeschalteten Spezies, Level = Spieler-Ø-Level ±2, Seltenheit = Spieler-Ø-Seltenheit ±1, dann Level so justieren, bis KK im Ziel ±5 % liegt. Name aus `ghostNames` (JSON) + Seed.
- Kampf: bestehendes `simulateBattle(playerTeam, ghostTeam, seed)` + BattleScene (Überspringen erlaubt, 4×). Keine EP, kein Typ-/Synergie-Sonderfall.
- **Punkte**: Sieg Leicht +10 / Mittel +20 / Schwer +30; Niederlage −5 (min. 0). Unentschieden/Zeitlimit = Niederlage.
- **Ränge** (nur Anzeige + Erstbelohnung): Bronze 0, Silber 100, Gold 250, Platin 500.

## Belohnungen (vorhandene Währungen)
| Ereignis | Belohnung |
|---|---|
| Sieg Leicht/Mittel/Schwer | 150 / 250 / 400 Gold |
| Niederlage | 50 Gold |
| Alle 5 Versuche genutzt (Tagestruhe) | 30 Juwelen + 20 Essenz |
| Rang erstmals erreicht Silber/Gold/Platin | 100 / 200 / 300 Juwelen (einmalig) |
Max/Tag ≈ 2.000 Gold + 30 Juwelen + 20 Essenz (< Tagesaufgaben-Wert an Juwelen).

## Datenstruktur
`src/data/arena.json`:
```json
{ "unlockTownhall": 3, "attemptsPerDay": 5, "freeRerolls": 1,
  "tiers": [ {"id":"easy","kkFactor":0.85,"win":10,"gold":150},
             {"id":"mid","kkFactor":1.0,"win":20,"gold":250},
             {"id":"hard","kkFactor":1.15,"win":30,"gold":400} ],
  "lossPoints": -5, "lossGold": 50, "dailyChest": {"gems":30,"essence":20},
  "ranks": [ {"id":"bronze","min":0,"gems":0},{"id":"silver","min":100,"gems":100},
             {"id":"gold","min":250,"gems":200},{"id":"platinum","min":500,"gems":300} ],
  "ghostNames": ["Nebelwanderer","Schattenzähmer","Irrlicht","Grauer Hüter"] }
```
Geist-Snapshot (Laufzeit, nicht gespeichert außer Seed): `{ "name":"Irrlicht", "tier":"mid", "kk":1840, "team":{"F1":{"speciesId":"m03","rarity":2,"level":14}, ...} }`

## Speicherstand (`save.arena`, Migration `version` → +1, Default unten)
```json
"arena": { "dayKey": "2026-10-14", "attemptsUsed": 0, "rerollsUsed": 0, "rerollIndex": 0,
           "points": 0, "bestRank": "bronze", "chestClaimed": false, "wins": 0, "losses": 0 }
```

## Grafiken (Smettbo, 3)
1. Arena-Icon/Schild für CityScene + Button (64×64 und 128×128)
2. Geister-Overlay für Gegnerkarten (halbtransparenter Nebel-Rahmen, 1 PNG)
3. 4 Rang-Abzeichen Bronze/Silber/Gold/Platin (ein Sprite-Sheet, 48×48)

## Acceptance Criteria
- [ ] Arena erst ab Rathaus 3 betretbar, sonst Schloss + Hinweis.
- [ ] 3 Gegner mit angezeigter KK ≈ 0,85/1,00/1,15 × Team-KK (±5 %); gleicher Seed → identische Teams nach Reload.
- [ ] Kampf nutzt `simulateBattle`; Überspringen liefert gleiches Ergebnis.
- [ ] Punkte/Gold laut Tabelle; Punkte nie < 0; Rang-Juwelen nur einmal.
- [ ] Max. 5 Versuche/Tag, 1 Gratis-Neuwürfeln; Reset bei neuem Tag; Uhr zurückstellen gibt keine Extra-Versuche.
- [ ] Tagestruhe nach 5. Versuch einmal abholbar.
- [ ] Alter Spielstand ohne `arena` migriert fehlerfrei.
- [ ] Keine Werbung (Banner/Interstitial) in ArenaScene/Kampf.

## Out of Scope
Echtes PvP/Backend, Ranglisten anderer Spieler, Verteidigungsteams, Saisons/Reset, Extra-Versuche per Werbung/Juwelen, Arena-Shop, Arena-Gebäude mit Stufen, Tagesaufgabe "Arena".
