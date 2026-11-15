import { defineConfig } from 'vite';

// base: './' lets the built game run from any folder (e.g. GitHub Pages)
export default defineConfig({
  base: './',
  server: { open: true },
  build: { chunkSizeWarningLimit: 1200 },
});
