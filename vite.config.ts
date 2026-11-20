import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' — относительные пути для WebView Capacitor
export default defineConfig({
  base: './',
  plugins: [react()],
});
