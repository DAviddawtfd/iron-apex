import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getWorkout, type Phase, type PlanSettings } from '../data/schedule';
import { WORKOUTS, type Equipment, type WorkoutId } from '../data/workouts';
import {
  DEFAULT_PLAYER_SETTINGS,
  bestSet,
  emptySet,
  setScore,
  toLogged,
  tonnageOf,
  type LoggedExercise,
  type PersonalRecord,
  type PlayerSettings,
  type PRHit,
  type SetEntry,
  type WorkoutLog,
} from '../lib/training';
import { DEFAULT_TEMPLATES, type Food, type MealTemplate } from '../data/foods';
import {
  DEFAULT_BODY,
  DEFAULT_WEIGHT,
  type BfRef,
  type BodyProfile,
  type DayLog,
  type NutritionOverride,
} from '../utils/nutrition';
import { addDays, dateKey } from '../utils/date';
import { MEASURE, seedAthlete, type StoredMeasureKey } from '../data/athlete';

export type Theme = 'light' | 'dark';
export type TabId = 'home' | 'workouts' | 'nutrition' | 'progress' | 'profile';

export const STORE_KEY = 'iron-apex-store';
export const SCHEMA_VERSION = 5;
export const BACKUP_APP_ID = 'iron-apex';

export interface FoodEntry {
  id: string;
  foodId?: string;
  name: string;
  grams: number;
  /** Абсолютные значения на указанную граммовку */
  kcal: number;
  p: number;
  f: number;
  c: number;
  at: number;
}

export type MetricKey = 'weights' | 'waist' | 'sleep' | 'steps';

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

const HISTORY_LIMIT = 300;

export interface RestTimer {
  endsAt: number;
  duration: number;
  label: string;
}

export interface ActiveSession {
  workoutId: WorkoutId;
  startedAt: number;
  /** Этап и инвентарь фиксируются на старте, чтобы переключатели не ломали идущую тренировку */
  phase: Phase;
  equipment: Equipment;
  /** Подходы по exerciseId */
  entries: Record<string, SetEntry[]>;
  rest: RestTimer | null;
}

interface PersistedState {
  theme: Theme;
  activeTab: TabId;
  profile: {
    name: string;
  };
  plan: PlanSettings;
  /** Выбранные замены: ключ `${workoutId}:${exerciseId}` → название альтернативы */
  swaps: Record<string, string>;
  session: ActiveSession | null;
  playerOpen: boolean;
  settings: PlayerSettings;
  /** История тренировок, от новых к старым */
  history: WorkoutLog[];
  /** Личные рекорды по названию упражнения */
  records: Record<string, PersonalRecord>;

  /* ---- Питание и тело (Этап 4) ---- */
  body: BodyProfile;
  /** Утренний вес, кг по дате */
  weights: DayLog;
  /** Талия, см */
  waist: DayLog;
  /** Сон, часы */
  sleep: DayLog;
  steps: DayLog;
  /** Вода, мл */
  water: DayLog;
  foodLog: Record<string, FoodEntry[]>;
  customFoods: Food[];
  templates: MealTemplate[];
  refeedDays: string[];
  /** Дата старта текущего режима (для рефида и guardrail) */
  phaseStart: string;
  /** Авто-коррекция углеводов по режиму, ккал */
  carbAdjust: Record<Phase, number>;
  /** Доп. шаги от guardrail */
  stepBonus: number;
  overrides: Partial<Record<Phase, NutritionOverride>>;
  bfRef: BfRef;

  /* ---- Прогресс и профиль (Этап 5) ---- */
  /** История антропометрии по дате (вес и талия по пупку — в weights / waist) */
  measures: Partial<Record<StoredMeasureKey, DayLog>>;
  gym: GymTransition;
}

export interface GymTransition {
  /** Плановая дата перехода в зал «100% Fitness» */
  targetDate: string;
  /** Дата фактического перехода */
  movedAt: string | null;
}

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  version: number;
  exportedAt: string;
  state: PersistedState;
}

interface AppState extends PersistedState {
  /** Итоги только что завершённой тренировки (не сохраняется) */
  summary: WorkoutLog | null;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setTab: (tab: TabId) => void;
  setProfileName: (name: string) => void;
  setPlan: (patch: Partial<PlanSettings>) => void;
  setSwap: (key: string, name: string | null) => void;
  setSettings: (patch: Partial<PlayerSettings>) => void;
  startSession: (workoutId: WorkoutId) => void;
  setPlayerOpen: (open: boolean) => void;
  updateSet: (exerciseId: string, index: number, patch: Partial<SetEntry>) => void;
  addSet: (exerciseId: string) => void;
  startRest: (duration: number, label: string) => void;
  adjustRest: (deltaSec: number) => void;
  clearRest: () => void;
  finishSession: () => WorkoutLog | null;
  endSession: () => void;
  closeSummary: () => void;
  resetAll: () => void;

  setBody: (patch: Partial<BodyProfile>) => void;
  logMetric: (key: MetricKey, date: string, value: number | null) => void;
  addWater: (ml: number, date?: string) => void;
  addFood: (entry: Omit<FoodEntry, 'id' | 'at'>, date?: string) => void;
  removeFood: (id: string, date?: string) => void;
  addCustomFood: (food: Omit<Food, 'id' | 'custom'>) => Food;
  removeCustomFood: (id: string) => void;
  saveTemplate: (name: string, items: MealTemplate['items']) => void;
  removeTemplate: (id: string) => void;
  setRefeed: (date: string, on: boolean) => void;
  adjustCarbs: (phase: Phase, deltaKcal: number | null) => void;
  addStepBonus: (n: number | null) => void;
  setOverride: (phase: Phase, o: NutritionOverride | null) => void;
  setBfRef: (ref: BfRef) => void;

  logMeasure: (key: StoredMeasureKey, date: string, value: number | null) => void;
  setGymTarget: (date: string) => void;
  markInGym: (inGym: boolean) => void;
  exportBackup: () => BackupFile;
  importBackup: (raw: unknown) => void;
}

const initialPlan: PlanSettings = {
  location: 'home',
  phase: 'cut',
  fridayBusy: false,
  day4Day: 'fri',
  bandDay: 'sat',
};

const initialState: PersistedState = {
  theme: 'light',
  activeTab: 'home',
  profile: { name: 'Атлет' },
  plan: initialPlan,
  swaps: {},
  session: null,
  playerOpen: false,
  settings: DEFAULT_PLAYER_SETTINGS,
  history: [],
  records: {},
  ...nutritionDefaults(),
  ...athleteDefaults(),
};

function athleteDefaults() {
  const today = dateKey();
  return {
    measures: seedAthlete(today).measures,
    gym: { targetDate: addDays(today, 30), movedAt: null } as GymTransition,
  };
}

function nutritionDefaults() {
  const today = dateKey();
  const seed = seedAthlete(today);
  return {
    body: DEFAULT_BODY,
    weights: seed.weights,
    waist: seed.waist,
    sleep: {} as DayLog,
    steps: {} as DayLog,
    water: {} as DayLog,
    foodLog: {} as Record<string, FoodEntry[]>,
    customFoods: [] as Food[],
    templates: DEFAULT_TEMPLATES,
    refeedDays: [] as string[],
    phaseStart: today,
    carbAdjust: { cut: 0, maintain: 0, bulk: 0 } as Record<Phase, number>,
    stepBonus: 0,
    overrides: {} as Partial<Record<Phase, NutritionOverride>>,
    bfRef: { bf: MEASURE.bf.seed, weight: DEFAULT_WEIGHT, date: today } as BfRef,
  };
}

const withSession = (s: AppState, patch: (session: ActiveSession) => Partial<ActiveSession>) =>
  s.session ? { session: { ...s.session, ...patch(s.session) } } : {};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,
      summary: null,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      setTab: (activeTab) => set({ activeTab }),
      setProfileName: (name) => set((s) => ({ profile: { ...s.profile, name } })),
      setPlan: (patch) =>
        set((s) => ({
          plan: { ...s.plan, ...patch },
          ...(patch.phase && patch.phase !== s.plan.phase ? { phaseStart: dateKey(), stepBonus: 0 } : {}),
          // Режим «Зал» из любого экрана = фактический переход в «100% Fitness»
          ...(patch.location && patch.location !== s.plan.location
            ? { gym: { ...s.gym, movedAt: patch.location === 'gym' ? (s.gym.movedAt ?? dateKey()) : null } }
            : {}),
        })),
      setSwap: (key, name) =>
        set((s) => {
          const swaps = { ...s.swaps };
          if (name) swaps[key] = name;
          else delete swaps[key];
          return { swaps };
        }),
      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      startSession: (workoutId) =>
        set((s) => {
          const w = getWorkout(workoutId, s.plan.phase);
          const entries: Record<string, SetEntry[]> = {};
          for (const e of w.exercises) entries[e.id] = Array.from({ length: e.sets }, emptySet);
          return {
            session: {
              workoutId,
              startedAt: Date.now(),
              phase: s.plan.phase,
              equipment: WORKOUTS[workoutId].equipment,
              entries,
              rest: null,
            },
            playerOpen: true,
            summary: null,
          };
        }),
      setPlayerOpen: (playerOpen) => set({ playerOpen }),

      updateSet: (exerciseId, index, patch) =>
        set((s) =>
          withSession(s, (ses) => {
            const list = [...(ses.entries[exerciseId] ?? [])];
            if (!list[index]) return {};
            list[index] = { ...list[index], ...patch };
            return { entries: { ...ses.entries, [exerciseId]: list } };
          }),
        ),
      addSet: (exerciseId) =>
        set((s) =>
          withSession(s, (ses) => ({
            entries: { ...ses.entries, [exerciseId]: [...(ses.entries[exerciseId] ?? []), emptySet()] },
          })),
        ),

      startRest: (duration, label) =>
        set((s) => withSession(s, () => ({ rest: { endsAt: Date.now() + duration * 1000, duration, label } }))),
      adjustRest: (delta) =>
        set((s) =>
          withSession(s, (ses) => {
            if (!ses.rest) return {};
            const endsAt = ses.rest.endsAt + delta * 1000;
            if (endsAt <= Date.now()) return { rest: null };
            return { rest: { ...ses.rest, endsAt, duration: Math.max(1, ses.rest.duration + delta) } };
          }),
        ),
      clearRest: () => set((s) => withSession(s, () => ({ rest: null }))),

      finishSession: () => {
        const s = get();
        const ses = s.session;
        if (!ses) return null;
        const w = getWorkout(ses.workoutId, ses.phase);
        const finishedAt = Date.now();
        const records = { ...s.records };
        const prs: PRHit[] = [];

        const exercises: LoggedExercise[] = [];
        for (const e of w.exercises) {
          const sets = toLogged(ses.entries[e.id] ?? []);
          if (!sets.length) continue;
          const name = s.swaps[`${ses.workoutId}:${e.id}`] ?? e.name;
          exercises.push({ exerciseId: e.id, name, sets });

          const best = bestSet(sets);
          if (!best) continue;
          const sc = setScore(best.weight, best.reps);
          const prev = records[name];
          const beats =
            !prev || (prev.kind === sc.kind ? sc.score > prev.score + 1e-9 : sc.kind === 'load');
          if (!beats) continue;
          if (prev) prs.push({ name, weight: best.weight, reps: best.reps, prevWeight: prev.weight, prevReps: prev.reps });
          records[name] = { weight: best.weight, reps: best.reps, kind: sc.kind, score: sc.score, date: finishedAt };
        }

        const log: WorkoutLog = {
          id: `${finishedAt.toString(36)}-${ses.workoutId}`,
          workoutId: ses.workoutId,
          title: w.title,
          equipment: ses.equipment,
          phase: ses.phase,
          startedAt: ses.startedAt,
          finishedAt,
          durationSec: Math.round((finishedAt - ses.startedAt) / 1000),
          tonnage: exercises.reduce((t, e) => t + tonnageOf(e.sets), 0),
          totalSets: exercises.reduce((t, e) => t + e.sets.length, 0),
          exercises,
          prs,
        };

        set({
          history: [log, ...s.history].slice(0, HISTORY_LIMIT),
          records,
          session: null,
          playerOpen: false,
          summary: log,
        });
        return log;
      },
      endSession: () => set({ session: null, playerOpen: false }),
      closeSummary: () => set({ summary: null }),
      resetAll: () =>
        set((s) => ({ ...initialState, ...nutritionDefaults(), ...athleteDefaults(), theme: s.theme, activeTab: s.activeTab, summary: null })),

      setBody: (patch) =>
        set((s) => {
          const body = { ...s.body, ...patch };
          if (patch.heightCm === undefined || patch.heightCm === s.body.heightCm) return { body };
          return { body, measures: { ...s.measures, height: { ...s.measures.height, [dateKey()]: patch.heightCm } } };
        }),
      logMetric: (key, date, value) =>
        set((s) => {
          const log = { ...s[key] };
          if (value === null || !Number.isFinite(value) || value <= 0) delete log[date];
          else log[date] = value;
          return { [key]: log } as Partial<AppState>;
        }),
      addWater: (ml, date = dateKey()) =>
        set((s) => ({ water: { ...s.water, [date]: Math.max(0, (s.water[date] ?? 0) + ml) } })),
      addFood: (entry, date = dateKey()) =>
        set((s) => ({
          foodLog: { ...s.foodLog, [date]: [...(s.foodLog[date] ?? []), { ...entry, id: uid(), at: Date.now() }] },
        })),
      removeFood: (id, date = dateKey()) =>
        set((s) => ({ foodLog: { ...s.foodLog, [date]: (s.foodLog[date] ?? []).filter((e) => e.id !== id) } })),
      addCustomFood: (food) => {
        const created: Food = { ...food, id: `custom-${uid()}`, custom: true };
        set((s) => ({ customFoods: [created, ...s.customFoods] }));
        return created;
      },
      removeCustomFood: (id) => set((s) => ({ customFoods: s.customFoods.filter((x) => x.id !== id) })),
      saveTemplate: (name, items) =>
        set((s) => ({ templates: [...s.templates, { id: `tpl-${uid()}`, name, items, custom: true }] })),
      removeTemplate: (id) => set((s) => ({ templates: s.templates.filter((t) => t.id !== id) })),
      setRefeed: (date, on) =>
        set((s) => ({
          refeedDays: on ? Array.from(new Set([...s.refeedDays, date])) : s.refeedDays.filter((d) => d !== date),
        })),
      adjustCarbs: (phase, delta) =>
        set((s) => ({
          carbAdjust: { ...s.carbAdjust, [phase]: delta === null ? 0 : Math.max(-400, s.carbAdjust[phase] + delta) },
        })),
      addStepBonus: (n) => set((s) => ({ stepBonus: n === null ? 0 : Math.min(6000, s.stepBonus + n) })),
      setOverride: (phase, o) =>
        set((s) => {
          const overrides = { ...s.overrides };
          if (o && (o.kcal || o.fat)) overrides[phase] = o;
          else delete overrides[phase];
          return { overrides };
        }),
      setBfRef: (bfRef) =>
        set((s) => ({ bfRef, measures: { ...s.measures, bf: { ...s.measures.bf, [bfRef.date]: bfRef.bf } } })),

      logMeasure: (key, date, value) =>
        set((s) => {
          const log = { ...s.measures[key] };
          if (value === null || !Number.isFinite(value) || value <= 0) delete log[date];
          else log[date] = value;
          const measures = { ...s.measures, [key]: log };
          const latest = latestKey(log);
          const patch: Partial<PersistedState> = { measures };
          // Рост и % жира — источники для TDEE и цели BF: синхронизируем с последней записью
          if (key === 'height' && latest) patch.body = { ...s.body, heightCm: log[latest] };
          if (key === 'bf' && latest)
            patch.bfRef = { bf: log[latest], weight: weightAt(s.weights, latest) ?? s.bfRef.weight, date: latest };
          return patch;
        }),
      setGymTarget: (targetDate) => set((s) => ({ gym: { ...s.gym, targetDate } })),
      markInGym: (inGym) => get().setPlan({ location: inGym ? 'gym' : 'home' }),

      exportBackup: () => ({
        app: BACKUP_APP_ID,
        version: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        state: persistable(get()),
      }),
      importBackup: (raw) => {
        const backup = validateBackup(raw);
        // Чистое состояние → файл в хранилище → штатная регидрация с migrate/merge
        get().resetAll();
        localStorage.setItem(STORE_KEY, JSON.stringify({ state: backup.state, version: backup.version }));
        void useAppStore.persist.rehydrate();
      },
    }),
    {
      name: STORE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      partialize: persistable,
      // Миграции схемы: добавлять ветки `if (version < N)` при каждом повышении SCHEMA_VERSION
      migrate: (persisted, version) => {
        let state = (persisted ?? {}) as Partial<PersistedState>;
        if (version < 1) {
          state = { ...initialState, ...state };
        }
        if (version < 2) {
          state = { ...state, plan: initialPlan, swaps: {}, session: null };
        }
        if (version < 3) {
          // Сессии v2 не содержали подходов — сбрасываем, остальное сохраняем
          state = {
            ...state,
            session: null,
            playerOpen: false,
            settings: DEFAULT_PLAYER_SETTINGS,
            history: [],
            records: {},
          };
        }
        if (version < 4) {
          state = { ...nutritionDefaults(), ...state };
        }
        if (version < 5) {
          // Стартовый профиль атлета: не затираем уже внесённые вес и талию
          const seed = { ...nutritionDefaults(), ...athleteDefaults() };
          state = {
            ...state,
            measures: state.measures ?? seed.measures,
            gym: state.gym ?? { ...seed.gym, movedAt: state.plan?.location === 'gym' ? dateKey() : null },
            weights: state.weights && Object.keys(state.weights).length ? state.weights : seed.weights,
            waist: state.waist && Object.keys(state.waist).length ? state.waist : seed.waist,
          };
        }
        return state as PersistedState;
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PersistedState>;
        return {
          ...current,
          ...p,
          profile: { ...current.profile, ...p.profile },
          plan: { ...current.plan, ...p.plan },
          settings: { ...current.settings, ...p.settings },
          body: { ...current.body, ...p.body },
          carbAdjust: { ...current.carbAdjust, ...p.carbAdjust },
          templates: p.templates ?? current.templates,
          measures: { ...current.measures, ...p.measures },
          gym: { ...current.gym, ...p.gym },
        };
      },
    },
  ),
);

function persistable(s: AppState): PersistedState {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) if (k !== 'summary' && typeof v !== 'function') out[k] = v;
  return out as unknown as PersistedState;
}

const latestKey = (log: DayLog) => Object.keys(log).sort().pop();

function weightAt(weights: DayLog, date: string): number | null {
  const keys = Object.keys(weights).filter((k) => k <= date).sort();
  return keys.length ? weights[keys[keys.length - 1]] : null;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Проверка файла бэкапа на границе доверия: формат, версия и типы ключевых полей */
export function validateBackup(raw: unknown): BackupFile {
  if (!isObj(raw) || raw.app !== BACKUP_APP_ID) throw new Error('Это не бэкап IRON APEX');
  const version = raw.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1)
    throw new Error('Не указана версия бэкапа');
  if (version > SCHEMA_VERSION) throw new Error('Бэкап из более новой версии приложения — обнови приложение');
  const st = raw.state;
  if (!isObj(st)) throw new Error('В файле нет данных');
  const arrays = ['history', 'customFoods', 'templates', 'refeedDays'] as const;
  for (const k of arrays) if (k in st && !Array.isArray(st[k])) throw new Error(`Повреждено поле «${k}»`);
  const objects = ['profile', 'plan', 'settings', 'records', 'body', 'weights', 'waist', 'sleep', 'steps', 'water', 'foodLog', 'measures', 'gym'] as const;
  for (const k of objects) if (k in st && !isObj(st[k])) throw new Error(`Повреждено поле «${k}»`);
  return { app: BACKUP_APP_ID, version, exportedAt: String(raw.exportedAt ?? ''), state: st as unknown as PersistedState };
}
