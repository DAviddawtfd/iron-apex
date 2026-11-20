import type { ReactNode } from 'react';
import { useAppStore } from '../store/useAppStore';

export const ACCENT = '#E05A33';
export const SERIES = ['#E05A33', '#0EA5E9', '#8B5CF6', '#10B981', '#F59E0B'];

/** Цвета Recharts под Light Bento / Dark Glass (SVG-атрибуты не понимают CSS-переменные) */
export function useChartTheme() {
  const dark = useAppStore((s) => s.theme) === 'dark';
  return {
    dark,
    accent: ACCENT,
    grid: dark ? 'rgba(255,255,255,0.08)' : 'rgba(16,16,20,0.07)',
    axis: dark ? '#A0A6B0' : '#80808A',
    ink: dark ? '#F4F5F7' : '#16161A',
    soft: dark ? 'rgba(255,255,255,0.55)' : 'rgba(22,22,26,0.45)',
    dotFill: dark ? '#22262C' : '#FFFFFF',
    cursor: dark ? 'rgba(255,255,255,0.25)' : 'rgba(16,16,20,0.15)',
    tick: { fontSize: 10, fill: dark ? '#A0A6B0' : '#80808A' },
  };
}

interface TipRow {
  name?: string | number;
  value?: number | string | (number | string)[];
  color?: string;
  dataKey?: string | number | ((obj: unknown) => unknown);
}

/** Тултип в стиле карточек приложения */
export function ChartTooltip({
  active,
  payload,
  label,
  format,
  labelFormat,
}: {
  active?: boolean;
  payload?: TipRow[];
  label?: string | number;
  format?: (v: number, name: string) => ReactNode;
  labelFormat?: (l: string) => string;
}) {
  const rows = (payload ?? []).filter((p) => typeof p.value === 'number');
  if (!active || !rows.length) return null;
  return (
    <div
      className="rounded-2xl px-3 py-2 text-xs shadow-lg backdrop-blur-xl"
      style={{ background: 'var(--sheet-bg)', border: '1px solid var(--card-border)' }}
    >
      {label !== undefined && <p className="mb-1 font-semibold text-muted">{labelFormat ? labelFormat(String(label)) : label}</p>}
      {rows.map((p) => (
        <p key={String(p.name)} className="flex items-center gap-1.5 tabular-nums">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted">{p.name}</span>
          <span className="ml-auto pl-3 font-semibold">{format ? format(p.value as number, String(p.name)) : String(p.value)}</span>
        </p>
      ))}
    </div>
  );
}
