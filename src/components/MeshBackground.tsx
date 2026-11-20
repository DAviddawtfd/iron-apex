import { motion, AnimatePresence } from 'framer-motion';
import type { Theme } from '../store/useAppStore';

/** Фон в стиле Haikei: светлая тема — ровный #F2F2F4, тёмная — графитовый градиент с mesh-свечением. */
export function MeshBackground({ theme }: { theme: Theme }) {
  return (
    <div className="app-bg pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <AnimatePresence>
        {theme === 'dark' && (
          <motion.svg
            key="mesh"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 393 873"
            preserveAspectRatio="xMidYMid slice"
          >
            <defs>
              <filter id="mesh-blur" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="70" />
              </filter>
              <radialGradient id="g-accent">
                <stop offset="0%" stopColor="#E05A33" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#E05A33" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="g-steel">
                <stop offset="0%" stopColor="#7A8796" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#7A8796" stopOpacity="0" />
              </radialGradient>
            </defs>
            <g filter="url(#mesh-blur)">
              <circle cx="340" cy="90" r="180" fill="url(#g-steel)" />
              <circle cx="40" cy="430" r="170" fill="url(#g-accent)" />
              <circle cx="330" cy="780" r="200" fill="url(#g-steel)" />
            </g>
          </motion.svg>
        )}
      </AnimatePresence>
    </div>
  );
}
