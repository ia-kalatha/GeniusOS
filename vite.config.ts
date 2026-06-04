import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    // Ignora arquivos JSON de dados do servidor.
    // Sem isso, cada escrita em users.json / reward_events.json / scores.json
    // dispara um full-reload do Vite via HMR — causando o "refresh" inesperado.
    watch: {
      ignored: [
        '**/*.json',
      ],
    },
  },
});
