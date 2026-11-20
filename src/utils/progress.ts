// Аналитика прогресса IRON APEX: тренды, пропорции, % жира по US Navy, объём на приоритеты, дисциплина.
import { buildWeek, getWorkout, type PlanSettings } from '../data/schedule';
import { WORKOUTS } from '../data/workouts';
import type { PersonalRecord, WorkoutLog } from '../lib/training';
import { addDays, dateKey, diffDays, parseKey } from './date';
import { rollingAvg, type DayLog, type Sex } from './nutrition';

/* ---------- Ряды для графиков ---------- */

export interface WeightPoint {
  date: string;
  weight: number | null;
  avg: number | null;
}

/** Вес по дням + 7-дневная скользящая средняя (по всем взвешиваниям в окне) */
export function weightSeries(weights: DayLog, today: string, days: number): WeightPoint[] {
  const keys = Object.keys(weights).sort();
  if (!keys.length) return [];
  const from = keys[0] > addDays(today, -days + 1) ? keys[0] : addDays(today, -days + 1);
  const out: WeightPoint[] = [];
  for (let d = from; d <= today; d = addDays(d, 1)) {
    const avg = rollingAvg(weights, d, 1);
    out.push({ date: d, weight: weights[d] ?? null, avg: avg === null ? null : Math.round(avg * 100) / 100 });
  }
  return out;
}

/** Объединяет несколько логов в одну таблицу по датам (для многолинейного графика) */
export function mergeLogs<K extends string>(logs: Record<K, DayLog | undefined>): ({ date: string } & Partial<Record<K, number>>)[] {
  const dates = new Set<string>();
  for (const log of Object.values(logs) as (DayLog | undefined)[]) for (const d of Object.keys(log ?? {})) dates.add(d);
  return [...dates].sort().map((date) => {
    const row: Record<string, number | string> = { date };
    for (const [k, log] of Object.entries(logs) as [K, DayLog | undefined][]) {
      const v = log?.[date];
      if (v !== undefined) row[k] = v;
    }
    return row as { date: string } & Partial<Record<K, number>>;
  });
}

export function latest(log: DayLog | undefined): number | null {
  if (!log) return null;
  const keys = Object.keys(log).sort();
  return keys.length ? log[keys[keys.length - 1]] : null;
}

export function first(log: DayLog | undefined): number | null {
  if (!log) return null;
  const keys = Object.keys(log).sort();
  return keys.length ? log[keys[0]] : null;
}

export const shortDate = (key: string) => {
  const d = parseKey(key);
  return `${d.getDate()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/* ---------- Пропорции и % жира ---------- */

export const V_TAPER_GOAL = 1.62;

export function vTaper(shoulders: number | null, waist: number | null) {
  if (!shoulders || !waist) return null;
  const ratio = shoulders / waist;
  return {
    ratio,
    /** Талия, при которой текущие плечи дают цель */
    waistForGoal: shoulders / V_TAPER_GOAL,
    /** Плечи, нужные при текущей талии */
    shouldersForGoal: waist * V_TAPER_GOAL,
    reached: ratio >= V_TAPER_GOAL,
  };
}

/** US Navy (см). Мужчины: шея, талия по пупку, рост. Женщины — дополнительно бёдра. */
export function navyBodyFat(i: { sex: Sex; heightCm: number; neck: number; waist: number; hips?: number | null }): number | null {
  const { sex, heightCm, neck, waist, hips } = i;
  if (!(heightCm > 0 && neck > 0 && waist > 0)) return null;
  let bf: number;
  if (sex === 'male') {
    if (waist <= neck) return null;
    bf = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(heightCm)) - 450;
  } else {
    if (!hips || waist + hips <= neck) return null;
    bf = 495 / (1.29579 - 0.35004 * Math.log10(waist + hips - neck) + 0.221 * Math.log10(heightCm)) - 450;
  }
  return Number.isFinite(bf) ? Math.max(2, Math.min(60, bf)) : null;
}

/* ---------- Карта приоритетов ---------- */

export type PriorityGroup = 'upperChest' | 'arms' | 'sideDelts' | 'quads';

export const PRIORITY_GROUPS: Record<PriorityGroup, { label: string; target: [number, number] }> = {
  upperChest: { label: 'Верх груди', target: [10, 16] },
  arms: { label: 'Руки (бицепс + трицепс)', target: [12, 20] },
  sideDelts: { label: 'Средние дельты', target: [12, 20] },
  quads: { label: 'Квадрицепс', target: [10, 16] },
};

const GROUP_BY_EXERCISE: Record<string, PriorityGroup> = {
  'incline-db': 'upperChest',
  'incline-fly': 'upperChest',
  'incline-tempo': 'upperChest',
  'incline-main': 'upperChest',
  'cable-fly': 'upperChest',
  'hammer-incline': 'upperChest',
  'band-pushup': 'upperChest',
  'band-fly': 'upperChest',

  skull: 'arms',
  'incline-curl': 'arms',
  hammer: 'arms',
  'ss-arms': 'arms',
  'rope-pd': 'arms',
  'cable-curl': 'arms',
  'rope-hammer': 'arms',
  'ss-gym-arms': 'arms',
  'band-arms': 'arms',

  'lat-raise': 'sideDelts',
  'ss-delts': 'sideDelts',
  'cable-lat': 'sideDelts',
  'ss-gym-delts': 'sideDelts',
  'band-lat': 'sideDelts',

  bulgarian: 'quads',
  goblet: 'quads',
  hack: 'quads',
  'leg-ext': 'quads',
};

/** Суперсет «бицепс + трицепс» = 2 рабочих подхода на руки за круг */
const setWeight = (exerciseId: string) => (/^(ss-arms|ss-gym-arms|band-arms)$/.test(exerciseId) ? 2 : 1);

const emptyGroups = (): Record<PriorityGroup, number> => ({ upperChest: 0, arms: 0, sideDelts: 0, quads: 0 });

export function plannedWeeklySets(plan: PlanSettings): Record<PriorityGroup, number> {
  const out = emptyGroups();
  for (const day of buildWeek(plan)) {
    if (!day.workoutId) continue;
    for (const e of getWorkout(day.workoutId, plan.phase).exercises) {
      const g = GROUP_BY_EXERCISE[e.id];
      if (g) out[g] += e.sets * setWeight(e.id);
    }
  }
  return out;
}

export function doneWeeklySets(history: WorkoutLog[], today: string): Record<PriorityGroup, number> {
  const out = emptyGroups();
  const from = addDays(today, -6);
  for (const log of history) {
    const d = dateKey(new Date(log.finishedAt));
    if (d < from || d > today) continue;
    for (const e of log.exercises) {
      const g = GROUP_BY_EXERCISE[e.exerciseId];
      if (g) out[g] += e.sets.length * setWeight(e.exerciseId);
    }
  }
  return out;
}

/* ---------- 1ПМ (Эпли) ---------- */

export const epley = (weight: number, reps: number) => (reps <= 1 ? weight : weight * (1 + reps / 30));

const COMPOUND_NAMES = new Set(
  Object.values(WORKOUTS).flatMap((w) => w.exercises.filter((e) => e.kind === 'compound').flatMap((e) => [e.name, ...e.alts])),
);

export interface OneRm {
  name: string;
  weight: number;
  reps: number;
  e1rm: number;
  date: number;
  compound: boolean;
}

export function oneRepMaxes(records: Record<string, PersonalRecord>): OneRm[] {
  return Object.entries(records)
    .filter(([, r]) => r.kind === 'load' && r.weight > 0)
    .map(([name, r]) => ({ name, weight: r.weight, reps: r.reps, e1rm: epley(r.weight, r.reps), date: r.date, compound: COMPOUND_NAMES.has(name) }))
    .sort((a, b) => Number(b.compound) - Number(a.compound) || b.e1rm - a.e1rm);
}

/* ---------- Дисциплина ---------- */

export type DayScore = 0 | 1 | 2 | 3;

/**
 * 3 — тренировка, 2 — питание + вес/шаги записаны, 1 — хоть что-то записано, 0 — пусто.
 * День засчитан в серию при score ≥ 2.
 */
export function disciplineMap(input: {
  history: WorkoutLog[];
  weights: DayLog;
  steps: DayLog;
  foodDays: Set<string>;
  today: string;
  weeks: number;
}) {
  const { history, weights, steps, foodDays, today, weeks } = input;
  const trained = new Set(history.map((h) => dateKey(new Date(h.finishedAt))));
  const score = (d: string): DayScore => {
    if (trained.has(d)) return 3;
    const food = foodDays.has(d);
    const tracked = weights[d] !== undefined || (steps[d] ?? 0) > 0;
    if (food && tracked) return 2;
    return food || tracked ? 1 : 0;
  };

  // Сетка: колонки — недели (Пн–Вс), последняя колонка — текущая неделя
  const todayDow = (parseKey(today).getDay() + 6) % 7;
  const start = addDays(today, -todayDow - (weeks - 1) * 7);
  const cells: { date: string; score: DayScore; future: boolean }[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(start, i);
    cells.push({ date: d, score: d > today ? 0 : score(d), future: d > today });
  }

  // Текущая серия: пустой сегодняшний день её не рвёт
  let streak = 0;
  let d = score(today) >= 2 ? today : addDays(today, -1);
  while (score(d) >= 2) {
    streak++;
    d = addDays(d, -1);
  }

  let best = 0;
  let run = 0;
  for (const c of cells) {
    if (c.future) break;
    run = c.score >= 2 ? run + 1 : 0;
    best = Math.max(best, run);
  }

  const workouts = cells.filter((c) => c.score === 3).length;
  return { cells, streak, best: Math.max(best, streak), workouts };
}

export const daysUntil = (target: string, today: string) => diffDays(target, today);
