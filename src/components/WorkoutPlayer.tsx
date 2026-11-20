import { memo, useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeftRight,
  Check,
  ChevronDown,
  Clock,
  Flag,
  Gauge,
  History,
  Lightbulb,
  Minus,
  Plus,
  RotateCcw,
  Settings2,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { buildWeek, formatRest, getWorkout, todayKey, type AppliedExercise } from '../data/schedule';
import { EQUIPMENT_LABEL, type Equipment } from '../data/workouts';
import { useNow } from '../lib/useNow';
import { unlockAudio } from '../lib/sound';
import { native } from '../lib/native';
import {
  findLastExercise,
  formatClock,
  formatKg,
  holdSeconds,
  num,
  parseReps,
  progressionHint,
  setScore,
  toLogged,
  type LoggedSet,
  type PlayerSettings,
  type SetEntry,
} from '../lib/training';
import { HoldTimer } from './HoldTimer';

const isPureHold = (reps: string) => /^\s*\d+\s*с\s*$/.test(reps);

/* ---------- Шапка ---------- */

function useTrainingWindow(workoutId: string) {
  const plan = useAppStore((s) => s.plan);
  return useMemo(() => {
    const day = buildWeek(plan).find((d) => d.day === todayKey());
    if (!day || day.workoutId !== workoutId || !day.window) return null;
    const m = day.window.match(/(\d{1,2}):(\d{2})\s*[–-]\s*(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const end = new Date();
    end.setHours(+m[3], +m[4], 0, 0);
    return { label: `${m[3]}:${m[4]}`, end: end.getTime() };
  }, [plan, workoutId]);
}

function PlayerHeader({
  title,
  startedAt,
  workoutId,
  done,
  total,
  onMinimize,
  onFinish,
  onSettings,
  showSettings,
}: {
  title: string;
  startedAt: number;
  workoutId: string;
  done: number;
  total: number;
  onMinimize: () => void;
  onFinish: () => void;
  onSettings: () => void;
  showSettings: boolean;
}) {
  const now = useNow(1000);
  const muted = useAppStore((s) => s.settings.muted);
  const setSettings = useAppStore((s) => s.setSettings);
  const win = useTrainingWindow(workoutId);
  const winLeft = win ? Math.floor((win.end - now) / 1000) : null;

  const iconBtn = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full';

  return (
    <header className="pt-safe sticky top-0 z-10 -mx-4 px-4 pb-3 backdrop-blur-xl" style={{ background: 'var(--sheet-bg)' }}>
      <div className="flex items-center gap-2 pt-1">
        <button type="button" onClick={onMinimize} aria-label="Свернуть плеер" className={iconBtn} style={{ background: 'var(--chip-bg)' }}>
          <ChevronDown size={20} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-xs text-muted">{title}</p>
          <p className="font-mono text-2xl font-bold tabular-nums leading-tight" aria-label="Время тренировки">
            {formatClock((now - startedAt) / 1000)}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            unlockAudio();
            setSettings({ muted: !muted });
          }}
          aria-label={muted ? 'Включить звук' : 'Выключить звук'}
          className={`${iconBtn} ${muted ? 'text-muted' : 'text-accent'}`}
          style={{ background: 'var(--chip-bg)' }}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        {showSettings && (
          <button type="button" onClick={onSettings} aria-label="Настройки гантелей" className={iconBtn} style={{ background: 'var(--chip-bg)' }}>
            <Settings2 size={18} />
          </button>
        )}
        <button type="button" onClick={onFinish} aria-label="Завершить тренировку" className={`${iconBtn} bg-accent text-white`}>
          <Flag size={17} />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--chip-bg)' }}>
          <motion.div
            className="h-full rounded-full bg-accent"
            initial={false}
            animate={{ width: `${total ? (done / total) * 100 : 0}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 30 }}
          />
        </div>
        <span className="text-xs font-semibold tabular-nums text-muted">
          {done}/{total}
        </span>
        {winLeft !== null && (
          <span
            className={`chip !py-1 text-[11px] tabular-nums ${
              winLeft <= 0 ? '!bg-accent text-white' : winLeft < 15 * 60 ? 'text-accent' : ''
            }`}
          >
            <Clock size={11} />
            {winLeft > 0 ? `до ${win!.label} · ${formatClock(winLeft)}` : `окно до ${win!.label} закрыто`}
          </span>
        )}
      </div>
    </header>
  );
}

/* ---------- Подход ---------- */

function CheckButton({ done, onClick }: { done: boolean; onClick: () => void }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.85 }}
      onClick={onClick}
      aria-label={done ? 'Отменить подход' : 'Подход выполнен'}
      aria-pressed={done}
      className="relative flex h-11 w-11 items-center justify-center rounded-full"
      animate={{ backgroundColor: done ? 'rgb(224, 90, 51)' : 'rgba(128, 128, 138, 0.16)' }}
      transition={{ duration: 0.2 }}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <motion.path
          key={done ? 'on' : 'off'}
          d="M5 12.5l4.5 4.5L19 7.5"
          stroke={done ? '#fff' : 'rgb(var(--muted))'}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={20}
          initial={{ strokeDashoffset: done ? 20 : 0 }}
          animate={{ strokeDashoffset: 0 }}
          style={{ opacity: done ? 1 : 0.45 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        />
      </svg>
      <AnimatePresence>
        {done && (
          <motion.span
            key="ring"
            className="absolute inset-0 rounded-full border-2 border-accent"
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: 1.6, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          />
        )}
      </AnimatePresence>
    </motion.button>
  );
}

function Field({
  value,
  placeholder,
  onChange,
  label,
  disabled,
  invalid,
}: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  label: string;
  disabled: boolean;
  invalid?: boolean;
}) {
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      aria-label={label}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, '').slice(0, 5))}
      className={`h-11 w-full min-w-0 rounded-xl bg-transparent text-center text-base font-semibold tabular-nums outline-none transition-colors placeholder:font-normal placeholder:text-muted/60 focus:ring-2 focus:ring-accent/60 disabled:opacity-100 ${
        invalid ? 'ring-2 ring-accent' : ''
      }`}
      style={{ background: disabled ? 'transparent' : 'var(--chip-bg)' }}
    />
  );
}

const SetRow = memo(function SetRow({
  index,
  entry,
  prev,
  fallback,
  weighted,
  timed,
  isPR,
  onChange,
  onToggle,
}: {
  index: number;
  entry: SetEntry;
  prev: LoggedSet | null;
  fallback: SetEntry | null;
  weighted: boolean;
  timed: boolean;
  isPR: boolean;
  onChange: (index: number, patch: Partial<SetEntry>) => void;
  onToggle: (index: number, placeholders: { weight: string; reps: string }) => boolean;
}) {
  const [invalid, setInvalid] = useState(false);
  const phWeight = prev?.weight ? formatKg(prev.weight) : fallback?.weight || (weighted ? 'кг' : '—');
  const phReps = prev?.reps ? String(prev.reps) : fallback?.reps || (timed ? 'сек' : 'повт');

  return (
    <motion.div
      layout
      className={`grid grid-cols-[28px_1fr_1fr_52px_44px] items-center gap-2 rounded-2xl px-1 py-1 transition-colors ${
        entry.done ? 'bg-accent/10' : ''
      }`}
    >
      <span className="flex items-center justify-center text-sm font-bold text-muted">
        {isPR ? <Trophy size={15} className="text-accent" aria-label="Рекорд" /> : index + 1}
      </span>
      <Field
        label={`Вес, подход ${index + 1}`}
        value={entry.weight}
        placeholder={phWeight}
        disabled={entry.done}
        onChange={(weight) => onChange(index, { weight })}
      />
      <Field
        label={`${timed ? 'Секунды' : 'Повторы'}, подход ${index + 1}`}
        value={entry.reps}
        placeholder={phReps}
        disabled={entry.done}
        invalid={invalid}
        onChange={(reps) => {
          setInvalid(false);
          onChange(index, { reps });
        }}
      />
      <Field
        label={`RPE, подход ${index + 1}`}
        value={entry.rpe}
        placeholder="RPE"
        disabled={entry.done}
        onChange={(rpe) => onChange(index, { rpe })}
      />
      <CheckButton
        done={entry.done}
        onClick={() => {
          const ok = onToggle(index, {
            weight: /\d/.test(phWeight) ? phWeight : '',
            reps: /\d/.test(phReps) ? phReps : '',
          });
          if (!ok) {
            setInvalid(true);
            native.vibrate(40);
          }
        }}
      />
    </motion.div>
  );
});

/* ---------- Подсказка прогрессии ---------- */

function HintCard({ title, text, kind, when }: { title: string; text: string; kind: string; when: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`mt-3 flex gap-2.5 rounded-2xl p-3 ${kind === 'weight' ? 'bg-accent/10' : 'bg-accent text-white'}`}
    >
      <Lightbulb size={16} className={`mt-0.5 shrink-0 ${kind === 'weight' ? 'text-accent' : ''}`} />
      <div className="min-w-0 text-[13px] leading-snug">
        <p className="font-bold">
          {when}: {title}
        </p>
        <p className={kind === 'weight' ? 'text-muted' : 'text-white/85'}>{text}</p>
      </div>
    </motion.div>
  );
}

/* ---------- Упражнение ---------- */

function ExerciseCard({
  ex,
  index,
  name,
  swapped,
  equipment,
  entries,
  settings,
  onSwap,
  onSetDone,
}: {
  ex: AppliedExercise;
  index: number;
  name: string;
  swapped: boolean;
  equipment: Equipment;
  entries: SetEntry[];
  settings: PlayerSettings;
  onSwap: () => void;
  onSetDone: (exerciseId: string, setIndex: number) => void;
}) {
  const history = useAppStore((s) => s.history);
  const record = useAppStore((s) => s.records[name]);
  const updateSet = useAppStore((s) => s.updateSet);
  const addSet = useAppStore((s) => s.addSet);

  const last = useMemo(() => findLastExercise(history, name), [history, name]);
  const range = parseReps(ex.reps);
  const hold = holdSeconds(ex.reps, name);
  const timed = isPureHold(ex.reps);
  const weighted = equipment !== 'band' && ex.kind !== 'core';
  const doneCount = entries.filter((e) => e.done).length;
  const complete = doneCount >= entries.length && entries.length > 0;

  const hint = useMemo(() => {
    if (equipment !== 'home') return null;
    const current = toLogged(entries);
    if (complete) {
      const h = progressionHint(current, ex.sets, range, settings);
      return h ? { ...h, when: 'В следующий раз' } : null;
    }
    if (!last) return null;
    const h = progressionHint(last.sets, ex.sets, range, settings);
    return h ? { ...h, when: 'Сегодня' } : null;
  }, [equipment, entries, complete, last, ex.sets, range?.min, range?.max, settings]);

  const onChange = useCallback(
    (i: number, patch: Partial<SetEntry>) => updateSet(ex.id, i, patch),
    [updateSet, ex.id],
  );

  const onToggle = useCallback(
    (i: number, ph: { weight: string; reps: string }) => {
      unlockAudio();
      const entry = entries[i];
      if (entry.done) {
        updateSet(ex.id, i, { done: false });
        return true;
      }
      const reps = entry.reps || ph.reps;
      if (!num(reps)) return false;
      updateSet(ex.id, i, { done: true, reps, weight: entry.weight || ph.weight });
      native.vibrate(25);
      onSetDone(ex.id, i);
      return true;
    },
    [entries, updateSet, ex.id, onSetDone],
  );

  const onHoldComplete = useCallback(
    (sec: number) => {
      if (!timed) return;
      const i = entries.findIndex((e) => !e.done);
      if (i < 0) return;
      updateSet(ex.id, i, { done: true, reps: String(sec) });
      onSetDone(ex.id, i);
    },
    [timed, entries, updateSet, ex.id, onSetDone],
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.24) }}
      className={`card !p-4 ${complete ? 'ring-1 ring-accent/40' : ''}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            complete ? 'bg-accent text-white' : ''
          }`}
          style={!complete ? { background: 'var(--chip-bg)' } : undefined}
        >
          {complete ? <Check size={16} strokeWidth={3} /> : index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{name}</p>
          {swapped && <p className="mt-0.5 text-xs text-muted line-through">{ex.name}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            <span className="font-bold text-ink">
              {ex.sets}×{ex.reps}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} /> {formatRest(ex.rest)}
            </span>
            <span className="flex items-center gap-1">
              <Gauge size={12} /> RPE {ex.rpe}
            </span>
            {ex.tempo && <span>темп {ex.tempo}</span>}
          </div>
          {(ex.superset || ex.note) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ex.superset && <span className="chip !py-1 text-[11px]">Суперсет</span>}
              {ex.note && <span className="chip !py-1 text-[11px] text-accent">{ex.note}</span>}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onSwap}
          aria-label="Заменить упражнение"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${swapped ? 'bg-accent text-white' : 'text-muted'}`}
          style={!swapped ? { background: 'var(--chip-bg)' } : undefined}
        >
          <ArrowLeftRight size={16} />
        </button>
      </div>

      <div className="mt-3 flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px]" style={{ background: 'var(--chip-bg)' }}>
        <History size={13} className="shrink-0 text-muted" />
        {last ? (
          <span className="min-w-0 truncate">
            <span className="text-muted">Прошлый раз: </span>
            <span className="font-semibold tabular-nums">
              {last.sets.map((s) => (s.weight ? `${formatKg(s.weight)}×${s.reps}` : `${s.reps}${timed ? 'с' : ''}`)).join(' · ')}
            </span>
          </span>
        ) : (
          <span className="text-muted">Прошлый результат: — (первая тренировка)</span>
        )}
        {record && (
          <span className="ml-auto flex shrink-0 items-center gap-1 pl-2 font-semibold text-accent">
            <Trophy size={12} />
            {record.weight ? `${formatKg(record.weight)}×${record.reps}` : record.reps}
          </span>
        )}
      </div>

      {hint && <HintCard {...hint} />}

      <div className="mt-3 grid grid-cols-[28px_1fr_1fr_52px_44px] gap-2 px-1 text-center text-[10px] font-semibold uppercase tracking-wide text-muted">
        <span>#</span>
        <span>{weighted ? 'Вес, кг' : 'Доп. кг'}</span>
        <span>{timed ? 'Сек' : 'Повт.'}</span>
        <span>RPE</span>
        <span />
      </div>
      <div className="mt-1 flex flex-col gap-1">
        {entries.map((entry, i) => {
          const prevEntry = i > 0 ? entries[i - 1] : null;
          const done = entry.done ? { weight: num(entry.weight), reps: num(entry.reps) } : null;
          const isPR =
            !!done &&
            !!record &&
            done.reps > 0 &&
            (() => {
              const sc = setScore(done.weight, done.reps);
              return sc.kind === record.kind ? sc.score > record.score + 1e-9 : sc.kind === 'load';
            })();
          return (
            <SetRow
              key={i}
              index={i}
              entry={entry}
              prev={last?.sets[i] ?? last?.sets[last.sets.length - 1] ?? null}
              fallback={prevEntry}
              weighted={weighted}
              timed={timed}
              isPR={isPR}
              onChange={onChange}
              onToggle={onToggle}
            />
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => addSet(ex.id)}
        className="mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-full text-xs font-semibold text-muted"
        style={{ background: 'var(--chip-bg)' }}
      >
        <Plus size={14} /> Добавить подход
      </button>

      {hold !== null && <HoldTimer defaultSec={hold} muted={settings.muted} onComplete={onHoldComplete} />}
    </motion.section>
  );
}

/* ---------- Нижние листы ---------- */

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[430px] rounded-t-[30px] p-5 pb-[max(env(safe-area-inset-bottom),20px)] backdrop-blur-xl"
        style={{ background: 'var(--sheet-bg)' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: 'var(--chip-bg)' }}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function SwapSheet({
  ex,
  current,
  equipment,
  onPick,
  onClose,
}: {
  ex: AppliedExercise;
  current: string;
  equipment: Equipment;
  onPick: (name: string | null) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title="Заменить упражнение" onClose={onClose}>
      <span className={`chip mb-3 ${equipment === 'band' ? '!bg-accent text-white' : ''}`}>
        Только аналоги: {EQUIPMENT_LABEL[equipment]}
      </span>
      <div className="flex flex-col gap-1.5">
        {[ex.name, ...ex.alts].map((alt) => {
          const active = alt === current;
          return (
            <button
              key={alt}
              type="button"
              onClick={() => onPick(alt === ex.name ? null : alt)}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 text-left text-sm ${
                active ? 'bg-accent/15 font-semibold text-accent' : ''
              }`}
              style={!active ? { background: 'var(--chip-bg)' } : undefined}
            >
              <span className="flex items-center gap-2">
                {alt === ex.name && <RotateCcw size={13} className="text-muted" />}
                {alt}
              </span>
              {active && <Check size={16} />}
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}

function Stepper({
  label,
  value,
  step,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v * 10) / 10)));
  return (
    <div className="flex items-center justify-between rounded-2xl p-2 pl-4" style={{ background: 'var(--chip-bg)' }}>
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button" aria-label={`${label}: меньше`} onClick={() => set(value - step)} className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--card-bg)' }}>
          <Minus size={16} />
        </button>
        <span className="w-16 text-center font-mono text-base font-bold tabular-nums">{formatKg(value)} кг</span>
        <button type="button" aria-label={`${label}: больше`} onClick={() => set(value + step)} className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--card-bg)' }}>
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

function SettingsSheet({ onClose }: { onClose: () => void }) {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  return (
    <Sheet title="Гантели дома" onClose={onClose}>
      <div className="flex flex-col gap-2">
        <Stepper label="Максимум гантели" value={settings.maxDumbbellKg} step={1} min={2} max={80} onChange={(maxDumbbellKg) => setSettings({ maxDumbbellKg })} />
        <Stepper label="Шаг веса" value={settings.dumbbellStepKg} step={0.5} min={0.5} max={10} onChange={(dumbbellStepKg) => setSettings({ dumbbellStepKg })} />
      </div>
      <p className="mt-3 text-xs leading-snug text-muted">
        Если шаг больше 10% рабочего веса или гантели на максимуме, плеер предложит прогрессию повторами (+2) или темпом 3-1-1.
      </p>
    </Sheet>
  );
}

function FinishSheet({
  done,
  total,
  onFinish,
  onDiscard,
  onClose,
}: {
  done: number;
  total: number;
  onFinish: () => void;
  onDiscard: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet title="Завершить тренировку?" onClose={onClose}>
      <p className="text-sm text-muted">
        {done === 0
          ? 'Ни одного подхода не отмечено — сохранять нечего.'
          : done < total
            ? `Выполнено ${done} из ${total} подходов. Невыполненные не попадут в историю.`
            : 'Все подходы выполнены. Отличная работа!'}
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {done > 0 && (
          <button type="button" onClick={onFinish} className="flex h-12 items-center justify-center gap-2 rounded-full bg-accent font-semibold text-white">
            <Flag size={17} /> Сохранить и завершить
          </button>
        )}
        <button type="button" onClick={onClose} className="h-12 rounded-full font-semibold" style={{ background: 'var(--chip-bg)' }}>
          Продолжить тренировку
        </button>
        <button type="button" onClick={onDiscard} className="h-11 rounded-full text-sm font-semibold text-accent">
          Отменить без сохранения
        </button>
      </div>
    </Sheet>
  );
}

/* ---------- Плеер ---------- */

export function WorkoutPlayer() {
  const session = useAppStore((s) => s.session);
  const swaps = useAppStore((s) => s.swaps);
  const settings = useAppStore((s) => s.settings);
  const setSwap = useAppStore((s) => s.setSwap);
  const setPlayerOpen = useAppStore((s) => s.setPlayerOpen);
  const startRest = useAppStore((s) => s.startRest);
  const finishSession = useAppStore((s) => s.finishSession);
  const endSession = useAppStore((s) => s.endSession);

  const [swapFor, setSwapFor] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'settings' | 'finish' | null>(null);

  const workoutId = session?.workoutId;
  const phase = session?.phase;
  const workout = useMemo(() => (workoutId && phase ? getWorkout(workoutId, phase) : null), [workoutId, phase]);

  const nameOf = useCallback(
    (ex: AppliedExercise) => (session ? swaps[`${session.workoutId}:${ex.id}`] : undefined) ?? ex.name,
    [swaps, session],
  );

  const onSetDone = useCallback(
    (exerciseId: string, setIndex: number) => {
      const s = useAppStore.getState().session;
      if (!s || !workout) return;
      const exIdx = workout.exercises.findIndex((e) => e.id === exerciseId);
      const ex = workout.exercises[exIdx];
      const list = s.entries[exerciseId] ?? [];
      const nextHere = list.findIndex((e, i) => i !== setIndex && !e.done);
      let label: string | null = null;
      if (nextHere >= 0) label = `${nameOf(ex)} · подход ${nextHere + 1}`;
      else {
        const order = [...workout.exercises.slice(exIdx + 1), ...workout.exercises.slice(0, exIdx)];
        const next = order.find((e) => (s.entries[e.id] ?? []).some((x) => !x.done));
        if (next) label = nameOf(next);
      }
      if (label) startRest(ex.rest, label);
      native.requestNotifications().catch(() => undefined);
    },
    [workout, nameOf, startRest],
  );

  if (!session || !workout) return null;

  const all = Object.values(session.entries).flat();
  const done = all.filter((e) => e.done).length;
  const swapEx = swapFor ? workout.exercises.find((e) => e.id === swapFor) : null;

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', stiffness: 320, damping: 36 }}
      className="app-bg fixed inset-0 z-[60] flex justify-center"
    >
      <div className="no-scrollbar h-full w-full max-w-[430px] overflow-y-auto px-4 pb-48">
        <PlayerHeader
          title={workout.title}
          startedAt={session.startedAt}
          workoutId={session.workoutId}
          done={done}
          total={all.length}
          onMinimize={() => setPlayerOpen(false)}
          onFinish={() => setSheet('finish')}
          onSettings={() => setSheet('settings')}
          showSettings={session.equipment === 'home'}
        />

        <div className="mb-3 mt-1 flex flex-wrap gap-1.5">
          <span className={`chip ${session.equipment === 'band' ? '!bg-accent text-white' : ''}`}>{EQUIPMENT_LABEL[session.equipment]}</span>
          <span className="chip">{workout.focus}</span>
        </div>

        <div className="flex flex-col gap-3">
          {workout.exercises.map((ex, i) => (
            <ExerciseCard
              key={ex.id}
              ex={ex}
              index={i}
              name={nameOf(ex)}
              swapped={nameOf(ex) !== ex.name}
              equipment={session.equipment}
              entries={session.entries[ex.id] ?? []}
              settings={settings}
              onSwap={() => setSwapFor(ex.id)}
              onSetDone={onSetDone}
            />
          ))}

          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => setSheet('finish')}
            className="mt-1 flex h-14 items-center justify-center gap-2 rounded-full bg-accent text-base font-semibold text-white shadow-[0_10px_30px_rgba(224,90,51,0.35)]"
          >
            <Flag size={18} /> Завершить тренировку
          </motion.button>
        </div>
      </div>

      <AnimatePresence>
        {swapEx && (
          <SwapSheet
            key="swap"
            ex={swapEx}
            current={nameOf(swapEx)}
            equipment={session.equipment}
            onPick={(name) => {
              setSwap(`${session.workoutId}:${swapEx.id}`, name);
              setSwapFor(null);
            }}
            onClose={() => setSwapFor(null)}
          />
        )}
        {sheet === 'settings' && <SettingsSheet key="settings" onClose={() => setSheet(null)} />}
        {sheet === 'finish' && (
          <FinishSheet
            key="finish"
            done={done}
            total={all.length}
            onClose={() => setSheet(null)}
            onFinish={() => {
              setSheet(null);
              finishSession();
            }}
            onDiscard={() => {
              setSheet(null);
              endSession();
            }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
