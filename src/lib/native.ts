import { Capacitor } from '@capacitor/core';

/**
 * Обёртка над нативными возможностями: вибрация, уведомление об окончании отдыха,
 * удержание экрана и стиль статус-бара. На Android работает через плагины Capacitor
 * (src/lib/nativeAndroid.ts, грузится лениво), в браузере — веб-фолбэк.
 */
export interface NativeBridge {
  vibrate(pattern: number | number[]): void;
  /** Короткий тактильный отклик (тап по кнопке) */
  tap(): void;
  requestNotifications(): Promise<boolean>;
  scheduleRestEnd(at: number, body: string): void;
  cancelRestEnd(): void;
  keepAwake(on: boolean): void;
  setTheme(theme: 'light' | 'dark'): void;
  hideSplash(): void;
  /** Android 12+: разрешены ли точные будильники (null — не применимо) */
  exactAlarms(): Promise<boolean | null>;
  openExactAlarmSettings(): Promise<void>;
}

let webTimer: number | undefined;

const webBridge: NativeBridge = {
  vibrate(pattern) {
    try {
      navigator.vibrate?.(pattern);
    } catch {
      /* не поддерживается */
    }
  },
  tap() {
    this.vibrate(15);
  },
  async requestNotifications() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'default') {
      try {
        return (await Notification.requestPermission()) === 'granted';
      } catch {
        return false;
      }
    }
    return Notification.permission === 'granted';
  },
  scheduleRestEnd(at, body) {
    this.cancelRestEnd();
    const delay = at - Date.now();
    if (delay <= 0) return;
    webTimer = window.setTimeout(() => {
      webTimer = undefined;
      if (document.visibilityState !== 'hidden') return;
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      try {
        new Notification('IRON APEX — отдых окончен', { body, tag: 'rest-timer' });
      } catch {
        /* на Android-вебе нужен Service Worker */
      }
    }, delay);
  },
  cancelRestEnd() {
    if (webTimer !== undefined) window.clearTimeout(webTimer);
    webTimer = undefined;
  },
  keepAwake() {
    /* Wake Lock API в вебе не используем — экран в браузере не критичен */
  },
  setTheme() {},
  hideSplash() {},
  async exactAlarms() {
    return null;
  },
  async openExactAlarmSettings() {},
};

let bridge: NativeBridge = webBridge;

export const isNative = () => Capacitor.isNativePlatform();
export const setNativeBridge = (b: NativeBridge) => {
  bridge = b;
};

/** Подключает нативный мост на Android/iOS. Вызывается один раз при старте. */
export async function initNative() {
  if (!isNative()) return;
  const { createCapacitorBridge } = await import('./nativeAndroid');
  setNativeBridge(await createCapacitorBridge());
}

export const native = {
  vibrate: (p: number | number[]) => bridge.vibrate(p),
  tap: () => bridge.tap(),
  requestNotifications: () => bridge.requestNotifications(),
  scheduleRestEnd: (at: number, body: string) => bridge.scheduleRestEnd(at, body),
  cancelRestEnd: () => bridge.cancelRestEnd(),
  keepAwake: (on: boolean) => bridge.keepAwake(on),
  setTheme: (t: 'light' | 'dark') => bridge.setTheme(t),
  hideSplash: () => bridge.hideSplash(),
  exactAlarms: () => bridge.exactAlarms(),
  openExactAlarmSettings: () => bridge.openExactAlarmSettings(),
};
