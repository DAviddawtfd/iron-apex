/** Локальный ключ дня `YYYY-MM-DD` (не UTC — важно для логов питания/веса) */
export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = parseKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

/** a − b в днях */
export function diffDays(a: string, b: string): number {
  return Math.round((parseKey(a).getTime() - parseKey(b).getTime()) / 86_400_000);
}

/** Ключи дней от (end − count + 1) до end включительно */
export function lastDays(end: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => addDays(end, i - count + 1));
}

const WD = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
export const weekdayShort = (key: string) => WD[parseKey(key).getDay()];
