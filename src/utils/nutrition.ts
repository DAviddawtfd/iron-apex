// Движок КБЖУ IRON APEX: TDEE (Миффлин–Сан Жеор), 3 режима, рефид, guardrail-индикатор.
import type { Phase } from '../data/schedule';
import { addDays, diffDays, lastDays } from './date';

export type Sex = 'male' | 'female';

export interface BodyProfile {
  heightCm: number;
  age: number;
  sex: Sex;
  activity: number;
}

export const DEFAULT_BODY: BodyProfile = { heightCm: 180.5, age: 16, sex: 'male', activity: 1.55 };
export const DEFAULT_WEIGHT = 75.5;

export const MIN_TEEN_KCAL = 2000;
export const MIN_TEEN_FAT_PER_KG = 0.8;
export const TARGET_BF = 12;

export const bmr = (w: number, p: BodyProfile) =>
  10 * w + 6.25 * p.heightCm - 5 * p.age + (p.sex === 'male' ? 5 : -161);

export const tdee = (w: number, p: BodyProfile) => bmr(w, p) * p.activity;

const round = (n: number, step: number) => Math.round(n / step) * step;

/* ---------- Режимы ---------- */

export interface ModeConfig {
  label: string;
  full: string;
  short: string;
  /** Смещение от TDEE: тренировочный / день отдыха */
  offsetTrain: number;
  offsetRest: number;
  offsetText: string;
  proteinPerKg: number;
  fatPerKg: number;
  /** Целевой темп, кг/нед */
  rate: [number, number];
  why: string;
}

export const MODES: Record<Phase, ModeConfig> = {
  cut: {
    label: 'Сушка',
    full: 'Сушка (2–3 мес → 12% BF)',
    short: 'Дефицит −550…−600',
    offsetTrain: -600,
    offsetRest: -600,
    offsetText: '−550…−600 ккал от TDEE',
    proteinPerKg: 2.2,
    fatPerKg: 0.9,
    rate: [-0.55, -0.45],
    why: 'Б 2.2 г/кг — защита мышц · Ж 0.9 г/кг — минимум для гормонов в 16 лет',
  },
  maintain: {
    label: 'Удержание',
    full: 'Удержание (лёгкий дефицит / рекомп)',
    short: 'Дефицит −150…−200',
    offsetTrain: -200,
    offsetRest: -200,
    offsetText: '−150…−200 ккал от TDEE',
    proteinPerKg: 2.1,
    fatPerKg: 1.0,
    rate: [-0.15, 0],
    why: 'Плавное подсушивание без усталости ЦНС',
  },
  bulk: {
    label: 'Чистый набор',
    full: 'Чистый набор (сохранение BF)',
    short: '+250 трен. / ±0 отдых',
    offsetTrain: 250,
    offsetRest: 0,
    offsetText: '+250 ккал в тренировочный день, ±0 в день отдыха',
    proteinPerKg: 2.05,
    fatPerKg: 1.03,
    rate: [0.15, 0.25],
    why: 'Профицит только в дни зала, всё сверху — углеводы до/после тренировки',
  },
};

export type DayType = 'train' | 'rest' | 'refeed';

export interface MacroTargets {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  tdee: number;
  offset: number;
  dayType: DayType;
  overridden: boolean;
}

export interface NutritionOverride {
  kcal?: number;
  fat?: number;
}

export interface TargetInput {
  weight: number;
  body: BodyProfile;
  phase: Phase;
  training: boolean;
  refeed?: boolean;
  /** Авто-коррекция углеводов, ккал (обычно ≤ 0) */
  carbAdjust?: number;
  override?: NutritionOverride | null;
}

export function computeTargets(i: TargetInput): MacroTargets {
  const mode = MODES[i.phase];
  const t = tdee(i.weight, i.body);
  const protein = round(i.weight * mode.proteinPerKg, 5);
  let fat = Math.round(i.weight * mode.fatPerKg);
  const refeed = i.phase === 'cut' && !!i.refeed;
  const offset = refeed ? 0 : i.training ? mode.offsetTrain : mode.offsetRest;
  let kcal = round(t + offset, 50) + (refeed ? 0 : (i.carbAdjust ?? 0));
  const ov = !refeed ? i.override : null;
  if (ov?.kcal) kcal = Math.round(ov.kcal);
  if (ov?.fat) fat = Math.round(ov.fat);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return {
    kcal,
    protein,
    fat,
    carbs,
    tdee: Math.round(t),
    offset,
    dayType: refeed ? 'refeed' : i.training ? 'train' : 'rest',
    overridden: !!(ov?.kcal || ov?.fat),
  };
}

/** Средняя цель за неделю (для набора с циклированием) */
export function weeklyAverageKcal(base: Omit<TargetInput, 'training'>, trainingDays: number) {
  const tr = computeTargets({ ...base, training: true }).kcal;
  const rest = computeTargets({ ...base, training: false }).kcal;
  return { train: tr, rest, avg: round((tr * trainingDays + rest * (7 - trainingDays)) / 7, 50) };
}

/* ---------- Защитный барьер 16 лет ---------- */

export interface GuardWarning {
  field: 'kcal' | 'fat';
  text: string;
}

export function teenGuards(kcal: number, fat: number, weight: number, age: number): GuardWarning[] {
  if (age >= 18) return [];
  const out: GuardWarning[] = [];
  if (kcal < MIN_TEEN_KCAL)
    out.push({ field: 'kcal', text: `Ниже ${MIN_TEEN_KCAL} ккал в ${age} лет — риск для роста, гормонов и мышц. Не опускайся ниже.` });
  const minFat = Math.ceil(weight * MIN_TEEN_FAT_PER_KG);
  if (fat < minFat)
    out.push({ field: 'fat', text: `Жиры ниже 0.8 г/кг (${minFat} г) — угроза выработке тестостерона в ${age} лет.` });
  return out;
}

/* ---------- Рефид ---------- */

export const REFEED_MIN_DAYS = 10;
export const REFEED_MAX_DAYS = 14;

export interface RefeedStatus {
  daysSince: number;
  daysLeft: number;
  due: boolean;
  overdue: boolean;
  activeToday: boolean;
}

export function refeedStatus(phaseStart: string, refeedDays: string[], today: string): RefeedStatus {
  const activeToday = refeedDays.includes(today);
  const past = refeedDays.filter((d) => d < today && d >= phaseStart).sort();
  const anchor = past.length ? past[past.length - 1] : phaseStart;
  const daysSince = Math.max(0, diffDays(today, anchor));
  return {
    daysSince,
    daysLeft: Math.max(0, REFEED_MIN_DAYS - daysSince),
    due: !activeToday && daysSince >= REFEED_MIN_DAYS,
    overdue: !activeToday && daysSince >= REFEED_MAX_DAYS,
    activeToday,
  };
}

/* ---------- Тренд веса ---------- */

export type DayLog = Record<string, number>;

export function latestEntry(log: DayLog, upTo?: string): [string, number] | null {
  let best: [string, number] | null = null;
  for (const [k, v] of Object.entries(log)) {
    if (upTo && k > upTo) continue;
    if (!best || k > best[0]) best = [k, v];
  }
  return best;
}

/** Среднее за 7 дней, заканчивая `end`; нужно ≥ min взвешиваний */
export function rollingAvg(log: DayLog, end: string, min = 3): number | null {
  const vals = lastDays(end, 7)
    .map((d) => log[d])
    .filter((v): v is number => typeof v === 'number');
  return vals.length >= min ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

/** Темп кг/нед: разница 7-дневных средних */
export function weeklyRate(log: DayLog, today: string): number | null {
  const now = rollingAvg(log, today);
  const prev = rollingAvg(log, addDays(today, -7));
  return now !== null && prev !== null ? now - prev : null;
}

/** Сколько дней 7-дневное среднее не обновляло минимум (null — мало данных) */
export function daysSinceNewLow(log: DayLog, today: string, from: string): number | null {
  const keys = Object.keys(log).filter((k) => k >= from && k <= today).sort();
  if (!keys.length || diffDays(today, keys[0]) < 14) return null;
  let min = Infinity;
  let lowDay = keys[0];
  for (let d = keys[0]; d <= today; d = addDays(d, 1)) {
    const a = rollingAvg(log, d);
    if (a === null) continue;
    if (a < min - 0.05) {
      min = a;
      lowDay = d;
    }
  }
  return diffDays(today, lowDay);
}

export function waistDelta(waist: DayLog, phaseStart: string, today: string): number | null {
  const keys = Object.keys(waist).filter((k) => k <= today).sort();
  if (keys.length < 2) return null;
  const baseKey = [...keys].reverse().find((k) => k <= phaseStart) ?? keys[0];
  const last = keys[keys.length - 1];
  return last === baseKey ? null : waist[last] - waist[baseKey];
}

/* ---------- Guardrail ---------- */

export type GuardAction = 'steps' | 'cutCarbs' | 'restoreCarbs';

export interface Guardrail {
  level: 'ok' | 'info' | 'warn' | 'danger';
  title: string;
  text: string;
  actions: GuardAction[];
  rate: number | null;
}

export function guardrail(input: {
  phase: Phase;
  weights: DayLog;
  waist: DayLog;
  phaseStart: string;
  today: string;
  carbAdjust: number;
}): Guardrail {
  const { phase, weights, waist, phaseStart, today, carbAdjust } = input;
  const rate = weeklyRate(weights, today);
  const [lo, hi] = MODES[phase].rate;
  const fmt = (r: number) => `${r > 0 ? '+' : ''}${r.toFixed(2).replace('.', ',')} кг/нед`;
  const restore: GuardAction[] = carbAdjust < 0 ? ['restoreCarbs'] : [];

  if (phase === 'cut') {
    if (rate !== null && rate < -0.8)
      return {
        level: 'danger',
        title: 'Риск потери мышц',
        text: `Вес падает ${fmt(rate)} — быстрее 0,8 кг/нед. Добавь углеводы или проведи рефид.`,
        actions: restore,
        rate,
      };
    const stall = daysSinceNewLow(weights, today, phaseStart);
    if (stall !== null && stall > 10)
      return {
        level: 'warn',
        title: `Плато ${stall} дн.`,
        text: '7-дневный средний вес не падает больше 10 дней. Добавь +1 500 шагов или убери −100 ккал углеводов.',
        actions: ['steps', 'cutCarbs'],
        rate,
      };
  }

  if (phase === 'bulk') {
    const wd = waistDelta(waist, phaseStart, today);
    if ((rate !== null && rate > 0.35) || (wd !== null && wd > 1))
      return {
        level: 'danger',
        title: 'Риск грязного набора',
        text: [
          rate !== null && rate > 0.35 ? `Вес растёт ${fmt(rate)} (цель +0,15…+0,25)` : null,
          wd !== null && wd > 1 ? `талия +${wd.toFixed(1).replace('.', ',')} см` : null,
        ]
          .filter(Boolean)
          .join(', ') + '. Срежь −100 ккал углеводов.',
        actions: ['cutCarbs'],
        rate,
      };
  }

  if (rate === null)
    return {
      level: 'info',
      title: 'Копим данные',
      text: 'Взвешивайся каждое утро натощак — тренд появится после 2 недель (нужно ≥ 3 взвешиваний в неделю).',
      actions: restore,
      rate,
    };

  const inRange = rate >= lo - 0.05 && rate <= hi + 0.05;
  return {
    level: inRange ? 'ok' : 'info',
    title: inRange ? 'В целевом темпе' : 'Темп вне цели',
    text: `Сейчас ${fmt(rate)}, цель ${fmt(lo).replace(' кг/нед', '')}…${fmt(hi)}.`,
    actions: restore,
    rate,
  };
}

/* ---------- Цель 12% BF ---------- */

export interface BfRef {
  bf: number;
  weight: number;
  date: string;
}

export function bfGoal(ref: BfRef, weight: number, rate: number | null) {
  const lbm = ref.weight * (1 - ref.bf / 100);
  const bfNow = Math.max(3, (1 - lbm / weight) * 100);
  const targetWeight = lbm / (1 - TARGET_BF / 100);
  const kgLeft = Math.max(0, weight - targetWeight);
  const pace = rate !== null && rate < -0.1 ? -rate : 0.5;
  const span = ref.bf - TARGET_BF;
  return {
    bfNow,
    targetWeight,
    kgLeft,
    weeksLeft: kgLeft > 0 ? Math.ceil(kgLeft / pace) : 0,
    progress: span > 0 ? Math.min(1, Math.max(0, (ref.bf - bfNow) / span)) : 1,
    pace,
  };
}

/* ---------- Шаги, вода, сон ---------- */

export const STEP_TARGET: Record<Phase, [number, number]> = {
  cut: [11000, 12000],
  maintain: [9000, 9000],
  bulk: [8000, 8000],
};

export const waterTarget = (training: boolean) => (training ? 3500 : 3000);

export const SLEEP_TARGET: [number, number] = [8, 9];

/** Две ночи подряд < 7 ч (последние две записанные, идущие подряд) */
export function sleepDebt(sleep: DayLog, today: string): boolean {
  const y = addDays(today, -1);
  const pairs: [string, string][] = [
    [today, y],
    [y, addDays(today, -2)],
  ];
  return pairs.some(([a, b]) => sleep[a] !== undefined && sleep[b] !== undefined && sleep[a] < 7 && sleep[b] < 7);
}

/* ---------- Тайминг нутриентов ---------- */

export interface TimingTip {
  title: string;
  text: string;
  state: 'upcoming' | 'now' | 'post' | 'rest' | 'flex';
}

const hm = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`;

export function nutrientTiming(opts: {
  training: boolean;
  window?: string;
  phase: Phase;
  now: Date;
  done?: boolean;
}): TimingTip {
  const { training, window, phase, now, done } = opts;
  const extra = phase === 'bulk' ? ' +250 ккал сегодня — раздели их до и после зала.' : '';
  if (!training)
    return {
      state: 'rest',
      title: 'День отдыха',
      text:
        phase === 'bulk'
          ? 'Ровно TDEE: углеводы равномерно, больше овощей и клетчатки.'
          : 'Углеводы равномерно в течение дня, белок 4–5 приёмов по 30–40 г.',
    };
  const m = window?.match(/(\d{1,2}):(\d{2})/);
  if (!m)
    return {
      state: 'flex',
      title: 'Тренировка сегодня',
      text: `За 90 мин до старта — сложные углеводы 60–80 г (гречка, рис, овсянка) + белок.${extra}`,
    };
  const start = +m[1] * 60 + +m[2];
  const pre = start - 90;
  const cur = now.getHours() * 60 + now.getMinutes();
  if (done || cur >= start + 75)
    return {
      state: 'post',
      title: 'После тренировки',
      text: `Белок 40 г + быстрые и сложные углеводы в течение 1–2 ч.${extra}`,
    };
  if (cur >= pre && cur < start)
    return {
      state: 'now',
      title: `Сейчас — углеводы перед залом`,
      text: `Тренировка в ${hm(start)}. Сложные углеводы 60–80 г + 30 г белка, минимум жира.${extra}`,
    };
  if (cur < pre)
    return {
      state: 'upcoming',
      title: `В ${hm(pre)} — сложные углеводы`,
      text: `За 90 мин до тренировки в ${hm(start)}: гречка/рис/овсянка 60–80 г + белок.${extra}`,
    };
  return {
    state: 'now',
    title: 'Идёт окно тренировки',
    text: 'Вода 500–750 мл за тренировку. После — белок 40 г + углеводы.',
  };
}
