import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Apple,
  CalendarClock,
  Check,
  Droplets,
  Dumbbell,
  Footprints,
  Lightbulb,
  Moon,
  Play,
  Ruler,
  Scale,
  Target,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Segmented } from '../components/Segmented';
import { Bar, Ring, Sheet, Stepper, n0, n1, parseNum, NumInput } from '../components/ui';
import { DayTypeBadge, MetricsSheet, useSleepDebt } from '../components/NutritionWidgets';
import { EQUIPMENT_LABEL } from '../data/workouts';
import { MODES, SLEEP_TARGET, TARGET_BF, bfGoal, latestEntry, rollingAvg, waistDelta } from '../utils/nutrition';
import { useDayNutrition, type DayNutrition } from '../utils/useDayNutrition';
import { dateKey, lastDays, weekdayShort } from '../utils/date';
import { sumMacros } from '../data/foods';

type Range = 'day' | 'week' | 'month';

/* ---------- Совет дня ---------- */

function tipOfDay(d: DayNutrition, sleepDebt: boolean, waist: number | null): { title: string; text: string } {
  if (sleepDebt) return { title: 'Сон — главный анаболик', text: 'Две ночи < 7 ч. Сегодня в кровать до 22:30: без сна в 16 лет падают тестостерон и восстановление.' };
  if (d.phase === 'cut') {
    if (d.isRefeed) return { title: 'День рефида', text: `+${n0(d.refeedBoost)} ккал строго сложными углеводами. Жиры — как обычно, белок не повышай.` };
    if (d.refeed.due) return { title: 'Пора рефид', text: `${d.refeed.daysSince} дн. сушки. Включи рефид — восполнишь гликоген и лептин.` };
    return {
      title: `Шаги: ${n0(d.steps.lo)}–${n0(d.steps.hi)}`,
      text: `Шаги жгут жир без удара по ЦНС. До рефида ${d.refeed.daysLeft} дн. — держи белок 2,2 г/кг.`,
    };
  }
  if (d.phase === 'bulk')
    return {
      title: 'Контроль талии',
      text:
        waist !== null
          ? `Талия ${waist > 0 ? '+' : ''}${n1(waist)} см от старта набора. Порог — +1 см, дальше режем углеводы.`
          : 'Замеряй талию по пупку раз в неделю утром — это главный сигнал «грязного» набора.',
    };
  return { title: 'Рекомпозиция', text: 'Лёгкий дефицит: держи силовые на уровне и спи 8–9 ч — жир уйдёт, мышцы останутся.' };
}

function TipCard({ d }: { d: DayNutrition }) {
  const waist = useAppStore((s) => s.waist);
  const phaseStart = useAppStore((s) => s.phaseStart);
  const { debt } = useSleepDebt(d.today);
  const tip = tipOfDay(d, debt, waistDelta(waist, phaseStart, d.today));
  return (
    <div className="card flex gap-3 !border-transparent !bg-accent !p-4 text-white">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
        <Lightbulb size={19} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-white/70">Совет дня · {MODES[d.phase].label}</p>
        <p className="font-semibold">{tip.title}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-white/85">{tip.text}</p>
      </div>
    </div>
  );
}

/* ---------- Быстрые действия ---------- */

function QuickActions({ d, onMetrics }: { d: DayNutrition; onMetrics: () => void }) {
  const setTab = useAppStore((s) => s.setTab);
  const addWater = useAppStore((s) => s.addWater);
  const session = useAppStore((s) => s.session);
  const setPlayerOpen = useAppStore((s) => s.setPlayerOpen);
  const [waterPing, setWaterPing] = useState(0);

  const actions = [
    {
      label: 'Тренировка',
      icon: Dumbbell,
      onClick: () => (session ? setPlayerOpen(true) : setTab('workouts')),
      active: !!session,
    },
    { label: 'Питание', icon: Apple, onClick: () => setTab('nutrition') },
    {
      label: 'Вода',
      icon: Droplets,
      onClick: () => {
        addWater(250);
        setWaterPing((n) => n + 1);
      },
    },
    { label: 'Замеры', icon: Ruler, onClick: onMetrics },
  ];

  return (
    <div className="grid grid-cols-4 gap-2">
      {actions.map(({ label, icon: Icon, onClick, active }) => (
        <motion.button key={label} whileTap={{ scale: 0.9 }} type="button" onClick={onClick} className="relative flex flex-col items-center gap-1.5">
          <span
            className={`relative flex h-[60px] w-[60px] items-center justify-center rounded-full ${active ? 'bg-accent text-white' : 'text-ink'}`}
            style={!active ? { background: 'var(--card-bg)', boxShadow: 'var(--card-shadow)', border: '1px solid var(--card-border)', backdropFilter: 'var(--card-blur)' } : undefined}
          >
            <Icon size={22} className={active ? '' : label === 'Вода' ? 'text-sky-500' : 'text-accent'} />
            {label === 'Вода' && (
              <AnimatePresence>
                {waterPing > 0 && (
                  <motion.span
                    key={waterPing}
                    initial={{ y: 0, opacity: 1 }}
                    animate={{ y: -26, opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute -top-1 text-[11px] font-bold text-sky-500"
                  >
                    +250
                  </motion.span>
                )}
              </AnimatePresence>
            )}
          </span>
          <span className="text-[11px] font-medium">{label === 'Вода' ? `${n1(d.water / 1000)} л` : label}</span>
        </motion.button>
      ))}
    </div>
  );
}

/* ---------- Тренировка сегодня ---------- */

function TodayWorkout({ d }: { d: DayNutrition }) {
  const plan = useAppStore((s) => s.plan);
  const setPlan = useAppStore((s) => s.setPlan);
  const session = useAppStore((s) => s.session);
  const startSession = useAppStore((s) => s.startSession);
  const setPlayerOpen = useAppStore((s) => s.setPlayerOpen);
  const setTab = useAppStore((s) => s.setTab);
  const { day } = d;
  const isWorkout = day.kind === 'workout' && day.workoutId;

  return (
    <div className="card">
      <div className="flex items-start gap-3">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${isWorkout ? 'bg-accent text-white' : 'bg-accent/15 text-accent'}`}>
          {isWorkout ? <Dumbbell size={22} /> : day.kind === 'active' ? <Footprints size={22} /> : <Moon size={22} />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">Сегодня</p>
          <p className="text-lg font-bold leading-tight">{day.title}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {day.window && (
              <span className="chip !py-1 text-[11px]">
                <CalendarClock size={12} /> {day.window}
              </span>
            )}
            {day.equipment && <span className={`chip !py-1 text-[11px] ${day.equipment === 'band' ? '!bg-accent text-white' : ''}`}>{EQUIPMENT_LABEL[day.equipment]}</span>}
            {d.trainedToday && (
              <span className="chip !py-1 text-[11px] text-accent">
                <Check size={12} /> Выполнено
              </span>
            )}
          </div>
          {!isWorkout && day.activities.length > 0 && <p className="mt-1.5 text-xs text-muted">{day.activities.join(' · ')}</p>}
        </div>
      </div>

      <div className="mt-4">
        <Segmented
          id="home-friday"
          tone={plan.fridayBusy ? 'warn' : 'default'}
          value={plan.fridayBusy ? 'busy' : 'free'}
          onChange={(v) => setPlan({ fridayBusy: v === 'busy' })}
          options={[
            { value: 'free', label: 'Пятница свободна' },
            { value: 'busy', label: 'Пятница занята' },
          ]}
        />
      </div>

      {isWorkout ? (
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={() => (session ? setPlayerOpen(true) : startSession(day.workoutId!))}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent font-semibold text-white shadow-[0_10px_30px_rgba(224,90,51,0.3)]"
        >
          <Play size={17} fill="currentColor" />
          {session ? 'Вернуться к тренировке' : d.trainedToday ? 'Ещё одна тренировка' : 'Начать тренировку'}
        </motion.button>
      ) : (
        <button type="button" onClick={() => setTab('workouts')} className="mt-3 h-11 w-full rounded-full text-sm font-semibold" style={{ background: 'var(--chip-bg)' }}>
          Расписание недели
        </button>
      )}
    </div>
  );
}

/* ---------- КБЖУ ---------- */

function MacrosLeftCard({ d }: { d: DayNutrition }) {
  const setTab = useAppStore((s) => s.setTab);
  const t = d.targets;
  const left = {
    kcal: t.kcal - d.eaten.kcal,
    p: t.protein - d.eaten.p,
    f: t.fat - d.eaten.f,
    c: t.carbs - d.eaten.c,
  };
  return (
    <button type="button" onClick={() => setTab('nutrition')} className="card col-span-2 !p-4 text-left">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">Осталось на сегодня</span>
        <DayTypeBadge d={d} />
      </div>
      <div className="mt-3 flex items-center gap-4">
        <Ring value={d.eaten.kcal / t.kcal} size={84} stroke={9}>
          <span className="font-mono text-base font-bold tabular-nums leading-none">{n0(Math.max(0, left.kcal))}</span>
          <span className="text-[10px] text-muted">ккал</span>
        </Ring>
        <div className="grid flex-1 grid-cols-3 gap-2 text-center">
          {[
            ['Б', left.p, t.protein],
            ['Ж', left.f, t.fat],
            ['У', left.c, t.carbs],
          ].map(([l, v, g]) => (
            <div key={l as string}>
              <p className="font-mono text-lg font-bold tabular-nums">{n0(Math.max(0, v as number))}</p>
              <p className="text-[11px] text-muted">
                {l} из {n0(g as number)}
              </p>
              <Bar value={1 - (v as number) / (g as number)} className="mt-1 !h-1" />
            </div>
          ))}
        </div>
      </div>
    </button>
  );
}

/* ---------- Цель 12% BF ---------- */

function BfGoalCard({ d }: { d: DayNutrition }) {
  const bfRef = useAppStore((s) => s.bfRef);
  const setBfRef = useAppStore((s) => s.setBfRef);
  const [edit, setEdit] = useState(false);
  const [bf, setBf] = useState(String(bfRef.bf).replace('.', ','));
  const g = bfGoal(bfRef, d.weight, d.rail.rate);
  const reached = g.kgLeft <= 0.05;

  return (
    <>
      <button type="button" onClick={() => setEdit(true)} className="card col-span-2 !p-4 text-left">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <Target size={16} className="text-accent" /> До цели {TARGET_BF}% BF
          </span>
          <span className="text-xs tabular-nums text-muted">≈ {n1(g.bfNow)}% сейчас</span>
        </div>
        <p className="mt-2 text-2xl font-bold tracking-tight">
          {reached ? (
            'Цель достигнута 🎯'
          ) : (
            <>
              {g.weeksLeft} <span className="text-base font-medium text-muted">нед. · −{n1(g.kgLeft)} кг</span>
            </>
          )}
        </p>
        <Bar value={g.progress} className="mt-3" />
        <p className="mt-1.5 text-[11px] text-muted">
          Цель ≈ {n1(g.targetWeight)} кг при сохранении мышц · темп {n1(g.pace)} кг/нед
          {d.phase !== 'cut' && ' · сейчас не сушка'}
        </p>
      </button>
      <AnimatePresence>
        {edit && (
          <Sheet title="Оценка % жира" onClose={() => setEdit(false)}>
            <p className="text-sm text-muted">Укажи текущую оценку (калипер, весы-анализатор или по фото). Сухая масса фиксируется на текущем весе {n1(d.weight)} кг.</p>
            <NumInput label="Процент жира" value={bf} onChange={setBf} suffix="% BF" className="mt-3" />
            <button
              type="button"
              onClick={() => {
                const v = parseNum(bf);
                if (v >= 4 && v <= 45) setBfRef({ bf: v, weight: d.weight, date: d.today });
                setEdit(false);
              }}
              className="mt-4 h-12 w-full rounded-full bg-accent font-semibold text-white"
            >
              Сохранить
            </button>
          </Sheet>
        )}
      </AnimatePresence>
    </>
  );
}

/* ---------- Вес ---------- */

function WeightCard({ d }: { d: DayNutrition }) {
  const weights = useAppStore((s) => s.weights);
  const logMetric = useAppStore((s) => s.logMetric);
  const loggedToday = weights[d.today];
  const [w, setW] = useState(loggedToday ?? latestEntry(weights)?.[1] ?? d.weight);
  const avg = rollingAvg(weights, d.today, 1);
  const rate = d.rail.rate;
  const saved = loggedToday !== undefined && Math.abs(loggedToday - w) < 0.01;

  return (
    <div className="card col-span-2 !p-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <Scale size={16} className="text-accent" /> Утренний вес
        </span>
        <span className="flex items-center gap-1 text-xs tabular-nums text-muted">
          {avg !== null && `7 дн. ${n1(avg)} кг`}
          {rate !== null && (
            <span className={`ml-1.5 flex items-center gap-0.5 font-semibold ${Math.abs(rate) > 0.8 ? 'text-accent' : ''}`}>
              {rate < 0 ? <TrendingDown size={13} /> : <TrendingUp size={13} />}
              {rate > 0 ? '+' : ''}
              {n1(rate)}/нед
            </span>
          )}
        </span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1">
          <Stepper label="Вес" value={w} step={0.1} min={30} max={250} onChange={setW} suffix="кг" />
        </div>
        <motion.button
          whileTap={{ scale: 0.92 }}
          type="button"
          onClick={() => logMetric('weights', d.today, w)}
          className={`flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold ${saved ? 'text-accent' : 'bg-accent text-white'}`}
          style={saved ? { background: 'var(--chip-bg)' } : undefined}
        >
          {saved ? <Check size={16} /> : null}
          {saved ? 'Записан' : 'Записать'}
        </motion.button>
      </div>
      <p className="mt-2 text-[11px] text-muted">КБЖУ пересчитываются автоматически по новому весу.</p>
    </div>
  );
}

/* ---------- Шаги ---------- */

function StepsCard({ d }: { d: DayNutrition }) {
  const steps = useAppStore((s) => s.steps[d.today] ?? 0);
  const logMetric = useAppStore((s) => s.logMetric);
  const { lo, hi, bonus } = d.steps;
  const add = (n: number) => logMetric('steps', d.today, Math.max(0, steps + n) || null);

  return (
    <div className="card !p-4">
      <div className="flex items-center justify-between">
        <Footprints size={18} className="text-accent" />
        {steps >= lo && <Check size={16} className="text-accent" />}
      </div>
      <p className="mt-3 font-mono text-xl font-bold tabular-nums leading-tight">{n0(steps)}</p>
      <p className="text-[11px] text-muted">
        из {lo === hi ? n0(lo) : `${n0(lo / 1000)}–${n0(hi / 1000)} тыс.`}
        {bonus > 0 && ' (+guardrail)'}
      </p>
      <Bar value={steps / lo} className="mt-2" />
      <div className="mt-3 flex gap-1.5">
        <button type="button" onClick={() => add(1000)} className="h-8 flex-1 rounded-full text-[11px] font-semibold" style={{ background: 'var(--chip-bg)' }}>
          +1к
        </button>
        <button type="button" onClick={() => add(2500)} className="h-8 flex-1 rounded-full text-[11px] font-semibold" style={{ background: 'var(--chip-bg)' }}>
          +2,5к
        </button>
      </div>
    </div>
  );
}

/* ---------- Сон ---------- */

function SleepCard({ d }: { d: DayNutrition }) {
  const logMetric = useAppStore((s) => s.logMetric);
  const { debt, last } = useSleepDebt(d.today);
  const v = last ?? 0;
  const [lo] = SLEEP_TARGET;
  const set = (n: number) => logMetric('sleep', d.today, Math.max(0, Math.min(16, n)) || null);

  return (
    <div className={`card !p-4 ${debt ? '!border-transparent !bg-[#3b3f8f] text-white' : ''}`}>
      <div className="flex items-center justify-between">
        <Moon size={18} className={debt ? '' : 'text-indigo-500'} />
        {debt && <AlertTriangle size={16} />}
      </div>
      <p className="mt-3 font-mono text-xl font-bold tabular-nums leading-tight">{last !== undefined ? `${n1(v)} ч` : '— ч'}</p>
      <p className={`text-[11px] ${debt ? 'text-white/80' : 'text-muted'}`}>{debt ? '< 7 ч две ночи подряд!' : `сон, цель ${SLEEP_TARGET[0]}–${SLEEP_TARGET[1]} ч`}</p>
      <Bar value={v / lo} className="mt-2" />
      <div className="mt-3 flex gap-1.5">
        <button type="button" aria-label="Сон −0,5 ч" onClick={() => set((last ?? 8) - 0.5)} className={`h-8 flex-1 rounded-full text-[11px] font-semibold ${debt ? 'bg-white/15' : ''}`} style={debt ? undefined : { background: 'var(--chip-bg)' }}>
          −0,5
        </button>
        <button type="button" aria-label="Сон +0,5 ч" onClick={() => set((last ?? 7.5) + 0.5)} className={`h-8 flex-1 rounded-full text-[11px] font-semibold ${debt ? 'bg-white/15' : ''}`} style={debt ? undefined : { background: 'var(--chip-bg)' }}>
          +0,5
        </button>
      </div>
    </div>
  );
}

/* ---------- Сводка Неделя / Месяц ---------- */

function PeriodSummary({ range, d }: { range: Exclude<Range, 'day'>; d: DayNutrition }) {
  const foodLog = useAppStore((s) => s.foodLog);
  const weights = useAppStore((s) => s.weights);
  const sleep = useAppStore((s) => s.sleep);
  const steps = useAppStore((s) => s.steps);
  const water = useAppStore((s) => s.water);
  const history = useAppStore((s) => s.history);
  const days = range === 'week' ? 7 : 30;

  const s = useMemo(() => {
    const keys = lastDays(d.today, days);
    const avg = (log: Record<string, number>) => {
      const v = keys.map((k) => log[k]).filter((x): x is number => x !== undefined && x > 0);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    };
    const kcalByDay = keys.map((k) => sumMacros(foodLog[k] ?? []).kcal);
    const logged = kcalByDay.filter((k) => k > 0);
    const from = keys[0];
    const workouts = history.filter((h) => {
      const key = dateKey(new Date(h.finishedAt));
      return key >= from && key <= d.today;
    });
    const wKeys = keys.filter((k) => weights[k] !== undefined);
    return {
      keys,
      kcalByDay,
      kcal: logged.length ? logged.reduce((a, b) => a + b, 0) / logged.length : null,
      workouts: workouts.length,
      tonnage: workouts.reduce((t, w) => t + w.tonnage, 0),
      sleep: avg(sleep),
      steps: avg(steps),
      water: avg(water),
      weightDelta: wKeys.length >= 2 ? weights[wKeys[wKeys.length - 1]] - weights[wKeys[0]] : null,
    };
  }, [foodLog, weights, sleep, steps, water, history, d.today, days]);

  const max = Math.max(d.targets.kcal * 1.15, ...s.kcalByDay);
  const show = s.keys;

  const stats = [
    { label: 'Ккал в среднем', value: s.kcal !== null ? n0(s.kcal) : '—' },
    { label: 'Вес', value: s.weightDelta !== null ? `${s.weightDelta > 0 ? '+' : ''}${n1(s.weightDelta)} кг` : '—' },
    { label: 'Тренировки', value: `${s.workouts}${s.tonnage ? ` · ${n0(s.tonnage / 1000)} т` : ''}` },
    { label: 'Сон', value: s.sleep !== null ? `${n1(s.sleep)} ч` : '—' },
    { label: 'Шаги', value: s.steps !== null ? n0(s.steps) : '—' },
    { label: 'Вода', value: s.water !== null ? `${n1(s.water / 1000)} л` : '—' },
  ];

  return (
    <motion.div key={range} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card col-span-2 !p-4">
      <p className="text-sm font-semibold">{range === 'week' ? 'Последние 7 дней' : 'Последние 30 дней'}</p>
      <div className="mt-3 flex h-24 items-end gap-[3px]" aria-label="Калории по дням">
        {show.map((k, i) => {
          const v = s.kcalByDay[i];
          const h = v ? Math.max(6, (v / max) * 100) : 4;
          const over = v > d.targets.kcal * 1.05;
          return (
            <div key={k} className="flex flex-1 flex-col items-center gap-1">
              <motion.div
                className={`w-full rounded-full ${v ? (over ? 'bg-[#d23c3c]' : 'bg-accent') : ''}`}
                style={!v ? { background: 'var(--chip-bg)' } : undefined}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: i * 0.015, type: 'spring', stiffness: 160, damping: 20 }}
                title={`${k}: ${n0(v)} ккал`}
              />
              {range === 'week' && <span className="text-[10px] text-muted">{weekdayShort(k)}</span>}
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {stats.map((x) => (
          <div key={x.label} className="rounded-2xl p-2.5" style={{ background: 'var(--chip-bg)' }}>
            <p className="text-[10px] text-muted">{x.label}</p>
            <p className="text-sm font-bold tabular-nums">{x.value}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ---------- Экран ---------- */

export function HomeScreen() {
  const d = useDayNutrition();
  const [range, setRange] = useState<Range>('day');
  const [metrics, setMetrics] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <Segmented<Range>
        id="home-range"
        value={range}
        onChange={setRange}
        options={[
          { value: 'day', label: 'День' },
          { value: 'week', label: 'Неделя' },
          { value: 'month', label: 'Месяц' },
        ]}
      />

      <TipCard d={d} />
      <QuickActions d={d} onMetrics={() => setMetrics(true)} />

      <div className="grid grid-cols-2 gap-3">
        {range === 'day' ? (
          <>
            <div className="col-span-2">
              <TodayWorkout d={d} />
            </div>
            <MacrosLeftCard d={d} />
            <BfGoalCard d={d} />
            <WeightCard d={d} />
            <StepsCard d={d} />
            <SleepCard d={d} />
          </>
        ) : (
          <>
            <PeriodSummary range={range} d={d} />
            <BfGoalCard d={d} />
            <StepsCard d={d} />
            <SleepCard d={d} />
          </>
        )}
      </div>

      <AnimatePresence>{metrics && <MetricsSheet key="metrics" onClose={() => setMetrics(false)} />}</AnimatePresence>
    </div>
  );
}
