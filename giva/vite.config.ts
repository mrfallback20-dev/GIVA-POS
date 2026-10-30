import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Three HTML entry points: launcher (/), Q3 POS (/pos), Store Manager (/manager).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  build: {
    rollupOptions: {
      input: {
        index: path.resolve(__dirname, 'index.html'),
        pos: path.resolve(__dirname, 'pos.html'),
        manager: path.resolve(__dirname, 'manager.html'),
      },
    },
  },
});
