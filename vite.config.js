import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => ({
  root: 'client',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': `http://127.0.0.1:${loadEnv(mode, process.cwd(), '').PORT || 3001}` },
  },
  build: { outDir: '../dist', emptyOutDir: true, assetsInlineLimit: 0 },
}));
