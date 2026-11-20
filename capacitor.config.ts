import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ironapex.tracker',
  appName: 'IRON APEX',
  webDir: 'dist',
  android: {
    backgroundColor: '#F2F2F4',
    // Полностью офлайн: только локальные ассеты из APK, без смешанного контента и отладки WebView в релизе
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2500,
      // Страховка: сплэш скроется сам, даже если JS не успел вызвать hide()
      launchAutoHide: true,
      backgroundColor: '#16161A',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false,
    },
    StatusBar: {
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#F2F2F4',
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_ironapex',
      iconColor: '#E05A33',
    },
  },
};

export default config;
