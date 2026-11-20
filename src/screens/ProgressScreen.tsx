import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Activity,
  CalendarClock,
  Dumbbell,
  Flame,
  PartyPopper,
  Percent,
  Ruler,
  Scale,
  Target,
  Trophy,
  Undo2,
} from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAppStore } from '../store/useAppStore';
import { Segmented } from '../components/Segmented';
import { Bar, Sheet, n0, n1 } from '../components/ui';
import { ChartTooltip, SERIES, useChartTheme } from '../components/charts';
import { MeasureSheet, dateInputStyle, longDate } from '../components/MeasureSheet';
import { MEASURE, type MeasureKey } from '../data/athlete';
import { TARGET_BF, bfGoal } from '../utils/nutrition';
import { useDayNutrition } from '../utils/useDayNutrition';
import { dateKey, parseKey } from '../utils/date';
import {
  PRIORITY_GROUPS,
  V_TAPER_GOAL,
  daysUntil,
  disciplineMap,
  doneWeeklySets,
  first,
  latest,
  mergeLogs,
  navyBodyFat,
  oneRepMaxes,
  plannedWeeklySets,
  shortDate,
  vTaper,
  weightSeries,
  type PriorityGroup,
} from '../utils/progress';
import { formatKg } from '../lib/training';

const sign = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '±');

function CardTitle({ icon: Icon, children, right }: { icon: typeof Scale; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-sm font-semibold">
        <Icon size={16} className="text-accent" /> {children}
      </span>
      {right && <span className="text-xs tabular-nums text-muted">{right}</span>}
    </div>
  );
}

/* ---------- Вес + 7-дневная средняя ---------- */

type WRange = '30' | '90' | 'all';

function WeightChart({ onEdit }: { onEdit: (k: MeasureKey) => void }) {
  const weights = useAppStore((s) => s.weights);
  const t = useChartTheme();
  const [range, setRange] = useState<WRange>('90');
  const today = dateKey();
  const data = useMemo(() => weightSeries(weights, today, range === 'all' ? 3650 : +range), [weights, today, range]);
  const logged = data.filter((p) => p.weight !== null);
  const startW = logged[0]?.weight ?? null;
  const lastAvg = [...data].reverse().find((p) => p.avg !== null)?.avg ?? null;
  const delta = startW !== null && lastAvg !== null ? lastAvg - startW : null;

  return (
    <div className="card !p-4">
      <CardTitle
        icon={Scale}
        right={
          delta !== null && logged.length > 1 ? (
            <>
              {sign(delta)}
              {n1(Math.abs(delta))} кг за период
            </>
          ) : null
        }
      >
        Вес тела
      </CardTitle>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-bold tracking-tight tabular-nums">{lastAvg !== null ? n1(lastAvg) : '—'}</span>
        <span className="text-sm text-muted">кг · 7-дн. средняя</span>
      </div>

      <div className="-mx-2 mt-3 h-48">
        {logged.length === 0 ? (
          <p className="flex h-full items-center justify-center text-sm text-muted">Пока нет взвешиваний</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="avgFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={t.accent} stopOpacity={t.dark ? 0.35 : 0.22} />
                  <stop offset="100%" stopColor={t.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={t.grid} vertical={false} />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={t.tick} axisLine={false} tickLine={false} minTickGap={24} />
              <YAxis
                domain={[(min: number) => Math.floor(min - 0.5), (max: number) => Math.ceil(max + 0.5)]}
                tick={t.tick}
                axisLine={false}
                tickLine={false}
                width={30}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ stroke: t.cursor }}
                content={<ChartTooltip labelFormat={longDate} format={(v) => `${n1(v)} кг`} />}
              />
              <Area
                type="monotone"
                dataKey="avg"
                name="Средняя 7 дн."
                stroke={t.accent}
                strokeWidth={2.5}
                fill="url(#avgFill)"
                connectNulls
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="linear"
                dataKey="weight"
                name="Вес"
                stroke={t.soft}
                strokeWidth={1}
                strokeDasharray="3 4"
                connectNulls
                dot={{ r: 3, fill: t.dotFill, stroke: t.ink, strokeWidth: 1.5 }}
                activeDot={{ r: 5, fill: t.accent, stroke: t.dotFill }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1">
          <Segmented<WRange>
            id="w-range"
            value={range}
            onChange={setRange}
            options={[
              { value: '30', label: '30 дн.' },
              { value: '90', label: '90 дн.' },
              { value: 'all', label: 'Всё' },
            ]}
          />
        </div>
        <button type="button" onClick={() => onEdit('weight')} className="chip h-10 !px-4 font-semibold">
          История
        </button>
      </div>
    </div>
  );
}

/* ---------- V-Taper ---------- */

function VTaperCard({ onEdit }: { onEdit: (k: MeasureKey) => void }) {
  const shouldersLog = useAppStore((s) => s.measures.shoulders);
  const waistLog = useAppStore((s) => s.waist);
  const vt = vTaper(latest(shouldersLog), latest(waistLog));
  const startVt = vTaper(first(shouldersLog), first(waistLog));
  const trend = vt && startVt ? vt.ratio - startVt.ratio : 0;

  return (
    <button type="button" onClick={() => onEdit('shoulders')} className="card flex flex-col !p-4 text-left">
      <CardTitle icon={Activity}>V-Taper</CardTitle>
      {vt ? (
        <>
          <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{vt.ratio.toFixed(2).replace('.', ',')}</p>
          <p className="text-[11px] text-muted">
            плечи / талия · цель &gt; {String(V_TAPER_GOAL).replace('.', ',')}
            {Math.abs(trend) >= 0.005 && ` · ${sign(trend)}${Math.abs(trend).toFixed(2).replace('.', ',')}`}
          </p>
          <Bar value={vt.ratio / V_TAPER_GOAL} className="mt-3" />
          <p className="mt-2 text-[11px] leading-snug text-muted">
            {vt.reached
              ? 'Цель достигнута — держи талию'
              : `Талия ≤ ${n1(vt.waistForGoal)} см или плечи ≥ ${n1(vt.shouldersForGoal)} см`}
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted">Внеси обхват плеч и талию по пупку</p>
      )}
    </button>
  );
}

/* ---------- % BF по US Navy ---------- */

function NavyCard({ onEdit }: { onEdit: (k: MeasureKey) => void }) {
  const body = useAppStore((s) => s.body);
  const neck = latest(useAppStore((s) => s.measures.neck));
  const waist = latest(useAppStore((s) => s.waist));
  const hips = latest(useAppStore((s) => s.measures.hips));
  const d = useDayNutrition();
  const bf = neck && waist ? navyBodyFat({ sex: body.sex, heightCm: body.heightCm, neck, waist, hips }) : null;
  const goal = bf !== null ? bfGoal({ bf, weight: d.weight, date: d.today }, d.weight, d.rail.rate) : null;

  return (
    <button type="button" onClick={() => onEdit('neck')} className="card flex flex-col !p-4 text-left">
      <CardTitle icon={Percent}>US Navy</CardTitle>
      {bf !== null && goal ? (
        <>
          <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">
            {n1(bf)}
            <span className="text-base font-medium text-muted">%</span>
          </p>
          <p className="text-[11px] text-muted">шея {n1(neck!)} · талия {n1(waist!)} · рост {n1(body.heightCm)}</p>
          <Bar value={bf <= TARGET_BF ? 1 : TARGET_BF / bf} className="mt-3" />
          <p className="mt-2 text-[11px] leading-snug text-muted">
            {goal.kgLeft <= 0.05 ? (
              `Уже ≤ ${TARGET_BF}% BF`
            ) : (
              <>
                <b className="text-ink">≈ {goal.weeksLeft} нед.</b> до {TARGET_BF}% · −{n1(goal.kgLeft)} кг при {n1(goal.pace)} кг/нед
              </>
            )}
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted">Нужны шея, талия по пупку и рост</p>
      )}
    </button>
  );
}

/* ---------- Замеры ---------- */

const CHART_MEASURES = ['chest', 'armFlexed', 'waist', 'shoulders', 'thigh'] as const;
type ChartMeasure = (typeof CHART_MEASURES)[number];

function MeasuresChart({ onEdit }: { onEdit: (k: MeasureKey) => void }) {
  const measures = useAppStore((s) => s.measures);
  const waist = useAppStore((s) => s.waist);
  const t = useChartTheme();
  const [on, setOn] = useState<Record<ChartMeasure, boolean>>({ chest: true, armFlexed: true, waist: true, shoulders: false, thigh: false });

  const logs = useMemo(
    () => ({
      chest: measures.chest,
      armFlexed: measures.armFlexed,
      waist,
      shoulders: measures.shoulders,
      thigh: measures.thigh,
    }),
    [measures, waist],
  );
  const data = useMemo(() => mergeLogs(logs), [logs]);
  const color = (k: ChartMeasure) => SERIES[CHART_MEASURES.indexOf(k)];

  return (
    <div className="card !p-4">
      <CardTitle icon={Ruler} right={`${data.length} ${data.length === 1 ? 'замер' : 'замеров'}`}>
        Замеры, см
      </CardTitle>

      <div className="-mx-2 mt-3 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={t.grid} vertical={false} />
            <XAxis dataKey="date" tickFormatter={shortDate} tick={t.tick} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis
              domain={[(min: number) => Math.floor(min - 3), (max: number) => Math.ceil(max + 3)]}
              tick={t.tick}
              axisLine={false}
              tickLine={false}
              width={30}
              allowDecimals={false}
            />
            <Tooltip cursor={{ stroke: t.cursor }} content={<ChartTooltip labelFormat={longDate} format={(v) => `${n1(v)} см`} />} />
            {CHART_MEASURES.filter((k) => on[k]).map((k) => (
              <Line
                key={k}
                type="monotone"
                dataKey={k}
                name={MEASURE[k].label}
                stroke={color(k)}
                strokeWidth={2.2}
                connectNulls
                dot={{ r: 3.5, fill: t.dotFill, stroke: color(k), strokeWidth: 2 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-1.5">
        {CHART_MEASURES.map((k) => {
          const log = logs[k];
          const now = latest(log);
          const start = first(log);
          const diff = now !== null && start !== null ? now - start : 0;
          // Для талии уменьшение — хорошо, для остальных — рост
          const good = k === 'waist' ? diff < 0 : diff > 0;
          return (
            <div key={k} className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={on[k]}
                aria-label={`Показать ${MEASURE[k].label}`}
                onClick={() => setOn((s) => ({ ...s, [k]: !s[k] }))}
                className="flex flex-1 items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition-opacity"
                style={{ background: 'var(--chip-bg)', opacity: on[k] ? 1 : 0.5 }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: color(k) }} />
                <span className="flex-1">{MEASURE[k].label}</span>
                {Math.abs(diff) >= 0.05 && (
                  <span className={`text-xs font-semibold tabular-nums ${good ? 'text-emerald-500' : 'text-accent'}`}>
                    {sign(diff)}
                    {n1(Math.abs(diff))}
                  </span>
                )}
                <span className="w-12 text-right font-mono font-bold tabular-nums">{now !== null ? n1(now) : '—'}</span>
              </button>
              <button type="button" onClick={() => onEdit(k)} className="chip h-9 !px-3" aria-label={`Записать: ${MEASURE[k].label}`}>
                +
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Карта приоритетов ---------- */

function PriorityMap() {
  const plan = useAppStore((s) => s.plan);
  const history = useAppStore((s) => s.history);
  const records = useAppStore((s) => s.records);
  const today = dateKey();
  const planned = useMemo(() => plannedWeeklySets(plan), [plan]);
  const done = useMemo(() => doneWeeklySets(history, today), [history, today]);
  const rms = useMemo(() => oneRepMaxes(records).slice(0, 6), [records]);

  return (
    <div className="card !p-4">
      <CardTitle icon={Target} right="подходы / нед.">
        Карта приоритетов
      </CardTitle>
      <div className="mt-3 flex flex-col gap-3">
        {(Object.keys(PRIORITY_GROUPS) as PriorityGroup[]).map((g) => {
          const { label, target } = PRIORITY_GROUPS[g];
          const [lo, hi] = target;
          const p = planned[g];
          const status = p < lo ? 'мало' : p > hi ? 'много' : 'в норме';
          return (
            <div key={g}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{label}</span>
                <span className="tabular-nums">
                  <b>{done[g]}</b>
                  <span className="text-muted"> / {p} план</span>
                </span>
              </div>
              <div className="relative mt-1.5">
                <Bar value={p ? done[g] / p : 0} />
                {/* Зона оптимального объёма */}
                <span
                  className="pointer-events-none absolute -bottom-1 h-0.5 rounded-full bg-emerald-500/70"
                  style={{ left: `${Math.min(100, (lo / Math.max(p, hi)) * 100)}%`, width: `${((hi - lo) / Math.max(p, hi)) * 100}%` }}
                />
              </div>
              <p className={`mt-1.5 text-[11px] ${status === 'в норме' ? 'text-muted' : 'text-accent'}`}>
                Норма {lo}–{hi} · план {status}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] text-muted">Сделано — за последние 7 дней. Суперсет на руки = 2 подхода. На «Наборе» приоритеты получают +1 подход.</p>

      <div className="mt-4 border-t pt-3" style={{ borderColor: 'var(--chip-bg)' }}>
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Trophy size={15} className="text-accent" /> 1ПМ по Эпли
        </p>
        {rms.length === 0 ? (
          <p className="mt-2 text-sm text-muted">Заверши тренировку с весом — здесь появится расчётный максимум.</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1.5">
            {rms.map((r) => (
              <li key={r.name} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: 'var(--chip-bg)' }}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{r.name}</span>
                  <span className="text-[11px] text-muted">
                    {formatKg(r.weight)} кг × {r.reps} · {r.compound ? 'база' : 'изоляция'}
                  </span>
                </span>
                <span className="font-mono text-lg font-bold tabular-nums">
                  {n0(r.e1rm)}
                  <span className="ml-0.5 text-xs font-normal text-muted">кг</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-muted">1ПМ = вес × (1 + повторы / 30). Это оценка — в 16 лет не проверяй максимум на 1 раз.</p>
      </div>
    </div>
  );
}

/* ---------- Дисциплина ---------- */

const HEAT = ['var(--chip-bg)', 'rgb(var(--accent) / 0.28)', 'rgb(var(--accent) / 0.6)', 'rgb(var(--accent))'];
const WEEKS = 15;

function DisciplineCard() {
  const history = useAppStore((s) => s.history);
  const weights = useAppStore((s) => s.weights);
  const steps = useAppStore((s) => s.steps);
  const foodLog = useAppStore((s) => s.foodLog);
  const today = dateKey();
  const map = useMemo(() => {
    const foodDays = new Set(Object.entries(foodLog).filter(([, v]) => v.length).map(([k]) => k));
    return disciplineMap({ history, weights, steps, foodDays, today, weeks: WEEKS });
  }, [history, weights, steps, foodLog, today]);

  const columns = Array.from({ length: WEEKS }, (_, w) => map.cells.slice(w * 7, w * 7 + 7));

  return (
    <div className="card !p-4">
      <CardTitle icon={Flame} right={`рекорд ${map.best} дн.`}>
        Дисциплина
      </CardTitle>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums">{map.streak}</span>
        <span className="text-sm text-muted">дн. подряд · {map.workouts} трен. за {WEEKS} нед.</span>
      </div>
      <div className="mt-3 flex gap-[3px]" role="img" aria-label={`Тепловая карта дисциплины, серия ${map.streak} дней`}>
        <div className="mr-1 flex flex-col justify-between py-[1px] text-[9px] leading-none text-muted">
          <span>Пн</span>
          <span>Чт</span>
          <span>Вс</span>
        </div>
        {columns.map((col, i) => (
          <div key={i} className="flex flex-1 flex-col gap-[3px]">
            {col.map((c) => (
              <span
                key={c.date}
                title={`${longDate(c.date)}`}
                className={`aspect-square w-full rounded-[4px] ${c.date === today ? 'ring-1 ring-ink/50' : ''}`}
                style={{ background: c.future ? 'transparent' : HEAT[c.score] }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-muted">
        пусто
        {HEAT.map((h, i) => (
          <span key={i} className="h-2.5 w-2.5 rounded-[3px]" style={{ background: h }} />
        ))}
        тренировка
      </div>
      <p className="mt-1 text-[11px] text-muted">В серию идут дни с тренировкой или с записанным питанием + весом/шагами.</p>
    </div>
  );
}

/* ---------- Переход в зал ---------- */

function celebrate() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  confetti({ particleCount: 120, spread: 90, origin: { y: 0.6 }, colors: ['#E05A33', '#FFFFFF', '#FFB199'], zIndex: 100 });
}

function GymCountdown() {
  const gym = useAppStore((s) => s.gym);
  const setGymTarget = useAppStore((s) => s.setGymTarget);
  const markInGym = useAppStore((s) => s.markInGym);
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const today = dateKey();
  const left = daysUntil(gym.targetDate, today);

  if (gym.movedAt) {
    const days = daysUntil(today, gym.movedAt);
    return (
      <div className="card flex items-center gap-3 !p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white">
          <Dumbbell size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">В «100% Fitness»</p>
          <p className="text-xs text-muted">
            с {longDate(gym.movedAt)} · {days} дн. · программа «Зал»
          </p>
        </div>
        <button type="button" onClick={() => markInGym(false)} className="chip h-9" aria-label="Отменить переход в зал">
          <Undo2 size={14} /> Дом
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="card !border-transparent !p-4 text-white" style={{ background: 'linear-gradient(135deg, #E05A33, #B8401F)' }}>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-white/90">
            <CalendarClock size={16} /> До зала «100% Fitness»
          </span>
          <button type="button" onClick={() => setEdit(true)} className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
            {parseKey(gym.targetDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          </button>
        </div>
        <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums">
          {left > 0 ? left : 0}
          <span className="ml-1.5 text-base font-medium text-white/75">{left > 0 ? 'дн.' : 'сегодня!'}</span>
        </p>
        <p className="text-xs text-white/75">
          {left > 0 ? 'Дома закладываем технику и привычку — в зале добавим нагрузку.' : 'Дата наступила — пора менять программу.'}
        </p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => setConfirm(true)}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-white font-semibold text-[#B8401F]"
        >
          <PartyPopper size={17} /> Я уже в зале!
        </motion.button>
      </div>

      <AnimatePresence>
        {edit && (
          <Sheet title="Дата перехода в зал" onClose={() => setEdit(false)}>
            <input
              type="date"
              aria-label="Дата перехода в зал"
              value={gym.targetDate}
              min={today}
              onChange={(e) => e.target.value && setGymTarget(e.target.value)}
              className="h-12 w-full rounded-xl px-3 text-base font-semibold outline-none focus:ring-2 focus:ring-accent/60"
              style={dateInputStyle}
            />
            <button type="button" onClick={() => setEdit(false)} className="mt-4 h-12 w-full rounded-full bg-accent font-semibold text-white">
              Готово
            </button>
          </Sheet>
        )}
        {confirm && (
          <Sheet title="Переходим в зал?" onClose={() => setConfirm(false)}>
            <p className="text-sm text-muted">
              Программа переключится на «Зал 100% Fitness». Этап и история сохранятся, вернуть «Дом» можно в любой момент.
            </p>
            <button
              type="button"
              onClick={() => {
                markInGym(true);
                setConfirm(false);
                celebrate();
              }}
              className="mt-4 h-12 w-full rounded-full bg-accent font-semibold text-white"
            >
              Да, я в зале
            </button>
          </Sheet>
        )}
      </AnimatePresence>
    </>
  );
}

/* ---------- Экран ---------- */

export function ProgressScreen() {
  const [editing, setEditing] = useState<MeasureKey | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <GymCountdown />
      <WeightChart onEdit={setEditing} />
      <div className="grid grid-cols-2 gap-3">
        <VTaperCard onEdit={setEditing} />
        <NavyCard onEdit={setEditing} />
      </div>
      <MeasuresChart onEdit={setEditing} />
      <PriorityMap />
      <DisciplineCard />
      <AnimatePresence>{editing && <MeasureSheet key={editing} k={editing} onClose={() => setEditing(null)} />}</AnimatePresence>
    </div>
  );
}
