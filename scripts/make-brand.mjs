// Генерирует исходники иконки и сплэша для @capacitor/assets из векторного логотипа.
// Запуск: node scripts/make-brand.mjs
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const ACCENT = '#E05A33';
const DARK = '#16161A';
mkdirSync('assets', { recursive: true });
mkdirSync('public', { recursive: true });

/** Знак «Apex»: двойная вершина-шеврон + штанга-перекладина. Координаты в квадрате 100×100. */
const mark = (color, cut) => `
  <path d="M50 14 L86 80 H69 L50 44 L31 80 H14 Z" fill="${color}"/>
  <path d="M50 52 L62 74 H38 Z" fill="${cut}"/>
  <rect x="22" y="84" width="56" height="7" rx="3.5" fill="${color}"/>
`;

const svg = (size, body, bg) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${bg ?? ''}${body}</svg>`;

/** Знак, вписанный в центр холста с заданной долей размера */
const placed = (size, frac, color, cut) => {
  const s = (size * frac) / 100;
  const o = (size - size * frac) / 2;
  return `<g transform="translate(${o} ${o}) scale(${s})">${mark(color, cut)}</g>`;
};

const radial = (size) => `
  <defs><radialGradient id="g" cx="30%" cy="20%" r="90%">
    <stop offset="0" stop-color="#2E333A"/><stop offset="1" stop-color="${DARK}"/>
  </radialGradient></defs>
  <rect width="${size}" height="${size}" fill="url(#g)"/>`;

const png = (file, s) => sharp(Buffer.from(s)).png().toFile(file);

// Адаптивная иконка: @capacitor/assets добавляет inset 16.7%, поэтому знак крупнее — итог ≈ 48% слоя (safe zone 61%)
await png('assets/icon-foreground.png', svg(1024, placed(1024, 0.72, ACCENT, DARK)));
await png('assets/icon-background.png', svg(1024, '', radial(1024)));
// Легаси-иконка (до Android 8) и PWA
await png('assets/icon-only.png', svg(1024, placed(1024, 0.62, ACCENT, DARK), radial(1024)));

// Сплэш: знак + надпись, светлый и тёмный варианты
const splash = (bg, ink, cut) =>
  svg(
    2732,
    `<g transform="translate(0 -170)">${placed(2732, 0.16, ACCENT, cut)}</g>
     <text x="1366" y="1590" text-anchor="middle" font-family="Segoe UI, Roboto, Arial, sans-serif" font-size="110" font-weight="900" letter-spacing="30" fill="${ink}">IRON APEX</text>`,
    `<rect width="2732" height="2732" fill="${bg}"/>`,
  );
await png('assets/splash.png', splash('#F2F2F4', DARK, '#F2F2F4'));
await png('assets/splash-dark.png', splash(DARK, '#F4F5F7', DARK));

// Иконка для вкладки браузера
writeFileSync('public/favicon.svg', svg(100, mark(ACCENT, DARK), `<rect width="100" height="100" rx="22" fill="${DARK}"/>`));

// Монохромная иконка уведомлений (Android требует белый силуэт на прозрачном фоне)
export const notificationVector = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp"
    android:viewportWidth="100" android:viewportHeight="100">
    <path android:fillColor="#FFFFFFFF" android:pathData="M50,14 L86,80 H69 L50,44 L31,80 H14 Z"/>
    <path android:fillColor="#FFFFFFFF" android:pathData="M25.5,84 H74.5 A3.5,3.5 0 0 1 74.5,91 H25.5 A3.5,3.5 0 0 1 25.5,84 Z"/>
</vector>
`;
writeFileSync('assets/ic_stat_ironapex.xml', notificationVector);
console.log('brand assets ready');
