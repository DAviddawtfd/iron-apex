import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Pause, Play, RotateCcw, Timer } from 'lucide-react';
import { useNow } from '../lib/useNow';
import { beep, unlockAudio } from '../lib/sound';
import { native } from '../lib/native';

const R = 20;
const C = 2 * Math.PI * R;

/** Таймер статики для вакуума, планки и изометрии (30–45 с) */
export function HoldTimer({
  defaultSec,
  muted,
  onComplete,
}: {
  defaultSec: number;
  muted: boolean;
  onComplete?: (sec: number) => void;
}) {
  const presets = Array.from(new Set([defaultSec, 30, 40, 45])).sort((a, b) => a - b);
  const [sec, setSec] = useState(defaultSec);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [pausedLeft, setPausedLeft] = useState<number | null>(null);
  const now = useNow(200, endsAt !== null);

  const leftMs = endsAt !== null ? Math.max(0, endsAt - now) : (pausedLeft ?? sec * 1000);
  const left = Math.ceil(leftMs / 1000);
  const progress = leftMs / (sec * 1000);

  useEffect(() => {
    if (endsAt === null || leftMs > 0) return;
    setEndsAt(null);
    setPausedLeft(null);
    if (!muted) beep('done');
    native.vibrate(250);
    onComplete?.(sec);
  }, [endsAt, leftMs, muted, onComplete, sec]);

  const toggle = () => {
    unlockAudio();
    if (endsAt !== null) {
      setPausedLeft(leftMs);
      setEndsAt(null);
    } else {
      setEndsAt(Date.now() + (pausedLeft ?? sec * 1000));
      setPausedLeft(null);
    }
  };
  const reset = () => {
    setEndsAt(null);
    setPausedLeft(null);
  };
  const idle = endsAt === null && pausedLeft === null;

  return (
    <div className="mt-3 flex items-center gap-3 rounded-2xl p-2.5" style={{ background: 'var(--chip-bg)' }}>
      <button
        type="button"
        onClick={toggle}
        aria-label={endsAt !== null ? 'Пауза статики' : 'Старт статики'}
        className="relative flex h-12 w-12 shrink-0 items-center justify-center"
      >
        <svg viewBox="0 0 48 48" className="absolute inset-0 -rotate-90">
          <circle cx="24" cy="24" r={R} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="4" />
          <motion.circle
            cx="24"
            cy="24"
            r={R}
            fill="none"
            stroke="rgb(var(--accent))"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={C}
            initial={false}
            animate={{ strokeDashoffset: C * (1 - progress) }}
            transition={{ duration: 0.2, ease: 'linear' }}
          />
        </svg>
        {endsAt !== null ? <Pause size={16} className="text-accent" /> : <Play size={16} className="ml-0.5 text-accent" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-[11px] text-muted">
          <Timer size={11} /> Статика
        </p>
        <p className="font-mono text-lg font-bold tabular-nums leading-tight">{left}с</p>
      </div>
      {idle ? (
        <div className="flex gap-1">
          {presets.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setSec(p)}
              className={`h-8 rounded-full px-2.5 text-xs font-semibold ${p === sec ? 'bg-accent text-white' : 'text-muted'}`}
            >
              {p}с
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={reset}
          aria-label="Сбросить статику"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted"
        >
          <RotateCcw size={15} />
        </button>
      )}
    </div>
  );
}
