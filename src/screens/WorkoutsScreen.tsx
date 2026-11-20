import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeftRight,
  CalendarClock,
  Check,
  Clock,
  Dumbbell,
  Flame,
  Footprints,
  Gauge,
  Home,
  Moon,
  Play,
  RotateCcw,
  Timer,
  Building2,
  Cable,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Segmented } from '../components/Segmented';
import { EQUIPMENT_LABEL, type Equipment } from '../data/workouts';
import {
  DAY_FULL,
  DAY_SHORT,
  PHASES,
  buildWeek,
  formatRest,
  getWorkout,
  todayKey,
  type AppliedExercise,
  type DayKey,
  type DayPlan,
  type Day4Day,
  type Phase,
  type WeekendDay,
} from '../data/schedule';

const EQUIP_ICON: Record<Equipment, typeof Home> = { home: Home, gym: Building2, band: Cable };

function EquipBadge({ eq }: { eq: Equipment }) {
  const Icon = EQUIP_ICON[eq];
  return (
    <span className={`chip ${eq === 'band' ? '!bg-accent text-white' : 'text-ink'}`}>
      <Icon size={13} />
      {EQUIPMENT_LABEL[eq]}
    </span>
  );
}

/* ---------- Активная сессия ---------- */

function useElapsed(startedAt: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - startedAt) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function SessionBanner({ title, startedAt, onOpen }: { title: string; startedAt: number; onOpen: () => void }) {
  const elapsed = useElapsed(startedAt);
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      aria-label="Открыть плеер тренировки"
      className="card flex items-center gap-3 !border-transparent !bg-accent !p-4 text-left text-white"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20">
        <Timer size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-white/75">Идёт тренировка</p>
        <p className="truncate font-semibold">{title}</p>
      </div>
      <span className="font-mono text-lg font-bold tabular-nums">{elapsed}</span>
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-accent">
        <Play size={16} fill="currentColor" />
      </span>
    </motion.button>
  );
}

/* ---------- Неделя ---------- */

function WeekStrip({
  week,
  selected,
  today,
  onSelect,
}: {
  week: DayPlan[];
  selected: DayKey;
  today: DayKey;
  onSelect: (d: DayKey) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {week.map((d) => {
        const active = d.day === selected;
        return (
          <button
            key={d.day}
            type="button"
            onClick={() => onSelect(d.day)}
            className="relative flex flex-col items-center gap-1.5 rounded-[18px] py-2.5"
          >
            {active && (
              <motion.span
                layoutId="week-pill"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-[18px]"
                style={{ background: 'var(--nav-bg)' }}
              />
            )}
            <span
              className={`relative z-10 text-[11px] font-semibold ${
                active ? 'text-white' : d.day === today ? 'text-accent' : 'text-muted'
              }`}
            >
              {DAY_SHORT[d.day]}
            </span>
            <span
              className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full ${
                d.kind === 'workout'
                  ? d.equipment === 'band'
                    ? 'border-2 border-accent text-accent'
                    : 'bg-accent text-white'
                  : active
                    ? 'bg-white/15 text-white'
                    : 'text-muted'
              }`}
              style={d.kind !== 'workout' && !active ? { background: 'var(--chip-bg)' } : undefined}
            >
              {d.kind === 'workout' ? (
                <Dumbbell size={13} />
              ) : d.kind === 'active' ? (
                <Footprints size={13} />
              ) : (
                <Moon size={13} />
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Упражнение ---------- */

function ExerciseRow({
  ex,
  index,
  swapKey,
}: {
  ex: AppliedExercise;
  index: number;
  swapKey: string;
}) {
  const swapped = useAppStore((s) => s.swaps[swapKey]);
  const setSwap = useAppStore((s) => s.setSwap);
  const [open, setOpen] = useState(false);
  const name = swapped ?? ex.name;

  return (
    <div className="card !p-4">
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
          style={{ background: 'var(--chip-bg)' }}
        >
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-snug">{name}</p>
          {swapped && <p className="mt-0.5 text-xs text-muted line-through">{ex.name}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
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
          {(ex.modifiers.length > 0 || ex.note || ex.superset) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ex.superset && <span className="chip !py-1 text-[11px]">Суперсет</span>}
              {ex.note && <span className="chip !py-1 text-[11px] text-accent">{ex.note}</span>}
              {ex.modifiers.map((m) => (
                <span key={m} className="chip !py-1 text-[11px] text-accent">
                  {m}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Заменить упражнение"
          aria-expanded={open}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
            open || swapped ? 'bg-accent text-white' : 'text-muted'
          }`}
          style={!(open || swapped) ? { background: 'var(--chip-bg)' } : undefined}
        >
          <ArrowLeftRight size={16} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <p className="mb-2 mt-4 text-xs font-medium text-muted">Замена в рамках текущего инвентаря</p>
            <div className="flex flex-col gap-1.5">
              {[ex.name, ...ex.alts].map((alt) => {
                const current = alt === name;
                return (
                  <button
                    key={alt}
                    type="button"
                    onClick={() => {
                      setSwap(swapKey, alt === ex.name ? null : alt);
                      setOpen(false);
                    }}
                    className={`flex items-center justify-between rounded-2xl px-3.5 py-2.5 text-left text-sm ${
                      current ? 'bg-accent/15 font-semibold text-accent' : ''
                    }`}
                    style={!current ? { background: 'var(--chip-bg)' } : undefined}
                  >
                    <span className="flex items-center gap-2">
                      {alt === ex.name && <RotateCcw size={13} className="text-muted" />}
                      {alt}
                    </span>
                    {current && <Check size={16} />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Экран ---------- */

export function WorkoutsScreen() {
  const plan = useAppStore((s) => s.plan);
  const setPlan = useAppStore((s) => s.setPlan);
  const session = useAppStore((s) => s.session);
  const startSession = useAppStore((s) => s.startSession);
  const setPlayerOpen = useAppStore((s) => s.setPlayerOpen);

  const today = todayKey();
  const [selected, setSelected] = useState<DayKey>(today);
  const week = useMemo(() => buildWeek(plan), [plan]);
  const day = week.find((d) => d.day === selected)!;
  const workout = day.workoutId ? getWorkout(day.workoutId, plan.phase) : null;
  const phase = PHASES[plan.phase];

  const moveDay4 = (to: Day4Day) => {
    if (plan.fridayBusy) setPlan({ bandDay: to as WeekendDay });
    else setPlan({ day4Day: to });
    setSelected(to);
  };

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence>
        {session && (
          <SessionBanner
            key="session"
            title={getWorkout(session.workoutId, session.phase).title}
            startedAt={session.startedAt}
            onOpen={() => setPlayerOpen(true)}
          />
        )}
      </AnimatePresence>

      {/* Переключатели */}
      <div className="card flex flex-col gap-2.5 !p-3">
        <Segmented
          id="location"
          value={plan.location}
          onChange={(location) => setPlan({ location })}
          options={[
            { value: 'home', label: 'Дом' },
            { value: 'gym', label: 'Зал 100% Fitness' },
          ]}
        />
        <Segmented<Phase>
          id="phase"
          value={plan.phase}
          onChange={(p) => setPlan({ phase: p })}
          options={[
            { value: 'cut', label: 'Сушка' },
            { value: 'maintain', label: 'Удержание' },
            { value: 'bulk', label: 'Набор' },
          ]}
        />
        <Segmented
          id="friday"
          tone={plan.fridayBusy ? 'warn' : 'default'}
          value={plan.fridayBusy ? 'busy' : 'free'}
          onChange={(v) => setPlan({ fridayBusy: v === 'busy' })}
          options={[
            { value: 'free', label: 'Пятница СВОБОДНА' },
            { value: 'busy', label: 'Пятница ЗАНЯТА' },
          ]}
        />
        <p className="px-2 pt-0.5 text-[11px] leading-snug text-muted">
          {plan.location === 'home' ? EQUIPMENT_LABEL.home : 'Тренажёрный зал 1100 м², 24/7'}
          {plan.fridayBusy && ' · Сб и Вс — только резинки + свой вес'}
        </p>
      </div>

      {/* Этап */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card !p-4">
          <Flame size={18} className="text-accent" />
          <p className="mt-3 text-[11px] text-muted">Этап</p>
          <p className="text-sm font-bold leading-tight">{phase.label}</p>
        </div>
        <div className="card !p-4">
          <Gauge size={18} className="text-accent" />
          <p className="mt-3 text-[11px] text-muted">RPE</p>
          <p className="text-sm font-bold">{phase.rpe}</p>
        </div>
        <div className="card !p-4">
          <Footprints size={18} className="text-accent" />
          <p className="mt-3 text-[11px] text-muted">Шаги</p>
          <p className="text-sm font-bold leading-tight">{phase.steps}</p>
        </div>
      </div>
      <p className="-mt-1 px-2 text-xs text-muted">
        {phase.note}
        {phase.liss && ` · ${phase.liss} (Вт + выходной)`}
      </p>

      {/* Неделя */}
      <div className="card !p-2">
        <WeekStrip week={week} selected={selected} today={today} onSelect={setSelected} />
      </div>

      {/* День */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${selected}-${day.workoutId ?? day.kind}-${plan.phase}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-3"
        >
          <div className="card">
            <p className="text-sm text-muted">
              {DAY_FULL[day.day]}
              {day.day === today && ' · сегодня'}
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">{day.title}</h2>
            {workout && <p className="mt-0.5 text-sm text-muted">{workout.focus}</p>}

            <div className="mt-3 flex flex-wrap gap-1.5">
              {day.window && (
                <span className="chip">
                  <CalendarClock size={13} /> {day.window}
                </span>
              )}
              {day.equipment && <EquipBadge eq={day.equipment} />}
            </div>

            {day.activities.length > 0 && (
              <ul className="mt-4 flex flex-col gap-2">
                {day.activities.map((a) => (
                  <li key={a} className="flex items-center gap-2 text-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {a}
                  </li>
                ))}
              </ul>
            )}

            {day.moveOptions && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-muted">Гибкий перенос</p>
                <div className="flex gap-2">
                  {day.moveOptions.map((d) => {
                    const here = d === day.day;
                    return (
                      <button
                        key={d}
                        type="button"
                        disabled={here}
                        onClick={() => moveDay4(d)}
                        className={`flex-1 rounded-full py-2 text-sm font-semibold transition-colors ${
                          here ? 'bg-accent text-white' : 'text-ink'
                        }`}
                        style={!here ? { background: 'var(--chip-bg)' } : undefined}
                      >
                        {DAY_SHORT[d]}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {workout && (
            <>
              {workout.exercises.map((ex, i) => (
                <ExerciseRow key={ex.id} ex={ex} index={i} swapKey={`${workout.id}:${ex.id}`} />
              ))}

              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => (session ? setPlayerOpen(true) : startSession(workout.id))}
                className="mt-1 flex h-14 items-center justify-center gap-2 rounded-full bg-accent text-base font-semibold text-white shadow-[0_10px_30px_rgba(224,90,51,0.35)]"
              >
                <Play size={18} fill="currentColor" />
                {session
                  ? session.workoutId === workout.id
                    ? 'Вернуться к тренировке'
                    : 'Сначала завершите текущую'
                  : 'Начать тренировку'}
              </motion.button>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
