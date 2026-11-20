import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { SkipForward } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useNow } from '../lib/useNow';
import { beep } from '../lib/sound';
import { native } from '../lib/native';
import { formatClock } from '../lib/training';

const R = 46;
const C = 2 * Math.PI * R;

/** Плавающий таймер отдыха. Источник истины — endsAt в сторе, поэтому переживает перезагрузку. */
export function RestTimer() {
  const rest = useAppStore((s) => s.session?.rest ?? null);
  const muted = useAppStore((s) => s.settings.muted);
  const adjustRest = useAppStore((s) => s.adjustRest);
  const clearRest = useAppStore((s) => s.clearRest);
  const playerOpen = useAppStore((s) => s.playerOpen);
  const now = useNow(200, !!rest);
  const lastTick = useRef<number | null>(null);

  const remainingMs = rest ? Math.max(0, rest.endsAt - now) : 0;
  const remaining = Math.ceil(remainingMs / 1000);
  const progress = rest ? Math.min(1, remainingMs / (rest.duration * 1000)) : 0;

  // Фоновое уведомление (веб сейчас, Capacitor LocalNotifications в Этапе 6)
  useEffect(() => {
    if (!rest) {
      native.cancelRestEnd();
      return;
    }
    native.scheduleRestEnd(rest.endsAt, `Следующий: ${rest.label}`);
    return () => native.cancelRestEnd();
  }, [rest]);

  useEffect(() => {
    if (!rest) return;
    if (remainingMs <= 0) {
      if (!muted) beep('end');
      native.vibrate([180, 90, 180]);
      clearRest();
      return;
    }
    if (remaining <= 3 && lastTick.current !== remaining) {
      lastTick.current = remaining;
      if (!muted) beep('tick');
    }
  }, [rest, remainingMs, remaining, muted, clearRest]);

  if (!rest) return null;

  return (
    <motion.div
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 120, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
      className={`bottom-safe pointer-events-none fixed inset-x-0 z-[70] flex justify-center px-4 ${
        playerOpen ? '' : 'mb-[72px]'
      }`}
    >
      <div
        className="pointer-events-auto flex w-full max-w-[398px] items-center gap-4 rounded-bento p-3 pr-4 text-white shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
        style={{ background: '#16161a' }}
        role="timer"
        aria-live="polite"
      >
        <div className="relative h-[104px] w-[104px] shrink-0">
          <svg viewBox="0 0 104 104" className="h-full w-full -rotate-90">
            <circle cx="52" cy="52" r={R} fill="none" stroke="white" strokeOpacity="0.12" strokeWidth="8" />
            <motion.circle
              cx="52"
              cy="52"
              r={R}
              fill="none"
              stroke="rgb(var(--accent))"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={C}
              initial={false}
              animate={{ strokeDashoffset: C * (1 - progress) }}
              transition={{ duration: 0.2, ease: 'linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              key={remaining <= 3 ? remaining : 'n'}
              initial={remaining <= 3 ? { scale: 1.25 } : false}
              animate={{ scale: 1 }}
              className="font-mono text-2xl font-bold tabular-nums"
            >
              {formatClock(remaining)}
            </motion.span>
            <span className="text-[10px] uppercase tracking-wider text-white/50">отдых</span>
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-white/50">Далее</p>
          <p className="truncate text-sm font-semibold">{rest.label}</p>
          <div className="mt-2.5 flex gap-1.5">
            <button
              type="button"
              onClick={() => adjustRest(-15)}
              className="h-9 flex-1 rounded-full bg-white/10 text-sm font-semibold"
            >
              −15с
            </button>
            <button
              type="button"
              onClick={() => adjustRest(15)}
              className="h-9 flex-1 rounded-full bg-white/10 text-sm font-semibold"
            >
              +15с
            </button>
            <button
              type="button"
              onClick={clearRest}
              aria-label="Пропустить отдых"
              className="flex h-9 flex-1 items-center justify-center rounded-full bg-accent"
            >
              <SkipForward size={16} fill="currentColor" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
