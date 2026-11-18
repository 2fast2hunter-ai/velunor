import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import '@fontsource/nunito/800.css'
import '@fontsource/fredoka/700.css'
import { bootAdventure } from './adventure/app'
import { prepareShell } from './adventure/shell/native'
import { SPLASH_FADE_MS, SPLASH_MAX_MS, splashShouldHide } from './adventure/shell/splash'

const started = Date.now()

function hideSplash(): void {
  if (!splashShouldHide(Date.now() - started, true)) return
  void import('@capacitor/splash-screen')
    .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: SPLASH_FADE_MS }))
    .catch(() => undefined)
}

void prepareShell().then((shell) => {
  bootAdventure(shell)
  hideSplash()
})

setTimeout(() => {
  if (splashShouldHide(Date.now() - started, false)) hideSplash()
}, SPLASH_MAX_MS)
