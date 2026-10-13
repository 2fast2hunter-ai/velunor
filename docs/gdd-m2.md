# Velunor – GDD-Erweiterung Meilenstein 2 (M2)

**Status: FINAL – 13.10.2026**

**Version:** 1.0 (M2) · **Stand:** 13.10.2026 · **Grundlage:** `konzept.md`, `gdd-prototyp.md` (Prototyp-GDD v0.1.1, im Folgenden **P-GDD**)
**Zielgruppe:** Entwicklung (Porygon) – TypeScript + Phaser · Prototyp live: https://2fast2hunter-ai.github.io/velunor/

> **Lesehinweis**
> - Dieses Dokument **ergänzt** das P-GDD. Alle Formeln, Werte, Typen, Seltenheiten und Währungen aus dem P-GDD gelten **unverändert** weiter (Schaden `1,5 × ATK²/(ATK+DEF)`, Werteformel Kap. 3.1, Seltenheits-Multiplikatoren Kap. 5.1, Typmatrix Kap. 4, Gacha-Raten/Pity Kap. 6, Belohnungsformeln Kap. 8.2, Tagesreset 04:00). Querverweise wie „P-GDD 7.4“ beziehen sich auf das Prototyp-GDD.
> - Währungen bleiben **Gold, Juwelen, Essenz, Beschwörungstickets** (+ EP pro Monster). M2 führt **keine neue Währung** ein.
> - Jede Erweiterung ist **abwärtskompatibel**: Neue Felder haben Standardwerte, mit denen sich das Prototyp-Verhalten exakt ergibt (z. B. Potenzial 0, kein Lernskill, Signatur-Rang 1).
> - Eigene Entscheidungen sind mit **[ANNAHME]** markiert und am Ende (Kap. 11) gesammelt. Zahlen sind trotzdem so gewählt, dass sie direkt eingebaut werden können.
> - Alle Balancing-Werte gehören wie im P-GDD in `/data/*.json`. Alle JSON-Blöcke in diesem Dokument sind gültiges JSON (automatisch geprüft).
> - Die Werte für Kampagne und Kurve (Kap. 5 und 8) wurden mit einem **Nachbau der Kampfregeln** (P-GDD Kap. 7 + diese Erweiterung, Python, je 100 Seeds pro Stage und Level) gegengeprüft. Porygon sollte das mit dem echten `simulateBattle` wiederholen (Kap. 10).

---

## 0. Umfang von M2

| Bereich | Neu in M2 | Freischaltung |
|---|---|---|
| Skills | 3 Skill-Slots pro Monster (Signatur, Lernskill, Passiv), Signatur-Rang 1–5, Skill-Bibliothek (16 Lernskills, 8 Passive), Skill-Training im Trainingsgelände | Rathaus 3 (Slot 2 + Rang), Rathaus 5 (Slot 3) |
| Zucht | Zuchtstation (3 Stufen), Ergebnisregeln für Typ/Seltenheit/Potenzial/Skill-Vererbung | Rathaus 5 (ersetzt den Platzhalter aus P-GDD 2.2) |
| Typen | +4 aktive Typen: **Gift, Stein, Insekt, Kristall** → 8 aktive Typen | schrittweise in Kapitel 2 |
| Monster | +15 Monster (m11–m25) → 25 Monster, Heroisch-Pool nicht mehr leer | mit dem jeweiligen Typ |
| Kampagne | Kapitel 1–2 vollständig: 20 Stages mit festen Gegnerteams, Gegner-Skills, 2 Bosse mit Mechaniken, Sterne-Truhen, Typ-Geschenke | wie P-GDD (Kap. 2 ab Rathaus 4) |
| Tagesaufgaben | 5 Basis-Aufgaben + 2 Bonus-Aufgaben, Abschluss-Truhe | Rathaus 2 (wie P-GDD) |
| Team-Synergien | Typ-Stufen (wie P-GDD 7.9) + 4 Typ-Kombos + 5 Klassen-Synergien + „Ausgewogen“ | Typ-Synergien Rathaus 2, **Klassen-Synergien Rathaus 3** [ENTSCHIEDEN] |
| Neue Kampf-Bausteine | Status *Vergiftung*, *ATK ±*, *SPD ±*; Effekte Mehrfachtreffer, DEF-Durchdringung, Reinigung; neue Ziele; Boss-Mechaniken | – |

Weiterhin **nicht** in M2: Events, Dungeons, PvP, Doppeltypen, Echtgeld (bleibt dauerhaft ausgeschlossen).

---

## 1. Training mit Skills

### 1.1 Skill-Slots

| Slot | Art | Inhalt | Freischaltung | Wechseln |
|---|---|---|---|---|
| **1 – Signatur** | aktiv | die feste Fähigkeit der Spezies (P-GDD 3.2) | immer | nicht wechselbar, aber **Rang 1–5** aufwertbar (ab Rathaus 3) |
| **2 – Lernskill** | aktiv | 1 Skill aus der Bibliothek (1.4) | Rathaus 3 **und** Monster-Lv ≥ 10 | zwischen bereits gelernten Skills jederzeit gratis (außerhalb des Kampfes) |
| **3 – Passiv** | passiv | 1 Passive aus der Bibliothek (1.5) | Rathaus 5 **und** Trainingsgelände 5 **und** Monster-Lv ≥ 20 | wie Slot 2 |

- Die Spezies-Passive des Sonnenphönix (*Wiedergeburt*) und des Prismakoloss (*Kristallherz*) sind **angeboren** und belegen keinen Slot. Diese Monster können zusätzlich eine Slot-3-Passive tragen. **[ANNAHME]**
- Gelernte Skills bleiben dauerhaft in der Liste `learned` des Monsters, auch wenn sie gerade nicht ausgerüstet sind. Neu lernen kostet einmal, Umrüsten nichts. **[ANNAHME]**
- `typeReq`: Steht bei einem Skill ein Typ, können ihn nur Monster dieses Typs lernen. `null` = alle Typen.

### 1.2 Freischaltung der Skill-Stufen im Trainingsgelände

Die Stufe des Trainingsgeländes (P-GDD 2.4, Werte unverändert) bestimmt, welche Skills man lernen kann:

| Trainingsgelände | Rathaus (Bedingung lt. P-GDD) | lernbar |
|---|---|---|
| 1 | 1 | – (nur EP-Training) |
| 2 | 2 | Lernskills **Tier 1**, Signatur-Rang bis 2 (beides erst ab Rathaus 3 nutzbar, vorher nur sichtbar) |
| 3 | 3 | Lernskills **Tier 2**, Signatur-Rang bis 3 |
| 4 | 4 | Lernskills **Tier 3**, Signatur-Rang bis 4 |
| 5 | 5 | **Passive** (Slot 3), Signatur-Rang 5 |

Ein Slot ist gleichzeitig entweder EP-Training **oder** Skill-Training. Die Slot-Anzahl (1/1/2/2/3) bleibt wie im P-GDD. **[ANNAHME]**

### 1.3 Signatur-Rang (Slot 1)

Wirkung je Rang r (1 … 5) **[ANNAHME]**:
```
atkMult_eff  = atkMult  × (1 + 0,10 × (r − 1))       // Schaden und Heilung
shieldPct_eff = shieldPct × (1 + 0,10 × (r − 1))
chance_eff   = min(1, chance + 0,05 × (r − 1))       // nur negative Statuseffekte beim Gegner
cooldown_eff = (r == 5) ? max(2, cooldown − 1) : cooldown
```
Bei Rang 1 ergibt sich exakt der Prototyp. Dauer und `value` von Statuseffekten ändern sich nicht.

**Max-Rang nach Seltenheit der Instanz:** Gewöhnlich/Ungewöhnlich 2 · Selten/Episch 3 · Heroisch/Legendär 4 · Mythisch und höher 5. Zusätzlich gilt die Grenze des Trainingsgeländes (1.2). Die Grenzen sinken nie, erreichte Ränge bleiben erhalten.

**Kosten Rang r → r+1:** `gold = 300 × r²`, `essenz = 10 × r²`, `dauer = 30 Min. × r`

| Rang | Gold | Essenz | Dauer |
|---|---|---|---|
| 1 → 2 | 300 | 10 | 30 Min. |
| 2 → 3 | 1.200 | 40 | 60 Min. |
| 3 → 4 | 2.700 | 90 | 90 Min. |
| 4 → 5 | 4.800 | 160 | 120 Min. |

### 1.4 Lernskill-Bibliothek (Slot 2)

Kosten nach Tier **[ANNAHME]**: **Tier 1:** 400 Gold + 20 Essenz, 30 Min. · **Tier 2:** 1.500 Gold + 60 Essenz, 60 Min. · **Tier 3:** 4.000 Gold + 150 Essenz, 120 Min.

| ID | Name | Tier | Typ | CD / Start-CD | Wirkung |
|---|---|---|---|---|---|
| L01 | **Kräftiger Hieb** | 1 | alle | 3/1 | Standardziel: 130 % ATK |
| L02 | **Abhärten** | 1 | alle | 4/1 | selbst: *DEF +30 %* (2 R.) + Schild 10 % eigene Max-HP (2 R.) |
| L03 | **Erste Hilfe** | 1 | alle | 4/2 | Verbündeter mit niedrigstem HP-%: Heilung 100 % ATK |
| L04 | **Funkenregen** | 1 | Feuer | 4/2 | alle Gegner: 60 % ATK + 20 % Chance auf *Verbrennung* (2 R.) |
| L05 | **Quellwasser** | 1 | Wasser | 4/2 | Verbündeter mit niedrigstem HP-%: Heilung 120 % ATK + entfernt alle negativen Statuseffekte |
| L06 | **Rankenfessel** | 1 | Pflanze | 4/2 | Standardziel: 100 % ATK + *SPD −20 %* (2 R.) |
| L07 | **Schlammwurf** | 1 | Erde | 3/2 | Standardziel: 110 % ATK + 60 % Chance auf *ATK −15 %* (2 R.) |
| L08 | **Kampfschrei** | 2 | alle | 5/2 | alle Verbündeten: *ATK +15 %* (2 R.) |
| L09 | **Präzisionsschuss** | 2 | alle | 4/2 | Hinterreihe, niedrigste HP: 160 % ATK |
| L10 | **Giftnebel** | 2 | Gift | 4/2 | alle Gegner: 50 % ATK + 60 % Chance auf *Vergiftung (1 Stapel)* (3 R.) |
| L11 | **Felssturz** | 2 | Stein | 4/3 | Standardziel: 140 % ATK + 25 % Chance auf *Betäubung* (1 Zug) |
| L12 | **Schwirrflug** | 2 | Insekt | 3/1 | Standardziel: 100 % ATK + *SPD +30 %* (2 R.) (selbst) |
| L13 | **Facettenschild** | 2 | Kristall | 4/2 | Verbündeter mit niedrigstem HP-%: Schild 15 % eigene Max-HP (2 R.) + *DEF +20 %* (2 R.) |
| L14 | **Vernichtungsschlag** | 3 | alle | 5/3 | Standardziel: 220 % ATK |
| L15 | **Massenheilung** | 3 | alle | 5/3 | alle Verbündeten: Heilung 70 % ATK |
| L16 | **Läuterung** | 3 | alle | 4/2 | alle Verbündeten: entfernt alle negativen Statuseffekte + *DEF +10 %* (2 R.) |

Gestaltungsregel: Ein Lernskill ist im Schnitt **etwas schwächer als die Signatur** gleicher Seltenheit, damit die Spezies-Identität erhalten bleibt. Typ-Lernskills sind etwas stärker als die allgemeinen, damit Typen eine eigene Rolle haben.

### 1.5 Passive (Slot 3)

Kosten: **6.000 Gold + 300 Essenz, 240 Min.** je Passive. **[ANNAHME]**

| ID | Name | Typ | Auslöser | Wirkung | Einsätze/Kampf |
|---|---|---|---|---|---|
| P01 | **Zähigkeit** | alle | tödlicher Treffer | überlebt mit 1 HP (wird **vor** *Wiedergeburt* geprüft) | 1 |
| P02 | **Erstschlag** | alle | Kampfstart | *SPD +20 %* für 2 eigene Züge (wirkt schon in Runde 1, weil vor der ersten Sortierung gesetzt) | 1 |
| P03 | **Lebensraub** | alle | eigener Basisangriff | heilt sich um 15 % des verursachten Schadens | ∞ |
| P04 | **Notschild** | alle | HP fällt erstmals unter 40 % | Schild 20 % eigene Max-HP (2 R.) | 1 |
| P05 | **Rache** | alle | ein Verbündeter geht K.O. | *ATK +20 %* (2 R.) | 2 |
| P06 | **Typmeister** | alle | dauerhaft | +10 % Schaden, wenn `typeMult = 1,5` | ∞ |
| P07 | **Giftblut** | Gift | wird von einer gegnerischen Aktion getroffen | 30 % Chance, den Angreifer zu vergiften (1 Stapel, 3 R.) | ∞ |
| P08 | **Kristallhaut** | Kristall | erster erlittener Treffer im Kampf | dieser Treffer −50 % Schaden | 1 |

### 1.6 Ablauf Skill-Training

1. Spieler wählt im Trainingsgelände einen freien Slot → Monster → „Skill lernen“ oder „Signatur aufwerten“.
2. Prüfung: Rathaus-Stufe, Trainingsgelände-Stufe (Tier), Monster-Lv (Slot), Typ (`typeReq`), Max-Rang, genug Gold **und** Essenz.
3. Kosten werden beim Start bezahlt. Abbruch → **100 % Erstattung**, kein Teilfortschritt (wie beim Bauen, P-GDD 2.1). **[ANNAHME]**
4. Läuft in Echtzeit, auch offline (`endsAt`). Rewarded Ad `training_speed` (P-GDD 9.2, −50 % Restzeit, 3/Tag) gilt auch hier.
5. Beim Abholen: Skill landet in `learned` und wird **automatisch ausgerüstet**, wenn der Slot leer ist. Rang +1 wird sofort wirksam.
6. Das Monster darf währenddessen kämpfen (wie beim EP-Training). Es kann aber nicht gleichzeitig EP- und Skill-Training haben.
7. Tagesaufgabe „1 Training abschließen“ zählt EP- **und** Skill-Training.

### 1.7 Einbindung in den Auto-Kampf

**Geänderter Zugablauf** (ersetzt Schritt 3 aus P-GDD 7.4, alle anderen Schritte bleiben):
```
3. Für jede aktive Fähigkeit in Prioritätsreihenfolge (Standard: [Signatur, Lernskill]):
       wenn cd == 0 UND gültiges Ziel vorhanden → einsetzen; cd = cooldown_eff; STOP
   Wurde keine eingesetzt → Basisangriff (100 % ATK auf Standardziel).
   Danach: jede aktive Fähigkeit, die in diesem Zug NICHT eingesetzt wurde und cd > 0 hat → cd −= 1.
```
- Bei nur einer Fähigkeit ergibt sich exakt das Prototyp-Verhalten (P-GDD 7.4, Beispiel CD 3 / Start-CD 2).
- Sind beide bereit, wird die mit höherer Priorität eingesetzt. Die andere bleibt auf 0 und kommt im nächsten Zug dran.
- **Priorität**: Im Monster-Detail kann der Spieler die Reihenfolge der beiden aktiven Skills tauschen (`skillOrder`). Mehr KI-Einstellungen gibt es nicht, damit der Kampf vorhersehbar bleibt. **[ANNAHME]**
- „Gültiges Ziel“ wie im P-GDD. Zusätzlich: Ein Skill, der **nur** heilt, braucht einen verletzten Verbündeten. Ein Skill, der **nur** *Reinigung* enthält, braucht einen Verbündeten mit negativem Status.
- Gegner benutzen dieselbe Logik. Ihre Lernskills stehen fest in `stages.json` (Kap. 5).

**Passive – Auslösezeitpunkte** (Reihenfolge innerhalb einer Aktion):

| Trigger | Zeitpunkt |
|---|---|
| `battle_start` | nach dem Berechnen der Kampfwerte (P-GDD 7.2), vor der Sortierung von Runde 1 |
| `lethal_hit` | wenn ein Treffer die HP auf ≤ 0 setzen würde: zuerst P01 Zähigkeit, dann angeborene *Wiedergeburt* |
| `hp_below` | nach jedem Treffer, der HP gesenkt hat und nicht K.O. gesetzt hat; feuert nur 1× (`usesPerBattle`) |
| `on_hit_taken` | nach Schaden durch eine gegnerische Aktion (nicht durch Verbrennung/Vergiftung/Dornen) |
| `on_basic_attack` | nach dem Schaden des eigenen Basisangriffs |
| `on_ally_ko` | sobald ein Verbündeter endgültig K.O. geht (nicht bei Wiederbelebung) |
| `passive_mod` | dauerhafter Modifikator, wird in der Schadensformel berücksichtigt |

**Neue Ziele** (Ergänzung zu `SkillDef.target`):
- `enemy_back_all` – alle Gegner der Hinterreihe, ist sie leer: alle der Frontreihe. Ignoriert Spott.
- `ally_all` – alle lebenden Verbündeten inkl. sich selbst.
- `enemy_random` – bei jedem Treffer (`hits`) wird ein lebender Gegner zufällig (PRNG) gewählt. Ignoriert Spott und Reihenregel.
- `attacker` – nur für Passive: das Monster, das gerade getroffen hat.
- Pro Effekt darf ein eigenes `target` stehen (z. B. Schaden auf Gegner + Heilung auf `ally_all`). Ohne `target` gilt das Ziel des Skills.

**Neue Effekte:**
- `damage.hits` (Standard 1): Anzahl Einzeltreffer, jeder mit eigenem Krit- und Varianzwurf.
- `damage.defPierce` (Standard 0): `def = defEff × (1 − defPierce)` in der Schadensformel.
- `cleanse`: entfernt `burn`, `stun`, `poison`, `def_down`, `atk_down`, `spd_down`.
- Statuseffekte auf einem Schadensskill treffen nur Ziele, denen der Schaden > 0 zugefügt hat (P-GDD 7.6). Bei einem eigenen `target` (z. B. `self`) wirken sie immer.

**Neue Statuseffekte** (Ergänzung zu P-GDD 3.3):

| Effekt-ID | Name | Wirkung | Dauer zählt herunter | Stapeln |
|---|---|---|---|---|
| `poison` | Vergiftung | Zu Beginn des eigenen Zuges (nach Verbrennung): Schaden = `floor(maxHp × 0,04 × Stapel)`, bei Bossen 0,02. Typlos, ignoriert DEF, kein Krit. | am Ende des eigenen Zuges | bis **3 Stapel**; erneutes Auftragen addiert Stapel und setzt die Dauer neu |
| `atk_up` / `atk_down` | ATK ±X % | ATK × (1 ± X) | am Ende des eigenen Zuges | wie `def_up`/`def_down` |
| `spd_up` / `spd_down` | SPD ±X % | SPD × (1 ± X), wirkt ab der nächsten Sortierung (P-GDD 7.3) | am Ende des eigenen Zuges | wie `def_up`/`def_down` |

Die Summengrenze der Mods (−0,5 … +1,0) aus P-GDD 7.2 gilt für alle drei Werte.

**Neue Log-Ereignisse** (Ergänzung zu `BattleEvent`):
```ts
  | { r: number; kind: 'passive'; actor: string; passiveId: string }
  | { r: number; kind: 'boss_mech'; actor: string; mechId: string }
  | { r: number; kind: 'summon'; actor: string; unit: string; speciesId: string }
  | { r: number; kind: 'cleanse'; target: string; removed: string[] }
```

### 1.8 Datenstrukturen

```ts
type Target = 'default'|'enemy_front_all'|'enemy_back_all'|'enemy_back_lowest_hp'|'enemy_all'|'enemy_random'
            |'ally_lowest_hp_pct'|'ally_all'|'self'|'self_and_ally_lowest_hp_pct'|'attacker';
type StatusId = 'burn'|'stun'|'taunt'|'def_up'|'def_down'|'atk_up'|'atk_down'|'spd_up'|'spd_down'|'thorns'|'poison';
type SkillEffect =
  | { kind: 'damage'; atkMult: number; hits?: number; defPierce?: number; target?: Target }
  | { kind: 'heal'; atkMult: number; target?: Target }
  | { kind: 'shield'; maxHpPctOfCaster: number; duration: number; target?: Target }
  | { kind: 'status'; status: StatusId; chance: number; duration: number; value?: number; stacks?: number; target?: Target }
  | { kind: 'cleanse'; target?: Target };
interface SkillDef { id: string; name?: string; cooldown: number; initialCooldown: number; target: Target; effects: SkillEffect[] }
interface LearnSkillDef extends SkillDef { tier: 1|2|3; typeReq: TypeId|null }
interface PassiveDef {
  id: string; name: string; typeReq: TypeId|null; usesPerBattle: number;     // 0 = unbegrenzt
  trigger: { kind: 'battle_start'|'lethal_hit'|'hp_below'|'on_hit_taken'|'on_basic_attack'|'on_ally_ko'|'passive_mod'; pct?: number; firstOnly?: boolean };
  effects: (SkillEffect | { kind: 'survive'; hp: number } | { kind: 'lifesteal'; pctOfDamage: number }
            | { kind: 'mod'; stat: 'strongTypeDamage'|'damageTaken'; value: number })[];
}
interface MonsterInstance {            // Prototyp-Felder unverändert, neu:
  potential: { hp: number; atk: number; def: number };   // 0…10, Standard 0 (Kap. 2.4)
  skills: { sigRank: 1|2|3|4|5; slot2: string|null; slot3: string|null; learned: string[]; skillOrder: ('sig'|'slot2')[] };
  generation: number;                  // 0 = Gacha/Start, Zucht: max(Eltern)+1
  breedReadyAt: number;                // Zeitstempel, ab dem das Monster wieder züchten darf
}
```

`/data/skills.json` (vollständig):
```json
{
  "signatureRank": {"atkMultPerRank": 0.1, "shieldPerRank": 0.1, "statusChancePerRank": 0.05, "cooldownReductionAtRank": 5, "minCooldown": 2, "maxRankByRarity": [2, 2, 3, 3, 4, 4, 5, 5, 5, 5], "maxRankByTraining": [1, 1, 2, 3, 4, 5], "cost": {"goldPerRankSq": 300, "essencePerRankSq": 10, "minutesPerRank": 30}},
  "slots": {"slot2": {"townhall": 3, "monsterLevel": 10}, "slot3": {"townhall": 5, "training": 5, "monsterLevel": 20}},
  "tierCost": {"1": {"gold": 400, "essence": 20, "minutes": 30, "training": 2}, "2": {"gold": 1500, "essence": 60, "minutes": 60, "training": 3}, "3": {"gold": 4000, "essence": 150, "minutes": 120, "training": 4}, "passive": {"gold": 6000, "essence": 300, "minutes": 240, "training": 5}},
  "learnSkills": [
    {"id": "L01", "name": "Kräftiger Hieb", "tier": 1, "typeReq": null, "cooldown": 3, "initialCooldown": 1, "target": "default", "effects": [{"kind": "damage", "atkMult": 1.3}]},
    {"id": "L02", "name": "Abhärten", "tier": 1, "typeReq": null, "cooldown": 4, "initialCooldown": 1, "target": "self", "effects": [{"kind": "status", "status": "def_up", "chance": 1, "duration": 2, "value": 0.3}, {"kind": "shield", "maxHpPctOfCaster": 0.1, "duration": 2}]},
    {"id": "L03", "name": "Erste Hilfe", "tier": 1, "typeReq": null, "cooldown": 4, "initialCooldown": 2, "target": "ally_lowest_hp_pct", "effects": [{"kind": "heal", "atkMult": 1.0}]},
    {"id": "L04", "name": "Funkenregen", "tier": 1, "typeReq": "fire", "cooldown": 4, "initialCooldown": 2, "target": "enemy_all", "effects": [{"kind": "damage", "atkMult": 0.6}, {"kind": "status", "status": "burn", "chance": 0.2, "duration": 2, "value": 0.3}]},
    {"id": "L05", "name": "Quellwasser", "tier": 1, "typeReq": "water", "cooldown": 4, "initialCooldown": 2, "target": "ally_lowest_hp_pct", "effects": [{"kind": "heal", "atkMult": 1.2}, {"kind": "cleanse"}]},
    {"id": "L06", "name": "Rankenfessel", "tier": 1, "typeReq": "plant", "cooldown": 4, "initialCooldown": 2, "target": "default", "effects": [{"kind": "damage", "atkMult": 1.0}, {"kind": "status", "status": "spd_down", "chance": 1, "duration": 2, "value": 0.2}]},
    {"id": "L07", "name": "Schlammwurf", "tier": 1, "typeReq": "earth", "cooldown": 3, "initialCooldown": 2, "target": "default", "effects": [{"kind": "damage", "atkMult": 1.1}, {"kind": "status", "status": "atk_down", "chance": 0.6, "duration": 2, "value": 0.15}]},
    {"id": "L08", "name": "Kampfschrei", "tier": 2, "typeReq": null, "cooldown": 5, "initialCooldown": 2, "target": "ally_all", "effects": [{"kind": "status", "status": "atk_up", "chance": 1, "duration": 2, "value": 0.15}]},
    {"id": "L09", "name": "Präzisionsschuss", "tier": 2, "typeReq": null, "cooldown": 4, "initialCooldown": 2, "target": "enemy_back_lowest_hp", "effects": [{"kind": "damage", "atkMult": 1.6}]},
    {"id": "L10", "name": "Giftnebel", "tier": 2, "typeReq": "poison", "cooldown": 4, "initialCooldown": 2, "target": "enemy_all", "effects": [{"kind": "damage", "atkMult": 0.5}, {"kind": "status", "status": "poison", "chance": 0.6, "duration": 3, "stacks": 1}]},
    {"id": "L11", "name": "Felssturz", "tier": 2, "typeReq": "stone", "cooldown": 4, "initialCooldown": 3, "target": "default", "effects": [{"kind": "damage", "atkMult": 1.4}, {"kind": "status", "status": "stun", "chance": 0.25, "duration": 1}]},
    {"id": "L12", "name": "Schwirrflug", "tier": 2, "typeReq": "insect", "cooldown": 3, "initialCooldown": 1, "target": "default", "effects": [{"kind": "damage", "atkMult": 1.0}, {"kind": "status", "status": "spd_up", "chance": 1, "duration": 2, "value": 0.3, "target": "self"}]},
    {"id": "L13", "name": "Facettenschild", "tier": 2, "typeReq": "crystal", "cooldown": 4, "initialCooldown": 2, "target": "ally_lowest_hp_pct", "effects": [{"kind": "shield", "maxHpPctOfCaster": 0.15, "duration": 2}, {"kind": "status", "status": "def_up", "chance": 1, "duration": 2, "value": 0.2}]},
    {"id": "L14", "name": "Vernichtungsschlag", "tier": 3, "typeReq": null, "cooldown": 5, "initialCooldown": 3, "target": "default", "effects": [{"kind": "damage", "atkMult": 2.2}]},
    {"id": "L15", "name": "Massenheilung", "tier": 3, "typeReq": null, "cooldown": 5, "initialCooldown": 3, "target": "ally_all", "effects": [{"kind": "heal", "atkMult": 0.7}]},
    {"id": "L16", "name": "Läuterung", "tier": 3, "typeReq": null, "cooldown": 4, "initialCooldown": 2, "target": "ally_all", "effects": [{"kind": "cleanse"}, {"kind": "status", "status": "def_up", "chance": 1, "duration": 2, "value": 0.1}]}
  ],
  "passives": [
    {"id": "P01", "name": "Zähigkeit", "typeReq": null, "trigger": {"kind": "lethal_hit"}, "effects": [{"kind": "survive", "hp": 1}], "usesPerBattle": 1},
    {"id": "P02", "name": "Erstschlag", "typeReq": null, "trigger": {"kind": "battle_start"}, "effects": [{"kind": "status", "status": "spd_up", "chance": 1, "duration": 2, "value": 0.2, "target": "self"}], "usesPerBattle": 1},
    {"id": "P03", "name": "Lebensraub", "typeReq": null, "trigger": {"kind": "on_basic_attack"}, "effects": [{"kind": "lifesteal", "pctOfDamage": 0.15}], "usesPerBattle": 0},
    {"id": "P04", "name": "Notschild", "typeReq": null, "trigger": {"kind": "hp_below", "pct": 0.4}, "effects": [{"kind": "shield", "maxHpPctOfCaster": 0.2, "duration": 2, "target": "self"}], "usesPerBattle": 1},
    {"id": "P05", "name": "Rache", "typeReq": null, "trigger": {"kind": "on_ally_ko"}, "effects": [{"kind": "status", "status": "atk_up", "chance": 1, "duration": 2, "value": 0.2, "target": "self"}], "usesPerBattle": 2},
    {"id": "P06", "name": "Typmeister", "typeReq": null, "trigger": {"kind": "passive_mod"}, "effects": [{"kind": "mod", "stat": "strongTypeDamage", "value": 0.1}], "usesPerBattle": 0},
    {"id": "P07", "name": "Giftblut", "typeReq": "poison", "trigger": {"kind": "on_hit_taken"}, "effects": [{"kind": "status", "status": "poison", "chance": 0.3, "duration": 3, "stacks": 1, "target": "attacker"}], "usesPerBattle": 0},
    {"id": "P08", "name": "Kristallhaut", "typeReq": "crystal", "trigger": {"kind": "on_hit_taken", "firstOnly": true}, "effects": [{"kind": "mod", "stat": "damageTaken", "value": -0.5}], "usesPerBattle": 1}
  ]
}
```
`maxRankByTraining[stufe]`: Index = Trainingsgelände-Stufe (Index 0 unbenutzt). Der tatsächliche Max-Rang ist `min(maxRankByRarity[rarity], maxRankByTraining[trainingLevel])`. **[ANNAHME]**

---

## 2. Zucht

### 2.1 Zuchtstation (neues Gebäude, ersetzt den Platzhalter „Bald verfügbar“)

| Stufe | Kosten (Gold) | Bauzeit | Bedingung | Zucht-Slots | Dauer-Faktor |
|---|---|---|---|---|---|
| 1 | 5.000 | 30 Min. | Rathaus 5 | 1 | ×1,00 |
| 2 | 12.000 | 60 Min. | Rathaus 5 + Stage **2-10** gewonnen | 1 | ×0,85 |
| 3 | 25.000 | 120 Min. | Rathaus 5 + Zuchtstation 2 | 2 | ×0,75 |

Die Bauregeln aus P-GDD 2.1 gelten (1 Bau-Warteschlange, 100 % Erstattung bei Abbruch, `build_speed`-Ad). **[ANNAHME: alle Werte]**

### 2.2 Bedingungen

- 2 **verschiedene** Instanzen (gleiche Spezies erlaubt), beide **Lv ≥ 15**.
- Beide sind „ausgeruht“: `now ≥ breedReadyAt`. Nach einem Zuchtstart gilt für **beide Eltern 12 Std.** Abklingzeit (`breedReadyAt = start + 12 h`). **[ANNAHME]**
- Eltern werden **nicht verbraucht**. Sie dürfen während der Zucht kämpfen und trainieren, aber nicht freigelassen werden.
- Beliebige Typ-Kombinationen sind erlaubt. **[ANNAHME]**
- Monster-Lager hat beim **Abholen** einen freien Platz (60 Plätze, P-GDD 5.3). Ist es voll, wartet das Ei in der Station.

### 2.3 Kosten und Dauer

Maßgeblich ist die **Basis-Seltenheit der Zucht** `R0 = floor((rA + rB) / 2)` (rA, rB = aktuelle Seltenheit der Eltern-Instanzen).
Formel: `essenz = kostenTabelle[R0]`, `gold = essenz × 10` (gleiches Verhältnis wie bei der Aufwertung, P-GDD 5.3), `dauer = dauerTabelle[R0] × Dauer-Faktor`.

| R0 | Essenz | Gold | Dauer (Stufe 1) | zum Vergleich: Aufwertung R0 → R0+1 (Essenz) |
|---|---|---|---|---|
| 0 Gewöhnlich | 15 | 150 | 30 Min. | 50 |
| 1 Ungewöhnlich | 30 | 300 | 1 Std. | 120 |
| 2 Selten | 75 | 750 | 2 Std. | 300 |
| 3 Episch | 175 | 1.750 | 4 Std. | 700 |
| 4 Heroisch | 375 | 3.750 | 6 Std. | 1.500 |
| 5 Legendär | 875 | 8.750 | 8 Std. | 3.500 |
| 6 Mythisch | 2.000 | 20.000 | 12 Std. | 8.000 |
| 7 Göttlich | 4.500 | 45.000 | 16 Std. | 18.000 |
| 8 Kosmisch | 10.000 | 100.000 | 20 Std. | 40.000 |
| 9 Ursprung | 20.000 | 200.000 | 24 Std. | – |

Begründung: Eine Zucht kostet ca. **25 % einer Aufwertung**. Bei 25 % Aufstiegschance (2.4) liegen die **erwarteten Kosten für +1 Seltenheit** damit ungefähr gleichauf mit der Aufwertung (P-GDD 5.3). Zucht ist also kein Abkürzungsweg, sondern ein **zweiter, gleichwertiger Weg** mit Zusatznutzen (Potenzial, zweites Monster), wie im Konzept gefordert („Top-Stufen auch über Zucht/Aufwertung“). Anti-Exploit-Prüfung: Der Essenzwert beim Freilassen des Kindes (P-GDD 5.1) liegt im Erwartungswert in **jeder** Stufe unter den Zuchtkosten. „Züchten und freilassen“ lohnt sich also nie. **[ANNAHME]**

### 2.4 Ergebnisregeln

Alles wird beim **Zuchtstart** mit dem seedbaren PRNG gewürfelt und im Speicherstand abgelegt (`result`). Neu laden ändert das Ergebnis nicht.

**1. Seltenheit (zuerst):**
```
R0 = floor((rA + rB) / 2)
pUp = (rA == rB) ? 0,25 : 0,10
rarity = (rng() < pUp) ? min(9, R0 + 1) : R0
```
Das Kind kann dadurch nie mehr als **eine Stufe über dem besseren Elternteil** liegen. Ursprung (9) ist auch per Zucht erreichbar (2× Kosmisch → 25 %).

**2. Spezies und Typ:**
- Kandidaten = die Spezies von Elternteil A und B, aber nur die mit `baseRarity ≤ rarity`. Damit kann z. B. Sonnenphönix × Gewöhnlich keinen zusätzlichen Legendär-Phönix erzeugen.
- Zwei Kandidaten → je 50 %. Ein Kandidat → dieser. (Es gibt immer mindestens einen, weil `R0 ≥ min(rA, rB) ≥ baseRarity` dieses Elternteils.)
- Der Typ ist der Typ der Spezies (1 Typ pro Monster, P-GDD 4.1). Es gibt keine Misch-Typen und keine zucht-exklusiven Spezies in M2. **[ANNAHME]**

**3. Werte – Potenzial (neu):**
- Jede Instanz hat ein Potenzial je Wert `pot.hp`, `pot.atk`, `pot.def` ∈ 0 … 10. Gacha- und Start-Monster haben 0.
- Erweiterte Werteformel (P-GDD 3.1, abwärtskompatibel):
  ```
  stat = floor( base × rarityMult[rarity] × (1 + 0,08 × (level − 1)) × (1 + 0,01 × pot[stat]) )
  ```
  SPD hat kein Potenzial. Mit pot = 0 ergibt sich exakt die Prototyp-Formel.
- Kind: für jeden Wert getrennt
  ```
  pot_kind = min(10, floor((potA + potB) / 2) + bonus),   bonus: 0 (50 %), +1 (35 %), +2 (15 %)
  ```
  Erwartung +0,65 pro Generation, maximal +10 % auf HP/ATK/DEF. Das bringt spürbaren, aber begrenzten Fortschritt. **[ANNAHME]**

**4. Skill-Vererbung:** Hat mindestens ein Elternteil einen Lernskill in `learned`, der zum Typ des Kindes passt (`typeReq` null oder gleich), bekommt das Kind mit **30 %** einen davon (gleichverteilt) in `learned`. Er wird automatisch ausgerüstet, sobald Slot 2 frei ist. Passive und Signatur-Rang werden **nicht** vererbt. **[ANNAHME]**

**5. Sonstiges:** Kind startet mit Lv 1, 0 EP, Signatur-Rang 1, `generation = max(genA, genB) + 1`, `locked = false`. Das Ergebnisfenster zeigt vorher offen: Basis-Seltenheit, Aufstiegschance, mögliche Spezies, Potenzial-Spanne (Transparenz wie beim Gacha).

**Beispiele:**
| Eltern | R0 | pUp | Ergebnis-Seltenheit | Spezies |
|---|---|---|---|---|
| Tropfmolch (Gew., 0) × Knospling (Gew., 0) | 0 | 25 % | 75 % Gewöhnlich / 25 % Ungewöhnlich | je 50 % |
| Dornendryade (Episch, 3) × Strudelotter (Selten, 2) | 2 | 10 % | 90 % Selten / 10 % Episch | Selten: nur Strudelotter · Episch: je 50 % |
| Sonnenphönix (Legendär, 5) × Funkfuchs (Gew., 0) | 2 | 10 % | 90 % Selten / 10 % Episch | immer Funkfuchs (Phönix-baseRarity 5 > Ergebnis) |
| 2 × Heroisch (4) | 4 | 25 % | 75 % Heroisch / 25 % Legendär | je 50 % |

### 2.5 Rewarded Ad (Ergänzung zu P-GDD 9.2) **[ANNAHME]**

| ID | Ort | Belohnung | Limit/Tag | Bedingung |
|---|---|---|---|---|
| `breeding_speed` | Zucht-Slot | Restzeit −50 % | 2 | nur bei laufender Zucht |

Das globale Limit von 20 Rewarded Ads/Tag bleibt unverändert.

### 2.6 Datenstruktur (`/data/breeding.json`)
```json
{
  "building": { "levels": [
    { "level": 1, "cost": 5000,  "buildSec": 1800, "req": { "townhall": 5 },                     "slots": 1, "durationMult": 1.0 },
    { "level": 2, "cost": 12000, "buildSec": 3600, "req": { "townhall": 5, "stageCleared": "2-10" }, "slots": 1, "durationMult": 0.85 },
    { "level": 3, "cost": 25000, "buildSec": 7200, "req": { "townhall": 5, "breeding": 2 },        "slots": 2, "durationMult": 0.75 }
  ] },
  "minParentLevel": 15,
  "parentCooldownSec": 43200,
  "costByBaseRarity": [
    { "essence": 15,    "minutes": 30 },   { "essence": 30,    "minutes": 60 },
    { "essence": 75,    "minutes": 120 },  { "essence": 175,   "minutes": 240 },
    { "essence": 375,   "minutes": 360 },  { "essence": 875,   "minutes": 480 },
    { "essence": 2000,  "minutes": 720 },  { "essence": 4500,  "minutes": 960 },
    { "essence": 10000, "minutes": 1200 }, { "essence": 20000, "minutes": 1440 }
  ],
  "goldPerEssence": 10,
  "rarityUpChance": { "sameRarity": 0.25, "differentRarity": 0.10 },
  "potential": { "max": 10, "bonusWeights": { "0": 50, "1": 35, "2": 15 }, "statPctPerPoint": 0.01 },
  "skillInheritChance": 0.30
}
```

```ts
interface BreedingSlot { parentA: string; parentB: string; startAt: number; endsAt: number;
  result: { speciesId: string; rarity: Rarity; potential: { hp: number; atk: number; def: number }; inheritedSkill: string|null } }
```

---

## 3. Vier neue Typen: Gift, Stein, Insekt, Kristall

### 3.1 Entscheidung und Begründung

Alle 1.820 möglichen 4er-Kombinationen aus den 16 gesperrten Typen wurden mit der **unveränderten** Tabelle aus P-GDD 4.3 durchgerechnet. Bewertet wurde die Balance im entstehenden 8er-Feld: Netto-Vorteil je Typ = durchschnittlicher Schaden ausgeteilt − durchschnittlicher Schaden eingesteckt, dazu die Bedingungen „jeder Typ hat ≥ 1 Stärke und ≥ 1 Schwäche“ und „jeder neue Typ hat eine Beziehung zu den 4 Prototyp-Typen“.

**Ergebnis: {Gift, Stein, Insekt, Kristall} ist die mit Abstand ausgeglichenste Kombination** (Standardabweichung des Netto-Vorteils 0,047; zweitbeste 0,081; z. B. Blitz/Wind/Gift/Stein 0,115).

Gründe:
1. **Balance:** 6 der 8 Typen haben einen Netto-Vorteil von exakt 0. Nur Wasser (+0,09) und Pflanze (−0,09) weichen leicht ab. Der Prototyp-Kreis bleibt intakt.
2. **Jeder Typ hat 1–2 Stärken und 1–2 Schwächen** im aktiven Feld. Es gibt keinen „toten“ Typ (Eis z. B. hätte gegen die 4 Prototyp-Typen keine einzige Stärke).
3. **Neue Konter für alte Typen:** Stein schlägt Feuer, Insekt verliert gegen Feuer, Gift bedroht Pflanze, Kristall bedroht Erde. Die Prototyp-Monster bleiben dadurch relevant.
4. **Spielerische Identität:** Gift = Schaden über Zeit (neuer Status *Vergiftung*), Stein = Verteidigung/Kontrolle, Insekt = Tempo/Mehrfachtreffer, Kristall = Schilde/Reflexion. Das bringt neue Taktik, nicht nur neue Farben.
5. **Thema für Kapitel 2:** „Nebelsumpf & Kristallgrotten“ (Insekt/Gift im Sumpf, Stein/Kristall in den Grotten).
6. **Synergie-Kombos** ergeben sich natürlich: Erde + Stein + Kristall („Bollwerk“), Gift + Insekt + Pflanze („Sumpffieber“), Kap. 7.

Nicht gewählt (Auszug): Blitz/Eis/Wind (zu viele Schwächen untereinander, Eis ohne Stärke gegen das Startfeld), Licht/Schatten/Geist/Drache (Beziehungen fast nur untereinander, kaum Wechselwirkung mit dem Startfeld; eignen sich später als eigenes „Spät“-Paket).

### 3.2 Effektivität im aktiven 8er-Feld (Auszug aus P-GDD 4.4, unverändert; Zeile = Angreifer)

| Ang.\Vert. | Fe | Wa | Pf | Er | Gi | St | In | Kr | stark gegen | erleidet ×1,5 von |
|---|---|---|---|---|---|---|---|---|---|---|
| **Fe** Feuer | · | · | **1,5** | 0,75 | · | 0,75 | **1,5** | · | Pflanze, Insekt | Erde, Stein |
| **Wa** Wasser | · | · | 0,75 | **1,5** | · | **1,5** | · | · | Erde, Stein | Pflanze |
| **Pf** Pflanze | 0,75 | **1,5** | · | · | 0,75 | · | · | · | Wasser | Feuer, Gift |
| **Er** Erde | **1,5** | 0,75 | · | · | **1,5** | · | · | 0,75 | Feuer, Gift | Wasser, Kristall |
| **Gi** Gift | · | · | **1,5** | 0,75 | · | · | 0,75 | **1,5** | Pflanze, Kristall | Erde, Insekt |
| **St** Stein | **1,5** | 0,75 | · | · | · | · | · | · | Feuer | Wasser |
| **In** Insekt | 0,75 | · | · | · | **1,5** | · | · | · | Gift | Feuer |
| **Kr** Kristall | · | · | · | **1,5** | 0,75 | · | · | · | Erde | Gift |

Netto-Vorteil (Ø ausgeteilt − Ø eingesteckt, 8 Typen): Fe 0 · Wa +0,09 · Pf −0,09 · Er 0 · Gi 0 · St 0 · In 0 · Kr 0.
Pflanze ist leicht benachteiligt. Ausgeglichen wird das über die Monster (Moospanzer/Dornendryade bleiben stark) und die Kombo „Sumpffieber“, die Pflanze einschließt.

### 3.3 Freischaltung (schrittweise, Konzept: „Rest schrittweise“)

| Typ | Erste Begegnung | aktiv im Portal-Pool und für Zucht ab | Typ-Geschenk (einmalig, Erst-Sieg) |
|---|---|---|---|
| Insekt | Stage 2-1 | Erst-Sieg **2-1** | Surrlibelle (Gewöhnlich, Lv 1) |
| Gift | Stage 2-3 | Erst-Sieg **2-3** | Sumpfunke (Gewöhnlich, Lv 1) |
| Stein | Stage 2-5 | Erst-Sieg **2-5** | Kieselkrabbe (Gewöhnlich, Lv 1) |
| Kristall | Stage 2-7 | Erst-Sieg **2-7** | Quarzling (Gewöhnlich, Lv 1) |

- `activeTypes` ist ab M2 **Teil des Speicherstands** (Startwert `["fire","water","plant","earth"]`). Die Typmatrix bleibt immer vollständig definiert (P-GDD 4.5).
- Gacha-Pool je Seltenheit = Spezies mit `baseRarity == R` **und** `type ∈ activeTypes` (Ergänzung zu P-GDD 5.2). Die Ausweichregel bei leerem Pool bleibt. Das Portal-Info-Fenster listet den aktuellen Pool je Seltenheit.
- Gegner können einen Typ schon zeigen, bevor er aktiv ist (Vorschau). **[ANNAHME]**

```json
{
  "activeTypesStart": ["fire", "water", "plant", "earth"],
  "typeUnlocks": [
    { "type": "insect",  "onStageCleared": "2-1", "gift": { "speciesId": "m11", "rarity": 0, "level": 1 } },
    { "type": "poison",  "onStageCleared": "2-3", "gift": { "speciesId": "m14", "rarity": 0, "level": 1 } },
    { "type": "stone",   "onStageCleared": "2-5", "gift": { "speciesId": "m17", "rarity": 0, "level": 1 } },
    { "type": "crystal", "onStageCleared": "2-7", "gift": { "speciesId": "m20", "rarity": 0, "level": 1 } }
  ]
}
```

---

## 4. Neue Monster (m11–m25)

### 4.1 Klassen (neu, für Klassen-Synergien Kap. 7)

Jede Spezies bekommt eine **Klasse**. Die Reihen-Rolle (Front/Hinten, P-GDD 3.1) bleibt unabhängig davon bestehen.

| Klasse | ID | Bedeutung |
|---|---|---|
| Wächter | `guardian` | Spott, Schild, DEF |
| Kämpfer | `fighter` | Nahkampf-Schaden |
| Schütze | `shooter` | Fernkampf-Schaden |
| Stütze | `support` | Heilung, Schilde |
| Störer | `disruptor` | Debuffs, Kontrolle, Schaden über Zeit |

Klassen der 10 Prototyp-Monster (sonst unverändert): Funkfuchs Schütze · Tropfmolch Stütze · Knospling Stütze · Lehmbrocken Wächter · Aschewiesel Kämpfer · Moospanzer Wächter · Strudelotter Schütze · Sandviper Störer · Dornendryade Störer · Sonnenphönix Schütze.

### 4.2 Tabelle

Basiswerte für Lv 1 ohne Seltenheits-Multiplikator (wie P-GDD 3.2). „Roh-KK“ = `HP×0,2 + ATK×2 + DEF×1,5` (Kap. 8.1) auf Basiswerten, zum Vergleich: Prototyp-Monster liegen bei 82–109, der Sonnenphönix bei 130.

| ID | Name | Typ | Basis-Seltenheit | HP | ATK | DEF | SPD | Reihe | Klasse | Fähigkeit (CD / Start-CD) | Roh-KK |
|---|---|---|---|---|---|---|---|---|---|---|---|
| m11 | **Surrlibelle** | Insekt | Gewöhnlich | 100 | 26 | 10 | 116 | Hinten | Schütze | **Doppelstich** (3/1): Standardziel: 2× 75 % ATK. | 87,0 |
| m12 | **Panzerkäfer** | Insekt | Ungewöhnlich | 175 | 18 | 21 | 86 | Front | Wächter | **Chitinpanzer** (4/2): selbst: Schild 20 % eigene Max-HP (2 R.) + *DEF +20 %* (2 R.). | 102,5 |
| m13 | **Vespira** | Insekt | Heroisch | 150 | 34 | 14 | 114 | Hinten | Schütze | **Schwarmangriff** (4/3): zufälliger Gegner je Treffer: 4× 50 % ATK. | 119,0 |
| m14 | **Sumpfunke** | Gift | Gewöhnlich | 165 | 19 | 17 | 88 | Front | Kämpfer | **Giftschleim** (3/2): Standardziel: 100 % ATK + 80 % Chance auf *Vergiftung (1 Stapel)* (3 R.). | 96,5 |
| m15 | **Nesselqualle** | Gift | Selten | 125 | 29 | 12 | 104 | Hinten | Störer | **Nesselregen** (4/2): alle Gegner: 60 % ATK + 50 % Chance auf *Vergiftung (1 Stapel)* (3 R.). | 101,0 |
| m16 | **Fäulnisnatter** | Gift | Episch | 140 | 32 | 13 | 110 | Hinten | Störer | **Zersetzung** (4/3): Standardziel: 130 % ATK + *ATK −25 %* (2 R.) + *Vergiftung (2 Stapel)* (3 R.). | 111,5 |
| m17 | **Kieselkrabbe** | Stein | Gewöhnlich | 170 | 17 | 24 | 78 | Front | Wächter | **Panzerschale** (4/1): selbst: Schild 20 % eigene Max-HP (2 R.) + *Spott* (2 R.). | 104,0 |
| m18 | **Geröllgolem** | Stein | Selten | 190 | 20 | 23 | 72 | Front | Kämpfer | **Erdrutsch** (4/2): alle Gegner der Frontreihe: 80 % ATK + *SPD −20 %* (2 R.). | 112,5 |
| m19 | **Basaltwidder** | Stein | Heroisch | 195 | 28 | 20 | 90 | Front | Kämpfer | **Rammbock** (3/2): Standardziel: 160 % ATK, ignoriert 30 % DEF. | 125,0 |
| m20 | **Quarzling** | Kristall | Gewöhnlich | 115 | 20 | 14 | 98 | Hinten | Stütze | **Prismaschild** (4/2): alle Verbündeten: Schild 10 % eigene Max-HP (2 R.). | 84,0 |
| m21 | **Spiegelluchs** | Kristall | Ungewöhnlich | 120 | 27 | 12 | 112 | Hinten | Schütze | **Lichtbrechung** (3/2): Hinterreihe, niedrigste HP: 130 % ATK + 50 % Chance auf *ATK −15 %* (2 R.). | 96,0 |
| m22 | **Amethystwächter** | Kristall | Episch | 190 | 22 | 23 | 84 | Front | Wächter | **Kristallspiegel** (4/2): selbst: *Spott* (2 R.) + *Dornen 40 %* (2 R.). | 116,5 |
| m23 | **Prismakoloss** | Kristall | Legendär | 190 | 32 | 20 | 96 | Front | Kämpfer | **Prismastrahl** (4/3): alle Gegner der Hinterreihe: 110 % ATK + *DEF −20 %* (2 R.). **Passiv – Kristallherz:** fällt die HP erstmals unter 50 %: Schild 25 % eigene Max-HP (2 R.), 1× pro Kampf. | 132,0 |
| m24 | **Tiefseewal** | Wasser | Heroisch | 230 | 22 | 20 | 82 | Front | Stütze | **Flutwelle** (4/2): alle Gegner der Frontreihe: 80 % ATK + Heilung 50 % ATK (alle Verbündeten). | 120,0 |
| m25 | **Bebenwurm** | Erde | Heroisch | 190 | 27 | 21 | 84 | Front | Kämpfer | **Beben** (4/2): alle Gegner: 70 % ATK + 20 % Chance auf *Betäubung* (1 Zug). | 123,5 |

**Verteilung (alle 25 Monster):** Gewöhnlich 8 · Ungewöhnlich 4 · Selten 4 · Episch 3 · Heroisch 4 · Legendär 2 · Mythisch+ 0 (weiter über Ausweichregel P-GDD 5.2, Aufwertung und Zucht).
**Je Typ:** Feuer 3 · Wasser 3 · Pflanze 3 · Erde 3 · Gift 3 · Stein 3 · Insekt 3 · Kristall 4. Jeder neue Typ hat ≥ 1 Front- und ≥ 1 Hinten-Monster. Ausnahme Stein: alle 3 Front (Thema „Mauer“), Hinten-Stein kommt später. **[ANNAHME]**
**Heroisch-Pool** ist vor Kapitel 2 nicht mehr leer: Tiefseewal (Wasser) und Bebenwurm (Erde) gehören zu Typen, die schon aktiv sind.
Werte-Leitplanke: Roh-KK steigt mit der Basis-Seltenheit (Gew. 84–104, Ungew. 96–103, Selten 101–113, Episch 109–117, Heroisch 119–125, Legendär 130–132). Alle Namen, Werte und Fähigkeiten sind **[ANNAHME]**.

### 4.3 Rollen im Team (Kurzbeschreibung für UI-Tooltips)

| Monster | Rolle in einem Satz |
|---|---|
| Surrlibelle | schneller Fernkampf-Einstieg, gut gegen Gift und Hinterreihen mit wenig HP |
| Panzerkäfer | robuster Front-Blocker mit Schild, Insekt-Konter gegen Gift |
| Vespira | verteilt 4 Treffer, ideal gegen Schilde und viele schwache Gegner |
| Sumpfunke | billiger Gift-Frontmann, setzt Dauerschaden auf Tanks |
| Nesselqualle | flächiger Gift-Störer, stark gegen Heiler-Teams |
| Fäulnisnatter | Boss-Killer: Gift ×2 Stapel + ATK-Senkung |
| Kieselkrabbe | Gewöhnlicher Spott-Tank mit Schild, Stein-Konter gegen Feuer |
| Geröllgolem | verlangsamt die gegnerische Front, sehr hohe DEF |
| Basaltwidder | Front-Schadensmacher, durchdringt Verteidigung |
| Quarzling | Team-Schild für alle, ideal für Kristall-Teams |
| Spiegelluchs | jagt die gegnerische Hinterreihe, schwächt Angreifer |
| Amethystwächter | Spott + 40 % Dornen, bestraft Mehrfachangriffe |
| Prismakoloss | Front-Legende, bricht die Hinterreihe auf, Schild bei 50 % |
| Tiefseewal | Front-Heiler: Schaden vorne + Gruppenheilung |
| Bebenwurm | Flächenschaden mit Betäubungschance, Erd-Kämpfer |

### 4.4 `/data/monsters.json` – neue Einträge (vollständig) und Klassen-Ergänzung
```json
[
  {"id": "m11", "name": "Surrlibelle", "type": "insect", "baseRarity": 0, "role": "back", "class": "shooter", "base": {"hp": 100, "atk": 26, "def": 10, "spd": 116}, "skill": {"id": "double_sting", "cooldown": 3, "initialCooldown": 1, "target": "default", "effects": [{"kind": "damage", "atkMult": 0.75, "hits": 2}], "name": "Doppelstich"}, "sprite": "mon_m11"},
  {"id": "m12", "name": "Panzerkäfer", "type": "insect", "baseRarity": 1, "role": "front", "class": "guardian", "base": {"hp": 175, "atk": 18, "def": 21, "spd": 86}, "skill": {"id": "chitin_guard", "cooldown": 4, "initialCooldown": 2, "target": "self", "effects": [{"kind": "shield", "maxHpPctOfCaster": 0.2, "duration": 2}, {"kind": "status", "status": "def_up", "chance": 1, "duration": 2, "value": 0.2}], "name": "Chitinpanzer"}, "sprite": "mon_m12"},
  {"id": "m13", "name": "Vespira", "type": "insect", "baseRarity": 4, "role": "back", "class": "shooter", "base": {"hp": 150, "atk": 34, "def": 14, "spd": 114}, "skill": {"id": "swarm_strike", "cooldown": 4, "initialCooldown": 3, "target": "enemy_random", "effects": [{"kind": "damage", "atkMult": 0.5, "hits": 4}], "name": "Schwarmangriff"}, "sprite": "mon_m13"},
  {"id": "m14", "name": "Sumpfunke", "type": "poison", "baseRarity": 0, "role": "front", "class": "fighter", "base": {"hp": 165, "atk": 19, "def": 17, "spd": 88}, "skill": {"id": "toxic_slime", "cooldown": 3, "initialCooldown": 2, "target": "default", "effects": [{"kind": "damage", "atkMult": 1.0}, {"kind": "status", "status": "poison", "chance": 0.8, "duration": 3, "stacks": 1}], "name": "Giftschleim"}, "sprite": "mon_m14"},
  {"id": "m15", "name": "Nesselqualle", "type": "poison", "baseRarity": 2, "role": "back", "class": "disruptor", "base": {"hp": 125, "atk": 29, "def": 12, "spd": 104}, "skill": {"id": "nettle_rain", "cooldown": 4, "initialCooldown": 2, "target": "enemy_all", "effects": [{"kind": "damage", "atkMult": 0.6}, {"kind": "status", "status": "poison", "chance": 0.5, "duration": 3, "stacks": 1}], "name": "Nesselregen"}, "sprite": "mon_m15"},
  {"id": "m16", "name": "Fäulnisnatter", "type": "poison", "baseRarity": 3, "role": "back", "class": "disruptor", "base": {"hp": 140, "atk": 32, "def": 13, "spd": 110}, "skill": {"id": "decay", "cooldown": 4, "initialCooldown": 3, "target": "default", "effects": [{"kind": "damage", "atkMult": 1.3}, {"kind": "status", "status": "atk_down", "chance": 1, "duration": 2, "value": 0.25}, {"kind": "status", "status": "poison", "chance": 1, "duration": 3, "stacks": 2}], "name": "Zersetzung"}, "sprite": "mon_m16"},
  {"id": "m17", "name": "Kieselkrabbe", "type": "stone", "baseRarity": 0, "role": "front", "class": "guardian", "base": {"hp": 170, "atk": 17, "def": 24, "spd": 78}, "skill": {"id": "shell_guard", "cooldown": 4, "initialCooldown": 1, "target": "self", "effects": [{"kind": "shield", "maxHpPctOfCaster": 0.2, "duration": 2}, {"kind": "status", "status": "taunt", "chance": 1, "duration": 2}], "name": "Panzerschale"}, "sprite": "mon_m17"},
  {"id": "m18", "name": "Geröllgolem", "type": "stone", "baseRarity": 2, "role": "front", "class": "fighter", "base": {"hp": 190, "atk": 20, "def": 23, "spd": 72}, "skill": {"id": "landslide", "cooldown": 4, "initialCooldown": 2, "target": "enemy_front_all", "effects": [{"kind": "damage", "atkMult": 0.8}, {"kind": "status", "status": "spd_down", "chance": 1, "duration": 2, "value": 0.2}], "name": "Erdrutsch"}, "sprite": "mon_m18"},
  {"id": "m19", "name": "Basaltwidder", "type": "stone", "baseRarity": 4, "role": "front", "class": "fighter", "base": {"hp": 195, "atk": 28, "def": 20, "spd": 90}, "skill": {"id": "battering_ram", "cooldown": 3, "initialCooldown": 2, "target": "default", "effects": [{"kind": "damage", "atkMult": 1.6, "defPierce": 0.3}], "name": "Rammbock"}, "sprite": "mon_m19"},
  {"id": "m20", "name": "Quarzling", "type": "crystal", "baseRarity": 0, "role": "back", "class": "support", "base": {"hp": 115, "atk": 20, "def": 14, "spd": 98}, "skill": {"id": "prism_shield", "cooldown": 4, "initialCooldown": 2, "target": "ally_all", "effects": [{"kind": "shield", "maxHpPctOfCaster": 0.1, "duration": 2}], "name": "Prismaschild"}, "sprite": "mon_m20"},
  {"id": "m21", "name": "Spiegelluchs", "type": "crystal", "baseRarity": 1, "role": "back", "class": "shooter", "base": {"hp": 120, "atk": 27, "def": 12, "spd": 112}, "skill": {"id": "refraction", "cooldown": 3, "initialCooldown": 2, "target": "enemy_back_lowest_hp", "effects": [{"kind": "damage", "atkMult": 1.3}, {"kind": "status", "status": "atk_down", "chance": 0.5, "duration": 2, "value": 0.15}], "name": "Lichtbrechung"}, "sprite": "mon_m21"},
  {"id": "m22", "name": "Amethystwächter", "type": "crystal", "baseRarity": 3, "role": "front", "class": "guardian", "base": {"hp": 190, "atk": 22, "def": 23, "spd": 84}, "skill": {"id": "crystal_mirror", "cooldown": 4, "initialCooldown": 2, "target": "self", "effects": [{"kind": "status", "status": "taunt", "chance": 1, "duration": 2}, {"kind": "status", "status": "thorns", "chance": 1, "duration": 2, "value": 0.4}], "name": "Kristallspiegel"}, "sprite": "mon_m22"},
  {"id": "m23", "name": "Prismakoloss", "type": "crystal", "baseRarity": 5, "role": "front", "class": "fighter", "base": {"hp": 190, "atk": 32, "def": 20, "spd": 96}, "skill": {"id": "prism_beam", "cooldown": 4, "initialCooldown": 3, "target": "enemy_back_all", "effects": [{"kind": "damage", "atkMult": 1.1}, {"kind": "status", "status": "def_down", "chance": 1, "duration": 2, "value": 0.2}], "name": "Prismastrahl"}, "passive": {"id": "crystal_heart", "trigger": {"kind": "hp_below", "pct": 0.5}, "effects": [{"kind": "shield", "maxHpPctOfCaster": 0.25, "duration": 2, "target": "self"}], "usesPerBattle": 1}, "sprite": "mon_m23"},
  {"id": "m24", "name": "Tiefseewal", "type": "water", "baseRarity": 4, "role": "front", "class": "support", "base": {"hp": 230, "atk": 22, "def": 20, "spd": 82}, "skill": {"id": "tidal_wave", "cooldown": 4, "initialCooldown": 2, "target": "enemy_front_all", "effects": [{"kind": "damage", "atkMult": 0.8}, {"kind": "heal", "atkMult": 0.5, "target": "ally_all"}], "name": "Flutwelle"}, "sprite": "mon_m24"},
  {"id": "m25", "name": "Bebenwurm", "type": "earth", "baseRarity": 4, "role": "front", "class": "fighter", "base": {"hp": 190, "atk": 27, "def": 21, "spd": 84}, "skill": {"id": "quake", "cooldown": 4, "initialCooldown": 2, "target": "enemy_all", "effects": [{"kind": "damage", "atkMult": 0.7}, {"kind": "status", "status": "stun", "chance": 0.2, "duration": 1}], "name": "Beben"}, "sprite": "mon_m25"}
]
```
Klassen-Ergänzung für die Prototyp-Einträge (Feld `class` wird beim Laden gesetzt, falls nicht vorhanden):
```json
{"m01": "shooter", "m02": "support", "m03": "support", "m04": "guardian", "m05": "fighter", "m06": "guardian", "m07": "shooter", "m08": "disruptor", "m09": "disruptor", "m10": "shooter"}
```
---

## 5. Kampagne Kapitel 1–2

### 5.1 Allgemeine Regeln (Ergänzung zu P-GDD 7.10 und 8.2)

- Gegner-Level, Gegner-Seltenheit, Gegneranzahl und alle Belohnungsformeln sind **unverändert** aus P-GDD 7.10/8.2. M2 legt nur die konkreten Teams, Gegner-Skills und Bosse fest.
- Gegner bekommen die Seltenheit der Stage (`enemyRarity`), auch wenn sie unter der `baseRarity` der Spezies liegt (z. B. Moospanzer als Gewöhnlich in 1-6). **[ANNAHME]**
- Gegner-Teams erhalten **Typ-Synergien (Kap. 7) ab Stage 1-6** (erste Stage nach Rathaus 2, ab dem auch der Spieler Typ-Synergien hat) und **Klassen-Synergien ab Stage 1-9** (erste Stage nach Rathaus 3). **[ENTSCHIEDEN]**
- Jede Stage hat ein `hint` (Typ-Tipp, im Stage-Fenster vor dem Kampf). 2-9 und 2-10 haben zusätzlich einen `stageText`, der **vorab auf Gift gegen den Prismakoloss hinweist**. **[ENTSCHIEDEN]**
- Gegner-Lernskills ab 2-4 (fest pro Slot, siehe Tabelle), immer Signatur-Rang 1, Potenzial 0.
- **Bosse:** HP ×1,5 (P-GDD), neu **ATK ×0,85**, Betäubungs-Chance gegen Bosse ×0,5, Vergiftung 2 % statt 4 % pro Stapel. Ohne den ATK-Abschlag war 2-10 in der Simulation für Teams ohne Typvorteil auch 4 Level über Gegner-Level nicht zu schaffen. **[ANNAHME]** Der Boss von 2-10 hat Seltenheit **Selten** (statt Episch), siehe 5.3. **[ENTSCHIEDEN]**
- Beschworene Einheiten bekommen keine Synergien, keine Belohnung und müssen für den Sieg ebenfalls besiegt werden. Für die Sterne zählen nur eigene K.O.s (P-GDD 7.7).
- Verbrennung und Vergiftung werden **nicht** vom Schild abgefangen (Klarstellung, gilt auch für P-GDD `burn`). **[ANNAHME]**
- **Empf. KK** = `ceil(1,1 × Gegner-KK)` wird im Stage-Fenster angezeigt (Kap. 8.1). Richtwert: Das Standardteam erreichte ≥ 70 % Siegquote bei Team-KK zwischen 1,02 und 1,23 × Gegner-KK, also im Mittel bei ≈ 1,1.
- **Std.-Lv / Opt.-Lv** = niedrigstes Team-Level mit ≥ 70 % Siegquote (100 Seeds) für:
  - *Standardteam*: F1 Aschewiesel (Ungew.), F2 Moospanzer (Ungew.), H1 Dornendryade (Episch), H2 Strudelotter (Selten), H3 Sandviper (Selten). Das entspricht dem typischen Ergebnis aus Tutorial-10er + erster 10er-Ziehung. Je nach Freischaltung 3/4/5 Plätze. Ab 1-9 Lernskill L01 auf F1, ab 2-1 zusätzlich L08 auf H1. In 2-10 mit F1/F2 auf Selten aufgewertet. *Gift-Variante* (nur 2-10): wie Standardteam, aber H3 Nesselqualle (Selten) statt Sandviper.
  - *Optimiert* (nur Kap. 2): F1 Aschewiesel (Selten), F2 Panzerkäfer, H1 Dornendryade, H2 Nesselqualle, H3 Fäulnisnatter, Lernskills L02/L08/L10, d. h. mit Typvorteil und Synergien.

### 5.2 Kapitel 1 – „Das Tal von Velunor“ (nur Prototyp-Typen)

| Stage | Name | Gegner-Lv | Seltenheit | Gegner (Platz: Monster) | Gegner-Skills | Typ-Tipp | Gegner-KK | Empf. KK | Std.-Lv |
|---|---|---|---|---|---|---|---|---|---|
| **1-1** | Dorfbrunnen | 1 | Gewöhnlich | F1: Tropfmolch · H1: Funkfuchs | – | Pflanze (gg. Wasser), Erde (gg. Feuer) | 188 | 207 | 1 |
| **1-2** | Lehmpfad | 2 | Gewöhnlich | F1: Lehmbrocken · H1: Knospling | – | Wasser (gg. Erde), Feuer (gg. Pflanze) | 193 | 213 | 1 |
| **1-3** | Mühlbach | 3 | Gewöhnlich | F1: Lehmbrocken · F2: Tropfmolch · H1: Funkfuchs | – | Wasser, Erde | 328 | 361 | 1 |
| **1-4** | Uferwiese | 5 | Gewöhnlich | F1: Tropfmolch · F2: Lehmbrocken · H1: Knospling | – | Feuer, Pflanze; Heiler zuerst | 362 | 399 | 1 |
| **1-5** | Ascheacker | 6 | Gewöhnlich | F1: Aschewiesel · F2: Lehmbrocken · H1: Funkfuchs | – | Erde (gg. Feuer), Wasser (gg. Erde) | 411 | 453 | 4 |
| **1-6** | Moosgrund | 7 | Gewöhnlich | F1: Moospanzer · F2: Tropfmolch · H1: Knospling · H2: Strudelotter | – | Feuer (gg. Pflanze), Pflanze (gg. Wasser) | 559 | 615 | 2 |
| **1-7** | Sandhang | 8 | Gewöhnlich | F1: Lehmbrocken · F2: Aschewiesel · H1: Sandviper · H2: Funkfuchs | – | Wasser (gg. Erde), Erde (gg. Feuer) | 618 | 680 | 5 |
| **1-8** | Wurzelhain | 9 | Ungewöhnlich | F1: Moospanzer · F2: Lehmbrocken · H1: Knospling · H2: Sandviper | – | Feuer, Wasser; Dornen beachten | 727 | 800 | 6 |
| **1-9** | Glutlichtung | 11 | Ungewöhnlich | F1: Aschewiesel · F2: Moospanzer · H1: Funkfuchs · H2: Strudelotter · H3: Knospling | – | Erde, Feuer; gemischt – Synergie lohnt | 991 | 1.091 | 8 |
| **1-10** | Herz des Hains | 12 | Ungewöhnlich + Boss Episch | F1: Moospanzer · F2: Lehmbrocken · H1: Knospling · H2: **BOSS Dornendryade** (Episch) · H3: Funkfuchs | – | **Feuer** (3 Pflanze-Gegner inkl. Boss) | 1.128 | 1.241 | 11 |

**Boss 1-10 – „Hüterin des Hains“** (Dornendryade, Episch-Boss, Lv 12, Platz H2; HP ×1,5, ATK ×0,85)
| Mechanik | Auslöser | Wirkung |
|---|---|---|
| Signatur *Wurzelgeflecht* | CD 4 / Start-CD 3 | 70 % ATK auf alle + *DEF −20 %* (2 R.) |
| **Wurzelruf** | HP fällt erstmals unter 50 % | beschwört 1 **Knospling** (Ungewöhnlich, Lv 10) auf den ersten leeren Frontplatz (F1, dann F2). Ist keiner frei: alle Gegner heilen 15 % ihrer Max-HP. |
| **Blütenzorn** | Beginn von Runde 12 | Boss *ATK +30 %* bis Kampfende |
| Statusresistenz | immer | Betäubungs-Chance ×0,5 |

Lerneffekt: **Typvorteil** (Feuer ×1,5 auf 3 Pflanze-Gegner) und **Fokus**. Ist die Front geräumt, bevor der Boss unter 50 % fällt, stellt sich ein Knospling als Blocker vor ihn. Lebt die Front noch, heilt der Wurzelruf stattdessen alle Gegner. Wer zu langsam ist, läuft ab Runde 12 in den Blütenzorn. Simulation (Standardteam, 5 Plätze): Lv 11 → 82 % Sieg, Lv 13 → ≈ 96 %.

### 5.3 Kapitel 2 – „Nebelsumpf & Kristallgrotten“ (führt die 4 neuen Typen ein)

| Stage | Name | Gegner-Lv | Seltenheit | Gegner (Platz: Monster) | Gegner-Skills | Typ-Tipp | Gegner-KK | Empf. KK | Std.-Lv | Opt.-Lv |
|---|---|---|---|---|---|---|---|---|---|---|
| **2-1** | Summende Senke | 13 | Ungewöhnlich | F1: Panzerkäfer · F2: Lehmbrocken · H1: Surrlibelle · H2: Surrlibelle · H3: Knospling | – | **Feuer** (gg. Insekt + Pflanze) | 1.027 | 1.130 | 9 | 8 |
| **2-2** | Schilfgürtel | 14 | Ungewöhnlich | F1: Panzerkäfer · F2: Moospanzer · H1: Surrlibelle · H2: Strudelotter · H3: Knospling | – | Feuer | 1.110 | 1.221 | 10 | 8 |
| **2-3** | Giftmoor | 15 | Ungewöhnlich | F1: Sumpfunke · F2: Panzerkäfer · H1: Nesselqualle · H2: Surrlibelle · H3: Knospling | – | Erde/Insekt (gg. Gift), Feuer (gg. Insekt) | 1.135 | 1.249 | 13 | 11 |
| **2-4** | Faulwasser | 17 | Ungewöhnlich | F1: Sumpfunke · F2: Sumpfunke · H1: Nesselqualle · H2: Fäulnisnatter · H3: Surrlibelle | F1: Kräftiger Hieb, H1: Kräftiger Hieb, H3: Kräftiger Hieb | **Erde, Insekt** (4× Gift) | 1.281 | 1.410 | 17 | 14 |
| **2-5** | Geröllpass | 18 | Selten | F1: Kieselkrabbe · F2: Geröllgolem · H1: Sandviper · H2: Funkfuchs · H3: Nesselqualle | F1: Kräftiger Hieb, H1: Kräftiger Hieb, H3: Kräftiger Hieb | **Wasser** (gg. Stein + Erde) | 1.567 | 1.724 | 20 | 20 |
| **2-6** | Steinbruch | 19 | Selten | F1: Geröllgolem · F2: Kieselkrabbe · H1: Sandviper · H2: Strudelotter · H3: Funkfuchs | F1: Felssturz, H1: Schlammwurf, H3: Funkenregen | Wasser; Pflanze gg. Strudelotter | 1.632 | 1.796 | 21 | 21 |
| **2-7** | Kristallgrotte | 20 | Selten | F1: Kieselkrabbe · F2: Amethystwächter · H1: Quarzling · H2: Spiegelluchs · H3: Sandviper | F1: Felssturz, H1: Facettenschild, H3: Schlammwurf | **Gift** (gg. Kristall), Wasser (gg. Stein/Erde) | 1.646 | 1.811 | 22 | 17 |
| **2-8** | Spiegelhalle | 21 | Selten | F1: Geröllgolem · F2: Amethystwächter · H1: Quarzling · H2: Spiegelluchs · H3: Nesselqualle | F1: Präzisionsschuss, H1: Präzisionsschuss, H3: Präzisionsschuss | Gift, Wasser | 1.715 | 1.887 | 25 | 18 |
| **2-9** | Prismenschlucht | 23 | Selten | F1: Panzerkäfer · F2: Geröllgolem · H1: Fäulnisnatter · H2: Spiegelluchs · H3: Quarzling | F1: Schwirrflug, H1: Giftnebel, H3: Facettenschild | gemischt: Gift, Feuer, Wasser · **Vorschau Boss: Gift-Monster mitnehmen** | 1.805 | 1.986 | 24 | 18 |
| **2-10** | Thron des Prismakoloss | 24 | Selten + Boss Selten | F1: **BOSS Prismakoloss** (Selten) · F2: Kieselkrabbe · H1: Quarzling · H2: Surrlibelle · H3: Knospling | – | **Gift** (gg. Kristall + Pflanze), Feuer (gg. Insekt + Pflanze) | 1.827 | 2.010 | 26 | 19 |

Typ-Einführung: **2-1 Insekt → 2-3 Gift → 2-5 Stein → 2-7 Kristall** (Erst-Sieg schaltet den Typ frei und schenkt ein Gewöhnliches Monster, Kap. 3.3). 2-1 und 2-2 sind bewusst eine **Verschnaufpause** nach dem Boss (Std.-Lv 9–10 bei Gegner-Lv 13–14). Ab 2-5 (Seltenheit Selten) braucht das Standardteam **+1 bis +4 Level über Gegner-Level**. Das optimierte Team schafft 2-7 bis 2-10 dagegen 5–7 Level früher. Taktik (Typ, Synergie, Skills) spart also messbar Level.

**Boss 2-10 – „Thron des Prismakoloss“** (Prismakoloss, Boss mit Seltenheit **Selten**, Lv 24, Platz F1; HP ×1,5, ATK ×0,85) **[ENTSCHIEDEN – entschärft]**
| Mechanik | Auslöser | Wirkung |
|---|---|---|
| Signatur *Prismastrahl* | CD 4 / Start-CD 3 | 110 % ATK auf alle in der Hinterreihe + *DEF −20 %* (2 R.) |
| Angeboren *Kristallherz* | HP erstmals < 50 % | Schild 25 % Max-HP (2 R.) |
| **Prismaphase I / II** | HP erstmals < 66 % bzw. < 33 % | je Schild 10 % Max-HP (2 R.) |
| **Resonanzwelle** | Beginn der Runden 5, 10, 15, 20 | 50 % ATK auf **alle** Spieler-Monster (Kristall-Treffer, normale Formel) |
| **Zorn** | Beginn von Runde 15 | *ATK +50 %* bis Kampfende |
| Statusresistenz | immer | Betäubung ×0,5, Vergiftung 2 %/Stapel |

Lerneffekt: Schilde brechen (Mehrfachtreffer: Surrlibelle, Vespira), Dauerschaden (Gift ignoriert Schilde und ist ×1,5 gegen Kristall), und Erde **nicht** mitnehmen (Kristall ×1,5 gegen Erde). **Entschärfung (Entscheidung):** Der Boss steht jetzt mit Seltenheit **Selten** statt Episch im Kampf (Seltenheit ist pro Exemplar, die Spezies bleibt unverändert; Gegner dürfen unter baseRarity liegen, Kap. 5.1). Alle Mechaniken bleiben. Ziel war ≈ 3 Level Abstand zwischen einem Team **ohne** und **mit** Gift-Monster. Simulation (≥ 70 % Siegquote, 100 Seeds):

| Team | vorher (Boss Episch) | jetzt (Boss Selten) |
|---|---|---|
| Standardteam ohne Gift (F1/F2 Selten) | Lv 28 | **Lv 26** (95 %) |
| Gift-Variante (H3 Nesselqualle statt Sandviper) | Lv 26 | **Lv 23** (79 %) |
| Optimiertes Team | Lv 21 | **Lv 19** (76 %) |

Abstand ohne/mit Gift-Monster damit **3 Level**. Das Standardteam braucht nur noch +2 Level über Gegner-Level (vorher +4). Der frühere Wert „≈ 7 Level“ war vor allem der Abstand zum optimierten Team (Episch-Monster, Synergien, Lernskills) und ist kein reiner Gift-Effekt. Der Gift-Hinweis steht schon im Stage-Text von 2-9 und 2-10 (`stageText`, Kap. 5.5). 2-10 bleibt der **„Taktik-Check“ von M2**, ist aber auch ohne Gift mit etwas Training lösbar.

### 5.4 Sterne-Truhen (neu) **[ANNAHME]**

Pro Kapitel sind 30 ★ möglich (10 Stages × 3 ★). Jede Truhe gibt es einmalig:

| Kapitel | 10 ★ | 20 ★ | 30 ★ |
|---|---|---|---|
| 1 | 500 Gold + 30 Juwelen | 1.500 Gold + 50 Essenz | 2.000 Gold + 1 Beschwörungsticket |
| 2 | 1.500 Gold + 50 Juwelen | 2.500 Gold + 80 Essenz | 3.500 Gold + 1 Beschwörungsticket |

Zweck: Die Goldlücke vor Rathaus 4 (6.000 Gold) wird kleiner, und 3★ nachzuholen lohnt sich. Summe: 11.500 Gold, 80 Juwelen, 130 Essenz, 2 Tickets zusätzlich zur Kampagnen-Summe aus P-GDD 8.2.

### 5.5 `/data/stages.json` (vollständig, 20 Stages)
```json
[
  {"id": "1-1", "name": "Dorfbrunnen", "chapter": 1, "enemyLevel": 1, "enemyRarity": 0, "enemySynergies": false, "enemyClassSynergies": false, "enemies": [{"slot": "F1", "speciesId": "m02"}, {"slot": "H1", "speciesId": "m01"}], "hint": "Pflanze (gg. Wasser), Erde (gg. Feuer)", "rewards": {"firstClear": {"gold": 140, "gems": 30, "exp": 45}, "repeat": {"gold": 70, "exp": 45}, "threeStarBonus": {"gems": 20}}, "recommendedKK": 207},
  {"id": "1-2", "name": "Lehmpfad", "chapter": 1, "enemyLevel": 2, "enemyRarity": 0, "enemySynergies": false, "enemyClassSynergies": false, "enemies": [{"slot": "F1", "speciesId": "m04"}, {"slot": "H1", "speciesId": "m03"}], "hint": "Wasser (gg. Erde), Feuer (gg. Pflanze)", "rewards": {"firstClear": {"gold": 180, "gems": 30, "exp": 60}, "repeat": {"gold": 90, "exp": 60}, "threeStarBonus": {"gems": 20}}, "recommendedKK": 213},
  {"id": "1-3", "name": "Mühlbach", "chapter": 1, "enemyLevel": 3, "enemyRarity": 0, "enemySynergies": false, "enemyClassSynergies": false, "enemies": [{"slot": "F1", "speciesId": "m04"}, {"slot": "F2", "speciesId": "m02"}, {"slot": "H1", "speciesId": "m01"}], "hint": "Wasser, Erde", "rewards": {"firstClear": {"gold": 220, "gems": 30, "exp": 75}, "repeat": {"gold": 110, "exp": 75}, "threeStarBonus": {"gems": 20}}, "recommendedKK": 361},
  {"id": "1-4", "name": "Uferwiese", "chapter": 1, "enemyLevel": 5, "enemyRarity": 0, "enemySynergies": false, "enemyClassSynergies": false, "enemies": [{"slot": "F1", "speciesId": "m02"}, {"slot": "F2", "speciesId": "m04"}, {"slot": "H1", "speciesId": "m03"}], "hint": "Feuer, Pflanze; Heiler zuerst", "rewards": {"firstClear": {"gold": 260, "gems": 30, "exp": 90}, "repeat": {"gold": 130, "exp": 90}, "threeStarBonus": {"gems": 20}}, "recommendedKK": 399},
  {"id": "1-5", "name": "Ascheacker", "chapter": 1, "enemyLevel": 6, "enemyRarity": 0, "enemySynergies": false, "enemyClassSynergies": false, "enemies": [{"slot": "F1", "speciesId": "m05"}, {"slot": "F2", "speciesId": "m04"}, {"slot": "H1", "speciesId": "m01"}], "hint": "Erde (gg. Feuer), Wasser (gg. Erde)", "rewards": {"firstClear": {"gold": 300, "gems": 30, "exp": 105}, "repeat": {"gold": 150, "exp": 105}, "threeStarBonus": {"gems": 20}}, "recommendedKK": 453},
  {"id": "1-6", "name": "Moosgrund", "chapter": 1, "enemyLevel": 7, "enemyRarity": 0, "enemySynergies": true, "enemyClassSynergies": false, "enemies": [{"slot": "F1", "speciesId": "m06"}, {"slot": "F2", "speciesId": "m02"}, {"slot": "H1", "speciesId": "m03"}, {"slot": "H2", "speciesId": "m07"}], "hint": "Feuer (gg. Pflanze), Pflanze (gg. Wasser)", "rewards": {"firstClear": {"gold": 340, "gems": 30, "exp": 120}, "repeat": {"gold": 170, "exp": 120}, "threeStarBonus": {"gems": 20}}, "recommendedKK": 615},
  {"id": "1-7", "name": "Sandhang", "chapter": 1, "enemyLevel": 8, "enemyRarity": 0, "enemySynergies": true, "enemyClassSynergies": false, "enemies": [{"slot": "F1", "speciesId": "m04"}, {"slot": "F2", "speciesId": "m05"}, {"slot": "H1", "speciesId": "m08"}, {"slot": "H2", "speciesId": "m01"}], "hint": "Wasser (gg. Erde), Erde (gg. Feuer)", "rewards": {"firstClear": {"gold": 380, "gems": 30, "exp": 135}, "repeat": {"gold": 190, "exp": 135}, "threeStarBonus": {"gems": 20}}, "recommendedKK": 680},
  {"id": "1-8", "name": "Wurzelhain", "chapter": 1, "enemyLevel": 9, "enemyRarity": 1, "enemySynergies": true, "enemyClassSynergies": false, "enemies": [{"slot": "F1", "speciesId": "m06"}, {"slot": "F2", "speciesId": "m04"}, {"slot": "H1", "speciesId": "m03"}, {"slot": "H2", "speciesId": "m08"}], "hint": "Feuer, Wasser; Dornen beachten", "rewards": {"firstClear": {"gold": 420, "gems": 30, "exp": 150}, "repeat": {"gold": 210, "exp": 150}, "threeStarBonus": {"gems": 20}}, "recommendedKK": 800},
  {"id": "1-9", "name": "Glutlichtung", "chapter": 1, "enemyLevel": 11, "enemyRarity": 1, "enemySynergies": true, "enemyClassSynergies": true, "enemies": [{"slot": "F1", "speciesId": "m05"}, {"slot": "F2", "speciesId": "m06"}, {"slot": "H1", "speciesId": "m01"}, {"slot": "H2", "speciesId": "m07"}, {"slot": "H3", "speciesId": "m03"}], "hint": "Erde, Feuer; gemischt – Synergie lohnt", "rewards": {"firstClear": {"gold": 460, "gems": 30, "exp": 165}, "repeat": {"gold": 230, "exp": 165}, "threeStarBonus": {"gems": 20}}, "recommendedKK": 1091},
  {"id": "1-10", "name": "Herz des Hains", "chapter": 1, "enemyLevel": 12, "enemyRarity": 1, "enemySynergies": true, "enemyClassSynergies": true, "enemies": [{"slot": "F1", "speciesId": "m06"}, {"slot": "F2", "speciesId": "m04"}, {"slot": "H1", "speciesId": "m03"}, {"slot": "H3", "speciesId": "m01"}], "hint": "Feuer (3 Pflanze-Gegner inkl. Boss)", "boss": {"slot": "H2", "speciesId": "m09", "rarity": 3, "hpMult": 1.5, "atkMult": 0.85, "statusResist": {"stunChanceMult": 0.5, "poisonPctPerStack": 0.02}, "mechanics": [{"id": "root_call", "trigger": {"kind": "hp_below", "pct": 0.5}, "actions": [{"kind": "summon", "speciesId": "m03", "level": 10, "rarity": 1, "slots": ["F1", "F2"], "max": 1, "fallback": {"kind": "heal_all_pct", "pct": 0.15}}]}, {"id": "bloom_rage", "trigger": {"kind": "round_start", "fromRound": 12}, "actions": [{"kind": "status", "target": "self", "status": "atk_up", "value": 0.3, "duration": 99}]}]}, "rewards": {"firstClear": {"gold": 500, "gems": 100, "exp": 180, "essence": 100, "tickets": 1}, "repeat": {"gold": 250, "exp": 180}, "threeStarBonus": {"gems": 20}}, "recommendedKK": 1241},
  {"id": "2-1", "name": "Summende Senke", "chapter": 2, "enemyLevel": 13, "enemyRarity": 1, "enemySynergies": true, "enemyClassSynergies": true, "enemies": [{"slot": "F1", "speciesId": "m12"}, {"slot": "F2", "speciesId": "m04"}, {"slot": "H1", "speciesId": "m11"}, {"slot": "H2", "speciesId": "m11"}, {"slot": "H3", "speciesId": "m03"}], "hint": "Feuer (gg. Insekt + Pflanze)", "onFirstClear": {"unlockType": "insect", "gift": {"speciesId": "m11", "rarity": 0, "level": 1}}, "rewards": {"firstClear": {"gold": 540, "gems": 30, "exp": 195}, "repeat": {"gold": 270, "exp": 195}, "threeStarBonus": {"gems": 20}}, "recommendedKK": 1130},
  {"id": "2-2", "name": "Schilfgürtel", "chapter": 2, "enemyLevel": 14, "enemyRarity": 1, "enemySynergies": true, "enemyClassSynergies": true, "enemies": [{"slot": "F1", "speciesId": "m12"}, {"slot": "F2", "speciesId": "m06"}, {"slot": "H1", "speciesId": "m11"}, {"slot": "H2", "speciesId": "m07"}, {"slot": "H3", "speciesId": "m03"}], "hint": "Feuer", "rewards": {"firstClear": {"gold": 580, "gems": 30, "exp": 210}, "repeat": {"gold": 290, "exp": 210}, "threeStarBonus": {"gems": 20}}, "recommendedKK": 1221},
  {"id": "2-3", "name": "Giftmoor", "chapter": 2, "enemyLevel": 15, "enemyRarity": 1, "enemySynergies": true, "enemyClassSynergies": true, "enemies": [{"slot": "F1", "speciesId": "m14"}, {"slot": "F2", "speciesId": "m12"}, {"slot": "H1", "speciesId": "m15"}, {"slot": "H2", "speciesId": "m11"}, {"slot": "H3", "speciesId": "m03"}], "hint": "Erde/Insekt (gg. Gift), Feuer (gg. Insekt)", "onFirstClear": {"unlockType": "poison", "gift": {"speciesId": "m14", "rarity": 0, "level": 1}}, "rewards": {"firstClear": {"gold": 620, "gems": 30, "exp": 225}, "repeat": {"gold": 310, "exp": 225}, "threeStarBonus": {"gems": 20}}, "recommendedKK": 1249},
  {"id": "2-4", "name": "Faulwasser", "chapter": 2, "enemyLevel": 17, "enemyRarity": 1, "enemySynergies": true, "enemyClassSynergies": true, "enemies": [{"slot": "F1", "speciesId": "m14", "learned": "L01"}, {"slot": "F2", "speciesId": "m14"}, {"slot": "H1", "speciesId": "m15", "learned": "L01"}, {"slot": "H2", "speciesId": "m16"}, {"slot": "H3", "speciesId": "m11", "learned": "L01"}], "hint": "Erde, Insekt (4× Gift)", "rewards": {"firstClear": {"gold": 660, "gems": 30, "exp": 240}, "repeat": {"gold": 330, "exp": 240}, "threeStarBonus": {"gems": 20}}, "recommendedKK": 1410},
  {"id": "2-5", "name": "Geröllpass", "chapter": 2, "enemyLevel": 18, "enemyRarity": 2, "enemySynergies": true, "enemyClassSynergies": true, "enemies": [{"slot": "F1", "speciesId": "m17", "learned": "L01"}, {"slot": "F2", "speciesId": "m18"}, {"slot": "H1", "speciesId": "m08", "learned": "L01"}, {"slot": "H2", "speciesId": "m01"}, {"slot": "H3", "speciesId": "m15", "learned": "L01"}], "hint": "Wasser (gg. Stein + Erde)", "onFirstClear": {"unlockType": "stone", "gift": {"speciesId": "m17", "rarity": 0, "level": 1}}, "rewards": {"firstClear": {"gold": 700, "gems": 30, "exp": 255}, "repeat": {"gold": 350, "exp": 255}, "threeStarBonus": {"gems": 20}}, "recommendedKK": 1724},
  {"id": "2-6", "name": "Steinbruch", "chapter": 2, "enemyLevel": 19, "enemyRarity": 2, "enemySynergies": true, "enemyClassSynergies": true, "enemies": [{"slot": "F1", "speciesId": "m18", "learned": "L11"}, {"slot": "F2", "speciesId": "m17"}, {"slot": "H1", "speciesId": "m08", "learned": "L07"}, {"slot": "H2", "speciesId": "m07"}, {"slot": "H3", "speciesId": "m01", "learned": "L04"}], "hint": "Wasser; Pflanze gg. Strudelotter", "rewards": {"firstClear": {"gold": 740, "gems": 30, "exp": 270}, "repeat": {"gold": 370, "exp": 270}, "threeStarBonus": {"gems": 20}}, "recommendedKK": 1796},
  {"id": "2-7", "name": "Kristallgrotte", "chapter": 2, "enemyLevel": 20, "enemyRarity": 2, "enemySynergies": true, "enemyClassSynergies": true, "enemies": [{"slot": "F1", "speciesId": "m17", "learned": "L11"}, {"slot": "F2", "speciesId": "m22"}, {"slot": "H1", "speciesId": "m20", "learned": "L13"}, {"slot": "H2", "speciesId": "m21"}, {"slot": "H3", "speciesId": "m08", "learned": "L07"}], "hint": "Gift (gg. Kristall), Wasser (gg. Stein/Erde)", "onFirstClear": {"unlockType": "crystal", "gift": {"speciesId": "m20", "rarity": 0, "level": 1}}, "rewards": {"firstClear": {"gold": 780, "gems": 30, "exp": 285}, "repeat": {"gold": 390, "exp": 285}, "threeStarBonus": {"gems": 20}}, "recommendedKK": 1811},
  {"id": "2-8", "name": "Spiegelhalle", "chapter": 2, "enemyLevel": 21, "enemyRarity": 2, "enemySynergies": true, "enemyClassSynergies": true, "enemies": [{"slot": "F1", "speciesId": "m18", "learned": "L09"}, {"slot": "F2", "speciesId": "m22"}, {"slot": "H1", "speciesId": "m20", "learned": "L09"}, {"slot": "H2", "speciesId": "m21"}, {"slot": "H3", "speciesId": "m15", "learned": "L09"}], "hint": "Gift, Wasser", "rewards": {"firstClear": {"gold": 820, "gems": 30, "exp": 300}, "repeat": {"gold": 410, "exp": 300}, "threeStarBonus": {"gems": 20}}, "recommendedKK": 1887},
  {"id": "2-9", "name": "Prismenschlucht", "chapter": 2, "enemyLevel": 23, "enemyRarity": 2, "enemySynergies": true, "enemyClassSynergies": true, "enemies": [{"slot": "F1", "speciesId": "m12", "learned": "L12"}, {"slot": "F2", "speciesId": "m18"}, {"slot": "H1", "speciesId": "m16", "learned": "L10"}, {"slot": "H2", "speciesId": "m21"}, {"slot": "H3", "speciesId": "m20", "learned": "L13"}], "hint": "gemischt: Gift, Feuer, Wasser · Vorschau Boss: Gift-Monster mitnehmen", "stageText": "Hinter der Schlucht wartet der Prismakoloss. Kristall hält viel aus, aber Gift frisst sich durch jeden Schild. Nimm mindestens ein Gift-Monster mit (z. B. das Geschenk aus 2-3: Sumpfunke).", "rewards": {"firstClear": {"gold": 860, "gems": 30, "exp": 315}, "repeat": {"gold": 430, "exp": 315}, "threeStarBonus": {"gems": 20}}, "recommendedKK": 1986},
  {"id": "2-10", "name": "Thron des Prismakoloss", "chapter": 2, "enemyLevel": 24, "enemyRarity": 2, "enemySynergies": true, "enemyClassSynergies": true, "enemies": [{"slot": "F2", "speciesId": "m17"}, {"slot": "H1", "speciesId": "m20"}, {"slot": "H2", "speciesId": "m11"}, {"slot": "H3", "speciesId": "m03"}], "hint": "Gift (gg. Kristall + Pflanze), Feuer (gg. Insekt + Pflanze)", "stageText": "Der Prismakoloss schützt sich mit Kristallschilden. Tipp: Gift-Monster sind ×1,5 gegen Kristall und ihr Gift wirkt durch Schilde. Erde-Monster lieber zu Hause lassen.", "boss": {"slot": "F1", "speciesId": "m23", "rarity": 2, "hpMult": 1.5, "atkMult": 0.85, "statusResist": {"stunChanceMult": 0.5, "poisonPctPerStack": 0.02}, "mechanics": [{"id": "prism_phase_1", "trigger": {"kind": "hp_below", "pct": 0.66}, "actions": [{"kind": "shield", "target": "self", "maxHpPct": 0.1, "duration": 2}]}, {"id": "prism_phase_2", "trigger": {"kind": "hp_below", "pct": 0.33}, "actions": [{"kind": "shield", "target": "self", "maxHpPct": 0.1, "duration": 2}]}, {"id": "resonance", "trigger": {"kind": "round_start", "every": 5}, "actions": [{"kind": "damage", "target": "enemy_all", "atkMult": 0.5}]}, {"id": "enrage", "trigger": {"kind": "round_start", "fromRound": 15}, "actions": [{"kind": "status", "target": "self", "status": "atk_up", "value": 0.5, "duration": 99}]}]}, "rewards": {"firstClear": {"gold": 900, "gems": 100, "exp": 330, "essence": 100, "tickets": 1}, "repeat": {"gold": 450, "exp": 330}, "threeStarBonus": {"gems": 20}}, "recommendedKK": 2010}
]
```
```json
{
  "starChests": {
    "1": [ { "stars": 10, "reward": { "gold": 500, "gems": 30 } }, { "stars": 20, "reward": { "gold": 1500, "essence": 50 } }, { "stars": 30, "reward": { "gold": 2000, "tickets": 1 } } ],
    "2": [ { "stars": 10, "reward": { "gold": 1500, "gems": 50 } }, { "stars": 20, "reward": { "gold": 2500, "essence": 80 } }, { "stars": 30, "reward": { "gold": 3500, "tickets": 1 } } ]
  }
}
```
Trigger-Semantik der Boss-Mechaniken: `hp_below` feuert 1× pro Kampf nach dem ersten Treffer, der die Grenze unterschreitet. `round_start` mit `fromRound` feuert 1× zu Beginn dieser Runde. `round_start` mit `every: N` feuert zu Beginn jeder N-ten Runde. `duration: 99` = bis Kampfende. Mechaniken werden vor den Zügen der Runde und in der Reihenfolge des Arrays ausgeführt.

---

## 6. Tägliche Aufgaben

### 6.1 Liste (ab Rathaus 2, wie P-GDD)

| ID | Aufgabe | Ziel | Belohnung | ab |
|---|---|---|---|---|
| `win3` | Gewinne Kämpfe (Kampagne, auch Wiederholungen, Mehrfach-Kampf zählt je Kampf) | 3 | 20 Juwelen | Rathaus 2 |
| `mine2` | Sammle die Goldmine ein (nur wenn ≥ 1 Gold eingesammelt wird) | 2 | 20 Juwelen | Rathaus 2 |
| `train1` | Schließe ein Training ab (EP- oder Skill-Training) | 1 | 20 Juwelen | Rathaus 2 |
| `levelup1` | Ein Monster steigt mindestens 1 Level auf (Kampf oder Training) | 1 | 300 Gold | Rathaus 2 |
| `synergy2` | Gewinne Kämpfe mit mindestens einer aktiven Synergie (Kap. 7) | 2 | 20 Essenz | Rathaus 2 |
| *Bonus* `pull1` | Führe eine Beschwörung durch (Juwelen, Ticket oder Gratis-Ziehung) | 1 | 300 Gold | Rathaus 2 |
| *Bonus* `breed1` | Starte oder schließe eine Zucht ab | 1 | 30 Essenz | Zuchtstation 1 |
| **Abschluss-Truhe** | alle **5 Basis-Aufgaben** (`win3`, `mine2`, `train1`, `levelup1`, `synergy2`) erledigt | – | **40 Juwelen + 500 Gold + 30 Essenz** | Rathaus 2 |

- Juwelen pro Tag aus Login + Aufgaben: 50 + 60 + 40 = **150**, also exakt wie P-GDD 8.4. Die Werbeobergrenze („höchstens ca. 40 % mehr Juwelen durch Ads“) bleibt eingehalten.
- Die 5 Basis-Aufgaben sind **jeden Tag ohne Werbung und ohne Juwelen** erfüllbar. Die Bonus-Aufgaben `pull1` (bräuchte Juwelen, Ticket oder die Werbe-Gratisziehung) und `breed1` (erst ab Zucht) zählen deshalb **nicht** zur Abschluss-Truhe. `pull1` gibt Gold statt Juwelen, damit kein Gacha-Kreislauf entsteht. **[ANNAHME]**
- `levelup1` kann bei einem Team aus lauter Max-Level-Monstern auch durch ein Lager-Monster im Training erfüllt werden.

### 6.2 Reset und Regeln

- Reset täglich **04:00 Ortszeit des Geräts** (wie P-GDD 8.3). `dayKey = localDate(now − 4 h)` im Format `YYYY-MM-DD`.
- Fortschritt zählt erst ab Freischaltung (Rathaus 2). Vorher Geschafftes zählt nicht rückwirkend.
- Belohnungen müssen abgeholt werden („Abholen“-Button mit Ausrufezeichen). **Nicht abgeholte, erledigte Aufgaben werden beim Reset automatisch gutgeschrieben**, damit nichts verloren geht. **[ANNAHME]**
- Uhr-Manipulation: Ist `now < lastSeen`, gibt es keinen neuen Reset, bis `now > lastSeen` (wie P-GDD 2.1: negatives Delta = 0).
- Der Login-Bonus (50 Juwelen + 200 Gold, Serie Tag 7 → Ticket) bleibt unverändert und ist keine Aufgabe.

### 6.3 `/data/daily.json`
```json
{
  "resetHourLocal": 4,
  "unlock": { "townhall": 2 },
  "quests": [
    { "id": "win3",     "event": "battle_won",          "target": 3, "reward": { "gems": 20 },    "countsForChest": true },
    { "id": "mine2",    "event": "mine_collected",      "target": 2, "reward": { "gems": 20 },    "countsForChest": true },
    { "id": "train1",   "event": "training_completed",  "target": 1, "reward": { "gems": 20 },    "countsForChest": true },
    { "id": "levelup1", "event": "monster_level_up",    "target": 1, "reward": { "gold": 300 },   "countsForChest": true },
    { "id": "synergy2", "event": "battle_won_with_synergy", "target": 2, "reward": { "essence": 20 }, "countsForChest": true },
    { "id": "pull1",    "event": "gacha_pull",          "target": 1, "reward": { "gold": 300 },   "countsForChest": false },
    { "id": "breed1",   "event": "breeding_started_or_claimed", "target": 1, "reward": { "essence": 30 }, "countsForChest": false, "unlock": { "breeding": 1 } }
  ],
  "chest": { "reward": { "gems": 40, "gold": 500, "essence": 30 } },
  "autoClaimOnReset": true
}
```

---

## 7. Team-Synergien

### 7.1 Übersicht (ersetzt P-GDD 7.9 als Gesamtliste; die Typ-Stufen sind unverändert)

**A) Typ-Stufen** (wie P-GDD 7.9, gelten nur für die Monster dieses Typs):
| Monster gleichen Typs | Bonus |
|---|---|
| 2 | +5 % ATK |
| 3 | +10 % ATK, +5 % HP |
| 4 | +15 % ATK, +10 % HP |
| 5 | +20 % ATK, +15 % HP |

**B) Typ-Kombos** (je ≥ 1 Monster der genannten Typen im Team):
| Kombo | Bedingung | Bonus | für |
|---|---|---|---|
| **Elementarkreis** (P-GDD) | Feuer + Wasser + Pflanze + Erde | +8 % SPD | alle |
| **Bollwerk** (neu) | Erde + Stein + Kristall | +10 % DEF | alle |
| **Sumpffieber** (neu) | Gift + Insekt + Pflanze | +10 % ATK | Monster dieser 3 Typen |
| **Vielfalt** (neu) | ≥ 5 verschiedene Typen | +5 % HP | alle |

**C) Klassen-Synergien** (neu, nach Anzahl der Klasse im Team; **erst ab Rathaus 3**, damit die Typ-Synergien ab Rathaus 2 zuerst allein erklärt werden) **[ENTSCHIEDEN]**:
| Klasse | Schwelle | Bonus | für |
|---|---|---|---|
| Wächter | 2 | +15 % DEF | Wächter |
| Kämpfer | 2 / 3 | +10 % ATK / +15 % ATK und +5 % SPD | Kämpfer |
| Schütze | 2 / 3 | +10 Prozentpunkte Krit-Chance / +15 Pp. Krit-Chance und Krit-Schaden ×1,7 statt ×1,5 | Schützen |
| Stütze | 1 / 2 | Heilung und Schilde +10 % / +20 % | **alle** (wirkt auf Heilungen/Schilde, die Teammitglieder wirken) |
| Störer | 2 / 3 | +10 / +15 Pp. Chance auf negative Statuseffekte | Störer |
| **Ausgewogen** | ≥ 1 Wächter **und** ≥ 1 Stütze **und** ≥ 2 aus Kämpfer/Schütze | +5 % HP | alle |

### 7.2 Regeln

- Es zählen nur Monster, die zu **Kampfbeginn** auf dem Feld stehen. K.O. oder Beschwörungen ändern Synergien während des Kampfes nicht.
- Pro Typ bzw. Klasse gilt nur die **höchste erreichte Stufe**. Unterschiedliche Synergien addieren sich pro Wert: `atkBonus = Σ aller ATK-Boni`.
- **Obergrenze je Wert aus Synergien: +35 %** (HP, ATK, DEF, SPD einzeln). Krit-Chance gesamt max. 50 %. **[ANNAHME]**
- Anwendung in P-GDD 7.2: `stat = Instanzwert × Positionsbonus × (1 + Σ Synergie-Boni des Werts)`. Buffs im Kampf rechnen danach wie bisher.
- UI: TeamScene zeigt aktive Synergien als Icons mit Schwellen-Fortschritt („Kämpfer 2/3“). Inaktive, aber erreichbare Synergien sind ausgegraut.
- Freischaltung: Typ-Stufen und Typ-Kombos ab **Rathaus 2** (P-GDD), Klassen-Synergien und „Ausgewogen“ ab **Rathaus 3** (neuer Eintrag `class_synergies` in `unlocks` von Rathaus 3 in `buildings.json`). Vorher zeigt die TeamScene Klassen-Icons nur ausgegraut mit Hinweis „ab Rathaus 3“. **[ENTSCHIEDEN]**
- Gegner bekommen Typ-Synergien ab Stage 1-6 und Klassen-Synergien ab Stage 1-9 (Kap. 5.1).

Beispiel: F1 Aschewiesel (Feuer, Kämpfer), F2 Panzerkäfer (Insekt, Wächter), H1 Dornendryade (Pflanze, Störer), H2 Nesselqualle (Gift, Störer), H3 Fäulnisnatter (Gift, Störer):
Gift 2 → Nesselqualle/Fäulnisnatter +5 % ATK · Sumpffieber → Panzerkäfer, Dryade, Qualle, Natter +10 % ATK · Störer 3 → +15 Pp. Statuschance · Vielfalt (Feuer, Insekt, Pflanze, Gift = 4 Typen) → **nicht** aktiv · Ausgewogen → nicht aktiv (keine Stütze).

### 7.3 `/data/synergies.json`
```json
{
  "capPerStat": 0.35, "critChanceCap": 0.5, "enemySynergiesFromStage": "1-6", "enemyClassSynergiesFromStage": "1-9",
  "unlock": { "typeSynergies": { "townhall": 2 }, "classSynergies": { "townhall": 3 } },
  "typeTiers": { "2": { "atk": 0.05 }, "3": { "atk": 0.10, "hp": 0.05 }, "4": { "atk": 0.15, "hp": 0.10 }, "5": { "atk": 0.20, "hp": 0.15 } },
  "typeCombos": [
    { "id": "elemental_circle", "requires": ["fire", "water", "plant", "earth"], "bonus": { "spd": 0.08 }, "appliesTo": "all" },
    { "id": "bulwark",          "requires": ["earth", "stone", "crystal"],      "bonus": { "def": 0.10 }, "appliesTo": "all" },
    { "id": "swamp_fever",      "requires": ["poison", "insect", "plant"],      "bonus": { "atk": 0.10 }, "appliesTo": "matching" },
    { "id": "diversity",        "minDistinctTypes": 5,                          "bonus": { "hp": 0.05 },  "appliesTo": "all" }
  ],
  "classTiers": {
    "guardian":  [ { "count": 2, "bonus": { "def": 0.15 }, "appliesTo": "class" } ],
    "fighter":   [ { "count": 2, "bonus": { "atk": 0.10 }, "appliesTo": "class" }, { "count": 3, "bonus": { "atk": 0.15, "spd": 0.05 }, "appliesTo": "class" } ],
    "shooter":   [ { "count": 2, "bonus": { "critChance": 0.10 }, "appliesTo": "class" }, { "count": 3, "bonus": { "critChance": 0.15, "critDamage": 0.2 }, "appliesTo": "class" } ],
    "support":   [ { "count": 1, "bonus": { "healShield": 0.10 }, "appliesTo": "all" }, { "count": 2, "bonus": { "healShield": 0.20 }, "appliesTo": "all" } ],
    "disruptor": [ { "count": 2, "bonus": { "statusChance": 0.10 }, "appliesTo": "class" }, { "count": 3, "bonus": { "statusChance": 0.15 }, "appliesTo": "class" } ]
  },
  "balanced": { "requires": { "guardian": 1, "support": 1, "fighterOrShooter": 2 }, "bonus": { "hp": 0.05 }, "appliesTo": "all" }
}
```

---

## 8. Belohnungs- und Schwierigkeitskurve – erste 2 Spielstunden

### 8.1 Kampfkraft (KK) – Power-Level für UI und Balancing

```
KK(Monster) = round( (HP × 0,2 + ATK × 2 + DEF × 1,5) × (1 + 0,10 × belegte Zusatz-Slots) )
```
- HP/ATK/DEF = Instanzwerte nach P-GDD 3.1 (inkl. Seltenheit, Level, Potenzial), **ohne** Positionsbonus und Synergien. Zusatz-Slots = Slot 2 und Slot 3 (0–2).
- **Team-KK** = Summe der aufgestellten Monster. **Gegner-KK** genauso, Boss mit HP ×1,5 und ATK ×0,85.
- Anzeige: Team-KK in TeamScene, Gegner-KK und **Empf. KK** (= `ceil(1,1 × Gegner-KK)`) im Stage-Fenster, farbig: grün ≥ Empf., gelb ≥ Gegner-KK, rot darunter.
- Validierung: Bei Team-KK / Gegner-KK ≈ **1,02–1,23** lag die Siegquote des Standardteams im Simulator bei ≥ 70 % (Ausnahme Boss 2-10, Kap. 5.3). KK ist nur ein Richtwert, Typ und Aufstellung können ±20 % ausmachen.

### 8.2 Annahmen des Kurvenmodells **[ANNAHME]**

Aktiver Neuspieler, eine durchgehende Sitzung, Tag 1. Ø **1,5 Min. pro Kampf** inkl. Menüs (2×/4×). Spielt die nächste Stage, sobald das Team-Level das Std.-Lv (Kap. 5) erreicht, sonst Wiederholung der höchsten Stage. Bauprioriät Rathaus > Goldmine > Trainingsgelände. Trainingsslot dauerhaft belegt (30-Min.-Blöcke, EP auf das Team verteilt). Erster Lernskill sobald möglich. 10er-Ziehung, sobald 900 Juwelen da sind. Ab Rathaus 3 Duplikate freilassen (≈ 40 Essenz pro 10er). 3★ in 1-1 … 1-8 und 2-1 … 2-4, sonst 2★. Ergebnis der Tutorial-Ziehung = Standardteam (Kap. 5.1). Alle Werte aus P-GDD + M2 (Sterne-Truhen, Tagesaufgaben).
„Mit Werbung“: 10× `double_reward` auf Wiederholungen, 3× `gem_bonus`, 3× `mine_boost`, 1× `free_pull`, **kein** `build_speed`.

### 8.3 Zeitachse (ohne Werbung)

| Min. | Fortschritt (höchste Stage → nächste) | Team-Lv | Rathaus / Mine / Training | Gold verdient (kum.) | Juwelen verdient (kum.) | Essenz (Bestand) | Ziehungen (kum.) | Team-KK | Gegner-KK nächste Stage | Verhältnis |
|---|---|---|---|---|---|---|---|---|---|---|
| 2 | 1-1 → 1-2 | 2 | 1 / 1 / 1 | 1.041 | 500 | 0 | 10 | 426 | 193 | 2,21 |
| 10 | 1-7 → 1-8 | 6 | 2 / 1 / 1 | 4.730 | 1.030 | 50 | 20 | 739 | 727 | 1,02 |
| 21 | 1-9 → 1-10 | 9 | 2 / 2 / 1 | 6.720 | 1.110 | 50 | 20 | 869 | 1.128 | 0,77 |
| 30 | 1-9 → 1-10 | 10 | 3 / 3 / 2 | 8.620 | 1.450 | 60 | 20 | 1.145 | 1.128 | 1,02 |
| 40 | 1-10 → 2-1 | 12 | 3 / 3 / 3 | 10.635 | 1.550 | 160 | 21 | 1.250 | 1.027 | 1,22 |
| 51 | 1-10 → 2-1 | 13 | 3 / 3 / 3 | 12.420 | 1.550 | 160 | 21 | 1.306 | 1.027 | 1,27 |
| 60 | 1-10 → 2-1 | 14 | 3 / 3 / 3 | 13.950 | 1.550 | 160 | 21 | 1.377 | 1.027 | 1,34 |
| 70 | 2-3 → 2-4 | 16 | 4 / 3 / 3 | 16.845 | 2.100 | 200 | 31 | 1.492 | 1.281 | 1,16 |
| 81 | 2-4 → 2-5 | 17 | 4 / 3 / 3 | 20.920 | 2.200 | 200 | 31 | 1.544 | 1.567 | 0,99 |
| 90 | 2-4 → 2-5 | 18 | 4 / 4 / 3 | 22.942 | 2.200 | 200 | 31 | 1.600 | 1.567 | 1,02 |
| 100 | 2-4 → 2-5 | 19 | 4 / 4 / 3 | 25.308 | 2.200 | 200 | 31 | 1.655 | 1.567 | 1,06 |
| 111 | 2-5 → 2-6 | 20 | 4 / 4 / 4 | 28.084 | 2.230 | 200 | 31 | 1.711 | 1.632 | 1,05 |
| 120 | 2-6 → 2-7 | 21 | 4 / 4 / 4 | 30.642 | 2.260 | 200 | 31 | 1.764 | 1.646 | 1,07 |

Startwerte (Min. 0): 500 Gold + 200 Tutorial-Gold + 200 Login-Gold, 300 + 50 Juwelen, +100 Juwelen „erstes Episch“, Tutorial-10er gratis. Die Spalte „Gold/Juwelen verdient“ enthält diese Startwerte.

### 8.4 Meilensteine im Vergleich

| Meilenstein | ohne Werbung | mit Werbung |
|---|---|---|
| Stage 1-5 (Rathaus 2 freigeschaltet) | 8 Min. | 8 Min. |
| Rathaus 2 fertig | 10 Min. | 10 Min. |
| erste eigene 10er-Ziehung | 10 Min. | 10 Min. |
| Rathaus 3 fertig (5 Plätze, Skills) | 22 Min. | 22 Min. |
| Boss 1-10 besiegt | 33 Min. | 24 Min. |
| erster Lernskill fertig | 60 Min. | 60 Min. |
| Rathaus 4 fertig (Kapitel 2) | 63 Min. | 44 Min. |
| Stage 2-1 (Insekt aktiv) | 64 Min. | 45 Min. |
| Stage 2-3 (Gift aktiv) | 68 Min. | 48 Min. |
| Stage 2-5 (Stein aktiv) | 108 Min. | 92 Min. |
| Stage 2-7 (Kristall aktiv) | nach 2 Std. | 114 Min. |
| Boss 2-10 | nach 2 Std. | nach 2 Std. |

**Stand nach 120 Minuten:**
| | ohne Werbung | mit Werbung |
|---|---|---|
| Höchste Stage | 2-6 | 2-7 |
| Team-Level (Ø) | 21 | 22 |
| Gold verdient gesamt | 30.642 | 35.951 |
| Juwelen verdient gesamt | 2.260 | 2.350 |
| Gacha-Ziehungen gesamt (inkl. Tutorial-10er und Tickets) | 31 | 32 |
| Rathaus | 4 | 4 |


Werbung bringt in den ersten 2 Stunden **≈ +4 % Juwelen und ≈ +17 % Gold** und vor allem ca. 19 Minuten früheren Zugang zu Kapitel 2. Sie ist spürbar, aber nicht nötig (Konzept: kein Pay-to-Win). Zum Vergleich: Mit einer `build_speed`-Ad (−30 Min., bei 15 Min. Bauzeit also sofort fertig) wäre Rathaus 4 ohne sonstige Werbung schon bei ≈ 48 Min. fertig.

**Erwartete Gacha-Ausbeute aus 31 Ziehungen** (Simulation mit den Pity-Regeln aus P-GDD 6.3, 20.000 Spieler; Tutorial-10er mit Episch-Garantie): Gewöhnlich 15,0 · Ungewöhnlich 8,4 · Selten 4,3 · Episch 2,3 · Heroisch 0,8 · Legendär+ 0,2. **20 % der Spieler** haben nach 2 Stunden ein Legendär+. Alle anderen bekommen es im Schnitt nach ≈ 53 Ziehungen, spätestens über die Hard-Pity bei 90 (P-GDD 6.3). Bei ≈ 1,5–2 Ziehungen/Tag nach der Kampagne ist das typischerweise nach 1–2 Wochen. Das ist gewollt, denn Legendär soll ein Ereignis sein.

### 8.5 Phasen und Bewertung

| Phase | Zeit (ohne Ads) | Gefühl / Ziel | Schwierigkeit (Team-KK : Gegner-KK) |
|---|---|---|---|
| Onboarding | 0–10 Min. | schnelle Siege, 2 Ziehungsrunden, Rathaus 2 | 1,0–2,2 (sehr leicht) |
| Erste Wand | 10–33 Min. | 1-8 bis 1-10: erst mit 5 Plätzen (Rathaus 3) und Lv 11 schaffbar | fällt auf ≈ 0,77 vor dem Boss, dann ≈ 1,0 |
| Aufbau | 33–63 Min. | Gold für Rathaus 4 sammeln (6.000) + **15 Min.** Bauzeit; Zeit für Skills, 3★, Tagesaufgaben | Spieler überlevelt (1,22–1,34) |
| Kapitel 2 – Verschnaufpause | 63–80 Min. | 2-1 bis 2-3 schnell hintereinander (2 neue Typen + Geschenke), 2-4 nach kurzem Training (Lv 17) | 1,16–1,34 |
| Stein-Wand | 80–108 Min. | 2-5 braucht Lv 20 bzw. Wasser-Monster | ≈ 0,99–1,06 |
| danach | ab 108 Min. | 2-6 (118 Min.), 2-7 … 2-10, Rathaus 5 (15.000 Gold, 90 Min.) → **Zucht ≈ ab Stunde 3,5–4** | ≈ 1,05–1,1, Boss 2-10 = Taktik-Check |

**Bewertung:** Die Kurve folgt dem Muster „leicht → Wand → Aufbau → neue Inhalte → Wand“. Mit der entschiedenen **Rathaus-4-Bauzeit von 15 Min.** (statt 30) schrumpft die **Aufbauphase von ≈ 45 auf ≈ 30 Min.** ohne neue Stage (Kapitel 2 ab Min. 63 statt 78, mit Werbung ab Min. 44 statt 58). Engpass ist jetzt nur noch das Gold (6.000), nicht die Bauzeit. M2 füllt die Phase mit Skill-Training, 3★-Truhen und Tagesaufgaben. Die wöchentliche Analyse soll die Abbruchrate in Min. 35–65 beobachten. Weitere Stellschraube, falls nötig: Kapitel-1-30★-Truhe +2.000 Gold. **[ENTSCHIEDEN: Bauzeit 15 Min.]**

---

## 9. Speicherstand v2 und Migration

**Speicherschlüssel** **[ENTSCHIEDEN]**: `localStorage["velunor.save.v1"]` (Schlüssel ≠ Datenversion, das `.v1` im Schlüssel bleibt). Beim Start läuft **zuerst** die Schlüssel-Übernahme vom alten Arbeitstitel-Schlüssel `mstadt.save.v1` (vollständige Logik, Fallunterscheidung und Code in **P-GDD 8.5**: neuer Schlüssel hat Vorrang · alter Stand wird geparst, per `migrate[v]` auf die aktuelle Version gebracht, unter dem neuen Schlüssel geschrieben und zurückgelesen · erst dann alter Rohtext nach `velunor.save.legacy` (14 Tage) und alter Schlüssel gelöscht · kaputter alter Stand bleibt unangetastet, neues Spiel · Schreibfehler: alter Schlüssel bleibt, nächster Versuch beim nächsten Start). Danach läuft die **Datenmigration** v1 → v2.

Reihenfolge in `SaveService.init()`:
1. `loadOrMigrateSave(now)` (P-GDD 8.5), liefert ein Objekt mit beliebiger `version` ≥ 1.
2. `while (save.version < 2) save = migrate[save.version](save)`, dann `save.version = 2`.
3. Speichern unter `velunor.save.v1`. Ein M2-Spielstand wird nie unter `mstadt.save.v1` geschrieben.

Neu ist `"version": 2`. Migration `migrate[1]`:

| Feld | Standardwert bei Migration |
|---|---|
| `monsters[].potential` | `{ "hp": 0, "atk": 0, "def": 0 }` |
| `monsters[].skills` | `{ "sigRank": 1, "slot2": null, "slot3": null, "learned": [], "skillOrder": ["sig", "slot2"] }` |
| `monsters[].generation` / `breedReadyAt` | `0` / `0` |
| `activeTypes` | `["fire","water","plant","earth"]` + Typen, deren Einführungs-Stage schon gewonnen ist |
| `campaign.chestsClaimed` | `[]`, danach sofort prüfen und Truhen für vorhandene Sterne gutschreiben |
| `buildings.breeding` | `{ "level": 0, "upgradeEndsAt": null, "slots": [] }` |
| `buildings.training.slots[].kind` | `"exp"` (neu möglich: `"skill"` mit `skillJob`) |
| `daily.quests` | neue IDs mit 0; Fortschritt `train1`/`win3`/`mine2` übernehmen |
| `ads.counts` | `training_speed` und `breeding_speed` ergänzen (0) |
| `meta` | `{ "migratedFrom": null, "migratedAt": 0 }`, falls nicht vorhanden (bei Schlüssel-Übernahme schon gesetzt) |

Beispiel (gültiges JSON):
```json
{
  "version": 2,
  "createdAt": 1791842400000,
  "lastSeen": 1791853200000,
  "meta": { "migratedFrom": "mstadt.save.v1", "migratedAt": 1791842500000 },
  "currencies": { "gold": 3150, "gems": 230, "essence": 140, "tickets": 0 },
  "activeTypes": ["fire", "water", "plant", "earth", "insect"],
  "buildings": {
    "townhall": { "level": 4, "upgradeEndsAt": null },
    "goldmine": { "level": 3, "stored": 120.0, "lastTick": 1791853200000, "upgradeEndsAt": null },
    "training": { "level": 3, "slots": [
      { "kind": "exp",   "monsterUid": "a1b2", "startAt": 1791851400000, "endsAt": 1791853200000, "exp": 780, "goldPaid": 234 },
      { "kind": "skill", "monsterUid": "c3d4", "startAt": 1791852000000, "endsAt": 1791855600000, "skillJob": { "type": "learn", "skillId": "L08", "goldPaid": 1500, "essencePaid": 60 } }
    ] },
    "breeding": { "level": 0, "upgradeEndsAt": null, "slots": [] }
  },
  "monsters": [
    { "uid": "c3d4", "speciesId": "m09", "rarity": 3, "level": 16, "exp": 120, "locked": true, "obtainedAt": 1791842700000,
      "potential": { "hp": 0, "atk": 0, "def": 0 },
      "skills": { "sigRank": 2, "slot2": "L01", "slot3": null, "learned": ["L01"], "skillOrder": ["sig", "slot2"] },
      "generation": 0, "breedReadyAt": 0 }
  ],
  "team": { "F1": "e5f6", "F2": "g7h8", "H1": "c3d4", "H2": "i9j0", "H3": "k1l2" },
  "campaign": { "cleared": { "1-10": 2, "2-1": 3 }, "chestsClaimed": ["1-10", "1-20"] },
  "gacha": { "pityLeg": 31, "pityEpic": 6, "totalPulls": 31, "history": [] },
  "daily": { "dayKey": "2026-10-13", "loginStreak": 1,
    "quests": { "win3": 3, "mine2": 2, "train1": 1, "levelup1": 1, "synergy2": 2, "pull1": 1, "breed1": 0 },
    "claimed": ["win3", "mine2", "train1", "levelup1", "synergy2", "pull1"], "claimedAll": true },
  "ads": { "dayKey": "2026-10-13", "counts": { "double_reward": 0, "gem_bonus": 0, "mine_boost": 0, "build_speed": 0, "free_pull": 0, "training_speed": 0, "breeding_speed": 0 },
    "lastRewardedAt": 0, "lastInterstitialAt": 0, "interstitialsToday": 0 },
  "stats": { "playtimeSec": 7200 }, "tutorialDone": true, "lastBattleResult": "win",
  "settings": { "battleSpeed": 4, "sound": true }
}
```
`chestsClaimed`-Format: `"<Kapitel>-<Sterne>"`. Die Sitzungs-Spielzeit für die Interstitial-Schonfrist (P-GDD 9.3, 10 Min. **pro Sitzung**) steht bewusst **nicht** im Speicherstand, `stats.playtimeSec` ist nur die Gesamt-Statistik.

---

## 10. Test- und Balancing-Hinweise für Porygon

1. **Determinismus:** `simulateBattle` mit gleichem Seed + gleichen Teams → identisches Log, auch mit 2 Skills, Passiven und Boss-Mechaniken. Zucht-Ergebnis wird beim Start gewürfelt und gespeichert.
2. **Regressionstest Prototyp:** Ein Monster ohne Lernskill/Passiv, Rang 1, Potenzial 0 muss exakt das Prototyp-Log erzeugen (CD-Folge Basis, Basis, Fähigkeit …).
3. **Stage-Bänder** (automatisierter Test, 200 Seeds): Standardteam (Kap. 5.1) auf **Std.-Lv** → Siegquote 70–100 %, auf **Std.-Lv − 3** → ≤ 50 % (Ausnahme 1-1 bis 1-4: immer schaffbar). Weicht ein Band ab, wird in `stages.json` nachjustiert, nicht im Code.
4. **Synergie-Grenzen:** +35 % je Wert, Krit-Chance ≤ 50 %, Mods −0,5 … +1,0.
5. **Wirtschaft:** Zuchtkosten (Essenz) > Erwartungswert der Freilass-Essenz des Kindes in jeder Stufe (2.3). Juwelen aus Tagesaufgaben + Login = 150/Tag.
6. **Referenzteams** für Tests:
```json
{
  "standard": [ { "slot": "F1", "speciesId": "m05", "rarity": 1 }, { "slot": "F2", "speciesId": "m06", "rarity": 1 }, { "slot": "H1", "speciesId": "m09", "rarity": 3 },
                { "slot": "H2", "speciesId": "m07", "rarity": 2 }, { "slot": "H3", "speciesId": "m08", "rarity": 2 } ],
  "standardSkills": { "fromStage1-9": { "F1": "L01" }, "fromStage2-1": { "F1": "L01", "H1": "L08" } },
  "optimized": [ { "slot": "F1", "speciesId": "m05", "rarity": 2 }, { "slot": "F2", "speciesId": "m12", "rarity": 1 }, { "slot": "H1", "speciesId": "m09", "rarity": 3 },
                 { "slot": "H2", "speciesId": "m15", "rarity": 2 }, { "slot": "H3", "speciesId": "m16", "rarity": 3 } ],
  "optimizedSkills": { "F1": "L02", "H1": "L08", "H2": "L10" }
}
```
Hinweis: Der Python-Nachbau für dieses Dokument vereinfacht einiges (keine Passiven aus Slot 3; Typ-Synergien für Spieler und Gegner ab 1-6, Klassen-Synergien ab 1-9). Die echten Zahlen aus `simulateBattle` können um ±2 Level abweichen. Dann gelten die Test-Bänder aus Punkt 3, nicht die Tabellenwerte.

---

## 11. Annahmen auf einen Blick

Status 13.10.2026: Punkte mit **[ENTSCHIEDEN]** sind freigegeben (Entscheidungen Kap. 12). Alle übrigen Annahmen gelten mit der Freigabe dieses Dokuments als Arbeitsstand für M2 und werden nur bei Befund aus Tests/Analyse geändert.

**Skills**
1. 3 Slots: Signatur (fest, Rang 1–5), Lernskill (Rathaus 3, Lv 10), Passiv (Rathaus 5, Training 5, Lv 20). Angeborene Passiven belegen keinen Slot.
2. Signatur-Rang: +10 % Wirkung je Rang, +5 Pp. Statuschance, Rang 5: CD −1 (min. 2). Kosten 300·r² Gold, 10·r² Essenz, 30·r Min. Max-Rang nach Seltenheit 2/2/3/3/4/4/5 … und nach Trainingsgelände-Stufe.
3. 16 Lernskills in 3 Tiers (400/1.500/4.000 Gold, 20/60/150 Essenz, 30/60/120 Min.), 8 Passive (6.000 Gold, 300 Essenz, 4 Std.). Gelernte Skills bleiben dauerhaft, Umrüsten kostenlos.
4. Skill-Training belegt einen normalen Trainings-Slot, Abbruch erstattet 100 %, `training_speed`-Ad gilt auch hier.
5. Kampf: Skills in Prioritätsreihenfolge (vom Spieler tauschbar), nicht genutzte Skills zählen ihre CD herunter. Gegner nutzen dieselbe Logik.
6. Neue Status Vergiftung (4 % Max-HP pro Stapel, max. 3, Bosse 2 %), ATK ±, SPD ±; neue Effekte Mehrfachtreffer, DEF-Durchdringung, Reinigung; DoTs werden nicht vom Schild abgefangen.

**Zucht**
7. **[ENTSCHIEDEN: Eltern bleiben erhalten]** Zuchtstation 3 Stufen (5.000/12.000/25.000 Gold) ab Rathaus 5, Eltern Lv ≥ 15, werden nicht verbraucht, 12 Std. Abklingzeit pro Elternteil, beliebige Typ-Kombination.
8. Seltenheit = floor(Mittelwert), +1 mit 25 % (gleiche Seltenheit) bzw. 10 %; Spezies 50/50 aus den Eltern, aber nur mit baseRarity ≤ Ergebnis.
9. **[ENTSCHIEDEN]** Neues Instanzfeld **Potenzial** (0–10 je HP/ATK/DEF, +1 % pro Punkt), Vererbung Mittelwert + 0/1/2. Gacha-Monster haben 0.
10. Kosten ≈ 25 % einer Aufwertung (Essenz-Tabelle, Gold = Essenz × 10), Dauer 30 Min. – 24 Std.; 30 % Lernskill-Vererbung; neue Rewarded Ad `breeding_speed` (2/Tag, −50 %).

**Typen & Monster**
11. **[ENTSCHIEDEN]** Neue aktive Typen: Gift, Stein, Insekt, Kristall (rechnerisch ausgeglichenste Kombination). Freischaltung über Erst-Siege 2-1/2-3/2-5/2-7 inkl. Gratis-Monster. Gegner dürfen Typen vorher zeigen.
12. 15 neue Monster (m11–m25) inkl. Namen, Werte, Fähigkeiten; neues Feld **Klasse** (Wächter, Kämpfer, Schütze, Stütze, Störer) für alle 25 Monster.
13. Gacha-Pool berücksichtigt `activeTypes`.

**Kampagne**
14. Feste Gegnerteams für alle 20 Stages, Gegner-Seltenheit darf unter baseRarity liegen, Gegner-Typ-Synergien ab 1-6, Gegner-Klassen-Synergien ab 1-9, Gegner-Lernskills ab 2-4.
15. Bosse zusätzlich **ATK ×0,85**, Betäubung ×0,5, Vergiftung 2 %. Boss-Mechaniken wie in Kap. 5.2/5.3. **[ENTSCHIEDEN]** Boss 2-10 entschärft (Seltenheit Selten statt Episch, ≈ 3 Level Abstand ohne/mit Gift-Monster), Gift-Hinweis vorab im `stageText` von 2-9 und 2-10.
16. Sterne-Truhen je Kapitel (10/20/30 ★), insgesamt +11.500 Gold, +80 Juwelen, +130 Essenz, +2 Tickets.
17. Kampfkraft-Formel `HP×0,2 + ATK×2 + DEF×1,5` (+10 % pro Zusatz-Slot) und Empf. KK = 1,1 × Gegner-KK.

**Tagesaufgaben & Synergien**
18. 5 Basis-Aufgaben + 2 Bonus-Aufgaben, Abschluss-Truhe unverändert (40 Juwelen + 500 Gold + 30 Essenz), 150 Juwelen/Tag wie P-GDD; nicht abgeholte Belohnungen werden beim Reset gutgeschrieben.
19. 3 neue Typ-Kombos (Bollwerk, Sumpffieber, Vielfalt), 5 Klassen-Synergien + „Ausgewogen“, Obergrenze +35 % je Wert, Krit ≤ 50 %. **[ENTSCHIEDEN]** Klassen-Synergien erst ab Rathaus 3.

**Kurve & Technik**
20. Kurvenmodell: 1,5 Min. pro Kampf, aktive Einzelsitzung, Standardteam aus der Tutorial-Ziehung. Werte per Python-Nachbau der Kampfregeln geprüft, nicht mit dem echten Code.
21. **[ENTSCHIEDEN]** Speicherschlüssel `velunor.save.v1` mit einmaliger Übernahme von `mstadt.save.v1` (P-GDD 8.5), danach Datenversion 2 mit Migration (Kap. 9).
22. **[ENTSCHIEDEN]** Rathaus 4: Bauzeit 15 Min. (P-GDD 2.2), Kurve in Kap. 8 neu simuliert.
23. **[ENTSCHIEDEN]** Interstitial-Schonfrist 10 Min. **pro Sitzung**. Interstitials nur auf Plattformen, die sie verlangen (Poki, CrazyGames, GameDistribution), sonst aus (P-GDD 9.3/9.5).

## 12. Entscheidungen zu den offenen Fragen (Evoli/Fabian-Noel, 13.10.2026)

1. **[ENTSCHIEDEN]** *Aufbauphase vor Kapitel 2:* Rathaus-4-Bauzeit **15 Min.** statt 30 (P-GDD 2.2 + `buildings.json` `buildSec: 900`). Kurve neu simuliert: Aufbauphase ≈ 30 statt ≈ 45 Min., Kapitel 2 ab Min. 63 (ohne Werbung) bzw. 44 (mit Werbung), Kap. 8.
2. **[ENTSCHIEDEN]** *Boss 2-10:* entschärft auf **≈ 3 Level Abstand ohne Gift-Monster** (Boss-Seltenheit Selten statt Episch, Mechaniken unverändert). Standardteam ohne Gift Lv 26 (vorher 28), Gift-Variante Lv 23, optimiertes Team Lv 19. Gift-Hinweis vorab im Stage-Text von 2-9 und 2-10 (Kap. 5.3/5.5).
3. **[ENTSCHIEDEN]** *Potenzial:* bleibt als Instanzwert (Kap. 2).
4. **[ENTSCHIEDEN]** *Zucht:* Eltern bleiben erhalten (12 Std. Abklingzeit), wie geplant (Kap. 2).
5. **[ENTSCHIEDEN]** *Klassen-Synergien* erst ab **Rathaus 3**, Typ-Synergien weiter ab Rathaus 2 (Kap. 7). Gegner: Klassen-Synergien ab 1-9.
6. **[ENTSCHIEDEN]** *Typen* Gift, Stein, Insekt, Kristall bestätigt (Kap. 3).
7. **[ENTSCHIEDEN]** *Interstitial-Schonfrist:* 10 Min. **pro Sitzung** (neue Sitzung bei jedem Laden und nach ≥ 30 Min. verborgenem Tab). Interstitials nur, wo die Plattform sie verlangt, sonst aus. GameDistribution verlangt laut Entwicklerrichtlinien Midrolls, ist daher wie Poki/CrazyGames eingeschaltet (P-GDD 9.3/9.5).
8. **[ENTSCHIEDEN]** *Name:* **Velunor** in beiden GDDs. Speicherschlüssel `velunor.save.v1`, Übernahme von `mstadt.save.v1` mit spezifizierter Migrationslogik (P-GDD 8.5, Kap. 9).
9. *Offen (nicht Teil der Entscheidungen):* Monster-, Kapitel- und Stage-Namen sind Platzhalter. Wünsche zu Stil oder Ton können jederzeit nachgereicht werden; sie ändern nur Texte, keine Werte.
