import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: '/' for a standalone domain. If you mount the app under a sub-path
// (e.g. https://yourdomain/app/), set base: '/app/'.
// SINGLE_FILE=1 -> one self-contained JS chunk (used for the single-file preview build)
const single = process.env.SINGLE_FILE === '1';

export default defineConfig({
  plugins: [react()],
  base: single ? './' : '/',
  server: { port: 5173, open: false },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: { output: single ? { inlineDynamicImports: true } : { manualChunks: { react: ['react', 'react-dom', 'react-router-dom'], charts: ['recharts'] } } },
  },
});
