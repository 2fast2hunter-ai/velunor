import typesJson from '../../data/types.json'
import type { TypeId } from '../types'

/** Base colours live in data/types.json. Accents are fixed by the effect spec. */
const BASE = typesJson.colors as Record<TypeId, string>

export const ATTACK_MAX_MS = 1200
export const ATTACK_MIN_MS = 300
export const LUNGE_OUT_MS = 520
export const LUNGE_HOLD_MS = 180
export const LUNGE_BACK_MS = 400
export const LUNGE_PX = 160
export const LUNGE_SCALE = 1.12
export const ARC_APEX_PX = 20
export const HIT_SHAKE_PX = 22
export const HIT_FLASH_MS = 140
export const HIT_MS = 240
export const RECOIL_MS = 280
export const BANNER_MS = 600
export const NUMBER_MS = 900
export const KO_MS = 700
export const FX_SIZE = 2
export const PARTICLE_BOOST = 1.75
export const POOL_SIZE = 96
export const STRONG_SCALE = 1.3
export const WEAK_SCALE = 0.7
export const CRIT_SCALE = 1.4
export const CRIT_SHAKE_PX = 4
export const CRIT_SHAKE_MS = 120
export const CRIT_FLASH_MS = 50
export const CRIT_NUMBER_SCALE = 1.5
export const CRIT_GOLD = '#ffd54f'
export const CRIT_HITSTOP_MS = 60
export const STONE_CRIT_HITSTOP_MS = 100
export const FIGHTING_LUNGE_PX = 40
export const AWAKEN_SCALE = 1.15
export const PARTICLE_CAP = 72
export const CRIT_PARTICLE_CAP = 96
export const REDUCED_PARTICLE_SCALE = 0.3
export const TEMPO3_PARTICLE_SCALE = 0.5

export type FxDraw =
  | 'orb' | 'beam' | 'swirl' | 'ground' | 'sickle' | 'shard' | 'bolt'
  | 'bubble' | 'rock' | 'prism' | 'blade' | 'melee' | 'claw' | 'swarm'
  | 'pillar' | 'void' | 'wisp' | 'rings' | 'arcs' | 'cone'

export interface TypeFxDef {
  type: TypeId
  /** From data/types.json. */
  base: string
  accent: string
  projectile: boolean
  /** Flight or build-up, milliseconds at tempo ×1. */
  travelMs: number
  particles: number
  critParticles: number
  draw: FxDraw
  /** Optional art key. Missing keys stay on the procedural draw. */
  spriteKey?: string
  form: string
  hit: string
  crit: string
}

function row(
  type: TypeId,
  accent: string,
  draw: FxDraw,
  projectile: boolean,
  travelMs: number,
  particles: number,
  critParticles: number,
  form: string,
  hit: string,
  crit: string
): TypeFxDef {
  return { type, base: BASE[type], accent, draw, projectile, travelMs, particles, critParticles, form, hit, crit }
}

/** Binding effect table. Order is the type catalogue. */
export const TYPE_FX: readonly TypeFxDef[] = [
  row('fire', '#ffca28', 'orb', true, 300, 12, 16, 'Glühende Kugel mit Flammenschweif aus 12 schrumpfenden Partikeln', 'Kleine Explosion (Kreis wächst auf 48 px), 8 Glutfunken fallen nach unten und verglühen', 'Doppelte Explosion mit Ring, Funkenregen 16, kurzes Hitzeflimmern (Welle 150 ms)'),
  row('water', '#e3f2fd', 'beam', false, 280, 10, 20, 'Dicker Strahl als Linie mit welliger Kante vom Angreifer zum Ziel', 'Spritzer: 10 Tropfen fliegen fächerförmig nach oben/außen, Pfütze (Ellipse) blendet aus', 'Strahl doppelt so breit, zweiter Spritzring, Ziel wird kurz zurückgedrückt (8 px)'),
  row('plant', '#c5e1a5', 'swirl', true, 340, 8, 12, 'Wirbel aus 8 Blättern (Rauten), die spiralförmig fliegen', 'Blätter umkreisen das Ziel einmal und zerfallen, 4 Ranken-Linien schlagen zu', 'Blätter + Blütenblätter (rosa #f8bbd0), Ranken umschlingen das Ziel 150 ms'),
  row('earth', '#d7ccc8', 'ground', false, 260, 5, 8, 'Kein Flug: Bodenriss läuft als Zickzack-Linie über den Boden zum Ziel', '5 Erdbrocken springen unter dem Ziel hoch, Staubwolke', 'Großer Brocken bricht unter dem Ziel hervor, Bildschirmwackler zusätzlich vertikal'),
  row('wind', '#ffffff', 'sickle', true, 240, 3, 5, 'Drei halbmondförmige Windsicheln (Bögen)', 'Kleiner Wirbel (Spirale aus Linien) dreht sich um das Ziel', 'Fünf Sicheln, Wirbel doppelt so hoch, Ziel wird angehoben (6 px)'),
  row('ice', '#ffffff', 'shard', true, 280, 8, 12, 'Spitzer Kristallsplitter (schmales Dreieck) mit glitzerndem Schweif', 'Splitter zerspringt in 8 kleine Scherben, Reif-Ring am Boden', 'Drei Splitter gleichzeitig, Ziel friert 120 ms ein (hellblauer Überzug)'),
  row('lightning', '#ffffff', 'bolt', false, 120, 6, 12, 'Zickzack-Blitz von oben auf das Ziel, 2 Neuzeichnungen', 'Heller Einschlagspunkt, 6 kleine Funkenbögen um das Ziel', 'Drei Blitze nacheinander (je 40 ms), Bildschirm 80 ms gelb getönt'),
  row('poison', '#ce93d8', 'bubble', true, 360, 5, 10, 'Blubbernde Giftkugel, die in hohem Bogen fliegt', 'Spritzer, 5 Blasen steigen auf und platzen', 'Grüner Nebel (#9ccc65) umhüllt das Ziel 200 ms, doppelte Blasen'),
  row('stone', '#bcaaa4', 'rock', true, 320, 6, 9, 'Kantiger Brocken (Polygon) dreht sich im Flug', 'Brocken zerbricht in 6 Stücke, Staub', 'Großer Brocken + 3 kleine, Hitstop 100 ms'),
  row('crystal', '#80deea', 'prism', true, 300, 8, 12, 'Facettiertes Prisma, das im Flug Regenbogenreflexe (3 Farben) wirft', 'Kristall zerspringt in Lichtsplitter mit Prismen-Glanz', 'Fünf Prismen aus Kreisanordnung, Regenbogenring'),
  row('metal', '#eceff1', 'blade', true, 260, 8, 16, 'Rotierendes Zahnrad / Klinge mit metallischem Glanzstreifen', 'Funken (orange, 8) wie bei Schleifstein, metallischer Ring', 'Klinge zieht einen Schnitt-Strich über das Ziel, doppelte Funken'),
  row('fighting', '#ffcc80', 'melee', false, 200, 8, 16, 'Kein Projektil: Angreifer stürmt vor (Ausfallschritt 40 px statt 12), Schlaglinien', 'Aufprall-Stern (8 Linien) + Druckwelle (Ring)', 'Drei schnelle Schläge mit drei Aufprall-Sternen, Ring doppelt'),
  row('beast', '#ffe0b2', 'claw', false, 220, 3, 6, 'Nahkampf: Sprung zum Ziel, drei Kratzlinien', 'Drei diagonale Kratzspuren blitzen auf und verblassen', 'Zwei gekreuzte Kratzsalven (6 Linien), kurzer Gebrüll-Ring vom Angreifer'),
  row('insect', '#fff59d', 'swarm', true, 320, 10, 20, 'Schwarm aus 10 kleinen Punkten, die flatternd (Sinus) fliegen', 'Schwarm umschwirrt das Ziel 150 ms, kleine Stich-Funken', 'Doppelter Schwarm, Ziel kurz grün getönt'),
  row('light', '#ffd54f', 'pillar', false, 220, 8, 12, 'Heller Lichtstrahl von oben (breite Säule)', 'Leuchtender Kreis + 8 Strahlen nach außen', 'Säule doppelt breit, Lens-Glanz (Kreuz-Glitzer) über dem Ziel'),
  row('shadow', '#212121', 'void', true, 320, 8, 12, 'Dunkle Kugel, die Licht „einsaugt“ (Ring zieht sich zusammen), dann fliegt', 'Dunkle Explosion, Ränder zucken, Partikel fallen nach innen', 'Bildschirm 100 ms abgedunkelt (Vignette), dunkler Doppelring'),
  row('ghost', '#f3e5f5', 'wisp', true, 380, 8, 12, 'Halbtransparente Wisp-Flamme, die wellenförmig schwebt und zwischendurch kurz verschwindet', 'Ziel wird kurz durchscheinend (Alpha 0,5), Wisp löst sich in Nebel auf', 'Drei Wisps umkreisen und treffen gleichzeitig, Echo-Silhouette des Ziels'),
  row('psychic', '#e1bee7', 'rings', false, 280, 6, 10, 'Konzentrische Wellenringe pulsieren vom Angreifer zum Ziel', 'Ziel verzerrt sich (Skalierung 0,9 ↔ 1,1), Ringe zerfallen', 'Raum-Verzerrung: Hintergrund wellt 150 ms, Ziel dreht sich einmal'),
  row('sound', '#ffffff', 'arcs', true, 260, 3, 5, 'Drei Schallbögen (Klammern „)“) mit Notenlinien-Partikeln', 'Vibration: Ziel zittert schnell (4 px, 6×), Ringe', 'Fünf Bögen, kurzer Bildschirmwackler horizontal, Schadenszahl hüpft'),
  row('dragon', '#7e57c2', 'cone', false, 340, 16, 24, 'Drachenatem: Kegel aus Partikeln in Grund- und Akzentfarbe, der sich zum Ziel ausbreitet', 'Großer Einschlag mit Schuppen-Splittern (Rauten) in beiden Farben', 'Kegel doppelt, Flammen-Silhouette eines Drachenkopfs (einfache Form) über dem Ziel 150 ms')
]

const BY_TYPE = new Map(TYPE_FX.map((entry) => [entry.type, entry]))

export function typeFx(type: TypeId): TypeFxDef {
  return BY_TYPE.get(type) ?? TYPE_FX[0]
}

export function typeBase(type: TypeId): string {
  return BASE[type]
}

const MOVE_LABEL: Record<TypeId, string> = {
  fire: 'Feuerstoß', water: 'Wasserstrahl', plant: 'Rankenhieb', earth: 'Erdriss', wind: 'Windsichel',
  ice: 'Eissplitter', lightning: 'Blitzschlag', poison: 'Giftblase', stone: 'Steinwurf', crystal: 'Prismablitz',
  metal: 'Metallklinge', fighting: 'Schlaghagel', beast: 'Krallenhieb', insect: 'Schwarmstich', light: 'Lichtsäule',
  shadow: 'Schattensog', ghost: 'Geisterflamme', psychic: 'Psychowelle', sound: 'Schallstoß', dragon: 'Drachenodem'
}

/** Type name used when a species skill has no title. */
export function moveLabel(type: TypeId): string {
  return MOVE_LABEL[type] ?? MOVE_LABEL.fire
}

/** Dash, hold and return. Tempo divides it. The floor stays above a readable flash. */
export function attackDuration(travelMs: number, tempo: number): number {
  const pace = tempo === 2 || tempo === 3 ? tempo : 1
  const flight = Math.round(Math.max(0, travelMs) * 0.35)
  const total = LUNGE_OUT_MS + LUNGE_HOLD_MS + LUNGE_BACK_MS + flight + HIT_MS
  return Math.max(ATTACK_MIN_MS, Math.min(ATTACK_MAX_MS, total) / pace)
}

/** How long the projectile stays on screen, inside the attack. */
export function flightMs(travelMs: number, tempo: number): number {
  const pace = tempo === 2 || tempo === 3 ? tempo : 1
  return Math.max(ATTACK_MIN_MS / 2, (LUNGE_OUT_MS + LUNGE_HOLD_MS + Math.round(travelMs * 0.4)) / pace)
}

export function particleBudget(entry: TypeFxDef, opts: { crit: boolean; tempo: number; reduced: boolean }): number {
  const cap = opts.crit ? CRIT_PARTICLE_CAP : PARTICLE_CAP
  let count = Math.min(cap, Math.round((opts.crit ? entry.critParticles : entry.particles) * PARTICLE_BOOST))
  if (opts.tempo >= 3) count = Math.round(count * TEMPO3_PARTICLE_SCALE)
  if (opts.reduced) count = Math.round(count * REDUCED_PARTICLE_SCALE)
  return Math.max(0, Math.min(cap, count))
}

export function effectScale(band: 'strong' | 'weak' | 'neutral', crit: boolean, awaken: boolean): number {
  const advantage = band === 'strong' ? STRONG_SCALE : band === 'weak' ? WEAK_SCALE : 1
  return advantage * (crit ? CRIT_SCALE : 1) * (awaken ? AWAKEN_SCALE : 1)
}
