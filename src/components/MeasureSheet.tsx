import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { MEASURE, type MeasureKey } from '../data/athlete';
import type { DayLog } from '../utils/nutrition';
import { dateKey, parseKey } from '../utils/date';
import { NumInput, Sheet, n1, parseNum } from './ui';

/** Лог любого замера: вес и талия по пупку живут в отдельных полях стора */
export function useMeasureLog(key: MeasureKey): DayLog {
  return useAppStore((s) => (key === 'weight' ? s.weights : key === 'waist' ? s.waist : s.measures[key])) ?? EMPTY;
}

const EMPTY: DayLog = {};

export function useLogMeasure() {
  const logMetric = useAppStore((s) => s.logMetric);
  const logMeasure = useAppStore((s) => s.logMeasure);
  return (key: MeasureKey, date: string, value: number | null) => {
    if (key === 'weight') logMetric('weights', date, value);
    else if (key === 'waist') logMetric('waist', date, value);
    else logMeasure(key, date, value);
  };
}

export const longDate = (key: string) =>
  parseKey(key).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });

export const dateInputStyle = { background: 'var(--chip-bg)', colorScheme: 'inherit' } as const;

/** Запись замера на любую дату + история с удалением */
export function MeasureSheet({ k, onClose }: { k: MeasureKey; onClose: () => void }) {
  const meta = MEASURE[k];
  const log = useMeasureLog(k);
  const put = useLogMeasure();
  const today = dateKey();
  const [date, setDate] = useState(today);
  const [val, setVal] = useState(log[today] !== undefined ? String(log[today]).replace('.', ',') : '');
  const entries = Object.entries(log).sort(([a], [b]) => (a < b ? 1 : -1));
  const v = parseNum(val);
  const valid = v >= meta.min && v <= meta.max && date <= today;

  const pickDate = (d: string) => {
    setDate(d);
    if (log[d] !== undefined) setVal(String(log[d]).replace('.', ','));
  };

  return (
    <Sheet title={meta.label} onClose={onClose}>
      {meta.note && <p className="-mt-2 mb-3 text-xs text-muted">Стартовая запись: {meta.note}</p>}
      <div className="flex gap-2">
        <input
          type="date"
          aria-label="Дата замера"
          value={date}
          max={today}
          onChange={(e) => e.target.value && pickDate(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-xl px-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-accent/60"
          style={dateInputStyle}
        />
        <NumInput label={meta.label} value={val} onChange={setVal} suffix={meta.unit} placeholder={n1(meta.seed)} className="w-32" />
      </div>
      {val && !valid && (
        <p className="mt-2 text-xs text-accent">
          Допустимо {meta.min}–{meta.max} {meta.unit}
          {date > today ? ', дата не из будущего' : ''}
        </p>
      )}
      <button
        type="button"
        disabled={!valid}
        onClick={() => {
          put(k, date, v);
          setVal('');
        }}
        className="mt-3 h-12 w-full rounded-full bg-accent font-semibold text-white disabled:opacity-40"
      >
        {log[date] !== undefined ? 'Обновить запись' : 'Записать'}
      </button>

      <p className="mb-1.5 mt-5 text-xs font-semibold uppercase tracking-wider text-muted">История · {entries.length}</p>
      {entries.length === 0 ? (
        <p className="text-sm text-muted">Записей пока нет</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {entries.map(([d, value], i) => {
            const prev = entries[i + 1]?.[1];
            const delta = prev !== undefined ? value - prev : null;
            return (
              <li key={d} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: 'var(--chip-bg)' }}>
                <button type="button" onClick={() => pickDate(d)} className="flex-1 text-left text-sm">
                  {longDate(d)}
                </button>
                {delta !== null && Math.abs(delta) > 0.001 && (
                  <span className="text-xs tabular-nums text-muted">
                    {delta > 0 ? '+' : '−'}
                    {n1(Math.abs(delta))}
                  </span>
                )}
                <span className="font-mono text-sm font-bold tabular-nums">
                  {n1(value)} <span className="text-xs font-normal text-muted">{meta.unit}</span>
                </span>
                <button
                  type="button"
                  aria-label={`Удалить запись ${longDate(d)}`}
                  onClick={() => put(k, d, null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-muted"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}
