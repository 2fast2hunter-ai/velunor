import Phaser from 'phaser'
import { onAdVisibility } from './ads'
import { session } from './session'
import { BattleScene } from './scenes/Battle'
import { CampaignScene } from './scenes/Campaign'
import { CityScene } from './scenes/City'
import { MonsterListScene } from './scenes/Monsters'
import { PortalScene } from './scenes/Portal'
import { ResultScene } from './scenes/Result'
import { BootScene, HUDScene, PreloadScene } from './scenes/Shell'
import { TeamScene } from './scenes/Team'

session.boot()

document.addEventListener('visibilitychange', () => {
  onAdVisibility(Date.now())
  if (document.hidden) session.persist()
})
window.addEventListener('beforeunload', () => session.persist())

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#141028',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720
  },
  scene: [BootScene, PreloadScene, HUDScene, CityScene, TeamScene, MonsterListScene, PortalScene, CampaignScene, BattleScene, ResultScene]
})

const refreshScale = () => game.scale.refresh()
window.addEventListener('resize', refreshScale)
void document.fonts?.ready.then(() => refreshScale())
void game
