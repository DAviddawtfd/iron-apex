import { useMemo } from 'react';
import { useAppStore } from '../store/useAppStore';
import { buildWeek, todayKey } from '../data/schedule';
import { sumMacros, type Macros } from '../data/foods';
import { dateKey } from './date';
import {
  DEFAULT_WEIGHT,
  STEP_TARGET,
  computeTargets,
  guardrail,
  latestEntry,
  refeedStatus,
  teenGuards,
  waterTarget,
  weeklyAverageKcal,
} from './nutrition';

/** Сводка питания и тела на сегодня — общий источник для «Главной» и «Питания» */
export function useDayNutrition() {
  const plan = useAppStore((s) => s.plan);
  const body = useAppStore((s) => s.body);
  const weights = useAppStore((s) => s.weights);
  const waist = useAppStore((s) => s.waist);
  const foodLog = useAppStore((s) => s.foodLog);
  const water = useAppStore((s) => s.water);
  const refeedDays = useAppStore((s) => s.refeedDays);
  const phaseStart = useAppStore((s) => s.phaseStart);
  const carbAdjust = useAppStore((s) => s.carbAdjust);
  const overrides = useAppStore((s) => s.overrides);
  const stepBonus = useAppStore((s) => s.stepBonus);
  const history = useAppStore((s) => s.history);

  const today = dateKey();

  return useMemo(() => {
    const phase = plan.phase;
    const week = buildWeek(plan);
    const day = week.find((d) => d.day === todayKey())!;
    const training = day.kind === 'workout';
    const trainingDays = week.filter((d) => d.kind === 'workout').length;
    const weightEntry = latestEntry(weights, today);
    const weight = weightEntry?.[1] ?? DEFAULT_WEIGHT;
    const refeed = refeedStatus(phaseStart, refeedDays, today);
    const isRefeed = phase === 'cut' && refeed.activeToday;

    const base = {
      weight,
      body,
      phase,
      refeed: isRefeed,
      carbAdjust: carbAdjust[phase],
      override: overrides[phase] ?? null,
    };
    const targets = computeTargets({ ...base, training });
    const weekly = weeklyAverageKcal(base, trainingDays);
    const refeedKcal = computeTargets({ ...base, refeed: true, training }).kcal;
    const cutKcal = computeTargets({ ...base, refeed: false, training }).kcal;

    const entries = foodLog[today] ?? [];
    const eaten: Macros = sumMacros(entries);
    const guards = teenGuards(targets.kcal, targets.fat, weight, body.age);
    const rail = guardrail({ phase, weights, waist, phaseStart, today, carbAdjust: carbAdjust[phase] });
    const [stepLo, stepHi] = STEP_TARGET[phase];
    const trainedToday = history.some((h) => dateKey(new Date(h.finishedAt)) === today);

    return {
      today,
      phase,
      day,
      training,
      trainedToday,
      weight,
      hasWeight: !!weightEntry,
      targets,
      weekly,
      refeed,
      isRefeed,
      refeedBoost: refeedKcal - cutKcal,
      entries,
      eaten,
      guards,
      rail,
      water: water[today] ?? 0,
      waterTarget: waterTarget(training),
      steps: { lo: stepLo + stepBonus, hi: stepHi + stepBonus, bonus: stepBonus },
    };
  }, [plan, body, weights, waist, foodLog, water, refeedDays, phaseStart, carbAdjust, overrides, stepBonus, history, today]);
}

export type DayNutrition = ReturnType<typeof useDayNutrition>;
