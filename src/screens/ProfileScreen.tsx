import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Bell,
  ChevronRight,
  Download,
  Dumbbell,
  Moon,
  Palette,
  RotateCcw,
  Sun,
  Upload,
  User,
  Route,
  Check,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { Segmented } from '../components/Segmented';
import { Sheet, Stepper, n1, useDraft } from '../components/ui';
import { MeasureSheet, useMeasureLog } from '../components/MeasureSheet';
import { MEASURES, MEASURE_GROUPS, type MeasureGroup, type MeasureKey, type MeasureMeta } from '../data/athlete';
import { MODES, TARGET_BF } from '../utils/nutrition';
import { latest } from '../utils/progress';
import { dateKey, parseKey } from '../utils/date';
import type { Phase } from '../data/schedule';
import type { Theme } from '../store/useAppStore';
import { native } from '../lib/native';

function Section({ icon: Icon, title, children }: { icon: typeof User; title: string; children: React.ReactNode }) {
  return (
    <section className="card !p-4">
      <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
        <Icon size={16} className="text-accent" /> {title}
      </h2>
      {children}
    </section>
  );
}

/* ---------- Атлет ---------- */

function MeasureRow({ meta, onOpen }: { meta: MeasureMeta; onOpen: () => void }) {
  const log = useMeasureLog(meta.key);
  const value = latest(log);
  const count = Object.keys(log).length;
  return (
    <button type="button" onClick={onOpen} className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-left" style={{ background: 'var(--chip-bg)' }}>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm">{meta.label}</span>
        {count > 1 && <span className="text-[10px] text-muted">{count} записей</span>}
      </span>
      <span className="font-mono text-sm font-bold tabular-nums">{value !== null ? n1(value) : '—'}</span>
      <span className="w-5 text-xs text-muted">{meta.unit}</span>
      <ChevronRight size={15} className="text-muted" />
    </button>
  );
}

function AthleteSection() {
  const name = useAppStore((s) => s.profile.name);
  const setName = useAppStore((s) => s.setProfileName);
  const body = useAppStore((s) => s.body);
  const setBody = useAppStore((s) => s.setBody);
  const [draft, setDraft] = useDraft(name);
  const [open, setOpen] = useState<MeasureKey | null>(null);
  const groups: MeasureGroup[] = ['body', 'girth', 'skeleton'];

  return (
    <Section icon={User} title="Атлет">
      <label className="flex h-11 items-center gap-2 rounded-xl px-3 focus-within:ring-2 focus-within:ring-accent/60" style={{ background: 'var(--chip-bg)' }}>
        <span className="text-xs text-muted">Имя</span>
        <input
          value={draft}
          maxLength={24}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => setName(draft.trim() || 'Атлет')}
          className="min-w-0 flex-1 bg-transparent text-base font-semibold outline-none"
          aria-label="Имя"
        />
      </label>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-sm">Возраст</span>
        <div className="w-48">
          <Stepper label="Возраст" value={body.age} step={1} min={12} max={90} onChange={(age) => setBody({ age })} format={String} suffix="лет" />
        </div>
      </div>
      <div className="mt-3">
        <Segmented
          id="sex"
          value={body.sex}
          onChange={(sex) => setBody({ sex })}
          options={[
            { value: 'male', label: 'Мужской' },
            { value: 'female', label: 'Женский' },
          ]}
        />
      </div>
      {body.age < 18 && (
        <p className="mt-2 text-[11px] text-muted">До 18 лет действуют защитные пороги: ≥ 2000 ккал и жиры ≥ 0,8 г/кг.</p>
      )}

      {groups.map((g) => (
        <div key={g} className="mt-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted">
            {MEASURE_GROUPS[g]}
            {g === 'body' && <span className="normal-case tracking-normal"> · цель {TARGET_BF}% BF</span>}
          </p>
          <div className="flex flex-col gap-1.5">
            {MEASURES.filter((m) => m.group === g).map((m) => (
              <MeasureRow key={m.key} meta={m} onOpen={() => setOpen(m.key)} />
            ))}
          </div>
        </div>
      ))}
      <p className="mt-3 text-[11px] text-muted">Каждое изменение сохраняется в историю с датой — графики во вкладке «Прогресс».</p>

      <AnimatePresence>{open && <MeasureSheet key={open} k={open} onClose={() => setOpen(null)} />}</AnimatePresence>
    </Section>
  );
}

/* ---------- Режимы ---------- */

function ModesSection() {
  const plan = useAppStore((s) => s.plan);
  const setPlan = useAppStore((s) => s.setPlan);
  const phaseStart = useAppStore((s) => s.phaseStart);

  return (
    <Section icon={Route} title="Режимы">
      <div className="flex flex-col gap-2.5">
        <Segmented
          id="p-location"
          value={plan.location}
          onChange={(location) => setPlan({ location })}
          options={[
            { value: 'home', label: 'Дом' },
            { value: 'gym', label: 'Зал 100% Fitness' },
          ]}
        />
        <Segmented<Phase>
          id="p-phase"
          value={plan.phase}
          onChange={(phase) => setPlan({ phase })}
          options={[
            { value: 'cut', label: 'Сушка' },
            { value: 'maintain', label: 'Удержание' },
            { value: 'bulk', label: 'Набор' },
          ]}
        />
      </div>
      <p className="mt-2 text-[11px] text-muted">
        {MODES[plan.phase].full} · с {parseKey(phaseStart).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}. Смена этапа
        сбрасывает счётчик рефида.
      </p>
    </Section>
  );
}

/* ---------- Гантели ---------- */

function DumbbellSection() {
  const settings = useAppStore((s) => s.settings);
  const setSettings = useAppStore((s) => s.setSettings);
  return (
    <Section icon={Dumbbell} title="Домашние гантели">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">Максимальный вес</span>
          <div className="w-48">
            <Stepper label="Максимум гантели" value={settings.maxDumbbellKg} step={1} min={2} max={80} onChange={(maxDumbbellKg) => setSettings({ maxDumbbellKg })} suffix="кг" />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm">Шаг блинов</span>
          <div className="w-48">
            <Stepper label="Шаг гантели" value={settings.dumbbellStepKg} step={0.5} min={0.5} max={10} onChange={(dumbbellStepKg) => setSettings({ dumbbellStepKg })} suffix="кг" />
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted">
        Плеер подсказывает «+повторы / темп», если шаг больше 10% рабочего веса или гантели на максимуме.
      </p>
    </Section>
  );
}

/* ---------- Тема ---------- */

function ThemeSection() {
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const opts: { value: Theme; label: string; icon: typeof Sun; preview: string }[] = [
    { value: 'light', label: 'Light Bento', icon: Sun, preview: 'linear-gradient(135deg,#f2f2f4 50%,#ffffff 50%)' },
    { value: 'dark', label: 'Dark Glass', icon: Moon, preview: 'linear-gradient(165deg,#2e333a,#171a1e)' },
  ];
  return (
    <Section icon={Palette} title="Оформление">
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Тема">
        {opts.map(({ value, label, icon: Icon, preview }) => {
          const active = theme === value;
          return (
            <motion.button
              key={value}
              whileTap={{ scale: 0.96 }}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setTheme(value)}
              className={`relative flex flex-col gap-2 rounded-2xl p-2 text-left ring-2 transition-shadow ${active ? 'ring-accent' : 'ring-transparent'}`}
              style={{ background: 'var(--chip-bg)' }}
            >
              <span className="flex h-16 items-end rounded-xl p-2" style={{ background: preview }}>
                <span className={`h-5 w-10 rounded-md ${value === 'dark' ? 'border border-white/20 bg-white/10' : 'bg-white shadow'}`} />
              </span>
              <span className="flex items-center gap-1.5 px-1 text-sm font-semibold">
                <Icon size={14} /> {label}
                {active && <Check size={14} className="ml-auto text-accent" />}
              </span>
            </motion.button>
          );
        })}
      </div>
    </Section>
  );
}

/* ---------- Данные ---------- */

function DataSection() {
  const exportBackup = useAppStore((s) => s.exportBackup);
  const importBackup = useAppStore((s) => s.importBackup);
  const resetAll = useAppStore((s) => s.resetAll);
  const session = useAppStore((s) => !!s.session);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState<unknown>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const doExport = async () => {
    const json = JSON.stringify(exportBackup(), null, 2);
    const filename = `iron-apex-backup-${dateKey()}.json`;
    const file = new File([json], filename, { type: 'application/json' });
    try {
      // На телефоне удобнее «Поделиться» (Диск, Telegram), в браузере — обычная загрузка
      if (navigator.canShare?.({ files: [file] }) && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
        await navigator.share({ files: [file], title: 'IRON APEX — бэкап' });
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      setMsg({ ok: true, text: `Сохранено: ${filename}` });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setMsg({ ok: false, text: 'Не удалось сохранить файл' });
    }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      if (f.size > 20 * 1024 * 1024) throw new Error('Файл больше 20 МБ');
      setPending(JSON.parse(await f.text()));
    } catch (e) {
      setMsg({ ok: false, text: e instanceof SyntaxError ? 'Файл не является JSON' : (e as Error).message });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const applyImport = () => {
    try {
      importBackup(pending);
      setMsg({ ok: true, text: 'Бэкап восстановлен' });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
    setPending(null);
  };

  const btn = 'flex h-12 items-center justify-center gap-2 rounded-full text-sm font-semibold';
  return (
    <Section icon={Download} title="Данные">
      <div className="grid grid-cols-2 gap-2">
        <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={doExport} className={`${btn} bg-accent text-white`}>
          <Download size={17} /> Экспорт
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} type="button" onClick={() => fileRef.current?.click()} className={btn} style={{ background: 'var(--chip-bg)' }}>
          <Upload size={17} /> Импорт
        </motion.button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      <p className="mt-2 text-[11px] text-muted">Полный бэкап в JSON: профиль, замеры, тренировки, рекорды, питание и настройки.</p>
      {msg && (
        <p role="status" className={`mt-2 text-xs font-medium ${msg.ok ? 'text-emerald-500' : 'text-accent'}`}>
          {msg.text}
        </p>
      )}

      <button type="button" onClick={() => setConfirmReset(true)} className={`${btn} mt-4 w-full text-accent`} style={{ background: 'var(--chip-bg)' }}>
        <RotateCcw size={16} /> Сбросить все данные
      </button>

      <AnimatePresence>
        {pending !== null && (
          <Sheet title="Восстановить бэкап?" onClose={() => setPending(null)}>
            <p className="text-sm text-muted">
              Текущие данные будут полностью заменены данными из файла
              {typeof pending === 'object' && pending && 'exportedAt' in pending
                ? ` от ${new Date(String((pending as { exportedAt: string }).exportedAt)).toLocaleString('ru-RU')}`
                : ''}
              . Сначала можно сделать экспорт текущих данных.
            </p>
            {session && <p className="mt-2 text-xs text-accent">Идущая тренировка будет закрыта без сохранения.</p>}
            <button type="button" onClick={applyImport} className="mt-4 h-12 w-full rounded-full bg-accent font-semibold text-white">
              Восстановить
            </button>
          </Sheet>
        )}
        {confirmReset && (
          <Sheet title="Сбросить всё?" onClose={() => setConfirmReset(false)}>
            <p className="flex gap-2 text-sm text-muted">
              <AlertTriangle size={18} className="shrink-0 text-accent" />
              Удалятся история тренировок, рекорды, питание и замеры. Профиль вернётся к стартовым значениям. Действие необратимо.
            </p>
            <button
              type="button"
              onClick={() => {
                resetAll();
                setConfirmReset(false);
                setMsg({ ok: true, text: 'Данные сброшены' });
              }}
              className="mt-4 h-12 w-full rounded-full bg-accent font-semibold text-white"
            >
              Да, сбросить
            </button>
          </Sheet>
        )}
      </AnimatePresence>
    </Section>
  );
}

/* ---------- Точные будильники (Android 12+) ---------- */

function AlarmNotice() {
  const [exact, setExact] = useState<boolean | null>(null);
  useEffect(() => {
    const check = () => void native.exactAlarms().then(setExact);
    check();
    // После возврата из системных настроек перепроверяем
    document.addEventListener('visibilitychange', check);
    return () => document.removeEventListener('visibilitychange', check);
  }, []);
  if (exact !== false) return null;
  return (
    <button type="button" onClick={() => void native.openExactAlarmSettings()} className="card flex gap-3 !p-4 text-left">
      <Bell size={18} className="mt-0.5 shrink-0 text-accent" />
      <span className="text-sm">
        <b>Разреши точные будильники</b>
        <span className="block text-xs text-muted">Без них сигнал отдыха при выключенном экране может опоздать на минуту. Нажми, чтобы открыть настройки.</span>
      </span>
    </button>
  );
}

export function ProfileScreen() {
  return (
    <div className="flex flex-col gap-3">
      <AlarmNotice />
      <ThemeSection />
      <AthleteSection />
      <ModesSection />
      <DumbbellSection />
      <DataSection />
      <p className="pb-2 text-center text-[11px] text-muted">IRON APEX · данные хранятся только на устройстве</p>
    </div>
  );
}
