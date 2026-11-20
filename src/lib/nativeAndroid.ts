// Нативная реализация моста на Capacitor. Грузится только в Android/iOS-сборке (см. initNative).
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { LocalNotifications } from '@capacitor/local-notifications';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { KeepAwake } from '@capacitor-community/keep-awake';
import type { NativeBridge } from './native';

const REST_ID = 1001;
const CHANNEL = 'rest-timer';
const STATUS_BG = { light: '#F2F2F4', dark: '#2E333A' } as const;

const quiet = (p: Promise<unknown>) => void p.catch(() => undefined);

export async function createCapacitorBridge(): Promise<NativeBridge> {
  // Канал с высокой важностью: heads-up уведомление + вибрация даже при выключенном экране
  await LocalNotifications.createChannel({
    id: CHANNEL,
    name: 'Таймер отдыха',
    description: 'Сигнал об окончании отдыха между подходами',
    importance: 5,
    visibility: 1,
    vibration: true,
    lights: true,
    lightColor: '#E05A33',
  }).catch(() => undefined);

  let awake = false;

  return {
    vibrate(pattern) {
      // Длинный паттерн = конец отдыха, короткий = ошибка ввода
      const total = Array.isArray(pattern) ? pattern.reduce((a, b) => a + b, 0) : pattern;
      if (total >= 200) quiet(Haptics.notification({ type: NotificationType.Success }));
      else if (total >= 40) quiet(Haptics.notification({ type: NotificationType.Warning }));
      else quiet(Haptics.impact({ style: ImpactStyle.Light }));
    },
    tap() {
      quiet(Haptics.impact({ style: ImpactStyle.Light }));
    },
    async requestNotifications() {
      try {
        let perm = await LocalNotifications.checkPermissions();
        if (perm.display === 'prompt' || perm.display === 'prompt-with-rationale') perm = await LocalNotifications.requestPermissions();
        return perm.display === 'granted';
      } catch {
        return false;
      }
    },
    scheduleRestEnd(at, body) {
      if (at <= Date.now()) return;
      quiet(
        LocalNotifications.cancel({ notifications: [{ id: REST_ID }] }).then(() =>
          LocalNotifications.schedule({
            notifications: [
              {
                id: REST_ID,
                title: 'Отдых окончен — к снаряду!',
                body,
                channelId: CHANNEL,
                smallIcon: 'ic_stat_ironapex',
                iconColor: '#E05A33',
                autoCancel: true,
                schedule: { at: new Date(at), allowWhileIdle: true },
              },
            ],
          }),
        ),
      );
    },
    cancelRestEnd() {
      quiet(LocalNotifications.cancel({ notifications: [{ id: REST_ID }] }));
    },
    keepAwake(on) {
      if (on === awake) return;
      awake = on;
      quiet(on ? KeepAwake.keepAwake() : KeepAwake.allowSleep());
    },
    setTheme(theme) {
      // Style.Light = тёмные иконки на светлом фоне
      quiet(StatusBar.setStyle({ style: theme === 'light' ? Style.Light : Style.Dark }));
      quiet(StatusBar.setBackgroundColor({ color: STATUS_BG[theme] }));
    },
    hideSplash() {
      quiet(SplashScreen.hide({ fadeOutDuration: 250 }));
    },
    async exactAlarms() {
      try {
        return (await LocalNotifications.checkExactNotificationSetting()).exact_alarm === 'granted';
      } catch {
        return null;
      }
    },
    async openExactAlarmSettings() {
      await LocalNotifications.changeExactNotificationSetting().catch(() => undefined);
    },
  };
}
