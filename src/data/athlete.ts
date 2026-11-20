// Стартовый профиль атлета IRON APEX. Все значения — первая запись в истории, дальше редактируются.
import type { DayLog } from '../utils/nutrition';
import { addDays } from '../utils/date';

export type MeasureKey =
  | 'weight'
  | 'bf'
  | 'height'
  | 'heightEvening'
  | 'armSpan'
  | 'armLength'
  | 'inseam'
  | 'foot'
  | 'shoulderWidth'
  | 'wrist'
  | 'shoulders'
  | 'neck'
  | 'chest'
  | 'waistNatural'
  | 'waist'
  | 'hips'
  | 'armFlexed'
  | 'armRelaxed'
  | 'forearm'
  | 'thigh'
  | 'calf';

export type MeasureGroup = 'body' | 'skeleton' | 'girth';

export interface MeasureMeta {
  key: MeasureKey;
  label: string;
  unit: 'кг' | 'см' | '%';
  group: MeasureGroup;
  seed: number;
  /** Исходная запись, если была диапазоном или с пояснением */
  note?: string;
  min: number;
  max: number;
}

export const MEASURE_GROUPS: Record<MeasureGroup, string> = {
  body: 'Основное',
  girth: 'Обхваты',
  skeleton: 'Костяк и пропорции',
};

const m = (
  key: MeasureKey,
  label: string,
  unit: MeasureMeta['unit'],
  group: MeasureGroup,
  seed: number,
  min: number,
  max: number,
  note?: string,
): MeasureMeta => ({ key, label, unit, group, seed, min, max, note });

export const MEASURES: MeasureMeta[] = [
  m('weight', 'Вес (утро)', 'кг', 'body', 75.5, 30, 250),
  m('bf', '% жира (оценка)', '%', 'body', 18, 3, 50, '≈18%, цель 12%'),
  m('height', 'Рост (утро)', 'см', 'body', 180.5, 120, 230, '180–181'),
  m('heightEvening', 'Рост (вечер)', 'см', 'body', 178, 120, 230),

  m('shoulders', 'Плечи (обхват)', 'см', 'girth', 122.5, 60, 200, '120–125'),
  m('neck', 'Шея', 'см', 'girth', 37, 20, 70),
  m('chest', 'Грудь', 'см', 'girth', 90, 50, 180),
  m('waistNatural', 'Талия (естеств.)', 'см', 'girth', 76, 40, 200),
  m('waist', 'Талия (по пупку)', 'см', 'girth', 81, 40, 200),
  m('hips', 'Бёдра (таз)', 'см', 'girth', 91, 50, 200),
  m('armFlexed', 'Рука напряжённая', 'см', 'girth', 31, 15, 70),
  m('armRelaxed', 'Рука расслабленная', 'см', 'girth', 28, 15, 70),
  m('forearm', 'Предплечье', 'см', 'girth', 28, 15, 60),
  m('thigh', 'Бедро', 'см', 'girth', 55, 30, 100),
  m('calf', 'Икра', 'см', 'girth', 36, 20, 70),

  m('armSpan', 'Размах рук', 'см', 'skeleton', 183, 100, 250),
  m('armLength', 'Длина руки', 'см', 'skeleton', 52, 30, 100),
  m('inseam', 'Внутр. длина ноги', 'см', 'skeleton', 89, 50, 130),
  m('foot', 'Стопа', 'см', 'skeleton', 25.7, 15, 40, 'размер 42'),
  m('shoulderWidth', 'От плеча до плеча', 'см', 'skeleton', 49.5, 30, 80, '49–50'),
  m('wrist', 'Запястье', 'см', 'skeleton', 17.6, 10, 30),
];

export const MEASURE = Object.fromEntries(MEASURES.map((x) => [x.key, x])) as Record<MeasureKey, MeasureMeta>;

/** Замеры, которые живут в отдельных логах стора (вес → weights, талия по пупку → waist) */
export type StoredMeasureKey = Exclude<MeasureKey, 'weight' | 'waist'>;

export function seedAthlete(today: string) {
  const measures: Partial<Record<StoredMeasureKey, DayLog>> = {};
  for (const x of MEASURES) {
    if (x.key === 'weight' || x.key === 'waist') continue;
    measures[x.key] = { [today]: x.seed };
  }
  return {
    measures,
    // История веса: 77 → 73,9 → 75,5 (даты относительные, правятся в «Профиле»)
    weights: { [addDays(today, -21)]: 77, [addDays(today, -10)]: 73.9, [today]: 75.5 } as DayLog,
    waist: { [today]: MEASURE.waist.seed } as DayLog,
  };
}
