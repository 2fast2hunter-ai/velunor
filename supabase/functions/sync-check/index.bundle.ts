// src/adventure/const.ts
var START_GOLD = 3e3;
var BASE_ENCOUNTER_MS = 2800;
var OFFLINE_CAP_MS = 8 * 60 * 60 * 1e3;
var WELCOME_AFTER_MS = 5 * 60 * 1e3;
var SHELL_H = 2340;
var SAFE_H = 1920;
var SHELL_BAND = (SHELL_H - SAFE_H) / 2;
var STARTERS = [
  { id: "m01", label: "Funkfuchs" },
  { id: "m02", label: "Tropfmolch" },
  { id: "m03", label: "Knospling" }
];

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
function typeName(id) {
  return typesCfg.names[id];
}

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

// src/adventure/route.ts
var regions = regions_default.regions;

// src/adventure/lootbox.ts
function speciesInRegion(regionId) {
  const region = regions.find((entry) => entry.id === regionId);
  if (!region) return [];
  return collectSpecies(region);
}
function collectSpecies(region) {
  const ids = /* @__PURE__ */ new Set();
  for (const chapter of region.chapters) {
    for (const row2 of chapter.day) ids.add(row2.species);
    for (const row2 of chapter.night) ids.add(row2.species);
    for (const row2 of chapter.weather ?? []) ids.add(row2.species);
    for (const row2 of chapter.guardian.team) ids.add(row2.species);
    for (const member of chapter.council?.members ?? []) {
      for (const row2 of member.team) ids.add(row2.species);
    }
  }
  return [...ids].sort();
}
function enteredRegions(save) {
  const open = new Set(save.regionsOpen ?? []);
  const ids = /* @__PURE__ */ new Set([1]);
  for (const id of save.regionsEntered ?? []) if (id === 1 || open.has(id)) ids.add(id);
  if (open.has(save.region)) ids.add(save.region);
  return [...ids].sort((a, b) => a - b);
}
function poolFor(unlockedRegions) {
  const ids = /* @__PURE__ */ new Set();
  for (const regionId of unlockedRegions) {
    for (const id of speciesInRegion(regionId)) ids.add(id);
  }
  return [...ids].sort();
}

// src/adventure/mastery.ts
var MASTERY_STEPS = [1e3, 3e3, 8e3, 18e3, 35e3];
function masteryLevel(ep) {
  const points = Math.max(0, Math.floor(ep) || 0);
  let level2 = 0;
  for (const step of MASTERY_STEPS) if (points >= step) level2 += 1;
  return level2;
}

// src/adventure/stats.ts
var EXP_FACTOR = 12;
var EXP_EXPONENT = 2.45;
function expToNext(level2) {
  return Math.round(EXP_FACTOR * Math.pow(level2, EXP_EXPONENT));
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
var KNOWN = new Set(SYNERGY_IDS);

// src/adventure/synergy.ts
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
var SYNERGIES = ROWS.map((row2, order) => ({
  ...row2,
  order
}));

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
  return rows.map((row2, index) => ({
    id: `${branch}-${index + 1}`,
    branch,
    index,
    cost: NODE_COSTS[index],
    nameDe: row2[0],
    nameEn: row2[1],
    textDe: row2[2],
    textEn: row2[3]
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
function treeCapMs(save) {
  const have = rank(save, "time");
  const hours = have >= 2 ? 12 : have >= 1 ? 9 : 8;
  return Math.min(TREE_CAP_MAX_MS, hours * HOUR_MS);
}
function treeGoldMult(save) {
  const have = rank(save, "time");
  if (have >= 6) return 1.1;
  if (have >= 5) return 1.05;
  return 1;
}
function treeAudit(save) {
  return {
    treeGold: treeGoldMult(save),
    treeCapMs: Math.max(OFFLINE_CAP_MS, treeCapMs(save))
  };
}

// src/adventure/arena.ts
var ATTACK_REGEN_MS = 4 * 60 * 60 * 1e3;
var SEASON_ANCHOR = Date.parse("2026-11-16T03:00:00.000Z");
function berlinParts(date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit"
  });
  const bag = {};
  for (const part of fmt.formatToParts(date)) bag[part.type] = part.value;
  return { year: Number(bag.year), month: Number(bag.month), day: Number(bag.day), hour: Number(bag.hour) };
}
function offsetMs(date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Berlin",
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
function lastDailyReset(now) {
  const local = berlinParts(now);
  const back = local.hour < 4 ? 1 : 0;
  return berlinWall(local.year, local.month, local.day - back, 4);
}
function arenaDayKey(now) {
  return lastDailyReset(now).toISOString();
}

// src/adventure/daily.ts
var DAILY_MARK_CAP = 15;
var DAILY_GOLD_CAP = 3e3;

// src/adventure/research.ts
var RESEARCH_LINES = ["gold", "ep", "offline", "expedition", "egg", "shard"];
var RESEARCH_MAX = 10;
function researchCost(level2) {
  const step = Math.max(1, Math.min(RESEARCH_MAX, Math.floor(level2)));
  return Math.round(2e4 * 1.8 ** (step - 1));
}
function researchDurationMs(level2) {
  const step = Math.max(1, Math.min(RESEARCH_MAX, Math.floor(level2)));
  return Math.round(30 * 60 * 1e3 * 1.6 ** (step - 1));
}
function researchRank(save, line) {
  const n = Math.floor(Number(save.research?.ranks?.[line]));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(RESEARCH_MAX, n));
}
function researchGoldMult(save) {
  return 1 + 0.03 * researchRank(save, "gold");
}
function researchEpMult(save) {
  return 1 + 0.03 * researchRank(save, "ep");
}
function researchLootMult(save) {
  return 1 + 0.04 * researchRank(save, "expedition");
}
function researchShardYield(save) {
  return 1 + 0.03 * researchRank(save, "shard");
}
function offlineCapMs(save) {
  const bonus = researchRank(save, "offline") * 15 * 60 * 1e3;
  return Math.min(TREE_CAP_MAX_MS, treeCapMs(save) + bonus);
}
var EMPTY_RANKS = [0, 0, 0, 0, 0, 0];
function researchAudit(save) {
  if (!save.research) return { ranks: [...EMPTY_RANKS], job: null };
  const ranks = RESEARCH_LINES.map((line) => {
    const n = Number(save.research?.ranks?.[line]);
    return Number.isFinite(n) ? Math.floor(n) : -1;
  });
  const job = save.research.job;
  if (!job) return { ranks, job: null };
  return {
    ranks,
    job: {
      line: RESEARCH_LINES.indexOf(job.line),
      level: Math.floor(Number(job.level)),
      startedAt: Math.floor(Number(job.startedAt)),
      readyAt: Math.floor(Number(job.readyAt))
    }
  };
}
function researchMsNeeded(before, after, beforeAt) {
  const prev = before?.ranks ?? EMPTY_RANKS;
  const prepaid = before?.job ?? null;
  let needed = 0;
  let used = false;
  for (let line = 0; line < RESEARCH_LINES.length; line++) {
    const from = Number.isFinite(prev[line]) ? prev[line] : 0;
    for (let level2 = from + 1; level2 <= after.ranks[line]; level2++) {
      if (prepaid && !used && prepaid.line === line && prepaid.level === level2) {
        needed += Math.max(0, prepaid.readyAt - beforeAt);
        used = true;
      } else needed += researchDurationMs(level2);
    }
  }
  return needed;
}
function researchSpend(before, after) {
  if (!after) return 0;
  const prev = before?.ranks ?? EMPTY_RANKS;
  const prepaid = before?.job ?? null;
  let spend = 0;
  let used = false;
  for (let line = 0; line < RESEARCH_LINES.length; line++) {
    const from = Number.isFinite(prev[line]) ? prev[line] : 0;
    for (let level2 = from + 1; level2 <= after.ranks[line]; level2++) {
      if (prepaid && !used && prepaid.line === line && prepaid.level === level2) used = true;
      else spend += researchCost(level2);
    }
  }
  const job = after.job;
  const same = Boolean(job && prepaid && job.line === prepaid.line && job.level === prepaid.level && job.startedAt === prepaid.startedAt && job.readyAt === prepaid.readyAt);
  if (job && !same) spend += researchCost(job.level);
  return spend;
}

// src/adventure/dex.ts
function regionRoster(regionId) {
  const region = regions.find((entry) => entry.id === regionId);
  if (!region) return [];
  const ids = /* @__PURE__ */ new Set();
  for (const chapter of region.chapters) {
    if (chapter.council || chapter.special) continue;
    for (const row2 of [...chapter.day, ...chapter.night, ...chapter.weather ?? []]) ids.add(row2.species);
  }
  return [...ids];
}

// src/adventure/achievements.ts
var WAPPEN = [
  ["Kieselwappen", "Kieseltr\xE4ger", "stone"],
  ["Wellenwappen", "Wellenl\xE4ufer", "tide"],
  ["Funkenwappen", "Funkenh\xFCter", "spark"],
  ["Moorwappen", "Moorw\xE4chter", "veil"],
  ["Felswappen", "Felssetzer", "stone"],
  ["Sturmwappen", "Sturmrufer", "night"],
  ["Frostwappen", "Frostmark", "frost"],
  ["Klingenwappen", "Klingentr\xE4ger", "ember"]
];
function caughtCount(save) {
  return Object.values(save.dex).filter((entry) => entry.caught > 0).length;
}
function seenCount(save) {
  return Object.values(save.dex).filter((entry) => entry.seen > 0).length;
}
function regionDone(save, regionId) {
  const roster = regionRoster(regionId);
  return roster.length > 0 && roster.every((id) => (save.dex[id]?.caught ?? 0) > 0);
}
function typeDone(save, type) {
  const all = monsters.filter((mon) => mon.type === type);
  return all.length > 0 && all.every((mon) => (save.dex[mon.id]?.caught ?? 0) > 0);
}
function atLeast(read, need) {
  return (save) => read(save) >= need;
}
var wins = (save) => save.stats.wins;
var catches = (save) => save.stats.catches;
var dupes = (save) => save.stats.dupes;
var eggs = (save) => save.stats.eggs;
var shinies = (save) => save.stats.shinies;
var level = (save) => Math.max(0, ...Object.values(save.mons).map((mon) => mon.lvl));
function row(id, name, title, frame, gold, met) {
  return { id, name, title, frame, gold, met };
}
var typeGoals = Object.keys(typesCfg.names).map((type) => row(
  `type-${type}`,
  `Alle ${typeName(type)}-Arten`,
  `Kenner der ${typeName(type)}`,
  "leaf",
  8e3,
  (save) => typeDone(save, type)
));
var GOALS = [
  row("win-10", "10 Siege", "Wegbereiter", "gold", 500, atLeast(wins, 10)),
  row("win-100", "100 Siege", "Hundertk\xE4mper", "night", 4e3, atLeast(wins, 100)),
  row("win-1000", "1.000 Siege", "Tausendk\xE4mper", "ember", 25e3, atLeast(wins, 1e3)),
  row("catch-10", "10 F\xE4nge", "F\xE4nger", "tide", 500, atLeast(catches, 10)),
  row("catch-100", "100 F\xE4nge", "Bannmeister", "tide", 4e3, atLeast(catches, 100)),
  row("catch-500", "500 F\xE4nge", "Siegelh\xFCter", "gold", 2e4, atLeast(catches, 500)),
  row("dupe-10", "10 Duplikate", "Sammler", "plain", 400, atLeast(dupes, 10)),
  row("dupe-100", "100 Duplikate", "Archivar", "plain", 3e3, atLeast(dupes, 100)),
  row("dupe-1000", "1.000 Duplikate", "H\xFCter der Arten", "gold", 15e3, atLeast(dupes, 1e3)),
  ...WAPPEN.map(([badge, title, frame]) => row(`badge-${badge}`, badge, title, frame, 2e3, (save) => save.badges.includes(badge))),
  row("badge-Ratsiegel", "Ratsiegel", "Ratsmitglied", "gold", 1e4, (save) => save.badges.includes("Ratsiegel")),
  row("region-1", "Gr\xFCnmark komplett", "Markgraf", "leaf", 2e4, (save) => regionDone(save, 1)),
  row("region-2", "Frostk\xFCste komplett", "K\xFCstenw\xE4chter", "frost", 5e4, (save) => regionDone(save, 2)),
  ...regions.filter((region) => !region.placeholder).map((region) => row(
    `master-${region.id}`,
    `Meister der ${region.name}`,
    `Meister der ${region.name}`,
    "gold",
    5e3,
    (save) => regionRoster(region.id).filter((id) => masteryLevel(save.mastery?.[id] ?? 0) >= 5).length >= 5
  )),
  ...typeGoals,
  row("egg-1", "Erstes Ei", "Brutpfleger", "plain", 500, atLeast(eggs, 1)),
  row("egg-10", "10 Eier", "Nester", "leaf", 3e3, atLeast(eggs, 10)),
  row("egg-50", "50 Eier", "Hortmeister", "gold", 15e3, atLeast(eggs, 50)),
  row("shiny-1", "Erster Schimmer", "Glanzsucher", "spark", 2e3, atLeast(shinies, 1)),
  row("shiny-10", "10 Schimmer", "Lichttr\xE4ger", "spark", 25e3, atLeast(shinies, 10)),
  row("level-10", "Ein Monster auf Lv 10", "Lehrling", "plain", 400, atLeast(level, 10)),
  row("level-25", "Ein Monster auf Lv 25", "Erfahrener", "night", 2500, atLeast(level, 25)),
  row("level-50", "Ein Monster auf Lv 50", "Veteran", "ember", 12e3, atLeast(level, 50)),
  row("dex-10", "10 Arten im Kodex", "Kodexanw\xE4rter", "plain", 800, atLeast(caughtCount, 10)),
  row("dex-25", "25 Arten im Kodex", "Kodexschreiber", "leaf", 2500, atLeast(caughtCount, 25)),
  row("dex-50", "50 Arten im Kodex", "Kodexh\xFCter", "night", 8e3, atLeast(caughtCount, 50)),
  row("dex-100", "100 Arten im Kodex", "Kodexmeister", "gold", 4e4, atLeast(caughtCount, 100)),
  row("seen-100", "100 Arten gesichtet", "Sp\xE4her des Kodex", "veil", 1e4, atLeast(seenCount, 100)),
  row("hort-2", "Hortplatz 2", "Hortbauer", "leaf", 1500, (save) => save.hortSlots >= 2),
  row("hort-3", "Hortplatz 3", "Hortvogt", "stone", 8e3, (save) => save.hortSlots >= 3),
  row("hort-4", "Hortplatz 4", "Hortf\xFCrst", "gold", 2e4, (save) => save.hortSlots >= 4),
  row("team-6", "Team aus 6", "Sechserzug", "tide", 1e3, (save) => save.team.length >= 6),
  row("fruit-10", "10 Fr\xFCchte gegessen", "Fruchtkenner", "leaf", 3e3, (save) => save.stats.fruitsUsed >= 10),
  row("crystal-10", "10 Kristalle gegeben", "Kristallhand", "spark", 3e3, (save) => save.stats.crystalsUsed >= 10),
  row("hort-guest", "Ein Monster im Hort", "Hortgast", "plain", 300, (save) => save.hort.length >= 1)
];

// src/adventure/shop.ts
var FRUIT_MS = 60 * 60 * 1e3;
var FRUITS = [
  { id: "fang", name: "Gl\xFCcksfrucht", price: 4e3, effect: "N\xE4chste Truhe: +1 Pp auf Seltenheit ab 5" },
  { id: "goldfang", name: "Goldfangfrucht", price: 15e3, effect: "Wird in Gold erstattet" },
  { id: "spuer", name: "Spurfrucht", price: 8e3, effect: "Spur-Chance +50 %" },
  { id: "neugier", name: "Neugierfrucht", price: 1e4, effect: "Noch nicht erhaltene Arten \xD73" },
  { id: "glanz", name: "Glanzfrucht", price: 25e3, effect: "Schimmer-Chance \xD72" },
  { id: "lern", name: "Lernfrucht", price: 6e3, effect: "Kampf-EP +25 %" },
  { id: "muenz", name: "M\xFCnzfrucht", price: 6e3, effect: "Gold +25 %" }
];
var FRUIT_IDS = FRUITS.map((fruit) => fruit.id);

// src/adventure/expedition.ts
var ROAD_STEPS = 20;
var WILD_STEPS = 13;
var WILD_INTERVAL_MS = 2800;
var WILD_GOLD_PER_LEVEL = 4;
var HOUR_MS2 = 60 * 60 * 1e3;
var EGG_READY_MS = 4 * HOUR_MS2;
var TIER_GOLD = { bronze: 1, silber: 1.25, gold: 1.5 };
function wildGold30(level2) {
  const encounters2 = 30 * 60 * 1e3 / WILD_INTERVAL_MS;
  const wild = encounters2 * (WILD_STEPS / ROAD_STEPS);
  return Math.round(wild * WILD_GOLD_PER_LEVEL * Math.max(1, level2));
}
function expeditionGold(level2, hours, tier) {
  return Math.round(wildGold30(level2) * Math.max(0, hours) * TIER_GOLD[tier]);
}

// src/adventure/online/check.ts
var PLAUSIBILITY_BUFFER = 1.2;
var SPEED3_MS = 930;
var COIN_BONUS = 1.25;
var LEARN_BONUS = 1.25;
var TRAINER_PARTY = 3;
var TRAINER_GOLD_PER_LEVEL = 25;
var START_GOLD2 = 3e3;
var CREST_PACE_MS = 3 * 60 * 1e3;
var CREST_CAP = 45;
var OBTAINED_HOW = ["Truhe", "Splitter", "Ei", "Rad", "Tausch"];
var CREST_ORDER = [
  "Kieselwappen",
  "Wellenwappen",
  "Funkenwappen",
  "Moorwappen",
  "Felswappen",
  "Sturmwappen",
  "Frostwappen",
  "Klingenwappen"
];
function reachLevel(region, chapter) {
  const index = Math.max(1, (Math.max(1, Math.floor(region) || 1) - 1) * 8 + Math.max(1, Math.floor(chapter) || 1));
  return 6 * index;
}
function encounters(elapsedMs) {
  return Math.max(1, Math.ceil(Math.max(0, elapsedMs) / SPEED3_MS));
}
function allowedGold(elapsedMs, region, chapter, goldMult = 1) {
  const level2 = reachLevel(region, chapter);
  const per = TRAINER_GOLD_PER_LEVEL * TRAINER_PARTY * level2 * COIN_BONUS;
  const crest = (1e3 + 750 * level2) * COIN_BONUS;
  const mult = Math.max(1, Math.min(1.1 * 1.3, goldMult));
  return Math.ceil((encounters(elapsedMs) * per + crest) * PLAUSIBILITY_BUFFER * mult);
}
function allowedEp(elapsedMs, region, chapter, epMult = 1) {
  const level2 = reachLevel(region, chapter);
  const base = 8 * level2 * (1 + 0.15 * 9);
  const team = 1 * 1.3 * LEARN_BONUS + 5 * 0.5 * LEARN_BONUS;
  const hort = 4 * 0.3 * LEARN_BONUS;
  const mult = Math.max(1, Math.min(1.3, epMult));
  return Math.ceil(encounters(elapsedMs) * base * (team + hort) * PLAUSIBILITY_BUFFER * mult);
}
function countedOffline(elapsedMs, capMs = OFFLINE_CAP_MS) {
  const cap = Math.min(12 * 60 * 60 * 1e3, Math.max(OFFLINE_CAP_MS, capMs));
  return Math.min(Math.max(0, elapsedMs), cap);
}
function fightCeiling(elapsedMs, capMs = OFFLINE_CAP_MS) {
  const offline = Math.floor(countedOffline(elapsedMs, capMs) / BASE_ENCOUNTER_MS);
  const online = Math.ceil(Math.max(0, elapsedMs) / SPEED3_MS);
  return Math.max(offline, online, 1);
}
function allowedChests(elapsedMs, capMs = OFFLINE_CAP_MS) {
  const road = Math.floor(countedOffline(elapsedMs, capMs) / 6e4) + 5;
  const shop = Math.max(1, Math.ceil(Math.max(elapsedMs, 1) / 864e5)) * 10;
  return Math.min(99 * 4 + 5, Math.ceil((fightCeiling(elapsedMs, capMs) + road + shop) * PLAUSIBILITY_BUFFER));
}
function allowedShards(elapsedMs, capMs = OFFLINE_CAP_MS, yieldMult = 1) {
  const mult = Math.max(1, Math.min(1.3, yieldMult));
  return Math.ceil(fightCeiling(elapsedMs, capMs) * PLAUSIBILITY_BUFFER * mult);
}
function allowedMastery(elapsedMs, capMs = OFFLINE_CAP_MS) {
  const fights = fightCeiling(elapsedMs, capMs);
  const bosses = Math.ceil(fights / 6);
  const dupes2 = Math.ceil(countedOffline(elapsedMs, capMs) / 6e4);
  return Math.ceil((fights + bosses * 5 + dupes2 * 10) * PLAUSIBILITY_BUFFER);
}
function allowedNewMons(elapsedMs, capMs = OFFLINE_CAP_MS) {
  return allowedChests(elapsedMs, capMs) + Math.floor(allowedShards(elapsedMs, capMs) / 5) + Math.ceil(Math.max(0, elapsedMs) / 36e5) + 6;
}
function crestsInOrder(badges) {
  const indexes = badges.map((badge) => CREST_ORDER.indexOf(badge)).filter((index) => index >= 0);
  const unique = [...new Set(indexes)].sort((a, b) => a - b);
  return unique.every((index, place) => index === place);
}
function badgeProgress(badges) {
  return new Set(badges.filter((badge) => badge.length > 0)).size;
}
function allowedCrests(elapsedMs) {
  return Math.min(CREST_CAP, Math.floor(Math.max(0, elapsedMs) / CREST_PACE_MS));
}
var STARTER_SPECIES = new Set(STARTERS.map((starter) => starter.id));
function privateMonster(mon) {
  if (OBTAINED_HOW.includes(mon.obtainedHow)) return false;
  if (mon.obtainedHow === "alt") return true;
  return STARTER_SPECIES.has(mon.species) && /^r\d+c\d+$/.test(mon.obtainedHow);
}
function bump(flag, next) {
  return next > flag ? next : flag;
}
function gainFlag(gain, allowed) {
  if (!(gain > allowed)) return 0;
  if (gain > allowed * 2) return 2;
  return 1;
}
function auditHasProgress(before, after) {
  if (after.gold > before.gold || after.ep > before.ep) return true;
  if (after.chests > before.chests || after.shards > before.shards) return true;
  if ((after.mastery ?? 0) > (before.mastery ?? 0)) return true;
  if (after.region > before.region || after.chapter > before.chapter) return true;
  if (after.badges.some((badge) => !before.badges.includes(badge))) return true;
  const known = new Set(before.mons.map((mon) => mon.uid));
  return after.mons.some((mon) => !known.has(mon.uid));
}
function stickAudit(previousFlag, baseline, next, elapsedMs, bonusGold = 0) {
  const verdict = auditSync(baseline, next, elapsedMs, bonusGold);
  const flag = Math.max(previousFlag, verdict.flag);
  const progress = baseline ? auditHasProgress(baseline, next) : true;
  const advanceClock = previousFlag < 1 && verdict.flag < 1 && progress;
  return { flag, audit: advanceClock ? next : baseline, advanceClock, reasons: verdict.reasons };
}
function expeditionGoldCap(region, chapter) {
  return expeditionGold(reachLevel(region, chapter), 1 + 4 + 8, "gold");
}
var RESEARCH_SKEW_MS = 15e3;
function researchVerdict(before, after, elapsedMs, nowMs) {
  const next = after.research;
  if (!next) return 0;
  if (next.ranks.length !== 6 || next.ranks.some((rank2) => !Number.isInteger(rank2) || rank2 < 0 || rank2 > 10)) return 2;
  const prev = before.research ?? null;
  const prevRanks = prev?.ranks ?? [0, 0, 0, 0, 0, 0];
  if (prev && (prev.ranks.length !== 6 || prev.ranks.some((rank2) => !Number.isInteger(rank2) || rank2 < 0 || rank2 > 10))) return 2;
  for (let line = 0; line < 6; line++) if (next.ranks[line] < prevRanks[line]) return 2;
  const job = next.job;
  if (job) {
    if (!Number.isInteger(job.line) || job.line < 0 || job.line > 5) return 2;
    if (!Number.isInteger(job.level) || job.level !== next.ranks[job.line] + 1 || job.level > 10) return 2;
    if (!Number.isFinite(job.startedAt) || !Number.isFinite(job.readyAt)) return 2;
    if (job.startedAt > nowMs + RESEARCH_SKEW_MS) return 2;
    if (job.readyAt - job.startedAt !== researchDurationMs(job.level)) return 2;
    if (job.readyAt <= nowMs - RESEARCH_SKEW_MS) return 2;
  }
  const prepaid = prev?.job ?? null;
  if (prepaid && prepaid.level > (next.ranks[prepaid.line] ?? 0)) {
    if (!job || job.line !== prepaid.line || job.level !== prepaid.level || job.startedAt !== prepaid.startedAt || job.readyAt !== prepaid.readyAt) return 2;
  }
  const beforeAt = Number.isFinite(before.at) ? before.at : nowMs - elapsedMs;
  const needed = researchMsNeeded(prev, next, beforeAt);
  if (needed > elapsedMs + RESEARCH_SKEW_MS) return 2;
  return 0;
}
function auditSync(before, after, elapsedMs, bonusGold = 0, nowMs = Date.now()) {
  const baseline = before ?? freshBaseline(nowMs - Math.max(0, elapsedMs ?? 0));
  const reasons = [];
  let flag = 0;
  const elapsed = elapsedMs ?? after.at - baseline.at;
  if (elapsedMs == null && elapsed < 0) {
    reasons.push("clock");
    flag = 2;
  }
  const region = Math.max(baseline.region, after.region);
  const chapter = Math.max(baseline.chapter, after.chapter);
  const goldGain = after.gold - baseline.gold;
  const windowMs = Math.max(0, elapsed);
  const goldMult = Math.max(1, baseline.treeGold ?? 1, after.treeGold ?? 1) * Math.max(1, baseline.researchGold ?? 1, after.researchGold ?? 1);
  const serverDay = arenaDayKey(new Date(nowMs));
  const sameDaily = baseline.dailyDay === serverDay;
  const marksGain = (after.dailyMarks ?? 0) - (baseline.dailyMarks ?? 0);
  const dailyGoldGain = (after.dailyGold ?? 0) - (baseline.dailyGold ?? 0);
  const marksAlready = sameDaily ? baseline.dailyMarksToday ?? 0 : 0;
  const goldAlready = sameDaily ? baseline.dailyGoldToday ?? 0 : 0;
  const dailyGoldRoom = dailyGoldGain > 0 ? Math.max(0, Math.min(dailyGoldGain, DAILY_GOLD_CAP - goldAlready)) : 0;
  const capMs = Math.max(OFFLINE_CAP_MS, baseline.treeCapMs ?? 0, after.treeCapMs ?? 0);
  const fightRoom = allowedGold(windowMs, region, chapter, goldMult) + Math.max(0, Math.floor(bonusGold));
  const day = lastDailyReset(new Date(nowMs)).toISOString();
  const lootMult = Math.max(1, baseline.researchLoot ?? 1, after.researchLoot ?? 1);
  const dayCap = Math.ceil(expeditionGoldCap(region, chapter) * Math.max(1, Math.min(1.4, lootMult)));
  const expeditionRoom = baseline.expeditionDay === day && typeof baseline.expeditionGoldLeft === "number" ? Math.max(0, Math.min(dayCap, baseline.expeditionGoldLeft)) : dayCap;
  const spent = researchSpend(baseline.research ?? null, after.research ?? null);
  const goldFlag = gainFlag(goldGain + spent, fightRoom + expeditionRoom + dailyGoldRoom);
  if (goldFlag) reasons.push("gold");
  flag = bump(flag, goldFlag);
  const epGain = after.ep - baseline.ep;
  const epMult = Math.max(1, baseline.researchEp ?? 1, after.researchEp ?? 1);
  const epFlag = gainFlag(epGain, allowedEp(windowMs, region, chapter, epMult));
  if (epFlag) reasons.push("ep");
  flag = bump(flag, epFlag);
  const crestGain = badgeProgress(after.badges) - badgeProgress(baseline.badges);
  if (!crestsInOrder(after.badges) || crestGain > allowedCrests(windowMs)) {
    reasons.push("crests");
    flag = 2;
  }
  const known = new Set(baseline.mons.map((mon) => mon.uid));
  const fresh = after.mons.filter((mon) => !known.has(mon.uid));
  const registered = fresh.filter((mon) => !privateMonster(mon));
  const allowed = new Set(after.speciesAllowed);
  if (registered.length > allowedNewMons(windowMs, capMs)) {
    reasons.push("monsters");
    flag = 2;
  }
  const starters = fresh.filter((mon) => STARTER_SPECIES.has(mon.species) && /^r\d+c\d+$/.test(mon.obtainedHow));
  if (starters.length > 1) {
    reasons.push("source");
    flag = 2;
  }
  for (const mon of registered) {
    if (!OBTAINED_HOW.includes(mon.obtainedHow)) {
      reasons.push("source");
      flag = 2;
    }
    if (allowed.size && !allowed.has(mon.species)) {
      reasons.push("region");
      flag = 2;
    }
  }
  const chestGain = after.chests - baseline.chests;
  if (chestGain > allowedChests(windowMs, capMs)) {
    reasons.push("chests");
    flag = 2;
  }
  const shardGain = after.shards - baseline.shards;
  const shardYield = Math.max(1, baseline.researchShard ?? 1, after.researchShard ?? 1);
  if (shardGain > allowedShards(windowMs, capMs, shardYield)) {
    reasons.push("shards");
    flag = 2;
  }
  const masteryGain = (after.mastery ?? 0) - (baseline.mastery ?? 0);
  const masteryFlag = gainFlag(masteryGain, allowedMastery(windowMs, capMs));
  if (masteryFlag) reasons.push("mastery");
  flag = bump(flag, masteryFlag);
  const researchFlag = researchVerdict(baseline, after, windowMs, nowMs);
  if (researchFlag) {
    reasons.push("research");
    flag = bump(flag, researchFlag);
  }
  if (marksGain < 0 || dailyGoldGain < 0 || marksAlready + Math.max(0, marksGain) > DAILY_MARK_CAP || goldAlready + Math.max(0, dailyGoldGain) > DAILY_GOLD_CAP) {
    reasons.push("daily");
    flag = 2;
  } else {
    after.dailyDay = serverDay;
    after.dailyMarksToday = marksAlready + Math.max(0, marksGain);
    after.dailyGoldToday = goldAlready + Math.max(0, dailyGoldGain);
  }
  if (flag === 0) {
    const extra = Math.max(0, goldGain - fightRoom);
    after.expeditionDay = day;
    after.expeditionGoldLeft = Math.max(0, expeditionRoom - extra);
  }
  return { flag, reasons };
}
function freshBaseline(at) {
  return {
    at,
    gold: START_GOLD2,
    ep: 0,
    region: 1,
    chapter: 1,
    badges: [],
    chests: 0,
    shards: 0,
    mastery: 0,
    masteryRanks: 0,
    treeGold: 1,
    treeCapMs: OFFLINE_CAP_MS,
    mons: [],
    speciesAllowed: []
  };
}

// src/adventure/cloud/progress.ts
function investedExp(level2, exp) {
  const lvl = Math.max(1, Math.min(999, Math.floor(level2) || 1));
  let sum = Math.max(0, Math.floor(exp) || 0);
  for (let i = 1; i < lvl; i++) sum += expToNext(i);
  return sum;
}
function progressOf(save) {
  const crests = new Set(save.badges.filter((badge) => typeof badge === "string" && badge.length > 0)).size;
  const codex = Object.values(save.dex ?? {}).filter((entry) => (entry?.caught ?? 0) > 0).length;
  let ep = 0;
  for (const mon of Object.values(save.mons ?? {})) {
    if (!mon) continue;
    ep += investedExp(mon.lvl, mon.exp);
  }
  return { crests, codex, ep };
}

// src/adventure/online/snapshot.ts
var HOW = {
  truhe: "Truhe",
  werkstatt: "Truhe",
  spur: "Splitter",
  hort: "Ei",
  rad: "Rad",
  tausch: "Tausch"
};
function obtainedHow(where) {
  return HOW[where] ?? where;
}
function auditFromSave(save) {
  const mons = Object.entries(save.mons ?? {}).map(([uid, mon]) => ({
    uid,
    species: mon.species,
    level: mon.lvl,
    rarity: species(mon.species).baseRarity,
    schimmer: Boolean(mon.shiny),
    obtainedAt: mon.caughtAt,
    obtainedHow: obtainedHow(mon.caughtWhere)
  }));
  const shards = Object.values(save.shards ?? {}).reduce((sum, n) => sum + (Number(n) || 0), 0);
  const mastery = Object.values(save.mastery ?? {}).reduce((sum, n) => sum + (Number(n) || 0), 0);
  const masteryRanks = Object.values(save.mastery ?? {}).reduce((sum, n) => sum + masteryLevel(Number(n) || 0), 0);
  const chests = (save.chests?.kiesel ?? 0) + (save.chests?.silber ?? 0) + (save.chests?.gold ?? 0) + (save.chests?.sternen ?? 0) + (save.roadReady ?? 0);
  return {
    at: save.lastSeenAt,
    gold: save.gold,
    ep: progressOf(save).ep,
    region: save.region,
    chapter: save.chapter,
    badges: [...save.badges ?? []],
    chests,
    shards,
    mastery,
    masteryRanks,
    ...treeAudit(save),
    treeCapMs: offlineCapMs(save),
    researchGold: researchGoldMult(save),
    researchEp: researchEpMult(save),
    researchLoot: researchLootMult(save),
    researchShard: researchShardYield(save),
    research: researchAudit(save),
    dailyMarks: Math.max(0, Math.floor(Number(save.daily?.marks)) || 0),
    dailyGold: Math.max(0, Math.floor(Number(save.daily?.gold)) || 0),
    mons,
    speciesAllowed: poolFor(enteredRegions(save))
  };
}
function emptyAudit(at) {
  return {
    at,
    gold: START_GOLD,
    ep: 0,
    region: 1,
    chapter: 1,
    badges: [],
    chests: 0,
    shards: 0,
    mastery: 0,
    masteryRanks: 0,
    treeGold: 1,
    treeCapMs: 8 * 60 * 60 * 1e3,
    mons: [],
    speciesAllowed: []
  };
}

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

// supabase/functions/sync-check/index.ts
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const user = await caller(req);
  if (!user) return json({ error: "auth" }, 401);
  const db = admin();
  const saved = await db.from("saves").select("save_json").eq("user_id", user.id).maybeSingle();
  if (saved.error || !saved.data?.save_json) return json({ flag: 0, reasons: [] });
  let after;
  try {
    after = auditFromSave(saved.data.save_json);
  } catch {
    return json({ error: "save" }, 400);
  }
  const profile = await db.from("profiles").select("last_audit, flag_level, audited_at, updated_at, audit_generation, bonus_gold").eq("user_id", user.id).maybeSingle();
  const before = profile.data?.last_audit ?? null;
  const previousFlag = profile.data?.flag_level === 2 ? 2 : profile.data?.flag_level === 1 ? 1 : 0;
  const auditedAt = Date.parse(String(profile.data?.audited_at ?? profile.data?.updated_at ?? ""));
  const authUser = await db.auth.admin.getUserById(user.id);
  const createdAt = Date.parse(String(authUser.data.user?.created_at ?? ""));
  const accountAge = Number.isFinite(createdAt) ? Math.max(0, Date.now() - createdAt) : 0;
  const elapsed = before && Number.isFinite(auditedAt) ? Date.now() - auditedAt : accountAge;
  const baseline = before ?? emptyAudit(Date.now() - elapsed);
  const bonusNow = Number(profile.data?.bonus_gold) || 0;
  after.bonusGold = bonusNow;
  const bonusGold = Math.max(0, bonusNow - Number(before?.bonusGold ?? 0));
  const stuck = stickAudit(previousFlag, baseline, after, elapsed, bonusGold);
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const generation = Number(profile.data?.audit_generation) || 0;
  if (!profile.data) {
    await db.from("profiles").insert({
      user_id: user.id,
      flag_level: stuck.flag,
      last_audit: stuck.audit,
      audited_at: nowIso,
      audit_generation: stuck.advanceClock ? 1 : 0,
      updated_at: nowIso
    });
  } else if (!stuck.advanceClock) {
    await db.from("profiles").update({ flag_level: stuck.flag, updated_at: nowIso }).eq("user_id", user.id);
  } else {
    await db.from("profiles").update({
      flag_level: stuck.flag,
      last_audit: stuck.audit,
      audited_at: nowIso,
      audit_generation: generation + 1,
      updated_at: nowIso
    }).eq("user_id", user.id);
  }
  const known = new Set((before?.mons ?? []).map((mon) => mon.uid));
  const fresh = stuck.advanceClock ? after.mons.filter((mon) => !known.has(mon.uid) && ["Truhe", "Splitter", "Ei", "Rad", "Tausch"].includes(mon.obtainedHow)) : [];
  if (fresh.length) {
    await db.from("monsters_owned").upsert(fresh.map((mon) => ({
      uid: mon.uid,
      owner: user.id,
      species: mon.species,
      level: mon.level,
      rarity: mon.rarity,
      schimmer: mon.schimmer,
      obtained_at: new Date(mon.obtainedAt).toISOString(),
      obtained_how: mon.obtainedHow,
      trade_lock_until: null,
      trade_count: 0
    })), { onConflict: "owner,uid" });
  }
  return json({ flag: stuck.flag, reasons: stuck.reasons });
});
