# Game-Design-Dokument – Prototyp „Monster-Stadt" (Arbeitstitel)

**Version:** 0.1 (Prototyp) · **Stand:** 13.10.2026 · **Grundlage:** `konzept.md` (Fabian-Noel)
**Zielgruppe:** Entwicklung (Porygon) – TypeScript + Phaser, HTML5, Speicherstand lokal
**Prototyp-Dauer laut Konzept:** 2–4 Wochen

> **Lesehinweis**
> - Alles, was nicht direkt aus dem Konzept kommt, ist mit **[ANNAHME]** markiert. Diese Punkte sind Vorschläge und können geändert werden; die Zahlen sind trotzdem so gewählt, dass man sie direkt einbauen kann.
> - Alle Balancing-Werte gehören in **JSON-Konfigdateien** (`/data/*.json`) und nicht in den Code, damit nach den wöchentlichen Analysen ohne Code-Änderung nachjustiert werden kann. **[ANNAHME]**
> - Dezimalzahlen stehen im Text mit Komma (1,5), in JSON/TS mit Punkt (1.5).
> - Zufall läuft immer über einen **seedbaren PRNG** (z. B. `mulberry32`), nie über `Math.random()` direkt. Dann kann man Kämpfe reproduzieren, überspringen und debuggen. **[ANNAHME]**

---

## 0. Umfang des Prototyps (Scope)

| Bereich | Im Prototyp | Später (Beta+) |
|---|---|---|
| Stadt | 3 Gebäude: Rathaus, Goldmine, Trainingsgelände (je 5 Stufen) | weitere Gebäude (Zuchtstation, Labor, Arena …) |
| Monster | 10 Starter-Monster, 4 aktive Typen | weitere Monster und Typen schrittweise |
| Seltenheiten | alle 10 Stufen technisch umgesetzt (Gacha + Aufwertung) | Zucht als zusätzlicher Weg zu Top-Stufen |
| Kampf | PvE-Kampagne: 2 Kapitel × 10 Stages, Auto-Kampf | Events, Dungeons, asynchrones PvP |
| Gacha | 1 Standard-Portal, Pity, transparente Raten | Event-/Typ-Portale |
| Zucht | **nicht im Prototyp**, nur Platzhalter ab Rathaus 5 **[ANNAHME]** | volles Zuchtsystem |
| Monetarisierung | Rewarded Ads, Interstitials an natürlichen Pausen, Banner (Plattform-SDK-Adapter) | – |
| Speicher | `localStorage`, JSON, versioniert | optional Export/Import als Datei |

---

## 1. Kern-Loop

### 1.1 Übersicht

```
        ┌────────────────────────────────────────────────────────────┐
        │                                                            │
        ▼                                                            │
 [Stadt] ── Gold einsammeln (Goldmine) ──► [Gebäude ausbauen] ───────┤
    │                                         │ schaltet frei        │
    │                                         ▼                      │
    ├──► [Portal: Gacha] ◄── Juwelen ─── [Kampagne: Auto-Kampf] ──────┤
    │         │ neue Monster                  ▲   │ Gold, EP, Juwelen │
    │         ▼                               │   ▼                   │
    └──► [Team aufstellen 5er] ──────────────┘ [Monster leveln /     │
              ▲                                  trainieren /        │
              └──────── stärkeres Team ◄──────── aufwerten] ─────────┘
```

**Kurzer Loop (1–3 Min.):** Stage wählen → Team prüfen → Auto-Kampf (1×/2×/4× oder überspringen) → Belohnung (optional Rewarded Ad ×2) → zurück zur Stadt.
**Mittlerer Loop (10–20 Min., eine Sitzung):** Gold aus der Mine holen → Gebäude ausbauen / Training starten → mehrere Stages → Juwelen sammeln → Gacha → Team umstellen.
**Langer Loop (Tage):** Rathaus-Stufen → neue Systeme (Team-Plätze, Synergien, Aufwertung, Überspringen) → Monster aufwerten (Seltenheit hoch) → Kapitel 2 / Boss.

### 1.2 Erste Sitzung (Onboarding) – Ablauf als Skript **[ANNAHME]**

| Schritt | Auslöser | Was passiert | Belohnung |
|---|---|---|---|
| 1 | Spielstart | Stadt mit Rathaus 1, Goldmine 1, Trainingsgelände 1. Spieler bekommt **Funkfuchs, Tropfmolch, Knospling** (alle Gewöhnlich, Lv. 1). | 300 Juwelen, 500 Gold |
| 2 | Tutorial-Pfeil „Kämpfen" | Stage 1-1 (2 Gegner). 3 Plätze aktiv (F1, F2, H1). Erklärt: Front/Hinten, Kampf läuft automatisch. | Stage-Belohnung |
| 3 | Stage 1-2 gewonnen | Portal wird freigeschaltet; **kostenlose Tutorial-10er-Ziehung**, die offen angezeigt garantiert ≥ 1× Episch enthält (zählt zur Pity). | 10 Monster |
| 4 | Zurück in der Stadt | Goldmine einsammeln (Tutorial schreibt einmalig 200 Gold gut), Trainingsgelände: ersten Trainingslauf starten (Tutorial: gratis). | – |
| 5 | Stage 1-5 gewonnen | Hinweis „Rathaus ausbauen“ → Rathaus 2. | – |
| Ende | – | Ab hier gibt es keine Zwangsführung mehr, nur noch Ausrufezeichen an neuen Funktionen. | – |

Regel aus dem Konzept: „Sehr einfacher Einstieg, Systeme werden über Rathaus-Stufen freigeschaltet“ → Gesperrte Buttons werden mit einem Schloss und dem Text „Rathaus Stufe X“ angezeigt.

### 1.3 Zustandsautomat der Szenen (Phaser-Scenes) **[ANNAHME]**

`BootScene → PreloadScene → CityScene ⇄ {TeamScene, PortalScene, CampaignScene → BattleScene → ResultScene, BuildingScene, MonsterListScene}`
Persistentes UI (Währungsleiste) als eigene `HUDScene`, parallel aktiv. **Banner nur in CityScene/MonsterListScene/TeamScene, nie in BattleScene.**

---

## 2. Stadt: Gebäude & Freischaltstufen

### 2.1 Allgemeine Bauregeln **[ANNAHME]**

- Es gibt **1 Bauplatz-Warteschlange**: Es kann immer nur 1 Gebäude gleichzeitig ausgebaut werden.
- Kosten werden beim Start des Ausbaus bezahlt. Wer abbricht, bekommt 100 % zurück.
- Bauzeiten laufen in Echtzeit, auch offline (`Date.now()`-Zeitstempel im Speicherstand). Ist das Zeit-Delta negativ (Uhr zurückgestellt), wird es als 0 gewertet.
- Bedingung für Gebäude-Stufe n (außer Rathaus): **Rathaus ≥ angegebene Stufe**.
- Beschleunigen ist nur per Rewarded Ad möglich (siehe Kap. 9), nie mit Juwelen. So bleibt Juwelen-Wert = Gacha. **[ANNAHME]**

### 2.2 Rathaus (zentrales Freischalt-Gebäude)

| Stufe | Kosten (Gold) | Bauzeit | Bedingung | Schaltet frei |
|---|---|---|---|---|
| 1 | – (Start) | – | – | Kampagne Kap. 1, Team-Plätze **3** (F1, F2, H1), Goldmine & Training bis Stufe 1, Portal (ab Stage 1-2), Kampf 1×/2× |
| 2 | 500 | 2 Min. | Stage **1-5** gewonnen | Team-Plätze **4** (+H2), **Typ-Synergien** (Kap. 7.9), Gebäude bis Stufe 2–3, Kampfgeschwindigkeit **4×**, Tagesaufgaben |
| 3 | 2.000 | 10 Min. | Stage **1-8** gewonnen | Team-Plätze **5** (+H3), **Aufwertung** (Seltenheit erhöhen), **Überspringen** auch für noch nicht gewonnene Stages, Monster freilassen → Essenz |
| 4 | 6.000 | 30 Min. | Stage **1-10** (Boss) gewonnen | Kampagne Kap. 2, Gebäude bis Stufe 4, **Mehrfach-Kampf** (Stage 3× hintereinander automatisch) |
| 5 | 15.000 | 90 Min. | Stage **2-5** gewonnen | Gebäude bis Stufe 5, Platzhalter **Zuchtstation** („Bald verfügbar“) |

Belohnung einmalig je erreichter Rathaus-Stufe: **100 × Stufe Juwelen** (St. 2: 200, St. 3: 300 …). **[ANNAHME]**

### 2.3 Goldmine (Haupt-Goldquelle, passiv)

| Stufe | Kosten (Gold) | Bauzeit | Bedingung | Produktion Gold/Std. | Lager (max., = 8 Std.) |
|---|---|---|---|---|---|
| 1 | – (Start) | – | – | 60 | 480 |
| 2 | 300 | 1 Min. | Rathaus 2 | 120 | 960 |
| 3 | 900 | 5 Min. | Rathaus 2 | 200 | 1.600 |
| 4 | 2.500 | 20 Min. | Rathaus 4 | 320 | 2.560 |
| 5 | 6.000 | 60 Min. | Rathaus 5 | 480 | 3.840 |

Formel (bei jedem Öffnen der Stadt und beim Einsammeln):
```
stored = min(capacity, stored + rate_per_hour * (now - lastTick) / 3_600_000)
lastTick = now
```
Einsammeln: `gold += floor(stored); stored -= floor(stored)`. Ab 25 % Füllstand zeigt die Mine eine Sprechblase mit Münze. Während des Ausbaus produziert die Mine weiter (mit der alten Stufe). **[ANNAHME]**

### 2.4 Trainingsgelände (EP-Quelle, Gold-Senke)

| Stufe | Kosten (Gold) | Bauzeit | Bedingung | Slots | EP/Min. pro Slot |
|---|---|---|---|---|---|
| 1 | – (Start) | – | – | 1 | 12 |
| 2 | 400 | 1 Min. | Rathaus 2 | 1 | 18 |
| 3 | 1.200 | 5 Min. | Rathaus 3 | 2 | 26 |
| 4 | 3.500 | 20 Min. | Rathaus 4 | 2 | 36 |
| 5 | 8.000 | 60 Min. | Rathaus 5 | 3 | 50 |

Regeln **[ANNAHME]**:
- Es gibt drei Trainingsdauern: **30 Min. / 2 Std. / 8 Std.**
- `ep_total = epPerMin(stufe) × minuten`; Kosten `gold = ceil(ep_total × 0,3)`, zahlbar beim Start.
- Die EP gibt es beim Abholen. Wird vorher abgebrochen, gibt es die anteiligen EP sofort und das restliche Gold anteilig zurück.
- Erreicht das Monster vorher seine Max-Stufe, endet das Training. Überschüssige EP werden als Gold erstattet (`0,3 Gold/EP`).
- Ein Monster im Training **darf trotzdem kämpfen**, damit der Einstieg nicht blockiert ist.
- Wird das Gebäude ausgebaut, laufen bestehende Trainings mit der alten Rate weiter.

Beispiel: Stufe 3, 2 Std. → 26 × 120 = 3.120 EP für 936 Gold.

### 2.5 Datenstruktur Gebäude (`/data/buildings.json`)

```json
{
  "townhall": {
    "levels": [
      { "level": 1, "cost": 0,     "buildSec": 0,    "req": {},                     "unlocks": ["campaign_ch1", "team_slots_3", "portal", "speed_2x"] },
      { "level": 2, "cost": 500,   "buildSec": 120,  "req": { "stageCleared": "1-5" },  "unlocks": ["team_slots_4", "synergies", "speed_4x", "daily_quests"] },
      { "level": 3, "cost": 2000,  "buildSec": 600,  "req": { "stageCleared": "1-8" },  "unlocks": ["team_slots_5", "ascension", "skip_uncleared", "release_monster"] },
      { "level": 4, "cost": 6000,  "buildSec": 1800, "req": { "stageCleared": "1-10" }, "unlocks": ["campaign_ch2", "multi_battle"] },
      { "level": 5, "cost": 15000, "buildSec": 5400, "req": { "stageCleared": "2-5" },  "unlocks": ["breeding_placeholder"] }
    ]
  },
  "goldmine": {
    "levels": [
      { "level": 1, "cost": 0,    "buildSec": 0,    "req": { "townhall": 1 }, "ratePerHour": 60,  "capacity": 480 },
      { "level": 2, "cost": 300,  "buildSec": 60,   "req": { "townhall": 2 }, "ratePerHour": 120, "capacity": 960 },
      { "level": 3, "cost": 900,  "buildSec": 300,  "req": { "townhall": 2 }, "ratePerHour": 200, "capacity": 1600 },
      { "level": 4, "cost": 2500, "buildSec": 1200, "req": { "townhall": 4 }, "ratePerHour": 320, "capacity": 2560 },
      { "level": 5, "cost": 6000, "buildSec": 3600, "req": { "townhall": 5 }, "ratePerHour": 480, "capacity": 3840 }
    ]
  },
  "training": {
    "goldPerExp": 0.3,
    "durationsMin": [30, 120, 480],
    "levels": [
      { "level": 1, "cost": 0,    "buildSec": 0,    "req": { "townhall": 1 }, "slots": 1, "expPerMin": 12 },
      { "level": 2, "cost": 400,  "buildSec": 60,   "req": { "townhall": 2 }, "slots": 1, "expPerMin": 18 },
      { "level": 3, "cost": 1200, "buildSec": 300,  "req": { "townhall": 3 }, "slots": 2, "expPerMin": 26 },
      { "level": 4, "cost": 3500, "buildSec": 1200, "req": { "townhall": 4 }, "slots": 2, "expPerMin": 36 },
      { "level": 5, "cost": 8000, "buildSec": 3600, "req": { "townhall": 5 }, "slots": 3, "expPerMin": 50 }
    ]
  }
}
```

---

## 3. Die 10 Starter-Monster

### 3.1 Werte-Grundlagen

- Die Basiswerte gelten für **Level 1**, noch ohne Seltenheits-Multiplikator.
- **Finaler Wert** (ganzzahlig, wird beim Laden/Level-up berechnet):
  ```
  stat = floor( base × rarityMult[rarity] × (1 + 0,08 × (level − 1)) )
  ```
  SPD ist eine Ausnahme: `spd = floor( baseSpd × (1 + 0,02 × rarityIndex) × (1 + 0,01 × (level − 1)) )` mit rarityIndex = 0 (Gewöhnlich) … 9 (Ursprung). **[ANNAHME]** SPD skaliert bewusst flach. Sonst würde nur noch die Seltenheit die Zugreihenfolge bestimmen.
- **Basis-Seltenheit** = Seltenheit, mit der das Monster aus dem Gacha kommt. Per Aufwertung (Kap. 5.3) kann es bis Ursprung steigen.
- **Rolle** = bevorzugte Reihe. Steht das Monster in seiner bevorzugten Reihe, bekommt es **+10 % ATK und +10 % DEF** (Positionsbonus, Kap. 7.2). **[ANNAHME]**
- Jedes Monster hat **1 aktive Fähigkeit** mit Abklingzeit (CD, in eigenen Zügen) und **Basisangriff** = 100 % ATK auf das Standardziel. Die Legende hat zusätzlich 1 Passive.
- Krit-Chance für alle 10 %, Krit-Schaden ×1,5 (Kap. 7.6). Fähigkeiten können das ändern.

### 3.2 Monster-Tabelle

| ID | Name | Typ | Basis-Seltenheit | HP | ATK | DEF | SPD | Rolle | Fähigkeit (CD / Start-CD) |
|---|---|---|---|---|---|---|---|---|---|
| m01 | **Funkfuchs** | Feuer | Gewöhnlich | 110 | 28 | 10 | 108 | Hinten | **Glutstoß** (3/2): 150 % ATK auf Standardziel, 40 % Chance auf *Verbrennung* (2 Runden) |
| m02 | **Tropfmolch** | Wasser | Gewöhnlich | 160 | 18 | 18 | 92 | Front | **Wasserschild** (4/2): *Schild* = 15 % eigene Max-HP auf sich selbst **und** auf den Verbündeten mit dem niedrigsten HP-% (2 Runden) |
| m03 | **Knospling** | Pflanze | Gewöhnlich | 120 | 20 | 12 | 100 | Hinten | **Photosynthese** (3/2): heilt den Verbündeten mit dem niedrigsten HP-% um 150 % ATK |
| m04 | **Lehmbrocken** | Erde | Gewöhnlich | 180 | 16 | 22 | 80 | Front | **Lehmwall** (4/1): *Spott* 2 Runden + eigene DEF +30 % (2 Runden) |
| m05 | **Aschewiesel** | Feuer | Ungewöhnlich | 150 | 26 | 14 | 112 | Front | **Flammenwirbel** (3/2): 90 % ATK auf **alle Gegner der Frontreihe** (ist sie leer: auf alle der Hinterreihe) |
| m06 | **Moospanzer** | Pflanze | Ungewöhnlich | 190 | 17 | 20 | 76 | Front | **Dornenpanzer** (4/1): 2 Runden *Dornen*: Angreifer erleiden 30 % des Schadens, den sie diesem Monster zufügen |
| m07 | **Strudelotter** | Wasser | Selten | 130 | 30 | 12 | 110 | Hinten | **Gezeitenschlag** (3/2): 140 % ATK auf den Gegner der **Hinterreihe** mit den niedrigsten HP (ignoriert die Reihenregel; ist die Hinterreihe leer: Standardziel) |
| m08 | **Sandviper** | Erde | Selten | 135 | 29 | 13 | 106 | Hinten | **Treibsand** (4/2): 110 % ATK auf Standardziel, 40 % Chance auf *Betäubung* (1 Zug) |
| m09 | **Dornendryade** | Pflanze | Episch | 140 | 30 | 14 | 104 | Hinten | **Wurzelgeflecht** (4/3): 70 % ATK auf **alle Gegner** + *DEF −20 %* (2 Runden) |
| m10 | **Sonnenphönix** | Feuer | Legendär | 170 | 36 | 16 | 118 | Hinten | **Sonnenfeuer** (4/3): 100 % ATK auf **alle Gegner**, 50 % Chance auf *Verbrennung* je Ziel (2 Runden). **Passiv – Wiedergeburt:** Beim ersten K.O. pro Kampf belebt er sich am Ende der Aktion, die ihn besiegt hat, mit 40 % Max-HP wieder (Statuseffekte werden entfernt). |

Typverteilung: Feuer 3 · Pflanze 3 · Wasser 2 · Erde 2. Jeder Typ hat mindestens 1 Front- und 1 Hinten-Monster. Rollen: 4 Front / 6 Hinten (passt zu 2 Front- + 3 Hinten-Plätzen).
Alle Namen, Fähigkeiten und Werte sind **[ANNAHME]**, weil das Konzept keine Monster nennt.

**Plausibilitätscheck (Lv. 1, Gewöhnlich):** Funkfuchs-Basisangriff gegen Lehmbrocken ≈ 1,5 × 28² / (28 + 22) × 0,75 (Feuer→Erde) ≈ 17 Schaden → Lehmbrocken (180 HP) hält ca. 10 Treffer. Ein ausgeglichener 5-gegen-5-Kampf dauert damit etwa 6–10 Runden, das Rundenlimit liegt bei 20.

### 3.3 Statuseffekte (vollständige Liste für den Prototyp)

| Effekt-ID | Name | Wirkung | Dauer zählt herunter | Stapeln |
|---|---|---|---|---|
| `burn` | Verbrennung | Zu Beginn des eigenen Zuges: Schaden = 30 % der ATK des Verursachers (Wert beim Auftragen). Ignoriert DEF und Typ, kann nicht kritisch treffen. | am Ende des eigenen Zuges | nein, erneutes Auftragen setzt die Dauer neu |
| `stun` | Betäubung | Der nächste eigene Zug entfällt. | wird beim übersprungenen Zug verbraucht | nein |
| `shield` | Schild | Fängt Schaden ab, bevor HP sinken. | am Ende des eigenen Zuges | nein, der höhere Wert gilt |
| `taunt` | Spott | Gegnerische Basisangriffe **und** Einzelziel-Fähigkeiten müssen dieses Monster wählen (geht vor der Reihenregel). | am Ende des eigenen Zuges | – |
| `def_up` / `def_down` | DEF ±X % | DEF × (1 ± X) | am Ende des eigenen Zuges | gleiche ID: nein (neu setzen); Auf/Ab verrechnen sich additiv |
| `thorns` | Dornen | Reflektiert X % des erlittenen Schadens (nach Schild) als fixen Schaden an den Angreifer. Der Rückschaden kann den Angreifer K.O. setzen, löst aber keine Dornen aus. | am Ende des eigenen Zuges | nein |

### 3.4 Datenstruktur (`/data/monsters.json` + TS-Typen)

```ts
type TypeId = 'fire'|'water'|'plant'|'earth'|'wind'|'ice'|'lightning'|'poison'|'metal'|'stone'
            |'light'|'shadow'|'ghost'|'dragon'|'insect'|'beast'|'fighting'|'psychic'|'sound'|'crystal';
type Rarity = 0|1|2|3|4|5|6|7|8|9;          // 0 = Gewöhnlich … 9 = Ursprung
type Row = 'front'|'back';

interface SkillDef {
  id: string;
  cooldown: number;          // CD nach Einsatz
  initialCooldown: number;   // CD zu Kampfbeginn
  target: 'default'|'enemy_front_all'|'enemy_back_lowest_hp'|'enemy_all'|'ally_lowest_hp_pct'|'self'|'self_and_ally_lowest_hp_pct';
  effects: SkillEffect[];
}
type SkillEffect =
  | { kind: 'damage'; atkMult: number }
  | { kind: 'heal'; atkMult: number }
  | { kind: 'shield'; maxHpPctOfCaster: number; duration: number }
  | { kind: 'status'; status: 'burn'|'stun'|'taunt'|'def_up'|'def_down'|'thorns'; chance: number; duration: number; value?: number };

interface MonsterSpecies {
  id: string; name: string; type: TypeId; baseRarity: Rarity; role: Row;
  base: { hp: number; atk: number; def: number; spd: number };
  skill: SkillDef; passive?: { id: 'rebirth'; hpPct: number; usesPerBattle: number };
  sprite: string;
}

interface MonsterInstance {
  uid: string;            // z. B. crypto.randomUUID()
  speciesId: string;
  rarity: Rarity;         // aktuelle Seltenheit (≥ baseRarity)
  level: number;
  exp: number;            // EP innerhalb des aktuellen Levels
  locked: boolean;        // Schutz vor Freilassen
  obtainedAt: number;
}
```

```json
[
  { "id": "m01", "name": "Funkfuchs", "type": "fire", "baseRarity": 0, "role": "back",
    "base": { "hp": 110, "atk": 28, "def": 10, "spd": 108 },
    "skill": { "id": "ember_strike", "cooldown": 3, "initialCooldown": 2, "target": "default",
      "effects": [ { "kind": "damage", "atkMult": 1.5 },
                   { "kind": "status", "status": "burn", "chance": 0.4, "duration": 2, "value": 0.3 } ] } },
  { "id": "m04", "name": "Lehmbrocken", "type": "earth", "baseRarity": 0, "role": "front",
    "base": { "hp": 180, "atk": 16, "def": 22, "spd": 80 },
    "skill": { "id": "clay_wall", "cooldown": 4, "initialCooldown": 1, "target": "self",
      "effects": [ { "kind": "status", "status": "taunt", "chance": 1, "duration": 2 },
                   { "kind": "status", "status": "def_up", "chance": 1, "duration": 2, "value": 0.3 } ] } },
  { "id": "m10", "name": "Sonnenphönix", "type": "fire", "baseRarity": 5, "role": "back",
    "base": { "hp": 170, "atk": 36, "def": 16, "spd": 118 },
    "skill": { "id": "sunfire", "cooldown": 4, "initialCooldown": 3, "target": "enemy_all",
      "effects": [ { "kind": "damage", "atkMult": 1.0 },
                   { "kind": "status", "status": "burn", "chance": 0.5, "duration": 2, "value": 0.3 } ] },
    "passive": { "id": "rebirth", "hpPct": 0.4, "usesPerBattle": 1 } }
]
```
(Die übrigen 7 Einträge analog nach Tabelle 3.2.)

### 3.5 Level & Erfahrung **[ANNAHME]**

```
expToNext(L) = round(20 × L^1,5)        // EP von Level L auf L+1
```

| Von Lv. → nach | 1→2 | 5→6 | 10→11 | 20→21 | 30→31 | 40→41 | 50→51 | 69→70 |
|---|---|---|---|---|---|---|---|---|
| EP | 20 | 224 | 632 | 1.789 | 3.286 | 5.060 | 7.071 | 11.463 |

Gesamt-EP bis Lv. 10: 2.222 · bis Lv. 20: 13.427 · bis Lv. 30: 37.806.
Max-Level hängt von der Seltenheit ab (Kap. 5). Leveln kostet nur EP, kein Gold. Bei Max-Level werden weitere EP nicht gespeichert, Kampf-EP verfallen.

---

## 4. Typen & Effektivitätsmatrix

### 4.1 Regeln

- Jedes Monster hat **genau 1 Typ** (Doppeltypen frühestens in der Beta). **[ANNAHME]**
- Der Multiplikator hängt vom **Typ des Angreifers** (bei Fähigkeiten: Typ des Monsters) und vom **Typ des Verteidigers** ab:
  - **×1,5**, wenn der Angreifer **stark gegen** den Verteidiger ist,
  - **×0,75**, wenn der Verteidiger stark gegen den Angreifer ist (Umkehrung),
  - **×1,0** sonst.
  - Sonderfälle: **Licht ↔ Schatten** sind gegenseitig stark (beide ×1,5). **Drache → Drache** ×1,5.
- Im Konzept steht „je 2–3 Stärken/Schwächen“. Umgesetzt heißt das: Jeder Typ ist gegen 2–3 Typen stark und erleidet von 2–3 Typen erhöhten Schaden.
- Verbrennung, Dornen und Heilung sind **typlos**.

### 4.2 Prototyp-Typen: Feuer, Wasser, Pflanze, Erde (aktiv)

Unter den 4 aktiven Typen gibt es einen geschlossenen **Kreis**, in dem jeder Typ genau 1 Stärke und 1 Schwäche hat:

```
Feuer ──► Pflanze ──► Wasser ──► Erde ──► Feuer
```
(Feuer verbrennt Pflanze, Pflanze trinkt Wasser, Wasser spült Erde fort, Erde erstickt Feuer.)
Die „Diagonalen“ **Feuer↔Wasser** und **Pflanze↔Erde** sind **neutral (×1,0)**. **[ANNAHME]** Damit sind die 4 Typen im Prototyp gleich stark. Das widerspricht zwar der Erwartung „Wasser schlägt Feuer“, ist aber bewusst so balanciert. Soll Wasser→Feuer ×1,5 sein, muss man Erde→Wasser ergänzen, damit es fair bleibt.

### 4.3 Alle 20 Typen

| # | Typ | Kürzel | Stark gegen (×1,5) | Schwach gegen / erleidet ×1,5 von | Prototyp |
|---|---|---|---|---|---|
| 1 | Feuer | Fe | Pflanze, Eis, Insekt | Erde, Stein | **aktiv** |
| 2 | Wasser | Wa | Erde, Stein | Pflanze, Blitz | **aktiv** |
| 3 | Pflanze | Pf | Wasser, Licht | Feuer, Wind, Gift | **aktiv** |
| 4 | Erde | Er | Feuer, Blitz, Gift | Wasser, Kristall | **aktiv** |
| 5 | Wind | Wi | Pflanze, Insekt, Kampf | Eis, Blitz, Stein | gesperrt |
| 6 | Eis | Ei | Wind, Drache, Bestie | Feuer, Metall, Stein | gesperrt |
| 7 | Blitz | Bl | Wasser, Wind, Metall | Erde, Kristall | gesperrt |
| 8 | Gift | Gi | Pflanze, Bestie, Kristall | Erde, Insekt, Psycho | gesperrt |
| 9 | Metall | Me | Eis, Stein, Kristall | Blitz, Kampf, Klang | gesperrt |
| 10 | Stein | St | Feuer, Wind, Eis | Wasser, Metall, Kampf | gesperrt |
| 11 | Licht | Li | Schatten, Geist, Drache | Pflanze, Schatten, Kristall | gesperrt |
| 12 | Schatten | Sc | Psycho, Geist, Licht | Licht, Insekt | gesperrt |
| 13 | Geist | Ge | Psycho, Klang | Licht, Schatten | gesperrt |
| 14 | Drache | Dr | Drache, Klang | Eis, Licht, Drache | gesperrt |
| 15 | Insekt | In | Psycho, Schatten, Gift | Feuer, Wind, Bestie | gesperrt |
| 16 | Bestie | Be | Insekt, Klang | Eis, Gift, Kampf | gesperrt |
| 17 | Kampf | Ka | Stein, Metall, Bestie | Wind, Psycho | gesperrt |
| 18 | Psycho | Ps | Kampf, Gift | Schatten, Geist, Insekt | gesperrt |
| 19 | Klang | Kl | Kristall, Metall | Geist, Drache, Bestie | gesperrt |
| 20 | Kristall | Kr | Licht, Blitz, Erde | Gift, Metall, Klang | gesperrt |

„Gesperrt“ heißt: Der Typ ist in Daten und Matrix definiert, aber es gibt noch keine Monster dazu. Er wird in späteren Updates über `config.activeTypes` freigeschaltet.

### 4.4 Effektivitätsmatrix (Zeile = Angreifer, Spalte = Verteidiger; · = 1,0)

Kürzel: Fe Feuer · Wa Wasser · Pf Pflanze · Er Erde · Wi Wind · Ei Eis · Bl Blitz · Gi Gift · Me Metall · St Stein · Li Licht · Sc Schatten · Ge Geist · Dr Drache · In Insekt · Be Bestie · Ka Kampf · Ps Psycho · Kl Klang · Kr Kristall. **Aktiv im Prototyp: Fe, Wa, Pf, Er.**

| Ang.\Vert. | Fe | Wa | Pf | Er | Wi | Ei | Bl | Gi | Me | St | Li | Sc | Ge | Dr | In | Be | Ka | Ps | Kl | Kr |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Fe** Feuer | · | · | **1,5** | 0,75 | · | **1,5** | · | · | · | 0,75 | · | · | · | · | **1,5** | · | · | · | · | · |
| **Wa** Wasser | · | · | 0,75 | **1,5** | · | · | 0,75 | · | · | **1,5** | · | · | · | · | · | · | · | · | · | · |
| **Pf** Pflanze | 0,75 | **1,5** | · | · | 0,75 | · | · | 0,75 | · | · | **1,5** | · | · | · | · | · | · | · | · | · |
| **Er** Erde | **1,5** | 0,75 | · | · | · | · | **1,5** | **1,5** | · | · | · | · | · | · | · | · | · | · | · | 0,75 |
| **Wi** Wind | · | · | **1,5** | · | · | 0,75 | 0,75 | · | · | 0,75 | · | · | · | · | **1,5** | · | **1,5** | · | · | · |
| **Ei** Eis | 0,75 | · | · | · | **1,5** | · | · | · | 0,75 | 0,75 | · | · | · | **1,5** | · | **1,5** | · | · | · | · |
| **Bl** Blitz | · | **1,5** | · | 0,75 | **1,5** | · | · | · | **1,5** | · | · | · | · | · | · | · | · | · | · | 0,75 |
| **Gi** Gift | · | · | **1,5** | 0,75 | · | · | · | · | · | · | · | · | · | · | 0,75 | **1,5** | · | 0,75 | · | **1,5** |
| **Me** Metall | · | · | · | · | · | **1,5** | 0,75 | · | · | **1,5** | · | · | · | · | · | · | 0,75 | · | 0,75 | **1,5** |
| **St** Stein | **1,5** | 0,75 | · | · | **1,5** | **1,5** | · | · | 0,75 | · | · | · | · | · | · | · | 0,75 | · | · | · |
| **Li** Licht | · | · | 0,75 | · | · | · | · | · | · | · | · | **1,5** | **1,5** | **1,5** | · | · | · | · | · | 0,75 |
| **Sc** Schatten | · | · | · | · | · | · | · | · | · | · | **1,5** | · | **1,5** | · | 0,75 | · | · | **1,5** | · | · |
| **Ge** Geist | · | · | · | · | · | · | · | · | · | · | 0,75 | 0,75 | · | · | · | · | · | **1,5** | **1,5** | · |
| **Dr** Drache | · | · | · | · | · | 0,75 | · | · | · | · | 0,75 | · | · | **1,5** | · | · | · | · | **1,5** | · |
| **In** Insekt | 0,75 | · | · | · | 0,75 | · | · | **1,5** | · | · | · | **1,5** | · | · | · | 0,75 | · | **1,5** | · | · |
| **Be** Bestie | · | · | · | · | · | 0,75 | · | 0,75 | · | · | · | · | · | · | **1,5** | · | 0,75 | · | **1,5** | · |
| **Ka** Kampf | · | · | · | · | 0,75 | · | · | · | **1,5** | **1,5** | · | · | · | · | · | **1,5** | · | 0,75 | · | · |
| **Ps** Psycho | · | · | · | · | · | · | · | **1,5** | · | · | · | 0,75 | 0,75 | · | 0,75 | · | **1,5** | · | · | · |
| **Kl** Klang | · | · | · | · | · | · | · | · | **1,5** | · | · | · | 0,75 | 0,75 | · | 0,75 | · | · | · | **1,5** |
| **Kr** Kristall | · | · | · | **1,5** | · | · | **1,5** | 0,75 | 0,75 | · | **1,5** | · | · | · | · | · | · | · | 0,75 | · |

### 4.5 Datenstruktur (`/data/types.json`) – Matrix wird beim Laden erzeugt

```json
{
  "activeTypes": ["fire", "water", "plant", "earth"],
  "multipliers": { "strong": 1.5, "weak": 0.75, "neutral": 1.0 },
  "mutualStrong": [["light", "shadow"]],
  "strongAgainst": {
    "fire": ["plant", "ice", "insect"],      "water": ["earth", "stone"],
    "plant": ["water", "light"],             "earth": ["fire", "lightning", "poison"],
    "wind": ["plant", "insect", "fighting"], "ice": ["wind", "dragon", "beast"],
    "lightning": ["water", "wind", "metal"], "poison": ["plant", "beast", "crystal"],
    "metal": ["ice", "stone", "crystal"],    "stone": ["fire", "wind", "ice"],
    "light": ["shadow", "ghost", "dragon"],  "shadow": ["psychic", "ghost", "light"],
    "ghost": ["psychic", "sound"],           "dragon": ["dragon", "sound"],
    "insect": ["psychic", "shadow", "poison"], "beast": ["insect", "sound"],
    "fighting": ["stone", "metal", "beast"], "psychic": ["fighting", "poison"],
    "sound": ["crystal", "metal"],           "crystal": ["light", "lightning", "earth"]
  }
}
```

```ts
function typeMult(att: TypeId, def: TypeId, cfg: TypesCfg): number {
  if (cfg.strongAgainst[att].includes(def)) return cfg.multipliers.strong;      // inkl. Licht↔Schatten, Drache→Drache
  if (att !== def && cfg.strongAgainst[def].includes(att)) return cfg.multipliers.weak;
  return cfg.multipliers.neutral;
}
```
(Licht↔Schatten ergibt sich hier automatisch, weil beide den jeweils anderen in `strongAgainst` haben. Die erste Bedingung greift vor der zweiten.)

---

## 5. Seltenheitsstufen

### 5.1 Tabelle

| Index | Stufe | Werte-Multiplikator (HP/ATK/DEF) | SPD-Faktor | Max-Level | Rahmenfarbe | Essenz beim Freilassen |
|---|---|---|---|---|---|---|
| 0 | Gewöhnlich | ×1,00 | ×1,00 | 20 | Grau `#9e9e9e` | 5 |
| 1 | Ungewöhnlich | ×1,15 | ×1,02 | 25 | Grün `#4caf50` | 10 |
| 2 | Selten | ×1,30 | ×1,04 | 30 | Blau `#2196f3` | 25 |
| 3 | Episch | ×1,50 | ×1,06 | 35 | Lila `#9c27b0` | 60 |
| 4 | Heroisch | ×1,75 | ×1,08 | 40 | Orange `#ff9800` | 150 |
| 5 | Legendär | ×2,05 | ×1,10 | 45 | Gold `#ffc107` | 400 |
| 6 | Mythisch | ×2,40 | ×1,12 | 50 | Rot `#f44336` | 1.000 |
| 7 | Göttlich | ×2,80 | ×1,14 | 55 | Weiß/Gold `#fff4c2` | 2.500 |
| 8 | Kosmisch | ×3,25 | ×1,16 | 60 | Türkis-Verlauf `#00bcd4` | 6.000 |
| 9 | Ursprung | ×3,75 | ×1,18 | 70 | Regenbogen (Shader/animiert) | 15.000 |

Alle Werte **[ANNAHME]**. Die Namen der 10 Stufen stehen im Konzept. Die Multiplikatoren steigen von Stufe zu Stufe um etwa 15–17 %. Ein Ursprung-Monster hat damit das 3,75-Fache der Werte eines gleichstufigen Gewöhnlichen, plus mehr Level.

### 5.2 Gacha-Ergebnis und Basis-Seltenheit

Die Seltenheit wird **pro Instanz** gespeichert. Ablauf einer Ziehung:
1. Seltenheit **R** würfeln (Kap. 6).
2. Pool = alle Spezies mit `baseRarity == R`. Gleichverteilt ziehen.
3. Ist der Pool leer (im Prototyp bei Heroisch und ab Mythisch): Man nimmt die Spezies mit der **höchsten baseRarity < R** und vergibt die Instanz mit Seltenheit R („aufgewertet erhalten“, mit Hinweis-Label im UI). **[ANNAHME]**
   - Beispiel: Heroisch gewürfelt → Dornendryade (Episch) mit Seltenheit Heroisch. Mythisch gewürfelt → Sonnenphönix mit Seltenheit Mythisch.

### 5.3 Aufwertung (ab Rathaus 3) – zweiter Weg zu den Top-Stufen

Bedingung: Das Monster hat **Max-Level** seiner aktuellen Seltenheit. Danach steigt `rarity + 1`, das Level bleibt gleich, das Max-Level steigt.

| Von → nach | Essenz | Gold |
|---|---|---|
| Gewöhnlich → Ungewöhnlich | 50 | 500 |
| Ungewöhnlich → Selten | 120 | 1.200 |
| Selten → Episch | 300 | 3.000 |
| Episch → Heroisch | 700 | 7.000 |
| Heroisch → Legendär | 1.500 | 15.000 |
| Legendär → Mythisch | 3.500 | 35.000 |
| Mythisch → Göttlich | 8.000 | 80.000 |
| Göttlich → Kosmisch | 18.000 | 180.000 |
| Kosmisch → Ursprung | 40.000 | 400.000 |

Formel: `gold = essenz × 10`. **[ANNAHME]**
Essenz bekommt man nur durch **Freilassen** von Monstern (Tabelle 5.1, Spalte Essenz) und aus Belohnungen (Kap. 8). Gesperrte (`locked`) Monster und das letzte Monster im Team können nicht freigelassen werden. Monster-Lager: **60 Plätze** im Prototyp. **[ANNAHME]**
Später kommt die **Zucht** als dritter Weg dazu (Konzept: „Top-Stufen auch über Zucht/Aufwertung“). Im Prototyp ist sie nur ein Platzhalter.

---

## 6. Gacha (Beschwörungsportal)

### 6.1 Kosten **[ANNAHME]**

| Ziehung | Kosten | Besonderheit |
|---|---|---|
| Einzel | 100 Juwelen oder 1 Beschwörungsticket | – |
| 10er | 900 Juwelen (10 % Rabatt) oder 10 Tickets | **garantiert ≥ 1× Selten oder besser** |
| Gratis per Werbung | 1 Rewarded Ad (1×/Tag) | normale Einzelziehung, zählt zur Pity |

Bezahlt wird nur mit Spielwährung. Es gibt keinen Echtgeld-Kauf (Konzept).

### 6.2 Basisraten (müssen im Portal-Info-Fenster exakt so angezeigt werden)

| Seltenheit | Basisrate | kumulativ (ab dieser Stufe aufwärts) |
|---|---|---|
| Gewöhnlich | 50,000 % | 100,000 % |
| Ungewöhnlich | 28,000 % | 50,000 % |
| Selten | 14,000 % | 22,000 % |
| Episch | 5,500 % | 8,000 % |
| Heroisch | 1,800 % | 2,500 % |
| Legendär | 0,550 % | 0,700 % |
| Mythisch | 0,120 % | 0,150 % |
| Göttlich | 0,025 % | 0,030 % |
| Kosmisch | 0,004 % | 0,005 % |
| Ursprung | 0,001 % | 0,001 % |
| **Summe** | **100,000 %** | |

Gruppen für die Pity:
- **„Legendär+“** = Legendär … Ursprung, Basis zusammen **0,70 %**.
- **„Episch+“** = Episch + Heroisch, Basis 7,30 %.

### 6.3 Pity-Regeln

Es gibt zwei Zähler, die im Speicherstand liegen und **dauerhaft** sind (auch über Sitzungen hinweg, nie heimlich zurückgesetzt):

| Zähler | Soft-Pity | Hard-Pity | Zurückgesetzt bei |
|---|---|---|---|
| `pityLeg` (Legendär+) | ab Ziehung **60**: +3,0 Prozentpunkte pro Ziehung (60. Ziehung = 3,7 %, 70. = 33,7 %, 89. = 90,7 %) | Ziehung **90** = 100 % | jedem Legendär+ |
| `pityEpic` (Episch+) | ab Ziehung **15**: +8,0 Prozentpunkte pro Ziehung | Ziehung **20** = 100 % | jedem Episch+ **oder** Legendär+ |

Die Zähler zählen **inklusive** der aktuellen Ziehung (1., 2., …).

Formeln (`n` = Stand des Zählers nach dem Hochzählen):
```
pLeg(n)  = n >= 90 ? 1 : 0.007  + max(0, n - 59) * 0.03
pEpic(n) = n >= 20 ? 1 : 0.0735 + max(0, n - 14) * 0.08    // bedingte Rate im Nicht-Legendär-Zweig (7,3 / 99,3)
```

Algorithmus einer Einzelziehung:
```ts
function rollRarity(s: GachaState, rng: () => number, forceRarePlus = false): Rarity {
  s.pityLeg++; s.pityEpic++;
  if (rng() < pLeg(s.pityLeg)) {                       // Legendär+
    s.pityLeg = 0; s.pityEpic = 0;
    return weighted(rng, { 5: 0.55, 6: 0.12, 7: 0.025, 8: 0.004, 9: 0.001 }); // renormalisiert auf 0,70
  }
  if (rng() < pEpic(s.pityEpic)) {                     // Episch+
    s.pityEpic = 0;
    return weighted(rng, { 3: 5.5, 4: 1.8 });
  }
  if (forceRarePlus) return 2;                         // 10er-Garantie greift
  return weighted(rng, { 0: 50, 1: 28, 2: 14 });
}
```
**10er-Ziehung:** 10 Einzelziehungen nacheinander, jede mit Pity. War nach 9 Ziehungen noch kein Ergebnis ≥ Selten dabei, läuft die 10. mit `forceRarePlus = true`. Wird dabei Legendär+ oder Episch+ gewürfelt, gilt normal dieses Ergebnis. Die Ergebnisanzeige ist nach Seltenheit sortiert, mit der höchsten zuletzt (Spannung).

**Effektive Raten inkl. Pity** (Simulation, 2 Mio. Ziehungen; so auch im Info-Fenster angeben):
- Legendär+: **≈ 1,88 %** effektiv, im Schnitt **alle ≈ 53 Ziehungen**, Median 63, 90 % aller Spieler spätestens nach 69 Ziehungen.
- Episch+ (inkl. Legendär+): **≈ 11,1 %** effektiv.

Transparenz-Pflicht (Konzept): Im Portal stehen immer beide Zähler sichtbar („Legendär garantiert in **X** Ziehungen“), dazu ein Info-Button mit Tabelle 6.2, den Pity-Regeln und den effektiven Raten.

### 6.4 Datenstruktur

```json
{
  "costs": { "single": 100, "multi10": 900 },
  "rates": [50, 28, 14, 5.5, 1.8, 0.55, 0.12, 0.025, 0.004, 0.001],
  "pity": {
    "legendaryPlus": { "fromRarity": 5, "softStart": 60, "softStep": 0.03, "hard": 90 },
    "epicPlus":      { "fromRarity": 3, "softStart": 15, "softStep": 0.08, "hard": 20, "baseConditional": 0.0735 }
  },
  "multiGuaranteeMinRarity": 2,
  "tutorialMulti": { "free": true, "guaranteeMinRarity": 3 }
}
```
```ts
interface GachaState { pityLeg: number; pityEpic: number; totalPulls: number; history: { t: number; speciesId: string; rarity: Rarity }[] /* letzte 100 */ }
```

---

## 7. Auto-Kampf-Regeln

### 7.1 Aufstellung

- Pro Seite **5 Plätze**: Frontreihe **F1, F2**, Hinterreihe **H1, H2, H3**. **[ANNAHME: 2 Front / 3 Hinten]**
- Freischaltung: Rathaus 1 → F1, F2, H1 · Rathaus 2 → +H2 · Rathaus 3 → +H3.
- Jedes Monster darf nur 1× im Team stehen. Mindestens 1 Monster muss aufgestellt sein. Leere Plätze sind erlaubt.
- Spurindex (für Zielwahl und Darstellung): F1 = Spur 1, F2 = Spur 2, H1 = Spur 1, H2 = Spur 2, H3 = Spur 3.

### 7.2 Kampfwerte beim Kampfstart

```
hp/atk/def/spd = Instanzwerte (Kap. 3.1)
× Positionsbonus:   1,10 auf ATK und DEF, wenn Monster.role == Reihe des Platzes
× Synergie-Bonus:   siehe 7.9 (ab Rathaus 2)
currentHp = maxHp
skillCd   = skill.initialCooldown
```
Buffs und Debuffs wirken während des Kampfes multiplikativ auf diese Werte: `atkEff = atk × (1 + Σatk_mods)`, `defEff = def × (1 + Σdef_mods)`. Die Summe der Mods ist auf −0,5 … +1,0 begrenzt.

### 7.3 Zugreihenfolge

- Der Kampf läuft in **Runden**. Zu Beginn jeder Runde werden alle lebenden Monster beider Seiten nach **`spdEff` absteigend** sortiert.
- Gleichstand: höhere Basis-SPD der Spezies → danach **Spielerseite zuerst** → danach kleinerer Spurindex, Front vor Hinten. (Kein Zufall, damit die Reihenfolge vorhersehbar ist.) **[ANNAHME]**
- Ein Monster, das vor seinem Zug K.O. geht, verliert den Zug. Ein wiederbelebtes Monster (Phönix) handelt erst wieder in der nächsten Runde.
- Ändert sich SPD während einer Runde, wirkt das erst ab der nächsten Runde.

### 7.4 Ablauf eines Zuges

```
1. Start des Zuges: burn-Schaden anwenden (kann K.O. setzen → Zug endet).
2. stun aktiv?  → stun entfernen, Zug endet (Schritt 5 trotzdem ausführen).
3. skillCd == 0 UND gültiges Ziel vorhanden?
      → Fähigkeit einsetzen, skillCd = skill.cooldown
   sonst → Basisangriff (100 % ATK auf Standardziel), skillCd = max(0, skillCd − 1)
4. K.O.-Prüfung nach jedem Treffer (inkl. Dornen-Rückschaden), Passive „rebirth“ prüfen.
5. Ende des Zuges: Dauer aller Statuseffekte dieses Monsters −1; Effekte mit 0 entfernen.
6. Siegprüfung (7.7).
```
„Gültiges Ziel“: Eine Heilung braucht einen verletzten Verbündeten (HP < 100 %), sonst wird die Fähigkeit aufgehoben und es gibt einen Basisangriff. Ein Schild oder Spott ist immer gültig.
Bei CD 3 und Start-CD 2 sieht das so aus: Zug 1 Basis, Zug 2 Basis, Zug 3 Fähigkeit, Zug 4–6 Basis, Zug 7 Fähigkeit …

### 7.5 Zielwahl (Standardziel)

In dieser Reihenfolge:
1. Hat ein Gegner **Spott** → dieser Gegner. Bei mehreren: der mit den niedrigsten aktuellen HP.
2. Lebt mindestens ein Gegner in der **Frontreihe** → Ziel ist die Frontreihe, sonst die **Hinterreihe**.
3. Innerhalb der Zielreihe:
   - Angreifer mit Rolle **Front** (Nahkampf): der Gegner auf der **gleichen Spur**. Lebt der nicht: der Gegner mit den niedrigsten aktuellen HP.
   - Angreifer mit Rolle **Hinten** (Fernkampf): der Gegner mit den **niedrigsten aktuellen HP** (Fokusfeuer).
   - Gleichstand: kleinerer Spurindex.

Die Rolle bestimmt das Zielverhalten **und** den Positionsbonus. Ein Front-Monster in der Hinterreihe zielt also weiter nach Spur, bekommt aber keinen Bonus. **[ANNAHME]**
Flächenfähigkeiten (`enemy_all`, `enemy_front_all`) treffen alle betroffenen Ziele mit eigenem Krit- und Varianzwurf. Spott wird bei Flächenfähigkeiten ignoriert.

### 7.6 Schadensformel

```
atk  = atkEff(Angreifer)
def  = defEff(Verteidiger)
base = DMG_SCALE × atk × atk / (atk + def)            // DMG_SCALE = 1,5
dmg  = base × skillMult × typeMult × critMult × variance
dmg  = max(1, floor(dmg))
```
| Größe | Wert |
|---|---|
| `DMG_SCALE` | 1,5 (globaler Stellknopf für die Kampflänge) |
| `skillMult` | 1,0 Basisangriff; sonst `atkMult` der Fähigkeit |
| `typeMult` | 1,5 / 1,0 / 0,75 (Kap. 4) |
| `critMult` | 1,5 bei Krit, sonst 1,0. Krit-Chance 10 % (`rng() < 0.10`) |
| `variance` | gleichverteilt **0,90 … 1,10**: `0.9 + 0.2 × rng()` |

Die Formel `atk² / (atk + def)` hängt nur vom Verhältnis ATK:DEF ab. Dadurch bleibt sie über alle 10 Seltenheiten und 70 Level stabil (keine DEF-Wand, kein One-Shot allein durch Level). **[ANNAHME]**

**Auf den Verteidiger anwenden:** zuerst den Schild abziehen (`absorbed = min(shield, dmg)`), den Rest von den HP. Danach Dornen (`floor(Rest × thorns)`, typlos, ohne Krit und Varianz).
**Heilung:** `heal = floor(atkEff(Heiler) × atkMult)`, ohne Krit und Varianz, höchstens bis maxHp.
**Schild:** `floor(maxHp(Wirker) × pct)`.
**Statuschance:** eigener Wurf `rng() < chance` pro Ziel, nur wenn der Treffer Schaden > 0 gemacht hat.

**Rechenbeispiel:** Funkfuchs (Gewöhnlich, Lv. 5, Hinterreihe) greift Lehmbrocken (Gewöhnlich, Lv. 5, Frontreihe) an.
- Funkfuchs ATK = floor(28 × 1,0 × 1,32) = 36 → mit Positionsbonus 39,6.
- Lehmbrocken DEF = floor(22 × 1,32) = 29 → mit Positionsbonus 31,9.
- base = 1,5 × 39,6² / (39,6 + 31,9) = 32,9.
- Feuer → Erde ×0,75 = 24,7 · kein Krit · Varianz 0,95 → **23 Schaden**.

### 7.7 Sieg, Niederlage, Rundenlimit

- **Sieg:** Alle Gegner sind K.O. (geprüft nach jeder Aktion).
- **Niederlage:** Alle eigenen Monster sind K.O. **oder** nach **Runde 20** lebt noch mindestens ein Gegner. Ein Unentschieden bei Zeitablauf zählt als Niederlage. **[ANNAHME]**
- Gehen beide Seiten in derselben Aktion vollständig K.O. (z. B. durch Dornen), gewinnt der Spieler. **[ANNAHME]**
- **Sterne** (nur bei Sieg): 3★ = kein eigenes K.O. · 2★ = 1–2 eigene K.O. · 1★ = sonst. Ein wiederbelebter Phönix zählt nicht als K.O.
- Bei einer Niederlage gibt es keine Stage-Belohnung, aber **25 % der EP** (Trostpreis) und einen Tipp-Bildschirm (Typvorteil, Level, Aufstellung). **[ANNAHME]**

### 7.8 Darstellung, Vorspulen, Überspringen

- Der Kampf wird **vollständig vorausberechnet** (`simulateBattle(teamA, teamB, seed) → BattleLog`). Die Szene spielt danach nur noch das Log ab. Überspringen heißt: Log nicht abspielen, sofort zum Ergebnis. Das Ergebnis ist identisch.
- Geschwindigkeit: 1× (≈ 600 ms pro Aktion), 2×, ab Rathaus 2 auch 4×. Die gewählte Geschwindigkeit wird gespeichert.
- Überspringen: für **bereits gewonnene** Stages immer, für neue ab **Rathaus 3**.
- Mehrfach-Kampf (ab Rathaus 4): Stage 3× hintereinander, jeder Kampf mit eigenem Seed, Belohnungen werden summiert.

```ts
interface BattleLog {
  seed: number;
  rounds: number;
  result: 'win'|'loss';
  stars: 0|1|2|3;
  events: BattleEvent[];
}
type BattleEvent =
  | { r: number; kind: 'turn_start'; actor: string }
  | { r: number; kind: 'skill'; actor: string; skillId: string; targets: string[] }
  | { r: number; kind: 'hit'; actor: string; target: string; dmg: number; crit: boolean; typeMult: number; shieldAbsorbed: number }
  | { r: number; kind: 'heal' | 'shield'; actor: string; target: string; amount: number }
  | { r: number; kind: 'status_add' | 'status_remove'; target: string; status: string }
  | { r: number; kind: 'dot'; target: string; dmg: number }
  | { r: number; kind: 'ko' | 'revive'; target: string };
```
Unit-IDs im Log: `"A-F1"`, `"B-H2"` usw. (A = Spieler, B = Gegner).

### 7.9 Team-Boni / Typ-Synergien (ab Rathaus 2) **[ANNAHME]**

| Anzahl Monster gleichen Typs im Team | Bonus für **diese** Monster |
|---|---|
| 2 | +5 % ATK |
| 3 | +10 % ATK, +5 % HP |
| 4 | +15 % ATK, +10 % HP |
| 5 | +20 % ATK, +15 % HP |

**Elementarkreis:** Alle 4 Prototyp-Typen sind im Team vertreten → **+8 % SPD für alle**. Es gilt immer nur die höchste Synergiestufe pro Typ. Der Elementarkreis kommt zusätzlich dazu.
Damit gibt es eine echte Entscheidung: entweder ein Mono-Typ-Team (viel ATK, aber angreifbar über den Typ) oder ein gemischtes Team (Tempo, flexibel). Das passt zum Konzept („Taktik = Aufstellung, Typ-Synergien, Skills, Team-Boni“).

### 7.10 Gegner in der Kampagne

Gegnerteams werden aus den 10 Spezies gebaut. Die Zusammensetzung jeder Stage ist **fest in `/data/stages.json` hinterlegt** (handgebaut, nicht zufällig), damit man jede Stage gezielt balancieren kann. Gegner-Level: `1 + round((s − 1) × 1,2)` mit s = laufende Stage-Nummer 1–20. Bosse bekommen HP ×1,5.

```json
{ "id": "1-3", "enemyLevel": 3, "enemyRarity": 0,
  "enemies": [ { "slot": "F1", "speciesId": "m04" }, { "slot": "F2", "speciesId": "m02" }, { "slot": "H1", "speciesId": "m01" } ],
  "rewards": { "firstClear": { "gold": 220, "gems": 30, "exp": 75 }, "repeat": { "gold": 110, "exp": 75 }, "threeStarBonus": { "gems": 20 } } }
```

---

## 8. Währungen, Quellen/Senken, Belohnungen

### 8.1 Währungen **[ANNAHME: Namen und Anzahl]**

| Währung | Zweck | Quellen | Senken | Obergrenze |
|---|---|---|---|---|
| **Gold** | Bauen, Training, Aufwertung | Goldmine, Kampf, Tagesaufgaben, Login, Rewarded Ads | Gebäude, Training (0,3/EP), Aufwertung (Essenz × 10) | keine |
| **Juwelen** | Gacha (nur Spielwährung, kein Echtgeld) | Erst-Siege, 3★, Rathaus-Stufen, Login, Tagesaufgaben, Rewarded Ads | Gacha (100 / 900) | keine |
| **Essenz** | Aufwertung (Seltenheit +1) | Monster freilassen, Boss-Erst-Siege, Tagesaufgaben-Abschluss | Aufwertung | keine |
| **Beschwörungsticket** (Gegenstand) | = 1 Einzelziehung | Meilensteine | Gacha | – |
| **EP** (pro Monster, keine Währung) | Level | Kampf, Training | Level-up | Max-Level |

Kein Energie-/Ausdauersystem im Prototyp. Wer viel spielt, ist nur durch die steigende Stage-Schwierigkeit und die schwächere Wiederholungsbelohnung gebremst. **[ANNAHME]**

### 8.2 Kampf-Belohnungen (Kampagne, Kap. 1 und 2)

Formeln (s = laufende Stage-Nummer 1–20):
```
Erst-Sieg Gold   = 100 + 40 × s
EP (je Monster im Team, auch K.O.) = 30 + 15 × s      // Erst-Sieg und Wiederholung
Erst-Sieg Juwelen = 30   (Boss-Stage: 100)
3★-Bonus (einmalig) = 20 Juwelen
Wiederholung Gold = floor(Erst-Sieg Gold × 0,5), keine Juwelen
Boss-Erst-Sieg zusätzlich: 100 Essenz + 1 Beschwörungsticket
```

| Stage | Nr. s | Gegner-Lv. | Anzahl Gegner | Gegner-Seltenheit | Gold (Erst) | EP / Monster | Juwelen (Erst) | 3★-Bonus Juwelen | Gold (Wdh.) |
|---|---|---|---|---|---|---|---|---|---|
| 1-1 | 1 | 1 | 2 | Gewöhnlich | 140 | 45 | 30 | 20 | 70 |
| 1-2 | 2 | 2 | 2 | Gewöhnlich | 180 | 60 | 30 | 20 | 90 |
| 1-3 | 3 | 3 | 3 | Gewöhnlich | 220 | 75 | 30 | 20 | 110 |
| 1-4 | 4 | 5 | 3 | Gewöhnlich | 260 | 90 | 30 | 20 | 130 |
| 1-5 | 5 | 6 | 3 | Gewöhnlich | 300 | 105 | 30 | 20 | 150 |
| 1-6 | 6 | 7 | 4 | Gewöhnlich | 340 | 120 | 30 | 20 | 170 |
| 1-7 | 7 | 8 | 4 | Gewöhnlich | 380 | 135 | 30 | 20 | 190 |
| 1-8 | 8 | 9 | 4 | Ungewöhnlich | 420 | 150 | 30 | 20 | 210 |
| 1-9 | 9 | 11 | 5 | Ungewöhnlich | 460 | 165 | 30 | 20 | 230 |
| 1-10 | 10 | 12 | 5 | Ungewöhnlich + Boss (Episch. HP ×1.5) | 500 | 180 | 100 | 20 | 250 |
| 2-1 | 11 | 13 | 5 | Ungewöhnlich | 540 | 195 | 30 | 20 | 270 |
| 2-2 | 12 | 14 | 5 | Ungewöhnlich | 580 | 210 | 30 | 20 | 290 |
| 2-3 | 13 | 15 | 5 | Ungewöhnlich | 620 | 225 | 30 | 20 | 310 |
| 2-4 | 14 | 17 | 5 | Ungewöhnlich | 660 | 240 | 30 | 20 | 330 |
| 2-5 | 15 | 18 | 5 | Selten | 700 | 255 | 30 | 20 | 350 |
| 2-6 | 16 | 19 | 5 | Selten | 740 | 270 | 30 | 20 | 370 |
| 2-7 | 17 | 20 | 5 | Selten | 780 | 285 | 30 | 20 | 390 |
| 2-8 | 18 | 21 | 5 | Selten | 820 | 300 | 30 | 20 | 410 |
| 2-9 | 19 | 23 | 5 | Selten | 860 | 315 | 30 | 20 | 430 |
| 2-10 | 20 | 24 | 5 | Selten + Boss (Episch. HP ×1.5) | 900 | 330 | 100 | 20 | 450 |

Summe Kampagne (alles einmalig): **10.400 Gold, 740 Juwelen + 400 Juwelen (3★) = 1.140 Juwelen, 200 Essenz, 2 Tickets** ≈ 13 Ziehungen.

### 8.3 Tägliche und einmalige Belohnungen (Tagesreset 04:00 Ortszeit des Geräts) **[ANNAHME]**

| Quelle | Bedingung | Belohnung |
|---|---|---|
| Täglicher Login | 1. Start des Tages | 50 Juwelen + 200 Gold |
| Login-Serie Tag 7 (dann Neustart) | 7 Tage in Folge | +1 Beschwörungsticket |
| Tagesaufgabe 1 | 3 Kämpfe gewinnen | 20 Juwelen |
| Tagesaufgabe 2 | Goldmine 2× einsammeln | 20 Juwelen |
| Tagesaufgabe 3 | 1 Training abschließen | 20 Juwelen |
| Alle 3 Aufgaben erledigt | – | 40 Juwelen + 500 Gold + 30 Essenz |
| Rathaus-Stufe erreicht | einmalig | 100 × Stufe Juwelen (gesamt 1.400) |
| Erstes Episch / Legendär im Besitz | einmalig | 100 / 300 Juwelen |
| Start-Paket | Spielstart | 300 Juwelen, 500 Gold, 3 Monster, Tutorial-10er gratis |

### 8.4 Wirtschafts-Überblick pro Tag (aktiver Spieler, Mitte Prototyp)

| | ohne Werbung | mit allen Rewarded Ads |
|---|---|---|
| Juwelen | 150 (Login 50 + Aufgaben 100) | 210 (+60 aus 3 Ads) → ≈ 2 Ziehungen/Tag |
| Gold | ≈ 3.200 (Mine St. 3, 16 Std.) + 700 + Wiederholungskämpfe ≈ 5.000 | + Mine-Turbo 3 × 400 + doppelte Kampfbelohnungen ≈ 7.500 |

Grundsatz gegen Pay-to-Win (bzw. „Pay-with-Attention-to-Win“): Werbung bringt **höchstens ca. 40 % mehr Juwelen** pro Tag. Alle Inhalte sind auch ohne Werbung erreichbar.

### 8.5 Speicherstand (`localStorage["mstadt.save.v1"]`)

```json
{
  "version": 1,
  "createdAt": 1791842400000,
  "lastSeen": 1791846000000,
  "currencies": { "gold": 1200, "gems": 450, "essence": 0, "tickets": 0 },
  "buildings": {
    "townhall": { "level": 2, "upgradeEndsAt": null },
    "goldmine": { "level": 2, "stored": 312.5, "lastTick": 1791846000000, "upgradeEndsAt": null },
    "training": { "level": 1, "slots": [ { "monsterUid": "a1b2", "startAt": 1791845000000, "endsAt": 1791846800000, "exp": 360, "goldPaid": 108 } ] }
  },
  "monsters": [ { "uid": "a1b2", "speciesId": "m01", "rarity": 0, "level": 6, "exp": 40, "locked": true, "obtainedAt": 1791842400000 } ],
  "team": { "F1": "c3d4", "F2": null, "H1": "a1b2", "H2": null, "H3": null },
  "campaign": { "cleared": { "1-1": 3, "1-2": 2 } },
  "gacha": { "pityLeg": 12, "pityEpic": 3, "totalPulls": 12, "history": [] },
  "daily": { "dayKey": "2026-10-13", "loginStreak": 1, "quests": { "win3": 1, "mine2": 0, "train1": 0 }, "claimedAll": false },
  "ads": { "dayKey": "2026-10-13", "counts": { "double_reward": 0, "gem_bonus": 0, "mine_boost": 0, "build_speed": 0, "free_pull": 0 }, "lastRewardedAt": 0, "lastInterstitialAt": 0 },
  "settings": { "battleSpeed": 2, "sound": true }
}
```
Gespeichert wird nach jeder Transaktion, beim Szenenwechsel und bei `visibilitychange`. Hat der Speicherstand eine ältere `version`, läuft eine Migrationskette `migrate[v] (save) → save'`. **[ANNAHME]**

---

## 9. Werbe-Platzierungen

### 9.1 Grundsätze (aus dem Konzept)

- Rewarded Ads sind **immer freiwillig**: Der Spieler klickt bewusst einen Button mit Werbe-Symbol und der Belohnung darauf.
- **Banner sind dezent** und erscheinen **nie im Kampf**.
- Zielplattformen sind CrazyGames, Poki und GameDistribution. Die Werbung läuft über die SDKs der Plattformen, deshalb fallen keine Zusatzkosten an. Im Code gibt es ein **`AdService`-Interface** mit einem Adapter pro Plattform und einem `NoAdsAdapter` für GitHub Pages/itch.io bzw. die lokale Entwicklung. **[ANNAHME]**
- Gibt es keine Werbung (kein Fill, Adblocker, Fehler): Der Button wird ausgegraut („Gerade keine Werbung verfügbar“). Es gibt **keine Belohnung, aber auch keine Strafe**. Ein Adblocker wird nie bestraft.
- Die Belohnung gibt es **erst nach dem Callback „vollständig angesehen“** des SDK. Bei Abbruch gibt es nichts, und der Tageszähler wird nicht erhöht.
- Während der Werbung: Spiel pausieren und Ton stummschalten (Plattform-Vorgabe).

### 9.2 Rewarded Ads

| ID | Ort / Auslöser | Belohnung | Limit pro Tag | Cooldown | Bedingung |
|---|---|---|---|---|---|
| `double_reward` | Ergebnisbildschirm nach **Sieg** | Gold und EP dieses Kampfes ×2 (Juwelen **nicht**) | 10 | – | nur Einzelkampf, nicht bei Mehrfach-Kampf |
| `gem_bonus` | Portal, Button „+20 Juwelen“ | 20 Juwelen | 3 | 30 Min. | ab Stage 1-3 |
| `free_pull` | Portal, Button „Gratis-Ziehung“ | 1 Einzelziehung (zählt zur Pity) | 1 | – | ab Stage 1-3 |
| `mine_boost` | Goldmine, Button „Turbo“ | sofort 2 Std. Produktion der aktuellen Stufe (über das Lager hinaus) | 3 | 60 Min. | Goldmine Stufe ≥ 1 |
| `build_speed` | Bau-Popup während des Ausbaus | Restbauzeit −30 Min. (sind es ≤ 30 Min., ist der Bau sofort fertig) | 5 | – | nur bei laufendem Ausbau |
| `training_speed` | Trainings-Slot | Restzeit −50 % | 3 | – | nur bei laufendem Training |

**Globales Limit:** höchstens **20 Rewarded Ads pro Tag**, alle Platzierungen zusammen. Der Tageszähler wird wie in 8.3 um 04:00 zurückgesetzt. **[ANNAHME: alle Werte]**
Die Buttons zeigen den Restzähler („2/3 heute“). Ist das Limit erreicht, wird der Button ausgeblendet statt ausgegraut.

### 9.3 Interstitials (Pausen-Werbung) **[ANNAHME – im Konzept nicht erwähnt]**

Das Konzept nennt nur Rewarded Ads und Banner. Die Plattformen (v. a. Poki und CrazyGames: „commercial break“/„midgame“) erwarten bzw. vergüten aber Werbung an natürlichen Pausen. Deshalb gibt es ein **streng begrenztes, per Konfiguration abschaltbares** Interstitial.

| Regel | Wert |
|---|---|
| Erlaubte Auslöser | **nur** beim Wechsel *ResultScene → CityScene* (nach einem Kampf) und beim Verlassen der Portal-Ergebnisanzeige |
| Nie | während eines Kampfes, im Kampf-Ladebildschirm, im Tutorial, während der Bauanimation, unmittelbar nach einer Niederlage |
| Schonfrist bei Neuspielern | keine Interstitials, bevor Stage **1-5** gewonnen ist **und** die erste Sitzung 10 Min. läuft |
| Mindestabstand | **3 Min.** zwischen zwei Interstitials |
| Abstand zu Rewarded | **5 Min.** nach einer angesehenen Rewarded Ad kein Interstitial |
| Sitzungsstart | frühestens 2 Min. nach Spielstart |
| Maximum | **6 pro Stunde**, **30 pro Tag** |
| Plattform-Vorrang | Die SDK-Regeln der Plattform haben Vorrang. Wir fragen nur an (`commercialBreak()`), die Plattform darf ablehnen. |
| Ohne Plattform | `NoAdsAdapter` → nichts passiert |

`config.ads.interstitialEnabled` ist auf `true` für Poki/CrazyGames/GameDistribution und auf `false` für GitHub Pages/itch.io. Wenn Fabian-Noel das ganz streichen will, reicht `false` überall.

### 9.4 Banner

- Nur in **CityScene, MonsterListScene, TeamScene** (Menüs), unten am Rand, Standardgröße 728×90 bzw. 320×50 mobil. Das UI lässt dafür einen festen Freiraum, damit keine Buttons verdeckt werden.
- **Nie** in BattleScene, PortalScene (Ziehungsanimation) und im Tutorial.
- Nur auf Plattformen mit Banner-Unterstützung (z. B. CrazyGames). Refresh steuert das SDK, wir lösen keinen eigenen Refresh aus.

### 9.5 Konfiguration (`/data/ads.json`)

```json
{
  "rewarded": {
    "globalDailyCap": 20,
    "placements": {
      "double_reward":  { "dailyCap": 10, "cooldownSec": 0,    "reward": { "multiplyBattleGoldExp": 2 } },
      "gem_bonus":      { "dailyCap": 3,  "cooldownSec": 1800, "reward": { "gems": 20 } },
      "free_pull":      { "dailyCap": 1,  "cooldownSec": 0,    "reward": { "pulls": 1 } },
      "mine_boost":     { "dailyCap": 3,  "cooldownSec": 3600, "reward": { "mineHours": 2 } },
      "build_speed":    { "dailyCap": 5,  "cooldownSec": 0,    "reward": { "buildMinusSec": 1800 } },
      "training_speed": { "dailyCap": 3,  "cooldownSec": 0,    "reward": { "trainingRemainingPct": 0.5 } }
    }
  },
  "interstitial": {
    "enabled": true,
    "triggers": ["result_to_city", "portal_result_close"],
    "minIntervalSec": 180, "afterRewardedGraceSec": 300, "sessionStartGraceSec": 120,
    "maxPerHour": 6, "maxPerDay": 30,
    "unlockAfterStage": "1-5", "firstSessionGraceSec": 600
  },
  "banner": { "enabled": true, "scenes": ["CityScene", "MonsterListScene", "TeamScene"] }
}
```

```ts
interface AdService {
  init(): Promise<void>;
  isRewardedAvailable(): boolean;
  showRewarded(placement: string): Promise<'completed'|'skipped'|'unavailable'>;
  showInterstitial(trigger: string): Promise<void>;   // muss immer resolven, auch bei Fehler
  showBanner(scene: string): void; hideBanner(): void;
  gameplayStart(): void; gameplayStop(): void;       // Plattform-Hooks (Poki/CrazyGames)
}
```

---

## 10. Annahmen auf einen Blick (zur Freigabe durch Fabian-Noel)

1. 3 Prototyp-Gebäude: **Rathaus, Goldmine, Trainingsgelände**. Das Portal ist eine feste Funktion, die Zucht nur ein Platzhalter.
2. Formation **2 Front / 3 Hinten**, Team-Plätze 3 → 4 → 5 über Rathaus 1–3. Positionsbonus +10 % ATK/DEF.
3. 10 Monster, Namen, Werte und Fähigkeiten sind frei erfunden. Aktive Typen: Feuer, Wasser, Pflanze, Erde.
4. Typ-Kreis Feuer → Pflanze → Wasser → Erde → Feuer, Diagonalen neutral. Multiplikatoren 1,5 / 0,75. Licht ↔ Schatten gegenseitig stark.
5. Seltenheits-Multiplikatoren 1,00 … 3,75, Max-Level 20 … 70. Die Seltenheit hängt an der Instanz und kann per Aufwertung (Essenz + Gold) steigen.
6. Gacha: 100 Juwelen pro Ziehung / 900 pro 10er, Basis Legendär+ 0,7 % mit Soft-Pity ab 60 und Hard-Pity bei 90 (effektiv ≈ 1,9 %); Episch+ Hard-Pity bei 20.
7. Schaden `1,5 × ATK²/(ATK+DEF)`, Varianz ±10 %, Krit 10 % / ×1,5, Rundenlimit 20, Zeitablauf = Niederlage.
8. Kein Energiesystem. Währungen: Gold, Juwelen, Essenz (+ Tickets).
9. Interstitials gibt es nur an Pausen nach dem Kampf und nur auf Plattformen, die sie wollen. Abschaltbar.
10. Alle Balancing-Werte liegen in JSON, alle Zufallswerte laufen über einen seedbaren PRNG.
