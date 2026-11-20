import type { Equipment, WorkoutId } from '../data/workouts';
import type { Phase } from '../data/schedule';

export interface SetEntry {
  weight: string;
  reps: string;
  rpe: string;
  done: boolean;
}

export interface LoggedSet {
  weight: number;
  reps: number;
  rpe: number | null;
}

export interface LoggedExercise {
  exerciseId: string;
  name: string;
  sets: LoggedSet[];
}

export interface PRHit {
  name: string;
  weight: number;
  reps: number;
  prevWeight: number;
  prevReps: number;
}

export interface WorkoutLog {
  id: string;
  workoutId: WorkoutId;
  title: string;
  equipment: Equipment;
  phase: Phase;
  startedAt: number;
  finishedAt: number;
  durationSec: number;
  tonnage: number;
  totalSets: number;
  exercises: LoggedExercise[];
  prs: PRHit[];
}

export interface PersonalRecord {
  weight: number;
  reps: number;
  /** load — e1RM по Эпли, reps — повторы/секунды без веса */
  kind: 'load' | 'reps';
  score: number;
  date: number;
}

export interface PlayerSettings {
  maxDumbbellKg: number;
  dumbbellStepKg: number;
  muted: boolean;
}

export const DEFAULT_PLAYER_SETTINGS: PlayerSettings = {
  maxDumbbellKg: 25,
  dumbbellStepKg: 2,
  muted: false,
};

export const emptySet = (): SetEntry => ({ weight: '', reps: '', rpe: '', done: false });

export function num(s: string | undefined): number {
  if (!s) return 0;
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Диапазон повторов из строки программы: «8–12», «15+15», «15 + 40с». null — упражнение на время. */
export function parseReps(reps: string): { min: number; max: number } | null {
  const noTime = reps.replace(/\d+\s*с/g, '');
  const range = noTime.match(/(\d+)\s*[–-]\s*(\d+)/);
  if (range) return { min: +range[1], max: +range[2] };
  const single = noTime.match(/\d+/);
  return single ? { min: +single[0], max: +single[0] } : null;
}

/** Длительность статики (сек) для вакуума/планки/изометрии, иначе null */
export function holdSeconds(reps: string, name: string): number | null {
  const m = reps.match(/(\d+)\s*с/);
  if (m) return +m[1];
  return /вакуум|планк/i.test(name) ? 40 : null;
}

export function setScore(weight: number, reps: number): { kind: PersonalRecord['kind']; score: number } {
  return weight > 0 ? { kind: 'load', score: weight * (1 + reps / 30) } : { kind: 'reps', score: reps };
}

export function bestSet(sets: LoggedSet[]): LoggedSet | null {
  let best: LoggedSet | null = null;
  for (const s of sets) {
    if (s.reps <= 0) continue;
    if (!best) {
      best = s;
      continue;
    }
    const a = setScore(s.weight, s.reps);
    const b = setScore(best.weight, best.reps);
    if (a.kind === b.kind ? a.score > b.score : a.kind === 'load') best = s;
  }
  return best;
}

/** Последний результат упражнения по названию (история хранится от новых к старым) */
export function findLastExercise(history: WorkoutLog[], name: string): LoggedExercise | null {
  for (const log of history) {
    const e = log.exercises.find((x) => x.name === name);
    if (e && e.sets.length) return e;
  }
  return null;
}

export function toLogged(entries: SetEntry[]): LoggedSet[] {
  return entries
    .filter((e) => e.done)
    .map((e) => ({ weight: num(e.weight), reps: num(e.reps), rpe: num(e.rpe) || null }));
}

export const tonnageOf = (sets: LoggedSet[]) => sets.reduce((t, s) => t + s.weight * s.reps, 0);

export interface ProgressionHint {
  kind: 'weight' | 'reps' | 'tempo';
  title: string;
  text: string;
}

/**
 * Умный компенсатор шага гантелей (режим Дом): если диапазон закрыт,
 * но шаг слишком крупный или гантели на максимуме — прогрессия повторами/темпом.
 */
export function progressionHint(
  sets: LoggedSet[],
  plannedSets: number,
  range: { min: number; max: number } | null,
  settings: PlayerSettings,
): ProgressionHint | null {
  if (!range || sets.length < plannedSets || sets.length === 0) return null;
  if (!sets.every((s) => s.reps >= range.max)) return null;
  const weight = Math.max(...sets.map((s) => s.weight));
  if (weight <= 0) return null;

  const { maxDumbbellKg: maxKg, dumbbellStepKg: step } = settings;
  const next = weight + step;
  const minReps = Math.min(...sets.map((s) => s.reps));
  const overshoot = minReps >= range.max + 2;
  const alt: ProgressionHint = overshoot
    ? { kind: 'tempo', title: 'Темп 3-1-1', text: 'Повторы уже сверх диапазона — замедли эксцентрику до 3 с и пауза 1 с внизу' }
    : { kind: 'reps', title: '+2 повторения', text: `Добавь по 2 повтора сверх ${range.max} в каждом подходе` };

  if (next > maxKg) {
    return { ...alt, text: `Гантели на максимуме (${formatKg(maxKg)} кг). ${alt.text}` };
  }
  const jump = Math.round((step / weight) * 100);
  if (jump > 10) {
    return { ...alt, text: `Шаг +${formatKg(step)} кг = +${jump}% — слишком резко. ${alt.text}` };
  }
  return { kind: 'weight', title: `+${formatKg(step)} кг → ${formatKg(next)} кг`, text: 'Диапазон закрыт — повышай вес' };
}

export function formatKg(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',');
}

export function formatTonnage(n: number) {
  return Math.round(n).toLocaleString('ru-RU');
}

export function formatClock(totalSec: number) {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${String(m).padStart(2, '0')}:${ss}`;
}
