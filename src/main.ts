import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import '@fontsource/nunito/800.css'
import '@fontsource/fredoka/700.css'
import { bootAdventure } from './adventure/app'
import { prepareShell } from './adventure/shell/native'

void prepareShell().then((shell) => bootAdventure(shell))
