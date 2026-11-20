import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Footprints,
  Info,
  Moon,
  RotateCcw,
  Ruler,
  Scale,
  ShieldAlert,
  Sparkles,
  Undo2,
  Wheat,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { MODES, SLEEP_TARGET, sleepDebt, type Guardrail } from '../utils/nutrition';
import { dateKey } from '../utils/date';
import type { DayNutrition } from '../utils/useDayNutrition';
import { NumInput, Sheet, n0, n1, parseNum } from './ui';

/* ---------- Бейдж типа дня ---------- */

export function DayTypeBadge({ d }: { d: DayNutrition }) {
  let text: string;
  let strong = false;
  if (d.isRefeed) {
    text = `Рефид • +${n0(d.refeedBoost)} ккал углеводов`;
    strong = true;
  } else if (d.phase === 'bulk') {
    text = d.training ? 'Тренировочный день • +250 ккал' : 'День отдыха • ±0 ккал (TDEE)';
    strong = d.training;
  } else if (d.phase === 'cut') {
    text = d.refeed.due ? 'Пора рефид!' : `До рефида: ${d.refeed.daysLeft} дн.`;
    strong = d.refeed.due;
  } else {
    text = `${d.training ? 'Тренировочный день' : 'День отдыха'} • ${MODES.maintain.short}`;
  }
  return <span className={`chip ${strong ? '!bg-accent text-white' : 'text-accent'}`}>{text}</span>;
}

/* ---------- Рефид ---------- */

export function RefeedCard({ d }: { d: DayNutrition }) {
  const setRefeed = useAppStore((s) => s.setRefeed);
  if (d.phase !== 'cut') return null;
  const { refeed } = d;
  const progress = Math.min(1, refeed.daysSince / 14);

  return (
    <div className={`card !p-4 ${refeed.due || refeed.activeToday ? '!border-transparent !bg-accent text-white' : ''}`}>
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${refeed.due || refeed.activeToday ? 'bg-white/20' : 'bg-accent/15 text-accent'}`}>
          <Wheat size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {refeed.activeToday ? 'Сегодня рефид' : refeed.due ? `Пора рефид — ${refeed.daysSince} дн. сушки` : `До рефида: ${refeed.daysLeft} дн.`}
          </p>
          <p className={`text-xs ${refeed.due || refeed.activeToday ? 'text-white/80' : 'text-muted'}`}>
            {refeed.activeToday
              ? `Уровень TDEE: +${n0(d.refeedBoost)} ккал только сложными углеводами (гречка, рис, овсянка, картофель)`
              : refeed.overdue
                ? 'Прошло 14+ дней — гормоны и гликоген просят паузу'
                : 'Каждые 10–14 дней — 1 день на уровне TDEE за счёт сложных углеводов'}
          </p>
        </div>
      </div>
      {!refeed.activeToday && !refeed.due && (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--chip-bg)' }}>
          <div className="h-full rounded-full bg-accent" style={{ width: `${progress * 100}%` }} />
        </div>
      )}
      {(refeed.due || refeed.activeToday) && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={() => setRefeed(d.today, !refeed.activeToday)}
          className={`mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold ${
            refeed.activeToday ? 'bg-white/15' : 'bg-white text-accent'
          }`}
        >
          {refeed.activeToday ? (
            <>
              <Undo2 size={16} /> Отменить рефид
            </>
          ) : (
            <>
              <Sparkles size={16} /> Включить Рефид сегодня
            </>
          )}
        </motion.button>
      )}
      {!refeed.due && !refeed.activeToday && (
        <button type="button" onClick={() => setRefeed(d.today, true)} className="mt-2 text-xs font-semibold text-muted underline-offset-2 hover:underline">
          Включить досрочно
        </button>
      )}
    </div>
  );
}

/* ---------- Guardrail ---------- */

const RAIL_ICON = { ok: CheckCircle2, info: Info, warn: AlertTriangle, danger: ShieldAlert };

export function GuardrailCard({ rail, d }: { rail: Guardrail; d: DayNutrition }) {
  const adjustCarbs = useAppStore((s) => s.adjustCarbs);
  const addStepBonus = useAppStore((s) => s.addStepBonus);
  const carbAdjust = useAppStore((s) => s.carbAdjust[d.phase]);
  const Icon = RAIL_ICON[rail.level];
  const hot = rail.level === 'danger' || rail.level === 'warn';

  return (
    <div className={`card !p-4 ${rail.level === 'danger' ? '!border-transparent !bg-accent text-white' : ''}`}>
      <div className="flex items-start gap-3">
        <Icon size={20} className={`mt-0.5 shrink-0 ${rail.level === 'danger' ? '' : hot ? 'text-accent' : 'text-muted'}`} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-semibold">
            Анти-залив · {rail.title}
          </p>
          <p className={`mt-0.5 text-[13px] leading-snug ${rail.level === 'danger' ? 'text-white/85' : 'text-muted'}`}>{rail.text}</p>
          {(carbAdjust !== 0 || d.steps.bonus > 0) && (
            <p className={`mt-1 text-xs font-semibold ${rail.level === 'danger' ? 'text-white' : 'text-accent'}`}>
              Коррекция: {carbAdjust !== 0 && `${n0(carbAdjust)} ккал углеводов`}
              {carbAdjust !== 0 && d.steps.bonus > 0 && ' · '}
              {d.steps.bonus > 0 && `+${n0(d.steps.bonus)} шагов`}
            </p>
          )}
        </div>
      </div>
      {(rail.actions.length > 0 || carbAdjust !== 0 || d.steps.bonus > 0) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {rail.actions.includes('cutCarbs') && (
            <ActionBtn danger={rail.level === 'danger'} onClick={() => adjustCarbs(d.phase, -100)}>
              −100 ккал углеводов
            </ActionBtn>
          )}
          {rail.actions.includes('steps') && (
            <ActionBtn danger={rail.level === 'danger'} onClick={() => addStepBonus(1500)}>
              +1 500 шагов
            </ActionBtn>
          )}
          {(carbAdjust !== 0 || d.steps.bonus > 0) && (
            <ActionBtn
              danger={rail.level === 'danger'}
              ghost
              onClick={() => {
                adjustCarbs(d.phase, null);
                addStepBonus(null);
              }}
            >
              <RotateCcw size={13} /> Сбросить
            </ActionBtn>
          )}
        </div>
      )}
    </div>
  );
}

function ActionBtn({ children, onClick, danger, ghost }: { children: React.ReactNode; onClick: () => void; danger?: boolean; ghost?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      type="button"
      onClick={onClick}
      className={`flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold ${
        danger ? (ghost ? 'bg-white/15' : 'bg-white text-accent') : ghost ? 'text-muted' : 'bg-accent text-white'
      }`}
      style={!danger && ghost ? { background: 'var(--chip-bg)' } : undefined}
    >
      {children}
    </motion.button>
  );
}

/* ---------- Вода ---------- */

export function WaterCard({ d, compact = false }: { d: DayNutrition; compact?: boolean }) {
  const addWater = useAppStore((s) => s.addWater);
  const v = d.water / d.waterTarget;
  const [pop, setPop] = useState(0);
  const add = (ml: number) => {
    addWater(ml);
    setPop((p) => p + 1);
  };

  return (
    <div className="card relative overflow-hidden !p-4">
      <motion.div
        aria-hidden
        className="absolute inset-x-0 bottom-0 bg-sky-400/15"
        initial={false}
        animate={{ height: `${Math.min(1, v) * 100}%` }}
        transition={{ type: 'spring', stiffness: 80, damping: 18 }}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            <Droplets size={17} className="text-sky-500" /> Вода
          </span>
          <span className="text-[11px] text-muted">{d.training ? 'тренировка' : 'отдых'}</span>
        </div>
        <p className="mt-2 font-mono text-2xl font-bold tabular-nums">
          <AnimatePresence mode="popLayout">
            <motion.span key={pop} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-block">
              {n1(d.water / 1000)}
            </motion.span>
          </AnimatePresence>
          <span className="text-sm font-medium text-muted"> / {n1(d.waterTarget / 1000)} л</span>
        </p>
        <div className={`mt-3 flex gap-1.5 ${compact ? '' : 'sm:gap-2'}`}>
          <WaterBtn onClick={() => add(250)}>+250</WaterBtn>
          <WaterBtn onClick={() => add(500)}>+500</WaterBtn>
          {!compact && (
            <button
              type="button"
              aria-label="Убрать 250 мл"
              onClick={() => addWater(-250)}
              disabled={d.water <= 0}
              className="h-9 w-9 shrink-0 rounded-full text-sm font-semibold text-muted disabled:opacity-40"
              style={{ background: 'var(--chip-bg)' }}
            >
              −
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function WaterBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      type="button"
      onClick={onClick}
      aria-label={`Добавить ${children} мл воды`}
      className="h-9 flex-1 rounded-full bg-sky-500 text-xs font-semibold text-white"
    >
      {children} мл
    </motion.button>
  );
}

/* ---------- Замеры ---------- */

export function MetricsSheet({ onClose }: { onClose: () => void }) {
  const today = useAppStore((s) => s.weights);
  const waist = useAppStore((s) => s.waist);
  const sleep = useAppStore((s) => s.sleep);
  const steps = useAppStore((s) => s.steps);
  const logMetric = useAppStore((s) => s.logMetric);
  const key = dateKey();

  const [w, setW] = useState(today[key] ? String(today[key]).replace('.', ',') : '');
  const [wa, setWa] = useState(waist[key] ? String(waist[key]).replace('.', ',') : '');
  const [sl, setSl] = useState(sleep[key] ? String(sleep[key]).replace('.', ',') : '');
  const [st, setSt] = useState(steps[key] ? String(steps[key]) : '');

  const save = () => {
    const put = (k: 'weights' | 'waist' | 'sleep' | 'steps', s: string, lo: number, hi: number) => {
      if (!s.trim()) return logMetric(k, key, null);
      const v = parseNum(s);
      if (v >= lo && v <= hi) logMetric(k, key, v);
    };
    put('weights', w, 30, 250);
    put('waist', wa, 40, 200);
    put('sleep', sl, 0, 16);
    put('steps', st, 0, 100000);
    onClose();
  };

  const rows = [
    { icon: Scale, label: 'Утренний вес', v: w, set: setW, suffix: 'кг', ph: '75,5' },
    { icon: Ruler, label: 'Талия (по пупку)', v: wa, set: setWa, suffix: 'см', ph: '78' },
    { icon: Moon, label: 'Сон', v: sl, set: setSl, suffix: 'ч', ph: '8,5' },
    { icon: Footprints, label: 'Шаги', v: st, set: setSt, suffix: 'шаг.', ph: '11000' },
  ];

  return (
    <Sheet title="Замеры за сегодня" onClose={onClose}>
      <div className="flex flex-col gap-2.5">
        {rows.map(({ icon: Icon, label, v, set, suffix, ph }) => (
          <div key={label} className="flex items-center gap-3">
            <Icon size={18} className="shrink-0 text-accent" />
            <span className="flex-1 text-sm font-medium">{label}</span>
            <NumInput label={label} value={v} onChange={set} suffix={suffix} placeholder={ph} className="w-36" />
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">Вес — утром натощак после туалета. Талия раз в неделю, в одно и то же время.</p>
      <button type="button" onClick={save} className="mt-4 h-12 w-full rounded-full bg-accent font-semibold text-white">
        Сохранить
      </button>
    </Sheet>
  );
}

/* ---------- Сон ---------- */

export function useSleepDebt(today: string) {
  const sleep = useAppStore((s) => s.sleep);
  return { debt: sleepDebt(sleep, today), last: sleep[today], target: SLEEP_TARGET };
}
