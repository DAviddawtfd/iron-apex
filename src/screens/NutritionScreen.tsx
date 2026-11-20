import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bookmark,
  BookmarkPlus,
  Clock,
  Flame,
  Plus,
  Search,
  Settings2,
  ShieldAlert,
  Trash2,
  Utensils,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Segmented } from '../components/Segmented';
import { NumInput, Ring, Sheet, n0, n1, parseNum, useDraft } from '../components/ui';
import { DayTypeBadge, GuardrailCard, RefeedCard, WaterCard } from '../components/NutritionWidgets';
import { CATEGORY_LABEL, FOODS, macrosFor, searchFoods, sumMacros, type Food, type MealTemplate } from '../data/foods';
import type { Phase } from '../data/schedule';
import { MODES, computeTargets, nutrientTiming, teenGuards, tdee } from '../utils/nutrition';
import { useDayNutrition, type DayNutrition } from '../utils/useDayNutrition';
import { useNow } from '../lib/useNow';

/* ---------- Сводка КБЖУ ---------- */

const MACRO_META = [
  { key: 'p', label: 'Белки', color: '#E05A33' },
  { key: 'f', label: 'Жиры', color: '#E8A33D' },
  { key: 'c', label: 'Углеводы', color: '#4F8FE8' },
] as const;

function MacroSummary({ d, onSettings }: { d: DayNutrition; onSettings: () => void }) {
  const { targets: t, eaten } = d;
  const left = t.kcal - eaten.kcal;
  const goal = { p: t.protein, f: t.fat, c: t.carbs };

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-2">
        <DayTypeBadge d={d} />
        <button
          type="button"
          onClick={onSettings}
          aria-label="Настроить цели КБЖУ"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: 'var(--chip-bg)' }}
        >
          <Settings2 size={16} />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-5">
        <Ring value={eaten.kcal / t.kcal} size={124} stroke={12}>
          <span className="font-mono text-2xl font-bold tabular-nums leading-none">{n0(Math.abs(left))}</span>
          <span className="mt-1 text-[11px] text-muted">{left >= 0 ? 'ккал осталось' : 'ккал сверху'}</span>
        </Ring>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted">Цель на сегодня</p>
          <p className="text-3xl font-bold tracking-tight tabular-nums">
            {n0(t.kcal)}
            <span className="text-base font-medium text-muted"> ккал</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            TDEE {n0(t.tdee)} · {t.offset > 0 ? '+' : ''}
            {t.offset ? n0(t.offset) : '±0'}
            {t.overridden && ' · вручную'}
          </p>
          <p className="mt-0.5 text-xs text-muted">Съедено {n0(eaten.kcal)} ккал</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {MACRO_META.map(({ key, label, color }) => {
          const g = goal[key];
          const e = eaten[key];
          return (
            <div key={key} className="flex flex-col items-center rounded-2xl py-3" style={{ background: 'var(--chip-bg)' }}>
              <Ring value={g ? e / g : 0} size={58} stroke={6} color={color}>
                <span className="text-[11px] font-bold tabular-nums">{n0(e)}</span>
              </Ring>
              <p className="mt-1.5 text-xs font-semibold">{label}</p>
              <p className="text-[11px] tabular-nums text-muted">
                {n0(Math.max(0, g - e))} из {n0(g)} г
              </p>
            </div>
          );
        })}
      </div>

      {d.phase === 'bulk' && (
        <p className="mt-3 text-center text-[11px] text-muted">
          Неделя: {n0(d.weekly.train)} трен. / {n0(d.weekly.rest)} отдых · в среднем {n0(d.weekly.avg)} ккал
        </p>
      )}
    </div>
  );
}

/* ---------- Предупреждения 16 лет ---------- */

function TeenGuard({ warnings }: { warnings: { field: string; text: string }[] }) {
  if (!warnings.length) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} role="alert" className="card flex gap-3 !border-transparent !bg-[#d23c3c] !p-4 text-white">
      <ShieldAlert size={22} className="shrink-0" />
      <div className="text-[13px] leading-snug">
        <p className="font-bold">Защитный барьер 16 лет</p>
        {warnings.map((w) => (
          <p key={w.field} className="mt-0.5 text-white/90">
            {w.text}
          </p>
        ))}
      </div>
    </motion.div>
  );
}

/* ---------- Тайминг ---------- */

function TimingCard({ d }: { d: DayNutrition }) {
  const now = useNow(60_000);
  const tip = nutrientTiming({ training: d.training, window: d.day.window, phase: d.phase, now: new Date(now), done: d.trainedToday });
  const hot = tip.state === 'now';
  return (
    <div className={`card flex gap-3 !p-4 ${hot ? '!border-transparent !bg-accent text-white' : ''}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${hot ? 'bg-white/20' : 'bg-accent/15 text-accent'}`}>
        {hot ? <Zap size={18} /> : <Clock size={18} />}
      </div>
      <div className="min-w-0">
        <p className="font-semibold">{tip.title}</p>
        <p className={`text-[13px] leading-snug ${hot ? 'text-white/85' : 'text-muted'}`}>{tip.text}</p>
      </div>
    </div>
  );
}

/* ---------- Журнал ---------- */

function FoodLogCard({ d, onAdd }: { d: DayNutrition; onAdd: () => void }) {
  const removeFood = useAppStore((s) => s.removeFood);
  return (
    <div className="card !p-4">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 font-semibold">
          <Utensils size={17} className="text-accent" /> Сегодня съедено
        </p>
        <span className="text-xs text-muted">{d.entries.length} поз.</span>
      </div>
      {d.entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Пока пусто — добавь продукт или шаблон</p>
      ) : (
        <ul className="mt-2 flex flex-col">
          <AnimatePresence initial={false}>
            {[...d.entries].reverse().map((e) => (
              <motion.li
                key={e.id}
                layout
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-3 overflow-hidden border-b border-muted/10 py-2.5 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{e.name}</p>
                  <p className="text-[11px] tabular-nums text-muted">
                    {n0(e.grams)} г · Б {n0(e.p)} · Ж {n0(e.f)} · У {n0(e.c)}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums">{n0(e.kcal)}</span>
                <button
                  type="button"
                  onClick={() => removeFood(e.id)}
                  aria-label={`Удалить ${e.name}`}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted"
                >
                  <Trash2 size={15} />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      <motion.button
        whileTap={{ scale: 0.97 }}
        type="button"
        onClick={onAdd}
        className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-accent font-semibold text-white"
      >
        <Plus size={18} /> Добавить продукт
      </motion.button>
    </div>
  );
}

/* ---------- Шаблоны ---------- */

function useFoodIndex() {
  const custom = useAppStore((s) => s.customFoods);
  return useMemo(() => {
    const all = [...custom, ...FOODS];
    return { all, byId: new Map(all.map((f) => [f.id, f])) };
  }, [custom]);
}

function templateMacros(t: MealTemplate, byId: Map<string, Food>) {
  return sumMacros(t.items.map((i) => (byId.get(i.foodId) ? macrosFor(byId.get(i.foodId)!, i.grams) : { kcal: 0, p: 0, f: 0, c: 0 })));
}

function TemplatesRow() {
  const templates = useAppStore((s) => s.templates);
  const addFood = useAppStore((s) => s.addFood);
  const removeTemplate = useAppStore((s) => s.removeTemplate);
  const { byId } = useFoodIndex();
  const [flash, setFlash] = useState<string | null>(null);

  const apply = (t: MealTemplate) => {
    for (const it of t.items) {
      const f = byId.get(it.foodId);
      if (!f) continue;
      const m = macrosFor(f, it.grams);
      addFood({ foodId: f.id, name: f.name, grams: it.grams, kcal: m.kcal, p: m.p, f: m.f, c: m.c });
    }
    setFlash(t.id);
    window.setTimeout(() => setFlash(null), 900);
  };

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 px-1 text-sm font-semibold">
        <Bookmark size={15} className="text-accent" /> Шаблоны в 1 тап
      </p>
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {templates.map((t) => {
          const m = templateMacros(t, byId);
          const done = flash === t.id;
          return (
            <motion.div key={t.id} whileTap={{ scale: 0.96 }} className="relative shrink-0">
              <button
                type="button"
                onClick={() => apply(t)}
                className={`card flex w-40 flex-col items-start !p-3.5 text-left transition-colors ${done ? '!bg-accent text-white' : ''}`}
              >
                <span className="line-clamp-2 min-h-[2.5em] text-sm font-semibold leading-tight">{done ? 'Добавлено ✓' : t.name}</span>
                <span className={`mt-2 text-lg font-bold tabular-nums ${done ? '' : 'text-accent'}`}>{n0(m.kcal)} ккал</span>
                <span className={`text-[11px] tabular-nums ${done ? 'text-white/80' : 'text-muted'}`}>
                  Б {n0(m.p)} · Ж {n0(m.f)} · У {n0(m.c)}
                </span>
              </button>
              {t.custom && (
                <button
                  type="button"
                  onClick={() => removeTemplate(t.id)}
                  aria-label={`Удалить шаблон ${t.name}`}
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full text-muted"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Добавление продукта ---------- */

function AddFoodSheet({ onClose }: { onClose: () => void }) {
  const addFood = useAppStore((s) => s.addFood);
  const saveTemplate = useAppStore((s) => s.saveTemplate);
  const removeCustomFood = useAppStore((s) => s.removeCustomFood);
  const { all } = useFoodIndex();
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<Food | null>(null);
  const [grams, setGrams] = useState('');
  const [creating, setCreating] = useState(false);
  const [cart, setCart] = useState<{ food: Food; grams: number }[]>([]);
  const [tplName, setTplName] = useState('');

  const results = useMemo(() => searchFoods(all, q).slice(0, 60), [all, q]);
  const g = parseNum(grams) || picked?.portion || 100;
  const preview = picked ? macrosFor(picked, g) : null;

  const pick = (f: Food) => {
    setPicked(f);
    setGrams(String(f.portion ?? 100));
  };

  const commit = (alsoCart: boolean) => {
    if (!picked || !preview) return;
    addFood({ foodId: picked.id, name: picked.name, grams: g, kcal: preview.kcal, p: preview.p, f: preview.f, c: preview.c });
    if (alsoCart) setCart((c) => [...c, { food: picked, grams: g }]);
    setPicked(null);
    setQ('');
  };

  if (creating) return <CustomFoodSheet onClose={() => setCreating(false)} onCreated={(f) => { setCreating(false); pick(f); }} />;

  return (
    <Sheet title={picked ? picked.name : 'Добавить продукт'} onClose={onClose}>
      {picked && preview ? (
        <div>
          <p className="text-xs text-muted">
            На 100 г: {n0(picked.kcal)} ккал · Б {n1(picked.p)} · Ж {n1(picked.f)} · У {n1(picked.c)}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <NumInput label="Граммовка" value={grams} onChange={setGrams} suffix="г" className="flex-1" />
            {[50, 100, 150, 200].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setGrams(String(v))}
                className={`h-11 rounded-xl px-2.5 text-xs font-semibold ${g === v ? 'bg-accent text-white' : 'text-muted'}`}
                style={g !== v ? { background: 'var(--chip-bg)' } : undefined}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            {[
              ['ккал', preview.kcal],
              ['Б', preview.p],
              ['Ж', preview.f],
              ['У', preview.c],
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-2xl py-2.5" style={{ background: 'var(--chip-bg)' }}>
                <p className="font-mono text-lg font-bold tabular-nums">{n0(v as number)}</p>
                <p className="text-[11px] text-muted">{l}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setPicked(null)} className="h-12 flex-1 rounded-full font-semibold" style={{ background: 'var(--chip-bg)' }}>
              Назад
            </button>
            <button type="button" onClick={() => commit(true)} className="h-12 flex-[2] rounded-full bg-accent font-semibold text-white">
              Добавить
            </button>
          </div>
        </div>
      ) : (
        <div>
          <label className="flex h-12 items-center gap-2 rounded-2xl px-4 focus-within:ring-2 focus-within:ring-accent/60" style={{ background: 'var(--chip-bg)' }}>
            <Search size={17} className="text-muted" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Гречка, курица, творог…"
              aria-label="Поиск продукта"
              className="w-full bg-transparent text-base outline-none placeholder:text-muted/70"
            />
          </label>

          {cart.length > 0 && (
            <div className="mt-3 rounded-2xl p-3" style={{ background: 'var(--chip-bg)' }}>
              <p className="text-xs text-muted">Добавлено сейчас: {cart.map((c) => c.food.name.split(' (')[0]).join(', ')}</p>
              <div className="mt-2 flex gap-2">
                <input
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  placeholder="Название шаблона"
                  aria-label="Название шаблона"
                  className="h-10 min-w-0 flex-1 rounded-xl px-3 text-sm outline-none"
                  style={{ background: 'var(--card-bg)' }}
                />
                <button
                  type="button"
                  disabled={!tplName.trim()}
                  onClick={() => {
                    saveTemplate(tplName.trim(), cart.map((c) => ({ foodId: c.food.id, grams: c.grams })));
                    setCart([]);
                    setTplName('');
                  }}
                  className="flex h-10 items-center gap-1.5 rounded-xl bg-accent px-3 text-xs font-semibold text-white disabled:opacity-40"
                >
                  <BookmarkPlus size={14} /> В шаблон
                </button>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold text-accent"
            style={{ background: 'var(--chip-bg)' }}
          >
            <Plus size={16} /> Создать свой продукт
          </button>

          <ul className="mt-2 flex flex-col">
            {results.map((f, i) => {
              const header = !q && (i === 0 || results[i - 1].cat !== f.cat || results[i - 1].custom !== f.custom);
              return (
                <li key={f.id}>
                  {header && <p className="mb-1 mt-3 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{f.custom ? 'Мои продукты' : CATEGORY_LABEL[f.cat]}</p>}
                  <div className="flex items-center">
                    <button type="button" onClick={() => pick(f)} className="flex min-w-0 flex-1 items-center justify-between gap-3 rounded-xl px-1 py-2.5 text-left">
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{f.name}</span>
                        <span className="text-[11px] tabular-nums text-muted">
                          Б {n1(f.p)} · Ж {n1(f.f)} · У {n1(f.c)}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {n0(f.kcal)} <span className="text-[11px] font-normal text-muted">/100 г</span>
                      </span>
                    </button>
                    {f.custom && (
                      <button type="button" onClick={() => removeCustomFood(f.id)} aria-label={`Удалить ${f.name}`} className="flex h-8 w-8 items-center justify-center text-muted">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
            {!results.length && <p className="py-6 text-center text-sm text-muted">Не найдено — создай свой продукт</p>}
          </ul>
        </div>
      )}
    </Sheet>
  );
}

function CustomFoodSheet({ onClose, onCreated }: { onClose: () => void; onCreated: (f: Food) => void }) {
  const addCustomFood = useAppStore((s) => s.addCustomFood);
  const [name, setName] = useState('');
  const [v, setV] = useState({ kcal: '', p: '', f: '', c: '' });
  const nums = { kcal: parseNum(v.kcal), p: parseNum(v.p) || 0, f: parseNum(v.f) || 0, c: parseNum(v.c) || 0 };
  const autoKcal = nums.p * 4 + nums.f * 9 + nums.c * 4;
  const kcal = Number.isFinite(nums.kcal) ? nums.kcal : autoKcal;
  const valid = name.trim().length > 1 && kcal > 0 && nums.p + nums.f + nums.c <= 100;

  return (
    <Sheet title="Свой продукт" onClose={onClose}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Название"
        aria-label="Название продукта"
        className="h-12 w-full rounded-2xl px-4 text-base outline-none focus:ring-2 focus:ring-accent/60"
        style={{ background: 'var(--chip-bg)' }}
      />
      <p className="mb-2 mt-4 text-xs font-medium text-muted">На 100 г</p>
      <div className="grid grid-cols-2 gap-2">
        <NumInput label="Белки" value={v.p} onChange={(p) => setV({ ...v, p })} suffix="Б, г" />
        <NumInput label="Жиры" value={v.f} onChange={(f) => setV({ ...v, f })} suffix="Ж, г" />
        <NumInput label="Углеводы" value={v.c} onChange={(c) => setV({ ...v, c })} suffix="У, г" />
        <NumInput label="Калории" value={v.kcal} onChange={(k) => setV({ ...v, kcal: k })} suffix="ккал" placeholder={autoKcal ? n0(autoKcal) : 'авто'} />
      </div>
      <button
        type="button"
        disabled={!valid}
        onClick={() => onCreated(addCustomFood({ name: name.trim(), kcal: Math.round(kcal), p: nums.p, f: nums.f, c: nums.c, cat: 'other' }))}
        className="mt-4 h-12 w-full rounded-full bg-accent font-semibold text-white disabled:opacity-40"
      >
        Сохранить и выбрать
      </button>
    </Sheet>
  );
}

/* ---------- Настройка целей ---------- */

function TargetsSheet({ d, onClose }: { d: DayNutrition; onClose: () => void }) {
  const body = useAppStore((s) => s.body);
  const setBody = useAppStore((s) => s.setBody);
  const override = useAppStore((s) => s.overrides[d.phase]);
  const setOverride = useAppStore((s) => s.setOverride);
  const auto = computeTargets({ weight: d.weight, body, phase: d.phase, training: d.training });
  const [kcal, setKcal] = useDraft(override?.kcal ? String(override.kcal) : '');
  const [fat, setFat] = useDraft(override?.fat ? String(override.fat) : '');
  const [h, setH] = useDraft(String(body.heightCm).replace('.', ','));
  const [age, setAge] = useDraft(String(body.age));

  const k = parseNum(kcal);
  const f = parseNum(fat);
  const live = teenGuards(Number.isFinite(k) ? k : auto.kcal, Number.isFinite(f) ? f : auto.fat, d.weight, parseNum(age) || body.age);
  const mode = MODES[d.phase];

  const save = () => {
    setOverride(d.phase, { kcal: Number.isFinite(k) && k > 0 ? k : undefined, fat: Number.isFinite(f) && f > 0 ? f : undefined });
    const hh = parseNum(h);
    const aa = parseNum(age);
    setBody({ heightCm: hh >= 120 && hh <= 230 ? hh : body.heightCm, age: aa >= 12 && aa <= 90 ? Math.round(aa) : body.age });
    onClose();
  };

  return (
    <Sheet title={`Цели: ${mode.label}`} onClose={onClose}>
      <div className="rounded-2xl p-3 text-[13px] leading-snug" style={{ background: 'var(--chip-bg)' }}>
        <p className="font-semibold">{mode.full}</p>
        <p className="mt-0.5 text-muted">
          {mode.offsetText}. {mode.why}.
        </p>
        <p className="mt-1.5 tabular-nums text-muted">
          Миффлин–Сан Жеор: {n1(d.weight)} кг · {n1(body.heightCm)} см · {body.age} лет × {body.activity} = TDEE{' '}
          <b className="text-ink">{n0(tdee(d.weight, body))}</b>
        </p>
        <p className="mt-0.5 tabular-nums text-muted">
          Авто: {n0(auto.kcal)} ккал · Б {auto.protein} · Ж {auto.fat} · У {auto.carbs}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <NumInput label="Рост" value={h} onChange={setH} suffix="см" />
        <NumInput label="Возраст" value={age} onChange={setAge} suffix="лет" />
      </div>

      <p className="mb-2 mt-4 text-xs font-medium text-muted">Ручная корректировка (пусто — авто)</p>
      <div className="grid grid-cols-2 gap-2">
        <NumInput label="Калории вручную" value={kcal} onChange={setKcal} suffix="ккал" placeholder={n0(auto.kcal)} className={live.some((w) => w.field === 'kcal') ? 'ring-2 ring-[#d23c3c]' : ''} />
        <NumInput label="Жиры вручную" value={fat} onChange={setFat} suffix="г жиров" placeholder={String(auto.fat)} className={live.some((w) => w.field === 'fat') ? 'ring-2 ring-[#d23c3c]' : ''} />
      </div>
      <AnimatePresence>
        {live.map((w) => (
          <motion.p key={w.field} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} role="alert" className="mt-2 flex gap-2 rounded-xl bg-[#d23c3c] p-2.5 text-xs font-medium text-white">
            <ShieldAlert size={15} className="shrink-0" /> {w.text}
          </motion.p>
        ))}
      </AnimatePresence>
      <p className="mt-2 text-[11px] text-muted">Белок фиксирован ({mode.proteinPerKg} г/кг), углеводы считаются как остаток калорий.</p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setKcal('');
            setFat('');
          }}
          className="h-12 flex-1 rounded-full font-semibold"
          style={{ background: 'var(--chip-bg)' }}
        >
          Авто
        </button>
        <button type="button" onClick={save} className="h-12 flex-[2] rounded-full bg-accent font-semibold text-white">
          Сохранить
        </button>
      </div>
    </Sheet>
  );
}

/* ---------- Экран ---------- */

export function NutritionScreen() {
  const plan = useAppStore((s) => s.plan);
  const setPlan = useAppStore((s) => s.setPlan);
  const d = useDayNutrition();
  const [sheet, setSheet] = useState<'add' | 'targets' | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="card !p-3">
        <Segmented<Phase>
          id="nutrition-mode"
          value={plan.phase}
          onChange={(phase) => setPlan({ phase })}
          options={[
            { value: 'cut', label: 'Сушка' },
            { value: 'maintain', label: 'Удержание' },
            { value: 'bulk', label: 'Чистый набор' },
          ]}
        />
        <p className="flex items-center gap-1.5 px-2 pt-2 text-[11px] leading-snug text-muted">
          <Flame size={12} className="shrink-0 text-accent" />
          {MODES[plan.phase].full} · {MODES[plan.phase].offsetText}
        </p>
      </div>

      <TeenGuard warnings={d.guards} />
      <MacroSummary d={d} onSettings={() => setSheet('targets')} />
      <RefeedCard d={d} />
      <GuardrailCard rail={d.rail} d={d} />
      <TimingCard d={d} />
      <WaterCard d={d} />
      <TemplatesRow />
      <FoodLogCard d={d} onAdd={() => setSheet('add')} />

      <AnimatePresence>
        {sheet === 'add' && <AddFoodSheet key="add" onClose={() => setSheet(null)} />}
        {sheet === 'targets' && <TargetsSheet key="targets" d={d} onClose={() => setSheet(null)} />}
      </AnimatePresence>
    </div>
  );
}
