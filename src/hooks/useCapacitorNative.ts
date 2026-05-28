import { useEffect } from 'react';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { Capacitor } from '@capacitor/core';

// Build-time flag — baked in at compile time, no runtime check needed
const IS_NATIVE_BUILD = import.meta.env.VITE_IS_NATIVE === 'true';

export function useCapacitorNative() {
  useEffect(() => {
    // Skip if not a native build — avoids Capacitor API errors in browser/Electron
    if (!IS_NATIVE_BUILD) return;

    const initCapacitor = async () => {
      // StatusBar
      try {
        await StatusBar.setStyle({ style: Style.Dark });
        if (Capacitor.getPlatform() === 'android') {
          await StatusBar.setBackgroundColor({ color: '#0A0A0F' });
        }
      } catch (_) {
        // Ignore — status bar may not be available on all devices
      }

      // Hide splash screen — ALWAYS do this when native, regardless of other state
      try {
        await SplashScreen.hide({ fadeOutDuration: 300 });
      } catch (e) {
        console.warn('[Pandoos] SplashScreen.hide failed:', e);
      }

      // Hardware Back Button (Android)
      try {
        App.addListener('backButton', ({ canGoBack }) => {
          if (canGoBack && window.location.pathname !== '/') {
            window.history.back();
          } else {
            App.exitApp();
          }
        });
      } catch (_) {}

      // Keyboard padding (prevents input fields being hidden behind soft keyboard)
      try {
        Keyboard.addListener('keyboardWillShow', (info) => {
          document.body.style.paddingBottom = `${info.keyboardHeight}px`;
        });
        Keyboard.addListener('keyboardWillHide', () => {
          document.body.style.paddingBottom = '0px';
        });
      } catch (_) {}
    };

    initCapacitor();

    return () => {
      if (!IS_NATIVE_BUILD) return;
      try { Keyboard.removeAllListeners(); } catch (_) {}
    };
  }, []);
}
