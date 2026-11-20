import { WORKOUTS, type Equipment, type Exercise, type Location, type Workout, type WorkoutId } from './workouts';

export type Phase = 'cut' | 'maintain' | 'bulk';
export type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type WeekendDay = 'sat' | 'sun';
export type Day4Day = 'fri' | WeekendDay;

export const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const DAY_SHORT: Record<DayKey, string> = {
  mon: 'Пн', tue: 'Вт', wed: 'Ср', thu: 'Чт', fri: 'Пт', sat: 'Сб', sun: 'Вс',
};
export const DAY_FULL: Record<DayKey, string> = {
  mon: 'Понедельник', tue: 'Вторник', wed: 'Среда', thu: 'Четверг',
  fri: 'Пятница', sat: 'Суббота', sun: 'Воскресенье',
};

export interface PhaseConfig {
  label: string;
  rpe: string;
  steps: string;
  note: string;
  liss?: string;
}

export const PHASES: Record<Phase, PhaseConfig> = {
  cut: {
    label: 'Сушка (→12% BF)',
    rpe: '8–8.5',
    steps: '10 000–12 000',
    note: '−1 подход в изоляции, отдых −15с',
    liss: 'LISS-кардио 25 мин',
  },
  maintain: {
    label: 'Удержание',
    rpe: '8',
    steps: '8 000',
    note: 'Базовые подходы, эксцентрика 3 сек',
  },
  bulk: {
    label: 'Набор',
    rpe: '8.5–9',
    steps: '7 000–8 000',
    note: '+1 подход на приоритеты, отдых +15с в базе',
  },
};

export const LOCATION_LABEL: Record<Location, string> = {
  home: 'Дом',
  gym: 'Зал',
};

export interface PlanSettings {
  location: Location;
  phase: Phase;
  fridayBusy: boolean;
  /** Куда стоит тяжёлый День 4 при свободной пятнице */
  day4Day: Day4Day;
  /** Куда стоит День 4-Band при занятой пятнице */
  bandDay: WeekendDay;
}

export interface DayPlan {
  day: DayKey;
  kind: 'workout' | 'rest' | 'active';
  title: string;
  /** Окно времени для тренировки */
  window?: string;
  workoutId?: WorkoutId;
  /** Фактический инвентарь дня (выходные при занятой пятнице — только резинки) */
  equipment?: Equipment;
  activities: string[];
  /** Варианты переноса Дня 4 */
  moveOptions?: Day4Day[];
}

const id = (loc: Location, part: 'push' | 'pull' | 'legs' | 'upper'): WorkoutId =>
  `${loc}-${part}` as WorkoutId;

export function buildWeek(s: PlanSettings): DayPlan[] {
  const liss = s.phase === 'cut' ? PHASES.cut.liss : undefined;
  const steps = `Шаги: ${PHASES[s.phase].steps}`;

  const workout = (day: DayKey, part: 'push' | 'pull' | 'legs', title: string, window: string): DayPlan => ({
    day,
    kind: 'workout',
    title,
    window,
    workoutId: id(s.location, part),
    equipment: s.location,
    activities: [steps],
  });

  const week: Record<DayKey, DayPlan> = {
    mon: workout('mon', 'push', 'День 1 — Push', 'с 15:00'),
    tue: {
      day: 'tue',
      kind: liss ? 'active' : 'rest',
      title: 'Отдых',
      activities: liss ? [liss, steps] : [steps],
    },
    wed: workout('wed', 'pull', 'День 2 — Pull', '12:00–15:00'),
    thu: workout('thu', 'legs', 'День 3 — Legs & Core', 'с 15:00'),
    fri: { day: 'fri', kind: 'rest', title: 'Отдых', activities: [steps] },
    sat: { day: 'sat', kind: 'rest', title: 'Отдых', activities: [steps] },
    sun: { day: 'sun', kind: 'rest', title: 'Отдых', activities: [steps] },
  };

  if (!s.fridayBusy) {
    // Пятница свободна: тяжёлый День 4 на полном инвентаре локации, перенос Пт → Сб/Вс
    week[s.day4Day] = {
      day: s.day4Day,
      kind: 'workout',
      title: 'День 4 — Upper Specialization',
      window: s.day4Day === 'fri' ? 'Пятница' : 'Перенесено на выходной',
      workoutId: id(s.location, 'upper'),
      equipment: s.location,
      activities: [steps],
      moveOptions: ['fri', 'sat', 'sun'],
    };
    if (liss) {
      const lissDay: WeekendDay = s.day4Day === 'sat' ? 'sun' : 'sat';
      week[lissDay] = { day: lissDay, kind: 'active', title: 'Отдых + кардио', activities: [liss, steps] };
    }
  } else {
    // Пятница занята: Пт — полный отдых, Сб и Вс — только резинки + свой вес (даже для зала)
    week.fri = { day: 'fri', kind: 'rest', title: 'Полный отдых', activities: ['Без нагрузки'] };
    const other: WeekendDay = s.bandDay === 'sat' ? 'sun' : 'sat';
    week[s.bandDay] = {
      day: s.bandDay,
      kind: 'workout',
      title: 'День 4-Band',
      window: 'Выходной',
      workoutId: 'band-upper',
      equipment: 'band',
      activities: [steps],
      moveOptions: ['sat', 'sun'],
    };
    week[other] = {
      day: other,
      kind: 'active',
      title: 'Ходьба · Мобильность · Вакуум',
      equipment: 'band',
      activities: [
        ...(liss ? [`Ходьба в темпе LISS 25 мин`] : ['Ходьба 40–60 мин']),
        'Мобильность 15 мин',
        'Вакуум 3×40с',
        steps,
      ],
    };
  }

  return DAY_KEYS.map((d) => week[d]);
}

export interface AppliedExercise extends Exercise {
  baseSets: number;
  baseRest: number;
  rpe: string;
  modifiers: string[];
}

/** Динамически применяет модификаторы этапа к упражнению */
export function applyPhase(e: Exercise, phase: Phase): AppliedExercise {
  let sets = e.sets;
  let rest = e.rest;
  let tempo = e.tempo;
  const modifiers: string[] = [];

  if (phase === 'cut') {
    if (e.kind === 'isolation' && sets > 2) {
      sets -= 1;
      modifiers.push('−1 подход');
    }
    rest = Math.max(30, rest - 15);
    modifiers.push('отдых −15с');
  } else if (phase === 'maintain') {
    if (e.kind !== 'core' && !tempo) {
      tempo = '3-0-1';
      modifiers.push('эксцентрика 3с');
    }
  } else {
    if (e.priority) {
      sets += 1;
      modifiers.push('+1 подход');
    }
    if (e.kind === 'compound') {
      rest += 15;
      modifiers.push('отдых +15с');
    }
  }

  return { ...e, sets, rest, tempo, baseSets: e.sets, baseRest: e.rest, rpe: PHASES[phase].rpe, modifiers };
}

export function getWorkout(workoutId: WorkoutId, phase: Phase) {
  const w: Workout = WORKOUTS[workoutId];
  return { ...w, exercises: w.exercises.map((e) => applyPhase(e, phase)) };
}

export function todayKey(date = new Date()): DayKey {
  return DAY_KEYS[(date.getDay() + 6) % 7];
}

export function formatRest(sec: number) {
  if (sec < 60) return `${sec}с`;
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return r ? `${m}:${String(r).padStart(2, '0')}` : `${m} мин`;
}
