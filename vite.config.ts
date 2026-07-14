import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    host: true,
    allowedHosts: true,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@blinkdotnew/ui')) {
            return 'vendor-ui';
          }
          if (id.includes('node_modules/react-dom') || (id.includes('node_modules/react') && !id.includes('react-'))) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@tanstack/react-router')) {
            return 'vendor-router';
          }
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});
