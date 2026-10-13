import { go, session } from './session'
import { INK, MUTED, W, button, openModal, text } from './ui'

const DONE = 6

interface Step {
  title: string
  body: string
  next: string
  scene?: string
}

const STEPS: Step[] = [
  {
    title: 'Ressourcen',
    body: 'Gold bezahlt Gebäude und Training. Juwelen bezahlen das Portal (100 für eine Ziehung, 900 für zehn). Essenz wertet Monster auf und kommt aus Duplikaten, vom Freilassen und aus Boss-Siegen. Tickets ersetzen Juwelen bei einer Ziehung.',
    next: 'Weiter'
  },
  {
    title: 'Aufstellung',
    body: 'F1 und F2 sind die Front: sie halten aus und zielen auf die eigene Spur. H1 bis H3 stehen hinten und greifen das schwächste Ziel. Steht ein Monster in seiner Rolle, bekommt es +10 % Angriff und Verteidigung.',
    next: 'Team ansehen',
    scene: 'Team'
  },
  {
    title: 'Plätze',
    body: 'Tippe einen Platz an, dann ein Monster unten. Rathaus Stufe 2 und 3 öffnen H2 und H3. Typ-Synergie (zwei gleiche Typen) kommt mit Rathaus Stufe 2.',
    next: 'Weiter',
    scene: 'City'
  },
  {
    title: 'Kampf',
    body: 'Der Kampf läuft von allein. Belohnung gibt es erst auf dem Sieg-Bildschirm, nicht schon in Runde 1. Tempo steht in der Stage und im Kampf. Überspringen neuer Stages kommt mit Rathaus Stufe 3.',
    next: 'Zur Kampagne',
    scene: 'Campaign'
  },
  {
    title: 'Kampagne',
    body: 'Wähle Stage 1-1. Drei Sterne bekommst du, wenn niemand aus deinem Team fällt. Nach Stage 1-2 öffnet das Portal.',
    next: 'Weiter',
    scene: 'City'
  },
  {
    title: 'Portal und Pity',
    body: 'Das Portal bleibt zu, bis Stage 1-2 gewonnen ist. Die erste 10er-Ziehung ist gratis und enthält mindestens ein episches Monster. Soft-Pity erhöht die Chance: ab Ziehung 15 für Episch+, ab Ziehung 60 für Legendär+. Der Zähler wird gespeichert und nie heimlich zurückgesetzt. Ein Duplikat bringt sofort Essenz.',
    next: 'Verstanden'
  }
]

export function guidePending(sceneKey: string): boolean {
  const step = session.save.tutorial.guideStep ?? DONE
  if (step >= DONE) return false
  if (sceneKey === 'City') return step === 0 || step === 1 || step === 3 || step === 5
  if (sceneKey === 'Team') return step === 2
  if (sceneKey === 'Campaign') return step === 4
  return false
}

export function openGuide(scene: Phaser.Scene, sceneKey: string): { close: () => void } | undefined {
  if (!guidePending(sceneKey)) return undefined
  const step = session.save.tutorial.guideStep
  const def = STEPS[step]
  if (!def) return undefined
  const modal = openModal(scene, 720, 420, def.title)
  const body = text(scene, W / 2, 250, def.body, 18, INK, [0.5, 0])
  body.setWordWrapWidth(620)
  body.setAlign('center')
  modal.root.add(body)
  modal.root.add(text(scene, W / 2, 430, `${step + 1} / ${STEPS.length}`, 14, MUTED, [0.5, 0]))
  modal.root.add(button(scene, W / 2 - 130, 500, 220, 52, def.next, () => {
    const next = step + 1
    session.save.tutorial.guideStep = next
    session.persist()
    modal.close()
    if (def.scene) go(scene, def.scene)
    else if (next < DONE && guidePending(sceneKey)) openGuide(scene, sceneKey)
  }))
  modal.root.add(button(scene, W / 2 + 150, 500, 200, 52, 'Überspringen', () => {
    session.save.tutorial.guideStep = DONE
    session.persist()
    modal.close()
  }, { fill: 0x3d4b6e, color: INK }))
  return modal
}
