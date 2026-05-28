import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pandoos.music',
  appName: 'Pandoos',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: false,
      backgroundColor: "#0A0A0F",
      androidSplashResourceName: "splash",
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'DARK',
    }
  },
  cordova: {
    preferences: {
      MediaPlaybackRequiresUserAction: "false"
    }
  },
  android: {
    overrideUserAgent: "Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36"
  }
};

export default config;
