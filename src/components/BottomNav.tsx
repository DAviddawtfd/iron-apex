import { motion } from 'framer-motion';
import { Home, Dumbbell, Apple, TrendingUp, User, Sun, Moon, type LucideIcon } from 'lucide-react';
import { useAppStore, type TabId } from '../store/useAppStore';

export const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'home', label: 'Главная', icon: Home },
  { id: 'workouts', label: 'Тренировки', icon: Dumbbell },
  { id: 'nutrition', label: 'Питание', icon: Apple },
  { id: 'progress', label: 'Прогресс', icon: TrendingUp },
  { id: 'profile', label: 'Профиль', icon: User },
];

const spring = { type: 'spring', stiffness: 420, damping: 34 } as const;

export function BottomNav() {
  const activeTab = useAppStore((s) => s.activeTab);
  const setTab = useAppStore((s) => s.setTab);
  const theme = useAppStore((s) => s.theme);
  const toggleTheme = useAppStore((s) => s.toggleTheme);

  return (
    <div className="bottom-safe pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4">
      <div className="pointer-events-auto flex items-center gap-2">
        <nav
          className="glass-nav flex items-center gap-1 rounded-full p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.22)]"
          aria-label="Основная навигация"
        >
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = id === activeTab;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className="relative flex h-12 w-12 items-center justify-center rounded-full"
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    transition={spring}
                    className="absolute inset-0 rounded-full"
                    style={{ background: 'var(--nav-pill)' }}
                  />
                )}
                <Icon
                  size={21}
                  strokeWidth={active ? 2.3 : 1.9}
                  className="relative z-10 transition-colors duration-200"
                  style={{ color: active ? 'var(--nav-pill-ink)' : 'var(--nav-ink)' }}
                />
              </button>
            );
          })}
        </nav>

        <motion.button
          type="button"
          whileTap={{ scale: 0.88 }}
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}
          className="glass-nav flex h-[60px] w-[60px] items-center justify-center rounded-full shadow-[0_12px_32px_rgba(0,0,0,0.22)]"
        >
          <motion.span
            key={theme}
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={spring}
            className="text-accent"
          >
            {theme === 'light' ? <Moon size={21} /> : <Sun size={21} />}
          </motion.span>
        </motion.button>
      </div>
    </div>
  );
}
