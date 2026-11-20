import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from './store/useAppStore';
import { MeshBackground } from './components/MeshBackground';
import { BottomNav, TABS } from './components/BottomNav';
import { Screen } from './screens/Screens';
import { WorkoutPlayer } from './components/WorkoutPlayer';
import { RestTimer } from './components/RestTimer';
import { WorkoutSummary } from './components/WorkoutSummary';
import { initNative, native } from './lib/native';

export default function App() {
  const theme = useAppStore((s) => s.theme);
  const activeTab = useAppStore((s) => s.activeTab);
  const name = useAppStore((s) => s.profile.name);
  const playerOpen = useAppStore((s) => s.playerOpen && !!s.session);
  const hasSession = useAppStore((s) => !!s.session);
  const hasRest = useAppStore((s) => !!s.session?.rest);
  const hasSummary = useAppStore((s) => !!s.summary);
  const title = TABS.find((t) => t.id === activeTab)?.label ?? '';

  useEffect(() => {
    void initNative()
      .catch(() => undefined)
      .then(() => {
        const s = useAppStore.getState();
        native.setTheme(s.theme);
        native.keepAwake(!!s.session);
        native.hideSplash();
      });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'light' ? '#F2F2F4' : '#2E333A');
    native.setTheme(theme);
  }, [theme]);

  // Экран не гаснет, пока идёт тренировка
  useEffect(() => {
    native.keepAwake(hasSession);
  }, [hasSession]);

  return (
    <div className="relative mx-auto flex h-full max-w-[430px] flex-col">
      <MeshBackground theme={theme} />

      {/* Свёрнутый таймер отдыха висит над капсулой — увеличиваем отступ, чтобы не перекрывал контент */}
      <main className={`no-scrollbar pt-safe flex-1 overflow-y-auto px-4 ${hasRest && !playerOpen ? 'pb-[17rem]' : 'pb-32'}`}>
        <header className="mb-5 flex items-end justify-between pt-2">
          <div>
            <p className="text-sm text-muted">Привет, {name}</p>
            <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          </div>
          <span className="text-xs font-black tracking-[0.2em] text-accent">IRON APEX</span>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
          >
            <Screen tab={activeTab} />
          </motion.div>
        </AnimatePresence>
      </main>

      <BottomNav />

      <AnimatePresence>{playerOpen && <WorkoutPlayer key="player" />}</AnimatePresence>
      <AnimatePresence>{hasRest && <RestTimer key="rest" />}</AnimatePresence>
      <AnimatePresence>{hasSummary && <WorkoutSummary key="summary" />}</AnimatePresence>
    </div>
  );
}
