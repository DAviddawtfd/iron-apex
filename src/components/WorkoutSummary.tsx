import { useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Clock, Dumbbell, Layers, Trophy, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PHASES } from '../data/schedule';
import { bestSet, formatClock, formatKg, formatTonnage, tonnageOf } from '../lib/training';

const fmtSet = (w: number, r: number) => (w ? `${formatKg(w)}×${r}` : `${r}`);

function fireConfetti(big: boolean) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const colors = ['#E05A33', '#FFFFFF', '#7A8796', '#FFB199'];
  confetti({ particleCount: big ? 140 : 90, spread: 80, startVelocity: 45, origin: { y: 0.65 }, colors, zIndex: 100 });
  if (big) {
    window.setTimeout(() => {
      confetti({ particleCount: 60, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors, zIndex: 100 });
      confetti({ particleCount: 60, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors, zIndex: 100 });
    }, 350);
  }
}

export function WorkoutSummary() {
  const log = useAppStore((s) => s.summary);
  const close = useAppStore((s) => s.closeSummary);

  useEffect(() => {
    if (log) fireConfetti(log.prs.length > 0);
    return () => {
      confetti.reset();
    };
  }, [log]);

  if (!log) return null;

  const stats = [
    { icon: Clock, label: 'Время', value: formatClock(log.durationSec) },
    { icon: Dumbbell, label: 'Тоннаж', value: `${formatTonnage(log.tonnage)} кг` },
    { icon: Layers, label: 'Подходы', value: String(log.totalSets) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="app-bg fixed inset-0 z-[90] flex justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Итоги тренировки"
    >
      <div className="no-scrollbar pt-safe h-full w-full max-w-[430px] overflow-y-auto px-4 pb-10">
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={close}
            aria-label="Закрыть итоги"
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: 'var(--chip-bg)' }}
          >
            <X size={20} />
          </button>
        </div>

        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
          className="mx-auto mt-2 flex h-20 w-20 items-center justify-center rounded-full bg-accent text-white shadow-[0_12px_36px_rgba(224,90,51,0.45)]"
        >
          <Trophy size={36} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Тренировка завершена</h2>
          <p className="mt-1 text-sm text-muted">
            {log.title} · {PHASES[log.phase].label}
          </p>
        </motion.div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {stats.map(({ icon: Icon, label, value }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.07 }}
              className="card !p-4"
            >
              <Icon size={18} className="text-accent" />
              <p className="mt-3 text-[11px] text-muted">{label}</p>
              <p className="font-mono text-base font-bold tabular-nums leading-tight">{value}</p>
            </motion.div>
          ))}
        </div>

        {log.prs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="card mt-3 !border-transparent !bg-accent text-white"
          >
            <p className="flex items-center gap-2 font-bold">
              <Trophy size={18} /> Новые рекорды · {log.prs.length}
            </p>
            <ul className="mt-3 flex flex-col gap-2">
              {log.prs.map((pr) => (
                <li key={pr.name} className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate">{pr.name}</span>
                  <span className="shrink-0 font-mono tabular-nums">
                    <span className="text-white/60 line-through">{fmtSet(pr.prevWeight, pr.prevReps)}</span>{' '}
                    <span className="font-bold">{fmtSet(pr.weight, pr.reps)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="card mt-3 !p-4">
          <p className="mb-2 text-sm font-semibold">Упражнения</p>
          <ul className="flex flex-col divide-y divide-muted/15">
            {log.exercises.map((e) => {
              const best = bestSet(e.sets);
              const t = tonnageOf(e.sets);
              return (
                <li key={e.exerciseId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.name}</p>
                    <p className="text-xs text-muted">
                      {e.sets.length} подх.{t > 0 && ` · ${formatTonnage(t)} кг`}
                    </p>
                  </div>
                  {best && <span className="shrink-0 font-mono font-semibold tabular-nums">{fmtSet(best.weight, best.reps)}</span>}
                </li>
              );
            })}
          </ul>
        </motion.div>

        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={close}
          className="mt-4 flex h-14 w-full items-center justify-center rounded-full bg-accent text-base font-semibold text-white shadow-[0_10px_30px_rgba(224,90,51,0.35)]"
        >
          Готово
        </motion.button>
      </div>
    </motion.div>
  );
}
