import { Suspense, lazy } from 'react';
import type { TabId } from '../store/useAppStore';
import { WorkoutsScreen } from './WorkoutsScreen';
import { HomeScreen } from './HomeScreen';
import { NutritionScreen } from './NutritionScreen';
import { ProfileScreen } from './ProfileScreen';

// Recharts — тяжёлая зависимость: грузим отдельным чанком только при открытии «Прогресса»
const ProgressScreen = lazy(() => import('./ProgressScreen').then((m) => ({ default: m.ProgressScreen })));

function Loading() {
  return <div className="card h-64 animate-pulse" aria-label="Загрузка" />;
}

export function Screen({ tab }: { tab: TabId }) {
  if (tab === 'home') return <HomeScreen />;
  if (tab === 'workouts') return <WorkoutsScreen />;
  if (tab === 'nutrition') return <NutritionScreen />;
  if (tab === 'progress')
    return (
      <Suspense fallback={<Loading />}>
        <ProgressScreen />
      </Suspense>
    );
  return <ProfileScreen />;
}
