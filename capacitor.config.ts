import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'de.velunor.app',
  appName: 'Velunor',
  webDir: 'dist',
  android: {
    allowMixedContent: false
  },
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      launchFadeOutDuration: 280,
      backgroundColor: '#120e22',
      androidSplashResourceName: 'splash',
      showSpinner: false
    }
  }
}

export default config
