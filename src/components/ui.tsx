import { useEffect, useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, X } from 'lucide-react';

export const n0 = (n: number) => Math.round(n).toLocaleString('ru-RU');
export const n1 = (n: number) => (Math.round(n * 10) / 10).toLocaleString('ru-RU');

/* ---------- Кольцо прогресса ---------- */

export function Ring({
  value,
  size = 84,
  stroke = 9,
  color = 'rgb(var(--accent))',
  track = 'currentColor',
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeOpacity="0.12" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={value > 1.05 ? '#d23c3c' : color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ type: 'spring', stiffness: 90, damping: 20 }}
        />
      </svg>
      {children && <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>}
    </div>
  );
}

/* ---------- Полоса ---------- */

export function Bar({ value, marker, className = '' }: { value: number; marker?: number; className?: string }) {
  return (
    <div className={`relative h-2 overflow-hidden rounded-full ${className}`} style={{ background: 'var(--chip-bg)' }}>
      <motion.div
        className="h-full rounded-full bg-accent"
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
        transition={{ type: 'spring', stiffness: 120, damping: 22 }}
      />
      {marker !== undefined && (
        <span className="absolute inset-y-0 w-0.5 bg-ink/40" style={{ left: `${Math.min(1, marker) * 100}%` }} />
      )}
    </div>
  );
}

/* ---------- Нижний лист ---------- */

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        onClick={(e) => e.stopPropagation()}
        className="no-scrollbar max-h-[88vh] w-full max-w-[430px] overflow-y-auto rounded-t-[30px] p-5 pb-[max(env(safe-area-inset-bottom),20px)] backdrop-blur-xl"
        style={{ background: 'var(--sheet-bg)' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={{ background: 'var(--chip-bg)' }}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ---------- Ввод чисел ---------- */

export function NumInput({
  value,
  onChange,
  placeholder,
  label,
  suffix,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label: string;
  suffix?: string;
  className?: string;
}) {
  return (
    <label className={`flex h-11 items-center gap-1 rounded-xl px-3 focus-within:ring-2 focus-within:ring-accent/60 ${className}`} style={{ background: 'var(--chip-bg)' }}>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        aria-label={label}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, '').slice(0, 7))}
        className="w-full min-w-0 bg-transparent text-base font-semibold tabular-nums outline-none placeholder:font-normal placeholder:text-muted/60"
      />
      {suffix && <span className="shrink-0 text-xs text-muted">{suffix}</span>}
    </label>
  );
}

export const parseNum = (s: string) => {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

/** Значение со степпером ± */
export function Stepper({
  value,
  step,
  min,
  max,
  onChange,
  format = n1,
  suffix,
  label,
}: {
  value: number;
  step: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  format?: (n: number) => string;
  suffix?: string;
  label: string;
}) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, Math.round(v * 100) / 100)));
  const btn = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-full';
  return (
    <div className="flex items-center gap-2">
      <motion.button whileTap={{ scale: 0.88 }} type="button" aria-label={`${label}: меньше`} onClick={() => set(value - step)} className={btn} style={{ background: 'var(--chip-bg)' }}>
        <Minus size={16} />
      </motion.button>
      <span className="min-w-[72px] flex-1 text-center font-mono text-xl font-bold tabular-nums">
        {format(value)}
        {suffix && <span className="ml-1 text-xs font-medium text-muted">{suffix}</span>}
      </span>
      <motion.button whileTap={{ scale: 0.88 }} type="button" aria-label={`${label}: больше`} onClick={() => set(value + step)} className={btn} style={{ background: 'var(--chip-bg)' }}>
        <Plus size={16} />
      </motion.button>
    </div>
  );
}

/** Сохраняет локальный черновик, синхронизируясь с внешним значением */
export function useDraft<T>(value: T) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return [draft, setDraft] as const;
}
