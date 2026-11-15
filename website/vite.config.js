import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: '/',
  build: {
    outDir: fileURLToPath(new URL('../dist', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
  },
  server: { port: 5174, host: '0.0.0.0' }
});
