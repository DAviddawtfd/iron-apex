import { motion } from 'framer-motion';

interface Option<T extends string> {
  value: T;
  label: string;
}

/** Сегментный переключатель в стиле «Daily / Weekly / Monthly» с белой таблеткой */
export function Segmented<T extends string>({
  id,
  options,
  value,
  onChange,
  tone = 'default',
}: {
  id: string;
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  tone?: 'default' | 'warn';
}) {
  return (
    <div className="flex rounded-full p-1" style={{ background: 'var(--seg-track)' }} role="radiogroup">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className="relative flex-1 rounded-full px-2 py-2.5 text-[13px] font-semibold leading-tight"
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                className="absolute inset-0 rounded-full"
                style={{
                  background: tone === 'warn' ? 'rgb(var(--accent))' : 'var(--seg-pill)',
                  boxShadow: 'var(--seg-pill-shadow)',
                }}
              />
            )}
            <span
              className={`relative z-10 transition-colors ${
                active ? (tone === 'warn' ? 'text-white' : 'text-[#16161a]') : 'text-muted'
              }`}
            >
              {o.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
