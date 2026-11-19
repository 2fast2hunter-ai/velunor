// supabase/functions/_shared/admin.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
var cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json"
};
function admin() {
  return createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
}
async function caller(req) {
  const client = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } }
  });
  const { data } = await client.auth.getUser();
  return data.user ? { id: data.user.id } : null;
}
function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

// data/types.json
var types_default = {
  activeTypes: ["fire", "water", "plant", "earth", "wind", "ice", "lightning", "metal", "fighting", "beast", "light", "shadow", "ghost", "psychic", "sound", "dragon"],
  multipliers: { strong: 1.5, weak: 0.75, neutral: 1 },
  mutualStrong: [["light", "shadow"]],
  names: {
    fire: "Feuer",
    water: "Wasser",
    plant: "Pflanze",
    earth: "Erde",
    wind: "Wind",
    ice: "Eis",
    lightning: "Blitz",
    poison: "Gift",
    metal: "Metall",
    stone: "Stein",
    light: "Licht",
    shadow: "Schatten",
    ghost: "Geist",
    dragon: "Drache",
    insect: "Insekt",
    beast: "Bestie",
    fighting: "Kampf",
    psychic: "Psycho",
    sound: "Klang",
    crystal: "Kristall"
  },
  colors: {
    fire: "#ff7043",
    water: "#42a5f5",
    plant: "#66bb6a",
    earth: "#a1887f",
    wind: "#80deea",
    ice: "#b3e5fc",
    lightning: "#ffee58",
    poison: "#8e24aa",
    metal: "#b0bec5",
    stone: "#8d6e63",
    light: "#fff8e1",
    shadow: "#5e35b1",
    ghost: "#ce93d8",
    dragon: "#ef5350",
    insect: "#9ccc65",
    beast: "#ff8a65",
    fighting: "#e53935",
    psychic: "#f06292",
    sound: "#4dd0e1",
    crystal: "#e1bee7"
  },
  strongAgainst: {
    fire: ["plant", "ice", "insect"],
    water: ["earth", "stone"],
    plant: ["water", "light"],
    earth: ["fire", "lightning", "poison"],
    wind: ["plant", "insect", "fighting"],
    ice: ["wind", "dragon", "beast"],
    lightning: ["water", "wind", "metal"],
    poison: ["plant", "beast", "crystal"],
    metal: ["ice", "stone", "crystal"],
    stone: ["fire", "wind", "ice"],
    light: ["shadow", "ghost", "dragon"],
    shadow: ["psychic", "ghost", "light"],
    ghost: ["psychic", "sound"],
    dragon: ["dragon", "sound"],
    insect: ["psychic", "shadow", "poison"],
    beast: ["insect", "sound"],
    fighting: ["stone", "metal", "beast"],
    psychic: ["fighting", "poison"],
    sound: ["crystal", "metal"],
    crystal: ["light", "lightning", "earth"]
  }
};

// data/rarities.json
var rarities_default = {
  levels: [
    { index: 0, name: "Gew\xF6hnlich", mult: 1, spdFactor: 1, maxLevel: 20, color: "#9e9e9e", essence: 5 },
    { index: 1, name: "Ungew\xF6hnlich", mult: 1.15, spdFactor: 1.02, maxLevel: 25, color: "#4caf50", essence: 10 },
    { index: 2, name: "Selten", mult: 1.3, spdFactor: 1.04, maxLevel: 30, color: "#2196f3", essence: 25 },
    { index: 3, name: "Episch", mult: 1.5, spdFactor: 1.06, maxLevel: 35, color: "#9c27b0", essence: 60 },
    { index: 4, name: "Heroisch", mult: 1.75, spdFactor: 1.08, maxLevel: 40, color: "#ff9800", essence: 150 },
    { index: 5, name: "Legend\xE4r", mult: 2.05, spdFactor: 1.1, maxLevel: 45, color: "#ffc107", essence: 400 },
    { index: 6, name: "Mythisch", mult: 2.4, spdFactor: 1.12, maxLevel: 50, color: "#f44336", essence: 1e3 },
    { index: 7, name: "G\xF6ttlich", mult: 2.8, spdFactor: 1.14, maxLevel: 55, color: "#fff4c2", essence: 2500 },
    { index: 8, name: "Kosmisch", mult: 3.25, spdFactor: 1.16, maxLevel: 60, color: "#00bcd4", essence: 6e3 },
    { index: 9, name: "Ursprung", mult: 3.75, spdFactor: 1.18, maxLevel: 70, color: "#ff80ab", essence: 15e3 }
  ],
  ascension: [
    { from: 0, to: 1, essence: 50, gold: 500 },
    { from: 1, to: 2, essence: 120, gold: 1200 },
    { from: 2, to: 3, essence: 300, gold: 3e3 },
    { from: 3, to: 4, essence: 700, gold: 7e3 },
    { from: 4, to: 5, essence: 1500, gold: 15e3 },
    { from: 5, to: 6, essence: 3500, gold: 35e3 },
    { from: 6, to: 7, essence: 8e3, gold: 8e4 },
    { from: 7, to: 8, essence: 18e3, gold: 18e4 },
    { from: 8, to: 9, essence: 4e4, gold: 4e5 }
  ]
};

// data/combat.json
var combat_default = {
  dmgScale: 1.5,
  critChance: 0.1,
  critMult: 1.5,
  varianceMin: 0.9,
  varianceMax: 1.1,
  roundLimit: 20,
  positionBonus: 0.1,
  levelStat: 0.08,
  levelSpd: 0.01,
  spdPerRarity: 0.02,
  lossExpFraction: 0.25,
  inventoryCap: 60,
  actionMs: 600,
  modMin: -0.5,
  modMax: 1,
  burnAtkFraction: 0.3,
  synergy: [
    { count: 2, atk: 0.05, hp: 0 },
    { count: 3, atk: 0.1, hp: 0.05 },
    { count: 4, atk: 0.15, hp: 0.1 },
    { count: 5, atk: 0.2, hp: 0.15 }
  ],
  elementCircleSpd: 0.08,
  bossHpMult: 1.5,
  expBase: 20,
  expPower: 1.5
};

// data/monsters.json
var monsters_default = [
  {
    id: "m01",
    name: "Funkfuchs",
    type: "fire",
    baseRarity: 0,
    role: "back",
    base: {
      hp: 110,
      atk: 28,
      def: 10,
      spd: 108
    },
    blurb: "Ein flinker Fuchs, der Funken aus dem Schweif schl\xE4gt.",
    skill: {
      id: "ember_strike",
      name: "Glutsto\xDF",
      description: "150 % ATK auf das Standardziel. 40 % Chance auf Verbrennung (2 Runden).",
      cooldown: 3,
      initialCooldown: 2,
      target: "default",
      effects: [
        {
          kind: "damage",
          atkMult: 1.5
        },
        {
          kind: "status",
          status: "burn",
          chance: 0.4,
          duration: 2,
          value: 0.3
        }
      ]
    },
    sprite: "m01",
    class: "shooter"
  },
  {
    id: "m02",
    name: "Tropfmolch",
    type: "water",
    baseRarity: 0,
    role: "front",
    base: {
      hp: 160,
      atk: 18,
      def: 18,
      spd: 92
    },
    blurb: "Tr\xE4gt einen Wassertropfen wie einen Schild.",
    skill: {
      id: "water_shield",
      name: "Wasserschild",
      description: "Schild = 15 % eigene Max-HP auf sich und den Verb\xFCndeten mit dem niedrigsten HP-% (2 Runden).",
      cooldown: 4,
      initialCooldown: 2,
      target: "self_and_ally_lowest_hp_pct",
      effects: [
        {
          kind: "shield",
          maxHpPctOfCaster: 0.15,
          duration: 2
        }
      ]
    },
    sprite: "m02",
    class: "support"
  },
  {
    id: "m03",
    name: "Knospling",
    type: "plant",
    baseRarity: 0,
    role: "back",
    base: {
      hp: 120,
      atk: 20,
      def: 12,
      spd: 100
    },
    blurb: "Eine kleine Knospe, die Licht in Heilung verwandelt.",
    skill: {
      id: "photosynthesis",
      name: "Photosynthese",
      description: "Heilt den Verb\xFCndeten mit dem niedrigsten HP-% um 150 % ATK.",
      cooldown: 3,
      initialCooldown: 2,
      target: "ally_lowest_hp_pct",
      effects: [
        {
          kind: "heal",
          atkMult: 1.5
        }
      ]
    },
    sprite: "m03",
    class: "support"
  },
  {
    id: "m04",
    name: "Lehmbrocken",
    type: "earth",
    baseRarity: 0,
    role: "front",
    base: {
      hp: 180,
      atk: 16,
      def: 22,
      spd: 80
    },
    blurb: "Ein wandelnder Lehmklumpen, der Schl\xE4ge einsteckt.",
    skill: {
      id: "clay_wall",
      name: "Lehmwall",
      description: "Spott f\xFCr 2 Runden und eigene DEF +30 % (2 Runden).",
      cooldown: 4,
      initialCooldown: 1,
      target: "self",
      effects: [
        {
          kind: "status",
          status: "taunt",
          chance: 1,
          duration: 2
        },
        {
          kind: "status",
          status: "def_up",
          chance: 1,
          duration: 2,
          value: 0.3
        }
      ]
    },
    sprite: "m04",
    class: "guardian"
  },
  {
    id: "m05",
    name: "Aschewiesel",
    type: "fire",
    baseRarity: 1,
    role: "front",
    base: {
      hp: 150,
      atk: 26,
      def: 14,
      spd: 112
    },
    blurb: "Wirbelt durch die Frontreihe und l\xE4sst Asche zur\xFCck.",
    skill: {
      id: "flame_swirl",
      name: "Flammenwirbel",
      description: "90 % ATK auf alle Gegner der Frontreihe (sonst Hinterreihe).",
      cooldown: 3,
      initialCooldown: 2,
      target: "enemy_front_all",
      effects: [
        {
          kind: "damage",
          atkMult: 0.9
        }
      ]
    },
    sprite: "m05",
    class: "fighter"
  },
  {
    id: "m06",
    name: "Moospanzer",
    type: "plant",
    baseRarity: 1,
    role: "front",
    base: {
      hp: 190,
      atk: 17,
      def: 20,
      spd: 76
    },
    blurb: "Ein Panzer aus Moos und Dornen.",
    skill: {
      id: "thorn_armor",
      name: "Dornenpanzer",
      description: "2 Runden Dornen: Angreifer erleiden 30 % des Schadens, den sie diesem Monster zuf\xFCgen.",
      cooldown: 4,
      initialCooldown: 1,
      target: "self",
      effects: [
        {
          kind: "status",
          status: "thorns",
          chance: 1,
          duration: 2,
          value: 0.3
        }
      ]
    },
    sprite: "m06",
    class: "guardian"
  },
  {
    id: "m07",
    name: "Strudelotter",
    type: "water",
    baseRarity: 2,
    role: "back",
    base: {
      hp: 130,
      atk: 30,
      def: 12,
      spd: 110
    },
    blurb: "Zieht den schw\xE4chsten Gegner der Hinterreihe in den Strudel.",
    skill: {
      id: "tide_strike",
      name: "Gezeitenschlag",
      description: "140 % ATK auf den Gegner der Hinterreihe mit den niedrigsten HP. Ist die Hinterreihe leer, gilt das Standardziel.",
      cooldown: 3,
      initialCooldown: 2,
      target: "enemy_back_lowest_hp",
      effects: [
        {
          kind: "damage",
          atkMult: 1.4
        }
      ]
    },
    sprite: "m07",
    class: "shooter"
  },
  {
    id: "m08",
    name: "Sandviper",
    type: "earth",
    baseRarity: 2,
    role: "back",
    base: {
      hp: 135,
      atk: 29,
      def: 13,
      spd: 106
    },
    blurb: "Lauert im Sand und l\xE4hmt, wer zu nah kommt.",
    skill: {
      id: "quicksand",
      name: "Treibsand",
      description: "110 % ATK auf das Standardziel. 40 % Chance auf Bet\xE4ubung (1 Zug).",
      cooldown: 4,
      initialCooldown: 2,
      target: "default",
      effects: [
        {
          kind: "damage",
          atkMult: 1.1
        },
        {
          kind: "status",
          status: "stun",
          chance: 0.4,
          duration: 1
        }
      ]
    },
    sprite: "m08",
    class: "disruptor"
  },
  {
    id: "m09",
    name: "Dornendryade",
    type: "plant",
    baseRarity: 3,
    role: "back",
    base: {
      hp: 140,
      atk: 30,
      def: 14,
      spd: 104
    },
    blurb: "Schlingt Wurzeln um jedes gegnerische Bein.",
    skill: {
      id: "root_weave",
      name: "Wurzelgeflecht",
      description: "70 % ATK auf alle Gegner und DEF \u221220 % (2 Runden).",
      cooldown: 4,
      initialCooldown: 3,
      target: "enemy_all",
      effects: [
        {
          kind: "damage",
          atkMult: 0.7
        },
        {
          kind: "status",
          status: "def_down",
          chance: 1,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m09",
    class: "disruptor"
  },
  {
    id: "m10",
    name: "Sonnenph\xF6nix",
    type: "fire",
    baseRarity: 5,
    role: "back",
    base: {
      hp: 170,
      atk: 36,
      def: 16,
      spd: 118
    },
    blurb: "Verbrennt das Feld und erhebt sich einmal aus der Asche.",
    skill: {
      id: "sunfire",
      name: "Sonnenfeuer",
      description: "100 % ATK auf alle Gegner. 50 % Chance auf Verbrennung je Ziel (2 Runden).",
      cooldown: 4,
      initialCooldown: 3,
      target: "enemy_all",
      effects: [
        {
          kind: "damage",
          atkMult: 1
        },
        {
          kind: "status",
          status: "burn",
          chance: 0.5,
          duration: 2,
          value: 0.3
        }
      ]
    },
    passive: {
      id: "rebirth",
      name: "Wiedergeburt",
      description: "Beim ersten K.O. pro Kampf belebt sich der Ph\xF6nix am Ende der Aktion mit 40 % Max-HP. Statuseffekte werden entfernt.",
      hpPct: 0.4,
      usesPerBattle: 1
    },
    sprite: "m10",
    class: "shooter"
  },
  {
    id: "m11",
    name: "Surrlibelle",
    type: "insect",
    baseRarity: 0,
    role: "back",
    class: "shooter",
    base: {
      hp: 100,
      atk: 26,
      def: 10,
      spd: 116
    },
    blurb: "Schneller Fernkampf-Einstieg, gut gegen Gift.",
    skill: {
      id: "double_sting",
      name: "Doppelstich",
      description: "2\xD7 75 % ATK auf das Standardziel.",
      cooldown: 3,
      initialCooldown: 1,
      target: "default",
      effects: [
        {
          kind: "damage",
          atkMult: 0.75,
          hits: 2
        }
      ]
    },
    sprite: "m11"
  },
  {
    id: "m12",
    name: "Panzerk\xE4fer",
    type: "insect",
    baseRarity: 1,
    role: "front",
    class: "guardian",
    base: {
      hp: 175,
      atk: 18,
      def: 21,
      spd: 86
    },
    blurb: "Robuster Front-Blocker mit Schild.",
    skill: {
      id: "chitin_guard",
      name: "Chitinpanzer",
      description: "Schild 20 % Max-HP und DEF +20 % (2 Runden).",
      cooldown: 4,
      initialCooldown: 2,
      target: "self",
      effects: [
        {
          kind: "shield",
          maxHpPctOfCaster: 0.2,
          duration: 2
        },
        {
          kind: "status",
          status: "def_up",
          chance: 1,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m12"
  },
  {
    id: "m13",
    name: "Vespira",
    type: "insect",
    baseRarity: 4,
    role: "back",
    class: "shooter",
    base: {
      hp: 150,
      atk: 34,
      def: 14,
      spd: 114
    },
    blurb: "Verteilt 4 Treffer gegen Schilde und Schw\xE4rme.",
    skill: {
      id: "swarm_strike",
      name: "Schwarmangriff",
      description: "4\xD7 50 % ATK, jeder Treffer auf einen zuf\xE4lligen Gegner.",
      cooldown: 4,
      initialCooldown: 3,
      target: "enemy_random",
      effects: [
        {
          kind: "damage",
          atkMult: 0.5,
          hits: 4
        }
      ]
    },
    sprite: "m13"
  },
  {
    id: "m14",
    name: "Sumpfunke",
    type: "poison",
    baseRarity: 0,
    role: "front",
    class: "fighter",
    base: {
      hp: 165,
      atk: 19,
      def: 17,
      spd: 88
    },
    blurb: "Setzt Vergiftung auf Tanks.",
    skill: {
      id: "toxic_slime",
      name: "Giftschleim",
      description: "100 % ATK und 80 % Vergiftung (1 Stapel, 3 Runden).",
      cooldown: 3,
      initialCooldown: 2,
      target: "default",
      effects: [
        {
          kind: "damage",
          atkMult: 1
        },
        {
          kind: "status",
          status: "poison",
          chance: 0.8,
          duration: 3,
          stacks: 1
        }
      ]
    },
    sprite: "m14"
  },
  {
    id: "m15",
    name: "Nesselqualle",
    type: "poison",
    baseRarity: 2,
    role: "back",
    class: "disruptor",
    base: {
      hp: 125,
      atk: 29,
      def: 12,
      spd: 104
    },
    blurb: "Fl\xE4chiger Gift-St\xF6rer gegen Heiler.",
    skill: {
      id: "nettle_rain",
      name: "Nesselregen",
      description: "Alle Gegner: 60 % ATK und 50 % Vergiftung (1 Stapel, 3 Runden).",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_all",
      effects: [
        {
          kind: "damage",
          atkMult: 0.6
        },
        {
          kind: "status",
          status: "poison",
          chance: 0.5,
          duration: 3,
          stacks: 1
        }
      ]
    },
    sprite: "m15"
  },
  {
    id: "m16",
    name: "F\xE4ulnisnatter",
    type: "poison",
    baseRarity: 3,
    role: "back",
    class: "disruptor",
    base: {
      hp: 140,
      atk: 32,
      def: 13,
      spd: 110
    },
    blurb: "Gift in zwei Stapeln plus ATK-Senkung.",
    skill: {
      id: "decay",
      name: "Zersetzung",
      description: "130 % ATK, ATK \u221225 % (2 Runden) und Vergiftung (2 Stapel, 3 Runden).",
      cooldown: 4,
      initialCooldown: 3,
      target: "default",
      effects: [
        {
          kind: "damage",
          atkMult: 1.3
        },
        {
          kind: "status",
          status: "atk_down",
          chance: 1,
          duration: 2,
          value: 0.25
        },
        {
          kind: "status",
          status: "poison",
          chance: 1,
          duration: 3,
          stacks: 2
        }
      ]
    },
    sprite: "m16"
  },
  {
    id: "m17",
    name: "Kieselkrabbe",
    type: "stone",
    baseRarity: 0,
    role: "front",
    class: "guardian",
    base: {
      hp: 170,
      atk: 17,
      def: 24,
      spd: 78
    },
    blurb: "Spott-Tank mit Schild, stark gegen Feuer.",
    skill: {
      id: "shell_guard",
      name: "Panzerschale",
      description: "Schild 20 % Max-HP und Spott (2 Runden).",
      cooldown: 4,
      initialCooldown: 1,
      target: "self",
      effects: [
        {
          kind: "shield",
          maxHpPctOfCaster: 0.2,
          duration: 2
        },
        {
          kind: "status",
          status: "taunt",
          chance: 1,
          duration: 2
        }
      ]
    },
    sprite: "m17"
  },
  {
    id: "m18",
    name: "Ger\xF6llgolem",
    type: "stone",
    baseRarity: 2,
    role: "front",
    class: "fighter",
    base: {
      hp: 190,
      atk: 20,
      def: 23,
      spd: 72
    },
    blurb: "Verlangsamt die gegnerische Front.",
    skill: {
      id: "landslide",
      name: "Erdrutsch",
      description: "Frontreihe: 80 % ATK und SPD \u221220 % (2 Runden).",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_front_all",
      effects: [
        {
          kind: "damage",
          atkMult: 0.8
        },
        {
          kind: "status",
          status: "spd_down",
          chance: 1,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m18"
  },
  {
    id: "m19",
    name: "Basaltwidder",
    type: "stone",
    baseRarity: 4,
    role: "front",
    class: "fighter",
    base: {
      hp: 195,
      atk: 28,
      def: 20,
      spd: 90
    },
    blurb: "Durchdringt 30 % Verteidigung.",
    skill: {
      id: "battering_ram",
      name: "Rammbock",
      description: "160 % ATK, ignoriert 30 % DEF.",
      cooldown: 3,
      initialCooldown: 2,
      target: "default",
      effects: [
        {
          kind: "damage",
          atkMult: 1.6,
          defPierce: 0.3
        }
      ]
    },
    sprite: "m19"
  },
  {
    id: "m20",
    name: "Quarzling",
    type: "crystal",
    baseRarity: 0,
    role: "back",
    class: "support",
    base: {
      hp: 115,
      atk: 20,
      def: 14,
      spd: 98
    },
    blurb: "Gibt dem ganzen Team einen Schild.",
    skill: {
      id: "prism_shield",
      name: "Prismaschild",
      description: "Alle Verb\xFCndeten: Schild 10 % eigene Max-HP (2 Runden).",
      cooldown: 4,
      initialCooldown: 2,
      target: "ally_all",
      effects: [
        {
          kind: "shield",
          maxHpPctOfCaster: 0.1,
          duration: 2
        }
      ]
    },
    sprite: "m20"
  },
  {
    id: "m21",
    name: "Spiegelluchs",
    type: "crystal",
    baseRarity: 1,
    role: "back",
    class: "shooter",
    base: {
      hp: 120,
      atk: 27,
      def: 12,
      spd: 112
    },
    blurb: "Jagt die Hinterreihe und schw\xE4cht Angreifer.",
    skill: {
      id: "refraction",
      name: "Lichtbrechung",
      description: "Hinterreihe, niedrigste HP: 130 % ATK und 50 % ATK \u221215 % (2 Runden).",
      cooldown: 3,
      initialCooldown: 2,
      target: "enemy_back_lowest_hp",
      effects: [
        {
          kind: "damage",
          atkMult: 1.3
        },
        {
          kind: "status",
          status: "atk_down",
          chance: 0.5,
          duration: 2,
          value: 0.15
        }
      ]
    },
    sprite: "m21"
  },
  {
    id: "m22",
    name: "Amethystw\xE4chter",
    type: "crystal",
    baseRarity: 3,
    role: "front",
    class: "guardian",
    base: {
      hp: 190,
      atk: 22,
      def: 23,
      spd: 84
    },
    blurb: "Spott und 40 % Dornen.",
    skill: {
      id: "crystal_mirror",
      name: "Kristallspiegel",
      description: "Spott und Dornen 40 % (2 Runden).",
      cooldown: 4,
      initialCooldown: 2,
      target: "self",
      effects: [
        {
          kind: "status",
          status: "taunt",
          chance: 1,
          duration: 2
        },
        {
          kind: "status",
          status: "thorns",
          chance: 1,
          duration: 2,
          value: 0.4
        }
      ]
    },
    sprite: "m22"
  },
  {
    id: "m23",
    name: "Prismakoloss",
    type: "crystal",
    baseRarity: 5,
    role: "front",
    class: "fighter",
    base: {
      hp: 190,
      atk: 32,
      def: 20,
      spd: 96
    },
    blurb: "Bricht die Hinterreihe auf und sch\xFCtzt sich unter 50 % HP.",
    skill: {
      id: "prism_beam",
      name: "Prismastrahl",
      description: "Hinterreihe: 110 % ATK und DEF \u221220 % (2 Runden).",
      cooldown: 4,
      initialCooldown: 3,
      target: "enemy_back_all",
      effects: [
        {
          kind: "damage",
          atkMult: 1.1
        },
        {
          kind: "status",
          status: "def_down",
          chance: 1,
          duration: 2,
          value: 0.2
        }
      ]
    },
    passive: {
      id: "crystal_heart",
      name: "Kristallherz",
      description: "F\xE4llt die HP erstmals unter 50 %: Schild 25 % Max-HP (2 Runden).",
      trigger: {
        kind: "hp_below",
        pct: 0.5
      },
      effects: [
        {
          kind: "shield",
          maxHpPctOfCaster: 0.25,
          duration: 2,
          target: "self"
        }
      ],
      usesPerBattle: 1
    },
    sprite: "m23"
  },
  {
    id: "m24",
    name: "Tiefseewal",
    type: "water",
    baseRarity: 4,
    role: "front",
    class: "support",
    base: {
      hp: 230,
      atk: 22,
      def: 20,
      spd: 82
    },
    blurb: "Schaden auf die Front und Heilung f\xFCr alle.",
    skill: {
      id: "tidal_wave",
      name: "Flutwelle",
      description: "Frontreihe 80 % ATK und Heilung 50 % ATK f\xFCr alle Verb\xFCndeten.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_front_all",
      effects: [
        {
          kind: "damage",
          atkMult: 0.8
        },
        {
          kind: "heal",
          atkMult: 0.5,
          target: "ally_all"
        }
      ]
    },
    sprite: "m24"
  },
  {
    id: "m25",
    name: "Bebenwurm",
    type: "earth",
    baseRarity: 4,
    role: "front",
    class: "fighter",
    base: {
      hp: 190,
      atk: 27,
      def: 21,
      spd: 84
    },
    blurb: "Fl\xE4chenschaden mit Bet\xE4ubungschance.",
    skill: {
      id: "quake",
      name: "Beben",
      description: "Alle Gegner: 70 % ATK und 20 % Bet\xE4ubung.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_all",
      effects: [
        {
          kind: "damage",
          atkMult: 0.7
        },
        {
          kind: "status",
          status: "stun",
          chance: 0.2,
          duration: 1
        }
      ]
    },
    sprite: "m25"
  },
  {
    id: "m26",
    name: "Glutwidder",
    type: "fire",
    baseRarity: 1,
    role: "front",
    base: {
      hp: 145,
      atk: 23,
      def: 14,
      spd: 94
    },
    blurb: "Kompakter Widder mit gl\xFChenden Hornspiralen und kleinen Funken an den Hufen.",
    skill: {
      id: "glutwidder_skill",
      name: "Glutwidder-Ansturm",
      description: "Gegnerische Frontreihe: 105 % ATK, 33 % Chance auf Verbrennung.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_front_all",
      effects: [
        {
          kind: "damage",
          atkMult: 1.05
        },
        {
          kind: "status",
          status: "burn",
          chance: 0.33,
          duration: 2,
          value: 0.3
        }
      ]
    },
    sprite: "m26",
    class: "fighter",
    aussehen: "Kompakter Widder mit gl\xFChenden Hornspiralen und kleinen Funken an den Hufen."
  },
  {
    id: "m27",
    name: "Aschenk\xF6nig",
    type: "fire",
    baseRarity: 6,
    role: "back",
    base: {
      hp: 195,
      atk: 40,
      def: 16,
      spd: 113
    },
    blurb: "Schlanker Flammenl\xF6we mit Krone aus schwebender Glut, Aschewirbeln in der M\xE4hne und leuchtenden Runen auf dem Fell.",
    skill: {
      id: "aschenkoenig_skill",
      name: "Aschenk\xF6nig-Fluch",
      description: "Alle Gegner: 90 % ATK, 64 % Chance auf Verbrennung.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_all",
      effects: [
        {
          kind: "damage",
          atkMult: 0.9
        },
        {
          kind: "status",
          status: "burn",
          chance: 0.64,
          duration: 2,
          value: 0.3
        }
      ]
    },
    passive: {
      id: "aschenkoenig_passive",
      name: "Letzter Wille",
      description: "F\xE4llt die HP erstmals unter 50 %: Schild 15 % Max-HP (2 Runden).",
      trigger: {
        kind: "hp_below",
        pct: 0.5
      },
      effects: [
        {
          kind: "shield",
          maxHpPctOfCaster: 0.15,
          duration: 2,
          target: "self"
        }
      ],
      usesPerBattle: 1
    },
    sprite: "m27",
    class: "disruptor",
    aussehen: "Schlanker Flammenl\xF6we mit Krone aus schwebender Glut, Aschewirbeln in der M\xE4hne und leuchtenden Runen auf dem Fell."
  },
  {
    id: "m28",
    name: "Muschelkrebs",
    type: "water",
    baseRarity: 0,
    role: "front",
    base: {
      hp: 182,
      atk: 15,
      def: 23,
      spd: 80
    },
    blurb: "Runder blauer Krebs mit gro\xDFer Perlmuttschale und neugierigen Stielaugen.",
    skill: {
      id: "muschelkrebs_skill",
      name: "Muschelkrebs-Bollwerk",
      description: "Spott 2 Runden und eigene DEF +30 % (2 Runden).",
      cooldown: 4,
      initialCooldown: 1,
      target: "self",
      effects: [
        {
          kind: "status",
          status: "taunt",
          chance: 1,
          duration: 2
        },
        {
          kind: "status",
          status: "def_up",
          chance: 1,
          duration: 2,
          value: 0.3
        }
      ]
    },
    sprite: "m28",
    class: "guardian",
    aussehen: "Runder blauer Krebs mit gro\xDFer Perlmuttschale und neugierigen Stielaugen."
  },
  {
    id: "m29",
    name: "Gezeitenwal",
    type: "water",
    baseRarity: 5,
    role: "back",
    base: {
      hp: 185,
      atk: 30,
      def: 21,
      spd: 106
    },
    blurb: "Schwebender kleiner Wal mit Wellenmustern, Gischtkranz und einer goldenen Perle auf der Stirn, die sanft pulsiert.",
    skill: {
      id: "gezeitenwal_skill",
      name: "Gezeitenwal-Heilung",
      description: "Heilt den Verb\xFCndeten mit dem niedrigsten HP-% um 200 % ATK.",
      cooldown: 3,
      initialCooldown: 2,
      target: "ally_lowest_hp_pct",
      effects: [
        {
          kind: "heal",
          atkMult: 2
        }
      ]
    },
    sprite: "m29",
    class: "support",
    aussehen: "Schwebender kleiner Wal mit Wellenmustern, Gischtkranz und einer goldenen Perle auf der Stirn, die sanft pulsiert."
  },
  {
    id: "m30",
    name: "Dornenfalke",
    type: "plant",
    baseRarity: 2,
    role: "back",
    base: {
      hp: 120,
      atk: 31,
      def: 11,
      spd: 115
    },
    blurb: "Gr\xFCner Falke mit Bl\xE4ttern als Schwungfedern und kleinen Dornen an den Fl\xFCgelspitzen.",
    skill: {
      id: "dornenfalke_skill",
      name: "Dornenfalke-Schuss",
      description: "160 % ATK auf das Standardziel, 36 % Chance auf TEMPO \u221220 %.",
      cooldown: 3,
      initialCooldown: 2,
      target: "default",
      effects: [
        {
          kind: "damage",
          atkMult: 1.6
        },
        {
          kind: "status",
          status: "spd_down",
          chance: 0.36,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m30",
    class: "shooter",
    aussehen: "Gr\xFCner Falke mit Bl\xE4ttern als Schwungfedern und kleinen Dornen an den Fl\xFCgelspitzen."
  },
  {
    id: "m31",
    name: "Waldw\xE4chter",
    type: "plant",
    baseRarity: 4,
    role: "front",
    base: {
      hp: 238,
      atk: 19,
      def: 30,
      spd: 84
    },
    blurb: "Bemooster Hirsch mit Geweih aus \xC4sten voller Bl\xFCten, Gl\xFChw\xFCrmchen und Rindenpanzer an der Brust.",
    skill: {
      id: "waldwaechter_skill",
      name: "Waldw\xE4chter-Bollwerk",
      description: "Spott 2 Runden und eigene DEF +38 % (2 Runden).",
      cooldown: 4,
      initialCooldown: 1,
      target: "self",
      effects: [
        {
          kind: "status",
          status: "taunt",
          chance: 1,
          duration: 2
        },
        {
          kind: "status",
          status: "def_up",
          chance: 1,
          duration: 2,
          value: 0.38
        }
      ]
    },
    sprite: "m31",
    class: "guardian",
    aussehen: "Bemooster Hirsch mit Geweih aus \xC4sten voller Bl\xFCten, Gl\xFChw\xFCrmchen und Rindenpanzer an der Brust."
  },
  {
    id: "m32",
    name: "Lehml\xE4ufer",
    type: "earth",
    baseRarity: 1,
    role: "front",
    base: {
      hp: 147,
      atk: 23,
      def: 14,
      spd: 95
    },
    blurb: "Flinker Gecko aus gebranntem Lehm mit Rissmuster und erdbraunen Streifen.",
    skill: {
      id: "lehmlaeufer_skill",
      name: "Lehml\xE4ufer-Ansturm",
      description: "Gegnerische Frontreihe: 105 % ATK, 33 % Chance auf TEMPO \u221220 %.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_front_all",
      effects: [
        {
          kind: "damage",
          atkMult: 1.05
        },
        {
          kind: "status",
          status: "spd_down",
          chance: 0.33,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m32",
    class: "fighter",
    aussehen: "Flinker Gecko aus gebranntem Lehm mit Rissmuster und erdbraunen Streifen."
  },
  {
    id: "m33",
    name: "Bergtitan",
    type: "earth",
    baseRarity: 7,
    role: "front",
    base: {
      hp: 270,
      atk: 22,
      def: 34,
      spd: 90
    },
    blurb: "Riesiger Steinb\xE4r mit Berggipfeln auf dem R\xFCcken, gl\xFChenden Erzadern, schwebenden Felsbrocken und einem Schneeschleier um die Schultern.",
    skill: {
      id: "bergtitan_skill",
      name: "Bergtitan-Bollwerk",
      description: "Spott 2 Runden und eigene DEF +44 % (2 Runden).",
      cooldown: 4,
      initialCooldown: 1,
      target: "self",
      effects: [
        {
          kind: "status",
          status: "taunt",
          chance: 1,
          duration: 2
        },
        {
          kind: "status",
          status: "def_up",
          chance: 1,
          duration: 2,
          value: 0.44
        }
      ]
    },
    passive: {
      id: "bergtitan_passive",
      name: "Letzter Wille",
      description: "F\xE4llt die HP erstmals unter 50 %: Schild 18 % Max-HP (2 Runden).",
      trigger: {
        kind: "hp_below",
        pct: 0.5
      },
      effects: [
        {
          kind: "shield",
          maxHpPctOfCaster: 0.18,
          duration: 2,
          target: "self"
        }
      ],
      usesPerBattle: 1
    },
    sprite: "m33",
    class: "guardian",
    aussehen: "Riesiger Steinb\xE4r mit Berggipfeln auf dem R\xFCcken, gl\xFChenden Erzadern, schwebenden Felsbrocken und einem Schneeschleier um die Schultern."
  },
  {
    id: "m34",
    name: "Laternenk\xE4fer",
    type: "insect",
    baseRarity: 2,
    role: "back",
    base: {
      hp: 160,
      atk: 26,
      def: 17,
      spd: 102
    },
    blurb: "Dicker K\xE4fer mit leuchtendem Hinterleib wie eine Laterne und durchscheinenden Fl\xFCgeln.",
    skill: {
      id: "laternenkaefer_skill",
      name: "Laternenk\xE4fer-Schutz",
      description: "Schild = 10 % eigene Max-HP auf alle Verb\xFCndeten (2 Runden).",
      cooldown: 4,
      initialCooldown: 2,
      target: "ally_all",
      effects: [
        {
          kind: "shield",
          maxHpPctOfCaster: 0.1,
          duration: 2
        }
      ]
    },
    sprite: "m34",
    class: "support",
    aussehen: "Dicker K\xE4fer mit leuchtendem Hinterleib wie eine Laterne und durchscheinenden Fl\xFCgeln."
  },
  {
    id: "m35",
    name: "Klingenmantis",
    type: "insect",
    baseRarity: 3,
    role: "front",
    base: {
      hp: 150,
      atk: 24,
      def: 14,
      spd: 101
    },
    blurb: "Smaragdgr\xFCne Gottesanbeterin mit Sichelarmen aus Chitin, feinen Goldkanten und einem Schimmer auf den Fl\xFCgeln.",
    skill: {
      id: "klingenmantis_skill",
      name: "Klingenmantis-Ansturm",
      description: "Gegnerische Frontreihe: 114 % ATK, 39 % Chance auf Vergiftung.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_front_all",
      effects: [
        {
          kind: "damage",
          atkMult: 1.15
        },
        {
          kind: "status",
          status: "poison",
          chance: 0.39,
          duration: 3,
          stacks: 1
        }
      ]
    },
    sprite: "m35",
    class: "fighter",
    aussehen: "Smaragdgr\xFCne Gottesanbeterin mit Sichelarmen aus Chitin, feinen Goldkanten und einem Schimmer auf den Fl\xFCgeln."
  },
  {
    id: "m36",
    name: "Schlammkr\xF6te",
    type: "poison",
    baseRarity: 1,
    role: "front",
    base: {
      hp: 185,
      atk: 15,
      def: 23,
      spd: 79
    },
    blurb: "Plumpe violette Kr\xF6te mit Giftblasen auf dem R\xFCcken und tr\xE4gem Blick.",
    skill: {
      id: "schlammkroete_skill",
      name: "Schlammkr\xF6te-Bollwerk",
      description: "Spott 2 Runden und eigene DEF +32 % (2 Runden).",
      cooldown: 4,
      initialCooldown: 1,
      target: "self",
      effects: [
        {
          kind: "status",
          status: "taunt",
          chance: 1,
          duration: 2
        },
        {
          kind: "status",
          status: "def_up",
          chance: 1,
          duration: 2,
          value: 0.32
        }
      ]
    },
    sprite: "m36",
    class: "guardian",
    aussehen: "Plumpe violette Kr\xF6te mit Giftblasen auf dem R\xFCcken und tr\xE4gem Blick."
  },
  {
    id: "m37",
    name: "Nachtschattenhydra",
    type: "poison",
    baseRarity: 5,
    role: "back",
    base: {
      hp: 175,
      atk: 37,
      def: 15,
      spd: 111
    },
    blurb: "Dreik\xF6pfige violette Schlange mit Bl\xFCtenkragen, tropfendem Giftnebel und leuchtenden Mustern auf den Schuppen.",
    skill: {
      id: "nachtschattenhydra_skill",
      name: "Nachtschattenhydra-Fluch",
      description: "Alle Gegner: 85 % ATK, 60 % Chance auf Vergiftung.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_all",
      effects: [
        {
          kind: "damage",
          atkMult: 0.85
        },
        {
          kind: "status",
          status: "poison",
          chance: 0.6,
          duration: 3,
          stacks: 1
        }
      ]
    },
    sprite: "m37",
    class: "disruptor",
    aussehen: "Dreik\xF6pfige violette Schlange mit Bl\xFCtenkragen, tropfendem Giftnebel und leuchtenden Mustern auf den Schuppen."
  },
  {
    id: "m38",
    name: "Kieselgolem",
    type: "stone",
    baseRarity: 3,
    role: "front",
    base: {
      hp: 225,
      atk: 21,
      def: 27,
      spd: 84
    },
    blurb: "Golem aus gestapelten runden Kieseln mit moosigen Fugen und einem leuchtenden Kern im Bauch.",
    skill: {
      id: "kieselgolem_skill",
      name: "Kieselgolem-Bollwerk",
      description: "Spott 2 Runden und eigene DEF +36 % (2 Runden).",
      cooldown: 4,
      initialCooldown: 1,
      target: "self",
      effects: [
        {
          kind: "status",
          status: "taunt",
          chance: 1,
          duration: 2
        },
        {
          kind: "status",
          status: "def_up",
          chance: 1,
          duration: 2,
          value: 0.36
        }
      ]
    },
    sprite: "m38",
    class: "guardian",
    aussehen: "Golem aus gestapelten runden Kieseln mit moosigen Fugen und einem leuchtenden Kern im Bauch."
  },
  {
    id: "m39",
    name: "Monolithw\xE4chter",
    type: "stone",
    baseRarity: 6,
    role: "front",
    base: {
      hp: 205,
      atk: 31,
      def: 20,
      spd: 105
    },
    blurb: "Schwebender Obelisk-Krieger mit gemei\xDFelten Runen, kreisenden Steinplatten als Schild und gl\xFChenden Augenschlitzen.",
    skill: {
      id: "monolithwaechter_skill",
      name: "Monolithw\xE4chter-Ansturm",
      description: "Gegnerische Frontreihe: 130 % ATK, 24 % Chance auf Bet\xE4ubung.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_front_all",
      effects: [
        {
          kind: "damage",
          atkMult: 1.3
        },
        {
          kind: "status",
          status: "stun",
          chance: 0.24,
          duration: 1
        }
      ]
    },
    passive: {
      id: "monolithwaechter_passive",
      name: "Letzter Wille",
      description: "F\xE4llt die HP erstmals unter 50 %: Schild 15 % Max-HP (2 Runden).",
      trigger: {
        kind: "hp_below",
        pct: 0.5
      },
      effects: [
        {
          kind: "shield",
          maxHpPctOfCaster: 0.15,
          duration: 2,
          target: "self"
        }
      ],
      usesPerBattle: 1
    },
    sprite: "m39",
    class: "fighter",
    aussehen: "Schwebender Obelisk-Krieger mit gemei\xDFelten Runen, kreisenden Steinplatten als Schild und gl\xFChenden Augenschlitzen."
  },
  {
    id: "m40",
    name: "Prismadrache",
    type: "crystal",
    baseRarity: 8,
    role: "back",
    base: {
      hp: 200,
      atk: 50,
      def: 18,
      spd: 124
    },
    blurb: "Majest\xE4tischer Drache aus Kristallfacetten, der Licht in Regenbogenstrahlen bricht, mit schwebenden Splitterkr\xE4nzen und Sternenglanz im Inneren.",
    skill: {
      id: "prismadrache_skill",
      name: "Prismadrache-Schuss",
      description: "190 % ATK auf das Standardziel, 54 % Chance auf DEF \u221220 %.",
      cooldown: 3,
      initialCooldown: 2,
      target: "default",
      effects: [
        {
          kind: "damage",
          atkMult: 1.9
        },
        {
          kind: "status",
          status: "def_down",
          chance: 0.54,
          duration: 2,
          value: 0.2
        }
      ]
    },
    passive: {
      id: "prismadrache_passive",
      name: "Letzter Wille",
      description: "F\xE4llt die HP erstmals unter 50 %: Schild 21 % Max-HP (2 Runden).",
      trigger: {
        kind: "hp_below",
        pct: 0.5
      },
      effects: [
        {
          kind: "shield",
          maxHpPctOfCaster: 0.21,
          duration: 2,
          target: "self"
        }
      ],
      usesPerBattle: 1
    },
    sprite: "m40",
    class: "shooter",
    aussehen: "Majest\xE4tischer Drache aus Kristallfacetten, der Licht in Regenbogenstrahlen bricht, mit schwebenden Splitterkr\xE4nzen und Sternenglanz im Inneren."
  },
  {
    id: "m41",
    name: "Brisenmaus",
    type: "wind",
    baseRarity: 0,
    role: "back",
    base: {
      hp: 105,
      atk: 25,
      def: 10,
      spd: 108
    },
    blurb: "Kleine Maus mit gro\xDFen Segelohren und einem flauschigen Wirbel-Schweif.",
    skill: {
      id: "brisenmaus_skill",
      name: "Brisenmaus-Schuss",
      description: "150 % ATK auf das Standardziel, 30 % Chance auf TEMPO \u221220 %.",
      cooldown: 3,
      initialCooldown: 2,
      target: "default",
      effects: [
        {
          kind: "damage",
          atkMult: 1.5
        },
        {
          kind: "status",
          status: "spd_down",
          chance: 0.3,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m41",
    class: "shooter",
    aussehen: "Kleine Maus mit gro\xDFen Segelohren und einem flauschigen Wirbel-Schweif."
  },
  {
    id: "m42",
    name: "Wolkenschaf",
    type: "wind",
    baseRarity: 1,
    role: "back",
    base: {
      hp: 145,
      atk: 24,
      def: 16,
      spd: 98
    },
    blurb: "Schaf mit Wolle aus echter Wolke und kleinen Luftwirbeln an den F\xFC\xDFen.",
    skill: {
      id: "wolkenschaf_skill",
      name: "Wolkenschaf-Schutz",
      description: "Schild = 9 % eigene Max-HP auf alle Verb\xFCndeten (2 Runden).",
      cooldown: 4,
      initialCooldown: 2,
      target: "ally_all",
      effects: [
        {
          kind: "shield",
          maxHpPctOfCaster: 0.09,
          duration: 2
        }
      ]
    },
    sprite: "m42",
    class: "support",
    aussehen: "Schaf mit Wolle aus echter Wolke und kleinen Luftwirbeln an den F\xFC\xDFen."
  },
  {
    id: "m43",
    name: "B\xF6enfuchs",
    type: "wind",
    baseRarity: 2,
    role: "back",
    base: {
      hp: 140,
      atk: 29,
      def: 12,
      spd: 108
    },
    blurb: "Schlanker hellblauer Fuchs mit wehenden Bandschweifen und Windlinien im Fell.",
    skill: {
      id: "boeenfuchs_skill",
      name: "B\xF6enfuchs-Fluch",
      description: "Alle Gegner: 70 % ATK, 48 % Chance auf TEMPO \u221220 %.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_all",
      effects: [
        {
          kind: "damage",
          atkMult: 0.7
        },
        {
          kind: "status",
          status: "spd_down",
          chance: 0.48,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m43",
    class: "disruptor",
    aussehen: "Schlanker hellblauer Fuchs mit wehenden Bandschweifen und Windlinien im Fell."
  },
  {
    id: "m44",
    name: "Sturmadler",
    type: "wind",
    baseRarity: 3,
    role: "back",
    base: {
      hp: 120,
      atk: 29,
      def: 11,
      spd: 115
    },
    blurb: "Wei\xDFer Adler mit sturmgrauen Federspitzen, kleinen Blitzwolken unter den Schwingen und scharfem Blick.",
    skill: {
      id: "sturmadler_skill",
      name: "Sturmadler-Schuss",
      description: "165 % ATK auf das Standardziel, 39 % Chance auf TEMPO \u221220 %.",
      cooldown: 3,
      initialCooldown: 2,
      target: "default",
      effects: [
        {
          kind: "damage",
          atkMult: 1.65
        },
        {
          kind: "status",
          status: "spd_down",
          chance: 0.39,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m44",
    class: "shooter",
    aussehen: "Wei\xDFer Adler mit sturmgrauen Federspitzen, kleinen Blitzwolken unter den Schwingen und scharfem Blick."
  },
  {
    id: "m45",
    name: "Zyklonf\xFCrst",
    type: "wind",
    baseRarity: 5,
    role: "front",
    base: {
      hp: 205,
      atk: 34,
      def: 21,
      spd: 104
    },
    blurb: "Greif mit K\xF6rper aus kreiselnden Luftstr\xF6men, Federkrone, mitgerissenen Bl\xE4ttern und einem leuchtenden Auge des Sturms auf der Brust.",
    skill: {
      id: "zyklonfuerst_skill",
      name: "Zyklonf\xFCrst-Ansturm",
      description: "Gegnerische Frontreihe: 125 % ATK, 45 % Chance auf TEMPO \u221220 %.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_front_all",
      effects: [
        {
          kind: "damage",
          atkMult: 1.25
        },
        {
          kind: "status",
          status: "spd_down",
          chance: 0.45,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m45",
    class: "fighter",
    aussehen: "Greif mit K\xF6rper aus kreiselnden Luftstr\xF6men, Federkrone, mitgerissenen Bl\xE4ttern und einem leuchtenden Auge des Sturms auf der Brust."
  },
  {
    id: "m46",
    name: "Frostpinguin",
    type: "ice",
    baseRarity: 0,
    role: "front",
    base: {
      hp: 185,
      atk: 18,
      def: 23,
      spd: 78
    },
    blurb: "Rundlicher Pinguin mit Eiskristallen auf dem Kopf und dickem Frostbauch.",
    skill: {
      id: "frostpinguin_skill",
      name: "Frostpinguin-Bollwerk",
      description: "Spott 2 Runden und eigene DEF +30 % (2 Runden).",
      cooldown: 4,
      initialCooldown: 1,
      target: "self",
      effects: [
        {
          kind: "status",
          status: "taunt",
          chance: 1,
          duration: 2
        },
        {
          kind: "status",
          status: "def_up",
          chance: 1,
          duration: 2,
          value: 0.3
        }
      ]
    },
    sprite: "m46",
    class: "guardian",
    aussehen: "Rundlicher Pinguin mit Eiskristallen auf dem Kopf und dickem Frostbauch."
  },
  {
    id: "m47",
    name: "Schneehase",
    type: "ice",
    baseRarity: 0,
    role: "back",
    base: {
      hp: 105,
      atk: 24,
      def: 10,
      spd: 109
    },
    blurb: "Wei\xDFer Hase mit eisblauen Ohrspitzen und kleinen Schneeflocken im Fell.",
    skill: {
      id: "schneehase_skill",
      name: "Schneehase-Schuss",
      description: "150 % ATK auf das Standardziel, 30 % Chance auf TEMPO \u221220 %.",
      cooldown: 3,
      initialCooldown: 2,
      target: "default",
      effects: [
        {
          kind: "damage",
          atkMult: 1.5
        },
        {
          kind: "status",
          status: "spd_down",
          chance: 0.3,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m47",
    class: "shooter",
    aussehen: "Wei\xDFer Hase mit eisblauen Ohrspitzen und kleinen Schneeflocken im Fell."
  },
  {
    id: "m48",
    name: "Eiszapfenwolf",
    type: "ice",
    baseRarity: 2,
    role: "front",
    base: {
      hp: 160,
      atk: 25,
      def: 16,
      spd: 98
    },
    blurb: "Grauer Wolf mit Eiszapfen als R\xFCckenkamm und frostigem Atem.",
    skill: {
      id: "eiszapfenwolf_skill",
      name: "Eiszapfenwolf-Ansturm",
      description: "Gegnerische Frontreihe: 110 % ATK, 36 % Chance auf TEMPO \u221220 %.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_front_all",
      effects: [
        {
          kind: "damage",
          atkMult: 1.1
        },
        {
          kind: "status",
          status: "spd_down",
          chance: 0.36,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m48",
    class: "fighter",
    aussehen: "Grauer Wolf mit Eiszapfen als R\xFCckenkamm und frostigem Atem."
  },
  {
    id: "m49",
    name: "Gletscherb\xE4r",
    type: "ice",
    baseRarity: 4,
    role: "front",
    base: {
      hp: 245,
      atk: 23,
      def: 30,
      spd: 87
    },
    blurb: "Massiger Eisb\xE4r mit Gletscherpanzer, gefrorenen Runen auf den Schultern und blauem Frostschimmer.",
    skill: {
      id: "gletscherbaer_skill",
      name: "Gletscherb\xE4r-Bollwerk",
      description: "Spott 2 Runden und eigene DEF +38 % (2 Runden).",
      cooldown: 4,
      initialCooldown: 1,
      target: "self",
      effects: [
        {
          kind: "status",
          status: "taunt",
          chance: 1,
          duration: 2
        },
        {
          kind: "status",
          status: "def_up",
          chance: 1,
          duration: 2,
          value: 0.38
        }
      ]
    },
    sprite: "m49",
    class: "guardian",
    aussehen: "Massiger Eisb\xE4r mit Gletscherpanzer, gefrorenen Runen auf den Schultern und blauem Frostschimmer."
  },
  {
    id: "m50",
    name: "Winterk\xF6nigin",
    type: "ice",
    baseRarity: 6,
    role: "back",
    base: {
      hp: 230,
      atk: 52,
      def: 20,
      spd: 116
    },
    blurb: "Eleganter Schneefuchs mit f\xFCnf Schweifen aus Eis, Diadem aus Frostkristallen, wirbelnden Schneeflocken und k\xFChlem Lichtschein.",
    skill: {
      id: "winterkoenigin_skill",
      name: "Winterk\xF6nigin-Fluch",
      description: "Gegnerische Hinterreihe: 90 % ATK, 64 % Chance auf TEMPO \u221220 %.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_back_all",
      effects: [
        {
          kind: "damage",
          atkMult: 0.9
        },
        {
          kind: "status",
          status: "spd_down",
          chance: 0.64,
          duration: 2,
          value: 0.2
        }
      ]
    },
    passive: {
      id: "winterkoenigin_passive",
      name: "Letzter Wille",
      description: "F\xE4llt die HP erstmals unter 50 %: Schild 15 % Max-HP (2 Runden).",
      trigger: {
        kind: "hp_below",
        pct: 0.5
      },
      effects: [
        {
          kind: "shield",
          maxHpPctOfCaster: 0.15,
          duration: 2,
          target: "self"
        }
      ],
      usesPerBattle: 1
    },
    sprite: "m50",
    class: "disruptor",
    aussehen: "Eleganter Schneefuchs mit f\xFCnf Schweifen aus Eis, Diadem aus Frostkristallen, wirbelnden Schneeflocken und k\xFChlem Lichtschein."
  },
  {
    id: "m51",
    name: "Funkenigel",
    type: "lightning",
    baseRarity: 0,
    role: "back",
    base: {
      hp: 105,
      atk: 25,
      def: 10,
      spd: 108
    },
    blurb: "Kleiner gelber Igel, dessen Stacheln knisternde Funken tragen.",
    skill: {
      id: "funkenigel_skill",
      name: "Funkenigel-Schuss",
      description: "150 % ATK auf das Standardziel, 15 % Chance auf Bet\xE4ubung.",
      cooldown: 3,
      initialCooldown: 2,
      target: "default",
      effects: [
        {
          kind: "damage",
          atkMult: 1.5
        },
        {
          kind: "status",
          status: "stun",
          chance: 0.15,
          duration: 1
        }
      ]
    },
    sprite: "m51",
    class: "shooter",
    aussehen: "Kleiner gelber Igel, dessen Stacheln knisternde Funken tragen."
  },
  {
    id: "m52",
    name: "Volthamster",
    type: "lightning",
    baseRarity: 1,
    role: "back",
    base: {
      hp: 140,
      atk: 23,
      def: 16,
      spd: 98
    },
    blurb: "Pummeliger Hamster mit Blitzmuster auf den Backen und leuchtendem Schwanz.",
    skill: {
      id: "volthamster_skill",
      name: "Volthamster-Schutz",
      description: "Schild = 9 % eigene Max-HP auf alle Verb\xFCndeten (2 Runden).",
      cooldown: 4,
      initialCooldown: 2,
      target: "ally_all",
      effects: [
        {
          kind: "shield",
          maxHpPctOfCaster: 0.09,
          duration: 2
        }
      ]
    },
    sprite: "m52",
    class: "support",
    aussehen: "Pummeliger Hamster mit Blitzmuster auf den Backen und leuchtendem Schwanz."
  },
  {
    id: "m53",
    name: "Donnerbock",
    type: "lightning",
    baseRarity: 3,
    role: "front",
    base: {
      hp: 160,
      atk: 25,
      def: 15,
      spd: 99
    },
    blurb: "Steinbock mit gezackten gelben H\xF6rnern, Gewitterwolke im Nacken und Funkenschlag an den Hufen.",
    skill: {
      id: "donnerbock_skill",
      name: "Donnerbock-Ansturm",
      description: "Gegnerische Frontreihe: 114 % ATK, 20 % Chance auf Bet\xE4ubung.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_front_all",
      effects: [
        {
          kind: "damage",
          atkMult: 1.15
        },
        {
          kind: "status",
          status: "stun",
          chance: 0.2,
          duration: 1
        }
      ]
    },
    sprite: "m53",
    class: "fighter",
    aussehen: "Steinbock mit gezackten gelben H\xF6rnern, Gewitterwolke im Nacken und Funkenschlag an den Hufen."
  },
  {
    id: "m54",
    name: "Gewitterraupe",
    type: "lightning",
    baseRarity: 4,
    role: "back",
    base: {
      hp: 165,
      atk: 34,
      def: 14,
      spd: 112
    },
    blurb: "Lange Raupe mit Spulensegmenten, zuckenden Lichtb\xF6gen zwischen den Ringen und gl\xFChenden F\xFChlern.",
    skill: {
      id: "gewitterraupe_skill",
      name: "Gewitterraupe-Fluch",
      description: "Gegnerische Hinterreihe: 80 % ATK, 28 % Chance auf Bet\xE4ubung.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_back_all",
      effects: [
        {
          kind: "damage",
          atkMult: 0.8
        },
        {
          kind: "status",
          status: "stun",
          chance: 0.28,
          duration: 1
        }
      ]
    },
    sprite: "m54",
    class: "disruptor",
    aussehen: "Lange Raupe mit Spulensegmenten, zuckenden Lichtb\xF6gen zwischen den Ringen und gl\xFChenden F\xFChlern."
  },
  {
    id: "m55",
    name: "Himmelsdonner",
    type: "lightning",
    baseRarity: 7,
    role: "back",
    base: {
      hp: 175,
      atk: 41,
      def: 16,
      spd: 122
    },
    blurb: "Gewaltiger Donnervogel mit Schwingen aus Gewitterwolken, Kronenblitzen, kreisenden Funkenringen und einem Kern aus wei\xDFem Licht.",
    skill: {
      id: "himmelsdonner_skill",
      name: "Himmelsdonner-Schuss",
      description: "185 % ATK auf das Standardziel, 26 % Chance auf Bet\xE4ubung.",
      cooldown: 3,
      initialCooldown: 2,
      target: "default",
      effects: [
        {
          kind: "damage",
          atkMult: 1.85
        },
        {
          kind: "status",
          status: "stun",
          chance: 0.26,
          duration: 1
        }
      ]
    },
    passive: {
      id: "himmelsdonner_passive",
      name: "Letzter Wille",
      description: "F\xE4llt die HP erstmals unter 50 %: Schild 18 % Max-HP (2 Runden).",
      trigger: {
        kind: "hp_below",
        pct: 0.5
      },
      effects: [
        {
          kind: "shield",
          maxHpPctOfCaster: 0.18,
          duration: 2,
          target: "self"
        }
      ],
      usesPerBattle: 1
    },
    sprite: "m55",
    class: "shooter",
    aussehen: "Gewaltiger Donnervogel mit Schwingen aus Gewitterwolken, Kronenblitzen, kreisenden Funkenringen und einem Kern aus wei\xDFem Licht."
  },
  {
    id: "m56",
    name: "Schraubk\xE4fer",
    type: "metal",
    baseRarity: 0,
    role: "front",
    base: {
      hp: 165,
      atk: 14,
      def: 21,
      spd: 78
    },
    blurb: "Kleiner Blechk\xE4fer mit Schrauben als Beinen und polierter Stahlschale.",
    skill: {
      id: "schraubkaefer_skill",
      name: "Schraubk\xE4fer-Bollwerk",
      description: "Spott 2 Runden und eigene DEF +30 % (2 Runden).",
      cooldown: 4,
      initialCooldown: 1,
      target: "self",
      effects: [
        {
          kind: "status",
          status: "taunt",
          chance: 1,
          duration: 2
        },
        {
          kind: "status",
          status: "def_up",
          chance: 1,
          duration: 2,
          value: 0.3
        }
      ]
    },
    sprite: "m56",
    class: "guardian",
    aussehen: "Kleiner Blechk\xE4fer mit Schrauben als Beinen und polierter Stahlschale."
  },
  {
    id: "m57",
    name: "Zahnradkatze",
    type: "metal",
    baseRarity: 1,
    role: "back",
    base: {
      hp: 110,
      atk: 26,
      def: 10,
      spd: 110
    },
    blurb: "Katze aus Messing mit Zahnr\xE4dern an den Gelenken und dampfendem Schwanzventil.",
    skill: {
      id: "zahnradkatze_skill",
      name: "Zahnradkatze-Schuss",
      description: "155 % ATK auf das Standardziel, 33 % Chance auf DEF \u221220 %.",
      cooldown: 3,
      initialCooldown: 2,
      target: "default",
      effects: [
        {
          kind: "damage",
          atkMult: 1.55
        },
        {
          kind: "status",
          status: "def_down",
          chance: 0.33,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m57",
    class: "shooter",
    aussehen: "Katze aus Messing mit Zahnr\xE4dern an den Gelenken und dampfendem Schwanzventil."
  },
  {
    id: "m58",
    name: "R\xFCstungsechse",
    type: "metal",
    baseRarity: 2,
    role: "front",
    base: {
      hp: 195,
      atk: 16,
      def: 25,
      spd: 83
    },
    blurb: "Echse mit Plattenr\xFCstung, Nieten an den R\xE4ndern und blankem Silberglanz.",
    skill: {
      id: "ruestungsechse_skill",
      name: "R\xFCstungsechse-Bollwerk",
      description: "Spott 2 Runden und eigene DEF +34 % (2 Runden).",
      cooldown: 4,
      initialCooldown: 1,
      target: "self",
      effects: [
        {
          kind: "status",
          status: "taunt",
          chance: 1,
          duration: 2
        },
        {
          kind: "status",
          status: "def_up",
          chance: 1,
          duration: 2,
          value: 0.34
        }
      ]
    },
    sprite: "m58",
    class: "guardian",
    aussehen: "Echse mit Plattenr\xFCstung, Nieten an den R\xE4ndern und blankem Silberglanz."
  },
  {
    id: "m59",
    name: "Klingenschwalbe",
    type: "metal",
    baseRarity: 3,
    role: "back",
    base: {
      hp: 150,
      atk: 31,
      def: 13,
      spd: 110
    },
    blurb: "Schwalbe mit messerscharfen Stahlfedern, Funkenspur im Flug und gravierten Mustern.",
    skill: {
      id: "klingenschwalbe_skill",
      name: "Klingenschwalbe-Fluch",
      description: "Alle Gegner: 75 % ATK, 52 % Chance auf DEF \u221220 %.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_all",
      effects: [
        {
          kind: "damage",
          atkMult: 0.75
        },
        {
          kind: "status",
          status: "def_down",
          chance: 0.52,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m59",
    class: "disruptor",
    aussehen: "Schwalbe mit messerscharfen Stahlfedern, Funkenspur im Flug und gravierten Mustern."
  },
  {
    id: "m60",
    name: "Eisenkoloss",
    type: "metal",
    baseRarity: 5,
    role: "front",
    base: {
      hp: 205,
      atk: 34,
      def: 21,
      spd: 104
    },
    blurb: "Hoher Stahlritter-Golem mit Kolbenarmen, gl\xFChender Ofenbrust, Gravuren und schwebenden Zahnr\xE4dern um die Schultern.",
    skill: {
      id: "eisenkoloss_skill",
      name: "Eisenkoloss-Ansturm",
      description: "Gegnerische Frontreihe: 125 % ATK, 45 % Chance auf DEF \u221220 %.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_front_all",
      effects: [
        {
          kind: "damage",
          atkMult: 1.25
        },
        {
          kind: "status",
          status: "def_down",
          chance: 0.45,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m60",
    class: "fighter",
    aussehen: "Hoher Stahlritter-Golem mit Kolbenarmen, gl\xFChender Ofenbrust, Gravuren und schwebenden Zahnr\xE4dern um die Schultern."
  },
  {
    id: "m61",
    name: "Raufk\xE4nguru",
    type: "fighting",
    baseRarity: 0,
    role: "front",
    base: {
      hp: 135,
      atk: 22,
      def: 13,
      spd: 93
    },
    blurb: "Kleines K\xE4nguru mit Boxhandschuhen und Stirnband.",
    skill: {
      id: "raufkaenguru_skill",
      name: "Raufk\xE4nguru-Ansturm",
      description: "Gegnerische Frontreihe: 100 % ATK, 30 % Chance auf DEF \u221220 %.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_front_all",
      effects: [
        {
          kind: "damage",
          atkMult: 1
        },
        {
          kind: "status",
          status: "def_down",
          chance: 0.3,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m61",
    class: "fighter",
    aussehen: "Kleines K\xE4nguru mit Boxhandschuhen und Stirnband."
  },
  {
    id: "m62",
    name: "M\xF6nchsaffe",
    type: "fighting",
    baseRarity: 1,
    role: "back",
    base: {
      hp: 145,
      atk: 24,
      def: 16,
      spd: 98
    },
    blurb: "Ruhiger Affe in M\xF6nchskutte mit Gebetsperlen und gelassenem Blick.",
    skill: {
      id: "moenchsaffe_skill",
      name: "M\xF6nchsaffe-Schutz",
      description: "Schild = 9 % eigene Max-HP auf alle Verb\xFCndeten (2 Runden).",
      cooldown: 4,
      initialCooldown: 2,
      target: "ally_all",
      effects: [
        {
          kind: "shield",
          maxHpPctOfCaster: 0.09,
          duration: 2
        }
      ]
    },
    sprite: "m62",
    class: "support",
    aussehen: "Ruhiger Affe in M\xF6nchskutte mit Gebetsperlen und gelassenem Blick."
  },
  {
    id: "m63",
    name: "Hiebkrabbe",
    type: "fighting",
    baseRarity: 2,
    role: "front",
    base: {
      hp: 160,
      atk: 26,
      def: 16,
      spd: 98
    },
    blurb: "Krabbe mit \xFCbergro\xDFer Schlagschere, Narben und Kampfbandagen.",
    skill: {
      id: "hiebkrabbe_skill",
      name: "Hiebkrabbe-Ansturm",
      description: "Gegnerische Frontreihe: 110 % ATK, 36 % Chance auf DEF \u221220 %.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_front_all",
      effects: [
        {
          kind: "damage",
          atkMult: 1.1
        },
        {
          kind: "status",
          status: "def_down",
          chance: 0.36,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m63",
    class: "fighter",
    aussehen: "Krabbe mit \xFCbergro\xDFer Schlagschere, Narben und Kampfbandagen."
  },
  {
    id: "m64",
    name: "Ringerb\xE4r",
    type: "fighting",
    baseRarity: 4,
    role: "front",
    base: {
      hp: 235,
      atk: 21,
      def: 29,
      spd: 87
    },
    blurb: "Kr\xE4ftiger B\xE4r im Ringerg\xFCrtel mit Kampfbemalung, gl\xFChenden F\xE4usten und flatterndem Umhang.",
    skill: {
      id: "ringerbaer_skill",
      name: "Ringerb\xE4r-Bollwerk",
      description: "Spott 2 Runden und eigene DEF +38 % (2 Runden).",
      cooldown: 4,
      initialCooldown: 1,
      target: "self",
      effects: [
        {
          kind: "status",
          status: "taunt",
          chance: 1,
          duration: 2
        },
        {
          kind: "status",
          status: "def_up",
          chance: 1,
          duration: 2,
          value: 0.38
        }
      ]
    },
    sprite: "m64",
    class: "guardian",
    aussehen: "Kr\xE4ftiger B\xE4r im Ringerg\xFCrtel mit Kampfbemalung, gl\xFChenden F\xE4usten und flatterndem Umhang."
  },
  {
    id: "m65",
    name: "Gro\xDFmeisterkranich",
    type: "fighting",
    baseRarity: 6,
    role: "back",
    base: {
      hp: 160,
      atk: 39,
      def: 15,
      spd: 121
    },
    blurb: "Edler Kranich in Kampfrobe, dessen Fl\xFCgelschl\xE4ge Druckwellen erzeugen, mit goldenen Armreifen, Aura-Flammen und schwebenden Schriftrollen.",
    skill: {
      id: "grossmeisterkranich_skill",
      name: "Gro\xDFmeisterkranich-Schuss",
      description: "180 % ATK auf das Standardziel, 48 % Chance auf DEF \u221220 %.",
      cooldown: 3,
      initialCooldown: 2,
      target: "default",
      effects: [
        {
          kind: "damage",
          atkMult: 1.8
        },
        {
          kind: "status",
          status: "def_down",
          chance: 0.48,
          duration: 2,
          value: 0.2
        }
      ]
    },
    passive: {
      id: "grossmeisterkranich_passive",
      name: "Letzter Wille",
      description: "F\xE4llt die HP erstmals unter 50 %: Schild 15 % Max-HP (2 Runden).",
      trigger: {
        kind: "hp_below",
        pct: 0.5
      },
      effects: [
        {
          kind: "shield",
          maxHpPctOfCaster: 0.15,
          duration: 2,
          target: "self"
        }
      ],
      usesPerBattle: 1
    },
    sprite: "m65",
    class: "shooter",
    aussehen: "Edler Kranich in Kampfrobe, dessen Fl\xFCgelschl\xE4ge Druckwellen erzeugen, mit goldenen Armreifen, Aura-Flammen und schwebenden Schriftrollen."
  },
  {
    id: "m66",
    name: "W\xFChlmaus",
    type: "beast",
    baseRarity: 0,
    role: "front",
    base: {
      hp: 135,
      atk: 21,
      def: 13,
      spd: 93
    },
    blurb: "Struppige braune Maus mit gro\xDFen Grabklauen und Erde an der Nase.",
    skill: {
      id: "wuehlmaus_skill",
      name: "W\xFChlmaus-Ansturm",
      description: "Gegnerische Frontreihe: 100 % ATK, 30 % Chance auf DEF \u221220 %.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_front_all",
      effects: [
        {
          kind: "damage",
          atkMult: 1
        },
        {
          kind: "status",
          status: "def_down",
          chance: 0.3,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m66",
    class: "fighter",
    aussehen: "Struppige braune Maus mit gro\xDFen Grabklauen und Erde an der Nase."
  },
  {
    id: "m67",
    name: "Borstenferkel",
    type: "beast",
    baseRarity: 0,
    role: "front",
    base: {
      hp: 188,
      atk: 17,
      def: 24,
      spd: 79
    },
    blurb: "Rundes Wildschweinchen mit dichten Borsten und kleinen Hauern.",
    skill: {
      id: "borstenferkel_skill",
      name: "Borstenferkel-Bollwerk",
      description: "Spott 2 Runden und eigene DEF +30 % (2 Runden).",
      cooldown: 4,
      initialCooldown: 1,
      target: "self",
      effects: [
        {
          kind: "status",
          status: "taunt",
          chance: 1,
          duration: 2
        },
        {
          kind: "status",
          status: "def_up",
          chance: 1,
          duration: 2,
          value: 0.3
        }
      ]
    },
    sprite: "m67",
    class: "guardian",
    aussehen: "Rundes Wildschweinchen mit dichten Borsten und kleinen Hauern."
  },
  {
    id: "m68",
    name: "Steppenluchs",
    type: "beast",
    baseRarity: 1,
    role: "back",
    base: {
      hp: 110,
      atk: 25,
      def: 10,
      spd: 111
    },
    blurb: "Sandfarbener Luchs mit Pinselohren und gefleckter M\xE4hne.",
    skill: {
      id: "steppenluchs_skill",
      name: "Steppenluchs-Schuss",
      description: "155 % ATK auf das Standardziel, 33 % Chance auf DEF \u221220 %.",
      cooldown: 3,
      initialCooldown: 2,
      target: "default",
      effects: [
        {
          kind: "damage",
          atkMult: 1.55
        },
        {
          kind: "status",
          status: "def_down",
          chance: 0.33,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m68",
    class: "shooter",
    aussehen: "Sandfarbener Luchs mit Pinselohren und gefleckter M\xE4hne."
  },
  {
    id: "m69",
    name: "Hornb\xFCffel",
    type: "beast",
    baseRarity: 2,
    role: "front",
    base: {
      hp: 205,
      atk: 19,
      def: 26,
      spd: 84
    },
    blurb: "Massiger B\xFCffel mit geschwungenen H\xF6rnern, Fellzotteln und Stammesbemalung.",
    skill: {
      id: "hornbueffel_skill",
      name: "Hornb\xFCffel-Bollwerk",
      description: "Spott 2 Runden und eigene DEF +34 % (2 Runden).",
      cooldown: 4,
      initialCooldown: 1,
      target: "self",
      effects: [
        {
          kind: "status",
          status: "taunt",
          chance: 1,
          duration: 2
        },
        {
          kind: "status",
          status: "def_up",
          chance: 1,
          duration: 2,
          value: 0.34
        }
      ]
    },
    sprite: "m69",
    class: "guardian",
    aussehen: "Massiger B\xFCffel mit geschwungenen H\xF6rnern, Fellzotteln und Stammesbemalung."
  },
  {
    id: "m70",
    name: "Rudelwolf",
    type: "beast",
    baseRarity: 3,
    role: "back",
    base: {
      hp: 145,
      atk: 30,
      def: 12,
      spd: 111
    },
    blurb: "Dunkler Wolf mit Narbe, Knochenhalsband und einer leuchtenden Rudel-Rune auf der Stirn.",
    skill: {
      id: "rudelwolf_skill",
      name: "Rudelwolf-Fluch",
      description: "Gegnerische Hinterreihe: 75 % ATK, 52 % Chance auf DEF \u221220 %.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_back_all",
      effects: [
        {
          kind: "damage",
          atkMult: 0.75
        },
        {
          kind: "status",
          status: "def_down",
          chance: 0.52,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m70",
    class: "disruptor",
    aussehen: "Dunkler Wolf mit Narbe, Knochenhalsband und einer leuchtenden Rudel-Rune auf der Stirn."
  },
  {
    id: "m71",
    name: "Lichtgl\xFChwurm",
    type: "light",
    baseRarity: 0,
    role: "back",
    base: {
      hp: 130,
      atk: 21,
      def: 14,
      spd: 96
    },
    blurb: "Kleiner Wurm mit warm leuchtendem Kopf und Lichtpunkten am K\xF6rper.",
    skill: {
      id: "lichtgluehwurm_skill",
      name: "Lichtgl\xFChwurm-Heilung",
      description: "Heilt den Verb\xFCndeten mit dem niedrigsten HP-% um 150 % ATK.",
      cooldown: 3,
      initialCooldown: 2,
      target: "ally_lowest_hp_pct",
      effects: [
        {
          kind: "heal",
          atkMult: 1.5
        }
      ]
    },
    sprite: "m71",
    class: "support",
    aussehen: "Kleiner Wurm mit warm leuchtendem Kopf und Lichtpunkten am K\xF6rper."
  },
  {
    id: "m72",
    name: "Sonnenk\xFCken",
    type: "light",
    baseRarity: 1,
    role: "back",
    base: {
      hp: 112,
      atk: 26,
      def: 10,
      spd: 110
    },
    blurb: "Goldenes K\xFCken mit Strahlenkranz-Federn auf dem Kopf.",
    skill: {
      id: "sonnenkueken_skill",
      name: "Sonnenk\xFCken-Schuss",
      description: "155 % ATK auf das Standardziel, 33 % Chance auf ATK \u221220 %.",
      cooldown: 3,
      initialCooldown: 2,
      target: "default",
      effects: [
        {
          kind: "damage",
          atkMult: 1.55
        },
        {
          kind: "status",
          status: "atk_down",
          chance: 0.33,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m72",
    class: "shooter",
    aussehen: "Goldenes K\xFCken mit Strahlenkranz-Federn auf dem Kopf."
  },
  {
    id: "m73",
    name: "Heiligenreh",
    type: "light",
    baseRarity: 3,
    role: "back",
    base: {
      hp: 160,
      atk: 26,
      def: 18,
      spd: 102
    },
    blurb: "Wei\xDFes Reh mit Lichtgeweih, goldenen Ornamenten und schwebenden Lichtfunken.",
    skill: {
      id: "heiligenreh_skill",
      name: "Heiligenreh-Heilung",
      description: "Heilt den Verb\xFCndeten mit dem niedrigsten HP-% um 180 % ATK.",
      cooldown: 3,
      initialCooldown: 2,
      target: "ally_lowest_hp_pct",
      effects: [
        {
          kind: "heal",
          atkMult: 1.8
        }
      ]
    },
    sprite: "m73",
    class: "support",
    aussehen: "Wei\xDFes Reh mit Lichtgeweih, goldenen Ornamenten und schwebenden Lichtfunken."
  },
  {
    id: "m74",
    name: "Glanzl\xF6we",
    type: "light",
    baseRarity: 5,
    role: "front",
    base: {
      hp: 215,
      atk: 37,
      def: 22,
      spd: 103
    },
    blurb: "Goldener L\xF6we mit M\xE4hne aus Sonnenstrahlen, Brustplatte mit Sonnenwappen und leuchtenden Pfotenabdr\xFCcken.",
    skill: {
      id: "glanzloewe_skill",
      name: "Glanzl\xF6we-Ansturm",
      description: "Gegnerische Frontreihe: 125 % ATK, 45 % Chance auf ATK \u221220 %.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_front_all",
      effects: [
        {
          kind: "damage",
          atkMult: 1.25
        },
        {
          kind: "status",
          status: "atk_down",
          chance: 0.45,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m74",
    class: "fighter",
    aussehen: "Goldener L\xF6we mit M\xE4hne aus Sonnenstrahlen, Brustplatte mit Sonnenwappen und leuchtenden Pfotenabdr\xFCcken."
  },
  {
    id: "m75",
    name: "Seraphhirsch",
    type: "light",
    baseRarity: 7,
    role: "front",
    base: {
      hp: 260,
      atk: 22,
      def: 33,
      spd: 92
    },
    blurb: "Majest\xE4tischer Hirsch mit sechs Lichtfl\xFCgeln, Heiligenschein-Geweih, schwebenden goldenen Ringen und einem Funkenregen.",
    skill: {
      id: "seraphhirsch_skill",
      name: "Seraphhirsch-Bollwerk",
      description: "Spott 2 Runden und eigene DEF +44 % (2 Runden).",
      cooldown: 4,
      initialCooldown: 1,
      target: "self",
      effects: [
        {
          kind: "status",
          status: "taunt",
          chance: 1,
          duration: 2
        },
        {
          kind: "status",
          status: "def_up",
          chance: 1,
          duration: 2,
          value: 0.44
        }
      ]
    },
    passive: {
      id: "seraphhirsch_passive",
      name: "Letzter Wille",
      description: "F\xE4llt die HP erstmals unter 50 %: Schild 18 % Max-HP (2 Runden).",
      trigger: {
        kind: "hp_below",
        pct: 0.5
      },
      effects: [
        {
          kind: "shield",
          maxHpPctOfCaster: 0.18,
          duration: 2,
          target: "self"
        }
      ],
      usesPerBattle: 1
    },
    sprite: "m75",
    class: "guardian",
    aussehen: "Majest\xE4tischer Hirsch mit sechs Lichtfl\xFCgeln, Heiligenschein-Geweih, schwebenden goldenen Ringen und einem Funkenregen."
  },
  {
    id: "m76",
    name: "Schattenmaus",
    type: "shadow",
    baseRarity: 0,
    role: "back",
    base: {
      hp: 121,
      atk: 26,
      def: 10,
      spd: 103
    },
    blurb: "Kleine schwarze Maus mit violetten Augen und rauchigem Schwanz.",
    skill: {
      id: "schattenmaus_skill",
      name: "Schattenmaus-Fluch",
      description: "Gegnerische Hinterreihe: 60 % ATK, 40 % Chance auf ATK \u221220 %.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_back_all",
      effects: [
        {
          kind: "damage",
          atkMult: 0.6
        },
        {
          kind: "status",
          status: "atk_down",
          chance: 0.4,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m76",
    class: "disruptor",
    aussehen: "Kleine schwarze Maus mit violetten Augen und rauchigem Schwanz."
  },
  {
    id: "m77",
    name: "D\xE4mmerkatze",
    type: "shadow",
    baseRarity: 1,
    role: "back",
    base: {
      hp: 108,
      atk: 26,
      def: 10,
      spd: 110
    },
    blurb: "Schlanke Katze mit Fell wie Abendhimmel und Sternpunkten.",
    skill: {
      id: "daemmerkatze_skill",
      name: "D\xE4mmerkatze-Schuss",
      description: "155 % ATK auf das Standardziel, 33 % Chance auf ATK \u221220 %.",
      cooldown: 3,
      initialCooldown: 2,
      target: "default",
      effects: [
        {
          kind: "damage",
          atkMult: 1.55
        },
        {
          kind: "status",
          status: "atk_down",
          chance: 0.33,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m77",
    class: "shooter",
    aussehen: "Schlanke Katze mit Fell wie Abendhimmel und Sternpunkten."
  },
  {
    id: "m78",
    name: "Nebelkr\xE4he",
    type: "shadow",
    baseRarity: 2,
    role: "back",
    base: {
      hp: 140,
      atk: 29,
      def: 12,
      spd: 108
    },
    blurb: "Kr\xE4he aus dunklem Nebel mit gl\xFChenden Augen und zerfasernden Federn.",
    skill: {
      id: "nebelkraehe_skill",
      name: "Nebelkr\xE4he-Fluch",
      description: "Gegnerische Hinterreihe: 70 % ATK, 48 % Chance auf ATK \u221220 %.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_back_all",
      effects: [
        {
          kind: "damage",
          atkMult: 0.7
        },
        {
          kind: "status",
          status: "atk_down",
          chance: 0.48,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m78",
    class: "disruptor",
    aussehen: "Kr\xE4he aus dunklem Nebel mit gl\xFChenden Augen und zerfasernden Federn."
  },
  {
    id: "m79",
    name: "Schattenpanther",
    type: "shadow",
    baseRarity: 4,
    role: "front",
    base: {
      hp: 175,
      atk: 28,
      def: 17,
      spd: 102
    },
    blurb: "Schwarzer Panther mit violetten Rauchschwaden, leuchtenden Runenstreifen und Klauen aus Dunkelheit.",
    skill: {
      id: "schattenpanther_skill",
      name: "Schattenpanther-Ansturm",
      description: "Gegnerische Frontreihe: 120 % ATK, 42 % Chance auf ATK \u221220 %.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_front_all",
      effects: [
        {
          kind: "damage",
          atkMult: 1.2
        },
        {
          kind: "status",
          status: "atk_down",
          chance: 0.42,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m79",
    class: "fighter",
    aussehen: "Schwarzer Panther mit violetten Rauchschwaden, leuchtenden Runenstreifen und Klauen aus Dunkelheit."
  },
  {
    id: "m80",
    name: "Finsterf\xFCrst",
    type: "shadow",
    baseRarity: 8,
    role: "back",
    base: {
      hp: 222,
      atk: 47,
      def: 19,
      spd: 124
    },
    blurb: "Gekr\xF6nter Schattendrache-F\xFCrst mit Umhang aus Nacht, schwebenden dunklen Sternen, violetten Flammenaugen und einer Aura verschluckten Lichts.",
    skill: {
      id: "finsterfuerst_skill",
      name: "Finsterf\xFCrst-Fluch",
      description: "Gegnerische Hinterreihe: 100 % ATK, 72 % Chance auf ATK \u221220 %.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_back_all",
      effects: [
        {
          kind: "damage",
          atkMult: 1
        },
        {
          kind: "status",
          status: "atk_down",
          chance: 0.72,
          duration: 2,
          value: 0.2
        }
      ]
    },
    passive: {
      id: "finsterfuerst_passive",
      name: "Letzter Wille",
      description: "F\xE4llt die HP erstmals unter 50 %: Schild 21 % Max-HP (2 Runden).",
      trigger: {
        kind: "hp_below",
        pct: 0.5
      },
      effects: [
        {
          kind: "shield",
          maxHpPctOfCaster: 0.21,
          duration: 2,
          target: "self"
        }
      ],
      usesPerBattle: 1
    },
    sprite: "m80",
    class: "disruptor",
    aussehen: "Gekr\xF6nter Schattendrache-F\xFCrst mit Umhang aus Nacht, schwebenden dunklen Sternen, violetten Flammenaugen und einer Aura verschluckten Lichts."
  },
  {
    id: "m81",
    name: "Irrlicht",
    type: "ghost",
    baseRarity: 0,
    role: "back",
    base: {
      hp: 104,
      atk: 25,
      def: 10,
      spd: 108
    },
    blurb: "Kleine blaue Geisterflamme mit gro\xDFen Augen und Schw\xE4nzchen.",
    skill: {
      id: "irrlicht_skill",
      name: "Irrlicht-Schuss",
      description: "150 % ATK auf das Standardziel, 30 % Chance auf DEF \u221220 %.",
      cooldown: 3,
      initialCooldown: 2,
      target: "default",
      effects: [
        {
          kind: "damage",
          atkMult: 1.5
        },
        {
          kind: "status",
          status: "def_down",
          chance: 0.3,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m81",
    class: "shooter",
    aussehen: "Kleine blaue Geisterflamme mit gro\xDFen Augen und Schw\xE4nzchen."
  },
  {
    id: "m82",
    name: "Laternengeist",
    type: "ghost",
    baseRarity: 1,
    role: "back",
    base: {
      hp: 145,
      atk: 24,
      def: 16,
      spd: 98
    },
    blurb: "Kleiner Geist, der eine alte Laterne tr\xE4gt, mit flatterndem Lakenk\xF6rper.",
    skill: {
      id: "laternengeist_skill",
      name: "Laternengeist-Schutz",
      description: "Schild = 9 % eigene Max-HP auf alle Verb\xFCndeten (2 Runden).",
      cooldown: 4,
      initialCooldown: 2,
      target: "ally_all",
      effects: [
        {
          kind: "shield",
          maxHpPctOfCaster: 0.09,
          duration: 2
        }
      ]
    },
    sprite: "m82",
    class: "support",
    aussehen: "Kleiner Geist, der eine alte Laterne tr\xE4gt, mit flatterndem Lakenk\xF6rper."
  },
  {
    id: "m83",
    name: "Spukr\xFCstung",
    type: "ghost",
    baseRarity: 2,
    role: "front",
    base: {
      hp: 215,
      atk: 20,
      def: 27,
      spd: 83
    },
    blurb: "Leere Ritterr\xFCstung, aus deren Fugen blasser Geisternebel quillt.",
    skill: {
      id: "spukruestung_skill",
      name: "Spukr\xFCstung-Bollwerk",
      description: "Spott 2 Runden und eigene DEF +34 % (2 Runden).",
      cooldown: 4,
      initialCooldown: 1,
      target: "self",
      effects: [
        {
          kind: "status",
          status: "taunt",
          chance: 1,
          duration: 2
        },
        {
          kind: "status",
          status: "def_up",
          chance: 1,
          duration: 2,
          value: 0.34
        }
      ]
    },
    sprite: "m83",
    class: "guardian",
    aussehen: "Leere Ritterr\xFCstung, aus deren Fugen blasser Geisternebel quillt."
  },
  {
    id: "m84",
    name: "Seelenschleier",
    type: "ghost",
    baseRarity: 3,
    role: "back",
    base: {
      hp: 145,
      atk: 30,
      def: 12,
      spd: 110
    },
    blurb: "Schwebende Frauengestalt aus Schleiern mit Seelenlichtern und Kettenresten.",
    skill: {
      id: "seelenschleier_skill",
      name: "Seelenschleier-Fluch",
      description: "Gegnerische Hinterreihe: 75 % ATK, 52 % Chance auf DEF \u221220 %.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_back_all",
      effects: [
        {
          kind: "damage",
          atkMult: 0.75
        },
        {
          kind: "status",
          status: "def_down",
          chance: 0.52,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m84",
    class: "disruptor",
    aussehen: "Schwebende Frauengestalt aus Schleiern mit Seelenlichtern und Kettenresten."
  },
  {
    id: "m85",
    name: "Geisterk\xF6nig",
    type: "ghost",
    baseRarity: 6,
    role: "front",
    base: {
      hp: 220,
      atk: 35,
      def: 21,
      spd: 106
    },
    blurb: "Geisterhafter K\xF6nig mit zerrissenem Mantel, Krone aus Grabkerzen, kreisenden Seelenlichtern und einem \xE4therischen Schwert.",
    skill: {
      id: "geisterkoenig_skill",
      name: "Geisterk\xF6nig-Ansturm",
      description: "Gegnerische Frontreihe: 130 % ATK, 48 % Chance auf DEF \u221220 %.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_front_all",
      effects: [
        {
          kind: "damage",
          atkMult: 1.3
        },
        {
          kind: "status",
          status: "def_down",
          chance: 0.48,
          duration: 2,
          value: 0.2
        }
      ]
    },
    passive: {
      id: "geisterkoenig_passive",
      name: "Letzter Wille",
      description: "F\xE4llt die HP erstmals unter 50 %: Schild 15 % Max-HP (2 Runden).",
      trigger: {
        kind: "hp_below",
        pct: 0.5
      },
      effects: [
        {
          kind: "shield",
          maxHpPctOfCaster: 0.15,
          duration: 2,
          target: "self"
        }
      ],
      usesPerBattle: 1
    },
    sprite: "m85",
    class: "fighter",
    aussehen: "Geisterhafter K\xF6nig mit zerrissenem Mantel, Krone aus Grabkerzen, kreisenden Seelenlichtern und einem \xE4therischen Schwert."
  },
  {
    id: "m86",
    name: "Gedankenqualle",
    type: "psychic",
    baseRarity: 0,
    role: "back",
    base: {
      hp: 121,
      atk: 26,
      def: 10,
      spd: 103
    },
    blurb: "Rosa Qualle, deren Schirm wie ein Gehirn pulsiert.",
    skill: {
      id: "gedankenqualle_skill",
      name: "Gedankenqualle-Fluch",
      description: "Gegnerische Hinterreihe: 60 % ATK, 40 % Chance auf ATK \u221220 %.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_back_all",
      effects: [
        {
          kind: "damage",
          atkMult: 0.6
        },
        {
          kind: "status",
          status: "atk_down",
          chance: 0.4,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m86",
    class: "disruptor",
    aussehen: "Rosa Qualle, deren Schirm wie ein Gehirn pulsiert."
  },
  {
    id: "m87",
    name: "Traumkatze",
    type: "psychic",
    baseRarity: 1,
    role: "back",
    base: {
      hp: 145,
      atk: 24,
      def: 16,
      spd: 98
    },
    blurb: "Schlafende Katze auf schwebendem Kissen mit Traumblasen.",
    skill: {
      id: "traumkatze_skill",
      name: "Traumkatze-Heilung",
      description: "Heilt den Verb\xFCndeten mit dem niedrigsten HP-% um 160 % ATK.",
      cooldown: 3,
      initialCooldown: 2,
      target: "ally_lowest_hp_pct",
      effects: [
        {
          kind: "heal",
          atkMult: 1.6
        }
      ]
    },
    sprite: "m87",
    class: "support",
    aussehen: "Schlafende Katze auf schwebendem Kissen mit Traumblasen."
  },
  {
    id: "m88",
    name: "Augenmotte",
    type: "psychic",
    baseRarity: 2,
    role: "back",
    base: {
      hp: 125,
      atk: 31,
      def: 11,
      spd: 113
    },
    blurb: "Motte mit Augenmustern auf den Fl\xFCgeln, die hypnotisch schimmern.",
    skill: {
      id: "augenmotte_skill",
      name: "Augenmotte-Schuss",
      description: "160 % ATK auf das Standardziel, 36 % Chance auf ATK \u221220 %.",
      cooldown: 3,
      initialCooldown: 2,
      target: "default",
      effects: [
        {
          kind: "damage",
          atkMult: 1.6
        },
        {
          kind: "status",
          status: "atk_down",
          chance: 0.36,
          duration: 2,
          value: 0.2
        }
      ]
    },
    sprite: "m88",
    class: "shooter",
    aussehen: "Motte mit Augenmustern auf den Fl\xFCgeln, die hypnotisch schimmern."
  },
  {
    id: "m89",
    name: "Orakeleule",
    type: "psychic",
    baseRarity: 4,
    role: "back",
    base: {
      hp: 172,
      atk: 28,
      def: 19,
      spd: 105
    },
    blurb: "Eule mit drittem Auge, schwebenden Tarotkarten und violetter Gedankenaura.",
    skill: {
      id: "orakeleule_skill",
      name: "Orakeleule-Heilung",
      description: "Heilt den Verb\xFCndeten mit dem niedrigsten HP-% um 190 % ATK.",
      cooldown: 3,
      initialCooldown: 2,
      target: "ally_lowest_hp_pct",
      effects: [
        {
          kind: "heal",
          atkMult: 1.9
        }
      ]
    },
    sprite: "m89",
    class: "support",
    aussehen: "Eule mit drittem Auge, schwebenden Tarotkarten und violetter Gedankenaura."
  },
  {
    id: "m90",
    name: "Astralsphinx",
    type: "psychic",
    baseRarity: 7,
    role: "back",
    base: {
      hp: 210,
      atk: 41,
      def: 18,
      spd: 117
    },
    blurb: "Sphinx aus Sternenlicht mit Gedankenkrone, kreisenden Runenringen, schwebenden Kristallaugen und einem kosmischen Schleier.",
    skill: {
      id: "astralsphinx_skill",
      name: "Astralsphinx-Fluch",
      description: "Gegnerische Hinterreihe: 95 % ATK, 68 % Chance auf ATK \u221220 %.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_back_all",
      effects: [
        {
          kind: "damage",
          atkMult: 0.95
        },
        {
          kind: "status",
          status: "atk_down",
          chance: 0.68,
          duration: 2,
          value: 0.2
        }
      ]
    },
    passive: {
      id: "astralsphinx_passive",
      name: "Letzter Wille",
      description: "F\xE4llt die HP erstmals unter 50 %: Schild 18 % Max-HP (2 Runden).",
      trigger: {
        kind: "hp_below",
        pct: 0.5
      },
      effects: [
        {
          kind: "shield",
          maxHpPctOfCaster: 0.18,
          duration: 2,
          target: "self"
        }
      ],
      usesPerBattle: 1
    },
    sprite: "m90",
    class: "disruptor",
    aussehen: "Sphinx aus Sternenlicht mit Gedankenkrone, kreisenden Runenringen, schwebenden Kristallaugen und einem kosmischen Schleier."
  },
  {
    id: "m91",
    name: "Summhummel",
    type: "sound",
    baseRarity: 0,
    role: "back",
    base: {
      hp: 130,
      atk: 21,
      def: 14,
      spd: 96
    },
    blurb: "Pelzige Hummel mit Notenmuster und kleinen Schallwellen um die Fl\xFCgel.",
    skill: {
      id: "summhummel_skill",
      name: "Summhummel-Heilung",
      description: "Heilt den Verb\xFCndeten mit dem niedrigsten HP-% um 150 % ATK.",
      cooldown: 3,
      initialCooldown: 2,
      target: "ally_lowest_hp_pct",
      effects: [
        {
          kind: "heal",
          atkMult: 1.5
        }
      ]
    },
    sprite: "m91",
    class: "support",
    aussehen: "Pelzige Hummel mit Notenmuster und kleinen Schallwellen um die Fl\xFCgel."
  },
  {
    id: "m92",
    name: "Echofledermaus",
    type: "sound",
    baseRarity: 1,
    role: "back",
    base: {
      hp: 112,
      atk: 26,
      def: 10,
      spd: 110
    },
    blurb: "Fledermaus mit riesigen Ohren und sichtbaren Echo-Ringen.",
    skill: {
      id: "echofledermaus_skill",
      name: "Echofledermaus-Schuss",
      description: "155 % ATK auf das Standardziel, 17 % Chance auf Bet\xE4ubung.",
      cooldown: 3,
      initialCooldown: 2,
      target: "default",
      effects: [
        {
          kind: "damage",
          atkMult: 1.55
        },
        {
          kind: "status",
          status: "stun",
          chance: 0.17,
          duration: 1
        }
      ]
    },
    sprite: "m92",
    class: "shooter",
    aussehen: "Fledermaus mit riesigen Ohren und sichtbaren Echo-Ringen."
  },
  {
    id: "m93",
    name: "Trommelfrosch",
    type: "sound",
    baseRarity: 2,
    role: "front",
    base: {
      hp: 205,
      atk: 22,
      def: 26,
      spd: 83
    },
    blurb: "Dicker Frosch mit Trommelbauch und Schlagzeug-Muster.",
    skill: {
      id: "trommelfrosch_skill",
      name: "Trommelfrosch-Bollwerk",
      description: "Spott 2 Runden und eigene DEF +34 % (2 Runden).",
      cooldown: 4,
      initialCooldown: 1,
      target: "self",
      effects: [
        {
          kind: "status",
          status: "taunt",
          chance: 1,
          duration: 2
        },
        {
          kind: "status",
          status: "def_up",
          chance: 1,
          duration: 2,
          value: 0.34
        }
      ]
    },
    sprite: "m93",
    class: "guardian",
    aussehen: "Dicker Frosch mit Trommelbauch und Schlagzeug-Muster."
  },
  {
    id: "m94",
    name: "Sirenenvogel",
    type: "sound",
    baseRarity: 3,
    role: "back",
    base: {
      hp: 150,
      atk: 31,
      def: 13,
      spd: 110
    },
    blurb: "Bunter Paradiesvogel mit Schweif aus Notenb\xE4ndern und schimmernden Schallwellen.",
    skill: {
      id: "sirenenvogel_skill",
      name: "Sirenenvogel-Fluch",
      description: "Gegnerische Hinterreihe: 75 % ATK, 26 % Chance auf Bet\xE4ubung.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_back_all",
      effects: [
        {
          kind: "damage",
          atkMult: 0.75
        },
        {
          kind: "status",
          status: "stun",
          chance: 0.26,
          duration: 1
        }
      ]
    },
    sprite: "m94",
    class: "disruptor",
    aussehen: "Bunter Paradiesvogel mit Schweif aus Notenb\xE4ndern und schimmernden Schallwellen."
  },
  {
    id: "m95",
    name: "Resonanzhirsch",
    type: "sound",
    baseRarity: 5,
    role: "front",
    base: {
      hp: 205,
      atk: 34,
      def: 21,
      spd: 104
    },
    blurb: "Hirsch mit Geweih aus Stimmgabeln, vibrierenden Klangringen, leuchtenden Saiten am Hals und Notenfunken.",
    skill: {
      id: "resonanzhirsch_skill",
      name: "Resonanzhirsch-Ansturm",
      description: "Gegnerische Frontreihe: 125 % ATK, 23 % Chance auf Bet\xE4ubung.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_front_all",
      effects: [
        {
          kind: "damage",
          atkMult: 1.25
        },
        {
          kind: "status",
          status: "stun",
          chance: 0.23,
          duration: 1
        }
      ]
    },
    sprite: "m95",
    class: "fighter",
    aussehen: "Hirsch mit Geweih aus Stimmgabeln, vibrierenden Klangringen, leuchtenden Saiten am Hals und Notenfunken."
  },
  {
    id: "m96",
    name: "Drachenwelpe",
    type: "dragon",
    baseRarity: 1,
    role: "front",
    base: {
      hp: 147,
      atk: 23,
      def: 14,
      spd: 94
    },
    blurb: "Kleiner roter Drache mit Stummelfl\xFCgeln und Rauchw\xF6lkchen aus der Nase.",
    skill: {
      id: "drachenwelpe_skill",
      name: "Drachenwelpe-Ansturm",
      description: "Gegnerische Frontreihe: 105 % ATK, 33 % Chance auf Verbrennung.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_front_all",
      effects: [
        {
          kind: "damage",
          atkMult: 1.05
        },
        {
          kind: "status",
          status: "burn",
          chance: 0.33,
          duration: 2,
          value: 0.3
        }
      ]
    },
    sprite: "m96",
    class: "fighter",
    aussehen: "Kleiner roter Drache mit Stummelfl\xFCgeln und Rauchw\xF6lkchen aus der Nase."
  },
  {
    id: "m97",
    name: "Schuppenwyrm",
    type: "dragon",
    baseRarity: 2,
    role: "back",
    base: {
      hp: 125,
      atk: 31,
      def: 11,
      spd: 112
    },
    blurb: "Schlanker Wyrm mit Bronzeschuppen, Hornreihe und gl\xFChender Kehle.",
    skill: {
      id: "schuppenwyrm_skill",
      name: "Schuppenwyrm-Schuss",
      description: "160 % ATK auf das Standardziel, 36 % Chance auf Verbrennung.",
      cooldown: 3,
      initialCooldown: 2,
      target: "default",
      effects: [
        {
          kind: "damage",
          atkMult: 1.6
        },
        {
          kind: "status",
          status: "burn",
          chance: 0.36,
          duration: 2,
          value: 0.3
        }
      ]
    },
    sprite: "m97",
    class: "shooter",
    aussehen: "Schlanker Wyrm mit Bronzeschuppen, Hornreihe und gl\xFChender Kehle."
  },
  {
    id: "m98",
    name: "Wolkendrache",
    type: "dragon",
    baseRarity: 3,
    role: "back",
    base: {
      hp: 160,
      atk: 26,
      def: 18,
      spd: 102
    },
    blurb: "Langer \xF6stlicher Drache mit Wolkenbart, Perlenschnurrhaaren und schwebenden B\xE4ndern.",
    skill: {
      id: "wolkendrache_skill",
      name: "Wolkendrache-Schutz",
      description: "Schild = 11 % eigene Max-HP auf alle Verb\xFCndeten (2 Runden).",
      cooldown: 4,
      initialCooldown: 2,
      target: "ally_all",
      effects: [
        {
          kind: "shield",
          maxHpPctOfCaster: 0.11,
          duration: 2
        }
      ]
    },
    sprite: "m98",
    class: "support",
    aussehen: "Langer \xF6stlicher Drache mit Wolkenbart, Perlenschnurrhaaren und schwebenden B\xE4ndern."
  },
  {
    id: "m99",
    name: "Hornlindwurm",
    type: "dragon",
    baseRarity: 4,
    role: "front",
    base: {
      hp: 230,
      atk: 22,
      def: 29,
      spd: 87
    },
    blurb: "Massiger Lindwurm mit Panzerschuppen, Hornkrone, gl\xFChenden Rissen und rauchendem Atem.",
    skill: {
      id: "hornlindwurm_skill",
      name: "Hornlindwurm-Bollwerk",
      description: "Spott 2 Runden und eigene DEF +38 % (2 Runden).",
      cooldown: 4,
      initialCooldown: 1,
      target: "self",
      effects: [
        {
          kind: "status",
          status: "taunt",
          chance: 1,
          duration: 2
        },
        {
          kind: "status",
          status: "def_up",
          chance: 1,
          duration: 2,
          value: 0.38
        }
      ]
    },
    sprite: "m99",
    class: "guardian",
    aussehen: "Massiger Lindwurm mit Panzerschuppen, Hornkrone, gl\xFChenden Rissen und rauchendem Atem."
  },
  {
    id: "m100",
    name: "Urdrache Velunor",
    type: "dragon",
    baseRarity: 9,
    role: "front",
    base: {
      hp: 260,
      atk: 42,
      def: 25,
      spd: 110
    },
    blurb: "Uralter Weltendrache mit Schwingen voller Sternbilder, Krone aus allen 20 Typ-Elementen, schwebenden Ruinenringen, Lichtschweif und einer Aura, die Raum und Farbe verzerrt.",
    skill: {
      id: "urdrache_velunor_skill",
      name: "Urdrache Velunor-Ansturm",
      description: "Gegnerische Frontreihe: 145 % ATK, 56 % Chance auf Verbrennung.",
      cooldown: 4,
      initialCooldown: 2,
      target: "enemy_front_all",
      effects: [
        {
          kind: "damage",
          atkMult: 1.45
        },
        {
          kind: "status",
          status: "burn",
          chance: 0.57,
          duration: 2,
          value: 0.3
        }
      ]
    },
    passive: {
      id: "urdrache_velunor_passive",
      name: "Letzter Wille",
      description: "F\xE4llt die HP erstmals unter 50 %: Schild 24 % Max-HP (2 Runden).",
      trigger: {
        kind: "hp_below",
        pct: 0.5
      },
      effects: [
        {
          kind: "shield",
          maxHpPctOfCaster: 0.24,
          duration: 2,
          target: "self"
        }
      ],
      usesPerBattle: 1
    },
    sprite: "m100",
    class: "fighter",
    aussehen: "Uralter Weltendrache mit Schwingen voller Sternbilder, Krone aus allen 20 Typ-Elementen, schwebenden Ruinenringen, Lichtschweif und einer Aura, die Raum und Farbe verzerrt."
  }
];

// data/stages.json
var stages_default = {
  chapters: [
    {
      id: 1,
      name: "Kapitel 1 \xB7 Das Tal von Velunor",
      unlock: "campaign_ch1"
    },
    {
      id: 2,
      name: "Kapitel 2 \xB7 Nebelsumpf & Kristallgrotten",
      unlock: "campaign_ch2"
    }
  ],
  starChests: {
    "1": [
      {
        stars: 10,
        reward: {
          gold: 500,
          gems: 30
        }
      },
      {
        stars: 20,
        reward: {
          gold: 1500,
          essence: 50
        }
      },
      {
        stars: 30,
        reward: {
          gold: 2e3,
          tickets: 1
        }
      }
    ],
    "2": [
      {
        stars: 10,
        reward: {
          gold: 1500,
          gems: 50
        }
      },
      {
        stars: 20,
        reward: {
          gold: 2500,
          essence: 80
        }
      },
      {
        stars: 30,
        reward: {
          gold: 3500,
          tickets: 1
        }
      }
    ]
  },
  stages: [
    {
      id: "1-1",
      name: "Dorfbrunnen",
      chapter: 1,
      enemyLevel: 1,
      enemyRarity: 0,
      enemySynergies: false,
      enemyClassSynergies: false,
      enemies: [
        {
          slot: "F1",
          speciesId: "m02"
        },
        {
          slot: "H1",
          speciesId: "m01"
        }
      ],
      hint: "Pflanze (gg. Wasser), Erde (gg. Feuer)",
      rewards: {
        firstClear: {
          gold: 140,
          gems: 30,
          exp: 45
        },
        repeat: {
          gold: 70,
          exp: 45
        },
        threeStarBonus: {
          gems: 20
        }
      },
      recommendedKK: 207,
      s: 1
    },
    {
      id: "1-2",
      name: "Lehmpfad",
      chapter: 1,
      enemyLevel: 2,
      enemyRarity: 0,
      enemySynergies: false,
      enemyClassSynergies: false,
      enemies: [
        {
          slot: "F1",
          speciesId: "m04"
        },
        {
          slot: "H1",
          speciesId: "m03"
        }
      ],
      hint: "Wasser (gg. Erde), Feuer (gg. Pflanze)",
      rewards: {
        firstClear: {
          gold: 180,
          gems: 30,
          exp: 60
        },
        repeat: {
          gold: 90,
          exp: 60
        },
        threeStarBonus: {
          gems: 20
        }
      },
      recommendedKK: 213,
      s: 2
    },
    {
      id: "1-3",
      name: "M\xFChlbach",
      chapter: 1,
      enemyLevel: 3,
      enemyRarity: 0,
      enemySynergies: false,
      enemyClassSynergies: false,
      enemies: [
        {
          slot: "F1",
          speciesId: "m04"
        },
        {
          slot: "F2",
          speciesId: "m02"
        },
        {
          slot: "H1",
          speciesId: "m01"
        }
      ],
      hint: "Wasser, Erde",
      rewards: {
        firstClear: {
          gold: 220,
          gems: 30,
          exp: 75
        },
        repeat: {
          gold: 110,
          exp: 75
        },
        threeStarBonus: {
          gems: 20
        }
      },
      recommendedKK: 361,
      s: 3
    },
    {
      id: "1-4",
      name: "Uferwiese",
      chapter: 1,
      enemyLevel: 5,
      enemyRarity: 0,
      enemySynergies: false,
      enemyClassSynergies: false,
      enemies: [
        {
          slot: "F1",
          speciesId: "m02"
        },
        {
          slot: "F2",
          speciesId: "m04"
        },
        {
          slot: "H1",
          speciesId: "m03"
        }
      ],
      hint: "Feuer, Pflanze; Heiler zuerst",
      rewards: {
        firstClear: {
          gold: 260,
          gems: 30,
          exp: 90
        },
        repeat: {
          gold: 130,
          exp: 90
        },
        threeStarBonus: {
          gems: 20
        }
      },
      recommendedKK: 399,
      s: 4
    },
    {
      id: "1-5",
      name: "Ascheacker",
      chapter: 1,
      enemyLevel: 6,
      enemyRarity: 0,
      enemySynergies: false,
      enemyClassSynergies: false,
      enemies: [
        {
          slot: "F1",
          speciesId: "m05"
        },
        {
          slot: "F2",
          speciesId: "m04"
        },
        {
          slot: "H1",
          speciesId: "m01"
        }
      ],
      hint: "Erde (gg. Feuer), Wasser (gg. Erde)",
      rewards: {
        firstClear: {
          gold: 300,
          gems: 30,
          exp: 105
        },
        repeat: {
          gold: 150,
          exp: 105
        },
        threeStarBonus: {
          gems: 20
        }
      },
      recommendedKK: 453,
      s: 5
    },
    {
      id: "1-6",
      name: "Moosgrund",
      chapter: 1,
      enemyLevel: 7,
      enemyRarity: 0,
      enemySynergies: true,
      enemyClassSynergies: false,
      enemies: [
        {
          slot: "F1",
          speciesId: "m06"
        },
        {
          slot: "F2",
          speciesId: "m02"
        },
        {
          slot: "H1",
          speciesId: "m03"
        },
        {
          slot: "H2",
          speciesId: "m07"
        }
      ],
      hint: "Feuer (gg. Pflanze), Pflanze (gg. Wasser)",
      rewards: {
        firstClear: {
          gold: 340,
          gems: 30,
          exp: 120
        },
        repeat: {
          gold: 170,
          exp: 120
        },
        threeStarBonus: {
          gems: 20
        }
      },
      recommendedKK: 615,
      s: 6
    },
    {
      id: "1-7",
      name: "Sandhang",
      chapter: 1,
      enemyLevel: 8,
      enemyRarity: 0,
      enemySynergies: true,
      enemyClassSynergies: false,
      enemies: [
        {
          slot: "F1",
          speciesId: "m04"
        },
        {
          slot: "F2",
          speciesId: "m05"
        },
        {
          slot: "H1",
          speciesId: "m08"
        },
        {
          slot: "H2",
          speciesId: "m01"
        }
      ],
      hint: "Wasser (gg. Erde), Erde (gg. Feuer)",
      rewards: {
        firstClear: {
          gold: 380,
          gems: 30,
          exp: 135
        },
        repeat: {
          gold: 190,
          exp: 135
        },
        threeStarBonus: {
          gems: 20
        }
      },
      recommendedKK: 680,
      s: 7
    },
    {
      id: "1-8",
      name: "Wurzelhain",
      chapter: 1,
      enemyLevel: 9,
      enemyRarity: 1,
      enemySynergies: true,
      enemyClassSynergies: false,
      enemies: [
        {
          slot: "F1",
          speciesId: "m06"
        },
        {
          slot: "F2",
          speciesId: "m04"
        },
        {
          slot: "H1",
          speciesId: "m03"
        },
        {
          slot: "H2",
          speciesId: "m08"
        }
      ],
      hint: "Feuer, Wasser; Dornen beachten",
      rewards: {
        firstClear: {
          gold: 420,
          gems: 30,
          exp: 150
        },
        repeat: {
          gold: 210,
          exp: 150
        },
        threeStarBonus: {
          gems: 20
        }
      },
      recommendedKK: 800,
      s: 8
    },
    {
      id: "1-9",
      name: "Glutlichtung",
      chapter: 1,
      enemyLevel: 11,
      enemyRarity: 1,
      enemySynergies: true,
      enemyClassSynergies: true,
      enemies: [
        {
          slot: "F1",
          speciesId: "m05"
        },
        {
          slot: "F2",
          speciesId: "m06"
        },
        {
          slot: "H1",
          speciesId: "m01"
        },
        {
          slot: "H2",
          speciesId: "m07"
        },
        {
          slot: "H3",
          speciesId: "m03"
        }
      ],
      hint: "Erde, Feuer; gemischt \u2013 Synergie lohnt",
      rewards: {
        firstClear: {
          gold: 460,
          gems: 30,
          exp: 165
        },
        repeat: {
          gold: 230,
          exp: 165
        },
        threeStarBonus: {
          gems: 20
        }
      },
      recommendedKK: 1091,
      s: 9
    },
    {
      id: "1-10",
      name: "Herz des Hains",
      chapter: 1,
      enemyLevel: 12,
      enemyRarity: 1,
      enemySynergies: true,
      enemyClassSynergies: true,
      enemies: [
        {
          slot: "F1",
          speciesId: "m06"
        },
        {
          slot: "F2",
          speciesId: "m04"
        },
        {
          slot: "H1",
          speciesId: "m03"
        },
        {
          slot: "H3",
          speciesId: "m01"
        }
      ],
      hint: "Feuer (3 Pflanze-Gegner inkl. Boss)",
      boss: {
        slot: "H2",
        speciesId: "m09",
        rarity: 3,
        hpMult: 1.5,
        atkMult: 0.85,
        statusResist: {
          stunChanceMult: 0.5,
          poisonPctPerStack: 0.02
        },
        mechanics: [
          {
            id: "root_call",
            trigger: {
              kind: "hp_below",
              pct: 0.5
            },
            actions: [
              {
                kind: "summon",
                speciesId: "m03",
                level: 10,
                rarity: 1,
                slots: [
                  "F1",
                  "F2"
                ],
                max: 1,
                fallback: {
                  kind: "heal_all_pct",
                  pct: 0.15
                }
              }
            ]
          },
          {
            id: "bloom_rage",
            trigger: {
              kind: "round_start",
              fromRound: 12
            },
            actions: [
              {
                kind: "status",
                target: "self",
                status: "atk_up",
                value: 0.3,
                duration: 99
              }
            ]
          }
        ]
      },
      rewards: {
        firstClear: {
          gold: 500,
          gems: 100,
          exp: 180,
          essence: 100,
          tickets: 1
        },
        repeat: {
          gold: 250,
          exp: 180
        },
        threeStarBonus: {
          gems: 20
        }
      },
      recommendedKK: 1241,
      s: 10
    },
    {
      id: "2-1",
      name: "Summende Senke",
      chapter: 2,
      enemyLevel: 13,
      enemyRarity: 1,
      enemySynergies: true,
      enemyClassSynergies: true,
      enemies: [
        {
          slot: "F1",
          speciesId: "m12"
        },
        {
          slot: "F2",
          speciesId: "m04"
        },
        {
          slot: "H1",
          speciesId: "m11"
        },
        {
          slot: "H2",
          speciesId: "m11"
        },
        {
          slot: "H3",
          speciesId: "m03"
        }
      ],
      hint: "Feuer (gg. Insekt + Pflanze)",
      onFirstClear: {
        unlockType: "insect",
        gift: {
          speciesId: "m11",
          rarity: 0,
          level: 1
        }
      },
      rewards: {
        firstClear: {
          gold: 540,
          gems: 30,
          exp: 195
        },
        repeat: {
          gold: 270,
          exp: 195
        },
        threeStarBonus: {
          gems: 20
        }
      },
      recommendedKK: 1130,
      s: 1
    },
    {
      id: "2-2",
      name: "Schilfg\xFCrtel",
      chapter: 2,
      enemyLevel: 14,
      enemyRarity: 1,
      enemySynergies: true,
      enemyClassSynergies: true,
      enemies: [
        {
          slot: "F1",
          speciesId: "m12"
        },
        {
          slot: "F2",
          speciesId: "m06"
        },
        {
          slot: "H1",
          speciesId: "m11"
        },
        {
          slot: "H2",
          speciesId: "m07"
        },
        {
          slot: "H3",
          speciesId: "m03"
        }
      ],
      hint: "Feuer",
      rewards: {
        firstClear: {
          gold: 580,
          gems: 30,
          exp: 210
        },
        repeat: {
          gold: 290,
          exp: 210
        },
        threeStarBonus: {
          gems: 20
        }
      },
      recommendedKK: 1221,
      s: 2
    },
    {
      id: "2-3",
      name: "Giftmoor",
      chapter: 2,
      enemyLevel: 15,
      enemyRarity: 1,
      enemySynergies: true,
      enemyClassSynergies: true,
      enemies: [
        {
          slot: "F1",
          speciesId: "m14"
        },
        {
          slot: "F2",
          speciesId: "m12"
        },
        {
          slot: "H1",
          speciesId: "m15"
        },
        {
          slot: "H2",
          speciesId: "m11"
        },
        {
          slot: "H3",
          speciesId: "m03"
        }
      ],
      hint: "Erde/Insekt (gg. Gift), Feuer (gg. Insekt)",
      onFirstClear: {
        unlockType: "poison",
        gift: {
          speciesId: "m14",
          rarity: 0,
          level: 1
        }
      },
      rewards: {
        firstClear: {
          gold: 620,
          gems: 30,
          exp: 225
        },
        repeat: {
          gold: 310,
          exp: 225
        },
        threeStarBonus: {
          gems: 20
        }
      },
      recommendedKK: 1249,
      s: 3
    },
    {
      id: "2-4",
      name: "Faulwasser",
      chapter: 2,
      enemyLevel: 17,
      enemyRarity: 1,
      enemySynergies: true,
      enemyClassSynergies: true,
      enemies: [
        {
          slot: "F1",
          speciesId: "m14",
          learned: "L01"
        },
        {
          slot: "F2",
          speciesId: "m14"
        },
        {
          slot: "H1",
          speciesId: "m15",
          learned: "L01"
        },
        {
          slot: "H2",
          speciesId: "m16"
        },
        {
          slot: "H3",
          speciesId: "m11",
          learned: "L01"
        }
      ],
      hint: "Erde, Insekt (4\xD7 Gift)",
      rewards: {
        firstClear: {
          gold: 660,
          gems: 30,
          exp: 240
        },
        repeat: {
          gold: 330,
          exp: 240
        },
        threeStarBonus: {
          gems: 20
        }
      },
      recommendedKK: 1410,
      s: 4
    },
    {
      id: "2-5",
      name: "Ger\xF6llpass",
      chapter: 2,
      enemyLevel: 18,
      enemyRarity: 2,
      enemySynergies: true,
      enemyClassSynergies: true,
      enemies: [
        {
          slot: "F1",
          speciesId: "m17",
          learned: "L01"
        },
        {
          slot: "F2",
          speciesId: "m18"
        },
        {
          slot: "H1",
          speciesId: "m08",
          learned: "L01"
        },
        {
          slot: "H2",
          speciesId: "m01"
        },
        {
          slot: "H3",
          speciesId: "m15",
          learned: "L01"
        }
      ],
      hint: "Wasser (gg. Stein + Erde)",
      onFirstClear: {
        unlockType: "stone",
        gift: {
          speciesId: "m17",
          rarity: 0,
          level: 1
        }
      },
      rewards: {
        firstClear: {
          gold: 700,
          gems: 30,
          exp: 255
        },
        repeat: {
          gold: 350,
          exp: 255
        },
        threeStarBonus: {
          gems: 20
        }
      },
      recommendedKK: 1724,
      s: 5
    },
    {
      id: "2-6",
      name: "Steinbruch",
      chapter: 2,
      enemyLevel: 19,
      enemyRarity: 2,
      enemySynergies: true,
      enemyClassSynergies: true,
      enemies: [
        {
          slot: "F1",
          speciesId: "m18",
          learned: "L11"
        },
        {
          slot: "F2",
          speciesId: "m17"
        },
        {
          slot: "H1",
          speciesId: "m08",
          learned: "L07"
        },
        {
          slot: "H2",
          speciesId: "m07"
        },
        {
          slot: "H3",
          speciesId: "m01",
          learned: "L04"
        }
      ],
      hint: "Wasser; Pflanze gg. Strudelotter",
      rewards: {
        firstClear: {
          gold: 740,
          gems: 30,
          exp: 270
        },
        repeat: {
          gold: 370,
          exp: 270
        },
        threeStarBonus: {
          gems: 20
        }
      },
      recommendedKK: 1796,
      s: 6
    },
    {
      id: "2-7",
      name: "Kristallgrotte",
      chapter: 2,
      enemyLevel: 20,
      enemyRarity: 2,
      enemySynergies: true,
      enemyClassSynergies: true,
      enemies: [
        {
          slot: "F1",
          speciesId: "m17",
          learned: "L11"
        },
        {
          slot: "F2",
          speciesId: "m22"
        },
        {
          slot: "H1",
          speciesId: "m20",
          learned: "L13"
        },
        {
          slot: "H2",
          speciesId: "m21"
        },
        {
          slot: "H3",
          speciesId: "m08",
          learned: "L07"
        }
      ],
      hint: "Gift (gg. Kristall), Wasser (gg. Stein/Erde)",
      onFirstClear: {
        unlockType: "crystal",
        gift: {
          speciesId: "m20",
          rarity: 0,
          level: 1
        }
      },
      rewards: {
        firstClear: {
          gold: 780,
          gems: 30,
          exp: 285
        },
        repeat: {
          gold: 390,
          exp: 285
        },
        threeStarBonus: {
          gems: 20
        }
      },
      recommendedKK: 1811,
      s: 7
    },
    {
      id: "2-8",
      name: "Spiegelhalle",
      chapter: 2,
      enemyLevel: 21,
      enemyRarity: 2,
      enemySynergies: true,
      enemyClassSynergies: true,
      enemies: [
        {
          slot: "F1",
          speciesId: "m18",
          learned: "L09"
        },
        {
          slot: "F2",
          speciesId: "m22"
        },
        {
          slot: "H1",
          speciesId: "m20",
          learned: "L09"
        },
        {
          slot: "H2",
          speciesId: "m21"
        },
        {
          slot: "H3",
          speciesId: "m15",
          learned: "L09"
        }
      ],
      hint: "Gift, Wasser",
      rewards: {
        firstClear: {
          gold: 820,
          gems: 30,
          exp: 300
        },
        repeat: {
          gold: 410,
          exp: 300
        },
        threeStarBonus: {
          gems: 20
        }
      },
      recommendedKK: 1887,
      s: 8
    },
    {
      id: "2-9",
      name: "Prismenschlucht",
      chapter: 2,
      enemyLevel: 23,
      enemyRarity: 2,
      enemySynergies: true,
      enemyClassSynergies: true,
      enemies: [
        {
          slot: "F1",
          speciesId: "m12",
          learned: "L12"
        },
        {
          slot: "F2",
          speciesId: "m18"
        },
        {
          slot: "H1",
          speciesId: "m16",
          learned: "L10"
        },
        {
          slot: "H2",
          speciesId: "m21"
        },
        {
          slot: "H3",
          speciesId: "m20",
          learned: "L13"
        }
      ],
      hint: "gemischt: Gift, Feuer, Wasser \xB7 Vorschau Boss: Gift-Monster mitnehmen",
      stageText: "Hinter der Schlucht wartet der Prismakoloss. Kristall h\xE4lt viel aus, aber Gift frisst sich durch jeden Schild. Nimm mindestens ein Gift-Monster mit (z. B. das Geschenk aus 2-3: Sumpfunke).",
      rewards: {
        firstClear: {
          gold: 860,
          gems: 30,
          exp: 315
        },
        repeat: {
          gold: 430,
          exp: 315
        },
        threeStarBonus: {
          gems: 20
        }
      },
      recommendedKK: 1986,
      s: 9
    },
    {
      id: "2-10",
      name: "Thron des Prismakoloss",
      chapter: 2,
      enemyLevel: 24,
      enemyRarity: 2,
      enemySynergies: true,
      enemyClassSynergies: true,
      enemies: [
        {
          slot: "F2",
          speciesId: "m17"
        },
        {
          slot: "H1",
          speciesId: "m20"
        },
        {
          slot: "H2",
          speciesId: "m11"
        },
        {
          slot: "H3",
          speciesId: "m03"
        }
      ],
      hint: "Gift (gg. Kristall + Pflanze), Feuer (gg. Insekt + Pflanze)",
      stageText: "Der Prismakoloss sch\xFCtzt sich mit Kristallschilden. Tipp: Gift-Monster sind \xD71,5 gegen Kristall und ihr Gift wirkt durch Schilde. Erde-Monster lieber zu Hause lassen.",
      boss: {
        slot: "F1",
        speciesId: "m23",
        rarity: 2,
        hpMult: 1.5,
        atkMult: 0.85,
        statusResist: {
          stunChanceMult: 0.5,
          poisonPctPerStack: 0.02
        },
        mechanics: [
          {
            id: "prism_phase_1",
            trigger: {
              kind: "hp_below",
              pct: 0.66
            },
            actions: [
              {
                kind: "shield",
                target: "self",
                maxHpPct: 0.1,
                duration: 2
              }
            ]
          },
          {
            id: "prism_phase_2",
            trigger: {
              kind: "hp_below",
              pct: 0.33
            },
            actions: [
              {
                kind: "shield",
                target: "self",
                maxHpPct: 0.1,
                duration: 2
              }
            ]
          },
          {
            id: "resonance",
            trigger: {
              kind: "round_start",
              every: 5
            },
            actions: [
              {
                kind: "damage",
                target: "enemy_all",
                atkMult: 0.5
              }
            ]
          },
          {
            id: "enrage",
            trigger: {
              kind: "round_start",
              fromRound: 15
            },
            actions: [
              {
                kind: "status",
                target: "self",
                status: "atk_up",
                value: 0.5,
                duration: 99
              }
            ]
          }
        ]
      },
      rewards: {
        firstClear: {
          gold: 900,
          gems: 100,
          exp: 330,
          essence: 100,
          tickets: 1
        },
        repeat: {
          gold: 450,
          exp: 330
        },
        threeStarBonus: {
          gems: 20
        }
      },
      recommendedKK: 2010,
      s: 10
    }
  ]
};

// src/data.ts
var typesCfg = types_default;
var rarities = rarities_default.levels;
var ascensionCosts = rarities_default.ascension;
var combat = combat_default;
var monsters = monsters_default;
var stages = stages_default.stages;
var chapters = stages_default.chapters;
var starChests = stages_default.starChests;
var monsterById = new Map(monsters.map((m) => [m.id, m]));
function species(id) {
  const found = monsterById.get(id);
  if (!found) throw new Error(`Unknown species ${id}`);
  return found;
}
function typeMult(att, def) {
  const strong = typesCfg.strongAgainst[att];
  if (strong.includes(def)) return typesCfg.multipliers.strong;
  if (att !== def && typesCfg.strongAgainst[def].includes(att)) return typesCfg.multipliers.weak;
  return typesCfg.multipliers.neutral;
}

// src/rng.ts
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 | 0;
    let t2 = Math.imul(a ^ a >>> 15, 1 | a);
    t2 = t2 + Math.imul(t2 ^ t2 >>> 7, 61 | t2) ^ t2;
    return ((t2 ^ t2 >>> 14) >>> 0) / 4294967296;
  };
}
function hashSeed(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const out = hash >>> 0;
  return out === 0 ? 1 : out;
}

// src/adventure/const.ts
var ACTION_LIMIT = 30;
var OFFLINE_CAP_MS = 8 * 60 * 60 * 1e3;
var WELCOME_AFTER_MS = 5 * 60 * 1e3;
var SHELL_H = 2340;
var SAFE_H = 1920;
var SHELL_BAND = (SHELL_H - SAFE_H) / 2;

// data/lootbox.json
var lootbox_default = {
  version: 1,
  tiers: {
    kiesel: { rates: [45, 30, 15, 7, 2.5, 0.5, 0, 0, 0, 0], pity: null },
    silber: { rates: [20, 28, 25, 15, 8, 3, 0.9, 0.1, 0, 0], pity: { minRarity: 4, hard: 10 } },
    gold: { rates: [0, 10, 22, 28, 20, 12, 5.5, 2, 0.45, 0.05], pity: { minRarity: 6, hard: 20 }, newGuard: true },
    sternen: { rates: [0, 0, 0, 15, 25, 25, 18, 10, 5, 2], pity: { minRarity: 8, softFrom: 30, softStepPp: 3, hard: 50 }, newGuard: true }
  },
  extraGold: { kiesel: [100, 200], silber: [200, 350], gold: [300, 500], sternen: [500, 800], perRegion: true },
  storageCap: 99,
  debugStartChests: { kiesel: 5 },
  shards: [5, 6, 8, 10, 15, 20, 30, 40, 60, 100],
  dust: [1, 2, 3, 5, 8, 12, 20, 30, 50, 100],
  starCostPct: [10, 20, 40, 80, 150],
  starStat: 0.04,
  wildShardPct: [20, 15, 12, 10, 8, 6, 4, 3, 2, 1],
  unlockDupes: 2,
  roadMs: 72e5,
  roadReadyCap: 4,
  trainerSilver: 0.1,
  shopGold: { kiesel: 2e3, silber: 1e4, daily: 5 },
  shopMarks: { gold: 300, sternen: 1200 },
  codexEvery: 10,
  workshopMult: 20
};

// data/regions.json
var regions_default = {
  regions: [
    {
      id: 1,
      name: "Gr\xFCnmark",
      chapters: [
        {
          id: 1,
          name: "Wiesenpfad",
          scene: "wiese",
          levelMin: 2,
          levelMax: 6,
          cap: 12,
          weather: [
            {
              weather: "klar",
              species: "m72",
              pct: 6
            },
            {
              weather: "wind",
              species: "m43",
              pct: 6
            }
          ],
          guardian: {
            name: "Mira",
            epithet: "W\xE4chterin",
            badge: "Kieselwappen",
            gold: 1750,
            team: [
              {
                species: "m17",
                level: 7
              },
              {
                species: "m04",
                level: 8
              },
              {
                species: "m18",
                level: 10
              }
            ],
            factor: 1.4,
            hpFactor: 1.4,
            atkFactor: 1.34,
            defFactor: 1.4
          },
          day: [
            {
              species: "m66",
              weight: 40
            },
            {
              species: "m41",
              weight: 35
            },
            {
              species: "m11",
              weight: 20
            },
            {
              species: "m03",
              weight: 5
            }
          ],
          night: [
            {
              species: "m66",
              weight: 35
            },
            {
              species: "m76",
              weight: 30
            },
            {
              species: "m81",
              weight: 20
            },
            {
              species: "m11",
              weight: 15
            }
          ]
        },
        {
          id: 2,
          name: "Bachufer",
          scene: "bach",
          levelMin: 8,
          levelMax: 12,
          cap: 18,
          weather: [
            {
              weather: "regen",
              species: "m24",
              pct: 6
            },
            {
              weather: "nebel",
              species: "m78",
              pct: 6
            }
          ],
          guardian: {
            name: "Joran",
            epithet: "W\xE4chter",
            badge: "Wellenwappen",
            gold: 2500,
            team: [
              {
                species: "m28",
                level: 13
              },
              {
                species: "m02",
                level: 14
              },
              {
                species: "m07",
                level: 16
              }
            ],
            factor: 1.2,
            hpFactor: 1.2,
            atkFactor: 1.24,
            defFactor: 1.2
          },
          day: [
            {
              species: "m02",
              weight: 25
            },
            {
              species: "m28",
              weight: 25
            },
            {
              species: "m14",
              weight: 20
            },
            {
              species: "m67",
              weight: 15
            },
            {
              species: "m01",
              weight: 10
            },
            {
              species: "m07",
              weight: 5
            }
          ],
          night: [
            {
              species: "m14",
              weight: 30
            },
            {
              species: "m28",
              weight: 20
            },
            {
              species: "m77",
              weight: 20
            },
            {
              species: "m82",
              weight: 15
            },
            {
              species: "m36",
              weight: 15
            }
          ]
        },
        {
          id: 3,
          name: "Funkenwald",
          scene: "wald",
          levelMin: 14,
          levelMax: 18,
          cap: 24,
          weather: [
            {
              weather: "gewitter",
              species: "m54",
              pct: 7
            },
            {
              weather: "wind",
              species: "m45",
              pct: 5
            }
          ],
          guardian: {
            name: "Vela",
            epithet: "W\xE4chterin",
            badge: "Funkenwappen",
            gold: 3250,
            team: [
              {
                species: "m52",
                level: 19
              },
              {
                species: "m51",
                level: 20
              },
              {
                species: "m53",
                level: 22
              }
            ],
            factor: 1.15,
            hpFactor: 1.15,
            atkFactor: 1.17,
            defFactor: 1.15
          },
          day: [
            {
              species: "m51",
              weight: 25
            },
            {
              species: "m71",
              weight: 20
            },
            {
              species: "m12",
              weight: 20
            },
            {
              species: "m56",
              weight: 15
            },
            {
              species: "m52",
              weight: 10
            },
            {
              species: "m34",
              weight: 10
            }
          ],
          night: [
            {
              species: "m71",
              weight: 30
            },
            {
              species: "m34",
              weight: 25
            },
            {
              species: "m78",
              weight: 20
            },
            {
              species: "m81",
              weight: 15
            },
            {
              species: "m52",
              weight: 10
            }
          ]
        },
        {
          id: 4,
          name: "Moorsenke",
          scene: "wald",
          tint: "moor",
          levelMin: 20,
          levelMax: 24,
          cap: 30,
          weather: [
            {
              weather: "nebel",
              species: "m83",
              pct: 6
            },
            {
              weather: "regen",
              species: "m16",
              pct: 6
            }
          ],
          guardian: {
            name: "Morva",
            epithet: "W\xE4chterin",
            badge: "Moorwappen",
            gold: 4e3,
            team: [
              {
                species: "m15",
                level: 25
              },
              {
                species: "m82",
                level: 26
              },
              {
                species: "m84",
                level: 28
              }
            ],
            factor: 1.2,
            hpFactor: 1.2,
            atkFactor: 1.19,
            defFactor: 1.2
          },
          day: [
            {
              species: "m14",
              weight: 30
            },
            {
              species: "m81",
              weight: 25
            },
            {
              species: "m36",
              weight: 20
            },
            {
              species: "m82",
              weight: 15
            },
            {
              species: "m15",
              weight: 10
            }
          ],
          night: [
            {
              species: "m81",
              weight: 30
            },
            {
              species: "m14",
              weight: 25
            },
            {
              species: "m82",
              weight: 20
            },
            {
              species: "m36",
              weight: 10
            },
            {
              species: "m84",
              weight: 15
            }
          ]
        },
        {
          id: 5,
          name: "Felsklamm",
          scene: "wiese",
          tint: "fels",
          levelMin: 26,
          levelMax: 30,
          cap: 36,
          weather: [
            {
              weather: "wind",
              species: "m43",
              pct: 6
            },
            {
              weather: "schnee",
              species: "m49",
              pct: 6
            }
          ],
          guardian: {
            name: "Brom",
            epithet: "W\xE4chter",
            badge: "Felswappen",
            gold: 4750,
            team: [
              {
                species: "m32",
                level: 31
              },
              {
                species: "m18",
                level: 32
              },
              {
                species: "m38",
                level: 34
              }
            ],
            factor: 1.25,
            hpFactor: 1.25,
            atkFactor: 1.31,
            defFactor: 1.25
          },
          day: [
            {
              species: "m04",
              weight: 30
            },
            {
              species: "m17",
              weight: 25
            },
            {
              species: "m18",
              weight: 25
            },
            {
              species: "m32",
              weight: 20
            }
          ],
          night: [
            {
              species: "m18",
              weight: 30
            },
            {
              species: "m04",
              weight: 25
            },
            {
              species: "m17",
              weight: 15
            },
            {
              species: "m32",
              weight: 15
            },
            {
              species: "m38",
              weight: 15
            }
          ]
        },
        {
          id: 6,
          name: "Sturmh\xF6he",
          scene: "wiese",
          tint: "sturm",
          levelMin: 32,
          levelMax: 36,
          cap: 42,
          weather: [
            {
              weather: "wind",
              species: "m45",
              pct: 8
            },
            {
              weather: "gewitter",
              species: "m53",
              pct: 6
            }
          ],
          guardian: {
            name: "Veya",
            epithet: "W\xE4chterin",
            badge: "Sturmwappen",
            gold: 5500,
            team: [
              {
                species: "m42",
                level: 37
              },
              {
                species: "m41",
                level: 38
              },
              {
                species: "m44",
                level: 40
              }
            ],
            factor: 1.25,
            hpFactor: 1.25,
            atkFactor: 1.27,
            defFactor: 1.25
          },
          day: [
            {
              species: "m41",
              weight: 60
            },
            {
              species: "m42",
              weight: 40
            }
          ],
          night: [
            {
              species: "m41",
              weight: 40
            },
            {
              species: "m42",
              weight: 25
            },
            {
              species: "m44",
              weight: 35
            }
          ]
        },
        {
          id: 7,
          name: "Frostgrat",
          scene: "bach",
          tint: "frost",
          levelMin: 38,
          levelMax: 42,
          cap: 48,
          weather: [
            {
              weather: "schnee",
              species: "m47",
              pct: 7
            },
            {
              weather: "nebel",
              species: "m48",
              pct: 6
            }
          ],
          guardian: {
            name: "Isko",
            epithet: "W\xE4chter",
            badge: "Frostwappen",
            gold: 6250,
            team: [
              {
                species: "m46",
                level: 43
              },
              {
                species: "m41",
                level: 44
              },
              {
                species: "m70",
                level: 46
              }
            ],
            factor: 1.35,
            hpFactor: 1.35,
            atkFactor: 1.34,
            defFactor: 1.35
          },
          day: [
            {
              species: "m41",
              weight: 40
            },
            {
              species: "m46",
              weight: 60
            }
          ],
          night: [
            {
              species: "m46",
              weight: 45
            },
            {
              species: "m41",
              weight: 20
            },
            {
              species: "m70",
              weight: 35
            }
          ]
        },
        {
          id: 8,
          name: "Klingenschmiede",
          scene: "wald",
          tint: "schmiede",
          levelMin: 44,
          levelMax: 48,
          cap: 54,
          weather: [
            {
              weather: "gewitter",
              species: "m54",
              pct: 6
            },
            {
              weather: "wind",
              species: "m45",
              pct: 5
            }
          ],
          guardian: {
            name: "Runa",
            epithet: "W\xE4chterin",
            badge: "Klingenwappen",
            gold: 7e3,
            team: [
              {
                species: "m61",
                level: 49
              },
              {
                species: "m56",
                level: 50
              },
              {
                species: "m59",
                level: 52
              }
            ],
            factor: 1.4,
            hpFactor: 1.4,
            atkFactor: 1.35,
            defFactor: 1.4
          },
          day: [
            {
              species: "m56",
              weight: 55
            },
            {
              species: "m61",
              weight: 45
            }
          ],
          night: [
            {
              species: "m61",
              weight: 30
            },
            {
              species: "m56",
              weight: 25
            },
            {
              species: "m59",
              weight: 45
            }
          ]
        },
        {
          id: 9,
          name: "Vorhof des Rates",
          scene: "wald",
          tint: "schmiede",
          foyer: true,
          levelMin: 52,
          levelMax: 57,
          cap: 60,
          weather: [
            {
              weather: "gewitter",
              species: "m54",
              pct: 6
            },
            {
              weather: "wind",
              species: "m45",
              pct: 5
            }
          ],
          guardian: {
            name: "Ratstor",
            epithet: "Eingang",
            badge: "",
            gold: 0,
            factor: 1,
            team: []
          },
          day: [
            {
              species: "m56",
              weight: 28
            },
            {
              species: "m61",
              weight: 22
            },
            {
              species: "m41",
              weight: 20
            },
            {
              species: "m46",
              weight: 30
            }
          ],
          night: [
            {
              species: "m61",
              weight: 15
            },
            {
              species: "m56",
              weight: 13
            },
            {
              species: "m59",
              weight: 23
            },
            {
              species: "m46",
              weight: 22
            },
            {
              species: "m41",
              weight: 10
            },
            {
              species: "m70",
              weight: 17
            }
          ]
        },
        {
          id: 10,
          name: "Hoher Rat",
          scene: "wald",
          tint: "rat",
          levelMin: 56,
          levelMax: 60,
          cap: 60,
          guardian: {
            name: "Orim",
            epithet: "Gro\xDFw\xE4chter",
            badge: "Ratsiegel",
            gold: 8e3,
            team: [
              {
                species: "m84",
                level: 58
              },
              {
                species: "m59",
                level: 59
              },
              {
                species: "m38",
                level: 60
              }
            ],
            factor: 1.1
          },
          day: [],
          night: [],
          council: {
            rewardGold: 25e3,
            unlocksRegion: 2,
            members: [
              {
                id: "rat1",
                name: "Eldon",
                epithet: "Rat",
                cap: 60,
                gold: 4e3,
                team: [
                  {
                    species: "m38",
                    level: 54
                  },
                  {
                    species: "m44",
                    level: 55
                  },
                  {
                    species: "m84",
                    level: 56
                  }
                ],
                factor: 1.25,
                hpFactor: 1.25,
                atkFactor: 1.29,
                defFactor: 1.25
              },
              {
                id: "rat2",
                name: "Sura",
                epithet: "R\xE4tin",
                cap: 60,
                gold: 5e3,
                team: [
                  {
                    species: "m15",
                    level: 55
                  },
                  {
                    species: "m42",
                    level: 56
                  },
                  {
                    species: "m59",
                    level: 57
                  }
                ],
                factor: 1.3,
                hpFactor: 1.3,
                atkFactor: 1.28,
                defFactor: 1.3
              },
              {
                id: "rat3",
                name: "Kelm",
                epithet: "Rat",
                cap: 60,
                gold: 6e3,
                team: [
                  {
                    species: "m46",
                    level: 56
                  },
                  {
                    species: "m61",
                    level: 57
                  },
                  {
                    species: "m70",
                    level: 58
                  }
                ],
                factor: 1.35,
                hpFactor: 1.35,
                atkFactor: 1.36,
                defFactor: 1.35
              },
              {
                id: "rat4",
                name: "Nyra",
                epithet: "R\xE4tin",
                cap: 60,
                gold: 7e3,
                team: [
                  {
                    species: "m32",
                    level: 57
                  },
                  {
                    species: "m18",
                    level: 58
                  },
                  {
                    species: "m44",
                    level: 59
                  }
                ],
                factor: 1.2,
                hpFactor: 1.2,
                atkFactor: 1.17,
                defFactor: 1.2
              },
              {
                id: "grand",
                name: "Orim",
                epithet: "Gro\xDFw\xE4chter",
                cap: 60,
                gold: 8e3,
                team: [
                  {
                    species: "m84",
                    level: 58
                  },
                  {
                    species: "m59",
                    level: 59
                  },
                  {
                    species: "m38",
                    level: 60
                  }
                ],
                factor: 1.1,
                hpFactor: 1.1,
                atkFactor: 1.15,
                defFactor: 1.1
              }
            ]
          }
        }
      ]
    },
    {
      id: 2,
      name: "Frostk\xFCste",
      chapters: [
        {
          id: 1,
          name: "Eissaum",
          scene: "bach",
          tint: "kueste",
          levelMin: 56,
          levelMax: 60,
          cap: 66,
          weather: [
            {
              weather: "klar",
              species: "m05",
              pct: 6
            },
            {
              weather: "regen",
              species: "m52",
              pct: 5
            }
          ],
          guardian: {
            name: "Svala",
            epithet: "W\xE4chterin",
            badge: "Reifwappen",
            gold: 7750,
            team: [
              {
                species: "m89",
                level: 61
              },
              {
                species: "m19",
                level: 62
              },
              {
                species: "m53",
                level: 64
              }
            ],
            factor: 1.05,
            hpFactor: 1.05,
            atkFactor: 1.01,
            defFactor: 1.05
          },
          day: [
            {
              species: "m05",
              weight: 18
            },
            {
              species: "m52",
              weight: 16
            },
            {
              species: "m92",
              weight: 16
            },
            {
              species: "m43",
              weight: 14
            },
            {
              species: "m93",
              weight: 14
            },
            {
              species: "m53",
              weight: 12
            },
            {
              species: "m89",
              weight: 10
            }
          ],
          night: [
            {
              species: "m05",
              weight: 15
            },
            {
              species: "m52",
              weight: 15
            },
            {
              species: "m92",
              weight: 15
            },
            {
              species: "m43",
              weight: 13
            },
            {
              species: "m93",
              weight: 13
            },
            {
              species: "m53",
              weight: 11
            },
            {
              species: "m19",
              weight: 9
            },
            {
              species: "m89",
              weight: 9
            }
          ]
        },
        {
          id: 2,
          name: "Gischtbucht",
          scene: "wiese",
          tint: "kueste",
          levelMin: 62,
          levelMax: 66,
          cap: 72,
          weather: [
            {
              weather: "regen",
              species: "m06",
              pct: 6
            },
            {
              weather: "gewitter",
              species: "m57",
              pct: 5
            }
          ],
          guardian: {
            name: "Bram",
            epithet: "W\xE4chter",
            badge: "Gischtwappen",
            gold: 8500,
            team: [
              {
                species: "m99",
                level: 67
              },
              {
                species: "m24",
                level: 68
              },
              {
                species: "m59",
                level: 70
              }
            ],
            factor: 1.15,
            hpFactor: 1.15,
            atkFactor: 1.18,
            defFactor: 1.15
          },
          day: [
            {
              species: "m06",
              weight: 18
            },
            {
              species: "m57",
              weight: 16
            },
            {
              species: "m96",
              weight: 16
            },
            {
              species: "m48",
              weight: 14
            },
            {
              species: "m97",
              weight: 14
            },
            {
              species: "m59",
              weight: 12
            },
            {
              species: "m99",
              weight: 10
            }
          ],
          night: [
            {
              species: "m06",
              weight: 15
            },
            {
              species: "m57",
              weight: 15
            },
            {
              species: "m96",
              weight: 15
            },
            {
              species: "m48",
              weight: 13
            },
            {
              species: "m97",
              weight: 13
            },
            {
              species: "m59",
              weight: 11
            },
            {
              species: "m24",
              weight: 9
            },
            {
              species: "m99",
              weight: 9
            }
          ]
        },
        {
          id: 3,
          name: "Treibholz",
          scene: "wald",
          tint: "kueste",
          levelMin: 68,
          levelMax: 72,
          cap: 78,
          weather: [
            {
              weather: "gewitter",
              species: "m12",
              pct: 6
            },
            {
              weather: "schnee",
              species: "m62",
              pct: 5
            }
          ],
          guardian: {
            name: "Nera",
            epithet: "W\xE4chterin",
            badge: "Treibwappen",
            gold: 9250,
            team: [
              {
                species: "m25",
                level: 73
              },
              {
                species: "m70",
                level: 74
              },
              {
                species: "m09",
                level: 76
              }
            ],
            factor: 1.25,
            hpFactor: 1.25,
            atkFactor: 1.28,
            defFactor: 1.25
          },
          day: [
            {
              species: "m12",
              weight: 19
            },
            {
              species: "m62",
              weight: 19
            },
            {
              species: "m07",
              weight: 17
            },
            {
              species: "m58",
              weight: 17
            },
            {
              species: "m09",
              weight: 14
            },
            {
              species: "m70",
              weight: 14
            }
          ],
          night: [
            {
              species: "m12",
              weight: 16
            },
            {
              species: "m62",
              weight: 17
            },
            {
              species: "m07",
              weight: 15
            },
            {
              species: "m58",
              weight: 15
            },
            {
              species: "m09",
              weight: 13
            },
            {
              species: "m70",
              weight: 13
            },
            {
              species: "m25",
              weight: 11
            }
          ]
        },
        {
          id: 4,
          name: "Packeis",
          scene: "bach",
          tint: "kueste",
          levelMin: 74,
          levelMax: 78,
          cap: 84,
          weather: [
            {
              weather: "schnee",
              species: "m21",
              pct: 6
            },
            {
              weather: "nebel",
              species: "m68",
              pct: 5
            }
          ],
          guardian: {
            name: "Holm",
            epithet: "W\xE4chter",
            badge: "Packeiswappen",
            gold: 1e4,
            team: [
              {
                species: "m31",
                level: 79
              },
              {
                species: "m73",
                level: 80
              },
              {
                species: "m16",
                level: 82
              }
            ],
            factor: 1.35,
            hpFactor: 1.35,
            atkFactor: 1.33,
            defFactor: 1.35
          },
          day: [
            {
              species: "m21",
              weight: 19
            },
            {
              species: "m68",
              weight: 19
            },
            {
              species: "m08",
              weight: 17
            },
            {
              species: "m63",
              weight: 17
            },
            {
              species: "m16",
              weight: 14
            },
            {
              species: "m73",
              weight: 14
            }
          ],
          night: [
            {
              species: "m21",
              weight: 16
            },
            {
              species: "m68",
              weight: 17
            },
            {
              species: "m08",
              weight: 15
            },
            {
              species: "m63",
              weight: 15
            },
            {
              species: "m16",
              weight: 13
            },
            {
              species: "m73",
              weight: 13
            },
            {
              species: "m31",
              weight: 11
            }
          ]
        },
        {
          id: 5,
          name: "Nordklippe",
          scene: "wiese",
          tint: "kueste",
          levelMin: 80,
          levelMax: 84,
          cap: 90,
          weather: [
            {
              weather: "nebel",
              species: "m26",
              pct: 6
            },
            {
              weather: "wind",
              species: "m72",
              pct: 5
            }
          ],
          guardian: {
            name: "Yrsa",
            epithet: "W\xE4chterin",
            badge: "Nordwappen",
            gold: 10750,
            team: [
              {
                species: "m49",
                level: 85
              },
              {
                species: "m84",
                level: 86
              },
              {
                species: "m22",
                level: 88
              }
            ],
            factor: 1.2,
            hpFactor: 1.2,
            atkFactor: 1.22,
            defFactor: 1.2
          },
          day: [
            {
              species: "m26",
              weight: 19
            },
            {
              species: "m72",
              weight: 19
            },
            {
              species: "m15",
              weight: 17
            },
            {
              species: "m69",
              weight: 17
            },
            {
              species: "m22",
              weight: 14
            },
            {
              species: "m84",
              weight: 14
            }
          ],
          night: [
            {
              species: "m26",
              weight: 16
            },
            {
              species: "m72",
              weight: 17
            },
            {
              species: "m15",
              weight: 15
            },
            {
              species: "m69",
              weight: 15
            },
            {
              species: "m22",
              weight: 13
            },
            {
              species: "m84",
              weight: 13
            },
            {
              species: "m49",
              weight: 11
            }
          ]
        },
        {
          id: 6,
          name: "Salzmarsch",
          scene: "wald",
          tint: "kueste",
          levelMin: 86,
          levelMax: 90,
          cap: 96,
          weather: [
            {
              weather: "wind",
              species: "m32",
              pct: 6
            },
            {
              weather: "klar",
              species: "m77",
              pct: 5
            }
          ],
          guardian: {
            name: "Torv",
            epithet: "W\xE4chter",
            badge: "Salzwappen",
            gold: 11500,
            team: [
              {
                species: "m54",
                level: 91
              },
              {
                species: "m94",
                level: 92
              },
              {
                species: "m35",
                level: 94
              }
            ],
            factor: 1.25,
            hpFactor: 1.25,
            atkFactor: 1.19,
            defFactor: 1.25
          },
          day: [
            {
              species: "m32",
              weight: 19
            },
            {
              species: "m77",
              weight: 19
            },
            {
              species: "m18",
              weight: 17
            },
            {
              species: "m78",
              weight: 17
            },
            {
              species: "m35",
              weight: 14
            },
            {
              species: "m94",
              weight: 14
            }
          ],
          night: [
            {
              species: "m32",
              weight: 16
            },
            {
              species: "m77",
              weight: 17
            },
            {
              species: "m18",
              weight: 15
            },
            {
              species: "m78",
              weight: 15
            },
            {
              species: "m35",
              weight: 13
            },
            {
              species: "m94",
              weight: 13
            },
            {
              species: "m54",
              weight: 11
            }
          ]
        },
        {
          id: 7,
          name: "Fjordwacht",
          scene: "bach",
          tint: "kueste",
          levelMin: 92,
          levelMax: 96,
          cap: 102,
          weather: [
            {
              weather: "klar",
              species: "m36",
              pct: 6
            },
            {
              weather: "regen",
              species: "m82",
              pct: 5
            }
          ],
          guardian: {
            name: "Liska",
            epithet: "W\xE4chterin",
            badge: "Fjordwappen",
            gold: 12250,
            team: [
              {
                species: "m64",
                level: 97
              },
              {
                species: "m98",
                level: 98
              },
              {
                species: "m38",
                level: 100
              }
            ],
            factor: 1.3,
            hpFactor: 1.3,
            atkFactor: 1.27,
            defFactor: 1.3
          },
          day: [
            {
              species: "m36",
              weight: 19
            },
            {
              species: "m82",
              weight: 19
            },
            {
              species: "m30",
              weight: 17
            },
            {
              species: "m83",
              weight: 17
            },
            {
              species: "m38",
              weight: 14
            },
            {
              species: "m98",
              weight: 14
            }
          ],
          night: [
            {
              species: "m36",
              weight: 16
            },
            {
              species: "m82",
              weight: 17
            },
            {
              species: "m30",
              weight: 15
            },
            {
              species: "m83",
              weight: 15
            },
            {
              species: "m38",
              weight: 13
            },
            {
              species: "m98",
              weight: 13
            },
            {
              species: "m64",
              weight: 11
            }
          ]
        },
        {
          id: 8,
          name: "Polarnacht",
          scene: "wiese",
          tint: "kueste",
          levelMin: 98,
          levelMax: 102,
          cap: 108,
          weather: [
            {
              weather: "regen",
              species: "m42",
              pct: 6
            },
            {
              weather: "gewitter",
              species: "m87",
              pct: 5
            }
          ],
          guardian: {
            name: "Kael",
            epithet: "W\xE4chter",
            badge: "Polarwappen",
            gold: 13e3,
            team: [
              {
                species: "m79",
                level: 103
              },
              {
                species: "m13",
                level: 104
              },
              {
                species: "m44",
                level: 106
              }
            ],
            factor: 1.2,
            hpFactor: 1.2,
            atkFactor: 1.18,
            defFactor: 1.2
          },
          day: [
            {
              species: "m42",
              weight: 19
            },
            {
              species: "m87",
              weight: 20
            },
            {
              species: "m34",
              weight: 17
            },
            {
              species: "m88",
              weight: 17
            },
            {
              species: "m44",
              weight: 15
            },
            {
              species: "m79",
              weight: 12
            }
          ],
          night: [
            {
              species: "m42",
              weight: 18
            },
            {
              species: "m87",
              weight: 17
            },
            {
              species: "m34",
              weight: 15
            },
            {
              species: "m88",
              weight: 15
            },
            {
              species: "m44",
              weight: 13
            },
            {
              species: "m13",
              weight: 11
            },
            {
              species: "m79",
              weight: 11
            }
          ]
        },
        {
          id: 9,
          name: "Vorhof des Rates",
          scene: "wiese",
          tint: "kueste",
          foyer: true,
          levelMin: 106,
          levelMax: 111,
          cap: 114,
          weather: [
            {
              weather: "regen",
              species: "m42",
              pct: 6
            },
            {
              weather: "gewitter",
              species: "m87",
              pct: 5
            }
          ],
          guardian: {
            name: "Ratstor",
            epithet: "Eingang",
            badge: "",
            gold: 0,
            factor: 1,
            team: []
          },
          day: [
            {
              species: "m42",
              weight: 10
            },
            {
              species: "m87",
              weight: 10
            },
            {
              species: "m34",
              weight: 9
            },
            {
              species: "m88",
              weight: 9
            },
            {
              species: "m44",
              weight: 8
            },
            {
              species: "m79",
              weight: 6
            },
            {
              species: "m36",
              weight: 9
            },
            {
              species: "m82",
              weight: 9
            },
            {
              species: "m30",
              weight: 8
            },
            {
              species: "m83",
              weight: 8
            },
            {
              species: "m38",
              weight: 7
            },
            {
              species: "m98",
              weight: 7
            }
          ],
          night: [
            {
              species: "m42",
              weight: 9
            },
            {
              species: "m87",
              weight: 9
            },
            {
              species: "m34",
              weight: 8
            },
            {
              species: "m88",
              weight: 8
            },
            {
              species: "m44",
              weight: 7
            },
            {
              species: "m13",
              weight: 6
            },
            {
              species: "m79",
              weight: 6
            },
            {
              species: "m36",
              weight: 8
            },
            {
              species: "m82",
              weight: 8
            },
            {
              species: "m30",
              weight: 7
            },
            {
              species: "m83",
              weight: 7
            },
            {
              species: "m38",
              weight: 6
            },
            {
              species: "m98",
              weight: 6
            },
            {
              species: "m64",
              weight: 5
            }
          ]
        },
        {
          id: 10,
          name: "Hoher Rat",
          scene: "wald",
          tint: "kueste",
          levelMin: 110,
          levelMax: 114,
          cap: 114,
          guardian: {
            name: "Hrim",
            epithet: "Gro\xDFw\xE4chterin",
            badge: "Zweites Ratsiegel",
            gold: 14e3,
            team: [
              {
                species: "m13",
                level: 112
              },
              {
                species: "m19",
                level: 113
              },
              {
                species: "m24",
                level: 114
              }
            ],
            factor: 1.05
          },
          day: [],
          night: [],
          council: {
            rewardGold: 5e4,
            unlocksRegion: 3,
            members: [
              {
                id: "r2a",
                name: "Veyr",
                epithet: "Rat",
                cap: 114,
                gold: 1e4,
                team: [
                  {
                    species: "m13",
                    level: 108
                  },
                  {
                    species: "m19",
                    level: 109
                  },
                  {
                    species: "m24",
                    level: 110
                  }
                ],
                factor: 1.05,
                hpFactor: 1.05,
                atkFactor: 1.08,
                defFactor: 1.05
              },
              {
                id: "r2b",
                name: "Signe",
                epithet: "R\xE4tin",
                cap: 114,
                gold: 11e3,
                team: [
                  {
                    species: "m13",
                    level: 109
                  },
                  {
                    species: "m19",
                    level: 110
                  },
                  {
                    species: "m24",
                    level: 111
                  }
                ],
                factor: 1.05,
                hpFactor: 1.05,
                atkFactor: 1.07,
                defFactor: 1.05
              },
              {
                id: "r2c",
                name: "Odun",
                epithet: "Rat",
                cap: 114,
                gold: 12e3,
                team: [
                  {
                    species: "m13",
                    level: 110
                  },
                  {
                    species: "m19",
                    level: 111
                  },
                  {
                    species: "m24",
                    level: 112
                  }
                ],
                factor: 1.05,
                hpFactor: 1.05,
                atkFactor: 1.04,
                defFactor: 1.05
              },
              {
                id: "r2d",
                name: "Mael",
                epithet: "R\xE4tin",
                cap: 114,
                gold: 13e3,
                team: [
                  {
                    species: "m13",
                    level: 111
                  },
                  {
                    species: "m19",
                    level: 112
                  },
                  {
                    species: "m24",
                    level: 113
                  }
                ],
                factor: 1.05,
                hpFactor: 1.05,
                atkFactor: 1.04,
                defFactor: 1.05
              },
              {
                id: "r2e",
                name: "Hrim",
                epithet: "Gro\xDFw\xE4chterin",
                cap: 114,
                gold: 14e3,
                team: [
                  {
                    species: "m13",
                    level: 112
                  },
                  {
                    species: "m19",
                    level: 113
                  },
                  {
                    species: "m24",
                    level: 114
                  }
                ],
                factor: 1.05,
                hpFactor: 1.05,
                atkFactor: 1.02,
                defFactor: 1.05
              }
            ]
          }
        }
      ]
    },
    {
      id: 3,
      name: "Glutgebirge",
      chapters: [
        {
          id: 1,
          name: "Aschenhang",
          scene: "bach",
          tint: "glut",
          levelMin: 110,
          levelMax: 114,
          cap: 120,
          weather: [
            {
              weather: "klar",
              species: "m07",
              pct: 6
            },
            {
              weather: "regen",
              species: "m58",
              pct: 5
            }
          ],
          guardian: {
            name: "Brant",
            epithet: "W\xE4chter",
            badge: "Glutwappen",
            gold: 13750,
            team: [
              {
                species: "m27",
                level: 115
              },
              {
                species: "m10",
                level: 116
              },
              {
                species: "m25",
                level: 118
              }
            ],
            factor: 0.95,
            hpFactor: 0.95,
            atkFactor: 0.85,
            defFactor: 0.95
          },
          day: [
            {
              species: "m07",
              weight: 21
            },
            {
              species: "m58",
              weight: 20
            },
            {
              species: "m09",
              weight: 17
            },
            {
              species: "m70",
              weight: 17
            },
            {
              species: "m25",
              weight: 14
            },
            {
              species: "m10",
              weight: 11
            }
          ],
          night: [
            {
              species: "m07",
              weight: 18
            },
            {
              species: "m58",
              weight: 18
            },
            {
              species: "m09",
              weight: 16
            },
            {
              species: "m70",
              weight: 16
            },
            {
              species: "m25",
              weight: 13
            },
            {
              species: "m10",
              weight: 11
            },
            {
              species: "m27",
              weight: 8
            }
          ]
        },
        {
          id: 2,
          name: "Schlackental",
          scene: "wiese",
          tint: "glut",
          levelMin: 116,
          levelMax: 120,
          cap: 126,
          weather: [
            {
              weather: "regen",
              species: "m08",
              pct: 6
            },
            {
              weather: "gewitter",
              species: "m63",
              pct: 5
            }
          ],
          guardian: {
            name: "Cora",
            epithet: "W\xE4chterin",
            badge: "Aschewappen",
            gold: 14500,
            team: [
              {
                species: "m39",
                level: 121
              },
              {
                species: "m23",
                level: 122
              },
              {
                species: "m31",
                level: 124
              }
            ],
            factor: 1.05,
            hpFactor: 1.05,
            atkFactor: 1.1,
            defFactor: 1.05
          },
          day: [
            {
              species: "m08",
              weight: 21
            },
            {
              species: "m63",
              weight: 20
            },
            {
              species: "m16",
              weight: 17
            },
            {
              species: "m73",
              weight: 17
            },
            {
              species: "m31",
              weight: 14
            },
            {
              species: "m23",
              weight: 11
            }
          ],
          night: [
            {
              species: "m08",
              weight: 18
            },
            {
              species: "m63",
              weight: 18
            },
            {
              species: "m16",
              weight: 16
            },
            {
              species: "m73",
              weight: 16
            },
            {
              species: "m31",
              weight: 13
            },
            {
              species: "m23",
              weight: 11
            },
            {
              species: "m39",
              weight: 8
            }
          ]
        },
        {
          id: 3,
          name: "Kraterpfad",
          scene: "wald",
          tint: "glut",
          levelMin: 122,
          levelMax: 126,
          cap: 132,
          weather: [
            {
              weather: "gewitter",
              species: "m15",
              pct: 6
            },
            {
              weather: "schnee",
              species: "m69",
              pct: 5
            }
          ],
          guardian: {
            name: "Zorn",
            epithet: "W\xE4chter",
            badge: "Kraterwappen",
            gold: 15250,
            team: [
              {
                species: "m50",
                level: 127
              },
              {
                species: "m29",
                level: 128
              },
              {
                species: "m49",
                level: 130
              }
            ],
            factor: 0.8,
            hpFactor: 0.8,
            atkFactor: 0.85,
            defFactor: 0.8
          },
          day: [
            {
              species: "m15",
              weight: 21
            },
            {
              species: "m69",
              weight: 20
            },
            {
              species: "m22",
              weight: 17
            },
            {
              species: "m84",
              weight: 17
            },
            {
              species: "m49",
              weight: 14
            },
            {
              species: "m29",
              weight: 11
            }
          ],
          night: [
            {
              species: "m15",
              weight: 18
            },
            {
              species: "m69",
              weight: 18
            },
            {
              species: "m22",
              weight: 16
            },
            {
              species: "m84",
              weight: 16
            },
            {
              species: "m49",
              weight: 13
            },
            {
              species: "m29",
              weight: 11
            },
            {
              species: "m50",
              weight: 8
            }
          ]
        },
        {
          id: 4,
          name: "Brandstufe",
          scene: "bach",
          tint: "glut",
          levelMin: 128,
          levelMax: 132,
          cap: 138,
          weather: [
            {
              weather: "schnee",
              species: "m18",
              pct: 6
            },
            {
              weather: "nebel",
              species: "m78",
              pct: 5
            }
          ],
          guardian: {
            name: "Fenna",
            epithet: "W\xE4chterin",
            badge: "Brandwappen",
            gold: 16e3,
            team: [
              {
                species: "m65",
                level: 133
              },
              {
                species: "m37",
                level: 134
              },
              {
                species: "m54",
                level: 136
              }
            ],
            factor: 1.1,
            hpFactor: 1.1,
            atkFactor: 1.13,
            defFactor: 1.1
          },
          day: [
            {
              species: "m18",
              weight: 21
            },
            {
              species: "m78",
              weight: 20
            },
            {
              species: "m35",
              weight: 17
            },
            {
              species: "m94",
              weight: 17
            },
            {
              species: "m54",
              weight: 14
            },
            {
              species: "m37",
              weight: 11
            }
          ],
          night: [
            {
              species: "m18",
              weight: 18
            },
            {
              species: "m78",
              weight: 18
            },
            {
              species: "m35",
              weight: 16
            },
            {
              species: "m94",
              weight: 16
            },
            {
              species: "m54",
              weight: 13
            },
            {
              species: "m37",
              weight: 11
            },
            {
              species: "m65",
              weight: 8
            }
          ]
        },
        {
          id: 5,
          name: "Magmarinne",
          scene: "wiese",
          tint: "glut",
          levelMin: 134,
          levelMax: 138,
          cap: 144,
          weather: [
            {
              weather: "nebel",
              species: "m30",
              pct: 6
            },
            {
              weather: "wind",
              species: "m83",
              pct: 5
            }
          ],
          guardian: {
            name: "Ulv",
            epithet: "W\xE4chter",
            badge: "Magmawappen",
            gold: 16750,
            team: [
              {
                species: "m85",
                level: 139
              },
              {
                species: "m45",
                level: 140
              },
              {
                species: "m64",
                level: 142
              }
            ],
            factor: 1,
            hpFactor: 1,
            atkFactor: 1.05,
            defFactor: 1
          },
          day: [
            {
              species: "m30",
              weight: 21
            },
            {
              species: "m83",
              weight: 20
            },
            {
              species: "m38",
              weight: 17
            },
            {
              species: "m98",
              weight: 17
            },
            {
              species: "m64",
              weight: 14
            },
            {
              species: "m45",
              weight: 11
            }
          ],
          night: [
            {
              species: "m30",
              weight: 18
            },
            {
              species: "m83",
              weight: 18
            },
            {
              species: "m38",
              weight: 16
            },
            {
              species: "m98",
              weight: 16
            },
            {
              species: "m64",
              weight: 13
            },
            {
              species: "m45",
              weight: 11
            },
            {
              species: "m85",
              weight: 8
            }
          ]
        },
        {
          id: 6,
          name: "Ru\xDFkamm",
          scene: "wald",
          tint: "glut",
          levelMin: 140,
          levelMax: 144,
          cap: 150,
          weather: [
            {
              weather: "wind",
              species: "m34",
              pct: 6
            },
            {
              weather: "klar",
              species: "m88",
              pct: 5
            }
          ],
          guardian: {
            name: "Dara",
            epithet: "W\xE4chterin",
            badge: "Ru\xDFwappen",
            gold: 17500,
            team: [
              {
                species: "m60",
                level: 145
              },
              {
                species: "m79",
                level: 146
              },
              {
                species: "m13",
                level: 148
              }
            ],
            factor: 1.05,
            hpFactor: 1.05,
            atkFactor: 1.09,
            defFactor: 1.05
          },
          day: [
            {
              species: "m34",
              weight: 23
            },
            {
              species: "m88",
              weight: 23
            },
            {
              species: "m44",
              weight: 20
            },
            {
              species: "m13",
              weight: 17
            },
            {
              species: "m79",
              weight: 17
            }
          ],
          night: [
            {
              species: "m34",
              weight: 19
            },
            {
              species: "m88",
              weight: 21
            },
            {
              species: "m44",
              weight: 18
            },
            {
              species: "m13",
              weight: 15
            },
            {
              species: "m79",
              weight: 15
            },
            {
              species: "m60",
              weight: 12
            }
          ]
        },
        {
          id: 7,
          name: "Essengrund",
          scene: "bach",
          tint: "glut",
          levelMin: 146,
          levelMax: 150,
          cap: 156,
          weather: [
            {
              weather: "klar",
              species: "m43",
              pct: 6
            },
            {
              weather: "regen",
              species: "m93",
              pct: 5
            }
          ],
          guardian: {
            name: "Korr",
            epithet: "W\xE4chter",
            badge: "Essenwappen",
            gold: 18250,
            team: [
              {
                species: "m74",
                level: 151
              },
              {
                species: "m89",
                level: 152
              },
              {
                species: "m19",
                level: 154
              }
            ],
            factor: 1.05,
            hpFactor: 1.05,
            atkFactor: 1.01,
            defFactor: 1.05
          },
          day: [
            {
              species: "m43",
              weight: 23
            },
            {
              species: "m93",
              weight: 23
            },
            {
              species: "m53",
              weight: 20
            },
            {
              species: "m19",
              weight: 17
            },
            {
              species: "m89",
              weight: 17
            }
          ],
          night: [
            {
              species: "m43",
              weight: 19
            },
            {
              species: "m93",
              weight: 21
            },
            {
              species: "m53",
              weight: 18
            },
            {
              species: "m19",
              weight: 15
            },
            {
              species: "m89",
              weight: 15
            },
            {
              species: "m74",
              weight: 12
            }
          ]
        },
        {
          id: 8,
          name: "Glutgipfel",
          scene: "wiese",
          tint: "glut",
          levelMin: 152,
          levelMax: 156,
          cap: 162,
          weather: [
            {
              weather: "regen",
              species: "m48",
              pct: 6
            },
            {
              weather: "gewitter",
              species: "m97",
              pct: 5
            }
          ],
          guardian: {
            name: "Sera",
            epithet: "W\xE4chterin",
            badge: "Gipfelwappen",
            gold: 19e3,
            team: [
              {
                species: "m95",
                level: 157
              },
              {
                species: "m99",
                level: 158
              },
              {
                species: "m24",
                level: 160
              }
            ],
            factor: 1.25,
            hpFactor: 1.25,
            atkFactor: 1.3,
            defFactor: 1.25
          },
          day: [
            {
              species: "m48",
              weight: 23
            },
            {
              species: "m97",
              weight: 23
            },
            {
              species: "m59",
              weight: 20
            },
            {
              species: "m24",
              weight: 17
            },
            {
              species: "m99",
              weight: 17
            }
          ],
          night: [
            {
              species: "m48",
              weight: 19
            },
            {
              species: "m97",
              weight: 21
            },
            {
              species: "m59",
              weight: 18
            },
            {
              species: "m24",
              weight: 15
            },
            {
              species: "m99",
              weight: 15
            },
            {
              species: "m95",
              weight: 12
            }
          ]
        },
        {
          id: 9,
          name: "Vorhof des Rates",
          scene: "wiese",
          tint: "glut",
          foyer: true,
          levelMin: 160,
          levelMax: 165,
          cap: 168,
          weather: [
            {
              weather: "regen",
              species: "m48",
              pct: 6
            },
            {
              weather: "gewitter",
              species: "m97",
              pct: 5
            }
          ],
          guardian: {
            name: "Ratstor",
            epithet: "Eingang",
            badge: "",
            gold: 0,
            factor: 1,
            team: []
          },
          day: [
            {
              species: "m48",
              weight: 12
            },
            {
              species: "m97",
              weight: 12
            },
            {
              species: "m59",
              weight: 10
            },
            {
              species: "m24",
              weight: 9
            },
            {
              species: "m99",
              weight: 9
            },
            {
              species: "m43",
              weight: 11
            },
            {
              species: "m93",
              weight: 11
            },
            {
              species: "m53",
              weight: 10
            },
            {
              species: "m19",
              weight: 8
            },
            {
              species: "m89",
              weight: 8
            }
          ],
          night: [
            {
              species: "m48",
              weight: 10
            },
            {
              species: "m97",
              weight: 11
            },
            {
              species: "m59",
              weight: 9
            },
            {
              species: "m24",
              weight: 8
            },
            {
              species: "m99",
              weight: 8
            },
            {
              species: "m95",
              weight: 6
            },
            {
              species: "m43",
              weight: 9
            },
            {
              species: "m93",
              weight: 10
            },
            {
              species: "m53",
              weight: 9
            },
            {
              species: "m19",
              weight: 7
            },
            {
              species: "m89",
              weight: 7
            },
            {
              species: "m74",
              weight: 6
            }
          ]
        },
        {
          id: 10,
          name: "Hoher Rat",
          scene: "wald",
          tint: "glut",
          levelMin: 164,
          levelMax: 168,
          cap: 168,
          guardian: {
            name: "Pyr",
            epithet: "Gro\xDFw\xE4chter",
            badge: "Drittes Ratsiegel",
            gold: 2e4,
            team: [
              {
                species: "m27",
                level: 166
              },
              {
                species: "m39",
                level: 167
              },
              {
                species: "m50",
                level: 168
              }
            ],
            factor: 0.8
          },
          day: [],
          night: [],
          council: {
            rewardGold: 75e3,
            unlocksRegion: 4,
            members: [
              {
                id: "r3a",
                name: "Ignaz",
                epithet: "Rat",
                cap: 168,
                gold: 16e3,
                team: [
                  {
                    species: "m27",
                    level: 162
                  },
                  {
                    species: "m39",
                    level: 163
                  },
                  {
                    species: "m50",
                    level: 164
                  }
                ],
                factor: 0.8,
                hpFactor: 0.8,
                atkFactor: 0.82,
                defFactor: 0.8
              },
              {
                id: "r3b",
                name: "Vesta",
                epithet: "R\xE4tin",
                cap: 168,
                gold: 17e3,
                team: [
                  {
                    species: "m27",
                    level: 163
                  },
                  {
                    species: "m39",
                    level: 164
                  },
                  {
                    species: "m50",
                    level: 165
                  }
                ],
                factor: 0.8,
                hpFactor: 0.8,
                atkFactor: 0.81,
                defFactor: 0.8
              },
              {
                id: "r3c",
                name: "Harun",
                epithet: "Rat",
                cap: 168,
                gold: 18e3,
                team: [
                  {
                    species: "m27",
                    level: 164
                  },
                  {
                    species: "m39",
                    level: 165
                  },
                  {
                    species: "m50",
                    level: 166
                  }
                ],
                factor: 0.8,
                hpFactor: 0.8,
                atkFactor: 0.81,
                defFactor: 0.8
              },
              {
                id: "r3d",
                name: "Mila",
                epithet: "R\xE4tin",
                cap: 168,
                gold: 19e3,
                team: [
                  {
                    species: "m27",
                    level: 165
                  },
                  {
                    species: "m39",
                    level: 166
                  },
                  {
                    species: "m50",
                    level: 167
                  }
                ],
                factor: 0.8,
                hpFactor: 0.8,
                atkFactor: 0.79,
                defFactor: 0.8
              },
              {
                id: "r3e",
                name: "Pyr",
                epithet: "Gro\xDFw\xE4chter",
                cap: 168,
                gold: 2e4,
                team: [
                  {
                    species: "m27",
                    level: 166
                  },
                  {
                    species: "m39",
                    level: 167
                  },
                  {
                    species: "m50",
                    level: 168
                  }
                ],
                factor: 0.8,
                hpFactor: 0.8,
                atkFactor: 0.81,
                defFactor: 0.8
              }
            ]
          }
        }
      ]
    },
    {
      id: 4,
      name: "Schattenmoor",
      chapters: [
        {
          id: 1,
          name: "D\xE4mmerpfad",
          scene: "bach",
          tint: "schatten",
          levelMin: 164,
          levelMax: 168,
          cap: 174,
          weather: [
            {
              weather: "klar",
              species: "m13",
              pct: 6
            },
            {
              weather: "regen",
              species: "m79",
              pct: 5
            }
          ],
          guardian: {
            name: "Lome",
            epithet: "W\xE4chterin",
            badge: "D\xE4mmerwappen",
            gold: 19750,
            team: [
              {
                species: "m33",
                level: 169
              },
              {
                species: "m60",
                level: 170
              },
              {
                species: "m79",
                level: 172
              }
            ],
            factor: 1.4,
            hpFactor: 1.4,
            atkFactor: 1.42,
            defFactor: 1.4
          },
          day: [
            {
              species: "m13",
              weight: 35
            },
            {
              species: "m79",
              weight: 36
            },
            {
              species: "m60",
              weight: 29
            }
          ],
          night: [
            {
              species: "m13",
              weight: 31
            },
            {
              species: "m79",
              weight: 31
            },
            {
              species: "m60",
              weight: 25
            },
            {
              species: "m33",
              weight: 13
            }
          ]
        },
        {
          id: 2,
          name: "Sumpfnacht",
          scene: "wiese",
          tint: "schatten",
          levelMin: 170,
          levelMax: 174,
          cap: 180,
          weather: [
            {
              weather: "regen",
              species: "m19",
              pct: 6
            },
            {
              weather: "gewitter",
              species: "m89",
              pct: 5
            }
          ],
          guardian: {
            name: "Morv",
            epithet: "W\xE4chter",
            badge: "Sumpfwappen",
            gold: 20500,
            team: [
              {
                species: "m55",
                level: 175
              },
              {
                species: "m74",
                level: 176
              },
              {
                species: "m89",
                level: 178
              }
            ],
            factor: 1.2,
            hpFactor: 1.2,
            atkFactor: 1.17,
            defFactor: 1.2
          },
          day: [
            {
              species: "m19",
              weight: 35
            },
            {
              species: "m89",
              weight: 36
            },
            {
              species: "m74",
              weight: 29
            }
          ],
          night: [
            {
              species: "m19",
              weight: 31
            },
            {
              species: "m89",
              weight: 31
            },
            {
              species: "m74",
              weight: 25
            },
            {
              species: "m55",
              weight: 13
            }
          ]
        },
        {
          id: 3,
          name: "Schattenried",
          scene: "wald",
          tint: "schatten",
          levelMin: 176,
          levelMax: 180,
          cap: 186,
          weather: [
            {
              weather: "gewitter",
              species: "m24",
              pct: 6
            },
            {
              weather: "schnee",
              species: "m99",
              pct: 5
            }
          ],
          guardian: {
            name: "Selva",
            epithet: "W\xE4chterin",
            badge: "Schattenwappen",
            gold: 21250,
            team: [
              {
                species: "m75",
                level: 181
              },
              {
                species: "m95",
                level: 182
              },
              {
                species: "m99",
                level: 184
              }
            ],
            factor: 1.4,
            hpFactor: 1.4,
            atkFactor: 1.38,
            defFactor: 1.4
          },
          day: [
            {
              species: "m24",
              weight: 35
            },
            {
              species: "m99",
              weight: 36
            },
            {
              species: "m95",
              weight: 29
            }
          ],
          night: [
            {
              species: "m24",
              weight: 31
            },
            {
              species: "m99",
              weight: 31
            },
            {
              species: "m95",
              weight: 25
            },
            {
              species: "m75",
              weight: 13
            }
          ]
        },
        {
          id: 4,
          name: "Nachtmoor",
          scene: "bach",
          tint: "schatten",
          levelMin: 182,
          levelMax: 186,
          cap: 192,
          weather: [
            {
              weather: "schnee",
              species: "m25",
              pct: 6
            },
            {
              weather: "nebel",
              species: "m10",
              pct: 5
            }
          ],
          guardian: {
            name: "Pell",
            epithet: "W\xE4chter",
            badge: "Nachtwappen",
            gold: 22e3,
            team: [
              {
                species: "m90",
                level: 187
              },
              {
                species: "m27",
                level: 188
              },
              {
                species: "m10",
                level: 190
              }
            ],
            factor: 0.95,
            hpFactor: 0.95,
            atkFactor: 0.97,
            defFactor: 0.95
          },
          day: [
            {
              species: "m25",
              weight: 42
            },
            {
              species: "m10",
              weight: 33
            },
            {
              species: "m27",
              weight: 25
            }
          ],
          night: [
            {
              species: "m25",
              weight: 36
            },
            {
              species: "m10",
              weight: 29
            },
            {
              species: "m27",
              weight: 21
            },
            {
              species: "m90",
              weight: 14
            }
          ]
        },
        {
          id: 5,
          name: "Schleiergrund",
          scene: "wiese",
          tint: "schatten",
          levelMin: 188,
          levelMax: 192,
          cap: 198,
          weather: [
            {
              weather: "nebel",
              species: "m31",
              pct: 6
            }
          ],
          guardian: {
            name: "Venn",
            epithet: "W\xE4chterin",
            badge: "Schleierwappen",
            gold: 22750,
            team: [
              {
                species: "m39",
                level: 193
              },
              {
                species: "m23",
                level: 194
              },
              {
                species: "m31",
                level: 196
              }
            ],
            factor: 1.35,
            hpFactor: 1.35,
            atkFactor: 1.34,
            defFactor: 1.35
          },
          day: [
            {
              species: "m31",
              weight: 56
            },
            {
              species: "m23",
              weight: 44
            }
          ],
          night: [
            {
              species: "m31",
              weight: 42
            },
            {
              species: "m23",
              weight: 33
            },
            {
              species: "m39",
              weight: 25
            }
          ]
        },
        {
          id: 6,
          name: "Tiefenwald",
          scene: "wald",
          tint: "schatten",
          levelMin: 194,
          levelMax: 198,
          cap: 204,
          weather: [
            {
              weather: "wind",
              species: "m49",
              pct: 6
            }
          ],
          guardian: {
            name: "Grahm",
            epithet: "W\xE4chter",
            badge: "Tiefenwappen",
            gold: 23500,
            team: [
              {
                species: "m50",
                level: 199
              },
              {
                species: "m29",
                level: 200
              },
              {
                species: "m49",
                level: 202
              }
            ],
            factor: 1.05,
            hpFactor: 1.05,
            atkFactor: 1.05,
            defFactor: 1.05
          },
          day: [
            {
              species: "m49",
              weight: 56
            },
            {
              species: "m29",
              weight: 44
            }
          ],
          night: [
            {
              species: "m49",
              weight: 42
            },
            {
              species: "m29",
              weight: 33
            },
            {
              species: "m50",
              weight: 25
            }
          ]
        },
        {
          id: 7,
          name: "Morastwehr",
          scene: "bach",
          tint: "schatten",
          levelMin: 200,
          levelMax: 204,
          cap: 210,
          weather: [
            {
              weather: "klar",
              species: "m54",
              pct: 6
            }
          ],
          guardian: {
            name: "Ilse",
            epithet: "W\xE4chterin",
            badge: "Morastwappen",
            gold: 24250,
            team: [
              {
                species: "m65",
                level: 205
              },
              {
                species: "m37",
                level: 206
              },
              {
                species: "m54",
                level: 208
              }
            ],
            factor: 1.15,
            hpFactor: 1.15,
            atkFactor: 1.13,
            defFactor: 1.15
          },
          day: [
            {
              species: "m54",
              weight: 56
            },
            {
              species: "m37",
              weight: 44
            }
          ],
          night: [
            {
              species: "m54",
              weight: 42
            },
            {
              species: "m37",
              weight: 33
            },
            {
              species: "m65",
              weight: 25
            }
          ]
        },
        {
          id: 8,
          name: "Finsterkessel",
          scene: "wiese",
          tint: "schatten",
          levelMin: 206,
          levelMax: 210,
          cap: 216,
          weather: [
            {
              weather: "regen",
              species: "m64",
              pct: 6
            }
          ],
          guardian: {
            name: "Orik",
            epithet: "W\xE4chter",
            badge: "Kesselwappen",
            gold: 25e3,
            team: [
              {
                species: "m85",
                level: 211
              },
              {
                species: "m45",
                level: 212
              },
              {
                species: "m64",
                level: 214
              }
            ],
            factor: 1.25,
            hpFactor: 1.25,
            atkFactor: 1.22,
            defFactor: 1.25
          },
          day: [
            {
              species: "m64",
              weight: 56
            },
            {
              species: "m45",
              weight: 44
            }
          ],
          night: [
            {
              species: "m64",
              weight: 42
            },
            {
              species: "m45",
              weight: 33
            },
            {
              species: "m85",
              weight: 25
            }
          ]
        },
        {
          id: 9,
          name: "Vorhof des Rates",
          scene: "wiese",
          tint: "schatten",
          foyer: true,
          levelMin: 214,
          levelMax: 219,
          cap: 222,
          weather: [
            {
              weather: "regen",
              species: "m64",
              pct: 6
            }
          ],
          guardian: {
            name: "Ratstor",
            epithet: "Eingang",
            badge: "",
            gold: 0,
            factor: 1,
            team: []
          },
          day: [
            {
              species: "m64",
              weight: 28
            },
            {
              species: "m45",
              weight: 22
            },
            {
              species: "m54",
              weight: 28
            },
            {
              species: "m37",
              weight: 22
            }
          ],
          night: [
            {
              species: "m64",
              weight: 21
            },
            {
              species: "m45",
              weight: 17
            },
            {
              species: "m85",
              weight: 13
            },
            {
              species: "m54",
              weight: 21
            },
            {
              species: "m37",
              weight: 16
            },
            {
              species: "m65",
              weight: 12
            }
          ]
        },
        {
          id: 10,
          name: "Hoher Rat",
          scene: "wald",
          tint: "schatten",
          levelMin: 218,
          levelMax: 222,
          cap: 222,
          guardian: {
            name: "Noct",
            epithet: "Gro\xDFw\xE4chter",
            badge: "Viertes Ratsiegel",
            gold: 26e3,
            team: [
              {
                species: "m33",
                level: 220
              },
              {
                species: "m55",
                level: 221
              },
              {
                species: "m75",
                level: 222
              }
            ],
            factor: 1.25
          },
          day: [],
          night: [],
          council: {
            rewardGold: 1e5,
            unlocksRegion: 5,
            members: [
              {
                id: "r4a",
                name: "Kelv",
                epithet: "Rat",
                cap: 222,
                gold: 22e3,
                team: [
                  {
                    species: "m33",
                    level: 216
                  },
                  {
                    species: "m55",
                    level: 217
                  },
                  {
                    species: "m75",
                    level: 218
                  }
                ],
                factor: 1.25,
                hpFactor: 1.25,
                atkFactor: 1.28,
                defFactor: 1.25
              },
              {
                id: "r4b",
                name: "Duma",
                epithet: "R\xE4tin",
                cap: 222,
                gold: 23e3,
                team: [
                  {
                    species: "m33",
                    level: 217
                  },
                  {
                    species: "m55",
                    level: 218
                  },
                  {
                    species: "m75",
                    level: 219
                  }
                ],
                factor: 1.25,
                hpFactor: 1.25,
                atkFactor: 1.26,
                defFactor: 1.25
              },
              {
                id: "r4c",
                name: "Soren",
                epithet: "Rat",
                cap: 222,
                gold: 24e3,
                team: [
                  {
                    species: "m33",
                    level: 218
                  },
                  {
                    species: "m55",
                    level: 219
                  },
                  {
                    species: "m75",
                    level: 220
                  }
                ],
                factor: 1.25,
                hpFactor: 1.25,
                atkFactor: 1.25,
                defFactor: 1.25
              },
              {
                id: "r4d",
                name: "Pira",
                epithet: "R\xE4tin",
                cap: 222,
                gold: 25e3,
                team: [
                  {
                    species: "m33",
                    level: 219
                  },
                  {
                    species: "m55",
                    level: 220
                  },
                  {
                    species: "m75",
                    level: 221
                  }
                ],
                factor: 1.25,
                hpFactor: 1.25,
                atkFactor: 1.23,
                defFactor: 1.25
              },
              {
                id: "r4e",
                name: "Noct",
                epithet: "Gro\xDFw\xE4chter",
                cap: 222,
                gold: 26e3,
                team: [
                  {
                    species: "m33",
                    level: 220
                  },
                  {
                    species: "m55",
                    level: 221
                  },
                  {
                    species: "m75",
                    level: 222
                  }
                ],
                factor: 1.25,
                hpFactor: 1.25,
                atkFactor: 1.26,
                defFactor: 1.25
              }
            ]
          }
        }
      ]
    },
    {
      id: 5,
      name: "Himmelsthron",
      chapters: [
        {
          id: 1,
          name: "Wolkenstieg",
          scene: "bach",
          tint: "himmel",
          levelMin: 218,
          levelMax: 222,
          cap: 228,
          weather: [
            {
              weather: "klar",
              species: "m10",
              pct: 6
            }
          ],
          guardian: {
            name: "Aela",
            epithet: "W\xE4chterin",
            badge: "Wolkenwappen",
            gold: 25750,
            team: [
              {
                species: "m90",
                level: 223
              },
              {
                species: "m27",
                level: 224
              },
              {
                species: "m10",
                level: 226
              }
            ],
            factor: 1.1,
            hpFactor: 1.1,
            atkFactor: 1.06,
            defFactor: 1.1
          },
          day: [
            {
              species: "m10",
              weight: 57
            },
            {
              species: "m27",
              weight: 43
            }
          ],
          night: [
            {
              species: "m10",
              weight: 45
            },
            {
              species: "m27",
              weight: 33
            },
            {
              species: "m90",
              weight: 22
            }
          ]
        },
        {
          id: 2,
          name: "H\xF6henwind",
          scene: "wiese",
          tint: "himmel",
          levelMin: 224,
          levelMax: 228,
          cap: 234,
          weather: [
            {
              weather: "regen",
              species: "m23",
              pct: 6
            }
          ],
          guardian: {
            name: "Finn",
            epithet: "W\xE4chter",
            badge: "H\xF6henwappen",
            gold: 26500,
            team: [
              {
                species: "m39",
                level: 229
              },
              {
                species: "m23",
                level: 230
              },
              {
                species: "m39",
                level: 232
              }
            ],
            factor: 1.4,
            hpFactor: 1.4,
            atkFactor: 1.41,
            defFactor: 1.4
          },
          day: [
            {
              species: "m23",
              weight: 100
            }
          ],
          night: [
            {
              species: "m23",
              weight: 57
            },
            {
              species: "m39",
              weight: 43
            }
          ]
        },
        {
          id: 3,
          name: "Sternenfeld",
          scene: "wald",
          tint: "himmel",
          levelMin: 230,
          levelMax: 234,
          cap: 240,
          weather: [
            {
              weather: "gewitter",
              species: "m29",
              pct: 6
            }
          ],
          guardian: {
            name: "Esta",
            epithet: "W\xE4chterin",
            badge: "Sternwappen",
            gold: 27250,
            team: [
              {
                species: "m50",
                level: 235
              },
              {
                species: "m29",
                level: 236
              },
              {
                species: "m50",
                level: 238
              }
            ],
            factor: 1.05,
            hpFactor: 1.05,
            atkFactor: 1.06,
            defFactor: 1.05
          },
          day: [
            {
              species: "m29",
              weight: 100
            }
          ],
          night: [
            {
              species: "m29",
              weight: 57
            },
            {
              species: "m50",
              weight: 43
            }
          ]
        },
        {
          id: 4,
          name: "\xC4therstieg",
          scene: "bach",
          tint: "himmel",
          levelMin: 236,
          levelMax: 240,
          cap: 246,
          weather: [
            {
              weather: "schnee",
              species: "m37",
              pct: 6
            }
          ],
          guardian: {
            name: "Solm",
            epithet: "W\xE4chter",
            badge: "\xC4therwappen",
            gold: 28e3,
            team: [
              {
                species: "m65",
                level: 241
              },
              {
                species: "m37",
                level: 242
              },
              {
                species: "m65",
                level: 244
              }
            ],
            factor: 1.25,
            hpFactor: 1.25,
            atkFactor: 1.25,
            defFactor: 1.25
          },
          day: [
            {
              species: "m37",
              weight: 100
            }
          ],
          night: [
            {
              species: "m37",
              weight: 57
            },
            {
              species: "m65",
              weight: 43
            }
          ]
        },
        {
          id: 5,
          name: "Thronn\xE4he",
          scene: "wiese",
          tint: "himmel",
          levelMin: 242,
          levelMax: 246,
          cap: 252,
          weather: [
            {
              weather: "nebel",
              species: "m45",
              pct: 6
            }
          ],
          guardian: {
            name: "Rega",
            epithet: "W\xE4chterin",
            badge: "Thronwappen",
            gold: 28750,
            team: [
              {
                species: "m85",
                level: 247
              },
              {
                species: "m45",
                level: 248
              },
              {
                species: "m85",
                level: 250
              }
            ],
            factor: 1.3,
            hpFactor: 1.3,
            atkFactor: 1.28,
            defFactor: 1.3
          },
          day: [
            {
              species: "m45",
              weight: 100
            }
          ],
          night: [
            {
              species: "m45",
              weight: 57
            },
            {
              species: "m85",
              weight: 43
            }
          ]
        },
        {
          id: 6,
          name: "Himmelsrand",
          scene: "wald",
          tint: "himmel",
          levelMin: 248,
          levelMax: 252,
          cap: 258,
          weather: [
            {
              weather: "wind",
              species: "m60",
              pct: 6
            }
          ],
          guardian: {
            name: "Pico",
            epithet: "W\xE4chter",
            badge: "Himmelswappen",
            gold: 29500,
            team: [
              {
                species: "m33",
                level: 253
              },
              {
                species: "m60",
                level: 254
              },
              {
                species: "m33",
                level: 256
              }
            ],
            factor: 1.5,
            hpFactor: 1.5,
            atkFactor: 1.52,
            defFactor: 1.5
          },
          day: [
            {
              species: "m60",
              weight: 100
            }
          ],
          night: [
            {
              species: "m60",
              weight: 67
            },
            {
              species: "m33",
              weight: 33
            }
          ]
        },
        {
          id: 7,
          name: "Kronenlicht",
          scene: "bach",
          tint: "himmel",
          levelMin: 254,
          levelMax: 258,
          cap: 264,
          weather: [
            {
              weather: "klar",
              species: "m74",
              pct: 6
            }
          ],
          guardian: {
            name: "Vale",
            epithet: "W\xE4chterin",
            badge: "Kronenwappen",
            gold: 30250,
            team: [
              {
                species: "m55",
                level: 259
              },
              {
                species: "m74",
                level: 260
              },
              {
                species: "m55",
                level: 262
              }
            ],
            factor: 1.1,
            hpFactor: 1.1,
            atkFactor: 1.09,
            defFactor: 1.1
          },
          day: [
            {
              species: "m74",
              weight: 100
            }
          ],
          night: [
            {
              species: "m74",
              weight: 67
            },
            {
              species: "m55",
              weight: 33
            }
          ]
        },
        {
          id: 8,
          name: "Thronhalle",
          scene: "wiese",
          tint: "himmel",
          levelMin: 260,
          levelMax: 264,
          cap: 270,
          weather: [
            {
              weather: "regen",
              species: "m95",
              pct: 6
            }
          ],
          guardian: {
            name: "Ciel",
            epithet: "W\xE4chter",
            badge: "Hallenwappen",
            gold: 31e3,
            team: [
              {
                species: "m75",
                level: 265
              },
              {
                species: "m95",
                level: 266
              },
              {
                species: "m75",
                level: 268
              }
            ],
            factor: 1.45,
            hpFactor: 1.45,
            atkFactor: 1.52,
            defFactor: 1.45
          },
          day: [
            {
              species: "m95",
              weight: 100
            }
          ],
          night: [
            {
              species: "m95",
              weight: 67
            },
            {
              species: "m75",
              weight: 33
            }
          ]
        },
        {
          id: 9,
          name: "Vorhof des Rates",
          scene: "wiese",
          tint: "himmel",
          foyer: true,
          levelMin: 268,
          levelMax: 273,
          cap: 276,
          weather: [
            {
              weather: "regen",
              species: "m95",
              pct: 6
            }
          ],
          guardian: {
            name: "Ratstor",
            epithet: "Eingang",
            badge: "",
            gold: 0,
            factor: 1,
            team: []
          },
          day: [
            {
              species: "m95",
              weight: 50
            },
            {
              species: "m74",
              weight: 50
            }
          ],
          night: [
            {
              species: "m95",
              weight: 34
            },
            {
              species: "m75",
              weight: 17
            },
            {
              species: "m74",
              weight: 33
            },
            {
              species: "m55",
              weight: 16
            }
          ]
        },
        {
          id: 10,
          name: "Hoher Rat",
          scene: "wald",
          tint: "himmel",
          levelMin: 272,
          levelMax: 276,
          cap: 276,
          guardian: {
            name: "Ith",
            epithet: "Gro\xDFw\xE4chter",
            badge: "F\xFCnftes Ratsiegel",
            gold: 32e3,
            team: [
              {
                species: "m33",
                level: 274
              },
              {
                species: "m55",
                level: 275
              },
              {
                species: "m75",
                level: 276
              }
            ],
            factor: 1.25
          },
          day: [],
          night: [],
          council: {
            rewardGold: 125e3,
            unlocksRegion: 0,
            members: [
              {
                id: "r5a",
                name: "Oris",
                epithet: "Rat",
                cap: 276,
                gold: 28e3,
                team: [
                  {
                    species: "m33",
                    level: 270
                  },
                  {
                    species: "m55",
                    level: 271
                  },
                  {
                    species: "m75",
                    level: 272
                  }
                ],
                factor: 1.25,
                hpFactor: 1.25,
                atkFactor: 1.26,
                defFactor: 1.25
              },
              {
                id: "r5b",
                name: "Cael",
                epithet: "R\xE4tin",
                cap: 276,
                gold: 29e3,
                team: [
                  {
                    species: "m33",
                    level: 271
                  },
                  {
                    species: "m55",
                    level: 272
                  },
                  {
                    species: "m75",
                    level: 273
                  }
                ],
                factor: 1.25,
                hpFactor: 1.25,
                atkFactor: 1.27,
                defFactor: 1.25
              },
              {
                id: "r5c",
                name: "Vion",
                epithet: "Rat",
                cap: 276,
                gold: 3e4,
                team: [
                  {
                    species: "m33",
                    level: 272
                  },
                  {
                    species: "m55",
                    level: 273
                  },
                  {
                    species: "m75",
                    level: 274
                  }
                ],
                factor: 1.25,
                hpFactor: 1.25,
                atkFactor: 1.13,
                defFactor: 1.25
              },
              {
                id: "r5d",
                name: "Nima",
                epithet: "R\xE4tin",
                cap: 276,
                gold: 31e3,
                team: [
                  {
                    species: "m33",
                    level: 273
                  },
                  {
                    species: "m55",
                    level: 274
                  },
                  {
                    species: "m75",
                    level: 275
                  }
                ],
                factor: 1.25,
                hpFactor: 1.25,
                atkFactor: 1.25,
                defFactor: 1.25
              },
              {
                id: "r5e",
                name: "Ith",
                epithet: "Gro\xDFw\xE4chter",
                cap: 276,
                gold: 32e3,
                team: [
                  {
                    species: "m33",
                    level: 274
                  },
                  {
                    species: "m55",
                    level: 275
                  },
                  {
                    species: "m75",
                    level: 276
                  }
                ],
                factor: 1.25,
                hpFactor: 1.25,
                atkFactor: 1.24,
                defFactor: 1.25
              }
            ]
          }
        },
        {
          id: 11,
          name: "Urgrund",
          scene: "wald",
          tint: "horst",
          special: true,
          levelMin: 276,
          levelMax: 280,
          cap: 280,
          guardian: {
            name: "Ith",
            epithet: "Gro\xDFw\xE4chter",
            badge: "",
            gold: 0,
            team: [
              {
                species: "m40",
                level: 278
              },
              {
                species: "m80",
                level: 279
              },
              {
                species: "m100",
                level: 280
              }
            ],
            factor: 1
          },
          day: [
            {
              species: "m40",
              weight: 34
            },
            {
              species: "m80",
              weight: 33
            },
            {
              species: "m100",
              weight: 33
            }
          ],
          night: [
            {
              species: "m40",
              weight: 34
            },
            {
              species: "m80",
              weight: 33
            },
            {
              species: "m100",
              weight: 33
            }
          ]
        }
      ]
    }
  ]
};

// src/adventure/weather.ts
var WEATHER_SHIFTS = {
  klar: { up: [{ type: "fire", pct: 10 }, { type: "light", pct: 10 }], down: [{ type: "ice", pct: 10 }] },
  regen: { up: [{ type: "water", pct: 15 }], down: [{ type: "fire", pct: 15 }] },
  gewitter: { up: [{ type: "lightning", pct: 15 }], down: [{ type: "metal", pct: 10 }] },
  schnee: { up: [{ type: "ice", pct: 15 }], down: [{ type: "plant", pct: 10 }, { type: "dragon", pct: 10 }] },
  nebel: { up: [{ type: "ghost", pct: 10 }, { type: "shadow", pct: 10 }], down: [{ type: "light", pct: 10 }] },
  wind: { up: [{ type: "wind", pct: 15 }, { type: "sound", pct: 5 }], down: [{ type: "insect", pct: 10 }] }
};
function weatherFactor(weather, type) {
  if (!weather) return 1;
  const row = WEATHER_SHIFTS[weather];
  const up = row.up.find((shift) => shift.type === type);
  if (up) return 1 + up.pct / 100;
  const down = row.down.find((shift) => shift.type === type);
  if (down) return 1 - down.pct / 100;
  return 1;
}

// src/adventure/route.ts
var regions = regions_default.regions;

// src/adventure/lootbox.ts
var file = lootbox_default;
function starFactor(stars) {
  const steps = Math.max(0, Math.min(5, Math.floor(stars)));
  return 1 + file.starStat * steps;
}

// src/adventure/mastery.ts
var MASTERY_STEPS = [1e3, 3e3, 8e3, 18e3, 35e3];
function masteryLevel(ep) {
  const points = Math.max(0, Math.floor(ep) || 0);
  let level = 0;
  for (const step of MASTERY_STEPS) if (points >= step) level += 1;
  return level;
}
function masteryFactor(level) {
  const rank2 = Math.max(0, Math.min(MASTERY_STEPS.length, Math.floor(level) || 0));
  return 1 + 0.02 * rank2;
}

// src/adventure/stats.ts
function awakenCount(level) {
  return (level >= 50 ? 1 : 0) + (level >= 25 ? 1 : 0);
}
function awakenFactor(level) {
  return 1 + 0.15 * awakenCount(level);
}
function combatStats(speciesId, level, shiny = false) {
  const base = species(speciesId).base;
  const growth = 1 + 0.06 * (level - 1);
  const shine = shiny ? 1.1 : 1;
  return {
    hp: Math.round(base.hp * growth * shine),
    atk: Math.round(base.atk * growth * shine),
    def: Math.round(base.def * growth * shine),
    spd: Math.round(base.spd * shine)
  };
}
function monStats(mon, level = mon.lvl, mastery = 0) {
  const raw = combatStats(mon.species, level, mon.shiny);
  const factor = awakenFactor(level);
  const stars = starFactor(mon.stars ?? 0);
  const rank2 = masteryFactor(mastery);
  return {
    hp: Math.round(raw.hp * factor * stars * rank2),
    atk: Math.round(raw.atk * factor * stars * rank2),
    def: Math.round(raw.def * factor * stars * rank2),
    spd: Math.round(raw.spd * factor)
  };
}

// src/adventure/ult.ts
var ULT_LEVEL = 25;
var ULT_SEGMENTS = 5;
var ULT_DAMAGE = 1.6;
var ULT_PIERCE = 0.3;
var ULT_ACTION_MS = 1e3;
var ULT_WALL_MS = 3e3;
var ULT_WALL_CUT = 0.4;
function wallActions(speed = 1) {
  const pace = speed === 2 || speed === 3 ? speed : 1;
  return Math.max(1, Math.round(ULT_WALL_MS / ULT_ACTION_MS / pace));
}
var ULT_IMPULSE = 0.25;
var ULT_IMPULSE_ATTACKS = 4;
var ULT_HEAL = 0.25;
var ULT_BOSS_FETTER = 0.5;
var ULT_PATTERNS = ["durchschlag", "schildwall", "impuls", "fessel", "heilleucht"];
var NAMES = {
  durchschlag: "Durchschlag",
  schildwall: "Schildwall",
  impuls: "Impuls",
  fessel: "Fessel",
  heilleucht: "Heilleucht"
};
function ultUnlocked(level) {
  return level >= ULT_LEVEL;
}
function ultPattern(speciesId) {
  const n = Number(speciesId.replace(/\D/g, "")) || 1;
  return ULT_PATTERNS[(Math.max(1, n) - 1) % ULT_PATTERNS.length];
}
function ultName(pattern) {
  return NAMES[pattern];
}
function gainUlt(level, charge, amount) {
  if (!ultUnlocked(level)) return 0;
  return Math.max(0, Math.min(ULT_SEGMENTS, charge + amount));
}
function ultReady(level, charge) {
  return ultUnlocked(level) && charge >= ULT_SEGMENTS;
}

// src/adventure/order.ts
var COUNTER_BLOW = 0.2;
var COUNTER_ULT = 2;
var ANCHOR_ULT = 1;

// src/adventure/mech.ts
var ARMOR_CUT = 0.2;
var ARMOR_CRITS = 3;
var RAGE_HP = 0.4;
var RAGE_MULT = 1.5;
var AIDE_HP = 0.6;
var AIDE_EVERY = 4;
var AIDE_ATK = 0.4;
var PULSE_EVERY = 5;
var PULSE_MULT = 0.6;
var MIRROR = 0.2;

// src/adventure/ailment.ts
var AILMENTS = {
  brand: { id: "brand", name: "Brand", attacks: 3, dot: 0.03, stacks: 1, def: 1, skip: 0, damage: 1, miss: 0, weather: true, tip: "Brand: 3 % Max-HP je Angriff, 3 Angriffe." },
  naesse: { id: "naesse", name: "N\xE4sse", attacks: 3, dot: 0, stacks: 1, def: 0.85, skip: 0, damage: 1, miss: 0, weather: false, tip: "N\xE4sse: DEF \u221215 %, 3 Angriffe." },
  frost: { id: "frost", name: "Frost", attacks: 2, dot: 0, stacks: 1, def: 1, skip: 0.3, damage: 1, miss: 0, weather: false, tip: "Frost: greift 30 % seltener, 2 Angriffe." },
  giftnebel: { id: "giftnebel", name: "Giftnebel", attacks: 4, dot: 0.02, stacks: 3, def: 1, skip: 0, damage: 1, miss: 0, weather: true, tip: "Giftnebel: 2 % Max-HP je Angriff und Stapel, bis 3, 4 Angriffe." },
  schock: { id: "schock", name: "Schock", attacks: 1, dot: 0, stacks: 1, def: 1, skip: 0, damage: 0.5, miss: 0, weather: false, tip: "Schock: der n\xE4chste Angriff macht \u221250 % Schaden." },
  spreu: { id: "spreu", name: "Spreu", attacks: 3, dot: 0, stacks: 1, def: 1, skip: 0, damage: 1, miss: 0.2, weather: false, tip: "Spreu: 20 % der Angriffe gehen daneben, 3 Angriffe." }
};
var BY_TYPE = {
  fire: "brand",
  water: "naesse",
  ice: "frost",
  poison: "giftnebel",
  lightning: "schock",
  wind: "spreu",
  insect: "spreu"
};
function ailmentFor(type, kind) {
  if (type === "fire" && kind === "strike") return null;
  return BY_TYPE[type] ?? null;
}
function bossDuration(attacks, boss) {
  if (!boss) return attacks;
  return Math.max(1, Math.round(attacks * 0.5));
}
function bossImmune(defender, id) {
  return BY_TYPE[defender] === id;
}

// src/adventure/battle.ts
var ALLY_TARGET = /* @__PURE__ */ new Set(["self", "ally_all", "ally_lowest_hp_pct", "self_and_ally_lowest_hp_pct"]);
var NEGATIVE = ["burn", "stun", "poison", "def_down", "atk_down", "spd_down"];
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function mod(unit, up, down) {
  let value = 0;
  for (const status of unit.statuses) {
    if (status.id === up) value += status.value;
    if (status.id === down) value -= status.value;
  }
  return clamp(value, combat.modMin, combat.modMax);
}
function atkOf(unit) {
  const atk = unit.side.atk * (1 + mod(unit, "atk_up", "atk_down"));
  return unit.impulseLeft > 0 ? atk * (1 + ULT_IMPULSE) : atk;
}
function defOf(unit, pierce = 0) {
  const wet = unit.mark?.id === "naesse" ? AILMENTS.naesse.def : 1;
  return Math.max(0, unit.side.def * (1 + mod(unit, "def_up", "def_down")) * (1 - pierce) * wet);
}
function rawDamage(atk, def, skillMult, tMult, crit, variance) {
  const safeDef = Math.max(0, def);
  const base = combat.dmgScale * atk * atk / (atk + safeDef);
  const critMult = crit ? combat.critMult : 1;
  return Math.max(1, Math.floor(base * skillMult * tMult * critMult * variance));
}
function makeActor(side) {
  const passive = side.passive;
  let rebirths = 0;
  let rebirthPct = 0;
  let passiveLeft = 0;
  let passivePct = 1;
  let passiveShield = 0;
  let passiveDuration = 2;
  if (passive && passive.hpPct != null && !passive.trigger) {
    rebirths = passive.usesPerBattle;
    rebirthPct = passive.hpPct;
  } else if (passive?.trigger?.kind === "hp_below") {
    passiveLeft = passive.usesPerBattle;
    passivePct = passive.trigger.pct ?? 0.5;
    const shield = passive.effects?.find((effect) => effect.kind === "shield");
    if (shield && shield.kind === "shield") {
      passiveShield = shield.maxHpPctOfCaster;
      passiveDuration = shield.duration;
    }
  }
  return {
    side,
    hp: Math.max(0, Math.min(side.maxHp, side.hp)),
    cd: side.skill.initialCooldown,
    shield: 0,
    shieldTurns: 0,
    shieldFresh: false,
    statuses: [],
    rebirths,
    rebirthPct,
    passiveLeft,
    passivePct,
    passiveShield,
    passiveDuration,
    ultCharge: side.counter && ultUnlocked(side.level ?? 0) ? COUNTER_ULT : 0,
    opening: Boolean(side.counter),
    struck: false,
    impulseLeft: 0,
    wallLeft: 0,
    wallFresh: false,
    skip: false,
    mark: null,
    armorCrits: 0,
    bossAttacks: 0
  };
}
function skillUsable(unit, foe) {
  const skill = unit.side.skill;
  const kinds = new Set(skill.effects.map((effect) => effect.kind));
  const ally = ALLY_TARGET.has(skill.target);
  if (!ally && foe.hp <= 0) return false;
  if (kinds.size === 1 && kinds.has("heal") && unit.hp >= unit.side.maxHp - 0.01) return false;
  return true;
}
function applyStatus(target, effect, caster, duration = effect.duration) {
  const value = effect.value ?? 0;
  if (effect.status === "burn") {
    const burnDmg = Math.max(0, Math.floor(atkOf(caster) * (value || combat.burnAtkFraction)));
    const existing2 = target.statuses.find((row) => row.id === "burn");
    if (existing2) {
      existing2.duration = duration;
      existing2.burnDmg = burnDmg;
      existing2.fresh = true;
      existing2.sourceType = caster.side.type;
    } else target.statuses.push({ id: "burn", duration, value, stacks: 1, burnDmg, fresh: true, sourceType: caster.side.type });
    return;
  }
  if (effect.status === "poison") {
    const stacks = effect.stacks ?? 1;
    const existing2 = target.statuses.find((row) => row.id === "poison");
    if (existing2) {
      existing2.stacks = Math.min(3, existing2.stacks + stacks);
      existing2.duration = duration;
      existing2.fresh = true;
      existing2.sourceType = caster.side.type;
    } else target.statuses.push({ id: "poison", duration, value, stacks: Math.min(3, stacks), burnDmg: 0, fresh: true, sourceType: caster.side.type });
    return;
  }
  const existing = target.statuses.find((row) => row.id === effect.status);
  if (existing) {
    existing.duration = duration;
    existing.value = value;
    existing.fresh = true;
  } else target.statuses.push({ id: effect.status, duration, value, stacks: 1, burnDmg: 0, fresh: true, sourceType: caster.side.type });
}
function giveShield(target, amount, duration) {
  const next = Math.max(0, Math.floor(amount));
  if (next >= target.shield) {
    target.shield = next;
    target.shieldTurns = duration;
    target.shieldFresh = true;
  }
}
function maybePassive(unit) {
  if (unit.passiveLeft <= 0 || unit.hp <= 0) return;
  if (unit.hp / unit.side.maxHp > unit.passivePct) return;
  unit.passiveLeft = 0;
  if (unit.passiveShield > 0) giveShield(unit, unit.side.maxHp * unit.passiveShield, unit.passiveDuration);
}
function tick(unit) {
  for (const status of unit.statuses) {
    if (status.fresh) status.fresh = false;
    else status.duration -= 1;
  }
  unit.statuses = unit.statuses.filter((status) => status.duration > 0);
  if (unit.shield > 0) {
    if (unit.shieldFresh) unit.shieldFresh = false;
    else {
      unit.shieldTurns -= 1;
      if (unit.shieldTurns <= 0) {
        unit.shield = 0;
        unit.shieldTurns = 0;
      }
    }
  }
}
function withSpd(side, mul) {
  if (mul == null || mul === 1) return side;
  return { ...side, spd: Math.max(1, Math.round(side.spd * mul)) };
}
function allyStrikesFirst(allySpd, foeSpd, roll) {
  const fast = Math.max(allySpd, foeSpd);
  const slow = Math.min(allySpd, foeSpd);
  if (!(fast > 0) || (fast - slow) / fast < 0.05) return roll < 0.5;
  return allySpd > foeSpd;
}
function fight1v1(allyIn, foeIn, rng, trace, weather = null, mods = null) {
  const allySide = withSpd(allyIn, mods?.allySpd);
  const foeSide = withSpd(foeIn, mods?.foeSpd);
  const ally = makeActor(allySide);
  const foe = makeActor(foeSide);
  const frames = [];
  const pending = [];
  const push = (text) => {
    if (!trace) return;
    frames.push({
      allyHp: Math.max(0, ally.hp),
      foeHp: Math.max(0, foe.hp),
      text,
      hits: pending.splice(0),
      allyUlt: ally.ultCharge,
      foeUlt: foe.ultCharge,
      allyUltOpen: ultUnlocked(ally.side.level ?? 0),
      foeUltOpen: ultUnlocked(foe.side.level ?? 0),
      allyMark: ally.mark?.id ?? null,
      foeMark: foe.mark?.id ?? null,
      allyStacks: ally.mark?.stacks ?? 0,
      foeStacks: foe.mark?.stacks ?? 0,
      helper: Boolean(foe.side.mechs?.includes("beistand") && foe.hp > 0 && foe.hp / foe.side.maxHp >= AIDE_HP)
    });
  };
  const offer = (attacker, target, kind) => {
    const id = ailmentFor(attacker.side.type, kind);
    if (!id || target.hp <= 0) return;
    if (target.side.boss && bossImmune(target.side.type, id)) return;
    const spec = AILMENTS[id];
    const left = bossDuration(spec.attacks, Boolean(target.side.boss));
    if (target.mark?.id === "giftnebel" && id === "giftnebel") {
      target.mark.stacks = Math.min(spec.stacks, target.mark.stacks + 1);
      target.mark.left = left;
      target.mark.sourceType = attacker.side.type;
      return;
    }
    target.mark = { id, left, stacks: 1, sourceType: attacker.side.type };
  };
  const tickMark = (unit, attacked) => {
    const mark = unit.mark;
    if (!mark) return;
    if (attacked && (mark.id === "brand" || mark.id === "giftnebel")) {
      const spec = AILMENTS[mark.id];
      const factor = spec.weather ? weatherFactor(weather, mark.sourceType) : 1;
      hurt(unit, Math.max(0, Math.floor(unit.side.maxHp * spec.dot * mark.stacks * factor)), true);
    }
    if (attacked || mark.id === "frost") {
      mark.left -= 1;
      if (mark.left <= 0) unit.mark = null;
    }
  };
  const bandOf = (mult) => mult > 1 ? "strong" : mult < 1 ? "weak" : "neutral";
  push(`${ally.side.name} gegen ${foe.side.name}`);
  const hurt = (target, amount, ignoreShield) => {
    let remaining = target.wallLeft > 0 ? Math.floor(amount * (1 - ULT_WALL_CUT)) : amount;
    if (!ignoreShield && target.shield > 0 && remaining > 0) {
      const absorbed = Math.min(target.shield, remaining);
      target.shield -= absorbed;
      remaining -= absorbed;
      if (target.shield <= 0) {
        target.shield = 0;
        target.shieldTurns = 0;
      }
    }
    const past = remaining;
    if (remaining > 0) target.hp -= remaining;
    if (target.hp <= 0) {
      target.wallLeft = 0;
      target.wallFresh = false;
      const breath = target === ally ? mods?.breath : mods?.foeBreath;
      if (breath && breath.left > 0 && target.rebirths <= 0) {
        target.hp = 1;
        breath.left = 0;
      } else if (target.rebirths > 0) {
        target.rebirths -= 1;
        target.hp = Math.max(1, Math.floor(target.side.maxHp * target.rebirthPct));
        target.statuses = [];
        target.shield = 0;
        target.shieldTurns = 0;
      } else target.hp = 0;
    } else maybePassive(target);
    return past;
  };
  let bossSwung = false;
  const hasMech = (unit, id) => Boolean(unit.side.mechs?.includes(id));
  const strike = (attacker, target, skillMult, pierce, ult, extra) => {
    let tMult = typeMult(attacker.side.type, target.side.type);
    if (attacker === ally && tMult === 1.5 && mods?.strongType) tMult = mods.strongType;
    if (attacker !== ally && tMult === 1.5 && mods?.foeStrongType) tMult = mods.foeStrongType;
    const wMult = ult === "heilleucht" ? 1 : weatherFactor(weather, attacker.side.type);
    const boosted = attacker.impulseLeft > 0 && !ult && !extra?.helper && !extra?.pulse;
    const critAdd = attacker === ally ? mods?.critAdd ?? 0 : mods?.foeCritAdd ?? 0;
    const crit = rng() < combat.critChance + critAdd;
    const variance = combat.varianceMin + (combat.varianceMax - combat.varianceMin) * rng();
    const blow = attacker.opening && !extra?.helper && !extra?.pulse ? 1 + COUNTER_BLOW : 1;
    if (attacker.opening && !extra?.helper && !extra?.pulse) attacker.struck = true;
    if (!extra?.helper && !extra?.pulse && attacker.side.boss) bossSwung = true;
    const rage = hasMech(attacker, "wut") && !extra?.helper && attacker.hp / attacker.side.maxHp < RAGE_HP;
    let dmg = rawDamage(atkOf(attacker) * (extra?.atkScale ?? 1), defOf(target, pierce), skillMult * blow * (rage ? RAGE_MULT : 1), tMult * wMult, crit, variance);
    if (attacker.mark?.id === "schock") dmg = Math.floor(dmg * AILMENTS.schock.damage);
    if (!extra?.unavoidable && attacker.mark?.id === "spreu" && rng() < AILMENTS.spreu.miss) dmg = 0;
    const dodge = target === ally ? mods?.dodge ?? 0 : mods?.foeDodge ?? 0;
    if (!extra?.unavoidable && dodge > 0 && rng() < dodge) dmg = 0;
    const landed = dmg > 0;
    if (landed && hasMech(target, "panzerung") && target.armorCrits < ARMOR_CRITS) dmg = Math.max(1, Math.floor(dmg * (1 - ARMOR_CUT)));
    if (boosted) attacker.impulseLeft -= 1;
    if (crit) target.ultCharge = gainUlt(target.side.level ?? 0, target.ultCharge, 1);
    if (crit && landed && hasMech(target, "panzerung")) target.armorCrits += 1;
    const past = hurt(target, dmg, false);
    if (trace && past > 0) {
      pending.push({
        from: attacker === ally ? "ally" : "foe",
        amount: past,
        crit,
        type: attacker.side.type,
        band: bandOf(tMult),
        ko: target.hp <= 0,
        kind: "hit",
        awaken: awakenCount(attacker.side.level ?? 0) > 0,
        weather: wMult,
        ult,
        helper: extra?.helper,
        pulse: extra?.pulse
      });
    }
    if (past > 0 && !ult && hasMech(target, "spiegel") && attacker.hp > 0) {
      const back = Math.floor(past * MIRROR);
      if (back > 0) {
        hurt(attacker, back, false);
        if (trace) pending.push({
          from: target === ally ? "ally" : "foe",
          amount: back,
          crit: false,
          type: target.side.type,
          band: "neutral",
          ko: attacker.hp <= 0,
          kind: "hit",
          mirror: true
        });
      }
    }
    const thorns = target.statuses.find((status) => status.id === "thorns");
    if (past > 0 && thorns && attacker.hp > 0) {
      const reflected = Math.floor(past * thorns.value);
      if (reflected > 0) hurt(attacker, reflected, false);
    }
    return dmg;
  };
  const noteBossAttack = (unit, other) => {
    if (!bossSwung || unit.hp <= 0) {
      bossSwung = false;
      return;
    }
    bossSwung = false;
    unit.bossAttacks += 1;
    const n = unit.bossAttacks;
    if (hasMech(unit, "beistand") && n % AIDE_EVERY === 0 && unit.hp / unit.side.maxHp >= AIDE_HP && other.hp > 0) {
      strike(unit, other, 1, 0, void 0, { atkScale: AIDE_ATK, helper: true });
      push("Ein Helfer greift an.");
    }
    if (hasMech(unit, "puls") && n % PULSE_EVERY === 0 && other.hp > 0 && unit.hp > 0) {
      strike(unit, other, PULSE_MULT, 0, void 0, { unavoidable: true, pulse: true });
      push("Ein Puls trifft.");
    }
  };
  const cast = (unit, other) => {
    const skill = unit.side.skill;
    const allyTarget = ALLY_TARGET.has(skill.target);
    const damaged = { ok: false };
    const hadDamage = skill.effects.some((effect) => effect.kind === "damage");
    for (const effect of skill.effects) {
      if (effect.kind === "damage") {
        const hits = effect.hits ?? 1;
        for (let hit = 0; hit < hits; hit++) {
          if (unit.hp <= 0 || other.hp <= 0) break;
          const dealt = strike(unit, other, effect.atkMult, effect.defPierce ?? 0);
          if (dealt > 0) damaged.ok = true;
        }
      } else if (effect.kind === "heal") {
        const gain = Math.floor(atkOf(unit) * effect.atkMult);
        unit.hp = Math.min(unit.side.maxHp, unit.hp + gain);
        if (trace && gain > 0) pending.push({ from: unit === ally ? "ally" : "foe", amount: gain, crit: false, type: unit.side.type, band: "neutral", ko: false, kind: "heal" });
      } else if (effect.kind === "shield") {
        giveShield(unit, unit.side.maxHp * effect.maxHpPctOfCaster, effect.duration);
      } else if (effect.kind === "cleanse") {
        unit.statuses = unit.statuses.filter((status) => !NEGATIVE.includes(status.id));
      } else if (effect.kind === "status") {
        const own = effect.target ? ALLY_TARGET.has(effect.target) : allyTarget;
        const victim = own ? unit : other;
        if (hadDamage && !own && !damaged.ok) continue;
        if (victim.hp <= 0) continue;
        if (rng() >= effect.chance) continue;
        const durMul = unit === ally ? mods?.statusDur ?? 1 : mods?.foeStatusDur ?? 1;
        applyStatus(victim, effect, unit, durMul === 1 ? effect.duration : effect.duration * durMul);
        if (trace) pending.push({ from: unit === ally ? "ally" : "foe", amount: 0, crit: false, type: unit.side.type, band: "neutral", ko: false, kind: "status" });
      }
    }
    const cdMul = unit === ally ? mods?.cooldown ?? 1 : mods?.foeCooldown ?? 1;
    unit.cd = cdMul === 1 || skill.cooldown <= 0 ? skill.cooldown : Math.max(1, Math.floor(skill.cooldown * cdMul));
    push(`${unit.side.name} setzt ${skill.name ?? "eine F\xE4higkeit"} ein.`);
    if (hadDamage) noteBossAttack(unit, other);
  };
  const castUlt = (unit, other) => {
    const pattern = ultPattern(unit.side.speciesId);
    unit.ultCharge = 0;
    if (pattern === "durchschlag") {
      if (other.hp > 0) strike(unit, other, ULT_DAMAGE, ULT_PIERCE, pattern);
    } else if (pattern === "schildwall") {
      unit.wallLeft = wallActions(1);
      unit.wallFresh = true;
      if (trace) pending.push({ from: unit === ally ? "ally" : "foe", amount: 0, crit: false, type: unit.side.type, band: "neutral", ko: false, kind: "status", ult: pattern });
    } else if (pattern === "impuls") {
      unit.impulseLeft = ULT_IMPULSE_ATTACKS;
      if (trace) pending.push({ from: unit === ally ? "ally" : "foe", amount: 0, crit: false, type: unit.side.type, band: "neutral", ko: false, kind: "status", ult: pattern });
    } else if (pattern === "fessel") {
      const lands = !other.side.boss || rng() < ULT_BOSS_FETTER;
      if (lands && other.hp > 0) other.skip = true;
      if (trace) pending.push({ from: unit === ally ? "ally" : "foe", amount: 0, crit: false, type: unit.side.type, band: "neutral", ko: false, kind: "status", ult: pattern });
    } else {
      const gain = Math.floor(unit.side.maxHp * ULT_HEAL);
      unit.hp = Math.min(unit.side.maxHp, unit.hp + gain);
      if (trace && gain > 0) pending.push({ from: unit === ally ? "ally" : "foe", amount: gain, crit: false, type: unit.side.type, band: "neutral", ko: false, kind: "heal", ult: pattern });
    }
    offer(unit, other, "ult");
    tickMark(unit, true);
    if (unit.struck) unit.opening = false;
    push(`${unit.side.name} setzt ${ultName(pattern)} ein.`);
    if (pattern === "durchschlag") noteBossAttack(unit, other);
  };
  const act = (unit, other) => {
    if (unit.hp <= 0 || other.hp <= 0) return;
    if (unit.mark?.id === "frost" && rng() < AILMENTS.frost.skip) {
      tickMark(unit, false);
      push(`${unit.side.name} z\xF6gert.`);
      return;
    }
    if (unit.skip) {
      unit.skip = false;
      tick(unit);
      push(`${unit.side.name} ist gefesselt.`);
      return;
    }
    const burn = unit.statuses.find((status) => status.id === "burn");
    if (burn) hurt(unit, Math.max(0, Math.floor(burn.burnDmg * weatherFactor(weather, burn.sourceType ?? unit.side.type))), true);
    if (unit.hp <= 0) {
      push(`${unit.side.name} geht k.o.`);
      return;
    }
    const poison = unit.statuses.find((status) => status.id === "poison");
    if (poison) hurt(unit, Math.floor(unit.side.maxHp * 0.04 * poison.stacks * weatherFactor(weather, poison.sourceType ?? unit.side.type)), true);
    if (unit.hp <= 0) {
      push(`${unit.side.name} geht k.o.`);
      return;
    }
    if (unit.statuses.some((status) => status.id === "stun")) {
      unit.statuses = unit.statuses.filter((status) => status.id !== "stun");
      tick(unit);
      push(`${unit.side.name} ist benommen.`);
      return;
    }
    const foeHp = other.hp;
    if (ultReady(unit.side.level ?? 0, unit.ultCharge)) castUlt(unit, other);
    else {
      const pace = 1 + (unit.side.anchor ? ANCHOR_ULT : 0);
      unit.ultCharge = gainUlt(unit.side.level ?? 0, unit.ultCharge, pace);
      if (unit.cd <= 0 && skillUsable(unit, other)) {
        cast(unit, other);
        if (unit.side.skill.effects.some((effect) => effect.kind === "damage")) offer(unit, other, "skill");
      } else {
        if (other.hp > 0 && unit.hp > 0) {
          strike(unit, other, 1, 0);
          offer(unit, other, "strike");
        }
        if (unit.cd > 0) unit.cd -= 1;
        push(`${unit.side.name} greift an.`);
        noteBossAttack(unit, other);
      }
      tickMark(unit, true);
      if (unit.struck) unit.opening = false;
    }
    if (foeHp > 0 && other.hp <= 0) unit.ultCharge = gainUlt(unit.side.level ?? 0, unit.ultCharge, 2);
    if (unit.hp > 0) tick(unit);
  };
  const ageWall = (unit) => {
    if (unit.wallFresh) unit.wallFresh = false;
    else if (unit.wallLeft > 0) unit.wallLeft -= 1;
  };
  const close = (() => {
    const fast = Math.max(ally.side.spd, foe.side.spd);
    const slow = Math.min(ally.side.spd, foe.side.spd);
    return !(fast > 0) || (fast - slow) / fast < 0.05;
  })();
  const allyFirst = allyStrikesFirst(ally.side.spd, foe.side.spd, close ? rng() : 1);
  let actions = 0;
  let timeout = false;
  const actionCap = Math.max(1, Math.min(120, mods?.actionCap ?? ACTION_LIMIT));
  while (actions < actionCap && ally.hp > 0 && foe.hp > 0) {
    const turn = actions % 2 === 0 ? allyFirst ? ally : foe : allyFirst ? foe : ally;
    const other = turn === ally ? foe : ally;
    act(turn, other);
    ageWall(ally);
    ageWall(foe);
    actions += 1;
  }
  if (ally.hp > 0 && foe.hp > 0) timeout = true;
  const allyPct = ally.hp / ally.side.maxHp;
  const foePct = foe.hp / foe.side.maxHp;
  const win = ally.hp > 0 && (foe.hp <= 0 || allyPct > foePct || timeout && allyPct === foePct);
  if (timeout) push(win ? "Die Kraft reicht. Sieg." : "Die Kraft reicht nicht.");
  return {
    allySpecies: ally.side.speciesId,
    foeSpecies: foe.side.speciesId,
    allyName: ally.side.name,
    foeName: foe.side.name,
    allyMax: ally.side.maxHp,
    foeMax: foe.side.maxHp,
    frames,
    win,
    foeKo: foe.hp <= 0,
    allyKo: ally.hp <= 0,
    timeout,
    allyHp: Math.max(0, ally.hp),
    foeHp: Math.max(0, foe.hp),
    counter: Boolean(allySide.counter),
    mechs: foeSide.mechs?.length ? [...foeSide.mechs] : void 0
  };
}

// src/adventure/synergyIds.ts
var SYNERGY_IDS = [
  "gewitter",
  "flaechenbrand",
  "wurzelgrund",
  "polarstrom",
  "bollwerk",
  "prisma",
  "zwielicht",
  "rudelkraft",
  "schwarmgift",
  "resonanz",
  "glutschwinge",
  "sturmlied"
];
var SYNERGY_CAP = 2;
var KNOWN = new Set(SYNERGY_IDS);

// src/adventure/synergy.ts
var PURITY_THREE = 0.02;
var PURITY_FOUR = 0.0165;
var SYNERGY_STAT_CAP = 0.06;
var ROWS = [
  { id: "gewitter", name: "Gewitter", types: ["water", "lightning"], bonus: { crit: 0.194, atk: 0.013 }, power: 124 },
  { id: "flaechenbrand", name: "Fl\xE4chenbrand", types: ["fire", "wind"], bonus: { atk: 0.0139 }, power: 129 },
  { id: "wurzelgrund", name: "Wurzelgrund", types: ["plant", "earth"], bonus: { hp: 0.022 }, power: 125 },
  { id: "polarstrom", name: "Polarstrom", types: ["ice", "water"], bonus: { hp: 0.019, def: 0.0125 }, power: 125 },
  { id: "bollwerk", name: "Bollwerk", types: ["stone", "metal"], bonus: { def: 0.06 }, power: 123 },
  { id: "prisma", name: "Prisma", types: ["light", "crystal"], bonus: { atk: 0.0105, crit: 0.0354 }, power: 124 },
  { id: "zwielicht", name: "Zwielicht", types: ["shadow", "ghost"], bonus: { dodge: 0.035 }, power: 124 },
  { id: "rudelkraft", name: "Rudelkraft", types: ["fighting", "beast"], bonus: { wardenAtk: 0.0168 }, power: 129 },
  { id: "schwarmgift", name: "Schwarmgift", types: ["poison", "insect"], bonus: { status: 1.15 }, power: 119 },
  { id: "resonanz", name: "Resonanz", types: ["psychic", "sound"], bonus: { cooldown: 0.92 }, power: 119 },
  { id: "glutschwinge", name: "Glutschwinge", types: ["dragon", "fire"], bonus: { atk: 0.011, hp: 0.011 }, power: 126 },
  { id: "sturmlied", name: "Sturmlied", types: ["wind", "sound"], bonus: { dodge: 0.03 }, power: 124 }
];
var SYNERGIES = ROWS.map((row, order) => ({
  ...row,
  order
}));
function presentSynergies(types) {
  const have = new Set(types);
  return SYNERGIES.filter((row) => have.has(row.types[0]) && have.has(row.types[1]));
}
function activeSynergies(types, picked) {
  const present = presentSynergies(types);
  if (picked == null) {
    return [...present].sort((a, b) => b.power - a.power || a.order - b.order).slice(0, SYNERGY_CAP);
  }
  const byId = new Map(present.map((row) => [row.id, row]));
  const out = [];
  for (const id of picked) {
    const row = byId.get(id);
    if (!row || out.includes(row)) continue;
    out.push(row);
    if (out.length >= SYNERGY_CAP) break;
  }
  return out;
}
function purityOf(types, type) {
  let count = 0;
  for (const row of types) if (row === type) count += 1;
  if (count >= 4) return PURITY_FOUR;
  if (count >= 3) return PURITY_THREE;
  return 0;
}
function synergyMods(active, warden) {
  const mods = {
    atk: 0,
    hp: 0,
    def: 0,
    spd: 0,
    wardenAtk: 0,
    foeSpd: 1,
    critAdd: 0,
    dodge: 0,
    statusDur: 1,
    cooldown: 1
  };
  for (const row of active) {
    const bonus = row.bonus;
    mods.atk += bonus.atk ?? 0;
    mods.hp += bonus.hp ?? 0;
    mods.def += bonus.def ?? 0;
    mods.spd += bonus.spd ?? 0;
    if (warden) mods.wardenAtk += bonus.wardenAtk ?? 0;
    if (bonus.foeSpd) mods.foeSpd *= bonus.foeSpd;
    mods.critAdd += combat.critChance * (bonus.crit ?? 0);
    mods.dodge += bonus.dodge ?? 0;
    if (bonus.status) mods.statusDur *= bonus.status;
    if (bonus.cooldown) mods.cooldown *= bonus.cooldown;
  }
  mods.hp = Math.min(SYNERGY_STAT_CAP, mods.hp);
  mods.def = Math.min(SYNERGY_STAT_CAP, mods.def);
  mods.spd = Math.min(SYNERGY_STAT_CAP, mods.spd);
  mods.atk = Math.min(SYNERGY_STAT_CAP, mods.atk);
  mods.wardenAtk = Math.min(Math.max(0, SYNERGY_STAT_CAP - mods.atk), mods.wardenAtk);
  return mods;
}
function scaleSide(side, mods, purity = 0) {
  const hp = 1 + Math.min(SYNERGY_STAT_CAP, mods.hp + purity);
  const atk = 1 + Math.min(SYNERGY_STAT_CAP, mods.atk + mods.wardenAtk);
  const def = 1 + Math.min(SYNERGY_STAT_CAP, mods.def + purity);
  const spd = 1 + Math.min(SYNERGY_STAT_CAP, mods.spd);
  if (hp === 1 && atk === 1 && def === 1 && spd === 1) return side;
  const maxHp = Math.max(1, Math.round(side.maxHp * hp));
  const fraction = side.maxHp > 0 ? side.hp / side.maxHp : 1;
  return {
    ...side,
    maxHp,
    hp: side.hp <= 0 ? 0 : Math.max(1, Math.round(maxHp * fraction)),
    atk: Math.max(1, Math.round(side.atk * atk)),
    def: Math.max(1, Math.round(side.def * def)),
    spd: Math.max(1, Math.round(side.spd * spd))
  };
}

// src/adventure/online/ranks.ts
var BERLIN = "Europe/Berlin";
function berlinParts(date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: BERLIN,
    hourCycle: "h23",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit"
  });
  const bag = {};
  for (const part of fmt.formatToParts(date)) bag[part.type] = part.value;
  const days = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour),
    weekday: days[bag.weekday] ?? 1
  };
}
function offsetMs(date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: BERLIN,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
  const bag = {};
  for (const part of fmt.formatToParts(date)) bag[part.type] = part.value;
  const asUtc = Date.UTC(Number(bag.year), Number(bag.month) - 1, Number(bag.day), Number(bag.hour), Number(bag.minute), Number(bag.second));
  return asUtc - date.getTime();
}
function berlinWall(year, month, day, hour) {
  const utc = new Date(Date.UTC(year, month - 1, day, hour, 0, 0));
  const first = new Date(utc.getTime() - offsetMs(utc));
  return new Date(utc.getTime() - offsetMs(first));
}
function boardWeek(now) {
  const local = berlinParts(now);
  let back = (local.weekday + 6) % 7;
  if (local.weekday === 1 && local.hour < 4) back = 7;
  return berlinWall(local.year, local.month, local.day - back, 4);
}

// src/adventure/tree.ts
var NODE_COSTS = [1, 2, 3, 4, 5, 6, 7, 9];
var CHEST_SHINY_BASE = 1 / 200;
var HOUR_MS = 60 * 60 * 1e3;
var TREE_CAP_MAX_MS = 12 * HOUR_MS;
var CHEST = [
  ["Splitter I", "Shards I", "Splitter aus wilden K\xE4mpfen +10 %.", "Wild-fight shards +10%."],
  ["Splitter II", "Shards II", "Splitter aus wilden K\xE4mpfen +20 %.", "Wild-fight shards +20%."],
  ["Splitter III", "Shards III", "Splitter aus wilden K\xE4mpfen +30 %.", "Wild-fight shards +30%."],
  ["Schimmer I", "Shimmer I", "Schimmerchance aus Truhen +10 %, auf 1/200 gerechnet. Steht in den Truhen-Chancen.", "Chest shimmer +10% on a 1/200 base. Shown with the chest rates."],
  ["Schimmer II", "Shimmer II", "Schimmerchance aus Truhen +20 %.", "Chest shimmer +20%."],
  ["Doppelspur", "Duplicate trace", "Duplikate aus Truhen geben 25 % mehr Meisterschafts-EP.", "Chest duplicates grant 25% more mastery EP."],
  ["K\xFCrzerer Weg", "Shorter road", "Wegtruhen brauchen 10 % weniger Zeit.", "Road chests need 10% less time."],
  ["Siegelmeister", "Seal master", "Einmal am Tag eine zweite Ziehung, wenn die Truhe Seltenheit 6 oder h\xF6her trifft. Die bessere Ziehung bleibt.", "Once a day, a second draw when a chest hits rarity 6 or higher. The better draw stays."]
];
var FIGHT = [
  ["Schlag I", "Strike I", "ATK +3 % in jedem Kampf.", "ATK +3% in every fight."],
  ["Schlag II", "Strike II", "ATK +6 %.", "ATK +6%."],
  ["Schlag III", "Strike III", "ATK +10 %.", "ATK +10%."],
  ["Krit I", "Crit I", "Kritische Treffer +2 Prozentpunkte.", "Critical hits +2 percentage points."],
  ["Krit II", "Crit II", "Kritische Treffer +5 Prozentpunkte.", "Critical hits +5 percentage points."],
  ["Typvorteil", "Type edge", "Typvorteil steigt von 1,5 auf 1,6.", "Type advantage rises from 1.5 to 1.6."],
  ["W\xE4chterhaut", "Warden hide", "Im W\xE4chter- und Ratskampf hat das eigene Team +10 % HP.", "In warden and council fights the team has +10% HP."],
  ["Letzter Atem", "Last breath", "Einmal je W\xE4chter- oder Ratskampf \xFCberlebt ein Monster mit 1 HP.", "Once each warden or council fight, a monster survives at 1 HP."]
];
var TIME = [
  ["Stunde I", "Hour I", "Offline-Deckel +1 Stunde, auf 9 Stunden.", "Offline cap +1 hour, to 9 hours."],
  ["Stunde II", "Hour II", "Offline-Deckel +4 Stunden, auf 12 Stunden.", "Offline cap +4 hours, to 12 hours."],
  ["Nachklang I", "Echo I", "Offline-EP von \xD70,5 auf \xD70,6.", "Offline EP from \xD70.5 to \xD70.6."],
  ["Nachklang II", "Echo II", "Offline-EP auf \xD70,7.", "Offline EP to \xD70.7."],
  ["M\xFCnze I", "Coin I", "Gold aus K\xE4mpfen und Funden +5 %.", "Gold from fights and finds +5%."],
  ["M\xFCnze II", "Coin II", "Gold aus K\xE4mpfen und Funden +10 %.", "Gold from fights and finds +10%."],
  ["Expedition", "Expedition", "Ein weiterer Expeditionsslot, zus\xE4tzlich zu den drei festen.", "One more expedition slot, on top of the three fixed ones."],
  ["Zeitweber", "Time weaver", "Fr\xFCchte halten 90 statt 60 Minuten.", "Fruits last 90 minutes instead of 60."]
];
function column(branch, rows) {
  return rows.map((row, index) => ({
    id: `${branch}-${index + 1}`,
    branch,
    index,
    cost: NODE_COSTS[index],
    nameDe: row[0],
    nameEn: row[1],
    textDe: row[2],
    textEn: row[3]
  }));
}
var TREE_NODES = [
  ...column("chest", CHEST),
  ...column("fight", FIGHT),
  ...column("time", TIME)
];
var BY_ID = new Map(TREE_NODES.map((node) => [node.id, node]));
function branchNodes(branch) {
  return TREE_NODES.filter((node) => node.branch === branch);
}
function owned(save) {
  return new Set(save.tree?.nodes ?? []);
}
function rank(save, branch) {
  const set = owned(save);
  let have = 0;
  for (const node of branchNodes(branch)) {
    if (!set.has(node.id)) break;
    have += 1;
  }
  return have;
}
function treeAtkBonus(save) {
  const have = rank(save, "fight");
  if (have >= 3) return 0.1;
  if (have >= 2) return 0.06;
  if (have >= 1) return 0.03;
  return 0;
}
function treeCritAdd(save) {
  const have = rank(save, "fight");
  if (have >= 5) return 0.05;
  if (have >= 4) return 0.02;
  return 0;
}
function treeStrongType(save) {
  return rank(save, "fight") >= 6 ? 1.6 : 1.5;
}
function treeGuardHp(save) {
  return rank(save, "fight") >= 7 ? 0.1 : 0;
}
function treeLastBreath(save) {
  return rank(save, "fight") >= 8;
}

// src/adventure/arena.ts
var ATTACK_REGEN_MS = 4 * 60 * 60 * 1e3;
var ARENA_LEVEL = 100;
var SEASON_ANCHOR = Date.parse("2026-11-16T03:00:00.000Z");
function crestCount(badges) {
  return new Set(badges.filter((badge) => !badge.includes("Ratsiegel"))).size;
}
function blankFighter(speciesId, shiny, stars, masteryRank, uid) {
  const sp = species(speciesId);
  const stats = monStats({
    species: speciesId,
    lvl: ARENA_LEVEL,
    exp: 0,
    hp: null,
    shiny,
    caughtAt: 0,
    caughtWhere: "arena",
    keepDupes: false,
    stars
  }, ARENA_LEVEL, masteryRank);
  return {
    uid,
    speciesId,
    name: sp.name,
    type: sp.type,
    skill: sp.skill,
    passive: sp.passive ?? null,
    maxHp: stats.hp,
    atk: stats.atk,
    def: stats.def,
    spd: stats.spd,
    shiny
  };
}
function bakeTeam(fighters, save) {
  const hp = 1 + (save ? treeGuardHp(save) : 0);
  const atk = 1 + (save ? treeAtkBonus(save) : 0);
  return {
    fighters: fighters.map((fighter) => ({
      ...fighter,
      maxHp: Math.max(1, Math.round(fighter.maxHp * hp)),
      atk: Math.max(1, Math.round(fighter.atk * atk))
    })),
    critAdd: save ? treeCritAdd(save) : 0,
    strongType: save ? treeStrongType(save) : 1.5,
    breath: save ? treeLastBreath(save) : false,
    synergy: save?.synergy == null ? null : save.synergy.slice(0, 2)
  };
}
function teamFromRegister(rows, save) {
  if (rows.length !== 6) return null;
  const fighters = rows.map((row) => blankFighter(
    row.species,
    row.schimmer,
    save.stars?.[row.species] ?? 0,
    masteryLevel(save.mastery?.[row.species] ?? 0),
    row.uid
  ));
  return bakeTeam(fighters, save);
}

// src/adventure/coop.ts
var COOP_ACTIONS = 60;
var COOP_ATTEMPTS = 3;
var GROUP_MAX = 4;
var WEEK_ATTEMPTS = COOP_ATTEMPTS * 7 * GROUP_MAX;
var BEASTS = [
  { id: "weltenwurm", name: "Weltenwurm", type: "earth", egg: "m18" },
  { id: "himmelswal", name: "Himmelswal", type: "wind", egg: "m24" }
];
function weeklyBeast(now) {
  const week = boardWeek(now).getTime();
  const beast = BEASTS[Math.floor(week / (7 * 24 * 60 * 60 * 1e3)) % BEASTS.length];
  return { ...beast, week };
}
function sideFrom(fighter) {
  return {
    speciesId: fighter.speciesId,
    name: fighter.name,
    type: fighter.type,
    maxHp: fighter.maxHp,
    hp: fighter.maxHp,
    atk: fighter.atk,
    def: fighter.def,
    spd: fighter.spd,
    skill: fighter.skill,
    passive: fighter.passive,
    level: 100
  };
}
function coopDamage(fighters, beastType, seed, picked) {
  if (!fighters.length) return 0;
  const rng = mulberry32(seed >>> 0 || 1);
  const each = Math.max(1, Math.floor(COOP_ACTIONS / fighters.length));
  const types = fighters.map((fighter) => fighter.type);
  const mods = synergyMods(activeSynergies(types, picked ?? null), false);
  let total = 0;
  for (const fighter of fighters) {
    const foe = {
      speciesId: "beast",
      name: "Weltenbiest",
      type: beastType,
      maxHp: 5e6,
      hp: 5e6,
      atk: 30,
      def: 140,
      spd: 1,
      skill: fighter.skill,
      passive: null,
      level: 100
    };
    const trace = fight1v1(scaleSide(sideFrom(fighter), mods, purityOf(types, fighter.type)), foe, rng, false, null, {
      actionCap: each,
      critAdd: mods.critAdd,
      dodge: mods.dodge,
      statusDur: mods.statusDur,
      cooldown: mods.cooldown,
      foeSpd: mods.foeSpd
    });
    total += Math.max(0, trace.foeMax - trace.foeHp);
  }
  return total;
}

// src/adventure/online/name.ts
var NAME_MIN = 3;
var NAME_MAX = 16;
var NAME_CHANGE_MS = 7 * 24 * 60 * 60 * 1e3;
var BLOCKED = [
  "arsch",
  "fotze",
  "hurensohn",
  "missgeburt",
  "nazi",
  "neger",
  "nigger",
  "faggot",
  "fuck",
  "fuk",
  "fack",
  "shit",
  "bitch",
  "cunt",
  "retard",
  "whore",
  "hitler"
];
var ALLOWED = /* @__PURE__ */ new Set([
  "barsch",
  "marschall",
  "scunthorpe",
  "shitake",
  "harsch",
  "marsch",
  "fackel",
  "nazim",
  "fukuda",
  "yamashita"
]);
var LEET = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  "$": "s"
};
var HOMO = {
  "\u0430": "a",
  "\u0410": "a",
  "\u0435": "e",
  "\u0415": "e",
  "\u043E": "o",
  "\u041E": "o",
  "\u0440": "p",
  "\u0420": "p",
  "\u0441": "c",
  "\u0421": "c",
  "\u0443": "y",
  "\u0423": "y",
  "\u0445": "x",
  "\u0425": "x",
  "\u0456": "i",
  "\u0406": "i",
  "\u0455": "s",
  "\u0405": "s",
  "\u03BF": "o",
  "\u039F": "o",
  "\u03BD": "v"
};
function nameLetters(raw) {
  const lower = raw.toLowerCase().normalize("NFKD").replace(/\p{M}/gu, "");
  const swapped = [...lower].map((ch) => HOMO[ch] ?? LEET[ch] ?? ch).join("").replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss").replace(/ph/g, "f").replace(/v/g, "u");
  return swapped.replace(/[^a-z]/g, "");
}
function collapseRepeats(letters, keep) {
  return letters.replace(/(.)\1+/g, (run, ch) => ch.repeat(Math.min(keep, run.length)));
}
function bannedWord(raw) {
  const letters = nameLetters(raw);
  const forms = [collapseRepeats(letters, 2), collapseRepeats(letters, 1)];
  if (forms.some((form) => ALLOWED.has(form))) return false;
  return forms.some((form) => BLOCKED.some((word) => form.includes(word)));
}
function nameIssue(raw, max = NAME_MAX) {
  const name = raw.trim();
  if (name.length < NAME_MIN) return "short";
  if (name.length > max) return "long";
  if (!/^[\p{L}\p{N} ]+$/u.test(name)) return "chars";
  if (bannedWord(name)) return "word";
  return null;
}

// src/adventure/guild.ts
var FOUND_GOLD = 5e4;
var GUILD_LEVELS = [0, 200, 500, 900, 1400, 2e3, 2800, 3800, 5e3, 6500];
var GOALS = [
  { id: "chests", target: 300 },
  { id: "arena", target: 30 },
  { id: "beast", target: 6 },
  { id: "expedition", target: 50 }
];
var PHRASES = [
  "hallo",
  "danke",
  "los",
  "pause",
  "stark",
  "hilfe",
  "geschafft",
  "nochmal",
  "truhe",
  "arena",
  "biest",
  "expedition",
  "heute",
  "morgen",
  "bereit",
  "warte",
  "gut",
  "knapp",
  "feier",
  "ruhe",
  "fokus",
  "team",
  "wappen",
  "nacht",
  "welle",
  "stern",
  "blatt",
  "flamme",
  "ja",
  "nein"
];
function foundCost(region) {
  return FOUND_GOLD * Math.max(1, Math.min(5, Math.floor(region) || 1));
}
function guildNameIssue(raw) {
  return nameIssue(raw, 20);
}
function guildTagIssue(raw) {
  const tag = raw.trim().toUpperCase();
  if (tag.length !== 3) return "short";
  if (!/^[A-Z]{3}$/.test(tag)) return "chars";
  if (bannedWord(tag)) return "word";
  return null;
}
function guildTextIssue(raw) {
  const text = raw.trim();
  if (text.length > 80) return "long";
  if (text && bannedWord(text)) return "word";
  return null;
}
function weekGoals(now) {
  const week = boardWeek(now).toISOString();
  const rng = mulberry32(hashSeed(`velunor-guild-${week}`) || 1);
  const ids = GOALS.map((goal) => goal.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const swap = ids[i];
    ids[i] = ids[j];
    ids[j] = swap;
  }
  return ids.slice(0, 3);
}
function guildLevel(points) {
  let level = 1;
  for (let i = 0; i < GUILD_LEVELS.length; i++) {
    if (points >= GUILD_LEVELS[i]) level = i + 1;
  }
  return level;
}
function phraseOk(id) {
  return PHRASES.includes(id);
}

// supabase/functions/guild/index.ts
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const user = await caller(req);
  if (!user) return json({ error: "auth" }, 401);
  let body = {};
  try {
    const parsed = await req.json();
    if (parsed && typeof parsed === "object") body = parsed;
  } catch {
    body = {};
  }
  const action = typeof body.action === "string" ? body.action : "state";
  const db = admin();
  const profile = await db.from("profiles").select("flag_level, last_audit").eq("user_id", user.id).maybeSingle();
  if (profile.data?.flag_level === 2 && action !== "state" && action !== "leave") return json({ error: "flag" }, 403);
  const badges = Array.isArray(profile.data?.last_audit?.badges) ? profile.data?.last_audit?.badges : [];
  const saved = await db.from("saves").select("save_json").eq("user_id", user.id).maybeSingle();
  const adventure = saved.data?.save_json ?? null;
  if (action === "found") {
    const name = String(body.name ?? "");
    const tag = String(body.tag ?? "").toUpperCase();
    const description = String(body.description ?? "");
    if (guildNameIssue(name) || guildTagIssue(tag) || guildTextIssue(description)) return json({ error: "name" }, 400);
    if (crestCount(badges) < 8) return json({ error: "crests" }, 403);
    const region = Math.max(1, Math.floor(Number(adventure?.region)) || 1);
    const cost = foundCost(region);
    if ((adventure?.gold ?? 0) < cost) return json({ error: "gold" }, 400);
    const code = Math.random().toString(36).slice(2, 10).toUpperCase().replace(/[^A-Z0-9]/g, "A").padEnd(8, "A").slice(0, 8);
    const created = await db.rpc("guild_act", {
      p_user: user.id,
      p_body: { action: "found", name, tag, description, code, join: "request", shape: "shield", symbol: "leaf", color: "moss" }
    });
    return json({ ...created.data ?? { error: "found" }, cost });
  }
  if (action === "beast") {
    const uids = Array.isArray(body.uids) ? body.uids.filter((id) => typeof id === "string") : [];
    const owned2 = await db.from("monsters_owned").select("uid, species, schimmer").eq("owner", user.id);
    const byUid = new Map((owned2.data ?? []).map((mon) => [mon.uid, mon]));
    const rows = uids.map((uid) => byUid.get(uid)).filter((mon) => Boolean(mon));
    if (!adventure || rows.length !== 6) return json({ error: "team" }, 400);
    const team = teamFromRegister(rows, adventure);
    if (!team) return json({ error: "team" }, 400);
    const beast = weeklyBeast(/* @__PURE__ */ new Date());
    const damage = coopDamage(team.fighters, beast.type, Date.now() >>> 0 || 1, team.synergy);
    const hit = await db.rpc("guild_act", { p_user: user.id, p_body: { action: "beast", damage } });
    return json({ ...hit.data ?? {}, damage });
  }
  if (action === "phrase" && !phraseOk(String(body.phrase ?? ""))) return json({ error: "phrase" }, 400);
  if (action === "sync" || action === "state") {
    await db.rpc("guild_act", { p_user: user.id, p_body: { action: "sync", goals: weekGoals(/* @__PURE__ */ new Date()) } });
  }
  if (action === "sync") return json({ ok: true });
  if (action === "state") {
    const member = await db.from("guild_members").select("guild_id, role, contrib").eq("user_id", user.id).maybeSingle();
    if (!member.data) return json({ status: "ready", guild: null });
    const guild = await db.from("guilds").select("name, tag, points, week_points, shape, symbol, color").eq("id", member.data.guild_id).maybeSingle();
    const goals = await db.from("guild_goals").select("goal, progress, target").eq("guild_id", member.data.guild_id);
    return json({
      status: "ready",
      guild: {
        name: guild.data?.name ?? "",
        tag: guild.data?.tag ?? "",
        points: guild.data?.points ?? 0,
        weekPoints: guild.data?.week_points ?? 0,
        level: guildLevel(Number(guild.data?.points) || 0),
        shape: guild.data?.shape,
        symbol: guild.data?.symbol,
        color: guild.data?.color
      },
      goals: goals.data ?? [],
      contrib: member.data.contrib
    });
  }
  const acted = await db.rpc("guild_act", { p_user: user.id, p_body: { ...body, action } });
  return json(acted.data ?? { error: "guild" });
});
